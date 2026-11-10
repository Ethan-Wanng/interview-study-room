import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import AiSupportJourney from './ai-support-journey';

export const dynamic='force-dynamic';

export default async function AiSupportLearnPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login');
 return <AiSupportJourney username={user.is_guest?'':user.username}/>;
}
