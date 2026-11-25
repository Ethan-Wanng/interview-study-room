'use client';
import {Fragment,useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeftRight,ArrowUpRight,BookPlus,Bot,Brain,Check,ChevronDown,ChevronUp,Copy,History,ImagePlus,Loader2,Maximize2,Minimize2,Play,RotateCcw,Send,SlidersHorizontal,Square,SquarePen,Trash2,X} from 'lucide-react';
import {clearChats,latestChat,loadChats,newChatId,onChatsChange,removeChat,saveChat,type SavedChat} from './tutor-history';
import {useI18n} from '../components/i18n';
import VoiceButton from '../components/voice-input';
import {TUTOR_IMAGES,TUTOR_MODELS,tutorModelBadge,type TutorContext,type TutorEvent,type TutorMessage,type TutorSegment} from '@/lib/tutor-types';

// 图片先在浏览器里压缩：长边不超过 1280 像素、转成 JPEG，太大就再缩一档。
async function compress(file:File):Promise<string|null>{
 const url=URL.createObjectURL(file);
 try{const img=await new Promise<HTMLImageElement>((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src=url});
  for(const [side,q] of [[1280,0.85],[960,0.75],[720,0.65]] as const){const s=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
   c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));const g=c.getContext('2d');if(!g)return null;
   g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);const out=c.toDataURL('image/jpeg',q);if(out.length<=TUTOR_IMAGES.size)return out}
  return null}catch{return null}finally{URL.revokeObjectURL(url)}}

// 发给接口前整理对话：相邻的同角色消息合并成一条（排队连发的几句一起问）；只有最后一条保留图片，更早的图片换成“[图片]”文字，控制请求大小。
function prepare(list:TutorMessage[]):TutorMessage[]{const out:TutorMessage[]=[];
 for(const m of list){const prev=out[out.length-1];if(prev&&prev.role===m.role){prev.text=[prev.text,m.text].filter(Boolean).join('\n\n');prev.images=[...(prev.images??[]),...(m.images??[])]}else out.push({...m,images:[...(m.images??[])]})}
 return out.map((m,i)=>{const imgs=m.images??[];if(i===out.length-1)return {role:m.role,text:m.text,...(imgs.length?{images:imgs.slice(-TUTOR_IMAGES.perMessage)}:{})};
  return {role:m.role,text:imgs.length?[m.text,'[图片]'].filter(Boolean).join('\n'):m.text}})}
import {providerMeta} from '@/lib/ai-config';
import {AiSettingsPanel,useAiConfigStatus} from './ai-settings';
import ThinkBox from './think-box';
import {getGeminiAutoProxy} from './gemini-proxy-pref';
import {getModelThinkingLevel,notifyTutorModelChanged,useModelThinkingLevel} from './thinking-pref';
import {getTutorThinkingSpec,THINKING_META,type ThinkingLevel} from '@/lib/thinking';
import {getLocalBridgeConfig,isLocalTutorReady,LOCAL_BRIDGE_PROVIDERS,LOCAL_PROVIDER_LABEL,useLocalBridgeConfig,type LocalBridgeProvider} from '@/lib/local-bridge-config';
import {probeBridgeProviders,streamTutorViaBridge} from '@/lib/local-bridge-client';
import {markdownEditing} from './code-input';
import AddToNoteButton from '../components/add-to-note';
import {detectPlaygroundLang,normalizePlaygroundLang,type PlaygroundLang} from '@/lib/playground-bridge';
import {InlineRunOutput,useInlineCodeRun} from '../components/inline-code-run';

const KEEP=28,MODEL_KEY='ai-tutor-model';
// 在同一道题（或同一张卡片）下保留临时对话，即使答题状态从“提示”切到“解析”或返回上一题也不丢失。
const chatCache=new Map<string,TutorMessage[]>();

// 页面上有几个“卡片 / 题目旁边的 AI 老师”：有的话全站的 AI 老师就不显示，避免同时出现两个按钮。考试时也用它把全站 AI 老师藏起来。
let docks=0;const dockListeners=new Set<()=>void>();
const dockSubscribe=(l:()=>void)=>{dockListeners.add(l);return()=>{dockListeners.delete(l)}};
export function useDockPresence(active=true){useEffect(()=>{if(!active)return;docks++;dockListeners.forEach(l=>l());return()=>{docks--;dockListeners.forEach(l=>l())}},[active])}
export const useOtherDocks=()=>useSyncExternalStore(dockSubscribe,()=>docks>0,()=>false);

// 顶栏「AI问答」按钮与当前挂载的 AiDock 同步：页面内卡片/题目专属 AiDock 优先于全站 AiDock。
type DockEntry={id:number;site:boolean;toggle:()=>void};
let nextDockId=1;
let mountedDocks:DockEntry[]=[];
let activeDockSnap:DockEntry|null=null;
// 切换学习卡片 / 下一题时（含组件重新挂载），保持当前 AI 问答的展开与全屏状态；退出卡片/题目区域后自动恢复默认收起。
let dockOpenMem=false;
let dockFullMem=false;
let openDockCount=0;
const headerAiListeners=new Set<()=>void>();
function updateActiveDockSnap(){
 const next=mountedDocks.find(d=>!d.site)??mountedDocks[0]??null;
 if(next!==activeDockSnap){activeDockSnap=next;headerAiListeners.forEach(l=>l())}
}
const subscribeHeaderAi=(l:()=>void)=>{headerAiListeners.add(l);return()=>{headerAiListeners.delete(l)}};
export function HeaderAiButton(){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const dock=useSyncExternalStore(subscribeHeaderAi,()=>activeDockSnap,()=>null);
 if(!dock)return null;
 return <button type="button" className="header-pill" onClick={()=>dock.toggle()} title={L('打开 AI 问答','Ask the AI tutor')} aria-label={L('AI问答','Ask AI')}><Bot size={16}/><span>{L('AI问答','Ask AI')}</span></button>;
}

