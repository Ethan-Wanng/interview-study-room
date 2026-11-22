import {Suspense} from 'react';
import {headers} from 'next/headers';
import {sessionUser} from '@/lib/site-auth';
import ReleasesClient from './releases-client';

export const dynamic='force-dynamic';

export default async function ReleasesPage(){
 const user=await sessionUser(new Headers(await headers())).catch(()=>null);
 const username=user&&!user.is_guest?user.username:'';
 return (
  <Suspense fallback={null}>
   <ReleasesClient username={username}/>
  </Suspense>
 );
}
