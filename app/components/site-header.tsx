'use client';
import {useEffect} from 'react';
import SiteNav,{type Section} from './site-nav';
import AccountMenu from './account-menu';
import FeedbackFab from './feedback-fab';
import {HeaderAiButton} from '../ai/ai-dock';
import {setCurrentNotesUser} from '@/lib/notes-store';

// 全站顶部固定玻璃导航栏：左侧为「学习 / 面试 / 笔记 / 搜索」与独立的「反馈」「AI问答」按钮，右侧为版本更新、通知与用户设置。
export default function SiteHeader({active,username}:{active:Section;username:string}){
 useEffect(()=>{setCurrentNotesUser(username)},[username]);
 return <header className="ai-header">
  <div className="site-nav-row">
   <SiteNav active={active}/>
   <FeedbackFab/>
   <HeaderAiButton/>
  </div>
  <div className="top-actions"><AccountMenu username={username}/></div>
 </header>;
}
