import {
  buildMobilePairingUrl,
  DEFAULT_BRIDGE_PORT,
  loadOrCreateBridgeConfig,
} from './config.js';
import {
  getDaemonStatus,
  installBridgeService,
  removeDaemonPidFile,
  startDaemonProcess,
  stopDaemonProcess,
  uninstallBridgeService,
  writeDaemonPidFile,
} from './daemon.js';
import { ensureEmptySandboxDir, isSeaRuntime } from './sandbox.js';
import { startBridgeServer } from './server.js';
import { renderPairingQr, startQuickTunnel } from './tunnel.js';

export async function runCli(argv: string[]): Promise<void> {
  let port = DEFAULT_BRIDGE_PORT;
  let resetToken = false;
  let printTokenOnly = false;
  let enableTunnel = false;
  let customPublicUrl = '';
  let daemonMode = false;
  let command: 'run' | 'install' | 'uninstall' | 'stop' | 'status' | 'protocol' =
    isSeaRuntime() && argv.length === 0 ? 'install' : 'run';
  const extraAllowedOrigins: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === 'install') {
      command = 'install';
    } else if (arg === 'uninstall') {
      command = 'uninstall';
    } else if (arg === 'stop') {
      command = 'stop';
    } else if (arg === 'status') {
      command = 'status';
    } else if (arg === '--daemon') {
      daemonMode = true;
    } else if (arg === '--protocol-launch') {
      command = 'protocol';
      if (argv[i + 1] && argv[i + 1].startsWith('interview-bridge://')) {
        i++;
      }
    } else if (arg.startsWith('interview-bridge://')) {
      command = 'protocol';
    } else if (arg === '--port' && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new Error(`无效端口号：${argv[i]}`);
      }
      port = n;
    } else if (arg.startsWith('--port=')) {
      const n = Number(arg.slice(7));
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new Error(`无效端口号：${arg.slice(7)}`);
      }
      port = n;
    } else if (arg === '--allow-origin' && argv[i + 1]) {
      extraAllowedOrigins.push(argv[++i]);
    } else if (arg.startsWith('--allow-origin=')) {
      extraAllowedOrigins.push(arg.slice(15));
    } else if (arg === '--tunnel') {
      enableTunnel = true;
    } else if (arg === '--public-url' && argv[i + 1]) {
      customPublicUrl = argv[++i].trim();
    } else if (arg.startsWith('--public-url=')) {
      customPublicUrl = arg.slice(13).trim();
    } else if (arg === '--reset-token') {
      resetToken = true;
    } else if (arg === '--print-token') {
      printTokenOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: interview-study-bridge [command] [options]',
          '',
          'Commands:',
          '  install                  Install background service, autostart, and interview-bridge:// handler',
          '  uninstall                Remove background service, autostart, and protocol handler',
          '  stop                     Stop background bridge daemon',
          '  status                   Show background daemon status',
          '',
          'Options:',
          `  --port <number>          Loopback port (default: ${DEFAULT_BRIDGE_PORT})`,
          '  --daemon                 Run in headless background mode',
          '  --tunnel                 Start HTTPS tunnel & print QR code for mobile pairing',
          '  --public-url <https://>  Use your own HTTPS tunnel/domain & print QR code',
          '  --allow-origin <origin>  Allow additional browser Origin',
          '  --reset-token            Generate a new pairing token',
          '  --print-token            Print current pairing token and exit',
        ].join('\n'),
      );
      return;
    }
  }

  if (command === 'install') {
    const out = await installBridgeService({ port, openBrowser: true });
    console.log(`Bridge installed (port ${out.port}, daemon ${out.daemonReady ? 'ready' : 'pending'})`);
    console.log(`Pairing URL: ${out.pairingUrl}`);
    return;
  }

  if (command === 'uninstall') {
    uninstallBridgeService();
    console.log('Bridge background service uninstalled.');
    return;
  }

  if (command === 'stop') {
    const out = stopDaemonProcess();
    console.log(out.stopped ? `Stopped bridge daemon (pid ${out.pid}).` : 'Bridge daemon is not running.');
    return;
  }

  if (command === 'status') {
    const st = await getDaemonStatus(port);
    console.log(JSON.stringify(st, null, 2));
    return;
  }

  if (command === 'protocol') {
    await startDaemonProcess(port);
    return;
  }

  if (customPublicUrl && !/^https:\/\//i.test(customPublicUrl)) {
    throw new Error('--public-url 必须以 https:// 开头（手机浏览器禁止混合 HTTP 请求）');
  }

  const { configPath, config } = loadOrCreateBridgeConfig({
    resetToken,
    extraAllowedOrigins,
  });

  if (printTokenOnly) {
    console.log(config.token);
    return;
  }

  const sandboxDir = ensureEmptySandboxDir();
  const running = await startBridgeServer({
    port,
    token: config.token,
    allowOrigins: config.allowedOrigins,
    ...(customPublicUrl ? { allowHosts: [customPublicUrl] } : {}),
  });

  if (daemonMode) {
    writeDaemonPidFile(running.port);
  }

  if (config.relayUrl && config.relaySecret) {
    running.relayClient.connect({
      relayUrl: config.relayUrl,
      relaySecret: config.relaySecret,
      ...(config.relayRoomKey ? { roomKey: config.relayRoomKey } : {}),
    });
  }

  console.log(`Bridge listening: ${running.url}`);
  if (!daemonMode) {
    console.log(`Pairing token:    ${config.token}`);
    console.log(`Config file:      ${configPath}`);
    console.log(`Sandbox cwd:      ${sandboxDir}`);
  }

  let closeTunnel: (() => void) | null = null;
  let activePublicUrl = customPublicUrl;

  if (enableTunnel && !activePublicUrl) {
    try {
      const tunnel = await startQuickTunnel(running.url);
      activePublicUrl = tunnel.url;
      closeTunnel = tunnel.close;
      running.allowHost(activePublicUrl);
    } catch (err) {
      console.error(`Tunnel warning:   ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (activePublicUrl) {
    const pairLink = buildMobilePairingUrl(activePublicUrl, config.token);
    console.log(`HTTPS tunnel:     ${activePublicUrl}`);
    console.log(`Mobile pair link: ${pairLink}`);
    console.log('\nScan with mobile camera to pair automatically:\n');
    console.log(renderPairingQr(pairLink));
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    closeTunnel?.();
    if (daemonMode) {
      removeDaemonPidFile();
    }
    await running.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}
