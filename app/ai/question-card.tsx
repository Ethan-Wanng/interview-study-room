'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Bot,Check,Eye,Lightbulb,MessageSquareWarning,RotateCcw,Sparkles,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText,{EnglishSpeakContext,EnWords,findTerms,termDefinition,useEnglishSpeak} from '../components/keyword-text';
import {InterviewItem} from './interview-reading';
import {aiQuizTypes,fillMatches,type AiQuiz} from '@/content/journey';
import type {GradeResult} from '@/lib/grade-types';
import {gradeQuota,isWritten,PRACTICE_MAX,requestGrade,toGradeItem} from './grade-client';
import {GradeBreakdown,GradeWaiting,SelfScore} from './grade-view';
import {codeEditing} from './code-input';
import CodeReference from './code-reference';
import AiDock,{type DockRequest} from './ai-dock';
import {ListenButton,ReadingPassage} from '../components/speech-drill';
import VoiceButton from '../components/voice-input';
import CodeAnswer,{untouchedStarter} from './code-answer';

export type Result={correct:boolean;given:string};
export type Item={id:string;level:string;quiz:AiQuiz;order:number[]};
const letters='ABCDEFGH';

// 正确答案的文字形式，用于答题后的解析和结果回顾。
export function answerText(q:AiQuiz,L:(zh:string,en:string)=>string){switch(q.type){
 case 'multi':return q.answers.map(i=>q.options[i]).join('；');
 case 'judge':return q.answer?L('正确','True'):L('错误','False');
 case 'fill':return q.blanks?q.blanks.map(b=>b[0]).join('；'):q.accepted[0];
 case 'short':case 'code':case 'design':return q.reference;
 default:return q.options[q.answer]}}

function initChosen(q:AiQuiz,result:Result|null):number[]{
 if(!result)return [];
 if(q.type==='multi'){const parts=result.given.split('；');return q.options.map((opt,i)=>parts.includes(opt)?i:-1).filter(i=>i>=0)}
 if(q.type==='judge')return [result.given==='正确'||result.given==='True'?1:0];
 if('options' in q){const idx=q.options.indexOf(result.given);return idx>=0?[idx]:[]}
 return [];
}

