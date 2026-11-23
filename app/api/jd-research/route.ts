import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import {
 ANTIGRAVITY_AGENT_ID,
 AntigravityError,
 pollAntigravityInteraction,
 type AntigravityUsage,
} from '@/lib/antigravity-agent';
import { jdResearchStream } from '@/lib/gemini';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdResearchInput,
 getJdResearchSystemPrompt,
 parseAndEnrichJdReport,
} from '@/lib/jd-research-server';
import type { JdInputKind, JdResearchReport } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

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
 model?: string;
 usage?: AntigravityUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 source: string;
 model?: string;
 cacheKey?: string;
 report: JdResearchReport | null;
 rawText: string;
 thoughts: string;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

function draftTitle(source: string, kind: JdInputKind): string {
 const first =
  source
   .split('\n')
   .map(l => l.trim())
   .find(Boolean) || '';
 const clean = first.replace(/^(?:岗位|职位|标题|题目)[:：\s]*/, '').slice(0, 36);
 return clean || (kind === 'experience' ? '面经深度调研' : '岗位 JD 深度调研');
}

function makeSubtitle(rep: JdResearchReport | null): string {
 if (!rep) return '';
 return [rep.inferredLevel, rep.prepDays, rep.companyStyle].filter(Boolean).join(' · ').slice(0, 80);
}

// Streaming NDJSON endpoint powered by Gemini 4 Hydrogen (high thinking, auto-fallback to Gemini 3.8 Flash / DeepSeek).
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
  const geminiProxy = body.geminiProxy !== false;

  if (source.length < 20) throw new AuthError('请粘贴至少 20 字的岗位 JD 或面经内容。');

  const recordId = 'jdr-' + crypto.randomUUID();
  const cacheKey = 'jd4:' + (await sha256Hex([kind, source]));

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
   async start(controller) {
    const send = (ev: Record<string, unknown>) => {
     try {
      controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
     } catch {}
    };

    try {
     // 1. Check D1 deterministic cache first (silent fast return)
     const hit = await readPromptCache<CachedJdPayload>(cacheKey);
     if (hit?.payload?.report) {
      const rep = hit.payload.report;
      const model = hit.payload.model || hit.model || 'Gemini 4 Hydrogen（高）';
      const stored: StoredJdRecordPayload = {
       kind,
       source,
       model,
       cacheKey,
       report: rep,
       rawText: hit.payload.rawText || '',
       thoughts: hit.payload.thoughts || '',
      };
      await saveAiInterviewRecord({
       id: recordId,
       userId: user.id,
       kind: 'jd-research',
       title: rep.roleTitle || draftTitle(source, kind),
       subtitle: makeSubtitle(rep),
       status: 'completed',
       payload: stored,
      });
      send({
       type: 'done',
       recordId,
       model,
       report: rep,
       rawText: hit.payload.rawText || '',
       thoughts: hit.payload.thoughts || '',
      });
      controller.close();
      return;
     }

     send({ type: 'start', recordId });

     const res = await jdResearchStream(
      getJdResearchSystemPrompt(),
      buildJdResearchInput({ kind, source }),
      delta => send({ type: 'delta', text: delta }),
      () => send({ type: 'reset' }),
      {
       onThink: delta => send({ type: 'thought', text: delta }),
       onModel: model => send({ type: 'model', model }),
       geminiProxy,
       signal: req.signal,
      },
     );

     const report = parseAndEnrichJdReport(res.text);
     if (report) {
      await writePromptCache(
       cacheKey,
       'jd-research',
       res.model,
       { report, rawText: res.text, thoughts: res.thoughts, model: res.model } satisfies CachedJdPayload,
       7 * 24 * 3600_000,
      );
     }

     const stored: StoredJdRecordPayload = {
      kind,
      source,
      model: res.model,
      cacheKey,
      report,
      rawText: res.text,
      thoughts: res.thoughts,
     };
     await saveAiInterviewRecord({
      id: recordId,
      userId: user.id,
      kind: 'jd-research',
      title: report?.roleTitle || draftTitle(source, kind),
      subtitle: makeSubtitle(report),
      status: 'completed',
      payload: stored,
     });

     send({
      type: 'done',
      recordId,
      model: res.model,
      report,
      rawText: res.text,
      thoughts: res.thoughts,
     });
    } catch (e) {
     if (!req.signal.aborted) {
      const msg = e instanceof Error && e.message && !/^gemini:|^deepseek:/.test(e.message)
       ? e.message
       : '深度调研服务暂时不可用，请稍后重试。';
      send({ type: 'error', error: msg });
     }
    } finally {
     try {
      controller.close();
     } catch {}
    }
   },
  });

  return new Response(stream, {
   headers: {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
   },
  });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '深度调研服务暂时不可用，请重试。' }, { status: 503, headers: noCache });
 }
}

// Keep GET polling handler for backward compatibility with any pre-existing running records.
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
   if (report && ck.startsWith('jd') && ckSig) {
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

   if (rid) {
    const prev = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid);
    const merged: StoredJdRecordPayload = {
     kind: prev?.payload?.kind || 'jd',
     source: prev?.payload?.source || '',
     cacheKey: prev?.payload?.cacheKey || ck,
     report,
     rawText: polled.text,
     thoughts: polled.thoughts,
     imported: prev?.payload?.imported ?? null,
    };
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: report?.roleTitle || prev?.title || '深度调研报告',
     subtitle: makeSubtitle(report) || prev?.subtitle || '',
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
    },
    { headers: noCache },
   );
  }

  return Response.json(polled, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询调研进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
