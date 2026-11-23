// Antigravity Managed Agent client over Google Gemini Interactions API (/v1beta/interactions).
// Routed through Cloudflare Workers scheduled proxy tunnel (or local GEMINI_PROXY_URL gateway)
// and protected by D1 atomic rate limiting (60 RPM / 100K TPM / 100 RPD).

import { env } from 'cloudflare:workers';
import { fetchGeminiViaScheduledProxy } from './gemini-worker-proxy';
import {
 markSiteGemini429,
 recordExtraGeminiTokens,
 refundSiteGeminiLimit,
 tryConsumeSiteGeminiLimit,
} from './gemini-rate-limit';

export const ANTIGRAVITY_AGENT_ID = 'antigravity-preview-09-2026';

export class AntigravityError extends Error {
 constructor(
  message: string,
  public status = 502,
  public code = 'agent_error',
 ) {
  super(message);
 }
}

function resolveKeyAndGateway(geminiProxy: boolean): {
 key: string;
 envMap: Record<string, string | undefined>;
 gatewayBase?: string;
 useWorkerTunnel: boolean;
} {
 const e = env as unknown as Record<string, string | undefined>;
 const key = e?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) || '';
 if (!key) throw new AntigravityError('站点未配置 Gemini API Key。', 503, 'missing_key');
 const proxy1 = e?.GEMINI_PROXY_URL || (typeof process !== 'undefined' ? process.env?.GEMINI_PROXY_URL : undefined);
 const proxy2 = e?.GEMINI_PROXY_URL_2 || (typeof process !== 'undefined' ? process.env?.GEMINI_PROXY_URL_2 : undefined);
 const cnDay = new Date(Date.now() + 8 * 3600_000).getUTCDate();
 const gatewayBase = geminiProxy === false ? undefined : cnDay <= 15 ? proxy1 || proxy2 : proxy2 || proxy1;
 const useWorkerTunnel = geminiProxy !== false && !gatewayBase;
 return { key, envMap: e, gatewayBase, useWorkerTunnel };
}

