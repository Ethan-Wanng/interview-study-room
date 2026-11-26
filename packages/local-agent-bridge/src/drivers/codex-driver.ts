import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { BRIDGE_VERSION } from '../config.js';
import { JsonRpcError, JsonRpcStdioClient } from '../jsonrpc-stdio.js';
import {
 ensureEmptySandboxDir,
 killChildProcess,
 probeCommandVersion,
 resolveSafeCommand,
 spawnSafeProcess,
} from '../sandbox.js';
import {
 BridgeError,
 type LocalAgentDriver,
 type LocalModelOption,
 type LocalProviderId,
 type LocalProviderQuota,
 type LocalQuotaWindow,
 type ProviderDetection,
 type StreamTurnInput,
} from './types.js';

const AUTH_ERR_RE = /auth|login|unauth|credential|not\s*logged|sign[\s-]*in|api\s*key|未登录|未授权|鉴权/i;
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

type CodexDiscovery = {
 models: LocalModelOption[];
 defaultModel?: string;
};

type CodexTurnListener = {
 threadId: string;
 turnId?: string;
 onEvent: (method: string, params: Record<string, unknown>) => void;
};

function formatWindowLabel(mins: unknown, fallback: string): string {
 const n = Number(mins);
 if (!Number.isFinite(n) || n <= 0) return fallback;
 if (n >= 1440 && n % 1440 === 0) return `${Math.round(n / 1440)}d`;
 if (n >= 60 && n % 60 === 0) return `${Math.round(n / 60)}h`;
 return `${Math.round(n)}m`;
}

function parseCodexQuota(result: unknown): LocalProviderQuota | undefined {
 if (!result || typeof result !== 'object') return undefined;
 const obj = result as Record<string, unknown>;
 const planType = typeof obj.planType === 'string' && obj.planType.trim() ? obj.planType.trim() : undefined;
 const rl = (obj.rateLimits && typeof obj.rateLimits === 'object' ? obj.rateLimits : obj) as Record<string, unknown>;
 const windows: LocalQuotaWindow[] = [];
 for (const [key, fallback] of [['primary', '5h'], ['secondary', '7d']] as const) {
  const raw = rl[key];
  if (!raw || typeof raw !== 'object') continue;
  const w = raw as Record<string, unknown>;
  const used = Number(w.usedPercent);
  if (!Number.isFinite(used)) continue;
  const clamped = Math.max(0, Math.min(100, Math.round(used)));
  const rawReset = Number(w.resetsAt);
  const resetsAt = Number.isFinite(rawReset) && rawReset > 0
   ? (rawReset < 1e12 ? rawReset * 1000 : rawReset)
   : undefined;
  windows.push({
   label: formatWindowLabel(w.windowDurationMins, fallback),
   usedPercent: clamped,
   ...(resetsAt ? { resetsAt } : {}),
  });
 }
 if (!windows.length && !planType) return undefined;
 return { ...(planType ? { planType } : {}), windows };
}

function mapThinkingEffort(level?: string, supported?: string[]): string | undefined {
 if (!level || level === 'auto') return undefined;
 const norm = level.trim().toLowerCase();
 if (!norm) return undefined;
 if (supported?.length) {
  const lookup = new Map(supported.map(s => [s.trim().toLowerCase(), s.trim()]));
  const direct = lookup.get(norm);
  if (direct) return direct;
  const fallbackOrder: Record<string, string[]> = {
   ultra: ['ultra', 'max', 'xhigh', 'high', 'medium', 'low'],
   max: ['max', 'xhigh', 'high', 'medium', 'low'],
   xhigh: ['xhigh', 'max', 'high', 'medium', 'low'],
   high: ['high', 'xhigh', 'medium', 'low'],
   medium: ['medium', 'high', 'low'],
   low: ['low', 'minimal', 'medium'],
   off: ['off', 'none', 'minimal', 'low'],
  };
  for (const cand of fallbackOrder[norm] ?? []) {
   const hit = lookup.get(cand);
   if (hit) return hit;
  }
  return undefined;
 }
 if (norm === 'ultra' || norm === 'max' || norm === 'xhigh' || norm === 'high' || norm === 'medium' || norm === 'low') {
  return norm;
 }
 if (norm === 'off') return 'low';
 return undefined;
}

