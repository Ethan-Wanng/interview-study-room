import {assertSameOrigin,AuthError,rateLimit,sessionUser} from '@/lib/site-auth';
import type {PlaygroundLang} from '@/lib/playground-bridge';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const MAX_CODE=50_000;
const RUN_TIMEOUT_MS=16_000;

type RunEvent={message:string;kind:'stdout'|'stderr';delayNs:number};
type RunResponse={
 ok:boolean;
 stdout:string;
 stderr:string;
 compileErrors:string;
 vetErrors?:string;
 events?:RunEvent[];
 exitCode:number|null;
 durationMs:number;
 runner:string;
};

async function fetchWithTimeout(url:string,init:RequestInit,ms=RUN_TIMEOUT_MS):Promise<Response>{
 const ctl=new AbortController();
 const timer=setTimeout(()=>ctl.abort(),ms);
 try{
  return await fetch(url,{...init,signal:ctl.signal});
 }finally{
  clearTimeout(timer);
 }
}

async function runGo(code:string,started:number):Promise<RunResponse>{
 const res=await fetchWithTimeout('https://go.dev/_/compile',{
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8'},
  body:new URLSearchParams({version:'2',body:code,withVet:'true'}),
 });
 if(!res.ok)throw new Error(`Go Playground 返回 HTTP ${res.status}`);
 const data=await res.json() as {
  Errors?:string;
  Events?:{Message?:string;Kind?:string;Delay?:number}[];
  VetErrors?:string;
 };
 const compileErrors=(data.Errors??'').trim();
 const vetErrors=(data.VetErrors??'').trim()||undefined;
 const events:RunEvent[]=(data.Events??[]).map(ev=>({
  message:String(ev.Message??''),
  kind:ev.Kind==='stderr'?'stderr':'stdout',
  delayNs:Number(ev.Delay??0)||0,
 }));
 const stdout=events.filter(e=>e.kind==='stdout').map(e=>e.message).join('');
 const stderr=events.filter(e=>e.kind==='stderr').map(e=>e.message).join('');
 const ok=!compileErrors;
 return {
  ok,
  stdout,
  stderr,
  compileErrors,
  vetErrors,
  events,
  exitCode:ok?0:1,
  durationMs:Math.round(performance.now()-started),
  runner:'Go Playground (go.dev)',
 };
}

