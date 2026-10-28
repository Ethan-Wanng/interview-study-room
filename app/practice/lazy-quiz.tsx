'use client';
import '../ai/ai.css';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Check,Dices,RotateCcw,Shuffle,Trophy} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';
import QuestionCard,{type Item,type Result} from '../ai/question-card';
import type {AiQuiz} from '@/content/journey';
import {Shell} from './training-hub';

export type LazySubject={id:string;name:string;nameEn:string;icon:string;finalSize:number};

// 各学科最终考试的题目按需加载，只在开始测验时下载所选学科的题。
const finals:Record<string,()=>Promise<AiQuiz[]>>={
 go:()=>import('@/content/exams/go-tests').then(m=>m.goFinal),
 ai:()=>import('@/content/exams/ai-tests').then(m=>m.aiFinal),
 backend:()=>import('@/content/exams/backend-tests').then(m=>m.beFinal),
 frontend:()=>Promise.all([import('@/content/exams/frontend-final-a'),import('@/content/exams/frontend-final-b')]).then(([a,b])=>[...a.feFinalA,...b.feFinalB]),
};
const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toItem=(subject:string,quiz:AiQuiz):Item=>({id:quiz.id,level:subject,quiz,order:'options' in quiz?shuffle(quiz.options.map((_,i)=>i)):[]});
// 题量平均分给所选学科；除不尽的余数随机补给其中几门（每门最多补一题）。
export function splitCount(total:number,ids:string[]){const base=Math.floor(total/ids.length),extra=new Set(shuffle(ids).slice(0,total%ids.length));
 return Object.fromEntries(ids.map(id=>[id,base+(extra.has(id)?1:0)])) as Record<string,number>}

type Stage={kind:'setup'}|{kind:'loading'}|{kind:'quiz';items:Item[];index:number;results:(Result|null)[];shares:Record<string,number>}|{kind:'result';items:Item[];results:Result[];shares:Record<string,number>};

