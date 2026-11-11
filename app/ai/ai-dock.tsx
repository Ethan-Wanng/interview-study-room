'use client';
import {Fragment,useEffect,useRef,useState,useSyncExternalStore,type PointerEvent as ReactPointerEvent} from 'react';
import {Bot,Brain,ChevronDown,ChevronUp,GripVertical,History,ImagePlus,Loader2,Send,SlidersHorizontal,SquarePen,Trash2,X} from 'lucide-react';
import {clearChats,latestChat,loadChats,newChatId,onChatsChange,removeChat,saveChat,type SavedChat} from './tutor-history';
import {useI18n} from '../components/i18n';
import VoiceButton from '../components/voice-input';
import {DEFAULT_TUTOR_MODEL,TUTOR_IMAGES,TUTOR_MODELS,type TutorContext,type TutorEvent,type TutorMessage} from '@/lib/tutor-types';

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

const KEEP=28,MODEL_KEY='ai-tutor-model';
// 在同一道题（或同一张卡片）下保留临时对话，即使答题状态从“提示”切到“解析”或返回上一题也不丢失。
const chatCache=new Map<string,TutorMessage[]>();
let savedPos:{right:number;bottom:number}|null=null;

// 页面上有几个“卡片 / 题目旁边的 AI 老师”：有的话全站的 AI 老师就不显示，避免同时出现两个按钮。考试时也用它把全站 AI 老师藏起来。
let docks=0;const dockListeners=new Set<()=>void>();
const dockSubscribe=(l:()=>void)=>{dockListeners.add(l);return()=>{dockListeners.delete(l)}};
export function useDockPresence(active=true){useEffect(()=>{if(!active)return;docks++;dockListeners.forEach(l=>l());return()=>{docks--;dockListeners.forEach(l=>l())}},[active])}
export const useOtherDocks=()=>useSyncExternalStore(dockSubscribe,()=>docks>0,()=>false);

// 很小的 Markdown 显示：``` 代码块、`行内代码`、**加粗**、[文字](/站内链接)，其余按原样换行。AI 老师的回复只用到这些。
// 链接只认站内地址（以 / 开头），AI 给出的外部网址按普通文字显示。
const linkRe=/\[([^\]\n]+)\]\((\/[^)\s]*)\)/;
function inline(s:string){return s.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(\/[^)\s]*\))/g).map((p,i)=>{const link=p.match(linkRe);
 return p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>:p.startsWith('**')&&p.endsWith('**')&&p.length>4?<b key={i}>{p.slice(2,-2)}</b>:link&&link[0]===p?<a key={i} className="tutor-link" href={link[2]}>{link[1]}</a>:<Fragment key={i}>{p}</Fragment>})}

