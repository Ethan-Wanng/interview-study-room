import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import ArchitectClient from './architect-client';

export const dynamic='force-dynamic';

export default async function ArchitectPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login?return_to=%2Finterview%2Farchitect');
 return <ArchitectClient username={user.is_guest?'':user.username}/>;
}
