'use client';
import {createContext,useContext,useState} from 'react';
import {ChevronDown,ChevronUp,MessagesSquare} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import InterviewAnimationButton from './interview-animation';
import {hasInterviewAnimation} from './animations/go-animated';

// 闯关学习里引用的面试题（标题 + 参考回答），由各学科的页面在服务端挑好后传进来。
export type InterviewDoc={id:string;title:string;blocks:{type:string;text:string}[]};
export const InterviewSource=createContext<Map<string,InterviewDoc>>(new Map());

// 可展开的面试题：标题 + 参考回答（与「面试」里对应学科的面试问答是同一份内容）。
export function InterviewItem({id,label}:{id:string;label?:string}){const q=useContext(InterviewSource).get(id);if(!q)return null;
 return <details className="ai-interview"><summary><MessagesSquare size={16}/>{label&&<em>{label}</em>}<span>{q.title}</span><ChevronDown size={15} className="ai-interview-arrow"/></summary>
  <div className="ai-interview-body">{hasInterviewAnimation(q.id)&&<InterviewAnimationButton id={q.id} title={q.title}/>}{q.blocks.map((b,i)=>b.type==='code'?<pre key={i}><code>{b.text}</code></pre>:<p key={i}><KeywordText text={b.text}/></p>)}</div></details>}

// 学习页底部：本关相关的面试题列表（默认收起，点击展开）。
export function LevelInterviews({ids}:{ids:string[];subject?:[string,string]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false);
 if(!ids.length)return null;
 return <section className={'ai-card ai-interviews'+(open?' is-open':'')}>
  <button type="button" className="ai-interviews-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <MessagesSquare size={18}/>
   <span>{L(`本关相关面试题（${ids.length}）`,`Related interview questions (${ids.length})`)}</span>
   <span className="ai-interviews-arrow">{open?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span>
  </button>
  {open&&<div className="ai-interviews-list">{ids.map(id=><InterviewItem key={id} id={id}/>)}</div>}
 </section>}
