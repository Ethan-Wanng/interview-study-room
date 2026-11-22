package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	geminiproxy "gemini-proxy"
)

func loadAPIKey(keyFile string) string {
	if v := strings.TrimSpace(os.Getenv("GEMINI_API_KEY")); v != "" {
		return v
	}
	if keyFile == "" {
		return ""
	}
	b, err := os.ReadFile(keyFile)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

func main() {
	defaultNode := strings.TrimSpace(os.Getenv("GEMINI_ANYTLS_NODE"))
	if defaultNode == "" {
		defaultNode = geminiproxy.DefaultAnyTLSNode
	}
	defaultNode2 := strings.TrimSpace(os.Getenv("GEMINI_HTTPS_NODE"))
	if defaultNode2 == "" {
		defaultNode2 = geminiproxy.DefaultHTTPSNode
	}
	defaultKeyFile := filepath.Join("..", "..", "1.txt")

	listen := flag.String("listen", "127.0.0.1:18765", "local HTTP gateway address")
	nodeURI := flag.String("node", defaultNode, "primary proxy node URI used on days 1-15 of each month")
	node2URI := flag.String("node2", defaultNode2, "secondary proxy node URI used on days 16-end of each month")
	upstreamProxy := flag.String("upstream-proxy", strings.TrimSpace(os.Getenv("GEMINI_USER_PROXY")), "optional explicit existing proxy URL to test before override")
	keyFile := flag.String("key-file", defaultKeyFile, "optional path to file containing Gemini API key for region probe")
	probeOnly := flag.Bool("probe-only", false, "check active proxy support for Gemini API and exit with JSON status")
	flag.Parse()

	primaryNode, err := geminiproxy.ParseProxyNode(*nodeURI)
	if err != nil {
		log.Fatalf("invalid day 1-15 proxy node config: %v", err)
	}

	var opts []geminiproxy.RouterOption
	if strings.TrimSpace(*node2URI) != "" {
		secondaryNode, err := geminiproxy.ParseProxyNode(*node2URI)
		if err != nil {
			log.Fatalf("invalid day 16-end proxy node config: %v", err)
		}
		opts = append(opts, geminiproxy.WithSecondHalfNode(secondaryNode))
	}
	if *upstreamProxy != "" {
		opts = append(opts, geminiproxy.WithUpstreamProxy(*upstreamProxy))
	}
	if apiKey := loadAPIKey(*keyFile); apiKey != "" {
		opts = append(opts, geminiproxy.WithAPIKey(apiKey))
	}

	router := geminiproxy.NewDynamicRouterWithNodes(primaryNode, opts...)
	defer router.Close()

	if *probeOnly {
		probeCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		_, status := router.Resolve(probeCtx)
		cancel()
		b, _ := json.MarshalIndent(status, "", "  ")
		fmt.Println(string(b))
		return
	}

	srvHandler, err := geminiproxy.NewServer(router, "")
	if err != nil {
		log.Fatalf("create server: %v", err)
	}

	ln, err := net.Listen("tcp", *listen)
	if err != nil {
		log.Fatalf("listen %s: %v", *listen, err)
	}

	// Warm up proxy check in the background so /health is ready immediately without blocking dev startup.
	go func() {
		warmCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()
		_, st := router.Resolve(warmCtx)
		log.Printf("gemini-proxy probe complete (mode=%s, existing=%s, reason=%s)", st.Mode, st.ExistingProxy, st.Reason)
	}()

	httpSrv := &http.Server{
		Handler:           srvHandler,
		ReadHeaderTimeout: 15 * time.Second,
	}

	log.Printf("gemini-proxy listening at http://%s", ln.Addr().String())
	fmt.Printf("READY http://%s\n", ln.Addr().String())

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutCancel()
		_ = httpSrv.Shutdown(shutCtx)
	}()

	if err := httpSrv.Serve(ln); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve failed: %v", err)
	}
}
