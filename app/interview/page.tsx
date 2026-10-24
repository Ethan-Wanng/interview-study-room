import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {studyCatalog} from '@/db/catalog';
import StudyClient from '../study-client';
export const dynamic='force-dynamic';
export default async function Interview(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <StudyClient username={user.is_guest?'':user.username} bank={await studyCatalog()}/>}
