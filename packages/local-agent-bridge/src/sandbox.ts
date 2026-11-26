import { execFile, execFileSync, spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as nodeSea from 'node:sea';
import { resolveBridgeConfigDir } from './config.js';

export const SANDBOX_DIR_NAME = 'interview-study-empty-sandbox';

export type ResolvedCommand = {
  command: string;
  args: string[];
  displayPath: string;
  viaCmd: boolean;
};

const SAFE_CMD_ARG_RE = /^[A-Za-z0-9_.:@\/\\=-]+$/;
const NPM_CMD_JS_RE = /["']?(?:%~dp0|%dp0%)[\\/]([^"'\r\n]+\.(?:mjs|cjs|js))["']?/gi;

export function isSeaRuntime(): boolean {
  try {
    return typeof nodeSea.isSea === 'function' && nodeSea.isSea();
  } catch {
    return false;
  }
}

export function getManagedToolsDir(configDir?: string): string {
  return path.join(resolveBridgeConfigDir(configDir), 'tools');
}

export function ensureEmptySandboxDir(baseTmpDir?: string): string {
  const dir = path.join(baseTmpDir || os.tmpdir(), SANDBOX_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  try {
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  } catch {}
  return dir;
}

function resolveCmdShimTarget(cmdPath: string): string | null {
  try {
    const content = fs.readFileSync(cmdPath, 'utf8');
    const dir = path.dirname(cmdPath);
    const matches = [...content.matchAll(NPM_CMD_JS_RE)];
    for (const m of matches) {
      const rel = m[1];
      if (!rel) continue;
      const full = path.resolve(dir, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return full;
      }
    }
  } catch {}
  return null;
}

function getManagedAndVendorCandidates(binName: string, configDir?: string): string[] {
  const lower = binName.trim().toLowerCase();
  const toolsDir = getManagedToolsDir(configDir);
  const out: string[] = [];
  const pushIfFile = (p: string | undefined) => {
    if (!p) return;
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(p);
    } catch {}
  };

  if (lower === 'agy') {
    if (process.platform === 'win32') {
      pushIfFile(path.join(toolsDir, 'agy', 'agy.exe'));
      const localApp = process.env.LOCALAPPDATA?.trim();
      if (localApp) pushIfFile(path.join(localApp, 'agy', 'bin', 'agy.exe'));
    } else {
      pushIfFile(path.join(toolsDir, 'agy', 'agy'));
      pushIfFile(path.join(os.homedir(), '.local', 'bin', 'agy'));
      pushIfFile('/opt/homebrew/bin/agy');
      pushIfFile('/usr/local/bin/agy');
    }
  } else if (lower === 'codex') {
    if (process.platform === 'win32') {
      pushIfFile(path.join(toolsDir, 'codex', 'codex.exe'));
    } else {
      pushIfFile(path.join(toolsDir, 'codex', 'codex'));
    }
  } else if (lower === 'codebuddy') {
    if (process.platform === 'win32') {
      pushIfFile(path.join(toolsDir, 'codebuddy', 'node_modules', '.bin', 'codebuddy.cmd'));
      pushIfFile(path.join(toolsDir, 'codebuddy', 'node_modules', '.bin', 'codebuddy.exe'));
    } else {
      pushIfFile(path.join(toolsDir, 'codebuddy', 'node_modules', '.bin', 'codebuddy'));
    }
  } else if (lower === 'node') {
    if (process.platform === 'win32') {
      pushIfFile(path.join(toolsDir, 'node', 'node.exe'));
    } else {
      pushIfFile(path.join(toolsDir, 'node', 'bin', 'node'));
    }
  }

  return out;
}

function findSystemExecutables(trimmed: string): string[] {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('where.exe', [trimmed], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return out
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(p => p && fs.existsSync(p));
    }
    const out = execFileSync('which', ['-a', trimmed], {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(p => p && fs.existsSync(p));
  } catch {
    return [];
  }
}

export function resolveNodeExecutable(configDir?: string): string | null {
  if (!isSeaRuntime()) {
    return process.execPath;
  }
  const managed = getManagedAndVendorCandidates('node', configDir);
  if (managed.length) return managed[0];
  const sys = findSystemExecutables('node');
  if (sys.length) return sys[0];
  return null;
}

function findExecutableCandidates(binNameOrPath: string, configDir?: string): string[] {
  const trimmed = binNameOrPath.trim();
  if (!trimmed) return [];

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    const abs = path.resolve(trimmed);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return [abs];
    }
    if (process.platform === 'win32' && !path.extname(abs)) {
      for (const ext of ['.exe', '.cmd', '.bat', '.mjs', '.js']) {
        if (fs.existsSync(abs + ext) && fs.statSync(abs + ext).isFile()) {
          return [abs + ext];
        }
      }
    }
    return [];
  }

  const managed = getManagedAndVendorCandidates(trimmed, configDir);
  const sys = findSystemExecutables(trimmed);
  return [...new Set([...managed, ...sys])];
}

