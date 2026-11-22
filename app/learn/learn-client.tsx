'use client';
import '../ai/ai.css';
import {useState,useSyncExternalStore} from 'react';
import {ArrowRight} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';
import SiteHeader from '../components/site-header';
import SpaceTabs from '../components/space-tabs';
import {learnSpaces,learnSubjects} from './subjects';

const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify)};
const EXAM_ID=/-(?:train|stage|final|exam)(?:-\d+|\d+)?$/i;
const passedCount=(key:string,max:number)=>{try{const raw=localStorage.getItem(key);if(!raw)return 0;const list=JSON.parse(raw).passed;if(!Array.isArray(list))return 0;return Math.min(max,list.filter((id:unknown)=>typeof id==='string'&&!EXAM_ID.test(id)).length)}catch{return 0}};

// 「学习」首页：按分类横向展开（技术 / 语言 / 项目），点击「技术」等分类卡片在下方展开对应学科。
export default function LearnClient({username}:{username:string}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const progress=useSyncExternalStore(subscribe,()=>learnSubjects.map(s=>passedCount(s.storageKey+(username||'guest'),s.levels)).join(','),()=>'');
 const counts=progress?progress.split(',').map(Number):learnSubjects.map(()=>0);
 const [activeSpace,setActiveSpace]=useState<string|null>(null);

 const spaceItems=learnSpaces.map(sp=>{
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
 });
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
    {current&&<div className="learn-subjects">
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
   </SpaceTabs>
  </main>
 </div>;
}
