'use client';
import '../ai/ai.css';
import {useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowRight,Award,ClipboardCheck,Dices,Dumbbell,Lock,NotebookPen,Search,Sparkles,X} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import AccountMenu from '../components/account-menu';
import SiteNav from '../components/site-nav';
import {PAPER_MINUTES,PAPER_TOTAL} from '@/content/papers/types';
import {learnSpaces} from '../learn/subjects';

export type HubExam={id:string;kind:'training'|'stage'|'final';title:string;summary:string;count:number;requires:string[];passRate:number};
export type HubSubject={id:string;name:string;nameEn:string;icon:string;href:string;storageKey:string;space:'tech'|'language';exams:HubExam[];requireNames:Record<string,string>};

const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify)};
const read=(key:string)=>{try{return localStorage.getItem(key)??''}catch{return ''}};
type Saved={passed:Set<string>;best:Record<string,number>;mistakes:string[]};
const parse=(raw:string):Saved=>{try{const p=JSON.parse(raw||'{}');return {passed:new Set<string>(p.passed??[]),best:(p.best??{}) as Record<string,number>,mistakes:Array.isArray(p.mistakes)?p.mistakes:[]}}catch{return {passed:new Set<string>(),best:{},mistakes:[]}}};
// 读取本浏览器里各学科的闯关记录（和「学习」共用），训练进度就是其中的训练和考试。
function useSaved(username:string,subjects:HubSubject[]){
 const raw=useSyncExternalStore(subscribe,()=>subjects.map(s=>read(s.storageKey+(username||'guest'))).join('\u0001'),()=>'');
 return raw.split('\u0001').map(parse)}

export function Shell({username,children}:{username:string;children:React.ReactNode}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 return <div className="ai-shell"><header className="ai-header"><a href="/practice" className="ai-brand"><Dumbbell size={23}/><span>{t('面试自习室')}<small>{L('训练','Practice')}</small></span></a><SiteNav active="practice"/><div className="top-actions"><LanguageControl/><ThemeControl/><AccountMenu username={username}/></div></header>
  <main className="ai-main">{!username&&<p className="visitor-banner">{L('游客模式 · 成绩只保存在当前浏览器','Guest mode · results are saved in this browser only')}</p>}{children}</main></div>}

