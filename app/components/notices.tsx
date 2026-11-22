'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Bell,CheckCheck,ChevronDown,ExternalLink,History,MessageSquareReply,RefreshCw,Sparkles,X} from 'lucide-react';
import {useI18n} from './i18n';
import {APP_VERSION,groupReleasesByDay,type Release} from '@/lib/releases';
import type {Notice} from '@/lib/notify';

// 通知的共享状态：全站只有 NoticeCenter 负责定时拉取 /api/notifications，铃铛和新版本横幅都从这里读。
type State={version:string;releases:Release[];items:Notice[];seen:string|null;fetchedAt:number};
let state:State={version:'',releases:[],items:[],seen:null,fetchedAt:0};
const listeners=new Set<()=>void>();
const set=(patch:Partial<State>)=>{state={...state,...patch};listeners.forEach(l=>l())};
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};
const useNotices=()=>useSyncExternalStore(subscribe,()=>state,()=>state);
const SEEN_KEY='notice-release-seen';
// 旧网址（workers.dev）停用提醒：只在旧网址上显示，新网址上不显示。
export const NEW_SITE='https://exhan.dpdns.org',OLD_SITE_END='2026 年 11 月 19 日';
const onOldSite=()=>typeof window!=='undefined'&&window.location.hostname.endsWith('.workers.dev');
const newSiteHref=()=>NEW_SITE+window.location.pathname+window.location.search;
const MOVE_TEXT=`网站已经换到新网址 ${NEW_SITE}，旧网址将在 ${OLD_SITE_END}停止服务。请收藏新网址；用同一个账号登录，学习进度和考试记录会自动同步过去（游客的进度只保存在当前浏览器里，换网址后看不到）。`;

async function refresh(){
 try{const r=await fetch('/api/notifications',{cache:'no-store'});if(!r.ok)return;
  const d=await r.json() as {version:string;releases:Release[];items:Notice[]};
  let seen:string|null=null;try{seen=localStorage.getItem(SEEN_KEY)}catch{}
  set({version:d.version,releases:d.releases??[],items:d.items??[],seen,fetchedAt:Date.now()})}catch{}}

// 没看过的更新说明：排在“上次看过的版本”前面的那些；从没看过时只算最新一条。
function unreadReleases(s:State){if(!s.releases.length)return [];const i=s.seen?s.releases.findIndex(r=>r.version===s.seen):1;return s.releases.slice(0,i<0?s.releases.length:i)}

// 版本更新和通知分开记已读：打开「版本更新」只把更新说明标为看过，打开铃铛只把自己的通知标为已读。
function markReleasesSeen(){const latest=state.releases[0]?.version;if(!latest)return;try{localStorage.setItem(SEEN_KEY,latest)}catch{}set({seen:latest})}
async function markAllRead(){
 const unread=state.items.filter(n=>!n.read).map(n=>n.id);
 set({items:state.items.map(n=>({...n,read:true}))});
 if(unread.length)await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:unread})}).catch(()=>{});
}

const when=(t:number,L:(zh:string,en:string)=>string)=>{const m=Math.round((Date.now()-t)/60000);if(m<1)return L('刚刚','just now');if(m<60)return L(`${m} 分钟前`,`${m} min ago`);const h=Math.round(m/60);if(h<24)return L(`${h} 小时前`,`${h} h ago`);return new Date(t).toLocaleDateString()};

// 挂到 body 下的浮层容器：避免被固定导航栏的 backdrop-filter 裁切或丢失背景模糊，且在窄屏下完整居于视口内。
export function NoticePopover({
 open,
 triggerRef,
 onClose,
 label,
 className,
 children,
}:{
 open:boolean;
 triggerRef:RefObject<HTMLDivElement|null>;
 onClose:()=>void;
 label:string;
 className?:string;
 children:ReactNode;
}){
 const panelRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  const place=()=>{
   const el=triggerRef.current,panel=panelRef.current;if(!el||!panel)return;
   const r=el.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
   const top=Math.max(8,Math.round(r.bottom+8));
   const maxH=Math.max(200,Math.round(vh-top-14));
   panel.style.top=`${top}px`;
   panel.style.maxHeight=`${maxH}px`;
   if(vw<=640){
    panel.style.left='12px';
    panel.style.right='12px';
    panel.style.width='auto';
   }else{
    const w=Math.min(396,vw-24);
    const right=Math.max(12,Math.min(vw-w-12,Math.round(vw-r.right)));
    panel.style.left='auto';
    panel.style.right=`${right}px`;
    panel.style.width=`${w}px`;
   }
  };
  place();
  const close=(e:PointerEvent)=>{
   const target=e.target as Node|null;
   if(target&&!triggerRef.current?.contains(target)&&!panelRef.current?.contains(target))onClose();
  };
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};
  window.addEventListener('resize',place);
  window.addEventListener('scroll',place,{passive:true,capture:true});
  document.addEventListener('pointerdown',close);
  document.addEventListener('keydown',esc);
  return()=>{
   window.removeEventListener('resize',place);
   window.removeEventListener('scroll',place,true);
   document.removeEventListener('pointerdown',close);
   document.removeEventListener('keydown',esc);
  };
 },[open,triggerRef,onClose]);

 if(!open||typeof document==='undefined')return null;
 return createPortal(
  <div ref={panelRef} className={'notice-panel'+(className?' '+className:'')} role="dialog" aria-label={label}>
   {children}
  </div>,
  document.body,
 );
}

