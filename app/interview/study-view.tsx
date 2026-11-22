'use client';
import {useState} from 'react';
import {BookOpen,Check,ChevronRight,EyeOff,Search,X,ArrowLeft,Plus,Pencil,Trash2,GraduationCap} from 'lucide-react';
import CardSideNav from '../components/card-side-nav';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {useI18n} from '../components/i18n';
import {EnWords} from '../components/keyword-text';
import InterviewAnimationButton from '../ai/interview-animation';
import {hasInterviewAnimation} from '../ai/animations/go-animated';
import {MINE} from '@/lib/my-questions';
import type {LevelLink} from '@/lib/interview-links';
import {Annotated} from './annotated';
import type {TrackStat} from './interview-home';
import type {StudyState} from './interview-client';
import type {TutorQuiz} from '@/lib/tutor-types';
import AiDock from '../ai/ai-dock';
import AddToNoteButton from '../components/add-to-note';

export type Question={id:string;track:string;category:string;section:string;title:string;blocks:{type:string;text:string}[];sourceParagraph:number;mine:boolean};

// 一个学科（或我的题库）里的沉浸式背题页：筛选、逐题回忆、看答案、打分。
export default function StudyView({track,questions,data,links,member,onRate,onAdd,onEdit,onDelete,initial}:{initial?:string;track:TrackStat;questions:Question[];data:StudyState|null;links:Record<string,LevelLink>;member:boolean;onRate:(id:string,rating:string)=>Promise<StudyState|null>;onAdd:()=>void;onEdit:(id:string)=>void;onDelete:(id:string)=>Promise<void>}){
 const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const target=initial?questions.find(x=>x.id===initial):undefined;
 const [tab,setTab]=useState('new'),[section,setSection]=useState('all'),[selected,setSelected]=useState(target?.id??''),[show,setShow]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState(target?.title??''),[saving,setSaving]=useState(false);
 const byId=new Map(data?.progress.map(p=>[p.question_id,p])??[]),isDue=(id:string)=>{const p=byId.get(id);return !!p&&!!data&&p.due<=data.today};
 const sections=[...new Set(questions.map(q=>q.section))],inSection=questions.filter(q=>section==='all'||q.section===section),kw=search.trim().toLowerCase();
 const list=kw?inSection.filter(q=>`${q.title} ${q.section} ${q.blocks.map(b=>b.text).join(' ')}`.toLowerCase().includes(kw)):inSection.filter(q=>tab==='new'?!byId.has(q.id):tab==='review'?isDue(q.id):tab==='mastered'?byId.get(q.id)?.rating==='good':byId.has(q.id));
 const q=list.find(x=>x.id===selected)??list[0],index=list.findIndex(x=>x.id===q?.id),link=q&&links[q.id],record=q&&byId.get(q.id);
 const label=(r:string)=>({again:L('没记住','Forgot'),hard:L('有点模糊','Fuzzy'),good:L('已掌握','Got it')}[r]??r);
 const choose=(id:string)=>{setSelected(id);setShow(false);setNotice('')};
 async function rate(r:string){if(!q||saving)return;const next=list[index+1]??list[index-1];setSaving(true);const d=await onRate(q.id,r);setSaving(false);if(d){const p=d.progress.find(p=>p.question_id===q.id);setNotice(L(`已保存「${label(r)}」 · 下次复习：${p?.due}`,`Saved “${label(r)}” · next review ${p?.due}`));if(next)setSelected(next.id);setShow(false)}}
 const studyQuiz:TutorQuiz|null=q?{type:L('面试题','Interview'),q:q.title.slice(0,4000),answer:(q.blocks.map(b=>b.type==='code'?`\`\`\`\n${b.text}\n\`\`\`` :b.text).join('\n\n')||'（暂无参考答案）').slice(0,12000),explain:([t(q.category),q.section!==q.category?t(q.section):'',record?`当前掌握记录：${label(record.rating)}（下次复习 ${record.due}）`:''].filter(Boolean).join(' · ')||'面试题').slice(0,6000)}:null;
 return <main className="page-body iv-study focus-mode">
  <div className="iv-bar"><button type="button" className="button secondary iv-back" onClick={()=>window.history.back()}><ArrowLeft size={16}/>{L('全部学科','All subjects')}</button>
   {track.id===MINE||member?<button type="button" className="button secondary" onClick={onAdd}><Plus size={16}/>{L('添加我的题目','Add my question')}</button>:null}</div>
  {notice&&<div className="notice" role="status"><Check size={16}/>{notice}</div>}
  <div className="study-toolbar">
   <div className="iv-filter-row">
    <label className="space-picker"><span>{L('章节','Chapter')}</span><select value={section} onChange={e=>{setSection(e.target.value);setShow(false)}}><option value="all">{L('全部章节','All chapters')}</option>{sections.map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
    <label className="study-search"><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setShow(false)}} placeholder={L('搜索题目…','Search…')}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label={L('清空搜索','Clear search')}><X size={14}/></button>}</label>
   </div>
   <Tabs value={tab} onValueChange={v=>{setTab(v);setShow(false);setNotice('')}}><TabsList><TabsTrigger value="new">{L('今日新学','New')}</TabsTrigger><TabsTrigger value="review">{L('到期复习 ','Due ')}<span className="tab-count">{inSection.filter(x=>isDue(x.id)).length}</span></TabsTrigger><TabsTrigger value="learned">{L('已学回顾','Learned')}</TabsTrigger><TabsTrigger value="mastered">{L('已掌握','Mastered')}</TabsTrigger></TabsList></Tabs>
   <span>{kw?L(`搜索结果 · ${list.length} 题`,`Search · ${list.length}`):L(`${section==='all'?'全部章节':t(section)} · ${list.length} 题`,`${section==='all'?'All':section} · ${list.length}`)}</span></div>
  <div className="learning-grid"><CardSideNav className="iv-stage" showArrows={Boolean(q)} onPrev={q&&index>0?()=>choose(list[index-1].id):undefined} onNext={q&&index>=0&&index<list.length-1?()=>choose(list[index+1].id):undefined} prevLabel={L('上一题','Previous')} nextLabel={L('下一题','Next')}><section className="reader">{q?<>
   <div className="question-meta"><span>{t(q.category)}</span>{q.section!==q.category&&<span>{t(q.section)}</span>}<AddToNoteButton title={q.title.slice(0,60)} questionOnly={`### ${q.title}`} questionAndAnswer={`### ${q.title}\n\n${q.blocks.map(b=>b.type==='code'?`\`\`\`\n${b.text}\n\`\`\``:b.text).join('\n\n')}`} defaultMode={show?'question-and-answer':'question-only'} source={{kind:'interview',label:`${L('面试','Interview')} · ${t(q.category)} · ${q.title.slice(0,36)}`,href:`/interview?track=${encodeURIComponent(track.id)}&q=${encodeURIComponent(q.id)}`,questionId:q.id}}/>{q.mine?<><span className="iv-mine">{L('我的','Mine')}</span><button type="button" className="iv-icon" onClick={()=>onEdit(q.id)} aria-label={L('编辑','Edit')}><Pencil size={14}/></button><button type="button" className="iv-icon" onClick={()=>{if(window.confirm(L('删除这道题？复习记录也会一起删除。','Delete this question and its review history?')))void onDelete(q.id)}} aria-label={L('删除','Delete')}><Trash2 size={14}/></button></>
    :<a className="iv-pill" href={`/feedback?type=question&module=interview&questionId=${encodeURIComponent(q.id)}&title=${encodeURIComponent(q.title)}`}>{L('反馈本题','Feedback')}</a>}<span className="question-num">{String(index+1).padStart(2,'0')} / {list.length}</span></div>
   <h2><EnWords text={q.title}/></h2>
   {link&&<a className="iv-level" href={link.href}><GraduationCap size={15}/>{L(`学习里讲过：${link.course[0]} · 第 ${link.level} 关「${link.title}」`,`Taught in ${link.course[1]} · level ${link.level}: ${link.title}`)}<ChevronRight size={14}/></a>}
   {hasInterviewAnimation(q.id)&&<InterviewAnimationButton key={q.id} id={q.id} title={q.title}/>}
   {show?<div className="answer"><div className="answer-label"><BookOpen size={16}/>{L('参考答案','Answer')}<button type="button" className="iv-hide-ans" onClick={()=>setShow(false)}><EyeOff size={14}/>{L('隐藏答案','Hide')}</button></div>{q.blocks.length?q.blocks.map((b,i)=>b.type==='code'?<pre key={i}><code>{b.text}</code></pre>:<p key={i}><Annotated text={b.text}/></p>):<p className="muted">{L('还没有写参考答案。','No answer yet.')}</p>}</div>
    :<button className="reveal" onClick={()=>setShow(true)}><BookOpen size={22}/><strong>{L('查看答案与关键词','Show answer')}</strong></button>}
   {show&&<div className="rating" aria-busy={saving}><p>{L('这道题掌握得怎么样？','How well do you know it?')}<span>{saving?L('正在保存…','Saving…'):!data?L('正在加载学习记录…','Loading…'):record?L(`已记录：${label(record.rating)} · 下次复习 ${record.due}`,`Recorded: ${label(record.rating)} · next ${record.due}`):''}</span></p>
    <div>{(['again','hard','good'] as const).map(r=><button key={r} className={record?.rating===r?'selected':''} aria-pressed={record?.rating===r} disabled={saving||!data} onClick={()=>void rate(r)}>{r==='good'&&<Check size={16}/>}{label(r)}<small>{r==='good'?L('按间隔复习','Spaced review'):r==='hard'?L('明天巩固','Again tomorrow'):L('明天再练','Again tomorrow')}</small></button>)}</div></div>}
   </>
   :<div className="empty"><Check size={34}/><h2>{!data?L('正在读取学习进度','Loading progress'):kw?L('没有找到匹配的面试题','No matching questions'):!questions.length?L('这里还没有题目','No questions yet'):tab==='review'?L('当前范围没有到期复习','Nothing due here'):tab==='new'?L('当前范围已全部学习','All learned here'):L('当前范围暂无题目','Nothing here')}</h2>
    {!questions.length&&track.id===MINE?<button className="button primary" onClick={onAdd}><Plus size={16}/>{L('添加第一道题','Add your first question')}</button>:kw?<button className="button secondary" onClick={()=>setSearch('')}>{L('清空搜索','Clear search')}</button>:<button className="button secondary" onClick={()=>setTab('learned')}>{L('已学回顾','Review learned')}</button>}</div>}</section></CardSideNav></div>
  {studyQuiz&&q&&<AiDock
   chatKey={`interview:${track.id}:${q.id}`}
   context={{kind:'recite',quiz:studyQuiz}}
   hello={L('我能看到你当前在背的这道面试题和参考答案。可以直接问我答案要点、原理比喻，或者让我模拟面试官追问你：','I can see the interview question and reference answer you are studying. Ask me for key points, a plain explanation, or mock follow-up questions:')}
   prompts={[L('这道面试题怎么答最清晰？','How should I structure this answer?'),L('用大白话和例子讲透原理','Explain the core idea simply with an example'),L('面试官可能接着追问什么？','What follow-up questions might come up?')]}
  />}
 </main>}
