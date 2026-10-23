'use client';
import {useState} from 'react';
import {ArrowRight,Check,Eye,RotateCcw,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText,{findTerms,termDefinition} from '../components/keyword-text';
import {aiQuizTypes,fillMatches,type AiQuiz} from '@/content/ai-journey';

export type Result={correct:boolean;given:string};
export type Item={id:string;level:string;quiz:AiQuiz;order:number[]};
const letters='ABCDEFGH';

// 正确答案的文字形式，用于答题后的解析和结果回顾。
export function answerText(q:AiQuiz,L:(zh:string,en:string)=>string){switch(q.type){
 case 'multi':return q.answers.map(i=>q.options[i]).join('；');
 case 'judge':return q.answer?L('正确','True'):L('错误','False');
 case 'fill':return q.accepted[0];
 case 'short':case 'code':return q.reference;
 default:return q.options[q.answer]}}

// 一道题的作答区：客观题自动判分，简答 / 代码题提交后对照参考答案自评。
export default function QuestionCard({item,label,result,last,onAnswer,onNext}:{item:Item;label?:string;result:Result|null;last:boolean;onAnswer:(r:Result)=>void;onNext:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const q=item.quiz,type=q.type??'single',done=result!==null;
 const [chosen,setChosen]=useState<number[]>([]),[text,setText]=useState(''),[revealed,setRevealed]=useState(false);
 // 简答 / 代码题自评“没答好”之后，可以遮住参考答案再写一遍巩固（不改变本题记分，题目仍留在错题本）。
 const [practising,setPractising]=useState(false),[retry,setRetry]=useState(''),[hideRef,setHideRef]=useState(true),[checked,setChecked]=useState(false);
 const referenceHidden=practising&&hideRef&&!checked;
 const optionState=(o:number)=>{if(!done)return chosen.includes(o)?'chosen':'';const right=q.type==='multi'?q.answers.includes(o):q.type!=='judge'&&'answer' in q&&q.answer===o;return right?'right':chosen.includes(o)?'wrong':''};
 const option=(o:number,i:number,textValue:string,onClick:()=>void)=>{const state=optionState(o);return <button key={o} className={'ai-option '+state} disabled={done} onClick={onClick}><b>{letters[i]}</b><span>{textValue}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>};
 let input;
 if(q.type==='multi')input=<><div className="ai-options">{item.order.map((o,i)=>option(o,i,q.options[o],()=>setChosen(chosen.includes(o)?chosen.filter(x=>x!==o):[...chosen,o])))}</div>{!done&&<button className="button primary ai-next" disabled={!chosen.length} onClick={()=>{const ok=chosen.length===q.answers.length&&chosen.every(c=>q.answers.includes(c));onAnswer({correct:ok,given:chosen.map(c=>q.options[c]).join('；')})}}>{L('提交答案','Submit')}</button>}</>;
 else if(q.type==='judge')input=<div className="ai-options ai-judge">{[true,false].map(v=>{const o=v?1:0,state=!done?'':v===q.answer?'right':chosen.includes(o)?'wrong':'';return <button key={String(v)} className={'ai-option '+state} disabled={done} onClick={()=>{setChosen([o]);onAnswer({correct:v===q.answer,given:v?L('正确','True'):L('错误','False')})}}><b>{v?'✓':'✗'}</b><span>{v?L('正确','True'):L('错误','False')}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>})}</div>;
 else if(q.type==='fill')input=<form className="ai-fill" onSubmit={e=>{e.preventDefault();if(!done&&text.trim())onAnswer({correct:fillMatches(q.accepted,text),given:text.trim()})}}><input value={text} disabled={done} maxLength={200} placeholder={L('输入你的答案','Type your answer')} onChange={e=>setText(e.target.value)}/>{!done&&<button className="button primary" disabled={!text.trim()}>{L('提交','Submit')}</button>}</form>;
 else if(q.type==='short'||q.type==='code')input=<div className="ai-written"><textarea className={q.type==='code'?'code':''} rows={q.type==='code'?9:5} value={text} disabled={revealed} spellCheck={q.type!=='code'} placeholder={q.type==='code'?L('在这里写代码（可以只写关键部分）','Write your code here (key parts are enough)'):L('先用自己的话写下答案，再对照参考答案','Write your answer first, then compare with the reference')} onChange={e=>setText(e.target.value)}/>
  {!revealed&&<button className="button primary ai-next" onClick={()=>setRevealed(true)}><Eye size={16}/>{text.trim()?L('提交并查看参考答案','Submit and see the reference'):L('直接查看参考答案','Show the reference')}</button>}
  {revealed&&referenceHidden&&<p className="ai-ref-hidden">{L('参考答案已遮住，写完后再对照。','The reference is hidden until you finish.')}</p>}
  {revealed&&!referenceHidden&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='code'?<pre><code>{q.reference}</code></pre>:<p><KeywordText text={q.reference}/></p>}<strong>{L('评分要点','Key points')}</strong><ul>{q.points.map(p=><li key={p}>{p}</li>)}</ul>
   {!done&&<div className="ai-self"><span>{L('对照要点，你答到了吗？','Did your answer cover the key points?')}</span><button className="button secondary" onClick={()=>onAnswer({correct:false,given:text.trim()})}><X size={16}/>{L('没答好','Not yet')}</button><button className="button primary" onClick={()=>onAnswer({correct:true,given:text.trim()})}><Check size={16}/>{L('基本答对','Got it')}</button></div>}</div>}</div>;
 else{const s=q as Extract<AiQuiz,{answer:number}>;input=<div className="ai-options">{item.order.map((o,i)=>option(o,i,s.options[o],()=>{setChosen([o]);onAnswer({correct:o===s.answer,given:s.options[o]})}))}</div>}
 const self=q.type==='short'||q.type==='code';
 const terms=done?findTerms(q.q,...('options' in q?q.options:[]),q.explain,q.type==='short'?q.reference:'',...(self?q.points:[])):[];
 return <section className="ai-card ai-question"><div className="ai-tags"><span className="ai-tag type">{aiQuizTypes[type]}</span>{label&&<span className="ai-tag">{label}</span>}</div><h2>{q.q}</h2>{q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}{input}
  {done&&<div className={'ai-explain '+(result.correct?'right':'wrong')}><strong>{result.correct?(self?L('已记为答对','Marked as correct'):L('回答正确','Correct')):(self?L('已加入错题本，之后再练一次','Added to the mistake book for another try'):L('回答错误，已加入错题本','Incorrect — added to the mistake book'))}</strong>{!result.correct&&!self&&<p className="ai-answer">{L('正确答案：','Answer: ')}{answerText(q,L)}</p>}<p><KeywordText text={q.explain}/></p>{terms.length>0&&<div className="ai-terms"><strong>{L('本题名词','Terms in this question')}</strong><dl>{terms.map(k=><div key={k}><dt>{k}</dt><dd>{termDefinition(k,locale)}</dd></div>)}</dl></div>}</div>}
  {done&&self&&!result.correct&&<div className="ai-retry">{!practising?<button className="button secondary" onClick={()=>setPractising(true)}><RotateCcw size={16}/>{L('再写一遍巩固','Write it again')}</button>:<>
   <strong>{L('再写一遍巩固','Write it again')}</strong>
   <label className="ai-hide-ref"><input type="checkbox" checked={hideRef} disabled={checked} onChange={e=>setHideRef(e.target.checked)}/>{L('写的时候遮住参考答案','Hide the reference while writing')}</label>
   <textarea className={q.type==='code'?'code':''} rows={q.type==='code'?9:5} autoFocus value={retry} disabled={checked} spellCheck={q.type!=='code'} placeholder={L('凭理解重新写一遍，再和参考答案逐条对照','Rewrite it from memory, then compare point by point')} onChange={e=>setRetry(e.target.value)}/>
   {!checked?<button className="button primary ai-next" disabled={!retry.trim()} onClick={()=>setChecked(true)}><Eye size={16}/>{L('写完了，对照参考答案','Done — compare with the reference')}</button>:<div className="ai-retry-check">
    <p>{L('对照上面的参考答案和评分要点，逐条看看这次是否都写到了。这道题已经在错题本里，之后复习时还会再遇到。','Compare with the reference and key points above. This question stays in your mistake book for later review.')}</p>
    <button className="button secondary" onClick={()=>{setRetry('');setChecked(false)}}><RotateCcw size={16}/>{L('再练一遍','Practice again')}</button></div>}</>}</div>}
  {done&&<button className="button primary ai-next" onClick={onNext}>{last?L('查看结果','See results'):L('下一题','Next')}<ArrowRight size={16}/></button>}</section>}
