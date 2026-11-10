'use client';
import {useEffect} from 'react';
import {useI18n} from '../components/i18n';
import {codeLangs,type CodeLang} from '@/content/code-refs';
import {startersFor} from '@/content/code-starters';
import {codeEditing} from './code-input';
import {setCodeLang,useCodeLang} from './code-reference';

// 作答框里的内容还是某个语言的原始框架（没补任何 TODO）时，算作还没作答。
export function untouchedStarter(id:string,text:string){const s=startersFor(id);return !!s&&Object.values(s).some(v=>v.trim()===text.trim())}

// 代码题作答框：这道题有框架时，先选语言，作答框预填该语言的框架，学习者补全 TODO；没有框架的题就是普通代码输入框。
export default function CodeAnswer({id,value,onChange,disabled,rows=10,placeholder,autoFocus}:{id:string;value:string;onChange:(v:string)=>void;disabled?:boolean;rows?:number;placeholder?:string;autoFocus?:boolean}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const starters=startersFor(id),picked=useCodeLang();
 const langs=starters?codeLangs.filter(l=>starters[l.id]):[];
 const cur:CodeLang|undefined=starters?(picked&&starters[picked]?picked:langs[0]?.id):undefined;
 // 作答框还空着时填入当前语言的框架；已经写了内容就不动。
 useEffect(()=>{if(!disabled&&cur&&starters&&!value.trim())onChange(starters[cur]!)},[cur]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在语言确定 / 切换时预填
 const pick=(l:CodeLang)=>{if(!starters||l===cur)return;
  // 已经补了内容时，换语言会覆盖掉，先确认。
  if(value.trim()&&!untouchedStarter(id,value)&&!window.confirm(L('换语言会用新语言的框架替换你已经写的内容，确定吗？','Switching replaces what you wrote with the new language template. Continue?')))return;
  setCodeLang(l);onChange(starters[l]!)};
 return <div className="code-answer">
  {starters&&<div className="code-ref-tabs" role="tablist" aria-label={L('作答语言','Answer language')}>
   <span className="code-answer-label">{L('作答语言','Language')}</span>
   {langs.map(l=><button key={l.id} type="button" role="tab" aria-selected={cur===l.id} className={cur===l.id?'on':''} disabled={disabled} onClick={()=>pick(l.id)}>{l.label}</button>)}
  </div>}
  {starters&&!disabled&&<p className="code-answer-hint">{L('框架已经写好，只需补全标了 TODO 的地方（把 ... 换成你的代码）。','The template is ready — fill in the TODO parts (replace the ...).')}</p>}
  <textarea className="code" ref={codeEditing} rows={starters?Math.max(rows,(value.match(/\n/g)?.length??0)+2):rows} value={value} disabled={disabled} spellCheck={false} autoFocus={autoFocus} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
 </div>}
