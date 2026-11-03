'use client';
import '../ai/ai.css';
import {useSyncExternalStore} from 'react';
import {ArrowRight,BookOpen} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import AccountMenu from '../components/account-menu';
import SiteNav from '../components/site-nav';
import {learnSpaces,learnSubjects} from './subjects';

const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify)};
const passedCount=(key:string)=>{try{const raw=localStorage.getItem(key);return raw?(JSON.parse(raw).passed?.length??0):0}catch{return 0}};

// 「学习」首页：选一个学科开始闯关，显示各学科在本浏览器里的通关进度。
export default function LearnClient({username}:{username:string}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const progress=useSyncExternalStore(subscribe,()=>learnSubjects.map(s=>passedCount(s.storageKey+(username||'guest'))).join(','),()=>'');
 const counts=progress?progress.split(',').map(Number):learnSubjects.map(()=>0);
 return <div className="ai-shell"><header className="ai-header"><a href="/learn" className="ai-brand"><BookOpen size={23}/><span>{t("面试自习室")}<small>{L("学习","Learn")}</small></span></a><SiteNav active="learn"/><div className="top-actions"><LanguageControl/><ThemeControl/><AccountMenu username={username}/></div></header>
  <main className="ai-main"><div className="ai-title"><span className="eyebrow">LEARN</span><h1>{L('选一门开始学习','Pick a subject to learn')}</h1><p>{L('每一关先看学习卡片，再答题巩固；答完有详解，难懂的名词点一下就能看解释。错题会进错题本，随时回来再练。','Each level starts with lesson cards, then a quiz with explanations. Tap highlighted terms for definitions; mistakes go to your mistake book.')}</p></div>
   {!username&&<p className="visitor-banner">{L("游客模式 · 闯关进度只保存在当前浏览器","Guest mode · progress is saved in this browser only")}</p>}
   {learnSpaces.map(sp=><section key={sp.id} className="learn-space"><h2 className="an-group">{L(sp.name[0],sp.name[1])}</h2><div className="learn-subjects">{learnSubjects.filter(s=>s.space===sp.id).map(s=>{const n=counts[learnSubjects.indexOf(s)]??0;return <a key={s.id} href={s.href} className="ai-card learn-subject">
    <span className="learn-icon">{s.icon}</span><strong>{L(s.name[0],s.name[1])}</strong><span className="muted">{L(s.summary[0],s.summary[1])}</span>
    <Progress value={n/s.levels*100}/><span className="learn-foot"><span>{L(`已通关 ${n} / ${s.levels}`,`${n} / ${s.levels} levels passed`)}</span><b>{n?L('继续学习','Continue'):L('开始学习','Start')}<ArrowRight size={16}/></b></span></a>})}</div></section>)}
   <p className="learn-hint">{L('准备面试？切换到顶部的「面试」，按学科背诵面试题、做模拟面试。','Preparing for interviews? Switch to “Interview” at the top to review questions and take mock interviews.')}</p>
  </main></div>}
