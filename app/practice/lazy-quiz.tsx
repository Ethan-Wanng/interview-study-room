'use client';
import '../ai/ai.css';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,Check,Dices,Play,RotateCcw,Save,Shuffle,Trash2,Trophy} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';
import {EnWords} from '../components/keyword-text';
import QuestionCard,{type Item,type Result} from '../ai/question-card';
import type {AiQuiz} from '@/content/journey';
import {answeredCount,cleanDrafts,parseLazyQuiz,readRawQuizStore,removeLazyQuiz,subscribeQuizSessions,writeLazyQuiz} from '@/lib/quiz-session';
import {Shell} from './training-hub';

// sizes：入门、进阶、高阶、专家四个阶段训练题库和最终考试题库的题数，顺序与 lazyLevels 一致。
export type LazySubject={id:string;name:string;nameEn:string;icon:string;space:'tech'|'language';sizes:number[]};
export const lazyLevels:{name:string;nameEn:string;kind:string;kindEn:string}[]=[
 {name:'入门',nameEn:'Beginner',kind:'入门阶段训练题',kindEn:'beginner training'},
 {name:'进阶',nameEn:'Intermediate',kind:'进阶阶段训练题',kindEn:'intermediate training'},
 {name:'高阶',nameEn:'Advanced',kind:'高阶阶段训练题',kindEn:'advanced training'},
 {name:'专家',nameEn:'Expert',kind:'专家阶段训练题',kindEn:'expert training'},
 {name:'最终',nameEn:'Final',kind:'最终考试题',kindEn:'final exam'},
];

// 各学科各难度的题库按需加载，只在开始测验时下载所选学科、所选难度的题。下标与 lazyLevels 一致。
type Bank=()=>Promise<AiQuiz[]>;
const banks:Record<string,Bank[]>={
 go:[()=>import('@/content/exams/go-train-1').then(m=>m.goTrain1),()=>import('@/content/exams/go-train-2').then(m=>m.goTrain2),()=>import('@/content/exams/go-train-3').then(m=>m.goTrain3),()=>import('@/content/exams/go-train-4').then(m=>m.goTrain4),()=>import('@/content/exams/go-tests').then(m=>m.goFinal)],
 rust:[()=>import('@/content/exams/rust-train-1').then(m=>m.rustTrain1),()=>import('@/content/exams/rust-train-2').then(m=>m.rustTrain2),()=>import('@/content/exams/rust-train-3').then(m=>m.rustTrain3),()=>import('@/content/exams/rust-train-4').then(m=>m.rustTrain4),()=>import('@/content/exams/rust-tests').then(m=>m.rustFinal)],
 python:[()=>import('@/content/exams/python-train-1').then(m=>m.pythonTrain1),()=>import('@/content/exams/python-train-2').then(m=>m.pythonTrain2),()=>import('@/content/exams/python-train-3').then(m=>m.pythonTrain3),()=>import('@/content/exams/python-train-4').then(m=>m.pythonTrain4),()=>import('@/content/exams/python-tests').then(m=>m.pythonFinal)],
 ai:[()=>import('@/content/exams/ai-train-1').then(m=>m.aiTrain1),()=>import('@/content/exams/ai-train-2').then(m=>m.aiTrain2),()=>import('@/content/exams/ai-train-3').then(m=>m.aiTrain3),()=>import('@/content/exams/ai-train-4').then(m=>m.aiTrain4),()=>import('@/content/exams/ai-tests').then(m=>m.aiFinal)],
 backend:[()=>Promise.all([import('@/content/exams/backend-train'),import('@/content/exams/backend-train-extra1')]).then(([a,b])=>[...a.beTrain1,...b.beTrain1Extra]),
  ()=>Promise.all([import('@/content/exams/backend-train'),import('@/content/exams/backend-train-extra2')]).then(([a,b])=>[...a.beTrain2,...b.beTrain2Extra]),
  ()=>Promise.all([import('@/content/exams/backend-train'),import('@/content/exams/backend-train-extra3')]).then(([a,b])=>[...a.beTrain3,...b.beTrain3Extra]),
  ()=>Promise.all([import('@/content/exams/backend-train'),import('@/content/exams/backend-train-extra2')]).then(([a,b])=>[...a.beTrain4,...b.beTrain4Extra]),
  ()=>import('@/content/exams/backend-tests').then(m=>m.beFinal)],
 frontend:[()=>import('@/content/exams/frontend-train1').then(m=>m.feTrain1),()=>import('@/content/exams/frontend-train2').then(m=>m.feTrain2),()=>import('@/content/exams/frontend-train34').then(m=>m.feTrain3),()=>import('@/content/exams/frontend-train34').then(m=>m.feTrain4),
  ()=>Promise.all([import('@/content/exams/frontend-final-a'),import('@/content/exams/frontend-final-b')]).then(([a,b])=>[...a.feFinalA,...b.feFinalB])],
 // 英语还没有最终考试题库，最后一项为空。
 english:[()=>import('@/content/exams/english-trainings').then(m=>m.englishTrainA1),()=>import('@/content/exams/english-trainings').then(m=>m.englishTrainA2),()=>import('@/content/exams/english-trainings').then(m=>m.englishTrainB1),()=>import('@/content/exams/english-trainings').then(m=>m.englishTrainIelts),()=>Promise.resolve([])],
};
const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toItem=(subject:string,quiz:AiQuiz):Item=>({id:quiz.id,level:subject,quiz,order:'options' in quiz?shuffle(quiz.options.map((_,i)=>i)):[]});
// 题量平均分给所选学科；除不尽的余数随机补给其中几门（每门最多补一题）。
// 某门学科的题库不够分时，按题库上限抽，多出来的继续平均分给还有余量的学科。
export function splitCount(total:number,caps:Record<string,number>){const out:Record<string,number>=Object.fromEntries(Object.keys(caps).map(id=>[id,0]));
 let left=Math.min(total,Object.values(caps).reduce((a,b)=>a+b,0));
 while(left>0){const open=Object.keys(caps).filter(id=>out[id]<caps[id]),each=Math.floor(left/open.length);
  if(!each){for(const id of shuffle(open).slice(0,left))out[id]++;break}
  for(const id of open){const add=Math.min(each,caps[id]-out[id]);out[id]+=add;left-=add}}
 return out}

