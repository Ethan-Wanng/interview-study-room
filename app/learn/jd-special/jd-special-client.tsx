'use client';
import '../../ai/ai.css';
import '../../interview/interview.css';
import '../../interview/architect/architect.css';
import '../../interview/jd-research/jd-research.css';
import './jd-special.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
 AlertTriangle,
 ArrowLeft,
 ArrowUpRight,
 BookOpen,
 Check,
 CheckCircle2,
 ChevronDown,
 ChevronUp,
 Clock,
 Compass,
 ExternalLink,
 Eye,
 EyeOff,
 FileText,
 Loader2,
 MessageSquare,
 Plus,
 RotateCcw,
 Sparkles,
 Square,
 Target,
 X,
 Zap,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import SiteHeader from '../../components/site-header';
import CardSideNav from '../../components/card-side-nav';
import AddToNoteButton from '../../components/add-to-note';
import AiDock from '../../ai/ai-dock';
import QuestionCard, { type Item, type Result } from '../../ai/question-card';
import { Annotated } from '../../interview/annotated';
import { AnnotatedAnswerBox } from '../../ai/grade-view';
import { requestGrade, type GradeThinkState } from '../../ai/grade-client';
import { getGeminiAutoProxy } from '../../ai/gemini-proxy-pref';
import { useI18n } from '../../components/i18n';
import { aiQuizTypes, type AiQuiz } from '@/content/journey';
import { answerBlocks } from '@/lib/my-questions';
import type { PlaygroundLang } from '@/lib/playground-bridge';
import type { GradeItem, GradeResult } from '@/lib/grade-types';
import type { AntigravityUsage } from '@/lib/antigravity-agent';
import {
 countJdStudyQuizzes,
 hasStructuredStudyQuizzes,
 type JdInputKind,
 type JdResearchReport,
} from '@/lib/jd-research-types';

const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const fmtDuration = (ms: number, en: boolean) => {
 const sec = Math.max(0, Math.round(ms / 1000));
 if (sec < 1) return en ? '<1s' : '<1秒';
 if (sec < 60) return en ? `${sec}s` : `${sec}秒`;
 const min = Math.floor(sec / 60);
 const rem = sec % 60;
 if (en) return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
 return rem > 0 ? `${min}分${rem}秒` : `${min}分`;
};

export type JdSpecialTopic = {
 id: string;
 title: string;
 kind?: JdInputKind;
 source?: string;
 cached?: boolean;
 stage1Cached?: boolean;
 durationMs?: number;
 usage?: AntigravityUsage;
 updatedAt: number;
 report: JdResearchReport;
};

type ViewTab = 'practice' | 'dimension' | 'profile';

type IndexedStudyQuiz = {
 stepIdx: number;
 stepPhase: string;
 stepTitle: string;
 quiz: AiQuiz;
 key: string;
};

