import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { currentAdmin } from '@/lib/admin-auth';
import { beijingDayWindow, refundDailyJdQuota, tryConsumeDailyJdQuota } from '@/lib/jd-daily-limit';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 combineTokenUsage,
 parseRequestedDeepModel,
 prepareDeepModelExecution,
 resolveDeepModelLabel,
} from '@/lib/deep-model-route';
import {
 buildJdPhaseQuizzesInput,
 buildJdStage1Input,
 buildJdStage2QuestionsInput,
 combinePhaseQuizzes,
 createThinkJsonStreamSplitter,
 extractThoughtsAndJson,
 getJdResearchPhaseQuizzesSystemPrompt,
 getJdResearchStage1SystemPrompt,
 getJdResearchStage2QuestionsSystemPrompt,
 getReusedQuizzesForPhase,
 inspectJdStreamProgress,
 mergeStage1AndStage2Report,
 normalizeJdSourceForCache,
 parseAndEnrichJdReport,
 parsePhaseQuizzes,
} from '@/lib/jd-research-server';
import { extractJdFromImages, runSelectedDeepModelStream } from '@/lib/gemini';
import { fetchJdTextFromUrl } from '@/lib/jd-extract';
import type { AiQuiz } from '@/content/journey';
import type {
 AiTokenUsage,
 JdInputKind,
 JdQuestionItem,
 JdReferenceResume,
 JdResearchReport,
} from '@/lib/jd-research-types';

const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

function signingSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.DEEPSEEK_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-jd-sig').slice(0, 48);
}

async function signToken(userId: string, token: string): Promise<string> {
 return (await sha256Hex([signingSecret(), 'jd', userId, token])).slice(0, 32);
}

type CachedJdPayload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 model?: string;
 usage?: AiTokenUsage;
 durationMs?: number;
};

type CachedStage1Payload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 model?: string;
 usage?: AiTokenUsage;
};

type CachedPhasePayload = {
 quizzes: AiQuiz[];
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AiTokenUsage;
};

