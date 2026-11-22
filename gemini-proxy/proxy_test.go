package geminiproxy

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestParseAnyTLS(t *testing.T) {
	cfg, err := ParseAnyTLS(DefaultAnyTLSNode)
	if err != nil {
		t.Fatalf("ParseAnyTLS failed: %v", err)
	}
	if cfg.Host != "5tw.quandao.com" || cfg.Port != 4430 {
		t.Fatalf("unexpected host/port: %s:%d", cfg.Host, cfg.Port)
	}
	if cfg.Password != "cc051d14-6a12-41fc-8d4c-4037153143ce" {
		t.Fatalf("unexpected password: %q", cfg.Password)
	}
	if cfg.SNI != "psstatic.cdn.bcebos.com" || !cfg.SkipCertVerify {
		t.Fatalf("unexpected TLS fields: sni=%q skip=%v", cfg.SNI, cfg.SkipCertVerify)
	}
}

func TestParseProxyServerString(t *testing.T) {
	cases := []struct {
		raw      string
		wantURL  string
		wantHost string
	}{
		{"127.0.0.1:10808", "http://127.0.0.1:10808", "127.0.0.1:10808"},
		{"http=127.0.0.1:8080;https=127.0.0.1:10808", "http://127.0.0.1:10808", "127.0.0.1:10808"},
		{"socks=127.0.0.1:10810", "socks5://127.0.0.1:10810", "127.0.0.1:10810"},
	}
	for _, tc := range cases {
		u, err := ParseProxyServerString(tc.raw)
		if err != nil {
			t.Fatalf("ParseProxyServerString(%q) error: %v", tc.raw, err)
		}
		if u.String() != tc.wantURL || u.Host != tc.wantHost {
			t.Fatalf("ParseProxyServerString(%q) = %q, want %q", tc.raw, u.String(), tc.wantURL)
		}
	}
}

func TestCheckGeminiSupportLocationBlock(t *testing.T) {
	blockedSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}`))
	}))
	defer blockedSrv.Close()

	ok, reason := CheckGeminiSupport(context.Background(), blockedSrv.Client().Transport, "test-key", blockedSrv.URL)
	if ok {
		t.Fatalf("expected location-blocked Gemini server to fail check, got ok=true (%s)", reason)
	}
	if !strings.Contains(strings.ToLower(reason), "location") {
		t.Fatalf("expected location reason, got %q", reason)
	}

	okSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"candidates":[]}`))
	}))
	defer okSrv.Close()

	ok, reason = CheckGeminiSupport(context.Background(), okSrv.Client().Transport, "test-key", okSrv.URL)
	if !ok {
		t.Fatalf("expected working Gemini server to pass check, got reason=%q", reason)
	}
}

