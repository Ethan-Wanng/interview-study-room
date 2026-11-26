import {
 GRADE_SYSTEM_PROMPT,
 STANDARD_SYSTEM_PROMPT,
 buildGradeUserPrompt,
 buildStandardUserPrompt,
 buildTutorPrompts,
 parseAndNormalizeGradeResults,
 shouldSearchTutorLinks,
 type PromptChatMessage,
} from './ai-prompts';
import type { GradeItem, GradeResult } from './grade-types';
import type { LocalBridgeConfig, LocalBridgeProvider } from './local-bridge-config';
import type { ThinkingLevel } from './thinking';
import type { TutorContext, TutorMessage } from './tutor-types';

export type LocalProviderStatus = 'ready' | 'auth_required' | 'missing_binary' | 'error';

export type LocalModelOption = {
 id: string;
 label: string;
 thinkingLevels?: string[];
 defaultThinkingLevel?: string;
};

export type LocalQuotaWindow = {
 label: string;
 usedPercent: number;
 resetsAt?: number;
};

export type LocalProviderQuota = {
 planType?: string;
 windows: LocalQuotaWindow[];
};

export type LocalProviderInfo = {
 id: LocalBridgeProvider;
 name: string;
 status: LocalProviderStatus;
 binaryPath?: string;
 version?: string;
 defaultModel?: string;
 models: LocalModelOption[];
 quota?: LocalProviderQuota;
 loginHint?: string;
 errorMessage?: string;
};

export type ProbeProvidersOutcome =
 | { ok: true; providers: LocalProviderInfo[] }
 | { ok: false; code: 'unauthorized' | 'forbidden' | 'unreachable' | 'error'; message: string };

type BridgeNdjsonEvent =
 | { t: 'start' }
 | { t: 'model'; model: string }
 | { t: 'think'; text: string }
 | { t: 'delta'; text: string }
 | { t: 'done'; model?: string }
 | { t: 'error'; code?: string; message?: string };

const bridgeBase = (port: number) => `http://127.0.0.1:${port}`;

function combineAbortSignals(a?: AbortSignal, b?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
 const ctl = new AbortController();
 if (a?.aborted || b?.aborted) {
  ctl.abort();
  return { signal: ctl.signal, cleanup: () => {} };
 }
 const onAbort = () => ctl.abort();
 a?.addEventListener('abort', onAbort, { once: true });
 b?.addEventListener('abort', onAbort, { once: true });
 return {
  signal: ctl.signal,
  cleanup: () => {
   a?.removeEventListener('abort', onAbort);
   b?.removeEventListener('abort', onAbort);
  },
 };
}

export async function pingBridgeInfo(
 port: number,
 parentSignal?: AbortSignal,
): Promise<{ ok: true; version?: string } | { ok: false }> {
 const timeoutCtl = new AbortController();
 const timer = setTimeout(() => timeoutCtl.abort(), 3000);
 const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
 try {
  const res = await fetch(`${bridgeBase(port)}/v1/ping`, { method: 'GET', signal });
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as { ok?: boolean; version?: string };
  if (data?.ok !== true) return { ok: false };
  const version = typeof data.version === 'string' && data.version.trim() ? data.version.trim() : undefined;
  return { ok: true, ...(version ? { version } : {}) };
 } catch {
  return { ok: false };
 } finally {
  clearTimeout(timer);
  cleanup();
 }
}

export async function pingBridge(port: number, parentSignal?: AbortSignal): Promise<boolean> {
 const info = await pingBridgeInfo(port, parentSignal);
 return info.ok;
}

export async function probeBridgeProviders(
 port: number,
 token: string,
 parentSignal?: AbortSignal,
): Promise<ProbeProvidersOutcome> {
 const tok = token.trim();
 const timeoutCtl = new AbortController();
 const timer = setTimeout(() => timeoutCtl.abort(), 25_000);
 const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
 try {
  const res = await fetch(`${bridgeBase(port)}/v1/providers`, {
   method: 'GET',
   headers: { Authorization: `Bearer ${tok}` },
   signal,
  });
  if (res.status === 401) {
   return { ok: false, code: 'unauthorized', message: '配对码无效' };
  }
  if (res.status === 403) {
   return { ok: false, code: 'forbidden', message: '来源或 Host 被桥接器拒绝' };
  }
  if (!res.ok) {
   return { ok: false, code: 'error', message: `桥接器返回 ${res.status}` };
  }
  const json = (await res.json()) as { providers?: LocalProviderInfo[] };
  return { ok: true, providers: Array.isArray(json.providers) ? json.providers : [] };
 } catch {
  return { ok: false, code: 'unreachable', message: `未检测到本地桥接（127.0.0.1:${port}）` };
 } finally {
  clearTimeout(timer);
  cleanup();
 }
}