type CachedQuestionsPayload = {
 questions: JdQuestionItem[];
 rawText: string;
 thoughts: string;
 model: string;
 usage?: AiTokenUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 source: string;
 hashHex?: string;
 pipeline?: 'v3-steps';
 startedAt?: number;
 durationMs?: number;
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
 stage1Usage?: AiTokenUsage;
 report: JdResearchReport | null;
 rawText: string;
 thoughts: string;
 usage?: AiTokenUsage;
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

function resumeCacheKeyOf(hashHex: string): string {
 return 'jd-resume-v1:' + hashHex;
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

async function persistCompletedStage1(opts: {
 userId: string;
 recordId: string;
 freshRec: { title: string; subtitle: string; interactionId?: string; createdAt?: number; payload: StoredJdRecordPayload };
 hashHex: string;
 modelLabel: string;
 rawText: string;
 thoughts: string;
 usage?: AiTokenUsage;
 writeCache?: boolean;
}): Promise<Record<string, unknown> | null> {
 const s1Rep = parseAndEnrichJdReport(opts.rawText);
 if (!s1Rep || (!s1Rep.roadmap.length && !s1Rep.dimensions.length)) return null;
 const extracted = extractThoughtsAndJson(opts.rawText);
 const rawJsonText = extracted.jsonRaw || opts.rawText;
 const cleanThoughts = (opts.thoughts || extracted.thoughts || '').trim();
 const s1CacheKey = stage1CacheKeyOf(opts.hashHex);
 if (opts.writeCache !== false) {
  await writePromptCache(
   s1CacheKey,
   'jd-stage1',
   opts.modelLabel,
   {
    report: s1Rep,
    rawText: rawJsonText,
    thoughts: cleanThoughts,
    model: opts.modelLabel,
    usage: opts.usage,
   } satisfies CachedStage1Payload,
   7 * 24 * 3600_000,
  );
 }
 await saveAiInterviewRecord({
  id: opts.recordId,
  userId: opts.userId,
  kind: 'jd-research',
  title: s1Rep.roleTitle || opts.freshRec.title,
  subtitle: makeSubtitle(s1Rep),
  status: 'running',
  interactionId: undefined,
  payload: {
   ...opts.freshRec.payload,
   pipeline: 'v3-steps',
   startedAt: opts.freshRec.payload?.startedAt || Date.now(),
   hashHex: opts.hashHex,
   model: opts.modelLabel,
   stage1CacheKey: s1CacheKey,
   stage: 2,
   stage1Cached: false,
   partialReport: s1Rep,
   stage1RawText: rawJsonText,
   stage1Thoughts: cleanThoughts,
   stage1Usage: opts.usage,
   thoughts: cleanThoughts,
  },
  createdAt: opts.freshRec.createdAt,
 });
 return {
  type: 'stage1',
  recordId: opts.recordId,
  stage1Cached: false,
  model: opts.modelLabel,
  partialReport: s1Rep,
  thoughts: cleanThoughts,
  usage: opts.usage,
  progress: inspectJdStreamProgress(2, '', s1Rep, false),
 };
}

async function persistCompletedPhase(opts: {
 userId: string;
 recordId: string;
 freshRec: { title: string; subtitle: string; interactionId?: string; createdAt?: number; payload: StoredJdRecordPayload };
 s1Rep: JdResearchReport;
 hashHex: string;
 phaseIndex: number;
 modelLabel: string;
 rawText: string;
 thoughts: string;
 usage?: AiTokenUsage;
 writeCache?: boolean;
}): Promise<Record<string, unknown> | null> {
 const generated = parsePhaseQuizzes(opts.rawText, opts.phaseIndex);
 if (generated.length < 4) return null;
 const extracted = extractThoughtsAndJson(opts.rawText);
 const rawJsonText = extracted.jsonRaw || opts.rawText;
 const cleanThoughts = (opts.thoughts || extracted.thoughts || '').trim();
 const reused = getReusedQuizzesForPhase(opts.s1Rep, opts.phaseIndex);
 const quizzes = combinePhaseQuizzes(reused, generated, opts.phaseIndex);
 const phaseKey = phaseCacheKeyOf(opts.hashHex, opts.phaseIndex);
 if (opts.writeCache !== false) {
  await writePromptCache(
   phaseKey,
   'jd-phase',
   opts.modelLabel,
   {
    quizzes,
    rawText: rawJsonText,
    thoughts: cleanThoughts,
    model: opts.modelLabel,
    usage: opts.usage,
   } satisfies CachedPhasePayload,
   7 * 24 * 3600_000,
  );
 }
 const updatedPartial: JdResearchReport = {
  ...opts.s1Rep,
  roadmap: opts.s1Rep.roadmap.map((st, idx) => (idx === opts.phaseIndex ? { ...st, quizzes } : st)),
 };
 await saveAiInterviewRecord({
  id: opts.recordId,
  userId: opts.userId,
  kind: 'jd-research',
  title: opts.freshRec.title,
  subtitle: opts.freshRec.subtitle,
  status: 'running',
  interactionId: undefined,
  payload: {
   ...opts.freshRec.payload,
   pipeline: 'v3-steps',
   startedAt: opts.freshRec.payload?.startedAt || Date.now(),
   hashHex: opts.hashHex,
   partialReport: updatedPartial,
  },
  createdAt: opts.freshRec.createdAt,
 });
 return {
  type: 'phase_done',
  phaseIndex: opts.phaseIndex,
  cached: false,
  quizCount: quizzes.length,
  model: opts.modelLabel,
  thoughts: cleanThoughts,
  usage: opts.usage,
 };
}

async function persistCompletedQuestions(opts: {
 userId: string;
 recordId: string;
 freshRec: { title: string; subtitle: string; interactionId?: string; createdAt?: number; payload: StoredJdRecordPayload };
 s1Rep: JdResearchReport;
 hashHex: string;
 modelLabel: string;
 rawText: string;
 thoughts: string;
 usage?: AiTokenUsage;
 writeCache?: boolean;
}): Promise<Record<string, unknown> | null> {
 const mergedQs = mergeStage1AndStage2Report(opts.s1Rep, opts.rawText).questions;
 if (!mergedQs.length) return null;
 const extracted = extractThoughtsAndJson(opts.rawText);
 const rawJsonText = extracted.jsonRaw || opts.rawText;
 const cleanThoughts = (opts.thoughts || extracted.thoughts || '').trim();
 const qKey = questionsCacheKeyOf(opts.hashHex);
 if (opts.writeCache !== false) {
  await writePromptCache(
   qKey,
   'jd-questions',
   opts.modelLabel,
   {
    questions: mergedQs,
    rawText: rawJsonText,
    thoughts: cleanThoughts,
    model: opts.modelLabel,
    usage: opts.usage,
   } satisfies CachedQuestionsPayload,
   7 * 24 * 3600_000,
  );
 }
 const updatedPartial: JdResearchReport = {
  ...opts.s1Rep,
  questions: mergedQs,
 };
 await saveAiInterviewRecord({
  id: opts.recordId,
  userId: opts.userId,
  kind: 'jd-research',
  title: opts.freshRec.title,
  subtitle: opts.freshRec.subtitle,
  status: 'running',
  interactionId: undefined,
  payload: {
   ...opts.freshRec.payload,
   pipeline: 'v3-steps',
   startedAt: opts.freshRec.payload?.startedAt || Date.now(),
   hashHex: opts.hashHex,
   partialReport: updatedPartial,
  },
  createdAt: opts.freshRec.createdAt,
 });
 return {
  type: 'questions_done',
  cached: false,
  questionCount: mergedQs.length,
  qTitles: mergedQs.map(q => q.title),
  model: opts.modelLabel,
  thoughts: cleanThoughts,
  usage: opts.usage,
 };
}

function createJdStepNdjsonBridge(opts: {
 step: 'stage1' | 'phase' | 'questions';
 phaseIndex: number;
 send: (ev: Record<string, unknown>) => void;
 onActiveStep: (st: string) => void;
}) {
 let deltaBuf = '';
 let lastDeltaInspectAt = 0;
 const emitDelta = (jd: string, fullBuf: string, force = false) => {
  deltaBuf = fullBuf;
  opts.onActiveStep('output');
  const now = Date.now();
  if (!force && now - lastDeltaInspectAt < 400) return;
  lastDeltaInspectAt = now;
  if (opts.step === 'stage1') {
   opts.send({
    type: 'delta',
    stage: 1,
    text: jd,
    chars: deltaBuf.length,
    progress: inspectJdStreamProgress(1, deltaBuf, null, false),
   });
  } else if (opts.step === 'phase') {
   const phaseQuizCount = (deltaBuf.match(/"type"\s*:\s*"(?:single|multi|fill|short|code)"/g) || []).length;
   opts.send({
    type: 'delta',
    stage: 2,
    phaseIndex: opts.phaseIndex,
    text: jd,
    chars: deltaBuf.length,
    phaseQuizCount,
   });
  } else {
   const qTitles = extractStreamQuestionTitles(deltaBuf);
   opts.send({
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
    opts.onActiveStep('thinking');
    opts.send({ type: 'thought', stage: opts.step === 'stage1' ? 1 : 2, text: td });
   },
   onJsonDelta: (jd, fullBuf) => {
    emitDelta(jd, fullBuf, false);
   },
  });

 let splitter = makeSplitter();
 return {
  pushText(chunk: string) {
   splitter.push(chunk);
  },
  flush() {
   splitter.flush();
  },
  reset() {
   deltaBuf = '';
   splitter = makeSplitter();
   opts.send({ type: 'reset', stage: opts.step === 'stage1' ? 1 : 2, keepThoughts: true });
  },
 };
}

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
   rawAction === 'start_step' ||
   rawAction === 'deepseek_step' ||
   rawAction === 'model_step' ||
   rawAction === 'finalize' ||
   rawAction === 'fail'
    ? rawAction
    : 'start';
  const bypassCache = body.bypassCache === true;
  const reqModel = parseRequestedDeepModel(body.model);

  // ---- Action 1: start (returns full/stage1 cache hit immediately, or prepares v3-steps run) ----
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

   const parts: string[] = [];
   if (rawSource) parts.push(rawSource);
   if (jdUrl) {
    const fromUrl = await fetchJdTextFromUrl(jdUrl);
    if (fromUrl) parts.push(fromUrl);
   }
   if (images.length) {
    const fromImg = await extractJdFromImages(images);
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
   const modelLabel = resolveDeepModelLabel(reqModel);

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
     return Response.json(
      {
       error: '每位用户每天限生成 1 份 JD / 面经深度调研，今日额度已用完，请明天再来。',
       code: 'daily_quota_exceeded',
      },
      { status: 429, headers: noCache },
     );
    }
    reservedDailyDay = daily.dayKey;
   }

   const startTimestamp = existingRec?.payload?.startedAt || Date.now();

   if (!bypassCache) {
    const hit = await readPromptCache<CachedJdPayload>(cacheKey);
    if (
     hit?.payload?.report &&
     hit.payload.report.roadmap.length > 0 &&
     hit.payload.report.roadmap.every(s => (s.quizzes?.length ?? 0) >= 4) &&
     hit.payload.report.questions.length > 0
    ) {
     const rep = hit.payload.report;
     const hitModel = hit.payload.model || hit.model || modelLabel;
     const stored: StoredJdRecordPayload = {
      kind,
      source,
      hashHex,
      pipeline: 'v3-steps',
      startedAt: startTimestamp,
      durationMs: hit.payload.durationMs,
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
       durationMs: hit.payload.durationMs,
       extractedSource: source,
      },
      { headers: noCache },
     );
    }
   }

   let s1Rep: JdResearchReport | null = null;
   let s1RawText = '';
   let s1Thoughts = '';
   let s1Model = modelLabel;
   let s1Usage: AiTokenUsage | undefined;

   if (!bypassCache) {
    const s1Hit = await readPromptCache<CachedStage1Payload>(stage1CacheKey);
    if (s1Hit?.payload?.report && s1Hit.payload.report.roadmap.length > 0) {
     s1Rep = s1Hit.payload.report;
     s1RawText = s1Hit.payload.rawText || '';
     s1Thoughts = s1Hit.payload.thoughts || '';
     s1Model = s1Hit.payload.model || s1Hit.model || modelLabel;
     s1Usage = s1Hit.payload.usage;
    } else if (existingRec?.payload?.partialReport && existingRec.payload.partialReport.roadmap.length > 0) {
     s1Rep = existingRec.payload.partialReport;
     s1RawText = existingRec.payload.stage1RawText || '';
     s1Thoughts = existingRec.payload.stage1Thoughts || '';
     s1Model = existingRec.payload.model || modelLabel;
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
     interactionId: undefined,
     payload: {
      kind,
      source,
      hashHex,
      pipeline: 'v3-steps',
      startedAt: startTimestamp,
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

   await saveAiInterviewRecord({
    id: recordId,
    userId: user.id,
    kind: 'jd-research',
    title: existingRec?.title || initialTitle,
    subtitle: existingRec?.subtitle || '',
    status: 'running',
    interactionId: undefined,
    payload: {
     kind,
     source,
     hashHex,
     pipeline: 'v3-steps',
     startedAt: startTimestamp,
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
     status: 'use_model_step',
     step: 'stage1',
     recordId,
     hashHex,
     title: existingRec?.title || initialTitle,
     model: modelLabel,
     extractedSource: source,
    },
    { headers: noCache },
   );
  }

  // ---- Action 2: start_step (Stage 2 per-phase quizzes or interview questions, checkpoint-aware) ----
  if (action === 'start_step') {
   await rateLimit('jd-research-step:' + user.id, 180);
   const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
   const step = body.step === 'questions' ? 'questions' : 'phase';
   const phaseIndex = Number.isInteger(Number(body.phaseIndex)) ? Number(body.phaseIndex) : 0;

   if (!recordId) throw new AuthError('缺少任务标识。', 400);
   const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   const s1Rep = rec?.payload?.partialReport;
   if (!rec || !s1Rep) throw new AuthError('阶段一数据未就绪，请重试。', 404);

   const kind: JdInputKind = rec.payload.kind || 'jd';
   const source = rec.payload.source || '';
   const hashHex = rec.payload.hashHex || (await sha256Hex([kind, normalizeJdSourceForCache(source)]));
   const modelLabel = resolveDeepModelLabel(reqModel);

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
        model: hit.payload.model || hit.model || modelLabel,
       },
       { headers: noCache },
      );
     }
     const existingQuizzes = s1Rep.roadmap[phaseIndex]?.quizzes;
     if (existingQuizzes && existingQuizzes.length >= 4) {
      await writePromptCache(
       phaseKey,
       'jd-phase',
       rec.payload.model || modelLabel,
       {
        quizzes: existingQuizzes,
        rawText: '',
        thoughts: '',
        model: rec.payload.model || modelLabel,
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
        model: rec.payload.model || modelLabel,
       },
       { headers: noCache },
      );
     }
    }

    return Response.json(
     {
      ok: true,
      status: 'use_model_step',
      step: 'phase',
      phaseIndex,
      model: modelLabel,
     },
     { headers: noCache },
    );
   }

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
       model: hit.payload.model || hit.model || modelLabel,
      },
      { headers: noCache },
     );
    }
    if (s1Rep.questions && s1Rep.questions.length > 0) {
     await writePromptCache(
      qKey,
      'jd-questions',
      rec.payload.model || modelLabel,
      {
       questions: s1Rep.questions,
       rawText: '',
       thoughts: '',
       model: rec.payload.model || modelLabel,
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
       model: rec.payload.model || modelLabel,
      },
      { headers: noCache },
     );
    }
   }

   return Response.json(
    {
     ok: true,
     status: 'use_model_step',
     step: 'questions',
     model: modelLabel,
    },
    { headers: noCache },
   );
  }

  // ---- Action 3: deepseek_step / model_step (NDJSON stream using selected site DeepSeek or custom API) ----
  if (action === 'deepseek_step' || action === 'model_step') {
   await rateLimit('jd-research-ds:' + user.id, 90);
   const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
   const step = body.step === 'phase' ? 'phase' : body.step === 'questions' ? 'questions' : 'stage1';
   const phaseIndex = Number.isInteger(Number(body.phaseIndex)) ? Number(body.phaseIndex) : 0;

   if (!recordId) throw new AuthError('缺少任务标识。', 400);
   const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
   if (!rec) throw new AuthError('未找到调研记录。', 404);

   const kind: JdInputKind = rec.payload.kind || 'jd';
   const source = rec.payload.source || '';
   const hashHex = rec.payload.hashHex || (await sha256Hex([kind, normalizeJdSourceForCache(source)]));

   if (step !== 'stage1' && !rec.payload?.partialReport) {
    throw new AuthError('阶段一数据未就绪，请重试。', 404);
   }
   if (step === 'phase' && (phaseIndex < 0 || phaseIndex >= rec.payload.partialReport!.roadmap.length)) {
    throw new AuthError('路径索引超出范围。', 400);
   }

   const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel, { chargeSiteQuota: false });

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
       step,
       phaseIndex: step === 'phase' ? phaseIndex : undefined,
       model: exec.displayLabel,
      });

      if (!bypassCache) {
       if (step === 'stage1') {
        const s1Hit = await readPromptCache<CachedStage1Payload>(stage1CacheKeyOf(hashHex));
        if (s1Hit?.payload?.report && s1Hit.payload.report.roadmap.length > 0) {
         send({
          type: 'stage1',
          recordId,
          stage1Cached: true,
          model: s1Hit.payload.model || s1Hit.model || exec.displayLabel,
          partialReport: s1Hit.payload.report,
          thoughts: s1Hit.payload.thoughts || '',
          usage: s1Hit.payload.usage,
          progress: inspectJdStreamProgress(2, '', s1Hit.payload.report, true),
         });
         return;
        }
       } else if (step === 'phase') {
        const pHit = await readPromptCache<CachedPhasePayload>(phaseCacheKeyOf(hashHex, phaseIndex));
        if (pHit?.payload?.quizzes && pHit.payload.quizzes.length >= 4) {
         send({
          type: 'phase_done',
          phaseIndex,
          cached: true,
          quizCount: pHit.payload.quizzes.length,
          model: pHit.payload.model || pHit.model || exec.displayLabel,
          thoughts: pHit.payload.thoughts || '',
          usage: pHit.payload.usage,
         });
         return;
        }
       } else {
        const qHit = await readPromptCache<CachedQuestionsPayload>(questionsCacheKeyOf(hashHex));
        if (qHit?.payload?.questions && qHit.payload.questions.length > 0) {
         send({
          type: 'questions_done',
          cached: true,
          questionCount: qHit.payload.questions.length,
          qTitles: qHit.payload.questions.map(q => q.title),
          model: qHit.payload.model || qHit.model || exec.displayLabel,
          thoughts: qHit.payload.thoughts || '',
          usage: qHit.payload.usage,
         });
         return;
        }
       }
      }

      const charged = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);

      const freshRec = (await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId)) || rec;
      const s1Rep = freshRec.payload?.partialReport;
      const bridge = createJdStepNdjsonBridge({
       step,
       phaseIndex,
       send,
       onActiveStep: st => {
        activeStep = st;
       },
      });

      let systemPrompt: string;
      let userInput: string;
      let validate: (text: string) => boolean;
      if (step === 'stage1') {
       systemPrompt = getJdResearchStage1SystemPrompt();
       userInput = buildJdStage1Input({ kind, source });
       validate = text => {
        const rep = parseAndEnrichJdReport(text);
        return Boolean(rep && (rep.roadmap.length > 0 || rep.dimensions.length > 0));
       };
      } else if (step === 'phase') {
       systemPrompt = getJdResearchPhaseQuizzesSystemPrompt();
       userInput = buildJdPhaseQuizzesInput({
        kind,
        source,
        stage1: s1Rep!,
        phaseIndex,
        reusedQuizzes: getReusedQuizzesForPhase(s1Rep!, phaseIndex),
       });
       validate = text => parsePhaseQuizzes(text, phaseIndex).length >= 4;
      } else {
       systemPrompt = getJdResearchStage2QuestionsSystemPrompt();
       userInput = buildJdStage2QuestionsInput({ kind, source, stage1: s1Rep! });
       validate = text => mergeStage1AndStage2Report(s1Rep!, text).questions.length > 0;
      }

      let dsOut: Awaited<ReturnType<typeof runSelectedDeepModelStream>>;
      try {
       dsOut = await runSelectedDeepModelStream({
        model: charged.model,
        thinkingLevel: charged.thinkingLevel,
        custom: charged.custom,
        systemPrompt,
        userInput,
        maxTokens: step === 'stage1' ? 10240 : 12288,
        signal: req.signal,
        validate,
        onModel: m => send({ type: 'step', stepType: 'thinking', model: m }),
        onThoughtDelta: td => {
         activeStep = 'thinking';
         send({ type: 'thought', stage: step === 'stage1' ? 1 : 2, text: td });
        },
        onTextDelta: td => bridge.pushText(td),
        onReset: () => bridge.reset(),
       });
       bridge.flush();
      } catch (err) {
       await charged.refund();
       throw err;
      }

      if (req.signal?.aborted) return;

      const latestRec = (await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId)) || freshRec;
      let doneEv: Record<string, unknown> | null = null;
      if (step === 'stage1') {
       doneEv = await persistCompletedStage1({
        userId: user.id,
        recordId,
        freshRec: latestRec,
        hashHex,
        modelLabel: dsOut.model,
        rawText: dsOut.text,
        thoughts: dsOut.thoughts,
        usage: dsOut.usage,
        writeCache: !charged.custom,
       });
      } else if (step === 'phase') {
       doneEv = await persistCompletedPhase({
        userId: user.id,
        recordId,
        freshRec: latestRec,
        s1Rep: latestRec.payload?.partialReport || s1Rep!,
        hashHex,
        phaseIndex,
        modelLabel: dsOut.model,
        rawText: dsOut.text,
        thoughts: dsOut.thoughts,
        usage: dsOut.usage,
        writeCache: !charged.custom,
       });
      } else {
       doneEv = await persistCompletedQuestions({
        userId: user.id,
        recordId,
        freshRec: latestRec,
        s1Rep: latestRec.payload?.partialReport || s1Rep!,
        hashHex,
        modelLabel: dsOut.model,
        rawText: dsOut.text,
        thoughts: dsOut.thoughts,
        usage: dsOut.usage,
        writeCache: !charged.custom,
       });
      }

      if (!doneEv) {
       await charged.refund();
       send({
        type: 'retry_step',
        step,
        phaseIndex: step === 'phase' ? phaseIndex : undefined,
        reason: '模型输出解析不完整，重试中',
       });
       return;
      }
      send(doneEv);
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
   const resumeHit = await readPromptCache<{ resume?: JdReferenceResume }>(resumeCacheKeyOf(hashHex));
   const existingResume = rec.payload?.report?.resume || s1Rep.resume || resumeHit?.payload?.resume;

   const mergedRoadmap = s1Rep.roadmap.map((step, idx) => {
    const qz = phaseHits[idx]?.payload?.quizzes;
    return qz && qz.length ? { ...step, quizzes: qz } : step;
   });
   const finalQuestions = qHit?.payload?.questions?.length ? qHit.payload.questions : s1Rep.questions;
   const finalReport: JdResearchReport = {
    ...s1Rep,
    roadmap: mergedRoadmap,
    questions: finalQuestions,
    ...(existingResume ? { resume: existingResume } : {}),
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
   const combinedModel = [...modelSet].filter(Boolean).join(' / ') || resolveDeepModelLabel(reqModel);

   let totalUsage: AiTokenUsage | undefined = rec.payload.stage1Usage;
   for (const h of phaseHits) {
    if (h?.payload?.usage) totalUsage = combineTokenUsage(totalUsage, h.payload.usage);
   }
   if (qHit?.payload?.usage) totalUsage = combineTokenUsage(totalUsage, qHit.payload.usage);

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
    s2Thoughts ? (s1Thoughts ? `── 阶段二：分步出题 ──\n${s2Thoughts}` : s2Thoughts) : '',
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

   const rawDur = Number(body.durationMs);
   const durationMs =
    Number.isFinite(rawDur) && rawDur > 0
     ? Math.min(3_600_000, Math.round(rawDur))
     : rec.payload.startedAt
       ? Math.max(1000, Math.min(3_600_000, Date.now() - rec.payload.startedAt))
       : undefined;

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
      durationMs,
     } satisfies CachedJdPayload,
     7 * 24 * 3600_000,
    );
   }

   const stored: StoredJdRecordPayload = {
    kind,
    source,
    hashHex,
    pipeline: 'v3-steps',
    startedAt: rec.payload.startedAt,
    durationMs,
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
    interactionId: undefined,
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
     durationMs,
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
     interactionId: undefined,
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
  const rid = (url.searchParams.get('rid') || '').trim();

  if (!id || !sig || id.length > 160) throw new AuthError('缺少任务标识。', 400);
  const prev = rid ? await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid) : null;

  const expectedIdSig = await signToken(user.id, id);
  const expectedRidSig = rid ? await signToken(user.id, rid) : '';
  const expectedPrevIdSig = prev?.interactionId ? await signToken(user.id, prev.interactionId) : '';
  if (sig !== expectedIdSig && sig !== expectedRidSig && sig !== expectedPrevIdSig) {
   throw new AuthError('无权查询该调研任务。', 403);
  }

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
     durationMs: prev.payload.durationMs,
    },
    { headers: noCache },
   );
  }

  return Response.json(
   {
    id: prev?.interactionId || id,
    recordId: rid || undefined,
    status: prev?.status === 'error' ? 'failed' : 'in_progress',
    stage: prev?.payload?.stage === 2 ? 2 : 1,
    stage1Cached: Boolean(prev?.payload?.stage1Cached),
    partialReport: prev?.payload?.partialReport ?? null,
    error: prev?.payload?.error || '',
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询调研进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
