'use client';
import '../../ai/ai.css';
import '../interview.css';
import '../architect/architect.css';
import '../jd-research/jd-research.css';
import '../../learn/jd-special/jd-special.css';
import './project-drill.css';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
 ArrowLeft,
 ArrowRight,
 BookOpen,
 Check,
 ChevronDown,
 ChevronUp,
 Loader2,
 RotateCcw,
 Sparkles,
 Square,
 Target,
 X,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import SiteHeader from '../../components/site-header';
import CardSideNav from '../../components/card-side-nav';
import AddToNoteButton from '../../components/add-to-note';
import AiDock from '../../ai/ai-dock';
import QuestionCard, { type Item, type Result } from '../../ai/question-card';
import { Annotated } from '../annotated';
import { getGeminiAutoProxy } from '../../ai/gemini-proxy-pref';
import { useI18n } from '../../components/i18n';
import { isLocalDeepReady, LOCAL_PROVIDER_LABEL, useLocalBridgeConfig } from '@/lib/local-bridge-config';
import { streamDeepViaBridge } from '@/lib/local-bridge-client';
import { aiQuizTypes, type AiQuiz } from '@/content/journey';
import type { PlaygroundLang } from '@/lib/playground-bridge';
import type { JdProjectDrill, JdResearchReport } from '@/lib/jd-research-types';

export type ProjectDrillTopic = {
 id: string;
 title: string;
 updatedAt: number;
 report: JdResearchReport;
};

type ViewTab = 'lessons' | 'practice';

type StoredDrillSession = {
 results: Record<string, Result>;
 drafts: Record<string, string>;
 orders: Record<string, number[]>;
 readLessons: Record<string, boolean>;
};

const SESSION_PREFIX = 'jd-project-drill-session:v1:';
const EMPTY_SESSION: StoredDrillSession = { results: {}, drafts: {}, orders: {}, readLessons: {} };
let cachedSnap: { key: string; raw: string | null; val: StoredDrillSession } | null = null;
const sessionListeners = new Set<() => void>();

function subscribeSession(listener: () => void): () => void {
 sessionListeners.add(listener);
 if (typeof window === 'undefined') return () => sessionListeners.delete(listener);
 const onStorage = () => {
  cachedSnap = null;
  listener();
 };
 window.addEventListener('storage', onStorage);
 return () => {
  sessionListeners.delete(listener);
  window.removeEventListener('storage', onStorage);
 };
}

function readStoredSession(username: string): StoredDrillSession {
 if (typeof window === 'undefined') return EMPTY_SESSION;
 const key = SESSION_PREFIX + (username || 'guest');
 let raw: string | null = null;
 try {
  raw = window.localStorage.getItem(key);
 } catch {}
 if (cachedSnap && cachedSnap.key === key && cachedSnap.raw === raw) {
  return cachedSnap.val;
 }
 let val = EMPTY_SESSION;
 if (raw) {
  try {
   const parsed = JSON.parse(raw) as Partial<StoredDrillSession>;
   val = {
    results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {},
    drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
    orders: parsed.orders && typeof parsed.orders === 'object' ? parsed.orders : {},
    readLessons: parsed.readLessons && typeof parsed.readLessons === 'object' ? parsed.readLessons : {},
   };
  } catch {}
 }
 cachedSnap = { key, raw, val };
 return val;
}

function writeStoredSession(username: string, next: StoredDrillSession): void {
 if (typeof window === 'undefined') return;
 const key = SESSION_PREFIX + (username || 'guest');
 try {
  const raw = JSON.stringify(next);
  window.localStorage.setItem(key, raw);
  cachedSnap = { key, raw, val: next };
 } catch {}
 sessionListeners.forEach(l => l());
}

function stableOrder(q: AiQuiz, existing?: number[]): number[] {
 if (!('options' in q)) return [];
 if (existing && existing.length === q.options.length) return existing;
 return q.options.map((_, i) => i);
}

function subjectHintLang(recSubject?: string): PlaygroundLang | undefined {
 if (recSubject === 'go') return 'go';
 if (recSubject === 'frontend') return 'ts';
 if (recSubject === 'ai-development') return 'python';
 return undefined;
}

