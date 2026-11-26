// Unified site-owned AI token anti-abuse quota guard (atomic D1 counters on `auth_limits`, zero schema migration).
// Protects shared site DEEPSEEK_API_KEY against guest cookie-reset abuse and multi-account farming:
// - Regular logged-in users: 50 site DeepSeek calls/day (shared across Tutor, Grading, My-Questions, Playground, JD/Architect, etc.).
// - Guests: 5 DeepSeek calls/day per session + 10 DeepSeek calls/day per IP.
// - Same IP across all non-admin accounts: max 120 DeepSeek/day.
// - Per-minute burst limit: 10/min (user), 4/min (guest).
// - Admins, Custom API Keys, and Local Client Bridge (`interview-study-bridge`) do NOT consume site quota.

import { studyDb } from '@/db/study';
import { currentAdmin } from './admin-auth';
import { beijingDayWindow } from './jd-daily-limit';
import { hashToken } from './site-auth';

export type SiteAiProvider = 'deepseek';

export const SITE_AI_LIMITS = {
 deepseek: {
  userDaily: 50,
  guestDaily: 5,
  guestIpDaily: 10,
  ipDaily: 120,
 },
 burstPerMinute: {
  user: 10,
  guest: 4,
 },
} as const;

const MINUTE_MS = 60_000;

export function extractClientIp(headers: Headers): string {
 const cf = headers.get('cf-connecting-ip')?.trim();
 if (cf) return cf.slice(0, 64);
 const xff = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 if (xff) return xff.slice(0, 64);
 const real = headers.get('x-real-ip')?.trim();
 if (real) return real.slice(0, 64);
 return '';
}

async function atomicInc(key: string, limit: number, resetAt: number, now: number): Promise<number | null> {
 const row = await studyDb()
  .prepare(
   `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
    WHERE auth_limits.reset_at <= ? OR auth_limits.count < ?
    RETURNING count`,
  )
  .bind(key, resetAt, now, now, now, limit)
  .first<{ count: number }>();
 return row ? Number(row.count) : null;
}

async function decKey(key: string): Promise<void> {
 try {
  await studyDb()
   .prepare('UPDATE auth_limits SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END WHERE key = ?')
   .bind(key)
   .run();
 } catch {}
}

async function readCount(key: string, now: number): Promise<number> {
 try {
  const row = await studyDb()
   .prepare('SELECT count, reset_at FROM auth_limits WHERE key = ?')
   .bind(key)
   .first<{ count: number; reset_at: number }>();
  if (!row || row.reset_at <= now) return 0;
  return Math.max(0, Number(row.count) || 0);
 } catch {
  return 0;
 }
}

function userDayKey(provider: SiteAiProvider, userId: string, dayKey: string): string {
 return hashToken(`site-ai:v1:${provider}:u:${userId}:${dayKey}`);
}

function guestIpDayKey(ip: string, dayKey: string): string {
 return hashToken(`site-ai:v1:deepseek:gip:${ip}:${dayKey}`);
}

function ipDayKey(provider: SiteAiProvider, ip: string, dayKey: string): string {
 return hashToken(`site-ai:v1:${provider}:ip:${ip}:${dayKey}`);
}

function burstKey(scope: string): string {
 return hashToken(`site-ai:v1:rpm:${scope}`);
}

export type SiteAiQuotaOutcome =
 | { ok: true; remaining: number; limit: number; refund: () => Promise<void> }
 | { ok: false; status: 403 | 429; error: 'auth' | 'quota'; message: string };

