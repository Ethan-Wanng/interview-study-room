import {env} from 'cloudflare:workers';
import {parseGradeModel,type GradeItem,type GradeModelId,type GradeResult} from './grade-types';
import {DEFAULT_TUTOR_MODEL,TUTOR_MODELS,type TutorContext,type TutorMessage} from './tutor-types';
import {providerMeta,type AiProviderId,type RuntimeAiConfig} from './ai-config';
import {clampThinkingToSpec,getCustomThinkingSpec,parseThinkingLevel,type ConcreteThinkingLevel,type ThinkingLevel} from './thinking';
import {fetchGeminiViaScheduledProxy} from './gemini-worker-proxy';
import {estimateGeminiTokens,markSiteGemini429,recordExtraGeminiTokens,refundSiteGeminiLimit,tryConsumeSiteGeminiLimit} from './gemini-rate-limit';
import {readPromptCache,resolveGeminiContextCache,sha256Hex,writePromptCache} from './prompt-cache';
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

// 默认用 DeepSeek（密钥来自 Worker 的 DEEPSEEK_API_KEY，由 2.txt 配置）；
// 已登录用户也可以在「AI 设置」中配置仅自己可用的专属 API Key（适配 OpenAI、Anthropic、Gemini、DeepSeek、通义千问）及调用限制。
const FIRST=45000,TOTAL=120000;
export class GradeError extends Error{}
// 这次请求需要识图、但当前模型不支持时抛出；message 可以直接给学习者看。
export class VisionError extends Error{}
type ChatMsg={role:'user'|'assistant';content:string;images?:string[]};
const dataUrl=(u:string)=>{const m=u.match(/^data:([^;]+);base64,(.*)$/);return {mime:m?.[1]??'image/jpeg',data:m?.[2]??''}};

const geminiSchema={type:'OBJECT',properties:{results:{type:'ARRAY',items:{type:'OBJECT',properties:{
 id:{type:'STRING'},marks:{type:'ARRAY',items:{type:'OBJECT',properties:{quote:{type:'STRING'},kind:{type:'STRING'},comment:{type:'STRING'}},required:['quote','kind','comment'],propertyOrdering:['quote','kind','comment']}},hits:{type:'ARRAY',items:{type:'OBJECT',properties:{got:{type:'NUMBER'},comment:{type:'STRING'}},required:['got','comment'],propertyOrdering:['got','comment']}},feedback:{type:'STRING'},answer:{type:'STRING'}},
 required:['id','marks','hits','feedback'],propertyOrdering:['id','marks','hits','feedback']}}},required:['results']};

type GeminiPart={text?:string;thought?:boolean};

const OPENAI_URLS:Record<'deepseek'|'openai'|'qwen',string>={
 deepseek:'https://api.deepseek.com/chat/completions',
 openai:'https://api.openai.com/v1/chat/completions',
 qwen:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
};

// 解析 SSE 行（data: ...）
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

// 依据具体模型与思考开关决定真正生效的具体挡位：deepseek-v4-pro 默认 high，deepseek-flash 思考版默认 low，非思考版默认 off。
function effectiveDsLevel(model:string,level:ThinkingLevel,defaultThinking?:boolean):'off'|'low'|'high'|'max'{
 const m=model.toLowerCase();
 if(level==='auto'){
  if(m==='deepseek-reasoner'||m==='deepseek-v4-pro')return defaultThinking===false?'off':'high';
  return defaultThinking?'low':'off';
 }
 if(level==='off')return 'off';
 if(level==='low')return 'low';
 if(level==='max'||level==='xhigh')return 'max';
 return 'high';
}

function resolveEffectiveConcreteLevel(provider:AiProviderId,model:string,level:ThinkingLevel,defaultThinking?:boolean):ConcreteThinkingLevel{
 if(provider==='deepseek')return effectiveDsLevel(model,level,defaultThinking);
 const spec=getCustomThinkingSpec(provider,model);
 if(level==='auto')return defaultThinking===false&&spec.levels.includes('off')?'off':spec.defaultLevel;
 return clampThinkingToSpec(level,spec);
}

