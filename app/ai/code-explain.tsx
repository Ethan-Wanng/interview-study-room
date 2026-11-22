'use client';
import {useMemo,useState} from 'react';
import {Check,Copy,Play,Square} from 'lucide-react';
import {useI18n} from '../components/i18n';
import type {CodeNote} from '@/content/journey';
import {detectPlaygroundLang,openInPlayground,prepareForPlayground,type PlaygroundLang} from '@/lib/playground-bridge';
import {InlineRunOutput,useInlineCodeRun} from '../components/inline-code-run';

export type CodeExplainPlayground={
 hintLang?:PlaygroundLang|null;
 title?:string;
 sourceLabel?:string;
 backHref?:string;
 expect?:string;
 autoRun?:boolean;
 isSkeleton?:boolean;
};

// 每条讲解对应的行号范围（从 0 开始）：at 所在的行，到 to 所在的行（在 at 之后找）。找不到时为 null。
export function noteRange(lines:string[],n:CodeNote,from=0):[number,number]|null{
 const a=lines.findIndex((l,i)=>i>=from&&l.includes(n.at));if(a<0)return null;
 if(!n.to)return [a,a];const b=lines.findIndex((l,i)=>i>=a&&l.includes(n.to!));return b<0?null:[a,b]}

// 带行号的代码块：识别到可运行语言时，支持直接运行（骨架任务卡则带入代码操场编写）。
export default function CodeExplain({code,playground}:{code:string;notes?:CodeNote[];playground?:CodeExplainPlayground}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [copied,setCopied]=useState(false);
 const playLang=useMemo(()=>detectPlaygroundLang(code,playground?.hintLang),[code,playground?.hintLang]);
 const runner=useInlineCodeRun(playLang,code,{
  title:playground?.title??L('学习卡片代码','Lesson snippet'),
  sourceLabel:playground?.sourceLabel,
  backHref:playground?.backHref,
  expect:playground?.expect,
 });
 const shownCode=playground?.isSkeleton?code:runner.displayCode;
 const lines=shownCode.split('\n');
 const copy=()=>{void navigator.clipboard?.writeText(shownCode).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500)})};
 const runInPlayground=()=>{
  if(!playLang)return;
  const prepared=prepareForPlayground(code,playLang);
  openInPlayground({
   lang:playLang,
   code:prepared.code,
   wrapped:prepared.wrapped,
   title:playground?.title??L('学习卡片代码','Lesson snippet'),
   sourceLabel:playground?.sourceLabel,
   backHref:playground?.backHref,
   expect:playground?.expect,
   autoRun:playground?.autoRun??true,
  });
 };
 const row=(l:string,i:number)=><span key={i}><i>{i+1}</i>{l||' '}{'\n'}</span>;
 return <div className="code-explain">
  <div className="code-box">
   <div className="code-box-actions">
    {playLang&&(playground?.isSkeleton?(
     <button type="button" className="code-play" onClick={runInPlayground} title={L('在代码操场编写骨架代码','Code in Playground')}>
      <Play size={13}/>{L('操场写代码','Code in Playground')}
     </button>
    ):runner.busy?(
     <button type="button" className="code-play stop" onClick={runner.stop}>
      <Square size={12} fill="currentColor"/>{L('停止','Stop')}
     </button>
    ):(
     <button type="button" className="code-play" onClick={()=>void runner.run()} title={L('直接运行这段代码','Run code directly')}>
      <Play size={13}/>{L('运行','Run')}
     </button>
    ))}
    <button type="button" className="code-copy" onClick={copy}>{copied?<Check size={14}/>:<Copy size={14}/>}{copied?L('已复制','Copied'):L('复制','Copy')}</button>
   </div>
   <pre className="code-lines"><code>{lines.map(row)}</code></pre>
   {!playground?.isSkeleton&&<InlineRunOutput running={runner.running} completing={runner.completing} result={runner.result} error={runner.error} onClear={runner.clear} onAiFix={()=>void runner.aiFix()} onOpenPlayground={playLang?runner.openPlayground:undefined}/>}
  </div>
 </div>}
