import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser } from '@/lib/site-auth';
import { builtInSubjects } from '@/db/catalog';
import JdResearchClient from './jd-research-client';

export const dynamic = 'force-dynamic';

export default async function JdResearchPage() {
 const user = await sessionUser(new Headers(await headers()));
 if (!user) redirect('/login?return_to=%2Finterview%2Fjd-research');
 const subjects = [
  { id: 'mine', name: '我的题库', nameEn: 'My questions' },
  ...builtInSubjects.map(s => ({ id: s.id, name: s.name, nameEn: s.nameEn })),
 ];
 return (
  <JdResearchClient
   username={user.is_guest ? '' : user.username}
   member={!user.is_guest}
   subjects={subjects}
  />
 );
}
