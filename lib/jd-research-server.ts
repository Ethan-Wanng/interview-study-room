// Server-only JD / Interview Experience deep research helpers:
//  1. Builds a static, prompt-cache-friendly curriculum catalog of all real in-site courses/levels.
//  2. Two-stage generation prompts (Stage 1: Profile + Roadmap; Stage 2: Path Study Quizzes + Interview Questions)
//     to eliminate output-token truncation and surface Stage 1 results immediately while Stage 2 runs.
//  3. Truncation-resilient JSON salvaging so partial arrays still recover all completed items.
//  4. Verifies every returned in-site link against real routes and enriches missing links via searchSite().

import { aiLevels } from '@/content/ai-journey';
import { goLevels } from '@/content/go-journey';
import { backendLevels } from '@/content/backend-journey';
import { frontendLevels } from '@/content/frontend-journey';
import { rustLevels } from '@/content/rust-journey';
import { pythonLevels } from '@/content/python-journey';
import { projectLevels } from '@/content/project-journey';
import { aiSupportLevels } from '@/content/ai-support-journey';
import { aiExams } from '@/content/exams/ai';
import { goExams } from '@/content/exams/go';
import { backendExams } from '@/content/exams/backend';
import { frontendExams } from '@/content/exams/frontend';
import { rustExams } from '@/content/exams/rust';
import { pythonExams } from '@/content/exams/python';
import type { AiLevel, AiQuiz, Exam } from '@/content/journey';
import { searchSite } from './site-search';
import { MY_LIMITS } from './my-questions';
import type {
 JdInputKind,
 JdLiveProgress,
 JdQuestionItem,
 JdResearchReport,
 JdRoadmapStep,
 JdSiteLink,
 JdSkillDimension,
 JdStageKey,
} from './jd-research-types';

const VALID_SUBJECTS = new Set(['go', 'backend', 'ai-development', 'frontend', 'mine']);

const COURSES: { id: string; name: string; levels: AiLevel[]; exams?: Exam[] }[] = [
 { id: 'go', name: 'Go 开发', levels: goLevels, exams: goExams },
 { id: 'backend', name: '后端通用', levels: backendLevels, exams: backendExams },
 { id: 'ai', name: 'AI 开发', levels: aiLevels, exams: aiExams },
 { id: 'frontend', name: '前端开发', levels: frontendLevels, exams: frontendExams },
 { id: 'rust', name: 'Rust 开发', levels: rustLevels, exams: rustExams },
 { id: 'python', name: 'Python 开发', levels: pythonLevels, exams: pythonExams },
 { id: 'ai-support', name: '智能 AI 客服实战', levels: aiSupportLevels },
 { id: 'project', name: '复刻面试自习室', levels: projectLevels },
];

const EXTRA_ROUTES: JdSiteLink[] = [
 { label: '面试题库 · Go', href: '/interview?track=go' },
 { label: '面试题库 · 后端通用', href: '/interview?track=backend' },
 { label: '面试题库 · AI 开发', href: '/interview?track=ai-development' },
 { label: '面试题库 · 前端开发', href: '/interview?track=frontend' },
 { label: '高阶模拟面试 · 系统设计评审', href: '/interview/architect' },
 { label: '代码操场', href: '/playground' },
];

type CatalogCache = {
 promptText: string;
 validLinks: Map<string, string>; // href -> canonical label
};

let cachedCatalog: CatalogCache | null = null;

function getCatalog(): CatalogCache {
 if (cachedCatalog) return cachedCatalog;
 const lines: string[] = [];
 const validLinks = new Map<string, string>();

 for (const c of COURSES) {
  const courseHref = `/learn/${c.id}`;
  validLinks.set(courseHref, c.name);
  const items: string[] = [];
  c.levels.forEach((lv, idx) => {
   const href = `/learn/${c.id}?level=${encodeURIComponent(lv.id)}`;
   const label = `${c.name} · 第${idx + 1}关 ${lv.title}`;
   validLinks.set(href, label);
   items.push(`${lv.id}:${lv.title}`);
  });
  lines.push(`- ${c.name} (${courseHref}?level=<id>): ${items.join(' | ')}`);
 }

 for (const ex of EXTRA_ROUTES) {
  validLinks.set(ex.href, ex.label);
 }
 lines.push(
  `- 专项入口: ${EXTRA_ROUTES.map(r => `${r.label} (${r.href})`).join(' | ')}`,
 );

 cachedCatalog = { promptText: lines.join('\n'), validLinks };
 return cachedCatalog;
}

