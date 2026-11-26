import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { combineTokenUsage, prepareDeepModelExecution } from '@/lib/deep-model-route';
import { runSelectedDeepModelStream } from '@/lib/gemini';
import {
 buildJdPhaseQuizzesInput,
 combinePhaseQuizzes,
 getJdResearchPhaseQuizzesSystemPrompt,
 getReusedQuizzesForPhase,
 normalizeJdSourceForCache,
 parsePhaseQuizzes,
} from '@/lib/jd-research-server';
import type { AiQuiz } from '@/content/journey';
import type { AiTokenUsage, JdInputKind, JdResearchReport } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

type CachedPhasePayload = {
 quizzes: AiQuiz[];
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AiTokenUsage;
};

type CachedJdPayload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 model?: string;
 usage?: AiTokenUsage;
 durationMs?: number;
};

type StoredJdRecordPayload = {
 kind?: JdInputKind;
 source?: string;
 hashHex?: string;
 pipeline?: string;
 startedAt?: number;
 durationMs?: number;
 model?: string;
 cacheKey?: string;
 stage1CacheKey?: string;
 stage?: 1 | 2;
 cached?: boolean;
 stage1Cached?: boolean;
 report: JdResearchReport | null;
 rawText?: string;
 thoughts?: string;
 usage?: AiTokenUsage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再补全题目。', 401);
  if (user.is_guest) throw new AuthError('游客暂不支持补全题目，请登录后使用。', 403);
  await rateLimit('jd-fill-phase:' + user.id, 30);

  let body: Record<string, unknown>;
  try {
   body = (await req.json()) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const stepIdx = Number(body.stepIdx);

  if (!recordId || !Number.isInteger(stepIdx) || stepIdx < 0) {
   throw new AuthError('缺少必要的路径阶段定位参数。', 400);
  }

  const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
  const report = rec?.payload?.report;
  const step = report?.roadmap?.[stepIdx];
  if (!rec || !report || !step) {
   throw new AuthError('未找到对应的专题路径阶段。', 404);
  }

  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
   async start(controller) {
    let lastSendAt = Date.now();
    const send = (ev: Record<string, unknown>) => {
     if (closed) return;
     lastSendAt = Date.now();
     try {
      controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
     } catch {
      closed = true;
     }
    };

    const pingTimer = setInterval(() => {
     if (closed) return;
     if (Date.now() - lastSendAt >= 2400) {
      send({ type: 'ping' });
     }
    }, 2500);

    try {
     send({ type: 'connected', recordId, stepIdx });

     const kind: JdInputKind = rec.payload.kind || 'jd';
     const source = rec.payload.source || '';
     const hashHex =
      rec.payload.hashHex ||
      (source ? await sha256Hex([kind, normalizeJdSourceForCache(source)]) : '');
     const phaseKey = hashHex ? `jd-p-v3:${hashHex}:${stepIdx}` : '';
     const reusedQuizzes = getReusedQuizzesForPhase(report, stepIdx);

     let quizzes: AiQuiz[] | null = null;
     let modelLabel = 'DeepSeek V4.1 Flash（深度思考）';
     let usedUsage: AiTokenUsage | undefined;

     if (phaseKey) {
      const hit = await readPromptCache<CachedPhasePayload>(phaseKey);
      if (hit?.payload?.quizzes && hit.payload.quizzes.length >= 4) {
       quizzes = hit.payload.quizzes;
       modelLabel = hit.payload.model || hit.model || modelLabel;
       usedUsage = hit.payload.usage;
      }
     }

     if (!quizzes) {
      const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
      modelLabel = exec.displayLabel;
      send({ type: 'status', model: exec.displayLabel });

      const systemPrompt = getJdResearchPhaseQuizzesSystemPrompt();
      const userInput = buildJdPhaseQuizzesInput({
       kind,
       source,
       stage1: report,
       phaseIndex: stepIdx,
       reusedQuizzes,
      });
      const validate = (txt: string) => parsePhaseQuizzes(txt, stepIdx).length >= 4;

      let out: Awaited<ReturnType<typeof runSelectedDeepModelStream>>;
      try {
       out = await runSelectedDeepModelStream({
        model: exec.model,
        thinkingLevel: exec.thinkingLevel,
        custom: exec.custom,
        systemPrompt,
        userInput,
        maxTokens: 12288,
        signal: req.signal,
        validate,
        onModel: m => send({ type: 'status', model: m }),
       });
      } catch (err) {
       await exec.refund();
       throw err;
      }

      const generated = parsePhaseQuizzes(out.text, stepIdx);
      quizzes = combinePhaseQuizzes(reusedQuizzes, generated, stepIdx);
      modelLabel = out.model;
      usedUsage = out.usage;

      if (phaseKey && !exec.custom && quizzes.length >= 4) {
       await writePromptCache(
        phaseKey,
        'jd-phase',
        modelLabel,
        {
         quizzes,
         rawText: out.text,
         thoughts: out.thoughts,
         model: modelLabel,
         usage: out.usage,
        } satisfies CachedPhasePayload,
        7 * 24 * 3600_000,
       );
      }
     }

     if (!quizzes.length) {
      send({ type: 'error', error: '补题输出解析失败，请再试一次。' });
      return;
     }

     const nextReport: JdResearchReport = {
      ...report,
      roadmap: report.roadmap.map((s, idx) => (idx === stepIdx ? { ...s, quizzes } : s)),
     };
     const nextUsage = combineTokenUsage(rec.payload.usage, usedUsage);

     await saveAiInterviewRecord({
      id: rec.id,
      userId: user.id,
      kind: 'jd-research',
      title: rec.title,
      subtitle: rec.subtitle,
      status: rec.status,
      interactionId: rec.interactionId || undefined,
      payload: {
       ...rec.payload,
       hashHex: hashHex || rec.payload.hashHex,
       report: nextReport,
       usage: nextUsage,
      },
      createdAt: rec.createdAt,
     });

     const allPhasesDone = nextReport.roadmap.every(s => (s.quizzes?.length ?? 0) >= 4);
     if (hashHex && allPhasesDone && nextReport.questions.length > 0) {
      const fullKey = rec.payload.cacheKey || `jd-auto-v3:${hashHex}`;
      await writePromptCache(
       fullKey,
       'jd-research',
       rec.payload.model || modelLabel,
       {
        report: nextReport,
        rawText: rec.payload.rawText || '',
        thoughts: rec.payload.thoughts || '',
        model: rec.payload.model || modelLabel,
        usage: nextUsage,
        durationMs: rec.payload.durationMs,
       } satisfies CachedJdPayload,
       7 * 24 * 3600_000,
      );
     }

     send({
      type: 'done',
      ok: true,
      stepIdx,
      quizzes,
      report: nextReport,
      usage: nextUsage,
      model: modelLabel,
     });
    } catch (e) {
     if (!req.signal?.aborted) {
      const msg =
       e instanceof AuthError
        ? e.message
        : e instanceof Error && e.message
          ? e.message
          : '补题失败，请稍后重试。';
      send({ type: 'error', error: msg });
     }
    } finally {
     clearInterval(pingTimer);
     if (!closed) {
      closed = true;
      try {
       controller.close();
      } catch {}
     }
    }
   },
   cancel() {
    closed = true;
   },
  });

  return new Response(stream, {
   headers: {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
   },
  });
 } catch (e) {
  if (e instanceof AuthError) {
   return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  }
  return Response.json({ error: '补题服务暂时不可用，请重试。' }, { status: 502, headers: noCache });
 }
}