export async function consumeSiteAiQuota(
 req: Request,
 user: { id: string; is_guest: number },
 provider: SiteAiProvider = 'deepseek',
): Promise<SiteAiQuotaOutcome> {
 const isGuest = Boolean(user.is_guest);
 if (!isGuest) {
  const admin = await currentAdmin(req.headers).catch(() => null);
  if (admin) {
   return { ok: true, remaining: 999, limit: 999, refund: async () => {} };
  }
 }

 const now = Date.now();
 const { dayKey, resetAtMs } = beijingDayWindow(now);
 const ip = extractClientIp(req.headers);
 const incremented: string[] = [];

 const rollback = async () => {
  await Promise.all(incremented.map(k => decKey(k)));
 };

 try {
  const bScope = isGuest && ip ? `ip:${ip}` : `u:${user.id}`;
  const bLimit = isGuest ? SITE_AI_LIMITS.burstPerMinute.guest : SITE_AI_LIMITS.burstPerMinute.user;
  const bKey = burstKey(bScope);
  const bCount = await atomicInc(bKey, bLimit, now + MINUTE_MS, now);
  if (bCount === null) {
   return {
    ok: false,
    status: 429,
    error: 'quota',
    message: '请求过于频繁，请稍等 1 分钟后再试，或在「AI 设置」接入本地客户端 / 专属 API Key。',
   };
  }
  incremented.push(bKey);

  const spec = SITE_AI_LIMITS[provider];
  const uLimit = isGuest ? spec.guestDaily : spec.userDaily;
  const uKey = userDayKey(provider, user.id, dayKey);
  const uCount = await atomicInc(uKey, uLimit, resetAtMs, now);
  if (uCount === null) {
   await rollback();
   return {
    ok: false,
    status: 429,
    error: 'quota',
    message: isGuest
     ? `游客每天最多使用 ${uLimit} 次站点 DeepSeek，今日额度已用完。登录后每天可使用 ${spec.userDaily} 次，或免费接入「本地客户端」。`
     : `今日 ${uLimit} 次站点 DeepSeek 额度已用完，明天 0 点重置；可在「AI 设置」接入本地客户端或配置专属 API Key（不限站内额度）。`,
   };
  }
  incremented.push(uKey);

  if (isGuest && ip) {
   const gIpKey = guestIpDayKey(ip, dayKey);
   const gIpCount = await atomicInc(gIpKey, SITE_AI_LIMITS.deepseek.guestIpDaily, resetAtMs, now);
   if (gIpCount === null) {
    await rollback();
    return {
     ok: false,
     status: 429,
     error: 'quota',
     message: `当前网络游客今日免费试用额度（${SITE_AI_LIMITS.deepseek.guestIpDaily} 次）已用完，请登录正式账号或接入本地客户端。`,
    };
   }
   incremented.push(gIpKey);
  }

  if (ip) {
   const allIpKey = ipDayKey(provider, ip, dayKey);
   const allIpCount = await atomicInc(allIpKey, spec.ipDaily, resetAtMs, now);
   if (allIpCount === null) {
    await rollback();
    return {
     ok: false,
     status: 429,
     error: 'quota',
     message: '当前网络今日站点 AI 总调用已达保护上限，请明天再来或接入本地客户端 / 专属 API Key。',
    };
   }
   incremented.push(allIpKey);
  }

  let refunded = false;
  const refund = async () => {
   if (refunded) return;
   refunded = true;
   await rollback();
  };

  return {
   ok: true,
   remaining: Math.max(0, uLimit - uCount),
   limit: uLimit,
   refund,
  };
 } catch {
  return { ok: true, remaining: 1, limit: SITE_AI_LIMITS[provider].userDaily, refund: async () => {} };
 }
}

export async function getSiteAiRemaining(
 req: Request,
 user: { id: string; is_guest: number },
 provider: SiteAiProvider = 'deepseek',
): Promise<{ remaining: number; limit: number }> {
 const isGuest = Boolean(user.is_guest);
 if (!isGuest) {
  const admin = await currentAdmin(req.headers).catch(() => null);
  if (admin) return { remaining: 999, limit: 999 };
 }
 const now = Date.now();
 const { dayKey } = beijingDayWindow(now);
 const spec = SITE_AI_LIMITS[provider];
 const limit = isGuest ? spec.guestDaily : spec.userDaily;
 const used = await readCount(userDayKey(provider, user.id, dayKey), now);
 return { remaining: Math.max(0, limit - used), limit };
}
