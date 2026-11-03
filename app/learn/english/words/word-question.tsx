'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Turtle,Volume2,X} from 'lucide-react';
import {useI18n} from '../../../components/i18n';
import {sayEnglish} from '../../../components/speech-drill';
import type {Word} from '@/content/english-words';

export type WordItem={word:Word;options:string[]};
export const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// 一道“看词选义”题：正确意思 + 从同一本词书里随机挑 3 个别的意思当干扰项。
export function makeItem(w:Word,pool:Word[]):WordItem{const seen=new Set([w.zh]),others:string[]=[];
 for(const x of shuffle(pool)){if(others.length===3)break;if(x.en!==w.en&&!seen.has(x.zh)){seen.add(x.zh);others.push(x.zh)}}
 return {word:w,options:shuffle([w.zh,...others])}}

// 一个单词：出现时自动读一遍；选出中文意思，或点“不认识”直接看答案。答对后自动进入下一个。
// 听音模式下先不显示拼写，只靠听来选意思，答完再显示。键盘：1～4 选择，0 不认识，Enter 下一个，R 再听一遍。
export default function WordQuestion({item,listen,again,onAnswer,onNext}:{item:WordItem;listen:boolean;again?:boolean;onAnswer:(right:boolean)=>void;onNext:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {word,options}=item,[picked,setPicked]=useState<number|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const done=picked!==null,right=done&&picked>=0&&options[picked]===word.zh;
 const play=(rate=0.85)=>sayEnglish(word.en,rate);
 const choose=(i:number)=>{if(picked!==null)return;setPicked(i);const ok=i>=0&&options[i]===word.zh;onAnswer(ok);if(ok)timer.current=setTimeout(onNext,900)};
 const next=()=>{if(timer.current)clearTimeout(timer.current);onNext()};
 useEffect(()=>{sayEnglish(word.en,0.85);return()=>{if(timer.current)clearTimeout(timer.current)}},[word.en]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea'))return;
   if(!done&&e.key>='1'&&e.key<='4'&&Number(e.key)<=options.length)choose(Number(e.key)-1);else if(!done&&e.key==='0')choose(-1);else if(done&&e.key==='Enter')next();else if(e.key==='r'||e.key==='R')play()};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 const state=(i:number)=>!done?'':options[i]===word.zh?'right':i===picked?'wrong':'';
 return <section className="ai-card wq">
  <div className="wq-word">{listen&&!done?<button type="button" className="wq-big-play" onClick={()=>play()} aria-label={L('再听一遍','Play again')}><Volume2 size={40}/></button>:<><strong lang="en">{word.en}</strong><small>{word.pos}</small></>}
   <span className="wq-audio"><button type="button" onClick={()=>play()} aria-label={L('听','Listen')} title={L('听（R）','Listen (R)')}><Volume2 size={18}/></button><button type="button" onClick={()=>play(0.55)} aria-label={L('慢速听','Slowly')} title={L('慢速听','Slowly')}><Turtle size={18}/></button></span></div>
  <div className="ai-options">{options.map((o,i)=><button key={i} type="button" className={'ai-option '+state(i)} disabled={done} onClick={()=>choose(i)}><b>{i+1}</b><span>{o}</span>{state(i)==='right'&&<Check size={18}/>}{state(i)==='wrong'&&<X size={18}/>}</button>)}</div>
  {!done&&<button type="button" className="wq-unknown" onClick={()=>choose(-1)}>{L('不认识，直接看答案（0）','I don’t know (0)')}</button>}
  {done&&<div className={'wq-feedback '+(right?'right':'wrong')}>
   <p><strong>{right?L('答对了！','Correct!'):L('记住它：','Remember:')}</strong> <b lang="en">{word.en}</b> <small>{word.pos}</small> {word.zh}</p>
   {!right&&again&&<small>{L('这个词过一会儿还会再出现一次。','You’ll see this word again shortly.')}</small>}
   <button type="button" className="button primary" onClick={next}>{L('下一个','Next')}<ArrowRight size={16}/></button></div>}
 </section>}
