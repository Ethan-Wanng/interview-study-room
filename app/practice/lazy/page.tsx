import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import LazyQuiz from '../lazy-quiz';
import {practiceSubjects} from '../subjects';
export const dynamic='force-dynamic';
export default async function LazyPractice(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');
 const subjects=practiceSubjects.map(s=>({id:s.id,name:s.name,nameEn:s.nameEn,icon:s.icon,finalSize:s.exams.find(e=>e.kind==='final')?.count??0}));
 return <LazyQuiz username={user.is_guest?'':user.username} subjects={subjects}/>}
