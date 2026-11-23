import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {studyDb,dayNow} from '@/db/study';
import {getUserAiSettings,prepareCustomAi} from '@/db/ai-config';
import type {RuntimeAiConfig} from '@/lib/ai-config';
import {tutorStream,VisionError} from '@/lib/gemini';
import {studyCatalog} from '@/db/catalog';
import {searchForTutor} from '@/lib/site-search';
import {TUTOR_LIMITS,TUTOR_QUOTA,TUTOR_IMAGES,IMAGE_URL,TUTOR_MODELS,type TutorContext,type TutorEvent,type TutorLesson,type TutorMessage,type TutorPlayground,type TutorQuiz} from '@/lib/tutor-types';
import {parseThinkingLevel,type ThinkingLevel} from '@/lib/thinking';

export const dynamic='force-dynamic';
const fail=(error:string,message:string,status=400,extra:object={})=>Response.json({error,message,...extra},{status});
const limitOf=(guest:number)=>guest?TUTOR_QUOTA.guest:TUTOR_QUOTA.user;
const used=async(user:string)=>(await studyDb().prepare('SELECT count FROM ai_tutor_quota WHERE user_id=? AND day=?').bind(user,dayNow()).first<{count:number}>())?.count??0;
const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;

function lessonOf(v:unknown):TutorLesson|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(!str(o.title,200)||!str(o.body,TUTOR_LIMITS.lesson)||!Array.isArray(o.steps)||o.steps.length>20||!o.steps.every(s=>str(s,1000)))return null;
 if(o.code!==undefined&&!str(o.code,TUTOR_LIMITS.lesson)||o.expect!==undefined&&!str(o.expect,4000)||o.solution!==undefined&&!str(o.solution,TUTOR_LIMITS.lesson))return null;
 return {title:o.title as string,body:o.body as string,steps:o.steps as string[],code:o.code as string|undefined,expect:o.expect as string|undefined,solution:o.solution as string|undefined}}
function quizOf(v:unknown):TutorQuiz|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(!str(o.type,20)||!str(o.q,4000)||!str(o.answer,12000)||!str(o.explain,6000))return null;
 if(o.code!==undefined&&!str(o.code,6000)||o.given!==undefined&&!str(o.given,8000)||o.correct!==undefined&&typeof o.correct!=='boolean')return null;
 if(o.options!==undefined&&(!Array.isArray(o.options)||o.options.length>8||!o.options.every(x=>str(x,600))))return null;
 return {type:o.type as string,q:o.q as string,code:o.code as string|undefined,options:o.options as string[]|undefined,answer:o.answer as string,explain:o.explain as string,given:o.given as string|undefined,correct:o.correct as boolean|undefined}}
function playgroundOf(v:unknown):TutorPlayground|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(!str(o.lang,40)||!str(o.code,50_000))return null;
 if(o.output!==undefined&&!str(o.output,12_000)||o.error!==undefined&&!str(o.error,12_000))return null;
 return {lang:o.lang as string,code:o.code as string,output:o.output as string|undefined,error:o.error as string|undefined}}
function contextOf(v:unknown):TutorContext|null{if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>;
 if(o.kind==='practice'||o.kind==='lesson'||o.kind==='task'||o.kind==='support'){const lesson=lessonOf(o.lesson);return lesson&&{kind:o.kind,lesson}}
 if(o.kind==='hint'||o.kind==='explain'||o.kind==='recite'){const quiz=quizOf(o.quiz);return quiz&&{kind:o.kind,quiz}}
 if(o.kind==='playground'){const playground=playgroundOf(o.playground);return playground&&{kind:'playground',playground}}
 if(o.kind==='site')return str(o.page,300)?{kind:'site',page:o.page as string}:null;
 return null}
