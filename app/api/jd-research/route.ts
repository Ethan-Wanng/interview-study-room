import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { currentAdmin } from '@/lib/admin-auth';
import { beijingDayWindow, refundDailyJdQuota, tryConsumeDailyJdQuota } from '@/lib/jd-daily-limit';
import {
 ANTIGRAVITY_AGENT_ID,
 ANTIGRAVITY_MODEL_CHAIN,
 AntigravityError,
 antigravityModelLabel,
 pollAntigravityInteraction,
 startAntigravityInteraction,
 streamAntigravitySlice,
 type AntigravityUsage,
} from '@/lib/antigravity-agent';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdPhaseQuizzesInput,
 buildJdStage1Input,
 buildJdStage2Input,
 buildJdStage2QuestionsInput,
 combinePhaseQuizzes,
 createThinkJsonStreamSplitter,
 extractThoughtsAndJson,
 getJdResearchPhaseQuizzesSystemPrompt,
 getJdResearchStage1SystemPrompt,
 getJdResearchStage2QuestionsSystemPrompt,
 getJdResearchStage2SystemPrompt,
 inspectJdStreamProgress,
 mergeStage1AndStage2Report,
 normalizeJdSourceForCache,
 parseAndEnrichJdReport,
 parsePhaseQuizzes,
 pickInSiteQuizzesForStage,
} from '@/lib/jd-research-server';
import { extractJdFromImages } from '@/lib/gemini';
import { fetchJdTextFromUrl } from '@/lib/jd-extract';
import type { AiQuiz } from '@/content/journey';
import {
 hasStructuredStudyQuizzes,
 type JdInputKind,
 type JdQuestionItem,
 type JdResearchReport,
} from '@/lib/jd-research-types';

const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

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

type CachedStage1Payload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 model?: string;
 usage?: AntigravityUsage;
};

type CachedPhasePayload = {
 quizzes: AiQuiz[];
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AntigravityUsage;
};

type CachedQuestionsPayload = {
 questions: JdQuestionItem[];
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AntigravityUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 source: string;
 hashHex?: string;
 dailyDayKey?: string;
 dailyRefunded?: boolean;
 model?: string;
 cacheKey?: string;
 stage1CacheKey?: string;
 stage?: 1 | 2;
 cached?: boolean;
 stage1Cached?: boolean;
 partialReport?: JdResearchReport | null;
 stage1RawText?: string;
 stage1Thoughts?: string;
 stage1Usage?: AntigravityUsage;
 report: JdResearchReport | null;
 rawText: string;
 thoughts: string;
 usage?: AntigravityUsage;
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

function combineUsage(a?: AntigravityUsage, b?: AntigravityUsage): AntigravityUsage | undefined {
 if (!a && !b) return undefined;
 return {
  totalTokens: (a?.totalTokens || 0) + (b?.totalTokens || 0),
  inputTokens: (a?.inputTokens || 0) + (b?.inputTokens || 0),
  cachedTokens: (a?.cachedTokens || 0) + (b?.cachedTokens || 0),
  outputTokens: (a?.outputTokens || 0) + (b?.outputTokens || 0),
  thoughtTokens: (a?.thoughtTokens || 0) + (b?.thoughtTokens || 0),
 };
}

function fullCacheKeyOf(hashHex: string): string {
 return 'jd-auto-v3:' + hashHex;
}

function stage1CacheKeyOf(hashHex: string): string {
 return 'jd-s1-v2:' + hashHex;
}

function phaseCacheKeyOf(hashHex: string, phaseIndex: number): string {
 return `jd-p-v3:${hashHex}:${phaseIndex}`;
}

function questionsCacheKeyOf(hashHex: string): string {
 return 'jd-q-v3:' + hashHex;
}

function getReusedQuizzesForPhase(stage1: JdResearchReport, phaseIndex: number): AiQuiz[] {
 const usedIds = new Set<string>();
 for (let i = 0; i < phaseIndex; i++) {
  pickInSiteQuizzesForStage(stage1, i, usedIds);
 }
 return pickInSiteQuizzesForStage(stage1, phaseIndex, usedIds);
}

function extractStreamQuestionTitles(buf: string): string[] {
 const qTitles: string[] = [];
 const re = /"title"\s*:\s*"((?:\\.|[^"\\])*)"/g;
 let m: RegExpExecArray | null;
 while ((m = re.exec(buf)) !== null) {
  const t = m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim();
  if (t) qTitles.push(t);
 }
 return qTitles;
}

async function startAntigravityWithModelFallback(opts: {
 systemInstruction: string;
 input: string;
 maxTotalTokens: number;
 attemptOffset?: number;
 geminiProxy: boolean;
 signal?: AbortSignal;
}) {
 const len = ANTIGRAVITY_MODEL_CHAIN.length;
 const startAt = Math.max(0, opts.attemptOffset || 0) % len;
 let lastErr: unknown;
 for (let step = 0; step < len; step++) {
  const attemptIdx = (startAt + step) % len;
  const agentModel = ANTIGRAVITY_MODEL_CHAIN[attemptIdx];
  try {
   const started = await startAntigravityInteraction({
    systemInstruction: opts.systemInstruction,
    input: opts.input,
    agentModel,
    maxTotalTokens: opts.maxTotalTokens,
    geminiProxy: opts.geminiProxy,
    signal: opts.signal,
   });
   return {
    started,
    modelLabel: antigravityModelLabel(agentModel),
    attemptIdx,
   };
  } catch (e) {
   lastErr = e;
   if (opts.signal?.aborted) throw e;
   if (e instanceof AntigravityError && (e.code === 'geo_blocked' || e.code === 'missing_key')) {
    throw e;
   }
  }
 }
 throw lastErr instanceof Error ? lastErr : new AntigravityError('启动 Antigravity Agent 失败，请重试。', 502, 'agent_error');
}

