import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { sessionUser } from '@/lib/site-auth';
import { currentAdmin } from '@/lib/admin-auth';
import { getDailyJdUsed } from '@/lib/jd-daily-limit';
import { builtInSubjects } from '@/db/catalog';
import SiteHeader from '../../components/site-header';
import JdResearchClient from './jd-research-client';

export const dynamic = 'force-dynamic';

export default async function JdResearchPage() {
 const hdrs = new Headers(await headers());
 const user = await sessionUser(hdrs);
 if (!user) redirect('/login?return_to=%2Finterview%2Fjd-research');
 if (user.is_guest) {
  return (
   <div className="ai-shell">
    <SiteHeader active="interview" username="" />
    <main className="ai-main" style={{ maxWidth: 560, margin: '48px auto' }}>
     <section className="ai-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <Lock size={28} style={{ color: 'var(--primary)' }} />
      <h1 style={{ margin: 0, fontSize: 19 }}>游客不支持 JD / 面经深度调研</h1>
      <a href="/login?return_to=%2Finterview%2Fjd-research" className="button primary">
       登录正式账号
      </a>
     </section>
    </main>
   </div>
  );
 }
 const [admin, dailyUsed] = await Promise.all([
  currentAdmin(hdrs).catch(() => null),
  getDailyJdUsed(user.id).catch(() => 0),
 ]);
 const subjects = [
  { id: 'mine', name: '我的题库', nameEn: 'My questions' },
  ...builtInSubjects.map(s => ({ id: s.id, name: s.name, nameEn: s.nameEn })),
 ];
 return (
  <JdResearchClient
   username={user.username}
   member={true}
   subjects={subjects}
   dailyLimit={admin ? null : 1}
   dailyUsed={dailyUsed}
  />
 );
}
