'use client';
import { useSyncExternalStore } from 'react';

export type LocalBridgeProvider = 'antigravity' | 'codex' | 'workbuddy';

export const LOCAL_BRIDGE_PROVIDERS: readonly LocalBridgeProvider[] = ['antigravity', 'codex', 'workbuddy'];

export const LOCAL_PROVIDER_LABEL: Record<LocalBridgeProvider, string> = {
  antigravity: 'Antigravity',
  codex: 'Codex',
  workbuddy: 'WorkBuddy',
};

export type CachedLocalModel = {
  id: string;
  label: string;
  thinkingLevels?: string[];
  defaultThinkingLevel?: string;
};

export type CachedLocalProviderCatalog = Partial<Record<LocalBridgeProvider, CachedLocalModel[]>>;

export type LocalBridgeConfig = {
  enabled: boolean;
  port: number;
  url?: string;
  token: string;
  relayCode?: string;
  relayLinked?: boolean;
  provider: LocalBridgeProvider;
  model: string;
  allowTutor: boolean;
  allowGrade: boolean;
  allowDeep: boolean;
  allowWebSearch: boolean;
  thinkingLevels?: string[];
  defaultThinkingLevel?: string;
  providerModels?: CachedLocalProviderCatalog;
};

export const LOCAL_BRIDGE_KEY = 'local-agent-bridge-v1';

export const DEFAULT_LOCAL_BRIDGE_CONFIG: LocalBridgeConfig = {
  enabled: false,
  port: 43180,
  token: '',
  provider: 'antigravity',
  model: '',
  allowTutor: true,
  allowGrade: true,
  allowDeep: true,
  allowWebSearch: false,
};

const listeners = new Set<() => void>();
let rawCache: string | null = null;
let parsedCache: LocalBridgeConfig = DEFAULT_LOCAL_BRIDGE_CONFIG;

function clampPort(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : 43180;
}

export function normalizeRelayCode(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function normalizeBridgeUrl(v: unknown): string {
  if (typeof v !== 'string') return '';
  const trimmed = v.trim();
  if (!trimmed) return '';
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase();
    const isLoopback = host === '127.0.0.1' || host === 'localhost';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLoopback)) {
      return '';
    }
    return u.origin;
  } catch {
    return '';
  }
}

export type BridgeTarget =
  | number
  | string
  | Pick<LocalBridgeConfig, 'port' | 'url' | 'relayCode' | 'relayLinked'>;