function geminiThinkingCfgs(model:string,level:ThinkingLevel,defaultOn:boolean):(Record<string,unknown>|undefined)[]{
 const isHydrogen=/hydrogen/i.test(model);
 // Gemini 4 思考强度固定为模型默认，不再传递可调 thinkingLevel。
 if(isHydrogen){
  return defaultOn?[{includeThoughts:true},undefined]:[undefined];
 }
 if(level==='auto'){
  if(!defaultOn)return [undefined];
  return [{includeThoughts:true},undefined];
 }
 if(level==='off'){
  return [{includeThoughts:false,thinkingLevel:'MINIMAL'},{includeThoughts:false,thinkingBudget:0},undefined];
 }
 const budget=level==='low'?1024:level==='medium'?8192:(level==='xhigh'||level==='max')?32768:24576;
 const apiLvl=(level==='xhigh'||level==='max')?'HIGH':level.toUpperCase();
 return [{includeThoughts:true,thinkingLevel:apiLvl},{includeThoughts:true,thinkingBudget:budget},{includeThoughts:true},undefined];
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
 // thinking / thinkingLevel：控制是否开启思考及思考强度；onThink 收到思考过程里新写出的文字。
 opts:{thinking?:boolean;thinkingLevel?:ThinkingLevel;onThink?:(t:string)=>void;onUsage?:(u:ProviderUsage)=>void;geminiProxy?:boolean;signal?:AbortSignal;siteManaged?:boolean;firstTimeoutMs?:number;idleTimeoutMs?:number;totalTimeoutMs?:number}={}
):Promise<string>{
 const firstMs=opts.firstTimeoutMs??FIRST,idleMs=opts.idleTimeoutMs??0,totalMs=opts.totalTimeoutMs??TOTAL;
 const ctl=new AbortController(),onAbort=()=>ctl.abort();if(opts.signal){if(opts.signal.aborted)ctl.abort();else opts.signal.addEventListener('abort',onAbort,{once:true})}
 let timer=setTimeout(()=>ctl.abort(),firstMs),idleTimer:ReturnType<typeof setTimeout>|null=null,text='',alive=false;
 // 收到第一段内容（思考或正文）后，把“等第一个字”的短超时换成整段回复的总超时，并按片刷新空闲看门狗（若配置了 idleTimeoutMs）。
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
 // DeepSeek 的旧模型名已停用（现在会被悄悄换成开着思考的 deepseek-flash），这里明确换成新名字。
 const level=parseThinkingLevel(opts.thinkingLevel);
 const dsLevel=provider==='deepseek'?effectiveDsLevel(model,level,opts.thinking):'off';
 const dsThinking=provider==='deepseek'&&dsLevel!=='off';
 const effLevel=resolveEffectiveConcreteLevel(provider,model,level,opts.thinking);
 const effort:'low'|'medium'|'high'|'max'=effLevel==='xhigh'||effLevel==='max'?'max':effLevel==='medium'?'medium':effLevel==='high'?'high':'low';
 if(provider==='deepseek'&&(model==='deepseek-chat'||model==='deepseek-reasoner'))model='deepseek-flash';
 // DeepSeek 的普通对话走 Anthropic 格式的 Messages API（https://api-docs.deepseek.com/zh-cn/api/create-message/），思考过程以 thinking_delta 返回；
 // 要求 JSON 输出的评分仍走 Chat Completions（Messages API 不支持指定输出格式）。
 const messagesApi=provider==='anthropic'||provider==='deepseek'&&!jsonMode;
 try{
  if(provider==='gemini'){
   const enforceSiteLimit=opts.siteManaged!==false;
   const estTokens=enforceSiteLimit?estimateGeminiTokens(sys,messages):0;
   let reservedTokens=0;
   let limitReserved=false;
   if(enforceSiteLimit){
    const quota=await tryConsumeSiteGeminiLimit(model,estTokens);
    if(!quota.allowed){
     throw new GradeError(`gemini-rate-limit:${model}:${quota.reason}`);
    }
    reservedTokens=quota.reservedTokens;
    limitReserved=reservedTokens>0;
   }
   let streamedOut=false;
   let got429=false;
   try{
    const e=env as unknown as Record<string,string|undefined>;
    const proxy1=e?.GEMINI_PROXY_URL||(typeof process!=='undefined'?process.env?.GEMINI_PROXY_URL:undefined);
    const proxy2=e?.GEMINI_PROXY_URL_2||(typeof process!=='undefined'?process.env?.GEMINI_PROXY_URL_2:undefined);
    const cnDay=new Date(Date.now()+8*3600_000).getUTCDate();
    const gatewayBase=opts.geminiProxy===false?undefined:(cnDay<=15?(proxy1||proxy2):(proxy2||proxy1));
    const useWorkerTunnel=opts.geminiProxy!==false&&!gatewayBase;
    const geminiBase=(gatewayBase||'https://generativelanguage.googleapis.com').replace(/\/+$/,'');
    const baseCfg:Record<string,unknown>=jsonMode
     ?{temperature,responseMimeType:'application/json',responseSchema:geminiSchema}
     :{temperature};
    if(maxTokens)baseCfg.maxOutputTokens=maxTokens;
    const geminiBody=(cfg:Record<string,unknown>,cachedContent?:string)=>JSON.stringify({
     ...(cachedContent?{cachedContent}:{systemInstruction:{parts:[{text:sys}]}}),
     contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[...(m.images??[]).map(u=>{const d=dataUrl(u);return {inline_data:{mime_type:d.mime,data:d.data}}}),...(m.content?[{text:m.content}]:[])]})),
     generationConfig:cfg,
    });
    const pathWithQuery=`/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    const postGeminiRaw=async(path:string,body:string,preferStandby=false):Promise<Response>=>{
     const headers={'content-type':'application/json','x-goog-api-key':key};
     if(useWorkerTunnel){
      try{
       const {res}=await fetchGeminiViaScheduledProxy(path,{method:'POST',headers,body,signal:ctl.signal,connectTimeoutMs:6000},e,{preferStandby});
       return res;
      }catch{
       if(ctl.signal.aborted)throw new GradeError('aborted');
       // If both proxy tunnels fail to connect, fall back to direct fetch once
      }
     }
     return fetch(`${geminiBase}${path}`,{
      method:'POST',
      signal:ctl.signal,
      headers,
      body,
     });
    };
    const cachedName=await resolveGeminiContextCache(model,sys,cacheBody=>postGeminiRaw('/v1beta/cachedContents',cacheBody));
    const postGemini=(cfg:Record<string,unknown>,preferStandby=false,useCache=true)=>
     postGeminiRaw(pathWithQuery,geminiBody(cfg,useCache&&cachedName?cachedName:undefined),preferStandby);
    const cfgs=geminiThinkingCfgs(model,level,Boolean(opts.thinking||opts.onThink));
    let activeCfg=cfgs[0]?{...baseCfg,thinkingConfig:cfgs[0]}:baseCfg;
    let res=await postGemini(activeCfg);
    if(cachedName&&(res.status===400||res.status===404)){
     res=await postGemini(activeCfg,false,false);
    }
    for(let i=1;i<cfgs.length&&res.status===400;i++){
     const tc=cfgs[i];
     activeCfg=tc?{...baseCfg,thinkingConfig:tc}:baseCfg;
     res=await postGemini(activeCfg,false,false);
    }
    // Gemini 4 transient high-demand 503: brief backoff + retry once (preferring standby node if tunneling)
    if(res.status===503&&/hydrogen/i.test(model)&&!ctl.signal.aborted){
     try{await res.body?.cancel()}catch{}
     await new Promise(r=>setTimeout(r,500));
     if(!ctl.signal.aborted)res=await postGemini(activeCfg,true);
    }
    if(res.status===429){
     got429=true;
     let errBody='';
     try{errBody=(await res.text()).slice(0,1024)}catch{}
     if(enforceSiteLimit){
      if(limitReserved)await refundSiteGeminiLimit(model,reservedTokens);
      await markSiteGemini429(model,errBody);
     }
     throw new GradeError(`${provider}:${model} 429`);
    }
    if(!res.ok)throw new GradeError(`${provider}:${model} ${res.status}`);
    let thoughtChars=0;
    let gmUsage:ProviderUsage|undefined;
    for await(const data of sseLines(res)){
     const ev=JSON.parse(data) as {
      candidates?:{content?:{parts?:GeminiPart[]}}[];
      usageMetadata?:{promptTokenCount?:number;cachedContentTokenCount?:number;candidatesTokenCount?:number;thoughtsTokenCount?:number;totalTokenCount?:number};
     };
     if(ev.usageMetadata){
      const um=ev.usageMetadata;
      const inTok=Number(um.promptTokenCount||0);
      const cacheTok=Number(um.cachedContentTokenCount||0);
      const outTok=Number(um.candidatesTokenCount||0);
      const thTok=Number(um.thoughtsTokenCount||0);
      const totTok=Number(um.totalTokenCount||0)||(inTok+outTok+thTok);
      gmUsage={totalTokens:totTok,inputTokens:inTok,cachedTokens:cacheTok,outputTokens:outTok,thoughtTokens:thTok};
     }
     for(const p of ev.candidates?.[0]?.content?.parts??[]){
      if(p.thought){if(p.text){streamedOut=true;thoughtChars+=p.text.length;think(p.text)}continue;}
      if(p.text){streamedOut=true;emit(p.text);}
     }
    }
    if(gmUsage)opts.onUsage?.(gmUsage);
    if(enforceSiteLimit&&streamedOut){
     const actualOutTokens=gmUsage&&gmUsage.outputTokens+gmUsage.thoughtTokens>0?gmUsage.outputTokens+gmUsage.thoughtTokens:Math.ceil((text.length+thoughtChars)/2);
     if(actualOutTokens>512)void recordExtraGeminiTokens(model,actualOutTokens-512);
    }
   }catch(err){
    if(enforceSiteLimit&&limitReserved&&!streamedOut&&!got429){
     await refundSiteGeminiLimit(model,reservedTokens);
    }
    throw err;
   }
  }else if(messagesApi){
   const ds=provider==='deepseek';
   const maxTok=ds&&dsThinking?Math.max(maxTokens??0,effort==='max'?24576:effort==='high'?16384:8192):maxTokens??4096;
   // Anthropic 显式提示缓存（ephemeral 5 分钟）；DeepSeek 自动按前缀做上下文缓存（忽略 cache_control）。
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

type TutorCandidate={provider:AiProviderId;model:string;key:string;maxTokens?:number;thinking?:boolean};
// vision：这次对话带了图片。deepseek-flash 能识图，deepseek-v4-pro 不能。
// siteModel：学习者在对话框里选的站点模型（TUTOR_MODELS 里的 id）；默认（auto）按 DeepSeek V4.1 Flash -> Gemini 4 Hydrogen -> Gemini 3.8 Flash -> Gemini 3.6 Flash 顺序支持与回退。
// allowGemini：游客为 false，禁止调用站点 Gemini 模型。
function resolveRuntime(custom?:RuntimeAiConfig,vision=false,siteModel?:string,allowGemini=true):TutorCandidate[]{
 if(custom?.isCustom&&custom.apiKey){
  const meta=providerMeta(custom.provider);
  const m=custom.model?.trim()||meta.defaultModel;
  if(vision&&custom.provider==='deepseek'&&m==='deepseek-v4-pro')throw new VisionError('你的专属模型 deepseek-v4-pro 不能识别图片，请在「AI 设置」换成 deepseek-flash 或其他能识图的模型，或者暂时关闭专属 API。');
  return [{provider:custom.provider,model:m,key:custom.apiKey,maxTokens:custom.maxTokens,thinking:custom.provider==='gemini'?true:undefined}];
 }
 const e=env as unknown as Record<string,string|undefined>;
 const dsKey=e?.DEEPSEEK_API_KEY||(typeof process!=='undefined'?process.env?.DEEPSEEK_API_KEY:undefined);
 const gmKey=allowGemini?(e?.GEMINI_API_KEY||(typeof process!=='undefined'?process.env?.GEMINI_API_KEY:undefined)):undefined;
 const gmCands:TutorCandidate[]=gmKey?[
  {provider:'gemini',model:'gemini-4-hydrogen',key:gmKey,thinking:true},
  {provider:'gemini',model:'gemini-3.8-flash',key:gmKey,thinking:true},
  {provider:'gemini',model:'gemini-3.6-flash',key:gmKey,thinking:true},
 ]:[];
 const norm=siteModel==='gemini-flash'?'gemini-4':siteModel;
 let picked=TUTOR_MODELS.find(m=>m.id===norm)??DEFAULT_TUTOR_MODEL;
 if(!allowGemini&&picked.provider==='gemini')picked=DEFAULT_TUTOR_MODEL;
 if(vision&&!picked.vision)picked=DEFAULT_TUTOR_MODEL;
 const dsCand:TutorCandidate|null=dsKey?{provider:'deepseek',model:picked.provider==='deepseek'?picked.model:DEFAULT_TUTOR_MODEL.model,key:dsKey,thinking:picked.provider==='deepseek'?picked.thinking:DEFAULT_TUTOR_MODEL.thinking}:null;
 if(picked.provider==='gemini')return [...gmCands,...(dsCand?[dsCand]:[])];
 const list=[...(dsCand?[dsCand]:[]),...gmCands];
 if(list.length)return list;
 if(vision)throw new VisionError('站点暂时不支持识别图片，请把图片里的内容用文字描述一下。');
 throw new GradeError('missing key');
}

type GradeCandidate={provider:AiProviderId;model:string;key:string;maxTokens?:number;thinking?:boolean;label:string};

// AI 评分模型与 AI 对话模型完全独立：
// - Gemini 默认使用 gemini-4-hydrogen（默认思考强度），失败依次降级 gemini-3.8-flash -> gemini-3.6-flash（走 Gemini 代理模式）；
// - DeepSeek 使用 deepseek-flash（DeepSeek V4.1 Flash）思考模式；
// - auto 按「自定义专属（若已开启） -> Gemini 4 Hydrogen -> Gemini 3.8 Flash -> Gemini 3.6 Flash -> DeepSeek V4.1 Flash（思考）」顺序逐级保底（游客禁止 Gemini，直接用 DeepSeek）。
function resolveGradeRuntime(custom?:RuntimeAiConfig,gradeModel?:GradeModelId,allowGemini=true):GradeCandidate[]{
 const picked=parseGradeModel(gradeModel);
 const customCand=():GradeCandidate|null=>{
  if(!(custom?.isCustom&&custom.apiKey))return null;
  const meta=providerMeta(custom.provider);
  const m=custom.model?.trim()||meta.defaultModel;
  return {provider:custom.provider,model:m,key:custom.apiKey,maxTokens:custom.maxTokens,thinking:custom.provider==='gemini'||(custom.provider==='deepseek'&&m==='deepseek-v4-pro'),label:`${custom.provider}/${m}`};
 };
 const e=env as unknown as Record<string,string|undefined>;
 const dsKey=e?.DEEPSEEK_API_KEY||(typeof process!=='undefined'?process.env?.DEEPSEEK_API_KEY:undefined);
 const gmKey=allowGemini?(e?.GEMINI_API_KEY||(typeof process!=='undefined'?process.env?.GEMINI_API_KEY:undefined)):undefined;
 const gmCands:GradeCandidate[]=gmKey?[
  {provider:'gemini',model:'gemini-4-hydrogen',key:gmKey,thinking:true,label:'gemini-4-hydrogen'},
  {provider:'gemini',model:'gemini-3.8-flash',key:gmKey,thinking:true,label:'gemini-3.8-flash'},
  {provider:'gemini',model:'gemini-3.6-flash',key:gmKey,thinking:true,label:'gemini-3.6-flash'},
 ]:[];
 const dsCands:GradeCandidate[]=dsKey?[
  {provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:true,label:'deepseek-flash (thinking)'},
 ]:[];
 if(picked==='custom'){const c=customCand();return c?[c]:[];}
 if(picked==='gemini')return gmCands;
 if(picked==='deepseek')return dsCands;
 const c=customCand();
 return [...(c?[c]:[]),...gmCands,...dsCands];
}

const resolveModelLabel=(cand:{provider:AiProviderId;model:string;thinking?:boolean},level:ThinkingLevel,custom?:RuntimeAiConfig)=>{
 const base=custom?.isCustom
  ?`${cand.provider}/${cand.model}`
  :cand.provider==='deepseek'&&cand.model==='deepseek-flash'&&resolveEffectiveConcreteLevel(cand.provider,cand.model,level,cand.thinking)!=='off'
   ?'deepseek-flash (thinking)'
   :cand.model;
 if(cand.provider==='gemini'&&(/hydrogen/i.test(cand.model)||level==='auto')){
  return base;
 }
 const lv=resolveEffectiveConcreteLevel(cand.provider,cand.model,level,cand.thinking);
 return `${base}@${lv}`;
};

// 评分：onText 收到模型实时写出的文字；换下一个模型重试前先调用 onReset，让页面清掉上一个模型写了一半的内容。
export async function gradeStream(items:GradeItem[],onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,gradeModel?:GradeModelId,onThink?:(t:string)=>void,geminiProxy=true,signal?:AbortSignal,thinkingLevel?:ThinkingLevel,allowGemini=true):Promise<{results:GradeResult[];model:string}>{
 const lv=parseThinkingLevel(thinkingLevel);
 const candidates=resolveGradeRuntime(custom,gradeModel,allowGemini);if(!candidates.length)throw new GradeError('missing key');
 const promptText=buildGradeUserPrompt(items);
 const isCustom=Boolean(custom?.isCustom&&custom.apiKey);
 const cacheKey=!isCustom?'grade:'+(await sha256Hex([allowGemini?'u':'g',parseGradeModel(gradeModel),lv,promptText])):'';
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
   const text=await runProviderStream(cand.provider,cand.model,cand.key,GRADE_SYSTEM_PROMPT,[{role:'user',content:promptText}],0.2,true,cand.maxTokens??8192,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},geminiProxy,signal,siteManaged:!isCustom});
   const normalized=parseAndNormalizeGradeResults(items,text);
   const modelLabel=resolveModelLabel(cand,lv,custom);
   if(cacheKey)await writePromptCache(cacheKey,'grade',modelLabel,{results:normalized},24*3600_000);
   return {results:normalized,model:modelLabel};
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('grading failed')}

export async function standardAnswerStream(item:GradeItem,onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,gradeModel?:GradeModelId,onThink?:(t:string)=>void,geminiProxy=true,signal?:AbortSignal,thinkingLevel?:ThinkingLevel,allowGemini=true):Promise<{text:string;model:string}>{
 const lv=parseThinkingLevel(thinkingLevel);
 const candidates=resolveGradeRuntime(custom,gradeModel,allowGemini);if(!candidates.length)throw new GradeError('missing key');
 const promptText=buildStandardUserPrompt(item);
 const isCustom=Boolean(custom?.isCustom&&custom.apiKey);
 const cacheKey=!isCustom?'std:'+(await sha256Hex([allowGemini?'u':'g',parseGradeModel(gradeModel),lv,promptText])):'';
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
   const text=await runProviderStream(cand.provider,cand.model,cand.key,STANDARD_SYSTEM_PROMPT,[{role:'user',content:promptText}],0.35,false,cand.maxTokens??8192,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},geminiProxy,signal,siteManaged:!isCustom});
   const clean=text.trim();
   const modelLabel=resolveModelLabel(cand,lv,custom);
   if(cacheKey&&clean)await writePromptCache(cacheKey,'standard',modelLabel,{text:clean},7*24*3600_000);
   return {text:clean,model:modelLabel};
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('standard answer failed')}

// ---- AI 老师：常驻在学习卡片和题目旁边，纯文字流式输出 ----
// AI 老师回复一条消息：文字实时交给 onText；换模型重试前调用 onReset。
// found：站内搜索找到的卡片、题目和面试题（已经整理成文字），AI 可以把其中的链接给学习者。
export async function tutorStream(context:TutorContext,messages:TutorMessage[],onText:(t:string)=>void,onReset:()=>void,custom?:RuntimeAiConfig,siteModel?:string,onThink?:(t:string)=>void,found='',geminiProxy=true,onModel?:(model:string)=>void,signal?:AbortSignal,thinkingLevel?:ThinkingLevel,allowGemini=true){
 const lv=parseThinkingLevel(thinkingLevel);
 const candidates=resolveRuntime(custom,messages.some(m=>m.images?.length),siteModel,allowGemini);
 // 保持 system 提示词在多轮对话中完全稳定，把动态站内搜索结果追加到最新一条 user 消息尾部，最大化命中 DeepSeek / Gemini / Anthropic / OpenAI 前缀提示缓存。
 const {system:sys,messages:chatMsgs}=buildTutorPrompts(context,messages,found);
 let last:unknown;
 for(const cand of candidates){if(signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');let wrote=false;const modelLabel=resolveModelLabel(cand,lv,custom);onModel?.(modelLabel);
  try{
   await runProviderStream(cand.provider,cand.model,cand.key,sys,chatMsgs,0.5,false,cand.maxTokens,t=>{wrote=true;onText(t)},{thinking:cand.thinking,thinkingLevel:lv,onThink:t=>{wrote=true;onThink?.(t)},geminiProxy,signal,siteManaged:!(custom?.isCustom&&custom.apiKey)});
   return modelLabel;
  }catch(e){last=e;if(signal?.aborted)throw e;if(wrote)onReset()}}
 throw last instanceof Error?last:new GradeError('tutor failed')}

// ---- 私人题库：根据学生粘贴的面经、岗位要求或知识点出面试题 ----
const questionSystem=`你是资深技术面试官，帮学生整理面试题。根据学生给的材料（面经、岗位要求、知识点或笔记）出题：
- 题目贴近真实面试的问法，覆盖材料里最重要的知识点，不要重复，不要出材料完全没涉及的题。
- 每题配一份参考答案：先一句话说结论，再分点讲原理、关键细节和常见追问；需要代码时用 Markdown 代码块（\`\`\`）。答案用简体中文，300 字以内为宜。
请严格只输出一个合法的 JSON 对象（不要用 Markdown 代码块包裹）：{"questions":[{"title":"题目","answer":"参考答案"}]}`;
export async function generateQuestions(source:string,count:number,custom?:RuntimeAiConfig):Promise<{title:string;answer:string}[]>{
 const candidates=resolveRuntime(custom);let last:unknown;
 for(const cand of candidates){try{
  const text=await runProviderStream(cand.provider,cand.model,cand.key,questionSystem,[{role:'user',content:`请出 ${count} 道题。材料如下：\n\n${source}`}],0.4,false,cand.maxTokens,()=>{},{siteManaged:!(custom?.isCustom&&custom.apiKey)});
  const raw=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''),json=raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1);
  const list=(JSON.parse(json) as {questions?:{title?:unknown;answer?:unknown}[]}).questions??[];
  const out=list.filter(q=>typeof q.title==='string'&&q.title.trim()).slice(0,count).map(q=>({title:String(q.title).trim().slice(0,300),answer:typeof q.answer==='string'?q.answer.trim().slice(0,20000):''}));
  if(out.length)return out;throw new GradeError('no questions');
 }catch(e){last=e}}
 throw last instanceof Error?last:new GradeError('generate failed')}

