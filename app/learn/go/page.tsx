import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import bank from '@/content/questions.json';
import GoJourney from './go-journey';
export const dynamic='force-dynamic';
// 只把 Go 章节的面试题（标题 + 参考回答）传给页面，供关卡底部和答题后对照阅读。
const interviews=bank.questions.filter(q=>q.category==='Go').map(q=>({id:q.id,title:q.title,blocks:q.blocks as {type:string;text:string}[]}));
export default async function GoLearn(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <GoJourney username={user.is_guest?'':user.username} interviews={interviews}/>}
