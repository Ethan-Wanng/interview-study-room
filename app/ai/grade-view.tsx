'use client';
import {useEffect,useState} from 'react';
import {Check,CircleDot,Loader2,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {pointScores,type GradeResult} from '@/lib/grade-types';

const half=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
const Caret=()=><span className="ai-caret" aria-hidden/>;

// AI 评分结果：总分、每个得分点拿了几分和点评、一句总评、AI 示范回答。练习题和试卷共用。
// code：代码题、综合题的示范回答按代码排版。
// live：AI 正在流式写出评分，文字一段段出现，正在写的地方有闪烁光标；还没写到的得分点显示“评估中”，总分显示“评分中”。
export function GradeBreakdown({result,remaining,code,live}:{result:GradeResult;remaining?:number;code?:boolean;live?:boolean}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 // 光标放在最后一个已经开始写的地方：示范回答 → 总评 → 最后一个有点评的得分点。
 const at=!live?'':result.answer?'answer':result.feedback?'feedback':'hit-'+result.hits.reduce((k,h,i)=>h.pending?k:i,-1);
 return <div className={'ai-grade'+(live?' live':'')} aria-busy={live}><div className="ai-grade-head"><strong>{live?L('AI 正在评分','AI is grading'):L('AI 评分','AI score')}</strong>
   <b>{live?L('评分中…','…'):`${half(result.score)} / ${result.max}`}</b>{!live&&remaining!==undefined&&<small>{L(`今天还可以用 ${remaining} 次`,`${remaining} left today`)}</small>}</div>
  <ul>{result.hits.map((h,i)=>h.pending?<li key={i} className="wait"><Loader2 size={16}/><span><b>{h.point}</b><em>{L('评估中…','Assessing…')}</em></span><i>… / {h.max}</i></li>
   :<li key={i} className={h.got>=h.max?'full':h.got>0?'part':'none'}>{h.got>=h.max?<Check size={16}/>:h.got>0?<CircleDot size={16}/>:<X size={16}/>}<span><b>{h.point}</b>{(h.comment||at==='hit-'+i)&&<em>{h.comment}{at==='hit-'+i&&<Caret/>}</em>}</span><i>{half(h.got)} / {h.max}</i></li>)}</ul>
  {result.feedback&&<p>{result.feedback}{at==='feedback'&&<Caret/>}</p>}
  {result.answer&&<details className="ai-grade-answer" open><summary>{L('AI 示范回答','AI model answer')}</summary>{code?<pre><code>{result.answer}{at==='answer'&&<Caret/>}</code></pre>:<p>{result.answer}{at==='answer'&&<Caret/>}</p>}</details>}</div>}

// 等 AI 写出第一段文字之前显示：已经提交、正在读答案，并显示等了几秒，让人知道请求确实在进行。
export function GradeWaiting(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;const [s,setS]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setS(x=>x+1),1000);return()=>clearInterval(t)},[]);
 return <div className="ai-grade live" aria-busy><div className="ai-grade-head"><strong>{L('AI 正在阅读你的答案','AI is reading your answer')}</strong><b><Loader2 size={18} className="ai-spin"/></b><small>{L(`已等待 ${s} 秒`,`${s}s`)}</small></div>
  <p className="ai-grade-hint">{L('正在对照每个得分点逐条判断，写好的评语会马上出现在这里。','Checking each key point; comments appear here as they are written.')}<Caret/></p></div>}

// 自评：AI 评分用不了时，对照得分点逐条勾选答到的部分，按分值算分。
export function SelfScore({points,scores,max,onDone}:{points:string[];scores?:number[];max:number;onDone:(score:number,got:boolean[])=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const values=pointScores(points,max,scores);
 return <form className="ai-self-score" onSubmit={e=>{e.preventDefault();const got=points.map((_,i)=>(e.currentTarget.elements.namedItem('p'+i) as HTMLInputElement).checked);onDone(values.reduce((n,v,i)=>n+(got[i]?v:0),0),got)}}>
  <strong>{L('对照得分点自评：勾选你答到的要点','Self-check: tick the points you covered')}</strong>
  {points.map((p,i)=><label key={i}><input type="checkbox" name={'p'+i}/><span>{p}</span><i>{values[i]} {L('分','pts')}</i></label>)}
  <button className="button primary">{L('确认自评','Confirm')}</button></form>}
