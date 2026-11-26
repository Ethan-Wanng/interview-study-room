import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { renderUnicodeCompact } from 'uqr';
import { resolveBridgeConfigDir } from './config.js';
import { killChildProcess, resolveSafeCommand } from './sandbox.js';

const TRYCLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function resolveCloudflaredDownloadSpec(): { url: string; isTgz: boolean; exeName: string } | null {
 const plat = process.platform;
 const arch = process.arch;
 const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download';

 if (plat === 'win32') {
  const asset = arch === 'ia32' ? 'cloudflared-windows-386.exe' : 'cloudflared-windows-amd64.exe';
  return { url: `${base}/${asset}`, isTgz: false, exeName: 'cloudflared.exe' };
 }
 if (plat === 'linux') {
  const asset =
   arch === 'arm64'
    ? 'cloudflared-linux-arm64'
    : arch === 'arm'
      ? 'cloudflared-linux-arm'
      : 'cloudflared-linux-amd64';
  return { url: `${base}/${asset}`, isTgz: false, exeName: 'cloudflared' };
 }
 if (plat === 'darwin') {
  const asset = arch === 'arm64' ? 'cloudflared-darwin-arm64.tgz' : 'cloudflared-darwin-amd64.tgz';
  return { url: `${base}/${asset}`, isTgz: true, exeName: 'cloudflared' };
 }
 return null;
}

export async function ensureCloudflaredBinary(configDir?: string): Promise<string> {
 const envBin = process.env.CLOUDFLARED_BIN?.trim();
 if (envBin) {
  const resolved = resolveSafeCommand(envBin, ['--version']);
  if (resolved) return resolved.command;
 }

 const inPath = resolveSafeCommand('cloudflared', ['--version']);
 if (inPath && !inPath.viaCmd) {
  return inPath.command;
 }

 const spec = resolveCloudflaredDownloadSpec();
 const binDir = path.join(resolveBridgeConfigDir(configDir), 'bin');
 fs.mkdirSync(binDir, { recursive: true, mode: 0o700 });
 const targetPath = path.join(binDir, spec?.exeName ?? (process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'));

 if (fs.existsSync(targetPath)) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile() && stat.size > 1_000_000) {
   return targetPath;
  }
 }

 if (!spec) {
  throw new Error('当前系统架构暂不支持自动下载 cloudflared，请手动安装 cloudflared 后重试。');
 }

 console.log(`Downloading cloudflared for HTTPS tunnel (${process.platform}/${process.arch})...`);
 const res = await fetch(spec.url, { redirect: 'follow' });
 if (!res.ok || !res.body) {
  throw new Error(`下载 cloudflared 失败（HTTP ${res.status}），请手动安装 cloudflared（如 winget install Cloudflare.cloudflared 或 brew install cloudflared）。`);
 }

 const buf = Buffer.from(await res.arrayBuffer());
 if (buf.length < 1_000_000) {
  throw new Error('下载的 cloudflared 文件体积异常，请检查网络后重试。');
 }

 if (spec.isTgz) {
  const tgzPath = `${targetPath}.tgz`;
  fs.writeFileSync(tgzPath, buf, { mode: 0o600 });
  try {
   const untar = spawnSync('tar', ['-xzf', tgzPath, '-C', binDir], { stdio: 'ignore' });
   if (untar.status !== 0 || !fs.existsSync(targetPath)) {
    throw new Error('解压 cloudflared.tgz 失败，请运行 brew install cloudflared 安装。');
   }
  } finally {
   try {
    fs.unlinkSync(tgzPath);
   } catch {}
  }
 } else {
  const tmpPath = `${targetPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, buf, { mode: 0o755 });
  fs.renameSync(tmpPath, targetPath);
 }

 try {
  fs.chmodSync(targetPath, 0o755);
 } catch {}

 return targetPath;
}

export async function startQuickTunnel(
 localUrl: string,
 opts?: { configDir?: string; timeoutMs?: number },
): Promise<{ url: string; close: () => void }> {
 const binPath = await ensureCloudflaredBinary(opts?.configDir);
 const timeoutMs = opts?.timeoutMs ?? 35_000;

 return new Promise((resolve, reject) => {
  let settled = false;
  let child: ChildProcessWithoutNullStreams | null = null;
  let recentLogs = '';

  const timer = setTimeout(() => {
   if (settled) return;
   settled = true;
   if (child) killChildProcess(child);
   reject(new Error(`启动 HTTPS 隧道超时。${recentLogs ? `日志：${recentLogs.slice(-240)}` : ''}`));
  }, timeoutMs);

  try {
   child = spawn(binPath, ['tunnel', '--url', localUrl, '--no-autoupdate'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
   });
   child.stdin.end();
  } catch (err) {
   clearTimeout(timer);
   reject(err instanceof Error ? err : new Error(String(err)));
   return;
  }

  const onChunk = (chunk: Buffer) => {
   const text = chunk.toString('utf8');
   recentLogs = (recentLogs + text).slice(-1200);
   if (settled) return;
   const match = recentLogs.match(TRYCLOUDFLARE_RE);
   if (match?.[0]) {
    settled = true;
    clearTimeout(timer);
    const url = match[0].toLowerCase();
    resolve({
     url,
     close: () => {
      if (child) {
       killChildProcess(child);
       child = null;
      }
     },
    });
   }
  };

  child.stdout?.on('data', onChunk);
  child.stderr?.on('data', onChunk);

  child.on('error', err => {
   if (settled) return;
   settled = true;
   clearTimeout(timer);
   reject(new Error(`启动 cloudflared 失败：${err.message}`));
  });

  child.on('exit', code => {
   if (settled) return;
   settled = true;
   clearTimeout(timer);
   reject(new Error(`cloudflared 提前退出（code=${code ?? 'unknown'}）`));
  });
 });
}

export function renderPairingQr(pairingUrl: string): string {
 return renderUnicodeCompact(pairingUrl, {
  ecc: 'M',
  border: 2,
  invert: true,
 });
}
