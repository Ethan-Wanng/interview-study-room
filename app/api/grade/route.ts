import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {studyDb,dayNow} from '@/db/study';
import {grade} from '@/lib/gemini';
import {GRADE_LIMITS,GRADE_QUOTA,type GradeItem,type GradeKind} from '@/lib/grade-types';

export const dynamic='force-dynamic';
const fail=(error:string,message:string,status=400,extra:object={})=>Response.json({error,message,...extra},{status});
const limitOf=(guest:number)=>guest?GRADE_QUOTA.guest:GRADE_QUOTA.user;
const used=async(user:string)=>(await studyDb().prepare('SELECT count FROM ai_grade_quota WHERE user_id=? AND day=?').bind(user,dayNow()).first<{count:number}>())?.count??0;

const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
function parseItem(v:unknown):GradeItem|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(!str(o.id,80)||!['short','code','design'].includes(o.kind as string)||!str(o.q,4000)||!str(o.reference,12000)||!str(o.answer,GRADE_LIMITS.answer))return null;
 if(o.code!==undefined&&!str(o.code,6000))return null;
 if(!Array.isArray(o.points)||!o.points.length||o.points.length>12||!o.points.every(p=>str(p,400)))return null;
 const max=Number(o.max);if(!Number.isFinite(max)||max<1||max>30)return null;
 const scores=Array.isArray(o.scores)&&o.scores.length===o.points.length&&o.scores.every(s=>typeof s==='number'&&s>=0)?o.scores as number[]:undefined;
 return {id:o.id as string,kind:o.kind as GradeKind,q:o.q as string,code:o.code as string|undefined,reference:o.reference as string,points:o.points as string[],scores,max,answer:o.answer as string}}

// 剩余额度。
export async function GET(req:Request){const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 const limit=limitOf(user.is_guest);return Response.json({remaining:Math.max(0,limit-await used(user.id)),limit})}

// 一次请求评一道题或一整份试卷的主观题，计一次额度；评分失败时退回这次额度。
export async function POST(req:Request){try{assertSameOrigin(req);const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 const raw=await req.text();if(raw.length>GRADE_LIMITS.total)return fail('invalid','答案太长了，请精简后再提交。');
 let body:unknown;try{body=JSON.parse(raw)}catch{return fail('invalid','请求内容无效。')}
 const list=(body as {items?:unknown})?.items;if(!Array.isArray(list)||!list.length||list.length>GRADE_LIMITS.items)return fail('invalid','请求内容无效。');
 const items=list.map(parseItem);if(items.some(x=>!x))return fail('invalid','请求内容无效。');
 const db=studyDb(),day=dayNow(),limit=limitOf(user.is_guest);
 const row=await db.prepare('INSERT INTO ai_grade_quota(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user.id,day,limit).first<{count:number}>();
 if(!row)return fail('quota',user.is_guest?`游客每天可以用 ${limit} 次 AI 评分，今天的次数已用完。登录后每天有 ${GRADE_QUOTA.user} 次，也可以先对照得分点自评。`:`今天的 ${limit} 次 AI 评分已用完，明天再来，或先对照得分点自评。`,429,{remaining:0});
 try{const {results,model}=await grade(items as GradeItem[]);return Response.json({results,model,remaining:Math.max(0,limit-row.count)})}
 catch{await db.prepare('UPDATE ai_grade_quota SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(user.id,day).run();
  return fail('failed','AI 评分暂时不可用，这次没有扣次数。可以稍后再试，或先对照得分点自评。',503)}}
 catch(e){if(e instanceof AuthError)return fail('auth',e.message,e.status);return fail('failed','AI 评分暂时不可用。',500)}}
