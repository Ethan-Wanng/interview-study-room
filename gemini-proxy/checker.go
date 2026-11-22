package geminiproxy

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	xproxy "golang.org/x/net/proxy"
)

const geminiBaseOrigin = "https://generativelanguage.googleapis.com"

// ErrExistingProxyUnsupported indicates a user's existing proxy failed the Gemini API compatibility probe.
var ErrExistingProxyUnsupported = errors.New("existing proxy failed Gemini API check")

// DetectedProxy describes an existing proxy mode detected from explicit overrides, env vars, OS settings, or TUN.
type DetectedProxy struct {
	Enabled  bool
	Kind     string // "override" | "env" | "system-http" | "system-tun" | "none"
	ProxyURL *url.URL
	Display  string
}

// RouteStatus reports the current Gemini-only proxy routing decision for observability.
type RouteStatus struct {
	Mode            string `json:"mode"` // "existing-proxy" | "anytls-override" | "https-proxy-override"
	ExistingProxy   string `json:"existingProxy"`
	GeminiSupported bool   `json:"geminiSupported"`
	Reason          string `json:"reason"`
	NodeHost        string `json:"nodeHost"`
	NodeProtocol    string `json:"nodeProtocol,omitempty"`
	ScheduleSlot    string `json:"scheduleSlot,omitempty"`
	CheckedAt       string `json:"checkedAt"`
}

// ParseProxyServerString parses Windows Internet Settings ProxyServer formats
// (e.g. "127.0.0.1:10808", "http=127.0.0.1:8080;https=127.0.0.1:10808", "socks=127.0.0.1:10810").
func ParseProxyServerString(raw string) (*url.URL, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, fmt.Errorf("empty proxy server")
	}
	if !strings.Contains(trimmed, "=") {
		if strings.Contains(trimmed, "://") {
			return url.Parse(trimmed)
		}
		return url.Parse("http://" + trimmed)
	}
	candidates := map[string]string{}
	for _, part := range strings.Split(trimmed, ";") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		candidates[strings.ToLower(strings.TrimSpace(kv[0]))] = strings.TrimSpace(kv[1])
	}
	for _, key := range []string{"https", "http", "socks", "socks5"} {
		v := candidates[key]
		if v == "" {
			continue
		}
		if strings.Contains(v, "://") {
			return url.Parse(v)
		}
		scheme := "http"
		if strings.HasPrefix(key, "socks") {
			scheme = "socks5"
		}
		return url.Parse(scheme + "://" + v)
	}
	return nil, fmt.Errorf("no usable proxy endpoint in %q", raw)
}

// DetectExistingProxy inspects upstream override -> env vars -> Windows Internet Settings -> active TUN adapter.
func DetectExistingProxy(upstreamOverride string) DetectedProxy {
	if s := strings.TrimSpace(upstreamOverride); s != "" {
		if u, err := ParseProxyServerString(s); err == nil {
			return DetectedProxy{Enabled: true, Kind: "override", ProxyURL: u, Display: u.String()}
		}
	}
	for _, k := range []string{"GEMINI_USER_PROXY", "HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			if u, err := ParseProxyServerString(v); err == nil {
				return DetectedProxy{Enabled: true, Kind: "env", ProxyURL: u, Display: u.String()}
			}
		}
	}
	if enabled, srv := readWindowsProxySettings(); enabled {
		if u, err := ParseProxyServerString(srv); err == nil {
			return DetectedProxy{Enabled: true, Kind: "system-http", ProxyURL: u, Display: u.String()}
		}
	}
	if hasTunnelInterface() {
		return DetectedProxy{Enabled: true, Kind: "system-tun", Display: "system-tun"}
	}
	return DetectedProxy{Enabled: false, Kind: "none", Display: "none"}
}

