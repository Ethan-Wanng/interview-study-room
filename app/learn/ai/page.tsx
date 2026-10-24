import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {aiInterviewQuestions} from '@/content/ai-interview';
import AiJourney from './ai-journey';
export const dynamic='force-dynamic';
const interviews=aiInterviewQuestions.map(q=>({id:q.id,title:q.title,blocks:q.blocks}));
export default async function AiLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <AiJourney username={user.is_guest?'':user.username} interviews={interviews}/>}