function parseCodexModels(result: unknown): CodexDiscovery {
 const obj = result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
 const rawList = Array.isArray(obj.data) ? obj.data : Array.isArray(obj.models) ? obj.models : [];
 let defaultModel: string | undefined;
 const models: LocalModelOption[] = [];

 for (const rawItem of rawList) {
  if (!rawItem || typeof rawItem !== 'object') continue;
  const item = rawItem as Record<string, unknown>;
  const id = typeof item.id === 'string' && item.id.trim()
   ? item.id.trim()
   : typeof item.model === 'string' && item.model.trim()
     ? item.model.trim()
     : '';
  if (!id) continue;
  const label =
   typeof item.displayName === 'string' && item.displayName.trim()
    ? item.displayName.trim()
    : typeof item.name === 'string' && item.name.trim()
      ? item.name.trim()
      : id;
  const efforts = Array.isArray(item.supportedReasoningEfforts)
   ? item.supportedReasoningEfforts
      .map(e => {
       if (typeof e === 'string') return e;
       if (e && typeof e === 'object' && typeof (e as Record<string, unknown>).reasoningEffort === 'string') {
        return String((e as Record<string, unknown>).reasoningEffort);
       }
       return '';
      })
      .filter(Boolean)
   : [];
  const defEffort =
   typeof item.defaultReasoningEffort === 'string' && item.defaultReasoningEffort.trim()
    ? item.defaultReasoningEffort.trim()
    : undefined;
  models.push({
   id,
   label,
   thinkingLevels: efforts,
   ...(defEffort ? { defaultThinkingLevel: defEffort } : {}),
  });
  if (item.isDefault === true && !defaultModel) {
   defaultModel = id;
  }
 }

 if (!defaultModel && models.length) {
  defaultModel = models[0].id;
 }
 if (!models.length) {
  models.push({ id: 'default', label: 'Codex 默认模型' });
  defaultModel = 'default';
 }
 return { models, defaultModel };
}

function buildCodexInputItems(
 messages: StreamTurnInput['messages'],
 prependedSystem?: string,
): Array<Record<string, unknown>> {
 const transcript = messages
  .map(m => `${m.role === 'assistant' ? '【Assistant】' : '【User】'}\n${m.content || ''}`.trim())
  .filter(Boolean)
  .join('\n\n');

 const text = prependedSystem ? `${prependedSystem.trim()}\n\n${transcript}` : transcript;
 const items: Array<Record<string, unknown>> = [{ type: 'text', text: text || '你好' }];

 for (const m of messages) {
  for (const url of m.images ?? []) {
   if (IMAGE_DATA_URL_RE.test(url)) {
    items.push({ type: 'image', url });
   }
  }
 }
 return items;
}

export class CodexAppServerDriver implements LocalAgentDriver {
 readonly id: LocalProviderId = 'codex';
 readonly name = 'OpenAI Codex';

 private child: ChildProcessWithoutNullStreams | null = null;
 private rpc: JsonRpcStdioClient | null = null;
 private connectingPromise: Promise<CodexDiscovery> | null = null;
 private discovery: CodexDiscovery | null = null;
 private binaryPath: string | undefined;
 private cachedVersion: string | undefined;
 private turnListeners = new Set<CodexTurnListener>();
 private turnLock: Promise<void> = Promise.resolve();

 private resolveBin(): string {
  return process.env.CODEX_BIN?.trim() || 'codex';
 }