func transportForDetectedProxy(dp DetectedProxy) (*http.Transport, error) {
	t := &http.Transport{
		TLSClientConfig:     &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:   false,
		TLSNextProto:        make(map[string]func(authority string, c *tls.Conn) http.RoundTripper),
		MaxIdleConns:        16,
		IdleConnTimeout:     60 * time.Second,
		TLSHandshakeTimeout: 12 * time.Second,
	}
	if dp.ProxyURL == nil {
		// system-tun or direct OS routing: ignore HTTP_PROXY unless explicitly provided
		t.Proxy = nil
		t.DialContext = (&net.Dialer{Timeout: 10 * time.Second}).DialContext
		return t, nil
	}
	scheme := strings.ToLower(dp.ProxyURL.Scheme)
	if strings.HasPrefix(scheme, "socks") {
		var auth *xproxy.Auth
		if dp.ProxyURL.User != nil {
			pw, _ := dp.ProxyURL.User.Password()
			auth = &xproxy.Auth{User: dp.ProxyURL.User.Username(), Password: pw}
		}
		d, err := xproxy.SOCKS5("tcp", dp.ProxyURL.Host, auth, &net.Dialer{Timeout: 10 * time.Second})
		if err != nil {
			return nil, err
		}
		if cd, ok := d.(xproxy.ContextDialer); ok {
			t.DialContext = cd.DialContext
		} else {
			t.DialContext = func(_ context.Context, network, addr string) (net.Conn, error) {
				return d.Dial(network, addr)
			}
		}
		t.Proxy = nil
		return t, nil
	}
	t.Proxy = http.ProxyURL(dp.ProxyURL)
	return t, nil
}