export function resolveBridgeEndpoint(target: BridgeTarget): { baseUrl: string; displayHost: string } {
  if (typeof target === 'number') {
    const p = clampPort(target);
    return { baseUrl: `http://127.0.0.1:${p}`, displayHost: `127.0.0.1:${p}` };
  }
  if (typeof target === 'string') {
    const s = target.trim();
    if (/^\d{1,5}$/.test(s)) {
      const p = clampPort(Number(s));
      return { baseUrl: `http://127.0.0.1:${p}`, displayHost: `127.0.0.1:${p}` };
    }
    const clean = normalizeBridgeUrl(s);
    if (clean) {
      return { baseUrl: clean, displayHost: clean.replace(/^https?:\/\//i, '') };
    }
    return { baseUrl: 'http://127.0.0.1:43180', displayHost: '127.0.0.1:43180' };
  }
  const clean = normalizeBridgeUrl(target.url);
  if (clean) {
    return { baseUrl: clean, displayHost: clean.replace(/^https?:\/\//i, '') };
  }
  const p = clampPort(target.port);
  return { baseUrl: `http://127.0.0.1:${p}`, displayHost: `127.0.0.1:${p}` };
}

export function extractRelayCode(target: BridgeTarget): string {
  if (typeof target === 'object' && target !== null && typeof target.relayCode === 'string') {
    return normalizeRelayCode(target.relayCode);
  }
  return '';
}

export function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function parseBridgePairPayload(raw: string): { url?: string; port?: number; token: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const match = s.match(/(?:^|[#?&])pair=([A-Za-z0-9_-]+)/);
  const b64 = match?.[1] ?? '';
  if (!b64) return null;
  try {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const token =
      typeof json.t === 'string' && json.t.trim()
        ? json.t.trim()
        : typeof json.token === 'string' && json.token.trim()
          ? json.token.trim()
          : '';
    if (!token) return null;
    const rawUrl = typeof json.u === 'string' ? json.u : typeof json.url === 'string' ? json.url : '';
    const url = normalizeBridgeUrl(rawUrl);
    const port = json.p !== undefined ? clampPort(json.p) : json.port !== undefined ? clampPort(json.port) : undefined;
    return {
      token,
      ...(url ? { url } : {}),
      ...(port ? { port } : {}),
    };
  } catch {
    return null;
  }
}

function normProvider(v: unknown): LocalBridgeProvider {
  return v === 'codex' || v === 'workbuddy' || v === 'antigravity' ? v : 'antigravity';
}

function normalizeCatalog(raw: unknown): CachedLocalProviderCatalog | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const src = raw as Record<string, unknown>;
  const out: CachedLocalProviderCatalog = {};
  let hasAny = false;
  for (const pid of LOCAL_BRIDGE_PROVIDERS) {
    const list = src[pid];
    if (!Array.isArray(list)) continue;
    const cleaned: CachedLocalModel[] = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id.trim() : '';
      if (!id) continue;
      const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : id;
      const levels = Array.isArray(o.thinkingLevels)
        ? o.thinkingLevels.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map(v => v.trim())
        : undefined;
      const def = typeof o.defaultThinkingLevel === 'string' && o.defaultThinkingLevel.trim() ? o.defaultThinkingLevel.trim() : undefined;
      cleaned.push({
        id,
        label,
        ...(levels ? { thinkingLevels: levels } : {}),
        ...(def ? { defaultThinkingLevel: def } : {}),
      });
    }
    if (cleaned.length) {
      out[pid] = cleaned;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}

function normalizeConfig(raw: Partial<LocalBridgeConfig> | null | undefined): LocalBridgeConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_LOCAL_BRIDGE_CONFIG;
  const providerModels = normalizeCatalog(raw.providerModels);
  const cleanUrl = normalizeBridgeUrl(raw.url);
  const relayCode = normalizeRelayCode(raw.relayCode);
  return {
    enabled: Boolean(raw.enabled),
    port: clampPort(raw.port),
    ...(cleanUrl ? { url: cleanUrl } : {}),
    token: typeof raw.token === 'string' ? raw.token.trim() : '',
    ...(relayCode ? { relayCode } : {}),
    ...(raw.relayLinked === true ? { relayLinked: true } : {}),
    provider: normProvider(raw.provider),
    model: typeof raw.model === 'string' ? raw.model.trim() : '',
    allowTutor: raw.allowTutor !== false,
    allowGrade: raw.allowGrade !== false,
    allowDeep: raw.allowDeep !== false,
    allowWebSearch: raw.allowWebSearch === true,
    ...(Array.isArray(raw.thinkingLevels)
      ? { thinkingLevels: raw.thinkingLevels.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map(v => v.trim()) }
      : {}),
    ...(typeof raw.defaultThinkingLevel === 'string' && raw.defaultThinkingLevel.trim()
      ? { defaultThinkingLevel: raw.defaultThinkingLevel.trim() }
      : {}),
    ...(providerModels ? { providerModels } : {}),
  };
}

export function getLocalBridgeConfig(): LocalBridgeConfig {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_BRIDGE_CONFIG;
  try {
    const raw = window.localStorage.getItem(LOCAL_BRIDGE_KEY);
    if (raw === rawCache) return parsedCache;
    rawCache = raw;
    if (!raw) {
      parsedCache = DEFAULT_LOCAL_BRIDGE_CONFIG;
      return parsedCache;
    }
    parsedCache = normalizeConfig(JSON.parse(raw) as Partial<LocalBridgeConfig>);
    return parsedCache;
  } catch {
    return DEFAULT_LOCAL_BRIDGE_CONFIG;
  }
}

export function saveLocalBridgeConfig(patch: Partial<LocalBridgeConfig>): LocalBridgeConfig {
  const next = normalizeConfig({ ...getLocalBridgeConfig(), ...patch });
  const raw = JSON.stringify(next);
  rawCache = raw;
  parsedCache = next;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_BRIDGE_KEY, raw);
    }
  } catch {}
  listeners.forEach(fn => fn());
  return next;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_BRIDGE_KEY) {
      rawCache = null;
      fn();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(fn);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

export function useLocalBridgeConfig(): [LocalBridgeConfig, (patch: Partial<LocalBridgeConfig>) => LocalBridgeConfig] {
  const cfg = useSyncExternalStore(subscribe, getLocalBridgeConfig, () => DEFAULT_LOCAL_BRIDGE_CONFIG);
  return [cfg, saveLocalBridgeConfig];
}

export function hasBridgeTransport(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
  return Boolean(cfg.token.trim() || cfg.relayCode?.trim() || cfg.relayLinked);
}

export function isLocalTutorReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
  return Boolean(cfg.enabled && hasBridgeTransport(cfg) && cfg.allowTutor);
}

export function isLocalGradeReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
  return Boolean(cfg.enabled && hasBridgeTransport(cfg) && cfg.allowGrade);
}

export function isLocalDeepReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
  return Boolean(cfg.enabled && hasBridgeTransport(cfg) && cfg.allowDeep);
}