async function callInteractionsApi(
 pathWithQuery: string,
 init: { method: 'GET' | 'POST'; body?: string; geminiProxy: boolean; signal?: AbortSignal; timeoutMs?: number },
): Promise<Response> {
 const { key, envMap, gatewayBase, useWorkerTunnel } = resolveKeyAndGateway(init.geminiProxy);
 const headers: Record<string, string> = { 'x-goog-api-key': key };
 if (init.body !== undefined) headers['content-type'] = 'application/json';

 const ctl = new AbortController();
 const onAbort = () => ctl.abort();
 if (init.signal) {
  if (init.signal.aborted) ctl.abort();
  else init.signal.addEventListener('abort', onAbort, { once: true });
 }
 const timer = setTimeout(() => ctl.abort(), init.timeoutMs ?? 25_000);

 try {
  if (useWorkerTunnel) {
   try {
    const { res } = await fetchGeminiViaScheduledProxy(
     pathWithQuery,
     { method: init.method, headers, body: init.body, signal: ctl.signal, connectTimeoutMs: 7000 },
     envMap,
    );
    return res;
   } catch {
    if (ctl.signal.aborted) throw new AntigravityError('请求超时，请重试。', 504, 'timeout');
    // Fallback once to direct fetch if both proxy tunnels fail to connect
   }
  }
  const base = (gatewayBase || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  return await fetch(`${base}${pathWithQuery}`, {
   method: init.method,
   headers,
   body: init.body,
   signal: ctl.signal,
  });
 } finally {
  clearTimeout(timer);
  init.signal?.removeEventListener('abort', onAbort);
 }
}

export type AntigravityStartResult = {
 id: string;
 status: string;
 environmentId: string;
};

// CreateAgentInteraction (agent: "antigravity-preview-09-2026") does NOT accept top-level
// `system_instruction` per the official Interactions API spec; passing it causes Google's
// backend to stall and fail with deadline_exceeded. Merge instructions into `input` instead.
function buildAgentInput(systemInstruction: string, input: string, previousInteractionId?: string): string {
 const sys = systemInstruction.trim();
 if (previousInteractionId || !sys) return input;
 return `${sys}\n\n---\n\n${input}`;
}

function buildAgentConfig(opts: { agentModel?: string; maxTotalTokens?: number }): Record<string, unknown> | undefined {
 const cfg: Record<string, unknown> = { type: 'antigravity' };
 let hasExtra = false;
 if (opts.agentModel) {
  cfg.model = opts.agentModel;
  hasExtra = true;
 }
 if (typeof opts.maxTotalTokens === 'number' && opts.maxTotalTokens > 0) {
  cfg.max_total_tokens = Math.round(opts.maxTotalTokens);
  hasExtra = true;
 }
 return hasExtra ? cfg : undefined;
}

function extractDeltaThoughtText(delta: {
 text?: string;
 thought?: string;
 content?: { text?: string; type?: string } | { text?: string; type?: string }[];
 summary?: { text?: string }[];
}): string {
 const parts: string[] = [];
 if (delta.content) {
  if (Array.isArray(delta.content)) {
   for (const item of delta.content) {
    if (typeof item?.text === 'string' && item.text) parts.push(item.text);
   }
  } else if (typeof delta.content.text === 'string' && delta.content.text) {
   parts.push(delta.content.text);
  }
 }
 if (typeof delta.text === 'string' && delta.text) parts.push(delta.text);
 if (typeof delta.thought === 'string' && delta.thought) parts.push(delta.thought);
 if (Array.isArray(delta.summary)) {
  for (const s of delta.summary) {
   if (typeof s?.text === 'string' && s.text) parts.push(s.text);
  }
 }
 return parts.join('');
}

function mapUpstreamStreamError(errObj: { message?: string; code?: string } | undefined): AntigravityError {
 const codeRaw = (errObj?.code || '').toLowerCase();
 const msgRaw = (errObj?.message || '').trim();
 const low = `${codeRaw} ${msgRaw.toLowerCase()}`;
 if (low.includes('resource_exhausted') || low.includes('429') || low.includes('quota')) {
  return new AntigravityError('Agent 上游触发限流，正在切换引擎。', 429, 'rate_limited');
 }
 if (low.includes('deadline_exceeded') || low.includes('deadline expired') || low.includes('timeout')) {
  return new AntigravityError('Agent 上游处理超时，正在切换引擎。', 504, 'deadline_exceeded');
 }
 if (low.includes('unavailable') || low.includes('high demand') || low.includes('503') || low.includes('overloaded')) {
  return new AntigravityError('Agent 上游算力繁忙（503），正在切换引擎。', 503, 'service_unavailable');
 }
 return new AntigravityError(msgRaw || 'Agent 调研任务执行失败，请重试。', 502, codeRaw || 'agent_failed');
}

export async function startAntigravityInteraction(opts: {
 systemInstruction: string;
 input: string;
 previousInteractionId?: string;
 agentModel?: string;
 maxTotalTokens?: number;
 geminiProxy?: boolean;
 signal?: AbortSignal;
}): Promise<AntigravityStartResult> {
 const mergedInput = buildAgentInput(opts.systemInstruction, opts.input, opts.previousInteractionId);
 const estTokens = Math.max(1200, Math.min(25_000, Math.ceil(mergedInput.length / 2) + 1024));
 const quota = await tryConsumeSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, estTokens);
 if (!quota.allowed) {
  throw new AntigravityError(
   quota.reason === 'rpd'
    ? '今日高阶深度评审额度已满，请明天再来。'
    : '当前请求繁忙，请稍候再试。',
   429,
   'rate_limited',
  );
 }

 const payload: Record<string, unknown> = {
  agent: ANTIGRAVITY_AGENT_ID,
  environment: 'remote',
  background: true,
  input: mergedInput,
 };
 const agentCfg = buildAgentConfig({ agentModel: opts.agentModel, maxTotalTokens: opts.maxTotalTokens });
 if (agentCfg) payload.agent_config = agentCfg;
 if (opts.previousInteractionId) {
  payload.previous_interaction_id = opts.previousInteractionId;
 }

 try {
  const res = await callInteractionsApi('/v1beta/interactions', {
   method: 'POST',
   body: JSON.stringify(payload),
   geminiProxy: opts.geminiProxy !== false,
   signal: opts.signal,
   timeoutMs: 25_000,
  });

  if (res.status === 429) {
   const errTxt = (await res.text()).slice(0, 1024);
   await refundSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, quota.reservedTokens);
   await markSiteGemini429(ANTIGRAVITY_AGENT_ID, errTxt);
   throw new AntigravityError('深度评审服务触发限流，请稍后再试。', 429, 'rate_limited');
  }
  if (!res.ok) {
   const errTxt = (await res.text()).slice(0, 500);
   await refundSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, quota.reservedTokens);
   if (errTxt.toLowerCase().includes('location is not supported')) {
    throw new AntigravityError('当前代理节点地区受限，请在设置中检查代理网络。', 502, 'geo_blocked');
   }
   throw new AntigravityError(`启动架构评审失败（HTTP ${res.status}），请重试。`, 502, 'upstream_error');
  }

  const data = (await res.json()) as { id?: string; status?: string; environment_id?: string };
  if (!data?.id) {
   await refundSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, quota.reservedTokens);
   throw new AntigravityError('未返回有效评审任务 ID，请重试。', 502, 'invalid_response');
  }
  return {
   id: data.id,
   status: data.status || 'in_progress',
   environmentId: data.environment_id || '',
  };
 } catch (e) {
  if (!(e instanceof AntigravityError)) {
   await refundSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, quota.reservedTokens);
   throw new AntigravityError('连接深度评审服务失败，请重试。', 502, 'network_error');
  }
  throw e;
 }
}

