import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, sessionUser } from '@/lib/site-auth';
import {
 deleteAiInterviewRecord,
 getAiInterviewRecord,
 listAiInterviewRecords,
 saveAiInterviewRecord,
 type AiInterviewKind,
 type AiInterviewStatus,
} from '@/lib/ai-interview-records';
import { sha256Hex } from '@/lib/prompt-cache';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

function jdSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.DEEPSEEK_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-jd-sig').slice(0, 48);
}

function archSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.DEEPSEEK_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-arch-sig').slice(0, 48);
}

async function signResumeToken(kind: AiInterviewKind, userId: string, token: string): Promise<string> {
 if (!token) return '';
 if (kind === 'jd-research') {
  return (await sha256Hex([jdSecret(), 'jd', userId, token])).slice(0, 32);
 }
 return (await sha256Hex([archSecret(), userId, token])).slice(0, 32);
}

export async function GET(req: Request) {
 try {
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);
  const url = new URL(req.url);
  const kind: AiInterviewKind = url.searchParams.get('kind') === 'architect' ? 'architect' : 'jd-research';
  if (user.is_guest && kind === 'jd-research') {
   throw new AuthError('游客不支持 JD / 面经深度调研功能，请登录正式账号。', 403);
  }
  const rows = await listAiInterviewRecords<Record<string, unknown>>(user.id, kind);
  // Attach fresh HMAC signatures so the client can seamlessly resume polling or follow-ups after reload!
  const items = await Promise.all(
   rows.map(async r => {
    const sig = r.interactionId ? await signResumeToken(kind, user.id, r.interactionId) : '';
    const ck = typeof r.payload?.cacheKey === 'string' ? r.payload.cacheKey : '';
    const ckSig = ck ? await signResumeToken(kind, user.id, ck) : '';
    return { ...r, sig, ckSig };
   }),
  );
  return Response.json({ items }, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '读取历史记录失败。' }, { status: 503, headers: noCache });
 }
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);

  const raw = await req.text();
  if (raw.length > 360_000) throw new AuthError('数据过大。', 413);
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const kind: AiInterviewKind = body.kind === 'architect' ? 'architect' : 'jd-research';
  if (user.is_guest && kind === 'jd-research') {
   throw new AuthError('游客不支持 JD / 面经深度调研功能，请登录正式账号。', 403);
  }
  const id = typeof body.id === 'string' ? body.id.trim().slice(0, 80) : '';
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 80) : '';
  const status: AiInterviewStatus =
   body.status === 'running' || body.status === 'error' ? body.status : 'completed';
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : null;

  if (!id || !payload) throw new AuthError('缺少记录内容。');

  // If updating imported state or renaming on an existing record, merge cleanly
  const existing = await getAiInterviewRecord(user.id, id);
  const mergedPayload: Record<string, unknown> =
   existing && body.patch
    ? { ...existing.payload, ...(payload as Record<string, unknown>) }
    : (payload as Record<string, unknown>);
  if (title && mergedPayload.report && typeof mergedPayload.report === 'object') {
   mergedPayload.report = { ...(mergedPayload.report as Record<string, unknown>), roleTitle: title };
  }

  const ok = await saveAiInterviewRecord({
   id,
   userId: user.id,
   kind,
   title: title || existing?.title || '未命名记录',
   subtitle: subtitle || existing?.subtitle || '',
   status: body.patch && existing ? existing.status : status,
   interactionId: existing?.interactionId || '',
   payload: mergedPayload,
   createdAt: existing?.createdAt,
  });
  if (!ok) throw new AuthError('保存记录失败。', 503);

  return Response.json({ ok: true, id }, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '保存记录失败。' }, { status: 503, headers: noCache });
 }
}

export async function DELETE(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) throw new AuthError('缺少记录 ID。', 400);
  await deleteAiInterviewRecord(user.id, id);
  return Response.json({ ok: true }, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '删除记录失败。' }, { status: 503, headers: noCache });
 }
}
