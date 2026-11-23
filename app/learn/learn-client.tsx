'use client';
import '../ai/ai.css';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,Plus} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';
import SiteHeader from '../components/site-header';
import SpaceTabs from '../components/space-tabs';
import {learnSpaces,learnSubjects} from './subjects';
import {subscribeJdTaskDone} from '@/lib/jd-bg-tasks';

export type JdTopicSummary={id:string;title:string;subtitle:string;total:number;running?:boolean};

const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify)};
const EXAM_ID=/-(?:train|stage|final|exam)(?:-\d+|\d+)?$/i;
const passedCount=(key:string,max:number)=>{try{const raw=localStorage.getItem(key);if(!raw)return 0;const list=JSON.parse(raw).passed;if(!Array.isArray(list))return 0;return Math.min(max,list.filter((id:unknown)=>typeof id==='string'&&!EXAM_ID.test(id)).length)}catch{return 0}};
const JD_KEY_PREFIX='jd-special-journey:v1:';
const readJdPassed=(username:string):string[]=>{
 try{
  const raw=localStorage.getItem(JD_KEY_PREFIX+(username||'guest'));
  if(!raw)return [];
  const list=JSON.parse(raw).passed;
  return Array.isArray(list)?list.filter((x:unknown)=>typeof x==='string'):[];
 }catch{return []}
};

// 「学习」首页：按分类横向展开（技术 / 语言 / 项目 / 专题），点击分类卡片在下方展开对应学科或 JD 专题。
export default function LearnClient({username,jdTopics=[]}:{username:string;jdTopics?:JdTopicSummary[]}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const router=useRouter();
 useEffect(()=>subscribeJdTaskDone(()=>{router.refresh()}),[router]);
 const progress=useSyncExternalStore(
  subscribe,
  ()=>[...learnSubjects.map(s=>passedCount(s.storageKey+(username||'guest'),s.levels)),readJdPassed(username).join('|')].join(','),
  ()=>'',
 );
 const parts=progress?progress.split(','):[];
 const counts=learnSubjects.map((_,i)=>Number(parts[i])||0);
 const jdPassedSet=new Set((parts[learnSubjects.length]||'').split('|').filter(Boolean));
 const [activeSpace,setActiveSpace]=useState<string|null>(null);

 const jdCounts=jdTopics.map(t=>{
  if(t.running||!t.total)return 0;
  const prefix=`${t.id}:`;
  let done=0;
  for(const k of jdPassedSet)if(k.startsWith(prefix))done++;
  return Math.min(t.total,done);
 });
 const jdDoneSum=jdCounts.reduce((a,b)=>a+b,0);
 const jdTotalSum=jdTopics.reduce((a,b)=>a+b.total,0);

 const spaceItems=[
  ...learnSpaces.map(sp=>{
   const list=learnSubjects.filter(s=>s.space===sp.id);
   const doneSum=list.reduce((sum,s)=>sum+(counts[learnSubjects.indexOf(s)]??0),0);
   const totalSum=list.reduce((sum,s)=>sum+s.levels,0);
   return {
    id:sp.id,
    icon:sp.icon,
    title:L(sp.name[0],sp.name[1]),
    countText:L(`${list.length} 门学科`,`${list.length} subjects`),
    progressText:L(`已通关 ${doneSum}/${totalSum}`,`${doneSum}/${totalSum}`),
    allDone:totalSum>0&&doneSum>=totalSum,
    list,
   };
  }),
  {
   id:'special',
   icon:'🧭',
   title:L('专题','JD Topics'),
   countText:L(`${jdTopics.length} 个专题`,`${jdTopics.length} topics`),
   progressText:jdTotalSum>0?L(`已掌握 ${jdDoneSum}/${jdTotalSum}`,`${jdDoneSum}/${jdTotalSum}`):L('由 JD / 面经生成','From JD Research'),
   allDone:jdTotalSum>0&&jdDoneSum>=jdTotalSum,
   list:[] as typeof learnSubjects[number][],
  },
 ];
 const current=spaceItems.find(x=>x.id===activeSpace);

 return <div className="ai-shell">
  <SiteHeader active="learn" username={username}/>
  <main className="ai-main">
   <div className="ai-title">
    <span className="eyebrow">LEARN</span>
    <h1>{L('选一门开始学习','Pick a subject to learn')}</h1>
   </div>
   {!username&&<p className="visitor-banner">{L('游客模式 · 闯关进度只保存在当前浏览器','Guest mode · progress is saved in this browser only')}</p>}
   <SpaceTabs items={spaceItems} active={activeSpace} onToggle={id=>setActiveSpace(p=>p===id?null:id)}>
    {current&&current.id!=='special'&&<div className="learn-subjects">
     {current.list.map(s=>{
      const n=counts[learnSubjects.indexOf(s)]??0;
      return <a key={s.id} href={s.href} className="ai-card learn-subject">
       <div className="learn-subject-head">
        <span className="learn-icon">{s.icon}</span>
        <strong>{L(s.name[0],s.name[1])}</strong>
       </div>
       <Progress value={n/s.levels*100}/>
       <span className="learn-foot"><span>{L(`已通关 ${n}/${s.levels}`,`${n}/${s.levels}`)}</span><b><span>{n?L('继续学习','Continue'):L('开始学习','Start')}</span><ArrowRight size={15}/></b></span>
      </a>;
     })}
    </div>}
    {current&&current.id==='special'&&<div className="learn-subjects">
     {jdTopics.map((t,idx)=>{
      const done=jdCounts[idx]??0;
      return <a key={t.id} href={t.running?`/interview/jd-research?id=${encodeURIComponent(t.id)}`:`/learn/jd-special?id=${encodeURIComponent(t.id)}`} className="ai-card learn-subject">
       <div className="learn-subject-head">
        <span className="learn-icon">🧭</span>
        <strong>{t.title}</strong>
       </div>
       {t.subtitle&&<span className="muted">{t.subtitle}</span>}
       {!t.running&&<Progress value={t.total?done/t.total*100:0}/>}
       <span className="learn-foot"><span>{t.running?L('后台生成中…','Generating…'):L(`已掌握 ${done}/${t.total} 题`,`${done}/${t.total}`)}</span><b><span>{t.running?L('查看进度','Progress'):done?L('继续学习','Continue'):L('开始学习','Start')}</span><ArrowRight size={15}/></b></span>
      </a>;
     })}
     <a href="/interview/jd-research?new=1" className="ai-card learn-subject" style={{borderStyle:'dashed'}}>
      <div className="learn-subject-head">
       <span className="learn-icon" style={{display:'inline-flex',alignItems:'center',color:'var(--primary)'}}><Plus size={22}/></span>
       <strong>{L('生成新的 JD / 面经专题','Generate JD / Interview Topic')}</strong>
      </div>
      <span className="learn-foot"><span/><b><span>{L('去生成','Generate')}</span><ArrowRight size={15}/></b></span>
     </a>
    </div>}
   </SpaceTabs>
  </main>
 </div>;
}
