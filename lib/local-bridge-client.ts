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
import {
  extractRelayCode,
  isLikelyMobileBrowser,
  resolveBridgeEndpoint,
  type BridgeTarget,
  type LocalBridgeConfig,
  type LocalBridgeProvider,
} from './local-bridge-config';
import type { ThinkingLevel } from './thinking';
import type { TutorContext, TutorMessage } from './tutor-types';

export type LocalProviderStatus = 'ready' | 'auth_required' | 'missing_binary' | 'error';
export type BridgeTransport = 'local' | 'relay';

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
  | { ok: true; providers: LocalProviderInfo[]; transport: BridgeTransport }
  | { ok: false; code: 'unauthorized' | 'forbidden' | 'unreachable' | 'error'; message: string };

export type CloudRelayStatus = {
  ok: boolean;
  connected: boolean;
  version?: string;
  authenticated?: boolean;
  mode?: 'account' | 'guest';
  roomKey?: string;
  guestCode?: string;
};

export type DownloadOsKey = 'win-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64';

type BridgeNdjsonEvent =
  | { t: 'start' }
  | { t: 'model'; model: string }
  | { t: 'think'; text: string }
  | { t: 'delta'; text: string }
  | { t: 'done'; model?: string }
  | { t: 'error'; code?: string; message?: string };

const AUTO_WAKE_SESSION_KEY = 'interview-bridge-auto-wake-v1';

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

function relayHeaders(relayCode?: string): Record<string, string> {
  const code = relayCode?.trim().toUpperCase() || '';
  return code ? { 'x-relay-code': code } : {};
}

function hasCustomNonDeadUrl(target: BridgeTarget): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const u = target.url?.trim() || '';
  return Boolean(u && !u.includes('.trycloudflare.com'));
}

function getLocalProbeTarget(target: BridgeTarget): { baseUrl: string; displayHost: string } {
  if (typeof target === 'object' && target !== null && target.url?.includes('.trycloudflare.com')) {
    return resolveBridgeEndpoint(target.port || 43180);
  }
  return resolveBridgeEndpoint(target);
}

export function detectDownloadOs(): DownloadOsKey {
  if (typeof navigator === 'undefined') return 'win-x64';
  const ua = navigator.userAgent || '';
  const plat = (navigator.platform || '').toLowerCase();
  if (/Mac/i.test(plat) || /Macintosh/i.test(ua)) {
    // Most modern Apple Silicon Macs still report MacIntel on Safari/Chrome, default darwin-arm64
    return 'darwin-arm64';
  }
  if (/Linux/i.test(plat) && !/Android/i.test(ua)) {
    return 'linux-x64';
  }
  return 'win-x64';
}

export function triggerBridgeProtocolWake(opts?: { autoOnce?: boolean }): boolean {
  if (typeof document === 'undefined' || isLikelyMobileBrowser()) return false;
  if (opts?.autoOnce) {
    try {
      if (window.sessionStorage.getItem(AUTO_WAKE_SESSION_KEY) === '1') {
        return false;
      }
      window.sessionStorage.setItem(AUTO_WAKE_SESSION_KEY, '1');
    } catch {}
  }
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = 'interview-bridge://start';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1500);
    return true;
  } catch {
    return false;
  }
}

export async function checkCloudRelayStatus(
  relayCode?: string,
  parentSignal?: AbortSignal,
): Promise<CloudRelayStatus> {
  const timeoutCtl = new AbortController();
  const timer = setTimeout(() => timeoutCtl.abort(), 5000);
  const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
  try {
    const res = await fetch('/api/bridge-relay/status', {
      method: 'GET',
      cache: 'no-store',
      headers: relayHeaders(relayCode),
      signal,
    });
    if (!res.ok) return { ok: false, connected: false };
    return (await res.json()) as CloudRelayStatus;
  } catch {
    return { ok: false, connected: false };
  } finally {
    clearTimeout(timer);
    cleanup();
  }
}

