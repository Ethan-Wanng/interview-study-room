'use client';
import {Check,X} from 'lucide-react';
import CodeAnswer,{untouchedStarter} from '../code-answer';
import {useI18n} from '../../components/i18n';
import KeywordText from '../../components/keyword-text';
import {answerText} from '../question-card';
import {isWritten,toStandardItem} from '../grade-client';
import {GradeBreakdown,GradeWaiting,SelfScore} from '../grade-view';
import {StandardAnswerPanel} from '../standard-answer-box';
import type {GradeResult} from '@/lib/grade-types';
import {codeEditing,markdownEditing} from '../code-input';
import CodeReference from '../code-reference';
import AddToNoteButton from '../../components/add-to-note';
import {startersFor} from '@/content/code-starters';
import type {AiQuiz} from '@/content/journey';
import {fillPoints,fillScores,isAiGradedQuiz,isWrittenQuiz,type PaperAnswer,type WrittenScore} from './paper-score';

const letters='ABCDEFGH';
// live：AI 阅卷中，这道题正在写出的评分（null：还没写到这道题）。
type Review={got:number;written?:WrittenScore;live?:GradeResult|null;onSelfScore?:(score:number,got:boolean[])=>void;onStop?:()=>void};

// 试卷里的一道题。作答时只有输入，没有任何对错提示；交卷后（review）显示得分、正确答案、每个错误选项的解释和解析。
// order：选项的显示顺序（原始下标），字母按显示位置排；答案里记的始终是原始下标。
export default function PaperQuestion({q,no,max,answer,order,onChange,review}:{q:AiQuiz;no:number;max:number;answer?:PaperAnswer;order?:number[];onChange?:(a:PaperAnswer)=>void;review?:Review}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const type=q.type??'single',locked=!!review,a=answer??{};
 const set=(patch:PaperAnswer)=>onChange?.({...a,...patch});
 let body;
 if(type==='single'||type==='multi'){const c=q as Extract<AiQuiz,{options:string[]}>,right=type==='multi'?(q as Extract<AiQuiz,{type:'multi'}>).answers:[(q as Extract<AiQuiz,{answer:number}>).answer],chosen=a.choice??[];
  const shown=order&&order.length===c.options.length?order:c.options.map((_,i)=>i);
  body=<><p className={'ai-choice-hint '+type}>{type==='multi'?L('多选题：正确答案可能有两个或更多，全部选对才得分','Multiple choice: select all correct answers'):L('单选题：只有一个正确答案','Single choice: one correct answer')}</p><div className="paper-options">{shown.map((i,pos)=>{const o=c.options[i],on=chosen.includes(i),state=!review?(on?'chosen':''):right.includes(i)?'right':on?'wrong':'';
   return <button type="button" key={i} disabled={locked} className={'paper-option '+state} onClick={()=>set({choice:type==='multi'?(on?chosen.filter(x=>x!==i):[...chosen,i].sort()):[i]})}>
    <b>{letters[pos]}</b><span>{o}{review&&!right.includes(i)&&c.why?.[i]&&<small className="ai-why">{c.why[i]}</small>}</span>{state==='right'&&<Check size={16}/>}{state==='wrong'&&<X size={16}/>}</button>})}</div></>}
 else if(type==='judge'){const right=(q as Extract<AiQuiz,{type:'judge'}>).answer;
  body=<div className="paper-options paper-judge">{[true,false].map(v=>{const on=a.judge===v,state=!review?(on?'chosen':''):v===right?'right':on?'wrong':'';
   return <button type="button" key={String(v)} disabled={locked} className={'paper-option '+state} onClick={()=>set({judge:v})}><b>{v?'✓':'✗'}</b><span>{v?L('正确','True'):L('错误','False')}</span></button>})}</div>}
 else if(type==='fill'){const f=q as Extract<AiQuiz,{type:'fill'}>,n=f.blanks?.length??1,values=a.blanks??[];
  const input=(i:number)=><input key={i} className="paper-blank" disabled={locked} value={values[i]??''} maxLength={120} aria-label={L(`第 ${i+1} 空`,`Blank ${i+1}`)} onChange={e=>{const next=Array.from({length:n},(_,k)=>values[k]??'');next[i]=e.target.value;set({blanks:next})}}/>;
  body=<div className="paper-fill">{Array.from({length:n},(_,i)=><label key={i}><span>{n>1?L(`第 ${i+1} 空`,`Blank ${i+1}`):L('答案','Answer')}</span>{input(i)}</label>)}</div>}
 else if(type==='code')body=<CodeAnswer id={q.id} value={a.text??''} disabled={locked} rows={10} placeholder={L('写代码','Write code')} onChange={v=>set({text:v})}/>;
 else body=<textarea className={'paper-text'+(type==='design'?' code':'')} ref={type==='short'?markdownEditing:codeEditing} disabled={locked} rows={type==='short'?5:14} spellCheck={type==='short'} value={a.text??''}
  placeholder={type==='design'?L('先写设计思路（模块、数据、流程、取舍），再写关键代码','Write the design (modules, data, flow, trade-offs), then the key code'):L('用自己的话作答，按要点分条写更清楚','Answer in your own words; listing points helps')} onChange={e=>set({text:e.target.value})}/>;
 const written=isWrittenQuiz(q)?q as Extract<AiQuiz,{reference:string}>:undefined,aiGraded=isAiGradedQuiz(q);
 const points=written?written.points:q.type==='fill'?fillPoints(q):[],scores=written?written.scores:q.type==='fill'?fillScores(q):undefined;
 const noteOpts='options' in q?(order&&order.length===q.options.length?order.map(i=>q.options[i]):q.options).map((opt,i)=>`- **${letters[i]}.** ${opt}`).join('\n'):'';
 const noteQOnly=[`### 第 ${no} 题 · ${q.q}`,q.code?`\`\`\`\n${q.code}\n\`\`\``:'',noteOpts].filter(Boolean).join('\n\n');
 const noteQA=review
  ?[noteQOnly,`**${L('参考答案','Reference Answer')}**：\n${written&&q.type!=='short'?`\`\`\`\n${written.reference}\n\`\`\``:answerText(q,L)}`,`**${L('解析','Explanation')}**：${q.explain}`].join('\n\n')
  :[noteQOnly,a.text?`**${L('我的作答草稿','My Draft')}**：\n${a.text}`:L('*（正式考试交卷后可收录完整参考答案与解析）*','*(Submit the paper to include the reference answer & explanation)*')].join('\n\n');
 const hideRedundantCodeBox=Boolean(
  type==='code'&&startersFor(q.id)&&q.code&&/(?:TODO|请补全|pass\b|unimplemented!|NotImplementedError)/i.test(q.code),
 );
 return <article className="paper-q" id={'pq-'+no}>
  <header><span className="paper-no">{no}</span><span className="paper-max">{L(`（${max} 分）`,`(${max} pts)`)}</span>{review&&<span className={'paper-got '+(review.got>=max?'full':review.got>0?'part':'none')}>{L(`得 ${review.got} 分`,`${review.got} pts`)}</span>}<AddToNoteButton title={`第 ${no} 题 · ${q.q.slice(0,48)}`} questionOnly={noteQOnly} questionAndAnswer={noteQA} defaultMode={review?'question-and-answer':'question-only'} source={{kind:'paper',label:L(`正式试卷 · 第 ${no} 题`,`Exam Paper · Q${no}`),href:'',questionId:q.id}}/></header>
  <h3>{q.q}</h3>{q.code&&!hideRedundantCodeBox&&<pre className="ai-snippet"><code>{q.code}</code></pre>}{body}
  {review&&<div className="paper-review">
   {!written&&<p className="ai-answer">{L('正确答案：','Answer: ')}{type==='single'||type==='multi'?(type==='multi'?(q as Extract<AiQuiz,{type:'multi'}>).answers:[(q as Extract<AiQuiz,{answer:number}>).answer]).map(i=>letters[(order??[]).indexOf(i)>=0?(order??[]).indexOf(i):i]).sort().join('、')+'  ':''}{answerText(q,L)}</p>}
   {aiGraded&&!review.written&&review.live!==undefined&&(review.live?<GradeBreakdown result={review.live} live code={q.type==='code'||q.type==='design'} answer={written?a.text:undefined} onStop={review.onStop}/>:<GradeWaiting onStop={review.onStop}/>)}
   {aiGraded&&review.written?.kind==='ai'&&<GradeBreakdown result={review.written.result} code={q.type==='code'||q.type==='design'} answer={written?a.text:undefined}/>}
   {aiGraded&&!review.written&&review.onSelfScore&&<SelfScore points={points} scores={scores} max={max} onDone={review.onSelfScore}/>}
   {aiGraded&&review.written?.kind==='self'&&<p className="paper-self">{L(`自评 ${review.written.score} / ${max} 分`,`Self-scored ${review.written.score} / ${max}`)}</p>}
   {isWritten(q)&&<StandardAnswerPanel keyId={`paper:${q.id}`} item={toStandardItem(q,untouchedStarter(q.id,a.text??'')?'':(a.text??''),max)} withPicker/>}
   {written&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='short'?<p><KeywordText text={written.reference}/></p>:q.type==='code'?<CodeReference id={q.id} reference={written.reference}/>:<pre className="ref-wrap"><code>{written.reference}</code></pre>}</div>}
   <p className="paper-explain"><strong>{L('解析：','Explanation: ')}</strong><KeywordText text={q.explain}/></p></div>}
 </article>}
