'use client';
import '../ai/ai.css';
import {useMemo,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowRight,Award,ClipboardCheck,Dices,Dumbbell,Lock,NotebookPen,Search,Sparkles,X} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';
import SiteHeader from '../components/site-header';
import SpaceTabs from '../components/space-tabs';
import {PAPER_MINUTES,PAPER_TOTAL} from '@/content/papers/types';
import {learnSpaces} from '../learn/subjects';
import {answeredCount,parseLazyQuiz,parseQuizMap,quizSlot,readRawQuizStore,subscribeQuizSessions} from '@/lib/quiz-session';

export type HubExam={id:string;kind:'training'|'stage'|'final';title:string;summary:string;count:number;requires:string[];passRate:number};
export type HubSubject={id:string;name:string;nameEn:string;icon:string;href:string;storageKey:string;space:'tech'|'language';exams:HubExam[];requireNames:Record<string,string>};

const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify)};
const read=(key:string)=>{try{return localStorage.getItem(key)??''}catch{return ''}};
type Saved={passed:Set<string>;best:Record<string,number>;mistakes:string[]};
const parse=(raw:string):Saved=>{try{const p=JSON.parse(raw||'{}'),best:Record<string,number>={};for(const [k,v] of Object.entries((p.best??{}) as Record<string,number>))if(typeof v==='number')best[k]=v>1?v/PAPER_TOTAL:v;return {passed:new Set<string>(p.passed??[]),best,mistakes:Array.isArray(p.mistakes)?p.mistakes:[]}}catch{return {passed:new Set<string>(),best:{},mistakes:[]}}};
// 读取本浏览器里各学科的闯关记录（和「学习」共用），训练进度就是其中的训练和考试。
function useSaved(username:string,subjects:HubSubject[]){
 const raw=useSyncExternalStore(subscribe,()=>subjects.map(s=>read(s.storageKey+(username||'guest'))).join('\u0001'),()=>'');
 return raw.split('\u0001').map(parse)}

export function Shell({username,children}:{username:string;children:React.ReactNode}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 return <div className="ai-shell"><SiteHeader active="practice" username={username}/>
  <main className="ai-main">{!username&&<p className="visitor-banner">{L('游客模式 · 成绩只保存在当前浏览器','Guest mode · results are saved in this browser only')}</p>}{children}</main></div>}

