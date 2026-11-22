// Server-only JD / Interview Experience deep research helpers:
//  1. Builds a static, prompt-cache-friendly curriculum catalog of all real in-site courses/levels.
//  2. Parses Antigravity Agent's JSON output with robust markdown-fence extraction.
//  3. Verifies every returned in-site link against real routes and enriches missing links via searchSite().

import { aiLevels } from '@/content/ai-journey';
import { goLevels } from '@/content/go-journey';
import { backendLevels } from '@/content/backend-journey';
import { frontendLevels } from '@/content/frontend-journey';
import { rustLevels } from '@/content/rust-journey';
import { pythonLevels } from '@/content/python-journey';
import { projectLevels } from '@/content/project-journey';
import { aiSupportLevels } from '@/content/ai-support-journey';
import type { AiLevel } from '@/content/journey';
import { searchSite } from './site-search';
import { MY_LIMITS } from './my-questions';
import type {
 JdInputKind,
 JdPrepDays,
 JdQuestionItem,
 JdResearchReport,
 JdRoadmapStep,
 JdSeniority,
 JdSiteLink,
 JdSkillDimension,
} from './jd-research-types';

const VALID_SUBJECTS = new Set(['go', 'backend', 'ai-development', 'frontend', 'mine']);

const COURSES: { id: string; name: string; levels: AiLevel[] }[] = [
 { id: 'go', name: 'Go 开发', levels: goLevels },
 { id: 'backend', name: '后端通用', levels: backendLevels },
 { id: 'ai', name: 'AI 开发', levels: aiLevels },
 { id: 'frontend', name: '前端开发', levels: frontendLevels },
 { id: 'rust', name: 'Rust 开发', levels: rustLevels },
 { id: 'python', name: 'Python 开发', levels: pythonLevels },
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

let cachedSystemPrompt: string | null = null;

// Static system instruction (byte-identical across all calls to maximize prompt-cache hits).
export function getJdResearchSystemPrompt(): string {
 if (cachedSystemPrompt) return cachedSystemPrompt;
 const { promptText } = getCatalog();
 cachedSystemPrompt = `你是顶级技术面试教研专家与大厂资深架构面试官。请根据用户提供的「岗位 JD」或「真实面经」，进行深度岗位拆解，生成高度针对性的考点画像、可执行复习路径（关联真实站内课程链接）与高质量专题面试题库。

严格规则：
1. 不要执行 shell 命令、不要读写文件，直接基于专业工程与面试教研经验输出。
2. 必须且只能输出**一个合法 JSON 对象**（用 \`\`\`json 和 \`\`\` 包裹，不要在代码块外写任何解释文字）。
3. 复习路径中的 \`siteLinks\` 只能从下方「站内真实课程目录」中选择准确存在的相对路径，严禁编造 URL。
4. 专题面试题必须紧扣 JD/面经里的真实技术栈、业务场景与高频追问，答案必须深入、结构化、包含关键原理/数字/边界条件或核心代码片段（可使用 \`\`\` 代码块），拒绝空洞八股。
5. 所有输出使用简体中文。

【站内真实课程目录】
${promptText}

【必须严格遵守的 JSON 结构】
\`\`\`json
{
  "roleTitle": "岗位或面经主题名称（25字内）",
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
  ],
  "questions": [
    {
      "title": "具体面试题干（直击 JD/面经真实场景）",
      "section": "专题短标签（如：并发调优，16字内）",
      "difficulty": "基础 | 进阶 | 高阶",
      "whyAsked": "对应 JD/面经的哪条要求（30字内）",
      "answer": "生产级高质量参考答案（分段清晰，可用 \`\`\` 代码块，200-700字）",
      "followups": ["连环追问1", "连环追问2"]
    }
  ]
}
\`\`\``;
 return cachedSystemPrompt;
}

export function buildJdResearchInput(opts: {
 kind: JdInputKind;
 source: string;
 days: JdPrepDays;
 level: JdSeniority;
 questionCount: number;
}): string {
 const kindLabel = opts.kind === 'experience' ? '真实面经 / 面试记录' : '目标岗位 JD';
 const levelLabel =
  opts.level === 'junior'
   ? '校招 / 初级工程师（1–2 年）'
   : opts.level === 'senior'
     ? '资深 / 架构师（5 年+，侧重高并发、权衡与演进）'
     : '中级 / 高级工程师（3–5 年，侧重原理、排障与落地）';
 return [
  `【调研类型】${kindLabel}`,
  `【备考周期】${opts.days} 天（请将 roadmap 合理划分为 3–5 个紧凑阶段，覆盖这 ${opts.days} 天）`,
  `【目标级别】${levelLabel}`,
  `【专题题库数量】生成恰好 ${opts.questionCount} 道高命中率实战面试题（覆盖 4–6 个核心考点维度，dimensions 权重之和尽量接近 100）`,
  '',
  `【原始${opts.kind === 'experience' ? '面经' : '岗位 JD'}内容】`,
  opts.source,
 ].join('\n');
}

function extractJsonText(raw: string): string | null {
 // Strip ONLY an outer wrapping ```json ... ``` fence (never match non-greedily, because JSON
 // `answer` strings legitimately contain nested ```go / ```sql code blocks!).
 const trimmed = raw
  .trim()
  .replace(/^```(?:json)?\s*\r?\n?/i, '')
  .replace(/\r?\n?```\s*$/, '')
  .trim();

 const start = trimmed.indexOf('{');
 if (start < 0) return null;

 // Walk string-aware brace balance to find the exact matching closing `}`.
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

 const end = trimmed.lastIndexOf('}');
 return end > start ? trimmed.slice(start, end + 1) : null;
}

function safeParseJson(text: string): unknown {
 try {
  return JSON.parse(text);
 } catch {
  // Remove trailing commas before ] or }
  const cleaned = text.replace(/,\s*([}\]])/g, '$1');
  try {
   return JSON.parse(cleaned);
  } catch {
   return null;
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
 // Strip &card=... if agent included card anchor
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

 // If system design / architecture / high concurrency keywords appear, offer Architect Review
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

export function parseAndEnrichJdReport(rawText: string): JdResearchReport | null {
 const jsonText = extractJsonText(rawText);
 if (!jsonText) return null;
 const parsed = safeParseJson(jsonText);
 if (!parsed || typeof parsed !== 'object') return null;
 const obj = parsed as Record<string, unknown>;
 const { validLinks } = getCatalog();

 const roleTitle = str(obj.roleTitle, 80) || '岗位深度调研报告';
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
      return { phase, title, goals, siteLinks };
     })
     .filter((x): x is JdRoadmapStep => x !== null)
  : [];

 const questions: JdQuestionItem[] = Array.isArray(obj.questions)
  ? obj.questions
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
     .filter((x): x is JdQuestionItem => x !== null)
  : [];

 if (!dimensions.length && !roadmap.length && !questions.length) return null;

 return {
  roleTitle,
  companyStyle,
  summary,
  recommendedSubject,
  dimensions,
  traps,
  roadmap,
  questions,
 };
}
