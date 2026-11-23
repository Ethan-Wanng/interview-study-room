// Site-wide atomic D1 rate limiter for shared Gemini API key matching Google AI Studio free-tier quotas:
//   - gemini-4-hydrogen: 5 RPM, 250,000 TPM, 20 RPD
//   - gemini-3.8-flash:  5 RPM, 250,000 TPM, 20 RPD
//   - gemini-3.6-flash:  5 RPM, 250,000 TPM, 20 RPD
// Uses existing `auth_limits(key, count, reset_at)` table in D1 with prefixed keys (no schema migration required).

import { studyDb } from '@/db/study';

export type GeminiModelQuota = {
 model: string;
 label: string;
 rpm: number;
 tpm: number;
 rpd: number;
};

export const SITE_GEMINI_LIMITS: Record<string, GeminiModelQuota> = {
 'gemini-4-hydrogen': {
  model: 'gemini-4-hydrogen',
  label: 'Gemini 4 Hydrogen',
  rpm: 5,
  tpm: 250_000,
  rpd: 20,
 },
 'gemini-3.8-flash': {
  model: 'gemini-3.8-flash',
  label: 'Gemini 3.8 Flash',
  rpm: 5,
  tpm: 250_000,
  rpd: 20,
 },
 'gemini-3.6-flash': {
  model: 'gemini-3.6-flash',
  label: 'Gemini 3.6 Flash',
  rpm: 5,
  tpm: 250_000,
  rpd: 20,
 },
 'antigravity-preview-09-2026': {
  model: 'antigravity-preview-09-2026',
  label: 'Antigravity Agent',
  rpm: 60,
  tpm: 100_000,
  rpd: 100,
 },
};

const MINUTE_MS = 60_000;

// Google AI Studio RPD resets daily at midnight Pacific Time (UTC-8).
function pacificDayKey(nowMs = Date.now()): { dayKey: string; nextResetMs: number } {
 const pstMs = nowMs - 8 * 3600_000;
 const d = new Date(pstMs);
 const y = d.getUTCFullYear();
 const m = String(d.getUTCMonth() + 1).padStart(2, '0');
 const day = String(d.getUTCDate()).padStart(2, '0');
 const nextMidnightPstUtc = Date.UTC(y, d.getUTCMonth(), d.getUTCDate() + 1, 8, 0, 0, 0);
 return { dayKey: `${y}-${m}-${day}`, nextResetMs: nextMidnightPstUtc };
}

function keysFor(model: string, nowMs = Date.now()) {
 const { dayKey, nextResetMs } = pacificDayKey(nowMs);
 return {
  rpmKey: `gm:rpm:${model}`,
  tpmKey: `gm:tpm:${model}`,
  rpdKey: `gm:rpd:${model}:${dayKey}`,
  coolKey: `gm:cool:${model}`,
  nextResetMs,
 };
}

export function estimateGeminiTokens(sys: string, messages: { content: string; images?: string[] }[]): number {
 let chars = sys.length;
 let imgCount = 0;
 for (const m of messages) {
  chars += m.content.length;
  imgCount += m.images?.length ?? 0;
 }
 // Conservative CJK/English blend (~2 chars/token) + ~258 tokens/image + response budget buffer
 const est = Math.ceil(chars / 2) + imgCount * 260 + 512;
 return Math.max(256, Math.min(60_000, est));
}

export type ConsumeResult =
 | { allowed: true; reservedTokens: number }
 | { allowed: false; reason: 'rpm' | 'tpm' | 'rpd' | 'cooldown'; limit: number };

async function atomicInc(key: string, delta: number, limit: number, resetAt: number, now: number): Promise<boolean> {
 const db = studyDb();
 const row = await db
  .prepare(
   `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN ? ELSE count + ? END,
      reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
    WHERE auth_limits.reset_at <= ? OR auth_limits.count + ? <= ?
    RETURNING count`,
  )
  .bind(key, delta, resetAt, now, delta, delta, now, now, delta, limit)
  .first<{ count: number }>();
 return Boolean(row);
}

async function decKey(key: string, delta: number): Promise<void> {
 if (delta <= 0) return;
 try {
  await studyDb()
   .prepare('UPDATE auth_limits SET count = MAX(count - ?, 0) WHERE key = ?')
   .bind(delta, key)
   .run();
 } catch {}
}

