import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import AiClient from './ai-client';
export const dynamic='force-dynamic';
export default async function AiSpace(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <AiClient username={user.is_guest?'':user.username}/>}