// 「训练」首页：按分类横向展开，点击「技术」等分类卡片展示对应学科的训练。
export default function TrainingHub({username,subjects}:{username:string;subjects:HubSubject[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const saved=useSaved(username,subjects);
 const lazyRaw=useSyncExternalStore(subscribeQuizSessions,()=>readRawQuizStore('lazy-quiz:v1:'+(username||'guest')),()=>null);
 const savedLazy=useMemo(()=>parseLazyQuiz(lazyRaw),[lazyRaw]);
 const [query,setQuery]=useState(''),kw=query.trim().toLowerCase();
 const [activeSpace,setActiveSpace]=useState<string|null>(null);
 const matchedExams=kw?subjects.flatMap(s=>s.exams.filter(e=>`${s.name} ${s.nameEn} ${e.title} ${e.summary}`.toLowerCase().includes(kw)).map(e=>({s,e}))):[];
 const spaceItems=learnSpaces.map(sp=>{
  const list=subjects.filter(s=>s.space===sp.id);
  const doneSum=list.reduce((sum,s)=>{const i=subjects.indexOf(s);const {passed}=saved[i]??parse('');return sum+s.exams.filter(e=>passed.has(e.id)).length},0);
  const totalSum=list.reduce((sum,s)=>sum+s.exams.length,0);
  return {
   id:sp.id,
   icon:sp.icon,
   title:L(sp.name[0],sp.name[1]),
   countText:L(`${list.length} 门学科`,`${list.length} subjects`),
   progressText:L(`已通过 ${doneSum}/${totalSum}`,`${doneSum}/${totalSum}`),
   allDone:totalSum>0&&doneSum>=totalSum,
   list,
  };
 }).filter(x=>x.list.length>0);
 const current=spaceItems.find(x=>x.id===activeSpace);

 return <Shell username={username}>
  <div className="ai-title"><span className="eyebrow">PRACTICE</span><h1>{L('选一门开始训练','Pick a subject to practice')}</h1></div>
  <div className="ai-card qb-search-panel" style={{marginBottom:18}}>
   <label className="qb-search-input">
    <Search size={17}/>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={L('搜索训练与考试','Search trainings & exams')}/>
    {query&&<button type="button" className="qb-clear" onClick={()=>setQuery('')} aria-label={L('清空','Clear')}><X size={15}/></button>}
   </label>
   {kw&&<div className="qb-search-results">
    <p className="muted" style={{margin:'4px 0 8px'}}>{matchedExams.length?L(`找到 ${matchedExams.length} 项匹配的训练 / 考试（点击某学科也可搜具体单题）：`,`Found ${matchedExams.length} matching trainings / exams:`):L('未找到同名训练，可点下方学科进入题库搜索具体题目。','No matching training title; open a subject below to search individual questions.')}</p>
    {matchedExams.length>0&&<ol className="ai-levels">{matchedExams.map(({s,e})=><li key={s.id+':'+e.id}><a className={'ai-card ai-level ai-exam-card '+e.kind} href={`${s.href}?exam=${e.id}&from=practice`}><span className="ai-num">{s.icon}</span><span className="ai-level-text"><strong>{s.name} · {e.title}</strong><small>{e.summary} · {L(`${e.count} 题`,`${e.count} questions`)}</small></span><span className="ai-level-state">{L('去答题','Start')}<ArrowRight size={15}/></span></a></li>)}</ol>}
   </div>}
  </div>
  <a href="/practice/lazy" className="ai-card lazy-entry"><span className="learn-icon"><Dices size={26}/></span><span className="lazy-entry-text"><strong>{L('懒人 · 随机测验','Lazy · random quiz')}</strong><span className="muted">{L('选学科、选难度（入门、进阶、高阶、专家或最终）、自定义题量，随机抽题，混在一起打乱顺序作答。','Pick subjects, a level and a count; questions are drawn at random and shuffled together.')}</span></span><b>{savedLazy&&<span className="ai-saved-pill">{answeredCount(savedLazy.results)}/{savedLazy.items.length}</span>}{savedLazy?L('继续','Resume'):L('开始','Start')}<ArrowRight size={16}/></b></a>
  <SpaceTabs items={spaceItems} active={activeSpace} onToggle={id=>setActiveSpace(p=>p===id?null:id)}>
   {current&&<div className="learn-subjects">{current.list.map(s=>{const i=subjects.indexOf(s),{passed,mistakes}=saved[i]??parse(''),done=s.exams.filter(e=>passed.has(e.id)).length,total=s.exams.length,questions=s.exams.reduce((n,e)=>n+e.count,0);
    const kinds=(k:HubExam['kind'])=>s.exams.filter(e=>e.kind===k).length;
    return <a key={s.id} href={`/practice/${s.id}`} className="ai-card learn-subject">
     <div className="learn-subject-head"><span className="learn-icon">{s.icon}</span><strong>{L(s.name,s.nameEn)}</strong></div>
     <span className="muted">{L(`${kinds('training')} 次阶段训练、${kinds('stage')} 次阶段考试、${kinds('final')} 次最终考试，共 ${questions} 道新题`,`${kinds('training')} trainings, ${kinds('stage')} stage exams and ${kinds('final')} final · ${questions} new questions`)}{mistakes.length>0?L(` · 错题本 ${mistakes.length} 题`,` · ${mistakes.length} mistakes`):''}</span>
     <Progress value={done/total*100}/><span className="learn-foot"><span>{L(`已通过 ${done}/${total}`,`${done}/${total}`)}</span><b><span>{done?L('继续训练','Continue'):L('进入训练','Open')}</span><ArrowRight size={15}/></b></span></a>})}</div>}
  </SpaceTabs>
  
 </Shell>}

// 某个学科的训练页：按顺序列出阶段训练、阶段考试和最终考试，点开后进入答题。
export function SubjectTraining({username,subject:s}:{username:string;subject:HubSubject}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [{passed,best,mistakes}]=useSaved(username,[s]);const done=s.exams.filter(e=>passed.has(e.id)).length;
 const quizRaw=useSyncExternalStore(subscribeQuizSessions,()=>readRawQuizStore(s.storageKey+(username||'guest')+':quiz'),()=>null);
 const savedQuizzes=useMemo(()=>parseQuizMap(quizRaw),[quizRaw]);
 const [query,setQuery]=useState(''),kw=query.trim().toLowerCase();
 const list=kw?s.exams.filter(e=>`${e.title} ${e.summary}`.toLowerCase().includes(kw)):s.exams;
 const icon=(k:HubExam['kind'])=>k==='training'?<Dumbbell size={18}/>:k==='final'?<Award size={18}/>:<ClipboardCheck size={18}/>;
 const kindName=(k:HubExam['kind'])=>k==='training'?L('阶段训练','Stage training'):k==='stage'?L('阶段考试','Stage exam'):L('最终考试','Final exam');
 return <Shell username={username}>
  <a href="/practice" className="ai-back"><ArrowLeft size={16}/>{L('返回训练','Back to practice')}</a>
  <div className="ai-title"><span className="eyebrow">PRACTICE · {s.icon}</span><h1>{L(`${s.name}训练`,`${s.nameEn} practice`)}</h1><Progress value={done/s.exams.length*100}/></div>
  <div className="ai-card qb-search-panel" style={{marginBottom:16}}>
   <div className="qb-search-row">
    <label className="qb-search-input">
     <Search size={17}/>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={L(`筛选${s.name}训练与考试…`,`Filter ${s.nameEn} trainings & exams…`)}/>
     {query&&<button type="button" className="qb-clear" onClick={()=>setQuery('')} aria-label={L('清空','Clear')}><X size={15}/></button>}
    </label>
    <a className="button secondary qb-btn" href={s.href}><NotebookPen size={15}/>{L(`去题库搜题 / 错题本（${mistakes.length}）`,`Search questions / Mistakes (${mistakes.length})`)}</a>
   </div>
  </div>
  <ol className="ai-levels">{list.map(e=>{const open=true,ok=passed.has(e.id),b=best[e.id],sq=savedQuizzes[quizSlot('exam',undefined,e.id)],need:string[]=[];
   return <li key={e.id}><a className={'ai-card ai-level ai-exam-card '+e.kind+(ok?' done':'')+(open?'':' locked')} href={`${s.href}?exam=${e.id}&from=practice`}><span className="ai-num">{icon(e.kind)}</span><span className="ai-level-text"><strong>{e.title}</strong><small>{kindName(e.kind)} · {e.kind==='training'?L(`${e.count} 题 · 及格 ${Math.round(e.passRate*100)}%`,`${e.count} questions · pass ${Math.round(e.passRate*100)}%`):L(`${e.count} 题 · ${PAPER_TOTAL} 分 · 及格 ${Math.ceil(PAPER_TOTAL*e.passRate)} 分 · ${PAPER_MINUTES} 分钟`,`${e.count} questions · ${PAPER_TOTAL} pts · pass ${Math.ceil(PAPER_TOTAL*e.passRate)} · ${PAPER_MINUTES} min`)}{!open&&need.length>0&&<> · {L(`需先完成：${need.slice(0,3).join('、')}${need.length>3?' 等':''}`,'Complete prerequisites first')}</>}</small></span><span className="ai-level-state">{sq&&<span className="ai-saved-pill">{answeredCount(sq.results)}/{sq.items.length}</span>}{ok?<><Sparkles size={15}/>{L('已通过','Passed')} · {Math.round((b??0)*100)}%</>:open?<>{b!==undefined?L(`最佳 ${Math.round(b*100)}%`,`Best ${Math.round(b*100)}%`):L('开始','Start')}<ArrowRight size={15}/></>:<><Lock size={14}/>{L('未解锁','Locked')}</>}</span></a></li>})}</ol>
  <p className="learn-hint"><a href={s.href}>{L('去「学习」看关卡讲解、搜索单题和查看错题本 →','Lessons, question search and mistake book are in Learn →')}</a></p>
 </Shell>}
