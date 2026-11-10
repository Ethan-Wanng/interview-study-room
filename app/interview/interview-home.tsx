'use client';
import {ArrowRight,BookOpen,RotateCcw,CalendarClock,Plus,Lock} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../components/i18n';

export type TrackStat={id:string;name:string;icon:string;total:number;learned:number;due:number;mastered:number;course?:{href:string;name:[string,string]}};

// 「面试」首页：今天的进度 + 按学科排列的题库卡片（和「学习」首页同一种样式）+ 我的题库。
export default function InterviewHome({tracks,mine,member,today,goals,onOpen,onAdd,onGoals}:{tracks:TrackStat[];mine:TrackStat;member:boolean;today:{newDone:number;reviewDone:number;due:number}|null;goals:{new_goal:number;review_goal:number};onOpen:(id:string)=>void;onAdd:()=>void;onGoals:()=>void}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const card=(s:TrackStat,extra?:React.ReactNode)=><button key={s.id} type="button" className="ai-card learn-subject iv-subject" onClick={()=>onOpen(s.id)}>
  <span className="learn-icon">{s.icon}</span><strong>{s.name}</strong>
  <span className="muted">{L(`共 ${s.total} 题 · 已学 ${s.learned} · 已掌握 ${s.mastered}`,`${s.total} questions · ${s.learned} learned · ${s.mastered} mastered`)}</span>
  <Progress value={s.total?s.learned/s.total*100:0}/>
  <span className="learn-foot"><span>{s.due?L(`${s.due} 题待复习`,`${s.due} due`):L('暂无到期复习','Nothing due')}</span><b>{s.learned?L('继续背题','Continue'):L('开始背题','Start')}<ArrowRight size={16}/></b></span>{extra}</button>;
 return <main className="ai-main iv-home">
  <div className="ai-title"><span className="eyebrow">INTERVIEW</span><h1>{L('按学科背面试题','Review interview questions by subject')}</h1><p>{L('先自己回忆、说出来，再展开参考答案；按掌握程度自动安排复习。学习里讲过的题会标出对应关卡，看不懂可以一键回去复习。','Recall first, then reveal the answer. Reviews are scheduled by how well you know each one, and each question links back to the level that teaches it.')}</p></div>
  {!member&&<p className="visitor-banner">{L('游客模式 · 用邮箱、GitHub 或 Google 登录后，进度会保存在账号里，还能建立自己的私人题库。','Guest mode · sign in with email, GitHub or Google to keep progress in your account and build a private question bank.')}</p>}
  <section className="iv-today">
   <div className="ai-card"><span><BookOpen size={17}/>{L('今日新学','New today')}</span><strong>{today?.newDone??'–'}<small> / {goals.new_goal}</small></strong><Progress value={today?Math.min(100,today.newDone/goals.new_goal*100):0}/></div>
   <div className="ai-card"><span><RotateCcw size={17}/>{L('今日复习','Reviewed today')}</span><strong>{today?.reviewDone??'–'}<small> / {goals.review_goal}</small></strong><Progress value={today?Math.min(100,today.reviewDone/goals.review_goal*100):0}/></div>
   <div className="ai-card"><span><CalendarClock size={17}/>{L('待复习','Due')}</span><strong>{today?.due??'–'}<small> {L('题','')}</small></strong><button type="button" className="iv-link" onClick={onGoals}>{L('设置每日目标','Daily goals')}</button></div>
  </section>
  <section className="learn-space"><h2 className="an-group">{L('学科题库','Subjects')}</h2><div className="learn-subjects">{tracks.map(s=>card(s))}</div></section>
  <section className="learn-space"><h2 className="an-group">{L('我的题库','My questions')}</h2><div className="learn-subjects">
   {member?<>{mine.total>0&&card(mine)}<button type="button" className="ai-card learn-subject iv-subject iv-add" onClick={onAdd}><span className="learn-icon"><Plus size={26}/></span><strong>{L('添加自己的面试题','Add your own questions')}</strong><span className="muted">{L('只有你能看到。可以一题一题加、批量粘贴，或者粘贴面经让 AI 出题。','Private to you. Add one at a time, paste many, or let AI write them from your notes.')}</span></button></>
   :<a href="/login?return_to=%2Finterview" className="ai-card learn-subject iv-subject iv-add"><span className="learn-icon"><Lock size={24}/></span><strong>{L('登录后建立私人题库','Sign in for a private bank')}</strong><span className="muted">{L('私人题库存在账号里，只有你自己能看到。邮箱注册不用验证，几秒钟就好。','Stored in your account and visible only to you. Email sign-up takes seconds.')}</span></a>}
  </div></section>
 </main>}
