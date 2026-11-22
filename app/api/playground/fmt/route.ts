import {assertSameOrigin,AuthError,rateLimit,sessionUser} from '@/lib/site-auth';
import {formatCodeSimple} from '@/lib/code-format';
import type {PlaygroundLang} from '@/lib/playground-bridge';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

async function fmtGo(code:string):Promise<{code:string;error?:string}>{
 const ctl=new AbortController();
 const t=setTimeout(()=>ctl.abort(),10_000);
 try{
  const res=await fetch('https://go.dev/_/fmt',{
   method:'POST',
   signal:ctl.signal,
   headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8'},
   body:new URLSearchParams({body:code,imports:'true'}),
  });
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const d=await res.json() as {Body?:string;Error?:string};
  if(d.Error?.trim())return {code,error:d.Error.trim()};
  return {code:d.Body??code};
 }finally{
  clearTimeout(t);
 }
}

async function fmtRust(code:string):Promise<{code:string;error?:string}>{
 const ctl=new AbortController();
 const t=setTimeout(()=>ctl.abort(),10_000);
 try{
  const res=await fetch('https://play.rust-lang.org/format',{
   method:'POST',
   signal:ctl.signal,
   headers:{'content-type':'application/json'},
   body:JSON.stringify({code,edition:'2021'}),
  });
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const d=await res.json() as {success?:boolean;code?:string;stderr?:string};
  if(!d.success)return {code,error:(d.stderr??'rustfmt 格式化失败').trim()};
  return {code:d.code??code};
 }finally{
  clearTimeout(t);
 }
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>55_000)throw new AuthError('代码过长。',413);
  let body:{lang?:unknown;code?:unknown};
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}
  const lang=String(body?.lang??'') as PlaygroundLang;
  const code=typeof body?.code==='string'?body.code:'';
  if(!['go','python','java','ts','rust','sql'].includes(lang))throw new AuthError('不支持的语言。',400);
  if(code.length>50_000)throw new AuthError('代码过长。',400);

  const user=await sessionUser(req.headers).catch(()=>null);
  try{
   await rateLimit('pg-fmt:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),120);
  }catch(e){
   if(e instanceof AuthError)throw e;
  }

  if(lang==='go'){
   try{return Response.json(await fmtGo(code),{headers:noCache})}
   catch{return Response.json({code:formatCodeSimple('go',code)},{headers:noCache})}
  }
  if(lang==='rust'){
   try{return Response.json(await fmtRust(code),{headers:noCache})}
   catch{return Response.json({code:formatCodeSimple('rust',code)},{headers:noCache})}
  }
  return Response.json({code:formatCodeSimple(lang,code)},{headers:noCache});
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  return Response.json({error:e instanceof AuthError?e.message:'格式化失败。'},{status,headers:noCache});
 }
}
