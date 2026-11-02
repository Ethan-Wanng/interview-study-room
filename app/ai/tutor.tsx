'use client';
import {Fragment,useEffect,useRef,useState} from 'react';
import {Bot,Loader2,RotateCcw,Send} from 'lucide-react';
import {useI18n} from '../components/i18n';
import type {TutorEvent,TutorLesson,TutorMessage} from '@/lib/tutor-types';

const START='我准备好了，请带我从第一步开始。',KEEP=28;

// 很小的 Markdown 显示：``` 代码块、`行内代码`、**加粗**，其余按原样换行。AI 老师的回复只用到这些。
function inline(s:string){return s.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((p,i)=>p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>:p.startsWith('**')&&p.endsWith('**')&&p.length>4?<b key={i}>{p.slice(2,-2)}</b>:<Fragment key={i}>{p}</Fragment>)}
function Md({text,caret}:{text:string;caret?:boolean}){const parts=text.split(/```[^\n]*\n?/);
 return <>{parts.map((p,i)=>i%2?<pre key={i}><code>{p.replace(/\n$/,'')}{caret&&i===parts.length-1&&<span className="ai-caret"/>}</code></pre>:p.trim()||caret&&i===parts.length-1?<p key={i}>{inline(p.trim())}{caret&&i===parts.length-1&&<span className="ai-caret"/>}</p>:null)}</>}

// 读 /api/tutor 的流：边收边按打字节奏显示（至少每秒约 60 个字，最多落后约 3 秒），写完返回整段回复。
async function ask(lesson:TutorLesson,messages:TutorMessage[],onLive:(t:string)=>void):Promise<{ok:true;text:string;remaining:number}|{ok:false;message:string}>{
 const NET='网络连接失败，这次没有扣次数，请重试。';let res:Response;
 try{res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lesson,messages})})}catch{return {ok:false,message:NET}}
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

// “动手试试”卡片里的 AI 老师（父组件按卡片标题设 key，换卡片时自动重新开始）：一步步带学习者在自己电脑上操作，学习者把看到的结果或报错贴回来，老师再接着讲。
export default function Tutor({lesson}:{lesson:TutorLesson}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false),[msgs,setMsgs]=useState<TutorMessage[]>([]),[live,setLive]=useState<string|null>(null),[input,setInput]=useState(''),[error,setError]=useState(''),[left,setLeft]=useState<number|null>(null);
 const box=useRef<HTMLDivElement>(null),busy=live!==null;
 useEffect(()=>{const el=box.current;if(el)el.scrollTop=el.scrollHeight},[msgs,live]);
 async function send(text:string,history=msgs){const t=text.trim();if(!t||busy)return;
  const next=[...history,{role:'user' as const,text:t}];setMsgs(next);setInput('');setError('');setLive('');
  // 对话太长时只带最近的部分（第一条必须是学习者发的）。
  let sent=next.slice(-KEEP);while(sent[0]?.role!=='user')sent=sent.slice(1);
  const r=await ask(lesson,sent,setLive);setLive(null);
  if(r.ok){setMsgs([...next,{role:'model',text:r.text}]);setLeft(r.remaining)}else{setError(r.message);setMsgs(history);setInput(t)}}
 if(!open)return <button type="button" className="button primary tutor-open" onClick={()=>{setOpen(true);void send(START,[])}}><Bot size={16}/>{L('让 AI 老师带你做','Let the AI tutor guide you')}</button>;
 return <section className="tutor" aria-label={L('AI 老师','AI tutor')}>
  <header><Bot size={18}/><strong>{L('AI 老师','AI tutor')}</strong><small>{L('一步一步来，做完一步把看到的结果发给我','One step at a time — send me what you see after each step')}</small>
   <button type="button" className="tutor-reset" disabled={busy} onClick={()=>{setMsgs([]);setError('');void send(START,[])}}><RotateCcw size={14}/>{L('重新开始','Restart')}</button></header>
  <div className="tutor-log" ref={box}>
   {msgs.map((m,i)=><div key={i} className={'tutor-msg '+m.role}>{m.role==='model'?<Md text={m.text}/>:<p>{m.text}</p>}</div>)}
   {busy&&<div className="tutor-msg model live">{live?<Md text={live} caret/>:<p className="tutor-wait"><Loader2 size={15} className="ai-spin"/>{L('AI 老师正在思考…','The tutor is thinking…')}</p>}</div>}
  </div>
  {error&&<p className="ai-grade-error">{error}</p>}
  <form className="tutor-input" onSubmit={e=>{e.preventDefault();void send(input)}}>
   <textarea value={input} rows={2} disabled={busy} placeholder={L('把你看到的结果、报错粘贴到这里，或者直接提问…（Enter 发送，Shift+Enter 换行）','Paste what you see or any error, or ask a question… (Enter to send)')}
    onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(input)}}}/>
   <button className="button primary" disabled={busy||!input.trim()}><Send size={15}/>{L('发送','Send')}</button></form>
  {left!==null&&<p className="tutor-left">{L(`今天还可以问 ${left} 次`,`${left} messages left today`)}</p>}
 </section>}