const normalizeTutorModel=(m:unknown)=>m==='gemini-flash'?'gemini-4':m;
function parse(body:unknown):{context:TutorContext;messages:TutorMessage[];model?:string;geminiProxy:boolean;thinkingLevel:ThinkingLevel}|null{if(!body||typeof body!=='object')return null;const {context:c,messages:m,model:rawModel,geminiProxy,thinkingLevel}=body as Record<string,unknown>;const model=normalizeTutorModel(rawModel);
 if(model!==undefined&&model!=='auto'&&model!=='custom'&&!TUTOR_MODELS.some(x=>x.id===model))return null;
 const context=contextOf(c);if(!context||!Array.isArray(m)||!m.length||m.length>TUTOR_LIMITS.messages)return null;
 const messages=m.map(x=>x&&typeof x==='object'?x as Record<string,unknown>:{});
 const imagesOf=(x:Record<string,unknown>)=>x.images===undefined?[]:Array.isArray(x.images)?x.images:null;
 if(!messages.every(x=>{const imgs=imagesOf(x);return (x.role==='user'||x.role==='model')&&str(x.text,TUTOR_LIMITS.text)&&imgs!==null&&((x.text as string).trim()||imgs.length)&&(x.role==='user'||!imgs.length)&&imgs.length<=TUTOR_IMAGES.perMessage&&imgs.every(u=>typeof u==='string'&&u.length<=TUTOR_IMAGES.size&&IMAGE_URL.test(u))}))return null;
 if(messages.reduce((n,x)=>n+(imagesOf(x)?.length??0),0)>TUTOR_IMAGES.perRequest)return null;
 if(messages[0].role!=='user'||messages[messages.length-1].role!=='user')return null;
 return {context,model:model as string|undefined,geminiProxy:geminiProxy!==false,thinkingLevel:parseThinkingLevel(thinkingLevel),messages:messages.map(x=>({role:x.role as TutorMessage['role'],text:x.text as string,...(imagesOf(x)?.length?{images:imagesOf(x) as string[]}:{})}))}}

// 学习者在问“哪里能学到 / 练到某个关键词”时，先做一次站内搜索，把找到的卡片、题目和面试题（带链接）交给 AI。
// 全站 AI 老师每次都搜；卡片和题目旁边的 AI 老师只在问到“哪里、哪一关、相关的题”这类话时才搜；答题前的提示和客服演练不搜。
const ASKS_WHERE=/哪里|哪儿|在哪|哪一关|哪张|哪些题|相关的题|类似的题|有关的题|还有.*题|去哪|找到|链接|where|which level|find/i;
async function findLinks(context:TutorContext,messages:TutorMessage[]):Promise<string>{
 if(context.kind==='hint'||context.kind==='support'||context.kind==='task')return '';
 const last=messages[messages.length-1]?.text??'';
 if(!last.trim()||context.kind!=='site'&&!ASKS_WHERE.test(last))return '';
 try{const bank=await studyCatalog().then(b=>b.questions).catch(()=>[]);
  // 追问（“还有吗”“第二个呢”）本身没有关键词，把上一句提问也带上一起搜。
  const prev=messages.filter(m=>m.role==='user').slice(-2,-1)[0]?.text??'';
  return searchForTutor(last,bank)||(prev?searchForTutor(prev+' '+last,bank):'')}catch{return ''}}

// 今天还能问几次。
export async function GET(req:Request){const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 if(!user.is_guest){
  const s=await getUserAiSettings(user.id);
  if(s.enabled&&s.hasKey){
   const rem=s.dailyLimit>0?Math.max(0,s.dailyLimit-s.usedToday):999;
   return Response.json({remaining:rem,limit:s.dailyLimit||999,custom:true,provider:s.provider,model:s.model});
  }
 }
 const limit=limitOf(user.is_guest);return Response.json({remaining:Math.max(0,limit-await used(user.id)),limit,custom:false})}

