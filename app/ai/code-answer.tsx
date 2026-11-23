'use client';
import {useEffect,useState} from 'react';
import {Check,Play} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {codeLangs,type CodeLang} from '@/content/code-refs';
import {startersFor} from '@/content/code-starters';
import {codeEditing} from './code-input';
import {setCodeLang,useCodeLang} from './code-reference';
import {
 clearQuizSync,
 detectPlaygroundLang,
 emptyStarterFor,
 openInPlayground,
 PG_QUIZ_SYNC_EVENT,
 PG_QUIZ_SYNC_KEY,
 prepareForPlayground,
 readQuizSync,
 type PlaygroundLang,
 type PlaygroundQuizSync,
} from '@/lib/playground-bridge';

export type CodeAnswerPlayground={
 hintLang?:PlaygroundLang|null;
 title?:string;
 sourceLabel?:string;
 backHref?:string;
};

// 根据题干与已有示例代码生成 5 种语言（Python / Go / Java / JS/TS / Rust）的标准 TODO 框架，
// 保证动态生成的 JD 代码题与历史专题代码题也都具备完整的五语言切换作答体验。
export function buildFiveLangStarters(
 custom?:Partial<Record<CodeLang,string>>,
 qCode?:string,
 title?:string,
):Record<CodeLang,string>{
 const fnMatch=(qCode||title||'').match(/\b([a-zA-Z_][a-zA-Z0-9_]{2,32})\s*\(/);
 const rawName=fnMatch?.[1]&&!/^(?:if|for|while|switch|return|print|console|func|async|def|class|struct|impl|public|private|static|void|new|from|import)$/.test(fnMatch[1])
  ?fnMatch[1]
  :'solve';
 const toCamel=(s:string)=>s.replace(/_([a-zA-Z0-9])/g,(_,c:string)=>c.toUpperCase());
 const toPascal=(s:string)=>{const c=toCamel(s);return c?c[0].toUpperCase()+c.slice(1):'Solve'};
 const toSnake=(s:string)=>s.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
 const pyName=toSnake(rawName);
 const goName=toPascal(rawName);
 const jsName=toCamel(rawName);
 const detected=qCode?detectPlaygroundLang(qCode,undefined,{allowThirdParty:true}):null;
 const detectedCodeLang:CodeLang|null=detected&&detected!=='sql'?detected:null;
 const hint=(title||'').replace(/\r?\n/g,' ').slice(0,68);
 const defaults:Record<CodeLang,string>={
  python:`# ${hint}\ndef ${pyName}(*args, **kwargs):\n    # TODO: 实现核心逻辑\n    pass\n`,
  go:`package main\n\n// ${hint}\nfunc ${goName}() error {\n\t// TODO: 实现核心逻辑\n\treturn nil\n}\n`,
  java:`// ${hint}\npublic class Solution {\n    public Object ${jsName}() {\n        // TODO: 实现核心逻辑\n        return null;\n    }\n}\n`,
  ts:`// ${hint}\nexport async function ${jsName}(...args: unknown[]): Promise<unknown> {\n  // TODO: 实现核心逻辑\n  return null;\n}\n`,
  rust:`// ${hint}\npub fn ${pyName}() {\n    // TODO: 实现核心逻辑\n    unimplemented!()\n}\n`,
 };
 const out:Record<CodeLang,string>={...defaults};
 if(detectedCodeLang&&qCode?.trim()){
  out[detectedCodeLang]=qCode.trim()+'\n';
 }
 if(custom){
  for(const l of codeLangs){
   const v=custom[l.id];
   if(typeof v==='string'&&v.trim())out[l.id]=v.trim()+'\n';
  }
 }
 return out;
}

export function resolveStarters(id:string,customStarters?:Partial<Record<CodeLang,string>>):Partial<Record<CodeLang,string>>|undefined{
 if(customStarters&&Object.values(customStarters).some(v=>typeof v==='string'&&v.trim()))return customStarters;
 return startersFor(id);
}

// 作答框里的内容还是某个语言的原始框架（没补任何 TODO）时，算作还没作答。
export function untouchedStarter(id:string,text:string,customStarters?:Partial<Record<CodeLang,string>>){const s=resolveStarters(id,customStarters);return !!s&&Object.values(s).some(v=>v&&v.trim()===text.trim())}

// 代码题作答框：这道题有框架时，先选语言，作答框预填该语言的框架，学习者补全 TODO；没有框架的题就是普通代码输入框。支持一键带入操场调试并同步回答题框。
export default function CodeAnswer({id,value,onChange,disabled,rows=10,placeholder,autoFocus,playground,customStarters}:{id:string;value:string;onChange:(v:string)=>void;disabled?:boolean;rows?:number;placeholder?:string;autoFocus?:boolean;playground?:CodeAnswerPlayground;customStarters?:Partial<Record<CodeLang,string>>}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const starters=resolveStarters(id,customStarters),picked=useCodeLang();
 const langs=starters?codeLangs.filter(l=>starters[l.id]):[];
 const cur:CodeLang|undefined=starters?(picked&&starters[picked]?picked:langs[0]?.id):undefined;
 const [synced,setSynced]=useState(false);
 // 作答框还空着时填入当前语言的框架；已经写了内容就不动。
 useEffect(()=>{if(!disabled&&cur&&starters&&!value.trim())onChange(starters[cur]!)},[cur]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在语言确定 / 切换时预填
 const allowPlayground=Boolean(playground);
 // 监听代码操场点「同步回答题框」发回的最新代码（支持跨标签页 storage 事件、同标签自定义事件以及同页返回后的待同步草稿）
 useEffect(()=>{
  if(!allowPlayground||disabled)return;
  const apply=(raw:PlaygroundQuizSync|null)=>{
   if(!raw||raw.questionId!==id||typeof raw.code!=='string')return;
   if(starters&&raw.lang!=='sql'&&starters[raw.lang])setCodeLang(raw.lang);
   onChange(raw.code);
   clearQuizSync(id);
   setSynced(true);
   setTimeout(()=>setSynced(false),2600);
  };
  // 同标签返回答题页时，若 10 分钟内有操场同步过来的代码则自动填入
  const pending=readQuizSync(id);
  const initTimer=pending&&Date.now()-pending.updatedAt<10*60_000?setTimeout(()=>apply(pending),0):null;
  const onStorage=(e:StorageEvent)=>{
   if(e.key!==PG_QUIZ_SYNC_KEY||!e.newValue)return;
   try{apply(JSON.parse(e.newValue) as PlaygroundQuizSync)}catch{}
  };
  const onCustom=(e:Event)=>apply((e as CustomEvent<PlaygroundQuizSync>).detail??null);
  window.addEventListener('storage',onStorage);
  window.addEventListener(PG_QUIZ_SYNC_EVENT,onCustom);
  return()=>{
   if(initTimer)clearTimeout(initTimer);
   window.removeEventListener('storage',onStorage);
   window.removeEventListener(PG_QUIZ_SYNC_EVENT,onCustom);
  };
 },[id,allowPlayground,disabled,starters,onChange]);
 const pick=(l:CodeLang)=>{if(!starters||l===cur)return;
  // 已经补了内容时，换语言会覆盖掉，先确认。
  if(value.trim()&&!untouchedStarter(id,value,customStarters)&&!window.confirm(L('换语言会用新语言的框架替换你已经写的内容，确定吗？','Switching replaces what you wrote with the new language template. Continue?')))return;
  setCodeLang(l);onChange(starters[l]!)};
 const playLang:PlaygroundLang|undefined=cur??(playground?(detectPlaygroundLang(value,playground.hintLang,{allowThirdParty:true})??playground.hintLang??undefined):undefined);
 const openPlayground=()=>{
  if(!playLang)return;
  const src=value.trim()?prepareForPlayground(value,playLang,{questionId:id}):{code:emptyStarterFor(playLang),wrapped:false};
  openInPlayground({
   lang:playLang,
   code:src.code,
   wrapped:src.wrapped,
   title:playground?.title??L('代码题作答','Code question'),
   sourceLabel:playground?.sourceLabel,
   backHref:playground?.backHref,
   questionId:id,
   autoRun:false,
  });
 };
 return <div className="code-answer">
  {(starters||(playground&&!disabled&&playLang))&&<div className="code-ref-tabs" role="tablist" aria-label={L('作答语言','Answer language')}>
   {starters&&<>
    <span className="code-answer-label">{L('作答语言','Language')}</span>
    {langs.map(l=><button key={l.id} type="button" role="tab" aria-selected={cur===l.id} className={cur===l.id?'on':''} disabled={disabled} onClick={()=>pick(l.id)}>{l.label}</button>)}
   </>}
   {playground&&!disabled&&playLang&&(
    <button type="button" className="code-ref-play" onClick={openPlayground} title={L('把当前代码带入五语言操场编译调试，写好后可一键同步回来','Test & debug in Code Playground and sync back')}>
     <Play size={13}/>{L('去操场调试','Debug in Playground')}
    </button>
   )}
   {synced&&<span className="code-sync-pill"><Check size={13}/>{L('已从操场同步','Synced from Playground')}</span>}
  </div>}
  
  <textarea className="code" ref={codeEditing} rows={starters?Math.max(rows,(value.match(/\n/g)?.length??0)+2):rows} value={value} disabled={disabled} spellCheck={false} autoFocus={autoFocus} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
 </div>}
