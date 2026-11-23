'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { useI18n } from './i18n';
import { getGeminiAutoProxy } from '../ai/gemini-proxy-pref';
import {
 loadJdBgTasks,
 notifyJdTaskDone,
 removeJdBgTask,
 subscribeJdBgTasks,
 upsertJdBgTask,
 type JdBgTask,
 type JdTaskDoneEvent,
} from '@/lib/jd-bg-tasks';
import type { JdLiveProgress, JdStageKey } from '@/lib/jd-research-types';

const STAGE_LABEL_ZH: Record<JdStageKey, string> = {
 profile: '考点画像',
 roadmap: '复习路径',
 quizzes: '路径学习题',
 questions: '面试题库',
};

const STAGE_LABEL_EN: Record<JdStageKey, string> = {
 profile: 'Profile',
 roadmap: 'Roadmap',
 quizzes: 'Quizzes',
 questions: 'Questions',
};

export default function JdBgWatcher() {
 const { locale } = useI18n();
 const L = (zh: string, en: string) => (locale === 'en' ? en : zh);
 const [tasks, setTasks] = useState<JdBgTask[]>([]);
 const [doneBanner, setDoneBanner] = useState<JdTaskDoneEvent | null>(null);
 const [now, setNow] = useState(0);
 const [onResearchPage, setOnResearchPage] = useState(false);
 const pollingRef = useRef<Set<string>>(new Set());

 useEffect(() => {
  const sync = () => {
   setTasks(loadJdBgTasks());
   setOnResearchPage(window.location.pathname === '/interview/jd-research');
  };
  sync();
  const unsub = subscribeJdBgTasks(sync);
  window.addEventListener('popstate', sync);
  return () => {
   unsub();
   window.removeEventListener('popstate', sync);
  };
 }, []);

 useEffect(() => {
  if (!tasks.length) return;
  setNow(Date.now());
  const clock = window.setInterval(() => setNow(Date.now()), 1000);

  const pollOne = async (task: JdBgTask) => {
   if (pollingRef.current.has(task.recordId)) return;
   pollingRef.current.add(task.recordId);
   try {
    const qs = new URLSearchParams({
     id: task.interactionId,
     sig: task.sig,
     rid: task.recordId,
     geminiProxy: getGeminiAutoProxy() ? '1' : '0',
    });
    if (task.cacheKey && task.ckSig) {
     qs.set('ck', task.cacheKey);
     qs.set('ckSig', task.ckSig);
    }
    const r = await fetch('/api/jd-research?' + qs.toString(), { cache: 'no-store' });
    if (!r.ok) {
     if (r.status === 401 || r.status === 403 || r.status === 404) {
      removeJdBgTask(task.recordId);
     }
     return;
    }
    const d = (await r.json()) as {
     id?: string;
     sig?: string;
     status?: string;
     progress?: JdLiveProgress;
     report?: { roleTitle?: string } | null;
     error?: string;
    };
    if (d.status === 'in_progress') {
     const nextId = d.id || task.interactionId;
     const nextSig = d.sig || task.sig;
     const nextStage = d.progress?.activeKey || task.stageKey || 'profile';
     const nextTitle = d.progress?.roleTitle || task.title;
     if (
      nextId !== task.interactionId ||
      nextSig !== task.sig ||
      nextStage !== task.stageKey ||
      nextTitle !== task.title
     ) {
      upsertJdBgTask({
       ...task,
       interactionId: nextId,
       sig: nextSig,
       stageKey: nextStage,
       title: nextTitle,
      });
     }
     return;
    }
    if (d.status === 'completed') {
     removeJdBgTask(task.recordId);
     const ev: JdTaskDoneEvent = {
      recordId: task.recordId,
      title: d.report?.roleTitle || task.title,
      status: 'completed',
     };
     notifyJdTaskDone(ev);
     setDoneBanner(ev);
    } else if (d.status === 'failed' || d.status === 'cancelled') {
     removeJdBgTask(task.recordId);
     const ev: JdTaskDoneEvent = {
      recordId: task.recordId,
      title: task.title,
      status: 'error',
      error: d.error || L('专题生成中断', 'Generation interrupted'),
     };
     notifyJdTaskDone(ev);
     setDoneBanner(ev);
    }
   } catch {
    // Transient network error: retry next tick
   } finally {
    pollingRef.current.delete(task.recordId);
   }
  };

  const runAll = () => {
   const current = loadJdBgTasks();
   for (const t of current) void pollOne(t);
  };
  runAll();
  const timer = window.setInterval(runAll, 3500);
  return () => {
   window.clearInterval(clock);
   window.clearInterval(timer);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [tasks.length]);

 const showRunning = tasks.length > 0 && !onResearchPage;
 if (!showRunning && !doneBanner) return null;

 const first = tasks[0];
 const secs = first && now ? Math.max(0, Math.floor((now - first.createdAt) / 1000)) : 0;
 const stKey: JdStageKey = first?.stageKey || 'profile';
 const stLabel = locale === 'en' ? STAGE_LABEL_EN[stKey] : STAGE_LABEL_ZH[stKey];

 return (
  <div className="jd-bg-float" role="status" aria-live="polite">
   {showRunning && first && (
    <a href={`/interview/jd-research?id=${encodeURIComponent(first.recordId)}`} className="jd-bg-pill">
     <Loader2 size={14} className="ai-spin" />
     <span>
      {L(
       `专题生成中 · ${stLabel} · ${secs}s`,
       `Generating · ${stLabel} · ${secs}s`,
      )}
     </span>
    </a>
   )}
   {doneBanner && (
    <div className={'jd-bg-pill done' + (doneBanner.status === 'error' ? ' err' : '')}>
     {doneBanner.status === 'completed' ? (
      <>
       <CheckCircle2 size={14} />
       <span className="jd-bg-title">{doneBanner.title}</span>
       <a href={`/learn/jd-special?id=${encodeURIComponent(doneBanner.recordId)}`} className="jd-bg-act">
        {L('去学习', 'Learn')}
        <ArrowUpRight size={12} />
       </a>
       <a href={`/interview/jd-research?id=${encodeURIComponent(doneBanner.recordId)}`} className="jd-bg-act">
        {L('看报告', 'Report')}
       </a>
      </>
     ) : (
      <span>{doneBanner.error || L('专题生成失败', 'Generation failed')}</span>
     )}
     <button
      type="button"
      className="jd-bg-close"
      aria-label={L('关闭', 'Dismiss')}
      onClick={() => setDoneBanner(null)}
     >
      <X size={13} />
     </button>
    </div>
   )}
  </div>
 );
}