// 思考过程只挑关键步骤显示：每一段取第一句，最多 6 条（太多时均匀抽取，保留第一条和最后一条），每条最多 90 个字。
function keySteps(think:string):string[]{
 let parts=think.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(parts.length<3)parts=think.split(/(?<=[。！？!?；;]|\.\s)/).map(s=>s.trim()).filter(s=>s.length>3);
 const first=parts.map(p=>{const m=p.replace(/^[-*#\d.、\s]+/,'').match(/^.+?[。！？!?；;]|^.+?\.(?=\s|$)/);const s=(m?m[0]:p).trim();return s.length>90?s.slice(0,90)+'…':s}).filter(Boolean);
 if(first.length<=6)return first;
 return Array.from({length:6},(_,i)=>first[Math.round(i*(first.length-1)/5)])}
// 思考过程的小框：思考中只显示最新的几行（固定高度，不会把对话顶走）；写完后默认收起，展开只列关键步骤。
function ThinkBox({text,live,secs,L}:{text:string;live?:boolean;secs?:number;L:(zh:string,en:string)=>string}){const tail=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=tail.current;if(el)el.scrollTop=el.scrollHeight},[text]);
 if(live)return <div className="tutor-think live"><span className="tutor-think-head"><Brain size={14}/>{L('正在思考…','Thinking…')}</span><div className="tutor-think-tail" ref={tail}>{text.slice(-400)}</div></div>;
 const steps=keySteps(text);if(!steps.length)return null;
 return <ThinkDone text={text} steps={steps} secs={secs} L={L}/>}
// 写完后的思考过程：默认收起；展开先列关键步骤，点“看全部思考过程”可以看完整内容（框高度有上限，多了在框里滚动）。
function ThinkDone({text,steps,secs,L}:{text:string;steps:string[];secs?:number;L:(zh:string,en:string)=>string}){const [full,setFull]=useState(false);
 return <details className="tutor-think"><summary><Brain size={14}/>{secs?L(`思考了 ${secs} 秒 · 看关键步骤`,`Thought for ${secs}s · key steps`):L('思考过程 · 看关键步骤','Thinking · key steps')}</summary>{full?<div className="tutor-think-full">{text}</div>:<ol>{steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}
  <button type="button" className="tutor-think-more" onClick={()=>setFull(v=>!v)}>{full?L('只看关键步骤','Key steps only'):L(`看全部思考过程（${text.length} 字）`,`Show the full thinking (${text.length} chars)`)}</button></details>}
function Md({text,caret}:{text:string;caret?:boolean}){const parts=text.split(/```[^\n]*\n?/),last=parts.length-1;
 return <>{parts.map((p,i)=>i%2?<pre key={i}><code>{p.replace(/\n$/,'')}{caret&&i===last&&<span className="ai-caret"/>}</code></pre>
  :p.trim()||caret&&i===last?<p key={i}>{inline(p.trim())}{caret&&i===last&&<span className="ai-caret"/>}</p>:null)}</>}

// 读 /api/tutor 的流：边收边按打字节奏显示（至少每秒约 60 个字，最多落后约 3 秒），写完返回整段回复。
async function ask(context:TutorContext,messages:TutorMessage[],onLive:(t:string)=>void,model:string,onThink:(t:string)=>void):Promise<{ok:true;text:string;think:string;secs:number;remaining:number}|{ok:false;message:string}>{
 const NET='网络连接失败，这次没有扣次数，请重试。';let res:Response;
 try{res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,messages,model})})}catch{return {ok:false,message:NET}}
 if(!(res.headers.get('content-type')??'').includes('ndjson')){try{const j=await res.json() as {message?:string};return {ok:false,message:j.message??NET}}catch{return {ok:false,message:NET}}}
 let got='',shown=0,done:{remaining:number}|null=null,err='',think='',secs=0;const began=Date.now();
 const tick=setInterval(()=>{if(shown>=got.length)return;shown=Math.min(got.length,shown+Math.max(3,Math.ceil((got.length-shown)/60)));onLive(got.slice(0,shown))},50);
 try{const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const {done:end,value}=await reader.read();if(end)break;buf+=dec.decode(value,{stream:true});let i;
   while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;const e=JSON.parse(line) as TutorEvent;
    if(e.t==='delta'){if(!got&&think)secs=Math.max(1,Math.round((Date.now()-began)/1000));got+=e.text}else if(e.t==='think'){think+=e.text;onThink(think)}else if(e.t==='reset'){got='';shown=0;think='';secs=0;onLive('');onThink('')}else if(e.t==='done')done={remaining:e.remaining};else if(e.t==='error')err=e.message}}}
 catch{err||=NET}
 if(done&&!err)while(shown<got.length)await new Promise(r=>setTimeout(r,60));
 clearInterval(tick);return done&&!err?{ok:true,text:got,think,secs,remaining:done.remaining}:{ok:false,message:err||NET}}

// 外部按钮让面板打开并直接发出一句话（比如“给我一点提示”）：每次 n 变化就执行一次。
export type DockRequest={text:string;n:number};

const clampPos=(right:number,bottom:number,el:HTMLElement|null)=>{
 if(typeof window==='undefined')return {right,bottom};
 const w=el?.offsetWidth??120,h=el?.offsetHeight??48;
 return {
  right:Math.max(8,Math.min(window.innerWidth-w-8,right)),
  bottom:Math.max(8,Math.min(window.innerHeight-h-8,bottom)),
 };
};

// 常驻的 AI 老师：右下角一个“问 AI”按钮（可拖动），点开是对话面板（顶栏也可拖动），在同一道题下保留临时对话。
// site：全站的 AI 老师（挂在 layout 里）；其余是卡片、题目旁边的 AI 老师，挂上时会让全站的那个让位。hello：没有对话时的开场白。
export default function AiDock({context,prompts,request,title,chatKey,site,hello}:{context:TutorContext;prompts:string[];request?:DockRequest;title?:string;chatKey?:string;site?:boolean;hello?:string}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 useDockPresence(!site);
 const sessionKey=chatKey??('quiz' in context?'quiz:'+context.quiz.q:'lesson' in context?'lesson:'+context.lesson.title:'site');
 const [liveThink,setLiveThink]=useState('');
 const [open,setOpen]=useState(false),[showCfg,setShowCfg]=useState(false),[msgs,setMsgsState]=useState<TutorMessage[]>(()=>chatCache.get(sessionKey)??[]),[live,setLive]=useState<string|null>(null),[input,setInput]=useState(''),[error,setError]=useState(''),[left,setLeft]=useState<number|null>(null);
 const {status:aiStatus}=useAiConfigStatus();
 const hasCustom=!aiStatus?.isGuest&&!!aiStatus?.settings?.enabled&&!!aiStatus?.settings?.hasKey,customBadge=hasCustom?providerMeta(aiStatus!.settings!.provider).badge:'';
 // 选模型：默认（开了专属 API 用专属的，否则 DeepSeek V4.1 Flash）、站点提供的几个模型、自己的专属 API。选择记在浏览器里。
 const [model,setModelState]=useState<string>(()=>{try{const v=localStorage.getItem(MODEL_KEY)||'auto';return v==='auto'||v==='custom'||TUTOR_MODELS.some(m=>m.id===v)?v:'auto'}catch{return 'auto'}}),modelRef=useRef(model); // 以前存的旧模型名（deepseek-chat 等）已经没有了，回到默认
 const setModel=(v:string)=>{modelRef.current=v;setModelState(v);try{localStorage.setItem(MODEL_KEY,v)}catch{}};
 useEffect(()=>{if(model==='custom'&&aiStatus&&!hasCustom)setModel('auto')},[aiStatus,hasCustom]); // eslint-disable-line react-hooks/exhaustive-deps
 const modelPicker=<select className="ai-dock-model" value={model} onChange={e=>setModel(e.target.value)} title={L('选择 AI 模型','Choose the AI model')} aria-label={L('选择 AI 模型','Choose the AI model')}>
  <option value="auto">{hasCustom?L(`默认（我的 ${customBadge}）`,`Default (my ${customBadge})`):L(`默认（${DEFAULT_TUTOR_MODEL.label[0]}）`,`Default (${DEFAULT_TUTOR_MODEL.label[1]})`)}</option>
  {TUTOR_MODELS.map(m=><option key={m.id} value={m.id} title={L(m.note[0],m.note[1])}>{L(m.label[0],m.label[1])}{m.vision?L(' · 识图',' · images'):''}</option>)}
  {hasCustom&&<option value="custom">{L(`我的 API：${customBadge}`,`My API: ${customBadge}`)}</option>}</select>;
 const [pos,setPos]=useState<{right:number;bottom:number}|null>(()=>savedPos),[dragging,setDragging]=useState(false);
 const box=useRef<HTMLDivElement>(null),hostRef=useRef<HTMLElement|null>(null),busy=live!==null,handled=useRef(request?.n??0);
 const dragRef=useRef<{id:number;x:number;y:number;r:number;b:number;moved:boolean}|null>(null),justDragged=useRef(false);
 // images：输入框里待发送的图片；answerAt：AI 正在回复的位置（回复插在这条之后，回复期间新发的消息排在后面）。
 const [images,setImages]=useState<string[]>([]),[answerAt,setAnswerAt]=useState(-1),fileRef=useRef<HTMLInputElement>(null),inputRef=useRef<HTMLTextAreaElement>(null);
 const msgsRef=useRef(msgs),running=useRef(false),stick=useRef(true);
 // 对话记录：每段对话有一个 id，写一条就存一次（浏览器里，并同步到账号）。回到同一张卡片、同一道题时接着上次的聊；点“新对话”换一个 id，旧的留在历史里。
 const chatTitle='quiz' in context?context.quiz.q:'lesson' in context?context.lesson.title:L('全站提问','Site-wide chat');
 const chatId=useRef(''),[showHistory,setShowHistory]=useState(false),[chats,setChats]=useState<SavedChat[]>([]),[viewing,setViewing]=useState<SavedChat|null>(null);
 const setMsgs=(next:TutorMessage[])=>{msgsRef.current=next;setMsgsState(next);if(next.length)chatCache.set(sessionKey,next);else chatCache.delete(sessionKey);
  if(next.length&&!chatId.current)chatId.current=newChatId(sessionKey);
  if(chatId.current)saveChat({id:chatId.current,key:sessionKey,title:sessionKey==='site'?(next.find(m=>m.role==='user')?.text||chatTitle):chatTitle,msgs:next})};
 useEffect(()=>{const saved=latestChat(sessionKey),m=chatCache.get(sessionKey)??saved?.msgs??[];chatId.current=saved?.id??'';msgsRef.current=m;setMsgsState(m);setError('');setViewing(null)},[sessionKey]);
 useEffect(()=>{const sync=()=>setChats(loadChats());sync();return onChatsChange(sync)},[]);
 const newChat=()=>{chatId.current='';chatCache.delete(sessionKey);msgsRef.current=[];setMsgsState([]);setError('');setViewing(null);setShowHistory(false)};
 // 打开一段历史对话：就是这里的对话就直接接着聊；别处的对话先只读查看，可以选择“接着这段继续问”（之后的提问按当前页面的内容回答）。
 const openChat=(c:SavedChat)=>{setShowHistory(false);if(c.key===sessionKey){chatId.current=c.id;chatCache.set(sessionKey,c.msgs);msgsRef.current=c.msgs;setMsgsState(c.msgs);setViewing(null)}else setViewing(c)};
 const adoptChat=(c:SavedChat)=>{chatId.current='';setViewing(null);setMsgs(c.msgs)};
 const shown=viewing?viewing.msgs:msgs;
 // 对话下方的快捷提问可以收起，只留一行“接着问”；收起与否记在浏览器里。
 const [hidePrompts,setHidePrompts]=useState(false);
 useEffect(()=>{try{setHidePrompts(localStorage.getItem('ai-tutor-prompts-hidden')==='1')}catch{}},[]);
 const togglePrompts=()=>setHidePrompts(v=>{try{localStorage.setItem('ai-tutor-prompts-hidden',v?'0':'1')}catch{}return !v});
 // 打开时并排停靠：给 body 加 ai-docked，样式据此让页面（包括放大阅读层）给面板让出位置；电脑上面板是右侧一栏，手机上是底部半屏抽屉。
 useEffect(()=>{if(!open)return;document.body.classList.add('ai-docked');return()=>document.body.classList.remove('ai-docked')},[open]);
 // 只有停在底部时才跟着新内容滚到底；往上翻看时不打扰，翻回底部后继续跟随。
 useEffect(()=>{const el=box.current;if(el&&stick.current)el.scrollTop=el.scrollHeight},[msgs,live,open]);
 useEffect(()=>{if(open)stick.current=true},[open]);
 const onScroll=()=>{const el=box.current;if(el)stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<40};
 // 输入框随内容长高（最多约 6 行），空着或只有一行时和发送按钮一样高。
 useEffect(()=>{const el=inputRef.current;if(!el)return;el.style.height='';if(!input||el.scrollHeight<=el.clientHeight+2)return;el.style.height=Math.min(el.scrollHeight+2,160)+'px'},[input,open,showCfg]);
 useEffect(()=>{if(!pos||!hostRef.current)return;const next=clampPos(pos.right,pos.bottom,hostRef.current);if(next.right!==pos.right||next.bottom!==pos.bottom){savedPos=next;setPos(next)}},[open,pos]);
 const onPointerDown=(e:ReactPointerEvent<HTMLElement>)=>{
  if(e.button!==0&&(e.pointerType==='mouse'))return;
  if((e.target as HTMLElement).closest('button.ai-dock-icon,select'))return;
  const el=hostRef.current;if(!el)return;
  const rect=el.getBoundingClientRect();
  const r=pos?.right??Math.max(8,window.innerWidth-rect.right);
  const b=pos?.bottom??Math.max(8,window.innerHeight-rect.bottom);
  dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,r,b,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onPointerMove=(e:ReactPointerEvent<HTMLElement>)=>{
  const d=dragRef.current;if(!d||d.id!==e.pointerId)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.moved&&Math.hypot(dx,dy)<5)return;
  if(!d.moved){d.moved=true;setDragging(true)}
  const next=clampPos(d.r-dx,d.b-dy,hostRef.current);
  savedPos=next;setPos(next);
 };
 const onPointerEnd=(e:ReactPointerEvent<HTMLElement>)=>{
  const d=dragRef.current;if(!d||d.id!==e.pointerId)return;
  if(d.moved){justDragged.current=true;setTimeout(()=>{justDragged.current=false},80)}
  dragRef.current=null;setDragging(false);
  try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}
 };
 // 发消息：AI 正在回复时也可以继续发，新消息先排队，等这条回复写完再一起问。
 function send(text:string,imgs:string[]=[]){const t=text.trim();if(!t&&!imgs.length)return;
  setMsgs([...msgsRef.current,{role:'user',text:t,...(imgs.length?{images:imgs}:{})}]);setInput('');setImages([]);setError('');stick.current=true;void pump()}
 // 依次回答末尾还没回复的学习者消息。
 async function pump(){if(running.current)return;running.current=true;
  try{for(;;){const all=msgsRef.current;if(!all.length||all[all.length-1].role!=='user')break;
   const at=all.length;let sent=prepare(all).slice(-KEEP);while(sent[0]?.role!=='user')sent=sent.slice(1); // 对话太长时只带最近的部分，第一条必须是学习者发的
   setAnswerAt(at);setLive('');setLiveThink('');const r=await ask(context,sent,setLive,modelRef.current,setLiveThink);setLive(null);setLiveThink('');setAnswerAt(-1);
   const now=msgsRef.current;
   if(r.ok){setMsgs([...now.slice(0,at),{role:'model',text:r.text,...(r.think?{think:r.think,secs:r.secs}:{})},...now.slice(at)]);setLeft(r.remaining)}
   else{let start=at;while(start>0&&now[start-1].role==='user')start--;const failed=now.slice(start);
    setError(r.message);setMsgs(now.slice(0,start));setInput(failed.map(m=>m.text).filter(Boolean).join('\n\n'));setImages(failed.flatMap(m=>m.images??[]).slice(0,TUTOR_IMAGES.perMessage));break}}}
  finally{running.current=false}}
 async function addFiles(files:FileList|File[]){const list=[...files].filter(f=>f.type.startsWith('image/'));if(!list.length)return;
  const room=TUTOR_IMAGES.perMessage-images.length;if(room<=0){setError(L(`一次最多附 ${TUTOR_IMAGES.perMessage} 张图片。`,`Up to ${TUTOR_IMAGES.perMessage} images per message.`));return}
  const out=(await Promise.all(list.slice(0,room).map(compress))).filter((x):x is string=>!!x);
  if(out.length<list.slice(0,room).length)setError(L('有图片太大或格式不支持，没有加上。','Some images were too large or unsupported.'));else setError('');
  setImages(v=>[...v,...out].slice(0,TUTOR_IMAGES.perMessage))}
 // 外部请求：打开面板并发出这句话。
 useEffect(()=>{if(!request||request.n===handled.current)return;handled.current=request.n;setOpen(true);void send(request.text)},[request]); // eslint-disable-line react-hooks/exhaustive-deps
 const name=title??L('AI 老师','AI tutor');
 const liveBubble=<div className="tutor-msg model live">{liveThink&&<ThinkBox text={liveThink} live={!live} L={L}/>}{live?<Md text={live} caret/>:!liveThink&&<p className="tutor-wait"><Loader2 size={15} className="ai-spin"/>{L('AI 老师正在思考…','Thinking…')}</p>}</div>;
 const style=pos?{right:`${pos.right}px`,bottom:`${pos.bottom}px`}:undefined;
 return <>
  {!open&&<button ref={el=>{hostRef.current=el}} type="button" style={style} className={'ai-dock-fab'+(dragging?' dragging':'')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onClick={e=>{if(justDragged.current){e.preventDefault();return}setOpen(true)}} title={L('点击提问，按住可拖动位置','Click to ask, drag to move')} aria-label={L('问 AI 老师','Ask the AI tutor')}><GripVertical size={14} className="ai-dock-grip"/><Bot size={20}/><span>{L('问 AI','Ask AI')}{msgs.length>0&&<em className="ai-dock-badge">{Math.ceil(msgs.length/2)}</em>}</span></button>}
  {open&&<aside className="ai-dock" aria-label={name}>
   <header><Bot size={18}/><strong>{name}</strong>{modelPicker}
    <button type="button" className={'ai-dock-icon'+(showCfg?' active':'')} onClick={()=>setShowCfg(v=>!v)} title={L('AI 模型与 API Key 设置','AI Model & API Key Settings')}><SlidersHorizontal size={15}/></button>
    <button type="button" className={'ai-dock-icon'+(showHistory?' active':'')} onClick={()=>{setShowCfg(false);setShowHistory(v=>!v)}} title={L(`历史对话（${chats.length}）`,`History (${chats.length})`)} aria-label={L('历史对话','History')}><History size={15}/></button>
    <button type="button" className="ai-dock-icon" disabled={busy||(!msgs.length&&!viewing)} onClick={newChat} title={L('新对话（当前对话会留在历史里）','New chat (this one stays in history)')} aria-label={L('新对话','New chat')}><SquarePen size={15}/></button>
    <button type="button" className="ai-dock-icon" onClick={()=>setOpen(false)} title={L('收起','Close')}><X size={16}/></button></header>
   {showCfg?<div className="ai-dock-log"><AiSettingsPanel onClose={()=>setShowCfg(false)}/></div>
   :showHistory?<div className="ai-dock-log tutor-history">
     <div className="tutor-history-head"><strong>{L('历史对话','History')}</strong><small>{L('保存在你的账号下，换设备登录也能看到；图片不保存。','Saved to your account; images are not kept.')}</small></div>
     {!chats.length&&<p className="notice-empty">{L('还没有对话记录。问过的问题会自动保存在这里。','No chats yet. Your questions are saved here automatically.')}</p>}
     {chats.map(c=><div key={c.id} className={'tutor-history-item'+(c.id===chatId.current?' on':'')}><button type="button" onClick={()=>openChat(c)}><b>{c.title}</b><small>{c.msgs.find(m=>m.role==='user')?.text.slice(0,60)}</small><time>{new Date(c.at).toLocaleString(locale==='en'?'en':'zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · {L(`${c.msgs.length} 条`,`${c.msgs.length} messages`)}{c.key===sessionKey?L(' · 当前位置',' · here'):''}</time></button>
      <button type="button" className="ai-dock-icon" onClick={()=>{removeChat(c.id);if(c.id===chatId.current)newChat()}} title={L('删除这段对话','Delete')} aria-label={L('删除这段对话','Delete')}><Trash2 size={14}/></button></div>)}
     {chats.length>1&&<button type="button" className="tutor-history-clear" onClick={()=>{if(confirm(L('确定删除全部历史对话吗？删除后不能恢复。','Delete all history? This cannot be undone.'))){clearChats();newChat()}}}>{L('清空全部历史','Clear all history')}</button>}
    </div>:<>
   <div className="ai-dock-log" ref={box} onScroll={onScroll}>
    {viewing&&<div className="tutor-viewing"><span>{L(`历史对话 · ${viewing.title}`,`History · ${viewing.title}`)}</span><button type="button" onClick={()=>adoptChat(viewing)}>{L("接着这段继续问","Continue this chat")}</button><button type="button" onClick={()=>setViewing(null)}>{L("回到当前对话","Back")}</button></div>}
    {!shown.length&&!busy&&<div className="ai-dock-hello"><p>{hello??L('哪里没看懂都可以问我，我会结合你正在看的内容讲。也可以发截图给我看。点下面的问题也行：','Ask me anything about what you are looking at — screenshots welcome — or tap a question below:')}</p>
     <div className="ai-dock-prompts">{prompts.map(p=><button key={p} type="button" onClick={()=>send(p)}>{p}</button>)}</div></div>}
    {shown.map((m,i)=><Fragment key={i}>{busy&&i===answerAt&&liveBubble}<div className={'tutor-msg '+m.role+(busy&&answerAt>=0&&i>=answerAt?' queued':'')}>
     {m.images?.length?<div className="tutor-imgs">{m.images.map((u,j)=><img key={j} src={u} alt={L('附图','Attached image')} onClick={e=>e.currentTarget.classList.toggle('big')}/>)}</div>:null}
     {m.role==='model'&&m.think&&<ThinkBox text={m.think} secs={m.secs} L={L}/>}{m.role==='model'?<Md text={m.text}/>:m.text&&<p>{m.text}</p>}{busy&&answerAt>=0&&i>=answerAt&&<small className="tutor-queued">{L('等上一条回复完接着回答','Queued')}</small>}</div></Fragment>)}
    {busy&&answerAt>=msgs.length&&liveBubble}
   </div>
   {error&&<p className="ai-grade-error">{error}</p>}
   {msgs.length>0&&!busy&&!viewing&&<div className={'ai-dock-prompts compact'+(hidePrompts?' folded':'')}><button type="button" className="ai-dock-prompts-label" aria-expanded={!hidePrompts} onClick={togglePrompts} title={hidePrompts?L('展开快捷提问','Show quick questions'):L('收起快捷提问','Hide quick questions')}>{L('接着问','Ask next')}{hidePrompts?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>{!hidePrompts&&prompts.slice(0,3).map(p=><button key={p} type="button" onClick={()=>send(p)}>{p}</button>)}</div>}
   {images.length>0&&<div className="tutor-attach">{images.map((u,i)=><span key={i}><img src={u} alt=""/><button type="button" onClick={()=>setImages(v=>v.filter((_,j)=>j!==i))} aria-label={L('移除图片','Remove image')}><X size={12}/></button></span>)}</div>}
   <form className="tutor-input" hidden={!!viewing} onSubmit={e=>{e.preventDefault();send(input,images)}}>
    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>{if(e.target.files)void addFiles(e.target.files);e.target.value=''}}/>
    <button type="button" className="tutor-attach-btn" onClick={()=>fileRef.current?.click()} disabled={images.length>=TUTOR_IMAGES.perMessage} title={L('附图片（也可以直接粘贴截图）','Attach image (or paste a screenshot)')} aria-label={L('附图片','Attach image')}><ImagePlus size={17}/></button>
    <VoiceButton className="tutor-voice" onText={t=>{setInput(v=>v.trim()?v.replace(/\s+$/,'')+' '+t:t);inputRef.current?.focus()}}/>
    <textarea ref={inputRef} value={input} rows={1} placeholder={busy?L('回复中也可以继续发…','Keep typing while it replies…'):L('输入问题，可粘贴截图','Ask, or paste a screenshot')} title={L('Enter 发送，Shift+Enter 换行','Enter to send, Shift+Enter for a new line')}
     onChange={e=>setInput(e.target.value)} onPaste={e=>{const files=[...e.clipboardData.files];if(files.some(f=>f.type.startsWith('image/'))){e.preventDefault();void addFiles(files)}}}
     onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send(input,images)}}}/>
    <button className="button primary tutor-send" disabled={!input.trim()&&!images.length} aria-label={L('发送','Send')}><Send size={15}/></button></form>
   {left!==null&&<p className="tutor-left">{L(`今天还可以问 ${left} 次`,`${left} messages left today`)}</p>}
   </>}
  </aside>}
 </>}

