import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {studyDb,dayNow} from '@/db/study';
import {getUserAiSettings,prepareCustomAi} from '@/db/ai-config';
import {gradeStream} from '@/lib/gemini';
import {GRADE_LIMITS,GRADE_QUOTA,type GradeEvent,type GradeItem,type GradeKind} from '@/lib/grade-types';

export const dynamic='force-dynamic';
const fail=(error:string,message:string,status=400,extra:object={})=>Response.json({error,message,...extra},{status});
const limitOf=(guest:number)=>guest?GRADE_QUOTA.guest:GRADE_QUOTA.user;
const used=async(user:string)=>(await studyDb().prepare('SELECT count FROM ai_grade_quota WHERE user_id=? AND day=?').bind(user,dayNow()).first<{count:number}>())?.count??0;

const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
function parseItem(v:unknown):GradeItem|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(!str(o.id,80)||!['fill','short','code','design'].includes(o.kind as string)||!str(o.q,4000)||!str(o.reference,12000)||!str(o.answer,GRADE_LIMITS.answer))return null;
 if(o.code!==undefined&&!str(o.code,6000))return null;
 if(!Array.isArray(o.points)||!o.points.length||o.points.length>12||!o.points.every(p=>str(p,400)))return null;
 const max=Number(o.max);if(!Number.isFinite(max)||max<1||max>30)return null;
 const scores=Array.isArray(o.scores)&&o.scores.length===o.points.length&&o.scores.every(s=>typeof s==='number'&&s>=0)?o.scores as number[]:undefined;
 return {id:o.id as string,kind:o.kind as GradeKind,q:o.q as string,code:o.code as string|undefined,reference:o.reference as string,points:o.points as string[],scores,max,answer:o.answer as string}}

// 剩余额度。
export async function GET(req:Request){const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 if(!user.is_guest){
  const s=await getUserAiSettings(user.id);
  if(s.enabled&&s.hasKey&&s.allowGrade){
   const rem=s.dailyLimit>0?Math.max(0,s.dailyLimit-s.usedToday):999;
   return Response.json({remaining:rem,limit:s.dailyLimit||999,custom:true,provider:s.provider,model:s.model});
  }
 }
 const limit=limitOf(user.is_guest);return Response.json({remaining:Math.max(0,limit-await used(user.id)),limit,custom:false})}

// 一次请求评一道题或一整份试卷的主观题，计一次额度；评分失败时退回这次额度。
// 扣完额度后改为流式返回（NDJSON，见 GradeEvent）：模型写出的文字实时转发给页面，最后一行是校正过分数的结果。
export async function POST(req:Request){try{assertSameOrigin(req);const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 const raw=await req.text();if(raw.length>GRADE_LIMITS.total)return fail('invalid','答案太长了，请精简后再提交。');
 let body:unknown;try{body=JSON.parse(raw)}catch{return fail('invalid','请求内容无效。')}
 const list=(body as {items?:unknown})?.items;if(!Array.isArray(list)||!list.length||list.length>GRADE_LIMITS.items)return fail('invalid','请求内容无效。');
 const items=list.map(parseItem);if(items.some(x=>!x))return fail('invalid','请求内容无效。');

 // 已登录用户如果启用了专属 API，则仅本人可用并执行其自设限制（游客绝不允许替换 API）
 if(!user.is_guest){
  const custom=await prepareCustomAi(user.id,'grade');
  if(custom.mode==='blocked')return fail('quota',custom.message,429,{remaining:0});
  if(custom.mode==='custom'){
   const enc=new TextEncoder();
   const out=new ReadableStream<Uint8Array>({async start(c){const send=(e:GradeEvent)=>c.enqueue(enc.encode(JSON.stringify(e)+'\n'));send({t:'start'});
    try{const {results,model}=await gradeStream(items as GradeItem[],text=>send({t:'delta',text}),()=>send({t:'reset'}),custom.config);send({t:'done',results,model,remaining:custom.remaining})}
    catch{await custom.refund().catch(()=>{});send({t:'error',message:`专属 API（${custom.config.provider} / ${custom.config.model}）评分失败，请检查「AI 设置」中的 API Key 或模型名称（本次未扣调用次数）。`})}
    c.close()}});
   return new Response(out,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store, no-transform','x-accel-buffering':'no'}});
  }
 }

 const db=studyDb(),day=dayNow(),limit=limitOf(user.is_guest);
 const row=await db.prepare('INSERT INTO ai_grade_quota(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user.id,day,limit).first<{count:number}>();
 if(!row)return fail('quota',user.is_guest?`游客每天可以用 ${limit} 次 AI 评分，今天的次数已用完。登录后每天有 ${GRADE_QUOTA.user} 次，还可配置自己的专属 API，或先对照得分点自评。`:`今天的 ${limit} 次站点默认 AI 评分已用完，明天再来、在「AI 设置」中绑定自己的 API Key，或先对照得分点自评。`,429,{remaining:0});
 const enc=new TextEncoder(),refund=()=>db.prepare('UPDATE ai_grade_quota SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(user.id,day).run();
 const out=new ReadableStream<Uint8Array>({async start(c){const send=(e:GradeEvent)=>c.enqueue(enc.encode(JSON.stringify(e)+'\n'));send({t:'start'});
  try{const {results,model}=await gradeStream(items as GradeItem[],text=>send({t:'delta',text}),()=>send({t:'reset'}));send({t:'done',results,model,remaining:Math.max(0,limit-row.count)})}
  catch{await refund().catch(()=>{});send({t:'error',message:'AI 评分暂时不可用，这次没有扣次数。可以稍后再试，或先对照得分点自评。'})}
  c.close()}});
 return new Response(out,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store, no-transform','x-accel-buffering':'no'}})}
 catch(e){if(e instanceof AuthError)return fail('auth',e.message,e.status);return fail('failed','AI 评分暂时不可用。',500)}}
