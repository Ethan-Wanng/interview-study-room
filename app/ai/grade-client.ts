import {gradeQuestionText} from '@/content/code-starters';
import type {AiQuiz} from '@/content/journey';
import {useSyncExternalStore} from 'react';
import {DEFAULT_GRADE_MODEL,GRADE_LIMITS,parseGradeModel,pointScores,type GradeEvent,type GradeItem,type GradeMark,type GradeMarkKind,type GradeModelId,type GradeResponse,type GradeResult} from '@/lib/grade-types';
import {getGradeThinkingSpec} from '@/lib/thinking';
import {filterStarterMarks} from '@/lib/starter-diff';
import {getLocalBridgeConfig,isLocalGradeReady} from '@/lib/local-bridge-config';
import {streamGradeViaBridge,streamStandardViaBridge} from '@/lib/local-bridge-client';
import {getGeminiAutoProxy} from './gemini-proxy-pref';
import {getModelThinkingLevel} from './thinking-pref';

// AI 评分模型选择独立于「AI 对话（ai-tutor-model）」，单独存在本地并同步给各个评分入口。
export const GRADE_MODEL_KEY='ai-grade-model';
const gradeListeners=new Set<()=>void>();
const emitGradeModel=()=>gradeListeners.forEach(fn=>fn());
export function getGradeModel():GradeModelId{
 if(typeof window==='undefined')return DEFAULT_GRADE_MODEL;
 try{return parseGradeModel(localStorage.getItem(GRADE_MODEL_KEY));}catch{return DEFAULT_GRADE_MODEL;}
}
export function setGradeModel(id:GradeModelId){
 const next=parseGradeModel(id);
 try{if(typeof window!=='undefined')localStorage.setItem(GRADE_MODEL_KEY,next);}catch{}
 emitGradeModel();
}
const subGradeModel=(fn:()=>void)=>{
 gradeListeners.add(fn);
 const onStorage=(e:StorageEvent)=>{if(e.key===GRADE_MODEL_KEY)fn();};
 if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
 return ()=>{gradeListeners.delete(fn);if(typeof window!=='undefined')window.removeEventListener('storage',onStorage);};
};
export const useGradeModel=():[GradeModelId,(id:GradeModelId)=>void]=>[useSyncExternalStore(subGradeModel,getGradeModel,()=>DEFAULT_GRADE_MODEL),setGradeModel];

type Written=Extract<AiQuiz,{type:'short'|'code'|'design'}>;
export const isWritten=(q:AiQuiz):q is Written=>q.type==='short'||q.type==='code'||q.type==='design';
// 练习题没有分值，按 10 分制评分；试卷题传入本题满分。
export const PRACTICE_MAX=10;
export const toGradeItem=(q:Written,answer:string,max=PRACTICE_MAX):GradeItem=>({id:q.id,kind:q.type,q:gradeQuestionText(q.id,q.q),code:q.code,reference:q.reference,points:q.points,scores:q.scores,max,answer});
export const toStandardItem=(q:Written,answer:string,max=PRACTICE_MAX):GradeItem=>{
 const points=(q.points.length?q.points:['准确完整回答本题核心要点']).slice(0,12).map(p=>p.slice(0,400));
 return {id:q.id.slice(0,80)||'std',kind:q.type,q:gradeQuestionText(q.id,q.q).slice(0,4000),...(q.code?{code:q.code.slice(0,6000)}:{}),reference:(q.reference||q.explain||'（见要点）').slice(0,12000),points,...(q.scores&&q.scores.length===points.length?{scores:q.scores}:{}),max:Math.min(30,Math.max(1,Number.isFinite(max)?max:PRACTICE_MAX)),answer:answer.slice(0,GRADE_LIMITS.answer)};
};

