// Prompt Caching layer backed by Cloudflare D1 (`prompt_cache` table) + WebCrypto SHA-256.
// Supports:
//  1. Deterministic AI result cache (standard answers, identical grading, playground code completion)
//     -> ~25ms latency, 0 LLM tokens, 0 Gemini RPD consumed.
//  2. Explicit Gemini Context Caching (`cachedContents`) handle registry for long static system prompts.
//  3. Stable prefix hashing for OpenAI `prompt_cache_key`.

import { studyDb } from '@/db/study';

const enc = new TextEncoder();

export async function sha256Hex(parts: string[]): Promise<string> {
 const raw = enc.encode(parts.join('\x1f'));
 const buf = await crypto.subtle.digest('SHA-256', raw);
 const bytes = new Uint8Array(buf);
 let hex = '';
 for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
 return hex;
}

export async function readPromptCache<T>(cacheKey: string): Promise<{ payload: T; model: string; hits: number } | null> {
 const now = Date.now();
 try {
  const db = studyDb();
  const row = await db
   .prepare('SELECT payload, model, hits, expires_at FROM prompt_cache WHERE cache_key = ?')
   .bind(cacheKey)
   .first<{ payload: string; model: string; hits: number; expires_at: number }>();
  if (!row || row.expires_at <= now) return null;
  const parsed = JSON.parse(row.payload) as T;
  // Await hit bump so Cloudflare Workers doesn't cancel the D1 write upon returning the response.
  await db
   .prepare('UPDATE prompt_cache SET hits = hits + 1 WHERE cache_key = ?')
   .bind(cacheKey)
   .run()
   .catch(() => {});
  return { payload: parsed, model: row.model, hits: (row.hits || 0) + 1 };
 } catch {
  return null;
 }
}

export async function writePromptCache(
 cacheKey: string,
 kind: string,
 model: string,
 payload: unknown,
 ttlMs: number,
): Promise<void> {
 const now = Date.now();
 const expiresAt = now + ttlMs;
 const json = JSON.stringify(payload);
 if (json.length > 350_000) return;
 try {
  const db = studyDb();
  await db
   .prepare(
    `INSERT INTO prompt_cache(cache_key, kind, model, payload, hits, created_at, expires_at)
     VALUES(?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       model = excluded.model,
       payload = excluded.payload,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`,
   )
   .bind(cacheKey, kind, model, json, now, expiresAt)
   .run();
  // Occasional lazy cleanup of expired entries (~4% of writes)
  if (Math.random() < 0.04) {
   void db
    .prepare('DELETE FROM prompt_cache WHERE expires_at <= ?')
    .bind(now)
    .run()
    .catch(() => {});
  }
 } catch {}
}

// Explicit Gemini `cachedContents` lookup & creation for long static system prompts (>= 4500 chars).
// Models that don't support explicit `cachedContents` (or below token threshold) cache a negative marker for 10m.
export async function resolveGeminiContextCache(
 model: string,
 sys: string,
 postCache: (body: string) => Promise<Response>,
): Promise<string | null> {
 if (sys.length < 4500) return null;
 if (!/^gemini-(?:3\.[68]|4)-/i.test(model)) return null;
 const key = 'gctx:' + (await sha256Hex([model, sys]));
 const hit = await readPromptCache<{ name: string }>(key);
 if (hit) return hit.payload.name || null;

 try {
  const res = await postCache(
   JSON.stringify({
    model: `models/${model}`,
    systemInstruction: { parts: [{ text: sys }] },
    ttl: '1800s',
   }),
  );
  if (!res.ok) {
   await writePromptCache(key, 'gemini-ctx', model, { name: '' }, 10 * 60_000);
   return null;
  }
  const j = (await res.json()) as { name?: string };
  const name = typeof j?.name === 'string' && j.name.startsWith('cachedContents/') ? j.name : '';
  await writePromptCache(key, 'gemini-ctx', model, { name }, name ? 25 * 60_000 : 10 * 60_000);
  return name || null;
 } catch {
  return null;
 }
}

export async function readPromptCacheStats(): Promise<{ activeEntries: number; totalHits: number }> {
 try {
  const row = await studyDb()
   .prepare('SELECT COUNT(*) AS cnt, COALESCE(SUM(hits), 0) AS hits FROM prompt_cache WHERE expires_at > ? AND kind <> ?')
   .bind(Date.now(), 'gemini-ctx')
   .first<{ cnt: number; hits: number }>();
  return {
   activeEntries: Number(row?.cnt ?? 0),
   totalHits: Number(row?.hits ?? 0),
  };
 } catch {
  return { activeEntries: 0, totalHits: 0 };
 }
}