// 「训练」里的懒人模式：选一门或多门学科、自定义题量，从各学科的最终考试里随机抽题，混在一起打乱顺序作答。
export default function LazyQuiz({username,subjects}:{username:string;subjects:LazySubject[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [picked,setPicked]=useState<string[]>(subjects.map(s=>s.id)),[count,setCount]=useState(20),[stage,setStage]=useState<Stage>({kind:'setup'}),[error,setError]=useState('');
 const chosen=subjects.filter(s=>picked.includes(s.id)),max=chosen.reduce((n,s)=>n+s.finalSize,0),n=Math.max(1,Math.min(count||1,max||1));
 const name=(id:string)=>{const s=subjects.find(x=>x.id===id);return s?`${s.icon} ${L(s.name,s.nameEn)}`:id};
 const toggle=(id:string)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 const start=async()=>{if(!chosen.length)return;setError('');setStage({kind:'loading'});
  try{const shares=splitCount(n,chosen.map(s=>s.id)),banks=await Promise.all(chosen.map(s=>finals[s.id]().then(qs=>[s.id,qs] as const)));
   // 每门学科先各自随机抽题，合在一起之后再把顺序整体打乱。
   const items=shuffle(banks.flatMap(([id,qs])=>shuffle(qs).slice(0,shares[id]).map(q=>toItem(id,q))));
   setStage({kind:'quiz',items,index:0,results:items.map(()=>null),shares})}
  catch{setError(L('题目加载失败，请检查网络后重试。','Failed to load questions.'));setStage({kind:'setup'})}};
 const again=(items:Item[],shares:Record<string,number>)=>{const next=shuffle(items).map(it=>toItem(it.level,it.quiz));setStage({kind:'quiz',items:next,index:0,results:next.map(()=>null),shares})};
 const back=<Link href="/practice" className="ai-back"><ArrowLeft size={16}/>{L('返回训练','Back to practice')}</Link>;

 if(stage.kind==='quiz'){const it=stage.items[stage.index],res=stage.results[stage.index],last=stage.index===stage.items.length-1;
  return <Shell username={username}>{back}
   <div className="ai-quiz-head"><span className="eyebrow">{L('懒人随机测验','Lazy random quiz')} · {name(it.level)}</span><span>{stage.index+1} / {stage.items.length}</span></div>
   <Progress value={(stage.index+(res?1:0))/stage.items.length*100}/>
   <QuestionCard key={stage.index+'-'+it.id} item={it} label={L(`${name(it.level)} · 最终考试题`,`${name(it.level)} · final exam`)} result={res} last={last}
    onAnswer={r=>setStage(s=>s.kind==='quiz'?{...s,results:s.results.map((x,i)=>i===s.index?r:x)}:s)}
    onNext={()=>setStage(s=>s.kind!=='quiz'?s:s.index<s.items.length-1?{...s,index:s.index+1}:{kind:'result',items:s.items,results:s.results.map(r=>r??{correct:false,given:''}),shares:s.shares})}/>
  </Shell>}

 if(stage.kind==='result'){const right=stage.results.filter(r=>r.correct).length,rate=Math.round(right/stage.items.length*100);
  const by=Object.keys(stage.shares).filter(id=>stage.shares[id]>0).map(id=>{const idx=stage.items.map((x,i)=>x.level===id?i:-1).filter(i=>i>=0);return {id,total:idx.length,right:idx.filter(i=>stage.results[i].correct).length}});
  const wrong=stage.items.map((x,i)=>({x,r:stage.results[i]})).filter(v=>!v.r.correct);
  return <Shell username={username}>{back}
   <section className="ai-card ai-result"><Trophy size={40}/><h1>{L(`答对 ${right} / ${stage.items.length} 题`,`${right} / ${stage.items.length} correct`)}</h1><p>{L(`正确率 ${rate}%。`,`${rate}% correct.`)}{rate>=70?L('状态很好，可以换一组新题继续。','Great — try a fresh set.'):L('错的题看看详解，再打乱顺序练一遍。','Review the explanations and try again shuffled.')}</p>
    <ul className="lazy-score">{by.map(b=><li key={b.id}><span>{name(b.id)}</span><b>{b.right} / {b.total}</b></li>)}</ul>
    {wrong.length>0&&<details className="lazy-wrong"><summary>{L(`查看答错的 ${wrong.length} 题`,`Review ${wrong.length} missed`)}</summary><ol>{wrong.map(({x})=><li key={x.id}><small>{name(x.level)}</small>{x.quiz.q}<em>{x.quiz.explain}</em></li>)}</ol></details>}
    <div className="ai-result-actions"><button className="button primary" onClick={()=>again(stage.items,stage.shares)}><Shuffle size={16}/>{L('打乱顺序再练一次','Shuffle and retry')}</button><button className="button secondary" onClick={()=>void start()}><Dices size={16}/>{L('换一组新题','New set')}</button><button className="button secondary" onClick={()=>setStage({kind:'setup'})}><RotateCcw size={16}/>{L('重新选择','Change settings')}</button></div></section>
  </Shell>}

 const base=chosen.length?Math.floor(n/chosen.length):0,rest=chosen.length?n%chosen.length:0;
 return <Shell username={username}>{back}
  <div className="ai-title"><span className="eyebrow">PRACTICE · LAZY</span><h1>{L('懒人随机测验','Lazy random quiz')}</h1><p>{L('选一门或几门学科，定好题量，就从这些学科的最终考试里随机抽题，混在一起、打乱顺序作答。不需要解锁，答完有详解。','Pick subjects and a question count; questions are drawn from each final exam, mixed and shuffled.')}</p></div>
  <section className="ai-card lazy-setup">
   <h2>{L('1. 选择学科（可多选）','1. Subjects')}</h2>
   <div className="lazy-chips">{subjects.map(s=><button key={s.id} type="button" className={'lazy-chip'+(picked.includes(s.id)?' on':'')} aria-pressed={picked.includes(s.id)} onClick={()=>toggle(s.id)}>{picked.includes(s.id)&&<Check size={15}/>}<span>{s.icon}</span>{L(s.name,s.nameEn)}<small>{L(`${s.finalSize} 题`,`${s.finalSize}`)}</small></button>)}</div>
   <h2>{L('2. 题目数量','2. Number of questions')}</h2>
   <div className="lazy-count"><input type="number" min={1} max={max||1} value={count} onChange={e=>setCount(Number(e.target.value))} aria-label={L('题目数量','Number of questions')}/><span>{L(`最多 ${max} 题`,`Up to ${max}`)}</span>{[10,20,30].filter(v=>v<=max).map(v=><button key={v} type="button" className={'lazy-chip'+(count===v?' on':'')} onClick={()=>setCount(v)}>{v}</button>)}</div>
   {chosen.length>0&&<p className="muted lazy-plan">{L(`每门学科 ${base} 题`,`${base} per subject`)}{rest>0&&L(`，余下 ${rest} 题随机补给其中 ${rest} 门`,`, ${rest} extra assigned at random`)}{L(`，共 ${n} 题。抽好之后整体打乱顺序。`,`, ${n} in total, shuffled.`)}</p>}
   {error&&<p className="ai-exam-lock">{error}</p>}
   <div className="ai-result-actions"><button className="button primary" disabled={!chosen.length||stage.kind==='loading'} onClick={()=>void start()}><Dices size={16}/>{stage.kind==='loading'?L('抽题中…','Drawing…'):L('开始测验','Start')}</button></div>
  </section>
 </Shell>}
