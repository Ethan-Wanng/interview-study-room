'use client';
import {Fragment,useEffect,useRef,useState} from 'react';
import {Bot,Loader2,RotateCcw,Send,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import type {TutorContext,TutorEvent,TutorMessage} from '@/lib/tutor-types';

const KEEP=28;

// 很小的 Markdown 显示：``` 代码块、`行内代码`、**加粗**，其余按原样换行。AI 老师的回复只用到这些。
function inline(s:string){return s.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((p,i)=>p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>:p.startsWith('**')&&p.endsWith('**')&&p.length>4?<b key={i}>{p.slice(2,-2)}</b>:<Fragment key={i}>{p}</Fragment>)}
function Md({text,caret}:{text:string;caret?:boolean}){const parts=text.split(/```[^\n]*\n?/),last=parts.length-1;
 return <>{parts.map((p,i)=>i%2?<pre key={i}><code>{p.replace(/\n$/,'')}{caret&&i===last&&<span className="ai-caret"/>}</code></pre>
  :p.trim()||caret&&i===last?<p key={i}>{inline(p.trim())}{caret&&i===last&&<span className="ai-caret"/>}</p>:null)}</>}

// 读 /api/tutor 的流：边收边按打字节奏显示（至少每秒约 60 个字，最多落后约 3 秒），写完返回整段回复。
async function ask(context:TutorContext,messages:TutorMessage[],onLive:(t:string)=>void):Promise<{ok:true;text:string;remaining:number}|{ok:false;message:string}>{
 const NET='网络连接失败，这次没有扣次数，请重试。';let res:Response;
 try{res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,messages})})}catch{return {ok:false,message:NET}}
 if(!(res.headers.get('content-type')??'').includes('ndjson')){try{const j=await res.json() as {message?:string};return {ok:false,message:j.message??NET}}catch{return {ok:false,message:NET}}}
 let got='',shown=0,done:{remaining:number}|null=null,err='';
 const tick=setInterval(()=>{if(shown>=got.length)return;shown=Math.min(got.length,shown+Math.max(3,Math.ceil((got.length-shown)/60)));onLive(got.slice(0,shown))},50);
 try{const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const {done:end,value}=await reader.read();if(end)break;buf+=dec.decode(value,{stream:true});let i;
   while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;const e=JSON.parse(line) as TutorEvent;
    if(e.t==='delta')got+=e.text;else if(e.t==='reset'){got='';shown=0;onLive('')}else if(e.t==='done')done={remaining:e.remaining};else if(e.t==='error')err=e.message}}}
 catch{err||=NET}
 if(done&&!err)while(shown<got.length)await new Promise(r=>setTimeout(r,60));
 clearInterval(tick);return done&&!err?{ok:true,text:got,remaining:done.remaining}:{ok:false,message:err||NET}}

// 外部按钮让面板打开并直接发出一句话（比如“给我一点提示”）：每次 n 变化就执行一次。
export type DockRequest={text:string;n:number};

// 常驻的 AI 老师：右下角一个“问 AI”按钮，点开是侧边对话面板，AI 知道你正在看哪张卡片或哪道题。
// 父组件按卡片或题目设置 key，换内容时自动开始新的对话；prompts 是一点就发的常用问题。
export default function AiDock({context,prompts,request,title}:{context:TutorContext;prompts:string[];request?:DockRequest;title?:string}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false),[msgs,setMsgs]=useState<TutorMessage[]>([]),[live,setLive]=useState<string|null>(null),[input,setInput]=useState(''),[error,setError]=useState(''),[left,setLeft]=useState<number|null>(null);
 const box=useRef<HTMLDivElement>(null),busy=live!==null,handled=useRef(request?.n??0);
 useEffect(()=>{const el=box.current;if(el)el.scrollTop=el.scrollHeight},[msgs,live,open]);
 async function send(text:string,history=msgs){const t=text.trim();if(!t||busy)return;
  const next=[...history,{role:'user' as const,text:t}];setMsgs(next);setInput('');setError('');setLive('');
  let sent=next.slice(-KEEP);while(sent[0]?.role!=='user')sent=sent.slice(1); // 对话太长时只带最近的部分，第一条必须是学习者发的
  const r=await ask(context,sent,setLive);setLive(null);
  if(r.ok){setMsgs([...next,{role:'model',text:r.text}]);setLeft(r.remaining)}else{setError(r.message);setMsgs(history);setInput(t)}}
 // 外部请求：打开面板并发出这句话。
 useEffect(()=>{if(!request||request.n===handled.current)return;handled.current=request.n;setOpen(true);void send(request.text)},[request]); // eslint-disable-line react-hooks/exhaustive-deps
 const name=title??L('AI 老师','AI tutor');
 return <>
  {!open&&<button type="button" className="ai-dock-fab" onClick={()=>setOpen(true)} aria-label={L('问 AI 老师','Ask the AI tutor')}><Bot size={20}/><span>{L('问 AI','Ask AI')}</span></button>}
  {open&&<aside className="ai-dock" aria-label={name}>
   <header><Bot size={18}/><strong>{name}</strong>
    <button type="button" className="ai-dock-icon" disabled={busy||!msgs.length} onClick={()=>{setMsgs([]);setError('')}} title={L('清空对话','Clear')}><RotateCcw size={15}/></button>
    <button type="button" className="ai-dock-icon" onClick={()=>setOpen(false)} title={L('收起','Close')}><X size={16}/></button></header>
   <div className="ai-dock-log" ref={box}>
    {!msgs.length&&!busy&&<div className="ai-dock-hello"><p>{L('哪里没看懂都可以问我，我会结合你正在看的内容讲。也可以点下面的问题：','Ask me anything about what you are looking at, or tap a question below:')}</p>
     <div className="ai-dock-prompts">{prompts.map(p=><button key={p} type="button" onClick={()=>void send(p)}>{p}</button>)}</div></div>}
    {msgs.map((m,i)=><div key={i} className={'tutor-msg '+m.role}>{m.role==='model'?<Md text={m.text}/>:<p>{m.text}</p>}</div>)}
    {busy&&<div className="tutor-msg model live">{live?<Md text={live} caret/>:<p className="tutor-wait"><Loader2 size={15} className="ai-spin"/>{L('AI 老师正在思考…','Thinking…')}</p>}</div>}
   </div>
   {error&&<p className="ai-grade-error">{error}</p>}
   {msgs.length>0&&!busy&&<div className="ai-dock-prompts compact">{prompts.slice(0,3).map(p=><button key={p} type="button" onClick={()=>void send(p)}>{p}</button>)}</div>}
   <form className="tutor-input" onSubmit={e=>{e.preventDefault();void send(input)}}>
    <textarea value={input} rows={2} disabled={busy} placeholder={L('输入你的问题，或粘贴看到的结果、报错…（Enter 发送，Shift+Enter 换行）','Type a question or paste what you see… (Enter to send)')}
     onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(input)}}}/>
    <button className="button primary" disabled={busy||!input.trim()} aria-label={L('发送','Send')}><Send size={15}/></button></form>
   {left!==null&&<p className="tutor-left">{L(`今天还可以问 ${left} 次`,`${left} messages left today`)}</p>}
  </aside>}
 </>}
