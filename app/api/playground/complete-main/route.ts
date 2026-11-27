import {assertSameOrigin,AuthError,rateLimit,sessionUser} from '@/lib/site-auth';
import {prepareDeepModelExecution} from '@/lib/deep-model-route';
import {completePlaygroundCode} from '@/lib/gemini';
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

  const exec=await prepareDeepModelExecution(req,user,b.model,b.thinkingLevel);

  try{
   const completed=await completePlaygroundCode({
    lang,
    code,
    error:errorText,
    title,
    expect,
    questionId,
    model:exec.model==='auto'||b.model==='auto'?'deepseek-flash':exec.model,
    thinkingLevel:b.model==='auto'||b.model===undefined?'off':exec.thinkingLevel,
    custom:exec.custom,
   });
   return Response.json({ok:true,code:completed},{headers:noCache});
  }catch(e){
   await exec.refund().catch(()=>{});
   return fail(e instanceof Error?e.message:'AI 补全暂不可用，请稍后重试。',502);
  }
 }catch(e){
  if(e instanceof AuthError)return fail(e.message,e.status);
  return fail('AI 补全服务暂时不可用。',500);
 }
}
