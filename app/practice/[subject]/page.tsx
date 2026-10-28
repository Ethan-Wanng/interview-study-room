import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {SubjectTraining} from '../training-hub';
import {practiceSubjects} from '../subjects';
export const dynamic='force-dynamic';
export default async function SubjectPractice({params}:{params:Promise<{subject:string}>}){const {subject}=await params;const s=practiceSubjects.find(x=>x.id===subject);if(!s)notFound();
 const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <SubjectTraining username={user.is_guest?'':user.username} subject={s}/>}
