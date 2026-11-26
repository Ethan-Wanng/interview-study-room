'use client';
import '../ai/ai.css';
import './playground.css';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Bot,Check,CheckCircle2,ChevronDown,ChevronUp,Code2,Columns2,Copy,Download,FastForward,Loader2,Play,RotateCcw,Rows2,Send,Share2,Sparkles,Square,Terminal,Trash2,Wand2,WrapText,X} from 'lucide-react';
import SiteHeader from '../components/site-header';
import AddToNoteButton from '../components/add-to-note';
import {useI18n} from '../components/i18n';
import {codeEditing} from '../ai/code-input';
import AiDock,{type DockRequest} from '../ai/ai-dock';
import {PLAYGROUND_EXAMPLES,PLAYGROUND_LANGS} from '@/content/playground-examples';
import {runPlaygroundCode,type PlaygroundRunResult} from '@/lib/playground-runner';
import {
 outputsMatchExpected,
 PG_LAST_LANG_KEY,
 playgroundLearnLinkFor,
 readPlaygroundLaunch,
 stripPlaygroundHarness,
 syncCodeBackToQuiz,
 type PlaygroundLang,
 type PlaygroundLaunch,
} from '@/lib/playground-bridge';

const DRAFT_KEY='playground-drafts-v1';
const emptySub=()=>()=>{};
const useOrigin=()=>useSyncExternalStore(emptySub,()=>window.location.origin,()=>'');

type DraftMap=Partial<Record<PlaygroundLang,{exId:string;code:string}>>;

function readDrafts():DraftMap{
 try{
  const raw=localStorage.getItem(DRAFT_KEY);
  return raw?(JSON.parse(raw) as DraftMap):{};
 }catch{
  return {};
 }
}

function saveDraft(lang:PlaygroundLang,exId:string,code:string){
 try{
  const cur=readDrafts();
  cur[lang]={exId,code};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(cur));
 }catch{}
}

async function copyClipboard(text:string):Promise<boolean>{
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}}catch{}
 try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');document.body.removeChild(ta);return ok}catch{return false}
}

