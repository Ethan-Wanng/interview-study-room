import {noteLocalWrite} from '@/app/components/cloud-sync';
import type {Result} from '@/app/ai/question-card';

export type QuizMode='level'|'random'|'mistakes'|'exam';

export type SavedQuizItem={
 id:string;
 order:number[];
};

export type SavedQuizSession={
 slot:string;
 mode:QuizMode;
 levelId?:string;
 examId?:string;
 label:string;
 items:SavedQuizItem[];
 index:number;
 results:(Result|null)[];
 drafts?:Record<string,string>;
 updatedAt:number;
};

export type SavedQuizMap=Record<string,SavedQuizSession>;

export type SavedLazyQuiz={
 level:number;
 items:{id:string;subject:string;order:number[]}[];
 index:number;
 results:(Result|null)[];
 drafts?:Record<string,string>;
 shares:Record<string,number>;
 updatedAt:number;
};

export const QUIZ_SESSION_EVENT='ai-quiz-session-change';
const JOURNEY_EVENT='ai-journey-change';
const MAX_SLOTS=20;

export function subscribeQuizSessions(notify:()=>void){
 window.addEventListener('storage',notify);
 window.addEventListener(QUIZ_SESSION_EVENT,notify);
 window.addEventListener(JOURNEY_EVENT,notify);
 return()=>{
  window.removeEventListener('storage',notify);
  window.removeEventListener(QUIZ_SESSION_EVENT,notify);
  window.removeEventListener(JOURNEY_EVENT,notify);
 };
}

export function readRawQuizStore(key:string):string|null{
 try{return localStorage.getItem(key)}catch{return null}
}

export function quizSlot(mode:QuizMode,levelId?:string,examId?:string):string{
 if(mode==='level'&&levelId)return 'level:'+levelId;
 if(mode==='exam'&&examId)return 'exam:'+examId;
 return mode;
}

export function answeredCount(results:(Result|null)[]):number{
 let n=0;
 for(const r of results)if(r)n++;
 return n;
}

export function cleanDrafts(drafts?:Record<string,string>):Record<string,string>|undefined{
 if(!drafts)return undefined;
 const out:Record<string,string>={};
 let count=0;
 for(const [k,v] of Object.entries(drafts)){
  if(typeof v==='string'&&v.trim()){out[k]=v;count++}
 }
 return count?out:undefined;
}

function validResults(arr:unknown,len:number):(Result|null)[]{
 if(!Array.isArray(arr))return Array.from({length:len},()=>null);
 return Array.from({length:len},(_,i)=>{
  const r=arr[i];
  if(!r||typeof r!=='object')return null;
  const {correct,given}=r as {correct?:unknown;given?:unknown};
  return typeof correct==='boolean'&&typeof given==='string'?{correct,given}:null;
 });
}

export function parseQuizMap(raw:string|null):SavedQuizMap{
 if(!raw)return {};
 try{
  const parsed=JSON.parse(raw) as unknown;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const out:SavedQuizMap={};
  for(const [slot,val] of Object.entries(parsed as Record<string,unknown>)){
   if(!val||typeof val!=='object')continue;
   const s=val as Partial<SavedQuizSession>;
   if(!Array.isArray(s.items)||!s.items.length)continue;
   const items=s.items.filter((x):x is SavedQuizItem=>!!x&&typeof x.id==='string'&&Array.isArray(x.order));
   if(!items.length)continue;
   const mode:QuizMode=s.mode==='level'||s.mode==='exam'||s.mode==='mistakes'||s.mode==='random'?s.mode:'random';
   out[slot]={
    slot,
    mode,
    levelId:typeof s.levelId==='string'?s.levelId:undefined,
    examId:typeof s.examId==='string'?s.examId:undefined,
    label:typeof s.label==='string'?s.label:slot,
    items,
    index:typeof s.index==='number'?Math.min(Math.max(0,Math.floor(s.index)),items.length-1):0,
    results:validResults(s.results,items.length),
    drafts:cleanDrafts(s.drafts),
    updatedAt:typeof s.updatedAt==='number'?s.updatedAt:0,
   };
  }
  return out;
 }catch{return {}}
}

export function writeQuizSession(storageKey:string,session:SavedQuizSession){
 const map=parseQuizMap(readRawQuizStore(storageKey));
 map[session.slot]={...session,drafts:cleanDrafts(session.drafts),updatedAt:Date.now()};
 const entries=Object.entries(map).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,MAX_SLOTS);
 const trimmed=Object.fromEntries(entries);
 try{localStorage.setItem(storageKey,JSON.stringify(trimmed))}catch{}
 noteLocalWrite(storageKey);
 window.dispatchEvent(new Event(QUIZ_SESSION_EVENT));
}

export function removeQuizSession(storageKey:string,slot:string){
 const map=parseQuizMap(readRawQuizStore(storageKey));
 if(!(slot in map))return;
 delete map[slot];
 try{
  if(Object.keys(map).length)localStorage.setItem(storageKey,JSON.stringify(map));
  else localStorage.removeItem(storageKey);
 }catch{}
 noteLocalWrite(storageKey);
 window.dispatchEvent(new Event(QUIZ_SESSION_EVENT));
}

export function parseLazyQuiz(raw:string|null):SavedLazyQuiz|null{
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw) as Partial<SavedLazyQuiz>|null;
  if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.items)||!parsed.items.length)return null;
  const items=parsed.items.filter((x):x is {id:string;subject:string;order:number[]}=>!!x&&typeof x.id==='string'&&typeof x.subject==='string'&&Array.isArray(x.order));
  if(!items.length)return null;
  const shares:Record<string,number>={};
  if(parsed.shares&&typeof parsed.shares==='object'){
   for(const [k,v] of Object.entries(parsed.shares))if(typeof v==='number')shares[k]=v;
  }
  return {
   level:typeof parsed.level==='number'?parsed.level:0,
   items,
   index:typeof parsed.index==='number'?Math.min(Math.max(0,Math.floor(parsed.index)),items.length-1):0,
   results:validResults(parsed.results,items.length),
   drafts:cleanDrafts(parsed.drafts),
   shares,
   updatedAt:typeof parsed.updatedAt==='number'?parsed.updatedAt:0,
  };
 }catch{return null}
}

export function writeLazyQuiz(storageKey:string,session:SavedLazyQuiz){
 const payload:SavedLazyQuiz={...session,drafts:cleanDrafts(session.drafts),updatedAt:Date.now()};
 try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch{}
 noteLocalWrite(storageKey);
 window.dispatchEvent(new Event(QUIZ_SESSION_EVENT));
}

export function removeLazyQuiz(storageKey:string){
 try{
  if(localStorage.getItem(storageKey)===null)return;
  localStorage.removeItem(storageKey);
 }catch{return}
 noteLocalWrite(storageKey);
 window.dispatchEvent(new Event(QUIZ_SESSION_EVENT));
}
