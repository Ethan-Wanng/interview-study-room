import {Suspense} from 'react';
import {headers} from 'next/headers';
import {sessionUser} from '@/lib/site-auth';
import {studyDb} from '@/db/study';
import {PLAYGROUND_LANG_IDS,type PlaygroundLang} from '@/lib/playground-bridge';
import PlaygroundClient from './playground-client';

export const dynamic='force-dynamic';

const isPlaygroundLang=(v:string):v is PlaygroundLang=>(PLAYGROUND_LANG_IDS as readonly string[]).includes(v);

export default async function PlaygroundPage({
 searchParams,
}:{
 searchParams:Promise<{s?:string;lang?:string;example?:string;launch?:string}>;
}){
 const [user,sp]=await Promise.all([
  sessionUser(new Headers(await headers())).catch(()=>null),
  searchParams,
 ]);
 const username=user&&!user.is_guest?user.username:'';
 const shareId=typeof sp.s==='string'?sp.s.trim():'';
 const reqLang=typeof sp.lang==='string'&&isPlaygroundLang(sp.lang)?sp.lang:undefined;
 const reqEx=typeof sp.example==='string'?sp.example.trim():undefined;
 const reqLaunch=typeof sp.launch==='string'&&/^[A-Za-z0-9_-]{4,24}$/.test(sp.launch.trim())?sp.launch.trim():undefined;
 let initialShared:{id:string;lang:PlaygroundLang;code:string;title:string}|null=null;
 let initialError='';

 if(shareId){
  if(/^[A-Za-z0-9_-]{4,24}$/.test(shareId)){
   try{
    const row=await studyDb()
     .prepare('SELECT id,lang,code,title FROM playground_snippets WHERE id=?')
     .bind(shareId)
     .first<{id:string;lang:string;code:string;title:string}>();
    if(row&&isPlaygroundLang(row.lang)){
     initialShared={id:row.id,lang:row.lang,code:row.code,title:row.title};
    }else{
     initialError='找不到该分享编号对应的代码片段，已为你打开默认示例。';
    }
   }catch{
    // 表尚未初始化或临时不可用时静默回退到默认示例
   }
  }else{
   initialError='分享链接格式无效，已为你打开默认示例。';
  }
 }

 return (
  <Suspense fallback={null}>
   <PlaygroundClient
    username={username}
    initialShared={initialShared}
    initialLang={reqLang}
    initialExample={reqEx}
    initialLaunchId={reqLaunch}
    initialError={initialError}
   />
  </Suspense>
 );
}
