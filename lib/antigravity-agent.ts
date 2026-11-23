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

export async function startAntigravityInteraction(opts: {
 systemInstruction: string;
 input: string;
 previousInteractionId?: string;
 geminiProxy?: boolean;
 signal?: AbortSignal;
}): Promise<AntigravityStartResult> {
 const estTokens = Math.max(1200, Math.min(25_000, Math.ceil((opts.systemInstruction.length + opts.input.length) / 2) + 1024));
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
  input: opts.input,
 };
 if (opts.previousInteractionId) {
  payload.previous_interaction_id = opts.previousInteractionId;
 } else {
  payload.system_instruction = opts.systemInstruction;
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
