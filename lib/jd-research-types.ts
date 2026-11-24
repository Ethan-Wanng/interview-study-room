import { aiQuizTypes, type AiQuiz } from '@/content/journey';
import type { AntigravityUsage } from './antigravity-agent';

export type JdInputKind = 'jd' | 'experience';

export type JdSkillDimension = {
 name: string;
 weight: number;
 priority: 'P0' | 'P1' | 'P2';
 focus: string;
};

export type JdSiteLink = {
 label: string;
 href: string;
};

export type JdRoadmapStep = {
 phase: string;
 title: string;
 goals: string[];
 siteLinks: JdSiteLink[];
 quizzes?: AiQuiz[];
};

export type JdQuestionItem = {
 title: string;
 section: string;
 difficulty: '基础' | '进阶' | '高阶';
 whyAsked: string;
 answer: string;
 followups: string[];
};

export type JdResumeSkillGroup = {
 category: string;
 items: string[];
};

export type JdResumeProject = {
 name: string;
 role: string;
 period?: string;
 stack: string[];
 background: string;
 actions: string[];
 results: string[];
 interviewTips?: string[];
};

export type JdReferenceResume = {
 targetRole: string;
 positioning: string;
 techStack: JdResumeSkillGroup[];
 projects: JdResumeProject[];
};

export type JdResearchReport = {
 roleTitle: string;
 inferredLevel?: string;
 prepDays?: string;
 companyStyle: string;
 summary: string;
 recommendedSubject: string;
 dimensions: JdSkillDimension[];
 traps: string[];
 roadmap: JdRoadmapStep[];
 questions: JdQuestionItem[];
 resume?: JdReferenceResume;
};

export type JdStageKey = 'profile' | 'roadmap' | 'quizzes' | 'questions';

export type JdLiveProgress = {
 stage: 1 | 2;
 activeKey: JdStageKey;
 roleTitle?: string;
 inferredLevel?: string;
 prepDays?: string;
 companyStyle?: string;
 dimCount: number;
 stageCount: number;
 quizCount: number;
 questionCount: number;
 qTitles: string[];
 stage1Cached?: boolean;
};

export type JdCacheMeta = {
 hit?: boolean;
 stage1Hit?: boolean;
 usage?: AntigravityUsage;
};

export function hasStructuredStudyQuizzes(r: JdResearchReport | null | undefined): boolean {
 return Boolean(r?.roadmap?.some(s => Array.isArray(s.quizzes) && s.quizzes.length > 0));
}

export function countJdStudyQuizzes(r: JdResearchReport | null | undefined): number {
 if (!r) return 0;
 const studyCount = (r.roadmap ?? []).reduce((sum, s) => sum + (Array.isArray(s.quizzes) ? s.quizzes.length : 0), 0);
 return studyCount > 0 ? studyCount : (r.questions?.length ?? 0);
}

const LETTERS = 'ABCDEFGH';

function formatStudyQuizMarkdown(qz: AiQuiz, idx: number): string[] {
 const lines: string[] = [];
 const typeName = aiQuizTypes[qz.type ?? 'single'];
 lines.push(`#### 练习 ${idx + 1}（${typeName}）：${qz.q}`);
 if (qz.code) {
  lines.push('', '```', qz.code, '```');
 }
 if ('options' in qz && Array.isArray(qz.options)) {
  lines.push('');
  qz.options.forEach((opt, oi) => {
   lines.push(`- **${LETTERS[oi] || oi + 1}.** ${opt}`);
  });
  if (qz.type === 'multi') {
   const ansLetters = qz.answers.map(a => LETTERS[a] || String(a + 1)).join('、');
   lines.push('', `**正确答案**：${ansLetters}`);
  } else if ('answer' in qz) {
   lines.push('', `**正确答案**：${LETTERS[qz.answer] || qz.answer + 1}`);
  }
 } else if (qz.type === 'fill') {
  lines.push('', `**参考答案**：${qz.accepted.join(' / ')}`);
 } else if (qz.type === 'short' || qz.type === 'code' || qz.type === 'design') {
  if (qz.type === 'code') {
   lines.push('', '**参考代码**：', '```', qz.reference, '```');
  } else {
   lines.push('', `**参考答案**：${qz.reference}`);
  }
  if (qz.points?.length) {
   lines.push('', `**得分要点**：${qz.points.join('；')}`);
  }
 }
 if (qz.explain) {
  lines.push('', `**解析**：${qz.explain}`);
 }
 return lines;
}

