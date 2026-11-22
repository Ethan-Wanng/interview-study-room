'use client';
import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import {Check,Copy,FileCheck2,Loader2,Square,X} from 'lucide-react';
import {gradeModelBadge,type GradeItem} from '@/lib/grade-types';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import GradeModelPicker from './grade-model-picker';
import ThinkBox from './think-box';
import {gradeQuota,requestStandardAnswer,type GradeThinkState} from './grade-client';

export type StandardRecord={text:string;model?:string;think?:string;secs?:number};
type SlotState={loading?:boolean;live?:string;think?:GradeThinkState|null;error?:string;record?:StandardRecord};

function stdInline(t:string){
 return t.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((p,i)=>
  p.startsWith('`')&&p.endsWith('`')&&p.length>2?<code key={i}>{p.slice(1,-1)}</code>
   :p.startsWith('**')&&p.endsWith('**')&&p.length>4?<strong key={i}><KeywordText text={p.slice(2,-2)}/></strong>
   :<Fragment key={i}><KeywordText text={p}/></Fragment>);
}

export function StandardText({text,caret}:{text:string;caret?:boolean}){
 const parts=text.replace(/\r\n/g,'\n').split(/```[^\n]*\n?/),last=parts.length-1;
 return <>{parts.map((p,i)=>i%2
  ?<pre key={i}><code>{p.replace(/\n$/,'')}{caret&&i===last&&<span className="ai-caret"/>}</code></pre>
  :(p.trim()||(caret&&i===last))?<p key={i}>{stdInline(p.trim())}{caret&&i===last&&<span className="ai-caret"/>}</p>:null)}</>;
}

export function useStandardAnswer({keyId,item,initial,onSaved,onRemaining,onQuotaOut}:{
 keyId:string;
 item?:GradeItem;
 initial?:StandardRecord|null;
 onSaved?:(record:StandardRecord|undefined,targetKey:string)=>void;
 onRemaining?:(remaining:number)=>void;
 onQuotaOut?:()=>void;
}){
 const [slots,setSlots]=useState<Record<string,SlotState>>({});
 const genRef=useRef<Record<string,number>>({});
 const abortRef=useRef<Record<string,AbortController>>({});
 const slot=slots[keyId];
 const loading=Boolean(slot?.loading);
 const live=slot?.live??'';
 const liveThink=slot?.think??null;
 const error=slot?.error??'';
 const record=slot?.record??initial??undefined;

 useEffect(()=>()=>{Object.values(abortRef.current).forEach(c=>c.abort());abortRef.current={}},[]);

 const patchSlot=useCallback((k:string,fn:(cur:SlotState)=>SlotState)=>{
  setSlots(prev=>({...prev,[k]:fn(prev[k]??{})}));
 },[]);

 const clear=useCallback(()=>{
  abortRef.current[keyId]?.abort();
  delete abortRef.current[keyId];
  genRef.current[keyId]=(genRef.current[keyId]??0)+1;
  setSlots(prev=>{
   if(!(keyId in prev))return prev;
   const next={...prev};
   delete next[keyId];
   return next;
  });
  onSaved?.(undefined,keyId);
 },[keyId,onSaved]);

 const stop=useCallback(()=>{
  abortRef.current[keyId]?.abort();
 },[keyId]);

 const generate=useCallback(async(overrideItem?:GradeItem)=>{
  const payload=overrideItem??item;
  if(!payload||slots[keyId]?.loading)return;
  const targetKey=keyId,gen=(genRef.current[targetKey]??0)+1;
  genRef.current[targetKey]=gen;
  const ctl=new AbortController();
  abortRef.current[targetKey]=ctl;
  patchSlot(targetKey,cur=>({...cur,loading:true,live:'',think:null,error:''}));
  try{
   const out=await requestStandardAnswer(payload,partial=>{
    if(genRef.current[targetKey]!==gen)return;
    patchSlot(targetKey,cur=>({...cur,live:partial}));
   },undefined,t=>{
    if(genRef.current[targetKey]!==gen)return;
    patchSlot(targetKey,cur=>({...cur,think:t}));
   },ctl.signal);
   if(abortRef.current[targetKey]===ctl)delete abortRef.current[targetKey];
   if(genRef.current[targetKey]!==gen)return;
   if(!out.ok){
    if(ctl.signal.aborted||out.aborted){
     patchSlot(targetKey,cur=>({...cur,loading:false,live:'',think:null,error:''}));
     void gradeQuota().then(q=>{if(q!==null)onRemaining?.(q)});
     return;
    }
    patchSlot(targetKey,cur=>({...cur,loading:false,live:'',think:null,error:out.message}));
    if(out.quota)onQuotaOut?.();
    return;
   }
   const rec:StandardRecord={text:out.text,model:out.model,think:out.think,secs:out.thinkSecs};
   patchSlot(targetKey,()=>({loading:false,live:'',think:null,error:'',record:rec}));
   onRemaining?.(out.remaining);
   onSaved?.(rec,targetKey);
  }catch{
   if(abortRef.current[targetKey]===ctl)delete abortRef.current[targetKey];
   if(genRef.current[targetKey]!==gen)return;
   if(ctl.signal.aborted){
    patchSlot(targetKey,cur=>({...cur,loading:false,live:'',think:null,error:''}));
    return;
   }
   patchSlot(targetKey,cur=>({...cur,loading:false,live:'',think:null,error:'请求失败，请稍后重试'}));
  }
 },[item,keyId,onQuotaOut,onRemaining,onSaved,patchSlot,slots]);

 return {loading,live,liveThink,error,record,generate,stop,clear};
}

export type StandardAnswerState=ReturnType<typeof useStandardAnswer>;

export function StandardAnswerButton({std,disabled=false,onClick,variant='secondary'}:{
 std:StandardAnswerState;
 disabled?:boolean;
 onClick?:()=>void;
 variant?:'primary'|'secondary';
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 return <button type="button" className={`button ${variant}`} disabled={disabled||std.loading} onClick={onClick??(()=>void std.generate())}>
  <FileCheck2 size={15}/>
  {std.loading?L('正在生成规范回答…','Generating model answer…'):std.record?L('重新生成规范回答','Regenerate model answer'):L('AI 规范回答','AI model answer')}
 </button>;
}

export function StandardAnswerBox({std}:{std:StandardAnswerState}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [copied,setCopied]=useState(false);
 const {loading,live,liveThink,record,stop,clear}=std;
 if(!loading&&!record)return null;
 const shown=loading?live:record?.text??'';
 const model=!loading?record?.model:undefined;
 const think=loading?liveThink?.text:record?.think;
 const thinkSecs=loading?liveThink?.secs:record?.secs;
 const copy=()=>{
  if(!shown)return;
  void navigator.clipboard?.writeText(shown).then(()=>{
   setCopied(true);
   setTimeout(()=>setCopied(false),1800);
  }).catch(()=>{});
 };
 return <div className={'ai-std-box'+(loading?' live':'')} aria-busy={loading}>
  <div className="ai-std-head">
   <span className="ai-std-title">
    {loading?<Loader2 size={15} className="ai-spin"/>:<FileCheck2 size={15}/>}
    <strong>{loading?L('AI 正在生成规范回答…','Generating AI model answer…'):L('AI 规范回答','AI Model Answer')}</strong>
    {model&&<span className="ai-grade-model-tag">{gradeModelBadge(model,locale==='en'?'en':'zh')}</span>}
   </span>
   {loading?<div className="ai-std-actions">
    <button type="button" className="am-stop-btn" onClick={stop}>
     <Square size={11} fill="currentColor"/>{L('停止','Stop')}
    </button>
   </div>:record&&<div className="ai-std-actions">
    <button type="button" className="am-edit-btn" onClick={copy}>
     {copied?<><Check size={13}/>{L('已复制','Copied')}</>:<><Copy size={13}/>{L('复制','Copy')}</>}
    </button>
    <button type="button" className="am-edit-btn" aria-label={L('清除规范回答','Dismiss')} onClick={()=>{setCopied(false);clear()}}>
     <X size={13}/>
    </button>
   </div>}
  </div>
  {think&&<div className="ai-grade-think"><ThinkBox text={think} live={Boolean(loading&&liveThink?.live)} secs={thinkSecs} L={L}/></div>}
  <div className="ai-std-body">
   {loading?(live?<StandardText text={live} caret/>:<p className="ai-grade-hint">{L('正在基于你的作答组织一段简练规范的答案…','Drafting a concise answer based on yours…')}<span className="ai-caret"/></p>):<StandardText text={shown}/>}
  </div>
 </div>;
}

export function StandardAnswerPanel({keyId,item,initial,withPicker=false,disabled=false,onSaved,onRemaining}:{
 keyId:string;
 item:GradeItem;
 initial?:StandardRecord|null;
 withPicker?:boolean;
 disabled?:boolean;
 onSaved?:(record:StandardRecord|undefined,targetKey:string)=>void;
 onRemaining?:(remaining:number)=>void;
}){
 const std=useStandardAnswer({keyId,item,initial,onSaved,onRemaining});
 return <div className="ai-std-panel">
  <div className="ai-std-bar">
   {withPicker&&<GradeModelPicker disabled={disabled||std.loading}/>}
   <StandardAnswerButton std={std} disabled={disabled}/>
  </div>
  {std.error&&<p className="ai-grade-error">{std.error}</p>}
  <StandardAnswerBox std={std}/>
 </div>;
}
