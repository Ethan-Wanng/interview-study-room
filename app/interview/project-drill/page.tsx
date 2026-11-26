import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { sessionUser } from '@/lib/site-auth';
import { listAiInterviewRecords } from '@/lib/ai-interview-records';
import type { AiTokenUsage, JdInputKind, JdResearchReport } from '@/lib/jd-research-types';
import SiteHeader from '../../components/site-header';
import ProjectDrillClient, { type ProjectDrillTopic } from './project-drill-client';

export const dynamic = 'force-dynamic';

function pickStr(v: string | string[] | undefined): string {
 return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function ProjectDrillPage({
 searchParams,
}: {
 searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
 const sp = searchParams ? await searchParams : {};
 const idParam = pickStr(sp.id);
 const projRaw = pickStr(sp.proj);
 const tabParam = pickStr(sp.tab);
 const qRaw = pickStr(sp.q);
 const autostartParam = pickStr(sp.autostart);

 const qsOut = new URLSearchParams();
 if (idParam) qsOut.set('id', idParam);
 if (projRaw) qsOut.set('proj', projRaw);
 if (tabParam) qsOut.set('tab', tabParam);
 if (qRaw) qsOut.set('q', qRaw);
 if (autostartParam) qsOut.set('autostart', autostartParam);
 const returnTo = '/interview/project-drill' + (qsOut.toString() ? `?${qsOut.toString()}` : '');

 const user = await sessionUser(new Headers(await headers()));
 if (!user) redirect('/login?return_to=' + encodeURIComponent(returnTo));

 if (user.is_guest) {
  return (
   <div className="ai-shell">
    <SiteHeader active="interview" username="" />
    <main className="ai-main" style={{ maxWidth: 560, margin: '48px auto' }}>
     <section
      className="ai-card"
      style={{
       padding: 28,
       display: 'flex',
       flexDirection: 'column',
       alignItems: 'center',
       gap: 14,
       textAlign: 'center',
      }}
     >
      <Lock size={28} style={{ color: 'var(--primary)' }} />
      <h1 style={{ margin: 0, fontSize: 19 }}>游客不支持项目深挖预判</h1>
      <a href={'/login?return_to=' + encodeURIComponent(returnTo)} className="button primary">
       登录正式账号
      </a>
     </section>
    </main>
   </div>
  );
 }

 const rows = await listAiInterviewRecords<{
  kind?: JdInputKind;
  source?: string;
  usage?: AiTokenUsage;
  partialReport?: JdResearchReport | null;
  report?: JdResearchReport | null;
 }>(user.id, 'jd-research');

 const topics: ProjectDrillTopic[] = rows
  .map(r => {
   const rep = r.payload?.report || r.payload?.partialReport;
   if (!rep?.resume?.projects?.length) return null;
   return {
    id: r.id,
    title: rep.resume.targetRole || rep.roleTitle || r.title,
    updatedAt: r.updatedAt,
    report: rep,
   };
  })
  .filter((x): x is ProjectDrillTopic => x !== null);

 const projIdx = Number(projRaw);
 const qIdx = Number(qRaw);

 return (
  <ProjectDrillClient
   username={user.username}
   topics={topics}
   initialId={idParam}
   initialProj={Number.isInteger(projIdx) && projIdx >= 0 ? projIdx : 0}
   initialTab={tabParam === 'practice' ? 'practice' : 'lessons'}
   initialQ={Number.isInteger(qIdx) && qIdx >= 0 ? qIdx : 0}
   autoStart={autostartParam === '1'}
  />
 );
}
