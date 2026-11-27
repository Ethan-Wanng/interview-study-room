'use client';
import {useSyncExternalStore} from 'react';
import {parseGradeModel} from '@/lib/grade-types';
import {getLocalBridgeConfig,hasBridgeTransport,isLocalDeepReady,isLocalGradeReady,isLocalTutorReady,type LocalBridgeConfig} from '@/lib/local-bridge-config';
import {
 clampThinkingToSpec,
 getGlobalThinkingSpec,
 isThinkingLevel,
 type ConcreteThinkingLevel,
 type ModelThinkingSpec,
 type ThinkingLevel,
} from '@/lib/thinking';

// 按模型作用域保存思考强度偏好（v2）：每个模型独立记住选择的挡位，未设置时回到该模型自己的默认值。
export const THINKING_LEVEL_KEY='ai-thinking-levels-v2';
export const GLOBAL_MODEL_KEY='ai-global-model-v1';
export const TUTOR_MODEL_KEY='ai-tutor-model';
export const NOTE_MODEL_KEY='ai-note-model';
const GRADE_MODEL_KEY='ai-grade-model';
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
  if(e.key===THINKING_LEVEL_KEY||e.key===GLOBAL_MODEL_KEY||e.key===TUTOR_MODEL_KEY||e.key===NOTE_MODEL_KEY||e.key===GRADE_MODEL_KEY)fn();
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

const VALID_GLOBAL_MODELS=new Set(['auto','local','custom','deepseek-flash','deepseek-flash-think','deepseek-v4-pro']);
export function normalizeGlobalModelId(raw:unknown):string{
 if(typeof raw!=='string')return 'auto';
 const m=raw.trim();
 if(!m)return 'auto';
 if(m==='gemini-flash'||m==='gemini'||m==='gemini-4'||m==='antigravity-agent')return 'auto';
 if(m==='deepseek')return 'deepseek-flash-think';
 return VALID_GLOBAL_MODELS.has(m)?m:'auto';
}

export function getGlobalAiModel():string{
 if(typeof window==='undefined')return 'auto';
 try{
  const g=localStorage.getItem(GLOBAL_MODEL_KEY);
  if(g)return normalizeGlobalModelId(g);
  const legacy=localStorage.getItem(TUTOR_MODEL_KEY)||localStorage.getItem(NOTE_MODEL_KEY)||'auto';
  return normalizeGlobalModelId(legacy);
 }catch{return 'auto'}
}

export function setGlobalAiModel(model:string){
 const next=normalizeGlobalModelId(model);
 try{
  if(typeof window!=='undefined'){
   if(next==='auto'){
    localStorage.removeItem(GLOBAL_MODEL_KEY);
    localStorage.setItem(TUTOR_MODEL_KEY,'auto');
    localStorage.removeItem(NOTE_MODEL_KEY);
    localStorage.setItem(GRADE_MODEL_KEY,'auto');
   }else{
    localStorage.setItem(GLOBAL_MODEL_KEY,next);
    localStorage.setItem(TUTOR_MODEL_KEY,next);
    localStorage.setItem(NOTE_MODEL_KEY,next);
    localStorage.setItem(GRADE_MODEL_KEY,parseGradeModel(next));
   }
  }
 }catch{}
 emit();
}

export function useGlobalAiModel():[string,(model:string)=>void]{
 return [useSyncExternalStore(subscribe,getGlobalAiModel,()=>'auto'),setGlobalAiModel];
}

export function shouldUseLocalBridge(
 scene:'tutor'|'grade'|'deep',
 globalModel:string,
 localCfg:LocalBridgeConfig,
):boolean{
 const m=normalizeGlobalModelId(globalModel);
 if(m==='local')return Boolean(localCfg.enabled&&hasBridgeTransport(localCfg));
 if(m!=='auto')return false;
 if(scene==='tutor')return isLocalTutorReady(localCfg);
 if(scene==='grade')return isLocalGradeReady(localCfg);
 return isLocalDeepReady(localCfg);
}

export function getActiveGlobalThinkingLevel(
 globalModel:string,
 localCfg:LocalBridgeConfig,
 custom?:{provider:string;model?:string}|null,
 isGuest=false,
):ThinkingLevel{
 const m=normalizeGlobalModelId(globalModel);
 const localForModel=(m==='local'||(m==='auto'&&localCfg.enabled&&hasBridgeTransport(localCfg)))?localCfg:null;
 const {scopeKey,spec}=getGlobalThinkingSpec(m,custom,localForModel,isGuest);
 return spec.locked?'auto':getModelThinkingLevel(scopeKey,spec);
}

export function resolveLiveAiSelection(
 scene:'tutor'|'grade'|'deep',
 custom?:{provider:string;model?:string}|null,
 isGuest=false,
):{
 model:string;
 localCfg:LocalBridgeConfig;
 useLocal:boolean;
 thinkingLevel:ThinkingLevel;
}{
 const model=getGlobalAiModel();
 const localCfg=getLocalBridgeConfig();
 const useLocal=shouldUseLocalBridge(scene,model,localCfg);
 const {scopeKey,spec}=getGlobalThinkingSpec(useLocal?'local':model,custom,useLocal?localCfg:null,isGuest);
 const thinkingLevel=spec.locked?'auto':getModelThinkingLevel(scopeKey,spec);
 return {model,localCfg,useLocal,thinkingLevel};
}

export function getStoredTutorModel():string{return getGlobalAiModel()}
export function notifyTutorModelChanged(){emit()}
export function useStoredTutorModel():string{return useSyncExternalStore(subscribe,getGlobalAiModel,()=>'auto')}
export function getStoredNoteModel():string{return getGlobalAiModel()}
export function setStoredNoteModel(model:string){setGlobalAiModel(model)}
export function useStoredNoteModel():[string,(model:string)=>void]{return useGlobalAiModel()}
