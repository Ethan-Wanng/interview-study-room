import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import EnglishJourney from './english-journey';
export const dynamic='force-dynamic';
export default async function EnglishLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <EnglishJourney username={user.is_guest?'':user.username}/>}
