import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BridgeError, type LocalProviderId } from './drivers/types.js';
import {
  ensureEmptySandboxDir,
  getManagedToolsDir,
  probeCommandVersion,
  resolveNodeExecutable,
  resolveSafeCommand,
} from './sandbox.js';

export type InstallProgressEvent = {
  stage: string;
  pct: number;
};

const inFlightInstalls = new Map<LocalProviderId, Promise<{ binaryPath: string; version?: string }>>();
const DEFAULT_SITE_ORIGIN = 'https://exhan.dpdns.org';
const PORTABLE_NODE_VER = 'v22.14.0';

function getAgyPlatformKey(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  if (process.platform === 'win32') return `windows_${arch}`;
  if (process.platform === 'darwin') return `darwin_${arch}`;
  if (process.platform === 'linux') return `linux_${arch}`;
  throw new BridgeError('bad_request', `不支持的操作系统：${process.platform}`);
}

function getCodexOsKey(): { osKey: string; assetName: string; isArchive: boolean } {
  const arm = process.arch === 'arm64';
  if (process.platform === 'win32') {
    return arm
      ? { osKey: 'win-arm64', assetName: 'codex-aarch64-pc-windows-msvc.exe', isArchive: false }
      : { osKey: 'win-x64', assetName: 'codex-x86_64-pc-windows-msvc.exe', isArchive: false };
  }
  if (process.platform === 'darwin') {
    return arm
      ? { osKey: 'darwin-arm64', assetName: 'codex-aarch64-apple-darwin.tar.gz', isArchive: true }
      : { osKey: 'darwin-x64', assetName: 'codex-x86_64-apple-darwin.tar.gz', isArchive: true };
  }
  if (process.platform === 'linux') {
    return arm
      ? { osKey: 'linux-arm64', assetName: 'codex-aarch64-unknown-linux-musl.tar.gz', isArchive: true }
      : { osKey: 'linux-x64', assetName: 'codex-x86_64-unknown-linux-musl.tar.gz', isArchive: true };
  }
  throw new BridgeError('bad_request', `不支持的操作系统：${process.platform}`);
}

