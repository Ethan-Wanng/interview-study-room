'use client';
import '../ai/ai.css';
import {useEffect,useState} from 'react';
import {useI18n} from './i18n';
import AiDock,{useOtherDocks} from '../ai/ai-dock';

// 全站挂一个：任何页面右下角都有「问 AI」。在学习卡片、题目上时由它们旁边的 AI 老师接管（那个更了解当前内容），这里自动让位；
// 考试作答时、登录页、后台和 AI 客服演练场不显示。它可以回答“某个关键词在哪里学、哪里有相关的题”，并给出能直接点开的链接。
export default function SiteTutor(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [path,setPath]=useState(''),others=useOtherDocks();
 useEffect(()=>{const sync=()=>setPath(window.location.pathname);sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[]);
 if(!path||others||/^\/(login|admin)/.test(path)||path.includes('/sandbox'))return null;
 return <AiDock site context={{kind:'site',page:path}} chatKey="site"
  hello={L('我是全站的 AI 老师。可以问我知识点，也可以问“某个关键词在哪里学、哪里有相关的题”，我会给你能直接点开的链接。','I am the site-wide AI tutor. Ask about any topic, or where a keyword is taught or practised — I will reply with links you can open.')}
  prompts={[L('CoT（思维链）在哪一关讲过？','Where is chain-of-thought (CoT) taught?'),L('我想练 Redis 相关的题，去哪里找？','Where can I practise Redis questions?'),L('这个网站应该怎么用？','How do I use this site?')]}/>}
