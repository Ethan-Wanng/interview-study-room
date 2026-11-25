import {noteLocalWrite} from '../components/cloud-sync';
import type {TutorMessage,TutorSegment} from '@/lib/tutor-types';

// AI 老师的对话记录：存在浏览器里，并随学习进度一起同步到账号（换设备登录也能看到）。
// 每段对话一条：key 是它发生的地方（哪张卡片、哪道题或全站），title 是显示给人看的标题。
// 图片不保存（太大），只留“[图片]”；思考过程最多留 6000 个字。最多保留 40 段、总大小约 180KB，超出时丢掉最旧的。
export type SavedChat={id:string;key:string;title:string;at:number;msgs:TutorMessage[]};
export const HISTORY_KEY='ai-tutor:v1:history';
const MAX_CHATS=40,MAX_MSGS=60,MAX_BYTES=180_000,EVENT='ai-tutor-history-change';

export function loadChats():SavedChat[]{try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(v)?v.filter(c=>c&&typeof c.id==='string'&&Array.isArray(c.msgs)):[]}catch{return []}}
function store(list:SavedChat[]){let out=[...list].sort((a,b)=>b.at-a.at).slice(0,MAX_CHATS),json=JSON.stringify(out);
 while(json.length>MAX_BYTES&&out.length>1){out=out.slice(0,-1);json=JSON.stringify(out)}
 try{localStorage.setItem(HISTORY_KEY,json)}catch{return}
 noteLocalWrite(HISTORY_KEY);window.dispatchEvent(new Event(EVENT))}
function slimSegments(segs?:TutorSegment[]):TutorSegment[]|undefined{
 if(!Array.isArray(segs)||!segs.length)return undefined;
 let thinkLeft=6000;
 const out:TutorSegment[]=[];
 for(const s of segs){
  if(!s||typeof s.text!=='string'||!s.text)continue;
  if(s.kind==='think'){
   if(thinkLeft<=0)continue;
   const text=s.text.slice(0,thinkLeft);
   thinkLeft-=text.length;
   out.push({kind:'think',text,...(typeof s.secs==='number'?{secs:s.secs}:{})});
  }else if(s.kind==='text'){
   out.push({kind:'text',text:s.text});
  }
 }
 return out.length?out:undefined;
}
const slim=(m:TutorMessage):TutorMessage=>{
 const segments=slimSegments(m.segments);
 return {
  role:m.role,
  text:m.images?.length?[m.text,'[图片]'].filter(Boolean).join('\n'):m.text,
  ...(m.think?{think:m.think.slice(0,6000),secs:m.secs}:{}),
  ...(segments?{segments}:{}),
  ...(m.model?{model:m.model}:{}),
 };
};

export function saveChat(c:{id:string;key:string;title:string;msgs:TutorMessage[]}){const rest=loadChats().filter(x=>x.id!==c.id);
 store(c.msgs.length?[{id:c.id,key:c.key,title:c.title.slice(0,80),at:Date.now(),msgs:c.msgs.slice(-MAX_MSGS).map(slim)},...rest]:rest)}
export const removeChat=(id:string)=>store(loadChats().filter(x=>x.id!==id));
export const clearChats=()=>store([]);
// 这个地方（同一张卡片、同一道题）最近的一段对话：回到这里时接着上次的聊。
export const latestChat=(key:string)=>loadChats().filter(c=>c.key===key).sort((a,b)=>b.at-a.at)[0];
export const newChatId=(key:string)=>key+'#'+Date.now().toString(36);
// 历史记录有变化时通知（本页写入，或云同步从服务器拉下来新的记录）。
export function onChatsChange(fn:()=>void){const onStorage=(e:StorageEvent)=>{if(!e.key||e.key===HISTORY_KEY)fn()};
 window.addEventListener(EVENT,fn);window.addEventListener('storage',onStorage);return()=>{window.removeEventListener(EVENT,fn);window.removeEventListener('storage',onStorage)}}
