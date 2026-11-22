'use client';
import {useSyncExternalStore} from 'react';
import type {Animation} from './types';
import {canRecord,synthesizeAnimationVideo,type Recording} from './record';

export type DownloadStatus='running'|'done'|'error';
export type DownloadJob={
 id:string;
 title:string;
 pct:number;
 status:DownloadStatus;
 startedAt:number;
};
export type StartDownloadResult='started'|'already-running'|'unsupported'|'failed';

type InternalEntry={job:DownloadJob;rec?:Recording;timer?:ReturnType<typeof setTimeout>};

const entries=new Map<string,InternalEntry>();
const listeners=new Set<()=>void>();
const EMPTY:DownloadJob[]=[];
let snapshot:DownloadJob[]=EMPTY;
let panelOpen=false;
let unloadHooked=false;

function onBeforeUnload(e:BeforeUnloadEvent){
 e.preventDefault();
 e.returnValue='';
}

function syncUnloadHook(){
 if(typeof window==='undefined')return;
 let running=false;
 for(const e of entries.values()){if(e.job.status==='running'){running=true;break}}
 if(running&&!unloadHooked){window.addEventListener('beforeunload',onBeforeUnload);unloadHooked=true}
 else if(!running&&unloadHooked){window.removeEventListener('beforeunload',onBeforeUnload);unloadHooked=false}
}

function emit(){
 snapshot=entries.size?[...entries.values()].map(e=>({...e.job})):EMPTY;
 syncUnloadHook();
 listeners.forEach(l=>l());
}

function clearTimer(e?:InternalEntry){
 if(e?.timer){clearTimeout(e.timer);e.timer=undefined}
}

function scheduleDismiss(id:string,ms:number){
 const cur=entries.get(id);
 if(!cur)return;
 clearTimer(cur);
 cur.timer=setTimeout(()=>{
  const now=entries.get(id);
  if(!now||now.job.status==='running')return;
  if(panelOpen){scheduleDismiss(id,1500);return}
  entries.delete(id);
  emit();
 },ms);
}

export function setDownloadPanelOpen(open:boolean){
 panelOpen=open;
 if(!open){
  for(const [id,entry] of entries){
   if(entry.job.status==='done')scheduleDismiss(id,1200);
  }
 }
}

export function startAnimationDownload(
 animation:Animation,
 themeRefEl:HTMLElement,
 opts:{sfx:boolean;voice:boolean},
):StartDownloadResult{
 if(!canRecord())return 'unsupported';
 const prev=entries.get(animation.id);
 if(prev?.job.status==='running')return 'already-running';
 clearTimer(prev);
 entries.set(animation.id,{
  job:{
   id:animation.id,
   title:animation.title,
   pct:0,
   status:'running',
   startedAt:Date.now(),
  },
 });
 emit();
 try{
  const rec=synthesizeAnimationVideo(
   animation,
   themeRefEl,
   opts,
   pct=>{
    const cur=entries.get(animation.id);
    if(!cur||cur.job.status!=='running'||cur.job.pct===pct)return;
    cur.job.pct=pct;
    emit();
   },
   (ok,cancelled)=>{
    const cur=entries.get(animation.id);
    if(!cur)return;
    cur.rec=undefined;
    if(cancelled){
     clearTimer(cur);
     entries.delete(animation.id);
     emit();
     return;
    }
    cur.job.status=ok?'done':'error';
    if(ok)cur.job.pct=100;
    emit();
    scheduleDismiss(animation.id,ok?4500:12000);
   },
  );
  const cur=entries.get(animation.id);
  if(cur)cur.rec=rec;
  return 'started';
 }catch{
  const cur=entries.get(animation.id);
  if(cur){
   cur.rec=undefined;
   cur.job.status='error';
   emit();
   scheduleDismiss(animation.id,12000);
  }
  return 'failed';
 }
}

export function cancelAnimationDownload(id:string){
 const cur=entries.get(id);
 if(!cur)return;
 clearTimer(cur);
 const rec=cur.rec;
 entries.delete(id);
 emit();
 try{rec?.stop()}catch{}
}

export function dismissAnimationDownload(id:string){
 const cur=entries.get(id);
 if(!cur||cur.job.status==='running')return;
 clearTimer(cur);
 entries.delete(id);
 emit();
}

const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn)};
const getSnapshot=()=>snapshot;
const getServerSnapshot=()=>EMPTY;

export function useAnimationDownloads():DownloadJob[]{
 return useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
}