function formatResumeSectionsMarkdown(resume: JdReferenceResume, headingPrefix = '##'): string[] {
 const lines: string[] = [];
 if (resume.positioning) {
  lines.push('', `${headingPrefix} 个人定位`, '', resume.positioning);
 }
 if (resume.techStack.length) {
  lines.push('', `${headingPrefix} 专业技术栈`);
  for (const grp of resume.techStack) {
   lines.push('', `${headingPrefix}# ${grp.category}`);
   for (const item of grp.items) lines.push(`- ${item}`);
  }
 }
 if (resume.projects.length) {
  lines.push('', `${headingPrefix} 核心项目经历`);
  for (const proj of resume.projects) {
   const meta = [proj.role, proj.period].filter(Boolean).join(' · ');
   lines.push('', `${headingPrefix}# ${proj.name}${meta ? `（${meta}）` : ''}`);
   if (proj.stack.length) lines.push(`- **技术栈**：${proj.stack.join(' / ')}`);
   if (proj.background) lines.push(`- **项目背景**：${proj.background}`);
   if (proj.actions.length) {
    lines.push('- **核心工作**：');
    for (const act of proj.actions) lines.push(`  - ${act}`);
   }
   if (proj.results.length) {
    lines.push('- **量化成果**：');
    for (const res of proj.results) lines.push(`  - ${res}`);
   }
   if (proj.interviewTips?.length) {
    lines.push('- **面试深挖准备**：');
    for (const tip of proj.interviewTips) lines.push(`  - ${tip}`);
   }
  }
 }
 return lines;
}

export function resumeToMarkdown(resume: JdReferenceResume): string {
 const lines: string[] = [`# 参考简历 · ${resume.targetRole}`, ...formatResumeSectionsMarkdown(resume, '##')];
 return lines.join('\n').trim();
}

export function reportToMarkdown(r: JdResearchReport): string {
 const lines: string[] = [];
 const meta = [r.inferredLevel, r.prepDays ? `建议周期 ${r.prepDays}` : '', r.companyStyle].filter(Boolean).join(' · ');
 lines.push(`# ${r.roleTitle}${meta ? `（${meta}）` : ''}`);
 if (r.summary) lines.push('', r.summary);

 if (r.dimensions.length) {
  lines.push('', '## 一、核心考点权重');
  for (const d of r.dimensions) {
   lines.push(`- **[${d.priority} · ${d.weight}%] ${d.name}**：${d.focus}`);
  }
 }

 if (r.traps.length) {
  lines.push('', '## 二、高频扣分点');
  r.traps.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
 }

 if (r.roadmap.length) {
  lines.push('', '## 三、分阶段复习路径与配套学习题');
  for (const s of r.roadmap) {
   lines.push('', `### ${s.phase} · ${s.title}`);
   for (const g of s.goals) lines.push(`- ${g}`);
   if (s.siteLinks.length) {
    lines.push(`- 站内推荐：${s.siteLinks.map(l => `[${l.label}](${l.href})`).join(' · ')}`);
   }
   if (s.quizzes && s.quizzes.length > 0) {
    for (let qi = 0; qi < s.quizzes.length; qi++) {
     lines.push('', ...formatStudyQuizMarkdown(s.quizzes[qi], qi));
    }
   }
  }
 }

 if (r.questions.length) {
  lines.push('', '## 四、专题高频面试题');
  r.questions.forEach((q, i) => {
   lines.push('', `### ${i + 1}. [${q.difficulty}] ${q.title}`);
   if (q.section || q.whyAsked) {
    lines.push(`> 标签：${q.section || '专题'}${q.whyAsked ? ` ｜ 考察点：${q.whyAsked}` : ''}`);
   }
   lines.push('', q.answer);
   if (q.followups.length) {
    lines.push('', `**常见追问**：${q.followups.join('；')}`);
   }
  });
 }

 if (r.resume) {
  lines.push('', '## 五、岗位参考简历', ...formatResumeSectionsMarkdown(r.resume, '###'));
 }

 return lines.join('\n').trim();
}
