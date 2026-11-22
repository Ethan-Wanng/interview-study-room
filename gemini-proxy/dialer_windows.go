//go:build windows

package geminiproxy

import (
	"math/bits"
	"net"
	"strings"
	"syscall"
	"time"

	"golang.org/x/sys/windows"
)

const ipUnicastIf = 31 // Windows ws2ipdef.h IP_UNICAST_IF

type physicalNIC struct {
	IP    net.IP
	Index int
	Name  string
}

func isVirtualOrTunnelInterface(name string) bool {
	lower := strings.ToLower(name)
	for _, kw := range []string{
		"tun", "tap", "wintun", "sing", "clash", "mihomo", "anytls",
		"vethernet", "vmware", "virtualbox", "hyper-v", "loopback",
		"tailscale", "wireguard", "zerotier", "npcap", "bluetooth",
	} {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func isPhysicalPriorityName(name string) bool {
	lower := strings.ToLower(name)
	for _, kw := range []string{"wi-fi", "wlan", "ethernet", "以太网"} {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func findPhysicalNIC() *physicalNIC {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var fallback *physicalNIC
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		if isVirtualOrTunnelInterface(ifc.Name) {
			continue
		}
		addrs, err := ifc.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ipNet, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			ip4 := ipNet.IP.To4()
			if ip4 == nil || ip4.IsLoopback() || ip4.IsLinkLocalUnicast() || ip4.IsMulticast() {
				continue
			}
			s := ip4.String()
			// Skip common local TUN/fake-IP adapter ranges (e.g. high-mae uses 10.0.0.2)
			if strings.HasPrefix(s, "10.0.0.") || strings.HasPrefix(s, "172.19.0.") || strings.HasPrefix(s, "198.18.") {
				continue
			}
			cand := &physicalNIC{IP: ip4, Index: ifc.Index, Name: ifc.Name}
			if isPhysicalPriorityName(ifc.Name) {
				return cand
			}
			if fallback == nil {
				fallback = cand
			}
		}
	}
	return fallback
}

// hasTunnelInterface reports whether a TUN adapter (like high-mae's AnyTLS-TUN) is currently up.
func hasTunnelInterface() bool {
	ifaces, err := net.Interfaces()
	if err != nil {
		return false
	}
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		lower := strings.ToLower(ifc.Name)
		if strings.Contains(lower, "anytls") || strings.Contains(lower, "wintun") || strings.Contains(lower, "tun") || strings.Contains(lower, "tap") || strings.Contains(lower, "clash") || strings.Contains(lower, "sing") || strings.Contains(lower, "mihomo") {
			addrs, _ := ifc.Addrs()
			for _, a := range addrs {
				if ipNet, ok := a.(*net.IPNet); ok && ipNet.IP.To4() != nil {
					return true
				}
			}
		}
	}
	return false
}

// newPhysicalDialer creates a TCP dialer pinned to the active physical NIC via LocalAddr + IP_UNICAST_IF
// so outbound proxy node connections bypass any active TUN route and never loop back through TUN.
func newPhysicalDialer(timeout time.Duration) *net.Dialer {
	d := &net.Dialer{Timeout: timeout}
	nic := findPhysicalNIC()
	if nic != nil && nic.Index > 0 {
		d.LocalAddr = &net.TCPAddr{IP: nic.IP}
		ifIdx := nic.Index
		d.Control = func(network, address string, c syscall.RawConn) error {
			if strings.HasSuffix(network, "6") {
				return nil
			}
			var sockErr error
			if err := c.Control(func(fd uintptr) {
				// IP_UNICAST_IF expects the 4-byte interface index in network (big-endian) byte order.
				sockErr = windows.SetsockoptInt(
					windows.Handle(fd),
					windows.IPPROTO_IP,
					ipUnicastIf,
					int(bits.ReverseBytes32(uint32(ifIdx))),
				)
			}); err != nil {
				return err
			}
			return sockErr
		}
	}
	return d
}
