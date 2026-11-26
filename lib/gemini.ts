import {env} from 'cloudflare:workers';
import {parseGradeModel,type GradeItem,type GradeModelId,type GradeResult} from './grade-types';
import {DEFAULT_TUTOR_MODEL,TUTOR_MODELS,type TutorContext,type TutorMessage} from './tutor-types';
import {providerMeta,type AiProviderId,type RuntimeAiConfig} from './ai-config';
import {clampThinkingToSpec,getCustomThinkingSpec,parseThinkingLevel,type ConcreteThinkingLevel,type ThinkingLevel} from './thinking';
import {readPromptCache,sha256Hex,writePromptCache} from './prompt-cache';
import type {PlaygroundLang} from '@/lib/playground-bridge';
import {
 GRADE_SYSTEM_PROMPT,
 PLAYGROUND_COMPLETE_SYSTEM_PROMPT,
 STANDARD_SYSTEM_PROMPT,
 buildGradeUserPrompt,
 buildPlaygroundCompleteUserPrompt,
 buildStandardUserPrompt,
 buildTutorPrompts,
 parseAndNormalizeGradeResults,
 stripOuterFence,
} from './ai-prompts';

const FIRST=45000,TOTAL=120000;
export class GradeError extends Error{}
export class VisionError extends Error{}
type ChatMsg={role:'user'|'assistant';content:string;images?:string[]};
const dataUrl=(u:string)=>{const m=u.match(/^data:([^;]+);base64,(.*)$/);return {mime:m?.[1]??'image/jpeg',data:m?.[2]??''}};

const OPENAI_URLS:Record<'deepseek'|'openai'|'qwen',string>={
 deepseek:'https://api.deepseek.com/chat/completions',
 openai:'https://api.openai.com/v1/chat/completions',
 qwen:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
};

async function* sseLines(res:Response){
 const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
 for(;;){
  const {done,value}=await reader.read();
  if(done)break;
  buf+=dec.decode(value,{stream:true}).split('\r\n').join('\n');
  let i;
  while((i=buf.indexOf('\n'))>=0){
   const line=buf.slice(0,i).trim();
   buf=buf.slice(i+1);
   if(!line.startsWith('data:'))continue;
   const data=line.slice(5).trim();
   if(!data||data==='[DONE]')continue;
   yield data;
  }
 }
}

function effectiveDsLevel(model:string,level:ThinkingLevel,defaultThinking?:boolean):'off'|'low'|'high'|'max'{
 const m=model.toLowerCase();
 if(level==='auto'){
  if(m==='deepseek-reasoner'||m==='deepseek-v4-pro')return defaultThinking===false?'off':'high';
  return defaultThinking?'low':'off';
 }
 if(level==='off')return 'off';
 if(level==='low')return 'low';
 if(level==='max'||level==='xhigh'||level==='ultra')return 'max';
 return 'high';
}

function resolveEffectiveConcreteLevel(provider:AiProviderId,model:string,level:ThinkingLevel,defaultThinking?:boolean):ConcreteThinkingLevel{
 if(provider==='deepseek')return effectiveDsLevel(model,level,defaultThinking);
 const spec=getCustomThinkingSpec(provider,model);
 if(level==='auto')return defaultThinking===false&&spec.levels.includes('off')?'off':spec.defaultLevel;
 return clampThinkingToSpec(level,spec);
}

export type ProviderUsage={totalTokens:number;inputTokens:number;cachedTokens:number;outputTokens:number;thoughtTokens:number};

