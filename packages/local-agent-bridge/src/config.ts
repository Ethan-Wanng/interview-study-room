import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BRIDGE_NAME = 'interview-study-bridge';
export const BRIDGE_VERSION = '1.0.5';
export const DEFAULT_BRIDGE_PORT = 43180;

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
  'https://exhan.dpdns.org',
];

const EXHAN_SUBDOMAIN_RE = /^https:\/\/[a-z0-9-]+\.exhan\.dpdns\.org$/i;
const TOKEN_RE = /^brg_[a-f0-9]{64}$/;
const RELAY_SECRET_RE = /^rly_[a-f0-9]{64}$/;

export type StoredBridgeConfig = {
  token: string;
  allowedOrigins: string[];
  relayUrl?: string;
  relaySecret?: string;
  relayRoomKey?: string;
  createdAt: number;
  updatedAt: number;
};

export function resolveBridgeConfigDir(overrideDir?: string): string {
  if (overrideDir) return overrideDir;
  if (process.env.INTERVIEW_BRIDGE_HOME) return process.env.INTERVIEW_BRIDGE_HOME;
  return path.join(os.homedir(), '.interview-study-bridge');
}

export function generatePairingToken(): string {
  return `brg_${crypto.randomBytes(32).toString('hex')}`;
}

export function normalizeOriginList(origins: string[]): string[] {
  const out = new Set<string>();
  for (const raw of origins) {
    const s = raw.trim().replace(/\/+$/, '');
    if (!s) continue;
    try {
      const u = new URL(s);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        out.add(u.origin.toLowerCase());
      }
    } catch {}
  }
  return [...out];
}

export function normalizeRelayWsUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const isLoopback = host === '127.0.0.1' || host === 'localhost';
    if (u.protocol !== 'wss:' && !(u.protocol === 'ws:' && isLoopback)) {
      return undefined;
    }
    if (u.protocol === 'wss:' && host !== 'exhan.dpdns.org' && !host.endsWith('.exhan.dpdns.org') && !isLoopback) {
      return undefined;
    }
    return u.origin + u.pathname;
  } catch {
    return undefined;
  }
}

export function loadOrCreateBridgeConfig(opts?: {
  configDir?: string;
  resetToken?: boolean;
  extraAllowedOrigins?: string[];
}): { configPath: string; config: StoredBridgeConfig } {
  const dir = resolveBridgeConfigDir(opts?.configDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {}

  const configPath = path.join(dir, 'config.json');
  let existing: Partial<StoredBridgeConfig> | null = null;
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<StoredBridgeConfig>;
    } catch {
      existing = null;
    }
  }

  const now = Date.now();
  const validToken = !opts?.resetToken && typeof existing?.token === 'string' && TOKEN_RE.test(existing.token)
    ? existing.token
    : generatePairingToken();

  const mergedOrigins = normalizeOriginList([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(Array.isArray(existing?.allowedOrigins) ? existing.allowedOrigins : []),
    ...(opts?.extraAllowedOrigins ?? []),
  ]);

  const relayUrl = normalizeRelayWsUrl(existing?.relayUrl);
  const relaySecret = typeof existing?.relaySecret === 'string' && RELAY_SECRET_RE.test(existing.relaySecret)
    ? existing.relaySecret
    : undefined;
  const relayRoomKey = typeof existing?.relayRoomKey === 'string' && existing.relayRoomKey.trim()
    ? existing.relayRoomKey.trim()
    : undefined;

  const config: StoredBridgeConfig = {
    token: validToken,
    allowedOrigins: mergedOrigins,
    ...(relayUrl && relaySecret ? { relayUrl, relaySecret, ...(relayRoomKey ? { relayRoomKey } : {}) } : {}),
    createdAt: typeof existing?.createdAt === 'number' && existing.createdAt > 0 ? existing.createdAt : now,
    updatedAt: now,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {}

  return { configPath, config };
}

