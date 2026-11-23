import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {Lock} from 'lucide-react';
import {sessionUser} from '@/lib/site-auth';
import {listAiInterviewRecords} from '@/lib/ai-interview-records';
import {countJdStudyQuizzes,type JdInputKind,type JdResearchReport} from '@/lib/jd-research-types';
import type {AntigravityUsage} from '@/lib/antigravity-agent';
import SiteHeader from '../../components/site-header';
import JdSpecialClient,{type JdSpecialTopic} from './jd-special-client';

export const dynamic='force-dynamic';

export default async function JdSpecialPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login?return_to=%2Flearn%2Fjd-special');
 if(user.is_guest){
  return (
   <div className="ai-shell">
    <SiteHeader active="learn" username=""/>
    <main className="ai-main" style={{maxWidth:560,margin:'48px auto'}}>
     <section className="ai-card" style={{padding:28,display:'flex',flexDirection:'column',alignItems:'center',gap:14,textAlign:'center'}}>
      <Lock size={28} style={{color:'var(--primary)'}}/>
      <h1 style={{margin:0,fontSize:19}}>游客不支持 JD 专题学习</h1>
      <a href="/login?return_to=%2Flearn%2Fjd-special" className="button primary">
       登录正式账号
      </a>
     </section>
    </main>
   </div>
  );
 }
 const rows=await listAiInterviewRecords<{kind?:JdInputKind;source?:string;cached?:boolean;stage1Cached?:boolean;durationMs?:number;usage?:AntigravityUsage;report?:JdResearchReport|null}>(user.id,'jd-research');
 const topics:JdSpecialTopic[]=rows
  .filter(r=>r.status==='completed'&&r.payload?.report&&countJdStudyQuizzes(r.payload.report)>0)
  .map(r=>({
   id:r.id,
   title:r.payload.report!.roleTitle||r.title,
   kind:r.payload.kind||'jd',
   source:r.payload.source||'',
   cached:Boolean(r.payload.cached),
   stage1Cached:Boolean(r.payload.stage1Cached),
   durationMs:r.payload.durationMs,
   usage:r.payload.usage,
   updatedAt:r.updatedAt,
   report:r.payload.report!,
  }));
 return <JdSpecialClient username={user.username} topics={topics}/>;
}
