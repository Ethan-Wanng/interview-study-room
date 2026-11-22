import type {ComponentType} from 'react';
import {spoken,ttsHash} from '@/app/ai/animations/sound';
import {fromStory,type Story} from '@/app/ai/animations/story';
import {lazyAnimation} from '@/app/ai/animations/lazy/engine';
import type {Animation,Cue} from '@/app/ai/animations/types';

export type DirectorScene={
 index:number;
 hash:string;
 caption:string;
 raw:string;
 defaultSpoken:string;
 sceneMs:number;
 cue?:Cue;
};

export type DirectorAnimation={
 id:string;
 cat:string;
 catLabel:string;
 subject:string;
 kind:string;
 title:string;
 summary:string;
 icon:string;
 continuous:boolean;
 Visual:ComponentType<{step:number}>;
 scenes:DirectorScene[];
};

export type DirectorCategory={
 cat:string;
 subject:string;
 kind:string;
 label:string;
 count:number;
 sceneCount:number;
};

export type DirectorCatalogData={
 categories:DirectorCategory[];
 animations:DirectorAnimation[];
 totalScenes:number;
 uniqueLines:number;
};

export function cleanForQwen(text:string):string{
 return text
  .replace(/\s+([，。？！；：、])/g,'$1')
  .replace(/([，。？！；：])\s+/g,'$1')
  .replace(/\s{2,}/g,' ')
  .trim();
}

const storyList=(g:Record<string,Story>,level:string):Animation[]=>
 Object.entries(g).map(([id,s])=>fromStory(id,level,s));

export async function loadDirectorCatalog():Promise<DirectorCatalogData>{
 const [
  {animations},
  {goAnimations},
  {backendAnimations},
  {frontendAnimations},
  {stories},
  {goStories},
  {backendStories},
  {dbStories},
  {frontendStories},
  {aiLazy},
  {goLazy},
  {backendLazy},
  {frontendLazy},
 ]=await Promise.all([
  import('@/app/ai/animations/index'),
  import('@/app/ai/animations/go-lessons'),
  import('@/app/ai/animations/be-lessons'),
  import('@/app/ai/animations/fe-lessons'),
  import('@/app/ai/animations/stories/index'),
  import('@/app/ai/animations/stories/go'),
  import('@/app/ai/animations/stories/backend'),
  import('@/app/ai/animations/stories/db'),
  import('@/app/ai/animations/stories/frontend'),
  import('@/app/ai/animations/lazy/ai'),
  import('@/app/ai/animations/lazy/go'),
  import('@/app/ai/animations/lazy/backend'),
  import('@/app/ai/animations/lazy/frontend'),
 ]);

 const groups:{cat:string;subject:string;kind:string;label:string;list:Animation[]}[]=[
  {cat:'ai_classroom',subject:'ai',kind:'classroom',label:'AI · 动画课堂',list:animations},
  {cat:'ai_interview',subject:'ai',kind:'interview',label:'AI · 面试题动画',list:storyList(stories,'ai')},
  {cat:'ai_lazy',subject:'ai',kind:'lazy',label:'AI · 懒人故事',list:aiLazy.map(lazyAnimation)},
  {cat:'go_classroom',subject:'go',kind:'classroom',label:'Go · 动画课堂',list:goAnimations},
  {cat:'go_interview',subject:'go',kind:'interview',label:'Go · 面试题动画',list:storyList(goStories,'go')},
  {cat:'go_lazy',subject:'go',kind:'lazy',label:'Go · 懒人故事',list:goLazy.map(lazyAnimation)},
  {cat:'be_classroom',subject:'backend',kind:'classroom',label:'后端 · 动画课堂',list:backendAnimations},
  {cat:'be_interview',subject:'backend',kind:'interview',label:'后端 · 面试题动画',list:[...storyList(backendStories,'backend'),...storyList(dbStories,'db')]},
  {cat:'be_lazy',subject:'backend',kind:'lazy',label:'后端 · 懒人故事',list:backendLazy.map(lazyAnimation)},
  {cat:'fe_classroom',subject:'frontend',kind:'classroom',label:'前端 · 动画课堂',list:frontendAnimations},
  {cat:'fe_interview',subject:'frontend',kind:'interview',label:'前端 · 面试题动画',list:storyList(frontendStories,'frontend')},
  {cat:'fe_lazy',subject:'frontend',kind:'lazy',label:'前端 · 懒人故事',list:frontendLazy.map(lazyAnimation)},
 ];

 // Compute SHA-256 hash once per unique spoken line.
 const uniqueRaws=new Set<string>();
 for(const g of groups){
  for(const a of g.list){
   for(const sc of a.scenes){
    uniqueRaws.add(sc.speech??sc.caption);
   }
  }
 }
 const hashCache=new Map<string,string>();
 await Promise.all([...uniqueRaws].map(async raw=>{
  hashCache.set(raw,await ttsHash(raw));
 }));

 const outAnimations:DirectorAnimation[]=[];
 const categories:DirectorCategory[]=[];
 let totalScenes=0;

 for(const g of groups){
  let sceneCount=0;
  for(const a of g.list){
   const scenes:DirectorScene[]=a.scenes.map((sc,index)=>{
    const raw=sc.speech??sc.caption;
    const hash=hashCache.get(raw)??'';
    sceneCount++;
    totalScenes++;
    return {
     index,
     hash,
     caption:sc.caption,
     raw,
     defaultSpoken:cleanForQwen(spoken(raw)),
     sceneMs:Math.round(sc.ms||4000),
     cue:sc.cue,
    };
   });
   outAnimations.push({
    id:a.id,
    cat:g.cat,
    catLabel:g.label,
    subject:g.subject,
    kind:g.kind,
    title:a.title||a.id,
    summary:a.summary||'',
    icon:a.icon||'🎬',
    continuous:Boolean(a.continuous),
    Visual:a.Visual,
    scenes,
   });
  }
  categories.push({
   cat:g.cat,
   subject:g.subject,
   kind:g.kind,
   label:g.label,
   count:g.list.length,
   sceneCount,
  });
 }

 return {
  categories,
  animations:outAnimations,
  totalScenes,
  uniqueLines:uniqueRaws.size,
 };
}
