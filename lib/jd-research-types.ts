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
};

export type JdQuestionItem = {
 title: string;
 section: string;
 difficulty: '基础' | '进阶' | '高阶';
 whyAsked: string;
 answer: string;
 followups: string[];
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
};

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
  lines.push('', '## 三、分阶段复习路径');
  for (const s of r.roadmap) {
   lines.push('', `### ${s.phase} · ${s.title}`);
   for (const g of s.goals) lines.push(`- ${g}`);
   if (s.siteLinks.length) {
    lines.push(`- 站内推荐：${s.siteLinks.map(l => `[${l.label}](${l.href})`).join(' · ')}`);
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

 return lines.join('\n').trim();
}
