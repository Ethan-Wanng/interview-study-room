'use client';
import {useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import type {AiLesson} from '@/content/ai-journey';

// 关卡学习卡片：一次只看一张，左右切换（按钮、圆点、方向键或滑动），最后一张之后开始答题。
export default function LessonCards({lessons,quizCount,need,onStart}:{lessons:AiLesson[];quizCount:number;need:number;onStart:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [index,setIndex]=useState(0),[dir,setDir]=useState<'next'|'prev'>('next'),touch=useRef<number|null>(null);
 const last=lessons.length-1,lesson=lessons[index];
 const go=(i:number)=>{if(i<0||i>last||i===index)return;setDir(i>index?'next':'prev');setIndex(i)};
 return <div className="lc-deck" tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowRight')go(index+1);else if(e.key==='ArrowLeft')go(index-1)}}
  onTouchStart={e=>{touch.current=e.touches[0].clientX}} onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)go(index+(dx<0?1:-1))}}>
  <div className="lc-head"><span>{L(`第 ${index+1} / ${lessons.length} 张`,`Card ${index+1} of ${lessons.length}`)}</span><div className="lc-bar"><i style={{width:(index+1)/lessons.length*100+'%'}}/></div></div>
  <section key={index} className={'ai-card ai-lesson lc-card '+dir}>
   <h2><span>{String(index+1).padStart(2,'0')}</span>{lesson.title}</h2>
   <p><KeywordText text={lesson.body}/></p>{lesson.code&&<pre><code>{lesson.code}</code></pre>}
  </section>
  <div className="lc-nav">
   <button className="button secondary" disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={16}/>{L('上一张','Previous')}</button>
   <div className="lc-dots">{lessons.map((l,i)=><button key={i} className={i===index?'on':''} aria-label={l.title} onClick={()=>go(i)}/>)}</div>
   {index<last?<button className="button primary" onClick={()=>go(index+1)}>{L('下一张','Next')}<ArrowRight size={16}/></button>:<button className="button primary" onClick={onStart}>{L('开始答题','Start quiz')}<ArrowRight size={16}/></button>}
  </div>
  <p className="lc-foot">{index===last?L(`学完了！共 ${quizCount} 题，答对 ${need} 题即可通关。`,`All done! Answer ${need} of ${quizCount} correctly to pass.`):<button className="lc-skip" onClick={onStart}>{L('已经会了？直接答题','Already know this? Start the quiz')}</button>}</p>
 </div>}
