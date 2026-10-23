'use client';
import './ai.css';
import {Fragment,useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,Check,Clapperboard,Dices,Lock,NotebookPen,RotateCcw,Sparkles,Trophy,X} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import AccountMenu from '../components/account-menu';
import {aiLevels,aiPassRate,aiRank,aiTier,type AiQuiz} from '@/content/ai-journey';
import QuestionCard,{answerText,type Item,type Result} from './question-card';
import AnimationPlayer from './animations/player';
import LessonCards from './lesson-cards';
import {LevelInterviews} from './interview-reading';
import {interviewByLevel} from '@/content/ai-links';
import {animations,animationById,animationsFor} from './animations';
import KeywordText from '../components/keyword-text';

type Saved={best:Record<string,number>;passed:string[];mistakes:string[]};
type Mode='level'|'random'|'mistakes';
type View={kind:'map'}|{kind:'learn';level:number}|{kind:'videos'}|{kind:'video';id:string;backTo?:{kind:'learn';level:number}}|{kind:'quiz';mode:Mode;level?:number;items:Item[];index:number;results:(Result|null)[]}|{kind:'result';mode:Mode;level?:number;items:Item[];results:Result[]};
const empty:Saved={best:{},passed:[],mistakes:[]};
const allQuestions=aiLevels.flatMap(l=>l.quiz.map(quiz=>({id:quiz.id,level:l.id,quiz})));
const byId=new Map(allQuestions.map(q=>[q.id,q]));
const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toItem=(q:{id:string;level:string;quiz:AiQuiz}):Item=>({...q,order:'options' in q.quiz?shuffle(q.quiz.options.map((_,i)=>i)):[]});
// 进度保存在本地浏览器；同页写入通过自定义事件通知，其他标签页通过 storage 事件同步。
const changed='ai-journey-change';
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener(changed,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify)}};
const readStore=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};

