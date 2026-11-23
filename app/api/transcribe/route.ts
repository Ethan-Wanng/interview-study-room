import {env} from 'cloudflare:workers';
import {AuthError,assertSameOrigin,rateLimit,sessionUser} from '@/lib/site-auth';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
// 浏览器录好、转成 16kHz 单声道 WAV 的语音，最长约 90 秒（约 2.9MB，base64 后约 3.9MB）。
const MAX_DATA=4_200_000;
const AUDIO_URL=/^data:(audio\/(?:wav|x-wav|webm|ogg|mp4|mpeg|aac));base64,([A-Za-z0-9+/=]+)$/;

// 语音输入：把一段录音交给 Gemini 转成文字。浏览器自带的语音识别依赖谷歌服务，国内用不了，所以统一走服务端。
export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const user=await sessionUser(req.headers);
  if(!user)throw new AuthError('请先登录后再使用语音输入。',401);
  if(user.is_guest)throw new AuthError('游客不支持调用 Gemini 语音识别，请登录后使用或直接打字。',403);
  await rateLimit('transcribe:'+user.id,user.is_guest?20:60);
  const raw=await req.text();
  if(raw.length>MAX_DATA+200)throw new AuthError('录音太长了，请分几段说（每段 90 秒以内）。',413);
  let body:{audio?:unknown;lang?:unknown};
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}
  const m=typeof body.audio==='string'?AUDIO_URL.exec(body.audio):null;
  if(!m)throw new AuthError('录音格式不支持。',400);
  const key=(env as unknown as Record<string,string|undefined>).GEMINI_API_KEY;
  if(!key)return Response.json({error:'站点暂时没有配置语音识别。'},{status:503,headers:noCache});
  const en=body.lang==='en';
  const prompt=en
   ?'Transcribe this recording verbatim. Output only the transcript text with normal punctuation, no explanations. If there is no speech, output nothing.'
   :'把这段录音逐字转写成文字。说话人多数在用中文回答技术面试题，可能夹杂英文技术名词（如 Redis、goroutine、HTTP），英文名词保持英文原样。加上正常的标点，只输出转写的文字，不要解释、不要总结、不要改写内容。如果没有人说话，什么都不输出。';
  let last='';
  for(const model of ['gemini-3.8-flash','gemini-3.6-flash']){
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
   try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:ctl.signal,
     headers:{'content-type':'application/json','x-goog-api-key':key},
     body:JSON.stringify({contents:[{role:'user',parts:[{inline_data:{mime_type:m[1]==='audio/x-wav'?'audio/wav':m[1],data:m[2]}},{text:prompt}]}],generationConfig:{temperature:0}})});
    if(!res.ok){last=`${model} ${res.status}`;continue}
    const d=await res.json() as {candidates?:{content?:{parts?:{text?:string;thought?:boolean}[]}}[]};
    const text=(d.candidates?.[0]?.content?.parts??[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('').trim();
    return Response.json({text},{headers:noCache});
   }catch(e){last=String(e)}finally{clearTimeout(timer)}
  }
  console.error('transcribe failed',last);
  return Response.json({error:'语音识别暂时不可用，请稍后再试或直接打字。'},{status:502,headers:noCache});
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  return Response.json({error:e instanceof AuthError?e.message:'语音识别失败，请稍后再试。'},{status,headers:noCache});
 }
}
