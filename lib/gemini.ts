import {env} from 'cloudflare:workers';
import {pointScores,type GradeItem,type GradeResult} from './grade-types';

// 用 Gemini 按得分点给简答、代码和综合题打分。密钥来自 Worker 的 GEMINI_API_KEY 密钥。
// 模型高峰期偶尔会 503 或超时，所以按顺序换下一个模型重试。
const MODELS=['gemini-3.5-flash','gemini-2.5-flash'],TIMEOUT=30000;
export class GradeError extends Error{}

const schema={type:'OBJECT',properties:{results:{type:'ARRAY',items:{type:'OBJECT',properties:{
 id:{type:'STRING'},hits:{type:'ARRAY',items:{type:'OBJECT',properties:{got:{type:'NUMBER'},comment:{type:'STRING'}},required:['got','comment']}},feedback:{type:'STRING'}},
 required:['id','hits','feedback']}}},required:['results']};

const system=`你是严格但友善的面试题阅卷老师。逐题、逐个得分点判断学生答案，给出每个得分点的得分（0 到该点满分，可以给一半分）和一句中文点评。
规则：只按得分点给分，不因为写得长或用词漂亮加分；意思对、说法不同也算对；答错、自相矛盾或只写了关键词没解释的，酌情扣分；
代码题看思路和关键逻辑是否正确，语法小错不扣分，逻辑错误、遗漏边界或并发安全问题要扣分；学生没作答时全部给 0 分。
feedback 用一两句话总结这题答得好的地方和最该补的一点。hits 的个数和顺序必须与得分点一致。`;

function prompt(items:GradeItem[]){return items.map(it=>{const scores=pointScores(it.points,it.max,it.scores);
 return [`### 题目 id：${it.id}（${it.kind==='code'?'代码题':it.kind==='design'?'综合题':'简答题'}，满分 ${it.max} 分）`,it.q,it.code?`题目代码：\n${it.code}`:'',`参考答案：\n${it.reference}`,
  '得分点：',...it.points.map((p,i)=>`${i+1}. ${p}（${scores[i]} 分）`),`学生答案：\n${it.answer.trim()||'（未作答）'}`].filter(Boolean).join('\n')}).join('\n\n')}

async function call(model:string,key:string,items:GradeItem[]){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT);
 try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt(items)}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json',responseSchema:schema}})});
  if(!res.ok)throw new GradeError(`${model} ${res.status}`);
  const j=await res.json() as {candidates?:{content?:{parts?:{text?:string}[]}}[]};
  const text=j.candidates?.[0]?.content?.parts?.map(p=>p.text??'').join('')??'';
  return JSON.parse(text) as {results:{id:string;hits:{got:number;comment:string}[];feedback:string}[]}}
 finally{clearTimeout(timer)}}

// 把模型的打分夹回合法范围：每个得分点 0..满分、按 0.5 取整，总分为各点之和。
export async function grade(items:GradeItem[]):Promise<GradeResult[]>{const key=(env as unknown as Record<string,string|undefined>).GEMINI_API_KEY;if(!key)throw new GradeError('missing key');
 let raw:Awaited<ReturnType<typeof call>>|undefined,last:unknown;
 for(const model of MODELS){try{raw=await call(model,key,items);break}catch(e){last=e}}
 if(!raw)throw last instanceof Error?last:new GradeError('grading failed');
 return items.map(it=>{const r=raw!.results.find(x=>x.id===it.id),scores=pointScores(it.points,it.max,it.scores);
  const hits=it.points.map((point,i)=>{const h=r?.hits[i],got=Math.max(0,Math.min(scores[i],Math.round((Number(h?.got)||0)*2)/2));return {point,got,max:scores[i],comment:h?.comment??''}});
  return {id:it.id,max:it.max,score:hits.reduce((n,h)=>n+h.got,0),hits,feedback:r?.feedback??''}})}