export default function AiClient({username}:{username:string}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const key='ai-journey:v1:'+(username||'guest');
 const raw=useSyncExternalStore(subscribe,()=>readStore(key),()=>null),ready=useSyncExternalStore(subscribe,()=>true,()=>false),[view,setViewState]=useState<View>({kind:'map'});
 // 每进入一个新画面就写入浏览器历史，浏览器“返回”可以逐级退回；答题过程中的变化只替换当前记录。
 const setView=(v:View)=>{window.history.pushState({aiView:v},'');setViewState(v)};
 const replaceView=(v:View)=>{window.history.replaceState({aiView:v},'');setViewState(v)};
 useEffect(()=>{window.history.replaceState({aiView:{kind:'map'}},'');const onPop=(e:PopStateEvent)=>setViewState((e.state?.aiView as View)??{kind:'map'});window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);
 const saved=useMemo<Saved>(()=>{try{return raw?{...empty,...JSON.parse(raw)}:empty}catch{return empty}},[raw]);
 function persist(next:Saved){try{localStorage.setItem(key,JSON.stringify(next))}catch{}window.dispatchEvent(new Event(changed))}
 const scrollKey=view.kind+(view.kind==='quiz'?view.index:view.kind==='video'?view.id:'');
 useEffect(()=>{window.scrollTo({top:0})},[scrollKey]);
 const passed=new Set(saved.passed),unlocked=(i:number)=>i===0||passed.has(aiLevels[i-1].id);
 const mistakes=saved.mistakes.filter(id=>byId.has(id));
 const pool=allQuestions.filter(q=>unlocked(aiLevels.findIndex(l=>l.id===q.level)));
 function start(mode:Mode,level?:number){const source=mode==='level'?allQuestions.filter(q=>q.level===aiLevels[level!].id):mode==='random'?shuffle(pool).slice(0,10):shuffle(mistakes.map(id=>byId.get(id)!));const items=source.map(toItem);if(items.length)setView({kind:'quiz',mode,level,items,index:0,results:items.map(()=>null)})}
 function answer(r:Result){if(view.kind!=='quiz'||view.results[view.index])return;const results=[...view.results];results[view.index]=r;replaceView({...view,results})}
 function finish(v:Extract<View,{kind:'quiz'}>){const results=v.results.map(r=>r??{correct:false,given:''}),right=v.items.filter((_,i)=>results[i].correct),wrong=v.items.filter((_,i)=>!results[i].correct);
  const next:Saved={best:{...saved.best},passed:[...saved.passed],mistakes:[...new Set([...saved.mistakes.filter(id=>!right.some(r=>r.id===id)),...wrong.map(w=>w.id)])]};
  if(v.mode==='level'&&v.level!==undefined){const id=aiLevels[v.level].id,score=right.length/v.items.length;next.best[id]=Math.max(next.best[id]??0,score);if(score>=aiPassRate&&!next.passed.includes(id))next.passed.push(id)}
  persist(next);replaceView({kind:'result',mode:v.mode,level:v.level,items:v.items,results})}
 const header=<header className="ai-header"><Link href="/" prefetch={false} className="ai-brand"><BookOpen size={23}/><span>{t("面试自习室")}<small>{L("AI 学习空间","AI learning space")}</small></span></Link><div className="top-actions"><LanguageControl/><ThemeControl/><AccountMenu username={username}/></div></header>;
 const back=<button className="ai-back" onClick={()=>setView({kind:'map'})}><ArrowLeft size={16}/>{L("返回关卡","Back to levels")}</button>;
 let body;
 const levelIndex=(id:string)=>aiLevels.findIndex(l=>l.id===id);
 const card=(a:typeof animations[number])=><button key={a.id} className="an-card" onClick={()=>setView({kind:'video',id:a.id})}><span className="an-icon">{a.icon}</span><strong>{a.title}</strong><small>{a.summary}</small><em>{L(`第 ${levelIndex(a.level)+1} 关 · ${aiLevels[levelIndex(a.level)].title} · ${a.scenes.length} 个分镜`,`Level ${levelIndex(a.level)+1} · ${a.scenes.length} scenes`)}</em></button>;
 if(view.kind==='videos'){body=<>{back}<div className="ai-title"><span className="eyebrow">ANIMATION CLASS</span><h1>{L('动画课堂','Animation class')}</h1><p>{L('答题答累了，就看几段动画吧：入门章节讲直观原理，难点动画把复杂机制拆成一步步的画面。','Tired of quizzes? Watch short animations: intuitive basics and step-by-step breakdowns of hard concepts.')}</p></div>
  <h2 className="an-group">{L('入门动画','Basics')}</h2><div className="an-list">{animations.filter(a=>a.kind==='basic').map(card)}</div>
  <h2 className="an-group">{L('难点动画','Hard concepts')}</h2><div className="an-list">{animations.filter(a=>a.kind==='advanced').map(card)}</div></>}
 else if(view.kind==='video'){const a=animationById(view.id)!,li=levelIndex(a.level),others=animations.filter(x=>x.id!==a.id&&x.kind===a.kind).slice(0,3);
  body=<><button className="ai-back" onClick={()=>setView(view.backTo??{kind:'videos'})}><ArrowLeft size={16}/>{view.backTo?L('返回学习','Back to the lesson'):L('返回动画课堂','Back to animations')}</button>
  <div className="ai-title"><span className="eyebrow">{a.kind==='basic'?L('入门动画','Basics'):L('难点动画','Hard concept')} · {L(`第 ${li+1} 关`,`Level ${li+1}`)}</span><h1>{a.icon} {a.title}</h1><p>{a.summary}</p></div>
  <section className="ai-card an-wrap"><AnimationPlayer key={a.id} animation={a}/></section>
  <div className="ai-cta"><p>{L(`看完了？去「${aiLevels[li].title}」答几道题巩固一下。`,`Done watching? Practice with level ${li+1}.`)}</p><button className="button primary" disabled={!unlocked(li)} onClick={()=>setView({kind:'learn',level:li})}>{unlocked(li)?L('去这一关','Go to this level'):L('关卡未解锁','Level locked')}<ArrowRight size={16}/></button></div>
  {others.length>0&&<><h2 className="an-group">{L('接着看','Watch next')}</h2><div className="an-list">{others.map(card)}</div></>}</>}
 else if(view.kind==='learn'){const level=aiLevels[view.level],films=animationsFor(level.id);body=<>{back}<div className="ai-title"><span className="eyebrow">{L(`第 ${view.level+1} 关 · ${aiTier(view.level).name} · 学习`,`Level ${view.level+1} · ${aiTier(view.level).nameEn} · Learn`)}</span><h1>{level.title}</h1><p>{level.summary}</p></div>
  {films.map(a=><button key={a.id} className="ai-card an-teaser" onClick={()=>setView({kind:'video',id:a.id,backTo:{kind:'learn',level:view.level}})}><span className="an-icon">{a.icon}</span><span><strong>{L('先看动画：','Watch first: ')}{a.title}</strong><small>{a.summary}</small></span><Clapperboard size={20}/></button>)}
  <LessonCards key={level.id} lessons={level.lessons} quizCount={level.quiz.length} need={Math.ceil(level.quiz.length*aiPassRate)} onStart={()=>start('level',view.level)}/>
  <LevelInterviews ids={interviewByLevel[level.id]??[]}/></>}
 else if(view.kind==='quiz'){const it=view.items[view.index],done=view.results[view.index]!==null,last=view.index===view.items.length-1;
  body=<>{back}<div className="ai-quiz-head"><span className="eyebrow">{view.mode==='level'?L(`第 ${view.level!+1} 关 · 答题`,`Level ${view.level!+1} · Quiz`):view.mode==='random'?L("随机练习","Random practice"):L("错题本","Mistake book")}</span><span>{view.index+1} / {view.items.length}</span></div><Progress value={(view.index+(done?1:0))/view.items.length*100}/>
  <QuestionCard key={it.id+'@'+view.index} item={it} label={view.mode!=='level'?aiLevels.find(l=>l.id===it.level)?.title:undefined} result={view.results[view.index]} last={last} onAnswer={answer} onNext={()=>last?finish(view):replaceView({...view,index:view.index+1})}/></>}
 else if(view.kind==='result'){const right=view.results.filter(r=>r.correct).length,score=right/view.items.length,ok=score>=aiPassRate,lv=view.level;
  body=<>{back}<section className="ai-card ai-result"><Trophy size={40}/><h1>{view.mode==='level'?(ok?L("通关成功！","Level passed!"):L("差一点，再来一次","Almost — try again")):L("练习完成","Practice complete")}</h1><p className="ai-score">{right} / {view.items.length}<small>{Math.round(score*100)}%</small></p>
  {view.mode==='level'&&<p>{ok?(lv!==undefined&&lv<aiLevels.length-1?L(`已解锁第 ${lv+2} 关「${aiLevels[lv+1].title}」。`,`Level ${lv+2} is now unlocked.`):L(`全部 ${aiLevels.length} 关已通关，你已经是大神了。`,`All ${aiLevels.length} levels passed — you made it to the top.`)):L(`需要答对约 ${Math.round(aiPassRate*100)}% 才能通关，可以先回顾学习内容。`,`You need about ${Math.round(aiPassRate*100)}% to pass. Review the lesson first if needed.`)}</p>}
  <div className="ai-result-actions">{view.mode==='level'&&!ok&&<button className="button secondary" onClick={()=>setView({kind:'learn',level:lv!})}><BookOpen size={16}/>{L("回顾学习","Review lesson")}</button>}{view.mode==='level'&&<button className="button secondary" onClick={()=>start('level',lv)}><RotateCcw size={16}/>{L("重新答题","Retry")}</button>}{view.mode==='level'&&ok&&lv!==undefined&&lv<aiLevels.length-1&&<button className="button primary" onClick={()=>setView({kind:'learn',level:lv+1})}>{L("进入下一关","Next level")}<ArrowRight size={16}/></button>}{view.mode!=='level'&&<button className="button primary" onClick={()=>setView({kind:'map'})}>{L("返回关卡","Back to levels")}</button>}</div>
  <button className="an-rest" onClick={()=>setView({kind:'videos'})}><Clapperboard size={16}/>{L('答累了？去动画课堂看几段动画放松一下','Tired? Relax with a few animations')}</button></section>
  <section className="ai-card ai-review"><h2>{L("本轮回顾","Review")}</h2>{view.items.map((it,i)=>{const r=view.results[i],written=it.quiz.type==='short'||it.quiz.type==='code';return <details key={it.id+i}><summary>{r.correct?<Check size={16} className="right"/>:<X size={16} className="wrong"/>}{it.quiz.q}</summary>{r.given&&!written&&<p>{L("你的答案：","Your answer: ")}{r.given}</p>}{written?<pre className="ai-review-ref">{answerText(it.quiz,L)}</pre>:<p>{L("正确答案：","Answer: ")}{answerText(it.quiz,L)}</p>}<p className="muted"><KeywordText text={it.quiz.explain}/></p></details>})}</section></>}
 else{body=<><Link href="/" prefetch={false} className="ai-back"><ArrowLeft size={16}/>{L("返回首页","Back to home")}</Link><div className="ai-title"><span className="eyebrow">AI DEVELOPMENT</span><h1>{L("从小白到大神","From beginner to expert")}</h1><p>{L(`当前段位：${aiRank(passed.size)} · 已通关 ${passed.size} / ${aiLevels.length}。每关先学习，再答题，答对约 ${Math.round(aiPassRate*100)}% 的题即可通关。`,`Rank: ${aiRank(passed.size)} · ${passed.size} / ${aiLevels.length} levels passed. Learn first, then answer about ${Math.round(aiPassRate*100)}% correctly to pass.`)}</p>{locale==='en'&&<p className="muted">Lesson content is currently available in Chinese only.</p>}<Progress value={passed.size/aiLevels.length*100}/></div>
  {!username&&<p className="visitor-banner">{L("游客模式 · 闯关进度只保存在当前浏览器","Guest mode · progress is saved in this browser only")}</p>}
  <div className="ai-modes"><button className="ai-card ai-mode" disabled={!ready} onClick={()=>start('random')}><Dices size={22}/><strong>{L("随机练习（10 题）","Random practice (10)")}</strong><span>{L("从已解锁的关卡中随机抽题","Drawn from unlocked levels")}</span></button><button className="ai-card ai-mode" disabled={!ready||!mistakes.length} onClick={()=>start('mistakes')}><NotebookPen size={22}/><strong>{L(`错题本（${mistakes.length}）`,`Mistake book (${mistakes.length})`)}</strong><span>{mistakes.length?L("答对后自动移出错题本","Correct answers leave the book"):L("暂无错题","No mistakes yet")}</span></button><button className="ai-card ai-mode" onClick={()=>setView({kind:'videos'})}><Clapperboard size={22}/><strong>{L(`动画课堂（${animations.length}）`,`Animation class (${animations.length})`)}</strong><span>{L("答累了就看动画，难点一看就懂","Short animations for tricky concepts")}</span></button></div>
  <ol className="ai-levels">{aiLevels.map((l,i)=>{const open=ready&&unlocked(i),done=passed.has(l.id),best=saved.best[l.id],tier=aiTier(i);return <Fragment key={l.id}>{i===tier.from&&<li className="ai-tier-head"><strong>{L(tier.name,tier.nameEn)}</strong><span>{L(`第 ${tier.from+1}–${tier.to+1} 关`,`Levels ${tier.from+1}–${tier.to+1}`)}</span></li>}<li><button className={'ai-card ai-level'+(done?' done':'')+(open?'':' locked')} disabled={!open} onClick={()=>setView({kind:'learn',level:i})}><span className="ai-num">{i+1}</span><span className="ai-level-text"><strong>{l.title}</strong><small>{l.summary} · {L(`${l.quiz.length} 题`,`${l.quiz.length} questions`)}</small></span><span className="ai-level-state">{done?<><Sparkles size={15}/>{L("已通关","Passed")} · {Math.round(best*100)}%</>:open?<>{best!==undefined?L(`最佳 ${Math.round(best*100)}%`,`Best ${Math.round(best*100)}%`):L("开始学习","Start")}<ArrowRight size={15}/></>:<><Lock size={14}/>{L("未解锁","Locked")}</>}</span></button></li></Fragment>})}</ol>
  {(passed.size>0||mistakes.length>0)&&<button className="ai-reset" onClick={()=>{if(confirm(L("确定清空 AI 学习空间的全部进度和错题吗？","Clear all AI learning progress and mistakes?")))persist(empty)}}>{L("重置闯关进度","Reset progress")}</button>}</>}
 return <div className="ai-shell">{header}<main className="ai-main">{body}</main></div>
}