export default function ProjectDrillClient({
 username,
 topics,
 initialId,
 initialProj,
 initialTab,
 initialQ,
 autoStart,
}: {
 username: string;
 topics: ProjectDrillTopic[];
 initialId?: string;
 initialProj: number;
 initialTab: ViewTab;
 initialQ: number;
 autoStart: boolean;
}) {
 const { locale } = useI18n();
 const L = (zh: string, en: string) => (locale === 'en' ? en : zh);
 const [localCfg] = useLocalBridgeConfig();

 const [reportOverrides, setReportOverrides] = useState<Record<string, JdResearchReport>>({});
 const topicList = useMemo(
  () => topics.map(t => (reportOverrides[t.id] ? { ...t, report: reportOverrides[t.id] } : t)),
  [topics, reportOverrides],
 );

 const [activeTopicId, setActiveTopicId] = useState<string>(() => {
  if (initialId && topics.some(t => t.id === initialId)) return initialId;
  return topics[0]?.id || '';
 });
 const [projIdx, setProjIdx] = useState<number>(initialProj);
 const [tab, setTab] = useState<ViewTab>(initialTab);
 const [lessonIdx, setLessonIdx] = useState<number>(initialTab === 'lessons' ? initialQ : 0);
 const [quizIdx, setQuizIdx] = useState<number>(initialTab === 'practice' ? initialQ : 0);

 const activeTopic = useMemo(
  () => topicList.find(t => t.id === activeTopicId) ?? topicList[0] ?? null,
  [topicList, activeTopicId],
 );
 const projects = activeTopic?.report.resume?.projects ?? [];
 const safeProjIdx = Math.min(projIdx, Math.max(0, projects.length - 1));
 const proj = projects[safeProjIdx] ?? null;
 const drill = proj?.drill ?? null;

 const projKey = `${activeTopic?.id || ''}:${safeProjIdx}`;
 const [detailsOverride, setDetailsOverride] = useState<Record<string, boolean>>({});
 const detailsOpen = detailsOverride[projKey] ?? !drill;

 const getSnapshot = useCallback(() => readStoredSession(username), [username]);
 const getServerSnapshot = useCallback(() => EMPTY_SESSION, []);
 const session = useSyncExternalStore(subscribeSession, getSnapshot, getServerSnapshot);

 const updateSession = (fn: (prev: StoredDrillSession) => StoredDrillSession) => {
  writeStoredSession(username, fn(readStoredSession(username)));
 };

 const flushSession = () => {
  writeStoredSession(username, readStoredSession(username));
 };

 // Streaming drill generation state
 const [generating, setGenerating] = useState(false);
 const [genElapsed, setGenElapsed] = useState(0);
 const [genModel, setGenModel] = useState('');
 const [genThoughts, setGenThoughts] = useState('');
 const [genTail, setGenTail] = useState('');
 const [genErr, setGenErr] = useState('');
 const genAbortRef = useRef<AbortController | null>(null);
 const genTimerRef = useRef<number | null>(null);
 const thinkPreRef = useRef<HTMLPreElement | null>(null);
 const autoStartedRef = useRef<string>('');

 // Single-quiz regeneration state
 const [regenKey, setRegenKey] = useState('');
 const [regenErr, setRegenErr] = useState('');
 const [regenNonce, setRegenNonce] = useState<Record<string, number>>({});

 const stopGenerate = () => {
  genAbortRef.current?.abort();
  genAbortRef.current = null;
  if (genTimerRef.current !== null) {
   window.clearInterval(genTimerRef.current);
   genTimerRef.current = null;
  }
  setGenerating(false);
 };

 useEffect(
  () => () => {
   genAbortRef.current?.abort();
   if (genTimerRef.current !== null) window.clearInterval(genTimerRef.current);
  },
  [],
 );

 useEffect(() => {
  if (generating && thinkPreRef.current) {
   thinkPreRef.current.scrollTop = thinkPreRef.current.scrollHeight;
  }
 }, [generating, genThoughts, genTail]);

 const syncUrl = (tid: string, pi: number, nextTab: ViewTab, qi: number) => {
  if (typeof window === 'undefined' || !tid) return;
  const qs = new URLSearchParams({ id: tid });
  if (pi > 0) qs.set('proj', String(pi));
  if (nextTab !== 'lessons') qs.set('tab', nextTab);
  if (qi > 0) qs.set('q', String(qi));
  window.history.replaceState(null, '', `/interview/project-drill?${qs.toString()}`);
 };

 const generateDrill = async (opts?: { bypassCache?: boolean; targetTopicId?: string; targetProjIdx?: number }) => {
  const tid = opts?.targetTopicId ?? activeTopic?.id;
  const pi = opts?.targetProjIdx ?? safeProjIdx;
  if (!tid || generating) return;

  stopGenerate();
  const ctl = new AbortController();
  genAbortRef.current = ctl;
  setGenerating(true);
  setGenErr('');
  setGenModel('');
  setGenThoughts('');
  setGenTail('');
  setGenElapsed(0);
  const t0 = Date.now();
  genTimerRef.current = window.setInterval(() => {
   setGenElapsed(Math.floor((Date.now() - t0) / 1000));
  }, 1000);

  let accTh = '';
  let accTail = '';
  try {
   if (isLocalDeepReady(localCfg)) {
    const targetTopic = topicList.find(t => t.id === tid) ?? activeTopic;
    if (!targetTopic) throw new Error(L('未找到对应的简历报告', 'Report not found'));
    setGenModel(`${LOCAL_PROVIDER_LABEL[localCfg.provider]} · ${localCfg.model.trim() || 'default'}`);
    const pRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'prompts',
      task: 'project-drill',
      report: targetTopic.report,
      projIdx: pi,
     }),
     signal: ctl.signal,
    });
    const pData = (await pRes.json()) as { system?: string; user?: string; error?: string };
    if (!pRes.ok || !pData.system || !pData.user) {
     throw new Error(pData.error || L('准备本地提示词失败', 'Failed to prepare prompt'));
    }
    const out = await streamDeepViaBridge({
     cfg: localCfg,
     system: pData.system,
     messages: [{ role: 'user', content: pData.user }],
     jsonMode: true,
     onModel: m => setGenModel(m),
     onThink: d => {
      accTh += d;
      setGenThoughts(accTh);
     },
     onDelta: d => {
      accTail = (accTail + d).replace(/\s+/g, ' ').slice(-200);
      setGenTail(accTail);
     },
     signal: ctl.signal,
    });
    const parseRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'parse',
      task: 'project-drill',
      rawText: out.text,
      projIdx: pi,
     }),
     signal: ctl.signal,
    });
    const parseData = (await parseRes.json()) as { drill?: JdProjectDrill; error?: string };
    if (!parseRes.ok || !parseData.drill) {
     throw new Error(parseData.error || L('项目深挖预判解析失败，请重试', 'Failed to parse drill'));
    }
    const baseResume = targetTopic.report.resume!;
    const doneReport: JdResearchReport = {
     ...targetTopic.report,
     resume: {
      ...baseResume,
      projects: baseResume.projects.map((item, idx) => (idx === pi ? { ...item, drill: parseData.drill } : item)),
     },
    };
    fetch('/api/ai-interview-records', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      id: tid,
      kind: 'jd-research',
      patch: true,
      payload: { report: doneReport },
     }),
    }).catch(() => {});
    setReportOverrides(prev => ({ ...prev, [tid]: doneReport }));
    setLessonIdx(0);
    setQuizIdx(0);
    return;
   }
   const r = await fetch('/api/jd-research/project-drill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: tid,
     projIdx: pi,
     bypassCache: Boolean(opts?.bypassCache),
     geminiProxy: getGeminiAutoProxy(),
    }),
    signal: ctl.signal,
   });
   if (!r.ok || !r.body) {
    let msg = L('预判生成失败，请重试', 'Generation failed');
    try {
     const j = (await r.json()) as { error?: string };
     if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
   }

   const reader = r.body.getReader();
   const dec = new TextDecoder();
   let buf = '';
   let doneReport: JdResearchReport | undefined;

   for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
     const line = buf.slice(0, nl).trim();
     buf = buf.slice(nl + 1);
     if (!line) continue;
     let ev: {
      type?: string;
      model?: string;
      text?: string;
      drill?: JdProjectDrill;
      report?: JdResearchReport;
      error?: string;
     };
     try {
      ev = JSON.parse(line) as typeof ev;
     } catch {
      continue;
     }
     if (ev.model) setGenModel(ev.model);
     if (ev.type === 'reset') {
      accTail = '';
      setGenTail('');
      continue;
     }
     if (ev.type === 'thought' && typeof ev.text === 'string' && ev.text) {
      accTh += ev.text;
      setGenThoughts(accTh);
      continue;
     }
     if (ev.type === 'delta' && typeof ev.text === 'string' && ev.text) {
      accTail = (accTail + ev.text).replace(/\s+/g, ' ').slice(-200);
      setGenTail(accTail);
      continue;
     }
     if (ev.type === 'error') {
      throw new Error(ev.error || L('预判生成失败，请重试', 'Generation failed'));
     }
     if (ev.type === 'done' && ev.report) {
      doneReport = ev.report;
     }
    }
   }

   if (!doneReport?.resume?.projects?.[pi]?.drill) {
    throw new Error(L('预判结果不完整，请重试', 'Incomplete drill — please retry'));
   }

   setReportOverrides(prev => ({ ...prev, [tid]: doneReport! }));
   setLessonIdx(0);
   setQuizIdx(0);
  } catch (e) {
   if (!ctl.signal.aborted) {
    setGenErr((e as Error).message || L('预判生成失败，请重试', 'Generation failed'));
   }
  } finally {
   if (genAbortRef.current === ctl) genAbortRef.current = null;
   if (genTimerRef.current !== null) {
    window.clearInterval(genTimerRef.current);
    genTimerRef.current = null;
   }
   setGenerating(false);
  }
 };

 // Auto-start once on initial navigation if requested and project has no drill yet
 useEffect(() => {
  if (!autoStart || !activeTopic || !proj || proj.drill) return;
  const key = `${activeTopic.id}:${safeProjIdx}`;
  if (autoStartedRef.current === key) return;
  autoStartedRef.current = key;
  void generateDrill({ targetTopicId: activeTopic.id, targetProjIdx: safeProjIdx });
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [autoStart, activeTopic?.id, safeProjIdx]);

 const lessons = useMemo(() => drill?.lessons ?? [], [drill]);
 const quizzes = useMemo(() => drill?.quizzes ?? [], [drill]);
 const safeLessonIdx = Math.min(lessonIdx, Math.max(0, lessons.length - 1));
 const safeQuizIdx = Math.min(quizIdx, Math.max(0, quizzes.length - 1));
 const currentLesson = lessons[safeLessonIdx] ?? null;
 const currentQuiz = quizzes[safeQuizIdx] ?? null;

 const lessonKey = activeTopic ? `${activeTopic.id}:p${safeProjIdx}:l${safeLessonIdx}` : '';
 const quizKey = activeTopic && currentQuiz ? `${activeTopic.id}:p${safeProjIdx}:${currentQuiz.id}` : '';

 const answeredCount = useMemo(() => {
  if (!activeTopic || !quizzes.length) return 0;
  return quizzes.filter(q => Boolean(session.results[`${activeTopic.id}:p${safeProjIdx}:${q.id}`])).length;
 }, [activeTopic, safeProjIdx, quizzes, session.results]);

 const markLessonRead = (idx: number) => {
  if (!activeTopic) return;
  const k = `${activeTopic.id}:p${safeProjIdx}:l${idx}`;
  if (readStoredSession(username).readLessons[k]) return;
  updateSession(prev => ({
   ...prev,
   readLessons: { ...prev.readLessons, [k]: true },
  }));
 };

 const switchTopic = (tid: string) => {
  stopGenerate();
  setGenErr('');
  setRegenErr('');
  setActiveTopicId(tid);
  setProjIdx(0);
  setTab('lessons');
  setLessonIdx(0);
  setQuizIdx(0);
  syncUrl(tid, 0, 'lessons', 0);
 };

 const switchProject = (pi: number) => {
  stopGenerate();
  setGenErr('');
  setRegenErr('');
  setProjIdx(pi);
  setTab('lessons');
  setLessonIdx(0);
  setQuizIdx(0);
  if (activeTopic) syncUrl(activeTopic.id, pi, 'lessons', 0);
 };

 const switchTab = (nextTab: ViewTab) => {
  if (tab === 'lessons' && lessons.length > 0) {
   markLessonRead(safeLessonIdx);
  }
  setTab(nextTab);
  const nextQ = nextTab === 'lessons' ? safeLessonIdx : safeQuizIdx;
  if (activeTopic) syncUrl(activeTopic.id, safeProjIdx, nextTab, nextQ);
 };

 const switchLesson = (idx: number) => {
  markLessonRead(safeLessonIdx);
  setLessonIdx(idx);
  if (activeTopic) syncUrl(activeTopic.id, safeProjIdx, 'lessons', idx);
 };

 const switchQuiz = (idx: number) => {
  setRegenErr('');
  setQuizIdx(idx);
  if (activeTopic) syncUrl(activeTopic.id, safeProjIdx, 'practice', idx);
 };

 const handleAnswer = (res: Result) => {
  if (!quizKey) return;
  updateSession(prev => {
   const drafts = { ...prev.drafts };
   delete drafts[quizKey];
   return {
    ...prev,
    results: { ...prev.results, [quizKey]: res },
    drafts,
   };
  });
 };

 const handleDraft = (val: string) => {
  if (!quizKey) return;
  updateSession(prev => {
   const drafts = { ...prev.drafts };
   if (val.trim()) drafts[quizKey] = val;
   else delete drafts[quizKey];
   return { ...prev, drafts };
  });
 };

 const resetPractice = () => {
  if (!activeTopic || !quizzes.length) return;
  const keys = quizzes.map(q => `${activeTopic.id}:p${safeProjIdx}:${q.id}`);
  updateSession(prev => {
   const results = { ...prev.results };
   const drafts = { ...prev.drafts };
   for (const k of keys) {
    delete results[k];
    delete drafts[k];
   }
   return { ...prev, results, drafts };
  });
  setQuizIdx(0);
  syncUrl(activeTopic.id, safeProjIdx, 'practice', 0);
 };

 const regenerateQuiz = async (targetQIdx: number) => {
  if (!activeTopic || !quizzes[targetQIdx] || regenKey) return;
  const qz = quizzes[targetQIdx];
  const targetKey = `${activeTopic.id}:p${safeProjIdx}:${qz.id}`;
  setRegenKey(targetKey);
  setRegenErr('');
  try {
   if (isLocalDeepReady(localCfg)) {
    const pRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'prompts',
      task: 'project-drill-regen-quiz',
      report: activeTopic.report,
      projIdx: safeProjIdx,
      quizIdx: targetQIdx,
     }),
    });
    const pData = (await pRes.json()) as { system?: string; user?: string; error?: string };
    if (!pRes.ok || !pData.system || !pData.user) {
     throw new Error(pData.error || L('准备本地提示词失败', 'Failed to prepare prompt'));
    }
    const out = await streamDeepViaBridge({
     cfg: localCfg,
     system: pData.system,
     messages: [{ role: 'user', content: pData.user }],
     jsonMode: true,
     onDelta: () => {},
    });
    const parseRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'parse',
      task: 'project-drill-regen-quiz',
      rawText: out.text,
      projIdx: safeProjIdx,
      quizIdx: targetQIdx,
      fallbackId: qz.id,
      fallbackDimension: qz.dimension,
     }),
    });
    const parseData = (await parseRes.json()) as { quiz?: AiQuiz; error?: string };
    if (!parseRes.ok || !parseData.quiz) {
     throw new Error(parseData.error || L('重出题目解析失败，请重试', 'Regeneration failed'));
    }
    const baseResume = activeTopic.report.resume!;
    const nextReport: JdResearchReport = {
     ...activeTopic.report,
     resume: {
      ...baseResume,
      projects: baseResume.projects.map((p, idx) =>
       idx === safeProjIdx && p.drill
        ? { ...p, drill: { ...p.drill, quizzes: p.drill.quizzes.map((item, qi) => (qi === targetQIdx ? parseData.quiz! : item)) } }
        : p,
      ),
     },
    };
    fetch('/api/ai-interview-records', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      id: activeTopic.id,
      kind: 'jd-research',
      patch: true,
      payload: { report: nextReport },
     }),
    }).catch(() => {});
    setReportOverrides(prev => ({ ...prev, [activeTopic.id]: nextReport }));
    updateSession(prev => {
     const results = { ...prev.results };
     const drafts = { ...prev.drafts };
     const orders = { ...prev.orders };
     delete results[targetKey];
     delete drafts[targetKey];
     delete orders[targetKey];
     return { ...prev, results, drafts, orders };
    });
    setRegenNonce(prev => ({ ...prev, [targetKey]: (prev[targetKey] || 0) + 1 }));
    return;
   }
   const r = await fetch('/api/jd-research/project-drill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: activeTopic.id,
     projIdx: safeProjIdx,
     mode: 'regen-quiz',
     quizIdx: targetQIdx,
     geminiProxy: getGeminiAutoProxy(),
    }),
   });
   const d = (await r.json()) as {
    ok?: boolean;
    report?: JdResearchReport;
    error?: string;
   };
   if (!r.ok || !d.ok || !d.report) {
    throw new Error(d.error || L('重出题目失败，请重试', 'Regeneration failed'));
   }
   setReportOverrides(prev => ({ ...prev, [activeTopic.id]: d.report! }));
   updateSession(prev => {
    const results = { ...prev.results };
    const drafts = { ...prev.drafts };
    const orders = { ...prev.orders };
    delete results[targetKey];
    delete drafts[targetKey];
    delete orders[targetKey];
    return { ...prev, results, drafts, orders };
   });
   setRegenNonce(prev => ({ ...prev, [targetKey]: (prev[targetKey] || 0) + 1 }));
  } catch (e) {
   setRegenErr((e as Error).message || L('重出题目失败，请重试', 'Regeneration failed'));
  } finally {
   setRegenKey('');
  }
 };

 const currentItem: Item | null = useMemo(() => {
  if (!activeTopic || !currentQuiz || !quizKey) return null;
  return {
   id: quizKey,
   level: `${activeTopic.id}:p${safeProjIdx}`,
   quiz: currentQuiz,
   order: stableOrder(currentQuiz, session.orders[quizKey]),
  };
 }, [activeTopic, safeProjIdx, currentQuiz, quizKey, session.orders]);

 const lessonDockContext = useMemo(() => {
  if (!proj || !currentLesson) return null;
  return {
   kind: 'lesson' as const,
   lesson: {
    title: currentLesson.question,
    body: [
     `【简历项目】${proj.name}（${proj.role}）`,
     proj.stack.length ? `【技术栈】${proj.stack.join(' / ')}` : '',
     proj.actions.length ? `【核心工作】${proj.actions.join('；')}` : '',
     proj.results.length ? `【量化成果】${proj.results.join('；')}` : '',
     currentLesson.whyAsked ? `【考察意图】${currentLesson.whyAsked}` : '',
     `【核心拆解】${currentLesson.teaching}`,
     currentLesson.answerFramework.length
      ? `【作答框架】\n${currentLesson.answerFramework.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '',
     currentLesson.pitfalls.length ? `【避坑要点】${currentLesson.pitfalls.join('；')}` : '',
    ]
     .filter(Boolean)
     .join('\n\n')
     .slice(0, 12000),
    steps: [],
   },
  };
 }, [proj, currentLesson]);

 const backHref = activeTopic
  ? `/interview/jd-research?id=${encodeURIComponent(activeTopic.id)}&tab=resume`
  : '/interview/jd-research';

 const practiceHref = activeTopic
  ? `/interview/project-drill?id=${encodeURIComponent(activeTopic.id)}&proj=${safeProjIdx}&tab=practice&q=${safeQuizIdx}`
  : '/interview/project-drill';

 const lessonNoteBody = useMemo(() => {
  if (!proj || !currentLesson) return '';
  return [
   `### ${currentLesson.question}`,
   currentLesson.whyAsked ? `**考察意图**：${currentLesson.whyAsked}` : '',
   `**核心拆解（${proj.name}）**：\n${currentLesson.teaching}`,
   currentLesson.answerFramework.length
    ? `**作答框架**：\n${currentLesson.answerFramework.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : '',
   currentLesson.pitfalls.length
    ? `**避坑要点**：\n${currentLesson.pitfalls.map(p => `- ${p}`).join('\n')}`
    : '',
  ]
   .filter(Boolean)
   .join('\n\n');
 }, [proj, currentLesson]);

 return (
  <div className="ai-shell">
   <SiteHeader active="interview" username={username} />
   <main className="ai-main pdr-main">
    <div className="arch-top">
     <a href={backHref} className="arch-back">
      <ArrowLeft size={16} />
      <span>{L('返回参考简历', 'Back to Resume')}</span>
     </a>
     <div className="pdr-top-right">
      {topicList.length > 1 && (
       <select
        className="pdr-select"
        aria-label={L('切换岗位简历', 'Switch resume')}
        value={activeTopic?.id || ''}
        onChange={e => switchTopic(e.target.value)}
       >
        {topicList.map(t => (
         <option key={t.id} value={t.id}>
          {t.title}
         </option>
        ))}
       </select>
      )}
      {activeTopic && proj && drill && !generating && (
       <button
        type="button"
        className="button secondary arch-new-btn"
        onClick={() => void generateDrill({ bypassCache: true })}
       >
        <RotateCcw size={14} />
        <span>{L('重新预判', 'Regenerate')}</span>
       </button>
      )}
     </div>
    </div>

    {!activeTopic || !proj ? (
     <div className="ai-card pdr-empty-card">
      <Target size={32} style={{ color: 'var(--primary)' }} />
      <h2>{L('暂无参考简历项目', 'No resume projects yet')}</h2>
      <a href="/interview/jd-research" className="button primary">
       {L('生成参考简历', 'Create Resume')}
      </a>
     </div>
    ) : (
     <>
      {projects.length > 1 && (
       <div className="jds-paths" aria-label={L('切换简历项目', 'Switch project')}>
        {projects.map((p, idx) => (
         <button
          key={idx}
          type="button"
          className={'jds-path-btn' + (idx === safeProjIdx ? ' on' : '') + (p.drill ? ' done' : '')}
          onClick={() => switchProject(idx)}
         >
          <span>{L(`项目 ${idx + 1}`, `Project ${idx + 1}`)} · {p.name}</span>
          {p.drill && <em>{p.drill.lessons.length}/{p.drill.quizzes.length}</em>}
         </button>
        ))}
       </div>
      )}

      <section className="ai-card pdr-proj-summary">
       <div className="pdr-proj-summary-top">
        <div className="pdr-proj-summary-head">
         <h1>{proj.name}</h1>
         <div className="jdr-head-tags">
          <span className="jdr-style-tag">{proj.role}</span>
          {proj.period && <span className="jdr-qtag">{proj.period}</span>}
          <span className="jdr-qtag">{activeTopic.report.roleTitle}</span>
         </div>
        </div>
        <button
         type="button"
         className="ai-note-pill"
         aria-expanded={detailsOpen}
         onClick={() => setDetailsOverride(prev => ({ ...prev, [projKey]: !detailsOpen }))}
        >
         {detailsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
         <span>{detailsOpen ? L('收起项目详情', 'Hide Details') : L('展开项目详情', 'Project Details')}</span>
        </button>
       </div>

       {proj.stack.length > 0 && (
        <div className="jdr-proj-stack">
         {proj.stack.map((tk, ti) => (
          <span key={ti} className="jdr-qtag">{tk}</span>
         ))}
        </div>
       )}

       {detailsOpen && (
        <div className="pdr-proj-body">
         {proj.background && (
          <div className="jdr-proj-sec">
           <strong>{L('项目背景', 'Background')}</strong>
           <p>{proj.background}</p>
          </div>
         )}
         {proj.actions.length > 0 && (
          <div className="jdr-proj-sec">
           <strong>{L('核心工作', 'Key Actions')}</strong>
           <ul>
            {proj.actions.map((act, ai) => (
             <li key={ai}>{act}</li>
            ))}
           </ul>
          </div>
         )}
         {proj.results.length > 0 && (
          <div className="jdr-proj-sec">
           <strong>{L('量化成果', 'Results')}</strong>
           <ul>
            {proj.results.map((res, ri) => (
             <li key={ri}>{res}</li>
            ))}
           </ul>
          </div>
         )}
        </div>
       )}
      </section>

      {generating ? (
       <section className="ai-card arch-reply-card">
        <div className="arch-running">
         <div className="arch-running-left">
          <Loader2 size={16} className="ai-spin" />
          <span>{L('正在生成深挖预判与引导课程…', 'Generating project drill…')}</span>
         </div>
         <div className="pdr-top-right">
          {genModel && <span className="jdr-model-pill">{genModel}</span>}
          <span className="arch-meta-txt">{genElapsed}s</span>
          <button
           type="button"
           className="button secondary arch-stop-btn"
           onClick={stopGenerate}
          >
           <Square size={12} fill="currentColor" />
           <span>{L('停止', 'Stop')}</span>
          </button>
         </div>
        </div>
        <Progress value={Math.min(92, Math.max(12, genElapsed * 3))} />
        {(genThoughts || genTail) && (
         <pre ref={thinkPreRef} className="arch-thoughts-body" style={{ maxHeight: 220, border: '1px solid var(--line)', borderRadius: 10 }}>
          {genThoughts || genTail}
         </pre>
        )}
       </section>
      ) : !drill ? (
       <section className="ai-card pdr-empty-card">
        <Sparkles size={28} style={{ color: 'var(--primary)' }} />
        <h2>{L('暂无深挖预判内容', 'No deep-dive drill yet')}</h2>
        {genErr && <p className="ai-grade-error" style={{ margin: 0 }}>{genErr}</p>}
        <button
         type="button"
         className="button primary"
         onClick={() => void generateDrill()}
        >
         <Sparkles size={15} />
         <span>{L('开始预判', 'Generate Drill')}</span>
        </button>
       </section>
      ) : (
       <>
        {genErr && <p className="ai-grade-error" style={{ margin: 0 }}>{genErr}</p>}

        <div className="pdr-bar-row">
         <div className="jdr-tabs" role="tablist">
          <button
           type="button"
           role="tab"
           aria-selected={tab === 'lessons'}
           className={tab === 'lessons' ? 'on' : ''}
           onClick={() => switchTab('lessons')}
          >
           <BookOpen size={14} />
           <span>{L(`预判教学 (${lessons.length})`, `Teaching (${lessons.length})`)}</span>
          </button>
          <button
           type="button"
           role="tab"
           aria-selected={tab === 'practice'}
           className={tab === 'practice' ? 'on' : ''}
           onClick={() => switchTab('practice')}
          >
           <Target size={14} />
           <span>{L(`引导作答 (${answeredCount}/${quizzes.length})`, `Guided Practice (${answeredCount}/${quizzes.length})`)}</span>
          </button>
         </div>

         {tab === 'practice' && answeredCount > 0 && (
          <button type="button" className="ai-note-pill" onClick={resetPractice}>
           <RotateCcw size={12} />
           <span>{L('重做练习', 'Reset')}</span>
          </button>
         )}
        </div>

        {tab === 'lessons' && currentLesson && (
         <>
          <div className="jds-qnums" aria-label={L('教学卡切换', 'Lesson index')}>
           {lessons.map((ls, i) => {
            const read = Boolean(session.readLessons[`${activeTopic.id}:p${safeProjIdx}:l${i}`]);
            return (
             <button
              key={i}
              type="button"
              className={'jds-qnum' + (i === safeLessonIdx ? ' cur' : '') + (read ? ' done' : '')}
              onClick={() => switchLesson(i)}
             >
              {read && <Check size={12} />}
              <span>{i + 1}</span>
              <small>{ls.angle}</small>
             </button>
            );
           })}
          </div>

          <CardSideNav
           showArrows={lessons.length > 1}
           onPrev={safeLessonIdx > 0 ? () => switchLesson(safeLessonIdx - 1) : undefined}
           onNext={
            safeLessonIdx < lessons.length - 1
             ? () => switchLesson(safeLessonIdx + 1)
             : quizzes.length > 0
               ? () => switchTab('practice')
               : undefined
           }
           prevLabel={L('上一张', 'Previous')}
           nextLabel={safeLessonIdx < lessons.length - 1 ? L('下一张', 'Next') : L('去引导作答', 'Practice')}
          >
           <article className="ai-card pdr-lesson-card">
            <div className="jds-card-meta">
             <span className={'jdr-diff ' + currentLesson.difficulty}>{currentLesson.difficulty}</span>
             <span className="jdr-qtag">{currentLesson.angle}</span>
             <AddToNoteButton
              compact
              title={`${proj.name.slice(0, 24)} · ${currentLesson.angle}`.slice(0, 64)}
              questionOnly={`### ${currentLesson.question}`}
              questionAndAnswer={lessonNoteBody}
              source={{
               kind: 'interview',
               label: `${proj.name.slice(0, 18)} · ${currentLesson.angle}`,
               href: `/interview/project-drill?id=${encodeURIComponent(activeTopic.id)}&proj=${safeProjIdx}&tab=lessons&q=${safeLessonIdx}`,
              }}
              onBeforeNavigate={flushSession}
             />
             <span className="jds-num">
              {String(safeLessonIdx + 1).padStart(2, '0')} / {lessons.length}
             </span>
            </div>

            <h2 className="pdr-lesson-q">{currentLesson.question}</h2>

            {currentLesson.whyAsked && (
             <div className="pdr-why-box">
              <span className="pdr-sec-label">{L('考察意图', 'Interviewer Intent')}</span>
              <p><Annotated text={currentLesson.whyAsked} /></p>
             </div>
            )}

            <div className="pdr-sec">
             <span className="pdr-sec-label">{L('核心拆解', 'Mechanism & Design')}</span>
             <div className="pdr-prose">
              {currentLesson.teaching
               .split('\n')
               .map(line => line.trim())
               .filter(Boolean)
               .map((para, pi) => (
                <p key={pi}><Annotated text={para} /></p>
               ))}
             </div>
            </div>

            {currentLesson.answerFramework.length > 0 && (
             <div className="pdr-sec">
              <span className="pdr-sec-label">{L('引导作答框架', 'Answer Framework')}</span>
              <ol className="pdr-steps">
               {currentLesson.answerFramework.map((step, si) => (
                <li key={si}>
                 <span className="pdr-step-num">{si + 1}</span>
                 <span><Annotated text={step} /></span>
                </li>
               ))}
              </ol>
             </div>
            )}

            {currentLesson.pitfalls.length > 0 && (
             <div className="pdr-sec">
              <span className="pdr-sec-label">{L('避坑要点', 'Pitfalls')}</span>
              <ul className="pdr-pitfalls">
               {currentLesson.pitfalls.map((pit, pi) => (
                <li key={pi}><Annotated text={pit} /></li>
               ))}
              </ul>
             </div>
            )}

            <div className="pdr-lesson-foot">
             <div>
              {safeLessonIdx > 0 && (
               <button
                type="button"
                className="button secondary arch-new-btn"
                onClick={() => switchLesson(safeLessonIdx - 1)}
               >
                <ArrowLeft size={14} />
                <span>{L('上一张', 'Previous')}</span>
               </button>
              )}
             </div>
             <div>
              {safeLessonIdx < lessons.length - 1 ? (
               <button
                type="button"
                className="button primary arch-new-btn"
                onClick={() => switchLesson(safeLessonIdx + 1)}
               >
                <span>{L('下一张', 'Next')}</span>
                <ArrowRight size={14} />
               </button>
              ) : (
               quizzes.length > 0 && (
                <button
                 type="button"
                 className="button primary arch-new-btn"
                 onClick={() => switchTab('practice')}
                >
                 <span>{L('进入引导作答', 'Start Practice')}</span>
                 <ArrowRight size={14} />
                </button>
               )
              )}
             </div>
            </div>
           </article>
          </CardSideNav>

          {lessonDockContext && (
           <AiDock
            chatKey={`pdr-lesson:${lessonKey}`}
            context={lessonDockContext}
            prompts={[
             L('帮我串成 1 分钟口语回答', '1-min spoken script'),
             L('针对这道题对我模拟追问一步', 'Ask a follow-up'),
             L('用更直白的例子讲清原理', 'Explain simply'),
            ]}
            noteBackHref={`/interview/project-drill?id=${encodeURIComponent(activeTopic.id)}&proj=${safeProjIdx}&tab=lessons&q=${safeLessonIdx}`}
            onBeforeNoteLeave={flushSession}
           />
          )}
         </>
        )}

        {tab === 'practice' && currentItem && currentQuiz && (
         <>
          <div className="jds-qbar-row">
           <div className="jds-qnums" aria-label={L('题号切换', 'Question index')}>
            {quizzes.map((qz, i) => {
             const key = `${activeTopic.id}:p${safeProjIdx}:${qz.id}`;
             const res = session.results[key];
             const typeLbl = aiQuizTypes[qz.type ?? 'single'];
             return (
              <button
               key={key}
               type="button"
               className={
                'jds-qnum' +
                (i === safeQuizIdx ? ' cur' : '') +
                (res ? (res.correct ? ' done' : ' wrong') : '')
               }
               onClick={() => switchQuiz(i)}
              >
               {res && (res.correct ? <Check size={12} /> : <X size={12} />)}
               <span>{i + 1}</span>
               <small>{typeLbl}</small>
              </button>
             );
            })}
           </div>
           <span style={{ fontSize: 12.5, color: 'var(--quiet)', fontWeight: 650 }}>
            {safeQuizIdx + 1} / {quizzes.length}
           </span>
          </div>

          {regenErr && <p className="ai-grade-error" style={{ margin: 0 }}>{regenErr}</p>}

          <QuestionCard
           key={`${quizKey}:${regenNonce[quizKey] || 0}`}
           item={currentItem}
           label={`${proj.name} · ${currentQuiz.dimension || L('项目深挖', 'Project Drill')}`}
           result={session.results[quizKey] ?? null}
           draft={session.drafts[quizKey]}
           onDraftChange={handleDraft}
           last={safeQuizIdx === quizzes.length - 1}
           onAnswer={handleAnswer}
           onRegenerate={() => void regenerateQuiz(safeQuizIdx)}
           regenerating={regenKey === quizKey}
           onPrev={safeQuizIdx > 0 ? () => switchQuiz(safeQuizIdx - 1) : undefined}
           onNext={() => {
            if (safeQuizIdx < quizzes.length - 1) {
             switchQuiz(safeQuizIdx + 1);
            } else {
             switchTab('lessons');
            }
           }}
           noteBackHref={practiceHref}
           onBeforeNoteLeave={flushSession}
           playground={{
            subjectName: activeTopic.title.slice(0, 24),
            levelTitle: proj.name.slice(0, 24),
            hintLang: subjectHintLang(activeTopic.report.recommendedSubject),
            backHref: practiceHref,
           }}
          />
         </>
        )}
       </>
      )}
     </>
    )}
   </main>
  </div>
 );
}
