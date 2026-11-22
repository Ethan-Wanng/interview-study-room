//go:build windows

package geminiproxy

import "golang.org/x/sys/windows/registry"

func readWindowsProxySettings() (enabled bool, server string) {
	k, err := registry.OpenKey(
		registry.CURRENT_USER,
		`Software\Microsoft\Windows\CurrentVersion\Internet Settings`,
		registry.QUERY_VALUE,
	)
	if err != nil {
		return false, ""
	}
	defer k.Close()

	val, _, err := k.GetIntegerValue("ProxyEnable")
	if err != nil || val == 0 {
		return false, ""
	}
	srv, _, err := k.GetStringValue("ProxyServer")
	if err != nil {
		return false, ""
	}
	return true, srv
}
