import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {listAiInterviewRecords} from '@/lib/ai-interview-records';
import type {JdResearchReport} from '@/lib/jd-research-types';
import JdSpecialClient,{type JdSpecialTopic} from './jd-special-client';

export const dynamic='force-dynamic';

export default async function JdSpecialPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login?return_to=%2Flearn%2Fjd-special');
 const rows=await listAiInterviewRecords<{report?:JdResearchReport|null}>(user.id,'jd-research');
 const topics:JdSpecialTopic[]=rows
  .filter(r=>r.status==='completed'&&r.payload?.report&&Array.isArray(r.payload.report.questions)&&r.payload.report.questions.length>0)
  .map(r=>({
   id:r.id,
   title:r.payload.report!.roleTitle||r.title,
   updatedAt:r.updatedAt,
   report:r.payload.report!,
  }));
 return <JdSpecialClient username={user.is_guest?'':user.username} topics={topics}/>;
}