// 全站挂一个：打开页面、每 3 分钟、切回标签页时检查一次。线上版本和本页代码的版本不同，就在顶部提示刷新，并列出这次改了什么。
export function NoticeCenter(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const s=useNotices(),[dismissed,setDismissed]=useState(''),[old,setOld]=useState(false);
 useEffect(()=>{let hidden=false;try{hidden=sessionStorage.getItem('old-site-hidden')==='1'}catch{}setOld(onOldSite()&&!hidden)},[]);
 useEffect(()=>{void refresh();const t=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},180000);
  const onVisible=()=>{if(document.visibilityState==='visible'&&Date.now()-state.fetchedAt>60000)void refresh()};
  document.addEventListener('visibilitychange',onVisible);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',onVisible)}},[]);
 const moved=old?<div className="notice-move" role="alert"><Sparkles size={17}/><span>{MOVE_TEXT}</span><a className="button primary" href={newSiteHref()}>{L('打开新网址','Open the new site')}</a><button type="button" className="notice-update-close" aria-label={L('关闭','Close')} onClick={()=>{try{sessionStorage.setItem('old-site-hidden','1')}catch{}setOld(false)}}><X size={16}/></button></div>:null;
 if(!s.version||s.version===APP_VERSION||dismissed===s.version)return moved;
 const mine=s.releases.findIndex(r=>r.version===APP_VERSION),fresh=s.releases.slice(0,mine<0?1:mine);
 return <>{moved}<div className="notice-update" role="alert"><div className="notice-update-head"><Sparkles size={18}/><strong>{L('有新版本，请刷新页面','A new version is available — please refresh')}</strong><button type="button" className="notice-update-close" aria-label={L('稍后再说','Later')} onClick={()=>setDismissed(s.version)}><X size={16}/></button></div>
  {fresh.length>0&&<div className="notice-update-body">{fresh.map(r=><div key={r.version}><b>{r.title}</b><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></div>)}</div>}
  <div className="notice-update-actions"><button type="button" className="button primary" onClick={()=>window.location.reload()}><RefreshCw size={15}/>{L('立即刷新','Refresh now')}</button><small>{L('正在写的答案请先保存或提交再刷新。','Save or submit any answer you are writing first.')}</small></div></div></>}

