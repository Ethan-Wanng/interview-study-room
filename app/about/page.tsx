import {Suspense} from 'react';
import {headers} from 'next/headers';
import {sessionUser} from '@/lib/site-auth';
import {studyCatalog} from '@/db/catalog';
import {learnSubjects} from '@/app/learn/subjects';
import {APP_VERSION,RELEASES} from '@/lib/releases';
import original from '@/content/questions.json';
import {aiInterviewQuestions} from '@/content/ai-interview';
import {frontendInterviewQuestions} from '@/content/frontend-interview';
import {practiceQuestions} from '@/content/practice';
import AboutClient,{type AboutStats} from './about-client';
import {PROJECT_STARTED} from '@/lib/project';

export const dynamic='force-dynamic';

function calcDaysActive(){
 const bjDayMs=Math.floor((Date.now()+8*3_600_000)/86_400_000)*86_400_000;
 const startedMs=Date.UTC(2026,8,11);
 return Math.max(1,Math.floor((bjDayMs-startedMs)/86_400_000)+1);
}

export default async function AboutPage(){
 const [user,bank]=await Promise.all([
  sessionUser(new Headers(await headers())).catch(()=>null),
  studyCatalog().catch(()=>null),
 ]);
 const username=user&&!user.is_guest?user.username:'';
 const daysActive=calcDaysActive();
 const fallbackCount=original.questions.length+aiInterviewQuestions.length+frontendInterviewQuestions.length+practiceQuestions.length;
 const interviewCount=bank?(bank.questions.length+practiceQuestions.length):fallbackCount;

 const stats:AboutStats={
  startedAt:PROJECT_STARTED,
  daysActive,
  subjectsCount:learnSubjects.length,
  levelsCount:learnSubjects.reduce((sum,s)=>sum+s.levels,0),
  interviewCount,
  releaseCount:RELEASES.length,
  latestVersion:APP_VERSION,
 };

 return (
  <Suspense fallback={null}>
   <AboutClient username={username} stats={stats}/>
  </Suspense>
 );
}
