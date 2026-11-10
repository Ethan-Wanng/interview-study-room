'use client';
import {useState} from 'react';
import {BookOpen,Check,RotateCcw,ChevronLeft,ChevronRight,Highlighter,Search,Volume2,X,ArrowLeft,Plus,Pencil,Trash2,GraduationCap} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {useI18n} from '../components/i18n';
import {EnWords} from '../components/keyword-text';
import {sayEnglish} from '../components/speech-drill';
import {englishDefinition} from '@/content/glossary.en';
import {glossary} from '@/content/glossary';
import InterviewAnimationButton,{InlineInterviewAnimation} from '../ai/interview-animation';
import {hasInterviewAnimation} from '../ai/animations/go-animated';
import {MINE} from '@/lib/my-questions';
import type {LevelLink} from '@/lib/interview-links';
import {Annotated,terms} from './annotated';
import type {TrackStat} from './interview-home';
import type {StudyState} from './interview-client';

export type Question={id:string;track:string;category:string;section:string;title:string;blocks:{type:string;text:string}[];sourceParagraph:number;mine:boolean};
const esc=(t:string)=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// 一个学科（或我的题库）里的背题页：筛选、逐题回忆、看答案、打分。
// initial：一进来要定位到的题目 id（从搜索结果或 AI 老师的链接进来）。先切到「详细」模式并把题目填进搜索框，这样不管这题学没学过都能直接看到。
export default function StudyView({track,tracks,questions,data,links,member,onTrack,onRate,onAdd,onEdit,onDelete,initial}:{initial?:string;track:TrackStat;tracks:TrackStat[];questions:Question[];data:StudyState|null;links:Record<string,LevelLink>;member:boolean;onTrack:(id:string)=>void;onRate:(id:string,rating:string)=>Promise<StudyState|null>;onAdd:()=>void;onEdit:(id:string)=>void;onDelete:(id:string)=>Promise<void>}){
 const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const target=initial?questions.find(x=>x.id===initial):undefined;
 const [mode,setMode]=useState<'focus'|'detail'|'lazy'>('focus'),[tab,setTab]=useState('new'),[section,setSection]=useState('all'),[selected,setSelected]=useState(target?.id??''),[show,setShow]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState(target?.title??''),[saving,setSaving]=useState(false);
 const byId=new Map(data?.progress.map(p=>[p.question_id,p])??[]),isDue=(id:string)=>{const p=byId.get(id);return !!p&&!!data&&p.due<=data.today};
 const sections=[...new Set(questions.map(q=>q.section))],inSection=questions.filter(q=>section==='all'||q.section===section),kw=search.trim().toLowerCase();
 const list=kw?inSection.filter(q=>`${q.title} ${q.section} ${q.blocks.map(b=>b.text).join(' ')}`.toLowerCase().includes(kw)):inSection.filter(q=>tab==='new'?!byId.has(q.id):tab==='review'?isDue(q.id):tab==='mastered'?byId.get(q.id)?.rating==='good':byId.has(q.id));
 const q=list.find(x=>x.id===selected)??list[0],index=list.findIndex(x=>x.id===q?.id),link=q&&links[q.id],record=q&&byId.get(q.id);
 const qTerms=q?terms.filter(term=>new RegExp('(^|[^a-zA-Z0-9_])'+esc(term)+'($|[^a-zA-Z0-9_])','i').test(q.title+' '+q.blocks.map(b=>b.text).join(' '))).slice(0,12):[];
 const label=(r:string)=>({again:L('没记住','Forgot'),hard:L('有点模糊','Fuzzy'),good:L('已掌握','Got it')}[r]??r);
 const choose=(id:string)=>{setSelected(id);setShow(false);setNotice('')};
 async function rate(r:string){if(!q||saving)return;const next=list[index+1]??list[index-1];setSaving(true);const d=await onRate(q.id,r);setSaving(false);if(d){const p=d.progress.find(p=>p.question_id===q.id);setNotice(L(`已保存「${label(r)}」 · 下次复习：${p?.due}`,`Saved “${label(r)}” · next review ${p?.due}`));if(next)setSelected(next.id);setShow(false)}}
 const course=track.course;
 return <main className={'page-body iv-study'+(mode==='detail'?'':' focus-mode')}>
  <div className="iv-bar"><button type="button" className="button secondary iv-back" onClick={()=>window.history.back()}><ArrowLeft size={16}/>{L('全部学科','All subjects')}</button>
   {course&&<a className="iv-course" href={course.href}><GraduationCap size={16}/>{L(`对应课程：${course.name[0]}`,`Course: ${course.name[1]}`)}</a>}
   {track.id===MINE||member?<button type="button" className="button secondary" onClick={onAdd}><Plus size={16}/>{L('添加我的题目','Add my question')}</button>:null}
   <Select value={mode} onValueChange={v=>setMode(v as typeof mode)}><SelectTrigger className="mode-select" aria-label={L('阅读方式','View mode')}><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="focus">{L('沉浸','Focus')}</SelectItem><SelectItem value="detail">{L('详细（显示关键词和题目列表）','Detailed')}</SelectItem><SelectItem value="lazy">{L('懒人（自动播放动画讲解）','Lazy')}</SelectItem></SelectContent></Select></div>
  {notice&&<div className="notice" role="status"><Check size={16}/>{notice}</div>}
  <div className="study-toolbar"><label className="space-picker">{L('学科','Subject')}<select value={track.id} onChange={e=>onTrack(e.target.value)}>{tracks.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label className="space-picker">{L('章节','Chapter')}<select value={section} onChange={e=>{setSection(e.target.value);setShow(false)}}><option value="all">{L('全部章节','All chapters')}</option>{sections.map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
   <label className="study-search"><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setShow(false)}} placeholder={L('搜索题目、关键词或答案内容…','Search questions or answers…')}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label={L('清空搜索','Clear search')}><X size={14}/></button>}</label>
   <Tabs value={tab} onValueChange={v=>{setTab(v);setShow(false);setNotice('')}}><TabsList><TabsTrigger value="new">{L('今日新学','New')}</TabsTrigger><TabsTrigger value="review">{L('到期复习 ','Due ')}<span className="tab-count">{inSection.filter(x=>isDue(x.id)).length}</span></TabsTrigger><TabsTrigger value="learned">{L('已学回顾','Learned')}</TabsTrigger><TabsTrigger value="mastered">{L('已掌握','Mastered')}</TabsTrigger></TabsList></Tabs>
   <span>{kw?L(`搜索结果 · ${list.length} 题`,`Search · ${list.length}`):L(`${section==='all'?'全部章节':t(section)} · ${list.length} 题`,`${section==='all'?'All':section} · ${list.length}`)}</span></div>
  <div className="learning-grid"><section className="reader">{q?<>
   <div className="question-meta"><span>{t(q.category)}</span>{q.section!==q.category&&<span>{t(q.section)}</span>}{q.mine?<><span className="iv-mine">{L('我的','Mine')}</span><button type="button" className="iv-icon" onClick={()=>onEdit(q.id)} aria-label={L('编辑','Edit')}><Pencil size={14}/></button><button type="button" className="iv-icon" onClick={()=>{if(window.confirm(L('删除这道题？复习记录也会一起删除。','Delete this question and its review history?')))void onDelete(q.id)}} aria-label={L('删除','Delete')}><Trash2 size={14}/></button></>
    :<a className="iv-pill" href={`/feedback?type=question&module=interview&questionId=${encodeURIComponent(q.id)}&title=${encodeURIComponent(q.title)}`}>{L('反馈本题','Feedback')}</a>}<span className="question-num">{String(index+1).padStart(2,'0')} / {list.length}</span></div>
   <h2><EnWords text={q.title}/></h2>
   {link&&<a className="iv-level" href={link.href}><GraduationCap size={15}/>{L(`学习里讲过：${link.course[0]} · 第 ${link.level} 关「${link.title}」`,`Taught in ${link.course[1]} · level ${link.level}: ${link.title}`)}<ChevronRight size={14}/></a>}
   <div className="prompt"><span>{L('先试着用自己的话回答','Answer in your own words first')}</span><span>{L('口述 · 原理 · 边界','Say it · why · edge cases')}</span></div>
   {mode==='lazy'?<InlineInterviewAnimation id={q.id} onEnd={()=>{if(index<list.length-1){const next=list[index+1].id;window.setTimeout(()=>choose(next),1500)}}}/>:hasInterviewAnimation(q.id)&&<InterviewAnimationButton key={q.id} id={q.id} title={q.title}/>}
   {show||mode==='lazy'?<div className="answer"><div className="answer-label"><BookOpen size={16}/>{L('参考答案','Answer')}</div>{q.blocks.length?q.blocks.map((b,i)=>b.type==='code'?<pre key={i}><code>{b.text}</code></pre>:<p key={i}><Annotated text={b.text}/></p>):<p className="muted">{L('还没有写参考答案。','No answer yet.')}</p>}</div>
    :<button className="reveal" onClick={()=>setShow(true)}><BookOpen size={22}/><strong>{L('查看答案与关键词','Show answer')}</strong><span>{L('回忆之后再展开，记得更牢','Recall first, then reveal')}</span></button>}
   {show&&<div className="rating" aria-busy={saving}><p>{L('这道题掌握得怎么样？','How well do you know it?')}<span>{saving?L('正在保存…','Saving…'):!data?L('正在加载学习记录…','Loading…'):record?L(`已记录：${label(record.rating)} · 下次复习 ${record.due}`,`Recorded: ${label(record.rating)} · next ${record.due}`):L('完成后进入复习计划','Rating adds it to your review plan')}</span></p>
    <div>{(['again','hard','good'] as const).map(r=><button key={r} className={record?.rating===r?'selected':''} aria-pressed={record?.rating===r} disabled={saving||!data} onClick={()=>void rate(r)}>{r==='good'&&<Check size={16}/>}{label(r)}<small>{r==='good'?L('按间隔复习','Spaced review'):r==='hard'?L('明天巩固','Again tomorrow'):L('明天再练','Again tomorrow')}</small></button>)}</div></div>}
   <div className="reader-footer"><button disabled={index<=0} onClick={()=>choose(list[index-1].id)}><ChevronLeft size={16}/>{L('上一题','Previous')}</button><span>{L('专注理解 · 点击高亮词看解释','Tap highlighted terms for definitions')}</span><button disabled={index>=list.length-1} onClick={()=>choose(list[index+1].id)}>{L('下一题','Next')}<ChevronRight size={16}/></button></div></>
   :<div className="empty"><Check size={34}/><h2>{!data?L('正在读取学习进度','Loading progress'):kw?L('没有找到匹配的面试题','No matching questions'):!questions.length?L('这里还没有题目','No questions yet'):tab==='review'?L('当前范围没有到期复习','Nothing due here'):tab==='new'?L('当前范围已全部学习','All learned here'):L('当前范围暂无题目','Nothing here')}</h2>
    {!questions.length&&track.id===MINE?<button className="button primary" onClick={onAdd}><Plus size={16}/>{L('添加第一道题','Add your first question')}</button>:kw?<button className="button secondary" onClick={()=>setSearch('')}>{L('清空搜索','Clear search')}</button>:<button className="button secondary" onClick={()=>setTab('learned')}>{L('已学回顾','Review learned')}</button>}</div>}</section>
  <aside className="study-aside"><section className="terms-card"><div className="aside-heading"><Highlighter size={18}/><h3>{L('本题关键词','Key terms')}</h3></div><div className="term-chips">{qTerms.map(term=><Popover key={term}><PopoverTrigger asChild><button onClick={()=>{if(/[A-Za-z]{2,}/.test(term))sayEnglish(term,0.85)}}>{term}</button></PopoverTrigger><PopoverContent className="term-popup"><h3 className="term-popup-title"><span>{term}</span>{/[A-Za-z]{2,}/.test(term)&&<button type="button" className="en-speak-btn" onClick={()=>sayEnglish(term,0.85)}><Volume2 size={15}/></button>}</h3><p><EnWords text={locale==='en'?englishDefinition(term):glossary[term]}/></p></PopoverContent></Popover>)}</div>{!qTerms.length&&<p className="muted">{L('本题暂无已收录的术语。','No glossary terms in this question.')}</p>}</section>
   <section className="queue-card"><div className="aside-heading"><h3>{L('本轮题目','This round')}</h3><span>{list.length}</span></div><div className="queue">{list.map((item,i)=><button key={item.id} className={item.id===q?.id?'current':''} onClick={()=>choose(item.id)}><span>{String(i+1).padStart(2,'0')}</span><b>{item.title}</b>{byId.has(item.id)&&<Check size={13}/>}</button>)}</div></section>
   <div className="review-tip"><RotateCcw size={17}/><div><strong>{L('让记忆留得更久','Make it stick')}</strong><p>{L('掌握后按 1、3、7、14、30、60 天递增复习；没记住会回到起点。','Mastered questions come back after 1, 3, 7, 14, 30 and 60 days; forgotten ones start over.')}</p></div></div></aside></div>
 </main>}
