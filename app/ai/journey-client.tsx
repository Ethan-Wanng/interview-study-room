'use client';
import './ai.css';
import {Fragment,useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowRight,Award,BookOpen,BookMarked,Check,Clapperboard,ClipboardCheck,Dices,Dumbbell,Headphones,Lock,NotebookPen,RotateCcw,Sparkles,Trophy,X} from 'lucide-react';
import {lazyLoaders} from './animations/lazy';
import {lazyAnimation,lazyMinutes,type LazyEpisode} from './animations/lazy/engine';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {Animation} from './animations/types';
import {Progress} from '@/components/ui/progress';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import AccountMenu from '../components/account-menu';
import {aiQuizTypes,examKindNames,PAPER_QUESTIONS,trainingCap,rankAt,tierAt,type AiQuiz,type AiQuizType,type Exam} from '@/content/journey';
import QuestionCard,{answerText,type Item,type Result} from './question-card';
import AnimationPlayer from './animations/player';
import LessonCards from './lesson-cards';
import {StackPicker,resolveLevels,useStack} from './stack';
import {InterviewSource,LevelInterviews,type InterviewDoc} from './interview-reading';
import type {Subject} from '../learn/subject';
import SiteNav from '../components/site-nav';
import PaperExam from './paper/paper-exam';
import {hasPaper} from '@/content/papers';
import {PAPER_MINUTES,PAPER_TOTAL} from '@/content/papers/types';
import KeywordText,{EnglishSpeakContext,EnWords} from '../components/keyword-text';
import {MistakeBookView,SubjectQuestionSearch,type BankEntry} from './question-browser';
import ReciteView from './recite';
import {useDockPresence} from './ai-dock';
import {rankCard} from '@/lib/text-match';
import {noteLocalWrite} from '@/app/components/cloud-sync';
const CARRY_RATE=0.8;

// carried：旧进度已经按“训练或考试 80% 以上带动关卡通过”补算过（新写入的进度一律带上，只有规则上线前的旧进度会补算一次）。
type Saved={best:Record<string,number>;passed:string[];mistakes:string[];carried?:boolean};
type Mode='level'|'random'|'mistakes'|'exam';
type View={kind:'map'}|{kind:'mistakes'}|{kind:'paper';id:string}|{kind:'recite'}|{kind:'learn';level:number;card?:number}|{kind:'videos'}|{kind:'video';id:string;backTo?:{kind:'learn';level:number}}|{kind:'quiz';mode:Mode;level?:number;exam?:string;items:Item[];index:number;results:(Result|null)[]}|{kind:'result';mode:Mode;level?:number;exam?:string;items:Item[];results:Result[]}|{kind:'exam';id:string}|{kind:'lazy'};
const empty:Saved={best:{},passed:[],mistakes:[]};
const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toItem=(q:{id:string;level:string;quiz:AiQuiz}):Item=>({...q,order:'options' in q.quiz?shuffle(q.quiz.options.map((_,i)=>i)):[]});
// 阶段训练每次只抽一部分题：先出这一轮还没做过的题，没做过的不够时再从做过的里补，并开始新一轮。记录存在本地浏览器。
function rotate<T extends {id:string}>(examId:string,bank:T[],n:number):T[]{const key='train-seen:'+examId;let seen:string[]=[];try{seen=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
 const fresh=shuffle(bank.filter(q=>!seen.includes(q.id))),old=shuffle(bank.filter(q=>seen.includes(q.id)));
 const extra=fresh.length>=n?[]:old.slice(0,n-fresh.length),picked=shuffle([...fresh.slice(0,n),...extra]);
 const next=extra.length?extra.map(q=>q.id):[...seen.filter(id=>bank.some(q=>q.id===id)),...picked.map(q=>q.id)];
 try{localStorage.setItem(key,JSON.stringify(next))}catch{}
 return picked}
// 进度保存在本地浏览器；同页写入通过自定义事件通知，其他标签页通过 storage 事件同步。
const changed='ai-journey-change';
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener(changed,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify)}};
const readStore=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};

