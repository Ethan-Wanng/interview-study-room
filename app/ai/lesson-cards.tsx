'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Bot,Laptop,Minus,Play,Plus,X,ZoomIn} from 'lucide-react';
import CardSideNav from '../components/card-side-nav';
import {useI18n} from '../components/i18n';
import KeywordText,{EnWords} from '../components/keyword-text';
import CodeExplain from './code-explain';
import AiDock,{type DockRequest} from './ai-dock';
import PhraseList from '../components/speech-drill';
import AddToNoteButton from '../components/add-to-note';
import type {AiLesson} from '@/content/journey';
import {detectPlaygroundLang,openInPlayground,prepareForPlayground,type PlaygroundContextMeta} from '@/lib/playground-bridge';

// 关卡学习卡片：一次只看一张，左右切换（按钮、圆点、方向键或滑动），最后一张之后开始答题。
// 点卡片（或右上角放大镜）弹出放大阅读层，倍数可调（滑块、加减按钮、+/- 键），并记在本地；右下角常驻 AI 老师，随时针对当前卡片提问，动手卡片由它一步步带着做。
const ZOOM_KEY='lc-zoom',ZOOM_MIN=0.8,ZOOM_MAX=2.5,ZOOM_STEP=0.1;
const clampZoom=(z:number)=>Math.round(Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,z))*10)/10;
const savedZoom=()=>{try{const z=Number(localStorage.getItem(ZOOM_KEY));return z?clampZoom(z):1.3}catch{return 1.3}};
// 点在按钮、代码、输入框上是在操作卡片内容，不弹放大层；选中文字时也不弹。
const interactive='button,a,input,textarea,select,label,pre,summary,li[tabindex],[role=button]';