// Exclusively uses the Antigravity Managed Agent (`background: true` + resumable `last_event_id` SSE slices
// with polling fallback + per-step D1 checkpointing so completed steps never re-run or waste tokens).
export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用 JD / 面经调研。', 401);
  if (user.is_guest) throw new AuthError('游客不支持 JD / 面经深度调研功能，请登录正式账号后使用。', 403);
  const admin = await currentAdmin(req.headers);
  const isAdmin = Boolean(admin);

  const raw = await req.text();
  if (raw.length > 8_000_000) throw new AuthError('输入内容或图片过大，请精简后再提交。');
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const rawAction = typeof body.action === 'string' ? body.action.trim() : 'start';
  const action =
   rawAction === 'start_step' || rawAction === 'watch' || rawAction === 'finalize' || rawAction === 'fail'
    ? rawAction
    : 'start';
  const geminiProxy = body.geminiProxy !== false;
  const bypassCache = body.bypassCache === true;

  // ---- Action 1: start (returns full/stage1 cache hit immediately, or starts background Stage 1 Agent) ----
  if (action === 'start') {
   await rateLimit('jd-research:' + user.id, 30);

   const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
   const rawSource = typeof body.source === 'string' ? body.source.replace(/\r\n/g, '\n').trim().slice(0, 14_000) : '';
   const jdUrl = typeof body.url === 'string' ? body.url.trim().slice(0, 2000) : '';
   const rawImages = Array.isArray(body.images) ? body.images : [];
   const images = rawImages
    .filter((x): x is string => typeof x === 'string' && x.length <= 2_000_000 && IMG_RE.test(x))
    .slice(0, 4);
   const existingRecordId =
    typeof body.recordId === 'string' && body.recordId.startsWith('jdr-') ? body.recordId.trim().slice(0, 80) : '';
   const attemptOffset = Number.isFinite(Number(body.attempt)) ? Math.max(0, Math.floor(Number(body.attempt))) : 0;

   const parts: string[] = [];
   if (rawSource) parts.push(rawSource);
   if (jdUrl) {
    const fromUrl = await fetchJdTextFromUrl(jdUrl);
    if (fromUrl) parts.push(fromUrl);
   }
   if (images.length) {
    const fromImg = await extractJdFromImages(images, geminiProxy, true);
    if (fromImg) parts.push(fromImg);
   }
   const source = parts.join('\n\n').slice(0, 14_000).trim();
   if (source.length < 20) throw new AuthError('请粘贴至少 20 字的岗位 JD / 面经内容，或提供岗位链接 / 图片。');

   const normSource = normalizeJdSourceForCache(source);
   const hashHex = await sha256Hex([kind, normSource]);
   const cacheKey = fullCacheKeyOf(hashHex);
   const stage1CacheKey = stage1CacheKeyOf(hashHex);
   const recordId = existingRecordId || 'jdr-' + crypto.randomUUID();
   const initialTitle = draftTitle(source, kind);

   const existingRec = existingRecordId
    ? await getAiInterviewRecord<StoredJdRecordPayload>(user.id, existingRecordId)
    : null;
   const todayKey = beijingDayWindow().dayKey;
   const resumingToday = Boolean(
    existingRec &&
     existingRec.status !== 'completed' &&
     existingRec.payload?.dailyDayKey === todayKey &&
     !existingRec.payload?.dailyRefunded,
   );

   let reservedDailyDay = resumingToday ? existingRec!.payload.dailyDayKey || todayKey : '';
   if (!isAdmin && !resumingToday) {
    const daily = await tryConsumeDailyJdQuota(user.id);
    if (!daily.allowed) {
     throw new AuthError('每位用户每天限生成 1 份 JD / 面经深度调研，今日额度已用完，请明天再来。', 429);
    }
    reservedDailyDay = daily.dayKey;
   }

   // 1a. Check full-report D1 cache (0 tokens, instant response)
   if (!bypassCache) {
    const hit = await readPromptCache<CachedJdPayload>(cacheKey);
    if (
     hit?.payload?.report &&
     hit.payload.report.roadmap.length > 0 &&
     (hit.payload.report.questions.length > 0 || hasStructuredStudyQuizzes(hit.payload.report))
    ) {
     const rep = hit.payload.report;
     const hitModel = hit.payload.model || hit.model || ANTIGRAVITY_AGENT_ID;
     const stored: StoredJdRecordPayload = {
      kind,
      source,
      hashHex,
      dailyDayKey: reservedDailyDay || undefined,
      model: hitModel,
      cacheKey,
      stage1CacheKey,
      cached: true,
      stage1Cached: true,
      report: rep,
      rawText: hit.payload.rawText || '',
      thoughts: hit.payload.thoughts || '',
      usage: hit.payload.usage,
     };
     await saveAiInterviewRecord({
      id: recordId,
      userId: user.id,
      kind: 'jd-research',
      title: rep.roleTitle || initialTitle,
      subtitle: makeSubtitle(rep),
      status: 'completed',
      payload: stored,
      createdAt: existingRec?.createdAt,
     });
     return Response.json(
      {
       ok: true,
       status: 'done',
       cached: true,
       stage1Cached: true,
       recordId,
       hashHex,
       title: rep.roleTitle || initialTitle,
       model: hitModel,
       report: rep,
       rawText: hit.payload.rawText || '',
       thoughts: hit.payload.thoughts || '',
       usage: hit.payload.usage,
       extractedSource: source,
      },
      { headers: noCache },
     );
    }
   }

   // 1b. Check Stage 1 D1 checkpoint (`prompt_cache` or record's existing `partialReport`)
   let s1Rep: JdResearchReport | null = null;
   let s1RawText = '';
   let s1Thoughts = '';
   let s1Model = antigravityModelLabel();
   let s1Usage: AntigravityUsage | undefined;

   if (!bypassCache) {
    const s1Hit = await readPromptCache<CachedStage1Payload>(stage1CacheKey);
    if (s1Hit?.payload?.report && s1Hit.payload.report.roadmap.length > 0) {
     s1Rep = s1Hit.payload.report;
     s1RawText = s1Hit.payload.rawText || '';
     s1Thoughts = s1Hit.payload.thoughts || '';
     s1Model = s1Hit.payload.model || s1Hit.model || antigravityModelLabel();
     s1Usage = s1Hit.payload.usage;
    } else if (existingRec?.payload?.partialReport && existingRec.payload.partialReport.roadmap.length > 0) {
     s1Rep = existingRec.payload.partialReport;
     s1RawText = existingRec.payload.stage1RawText || '';
     s1Thoughts = existingRec.payload.stage1Thoughts || '';
     s1Model = existingRec.payload.model || antigravityModelLabel();
     s1Usage = existingRec.payload.stage1Usage;
    }
   }

   if (s1Rep) {
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: s1Rep.roleTitle || initialTitle,
     subtitle: makeSubtitle(s1Rep),
     status: 'running',
     interactionId: existingRec?.interactionId || undefined,
     payload: {
      kind,
      source,
      hashHex,
      dailyDayKey: reservedDailyDay || undefined,
      dailyRefunded: false,
      model: s1Model,
      cacheKey,
      stage1CacheKey,
      stage: 2,
      stage1Cached: true,
      partialReport: s1Rep,
      stage1RawText: s1RawText,
      stage1Thoughts: s1Thoughts,
      stage1Usage: s1Usage,
      report: null,
      rawText: '',
      thoughts: s1Thoughts,
      imported: existingRec?.payload?.imported ?? null,
     },
     createdAt: existingRec?.createdAt,
    });
    return Response.json(
     {
      ok: true,
      status: 'stage1_ready',
      stage1Cached: true,
      recordId,
      hashHex,
      title: s1Rep.roleTitle || initialTitle,
      model: s1Model,
      partialReport: s1Rep,
      thoughts: s1Thoughts,
      usage: s1Usage,
      extractedSource: source,
     },
     { headers: noCache },
    );
   }

   // 1c. Start a new background Antigravity Agent interaction for Stage 1
   try {
    const { started, modelLabel, attemptIdx } = await startAntigravityWithModelFallback({
     systemInstruction: getJdResearchStage1SystemPrompt(),
     input: buildJdStage1Input({ kind, source }),
     maxTotalTokens: 24_000,
     attemptOffset,
     geminiProxy,
     signal: req.signal,
    });

    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: initialTitle,
     subtitle: '',
     status: 'running',
     interactionId: started.id,
     payload: {
      kind,
      source,
      hashHex,
      dailyDayKey: reservedDailyDay || undefined,
      dailyRefunded: false,
      model: modelLabel,
      cacheKey,
      stage1CacheKey,
      stage: 1,
      stage1Cached: false,
      partialReport: existingRec?.payload?.partialReport ?? null,
      stage1RawText: '',
      stage1Thoughts: '',
      report: null,
      rawText: '',
      thoughts: '',
      imported: existingRec?.payload?.imported ?? null,
     },
     createdAt: existingRec?.createdAt,
    });

    return Response.json(
     {
      ok: true,
      status: 'started',
      step: 'stage1',
      recordId,
      hashHex,
      title: initialTitle,
      interactionId: started.id,
      model: modelLabel,
      attemptUsed: attemptIdx,
      extractedSource: source,
     },
     { headers: noCache },
    );
   } catch (startErr) {
    if (!req.signal?.aborted && reservedDailyDay && !isAdmin) {
     await refundDailyJdQuota(user.id, reservedDailyDay);
    }
    throw startErr;
   }
  }

  // ---- Action 2: start_step (Stage 2 per-phase quizzes or interview questions, checkpoint-aware) ----
  if (action === 'start_step') {
   await rateLimit('jd-research-step:' + user.id, 90);
   const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
   const step = body.step === 'questions' ? 'questions' : 'phase';
   const phaseIndex = Number.isInteger(Number(body.phaseIndex)) ? Number(body.phaseIndex) : 0;
   const attemptOffset = Number.isFinite(Number(body.attempt)) ? Math.max(0, Math.floor(Number(body.attempt))) : 0;

   if (!recordId) throw new AuthError('缺少任务标识。', 400);
   const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   const s1Rep = rec?.payload?.partialReport;
   if (!rec || !s1Rep) throw new AuthError('阶段一数据未就绪，请重试。', 404);

   const kind: JdInputKind = rec.payload.kind || 'jd';
   const source = rec.payload.source || '';
   const hashHex = rec.payload.hashHex || (await sha256Hex([kind, normalizeJdSourceForCache(source)]));

   if (step === 'phase') {
    if (phaseIndex < 0 || phaseIndex >= s1Rep.roadmap.length) {
     throw new AuthError('路径索引超出范围。', 400);
    }
    const phaseKey = phaseCacheKeyOf(hashHex, phaseIndex);
    if (!bypassCache) {
     const hit = await readPromptCache<CachedPhasePayload>(phaseKey);
     if (hit?.payload?.quizzes && hit.payload.quizzes.length >= 4) {
      return Response.json(
       {
        ok: true,
        status: 'step_cached',
        step: 'phase',
        phaseIndex,
        quizCount: hit.payload.quizzes.length,
        model: hit.payload.model || hit.model || antigravityModelLabel(),
       },
       { headers: noCache },
      );
     }
     const existingQuizzes = s1Rep.roadmap[phaseIndex]?.quizzes;
     if (existingQuizzes && existingQuizzes.length >= 4) {
      await writePromptCache(
       phaseKey,
       'jd-phase',
       rec.payload.model || antigravityModelLabel(),
       {
        quizzes: existingQuizzes,
        rawText: '',
        thoughts: '',
        model: rec.payload.model || antigravityModelLabel(),
       } satisfies CachedPhasePayload,
       7 * 24 * 3600_000,
      );
      return Response.json(
       {
        ok: true,
        status: 'step_cached',
        step: 'phase',
        phaseIndex,
        quizCount: existingQuizzes.length,
        model: rec.payload.model || antigravityModelLabel(),
       },
       { headers: noCache },
      );
     }
    }

    const reusedQuizzes = getReusedQuizzesForPhase(s1Rep, phaseIndex);
    const { started, modelLabel, attemptIdx } = await startAntigravityWithModelFallback({
     systemInstruction: getJdResearchPhaseQuizzesSystemPrompt(),
     input: buildJdPhaseQuizzesInput({ kind, source, stage1: s1Rep, phaseIndex, reusedQuizzes }),
     maxTotalTokens: 32_000,
     attemptOffset,
     geminiProxy,
     signal: req.signal,
    });
    return Response.json(
     {
      ok: true,
      status: 'started',
      step: 'phase',
      phaseIndex,
      interactionId: started.id,
      model: modelLabel,
      attemptUsed: attemptIdx,
     },
     { headers: noCache },
    );
   }

   // step === 'questions'
   const qKey = questionsCacheKeyOf(hashHex);
   if (!bypassCache) {
    const hit = await readPromptCache<CachedQuestionsPayload>(qKey);
    if (hit?.payload?.questions && hit.payload.questions.length > 0) {
     return Response.json(
      {
       ok: true,
       status: 'step_cached',
       step: 'questions',
       questionCount: hit.payload.questions.length,
       qTitles: hit.payload.questions.map(q => q.title),
       model: hit.payload.model || hit.model || antigravityModelLabel(),
      },
      { headers: noCache },
     );
    }
    if (s1Rep.questions && s1Rep.questions.length > 0) {
     await writePromptCache(
      qKey,
      'jd-questions',
      rec.payload.model || antigravityModelLabel(),
      {
       questions: s1Rep.questions,
       rawText: '',
       thoughts: '',
       model: rec.payload.model || antigravityModelLabel(),
      } satisfies CachedQuestionsPayload,
      7 * 24 * 3600_000,
     );
     return Response.json(
      {
       ok: true,
       status: 'step_cached',
       step: 'questions',
       questionCount: s1Rep.questions.length,
       qTitles: s1Rep.questions.map(q => q.title),
       model: rec.payload.model || antigravityModelLabel(),
      },
      { headers: noCache },
     );
    }
   }

   const { started, modelLabel, attemptIdx } = await startAntigravityWithModelFallback({
    systemInstruction: getJdResearchStage2QuestionsSystemPrompt(),
    input: buildJdStage2QuestionsInput({ kind, source, stage1: s1Rep }),
    maxTotalTokens: 32_000,
    attemptOffset,
    geminiProxy,
    signal: req.signal,
   });
   return Response.json(
    {
     ok: true,
     status: 'started',
     step: 'questions',
     interactionId: started.id,
     model: modelLabel,
     attemptUsed: attemptIdx,
    },
    { headers: noCache },
   );
  }

  // ---- Action 3: watch (NDJSON 40s resumable SSE slice using background interactionId + lastEventId) ----
  if (action === 'watch') {
   await rateLimit('jd-research-watch:' + user.id, 180);
   const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
   const interactionId = typeof body.interactionId === 'string' ? body.interactionId.trim().slice(0, 180) : '';
   const lastEventIdIn = typeof body.lastEventId === 'string' ? body.lastEventId.trim().slice(0, 200) : '';
   const step = body.step === 'phase' ? 'phase' : body.step === 'questions' ? 'questions' : 'stage1';
   const phaseIndex = Number.isInteger(Number(body.phaseIndex)) ? Number(body.phaseIndex) : 0;
   const modelLabel = typeof body.model === 'string' && body.model.trim() ? body.model.trim().slice(0, 60) : antigravityModelLabel();

   if (!recordId || !interactionId) throw new AuthError('缺少监听参数。', 400);
   const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   if (!rec) throw new AuthError('未找到调研记录。', 404);

   const kind: JdInputKind = rec.payload.kind || 'jd';
   const source = rec.payload.source || '';
   const hashHex = rec.payload.hashHex || (await sha256Hex([kind, normalizeJdSourceForCache(source)]));

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

     let activeStep = 'thinking';
     const pingTimer = setInterval(() => {
      if (closed) return;
      if (Date.now() - lastSendAt >= 2400) {
       send({ type: 'ping', step: activeStep });
      }
     }, 2500);

     try {
      send({
       type: 'connected',
       recordId,
       interactionId,
       step,
       phaseIndex: step === 'phase' ? phaseIndex : undefined,
       model: modelLabel,
      });

      let deltaBuf = '';
      let lastDeltaInspectAt = 0;
      const emitDelta = (jd: string, fullBuf: string, force = false) => {
       deltaBuf = fullBuf;
       activeStep = 'output';
       const now = Date.now();
       if (!force && now - lastDeltaInspectAt < 400) return;
       lastDeltaInspectAt = now;
       if (step === 'stage1') {
        send({
         type: 'delta',
         stage: 1,
         text: jd,
         chars: deltaBuf.length,
         progress: inspectJdStreamProgress(1, deltaBuf, null, false),
        });
       } else if (step === 'phase') {
        const phaseQuizCount = (deltaBuf.match(/"type"\s*:\s*"(?:single|multi|fill|short|code)"/g) || []).length;
        send({
         type: 'delta',
         stage: 2,
         phaseIndex,
         text: jd,
         chars: deltaBuf.length,
         phaseQuizCount,
        });
       } else {
        const qTitles = extractStreamQuestionTitles(deltaBuf);
        send({
         type: 'delta',
         stage: 2,
         text: jd,
         chars: deltaBuf.length,
         qTitles,
        });
       }
      };

      const makeSplitter = () =>
       createThinkJsonStreamSplitter({
        onThoughtDelta: td => {
         activeStep = 'thinking';
         send({ type: 'thought', stage: step === 'stage1' ? 1 : 2, text: td });
        },
        onJsonDelta: (jd, fullBuf) => {
         emitDelta(jd, fullBuf, false);
        },
       });
      let splitter = makeSplitter();

      const slice = await streamAntigravitySlice({
       interactionId,
       lastEventId: lastEventIdIn,
       maxSliceMs: 40_000,
       geminiProxy,
       signal: req.signal,
       onStep: st => {
        activeStep = st;
        send({ type: 'step', stepType: st });
       },
       onKeepAlive: () => {
        send({ type: 'ping', step: activeStep });
       },
       onThoughtDelta: td => {
        activeStep = 'thinking';
        send({ type: 'thought', stage: step === 'stage1' ? 1 : 2, text: td });
       },
       onTextDelta: td => {
        splitter.push(td);
       },
       onTextReset: () => {
        deltaBuf = '';
        splitter = makeSplitter();
        send({ type: 'reset', stage: step === 'stage1' ? 1 : 2, keepThoughts: true });
       },
      });
      splitter.flush();

      if (req.signal?.aborted) return;

      if (slice.status === 'in_progress') {
       send({
        type: 'continue',
        interactionId,
        lastEventId: slice.lastEventId,
       });
       return;
      }

      if (slice.status === 'failed' || slice.status === 'cancelled') {
       send({
        type: 'retry_step',
        step,
        phaseIndex: step === 'phase' ? phaseIndex : undefined,
        reason: slice.error || `Antigravity Agent 状态异常（${slice.status}）`,
       });
       return;
      }

      // Completed! Parse, validate, and IMMEDIATELY persist checkpoint to D1 prompt_cache + record!
      const freshRec = (await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId)) || rec;
      const extracted = extractThoughtsAndJson(slice.text);
      const rawJsonText = extracted.jsonRaw || slice.text;
      const cleanThoughts = (slice.thoughts || extracted.thoughts || '').trim();

      if (step === 'stage1') {
       const s1Rep = parseAndEnrichJdReport(slice.text);
       if (!s1Rep || (!s1Rep.roadmap.length && !s1Rep.dimensions.length)) {
        send({ type: 'retry_step', step: 'stage1', reason: '阶段一 JSON 解析不完整，自动重试' });
        return;
       }
       const s1CacheKey = stage1CacheKeyOf(hashHex);
       await writePromptCache(
        s1CacheKey,
        'jd-stage1',
        modelLabel,
        {
         report: s1Rep,
         rawText: rawJsonText,
         thoughts: cleanThoughts,
         model: modelLabel,
         usage: slice.usage,
        } satisfies CachedStage1Payload,
        7 * 24 * 3600_000,
       );
       await saveAiInterviewRecord({
        id: recordId,
        userId: user.id,
        kind: 'jd-research',
        title: s1Rep.roleTitle || freshRec.title,
        subtitle: makeSubtitle(s1Rep),
        status: 'running',
        interactionId,
        payload: {
         ...freshRec.payload,
         hashHex,
         model: modelLabel,
         stage1CacheKey: s1CacheKey,
         stage: 2,
         stage1Cached: false,
         partialReport: s1Rep,
         stage1RawText: rawJsonText,
         stage1Thoughts: cleanThoughts,
         stage1Usage: slice.usage,
         thoughts: cleanThoughts,
        },
        createdAt: freshRec.createdAt,
       });
       send({
        type: 'stage1',
        recordId,
        stage1Cached: false,
        model: modelLabel,
        partialReport: s1Rep,
        thoughts: cleanThoughts,
        usage: slice.usage,
        progress: inspectJdStreamProgress(2, '', s1Rep, false),
       });
       return;
      }

      const s1Rep = freshRec.payload?.partialReport;
      if (!s1Rep) {
       send({ type: 'retry_step', step, reason: '缺少阶段一结果，请重试' });
       return;
      }

      if (step === 'phase') {
       const generated = parsePhaseQuizzes(slice.text, phaseIndex);
       if (generated.length < 4) {
        send({ type: 'retry_step', step: 'phase', phaseIndex, reason: '路径题库解析不完整，自动切换模型重试' });
        return;
       }
       const reused = getReusedQuizzesForPhase(s1Rep, phaseIndex);
       const quizzes = combinePhaseQuizzes(reused, generated, phaseIndex);
       const phaseKey = phaseCacheKeyOf(hashHex, phaseIndex);
       await writePromptCache(
        phaseKey,
        'jd-phase',
        modelLabel,
        {
         quizzes,
         rawText: rawJsonText,
         thoughts: cleanThoughts,
         model: modelLabel,
         usage: slice.usage,
        } satisfies CachedPhasePayload,
        7 * 24 * 3600_000,
       );
       const updatedPartial: JdResearchReport = {
        ...s1Rep,
        roadmap: s1Rep.roadmap.map((st, idx) => (idx === phaseIndex ? { ...st, quizzes } : st)),
       };
       await saveAiInterviewRecord({
        id: recordId,
        userId: user.id,
        kind: 'jd-research',
        title: freshRec.title,
        subtitle: freshRec.subtitle,
        status: 'running',
        interactionId,
        payload: {
         ...freshRec.payload,
         hashHex,
         partialReport: updatedPartial,
        },
        createdAt: freshRec.createdAt,
       });
       send({
        type: 'phase_done',
        phaseIndex,
        cached: false,
        quizCount: quizzes.length,
        model: modelLabel,
        thoughts: cleanThoughts,
        usage: slice.usage,
       });
       return;
      }

      // step === 'questions'
      const mergedQs = mergeStage1AndStage2Report(s1Rep, slice.text).questions;
      if (!mergedQs.length) {
       send({ type: 'retry_step', step: 'questions', reason: '面试题库解析不完整，自动切换模型重试' });
       return;
      }
      const qKey = questionsCacheKeyOf(hashHex);
      await writePromptCache(
       qKey,
       'jd-questions',
       modelLabel,
       {
        questions: mergedQs,
        rawText: rawJsonText,
        thoughts: cleanThoughts,
        model: modelLabel,
        usage: slice.usage,
       } satisfies CachedQuestionsPayload,
       7 * 24 * 3600_000,
      );
      const updatedPartial: JdResearchReport = {
       ...s1Rep,
       questions: mergedQs,
      };
      await saveAiInterviewRecord({
       id: recordId,
       userId: user.id,
       kind: 'jd-research',
       title: freshRec.title,
       subtitle: freshRec.subtitle,
       status: 'running',
       interactionId,
       payload: {
        ...freshRec.payload,
        hashHex,
        partialReport: updatedPartial,
       },
       createdAt: freshRec.createdAt,
      });
      send({
       type: 'questions_done',
       cached: false,
       questionCount: mergedQs.length,
       qTitles: mergedQs.map(q => q.title),
       model: modelLabel,
       thoughts: cleanThoughts,
       usage: slice.usage,
      });
     } catch (e) {
      if (!req.signal?.aborted) {
       send({
        type: 'retry_step',
        step,
        phaseIndex: step === 'phase' ? phaseIndex : undefined,
        reason: e instanceof Error ? e.message : '网络波动，自动重试',
       });
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
  }

  // ---- Action 4: finalize (aggregates all saved D1 checkpoints into final completed report) ----
  if (action === 'finalize') {
   const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
   if (!recordId) throw new AuthError('缺少任务标识。', 400);
   const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   const s1Rep = rec?.payload?.partialReport || rec?.payload?.report;
   if (!rec || !s1Rep) throw new AuthError('未找到阶段一数据，请重试。', 404);

   const kind: JdInputKind = rec.payload.kind || 'jd';
   const source = rec.payload.source || '';
   const hashHex = rec.payload.hashHex || (await sha256Hex([kind, normalizeJdSourceForCache(source)]));
   const cacheKey = rec.payload.cacheKey || fullCacheKeyOf(hashHex);
   const stage1CacheKey = rec.payload.stage1CacheKey || stage1CacheKeyOf(hashHex);

   const phaseHits = await Promise.all(
    s1Rep.roadmap.map((_, idx) => readPromptCache<CachedPhasePayload>(phaseCacheKeyOf(hashHex, idx))),
   );
   const qHit = await readPromptCache<CachedQuestionsPayload>(questionsCacheKeyOf(hashHex));

   const mergedRoadmap = s1Rep.roadmap.map((step, idx) => {
    const qz = phaseHits[idx]?.payload?.quizzes;
    return qz && qz.length ? { ...step, quizzes: qz } : step;
   });
   const finalQuestions = qHit?.payload?.questions?.length ? qHit.payload.questions : s1Rep.questions;
   const finalReport: JdResearchReport = {
    ...s1Rep,
    roadmap: mergedRoadmap,
    questions: finalQuestions,
   };

   const anyPhaseHasQuizzes = mergedRoadmap.some(s => (s.quizzes?.length ?? 0) > 0);
   if (!anyPhaseHasQuizzes && !finalQuestions.length) {
    if (!isAdmin && rec.payload.dailyDayKey && !rec.payload.dailyRefunded) {
     await refundDailyJdQuota(user.id, rec.payload.dailyDayKey);
    }
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: rec.title,
     subtitle: rec.subtitle,
     status: 'error',
     interactionId: rec.interactionId || undefined,
     payload: {
      ...rec.payload,
      dailyRefunded: true,
      error: '题库生成失败，请点击「一键重试」（阶段一已保存，不会重复消耗 Token）。',
     },
     createdAt: rec.createdAt,
    });
    return Response.json(
     { error: '题库生成失败，请点击「一键重试」（阶段一已保存，不会重复消耗 Token）。' },
     { status: 502, headers: noCache },
    );
   }

   const modelSet = new Set<string>();
   if (rec.payload.model) modelSet.add(rec.payload.model);
   for (const h of phaseHits) {
    const m = h?.payload?.model || h?.model;
    if (m) modelSet.add(m);
   }
   if (qHit?.payload?.model || qHit?.model) modelSet.add(qHit?.payload?.model || qHit?.model || '');
   const combinedModel = [...modelSet].filter(Boolean).join(' / ') || antigravityModelLabel();

   let totalUsage: AntigravityUsage | undefined = rec.payload.stage1Usage;
   for (const h of phaseHits) {
    if (h?.payload?.usage) totalUsage = combineUsage(totalUsage, h.payload.usage);
   }
   if (qHit?.payload?.usage) totalUsage = combineUsage(totalUsage, qHit.payload.usage);

   const s1Thoughts = rec.payload.stage1Thoughts || '';
   const s2ThoughtParts: string[] = [];
   phaseHits.forEach((h, idx) => {
    const t = h?.payload?.thoughts?.trim();
    if (t) s2ThoughtParts.push(`[${mergedRoadmap[idx].phase} · ${mergedRoadmap[idx].title}]\n${t}`);
   });
   if (qHit?.payload?.thoughts?.trim()) {
    s2ThoughtParts.push(`[面试专题题库]\n${qHit.payload.thoughts.trim()}`);
   }
   const s2Thoughts = s2ThoughtParts.join('\n\n');
   const combinedThoughts = [
    s1Thoughts,
    s2Thoughts ? (s1Thoughts ? `── 阶段二：Antigravity Agent 分步出题 ──\n${s2Thoughts}` : s2Thoughts) : '',
   ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

   const rawParts = [
    rec.payload.stage1RawText || '',
    ...phaseHits.map(h => h?.payload?.rawText || ''),
    qHit?.payload?.rawText || '',
   ].filter(Boolean);
   const combinedRaw = rawParts.join('\n\n');

   const allPhasesDone = mergedRoadmap.every(s => (s.quizzes?.length ?? 0) >= 4);
   if (allPhasesDone && finalQuestions.length > 0) {
    await writePromptCache(
     cacheKey,
     'jd-research',
     combinedModel,
     {
      report: finalReport,
      rawText: combinedRaw,
      thoughts: combinedThoughts,
      model: combinedModel,
      usage: totalUsage,
     } satisfies CachedJdPayload,
     7 * 24 * 3600_000,
    );
   }

   const stored: StoredJdRecordPayload = {
    kind,
    source,
    hashHex,
    dailyDayKey: rec.payload.dailyDayKey,
    dailyRefunded: false,
    model: combinedModel,
    cacheKey,
    stage1CacheKey,
    stage: 2,
    cached: false,
    stage1Cached: Boolean(rec.payload.stage1Cached),
    partialReport: null,
    report: finalReport,
    rawText: combinedRaw,
    thoughts: combinedThoughts,
    usage: totalUsage,
    imported: rec.payload.imported ?? null,
   };

   await saveAiInterviewRecord({
    id: recordId,
    userId: user.id,
    kind: 'jd-research',
    title: finalReport.roleTitle || rec.title,
    subtitle: makeSubtitle(finalReport) || rec.subtitle,
    status: 'completed',
    interactionId: rec.interactionId || undefined,
    payload: stored,
    createdAt: rec.createdAt,
   });

   return Response.json(
    {
     ok: true,
     recordId,
     cached: false,
     stage1Cached: Boolean(rec.payload.stage1Cached),
     model: combinedModel,
     report: finalReport,
     rawText: combinedRaw,
     thoughts: combinedThoughts,
     usage: totalUsage,
     extractedSource: source,
    },
    { headers: noCache },
   );
  }

  // ---- Action 5: fail (refunds daily quota on unrecoverable system error, preserves all saved checkpoints) ----
  const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const errMsg =
   typeof body.error === 'string' && body.error.trim()
    ? body.error.trim().slice(0, 300)
    : '生成中断，请点击「一键重试」（已完成步骤已保存，不会重复耗费 Token）。';
  if (recordId) {
   const prev = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   if (prev && prev.status !== 'completed') {
    if (!isAdmin && prev.payload?.dailyDayKey && !prev.payload?.dailyRefunded) {
     await refundDailyJdQuota(user.id, prev.payload.dailyDayKey);
    }
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: prev.title,
     subtitle: prev.subtitle,
     status: 'error',
     interactionId: prev.interactionId || undefined,
     payload: {
      ...prev.payload,
      dailyRefunded: true,
      error: errMsg,
     },
     createdAt: prev.createdAt,
    });
   }
  }
  return Response.json({ ok: true }, { headers: noCache });
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
  if (user.is_guest) throw new AuthError('游客不支持 JD / 面经深度调研功能，请登录正式账号后使用。', 403);

  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const sig = (url.searchParams.get('sig') || '').trim();
  const ck = (url.searchParams.get('ck') || '').trim();
  const ckSig = (url.searchParams.get('ckSig') || '').trim();
  const rid = (url.searchParams.get('rid') || '').trim();
  const geminiProxy = url.searchParams.get('geminiProxy') !== '0';

  if (!id || !sig || id.length > 160) throw new AuthError('缺少任务标识。', 400);
  const prev = rid ? await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid) : null;

  const expectedIdSig = await signToken(user.id, id);
  const expectedRidSig = rid ? await signToken(user.id, rid) : '';
  const expectedPrevIdSig = prev?.interactionId ? await signToken(user.id, prev.interactionId) : '';
  if (sig !== expectedIdSig && sig !== expectedRidSig && sig !== expectedPrevIdSig) {
   throw new AuthError('无权查询该调研任务。', 403);
  }

  // If the record already completed (e.g. polled by another tab or background watcher), return immediately!
  if (prev?.status === 'completed' && prev.payload?.report) {
   return Response.json(
    {
     id: prev.interactionId || id,
     recordId: rid || undefined,
     status: 'completed',
     cached: prev.payload.cached,
     stage1Cached: prev.payload.stage1Cached,
     report: prev.payload.report,
     rawText: prev.payload.rawText || '',
     thoughts: prev.payload.thoughts || '',
     usage: prev.payload.usage,
    },
    { headers: noCache },
   );
  }

  const activeInteractionId = prev?.interactionId || id;
  const stage: 1 | 2 = prev?.payload?.stage === 2 ? 2 : 1;
  const partialReport = prev?.payload?.partialReport ?? null;
  const stage1Cached = Boolean(prev?.payload?.stage1Cached);

  const polled = await pollAntigravityInteraction({ interactionId: activeInteractionId, geminiProxy });

  if (polled.status === 'in_progress') {
   const progress = inspectJdStreamProgress(stage, polled.text, partialReport, stage1Cached);
   const combinedThoughts = [prev?.payload?.stage1Thoughts, polled.thoughts].filter(Boolean).join('\n\n');
   return Response.json(
    {
     id: activeInteractionId,
     recordId: rid || undefined,
     status: 'in_progress',
     stage,
     stage1Cached,
     partialReport,
     progress,
     text: polled.text,
     thoughts: combinedThoughts,
    },
    { headers: noCache },
   );
  }

  if (polled.status === 'completed') {
   // ---- Stage 1 Completed: parse Profile + Roadmap, cache Stage 1, and transition to Stage 2 ----
   if (stage === 1) {
    const s1Report = parseAndEnrichJdReport(polled.text);
    // If single-pass report already has both roadmap study quizzes and interview questions, finish directly
    const alreadyComplete = Boolean(
     s1Report && s1Report.questions.length > 0 && hasStructuredStudyQuizzes(s1Report),
    );

    if (!s1Report || (!s1Report.roadmap.length && !s1Report.dimensions.length)) {
     if (rid && prev) {
      await saveAiInterviewRecord({
       id: rid,
       userId: user.id,
       kind: 'jd-research',
       title: prev.title,
       subtitle: prev.subtitle,
       status: 'error',
       interactionId: activeInteractionId,
       payload: {
        ...prev.payload,
        rawText: polled.text,
        thoughts: polled.thoughts,
        error: '考点画像与复习路径解析失败，请点击「一键重试」重新生成。',
       },
       createdAt: prev.createdAt,
      });
     }
     return Response.json(
      {
       id: activeInteractionId,
       recordId: rid || undefined,
       status: 'failed',
       error: '考点画像与复习路径解析失败，请点击「一键重试」重新生成。',
      },
      { headers: noCache },
     );
    }

    if (!alreadyComplete) {
     const prevKind: JdInputKind = prev?.payload?.kind || 'jd';
     const prevSource = prev?.payload?.source || '';
     const s1CacheKey =
      prev?.payload?.stage1CacheKey ||
      (prevSource ? 'jd-s1-v2:' + (await sha256Hex([prevKind, normalizeJdSourceForCache(prevSource)])) : '');

     if (s1CacheKey) {
      await writePromptCache(
       s1CacheKey,
       'jd-stage1',
       ANTIGRAVITY_AGENT_ID,
       { report: s1Report, rawText: polled.text, thoughts: polled.thoughts, usage: polled.usage } satisfies CachedStage1Payload,
       7 * 24 * 3600_000,
      );
     }

     const started2 = await startAntigravityInteraction({
      systemInstruction: getJdResearchStage2SystemPrompt(),
      input: buildJdStage2Input({ kind: prevKind, source: prevSource, stage1: s1Report }),
      geminiProxy,
     });
     const newSig = await signToken(user.id, started2.id);

     if (rid) {
      const nextPayload: StoredJdRecordPayload = {
       kind: prevKind,
       source: prevSource,
       cacheKey: prev?.payload?.cacheKey || ck,
       stage1CacheKey: s1CacheKey,
       stage: 2,
       stage1Cached: false,
       partialReport: s1Report,
       stage1RawText: polled.text,
       stage1Thoughts: polled.thoughts,
       stage1Usage: polled.usage,
       report: null,
       rawText: '',
       thoughts: polled.thoughts,
       imported: prev?.payload?.imported ?? null,
      };
      await saveAiInterviewRecord({
       id: rid,
       userId: user.id,
       kind: 'jd-research',
       title: s1Report.roleTitle || prev?.title || '深度调研报告',
       subtitle: makeSubtitle(s1Report) || prev?.subtitle || '',
       status: 'running',
       interactionId: started2.id,
       payload: nextPayload,
       createdAt: prev?.createdAt,
      });
     }

     return Response.json(
      {
       id: started2.id,
       sig: newSig,
       recordId: rid || undefined,
       status: 'in_progress',
       stage: 2,
       stage1Cached: false,
       partialReport: s1Report,
       progress: inspectJdStreamProgress(2, '', s1Report, false),
       text: '',
       thoughts: polled.thoughts,
      },
      { headers: noCache },
     );
    }
   }

   // ---- Stage 2 (or Legacy Single-Pass) Completed: Merge Stage 1 + Stage 2 ----
   const report = partialReport
    ? mergeStage1AndStage2Report(partialReport, polled.text)
    : parseAndEnrichJdReport(polled.text);

   const combinedThoughts = [prev?.payload?.stage1Thoughts, polled.thoughts].filter(Boolean).join('\n\n');
   const combinedRaw = [prev?.payload?.stage1RawText, polled.text].filter(Boolean).join('\n\n');
   const combinedUsage = combineUsage(prev?.payload?.stage1Usage, polled.usage);

   const effectiveCk = prev?.payload?.cacheKey || ck;
   if (
    report &&
    (report.questions.length > 0 || hasStructuredStudyQuizzes(report)) &&
    effectiveCk.startsWith('jd')
   ) {
    const canWriteCache =
     (ckSig && ckSig === (await signToken(user.id, effectiveCk))) ||
     Boolean(prev?.payload?.cacheKey);
    if (canWriteCache) {
     await writePromptCache(
      effectiveCk,
      'jd-research',
      ANTIGRAVITY_AGENT_ID,
      { report, rawText: combinedRaw, thoughts: combinedThoughts, usage: combinedUsage } satisfies CachedJdPayload,
      7 * 24 * 3600_000,
     );
    }
   }

   if (rid) {
    const merged: StoredJdRecordPayload = {
     kind: prev?.payload?.kind || 'jd',
     source: prev?.payload?.source || '',
     cacheKey: effectiveCk,
     stage1CacheKey: prev?.payload?.stage1CacheKey,
     stage: 2,
     cached: false,
     stage1Cached,
     partialReport: null,
     report,
     rawText: combinedRaw,
     thoughts: combinedThoughts,
     usage: combinedUsage,
     imported: prev?.payload?.imported ?? null,
    };
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: report?.roleTitle || prev?.title || '深度调研报告',
     subtitle: makeSubtitle(report) || prev?.subtitle || '',
     status: report ? 'completed' : 'error',
     interactionId: activeInteractionId,
     payload: report ? merged : { ...merged, error: '报告结果解析不完整，可点击「一键重试」重新生成。' },
     createdAt: prev?.createdAt,
    });
   }

   return Response.json(
    {
     id: activeInteractionId,
     recordId: rid || undefined,
     status: 'completed',
     cached: false,
     stage1Cached,
     report,
     rawText: combinedRaw,
     thoughts: combinedThoughts,
     usage: combinedUsage,
    },
    { headers: noCache },
   );
  }

  if ((polled.status === 'failed' || polled.status === 'cancelled') && rid) {
   if (prev) {
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: prev.title,
     subtitle: prev.subtitle,
     status: 'error',
     interactionId: activeInteractionId,
     payload: { ...prev.payload, error: polled.error || '调研任务中断，可点击一键重试' },
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