// 一道题的作答区：客观题自动判分；简答 / 代码 / 综合题提交后由 AI 按得分点评分，额度用完或评分失败时对照得分点自评。
export default function QuestionCard({item,label,result,last,onAnswer,onNext,onPrev}:{item:Item;label?:string;result:Result|null;last:boolean;onAnswer:(r:Result)=>void;onNext:()=>void;onPrev?:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const q=item.quiz,type=q.type??'single',done=result!==null;
 const [chosen,setChosen]=useState<number[]>(()=>initChosen(q,result)),[text,setText]=useState(()=>result&&(q.type==='fill'||isWritten(q))?result.given:''),[revealed,setRevealed]=useState(()=>result!==null);
 const [live,setLive]=useState<GradeResult|null>(null),[retryLive,setRetryLive]=useState<GradeResult|null>(null); // AI 正在流式写出的评分
 const [grading,setGrading]=useState(false),[graded,setGraded]=useState<{result:GradeResult;remaining:number}|null>(null),[gradeError,setGradeError]=useState('');
 // 今天剩余的 AI 评分次数，显示在提交按钮旁边，让人一眼知道写完可以交给 AI 评分。
 const [left,setLeft]=useState<number|null>(null);
 useEffect(()=>{if(isWritten(q))void gradeQuota().then(setLeft)},[q]);
 const submitWritten=async()=>{if(!isWritten(q)||!text.trim()||untouchedStarter(item.id,text))return;
  setGrading(true);setLive(null);const r=await requestGrade([toGradeItem(q,text)],p=>setLive(p[0]));setGrading(false);setLive(null);setRevealed(true);
  if(r.ok){const result=r.results[0];setGraded({result,remaining:r.remaining});setLeft(r.remaining);onAnswer({correct:result.score>=0.6*result.max,given:text.trim()})}else{setGradeError(r.message);if(r.quota)setLeft(0)}};
 // 简答 / 代码题没答好之后，可以遮住参考答案再写一遍巩固，写完同样交给 AI 评分（不改变本题记分，题目仍留在错题本）。
 const [practising,setPractising]=useState(false),[retry,setRetry]=useState(''),[hideRef,setHideRef]=useState(true),[checked,setChecked]=useState(false);
 const [retryGrading,setRetryGrading]=useState(false),[retryGraded,setRetryGraded]=useState<GradeResult|null>(null),[retryError,setRetryError]=useState('');
 const gradeRetry=async()=>{if(!isWritten(q)||!retry.trim())return;
  setRetryGrading(true);setRetryLive(null);const r=await requestGrade([toGradeItem(q,retry)],p=>setRetryLive(p[0]));setRetryGrading(false);setRetryLive(null);setChecked(true);
  if(r.ok){setRetryGraded(r.results[0]);setLeft(r.remaining)}else{setRetryError(r.message);if(r.quota)setLeft(0)}};
 const quotaHint=left===null?L('写完后 AI 按得分点逐条打分','AI scores each key point once you submit'):left>0?L(`写完后 AI 按得分点逐条打分 · 今天还剩 ${left} 次`,`AI scores each key point · ${left} left today`):L('今天的 AI 评分次数已用完，提交后可对照得分点自评','No AI grading left today; you can self-check against the key points');
 const referenceHidden=practising&&hideRef&&!checked;
 const optionState=(o:number)=>{if(!done)return chosen.includes(o)?'chosen':'';const right=q.type==='multi'?q.answers.includes(o):q.type!=='judge'&&'answer' in q&&q.answer===o;return right?'right':chosen.includes(o)?'wrong':''};
 // 答完后，每个错误选项下面说明它其实是什么、用来干什么。
 const why='why' in q?q.why:undefined;
 const option=(o:number,i:number,textValue:string,onClick:()=>void)=>{const state=optionState(o);return <button key={o} type="button" className={'ai-option '+state+(done?' is-done':'')} aria-disabled={done} onClick={()=>{if(!done)onClick()}}><b>{letters[i]}</b><span><EnWords text={textValue} inOption={!done}/>{done&&why?.[o]&&state!=='right'&&<small className="ai-why"><EnWords text={why[o]}/></small>}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>};
 let input;
 if(q.type==='multi')input=<>{!done&&<p className="ai-choice-hint multi">{L('多选题：正确答案可能有两个或更多，全部选对才得分，选好后点「提交答案」','Multiple choice: there may be two or more correct answers. Select all, then submit.')}</p>}<div className="ai-options">{item.order.map((o,i)=>option(o,i,q.options[o],()=>setChosen(chosen.includes(o)?chosen.filter(x=>x!==o):[...chosen,o])))}</div>{!done&&<button className="button primary ai-next" disabled={!chosen.length} onClick={()=>{const ok=chosen.length===q.answers.length&&chosen.every(c=>q.answers.includes(c));onAnswer({correct:ok,given:chosen.map(c=>q.options[c]).join('；')})}}>{L('提交答案','Submit')}</button>}</>;
 else if(q.type==='judge')input=<div className="ai-options ai-judge">{[true,false].map(v=>{const o=v?1:0,state=!done?'':v===q.answer?'right':chosen.includes(o)?'wrong':'';return <button key={String(v)} className={'ai-option '+state} disabled={done} onClick={()=>{setChosen([o]);onAnswer({correct:v===q.answer,given:v?L('正确','True'):L('错误','False')})}}><b>{v?'✓':'✗'}</b><span>{v?L('正确','True'):L('错误','False')}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>})}</div>;
 else if(q.type==='fill')input=<form className="ai-fill" onSubmit={e=>{e.preventDefault();if(!done&&text.trim())onAnswer({correct:fillMatches(q.accepted,text),given:text.trim()})}}><input value={text} disabled={done} maxLength={200} placeholder={L('输入你的答案','Type your answer')} onChange={e=>setText(e.target.value)}/>{!done&&<button className="button primary" disabled={!text.trim()}>{L('提交','Submit')}</button>}</form>;
 else if(isWritten(q))input=<div className="ai-written">{q.type==='code'?<CodeAnswer id={item.id} value={text} disabled={revealed} rows={9} placeholder={L('在这里写代码（可以只写关键部分），提交后 AI 按得分点评分','Write your code (key parts are enough); AI scores it against the key points')} onChange={setText}/>:<textarea className={q.type!=='short'?'code':''} ref={q.type!=='short'?codeEditing:undefined} rows={5} value={text} disabled={revealed} spellCheck placeholder={(L('用自己的话写下答案，提交后 AI 按得分点评分','Write your answer; AI scores it against the key points'))} onChange={e=>setText(e.target.value)}/>}
  {!revealed&&<div className="ai-written-actions">{q.type!=='code'&&<VoiceButton className="written-voice" disabled={grading} onText={t=>setText(v=>v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}/>}<button className="button primary" disabled={grading||!text.trim()||untouchedStarter(item.id,text)} onClick={()=>void submitWritten()}><Sparkles size={16}/>{grading?L('AI 正在按得分点评分…','AI is grading…'):L('提交，AI 评分','Submit for AI grading')}</button>
   <button className="button secondary" disabled={grading} onClick={()=>setRevealed(true)}><Eye size={16}/>{L('不会写，直接看参考答案','Show the reference')}</button><small>{quotaHint}</small></div>}
  {grading&&(live?<GradeBreakdown result={live} live code={q.type!=='short'}/>:<GradeWaiting/>)}
  {graded&&<GradeBreakdown result={graded.result} remaining={graded.remaining} code={q.type!=='short'} fold={referenceHidden}/>}
  {gradeError&&<p className="ai-grade-error">{gradeError}</p>}
  {revealed&&referenceHidden&&<p className="ai-ref-hidden">{L('参考答案已遮住，写完后再对照。','The reference is hidden until you finish.')}</p>}
  {revealed&&!referenceHidden&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='code'?<CodeReference id={q.id} reference={q.reference}/>:<p><KeywordText text={q.reference}/></p>}<strong>{L('评分要点','Key points')}</strong><ul>{q.points.map(p=><li key={p}><EnWords text={p}/></li>)}</ul>
   {!done&&!graded&&<SelfScore points={q.points} scores={q.scores} max={PRACTICE_MAX} onDone={score=>onAnswer({correct:score>=0.6*PRACTICE_MAX,given:text.trim()})}/>}</div>}</div>;
 else{const s=q as Extract<AiQuiz,{answer:number}>;input=<>{!done&&<p className="ai-choice-hint single">{L('单选题：只有一个正确答案，点选即提交','Single choice: one correct answer; clicking submits.')}</p>}<div className="ai-options">{item.order.map((o,i)=>option(o,i,s.options[o],()=>{setChosen([o]);onAnswer({correct:o===s.answer,given:s.options[o]})}))}</div></>}
 const self=isWritten(q);
 // 常驻 AI 老师：答题前只给提示（不透露答案），答完后讲解这道题、可以追问；在同一道题下保留临时对话。
 const [ask,setAsk]=useState<DockRequest>();
 // 选项按学习者屏幕上的顺序（已打乱）发给 AI，AI 说的 A、B、C、D 才能和页面对上。
 const tutorQuiz={type:aiQuizTypes[type],q:q.q,code:q.code,options:'options' in q?(item.order.length===q.options.length?item.order.map(o=>q.options[o]):q.options):undefined,answer:answerText(q,L),explain:q.explain,given:result?.given,correct:result?.correct};
 const dockPrompts=done?[L('为什么是这个答案？我哪里想错了？','Why is this the answer? Where did I go wrong?'),L('每个选项分别错在哪里？','What is wrong with each option?'),L('举个例子帮我理解','Give me an example')]
  :[L('给我一点提示（不要告诉我答案）','Give me a hint (not the answer)'),L('这道题考的是什么知识点？','What concept is this testing?'),L('题目里的名词是什么意思？','What do the terms mean?')];
 const terms=done?findTerms(q.q,...('options' in q?q.options:[]),q.explain,q.type==='short'?q.reference:'',...(self?q.points:[])):[];
 const feedbackHref=`/feedback?type=question&questionId=${encodeURIComponent(item.id)}&title=${encodeURIComponent(q.q.slice(0,80))}`;
 const parentSpeak=useEnglishSpeak();
 const isEnglishQuestion=parentSpeak||item.id.startsWith('en-')||item.level.startsWith('en-')||Boolean(q.say)||Boolean(q.passage);
 return <EnglishSpeakContext.Provider value={isEnglishQuestion}><section className="ai-card ai-question"><div className="ai-tags"><span className={'ai-tag type t-'+type}>{aiQuizTypes[type]}{type==='multi'||type==='single'?L('题',''):''}</span>{label&&<span className="ai-tag">{label}</span>}<a href={feedbackHref} target="_blank" rel="noreferrer" className="ai-feedback-link" title={L('觉得这道题有问题？点击反馈','Spot an issue with this question? Send feedback')}><MessageSquareWarning size={13}/>{L('反馈本题','Feedback')}</a></div><h2><EnWords text={q.q}/></h2>{q.say&&<ListenButton text={q.say}/>}{q.passage&&<ReadingPassage text={q.passage}/>}{q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}{!done&&<div className="ai-hint-row"><button type="button" className="ai-hint-btn" onClick={()=>setAsk({text:L('给我一点提示（不要告诉我答案）','Give me a hint (not the answer)'),n:Date.now()})}><Lightbulb size={15}/>{L('给我一点提示','Hint')}</button></div>}{input}
  {done&&<div className={'ai-explain '+(result.correct?'right':'wrong')}><strong>{result.correct?(self?L('已记为答对','Marked as correct'):L('回答正确','Correct')):(self?L('已加入错题本，之后再练一次','Added to the mistake book for another try'):L('回答错误，已加入错题本','Incorrect — added to the mistake book'))}</strong>{!result.correct&&!self&&<p className="ai-answer">{L('正确答案：','Answer: ')}<EnWords text={answerText(q,L)}/></p>}{q.say&&!q.explain.includes(q.say)&&<p className="ai-say-transcript">{L('听力原句：','Transcript: ')}<strong lang="en"><EnWords text={q.say}/></strong></p>}<p><KeywordText text={q.explain}/></p>{terms.length>0&&<div className="ai-terms"><strong>{L('本题名词','Terms in this question')}</strong><dl>{terms.map(k=><div key={k}><dt><EnWords text={k}/></dt><dd><EnWords text={termDefinition(k,locale)}/></dd></div>)}</dl></div>}{q.interview&&<InterviewItem id={q.interview} label={L('延伸阅读 · 面试题','Further reading · interview')}/>}</div>}
  {done&&self&&!result.correct&&<div className="ai-retry">{!practising?<button className="button secondary" onClick={()=>setPractising(true)}><RotateCcw size={16}/>{L('再写一遍巩固','Write it again')}</button>:<>
   <strong>{L('再写一遍巩固','Write it again')}</strong>
   <label className="ai-hide-ref"><input type="checkbox" checked={hideRef} disabled={checked} onChange={e=>setHideRef(e.target.checked)}/>{L('写的时候遮住参考答案','Hide the reference while writing')}</label>
   {q.type==='code'?<CodeAnswer id={item.id} value={retry} disabled={checked} rows={9} autoFocus placeholder={L('凭理解重新写一遍，再和参考答案逐条对照','Rewrite it from memory, then compare point by point')} onChange={setRetry}/>:<textarea className={q.type!=='short'?'code':''} ref={q.type!=='short'?codeEditing:undefined} rows={5} autoFocus value={retry} disabled={checked} spellCheck placeholder={L('凭理解重新写一遍，再和参考答案逐条对照','Rewrite it from memory, then compare point by point')} onChange={e=>setRetry(e.target.value)}/>}
   {!checked?<div className="ai-written-actions">{q.type!=='code'&&<VoiceButton className="written-voice" disabled={retryGrading} onText={t=>setRetry(v=>v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}/>}<button className="button primary" disabled={retryGrading||!retry.trim()} onClick={()=>void gradeRetry()}><Sparkles size={16}/>{retryGrading?L('AI 正在按得分点评分…','AI is grading…'):L('写完了，AI 评分','Done — AI grading')}</button>
    <button className="button secondary" disabled={retryGrading||!retry.trim()} onClick={()=>setChecked(true)}><Eye size={16}/>{L('自己对照参考答案','Compare myself')}</button><small>{quotaHint}</small>
    {retryGrading&&(retryLive?<GradeBreakdown result={retryLive} live code={q.type!=='short'}/>:<GradeWaiting/>)}</div>:<div className="ai-retry-check">
    {retryGraded&&<GradeBreakdown result={retryGraded} remaining={left??undefined} code={q.type!=='short'}/>}
    {retryError&&<p className="ai-grade-error">{retryError}</p>}
    <p>{retryGraded?L('看看这次还差哪个得分点。这道题已经在错题本里，之后复习时还会再遇到。','See which key points are still missing. This question stays in your mistake book for later review.'):L('对照上面的参考答案和评分要点，逐条看看这次是否都写到了。这道题已经在错题本里，之后复习时还会再遇到。','Compare with the reference and key points above. This question stays in your mistake book for later review.')}</p>
    <button className="button secondary" onClick={()=>{setRetry('');setChecked(false);setRetryGraded(null);setRetryError('')}}><RotateCcw size={16}/>{L('再练一遍','Practice again')}</button></div>}</>}</div>}
  {done&&<button type="button" className="button secondary ai-ask-btn" onClick={()=>setAsk({text:L('我还是不太懂，为什么是这个答案？我哪里想错了？','I still do not get it — why this answer, and where did I go wrong?'),n:Date.now()})}><Bot size={16}/>{L('还是不懂？问 AI 老师','Still unsure? Ask the AI tutor')}</button>}
  <AiDock key={item.id+':'+item.order.join('')} chatKey={'q:'+item.id+':'+item.order.join('')} context={{kind:done?'explain':'hint',quiz:tutorQuiz}} prompts={dockPrompts} request={ask}/>
  {(onPrev||done)&&<div className="ai-nav-row">{onPrev&&<button type="button" className="button secondary ai-prev" onClick={onPrev}><ArrowLeft size={16}/>{L('上一题','Previous')}</button>}{done&&<button type="button" className="button primary ai-next" onClick={onNext}>{last?L('查看结果','See results'):L('下一题','Next')}<ArrowRight size={16}/></button>}</div>}</section></EnglishSpeakContext.Provider>}