function getPortableNodeUrl(): { url: string; folderName: string } {
  const arm = process.arch === 'arm64';
  if (process.platform === 'win32') {
    const suffix = arm ? 'win-arm64' : 'win-x64';
    return {
      url: `https://npmmirror.com/mirrors/node/${PORTABLE_NODE_VER}/node-${PORTABLE_NODE_VER}-${suffix}.zip`,
      folderName: `node-${PORTABLE_NODE_VER}-${suffix}`,
    };
  }
  if (process.platform === 'darwin') {
    const suffix = arm ? 'darwin-arm64' : 'darwin-x64';
    return {
      url: `https://npmmirror.com/mirrors/node/${PORTABLE_NODE_VER}/node-${PORTABLE_NODE_VER}-${suffix}.tar.gz`,
      folderName: `node-${PORTABLE_NODE_VER}-${suffix}`,
    };
  }
  const suffix = arm ? 'linux-arm64' : 'linux-x64';
  return {
    url: `https://npmmirror.com/mirrors/node/${PORTABLE_NODE_VER}/node-${PORTABLE_NODE_VER}-${suffix}.tar.gz`,
    folderName: `node-${PORTABLE_NODE_VER}-${suffix}`,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  if (init.signal) {
    init.signal.addEventListener('abort', () => ctl.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadToFile(
  url: string,
  destPath: string,
  stage: string,
  pctStart: number,
  pctSpan: number,
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { signal?: AbortSignal; expectedSha512?: string },
): Promise<{ headers: Headers }> {
  const res = await fetchWithTimeout(url, { redirect: 'follow', signal: opts?.signal }, 30_000);
  if (!res.ok || !res.body) {
    throw new Error(`下载失败 (${res.status})`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.tmp-${process.pid}`;
  const out = fs.createWriteStream(tmpPath);
  const hasher = opts?.expectedSha512 ? crypto.createHash('sha512') : null;
  const total = Number(res.headers.get('content-length') || '0');
  let received = 0;
  let lastPct = -1;

  try {
    const reader = res.body.getReader();
    for (;;) {
      if (opts?.signal?.aborted) throw new Error('安装已取消');
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (hasher) hasher.update(value);
      await new Promise<void>((resolve, reject) => {
        if (out.write(value)) {
          resolve();
        } else {
          out.once('drain', resolve);
          out.once('error', reject);
        }
      });
      const ratio = total > 0 ? Math.min(1, received / total) : Math.min(0.9, received / (60 * 1024 * 1024));
      const pct = Math.min(99, Math.round(pctStart + ratio * pctSpan));
      if (pct !== lastPct) {
        lastPct = pct;
        onProgress({ stage, pct });
      }
    }
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.once('error', reject);
    });

    const headerSha = opts?.expectedSha512 || res.headers.get('x-asset-sha512') || '';
    if (hasher && headerSha) {
      const actual = hasher.digest('hex').toLowerCase();
      if (actual !== headerSha.trim().toLowerCase()) {
        throw new Error('安装包 SHA-512 校验失败');
      }
    } else if (headerSha) {
      const actual = await new Promise<string>((resolve, reject) => {
        const h = crypto.createHash('sha512');
        const rs = fs.createReadStream(tmpPath);
        rs.on('data', chunk => h.update(chunk));
        rs.on('end', () => resolve(h.digest('hex').toLowerCase()));
        rs.on('error', reject);
      });
      if (actual !== headerSha.trim().toLowerCase()) {
        throw new Error('安装包 SHA-512 校验失败');
      }
    }

    fs.renameSync(tmpPath, destPath);
    if (process.platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return { headers: res.headers };
  } catch (err) {
    try {
      out.destroy();
    } catch {}
    try {
      if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
    } catch {}
    throw err;
  }
}

function runExec(cmd: string, args: string[], cwd: string, timeoutMs = 120_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd, timeout: timeoutMs, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || stdout || err.message).trim().slice(0, 400)));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function findFileRecursive(dir: string, predicate: (name: string) => boolean): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && predicate(entry.name)) return full;
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, predicate);
      if (found) return found;
    }
  }
  return null;
}

async function installAntigravity(
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { configDir?: string; signal?: AbortSignal; siteOrigin?: string },
): Promise<{ binaryPath: string; version?: string }> {
  const plat = getAgyPlatformKey();
  const toolsDir = getManagedToolsDir(opts?.configDir);
  const dest = path.join(toolsDir, 'agy', process.platform === 'win32' ? 'agy.exe' : 'agy');
  const siteOrigin = (opts?.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');

  onProgress({ stage: 'downloading', pct: 3 });

  let downloaded = false;
  try {
    const mfRes = await fetchWithTimeout(
      `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/${plat}.json`,
      { signal: opts?.signal },
      10_000,
    );
    if (mfRes.ok) {
      const mf = (await mfRes.json()) as { url?: string; sha512?: string };
      if (typeof mf.url === 'string' && mf.url.startsWith('https://')) {
        await downloadToFile(mf.url, dest, 'downloading', 5, 88, onProgress, {
          signal: opts?.signal,
          expectedSha512: mf.sha512,
        });
        downloaded = true;
      }
    }
  } catch {
    if (opts?.signal?.aborted) throw new Error('安装已取消');
  }

  if (!downloaded) {
    const proxyUrl = `${siteOrigin}/api/bridge-download?tool=agy&os=${encodeURIComponent(plat)}`;
    await downloadToFile(proxyUrl, dest, 'downloading', 5, 88, onProgress, { signal: opts?.signal });
  }

  onProgress({ stage: 'verifying', pct: 96 });
  const ver = await probeCommandVersion('agy', ensureEmptySandboxDir(), 6000);
  if (!ver) {
    throw new BridgeError('upstream_error', 'Antigravity 安装校验失败');
  }
  onProgress({ stage: 'done', pct: 100 });
  return ver;
}

async function installCodex(
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { configDir?: string; signal?: AbortSignal; siteOrigin?: string },
): Promise<{ binaryPath: string; version?: string }> {
  const { osKey, assetName, isArchive } = getCodexOsKey();
  const toolsDir = getManagedToolsDir(opts?.configDir);
  const codexDir = path.join(toolsDir, 'codex');
  const dest = path.join(codexDir, process.platform === 'win32' ? 'codex.exe' : 'codex');
  const siteOrigin = (opts?.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');

  onProgress({ stage: 'downloading', pct: 3 });

  const downloadTarget = isArchive ? path.join(codexDir, assetName) : dest;
  let downloaded = false;

  try {
    const relRes = await fetchWithTimeout(
      'https://api.github.com/repos/openai/codex/releases/latest',
      {
        headers: { 'User-Agent': 'interview-study-bridge', Accept: 'application/vnd.github+json' },
        signal: opts?.signal,
      },
      10_000,
    );
    if (relRes.ok) {
      const rel = (await relRes.json()) as {
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };
      const asset = rel.assets?.find(a => a.name === assetName);
      if (asset?.browser_download_url?.startsWith('https://')) {
        await downloadToFile(asset.browser_download_url, downloadTarget, 'downloading', 5, isArchive ? 80 : 88, onProgress, {
          signal: opts?.signal,
        });
        downloaded = true;
      }
    }
  } catch {
    if (opts?.signal?.aborted) throw new Error('安装已取消');
  }

  if (!downloaded) {
    const proxyUrl = `${siteOrigin}/api/bridge-download?tool=codex&os=${encodeURIComponent(osKey)}`;
    await downloadToFile(proxyUrl, downloadTarget, 'downloading', 5, isArchive ? 80 : 88, onProgress, {
      signal: opts?.signal,
    });
  }

  if (isArchive) {
    onProgress({ stage: 'extracting', pct: 88 });
    const unpackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-unpack-'));
    try {
      await runExec('tar', ['-xzf', downloadTarget, '-C', unpackDir], os.tmpdir(), 60_000);
      const binFile = findFileRecursive(unpackDir, name => name === 'codex' || name.startsWith('codex-'));
      if (!binFile) {
        throw new Error('压缩包内未找到 codex 可执行文件');
      }
      fs.mkdirSync(codexDir, { recursive: true });
      fs.copyFileSync(binFile, dest);
      fs.chmodSync(dest, 0o755);
    } finally {
      fs.rmSync(unpackDir, { recursive: true, force: true });
      fs.rmSync(downloadTarget, { force: true });
    }
  }

  onProgress({ stage: 'verifying', pct: 96 });
  const ver = await probeCommandVersion('codex', ensureEmptySandboxDir(), 6000);
  if (!ver) {
    throw new BridgeError('upstream_error', 'Codex 安装校验失败');
  }
  onProgress({ stage: 'done', pct: 100 });
  return ver;
}

async function ensureNpmRuntime(
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { configDir?: string; signal?: AbortSignal },
): Promise<{ cmd: string; preArgs: string[] }> {
  // 1. Prefer system npm if available (via node + npm-cli.js or cmd.exe on Windows)
  const sysNpm = resolveSafeCommand('npm', [], opts?.configDir);
  if (sysNpm) {
    if (sysNpm.viaCmd) {
      return { cmd: sysNpm.command, preArgs: sysNpm.args };
    }
    return { cmd: sysNpm.command, preArgs: sysNpm.args };
  }

  // 2. Check existing portable node runtime under tools/node
  const toolsDir = getManagedToolsDir(opts?.configDir);
  const portableDir = path.join(toolsDir, 'node');
  const portableNode = resolveNodeExecutable(opts?.configDir);
  const portableNpmCli = process.platform === 'win32'
    ? path.join(portableDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
    : path.join(portableDir, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (portableNode && fs.existsSync(portableNpmCli)) {
    return { cmd: portableNode, preArgs: [portableNpmCli] };
  }

  // 3. Download portable Node 22 from npmmirror (no PowerShell, uses native tar)
  const { url, folderName } = getPortableNodeUrl();
  const archiveName = path.basename(new URL(url).pathname);
  const archivePath = path.join(toolsDir, archiveName);
  const unpackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-unpack-'));

  try {
    await downloadToFile(url, archivePath, 'downloading', 5, 45, onProgress, { signal: opts?.signal });
    onProgress({ stage: 'extracting', pct: 52 });
    const tarBin = process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
      : 'tar';
    await runExec(tarBin, ['-xf', archivePath, '-C', unpackDir], os.tmpdir(), 90_000);
    const extractedRoot = path.join(unpackDir, folderName);
    if (!fs.existsSync(extractedRoot)) {
      throw new Error('便携 Node 解压失败');
    }
    if (fs.existsSync(portableDir)) {
      fs.rmSync(portableDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(portableDir), { recursive: true });
    fs.cpSync(extractedRoot, portableDir, { recursive: true });
  } finally {
    fs.rmSync(unpackDir, { recursive: true, force: true });
    if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true });
  }

  const nextNode = resolveNodeExecutable(opts?.configDir);
  if (!nextNode || !fs.existsSync(portableNpmCli)) {
    throw new Error('便携 Node / npm 初始化失败');
  }
  return { cmd: nextNode, preArgs: [portableNpmCli] };
}

async function installWorkBuddy(
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { configDir?: string; signal?: AbortSignal },
): Promise<{ binaryPath: string; version?: string }> {
  const toolsDir = getManagedToolsDir(opts?.configDir);
  const prefixDir = path.join(toolsDir, 'codebuddy');
  fs.mkdirSync(prefixDir, { recursive: true });

  onProgress({ stage: 'downloading', pct: 3 });
  const npmRunner = await ensureNpmRuntime(onProgress, opts);
  onProgress({ stage: 'installing', pct: 60 });

  await runExec(
    npmRunner.cmd,
    [
      ...npmRunner.preArgs,
      'install',
      '--prefix',
      prefixDir,
      '--no-audit',
      '--no-fund',
      '--omit=optional',
      '@tencent-ai/codebuddy-code',
      '--registry=https://registry.npmmirror.com',
    ],
    ensureEmptySandboxDir(),
    180_000,
  );

  onProgress({ stage: 'verifying', pct: 96 });
  const ver = await probeCommandVersion('codebuddy', ensureEmptySandboxDir(), 6000);
  if (!ver) {
    throw new BridgeError('upstream_error', 'WorkBuddy / CodeBuddy 安装校验失败');
  }
  onProgress({ stage: 'done', pct: 100 });
  return ver;
}

export async function installProviderTool(
  provider: LocalProviderId,
  onProgress: (ev: InstallProgressEvent) => void,
  opts?: { configDir?: string; signal?: AbortSignal; siteOrigin?: string },
): Promise<{ binaryPath: string; version?: string }> {
  const existing = inFlightInstalls.get(provider);
  if (existing) return existing;

  const task = (async () => {
    if (provider === 'antigravity') return installAntigravity(onProgress, opts);
    if (provider === 'codex') return installCodex(onProgress, opts);
    if (provider === 'workbuddy') return installWorkBuddy(onProgress, opts);
    throw new BridgeError('bad_request', `不支持的客户端：${provider}`);
  })();

  inFlightInstalls.set(provider, task);
  try {
    return await task;
  } finally {
    inFlightInstalls.delete(provider);
  }
}

export async function launchProviderLogin(
  provider: LocalProviderId,
  opts?: { configDir?: string },
): Promise<{ started: true; authUrl?: string }> {
  const spec: Record<LocalProviderId, { bin: string; args: string[]; label: string }> = {
    antigravity: { bin: 'agy', args: ['acp', '--login'], label: 'Antigravity' },
    codex: { bin: 'codex', args: ['login'], label: 'Codex' },
    workbuddy: { bin: 'codebuddy', args: ['login'], label: 'WorkBuddy' },
  };
  const cfg = spec[provider];
  if (!cfg) {
    throw new BridgeError('bad_request', `不支持的客户端：${provider}`);
  }
  const resolved = resolveSafeCommand(cfg.bin, cfg.args, opts?.configDir);
  if (!resolved) {
    throw new BridgeError('missing_binary', `请先安装 ${cfg.label}`);
  }

  const sandboxDir = ensureEmptySandboxDir();
  const child = spawn(resolved.command, resolved.args, {
    cwd: sandboxDir,
    shell: false,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const killTimer = setTimeout(() => {
    try {
      child.kill('SIGTERM');
    } catch {}
  }, 5 * 60_000);
  if (typeof (killTimer as { unref?: () => void }).unref === 'function') {
    (killTimer as { unref: () => void }).unref();
  }
  child.once('exit', () => clearTimeout(killTimer));
  child.unref();

  let output = '';
  const authUrl = await new Promise<string | undefined>(resolve => {
    let settled = false;
    const finish = (url?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(url);
    };
    const inspect = (chunk: Buffer) => {
      output += chunk.toString('utf8');
      const m = output.match(/https:\/\/[^\s"'<>]+/i);
      if (m?.[0]) finish(m[0].replace(/[),.;]+$/, ''));
    };
    child.stdout?.on('data', inspect);
    child.stderr?.on('data', inspect);
    child.once('exit', () => finish(undefined));
    child.once('error', () => finish(undefined));
    const timer = setTimeout(() => finish(undefined), 3500);
  });

  return { started: true, ...(authUrl ? { authUrl } : {}) };
}
