package geminiproxy

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	sing_anytls "github.com/anytls/sing-anytls"
	anytls_util "github.com/anytls/sing-anytls/util"
	utls "github.com/refraction-networking/utls"
	"github.com/sagernet/sing/common/logger"
	"github.com/sagernet/sing/common/metadata"
)

// DefaultAnyTLSNode is the default Taiwan AnyTLS node configured for Gemini API fallback routing.
const DefaultAnyTLSNode = "anytls://cc051d14-6a12-41fc-8d4c-4037153143ce@5tw.quandao.com:4430?skip_cert_verify=true&sni=psstatic.cdn.bcebos.com#5%E5%8F%B0%E6%B9%BE-%E8%81%94%E9%80%9A/%E7%A7%BB%E5%8A%A8(AnyTLS)"

// NodeConfig holds parsed parameters of an anytls:// node URI (matching high-mae/protocol).
type NodeConfig struct {
	RawURL         string
	Name           string
	Host           string
	Port           int
	Password       string
	SNI            string
	SkipCertVerify bool
}

// ParseAnyTLS parses an anytls:// URI into NodeConfig using the same conventions as high-mae.
func ParseAnyTLS(rawURL string) (*NodeConfig, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return nil, fmt.Errorf("empty anytls URI")
	}
	u, err := url.Parse(trimmed)
	if err != nil {
		return nil, fmt.Errorf("invalid anytls URI: %w", err)
	}
	if !strings.EqualFold(u.Scheme, "anytls") {
		return nil, fmt.Errorf("unsupported scheme %q (expected anytls)", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return nil, fmt.Errorf("missing anytls host")
	}
	port := 443
	if pStr := u.Port(); pStr != "" {
		p, err := strconv.Atoi(pStr)
		if err != nil || p <= 0 || p > 65535 {
			return nil, fmt.Errorf("invalid anytls port %q", pStr)
		}
		port = p
	}
	pw := ""
	if u.User != nil {
		pw = u.User.Username()
	}
	if pw == "" {
		return nil, fmt.Errorf("missing anytls password")
	}
	q := u.Query()
	sni := q.Get("sni")
	if sni == "" {
		sni = host
	}
	skipRaw := strings.ToLower(strings.TrimSpace(q.Get("skip_cert_verify")))
	if skipRaw == "" {
		skipRaw = strings.ToLower(strings.TrimSpace(q.Get("insecure")))
	}
	skipCertVerify := skipRaw == "1" || skipRaw == "true" || skipRaw == "yes"
	name := u.Fragment
	if name == "" {
		name = host
	}
	return &NodeConfig{
		RawURL:         trimmed,
		Name:           name,
		Host:           host,
		Port:           port,
		Password:       pw,
		SNI:            sni,
		SkipCertVerify: skipCertVerify,
	}, nil
}

// AnyTLSDialer dials target hosts through an AnyTLS session using uTLS Firefox fingerprint,
// matching high-mae's protocol/anytls.go client setup.
type AnyTLSDialer struct {
	cfg    *NodeConfig
	mu     sync.Mutex
	client *sing_anytls.Client
}

// NewAnyTLSDialer returns a reusable lazy AnyTLS dialer for the given node config.
func NewAnyTLSDialer(cfg *NodeConfig) *AnyTLSDialer {
	return &AnyTLSDialer{cfg: cfg}
}

func isTunnelFakeIP(ip net.IP) bool {
	ip4 := ip.To4()
	if ip4 == nil {
		return false
	}
	// RFC 2544 benchmark range used by Clash/Mihomo/sing-box Fake-IP DNS (198.18.0.0/15)
	if ip4[0] == 198 && (ip4[1] == 18 || ip4[1] == 19) {
		return true
	}
	// Common TUN adapter host/DNS subnets (e.g. high-mae 10.0.0.x, sing-box 172.19.0.x)
	if ip4[0] == 10 && ip4[1] == 0 && ip4[2] == 0 {
		return true
	}
	if ip4[0] == 172 && ip4[1] == 19 && ip4[2] == 0 {
		return true
	}
	return false
}

func filterPhysicalIPv4s(addrs []net.IPAddr) []string {
	var out []string
	seen := make(map[string]struct{}, len(addrs))
	for _, a := range addrs {
		ip4 := a.IP.To4()
		if ip4 == nil || ip4.IsLoopback() || ip4.IsLinkLocalUnicast() || ip4.IsMulticast() || isTunnelFakeIP(ip4) {
			continue
		}
		s := ip4.String()
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

type dohJSONAnswer struct {
	Answer []struct {
		Type int    `json:"type"`
		Data string `json:"data"`
	} `json:"Answer"`
}

func queryDoHPhysicalIPv4(ctx context.Context, dohIP, dohHost, domain string) []string {
	dialer := newPhysicalDialer(4 * time.Second)
	client := &http.Client{
		Timeout: 4 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig:   &tls.Config{MinVersion: tls.VersionTLS12, ServerName: dohHost},
			ForceAttemptHTTP2: false,
			TLSNextProto:      make(map[string]func(authority string, c *tls.Conn) http.RoundTripper),
			DialContext: func(dctx context.Context, _, addr string) (net.Conn, error) {
				_, p, err := net.SplitHostPort(addr)
				if err != nil {
					p = "443"
				}
				return dialer.DialContext(dctx, "tcp4", net.JoinHostPort(dohIP, p))
			},
		},
	}
	u := fmt.Sprintf("https://%s/resolve?name=%s&type=A", dohHost, url.QueryEscape(domain))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Accept", "application/dns-json")
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return nil
	}
	var parsed dohJSONAnswer
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil
	}
	var addrs []net.IPAddr
	for _, ans := range parsed.Answer {
		if ans.Type != 1 {
			continue
		}
		if ip := net.ParseIP(strings.TrimSpace(ans.Data)); ip != nil {
			addrs = append(addrs, net.IPAddr{IP: ip})
		}
	}
	return filterPhysicalIPv4s(addrs)
}

