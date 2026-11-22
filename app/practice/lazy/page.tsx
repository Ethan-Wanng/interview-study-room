import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import type {Exam} from '@/content/journey';
import {goExams} from '@/content/exams/go';
import {rustExams} from '@/content/exams/rust';
import {pythonExams} from '@/content/exams/python';
import {aiExams} from '@/content/exams/ai';
import {backendExams} from '@/content/exams/backend';
import {frontendExams} from '@/content/exams/frontend';
import {englishExams} from '@/content/exams/english';
import LazyQuiz from '../lazy-quiz';
import {practiceSubjects} from '../subjects';
export const dynamic='force-dynamic';
const exams:Record<string,Exam[]>={go:goExams,rust:rustExams,python:pythonExams,ai:aiExams,backend:backendExams,frontend:frontendExams,english:englishExams};
// 只把各难度题库的题数传给浏览器：四个阶段训练按入门到专家排列，最后是最终考试。
const sizes=(id:string)=>{const ex=exams[id]??[];return [...ex.filter(e=>e.kind==='training').map(e=>e.quiz.length),ex.find(e=>e.kind==='final')?.quiz.length??0]};
export default async function LazyPractice(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');
 const subjects=practiceSubjects.map(s=>({id:s.id,name:s.name,nameEn:s.nameEn,icon:s.icon,space:s.space,sizes:sizes(s.id)}));
 return <LazyQuiz username={user.is_guest?'':user.username} subjects={subjects}/>}
