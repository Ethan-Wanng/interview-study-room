import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRIDGE_VERSION,
  buildLocalPairingUrl,
  DEFAULT_BRIDGE_PORT,
  loadOrCreateBridgeConfig,
  resolveBridgeConfigDir,
} from './config.js';
import { isSeaRuntime } from './sandbox.js';

type PidRecord = {
  pid: number;
  port: number;
  version: string;
  startedAt: number;
};

type LaunchSpec = {
  bin: string;
  baseArgs: string[];
  appDir: string;
};

function readPidFile(configDir?: string): PidRecord | null {
  const pidPath = path.join(resolveBridgeConfigDir(configDir), 'bridge.pid');
  if (!fs.existsSync(pidPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(pidPath, 'utf8')) as Partial<PidRecord>;
    if (typeof raw.pid === 'number' && Number.isInteger(raw.pid) && raw.pid > 0) {
      return {
        pid: raw.pid,
        port: typeof raw.port === 'number' ? raw.port : DEFAULT_BRIDGE_PORT,
        version: typeof raw.version === 'string' ? raw.version : '',
        startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : 0,
      };
    }
  } catch {}
  return null;
}

export function writeDaemonPidFile(port: number, configDir?: string): void {
  const dir = resolveBridgeConfigDir(configDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const pidPath = path.join(dir, 'bridge.pid');
  const rec: PidRecord = {
    pid: process.pid,
    port,
    version: BRIDGE_VERSION,
    startedAt: Date.now(),
  };
  fs.writeFileSync(pidPath, JSON.stringify(rec, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
}

export function removeDaemonPidFile(configDir?: string): void {
  const pidPath = path.join(resolveBridgeConfigDir(configDir), 'bridge.pid');
  try {
    const cur = readPidFile(configDir);
    if (!cur || cur.pid === process.pid) {
      if (fs.existsSync(pidPath)) fs.rmSync(pidPath, { force: true });
    }
  } catch {}
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === 'EPERM';
  }
}

export async function probeLoopbackPing(port: number, timeoutMs = 1500): Promise<{ ok: boolean; version?: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/ping`, { signal: ctl.signal });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok?: boolean; version?: string };
    return {
      ok: data?.ok === true,
      ...(typeof data?.version === 'string' ? { version: data.version } : {}),
    };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

export function openUrlInDefaultBrowser(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return;
  }
  const host = parsed.hostname.toLowerCase();
  const isLoopback = host === '127.0.0.1' || host === 'localhost';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
    return;
  }
  const url = parsed.toString();

  if (process.platform === 'win32') {
    spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function resolvePackageRoot(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, '..');
  } catch {
    return process.cwd();
  }
}

export function syncRuntimeToHome(configDir?: string): LaunchSpec {
  const dir = resolveBridgeConfigDir(configDir);
  const appDir = path.join(dir, 'app');
  fs.mkdirSync(appDir, { recursive: true, mode: 0o700 });

  if (isSeaRuntime()) {
    const exeName = process.platform === 'win32' ? 'InterviewStudyBridge.exe' : 'InterviewStudyBridge';
    const targetExe = path.join(appDir, exeName);
    if (path.resolve(process.execPath).toLowerCase() !== path.resolve(targetExe).toLowerCase()) {
      fs.copyFileSync(process.execPath, targetExe);
      if (process.platform !== 'win32') {
        fs.chmodSync(targetExe, 0o755);
      }
    }
    return { bin: targetExe, baseArgs: [], appDir };
  }

  const pkgRoot = resolvePackageRoot();
  const targetCli = path.join(appDir, 'bin', 'cli.mjs');
  if (path.resolve(pkgRoot).toLowerCase() !== path.resolve(appDir).toLowerCase()) {
    for (const rel of ['package.json', 'README.md']) {
      const src = path.join(pkgRoot, rel);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(appDir, rel));
    }
    for (const sub of ['bin', 'dist']) {
      const src = path.join(pkgRoot, sub);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(appDir, sub), { recursive: true, force: true });
      }
    }
    const uqrSrc = path.join(pkgRoot, 'node_modules', 'uqr');
    if (fs.existsSync(uqrSrc)) {
      fs.cpSync(uqrSrc, path.join(appDir, 'node_modules', 'uqr'), { recursive: true, force: true });
    }
  }
  return { bin: process.execPath, baseArgs: [targetCli], appDir };
}

function escapeVbs(s: string): string {
  return s.replace(/"/g, '""');
}

function getWindowsStartupVbsPath(): string | null {
  const appData = process.env.APPDATA?.trim();
  if (!appData) return null;
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'InterviewStudyBridge.vbs');
}

function registerOsIntegration(spec: LaunchSpec, port: number, configDir?: string): void {
  const dir = resolveBridgeConfigDir(configDir);
  const fullArgs = [...spec.baseArgs, '--daemon', '--port', String(port)];

  if (process.platform === 'win32') {
    const cmdLine = [`"${spec.bin}"`, ...fullArgs.map(a => (/\s/.test(a) ? `"${a}"` : a))].join(' ');
    const vbsBody = [
      'Set shell = CreateObject("WScript.Shell")',
      `shell.Run "${escapeVbs(cmdLine)}", 0, False`,
      '',
    ].join('\r\n');

    const wakeupVbs = path.join(dir, 'wakeup.vbs');
    fs.writeFileSync(wakeupVbs, vbsBody, 'utf8');

    const startupVbs = getWindowsStartupVbsPath();
    if (startupVbs) {
      fs.mkdirSync(path.dirname(startupVbs), { recursive: true });
      fs.writeFileSync(startupVbs, vbsBody, 'utf8');
    }

    const wscript = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe');
    const reg = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
    execFileSync(reg, ['add', 'HKCU\\Software\\Classes\\interview-bridge', '/ve', '/t', 'REG_SZ', '/d', 'URL:Interview Study Bridge', '/f'], { windowsHide: true, stdio: 'ignore' });
    execFileSync(reg, ['add', 'HKCU\\Software\\Classes\\interview-bridge', '/v', 'URL Protocol', '/t', 'REG_SZ', '/d', '', '/f'], { windowsHide: true, stdio: 'ignore' });
    execFileSync(
      reg,
      ['add', 'HKCU\\Software\\Classes\\interview-bridge\\shell\\open\\command', '/ve', '/t', 'REG_SZ', '/d', `"${wscript}" //B "${wakeupVbs}" "%1"`, '/f'],
      { windowsHide: true, stdio: 'ignore' },
    );
    return;
  }

  if (process.platform === 'darwin') {
    const agentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const plistPath = path.join(agentsDir, 'org.dpdns.exhan.interview-study-bridge.plist');
    const logPath = path.join(dir, 'bridge.log');
    const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const programArgs = [spec.bin, ...fullArgs].map(a => `    <string>${xmlEscape(a)}</string>`).join('\n');
    const plist = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      '<dict>',
      '  <key>Label</key><string>org.dpdns.exhan.interview-study-bridge</string>',
      '  <key>ProgramArguments</key>',
      '  <array>',
      programArgs,
      '  </array>',
      '  <key>RunAtLoad</key><true/>',
      '  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>',
      `  <key>StandardOutPath</key><string>${xmlEscape(logPath)}</string>`,
      `  <key>StandardErrorPath</key><string>${xmlEscape(logPath)}</string>`,
      '</dict>',
      '</plist>',
      '',
    ].join('\n');
    fs.writeFileSync(plistPath, plist, 'utf8');
    try {
      execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' });
    } catch {}
    try {
      execFileSync('launchctl', ['load', '-w', plistPath], { stdio: 'ignore' });
    } catch {}
    return;
  }

  // Linux: systemd user service + xdg scheme handler
  const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  fs.mkdirSync(systemdDir, { recursive: true });
  const servicePath = path.join(systemdDir, 'interview-study-bridge.service');
  const execStart = [spec.bin, ...fullArgs].map(a => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  fs.writeFileSync(
    servicePath,
    [
      '[Unit]',
      'Description=Interview Study Bridge',
      'After=network-online.target',
      '',
      '[Service]',
      `ExecStart=${execStart}`,
      'Restart=on-failure',
      'RestartSec=3',
      '',
      '[Install]',
      'WantedBy=default.target',
      '',
    ].join('\n'),
    'utf8',
  );
  try {
    execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'ignore' });
    execFileSync('systemctl', ['--user', 'enable', 'interview-study-bridge.service'], { stdio: 'ignore' });
  } catch {}

  const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');
  fs.mkdirSync(appsDir, { recursive: true });
  const desktopFile = path.join(appsDir, 'interview-bridge.desktop');
  const protoCmd = [spec.bin, ...spec.baseArgs, '--protocol-launch', '%u', '--port', String(port)]
    .map(a => (/\s/.test(a) ? `"${a}"` : a))
    .join(' ');
  fs.writeFileSync(
    desktopFile,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Interview Study Bridge',
      `Exec=${protoCmd}`,
      'NoDisplay=true',
      'MimeType=x-scheme-handler/interview-bridge;',
      '',
    ].join('\n'),
    'utf8',
  );
  try {
    execFileSync('xdg-mime', ['default', 'interview-bridge.desktop', 'x-scheme-handler/interview-bridge'], { stdio: 'ignore' });
  } catch {}
}

