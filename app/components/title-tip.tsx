'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {CircleAlert,Settings} from 'lucide-react';
import {useI18n} from './i18n';

// 模块标题右侧的圆形「!」简介按钮：悬浮或点击展开模块说明，保持标题区紧凑清爽。
export default function TitleTip({children}:{children:ReactNode}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [pinned,setPinned]=useState(false),[hover,setHover]=useState(false);
 const ref=useRef<HTMLSpanElement>(null);
 const open=pinned||hover;
 useEffect(()=>{
  if(!pinned)return;
  const onDoc=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setPinned(false)};
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setPinned(false)};
  document.addEventListener('mousedown',onDoc);
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('mousedown',onDoc);document.removeEventListener('keydown',onKey)};
 },[pinned]);
 return (
  <span ref={ref} className="title-tip-wrap" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
   <button
    type="button"
    className={'title-tip-btn'+(open?' open':'')}
    aria-label={L('查看模块说明','Module info')}
    aria-expanded={open}
    onClick={e=>{e.stopPropagation();setPinned(v=>!v)}}
   >
    <CircleAlert size={17}/>
   </button>
   {open&&(
    <div className="title-tip-pop" role="tooltip" onClick={e=>e.stopPropagation()}>
     {children}
    </div>
   )}
  </span>
 );
}

// 模块标题「!」后面的圆形「⚙」设置按钮：点击展开该模式的筛选与偏好设置，保持页面主体清爽直达内容。
export function TitleGear({
 children,
 label,
 active,
}:{
 children:ReactNode;
 label?:string;
 active?:boolean;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  if(!open)return;
  const onDoc=(e:MouseEvent)=>{
   const target=e.target as HTMLElement|null;
   if(target?.tagName==='OPTION')return;
   if(ref.current&&target&&!ref.current.contains(target))setOpen(false);
  };
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  document.addEventListener('mousedown',onDoc);
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('mousedown',onDoc);document.removeEventListener('keydown',onKey)};
 },[open]);
 return (
  <span ref={ref} className="title-tip-wrap">
   <button
    type="button"
    className={'title-tip-btn title-gear-btn'+(open?' open':'')+(active?' active':'')}
    aria-label={label??L('模式设置','Mode settings')}
    aria-expanded={open}
    onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}
   >
    <Settings size={16}/>
    {active&&<i className="title-gear-dot" aria-hidden="true"/>}
   </button>
   {open&&(
    <div className="title-tip-pop title-gear-pop" role="dialog" aria-label={label??L('模式设置','Mode settings')} onClick={e=>e.stopPropagation()}>
     {children}
    </div>
   )}
  </span>
 );
}
