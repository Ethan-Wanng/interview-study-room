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
 Briefcase,
 Check,
 ChevronDown,
 ChevronUp,
 Clock,
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
 Sparkles,
 Square,
 Target,
 X,
 Zap,
} from 'lucide-react';
import SiteHeader from '../../components/site-header';
import AddToNoteButton from '../../components/add-to-note';
import { useI18n } from '../../components/i18n';
import { ensureAiConfigStatus, getCachedCustomAiSpec } from '../../ai/ai-settings';
import { resolveLiveAiSelection, shouldUseLocalBridge, useGlobalAiModel } from '../../ai/thinking-pref';
import { LOCAL_PROVIDER_LABEL, useLocalBridgeConfig } from '@/lib/local-bridge-config';
import { streamDeepViaBridge } from '@/lib/local-bridge-client';
import {
 createThrottledCheckpoint,
 makeCheckpointKey,
 readAiCheckpoint,
 removeAiCheckpoint,
 writeAiCheckpoint,
} from '@/lib/ai-checkpoint';
import { aiQuizTypes, type AiQuiz } from '@/content/journey';
import type { AiTokenUsage as AntigravityUsage } from '@/lib/jd-research-types';
import {
 countJdStudyQuizzes,
 reportToMarkdown,
 resumeToMarkdown,
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
const fmtDuration = (ms: number, en: boolean) => {
 const sec = Math.max(0, Math.round(ms / 1000));
 if (sec < 1) return en ? '<1s' : '<1秒';
 if (sec < 60) return en ? `${sec}s` : `${sec}秒`;
 const min = Math.floor(sec / 60);
 const rem = sec % 60;
 if (en) return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
 return rem > 0 ? `${min}分${rem}秒` : `${min}分`;
};

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
type TabKey = 'profile' | 'roadmap' | 'questions' | 'resume';

type StoredPayload = {
 kind?: JdInputKind;
 source?: string;
 hashHex?: string;
 pipeline?: string;
 startedAt?: number;
 durationMs?: number;
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
 dailyLimit,
 dailyUsed,
}: {
 username: string;
 member: boolean;
 subjects: SubjectOpt[];
 dailyLimit?: number | null;
 dailyUsed?: number;
}) {
 const { locale } = useI18n();
 const L = (zh: string, en: string) => (locale === 'en' ? en : zh);
 const [globalModel] = useGlobalAiModel();
 const [localCfg] = useLocalBridgeConfig();
 const useLocal = shouldUseLocalBridge('deep', globalModel, localCfg);
 const [usedToday, setUsedToday] = useState(dailyUsed ?? 0);

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
 const [reportDurationMs, setReportDurationMs] = useState<number | undefined>(undefined);
 const [fillingStepIdx, setFillingStepIdx] = useState<number | null>(null);
 const [fillStepErr, setFillStepErr] = useState('');
 const [thoughtsOpen, setThoughtsOpen] = useState(false);
 const [sourceOpen, setSourceOpen] = useState(false);
 const [tab, setTab] = useState<TabKey>('profile');

 const [renaming, setRenaming] = useState(false);
 const [renameVal, setRenameVal] = useState('');
 const [exportingPdf, setExportingPdf] = useState(false);
 const [exportingResumePdf, setExportingResumePdf] = useState(false);

 const [generatingResume, setGeneratingResume] = useState(false);
 const [resumeElapsed, setResumeElapsed] = useState(0);
 const [resumeModel, setResumeModel] = useState('');
 const [resumeThoughts, setResumeThoughts] = useState('');
 const [resumeTail, setResumeTail] = useState('');
 const [resumeErr, setResumeErr] = useState('');

 const [selected, setSelected] = useState<Record<number, boolean>>({});
 const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({ 0: true });
 const [targetSubject, setTargetSubject] = useState<string>('mine');
 const [importing, setImporting] = useState(false);
 const [importResult, setImportResult] = useState<{ count: number; subject: string } | null>(null);
 const [importErr, setImportErr] = useState('');
 const [copiedKey, setCopiedKey] = useState('');

 const abortRef = useRef<AbortController | null>(null);
 const timerRef = useRef<number | null>(null);
 const resumeAbortRef = useRef<AbortController | null>(null);
 const resumeTimerRef = useRef<number | null>(null);
 const bgModeRef = useRef(false);
 const streamingRecordIdRef = useRef('');
 const thinkBoxRef = useRef<HTMLPreElement | null>(null);
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const printRef = useRef<HTMLDivElement | null>(null);
 const resumePrintRef = useRef<HTMLDivElement | null>(null);
 const researchCpRef = useRef<ReturnType<typeof createThrottledCheckpoint<{
  recordId: string;
  kind: JdInputKind;
  source: string;
  stageKey: JdStageKey;
  thoughts: string;
  tail: string;
  model: string;
 }>> | null>(null);
 const resumeCpRef = useRef<ReturnType<typeof createThrottledCheckpoint<{
  recordId: string;
  bypassCache: boolean;
  thoughts: string;
  tail: string;
  model: string;
 }>> | null>(null);
 const autoResumedRef = useRef<Set<string>>(new Set());

 const stopResume = (clearCheckpoint = false) => {
  resumeAbortRef.current?.abort();
  resumeAbortRef.current = null;
  if (resumeTimerRef.current !== null) {
   window.clearInterval(resumeTimerRef.current);
   resumeTimerRef.current = null;
  }
  if (resumeCpRef.current) {
   if (clearCheckpoint) resumeCpRef.current.clear();
   else {
    resumeCpRef.current.flush('interrupted');
    resumeCpRef.current.dispose();
   }
   resumeCpRef.current = null;
  }
  setGeneratingResume(false);
 };

 const stopActive = (clearCheckpoint = false) => {
  stopResume(clearCheckpoint);
  bgModeRef.current = false;
  if (streamingRecordIdRef.current) {
   removeJdBgTask(streamingRecordIdRef.current);
   if (clearCheckpoint) removeAiCheckpoint(makeCheckpointKey('jd-research', streamingRecordIdRef.current));
   streamingRecordIdRef.current = '';
  }
  abortRef.current?.abort();
  abortRef.current = null;
  if (timerRef.current !== null) {
   window.clearInterval(timerRef.current);
   timerRef.current = null;
  }
  if (researchCpRef.current) {
   if (clearCheckpoint) researchCpRef.current.clear();
   else {
    researchCpRef.current.flush('interrupted');
    researchCpRef.current.dispose();
   }
   researchCpRef.current = null;
  }
  setBusy(false);
 };

 useEffect(
  () => () => {
   if (timerRef.current !== null) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
   }
   if (resumeTimerRef.current !== null) {
    window.clearInterval(resumeTimerRef.current);
    resumeTimerRef.current = null;
   }
   resumeAbortRef.current?.abort();
   if (resumeCpRef.current) {
    resumeCpRef.current.flush('interrupted');
    resumeCpRef.current.dispose();
    resumeCpRef.current = null;
   }
   if (researchCpRef.current) {
    researchCpRef.current.flush('interrupted');
    researchCpRef.current.dispose();
    researchCpRef.current = null;
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
  meta?: {
   cached?: boolean;
   stage1Cached?: boolean;
   usage?: AntigravityUsage;
   durationMs?: number;
   kind?: JdInputKind;
  },
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
  setReportDurationMs(meta?.durationMs);
  setFillStepErr('');
  setResumeErr('');
  setResumeThoughts('');
  setResumeTail('');
  setResumeModel('');
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
   if (recId) {
    if (rep.resume) {
     removeAiCheckpoint(makeCheckpointKey('jd-resume', recId));
    } else {
     const rCp = readAiCheckpoint<{
      recordId: string;
      bypassCache: boolean;
      thoughts: string;
      tail: string;
      model: string;
     }>(makeCheckpointKey('jd-resume', recId), 20 * 60_000);
     if (rCp && (rCp.status === 'running' || rCp.status === 'interrupted') && !autoResumedRef.current.has(`resume:${recId}`)) {
      autoResumedRef.current.add(`resume:${recId}`);
      setTab('resume');
      void generateResume({
       bypassCache: rCp.data.bypassCache,
       targetRecordId: recId,
       targetReport: rep,
       initialThoughts: rCp.data.thoughts,
       initialTail: rCp.data.tail,
       initialModel: rCp.data.model,
      });
     }
    }
   }
  }
 };

 const fillRoadmapPhase = async (stepIdx: number) => {
  if (!activeId || fillingStepIdx !== null) return;
  const cpKey = makeCheckpointKey('jd-fill', `${activeId}:${stepIdx}`);
  writeAiCheckpoint({
   key: cpKey,
   kind: 'jd-fill',
   status: 'running',
   startedAt: Date.now(),
   updatedAt: Date.now(),
   data: { recordId: activeId, stepIdx },
  });
  setFillingStepIdx(stepIdx);
  setFillStepErr('');
  setResumeErr('');
  setResumeThoughts('');
  setResumeTail('');
  setResumeModel('');
  try {
   if (!getCachedCustomAiSpec()) await ensureAiConfigStatus();
   const sel = resolveLiveAiSelection('deep', getCachedCustomAiSpec(), !username);
   if (sel.useLocal && report) {
    const pRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'prompts',
      task: 'phase-quizzes',
      kind,
      source: source || report.roleTitle,
      stage1: report,
      phaseIndex: stepIdx,
     }),
    });
    const pData = (await pRes.json()) as { system?: string; user?: string; reusedQuizzes?: AiQuiz[]; error?: string };
    if (!pRes.ok || !pData.system || !pData.user) {
     throw new Error(pData.error || L('补题失败，请重试', 'Generation failed'));
    }
    const out = await streamDeepViaBridge({
     cfg: sel.localCfg,
     system: pData.system,
     messages: [{ role: 'user', content: pData.user }],
     thinkingLevel: sel.thinkingLevel,
     jsonMode: true,
     onDelta: () => {},
    });
    const parseRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'parse',
      task: 'phase-quizzes',
      rawText: out.text,
      phaseIndex: stepIdx,
      reusedQuizzes: pData.reusedQuizzes || [],
     }),
    });
    const parseData = (await parseRes.json()) as { quizzes?: AiQuiz[]; error?: string };
    if (!parseRes.ok || !parseData.quizzes?.length) {
     throw new Error(parseData.error || L('补题未返回完整题库，请再试一次', 'Incomplete result — please try again'));
    }
    const doneReport: JdResearchReport = {
     ...report,
     roadmap: report.roadmap.map((step, idx) => (idx === stepIdx ? { ...step, quizzes: parseData.quizzes } : step)),
    };
    await fetch('/api/ai-interview-records', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      id: activeId,
      kind: 'jd-research',
      patch: true,
      payload: { report: doneReport },
     }),
    }).catch(() => {});
    removeAiCheckpoint(cpKey);
    setReport(doneReport);
    void refreshRecords();
    return;
   }
   const r = await fetch('/api/jd-research/fill-phase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: activeId,
     stepIdx,
     model: sel.model,
     thinkingLevel: sel.thinkingLevel,
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
   removeAiCheckpoint(cpKey);
   setReport(doneReport);
   if (doneUsage) setReportUsage(doneUsage);
   void refreshRecords();
  } catch (e) {
   removeAiCheckpoint(cpKey);
   setFillStepErr((e as Error).message || L('补题失败，请重试', 'Generation failed'));
  } finally {
   setFillingStepIdx(null);
  }
 };

 const generateResume = async (opts?: {
  bypassCache?: boolean;
  targetRecordId?: string;
  targetReport?: JdResearchReport;
  initialThoughts?: string;
  initialTail?: string;
  initialModel?: string;
 }) => {
  const rid = opts?.targetRecordId ?? activeId;
  const targetRep = opts?.targetReport ?? report;
  if (!rid || generatingResume || !targetRep) return;
  stopResume(false);
  setGeneratingResume(true);
  setResumeElapsed(0);
  setResumeErr('');
  setResumeThoughts(opts?.initialThoughts ?? '');
  setResumeTail(opts?.initialTail ?? '');
  setResumeModel(opts?.initialModel ?? '');

  const ctl = new AbortController();
  resumeAbortRef.current = ctl;
  const t0 = Date.now();
  resumeTimerRef.current = window.setInterval(() => {
   setResumeElapsed(Math.floor((Date.now() - t0) / 1000));
  }, 1000);

  const cpKey = makeCheckpointKey('jd-resume', rid);
  const cp = createThrottledCheckpoint<{
   recordId: string;
   bypassCache: boolean;
   thoughts: string;
   tail: string;
   model: string;
  }>(cpKey, 'jd-resume', 450);
  resumeCpRef.current = cp;

  let accTh = opts?.initialThoughts ?? '';
  let accTail = opts?.initialTail ?? '';
  let curModel = opts?.initialModel ?? '';
  const saveCp = (status: 'running' | 'interrupted' = 'running') => {
   cp.update(
    {
     recordId: rid,
     bypassCache: Boolean(opts?.bypassCache),
     thoughts: accTh.slice(-16_000),
     tail: accTail,
     model: curModel,
    },
    status,
    curModel || undefined,
   );
  };
  saveCp('running');
  cp.flush('running');

  try {
   if (!getCachedCustomAiSpec()) await ensureAiConfigStatus();
   if (ctl.signal.aborted) return;
   const sel = resolveLiveAiSelection('deep', getCachedCustomAiSpec(), !username);
   if (sel.useLocal) {
    curModel = `${LOCAL_PROVIDER_LABEL[sel.localCfg.provider]} · ${sel.localCfg.model.trim() || 'default'}`;
    setResumeModel(curModel);
    saveCp('running');
    const pRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'prompts',
      task: 'resume',
      kind,
      source: source || targetRep.roleTitle,
      report: targetRep,
     }),
     signal: ctl.signal,
    });
    const pData = (await pRes.json()) as { system?: string; user?: string; error?: string };
    if (!pRes.ok || !pData.system || !pData.user) {
     throw new Error(pData.error || L('生成参考简历失败，请重试', 'Resume generation failed'));
    }
    const out = await streamDeepViaBridge({
     cfg: sel.localCfg,
     system: pData.system,
     messages: [{ role: 'user', content: pData.user }],
     thinkingLevel: sel.thinkingLevel,
     jsonMode: true,
     onModel: m => {
      curModel = m;
      setResumeModel(m);
      saveCp('running');
     },
     onThink: d => {
      accTh += d;
      setResumeThoughts(accTh);
      saveCp('running');
     },
     onDelta: d => {
      accTail = (accTail + d).replace(/\s+/g, ' ').slice(-180);
      setResumeTail(accTail);
      saveCp('running');
     },
     signal: ctl.signal,
    });
    const parseRes = await fetch('/api/jd-research/local-helper', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      action: 'parse',
      task: 'resume',
      rawText: out.text,
      roleTitle: targetRep.roleTitle,
     }),
     signal: ctl.signal,
    });
    const parseData = (await parseRes.json()) as { resume?: JdResearchReport['resume']; error?: string };
    if (!parseRes.ok || !parseData.resume) {
     throw new Error(parseData.error || L('参考简历生成未完成，请重试', 'Incomplete resume — please retry'));
    }
    const doneReport: JdResearchReport = { ...targetRep, resume: parseData.resume };
    await fetch('/api/ai-interview-records', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
      id: rid,
      kind: 'jd-research',
      patch: true,
      payload: { report: doneReport },
     }),
    }).catch(() => {});
    cp.clear();
    if (resumeCpRef.current === cp) resumeCpRef.current = null;
    setReport(doneReport);
    void refreshRecords();
    return;
   }
   const r = await fetch('/api/jd-research/resume', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
     recordId: rid,
     bypassCache: Boolean(opts?.bypassCache),
     model: sel.model,
     thinkingLevel: sel.thinkingLevel,
    }),
    signal: ctl.signal,
   });
   if (!r.ok || !r.body) {
    let msg = L('生成参考简历失败，请重试', 'Resume generation failed');
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
      model?: string;
      text?: string;
      report?: JdResearchReport;
      usage?: AntigravityUsage;
      error?: string;
     };
     try {
      ev = JSON.parse(line) as typeof ev;
     } catch {
      continue;
     }
     if (ev.model) {
      curModel = ev.model;
      setResumeModel(ev.model);
      saveCp('running');
     }
     if (ev.type === 'reset') {
      accTail = '';
      setResumeTail('');
      saveCp('running');
      continue;
     }
     if (ev.type === 'thought' && typeof ev.text === 'string' && ev.text) {
      accTh += ev.text;
      setResumeThoughts(accTh);
      saveCp('running');
      continue;
     }
     if (ev.type === 'delta' && typeof ev.text === 'string' && ev.text) {
      accTail = (accTail + ev.text).replace(/\s+/g, ' ').slice(-180);
      setResumeTail(accTail);
      saveCp('running');
      continue;
     }
     if (ev.type === 'error') {
      throw new Error(ev.error || L('生成参考简历失败，请重试', 'Resume generation failed'));
     }
     if (ev.type === 'done' && ev.report) {
      doneReport = ev.report;
      doneUsage = ev.usage;
     }
    }
   }
   if (!doneReport?.resume) {
    throw new Error(L('参考简历生成未完成，请重试', 'Incomplete resume — please retry'));
   }
   cp.clear();
   if (resumeCpRef.current === cp) resumeCpRef.current = null;
   setReport(doneReport);
   if (doneUsage) setReportUsage(doneUsage);
   void refreshRecords();
  } catch (e) {
   if (!ctl.signal.aborted) {
    saveCp('interrupted');
    cp.flush('interrupted');
    setResumeErr((e as Error).message || L('生成参考简历失败，请重试', 'Resume generation failed'));
   }
  } finally {
   if (resumeAbortRef.current === ctl) resumeAbortRef.current = null;
   if (resumeTimerRef.current !== null) {
    window.clearInterval(resumeTimerRef.current);
    resumeTimerRef.current = null;
   }
   if (resumeCpRef.current === cp) {
    cp.dispose();
    resumeCpRef.current = null;
   }
   setGeneratingResume(false);
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
        durationMs: hit.payload.durationMs,
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
  const rawWantTab = sp.get('tab');
  const wantTab: TabKey | null =
   rawWantTab === 'profile' || rawWantTab === 'roadmap' || rawWantTab === 'questions' || rawWantTab === 'resume'
    ? rawWantTab
    : null;
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
    if (rec.status === 'running' && rec.interactionId && rec.sig && rec.payload?.pipeline !== 'v3-steps') {
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

   if (!alive || wantNew || !items.length) {
    try {
     const rawDraft = window.localStorage.getItem('isr-jdr-draft:v1');
     if (rawDraft) {
      const d = JSON.parse(rawDraft) as { kind?: JdInputKind; source?: string; jdUrl?: string };
      if (d.kind === 'experience' || d.kind === 'jd') setKind(d.kind);
      if (d.source) setSource(d.source.slice(0, 14_000));
      if (d.jdUrl) setJdUrl(d.jdUrl.slice(0, 2000));
     }
    } catch {}
    return;
   }
   const target = (wantId ? items.find(x => x.id === wantId) : null) || items[0];
   if (target.status === 'running' && target.interactionId && target.sig && target.payload?.pipeline !== 'v3-steps' && target.payload?.pipeline !== 'local-bridge') {
    void pollLegacyTask(target);
   } else if (target.status === 'running') {
    const srcText = target.payload?.source || '';
    setActiveId(target.id);
    setPartialReport(target.payload?.partialReport ?? null);
    if (target.payload?.kind) setKind(target.payload.kind);
    if (srcText) setSource(srcText);
    const cp = readAiCheckpoint<{
     recordId: string;
     kind: JdInputKind;
     source: string;
     stageKey: JdStageKey;
     thoughts: string;
     tail: string;
     model: string;
    }>(makeCheckpointKey('jd-research', target.id), 25 * 60_000);
    if (cp && (cp.status === 'running' || cp.status === 'interrupted') && !autoResumedRef.current.has(`research:${target.id}`) && (srcText.trim().length >= 15 || cp.data.source.trim().length >= 15)) {
     autoResumedRef.current.add(`research:${target.id}`);
     void runResearch({
      reuseRecordId: target.id,
      overrideSource: srcText || cp.data.source,
      initialThoughts: cp.data.thoughts || target.payload?.thoughts || '',
      initialTail: cp.data.tail || '',
      existingPartial: target.payload?.partialReport ?? null,
     });
    } else {
     setError(L('上次调研未完成（已完成步骤已缓存），请点击「一键重试」继续', 'Previous run interrupted — click Retry to resume'));
    }
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
      durationMs: target.payload.durationMs,
      kind: target.payload.kind,
     },
    );
    if (wantTab) setTab(wantTab);
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
  if (rec.status === 'running' && rec.interactionId && rec.sig && rec.payload?.pipeline !== 'v3-steps') {
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
   setError(L('上次调研未完成（已完成步骤已缓存），请点击「一键重试」继续', 'Previous run interrupted — click Retry to resume'));
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
    durationMs: rec.payload?.durationMs,
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
   setReportDurationMs(undefined);
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

 useEffect(() => {
  if (report || busy) return;
  try {
   if (source.trim() || jdUrl.trim()) {
    window.localStorage.setItem('isr-jdr-draft:v1', JSON.stringify({ kind, source: source.slice(0, 14_000), jdUrl: jdUrl.slice(0, 2000) }));
   } else {
    window.localStorage.removeItem('isr-jdr-draft:v1');
   }
  } catch {}
 }, [kind, source, jdUrl, report, busy]);

 const canSubmitResearch = source.trim().length >= 20 || /^https?:\/\//i.test(jdUrl.trim()) || images.length > 0;

 const runResearch = async (opts?: {
  bypassCache?: boolean;
  reuseRecordId?: string;
  overrideSource?: string;
  initialThoughts?: string;
  initialTail?: string;
  existingPartial?: JdResearchReport | null;
 }) => {
  const clean = (opts?.overrideSource ?? source).trim();
  const cleanUrl = jdUrl.trim();
  if (clean.length < 20 && !/^https?:\/\//i.test(cleanUrl) && images.length === 0) {
   setError(L('请粘贴至少 20 字内容，或填入岗位链接 / 上传图片', 'Paste text, enter a URL, or upload images'));
   return;
  }

  if (!getCachedCustomAiSpec()) await ensureAiConfigStatus();
  const sel = resolveLiveAiSelection('deep', getCachedCustomAiSpec(), !username);

  stopActive(false);
  try { window.localStorage.removeItem('isr-jdr-draft:v1'); } catch {}
  bgModeRef.current = false;
  setError('');
  setBgTip('');
  setBusy(true);
  setElapsed(0);
  setConnState('connecting');
  setStreamChars(0);
  setStreamTail(opts?.initialTail ?? '');
  setPingBeats(0);
  setReport(null);
  setReportDurationMs(undefined);
  setFillStepErr('');
  setResumeErr('');
  setResumeThoughts('');
  setResumeTail('');
  setResumeModel('');
  setPartialReport(opts?.existingPartial ?? null);
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
  setThoughts(opts?.initialThoughts ?? '');
  setStreamModel(sel.useLocal ? LOCAL_PROVIDER_LABEL[sel.localCfg.provider] : 'DeepSeek');
  setStreamThoughts(opts?.initialThoughts ?? '');
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
  let resolvedUrl = cleanUrl;
  let resolvedImages = [...images];

  let accThoughts = opts?.initialThoughts ?? '';
  let accTail = opts?.initialTail ?? '';
  let completedCharsBase = 0;
  const stage1Ref: { value: JdResearchReport | null } = { value: opts?.existingPartial ?? null };
  let phaseQuizCounts: number[] = [];
  let liveQTitles: string[] = [];

  const syncResearchCp = (status: 'running' | 'interrupted' = 'running', modelLabel = '') => {
   if (!curRecordId) return;
   const cpKey = makeCheckpointKey('jd-research', curRecordId);
   if (!researchCpRef.current) {
    researchCpRef.current = createThrottledCheckpoint<{
     recordId: string;
     kind: JdInputKind;
     source: string;
     stageKey: JdStageKey;
     thoughts: string;
     tail: string;
     model: string;
    }>(cpKey, 'jd-research', 500);
   }
   researchCpRef.current.update(
    {
     recordId: curRecordId,
     kind,
     source: resolvedSrc,
     stageKey: curStageKey,
     thoughts: accThoughts.slice(-16_000),
     tail: accTail,
     model: modelLabel,
    },
    status,
    modelLabel || undefined,
   );
  };

  const sleep = (ms: number) =>
   new Promise<void>(resolve => {
    const t = window.setTimeout(resolve, ms);
    ctl.signal.addEventListener(
     'abort',
     () => {
      window.clearTimeout(t);
      resolve();
     },
     { once: true },
    );
   });

  const appendThought = (chunk: string) => {
   if (!chunk) return;
   accThoughts += chunk;
   setStreamThoughts(accThoughts);
   setConnState(prev => (prev === 'streaming' ? prev : 'thinking'));
   syncResearchCp('running');
  };

  type StepError = Error & { status?: number; code?: string };

  const postJsonStep = async <T extends Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> => {
   const r = await fetch('/api/jd-research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, model: sel.model, thinkingLevel: sel.thinkingLevel }),
    signal: ctl.signal,
   });
   let data: Record<string, unknown> = {};
   try {
    data = (await r.json()) as Record<string, unknown>;
   } catch {}
   if (!r.ok) {
    const err = new Error((typeof data.error === 'string' && data.error) || L('请求失败，请重试', 'Request failed')) as StepError;
    err.status = r.status;
    if (typeof data.code === 'string' && data.code) err.code = data.code;
    throw err;
   }
   return data as T;
  };

  type WatchEv = {
   type?: string;
   recordId?: string;
   interactionId?: string;
   lastEventId?: string;
   stage?: 1 | 2;
   step?: string;
   stepType?: string;
   phaseIndex?: number;
   phaseQuizCount?: number;
   qTitles?: string[];
   text?: string;
   chars?: number;
   cached?: boolean;
   stage1Cached?: boolean;
   keepThoughts?: boolean;
   partialReport?: JdResearchReport | null;
   progress?: JdLiveProgress;
   quizCount?: number;
   questionCount?: number;
   thoughts?: string;
   usage?: AntigravityUsage;
   model?: string;
   reason?: string;
   rateLimited?: boolean;
   hadProgress?: boolean;
   error?: string;
  };

  const watchNdjsonSlice = async (
   payload: Record<string, unknown>,
   onEv: (ev: WatchEv) => void,
   actionName: 'watch' | 'deepseek_step' = 'watch',
  ): Promise<{
   terminal?: WatchEv;
   cont?: { interactionId: string; lastEventId: string; hadProgress?: boolean };
   retryReason?: string;
   retryRateLimited?: boolean;
  }> => {
   const r = await fetch('/api/jd-research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, action: actionName, model: sel.model, thinkingLevel: sel.thinkingLevel }),
    signal: ctl.signal,
   });
   if (!r.ok || !r.body) {
    let msg = L('监听进度失败', 'Watch failed');
    let code: string | undefined;
    try {
     const j = (await r.json()) as { error?: string; code?: string };
     if (j.error) msg = j.error;
     if (j.code) code = j.code;
    } catch {}
    const err = new Error(msg) as StepError;
    err.status = r.status;
    if (code) err.code = code;
    throw err;
   }
   const reader = r.body.getReader();
   const dec = new TextDecoder();
   let buf = '';
   let cont: { interactionId: string; lastEventId: string; hadProgress?: boolean } | undefined;
   let terminal: WatchEv | undefined;
   let retryReason: string | undefined;
   let retryRateLimited = false;

   for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
     const line = buf.slice(0, nl).trim();
     buf = buf.slice(nl + 1);
     if (!line) continue;
     let ev: WatchEv;
     try {
      ev = JSON.parse(line) as WatchEv;
     } catch {
      continue;
     }
     if (ev.model) setStreamModel(ev.model);
     if (ev.type === 'continue') {
      cont = {
       interactionId: ev.interactionId || String(payload.interactionId || ''),
       lastEventId: ev.lastEventId || '',
       hadProgress: Boolean(ev.hadProgress),
      };
      continue;
     }
     if (ev.type === 'retry_step') {
      retryReason = ev.reason || L('步骤输出异常，自动重试', 'Step retry requested');
      retryRateLimited = Boolean(ev.rateLimited);
      continue;
     }
     if (ev.type === 'stage1' || ev.type === 'phase_done' || ev.type === 'questions_done') {
      terminal = ev;
     }
     onEv(ev);
    }
   }
   return { terminal, cont, retryReason, retryRateLimited };
  };

  type AntigravityStepConfig = {
   label: string;
   startStep: () => Promise<Record<string, unknown>>;
   startNewAttempt: (attempt: number) => Promise<Record<string, unknown>>;
   watchMeta: (res: Record<string, unknown>) => Record<string, unknown>;
   onTerminal: (ev: WatchEv) => void;
   onCached: (res: Record<string, unknown>) => void;
   onDelta?: (ev: WatchEv, sliceChars: number) => void;
  };

  const makeWatchEventHandler =
   (optsStep: AntigravityStepConfig, onChars: (n: number) => void, onProgress?: () => void) =>
   (ev: WatchEv) => {
    if (ev.type === 'connected' || ev.type === 'step' || ev.type === 'ping') {
     setPingBeats(b => b + 1);
     if (ev.stepType === 'thought' || ev.stepType === 'thought_signature' || ev.step === 'thinking') {
      setConnState(prev => (prev === 'streaming' ? prev : 'thinking'));
     }
     return;
    }
    if (ev.type === 'reset') {
     accTail = '';
     setStreamTail('');
     onChars(0);
     setStreamChars(completedCharsBase);
     return;
    }
    if (ev.type === 'thought' && typeof ev.text === 'string') {
     if (ev.text) onProgress?.();
     appendThought(ev.text);
     return;
    }
    if (ev.type === 'delta') {
     setConnState('streaming');
     let latestChars = 0;
     if (typeof ev.chars === 'number') {
      latestChars = ev.chars;
      onChars(ev.chars);
      setStreamChars(completedCharsBase + ev.chars);
     }
     if (typeof ev.text === 'string' && ev.text) {
      accTail = (accTail + ev.text).replace(/\s+/g, ' ').slice(-180);
      setStreamTail(accTail);
     }
     if ((typeof ev.text === 'string' && ev.text.length > 0) || latestChars > 0) {
      onProgress?.();
     }
     optsStep.onDelta?.(ev, latestChars);
    }
   };

  const runDeepSeekFallbackStep = async (
   optsStep: AntigravityStepConfig,
   watchMetaObj: Record<string, unknown>,
   markAgentRateLimited: boolean,
   isDirectModelStep = false,
  ): Promise<boolean> => {
   if (!isDirectModelStep) {
    appendThought(
     L(
      `\n[⚡ 触发限流，切换 DeepSeek 接力完成「${optsStep.label}」…]\n`,
      `\n[⚡ Rate-limited, falling back to DeepSeek for ${optsStep.label}…]\n`,
     ),
    );
    setStreamModel('DeepSeek V4.1 Flash');
   }

   for (let dsAtt = 0; dsAtt < 3 && !ctl.signal.aborted; dsAtt++) {
    let stepStartedSliceChars = 0;
    try {
     setConnState(prev => (prev === 'streaming' || prev === 'thinking' ? prev : 'thinking'));
     const out = await watchNdjsonSlice(
      {
       ...watchMetaObj,
       recordId: curRecordId,
       ...(markAgentRateLimited && dsAtt === 0 ? { markAgentRateLimited: true } : {}),
      },
      makeWatchEventHandler(optsStep, n => {
       stepStartedSliceChars = n;
      }),
      'deepseek_step',
     );
     if (out.terminal) {
      completedCharsBase += stepStartedSliceChars;
      optsStep.onTerminal(out.terminal);
      return true;
     }
     if (dsAtt < 2) {
      appendThought(
       `\n[↺ 「${optsStep.label}」第 ${dsAtt + 1} 次重试（${out.retryReason || '输出不完整'}）…]\n`,
      );
      await sleep(2500 * (dsAtt + 1));
     }
    } catch (e) {
     if (ctl.signal.aborted) throw e;
     const err = e as StepError;
     if (err.status === 401 || err.status === 403 || err.code === 'daily_quota_exceeded') throw e;
     if (dsAtt < 2) {
      appendThought(`\n[↺ 「${optsStep.label}」第 ${dsAtt + 1} 次重连…]\n`);
      await sleep(2500 * (dsAtt + 1));
     } else {
      throw e;
     }
    }
   }
   return false;
  };

  const runAntigravityStep = async (optsStep: AntigravityStepConfig): Promise<boolean> => {
   let attempt = 0;
   const maxAttempts = 8;
   let watchRateLimitHits = 0;
   let silentStallCount = 0;
   let lastAttemptWasRateLimit = false;
   let rateBurst429 = 0;

   while (attempt < maxAttempts && !ctl.signal.aborted) {
    let startRes: Record<string, unknown>;
    try {
     startRes = attempt === 0 ? await optsStep.startStep() : await optsStep.startNewAttempt(attempt);
    } catch (e) {
     const err = e as StepError;
     const st = err.status;
     if (ctl.signal.aborted || st === 400 || st === 401 || st === 403 || err.code === 'daily_quota_exceeded') {
      throw e;
     }
     if (err.code === 'rate_limited') {
      return await runDeepSeekFallbackStep(optsStep, optsStep.watchMeta({}), false);
     }
     if (st === 429 && rateBurst429 < 6) {
      rateBurst429++;
      appendThought(`\n[↺ ${optsStep.label} 请求频率受限，等待 5 秒后重试…]\n`);
      await sleep(5000);
      continue;
     }
     attempt++;
     if (attempt >= maxAttempts) throw e;
     appendThought(`\n[↺ ${optsStep.label} 第 ${attempt} 次重连…]\n`);
     await sleep(Math.min(15_000, 2500 * attempt));
     continue;
    }

    if (typeof startRes.model === 'string' && startRes.model) setStreamModel(startRes.model);
    if (startRes.status === 'use_model_step') {
     return await runDeepSeekFallbackStep(optsStep, optsStep.watchMeta(startRes), false, true);
    }
    if (startRes.status === 'rate_limited_fallback') {
     return await runDeepSeekFallbackStep(optsStep, optsStep.watchMeta(startRes), false);
    }
    if (startRes.status === 'done' || startRes.status === 'stage1_ready' || startRes.status === 'step_cached') {
     optsStep.onCached(startRes);
     return true;
    }

    let interactionId = String(startRes.interactionId || '');
    let lastEventId = '';
    const baseWatch = optsStep.watchMeta(startRes);
    let stepStartedSliceChars = 0;
    let sliceIdx = 0;
    let netErrors = 0;
    let lastFailureReason = '';
    const interactionStartedAt = Date.now();
    let gotAnyProgressInInteraction = false;
    let lastProgressAt = Date.now();
    const markProgress = () => {
     gotAnyProgressInInteraction = true;
     lastProgressAt = Date.now();
    };

    while (sliceIdx < 18 && !ctl.signal.aborted) {
     sliceIdx++;
     try {
      setConnState(prev => (prev === 'streaming' || prev === 'thinking' ? prev : 'agent_ready'));
      const out = await watchNdjsonSlice(
       {
        ...baseWatch,
        recordId: curRecordId,
        interactionId,
        lastEventId,
        model: typeof startRes.model === 'string' ? startRes.model : undefined,
       },
       makeWatchEventHandler(
        optsStep,
        n => {
         stepStartedSliceChars = n;
        },
        markProgress,
       ),
       'watch',
      );

      netErrors = 0;
      if (out.terminal) {
       completedCharsBase += stepStartedSliceChars;
       optsStep.onTerminal(out.terminal);
       return true;
      }
      if (out.cont) {
       interactionId = out.cont.interactionId || interactionId;
       lastEventId = out.cont.lastEventId || lastEventId;
       if (out.cont.hadProgress) markProgress();
       if (!gotAnyProgressInInteraction && (sliceIdx >= 2 || Date.now() - interactionStartedAt >= 70_000)) {
        silentStallCount++;
        lastFailureReason = L('Agent 会话长时间无输出（疑似限流/拥堵）', 'Agent session silent stall');
        lastAttemptWasRateLimit = true;
        if (silentStallCount >= 2 || watchRateLimitHits + silentStallCount >= 2) {
         return await runDeepSeekFallbackStep(optsStep, baseWatch, false);
        }
        break;
       }
       if (gotAnyProgressInInteraction && Date.now() - lastProgressAt >= 100_000) {
        silentStallCount++;
        lastFailureReason = L('Agent 输出停滞超 100 秒', 'Agent stream stalled');
        if (silentStallCount >= 2 || watchRateLimitHits + silentStallCount >= 2) {
         return await runDeepSeekFallbackStep(optsStep, baseWatch, false);
        }
        break;
       }
       setPingBeats(b => b + 1);
       await sleep(600);
       continue;
      }
      if (out.retryReason) {
       lastFailureReason = out.retryReason;
       lastAttemptWasRateLimit = Boolean(out.retryRateLimited);
       if (out.retryRateLimited) {
        watchRateLimitHits++;
        if (watchRateLimitHits >= 2 || watchRateLimitHits + silentStallCount >= 2) {
         return await runDeepSeekFallbackStep(optsStep, baseWatch, watchRateLimitHits >= 2);
        }
       }
       break;
      }
      // Stream EOF without terminal frame: check for silent stall before resuming same interactionId
      if (!gotAnyProgressInInteraction && (sliceIdx >= 2 || Date.now() - interactionStartedAt >= 70_000)) {
       silentStallCount++;
       lastFailureReason = L('Agent 会话长时间无输出（疑似限流/拥堵）', 'Agent session silent stall');
       lastAttemptWasRateLimit = true;
       if (silentStallCount >= 2 || watchRateLimitHits + silentStallCount >= 2) {
        return await runDeepSeekFallbackStep(optsStep, baseWatch, false);
       }
       break;
      }
      if (gotAnyProgressInInteraction && Date.now() - lastProgressAt >= 100_000) {
       silentStallCount++;
       lastFailureReason = L('Agent 输出停滞超 100 秒', 'Agent stream stalled');
       if (silentStallCount >= 2 || watchRateLimitHits + silentStallCount >= 2) {
        return await runDeepSeekFallbackStep(optsStep, baseWatch, false);
       }
       break;
      }
      setPingBeats(b => b + 1);
      await sleep(1000);
     } catch (e) {
      if (ctl.signal.aborted) throw e;
      const err = e as StepError;
      const st = err.status;
      if (st === 401 || st === 403 || err.code === 'daily_quota_exceeded') throw e;
      if (err.code === 'rate_limited') {
       watchRateLimitHits++;
       lastAttemptWasRateLimit = true;
       if (watchRateLimitHits >= 2 || watchRateLimitHits + silentStallCount >= 2) {
        return await runDeepSeekFallbackStep(optsStep, baseWatch, watchRateLimitHits >= 2);
       }
       lastFailureReason = err.message || 'Agent 限流';
       break;
      }
      netErrors++;
      setPingBeats(b => b + 1);
      if (st === 429) {
       if (netErrors <= 6) {
        await sleep(3500);
        continue;
       }
       lastFailureReason = err.message || L('请求频率受限，稍候重试', 'Rate limit backoff');
       break;
      }
      if (netErrors <= 6) {
       // Transient HTTP/Worker drop: resume the exact same background interaction & event_id
       await sleep(Math.min(10_000, 1500 * netErrors));
       continue;
      }
      lastFailureReason = (e as Error).message || L('连接波动', 'Connection unstable');
      break;
     }
    }

    if (ctl.signal.aborted) return false;
    attempt++;
    if (attempt < maxAttempts) {
     if (lastAttemptWasRateLimit) {
      appendThought(
       `\n[↺ ${optsStep.label} 切换备用通道重试（${lastFailureReason || '触发限流'}）…]\n`,
      );
      lastAttemptWasRateLimit = false;
      await sleep(800);
     } else {
      appendThought(
       `\n[↺ ${optsStep.label} 第 ${attempt}/${maxAttempts} 次重连（${lastFailureReason || '超时重试'}）…]\n`,
      );
      await sleep(Math.min(12_000, 2500 * attempt));
     }
     continue;
    }
   }
   return false;
  };

   try {
   if (sel.useLocal) {
    const localLabel = `${LOCAL_PROVIDER_LABEL[sel.localCfg.provider]} · ${sel.localCfg.model.trim() || 'default'}`;
    setStreamModel(localLabel);
    setConnState('connected');
    if (resolvedSrc.length < 15 && (resolvedUrl || resolvedImages.length > 0)) {
     const exRes = await fetch('/api/jd-research/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
       ...(resolvedUrl ? { url: resolvedUrl } : {}),
       ...(resolvedImages.length ? { images: resolvedImages } : {}),
      }),
      signal: ctl.signal,
     });
     const exData = (await exRes.json()) as { text?: string; error?: string };
     if (!exRes.ok || !exData.text?.trim()) {
      throw new Error(exData.error || L('未能提取 JD 内容，请直接粘贴文本', 'Failed to extract JD text'));
     }
     resolvedSrc = exData.text.trim();
     setSource(resolvedSrc);
     setJdUrl('');
     setImages([]);
    }
    if (resolvedSrc.length < 15) {
     throw new Error(L('请先输入岗位 JD 或面经内容（至少 15 字）', 'Please enter at least 15 characters'));
    }

    const callHelper = async <T extends Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> => {
     const hr = await fetch('/api/jd-research/local-helper', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
     });
     const hd = (await hr.json()) as T & { error?: string };
     if (!hr.ok) throw new Error(hd.error || L('本地辅助处理失败', 'Local helper failed'));
     return hd;
    };

    const localRecId = curRecordId || 'jdr-' + crypto.randomUUID();
    curRecordId = localRecId;
    streamingRecordIdRef.current = localRecId;
    setActiveId(localRecId);
    syncResearchCp('running', localLabel);
    researchCpRef.current?.flush('running');

    const saveLocalCheckpointRecord = async (nextPartial: JdResearchReport, statusVal: 'running' | 'completed' = 'running', extraPayload: Record<string, unknown> = {}) => {
     await fetch('/api/ai-interview-records', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
       id: localRecId,
       kind: 'jd-research',
       title: nextPartial.roleTitle || curTitle,
       subtitle: [nextPartial.inferredLevel, nextPartial.prepDays].filter(Boolean).join(' · ') || L('本地客户端调研', 'Local Client'),
       status: statusVal,
       payload: {
        kind,
        source: resolvedSrc,
        pipeline: 'local-bridge',
        startedAt: t0,
        model: finalModel,
        ...(statusVal === 'completed' ? { report: nextPartial } : { partialReport: nextPartial }),
        thoughts: accThoughts.slice(-16_000),
        ...extraPayload,
       },
      }),
     }).catch(() => {});
    };

    // Stage 1 via Local Bridge (or reuse checkpoint)
    let runningChars = 0;
    let finalModel = localLabel;
    const existingRec = opts?.reuseRecordId ? records.find(r => r.id === opts.reuseRecordId) : undefined;
    const existingPartial = opts?.existingPartial ?? existingRec?.payload?.partialReport ?? null;
    let s1Report: JdResearchReport;
    if (existingPartial && existingPartial.roadmap.length > 0 && !opts?.bypassCache) {
     s1Report = existingPartial;
     appendThought(L('✓ 已命中断点缓存（阶段一，0 Token）\n', '✓ Resumed Stage 1 from checkpoint\n'));
    } else {
     const s1Prompts = await callHelper<{ system: string; user: string }>({
      action: 'prompts',
      task: 'stage1',
      kind,
      source: resolvedSrc,
     });
     const s1Out = await streamDeepViaBridge({
      cfg: sel.localCfg,
      system: s1Prompts.system,
      messages: [{ role: 'user', content: s1Prompts.user }],
      thinkingLevel: sel.thinkingLevel,
      jsonMode: true,
      onModel: m => {
       finalModel = m;
       setStreamModel(m);
       syncResearchCp('running', m);
      },
      onThink: d => appendThought(d),
      onDelta: d => {
       runningChars += d.length;
       setStreamChars(runningChars);
       setConnState('streaming');
       accTail = (accTail + d).replace(/\s+/g, ' ').slice(-220);
       setStreamTail(accTail);
       syncResearchCp('running', finalModel);
      },
      signal: ctl.signal,
     });
     const s1Parsed = await callHelper<{ report: JdResearchReport }>({
      action: 'parse',
      task: 'stage1',
      rawText: s1Out.text,
     });
     s1Report = s1Parsed.report;
     await saveLocalCheckpointRecord(s1Report, 'running');
    }
    setPartialReport(s1Report);
    curTitle = s1Report.roleTitle || curTitle;

    const totalPhases = s1Report.roadmap.length;
    const phaseQuizLists: (AiQuiz[] | null)[] = s1Report.roadmap.map(s =>
     !opts?.bypassCache && (s.quizzes?.length ?? 0) >= 4 ? s.quizzes! : null,
    );
    const updateLocalProg = (activeKey: JdStageKey) => {
     curStageKey = activeKey;
     setLiveProgress({
      stage: 2,
      activeKey,
      roleTitle: s1Report.roleTitle,
      inferredLevel: s1Report.inferredLevel,
      prepDays: s1Report.prepDays,
      companyStyle: s1Report.companyStyle,
      dimCount: s1Report.dimensions.length,
      stageCount: totalPhases,
      quizCount: phaseQuizLists.reduce((n, list) => n + (list?.length ?? 0), 0),
      questionCount: existingPartial?.questions?.length ?? 0,
      qTitles: (existingPartial?.questions ?? []).map(q => q.title),
     });
     syncResearchCp('running', finalModel);
    };
    updateLocalProg('quizzes');

    let workingPartial: JdResearchReport = { ...s1Report };

    // Stage 2A: per-phase study quizzes sequentially on local client (with D1 checkpoint per phase)
    for (let pi = 0; pi < totalPhases; pi++) {
     if (ctl.signal.aborted) return;
     const step = s1Report.roadmap[pi];
     if (phaseQuizLists[pi]) {
      appendThought(L(`\n── 路径 ${pi + 1}/${totalPhases}：已命中断点缓存（${phaseQuizLists[pi]!.length} 题）──\n`, `\n── Phase ${pi + 1}/${totalPhases}: cached (${phaseQuizLists[pi]!.length}) ──\n`));
      continue;
     }
     accTail = '';
     setStreamTail('');
     appendThought(`\n\n── 路径 ${pi + 1}/${totalPhases}：${step.phase} · ${step.title} ──\n`);
     try {
      const pzPrompts = await callHelper<{ system: string; user: string; reusedQuizzes?: AiQuiz[] }>({
       action: 'prompts',
       task: 'phase-quizzes',
       kind,
       source: resolvedSrc,
       stage1: s1Report,
       phaseIndex: pi,
      });
      const pzOut = await streamDeepViaBridge({
       cfg: sel.localCfg,
       system: pzPrompts.system,
       messages: [{ role: 'user', content: pzPrompts.user }],
       thinkingLevel: sel.thinkingLevel,
       jsonMode: true,
       onModel: m => {
        finalModel = m;
        setStreamModel(m);
        syncResearchCp('running', m);
       },
       onThink: d => appendThought(d),
       onDelta: d => {
        runningChars += d.length;
        setStreamChars(runningChars);
        accTail = (accTail + d).replace(/\s+/g, ' ').slice(-220);
        setStreamTail(accTail);
        syncResearchCp('running', finalModel);
       },
       signal: ctl.signal,
      });
      const pzParsed = await callHelper<{ quizzes: AiQuiz[] }>({
       action: 'parse',
       task: 'phase-quizzes',
       rawText: pzOut.text,
       phaseIndex: pi,
       reusedQuizzes: pzPrompts.reusedQuizzes || [],
      });
      phaseQuizLists[pi] = pzParsed.quizzes;
      workingPartial = {
       ...workingPartial,
       roadmap: workingPartial.roadmap.map((st, idx) => (idx === pi ? { ...st, quizzes: pzParsed.quizzes } : st)),
      };
      await saveLocalCheckpointRecord(workingPartial, 'running');
      appendThought(L(`✓ 完成 ${pzParsed.quizzes.length} 题\n`, `✓ ${pzParsed.quizzes.length} quizzes\n`));
      updateLocalProg('quizzes');
     } catch (e) {
      if (ctl.signal.aborted) throw e;
      appendThought(L(`! 路径 ${pi + 1} 跳过，可稍后点击「AI 补题」\n`, `! Phase ${pi + 1} skipped\n`));
     }
    }

    // Stage 2B: interview questions
    updateLocalProg('questions');
    accTail = '';
    setStreamTail('');
    let questionsRawText = '';
    const existingQuestions = !opts?.bypassCache && (existingPartial?.questions?.length ?? 0) > 0 ? existingPartial!.questions : null;
    if (existingQuestions) {
     appendThought(L(`\n\n── 面试专题题库：已命中断点缓存（${existingQuestions.length} 题）──\n`, `\n\n── Questions: cached (${existingQuestions.length}) ──\n`));
    } else {
     appendThought(L('\n\n── 生成高频面试专题题库 ──\n', '\n\n── Generating interview questions ──\n'));
     try {
      const qPrompts = await callHelper<{ system: string; user: string }>({
       action: 'prompts',
       task: 'questions',
       kind,
       source: resolvedSrc,
       stage1: s1Report,
      });
      const qOut = await streamDeepViaBridge({
       cfg: sel.localCfg,
       system: qPrompts.system,
       messages: [{ role: 'user', content: qPrompts.user }],
       thinkingLevel: sel.thinkingLevel,
       jsonMode: true,
       onModel: m => {
        finalModel = m;
        setStreamModel(m);
        syncResearchCp('running', m);
       },
       onThink: d => appendThought(d),
       onDelta: d => {
        runningChars += d.length;
        setStreamChars(runningChars);
        accTail = (accTail + d).replace(/\s+/g, ' ').slice(-220);
        setStreamTail(accTail);
        syncResearchCp('running', finalModel);
       },
       signal: ctl.signal,
      });
      questionsRawText = qOut.text;
     } catch (e) {
      if (ctl.signal.aborted) throw e;
     }
    }

    let finalReport: JdResearchReport;
    if (existingQuestions && !questionsRawText) {
     finalReport = {
      ...workingPartial,
      roadmap: workingPartial.roadmap.map((st, idx) =>
       phaseQuizLists[idx] ? { ...st, quizzes: phaseQuizLists[idx]! } : st,
      ),
      questions: existingQuestions,
     };
    } else {
     const merged = await callHelper<{ report: JdResearchReport }>({
      action: 'parse',
      task: 'merge-stage2',
      stage1: s1Report,
      phaseQuizLists,
      questionsRawText,
     });
     finalReport = merged.report;
    }
    const durationMs = Math.max(1000, Date.now() - t0);
    await saveLocalCheckpointRecord(finalReport, 'completed', { durationMs });

    researchCpRef.current?.clear();
    researchCpRef.current = null;
    removeAiCheckpoint(makeCheckpointKey('jd-research', localRecId));
    streamingRecordIdRef.current = '';
    applyReportView(localRecId, finalReport, '', accThoughts, finalModel, null, resolvedSrc, {
     durationMs,
     kind,
    });
    void refreshRecords();
    stopActive(true);
    return;
   }

   // ---- Step 1: Stage 1 (Competency Profile + Roadmap) ----
   let immediateDoneData: Record<string, unknown> | null = null;
   const s1Ok = await runAntigravityStep({
    label: L('阶段一 · 画像与路径', 'Stage 1'),
    startStep: () =>
     postJsonStep({
      action: 'start',
      kind,
      source: clean,
      ...(cleanUrl ? { url: cleanUrl } : {}),
      ...(resolvedImages.length ? { images: resolvedImages } : {}),
      ...(opts?.bypassCache ? { bypassCache: true } : {}),
      ...(curRecordId ? { recordId: curRecordId } : {}),
      attempt: 0,
     }).then(res => {
      if (typeof res.recordId === 'string' && res.recordId) {
       curRecordId = res.recordId;
       streamingRecordIdRef.current = res.recordId;
       if (!bgModeRef.current) setActiveId(res.recordId);
      }
      if (typeof res.extractedSource === 'string' && res.extractedSource) {
       resolvedSrc = res.extractedSource;
       if (!clean) setSource(res.extractedSource);
      }
      if (typeof res.title === 'string' && res.title) curTitle = res.title;
      setConnState('connected');
      setJdUrl('');
      setImages([]);
      resolvedUrl = '';
      resolvedImages = [];
      if (curRecordId) {
       upsertJdBgTask({
        recordId: curRecordId,
        interactionId: 'stream',
        sig: 'stream',
        title: curTitle,
        createdAt: t0,
        stageKey: 'profile',
        stage1Cached: false,
       });
       void refreshRecords();
      }
      return res;
     }),
    startNewAttempt: att =>
     postJsonStep({
      action: 'start',
      kind,
      source: resolvedSrc,
      ...(resolvedUrl && resolvedSrc.length < 20 ? { url: resolvedUrl } : {}),
      bypassCache: false,
      ...(curRecordId ? { recordId: curRecordId } : {}),
      attempt: att,
     }),
    watchMeta: () => ({ step: 'stage1' }),
    onCached: res => {
     if (res.status === 'done') {
      immediateDoneData = res;
      return;
     }
     const s1 = res.partialReport as JdResearchReport | undefined;
     if (s1) {
      stage1Ref.value = s1;
      curStage1Cached = true;
      setPartialReport(s1);
      if (s1.roleTitle) curTitle = s1.roleTitle;
      if (typeof res.thoughts === 'string' && res.thoughts) appendThought(res.thoughts);
      const nextProg: JdLiveProgress = {
       stage: 2,
       activeKey: 'quizzes',
       roleTitle: s1.roleTitle,
       inferredLevel: s1.inferredLevel,
       prepDays: s1.prepDays,
       companyStyle: s1.companyStyle,
       dimCount: s1.dimensions.length,
       stageCount: s1.roadmap.length,
       quizCount: s1.roadmap.reduce((n, r) => n + (r.quizzes?.length ?? 0), 0),
       questionCount: s1.questions.length,
       qTitles: s1.questions.map(q => q.title),
       stage1Cached: true,
      };
      setLiveProgress(nextProg);
      curStageKey = nextProg.activeKey;
     }
    },
    onDelta: ev => {
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
    },
    onTerminal: ev => {
     if (ev.partialReport) {
      stage1Ref.value = ev.partialReport;
      curStage1Cached = Boolean(ev.stage1Cached);
      setPartialReport(ev.partialReport);
      if (ev.partialReport.roleTitle) curTitle = ev.partialReport.roleTitle;
     }
     if (ev.thoughts && !accThoughts) appendThought(ev.thoughts);
     if (ev.progress) {
      setLiveProgress(ev.progress);
      curStageKey = ev.progress.activeKey;
     }
     void refreshRecords();
    },
   });

   if (ctl.signal.aborted) return;

   if (immediateDoneData) {
    const d = immediateDoneData as {
     recordId?: string;
     report?: JdResearchReport | null;
     rawText?: string;
     thoughts?: string;
     model?: string;
     cached?: boolean;
     stage1Cached?: boolean;
     usage?: AntigravityUsage;
     durationMs?: number;
    };
    const doneId = d.recordId || curRecordId;
    streamingRecordIdRef.current = '';
    if (doneId) removeJdBgTask(doneId);
    if (!bgModeRef.current) {
     applyReportView(doneId, d.report ?? null, d.rawText || '', d.thoughts || accThoughts, d.model || '', null, resolvedSrc, {
      cached: d.cached,
      stage1Cached: d.stage1Cached,
      usage: d.usage,
      durationMs: d.durationMs ?? Math.max(100, Date.now() - t0),
      kind,
     });
    } else if (doneId) {
     notifyJdTaskDone({ recordId: doneId, title: d.report?.roleTitle || curTitle, status: 'completed' });
    }
    void refreshRecords();
    stopActive();
    return;
   }

   const s1Ready = stage1Ref.value;
   if (!s1Ok || !s1Ready) {
    throw new Error(L('考点画像与复习路径生成失败，请点击「一键重试」。', 'Stage 1 failed — click Retry'));
   }

   // ---- Step 2: Sequential Checkpointed Roadmap Phases + Interview Question Bank ----
   const totalPhases = s1Ready.roadmap.length;
   phaseQuizCounts = s1Ready.roadmap.map(s => s.quizzes?.length ?? 0);
   liveQTitles = s1Ready.questions.map(q => q.title);

   const syncStage2Progress = (activeKey: JdStageKey) => {
    curStageKey = activeKey;
    const quizCount = phaseQuizCounts.reduce((a, b) => a + b, 0);
    setLiveProgress({
     stage: 2,
     activeKey,
     roleTitle: s1Ready.roleTitle,
     inferredLevel: s1Ready.inferredLevel,
     prepDays: s1Ready.prepDays,
     companyStyle: s1Ready.companyStyle,
     dimCount: s1Ready.dimensions.length,
     stageCount: s1Ready.roadmap.length,
     quizCount,
     questionCount: liveQTitles.length,
     qTitles: liveQTitles,
     stage1Cached: curStage1Cached,
    });
    if (curRecordId) {
     upsertJdBgTask({
      recordId: curRecordId,
      interactionId: 'stream',
      sig: 'stream',
      title: curTitle,
      createdAt: t0,
      stageKey: activeKey,
      stage1Cached: curStage1Cached,
     });
    }
   };

   syncStage2Progress('quizzes');
   accTail = '';
   setStreamTail('');

   let anyStage2Succeeded = false;

   const runStage2Phase = async (pi: number, isRetryPass: boolean): Promise<boolean> => {
    const step = s1Ready.roadmap[pi];
    syncStage2Progress('quizzes');
    accTail = '';
    setStreamTail('');
    appendThought(
     isRetryPass
      ? `\n\n── 补救路径 ${pi + 1}/${totalPhases}：${step.phase} · ${step.title} ──\n`
      : `\n\n── 路径 ${pi + 1}/${totalPhases}：${step.phase} · ${step.title} ──\n`,
    );
    try {
     const okPhase = await runAntigravityStep({
      label: L(`路径 ${pi + 1}/${totalPhases}`, `Phase ${pi + 1}`),
      startStep: () =>
       postJsonStep({
        action: 'start_step',
        recordId: curRecordId,
        step: 'phase',
        phaseIndex: pi,
        ...(opts?.bypassCache && !isRetryPass ? { bypassCache: true } : {}),
        attempt: 0,
       }),
      startNewAttempt: att =>
       postJsonStep({
        action: 'start_step',
        recordId: curRecordId,
        step: 'phase',
        phaseIndex: pi,
        bypassCache: false,
        attempt: att,
       }),
      watchMeta: () => ({ step: 'phase', phaseIndex: pi }),
      onCached: res => {
       const cnt = Number(res.quizCount || 0);
       phaseQuizCounts[pi] = Math.max(phaseQuizCounts[pi], cnt);
       if (cnt > 0) anyStage2Succeeded = true;
       appendThought(L(`✓ 已命中断点缓存（${cnt} 题，0 Token）\n`, `✓ Checkpoint hit (${cnt} quizzes, 0 tokens)\n`));
       syncStage2Progress('quizzes');
      },
      onDelta: ev => {
       if (typeof ev.phaseQuizCount === 'number') {
        const beforeOthers = phaseQuizCounts.reduce((a, b, idx) => (idx === pi ? a : a + b), 0);
        setLiveProgress(prev =>
         prev ? { ...prev, activeKey: 'quizzes', quizCount: beforeOthers + Math.max(phaseQuizCounts[pi], ev.phaseQuizCount!) } : prev,
        );
       }
      },
      onTerminal: ev => {
       const cnt = Number(ev.quizCount || 0);
       phaseQuizCounts[pi] = Math.max(phaseQuizCounts[pi], cnt);
       if (cnt > 0) anyStage2Succeeded = true;
       appendThought(L(`✓ 本路径完成并保存（${cnt} 题）\n`, `✓ Saved (${cnt} quizzes)\n`));
       syncStage2Progress('quizzes');
      },
     });
     if (!okPhase && !isRetryPass) {
      appendThought(L(`! 路径 ${pi + 1} 暂未完整生成，先继续后续步骤并在末尾补救\n`, `! Phase ${pi + 1} deferred\n`));
     }
     return okPhase;
    } catch (phaseErr) {
     if (ctl.signal.aborted) throw phaseErr;
     const err = phaseErr as StepError;
     if (err.status === 401 || err.status === 403 || err.code === 'daily_quota_exceeded') throw phaseErr;
     appendThought(
      L(
       `! 路径 ${pi + 1} 出现波动（已完成部分已保留），继续下一步…\n`,
       `! Phase ${pi + 1} transient error, continuing…\n`,
      ),
     );
     return false;
    }
   };

   const runStage2Questions = async (isRetryPass: boolean): Promise<boolean> => {
    syncStage2Progress('questions');
    accTail = '';
    setStreamTail('');
    appendThought(isRetryPass ? `\n\n── 补救面试专题题库 ──\n` : `\n\n── 面试专题题库 ──\n`);
    try {
     return await runAntigravityStep({
      label: L('面试专题题库', 'Interview Questions'),
      startStep: () =>
       postJsonStep({
        action: 'start_step',
        recordId: curRecordId,
        step: 'questions',
        ...(opts?.bypassCache && !isRetryPass ? { bypassCache: true } : {}),
        attempt: 0,
       }),
      startNewAttempt: att =>
       postJsonStep({
        action: 'start_step',
        recordId: curRecordId,
        step: 'questions',
        bypassCache: false,
        attempt: att,
       }),
      watchMeta: () => ({ step: 'questions' }),
      onCached: res => {
       const titles = Array.isArray(res.qTitles) ? (res.qTitles as string[]) : [];
       if (titles.length) liveQTitles = titles;
       if (Number(res.questionCount || titles.length) > 0) anyStage2Succeeded = true;
       appendThought(L(`✓ 已命中断点缓存（${titles.length || res.questionCount || 0} 题，0 Token）\n`, `✓ Checkpoint hit (0 tokens)\n`));
       syncStage2Progress('questions');
      },
      onDelta: ev => {
       if (Array.isArray(ev.qTitles) && ev.qTitles.length) {
        liveQTitles = ev.qTitles;
        syncStage2Progress('questions');
       }
      },
      onTerminal: ev => {
       const titles = Array.isArray(ev.qTitles) ? ev.qTitles : [];
       if (titles.length) liveQTitles = titles;
       if (Number(ev.questionCount || titles.length) > 0) anyStage2Succeeded = true;
       appendThought(L(`✓ 面试题库完成并保存（${titles.length || ev.questionCount || 0} 题）\n`, `✓ Saved\n`));
       syncStage2Progress('questions');
      },
     });
    } catch (qErr) {
     if (ctl.signal.aborted) throw qErr;
     const err = qErr as StepError;
     if (err.status === 401 || err.status === 403 || err.code === 'daily_quota_exceeded') throw qErr;
     appendThought(L(`! 面试题库出现波动，将在汇总前自动补救…\n`, `! Questions transient error, retrying shortly…\n`));
     return false;
    }
   };

   const incompletePhases: number[] = [];
   for (let pi = 0; pi < totalPhases; pi++) {
    if (ctl.signal.aborted) return;
    const okPhase = await runStage2Phase(pi, false);
    if (!okPhase) incompletePhases.push(pi);
   }

   if (ctl.signal.aborted) return;
   let okQs = await runStage2Questions(false);

   if (!ctl.signal.aborted && (incompletePhases.length > 0 || !okQs)) {
    appendThought(
     L(
      '\n\n── 对未完成步骤进行第二轮补救（已完成步骤自动跳过）──\n',
      '\n\n── Recovering incomplete steps ──\n',
     ),
    );
    for (const pi of incompletePhases) {
     if (ctl.signal.aborted) return;
     await sleep(1500);
     await runStage2Phase(pi, true);
    }
    if (!okQs && !ctl.signal.aborted) {
     await sleep(1500);
     okQs = await runStage2Questions(true);
    }
   }

   if (!ctl.signal.aborted && !okQs && !anyStage2Succeeded) {
    throw new Error(L('阶段二题库生成失败，请点击「一键重试」（已完成步骤已保存，不会重复耗 Token）。', 'Stage 2 failed — click Retry'));
   }

   if (ctl.signal.aborted) return;

   // ---- Step 3: Finalize & Merge Saved Checkpoints ----
   let finalRes: {
    recordId?: string;
    report?: JdResearchReport | null;
    rawText?: string;
    thoughts?: string;
    model?: string;
    cached?: boolean;
    stage1Cached?: boolean;
    usage?: AntigravityUsage;
    durationMs?: number;
   } | null = null;
   let finErr: unknown;
   const clientElapsedMs = Math.max(1000, Date.now() - t0);
   for (let fa = 0; fa < 3 && !ctl.signal.aborted; fa++) {
    try {
     finalRes = await postJsonStep({
      action: 'finalize',
      recordId: curRecordId,
      durationMs: clientElapsedMs,
     });
     break;
    } catch (e) {
     finErr = e;
     const st = (e as Error & { status?: number }).status;
     if (st === 400 || st === 401 || st === 403 || st === 404 || st === 502) throw e;
     await sleep(1200 * (fa + 1));
    }
   }
   if (!finalRes) throw finErr instanceof Error ? finErr : new Error(L('汇总报告失败，请点击一键重试', 'Finalize failed'));

   const doneId = finalRes.recordId || curRecordId;
   streamingRecordIdRef.current = '';
   if (doneId) {
    removeJdBgTask(doneId);
    removeAiCheckpoint(makeCheckpointKey('jd-research', doneId));
   }
   researchCpRef.current?.clear();
   researchCpRef.current = null;
   const finalThoughts = finalRes.thoughts || accThoughts;
   if (!bgModeRef.current) {
    if (!finalRes.cached) setUsedToday(u => u + 1);
    applyReportView(
     doneId,
     finalRes.report ?? null,
     finalRes.rawText || '',
     finalThoughts,
     finalRes.model || 'DeepSeek',
     null,
     resolvedSrc,
     {
      cached: finalRes.cached,
      stage1Cached: finalRes.stage1Cached ?? curStage1Cached,
      usage: finalRes.usage,
      durationMs: finalRes.durationMs ?? clientElapsedMs,
      kind,
     },
    );
   } else if (doneId) {
    notifyJdTaskDone({
     recordId: doneId,
     title: finalRes.report?.roleTitle || curTitle,
     status: 'completed',
    });
   }
   void refreshRecords();
   stopActive(true);
  } catch (e) {
   streamingRecordIdRef.current = '';
   if (curRecordId) removeJdBgTask(curRecordId);
   if (!ctl.signal.aborted) {
    researchCpRef.current?.flush('interrupted');
    researchCpRef.current?.dispose();
    researchCpRef.current = null;
    const msg = (e as Error).message || L('调研失败，已完成步骤已保存，点击「一键重试」继续', 'Research failed — click Retry');
    if (curRecordId) {
     void fetch('/api/jd-research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'fail', recordId: curRecordId, error: msg }),
     })
      .then(() => void refreshRecords())
      .catch(() => {});
    }
    setError(msg);
    if (bgModeRef.current && curRecordId) {
     notifyJdTaskDone({
      recordId: curRecordId,
      title: curTitle,
      status: 'error',
      error: msg,
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

 const resumeMarkdown = useMemo(() => (report?.resume ? resumeToMarkdown(report.resume) : ''), [report?.resume]);

 const downloadResumeMarkdown = () => {
  if (!resumeMarkdown || !report?.resume) return;
  const name = (report.resume.targetRole || report.roleTitle || '参考简历').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 46);
  const blob = new Blob([resumeMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_参考简历.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
 };

 const handleExportResumePdf = async () => {
  if (!report?.resume || exportingResumePdf || !resumePrintRef.current) return;
  setExportingResumePdf(true);
  try {
   const name = (report.resume.targetRole || report.roleTitle || '参考简历').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 46);
   await exportElementToPdf(resumePrintRef.current, `${name}_参考简历.pdf`);
  } catch {
   setResumeErr(L('PDF 导出失败，请重试', 'PDF export failed'));
  } finally {
   setExportingResumePdf(false);
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
           onClick={() => void runResearch({ reuseRecordId: activeId || undefined })}
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
        {useLocal ? (
         <span className="jdr-quota-pill local">
          {L(`本地 · ${LOCAL_PROVIDER_LABEL[localCfg.provider]} · 不消耗站内额度`, `Local · ${LOCAL_PROVIDER_LABEL[localCfg.provider]}`)}
         </span>
        ) : member ? (
         dailyLimit === null ? (
          <span className="jdr-quota-pill">{L('站内额度：不限', 'Quota: Unlimited')}</span>
         ) : (
          <span className={'jdr-quota-pill' + (Math.max(0, (dailyLimit ?? 1) - usedToday) === 0 ? ' empty' : '')}>
           {L(
            `今日剩余 ${Math.max(0, (dailyLimit ?? 1) - usedToday)}/${dailyLimit ?? 1} 次`,
            `${Math.max(0, (dailyLimit ?? 1) - usedToday)}/${dailyLimit ?? 1} left today`,
           )}
          </span>
         )
        ) : null}
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
            `第 ${liveProgress?.stage || 1}/2 步 · ${stageMeta[activeStageIdx]?.zh || '深度调研'} · ${fmtDuration(elapsed * 1000, false)}`,
            `Step ${liveProgress?.stage || 1}/2 · ${stageMeta[activeStageIdx]?.en || 'Researching'} · ${fmtDuration(elapsed * 1000, true)}`,
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
         <button type="button" className="button secondary arch-stop-btn" onClick={() => stopActive(true)}>
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
              ? L(`✓ 已连接流式通道，等待 ${streamModel || 'AI'} 返回思考…`, `✓ Stream connected, waiting for ${streamModel || 'AI'}…`)
              : L(
                 `✓ ${streamModel || 'AI'} 已连接，正在思考…${pingBeats > 1 ? `（#${pingBeats}）` : ''} ▋`,
                 `✓ ${streamModel || 'AI'} active…${pingBeats > 1 ? ` (#${pingBeats})` : ''} ▋`,
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
            {L('缓存命中 100% · 0 Token', 'Cache Hit 100% · 0 Tokens')}
           </span>
          ) : (reportStage1Cached || (reportUsage && reportUsage.totalTokens > 0)) ? (
           <span
            className="jdr-cache-tag"
            title={
             reportUsage && reportUsage.inputTokens > 0
              ? L(
                 `命中缓存 ${fmtTok(reportUsage.cachedTokens)} / 总输入 ${fmtTok(reportUsage.inputTokens)} Token`,
                 `Cached ${fmtTok(reportUsage.cachedTokens)} / Input ${fmtTok(reportUsage.inputTokens)}`,
                )
              : undefined
            }
           >
            <Zap size={12} />
            {(() => {
             const cTok = reportUsage?.cachedTokens ?? 0;
             const inTok = reportUsage?.inputTokens ?? 0;
             const pct = inTok > 0 ? Math.min(100, Math.round((cTok / inTok) * 100)) : 0;
             if (cTok > 0) {
              return L(
               `缓存命中 ${fmtTok(cTok)} Token (${pct}%)${reportStage1Cached ? ' + 阶段一缓存' : ''}`,
               `Cached ${fmtTok(cTok)} (${pct}%)${reportStage1Cached ? ' + S1' : ''}`,
              );
             }
             if (reportStage1Cached) {
              return L('阶段一缓存命中', 'Stage 1 Cache Hit');
             }
             return L('缓存命中 0 Token (0%)', 'Cached 0 (0%)');
            })()}
           </span>
          ) : null}
          {reportModel && <span className="jdr-model-pill">{reportModel}</span>}
          {reportUsage && reportUsage.totalTokens > 0 && (
           <span
            className="jdr-model-pill"
            title={L(
             `输入 ${fmtTok(reportUsage.inputTokens)} · 缓存 ${fmtTok(reportUsage.cachedTokens)} · 输出 ${fmtTok(reportUsage.outputTokens)}${reportUsage.thoughtTokens > 0 ? ` · 思考 ${fmtTok(reportUsage.thoughtTokens)}` : ''}`,
             `In ${fmtTok(reportUsage.inputTokens)} · Cache ${fmtTok(reportUsage.cachedTokens)} · Out ${fmtTok(reportUsage.outputTokens)}`,
            )}
           >
            {L(`总消耗 ${fmtTok(reportUsage.totalTokens)} Token`, `${fmtTok(reportUsage.totalTokens)} Tokens`)}
           </span>
          )}
          {typeof reportDurationMs === 'number' && reportDurationMs > 0 && (
           <span className="jdr-model-pill">
            <Clock size={12} />
            <span>{L(`总耗时 ${fmtDuration(reportDurationMs, false)}`, `Time ${fmtDuration(reportDurationMs, true)}`)}</span>
           </span>
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
         {activeId && report && countJdStudyQuizzes(report) > 0 && (
          <a href={`/learn/jd-special?id=${encodeURIComponent(activeId)}`} className="button secondary arch-new-btn">
           <GraduationCap size={14} />
           <span>{L(`专题学习 (${countJdStudyQuizzes(report)})`, `Learn (${countJdStudyQuizzes(report)})`)}</span>
          </a>
         )}
         {activeId && report && member && (
          <button
           type="button"
           className="button secondary arch-new-btn"
           disabled={generatingResume}
           onClick={() => {
            setTab('resume');
            if (!report.resume && !generatingResume) void generateResume();
           }}
          >
           {generatingResume ? <Loader2 size={14} className="ai-spin" /> : <Briefcase size={14} />}
           <span>
            {report.resume
             ? L('参考简历', 'Resume')
             : generatingResume
               ? L('生成简历中…', 'Generating…')
               : L('生成参考简历', 'Generate Resume')}
           </span>
          </button>
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

       {source.trim() && (
        <div className="arch-thoughts">
         <button
          type="button"
          className="arch-thoughts-btn"
          onClick={() => setSourceOpen(v => !v)}
         >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
           <FileText size={13} />
           {kind === 'experience' ? L('原始面经', 'Interview Log') : L('岗位 JD', 'Job Description')}
          </span>
          {sourceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
         </button>
         {sourceOpen && <pre className="arch-thoughts-body">{source}</pre>}
        </div>
       )}

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
         <button
          type="button"
          role="tab"
          aria-selected={tab === 'resume'}
          className={tab === 'resume' ? 'on' : ''}
          onClick={() => setTab('resume')}
         >
          <Briefcase size={14} />
          <span>
           {report.resume
            ? L(`参考简历 (${report.resume.projects.length})`, `Resume (${report.resume.projects.length})`)
            : L('参考简历', 'Resume')}
          </span>
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
             {activeId && countJdStudyQuizzes(report) > 0 && (
              <div className="jdr-links">
               <a
                href={`/learn/jd-special?id=${encodeURIComponent(activeId)}&tab=dimension&dim=${i}`}
                className="jdr-link-pill"
               >
                <GraduationCap size={13} />
                <span>{L('按画像刷题', 'Practice')}</span>
                <ArrowUpRight size={13} />
               </a>
              </div>
             )}
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
          {fillStepErr && (
           <p className="ai-grade-error" style={{ margin: 0 }}>
            {fillStepErr}
           </p>
          )}
          {report.roadmap.map((s, i) => (
           <div key={i} className="ai-card jdr-step-card">
            <div className="jdr-step-top">
             <div className="jdr-step-head">
              <span className="jdr-phase">{s.phase}</span>
              <strong>{s.title}</strong>
             </div>
             {activeId && s.quizzes && s.quizzes.length > 0 ? (
              <a
               href={`/learn/jd-special?id=${encodeURIComponent(activeId)}&step=${i}`}
               className="jdr-link-pill"
              >
               <GraduationCap size={13} />
               <span>{L(`本阶段学习题 (${s.quizzes.length})`, `Practice (${s.quizzes.length})`)}</span>
               <ArrowUpRight size={13} />
              </a>
             ) : (
              activeId &&
              member && (
               <button
                type="button"
                className="jdr-link-pill"
                disabled={fillingStepIdx !== null}
                onClick={() => void fillRoadmapPhase(i)}
               >
                {fillingStepIdx === i ? (
                 <Loader2 size={13} className="ai-spin" />
                ) : (
                 <RotateCcw size={13} />
                )}
                <span>
                 {fillingStepIdx === i
                  ? L('补题中…', 'Generating…')
                  : L('AI 补题', 'Generate Quizzes')}
                </span>
               </button>
              )
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

        {tab === 'resume' && (
         <section className="jdr-panel">
          {generatingResume ? (
           <div className="ai-card arch-reply-card">
            <div className="arch-running">
             <div className="jdr-stream-meta">
              <span className="arch-running-left">
               <Loader2 size={16} className="ai-spin" />
               <span>
                {L(
                 `生成参考简历 · ${fmtDuration(resumeElapsed * 1000, false)}`,
                 `Generating Resume · ${fmtDuration(resumeElapsed * 1000, true)}`,
                )}
               </span>
              </span>
              {resumeModel && <span className="jdr-model-pill">{resumeModel}</span>}
             </div>
             <div className="jdr-run-btns">
              <button type="button" className="button secondary arch-stop-btn" onClick={() => stopResume(true)}>
               <Square size={12} fill="currentColor" />
               <span>{L('停止', 'Stop')}</span>
              </button>
             </div>
            </div>

            {resumeThoughts && (
             <div className="arch-thoughts">
              <div className="arch-thoughts-btn" style={{ cursor: 'default' }}>
               <span>{L('思考过程', 'Reasoning')}</span>
              </div>
              <pre className="arch-thoughts-body">{resumeThoughts}</pre>
             </div>
            )}

            {resumeTail && (
             <div className="jdr-stream-tail" aria-live="off">
              <span className="jdr-tail-tag">{L('实时输出流', 'Live Stream')}</span>
              <code>{resumeTail} ▋</code>
             </div>
            )}
           </div>
          ) : !report.resume ? (
           <div className="ai-card jdr-resume-empty">
            <Briefcase size={26} style={{ color: 'var(--primary)' }} />
            <h3>{L('暂无参考简历', 'No reference resume')}</h3>
            {resumeErr && <p className="ai-grade-error" style={{ margin: 0 }}>{resumeErr}</p>}
            {member && activeId && (
             <button
              type="button"
              className="button primary"
              onClick={() => void generateResume()}
             >
              <Briefcase size={15} />
              <span>{L('生成参考简历', 'Generate Resume')}</span>
             </button>
            )}
           </div>
          ) : (
           <>
            <div className="ai-card jdr-qbar">
             <div className="jdr-qbar-left">
              <strong className="jdr-resume-role">{report.resume.targetRole}</strong>
             </div>
             <div className="jdr-qbar-right">
              <button
               type="button"
               className="ai-note-pill"
               onClick={() => void copyText('resume-all', resumeMarkdown)}
              >
               {copiedKey === 'resume-all' ? <Check size={13} /> : <Copy size={13} />}
               <span>{copiedKey === 'resume-all' ? L('已复制', 'Copied') : L('复制 MD', 'Copy MD')}</span>
              </button>
              <button type="button" className="ai-note-pill" onClick={downloadResumeMarkdown}>
               <FileDown size={13} />
               <span>{L('下载 MD', 'MD')}</span>
              </button>
              <button
               type="button"
               className="ai-note-pill"
               disabled={exportingResumePdf}
               onClick={() => void handleExportResumePdf()}
              >
               {exportingResumePdf ? <Loader2 size={13} className="ai-spin" /> : <FileText size={13} />}
               <span>{exportingResumePdf ? L('导出中…', 'Exporting…') : L('导出 PDF', 'PDF')}</span>
              </button>
              <AddToNoteButton
               compact
               title={`${report.resume.targetRole} · ${L('参考简历', 'Reference Resume')}`.slice(0, 64)}
               questionOnly={resumeMarkdown}
               questionAndAnswer={resumeMarkdown}
               source={{
                kind: 'interview',
                label: `${L('参考简历', 'Resume')} · ${report.resume.targetRole.slice(0, 20)}`,
                href: activeId ? `/interview/jd-research?id=${encodeURIComponent(activeId)}&tab=resume` : '/interview/jd-research',
               }}
              />
              {member && activeId && (
               <button
                type="button"
                className="button secondary arch-new-btn"
                onClick={() => void generateResume({ bypassCache: true })}
               >
                <RotateCcw size={14} />
                <span>{L('重新生成', 'Regenerate')}</span>
               </button>
              )}
             </div>
            </div>

            {resumeErr && <p className="ai-grade-error" style={{ margin: 0 }}>{resumeErr}</p>}

            {report.resume.positioning && (
             <div className="ai-card jdr-resume-card">
              <h3>{L('个人定位', 'Positioning')}</h3>
              <p className="jdr-summary">{report.resume.positioning}</p>
             </div>
            )}

            {report.resume.techStack.length > 0 && (
             <div className="ai-card jdr-resume-card">
              <h3>{L('技术栈', 'Tech Stack')}</h3>
              <div className="jdr-skill-grid">
               {report.resume.techStack.map((grp, gi) => (
                <div key={gi} className="jdr-skill-group">
                 <strong>{grp.category}</strong>
                 <ul>
                  {grp.items.map((item, ii) => (
                   <li key={ii}>{item}</li>
                  ))}
                 </ul>
                </div>
               ))}
              </div>
             </div>
            )}

            <div className="jdr-resume-projects">
             {report.resume.projects.map((proj, pi) => {
              const projMd = [
               `### ${proj.name}（${[proj.role, proj.period].filter(Boolean).join(' · ')}）`,
               proj.stack.length ? `- **技术栈**：${proj.stack.join(' / ')}` : '',
               proj.background ? `- **项目背景**：${proj.background}` : '',
               proj.actions.length ? `- **核心工作**：\n${proj.actions.map(a => `  - ${a}`).join('\n')}` : '',
               proj.results.length ? `- **量化成果**：\n${proj.results.map(r => `  - ${r}`).join('\n')}` : '',
               proj.interviewTips?.length ? `- **面试深挖准备**：\n${proj.interviewTips.map(t => `  - ${t}`).join('\n')}` : '',
              ]
               .filter(Boolean)
               .join('\n');
              return (
               <article key={pi} className="ai-card jdr-proj-card">
                <div className="jdr-proj-head">
                 <div className="jdr-proj-title-wrap">
                  <h3>{proj.name}</h3>
                  <div className="jdr-head-tags">
                   <span className="jdr-style-tag">{proj.role}</span>
                   {proj.period && <span className="jdr-qtag">{proj.period}</span>}
                  </div>
                 </div>
                 <div className="jdr-proj-actions">
                  {activeId && (
                   <a
                    href={`/interview/project-drill?id=${encodeURIComponent(activeId)}&proj=${pi}${proj.drill ? '' : '&autostart=1'}`}
                    className="ai-note-pill"
                    style={{ textDecoration: 'none' }}
                   >
                    <Sparkles size={13} />
                    <span>{proj.drill ? L('继续深挖', 'Continue Drill') : L('预判深挖', 'Project Drill')}</span>
                   </a>
                  )}
                  <button
                   type="button"
                   className="ai-note-pill"
                   onClick={() => void copyText(`proj-${pi}`, projMd)}
                  >
                   {copiedKey === `proj-${pi}` ? <Check size={13} /> : <Copy size={13} />}
                   <span>{copiedKey === `proj-${pi}` ? L('已复制', 'Copied') : L('复制', 'Copy')}</span>
                  </button>
                 </div>
                </div>

                {proj.stack.length > 0 && (
                 <div className="jdr-proj-stack">
                  {proj.stack.map((tk, ti) => (
                   <span key={ti} className="jdr-qtag">{tk}</span>
                  ))}
                 </div>
                )}

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

                {proj.interviewTips && proj.interviewTips.length > 0 && (
                 <div className="jdr-followups">
                  <div className="jdr-followups-head">
                   <strong>{L('面试深挖准备', 'Interview Defense')}</strong>
                   {activeId && (
                    <a
                     href={`/interview/project-drill?id=${encodeURIComponent(activeId)}&proj=${pi}${proj.drill ? '' : '&autostart=1'}`}
                     className="jdr-link-pill"
                    >
                     <span>{L('引导教学与作答', 'Guided Practice')}</span>
                     <ArrowUpRight size={13} />
                    </a>
                   )}
                  </div>
                  <ul>
                   {proj.interviewTips.map((tip, ti) => (
                    <li key={ti}>{tip}</li>
                   ))}
                  </ul>
                 </div>
                )}
               </article>
              );
             })}
            </div>
           </>
          )}
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
                   qz.references && Object.values(qz.references).filter(Boolean).length > 1 ? (
                    Object.entries(qz.references)
                     .filter(([, code]) => Boolean(code?.trim()))
                     .map(([lang, code]) => (
                      <div key={lang}>
                       <strong>{lang}</strong>
                       <pre>{code}</pre>
                      </div>
                     ))
                   ) : (
                    <pre>{qz.reference}</pre>
                   )
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

         {report.resume && (
          <>
           <h2>五、岗位参考简历</h2>
           {report.resume.positioning && <p>{report.resume.positioning}</p>}
           {report.resume.techStack.length > 0 && (
            <div className="jdr-print-item">
             <h3>专业技术栈</h3>
             {report.resume.techStack.map((grp, gi) => (
              <div key={gi}>
               <p><strong>{grp.category}</strong></p>
               <ul>
                {grp.items.map((it, ii) => (
                 <li key={ii}>{it}</li>
                ))}
               </ul>
              </div>
             ))}
            </div>
           )}
           {report.resume.projects.map((proj, pi) => (
            <div key={pi} className="jdr-print-item">
             <h3>
              {proj.name}（{[proj.role, proj.period].filter(Boolean).join(' · ')}）
             </h3>
             {proj.stack.length > 0 && <p>技术栈：{proj.stack.join(' / ')}</p>}
             {proj.background && <p>项目背景：{proj.background}</p>}
             {proj.actions.length > 0 && (
              <ul>
               {proj.actions.map((act, ai) => (
                <li key={ai}>{act}</li>
               ))}
              </ul>
             )}
             {proj.results.length > 0 && (
              <ul>
               {proj.results.map((res, ri) => (
                <li key={ri}>{res}</li>
               ))}
              </ul>
             )}
            </div>
           ))}
          </>
         )}
        </div>

        {report.resume && (
         <div ref={resumePrintRef} className="jdr-print-host" aria-hidden="true">
          <h1>参考简历 · {report.resume.targetRole}</h1>
          {report.resume.positioning && <p>{report.resume.positioning}</p>}
          {report.resume.techStack.length > 0 && (
           <>
            <h2>专业技术栈</h2>
            {report.resume.techStack.map((grp, gi) => (
             <div key={gi} className="jdr-print-item">
              <h3>{grp.category}</h3>
              <ul>
               {grp.items.map((it, ii) => (
                <li key={ii}>{it}</li>
               ))}
              </ul>
             </div>
            ))}
           </>
          )}
          {report.resume.projects.length > 0 && (
           <>
            <h2>核心项目经历</h2>
            {report.resume.projects.map((proj, pi) => (
             <div key={pi} className="jdr-print-item">
              <h3>
               {proj.name}（{[proj.role, proj.period].filter(Boolean).join(' · ')}）
              </h3>
              {proj.stack.length > 0 && <p><strong>技术栈：</strong>{proj.stack.join(' / ')}</p>}
              {proj.background && <p><strong>项目背景：</strong>{proj.background}</p>}
              {proj.actions.length > 0 && (
               <>
                <p><strong>核心工作：</strong></p>
                <ul>
                 {proj.actions.map((act, ai) => (
                  <li key={ai}>{act}</li>
                 ))}
                </ul>
               </>
              )}
              {proj.results.length > 0 && (
               <>
                <p><strong>量化成果：</strong></p>
                <ul>
                 {proj.results.map((res, ri) => (
                  <li key={ri}>{res}</li>
                 ))}
                </ul>
               </>
              )}
              {proj.interviewTips && proj.interviewTips.length > 0 && (
               <>
                <p><strong>面试深挖准备：</strong></p>
                <ul>
                 {proj.interviewTips.map((tip, ti) => (
                  <li key={ti}>{tip}</li>
                 ))}
                </ul>
               </>
              )}
             </div>
            ))}
           </>
          )}
         </div>
        )}
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
