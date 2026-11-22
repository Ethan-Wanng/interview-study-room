package geminiproxy

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// Server exposes a local HTTP gateway dedicated exclusively to Gemini API requests (/v1beta/...),
// checking whether any user proxy already supports Gemini and selectively overriding via AnyTLS only here.
type Server struct {
	router         *DynamicRouter
	upstreamTarget *url.URL
}

// NewServer constructs the Gemini-only HTTP proxy server against https://generativelanguage.googleapis.com
// (or a custom upstream URL during testing).
func NewServer(router *DynamicRouter, upstreamURL string) (*Server, error) {
	if upstreamURL == "" {
		upstreamURL = geminiBaseOrigin
	}
	u, err := url.Parse(strings.TrimRight(upstreamURL, "/"))
	if err != nil {
		return nil, err
	}
	return &Server{router: router, upstreamTarget: u}, nil
}

// ServeHTTP handles /health status probes and /v1beta/* Gemini API traffic while blocking unrelated paths.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" || r.URL.Path == "/_proxy/status" {
		if r.URL.Query().Get("refresh") == "1" {
			s.router.Invalidate()
		}
		if r.URL.Query().Get("probe") == "1" {
			_, st := s.router.Resolve(r.Context())
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			_ = json.NewEncoder(w).Encode(struct {
				OK bool `json:"ok"`
				RouteStatus
			}{OK: true, RouteStatus: st})
			return
		}
		st, resolved := s.router.CachedStatus()
		if !resolved && r.URL.Query().Get("wait") == "1" {
			_, st = s.router.Resolve(r.Context())
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(struct {
			OK      bool `json:"ok"`
			Pending bool `json:"pending,omitempty"`
			RouteStatus
		}{OK: true, Pending: !resolved && st.Mode == "", RouteStatus: st})
		return
	}

	if !strings.HasPrefix(r.URL.Path, "/v1beta/") {
		http.Error(w, "gemini-proxy only serves Gemini API (/v1beta/)", http.StatusForbidden)
		return
	}

	var bodyCopy []byte
	if r.Body != nil && r.Method != http.MethodGet && r.Method != http.MethodHead {
		var err error
		bodyCopy, err = io.ReadAll(io.LimitReader(r.Body, 4<<20))
		_ = r.Body.Close()
		if err != nil {
			http.Error(w, "failed to read request body", http.StatusBadRequest)
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(bodyCopy))
		r.ContentLength = int64(len(bodyCopy))
	}

	rt, st := s.router.Resolve(r.Context())
	activeMode := st.Mode
	var retriedExisting, retriedStandby bool

	rp := &httputil.ReverseProxy{
		FlushInterval: -1,
		Transport: roundTripFunc(func(outReq *http.Request) (*http.Response, error) {
			resp, err := rt.RoundTrip(outReq)
			if activeMode == "existing-proxy" && !retriedExisting && canRetryWithOverride(outReq, bodyCopy, resp, err) {
				retriedExisting = true
				rt, st = s.router.ForceOverride("existing proxy failed or location unsupported during request")
				activeMode = st.Mode
				retryReq := outReq.Clone(outReq.Context())
				if bodyCopy != nil {
					retryReq.Body = io.NopCloser(bytes.NewReader(bodyCopy))
					retryReq.ContentLength = int64(len(bodyCopy))
				}
				resp, err = rt.RoundTrip(retryReq)
			}
			if activeMode != "existing-proxy" && !retriedStandby && err != nil && outReq.Context().Err() == nil {
				if standbyRT, standbyMode, ok := s.router.StandbyOverride(); ok {
					retriedStandby = true
					rt = standbyRT
					activeMode = standbyMode
					retryReq := outReq.Clone(outReq.Context())
					if bodyCopy != nil {
						retryReq.Body = io.NopCloser(bytes.NewReader(bodyCopy))
						retryReq.ContentLength = int64(len(bodyCopy))
					}
					return rt.RoundTrip(retryReq)
				}
			}
			return resp, err
		}),
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(s.upstreamTarget)
			pr.Out.Host = s.upstreamTarget.Host
			pr.Out.Header.Del("Proxy-Connection")
		},
		ModifyResponse: func(resp *http.Response) error {
			resp.Header.Set("X-Gemini-Proxy-Mode", activeMode)
			return nil
		},
		ErrorHandler: func(rw http.ResponseWriter, req *http.Request, err error) {
			if err != nil && req.Context().Err() != nil {
				return
			}
			rw.Header().Set("Content-Type", "application/json; charset=utf-8")
			rw.Header().Set("X-Gemini-Proxy-Mode", activeMode)
			rw.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(rw).Encode(map[string]any{
				"error": map[string]any{
					"code":    http.StatusBadGateway,
					"message": "Gemini proxy upstream error (" + activeMode + "): " + errString(err),
					"status":  "UNAVAILABLE",
				},
			})
		},
	}
	rp.ServeHTTP(w, r)
}

func canRetryWithOverride(_ *http.Request, _ []byte, resp *http.Response, err error) bool {
	if err != nil {
		return true
	}
	if resp == nil {
		return false
	}
	if resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusForbidden {
		return false
	}
	errBytes, rerr := io.ReadAll(io.LimitReader(resp.Body, 8192))
	_ = resp.Body.Close()
	if rerr != nil {
		resp.Body = io.NopCloser(bytes.NewReader(errBytes))
		return false
	}
	if isGeminiLocationBlocked(strings.ToLower(string(errBytes))) {
		return true
	}
	resp.Body = io.NopCloser(bytes.NewReader(errBytes))
	return false
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
