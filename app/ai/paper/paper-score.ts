import {gradeQuestionText,startersFor} from '@/content/code-starters';
import {fillMatches,type AiQuiz} from '@/content/journey';
import {paperSections,questionMax,PAPER_TOTAL,type Paper} from '@/content/papers/types';
import type {GradeItem,GradeResult} from '@/lib/grade-types';

const isUntouchedStarter=(id:string,text?:string)=>{if(!text?.trim())return true;const s=startersFor(id);return !!s&&Object.values(s).some(v=>v.trim()===text.trim())};

// 一道题的作答：选择题记选中的选项下标，判断题记 true/false，填空题按空记文字，主观题记写下的答案。
export type PaperAnswer={choice?:number[];judge?:boolean;blanks?:string[];text?:string};
// AI 阅卷题（填空、简答、代码、综合）的得分：AI 评分结果，或者 AI 不可用时自评勾选的得分点。
export type WrittenScore={kind:'ai';result:GradeResult}|{kind:'self';score:number;got:boolean[]};
// orders：开考时为每道选择题随机打乱的选项顺序（存原始下标），交卷后复查沿用同一顺序；下载的 PDF 按原始顺序。
// pausedAt：正在暂停（暂停开始的时间）；pausedMs：之前所有暂停加起来的时长，不计入考试用时。
// qids：这次实际出的题（每次开考会换一部分题）；没有时就是原试卷。
export type PaperRecord={startedAt:number;qids?:string[];pausedAt?:number;pausedMs?:number;answers:Record<string,PaperAnswer>;orders?:Record<string,number[]>;submittedAt?:number;written?:Record<string,WrittenScore>;gradeNote?:string};

// 每道题的题型内序号和满分，按试卷顺序排好。
export function paperLayout(p:Paper){const at:Record<string,number>={};
 return p.questions.map(q=>{const t=q.type??'single',index=at[t]=(at[t]??-1)+1;return {q,index,max:questionMax(q,index),section:paperSections.findIndex(s=>s.type===t)}})}

export const isWrittenQuiz=(q:AiQuiz)=>q.type==='short'||q.type==='code'||q.type==='design';
export const isAiGradedQuiz=(q:AiQuiz)=>q.type==='fill'||isWrittenQuiz(q);
export const fillPoints=(q:Extract<AiQuiz,{type:'fill'}>)=>{const lists=q.blanks??[q.accepted];return lists.map((l,i)=>lists.length>1?`第 ${i+1} 空（参考答案：${l.join(' / ')}）`:`参考答案：${l.join(' / ')}`)};
export const fillScores=(q:Extract<AiQuiz,{type:'fill'}>)=>(q.blanks??[q.accepted]).map(()=>1);
export const answered=(q:AiQuiz,a?:PaperAnswer)=>{if(!a)return false;switch(q.type??'single'){
 case 'single':case 'multi':return !!a.choice?.length;
 case 'judge':return a.judge!==undefined;
 case 'fill':return !!a.blanks?.some(b=>typeof b==='string'&&b.trim()!=='');
 default:return !isUntouchedStarter(q.id,a.text)}};

export function toPaperGradeItem(q:AiQuiz,max:number,a?:PaperAnswer):GradeItem|null{
 if(!answered(q,a))return null;
 if(q.type==='fill'){const lists=q.blanks??[q.accepted],values=a?.blanks??[];
  return {id:q.id,kind:'fill',q:q.q,code:q.code,reference:lists.map((l,i)=>(lists.length>1?`第 ${i+1} 空：`:'')+l.join(' / ')).join('；'),points:fillPoints(q),scores:fillScores(q),max,answer:lists.map((_,i)=>(lists.length>1?`第 ${i+1} 空：`:'')+(values[i]?.trim()||'（未填）')).join('；')}}
 if(isWrittenQuiz(q)){const w=q as Extract<AiQuiz,{reference:string}>;
  return {id:w.id,kind:w.type,q:gradeQuestionText(w.id,w.q),code:w.code,reference:w.reference,points:w.points,scores:w.scores,max,answer:a!.text!}}
 return null}

// 填空题：如果某个空已经严格命中标准答案，保证给满分 1 分；没填的空保证 0 分。
export function fixFillGrade(q:AiQuiz,a:PaperAnswer|undefined,g:GradeResult):GradeResult{
 if(q.type!=='fill')return g;
 const lists=q.blanks??[q.accepted],values=a?.blanks??[];
 const hits=g.hits.map((h,i)=>{const v=values[i]?.trim()??'',accepted=lists[i]??[];
  const got=!v?0:fillMatches(accepted,v)?h.max:h.got;return {...h,got}});
 return {...g,hits,score:hits.reduce((n,h)=>n+h.got,0)}}

// 客观题得分：单选、判断全对得分；多选必须完全一致，少选多选错选都是 0 分；填空题在 AI 尚未评分时按标准答案匹配兜底计分。
export function objectiveScore(q:AiQuiz,max:number,a?:PaperAnswer){switch(q.type??'single'){
 case 'single':{const s=q as Extract<AiQuiz,{answer:number}>;return a?.choice?.length===1&&a.choice[0]===s.answer?max:0}
 case 'multi':{const m=q as Extract<AiQuiz,{type:'multi'}>,c=a?.choice??[];return c.length===m.answers.length&&c.every(i=>m.answers.includes(i))?max:0}
 case 'judge':return a?.judge===(q as Extract<AiQuiz,{type:'judge'}>).answer?max:0;
 case 'fill':{const f=q as Extract<AiQuiz,{type:'fill'}>,lists=f.blanks??[f.accepted];return lists.reduce((n,accepted,i)=>n+(fillMatches(accepted,a?.blanks?.[i]??'')?1:0),0)}
 default:return 0}}
export const writtenScoreOf=(w?:WrittenScore)=>!w?0:w.kind==='ai'?w.result.score:w.score;

// 整卷得分：总分和每个题型的得分。填空题优先用 AI 评分结果，未评分时用规则匹配兜底；简答/代码/综合题未评分时按 0 分计。
export function paperScore(p:Paper,r:PaperRecord){const rows=paperLayout(p).map(x=>({...x,got:isWrittenQuiz(x.q)?writtenScoreOf(r.written?.[x.q.id]):x.q.type==='fill'&&r.written?.[x.q.id]?writtenScoreOf(r.written[x.q.id]):objectiveScore(x.q,x.max,r.answers[x.q.id])}));
 const sections=paperSections.map((s,i)=>({...s,got:rows.filter(x=>x.section===i).reduce((n,x)=>n+x.got,0),max:rows.filter(x=>x.section===i).reduce((n,x)=>n+x.max,0)}));
 return {rows,sections,total:rows.reduce((n,x)=>n+x.got,0),max:PAPER_TOTAL}}