// 今天还能用几次 AI 评分；查不到时返回 null（不影响作答）。
export type GradeQuotaInfo={remaining:number;limit:number;custom:boolean;isGuest?:boolean;provider?:string;model?:string};
let cachedGradeCustom:{provider:string;model?:string}|null=null;
let cachedGradeIsGuest=false;
export function setGradeCustomCache(custom:{provider:string;model?:string}|null,isGuest?:boolean){cachedGradeCustom=custom;if(typeof isGuest==='boolean')cachedGradeIsGuest=isGuest}
export async function gradeInfo():Promise<GradeQuotaInfo|null>{
 try{const j=await fetch('/api/grade').then(r=>r.json()) as Partial<GradeQuotaInfo>;if(typeof j.isGuest==='boolean')cachedGradeIsGuest=j.isGuest;if(j.custom&&j.provider)cachedGradeCustom={provider:j.provider,model:j.model};else if(typeof j.remaining==='number'&&!j.custom)cachedGradeCustom=null;return typeof j.remaining==='number'?{remaining:j.remaining,limit:Number(j.limit)||0,custom:!!j.custom,isGuest:Boolean(j.isGuest),provider:j.provider,model:j.model}:null}
 catch{return null}}
export async function gradeQuota():Promise<number|null>{
 const info=await gradeInfo();return info?info.remaining:null}

// 解析写到一半的 JSON：补上没闭合的字符串和括号；末尾不完整（比如只写了键名）时退回到上一个逗号或括号再试。
function partialJSON(text:string):unknown{const cuts=[text.length];let inStr=false,esc=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(inStr){if(esc)esc=false;else if(ch==='\\')esc=true;else if(ch==='"')inStr=false;continue}
  if(ch==='"')inStr=true;else if(ch===','||ch==='{'||ch==='[')cuts.push(ch===','?i:i+1)}
 cuts.sort((a,b)=>b-a);
 for(const cut of cuts.slice(0,6)){let s=text.slice(0,cut),str=false,e=false;const stack:string[]=[];
  for(const ch of s){if(str){if(e)e=false;else if(ch==='\\')e=true;else if(ch==='"')str=false;continue}
   if(ch==='"')str=true;else if(ch==='{')stack.push('}');else if(ch==='[')stack.push(']');else if(ch==='}'||ch===']')stack.pop()}
  if(str)s=(e?s.slice(0,-1):s)+'"';s=s.replace(/[,:\s]+$/,'');
  try{return JSON.parse(s+stack.reverse().join(''))}catch{/* 再退一步 */}}
 return null}

// 把收到的部分文字整理成“写到一半的评分结果”：每题按得分点列出，已写到的得分点带分数和点评，没写到的标为 pending。
type RawPart={marks?:{quote?:string;kind?:string;comment?:string}[];hits?:{got?:number;comment?:string}[];feedback?:string;answer?:string};
export function partialResults(items:GradeItem[],text:string):GradeResult[]{const raw=(partialJSON(text) as {results?:RawPart[]}|null)?.results??[];
 return items.map((it,k)=>{const r=raw[k],scores=pointScores(it.points,it.max,it.scores);
  const hits=it.points.map((point,i)=>{const h=r?.hits?.[i],known=typeof h?.got==='number';return {point,max:scores[i],got:known?Math.max(0,Math.min(scores[i],h!.got!)):0,comment:h?.comment??'',pending:!known}});
  const rawMarks:GradeMark[]=(r?.marks??[]).filter(m=>m&&typeof m.quote==='string'&&m.quote.trim()).map(m=>({quote:m.quote!.trim(),kind:(['wrong','warn','right'].includes(m.kind??'')?m.kind:'warn') as GradeMarkKind,comment:m.comment??'',pending:m.comment===undefined}));
  const marks=it.kind==='code'?filterStarterMarks(it.id,it.answer,rawMarks):rawMarks;
  return {id:it.id,max:it.max,score:hits.reduce((n,h)=>n+h.got,0),marks,hits,feedback:r?.feedback??'',answer:r?.answer??''}})}

// 调用 AI 评分。返回评分结果，或者一个可以直接展示给用户的错误说明（额度用完、服务不可用、网络断开）。
// onLive：评分过程中不断收到“写到一半的结果”。显示按打字的节奏推进：至少每秒约 80 个字符，
// 落后收到的内容太多时自动加快，最多落后约 3 秒；收到最终结果后先把剩下的文字打完再返回。
export type GradeThinkState={text:string;secs?:number;live:boolean};
export type GradeOutcome={ok:true;results:GradeResult[];model?:string;remaining?:number;think?:string;thinkSecs?:number}|{ok:false;quota:boolean;aborted?:boolean;message:string};
export type StandardAnswerOutcome={ok:true;text:string;model?:string;remaining?:number;think?:string;thinkSecs?:number}|{ok:false;quota:boolean;aborted?:boolean;message:string};
const NET='网络连接失败，这次没有扣次数。可以稍后再试，或先对照得分点自评。';

