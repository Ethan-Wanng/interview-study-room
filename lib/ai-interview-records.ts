// Persistent D1 storage for AI Interview Lab outputs (`jd-research` & `architect`).
// Ensures generated reports, study roadmaps, topic question banks, multi-turn mock interviews,
// and even in-progress background tasks survive page navigation, refreshes, and device switches.

import { studyDb } from '@/db/study';

export type AiInterviewKind = 'jd-research' | 'architect';
export type AiInterviewStatus = 'running' | 'completed' | 'error';

export type AiInterviewRecordRow<T = Record<string, unknown>> = {
 id: string;
 userId: string;
 kind: AiInterviewKind;
 title: string;
 subtitle: string;
 status: AiInterviewStatus;
 interactionId: string;
 payload: T;
 createdAt: number;
 updatedAt: number;
};

type DbRow = {
 id: string;
 user_id: string;
 kind: string;
 title: string;
 subtitle: string;
 status: string;
 interaction_id: string;
 payload: string;
 created_at: number;
 updated_at: number;
};

const MAX_RECORDS_PER_KIND = 30;
const MAX_PAYLOAD_BYTES = 190_000;

function parseRow<T>(r: DbRow): AiInterviewRecordRow<T> | null {
 try {
  return {
   id: r.id,
   userId: r.user_id,
   kind: r.kind === 'architect' ? 'architect' : 'jd-research',
   title: r.title,
   subtitle: r.subtitle || '',
   status: r.status === 'running' || r.status === 'error' ? r.status : 'completed',
   interactionId: r.interaction_id || '',
   payload: JSON.parse(r.payload) as T,
   createdAt: Number(r.created_at) || 0,
   updatedAt: Number(r.updated_at) || 0,
  };
 } catch {
  return null;
 }
}

export async function listAiInterviewRecords<T = Record<string, unknown>>(
 userId: string,
 kind: AiInterviewKind,
): Promise<AiInterviewRecordRow<T>[]> {
 try {
  const res = await studyDb()
   .prepare(
    `SELECT id, user_id, kind, title, subtitle, status, interaction_id, payload, created_at, updated_at
     FROM ai_interview_records
     WHERE user_id = ? AND kind = ?
     ORDER BY updated_at DESC
     LIMIT ?`,
   )
   .bind(userId, kind, MAX_RECORDS_PER_KIND)
   .all<DbRow>();
  return res.results.map(r => parseRow<T>(r)).filter((x): x is AiInterviewRecordRow<T> => x !== null);
 } catch {
  return [];
 }
}

export async function getAiInterviewRecord<T = Record<string, unknown>>(
 userId: string,
 id: string,
): Promise<AiInterviewRecordRow<T> | null> {
 try {
  const row = await studyDb()
   .prepare(
    `SELECT id, user_id, kind, title, subtitle, status, interaction_id, payload, created_at, updated_at
     FROM ai_interview_records
     WHERE id = ? AND user_id = ?`,
   )
   .bind(id, userId)
   .first<DbRow>();
  return row ? parseRow<T>(row) : null;
 } catch {
  return null;
 }
}

export async function saveAiInterviewRecord(rec: {
 id: string;
 userId: string;
 kind: AiInterviewKind;
 title: string;
 subtitle?: string;
 status: AiInterviewStatus;
 interactionId?: string;
 payload: unknown;
 createdAt?: number;
}): Promise<boolean> {
 const json = JSON.stringify(rec.payload);
 if (json.length > MAX_PAYLOAD_BYTES) return false;
 const now = Date.now();
 const created = rec.createdAt || now;
 const title = (rec.title || '未命名记录').trim().slice(0, 120);
 const subtitle = (rec.subtitle || '').trim().slice(0, 80);
 const interactionId = (rec.interactionId || '').trim().slice(0, 180);

 try {
  const db = studyDb();
  await db
   .prepare(
    `INSERT INTO ai_interview_records(id, user_id, kind, title, subtitle, status, interaction_id, payload, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       subtitle = excluded.subtitle,
       status = excluded.status,
       interaction_id = CASE WHEN excluded.interaction_id <> '' THEN excluded.interaction_id ELSE ai_interview_records.interaction_id END,
       payload = excluded.payload,
       updated_at = excluded.updated_at
     WHERE ai_interview_records.user_id = excluded.user_id`,
   )
   .bind(rec.id, rec.userId, rec.kind, title, subtitle, rec.status, interactionId, json, created, now)
   .run();

  // Cap stored records per user+kind cleanly
  await db
   .prepare(
    `DELETE FROM ai_interview_records
     WHERE user_id = ? AND kind = ? AND id NOT IN (
       SELECT id FROM ai_interview_records
       WHERE user_id = ? AND kind = ?
       ORDER BY updated_at DESC
       LIMIT ?
     )`,
   )
   .bind(rec.userId, rec.kind, rec.userId, rec.kind, MAX_RECORDS_PER_KIND)
   .run()
   .catch(() => {});

  return true;
 } catch {
  return false;
 }
}

export async function deleteAiInterviewRecord(userId: string, id: string): Promise<void> {
 try {
  await studyDb()
   .prepare('DELETE FROM ai_interview_records WHERE id = ? AND user_id = ?')
   .bind(id, userId)
   .run();
 } catch {}
}