export async function refreshBridgeProvider(
 port: number,
 token: string,
 provider: LocalBridgeProvider,
 parentSignal?: AbortSignal,
): Promise<{ ok: true; provider: LocalProviderInfo } | { ok: false; message: string }> {
 const timeoutCtl = new AbortController();
 const timer = setTimeout(() => timeoutCtl.abort(), 25_000);
 const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
 try {
  const res = await fetch(`${bridgeBase(port)}/v1/providers/${provider}/refresh`, {
   method: 'POST',
   headers: { Authorization: `Bearer ${token.trim()}` },
   signal,
  });
  if (res.status === 401) return { ok: false, message: '配对码无效' };
  if (!res.ok) return { ok: false, message: `刷新失败 (${res.status})` };
  const data = (await res.json()) as LocalProviderInfo;
  return { ok: true, provider: data };
 } catch {
  return { ok: false, message: `无法连接本地桥接（127.0.0.1:${port}）` };
 } finally {
  clearTimeout(timer);
  cleanup();
 }
}

async function fetchSiteTutorLinks(
 context: TutorContext,
 messages: TutorMessage[],
 parentSignal?: AbortSignal,
): Promise<string> {
 if (!shouldSearchTutorLinks(context, messages)) return '';
 const timeoutCtl = new AbortController();
 const timer = setTimeout(() => timeoutCtl.abort(), 2500);
 const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
 try {
  const res = await fetch('/api/tutor/links', {
   method: 'POST',
   headers: { 'content-type': 'application/json' },
   body: JSON.stringify({ context, messages }),
   signal,
  });
  if (!res.ok) return '';
  const data = (await res.json()) as { links?: string };
  return typeof data?.links === 'string' ? data.links : '';
 } catch {
  return '';
 } finally {
  clearTimeout(timer);
  cleanup();
 }
}

