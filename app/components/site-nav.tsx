'use client';
import {Dumbbell,GraduationCap,MessageSquarePlus,MessagesSquare} from 'lucide-react';
import {useI18n} from './i18n';
import GlobalSearch from './global-search';

export type Section='learn'|'interview'|'practice'|'feedback';
// 全站顶栏的「学习｜面试｜训练｜反馈」切换，最右边是全局搜索。用整页跳转，配合服务端与首屏内联暗色样式及 View Transition 实现无闪烁切换。
export default function SiteNav({active}:{active:Section}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const item=(id:Section,href:string,icon:React.ReactNode,label:string)=><a href={href} className={active===id?'on':''} aria-current={active===id?'page':undefined}>{icon}{label}</a>;
 return <nav className="site-nav" aria-label={L('主导航','Main navigation')}>{item('learn','/learn',<GraduationCap size={17}/>,L('学习','Learn'))}{item('interview','/interview',<MessagesSquare size={17}/>,L('面试','Interview'))}{item('practice','/practice',<Dumbbell size={17}/>,L('训练','Practice'))}{item('feedback','/feedback',<MessageSquarePlus size={17}/>,L('反馈','Feedback'))}<GlobalSearch/></nav>}