export async function syncDesktopBridgeToCloudRelay(
  target: BridgeTarget,
  token: string,
  existingGuestCode?: string,
): Promise<{ ok: boolean; mode?: 'account' | 'guest'; guestCode?: string; roomKey?: string }> {
  const tok = token.trim();
  if (!tok || isLikelyMobileBrowser()) return { ok: false };
  const { baseUrl } = getLocalProbeTarget(target);

  try {
    const [localRelayRes, cloudStatus] = await Promise.all([
      fetch(`${baseUrl}/v1/relay/status`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => (r.ok ? (r.json() as Promise<{ connected?: boolean; roomKey?: string }>) : null)).catch(() => null),
      checkCloudRelayStatus(existingGuestCode),
    ]);

    if (
      localRelayRes?.connected &&
      cloudStatus.connected &&
      cloudStatus.roomKey &&
      localRelayRes.roomKey === cloudStatus.roomKey
    ) {
      return {
        ok: true,
        mode: cloudStatus.mode,
        roomKey: cloudStatus.roomKey,
        ...(cloudStatus.guestCode ? { guestCode: cloudStatus.guestCode } : {}),
      };
    }

    const linkRes = await fetch('/api/bridge-relay/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!linkRes.ok) return { ok: false };
    const linkData = (await linkRes.json()) as {
      ok?: boolean;
      mode?: 'account' | 'guest';
      roomKey?: string;
      guestCode?: string;
      relayUrl?: string;
      relaySecret?: string;
    };
    if (!linkData.ok || !linkData.relayUrl || !linkData.relaySecret) return { ok: false };

    const connRes = await fetch(`${baseUrl}/v1/relay/connect`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${tok}`,
      },
      body: JSON.stringify({
        relayUrl: linkData.relayUrl,
        relaySecret: linkData.relaySecret,
        roomKey: linkData.roomKey,
      }),
    });
    if (!connRes.ok) return { ok: false };
    return {
      ok: true,
      mode: linkData.mode,
      roomKey: linkData.roomKey,
      ...(linkData.guestCode ? { guestCode: linkData.guestCode } : {}),
    };
  } catch {
    return { ok: false };
  }
}

async function pingLoopbackOnly(
  baseUrl: string,
  parentSignal?: AbortSignal,
  timeoutMs = 2200,
): Promise<{ ok: true; version?: string } | { ok: false }> {
  const timeoutCtl = new AbortController();
  const timer = setTimeout(() => timeoutCtl.abort(), timeoutMs);
  const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
  try {
    const res = await fetch(`${baseUrl}/v1/ping`, { method: 'GET', signal });
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

export async function pingBridgeInfo(
  target: BridgeTarget,
  parentSignal?: AbortSignal,
): Promise<{ ok: true; version?: string; transport: BridgeTransport } | { ok: false }> {
  const mobile = isLikelyMobileBrowser();
  const relayCode = extractRelayCode(target);

  if (!mobile || hasCustomNonDeadUrl(target)) {
    const { baseUrl } = getLocalProbeTarget(target);
    const localPing = await pingLoopbackOnly(baseUrl, parentSignal, mobile ? 3500 : 2000);
    if (localPing.ok) {
      return { ...localPing, transport: 'local' };
    }
  }

  const relay = await checkCloudRelayStatus(relayCode, parentSignal);
  if (relay.ok && relay.connected) {
    return {
      ok: true,
      transport: 'relay',
      ...(relay.version ? { version: relay.version } : {}),
    };
  }

  return { ok: false };
}

export async function pingBridge(target: BridgeTarget, parentSignal?: AbortSignal): Promise<boolean> {
  const info = await pingBridgeInfo(target, parentSignal);
  return info.ok;
}

export async function probeBridgeProviders(
  target: BridgeTarget,
  token: string,
  parentSignal?: AbortSignal,
): Promise<ProbeProvidersOutcome> {
  const mobile = isLikelyMobileBrowser();
  const tok = token.trim();
  const relayCode = extractRelayCode(target);
  const { baseUrl, displayHost } = getLocalProbeTarget(target);

  if ((!mobile || hasCustomNonDeadUrl(target)) && tok) {
    const timeoutCtl = new AbortController();
    const timer = setTimeout(() => timeoutCtl.abort(), 25_000);
    const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
    try {
      const res = await fetch(`${baseUrl}/v1/providers`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tok}` },
        signal,
      });
      if (res.status === 401) {
        return { ok: false, code: 'unauthorized', message: '配对码无效' };
      }
      if (res.status === 403) {
        return { ok: false, code: 'forbidden', message: '来源或 Host 被拒绝' };
      }
      if (res.ok) {
        const json = (await res.json()) as { providers?: LocalProviderInfo[] };
        return { ok: true, providers: Array.isArray(json.providers) ? json.providers : [], transport: 'local' };
      }
    } catch {
      // Fall through to cloud relay
    } finally {
      clearTimeout(timer);
      cleanup();
    }
  }

  // Fallback to same-origin cloud relay
  const relayCtl = new AbortController();
  const relayTimer = setTimeout(() => relayCtl.abort(), 25_000);
  const { signal: relaySig, cleanup: relayCleanup } = combineAbortSignals(parentSignal, relayCtl.signal);
  try {
    const res = await fetch('/api/bridge-relay/providers', {
      method: 'GET',
      cache: 'no-store',
      headers: relayHeaders(relayCode),
      signal: relaySig,
    });
    if (res.ok) {
      const json = (await res.json()) as { providers?: LocalProviderInfo[] };
      return { ok: true, providers: Array.isArray(json.providers) ? json.providers : [], transport: 'relay' };
    }
    if (res.status === 401) {
      return { ok: false, code: 'unreachable', message: mobile ? '需登录账号或输入 6 位连接码' : `未检测到桥接（${displayHost}）` };
    }
    if (res.status === 503) {
      return { ok: false, code: 'unreachable', message: mobile ? '电脑端桥接未在线' : `未检测到桥接（${displayHost}）` };
    }
    return { ok: false, code: 'error', message: `桥接返回 ${res.status}` };
  } catch {
    return { ok: false, code: 'unreachable', message: mobile ? '云端中继未连接' : `未检测到桥接（${displayHost}）` };
  } finally {
    clearTimeout(relayTimer);
    relayCleanup();
  }
}

