import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import bank from '@/content/questions.json';
import PythonJourney from './python-journey';
export const dynamic='force-dynamic';
// 只把 Python 章节的面试题（标题 + 参考回答）传给页面，供关卡底部和答题后对照阅读。题库里暂时还没有 Python 面试题。
const interviews=bank.questions.filter(q=>q.category==='Python').map(q=>({id:q.id,title:q.title,blocks:q.blocks as {type:string;text:string}[]}));
export default async function PythonLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <PythonJourney username={user.is_guest?'':user.username} interviews={interviews}/>}