// CheckGeminiSupport tests whether the supplied HTTP round-tripper can successfully invoke the Gemini API
// (without firewall blocks, proxy errors, or location-unsupported geo-restrictions).
func CheckGeminiSupport(ctx context.Context, rt http.RoundTripper, apiKey string, baseOrigin string) (bool, string) {
	if baseOrigin == "" {
		baseOrigin = geminiBaseOrigin
	}
	origin := strings.TrimRight(baseOrigin, "/")
	hc := &http.Client{Transport: rt, Timeout: 12 * time.Second}

	key := strings.TrimSpace(apiKey)
	if key == "" {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, origin+"/v1beta/models?pageSize=1", nil)
		if err != nil {
			return false, err.Error()
		}
		resp, err := hc.Do(req)
		if err != nil {
			return false, err.Error()
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		_ = resp.Body.Close()
		lower := strings.ToLower(string(body))
		if isGeminiLocationBlocked(lower) {
			return false, "user location is not supported for Gemini API"
		}
		if (resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized) &&
			(strings.Contains(lower, "models") || strings.Contains(lower, "api key") || strings.Contains(lower, "\"error\"")) {
			return true, fmt.Sprintf("models endpoint reachable (status %d)", resp.StatusCode)
		}
		return false, fmt.Sprintf("unexpected status %d", resp.StatusCode)
	}

	// Probe generateContent on stable gemini-2.5-flash first (fast ~500ms and strictly enforces regional geo-blocking),
	// falling back to 3.8 Flash / 4 Hydrogen only on 503 high demand.
	payloads := [][]byte{
		[]byte(`{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"maxOutputTokens":1,"thinkingConfig":{"thinkingBudget":0}}}`),
		[]byte(`{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"maxOutputTokens":1}}`),
	}
	hc.Timeout = 8 * time.Second
	for _, model := range []string{"gemini-2.5-flash", "gemini-3.8-flash", "gemini-4-hydrogen"} {
		for _, payload := range payloads {
			req, err := http.NewRequestWithContext(
				ctx,
				http.MethodPost,
				origin+"/v1beta/models/"+model+":generateContent",
				bytes.NewReader(payload),
			)
			if err != nil {
				return false, err.Error()
			}
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("x-goog-api-key", key)
			resp, err := hc.Do(req)
			if err != nil {
				return false, err.Error()
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			_ = resp.Body.Close()
			lower := strings.ToLower(string(body))
			if isGeminiLocationBlocked(lower) {
				return false, "user location is not supported for Gemini API"
			}
			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusTooManyRequests {
				return true, fmt.Sprintf("verified %s (%d)", model, resp.StatusCode)
			}
			if resp.StatusCode == http.StatusBadRequest && (strings.Contains(lower, "thinking") || strings.Contains(lower, "budget")) {
				continue
			}
			if resp.StatusCode == http.StatusServiceUnavailable {
				break
			}
			return false, fmt.Sprintf("gemini probe returned HTTP %d", resp.StatusCode)
		}
	}
	return false, "gemini probe models unavailable (503)"
}

func isGeminiLocationBlocked(lowerBody string) bool {
	return strings.Contains(lowerBody, "location is not supported") ||
		strings.Contains(lowerBody, "failed_precondition") ||
		strings.Contains(lowerBody, "region not supported") ||
		strings.Contains(lowerBody, "country is not supported")
}

// DynamicRouter resolves whether Gemini API calls can use the user's active proxy
// or must override (scoped strictly to website Gemini traffic) via scheduled proxy nodes:
// days 1-15 use firstHalfNode (original AnyTLS node); days 16-end use secondHalfNode (new HTTPS proxy node).
type DynamicRouter struct {
	firstHalfNode    ProxyNode
	secondHalfNode   ProxyNode
	upstreamOverride string
	probeBaseOrigin  string
	apiKey           string
	cacheTTL         time.Duration
	nowFn            func() time.Time
	detectFn         func(string) DetectedProxy
	probeFn          func(context.Context, http.RoundTripper, string, string) (bool, string)

	mu            sync.Mutex
	probeMu       sync.Mutex // serializes network probes without blocking CachedStatus/readers
	cachedRT      http.RoundTripper
	cachedStatus  RouteStatus
	cachedSlot    string
	cachedAt      time.Time
	existingProxy *http.Transport
	firstHalfRT   http.RoundTripper
	secondHalfRT  http.RoundTripper
	overrideRT    http.RoundTripper // optional test hook overriding active node transport
}

// RouterOption configures optional testing/runtime parameters on DynamicRouter.
type RouterOption func(*DynamicRouter)

// WithSecondHalfNode sets the proxy node used on days 16..end of each month (UTC+8).
func WithSecondHalfNode(node ProxyNode) RouterOption {
	return func(r *DynamicRouter) { r.secondHalfNode = node }
}

// WithClock overrides the clock used for day-of-month proxy scheduling (primarily for tests).
func WithClock(fn func() time.Time) RouterOption {
	return func(r *DynamicRouter) {
		if fn != nil {
			r.nowFn = fn
		}
	}
}

// WithUpstreamProxy forces a specific existing proxy URL to probe before falling back to override node.
func WithUpstreamProxy(proxyURL string) RouterOption {
	return func(r *DynamicRouter) { r.upstreamOverride = proxyURL }
}

// WithAPIKey supplies a Gemini API key used for deeper location-check probing.
func WithAPIKey(key string) RouterOption {
	return func(r *DynamicRouter) { r.apiKey = strings.TrimSpace(key) }
}

// WithProbeOrigin overrides the Gemini endpoint origin during unit tests.
func WithProbeOrigin(origin string) RouterOption {
	return func(r *DynamicRouter) { r.probeBaseOrigin = origin }
}

// WithCacheTTL adjusts how long proxy support check results are cached.
func WithCacheTTL(d time.Duration) RouterOption {
	return func(r *DynamicRouter) { r.cacheTTL = d }
}

// NewDynamicRouter constructs a Gemini-only proxy router backed by an AnyTLS nodeCfg for fallback override.
func NewDynamicRouter(nodeCfg *NodeConfig, opts ...RouterOption) *DynamicRouter {
	return NewDynamicRouterWithNodes(NewAnyTLSDialer(nodeCfg), opts...)
}

// NewDynamicRouterWithNodes constructs a Gemini-only proxy router supporting monthly day 1-15 / 16-end node scheduling.
func NewDynamicRouterWithNodes(firstHalf ProxyNode, opts ...RouterOption) *DynamicRouter {
	r := &DynamicRouter{
		firstHalfNode:   firstHalf,
		probeBaseOrigin: geminiBaseOrigin,
		cacheTTL:        5 * time.Minute,
		nowFn:           time.Now,
		detectFn:        DetectExistingProxy,
		probeFn:         CheckGeminiSupport,
	}
	for _, opt := range opts {
		opt(r)
	}
	if r.firstHalfNode != nil {
		r.firstHalfRT = r.firstHalfNode.NewHTTPTransport()
	}
	if r.secondHalfNode != nil {
		r.secondHalfRT = r.secondHalfNode.NewHTTPTransport()
	}
	return r
}

func overrideModeFor(node ProxyNode) string {
	if node == nil || node.Protocol() == "anytls" {
		return "anytls-override"
	}
	return node.Protocol() + "-override"
}

// activeScheduledLocked returns the active node, its RoundTripper, mode name, and schedule slot for now.
func (r *DynamicRouter) activeScheduledLocked(now time.Time) (ProxyNode, http.RoundTripper, string, string) {
	slot := ScheduleSlotName(now)
	var node ProxyNode
	var rt http.RoundTripper
	if IsFirstHalfOfMonth(now) || r.secondHalfNode == nil {
		node = r.firstHalfNode
		rt = r.firstHalfRT
	} else {
		node = r.secondHalfNode
		rt = r.secondHalfRT
	}
	if r.overrideRT != nil {
		rt = r.overrideRT
	}
	return node, rt, overrideModeFor(node), slot
}

// StandbyOverride returns the secondary node transport for single-attempt failover if the scheduled node errors.
func (r *DynamicRouter) StandbyOverride() (http.RoundTripper, string, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.firstHalfNode == nil || r.secondHalfNode == nil {
		return nil, "", false
	}
	if IsFirstHalfOfMonth(r.nowFn()) {
		if r.secondHalfRT == nil {
			return nil, "", false
		}
		return r.secondHalfRT, overrideModeFor(r.secondHalfNode), true
	}
	if r.firstHalfRT == nil {
		return nil, "", false
	}
	return r.firstHalfRT, overrideModeFor(r.firstHalfNode), true
}

// Resolve returns the active http.RoundTripper and RouteStatus, probing any enabled user proxy first
// without holding the status lock during network I/O. Automatically switches nodes when crossing day 15 -> 16.
func (r *DynamicRouter) Resolve(ctx context.Context) (http.RoundTripper, RouteStatus) {
	curNow := r.nowFn()
	curSlot := ScheduleSlotName(curNow)

	r.mu.Lock()
	if r.cachedRT != nil && time.Since(r.cachedAt) < r.cacheTTL && r.cachedSlot == curSlot {
		rt, st := r.cachedRT, r.cachedStatus
		r.mu.Unlock()
		return rt, st
	}
	r.mu.Unlock()

	r.probeMu.Lock()
	defer r.probeMu.Unlock()

	curNow = r.nowFn()
	curSlot = ScheduleSlotName(curNow)

	// Re-check cache after waiting on an in-flight probe.
	r.mu.Lock()
	if r.cachedRT != nil && time.Since(r.cachedAt) < r.cacheTTL && r.cachedSlot == curSlot {
		rt, st := r.cachedRT, r.cachedStatus
		r.mu.Unlock()
		return rt, st
	}
	detectFn := r.detectFn
	probeFn := r.probeFn
	upstream := r.upstreamOverride
	apiKey := r.apiKey
	probeOrigin := r.probeBaseOrigin
	node, overrideRT, overrideMode, slot := r.activeScheduledLocked(curNow)
	nodeHost := ""
	nodeProto := ""
	if node != nil {
		nodeHost = node.Host()
		nodeProto = node.Protocol()
	}
	r.mu.Unlock()

	dp := detectFn(upstream)
	nowStr := curNow.UTC().Format(time.RFC3339)
	if dp.Enabled {
		tr, err := transportForDetectedProxy(dp)
		if err == nil {
			probeCtx, cancel := context.WithTimeout(ctx, 9*time.Second)
			ok, reason := probeFn(probeCtx, tr, apiKey, probeOrigin)
			cancel()
			if ok {
				st := RouteStatus{
					Mode:            "existing-proxy",
					ExistingProxy:   dp.Display,
					GeminiSupported: true,
					Reason:          reason,
					NodeHost:        nodeHost,
					NodeProtocol:    nodeProto,
					ScheduleSlot:    slot,
					CheckedAt:       nowStr,
				}
				r.mu.Lock()
				if r.existingProxy != nil && r.existingProxy != tr {
					r.existingProxy.CloseIdleConnections()
				}
				r.existingProxy = tr
				r.cachedRT = tr
				r.cachedStatus = st
				r.cachedSlot = slot
				r.cachedAt = time.Now()
				r.mu.Unlock()
				return tr, st
			}
			tr.CloseIdleConnections()
			st := RouteStatus{
				Mode:            overrideMode,
				ExistingProxy:   dp.Display,
				GeminiSupported: false,
				Reason:          "existing proxy does not support Gemini API (" + reason + "); overriding for Gemini only",
				NodeHost:        nodeHost,
				NodeProtocol:    nodeProto,
				ScheduleSlot:    slot,
				CheckedAt:       nowStr,
			}
			r.mu.Lock()
			r.cachedRT = overrideRT
			r.cachedStatus = st
			r.cachedSlot = slot
			r.cachedAt = time.Now()
			r.mu.Unlock()
			return overrideRT, st
		}
	}

	st := RouteStatus{
		Mode:            overrideMode,
		ExistingProxy:   dp.Display,
		GeminiSupported: false,
		Reason:          "no active Gemini-capable proxy detected; using scheduled proxy node for Gemini API only",
		NodeHost:        nodeHost,
		NodeProtocol:    nodeProto,
		ScheduleSlot:    slot,
		CheckedAt:       nowStr,
	}
	r.mu.Lock()
	r.cachedRT = overrideRT
	r.cachedStatus = st
	r.cachedSlot = slot
	r.cachedAt = time.Now()
	r.mu.Unlock()
	return overrideRT, st
}

// ForceOverride returns the currently scheduled override transport directly and refreshes status when an existing proxy fails mid-request.
func (r *DynamicRouter) ForceOverride(reason string) (http.RoundTripper, RouteStatus) {
	r.mu.Lock()
	defer r.mu.Unlock()
	curNow := r.nowFn()
	node, overrideRT, overrideMode, slot := r.activeScheduledLocked(curNow)
	nodeHost, nodeProto := "", ""
	if node != nil {
		nodeHost = node.Host()
		nodeProto = node.Protocol()
	}
	prev := r.cachedStatus.ExistingProxy
	if prev == "" {
		prev = "none"
	}
	r.cachedRT = overrideRT
	r.cachedStatus = RouteStatus{
		Mode:            overrideMode,
		ExistingProxy:   prev,
		GeminiSupported: false,
		Reason:          reason,
		NodeHost:        nodeHost,
		NodeProtocol:    nodeProto,
		ScheduleSlot:    slot,
		CheckedAt:       curNow.UTC().Format(time.RFC3339),
	}
	r.cachedSlot = slot
	r.cachedAt = time.Now()
	return r.cachedRT, r.cachedStatus
}

// CachedStatus returns the last probed RouteStatus without triggering a network probe.
func (r *DynamicRouter) CachedStatus() (RouteStatus, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.cachedStatus, !r.cachedAt.IsZero()
}

// Invalidate clears cached probe state so the next request re-evaluates the user's current proxy.
func (r *DynamicRouter) Invalidate() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cachedAt = time.Time{}
}

// Close releases active transports and proxy node sessions.
func (r *DynamicRouter) Close() {
	if r.firstHalfNode != nil {
		r.firstHalfNode.Close()
	}
	if r.secondHalfNode != nil {
		r.secondHalfNode.Close()
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.existingProxy != nil {
		r.existingProxy.CloseIdleConnections()
	}
	if tr, ok := r.firstHalfRT.(*http.Transport); ok && tr != nil {
		tr.CloseIdleConnections()
	}
	if tr, ok := r.secondHalfRT.(*http.Transport); ok && tr != nil {
		tr.CloseIdleConnections()
	}
}
