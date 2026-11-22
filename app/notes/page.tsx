import {Suspense} from 'react';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser} from '@/lib/site-auth';
import NotesClient from './notes-client';

export const dynamic='force-dynamic';

export default async function NotesPage(){
 const user=await sessionUser(new Headers(await headers()));
 if(!user)redirect('/login');
 return (
  <Suspense fallback={null}>
   <NotesClient username={user.is_guest?'':user.username}/>
  </Suspense>
 );
}
