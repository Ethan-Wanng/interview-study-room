import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import {
 ANTIGRAVITY_AGENT_ID,
 AntigravityError,
 pollAntigravityInteraction,
 startAntigravityInteraction,
 type AntigravityUsage,
} from '@/lib/antigravity-agent';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdResearchInput,
 getJdResearchSystemPrompt,
 parseAndEnrichJdReport,
} from '@/lib/jd-research-server';
import type { JdInputKind, JdPrepDays, JdResearchReport, JdSeniority } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

const ALLOWED_DAYS = new Set<JdPrepDays>([3, 7, 14, 30]);
const ALLOWED_COUNTS = new Set([8, 10, 12]);

function signingSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.GEMINI_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-jd-sig').slice(0, 48);
}

async function signToken(userId: string, token: string): Promise<string> {
 return (await sha256Hex([signingSecret(), 'jd', userId, token])).slice(0, 32);
}

type CachedJdPayload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 usage?: AntigravityUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 days: JdPrepDays;
 level: JdSeniority;
 questionCount: number;
 source: string;
 cacheKey?: string;
 report: JdResearchReport | null;
 rawText: string;
 thoughts: string;
 cached?: boolean;
 usage?: AntigravityUsage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

function draftTitle(source: string, kind: JdInputKind): string {
 const first = source
  .split('\n')
  .map(l => l.trim())
  .find(Boolean) || '';
 const clean = first.replace(/^(?:岗位|职位|标题|题目)[:：\s]*/, '').slice(0, 36);
 return clean || (kind === 'experience' ? '面经深度调研' : '岗位 JD 深度调研');
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用 JD / 面经调研。', 401);
  await rateLimit('jd-research:' + user.id, 25);

  const raw = await req.text();
  if (raw.length > 36_000) throw new AuthError('输入内容过长，请精简后再提交。');
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
  const source = typeof body.source === 'string' ? body.source.replace(/\r\n/g, '\n').trim().slice(0, 14_000) : '';
  const daysRaw = Number(body.days) as JdPrepDays;
  const days: JdPrepDays = ALLOWED_DAYS.has(daysRaw) ? daysRaw : 7;
  const level: JdSeniority = body.level === 'junior' || body.level === 'senior' ? body.level : 'mid';
  const countRaw = Number(body.questionCount);
  const questionCount = ALLOWED_COUNTS.has(countRaw) ? countRaw : 10;
  const geminiProxy = body.geminiProxy !== false;

  if (source.length < 20) throw new AuthError('请粘贴至少 20 字的岗位 JD 或面经内容。');

  const recordId = 'jdr-' + crypto.randomUUID();
  const cacheKey = 'jd:' + (await sha256Hex([kind, String(days), level, String(questionCount), source]));
  const hit = await readPromptCache<CachedJdPayload>(cacheKey);
  if (hit?.payload?.report) {
   const rep = hit.payload.report;
   const stored: StoredJdRecordPayload = {
    kind,
    days,
    level,
    questionCount,
    source,
    cacheKey,
    report: rep,
    rawText: hit.payload.rawText || '',
    thoughts: hit.payload.thoughts || '',
    cached: true,
    usage: hit.payload.usage,
   };
   await saveAiInterviewRecord({
    id: recordId,
    userId: user.id,
    kind: 'jd-research',
    title: rep.roleTitle || draftTitle(source, kind),
    subtitle: rep.companyStyle || '',
    status: 'completed',
    payload: stored,
   });
   return Response.json(
    {
     recordId,
     status: 'completed',
     cached: true,
     report: rep,
     rawText: hit.payload.rawText || '',
     thoughts: hit.payload.thoughts || '',
     usage: hit.payload.usage,
    },
    { headers: noCache },
   );
  }

  const started = await startAntigravityInteraction({
   systemInstruction: getJdResearchSystemPrompt(),
   input: buildJdResearchInput({ kind, source, days, level, questionCount }),
   geminiProxy,
  });

  const sig = await signToken(user.id, started.id);
  const ckSig = await signToken(user.id, cacheKey);

  // Immediately persist running task to D1 so closing/leaving the page NEVER discards it!
  const pendingPayload: StoredJdRecordPayload = {
   kind,
   days,
   level,
   questionCount,
   source,
   cacheKey,
   report: null,
   rawText: '',
   thoughts: '',
  };
  await saveAiInterviewRecord({
   id: recordId,
   userId: user.id,
   kind: 'jd-research',
   title: draftTitle(source, kind),
   subtitle: `${days} 天 · ${questionCount} 题`,
   status: 'running',
   interactionId: started.id,
   payload: pendingPayload,
  });

  return Response.json(
   {
    recordId,
    id: started.id,
    sig,
    status: started.status,
    cacheKey,
    ckSig,
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '深度调研服务暂时不可用，请重试。' }, { status: 503, headers: noCache });
 }
}

export async function GET(req: Request) {
 try {
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);

  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const sig = (url.searchParams.get('sig') || '').trim();
  const ck = (url.searchParams.get('ck') || '').trim();
  const ckSig = (url.searchParams.get('ckSig') || '').trim();
  const rid = (url.searchParams.get('rid') || '').trim();
  const geminiProxy = url.searchParams.get('geminiProxy') !== '0';

  if (!id || !sig || id.length > 160) throw new AuthError('缺少任务标识。', 400);
  const expected = await signToken(user.id, id);
  if (sig !== expected) throw new AuthError('无权查询该调研任务。', 403);

  const polled = await pollAntigravityInteraction({ interactionId: id, geminiProxy });
  if (polled.status === 'completed') {
   const report = parseAndEnrichJdReport(polled.text);
   if (report && ck.startsWith('jd:') && ckSig) {
    const expectedCk = await signToken(user.id, ck);
    if (ckSig === expectedCk) {
     await writePromptCache(
      ck,
      'jd-research',
      ANTIGRAVITY_AGENT_ID,
      { report, rawText: polled.text, thoughts: polled.thoughts, usage: polled.usage } satisfies CachedJdPayload,
      7 * 24 * 3600_000,
     );
    }
   }

   // Persist finished result directly into the user's D1 history record (even on fallback Markdown!)
   if (rid) {
    const prev = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid);
    const merged: StoredJdRecordPayload = {
     kind: prev?.payload?.kind || 'jd',
     days: prev?.payload?.days || 7,
     level: prev?.payload?.level || 'mid',
     questionCount: prev?.payload?.questionCount || 10,
     source: prev?.payload?.source || '',
     cacheKey: prev?.payload?.cacheKey || ck,
     report,
     rawText: polled.text,
     thoughts: polled.thoughts,
     cached: false,
     usage: polled.usage,
     imported: prev?.payload?.imported ?? null,
    };
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: report?.roleTitle || prev?.title || '深度调研报告',
     subtitle: report?.companyStyle || prev?.subtitle || '',
     status: 'completed',
     interactionId: id,
     payload: merged,
     createdAt: prev?.createdAt,
    });
   }

   return Response.json(
    {
     id: polled.id,
     recordId: rid || undefined,
     status: 'completed',
     report,
     rawText: polled.text,
     thoughts: polled.thoughts,
     usage: polled.usage,
    },
    { headers: noCache },
   );
  }

  if ((polled.status === 'failed' || polled.status === 'cancelled') && rid) {
   const prev = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid);
   if (prev) {
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: prev.title,
     subtitle: prev.subtitle,
     status: 'error',
     interactionId: id,
     payload: { ...prev.payload, error: polled.error || '调研任务中断' },
     createdAt: prev.createdAt,
    });
   }
  }

  return Response.json(polled, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询调研进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
