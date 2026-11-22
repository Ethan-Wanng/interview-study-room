'use client';
import {useMemo,useState} from 'react';
import {ChevronDown,History,Search,Sparkles,X} from 'lucide-react';
import SiteHeader from '../components/site-header';
import {useI18n} from '../components/i18n';
import {APP_VERSION,RELEASES,groupReleasesByDay} from '@/lib/releases';
import '../ai/ai.css';
import './releases.css';

export default function ReleasesClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [query,setQuery]=useState('');
 const [collapsed,setCollapsed]=useState<Set<string>>(()=>new Set());

 const filteredReleases=useMemo(()=>{
  const q=query.trim().toLowerCase();
  if(!q)return RELEASES;
  return RELEASES.filter(r=>
   r.version.toLowerCase().includes(q)
   ||r.date.toLowerCase().includes(q)
   ||r.title.toLowerCase().includes(q)
   ||r.changes.some(c=>c.toLowerCase().includes(q))
  );
 },[query]);

 const allDays=useMemo(()=>groupReleasesByDay(RELEASES),[]);
 const days=useMemo(()=>groupReleasesByDay(filteredReleases),[filteredReleases]);
 const allCollapsed=days.length>0&&days.every(d=>collapsed.has(d.date));

 const toggleDay=(date:string)=>{
  setCollapsed(prev=>{
   const next=new Set(prev);
   if(next.has(date))next.delete(date);else next.add(date);
   return next;
  });
 };

 const toggleAll=()=>{
  if(allCollapsed)setCollapsed(new Set());
  else setCollapsed(new Set(days.map(d=>d.date)));
 };

 return (
  <div className="rel-shell">
   <SiteHeader active="releases" username={username}/>
   <main className="rel-main">
    <section className="rel-hero">
     <div>
      <span className="rel-pill"><History size={14}/>{L('全站更新记录','Site Changelog')}</span>
      <h1>{L('版本更新日志','Version Release Notes')}</h1>
      <p>{L('按天汇总全站每次功能迭代、评分规则优化、题库校对与 bug 修复，支持按版本号或关键词检索全部历史更新。','All feature updates, grading improvements, question fixes, and bug fixes grouped by date.')}</p>
     </div>
     <div className="rel-stats">
      <div className="rel-stat"><span>{L('当前版本','Current')}</span><strong>v{APP_VERSION}</strong></div>
      <div className="rel-stat"><span>{L('累计发布','Releases')}</span><strong>{RELEASES.length}</strong></div>
      <div className="rel-stat"><span>{L('更新天数','Days')}</span><strong>{allDays.length}</strong></div>
     </div>
    </section>

    <section className="rel-toolbar">
     <label className="rel-search">
      <Search size={16}/>
      <input
       type="search"
       value={query}
       onChange={e=>setQuery(e.target.value)}
       placeholder={L('搜索版本号、日期或更新内容…','Search version, date, or changes…')}
       aria-label={L('搜索更新日志','Search release notes')}
      />
      {query&&(
       <button type="button" className="rel-search-clear" onClick={()=>setQuery('')} aria-label={L('清空搜索','Clear search')}>
        <X size={14}/>
       </button>
      )}
     </label>
     <div className="rel-toolbar-actions">
      {query&&<span className="rel-match-count">{L(`匹配 ${filteredReleases.length} 条 / ${days.length} 天`,`${filteredReleases.length} updates / ${days.length} days`)}</span>}
      {days.length>1&&(
       <button type="button" className="rel-toggle-all" onClick={toggleAll}>
        {allCollapsed?L('全部展开','Expand all'):L('全部折叠','Collapse all')}
       </button>
      )}
     </div>
    </section>

    {days.length===0?(
     <div className="rel-empty">
      <p>{L('没有找到匹配的更新记录，换个关键词试试。','No matching release notes found.')}</p>
     </div>
    ):(
     <div className="rel-days">
      {days.map((d,di)=>{
       const open=!collapsed.has(d.date);
       return (
        <article key={d.date} className={'rel-day-card'+(di===0&&!query?' latest':'')}>
         <button
          type="button"
          className="rel-day-head"
          aria-expanded={open}
          onClick={()=>toggleDay(d.date)}
         >
          <span className="rel-day-date">{d.date}</span>
          <strong className="rel-day-title">{d.releases[0]?.title??''}</strong>
          <span className="rel-day-meta">
           <span className="rel-day-count">{L(`${d.releases.length} 条更新`,`${d.releases.length} update${d.releases.length>1?'s':''}`)}</span>
           <ChevronDown size={17} className={open?'rot':''}/>
          </span>
         </button>
         {open&&(
          <div className="rel-day-body">
           {d.releases.map(r=>(
            <div key={r.version} className={'rel-release'+(r.version===APP_VERSION?' current':'')}>
             <div className="rel-release-head">
              <span className="rel-ver-badge">v{r.version}</span>
              {r.version===APP_VERSION&&<span className="rel-cur-badge"><Sparkles size={12}/>{L('当前线上版本','Current')}</span>}
              <h2>{r.title}</h2>
             </div>
             <ul>
              {r.changes.map(c=><li key={c}>{c}</li>)}
             </ul>
            </div>
           ))}
          </div>
         )}
        </article>
       );
      })}
     </div>
    )}
   </main>
  </div>
 );
}
