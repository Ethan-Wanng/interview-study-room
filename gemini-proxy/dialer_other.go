//go:build !windows

package geminiproxy

import (
	"net"
	"time"
)

func hasTunnelInterface() bool {
	return false
}

func newPhysicalDialer(timeout time.Duration) *net.Dialer {
	return &net.Dialer{Timeout: timeout}
}
