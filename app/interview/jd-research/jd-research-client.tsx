'use client';
import '../../ai/ai.css';
import '../interview.css';
import '../architect/architect.css';
import './jd-research.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
 AlertTriangle,
 ArrowLeft,
 ArrowUpRight,
 BookOpen,
 Check,
 ChevronDown,
 ChevronUp,
 Compass,
 Copy,
 Download,
 ExternalLink,
 History,
 Loader2,
 Lock,
 MessageSquare,
 Plus,
 RotateCcw,
 Sparkles,
 Square,
 Target,
 X,
} from 'lucide-react';
import SiteHeader from '../../components/site-header';
import AddToNoteButton from '../../components/add-to-note';
import { useI18n } from '../../components/i18n';
import { getGeminiAutoProxy } from '../../ai/gemini-proxy-pref';
import {
 reportToMarkdown,
 type JdInputKind,
 type JdPrepDays,
 type JdResearchReport,
 type JdSeniority,
} from '@/lib/jd-research-types';

type SubjectOpt = { id: string; name: string; nameEn: string };
type Usage = { totalTokens: number; inputTokens: number; cachedTokens: number; outputTokens: number; thoughtTokens: number };
type TabKey = 'profile' | 'roadmap' | 'questions';

type StoredPayload = {
 kind?: JdInputKind;
 days?: JdPrepDays;
 level?: JdSeniority;
 questionCount?: number;
 source?: string;
 cacheKey?: string;
 report?: JdResearchReport | null;
 rawText?: string;
 thoughts?: string;
 cached?: boolean;
 usage?: Usage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

type CloudRecord = {
 id: string;
 title: string;
 subtitle: string;
 status: 'running' | 'completed' | 'error';
 interactionId: string;
 sig?: string;
 ckSig?: string;
 payload: StoredPayload;
 createdAt: number;
 updatedAt: number;
};

const PRESETS: { id: string; kind: JdInputKind; zh: string; en: string; sample: string }[] = [
 {
  id: 'go-backend',
  kind: 'jd',
  zh: 'Go 高并发后端',
  en: 'Go Backend',
  sample: `岗位：资深 Go 后端研发工程师（交易核心）
职责：
1. 负责日均亿级请求的订单与库存交易链路架构设计与性能调优；
2. 深入优化 Go 服务 GC、协程调度与内存分配，保障 P99 延迟 < 30ms；
3. 主导 MySQL 分库分表、Redis 多级缓存及 Kafka 异步削峰容灾方案。
要求：
- 3 年以上 Go 生产研发经验，精通 GMP、channel、context 与 pprof 排障；
- 熟悉 MySQL InnoDB 索引、MVCC、锁机制及 Redis 集群高可用与热点保护；
- 有分布式事务、幂等防重、限流熔断落地经验优先。`,
 },
 {
  id: 'ai-agent',
  kind: 'jd',
  zh: 'AI Agent 研发',
  en: 'AI Agent Engineer',
  sample: `岗位：AI Agent 应用架构师 / LLM 工程师
职责：
1. 负责企业级多 Agent 编排平台、RAG 知识库与 Tool Calling 执行框架研发；
2. 构建自动化评测（Evals）、提示缓存（Prompt Caching）与多模型路由降级体系；
3. 优化长上下文首字延迟（TTFT）、Token 成本及工具调用稳定性。
要求：
- 熟悉主流大模型原理、KV Cache、Function Calling、MCP 与 Harness 工程；
- 精通混合检索（BM25 + 向量 + Rerank）、分块策略与幻觉治理；
- 熟悉 Python / TypeScript 异步并发开发与线上可观测追踪。`,
 },
 {
  id: 'backend-exp',
  kind: 'experience',
  zh: '大厂后端面经',
  en: 'Backend Interview Log',
  sample: `某大厂后端三面真实面经：
一面：
1. MySQL 联合索引最左前缀与回表优化，什么情况下 RR 隔离级别还会幻读？
2. Redis 缓存雪崩、击穿、穿透实战方案，大 Key 热 Key 线上怎么发现和处理？
3. 分布式锁 Redisson 看门狗机制及主从切换锁丢失怎么兜底？
二面：
1. 设计一个 10 万 QPS 秒杀扣库存链路，防超卖和少卖怎么平衡？
2. Kafka 消息顺序性、重复消费与堆积应急扩容怎么做？
三面：
1. 讲一次你线上排障 P99 抖动或 OOM 的完整复盘。`,
 },
 {
  id: 'frontend-arch',
  kind: 'jd',
  zh: '前端架构',
  en: 'Frontend Architect',
  sample: `岗位：高级 / 资深前端工程师（核心中台与性能方向）
职责：
1. 负责 React / Next.js 大型 Web 应用架构升级、SSR/RSC 渲染优化与工程化提效；
2. 主导首屏加载（LCP/INP）、大列表虚拟滚动、复杂状态管理与离线缓存方案；
3. 建设前端监控、灰度发布、跨端响应式适配与基础组件库。
要求：
- 深入理解浏览器渲染流水线、事件循环、V8 垃圾回收与 HTTP/2/3 缓存机制；
- 精通 TypeScript 类型体操、React Fiber 并发调度、Hooks 原理与构建优化。`,
 },
];

const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

function legacyLocalKey(username: string): string {
 return `isr_jd_research_v1:${username || 'guest'}`;
}

function renderInline(line: string) {
 const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
 return parts.map((p, i) => {
  if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i}>{p.slice(1, -1)}</code>;
  if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
  return <span key={i}>{p}</span>;
 });
}

