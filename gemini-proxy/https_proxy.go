package geminiproxy

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	utls "github.com/refraction-networking/utls"
)

// DefaultHTTPSNode is the Taiwan HTTPS CONNECT proxy node used for Gemini on days 16..end of each month.
const DefaultHTTPSNode = "https://b98bc3e4-afc5-4d29-a934-161f6dc80654:b98bc3e4-afc5-4d29-a934-161f6dc80654@t4cache.71edgeiqiyi.com:22443#TW%20-%20%E5%8F%B0%E6%B9%BE%2004"

var chinaTZ = time.FixedZone("CST", 8*3600)

// IsFirstHalfOfMonth reports whether now (in China Standard Time UTC+8) falls on day 1..15.
func IsFirstHalfOfMonth(now time.Time) bool {
	day := now.In(chinaTZ).Day()
	return day >= 1 && day <= 15
}

// ScheduleSlotName returns "day1-15" or "day16-end" for the given timestamp (UTC+8).
func ScheduleSlotName(now time.Time) string {
	if IsFirstHalfOfMonth(now) {
		return "day1-15"
	}
	return "day16-end"
}

// ProxyNode abstracts a Gemini override proxy node (AnyTLS or HTTP/HTTPS CONNECT proxy).
type ProxyNode interface {
	Host() string
	Name() string
	Protocol() string
	NewHTTPTransport() *http.Transport
	Close()
}

// HTTPSNodeConfig holds parsed parameters of an https:// or http:// CONNECT proxy URI.
type HTTPSNodeConfig struct {
	RawURL         string
	Name           string
	Scheme         string // "https" | "http"
	Host           string
	Port           int
	Username       string
	Password       string
	SNI            string
	SkipCertVerify bool
}

// ParseHTTPSProxy parses an https://user:pass@host:port#name (or http://) proxy URI.
func ParseHTTPSProxy(rawURL string) (*HTTPSNodeConfig, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return nil, fmt.Errorf("empty proxy URI")
	}
	u, err := url.Parse(trimmed)
	if err != nil {
		return nil, fmt.Errorf("invalid proxy URI: %w", err)
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "https" && scheme != "http" {
		return nil, fmt.Errorf("unsupported scheme %q (expected https or http)", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return nil, fmt.Errorf("missing proxy host")
	}
	port := 443
	if scheme == "http" {
		port = 80
	}
	if pStr := u.Port(); pStr != "" {
		p, err := strconv.Atoi(pStr)
		if err != nil || p <= 0 || p > 65535 {
			return nil, fmt.Errorf("invalid proxy port %q", pStr)
		}
		port = p
	}
	user, pass := "", ""
	if u.User != nil {
		user = u.User.Username()
		pass, _ = u.User.Password()
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
	return &HTTPSNodeConfig{
		RawURL:         trimmed,
		Name:           name,
		Scheme:         scheme,
		Host:           host,
		Port:           port,
		Username:       user,
		Password:       pass,
		SNI:            sni,
		SkipCertVerify: skipCertVerify,
	}, nil
}

// ParseProxyNode parses either an anytls:// or https:///http:// proxy URI into a ProxyNode.
func ParseProxyNode(rawURL string) (ProxyNode, error) {
	trimmed := strings.TrimSpace(rawURL)
	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "anytls://") {
		cfg, err := ParseAnyTLS(trimmed)
		if err != nil {
			return nil, err
		}
		return NewAnyTLSDialer(cfg), nil
	}
	if strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://") {
		cfg, err := ParseHTTPSProxy(trimmed)
		if err != nil {
			return nil, err
		}
		return NewHTTPSProxyDialer(cfg), nil
	}
	return nil, fmt.Errorf("unsupported proxy node scheme in %q", trimmed)
}

// HTTPSProxyDialer tunnels target TCP connections through an HTTPS/HTTP CONNECT proxy
// over the physical NIC (escaping local TUN Fake-IPs).
type HTTPSProxyDialer struct {
	cfg      *HTTPSNodeConfig
	authHdr  string
	hostPort string
}

