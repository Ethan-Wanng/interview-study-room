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
 FileDown,
 FileText,
 GraduationCap,
 History,
 ImagePlus,
 Link2,
 Loader2,
 Lock,
 MessageSquare,
 Minimize2,
 Pencil,
 Plus,
 RotateCcw,
 Search,
 Square,
 Target,
 X,
 Zap,
} from 'lucide-react';
import SiteHeader from '../../components/site-header';
import AddToNoteButton from '../../components/add-to-note';
import { useI18n } from '../../components/i18n';
import { getGeminiAutoProxy } from '../../ai/gemini-proxy-pref';
import { aiQuizTypes } from '@/content/journey';
import type { AntigravityUsage } from '@/lib/antigravity-agent';
import {
 countJdStudyQuizzes,
 reportToMarkdown,
 type JdInputKind,
 type JdLiveProgress,
 type JdResearchReport,
 type JdStageKey,
} from '@/lib/jd-research-types';
import {
 notifyJdTaskDone,
 removeJdBgTask,
 subscribeJdTaskDone,
 upsertJdBgTask,
} from '@/lib/jd-bg-tasks';

const LETTERS = 'ABCDEFGH';
const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

async function compressJdImage(file: File): Promise<string | null> {
 const url = URL.createObjectURL(file);
 try {
  const img = await new Promise<HTMLImageElement>((ok, bad) => {
   const el = new Image();
   el.onload = () => ok(el);
   el.onerror = bad;
   el.src = url;
  });
  for (const [side, q] of [
   [1440, 0.86],
   [1080, 0.78],
   [800, 0.68],
  ] as const) {
   const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
   const c = document.createElement('canvas');
   c.width = Math.max(1, Math.round(img.naturalWidth * s));
   c.height = Math.max(1, Math.round(img.naturalHeight * s));
   const g = c.getContext('2d');
   if (!g) return null;
   g.fillStyle = '#fff';
   g.fillRect(0, 0, c.width, c.height);
   g.drawImage(img, 0, 0, c.width, c.height);
   const out = c.toDataURL('image/jpeg', q);
   if (out.length <= 1_800_000) return out;
  }
  return null;
 } catch {
  return null;
 } finally {
  URL.revokeObjectURL(url);
 }
}

async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
 const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
  import('html2canvas-pro'),
  import('jspdf'),
 ]);
 const top = el.getBoundingClientRect().top;
 const breaks = [...el.querySelectorAll<HTMLElement>('.jdr-print-item, h2, h3')]
  .map(n => n.getBoundingClientRect().top - top)
  .filter(y => y > 0);
 const scale = 1.6;
 const canvas = await html2canvas(el, {
  scale,
  backgroundColor: '#ffffff',
  useCORS: true,
  windowWidth: el.scrollWidth,
 });
 const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
 const pageW = pdf.internal.pageSize.getWidth();
 const pageH = pdf.internal.pageSize.getHeight();
 const margin = 28;
 const px = (pageW - margin * 2) / canvas.width;
 const pageCanvasH = Math.floor((pageH - margin * 2) / px);
 for (let y = 0, first = true; y < canvas.height; first = false) {
  let end = Math.min(canvas.height, y + pageCanvasH);
  if (end < canvas.height) {
   const cut = breaks
    .map(b => Math.round(b * scale))
    .filter(b => b > y + pageCanvasH * 0.3 && b <= end)
    .pop();
   if (cut) end = cut;
  }
  const slice = document.createElement('canvas');
  slice.width = canvas.width;
  slice.height = end - y;
  slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
  if (!first) pdf.addPage();
  pdf.addImage(slice.toDataURL('image/jpeg', 0.84), 'JPEG', margin, margin, canvas.width * px, (end - y) * px);
  y = end;
 }
 pdf.save(filename);
}

type SubjectOpt = { id: string; name: string; nameEn: string };
type TabKey = 'profile' | 'roadmap' | 'questions';

