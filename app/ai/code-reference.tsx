'use client';
import {useSyncExternalStore} from 'react';
import {Play,Square} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {codeLangs,codeRefsFor,type CodeLang} from '@/content/code-refs';
import {detectPlaygroundLang,type PlaygroundLang} from '@/lib/playground-bridge';
import {InlineRunOutput,useInlineCodeRun} from '../components/inline-code-run';

const KEY='code-ref-lang';
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn)}};
const read=():CodeLang|null=>{try{return localStorage.getItem(KEY) as CodeLang|null}catch{return null}};
const save=(l:CodeLang)=>{try{localStorage.setItem(KEY,l)}catch{}listeners.forEach(fn=>fn())};
// 作答语言和参考答案语言共用一个选择：作答时选了 Python，参考答案也默认显示 Python。
export const useCodeLang=()=>useSyncExternalStore(subscribe,read,()=>null);
export const setCodeLang=save;

export type CodeReferencePlayground={
 hintLang?:PlaygroundLang|null;
 title?:string;
 sourceLabel?:string;
 backHref?:string;
};

export function resolveCodeRefs(
 id:string,
 reference:string,
 customRefs?:Partial<Record<CodeLang,string>>,
):{base:CodeLang;refs:Partial<Record<CodeLang,string>>}|undefined{
 const builtIn=codeRefsFor(id,reference);
 const hasCustom=Boolean(customRefs&&Object.values(customRefs).some(v=>typeof v==='string'&&v.trim()));
 if(!hasCustom)return builtIn;
 const merged:Partial<Record<CodeLang,string>>={...(builtIn?.refs??{})};
 for(const l of codeLangs){
  const v=customRefs?.[l.id];
  if(typeof v==='string'&&v.trim())merged[l.id]=v.trim();
 }
 const detected=reference.trim()?detectPlaygroundLang(reference,undefined,{allowThirdParty:true}):null;
 if(detected&&detected!=='sql'&&!merged[detected]){
  merged[detected]=reference;
 }
 const first=codeLangs.find(l=>merged[l.id])?.id;
 if(!first)return builtIn;
 const base=(detected&&detected!=='sql'&&merged[detected])?detected:(builtIn?.base??first);
 return {base,refs:merged};
}

// 代码题参考答案：有多语言写法时显示语言切换标签，选择会记住，下一题自动沿用；支持直接运行验证。
export default function CodeReference({id,reference,customRefs,playground}:{id:string;reference:string;customRefs?:Partial<Record<CodeLang,string>>;playground?:CodeReferencePlayground}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const lang=useSyncExternalStore(subscribe,read,()=>null);
 const data=resolveCodeRefs(id,reference,customRefs);
 const langs=data?codeLangs.filter(l=>data.refs[l.id]):[];
 const cur=data?(lang&&data.refs[lang]?lang:data.base):null;
 const curCode=data?(data.refs[cur!]??reference):reference;
 const activeLang:PlaygroundLang|null=data?cur:detectPlaygroundLang(reference,playground?.hintLang,{allowThirdParty:true});
 const runner=useInlineCodeRun(activeLang,curCode,{
  questionId:id,
  title:playground?.title??L('参考答案代码','Reference solution'),
  sourceLabel:playground?.sourceLabel,
  backHref:playground?.backHref,
 });

 if(!data){
  if(!activeLang)return <pre><code>{reference}</code></pre>;
  return <div className="code-box">
   <div className="code-box-actions">
    {runner.busy
     ?<button type="button" className="code-play stop" onClick={runner.stop}><Square size={12} fill="currentColor"/>{L('停止','Stop')}</button>
     :<button type="button" className="code-play" onClick={()=>void runner.run()} title={L('直接运行参考代码','Run reference code')}><Play size={13}/>{L('运行','Run')}</button>}
   </div>
   <pre><code>{runner.displayCode}</code></pre>
   <InlineRunOutput running={runner.running} completing={runner.completing} result={runner.result} error={runner.error} onClear={runner.clear} onAiFix={()=>void runner.aiFix()} onOpenPlayground={runner.openPlayground}/>
  </div>;
 }
 return <div className="code-ref">
  <div className="code-ref-tabs" role="tablist" aria-label={L('参考答案语言','Reference language')}>
   {langs.map(l=><button key={l.id} type="button" role="tab" aria-selected={cur===l.id} className={cur===l.id?'on':''} onClick={()=>save(l.id)}>{l.label}</button>)}
   {runner.busy
    ?<button type="button" className="code-ref-play stop" onClick={runner.stop}><Square size={12} fill="currentColor"/>{L('停止','Stop')}</button>
    :<button type="button" className="code-ref-play" onClick={()=>void runner.run()} title={L('直接运行当前语言的参考答案','Run this reference code')}><Play size={13}/>{L('运行','Run')}</button>}
  </div>
  <pre><code>{runner.displayCode}</code></pre>
  <InlineRunOutput running={runner.running} completing={runner.completing} result={runner.result} error={runner.error} onClear={runner.clear} onAiFix={()=>void runner.aiFix()} onOpenPlayground={runner.openPlayground}/>
 </div>;
}
