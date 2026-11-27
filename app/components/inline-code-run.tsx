'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Loader2,Sparkles,X} from 'lucide-react';
import {useI18n} from './i18n';
import {needsAiForInlineRun,openInPlayground,prepareForPlayground,type PlaygroundLang} from '@/lib/playground-bridge';
import {runPlaygroundCode,type PlaygroundRunResult} from '@/lib/playground-runner';
import {PLAYGROUND_COMPLETE_SYSTEM_PROMPT,buildPlaygroundCompleteUserPrompt,stripOuterFence} from '@/lib/ai-prompts';
import {streamDeepViaBridge} from '@/lib/local-bridge-client';
import {ensureAiConfigStatus,getCachedAiConfigStatus,getCachedCustomAiSpec} from '../ai/ai-settings';
import {resolveLiveAiSelection} from '../ai/thinking-pref';

export type InlineRunMeta={
 questionId?:string;
 title?:string;
 sourceLabel?:string;
 backHref?:string;
 expect?:string;
 newTab?:boolean;
};

export function useInlineCodeRun(lang:PlaygroundLang|null,code:string,meta?:InlineRunMeta){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [running,setRunning]=useState(false);
 const [completing,setCompleting]=useState(false);
 const [tempCode,setTempCode]=useState<string|null>(null);
 const [result,setResult]=useState<PlaygroundRunResult|null>(null);
 const [error,setError]=useState('');
 const abortRef=useRef<AbortController|null>(null);
 const prevKey=useRef(`${lang ?? ''}\u0000${code}`);

 useEffect(()=>{
  const k=`${lang ?? ''}\u0000${code}`;
  if(prevKey.current===k)return;
  prevKey.current=k;
  abortRef.current?.abort();
  abortRef.current=null;
  setRunning(false);
  setCompleting(false);
  setTempCode(null);
  setResult(null);
  setError('');
 },[lang,code]);

 useEffect(()=>()=>{abortRef.current?.abort()},[]);

 const stop=()=>{
  abortRef.current?.abort();
  abortRef.current=null;
  setRunning(false);
  setCompleting(false);
 };

 // 关闭运行窗口时同步清除 AI 补全的临时代码，恢复原来的不带 main 代码
 const clear=()=>{
  abortRef.current?.abort();
  abortRef.current=null;
  setRunning(false);
  setCompleting(false);
  setTempCode(null);
  setResult(null);
  setError('');
 };

 const requestAiComplete=async(src:string,errorText:string|undefined,ctl:AbortController):Promise<string|null>=>{
  if(!lang)return null;
  if(!getCachedAiConfigStatus())await ensureAiConfigStatus();
  if(ctl.signal.aborted)return null;
  const sel=resolveLiveAiSelection('tutor',getCachedCustomAiSpec(),Boolean(getCachedAiConfigStatus()?.isGuest));
  if(sel.useLocal){
   const out=await streamDeepViaBridge({
    cfg:sel.localCfg,
    system:PLAYGROUND_COMPLETE_SYSTEM_PROMPT,
    messages:[{role:'user',content:buildPlaygroundCompleteUserPrompt({lang,code:src,error:errorText,title:meta?.title,expect:meta?.expect,questionId:meta?.questionId})}],
    thinkingLevel:sel.thinkingLevel,
    signal:ctl.signal,
    onDelta:()=>{},
   });
   const cleaned=stripOuterFence(out.text);
   return cleaned.trim().length>=8?cleaned:null;
  }
  const r=await fetch('/api/playground/complete-main',{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({
    lang,
    code:src,
    error:errorText,
    title:meta?.title,
    expect:meta?.expect,
    questionId:meta?.questionId,
    model:sel.model,
    thinkingLevel:sel.thinkingLevel,
   }),
   signal:ctl.signal,
  });
  const d=await r.json().catch(()=>({})) as {ok?:boolean;code?:string;error?:string};
  if(!r.ok||!d.ok||!d.code)return null;
  return d.code;
 };

 const run=async()=>{
  if(!lang||!code.trim()||running||completing)return;
  abortRef.current?.abort();
  const ctl=new AbortController();
  abortRef.current=ctl;
  setResult(null);
  setError('');

  try{
   const prepared=prepareForPlayground(code,lang,{questionId:meta?.questionId});
   let execCode=tempCode??(prepared.code||code);

   // 代码片段不完整（缺少 main / 依赖包 / SQL 建表数据等）时，先由 AI 补全为可运行版本再执行
   if(!tempCode&&needsAiForInlineRun(lang,prepared.code||code,meta?.questionId)){
    setCompleting(true);
    try{
     const aiCode=await requestAiComplete(code,undefined,ctl);
     if(ctl.signal.aborted)return;
     if(aiCode){
      execCode=aiCode;
      setTempCode(aiCode);
     }
    }catch{
     if(ctl.signal.aborted)return;
    }finally{
     if(!ctl.signal.aborted)setCompleting(false);
    }
   }

   setRunning(true);
   const res=await runPlaygroundCode(lang,execCode,{signal:ctl.signal});
   if(ctl.signal.aborted)return;
   setResult(res);
  }catch(e){
   if(ctl.signal.aborted)return;
   setError(e instanceof Error?e.message:L('运行失败','Execution failed'));
  }finally{
   if(abortRef.current===ctl)abortRef.current=null;
   setCompleting(false);
   setRunning(false);
  }
 };

 const aiFix=async()=>{
  if(!lang||!code.trim()||running||completing)return;
  abortRef.current?.abort();
  const ctl=new AbortController();
  abortRef.current=ctl;
  const errText=[error,result?.compileErrors,result?.stderr].filter(Boolean).join('\n');
  setCompleting(true);
  setError('');
  try{
   const aiCode=await requestAiComplete(tempCode??code,errText||undefined,ctl);
   if(ctl.signal.aborted)return;
   if(!aiCode){
    setError(L('AI 补全暂不可用（请先登录或稍后重试）','AI completion unavailable'));
    setCompleting(false);
    return;
   }
   setTempCode(aiCode);
   setCompleting(false);
   setRunning(true);
   setResult(null);
   const res=await runPlaygroundCode(lang,aiCode,{signal:ctl.signal});
   if(ctl.signal.aborted)return;
   setResult(res);
  }catch(e){
   if(ctl.signal.aborted)return;
   setError(e instanceof Error?e.message:L('AI 修复失败','AI fix failed'));
  }finally{
   if(abortRef.current===ctl)abortRef.current=null;
   setCompleting(false);
   setRunning(false);
  }
 };

 const openPlayground=()=>{
  if(!lang||!code.trim())return;
  const src=tempCode??code;
  const prepared=tempCode?{code:tempCode,wrapped:false}:prepareForPlayground(src,lang,{questionId:meta?.questionId});
  openInPlayground({
   lang,
   code:prepared.code||src,
   wrapped:prepared.wrapped,
   needsAiWrap:tempCode?false:undefined,
   title:meta?.title||lang.toUpperCase(),
   sourceLabel:meta?.sourceLabel,
   backHref:meta?.backHref,
   expect:meta?.expect,
   autoRun:true,
  },{newTab:meta?.newTab??true});
 };

 const busy=running||completing;
 const displayCode=tempCode??code;
 return {running,completing,busy,tempCode,displayCode,result,error,run,aiFix,stop,clear,openPlayground};
}