type RawStep = {
 type?: string;
 summary?: { text?: string; type?: string }[];
 content?: { text?: string; type?: string }[];
};

export type AntigravityUsage = {
 totalTokens: number;
 inputTokens: number;
 cachedTokens: number;
 outputTokens: number;
 thoughtTokens: number;
};

export type AntigravityPollResult = {
 id: string;
 status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
 text: string;
 thoughts: string;
 usage?: AntigravityUsage;
 error?: string;
};

export async function pollAntigravityInteraction(opts: {
 interactionId: string;
 geminiProxy?: boolean;
 signal?: AbortSignal;
}): Promise<AntigravityPollResult> {
 const res = await callInteractionsApi(`/v1beta/interactions/${encodeURIComponent(opts.interactionId)}`, {
  method: 'GET',
  geminiProxy: opts.geminiProxy !== false,
  signal: opts.signal,
  timeoutMs: 15_000,
 });
 if (!res.ok) {
  throw new AntigravityError(`查询评审进度失败（HTTP ${res.status}）`, 502, 'poll_error');
 }
 const j = (await res.json()) as {
  id?: string;
  status?: string;
  steps?: RawStep[];
  outputs?: { text?: string }[];
  output_text?: string;
  error?: { message?: string };
  usage?: {
   total_tokens?: number;
   total_input_tokens?: number;
   total_cached_tokens?: number;
   total_output_tokens?: number;
   total_thought_tokens?: number;
  };
 };

 const thoughtParts: string[] = [];
 const outputParts: string[] = [];
 for (const step of j.steps ?? []) {
  if (step.type === 'thought' && Array.isArray(step.summary)) {
   for (const s of step.summary) {
    if (typeof s.text === 'string' && s.text.trim()) thoughtParts.push(s.text.trim());
   }
  } else if (step.type === 'model_output' && Array.isArray(step.content)) {
   for (const c of step.content) {
    if (typeof c.text === 'string' && c.text.trim()) outputParts.push(c.text.trim());
   }
  }
 }
 if (!outputParts.length && typeof j.output_text === 'string' && j.output_text.trim()) {
  outputParts.push(j.output_text.trim());
 }
 if (!outputParts.length && Array.isArray(j.outputs)) {
  for (const o of j.outputs) {
   if (typeof o.text === 'string' && o.text.trim()) outputParts.push(o.text.trim());
  }
 }

 const rawStatus = j.status || 'in_progress';
 const status: AntigravityPollResult['status'] =
  rawStatus === 'completed'
   ? 'completed'
   : rawStatus === 'failed'
    ? 'failed'
    : rawStatus === 'cancelled'
     ? 'cancelled'
     : 'in_progress';

 const usage: AntigravityUsage | undefined = j.usage
  ? {
     totalTokens: Number(j.usage.total_tokens || 0),
     inputTokens: Number(j.usage.total_input_tokens || 0),
     cachedTokens: Number(j.usage.total_cached_tokens || 0),
     outputTokens: Number(j.usage.total_output_tokens || 0),
     thoughtTokens: Number(j.usage.total_thought_tokens || 0),
    }
  : undefined;

 if (status === 'completed' && usage && usage.totalTokens > 2500) {
  void recordExtraGeminiTokens(ANTIGRAVITY_AGENT_ID, Math.min(40_000, usage.totalTokens - 2500));
 }

 return {
  id: j.id || opts.interactionId,
  status,
  text: outputParts.join('\n\n'),
  thoughts: thoughtParts.join('\n\n'),
  usage,
  error: j.error?.message,
 };
}

