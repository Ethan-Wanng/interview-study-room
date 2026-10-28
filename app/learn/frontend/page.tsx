import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {frontendInterviewQuestions} from '@/content/frontend-interview';
import FrontendJourney from './frontend-journey';
export const dynamic='force-dynamic';
const interviews=frontendInterviewQuestions.map(q=>({id:q.id,title:q.title,blocks:q.blocks}));
export default async function FrontendLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <FrontendJourney username={user.is_guest?'':user.username} interviews={interviews}/>}
