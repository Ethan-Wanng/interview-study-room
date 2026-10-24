import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import LearnClient from './learn-client';
export const dynamic='force-dynamic';
export default async function Learn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <LearnClient username={user.is_guest?'':user.username}/>}