export function normalizeJdSourceForCache(source: string): string {
 return source
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map(l => l.replace(/[ \t\f\v]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n')
  .trim();
}

let cachedStage1Prompt: string | null = null;
let cachedStage2Prompt: string | null = null;
let cachedFullPrompt: string | null = null;

// Stage 1 Static System Prompt (byte-identical across all calls to maximize upstream prompt cache hits):
// Outputs ONLY Competency Profile + Review Roadmap (fast, compact, never truncates).
export function getJdResearchStage1SystemPrompt(): string {
 if (cachedStage1Prompt) return cachedStage1Prompt;
 const { promptText } = getCatalog();
 cachedStage1Prompt = `你是顶级技术面试教研专家与大厂资深架构面试官。当前为【第 1 步：生成考点画像与分阶段复习路径】。
请根据用户提供的「岗位 JD」或「真实面经」，自主判断该岗位的真实职级难度与合理备考周期，进行深度岗位拆解，生成核心考点权重画像、高频扣分点与可执行分阶段复习路径（关联真实站内课程链接）。

严格规则：
1. 自主决策规模：依据 JD / 面经的技术广度与考察深度，自主判定 \`inferredLevel\`（如「校招 / 初级」「中高级」「资深 / 架构」）、\`prepDays\`（如「5 天」「7 天」「14 天」「21 天」）与 \`roadmap\` 阶段数（3–4 阶段），\`dimensions\` 权重之和尽量为 100。
2. 严禁调用任何工具、执行命令、读写文件或搜索网页；直接输出**一个合法 JSON 对象**（用 \`\`\`json 和 \`\`\` 包裹，不要在代码块外写其他解释文字），字段严格按下方顺序输出。
3. 复习路径中的 \`siteLinks\` 只能从下方「站内真实课程目录」中选择准确存在的相对路径，严禁编造 URL。
4. 所有输出使用简体中文。

【站内真实课程目录】
${promptText}

【必须严格遵守的 JSON 输出格式】
\`\`\`json
{
  "roleTitle": "岗位或面经主题名称（25字内）",
  "inferredLevel": "自主判定的职级（如：校招 / 初级、中高级、资深 / 架构）",
  "prepDays": "自主规划的建议备考周期（如：7 天、14 天）",
  "companyStyle": "考察风格短标签（如：高并发场景 + 底层源码，18字内）",
  "summary": "2-3 句精准核心结论，直指该岗位的核心门槛与考察重心",
  "recommendedSubject": "go | backend | ai-development | frontend | mine",
  "dimensions": [
    {
      "name": "考点模块名（12字内）",
      "weight": 30,
      "priority": "P0",
      "focus": "具体考什么（35字内）"
    }
  ],
  "traps": [
    "高频扣分点或面试官最容易深挖露馅的坑（3-5条，每条40字内）"
  ],
  "roadmap": [
    {
      "phase": "Day 1–2",
      "title": "阶段主攻目标（20字内）",
      "goals": ["具体可验收动作1", "具体可验收动作2", "具体可验收动作3"],
      "siteLinks": [
        { "label": "站内课程/关卡名", "href": "/learn/go?level=..." }
      ]
    }
  ]
}
\`\`\``;
 return cachedStage1Prompt;
}

// Stage 2 Static System Prompt (byte-identical across all calls to maximize upstream prompt cache hits):
// Given the Stage 1 roadmap phases + original JD/experience, generates each path's 5-type study quizzes AND the interview question bank.
export function getJdResearchStage2SystemPrompt(): string {
 if (cachedStage2Prompt) return cachedStage2Prompt;
 cachedStage2Prompt = `你是顶级技术面试教研专家与大厂资深架构面试官。当前为【第 2 步：按复习路径生成五题型学习题 + 面试专题题库】。
请严格依据用户提供的原始「岗位 JD / 面经」以及第 1 步确定的「分阶段复习路径」，为每个复习路径阶段生成 5 道不同题型的学习练习题，并生成一套与学习题完全不重复的高质量面试专题题库。

严格规则：
1. **学习专题与面试专题严格分离、互不重复**：
   - \`studyQuizzes[i].quizzes\` 专用于「学习」模块的阶段巩固练习，必须一一对应第 1 步的每个复习路径阶段（\`phaseIndex\` 从 0 开始），紧扣该阶段目标，**每个阶段固定出 5 道不同题型的学习题：单选 (\`single\`)、多选 (\`multi\`)、填空 (\`fill\`)、简答 (\`short\`)、代码 (\`code\`) 各 1 题**（若阶段偏架构/运维，代码题可出核心数据结构、并发控制、SQL、配置脚本或关键伪代码实现）。
   - \`questions\` 专用于「面试」模块的高频开放式深度问答与追问演练（共 6–8 题），**必须与 \`studyQuizzes\` 中的所有学习题目角度不同、题干绝不重复**。
2. 面试题 \`questions\` 的 \`answer\` 必须深入、结构化、按点清晰换行（可用 \`\`\` 代码块），包含关键原理、边界条件或生产排障思路（每题 160–360 字，精炼硬核，避免冗长废话以防截断）。
3. 严禁调用任何工具、执行命令、读写文件或搜索网页；直接输出**一个合法 JSON 对象**（用 \`\`\`json 和 \`\`\` 包裹，不要在代码块外写其他解释文字），字段严格按下方顺序输出。
4. 所有输出使用简体中文。

【必须严格遵守的 JSON 输出格式】
\`\`\`json
{
  "studyQuizzes": [
    {
      "phaseIndex": 0,
      "quizzes": [
        {
          "type": "single",
          "q": "结合该阶段考点的单选题题干",
          "options": ["选项A", "选项B", "选项C", "选项D"],
          "answer": 0,
          "explain": "一句话讲清核心原理"
        },
        {
          "type": "multi",
          "q": "结合该阶段考点的多选题题干（至少2个正确项）",
          "options": ["选项A", "选项B", "选项C", "选项D"],
          "answers": [0, 2],
          "explain": "简明解析正确组合的原因"
        },
        {
          "type": "fill",
          "q": "用 ＿＿ 标出空位的填空题题干（填一个精准术语/关键字/数值）",
          "accepted": ["标准答案", "常见英文或别名"],
          "explain": "简明解析该概念"
        },
        {
          "type": "short",
          "q": "紧扣该阶段目标的简答题（与下方 questions 面试题不重复）",
          "reference": "简洁准确的参考答案（90-200字）",
          "points": ["得分要点1", "得分要点2", "得分要点3"],
          "explain": "补充记忆抓手或常见误区"
        },
        {
          "type": "code",
          "q": "紧扣该阶段技术栈的动手代码题",
          "code": "可选：题干示例代码或待补全函数签名",
          "reference": "完整可运行或核心参考代码",
          "points": ["关键实现逻辑", "边界条件或并发/异常处理"],
          "explain": "时间/空间复杂度与关键细节"
        }
      ]
    }
  ],
  "questions": [
    {
      "title": "具体面试题干（直击 JD/面经真实场景，与上面 studyQuizzes 题目不同）",
      "section": "专题短标签（如：并发调优，16字内）",
      "difficulty": "基础 | 进阶 | 高阶",
      "whyAsked": "对应 JD/面经的哪条要求（30字内）",
      "answer": "生产级高质量参考答案（分段清晰，可用 \`\`\` 代码块，160-360字）",
      "followups": ["连环追问1", "连环追问2"]
    }
  ]
}
\`\`\``;
 return cachedStage2Prompt;
}

export function getJdResearchSystemPrompt(): string {
 if (cachedFullPrompt) return cachedFullPrompt;
 cachedFullPrompt = getJdResearchStage1SystemPrompt();
 return cachedFullPrompt;
}

export function buildJdStage1Input(opts: {
 kind: JdInputKind;
 source: string;
}): string {
 const kindLabel = opts.kind === 'experience' ? '真实面经 / 面试记录' : '目标岗位 JD';
 return [
  `【调研类型】${kindLabel}`,
  '【第 1 步任务】请先输出该岗位的「考点画像（dimensions + traps）」与「分阶段复习路径（roadmap，3–4 阶段，含真实站内链接）」，不要在这一步输出题目。',
  '',
  `【原始${opts.kind === 'experience' ? '面经' : '岗位 JD'}内容】`,
  opts.source,
 ].join('\n');
}

export function buildJdStage2Input(opts: {
 kind: JdInputKind;
 source: string;
 stage1: JdResearchReport;
}): string {
 const roadmapText = opts.stage1.roadmap
  .map((s, idx) => `- phaseIndex=${idx} [${s.phase} · ${s.title}] 目标：${s.goals.join('；')}`)
  .join('\n');
 return [
  `【岗位主题】${opts.stage1.roleTitle}（${[opts.stage1.inferredLevel, opts.stage1.companyStyle].filter(Boolean).join(' · ')}）`,
  '【已确定的分阶段复习路径】',
  roadmapText,
  '',
  '【第 2 步任务】请先在 studyQuizzes 中为上面每一个 phaseIndex 各生成 5 道学习题（single、multi、fill、short、code 各 1 题），再在 questions 中生成 6–8 道与学习题不重复的高频深度面试题。',
  '',
  `【原始${opts.kind === 'experience' ? '面经' : '岗位 JD'}内容】`,
  opts.source,
 ].join('\n');
}

// Focused Stage 2A prompt: generates study quizzes for ONE single roadmap phase in parallel
// so each phase reliably outputs the exact quota (8 single + 4 multi + 2 short + 0-1 optional code) without truncation.
let cachedPhaseQuizzesPrompt: string | null = null;
export function getJdResearchPhaseQuizzesSystemPrompt(): string {
 if (cachedPhaseQuizzesPrompt) return cachedPhaseQuizzesPrompt;
 cachedPhaseQuizzesPrompt = `你是顶级技术面试教研专家。当前任务：【为指定的单个复习路径阶段生成高质量学习练习题】。

严格题量与题型要求（必须严格遵守）：
1. **单选题（\`single\`）：必须正好 8 道**（4 个选项，1 个正确答案 \`answer\` 为 0-3 整数）。
2. **多选题（\`multi\`）：必须正好 4 道**（4 个选项，至少 2 个正确项，\`answers\` 为升序索引数组）。
3. **简答题（\`short\`）：必须正好 2 道**（给出 70–150 字简洁准确 \`reference\` 与 3 条 \`points\` 得分要点）。
4. **代码题（\`code\`）：0 或 1 道（可有可无，严格根据该岗位 JD 与本阶段内容决定）**——若该岗位与本阶段明显涉及编码、算法、框架实现、SQL 或并发控制则出 1 道精炼动手代码题；若偏纯概念、产品/业务协作、架构选型或非编码运维则不出代码题。
5. **不要出填空题**；全部题目紧扣本阶段目标与原始 JD/面经真实技术栈，题目之间绝不重复，\`explain\` 一句话直击核心原理；每题必须填写 \`dimension\` 字段，取值从给定的「考点画像模块」列表中选择最匹配的一项名称（用于支持按考点画像刷题）。
6. 严禁调用任何工具，直接输出**一个合法 JSON 对象**（用 \`\`\`json 和 \`\`\` 包裹，不要输出代码块以外的文字），使用简体中文。

\`\`\`json
{
  "quizzes": [
    { "type": "single", "dimension": "考点画像模块名", "q": "单选题题干", "options": ["选项A", "选项B", "选项C", "选项D"], "answer": 0, "explain": "一句话核心原理" },
    { "type": "multi", "dimension": "考点画像模块名", "q": "多选题题干（至少2个正确项）", "options": ["选项A", "选项B", "选项C", "选项D"], "answers": [0, 2], "explain": "简明解析" },
    { "type": "short", "dimension": "考点画像模块名", "q": "简答题题干", "reference": "简洁准确参考答案（70-150字）", "points": ["得分要点1", "得分要点2", "得分要点3"], "explain": "记忆抓手" },
    { "type": "code", "dimension": "考点画像模块名", "q": "（按JD决定可有可无）动手代码题题干", "code": "可选函数签名", "reference": "简洁核心代码", "points": ["关键实现", "边界/并发处理"], "explain": "复杂度与细节" }
  ]
}
\`\`\``;
 return cachedPhaseQuizzesPrompt;
}

export function buildJdPhaseQuizzesInput(opts: {
 kind: JdInputKind;
 source: string;
 stage1: JdResearchReport;
 phaseIndex: number;
 reusedQuizzes?: AiQuiz[];
}): string {
 const step = opts.stage1.roadmap[opts.phaseIndex];
 const dimList = opts.stage1.dimensions.map(d => d.name).filter(Boolean);
 const otherPhases = opts.stage1.roadmap
  .map((s, idx) => (idx === opts.phaseIndex ? null : `- 阶段${idx + 1} [${s.phase} · ${s.title}]`))
  .filter(Boolean)
  .join('\n');
 const reused = opts.reusedQuizzes ?? [];
 const rSingle = reused.filter(q => !q.type || q.type === 'single').length;
 const rMulti = reused.filter(q => q.type === 'multi').length;
 const rShort = reused.filter(q => q.type === 'short').length;
 const needSingle = Math.max(0, 8 - rSingle);
 const needMulti = Math.max(0, 4 - rMulti);
 const needShort = Math.max(0, 2 - rShort);
 const reusedHint = reused.length
  ? [
     `【已从高度匹配的站内章节与阶段训练题精选 ${reused.length} 道（单选 ${rSingle}、多选 ${rMulti}、简答 ${rShort}），严禁重复出题】`,
     ...reused.map((q, i) => `${i + 1}. (${q.type || 'single'}) ${q.q.slice(0, 80)}`),
     '',
     `【本次需补齐的剩余题量】请严格只生成剩余部分：${needSingle} 道单选（single）+ ${needMulti} 道多选（multi）+ ${needShort} 道简答（short）+ 0 或 1 道代码题（code，根据 JD 与本阶段是否需要编码自主决定），直接输出 JSON。`,
    ].join('\n')
  : '【题量要求】请严格为当前阶段生成：8 道单选（single）+ 4 道多选（multi）+ 2 道简答（short）+ 0 或 1 道代码题（code，根据 JD 与本阶段是否需要编码自主决定），共 14–15 道题，直接输出 JSON。';
 return [
  `【岗位主题】${opts.stage1.roleTitle}（${[opts.stage1.inferredLevel, opts.stage1.companyStyle].filter(Boolean).join(' · ')}）`,
  dimList.length ? `【考点画像模块（每题 dimension 字段必须从中选一项）】${dimList.join(' | ')}` : '',
  `【当前出题阶段（第 ${opts.phaseIndex + 1} / ${opts.stage1.roadmap.length} 阶段）】`,
  `- 时间与标题：${step.phase} · ${step.title}`,
  `- 阶段目标：${step.goals.join('；')}`,
  otherPhases ? `【其他阶段（避免题目撞车）】\n${otherPhases}` : '',
  '',
  reusedHint,
  '',
  `【原始${opts.kind === 'experience' ? '面经' : '岗位 JD'}】`,
  opts.source,
 ]
  .filter(Boolean)
  .join('\n');
}

function matchTokens(text: string): string[] {
 const s = text.toLowerCase();
 const out = new Set<string>();
 for (const w of s.match(/[a-z0-9+#._-]{2,}/g) || []) out.add(w);
 for (const run of s.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
  for (let i = 0; i <= run.length - 2; i++) out.add(run.slice(i, i + 2));
 }
 return [...out];
}

function overlapScore(a: string, b: string): number {
 const tks = matchTokens(a);
 if (!tks.length) return 0;
 const hay = b.toLowerCase();
 let score = 0;
 for (const tk of tks) {
  if (hay.includes(tk)) score++;
 }
 return score;
}

function bestDimensionForQuiz(q: AiQuiz, stepTitle: string, dimensions: JdSkillDimension[]): string | undefined {
 if (!dimensions.length) return undefined;
 const hay = `${q.q} ${q.explain} ${stepTitle}`.toLowerCase();
 let best = dimensions[0].name;
 let bestScore = -1;
 for (const d of dimensions) {
  const s = overlapScore(d.name, hay) * 3 + overlapScore(d.focus, hay);
  if (s > bestScore) {
   bestScore = s;
   best = d.name;
  }
 }
 return best;
}

// When a roadmap phase aligns closely with in-site course chapters (via verified siteLinks),
// cherry-picks a small subset (capped at <=3 single, <=1 multi, <=1 short — never all!) from
// those chapters and their corresponding course training exams so the remaining majority is
// freshly tailored by AI to the exact JD.
export function pickInSiteQuizzesForStage(
 stage1: JdResearchReport,
 phaseIndex: number,
 usedOrigIds: Set<string>,
): AiQuiz[] {
 const step = stage1.roadmap[phaseIndex];
 if (!step?.siteLinks?.length) return [];

 const stepText = `${step.title} ${step.goals.join(' ')}`;
 type Cand = { quiz: AiQuiz; score: number; fromTraining: boolean };
 const cands: Cand[] = [];
 const seenLocal = new Set<string>();

 const pushQuiz = (q: AiQuiz, baseBonus: number, fromTraining: boolean) => {
  if (seenLocal.has(q.id) || usedOrigIds.has(q.id)) return;
  if (q.say || q.passage) return;
  const t = q.type ?? 'single';
  if (t !== 'single' && t !== 'multi' && t !== 'short') return;
  seenLocal.add(q.id);
  const rel = overlapScore(stepText, `${q.q} ${q.explain}`);
  cands.push({ quiz: q, score: baseBonus + rel * 2, fromTraining });
 };

 for (const lk of step.siteLinks) {
  const m = lk.href.match(/^\/learn\/([^/?]+)\?level=([^&]+)/);
  if (!m) continue;
  const courseId = decodeURIComponent(m[1]);
  const levelId = decodeURIComponent(m[2]);
  const course = COURSES.find(c => c.id === courseId);
  if (!course) continue;
  const level = course.levels.find(l => l.id === levelId);
  if (!level) continue;

  // Verify high alignment between this roadmap phase and the linked chapter
  const chapterAlign = overlapScore(stepText, `${level.title} ${level.summary}`);
  if (chapterAlign < 1) continue;

  for (const q of level.quiz) {
   pushQuiz(q, 4 + chapterAlign, false);
  }
  const matchingTrainings = (course.exams ?? []).filter(
   e => e.kind === 'training' && e.requires.includes(levelId),
  );
  for (const ex of matchingTrainings) {
   for (const q of ex.quiz) {
    // Only include training exam items that genuinely match this phase's topic
    if (overlapScore(stepText, `${q.q} ${q.explain}`) >= 1) {
     pushQuiz(q, 5 + chapterAlign, true);
    }
   }
  }
 }

 if (!cands.length) return [];
 cands.sort((a, b) => b.score - a.score);

 const picked: AiQuiz[] = [];
 const pickByType = (type: 'single' | 'multi' | 'short', cap: number) => {
  const pool = cands.filter(c => (c.quiz.type ?? 'single') === type);
  // Prefer a mix of chapter & training exam items when both are available
  const trainingPool = pool.filter(c => c.fromTraining);
  const chapterPool = pool.filter(c => !c.fromTraining);
  const ordered: Cand[] = [];
  const maxLen = Math.max(trainingPool.length, chapterPool.length);
  for (let i = 0; i < maxLen; i++) {
   if (chapterPool[i]) ordered.push(chapterPool[i]);
   if (trainingPool[i]) ordered.push(trainingPool[i]);
  }
  for (const item of ordered.slice(0, cap)) {
   usedOrigIds.add(item.quiz.id);
   const dim = bestDimensionForQuiz(item.quiz, step.title, stage1.dimensions);
   picked.push({ ...item.quiz, ...(dim ? { dimension: dim } : {}) });
  }
 };

 // Strict caps (never all — max 5 of 14-15 quizzes, ~1/3 from in-site chapters/training)
 pickByType('single', 3);
 pickByType('multi', 1);
 pickByType('short', 1);
 return picked;
}

export function combinePhaseQuizzes(reused: AiQuiz[], generated: AiQuiz[], phaseIndex: number): AiQuiz[] {
 const seenStems = new Set<string>();
 const all: AiQuiz[] = [];
 for (const q of [...reused, ...generated]) {
  const stem = q.q.trim().toLowerCase().replace(/\s+/g, '').slice(0, 40);
  if (!stem || seenStems.has(stem)) continue;
  seenStems.add(stem);
  all.push(q);
 }
 const typeOrder: Record<string, number> = { single: 0, multi: 1, short: 2, code: 3, fill: 4 };
 all.sort((a, b) => (typeOrder[a.type ?? 'single'] ?? 9) - (typeOrder[b.type ?? 'single'] ?? 9));
 return all.slice(0, 20).map((q, idx) => ({
  ...q,
  id: `jdq-${phaseIndex + 1}-${idx + 1}`,
 }));
}

// Focused Stage 2B prompt: ONLY Interview Question Bank (fast, compact, runs in parallel with Stage 2A).
let cachedStage2QuestionsPrompt: string | null = null;
export function getJdResearchStage2QuestionsSystemPrompt(): string {
 if (cachedStage2QuestionsPrompt) return cachedStage2QuestionsPrompt;
 cachedStage2QuestionsPrompt = `你是大厂资深架构面试官。当前任务：【围绕目标岗位 JD / 面经生成高频开放式面试专题题库】。

严格规则：
1. 生成 **6–8 道**贴近真实一二三面场景的高频深度面试题（偏架构设计、线上排障、底层原理与工程取舍，避免基础概念背诵题）。
2. 每题 \`answer\` 结构化分段清晰（可用 \`\`\` 代码块），直击核心原理、边界条件与落地指标，每题 150–320 字，精炼硬核。
3. 严禁调用任何工具，直接输出**一个合法 JSON 对象**（用 \`\`\`json 和 \`\`\` 包裹，不要输出代码块以外的文字），使用简体中文。

\`\`\`json
{
  "questions": [
    {
      "title": "贴合该 JD/面经真实生产场景的面试题干",
      "section": "专题短标签（16字内）",
      "difficulty": "基础 | 进阶 | 高阶",
      "whyAsked": "对应 JD/面经哪条要求（30字内）",
      "answer": "生产级高质量参考答案（150-320字，按点换行）",
      "followups": ["连环追问1", "连环追问2"]
    }
  ]
}
\`\`\``;
 return cachedStage2QuestionsPrompt;
}

export function buildJdStage2QuestionsInput(opts: {
 kind: JdInputKind;
 source: string;
 stage1: JdResearchReport;
}): string {
 const dims = opts.stage1.dimensions.map(d => `${d.name}(${d.priority},${d.weight}%)`).join('、');
 return [
  `【岗位主题】${opts.stage1.roleTitle}（${[opts.stage1.inferredLevel, opts.stage1.companyStyle].filter(Boolean).join(' · ')}）`,
  dims ? `【核心考点】${dims}` : '',
  '【任务】请生成 6–8 道高质量场景化深度面试题与连环追问，直接输出 JSON。',
  '',
  `【原始${opts.kind === 'experience' ? '面经' : '岗位 JD'}】`,
  opts.source,
 ].filter(Boolean).join('\n');
}

export function buildJdResearchInput(opts: {
 kind: JdInputKind;
 source: string;
}): string {
 return buildJdStage1Input(opts);
}

export function extractThoughtsAndJson(raw: string): { thoughts: string; jsonRaw: string } {
 let s = raw || '';
 const thoughtsParts: string[] = [];
 s = s.replace(/<think>([\s\S]*?)<\/think>/gi, (_m, inner: string) => {
  if (inner && inner.trim()) thoughtsParts.push(inner.trim());
  return '';
 });
 // Handle unclosed <think> before ```json or {"roleTitle" / {"studyQuizzes"
 const openIdx = s.toLowerCase().indexOf('<think>');
 if (openIdx >= 0) {
  const afterOpen = s.slice(openIdx + 7);
  const fenceIdx = afterOpen.search(/```json|```|\{\s*"(?:roleTitle|studyQuizzes|questions)"/);
  if (fenceIdx >= 0) {
   const tPart = afterOpen.slice(0, fenceIdx).trim();
   if (tPart) thoughtsParts.push(tPart);
   s = s.slice(0, openIdx) + afterOpen.slice(fenceIdx);
  }
 }
 return {
  thoughts: thoughtsParts.join('\n\n').trim(),
  jsonRaw: s.trim(),
 };
}

export function createThinkJsonStreamSplitter(callbacks: {
 onThoughtDelta: (delta: string) => void;
 onJsonDelta: (delta: string, fullJsonBuf: string) => void;
}) {
 let mode: 'init' | 'think' | 'json' = 'init';
 let pending = '';
 let jsonBuf = '';

 const emitJson = (chunk: string) => {
  if (!chunk) return;
  jsonBuf += chunk;
  callbacks.onJsonDelta(chunk, jsonBuf);
 };

 return {
  push(delta: string) {
   if (!delta) return;
   if (mode === 'json') {
    emitJson(delta);
    return;
   }
   pending += delta;

   if (mode === 'init') {
    const trimmed = pending.trimStart();
    if (!trimmed) return;
    if (trimmed.toLowerCase().startsWith('<think>')) {
     const idx = pending.toLowerCase().indexOf('<think>');
     pending = pending.slice(idx + 7);
     mode = 'think';
    } else if (trimmed.startsWith('```') || trimmed.startsWith('{')) {
     mode = 'json';
     const out = pending;
     pending = '';
     emitJson(out);
     return;
    } else if (trimmed.length >= 8 && !'<think>'.startsWith(trimmed.toLowerCase())) {
     // Started directly with plain text thoughts before ```json or {
     mode = 'think';
    } else {
     return;
    }
   }

   if (mode === 'think') {
    const closeIdx = pending.toLowerCase().indexOf('</think>');
    if (closeIdx >= 0) {
     const thoughtChunk = pending.slice(0, closeIdx);
     if (thoughtChunk) callbacks.onThoughtDelta(thoughtChunk);
     const rest = pending.slice(closeIdx + 8).replace(/^\s+/, '');
     pending = '';
     mode = 'json';
     if (rest) emitJson(rest);
     return;
    }
    // Also detect if model forgot </think> and directly started ```json or {"roleTitle"
    const jsonStartMatch = pending.match(/```json|\{\s*"(?:roleTitle|studyQuizzes|questions)"/);
    if (jsonStartMatch && jsonStartMatch.index !== undefined) {
     const thoughtChunk = pending.slice(0, jsonStartMatch.index);
     if (thoughtChunk) callbacks.onThoughtDelta(thoughtChunk);
     const rest = pending.slice(jsonStartMatch.index);
     pending = '';
     mode = 'json';
     emitJson(rest);
     return;
    }
    // Keep last 9 chars in buffer in case '</think>' is split across two chunks
    if (pending.length > 9) {
     const flushLen = pending.length - 9;
     const thoughtChunk = pending.slice(0, flushLen);
     pending = pending.slice(flushLen);
     callbacks.onThoughtDelta(thoughtChunk);
    }
   }
  },
  flush() {
   if (mode === 'think' && pending) {
    const clean = pending.replace(/<\/?think>/gi, '');
    if (clean) callbacks.onThoughtDelta(clean);
    pending = '';
   } else if (mode === 'init' && pending) {
    emitJson(pending);
    pending = '';
   }
  },
  getJsonBuf() {
   return jsonBuf;
  },
 };
}

function extractJsonText(raw: string): string | null {
 const { jsonRaw } = extractThoughtsAndJson(raw);
 const trimmed = jsonRaw
  .trim()
  .replace(/^```(?:json)?\s*\r?\n?/i, '')
  .replace(/\r?\n?```\s*$/, '')
  .trim();

 const start = trimmed.indexOf('{');
 if (start < 0) return null;

 let depth = 0;
 let inStr = false;
 let esc = false;
 for (let i = start; i < trimmed.length; i++) {
  const ch = trimmed[i];
  if (inStr) {
   if (esc) {
    esc = false;
   } else if (ch === '\\') {
    esc = true;
   } else if (ch === '"') {
    inStr = false;
   }
   continue;
  }
  if (ch === '"') {
   inStr = true;
  } else if (ch === '{') {
   depth++;
  } else if (ch === '}') {
   depth--;
   if (depth === 0) return trimmed.slice(start, i + 1);
  }
 }

 return trimmed.slice(start);
}

function repairJsonText(text: string): string {
 let out = '';
 let inStr = false;
 let esc = false;
 for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (!inStr) {
   if (ch === '"') inStr = true;
   out += ch;
   continue;
  }
  if (esc) {
   if ('"\\/bfnrtu'.includes(ch)) {
    out += '\\' + ch;
   } else {
    out += '\\\\' + ch;
   }
   esc = false;
   continue;
  }
  if (ch === '\\') {
   esc = true;
   continue;
  }
  if (ch === '"') {
   inStr = false;
   out += ch;
   continue;
  }
  const code = ch.charCodeAt(0);
  if (ch === '\n') {
   out += '\\n';
  } else if (ch === '\r') {
   out += '\\r';
  } else if (ch === '\t') {
   out += '\\t';
  } else if (code < 0x20) {
   out += ' ';
  } else {
   out += ch;
  }
 }
 if (esc) out += '\\\\';
 return out.replace(/,\s*([}\]])/g, '$1');
}

// If an LLM output was truncated mid-stream, walk back to the nearest complete object/array boundary
// and close all open brackets/braces so completed items in arrays are preserved instead of failing altogether.
export function salvageTruncatedJson(raw: string): unknown {
 const extracted = extractJsonText(raw);
 if (!extracted) return null;
 const repaired = repairJsonText(extracted);

 const cuts: number[] = [repaired.length];
 let inStr = false;
 let esc = false;
 for (let i = 0; i < repaired.length; i++) {
  const ch = repaired[i];
  if (inStr) {
   if (esc) esc = false;
   else if (ch === '\\') esc = true;
   else if (ch === '"') inStr = false;
   continue;
  }
  if (ch === '"') inStr = true;
  else if (ch === '}' || ch === ']') cuts.push(i + 1);
  else if (ch === ',') cuts.push(i);
 }
 cuts.sort((a, b) => b - a);

 for (const cut of cuts.slice(0, 18)) {
  let s = repaired.slice(0, cut);
  let strOpen = false;
  let e = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
   const ch = s[i];
   if (strOpen) {
    if (e) e = false;
    else if (ch === '\\') e = true;
    else if (ch === '"') strOpen = false;
    continue;
   }
   if (ch === '"') strOpen = true;
   else if (ch === '{') stack.push('}');
   else if (ch === '[') stack.push(']');
   else if (ch === '}' || ch === ']') stack.pop();
  }
  if (strOpen) s = (e ? s.slice(0, -1) : s) + '"';
  s = s.replace(/[,:\s]+$/, '');
  const candidate = (s + stack.reverse().join('')).replace(/,\s*([}\]])/g, '$1');
  try {
   return JSON.parse(candidate);
  } catch {
   // Try an earlier clean cut point
  }
 }
 return null;
}

function safeParseJson(text: string): unknown {
 try {
  return JSON.parse(text);
 } catch {
  try {
   return JSON.parse(repairJsonText(text));
  } catch {
   return salvageTruncatedJson(text);
  }
 }
}

function str(v: unknown, max: number): string {
 return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function canonicalizeSiteHref(href: string, validLinks: Map<string, string>): JdSiteLink | null {
 const clean = href.trim();
 if (!clean.startsWith('/')) return null;
 if (validLinks.has(clean)) {
  return { label: validLinks.get(clean)!, href: clean };
 }
 const noCard = clean.replace(/&card=\d+$/, '');
 if (validLinks.has(noCard)) {
  return { label: validLinks.get(noCard)!, href: noCard };
 }
 return null;
}

function enrichStepLinks(stepTitle: string, goals: string[], existing: JdSiteLink[], validLinks: Map<string, string>): JdSiteLink[] {
 const seen = new Set(existing.map(l => l.href));
 const out = [...existing];
 const query = `${stepTitle} ${goals.join(' ')}`.slice(0, 180);

 if (out.length < 3 && /(架构|系统设计|高并发|秒杀|分布式|容灾|限流|熔断|模拟面试|压测)/.test(query)) {
  const archHref = '/interview/architect';
  if (!seen.has(archHref)) {
   seen.add(archHref);
   out.push({ label: '高阶模拟面试 · 系统设计评审', href: archHref });
  }
 }

 if (out.length < 2) {
  const hits = searchSite(query, [], { limit: 8, natural: true, kinds: ['card'] });
  for (const h of hits) {
   const levelHref = h.href.replace(/&card=\d+$/, '');
   if (seen.has(levelHref)) continue;
   const canonical = validLinks.get(levelHref);
   if (canonical) {
    seen.add(levelHref);
    out.push({ label: canonical, href: levelHref });
    if (out.length >= 3) break;
   }
  }
 }

 return out.slice(0, 3);
}

function parseStudyQuiz(raw: unknown, stepIdx: number, qIdx: number): AiQuiz | null {
 if (!raw || typeof raw !== 'object') return null;
 const o = raw as Record<string, unknown>;
 const q = str(o.q, 2000);
 if (!q) return null;
 const id = `jdq-${stepIdx + 1}-${qIdx + 1}`;
 const code = str(o.code, 4000) || undefined;
 const dimension = str(o.dimension, 60) || undefined;
 const explain = str(o.explain, 2000) || '见参考答案与得分要点。';
 const rawType = str(o.type, 16).toLowerCase();
 const extra = { ...(code ? { code } : {}), ...(dimension ? { dimension } : {}) };

 if (rawType === 'multi') {
  const options = Array.isArray(o.options)
   ? o.options.slice(0, 6).map(x => str(x, 400)).filter(Boolean)
   : [];
  if (options.length < 2) return null;
  const answers = Array.isArray(o.answers)
   ? [...new Set(o.answers.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < options.length))].sort((a, b) => a - b)
   : [];
  if (!answers.length) return null;
  const why = Array.isArray(o.why) && o.why.length === options.length
   ? o.why.map(x => str(x, 300))
   : undefined;
  return { id, type: 'multi', q, ...extra, options, answers, ...(why ? { why } : {}), explain };
 }

 if (rawType === 'fill') {
  const accepted = Array.isArray(o.accepted)
   ? o.accepted.slice(0, 8).map(x => str(x, 120)).filter(Boolean)
   : typeof o.accepted === 'string' && o.accepted.trim()
     ? [o.accepted.trim().slice(0, 120)]
     : [];
  if (!accepted.length) return null;
  return { id, type: 'fill', q, ...extra, accepted, explain };
 }

 if (rawType === 'short' || rawType === 'code') {
  const reference = str(o.reference, 8000);
  if (!reference) return null;
  const rawPts = Array.isArray(o.points)
   ? o.points.slice(0, 6).map(x => str(x, 300)).filter(Boolean)
   : [];
  const points = rawPts.length ? rawPts : ['核心原理或关键实现正确', '边界条件与工程细节清晰'];
  return { id, type: rawType, q, ...extra, reference, points, explain };
 }

 const options = Array.isArray(o.options)
  ? o.options.slice(0, 6).map(x => str(x, 400)).filter(Boolean)
  : [];
 if (options.length < 2) return null;
 const ans = Number(o.answer);
 const answer = Number.isInteger(ans) && ans >= 0 && ans < options.length ? ans : 0;
 const why = Array.isArray(o.why) && o.why.length === options.length
  ? o.why.map(x => str(x, 300))
  : undefined;
 return { id, type: 'single', q, ...extra, options, answer, ...(why ? { why } : {}), explain };
}

function parseQuestionsArray(rawQuestions: unknown): JdQuestionItem[] {
 if (!Array.isArray(rawQuestions)) return [];
 return rawQuestions
  .slice(0, 20)
  .map((q): JdQuestionItem | null => {
   if (!q || typeof q !== 'object') return null;
   const o = q as Record<string, unknown>;
   const title = str(o.title, MY_LIMITS.title);
   const answer = str(o.answer, Math.min(12_000, MY_LIMITS.answer));
   if (!title || !answer) return null;
   const section = str(o.section, MY_LIMITS.section) || 'JD专题';
   const diffRaw = str(o.difficulty, 10);
   const difficulty: '基础' | '进阶' | '高阶' =
    diffRaw === '基础' || diffRaw === '高阶' ? diffRaw : '进阶';
   const whyAsked = str(o.whyAsked, 140);
   const followups = Array.isArray(o.followups)
    ? o.followups
       .slice(0, 4)
       .map(f => str(f, 160))
       .filter(Boolean)
    : [];
   return { title, section, difficulty, whyAsked, answer, followups };
  })
  .filter((x): x is JdQuestionItem => x !== null);
}

export function parseAndEnrichJdReport(rawText: string): JdResearchReport | null {
 const jsonText = extractJsonText(rawText);
 if (!jsonText) return null;
 const parsed = safeParseJson(jsonText);
 if (!parsed || typeof parsed !== 'object') return null;
 const obj = parsed as Record<string, unknown>;
 const { validLinks } = getCatalog();

 const roleTitle = str(obj.roleTitle, 80) || '岗位深度调研报告';
 const inferredLevel = str(obj.inferredLevel, 32);
 const prepDays = str(obj.prepDays, 24);
 const companyStyle = str(obj.companyStyle, 50);
 const summary = str(obj.summary, 600);
 const recRaw = str(obj.recommendedSubject, 32);
 const recommendedSubject = VALID_SUBJECTS.has(recRaw) ? recRaw : 'mine';

 const dimensions: JdSkillDimension[] = Array.isArray(obj.dimensions)
  ? obj.dimensions
     .slice(0, 8)
     .map((d): JdSkillDimension | null => {
      if (!d || typeof d !== 'object') return null;
      const o = d as Record<string, unknown>;
      const name = str(o.name, 40);
      if (!name) return null;
      const rawW = Number(o.weight);
      const weight = Number.isFinite(rawW) ? Math.max(1, Math.min(100, Math.round(rawW))) : 15;
      const prioRaw = str(o.priority, 4).toUpperCase();
      const priority: 'P0' | 'P1' | 'P2' = prioRaw === 'P0' || prioRaw === 'P1' || prioRaw === 'P2' ? prioRaw : 'P1';
      const focus = str(o.focus, 140);
      return { name, weight, priority, focus };
     })
     .filter((x): x is JdSkillDimension => x !== null)
  : [];

 const traps: string[] = Array.isArray(obj.traps)
  ? obj.traps
     .slice(0, 8)
     .map(t => str(t, 160))
     .filter(Boolean)
  : [];

 const roadmap: JdRoadmapStep[] = Array.isArray(obj.roadmap)
  ? obj.roadmap
     .slice(0, 8)
     .map((s, idx): JdRoadmapStep | null => {
      if (!s || typeof s !== 'object') return null;
      const o = s as Record<string, unknown>;
      const title = str(o.title, 80);
      if (!title) return null;
      const phase = str(o.phase, 30) || `阶段 ${idx + 1}`;
      const goals = Array.isArray(o.goals)
       ? o.goals
          .slice(0, 6)
          .map(g => str(g, 160))
          .filter(Boolean)
       : [];
      const rawLinks: JdSiteLink[] = [];
      const seen = new Set<string>();
      if (Array.isArray(o.siteLinks)) {
       for (const lk of o.siteLinks) {
        if (!lk || typeof lk !== 'object') continue;
        const lo = lk as Record<string, unknown>;
        const href = str(lo.href, 160);
        const verified = canonicalizeSiteHref(href, validLinks);
        if (verified && !seen.has(verified.href)) {
         seen.add(verified.href);
         const label = str(lo.label, 60) || verified.label;
         rawLinks.push({ label, href: verified.href });
        }
       }
      }
      const siteLinks = enrichStepLinks(title, goals, rawLinks, validLinks);
      const quizzes: AiQuiz[] = Array.isArray(o.quizzes)
       ? o.quizzes
          .slice(0, 20)
          .map((qz, qi) => parseStudyQuiz(qz, idx, qi))
          .filter((x): x is AiQuiz => x !== null)
       : [];
      return { phase, title, goals, siteLinks, ...(quizzes.length ? { quizzes } : {}) };
     })
     .filter((x): x is JdRoadmapStep => x !== null)
  : [];

 const questions = parseQuestionsArray(obj.questions);

 if (!dimensions.length && !roadmap.length && !questions.length) return null;

 return {
  roleTitle,
  inferredLevel: inferredLevel || undefined,
  prepDays: prepDays || undefined,
  companyStyle,
  summary,
  recommendedSubject,
  dimensions,
  traps,
  roadmap,
  questions,
 };
}

// Merges Stage 1 (Profile + Roadmap) and Stage 2 (Study Quizzes + Interview Questions) outputs,
// with truncation salvaging so any completed quizzes or interview questions are preserved.
export function mergeStage1AndStage2Report(stage1: JdResearchReport, stage2RawText: string): JdResearchReport {
 const jsonText = extractJsonText(stage2RawText);
 const parsed = jsonText ? safeParseJson(jsonText) : null;
 if (!parsed || typeof parsed !== 'object') return stage1;
 const obj = parsed as Record<string, unknown>;

 const quizzesByPhase = new Map<number, AiQuiz[]>();
 if (Array.isArray(obj.studyQuizzes)) {
  obj.studyQuizzes.forEach((group, fallbackIdx) => {
   if (!group || typeof group !== 'object') return;
   const go = group as Record<string, unknown>;
   const rawIdx = Number(go.phaseIndex);
   const pIdx = Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < stage1.roadmap.length ? rawIdx : fallbackIdx;
   if (pIdx < 0 || pIdx >= stage1.roadmap.length) return;
   const rawList = Array.isArray(go.quizzes) ? go.quizzes : [];
   const quizzes = rawList
    .slice(0, 20)
    .map((qz, qi) => parseStudyQuiz(qz, pIdx, qi))
    .filter((x): x is AiQuiz => x !== null);
   if (quizzes.length) quizzesByPhase.set(pIdx, quizzes);
  });
 } else if (Array.isArray(obj.roadmap)) {
  obj.roadmap.forEach((step, pIdx) => {
   if (!step || typeof step !== 'object' || pIdx >= stage1.roadmap.length) return;
   const so = step as Record<string, unknown>;
   const rawList = Array.isArray(so.quizzes) ? so.quizzes : [];
   const quizzes = rawList
    .slice(0, 20)
    .map((qz, qi) => parseStudyQuiz(qz, pIdx, qi))
    .filter((x): x is AiQuiz => x !== null);
   if (quizzes.length) quizzesByPhase.set(pIdx, quizzes);
  });
 }

 const mergedRoadmap: JdRoadmapStep[] = stage1.roadmap.map((step, idx) => {
  const qz = quizzesByPhase.get(idx) ?? step.quizzes;
  return qz && qz.length ? { ...step, quizzes: qz } : step;
 });

 const questions = parseQuestionsArray(obj.questions);
 return {
  ...stage1,
  roadmap: mergedRoadmap,
  questions: questions.length ? questions : stage1.questions,
 };
}

export function parsePhaseQuizzes(rawText: string, phaseIndex: number): AiQuiz[] {
 const jsonText = extractJsonText(rawText);
 const parsed = jsonText ? safeParseJson(jsonText) : null;
 if (!parsed || typeof parsed !== 'object') return [];
 const obj = parsed as Record<string, unknown>;
 let rawList: unknown[] = [];
 if (Array.isArray(obj.quizzes)) {
  rawList = obj.quizzes;
 } else if (Array.isArray(obj.studyQuizzes) && obj.studyQuizzes[0] && typeof obj.studyQuizzes[0] === 'object') {
  const first = obj.studyQuizzes[0] as Record<string, unknown>;
  if (Array.isArray(first.quizzes)) rawList = first.quizzes;
 }
 return rawList
  .slice(0, 20)
  .map((qz, qi) => parseStudyQuiz(qz, phaseIndex, qi))
  .filter((x): x is AiQuiz => x !== null);
}

export function mergeStage2Parts(
 stage1: JdResearchReport,
 phaseQuizLists: (AiQuiz[] | null)[],
 questionsRawText: string,
): JdResearchReport {
 const withQuizzes: JdResearchReport = {
  ...stage1,
  roadmap: stage1.roadmap.map((step, idx) => {
   const qz = phaseQuizLists[idx];
   return qz && qz.length ? { ...step, quizzes: qz } : step;
  }),
 };
 return questionsRawText ? mergeStage1AndStage2Report(withQuizzes, questionsRawText) : withQuizzes;
}

function unescapePreview(s: string): string {
 return s.replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim();
}

// Inspects live text during Stage 1 or Stage 2 polling and produces a 4-stage visual progress snapshot:
//   profile (考点画像) -> roadmap (复习路径) -> quizzes (学习题) -> questions (面试题)
export function inspectJdStreamProgress(
 stage: 1 | 2,
 buf: string,
 partialReport?: JdResearchReport | null,
 stage1Cached?: boolean,
): JdLiveProgress {
 const pickField = (name: string) => {
  const m = buf.match(new RegExp(`"${name}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return m?.[1] ? unescapePreview(m[1]) : '';
 };

 const roleTitle = partialReport?.roleTitle || pickField('roleTitle') || undefined;
 const inferredLevel = partialReport?.inferredLevel || pickField('inferredLevel') || undefined;
 const prepDays = partialReport?.prepDays || pickField('prepDays') || undefined;
 const companyStyle = partialReport?.companyStyle || pickField('companyStyle') || undefined;

 const dimCount = partialReport?.dimensions?.length
  ? partialReport.dimensions.length
  : (buf.match(/"priority"\s*:/g) || []).length;

 const stageCount = partialReport?.roadmap?.length
  ? partialReport.roadmap.length
  : (buf.match(/"phase"\s*:/g) || []).length;

 const qIdx = buf.indexOf('"questions"');
 const quizSearchSlice = qIdx >= 0 ? buf.slice(0, qIdx) : buf;
 const streamedQuizzes = (quizSearchSlice.match(/"type"\s*:\s*"(?:single|multi|fill|short|code)"/g) || []).length;
 const prevQuizzes = (partialReport?.roadmap ?? []).reduce((n, s) => n + (s.quizzes?.length ?? 0), 0);
 const quizCount = Math.max(prevQuizzes, streamedQuizzes);

 const qTitles: string[] = [];
 if (qIdx >= 0) {
  const qPart = buf.slice(qIdx);
  const re = /"title"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(qPart)) !== null) {
   const t = unescapePreview(m[1]);
   if (t) qTitles.push(t);
  }
 }
 const questionCount = Math.max(partialReport?.questions?.length ?? 0, qTitles.length);

 let activeKey: JdStageKey = 'profile';
 if (stage === 1) {
  activeKey = buf.includes('"roadmap"') || stageCount > 0 ? 'roadmap' : 'profile';
 } else {
  activeKey = qIdx >= 0 || questionCount > 0 ? 'questions' : 'quizzes';
 }

 return {
  stage,
  activeKey,
  roleTitle,
  inferredLevel,
  prepDays,
  companyStyle,
  dimCount,
  stageCount,
  quizCount,
  questionCount,
  qTitles,
  stage1Cached,
 };
}