type NdjsonOutcome<T>={ok:true;data:T;model?:string;remaining?:number;think?:string;thinkSecs?:number}|{ok:false;quota:boolean;aborted?:boolean;message:string};
const ABORTED={ok:false as const,quota:false,aborted:true,message:''};
async function runGradeNdjson<T>(
 body:Record<string,unknown>,
 onProgress:(shownText:string)=>void,
 extract:(got:string,evt:Extract<GradeEvent,{t:'done'}>)=>T,
 onThink?:(think:GradeThinkState|null)=>void,
 signal?:AbortSignal,
):Promise<NdjsonOutcome<T>>{
 if(signal?.aborted)return ABORTED;
 const rawGm=parseGradeModel(body.model);
 const localCfg=getLocalBridgeConfig();
 const useLocal=isLocalGradeReady(localCfg)&&(rawGm==='auto'||rawGm==='local');
 if(useLocal){
  const {scopeKey,spec}=getGradeThinkingSpec('local',cachedGradeCustom,cachedGradeIsGuest,localCfg);
  const thinkingLevel=spec.locked?'auto':getModelThinkingLevel(scopeKey,spec);
  let got='',shown=0,think='',thinkStart=0,thinkSecs:number|undefined;
  const tick=setInterval(()=>{if(signal?.aborted||shown>=got.length)return;shown=Math.min(got.length,shown+Math.max(4,Math.ceil((got.length-shown)/60)));onProgress(got.slice(0,shown))},50);
  try{
   const items=(body.items as GradeItem[])??[];
   if(body.mode==='standard'){
    const out=await streamStandardViaBridge({
     cfg:localCfg,
     item:items[0],
     thinkingLevel,
     signal,
     onThink:d=>{if(!thinkStart)thinkStart=Date.now();think+=d;onThink?.({text:think,live:true})},
     onDelta:d=>{if(thinkStart&&thinkSecs===undefined){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000));onThink?.({text:think,secs:thinkSecs,live:false})}got+=d},
    });
    if(signal?.aborted){clearInterval(tick);return ABORTED}
    if(think&&thinkSecs===undefined&&thinkStart){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000))}
    onThink?.(think?{text:think,secs:thinkSecs,live:false}:null);
    while(shown<got.length){if(signal?.aborted){clearInterval(tick);return ABORTED}await new Promise(r=>setTimeout(r,60))}
    clearInterval(tick);
    return {ok:true,data:extract(got,{t:'done',results:[],text:out.text,model:out.model,remaining:0}),model:out.model,think:think||undefined,thinkSecs};
   }
   const out=await streamGradeViaBridge({
    cfg:localCfg,
    items,
    thinkingLevel,
    signal,
    onThink:d=>{if(!thinkStart)thinkStart=Date.now();think+=d;onThink?.({text:think,live:true})},
    onDelta:d=>{if(thinkStart&&thinkSecs===undefined){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000));onThink?.({text:think,secs:thinkSecs,live:false})}got+=d},
    onReset:()=>{got='';shown=0;think='';thinkStart=0;thinkSecs=undefined;onThink?.(null);onProgress('')},
   });
   if(signal?.aborted){clearInterval(tick);return ABORTED}
   if(think&&thinkSecs===undefined&&thinkStart){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000))}
   onThink?.(think?{text:think,secs:thinkSecs,live:false}:null);
   while(shown<got.length){if(signal?.aborted){clearInterval(tick);return ABORTED}await new Promise(r=>setTimeout(r,60))}
   clearInterval(tick);
   return {ok:true,data:extract(got,{t:'done',results:out.results,model:out.model,remaining:0}),model:out.model,think:think||undefined,thinkSecs};
  }catch(err){
   clearInterval(tick);
   if(signal?.aborted)return ABORTED;
   return {ok:false,quota:false,message:err instanceof Error&&err.message?err.message:NET};
  }
 }
 const gm=(cachedGradeIsGuest&&rawGm==='gemini')||(rawGm==='local')?'deepseek':rawGm;
 const {scopeKey,spec}=getGradeThinkingSpec(gm,cachedGradeCustom,cachedGradeIsGuest);
 const thinkingLevel=spec.locked?'auto':getModelThinkingLevel(scopeKey,spec);
 let res:Response;
 try{res=await fetch('/api/grade',{method:'POST',signal,headers:{'content-type':'application/json'},body:JSON.stringify({...body,model:gm,geminiProxy:getGeminiAutoProxy(),thinkingLevel})})}catch{return signal?.aborted?ABORTED:{ok:false,quota:false,message:NET}}
 if(!(res.headers.get('content-type')??'').includes('ndjson')){
  try{const j=await res.json() as GradeResponse;if(signal?.aborted)return ABORTED;if('results' in j)return {ok:true,data:extract('',{t:'done',results:j.results,model:j.model,remaining:j.remaining}),model:j.model,remaining:j.remaining};return {ok:false,quota:j.error==='quota',message:j.message}}
  catch{return signal?.aborted?ABORTED:{ok:false,quota:false,message:NET}}}
 let got='',shown=0,final:NdjsonOutcome<T>|null=null,think='',thinkStart=0,thinkSecs:number|undefined;
 const tick=setInterval(()=>{if(signal?.aborted||shown>=got.length)return;shown=Math.min(got.length,shown+Math.max(4,Math.ceil((got.length-shown)/60)));onProgress(got.slice(0,shown))},50);
 const reader=res.body!.getReader(),dec=new TextDecoder();
 const onAbort=()=>{try{void reader.cancel()}catch{}};
 signal?.addEventListener('abort',onAbort,{once:true});
 try{let buf='';
  for(;;){if(signal?.aborted){final=ABORTED;break}
   const {done,value}=await reader.read();if(done||signal?.aborted)break;buf+=dec.decode(value,{stream:true});let i;
   while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;const e=JSON.parse(line) as GradeEvent;
    if(e.t==='think'){if(!thinkStart)thinkStart=Date.now();think+=e.text;onThink?.({text:think,live:true})}
    else if(e.t==='delta'){if(thinkStart&&thinkSecs===undefined){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000));onThink?.({text:think,secs:thinkSecs,live:false})}got+=e.text}
    else if(e.t==='reset'){got='';shown=0;think='';thinkStart=0;thinkSecs=undefined;onThink?.(null);onProgress('')}
    else if(e.t==='done'){if(think&&thinkSecs===undefined&&thinkStart){thinkSecs=Math.max(1,Math.round((Date.now()-thinkStart)/1000))}onThink?.(think?{text:think,secs:thinkSecs,live:false}:null);final={ok:true,data:extract(got,e),model:e.model,remaining:e.remaining,think:think||undefined,thinkSecs}}
    else if(e.t==='error')final={ok:false,quota:false,message:e.message}}}
  if(signal?.aborted)final=ABORTED}
 catch{final=signal?.aborted?ABORTED:(final??{ok:false,quota:false,message:NET})}
 finally{signal?.removeEventListener('abort',onAbort)}
 if(final?.ok)while(shown<got.length){if(signal?.aborted){final=ABORTED;break}await new Promise(r=>setTimeout(r,60))}
 clearInterval(tick);return signal?.aborted?ABORTED:(final??{ok:false,quota:false,message:NET})}

export async function requestGrade(items:GradeItem[],onLive?:(partial:GradeResult[])=>void,model?:GradeModelId,onThink?:(think:GradeThinkState|null)=>void,signal?:AbortSignal):Promise<GradeOutcome>{
 const r=await runGradeNdjson({items,model:model??getGradeModel()},s=>onLive?.(partialResults(items,s)),(_,e)=>e.results,onThink,signal);
 return r.ok?{ok:true,results:r.data,model:r.model,remaining:r.remaining,think:r.think,thinkSecs:r.thinkSecs}:r;
}

export async function requestStandardAnswer(item:GradeItem,onLive?:(partialText:string)=>void,model?:GradeModelId,onThink?:(think:GradeThinkState|null)=>void,signal?:AbortSignal):Promise<StandardAnswerOutcome>{
 const r=await runGradeNdjson({items:[item],model:model??getGradeModel(),mode:'standard'},s=>onLive?.(s),(got,e)=>e.text??got,onThink,signal);
 return r.ok?{ok:true,text:r.data,model:r.model,remaining:r.remaining,think:r.think,thinkSecs:r.thinkSecs}:r;
}