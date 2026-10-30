import type {AiQuiz} from '@/content/journey';
import type {GradeItem,GradeResponse,GradeResult} from '@/lib/grade-types';

type Written=Extract<AiQuiz,{type:'short'|'code'|'design'}>;
export const isWritten=(q:AiQuiz):q is Written=>q.type==='short'||q.type==='code'||q.type==='design';
// 练习题没有分值，按 10 分制评分；试卷题传入本题满分。
export const PRACTICE_MAX=10;
export const toGradeItem=(q:Written,answer:string,max=PRACTICE_MAX):GradeItem=>({id:q.id,kind:q.type,q:q.q,code:q.code,reference:q.reference,points:q.points,scores:q.scores,max,answer});

// 调用 AI 评分。返回评分结果，或者一个可以直接展示给用户的错误说明（额度用完、服务不可用、网络断开）。
export type GradeOutcome={ok:true;results:GradeResult[];remaining:number}|{ok:false;quota:boolean;message:string};
export async function requestGrade(items:GradeItem[]):Promise<GradeOutcome>{
 try{const res=await fetch('/api/grade',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})});
  const j=await res.json() as GradeResponse;
  if('results' in j)return {ok:true,results:j.results,remaining:j.remaining};
  return {ok:false,quota:j.error==='quota',message:j.message}}
 catch{return {ok:false,quota:false,message:'网络连接失败，这次没有扣次数。可以稍后再试，或先对照得分点自评。'}}}
