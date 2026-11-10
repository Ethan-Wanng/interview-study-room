import {Suspense} from 'react';
import {headers} from 'next/headers';
import {sessionUser} from '@/lib/site-auth';
import FeedbackClient from './feedback-client';

export const dynamic='force-dynamic';

export default async function FeedbackPage(){
 const user=await sessionUser(new Headers(await headers())).catch(()=>null);
 const username=user&&!user.is_guest?user.username:'';
 return (
  <Suspense fallback={null}>
   <FeedbackClient username={username}/>
  </Suspense>
 );
}
