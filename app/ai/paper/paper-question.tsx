'use client';
import {Check,X} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import KeywordText from '../../components/keyword-text';
import {answerText} from '../question-card';
import {GradeBreakdown,SelfScore} from '../grade-view';
import {codeEditing} from '../code-input';
import type {AiQuiz} from '@/content/journey';
import {isWrittenQuiz,type PaperAnswer,type WrittenScore} from './paper-score';

const letters='ABCDEFGH';
type Review={got:number;written?:WrittenScore;onSelfScore?:(score:number,got:boolean[])=>void};

// 试卷里的一道题。作答时只有输入，没有任何对错提示；交卷后（review）显示得分、正确答案、每个错误选项的解释和解析。
// order：选项的显示顺序（原始下标），字母按显示位置排；答案里记的始终是原始下标。
export default function PaperQuestion({q,no,max,answer,order,onChange,review}:{q:AiQuiz;no:number;max:number;answer?:PaperAnswer;order?:number[];onChange?:(a:PaperAnswer)=>void;review?:Review}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const type=q.type??'single',locked=!!review,a=answer??{};
 const set=(patch:PaperAnswer)=>onChange?.({...a,...patch});
 let body;
 if(type==='single'||type==='multi'){const c=q as Extract<AiQuiz,{options:string[]}>,right=type==='multi'?(q as Extract<AiQuiz,{type:'multi'}>).answers:[(q as Extract<AiQuiz,{answer:number}>).answer],chosen=a.choice??[];
  const shown=order&&order.length===c.options.length?order:c.options.map((_,i)=>i);
  body=<div className="paper-options">{shown.map((i,pos)=>{const o=c.options[i],on=chosen.includes(i),state=!review?(on?'chosen':''):right.includes(i)?'right':on?'wrong':'';
   return <button type="button" key={i} disabled={locked} className={'paper-option '+state} onClick={()=>set({choice:type==='multi'?(on?chosen.filter(x=>x!==i):[...chosen,i].sort()):[i]})}>
    <b>{letters[pos]}</b><span>{o}{review&&!right.includes(i)&&c.why?.[i]&&<small className="ai-why">{c.why[i]}</small>}</span>{state==='right'&&<Check size={16}/>}{state==='wrong'&&<X size={16}/>}</button>})}</div>}
 else if(type==='judge'){const right=(q as Extract<AiQuiz,{type:'judge'}>).answer;
  body=<div className="paper-options paper-judge">{[true,false].map(v=>{const on=a.judge===v,state=!review?(on?'chosen':''):v===right?'right':on?'wrong':'';
   return <button type="button" key={String(v)} disabled={locked} className={'paper-option '+state} onClick={()=>set({judge:v})}><b>{v?'✓':'✗'}</b><span>{v?L('正确','True'):L('错误','False')}</span></button>})}</div>}
 else if(type==='fill'){const f=q as Extract<AiQuiz,{type:'fill'}>,n=f.blanks?.length??1,values=a.blanks??[];
  const input=(i:number)=><input key={i} className="paper-blank" disabled={locked} value={values[i]??''} maxLength={120} aria-label={L(`第 ${i+1} 空`,`Blank ${i+1}`)} onChange={e=>{const next=[...values];next[i]=e.target.value;set({blanks:next})}}/>;
  body=<div className="paper-fill">{Array.from({length:n},(_,i)=><label key={i}><span>{n>1?L(`第 ${i+1} 空`,`Blank ${i+1}`):L('答案','Answer')}</span>{input(i)}</label>)}</div>}
 else body=<textarea className={'paper-text'+(type==='code'||type==='design'?' code':'')} ref={type==='short'?undefined:codeEditing} disabled={locked} rows={type==='short'?5:type==='code'?10:14} spellCheck={type==='short'} value={a.text??''}
  placeholder={type==='design'?L('先写设计思路（模块、数据、流程、取舍），再写关键代码','Write the design (modules, data, flow, trade-offs), then the key code'):type==='code'?L('在这里写代码，可以只写关键部分','Write your code here; key parts are enough'):L('用自己的话作答，按要点分条写更清楚','Answer in your own words; listing points helps')} onChange={e=>set({text:e.target.value})}/>;
 const written=isWrittenQuiz(q)?q as Extract<AiQuiz,{reference:string}>:undefined;
 return <article className="paper-q" id={'pq-'+no}>
  <header><span className="paper-no">{no}</span><span className="paper-max">{L(`（${max} 分）`,`(${max} pts)`)}</span>{review&&<span className={'paper-got '+(review.got>=max?'full':review.got>0?'part':'none')}>{L(`得 ${review.got} 分`,`${review.got} pts`)}</span>}</header>
  <h3>{q.q}</h3>{q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}{body}
  {review&&<div className="paper-review">
   {!written&&<p className="ai-answer">{L('正确答案：','Answer: ')}{type==='single'||type==='multi'?(type==='multi'?(q as Extract<AiQuiz,{type:'multi'}>).answers:[(q as Extract<AiQuiz,{answer:number}>).answer]).map(i=>letters[(order??[]).indexOf(i)>=0?(order??[]).indexOf(i):i]).sort().join('、')+'  ':''}{answerText(q,L)}</p>}
   {written&&review.written?.kind==='ai'&&<GradeBreakdown result={review.written.result}/>}
   {written&&!review.written&&review.onSelfScore&&<SelfScore points={written.points} scores={written.scores} max={max} onDone={review.onSelfScore}/>}
   {written&&review.written?.kind==='self'&&<p className="paper-self">{L(`自评 ${review.written.score} / ${max} 分`,`Self-scored ${review.written.score} / ${max}`)}</p>}
   {written&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='short'?<p><KeywordText text={written.reference}/></p>:<pre><code>{written.reference}</code></pre>}</div>}
   <p className="paper-explain"><strong>{L('解析：','Explanation: ')}</strong><KeywordText text={q.explain}/></p></div>}
 </article>}
