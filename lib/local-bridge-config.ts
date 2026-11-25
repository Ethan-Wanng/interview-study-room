'use client';
import { useSyncExternalStore } from 'react';

export type LocalBridgeProvider = 'antigravity' | 'codex' | 'workbuddy';

export const LOCAL_BRIDGE_PROVIDERS: readonly LocalBridgeProvider[] = ['antigravity', 'codex', 'workbuddy'];

export const LOCAL_PROVIDER_LABEL: Record<LocalBridgeProvider, string> = {
 antigravity: 'Antigravity',
 codex: 'Codex',
 workbuddy: 'WorkBuddy',
};

export type LocalBridgeConfig = {
 enabled: boolean;
 port: number;
 token: string;
 provider: LocalBridgeProvider;
 model: string;
 allowTutor: boolean;
 allowGrade: boolean;
 allowDeep: boolean;
 allowWebSearch: boolean;
 thinkingLevels?: string[];
 defaultThinkingLevel?: string;
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

function normProvider(v: unknown): LocalBridgeProvider {
 return v === 'codex' || v === 'workbuddy' || v === 'antigravity' ? v : 'antigravity';
}

function normalizeConfig(raw: Partial<LocalBridgeConfig> | null | undefined): LocalBridgeConfig {
 if (!raw || typeof raw !== 'object') return DEFAULT_LOCAL_BRIDGE_CONFIG;
 return {
  enabled: Boolean(raw.enabled),
  port: clampPort(raw.port),
  token: typeof raw.token === 'string' ? raw.token.trim() : '',
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

export function isLocalTutorReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
 return Boolean(cfg.enabled && cfg.token.trim() && cfg.allowTutor);
}

export function isLocalGradeReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
 return Boolean(cfg.enabled && cfg.token.trim() && cfg.allowGrade);
}

export function isLocalDeepReady(cfg: LocalBridgeConfig = getLocalBridgeConfig()): boolean {
 return Boolean(cfg.enabled && cfg.token.trim() && cfg.allowDeep);
}
