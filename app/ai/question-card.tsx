'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Bot,Check,ChevronDown,ChevronUp,Eye,EyeOff,Lightbulb,Loader2,MessageSquareWarning,PenLine,Play,RefreshCw,RotateCcw,Sparkles,Square,X} from 'lucide-react';
import CardSideNav from '../components/card-side-nav';
import {useI18n} from '../components/i18n';
import KeywordText,{EnglishSpeakContext,EnWords,findTerms,termDefinition,useEnglishSpeak} from '../components/keyword-text';
import {InterviewItem} from './interview-reading';
import {aiQuizTypes,fillMatches,type AiQuiz} from '@/content/journey';
import type {GradeResult} from '@/lib/grade-types';
import {gradeQuota,isWritten,PRACTICE_MAX,requestGrade,toGradeItem,toStandardItem,type GradeThinkState} from './grade-client';
import GradeModelPicker from './grade-model-picker';
import {AnnotatedAnswerBox,SelfScore} from './grade-view';
import {StandardAnswerBox,StandardAnswerButton,useStandardAnswer} from './standard-answer-box';
import {codeEditing,markdownEditing} from './code-input';
import CodeReference,{resolveCodeRefs,useCodeLang} from './code-reference';
import AiDock,{type DockRequest} from './ai-dock';
import {ListenButton,ReadingPassage} from '../components/speech-drill';
import VoiceButton from '../components/voice-input';
import AddToNoteButton from '../components/add-to-note';
import CodeAnswer,{buildFiveLangStarters,untouchedStarter} from './code-answer';
import {startersFor} from '@/content/code-starters';
import {detectPlaygroundLang,type PlaygroundContextMeta} from '@/lib/playground-bridge';
import {InlineRunOutput,useInlineCodeRun} from '../components/inline-code-run';
import {
 createThrottledCheckpoint,
 makeCheckpointKey,
 readAiCheckpoint,
 removeAiCheckpoint,
} from '@/lib/ai-checkpoint';

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
export default function QuestionCard({item,label,result,last,onAnswer,onNext,onPrev,playground,draft,onDraftChange,noteBackHref,onBeforeNoteLeave,onRegenerate,regenerating}:{item:Item;label?:string;result:Result|null;last:boolean;onAnswer:(r:Result)=>void;onNext:()=>void;onPrev?:()=>void;playground?:PlaygroundContextMeta;draft?:string;onDraftChange?:(v:string)=>void;noteBackHref?:string;onBeforeNoteLeave?:()=>void;onRegenerate?:()=>void;regenerating?:boolean}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const q=item.quiz,type=q.type??'single',done=result!==null;
 const codeStarters=useMemo(()=>{
  if(q.type!=='code')return undefined;
  const builtIn=startersFor(item.id);
  if(builtIn&&!q.starters)return builtIn;
  return buildFiveLangStarters(q.starters,q.code,q.q);
 },[item.id,q]);
 const hideRedundantCodeBox=Boolean(
  q.type==='code'&&codeStarters&&q.code&&/(?:TODO|请补全|pass\b|unimplemented!|NotImplementedError)/i.test(q.code),
 );
 const [chosen,setChosen]=useState<number[]>(()=>initChosen(q,result)),[text,setText]=useState(()=>result&&(q.type==='fill'||isWritten(q))?result.given:(draft??'')),[revealed,setRevealed]=useState(()=>result!==null);
 const draftCb=useRef(onDraftChange);
 useEffect(()=>{draftCb.current=onDraftChange},[onDraftChange]);
 const prevTextRef=useRef(text);
 useEffect(()=>{
  if(prevTextRef.current===text)return;
  prevTextRef.current=text;
  if(done)return;
  const clean=q.type==='code'&&untouchedStarter(item.id,text,codeStarters)?'':text;
  draftCb.current?.(clean);
 },[text,done,item.id,q.type,codeStarters]);
 const [live,setLive]=useState<GradeResult|null>(null),[retryLive,setRetryLive]=useState<GradeResult|null>(null),[liveThink,setLiveThink]=useState<GradeThinkState|null>(null),[retryThink,setRetryThink]=useState<GradeThinkState|null>(null); // AI 正在流式写出的评分
 const [grading,setGrading]=useState(false),[interruptedGrade,setInterruptedGrade]=useState<{live:GradeResult|null;think:GradeThinkState|null}|null>(null),[graded,setGraded]=useState<{result:GradeResult;remaining?:number;model?:string;think?:string;thinkSecs?:number}|null>(null),[gradeError,setGradeError]=useState('');
 const [editing,setEditing]=useState(false),[refOpen,setRefOpen]=useState(false),[explainOpen,setExplainOpen]=useState(false);
 // 今天剩余的 AI 评分次数，显示在提交按钮旁边，让人一眼知道写完可以交给 AI 评分。
 const [left,setLeft]=useState<number|null>(null);
 const gradeAbortRef=useRef<AbortController|null>(null),retryAbortRef=useRef<AbortController|null>(null);
 const gradeCpRef=useRef<ReturnType<typeof createThrottledCheckpoint<{answer:string;partial:GradeResult|null;think:GradeThinkState|null}>>|null>(null);
 useEffect(()=>{if(isWritten(q))void gradeQuota().then(setLeft)},[q]);
 useEffect(()=>{
  if(done||result||!isWritten(q))return;
  const cpKey=makeCheckpointKey('grade',item.id);
  const cp=readAiCheckpoint<{answer:string;partial:GradeResult|null;think:GradeThinkState|null}>(cpKey);
  if(!cp||(cp.status!=='running'&&cp.status!=='interrupted')||(!cp.data.partial&&!cp.data.think?.text))return;
  let alive=true;
  queueMicrotask(()=>{
   if(!alive)return;
   if(cp.data.answer&&!text.trim())setText(cp.data.answer);
   setInterruptedGrade({live:cp.data.partial,think:cp.data.think});
  });
  return()=>{alive=false};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[item.id]);
 useEffect(()=>()=>{
  gradeAbortRef.current?.abort();
  retryAbortRef.current?.abort();
  if(gradeCpRef.current){gradeCpRef.current.flush('interrupted');gradeCpRef.current.dispose();gradeCpRef.current=null}
 },[]);
 const stopGrade=()=>{
  gradeAbortRef.current?.abort();
  gradeCpRef.current?.clear();
  gradeCpRef.current=null;
  removeAiCheckpoint(makeCheckpointKey('grade',item.id));
  setInterruptedGrade(null);
 };
 const stopRetry=()=>{retryAbortRef.current?.abort()};
 const submitWritten=async()=>{if(!isWritten(q)||!text.trim()||untouchedStarter(item.id,text,codeStarters)||gradeAbortRef.current)return;
  const ctl=new AbortController();gradeAbortRef.current=ctl;
  const cpKey=makeCheckpointKey('grade',item.id);
  gradeCpRef.current?.dispose();
  const cp=createThrottledCheckpoint<{answer:string;partial:GradeResult|null;think:GradeThinkState|null}>(cpKey,'grade',450);
  gradeCpRef.current=cp;
  let curLive:GradeResult|null=null,curThink=null as GradeThinkState|null;
  cp.update({answer:text,partial:null,think:null},'running');
  cp.flush('running');
  setEditing(false);setInterruptedGrade(null);setGrading(true);setLive(null);setLiveThink(null);setGradeError('');
  const r=await requestGrade([toGradeItem(q,text)],p=>{curLive=p[0]??null;cp.update({answer:text,partial:curLive,think:curThink},'running');setLive(curLive)},undefined,t=>{curThink=t;cp.update({answer:text,partial:curLive,think:curThink},'running');setLiveThink(t)},ctl.signal);
  if(gradeAbortRef.current===ctl)gradeAbortRef.current=null;
  setGrading(false);setLive(null);setLiveThink(null);
  if(ctl.signal.aborted||(!r.ok&&r.aborted)){cp.clear();if(gradeCpRef.current===cp)gradeCpRef.current=null;void gradeQuota().then(setLeft);return}
  if(r.ok){
   cp.clear();if(gradeCpRef.current===cp)gradeCpRef.current=null;
   setRevealed(true);const res=r.results[0];setGraded({result:res,remaining:r.remaining,model:r.model,think:r.think,thinkSecs:r.thinkSecs});if(typeof r.remaining==='number')setLeft(r.remaining);onAnswer({correct:res.score>=0.6*res.max,given:text.trim()});
  }else{
   if(curLive||(curThink as GradeThinkState|null)?.text){cp.update({answer:text,partial:curLive,think:curThink},'interrupted');cp.flush('interrupted');setInterruptedGrade({live:curLive,think:curThink})}
   else{cp.clear()}
   if(gradeCpRef.current===cp)gradeCpRef.current=null;
   setGradeError(r.message);if(r.quota)setLeft(0);
  }};
 // 简答 / 代码题没答好之后，可以遮住参考答案再写一遍巩固，写完同样交给 AI 评分（不改变本题记分，题目仍留在错题本）。
 const [practising,setPractising]=useState(false),[retry,setRetry]=useState(''),[hideRef,setHideRef]=useState(true),[checked,setChecked]=useState(false);
 const [retryGrading,setRetryGrading]=useState(false),[retryGraded,setRetryGraded]=useState<GradeResult|null>(null),[retryGradedThink,setRetryGradedThink]=useState<{think?:string;secs?:number}|null>(null),[retryModel,setRetryModel]=useState(''),[retryError,setRetryError]=useState('');
 const gradeRetry=async()=>{if(!isWritten(q)||!retry.trim()||untouchedStarter(item.id,retry,codeStarters)||retryAbortRef.current)return;
  const ctl=new AbortController();retryAbortRef.current=ctl;
  setRetryGrading(true);setRetryLive(null);setRetryThink(null);setRetryError('');const r=await requestGrade([toGradeItem(q,retry)],p=>setRetryLive(p[0]),undefined,setRetryThink,ctl.signal);if(retryAbortRef.current===ctl)retryAbortRef.current=null;setRetryGrading(false);setRetryLive(null);setRetryThink(null);
  if(ctl.signal.aborted||(!r.ok&&r.aborted)){void gradeQuota().then(setLeft);return}
  if(r.ok){setChecked(true);setRetryGraded(r.results[0]);setRetryGradedThink({think:r.think,secs:r.thinkSecs});setRetryModel(r.model??'');if(typeof r.remaining==='number')setLeft(r.remaining)}else{setRetryError(r.message);if(r.quota)setLeft(0)}};
 const mainStd=useStandardAnswer({
  keyId:`main:${item.id}`,
  item:isWritten(q)?toStandardItem(q,untouchedStarter(item.id,text,codeStarters)?'':text):undefined,
  onRemaining:setLeft,
  onQuotaOut:()=>setLeft(0),
 });
 const retryStd=useStandardAnswer({
  keyId:`retry:${item.id}`,
  item:isWritten(q)?toStandardItem(q,untouchedStarter(item.id,retry,codeStarters)?'':retry):undefined,
  onRemaining:setLeft,
  onQuotaOut:()=>setLeft(0),
 });
 const referenceHidden=practising&&hideRef&&!checked;
 const optionState=(o:number)=>{if(!done)return chosen.includes(o)?'chosen':'';const right=q.type==='multi'?q.answers.includes(o):q.type!=='judge'&&'answer' in q&&q.answer===o;return right?'right':chosen.includes(o)?'wrong':''};
 // 答完后，每个错误选项下面说明它其实是什么、用来干什么。
 const why='why' in q?q.why:undefined;
 const option=(o:number,i:number,textValue:string,onClick:()=>void)=>{const state=optionState(o);return <button key={o} type="button" className={'ai-option '+state+(done?' is-done':'')} aria-disabled={done} onClick={()=>{if(!done)onClick()}}><b>{letters[i]}</b><span><EnWords text={textValue} inOption={!done}/>{done&&why?.[o]&&state!=='right'&&<small className="ai-why"><EnWords text={why[o]}/></small>}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>};
 const quizBackHref=noteBackHref||(playground?.subjectId?`/learn/${playground.subjectId}?quiz=${encodeURIComponent(item.id)}`:playground?.backHref);
 const quizSource=playground?.subjectName?`${playground.subjectName}${label?` · ${label}`:playground.levelTitle?` · ${playground.levelTitle}`:''}`:label??playground?.levelTitle;
 const quizPgMeta={hintLang:playground?.hintLang,title:q.q.slice(0,72),sourceLabel:quizSource,backHref:quizBackHref};
 const snippetLang=useMemo(()=>q.code?detectPlaygroundLang(q.code,playground?.hintLang):null,[q.code,playground?.hintLang]);
 const snippetRun=useInlineCodeRun(snippetLang,q.code??'',{
  title:q.q.slice(0,72),
  sourceLabel:quizSource,
  backHref:quizBackHref,
 });
 let input;
 if(q.type==='multi')input=<>{!done&&<p className="ai-choice-hint multi">{L('多选题','Multiple choice')}</p>}<div className="ai-options">{item.order.map((o,i)=>option(o,i,q.options[o],()=>setChosen(chosen.includes(o)?chosen.filter(x=>x!==o):[...chosen,o])))}</div>{!done&&<button className="button primary ai-next" disabled={!chosen.length} onClick={()=>{const ok=chosen.length===q.answers.length&&chosen.every(c=>q.answers.includes(c));onAnswer({correct:ok,given:chosen.map(c=>q.options[c]).join('；')})}}>{L('提交答案','Submit')}</button>}</>;
 else if(q.type==='judge')input=<div className="ai-options ai-judge">{[true,false].map(v=>{const o=v?1:0,state=!done?'':v===q.answer?'right':chosen.includes(o)?'wrong':'';return <button key={String(v)} className={'ai-option '+state} disabled={done} onClick={()=>{setChosen([o]);onAnswer({correct:v===q.answer,given:v?L('正确','True'):L('错误','False')})}}><b>{v?'✓':'✗'}</b><span>{v?L('正确','True'):L('错误','False')}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>})}</div>;
 else if(q.type==='fill')input=<form className="ai-fill" onSubmit={e=>{e.preventDefault();if(!done&&text.trim())onAnswer({correct:fillMatches(q.accepted,text),given:text.trim()})}}><input value={text} disabled={done} maxLength={200} placeholder={L('输入你的答案','Type your answer')} onChange={e=>setText(e.target.value)}/>{!done&&<button className="button primary" disabled={!text.trim()}>{L('提交','Submit')}</button>}</form>;
 else if(isWritten(q)){const locked=grading||((revealed||done||!!graded)&&!editing),afterScore=(done||!!graded)&&!referenceHidden;
  input=<div className="ai-written">{(grading||(interruptedGrade&&!editing)||(graded&&!editing))?<AnnotatedAnswerBox answer={text} result={grading?live:interruptedGrade?interruptedGrade.live:graded?.result} waiting={grading&&!live} live={grading} remaining={graded?.remaining} model={graded?.model} think={grading?liveThink?.text:interruptedGrade?interruptedGrade.think?.text:graded?.think} thinkSecs={grading?liveThink?.secs:interruptedGrade?interruptedGrade.think?.secs:graded?.thinkSecs} thinking={grading&&liveThink?.live} code={q.type!=='short'} fold={referenceHidden} onEdit={!grading&&!referenceHidden?()=>{setInterruptedGrade(null);setEditing(true)}:undefined} onStop={grading?stopGrade:undefined}/>:q.type==='code'?<CodeAnswer id={item.id} value={text} disabled={locked} rows={9} playground={quizPgMeta} customStarters={codeStarters} placeholder={L('写代码','Write code')} onChange={setText}/>:<textarea className={q.type!=='short'?'code':''} ref={q.type==='short'?markdownEditing:codeEditing} rows={5} value={text} disabled={locked} spellCheck placeholder={(L('用自己的话写下答案，提交后 AI 直接在答题区批注哪里有错并说明原因','Write your answer; AI will annotate errors and reasons directly in your answer box'))} onChange={e=>setText(e.target.value)}/>}
  {!revealed&&!done&&!graded&&<div className="ai-written-actions">{q.type!=='code'&&<VoiceButton className="written-voice" disabled={grading} onText={t=>setText(v=>v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}/>}<GradeModelPicker disabled={grading}/><button className="button primary" disabled={grading||!text.trim()||untouchedStarter(item.id,text,codeStarters)} onClick={()=>void submitWritten()}><Sparkles size={15}/>{grading?L('评分中…','Grading…'):interruptedGrade?L('继续评分','Continue Grading'):gradeError?L('重试评分','Retry'):L('AI 评分','AI Grade')}</button>{!grading&&interruptedGrade&&<button type="button" className="button secondary" onClick={()=>{removeAiCheckpoint(makeCheckpointKey('grade',item.id));setInterruptedGrade(null);setGradeError('')}}><X size={14}/>{L('清除','Clear')}</button>}
   {grading&&<button type="button" className="button ai-grade-stop" onClick={stopGrade}><Square size={14} fill="currentColor"/>{L('停止','Stop')}</button>}
   <button className="button secondary" disabled={grading} onClick={()=>setRevealed(true)}><Eye size={15}/>{L('参考答案','Reference')}</button></div>}
  {afterScore&&<div className="ai-written-actions">{q.type!=='code'&&!locked&&<VoiceButton className="written-voice" disabled={grading||mainStd.loading} onText={t=>setText(v=>v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}/>}<GradeModelPicker disabled={grading||mainStd.loading}/><button className="button primary" disabled={grading||mainStd.loading||!text.trim()||untouchedStarter(item.id,text,codeStarters)} onClick={()=>void submitWritten()}><Sparkles size={15}/>{grading?L('评分中…','Grading…'):graded?L('AI 重评','Re-grade'):L('AI 评分','AI Grade')}</button>
   {grading&&<button type="button" className="button ai-grade-stop" onClick={stopGrade}><Square size={14} fill="currentColor"/>{L('停止','Stop')}</button>}
   {!grading&&<button type="button" className="button secondary" onClick={()=>setEditing(v=>!v)}><PenLine size={14}/>{editing?(graded?L('看批注','Annotations'):L('完成','Done')):(graded||text.trim()?L('修改','Edit'):L('作答','Write'))}</button>}
   <StandardAnswerButton std={mainStd} disabled={grading}/></div>}
  {gradeError&&<div className="ai-grade-error ai-grade-retry"><span>{gradeError}</span>{!grading&&!done&&!graded&&text.trim()&&!untouchedStarter(item.id,text,codeStarters)&&<div className="ai-grade-retry-actions">{revealed&&<GradeModelPicker disabled={grading}/>}<button type="button" className="button secondary" onClick={()=>{setRevealed(false);void submitWritten()}}><RotateCcw size={14}/>{L('重试 AI 评分','Retry AI grading')}</button></div>}</div>}
  {afterScore&&mainStd.error&&<p className="ai-grade-error">{mainStd.error}</p>}
  {afterScore&&<StandardAnswerBox std={mainStd}/>}
  {revealed&&referenceHidden&&<p className="ai-ref-hidden">{L('参考答案已遮住，写完后再对照。','The reference is hidden until you finish.')}</p>}
  {revealed&&!referenceHidden&&!done&&!graded&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='code'?<CodeReference id={q.id} reference={q.reference} customRefs={q.references} playground={quizPgMeta}/>:<p><KeywordText text={q.reference}/></p>}<strong>{L('评分要点','Key points')}</strong><ul>{q.points.map(p=><li key={p}><EnWords text={p}/></li>)}</ul>
   <SelfScore points={q.points} scores={q.scores} max={PRACTICE_MAX} onDone={score=>onAnswer({correct:score>=0.6*PRACTICE_MAX,given:text.trim()})}/></div>}
  {afterScore&&<>
   <button type="button" className={'rc-toggle ai-ref-toggle'+(refOpen?' on':'')} aria-expanded={refOpen} onClick={()=>setRefOpen(v=>!v)}>
    {refOpen?<><EyeOff size={15}/>{L('收起参考答案与评分要点','Hide reference & key points')}<ChevronUp size={15}/></>:<><Eye size={15}/>{L('展开参考答案与评分要点','Show reference & key points')}<ChevronDown size={15}/></>}
   </button>
   {refOpen&&<div className="ai-reference"><strong>{L('参考答案','Reference answer')}</strong>{q.type==='code'?<CodeReference id={q.id} reference={q.reference} customRefs={q.references} playground={quizPgMeta}/>:<p><KeywordText text={q.reference}/></p>}<strong>{L('评分要点','Key points')}</strong><ul>{q.points.map(p=><li key={p}><EnWords text={p}/></li>)}</ul></div>}
  </>}</div>;}
 else{const s=q as Extract<AiQuiz,{answer:number}>;input=<>{!done&&<p className="ai-choice-hint single">{L('单选题','Single choice')}</p>}<div className="ai-options">{item.order.map((o,i)=>option(o,i,s.options[o],()=>{setChosen([o]);onAnswer({correct:o===s.answer,given:s.options[o]})}))}</div></>}
 const self=isWritten(q);
 const preferredLang=useCodeLang();
 const resolvedCodeRef=useMemo(()=>{
  if(q.type!=='code')return null;
  const data=resolveCodeRefs(q.id,q.reference,q.references);
  if(!data)return null;
  const lang=preferredLang&&data.refs[preferredLang]?preferredLang:data.base;
  return {lang,code:data.refs[lang]??q.reference};
 },[q,preferredLang]);
 // 常驻 AI 老师：答题前只给提示（不透露答案），答完后讲解这道题、可以追问；在同一道题下保留临时对话。
 const [ask,setAsk]=useState<DockRequest>();
 // 选项按学习者屏幕上的顺序（已打乱）发给 AI，AI 说的 A、B、C、D 才能和页面对上。
 const tutorQuiz={type:aiQuizTypes[type],q:q.q,code:q.code,options:'options' in q?(item.order.length===q.options.length?item.order.map(o=>q.options[o]):q.options):undefined,answer:resolvedCodeRef?resolvedCodeRef.code:answerText(q,L),explain:q.explain,given:result?.given,correct:result?.correct};
 const dockPrompts=done?[L('为什么是这个答案？我哪里想错了？','Why is this the answer? Where did I go wrong?'),L('每个选项分别错在哪里？','What is wrong with each option?'),L('举个例子帮我理解','Give me an example')]
  :[L('给我一点提示（不要告诉我答案）','Give me a hint (not the answer)'),L('这道题考的是什么知识点？','What concept is this testing?'),L('题目里的名词是什么意思？','What do the terms mean?')];
 const terms=done?findTerms(q.q,...('options' in q?q.options:[]),q.explain,q.type==='short'?q.reference:'',...(self?q.points:[])):[];
 const feedbackHref=`/feedback?type=question&questionId=${encodeURIComponent(item.id)}&title=${encodeURIComponent(q.q.slice(0,80))}`;
 const noteOptionsText='options' in q
  ?(item.order.length===q.options.length?item.order.map(o=>q.options[o]):q.options).map((opt,i)=>`- **${letters[i]}.** ${opt}`).join('\n')
  :'';
 const noteCodeFence=q.code?`\`\`\`${snippetLang||''}\n${q.code}\n\`\`\``:'';
 const noteQuestionOnly=[`### ${q.q}`,noteCodeFence,noteOptionsText].filter(Boolean).join('\n\n');
 const noteAnswerBlock=q.type==='code'
  ?`**${L('参考代码','Reference Code')}**：\n\`\`\`${resolvedCodeRef?.lang||snippetLang||''}\n${resolvedCodeRef?.code||q.reference}\n\`\`\``
  :`**${L('参考答案','Reference Answer')}**：${answerText(q,L)}`;
 const notePointsBlock=isWritten(q)&&q.points.length
  ?`**${L('核心得分要点','Key Points')}**：\n${q.points.map((p,i)=>`${i+1}. ${p}`).join('\n')}`
  :'';
 const noteMyGiven=result?.given?`**${L('我的作答','My Answer')}**：${result.given}（${result.correct?L('正确','Correct'):L('待巩固','Review')}）`:'';
 const noteQuestionAndAnswer=[
  noteQuestionOnly,
  noteMyGiven,
  noteAnswerBlock,
  notePointsBlock,
  `**${L('解析','Explanation')}**：${q.explain}`,
 ].filter(Boolean).join('\n\n');
 const parentSpeak=useEnglishSpeak();
 const isEnglishQuestion=parentSpeak||item.id.startsWith('en-')||item.level.startsWith('en-')||Boolean(q.say)||Boolean(q.passage);
 return <EnglishSpeakContext.Provider value={isEnglishQuestion}><CardSideNav className="ai-q-stage" onPrev={onPrev} onNext={!last||done?onNext:undefined} prevLabel={L('上一题','Previous')} nextLabel={last?L('查看结果','See results'):L('下一题','Next')} nextPrimary={done}><section className="ai-card ai-question"><div className="ai-tags"><span className={'ai-tag type t-'+type}>{aiQuizTypes[type]}{type==='multi'||type==='single'?L('题',''):''}</span>{label&&<span className="ai-tag">{label}</span>}<AddToNoteButton title={q.q.slice(0,56)} questionOnly={noteQuestionOnly} questionAndAnswer={noteQuestionAndAnswer} defaultMode={done?'question-and-answer':'question-only'} source={{kind:'quiz',label:quizSource||L('答题练习','Quiz Practice'),href:quizBackHref||'',questionId:item.id}} onBeforeNavigate={onBeforeNoteLeave}/>{onRegenerate&&<button type="button" className="ai-regen-btn" disabled={regenerating} onClick={onRegenerate}>{regenerating?<Loader2 size={12} className="ai-spin"/>:<RefreshCw size={12}/>}{regenerating?L('重出中…','Regenerating…'):L('AI 重出','Regenerate')}</button>}<a href={feedbackHref} target="_blank" rel="noreferrer" className="ai-feedback-link" title={L('觉得这道题有问题？点击反馈','Spot an issue with this question? Send feedback')}><MessageSquareWarning size={13}/>{L('反馈本题','Feedback')}</a></div><h2><EnWords text={q.q}/></h2>{q.say&&<ListenButton text={q.say}/>}{q.passage&&<ReadingPassage text={q.passage}/>}{q.code&&!hideRedundantCodeBox&&<div className="code-box ai-snippet-box">{done&&snippetLang&&<div className="code-box-actions">{snippetRun.busy?<button type="button" className="code-play stop" onClick={snippetRun.stop}><Square size={12} fill="currentColor"/>{L('停止','Stop')}</button>:<button type="button" className="code-play" onClick={()=>void snippetRun.run()} title={L('直接运行验证输出结果','Run snippet directly')}><Play size={13}/>{L('运行','Run')}</button>}</div>}<pre className="ai-snippet"><code>{done?snippetRun.displayCode:q.code}</code></pre>{done&&<InlineRunOutput running={snippetRun.running} completing={snippetRun.completing} result={snippetRun.result} error={snippetRun.error} onClear={snippetRun.clear} onAiFix={()=>void snippetRun.aiFix()} onOpenPlayground={snippetLang?snippetRun.openPlayground:undefined}/>}</div>}{!done&&<div className="ai-hint-row"><button type="button" className="ai-hint-btn" onClick={()=>setAsk({text:L('给我一点提示（不要告诉我答案）','Give me a hint (not the answer)'),n:Date.now()})}><Lightbulb size={15}/>{L('给我一点提示','Hint')}</button></div>}{input}
  {done&&<div className={'ai-explain '+(result.correct?'right':'wrong')+(explainOpen?' is-open':'')}><button type="button" className="ai-explain-toggle" aria-expanded={explainOpen} onClick={()=>setExplainOpen(v=>!v)}><strong>{result.correct?L('回答正确','Correct'):L('回答错误','Incorrect')}</strong><span className="ai-explain-arrow">{explainOpen?L('收起','Hide'):L('解析','Details')}{explainOpen?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</span></button>{explainOpen&&<div className="ai-explain-body">{!result.correct&&!self&&<p className="ai-answer">{L('正确答案：','Answer: ')}<EnWords text={answerText(q,L)}/></p>}{q.say&&!q.explain.includes(q.say)&&<p className="ai-say-transcript">{L('听力原句：','Transcript: ')}<strong lang="en"><EnWords text={q.say}/></strong></p>}<p><KeywordText text={q.explain}/></p>{terms.length>0&&<div className="ai-terms"><strong>{L('本题名词','Terms in this question')}</strong><dl>{terms.map(k=><div key={k}><dt><EnWords text={k}/></dt><dd><EnWords text={termDefinition(k,locale)}/></dd></div>)}</dl></div>}{q.interview&&<InterviewItem id={q.interview} label={L('延伸阅读 · 面试题','Further reading · interview')}/>}</div>}</div>}
  {done&&self&&!result.correct&&<div className="ai-retry">{!practising?<button className="button secondary" onClick={()=>setPractising(true)}><RotateCcw size={16}/>{L('再写一遍巩固','Write it again')}</button>:<>
   <strong>{L('再写一遍巩固','Write it again')}</strong>
   <label className="ai-hide-ref"><input type="checkbox" checked={hideRef} disabled={checked} onChange={e=>setHideRef(e.target.checked)}/>{L('写的时候遮住参考答案','Hide the reference while writing')}</label>
   {(retryGrading||retryGraded)?<AnnotatedAnswerBox answer={retry} result={retryGrading?retryLive:retryGraded} waiting={retryGrading&&!retryLive} live={retryGrading} remaining={left??undefined} model={retryModel} think={retryGrading?retryThink?.text:retryGradedThink?.think} thinkSecs={retryGrading?retryThink?.secs:retryGradedThink?.secs} thinking={retryGrading&&retryThink?.live} code={q.type!=='short'} onStop={retryGrading?stopRetry:undefined} onEdit={()=>{setChecked(false);setRetryGraded(null);setRetryGradedThink(null);setRetryModel('');setRetryError('')}}/>:q.type==='code'?<CodeAnswer id={item.id} value={retry} disabled={checked} rows={9} autoFocus playground={quizPgMeta} customStarters={codeStarters} placeholder={L('默写','Write from memory')} onChange={setRetry}/>:<textarea className={q.type!=='short'?'code':''} ref={q.type==='short'?markdownEditing:codeEditing} rows={5} autoFocus value={retry} disabled={checked} spellCheck placeholder={L('默写','Write from memory')} onChange={e=>setRetry(e.target.value)}/>}
   {!checked?<div className="ai-written-actions">{q.type!=='code'&&<VoiceButton className="written-voice" disabled={retryGrading} onText={t=>setRetry(v=>v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}/>}<GradeModelPicker disabled={retryGrading}/><button className="button primary" disabled={retryGrading||!retry.trim()||untouchedStarter(item.id,retry,codeStarters)} onClick={()=>void gradeRetry()}><Sparkles size={15}/>{retryGrading?L('评分中…','Grading…'):retryError?L('重试评分','Retry'):L('AI 评分','AI Grade')}</button>
    {retryGrading&&<button type="button" className="button ai-grade-stop" onClick={stopRetry}><Square size={14} fill="currentColor"/>{L('停止','Stop')}</button>}
    <button className="button secondary" disabled={retryGrading||!retry.trim()||untouchedStarter(item.id,retry,codeStarters)} onClick={()=>setChecked(true)}><Eye size={15}/>{L('参考答案','Reference')}</button>
    </div>:<div className="ai-retry-check">
    <p>{retryGraded?L('看看这次还差哪个得分点。这道题已经在错题本里，之后复习时还会再遇到。','See which key points are still missing. This question stays in your mistake book for later review.'):L('对照上面的参考答案和评分要点，逐条看看这次是否都写到了。这道题已经在错题本里，之后复习时还会再遇到。','Compare with the reference and key points above. This question stays in your mistake book for later review.')}</p>
    <div className="ai-std-bar"><GradeModelPicker disabled={retryGrading||retryStd.loading}/>{retry.trim()&&!untouchedStarter(item.id,retry,codeStarters)&&<button type="button" className="button primary" disabled={retryGrading||retryStd.loading} onClick={()=>{setChecked(false);void gradeRetry()}}><Sparkles size={15}/>{retryGraded?L('AI 重评','Re-grade'):L('AI 评分','AI Grade')}</button>}<StandardAnswerButton std={retryStd} disabled={retryGrading}/><button className="button secondary" onClick={()=>{setRetry('');setChecked(false);setRetryGraded(null);setRetryGradedThink(null);setRetryModel('');setRetryError('');retryStd.clear()}}><RotateCcw size={15}/>{L('重练','Again')}</button></div></div>}
   {retryError&&<div className="ai-grade-error ai-grade-retry"><span>{retryError}</span>{!retryGrading&&!retryGraded&&retry.trim()&&!untouchedStarter(item.id,retry,codeStarters)&&<div className="ai-grade-retry-actions">{checked&&<GradeModelPicker disabled={retryGrading}/>}<button type="button" className="button secondary" onClick={()=>{setChecked(false);void gradeRetry()}}><RotateCcw size={14}/>{L('重试 AI 评分','Retry AI grading')}</button></div>}</div>}
   {checked&&retryStd.error&&<p className="ai-grade-error">{retryStd.error}</p>}
   {checked&&<StandardAnswerBox std={retryStd}/>}</>}</div>}
  {done&&<button type="button" className="button secondary ai-ask-btn" onClick={()=>setAsk({text:L('我还是不太懂，为什么是这个答案？我哪里想错了？','I still do not get it — why this answer, and where did I go wrong?'),n:Date.now()})}><Bot size={16}/>{L('还是不懂？问 AI 老师','Still unsure? Ask the AI tutor')}</button>}
  {last&&done&&<div className="ai-nav-row"><button type="button" className="button primary ai-next" onClick={onNext}>{L('查看结果','See results')}<ArrowRight size={16}/></button></div>}</section></CardSideNav>
  <AiDock chatKey={'q:'+item.id+':'+item.order.join('')} context={{kind:done?'explain':'hint',quiz:tutorQuiz}} prompts={dockPrompts} request={ask} noteBackHref={quizBackHref} onBeforeNoteLeave={onBeforeNoteLeave}/></EnglishSpeakContext.Provider>}