export default function PlaygroundClient({
 username,
 initialShared,
 initialLang,
 initialExample,
 initialLaunchId,
 initialError,
}:{
 username:string;
 initialShared:{id:string;lang:PlaygroundLang;code:string;title:string}|null;
 initialLang?:PlaygroundLang;
 initialExample?:string;
 initialLaunchId?:string;
 initialError?:string;
}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const origin=useOrigin();

 const startLang=initialShared?.lang??initialLang??'go';
 const matchedEx=initialExample
  ?PLAYGROUND_EXAMPLES[startLang].find(e=>e.id===initialExample)
  :undefined;
 const [lang,setLang]=useState<PlaygroundLang>(startLang);
 const [exByLang,setExByLang]=useState<Record<PlaygroundLang,string>>({
  go:startLang==='go'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.go[0].id,
  python:startLang==='python'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.python[0].id,
  java:startLang==='java'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.java[0].id,
  ts:startLang==='ts'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.ts[0].id,
  rust:startLang==='rust'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.rust[0].id,
  sql:startLang==='sql'&&matchedEx?matchedEx.id:PLAYGROUND_EXAMPLES.sql[0].id,
 });
 const [codes,setCodes]=useState<Record<PlaygroundLang,string>>(()=>({
  go:initialShared?.lang==='go'?initialShared.code:(startLang==='go'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.go[0].code),
  python:initialShared?.lang==='python'?initialShared.code:(startLang==='python'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.python[0].code),
  java:initialShared?.lang==='java'?initialShared.code:(startLang==='java'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.java[0].code),
  ts:initialShared?.lang==='ts'?initialShared.code:(startLang==='ts'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.ts[0].code),
  rust:initialShared?.lang==='rust'?initialShared.code:(startLang==='rust'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.rust[0].code),
  sql:initialShared?.lang==='sql'?initialShared.code:(startLang==='sql'&&matchedEx?matchedEx.code:PLAYGROUND_EXAMPLES.sql[0].code),
 }));

 const [activeLaunch,setActiveLaunch]=useState<PlaygroundLaunch|null>(null);
 const [syncedQuiz,setSyncedQuiz]=useState(false);

 const examples=PLAYGROUND_EXAMPLES[lang];
 const curExId=exByLang[lang];
 const curEx=useMemo(()=>examples.find(e=>e.id===curExId)??examples[0],[examples,curExId]);
 const langMeta=useMemo(()=>PLAYGROUND_LANGS.find(l=>l.id===lang)??PLAYGROUND_LANGS[0],[lang]);
 const learnLink=useMemo(()=>playgroundLearnLinkFor(curEx.id,lang),[curEx.id,lang]);
 const code=codes[lang];
 const baselineCode=activeLaunch&&activeLaunch.lang===lang?activeLaunch.code:curEx.code;
 const isDirty=code.trimEnd()!==baselineCode.trimEnd();

 const [langOpen,setLangOpen]=useState(false);
 const [exOpen,setExOpen]=useState(false);
 const [toolsOpen,setToolsOpen]=useState(false);
 const [aiFixing,setAiFixing]=useState(false);
 const [running,setRunning]=useState(false);
 const [replaying,setReplaying]=useState(false);
 const [fmtBusy,setFmtBusy]=useState(false);
 const [shareBusy,setShareBusy]=useState(false);
 const [shareUrl,setShareUrl]=useState(initialShared?`/playground?s=${initialShared.id}`:'');
 const [copiedCode,setCopiedCode]=useState(false);
 const [copiedShare,setCopiedShare]=useState(false);
 const [statusMsg,setStatusMsg]=useState(initialError??'');
 const [stacked,setStacked]=useState(false);
 const [wrapLines,setWrapLines]=useState(false);
 const [cursor,setCursor]=useState({ln:1,col:1});
 const [result,setResult]=useState<PlaygroundRunResult|null>(null);
 const [liveStdout,setLiveStdout]=useState('');
 const [liveStderr,setLiveStderr]=useState('');
 const [tutorReq,setTutorReq]=useState<DockRequest|undefined>(undefined);

 const taRef=useRef<HTMLTextAreaElement|null>(null);
 const gutterRef=useRef<HTMLPreElement|null>(null);
 const runAbortRef=useRef<AbortController|null>(null);
 const replayTimersRef=useRef<ReturnType<typeof setTimeout>[]>([]);

 const clearReplayTimers=()=>{
  for(const t of replayTimersRef.current)clearTimeout(t);
  replayTimersRef.current=[];
  setReplaying(false);
 };

 useEffect(()=>()=>clearReplayTimers(),[]);

 const lineCount=useMemo(()=>Math.max(1,code.split('\n').length),[code]);
 const lineNumbers=useMemo(()=>{
  const arr:string[]=[];
  for(let i=1;i<=lineCount;i++)arr.push(String(i));
  return arr.join('\n');
 },[lineCount]);

 const updateCursor=()=>{
  const el=taRef.current;if(!el)return;
  const pos=el.selectionStart??0;
  const before=el.value.slice(0,pos);
  const lines=before.split('\n');
  setCursor({ln:lines.length,col:(lines[lines.length-1]?.length??0)+1});
 };

 const syncScroll=()=>{
  if(taRef.current&&gutterRef.current){
   gutterRef.current.scrollTop=taRef.current.scrollTop;
  }
 };

 const setCurCode=(next:string)=>{
  setCodes(p=>({...p,[lang]:next}));
  if(!activeLaunch||activeLaunch.lang!==lang)saveDraft(lang,curExId,next);
  setShareUrl('');
 };

 const pickExample=(id:string)=>{
  const found=examples.find(e=>e.id===id);
  if(!found)return;
  clearReplayTimers();
  setActiveLaunch(null);
  setExByLang(p=>({...p,[lang]:found.id}));
  setCodes(p=>({...p,[lang]:found.code}));
  saveDraft(lang,found.id,found.code);
  setResult(null);
  setLiveStdout('');
  setLiveStderr('');
  setShareUrl('');
  setStatusMsg('');
 };

 const resetCurrent=()=>{
  if(activeLaunch&&activeLaunch.lang===lang){
   clearReplayTimers();
   setCodes(p=>({...p,[lang]:activeLaunch.code}));
   setResult(null);
   setLiveStdout('');
   setLiveStderr('');
   setShareUrl('');
   setStatusMsg('');
   return;
  }
  pickExample(curEx.id);
 };

 const switchLang=(next:PlaygroundLang)=>{
  if(next===lang)return;
  runAbortRef.current?.abort();
  clearReplayTimers();
  setLang(next);
  try{localStorage.setItem(PG_LAST_LANG_KEY,next)}catch{}
  if(activeLaunch&&!activeLaunch.questionId)setActiveLaunch(null);
  setResult(null);
  setLiveStdout('');
  setLiveStderr('');
  setStatusMsg('');
 };

 const skipReplay=()=>{
  if(!result)return;
  clearReplayTimers();
  setLiveStdout(result.stdout);
  setLiveStderr(result.stderr);
 };

 const stopRun=()=>{
  runAbortRef.current?.abort();
  clearReplayTimers();
  setRunning(false);
 };

 const runCode=async(overrideLang?:PlaygroundLang,overrideCode?:string)=>{
  const targetLang=overrideLang??lang;
  const targetCode=overrideCode??code;
  if(running&&!overrideCode)return;
  runAbortRef.current?.abort();
  clearReplayTimers();
  setRunning(true);
  setStatusMsg('');
  setResult(null);
  setLiveStdout('');
  setLiveStderr('');

  const ctl=new AbortController();
  runAbortRef.current=ctl;

  try{
   const res=await runPlaygroundCode(targetLang,targetCode,{signal:ctl.signal});
   if(ctl.signal.aborted)return;
   setResult(res);

   // Go Playground 等带延时事件支持渐进回放（超过 1.8 秒的延时做温和缩放以免等待太久）
   const hasDelayed=Boolean(res.events?.some(ev=>ev.delayNs>0));
   if(hasDelayed&&res.events&&res.events.length>1){
    setReplaying(true);
    let accMs=0;
    const totalRawMs=res.events.reduce((s,ev)=>s+ev.delayNs/1e6,0);
    const scale=totalRawMs>2200?2200/totalRawMs:1;
    let outAcc='',errAcc='';
    res.events.forEach((ev,idx)=>{
     accMs+=Math.max(0,(ev.delayNs/1e6)*scale);
     const snapOut=(outAcc+=ev.kind==='stdout'?ev.message:'');
     const snapErr=(errAcc+=ev.kind==='stderr'?ev.message:'');
     const isLast=idx===res.events!.length-1;
     const t=setTimeout(()=>{
      setLiveStdout(snapOut);
      setLiveStderr(snapErr);
      if(isLast)setReplaying(false);
     },Math.round(accMs));
     replayTimersRef.current.push(t);
    });
   }else{
    setLiveStdout(res.stdout);
    setLiveStderr(res.stderr);
   }
  }catch(e){
   if(ctl.signal.aborted)return;
   setStatusMsg(e instanceof Error?e.message:L('运行失败，请稍后重试。','Execution failed.'));
  }finally{
   if(runAbortRef.current===ctl)runAbortRef.current=null;
   setRunning(false);
  }
 };

 const runCodeRef=useRef(runCode);
 useEffect(()=>{runCodeRef.current=runCode});

 const completeWithAi=async(
  overrideCode?:string,
  errorText?:string,
  autoRunAfter=false,
  overrideLang?:PlaygroundLang,
  launchCtx?:PlaygroundLaunch|null,
  silent=false,
 ):Promise<string|null>=>{
  const targetLang=overrideLang??lang;
  const targetCode=overrideCode??code;
  const ctx=launchCtx!==undefined?launchCtx:activeLaunch;
  if(!targetCode.trim())return null;
  setAiFixing(true);
  if(!silent)setStatusMsg('');
  try{
   const r=await fetch('/api/playground/complete-main',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     lang:targetLang,
     code:targetCode,
     error:errorText,
     title:ctx?.title||L(curEx.title[0],curEx.title[1]),
     expect:ctx?.expect,
     questionId:ctx?.questionId,
    }),
   });
   const d=await r.json() as {ok?:boolean;code?:string;error?:string};
   if(!r.ok||!d.ok||!d.code){
    throw new Error(d.error||L('AI 补全暂不可用，请稍后重试。','AI completion unavailable.'));
   }
   setCodes(prev=>({...prev,[targetLang]:d.code!}));
   if(ctx&&ctx.lang===targetLang){
    setActiveLaunch(prev=>prev&&prev.id===ctx.id?{...prev,code:d.code!}:prev);
   }else if(!ctx){
    saveDraft(targetLang,exByLang[targetLang],d.code!);
   }
   if(autoRunAfter){
    void runCodeRef.current(targetLang,d.code!);
   }
   return d.code;
  }catch(e){
   if(!silent)setStatusMsg(e instanceof Error?e.message:L('AI 补全失败，请稍后重试。','AI completion failed.'));
   return null;
  }finally{
   setAiFixing(false);
  }
 };

 const completeWithAiRef=useRef(completeWithAi);
 useEffect(()=>{completeWithAiRef.current=completeWithAi});

 const applyAiPlaygroundCode=(nextCode:string,runAfter=false)=>{
  const clean=nextCode.replace(/\r\n/g,'\n').trim();
  if(!clean)return;
  const formatted=clean+'\n';
  runAbortRef.current?.abort();
  clearReplayTimers();
  setStatusMsg('');
  setCurCode(formatted);
  if(runAfter){
   void runCodeRef.current(lang,formatted);
  }
 };

 const handleCurtainPointerDown=(e:React.PointerEvent<HTMLButtonElement>)=>{
  if(e.button!==0)return;
  const startY=e.clientY;
  let dragging=false;
  const onMove=(ev:PointerEvent)=>{
   const dy=ev.clientY-startY;
   if(Math.abs(dy)<14)return;
   dragging=true;
   setToolsOpen(dy>0);
  };
  const onUp=()=>{
   window.removeEventListener('pointermove',onMove);
   window.removeEventListener('pointerup',onUp);
   window.removeEventListener('pointercancel',onUp);
   if(!dragging)setToolsOpen(v=>!v);
  };
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  window.addEventListener('pointercancel',onUp);
 };

 useEffect(()=>{
  if(initialLaunchId){
   const timer=setTimeout(()=>{
    const launched=readPlaygroundLaunch(initialLaunchId);
    if(!launched)return;
    setActiveLaunch(launched);
    setLang(launched.lang);
    setCodes(prev=>({...prev,[launched.lang]:launched.code}));
    if(launched.needsAiWrap){
     void (async()=>{
      const completed=await completeWithAiRef.current(launched.code,undefined,false,launched.lang,launched,true);
      if(launched.autoRun){
       void runCodeRef.current(launched.lang,completed||launched.code);
      }
     })();
    }else if(launched.autoRun){
     void runCodeRef.current(launched.lang,launched.code);
    }
   },0);
   return()=>clearTimeout(timer);
  }
  if(initialShared||initialLang||initialExample)return;
  const timer=setTimeout(()=>{
   const d=readDrafts();
   setExByLang(prev=>{
    const next={...prev};
    for(const l of PLAYGROUND_LANGS){
     const hit=d[l.id];
     if(hit?.exId&&PLAYGROUND_EXAMPLES[l.id].some(x=>x.id===hit.exId))next[l.id]=hit.exId;
    }
    return next;
   });
   setCodes(prev=>{
    const next={...prev};
    for(const l of PLAYGROUND_LANGS){
     const hit=d[l.id];
     if(hit?.code)next[l.id]=hit.code;
    }
    return next;
   });
   try{
    const pref=(localStorage.getItem(PG_LAST_LANG_KEY)||localStorage.getItem('code-ref-lang')) as PlaygroundLang|null;
    if(pref&&PLAYGROUND_LANGS.some(l=>l.id===pref))setLang(pref);
   }catch{}
  },0);
  return()=>clearTimeout(timer);
 },[initialLaunchId,initialShared,initialLang,initialExample]);

 const sendBackToQuiz=()=>{
  if(!activeLaunch?.questionId)return;
  const cleanCode=stripPlaygroundHarness(code,lang);
  syncCodeBackToQuiz({questionId:activeLaunch.questionId,lang,code:cleanCode||code});
  if(activeLaunch.backHref){
   window.location.assign(activeLaunch.backHref);
   return;
  }
  setSyncedQuiz(true);
  setTimeout(()=>setSyncedQuiz(false),2400);
 };

 const formatCode=async()=>{
  if(fmtBusy||!code.trim())return;
  setFmtBusy(true);
  setStatusMsg('');
  try{
   const r=await fetch('/api/playground/fmt',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({lang,code}),
   });
   const d=await r.json() as {code?:string;error?:string};
   if(!r.ok)throw new Error(d.error||L('格式化失败。','Format failed.'));
   if(d.error)setStatusMsg(d.error);
   if(typeof d.code==='string'&&d.code!==code)setCurCode(d.code);
  }catch(e){
   setStatusMsg(e instanceof Error?e.message:L('格式化失败。','Format failed.'));
  }finally{
   setFmtBusy(false);
  }
 };

 const shareCode=async()=>{
  if(shareBusy||!code.trim())return;
  setShareBusy(true);
  setStatusMsg('');
  try{
   const r=await fetch('/api/playground/share',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({lang,code,title:activeLaunch?.title||L(curEx.title[0],curEx.title[1])}),
   });
   const d=await r.json() as {id?:string;url?:string;error?:string};
   if(!r.ok||!d.url)throw new Error(d.error||L('分享失败，请重试。','Failed to share snippet.'));
   setShareUrl(d.url);
   const full=window.location.origin+d.url;
   window.history.replaceState(null,'',d.url);
   const ok=await copyClipboard(full);
   if(ok){
    setCopiedShare(true);
    setTimeout(()=>setCopiedShare(false),2200);
   }
  }catch(e){
   setStatusMsg(e instanceof Error?e.message:L('分享失败，请重试。','Failed to share snippet.'));
  }finally{
   setShareBusy(false);
  }
 };

 const copyCurrentCode=async()=>{
  const ok=await copyClipboard(code);
  if(!ok)return;
  setCopiedCode(true);
  setTimeout(()=>setCopiedCode(false),1800);
 };

 const downloadFile=()=>{
  const blob=new Blob([code],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=langMeta.file;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
 };

 const askAi=()=>{
  const hasErr=Boolean(result?.compileErrors||liveStderr||(result&&!result.ok));
  const text=hasErr
   ?L('请结合当前报错排查原来的代码：指出哪一行错了、原因是什么；在完整可运行代码里把错误行注释保留并注明原错因与新代码为什么可以，方便我一键替换到操场。','Please diagnose the error against the original code: point out what failed and why, then give a full runnable replacement keeping the buggy lines commented and explained so I can apply it directly.')
   :L('请帮我讲解一下这段代码的核心思路和关键语法点。','Please explain the core logic and key syntax in this code.');
  setTutorReq(prev=>({n:(prev?.n??0)+1,text}));
 };

 const runErrorText=[result?.compileErrors,liveStderr].filter(Boolean).join('\n');

 return (
  <div className="pg-shell">
   <SiteHeader active="playground" username={username}/>
   <main className="pg-main">
    <div className="ai-card pg-top-card">
     <div className="pg-top-row">
      <div className="pg-top-pickers">
       <button
        type="button"
        className={'pg-pick-trigger'+(langOpen?' open':'')}
        aria-expanded={langOpen}
        onClick={()=>setLangOpen(v=>!v)}
       >
        <Code2 size={14}/>
        <b>{langMeta.label}</b>
        <small>{langMeta.file}</small>
        {langOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
       </button>

       <button
        type="button"
        className={'pg-pick-trigger pg-ex-trigger'+(exOpen?' open':'')}
        aria-expanded={exOpen}
        onClick={()=>setExOpen(v=>!v)}
       >
        <BookOpen size={14}/>
        <span className="pg-pick-k">{L('示例','Ex')}</span>
        <b>{activeLaunch?activeLaunch.title:L(curEx.title[0],curEx.title[1])}</b>
        {exOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
       </button>

       {running?(
        <button type="button" className="pg-btn stop" onClick={stopRun}>
         <Square size={14}/>{L('停止','Stop')}
        </button>
       ):(
        <button type="button" className="pg-btn run" disabled={aiFixing} onClick={()=>void runCode()} title="Ctrl / ⌘ + Enter">
         <Play size={14}/>{L('运行','Run')}
        </button>
       )}

       <button
        type="button"
        className="pg-btn ai"
        disabled={aiFixing||running||!code.trim()}
        onClick={()=>void completeWithAi(undefined,runErrorText||undefined,false)}
        title={lang==='sql'?L('用 AI 补全建表与测试数据','Generate sample tables & data with AI'):L('用 AI 补全缺失包与可运行 main 入口','Complete imports & runnable main with AI')}
       >
        {aiFixing?<Loader2 size={14} className="ai-spin"/>:<Sparkles size={14}/>}
        <span>{aiFixing?L('AI 补全中…','Completing…'):lang==='sql'?L('AI 补全建表','AI Schema'):L('AI 补全 main','AI Complete')}</span>
       </button>
      </div>

      <div className="pg-top-links">
       {activeLaunch?(
        <>
         {activeLaunch.questionId&&(
          <button type="button" className="pg-btn run" onClick={sendBackToQuiz}>
           {syncedQuiz?<Check size={14}/>:<Send size={14}/>}
           {syncedQuiz?L('已同步','Synced'):activeLaunch.backHref?L('同步并返回','Sync & Back'):L('同步回答题','Sync Quiz')}
          </button>
         )}
         {activeLaunch.backHref&&(
          <a className="pg-btn" href={activeLaunch.backHref}>
           <ArrowLeft size={14}/>{L('返回学习','Back')}
          </a>
         )}
         <button type="button" className="pg-btn pg-icon-btn" onClick={()=>setActiveLaunch(null)} aria-label={L('关闭来源','Dismiss source')}>
          <X size={14}/>
         </button>
        </>
       ):(
        <a className="pg-learn-link" href={learnLink.href}>
         <BookOpen size={13}/>
         <span>{L(learnLink.label[0],learnLink.label[1])}</span>
         <ArrowUpRight size={13}/>
        </a>
       )}
      </div>
     </div>

     <div className={'pg-drawer'+(langOpen?' open':'')}>
      <div className="pg-drawer-inner">
       <div className="pg-langs" role="tablist" aria-label={L('选择编程语言','Select programming language')}>
        {PLAYGROUND_LANGS.map(l=>(
         <button
          key={l.id}
          type="button"
          role="tab"
          aria-selected={lang===l.id}
          className={'pg-lang-btn'+(lang===l.id?' on':'')}
          onClick={()=>{switchLang(l.id);setLangOpen(false)}}
         >
          <span>{l.label}</span>
          <small>{l.file}</small>
         </button>
        ))}
       </div>
      </div>
     </div>

     <div className={'pg-drawer'+(exOpen?' open':'')}>
      <div className="pg-drawer-inner">
       <div className="pg-ex-grid" role="listbox" aria-label={L('选择代码示例','Select example')}>
        {examples.map(ex=>(
         <button
          key={ex.id}
          type="button"
          role="option"
          aria-selected={curEx.id===ex.id&&!activeLaunch}
          className={'pg-ex-pill'+(curEx.id===ex.id&&!activeLaunch?' on':'')}
          onClick={()=>{pickExample(ex.id);setExOpen(false)}}
         >
          {L(ex.title[0],ex.title[1])}
         </button>
        ))}
       </div>
      </div>
     </div>
    </div>

    <div className={'pg-curtain-shell'+(toolsOpen?' open':' closed')}>
     <div className="pg-curtain-clip">
      <div className="pg-curtain-inner">
       <div className="ai-card pg-toolbar">
        <div className="pg-actions">
         <button type="button" className="pg-btn" onClick={()=>void formatCode()} disabled={fmtBusy} title={L('按语言规范整理代码缩进','Format code')}>
          {fmtBusy?<Loader2 size={14} className="ai-spin"/>:<Wand2 size={14}/>}{L('格式化','Format')}
         </button>
         <button type="button" className="pg-btn" onClick={()=>void shareCode()} disabled={shareBusy} title={L('生成可分享的代码链接','Create shareable URL')}>
          {shareBusy?<Loader2 size={14} className="ai-spin"/>:<Share2 size={14}/>}{L('分享','Share')}
         </button>
         <button type="button" className="pg-btn" onClick={resetCurrent} title={L('还原初始代码','Reset')}>
          <RotateCcw size={14}/>{L('重置','Reset')}
         </button>
         <button type="button" className="pg-btn" onClick={()=>void copyCurrentCode()}>
          {copiedCode?<Check size={14}/>:<Copy size={14}/>}{copiedCode?L('已复制','Copied'):L('复制','Copy')}
         </button>
         <button type="button" className="pg-btn pg-icon-btn" onClick={downloadFile} title={L(`下载 ${langMeta.file}`,`Download ${langMeta.file}`)} aria-label={L('下载','Download')}>
          <Download size={14}/>
         </button>
         <button type="button" className={'pg-btn pg-icon-btn'+(wrapLines?' active':'')} onClick={()=>setWrapLines(w=>!w)} title={L('切换自动换行','Toggle line wrap')} aria-label={L('自动换行','Line wrap')}>
          <WrapText size={14}/>
         </button>
         <button type="button" className="pg-btn pg-icon-btn" onClick={()=>setStacked(s=>!s)} title={L('切换左右 / 上下分栏','Toggle split layout')} aria-label={L('切换分栏','Split layout')}>
          {stacked?<Columns2 size={14}/>:<Rows2 size={14}/>}
         </button>
         <AddToNoteButton
          title={activeLaunch?.title||L(curEx.title[0],curEx.title[1])}
          questionOnly={`### ${activeLaunch?.title||L(curEx.title[0],curEx.title[1])}\n\n\`\`\`${lang}\n${code}\n\`\`\``}
          questionAndAnswer={[
           `### ${activeLaunch?.title||L(curEx.title[0],curEx.title[1])}`,
           `\`\`\`${lang}\n${code}\n\`\`\``,
           (liveStdout||result?.stdout)?`**${L('运行输出','Output')}**：\n\`\`\`\n${(liveStdout||result?.stdout||'').trim()}\n\`\`\``:'',
           (liveStderr||result?.stderr)?`**${L('报错 / 标准错误','Stderr')}**：\n\`\`\`\n${(liveStderr||result?.stderr||'').trim()}\n\`\`\``:'',
          ].filter(Boolean).join('\n\n')}
          modeLabels={[
           [L('仅记代码','Code only'),L('只保存代码','Save code only')],
           [L('代码 + 输出','Code + Output'),L('保存代码与输出','Save code & output')],
          ]}
          source={{
           kind:'playground',
           label:`${L('代码操场','Code Playground')} · ${lang.toUpperCase()} · ${activeLaunch?.title||L(curEx.title[0],curEx.title[1])}`,
           href:`/playground?lang=${encodeURIComponent(lang)}&ex=${encodeURIComponent(curEx.id)}`,
          }}
          className="pg-btn"
         />
         <button type="button" className="pg-btn ai" onClick={askAi}>
          <Bot size={14}/>{L('问 AI','Ask AI')}
         </button>
        </div>
       </div>
      </div>
     </div>
     <div className="pg-curtain-pull-row">
      <button
       type="button"
       className="pg-curtain-handle"
       onPointerDown={handleCurtainPointerDown}
       aria-expanded={toolsOpen}
       aria-label={toolsOpen?L('收起工具栏','Collapse toolbar'):L('展开工具栏','Expand toolbar')}
      >
       <span className="pg-curtain-grip" aria-hidden="true"/>
       {toolsOpen?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
      </button>
     </div>
    </div>

    {shareUrl&&(
     <div className="pg-share-banner" role="status">
      <span>{L('分享链接已生成（任何人打开都能查看和运行这段代码）：','Share link ready:')} <code>{origin+shareUrl}</code></span>
      <div className="pg-share-actions">
       <button
        type="button"
        className="pg-btn"
        onClick={async()=>{
         const ok=await copyClipboard(window.location.origin+shareUrl);
         if(ok){setCopiedShare(true);setTimeout(()=>setCopiedShare(false),1800)}
        }}
       >
        {copiedShare?<Check size={14}/>:<Copy size={14}/>}{copiedShare?L('已复制链接','Copied'):L('复制链接','Copy URL')}
       </button>
      </div>
     </div>
    )}

    {statusMsg&&(
     <div className="fb-alert err" role="alert">{statusMsg}</div>
    )}

    <section className={'pg-workspace'+(stacked?' stacked':'')} aria-label={L('代码编辑与运行区','Code editor and output')}>
     <div className="ai-card pg-pane">
      <div className="pg-pane-head">
       <span className="pg-file">
        {langMeta.file}
        {isDirty&&<span className="pg-dirty">{L('已修改','Modified')}</span>}
       </span>
       <span className="pg-runtime-badge">Ln {cursor.ln}, Col {cursor.col}</span>
      </div>
      <div className="pg-editor-wrap">
       <pre ref={gutterRef} className="pg-gutter" aria-hidden="true">{lineNumbers}</pre>
       <textarea
        ref={el=>{taRef.current=el;codeEditing(el)}}
        className={'pg-textarea'+(wrapLines?' wrap':'')}
        value={code}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={L('代码编辑器','Code editor')}
        onChange={e=>{setCurCode(e.target.value);requestAnimationFrame(updateCursor)}}
        onScroll={syncScroll}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onKeyDown={e=>{
         if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
          e.preventDefault();
          void runCode();
         }
        }}
       />
      </div>
      <div className="pg-pane-foot">
       <span>{L(`共 ${lineCount} 行 · ${code.length} 字符`,`${lineCount} lines · ${code.length} chars`)}</span>
      </div>
     </div>

     <div className="ai-card pg-pane">
      <div className="pg-pane-head">
       <span className="pg-file"><Terminal size={15}/>{L('运行输出','Output')}</span>
       <div className="pg-actions">
        {running&&(
         <span className="pg-status running"><Loader2 size={13} className="ai-spin"/>{L('正在运行…','Running…')}</span>
        )}
        {!running&&result&&(
         <span className={'pg-status '+(result.ok?'ok':'err')}>
          {result.ok?L(`成功 · ${result.durationMs}ms`,`Exited 0 · ${result.durationMs}ms`):L(`失败 (code ${result.exitCode??1}) · ${result.durationMs}ms`,`Failed (code ${result.exitCode??1}) · ${result.durationMs}ms`)}
         </span>
        )}
        {!running&&!result&&<span className="pg-status idle">{L('就绪','Ready')}</span>}
        {replaying&&(
         <button type="button" className="pg-mini-link" onClick={skipReplay}>
          <FastForward size={13} style={{display:'inline',marginRight:3,verticalAlign:'-2px'}}/>{L('立即显示','Show all')}
         </button>
        )}
        {(result||liveStdout||liveStderr)&&(
         <button type="button" className="pg-mini-link" onClick={()=>{clearReplayTimers();setResult(null);setLiveStdout('');setLiveStderr('')}} title={L('清空输出','Clear output')}>
          <Trash2 size={13}/>
         </button>
        )}
       </div>
      </div>

      <div className="pg-console-body" aria-live="polite">
       {!running&&!result&&(
        <div className="pg-out-empty">
         {aiFixing?(
          <>
           <Loader2 size={22} className="ai-spin" style={{margin:'0 auto 8px',display:'block'}}/>
           <p>{L('AI 正在补全依赖包与可运行 main 入口…','Completing packages & runnable main…')}</p>
          </>
         ):(
          <Terminal size={22} style={{margin:'0 auto',display:'block',opacity:.45}}/>
         )}
        </div>
       )}

       {running&&(
        <div className="pg-out-empty">
         <Loader2 size={22} className="ai-spin" style={{margin:'0 auto 8px',display:'block'}}/>
         <p>{L('运行中…','Running…')}</p>
        </div>
       )}

       {result?.compileErrors&&(
        <pre className="pg-out-err">{result.compileErrors}</pre>
       )}
       {result?.vetErrors&&(
        <pre className="pg-out-warn">{result.vetErrors}</pre>
       )}
       {liveStdout&&(
        <pre className={'pg-out-pre'+(lang==='sql'?' pg-out-sql':'')}>{liveStdout}</pre>
       )}
       {liveStderr&&(
        <pre className="pg-out-err">{liveStderr}</pre>
       )}
       {result&&!result.compileErrors&&!liveStdout&&!liveStderr&&!running&&(
        <p style={{color:'rgba(215,229,255,.55)',margin:0}}>{L('（程序没有向标准输出打印内容）','(No output written to stdout)')}</p>
       )}

       {activeLaunch?.expect&&(
        <div className={'pg-expect-box'+(result?.ok&&!running&&outputsMatchExpected(liveStdout,activeLaunch.expect)?' match':'')}>
         <div className="pg-expect-head">
          <span>{L('课程期望输出对照','Expected lesson output')}</span>
          {result?.ok&&!running&&(outputsMatchExpected(liveStdout,activeLaunch.expect)?(
           <em className="ok"><CheckCircle2 size={13}/>{L('输出与期望完全一致','Matches expected output')}</em>
          ):(
           <em className="diff">{L('可对比上方实际输出','Compare with actual output')}</em>
          ))}
         </div>
         <pre>{activeLaunch.expect}</pre>
        </div>
       )}

       {result&&(
        <div className="pg-exit-line">
         <span>{result.ok?'Program exited.':`Program exited (status ${result.exitCode??1}).`}</span>
         <div className="pg-exit-actions">
          {(!result.ok||runErrorText)&&(
           <button
            type="button"
            className="pg-mini-link fix"
            disabled={aiFixing||running}
            onClick={()=>void completeWithAi(code,runErrorText,true)}
           >
            {aiFixing?L('AI 修复中…','Fixing…'):L('AI 修复并重跑','AI Fix & Run')}
           </button>
          )}
          {(!result.ok||liveStdout)&&(
           <button type="button" className="pg-mini-link" onClick={askAi}>
            {result.ok?L('AI 讲解 →','Explain →'):L('AI 排查并注释修复 →','Diagnose & Comment Fix →')}
           </button>
          )}
         </div>
        </div>
       )}
      </div>
     </div>
    </section>
   </main>
   <AiDock
    context={{kind:'playground',playground:{lang:langMeta.label,code,output:liveStdout,error:runErrorText}}}
    request={tutorReq}
    chatKey={`playground:${lang}`}
    onApplyPlaygroundCode={applyAiPlaygroundCode}
    hello={L(`我是代码操场的 AI 老师。正在看你的 ${langMeta.label} 代码，可以帮你讲解、排查报错并提供可一键替换的完整修复代码。`,`I am the Playground AI tutor for ${langMeta.label} — ask me to explain, diagnose errors, or provide a full runnable fix to apply directly.`)}
    prompts={[
     L('排查报错，指出原错因并用注释对比给出可直接运行的完整修复代码','Diagnose error, explain cause, and provide annotated runnable fix'),
     L('用大白话讲讲这段代码在干什么？','Explain what this code does in plain words'),
     L('这段代码有哪些面试常考细节或边界条件？','What interview edge cases apply here?'),
    ]}
   />
  </div>
 );
}
