'use client';
import './ai.css';
import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,Check,Dices,Lock,NotebookPen,RotateCcw,Sparkles,Trophy,X} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import AccountMenu from '../components/account-menu';
import {aiLevels,aiPassRate,aiRank,type AiQuiz} from '@/content/ai-journey';

type Saved={best:Record<string,number>;passed:string[];mistakes:string[]};
type Mode='level'|'random'|'mistakes';
type Item={id:string;level:string;quiz:AiQuiz;order:number[]};
type View={kind:'map'}|{kind:'learn';level:number}|{kind:'quiz';mode:Mode;level?:number;items:Item[];index:number;picked:(number|null)[]}|{kind:'result';mode:Mode;level?:number;items:Item[];picked:(number|null)[]};
const empty:Saved={best:{},passed:[],mistakes:[]};
const allQuestions=aiLevels.flatMap(l=>l.quiz.map((quiz,i)=>({id:`${l.id}-${i}`,level:l.id,quiz})));
const byId=new Map(allQuestions.map(q=>[q.id,q]));
const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toItem=(q:{id:string;level:string;quiz:AiQuiz}):Item=>({...q,order:shuffle(q.quiz.options.map((_,i)=>i))});
// 进度保存在本地浏览器；同页写入通过自定义事件通知，其他标签页通过 storage 事件同步。
const changed='ai-journey-change';
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener(changed,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify)}};
const readStore=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};

