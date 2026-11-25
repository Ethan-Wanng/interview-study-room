import { AuthError, assertSameOrigin, sessionUser } from '@/lib/site-auth';
import {
 buildJdPhaseQuizzesInput,
 buildJdProjectDrillInput,
 buildJdProjectDrillRegenQuizInput,
 buildJdResumeInput,
 buildJdStage1Input,
 buildJdStage2QuestionsInput,
 combinePhaseQuizzes,
 getJdProjectDrillRegenQuizSystemPrompt,
 getJdProjectDrillSystemPrompt,
 getJdResearchPhaseQuizzesSystemPrompt,
 getJdResearchStage1SystemPrompt,
 getJdResearchStage2QuestionsSystemPrompt,
 getJdResumeSystemPrompt,
 getReusedQuizzesForPhase,
 mergeStage2Parts,
 parseAndEnrichJdReport,
 parseJdProjectDrill,
 parseJdReferenceResume,
 parsePhaseQuizzes,
 parseSingleStudyQuiz,
} from '@/lib/jd-research-server';
import type { AiQuiz } from '@/content/journey';
import type { JdInputKind, JdResearchReport } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

// Read-only, zero-LLM, zero-quota helper for browser-direct local bridge mode:
// builds server-side curriculum-aware prompts and parses/enriches raw JSON responses
// without bundling course journeys into client JavaScript.
export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);

  const raw = await req.text();
  if (raw.length > 600_000) throw new AuthError('请求内容过大。', 413);
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const action = body.action === 'parse' ? 'parse' : 'prompts';
  const task = typeof body.task === 'string' ? body.task : '';

  if (action === 'prompts') {
   if (task === 'stage1') {
    const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 12_000) : '';
    if (source.length < 15) throw new AuthError('请先输入岗位 JD 或面经内容（至少 15 字）。', 400);
    return Response.json(
     {
      system: getJdResearchStage1SystemPrompt(),
      user: buildJdStage1Input({ kind, source }),
     },
     { headers: noCache },
    );
   }

   if (task === 'phase-quizzes') {
    const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 12_000) : '';
    const stage1 = body.stage1 as JdResearchReport | undefined;
    const phaseIndex = Number(body.phaseIndex);
    if (!stage1 || !Array.isArray(stage1.roadmap) || !Number.isInteger(phaseIndex) || phaseIndex < 0 || phaseIndex >= stage1.roadmap.length) {
     throw new AuthError('无效的复习阶段参数。', 400);
    }
    const reusedQuizzes = getReusedQuizzesForPhase(stage1, phaseIndex);
    return Response.json(
     {
      system: getJdResearchPhaseQuizzesSystemPrompt(),
      user: buildJdPhaseQuizzesInput({ kind, source, stage1, phaseIndex, reusedQuizzes }),
      reusedQuizzes,
     },
     { headers: noCache },
    );
   }

   if (task === 'questions') {
    const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 12_000) : '';
    const stage1 = body.stage1 as JdResearchReport | undefined;
    if (!stage1 || !Array.isArray(stage1.roadmap)) {
     throw new AuthError('缺少阶段一报告。', 400);
    }
    return Response.json(
     {
      system: getJdResearchStage2QuestionsSystemPrompt(),
      user: buildJdStage2QuestionsInput({ kind, source, stage1 }),
     },
     { headers: noCache },
    );
   }

   if (task === 'resume') {
    const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 12_000) : '';
    const report = body.report as JdResearchReport | undefined;
    if (!report || !report.roleTitle) {
     throw new AuthError('缺少调研报告。', 400);
    }
    return Response.json(
     {
      system: getJdResumeSystemPrompt(),
      user: buildJdResumeInput({ kind, source, report }),
     },
     { headers: noCache },
    );
   }

   if (task === 'project-drill') {
    const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 12_000) : '';
    const report = body.report as JdResearchReport | undefined;
    const projIdx = Number(body.projIdx);
    const project = report?.resume?.projects?.[projIdx];
    if (!report || !project) {
     throw new AuthError('未找到对应的简历项目。', 400);
    }
    return Response.json(
     {
      system: getJdProjectDrillSystemPrompt(),
      user: buildJdProjectDrillInput({ kind, source, report, project, projIdx }),
     },
     { headers: noCache },
    );
   }

   if (task === 'project-drill-regen-quiz') {
    const report = body.report as JdResearchReport | undefined;
    const projIdx = Number(body.projIdx);
    const quizIdx = Number(body.quizIdx);
    const project = report?.resume?.projects?.[projIdx];
    const currentQuiz = project?.drill?.quizzes?.[quizIdx];
    if (!report || !project || !currentQuiz) {
     throw new AuthError('未找到对应的练习题。', 400);
    }
    const existingStems = (project.drill?.quizzes ?? []).map(q => q.q);
    return Response.json(
     {
      system: getJdProjectDrillRegenQuizSystemPrompt(),
      user: buildJdProjectDrillRegenQuizInput({ report, project, currentQuiz, existingStems }),
     },
     { headers: noCache },
    );
   }

   throw new AuthError('不支持的本地辅助任务。', 400);
  }

  // action === 'parse'
  if (task === 'stage1') {
   const rawText = typeof body.rawText === 'string' ? body.rawText : '';
   const report = parseAndEnrichJdReport(rawText);
   if (!report) throw new AuthError('阶段一结果解析失败，请重试。', 422);
   return Response.json({ report }, { headers: noCache });
  }

  if (task === 'phase-quizzes') {
   const rawText = typeof body.rawText === 'string' ? body.rawText : '';
   const phaseIndex = Number(body.phaseIndex);
   const reusedQuizzes = Array.isArray(body.reusedQuizzes) ? (body.reusedQuizzes as AiQuiz[]) : [];
   const generated = parsePhaseQuizzes(rawText, Number.isInteger(phaseIndex) ? phaseIndex : 0);
   const quizzes = combinePhaseQuizzes(reusedQuizzes, generated, Number.isInteger(phaseIndex) ? phaseIndex : 0);
   if (!quizzes.length) throw new AuthError('该阶段练习题解析失败，请重试。', 422);
   return Response.json({ quizzes }, { headers: noCache });
  }

  if (task === 'merge-stage2') {
   const stage1 = body.stage1 as JdResearchReport | undefined;
   const phaseQuizLists = Array.isArray(body.phaseQuizLists) ? (body.phaseQuizLists as (AiQuiz[] | null)[]) : [];
   const questionsRawText = typeof body.questionsRawText === 'string' ? body.questionsRawText : '';
   if (!stage1 || !Array.isArray(stage1.roadmap)) throw new AuthError('缺少阶段一报告。', 400);
   const report = mergeStage2Parts(stage1, phaseQuizLists, questionsRawText);
   return Response.json({ report }, { headers: noCache });
  }

  if (task === 'resume') {
   const rawText = typeof body.rawText === 'string' ? body.rawText : '';
   const roleTitle = typeof body.roleTitle === 'string' ? body.roleTitle : '';
   const resume = parseJdReferenceResume(rawText, roleTitle);
   if (!resume) throw new AuthError('参考简历解析失败，请重试。', 422);
   return Response.json({ resume }, { headers: noCache });
  }

  if (task === 'project-drill') {
   const rawText = typeof body.rawText === 'string' ? body.rawText : '';
   const projIdx = Number(body.projIdx);
   const drill = parseJdProjectDrill(rawText, Number.isInteger(projIdx) ? projIdx : 0);
   if (!drill) throw new AuthError('项目深挖预判解析失败，请重试。', 422);
   return Response.json({ drill }, { headers: noCache });
  }

  if (task === 'project-drill-regen-quiz') {
   const rawText = typeof body.rawText === 'string' ? body.rawText : '';
   const projIdx = Number(body.projIdx);
   const quizIdx = Number(body.quizIdx);
   const fallbackId = typeof body.fallbackId === 'string' ? body.fallbackId : '';
   const fallbackDimension = typeof body.fallbackDimension === 'string' ? body.fallbackDimension : undefined;
   const quiz = parseSingleStudyQuiz(
    rawText,
    Number.isInteger(projIdx) ? projIdx : 0,
    Number.isInteger(quizIdx) ? quizIdx : 0,
    fallbackId,
    fallbackDimension,
   );
   if (!quiz) throw new AuthError('重出题目解析失败，请重试。', 422);
   return Response.json({ quiz }, { headers: noCache });
  }

  throw new AuthError('不支持的解析任务。', 400);
 } catch (e) {
  if (e instanceof AuthError) {
   return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  }
  return Response.json({ error: '本地辅助处理失败，请重试。' }, { status: 500, headers: noCache });
 }
}
