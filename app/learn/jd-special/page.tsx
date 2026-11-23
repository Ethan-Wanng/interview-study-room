import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {listAiInterviewRecords} from '@/lib/ai-interview-records';
import {countJdStudyQuizzes,type JdInputKind,type JdResearchReport} from '@/lib/jd-research-types';
import type {AntigravityUsage} from '@/lib/antigravity-agent';
import JdSpecialClient,{type JdSpecialTopic} from './jd-special-client';

export const dynamic='force-dynamic';

export default async function JdSpecialPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login?return_to=%2Flearn%2Fjd-special');
 const rows=await listAiInterviewRecords<{kind?:JdInputKind;source?:string;cached?:boolean;stage1Cached?:boolean;usage?:AntigravityUsage;report?:JdResearchReport|null}>(user.id,'jd-research');
 const topics:JdSpecialTopic[]=rows
  .filter(r=>r.status==='completed'&&r.payload?.report&&countJdStudyQuizzes(r.payload.report)>0)
  .map(r=>({
   id:r.id,
   title:r.payload.report!.roleTitle||r.title,
   kind:r.payload.kind||'jd',
   source:r.payload.source||'',
   cached:Boolean(r.payload.cached),
   stage1Cached:Boolean(r.payload.stage1Cached),
   usage:r.payload.usage,
   updatedAt:r.updatedAt,
   report:r.payload.report!,
  }));
 return <JdSpecialClient username={user.is_guest?'':user.username} topics={topics}/>;
}