type QuizStage={kind:'quiz';level:number;items:Item[];index:number;results:(Result|null)[];drafts?:Record<string,string>;shares:Record<string,number>;reviewing?:boolean};
type Stage={kind:'setup'}|{kind:'loading'}|QuizStage|{kind:'result';level:number;items:Item[];results:Result[];shares:Record<string,number>};

// 「训练」里的懒人模式：选一门或多门学科、自定义题量，从各学科的最终考试里随机抽题，混在一起打乱顺序作答。
export default function LazyQuiz({username,subjects}:{username:string;subjects:LazySubject[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 // 语言类学科（英语）默认不选，避免和技术题混在一起。
 const [picked,setPicked]=useState<string[]>(subjects.filter(s=>s.space==='tech').map(s=>s.id)),[level,setLevel]=useState(lazyLevels.length-1),[count,setCount]=useState(20),[stage,setStage]=useState<Stage>({kind:'setup'}),[error,setError]=useState('');
 const lazyKey='lazy-quiz:v1:'+(username||'guest');
 const rawSaved=useSyncExternalStore(subscribeQuizSessions,()=>readRawQuizStore(lazyKey),()=>null);
 const savedLazy=useMemo(()=>parseLazyQuiz(rawSaved),[rawSaved]);
 const draftsRef=useRef<Record<string,string>>({}),draftTimerRef=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),saveHintTimerRef=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [justSaved,setJustSaved]=useState(false);

 const persistStage=(s:QuizStage,drafts?:Record<string,string>,force?:boolean)=>{
  if(!force&&s.reviewing)return;
  const d=cleanDrafts(drafts??draftsRef.current);
  if(!force&&s.index===0&&!s.results.some(Boolean)&&!d)return;
  writeLazyQuiz(lazyKey,{level:s.level,items:s.items.map(it=>({id:it.id,subject:it.level,order:it.order})),index:s.index,results:s.results,drafts:d,shares:s.shares,updatedAt:Date.now()});
 };
 const saveNow=(s:QuizStage)=>{
  clearTimeout(draftTimerRef.current);
  persistStage(s,draftsRef.current,true);
  setJustSaved(true);
  clearTimeout(saveHintTimerRef.current);
  saveHintTimerRef.current=setTimeout(()=>setJustSaved(false),1600);
 };
 useEffect(()=>{
  if(stage.kind!=='quiz')return;
  const flush=()=>persistStage(stage,draftsRef.current);
  window.addEventListener('pagehide',flush);
  return()=>{window.removeEventListener('pagehide',flush);clearTimeout(draftTimerRef.current)};
 });
 useEffect(()=>()=>{clearTimeout(draftTimerRef.current);clearTimeout(saveHintTimerRef.current)},[]);

 const chosen=subjects.filter(s=>picked.includes(s.id)),caps=Object.fromEntries(chosen.map(s=>[s.id,s.sizes[level]??0])) as Record<string,number>;
 const max=Object.values(caps).reduce((a,b)=>a+b,0),n=Math.max(1,Math.min(count||1,max||1));
 const name=(id:string)=>{const s=subjects.find(x=>x.id===id);return s?`${s.icon} ${L(s.name,s.nameEn)}`:id};
 const toggle=(id:string)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 const start=async()=>{if(!chosen.length)return;setError('');setStage({kind:'loading'});
  try{const shares=splitCount(n,caps),loaded=await Promise.all(chosen.map(s=>banks[s.id][level]().then(qs=>[s.id,qs] as const)));
   // 每门学科先各自随机抽题，合在一起之后再把顺序整体打乱。
   const items=shuffle(loaded.flatMap(([id,qs])=>shuffle(qs).slice(0,shares[id]).map(q=>toItem(id,q))));
   removeLazyQuiz(lazyKey);draftsRef.current={};setJustSaved(false);
   setStage({kind:'quiz',level,items,index:0,results:items.map(()=>null),drafts:{},shares})}
  catch{setError(L('题目加载失败，请检查网络后重试。','Failed to load questions.'));setStage({kind:'setup'})}};
 const resumeSaved=async(override?:typeof savedLazy)=>{
  const target=override??savedLazy;
  if(!target)return;
  setError('');setStage({kind:'loading'});
  try{
   const subIds=[...new Set(target.items.map(x=>x.subject))].filter(id=>banks[id]?.[target.level]);
   const loaded=await Promise.all(subIds.map(id=>banks[id][target.level]().then(qs=>[id,qs] as const)));
   const lookup=new Map<string,AiQuiz>();
   for(const [sid,qs] of loaded)for(const q of qs)lookup.set(sid+':'+q.id,q);
   const items:Item[]=[],results:(Result|null)[]=[];
   target.items.forEach((rawIt,i)=>{
    const quiz=lookup.get(rawIt.subject+':'+rawIt.id);
    if(!quiz)return;
    const order='options' in quiz?(rawIt.order.length===quiz.options.length?rawIt.order:quiz.options.map((_,idx)=>idx)):[];
    items.push({id:rawIt.id,level:rawIt.subject,quiz,order});
    results.push(target.results[i]??null);
   });
   if(!items.length){removeLazyQuiz(lazyKey);setStage({kind:'setup'});return}
   const index=Math.min(Math.max(0,target.index),items.length-1),drafts={...(target.drafts??{})};
   draftsRef.current=drafts;setJustSaved(false);
   setStage({kind:'quiz',level:target.level,items,index,results,drafts,shares:target.shares});
  }catch{
   setError(L('题目加载失败，请检查网络后重试。','Failed to load questions.'));setStage({kind:'setup'});
  }
 };
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('resume')!=='1')return;
  const saved=parseLazyQuiz(readRawQuizStore(lazyKey));
  if(saved)void resumeSaved(saved);
 },[lazyKey]); // eslint-disable-line react-hooks/exhaustive-deps
 const again=(lv:number,items:Item[],shares:Record<string,number>)=>{const next=shuffle(items).map(it=>toItem(it.level,it.quiz));removeLazyQuiz(lazyKey);draftsRef.current={};setJustSaved(false);setStage({kind:'quiz',level:lv,items:next,index:0,results:next.map(()=>null),drafts:{},shares})};
 const levelName=(lv:number)=>L(lazyLevels[lv]?.name??'',lazyLevels[lv]?.nameEn??'');
 const back=<a href="/practice" className="ai-back" onClick={()=>{if(stage.kind==='quiz'){clearTimeout(draftTimerRef.current);persistStage(stage,draftsRef.current)}}}><ArrowLeft size={16}/>{L('返回训练','Back to practice')}</a>;

 if(stage.kind==='quiz'){const it=stage.items[stage.index],res=stage.results[stage.index],last=stage.index===stage.items.length-1;
  return <Shell username={username}>{back}
   <div className="ai-quiz-head"><span className="eyebrow">{L('懒人随机测验','Lazy random quiz')} · {levelName(stage.level)} · {name(it.level)}</span><div className="ai-quiz-head-right"><button type="button" className={'ai-quiz-save'+(justSaved?' saved':'')} onClick={()=>saveNow(stage)}>{justSaved?<><Check size={14}/>{L('已保存','Saved')}</>:<><Save size={14}/>{L('保存记录','Save')}</>}</button><span>{stage.index+1} / {stage.items.length}</span></div></div>
   <Progress value={(stage.index+(res?1:0))/stage.items.length*100}/>
   <QuestionCard key={stage.index+'-'+it.id} item={it} label={L(`${name(it.level)} · ${lazyLevels[stage.level].kind}`,`${name(it.level)} · ${lazyLevels[stage.level].kindEn}`)} result={res} draft={draftsRef.current[it.id]??stage.drafts?.[it.id]}
    noteBackHref="/practice/lazy?resume=1"
    onBeforeNoteLeave={()=>{clearTimeout(draftTimerRef.current);persistStage(stage,draftsRef.current,true)}}
    onDraftChange={val=>{if(val.trim())draftsRef.current[it.id]=val;else delete draftsRef.current[it.id];clearTimeout(draftTimerRef.current);draftTimerRef.current=setTimeout(()=>persistStage(stage,draftsRef.current),500)}}
    last={last}
    onAnswer={r=>{delete draftsRef.current[it.id];clearTimeout(draftTimerRef.current);const nextStage:QuizStage={...stage,results:stage.results.map((x,i)=>i===stage.index?r:x),drafts:{...draftsRef.current}};setStage(nextStage);persistStage(nextStage,draftsRef.current)}}
    onPrev={stage.index>0?()=>{clearTimeout(draftTimerRef.current);const nextStage:QuizStage={...stage,index:stage.index-1,drafts:{...draftsRef.current}};setStage(nextStage);persistStage(nextStage,draftsRef.current)}:undefined}
    onNext={()=>{clearTimeout(draftTimerRef.current);if(stage.index<stage.items.length-1){const nextStage:QuizStage={...stage,index:stage.index+1,drafts:{...draftsRef.current}};setStage(nextStage);persistStage(nextStage,draftsRef.current)}else{removeLazyQuiz(lazyKey);draftsRef.current={};setStage({kind:'result',level:stage.level,items:stage.items,results:stage.results.map(r=>r??{correct:false,given:''}),shares:stage.shares})}}}/>
  </Shell>}

 if(stage.kind==='result'){const right=stage.results.filter(r=>r.correct).length,rate=Math.round(right/stage.items.length*100);
  const by=Object.keys(stage.shares).filter(id=>stage.shares[id]>0).map(id=>{const idx=stage.items.map((x,i)=>x.level===id?i:-1).filter(i=>i>=0);return {id,total:idx.length,right:idx.filter(i=>stage.results[i].correct).length}});
  const wrong=stage.items.map((x,i)=>({x,r:stage.results[i]})).filter(v=>!v.r.correct);
  return <Shell username={username}>{back}
   <section className="ai-card ai-result"><Trophy size={40}/><h1>{L(`答对 ${right} / ${stage.items.length} 题`,`${right} / ${stage.items.length} correct`)}</h1><p>{L(`${lazyLevels[stage.level].name}难度，正确率 ${rate}%。`,`${levelName(stage.level)} · ${rate}% correct.`)}{rate>=70?L('状态很好，可以换一组新题继续。','Great — try a fresh set.'):L('错的题看看详解，再打乱顺序练一遍。','Review the explanations and try again shuffled.')}</p>
    <ul className="lazy-score">{by.map(b=><li key={b.id}><span>{name(b.id)}</span><b>{b.right} / {b.total}</b></li>)}</ul>
    {wrong.length>0&&<details className="lazy-wrong"><summary>{L(`查看答错的 ${wrong.length} 题`,`Review ${wrong.length} missed`)}</summary><ol>{wrong.map(({x})=><li key={x.id}><small>{name(x.level)}</small><EnWords text={x.quiz.q}/>{x.quiz.say&&!x.quiz.explain.includes(x.quiz.say)&&<em lang="en">{L('听力原句：','Transcript: ')}<EnWords text={x.quiz.say}/></em>}<em><EnWords text={x.quiz.explain}/></em></li>)}</ol></details>}
    <div className="ai-result-actions"><button className="button secondary" onClick={()=>setStage({kind:'quiz',level:stage.level,items:stage.items,index:stage.items.length-1,results:stage.results,shares:stage.shares,reviewing:true})}><ArrowLeft size={16}/>{L('返回上一题','Back to last question')}</button><button className="button primary" onClick={()=>again(stage.level,stage.items,stage.shares)}><Shuffle size={16}/>{L('打乱顺序再练一次','Shuffle and retry')}</button><button className="button secondary" onClick={()=>void start()}><Dices size={16}/>{L('换一组新题','New set')}</button><button className="button secondary" onClick={()=>setStage({kind:'setup'})}><RotateCcw size={16}/>{L('重新选择','Change settings')}</button></div></section>
  </Shell>}

 const base=chosen.length?Math.floor(n/chosen.length):0,rest=chosen.length?n%chosen.length:0,short=chosen.filter(s=>caps[s.id]<Math.ceil(n/chosen.length));
 return <Shell username={username}>{back}
  <div className="ai-title"><span className="eyebrow">PRACTICE · LAZY</span><h1>{L('懒人随机测验','Lazy random quiz')}</h1></div>
  {savedLazy&&<div className="ai-saved-list"><div className="ai-card ai-saved-row"><span className="ai-saved-meta"><strong>{L('懒人随机测验','Lazy random quiz')} · {levelName(savedLazy.level)}</strong><em>{answeredCount(savedLazy.results)}/{savedLazy.items.length}</em></span><div className="ai-saved-actions"><button type="button" className="button primary ai-saved-resume" disabled={stage.kind==='loading'} onClick={()=>void resumeSaved()}><Play size={14}/>{L('继续答题','Resume')}</button><button type="button" className="ai-saved-del" onClick={()=>removeLazyQuiz(lazyKey)} aria-label={L('删除记录','Delete record')} title={L('删除记录','Delete')}><Trash2 size={14}/></button></div></div></div>}
  <section className="ai-card lazy-setup">
   <h2>{L('1. 选择学科（可多选）','1. Subjects')}</h2>
   <div className="lazy-chips">{subjects.map(s=><button key={s.id} type="button" className={'lazy-chip'+(picked.includes(s.id)?' on':'')} aria-pressed={picked.includes(s.id)} onClick={()=>toggle(s.id)}>{picked.includes(s.id)&&<Check size={15}/>}<span>{s.icon}</span>{L(s.name,s.nameEn)}<small>{L(`${s.sizes[level]??0} 题`,`${s.sizes[level]??0}`)}</small></button>)}</div>
   <h2>{L('2. 选择难度','2. Level')}</h2>
   <div className="lazy-chips" role="radiogroup" aria-label={L('难度','Level')}>{lazyLevels.map((lv,i)=><button key={lv.name} type="button" role="radio" aria-checked={level===i} className={'lazy-chip'+(level===i?' on':'')} onClick={()=>setLevel(i)}>{level===i&&<Check size={15}/>}{L(lv.name,lv.nameEn)}<small>{L(i<4?'阶段训练':'考试',i<4?'training':'exam')}</small></button>)}</div>
   <h2>{L('3. 题目数量','3. Number of questions')}</h2>
   <div className="lazy-count"><input type="number" min={1} max={max||1} value={count} onChange={e=>setCount(Number(e.target.value))} aria-label={L('题目数量','Number of questions')}/><span>{L(`最多 ${max} 题`,`Up to ${max}`)}</span>{[10,20,30].filter(v=>v<=max).map(v=><button key={v} type="button" className={'lazy-chip'+(count===v?' on':'')} onClick={()=>setCount(v)}>{v}</button>)}</div>
   {chosen.length>0&&(short.length?<p className="muted lazy-plan">{L(`${short.map(s=>`${s.name}${levelName(level)}只有 ${caps[s.id]} 题`).join('、')}，按上限全部抽取，其余平均分给其他学科，共 ${n} 题。抽好之后整体打乱顺序。`,`Some banks are small and are used in full; the rest is split among the others, ${n} in total, shuffled.`)}</p>
    :<p className="muted lazy-plan">{L(`每门学科 ${base} 题`,`${base} per subject`)}{rest>0&&L(`，余下 ${rest} 题随机补给其中 ${rest} 门`,`, ${rest} extra assigned at random`)}{L(`，共 ${n} 题`,`, ${n} in total`)}</p>)}
   {error&&<p className="ai-exam-lock">{error}</p>}
   <div className="ai-result-actions"><button className="button primary" disabled={!chosen.length||stage.kind==='loading'} onClick={()=>void start()}><Dices size={16}/>{stage.kind==='loading'?L('抽题中…','Drawing…'):L('开始测验','Start')}</button></div>
  </section>
 </Shell>}
