import {Suspense} from 'react';
import {headers} from 'next/headers';
import {sessionUser} from '@/lib/site-auth';
import LocalBridgeClient from './local-bridge-client';

export const dynamic='force-dynamic';

export default async function LocalBridgePage(){
 const user=await sessionUser(new Headers(await headers())).catch(()=>null);
 const username=user&&!user.is_guest?user.username:'';
 return (
  <Suspense fallback={null}>
   <LocalBridgeClient username={username}/>
  </Suspense>
 );
}
