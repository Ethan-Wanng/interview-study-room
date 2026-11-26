import {assertSameOrigin,AuthError,rateLimit,sessionUser} from '@/lib/site-auth';
import {consumeSiteAiQuota} from '@/lib/site-ai-quota';
import {prepareCustomAi} from '@/db/ai-config';
import {completePlaygroundCode} from '@/lib/gemini';
import type {RuntimeAiConfig} from '@/lib/ai-config';
import type {PlaygroundLang} from '@/lib/playground-bridge';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const VALID_LANGS=new Set<PlaygroundLang>(['go','python','java','ts','rust','sql']);
const fail=(error:string,status=400)=>Response.json({ok:false,error},{status,headers:noCache});

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const user=await sessionUser(req.headers);
  if(!user)return fail('请先登录后再使用 AI 自动补全。',401);
  if(user.is_guest)return fail('游客暂不支持代码操场 AI 自动补全，请登录正式账号后使用。',403);
  try{
   await rateLimit(`pg-ai-main:${user.id}`,30);
  }catch(e){
   if(e instanceof AuthError)return fail(e.message,e.status);
  }

  let body:unknown;
  try{body=JSON.parse(await req.text())}catch{return fail('请求参数无效。')}
  if(!body||typeof body!=='object')return fail('请求参数无效。');
  const b=body as Record<string,unknown>;
  const lang=typeof b.lang==='string'&&VALID_LANGS.has(b.lang as PlaygroundLang)?(b.lang as PlaygroundLang):null;
  const code=typeof b.code==='string'?b.code:'';
  if(!lang||!code.trim())return fail('请先输入需要补全的代码。');
  if(code.length>20_000)return fail('代码过长（最多支持 20000 字符）。');

  const errorText=typeof b.error==='string'?b.error.slice(0,4000):undefined;
  const title=typeof b.title==='string'?b.title.slice(0,200):undefined;
  const expect=typeof b.expect==='string'?b.expect.slice(0,2000):undefined;
  const questionId=typeof b.questionId==='string'?b.questionId.slice(0,80):undefined;

  let customCfg:RuntimeAiConfig|undefined;
  let refund:(()=>Promise<unknown>)|undefined;
  const custom=await prepareCustomAi(user.id,'tutor');
  if(custom.mode==='blocked')return fail(custom.message,429);
  if(custom.mode==='custom'){
   customCfg=custom.config;
   refund=()=>custom.refund();
  }else{
   const dsQ=await consumeSiteAiQuota(req,user,'deepseek');
   if(!dsQ.ok)return fail(dsQ.message,dsQ.status);
   refund=dsQ.refund;
  }

  try{
   const completed=await completePlaygroundCode({
    lang,
    code,
    error:errorText,
    title,
    expect,
    questionId,
    custom:customCfg,
   });
   return Response.json({ok:true,code:completed},{headers:noCache});
  }catch(e){
   await refund?.().catch(()=>{});
   return fail(e instanceof Error?e.message:'AI 补全暂不可用，请稍后重试。',502);
  }
 }catch(e){
  if(e instanceof AuthError)return fail(e.message,e.status);
  return fail('AI 补全服务暂时不可用。',500);
 }
}
