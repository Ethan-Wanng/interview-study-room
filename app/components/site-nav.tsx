'use client';
import {GraduationCap,MessagesSquare} from 'lucide-react';
import {useI18n} from './i18n';

// 全站顶栏的「学习｜面试」切换。用整页跳转，与站内其他入口一致。
export default function SiteNav({active}:{active:'learn'|'interview'}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const item=(id:'learn'|'interview',href:string,icon:React.ReactNode,label:string)=>
  <a href={href} className={active===id?'on':''} aria-current={active===id?'page':undefined}>{icon}{label}</a>;
 return <nav className="site-nav" aria-label={L('主导航','Main navigation')}>{item('learn','/learn',<GraduationCap size={17}/>,L('学习','Learn'))}{item('interview','/interview',<MessagesSquare size={17}/>,L('面试','Interview'))}</nav>}
