import {env} from 'cloudflare:workers';
import {pointScores,type GradeItem,type GradeResult} from './grade-types';

// 用 Gemini 按得分点给简答、代码和综合题打分，并写一份示范回答。密钥来自 Worker 的 GEMINI_API_KEY 密钥。
// 用流式接口：模型边生成边把文字交给 onText，页面上能看到评语和示范回答一点点写出来。
// 首选 gemini-3.8-flash；它高峰期常常 503 或迟迟不出字，这时换 gemini-3.5-flash 重试。
// FIRST：等第一段文字的最长时间；TOTAL：开始出字后整段写完的最长时间（整份试卷一起评时内容很长）。
const MODELS=['gemini-3.8-flash','gemini-3.5-flash'],FIRST=25000,TOTAL=120000;
export class GradeError extends Error{}

const schema={type:'OBJECT',properties:{results:{type:'ARRAY',items:{type:'OBJECT',properties:{
 id:{type:'STRING'},hits:{type:'ARRAY',items:{type:'OBJECT',properties:{got:{type:'NUMBER'},comment:{type:'STRING'}},required:['got','comment'],propertyOrdering:['got','comment']}},feedback:{type:'STRING'},answer:{type:'STRING'}},
 required:['id','hits','feedback','answer'],propertyOrdering:['id','hits','feedback','answer']}}},required:['results']};

const system=`你是严格但友善的面试题阅卷老师。逐题、逐个得分点判断学生答案，给出每个得分点的得分（0 到该点满分，可以给一半分）和一句中文点评。
规则：只按得分点给分，不因为写得长或用词漂亮加分；意思对、说法不同也算对；答错、自相矛盾或只写了关键词没解释的，酌情扣分；
代码题看思路和关键逻辑是否正确，语法小错不扣分，逻辑错误、遗漏边界或并发安全问题要扣分；学生没作答时全部给 0 分。
feedback 用一两句话总结这题答得好的地方和最该补的一点。hits 的个数和顺序必须与得分点一致。
answer 写一份你自己的满分示范回答，覆盖全部得分点，供学生对照学习：简答题 3～6 句、条理清楚；代码题给出完整、能运行的关键代码，必要时加简短注释；综合题先列设计要点，再给关键代码。不要照抄参考答案，用自己的话写。`;

function prompt(items:GradeItem[]){return items.map(it=>{const scores=pointScores(it.points,it.max,it.scores);
 return [`### 题目 id：${it.id}（${it.kind==='code'?'代码题':it.kind==='design'?'综合题':'简答题'}，满分 ${it.max} 分）`,it.q,it.code?`题目代码：\n${it.code}`:'',`参考答案：\n${it.reference}`,
  '得分点：',...it.points.map((p,i)=>`${i+1}. ${p}（${scores[i]} 分）`),`学生答案：\n${it.answer.trim()||'（未作答）'}`].filter(Boolean).join('\n')}).join('\n\n')}

type Raw={results:{id:string;hits:{got:number;comment:string}[];feedback:string;answer?:string}[]};
type Part={text?:string;thought?:boolean};

// 逐个读出 Gemini 流式接口（SSE）的事件。
async function* events(res:Response){const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
 for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true}).split('\r\n').join('\n');let i;
  while((i=buf.indexOf('\n\n'))>=0){const ev=buf.slice(0,i);buf=buf.slice(i+2);const line=ev.split('\n').find(l=>l.startsWith('data:'));
   if(line)yield JSON.parse(line.slice(5)) as {candidates?:{content?:{parts?:Part[]}}[]}}}}

async function stream(model:string,key:string,items:GradeItem[],onText:(t:string)=>void):Promise<Raw>{const ctl=new AbortController();let timer=setTimeout(()=>ctl.abort(),FIRST),text='';
 try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt(items)}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json',responseSchema:schema}})});
  if(!res.ok)throw new GradeError(`${model} ${res.status}`);
  for await(const ev of events(res))for(const p of ev.candidates?.[0]?.content?.parts??[])if(!p.thought&&p.text){
   if(!text){clearTimeout(timer);timer=setTimeout(()=>ctl.abort(),TOTAL)}text+=p.text;onText(p.text)}
  return JSON.parse(text) as Raw}
 finally{clearTimeout(timer)}}

// 把模型的打分夹回合法范围：每个得分点 0..满分、按 0.5 取整，总分为各点之和。
function normalize(items:GradeItem[],raw:Raw):GradeResult[]{return items.map((it,k)=>{const r=raw.results.find(x=>x.id===it.id)??raw.results[k],scores=pointScores(it.points,it.max,it.scores);
 const hits=it.points.map((point,i)=>{const h=r?.hits[i],got=Math.max(0,Math.min(scores[i],Math.round((Number(h?.got)||0)*2)/2));return {point,got,max:scores[i],comment:h?.comment??''}});
 return {id:it.id,max:it.max,score:hits.reduce((n,h)=>n+h.got,0),hits,feedback:r?.feedback??'',answer:r?.answer??''}})}

// 评分：onText 收到模型实时写出的文字；换下一个模型重试前先调用 onReset，让页面清掉上一个模型写了一半的内容。
export async function gradeStream(items:GradeItem[],onText:(t:string)=>void,onReset:()=>void):Promise<{results:GradeResult[];model:string}>{
 const key=(env as unknown as Record<string,string|undefined>).GEMINI_API_KEY;if(!key)throw new GradeError('missing key');let last:unknown;
 for(const model of MODELS){let wrote=false;
  try{const raw=await stream(model,key,items,t=>{wrote=true;onText(t)});return {results:normalize(items,raw),model}}
  catch(e){last=e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('grading failed')}
