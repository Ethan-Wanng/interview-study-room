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
 Compass,
 ExternalLink,
 Eye,
 EyeOff,
 MessageSquare,
 Plus,
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
import { Annotated } from '../../interview/annotated';
import { AnnotatedAnswerBox } from '../../ai/grade-view';
import { requestGrade, type GradeThinkState } from '../../ai/grade-client';
import { useI18n } from '../../components/i18n';
import { aiQuizTypes, type AiQuiz } from '@/content/journey';
import { answerBlocks } from '@/lib/my-questions';
import type { PlaygroundLang } from '@/lib/playground-bridge';
import type { GradeItem, GradeResult } from '@/lib/grade-types';
import {
 countJdStudyQuizzes,
 hasStructuredStudyQuizzes,
 type JdResearchReport,
} from '@/lib/jd-research-types';

export type JdSpecialTopic = {
 id: string;
 title: string;
 updatedAt: number;
 report: JdResearchReport;
};

type ViewTab = 'practice' | 'profile';

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

 const [activeTopicId, setActiveTopicId] = useState<string>(topics[0]?.id || '');
 const [tab, setTab] = useState<ViewTab>('practice');
 const [stepIdx, setStepIdx] = useState(0);
 const [qIndex, setQIndex] = useState(0);
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
  const st = Number(sp.get('step'));
  const qi = Number(sp.get('q'));
  if (id && topics.some(t => t.id === id)) {
   setActiveTopicId(id);
  }
  if (Number.isInteger(st) && st >= 0) setStepIdx(st);
  if (Number.isInteger(qi) && qi >= 0) setQIndex(qi);
 }, [topics]);

 useEffect(() => () => gradeAbortRef.current?.abort(), []);

 const topic = useMemo(
  () => topics.find(t => t.id === activeTopicId) ?? topics[0] ?? null,
  [topics, activeTopicId],
 );

 const structured = Boolean(topic && hasStructuredStudyQuizzes(topic.report));
 const roadmap = topic?.report.roadmap ?? [];
 const safeStepIdx = Math.min(stepIdx, Math.max(0, roadmap.length - 1));
 const activeStep = roadmap[safeStepIdx] ?? null;
 const stepQuizzes = activeStep?.quizzes ?? [];

 // Legacy fallback data
 const legacyQuestions = topic?.report.questions ?? [];
 const safeLegacyIdx = Math.min(qIndex, Math.max(0, legacyQuestions.length - 1));
 const legacyQ = legacyQuestions[safeLegacyIdx] ?? null;
 const legacyKey = topic && legacyQ ? `${topic.id}:${safeLegacyIdx}` : '';
 const legacyMastered = Boolean(legacyKey && passed.has(legacyKey));
 const legacyDraft = legacyKey ? legacyDrafts[legacyKey] ?? '' : '';
 const legacyGrade = legacyKey ? legacyGrades[legacyKey] : undefined;

 // Structured study data
 const safeQIdx = Math.min(qIndex, Math.max(0, stepQuizzes.length - 1));
 const currentQuiz = stepQuizzes[safeQIdx] ?? null;
 const studyKey = topic && currentQuiz ? `${topic.id}:s${safeStepIdx}:${currentQuiz.id}` : '';

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

 const syncUrl = (tid: string, st: number, qi: number) => {
  const qs = new URLSearchParams({ id: tid });
  if (st > 0) qs.set('step', String(st));
  if (qi > 0) qs.set('q', String(qi));
  window.history.replaceState(null, '', `/learn/jd-special?${qs.toString()}`);
 };

 const switchTopic = (id: string) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setActiveTopicId(id);
  setStepIdx(0);
  setQIndex(0);
  setTab('practice');
  syncUrl(id, 0, 0);
 };

 const switchStep = (nextStep: number) => {
  setStepIdx(nextStep);
  setQIndex(0);
  if (topic) syncUrl(topic.id, nextStep, 0);
 };

 const switchQuestion = (idx: number) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setQIndex(idx);
  if (topic) syncUrl(topic.id, safeStepIdx, idx);
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

 const resetStepProgress = () => {
  if (!topic || !activeStep?.quizzes?.length) return;
  const keys = activeStep.quizzes.map(qz => `${topic.id}:s${safeStepIdx}:${qz.id}`);
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
  syncUrl(topic.id, safeStepIdx, 0);
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
  if (!topic || !currentQuiz || !studyKey) return null;
  return {
   id: studyKey,
   level: `${topic.id}:s${safeStepIdx}`,
   quiz: currentQuiz,
   order: stableOrder(currentQuiz, session.orders[studyKey]),
  };
 }, [topic, currentQuiz, studyKey, safeStepIdx, session.orders]);

 const stepAnsweredCount = useMemo(() => {
  if (!topic || !stepQuizzes.length) return 0;
  return stepQuizzes.filter(qz => Boolean(session.results[`${topic.id}:s${safeStepIdx}:${qz.id}`])).length;
 }, [topic, stepQuizzes, safeStepIdx, session.results]);

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
      {topics.length > 1 && (
       <div className="jdr-history-bar" aria-label={L('切换专题', 'Topics')}>
        {topics.map(t => {
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
      </section>

      <div className="jdr-tabs" role="tablist">
       <button
        type="button"
        role="tab"
        aria-selected={tab === 'practice'}
        className={tab === 'practice' ? 'on' : ''}
        onClick={() => setTab('practice')}
       >
        <BookOpen size={14} />
        <span>{L(`路径刷题 (${topicTotal})`, `Path Practice (${topicTotal})`)}</span>
       </button>
       <button
        type="button"
        role="tab"
        aria-selected={tab === 'profile'}
        className={tab === 'profile' ? 'on' : ''}
        onClick={() => setTab('profile')}
       >
        <Target size={14} />
        <span>{L('考点画像', 'Profile')}</span>
       </button>
      </div>

      {tab === 'practice' && structured && activeStep && (
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
            {qs.length > 0 && (
             <em>
              {done}/{qs.length}
             </em>
            )}
           </button>
          );
         })}
        </div>

        <section className="ai-card jds-path-meta">
         <div className="jds-path-top">
          <div className="jdr-step-head">
           <span className="jdr-phase">{activeStep.phase}</span>
           <strong>{activeStep.title}</strong>
          </div>
          {stepAnsweredCount > 0 && (
           <button type="button" className="ai-note-pill" onClick={resetStepProgress}>
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

        {stepQuizzes.length > 0 && currentStudyItem && (
         <>
          <div className="jds-qbar-row">
           <div className="jds-qnums" aria-label={L('题号切换', 'Question index')}>
            {stepQuizzes.map((qz, i) => {
             const k = `${topic.id}:s${safeStepIdx}:${qz.id}`;
             const res = session.results[k];
             const typeLbl = aiQuizTypes[qz.type ?? 'single'];
             return (
              <button
               key={qz.id}
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
            {safeQIdx + 1} / {stepQuizzes.length}
           </span>
          </div>

          <QuestionCard
           key={studyKey}
           item={currentStudyItem}
           label={`${activeStep.phase} · ${activeStep.title}`}
           result={session.results[studyKey] ?? null}
           draft={session.drafts[studyKey]}
           onDraftChange={handleStructuredDraft}
           last={safeQIdx === stepQuizzes.length - 1}
           onAnswer={handleStructuredAnswer}
           onPrev={safeQIdx > 0 ? () => switchQuestion(safeQIdx - 1) : undefined}
           onNext={() => {
            if (safeQIdx < stepQuizzes.length - 1) {
             switchQuestion(safeQIdx + 1);
            } else if (safeStepIdx < roadmap.length - 1) {
             switchStep(safeStepIdx + 1);
            }
           }}
           noteBackHref={`/learn/jd-special?id=${encodeURIComponent(topic.id)}&step=${safeStepIdx}&q=${safeQIdx}`}
           onBeforeNoteLeave={flushSession}
           playground={{
            subjectName: topic.title.slice(0, 24),
            levelTitle: `${activeStep.phase} · ${activeStep.title}`,
            hintLang: subjectHintLang(topic.report.recommendedSubject),
            backHref: `/learn/jd-special?id=${encodeURIComponent(topic.id)}&step=${safeStepIdx}&q=${safeQIdx}`,
           }}
          />
         </>
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
         {topic.report.dimensions.map((d, i) => (
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
          </div>
         ))}
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
       </section>
      )}
     </>
    )}
   </main>
  </div>
 );
}
