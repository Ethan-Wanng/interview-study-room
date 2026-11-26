# interview-study-bridge

Local `127.0.0.1` loopback bridge that connects [Interview Study Room](https://exhan.dpdns.org) directly to your locally signed-in **Antigravity**, **Codex**, or **WorkBuddy (CodeBuddy)** official CLI.

Online guide & pairing page: https://exhan.dpdns.org/ai/local-bridge

## Quick Start

Requires **Node.js >= 20**.

1. Sign in to at least one supported official CLI on your machine:
   - **Antigravity**: `agy acp --login`
   - **Codex**: `codex login`
   - **WorkBuddy**: `npm i -g @tencent-ai/codebuddy-code` then `codebuddy login`

2. Start the local bridge in a terminal:

```bash
npx -y interview-study-bridge@latest
```

To connect from a **mobile phone / tablet** (iOS Safari or Android Chrome over Wi-Fi or 5G), pass `--tunnel` to open an HTTPS tunnel and print a scannable pairing QR code:

```bash
npx -y interview-study-bridge@latest --tunnel
```

3. Open https://exhan.dpdns.org/ai/local-bridge (or scan the terminal QR code on mobile), paste the `brg_...` pairing token, and click **连接并保存 (Connect & Save)**.

## CLI Options

```text
Usage: interview-study-bridge [options]

Options:
  --port <number>          Loopback port (default: 43180)
  --tunnel                 Start HTTPS tunnel & print QR code for mobile pairing
  --public-url <https://>  Use your own HTTPS tunnel/domain & print QR code
  --allow-origin <origin>  Allow additional browser Origin
  --reset-token            Generate a new pairing token
  --print-token            Print current pairing token and exit
  -h, --help               Show help
```

## Security Design

- **Loopback only**: Binds strictly to `127.0.0.1` (never `0.0.0.0`), verifying `Host`, `Origin`, Private Network Access (`Access-Control-Request-Private-Network`), and constant-time `Bearer brg_...` pairing token.
- **Read-only empty sandbox**: Spawns official CLIs inside an empty temporary directory (`os.tmpdir()/interview-bridge-empty-sandbox`) and automatically denies all file-write, shell-execution, and tool-approval requests.
- **Zero session conflict**: Reuses official local CLI sessions without logging out or interrupting your open desktop IDE/client.

## License

MIT