export function updateBridgeRelayConfig(
  patch: { relayUrl?: string; relaySecret?: string; relayRoomKey?: string } | null,
  opts?: { configDir?: string },
): { configPath: string; config: StoredBridgeConfig } {
  const { configPath, config } = loadOrCreateBridgeConfig({ configDir: opts?.configDir });
  let next: StoredBridgeConfig;
  if (patch === null) {
    const rest = { ...config };
    delete rest.relayUrl;
    delete rest.relaySecret;
    delete rest.relayRoomKey;
    next = { ...rest, updatedAt: Date.now() };
  } else {
    const relayUrl = normalizeRelayWsUrl(patch.relayUrl);
    const relaySecret = typeof patch.relaySecret === 'string' && RELAY_SECRET_RE.test(patch.relaySecret.trim())
      ? patch.relaySecret.trim()
      : undefined;
    const relayRoomKey = typeof patch.relayRoomKey === 'string' && patch.relayRoomKey.trim()
      ? patch.relayRoomKey.trim()
      : undefined;
    if (!relayUrl || !relaySecret) {
      throw new Error('无效的云端中继地址或密钥');
    }
    next = {
      ...config,
      relayUrl,
      relaySecret,
      ...(relayRoomKey ? { relayRoomKey } : {}),
      updatedAt: Date.now(),
    };
  }
  fs.writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {}
  return { configPath, config: next };
}

export function normalizeAllowedHost(hostOrUrl: string): string | null {
  const raw = hostOrUrl.trim();
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return u.host.toLowerCase();
    }
    const u = new URL(`https://${raw}`);
    return u.host.toLowerCase();
  } catch {
    return null;
  }
}

export function buildMobilePairingUrl(
  publicUrl: string,
  token: string,
  siteOrigin = 'https://exhan.dpdns.org',
): string {
  const cleanUrl = publicUrl.trim().replace(/\/+$/, '');
  const payload = Buffer.from(JSON.stringify({ u: cleanUrl, t: token.trim() }), 'utf8').toString('base64url');
  return `${siteOrigin.trim().replace(/\/+$/, '')}/ai/local-bridge#pair=${payload}`;
}

export function buildLocalPairingUrl(
  port: number,
  token: string,
  siteOrigin = 'https://exhan.dpdns.org',
): string {
  const payload = Buffer.from(JSON.stringify({ p: port, t: token.trim() }), 'utf8').toString('base64url');
  return `${siteOrigin.trim().replace(/\/+$/, '')}/ai/local-bridge#pair=${payload}`;
}

export function isLoopbackHostHeader(hostHeader: string | undefined, port: number): boolean {
  if (!hostHeader) return false;
  const h = hostHeader.trim().toLowerCase();
  return h === `127.0.0.1:${port}` || h === `localhost:${port}`;
}

export function isAllowedHostHeader(
  hostHeader: string | undefined,
  port: number,
  extraHosts?: ReadonlySet<string>,
): boolean {
  if (!hostHeader) return false;
  const h = hostHeader.trim().toLowerCase();
  if (h === `127.0.0.1:${port}` || h === `localhost:${port}`) return true;
  if (extraHosts?.size) {
    if (extraHosts.has(h)) return true;
    const bare = h.replace(/:(443|80)$/, '');
    if (extraHosts.has(bare)) return true;
  }
  return false;
}

export function isAllowedOrigin(origin: string, extraAllowed?: string[]): boolean {
  const normalized = origin.trim().replace(/\/+$/, '');
  if (!normalized) return false;
  let canonical = '';
  try {
    const u = new URL(normalized);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    canonical = u.origin.toLowerCase();
  } catch {
    return false;
  }
  if (EXHAN_SUBDOMAIN_RE.test(canonical)) return true;
  const defaults = new Set(DEFAULT_ALLOWED_ORIGINS.map(o => o.toLowerCase()));
  if (defaults.has(canonical)) return true;
  if (extraAllowed?.length) {
    const extras = new Set(normalizeOriginList(extraAllowed));
    if (extras.has(canonical)) return true;
  }
  return false;
}

export function verifyBearerToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader || !expectedToken) return false;
  const m = authHeader.match(/^Bearer\s+(\S+)$/i);
  if (!m?.[1]) return false;
  const given = Buffer.from(m[1], 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}
