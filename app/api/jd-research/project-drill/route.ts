import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { combineTokenUsage, prepareDeepModelExecution } from '@/lib/deep-model-route';
import { runSelectedDeepModelStream } from '@/lib/gemini';
import {
 buildJdProjectDrillInput,
 buildJdProjectDrillRegenQuizInput,
 createThinkJsonStreamSplitter,
 getJdProjectDrillRegenQuizSystemPrompt,
 getJdProjectDrillSystemPrompt,
 normalizeJdSourceForCache,
 parseJdProjectDrill,
 parseSingleStudyQuiz,
} from '@/lib/jd-research-server';
import type {
 AiTokenUsage,
 JdInputKind,
 JdProjectDrill,
 JdReferenceResume,
 JdResearchReport,
 JdResumeProject,
} from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

type CachedDrillPayload = {
 drill: JdProjectDrill;
 model: string;
 usage?: AiTokenUsage;
};

type CachedResumePayload = {
 resume: JdReferenceResume;
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AiTokenUsage;
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

async function computeProjHash(report: JdResearchReport, project: JdResumeProject): Promise<string> {
 return sha256Hex([
  report.roleTitle,
  project.name,
  project.role,
  project.background,
  project.actions.join('|'),
  project.results.join('|'),
 ]);
}

async function persistProjectDrill(opts: {
 rec: NonNullable<Awaited<ReturnType<typeof getAiInterviewRecord<StoredJdRecordPayload>>>>;
 userId: string;
 report: JdResearchReport;
 projIdx: number;
 drill: JdProjectDrill;
 projHash: string;
 modelLabel: string;
 addUsage?: AiTokenUsage;
}): Promise<JdResearchReport> {
 const resume = opts.report.resume!;
 const nextProjects = resume.projects.map((p, idx) =>
  idx === opts.projIdx ? { ...p, drill: opts.drill } : p,
 );
 const nextResume: JdReferenceResume = { ...resume, projects: nextProjects };
 const nextReport: JdResearchReport = { ...opts.report, resume: nextResume };
 const nextUsage = opts.addUsage
  ? combineTokenUsage(opts.rec.payload.usage, opts.addUsage)
  : opts.rec.payload.usage;

 const kind: JdInputKind = opts.rec.payload.kind || 'jd';
 const source = opts.rec.payload.source || '';
 const hashHex =
  opts.rec.payload.hashHex ||
  (await sha256Hex([kind, normalizeJdSourceForCache(source || opts.report.roleTitle)]));

 await saveAiInterviewRecord({
  id: opts.rec.id,
  userId: opts.userId,
  kind: 'jd-research',
  title: opts.rec.title,
  subtitle: opts.rec.subtitle,
  status: opts.rec.status,
  interactionId: opts.rec.interactionId || undefined,
  payload: {
   ...opts.rec.payload,
   hashHex,
   ...(opts.rec.payload.report ? { report: nextReport } : { partialReport: nextReport }),
   usage: nextUsage,
  },
  createdAt: opts.rec.createdAt,
 });

 await writePromptCache(
  `jd-proj-drill-v1:${opts.projHash}`,
  'jd-project-drill',
  opts.modelLabel,
  {
   drill: opts.drill,
   model: opts.modelLabel,
   usage: opts.addUsage,
  } satisfies CachedDrillPayload,
  7 * 24 * 3600_000,
 );

 const resumeKey = `jd-resume-v1:${hashHex}`;
 const existingResumeCache = await readPromptCache<CachedResumePayload>(resumeKey);
 if (existingResumeCache?.payload) {
  await writePromptCache(
   resumeKey,
   'jd-resume',
   existingResumeCache.payload.model || opts.modelLabel,
   {
    ...existingResumeCache.payload,
    resume: nextResume,
   } satisfies CachedResumePayload,
   7 * 24 * 3600_000,
  );
 }

 return nextReport;
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用项目深挖预判。', 401);
  if (user.is_guest) throw new AuthError('游客暂不支持项目深挖预判，请登录正式账号后使用。', 403);
  await rateLimit('jd-proj-drill:' + user.id, 30);

  let body: Record<string, unknown>;
  try {
   body = (await req.json()) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const projIdx = Number(body.projIdx);
  const mode = body.mode === 'regen-quiz' ? 'regen-quiz' : 'drill';
  const quizIdx = Number(body.quizIdx);
  const bypassCache = body.bypassCache === true;

  if (!recordId || !Number.isInteger(projIdx) || projIdx < 0) {
   throw new AuthError('缺少必要的项目定位参数。', 400);
  }

  const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
  const report = rec?.payload?.report || rec?.payload?.partialReport;
  const project = report?.resume?.projects?.[projIdx];
  if (!rec || !report || !project) {
   throw new AuthError('未找到对应的简历项目。', 404);
  }

  const projHash = await computeProjHash(report, project);

  if (mode === 'regen-quiz') {
   const currentDrill = project.drill;
   const oldQuiz =
    currentDrill && Number.isInteger(quizIdx) && quizIdx >= 0 ? currentDrill.quizzes[quizIdx] : undefined;
   if (!currentDrill || !oldQuiz) {
    throw new AuthError('未找到要重出的练习题。', 404);
   }

   const targetType = oldQuiz.type ?? 'single';
   const existingStems = currentDrill.quizzes.filter((_, i) => i !== quizIdx).map(q => q.q);
   const systemPrompt = getJdProjectDrillRegenQuizSystemPrompt();
   const userInput = buildJdProjectDrillRegenQuizInput({
    report,
    project,
    currentQuiz: oldQuiz,
    existingStems,
   });

   const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
   let out: Awaited<ReturnType<typeof runSelectedDeepModelStream>>;
   try {
    out = await runSelectedDeepModelStream({
     model: exec.model,
     thinkingLevel: exec.thinkingLevel,
     custom: exec.custom,
     systemPrompt,
     userInput,
     maxTokens: 6144,
     signal: req.signal,
     validate: txt => {
      const parsed = parseSingleStudyQuiz(txt, projIdx, quizIdx, oldQuiz.id, oldQuiz.dimension);
      return Boolean(parsed && (parsed.type ?? 'single') === targetType);
     },
    });
   } catch (err) {
    await exec.refund();
    throw err;
   }

   const nextQuiz = parseSingleStudyQuiz(out.text, projIdx, quizIdx, oldQuiz.id, oldQuiz.dimension);
   if (!nextQuiz) {
    await exec.refund();
    return Response.json({ error: '重出题目解析失败，请再试一次。' }, { status: 502, headers: noCache });
   }

   const nextDrill: JdProjectDrill = {
    ...currentDrill,
    quizzes: currentDrill.quizzes.map((q, idx) => (idx === quizIdx ? nextQuiz : q)),
    generatedAt: Date.now(),
    model: out.model,
   };

   const nextReport = await persistProjectDrill({
    rec,
    userId: user.id,
    report,
    projIdx,
    drill: nextDrill,
    projHash,
    modelLabel: out.model,
    addUsage: out.usage,
   });

   return Response.json(
    {
     ok: true,
     quiz: nextQuiz,
     drill: nextDrill,
     report: nextReport,
     model: out.model,
     usage: out.usage,
    },
    { headers: noCache },
   );
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
     send({ type: 'connected', recordId, projIdx });

     let drill: JdProjectDrill | null = null;
     let modelLabel = 'DeepSeek V4.1 Flash（深度思考）';
     let usedUsage: AiTokenUsage | undefined;
     let cachedHit = false;

     if (!bypassCache) {
      if (project.drill && project.drill.lessons.length > 0 && project.drill.quizzes.length > 0) {
       drill = project.drill;
       modelLabel = project.drill.model || modelLabel;
       cachedHit = true;
      } else {
       const hit = await readPromptCache<CachedDrillPayload>(`jd-proj-drill-v1:${projHash}`);
       if (
        hit?.payload?.drill &&
        hit.payload.drill.lessons?.length > 0 &&
        hit.payload.drill.quizzes?.length > 0
       ) {
        drill = hit.payload.drill;
        modelLabel = hit.payload.model || hit.model || modelLabel;
        cachedHit = true;
       }
      }
     }

     if (!drill) {
      const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
      modelLabel = exec.displayLabel;
      send({ type: 'status', model: exec.displayLabel });

      const kind: JdInputKind = rec.payload.kind || 'jd';
      const source = rec.payload.source || '';
      const systemPrompt = getJdProjectDrillSystemPrompt();
      const userInput = buildJdProjectDrillInput({ kind, source, report, project, projIdx });

      const splitter = createThinkJsonStreamSplitter({
       onThoughtDelta: td => send({ type: 'thought', text: td }),
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
        validate: txt => Boolean(parseJdProjectDrill(txt, projIdx)),
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

      const parsed = parseJdProjectDrill(out.text, projIdx);
      if (!parsed) {
       await exec.refund();
       send({ type: 'error', error: '项目深挖预判解析失败，请再试一次。' });
       return;
      }

      modelLabel = out.model;
      usedUsage = out.usage;
      drill = {
       ...parsed,
       generatedAt: Date.now(),
       model: modelLabel,
      };
     }

     const nextReport = await persistProjectDrill({
      rec,
      userId: user.id,
      report,
      projIdx,
      drill,
      projHash,
      modelLabel,
      addUsage: cachedHit ? undefined : usedUsage,
     });

     send({
      type: 'done',
      ok: true,
      cached: cachedHit,
      drill,
      report: nextReport,
      usage: cachedHit ? rec.payload.usage : combineTokenUsage(rec.payload.usage, usedUsage),
      model: modelLabel,
     });
    } catch (e) {
     if (!req.signal?.aborted) {
      const msg =
       e instanceof AuthError
        ? e.message
        : e instanceof Error && e.message
          ? e.message
          : '项目深挖预判失败，请稍后重试。';
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
  return Response.json({ error: '项目深挖服务暂时不可用，请重试。' }, { status: 502, headers: noCache });
 }
}