func resolveHostPhysicalIPv4(ctx context.Context, host string) []string {
	if ip := net.ParseIP(host); ip != nil {
		if ip4 := ip.To4(); ip4 != nil {
			return []string{ip4.String()}
		}
		return []string{host}
	}
	// When a TUN adapter is up, OS DNS may return Fake-IPs (198.18.x.x) and raw port 53 over
	// non-TUN NICs is often blocked by TUN WFP rules. Query public DoH endpoints over port 443
	// pinned to the physical NIC so outer AnyTLS connections always escape TUN cleanly.
	if hasTunnelInterface() {
		for _, ep := range [][2]string{{"223.5.5.5", "223.5.5.5"}, {"1.12.12.12", "doh.pub"}} {
			if ips := queryDoHPhysicalIPv4(ctx, ep[0], ep[1], host); len(ips) > 0 {
				return ips
			}
		}
	}
	rctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	addrs, err := net.DefaultResolver.LookupIPAddr(rctx, host)
	cancel()
	if err == nil {
		if ips := filterPhysicalIPv4s(addrs); len(ips) > 0 {
			return ips
		}
	}
	return nil
}

func dialPhysicalNode(ctx context.Context, host string, port int) (net.Conn, error) {
	dialer := newPhysicalDialer(5 * time.Second)
	portStr := strconv.Itoa(port)
	var lastErr error
	for _, ip := range resolveHostPhysicalIPv4(ctx, host) {
		conn, err := dialer.DialContext(ctx, "tcp4", net.JoinHostPort(ip, portStr))
		if err == nil {
			return conn, nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return dialer.DialContext(ctx, "tcp4", net.JoinHostPort(host, portStr))
}

func (a *AnyTLSDialer) ensureClient(ctx context.Context) (*sing_anytls.Client, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.client != nil {
		return a.client, nil
	}
	targetAddr := net.JoinHostPort(a.cfg.Host, strconv.Itoa(a.cfg.Port))
	client, err := sing_anytls.NewClient(ctx, sing_anytls.ClientConfig{
		Password: a.cfg.Password,
		DialOut: anytls_util.DialOutFunc(func(dctx context.Context) (net.Conn, error) {
			conn, err := dialPhysicalNode(dctx, a.cfg.Host, a.cfg.Port)
			if err != nil {
				return nil, err
			}
			tconn := utls.UClient(conn, &utls.Config{
				ServerName:         a.cfg.SNI,
				InsecureSkipVerify: a.cfg.SkipCertVerify,
			}, utls.HelloFirefox_Auto)
			if err := tconn.HandshakeContext(dctx); err != nil {
				_ = conn.Close()
				return nil, err
			}
			return tconn, nil
		}),
		Logger: logger.NOP(),
	})
	if err != nil {
		return nil, fmt.Errorf("create anytls client (%s): %w", targetAddr, err)
	}
	a.client = client
	return client, nil
}

// DialContext opens a proxied TCP stream through the AnyTLS tunnel to addr (host:port).
func (a *AnyTLSDialer) DialContext(ctx context.Context, _ string, addr string) (net.Conn, error) {
	client, err := a.ensureClient(ctx)
	if err != nil {
		return nil, err
	}
	conn, err := client.CreateProxy(ctx, metadata.ParseSocksaddr(addr))
	if err != nil {
		// Reset stale session once and reconnect if the underlying mux dropped.
		a.Close()
		client, err2 := a.ensureClient(ctx)
		if err2 != nil {
			return nil, err
		}
		return client.CreateProxy(ctx, metadata.ParseSocksaddr(addr))
	}
	return conn, nil
}

// Host returns the configured AnyTLS node hostname.
func (a *AnyTLSDialer) Host() string { return a.cfg.Host }

// Name returns the configured AnyTLS node display name.
func (a *AnyTLSDialer) Name() string { return a.cfg.Name }

// Protocol identifies this proxy node protocol.
func (a *AnyTLSDialer) Protocol() string { return "anytls" }

// NewHTTPTransport returns an http.Transport that routes HTTPS requests through the AnyTLS tunnel.
func (a *AnyTLSDialer) NewHTTPTransport() *http.Transport {
	return &http.Transport{
		DialContext:           a.DialContext,
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:     false,
		TLSNextProto:          make(map[string]func(authority string, c *tls.Conn) http.RoundTripper),
		MaxIdleConns:          32,
		MaxIdleConnsPerHost:   16,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
}

// Close closes the underlying AnyTLS multiplexed client session if initialized.
func (a *AnyTLSDialer) Close() {
	a.mu.Lock()
	c := a.client
	a.client = nil
	a.mu.Unlock()
	if c != nil {
		_ = c.Close()
	}
}
