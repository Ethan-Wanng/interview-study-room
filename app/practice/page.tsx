import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import TrainingHub from './training-hub';
import {practiceSubjects} from './subjects';
export const dynamic='force-dynamic';
export default async function Practice(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <TrainingHub username={user.is_guest?'':user.username} subjects={practiceSubjects}/>}
