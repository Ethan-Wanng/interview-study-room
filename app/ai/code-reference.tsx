'use client';
import {useSyncExternalStore} from 'react';
import {useI18n} from '../components/i18n';
import {codeLangs,codeRefsFor,type CodeLang} from '@/content/code-refs';

const KEY='code-ref-lang';
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn)}};
const read=():CodeLang|null=>{try{return localStorage.getItem(KEY) as CodeLang|null}catch{return null}};
const save=(l:CodeLang)=>{try{localStorage.setItem(KEY,l)}catch{}listeners.forEach(fn=>fn())};
// 作答语言和参考答案语言共用一个选择：作答时选了 Python，参考答案也默认显示 Python。
export const useCodeLang=()=>useSyncExternalStore(subscribe,read,()=>null);
export const setCodeLang=save;

// 代码题参考答案：有多语言写法时显示语言切换标签，选择会记住，下一题自动沿用。
export default function CodeReference({id,reference}:{id:string;reference:string}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const lang=useSyncExternalStore(subscribe,read,()=>null);
 const data=codeRefsFor(id,reference);
 if(!data)return <pre><code>{reference}</code></pre>;
 const langs=codeLangs.filter(l=>data.refs[l.id]);
 const cur=lang&&data.refs[lang]?lang:data.base;
 return <div className="code-ref">
  <div className="code-ref-tabs" role="tablist" aria-label={L('参考答案语言','Reference language')}>
   {langs.map(l=><button key={l.id} type="button" role="tab" aria-selected={cur===l.id} className={cur===l.id?'on':''} onClick={()=>save(l.id)}>{l.label}</button>)}
  </div>
  <pre><code>{data.refs[cur]}</code></pre>
  <p className="code-ref-note">{L('用哪种语言作答都可以，AI 评分按思路和关键逻辑给分。','Answer in any of these languages; grading looks at the approach and key logic.')}</p>
 </div>;
}