// 顶栏的「版本更新」：显示当前版本号，点开是每个版本改了什么（来自 lib/releases.ts，每次上线都往里写一条）。有没看过的更新时右上角亮一个白点。
export function VersionLog(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const s=useNotices(),[open,setOpen]=useState(false),box=useRef<HTMLDivElement>(null),[fresh,setFresh]=useState<Set<string>>(new Set);
 const unread=unreadReleases(s),days=groupReleasesByDay(s.releases).slice(0,3);
 const toggle=()=>{if(!open){setFresh(new Set(unread.map(r=>r.version)));markReleasesSeen()}setOpen(!open)};
 return <div className="notice-bell version-log" ref={box}><button type="button" className="notice-bell-btn version-btn" aria-label={L(`版本更新${unread.length?`（${unread.length} 条没看过）`:''}`,`Version updates${unread.length?` (${unread.length} new)`:''}`)} title={L(`版本更新 · 当前 v${APP_VERSION}`,`Version updates · v${APP_VERSION}`)} aria-expanded={open} onClick={toggle}><History size={18}/>{unread.length>0&&<span className="version-dot"/>}</button>
  <NoticePopover open={open} triggerRef={box} onClose={()=>setOpen(false)} label={L('版本更新','Version updates')}>
   <div className="notice-panel-head"><strong>{L('版本更新','Version updates')}</strong><span>{L(`当前 v${APP_VERSION}`,`v${APP_VERSION}`)}</span>{days.length>1&&<button type="button" className="version-all" onClick={e=>{const list=e.currentTarget.closest('.notice-panel')?.querySelectorAll('details');if(!list)return;const expand=[...list].some(d=>!d.open);list.forEach(d=>{d.open=expand})}}>{L('全部展开 / 折叠','Expand / collapse all')}</button>}</div>
   <div className="notice-list">
    {days.map((d,i)=>{const dayUnread=d.releases.some(r=>fresh.has(r.version)),head=d.releases[0]?.title??'';return <details key={d.date} className={'version-item version-day'+(dayUnread?' unread':'')} open={i===0||dayUnread}><summary><i className="version-tag version-date-tag">{d.date}</i><b title={d.releases.map(r=>r.title).join(' / ')}>{head}</b>{d.releases.length>1&&<span className="version-day-count">{L(`${d.releases.length} 项`,`${d.releases.length}`)}</span>}<ChevronDown size={15}/></summary><div className="version-day-body">{d.releases.map(r=><div key={r.version} className={'version-sub'+(fresh.has(r.version)?' unread':'')}><div className="version-subhead"><i className="version-tag">v{r.version}</i><b>{r.title}</b></div><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul>{r.version!==APP_VERSION&&s.version===r.version&&<small>{L('刷新页面后生效','Refresh to get it')}</small>}</div>)}</div></details>})}
    {!s.releases.length&&<p className="notice-empty">{L('还没有更新记录。','No updates yet.')}</p>}
   </div>
   {s.releases.length>0&&<a href="/releases" target="_blank" rel="noopener noreferrer" className="version-more" onClick={()=>setOpen(false)}><span>{L('查看更多更新内容','View all release notes')}</span><ExternalLink size={14}/></a>}
  </NoticePopover></div>}

// 顶栏的铃铛：只放发给自己的通知（比如反馈有了回复），未读数用黄色标出。网站更新在旁边的「版本更新」里。打开列表即全部标为已读。
export function NoticeBell(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const s=useNotices(),[open,setOpen]=useState(false),box=useRef<HTMLDivElement>(null);
 const [oldSite,setOldSite]=useState(false),[oldSeen,setOldSeen]=useState(true);
 useEffect(()=>{const o=onOldSite();setOldSite(o);try{setOldSeen(!o||localStorage.getItem('old-site-seen')==='1')}catch{setOldSeen(!o)}},[]);
 const count=s.items.filter(n=>!n.read).length+(oldSeen?0:1);
 const [snapshot,setSnapshot]=useState<{items:Set<string>}>({items:new Set});
 const toggle=()=>{if(!open){setSnapshot({items:new Set(s.items.filter(n=>!n.read).map(n=>n.id))});if(count)void markAllRead();if(!oldSeen){try{localStorage.setItem('old-site-seen','1')}catch{}setOldSeen(true)}}setOpen(!open)};
 return <div className="notice-bell" ref={box}><button type="button" className="notice-bell-btn" aria-label={L(`通知${count?`（${count} 条未读）`:''}`,`Notifications${count?` (${count} unread)`:''}`)} aria-expanded={open} onClick={toggle}><Bell size={18}/>{count>0&&<span className="notice-count">{count>9?'9+':count}</span>}</button>
  <NoticePopover open={open} triggerRef={box} onClose={()=>setOpen(false)} label={L('通知','Notifications')}>
   <div className="notice-panel-head"><strong>{L('通知','Notifications')}</strong>{count===0&&<span><CheckCheck size={14}/>{L('都看过了','All caught up')}</span>}</div>
   <div className="notice-list">
    {oldSite&&<a href={newSiteHref()} className="notice-item unread"><Sparkles size={16}/><span><b>{L('网站换新网址了','The site has moved')}</b><small>{MOVE_TEXT}</small><time>{L('点这里打开新网址','Open the new address')}</time></span></a>}
    {s.items.map(n=><a key={n.id} href={n.link||'/feedback'} className={'notice-item'+(snapshot.items.has(n.id)?' unread':'')} onClick={()=>setOpen(false)}><MessageSquareReply size={16}/><span><b>{n.title}</b>{n.body&&<small>{n.body}</small>}<time>{when(n.createdAt,L)}</time></span></a>)}
    {!s.items.length&&!oldSite&&<p className="notice-empty">{L('暂无通知','No notifications')}</p>}
   </div>
  </NoticePopover></div>}