// ---- 代码操场：AI 自动补全缺失依赖包、辅助定义与可运行 main 入口（或根据运行报错修复）----
export async function completePlaygroundCode(input:{
 lang:PlaygroundLang;
 code:string;
 error?:string;
 title?:string;
 expect?:string;
 questionId?:string;
 custom?:RuntimeAiConfig;
 geminiProxy?:boolean;
 allowGemini?:boolean;
}):Promise<string>{
 const candidates=resolveRuntime(input.custom,false,undefined,input.allowGemini!==false);
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
    {thinking:false,thinkingLevel:'off',geminiProxy:input.geminiProxy??true,siteManaged:!isCustom},
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

export async function extractJdFromImages(images:string[],geminiProxy=true,allowGemini=true):Promise<string>{
 if(!images.length)return '';
 const candidates=resolveRuntime(undefined,true,'deepseek-flash',allowGemini);
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
    {thinking:false,thinkingLevel:'off',geminiProxy,siteManaged:true},
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

// JD / 面经深度调研多引擎流式生成器（彻底不含 gemini-2.5-flash）：
// - 'deepseek-first'：阶段一（考点画像 + 复习路径）优先 DeepSeek V4.1 Flash（思考），失败自动降级 Gemini 4 / 3.8 / 3.6；
// - 'gemini-then-deepseek'：阶段二（出题）在 Gemini 模型间尝试，若 Gemini 503/429/超时或无法解析则自动无缝切换 DeepSeek V4.1 Flash（思考）。
export async function jdResearchModelStream(opts:{
 strategy:'deepseek-first'|'gemini-then-deepseek';
 includeHydrogen?:boolean;
 thinkingLevel?:ThinkingLevel;
 systemPrompt:string;
 userInput:string;
 maxTokens?:number;
 geminiProxy?:boolean;
 signal?:AbortSignal;
 validate?:(text:string)=>boolean;
 onModel?:(label:string)=>void;
 onThoughtDelta?:(delta:string)=>void;
 onTextDelta?:(delta:string)=>void;
 onReset?:()=>void;
}):Promise<{text:string;thoughts:string;model:string;usage:ProviderUsage}>{
 const e=env as unknown as Record<string,string|undefined>;
 const dsKey=e?.DEEPSEEK_API_KEY||(typeof process!=='undefined'?process.env?.DEEPSEEK_API_KEY:undefined);
 const gmKey=e?.GEMINI_API_KEY||(typeof process!=='undefined'?process.env?.GEMINI_API_KEY:undefined);
 const dsCand:GradeCandidate[]=dsKey?[
  {provider:'deepseek',model:'deepseek-flash',key:dsKey,thinking:true,label:'DeepSeek V4.1 Flash（思考）'},
 ]:[];
 const gmCands:GradeCandidate[]=gmKey?[
  ...(opts.includeHydrogen!==false?[{provider:'gemini' as const,model:'gemini-4-hydrogen',key:gmKey,thinking:true,label:'Gemini 4 Hydrogen'}]:[]),
  {provider:'gemini',model:'gemini-3.8-flash',key:gmKey,thinking:true,label:'Gemini 3.8 Flash'},
  {provider:'gemini',model:'gemini-3.6-flash',key:gmKey,thinking:true,label:'Gemini 3.6 Flash'},
 ]:[];
 const candidates=opts.strategy==='deepseek-first'?[...dsCand,...gmCands]:[...gmCands,...dsCand];
 if(!candidates.length)throw new GradeError('站点未配置可用的 AI 模型密钥。');

 let last:unknown;
 for(const cand of candidates){
  if(opts.signal?.aborted)throw last instanceof Error?last:new GradeError('aborted');
  let wrote=false;
  let thoughtBuf='';
  let capturedUsage:ProviderUsage|undefined;
  opts.onModel?.(cand.label);
  try{
   const text=await runProviderStream(
    cand.provider,
    cand.model,
    cand.key,
    opts.systemPrompt,
    [{role:'user',content:opts.userInput}],
    0.3,
    false,
    opts.maxTokens??12288,
    chunk=>{wrote=true;opts.onTextDelta?.(chunk)},
    {
     thinking:true,
     thinkingLevel:cand.provider==='deepseek'?(opts.thinkingLevel??'low'):'auto',
     onThink:chunk=>{wrote=true;thoughtBuf+=chunk;opts.onThoughtDelta?.(chunk)},
     onUsage:u=>{capturedUsage=u},
     geminiProxy:opts.geminiProxy??true,
     signal:opts.signal,
     siteManaged:true,
     firstTimeoutMs:cand.provider==='gemini'?12_000:28_000,
     idleTimeoutMs:45_000,
     totalTimeoutMs:210_000,
    },
   );
   if(opts.validate&&!opts.validate(text)){
    throw new GradeError(`${cand.model} invalid_json`);
   }
   const estIn=Math.ceil((opts.systemPrompt.length+opts.userInput.length)/2);
   const estOut=Math.ceil(text.length/2);
   const estTh=Math.ceil(thoughtBuf.length/2);
   const usage:ProviderUsage=capturedUsage&&capturedUsage.totalTokens>0
    ?{
      ...capturedUsage,
      thoughtTokens:capturedUsage.thoughtTokens||estTh,
     }
    :{
      totalTokens:estIn+estOut+estTh,
      inputTokens:estIn,
      cachedTokens:0,
      outputTokens:estOut,
      thoughtTokens:estTh,
     };
   return {text,thoughts:thoughtBuf.trim(),model:cand.label,usage};
  }catch(err){
   last=err;
   if(opts.signal?.aborted)throw err;
   if(wrote)opts.onReset?.();
  }
 }
 throw last instanceof Error?last:new GradeError('调研生成失败，请重试。');
}

// 仅在 Antigravity Agent 触发限流（429 / quota / resource_exhausted）时启用的纯 DeepSeek V4.1 Flash（思考）兜底流式生成器：
// 绝不调用任何 Gemini 模型（含 gemini-2.5-flash），对瞬时波动最多耐心尝试 2 轮。
export async function runDeepSeekJdFallbackStream(opts:{
 systemPrompt:string;
 userInput:string;
 maxTokens?:number;
 thinkingLevel?:ThinkingLevel;
 signal?:AbortSignal;
 validate?:(text:string)=>boolean;
 onModel?:(label:string)=>void;
 onThoughtDelta?:(delta:string)=>void;
 onTextDelta?:(delta:string)=>void;
 onReset?:()=>void;
}):Promise<{text:string;thoughts:string;model:string;usage:ProviderUsage}>{
 const e=env as unknown as Record<string,string|undefined>;
 const dsKey=e?.DEEPSEEK_API_KEY||(typeof process!=='undefined'?process.env?.DEEPSEEK_API_KEY:undefined);
 if(!dsKey)throw new GradeError('站点未配置 DeepSeek 兜底密钥。');

 const label='DeepSeek V4.1 Flash（Agent限流兜底）';
 opts.onModel?.(label);

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
    'deepseek',
    'deepseek-flash',
    dsKey,
    opts.systemPrompt,
    [{role:'user',content:opts.userInput}],
    0.3,
    false,
    opts.maxTokens??12288,
    chunk=>{wrote=true;opts.onTextDelta?.(chunk)},
    {
     thinking:true,
     thinkingLevel:opts.thinkingLevel??'low',
     onThink:chunk=>{wrote=true;thoughtBuf+=chunk;opts.onThoughtDelta?.(chunk)},
     onUsage:u=>{capturedUsage=u},
     geminiProxy:false,
     signal:opts.signal,
     siteManaged:true,
     firstTimeoutMs:35_000,
     idleTimeoutMs:55_000,
     totalTimeoutMs:220_000,
    },
   );
   if(opts.validate&&!opts.validate(text)){
    throw new GradeError('deepseek-flash invalid_json');
   }
   const estIn=Math.ceil((opts.systemPrompt.length+opts.userInput.length)/2);
   const estOut=Math.ceil(text.length/2);
   const estTh=Math.ceil(thoughtBuf.length/2);
   const usage:ProviderUsage=capturedUsage&&capturedUsage.totalTokens>0
    ?{
      ...capturedUsage,
      thoughtTokens:capturedUsage.thoughtTokens||estTh,
     }
    :{
      totalTokens:estIn+estOut+estTh,
      inputTokens:estIn,
      cachedTokens:0,
      outputTokens:estOut,
      thoughtTokens:estTh,
     };
   return {text,thoughts:thoughtBuf.trim(),model:label,usage};
  }catch(err){
   last=err;
   if(opts.signal?.aborted)throw err;
   if(wrote)opts.onReset?.();
   if(attempt===0)await sleep(1500);
  }
 }
 throw last instanceof Error?last:new GradeError('DeepSeek 限流兜底生成失败，请重试。');
}
