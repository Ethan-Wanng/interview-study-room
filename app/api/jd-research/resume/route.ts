import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { combineTokenUsage, prepareDeepModelExecution } from '@/lib/deep-model-route';
import { runSelectedDeepModelStream } from '@/lib/gemini';
import {
 buildJdResumeInput,
 createThinkJsonStreamSplitter,
 extractThoughtsAndJson,
 getJdResumeSystemPrompt,
 normalizeJdSourceForCache,
 parseJdReferenceResume,
} from '@/lib/jd-research-server';
import type { AiTokenUsage, JdInputKind, JdReferenceResume, JdResearchReport } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

type CachedResumePayload = {
 resume: JdReferenceResume;
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
 partialReport?: JdResearchReport | null;
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
  if (!user) throw new AuthError('请先登录后再生成参考简历。', 401);
  if (user.is_guest) throw new AuthError('游客暂不支持生成参考简历，请登录正式账号后使用。', 403);
  await rateLimit('jd-resume:' + user.id, 20);

  let body: Record<string, unknown>;
  try {
   body = (await req.json()) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const bypassCache = body.bypassCache === true;

  if (!recordId) {
   throw new AuthError('缺少必要的调研记录 ID。', 400);
  }

  const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
  const report = rec?.payload?.report || rec?.payload?.partialReport;
  if (!rec || !report) {
   throw new AuthError('未找到对应的 JD 调研报告。', 404);
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
     send({ type: 'connected', recordId });

     const kind: JdInputKind = rec.payload.kind || 'jd';
     const source = rec.payload.source || '';
     const hashHex =
      rec.payload.hashHex ||
      (await sha256Hex([kind, normalizeJdSourceForCache(source || report.roleTitle)]));
     const resumeKey = `jd-resume-v1:${hashHex}`;

     let resume: JdReferenceResume | null = null;
     let modelLabel = 'DeepSeek V4.1 Flash（深度思考）';
     let usedUsage: AiTokenUsage | undefined;
     let cachedHit = false;

     if (!bypassCache) {
      const hit = await readPromptCache<CachedResumePayload>(resumeKey);
      if (hit?.payload?.resume && hit.payload.resume.projects?.length > 0) {
       resume = hit.payload.resume;
       modelLabel = hit.payload.model || hit.model || modelLabel;
       cachedHit = true;
      }
     }

     if (!resume) {
      const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
      modelLabel = exec.displayLabel;
      send({ type: 'status', model: exec.displayLabel });

      const systemPrompt = getJdResumeSystemPrompt();
      const userInput = buildJdResumeInput({ kind, source, report });
      const validate = (txt: string) => Boolean(parseJdReferenceResume(txt, report.roleTitle));

      const splitter = createThinkJsonStreamSplitter({
       onThoughtDelta: td => {
        send({ type: 'thought', text: td });
       },
       onJsonDelta: jd => {
        if (jd) send({ type: 'delta', text: jd });
       },
      });

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
        onThoughtDelta: td => send({ type: 'thought', text: td }),
        onTextDelta: td => splitter.push(td),
        onReset: () => send({ type: 'reset' }),
       });
       splitter.flush();
      } catch (err) {
       await exec.refund();
       throw err;
      }

      const parsed = parseJdReferenceResume(out.text, report.roleTitle);
      if (!parsed) {
       await exec.refund();
       send({ type: 'error', error: '参考简历解析失败，请再试一次。' });
       return;
      }
      resume = parsed;
      modelLabel = out.model;
      usedUsage = out.usage;

      if (!exec.custom) {
       const extracted = extractThoughtsAndJson(out.text);
       await writePromptCache(
        resumeKey,
        'jd-resume',
        modelLabel,
        {
         resume,
         rawText: extracted.jsonRaw || out.text,
         thoughts: (out.thoughts || extracted.thoughts || '').trim(),
         model: modelLabel,
         usage: out.usage,
        } satisfies CachedResumePayload,
        7 * 24 * 3600_000,
       );
      }
     }

     const nextReport: JdResearchReport = {
      ...report,
      resume,
     };
     const nextUsage = cachedHit ? rec.payload.usage : combineTokenUsage(rec.payload.usage, usedUsage);

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
       hashHex,
       ...(rec.payload.report ? { report: nextReport } : { partialReport: nextReport }),
       usage: nextUsage,
      },
      createdAt: rec.createdAt,
     });

     const allPhasesDone = nextReport.roadmap.every(s => (s.quizzes?.length ?? 0) >= 4);
     if (rec.status === 'completed' && allPhasesDone && nextReport.questions.length > 0) {
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
      cached: cachedHit,
      resume,
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
          : '参考简历生成失败，请稍后重试。';
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
  return Response.json({ error: '参考简历服务暂时不可用，请重试。' }, { status: 502, headers: noCache });
 }
}
