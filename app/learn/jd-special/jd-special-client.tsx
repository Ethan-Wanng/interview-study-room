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
 Sparkles,
 Square,
 Target,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import SiteHeader from '../../components/site-header';
import CardSideNav from '../../components/card-side-nav';
import AddToNoteButton from '../../components/add-to-note';
import AiDock from '../../ai/ai-dock';
import { Annotated } from '../../interview/annotated';
import { AnnotatedAnswerBox } from '../../ai/grade-view';
import { requestGrade, type GradeThinkState } from '../../ai/grade-client';
import { useI18n } from '../../components/i18n';
import { answerBlocks } from '@/lib/my-questions';
import type { GradeItem, GradeResult } from '@/lib/grade-types';
import type { JdResearchReport } from '@/lib/jd-research-types';

export type JdSpecialTopic = {
 id: string;
 title: string;
 updatedAt: number;
 report: JdResearchReport;
};

type ViewTab = 'practice' | 'roadmap' | 'profile';

const STORAGE_PREFIX = 'jd-special-journey:v1:';

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
 const [qIndex, setQIndex] = useState(0);
 const [passed, setPassed] = useState<Set<string>>(() => new Set());
 const [showAns, setShowAns] = useState(false);

 const [drafts, setDrafts] = useState<Record<string, string>>({});
 const [grades, setGrades] = useState<Record<string, { result: GradeResult; model?: string; think?: string; thinkSecs?: number }>>({});
 const [grading, setGrading] = useState(false);
 const [liveResult, setLiveResult] = useState<GradeResult | null>(null);
 const [liveThink, setLiveThink] = useState<GradeThinkState | null>(null);
 const [gradeErr, setGradeErr] = useState('');
 const gradeAbortRef = useRef<AbortController | null>(null);

 useEffect(() => {
  setPassed(loadPassed(username));
 }, [username]);

 useEffect(() => {
  const p = new URLSearchParams(window.location.search).get('id');
  if (p && topics.some(t => t.id === p)) {
   setActiveTopicId(p);
   setQIndex(0);
  }
 }, [topics]);

 useEffect(() => () => gradeAbortRef.current?.abort(), []);

 const topic = useMemo(
  () => topics.find(t => t.id === activeTopicId) ?? topics[0] ?? null,
  [topics, activeTopicId],
 );

 const questions = topic?.report.questions ?? [];
 const safeIdx = Math.min(qIndex, Math.max(0, questions.length - 1));
 const q = questions[safeIdx] ?? null;
 const qKey = topic && q ? `${topic.id}:${safeIdx}` : '';
 const isMastered = Boolean(qKey && passed.has(qKey));
 const currentDraft = qKey ? drafts[qKey] ?? '' : '';
 const currentGrade = qKey ? grades[qKey] : undefined;

 const topicMasteredCount = useMemo(() => {
  if (!topic) return 0;
  let n = 0;
  for (let i = 0; i < topic.report.questions.length; i++) {
   if (passed.has(`${topic.id}:${i}`)) n++;
  }
  return n;
 }, [topic, passed]);

 const stopGrade = () => {
  gradeAbortRef.current?.abort();
  gradeAbortRef.current = null;
  setGrading(false);
  setLiveResult(null);
  setLiveThink(null);
 };

 const switchQuestion = (idx: number) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setQIndex(idx);
 };

 const switchTopic = (id: string) => {
  stopGrade();
  setGradeErr('');
  setShowAns(false);
  setActiveTopicId(id);
  setQIndex(0);
  setTab('practice');
  window.history.replaceState(null, '', `/learn/jd-special?id=${encodeURIComponent(id)}`);
 };

 const toggleMastered = () => {
  if (!qKey) return;
  setPassed(prev => {
   const next = new Set(prev);
   if (next.has(qKey)) next.delete(qKey);
   else next.add(qKey);
   persistPassed(username, next);
   return next;
  });
 };

 const runAiGrade = async () => {
  if (!q || !qKey || grading) return;
  const ans = currentDraft.trim();
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
   id: qKey.slice(0, 80),
   kind: 'short',
   q: q.title.slice(0, 4000),
   reference: q.answer.slice(0, 12000),
   points: [
    q.whyAsked ? `准确回应考察点：${q.whyAsked}` : '核心原理与关键机制表述准确',
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
   setGrades(m => ({ ...m, [qKey]: { result: res, model: out.model, think: out.think, thinkSecs: out.thinkSecs } }));
   setShowAns(true);
   if (res.score >= 8 && !passed.has(qKey)) {
    setPassed(prev => {
     const next = new Set(prev);
     next.add(qKey);
     persistPassed(username, next);
     return next;
    });
   }
  }
 };

 const qBlocks = useMemo(() => (q ? answerBlocks(q.answer) : []), [q]);

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
         let done = 0;
         for (let i = 0; i < t.report.questions.length; i++) {
          if (passed.has(`${t.id}:${i}`)) done++;
         }
         return (
          <button
           key={t.id}
           type="button"
           className={'jdr-hist-chip' + (t.id === topic.id ? ' on' : '')}
           onClick={() => switchTopic(t.id)}
          >
           <span>{t.title}</span>
           <small style={{ opacity: 0.72 }}>
            {done}/{t.report.questions.length}
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
        <a href="/interview/jd-research" className="button secondary arch-new-btn">
         <span>{L('查看完整报告', 'Full Report')}</span>
         <ArrowUpRight size={14} />
        </a>
       </div>

       <div className="jds-prog-row">
        <Progress value={questions.length ? (topicMasteredCount / questions.length) * 100 : 0} />
        <span>
         {L(`已掌握 ${topicMasteredCount} / ${questions.length} 题`, `${topicMasteredCount} / ${questions.length}`)}
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
        <span>{L(`专题刷题 (${questions.length})`, `Practice (${questions.length})`)}</span>
       </button>
       <button
        type="button"
        role="tab"
        aria-selected={tab === 'roadmap'}
        className={tab === 'roadmap' ? 'on' : ''}
        onClick={() => setTab('roadmap')}
       >
        <Compass size={14} />
        <span>{L(`复习路径 (${topic.report.roadmap.length})`, `Roadmap (${topic.report.roadmap.length})`)}</span>
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

      {tab === 'practice' && q && (
       <>
        <div className="jds-qnums" aria-label={L('题号切换', 'Question index')}>
         {questions.map((_, i) => {
          const done = passed.has(`${topic.id}:${i}`);
          return (
           <button
            key={i}
            type="button"
            className={'jds-qnum' + (i === safeIdx ? ' cur' : '') + (done ? ' done' : '')}
            onClick={() => switchQuestion(i)}
           >
            {done && <Check size={12} />}
            <span>{i + 1}</span>
           </button>
          );
         })}
        </div>

        <CardSideNav
         showArrows={questions.length > 1}
         onPrev={safeIdx > 0 ? () => switchQuestion(safeIdx - 1) : undefined}
         onNext={safeIdx < questions.length - 1 ? () => switchQuestion(safeIdx + 1) : undefined}
         prevLabel={L('上一题', 'Previous')}
         nextLabel={L('下一题', 'Next')}
        >
         <article className="ai-card jds-card">
          <div className="jds-card-meta">
           <span className={'jdr-diff ' + q.difficulty}>{q.difficulty}</span>
           <span className="jdr-qtag">{q.section}</span>
           <AddToNoteButton
            compact
            title={q.title.slice(0, 64)}
            questionOnly={`### ${q.title}`}
            questionAndAnswer={`### ${q.title}\n\n${q.answer}${q.followups.length ? `\n\n**常见追问**：\n${q.followups.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}`}
            source={{
             kind: 'learn',
             label: `${topic.title.slice(0, 18)} · ${q.section}`,
             href: `/learn/jd-special?id=${encodeURIComponent(topic.id)}`,
            }}
           />
           <a
            href={`/interview/architect?mode=mock&topic=${encodeURIComponent(q.title)}`}
            className="ai-note-pill"
            style={{ textDecoration: 'none' }}
           >
            <MessageSquare size={13} />
            <span>{L('模拟面试', 'Mock')}</span>
            <ExternalLink size={11} />
           </a>
           <span className="jds-num">
            {String(safeIdx + 1).padStart(2, '0')} / {questions.length}
           </span>
          </div>

          <h2>{q.title}</h2>
          {q.whyAsked && <p className="jds-why">{q.whyAsked}</p>}

          <div className="jds-write">
           {grading || currentGrade ? (
            <AnnotatedAnswerBox
             answer={currentDraft}
             result={grading ? liveResult : currentGrade?.result ?? null}
             waiting={grading}
             live={grading}
             model={currentGrade?.model}
             think={grading ? liveThink?.text : currentGrade?.think}
             thinkSecs={grading ? liveThink?.secs : currentGrade?.thinkSecs}
             thinking={Boolean(grading && liveThink?.live)}
             onStop={grading ? stopGrade : undefined}
             onEdit={
              !grading
               ? () =>
                  setGrades(m => {
                   const next = { ...m };
                   delete next[qKey];
                   return next;
                  })
               : undefined
             }
            />
           ) : (
            <textarea
             rows={4}
             value={currentDraft}
             onChange={e => {
              const v = e.target.value;
              setDrafts(m => ({ ...m, [qKey]: v }));
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
              disabled={!currentDraft.trim()}
              onClick={() => void runAiGrade()}
             >
              <Sparkles size={14} />
              <span>{currentGrade ? L('重新 AI 评分', 'Re-grade') : L('AI 评分', 'AI Grade')}</span>
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
             className={(isMastered ? 'button primary' : 'button secondary') + ' arch-new-btn jds-master-btn'}
             onClick={toggleMastered}
            >
             <CheckCircle2 size={14} />
             <span>{isMastered ? L('已掌握', 'Mastered') : L('标记已掌握', 'Mark Mastered')}</span>
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
             {qBlocks.map((b, bi) =>
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
            {q.followups.length > 0 && (
             <div className="jdr-followups">
              <strong>{L('常见追问', 'Follow-ups')}</strong>
              <ul>
               {q.followups.map((f, fi) => (
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
         chatKey={`jd-special:${qKey}`}
         context={{
          kind: 'recite',
          quiz: {
           type: L('JD 专题题', 'JD Topic'),
           q: q.title.slice(0, 4000),
           answer: q.answer.slice(0, 12000),
           explain: [topic.title, q.section, q.whyAsked].filter(Boolean).join(' · ').slice(0, 2000),
          },
         }}
         hello={L('我可以结合当前 JD 专题题目与参考答案，帮你拆解原理、补充追问或模拟面试。', 'Ask me about this JD topic question, core concepts, or follow-ups.')}
         prompts={[
          L('这道题怎么答更有架构深度？', 'How to answer with senior depth?'),
          L('用通俗例子讲透底层原理', 'Explain with a clear example'),
          L('面试官还会怎么连环追问？', 'What follow-ups should I prepare?'),
         ]}
        />
       </>
      )}

      {tab === 'roadmap' && (
       <section className="jdr-roadmap">
        {topic.report.roadmap.map((s, i) => (
         <div key={i} className="ai-card jdr-step-card">
          <div className="jdr-step-head">
           <span className="jdr-phase">{s.phase}</span>
           <strong>{s.title}</strong>
          </div>
          {s.goals.length > 0 && (
           <ul className="jdr-goals">
            {s.goals.map((g, gi) => (
             <li key={gi}>{g}</li>
            ))}
           </ul>
          )}
          {s.siteLinks.length > 0 && (
           <div className="jdr-links">
            {s.siteLinks.map(lk => (
             <a key={lk.href} href={lk.href} className="jdr-link-pill">
              <span>{lk.label}</span>
              <ArrowUpRight size={13} />
             </a>
            ))}
           </div>
          )}
         </div>
        ))}
       </section>
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
