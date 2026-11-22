'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {DEFAULT_GLASS,naturalLamp,timeTheme,validGlass,validLamp,validTheme,type Lamp} from '@/lib/day-themes';

export type AppearanceState={
 theme:string;
 lamp:Lamp|null;
 glass:number;
 now:string;
};

let state:AppearanceState={
 theme:'auto',
 lamp:null,
 glass:DEFAULT_GLASS,
 now:'forenoon',
};

const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};

function readClient():AppearanceState{
 try{
  return {
   theme:validTheme(localStorage.getItem('study-theme')),
   lamp:validLamp(localStorage.getItem('study-lamp')),
   glass:validGlass(localStorage.getItem('study-glass')),
   now:timeTheme(),
  };
 }catch{
  return {...state,now:timeTheme()};
 }
}

export function applyToDocument(s:AppearanceState){
 if(typeof document==='undefined')return;
 const id=s.theme==='auto'?s.now:s.theme;
 const effective=s.lamp??naturalLamp(id);
 const root=document.documentElement;
 root.dataset.theme=id;
 root.dataset.lamp=effective;
 root.classList.toggle('dark',effective==='off');
 root.style.colorScheme=effective==='off'?'dark':'light';
 root.style.backgroundColor=effective==='off'?'#162032':'';
 root.style.setProperty('--glass-t',String(s.glass));
 try{
  document.cookie=`study-theme=${s.theme};path=/;max-age=31536000;SameSite=Lax`;
  document.cookie=`study-lamp=${s.lamp??''};path=/;max-age=31536000;SameSite=Lax`;
  document.cookie=`study-glass=${s.glass};path=/;max-age=31536000;SameSite=Lax`;
 }catch{}
}

function update(patch:Partial<AppearanceState>){
 state={...state,...patch};
 try{
  if('theme' in patch)localStorage.setItem('study-theme',state.theme);
  if('lamp' in patch){
   if(state.lamp)localStorage.setItem('study-lamp',state.lamp);
   else localStorage.removeItem('study-lamp');
  }
  if('glass' in patch)localStorage.setItem('study-glass',String(state.glass));
 }catch{}
 applyToDocument(state);
 emit();
}

export function setThemePreference(theme:string){update({theme:validTheme(theme)})}
export function setLampPreference(lamp:Lamp){update({lamp})}
export function setGlassPreference(glass:number){update({glass:validGlass(glass)})}

export function useAppearance(){
 const s=useSyncExternalStore(subscribe,()=>state,()=>state);
 const effectiveId=s.theme==='auto'?s.now:s.theme;
 const effectiveLamp=s.lamp??naturalLamp(effectiveId);
 return {...s,effectiveId,effectiveLamp};
}

// 全站挂载一次：首屏同步本地存储的配色、灯光与 iOS 26 玻璃透明度，并每 30 秒刷新当地时间主题。
export function AppearanceSync(){
 useEffect(()=>{
  state=readClient();
  applyToDocument(state);
  emit();
  const tick=()=>{
   const next=timeTheme();
   if(next!==state.now){state={...state,now:next};applyToDocument(state);emit()}
  };
  const timer=setInterval(tick,30000);
  const onStorage=(ev:StorageEvent)=>{
   if(ev.key==='study-theme'||ev.key==='study-lamp'||ev.key==='study-glass'){
    state=readClient();applyToDocument(state);emit();
   }
  };
  window.addEventListener('storage',onStorage);
  return()=>{clearInterval(timer);window.removeEventListener('storage',onStorage)};
 },[]);
 return null;
}
