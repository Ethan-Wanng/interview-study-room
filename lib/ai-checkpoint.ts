'use client';

export type AiCheckpointKind =
 | 'tutor'
 | 'note-ai'
 | 'jd-research'
 | 'jd-resume'
 | 'project-drill'
 | 'project-drill-regen'
 | 'jd-regen'
 | 'jd-fill'
 | 'standard-answer'
 | 'grade'
 | 'architect';

export type AiCheckpointStatus = 'running' | 'interrupted' | 'done';

export type AiCheckpoint<T> = {
 key: string;
 kind: AiCheckpointKind;
 status: AiCheckpointStatus;
 startedAt: number;
 updatedAt: number;
 model?: string;
 data: T;
};

const CP_PREFIX = 'isr-ai-cp:v1:';
const INDEX_KEY = `${CP_PREFIX}__index`;
const MAX_ENTRIES = 40;
const RUNNING_MAX_AGE_MS = 24 * 3600_000;
const DONE_MAX_AGE_MS = 7 * 24 * 3600_000;

export function makeCheckpointKey(kind: AiCheckpointKind, id: string): string {
 return `${kind}:${id}`;
}

function readIndex(): string[] {
 if (typeof window === 'undefined') return [];
 try {
  const raw = window.localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && Boolean(x)) : [];
 } catch {
  return [];
 }
}

function writeIndex(keys: string[]): void {
 if (typeof window === 'undefined') return;
 try {
  if (keys.length) window.localStorage.setItem(INDEX_KEY, JSON.stringify(keys.slice(0, MAX_ENTRIES)));
  else window.localStorage.removeItem(INDEX_KEY);
 } catch {}
}

export function readAiCheckpoint<T>(key: string, maxAgeMs?: number): AiCheckpoint<T> | null {
 if (typeof window === 'undefined' || !key) return null;
 try {
  const raw = window.localStorage.getItem(CP_PREFIX + key);
  if (!raw) return null;
  const cp = JSON.parse(raw) as Partial<AiCheckpoint<T>> | null;
  if (!cp || typeof cp !== 'object' || !cp.key || !cp.kind || !cp.status || typeof cp.updatedAt !== 'number') {
   return null;
  }
  const ttl = maxAgeMs ?? (cp.status === 'done' ? DONE_MAX_AGE_MS : RUNNING_MAX_AGE_MS);
  if (Date.now() - cp.updatedAt > ttl) {
   removeAiCheckpoint(key);
   return null;
  }
  return cp as AiCheckpoint<T>;
 } catch {
  return null;
 }
}

export function removeAiCheckpoint(key: string): void {
 if (typeof window === 'undefined' || !key) return;
 try {
  window.localStorage.removeItem(CP_PREFIX + key);
  const idx = readIndex().filter(k => k !== key);
  writeIndex(idx);
 } catch {}
}

export function writeAiCheckpoint<T>(cp: AiCheckpoint<T>): void {
 if (typeof window === 'undefined' || !cp.key) return;
 const payload = JSON.stringify(cp);
 const storageKey = CP_PREFIX + cp.key;
 const writeOnce = (): boolean => {
  try {
   window.localStorage.setItem(storageKey, payload);
   return true;
  } catch {
   return false;
  }
 };

 const idx = readIndex().filter(k => k !== cp.key);
 if (!writeOnce()) {
  while (idx.length > 0) {
   const oldest = idx.pop();
   if (oldest) {
    try {
     window.localStorage.removeItem(CP_PREFIX + oldest);
    } catch {}
   }
   if (writeOnce()) break;
  }
 }
 idx.unshift(cp.key);
 while (idx.length > MAX_ENTRIES) {
  const evicted = idx.pop();
  if (evicted) {
   try {
    window.localStorage.removeItem(CP_PREFIX + evicted);
   } catch {}
  }
 }
 writeIndex(idx);
}

export function listAiCheckpoints<T>(kind?: AiCheckpointKind, maxAgeMs?: number): AiCheckpoint<T>[] {
 if (typeof window === 'undefined') return [];
 const keys = readIndex();
 const out: AiCheckpoint<T>[] = [];
 for (const k of keys) {
  if (kind && !k.startsWith(`${kind}:`)) continue;
  const cp = readAiCheckpoint<T>(k, maxAgeMs);
  if (cp) out.push(cp);
 }
 out.sort((a, b) => b.updatedAt - a.updatedAt);
 return out;
}

export function createThrottledCheckpoint<T>(
 key: string,
 kind: AiCheckpointKind,
 intervalMs = 450,
): {
 update: (data: T, status?: AiCheckpointStatus, model?: string) => void;
 flush: (overrideStatus?: AiCheckpointStatus) => void;
 clear: () => void;
 dispose: () => void;
} {
 const startedAt = Date.now();
 let latestData: T | null = null;
 let latestStatus: AiCheckpointStatus = 'running';
 let latestModel: string | undefined;
 let lastWriteAt = 0;
 let timer: number | null = null;
 let disposed = false;

 const performWrite = (statusOverride?: AiCheckpointStatus) => {
  if (disposed || latestData === null) return;
  if (timer !== null && typeof window !== 'undefined') {
   window.clearTimeout(timer);
   timer = null;
  }
  const nextStatus = statusOverride ?? latestStatus;
  latestStatus = nextStatus;
  lastWriteAt = Date.now();
  writeAiCheckpoint<T>({
   key,
   kind,
   status: nextStatus,
   startedAt,
   updatedAt: lastWriteAt,
   ...(latestModel ? { model: latestModel } : {}),
   data: latestData,
  });
 };

 const onUnload = () => {
  if (disposed || latestData === null) return;
  if (latestStatus === 'running') {
   performWrite('interrupted');
  } else {
   performWrite();
  }
 };

 if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', onUnload);
  window.addEventListener('beforeunload', onUnload);
 }

 const detach = () => {
  if (disposed) return;
  disposed = true;
  if (timer !== null && typeof window !== 'undefined') {
   window.clearTimeout(timer);
   timer = null;
  }
  if (typeof window !== 'undefined') {
   window.removeEventListener('pagehide', onUnload);
   window.removeEventListener('beforeunload', onUnload);
  }
 };

 return {
  update(data: T, status: AiCheckpointStatus = 'running', model?: string) {
   if (disposed) return;
   latestData = data;
   latestStatus = status;
   if (model !== undefined) latestModel = model || undefined;
   const elapsed = Date.now() - lastWriteAt;
   if (elapsed >= intervalMs) {
    performWrite();
    return;
   }
   if (timer === null && typeof window !== 'undefined') {
    timer = window.setTimeout(() => {
     timer = null;
     performWrite();
    }, intervalMs - elapsed);
   }
  },
  flush(overrideStatus?: AiCheckpointStatus) {
   performWrite(overrideStatus);
  },
  clear() {
   detach();
   removeAiCheckpoint(key);
  },
  dispose() {
   detach();
  },
 };
}
