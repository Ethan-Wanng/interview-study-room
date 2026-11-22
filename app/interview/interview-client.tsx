'use client';
import '../ai/ai.css';
import './interview.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useI18n} from '../components/i18n';
import SiteHeader from '../components/site-header';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {StudyBank} from '@/lib/catalog-types';
import type {LevelLink} from '@/lib/interview-links';
import {MINE,answerBlocks,type MyQuestion} from '@/lib/my-questions';
import InterviewHome,{type TrackStat} from './interview-home';
import MyEditor from './my-editor';
import StudyView,{type Question} from './study-view';

type RecordP={question_id:string;stage:number;due:string;last_day:string;first_day:string;rating:string};
export type StudyState={today:string;preferences:{new_goal:number;review_goal:number};progress:RecordP[];activity:{question_id:string;kind:string}[]};
type Course={href:string;name:[string,string];icon:string};
const ORDER=['go','backend','ai-development','frontend'];

// 「面试」：首页按学科列出题库和今日进度；点进学科后逐题回忆、看答案、打分进入间隔复习。私人题库只对本人可见。
export default function InterviewClient({username,member,bank:rawBank,links,courses}:{username:string;member:boolean;bank:StudyBank;links:Record<string,LevelLink>;courses:Record<string,Course>}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [data,setData]=useState<StudyState|null>(null),[error,setError]=useState(''),[mine,setMine]=useState<MyQuestion[]>([]);
 const [track,setTrack]=useState(''),[editor,setEditor]=useState<{editing:MyQuestion|null}|null>(null),[goalOpen,setGoalOpen]=useState(false),[goals,setGoals]=useState({n:10,r:20}),saving=useRef(false);
 async function call(init?:RequestInit){try{setError('');const r=await fetch('/api/study',{cache:'no-store',...init});const d=await r.json() as StudyState&{error?:string};if(r.status===401){window.location.assign('/login');return null}if(!r.ok)throw new Error(d.error??L('请求失败','Request failed'));setData(d);return d}catch(e){setError((e as Error).message);return null}}
 const save=async(payload:object)=>{if(saving.current)return null;saving.current=true;try{return await call({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}finally{saving.current=false}};
 useEffect(()=>{void call().then(d=>{if(d)setGoals({n:d.preferences.new_goal,r:d.preferences.review_goal})});void fetch('/api/my-questions',{cache:'no-store'}).then(r=>r.json() as Promise<{items?:MyQuestion[]}>).then(d=>setMine(d.items??[])).catch(()=>{});
  const refresh=()=>{if(document.visibilityState==='visible')void call()};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[]); // eslint-disable-line react-hooks/exhaustive-deps
 // 从全局搜索或 AI 老师给的链接进来（/interview?track=学科&q=题目ID）：直接打开这个学科并定位到这道题。
 const [jump,setJump]=useState('');
 useEffect(()=>{const p=new URLSearchParams(window.location.search),t=p.get('track'),q=p.get('q');if(!t)return;setTrack(t);if(q)setJump(q);window.history.replaceState({ivTrack:t},'')},[]);
 // 浏览器“返回”从学科回到首页。
 const open=(id:string)=>{window.history.pushState({ivTrack:id},'');setTrack(id);window.scrollTo({top:0})};
 useEffect(()=>{const onPop=(e:PopStateEvent)=>setTrack((e.state?.ivTrack as string)??'');window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);

 const names=useMemo(()=>new Map(rawBank.tracks.map(s=>[s.id,locale==='en'?s.nameEn:s.name])),[rawBank,locale]);
 const questions=useMemo<Question[]>(()=>[...rawBank.questions.map(q=>({...(locale==='en'&&q.english?{...q,...q.english}:q),mine:false})),
  ...mine.map(m=>({id:m.id,track:m.subject,category:m.section||L('我的题目','Mine'),section:m.section||L('我的题目','Mine'),title:m.title,blocks:answerBlocks(m.answer),sourceParagraph:0,mine:true}))],[rawBank,mine,locale]); // eslint-disable-line react-hooks/exhaustive-deps
 const byId=useMemo(()=>new Map(data?.progress.map(p=>[p.question_id,p])??[]),[data]);
 const inTrack=(q:Question,id:string)=>id===MINE?q.mine:q.track===id;
 const stat=(id:string,name:string,icon:string):TrackStat=>{const qs=questions.filter(q=>inTrack(q,id));return {id,name,icon,total:qs.length,learned:qs.filter(q=>byId.has(q.id)).length,mastered:qs.filter(q=>byId.get(q.id)?.rating==='good').length,due:qs.filter(q=>{const p=byId.get(q.id);return !!p&&!!data&&p.due<=data.today}).length,course:courses[id]}};
 const trackIds=[...rawBank.tracks.map(s=>s.id)].sort((a,b)=>(ORDER.indexOf(a)+1||99)-(ORDER.indexOf(b)+1||99));
 const tracks=trackIds.map(id=>stat(id,names.get(id)??id,courses[id]?.icon??'📘')).filter(s=>s.total>0),mineStat=stat(MINE,L('我的题库','My questions'),'⭐');
 const today=data?{newDone:data.activity.filter(a=>a.kind==='new').length,reviewDone:data.activity.filter(a=>a.kind==='review').length,due:questions.filter(q=>{const p=byId.get(q.id);return !!p&&p.due<=data.today}).length}:null;
 const editable=rawBank.tracks.map(s=>({id:s.id,name:names.get(s.id)??s.id}));
 const current=track===MINE?mineStat:tracks.find(s=>s.id===track);
 return <div className="ai-shell iv-shell">
  <SiteHeader active="interview" username={username}/>
  {error&&<div role="alert" className="error iv-error">{error}<button onClick={()=>void call()}>{L('重试','Retry')}</button></div>}
  {!current?<InterviewHome tracks={tracks} mine={mineStat} member={member} today={today} goals={data?.preferences??{new_goal:10,review_goal:20}} onOpen={open} onAdd={()=>setEditor({editing:null})} onGoals={()=>setGoalOpen(true)}/>
   :<StudyView key={current.id} initial={jump} track={current} questions={questions.filter(q=>inTrack(q,current.id))} data={data} links={links} member={member}
     onRate={(questionId,rating)=>save({action:'rate',questionId,rating})}
     onAdd={()=>setEditor({editing:null})} onEdit={id=>setEditor({editing:mine.find(m=>m.id===id)??null})}
     onDelete={async id=>{const r=await fetch('/api/my-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id})});const d=await r.json() as {items?:MyQuestion[];error?:string};if(r.ok)setMine(d.items??[]);else setError(d.error??'')}}/>}
  {editor&&<MyEditor open onClose={()=>setEditor(null)} onSaved={setMine} editing={editor.editing} subject={track&&track!==MINE?track:MINE} tracks={editable}/>}
  <Dialog open={goalOpen} onOpenChange={setGoalOpen}><DialogContent><DialogHeader><DialogTitle>{L('设置每日目标','Daily goals')}</DialogTitle><DialogDescription>{L('按北京时间每日更新；到期但未完成的复习会保留。','Resets daily (Beijing time); unfinished reviews carry over.')}</DialogDescription></DialogHeader>
   <label className="goal-label">{L('每天新学','New per day')}<input type="number" min="1" max="100" value={goals.n} onChange={e=>setGoals(g=>({...g,n:Number(e.target.value)}))}/></label>
   <label className="goal-label">{L('每天复习','Reviews per day')}<input type="number" min="1" max="100" value={goals.r} onChange={e=>setGoals(g=>({...g,r:Number(e.target.value)}))}/></label>
   <button className="button primary" onClick={async()=>{if(await save({action:'goals',newGoal:goals.n,reviewGoal:goals.r}))setGoalOpen(false)}}>{L('保存目标','Save')}</button></DialogContent></Dialog>
 </div>}
