'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,ChevronUp,Eye,EyeOff,RotateCcw,Shuffle} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText,{EnWords} from '../components/keyword-text';
import type {BankEntry} from './question-browser';

// 背题模式：只收简答题。一次看一道，先自己回忆，再展开参考答案对照；参考答案可以折叠，也可以设成默认展开（纯背诵）。
// “记住了”的题会打勾并记在本地浏览器里，可以只看还没记住的。左右方向键切题，空格展开 / 折叠答案。
type Saved={known:string[];openByDefault:boolean};
const read=(key:string):Saved=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return {known:Array.isArray(v.known)?v.known:[],openByDefault:!!v.openByDefault}}catch{return {known:[],openByDefault:false}}};
const shuffled=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

export default function ReciteView({items,storageKey,sourceName,onOpenSource}:{items:BankEntry[];storageKey:string;sourceName:(levelId:string)=>string;onOpenSource:(e:BankEntry)=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [saved,setSaved]=useState<Saved>({known:[],openByDefault:false}),[source,setSource]=useState('all'),[onlyNew,setOnlyNew]=useState(false),[order,setOrder]=useState<string[]|null>(null),[index,setIndex]=useState(0),[open,setOpen]=useState(false);
 useEffect(()=>{const s=read(storageKey);setSaved(s);setOpen(s.openByDefault)},[storageKey]);
 const save=(next:Saved)=>{setSaved(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}};
 const known=useMemo(()=>new Set(saved.known),[saved.known]);
 const sources=useMemo(()=>[...new Set(items.map(e=>e.level))],[items]);
 const list=useMemo(()=>{const base=items.filter(e=>(source==='all'||e.level===source)&&(!onlyNew||!known.has(e.id)));
  return order?order.map(id=>base.find(e=>e.id===id)).filter((e):e is BankEntry=>!!e):base},[items,source,onlyNew,order,known]);
 const at=Math.min(index,Math.max(0,list.length-1)),e=list[at];
 const go=(i:number)=>{if(i<0||i>=list.length)return;setIndex(i);setOpen(saved.openByDefault)};
 const mark=(yes:boolean)=>{if(!e)return;save({...saved,known:yes?[...new Set([...saved.known,e.id])]:saved.known.filter(id=>id!==e.id)});if(yes&&!onlyNew)go(at+1);else setOpen(saved.openByDefault)};
 useEffect(()=>{const onKey=(ev:KeyboardEvent)=>{if((ev.target as HTMLElement).closest('input,textarea,select,button,a'))return;
   if(ev.key==='ArrowRight')go(at+1);else if(ev.key==='ArrowLeft')go(at-1);else if(ev.key===' '){ev.preventDefault();setOpen(v=>!v)}};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)}); // eslint-disable-line react-hooks/exhaustive-deps
 const q=e?.quiz,total=items.length,done=items.filter(x=>known.has(x.id)).length;
 return <>
  <div className="ai-title"><span className="eyebrow">RECITE</span><h1>{L('背题模式','Recite mode')}</h1><p>{L(`只收简答题，共 ${total} 道，已记住 ${done} 道。先在心里答一遍，再展开参考答案对照；参考答案可以随时折叠。左右方向键切题，空格展开或折叠答案。`,`Short-answer questions only: ${total} in total, ${done} memorised. Recall first, then unfold the reference answer. Arrow keys switch questions; space toggles the answer.`)}</p></div>
  <section className="ai-card rc-bar">
   <select value={source} onChange={ev=>{setSource(ev.target.value);setIndex(0);setOrder(null)}} aria-label={L('选择范围','Scope')}><option value="all">{L(`全部关卡和训练（${total}）`,`Everything (${total})`)}</option>{sources.map(s=><option key={s} value={s}>{sourceName(s)}（{items.filter(x=>x.level===s).length}）</option>)}</select>
   <label><input type="checkbox" checked={onlyNew} onChange={ev=>{setOnlyNew(ev.target.checked);setIndex(0)}}/>{L('只看还没记住的','Only not memorised')}</label>
   <label><input type="checkbox" checked={saved.openByDefault} onChange={ev=>{save({...saved,openByDefault:ev.target.checked});setOpen(ev.target.checked)}}/>{L('参考答案默认展开','Show answers by default')}</label>
   <button type="button" className="button secondary qb-btn" onClick={()=>{setOrder(order?null:shuffled(items.map(x=>x.id)));setIndex(0)}}><Shuffle size={14}/>{order?L('恢复顺序','In order'):L('打乱顺序','Shuffle')}</button>
   {done>0&&<button type="button" className="button secondary qb-btn" onClick={()=>{if(confirm(L('确定把所有题都改回“没记住”吗？','Reset all questions to “not memorised”?')))save({...saved,known:[]})}}><RotateCcw size={14}/>{L('重新背','Start over')}</button>}
  </section>
  {!e||!q||q.type!=='short'?<p className="muted rc-empty">{total?L('这个范围里的题都记住了，可以换个范围，或者取消“只看还没记住的”。','Everything here is memorised. Change the scope or untick the filter.'):L('这门课还没有简答题。','This subject has no short-answer questions yet.')}</p>:
  <section className="ai-card ai-question rc-card" key={e.id}>
   <div className="ai-tags"><span className="ai-tag type t-short">{L('简答','Short answer')}</span><span className="ai-tag">{sourceName(e.level)}</span>{known.has(e.id)&&<span className="ai-tag rc-known"><Check size={13}/>{L('已记住','Memorised')}</span>}<span className="rc-count">{at+1} / {list.length}</span></div>
   <h2><EnWords text={q.q}/></h2>
   {q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}
   <button type="button" className="rc-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<><EyeOff size={15}/>{L('折叠参考答案','Fold the reference answer')}<ChevronUp size={15}/></>:<><Eye size={15}/>{L('展开参考答案','Unfold the reference answer')}<ChevronDown size={15}/></>}</button>
   {open&&<div className="ai-reference rc-ref"><strong>{L('参考答案','Reference answer')}</strong><p><KeywordText text={q.reference}/></p><strong>{L('评分要点（背的时候按这几条组织答案）','Key points')}</strong><ul>{q.points.map(p=><li key={p}><EnWords text={p}/></li>)}</ul></div>}
   <div className="rc-actions">
    <button type="button" className="button secondary" disabled={at===0} onClick={()=>go(at-1)}><ArrowLeft size={16}/>{L('上一题','Previous')}</button>
    {known.has(e.id)?<button type="button" className="button secondary" onClick={()=>mark(false)}><RotateCcw size={16}/>{L('还没记住，再背','Not yet')}</button>:<button type="button" className="button primary" onClick={()=>mark(true)}><Check size={16}/>{L('记住了','Got it')}</button>}
    <button type="button" className="button secondary" onClick={()=>onOpenSource(e)}><BookOpen size={16}/>{L('看对应的学习卡片','Open the lesson card')}</button>
    <button type="button" className="button secondary" disabled={at>=list.length-1} onClick={()=>go(at+1)}>{L('下一题','Next')}<ArrowRight size={16}/></button>
   </div>
  </section>}
 </>}
