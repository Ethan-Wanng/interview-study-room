import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {listAiInterviewRecords} from '@/lib/ai-interview-records';
import {countJdStudyQuizzes,type JdResearchReport} from '@/lib/jd-research-types';
import LearnClient,{type JdTopicSummary} from './learn-client';

export const dynamic='force-dynamic';

export default async function Learn(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login');
 const rows=await listAiInterviewRecords<{report?:JdResearchReport|null}>(user.id,'jd-research');
 const jdTopics:JdTopicSummary[]=rows
  .filter(r=>(r.status==='completed'&&r.payload?.report&&countJdStudyQuizzes(r.payload.report)>0)||r.status==='running')
  .map(r=>({
   id:r.id,
   title:r.payload?.report?.roleTitle||r.title,
   subtitle:r.status==='running'?'生成中':[r.payload?.report?.inferredLevel,r.payload?.report?.prepDays].filter(Boolean).join(' · '),
   total:r.status==='running'?0:countJdStudyQuizzes(r.payload?.report),
   running:r.status==='running',
  }));
 return <LearnClient username={user.is_guest?'':user.username} jdTopics={jdTopics}/>;
}
