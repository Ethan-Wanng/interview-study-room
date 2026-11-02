import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {studyDb,dayNow} from '@/db/study';
import {tutorStream} from '@/lib/gemini';
import {TUTOR_LIMITS,TUTOR_QUOTA,type TutorEvent,type TutorLesson,type TutorMessage} from '@/lib/tutor-types';

export const dynamic='force-dynamic';
const fail=(error:string,message:string,status=400,extra:object={})=>Response.json({error,message,...extra},{status});
const limitOf=(guest:number)=>guest?TUTOR_QUOTA.guest:TUTOR_QUOTA.user;
const used=async(user:string)=>(await studyDb().prepare('SELECT count FROM ai_tutor_quota WHERE user_id=? AND day=?').bind(user,dayNow()).first<{count:number}>())?.count??0;
const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;

function parse(body:unknown):{lesson:TutorLesson;messages:TutorMessage[]}|null{if(!body||typeof body!=='object')return null;const {lesson:l,messages:m}=body as Record<string,unknown>;
 if(!l||typeof l!=='object'||!Array.isArray(m)||!m.length||m.length>TUTOR_LIMITS.messages)return null;const o=l as Record<string,unknown>;
 if(!str(o.title,200)||!str(o.body,TUTOR_LIMITS.lesson)||!Array.isArray(o.steps)||o.steps.length>20||!o.steps.every(s=>str(s,1000)))return null;
 if(o.code!==undefined&&!str(o.code,TUTOR_LIMITS.lesson)||o.expect!==undefined&&!str(o.expect,4000))return null;
 const messages=m.map(x=>x&&typeof x==='object'?x as Record<string,unknown>:{});
 if(!messages.every(x=>(x.role==='user'||x.role==='model')&&str(x.text,TUTOR_LIMITS.text)&&(x.text as string).trim()))return null;
 if(messages[0].role!=='user'||messages[messages.length-1].role!=='user')return null;
 return {lesson:{title:o.title as string,body:o.body as string,steps:o.steps as string[],code:o.code as string|undefined,expect:o.expect as string|undefined},messages:messages.map(x=>({role:x.role as TutorMessage['role'],text:x.text as string}))}}

// 今天还能问几次。
export async function GET(req:Request){const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 const limit=limitOf(user.is_guest);return Response.json({remaining:Math.max(0,limit-await used(user.id)),limit})}

// 发一条消息给 AI 老师：扣一次额度后流式返回回复（NDJSON，见 TutorEvent）；失败时退回这次额度。
export async function POST(req:Request){try{assertSameOrigin(req);const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 let body:unknown;try{body=JSON.parse(await req.text())}catch{return fail('invalid','请求内容无效。')}
 const input=parse(body);if(!input)return fail('invalid','请求内容无效，或者对话太长了，可以点“重新开始”。');
 const db=studyDb(),day=dayNow(),limit=limitOf(user.is_guest);
 const row=await db.prepare('INSERT INTO ai_tutor_quota(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user.id,day,limit).first<{count:number}>();
 if(!row)return fail('quota',user.is_guest?`游客每天可以问 AI 老师 ${limit} 次，今天的次数已用完。登录后每天有 ${TUTOR_QUOTA.user} 次。`:`今天的 ${limit} 次 AI 老师已用完，明天再来吧。`,429,{remaining:0});
 const enc=new TextEncoder(),refund=()=>db.prepare('UPDATE ai_tutor_quota SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(user.id,day).run();
 const out=new ReadableStream<Uint8Array>({async start(c){const send=(e:TutorEvent)=>c.enqueue(enc.encode(JSON.stringify(e)+'\n'));send({t:'start'});
  try{await tutorStream(input.lesson,input.messages,text=>send({t:'delta',text}),()=>send({t:'reset'}));send({t:'done',remaining:Math.max(0,limit-row.count)})}
  catch{await refund().catch(()=>{});send({t:'error',message:'AI 老师暂时连不上，这次没有扣次数，请稍后再试。'})}
  c.close()}});
 return new Response(out,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store, no-transform','x-accel-buffering':'no'}})}
 catch(e){if(e instanceof AuthError)return fail('auth',e.message,e.status);return fail('failed','AI 老师暂时不可用。',500)}}
