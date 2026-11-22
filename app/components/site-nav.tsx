'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookText,ChevronDown,Code2,GraduationCap,HeartHandshake,Info,MessagesSquare} from 'lucide-react';
import {useI18n} from './i18n';
import GlobalSearch from './global-search';

export type Section='learn'|'interview'|'notes'|'playground'|'stories'|'about'|'practice'|'feedback'|'releases';

// 全站顶栏导航：桌面宽屏展示 学习｜面试｜笔记｜操场｜故事｜关于｜搜索；窄屏/移动端将 笔记/操场/故事/关于 收纳进「更多」玻璃浮层，保持单行不溢出。
export default function SiteNav({active}:{active:Section}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [moreOpen,setMoreOpen]=useState(false);
 const moreBtnRef=useRef<HTMLButtonElement>(null);
 const menuRef=useRef<HTMLDivElement>(null);

 const extraActive=active==='notes'||active==='playground'||active==='stories'||active==='about';
 const extraLabel=
  active==='notes'?L('笔记','Notes')
  :active==='playground'?L('操场','Playground')
  :active==='stories'?L('故事','Stories')
  :active==='about'?L('关于','About')
  :L('更多','More');

 useEffect(()=>{
  if(!moreOpen)return;
  const place=()=>{
   const btn=moreBtnRef.current,menu=menuRef.current;
   if(!btn||!menu)return;
   const r=btn.getBoundingClientRect(),vw=window.innerWidth;
   const top=Math.max(8,Math.round(r.bottom+8));
   const left=Math.max(12,Math.min(vw-230,Math.round(r.left)));
   menu.style.top=`${top}px`;
   menu.style.left=`${left}px`;
  };
  place();
  const onDoc=(e:PointerEvent)=>{
   const target=e.target as Node|null;
   if(target&&!moreBtnRef.current?.contains(target)&&!menuRef.current?.contains(target))setMoreOpen(false);
  };
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setMoreOpen(false)};
  window.addEventListener('resize',place);
  document.addEventListener('pointerdown',onDoc);
  document.addEventListener('keydown',onKey);
  return()=>{
   window.removeEventListener('resize',place);
   document.removeEventListener('pointerdown',onDoc);
   document.removeEventListener('keydown',onKey);
  };
 },[moreOpen]);

 const item=(id:Section,href:string,icon:React.ReactNode,label:string,extra=false)=>(
  <a
   href={href}
   className={(active===id?'on':'')+(extra?' site-nav-extra':'')}
   aria-current={active===id?'page':undefined}
  >
   {icon}
   <span>{label}</span>
  </a>
 );

 return (
  <nav className="site-nav" aria-label={L('主导航','Main navigation')}>
   {item('learn','/learn',<GraduationCap size={17}/>,L('学习','Learn'))}
   {item('interview','/interview',<MessagesSquare size={17}/>,L('面试','Interview'))}
   {item('notes','/notes',<BookText size={17}/>,L('笔记','Notes'),true)}
   {item('playground','/playground',<Code2 size={17}/>,L('操场','Playground'),true)}
   {item('stories','/stories',<HeartHandshake size={17}/>,L('故事','Stories'),true)}
   {item('about','/about',<Info size={17}/>,L('关于','About'),true)}

   <button
    ref={moreBtnRef}
    type="button"
    className={'site-nav-more'+(extraActive?' on':'')}
    aria-expanded={moreOpen}
    aria-haspopup="menu"
    onClick={()=>setMoreOpen(v=>!v)}
   >
    <span>{extraLabel}</span>
    <ChevronDown size={13} className={moreOpen?'rot':''}/>
   </button>

   <GlobalSearch/>

   {moreOpen&&typeof document!=='undefined'&&createPortal(
    <div ref={menuRef} className="site-nav-menu" role="menu" aria-label={L('更多栏目','More sections')}>
     <a href="/notes" role="menuitem" className={active==='notes'?'on':undefined} onClick={()=>setMoreOpen(false)}>
      <BookText size={16}/>
      <b>{L('仿真笔记本','Study Notebooks')}</b>
     </a>
     <a href="/playground" role="menuitem" className={active==='playground'?'on':undefined} onClick={()=>setMoreOpen(false)}>
      <Code2 size={16}/>
      <b>{L('代码操场','Code Playground')}</b>
     </a>
     <a href="/stories" role="menuitem" className={active==='stories'?'on':undefined} onClick={()=>setMoreOpen(false)}>
      <HeartHandshake size={16}/>
      <b>{L('分享故事','Share Your Story')}</b>
     </a>
     <a href="/about" role="menuitem" className={active==='about'?'on':undefined} onClick={()=>setMoreOpen(false)}>
      <Info size={16}/>
      <b>{L('项目关于','About Project')}</b>
     </a>
    </div>,
    document.body,
   )}
  </nav>
 );
}