// 闯关学习：一个学科的关卡地图、卡片学习、答题、随机练习和错题本。进度保存在本地浏览器。
export default function JourneyClient({username,subject,interviews}:{username:string;subject:Subject;interviews:InterviewDoc[]}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [stack,setStack]=useStack(subject.storageKey,subject.stacks),{backend,frontend}=stack;
 // 项目实战：卡片和代码题换成所选技术栈的版本。
 const levels=useMemo(()=>subject.stacks?resolveLevels(subject.levels,{backend,frontend}):subject.levels,[subject,backend,frontend]);
 const stackPicker=(compact?:boolean)=>subject.stacks&&<StackPicker stacks={subject.stacks} value={stack} onChange={setStack} compact={compact}/>;
 const {passRate}=subject,rankOf=(n:number)=>rankAt(subject.ranks,n),tierOf=(i:number)=>tierAt(subject.tiers,i);
 const allQuestions=levels.flatMap(l=>l.quiz.map(quiz=>({id:quiz.id,level:l.id,quiz}))),examQuestions=subject.exams.flatMap(e=>e.quiz.map(quiz=>({id:quiz.id,level:e.id,quiz}))),byId=new Map([...allQuestions,...examQuestions].map(q=>[q.id,q])),interviewMap=new Map(interviews.map(d=>[d.id,d]));
 const exams=subject.exams,paperPools=useMemo(()=>new Map(subject.exams.map(e=>[e.id,subject.exams.filter(x=>x.kind==='training'&&x.tiers.some(t=>e.tiers.includes(t))).flatMap(x=>x.quiz)])),[subject]),paperPool=(e:Exam)=>paperPools.get(e.id)??[],examById=(id?:string)=>exams.find(e=>e.id===id),tierLevels=(t:number)=>levels.slice(subject.tiers[t].from,subject.tiers[t].to+1);
 // 阶段训练题量 = 该阶段关卡题目总数 ÷ 2（向上取整），最多抽训练题库的 2/3；阶段考试和最终考试是固定 44 题的 150 分试卷。
 const examSize=(e:Exam)=>e.kind==='training'?Math.min(trainingCap(e.quiz.length),Math.ceil(e.tiers.flatMap(tierLevels).reduce((n,l)=>n+l.quiz.length,0)/2)):PAPER_QUESTIONS;
 const [watching,setWatching]=useState<Animation|null>(null);
 // 懒人模式的长动画按学科单独打包，第一次打开时才下载。
 const [lazy,setLazy]=useState<LazyEpisode[]|null>(null),hasLazy=!!lazyLoaders[subject.id];
 const openLazy=()=>{setView({kind:'lazy'});if(!lazy)lazyLoaders[subject.id]?.().then(setLazy).catch(()=>setLazy([]))};
 const key=subject.storageKey+(username||'guest');
 const animations=subject.animations,animationById=(id:string)=>animations.find(a=>a.id===id),animationsFor=(level:string)=>animations.filter(a=>a.level===level);
 const raw=useSyncExternalStore(subscribe,()=>readStore(key),()=>null),ready=useSyncExternalStore(subscribe,()=>true,()=>false),[view,setViewState]=useState<View>({kind:'map'});
 // 每进入一个新画面就写入浏览器历史，浏览器“返回”可以逐级退回；答题过程中的变化只替换当前记录。
 const setView=(v:View)=>{window.history.pushState({...window.history.state,aiView:v},'');setViewState(v)};
 const replaceView=(v:View)=>{window.history.replaceState({...window.history.state,aiView:v},'');setViewState(v)};
 useEffect(()=>{window.history.replaceState({...window.history.state,aiView:{kind:'map'}},'');const onPop=(e:PopStateEvent)=>setViewState((e.state?.aiView as View)??{kind:'map'});window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);
 const saved=useMemo<Saved>(()=>{try{return raw?{...empty,...JSON.parse(raw)}:empty}catch{return empty}},[raw]);
 function persist(next:Saved){try{localStorage.setItem(key,JSON.stringify({...next,carried:true}))}catch{}noteLocalWrite(key);window.dispatchEvent(new Event(changed))}
 const scrollKey=view.kind+(view.kind==='quiz'?view.index:view.kind==='video'?view.id:'');
 useEffect(()=>{window.scrollTo({top:0})},[scrollKey]);
const passedLevelsOf=(p:Set<string>)=>levels.filter(l=>p.has(l.id)).length;
 const passed=new Set(saved.passed);
 // 阶段训练拿到 80% 以上：这个阶段的关卡和下一阶段的第一关都直接解锁（比如进阶训练过了，就能进入高阶）。
 const TRAIN_UNLOCK=0.8,trainedUpTo=exams.reduce((n,e)=>{if(e.kind!=='training'||(saved.best[e.id]??0)<TRAIN_UNLOCK)return n;const t=Math.max(...e.tiers),next=subject.tiers[t+1];return Math.max(n,next?next.from:subject.tiers[t].to)},-1);
 const unlocked=(i:number)=>i===0||i<=trainedUpTo||passed.has(levels[i-1].id)||passed.has(levels[i].id); // 已通关的关卡始终可进（新增关卡插在中间时不影响老进度）
 const mistakes=saved.mistakes.filter(id=>byId.has(id)),passedLevels=passedLevelsOf(passed);
 // 从「训练」页进来（?from=practice）时，顶栏停在「训练」，考试页的返回按钮回到该学科的训练列表；训练里的训练和考试不需要解锁。
 const fromPractice=useSyncExternalStore(subscribe,()=>new URLSearchParams(window.location.search).get('from')==='practice',()=>false);
 const examOpen=(e:Exam)=>ready&&(fromPractice||passed.has(e.id)||e.requires.every(id=>passed.has(id)));
 const pool=allQuestions.filter(q=>unlocked(levels.findIndex(l=>l.id===q.level)));
 const sourceName=(levelId:string)=>{const li=levels.findIndex(l=>l.id===levelId);return li>=0?L(`第 ${li+1} 关 · ${levels[li].title}`,`Level ${li+1} · ${levels[li].title}`):(examById(levelId)?.title??levelId)};
 function start(mode:Mode,level?:number,examId?:string){const e=examById(examId);const source=mode==='exam'&&e?(e.kind==='training'?rotate(e.id,examQuestions.filter(q=>q.level===e.id),examSize(e)):shuffle(examQuestions.filter(q=>q.level===e.id)).slice(0,examSize(e))):mode==='level'?allQuestions.filter(q=>q.level===levels[level!].id):mode==='random'?shuffle(pool).slice(0,10):shuffle(mistakes.map(id=>byId.get(id)!));const items=source.map(toItem);if(items.length)setView({kind:'quiz',mode,level,exam:examId,items,index:0,results:items.map(()=>null)})}
 function startList(mode:Mode,list:BankEntry[]){const items=(list.length>1?shuffle(list):list).map(toItem);if(items.length)setView({kind:'quiz',mode,items,index:0,results:items.map(()=>null)})}
 // 从一道题直接到讲它的那张学习卡片：关卡里的题在本关的卡片里找最相关的一张；训练和考试的题在它覆盖的阶段里找，找不到才打开训练页。
 function openSource(e:BankEntry){const text=[e.quiz.q,answerText(e.quiz,L),e.quiz.explain].join('\n'),li=levels.findIndex(l=>l.id===e.level);
  if(li>=0){const c=rankCard(levels[li].lessons,text).index;setView({kind:'learn',level:li,card:c<0?undefined:c});return}
  const ex=examById(e.level);if(!ex)return;let best={level:-1,card:-1,score:0};
  levels.forEach((l,i)=>{if(!ex.tiers.includes(subject.tiers.indexOf(tierOf(i))))return;const r=rankCard(l.lessons,text);if(r.score>best.score)best={level:i,card:r.index,score:r.score}});
  if(best.level>=0)setView({kind:'learn',level:best.level,card:best.card});else setView({kind:'exam',id:ex.id})}
 // 背题模式只收简答题（关卡和阶段训练里的都算）。
 const reciteItems=[...allQuestions,...examQuestions].filter(q=>q.quiz.type==='short');
 // 英文界面下，有英文版的关卡显示英文的标题和学习卡片。
 const enOf=(id:string)=>locale==='en'?subject.levelsEn?.[id]:undefined;
 // 正式考试作答时不显示全站的 AI 老师。
 useDockPresence(view.kind==='paper');
 // 从「训练」页带 ?exam=ID 进来时，直接打开对应的训练或考试。
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get('exam');if(!id||!subject.exams.some(e=>e.id===id))return;const t=setTimeout(()=>setViewState({kind:'exam',id}));return()=>clearTimeout(t)},[subject]);
 // 从「面试」题目上的“对应关卡”链接（?level=ID）进来时，直接打开这一关的学习卡片（只看卡片，不受解锁限制）。
 // 带 &card=N（从 1 开始）时直接翻到第 N 张卡片；?quiz=题目ID 直接打开这道题的单题练习（全局搜索和 AI 老师给的链接都是这两种）。
 useEffect(()=>{const p=new URLSearchParams(window.location.search),id=p.get('level'),li=id?subject.levels.findIndex(l=>l.id===id):-1,card=Number(p.get('card'))||0,quiz=p.get('quiz');
  if(li>=0){const t=setTimeout(()=>setView({kind:'learn',level:li,card:card>0?card-1:undefined}));return()=>clearTimeout(t)}
  const hit=quiz?byId.get(quiz):undefined;if(hit){const t=setTimeout(()=>startList('random',[hit]));return()=>clearTimeout(t)}},[subject]); // eslint-disable-line react-hooks/exhaustive-deps
 function answer(r:Result){if(view.kind!=='quiz'||view.results[view.index])return;const results=[...view.results];results[view.index]=r;replaceView({...view,results})}
 function finish(v:Extract<View,{kind:'quiz'}>){const results=v.results.map(r=>r??{correct:false,given:''}),right=v.items.filter((_,i)=>results[i].correct),wrong=v.items.filter((_,i)=>!results[i].correct);
  const next:Saved={best:{...saved.best},passed:[...saved.passed],mistakes:[...new Set([...saved.mistakes.filter(id=>!right.some(r=>r.id===id)),...wrong.map(w=>w.id)])]};
  if(v.mode==='level'&&v.level!==undefined){const id=levels[v.level].id,score=right.length/v.items.length;next.best[id]=Math.max(next.best[id]??0,score);if(score>=passRate&&!next.passed.includes(id))next.passed.push(id)}
  const e=v.mode==='exam'?examById(v.exam):undefined;if(e){const score=right.length/v.items.length,first=saved.best[e.id]===undefined;next.best[e.id]=Math.max(next.best[e.id]??0,score);if(score>=e.passRate)next.passed=first&&score>=CARRY_RATE?passExam(next.passed,e):[...new Set([...next.passed,e.id])]}
  persist(next);replaceView({kind:'result',mode:v.mode,level:v.level,exam:v.exam,items:v.items,results})}

 // 第一次参加某个阶段训练或考试就拿到 80% 以上：这次考试和它覆盖的阶段（含之前所有阶段）的关卡一起记为通过；这些关卡没有答题，所以不记分数。
 // 以前考过、这次才通过的，只记这次考试本身。
 const passExam=(passed:string[],e:Exam)=>[...new Set([...passed,e.id,...levels.slice(0,(subject.tiers[e.after]?.to??-1)+1).map(l=>l.id)])];
 // 规则上线前的旧进度补算一次：旧记录只有最高分、不知道是不是第一次考，所以已通过且最高分 80% 以上的训练或考试都算。
 useEffect(()=>{if(!raw||saved.carried)return;let passed=saved.passed;
  for(const e of exams)if(saved.passed.includes(e.id)&&(saved.best[e.id]??0)>=CARRY_RATE)passed=passExam(passed,e);
  persist({...saved,passed})},[raw]); // eslint-disable-line react-hooks/exhaustive-deps
 const header=<header className="ai-header"><a href={fromPractice?'/practice':'/learn'} className="ai-brand"><BookOpen size={23}/><span>{t("面试自习室")}<small>{fromPractice?L(`${subject.name[0]} · 训练`,`${subject.name[1]} · Practice`):L(`${subject.name[0]} · 学习`,`${subject.name[1]} · Learn`)}</small></span></a><SiteNav active={fromPractice?'practice':'learn'}/><div className="top-actions"><LanguageControl/><ThemeControl/><AccountMenu username={username}/></div></header>;
 const examView=view.kind==='exam'||view.kind==='paper'||((view.kind==='quiz'||view.kind==='result')&&view.mode==='exam');
 const back=fromPractice&&examView?<a className="ai-back" href={`/practice/${subject.id}`}><ArrowLeft size={16}/>{L("返回训练","Back to practice")}</a>:<button className="ai-back" onClick={()=>setView({kind:'map'})}><ArrowLeft size={16}/>{L("返回关卡","Back to levels")}</button>;
 let body;
 const levelIndex=(id:string)=>levels.findIndex(l=>l.id===id);
 const card=(a:typeof animations[number])=><button key={a.id} className="an-card" onClick={()=>setView({kind:'video',id:a.id})}><span className="an-icon">{a.icon}</span><strong>{a.title}</strong><small>{a.summary}</small><em>{L(`第 ${levelIndex(a.level)+1} 关 · ${levels[levelIndex(a.level)].title} · ${a.scenes.length} 个分镜`,`Level ${levelIndex(a.level)+1} · ${a.scenes.length} scenes`)}</em></button>;
 if(view.kind==='mistakes'){body=<>{back}<MistakeBookView items={mistakes.map(mId=>byId.get(mId)!)} sourceName={sourceName} onPractice={list=>startList('mistakes',list)} onRemove={mId=>persist({...saved,mistakes:saved.mistakes.filter(x=>x!==mId)})} onClearAll={()=>{if(confirm(L('确定清空错题本中的全部题目吗？','Clear all questions from the mistake book?')))persist({...saved,mistakes:[]})}} onBack={()=>setView({kind:'map'})}/></>}
 else if(view.kind==='recite'){body=<>{back}<ReciteView items={reciteItems} storageKey={key+':recite'} sourceName={sourceName} onOpenSource={openSource}/></>}
 else if(view.kind==='videos'){body=<>{back}<div className="ai-title"><span className="eyebrow">ANIMATION CLASS</span><h1>{L('动画课堂','Animation class')}</h1><p>{L('答题答累了，就看几段动画吧：入门章节讲直观原理，难点动画把复杂机制拆成一步步的画面。','Tired of quizzes? Watch short animations: intuitive basics and step-by-step breakdowns of hard concepts.')}</p></div>
  <h2 className="an-group">{L('入门动画','Basics')}</h2><div className="an-list">{animations.filter(a=>a.kind==='basic').map(card)}</div>
  <h2 className="an-group">{L('难点动画','Hard concepts')}</h2><div className="an-list">{animations.filter(a=>a.kind==='advanced').map(card)}</div></>}
 else if(view.kind==='lazy'){const title=(id:string)=>{const i=levels.findIndex(l=>l.id===id);return i<0?id:L(`第 ${i+1} 关「${levels[i].title}」`,`Level ${i+1}`)};
  body=<>{back}<div className="ai-title"><span className="eyebrow">LAZY MODE</span><h1>{L('懒人','Lazy')}</h1><p>{L('不想看卡片、不想答题？就听故事吧。每一集用一个完整的故事把几关内容讲透，配合比喻、拟人和对比，打开语音躺着听就行。关卡越多、越难，故事越长，每集不超过 30 分钟。另有一集约 1 小时的完整故事，把整门课从小白讲到专家。','Just listen: each episode tells one story that covers a few levels, with metaphors and comparisons. Up to 30 minutes each, plus one full story of about an hour that covers the whole course.')}</p></div>
  {lazy?.filter(e=>e.full).map(e=><div key={e.id} className="lazy-list lazy-full-list"><button className="ai-card lazy-card lazy-full" onClick={()=>setWatching(lazyAnimation(e))}><span className="lazy-head"><span className="an-icon">{e.icon}</span><span className="lazy-no">{L('完整故事 · 1 小时','Full story · 1 hour')}</span><span className="lazy-time"><Headphones size={14}/>{L(`约 ${Math.round(lazyMinutes(e))} 分钟`,`~${Math.round(lazyMinutes(e))} min`)}</span></span><strong>{e.title}</strong><span className="muted">{e.summary}</span><small>{L(`一口气讲完全部 ${e.levels.length} 关，每关一章，章末有口诀卡`,`All ${e.levels.length} levels in one story, one chapter each`)}</small></button></div>)}
  {lazy===null?<p className="muted">{L('长动画加载中…','Loading…')}</p>:lazy.length===0?<p className="muted">{L('这门课的懒人模式正在制作中。','Coming soon.')}</p>:subject.tiers.map((t,ti)=>{const eps=lazy.filter(e=>!e.full&&e.tier===ti);return eps.length?<Fragment key={ti}><h2 className="an-group">{L(t.name,t.nameEn)}</h2><div className="lazy-list">{eps.map((e,k)=><button key={e.id} className="ai-card lazy-card" onClick={()=>setWatching(lazyAnimation(e))}><span className="lazy-head"><span className="an-icon">{e.icon}</span><span className="lazy-no">{L(`第 ${lazy.indexOf(e)+1} 集`,`Episode ${lazy.indexOf(e)+1}`)}</span><span className="lazy-time"><Headphones size={14}/>{L(`约 ${Math.max(1,Math.round(lazyMinutes(e)))} 分钟`,`~${Math.max(1,Math.round(lazyMinutes(e)))} min`)}</span></span><strong>{e.title}</strong><span className="muted">{e.summary}</span><small>{L('覆盖：','Covers: ')}{e.levels.map(title).join('、')}</small></button>)}</div></Fragment>:null})}</>}
 else if(view.kind==='video'){const a=animationById(view.id)!,li=levelIndex(a.level),others=animations.filter(x=>x.id!==a.id&&x.kind===a.kind).slice(0,3);
  body=<><button className="ai-back" onClick={()=>setView(view.backTo??{kind:'videos'})}><ArrowLeft size={16}/>{view.backTo?L('返回学习','Back to the lesson'):L('返回动画课堂','Back to animations')}</button>
  <div className="ai-title"><span className="eyebrow">{a.kind==='basic'?L('入门动画','Basics'):L('难点动画','Hard concept')} · {L(`第 ${li+1} 关`,`Level ${li+1}`)}</span><h1>{a.icon} {a.title}</h1><p>{a.summary}</p></div>
  <section className="ai-card an-wrap"><AnimationPlayer key={a.id} animation={a}/></section>
  <div className="ai-cta"><p>{L(`看完了？去「${levels[li].title}」答几道题巩固一下。`,`Done watching? Practice with level ${li+1}.`)}</p><button className="button primary" disabled={!unlocked(li)} onClick={()=>setView({kind:'learn',level:li})}>{unlocked(li)?L('去这一关','Go to this level'):L('关卡未解锁','Level locked')}<ArrowRight size={16}/></button></div>
  {others.length>0&&<><h2 className="an-group">{L('接着看','Watch next')}</h2><div className="an-list">{others.map(card)}</div></>}</>}
 else if(view.kind==='learn'){const level=levels[view.level],films=animationsFor(level.id),en=enOf(level.id);body=<>{back}<div className="ai-title"><span className="eyebrow">{L(`第 ${view.level+1} 关 · ${tierOf(view.level).name} · 学习`,`Level ${view.level+1} · ${tierOf(view.level).nameEn} · Learn`)}</span><h1>{en?.title??level.title}</h1><p>{en?.summary??level.summary}</p>{locale==='en'&&!en&&<p className="muted">This level’s lesson cards are available in Chinese only for now.</p>}</div>
  {stackPicker(true)}
  {films.map(a=><button key={a.id} className="ai-card an-teaser" onClick={()=>setView({kind:'video',id:a.id,backTo:{kind:'learn',level:view.level}})}><span className="an-icon">{a.icon}</span><span><strong>{L('先看动画：','Watch first: ')}{a.title}</strong><small>{a.summary}</small></span><Clapperboard size={20}/></button>)}
  <LessonCards key={level.id+':'+(view.card??0)+(en?':en':'')} start={view.card} lessons={en?.lessons??level.lessons} quizCount={level.quiz.length} need={Math.ceil(level.quiz.length*passRate)} onStart={()=>start('level',view.level)}/>
  <LevelInterviews ids={subject.interviewByLevel[level.id]??[]} subject={subject.interviewSubject}/></>}
 else if(view.kind==='exam'){const e=examById(view.id)!,open=examOpen(e),best=saved.best[e.id],types=[...new Set(e.quiz.map(q=>q.type??'single'))] as AiQuizType[];
  const paper=e.kind!=='training'&&hasPaper(e.id);
  const need=e.requires.filter(id=>!passed.has(id)).map(id=>levels.find(l=>l.id===id)?.title??examById(id)?.title??id);
  body=<>{back}<div className="ai-title"><span className="eyebrow">{L(...examKindNames[e.kind])}</span><h1>{e.title}</h1><p>{fromPractice?e.summary.replace(/^.*?解锁，/,''):e.summary}</p></div>
  <section className="ai-card ai-exam-info">{paper?<ul><li><strong>44</strong>{L(' 道题','questions')}</li><li><strong>{PAPER_TOTAL}</strong>{L(' 分满分','points')}</li><li><strong>{Math.ceil(PAPER_TOTAL*e.passRate)}</strong>{L(' 分及格','to pass')}</li><li><strong>{PAPER_MINUTES}</strong>{L(' 分钟','minutes')}</li><li><strong>{best!==undefined?Math.round(best*PAPER_TOTAL):'—'}</strong>{L(' 最佳成绩','best')}</li></ul>:<ul><li><strong>{examSize(e)}</strong>{L(' 道题','questions')}</li><li><strong>{Math.round(e.passRate*100)}%</strong>{L(' 及格','to pass')}</li><li><strong>{best!==undefined?Math.round(best*100)+'%':'—'}</strong>{L(' 最佳成绩','best')}</li></ul>}
   {paper?<p className="muted">{L('正式答卷：单选、多选、判断、填空、简答、代码和综合题（设计 + 代码），每种题型越往后越难。限时作答，交卷后才判分并显示解析。开考前可以下载空白试卷，交卷后可以下载答案与解析（PDF）。','A full paper: answers and explanations appear after you submit. Download the blank paper any time, and the answers with explanations after submitting (PDF).')}</p>:<p className="muted">{L('题型：','Types: ')}{types.map(t=>aiQuizTypes[t]).join('、')}{L('。题目全新，比关卡题更难；答完有详解，答错的题会进错题本。',' · New questions, harder than level quizzes.')}</p>}
   {!open&&<p className="ai-exam-lock"><Lock size={15}/>{L(`还需要先完成：${need.join('、')}`,`Complete first: ${need.join(', ')}`)}</p>}
   <div className="ai-result-actions"><button className="button primary" disabled={!open} onClick={()=>paper?setView({kind:'paper',id:e.id}):start('exam',undefined,e.id)}>{e.kind==='training'?<Dumbbell size={16}/>:<ClipboardCheck size={16}/>}{L('开始','Start')}<ArrowRight size={16}/></button></div></section></>}
 // 150 分试卷：得分按满分 150 折算成比例记入最佳成绩，达到及格线即通过。
 else if(view.kind==='paper'){const e=examById(view.id)!;
  body=<>{back}<PaperExam examId={e.id} title={e.title} passRate={e.passRate} storageKey={key+':'} pool={paperPool(e)} onScored={score=>{const ratio=score/PAPER_TOTAL,next:Saved={...saved,best:{...saved.best,[e.id]:Math.max(saved.best[e.id]??0,ratio)},passed:ratio<e.passRate?saved.passed:saved.best[e.id]===undefined&&ratio>=CARRY_RATE?passExam(saved.passed,e):[...new Set([...saved.passed,e.id])]};persist(next)}}/></>}
 else if(view.kind==='quiz'){const it=view.items[view.index],done=view.results[view.index]!==null,last=view.index===view.items.length-1;
  const quizBack=view.mode==='mistakes'?<button className="ai-back" onClick={()=>setView({kind:'mistakes'})}><ArrowLeft size={16}/>{L("返回错题本","Back to mistake book")}</button>:back;
  body=<>{quizBack}<div className="ai-quiz-head"><span className="eyebrow">{view.mode==='exam'?(examById(view.exam)?.title??''):view.mode==='level'?L(`第 ${view.level!+1} 关 · 答题`,`Level ${view.level!+1} · Quiz`):view.mode==='random'?L("随机练习","Random practice"):L("错题本","Mistake book")}</span><span>{view.index+1} / {view.items.length}</span></div><Progress value={(view.index+(done?1:0))/view.items.length*100}/>
  <QuestionCard key={it.id+'@'+view.index} item={it} label={view.mode!=='level'&&view.mode!=='exam'?(levels.find(l=>l.id===it.level)?.title??examById(it.level)?.title):undefined} result={view.results[view.index]} last={last} onAnswer={answer} onPrev={view.index>0?()=>replaceView({...view,index:view.index-1}):undefined} onNext={()=>last?finish(view):replaceView({...view,index:view.index+1})}/></>}
 else if(view.kind==='result'){const right=view.results.filter(r=>r.correct).length,score=right/view.items.length,ex=view.mode==='exam'?examById(view.exam):undefined,ok=score>=(ex?.passRate??passRate),lv=view.level;
  body=<>{back}<section className="ai-card ai-result"><Trophy size={40}/><h1>{ex?(ok?L(`${ex.title} 通过！`,'Passed!'):L("还差一点，复习后再挑战","Almost — review and try again")):view.mode==='level'?(ok?L("通关成功！","Level passed!"):L("差一点，再来一次","Almost — try again")):L("练习完成","Practice complete")}</h1><p className="ai-score">{right} / {view.items.length}<small>{Math.round(score*100)}%</small></p>
  {view.mode==='level'&&<p>{ok?(lv!==undefined&&lv<levels.length-1?L(`已解锁第 ${lv+2} 关「${levels[lv+1].title}」。`,`Level ${lv+2} is now unlocked.`):L(`全部 ${levels.length} 关已通关，你已经是大神了。`,`All ${levels.length} levels passed — you made it to the top.`)):L(`需要答对约 ${Math.round(passRate*100)}% 才能通关，可以先回顾学习内容。`,`You need about ${Math.round(passRate*100)}% to pass. Review the lesson first if needed.`)}</p>}
  {ex&&<p>{ok?(()=>{const next=exams.filter(n=>!passed.has(n.id)&&n.requires.includes(ex.id)&&n.requires.every(id=>id===ex.id||passed.has(id)));return next.length?L(`已解锁：${next.map(n=>n.title).join('、')}。`,'Next challenge unlocked.'):L('继续保持，去挑战下一个阶段吧。','Keep going.')})():L(`需要答对 ${Math.round(ex.passRate*100)}% 才算通过。可以先看考前复习动画，再看下面的错题详解。`,`You need ${Math.round(ex.passRate*100)}% to pass.`)}</p>}
  <div className="ai-result-actions"><button className="button secondary" onClick={()=>replaceView({kind:'quiz',mode:view.mode,level:view.level,exam:view.exam,items:view.items,index:view.items.length-1,results:view.results})}><ArrowLeft size={16}/>{L("返回上一题","Back to last question")}</button>{view.mode==='mistakes'&&<button className="button secondary" onClick={()=>setView({kind:'mistakes'})}><NotebookPen size={16}/>{L("返回错题本","Back to mistake book")}</button>}{ex&&<button className="button secondary" onClick={()=>start('exam',undefined,ex.id)}><RotateCcw size={16}/>{L("再考一次","Retry")}</button>}{view.mode==='level'&&!ok&&<button className="button secondary" onClick={()=>setView({kind:'learn',level:lv!})}><BookOpen size={16}/>{L("回顾学习","Review lesson")}</button>}{view.mode==='level'&&<button className="button secondary" onClick={()=>start('level',lv)}><RotateCcw size={16}/>{L("重新答题","Retry")}</button>}{view.mode==='level'&&ok&&lv!==undefined&&lv<levels.length-1&&<button className="button primary" onClick={()=>setView({kind:'learn',level:lv+1})}>{L("进入下一关","Next level")}<ArrowRight size={16}/></button>}{view.mode!=='level'&&<button className="button primary" onClick={()=>setView({kind:'map'})}>{L("返回关卡","Back to levels")}</button>}</div>
  {animations.length>0&&<button className="an-rest" onClick={()=>setView({kind:'videos'})}><Clapperboard size={16}/>{L('答累了？去动画课堂看几段动画放松一下','Tired? Relax with a few animations')}</button>}</section>
  <section className="ai-card ai-review"><h2>{L("本轮回顾","Review")}</h2>{view.items.map((it,i)=>{const r=view.results[i],written=it.quiz.type==='short'||it.quiz.type==='code';return <details key={it.id+i}><summary>{r.correct?<Check size={16} className="right"/>:<X size={16} className="wrong"/>}<EnWords text={it.quiz.q}/></summary>{r.given&&!written&&<p>{L("你的答案：","Your answer: ")}<EnWords text={r.given}/></p>}{written?<pre className="ai-review-ref">{answerText(it.quiz,L)}</pre>:<p>{L("正确答案：","Answer: ")}<EnWords text={answerText(it.quiz,L)}/></p>}{it.quiz.say&&!it.quiz.explain.includes(it.quiz.say)&&<p className="ai-say-transcript">{L("听力原句：","Transcript: ")}<strong lang="en"><EnWords text={it.quiz.say}/></strong></p>}<p className="muted"><KeywordText text={it.quiz.explain}/></p></details>})}</section></>}
 else{body=<><a href="/learn" className="ai-back"><ArrowLeft size={16}/>{L("返回学习","Back to Learn")}</a><div className="ai-title"><span className="eyebrow">{subject.eyebrow}</span><h1>{L(...subject.title)}</h1><p>{L(`当前段位：${rankOf(passedLevels)} · 已通关 ${passedLevels} / ${levels.length}。每个阶段通关后有阶段训练，两个阶段后有阶段考试，最后是最终考试。每关先学习，再答题，答对约 ${Math.round(passRate*100)}% 的题即可通关。`,`Rank: ${rankOf(passedLevels)} · ${passedLevels} / ${levels.length} levels passed. Stage trainings and exams follow each stage. Learn first, then answer about ${Math.round(passRate*100)}% correctly to pass.`)}</p>{locale==='en'&&<p className="muted">{subject.levelsEn?`Lesson cards are in English for ${Object.keys(subject.levelsEn).length} levels so far (marked EN); the rest are in Chinese.`:'Lesson content is currently available in Chinese only.'}</p>}<Progress value={passedLevels/levels.length*100}/></div>
  {stackPicker()}
  {!username&&<p className="visitor-banner">{L("游客模式 · 闯关进度只保存在当前浏览器","Guest mode · progress is saved in this browser only")}</p>}
  <div className="ai-modes">{subject.links?.map(k=><a key={k.href} href={k.href} className="ai-card ai-mode ai-mode-link"><span className="ai-mode-icon">{k.icon}</span><strong>{L(...k.title)}</strong><span>{L(...k.summary)}</span></a>)}<button className="ai-card ai-mode" disabled={!ready} onClick={()=>start('random')}><Dices size={22}/><strong>{L("随机练习（10 题）","Random practice (10)")}</strong><span>{L("从已解锁的关卡中随机抽题","Drawn from unlocked levels")}</span></button><button className="ai-card ai-mode" disabled={!ready} onClick={()=>setView({kind:'mistakes'})}><NotebookPen size={22}/><strong>{L(`错题本（${mistakes.length}）`,`Mistake book (${mistakes.length})`)}</strong><span>{mistakes.length?L("全部展示错题、支持搜索与重练","View all mistakes, search & practice"):L("点击打开错题本（暂无错题）","Open mistake book (no mistakes yet)")}</span></button>{reciteItems.length>0&&<button className="ai-card ai-mode" disabled={!ready} onClick={()=>setView({kind:'recite'})}><BookMarked size={22}/><strong>{L(`背题模式（${reciteItems.length}）`,`Recite mode (${reciteItems.length})`)}</strong><span>{L('只背简答题，参考答案可以折叠','Short answers only; fold the reference answer')}</span></button>}{hasLazy&&<button className="ai-card ai-mode" onClick={openLazy}><Headphones size={22}/><strong>{L('懒人','Lazy')}</strong><span>{L('听一段长故事，躺着也能学','Long story episodes to just listen to')}</span></button>}{animations.length>0&&<button className="ai-card ai-mode" onClick={()=>setView({kind:'videos'})}><Clapperboard size={22}/><strong>{L(`动画课堂（${animations.length}）`,`Animation class (${animations.length})`)}</strong><span>{L("答累了就看动画，难点一看就懂","Short animations for tricky concepts")}</span></button>}</div>
  <SubjectQuestionSearch questions={[...byId.values()]} sourceName={sourceName} onPractice={list=>startList('random',list)} onOpenSource={openSource}/>
  <ol className="ai-levels">{levels.map((l,i)=>{const open=ready&&unlocked(i),done=passed.has(l.id),best=saved.best[l.id],tier=tierOf(i);return <Fragment key={l.id}>{i===tier.from&&<li className="ai-tier-head"><strong>{L(tier.name,tier.nameEn)}</strong><span>{L(`第 ${tier.from+1}–${tier.to+1} 关`,`Levels ${tier.from+1}–${tier.to+1}`)}</span></li>}<li><button className={'ai-card ai-level'+(done?' done':'')+(open?'':' locked')} disabled={!open} onClick={()=>setView({kind:'learn',level:i})}><span className="ai-num">{i+1}</span><span className="ai-level-text"><strong>{enOf(l.id)?.title??l.title}{locale==='en'&&enOf(l.id)&&<i className="ai-en-tag">EN</i>}</strong><small>{enOf(l.id)?.summary??l.summary} · {L(`${l.quiz.length} 题`,`${l.quiz.length} questions`)}</small></span><span className="ai-level-state">{done?<><Sparkles size={15}/>{L("已通关","Passed")}{best!==undefined&&<> · {Math.round(best*100)}%</>}</>:open?<>{best!==undefined?L(`最佳 ${Math.round(best*100)}%`,`Best ${Math.round(best*100)}%`):L("开始学习","Start")}<ArrowRight size={15}/></>:<><Lock size={14}/>{L("未解锁","Locked")}</>}</span></button></li>{i===tier.to&&exams.filter(e=>e.after===subject.tiers.indexOf(tier)).map(e=>{const open=examOpen(e),done=passed.has(e.id),best=saved.best[e.id];return <li key={e.id}><button className={'ai-card ai-level ai-exam-card '+e.kind+(done?' done':'')+(open?'':' locked')} onClick={()=>setView({kind:'exam',id:e.id})}><span className="ai-num">{e.kind==='training'?<Dumbbell size={18}/>:e.kind==='final'?<Award size={18}/>:<ClipboardCheck size={18}/>}</span><span className="ai-level-text"><strong>{e.title}</strong><small>{L(...examKindNames[e.kind])} · {L(`${examSize(e)} 题`,`${examSize(e)} questions`)} · {e.summary}</small></span><span className="ai-level-state">{done?<><Sparkles size={15}/>{L("已通过","Passed")}{best!==undefined&&<> · {Math.round(best*100)}%</>}</>:open?<>{best!==undefined?L(`最佳 ${Math.round(best*100)}%`,`Best ${Math.round(best*100)}%`):L('开始挑战','Start')}<ArrowRight size={15}/></>:<><Lock size={14}/>{L('未解锁','Locked')}</>}</span></button></li>})}</Fragment>})}</ol>
  {(passed.size>0||mistakes.length>0)&&<button className="ai-reset" onClick={()=>{if(confirm(L(`确定清空「${subject.name[0]}」的全部闯关进度和错题吗？`,`Clear all ${subject.name[1]} progress and mistakes?`)))persist(empty)}}>{L("重置闯关进度","Reset progress")}</button>}</>}
 return <EnglishSpeakContext.Provider value={subject.id==='english'}><InterviewSource.Provider value={interviewMap}><div className="ai-shell">{header}<main className="ai-main">{body}</main></div>
  <Dialog open={!!watching} onOpenChange={o=>{if(!o)setWatching(null)}}><DialogContent className="an-dialog"><DialogHeader><DialogTitle>{watching?.title}</DialogTitle><DialogDescription>{watching?.kind==='lazy'?L('懒人：打开语音，跟着故事听下去就好；可以随时暂停、拖动进度或加速。','Lazy mode: turn on the voice and just listen.'):L('根据本阶段的关卡和面试题自动串讲，关卡和面试题越多，动画越长。','Generated from the levels and interview questions it covers.')}</DialogDescription></DialogHeader>{watching&&<AnimationPlayer key={watching.id} animation={watching}/>}</DialogContent></Dialog></InterviewSource.Provider></EnglishSpeakContext.Provider>
}
