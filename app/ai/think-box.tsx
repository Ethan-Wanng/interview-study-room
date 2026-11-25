'use client';
import {Fragment,useEffect,useRef,useState} from 'react';
import {Brain} from 'lucide-react';

function cleanStepMarkdown(s:string):string{
 return s
  .replace(/\*\*([^*\n]+)\*\*/g,'$1')
  .replace(/`([^`\n]+)`/g,'$1')
  .replace(/^[-*#\d.、\s]+/,'')
  .replace(/\*+$/,'')
  .trim();
}

function renderThinkInline(text:string){
 return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((p,i)=>{
  if(p.startsWith('**')&&p.endsWith('**')&&p.length>4)return <strong key={i}>{p.slice(2,-2)}</strong>;
  if(p.startsWith('`')&&p.endsWith('`')&&p.length>2)return <code key={i}>{p.slice(1,-1)}</code>;
  return <Fragment key={i}>{p}</Fragment>;
 });
}

// 思考过程只挑关键步骤显示：每一段取第一句，最多 6 条（太多时均匀抽取，保留第一条和最后一条），每条最多 90 个字。
export function keySteps(think:string):string[]{
 let parts=think.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(parts.length<3)parts=think.split(/(?<=[。！？!?；;]|\.\s)/).map(s=>s.trim()).filter(s=>s.length>3);
 const first=parts.map(p=>{
  const cleaned=cleanStepMarkdown(p);
  const m=cleaned.match(/^.+?[。！？!?；;]|^.+?\.(?=\s|$)/);
  const s=(m?m[0]:cleaned).trim();
  return s.length>90?s.slice(0,90)+'…':s;
 }).filter(Boolean);
 if(first.length<=6)return first;
 return Array.from({length:6},(_,i)=>first[Math.round(i*(first.length-1)/5)]);
}

function ThinkDone({text,steps,secs,L}:{text:string;steps:string[];secs?:number;L:(zh:string,en:string)=>string}){
 const [full,setFull]=useState(false);
 return <details className="tutor-think"><summary><Brain size={14}/>{secs?L(`思考了 ${secs} 秒 · 看关键步骤`,`Thought for ${secs}s · key steps`):L('思考过程 · 看关键步骤','Thinking · key steps')}</summary>
  {full?<div className="tutor-think-full">{renderThinkInline(text)}</div>:<ol>{steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}
  <button type="button" className="tutor-think-more" onClick={()=>setFull(v=>!v)}>{full?L('只看关键步骤','Key steps only'):L(`看全部思考过程（${text.length} 字）`,`Show the full thinking (${text.length} chars)`)}</button>
 </details>;
}

// 思考过程展示框：思考中只显示最新的几行（固定高度）；完成后收起，支持展开看关键步骤或完整思考。
export default function ThinkBox({text,live,secs,L}:{text:string;live?:boolean;secs?:number;L:(zh:string,en:string)=>string}){
 const tail=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=tail.current;if(el)el.scrollTop=el.scrollHeight},[text]);
 if(!text)return null;
 if(live)return <div className="tutor-think live"><span className="tutor-think-head"><Brain size={14}/>{L('正在思考…','Thinking…')}</span><div className="tutor-think-tail" ref={tail}>{text.slice(-400)}</div></div>;
 const steps=keySteps(text);
 if(!steps.length)return null;
 return <ThinkDone text={text} steps={steps} secs={secs} L={L}/>;
}