export function InlineRunOutput({
 running,
 completing=false,
 result,
 error,
 onClear,
 onAiFix,
 onOpenPlayground,
}:{
 running:boolean;
 completing?:boolean;
 result:PlaygroundRunResult|null;
 error:string;
 onClear:()=>void;
 onAiFix?:()=>void;
 onOpenPlayground?:()=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const busy=running||completing;
 if(!busy&&!result&&!error)return null;
 const hasErr=Boolean(error||result?.compileErrors||result?.stderr||(result&&!result.ok));
 return (
  <div className="inline-run-out" aria-live="polite">
   <div className="inline-run-head">
    {completing?(
     <span className="inline-run-status"><Loader2 size={12} className="ai-spin"/>{L('AI 补全中…','AI completing…')}</span>
    ):running?(
     <span className="inline-run-status"><Loader2 size={12} className="ai-spin"/>{L('运行中…','Running…')}</span>
    ):error?(
     <span className="inline-run-status err">{L('失败','Failed')}</span>
    ):result?(
     <span className={'inline-run-status '+(result.ok?'ok':'err')}>
      {result.ok?`${L('成功','OK')} · ${result.durationMs}ms`:`${L('失败','Failed')} · ${result.durationMs}ms`}
     </span>
    ):null}
    <div className="inline-run-actions">
     {!busy&&hasErr&&onAiFix&&(
      <button type="button" className="inline-run-btn fix" onClick={onAiFix}>
       <Sparkles size={11}/><span>{L('AI 修复','AI Fix')}</span>
      </button>
     )}
     {onOpenPlayground&&!busy&&(
      <button type="button" className="inline-run-btn" onClick={onOpenPlayground}>
       <ArrowUpRight size={12}/><span>{L('操场','Playground')}</span>
      </button>
     )}
     {!busy&&(
      <button type="button" className="inline-run-btn" onClick={onClear} aria-label={L('关闭输出','Clear output')}>
       <X size={12}/>
      </button>
     )}
    </div>
   </div>
   {error&&<pre className="inline-run-err">{error}</pre>}
   {result?.compileErrors&&<pre className="inline-run-err">{result.compileErrors}</pre>}
   {result?.stdout&&<pre className="inline-run-pre">{result.stdout}</pre>}
   {result?.stderr&&<pre className="inline-run-err">{result.stderr}</pre>}
   {result&&!result.compileErrors&&!result.stdout&&!result.stderr&&(
    <div className="inline-run-empty">{L('（无输出）','(No output)')}</div>
   )}
  </div>
 );
}