export default function AiClient({username}:{username:string}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const key='ai-journey:v1:'+(username||'guest');
 const raw=useSyncExternalStore(subscribe,()=>readStore(key),()=>null),ready=useSyncExternalStore(subscribe,()=>true,()=>false),[view,setView]=useState<View>({kind:'map'});
 const saved=useMemo<Saved>(()=>{try{return raw?{...empty,...JSON.parse(raw)}:empty}catch{return empty}},[raw]);
 function persist(next:Saved){try{localStorage.setItem(key,JSON.stringify(next))}catch{}window.dispatchEvent(new Event(changed))}
 const scrollKey=view.kind+(view.kind==='quiz'?view.index:'');
 useEffect(()=>{window.scrollTo({top:0})},[scrollKey]);
 const passed=new Set(saved.passed),unlocked=(i:number)=>i===0||passed.has(aiLevels[i-1].id);
 const mistakes=saved.mistakes.filter(id=>byId.has(id));
 const pool=allQuestions.filter(q=>unlocked(aiLevels.findIndex(l=>l.id===q.level)));
 function start(mode:Mode,level?:number){const source=mode==='level'?aiLevels[level!].quiz.map((quiz,i)=>({id:`${aiLevels[level!].id}-${i}`,level:aiLevels[level!].id,quiz})):mode==='random'?shuffle(pool).slice(0,10):shuffle(mistakes.map(id=>byId.get(id)!));const items=source.map(toItem);if(items.length)setView({kind:'quiz',mode,level,items,index:0,picked:items.map(()=>null)})}
 function pick(option:number){if(view.kind!=='quiz'||view.picked[view.index]!==null)return;const picked=[...view.picked];picked[view.index]=option;setView({...view,picked})}
 function finish(v:Extract<View,{kind:'quiz'}>){const right=v.items.filter((it,i)=>v.picked[i]===it.quiz.answer),wrong=v.items.filter((it,i)=>v.picked[i]!==it.quiz.answer);
  const next:Saved={best:{...saved.best},passed:[...saved.passed],mistakes:[...new Set([...saved.mistakes.filter(id=>!right.some(r=>r.id===id)),...wrong.map(w=>w.id)])]};
  if(v.mode==='level'&&v.level!==undefined){const id=aiLevels[v.level].id,score=right.length/v.items.length;next.best[id]=Math.max(next.best[id]??0,score);if(score>=aiPassRate&&!next.passed.includes(id))next.passed.push(id)}
  persist(next);setView({kind:'result',mode:v.mode,level:v.level,items:v.items,picked:v.picked})}
 const header=<header className="ai-header"><Link href="/" className="ai-brand"><BookOpen size={23}/><span>{t("面试自习室")}<small>{L("AI 学习空间","AI learning space")}</small></span></Link><div className="top-actions"><LanguageControl/><ThemeControl/><AccountMenu username={username}/></div></header>;
 const back=<button className="ai-back" onClick={()=>setView({kind:'map'})}><ArrowLeft size={16}/>{L("返回关卡","Back to levels")}</button>;
 let body;
 if(view.kind==='learn'){const level=aiLevels[view.level];body=<>{back}<div className="ai-title"><span className="eyebrow">{L(`第 ${view.level+1} 关 · 学习`,`Level ${view.level+1} · Learn`)}</span><h1>{level.title}</h1><p>{level.summary}</p></div>
  <div className="ai-lessons">{level.lessons.map((s,i)=><section className="ai-card ai-lesson" key={i}><h2><span>{String(i+1).padStart(2,'0')}</span>{s.title}</h2><p>{s.body}</p>{s.code&&<pre><code>{s.code}</code></pre>}</section>)}</div>
  <div className="ai-cta"><p>{L(`学完了？共 ${level.quiz.length} 题，答对 ${Math.ceil(level.quiz.length*aiPassRate)} 题即可通关。`,`Done reading? Answer ${Math.ceil(level.quiz.length*aiPassRate)} of ${level.quiz.length} correctly to pass.`)}</p><button className="button primary" onClick={()=>start('level',view.level)}>{L("开始答题","Start quiz")}<ArrowRight size={16}/></button></div></>}
 else if(view.kind==='quiz'){const it=view.items[view.index],choice=view.picked[view.index],done=choice!==null,last=view.index===view.items.length-1;
  body=<>{back}<div className="ai-quiz-head"><span className="eyebrow">{view.mode==='level'?L(`第 ${view.level!+1} 关 · 答题`,`Level ${view.level!+1} · Quiz`):view.mode==='random'?L("随机练习","Random practice"):L("错题本","Mistake book")}</span><span>{view.index+1} / {view.items.length}</span></div><Progress value={(view.index+(done?1:0))/view.items.length*100}/>
  <section className="ai-card ai-question">{view.mode!=='level'&&<span className="ai-tag">{aiLevels.find(l=>l.id===it.level)?.title}</span>}<h2>{it.quiz.q}</h2><div className="ai-options">{it.order.map((o,i)=>{const state=!done?'':o===it.quiz.answer?'right':o===choice?'wrong':'';return <button key={o} className={'ai-option '+state} disabled={done} onClick={()=>pick(o)}><b>{'ABCD'[i]}</b><span>{it.quiz.options[o]}</span>{state==='right'&&<Check size={18}/>}{state==='wrong'&&<X size={18}/>}</button>})}</div>
  {done&&<div className={'ai-explain '+(choice===it.quiz.answer?'right':'wrong')}><strong>{choice===it.quiz.answer?L("回答正确","Correct"):L("回答错误，已加入错题本","Incorrect — added to the mistake book")}</strong><p>{it.quiz.explain}</p></div>}
  {done&&<button className="button primary ai-next" onClick={()=>last?finish(view):setView({...view,index:view.index+1})}>{last?L("查看结果","See results"):L("下一题","Next")}<ArrowRight size={16}/></button>}</section></>}
 else if(view.kind==='result'){const right=view.items.filter((it,i)=>view.picked[i]===it.quiz.answer).length,score=right/view.items.length,ok=score>=aiPassRate,lv=view.level;
  body=<>{back}<section className="ai-card ai-result"><Trophy size={40}/><h1>{view.mode==='level'?(ok?L("通关成功！","Level passed!"):L("差一点，再来一次","Almost — try again")):L("练习完成","Practice complete")}</h1><p className="ai-score">{right} / {view.items.length}<small>{Math.round(score*100)}%</small></p>
  {view.mode==='level'&&<p>{ok?(lv!==undefined&&lv<aiLevels.length-1?L(`已解锁第 ${lv+2} 关「${aiLevels[lv+1].title}」。`,`Level ${lv+2} is now unlocked.`):L("全部 14 关已通关，你已经是大神了。","All 14 levels passed — you made it to the top.")):L(`需要答对约 ${Math.round(aiPassRate*100)}% 才能通关，可以先回顾学习内容。`,`You need about ${Math.round(aiPassRate*100)}% to pass. Review the lesson first if needed.`)}</p>}
  <div className="ai-result-actions">{view.mode==='level'&&!ok&&<button className="button secondary" onClick={()=>setView({kind:'learn',level:lv!})}><BookOpen size={16}/>{L("回顾学习","Review lesson")}</button>}{view.mode==='level'&&<button className="button secondary" onClick={()=>start('level',lv)}><RotateCcw size={16}/>{L("重新答题","Retry")}</button>}{view.mode==='level'&&ok&&lv!==undefined&&lv<aiLevels.length-1&&<button className="button primary" onClick={()=>setView({kind:'learn',level:lv+1})}>{L("进入下一关","Next level")}<ArrowRight size={16}/></button>}{view.mode!=='level'&&<button className="button primary" onClick={()=>setView({kind:'map'})}>{L("返回关卡","Back to levels")}</button>}</div></section>
  <section className="ai-card ai-review"><h2>{L("本轮回顾","Review")}</h2>{view.items.map((it,i)=>{const good=view.picked[i]===it.quiz.answer;return <details key={it.id+i}><summary>{good?<Check size={16} className="right"/>:<X size={16} className="wrong"/>}{it.quiz.q}</summary><p>{L("正确答案：","Answer: ")}{it.quiz.options[it.quiz.answer]}</p><p className="muted">{it.quiz.explain}</p></details>})}</section></>}
 else{body=<><div className="ai-title"><span className="eyebrow">AI DEVELOPMENT</span><h1>{L("从小白到大神","From beginner to expert")}</h1><p>{L(`当前段位：${aiRank(passed.size)} · 已通关 ${passed.size} / ${aiLevels.length}。每关先学习，再答题，答对约 ${Math.round(aiPassRate*100)}% 的题即可通关。`,`Rank: ${aiRank(passed.size)} · ${passed.size} / ${aiLevels.length} levels passed. Learn first, then answer about ${Math.round(aiPassRate*100)}% correctly to pass.`)}</p>{locale==='en'&&<p className="muted">Lesson content is currently available in Chinese only.</p>}<Progress value={passed.size/aiLevels.length*100}/></div>
  {!username&&<p className="visitor-banner">{L("游客模式 · 闯关进度只保存在当前浏览器","Guest mode · progress is saved in this browser only")}</p>}
  <div className="ai-modes"><button className="ai-card ai-mode" disabled={!ready} onClick={()=>start('random')}><Dices size={22}/><strong>{L("随机练习（10 题）","Random practice (10)")}</strong><span>{L("从已解锁的关卡中随机抽题","Drawn from unlocked levels")}</span></button><button className="ai-card ai-mode" disabled={!ready||!mistakes.length} onClick={()=>start('mistakes')}><NotebookPen size={22}/><strong>{L(`错题本（${mistakes.length}）`,`Mistake book (${mistakes.length})`)}</strong><span>{mistakes.length?L("答对后自动移出错题本","Correct answers leave the book"):L("暂无错题","No mistakes yet")}</span></button></div>
  <ol className="ai-levels">{aiLevels.map((l,i)=>{const open=ready&&unlocked(i),done=passed.has(l.id),best=saved.best[l.id];return <li key={l.id}><button className={'ai-card ai-level'+(done?' done':'')+(open?'':' locked')} disabled={!open} onClick={()=>setView({kind:'learn',level:i})}><span className="ai-num">{i+1}</span><span className="ai-level-text"><strong>{l.title}</strong><small>{l.summary}</small></span><span className="ai-level-state">{done?<><Sparkles size={15}/>{L("已通关","Passed")} · {Math.round(best*100)}%</>:open?<>{best!==undefined?L(`最佳 ${Math.round(best*100)}%`,`Best ${Math.round(best*100)}%`):L("开始学习","Start")}<ArrowRight size={15}/></>:<><Lock size={14}/>{L("未解锁","Locked")}</>}</span></button></li>})}</ol>
  {(passed.size>0||mistakes.length>0)&&<button className="ai-reset" onClick={()=>{if(confirm(L("确定清空 AI 学习空间的全部进度和错题吗？","Clear all AI learning progress and mistakes?")))persist(empty)}}>{L("重置闯关进度","Reset progress")}</button>}</>}
 return <div className="ai-shell">{header}<main className="ai-main">{body}</main></div>
}