function tokenizeForMatch(text: string): string[] {
 const s = text.toLowerCase();
 const out = new Set<string>();
 const latin = s.match(/[a-z0-9+#._-]{2,}/g) || [];
 for (const w of latin) out.add(w);
 const zhRuns = s.match(/[\u4e00-\u9fa5]{2,}/g) || [];
 for (const run of zhRuns) {
  for (let i = 0; i <= run.length - 2; i++) out.add(run.slice(i, i + 2));
 }
 return [...out];
}

function matchQuizToDimensionIndex(
 entry: IndexedStudyQuiz,
 dimensions: { name: string; focus: string }[],
): number {
 if (!dimensions.length) return -1;
 const rawDim = (entry.quiz.dimension || '').trim().toLowerCase();
 if (rawDim) {
  const exact = dimensions.findIndex(d => d.name.trim().toLowerCase() === rawDim);
  if (exact >= 0) return exact;
  const incl = dimensions.findIndex(d => {
   const dn = d.name.trim().toLowerCase();
   return dn && (dn.includes(rawDim) || rawDim.includes(dn));
  });
  if (incl >= 0) return incl;
 }
 const hay = `${entry.quiz.dimension || ''} ${entry.quiz.q} ${entry.quiz.explain} ${entry.stepTitle}`.toLowerCase();
 let bestIdx = entry.stepIdx % dimensions.length;
 let bestScore = 0;
 dimensions.forEach((d, idx) => {
  const tokens = tokenizeForMatch(`${d.name} ${d.focus}`);
  let score = 0;
  for (const tk of tokens) {
   if (hay.includes(tk)) score += d.name.toLowerCase().includes(tk) ? 3 : 1;
  }
  if (score > bestScore) {
   bestScore = score;
   bestIdx = idx;
  }
 });
 return bestIdx;
}

const STORAGE_PREFIX = 'jd-special-journey:v1:';
const SESSION_PREFIX = 'jd-special-session:v1:';

type StoredStepSession = {
 results: Record<string, Result>;
 drafts: Record<string, string>;
 orders: Record<string, number[]>;
};

function loadPassed(username: string): Set<string> {
 if (typeof window === 'undefined') return new Set();
 try {
  const raw = window.localStorage.getItem(STORAGE_PREFIX + (username || 'guest'));
  if (!raw) return new Set();
  const parsed = JSON.parse(raw) as { passed?: unknown };
  if (!Array.isArray(parsed?.passed)) return new Set();
  return new Set(parsed.passed.filter((x): x is string => typeof x === 'string'));
 } catch {
  return new Set();
 }
}

function persistPassed(username: string, passed: Set<string>): void {
 if (typeof window === 'undefined') return;
 const key = STORAGE_PREFIX + (username || 'guest');
 try {
  window.localStorage.setItem(key, JSON.stringify({ passed: [...passed], best: {} }));
  window.dispatchEvent(new StorageEvent('storage', { key }));
 } catch {}
}

function loadSession(username: string): StoredStepSession {
 if (typeof window === 'undefined') return { results: {}, drafts: {}, orders: {} };
 try {
  const raw = window.localStorage.getItem(SESSION_PREFIX + (username || 'guest'));
  if (!raw) return { results: {}, drafts: {}, orders: {} };
  const parsed = JSON.parse(raw) as Partial<StoredStepSession>;
  return {
   results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {},
   drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
   orders: parsed.orders && typeof parsed.orders === 'object' ? parsed.orders : {},
  };
 } catch {
  return { results: {}, drafts: {}, orders: {} };
 }
}

function saveSession(username: string, session: StoredStepSession): void {
 if (typeof window === 'undefined') return;
 try {
  window.localStorage.setItem(SESSION_PREFIX + (username || 'guest'), JSON.stringify(session));
 } catch {}
}

function subjectHintLang(recSubject?: string): PlaygroundLang | undefined {
 if (recSubject === 'go') return 'go';
 if (recSubject === 'frontend') return 'ts';
 if (recSubject === 'ai-development') return 'python';
 return undefined;
}

function stableOrder(q: AiQuiz, existing?: number[]): number[] {
 if (!('options' in q)) return [];
 if (existing && existing.length === q.options.length) return existing;
 return q.options.map((_, i) => i);
}

export default function JdSpecialClient({
 username,
 topics,
}: {
 username: string;
 topics: JdSpecialTopic[];
}) {
 const { locale } = useI18n();
 const L = (zh: string, en: string) => (locale === 'en' ? en : zh);

 const [topicList, setTopicList] = useState<JdSpecialTopic[]>(topics);
 useEffect(() => {
  setTopicList(topics);
 }, [topics]);

 const [activeTopicId, setActiveTopicId] = useState<string>(topics[0]?.id || '');
 const [tab, setTab] = useState<ViewTab>('practice');
 const [stepIdx, setStepIdx] = useState(0);
 const [dimIdx, setDimIdx] = useState(0);
 const [qIndex, setQIndex] = useState(0);
 const [jdOpen, setJdOpen] = useState(false);
 const [regenKey, setRegenKey] = useState('');
 const [regenErr, setRegenErr] = useState('');
 const [regenNonce, setRegenNonce] = useState<Record<string, number>>({});
 const [fillingStepIdx, setFillingStepIdx] = useState<number | null>(null);
 const [fillErr, setFillErr] = useState('');
 const [passed, setPassed] = useState<Set<string>>(() => new Set());
 const [session, setSession] = useState<StoredStepSession>({ results: {}, drafts: {}, orders: {} });
 const sessionRef = useRef<StoredStepSession>(session);

 // Legacy fallback states for reports generated before structured path quizzes existed
 const [showAns, setShowAns] = useState(false);
 const [legacyDrafts, setLegacyDrafts] = useState<Record<string, string>>({});
 const [legacyGrades, setLegacyGrades] = useState<
  Record<string, { result: GradeResult; model?: string; remaining?: number; think?: string; thinkSecs?: number }>
 >({});
 const [grading, setGrading] = useState(false);
 const [liveResult, setLiveResult] = useState<GradeResult | null>(null);
 const [liveThink, setLiveThink] = useState<GradeThinkState | null>(null);
 const [gradeErr, setGradeErr] = useState('');
 const gradeAbortRef = useRef<AbortController | null>(null);

 useEffect(() => {
  setPassed(loadPassed(username));
  const loaded = loadSession(username);
  sessionRef.current = loaded;
  setSession(loaded);
 }, [username]);

 useEffect(() => {
  const sp = new URLSearchParams(window.location.search);
  const id = sp.get('id');
  const t = sp.get('tab');
  const st = Number(sp.get('step'));
  const dm = Number(sp.get('dim'));
  const qi = Number(sp.get('q'));
  if (id && topics.some(x => x.id === id)) {
   setActiveTopicId(id);
  }
  if (t === 'dimension' || t === 'profile' || t === 'practice') setTab(t);
  if (Number.isInteger(st) && st >= 0) setStepIdx(st);
  if (Number.isInteger(dm) && dm >= 0) setDimIdx(dm);
  if (Number.isInteger(qi) && qi >= 0) setQIndex(qi);
 }, [topics]);

 useEffect(() => () => gradeAbortRef.current?.abort(), []);

 const topic = useMemo(
  () => topicList.find(t => t.id === activeTopicId) ?? topicList[0] ?? null,
  [topicList, activeTopicId],
 );

 const structured = Boolean(topic && hasStructuredStudyQuizzes(topic.report));
 const roadmap = topic?.report.roadmap ?? [];
 const dimensions = topic?.report.dimensions ?? [];
 const safeStepIdx = Math.min(stepIdx, Math.max(0, roadmap.length - 1));
 const activeStep = roadmap[safeStepIdx] ?? null;

 const allIndexedQuizzes = useMemo<IndexedStudyQuiz[]>(() => {
  if (!topic) return [];
  const out: IndexedStudyQuiz[] = [];
  topic.report.roadmap.forEach((step, si) => {
   (step.quizzes ?? []).forEach(quiz => {
    out.push({
     stepIdx: si,
     stepPhase: step.phase,
     stepTitle: step.title,
     quiz,
     key: `${topic.id}:s${si}:${quiz.id}`,
    });
   });
  });
  return out;
 }, [topic]);

 const quizzesByDim = useMemo<IndexedStudyQuiz[][]>(() => {
  if (!dimensions.length) return [];
  const buckets: IndexedStudyQuiz[][] = dimensions.map(() => []);
  for (const entry of allIndexedQuizzes) {
   const idx = matchQuizToDimensionIndex(entry, dimensions);
   if (idx >= 0 && idx < buckets.length) buckets[idx].push(entry);
  }
  return buckets;
 }, [allIndexedQuizzes, dimensions]);

 const safeDimIdx = Math.min(dimIdx, Math.max(0, dimensions.length - 1));
 const activeDim = dimensions[safeDimIdx] ?? null;

 const activeEntries: IndexedStudyQuiz[] = useMemo(() => {
  if (tab === 'dimension') return quizzesByDim[safeDimIdx] ?? [];
  return allIndexedQuizzes.filter(e => e.stepIdx === safeStepIdx);
 }, [tab, quizzesByDim, safeDimIdx, allIndexedQuizzes, safeStepIdx]);

 // Legacy fallback data
 const legacyQuestions = topic?.report.questions ?? [];
 const safeLegacyIdx = Math.min(qIndex, Math.max(0, legacyQuestions.length - 1));
 const legacyQ = legacyQuestions[safeLegacyIdx] ?? null;
 const legacyKey = topic && legacyQ ? `${topic.id}:${safeLegacyIdx}` : '';
 const legacyMastered = Boolean(legacyKey && passed.has(legacyKey));
 const legacyDraft = legacyKey ? legacyDrafts[legacyKey] ?? '' : '';
 const legacyGrade = legacyKey ? legacyGrades[legacyKey] : undefined;

 // Structured study data (shared between 路径刷题 and 画像刷题)
 const safeQIdx = Math.min(qIndex, Math.max(0, activeEntries.length - 1));
 const currentEntry = activeEntries[safeQIdx] ?? null;
 const currentQuiz = currentEntry?.quiz ?? null;
 const studyKey = currentEntry?.key ?? '';

 const topicTotal = topic ? countJdStudyQuizzes(topic.report) : 0;
 const topicMasteredCount = useMemo(() => {
  if (!topic) return 0;
  const prefix = `${topic.id}:`;
  let n = 0;
  for (const k of passed) if (k.startsWith(prefix)) n++;
  return Math.min(topicTotal, n);
 }, [topic, passed, topicTotal]);

 const updateSession = (fn: (prev: StoredStepSession) => StoredStepSession) => {
  setSession(prev => {
   const next = fn(prev);
   sessionRef.current = next;
   saveSession(username, next);
   return next;
  });
 };

 const flushSession = () => {
  saveSession(username, sessionRef.current);
 };

 const stopGrade = () => {
  gradeAbortRef.current?.abort();
  gradeAbortRef.current = null;
  setGrading(false);
  setLiveResult(null);
  setLiveThink(null);
 };

 const syncUrl = (tid: string, nextTab: ViewTab, st: number, dm: number, qi: number) => {
  const qs = new URLSearchParams({ id: tid });
  if (nextTab !== 'practice') qs.set('tab', nextTab);
  if (nextTab === 'practice' && st > 0) qs.set('step', String(st));
  if (nextTab === 'dimension' && dm > 0) qs.set('dim', String(dm));
  if (qi > 0) qs.set('q', String(qi));
  window.history.replaceState(null, '', `/learn/jd-special?${qs.toString()}`);
 };

 const switchTopic = (id: string) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setActiveTopicId(id);
  setStepIdx(0);
  setDimIdx(0);
  setQIndex(0);
  setTab('practice');
  syncUrl(id, 'practice', 0, 0, 0);
 };

 const switchTab = (nextTab: ViewTab) => {
  setTab(nextTab);
  if (nextTab === 'dimension') {
   const firstNonEmpty = quizzesByDim[safeDimIdx]?.length ? safeDimIdx : Math.max(0, quizzesByDim.findIndex(b => b.length > 0));
   setDimIdx(firstNonEmpty);
   setQIndex(0);
   if (topic) syncUrl(topic.id, 'dimension', safeStepIdx, firstNonEmpty, 0);
   return;
  }
  if (nextTab === 'practice') {
   setQIndex(0);
   if (topic) syncUrl(topic.id, 'practice', safeStepIdx, safeDimIdx, 0);
   return;
  }
  if (topic) syncUrl(topic.id, 'profile', safeStepIdx, safeDimIdx, 0);
 };

 const switchStep = (nextStep: number) => {
  setStepIdx(nextStep);
  setQIndex(0);
  if (topic) syncUrl(topic.id, 'practice', nextStep, safeDimIdx, 0);
 };

 const switchDim = (nextDim: number) => {
  setTab('dimension');
  setDimIdx(nextDim);
  setQIndex(0);
  if (topic) syncUrl(topic.id, 'dimension', safeStepIdx, nextDim, 0);
 };

 const switchQuestion = (idx: number) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setQIndex(idx);
  if (topic) syncUrl(topic.id, tab, safeStepIdx, safeDimIdx, idx);
 };

 const handleStructuredAnswer = (res: Result) => {
  if (!studyKey) return;
  updateSession(prev => {
   const drafts = { ...prev.drafts };
   delete drafts[studyKey];
   return {
    ...prev,
    results: { ...prev.results, [studyKey]: res },
    drafts,
   };
  });
  if (res.correct) {
   setPassed(prev => {
    if (prev.has(studyKey)) return prev;
    const next = new Set(prev);
    next.add(studyKey);
    persistPassed(username, next);
    return next;
   });
  }
 };

 const handleStructuredDraft = (val: string) => {
  if (!studyKey) return;
  updateSession(prev => {
   const drafts = { ...prev.drafts };
   if (val.trim()) drafts[studyKey] = val;
   else delete drafts[studyKey];
   return { ...prev, drafts };
  });
 };

 const resetCurrentGroupProgress = () => {
  if (!topic || !activeEntries.length) return;
  const keys = activeEntries.map(e => e.key);
  updateSession(prev => {
   const results = { ...prev.results };
   const drafts = { ...prev.drafts };
   for (const k of keys) {
    delete results[k];
    delete drafts[k];
   }
   return { ...prev, results, drafts };
  });
  setQIndex(0);
  syncUrl(topic.id, tab, safeStepIdx, safeDimIdx, 0);
 };

 const regenerateCurrentQuiz = async () => {
  if (!topic || !currentEntry || regenKey) return;
  const targetKey = currentEntry.key;
  setRegenKey(targetKey);
  setRegenErr('');
  try {
   const r = await fetch('/api/jd-research/regenerate-quiz', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: topic.id,
     stepIdx: currentEntry.stepIdx,
     quizId: currentEntry.quiz.id,
     geminiProxy: getGeminiAutoProxy(),
    }),
   });
   const d = (await r.json()) as {
    ok?: boolean;
    report?: JdResearchReport;
    usage?: AntigravityUsage;
    error?: string;
   };
   if (!r.ok || !d.ok || !d.report) {
    throw new Error(d.error || L('重出题目失败，请重试', 'Regeneration failed'));
   }
   setTopicList(prev =>
    prev.map(t => (t.id === topic.id ? { ...t, report: d.report!, usage: d.usage ?? t.usage } : t)),
   );
   updateSession(prev => {
    const results = { ...prev.results };
    const drafts = { ...prev.drafts };
    const orders = { ...prev.orders };
    delete results[targetKey];
    delete drafts[targetKey];
    delete orders[targetKey];
    return { ...prev, results, drafts, orders };
   });
   setPassed(prev => {
    if (!prev.has(targetKey)) return prev;
    const next = new Set(prev);
    next.delete(targetKey);
    persistPassed(username, next);
    return next;
   });
   setRegenNonce(prev => ({ ...prev, [targetKey]: (prev[targetKey] || 0) + 1 }));
  } catch (e) {
   setRegenErr((e as Error).message || L('重出题目失败，请重试', 'Regeneration failed'));
  } finally {
   setRegenKey('');
  }
 };

 const fillMissingPhase = async (targetStepIdx: number) => {
  if (!topic || fillingStepIdx !== null) return;
  setFillingStepIdx(targetStepIdx);
  setFillErr('');
  try {
   const r = await fetch('/api/jd-research/fill-phase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: topic.id,
     stepIdx: targetStepIdx,
     geminiProxy: getGeminiAutoProxy(),
    }),
   });
   if (!r.ok || !r.body) {
    let msg = L('补题失败，请重试', 'Generation failed');
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
   let doneUsage: AntigravityUsage | undefined;
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
      ok?: boolean;
      report?: JdResearchReport;
      usage?: AntigravityUsage;
      error?: string;
     };
     try {
      ev = JSON.parse(line) as typeof ev;
     } catch {
      continue;
     }
     if (ev.type === 'error') {
      throw new Error(ev.error || L('补题失败，请重试', 'Generation failed'));
     }
     if (ev.type === 'done' && ev.report) {
      doneReport = ev.report;
      doneUsage = ev.usage;
     }
    }
   }
   if (!doneReport) {
    throw new Error(L('补题未返回完整题库，请再试一次', 'Incomplete result — please try again'));
   }
   setTopicList(prev =>
    prev.map(t =>
     t.id === topic.id ? { ...t, report: doneReport!, usage: doneUsage ?? t.usage } : t,
    ),
   );
   setQIndex(0);
   syncUrl(topic.id, tab, safeStepIdx, safeDimIdx, 0);
  } catch (e) {
   setFillErr((e as Error).message || L('补题失败，请重试', 'Generation failed'));
  } finally {
   setFillingStepIdx(null);
  }
 };

 const toggleLegacyMastered = () => {
  if (!legacyKey) return;
  setPassed(prev => {
   const next = new Set(prev);
   if (next.has(legacyKey)) next.delete(legacyKey);
   else next.add(legacyKey);
   persistPassed(username, next);
   return next;
  });
 };

 const runLegacyAiGrade = async () => {
  if (!legacyQ || !legacyKey || grading) return;
  const ans = legacyDraft.trim();
  if (!ans) {
   setGradeErr(L('请先写下你的回答再评分', 'Write your answer first'));
   return;
  }
  stopGrade();
  setGradeErr('');
  setGrading(true);
  const ctl = new AbortController();
  gradeAbortRef.current = ctl;

  const item: GradeItem = {
   id: legacyKey.slice(0, 80),
   kind: 'short',
   q: legacyQ.title.slice(0, 4000),
   reference: legacyQ.answer.slice(0, 12000),
   points: [
    legacyQ.whyAsked ? `准确回应考察点：${legacyQ.whyAsked}` : '核心原理与关键机制表述准确',
    '边界条件、并发/性能或工程落地方案清晰',
   ],
   max: 10,
   answer: ans.slice(0, 8000),
  };

  const out = await requestGrade(
   [item],
   partial => {
    if (partial[0]) setLiveResult(partial[0]);
   },
   undefined,
   th => setLiveThink(th),
   ctl.signal,
  );

  if (ctl.signal.aborted) {
   stopGrade();
   return;
  }

  setGrading(false);
  setLiveResult(null);
  setLiveThink(null);
  if (!out.ok) {
   if (!out.aborted) setGradeErr(out.message || L('评分失败，请重试', 'Grading failed'));
   return;
  }
  const res = out.results[0];
  if (res) {
   setLegacyGrades(m => ({
    ...m,
    [legacyKey]: {
     result: res,
     model: out.model,
     remaining: out.remaining,
     think: out.think,
     thinkSecs: out.thinkSecs,
    },
   }));
   setShowAns(true);
   if (res.score >= 8 && !passed.has(legacyKey)) {
    setPassed(prev => {
     const next = new Set(prev);
     next.add(legacyKey);
     persistPassed(username, next);
     return next;
    });
   }
  }
 };

 const legacyBlocks = useMemo(() => (legacyQ ? answerBlocks(legacyQ.answer) : []), [legacyQ]);

 const currentStudyItem: Item | null = useMemo(() => {
  if (!topic || !currentEntry || !studyKey) return null;
  return {
   id: studyKey,
   level: `${topic.id}:s${currentEntry.stepIdx}`,
   quiz: currentEntry.quiz,
   order: stableOrder(currentEntry.quiz, session.orders[studyKey]),
  };
 }, [topic, currentEntry, studyKey, session.orders]);

 const activeAnsweredCount = useMemo(() => {
  if (!activeEntries.length) return 0;
  return activeEntries.filter(e => Boolean(session.results[e.key])).length;
 }, [activeEntries, session.results]);

 return (
  <div className="ai-shell">
   <SiteHeader active="learn" username={username} />
   <main className="ai-main jds-main">
    <div className="arch-top">
     <a href="/learn" className="arch-back">
      <ArrowLeft size={16} />
      {L('返回学习', 'Back to Learn')}
     </a>
     <a href="/interview/jd-research?new=1" className="button secondary arch-new-btn">
      <Plus size={14} />
      <span>{L('生成新专题', 'New JD Topic')}</span>
     </a>
    </div>

    {!topic ? (
     <div className="ai-card jds-empty">
      <Compass size={32} style={{ color: 'var(--primary)' }} />
      <h2>{L('暂无 JD / 面经专题', 'No JD topics yet')}</h2>
      <a href="/interview/jd-research?new=1" className="button primary">
       <Compass size={15} />
       <span>{L('前往生成专题', 'Generate Topic')}</span>
      </a>
     </div>
    ) : (
     <>
      {topicList.length > 1 && (
       <div className="jdr-history-bar" aria-label={L('切换专题', 'Topics')}>
        {topicList.map(t => {
         const tot = countJdStudyQuizzes(t.report);
         const prefix = `${t.id}:`;
         let done = 0;
         for (const k of passed) if (k.startsWith(prefix)) done++;
         done = Math.min(tot, done);
         return (
          <button
           key={t.id}
           type="button"
           className={'jdr-hist-chip' + (t.id === topic.id ? ' on' : '')}
           onClick={() => switchTopic(t.id)}
          >
           <span>{t.title}</span>
           <small style={{ opacity: 0.72 }}>
            {done}/{tot}
           </small>
          </button>
         );
        })}
       </div>
      )}

      <section className="ai-card jds-head">
       <div className="jds-head-row">
        <div className="jdr-head-title">
         <h1>{topic.title}</h1>
         <div className="jdr-head-tags">
          {topic.report.inferredLevel && <span className="jdr-style-tag">{topic.report.inferredLevel}</span>}
          {topic.report.prepDays && <span className="jdr-style-tag">{topic.report.prepDays}</span>}
          {topic.report.companyStyle && <span className="jdr-style-tag">{topic.report.companyStyle}</span>}
          {topic.usage && topic.usage.totalTokens > 0 && (
           <span
            className="jdr-model-pill"
            title={L(
             `输入 ${fmtTok(topic.usage.inputTokens)} · 缓存 ${fmtTok(topic.usage.cachedTokens)} · 输出 ${fmtTok(topic.usage.outputTokens)}${topic.usage.thoughtTokens > 0 ? ` · 思考 ${fmtTok(topic.usage.thoughtTokens)}` : ''}`,
             `In ${fmtTok(topic.usage.inputTokens)} · Cache ${fmtTok(topic.usage.cachedTokens)} · Out ${fmtTok(topic.usage.outputTokens)}`,
            )}
           >
            {L(`总消耗 ${fmtTok(topic.usage.totalTokens)} Token`, `${fmtTok(topic.usage.totalTokens)} Tokens`)}
           </span>
          )}
          {typeof topic.durationMs === 'number' && topic.durationMs > 0 && (
           <span className="jdr-model-pill">
            <Clock size={12} />
            <span>{L(`总耗时 ${fmtDuration(topic.durationMs, false)}`, `Time ${fmtDuration(topic.durationMs, true)}`)}</span>
           </span>
          )}
          {topic.cached ? (
           <span className="jdr-cache-tag">
            <Zap size={12} />
            {L('缓存命中 100% · 0 Token', 'Cache Hit 100%')}
           </span>
          ) : (topic.stage1Cached || (topic.usage && topic.usage.totalTokens > 0)) ? (
           <span
            className="jdr-cache-tag"
            title={
             topic.usage && topic.usage.inputTokens > 0
              ? L(
                 `命中缓存 ${fmtTok(topic.usage.cachedTokens)} / 总输入 ${fmtTok(topic.usage.inputTokens)} Token`,
                 `Cached ${fmtTok(topic.usage.cachedTokens)} / Input ${fmtTok(topic.usage.inputTokens)}`,
                )
              : undefined
            }
           >
            <Zap size={12} />
            {(() => {
             const cTok = topic.usage?.cachedTokens ?? 0;
             const inTok = topic.usage?.inputTokens ?? 0;
             const pct = inTok > 0 ? Math.min(100, Math.round((cTok / inTok) * 100)) : 0;
             if (cTok > 0) {
              return L(
               `缓存命中 ${fmtTok(cTok)} Token (${pct}%)${topic.stage1Cached ? ' + 阶段一缓存' : ''}`,
               `Cached ${fmtTok(cTok)} (${pct}%)${topic.stage1Cached ? ' + S1' : ''}`,
              );
             }
             if (topic.stage1Cached) {
              return L('阶段一缓存命中', 'Stage 1 Cache Hit');
             }
             return L('缓存命中 0 Token (0%)', 'Cached 0 (0%)');
            })()}
           </span>
          ) : null}
         </div>
        </div>
        <a
         href={`/interview/jd-research?id=${encodeURIComponent(topic.id)}`}
         className="button secondary arch-new-btn"
        >
         <span>{L('面试专题题库', 'Interview Bank')}</span>
         <ArrowUpRight size={14} />
        </a>
       </div>

       <div className="jds-prog-row">
        <Progress value={topicTotal ? (topicMasteredCount / topicTotal) * 100 : 0} />
        <span>
         {L(`已掌握 ${topicMasteredCount} / ${topicTotal} 题`, `${topicMasteredCount} / ${topicTotal}`)}
        </span>
       </div>

       {topic.source && topic.source.trim() && (
        <div className="arch-thoughts">
         <button
          type="button"
          className="arch-thoughts-btn"
          onClick={() => setJdOpen(v => !v)}
         >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
           <FileText size={13} />
           {topic.kind === 'experience' ? L('原始面经', 'Interview Log') : L('岗位 JD', 'Job Description')}
          </span>
          {jdOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
         </button>
         {jdOpen && <pre className="arch-thoughts-body">{topic.source}</pre>}
        </div>
       )}
      </section>

      <div className="jdr-tabs" role="tablist">
       <button
        type="button"
        role="tab"
        aria-selected={tab === 'practice'}
        className={tab === 'practice' ? 'on' : ''}
        onClick={() => switchTab('practice')}
       >
        <BookOpen size={14} />
        <span>{L(`路径刷题 (${topicTotal})`, `By Path (${topicTotal})`)}</span>
       </button>
       {structured && dimensions.length > 0 && (
        <button
         type="button"
         role="tab"
         aria-selected={tab === 'dimension'}
         className={tab === 'dimension' ? 'on' : ''}
         onClick={() => switchTab('dimension')}
        >
         <Target size={14} />
         <span>{L(`画像刷题 (${topicTotal})`, `By Skill (${topicTotal})`)}</span>
        </button>
       )}
       <button
        type="button"
        role="tab"
        aria-selected={tab === 'profile'}
        className={tab === 'profile' ? 'on' : ''}
        onClick={() => switchTab('profile')}
       >
        <Compass size={14} />
        <span>{L('考点画像', 'Profile')}</span>
       </button>
      </div>

      {(tab === 'practice' || tab === 'dimension') && structured && (
       <>
        {tab === 'practice' ? (
         <>
          <div className="jds-paths" role="tablist" aria-label={L('复习路径', 'Roadmap paths')}>
           {roadmap.map((s, si) => {
            const qs = s.quizzes ?? [];
            const done = qs.filter(qz => passed.has(`${topic.id}:s${si}:${qz.id}`)).length;
            const allDone = qs.length > 0 && done === qs.length;
            return (
             <button
              key={si}
              type="button"
              role="tab"
              aria-selected={si === safeStepIdx}
              className={'jds-path-btn' + (si === safeStepIdx ? ' on' : '') + (allDone ? ' done' : '')}
              onClick={() => switchStep(si)}
             >
              <span>{s.phase}</span>
              <span>{s.title}</span>
              <em>{qs.length > 0 ? `${done}/${qs.length}` : '0'}</em>
             </button>
            );
           })}
          </div>

          {activeStep && (
           <section className="ai-card jds-path-meta">
            <div className="jds-path-top">
             <div className="jdr-step-head">
              <span className="jdr-phase">{activeStep.phase}</span>
              <strong>{activeStep.title}</strong>
             </div>
             {activeAnsweredCount > 0 && (
              <button type="button" className="ai-note-pill" onClick={resetCurrentGroupProgress}>
               <RotateCcw size={12} />
               <span>{L('重做本阶段', 'Reset Phase')}</span>
              </button>
             )}
            </div>
            {activeStep.goals.length > 0 && (
             <ul className="jdr-goals">
              {activeStep.goals.map((g, gi) => (
               <li key={gi}>{g}</li>
              ))}
             </ul>
            )}
            {activeStep.siteLinks.length > 0 && (
             <div className="jdr-links">
              {activeStep.siteLinks.map(lk => (
               <a key={lk.href} href={lk.href} className="jdr-link-pill">
                <span>{lk.label}</span>
                <ArrowUpRight size={13} />
               </a>
              ))}
             </div>
            )}
           </section>
          )}
         </>
        ) : (
         <>
          <div className="jds-paths" role="tablist" aria-label={L('考点画像维度', 'Skill dimensions')}>
           {dimensions.map((d, di) => {
            const qs = quizzesByDim[di] ?? [];
            const done = qs.filter(e => passed.has(e.key)).length;
            const allDone = qs.length > 0 && done === qs.length;
            return (
             <button
              key={di}
              type="button"
              role="tab"
              aria-selected={di === safeDimIdx}
              className={'jds-path-btn' + (di === safeDimIdx ? ' on' : '') + (allDone ? ' done' : '')}
              onClick={() => switchDim(di)}
             >
              <span>
               {d.priority} · {d.weight}%
              </span>
              <span>{d.name}</span>
              <em>
               {done}/{qs.length}
              </em>
             </button>
            );
           })}
          </div>

          {activeDim && (
           <section className="ai-card jds-path-meta">
            <div className="jds-path-top">
             <div className="jdr-step-head">
              <span className={'jdr-prio ' + activeDim.priority}>{activeDim.priority}</span>
              <strong>{activeDim.name}</strong>
              <span className="jdr-dim-pct">{activeDim.weight}%</span>
             </div>
             {activeAnsweredCount > 0 && (
              <button type="button" className="ai-note-pill" onClick={resetCurrentGroupProgress}>
               <RotateCcw size={12} />
               <span>{L('重做本维度', 'Reset')}</span>
              </button>
             )}
            </div>
            {activeDim.focus && <p className="jdr-dim-focus">{activeDim.focus}</p>}
           </section>
          )}
         </>
        )}

        {activeEntries.length > 0 && currentStudyItem && currentEntry ? (
         <>
          <div className="jds-qbar-row">
           <div className="jds-qnums" aria-label={L('题号切换', 'Question index')}>
            {activeEntries.map((entry, i) => {
             const res = session.results[entry.key];
             const typeLbl = aiQuizTypes[entry.quiz.type ?? 'single'];
             return (
              <button
               key={entry.key}
               type="button"
               className={
                'jds-qnum' +
                (i === safeQIdx ? ' cur' : '') +
                (res ? (res.correct ? ' done' : ' wrong') : '')
               }
               onClick={() => switchQuestion(i)}
              >
               {res && (res.correct ? <Check size={12} /> : <X size={12} />)}
               <span>{i + 1}</span>
               <small>{typeLbl}</small>
              </button>
             );
            })}
           </div>
           <span className="jds-num" style={{ fontSize: 12.5, color: 'var(--quiet)', fontWeight: 650 }}>
            {safeQIdx + 1} / {activeEntries.length}
           </span>
          </div>

          {regenErr && (
           <p className="ai-grade-error" style={{ margin: 0 }}>
            {regenErr}
           </p>
          )}

          <QuestionCard
           key={`${studyKey}:${regenNonce[studyKey] || 0}`}
           item={currentStudyItem}
           label={
            tab === 'dimension' && activeDim
             ? `${activeDim.name} · ${currentEntry.stepPhase}`
             : `${currentEntry.stepPhase} · ${currentEntry.stepTitle}`
           }
           result={session.results[studyKey] ?? null}
           draft={session.drafts[studyKey]}
           onDraftChange={handleStructuredDraft}
           last={safeQIdx === activeEntries.length - 1}
           onAnswer={handleStructuredAnswer}
           onRegenerate={() => void regenerateCurrentQuiz()}
           regenerating={regenKey === studyKey}
           onPrev={safeQIdx > 0 ? () => switchQuestion(safeQIdx - 1) : undefined}
           onNext={() => {
            if (safeQIdx < activeEntries.length - 1) {
             switchQuestion(safeQIdx + 1);
            } else if (tab === 'practice' && safeStepIdx < roadmap.length - 1) {
             switchStep(safeStepIdx + 1);
            } else if (tab === 'dimension') {
             const nextDim = quizzesByDim.findIndex((b, idx) => idx > safeDimIdx && b.length > 0);
             if (nextDim >= 0) switchDim(nextDim);
            }
           }}
           noteBackHref={
            tab === 'dimension'
             ? `/learn/jd-special?id=${encodeURIComponent(topic.id)}&tab=dimension&dim=${safeDimIdx}&q=${safeQIdx}`
             : `/learn/jd-special?id=${encodeURIComponent(topic.id)}&step=${safeStepIdx}&q=${safeQIdx}`
           }
           onBeforeNoteLeave={flushSession}
           playground={{
            subjectName: topic.title.slice(0, 24),
            levelTitle:
             tab === 'dimension' && activeDim
              ? activeDim.name
              : `${currentEntry.stepPhase} · ${currentEntry.stepTitle}`,
            hintLang: subjectHintLang(topic.report.recommendedSubject),
            backHref:
             tab === 'dimension'
              ? `/learn/jd-special?id=${encodeURIComponent(topic.id)}&tab=dimension&dim=${safeDimIdx}&q=${safeQIdx}`
              : `/learn/jd-special?id=${encodeURIComponent(topic.id)}&step=${safeStepIdx}&q=${safeQIdx}`,
           }}
          />
         </>
        ) : tab === 'practice' ? (
         <div className="ai-card jds-empty">
          <p>{L('本阶段暂无学习题', 'No quizzes for this phase')}</p>
          <button
           type="button"
           className="button primary arch-new-btn"
           disabled={fillingStepIdx !== null}
           onClick={() => void fillMissingPhase(safeStepIdx)}
          >
           {fillingStepIdx === safeStepIdx ? (
            <Loader2 size={14} className="ai-spin" />
           ) : (
            <RotateCcw size={14} />
           )}
           <span>
            {fillingStepIdx === safeStepIdx
             ? L('补题中…', 'Generating…')
             : L('AI 补题', 'Generate Quizzes')}
           </span>
          </button>
          {fillErr && (
           <p className="ai-grade-error" style={{ margin: 0 }}>
            {fillErr}
           </p>
          )}
         </div>
        ) : (
         <div className="ai-card jds-empty">
          <p>{L('该维度暂无匹配题目', 'No quizzes in this dimension')}</p>
          {(() => {
           const missingIdx = roadmap.findIndex(s => (s.quizzes?.length ?? 0) === 0);
           if (missingIdx < 0) return null;
           return (
            <button
             type="button"
             className="button primary arch-new-btn"
             disabled={fillingStepIdx !== null}
             onClick={() => void fillMissingPhase(missingIdx)}
            >
             {fillingStepIdx === missingIdx ? (
              <Loader2 size={14} className="ai-spin" />
             ) : (
              <RotateCcw size={14} />
             )}
             <span>
              {fillingStepIdx === missingIdx
               ? L('补题中…', 'Generating…')
               : L('AI 补题', 'Generate Quizzes')}
             </span>
            </button>
           );
          })()}
          {fillErr && (
           <p className="ai-grade-error" style={{ margin: 0 }}>
            {fillErr}
           </p>
          )}
         </div>
        )}
       </>
      )}

      {tab === 'practice' && !structured && legacyQ && (
       <>
        <div className="jds-qnums" aria-label={L('题号切换', 'Question index')}>
         {legacyQuestions.map((_, i) => {
          const done = passed.has(`${topic.id}:${i}`);
          return (
           <button
            key={i}
            type="button"
            className={'jds-qnum' + (i === safeLegacyIdx ? ' cur' : '') + (done ? ' done' : '')}
            onClick={() => switchQuestion(i)}
           >
            {done && <Check size={12} />}
            <span>{i + 1}</span>
           </button>
          );
         })}
        </div>

        <CardSideNav
         showArrows={legacyQuestions.length > 1}
         onPrev={safeLegacyIdx > 0 ? () => switchQuestion(safeLegacyIdx - 1) : undefined}
         onNext={safeLegacyIdx < legacyQuestions.length - 1 ? () => switchQuestion(safeLegacyIdx + 1) : undefined}
         prevLabel={L('上一题', 'Previous')}
         nextLabel={L('下一题', 'Next')}
        >
         <article className="ai-card jds-card">
          <div className="jds-card-meta">
           <span className={'jdr-diff ' + legacyQ.difficulty}>{legacyQ.difficulty}</span>
           <span className="jdr-qtag">{legacyQ.section}</span>
           <AddToNoteButton
            compact
            title={legacyQ.title.slice(0, 64)}
            questionOnly={`### ${legacyQ.title}`}
            questionAndAnswer={`### ${legacyQ.title}\n\n${legacyQ.answer}${legacyQ.followups.length ? `\n\n**常见追问**：\n${legacyQ.followups.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}`}
            source={{
             kind: 'learn',
             label: `${topic.title.slice(0, 18)} · ${legacyQ.section}`,
             href: `/learn/jd-special?id=${encodeURIComponent(topic.id)}&q=${safeLegacyIdx}`,
            }}
           />
           <a
            href={`/interview/architect?mode=mock&topic=${encodeURIComponent(legacyQ.title)}`}
            className="ai-note-pill"
            style={{ textDecoration: 'none' }}
           >
            <MessageSquare size={13} />
            <span>{L('模拟面试', 'Mock')}</span>
            <ExternalLink size={11} />
           </a>
           <span className="jds-num">
            {String(safeLegacyIdx + 1).padStart(2, '0')} / {legacyQuestions.length}
           </span>
          </div>

          <h2>{legacyQ.title}</h2>
          {legacyQ.whyAsked && <p className="jds-why">{legacyQ.whyAsked}</p>}

          <div className="jds-write">
           {grading || legacyGrade ? (
            <AnnotatedAnswerBox
             answer={legacyDraft}
             result={grading ? liveResult : legacyGrade?.result ?? null}
             waiting={grading}
             live={grading}
             remaining={legacyGrade?.remaining}
             model={legacyGrade?.model}
             think={grading ? liveThink?.text : legacyGrade?.think}
             thinkSecs={grading ? liveThink?.secs : legacyGrade?.thinkSecs}
             thinking={Boolean(grading && liveThink?.live)}
             onStop={grading ? stopGrade : undefined}
             onEdit={
              !grading
               ? () =>
                  setLegacyGrades(m => {
                   const next = { ...m };
                   delete next[legacyKey];
                   return next;
                  })
               : undefined
             }
            />
           ) : (
            <textarea
             rows={4}
             value={legacyDraft}
             onChange={e => {
              const v = e.target.value;
              setLegacyDrafts(m => ({ ...m, [legacyKey]: v }));
              if (gradeErr) setGradeErr('');
             }}
             placeholder={L('写下你的回答思路…', 'Write your answer…')}
            />
           )}

           {gradeErr && (
            <p className="ai-grade-error" style={{ margin: 0 }}>
             {gradeErr}
            </p>
           )}

           <div className="jds-write-bar">
            {grading ? (
             <button type="button" className="button secondary arch-new-btn" onClick={stopGrade}>
              <Square size={12} fill="currentColor" />
              <span>{L('停止评分', 'Stop')}</span>
             </button>
            ) : (
             <button
              type="button"
              className="button primary arch-new-btn"
              disabled={!legacyDraft.trim()}
              onClick={() => void runLegacyAiGrade()}
             >
              <Sparkles size={14} />
              <span>{legacyGrade ? L('重新 AI 评分', 'Re-grade') : L('AI 评分', 'AI Grade')}</span>
             </button>
            )}

            <button
             type="button"
             className="button secondary arch-new-btn"
             onClick={() => setShowAns(v => !v)}
            >
             {showAns ? <EyeOff size={14} /> : <Eye size={14} />}
             <span>{showAns ? L('隐藏参考答案', 'Hide Answer') : L('查看参考答案', 'Show Answer')}</span>
            </button>

            <button
             type="button"
             className={(legacyMastered ? 'button primary' : 'button secondary') + ' arch-new-btn jds-master-btn'}
             onClick={toggleLegacyMastered}
            >
             <CheckCircle2 size={14} />
             <span>{legacyMastered ? L('已掌握', 'Mastered') : L('标记已掌握', 'Mark Mastered')}</span>
            </button>
           </div>
          </div>

          {showAns && (
           <div className="jds-ans">
            <div className="jds-ans-head">
             <span>
              <BookOpen size={15} />
              {L('参考答案', 'Answer')}
             </span>
            </div>
            <div className="jds-ans-body">
             {legacyBlocks.map((b, bi) =>
              b.type === 'code' ? (
               <pre key={bi}>
                <code>{b.text}</code>
               </pre>
              ) : (
               <p key={bi}>
                <Annotated text={b.text} />
               </p>
              ),
             )}
            </div>
            {legacyQ.followups.length > 0 && (
             <div className="jdr-followups">
              <strong>{L('常见追问', 'Follow-ups')}</strong>
              <ul>
               {legacyQ.followups.map((f, fi) => (
                <li key={fi}>{f}</li>
               ))}
              </ul>
             </div>
            )}
           </div>
          )}
         </article>
        </CardSideNav>

        <AiDock
         chatKey={`jd-special:${legacyKey}`}
         context={{
          kind: 'recite',
          quiz: {
           type: L('JD 专题题', 'JD Topic'),
           q: legacyQ.title.slice(0, 4000),
           answer: legacyQ.answer.slice(0, 12000),
           explain: [topic.title, legacyQ.section, legacyQ.whyAsked].filter(Boolean).join(' · ').slice(0, 2000),
          },
         }}
         hello={L('可以问我这道题的核心原理、工程细节或追问。', 'Ask me about this question, concepts, or follow-ups.')}
         prompts={[
          L('这道题怎么答更有架构深度？', 'How to answer with senior depth?'),
          L('用通俗例子讲透底层原理', 'Explain with a clear example'),
          L('面试官还会怎么连环追问？', 'What follow-ups should I prepare?'),
         ]}
         noteBackHref={`/learn/jd-special?id=${encodeURIComponent(topic.id)}&q=${safeLegacyIdx}`}
        />
       </>
      )}

      {tab === 'profile' && (
       <section className="jdr-panel">
        <div className="jdr-dim-list">
         {topic.report.dimensions.map((d, i) => {
          const qs = quizzesByDim[i] ?? [];
          return (
           <div key={i} className="ai-card jdr-dim-card">
            <div className="jdr-dim-top">
             <span className="jdr-dim-name">
              <span className={'jdr-prio ' + d.priority}>{d.priority}</span>
              <span>{d.name}</span>
             </span>
             <span className="jdr-dim-pct">{d.weight}%</span>
            </div>
            <div className="jdr-bar-track">
             <div className="jdr-bar-fill" style={{ width: `${Math.min(100, d.weight)}%` }} />
            </div>
            {d.focus && <p className="jdr-dim-focus">{d.focus}</p>}
            {structured && qs.length > 0 && (
             <div className="jdr-links">
              <button type="button" className="jdr-link-pill" onClick={() => switchDim(i)}>
               <span>{L(`按画像刷题 (${qs.length})`, `Practice (${qs.length})`)}</span>
               <ArrowUpRight size={13} />
              </button>
             </div>
            )}
           </div>
          );
         })}
        </div>

        {topic.report.traps.length > 0 && (
         <div className="ai-card jdr-traps">
          <h3>
           <AlertTriangle size={15} />
           <span>{L('高频扣分点', 'Common Pitfalls')}</span>
          </h3>
          <ul>
           {topic.report.traps.map((t, i) => (
            <li key={i}>{t}</li>
           ))}
          </ul>
         </div>
        )}

        {topic.source && topic.source.trim() && (
         <div className="ai-card jdr-traps">
          <h3>
           <FileText size={15} />
           <span>{topic.kind === 'experience' ? L('原始面经', 'Interview Log') : L('岗位 JD', 'Job Description')}</span>
          </h3>
          <pre className="arch-thoughts-body" style={{ maxHeight: 360 }}>
           {topic.source}
          </pre>
         </div>
        )}
       </section>
      )}
     </>
    )}
   </main>
  </div>
 );
}
