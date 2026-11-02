'use client';
import {useState} from 'react';
import {Check,Copy} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import type {CodeNote} from '@/content/journey';

// 每条讲解对应的行号范围（从 0 开始）：at 所在的行，到 to 所在的行（在 at 之后找）。找不到时为 null。
export function noteRange(lines:string[],n:CodeNote,from=0):[number,number]|null{
 const a=lines.findIndex((l,i)=>i>=from&&l.includes(n.at));if(a<0)return null;
 if(!n.to)return [a,a];const b=lines.findIndex((l,i)=>i>=a&&l.includes(n.to!));return b<0?null:[a,b]}

// 一组讲解各自的行号范围：按顺序往下找，同样的原文出现多次时对应到下一处。
function noteRanges(lines:string[],notes:CodeNote[]){const out:([number,number]|null)[]=[];let cursor=0;
 for(const n of notes){const r=noteRange(lines,n,cursor)??noteRange(lines,n);if(r)cursor=r[0];out.push(r)}return out}

// 带行号的代码，加上逐段讲解：鼠标移到（或点一下）某条讲解，对应的代码行会高亮。
export default function CodeExplain({code,notes}:{code:string;notes?:CodeNote[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const lines=code.split('\n'),[on,setOn]=useState(-1),[copied,setCopied]=useState(false);
 const copy=()=>{void navigator.clipboard?.writeText(code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500)})};
 const ranges=noteRanges(lines,notes??[]);
 const lit=on>=0?ranges[on]:null;
 const label=(r:[number,number])=>r[0]===r[1]?L(`第 ${r[0]+1} 行`,`Line ${r[0]+1}`):L(`第 ${r[0]+1}–${r[1]+1} 行`,`Lines ${r[0]+1}–${r[1]+1}`);
 const row=(l:string,i:number)=><span key={i} className={lit&&i>=lit[0]&&i<=lit[1]?'lit':''}><i>{i+1}</i>{l||' '}{'\n'}</span>;
 const item=(n:CodeNote,k:number)=>{const r=ranges[k];
  return <li key={k} className={on===k?'on':''} tabIndex={0} onMouseEnter={()=>setOn(k)} onMouseLeave={()=>setOn(-1)} onFocus={()=>setOn(k)} onBlur={()=>setOn(-1)} onClick={()=>setOn(on===k?-1:k)}>
   {r&&<b>{label(r)}</b>}<span><KeywordText text={n.text}/></span></li>};
 return <div className="code-explain">
  <div className="code-box"><button type="button" className="code-copy" onClick={copy}>{copied?<Check size={14}/>:<Copy size={14}/>}{copied?L('已复制','Copied'):L('复制','Copy')}</button>
   <pre className="code-lines"><code>{lines.map(row)}</code></pre></div>
  {!!notes?.length&&<div className="code-notes"><strong>{L('代码讲解','Code walkthrough')}</strong><ol>{notes.map(item)}</ol></div>}
 </div>}