type StoredPayload = {
 kind?: JdInputKind;
 source?: string;
 model?: string;
 cacheKey?: string;
 stage?: 1 | 2;
 cached?: boolean;
 stage1Cached?: boolean;
 partialReport?: JdResearchReport | null;
 report?: JdResearchReport | null;
 rawText?: string;
 thoughts?: string;
 usage?: AntigravityUsage;
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

const STAGE_ORDER: JdStageKey[] = ['profile', 'roadmap', 'quizzes', 'questions'];

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
 const [source, setSource] = useState('');
 const [jdUrl, setJdUrl] = useState('');
 const [images, setImages] = useState<string[]>([]);
 const [extracting, setExtracting] = useState(false);
 const [bgTip, setBgTip] = useState('');

 const [busy, setBusy] = useState(false);
 const [elapsed, setElapsed] = useState(0);
 const [error, setError] = useState('');
 const [connState, setConnState] = useState<'connecting' | 'connected' | 'agent_ready' | 'thinking' | 'streaming'>('connecting');
 const [streamChars, setStreamChars] = useState(0);
 const [streamTail, setStreamTail] = useState('');
 const [pingBeats, setPingBeats] = useState(0);
 const [streamModel, setStreamModel] = useState('');
 const [streamThoughts, setStreamThoughts] = useState('');
 const [liveProgress, setLiveProgress] = useState<JdLiveProgress | null>(null);
 const [partialReport, setPartialReport] = useState<JdResearchReport | null>(null);

 const [records, setRecords] = useState<CloudRecord[]>([]);
 const [histQuery, setHistQuery] = useState('');
 const [activeId, setActiveId] = useState<string>('');
 const activeIdRef = useRef('');
 useEffect(() => {
  activeIdRef.current = activeId;
 }, [activeId]);

 const [report, setReport] = useState<JdResearchReport | null>(null);
 const [rawText, setRawText] = useState('');
 const [thoughts, setThoughts] = useState('');
 const [reportModel, setReportModel] = useState('');
 const [reportCached, setReportCached] = useState(false);
 const [reportStage1Cached, setReportStage1Cached] = useState(false);
 const [reportUsage, setReportUsage] = useState<AntigravityUsage | undefined>(undefined);
 const [thoughtsOpen, setThoughtsOpen] = useState(false);
 const [tab, setTab] = useState<TabKey>('profile');

 const [renaming, setRenaming] = useState(false);
 const [renameVal, setRenameVal] = useState('');
 const [exportingPdf, setExportingPdf] = useState(false);

 const [selected, setSelected] = useState<Record<number, boolean>>({});
 const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({ 0: true });
 const [targetSubject, setTargetSubject] = useState<string>('mine');
 const [importing, setImporting] = useState(false);
 const [importResult, setImportResult] = useState<{ count: number; subject: string } | null>(null);
 const [importErr, setImportErr] = useState('');
 const [copiedKey, setCopiedKey] = useState('');

 const abortRef = useRef<AbortController | null>(null);
 const timerRef = useRef<number | null>(null);
 const bgModeRef = useRef(false);
 const streamingRecordIdRef = useRef('');
 const thinkBoxRef = useRef<HTMLPreElement | null>(null);
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const printRef = useRef<HTMLDivElement | null>(null);

 const stopActive = () => {
  bgModeRef.current = false;
  if (streamingRecordIdRef.current) {
   removeJdBgTask(streamingRecordIdRef.current);
   streamingRecordIdRef.current = '';
  }
  abortRef.current?.abort();
  abortRef.current = null;
  if (timerRef.current !== null) {
   window.clearInterval(timerRef.current);
   timerRef.current = null;
  }
  setBusy(false);
 };

 useEffect(
  () => () => {
   if (timerRef.current !== null) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
   }
   // If a stream is active when navigating away, let it continue in background instead of aborting
   if (streamingRecordIdRef.current) {
    bgModeRef.current = true;
   } else {
    abortRef.current?.abort();
   }
  },
  [],
 );

 useEffect(() => {
  if (busy && thinkBoxRef.current) {
   thinkBoxRef.current.scrollTop = thinkBoxRef.current.scrollHeight;
  }
 }, [busy, streamThoughts, connState, pingBeats]);

 const applyReportView = (
  recId: string,
  rep: JdResearchReport | null,
  raw: string,
  th: string,
  model?: string,
  imported?: { count: number; subject: string } | null,
  src?: string,
  meta?: { cached?: boolean; stage1Cached?: boolean; usage?: AntigravityUsage; kind?: JdInputKind },
 ) => {
  setActiveId(recId);
  setReport(rep);
  setPartialReport(null);
  setLiveProgress(null);
  setRawText(raw);
  setThoughts(th);
  setReportModel(model || '');
  setReportCached(Boolean(meta?.cached));
  setReportStage1Cached(Boolean(meta?.stage1Cached));
  setReportUsage(meta?.usage);
  if (meta?.kind) setKind(meta.kind);
  if (typeof src === 'string' && src) setSource(src);
  setThoughtsOpen(Boolean(th && th.trim()));
  setRenaming(false);
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

 const pollLegacyTask = async (
  rec: CloudRecord,
  initMeta?: { stage1Cached?: boolean; partialReport?: JdResearchReport | null; progress?: JdLiveProgress },
 ) => {
  if (!rec.interactionId || !rec.sig) return;
  let curInteractionId = rec.interactionId;
  let curSig = rec.sig;
  let curStageKey: JdStageKey = initMeta?.progress?.activeKey || (rec.payload?.stage === 2 ? 'quizzes' : 'profile');
  let curTitle = rec.title || L('岗位专题', 'JD Topic');

  upsertJdBgTask({
   recordId: rec.id,
   interactionId: curInteractionId,
   sig: curSig,
   cacheKey: rec.payload?.cacheKey,
   ckSig: rec.ckSig,
   title: curTitle,
   createdAt: rec.createdAt || Date.now(),
   stageKey: curStageKey,
   stage1Cached: initMeta?.stage1Cached ?? rec.payload?.stage1Cached,
  });

  stopActive();
  setError('');
  setBgTip('');
  setBusy(true);
  setActiveId(rec.id);
  setStreamModel('');
  setStreamThoughts(rec.payload?.thoughts || '');
  setPartialReport(initMeta?.partialReport ?? rec.payload?.partialReport ?? null);
  setLiveProgress(
   initMeta?.progress ?? {
    stage: rec.payload?.stage === 2 ? 2 : 1,
    activeKey: curStageKey,
    dimCount: initMeta?.partialReport?.dimensions?.length ?? 0,
    stageCount: initMeta?.partialReport?.roadmap?.length ?? 0,
    quizCount: 0,
    questionCount: 0,
    qTitles: [],
    stage1Cached: initMeta?.stage1Cached ?? rec.payload?.stage1Cached,
   },
  );

  const t0 = rec.createdAt || Date.now();
  setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
  const ctl = new AbortController();
  abortRef.current = ctl;
  timerRef.current = window.setInterval(() => {
   setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
  }, 1000);

  try {
   // Poll up to 120 ticks * 3s = 6 minutes across both Stage 1 & Stage 2
   for (let i = 0; i < 120; i++) {
    if (ctl.signal.aborted) return;
    if (i > 0) {
     await new Promise<void>((res, rej) => {
      const tid = window.setTimeout(res, 3000);
      ctl.signal.addEventListener(
       'abort',
       () => {
        window.clearTimeout(tid);
        rej(new Error('aborted'));
       },
       { once: true },
      );
     });
    }
    const qs = new URLSearchParams({
     id: curInteractionId,
     sig: curSig,
     rid: rec.id,
     geminiProxy: getGeminiAutoProxy() ? '1' : '0',
    });
    if (rec.payload?.cacheKey && rec.ckSig) {
     qs.set('ck', rec.payload.cacheKey);
     qs.set('ckSig', rec.ckSig);
    }
    const pr = await fetch('/api/jd-research?' + qs.toString(), { cache: 'no-store', signal: ctl.signal });
    const pd = (await pr.json()) as {
     id?: string;
     sig?: string;
     status?: string;
     stage?: 1 | 2;
     cached?: boolean;
     stage1Cached?: boolean;
     partialReport?: JdResearchReport | null;
     progress?: JdLiveProgress;
     report?: JdResearchReport | null;
     rawText?: string;
     text?: string;
     thoughts?: string;
     usage?: AntigravityUsage;
     error?: string;
    };
    if (!pr.ok) throw new Error(pd.error ?? L('查询失败', 'Failed'));

    if (pd.id && pd.id !== curInteractionId) curInteractionId = pd.id;
    if (pd.sig && pd.sig !== curSig) curSig = pd.sig;
    if (pd.thoughts) setStreamThoughts(pd.thoughts);
    if (pd.partialReport) setPartialReport(pd.partialReport);
    if (pd.progress) {
     setLiveProgress(pd.progress);
     curStageKey = pd.progress.activeKey;
     if (pd.progress.roleTitle) curTitle = pd.progress.roleTitle;
    }

    if (pd.status === 'in_progress') {
     upsertJdBgTask({
      recordId: rec.id,
      interactionId: curInteractionId,
      sig: curSig,
      cacheKey: rec.payload?.cacheKey,
      ckSig: rec.ckSig,
      title: curTitle,
      createdAt: t0,
      stageKey: curStageKey,
      stage1Cached: pd.stage1Cached,
     });
     continue;
    }

    if (pd.status === 'completed') {
     removeJdBgTask(rec.id);
     applyReportView(rec.id, pd.report ?? null, pd.rawText || '', pd.thoughts || '', '', null, rec.payload?.source, {
      cached: pd.cached,
      stage1Cached: pd.stage1Cached,
      usage: pd.usage,
      kind: rec.payload?.kind,
     });
     void refreshRecords();
     stopActive();
     return;
    }
    if (pd.status === 'failed' || pd.status === 'cancelled') {
     removeJdBgTask(rec.id);
     throw new Error(pd.error || L('任务中断，请点击一键重试', 'Interrupted'));
    }
   }
   removeJdBgTask(rec.id);
   throw new Error(L('生成耗时超过上限，请点击一键重试（阶段 1 已缓存，重试将直接从第 2 步继续）', 'Timed out — click Retry to resume from Stage 2'));
  } catch (e) {
   if (!ctl.signal.aborted) {
    setError((e as Error).message || L('查询失败', 'Failed'));
   }
   stopActive();
  }
 };

 const moveToBackground = () => {
  // Keep the active NDJSON stream running in the background while returning the composer to idle
  bgModeRef.current = true;
  setBusy(false);
  setActiveId('');
  setReport(null);
  setPartialReport(null);
  setLiveProgress(null);
  setRawText('');
  setThoughts('');
  setBgTip(L('已转入后台流式生成，可点击上方历史条目随时查看实时进度', 'Streaming in background'));
 };

 useEffect(() => {
  return subscribeJdTaskDone(ev => {
   void refreshRecords().then(items => {
    if (ev.status === 'completed' && activeIdRef.current === ev.recordId) {
     const hit = items.find(x => x.id === ev.recordId);
     if (hit?.payload) {
      applyReportView(
       hit.id,
       hit.payload.report ?? null,
       hit.payload.rawText || '',
       hit.payload.thoughts || '',
       hit.payload.model,
       hit.payload.imported ?? null,
       hit.payload.source,
       {
        cached: hit.payload.cached,
        stage1Cached: hit.payload.stage1Cached,
        usage: hit.payload.usage,
        kind: hit.payload.kind,
       },
      );
      stopActive();
     }
    }
   });
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useEffect(() => {
  let alive = true;
  const sp = new URLSearchParams(window.location.search);
  const wantNew = sp.get('new') === '1';
  const wantId = sp.get('id') || '';
  (async () => {
   let items = await refreshRecords();
   if (!alive) return;

   // Auto-migrate any legacy localStorage items to cloud D1
   try {
    const keys = [...new Set([legacyLocalKey(username), legacyLocalKey('')])];
    const existingTitles = new Set(items.map(x => x.title));
    let migrated = false;
    for (const lk of keys) {
     const raw = window.localStorage.getItem(lk);
     if (!raw) continue;
     const localArr = JSON.parse(raw) as { id: string; kind?: JdInputKind; report?: JdResearchReport; rawText?: string; thoughts?: string }[];
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
        payload: { kind: it.kind || 'jd', report: it.report || null, rawText: it.rawText || '', thoughts: it.thoughts || '' },
       }),
      });
      if (r.ok) migrated = true;
     }
    }
    if (migrated && alive) items = await refreshRecords();
   } catch {}

   for (const rec of items) {
    if (rec.status === 'running' && rec.interactionId && rec.sig) {
     upsertJdBgTask({
      recordId: rec.id,
      interactionId: rec.interactionId,
      sig: rec.sig,
      cacheKey: rec.payload?.cacheKey,
      ckSig: rec.ckSig,
      title: rec.title || L('岗位专题', 'JD Topic'),
      createdAt: rec.createdAt || Date.now(),
      stageKey: rec.payload?.stage === 2 ? 'quizzes' : 'profile',
      stage1Cached: rec.payload?.stage1Cached,
     });
    }
   }

   if (!alive || wantNew || !items.length) return;
   const target = (wantId ? items.find(x => x.id === wantId) : null) || items[0];
   if (target.status === 'running' && target.interactionId && target.sig) {
    void pollLegacyTask(target);
   } else if (target.status === 'error') {
    setActiveId(target.id);
    if (target.payload?.kind) setKind(target.payload.kind);
    if (target.payload?.source) setSource(target.payload.source);
    setError(target.payload?.error || L('该次调研未完成，可点击一键重试', 'Previous run failed'));
   } else if (target.status === 'completed' && (target.payload?.report || target.payload?.rawText)) {
    applyReportView(
     target.id,
     target.payload.report ?? null,
     target.payload.rawText || '',
     target.payload.thoughts || '',
     target.payload.model,
     target.payload.imported ?? null,
     target.payload.source,
     {
      cached: target.payload.cached,
      stage1Cached: target.payload.stage1Cached,
      usage: target.payload.usage,
      kind: target.payload.kind,
     },
    );
   }
  })();
  return () => {
   alive = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [username]);

 const openRecord = (rec: CloudRecord) => {
  if (streamingRecordIdRef.current && rec.id === streamingRecordIdRef.current) {
   bgModeRef.current = false;
   setError('');
   setBgTip('');
   setRenaming(false);
   setActiveId(rec.id);
   setReport(null);
   setBusy(true);
   return;
  }
  stopActive();
  setError('');
  setRenaming(false);
  if (rec.status === 'running' && rec.interactionId && rec.sig) {
   setReport(null);
   setRawText('');
   void pollLegacyTask(rec);
   return;
  }
  if (rec.status === 'running') {
   setActiveId(rec.id);
   setReport(null);
   setPartialReport(rec.payload?.partialReport ?? null);
   if (rec.payload?.kind) setKind(rec.payload.kind);
   if (rec.payload?.source) setSource(rec.payload.source);
   setError(L('上次流式连接已断开，点击「一键重试」将继续生成（已完成的阶段会自动命中缓存）', 'Stream disconnected — click Retry to resume'));
   return;
  }
  if (rec.status === 'error') {
   setActiveId(rec.id);
   setReport(null);
   setRawText(rec.payload?.rawText || '');
   if (rec.payload?.kind) setKind(rec.payload.kind);
   if (rec.payload?.source) setSource(rec.payload.source);
   setError(rec.payload?.error || L('该次调研未完成，可点击一键重试', 'Previous run failed'));
   return;
  }
  applyReportView(
   rec.id,
   rec.payload?.report ?? null,
   rec.payload?.rawText || '',
   rec.payload?.thoughts || '',
   rec.payload?.model,
   rec.payload?.imported ?? null,
   rec.payload?.source,
   {
    cached: rec.payload?.cached,
    stage1Cached: rec.payload?.stage1Cached,
    usage: rec.payload?.usage,
    kind: rec.payload?.kind,
   },
  );
 };

 const deleteRecord = async (recId: string) => {
  removeJdBgTask(recId);
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
   setPartialReport(null);
   setLiveProgress(null);
   setRawText('');
   setThoughts('');
   setImportResult(null);
  }
 };

 const saveRename = async () => {
  const clean = renameVal.trim().slice(0, 60);
  if (!clean || !activeId) {
   setRenaming(false);
   return;
  }
  setRenaming(false);
  setRecords(prev => prev.map(r => (r.id === activeId ? { ...r, title: clean } : r)));
  if (report) {
   setReport({ ...report, roleTitle: clean });
  }
  try {
   await fetch('/api/ai-interview-records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     id: activeId,
     kind: 'jd-research',
     title: clean,
     patch: true,
     payload: report ? { report: { ...report, roleTitle: clean } } : {},
    }),
   });
  } catch {}
 };

 const startNewComposer = () => {
  stopActive();
  setActiveId('');
  setReport(null);
  setPartialReport(null);
  setLiveProgress(null);
  setRawText('');
  setThoughts('');
  setStreamThoughts('');
  setError('');
  setBgTip('');
  setRenaming(false);
  setImportResult(null);
 };

 const addJdImages = async (files: FileList | File[]) => {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  const room = 4 - images.length;
  if (room <= 0) {
   setError(L('最多上传 4 张图片', 'Up to 4 images'));
   return;
  }
  const out = (await Promise.all(list.slice(0, room).map(compressJdImage))).filter((x): x is string => Boolean(x));
  if (out.length < list.slice(0, room).length) {
   setError(L('部分图片过大或格式不支持', 'Some images were skipped'));
  } else {
   setError('');
  }
  setImages(prev => [...prev, ...out].slice(0, 4));
 };

 const extractInputs = async (opts: { useUrl?: boolean; useImages?: boolean }) => {
  if (extracting || busy) return;
  const urlVal = opts.useUrl ? jdUrl.trim() : '';
  const imgsVal = opts.useImages ? images : [];
  if (!urlVal && !imgsVal.length) return;
  setExtracting(true);
  setError('');
  try {
   const r = await fetch('/api/jd-research/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     ...(urlVal ? { url: urlVal } : {}),
     ...(imgsVal.length ? { images: imgsVal } : {}),
     geminiProxy: getGeminiAutoProxy(),
    }),
   });
   const d = (await r.json()) as { text?: string; error?: string };
   if (!r.ok || !d.text) throw new Error(d.error || L('提取失败', 'Extraction failed'));
   setSource(prev => (prev.trim() ? `${prev.trim()}\n\n${d.text}` : d.text!).slice(0, 14_000));
   if (opts.useUrl) setJdUrl('');
   if (opts.useImages) setImages([]);
  } catch (e) {
   setError((e as Error).message || L('提取失败', 'Extraction failed'));
  } finally {
   setExtracting(false);
  }
 };

 const canSubmitResearch = source.trim().length >= 20 || /^https?:\/\//i.test(jdUrl.trim()) || images.length > 0;

 const runResearch = async (opts?: { bypassCache?: boolean; reuseRecordId?: string; overrideSource?: string }) => {
  const clean = (opts?.overrideSource ?? source).trim();
  const cleanUrl = jdUrl.trim();
  if (clean.length < 20 && !/^https?:\/\//i.test(cleanUrl) && images.length === 0) {
   setError(L('请粘贴至少 20 字内容，或填入岗位链接 / 上传图片', 'Paste text, enter a URL, or upload images'));
   return;
  }

  stopActive();
  bgModeRef.current = false;
  setError('');
  setBgTip('');
  setBusy(true);
  setElapsed(0);
  setConnState('connecting');
  setStreamChars(0);
  setStreamTail('');
  setPingBeats(0);
  setReport(null);
  setPartialReport(null);
  setLiveProgress({
   stage: 1,
   activeKey: 'profile',
   dimCount: 0,
   stageCount: 0,
   quizCount: 0,
   questionCount: 0,
   qTitles: [],
  });
  setRawText('');
  setThoughts('');
  setStreamModel('Antigravity Agent');
  setStreamThoughts('');
  setImportResult(null);

  const ctl = new AbortController();
  abortRef.current = ctl;
  const t0 = Date.now();
  timerRef.current = window.setInterval(() => {
   setElapsed(Math.floor((Date.now() - t0) / 1000));
  }, 1000);

  let curRecordId = opts?.reuseRecordId || '';
  let curTitle = L('岗位专题', 'JD Topic');
  let curStageKey: JdStageKey = 'profile';
  let curStage1Cached = false;
  let resolvedSrc = clean;

  try {
   const geminiProxy = getGeminiAutoProxy();
   const r = await fetch('/api/jd-research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     kind,
     source: clean,
     ...(cleanUrl ? { url: cleanUrl } : {}),
     ...(images.length ? { images } : {}),
     ...(opts?.bypassCache ? { bypassCache: true } : {}),
     ...(opts?.reuseRecordId ? { recordId: opts.reuseRecordId } : {}),
     geminiProxy,
    }),
    signal: ctl.signal,
   });

   if (!r.ok || !r.body) {
    let msg = L('发起调研失败', 'Request failed');
    try {
     const j = (await r.json()) as { error?: string };
     if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
   }

   setConnState('connected');
   setJdUrl('');
   setImages([]);

   const reader = r.body.getReader();
   const dec = new TextDecoder();
   let buf = '';
   let accThoughts = '';
   let accTail = '';

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
      recordId?: string;
      title?: string;
      extractedSource?: string;
      stage?: 1 | 2;
      stepType?: string;
      step?: string;
      interactionId?: string;
      environmentId?: string;
      text?: string;
      chars?: number;
      cached?: boolean;
      stage1Cached?: boolean;
      partialReport?: JdResearchReport | null;
      progress?: JdLiveProgress;
      report?: JdResearchReport | null;
      rawText?: string;
      thoughts?: string;
      usage?: AntigravityUsage;
      model?: string;
      error?: string;
     };
     try {
      ev = JSON.parse(line);
     } catch {
      continue;
     }

     if (ev.recordId && !curRecordId) {
      curRecordId = ev.recordId;
     }
     if (curRecordId) {
      streamingRecordIdRef.current = curRecordId;
      if (!bgModeRef.current) setActiveId(curRecordId);
     }
     if (ev.extractedSource) {
      resolvedSrc = ev.extractedSource;
      if (!clean) setSource(ev.extractedSource);
     }
     if (ev.title) curTitle = ev.title;
     if (ev.model) setStreamModel(ev.model);

     if (ev.type === 'connected') {
      setConnState('connected');
      if (ev.progress) {
       setLiveProgress(ev.progress);
       curStageKey = ev.progress.activeKey;
      }
      if (curRecordId) {
       upsertJdBgTask({
        recordId: curRecordId,
        interactionId: 'stream',
        sig: 'stream',
        title: curTitle,
        createdAt: t0,
        stageKey: curStageKey,
        stage1Cached: curStage1Cached,
       });
       void refreshRecords();
      }
      continue;
     }

     if (ev.type === 'agent_ready') {
      setConnState(prev => (prev === 'streaming' || prev === 'thinking' ? prev : 'agent_ready'));
      setPingBeats(b => b + 1);
      continue;
     }

     if (ev.type === 'step' || ev.type === 'ping') {
      setPingBeats(b => b + 1);
      if (ev.stepType === 'thought' || ev.stepType === 'thought_signature' || ev.step === 'thinking') {
       setConnState(prev => (prev === 'streaming' ? prev : 'thinking'));
      }
      continue;
     }

     if (ev.type === 'thought' && typeof ev.text === 'string') {
      accThoughts += ev.text;
      setStreamThoughts(accThoughts);
      setConnState(prev => (prev === 'streaming' ? prev : 'thinking'));
      continue;
     }

     if (ev.type === 'delta') {
      setConnState('streaming');
      if (typeof ev.chars === 'number') setStreamChars(ev.chars);
      if (typeof ev.text === 'string' && ev.text) {
       accTail = (accTail + ev.text).replace(/\s+/g, ' ').slice(-180);
       setStreamTail(accTail);
      }
      if (ev.progress) {
       setLiveProgress(ev.progress);
       curStageKey = ev.progress.activeKey;
       if (ev.progress.roleTitle) curTitle = ev.progress.roleTitle;
       if (curRecordId) {
        upsertJdBgTask({
         recordId: curRecordId,
         interactionId: 'stream',
         sig: 'stream',
         title: curTitle,
         createdAt: t0,
         stageKey: curStageKey,
         stage1Cached: curStage1Cached,
        });
       }
      }
      continue;
     }

     if (ev.type === 'stage1') {
      if (typeof ev.stage1Cached === 'boolean') curStage1Cached = ev.stage1Cached;
      if (ev.partialReport) {
       setPartialReport(ev.partialReport);
       if (ev.partialReport.roleTitle) curTitle = ev.partialReport.roleTitle;
      }
      if (ev.thoughts && !accThoughts) {
       accThoughts = ev.thoughts;
       setStreamThoughts(accThoughts);
      }
      if (ev.progress) {
       setLiveProgress(ev.progress);
       curStageKey = ev.progress.activeKey;
      }
      if (curRecordId) {
       upsertJdBgTask({
        recordId: curRecordId,
        interactionId: 'stream',
        sig: 'stream',
        title: curTitle,
        createdAt: t0,
        stageKey: curStageKey,
        stage1Cached: curStage1Cached,
       });
       void refreshRecords();
      }
      continue;
     }

     if (ev.type === 'stage2_start') {
      accTail = '';
      setStreamTail('');
      setStreamChars(0);
      setConnState('agent_ready');
      if (ev.progress) {
       setLiveProgress(ev.progress);
       curStageKey = ev.progress.activeKey;
      }
      continue;
     }

     if (ev.type === 'done') {
      const doneId = ev.recordId || curRecordId;
      streamingRecordIdRef.current = '';
      if (doneId) removeJdBgTask(doneId);
      const finalThoughts = ev.thoughts || accThoughts;
      if (!bgModeRef.current) {
       applyReportView(
        doneId,
        ev.report ?? null,
        ev.rawText || '',
        finalThoughts,
        ev.model || '',
        null,
        resolvedSrc,
        {
         cached: ev.cached,
         stage1Cached: ev.stage1Cached ?? curStage1Cached,
         usage: ev.usage,
         kind,
        },
       );
      } else if (doneId) {
       notifyJdTaskDone({
        recordId: doneId,
        title: ev.report?.roleTitle || curTitle,
        status: 'completed',
       });
      }
      void refreshRecords();
      stopActive();
      return;
     }

     if (ev.type === 'error') {
      const errId = ev.recordId || curRecordId;
      streamingRecordIdRef.current = '';
      if (errId) removeJdBgTask(errId);
      throw new Error(ev.error || L('调研流式生成中断，请点击一键重试', 'Stream interrupted'));
     }
    }
   }
  } catch (e) {
   streamingRecordIdRef.current = '';
   if (curRecordId) removeJdBgTask(curRecordId);
   if (!ctl.signal.aborted) {
    setError((e as Error).message || L('调研失败', 'Research failed'));
    if (bgModeRef.current && curRecordId) {
     notifyJdTaskDone({
      recordId: curRecordId,
      title: curTitle,
      status: 'error',
      error: (e as Error).message || L('调研失败', 'Research failed'),
     });
    }
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

 const downloadMarkdownFile = () => {
  if (!fullMarkdown) return;
  const name = (report?.roleTitle || 'JD深度调研报告').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 50);
  const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
 };

 const handleExportPdf = async () => {
  if (!report || exportingPdf || !printRef.current) return;
  setExportingPdf(true);
  try {
   const name = (report.roleTitle || 'JD深度调研报告').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 50);
   await exportElementToPdf(printRef.current, `${name}.pdf`);
  } catch {
   setImportErr(L('PDF 导出失败，请重试', 'PDF export failed'));
  } finally {
   setExportingPdf(false);
  }
 };

 const filteredRecords = useMemo(() => {
  const q = histQuery.trim().toLowerCase();
  if (!q) return records;
  return records.filter(
   r =>
    r.id === activeId ||
    r.title.toLowerCase().includes(q) ||
    r.subtitle.toLowerCase().includes(q) ||
    (r.payload?.report?.companyStyle || '').toLowerCase().includes(q),
  );
 }, [records, histQuery, activeId]);

 const fullMarkdown = useMemo(() => (report ? reportToMarkdown(report) : rawText), [report, rawText]);
 const hasOutput = Boolean(report || rawText);
 const activeStageIdx = liveProgress ? STAGE_ORDER.indexOf(liveProgress.activeKey) : 0;

 const stageMeta: { key: JdStageKey; zh: string; en: string; count?: string }[] = [
  {
   key: 'profile',
   zh: '考点画像',
   en: 'Profile',
   count: liveProgress && liveProgress.dimCount > 0 ? `${liveProgress.dimCount}` : undefined,
  },
  {
   key: 'roadmap',
   zh: '复习路径',
   en: 'Roadmap',
   count: liveProgress && liveProgress.stageCount > 0 ? `${liveProgress.stageCount}` : undefined,
  },
  {
   key: 'quizzes',
   zh: '路径学习题',
   en: 'Study Quizzes',
   count: liveProgress && liveProgress.quizCount > 0 ? `${liveProgress.quizCount}` : undefined,
  },
  {
   key: 'questions',
   zh: '面试题库',
   en: 'Interview Qs',
   count: liveProgress && liveProgress.questionCount > 0 ? `${liveProgress.questionCount}` : undefined,
  },
 ];

 return (
  <div className="ai-shell iv-shell">
   <SiteHeader active="interview" username={username} />
   <main className="ai-main jdr-main">
    <div className="arch-top">
     <a href="/interview" className="arch-back">
      <ArrowLeft size={16} />
      {L('返回面试', 'Back to Interview')}
     </a>
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

      {records.length > 1 && (
       <div className="jdr-hist-search">
        <Search size={12} />
        <input
         value={histQuery}
         onChange={e => setHistQuery(e.target.value)}
         placeholder={L('搜索历史…', 'Search…')}
         aria-label={L('搜索历史', 'Search history')}
        />
        {histQuery && (
         <button type="button" onClick={() => setHistQuery('')} aria-label={L('清除搜索', 'Clear')}>
          <X size={11} />
         </button>
        )}
       </div>
      )}

      {filteredRecords.map(rec => (
       <div
        key={rec.id}
        className={'jdr-hist-chip' + (activeId === rec.id ? ' on' : '')}
        onClick={() => openRecord(rec)}
        onDoubleClick={() => {
         if (activeId === rec.id) {
          setRenameVal(report?.roleTitle || rec.title);
          setRenaming(true);
         }
        }}
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

       {kind === 'jd' && (
        <div className="arch-field">
         <span>{L('岗位链接', 'Job URL')}</span>
         <div className="jdr-url-row">
          <input
           type="url"
           value={jdUrl}
           onChange={e => setJdUrl(e.target.value)}
           placeholder="https://..."
           disabled={!member || busy || extracting}
          />
          {member && jdUrl.trim() && (
           <button
            type="button"
            className="button secondary arch-new-btn"
            disabled={extracting || busy}
            onClick={() => void extractInputs({ useUrl: true })}
           >
            {extracting ? <Loader2 size={14} className="ai-spin" /> : <Link2 size={14} />}
            <span>{L('提取', 'Fetch')}</span>
           </button>
          )}
         </div>
        </div>
       )}

       <label className="arch-field">
        <span>{kind === 'jd' ? L('岗位 JD', 'Job Description') : L('面经内容', 'Interview Log')}</span>
        <textarea
         rows={7}
         value={source}
         onChange={e => setSource(e.target.value)}
         onPaste={e => {
          const files = [...e.clipboardData.files];
          if (files.some(f => f.type.startsWith('image/'))) {
           e.preventDefault();
           void addJdImages(files);
          }
         }}
         maxLength={14000}
         placeholder={
          kind === 'jd'
           ? L('粘贴岗位 JD，或直接粘贴截图…', 'Paste JD text or screenshot…')
           : L('粘贴面经内容，或直接粘贴截图…', 'Paste interview log or screenshot…')
         }
        />
       </label>

       <div className="jdr-img-row">
        <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         multiple
         hidden
         onChange={e => {
          if (e.target.files) void addJdImages(e.target.files);
          e.target.value = '';
         }}
        />
        <button
         type="button"
         className="button secondary arch-new-btn"
         disabled={!member || busy || extracting || images.length >= 4}
         onClick={() => fileInputRef.current?.click()}
        >
         <ImagePlus size={14} />
         <span>{L(`上传图片 (${images.length}/4)`, `Images (${images.length}/4)`)}</span>
        </button>
        {member && images.length > 0 && (
         <button
          type="button"
          className="button secondary arch-new-btn"
          disabled={extracting || busy}
          onClick={() => void extractInputs({ useImages: true })}
         >
          {extracting ? <Loader2 size={14} className="ai-spin" /> : <Check size={14} />}
          <span>{L('识别文字', 'Extract Text')}</span>
         </button>
        )}
        {images.map((u, idx) => (
         <span key={idx} className="jdr-img-thumb">
          <img src={u} alt="" />
          <button
           type="button"
           aria-label={L('移除图片', 'Remove image')}
           onClick={() => setImages(prev => prev.filter((_, j) => j !== idx))}
          >
           <X size={11} />
          </button>
         </span>
        ))}
       </div>

       {bgTip && (
        <div className="jdr-import-ok" style={{ width: 'fit-content' }}>
         <Loader2 size={13} className="ai-spin" />
         <span>{bgTip}</span>
        </div>
       )}

       {error && (
        <div className="ai-grade-error ai-grade-retry" style={{ margin: 0 }}>
         <span>{error}</span>
         {member && canSubmitResearch && (
          <button
           type="button"
           className="button secondary arch-new-btn"
           onClick={() => void runResearch({ bypassCache: true, reuseRecordId: activeId || undefined })}
          >
           <RotateCcw size={14} />
           <span>{L('一键重试', 'Retry')}</span>
          </button>
         )}
        </div>
       )}

       <div className="arch-actions">
        {member ? (
         <button
          type="button"
          className="button primary"
          disabled={busy || extracting || !canSubmitResearch}
          onClick={() => void runResearch()}
         >
          <Compass size={15} />
          <span>{L('开始深度调研', 'Start Research')}</span>
         </button>
        ) : (
         <a href="/login?return_to=%2Finterview%2Fjd-research" className="button primary">
          <Lock size={15} />
          <span>{L('登录后开始调研', 'Sign in to Research')}</span>
         </a>
        )}
        {(source.trim() || jdUrl.trim() || images.length > 0) && (
         <button
          type="button"
          className="button secondary"
          onClick={() => {
           setSource('');
           setJdUrl('');
           setImages([]);
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
     <>
      <div className="ai-card arch-reply-card">
       <div className="arch-running">
        <div className="jdr-stream-meta">
         <span className="arch-running-left">
          <Loader2 size={16} className="ai-spin" />
          <span>
           {L(
            `第 ${liveProgress?.stage || 1}/2 步 · ${stageMeta[activeStageIdx]?.zh || '深度调研'} · ${elapsed}s`,
            `Step ${liveProgress?.stage || 1}/2 · ${stageMeta[activeStageIdx]?.en || 'Researching'} · ${elapsed}s`,
           )}
          </span>
         </span>
         <span className={'jdr-conn-pill ' + (connState === 'connecting' ? 'wait' : 'ok')}>
          <i className="jdr-conn-dot" />
          <span>
           {connState === 'connecting'
            ? L('连接中…', 'Connecting…')
            : connState === 'connected'
              ? L('已连接流式通道', 'Stream Connected')
              : connState === 'agent_ready'
                ? L('Agent 已连接 · 思考中', 'Agent Ready · Thinking')
                : connState === 'thinking'
                  ? L('实时思考中', 'Streaming Thoughts')
                  : L(`流式输出 · ${streamChars} 字`, `Streaming · ${streamChars} chars`)}
          </span>
         </span>
         {liveProgress?.stage1Cached && (
          <span className="jdr-cache-tag">
           <Zap size={12} />
           {L('画像与路径已命中缓存', 'Stage 1 Cache Hit')}
          </span>
         )}
         {streamModel && <span className="jdr-model-pill">{streamModel}</span>}
        </div>
        <div className="jdr-run-btns">
         <button type="button" className="button secondary arch-stop-btn" onClick={moveToBackground}>
          <Minimize2 size={13} />
          <span>{L('后台生成', 'Run in Background')}</span>
         </button>
         <button type="button" className="button secondary arch-stop-btn" onClick={stopActive}>
          <Square size={12} fill="currentColor" />
          <span>{L('停止', 'Stop')}</span>
         </button>
        </div>
       </div>

       <div className="jdr-stepper" role="list" aria-label={L('生成阶段进度', 'Generation stages')}>
        {stageMeta.map((st, idx) => {
         const isDone = idx < activeStageIdx;
         const isActive = idx === activeStageIdx;
         return (
          <div
           key={st.key}
           role="listitem"
           className={'jdr-stage-item' + (isDone ? ' done' : isActive ? ' active' : '')}
          >
           <span className="jdr-stage-num">
            {isDone ? <Check size={12} /> : isActive ? <Loader2 size={12} className="ai-spin" /> : idx + 1}
           </span>
           <span className="jdr-stage-label">{L(st.zh, st.en)}</span>
           {st.count && <span className="jdr-stage-cnt">{st.count}</span>}
          </div>
         );
        })}
       </div>

       <div className="arch-thoughts">
        <div className="arch-thoughts-btn" style={{ cursor: 'default' }}>
         <span>{L('思考过程', 'Reasoning')}</span>
        </div>
        <pre ref={thinkBoxRef} className="arch-thoughts-body">
         {streamThoughts
          ? `${streamThoughts}${connState === 'thinking' ? ' ▋' : ''}`
          : connState === 'connecting'
            ? L('正在建立流式连接…', 'Establishing stream connection…')
            : connState === 'connected'
              ? L('✓ 已连接流式通道，正在建立 Agent 远程推理会话…', '✓ Stream connected, initializing Agent session…')
              : L(
                 `✓ Agent 会话已连接，正在深度拆解岗位技术栈与考点权重…${pingBeats > 1 ? `（心跳 #${pingBeats}）` : ''} ▋`,
                 `✓ Agent session active, analyzing JD…${pingBeats > 1 ? ` (beat #${pingBeats})` : ''} ▋`,
                )}
        </pre>
       </div>

       {streamTail && (
        <div className="jdr-stream-tail" aria-live="off">
         <span className="jdr-tail-tag">{L('实时输出流', 'Live Stream')}</span>
         <code>{streamTail} ▋</code>
        </div>
       )}

       {liveProgress && (liveProgress.roleTitle || liveProgress.qTitles.length > 0) && (
        <div className="jdr-stream-preview">
         {liveProgress.roleTitle && <div className="jdr-stream-title">{liveProgress.roleTitle}</div>}
         <div className="jdr-stream-stats">
          {liveProgress.inferredLevel && <span className="jdr-style-tag">{liveProgress.inferredLevel}</span>}
          {liveProgress.prepDays && <span className="jdr-style-tag">{liveProgress.prepDays}</span>}
          {liveProgress.companyStyle && <span className="jdr-style-tag">{liveProgress.companyStyle}</span>}
         </div>
         {liveProgress.qTitles.length > 0 && (
          <ol className="jdr-stream-qs">
           {liveProgress.qTitles.map((t, i) => (
            <li key={i}>{t}</li>
           ))}
          </ol>
         )}
        </div>
       )}
      </div>

      {/* Live Stage 1 Preview while Stage 2 generates quizzes and interview questions */}
      {partialReport && (
       <section className="jdr-panel">
        <div className="jdr-dim-list">
         {partialReport.dimensions.map((d, i) => (
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

        {partialReport.roadmap.length > 0 && (
         <div className="jdr-roadmap">
          {partialReport.roadmap.map((s, i) => (
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
           </div>
          ))}
         </div>
        )}
       </section>
      )}
     </>
    )}

    {!busy && hasOutput && (
     <>
      <section className="ai-card jdr-head-card">
       <div className="jdr-head-top">
        <div className="jdr-head-title">
         <div className="jdr-title-row">
          {renaming ? (
           <form
            className="jdr-rename-box"
            onSubmit={e => {
             e.preventDefault();
             void saveRename();
            }}
           >
            <input
             value={renameVal}
             onChange={e => setRenameVal(e.target.value)}
             maxLength={60}
             autoFocus
             onKeyDown={e => {
              if (e.key === 'Escape') setRenaming(false);
             }}
            />
            <button type="submit" className="jdr-icon-btn primary" aria-label={L('保存名称', 'Save')}>
             <Check size={14} />
            </button>
            <button
             type="button"
             className="jdr-icon-btn"
             aria-label={L('取消', 'Cancel')}
             onClick={() => setRenaming(false)}
            >
             <X size={14} />
            </button>
           </form>
          ) : (
           <>
            <h2>{report ? report.roleTitle : L('调研报告', 'Research Report')}</h2>
            {activeId && (
             <button
              type="button"
              className="jdr-icon-btn"
              title={L('重命名', 'Rename')}
              aria-label={L('重命名', 'Rename')}
              onClick={() => {
               const cur =
                report?.roleTitle || records.find(r => r.id === activeId)?.title || L('调研报告', 'Research Report');
               setRenameVal(cur);
               setRenaming(true);
              }}
             >
              <Pencil size={13} />
             </button>
            )}
           </>
          )}
         </div>
         <div className="jdr-head-tags">
          {report?.inferredLevel && <span className="jdr-style-tag">{report.inferredLevel}</span>}
          {report?.prepDays && <span className="jdr-style-tag">{report.prepDays}</span>}
          {report?.companyStyle && <span className="jdr-style-tag">{report.companyStyle}</span>}
          {reportCached ? (
           <span className="jdr-cache-tag">
            <Zap size={12} />
            {L('缓存命中 · 0 Token', 'Cache Hit · 0 Tokens')}
           </span>
          ) : (reportStage1Cached || (reportUsage?.cachedTokens ?? 0) > 0) ? (
           <span className="jdr-cache-tag">
            <Zap size={12} />
            {(reportUsage?.cachedTokens ?? 0) > 0
             ? L(`缓存命中 ${fmtTok(reportUsage!.cachedTokens)}`, `Cached ${fmtTok(reportUsage!.cachedTokens)}`)
             : L('阶段缓存命中', 'Stage Cache Hit')}
           </span>
          ) : null}
          {reportModel && <span className="jdr-model-pill">{reportModel}</span>}
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
         {activeId && report && countJdStudyQuizzes(report) > 0 && (
          <a href={`/learn/jd-special?id=${encodeURIComponent(activeId)}`} className="button secondary arch-new-btn">
           <GraduationCap size={14} />
           <span>{L(`专题学习 (${countJdStudyQuizzes(report)})`, `Learn (${countJdStudyQuizzes(report)})`)}</span>
          </a>
         )}
         <button
          type="button"
          className="ai-note-pill"
          onClick={() => void copyText('all', fullMarkdown)}
         >
          {copiedKey === 'all' ? <Check size={13} /> : <Copy size={13} />}
          <span>{copiedKey === 'all' ? L('已复制', 'Copied') : L('复制 MD', 'Copy MD')}</span>
         </button>
         <button
          type="button"
          className="ai-note-pill"
          onClick={downloadMarkdownFile}
         >
          <FileDown size={13} />
          <span>{L('下载 MD', 'MD')}</span>
         </button>
         {report && (
          <button
           type="button"
           className="ai-note-pill"
           disabled={exportingPdf}
           onClick={() => void handleExportPdf()}
          >
           {exportingPdf ? <Loader2 size={13} className="ai-spin" /> : <FileText size={13} />}
           <span>{exportingPdf ? L('导出中…', 'Exporting…') : L('导出 PDF', 'PDF')}</span>
          </button>
         )}
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
           href: activeId ? `/interview/jd-research?id=${encodeURIComponent(activeId)}` : '/interview/jd-research',
          }}
         />
         {member && source.trim().length >= 20 && (
          <button
           type="button"
           className="button secondary arch-new-btn"
           onClick={() => void runResearch({ bypassCache: true, reuseRecordId: activeId || undefined })}
          >
           <RotateCcw size={14} />
           <span>{L('重新生成', 'Regenerate')}</span>
          </button>
         )}
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
          <span>{L(`面试专题 (${report.questions.length})`, `Questions (${report.questions.length})`)}</span>
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
            <div className="jdr-step-top">
             <div className="jdr-step-head">
              <span className="jdr-phase">{s.phase}</span>
              <strong>{s.title}</strong>
             </div>
             {activeId && s.quizzes && s.quizzes.length > 0 && (
              <a
               href={`/learn/jd-special?id=${encodeURIComponent(activeId)}&step=${i}`}
               className="jdr-link-pill"
              >
               <GraduationCap size={13} />
               <span>{L(`本阶段学习题 (${s.quizzes.length})`, `Practice (${s.quizzes.length})`)}</span>
               <ArrowUpRight size={13} />
              </a>
             )}
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
                   href: activeId ? `/interview/jd-research?id=${encodeURIComponent(activeId)}` : '/interview/jd-research',
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

        {/* Offscreen printable sheet for A4 PDF export (includes Profile, Roadmap, Study Quizzes, and Interview Questions) */}
        <div ref={printRef} className="jdr-print-host" aria-hidden="true">
         <h1>{report.roleTitle}</h1>
         <p>
          {[report.inferredLevel, report.prepDays, report.companyStyle].filter(Boolean).join(' · ')}
         </p>
         {report.summary && <p>{report.summary}</p>}

         {report.dimensions.length > 0 && (
          <>
           <h2>一、核心考点权重</h2>
           <ul>
            {report.dimensions.map((d, i) => (
             <li key={i}>
              <strong>
               [{d.priority} · {d.weight}%] {d.name}
              </strong>
              ：{d.focus}
             </li>
            ))}
           </ul>
          </>
         )}

         {report.traps.length > 0 && (
          <>
           <h2>二、高频扣分点</h2>
           <ol>
            {report.traps.map((t, i) => (
             <li key={i}>{t}</li>
            ))}
           </ol>
          </>
         )}

         {report.roadmap.length > 0 && (
          <>
           <h2>三、分阶段复习路径与配套学习题</h2>
           {report.roadmap.map((s, si) => (
            <div key={si} className="jdr-print-item">
             <h3>
              {s.phase} · {s.title}
             </h3>
             <ul>
              {s.goals.map((g, gi) => (
               <li key={gi}>{g}</li>
              ))}
             </ul>
             {s.quizzes &&
              s.quizzes.map((qz, qi) => (
               <div key={qz.id} className="jdr-print-item">
                <p>
                 <strong>
                  练习 {qi + 1}（{aiQuizTypes[qz.type ?? 'single']}）：{qz.q}
                 </strong>
                </p>
                {qz.code && <pre>{qz.code}</pre>}
                {'options' in qz && Array.isArray(qz.options) && (
                 <ul>
                  {qz.options.map((opt, oi) => (
                   <li key={oi}>
                    {LETTERS[oi] || oi + 1}. {opt}
                   </li>
                  ))}
                 </ul>
                )}
                {qz.type === 'multi' ? (
                 <p>
                  <strong>正确答案：</strong>
                  {qz.answers.map(a => LETTERS[a] || a + 1).join('、')}
                 </p>
                ) : qz.type === 'fill' ? (
                 <p>
                  <strong>参考答案：</strong>
                  {qz.accepted.join(' / ')}
                 </p>
                ) : qz.type === 'short' || qz.type === 'code' || qz.type === 'design' ? (
                 <>
                  {qz.type === 'code' ? (
                   <pre>{qz.reference}</pre>
                  ) : (
                   <p>
                    <strong>参考答案：</strong>
                    {qz.reference}
                   </p>
                  )}
                  {qz.points?.length > 0 && (
                   <p>
                    <strong>得分要点：</strong>
                    {qz.points.join('；')}
                   </p>
                  )}
                 </>
                ) : (
                 'answer' in qz &&
                 typeof qz.answer === 'number' && (
                  <p>
                   <strong>正确答案：</strong>
                   {LETTERS[qz.answer] || qz.answer + 1}
                  </p>
                 )
                )}
                {qz.explain && (
                 <p>
                  <strong>解析：</strong>
                  {qz.explain}
                 </p>
                )}
               </div>
              ))}
            </div>
           ))}
          </>
         )}

         {report.questions.length > 0 && (
          <>
           <h2>四、专题高频面试题</h2>
           {report.questions.map((q, qi) => (
            <div key={qi} className="jdr-print-item">
             <h3>
              {qi + 1}. [{q.difficulty}] {q.title}
             </h3>
             {q.whyAsked && <p>考察点：{q.whyAsked}</p>}
             <RichMarkdown text={q.answer} />
             {q.followups.length > 0 && <p>常见追问：{q.followups.join('；')}</p>}
            </div>
           ))}
          </>
         )}
        </div>
       </>
      ) : (
       <div className="ai-card arch-reply-card">
        <div className="ai-grade-error ai-grade-retry" style={{ marginBottom: 10 }}>
         <span>{L('结构化报告解析未完成，可一键重试生成完整报告', 'Report parsing incomplete — click Retry to regenerate')}</span>
         {member && source.trim().length >= 20 && (
          <button
           type="button"
           className="button primary arch-new-btn"
           onClick={() => void runResearch({ bypassCache: true, reuseRecordId: activeId || undefined })}
          >
           <RotateCcw size={14} />
           <span>{L('一键重试', 'Retry')}</span>
          </button>
         )}
        </div>
        <RichMarkdown text={rawText} />
       </div>
      )}
     </>
    )}
   </main>
  </div>
 );
}