func TestDynamicRouterExistingVsOverrideAndPathRestriction(t *testing.T) {
	cfg, err := ParseAnyTLS(DefaultAnyTLSNode)
	if err != nil {
		t.Fatalf("parse node: %v", err)
	}

	var existingSupported atomic.Bool
	existingSupported.Store(true)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1beta/models/gemini-4-hydrogen:generateContent" {
			if r.Header.Get("X-Test-Via") == "existing-blocked" {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":{"message":"User location is not supported for the API use."}}`))
				return
			}
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data: ok\n\n"))
	}))
	defer upstream.Close()

	router := NewDynamicRouter(cfg, WithProbeOrigin(upstream.URL), WithCacheTTL(time.Minute))
	router.detectFn = func(string) DetectedProxy {
		return DetectedProxy{Enabled: true, Kind: "system-tun", Display: "system-tun"}
	}
	router.probeFn = func(ctx context.Context, _ http.RoundTripper, apiKey, origin string) (bool, string) {
		if existingSupported.Load() {
			return true, "ok"
		}
		return false, "location is not supported"
	}

	var overrideHit atomic.Bool
	router.overrideRT = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		overrideHit.Store(true)
		clone := r.Clone(r.Context())
		clone.Header.Set("X-Test-Via", "anytls-override")
		return http.DefaultTransport.RoundTrip(clone)
	})

	// 1. Existing proxy supports Gemini -> keep existing-proxy mode.
	_, st := router.Resolve(context.Background())
	if st.Mode != "existing-proxy" || !st.GeminiSupported {
		t.Fatalf("expected existing-proxy mode, got %+v", st)
	}

	srv, err := NewServer(router, upstream.URL)
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}

	// Non-Gemini paths must be rejected (override affects ONLY Gemini API calls).
	recForbidden := httptest.NewRecorder()
	srv.ServeHTTP(recForbidden, httptest.NewRequest(http.MethodPost, "/anthropic/v1/messages", strings.NewReader("{}")))
	if recForbidden.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-Gemini path, got %d", recForbidden.Code)
	}

	// Health endpoint reflects existing-proxy mode.
	recHealth := httptest.NewRecorder()
	srv.ServeHTTP(recHealth, httptest.NewRequest(http.MethodGet, "/health", nil))
	var healthPayload map[string]any
	if err := json.Unmarshal(recHealth.Body.Bytes(), &healthPayload); err != nil {
		t.Fatalf("health JSON: %v", err)
	}
	if healthPayload["mode"] != "existing-proxy" {
		t.Fatalf("expected existing-proxy in /health, got %+v", healthPayload)
	}

	// 2. Existing proxy fails/geo-blocks -> switch to anytls-override for Gemini.
	existingSupported.Store(false)
	router.Invalidate()
	_, st2 := router.Resolve(context.Background())
	if st2.Mode != "anytls-override" || st2.GeminiSupported {
		t.Fatalf("expected anytls-override when user proxy fails check, got %+v", st2)
	}

	// 3. Cached existing-proxy suddenly returns 400 location-unsupported -> automatically fails over mid-request!
	router.mu.Lock()
	router.cachedRT = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		clone := r.Clone(r.Context())
		clone.Header.Set("X-Test-Via", "existing-blocked")
		return http.DefaultTransport.RoundTrip(clone)
	})
	router.cachedStatus = RouteStatus{Mode: "existing-proxy", GeminiSupported: true, ExistingProxy: "system-tun"}
	router.cachedAt = time.Now()
	router.mu.Unlock()

	recFailover := httptest.NewRecorder()
	srv.ServeHTTP(recFailover, httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini-4-hydrogen:generateContent", strings.NewReader(`{"contents":[]}`)))
	if recFailover.Code != http.StatusOK || !overrideHit.Load() || recFailover.Header().Get("X-Gemini-Proxy-Mode") != "anytls-override" {
		t.Fatalf("expected seamless failover to anytls-override, code=%d overrideHit=%v mode=%q body=%s",
			recFailover.Code, overrideHit.Load(), recFailover.Header().Get("X-Gemini-Proxy-Mode"), recFailover.Body.String())
	}
}

func TestIsTunnelFakeIPAndPhysicalFilter(t *testing.T) {
	if !isTunnelFakeIP(net.ParseIP("198.18.0.5")) || !isTunnelFakeIP(net.ParseIP("198.19.12.34")) {
		t.Fatalf("expected 198.18.0.0/15 Fake-IP range to be filtered")
	}
	if !isTunnelFakeIP(net.ParseIP("10.0.0.2")) || !isTunnelFakeIP(net.ParseIP("172.19.0.1")) {
		t.Fatalf("expected TUN subnet IPs to be filtered")
	}
	if isTunnelFakeIP(net.ParseIP("1.1.1.1")) || isTunnelFakeIP(net.ParseIP("192.168.1.10")) {
		t.Fatalf("unexpectedly filtered non-TUN public/LAN IP")
	}
	filtered := filterPhysicalIPv4s([]net.IPAddr{
		{IP: net.ParseIP("198.18.0.9")},
		{IP: net.ParseIP("10.0.0.2")},
		{IP: net.ParseIP("127.0.0.1")},
		{IP: net.ParseIP("1.1.1.1")},
		{IP: net.ParseIP("1.1.1.1")},
	})
	if len(filtered) != 1 || filtered[0] != "1.1.1.1" {
		t.Fatalf("unexpected filtered IPs: %v", filtered)
	}
}