async function streamBridgeNdjson(opts: {
 cfg: LocalBridgeConfig;
 system: string;
 messages: PromptChatMessage[];
 thinkingLevel?: ThinkingLevel;
 jsonMode?: boolean;
 onModel?: (model: string) => void;
 onThink?: (delta: string) => void;
 onDelta: (delta: string) => void;
 signal?: AbortSignal;
}): Promise<{ text: string; think: string; model: string }> {
 const { cfg } = opts;
 let res: Response;
 try {
  res = await fetch(`${bridgeBase(cfg.port)}/v1/stream`, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.token.trim()}`,
   },
   body: JSON.stringify({
    provider: cfg.provider,
    ...(cfg.model.trim() ? { model: cfg.model.trim() } : {}),
    system: opts.system,
    messages: opts.messages,
    ...(opts.thinkingLevel ? { thinkingLevel: opts.thinkingLevel } : {}),
    jsonMode: Boolean(opts.jsonMode),
    allowWebSearch: Boolean(cfg.allowWebSearch),
   }),
   signal: opts.signal,
  });
 } catch {
  if (opts.signal?.aborted) throw new Error('aborted');
  throw new Error(`本地桥接未启动或无法连接（127.0.0.1:${cfg.port}）。`);
 }

 if (!res.ok || !(res.headers.get('content-type') ?? '').includes('ndjson') || !res.body) {
  if (res.status === 401) throw new Error('本地桥接配对码无效，请在「AI 设置」更新。');
  if (res.status === 403) throw new Error('本地桥接拒绝了当前站点来源请求。');
  try {
   const j = (await res.json()) as { message?: string };
   throw new Error(j?.message || `本地桥接请求失败（${res.status}）`);
  } catch (err) {
   if (err instanceof Error && err.message) throw err;
   throw new Error(`本地桥接请求失败（${res.status}）`);
  }
 }

 const reader = res.body.getReader();
 const dec = new TextDecoder();
 const onAbort = () => {
  void reader.cancel().catch(() => {});
 };
 opts.signal?.addEventListener('abort', onAbort, { once: true });

 let buf = '';
 let text = '';
 let think = '';
 let model = `local:${cfg.provider}/${cfg.model.trim() || 'default'}`;

 try {
  for (;;) {
   if (opts.signal?.aborted) break;
   const { done, value } = await reader.read();
   if (done) break;
   buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
   let nl: number;
   while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let ev: BridgeNdjsonEvent;
    try {
     ev = JSON.parse(line) as BridgeNdjsonEvent;
    } catch {
     continue;
    }
    if (ev.t === 'model' && ev.model) {
     model = ev.model;
     opts.onModel?.(ev.model);
    } else if (ev.t === 'think' && ev.text) {
     think += ev.text;
     opts.onThink?.(ev.text);
    } else if (ev.t === 'delta' && ev.text) {
     text += ev.text;
     opts.onDelta(ev.text);
    } else if (ev.t === 'done' && ev.model) {
     model = ev.model;
    } else if (ev.t === 'error') {
     throw new Error(ev.message || '本地客户端执行失败');
    }
   }
  }
  if (opts.signal?.aborted) {
   throw new Error('aborted');
  }
  return { text, think, model };
 } finally {
  opts.signal?.removeEventListener('abort', onAbort);
 }
}

export async function streamTutorViaBridge(opts: {
 cfg: LocalBridgeConfig;
 context: TutorContext;
 messages: TutorMessage[];
 thinkingLevel?: ThinkingLevel;
 onModel?: (model: string) => void;
 onThink?: (delta: string) => void;
 onDelta: (delta: string) => void;
 signal?: AbortSignal;
}): Promise<{ text: string; think: string; model: string }> {
 const foundLinks = await fetchSiteTutorLinks(opts.context, opts.messages, opts.signal);
 if (opts.signal?.aborted) throw new Error('aborted');
 const { system, messages } = buildTutorPrompts(opts.context, opts.messages, foundLinks);
 const out = await streamBridgeNdjson({
  cfg: opts.cfg,
  system,
  messages,
  thinkingLevel: opts.thinkingLevel,
  jsonMode: false,
  onModel: opts.onModel,
  onThink: opts.onThink,
  onDelta: opts.onDelta,
  signal: opts.signal,
 });
 if (!out.text.trim()) {
  throw new Error('本地客户端未返回内容，请检查客户端登录状态后重试。');
 }
 return out;
}

export async function streamGradeViaBridge(opts: {
 cfg: LocalBridgeConfig;
 items: GradeItem[];
 thinkingLevel?: ThinkingLevel;
 onThink?: (delta: string) => void;
 onDelta: (delta: string) => void;
 onReset?: () => void;
 signal?: AbortSignal;
}): Promise<{ results: GradeResult[]; text: string; think: string; model: string }> {
 const promptText = buildGradeUserPrompt(opts.items);
 const baseMsgs: PromptChatMessage[] = [{ role: 'user', content: promptText }];

 const first = await streamBridgeNdjson({
  cfg: opts.cfg,
  system: GRADE_SYSTEM_PROMPT,
  messages: baseMsgs,
  thinkingLevel: opts.thinkingLevel,
  jsonMode: true,
  onThink: opts.onThink,
  onDelta: opts.onDelta,
  signal: opts.signal,
 });

 try {
  const results = parseAndNormalizeGradeResults(opts.items, first.text);
  return { ...first, results };
 } catch {
  if (opts.signal?.aborted) throw new Error('aborted');
  opts.onReset?.();
  const retryMsgs: PromptChatMessage[] = [
   { role: 'user', content: promptText },
   { role: 'assistant', content: first.text.slice(0, 4000) || '{}' },
   {
    role: 'user',
    content: '你刚才输出的内容不是合法的 JSON（解析失败）。请严格只输出单个合法 JSON 对象：{"results":[{"id":"...","marks":[...],"hits":[...],"feedback":"...","answer":"..."}]}，禁止输出代码块或额外解释。',
   },
  ];
  const second = await streamBridgeNdjson({
   cfg: opts.cfg,
   system: GRADE_SYSTEM_PROMPT,
   messages: retryMsgs,
   thinkingLevel: opts.thinkingLevel,
   jsonMode: true,
   onThink: opts.onThink,
   onDelta: opts.onDelta,
   signal: opts.signal,
  });
  try {
   const results = parseAndNormalizeGradeResults(opts.items, second.text);
   return { ...second, results };
  } catch {
   throw new Error('本地客户端未按合法 JSON 格式返回评分结果，请切换模型或重试。');
  }
 }
}

export async function streamStandardViaBridge(opts: {
 cfg: LocalBridgeConfig;
 item: GradeItem;
 thinkingLevel?: ThinkingLevel;
 onThink?: (delta: string) => void;
 onDelta: (delta: string) => void;
 signal?: AbortSignal;
}): Promise<{ text: string; think: string; model: string }> {
 const promptText = buildStandardUserPrompt(opts.item);
 const out = await streamBridgeNdjson({
  cfg: opts.cfg,
  system: STANDARD_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: promptText }],
  thinkingLevel: opts.thinkingLevel,
  jsonMode: false,
  onThink: opts.onThink,
  onDelta: opts.onDelta,
  signal: opts.signal,
 });
 const clean = out.text.trim();
 if (!clean) {
  throw new Error('本地客户端未返回规范回答，请重试。');
 }
 return { ...out, text: clean };
}

export async function streamDeepViaBridge(opts: {
 cfg: LocalBridgeConfig;
 system: string;
 messages: PromptChatMessage[];
 thinkingLevel?: ThinkingLevel;
 jsonMode?: boolean;
 onModel?: (model: string) => void;
 onThink?: (delta: string) => void;
 onDelta: (delta: string) => void;
 signal?: AbortSignal;
}): Promise<{ text: string; think: string; model: string }> {
 const out = await streamBridgeNdjson(opts);
 if (!out.text.trim()) {
  throw new Error('本地客户端未返回内容，请检查客户端登录状态后重试。');
 }
 return out;
}