export function resolveSafeCommand(binNameOrPath: string, args: string[], configDir?: string): ResolvedCommand | null {
  const candidates = findExecutableCandidates(binNameOrPath, configDir);
  if (!candidates.length) return null;

  // Prefer .exe on Windows, then script entrypoints (.js/.mjs/.cjs), then .cmd shims
  let picked = candidates[0];
  if (process.platform === 'win32') {
    const exe = candidates.find(c => /\.exe$/i.test(c));
    const script = candidates.find(c => /\.(?:mjs|cjs|js)$/i.test(c));
    const cmd = candidates.find(c => /\.(?:cmd|bat)$/i.test(c));
    picked = exe || script || cmd || candidates[0];
  }

  const lower = picked.toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    const nodeExe = resolveNodeExecutable(configDir);
    if (!nodeExe) return null;
    return {
      command: nodeExe,
      args: [picked, ...args],
      displayPath: picked,
      viaCmd: false,
    };
  }

  if (process.platform === 'win32' && (lower.endsWith('.cmd') || lower.endsWith('.bat'))) {
    const jsTarget = resolveCmdShimTarget(picked);
    const nodeExe = jsTarget ? resolveNodeExecutable(configDir) : null;
    if (jsTarget && nodeExe) {
      return {
        command: nodeExe,
        args: [jsTarget, ...args],
        displayPath: picked,
        viaCmd: false,
      };
    }
    if (!args.every(a => SAFE_CMD_ARG_RE.test(a))) {
      return null;
    }
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', picked, ...args],
      displayPath: picked,
      viaCmd: true,
    };
  }

  return {
    command: picked,
    args: [...args],
    displayPath: picked,
    viaCmd: false,
  };
}

export function spawnSafeProcess(
  resolved: ResolvedCommand,
  sandboxCwd: string,
  extraEnv?: Record<string, string>,
): ChildProcessWithoutNullStreams {
  return spawn(resolved.command, resolved.args, {
    cwd: sandboxCwd,
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  });
}

export async function probeCommandVersion(
  binNameOrPath: string,
  sandboxCwd: string,
  timeoutMs = 5000,
): Promise<{ binaryPath: string; version?: string } | null> {
  const resolved = resolveSafeCommand(binNameOrPath, ['--version']);
  if (!resolved) return null;
  return new Promise(resolve => {
    execFile(
      resolved.command,
      resolved.args,
      {
        cwd: sandboxCwd,
        timeout: timeoutMs,
        windowsHide: true,
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        if (err && !stdout && !stderr) {
          resolve({ binaryPath: resolved.displayPath });
          return;
        }
        const firstLine = (stdout || stderr || '')
          .split(/\r?\n/)
          .map(s => s.trim())
          .find(Boolean);
        resolve({
          binaryPath: resolved.displayPath,
          version: firstLine ? firstLine.slice(0, 80) : undefined,
        });
      },
    );
  });
}

export function killChildProcess(child: ChildProcessWithoutNullStreams | null | undefined): void {
  if (!child || child.killed) return;
  try {
    child.stdin.end();
  } catch {}
  try {
    child.kill('SIGTERM');
  } catch {}
  if (process.platform === 'win32' && child.pid) {
    try {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 3000,
      });
    } catch {}
  }
}