 private async ensureConnected(): Promise<{ rpc: JsonRpcStdioClient; discovery: CodexDiscovery; sandboxDir: string }> {
  const sandboxDir = ensureEmptySandboxDir();
  if (this.rpc && !this.rpc.isClosed() && this.discovery) {
   return { rpc: this.rpc, discovery: this.discovery, sandboxDir };
  }

  if (this.connectingPromise) {
   const discovery = await this.connectingPromise;
   if (!this.rpc || this.rpc.isClosed()) {
    throw new BridgeError('upstream_error', 'OpenAI Codex 连接意外中断');
   }
   return { rpc: this.rpc, discovery, sandboxDir };
  }

  this.connectingPromise = (async () => {
   await this.dispose();
   const binName = this.resolveBin();
   const resolved = resolveSafeCommand(binName, ['app-server']);
   if (!resolved) {
    throw new BridgeError('missing_binary', '未检测到 OpenAI Codex CLI（npm i -g @openai/codex）');
   }
   this.binaryPath = resolved.displayPath;

   const ver = await probeCommandVersion(binName, sandboxDir, 4500);
   this.cachedVersion = ver?.version;

   const child = spawnSafeProcess(resolved, sandboxDir);
   const rpc = new JsonRpcStdioClient(child);
   this.child = child;
   this.rpc = rpc;

   // Decline any unexpected approval or interactive request
   rpc.setServerRequestHandler(() => ({ decision: 'decline', approved: false }));

   rpc.onNotification((method, params) => {
    const tid =
     typeof params.threadId === 'string'
      ? params.threadId
      : params.turn && typeof params.turn === 'object' && typeof (params.turn as Record<string, unknown>).threadId === 'string'
        ? String((params.turn as Record<string, unknown>).threadId)
        : '';
    const turnId =
     typeof params.turnId === 'string'
      ? params.turnId
      : params.turn && typeof params.turn === 'object' && typeof (params.turn as Record<string, unknown>).id === 'string'
        ? String((params.turn as Record<string, unknown>).id)
        : '';

    for (const listener of this.turnListeners) {
     if (tid && listener.threadId !== tid) continue;
     if (turnId && listener.turnId && listener.turnId !== turnId) continue;
     listener.onEvent(method, params);
    }
   });

   rpc.onExit(() => {
    if (this.rpc === rpc) {
     this.rpc = null;
     this.child = null;
     this.discovery = null;
    }
   });

   try {
    // Strict 2-step Codex handshake: initialize -> initialized notification -> model/list
    await rpc.request(
     'initialize',
     {
      clientInfo: {
       name: 'interview-study-bridge',
       title: 'Interview Study Bridge',
       version: BRIDGE_VERSION,
      },
     },
     20_000,
    );
    rpc.notify('initialized', {});

    const modelRes = await rpc.request('model/list', {}, 20_000);
    const disc = parseCodexModels(modelRes);
    this.discovery = disc;
    return disc;
   } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const fullMsg = [rawMsg, rpc.stderrSummary()].filter(Boolean).join(' | ');
    await this.dispose();
    if (AUTH_ERR_RE.test(fullMsg) || (err instanceof JsonRpcError && Math.abs(err.code) === 401)) {
     throw new BridgeError('auth_required', '请先运行 codex login');
    }
    throw new BridgeError('upstream_error', fullMsg || 'OpenAI Codex 初始化失败');
   }
  })();

