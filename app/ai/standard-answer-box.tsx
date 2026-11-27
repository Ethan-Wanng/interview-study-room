'use client';
import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import {Check,Copy,FileCheck2,Loader2,RotateCcw,Square,X} from 'lucide-react';
import {gradeModelBadge,type GradeItem} from '@/lib/grade-types';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import {classifySafeHref} from '@/lib/safe-href';
import GradeModelPicker from './grade-model-picker';
import ThinkBox from './think-box';
import {gradeQuota,requestStandardAnswer,type GradeThinkState} from './grade-client';
import {
 createThrottledCheckpoint,
 makeCheckpointKey,
 readAiCheckpoint,
 removeAiCheckpoint,
 writeAiCheckpoint,
} from '@/lib/ai-checkpoint';

export type StandardRecord={text:string;model?:string;think?:string;secs?:number;remaining?:number};
type SlotState={loading?:boolean;live?:string;think?:GradeThinkState|null;error?:string;record?:StandardRecord;interrupted?:boolean};
type StandardCheckpointData={live:string;think?:GradeThinkState|null;model?:string;record?:StandardRecord};

function stdInline(t:string){
 return t.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g).map((p,i)=>{
  if(p.startsWith('`')&&p.endsWith('`')&&p.length>2)return <code key={i}>{p.slice(1,-1)}</code>;
  if(p.startsWith('**')&&p.endsWith('**')&&p.length>4)return <strong key={i}><KeywordText text={p.slice(2,-2)}/></strong>;
  const lm=p.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);
  if(lm){
   const safe=classifySafeHref(lm[2]);
   if(safe){
    return safe.external
     ?<a key={i} className="tutor-link tutor-ext-link" href={safe.href} target="_blank" rel="noopener noreferrer">{lm[1]}</a>
     :<a key={i} className="tutor-link" href={safe.href}>{lm[1]}</a>;
   }
  }
  return <Fragment key={i}><KeywordText text={p}/></Fragment>;
 });
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
 const cpRef=useRef<Record<string,ReturnType<typeof createThrottledCheckpoint<StandardCheckpointData>>>>({});
 const slot=slots[keyId];
 const loading=Boolean(slot?.loading);
 const interrupted=Boolean(slot?.interrupted);
 const live=slot?.live??'';
 const liveThink=slot?.think??null;
 const error=slot?.error??'';
 const record=slot?.record??initial??undefined;

 useEffect(()=>()=>{
  Object.values(abortRef.current).forEach(c=>c.abort());
  abortRef.current={};
  Object.values(cpRef.current).forEach(cp=>{cp.flush('interrupted');cp.dispose()});
  cpRef.current={};
 },[]);

 useEffect(()=>{
  if(initial||slot)return;
  const cpKey=makeCheckpointKey('standard-answer',keyId);
  const cp=readAiCheckpoint<StandardCheckpointData>(cpKey);
  if(!cp)return;
  let alive=true;
  queueMicrotask(()=>{
   if(!alive)return;
   if(cp.status==='done'&&cp.data.record){
    setSlots(prev=>prev[keyId]?prev:{...prev,[keyId]:{record:cp.data.record}});
    onSaved?.(cp.data.record,keyId);
   }else if((cp.status==='running'||cp.status==='interrupted')&&(cp.data.live||cp.data.think?.text)){
    setSlots(prev=>prev[keyId]?prev:{...prev,[keyId]:{interrupted:true,live:cp.data.live,think:cp.data.think??null}});
   }
  });
  return()=>{alive=false};
 },[keyId,initial,slot,onSaved]);

 const patchSlot=useCallback((k:string,fn:(cur:SlotState)=>SlotState)=>{
  setSlots(prev=>({...prev,[k]:fn(prev[k]??{})}));
 },[]);

 const clear=useCallback(()=>{
  abortRef.current[keyId]?.abort();
  delete abortRef.current[keyId];
  cpRef.current[keyId]?.clear();
  delete cpRef.current[keyId];
  removeAiCheckpoint(makeCheckpointKey('standard-answer',keyId));
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
  cpRef.current[keyId]?.clear();
  delete cpRef.current[keyId];
  removeAiCheckpoint(makeCheckpointKey('standard-answer',keyId));
 },[keyId]);

 const generate=useCallback(async(overrideItem?:GradeItem)=>{
  const payload=overrideItem??item;
  if(!payload||slots[keyId]?.loading)return;
  const targetKey=keyId,gen=(genRef.current[targetKey]??0)+1;
  genRef.current[targetKey]=gen;
  const ctl=new AbortController();
  abortRef.current[targetKey]=ctl;
  const cpKey=makeCheckpointKey('standard-answer',targetKey);
  cpRef.current[targetKey]?.dispose();
  const cp=createThrottledCheckpoint<StandardCheckpointData>(cpKey,'standard-answer',450);
  cpRef.current[targetKey]=cp;
  let curLive='',curThink:GradeThinkState|null=null;
  cp.update({live:'',think:null},'running');
  cp.flush('running');
  patchSlot(targetKey,cur=>({...cur,loading:true,interrupted:false,live:'',think:null,error:''}));
  try{
   const out=await requestStandardAnswer(payload,partial=>{
    if(genRef.current[targetKey]!==gen)return;
    curLive=partial;
    cp.update({live:curLive,think:curThink},'running');
    patchSlot(targetKey,cur=>({...cur,live:partial}));
   },undefined,t=>{
    if(genRef.current[targetKey]!==gen)return;
    curThink=t;
    cp.update({live:curLive,think:curThink},'running');
    patchSlot(targetKey,cur=>({...cur,think:t}));
   },ctl.signal);
   if(abortRef.current[targetKey]===ctl)delete abortRef.current[targetKey];
   if(genRef.current[targetKey]!==gen){cp.dispose();return}
   if(!out.ok){
    if(ctl.signal.aborted||out.aborted){
     cp.clear();
     if(cpRef.current[targetKey]===cp)delete cpRef.current[targetKey];
     patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:false,live:'',think:null,error:''}));
     void gradeQuota().then(q=>{if(q!==null)onRemaining?.(q)});
     return;
    }
    const finalThink=curThink as GradeThinkState|null;
    if(curLive.trim()||finalThink?.text?.trim()){
     cp.update({live:curLive,think:finalThink},'interrupted');
     cp.flush('interrupted');
     patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:true,live:curLive,think:finalThink,error:out.message}));
    }else{
     cp.clear();
     patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:false,live:'',think:null,error:out.message}));
    }
    if(cpRef.current[targetKey]===cp)delete cpRef.current[targetKey];
    if(out.quota)onQuotaOut?.();
    return;
   }
   const rec:StandardRecord={text:out.text,model:out.model,think:out.think,secs:out.thinkSecs,remaining:out.remaining};
   cp.dispose();
   if(cpRef.current[targetKey]===cp)delete cpRef.current[targetKey];
   writeAiCheckpoint<StandardCheckpointData>({
    key:cpKey,
    kind:'standard-answer',
    status:'done',
    startedAt:Date.now(),
    updatedAt:Date.now(),
    model:out.model,
    data:{live:'',record:rec},
   });
   patchSlot(targetKey,()=>({loading:false,interrupted:false,live:'',think:null,error:'',record:rec}));
   if(typeof out.remaining==='number')onRemaining?.(out.remaining);
   onSaved?.(rec,targetKey);
  }catch{
   if(abortRef.current[targetKey]===ctl)delete abortRef.current[targetKey];
   if(genRef.current[targetKey]!==gen){cp.dispose();return}
   if(ctl.signal.aborted){
    cp.clear();
    if(cpRef.current[targetKey]===cp)delete cpRef.current[targetKey];
    patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:false,live:'',think:null,error:''}));
    return;
   }
   const finalThink=curThink as GradeThinkState|null;
   if(curLive.trim()||finalThink?.text?.trim()){
    cp.update({live:curLive,think:finalThink},'interrupted');
    cp.flush('interrupted');
    patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:true,live:curLive,think:finalThink,error:'请求失败，请稍后重试'}));
   }else{
    cp.clear();
    patchSlot(targetKey,cur=>({...cur,loading:false,interrupted:false,live:'',think:null,error:'请求失败，请稍后重试'}));
   }
   if(cpRef.current[targetKey]===cp)delete cpRef.current[targetKey];
  }
 },[item,keyId,onQuotaOut,onRemaining,onSaved,patchSlot,slots]);

 return {loading,interrupted,live,liveThink,error,record,generate,stop,clear};
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
 const {loading,interrupted,live,liveThink,record,stop,clear,generate}=std;
 if(!loading&&!record&&!interrupted)return null;
 const shown=loading||interrupted?live:record?.text??'';
 const model=!loading&&!interrupted?record?.model:undefined;
 const think=loading||interrupted?liveThink?.text:record?.think;
 const thinkSecs=loading||interrupted?liveThink?.secs:record?.secs;
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
    <strong>{loading?L('AI 正在生成规范回答…','Generating AI model answer…'):interrupted?L('AI 规范回答（已中断）','AI Model Answer (Interrupted)'):L('AI 规范回答','AI Model Answer')}</strong>
    {model&&<span className="ai-grade-model-tag">{gradeModelBadge(model,locale==='en'?'en':'zh')}</span>}
    {!loading&&!interrupted&&typeof record?.remaining==='number'&&<small className="ai-std-rem">{L(`今日还剩 ${record.remaining} 次`,`${record.remaining} left today`)}</small>}
   </span>
   {loading?<div className="ai-std-actions">
    <button type="button" className="am-stop-btn" onClick={stop}>
     <Square size={11} fill="currentColor"/>{L('停止','Stop')}
    </button>
   </div>:interrupted?<div className="ai-std-actions">
    <button type="button" className="am-edit-btn" onClick={()=>void generate()}>
     <RotateCcw size={13}/>{L('继续生成','Continue')}
    </button>
    <button type="button" className="am-edit-btn" aria-label={L('清除规范回答','Dismiss')} onClick={()=>{setCopied(false);clear()}}>
     <X size={13}/>
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
