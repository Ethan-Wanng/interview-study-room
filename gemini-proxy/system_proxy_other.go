//go:build !windows

package geminiproxy

func readWindowsProxySettings() (bool, string) {
	return false, ""
}
