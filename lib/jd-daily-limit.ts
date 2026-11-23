// Daily JD / Interview Experience research generation quota:
// - Regular logged-in users: 1 generation per Beijing calendar day (UTC+8).
// - Administrators: unlimited.
// - Guests: blocked at page and API level.
// Uses atomic D1 counters in `auth_limits` so deleting a generated record cannot bypass the daily limit,
// while failed/aborted generations automatically refund the reserved slot.

import { studyDb } from '@/db/study';
import { hashToken } from './site-auth';

const CN_OFFSET_MS = 8 * 3600_000;
const DAY_MS = 24 * 3600_000;

export function beijingDayWindow(now = Date.now()): { dayKey: string; resetAtMs: number } {
 const cnNow = now + CN_OFFSET_MS;
 const dayKey = new Date(cnNow).toISOString().slice(0, 10);
 const nextCnMidnight = (Math.floor(cnNow / DAY_MS) + 1) * DAY_MS;
 return { dayKey, resetAtMs: nextCnMidnight - CN_OFFSET_MS };
}

function dailyKey(userId: string, dayKey: string): string {
 return hashToken(`jd-daily-v1:${userId}:${dayKey}`);
}

export async function tryConsumeDailyJdQuota(userId: string): Promise<{ allowed: boolean; dayKey: string }> {
 const now = Date.now();
 const { dayKey, resetAtMs } = beijingDayWindow(now);
 const key = dailyKey(userId, dayKey);
 const row = await studyDb()
  .prepare(
   `INSERT INTO auth_limits(key, count, reset_at) VALUES(?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
    RETURNING count`,
  )
  .bind(key, resetAtMs, now, now)
  .first<{ count: number }>();

 if (!row || row.count > 1) {
  await studyDb()
   .prepare('UPDATE auth_limits SET count = CASE WHEN count > 1 THEN count - 1 ELSE count END WHERE key = ?')
   .bind(key)
   .run()
   .catch(() => {});
  return { allowed: false, dayKey };
 }
 return { allowed: true, dayKey };
}

export async function refundDailyJdQuota(userId: string, dayKey: string): Promise<void> {
 const key = dailyKey(userId, dayKey);
 await studyDb()
  .prepare('UPDATE auth_limits SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END WHERE key = ?')
  .bind(key)
  .run()
  .catch(() => {});
}

export async function getDailyJdUsed(userId: string): Promise<number> {
 const now = Date.now();
 const { dayKey } = beijingDayWindow(now);
 const key = dailyKey(userId, dayKey);
 const row = await studyDb()
  .prepare('SELECT count, reset_at FROM auth_limits WHERE key = ?')
  .bind(key)
  .first<{ count: number; reset_at: number }>();
 if (!row || row.reset_at <= now) return 0;
 return Math.max(0, Number(row.count) || 0);
}