// start：一进来先显示第几张（从 0 开始），从搜索结果、题目的“对应卡片”或 AI 老师给的链接进来时用。
export default function LessonCards({lessons,quizCount,need,onStart,start=0,playground,savedProgress,onResume}:{lessons:AiLesson[];quizCount:number;need:number;onStart:()=>void;start?:number;playground?:PlaygroundContextMeta;savedProgress?:{answered:number;total:number};onResume?:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [index,setIndex]=useState(()=>Math.min(Math.max(0,start),lessons.length-1)),[dir,setDir]=useState<'next'|'prev'>('next'),touch=useRef<number|null>(null);
 const last=lessons.length-1,lesson=lessons[index];
 const go=(i:number)=>{if(i<0||i>last||i===index)return;setDir(i>index?'next':'prev');setIndex(i)};
 const deck=useRef<HTMLDivElement>(null),layer=useRef<HTMLDivElement>(null),[ask,setAsk]=useState<DockRequest>();
 // zoom 为 null 表示放大层关着，否则是当前倍数。
 const [zoom,setZoom]=useState<number|null>(null),open=zoom!==null;
 const openZoom=()=>setZoom(savedZoom());
 const closeZoom=()=>{setZoom(null);deck.current?.focus()};
 const changeZoom=(z:number)=>{const v=clampZoom(z);setZoom(v);try{localStorage.setItem(ZOOM_KEY,String(v))}catch{}};
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';layer.current?.focus();return()=>{document.body.style.overflow=prev}},[open]);
 const clickCard=(e:React.MouseEvent)=>{if((e.target as HTMLElement).closest(interactive)||window.getSelection()?.toString())return;openZoom()};
 // AI 老师看到的卡片内容：语言课的句子也一并带上。
 const body=lesson.body+(lesson.phrases?.length?'\n'+lesson.phrases.map(p=>`${p.who?p.who+'：':''}${p.en} —— ${p.zh}`).join('\n'):'');
 // task：项目实战里“自己动手写”的任务卡（有参考答案），AI 老师只给提示、不代写，参考答案只给 AI 判断用。
 const practice=!!lesson.practice,task=!!lesson.solution;
 const cardBackHref=playground?.subjectId&&playground?.levelId
  ?`/learn/${playground.subjectId}?level=${encodeURIComponent(playground.levelId)}&card=${index+1}`
  :playground?.backHref;
 const cardSource=playground?.subjectName
  ?`${playground.subjectName}${playground.levelIndex!==undefined?` · ${L(`第 ${playground.levelIndex+1} 关`,`Level ${playground.levelIndex+1}`)}`:''}${playground.levelTitle?` · ${playground.levelTitle}`:''}`
  :playground?.levelTitle;
 const lessonCodeLang=useMemo(()=>lesson.code?detectPlaygroundLang(lesson.code,playground?.hintLang):null,[lesson.code,playground?.hintLang]);
 const launchLessonCode=()=>{
  if(!lesson.code||!lessonCodeLang)return;
  const prepared=prepareForPlayground(lesson.code,lessonCodeLang);
  openInPlayground({
   lang:lessonCodeLang,
   code:prepared.code,
   wrapped:prepared.wrapped,
   title:lesson.title,
   sourceLabel:cardSource,
   backHref:cardBackHref,
   expect:lesson.practice?.expect,
   autoRun:!task,
  });
 };
 const context={kind:task?'task' as const:practice?'practice' as const:'lesson' as const,lesson:{title:lesson.title,body,steps:lesson.practice?.steps??[],code:lesson.code,expect:lesson.practice?.expect,solution:lesson.solution?.code}};
 const prompts=task?[L('给我一点思路，先别给代码','Give me a hint, not the code'),L('帮我看看我的代码哪里不对','What is wrong with my code?'),L('这个报错是什么意思？','What does this error mean?')]
  :practice?[L('我准备好了，带我从第一步开始','I am ready, start with step one'),L('我卡住了，下一步该做什么？','I am stuck, what next?'),L('这个报错是什么意思？','What does this error mean?')]
  :[L('用大白话再讲一遍这张卡片','Explain this card in plain words'),L('举个生活中的例子','Give me an everyday example'),lesson.code?L('代码每一行在做什么？','What does each line of code do?'):L('面试会怎么问这个知识点？','How is this asked in interviews?')];
 const content=<>
   <h2><span>{String(index+1).padStart(2,'0')}</span><EnWords text={lesson.title}/></h2>
   {lesson.practice&&<span className="lc-practice-tag"><Laptop size={15}/>{task?L('自己动手写 · 写完用验收脚本检查','Build it yourself · then run the check'):L('动手试试 · 支持本地或直接点下方去操场运行','Try locally or run directly in Playground')}</span>}
   <p><KeywordText text={lesson.body}/></p>
   {lesson.phrases&&<PhraseList key={lesson.title} phrases={lesson.phrases}/>}
   {lesson.practice&&<ol className="lc-steps">{lesson.practice.steps.map((s,i)=><li key={i}><KeywordText text={s}/></li>)}</ol>}
   {lesson.code&&task&&<p className="lc-code-label">{L('代码骨架','Skeleton')}</p>}
   {lesson.code&&<CodeExplain code={lesson.code} notes={lesson.explain} playground={{hintLang:playground?.hintLang,title:lesson.title,sourceLabel:cardSource,backHref:cardBackHref,expect:lesson.practice?.expect,autoRun:!task,isSkeleton:task}}/>}
   {lesson.practice?.expect&&<div className="lc-expect"><strong>{task?L('写完后应该看到','When it works you should see'):L('应该看到的输出','Expected output')}</strong><pre><code>{lesson.practice.expect}</code></pre></div>}
   {lesson.solution&&<details className="lc-solution"><summary>{L('参考答案（先自己写，写完或实在卡住再展开）','Reference answer (try it yourself first)')}</summary><CodeExplain code={lesson.solution.code} notes={lesson.solution.explain} playground={{hintLang:playground?.hintLang,title:`${lesson.title} · ${L('参考答案','Reference')}`,sourceLabel:cardSource,backHref:cardBackHref,expect:lesson.practice?.expect,autoRun:true}}/></details>}
   {lesson.practice&&<div className="lc-practice-actions">
    {lessonCodeLang&&<button type="button" className="button secondary tutor-open" onClick={launchLessonCode}><Play size={16}/>{task?L('在操场打开骨架代码','Open skeleton in Playground'):L('免配环境，在操场直接运行','Run directly in Playground')}</button>}
    <button type="button" className="button primary tutor-open" onClick={()=>setAsk(task?{text:L('我准备开始写这个任务了，先给我一点思路，不要直接给完整代码。','I am about to start this task. Give me a hint first, not the full code.'),n:Date.now()}:{text:L('我准备好了，请带我从第一步开始。','I am ready, please start with step one.'),n:Date.now()})}><Bot size={16}/>{task?L('让 AI 老师给我提示','Ask the AI tutor for a hint'):L('让 AI 老师带你做','Let the AI tutor guide you')}</button>
   </div>}
  </>;
 const keys=(e:React.KeyboardEvent)=>{const t=e.target as HTMLElement;if(t.closest('textarea,input'))return;
  if(e.key==='ArrowRight')go(index+1);else if(e.key==='ArrowLeft')go(index-1);
  else if(open&&e.key==='Escape')closeZoom();else if(open&&(e.key==='+'||e.key==='='))changeZoom(zoom+ZOOM_STEP);else if(open&&(e.key==='-'||e.key==='_'))changeZoom(zoom-ZOOM_STEP);else if(open&&e.key==='0')changeZoom(1)};
 return <div ref={deck} className="lc-deck" tabIndex={0} onKeyDown={keys}>
  <div className="lc-head"><span>{L(`第 ${index+1} / ${lessons.length} 张`,`Card ${index+1} of ${lessons.length}`)}</span><input className="lc-slider" type="range" min={1} max={lessons.length} step={1} value={index+1} disabled={lessons.length<2} onChange={e=>go(Number(e.target.value)-1)} style={{'--lc-pos':(lessons.length>1?index/(lessons.length-1)*100:100)+'%'} as React.CSSProperties} aria-label={L('拖动选择第几张卡片','Drag to pick a card')} title={L('拖动可以快速跳到任意一张','Drag to jump to any card')}/>
   <AddToNoteButton
    title={lesson.title}
    questionOnly={`### ${lesson.title}\n\n${lesson.body}`}
    questionAndAnswer={[
     `### ${lesson.title}`,
     lesson.body,
     lesson.code?`\`\`\`${lessonCodeLang||''}\n${lesson.code}\n\`\`\``:'',
     lesson.practice?.expect?`**${L('预期输出','Expected Output')}**：\n\`\`\`\n${lesson.practice.expect}\n\`\`\``:'',
    ].filter(Boolean).join('\n\n')}
    modeLabels={[
     [L('仅记卡片正文','Card text only'),L('只收录这张学习卡片的核心讲解文字','Save only the lesson explanation text')],
     [L('正文 + 代码与输出','Full card & code'),L('完整收录卡片讲解、代码示例与预期输出','Save explanation, code snippet & expected output')],
    ]}
    source={{
     kind:'learn',
     label:cardSource?`${cardSource} · ${lesson.title}`:lesson.title,
     href:cardBackHref||'',
    }}
   />
   <button type="button" className="lc-zoom-open" onClick={openZoom} title={L('放大阅读','Zoom in')} aria-label={L('放大阅读','Zoom in')}><ZoomIn size={16}/></button></div>
  <CardSideNav className="lc-stage" onPrev={index>0?()=>go(index-1):undefined} onNext={index<last?()=>go(index+1):undefined} prevLabel={L('上一张（左方向键）','Previous (Left arrow)')} nextLabel={L('下一张（右方向键）','Next (Right arrow)')}>
   <section key={'card-'+index} className={'ai-card ai-lesson lc-card '+dir} onClick={clickCard} title={L('点击放大阅读','Click to zoom in')}>{content}</section>
  </CardSideNav>
  {open&&<div ref={layer} className="lc-zoom" role="dialog" aria-modal="true" aria-label={lesson.title} tabIndex={-1} onClick={e=>{if(e.target===e.currentTarget)closeZoom()}}
   onTouchStart={e=>{touch.current=e.touches.length===1&&!(e.target as HTMLElement).closest('pre,input')?e.touches[0].clientX:null}} onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)go(index+(dx<0?1:-1))}}>
   <div className="lc-zoom-bar">
    <span className="lc-zoom-count">{index+1} / {lessons.length}</span>
    <button
     type="button"
     className="lc-zoom-ai"
     onClick={()=>setAsk(lesson.code
      ?{text:L('请结合这张卡片，用大白话逐段讲解一下这段代码在做什么，以及关键语法和注意点。','Please explain this card’s code step by step in plain words, including key syntax and gotchas.'),n:Date.now()}
      :{text:'',n:Date.now()})}
     title={lesson.code?L('让 AI 讲解这段代码','Ask AI to explain this code'):L('打开 AI 问答','Open AI Q&A')}
    >
     <Bot size={15}/>
     <span>{lesson.code?L('AI 讲解','AI Explain'):L('AI 问答','Ask AI')}</span>
    </button>
    <span className="lc-zoom-gap"/>
    <button type="button" disabled={zoom<=ZOOM_MIN} onClick={()=>changeZoom(zoom-ZOOM_STEP)} aria-label={L('缩小','Zoom out')}><Minus size={16}/></button>
    <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={ZOOM_STEP} value={zoom} onChange={e=>changeZoom(Number(e.target.value))} aria-label={L('放大倍数','Zoom level')}/>
    <button type="button" disabled={zoom>=ZOOM_MAX} onClick={()=>changeZoom(zoom+ZOOM_STEP)} aria-label={L('放大','Zoom in')}><Plus size={16}/></button>
    <button type="button" className="lc-zoom-pct" onClick={()=>changeZoom(1)} title={L('恢复 100%','Reset to 100%')}>{Math.round(zoom*100)}%</button>
    <button type="button" onClick={closeZoom} aria-label={L('关闭放大（Esc）','Close (Esc)')} title={L('关闭（Esc）','Close (Esc)')}><X size={18}/></button>
   </div>
   <button type="button" className="side-nav-btn left is-fixed" disabled={index===0} onClick={()=>go(index-1)} title={L('上一张（左方向键）','Previous (Left arrow)')} aria-label={L('上一张','Previous')}><ArrowLeft size={20}/></button>
   <button type="button" className="side-nav-btn right is-fixed" disabled={index===last} onClick={()=>go(index+1)} title={L('下一张（右方向键）','Next (Right arrow)')} aria-label={L('下一张','Next')}><ArrowRight size={20}/></button>
   <div key={index} className="lc-zoom-scroll" onClick={e=>{if(e.target===e.currentTarget)closeZoom()}}>
    <section className="ai-card ai-lesson lc-zoom-card" style={{zoom}}>{content}</section>
   </div>
  </div>}
  <div className="lc-nav">
   <div className="lc-dots">{lessons.map((l,i)=><button key={i} className={i===index?'on':''} aria-label={l.title} onClick={()=>go(i)}/>)}</div>
   {index===last&&(savedProgress&&onResume
    ?<><button className="button primary" onClick={onResume}>{L(`继续答题 (${savedProgress.answered}/${savedProgress.total})`,`Resume (${savedProgress.answered}/${savedProgress.total})`)}<ArrowRight size={16}/></button><button className="button secondary" onClick={onStart}>{L('重新答题','Restart')}</button></>
    :<button className="button primary" onClick={onStart}>{L('开始答题','Start quiz')}<ArrowRight size={16}/></button>)}
  </div>
  <AiDock context={context} prompts={prompts} request={ask}/>
  <p className="lc-foot">{index===last?L(`学完了！共 ${quizCount} 题，答对 ${need} 题即可通关。`,`All done! Answer ${need} of ${quizCount} correctly to pass.`):savedProgress&&onResume?<button className="lc-skip" onClick={onResume}>{L(`继续答题 (${savedProgress.answered}/${savedProgress.total})`,`Resume (${savedProgress.answered}/${savedProgress.total})`)}</button>:<button className="lc-skip" onClick={onStart}>{L('已经会了？直接答题','Already know this? Start the quiz')}</button>}</p>
 </div>}