export function stopDaemonProcess(configDir?: string): { stopped: boolean; pid?: number } {
  const rec = readPidFile(configDir);
  if (!rec) return { stopped: false };
  const alive = isPidAlive(rec.pid);
  if (alive && rec.pid !== process.pid) {
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/pid', String(rec.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore', timeout: 4000 });
      } else {
        process.kill(rec.pid, 'SIGTERM');
      }
    } catch {}
  }
  const pidPath = path.join(resolveBridgeConfigDir(configDir), 'bridge.pid');
  if (fs.existsSync(pidPath)) {
    try {
      fs.rmSync(pidPath, { force: true });
    } catch {}
  }
  return { stopped: alive, pid: rec.pid };
}

export async function startDaemonProcess(port = DEFAULT_BRIDGE_PORT, configDir?: string): Promise<{ started: boolean; alreadyRunning: boolean; port: number }> {
  const ping = await probeLoopbackPing(port, 1200);
  if (ping.ok) {
    return { started: false, alreadyRunning: true, port };
  }

  const spec = syncRuntimeToHome(configDir);
  const dir = resolveBridgeConfigDir(configDir);
  const logPath = path.join(dir, 'bridge.log');
  try {
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1024 * 1024) {
      fs.truncateSync(logPath, 0);
    }
  } catch {}

  const outFd = fs.openSync(logPath, 'a');
  try {
    const child = spawn(spec.bin, [...spec.baseArgs, '--daemon', '--port', String(port)], {
      cwd: spec.appDir,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', outFd, outFd],
    });
    child.unref();
  } finally {
    fs.closeSync(outFd);
  }

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    const check = await probeLoopbackPing(port, 800);
    if (check.ok) {
      return { started: true, alreadyRunning: false, port };
    }
  }

  return { started: false, alreadyRunning: false, port };
}

