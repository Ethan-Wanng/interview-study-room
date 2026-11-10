import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import {studyCatalog} from '@/db/catalog';
import {levelLinks,courseOfTrack} from '@/lib/interview-links';
import InterviewClient from './interview-client';
export const dynamic='force-dynamic';
// 题库来自数据库，按“题目数量 + 第一题”缓存算好的链接，题库没变就不重算。
let cache:{key:string;links:ReturnType<typeof levelLinks>}|null=null;
export default async function Interview(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');
 const bank=await studyCatalog(),key=bank.questions.length+':'+(bank.questions[0]?.id??'');
 if(cache?.key!==key)cache={key,links:levelLinks(bank.questions)};
 return <InterviewClient username={user.is_guest?'':user.username} member={!user.is_guest} bank={bank} links={cache.links} courses={courseOfTrack}/>}