export type AntigravityStreamResult = {
 id: string;
 environmentId: string;
 text: string;
 thoughts: string;
 usage?: AntigravityUsage;
};

export async function streamAntigravityInteraction(opts: {
 systemInstruction: string;
 input: string;
 previousInteractionId?: string;
 agentModel?: string;
 maxTotalTokens?: number;
 firstStepTimeoutMs?: number;
 maxThoughtSteps?: number;
 geminiProxy?: boolean;
 signal?: AbortSignal;
 onCreated?: (info: { id: string; environmentId: string }) => void;
 onStep?: (stepType: string) => void;
 onKeepAlive?: () => void;
 onThoughtDelta?: (delta: string) => void;
 onTextDelta?: (delta: string) => void;
 onTextReset?: () => void;
}): Promise<AntigravityStreamResult> {
 const mergedInput = buildAgentInput(opts.systemInstruction, opts.input, opts.previousInteractionId);
 const estTokens = Math.max(1200, Math.min(25_000, Math.ceil(mergedInput.length / 2) + 1024));
 const quota = await tryConsumeSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, estTokens);
 if (!quota.allowed) {
  throw new AntigravityError(
   quota.reason === 'rpd' ? '今日高阶深度调研额度已满，请明天再来。' : '当前请求繁忙，请稍候再试。',
   429,
   'rate_limited',
  );
 }

 const payload: Record<string, unknown> = {
  agent: ANTIGRAVITY_AGENT_ID,
  environment: 'remote',
  stream: true,
  input: mergedInput,
 };
 const agentCfg = buildAgentConfig({ agentModel: opts.agentModel, maxTotalTokens: opts.maxTotalTokens });
 if (agentCfg) payload.agent_config = agentCfg;
 if (opts.previousInteractionId) {
  payload.previous_interaction_id = opts.previousInteractionId;
 }

 const { key, envMap, gatewayBase, useWorkerTunnel } = resolveKeyAndGateway(opts.geminiProxy !== false);
 const headers: Record<string, string> = {
  'x-goog-api-key': key,
  'content-type': 'application/json',
  accept: 'text/event-stream',
 };

 const ctl = new AbortController();
 const onAbort = () => ctl.abort();
 if (opts.signal) {
  if (opts.signal.aborted) ctl.abort();
  else opts.signal.addEventListener('abort', onAbort, { once: true });
 }
 // Sliding watchdog: 20s to establish HTTP stream headers, then 95s per SSE frame/keep-alive
 let timer = setTimeout(() => ctl.abort(), 20_000);
 const touchWatchdog = (ms = 95_000) => {
  clearTimeout(timer);
  timer = setTimeout(() => ctl.abort(), ms);
 };
 // Separate first-step timer (NOT reset by `: keep-alive` comments) so if Google's backend is
 // stuck retrying upstream 503s inside the remote sandbox, we fail fast and switch engines.
 const firstStepMs = opts.firstStepTimeoutMs ?? 18_000;
 let firstStepTimer: ReturnType<typeof setTimeout> | null = null;
 let firstStepTimedOut = false;
 let gotFirstStep = false;
 const startFirstStepTimer = () => {
  if (gotFirstStep || firstStepTimer || firstStepMs <= 0) return;
  firstStepTimer = setTimeout(() => {
   if (!gotFirstStep) {
    firstStepTimedOut = true;
    ctl.abort();
   }
  }, firstStepMs);
 };
 const markFirstStep = () => {
  if (gotFirstStep) return;
  gotFirstStep = true;
  if (firstStepTimer) {
   clearTimeout(firstStepTimer);
   firstStepTimer = null;
  }
 };

 let streamedAny = false;
 let refunded = false;
 const refundOnce = async () => {
  if (refunded) return;
  refunded = true;
  await refundSiteGeminiLimit(ANTIGRAVITY_AGENT_ID, quota.reservedTokens);
 };

 try {
  let res: Response | null = null;
  const pathWithQuery = '/v1beta/interactions?alt=sse';
  const bodyStr = JSON.stringify(payload);

  if (useWorkerTunnel) {
   try {
    const out = await fetchGeminiViaScheduledProxy(
     pathWithQuery,
     { method: 'POST', headers, body: bodyStr, signal: ctl.signal, connectTimeoutMs: 7500 },
     envMap,
    );
    res = out.res;
   } catch {
    if (ctl.signal.aborted) {
     await refundOnce();
     throw new AntigravityError('连接超时，请重试。', 504, 'timeout');
    }
   }
  }
  if (!res) {
   const base = (gatewayBase || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
   res = await fetch(`${base}${pathWithQuery}`, {
    method: 'POST',
    headers,
    body: bodyStr,
    signal: ctl.signal,
   });
  }

  if (res.status === 429) {
   const errTxt = (await res.text()).slice(0, 1024);
   await refundOnce();
   await markSiteGemini429(ANTIGRAVITY_AGENT_ID, errTxt);
   throw new AntigravityError('深度调研服务触发限流，请稍后再试。', 429, 'rate_limited');
  }
  if (!res.ok || !res.body) {
   const errTxt = (await res.text()).slice(0, 500);
   await refundOnce();
   if (errTxt.toLowerCase().includes('location is not supported')) {
    throw new AntigravityError('当前代理节点地区受限，请在设置中检查代理网络。', 502, 'geo_blocked');
   }
   throw new AntigravityError(`启动流式调研失败（HTTP ${res.status}），请重试。`, res.status === 503 ? 503 : 502, res.status === 503 ? 'service_unavailable' : 'upstream_error');
  }

  touchWatchdog(95_000);
  startFirstStepTimer();

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let currentEvent = '';
  let interactionId = '';
  let environmentId = '';
  let textOut = '';
  let thoughtOut = '';
  let usage: AntigravityUsage | undefined;
  let completed = false;
  let modelOutputStepCount = 0;
  let thoughtStepCount = 0;
  const maxThoughtSteps = opts.maxThoughtSteps ?? 4;

  const parseUsageObj = (u: Record<string, unknown> | undefined): AntigravityUsage | undefined => {
   if (!u) return undefined;
   return {
    totalTokens: Number(u.total_tokens || 0),
    inputTokens: Number(u.total_input_tokens || 0),
    cachedTokens: Number(u.total_cached_tokens || 0),
    outputTokens: Number(u.total_output_tokens || 0),
    thoughtTokens: Number(u.total_thought_tokens || 0),
   };
  };

  for (;;) {
   const { done, value } = await reader.read();
   if (done) break;
   touchWatchdog(95_000);
   buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
   let nl: number;
   while ((nl = buf.indexOf('\n')) >= 0) {
    const rawLine = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    const line = rawLine.trim();
    if (!line) {
     currentEvent = '';
     continue;
    }
    if (line.startsWith(':')) {
     opts.onKeepAlive?.();
     continue;
    }
    if (line.startsWith('event:')) {
     currentEvent = line.slice(6).trim();
     continue;
    }
    if (!line.startsWith('data:')) continue;
    const dataStr = line.slice(5).trim();
    if (!dataStr || dataStr === '[DONE]') continue;

    let ev: Record<string, unknown>;
    try {
     ev = JSON.parse(dataStr) as Record<string, unknown>;
    } catch {
     continue;
    }

    const evType = (typeof ev.event_type === 'string' ? ev.event_type : currentEvent) || '';

    // Official Interactions SSE emits `event: error` with `{ error: { code, message }, event_type: "error" }`
    if (evType === 'error' || (ev.error && !ev.interaction)) {
     const errObj = ev.error as { message?: string; code?: string } | undefined;
     throw mapUpstreamStreamError(errObj);
    }

    if (evType === 'interaction.created' || ev.interaction) {
     const inter = (ev.interaction || {}) as Record<string, unknown>;
     if (typeof inter.id === 'string' && inter.id && !interactionId) {
      interactionId = inter.id;
      environmentId = typeof inter.environment_id === 'string' ? inter.environment_id : '';
      opts.onCreated?.({ id: interactionId, environmentId });
     }
     if (inter.usage) {
      usage = parseUsageObj(inter.usage as Record<string, unknown>) || usage;
     }
     if (evType === 'interaction.completed' || inter.status === 'completed') {
      completed = true;
      if (Array.isArray(inter.steps)) {
       const fallbackModelSteps: string[] = [];
       const fallbackThoughts: string[] = [];
       for (const st of inter.steps as RawStep[]) {
        if (st.type === 'thought' && Array.isArray(st.summary)) {
         for (const s of st.summary) {
          if (typeof s.text === 'string' && s.text.trim()) fallbackThoughts.push(s.text.trim());
         }
        } else if (st.type === 'model_output' && Array.isArray(st.content)) {
         const stepTxt = st.content
          .map(c => (typeof c.text === 'string' ? c.text : ''))
          .join('')
          .trim();
         if (stepTxt) fallbackModelSteps.push(stepTxt);
        }
       }
       if (!textOut && fallbackModelSteps.length) {
        const finalStepText = fallbackModelSteps[fallbackModelSteps.length - 1];
        textOut = finalStepText;
        streamedAny = true;
        opts.onTextDelta?.(finalStepText);
       }
       if (!thoughtOut && fallbackThoughts.length) {
        const joined = fallbackThoughts.join('\n\n');
        thoughtOut = joined;
        streamedAny = true;
        opts.onThoughtDelta?.(joined);
       }
      }
     }
     if (evType === 'interaction.failed' || inter.status === 'failed' || inter.status === 'cancelled') {
      const errObj = (inter.error || ev.error) as { message?: string; code?: string } | undefined;
      throw mapUpstreamStreamError(errObj || { message: inter.status === 'cancelled' ? 'Agent 任务被取消' : undefined, code: String(inter.status || '') });
     }
     continue;
    }

    if (evType === 'step.start') {
     markFirstStep();
     const step = (ev.step || {}) as { type?: string };
     if (step.type === 'thought') {
      thoughtStepCount++;
      if (!textOut && thoughtStepCount > maxThoughtSteps) {
       throw new AntigravityError('Agent 思考循环过多，正在切换引擎。', 504, 'agent_loop');
      }
     } else if (step.type === 'model_output') {
      modelOutputStepCount++;
      // If the agent starts a second model_output step after an earlier interrupted draft,
      // reset the output buffer so we never concatenate two JSON drafts together.
      if (modelOutputStepCount > 1 && textOut) {
       textOut = '';
       opts.onTextReset?.();
      }
     }
     if (step.type) opts.onStep?.(step.type);
     continue;
    }

    if (evType === 'step.delta') {
     markFirstStep();
     const delta = (ev.delta || {}) as {
      type?: string;
      text?: string;
      thought?: string;
      content?: { text?: string; type?: string } | { text?: string; type?: string }[];
      summary?: { text?: string }[];
     };
     if (delta.type === 'text' && typeof delta.text === 'string' && delta.text) {
      streamedAny = true;
      textOut += delta.text;
      opts.onTextDelta?.(delta.text);
     } else if (delta.type === 'thought' || delta.type === 'thought_summary') {
      const td = extractDeltaThoughtText(delta);
      if (td) {
       streamedAny = true;
       thoughtOut += td;
       opts.onThoughtDelta?.(td);
      }
     } else if (Array.isArray(delta.summary)) {
      const td = extractDeltaThoughtText(delta);
      if (td) {
       streamedAny = true;
       thoughtOut += td;
       opts.onThoughtDelta?.(td);
      }
     } else if (delta.type === 'thought_signature') {
      opts.onStep?.('thought_signature');
     }
     continue;
    }

    if (evType === 'step.stop') {
     if (ev.usage) {
      usage = parseUsageObj(ev.usage as Record<string, unknown>) || usage;
     }
     continue;
    }
   }
  }

  if (usage && usage.totalTokens > 2500) {
   void recordExtraGeminiTokens(ANTIGRAVITY_AGENT_ID, Math.min(40_000, usage.totalTokens - 2500));
  }

  if (!textOut.trim()) {
   throw new AntigravityError(
    completed ? 'Agent 未返回有效正文内容，正在切换引擎。' : 'Agent 流式连接提前中断，正在切换引擎。',
    502,
    completed ? 'empty_output' : 'stream_interrupted',
   );
  }

  return {
   id: interactionId,
   environmentId,
   text: textOut,
   thoughts: thoughtOut,
   usage,
  };
 } catch (e) {
  if (!streamedAny) {
   await refundOnce();
  }
  if (e instanceof AntigravityError) throw e;
  if (firstStepTimedOut && !opts.signal?.aborted) {
   throw new AntigravityError('Agent 响应超时（上游繁忙），正在切换引擎。', 504, 'first_step_timeout');
  }
  if (ctl.signal.aborted && !opts.signal?.aborted) {
   throw new AntigravityError('流式响应超时，请点击一键重试。', 504, 'timeout');
  }
  throw new AntigravityError('流式连接中断，请点击一键重试。', 502, 'network_error');
 } finally {
  clearTimeout(timer);
  if (firstStepTimer) clearTimeout(firstStepTimer);
  opts.signal?.removeEventListener('abort', onAbort);
 }
}
