'use client';
import {useSyncExternalStore} from 'react';

// 控制站内调用 Gemini API 时是否启用自动代理/覆盖（默认开启；关闭后直连，不影响 DeepSeek）。
export const GEMINI_AUTO_PROXY_KEY='ai-gemini-auto-proxy';
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());

export function getGeminiAutoProxy():boolean{
 if(typeof window==='undefined')return true;
 try{return localStorage.getItem(GEMINI_AUTO_PROXY_KEY)!=='0'}catch{return true}
}

export function setGeminiAutoProxy(enabled:boolean){
 try{if(typeof window!=='undefined')localStorage.setItem(GEMINI_AUTO_PROXY_KEY,enabled?'1':'0')}catch{}
 emit();
}

const subscribe=(fn:()=>void)=>{
 listeners.add(fn);
 const onStorage=(e:StorageEvent)=>{if(e.key===GEMINI_AUTO_PROXY_KEY)fn()};
 if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
 return()=>{listeners.delete(fn);if(typeof window!=='undefined')window.removeEventListener('storage',onStorage)};
};

export const useGeminiAutoProxy=():[boolean,(enabled:boolean)=>void]=>[
 useSyncExternalStore(subscribe,getGeminiAutoProxy,()=>true),
 setGeminiAutoProxy,
];
