'use client';
import {Check,CircleDot,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {pointScores,type GradeResult} from '@/lib/grade-types';

const half=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);

// AI 评分结果：总分、每个得分点拿了几分和点评、一句总评。练习题和试卷共用。
export function GradeBreakdown({result,remaining}:{result:GradeResult;remaining?:number}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 return <div className="ai-grade"><div className="ai-grade-head"><strong>{L('AI 评分','AI score')}</strong><b>{half(result.score)} / {result.max}</b>{remaining!==undefined&&<small>{L(`今天还可以用 ${remaining} 次`,`${remaining} left today`)}</small>}</div>
  <ul>{result.hits.map((h,i)=><li key={i} className={h.got>=h.max?'full':h.got>0?'part':'none'}>{h.got>=h.max?<Check size={16}/>:h.got>0?<CircleDot size={16}/>:<X size={16}/>}<span><b>{h.point}</b>{h.comment&&<em>{h.comment}</em>}</span><i>{half(h.got)} / {h.max}</i></li>)}</ul>
  {result.feedback&&<p>{result.feedback}</p>}</div>}

// 自评：AI 评分用不了时，对照得分点逐条勾选答到的部分，按分值算分。
export function SelfScore({points,scores,max,onDone}:{points:string[];scores?:number[];max:number;onDone:(score:number,got:boolean[])=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const values=pointScores(points,max,scores);
 return <form className="ai-self-score" onSubmit={e=>{e.preventDefault();const got=points.map((_,i)=>(e.currentTarget.elements.namedItem('p'+i) as HTMLInputElement).checked);onDone(values.reduce((n,v,i)=>n+(got[i]?v:0),0),got)}}>
  <strong>{L('对照得分点自评：勾选你答到的要点','Self-check: tick the points you covered')}</strong>
  {points.map((p,i)=><label key={i}><input type="checkbox" name={'p'+i}/><span>{p}</span><i>{values[i]} {L('分','pts')}</i></label>)}
  <button className="button primary">{L('确认自评','Confirm')}</button></form>}
