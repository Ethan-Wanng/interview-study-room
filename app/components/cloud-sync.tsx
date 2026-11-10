'use client';
import {useEffect} from 'react';
import {toServerKey,toLocalKey,mergeValues,SYNC_LIMITS,type SyncItem} from '@/lib/sync-types';

// 学习进度云同步：闯关进度、试卷、技术栈、英语单词原来只存在浏览器里（按域名隔离，换域名、换设备就看不到）。
// 打开页面时和服务器对一次账：哪边新用哪边，两边都有进度时合并；本地写入后过两秒推送到服务器。
const META='cloud-sync:meta',JOURNEY_EVENT='ai-journey-change';
let name:string|null=null,timer:ReturnType<typeof setTimeout>|undefined,lastPull=0;
const pending=new Set<string>();

const readMeta=():Record<string,number>=>{try{return JSON.parse(localStorage.getItem(META)??'{}')}catch{return {}}};
const writeMeta=(m:Record<string,number>)=>{try{localStorage.setItem(META,JSON.stringify(m))}catch{}};

function send(items:SyncItem[],keepalive=false){
 for(let i=0;i<items.length;i+=SYNC_LIMITS.batch)void fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items.slice(i,i+SYNC_LIMITS.batch)}),keepalive}).catch(()=>{});
}
function flush(keepalive=false){clearTimeout(timer);if(name===null||!pending.size)return;const meta=readMeta(),items:SyncItem[]=[];
 for(const local of pending){const key=toServerKey(local,name);if(!key)continue;let value:string|null=null;try{value=localStorage.getItem(local)}catch{}
  if((value??'').length<=SYNC_LIMITS.value)items.push({key,value:value??'',updatedAt:meta[local]??Date.now()})}
 pending.clear();send(items,keepalive)}

// 页面写完 localStorage 后调用：记下修改时间，稍后推送到服务器。
export function noteLocalWrite(key:string){const meta=readMeta();meta[key]=Date.now();writeMeta(meta);pending.add(key);clearTimeout(timer);timer=setTimeout(()=>flush(),2000)}

async function pull(){lastPull=Date.now();
 const r=await fetch('/api/store',{cache:'no-store'}).catch(()=>null);if(!r?.ok){name=null;return}
 const d=await r.json() as {user:{is_guest:number;username:string}|null;items:SyncItem[]};
 if(!d.user){name=null;return}
 const me=d.user.is_guest?'guest':d.user.username||'guest';name=me;
 const server=new Map(d.items.map(i=>[i.key,i])),meta=readMeta(),now=Date.now(),push:SyncItem[]=[],changed:string[]=[];
 const keys=new Set(server.keys());try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),s=k&&toServerKey(k,me);if(s)keys.add(s)}}catch{return}
 const setLocal=(k:string,v:string,t:number)=>{try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}catch{return}meta[k]=t;changed.push(k)};
 for(const key of keys){const local=toLocalKey(key,me),lv=localStorage.getItem(local),lt=meta[local]??(lv===null?-1:0),s=server.get(key);
  if(!s){if(lv!==null){meta[local]=lt>0?lt:now;push.push({key,value:lv,updatedAt:meta[local]})}continue}
  if(lv!==null&&s.value){const merged=mergeValues(key,lv,lt,s.value,s.updatedAt);
   if(merged!==null){if(merged!==lv)setLocal(local,merged,now);
    if(merged!==s.value){meta[local]=now;push.push({key,value:merged,updatedAt:now})}else meta[local]=s.updatedAt;
    continue}}
  if(s.updatedAt>lt){if((lv??'')!==s.value)setLocal(local,s.value,s.updatedAt);else meta[local]=s.updatedAt}
  else if(lt>s.updatedAt)push.push({key,value:lv??'',updatedAt:lt})}
 writeMeta(meta);send(push.filter(i=>i.value.length<=SYNC_LIMITS.value));flush();
 // 通知正在显示的页面重新读取（闯关页听自定义事件，首页、训练页听 storage 事件）。
 if(changed.length){for(const key of changed)window.dispatchEvent(new StorageEvent('storage',{key}));window.dispatchEvent(new Event(JOURNEY_EVENT))}}

export default function CloudSync(){
 useEffect(()=>{void pull();
  const onFocus=()=>{if(document.visibilityState==='visible'&&Date.now()-lastPull>60_000)void pull()};
  const onHide=()=>flush(true);
  document.addEventListener('visibilitychange',onFocus);window.addEventListener('pagehide',onHide);
  return()=>{document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('pagehide',onHide)}},[]);
 return null}