export async function tryConsumeSiteGeminiLimit(model: string, estTokens: number): Promise<ConsumeResult> {
 const spec = SITE_GEMINI_LIMITS[model];
 if (!spec) return { allowed: true, reservedTokens: 0 };

 const now = Date.now();
 const { rpmKey, tpmKey, rpdKey, coolKey, nextResetMs } = keysFor(model, now);

 try {
  // 1. Check upstream 429 cooldown
  const cool = await studyDb()
   .prepare('SELECT count, reset_at FROM auth_limits WHERE key = ?')
   .bind(coolKey)
   .first<{ count: number; reset_at: number }>();
  if (cool && cool.reset_at > now) {
   return { allowed: false, reason: 'cooldown', limit: spec.rpm };
  }

  // 2. Reserve RPD (20/day)
  const rpdOk = await atomicInc(rpdKey, 1, spec.rpd, nextResetMs, now);
  if (!rpdOk) return { allowed: false, reason: 'rpd', limit: spec.rpd };

  // 3. Reserve RPM (5/min)
  const rpmOk = await atomicInc(rpmKey, 1, spec.rpm, now + MINUTE_MS, now);
  if (!rpmOk) {
   await decKey(rpdKey, 1);
   return { allowed: false, reason: 'rpm', limit: spec.rpm };
  }

  // 4. Reserve TPM (250K/min)
  const tokens = Math.max(1, Math.min(spec.tpm, Math.floor(estTokens)));
  const tpmOk = await atomicInc(tpmKey, tokens, spec.tpm, now + MINUTE_MS, now);
  if (!tpmOk) {
   await Promise.all([decKey(rpmKey, 1), decKey(rpdKey, 1)]);
   return { allowed: false, reason: 'tpm', limit: spec.tpm };
  }

  return { allowed: true, reservedTokens: tokens };
 } catch {
  // Never block requests if D1 rate-limit lookup transiently errors
  return { allowed: true, reservedTokens: 0 };
 }
}

export async function refundSiteGeminiLimit(model: string, reservedTokens: number): Promise<void> {
 const spec = SITE_GEMINI_LIMITS[model];
 if (!spec) return;
 const { rpmKey, tpmKey, rpdKey } = keysFor(model);
 await Promise.all([
  decKey(rpdKey, 1),
  decKey(rpmKey, 1),
  reservedTokens > 0 ? decKey(tpmKey, reservedTokens) : Promise.resolve(),
 ]);
}

export async function recordExtraGeminiTokens(model: string, extraTokens: number): Promise<void> {
 const spec = SITE_GEMINI_LIMITS[model];
 if (!spec || extraTokens <= 0) return;
 const now = Date.now();
 const { tpmKey } = keysFor(model, now);
 try {
  await studyDb()
   .prepare(
    `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN reset_at <= ? THEN ? ELSE MIN(count + ?, ?) END,
       reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END`,
   )
   .bind(tpmKey, extraTokens, now + MINUTE_MS, now, extraTokens, extraTokens, spec.tpm, now)
   .run();
 } catch {}
}

// Called when Google itself returns HTTP 429 (e.g. partial quota used outside the site).
export async function markSiteGemini429(model: string, bodyText: string): Promise<void> {
 const spec = SITE_GEMINI_LIMITS[model];
 if (!spec) return;
 const now = Date.now();
 const { rpdKey, coolKey, nextResetMs } = keysFor(model, now);
 const low = bodyText.toLowerCase();
 const isDaily =
  low.includes('perday') ||
  low.includes('per_day') ||
  low.includes('daily') ||
  low.includes('requestsperday');
 try {
  if (isDaily) {
   await studyDb()
    .prepare(
     `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET count = ?, reset_at = ?`,
    )
    .bind(rpdKey, spec.rpd, nextResetMs, spec.rpd, nextResetMs)
    .run();
  } else {
   await studyDb()
    .prepare(
     `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = ?`,
    )
    .bind(coolKey, now + MINUTE_MS, now + MINUTE_MS)
    .run();
  }
 } catch {}
}

export type GeminiQuotaSnapshot = {
 model: string;
 label: string;
 rpm: { used: number; limit: number };
 tpm: { used: number; limit: number };
 rpd: { used: number; limit: number };
 coolingSec: number;
};

export async function readSiteGeminiQuotas(): Promise<GeminiQuotaSnapshot[]> {
 const now = Date.now();
 const models = Object.values(SITE_GEMINI_LIMITS);
 const allKeys: string[] = [];
 const perModel = models.map((spec) => {
  const k = keysFor(spec.model, now);
  allKeys.push(k.rpmKey, k.tpmKey, k.rpdKey, k.coolKey);
  return { spec, k };
 });

 const map = new Map<string, { count: number; reset_at: number }>();
 try {
  const placeholders = allKeys.map(() => '?').join(',');
  const rows = await studyDb()
   .prepare(`SELECT key, count, reset_at FROM auth_limits WHERE key IN (${placeholders})`)
   .bind(...allKeys)
   .all<{ key: string; count: number; reset_at: number }>();
  for (const r of rows.results ?? []) map.set(r.key, r);
 } catch {}

 return perModel.map(({ spec, k }) => {
  const val = (key: string) => {
   const row = map.get(key);
   if (!row || row.reset_at <= now) return 0;
   return Math.max(0, Number(row.count || 0));
  };
  const coolRow = map.get(k.coolKey);
  const coolingSec = coolRow && coolRow.reset_at > now ? Math.ceil((coolRow.reset_at - now) / 1000) : 0;
  return {
   model: spec.model,
   label: spec.label,
   rpm: { used: val(k.rpmKey), limit: spec.rpm },
   tpm: { used: val(k.tpmKey), limit: spec.tpm },
   rpd: { used: val(k.rpdKey), limit: spec.rpd },
   coolingSec,
  };
 });
}
