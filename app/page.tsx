import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import StudyClient from './study-client';
export const dynamic='force-dynamic';
export default async function Home(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <StudyClient username={user.is_guest?'':user.username}/>}
