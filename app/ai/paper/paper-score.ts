import {fillMatches,type AiQuiz} from '@/content/journey';
import {paperSections,questionMax,PAPER_TOTAL,type Paper} from '@/content/papers/types';
import type {GradeResult} from '@/lib/grade-types';

// 一道题的作答：选择题记选中的选项下标，判断题记 true/false，填空题按空记文字，主观题记写下的答案。
export type PaperAnswer={choice?:number[];judge?:boolean;blanks?:string[];text?:string};
// 主观题的得分：AI 评分结果，或者 AI 不可用时自评勾选的得分点。
export type WrittenScore={kind:'ai';result:GradeResult}|{kind:'self';score:number;got:boolean[]};
// orders：开考时为每道选择题随机打乱的选项顺序（存原始下标），交卷后复查沿用同一顺序；下载的 PDF 按原始顺序。
// pausedAt：正在暂停（暂停开始的时间）；pausedMs：之前所有暂停加起来的时长，不计入考试用时。
// qids：这次实际出的题（每次开考会换一部分题）；没有时就是原试卷。
export type PaperRecord={startedAt:number;qids?:string[];pausedAt?:number;pausedMs?:number;answers:Record<string,PaperAnswer>;orders?:Record<string,number[]>;submittedAt?:number;written?:Record<string,WrittenScore>;gradeNote?:string};

// 每道题的题型内序号和满分，按试卷顺序排好。
export function paperLayout(p:Paper){const at:Record<string,number>={};
 return p.questions.map(q=>{const t=q.type??'single',index=at[t]=(at[t]??-1)+1;return {q,index,max:questionMax(q,index),section:paperSections.findIndex(s=>s.type===t)}})}

export const isWrittenQuiz=(q:AiQuiz)=>q.type==='short'||q.type==='code'||q.type==='design';
export const answered=(q:AiQuiz,a?:PaperAnswer)=>{if(!a)return false;switch(q.type??'single'){
 case 'single':case 'multi':return !!a.choice?.length;
 case 'judge':return a.judge!==undefined;
 case 'fill':return !!a.blanks?.some(b=>typeof b==='string'&&b.trim()!=='');
 default:return !!a.text?.trim()}};

// 客观题得分：单选、判断全对得分；多选必须完全一致，少选多选错选都是 0 分；填空按空计分。
export function objectiveScore(q:AiQuiz,max:number,a?:PaperAnswer){switch(q.type??'single'){
 case 'single':{const s=q as Extract<AiQuiz,{answer:number}>;return a?.choice?.length===1&&a.choice[0]===s.answer?max:0}
 case 'multi':{const m=q as Extract<AiQuiz,{type:'multi'}>,c=a?.choice??[];return c.length===m.answers.length&&c.every(i=>m.answers.includes(i))?max:0}
 case 'judge':return a?.judge===(q as Extract<AiQuiz,{type:'judge'}>).answer?max:0;
 case 'fill':{const f=q as Extract<AiQuiz,{type:'fill'}>,lists=f.blanks??[f.accepted];return lists.reduce((n,accepted,i)=>n+(fillMatches(accepted,a?.blanks?.[i]??'')?1:0),0)}
 default:return 0}}
export const writtenScoreOf=(w?:WrittenScore)=>!w?0:w.kind==='ai'?w.result.score:w.score;

// 整卷得分：总分和每个题型的得分。主观题还没评分时按 0 分计。
export function paperScore(p:Paper,r:PaperRecord){const rows=paperLayout(p).map(x=>({...x,got:isWrittenQuiz(x.q)?writtenScoreOf(r.written?.[x.q.id]):objectiveScore(x.q,x.max,r.answers[x.q.id])}));
 const sections=paperSections.map((s,i)=>({...s,got:rows.filter(x=>x.section===i).reduce((n,x)=>n+x.got,0),max:rows.filter(x=>x.section===i).reduce((n,x)=>n+x.max,0)}));
 return {rows,sections,total:rows.reduce((n,x)=>n+x.got,0),max:PAPER_TOTAL}}
