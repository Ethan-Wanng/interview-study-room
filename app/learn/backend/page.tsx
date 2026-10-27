import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import bank from '@/content/questions.json';
import BackendJourney from './backend-journey';
export const dynamic='force-dynamic';
// 只把后端通用的面试题（标题 + 参考回答）传给页面，供关卡底部和答题后对照阅读。
const interviews=bank.questions.filter(q=>q.track==='backend').map(q=>({id:q.id,title:q.title,blocks:q.blocks as {type:string;text:string}[]}));
export default async function BackendLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <BackendJourney username={user.is_guest?'':user.username} interviews={interviews}/>}