  try {
   const discovery = await this.connectingPromise;
   if (!this.rpc) {
    throw new BridgeError('upstream_error', 'OpenAI Codex 启动失败');
   }
   return { rpc: this.rpc, discovery, sandboxDir };
  } finally {
   this.connectingPromise = null;
  }
 }

 async detect(forceRefresh = false): Promise<ProviderDetection> {
  if (forceRefresh) {
   await this.dispose();
  }
  try {
   const { rpc, discovery } = await this.ensureConnected();
   let quota: LocalProviderQuota | undefined;
   try {
    const rlRes = await rpc.request('account/rateLimits/read', {}, 4000);
    quota = parseCodexQuota(rlRes);
   } catch {}
   return {
    id: this.id,
    name: this.name,
    status: 'ready',
    binaryPath: this.binaryPath,
    version: this.cachedVersion,
    defaultModel: discovery.defaultModel,
    models: discovery.models,
    ...(quota ? { quota } : {}),
   };
  } catch (err) {
   if (err instanceof BridgeError) {
    if (err.code === 'missing_binary') {
     return {
      id: this.id,
      name: this.name,
      status: 'missing_binary',
      models: [],
      loginHint: 'npm i -g @openai/codex',
      errorMessage: err.message,
     };
    }
    if (err.code === 'auth_required') {
     return {
      id: this.id,
      name: this.name,
      status: 'auth_required',
      binaryPath: this.binaryPath,
      version: this.cachedVersion,
      models: [],
      loginHint: 'codex login',
      errorMessage: err.message,
     };
    }
    return {
     id: this.id,
     name: this.name,
     status: 'error',
     binaryPath: this.binaryPath,
     version: this.cachedVersion,
     models: [],
     errorMessage: err.message,
    };
   }
   return {
    id: this.id,
    name: this.name,
    status: 'error',
    binaryPath: this.binaryPath,
    models: [],
    errorMessage: err instanceof Error ? err.message : String(err),
   };
  }
 }

 streamTurn(input: StreamTurnInput): Promise<void> {
  const run = async () => {
   if (input.signal.aborted) {
    throw new BridgeError('aborted', '已取消');
   }

   const { rpc, discovery, sandboxDir } = await this.ensureConnected();
   if (input.signal.aborted) {
    throw new BridgeError('aborted', '已取消');
   }

   const systemWithConstraints = [
    input.system.trim(),
    input.allowWebSearch
     ? '[SANDBOX CONSTRAINT] 当前处于只读沙箱，严禁读写本地文件或执行本地命令；如遇不确定的最新信息可按需使用只读联网搜索。'
     : '[SANDBOX CONSTRAINT] 当前处于只读沙箱且禁止使用任何工具或命令，请直接用文本作答。',
    input.jsonMode
     ? '[OUTPUT CONSTRAINT] 严禁输出任何工具调用、思考说明或 Markdown 围栏之外的多余解释，必须严格输出单个合法 JSON 对象。'
     : '',
   ]
    .filter(Boolean)
    .join('\n\n');

   const requested = input.model?.trim();
   const resolvedModel =
    requested && requested !== 'default'
     ? requested
     : discovery.defaultModel && discovery.defaultModel !== 'default'
       ? discovery.defaultModel
       : undefined;

   let usedDeveloperInstructions = true;
   let threadRes: Record<string, unknown>;
   const baseThreadParams: Record<string, unknown> = {
    ...(resolvedModel ? { model: resolvedModel } : {}),
    cwd: sandboxDir,
    sandbox: 'read-only',
    approvalPolicy: 'never',
    ephemeral: true,
   };
   const fullThreadParams: Record<string, unknown> = {
    ...baseThreadParams,
    developerInstructions: systemWithConstraints,
    ...(input.allowWebSearch ? { webSearch: 'live' } : {}),
   };

   try {
    threadRes = (await rpc.request('thread/start', fullThreadParams, 20_000)) as Record<string, unknown>;
   } catch (err) {
    if (err instanceof JsonRpcError && /developerInstructions|webSearch|unknown|invalid/i.test(err.message)) {
     const retryWithDev = !/developerInstructions/i.test(err.message);
     if (retryWithDev) {
      try {
       threadRes = (await rpc.request(
        'thread/start',
        { ...baseThreadParams, developerInstructions: systemWithConstraints },
        20_000,
       )) as Record<string, unknown>;
      } catch (err2) {
       if (err2 instanceof JsonRpcError && /developerInstructions|unknown|invalid/i.test(err2.message)) {
        usedDeveloperInstructions = false;
        threadRes = (await rpc.request('thread/start', baseThreadParams, 20_000)) as Record<string, unknown>;
       } else {
        throw err2;
       }
      }
     } else {
      usedDeveloperInstructions = false;
      threadRes = (await rpc.request('thread/start', baseThreadParams, 20_000)) as Record<string, unknown>;
     }
    } else {
     throw err;
    }
   }

   const threadObj = threadRes?.thread && typeof threadRes.thread === 'object' ? (threadRes.thread as Record<string, unknown>) : null;
   const threadId =
    (typeof threadObj?.id === 'string' && threadObj.id) ||
    (typeof threadRes?.threadId === 'string' && threadRes.threadId) ||
    (typeof threadRes?.id === 'string' && threadRes.id) ||
    '';

   if (!threadId) {
    throw new BridgeError('upstream_error', 'Codex 未返回 threadId');
   }

   input.onModel(`local:codex/${resolvedModel || 'default'}`);

   let listenerRef!: CodexTurnListener;
   const emittedReasoningItems = new Set<string>();
   let lastAgentItemId = '';
   let emittedAnyDelta = false;
   let settleDone!: () => void;
   let settleErr!: (err: Error) => void;
   const completedPromise = new Promise<void>((resolve, reject) => {
    settleDone = resolve;
    settleErr = reject;
   });

   listenerRef = {
    threadId,
    onEvent: (method, params) => {
     if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') {
      const delta = typeof params.delta === 'string' ? params.delta : '';
      const itemId = typeof params.itemId === 'string' ? params.itemId : '__default__';
      if (delta) {
       emittedReasoningItems.add(itemId);
       input.onThink(delta);
      }
      return;
     }
     if (method === 'item/reasoning/summaryPartAdded') {
      const itemId = typeof params.itemId === 'string' ? params.itemId : '__default__';
      if (emittedReasoningItems.has(itemId)) input.onThink('\n\n');
      return;
     }
     if (method === 'codex/event/agent_reasoning_delta' || method === 'codex/event/agent_reasoning_raw_content_delta') {
      const msg = params.msg && typeof params.msg === 'object' ? (params.msg as Record<string, unknown>) : null;
      const delta =
       typeof msg?.delta === 'string'
        ? msg.delta
        : typeof params.delta === 'string'
          ? params.delta
          : '';
      if (delta) {
       emittedReasoningItems.add('__legacy__');
       input.onThink(delta);
      }
      return;
     }
     if (method === 'item/completed') {
      const item = params.item && typeof params.item === 'object' ? (params.item as Record<string, unknown>) : null;
      const itemId = typeof item?.id === 'string' ? item.id : '__default__';
      if (item?.type === 'reasoning' && !emittedReasoningItems.has(itemId) && !emittedReasoningItems.has('__legacy__')) {
       const parts: string[] = [];
       if (Array.isArray(item.summary)) {
        for (const s of item.summary) {
         if (typeof s === 'string' && s.trim()) parts.push(s.trim());
         else if (s && typeof s === 'object' && typeof (s as Record<string, unknown>).text === 'string') {
          const t = String((s as Record<string, unknown>).text).trim();
          if (t) parts.push(t);
         }
        }
       }
       if (!parts.length && Array.isArray(item.content)) {
        for (const c of item.content) {
         if (typeof c === 'string' && c.trim()) parts.push(c.trim());
         else if (c && typeof c === 'object' && typeof (c as Record<string, unknown>).text === 'string') {
          const t = String((c as Record<string, unknown>).text).trim();
          if (t) parts.push(t);
         }
        }
       }
       if (parts.length) {
        emittedReasoningItems.add(itemId);
        input.onThink(parts.join('\n\n'));
       }
      }
      return;
     }
     if (method === 'item/agentMessage/delta') {
      const delta = typeof params.delta === 'string' ? params.delta : '';
      const itemId = typeof params.itemId === 'string' ? params.itemId : '';
      if (delta) {
       if (emittedAnyDelta && itemId && lastAgentItemId && itemId !== lastAgentItemId) {
        input.onDelta('\n\n');
       }
       if (itemId) lastAgentItemId = itemId;
       emittedAnyDelta = true;
       input.onDelta(delta);
      }
      return;
     }
     if (method === 'turn/completed') {
      const turn = params.turn && typeof params.turn === 'object' ? (params.turn as Record<string, unknown>) : null;
      if (turn?.status === 'failed') {
       const errObj = turn.error && typeof turn.error === 'object' ? (turn.error as Record<string, unknown>) : null;
       const errMsg = typeof errObj?.message === 'string' && errObj.message ? errObj.message : 'Codex 执行失败';
       settleErr(new BridgeError('upstream_error', errMsg));
      } else {
       settleDone();
      }
      return;
     }
     if (method === 'error') {
      const msg =
       typeof params.message === 'string' && params.message
        ? params.message
        : params.error && typeof params.error === 'object' && typeof (params.error as Record<string, unknown>).message === 'string'
          ? String((params.error as Record<string, unknown>).message)
          : 'Codex 返回错误';
      settleErr(new BridgeError('upstream_error', msg));
     }
    },
   };
   this.turnListeners.add(listenerRef);

   const onAbort = () => {
    void rpc
     .request(
      'turn/interrupt',
      {
       threadId,
       ...(listenerRef.turnId ? { turnId: listenerRef.turnId } : {}),
      },
      5000,
     )
     .catch(() => {});
    settleErr(new BridgeError('aborted', '已取消'));
   };
   input.signal.addEventListener('abort', onAbort, { once: true });

   const exitUnsub = rpc.onExit(() => {
    settleErr(new BridgeError('upstream_error', 'Codex 子进程意外退出'));
   });

   try {
    const turnInputs = buildCodexInputItems(
     input.messages,
     usedDeveloperInstructions ? undefined : systemWithConstraints,
    );
    const modelInfo = discovery.models.find(m => m.id === resolvedModel);
    const effort = mapThinkingEffort(input.thinkingLevel, modelInfo?.thinkingLevels);
    const baseTurnParams: Record<string, unknown> = {
     threadId,
     input: turnInputs,
     ...(effort ? { effort } : {}),
    };
    let turnStartRes: Record<string, unknown>;
    try {
     turnStartRes = (await rpc.request(
      'turn/start',
      { ...baseTurnParams, summary: 'detailed' },
      30_000,
     )) as Record<string, unknown>;
    } catch (turnErr) {
     if (turnErr instanceof JsonRpcError && /summary|unknown|invalid/i.test(turnErr.message)) {
      turnStartRes = (await rpc.request('turn/start', baseTurnParams, 30_000)) as Record<string, unknown>;
     } else {
      throw turnErr;
     }
    }

    const turnObj = turnStartRes?.turn && typeof turnStartRes.turn === 'object' ? (turnStartRes.turn as Record<string, unknown>) : null;
    const tid =
     (typeof turnObj?.id === 'string' && turnObj.id) ||
     (typeof turnStartRes?.turnId === 'string' && turnStartRes.turnId) ||
     undefined;
    if (tid) listenerRef.turnId = tid;

    await completedPromise;
   } catch (err) {
    if (input.signal.aborted || (err instanceof BridgeError && err.code === 'aborted')) {
     throw new BridgeError('aborted', '已取消');
    }
    if (err instanceof BridgeError) throw err;
    const rawMsg = err instanceof Error ? err.message : String(err);
    if (AUTH_ERR_RE.test(rawMsg)) {
     throw new BridgeError('auth_required', '请先运行 codex login');
    }
    throw new BridgeError('upstream_error', rawMsg || 'Codex 推理失败');
   } finally {
    exitUnsub();
    input.signal.removeEventListener('abort', onAbort);
    this.turnListeners.delete(listenerRef);
   }
  };

  const next = this.turnLock.then(run, run);
  this.turnLock = next.catch(() => {});
  return next;
 }

 async dispose(): Promise<void> {
  const child = this.child;
  this.child = null;
  this.rpc = null;
  this.discovery = null;
  this.turnListeners.clear();
  if (child) {
   killChildProcess(child);
  }
 }
}
