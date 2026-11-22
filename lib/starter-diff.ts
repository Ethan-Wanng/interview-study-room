import {startersFor} from '@/content/code-starters';
import type {GradeMark} from './grade-types';

const isCommentLine=(line:string)=>{const t=line.trim();return t.startsWith('//')||t.startsWith('#')||t.startsWith('/*')||t.startsWith('*')};

export type StarterAnalysis={
 template:string;
 todos:string[];
 starterLines:Set<string>;
 starterComments:string[];
 userLines:string[];
};

// 若学生作答基于预填代码框架（至少命中 2 行模板原文），拆分“框架原有行”与“学生实际填写/修改行”。
export function analyzeStarterAnswer(id:string,answer:string):StarterAnalysis|null{
 const starters=startersFor(id);
 if(!starters||!answer.trim())return null;
 const ansLines=answer.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 if(!ansLines.length)return null;

 let bestTemplate='',bestHits=0,bestSet=new Set<string>();
 for(const tpl of Object.values(starters)){
  if(!tpl)continue;
  const lines=new Set(tpl.split(/\r?\n/).map(l=>l.trim()).filter(Boolean));
  let hits=0;
  for(const l of ansLines)if(lines.has(l))hits++;
  if(hits>bestHits){bestHits=hits;bestTemplate=tpl;bestSet=lines}
 }
 if(bestHits<2||!bestTemplate)return null;

 const rawTplLines=bestTemplate.split(/\r?\n/);
 const todos=[...new Set(rawTplLines.map(l=>l.trim()).filter(l=>/\bTODO\b/.test(l)))];
 const starterComments=[...new Set(rawTplLines.map(l=>l.trim()).filter(l=>l&&isCommentLine(l)))];
 const userLines=answer.split(/\r?\n/).filter(line=>{const t=line.trim();return t.length>0&&!bestSet.has(t)});
 return {template:bestTemplate,todos,starterLines:bestSet,starterComments,userLines};
}

// 过滤掉针对预填框架（签名、TODO 注释、示例/注意事项注释、结构体/占位符行）的划词批注。
export function filterStarterMarks(id:string,answer:string,marks:GradeMark[]):GradeMark[]{
 const info=analyzeStarterAnswer(id,answer);
 if(!info||!marks.length)return marks;
 const userTrimmed=info.userLines.map(l=>l.trim());
 return marks.filter(m=>{
  const parts=m.quote.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!parts.length)return false;
  return parts.some(part=>{
   if(info.starterLines.has(part))return false;
   const onlyStarterComment=info.starterComments.some(c=>c.includes(part));
   if(onlyStarterComment&&!userTrimmed.some(u=>u.includes(part)))return false;
   return true;
  });
 });
}
