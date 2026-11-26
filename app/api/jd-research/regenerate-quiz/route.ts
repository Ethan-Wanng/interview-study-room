import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import { combineTokenUsage, prepareDeepModelExecution } from '@/lib/deep-model-route';
import { runSelectedDeepModelStream } from '@/lib/gemini';
import {
 buildJdStudyRegenQuizInput,
 getJdStudyRegenQuizSystemPrompt,
 parseSingleStudyQuiz,
} from '@/lib/jd-research-server';
import type { AiTokenUsage, JdInputKind, JdResearchReport } from '@/lib/jd-research-types';

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
 usage?: AiTokenUsage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

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

  const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
  let out: Awaited<ReturnType<typeof runSelectedDeepModelStream>>;
  try {
   out = await runSelectedDeepModelStream({
    model: exec.model,
    thinkingLevel: exec.thinkingLevel,
    custom: exec.custom,
    systemPrompt: regenSystem,
    userInput,
    maxTokens: 6144,
    signal: req.signal,
    validate: validateQuiz,
   });
  } catch (err) {
   await exec.refund();
   throw err;
  }

  const nextQuiz = parseSingleStudyQuiz(out.text, stepIdx, qIdx, oldQuiz.id, oldQuiz.dimension);
  if (!nextQuiz) {
   await exec.refund();
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
  const nextUsage = combineTokenUsage(rec.payload.usage, out.usage);

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
    model: out.model,
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