// 「训练」首页：和「学习」一样先选学科，点进去再看这个学科的阶段训练、阶段考试和最终考试。
export default function TrainingHub({username,subjects}:{username:string;subjects:HubSubject[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const saved=useSaved(username,subjects);
 const [query,setQuery]=useState(''),kw=query.trim().toLowerCase();
 const matchedExams=kw?subjects.flatMap(s=>s.exams.filter(e=>`${s.name} ${s.nameEn} ${e.title} ${e.summary}`.toLowerCase().includes(kw)).map(e=>({s,e}))):[];
 return <Shell username={username}>
  <div className="ai-title"><span className="eyebrow">PRACTICE</span><h1>{L('选一门开始训练','Pick a subject to practice')}</h1><p>{L('选一门学科，直接开始阶段训练、阶段考试或最终考试，不需要先解锁；也可以用「懒人」随机测验，把几门学科的题混在一起练。','Pick a subject and start any training or exam right away, or use Lazy mode for a random mixed quiz.')}</p></div>
  <div className="ai-card qb-search-panel" style={{marginBottom:18}}>
   <label className="qb-search-input">
    <Search size={17}/>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={L('搜索训练、阶段考试或进入某学科题库搜索题目…','Search trainings, stage exams or subjects…')}/>
    {query&&<button type="button" className="qb-clear" onClick={()=>setQuery('')} aria-label={L('清空','Clear')}><X size={15}/></button>}
   </label>
   {kw&&<div className="qb-search-results">
    <p className="muted" style={{margin:'4px 0 8px'}}>{matchedExams.length?L(`找到 ${matchedExams.length} 项匹配的训练 / 考试（点击某学科也可搜具体单题）：`,`Found ${matchedExams.length} matching trainings / exams:`):L('未找到同名训练，可点下方学科进入题库搜索具体题目。','No matching training title; open a subject below to search individual questions.')}</p>
    {matchedExams.length>0&&<ol className="ai-levels">{matchedExams.map(({s,e})=><li key={s.id+':'+e.id}><a className={'ai-card ai-level ai-exam-card '+e.kind} href={`${s.href}?exam=${e.id}&from=practice`}><span className="ai-num">{s.icon}</span><span className="ai-level-text"><strong>{s.name} · {e.title}</strong><small>{e.summary} · {L(`${e.count} 题`,`${e.count} questions`)}</small></span><span className="ai-level-state">{L('去答题','Start')}<ArrowRight size={15}/></span></a></li>)}</ol>}
   </div>}
  </div>
  <a href="/practice/lazy" className="ai-card lazy-entry"><span className="learn-icon"><Dices size={26}/></span><span className="lazy-entry-text"><strong>{L('懒人 · 随机测验','Lazy · random quiz')}</strong><span className="muted">{L('选学科、选难度（入门、进阶、高阶、专家或最终）、自定义题量，随机抽题，混在一起打乱顺序作答。','Pick subjects, a level and a count; questions are drawn at random and shuffled together.')}</span></span><b>{L('开始','Start')}<ArrowRight size={16}/></b></a>
  {learnSpaces.map(sp=><section key={sp.id} className="learn-space"><h2 className="an-group">{L(sp.name[0],sp.name[1])}</h2><div className="learn-subjects">{subjects.filter(s=>s.space===sp.id).map(s=>{const i=subjects.indexOf(s),{passed,mistakes}=saved[i]??parse(''),done=s.exams.filter(e=>passed.has(e.id)).length,total=s.exams.length,questions=s.exams.reduce((n,e)=>n+e.count,0);
   const kinds=(k:HubExam['kind'])=>s.exams.filter(e=>e.kind===k).length;
   return <a key={s.id} href={`/practice/${s.id}`} className="ai-card learn-subject">
    <span className="learn-icon">{s.icon}</span><strong>{L(s.name,s.nameEn)}</strong>
    <span className="muted">{L(`${kinds('training')} 次阶段训练、${kinds('stage')} 次阶段考试、${kinds('final')} 次最终考试，共 ${questions} 道新题`,`${kinds('training')} trainings, ${kinds('stage')} stage exams and ${kinds('final')} final · ${questions} new questions`)}{mistakes.length>0?L(` · 错题本 ${mistakes.length} 题`,` · ${mistakes.length} mistakes`):''}</span>
    <Progress value={done/total*100}/><span className="learn-foot"><span>{L(`已通过 ${done} / ${total}`,`${done} / ${total} passed`)}</span><b>{done?L('继续训练','Continue'):L('进入训练','Open')}<ArrowRight size={16}/></b></span></a>})}</div></section>)}
  <p className="learn-hint">{L('训练和考试的成绩与「学习」共用，保存在本浏览器。','Scores are shared with “Learn” and saved in this browser.')}</p>
 </Shell>}

// 某个学科的训练页：按顺序列出阶段训练、阶段考试和最终考试，点开后进入答题。
export function SubjectTraining({username,subject:s}:{username:string;subject:HubSubject}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [{passed,best,mistakes}]=useSaved(username,[s]);const done=s.exams.filter(e=>passed.has(e.id)).length;
 const [query,setQuery]=useState(''),kw=query.trim().toLowerCase();
 const list=kw?s.exams.filter(e=>`${e.title} ${e.summary}`.toLowerCase().includes(kw)):s.exams;
 const icon=(k:HubExam['kind'])=>k==='training'?<Dumbbell size={18}/>:k==='final'?<Award size={18}/>:<ClipboardCheck size={18}/>;
 const kindName=(k:HubExam['kind'])=>k==='training'?L('阶段训练','Stage training'):k==='stage'?L('阶段考试','Stage exam'):L('最终考试','Final exam');
 return <Shell username={username}>
  <a href="/practice" className="ai-back"><ArrowLeft size={16}/>{L('返回训练','Back to practice')}</a>
  <div className="ai-title"><span className="eyebrow">PRACTICE · {s.icon}</span><h1>{L(`${s.name}训练`,`${s.nameEn} practice`)}</h1><p>{L(`已通过 ${done} / ${s.exams.length}。训练里的每一项都可以直接开始，不需要先解锁。阶段训练的题量是该阶段关卡题的一半；阶段考试和最终考试包含所有题型。`,`${done} / ${s.exams.length} passed. Everything here is open right away.`)}</p><Progress value={done/s.exams.length*100}/></div>
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
  <ol className="ai-levels">{list.map(e=>{const open=true,ok=passed.has(e.id),b=best[e.id],need:string[]=[];
   return <li key={e.id}><a className={'ai-card ai-level ai-exam-card '+e.kind+(ok?' done':'')+(open?'':' locked')} href={`${s.href}?exam=${e.id}&from=practice`}><span className="ai-num">{icon(e.kind)}</span><span className="ai-level-text"><strong>{e.title}</strong><small>{kindName(e.kind)} · {e.kind==='training'?L(`${e.count} 题 · 及格 ${Math.round(e.passRate*100)}%`,`${e.count} questions · pass ${Math.round(e.passRate*100)}%`):L(`${e.count} 题 · ${PAPER_TOTAL} 分 · 及格 ${Math.ceil(PAPER_TOTAL*e.passRate)} 分 · ${PAPER_MINUTES} 分钟`,`${e.count} questions · ${PAPER_TOTAL} pts · pass ${Math.ceil(PAPER_TOTAL*e.passRate)} · ${PAPER_MINUTES} min`)}{!open&&need.length>0&&<> · {L(`需先完成：${need.slice(0,3).join('、')}${need.length>3?' 等':''}`,'Complete prerequisites first')}</>}</small></span><span className="ai-level-state">{ok?<><Sparkles size={15}/>{L('已通过','Passed')} · {Math.round((b??0)*100)}%</>:open?<>{b!==undefined?L(`最佳 ${Math.round(b*100)}%`,`Best ${Math.round(b*100)}%`):L('开始','Start')}<ArrowRight size={15}/></>:<><Lock size={14}/>{L('未解锁','Locked')}</>}</span></a></li>})}</ol>
  <p className="learn-hint"><a href={s.href}>{L('去「学习」看关卡讲解、搜索单题和查看错题本 →','Lessons, question search and mistake book are in Learn →')}</a></p>
 </Shell>}