function cleanRustProgress(raw:string):{warnings:string;runtimeStderr:string}{
 const lines=raw.replace(/\r\n?/g,'\n').split('\n');
 const runIdx=lines.findIndex(l=>/^\s*Running\s+`/.test(l));
 if(runIdx>=0){
  const before=lines.slice(0,runIdx)
   .filter(l=>!/^\s*(Compiling|Finished)\s+/.test(l))
   .join('\n').trim();
  const after=lines.slice(runIdx+1).join('\n');
  return {warnings:before,runtimeStderr:after};
 }
 const cleaned=lines.filter(l=>!/^\s*(Compiling|Finished|Running)\s+/.test(l)).join('\n');
 return {warnings:'',runtimeStderr:cleaned};
}

async function runRust(code:string,started:number):Promise<RunResponse>{
 const res=await fetchWithTimeout('https://play.rust-lang.org/execute',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
   channel:'stable',
   mode:'debug',
   edition:'2021',
   crateType:'bin',
   tests:false,
   code,
   backtrace:false,
  }),
 });
 if(!res.ok)throw new Error(`Rust Playground 返回 HTTP ${res.status}`);
 const data=await res.json() as {success?:boolean;exitDetail?:string;stdout?:string;stderr?:string};
 const success=Boolean(data.success);
 const stdout=data.stdout??'';
 const rawStderr=data.stderr??'';
 if(success){
  const {warnings,runtimeStderr}=cleanRustProgress(rawStderr);
  return {
   ok:true,
   stdout,
   stderr:runtimeStderr.trimEnd(),
   compileErrors:'',
   vetErrors:warnings||undefined,
   exitCode:0,
   durationMs:Math.round(performance.now()-started),
   runner:'Rust Playground (stable)',
  };
 }
 const cleanedErr=rawStderr
  .replace(/^\s*Compiling\s+playground[^\n]*\n?/m,'')
  .replace(/^\s*Finished\s+[^\n]*\n?/m,'')
  .replace(/^\s*Running\s+`[^`]+`\s*\n?/m,'')
  .trim();
 const hasRuntime=stdout.length>0||/Running\s+`/.test(rawStderr);
 return {
  ok:false,
  stdout,
  stderr:hasRuntime?cleanedErr:'',
  compileErrors:hasRuntime?'':cleanedErr,
  exitCode:1,
  durationMs:Math.round(performance.now()-started),
  runner:'Rust Playground (stable)',
 };
}

type GodboltLine={text?:string};
type GodboltResp={
 code?:number;
 stderr?:GodboltLine[];
 stdout?:GodboltLine[];
 timedOut?:boolean;
 execResult?:{
  code?:number;
  timedOut?:boolean;
  stdout?:GodboltLine[];
  stderr?:GodboltLine[];
 };
};

const joinGbLines=(lines?:GodboltLine[])=>(lines??[]).map(l=>l.text??'').join('\n');

async function runGodbolt(
 compilers:{id:string;label:string}[],
 lang:'python'|'java',
 source:string,
 started:number,
 cleanErr:(s:string)=>string,
):Promise<RunResponse>{
 let lastErr:Error|null=null;
 for(const comp of compilers){
  try{
   const res=await fetchWithTimeout(`https://godbolt.org/api/compiler/${comp.id}/compile`,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({
     source,
     lang,
     options:{userArguments:'',filters:{execute:true}},
    }),
   });
   if(!res.ok){
    lastErr=new Error(`${comp.label} 返回 HTTP ${res.status}`);
    continue;
   }
   const j=await res.json() as GodboltResp;
   const buildCode=j.code??0;
   const buildStderr=cleanErr(joinGbLines(j.stderr));
   if(buildCode!==0||!j.execResult){
    return {
     ok:false,
     stdout:'',
     stderr:'',
     compileErrors:buildStderr||`${comp.label} 编译失败`,
     exitCode:buildCode||1,
     durationMs:Math.round(performance.now()-started),
     runner:comp.label,
    };
   }
   const ex=j.execResult;
   const execCode=ex.code??0;
   const stdout=joinGbLines(ex.stdout);
   const stderr=cleanErr(joinGbLines(ex.stderr));
   const timedOut=Boolean(ex.timedOut||j.timedOut);
   return {
    ok:execCode===0&&!timedOut,
    stdout,
    stderr:timedOut?(stderr?stderr+'\n':'')+'程序运行超时。':stderr,
    compileErrors:'',
    vetErrors:buildStderr.trim()||undefined,
    exitCode:timedOut?124:execCode,
    durationMs:Math.round(performance.now()-started),
    runner:comp.label,
   };
  }catch(e){
   lastErr=e instanceof Error?e:new Error('运行服务请求失败');
  }
 }
 throw lastErr??new Error('代码运行服务暂时不可用，请稍后重试。');
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>MAX_CODE+2000)throw new AuthError('代码内容过长，请精简后再运行。',413);
  let body:{lang?:unknown;code?:unknown};
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}
  const lang=String(body?.lang??'') as PlaygroundLang;
  const code=typeof body?.code==='string'?body.code:'';
  if(!['go','python','java','rust','ts','sql'].includes(lang))throw new AuthError('不支持的语言类型。',400);
  if(!code.trim())throw new AuthError('请先输入要运行的代码。',400);
  if(code.length>MAX_CODE)throw new AuthError(`代码不能超过 ${MAX_CODE} 个字符。`,400);

  const user=await sessionUser(req.headers).catch(()=>null);
  try{
   await rateLimit('pg-run:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),120);
  }catch(e){
   if(e instanceof AuthError)throw e;
  }

  const started=performance.now();
  if(lang==='go'){
   return Response.json(await runGo(code,started),{headers:noCache});
  }
  if(lang==='rust'){
   return Response.json(await runRust(code,started),{headers:noCache});
  }
  if(lang==='python'){
   const res=await runGodbolt(
    [{id:'python314',label:'Python 3.14'},{id:'python312',label:'Python 3.12'}],
    'python',
    code,
    started,
    s=>s.replace(/\/app\/output\.s|example\.py/g,'main.py'),
   );
   return Response.json(res,{headers:noCache});
  }
  if(lang==='java'){
   // Godbolt 将源码保存为 example.java 且默认 stdout 编码为 US-ASCII：
   // 1. 剥离顶层 public 修饰符（保留等宽空格以维持行号列号），支持直接写 public class Main；
   // 2. 在入口类花括号后同排注入 UTF-8 PrintStream，确保中文输出正常而不改变任何行号。
   const noPublic=code.replace(/^(\s*)public(\s+(?:final\s+|abstract\s+)?class\b)/gm,'$1      $2');
   const utf8Block=' static{System.setOut(new java.io.PrintStream(System.out,true,java.nio.charset.StandardCharsets.UTF_8));System.setErr(new java.io.PrintStream(System.err,true,java.nio.charset.StandardCharsets.UTF_8));}';
   const normalized=noPublic.replace(/((?:^|\n)[ \t]*(?:final\s+|abstract\s+)?class\s+\w+[^{]*\{)/,`$1${utf8Block}`);
   const res=await runGodbolt(
    [{id:'java2102',label:'OpenJDK 21'},{id:'java2502',label:'OpenJDK 25'}],
    'java',
    normalized,
    started,
    s=>s.replace(/<source>:|example\.java:/g,'Main.java:'),
   );
   return Response.json(res,{headers:noCache});
  }

  return Response.json({
   ok:false,
   stdout:'',
   stderr:'',
   compileErrors:'JS/TS 请在浏览器隔离沙盒中运行。',
   exitCode:1,
   durationMs:0,
   runner:'Browser JS/TS Sandbox',
  },{status:400,headers:noCache});
 }catch(e){
  if(e instanceof AuthError){
   return Response.json({error:e.message},{status:e.status,headers:noCache});
  }
  const msg=e instanceof Error&&e.name==='AbortError'
   ?'沙盒执行请求超时，请检查代码是否存在耗时过长的操作后重试。'
   :(e instanceof Error?e.message:'沙盒服务暂时不可用，请稍后重试。');
  return Response.json({error:msg},{status:502,headers:noCache});
 }
}