// Markdown 显示：规范解析围栏代码块（带语言标签与一键复制，横向滚动不折行破坏缩进）、标题、列表、行内代码、**加粗**、[文字](/站内链接)。
// 链接只认站内地址（以 / 开头），AI 给出的外部网址按普通文字显示。
const linkRe=/\[([^\]\n]+)\]\((\/[^)\s]*)\)/;
function inlineCode(s:string){return s.split(/(`[^`\n]+`)/g).map((p,i)=>p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>:<Fragment key={i}>{p}</Fragment>)}
function inline(s:string){return s.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(\/[^)\s]*\))/g).map((p,i)=>{const link=p.match(linkRe);
 return p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>:p.startsWith('**')&&p.endsWith('**')&&p.length>4?<b key={i}>{inlineCode(p.slice(2,-2))}</b>:link&&link[0]===p?<a key={i} className="tutor-link" href={link[2]}>{link[1]}</a>:<Fragment key={i}>{p}</Fragment>})}

type MdBlock={kind:'code';lang:string;code:string}|{kind:'text';text:string};
function parseMdBlocks(src:string):MdBlock[]{
 const lines=src.replace(/\r\n?/g,'\n').split('\n'),blocks:MdBlock[]=[],prose:string[]=[];
 let fenceChar='',fenceLen=0,codeLang='',codeLines:string[]=[];
 const flushProse=()=>{if(!prose.length)return;const t=prose.join('\n').trim();if(t)blocks.push({kind:'text',text:t});prose.length=0};
 for(const line of lines){
  if(!fenceChar){
   const m=line.match(/^[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$/);
   if(m){flushProse();fenceChar=m[1][0];fenceLen=m[1].length;codeLang=m[2].trim().split(/\s+/)[0]||'';codeLines=[];continue}
   prose.push(line);
  }else{
   const trimmed=line.trim();
   if(trimmed.length>=fenceLen&&trimmed.split('').every(ch=>ch===fenceChar)){
    blocks.push({kind:'code',lang:codeLang,code:codeLines.join('\n')});
    fenceChar='';fenceLen=0;codeLang='';codeLines=[];
   }else{
    codeLines.push(line);
   }
  }
 }
 if(fenceChar)blocks.push({kind:'code',lang:codeLang,code:codeLines.join('\n')});
 else flushProse();
 return blocks;
}

const NON_RUNNABLE_FENCE=/^(?:bash|sh|shell|zsh|powershell|ps1|cmd|bat|json|jsonc|yaml|yml|toml|xml|html|css|scss|less|md|markdown|txt|text|plain|diff|patch|dockerfile|docker|nginx|conf|ini|env|http|log|mermaid|proto|protobuf|graphql|regex|csv)$/i;

function TutorCodeBlock({
 lang,
 code,
 caret,
 onApplyPlayground,
}:{
 lang:string;
 code:string;
 caret?:boolean;
 onApplyPlayground?:(code:string,runAfter?:boolean)=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [copied,setCopied]=useState(false);
 const [applied,setApplied]=useState(false);

 const runLang:PlaygroundLang|null=useMemo(()=>{
  const direct=normalizePlaygroundLang(lang);
  if(direct)return direct;
  if(lang&&NON_RUNNABLE_FENCE.test(lang.trim()))return null;
  return detectPlaygroundLang(code,null);
 },[lang,code]);

 const runner=useInlineCodeRun(onApplyPlayground?null:runLang,code,{
  title:`AI · ${(lang||runLang||'code').toUpperCase()}`,
 });
 const shownCode=onApplyPlayground?code:runner.displayCode;

 const onCopy=async()=>{if(await copyText(shownCode)){setCopied(true);setTimeout(()=>setCopied(false),1600)}};
 const onApply=(runAfter:boolean)=>{
  if(!onApplyPlayground)return;
  onApplyPlayground(code,runAfter);
  setApplied(true);
  setTimeout(()=>setApplied(false),1800);
 };
 return (
  <div className="tutor-code">
   <div className="tutor-code-head">
    <span>{lang||(runLang==='sql'?'mysql':runLang)||'code'}</span>
    <div className="tutor-code-actions">
     {onApplyPlayground&&!caret&&(
      <>
       <button
        type="button"
        className={'tutor-code-copy tutor-code-apply'+(applied?' applied':'')}
        onClick={()=>onApply(false)}
        title={L('用这段完整代码替换操场代码','Replace Playground code')}
       >
        {applied?<Check size={12}/>:<ArrowLeftRight size={12}/>}
        <span>{applied?L('已替换','Applied'):L('替换到操场','Apply')}</span>
       </button>
       <button
        type="button"
        className="tutor-code-copy tutor-code-run"
        onClick={()=>onApply(true)}
        title={L('替换操场代码并立即运行','Apply & Run in Playground')}
       >
        <Play size={11}/>
        <span>{L('替换并运行','Run')}</span>
       </button>
      </>
     )}
     {!onApplyPlayground&&runLang&&!caret&&(
      <>
       {runner.busy?(
        <button type="button" className="tutor-code-copy tutor-code-stop" onClick={runner.stop}>
         <Square size={11} fill="currentColor"/>
         <span>{L('停止','Stop')}</span>
        </button>
       ):(
        <button type="button" className="tutor-code-copy tutor-code-run" onClick={()=>void runner.run()} title={L('直接运行这段代码','Run code')}>
         <Play size={11}/>
         <span>{L('运行','Run')}</span>
        </button>
       )}
       <button type="button" className="tutor-code-copy" onClick={runner.openPlayground} title={L('在操场打开','Open in Playground')} aria-label={L('在操场打开','Open in Playground')}>
        <ArrowUpRight size={12}/>
       </button>
      </>
     )}
     <button type="button" className={'tutor-code-copy'+(copied?' copied':'')} onClick={()=>void onCopy()} title={L('复制代码','Copy code')}>
      {copied?<><Check size={12}/><span>{L('已复制','Copied')}</span></>:<><Copy size={12}/><span>{L('复制','Copy')}</span></>}
     </button>
    </div>
   </div>
   <pre><code>{shownCode}{caret&&<span className="ai-caret"/>}</code></pre>
   {!onApplyPlayground&&<InlineRunOutput running={runner.running} completing={runner.completing} result={runner.result} error={runner.error} onClear={runner.clear} onAiFix={()=>void runner.aiFix()} onOpenPlayground={runLang?runner.openPlayground:undefined}/>}
  </div>
 );
}

function ProseBlock({text,caret}:{text:string;caret?:boolean}){
 const chunks=text.split(/\n{2,}/),last=chunks.length-1;
 return <>{chunks.map((chunk,ci)=>{
  const tailCaret=caret&&ci===last?<span className="ai-caret"/>:null;
  const lines=chunk.split('\n');
  if(lines.length===1){
   const hm=lines[0].match(/^[ \t]{0,3}#{1,4}[ \t]+(.+)$/);
   if(hm)return <h4 key={ci} className="tutor-md-h">{inline(hm[1])}{tailCaret}</h4>;
  }
  if(lines.every(l=>/^[ \t]*[-*+][ \t]+/.test(l))){
   return <ul key={ci} className="tutor-md-list">{lines.map((l,li)=><li key={li}>{inline(l.replace(/^[ \t]*[-*+][ \t]+/,''))}{li===lines.length-1?tailCaret:null}</li>)}</ul>;
  }
  if(lines.every(l=>/^[ \t]*\d+[.)][ \t]+/.test(l))){
   return <ol key={ci} className="tutor-md-list">{lines.map((l,li)=><li key={li}>{inline(l.replace(/^[ \t]*\d+[.)][ \t]+/,''))}{li===lines.length-1?tailCaret:null}</li>)}</ol>;
  }
  return <p key={ci}>{inline(chunk)}{tailCaret}</p>;
 })}</>;
}

function Md({text,caret,onApplyPlayground}:{text:string;caret?:boolean;onApplyPlayground?:(code:string,runAfter?:boolean)=>void}){
 const blocks=parseMdBlocks(text);
 if(!blocks.length)return caret?<p><span className="ai-caret"/></p>:null;
 return <>{blocks.map((b,i)=>b.kind==='code'
  ?<TutorCodeBlock key={i} lang={b.lang} code={b.code} caret={caret&&i===blocks.length-1} onApplyPlayground={onApplyPlayground}/>
  :<ProseBlock key={i} text={b.text} caret={caret&&i===blocks.length-1}/>)}</>;
}

// 交错思考/输出分段累积器：完整保留「思考1 -> 输出1 -> 思考2 -> 输出2」的真实时间顺序。
function createSegmentStream(onUpdate:(segs:TutorSegment[])=>void){
 const segs:TutorSegment[]=[];
 let thinkStart=0;
 const emit=()=>onUpdate(segs.map(s=>({...s})));
 const pushThink=(d:string)=>{
  if(!d)return;
  const last=segs[segs.length-1];
  if(last&&last.kind==='think'){last.text+=d}
  else{thinkStart=Date.now();segs.push({kind:'think',text:d})}
  emit();
 };
 const pushText=(d:string)=>{
  if(!d)return;
  const last=segs[segs.length-1];
  if(last&&last.kind==='think'){
   last.secs=Math.max(1,Math.round((Date.now()-(thinkStart||Date.now()))/1000));
   segs.push({kind:'text',text:d});
  }else if(last&&last.kind==='text'){
   last.text+=d;
  }else{
   segs.push({kind:'text',text:d});
  }
  emit();
 };
 const reset=()=>{segs.length=0;thinkStart=0;emit()};
 const finalize=()=>{
  const last=segs[segs.length-1];
  if(last&&last.kind==='think'&&!last.secs){
   last.secs=Math.max(1,Math.round((Date.now()-(thinkStart||Date.now()))/1000));
  }
  const clean=segs.map(s=>({...s,text:s.kind==='text'?s.text.trim():s.text})).filter(s=>s.text);
  const text=clean.filter(s=>s.kind==='text').map(s=>s.text).join('\n\n');
  const think=clean.filter(s=>s.kind==='think').map(s=>s.text).join('\n\n');
  const secs=clean.filter(s=>s.kind==='think').reduce((n,s)=>n+(s.secs??0),0);
  return {segments:clean,text,think,secs};
 };
 return {pushThink,pushText,reset,finalize};
}

// 读 /api/tutor 或本地桥接的流：保留交错思考/输出分段，写完返回整段回复与实际响应的模型标识；支持手动中止并保留已显示内容。
async function ask(context:TutorContext,messages:TutorMessage[],onSegments:(segs:TutorSegment[])=>void,model:string,onModel?:(m:string)=>void,signal?:AbortSignal,thinkingLevel?:ThinkingLevel):Promise<{ok:true;text:string;think:string;secs:number;segments:TutorSegment[];remaining?:number;model?:string}|{ok:false;aborted?:boolean;partial?:string;think?:string;secs?:number;segments?:TutorSegment[];model?:string;message:string}>{
 const NET='网络连接失败，这次没有扣次数，请重试。';
 const acc=createSegmentStream(onSegments);
 const localCfg=getLocalBridgeConfig();
 if(isLocalTutorReady(localCfg)&&(model==='auto'||model==='local')){
  let modelName='';
  try{
   const out=await streamTutorViaBridge({
    cfg:localCfg,
    context,
    messages,
    thinkingLevel:thinkingLevel??'auto',
    signal,
    onModel:m=>{modelName=m;onModel?.(m)},
    onThink:d=>acc.pushThink(d),
    onDelta:d=>acc.pushText(d),
   });
   const fin=acc.finalize();
   if(signal?.aborted){
    return {ok:false,aborted:true,partial:fin.text,think:fin.think||undefined,secs:fin.secs||undefined,segments:fin.segments.length?fin.segments:undefined,model:modelName||undefined,message:''};
   }
   return {ok:true,text:fin.text,think:fin.think,secs:fin.secs,segments:fin.segments,model:out.model||modelName||undefined};
  }catch(e){
   const fin=acc.finalize();
   if(signal?.aborted){
    return {ok:false,aborted:true,partial:fin.text,think:fin.think||undefined,secs:fin.secs||undefined,segments:fin.segments.length?fin.segments:undefined,model:modelName||undefined,message:''};
   }
   return {ok:false,message:e instanceof Error&&e.message?e.message:NET};
  }
 }
 let res:Response;
 try{res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,messages,model,geminiProxy:getGeminiAutoProxy(),thinkingLevel:thinkingLevel??'auto'}),signal})}catch{if(signal?.aborted)return {ok:false,aborted:true,message:''};return {ok:false,message:NET}}
 if(!(res.headers.get('content-type')??'').includes('ndjson')){try{const j=await res.json() as {message?:string};return {ok:false,message:j.message??NET}}catch{return {ok:false,message:NET}}}
 let done:{remaining:number;model?:string}|null=null,err='',modelName='';
 const reader=res.body!.getReader(),onAbort=()=>{void reader.cancel().catch(()=>{})};
 signal?.addEventListener('abort',onAbort,{once:true});
 try{const dec=new TextDecoder();let buf='';
  for(;;){if(signal?.aborted)break;const {done:end,value}=await reader.read();if(end)break;buf+=dec.decode(value,{stream:true});let i;
   while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;const e=JSON.parse(line) as TutorEvent;
    if(e.t==='model'){modelName=e.model;onModel?.(e.model)}else if(e.t==='delta'){acc.pushText(e.text)}else if(e.t==='think'){acc.pushThink(e.text)}else if(e.t==='reset'){modelName='';acc.reset();onModel?.('')}else if(e.t==='done')done={remaining:e.remaining,model:e.model||modelName||undefined};else if(e.t==='error')err=e.message}}}
 catch{err||=NET}
 finally{signal?.removeEventListener('abort',onAbort)}
 const fin=acc.finalize();
 if(signal?.aborted){
  return {ok:false,aborted:true,partial:fin.text,think:fin.think||undefined,secs:fin.secs||undefined,segments:fin.segments.length?fin.segments:undefined,model:modelName||undefined,message:''};
 }
 return done&&!err?{ok:true,text:fin.text,think:fin.think,secs:fin.secs,segments:fin.segments,remaining:done.remaining,model:done.model}:{ok:false,message:err||NET}}

async function copyText(text:string):Promise<boolean>{
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}}catch{}
 try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');document.body.removeChild(ta);return ok}catch{return false}
}

// 外部按钮让面板打开并直接发出一句话（比如“给我一点提示”）：每次 n 变化就执行一次。
export type DockRequest={text:string;n:number};

// 常驻的 AI 老师：由顶栏的「AI问答」按钮打开，点开是侧边对话面板（手机上全屏抽屉），在同一道题下保留临时对话。
// site：全站的 AI 老师（挂在 layout 里）；其余是卡片、题目旁边的 AI 老师，挂上时会让全站的那个让位。hello：没有对话时的开场白。
export default function AiDock({context,prompts,request,title,chatKey,site,hello,onApplyPlaygroundCode,noteBackHref,onBeforeNoteLeave}:{context:TutorContext;prompts:string[];request?:DockRequest;title?:string;chatKey?:string;site?:boolean;hello?:string;onApplyPlaygroundCode?:(code:string,runAfter?:boolean)=>void;noteBackHref?:string;onBeforeNoteLeave?:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 useDockPresence(!site);
 const sessionKey=chatKey??('quiz' in context?'quiz:'+context.quiz.q:'lesson' in context?'lesson:'+context.lesson.title:'playground' in context?'playground:'+context.playground.lang:'site');
 const [liveSegs,setLiveSegs]=useState<TutorSegment[]>([]),[liveModel,setLiveModel]=useState(''),[copiedAt,setCopiedAt]=useState<number|null>(null);
 const [selPop,setSelPop]=useState<{text:string;x:number;y:number}|null>(null);
 const [selNote,setSelNote]=useState<{n:number;title:string;text:string}>({n:0,title:'',text:''});
 const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [open,setOpenState]=useState(()=>!site&&dockOpenMem),[full,setFullState]=useState(()=>!site&&dockFullMem),[showCfg,setShowCfg]=useState(false),[msgs,setMsgsState]=useState<TutorMessage[]>(()=>chatCache.get(sessionKey)??[]),[live,setLive]=useState<string|null>(null),[input,setInput]=useState(''),[error,setError]=useState(''),[left,setLeft]=useState<number|null>(null);
 const setFull=useCallback((next:boolean|((v:boolean)=>boolean))=>{
  setFullState(prev=>{
   const val=typeof next==='function'?next(prev):next;
   if(!site)dockFullMem=val;
   return val;
  });
 },[site]);
 const setOpen=useCallback((next:boolean|((v:boolean)=>boolean))=>{
  setOpenState(prev=>{
   const val=typeof next==='function'?next(prev):next;
   if(!site)dockOpenMem=val;
   if(!val){
    if(!site)dockFullMem=false;
    setFullState(false);
   }
   return val;
  });
 },[site]);
 useEffect(()=>{
  const entry:DockEntry={id:nextDockId++,site:!!site,toggle:()=>setOpen(v=>!v)};
  mountedDocks=[...mountedDocks,entry];
  updateActiveDockSnap();
  return()=>{
   mountedDocks=mountedDocks.filter(d=>d.id!==entry.id);
   updateActiveDockSnap();
   if(!site){
    queueMicrotask(()=>{
     if(!mountedDocks.some(d=>!d.site)){dockOpenMem=false;dockFullMem=false}
    });
   }
  };
 },[site,setOpen]);
 const {status:aiStatus}=useAiConfigStatus();
 const [localCfg,updateLocal]=useLocalBridgeConfig();
 const localTutorActive=isLocalTutorReady(localCfg);
 const localSpecCfg=localTutorActive?localCfg:null;
 const isGuest=Boolean(aiStatus?.isGuest);
 const hasCustom=!isGuest&&!!aiStatus?.settings?.enabled&&!!aiStatus?.settings?.hasKey,customBadge=hasCustom?providerMeta(aiStatus!.settings!.provider).badge:'';
 // 若已启用本地客户端，在打开面板时静默同步一次模型列表与各模型思考强度，确保升级桥接或切换客户端后立即可用。
 const probedOnceRef=useRef(false);
 useEffect(()=>{
  if(!open||!localTutorActive||probedOnceRef.current)return;
  probedOnceRef.current=true;
  let alive=true;
  void probeBridgeProviders(localCfg.port,localCfg.token).then(out=>{
   if(!alive||!out.ok)return;
   const nextCatalog={...(localCfg.providerModels??{})};
   for(const p of out.providers){
    if(p.status==='ready'&&p.models.length){
     nextCatalog[p.id]=p.models.map(m=>({
      id:m.id,
      label:m.label,
      ...(m.thinkingLevels?{thinkingLevels:m.thinkingLevels}:{}),
      ...(m.defaultThinkingLevel?{defaultThinkingLevel:m.defaultThinkingLevel}:{}),
     }));
    }
   }
   const curProv=out.providers.find(p=>p.id===localCfg.provider&&p.status==='ready');
   if(curProv){
    const curId=localCfg.model.trim()||curProv.defaultModel||curProv.models[0]?.id||'';
    const matched=curProv.models.find(m=>m.id===curId)??curProv.models[0];
    updateLocal({
     ...(curId&&!localCfg.model.trim()?{model:curId}:{}),
     thinkingLevels:matched?.thinkingLevels??[],
     defaultThinkingLevel:matched?.defaultThinkingLevel??'',
     providerModels:nextCatalog,
    });
   }else if(Object.keys(nextCatalog).length){
    updateLocal({providerModels:nextCatalog});
   }
  });
  return()=>{alive=false};
 },[open,localTutorActive,localCfg.port,localCfg.token,localCfg.provider,localCfg.model,localCfg.providerModels,updateLocal]);
 // 选模型：默认（本地客户端或专属 API 优先，否则 DeepSeek V4.1 Flash）、本地客户端模型分组、站点模型、自己的专属 API。选择记在浏览器里。
 const customSpecCfg=useMemo(()=>(hasCustom&&aiStatus?.settings?{provider:aiStatus.settings.provider,model:aiStatus.settings.model}:null),[hasCustom,aiStatus?.settings]);
 const [model,setModelState]=useState<string>(()=>{try{const raw=localStorage.getItem(MODEL_KEY)||'auto',v=raw==='gemini-flash'?'gemini-4':raw;return v==='auto'||v==='custom'||v==='local'||TUTOR_MODELS.some(m=>m.id===v)?v:'auto'}catch{return 'auto'}}),modelRef=useRef(model); // 以前存的旧模型名（deepseek-chat 等）已经没有了，回到默认
 const visibleTutorModels=useMemo(()=>isGuest?TUTOR_MODELS.filter(m=>m.provider!=='gemini'):TUTOR_MODELS,[isGuest]);
 const effectiveModel=
  !localTutorActive&&model==='local'?'auto'
  :(isGuest&&TUTOR_MODELS.find(m=>m.id===model)?.provider==='gemini'?'auto':model);
 const isUsingLocalTutor=localTutorActive&&(effectiveModel==='auto'||effectiveModel==='local');
 const {scopeKey:thinkScope,spec:thinkSpec}=getTutorThinkingSpec(effectiveModel,customSpecCfg,localSpecCfg);
 const [thinking,setThinking]=useModelThinkingLevel(thinkScope,thinkSpec);
 const customRef=useRef(customSpecCfg);useEffect(()=>{customRef.current=customSpecCfg},[customSpecCfg]);
 const localRef=useRef(localSpecCfg);useEffect(()=>{localRef.current=localSpecCfg},[localSpecCfg]);
 const setModel=(v:string)=>{modelRef.current=v;setModelState(v);try{localStorage.setItem(MODEL_KEY,v)}catch{};notifyTutorModelChanged()};
 useEffect(()=>{if(model==='custom'&&aiStatus&&!hasCustom)setModel('auto');if(isGuest&&TUTOR_MODELS.find(m=>m.id===model)?.provider==='gemini')setModel('auto')},[aiStatus,hasCustom,isGuest,model]); // eslint-disable-line react-hooks/exhaustive-deps
 const localModelGroups=useMemo(()=>{
  if(!localTutorActive)return [] as {provider:LocalBridgeProvider;models:{id:string;label:string;thinkingLevels?:string[];defaultThinkingLevel?:string}[]}[];
  const groups:{provider:LocalBridgeProvider;models:{id:string;label:string;thinkingLevels?:string[];defaultThinkingLevel?:string}[]}[]=[];
  const cat=localCfg.providerModels??{};
  for(const pid of LOCAL_BRIDGE_PROVIDERS){
   const list=cat[pid];
   if(list&&list.length){
    const curInList=pid===localCfg.provider&&localCfg.model.trim()&&!list.some(m=>m.id===localCfg.model.trim());
    groups.push({
     provider:pid,
     models:curInList?[{id:localCfg.model.trim(),label:localCfg.model.trim()},...list]:list,
    });
   }else if(pid===localCfg.provider){
    const id=localCfg.model.trim()||'default';
    groups.push({provider:pid,models:[{id,label:id,thinkingLevels:localCfg.thinkingLevels,defaultThinkingLevel:localCfg.defaultThinkingLevel}]});
   }
  }
  return groups;
 },[localTutorActive,localCfg.provider,localCfg.model,localCfg.providerModels,localCfg.thinkingLevels,localCfg.defaultThinkingLevel]);
 const activeLocalSelectVal=useMemo(()=>{
  if(!isUsingLocalTutor)return '';
  const curGroup=localModelGroups.find(g=>g.provider===localCfg.provider);
  const targetId=localCfg.model.trim()||curGroup?.models[0]?.id||'default';
  return `local:${localCfg.provider}/${targetId}`;
 },[isUsingLocalTutor,localModelGroups,localCfg.provider,localCfg.model]);
 const selectValue=isUsingLocalTutor&&activeLocalSelectVal?activeLocalSelectVal:effectiveModel;
 const onPickModel=(val:string)=>{
  if(val.startsWith('local:')){
   const rest=val.slice(6),slash=rest.indexOf('/');
   const pid=(slash>0?rest.slice(0,slash):rest) as LocalBridgeProvider;
   const mid=slash>0?rest.slice(slash+1):'';
   if(LOCAL_BRIDGE_PROVIDERS.includes(pid)){
    const matched=localCfg.providerModels?.[pid]?.find(m=>m.id===mid);
    updateLocal({
     provider:pid,
     model:mid==='default'?'':mid,
     thinkingLevels:matched?.thinkingLevels??[],
     defaultThinkingLevel:matched?.defaultThinkingLevel??'',
    });
    setModel('local');
    return;
   }
  }
  setModel(val);
 };
 const modelPicker=<select className="ai-dock-model" value={selectValue} onChange={e=>onPickModel(e.target.value)} title={L('选择 AI 模型','Choose the AI model')} aria-label={L('选择 AI 模型','Choose the AI model')}>
  {!localTutorActive&&(
   <option value="auto">
    {hasCustom
     ?L(`默认（我的 ${customBadge}）`,`Default (my ${customBadge})`)
     :isGuest
      ?L('默认（DeepSeek）','Default (DeepSeek)')
      :L('默认（自动 · DeepSeek / Gemini 4）','Default (Auto · DeepSeek / Gemini 4)')}
   </option>
  )}
  {localModelGroups.map(g=>(
   <optgroup key={g.provider} label={L(`本地 · ${LOCAL_PROVIDER_LABEL[g.provider]}`,`Local · ${LOCAL_PROVIDER_LABEL[g.provider]}`)}>
    {g.models.map(m=>(
     <option key={`${g.provider}/${m.id}`} value={`local:${g.provider}/${m.id}`}>
      {LOCAL_PROVIDER_LABEL[g.provider]} → {m.label}
     </option>
    ))}
   </optgroup>
  ))}
  {localTutorActive?(
   <optgroup label={L('站点模型','Site Models')}>
    {visibleTutorModels.map(m=><option key={m.id} value={m.id} title={L(m.note[0],m.note[1])}>{L(m.label[0],m.label[1])}{m.vision?L(' · 识图',' · images'):''}</option>)}
    {hasCustom&&<option value="custom">{L(`我的 API：${customBadge}`,`My API: ${customBadge}`)}</option>}
   </optgroup>
  ):(
   <>
    {visibleTutorModels.map(m=><option key={m.id} value={m.id} title={L(m.note[0],m.note[1])}>{L(m.label[0],m.label[1])}{m.vision?L(' · 识图',' · images'):''}</option>)}
    {hasCustom&&<option value="custom">{L(`我的 API：${customBadge}`,`My API: ${customBadge}`)}</option>}
   </>
  )}
 </select>;
 const box=useRef<HTMLDivElement>(null),busy=live!==null,handled=useRef(request?.n??0);
 // images：输入框里待发送的图片；answerAt：AI 正在回复的位置（回复插在这条之后，回复期间新发的消息排在后面）。
 const [images,setImages]=useState<string[]>([]),[answerAt,setAnswerAt]=useState(-1),fileRef=useRef<HTMLInputElement>(null),inputRef=useRef<HTMLTextAreaElement>(null);
 const msgsRef=useRef(msgs),running=useRef(false),stick=useRef(true);
 // 对话记录：每段对话有一个 id，写一条就存一次（浏览器里，并同步到账号）。回到同一张卡片、同一道题时接着上次的聊；点“新对话”换一个 id，旧的留在历史里。
 const chatTitle='quiz' in context?context.quiz.q:'lesson' in context?context.lesson.title:'playground' in context?L(`代码操场 · ${context.playground.lang}`,`Playground · ${context.playground.lang}`):L('全站提问','Site-wide chat');
 const chatId=useRef(''),[showHistory,setShowHistory]=useState(false),[chats,setChats]=useState<SavedChat[]>([]),[viewing,setViewing]=useState<SavedChat|null>(null);
 const sessionGen=useRef(0),retrySnapshotRef=useRef<{gen:number;msgs:TutorMessage[]}|null>(null),abortRef=useRef<AbortController|null>(null);
 useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current)},[]);
 const setMsgs=(next:TutorMessage[])=>{msgsRef.current=next;setMsgsState(next);if(next.length)chatCache.set(sessionKey,next);else chatCache.delete(sessionKey);
  if(next.length&&!chatId.current)chatId.current=newChatId(sessionKey);
  if(chatId.current)saveChat({id:chatId.current,key:sessionKey,title:sessionKey==='site'?(next.find(m=>m.role==='user')?.text||chatTitle):chatTitle,msgs:next})};
 useEffect(()=>{sessionGen.current++;running.current=false;retrySnapshotRef.current=null;abortRef.current=null;const saved=latestChat(sessionKey),m=chatCache.get(sessionKey)??saved?.msgs??[];chatId.current=saved?.id??'';msgsRef.current=m;setMsgsState(m);setLive(null);setLiveSegs([]);setLiveModel('');setAnswerAt(-1);setError('');setViewing(null);setCopiedAt(null)},[sessionKey]);
 useEffect(()=>{const sync=()=>setChats(loadChats());sync();return onChatsChange(sync)},[]);
 const newChat=()=>{abortRef.current?.abort();abortRef.current=null;retrySnapshotRef.current=null;chatId.current='';chatCache.delete(sessionKey);msgsRef.current=[];setMsgsState([]);setError('');setViewing(null);setShowHistory(false);setCopiedAt(null)};
 // 打开一段历史对话：就是这里的对话就直接接着聊；别处的对话先只读查看，可以选择“接着这段继续问”（之后的提问按当前页面的内容回答）。
 const openChat=(c:SavedChat)=>{setShowHistory(false);setCopiedAt(null);if(c.key===sessionKey){abortRef.current?.abort();abortRef.current=null;retrySnapshotRef.current=null;chatId.current=c.id;chatCache.set(sessionKey,c.msgs);msgsRef.current=c.msgs;setMsgsState(c.msgs);setViewing(null)}else setViewing(c)};
 const adoptChat=(c:SavedChat)=>{abortRef.current?.abort();abortRef.current=null;retrySnapshotRef.current=null;chatId.current='';setViewing(null);setCopiedAt(null);setMsgs(c.msgs)};
 const shown=viewing?viewing.msgs:msgs;
 // 对话下方的快捷提问可以收起，只留一行“接着问”；收起与否记在浏览器里。
 const [hidePrompts,setHidePrompts]=useState(false);
 useEffect(()=>{try{setHidePrompts(localStorage.getItem('ai-tutor-prompts-hidden')==='1')}catch{}},[]);
 const togglePrompts=()=>setHidePrompts(v=>{try{localStorage.setItem('ai-tutor-prompts-hidden',v?'0':'1')}catch{}return !v});
 // 打开时并排停靠：给 body 加 ai-docked，样式据此让页面（包括放大阅读层）给面板让出位置；电脑上面板是右侧一栏，手机上是底部半屏抽屉。
 useEffect(()=>{
  if(!open)return;
  openDockCount++;
  document.body.classList.add('ai-docked');
  return()=>{
   openDockCount=Math.max(0,openDockCount-1);
   if(openDockCount===0)document.body.classList.remove('ai-docked');
  };
 },[open]);
 // 全屏放大阅读模式：锁住底层页面滚动，按 Esc 还原为侧边栏而不关闭下层放大卡片。
 useEffect(()=>{
  if(!open||!full)return;
  document.body.classList.add('ai-dock-full');
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){
    e.preventDefault();
    e.stopPropagation();
    setFull(false);
   }
  };
  window.addEventListener('keydown',onKey,true);
  return()=>{
   document.body.classList.remove('ai-dock-full');
   window.removeEventListener('keydown',onKey,true);
  };
 },[open,full,setFull]);
 // 只有停在底部时才跟着新内容滚到底；往上翻看时不打扰，翻回底部后继续跟随。
 useEffect(()=>{const el=box.current;if(el&&stick.current)el.scrollTop=el.scrollHeight},[msgs,live,liveSegs,open]);
 useEffect(()=>{if(open)stick.current=true},[open]);
 const onScroll=()=>{const el=box.current;if(el)stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<40};
 // 输入框随内容长高（最多约 6 行），空着或只有一行时和发送按钮一样高。
 useEffect(()=>{const el=inputRef.current;if(!el)return;el.style.height='';if(!input||el.scrollHeight<=el.clientHeight+2)return;el.style.height=Math.min(el.scrollHeight+2,160)+'px'},[input,open,showCfg]);
 // 发消息：AI 正在回复时也可以继续发，新消息先排队，等这条回复写完再一起问。
 function send(text:string,imgs:string[]=[]){const t=text.trim();if(!t&&!imgs.length)return;
  retrySnapshotRef.current=null;setCopiedAt(null);
  setMsgs([...msgsRef.current,{role:'user',text:t,...(imgs.length?{images:imgs}:{})}]);setInput('');setImages([]);setError('');stick.current=true;void pump()}
 // 复制单段 AI 回答内容。
 async function copyMsg(i:number,text:string){
  if(!text)return;
  const ok=await copyText(text);
  if(!ok)return;
  if(copyTimer.current)clearTimeout(copyTimer.current);
  setCopiedAt(i);
  copyTimer.current=setTimeout(()=>setCopiedAt(cur=>cur===i?null:cur),1800);
 }
 // 重试某一段 AI 回答：保留此前提问并用当前所选模型重新生成；若失败则恢复原对话并展示错误。
 function retryAt(i:number){
  if(busy||viewing||i<=0)return;
  const snapshot=msgsRef.current;
  if(snapshot[i]?.role!=='model'||snapshot[i-1]?.role!=='user')return;
  retrySnapshotRef.current={gen:sessionGen.current,msgs:snapshot};
  setError('');setCopiedAt(null);stick.current=true;
  setMsgs(snapshot.slice(0,i));
  void pump();
 }
 // 停止当前正在生成的回答：若已有部分回答则保留为带模型标签的回答气泡（可直接复制或重试），否则把刚发送但尚未回答的问题退回输入框以便补写或换模型。
 function stopAnswering(){
  abortRef.current?.abort();
 }
 function restoreDraft(failed:TutorMessage[]){
  const textParts=failed.map(m=>m.text).filter(Boolean),cur=inputRef.current?.value??'';
  const merged=[...textParts,cur.trim()?cur:''].filter(Boolean).join('\n\n');
  if(merged)setInput(merged);
  const imgs=failed.flatMap(m=>m.images??[]);
  if(imgs.length)setImages(prev=>[...imgs,...prev].slice(0,TUTOR_IMAGES.perMessage));
  requestAnimationFrame(()=>inputRef.current?.focus());
 }
 // 依次回答末尾还没回复的学习者消息。
 async function pump(){if(running.current)return;running.current=true;const gen=sessionGen.current,reqKey=sessionKey,reqTitle=chatTitle,reqChatId=chatId.current||newChatId(reqKey);
  try{for(;;){if(sessionGen.current!==gen)break;
   const all=msgsRef.current;if(!all.length||all[all.length-1].role!=='user')break;
   const at=all.length;let sent=prepare(all).slice(-KEEP);while(sent[0]?.role!=='user')sent=sent.slice(1); // 对话太长时只带最近的部分，第一条必须是学习者发的
   const ctl=new AbortController();abortRef.current=ctl;
   setAnswerAt(at);setLive('');setLiveSegs([]);setLiveModel('');
   const curSpec=getTutorThinkingSpec(modelRef.current,customRef.current,localRef.current);
   const curThinking=curSpec.spec.locked?'auto':getModelThinkingLevel(curSpec.scopeKey,curSpec.spec);
   const r=await ask(context,sent,segs=>{if(sessionGen.current===gen){setLiveSegs(segs);setLive(segs.filter(s=>s.kind==='text').map(s=>s.text).join('\n\n'))}},modelRef.current,m=>{if(sessionGen.current===gen)setLiveModel(m)},ctl.signal,curThinking);
   if(abortRef.current===ctl)abortRef.current=null;
   if(sessionGen.current!==gen){
    if(retrySnapshotRef.current?.gen===gen)retrySnapshotRef.current=null;
    if(r.ok){const prev=chatCache.get(reqKey)??[];const next=[...prev,{role:'model' as const,text:r.text,...(r.think?{think:r.think,secs:r.secs}:{}),...(r.segments.length?{segments:r.segments}:{}),...(r.model?{model:r.model}:{}),...(typeof r.remaining==='number'?{remaining:r.remaining}:{})}];chatCache.set(reqKey,next);saveChat({id:reqChatId,key:reqKey,title:reqKey==='site'?(prev.find(m=>m.role==='user')?.text||reqTitle):reqTitle,msgs:next})}
    break;
   }
   setLive(null);setLiveSegs([]);setLiveModel('');setAnswerAt(-1);
   const now=msgsRef.current;
   if(r.ok){retrySnapshotRef.current=null;setMsgs([...now.slice(0,at),{role:'model',text:r.text,...(r.think?{think:r.think,secs:r.secs}:{}),...(r.segments.length?{segments:r.segments}:{}),...(r.model?{model:r.model}:{}),...(typeof r.remaining==='number'?{remaining:r.remaining}:{})},...now.slice(at)]);if(typeof r.remaining==='number')setLeft(r.remaining)}
   else if(r.aborted){
    const partial=r.partial?.trim()?r.partial:'';
    if(partial){
     retrySnapshotRef.current=null;
     const extra=now.slice(at);
     setMsgs([...now.slice(0,at),{role:'model',text:partial,...(r.think?{think:r.think,secs:r.secs}:{}),...(r.segments?.length?{segments:r.segments}:{}),...(r.model?{model:r.model}:{})},]);
     if(extra.length)restoreDraft(extra);
    }else if(retrySnapshotRef.current?.gen===gen){
     const snap=retrySnapshotRef.current.msgs;retrySnapshotRef.current=null;
     const extra=now.slice(at);
     setMsgs(snap);
     if(extra.length)restoreDraft(extra);
    }else{
     let start=at;while(start>0&&now[start-1].role==='user')start--;
     const failed=now.slice(start);
     setMsgs(now.slice(0,start));
     restoreDraft(failed);
    }
    break;
   }else{
    if(retrySnapshotRef.current?.gen===gen){
     const snap=retrySnapshotRef.current.msgs;retrySnapshotRef.current=null;
     const extra=now.slice(at);
     setError(r.message);setMsgs(snap);
     if(extra.length)restoreDraft(extra);
     break;
    }
    let start=at;while(start>0&&now[start-1].role==='user')start--;const failed=now.slice(start);
    setError(r.message);setMsgs(now.slice(0,start));restoreDraft(failed);break}}}
  finally{if(sessionGen.current===gen)running.current=false}}
 async function addFiles(files:FileList|File[]){const list=[...files].filter(f=>f.type.startsWith('image/'));if(!list.length)return;
  const room=TUTOR_IMAGES.perMessage-images.length;if(room<=0){setError(L(`一次最多附 ${TUTOR_IMAGES.perMessage} 张图片。`,`Up to ${TUTOR_IMAGES.perMessage} images per message.`));return}
  const out=(await Promise.all(list.slice(0,room).map(compress))).filter((x):x is string=>!!x);
  if(out.length<list.slice(0,room).length)setError(L('有图片太大或格式不支持，没有加上。','Some images were too large or unsupported.'));else setError('');
  setImages(v=>[...v,...out].slice(0,TUTOR_IMAGES.perMessage))}
 // 外部请求：打开面板并发出这句话。
 useEffect(()=>{if(!request||request.n===handled.current)return;handled.current=request.n;setOpen(true);void send(request.text)},[request]); // eslint-disable-line react-hooks/exhaustive-deps
 // 在 AI 问答消息区划选文字时弹出「记笔记」悬浮按钮，支持选中任意片段直接记入笔记本。
 useEffect(()=>{
  if(!open||showCfg||showHistory){setSelPop(null);return}
  const update=()=>{
   const el=box.current;
   if(!el){setSelPop(null);return}
   const sel=window.getSelection();
   if(!sel||sel.isCollapsed||sel.rangeCount===0){setSelPop(null);return}
   const text=sel.toString().trim();
   if(text.length<2){setSelPop(null);return}
   const a=sel.anchorNode,f=sel.focusNode;
   if(!a||!f||!el.contains(a)||!el.contains(f)){setSelPop(null);return}
   const rect=sel.getRangeAt(0).getBoundingClientRect();
   if(!rect.width&&!rect.height){setSelPop(null);return}
   const x=Math.min(window.innerWidth-108,Math.max(12,rect.left+rect.width/2-46));
   const y=rect.top>54?rect.top-42:Math.min(window.innerHeight-48,rect.bottom+8);
   setSelPop({text,x,y});
  };
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(update,60)};
  document.addEventListener('selectionchange',schedule);
  window.addEventListener('mouseup',schedule);
  window.addEventListener('touchend',schedule);
  return()=>{
   clearTimeout(timer);
   document.removeEventListener('selectionchange',schedule);
   window.removeEventListener('mouseup',schedule);
   window.removeEventListener('touchend',schedule);
  };
 },[open,showCfg,showHistory]);
 const openSelNote=()=>{
  if(!selPop)return;
  const text=selPop.text;
  const firstLine=text.split('\n').map(l=>l.trim()).find(Boolean)||chatTitle;
  setSelNote(prev=>({n:prev.n+1,title:firstLine.slice(0,56),text}));
  setSelPop(null);
  try{window.getSelection()?.removeAllRanges()}catch{}
 };
 const name=title??L('AI 老师','AI tutor'),lang=locale==='en'?'en':'zh';
 const liveModelLabel=tutorModelBadge(liveModel,lang);
 const liveBubble=<div className="tutor-msg model live">{liveModelLabel&&<div className="tutor-msg-head"><span className="tutor-model-badge"><Bot size={12}/>{liveModelLabel}</span></div>}{liveSegs.length?liveSegs.map((seg,si)=>seg.kind==='think'?<ThinkBox key={si} text={seg.text} live={si===liveSegs.length-1} secs={seg.secs} L={L}/>:<Md key={si} text={seg.text} caret={si===liveSegs.length-1} onApplyPlayground={onApplyPlaygroundCode}/>):<p className="tutor-wait"><Loader2 size={15} className="ai-spin"/>{L('AI 老师正在思考…','Thinking…')}</p>}<div className="tutor-msg-actions"><button type="button" className="tutor-msg-btn stop" onClick={stopAnswering} title={L('停止当前回答','Stop generating')}><Square size={11} fill="currentColor"/><span>{L('停止','Stop')}</span></button></div></div>;
 return <>
  {open&&<aside className={'ai-dock'+(full?' is-full':'')} aria-label={name}>
   <header><Bot size={18}/><strong>{name}</strong>{modelPicker}
    <button type="button" className={'ai-dock-icon'+(showCfg?' active':'')} onClick={()=>setShowCfg(v=>!v)} title={L('AI 模型与 API Key 设置','AI Model & API Key Settings')}><SlidersHorizontal size={15}/></button>
    <button type="button" className={'ai-dock-icon'+(showHistory?' active':'')} onClick={()=>{setShowCfg(false);setShowHistory(v=>!v)}} title={L(`历史对话（${chats.length}）`,`History (${chats.length})`)} aria-label={L('历史对话','History')}><History size={15}/></button>
    <button type="button" className="ai-dock-icon" disabled={busy||(!msgs.length&&!viewing)} onClick={newChat} title={L('新对话（当前对话会留在历史里）','New chat (this one stays in history)')} aria-label={L('新对话','New chat')}><SquarePen size={15}/></button>
    <button type="button" className={'ai-dock-icon ai-dock-full-btn'+(full?' active':'')} onClick={()=>setFull(v=>!v)} title={full?L('还原为侧边栏（Esc）','Restore sidebar (Esc)'):L('全屏放大阅读','Expand to full screen')} aria-label={full?L('还原为侧边栏','Restore sidebar'):L('全屏放大','Full screen')} aria-pressed={full}>{full?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button>
    <button type="button" className="ai-dock-icon" onClick={()=>setOpen(false)} title={L('收起','Close')}><X size={16}/></button></header>
   {showCfg?<div className="ai-dock-log"><AiSettingsPanel onClose={()=>setShowCfg(false)}/></div>
   :showHistory?<div className="ai-dock-log tutor-history">
     <div className="tutor-history-head"><strong>{L('历史对话','History')}</strong></div>
     {!chats.length&&<p className="notice-empty">{L('暂无对话记录','No chats yet')}</p>}
     {chats.map(c=><div key={c.id} className={'tutor-history-item'+(c.id===chatId.current?' on':'')}><button type="button" onClick={()=>openChat(c)}><b>{c.title}</b><small>{c.msgs.find(m=>m.role==='user')?.text.slice(0,60)}</small><time>{new Date(c.at).toLocaleString(locale==='en'?'en':'zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · {L(`${c.msgs.length} 条`,`${c.msgs.length} messages`)}{c.key===sessionKey?L(' · 当前位置',' · here'):''}</time></button>
      <button type="button" className="ai-dock-icon" onClick={()=>{removeChat(c.id);if(c.id===chatId.current)newChat()}} title={L('删除这段对话','Delete')} aria-label={L('删除这段对话','Delete')}><Trash2 size={14}/></button></div>)}
     {chats.length>1&&<button type="button" className="tutor-history-clear" onClick={()=>{if(confirm(L('确定删除全部历史对话吗？删除后不能恢复。','Delete all history? This cannot be undone.'))){clearChats();newChat()}}}>{L('清空全部历史','Clear all history')}</button>}
    </div>:<>
   {!thinkSpec.locked&&<div className="ai-dock-thinkbar" role="group" aria-label={L('AI 思考强度','AI thinking strength')}>
    <span className="ai-think-label"><Brain size={13}/>{L('思考强度','Thinking')}</span>
    <div className="ai-think-seg">
     {thinkSpec.levels.map(lv=>{
      const m=THINKING_META[lv],isDef=lv===thinkSpec.defaultLevel;
      return (
       <button key={lv} type="button" className={thinking===lv?'on':''} aria-pressed={thinking===lv}
        title={L(m.hintZh,m.hintEn)+(isDef?L('（该模型默认挡位）',' (model default)'):'')}
        onClick={()=>setThinking(lv)}>
        <span>{L(m.shortZh,m.shortEn)}</span>
        {isDef&&<em className="ai-think-def">{L('默认','def')}</em>}
       </button>
      );
     })}
    </div>
   </div>}
   <div className="ai-dock-log" ref={box} onScroll={()=>{onScroll();if(selPop)setSelPop(null)}}>
    {viewing&&<div className="tutor-viewing"><span>{L(`历史对话 · ${viewing.title}`,`History · ${viewing.title}`)}</span><button type="button" onClick={()=>adoptChat(viewing)}>{L("接着这段继续问","Continue this chat")}</button><button type="button" onClick={()=>setViewing(null)}>{L("回到当前对话","Back")}</button></div>}
    {!shown.length&&!busy&&<div className="ai-dock-hello"><p>{hello??L('哪里没看懂都可以问我，我会结合你正在看的内容讲。也可以发截图给我看。点下面的问题也行：','Ask me anything about what you are looking at — screenshots welcome — or tap a question below:')}</p>
     <div className="ai-dock-prompts">{prompts.map(p=><button key={p} type="button" onClick={()=>send(p)}>{p}</button>)}</div></div>}
    {shown.map((m,i)=>{const modelLabel=m.role==='model'?tutorModelBadge(m.model,lang):'';let prevQ='';if(m.role==='model'){for(let k=i-1;k>=0;k--){if(shown[k]?.role==='user'&&shown[k].text.trim()){prevQ=shown[k].text.trim();break}}}const noteTitle=(prevQ||chatTitle).slice(0,56);const noteQOnly=`### ${prevQ||chatTitle}`;const noteQAndA=[`### ${prevQ||chatTitle}`,`**${L('AI 老师解答','AI Tutor Answer')}**：\n\n${m.text}`].join('\n\n');return <Fragment key={i}>{busy&&i===answerAt&&liveBubble}<div className={'tutor-msg '+m.role+(busy&&answerAt>=0&&i>=answerAt?' queued':'')}>
     {modelLabel&&<div className="tutor-msg-head"><span className="tutor-model-badge"><Bot size={12}/>{modelLabel}</span></div>}
     {m.images?.length?<div className="tutor-imgs">{m.images.map((u,j)=><img key={j} src={u} alt={L('附图','Attached image')} onClick={e=>e.currentTarget.classList.toggle('big')}/>)}</div>:null}
     {m.role==='model'?(m.segments?.length?m.segments.map((seg,si)=>seg.kind==='think'?<ThinkBox key={si} text={seg.text} secs={seg.secs} L={L}/>:<Md key={si} text={seg.text} onApplyPlayground={onApplyPlaygroundCode}/>):<>{m.think&&<ThinkBox text={m.think} secs={m.secs} L={L}/>}<Md text={m.text} onApplyPlayground={onApplyPlaygroundCode}/></>):m.text&&<p>{m.text}</p>}
     {m.role==='model'&&m.text&&<div className="tutor-msg-actions">
      <button type="button" className={'tutor-msg-btn'+(copiedAt===i?' copied':'')} onClick={()=>void copyMsg(i,m.text)} title={L('复制这段回答','Copy this response')}>{copiedAt===i?<><Check size={12}/><span>{L('已复制','Copied')}</span></>:<><Copy size={12}/><span>{L('复制','Copy')}</span></>}</button>
      {!viewing&&i>0&&shown[i-1]?.role==='user'&&<button type="button" className="tutor-msg-btn" disabled={busy} onClick={()=>retryAt(i)} title={L('用当前所选模型重新生成这段回答','Retry this response with the selected model')}><RotateCcw size={12}/><span>{L('重试','Retry')}</span></button>}
      <AddToNoteButton compact title={noteTitle} questionOnly={noteQOnly} questionAndAnswer={noteQAndA} modeLabels={[[L('仅添加提问','Question only'),L('只保存这段提问','Save only the prompt')],[L('提问 + AI 回答','Q & AI Answer'),L('保存提问与 AI 回答到笔记本','Save question & AI reply')]]} source={{kind:'learn',label:`${L('AI 问答','AI Q&A')} · ${chatTitle.slice(0,24)}`,href:noteBackHref||''}} onBeforeNavigate={onBeforeNoteLeave}/>
      {typeof m.remaining==='number'&&<span className="tutor-msg-rem">{L(`今日还剩 ${m.remaining} 次`,`${m.remaining} left today`)}</span>}
     </div>}
     {busy&&answerAt>=0&&i>=answerAt&&<small className="tutor-queued">{L('等上一条回复完接着回答','Queued')}</small>}</div></Fragment>})}
    {busy&&answerAt>=msgs.length&&liveBubble}
   </div>
   {error&&<p className="ai-grade-error">{error}</p>}
   {msgs.length>0&&!busy&&!viewing&&<div className={'ai-dock-prompts compact'+(hidePrompts?' folded':'')}><button type="button" className="ai-dock-prompts-label" aria-expanded={!hidePrompts} onClick={togglePrompts} title={hidePrompts?L('展开快捷提问','Show quick questions'):L('收起快捷提问','Hide quick questions')}>{L('接着问','Ask next')}{hidePrompts?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>{!hidePrompts&&prompts.slice(0,3).map(p=><button key={p} type="button" onClick={()=>send(p)}>{p}</button>)}</div>}
   {images.length>0&&<div className="tutor-attach">{images.map((u,i)=><span key={i}><img src={u} alt=""/><button type="button" onClick={()=>setImages(v=>v.filter((_,j)=>j!==i))} aria-label={L('移除图片','Remove image')}><X size={12}/></button></span>)}</div>}
   <form className="tutor-input" hidden={!!viewing} onSubmit={e=>{e.preventDefault();send(input,images)}}>
    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>{if(e.target.files)void addFiles(e.target.files);e.target.value=''}}/>
    <button type="button" className="tutor-attach-btn" onClick={()=>fileRef.current?.click()} disabled={images.length>=TUTOR_IMAGES.perMessage} title={L('附图片（也可以直接粘贴截图）','Attach image (or paste a screenshot)')} aria-label={L('附图片','Attach image')}><ImagePlus size={17}/></button>
    <VoiceButton className="tutor-voice" onText={t=>{setInput(v=>v.trim()?v.replace(/\s+$/,'')+' '+t:t);inputRef.current?.focus()}}/>
    <textarea ref={el=>{inputRef.current=el;markdownEditing(el)}} value={input} rows={1} placeholder={busy?L('回复中也可以继续发…','Keep typing while it replies…'):L('输入问题，可粘贴截图','Ask, or paste a screenshot')} title={L('Enter 发送，Shift+Enter 换行','Enter to send, Shift+Enter for a new line')}
     onChange={e=>setInput(e.target.value)} onPaste={e=>{const files=[...e.clipboardData.files];if(files.some(f=>f.type.startsWith('image/'))){e.preventDefault();void addFiles(files)}}}
     onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send(input,images)}}}/>
    {busy&&<button type="button" className="button tutor-stop" onClick={stopAnswering} title={L('停止当前回答','Stop generating')} aria-label={L('停止回答','Stop generating')}><Square size={14} fill="currentColor"/></button>}
    {(!busy||input.trim()||images.length>0)&&<button className="button primary tutor-send" disabled={!input.trim()&&!images.length} aria-label={L('发送','Send')}><Send size={15}/></button>}</form>
   {left!==null&&!isUsingLocalTutor&&<p className="tutor-left">{L(`今天还可以问 ${left} 次`,`${left} messages left today`)}</p>}
   </>}
  </aside>}
  {selPop&&typeof document!=='undefined'&&createPortal(
   <button type="button" className="tutor-sel-pill" style={{left:selPop.x,top:selPop.y}} onMouseDown={e=>e.preventDefault()} onClick={openSelNote}>
    <BookPlus size={14}/><span>{L('记笔记','Note')}</span>
   </button>,
   document.body,
  )}
  <AddToNoteButton
   hideTrigger
   trigger={selNote.n}
   title={selNote.title||chatTitle}
   questionOnly={selNote.text}
   questionAndAnswer={selNote.text}
   defaultMode="question-only"
   source={{kind:'learn',label:`${L('AI 问答','AI Q&A')} · ${chatTitle.slice(0,24)}`,href:noteBackHref||''}}
   onBeforeNavigate={onBeforeNoteLeave}
  />
 </>}

