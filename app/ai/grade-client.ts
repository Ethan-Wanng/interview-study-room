import {gradeQuestionText} from '@/content/code-starters';
import type {AiQuiz} from '@/content/journey';
import {pointScores,type GradeEvent,type GradeItem,type GradeResponse,type GradeResult} from '@/lib/grade-types';

type Written=Extract<AiQuiz,{type:'short'|'code'|'design'}>;
export const isWritten=(q:AiQuiz):q is Written=>q.type==='short'||q.type==='code'||q.type==='design';
// 练习题没有分值，按 10 分制评分；试卷题传入本题满分。
export const PRACTICE_MAX=10;
export const toGradeItem=(q:Written,answer:string,max=PRACTICE_MAX):GradeItem=>({id:q.id,kind:q.type,q:gradeQuestionText(q.id,q.q),code:q.code,reference:q.reference,points:q.points,scores:q.scores,max,answer});

// 今天还能用几次 AI 评分；查不到时返回 null（不影响作答）。
export async function gradeQuota():Promise<number|null>{
 try{const j=await fetch('/api/grade').then(r=>r.json()) as {remaining?:unknown};return typeof j.remaining==='number'?j.remaining:null}
 catch{return null}}

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
type RawPart={hits?:{got?:number;comment?:string}[];feedback?:string;answer?:string};
export function partialResults(items:GradeItem[],text:string):GradeResult[]{const raw=(partialJSON(text) as {results?:RawPart[]}|null)?.results??[];
 return items.map((it,k)=>{const r=raw[k],scores=pointScores(it.points,it.max,it.scores);
  const hits=it.points.map((point,i)=>{const h=r?.hits?.[i],known=typeof h?.got==='number';return {point,max:scores[i],got:known?Math.max(0,Math.min(scores[i],h!.got!)):0,comment:h?.comment??'',pending:!known}});
  return {id:it.id,max:it.max,score:hits.reduce((n,h)=>n+h.got,0),hits,feedback:r?.feedback??'',answer:r?.answer??''}})}

// 调用 AI 评分。返回评分结果，或者一个可以直接展示给用户的错误说明（额度用完、服务不可用、网络断开）。
// onLive：评分过程中不断收到“写到一半的结果”。显示按打字的节奏推进：至少每秒约 80 个字符，
// 落后收到的内容太多时自动加快，最多落后约 3 秒；收到最终结果后先把剩下的文字打完再返回。
export type GradeOutcome={ok:true;results:GradeResult[];remaining:number}|{ok:false;quota:boolean;message:string};
const NET='网络连接失败，这次没有扣次数。可以稍后再试，或先对照得分点自评。';
export async function requestGrade(items:GradeItem[],onLive?:(partial:GradeResult[])=>void):Promise<GradeOutcome>{
 let res:Response;
 try{res=await fetch('/api/grade',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})})}catch{return {ok:false,quota:false,message:NET}}
 if(!(res.headers.get('content-type')??'').includes('ndjson')){
  try{const j=await res.json() as GradeResponse;if('results' in j)return {ok:true,results:j.results,remaining:j.remaining};return {ok:false,quota:j.error==='quota',message:j.message}}
  catch{return {ok:false,quota:false,message:NET}}}
 let got='',shown=0,final:GradeOutcome|null=null;
 const tick=setInterval(()=>{if(shown>=got.length)return;shown=Math.min(got.length,shown+Math.max(4,Math.ceil((got.length-shown)/60)));onLive?.(partialResults(items,got.slice(0,shown)))},50);
 try{const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
   while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;const e=JSON.parse(line) as GradeEvent;
    if(e.t==='delta')got+=e.text;else if(e.t==='reset'){got='';shown=0;onLive?.(partialResults(items,''))}
    else if(e.t==='done')final={ok:true,results:e.results,remaining:e.remaining};else if(e.t==='error')final={ok:false,quota:false,message:e.message}}}}
 catch{final??={ok:false,quota:false,message:NET}}
 if(final?.ok)while(shown<got.length)await new Promise(r=>setTimeout(r,60));
 clearInterval(tick);return final??{ok:false,quota:false,message:NET}}