// NewHTTPSProxyDialer constructs a dialer for the given HTTPS/HTTP CONNECT proxy node.
func NewHTTPSProxyDialer(cfg *HTTPSNodeConfig) *HTTPSProxyDialer {
	authHdr := ""
	if cfg.Username != "" || cfg.Password != "" {
		token := base64.StdEncoding.EncodeToString([]byte(cfg.Username + ":" + cfg.Password))
		authHdr = "Basic " + token
	}
	return &HTTPSProxyDialer{
		cfg:      cfg,
		authHdr:  authHdr,
		hostPort: net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
	}
}

func (h *HTTPSProxyDialer) Host() string     { return h.cfg.Host }
func (h *HTTPSProxyDialer) Name() string     { return h.cfg.Name }
func (h *HTTPSProxyDialer) Protocol() string { return h.cfg.Scheme + "-proxy" }
func (h *HTTPSProxyDialer) Close()           {}

type bufferedConn struct {
	net.Conn
	r *bufio.Reader
}

func (b *bufferedConn) Read(p []byte) (int, error) {
	return b.r.Read(p)
}

// DialContext opens a CONNECT tunnel through the HTTPS proxy to target addr (host:port).
func (h *HTTPSProxyDialer) DialContext(ctx context.Context, _ string, addr string) (net.Conn, error) {
	rawConn, err := dialPhysicalNode(ctx, h.cfg.Host, h.cfg.Port)
	if err != nil {
		return nil, fmt.Errorf("dial https proxy %s: %w", h.hostPort, err)
	}

	var conn net.Conn = rawConn
	if h.cfg.Scheme == "https" {
		// Use uTLS Chrome fingerprint with ALPN http/1.1 (matching high-mae's https outbound TLS setup)
		// to avoid Go stdlib TLS fingerprint throttling on middleboxes.
		uconn := utls.UClient(rawConn, &utls.Config{
			ServerName:         h.cfg.SNI,
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: h.cfg.SkipCertVerify,
			NextProtos:         []string{"http/1.1"},
		}, utls.HelloChrome_Auto)
		if err := uconn.HandshakeContext(ctx); err != nil {
			_ = rawConn.Close()
			return nil, fmt.Errorf("tls handshake https proxy %s: %w", h.hostPort, err)
		}
		conn = uconn
	}

	if dl, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(dl)
	} else {
		_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
	}

	var reqBuf strings.Builder
	reqBuf.WriteString("CONNECT ")
	reqBuf.WriteString(addr)
	reqBuf.WriteString(" HTTP/1.1\r\nHost: ")
	reqBuf.WriteString(addr)
	reqBuf.WriteString("\r\nProxy-Connection: Keep-Alive\r\n")
	if h.authHdr != "" {
		reqBuf.WriteString("Proxy-Authorization: ")
		reqBuf.WriteString(h.authHdr)
		reqBuf.WriteString("\r\n")
	}
	reqBuf.WriteString("\r\n")

	if _, err := io.WriteString(conn, reqBuf.String()); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("write CONNECT to %s: %w", h.hostPort, err)
	}

	br := bufio.NewReader(conn)
	connectReq := &http.Request{Method: http.MethodConnect, URL: &url.URL{Opaque: addr}}
	resp, err := http.ReadResponse(br, connectReq)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("read CONNECT response from %s: %w", h.hostPort, err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_ = conn.Close()
		return nil, fmt.Errorf("https proxy %s CONNECT failed: %s", h.hostPort, resp.Status)
	}

	_ = conn.SetDeadline(time.Time{})
	if br.Buffered() > 0 {
		return &bufferedConn{Conn: conn, r: br}, nil
	}
	return conn, nil
}

// NewHTTPTransport returns a keep-alive http.Transport routing HTTPS requests through the HTTPS proxy tunnel.
func (h *HTTPSProxyDialer) NewHTTPTransport() *http.Transport {
	return &http.Transport{
		DialContext:           h.DialContext,
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