export async function installBridgeService(opts?: {
  port?: number;
  configDir?: string;
  openBrowser?: boolean;
  siteOrigin?: string;
}): Promise<{ port: number; pairingUrl: string; daemonReady: boolean }> {
  const port = opts?.port ?? DEFAULT_BRIDGE_PORT;
  const dir = resolveBridgeConfigDir(opts?.configDir);
  const { config } = loadOrCreateBridgeConfig({ configDir: dir });

  // Stop any existing daemon so SEA executable overwrite works cleanly on Windows.
  stopDaemonProcess(dir);
  await new Promise(r => setTimeout(r, 300));

  const spec = syncRuntimeToHome(dir);
  registerOsIntegration(spec, port, dir);

  const daemon = await startDaemonProcess(port, dir);
  const pairingUrl = buildLocalPairingUrl(port, config.token, opts?.siteOrigin);

  if (opts?.openBrowser !== false) {
    openUrlInDefaultBrowser(pairingUrl);
  }

  return {
    port,
    pairingUrl,
    daemonReady: daemon.started || daemon.alreadyRunning,
  };
}

export function uninstallBridgeService(configDir?: string): { removed: boolean } {
  const dir = resolveBridgeConfigDir(configDir);
  stopDaemonProcess(dir);

  if (process.platform === 'win32') {
    const startupVbs = getWindowsStartupVbsPath();
    if (startupVbs && fs.existsSync(startupVbs)) {
      try {
        fs.rmSync(startupVbs, { force: true });
      } catch {}
    }
    const reg = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
    try {
      execFileSync(reg, ['delete', 'HKCU\\Software\\Classes\\interview-bridge', '/f'], { windowsHide: true, stdio: 'ignore' });
    } catch {}
  } else if (process.platform === 'darwin') {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'org.dpdns.exhan.interview-study-bridge.plist');
    if (fs.existsSync(plistPath)) {
      try {
        execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' });
      } catch {}
      try {
        fs.rmSync(plistPath, { force: true });
      } catch {}
    }
  } else {
    const servicePath = path.join(os.homedir(), '.config', 'systemd', 'user', 'interview-study-bridge.service');
    try {
      execFileSync('systemctl', ['--user', 'disable', '--now', 'interview-study-bridge.service'], { stdio: 'ignore' });
    } catch {}
    if (fs.existsSync(servicePath)) {
      try {
        fs.rmSync(servicePath, { force: true });
      } catch {}
    }
    const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', 'interview-bridge.desktop');
    if (fs.existsSync(desktopFile)) {
      try {
        fs.rmSync(desktopFile, { force: true });
      } catch {}
    }
  }

  return { removed: true };
}

export async function getDaemonStatus(port = DEFAULT_BRIDGE_PORT, configDir?: string): Promise<{
  running: boolean;
  pid?: number;
  port: number;
  version?: string;
  configDir: string;
}> {
  const dir = resolveBridgeConfigDir(configDir);
  const rec = readPidFile(dir);
  const effPort = rec?.port ?? port;
  const ping = await probeLoopbackPing(effPort, 1200);
  return {
    running: ping.ok || Boolean(rec && isPidAlive(rec.pid)),
    ...(rec ? { pid: rec.pid } : {}),
    port: effPort,
    ...(ping.version ? { version: ping.version } : rec?.version ? { version: rec.version } : {}),
    configDir: dir,
  };
}