export async function refreshBridgeProvider(
  target: BridgeTarget,
  token: string,
  provider: LocalBridgeProvider,
  parentSignal?: AbortSignal,
): Promise<{ ok: true; provider: LocalProviderInfo; transport: BridgeTransport } | { ok: false; message: string }> {
  const mobile = isLikelyMobileBrowser();
  const tok = token.trim();
  const relayCode = extractRelayCode(target);
  const { baseUrl, displayHost } = getLocalProbeTarget(target);

  if ((!mobile || hasCustomNonDeadUrl(target)) && tok) {
    const timeoutCtl = new AbortController();
    const timer = setTimeout(() => timeoutCtl.abort(), 25_000);
    const { signal, cleanup } = combineAbortSignals(parentSignal, timeoutCtl.signal);
    try {
      const res = await fetch(`${baseUrl}/v1/providers/${provider}/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        signal,
      });
      if (res.status === 401) return { ok: false, message: '配对码无效' };
      if (res.ok) {
        const data = (await res.json()) as LocalProviderInfo;
        return { ok: true, provider: data, transport: 'local' };
      }
    } catch {
      // Fall through to cloud relay
    } finally {
      clearTimeout(timer);
      cleanup();
    }
  }

  const relayCtl = new AbortController();
  const relayTimer = setTimeout(() => relayCtl.abort(), 25_000);
  const { signal: relaySig, cleanup: relayCleanup } = combineAbortSignals(parentSignal, relayCtl.signal);
  try {
    const res = await fetch(`/api/bridge-relay/providers/${provider}/refresh`, {
      method: 'POST',
      headers: relayHeaders(relayCode),
      signal: relaySig,
    });
    if (!res.ok) {
      return { ok: false, message: res.status === 503 ? '电脑端桥接未在线' : `刷新失败 (${res.status})` };
    }
    const data = (await res.json()) as LocalProviderInfo;
    return { ok: true, provider: data, transport: 'relay' };
  } catch {
    return { ok: false, message: `无法连接桥接服务（${displayHost}）` };
  } finally {
    clearTimeout(relayTimer);
    relayCleanup();
  }
}

export async function installLocalProviderTool(
  target: BridgeTarget,
  token: string,
  provider: LocalBridgeProvider,
  onProgress: (ev: { stage: string; pct: number }) => void,
  parentSignal?: AbortSignal,
): Promise<{ ok: true; provider: LocalProviderInfo } | { ok: false; message: string }> {
  const tok = token.trim();
  if (!tok) return { ok: false, message: '缺少本机配对码' };
  const { baseUrl } = getLocalProbeTarget(target);
  try {
    const res = await fetch(`${baseUrl}/v1/tools/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tok}`,
      },
      body: JSON.stringify({ provider }),
      signal: parentSignal,
    });
    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: j.message || `安装失败 (${res.status})` };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let doneProvider: LocalProviderInfo | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const ev = JSON.parse(line) as {
            t?: string;
            stage?: string;
            pct?: number;
            provider?: LocalProviderInfo;
            message?: string;
          };
          if (ev.t === 'progress') {
            onProgress({ stage: ev.stage || 'downloading', pct: Number(ev.pct) || 0 });
          } else if (ev.t === 'done' && ev.provider) {
            doneProvider = ev.provider;
          } else if (ev.t === 'error') {
            return { ok: false, message: ev.message || '安装失败' };
          }
        } catch {}
      }
    }
    if (doneProvider) {
      return { ok: true, provider: doneProvider };
    }
    return { ok: false, message: '安装未完成' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '安装失败' };
  }
}

export async function loginLocalProviderTool(
  target: BridgeTarget,
  token: string,
  provider: LocalBridgeProvider,
): Promise<{ ok: true; authUrl?: string } | { ok: false; message: string }> {
  const tok = token.trim();
  if (!tok) return { ok: false, message: '缺少本机配对码' };
  const { baseUrl } = getLocalProbeTarget(target);
  try {
    const res = await fetch(`${baseUrl}/v1/tools/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tok}`,
      },
      body: JSON.stringify({ provider }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; authUrl?: string; message?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message || `登录启动失败 (${res.status})` };
    }
    return { ok: true, ...(data.authUrl ? { authUrl: data.authUrl } : {}) };
  } catch {
    return { ok: false, message: '无法连接本机桥接服务' };
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
  const mobile = isLikelyMobileBrowser();
  const tok = cfg.token.trim();
  const relayCode = cfg.relayCode?.trim() || '';
  const { baseUrl } = getLocalProbeTarget(cfg);
  const payload = JSON.stringify({
    provider: cfg.provider,
    ...(cfg.model.trim() ? { model: cfg.model.trim() } : {}),
    system: opts.system,
    messages: opts.messages,
    ...(opts.thinkingLevel ? { thinkingLevel: opts.thinkingLevel } : {}),
    jsonMode: Boolean(opts.jsonMode),
    allowWebSearch: Boolean(cfg.allowWebSearch),
  });

  let res: Response | null = null;

  // Desktop prefers local loopback directly; falls back to same-origin cloud relay if unreachable.
  if ((!mobile || hasCustomNonDeadUrl(cfg)) && tok) {
    try {
      const localRes = await fetch(`${baseUrl}/v1/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok}`,
        },
        body: payload,
        signal: opts.signal,
      });
      res = localRes;
    } catch {
      if (opts.signal?.aborted) throw new Error('aborted');
      res = null;
    }
  }

  if (!res) {
    try {
      res = await fetch('/api/bridge-relay/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...relayHeaders(relayCode),
        },
        body: payload,
        signal: opts.signal,
      });
    } catch {
      if (opts.signal?.aborted) throw new Error('aborted');
      throw new Error('桥接服务未启动或云端中继未连接。');
    }
  }

  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('ndjson') || !res.body) {
    if (res.status === 401) throw new Error('本地桥接配对失效，请在「AI 设置」重新连接。');
    if (res.status === 403) throw new Error('本地桥接拒绝了当前站点来源请求。');
    if (res.status === 503) throw new Error('电脑端桥接未在线，请在电脑唤醒桥接后重试。');
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
