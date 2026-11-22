import type {TutorContext,TutorEvent,TutorMessage} from '@/lib/tutor-types';
import {getTutorThinkingSpec} from '@/lib/thinking';
import {getGeminiAutoProxy} from '../ai/gemini-proxy-pref';
import {getModelThinkingLevel,getStoredNoteModel} from '../ai/thinking-pref';

// 流式调用 /api/tutor 处理笔记润色、规范化与选中文本 AI 问答
export async function streamNoteAi(
 context:TutorContext,
 messages:TutorMessage[],
 onDelta:(full:string)=>void,
 onThink:(think:string)=>void,
 signal:AbortSignal,
):Promise<{ok:true;text:string}|{ok:false;aborted?:boolean;message:string}>{
 const NET='AI 助手暂时连接失败，本次未扣除额度，请稍后重试。';
 const model=getStoredNoteModel();
 const thinkingLevel=model==='auto'||model==='custom'
  ?'auto'
  :(()=>{
    const {scopeKey,spec}=getTutorThinkingSpec(model,null);
    return getModelThinkingLevel(scopeKey,spec);
   })();
 let res:Response;
 try{
  res=await fetch('/api/tutor',{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({
    context,
    messages,
    model,
    geminiProxy:getGeminiAutoProxy(),
    thinkingLevel,
   }),
   signal,
  });
 }catch{
  if(signal.aborted)return {ok:false,aborted:true,message:''};
  return {ok:false,message:NET};
 }
 if(!(res.headers.get('content-type')??'').includes('ndjson')){
  try{
   const j=(await res.json()) as {message?:string};
   return {ok:false,message:j.message??NET};
  }catch{
   return {ok:false,message:NET};
  }
 }
 const reader=res.body!.getReader();
 const dec=new TextDecoder();
 let buf='',got='',think='',err='';
 try{
  for(;;){
   if(signal.aborted)break;
   const {done,value}=await reader.read();
   if(done)break;
   buf+=dec.decode(value,{stream:true});
   let idx;
   while((idx=buf.indexOf('\n'))>=0){
    const line=buf.slice(0,idx).trim();
    buf=buf.slice(idx+1);
    if(!line)continue;
    const ev=JSON.parse(line) as TutorEvent;
    if(ev.t==='delta'){
     got+=ev.text;
     onDelta(got);
    }else if(ev.t==='think'){
     think+=ev.text;
     onThink(think);
    }else if(ev.t==='reset'){
     got='';
     think='';
     onDelta('');
     onThink('');
    }else if(ev.t==='error'){
     err=ev.message;
    }
   }
  }
 }catch{
  if(!signal.aborted)err||=NET;
 }
 if(signal.aborted)return {ok:false,aborted:true,message:''};
 if(err||!got.trim())return {ok:false,message:err||NET};
 return {ok:true,text:got.trim()};
}
