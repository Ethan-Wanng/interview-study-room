import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import WordsClient from './words-client';
export const dynamic='force-dynamic';
export default async function EnglishWords(){const user=await sessionUser(new Headers(await headers()));if(!user)redirect('/login');return <WordsClient username={user.is_guest?'':user.username}/>}
