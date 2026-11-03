import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import ProjectJourney from './project-journey';
export const dynamic='force-dynamic';
export default async function ProjectLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <ProjectJourney username={user.is_guest?'':user.username}/>}
