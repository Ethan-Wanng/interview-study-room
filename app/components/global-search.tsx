'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,ListChecks,Loader2,MessagesSquare,Search,X} from 'lucide-react';
import {useI18n} from './i18n';
import type {SearchHit,SearchKind} from '@/lib/site-search';

type Result={hits:SearchHit[];counts:Record<SearchKind,number>};
const icons={card:BookOpen,question:ListChecks,interview:MessagesSquare};

// 全局搜索：顶栏的放大镜（或按 Ctrl / ⌘ + K）打开，一次搜遍所有学科的学习卡片、题目和面试题。
// 点结果直接到达：学习卡片打开到那一张，题目打开单题练习，面试题打开到那一题。搜索在服务端做（GET /api/search）。
export default function GlobalSearch(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[kind,setKind]=useState<SearchKind|'all'>('all'),[res,setRes]=useState<Result|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const input=useRef<HTMLInputElement>(null),seq=useRef(0);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(v=>!v)}else if(e.key==='Escape')setOpen(false)};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 useEffect(()=>{if(!open)return;input.current?.focus();const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[open]);
 // 停止输入 250 毫秒后再搜；只采用最后一次请求的结果。
 useEffect(()=>{const kw=q.trim();if(!open||!kw){setRes(null);setBusy(false);return}
  const id=++seq.current;setBusy(true);setFailed(false);
  const t=setTimeout(()=>{fetch(`/api/search?q=${encodeURIComponent(kw)}${kind==='all'?'':'&kind='+kind}`,{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<Result>:Promise.reject(new Error(String(r.status))))
   .then(d=>{if(id===seq.current){setRes(d);setBusy(false)}}).catch(()=>{if(id===seq.current){setFailed(true);setBusy(false)}})},250);
  return()=>clearTimeout(t)},[q,kind,open]);
 const tabs:[SearchKind|'all',string][]=[['all',L('全部','All')],['card',L('学习卡片','Lesson cards')],['question',L('题目','Questions')],['interview',L('面试题','Interview')]];
 const total=res?res.counts.card+res.counts.question+res.counts.interview:0;
 return <>
  <button type="button" className="gs-open" onClick={()=>setOpen(true)} title={L('全局搜索（Ctrl / ⌘ + K）','Search everything (Ctrl / ⌘ + K)')} aria-label={L('全局搜索','Search everything')}><Search size={17}/><span>{L('搜索','Search')}</span></button>
  {open&&<div className="gs-layer" role="dialog" aria-modal="true" aria-label={L('全局搜索','Search everything')} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <div className="gs-box">
    <label className="gs-input"><Search size={18}/><input ref={input} value={q} onChange={e=>setQ(e.target.value)} placeholder={L('搜索所有学科的学习卡片、题目和面试题，比如 CoT、索引、闭包…','Search lesson cards, questions and interview questions…')}/>
     {busy&&<Loader2 size={16} className="ai-spin"/>}<button type="button" onClick={()=>setOpen(false)} aria-label={L('关闭','Close')}><X size={17}/></button></label>
    <div className="gs-tabs">{tabs.map(([id,name])=><button key={id} type="button" className={kind===id?'on':''} onClick={()=>setKind(id)}>{name}{res&&<small>{id==='all'?total:res.counts[id]}</small>}</button>)}</div>
    <div className="gs-list">
     {!q.trim()&&<p className="gs-empty">{L('输入关键词开始搜索。多个关键词用空格分开，比如“Redis 持久化”。','Type a keyword to search. Separate several keywords with spaces.')}</p>}
     {failed&&<p className="gs-empty">{L('搜索没有成功，请稍后再试。','Search failed. Please try again.')}</p>}
     {q.trim()&&res&&!failed&&!res.hits.length&&<p className="gs-empty">{L('没有找到相关内容，换个关键词试试，或者点右下角问 AI 老师。','Nothing found. Try another keyword, or ask the AI tutor.')}</p>}
     {res?.hits.map((h,i)=>{const Icon=icons[h.kind];return <a key={h.href+i} href={h.href} className="gs-hit"><Icon size={17}/><span><b>{h.title}</b>{h.snippet&&<small>{h.snippet}</small>}<em><i className={'gs-tag '+h.kind}>{h.tag}</i>{h.where}</em></span></a>})}
     {res&&res.hits.length>=40&&<p className="gs-empty">{L('只显示最相关的 40 条，可以加关键词缩小范围。','Showing the top 40. Add keywords to narrow it down.')}</p>}
    </div>
   </div></div>}
 </>}
