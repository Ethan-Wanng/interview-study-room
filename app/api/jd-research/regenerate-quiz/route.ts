import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { consumeSiteAiQuota } from '@/lib/site-ai-quota';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdStudyRegenQuizInput,
 getJdStudyRegenQuizSystemPrompt,
 parseSingleStudyQuiz,
} from '@/lib/jd-research-server';
import { isAntigravityRateLimitError, runAntigravityBackgroundToCompletion, type AntigravityUsage } from '@/lib/antigravity-agent';
import { runDeepSeekJdFallbackStream } from '@/lib/gemini';
import type { JdInputKind, JdResearchReport } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

type StoredJdRecordPayload = {
 kind?: JdInputKind;
 source?: string;
 model?: string;
 cacheKey?: string;
 stage1CacheKey?: string;
 stage?: 1 | 2;
 cached?: boolean;
 stage1Cached?: boolean;
 report: JdResearchReport | null;
 rawText?: string;
 thoughts?: string;
 usage?: AntigravityUsage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

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

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再重出题目。', 401);
  if (user.is_guest) throw new AuthError('游客暂不支持重出题目，请登录后使用。', 403);
  await rateLimit('jd-regen:' + user.id, 30);

  let body: Record<string, unknown>;
  try {
   body = (await req.json()) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const recordId = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const stepIdx = Number(body.stepIdx);
  const quizId = typeof body.quizId === 'string' ? body.quizId.trim().slice(0, 80) : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  const geminiProxy = body.geminiProxy !== false;

  if (!recordId || !quizId || !Number.isInteger(stepIdx) || stepIdx < 0) {
   throw new AuthError('缺少必要的题目定位参数。', 400);
  }

  const rec = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
  const report = rec?.payload?.report;
  if (!rec || !report) throw new AuthError('未找到该专题记录。', 404);

  const step = report.roadmap[stepIdx];
  const quizzes = step?.quizzes;
  if (!step || !Array.isArray(quizzes)) throw new AuthError('未找到对应的复习路径阶段。', 404);

  const qIdx = quizzes.findIndex(q => q.id === quizId);
  if (qIdx < 0) throw new AuthError('未找到要重出的题目。', 404);

  const oldQuiz = quizzes[qIdx];
  const targetType = oldQuiz.type ?? 'single';
  const regenSystem = getJdStudyRegenQuizSystemPrompt();
  const userInput = buildJdStudyRegenQuizInput({
   report,
   stepIdx,
   qIdx,
   source: rec.payload.source,
   reason,
  });

  const validateQuiz = (txt: string) => {
   const parsed = parseSingleStudyQuiz(txt, stepIdx, qIdx, oldQuiz.id, oldQuiz.dimension);
   return Boolean(parsed && (parsed.type ?? 'single') === targetType);
  };

  const siteQ = await consumeSiteAiQuota(req, user, 'gemini');
  if (!siteQ.ok) throw new AuthError(siteQ.message, siteQ.status);

  let out: { text: string; thoughts: string; modelLabel: string; usage?: AntigravityUsage };
  try {
   out = await runAntigravityBackgroundToCompletion({
    systemInstruction: regenSystem,
    input: userInput,
    maxTotalTokens: 24_000,
    geminiProxy,
    signal: req.signal,
    validate: validateQuiz,
   });
  } catch (agentErr) {
   // Strictly fallback to DeepSeek ONLY when Antigravity Agent hits rate limiting (429 / quota / resource_exhausted).
   if (req.signal?.aborted || !isAntigravityRateLimitError(agentErr)) {
    throw agentErr;
   }
   const dsOut = await runDeepSeekJdFallbackStream({
    systemPrompt: regenSystem,
    userInput,
    maxTokens: 6144,
    thinkingLevel: 'low',
    signal: req.signal,
    validate: validateQuiz,
   });
   out = {
    text: dsOut.text,
    thoughts: dsOut.thoughts,
    modelLabel: dsOut.model,
    usage: dsOut.usage,
   };
  }

  const nextQuiz = parseSingleStudyQuiz(out.text, stepIdx, qIdx, oldQuiz.id, oldQuiz.dimension);
  if (!nextQuiz) {
   return Response.json({ error: '重出题目解析失败，请再试一次。' }, { status: 502, headers: noCache });
  }

  const nextReport: JdResearchReport = {
   ...report,
   roadmap: report.roadmap.map((s, idx) =>
    idx === stepIdx
     ? { ...s, quizzes: (s.quizzes ?? []).map((q, qi) => (qi === qIdx ? nextQuiz : q)) }
     : s,
   ),
  };
  const nextUsage = combineUsage(rec.payload.usage, out.usage);

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
    report: nextReport,
    usage: nextUsage,
   },
   createdAt: rec.createdAt,
  });

  return Response.json(
   {
    ok: true,
    quiz: nextQuiz,
    report: nextReport,
    usage: nextUsage,
    model: out.modelLabel,
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) {
   return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  }
  return Response.json({ error: '重出题目失败，请稍后重试。' }, { status: 502, headers: noCache });
 }
}
