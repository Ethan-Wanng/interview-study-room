import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import PracticeClient from './practice-client';
export const dynamic='force-dynamic';
export default async function Practice(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <PracticeClient username={user.is_guest?'':user.username}/>}