async function runProviderStream(
 provider:AiProviderId,
 model:string,
 key:string,
 sys:string,
 messages:ChatMsg[],
 temperature:number,
 jsonMode:boolean,
 maxTokens:number|undefined,
 onText:(t:string)=>void,
 opts:{thinking?:boolean;thinkingLevel?:ThinkingLevel;onThink?:(t:string)=>void;onUsage?:(u:ProviderUsage)=>void;signal?:AbortSignal;firstTimeoutMs?:number;idleTimeoutMs?:number;totalTimeoutMs?:number}={}
):Promise<string>{
 const firstMs=opts.firstTimeoutMs??FIRST,idleMs=opts.idleTimeoutMs??0,totalMs=opts.totalTimeoutMs??TOTAL;
 const ctl=new AbortController(),onAbort=()=>ctl.abort();if(opts.signal){if(opts.signal.aborted)ctl.abort();else opts.signal.addEventListener('abort',onAbort,{once:true})}
 let timer=setTimeout(()=>ctl.abort(),firstMs),idleTimer:ReturnType<typeof setTimeout>|null=null,text='',alive=false;
 const touch=()=>{
  if(!alive){
   alive=true;
   clearTimeout(timer);
   timer=setTimeout(()=>ctl.abort(),totalMs);
  }
  if(idleMs>0){
   if(idleTimer)clearTimeout(idleTimer);
   idleTimer=setTimeout(()=>ctl.abort(),idleMs);
  }
 };
 const emit=(chunk:string)=>{
  if(!chunk)return;
  touch();
  text+=chunk;
  onText(chunk);
 };
 const think=(chunk:string)=>{if(!chunk)return;touch();opts.onThink?.(chunk)};
 const level=parseThinkingLevel(opts.thinkingLevel);
 const dsLevel=provider==='deepseek'?effectiveDsLevel(model,level,opts.thinking):'off';
 const dsThinking=provider==='deepseek'&&dsLevel!=='off';
 const effLevel=resolveEffectiveConcreteLevel(provider,model,level,opts.thinking);
 const effort:'low'|'medium'|'high'|'max'=effLevel==='xhigh'||effLevel==='max'||effLevel==='ultra'?'max':effLevel==='medium'?'medium':effLevel==='high'?'high':'low';
 if(provider==='deepseek'&&(model==='deepseek-chat'||model==='deepseek-reasoner'))model='deepseek-flash';
 const messagesApi=provider==='anthropic'||provider==='deepseek'&&!jsonMode;
 try{
  if(messagesApi){
   const ds=provider==='deepseek';
   const maxTok=ds&&dsThinking?Math.max(maxTokens??0,effort==='max'?24576:effort==='high'?16384:8192):maxTokens??4096;
   const sysPayload=ds?sys:[{type:'text',text:sys,cache_control:{type:'ephemeral'}}];
   const cachedHistoryIdx=!ds&&messages.length>=3?messages.length-2:-1;
   const formattedMessages=messages.map((m,idx)=>{
    const markCache=idx===cachedHistoryIdx;
    if(m.images?.length){
     const blocks:Record<string,unknown>[]=[
      ...m.images.map(u=>{const d=dataUrl(u);return {type:'image',source:{type:'base64',media_type:d.mime,data:d.data}}}),
      ...(m.content?[{type:'text',text:m.content}]:[]),
     ];
     if(markCache&&blocks.length)blocks[blocks.length-1]={...blocks[blocks.length-1],cache_control:{type:'ephemeral'}};
     return {role:m.role,content:blocks};
    }
    if(markCache&&m.content){
     return {role:m.role,content:[{type:'text',text:m.content,cache_control:{type:'ephemeral'}}]};
    }
    return {role:m.role,content:m.content};
   });
   const postMessages=(extra:Record<string,unknown>)=>fetch(ds?'https://api.deepseek.com/anthropic/v1/messages':'https://api.anthropic.com/v1/messages',{
    method:'POST',
    signal:ctl.signal,
    headers:{
     'content-type':'application/json',
     'x-api-key':key,
     'anthropic-version':'2023-06-01',
    },
    body:JSON.stringify({
     model,
     max_tokens:maxTok,
     system:sysPayload,
     ...extra,
     messages:formattedMessages,
     stream:true,
    }),
   });
   const hasExplicitEffort=effLevel==='low'||effLevel==='medium'||effLevel==='high';
   const primaryExtra:Record<string,unknown>=ds
    ?{thinking:{type:dsThinking?'enabled':'disabled'},...(dsThinking?{output_config:{effort}}:{temperature})}
    :{temperature,...(hasExplicitEffort?{output_config:{effort}}:{})};
   let res=await postMessages(primaryExtra);
   if(res.status===400&&ds&&dsThinking&&effort==='max'){
    res=await postMessages({thinking:{type:'enabled'},output_config:{effort:'high'}});
   }
   if(res.status===400){
    const fallbackExtra:Record<string,unknown>=ds?{thinking:{type:'enabled'}}:{temperature};
    res=await postMessages(fallbackExtra);
   }
   if(!res.ok)throw new GradeError(`${provider}:${model} ${res.status}`);
   let msgInTok=0,msgCacheTok=0,msgCacheCreateTok=0,msgOutTok=0,msgSawUsage=false;
   for await(const data of sseLines(res)){
    const ev=JSON.parse(data) as {
     type?:string;
     delta?:{type?:string;text?:string;thinking?:string};
     message?:{usage?:{input_tokens?:number;cache_read_input_tokens?:number;cache_creation_input_tokens?:number;output_tokens?:number}};
     usage?:{input_tokens?:number;cache_read_input_tokens?:number;cache_creation_input_tokens?:number;output_tokens?:number};
    };
    const u=ev.type==='message_start'?ev.message?.usage:ev.usage;
    if(u){
     msgSawUsage=true;
     if(typeof u.input_tokens==='number')msgInTok=Math.max(msgInTok,u.input_tokens);
     if(typeof u.cache_read_input_tokens==='number')msgCacheTok=Math.max(msgCacheTok,u.cache_read_input_tokens);
     if(typeof u.cache_creation_input_tokens==='number')msgCacheCreateTok=Math.max(msgCacheCreateTok,u.cache_creation_input_tokens);
     if(typeof u.output_tokens==='number')msgOutTok=Math.max(msgOutTok,u.output_tokens);
    }
    if(ev.type!=='content_block_delta')continue;
    if(ev.delta?.type==='text_delta'&&ev.delta.text)emit(ev.delta.text);
    else if(ev.delta?.type==='thinking_delta'&&ev.delta.thinking)think(ev.delta.thinking);
   }
   if(msgSawUsage){
    const totalIn=msgInTok+msgCacheTok+msgCacheCreateTok;
    opts.onUsage?.({
     totalTokens:totalIn+msgOutTok,
     inputTokens:totalIn,
     cachedTokens:msgCacheTok,
     outputTokens:msgOutTok,
     thoughtTokens:0,
    });
   }
  }else{
   const ds=provider==='deepseek';
   const url=OPENAI_URLS[provider];
   const basePayload:Record<string,unknown>={
    model,
    messages:[{role:'system',content:sys},...messages.map(m=>({role:m.role,content:m.images?.length?[...(m.content?[{type:'text',text:m.content}]:[]),...m.images.map(url=>({type:'image_url',image_url:{url}}))]:m.content}))],
    temperature,
    stream:true,
   };
   if(provider==='openai'){
    basePayload.prompt_cache_key='isr:'+(await sha256Hex([model,sys])).slice(0,24);
   }
   if(maxTokens)basePayload.max_tokens=ds&&dsThinking?Math.max(maxTokens,effort==='max'?24576:effort==='high'?16384:8192):maxTokens;
   if(jsonMode)basePayload.response_format={type:'json_object'};
   const extra:Record<string,unknown>={};
   if(ds){
    extra.thinking={type:dsThinking?'enabled':'disabled'};
    if(dsThinking)extra.reasoning_effort=effort;
   }else if(provider==='openai'&&(effLevel==='low'||effLevel==='medium'||effLevel==='high')){
    extra.reasoning_effort=effort;
   }else if(provider==='qwen'&&level!=='auto'){
    extra.enable_thinking=effLevel!=='off';
    if(effLevel!=='off')extra.thinking_budget=effLevel==='low'?1024:effLevel==='medium'?8192:24576;
   }
   const postOpenAi=(withExtra:Record<string,unknown>)=>{
    const body={...basePayload,...withExtra};
    if(ds&&dsThinking)delete body.temperature;
    return fetch(url,{
     method:'POST',
     signal:ctl.signal,
     headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${key}`,
     },
     body:JSON.stringify(body),
    });
   };
   let res=await postOpenAi(extra);
   if(res.status===400&&Object.keys(extra).length){
    res=await postOpenAi(ds?{thinking:{type:dsThinking?'enabled':'disabled'}}:{});
   }
   if(!res.ok)throw new GradeError(`${provider}:${model} ${res.status}`);
   for await(const data of sseLines(res)){
    const ev=JSON.parse(data) as {choices?:{delta?:{content?:string;reasoning_content?:string}}[]};
    const d=ev.choices?.[0]?.delta;if(d?.reasoning_content)think(d.reasoning_content);const delta=d?.content;
    if(delta)emit(delta);
   }
  }
  if(!text)throw new GradeError(`${provider}:${model} empty`);
  return text;
 }finally{
  clearTimeout(timer);
  if(idleTimer)clearTimeout(idleTimer);
  opts.signal?.removeEventListener('abort',onAbort);
 }
}

function getDeepSeekKey():string|undefined{
 const e=env as unknown as Record<string,string|undefined>;
 return e?.DEEPSEEK_API_KEY||(typeof process!=='undefined'?process.env?.DEEPSEEK_API_KEY:undefined);
}

type TutorCandidate={provider:AiProviderId;model:string;key:string;maxTokens?:number;thinking?:boolean};
function resolveRuntime(custom?:RuntimeAiConfig,vision=false,siteModel?:string):TutorCandidate[]{
 if(custom?.isCustom&&custom.apiKey){
  const meta=providerMeta(custom.provider);
  const m=custom.model?.trim()||meta.defaultModel;
  if(vision&&custom.provider==='deepseek'&&m==='deepseek-v4-pro')throw new VisionError('你的专属模型 deepseek-v4-pro 不能识别图片，请在「AI 设置」换成 deepseek-flash 或其他能识图的模型，或者暂时关闭专属 API。');
  return [{provider:custom.provider,model:m,key:custom.apiKey,maxTokens:custom.maxTokens}];
 }
 const dsKey=getDeepSeekKey();
 if(!dsKey){
  if(vision)throw new VisionError('站点暂时不支持识别图片，请把图片里的内容用文字描述一下。');
  throw new GradeError('missing key');
 }
 const norm=siteModel==='deepseek'?'deepseek-flash-think':siteModel;
 let picked=TUTOR_MODELS.find(m=>m.id===norm)??TUTOR_MODELS.find(m=>m.id==='deepseek-flash-think')??DEFAULT_TUTOR_MODEL;
 if(siteModel===undefined||siteModel==='auto')picked=TUTOR_MODELS.find(m=>m.id==='deepseek-flash-think')??DEFAULT_TUTOR_MODEL;
 if(vision&&!picked.vision)picked=DEFAULT_TUTOR_MODEL;
 return [{provider:'deepseek',model:picked.model,key:dsKey,thinking:picked.thinking}];
}

type GradeCandidate={provider:AiProviderId;model:string;key:string;maxTokens?:number;thinking?:boolean;label:string};

function resolveGradeRuntime(custom?:RuntimeAiConfig,gradeModel?:GradeModelId):GradeCandidate[]{
 const picked=parseGradeModel(gradeModel);
 const customCand=():GradeCandidate|null=>{
  if(!(custom?.isCustom&&custom.apiKey))return null;
  const meta=providerMeta(custom.provider);
  const m=custom.model?.trim()||meta.defaultModel;
  return {provider:custom.provider,model:m,key:custom.apiKey,maxTokens:custom.maxTokens,thinking:custom.provider==='deepseek'&&m==='deepseek-v4-pro',label:`${custom.provider}/${m}`};
 };
 if(picked==='custom'){const c=customCand();return c?[c]:[];}
 const dsKey=getDeepSeekKey();
 if(picked==='deepseek-flash')return dsKey?[{provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:false,label:'deepseek-flash'}]:[];
 if(picked==='deepseek-v4-pro')return dsKey?[{provider:'deepseek',model:'deepseek-v4-pro',key:dsKey,thinking:true,label:'deepseek-v4-pro'}]:[];
 if(picked==='deepseek'||picked==='deepseek-flash-think')return dsKey?[{provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:true,label:'deepseek-flash (thinking)'}]:[];
 const c=customCand();
 const dsDef:GradeCandidate[]=dsKey?[{provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:true,label:'deepseek-flash (thinking)'}]:[];
 return [...(c?[c]:[]),...dsDef];
}

const resolveModelLabel=(cand:{provider:AiProviderId;model:string;thinking?:boolean},level:ThinkingLevel,custom?:RuntimeAiConfig)=>{
 const base=custom?.isCustom
  ?`${cand.provider}/${cand.model}`
  :cand.provider==='deepseek'&&cand.model==='deepseek-flash'&&resolveEffectiveConcreteLevel(cand.provider,cand.model,level,cand.thinking)!=='off'
   ?'deepseek-flash (thinking)'
   :cand.model;
 const resolvedThinking=cand.provider==='deepseek'&&cand.thinking===false&&level==='auto'?'off':level;
 const lv=resolveEffectiveConcreteLevel(cand.provider,cand.model,resolvedThinking,cand.thinking);
 return `${base}@${lv}`;
};

export async function gradeStream(items:GradeItem[],onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,gradeModel?:GradeModelId,onThink?:(t:string)=>void,signal?:AbortSignal,thinkingLevel?:ThinkingLevel):Promise<{results:GradeResult[];model:string}>{
 const lv=parseThinkingLevel(thinkingLevel);
 const gm=parseGradeModel(gradeModel);
 const promptText=buildGradeUserPrompt(items);
 const candidates=resolveGradeRuntime(custom,gradeModel);if(!candidates.length)throw new GradeError('missing key');
 const isCustom=Boolean(custom?.isCustom&&custom.apiKey);
 const cacheKey=!isCustom?'grade:'+(await sha256Hex([gm,lv,promptText])):'';
 if(cacheKey){
  const hit=await readPromptCache<{results:GradeResult[]}>(cacheKey);
  if(hit?.payload?.results?.length){
   onText(JSON.stringify({results:hit.payload.results}));
   return {results:hit.payload.results,model:hit.model};
  }
 }
 let last:unknown;
 for(const cand of candidates){if(signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');let wrote=false;
  try{
   const text=await runProviderStream(cand.provider,cand.model,cand.key,GRADE_SYSTEM_PROMPT,[{role:'user',content:promptText}],0.2,true,cand.maxTokens??8192,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},signal});
   const normalized=parseAndNormalizeGradeResults(items,text);
   const modelLabel=resolveModelLabel(cand,lv,custom);
   if(cacheKey)await writePromptCache(cacheKey,'grade',modelLabel,{results:normalized},24*3600_000);
   return {results:normalized,model:modelLabel};
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('grading failed')}

export async function standardAnswerStream(item:GradeItem,onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,gradeModel?:GradeModelId,onThink?:(t:string)=>void,signal?:AbortSignal,thinkingLevel?:ThinkingLevel):Promise<{text:string;model:string}>{
 const lv=parseThinkingLevel(thinkingLevel);
 const gm=parseGradeModel(gradeModel);
 const promptText=buildStandardUserPrompt(item);
 const candidates=resolveGradeRuntime(custom,gradeModel);if(!candidates.length)throw new GradeError('missing key');
 const isCustom=Boolean(custom?.isCustom&&custom.apiKey);
 const cacheKey=!isCustom?'std:'+(await sha256Hex([gm,lv,promptText])):'';
 if(cacheKey){
  const hit=await readPromptCache<{text:string}>(cacheKey);
  if(hit?.payload?.text){
   onText(hit.payload.text);
   return {text:hit.payload.text,model:hit.model};
  }
 }
 let last:unknown;
 for(const cand of candidates){if(signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');let wrote=false;
  try{
   const text=await runProviderStream(cand.provider,cand.model,cand.key,STANDARD_SYSTEM_PROMPT,[{role:'user',content:promptText}],0.35,false,cand.maxTokens??8192,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},signal});
   const clean=text.trim();
   const modelLabel=resolveModelLabel(cand,lv,custom);
   if(cacheKey&&clean)await writePromptCache(cacheKey,'standard',modelLabel,{text:clean},7*24*3600_000);
   return {text:clean,model:modelLabel};
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('standard answer failed')}

export async function tutorStream(context:TutorContext,messages:TutorMessage[],onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,siteModel?:string,onThink?:(t:string)=>void,found='',onModel?:(model:string)=>void,signal?:AbortSignal,thinkingLevel?:ThinkingLevel){
 const lv=parseThinkingLevel(thinkingLevel);
 const {system:sys,messages:chatMsgs}=buildTutorPrompts(context,messages,found);
 const candidates=resolveRuntime(custom,messages.some(m=>m.images?.length),siteModel);
 let last:unknown;
 for(const cand of candidates){if(signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');let wrote=false;const modelLabel=resolveModelLabel(cand,lv,custom);onModel?.(modelLabel);
  try{
   await runProviderStream(cand.provider,cand.model,cand.key,sys,chatMsgs,0.5,false,cand.maxTokens,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},signal});
   return modelLabel;
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('tutor failed')}

const questionSystem=`你是资深技术面试官，帮学生整理面试题。根据学生给的材料（面经、岗位要求、知识点或笔记）出题：
- 题目贴近真实面试的问法，覆盖材料里最重要的知识点，不要重复，不要出材料完全没涉及的题。
- 每题配一份参考答案：先一句话说结论，再分点讲原理、关键细节和常见追问；需要代码时用 Markdown 代码块（\`\`\`）。答案用简体中文，300 字以内为宜。
请严格只输出一个合法的 JSON 对象（不要用 Markdown 代码块包裹）：{"questions":[{"title":"题目","answer":"参考答案"}]}`;
export async function generateQuestions(source:string,count:number,custom?:RuntimeAiConfig):Promise<{title:string;answer:string}[]>{
 const candidates=resolveRuntime(custom);let last:unknown;
 for(const cand of candidates){try{
  const text=await runProviderStream(cand.provider,cand.model,cand.key,questionSystem,[{role:'user',content:`请出 ${count} 道题。材料如下：\n\n${source}`}],0.4,false,cand.maxTokens,()=>{});
  const raw=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''),json=raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1);
  const list=(JSON.parse(json) as {questions?:{title?:unknown;answer?:unknown}[]}).questions??[];
  const out=list.filter(q=>typeof q.title==='string'&&q.title.trim()).slice(0,count).map(q=>({title:String(q.title).trim().slice(0,300),answer:typeof q.answer==='string'?q.answer.trim().slice(0,20000):''}));
  if(out.length)return out;throw new GradeError('no questions');
 }catch(e){last=e}}
 throw last instanceof Error?last:new GradeError('generate failed')}

export async function completePlaygroundCode(input:{
 lang:PlaygroundLang;
 code:string;
 error?:string;
 title?:string;
 expect?:string;
 questionId?:string;
 custom?:RuntimeAiConfig;
}):Promise<string>{
 const candidates=resolveRuntime(input.custom,false,'deepseek-flash');
 const userParts=buildPlaygroundCompleteUserPrompt(input);

 const isCustom=Boolean(input.custom?.isCustom&&input.custom.apiKey);
 const cacheKey=!isCustom?'pgc:'+(await sha256Hex([input.lang,userParts])):'';
 if(cacheKey){
  const hit=await readPromptCache<{code:string}>(cacheKey);
  if(hit?.payload?.code)return hit.payload.code;
 }

 let last:unknown;
 for(const cand of candidates){
  try{
   const text=await runProviderStream(
    cand.provider,
    cand.model,
    cand.key,
    PLAYGROUND_COMPLETE_SYSTEM_PROMPT,
    [{role:'user',content:userParts}],
    0.15,
    false,
    cand.maxTokens,
    ()=>{},
    {thinking:false,thinkingLevel:'off'},
   );
   const cleaned=stripOuterFence(text);
   if(cleaned.trim().length>=8){
    if(cacheKey)await writePromptCache(cacheKey,'pg-complete',cand.model,{code:cleaned},7*24*3600_000);
    return cleaned;
   }
   throw new GradeError('empty completion');
  }catch(e){
   last=e;
  }
 }
 throw last instanceof Error?last:new GradeError('complete playground code failed');
}

const jdImageSystem=`你是岗位 JD 与面经图片文字提取助手。请把用户上传的图片中所有与招聘岗位、职责要求、技术栈、薪资/职级或面经问题相关的文字完整、准确、忠实地提取为纯文本。
要求：
1. 保持原有分段与要点结构，不要遗漏任何技术名词、版本号、框架或量化指标；
2. 忽略页面导航栏、广告、按钮、状态栏时间电量等无关界面元素；
3. 直接输出提取后的正文，不要添加任何开场白、总结或评论。`;

export async function extractJdFromImages(images:string[]):Promise<string>{
 if(!images.length)return '';
 const candidates=resolveRuntime(undefined,true,'deepseek-flash');
 let last:unknown;
 for(const cand of candidates){
  try{
   const text=await runProviderStream(
    cand.provider,
    cand.model,
    cand.key,
    jdImageSystem,
    [{role:'user',content:'请完整提取图片中的岗位 JD / 面经正文内容：',images}],
    0.1,
    false,
    4096,
    ()=>{},
    {thinking:false,thinkingLevel:'off'},
   );
   const clean=text.trim();
   if(clean.length>=12)return clean.slice(0,12_000);
   throw new GradeError('empty image ocr');
  }catch(e){
   last=e;
  }
 }
 throw last instanceof Error?last:new GradeError('图片文字识别失败，请重试或直接粘贴文字。');
}

// 深度调研 / 重出 / 补题 / 参考简历 / 项目深挖 / 架构评审统一模型调度：
// 支持 deepseek-flash、deepseek-flash-think、deepseek-v4-pro、auto、custom。
export async function runSelectedDeepModelStream(opts:{
 model:string;
 thinkingLevel?:ThinkingLevel;
 custom?:RuntimeAiConfig;
 systemPrompt:string;
 userInput?:string;
 messages?:ChatMsg[];
 maxTokens?:number;
 jsonMode?:boolean;
 signal?:AbortSignal;
 validate?:(text:string)=>boolean;
 onModel?:(label:string)=>void;
 onThoughtDelta?:(delta:string)=>void;
 onTextDelta?:(delta:string)=>void;
 onReset?:()=>void;
}):Promise<{text:string;thoughts:string;model:string;usage:ProviderUsage}>{
 const dsKey=getDeepSeekKey();
 const lv=parseThinkingLevel(opts.thinkingLevel);

 let cand:{provider:AiProviderId;model:string;key:string;thinking?:boolean;maxTokens?:number};
 if(opts.model==='custom'&&opts.custom?.isCustom&&opts.custom.apiKey){
  const meta=providerMeta(opts.custom.provider);
  const m=opts.custom.model?.trim()||meta.defaultModel;
  cand={
   provider:opts.custom.provider,
   model:m,
   key:opts.custom.apiKey,
   thinking:opts.custom.provider==='deepseek'&&m==='deepseek-v4-pro',
   maxTokens:opts.custom.maxTokens,
  };
 }else if(opts.model==='deepseek-v4-pro'){
  if(!dsKey)throw new GradeError('站点未配置 DeepSeek API Key。');
  cand={provider:'deepseek',model:'deepseek-v4-pro',key:dsKey,thinking:true};
 }else if(opts.model==='deepseek-flash'){
  if(!dsKey)throw new GradeError('站点未配置 DeepSeek API Key。');
  cand={provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:false};
 }else{
  if(!dsKey)throw new GradeError('站点未配置 DeepSeek API Key。');
  cand={provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:true};
 }

 const effLv=cand.provider==='deepseek'&&cand.thinking===false&&lv==='auto'?'off':lv;
 const displayLabel=resolveModelLabel(cand,effLv,opts.model==='custom'?opts.custom:undefined);
 opts.onModel?.(displayLabel);

 const chatMessages:ChatMsg[]=opts.messages?.length?opts.messages:[{role:'user',content:opts.userInput??''}];
 const totalInputLen=opts.systemPrompt.length+chatMessages.reduce((n,m)=>n+m.content.length,0);

 const sleep=(ms:number)=>new Promise<void>(resolve=>{
  const t=setTimeout(resolve,ms);
  opts.signal?.addEventListener('abort',()=>{clearTimeout(t);resolve();},{once:true});
 });

 let last:unknown;
 for(let attempt=0;attempt<2;attempt++){
  if(opts.signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');
  if(attempt>0)opts.onReset?.();
  let wrote=false;
  let thoughtBuf='';
  let capturedUsage:ProviderUsage|undefined;
  try{
   const text=await runProviderStream(
    cand.provider,
    cand.model,
    cand.key,
    opts.systemPrompt,
    chatMessages,
    0.3,
    Boolean(opts.jsonMode),
    cand.maxTokens??opts.maxTokens??12288,
    chunk=>{wrote=true;opts.onTextDelta?.(chunk)},
    {
     thinking:cand.thinking,
     thinkingLevel:effLv,
     onThink:chunk=>{wrote=true;thoughtBuf+=chunk;opts.onThoughtDelta?.(chunk)},
     onUsage:u=>{capturedUsage=u},
     signal:opts.signal,
     firstTimeoutMs:35_000,
     idleTimeoutMs:55_000,
     totalTimeoutMs:220_000,
    },
   );
   if(opts.validate&&!opts.validate(text)){
    throw new GradeError(`${cand.model} invalid_output`);
   }
   const estIn=Math.ceil(totalInputLen/2);
   const estOut=Math.ceil(text.length/2);
   const estTh=Math.ceil(thoughtBuf.length/2);
   const usage:ProviderUsage=capturedUsage&&capturedUsage.totalTokens>0
    ?{...capturedUsage,thoughtTokens:capturedUsage.thoughtTokens||estTh}
    :{totalTokens:estIn+estOut+estTh,inputTokens:estIn,cachedTokens:0,outputTokens:estOut,thoughtTokens:estTh};
   return {text,thoughts:thoughtBuf.trim(),model:displayLabel,usage};
  }catch(err){
   last=err;
   if(opts.signal?.aborted)throw err;
   if(wrote)opts.onReset?.();
   if(attempt===0)await sleep(1500);
  }
 }
 throw last instanceof Error?last:new GradeError('生成失败，请重试。');
}