function RichMarkdown({ text }: { text: string }) {
 const blocks = text.replace(/\r\n/g, '\n').split(/(```[\s\S]*?```)/g);
 return (
  <div className="arch-md">
   {blocks.map((blk, bi) => {
    if (blk.startsWith('```') && blk.endsWith('```')) {
     const inner = blk.slice(3, -3);
     const nl = inner.indexOf('\n');
     const code = nl >= 0 ? inner.slice(nl + 1) : inner;
     return (
      <pre key={bi}>
       <code>{code.trimEnd()}</code>
      </pre>
     );
    }
    const lines = blk.split('\n');
    return (
     <div key={bi}>
      {lines.map((line, li) => {
       const t = line.trim();
       if (!t) return null;
       if (/^###\s+/.test(t)) return <h4 key={li}>{renderInline(t.replace(/^###\s+/, ''))}</h4>;
       if (/^##\s+/.test(t)) return <h3 key={li}>{renderInline(t.replace(/^##\s+/, ''))}</h3>;
       if (/^#\s+/.test(t)) return <h3 key={li}>{renderInline(t.replace(/^#\s+/, ''))}</h3>;
       if (/^[-*]\s+/.test(t)) return <p key={li} className="arch-li">• {renderInline(t.replace(/^[-*]\s+/, ''))}</p>;
       if (/^\d+\.\s+/.test(t)) return <p key={li} className="arch-li">{renderInline(t)}</p>;
       return <p key={li}>{renderInline(t)}</p>;
      })}
     </div>
    );
   })}
  </div>
 );
}

export default function JdResearchClient({
 username,
 member,
 subjects,
}: {
 username: string;
 member: boolean;
 subjects: SubjectOpt[];
}) {
 const { locale } = useI18n();
 const L = (zh: string, en: string) => (locale === 'en' ? en : zh);

 const [kind, setKind] = useState<JdInputKind>('jd');
 const [days, setDays] = useState<JdPrepDays>(7);
 const [level, setLevel] = useState<JdSeniority>('mid');
 const [questionCount, setQuestionCount] = useState<number>(10);
 const [source, setSource] = useState('');

 const [busy, setBusy] = useState(false);
 const [elapsed, setElapsed] = useState(0);
 const [error, setError] = useState('');

 const [records, setRecords] = useState<CloudRecord[]>([]);
 const [activeId, setActiveId] = useState<string>('');
 const [report, setReport] = useState<JdResearchReport | null>(null);
 const [rawText, setRawText] = useState('');
 const [thoughts, setThoughts] = useState('');
 const [cachedHit, setCachedHit] = useState(false);
 const [usage, setUsage] = useState<Usage | undefined>(undefined);
 const [thoughtsOpen, setThoughtsOpen] = useState(false);
 const [tab, setTab] = useState<TabKey>('profile');

 const [selected, setSelected] = useState<Record<number, boolean>>({});
 const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({ 0: true });
 const [targetSubject, setTargetSubject] = useState<string>('mine');
 const [importing, setImporting] = useState(false);
 const [importResult, setImportResult] = useState<{ count: number; subject: string } | null>(null);
 const [importErr, setImportErr] = useState('');
 const [copiedKey, setCopiedKey] = useState('');

 const pollAbortRef = useRef<AbortController | null>(null);
 const timerRef = useRef<number | null>(null);

 const stopActive = () => {
  pollAbortRef.current?.abort();
  pollAbortRef.current = null;
  if (timerRef.current !== null) {
   window.clearInterval(timerRef.current);
   timerRef.current = null;
  }
  setBusy(false);
 };

 useEffect(() => () => stopActive(), []);

 const applyReportView = (
  recId: string,
  rep: JdResearchReport | null,
  raw: string,
  th: string,
  isCached: boolean,
  usg?: Usage,
  imported?: { count: number; subject: string } | null,
  src?: string,
 ) => {
  setActiveId(recId);
  setReport(rep);
  setRawText(raw);
  setThoughts(th);
  setCachedHit(isCached);
  setUsage(usg);
  if (typeof src === 'string' && src) setSource(src);
  setThoughtsOpen(false);
  setTab('profile');
  setImportResult(imported ?? null);
  setImportErr('');
  if (rep) {
   const sel: Record<number, boolean> = {};
   rep.questions.forEach((_, i) => {
    sel[i] = true;
   });
   setSelected(sel);
   setExpandedQ({ 0: true });
   // Default to 'mine' (我的题库) so importing goes straight into the user's private bank even if empty!
   setTargetSubject('mine');
  }
 };

 const refreshRecords = async (): Promise<CloudRecord[]> => {
  try {
   const r = await fetch('/api/ai-interview-records?kind=jd-research', { cache: 'no-store' });
   if (!r.ok) return [];
   const d = (await r.json()) as { items?: CloudRecord[] };
   const items = Array.isArray(d.items) ? d.items : [];
   setRecords(items);
   return items;
  } catch {
   return [];
  }
 };

 const pollTask = async (opts: {
  recordId: string;
  interactionId: string;
  sig: string;
  cacheKey?: string;
  ckSig?: string;
  geminiProxy: boolean;
  startedAt?: number;
 }) => {
  stopActive();
  setError('');
  setBusy(true);
  setActiveId(opts.recordId);
  const t0 = opts.startedAt || Date.now();
  setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));

  const ctl = new AbortController();
  pollAbortRef.current = ctl;
  timerRef.current = window.setInterval(() => {
   setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
  }, 1000);

  const qs = new URLSearchParams({
   id: opts.interactionId,
   sig: opts.sig,
   rid: opts.recordId,
   geminiProxy: opts.geminiProxy ? '1' : '0',
  });
  if (opts.cacheKey && opts.ckSig) {
   qs.set('ck', opts.cacheKey);
   qs.set('ckSig', opts.ckSig);
  }

  try {
   for (let attempt = 0; attempt < 70; attempt++) {
    if (ctl.signal.aborted) return;
    if (attempt > 0) {
     await new Promise<void>((resolve, reject) => {
      const tid = window.setTimeout(resolve, 3000);
      ctl.signal.addEventListener(
       'abort',
       () => {
        window.clearTimeout(tid);
        reject(new Error('aborted'));
       },
       { once: true },
      );
     });
    }
    if (ctl.signal.aborted) return;

    const pr = await fetch('/api/jd-research?' + qs.toString(), { cache: 'no-store', signal: ctl.signal });
    const pd = (await pr.json()) as {
     status?: string;
     report?: JdResearchReport | null;
     rawText?: string;
     thoughts?: string;
     usage?: Usage;
     error?: string;
    };
    if (!pr.ok) throw new Error(pd.error ?? L('查询进度失败', 'Polling failed'));
    if (pd.status === 'completed') {
     applyReportView(opts.recordId, pd.report ?? null, pd.rawText || '', pd.thoughts || '', false, pd.usage, null);
     void refreshRecords();
     stopActive();
     return;
    }
    if (pd.status === 'failed' || pd.status === 'cancelled') {
     void refreshRecords();
     throw new Error(pd.error || L('调研任务中断，请重试', 'Research interrupted'));
    }
   }
   throw new Error(L('调研超时，请重试', 'Research timed out'));
  } catch (e) {
   if (!ctl.signal.aborted) {
    setError((e as Error).message || L('调研失败', 'Research failed'));
   }
   stopActive();
  }
 };

 // Load cloud D1 history (+ auto-migrate any legacy localStorage items) and auto-restore latest record!
 useEffect(() => {
  let alive = true;
  (async () => {
   let items = await refreshRecords();
   if (!alive) return;

   // Migrate any pre-D1 localStorage items (member or guest key) to cloud D1 so nothing previously generated is lost
   try {
    const keys = [...new Set([legacyLocalKey(username), legacyLocalKey('')])];
    const existingTitles = new Set(items.map(x => x.title));
    let migrated = false;
    for (const lk of keys) {
     const raw = window.localStorage.getItem(lk);
     if (!raw) continue;
     const localArr = JSON.parse(raw) as {
      id: string;
      ts: number;
      kind?: JdInputKind;
      report?: JdResearchReport;
      rawText?: string;
      thoughts?: string;
      cached?: boolean;
      usage?: Usage;
     }[];
     if (!Array.isArray(localArr) || !localArr.length) continue;
     for (const it of localArr.slice(0, 6)) {
      const title = it.report?.roleTitle || '历史调研报告';
      if (existingTitles.has(title) || (!it.report && !it.rawText)) continue;
      existingTitles.add(title);
      const r = await fetch('/api/ai-interview-records', {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({
        id: 'jdr-mig-' + (it.id || Date.now()),
        kind: 'jd-research',
        title,
        subtitle: it.report?.companyStyle || '',
        status: 'completed',
        payload: {
         kind: it.kind || 'jd',
         report: it.report || null,
         rawText: it.rawText || '',
         thoughts: it.thoughts || '',
         cached: Boolean(it.cached),
         usage: it.usage,
        },
       }),
      });
      if (r.ok) migrated = true;
     }
    }
    if (migrated && alive) {
     items = await refreshRecords();
    }
   } catch {}

   if (!alive || !items.length) return;
   const latest = items[0];
   if (latest.status === 'running' && latest.interactionId && latest.sig) {
    void pollTask({
     recordId: latest.id,
     interactionId: latest.interactionId,
     sig: latest.sig,
     cacheKey: latest.payload?.cacheKey,
     ckSig: latest.ckSig,
     geminiProxy: getGeminiAutoProxy(),
     startedAt: latest.createdAt,
    });
   } else if (latest.status === 'completed' && (latest.payload?.report || latest.payload?.rawText)) {
    applyReportView(
     latest.id,
     latest.payload.report ?? null,
     latest.payload.rawText || '',
     latest.payload.thoughts || '',
     Boolean(latest.payload.cached),
     latest.payload.usage,
     latest.payload.imported ?? null,
     latest.payload.source,
    );
   }
  })();
  return () => {
   alive = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [username]);

 const openRecord = (rec: CloudRecord) => {
  stopActive();
  setError('');
  if (rec.status === 'running' && rec.interactionId && rec.sig) {
   setReport(null);
   setRawText('');
   void pollTask({
    recordId: rec.id,
    interactionId: rec.interactionId,
    sig: rec.sig,
    cacheKey: rec.payload?.cacheKey,
    ckSig: rec.ckSig,
    geminiProxy: getGeminiAutoProxy(),
    startedAt: rec.createdAt,
   });
   return;
  }
  if (rec.status === 'error') {
   setActiveId(rec.id);
   setReport(null);
   setRawText('');
   if (rec.payload?.source) setSource(rec.payload.source);
   setError(rec.payload?.error || L('该次调研未完成，可重新发起', 'Previous run failed'));
   return;
  }
  applyReportView(
   rec.id,
   rec.payload?.report ?? null,
   rec.payload?.rawText || '',
   rec.payload?.thoughts || '',
   Boolean(rec.payload?.cached),
   rec.payload?.usage,
   rec.payload?.imported ?? null,
   rec.payload?.source,
  );
 };

 const deleteRecord = async (recId: string) => {
  try {
   await fetch('/api/ai-interview-records?id=' + encodeURIComponent(recId), {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
   });
  } catch {}
  setRecords(prev => prev.filter(x => x.id !== recId));
  if (activeId === recId) {
   stopActive();
   setActiveId('');
   setReport(null);
   setRawText('');
   setThoughts('');
   setImportResult(null);
  }
 };

 const startNewComposer = () => {
  stopActive();
  setActiveId('');
  setReport(null);
  setRawText('');
  setThoughts('');
  setError('');
  setImportResult(null);
 };

 const runResearch = async () => {
  const clean = source.trim();
  if (clean.length < 20) {
   setError(L('请粘贴至少 20 字的岗位 JD 或面经内容', 'Paste at least 20 characters'));
   return;
  }

  stopActive();
  setError('');
  setBusy(true);
  setElapsed(0);
  setReport(null);
  setRawText('');
  setThoughts('');
  setImportResult(null);

  const ctl = new AbortController();
  pollAbortRef.current = ctl;
  const t0 = Date.now();
  timerRef.current = window.setInterval(() => {
   setElapsed(Math.floor((Date.now() - t0) / 1000));
  }, 1000);

  try {
   const geminiProxy = getGeminiAutoProxy();
   const r = await fetch('/api/jd-research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     kind,
     source: clean,
     days,
     level,
     questionCount,
     geminiProxy,
    }),
    signal: ctl.signal,
   });
   const d = (await r.json()) as {
    recordId?: string;
    id?: string;
    sig?: string;
    status?: string;
    cached?: boolean;
    report?: JdResearchReport | null;
    rawText?: string;
    thoughts?: string;
    usage?: Usage;
    cacheKey?: string;
    ckSig?: string;
    error?: string;
   };
   if (!r.ok) throw new Error(d.error ?? L('发起调研失败', 'Request failed'));

   if (d.status === 'completed') {
    applyReportView(d.recordId || '', d.report ?? null, d.rawText || '', d.thoughts || '', Boolean(d.cached), d.usage, null, clean);
    void refreshRecords();
    stopActive();
    return;
   }
   if (!d.id || !d.sig) throw new Error(L('未返回任务 ID', 'Missing task ID'));

   void refreshRecords();
   await pollTask({
    recordId: d.recordId || '',
    interactionId: d.id,
    sig: d.sig,
    cacheKey: d.cacheKey,
    ckSig: d.ckSig,
    geminiProxy,
    startedAt: t0,
   });
  } catch (e) {
   if (!ctl.signal.aborted) {
    setError((e as Error).message || L('调研失败', 'Research failed'));
   }
   stopActive();
  }
 };

 const selectedIndexes = useMemo(
  () => (report ? report.questions.map((_, i) => i).filter(i => selected[i]) : []),
  [report, selected],
 );

 const allSelected = Boolean(report && report.questions.length > 0 && selectedIndexes.length === report.questions.length);

 const toggleAll = () => {
  if (!report) return;
  const next: Record<number, boolean> = {};
  const flag = !allSelected;
  report.questions.forEach((_, i) => {
   next[i] = flag;
  });
  setSelected(next);
 };

 const importSelected = async (subjectOverride?: string) => {
  if (!report || importing) return;
  const indexes = selectedIndexes.length > 0 ? selectedIndexes : report.questions.map((_, i) => i);
  if (!indexes.length) return;
  const sub = subjectOverride || targetSubject || 'mine';
  setImporting(true);
  setImportErr('');
  setImportResult(null);
  try {
   const items = indexes.map(i => {
    const q = report.questions[i];
    const extra = q.followups.length ? `\n\n【常见追问】\n${q.followups.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}` : '';
    return {
     subject: sub,
     section: q.section || report.roleTitle.slice(0, 20),
     title: q.title,
     answer: `${q.answer}${extra}`,
    };
   });
   const r = await fetch('/api/my-questions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'import', items }),
   });
   const d = (await r.json()) as { added?: number; error?: string };
   if (!r.ok) throw new Error(d.error ?? L('导入失败', 'Import failed'));
   const res = { count: d.added ?? items.length, subject: sub };
   setImportResult(res);
   if (activeId) {
    void fetch('/api/ai-interview-records', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      id: activeId,
      kind: 'jd-research',
      patch: true,
      payload: { imported: res },
     }),
    }).then(() => void refreshRecords());
   }
  } catch (e) {
   setImportErr((e as Error).message || L('导入失败', 'Import failed'));
  } finally {
   setImporting(false);
  }
 };

 const copyText = async (key: string, text: string) => {
  try {
   await navigator.clipboard.writeText(text);
   setCopiedKey(key);
   window.setTimeout(() => setCopiedKey(k => (k === key ? '' : k)), 1800);
  } catch {}
 };

 const fullMarkdown = useMemo(() => (report ? reportToMarkdown(report) : rawText), [report, rawText]);
 const hasOutput = Boolean(report || rawText);

 return (
  <div className="ai-shell iv-shell">
   <SiteHeader active="interview" username={username} />
   <main className="ai-main jdr-main">
    <div className="arch-top">
     <a href="/interview" className="arch-back">
      <ArrowLeft size={16} />
      {L('返回面试', 'Back to Interview')}
     </a>
     <span className="arch-agent-pill">
      <Sparkles size={13} />
      Antigravity Agent
     </span>
    </div>

    <div className="ai-title arch-title">
     <h1>{L('JD / 面经深度调研', 'JD & Interview Deep Research')}</h1>
    </div>

    {records.length > 0 && (
     <div className="jdr-history-bar" aria-label={L('调研历史', 'Saved reports')}>
      <button
       type="button"
       className={'jdr-hist-chip new-btn' + (!hasOutput && !busy ? ' on' : '')}
       onClick={startNewComposer}
      >
       <Plus size={13} />
       <span>{L('新调研', 'New')}</span>
      </button>
      {records.map(rec => (
       <div
        key={rec.id}
        className={'jdr-hist-chip' + (activeId === rec.id ? ' on' : '')}
        onClick={() => openRecord(rec)}
       >
        {rec.status === 'running' ? <i className="jdr-hist-dot" /> : <History size={12} />}
        <span>{rec.title}</span>
        <button
         type="button"
         className="jdr-hist-del"
         aria-label={L('删除记录', 'Delete')}
         onClick={e => {
          e.stopPropagation();
          void deleteRecord(rec.id);
         }}
        >
         <X size={12} />
        </button>
       </div>
      ))}
     </div>
    )}

    {!hasOutput && !busy && (
     <>
      <div className="arch-mode-bar" role="tablist">
       <button
        type="button"
        role="tab"
        aria-selected={kind === 'jd'}
        className={kind === 'jd' ? 'on' : ''}
        onClick={() => setKind('jd')}
       >
        {L('岗位 JD', 'Job Description')}
       </button>
       <button
        type="button"
        role="tab"
        aria-selected={kind === 'experience'}
        className={kind === 'experience' ? 'on' : ''}
        onClick={() => setKind('experience')}
       >
        {L('真实面经', 'Interview Log')}
       </button>
      </div>

      <section className="ai-card arch-composer">
       <div className="arch-presets">
        {PRESETS.map(p => (
         <button
          key={p.id}
          type="button"
          className={'arch-chip' + (source === p.sample ? ' on' : '')}
          onClick={() => {
           setKind(p.kind);
           setSource(p.sample);
           setError('');
          }}
         >
          {L(p.zh, p.en)}
         </button>
        ))}
       </div>

       <div className="jdr-cfg-row">
        <div className="jdr-cfg-item">
         <span>{L('备考周期', 'Prep window')}</span>
         <div className="jdr-seg" role="group" aria-label={L('备考周期', 'Prep window')}>
          {([3, 7, 14, 30] as JdPrepDays[]).map(d => (
           <button key={d} type="button" className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
            {L(`${d} 天`, `${d}d`)}
           </button>
          ))}
         </div>
        </div>

        <div className="jdr-cfg-item">
         <span>{L('目标级别', 'Target level')}</span>
         <div className="jdr-seg" role="group" aria-label={L('目标级别', 'Target level')}>
          {(
           [
            ['junior', '初级', 'Junior'],
            ['mid', '中高级', 'Mid/Sr'],
            ['senior', '资深', 'Staff'],
           ] as [JdSeniority, string, string][]
          ).map(([lv, zh, en]) => (
           <button key={lv} type="button" className={level === lv ? 'on' : ''} onClick={() => setLevel(lv)}>
            {L(zh, en)}
           </button>
          ))}
         </div>
        </div>

        <div className="jdr-cfg-item">
         <span>{L('专题题数', 'Questions')}</span>
         <div className="jdr-seg" role="group" aria-label={L('专题题数', 'Questions')}>
          {[8, 10, 12].map(n => (
           <button
            key={n}
            type="button"
            className={questionCount === n ? 'on' : ''}
            onClick={() => setQuestionCount(n)}
           >
            {L(`${n} 题`, `${n}`)}
           </button>
          ))}
         </div>
        </div>
       </div>

       <label className="arch-field">
        <span>{kind === 'jd' ? L('岗位 JD', 'Job Description') : L('面经内容', 'Interview Log')}</span>
        <textarea
         rows={8}
         value={source}
         onChange={e => setSource(e.target.value)}
         maxLength={14000}
         placeholder={L('粘贴岗位 JD 或面经内容…', 'Paste JD or interview experience…')}
        />
       </label>

       {error && (
        <p className="ai-grade-error" style={{ margin: 0 }}>
         {error}
        </p>
       )}

       <div className="arch-actions">
        <button
         type="button"
         className="button primary"
         disabled={busy || source.trim().length < 20}
         onClick={() => void runResearch()}
        >
         <Compass size={15} />
         <span>{L('开始深度调研', 'Start Research')}</span>
        </button>
        {source.trim() && (
         <button
          type="button"
          className="button secondary"
          onClick={() => {
           setSource('');
           setError('');
          }}
         >
          <RotateCcw size={15} />
          <span>{L('清空', 'Clear')}</span>
         </button>
        )}
       </div>
      </section>
     </>
    )}

    {busy && (
     <div className="ai-card arch-reply-card">
      <div className="arch-running">
       <span className="arch-running-left">
        <Loader2 size={16} className="ai-spin" />
        <span>{L(`深度调研生成中 · ${elapsed}s`, `Researching · ${elapsed}s`)}</span>
       </span>
       <button type="button" className="button secondary arch-stop-btn" onClick={stopActive}>
        <Square size={12} fill="currentColor" />
        <span>{L('取消', 'Stop')}</span>
       </button>
      </div>
     </div>
    )}

    {!busy && hasOutput && (
     <>
      <section className="ai-card jdr-head-card">
       <div className="jdr-head-top">
        <div className="jdr-head-title">
         <h2>{report ? report.roleTitle : L('调研报告', 'Research Report')}</h2>
         <div className="jdr-head-tags">
          {report?.companyStyle && <span className="jdr-style-tag">{report.companyStyle}</span>}
          {cachedHit && <span className="arch-badge">{L('提示缓存直出', 'Prompt Cache Hit')}</span>}
          {!cachedHit && usage && usage.cachedTokens > 0 && (
           <span className="arch-badge">
            {L(`缓存命中 ${fmtTok(usage.cachedTokens)}`, `Cached ${fmtTok(usage.cachedTokens)}`)}
           </span>
          )}
          {!cachedHit && usage && usage.totalTokens > 0 && (
           <span className="arch-meta-txt">{fmtTok(usage.totalTokens)} tokens</span>
          )}
         </div>
        </div>

        <div className="jdr-head-btns">
         {report && report.questions.length > 0 && (
          member ? (
           <button
            type="button"
            className="button primary arch-new-btn"
            disabled={importing}
            onClick={() => void importSelected()}
           >
            {importing ? <Loader2 size={14} className="ai-spin" /> : <Download size={14} />}
            <span>
             {importing
              ? L('导入中…', 'Importing…')
              : L(`导入我的题库 (${selectedIndexes.length || report.questions.length})`, `Import (${selectedIndexes.length || report.questions.length})`)}
            </span>
           </button>
          ) : (
           <a href="/login?return_to=%2Finterview%2Fjd-research" className="button primary arch-new-btn">
            <Lock size={14} />
            <span>{L('登录后导入题库', 'Sign in to import')}</span>
           </a>
          )
         )}
         <button
          type="button"
          className="ai-note-pill"
          onClick={() => void copyText('all', fullMarkdown)}
         >
          {copiedKey === 'all' ? <Check size={13} /> : <Copy size={13} />}
          <span>{copiedKey === 'all' ? L('已复制', 'Copied') : L('复制 Markdown', 'Copy MD')}</span>
         </button>
         <AddToNoteButton
          compact
          title={(report?.roleTitle || L('JD 调研报告', 'JD Report')).slice(0, 64)}
          questionOnly={source ? `### ${report?.roleTitle || 'JD / 面经'}\n\n${source}` : fullMarkdown}
          questionAndAnswer={fullMarkdown}
          modeLabels={[
           ['仅原始内容', 'Source Only'],
           ['完整调研报告', 'Full Report'],
          ]}
          source={{
           kind: 'interview',
           label: `${L('JD 调研', 'JD Research')} · ${(report?.roleTitle || '').slice(0, 24)}`,
           href: '/interview/jd-research',
          }}
         />
         <button type="button" className="button secondary arch-new-btn" onClick={startNewComposer}>
          <Plus size={14} />
          <span>{L('新调研', 'New')}</span>
         </button>
        </div>
       </div>

       {importResult && (
        <div className="jdr-import-ok" style={{ width: 'fit-content' }}>
         <Check size={13} />
         <span>{L(`已导入 ${importResult.count} 题到「我的题库」`, `Imported ${importResult.count} questions`)}</span>
         <a href="/interview?track=mine">{L('去我的题库刷题 →', 'Practice now →')}</a>
        </div>
       )}
       {importErr && <span className="ai-grade-error">{importErr}</span>}

       {report?.summary && <p className="jdr-summary">{report.summary}</p>}

       {thoughts && (
        <div className="arch-thoughts">
         <button
          type="button"
          className="arch-thoughts-btn"
          onClick={() => setThoughtsOpen(v => !v)}
         >
          <span>{L('思考过程', 'Reasoning')}</span>
          {thoughtsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
         </button>
         {thoughtsOpen && <pre className="arch-thoughts-body">{thoughts}</pre>}
        </div>
       )}
      </section>

      {report ? (
       <>
        <div className="jdr-tabs" role="tablist">
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
         <button
          type="button"
          role="tab"
          aria-selected={tab === 'roadmap'}
          className={tab === 'roadmap' ? 'on' : ''}
          onClick={() => setTab('roadmap')}
         >
          <Compass size={14} />
          <span>{L(`复习路径 (${report.roadmap.length})`, `Roadmap (${report.roadmap.length})`)}</span>
         </button>
         <button
          type="button"
          role="tab"
          aria-selected={tab === 'questions'}
          className={tab === 'questions' ? 'on' : ''}
          onClick={() => setTab('questions')}
         >
          <BookOpen size={14} />
          <span>{L(`专题题库 (${report.questions.length})`, `Questions (${report.questions.length})`)}</span>
         </button>
        </div>

        {tab === 'profile' && (
         <section className="jdr-panel">
          <div className="jdr-dim-list">
           {report.dimensions.map((d, i) => (
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

          {report.traps.length > 0 && (
           <div className="ai-card jdr-traps">
            <h3>
             <AlertTriangle size={15} />
             <span>{L('高频扣分点', 'Common Pitfalls')}</span>
            </h3>
            <ul>
             {report.traps.map((t, i) => (
              <li key={i}>{t}</li>
             ))}
            </ul>
           </div>
          )}
         </section>
        )}

        {tab === 'roadmap' && (
         <section className="jdr-roadmap">
          {report.roadmap.map((s, i) => (
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

        {tab === 'questions' && (
         <section className="jdr-panel">
          <div className="ai-card jdr-qbar">
           <div className="jdr-qbar-left">
            <button type="button" className="button secondary arch-new-btn" onClick={toggleAll}>
             {allSelected ? L('取消全选', 'Deselect all') : L('全选', 'Select all')}
            </button>
            <select
             value={targetSubject}
             onChange={e => setTargetSubject(e.target.value)}
             aria-label={L('导入学科', 'Target bank')}
            >
             {subjects.map(s => (
              <option key={s.id} value={s.id}>
               {L(s.name, s.nameEn)}
              </option>
             ))}
            </select>
           </div>

           <div className="jdr-qbar-right">
            {importResult && (
             <span className="jdr-import-ok">
              <Check size={13} />
              <span>{L(`已导入 ${importResult.count} 题`, `Imported ${importResult.count}`)}</span>
              <a href="/interview?track=mine">{L('去我的题库', 'My bank')}</a>
             </span>
            )}
            {importErr && <span className="ai-grade-error">{importErr}</span>}
            {member ? (
             <button
              type="button"
              className="button primary arch-new-btn"
              disabled={importing || selectedIndexes.length === 0}
              onClick={() => void importSelected()}
             >
              {importing ? <Loader2 size={14} className="ai-spin" /> : <Download size={14} />}
              <span>
               {importing
                ? L('导入中…', 'Importing…')
                : L(`导入题库 (${selectedIndexes.length})`, `Import (${selectedIndexes.length})`)}
              </span>
             </button>
            ) : (
             <a href="/login?return_to=%2Finterview%2Fjd-research" className="button primary arch-new-btn">
              <Lock size={14} />
              <span>{L('登录后导入', 'Sign in to import')}</span>
             </a>
            )}
           </div>
          </div>

          <div className="jdr-qlist">
           {report.questions.map((q, idx) => {
            const isOpen = Boolean(expandedQ[idx]);
            const archHref = `/interview/architect?mode=mock&topic=${encodeURIComponent(q.title)}`;
            return (
             <article key={idx} className="ai-card jdr-qcard">
              <div className="jdr-qhead">
               <input
                type="checkbox"
                className="jdr-qcheck"
                checked={Boolean(selected[idx])}
                onChange={e => setSelected(m => ({ ...m, [idx]: e.target.checked }))}
                aria-label={q.title}
               />
               <button
                type="button"
                className="jdr-qhead-btn"
                onClick={() => setExpandedQ(m => ({ ...m, [idx]: !m[idx] }))}
               >
                <span className="jdr-qmeta">
                 <span className={'jdr-diff ' + q.difficulty}>{q.difficulty}</span>
                 <span className="jdr-qtag">{q.section}</span>
                </span>
                <span className="jdr-qtitle">
                 {idx + 1}. {q.title}
                </span>
                {q.whyAsked && <span className="jdr-qwhy">{q.whyAsked}</span>}
               </button>
               <button
                type="button"
                className="jdr-qchev"
                style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2 }}
                aria-label={isOpen ? L('收起', 'Collapse') : L('展开', 'Expand')}
                onClick={() => setExpandedQ(m => ({ ...m, [idx]: !m[idx] }))}
               >
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
               </button>
              </div>

              {isOpen && (
               <div className="jdr-qbody">
                <RichMarkdown text={q.answer} />
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
                <div className="jdr-qfoot">
                 <a href={archHref} className="ai-note-pill" style={{ textDecoration: 'none' }}>
                  <MessageSquare size={13} />
                  <span>{L('模拟面试', 'Mock')}</span>
                  <ExternalLink size={11} />
                 </a>
                 <button
                  type="button"
                  className="ai-note-pill"
                  onClick={() => void copyText(`q-${idx}`, `### ${q.title}\n\n${q.answer}`)}
                 >
                  {copiedKey === `q-${idx}` ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === `q-${idx}` ? L('已复制', 'Copied') : L('复制', 'Copy')}</span>
                 </button>
                 <AddToNoteButton
                  compact
                  title={q.title.slice(0, 64)}
                  questionOnly={`### ${q.title}`}
                  questionAndAnswer={`### ${q.title}\n\n${q.answer}${q.followups.length ? `\n\n**常见追问**：\n${q.followups.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}`}
                  source={{
                   kind: 'interview',
                   label: `${report.roleTitle.slice(0, 18)} · ${q.section}`,
                   href: '/interview/jd-research',
                  }}
                 />
                </div>
               </div>
              )}
             </article>
            );
           })}
          </div>
         </section>
        )}
       </>
      ) : (
       <div className="ai-card arch-reply-card">
        <RichMarkdown text={rawText} />
       </div>
      )}
     </>
    )}
   </main>
  </div>
 );
}
