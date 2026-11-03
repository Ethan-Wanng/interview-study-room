import {env} from 'cloudflare:workers';
import {pointScores,type GradeItem,type GradeResult} from './grade-types';
import type {TutorContext,TutorLesson,TutorMessage,TutorQuiz} from './tutor-types';

// 用 Gemini 按得分点给简答、代码和综合题打分，并写一份示范回答。密钥来自 Worker 的 GEMINI_API_KEY 密钥。
// 用流式接口：模型边生成边把文字交给 onText，页面上能看到评语和示范回答一点点写出来。
// 用 gemini-3.5-flash；它偶尔 503 或迟迟不出字时，换 gemini-2.5-flash 重试。（gemini-3.8-flash 实测一直不出字，已去掉。）
// FIRST：等第一段文字的最长时间；TOTAL：开始出字后整段写完的最长时间（整份试卷一起评时内容很长）。
const MODELS=['gemini-3.5-flash','gemini-2.5-flash'],FIRST=25000,TOTAL=120000;
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

// ---- AI 老师：常驻在学习卡片和题目旁边，纯文字流式输出 ----
const tutorBase=`你是“面试自习室”的 AI 老师，学生是完全没有基础的新手。
通用要求：用简体中文，语气亲切、耐心，句子简短；用到新名词时顺便用一句大白话解释，多用生活中的比喻和具体的小例子；
代码和命令放在 Markdown 代码块里；不要编造事实、命令、输出或网址；回答尽量短，学生想深入再展开。`;
const modeRule:Record<TutorContext['kind'],string>={
 practice:`现在你在带学生在他自己的电脑上完成一个动手练习（内容见下）。
- 一次只讲一步：说清楚这一步做什么、为什么、具体输入什么，然后请学生回复看到的结果，再继续下一步。不要一次把所有步骤都说完。
- 不确定学生用的是 Windows 还是 Mac 时先问清楚；两种系统操作不同时分别说明。
- 学生贴出报错或输出时，先用大白话解释它是什么意思，再给出最可能的一两个解决办法。
- 全部完成后，帮学生对照“应该看到的输出”确认结果，再用两三句话总结学到了什么。`,
 task:`学生正在自己动手写下面这个编程任务（项目实战）。目标是让他自己写出绝大部分代码，你是教练，不是代写的人。
- 绝对不要给出完整的实现，也不要整段贴出参考答案；最多给一两行关键代码、伪代码，或者指出该用哪个函数、哪个库。
- 学生卡住时，先问他写到哪一步了、具体卡在哪里，再给一个小提示，让他自己往下写；一次只推进一小步。
- 学生贴出代码或报错时，指出问题在哪一行、为什么错、往什么方向改，让他自己动手改，不要直接把改好的完整代码写出来。
- 学生明确说放弃或者已经写完想对照时，提醒他展开卡片上的“参考答案”自己对比，你可以帮他分析两者的差别。
- 完成后提醒他运行这一关的验收脚本检查。`,
 lesson:`学生正在看下面这张学习卡片，有地方没看懂。针对学生的问题讲解：先用一句话说核心意思，再用比喻或具体例子讲清楚；
如果卡片里有代码，可以逐行解释学生问到的部分。学生问的和卡片无关时，简单回答后把他带回这张卡片。`,
 hint:`学生正在做下面这道题，还没有作答，想要一点提示。
- 绝对不要说出或暗示正确答案是哪一项、是对是错、要填什么；不要逐个分析选项。
- 只给方向：提醒他该想到哪个概念、可以从什么角度思考、关键的判断依据是什么。两三句话即可。
- 学生追问答案时，礼貌地鼓励他先自己作答，答完可以再问你讲解。`,
 explain:`学生已经做完下面这道题（他的作答和对错见下），看了解析还是不太懂，想请你讲解。
- 先用一两句话讲清楚为什么正确答案是对的，再说明他的选择错在哪里（答对了就确认他的思路对在哪里）。
- 有选项时，逐个用一句话说明每个错误选项错在哪里、它其实对应什么场景。
- 用比喻或具体例子帮他真正理解，最后用一句话总结要记住的要点。之后学生可以继续追问。`};

const lessonText=(l:TutorLesson,practice:boolean)=>[`${practice?'练习':'卡片'}标题：${l.title}`,`${practice?'练习说明':'卡片内容'}：${l.body}`,
 ...(l.steps.length?['操作步骤：',...l.steps.map((s,i)=>`${i+1}. ${s}`)]:[]),l.code?`代码：\n\`\`\`\n${l.code}\n\`\`\``:'',l.expect?`应该看到的输出：\n${l.expect}`:'',
 l.solution?`参考答案（只供你判断学生的代码对不对、该提示什么，绝对不能整段给学生）：\n\`\`\`\n${l.solution}\n\`\`\``:''].filter(Boolean).join('\n');
const quizText=(q:TutorQuiz,withAnswer:boolean)=>[`题型：${q.type}`,`题目：${q.q}`,q.code?`题目代码：\n\`\`\`\n${q.code}\n\`\`\``:'',
 ...(q.options?.length?['选项：',...q.options.map((o,i)=>`${'ABCDEFGH'[i]}. ${o}`)]:[]),
 `正确答案：${q.answer}`,`官方解析：${q.explain}`,withAnswer&&q.given!==undefined?`学生的作答：${q.given||'（未作答）'}（${q.correct?'答对了':'答错了'}）`:''].filter(Boolean).join('\n');
function contextText(c:TutorContext){if('lesson' in c)return lessonText(c.lesson,c.kind!=='lesson');
 return quizText(c.quiz,c.kind==='explain')+(c.kind==='hint'?'\n（正确答案和解析只供你判断提示方向，绝对不能透露给学生。）':'')}

async function tutorOnce(model:string,key:string,context:TutorContext,messages:TutorMessage[],onText:(t:string)=>void){const ctl=new AbortController();let timer=setTimeout(()=>ctl.abort(),FIRST),text='';
 try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({systemInstruction:{parts:[{text:tutorBase+'\n\n'+modeRule[context.kind]+'\n\n'+contextText(context)}]},contents:messages.map(m=>({role:m.role,parts:[{text:m.text}]})),generationConfig:{temperature:0.5}})});
  if(!res.ok)throw new GradeError(`${model} ${res.status}`);
  for await(const ev of events(res))for(const p of ev.candidates?.[0]?.content?.parts??[])if(!p.thought&&p.text){
   if(!text){clearTimeout(timer);timer=setTimeout(()=>ctl.abort(),TOTAL)}text+=p.text;onText(p.text)}
  if(!text)throw new GradeError(`${model} empty`)}
 finally{clearTimeout(timer)}}

// AI 老师回复一条消息：文字实时交给 onText；换模型重试前调用 onReset。
export async function tutorStream(context:TutorContext,messages:TutorMessage[],onText:(t:string)=>void,onReset:()=>void){
 const key=(env as unknown as Record<string,string|undefined>).GEMINI_API_KEY;if(!key)throw new GradeError('missing key');let last:unknown;
 for(const model of MODELS){let wrote=false;
  try{await tutorOnce(model,key,context,messages,t=>{wrote=true;onText(t)});return model}
  catch(e){last=e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('tutor failed')}