// 发一条消息给 AI 老师（动手练习、学习卡片答疑、题目提示、题目讲解、AI 客服演练）：扣一次额度后流式返回回复（NDJSON，见 TutorEvent）；失败时退回这次额度。
export async function POST(req:Request){try{assertSameOrigin(req);const user=await sessionUser(req.headers);if(!user)return fail('auth','请重新登录网站。',401);
 let body:unknown;try{body=JSON.parse(await req.text())}catch{return fail('invalid','请求内容无效。')}
 const input=parse(body);if(!input)return fail('invalid','请求内容无效，或者对话太长了，可以点“重新开始”。');

 const streamTutor=(remaining:number,onRefund:()=>Promise<unknown>,errMsg:(e:unknown)=>string,customCfg?:RuntimeAiConfig,site?:string)=>{
  const enc=new TextEncoder();
  let closed=false,wrote=false;
  const ctl=new AbortController();
  const abort=()=>{closed=true;ctl.abort()};
  req.signal?.addEventListener('abort',abort,{once:true});
  const out=new ReadableStream<Uint8Array>({
   async start(c){
    const send=(e:TutorEvent)=>{if(closed)return;try{c.enqueue(enc.encode(JSON.stringify(e)+'\n'))}catch{abort()}};
    send({t:'start'});
    try{
     const links=await findLinks(input.context,input.messages);
     const model=await tutorStream(input.context,input.messages,text=>{wrote=true;send({t:'delta',text})},()=>{wrote=false;send({t:'reset'})},customCfg,site,text=>{wrote=true;send({t:'think',text})},links,input.geminiProxy,m=>send({t:'model',model:m}),ctl.signal,input.thinkingLevel,!user.is_guest);
     send({t:'done',remaining,model});
    }catch(e){
     if(ctl.signal.aborted){if(!wrote)await onRefund().catch(()=>{})}
     else{await onRefund().catch(()=>{});send({t:'error',message:errMsg(e)})}
    }finally{
     req.signal?.removeEventListener('abort',abort);
     if(!closed)try{c.close()}catch{}
    }
   },
   cancel(){abort()},
  });
  return new Response(out,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store, no-transform','x-accel-buffering':'no'}});
 };

 // 学习者在对话框里明确选了站点模型时，不走专属 API，直接用站点模型（算站点每日次数）。
 const siteModel=input.model&&input.model!=='auto'&&input.model!=='custom'?input.model:undefined;
 if(user.is_guest&&siteModel&&TUTOR_MODELS.find(m=>m.id===siteModel)?.provider==='gemini'){
  return fail('auth','游客不支持调用 Gemini 模型，请登录后使用或切换 DeepSeek。',403);
 }
 // 已登录用户如果启用了自己的专属 API Key，则仅该用户本人可用，并执行用户自设的限额与场景限制（游客绝不允许使用自定义 Key）
 if(!user.is_guest&&!siteModel){
  const custom=await prepareCustomAi(user.id,'tutor');
  if(custom.mode==='blocked')return fail('quota',custom.message,429,{remaining:0});
  if(custom.mode==='custom'){
   return streamTutor(custom.remaining,()=>custom.refund(),e=>e instanceof VisionError?e.message:`专属 API（${custom.config.provider} / ${custom.config.model}）调用失败，请检查「AI 设置」中的 API Key 或模型名称是否正确（本次未计入调用次数）。`,custom.config);
  }
 }

 const db=studyDb(),day=dayNow(),limit=limitOf(user.is_guest);
 const row=await db.prepare('INSERT INTO ai_tutor_quota(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user.id,day,limit).first<{count:number}>();
 if(!row)return fail('quota',user.is_guest?`游客每天可以问 AI 老师 ${limit} 次，今天的次数已用完。登录后每天有 ${TUTOR_QUOTA.user} 次，还可绑定自己的专属 API。`:`今天的 ${limit} 次站点默认 AI 老师已用完，明天再来，或在「AI 设置」中配置你自己的 API Key。`,429,{remaining:0});
 const refund=()=>db.prepare('UPDATE ai_tutor_quota SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(user.id,day).run();
 return streamTutor(Math.max(0,limit-row.count),refund,e=>e instanceof VisionError?e.message+'（这次没有扣次数）':(e instanceof Error&&e.message.startsWith('gemini-rate-limit:'))?'站点 Gemini 限流已满（5 次/分钟 · 20 次/天），请稍后再试、切换 DeepSeek，或在「AI 设置」绑定自己的 API Key。（这次没有扣次数）':'AI 老师暂时连不上，这次没有扣次数，请稍后再试。',undefined,siteModel)}
 catch(e){if(e instanceof AuthError)return fail('auth',e.message,e.status);return fail('failed','AI 老师暂时不可用。',500)}}
