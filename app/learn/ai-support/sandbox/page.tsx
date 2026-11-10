import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import AiSupportSandboxClient from './sandbox-client';

export const dynamic='force-dynamic';

export default async function AiSupportSandboxPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login');
 return <AiSupportSandboxClient username={user.is_guest?'':user.username}/>;
}
