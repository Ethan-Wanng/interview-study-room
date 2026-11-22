'use client';
import {useSyncExternalStore} from 'react';
import {
 clampThinkingToSpec,
 isThinkingLevel,
 type ConcreteThinkingLevel,
 type ModelThinkingSpec,
} from '@/lib/thinking';

// 按模型作用域保存思考强度偏好（v2）：每个模型独立记住选择的挡位，未设置时回到该模型自己的默认值。
export const THINKING_LEVEL_KEY='ai-thinking-levels-v2';
export const TUTOR_MODEL_KEY='ai-tutor-model';
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());

type StoreMap=Record<string,ConcreteThinkingLevel>;
const EMPTY_MAP:StoreMap={};
let rawCache:string|null=null;
let parsedCache:StoreMap=EMPTY_MAP;

function readMap():StoreMap{
 if(typeof window==='undefined')return EMPTY_MAP;
 try{
  const raw=localStorage.getItem(THINKING_LEVEL_KEY);
  if(raw===rawCache)return parsedCache;
  rawCache=raw;
  if(!raw){parsedCache=EMPTY_MAP;return EMPTY_MAP}
  const obj=JSON.parse(raw) as Record<string,unknown>;
  const next:StoreMap={};
  if(obj&&typeof obj==='object'){
   for(const [k,v] of Object.entries(obj)){
    if(isThinkingLevel(v)&&v!=='auto')next[k]=v;
   }
  }
  parsedCache=next;
  return next;
 }catch{return EMPTY_MAP}
}

export function getModelThinkingLevel(scopeKey:string,spec:ModelThinkingSpec):ConcreteThinkingLevel{
 const stored=readMap()[scopeKey];
 if(!stored)return spec.defaultLevel;
 return clampThinkingToSpec(stored,spec);
}

export function setModelThinkingLevel(scopeKey:string,level:ConcreteThinkingLevel,spec:ModelThinkingSpec){
 const clamped=clampThinkingToSpec(level,spec);
 const cur={...readMap()};
 if(clamped===spec.defaultLevel)delete cur[scopeKey];
 else cur[scopeKey]=clamped;
 const raw=Object.keys(cur).length?JSON.stringify(cur):null;
 rawCache=raw;
 parsedCache=cur;
 try{
  if(typeof window!=='undefined'){
   if(raw)localStorage.setItem(THINKING_LEVEL_KEY,raw);
   else localStorage.removeItem(THINKING_LEVEL_KEY);
  }
 }catch{}
 emit();
}

const subscribe=(fn:()=>void)=>{
 listeners.add(fn);
 const onStorage=(e:StorageEvent)=>{
  if(e.key===THINKING_LEVEL_KEY||e.key===TUTOR_MODEL_KEY)fn();
 };
 if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
 return()=>{listeners.delete(fn);if(typeof window!=='undefined')window.removeEventListener('storage',onStorage)};
};

export function useModelThinkingLevel(scopeKey:string,spec:ModelThinkingSpec):[ConcreteThinkingLevel,(level:ConcreteThinkingLevel)=>void]{
 const map=useSyncExternalStore(subscribe,readMap,()=>EMPTY_MAP);
 const stored=map[scopeKey];
 const val=stored?clampThinkingToSpec(stored,spec):spec.defaultLevel;
 return [val,level=>setModelThinkingLevel(scopeKey,level,spec)];
}

export function getStoredTutorModel():string{
 if(typeof window==='undefined')return 'auto';
 try{
  const raw=localStorage.getItem(TUTOR_MODEL_KEY)||'auto';
  return raw==='gemini-flash'?'gemini-4':raw;
 }catch{return 'auto'}
}

export function notifyTutorModelChanged(){emit()}

export function useStoredTutorModel():string{
 return useSyncExternalStore(subscribe,getStoredTutorModel,()=>'auto');
}
