import { JsonRpcError, JsonRpcStdioClient } from '../jsonrpc-stdio.js';
import {
 ensureEmptySandboxDir,
 killChildProcess,
 probeCommandVersion,
 resolveSafeCommand,
 spawnSafeProcess,
} from '../sandbox.js';
import { BRIDGE_VERSION } from '../config.js';
import {
 BridgeError,
 type LocalAgentDriver,
 type LocalModelOption,
 type LocalProviderId,
 type ProviderDetection,
 type StreamTurnInput,
} from './types.js';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

type AcpDriverConfig = {
 id: Extract<LocalProviderId, 'antigravity' | 'workbuddy'>;
 name: string;
 binEnvKeys: string[];
 defaultBin: string;
 spawnArgs: string[];
 installHint: string;
 loginHint: string;
 fallbackModelLabel: string;
};

type ModelConfigDiscovery = {
 models: LocalModelOption[];
 defaultModel: string;
 configId?: string;
 mode: 'configOptions' | 'models' | 'none';
};

const AUTH_ERR_RE = /auth|login|unauth|credential|not\s*logged|sign[\s-]*in|forbidden|token\s*(?:expired|missing|invalid)|未登录|未授权|鉴权/i;
const IMAGE_DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

function isAuthLikeMessage(msg: string): boolean {
 return AUTH_ERR_RE.test(msg);
}

function extractAcpThinkingConfig(res: Record<string, unknown>): { levels: string[]; defaultLevel?: string } {
 if (!Array.isArray(res.configOptions)) return { levels: [] };
 for (const rawOpt of res.configOptions) {
  if (!rawOpt || typeof rawOpt !== 'object') continue;
  const opt = rawOpt as Record<string, unknown>;
  const id = typeof opt.id === 'string' ? opt.id : '';
  const cat = typeof opt.category === 'string' ? opt.category : '';
  if (cat !== 'thought_level' && !/thought|think|reason|effort/i.test(id)) continue;
  const rawChoices = Array.isArray(opt.options) ? opt.options : [];
  const levels = rawChoices
   .map(c => {
    if (typeof c === 'string') return c.trim();
    if (!c || typeof c !== 'object') return '';
    const co = c as Record<string, unknown>;
    return typeof co.value === 'string' ? co.value.trim() : typeof co.id === 'string' ? co.id.trim() : '';
   })
   .filter(Boolean);
  const defaultLevel =
   typeof opt.currentValue === 'string' && opt.currentValue.trim() ? opt.currentValue.trim() : undefined;
  return { levels, ...(defaultLevel ? { defaultLevel } : {}) };
 }
 return { levels: [] };
}

function extractAcpModels(result: unknown, fallbackLabel: string): ModelConfigDiscovery {
 const res = result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
 const sessionThinking = extractAcpThinkingConfig(res);

 // Newer ACP Session Config Options
 if (Array.isArray(res.configOptions)) {
  for (const rawOpt of res.configOptions) {
   if (!rawOpt || typeof rawOpt !== 'object') continue;
   const opt = rawOpt as Record<string, unknown>;
   if (opt.category !== 'model' && opt.id !== 'model') continue;
   const configId = typeof opt.id === 'string' && opt.id ? opt.id : 'model';
   const rawChoices = Array.isArray(opt.options) ? opt.options : [];
   const models: LocalModelOption[] = rawChoices
    .map((c): LocalModelOption | null => {
     if (!c || typeof c !== 'object') return null;
     const co = c as Record<string, unknown>;
     const id = typeof co.value === 'string' ? co.value.trim() : typeof co.id === 'string' ? co.id.trim() : '';
     if (!id) return null;
     const label = typeof co.name === 'string' && co.name.trim() ? co.name.trim() : typeof co.label === 'string' && co.label.trim() ? co.label.trim() : id;
     return {
      id,
      label,
      thinkingLevels: sessionThinking.levels,
      ...(sessionThinking.defaultLevel ? { defaultThinkingLevel: sessionThinking.defaultLevel } : {}),
     };
    })
    .filter((x): x is LocalModelOption => x !== null);
   if (models.length) {
    const defaultModel =
     typeof opt.currentValue === 'string' && opt.currentValue.trim()
      ? opt.currentValue.trim()
      : models[0].id;
    return { models, defaultModel, configId, mode: 'configOptions' };
   }
  }
 }

 // Classic / Stable ACP models field
 if (res.models && typeof res.models === 'object') {
  const mo = res.models as Record<string, unknown>;
  const rawList = Array.isArray(mo.availableModels) ? mo.availableModels : [];
  const models: LocalModelOption[] = rawList
   .map((m): LocalModelOption | null => {
    if (!m || typeof m !== 'object') return null;
    const item = m as Record<string, unknown>;
    const id = typeof item.modelId === 'string' ? item.modelId.trim() : typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) return null;
    const label = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id;
    const rawLevels = Array.isArray(item.supportedThinkingLevels)
     ? item.supportedThinkingLevels
     : Array.isArray(item.thinkingLevels)
       ? item.thinkingLevels
       : Array.isArray(item.reasoningEfforts)
         ? item.reasoningEfforts
         : null;
    const perModelLevels = rawLevels
     ? rawLevels.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
     : sessionThinking.levels;
    const perModelDef =
     typeof item.defaultThinkingLevel === 'string' && item.defaultThinkingLevel.trim()
      ? item.defaultThinkingLevel.trim()
      : sessionThinking.defaultLevel;
    return {
     id,
     label,
     thinkingLevels: perModelLevels,
     ...(perModelDef ? { defaultThinkingLevel: perModelDef } : {}),
    };
   })
   .filter((x): x is LocalModelOption => x !== null);
  if (models.length) {
   const defaultModel =
    typeof mo.currentModelId === 'string' && mo.currentModelId.trim()
     ? mo.currentModelId.trim()
     : models[0].id;
   return { models, defaultModel, mode: 'models' };
  }
 }

 return {
  models: [
   {
    id: 'default',
    label: fallbackLabel,
    thinkingLevels: sessionThinking.levels,
    ...(sessionThinking.defaultLevel ? { defaultThinkingLevel: sessionThinking.defaultLevel } : {}),
   },
  ],
  defaultModel: 'default',
  mode: 'none',
 };
}

function formatMessagesForPrompt(
 system: string,
 messages: StreamTurnInput['messages'],
 jsonMode?: boolean,
 allowWebSearch?: boolean,
): Array<Record<string, unknown>> {
 const constraints = [
  allowWebSearch
   ? '[SANDBOX CONSTRAINT] 当前处于只读答疑沙箱，严禁调用任何本地文件读写或终端命令工具；如遇不确定的最新信息可按需使用只读联网搜索。'
   : '[SANDBOX CONSTRAINT] 当前处于只读答疑沙箱，严禁调用任何文件、终端、浏览或网络工具，直接用纯文本回答。',
  jsonMode
   ? '[OUTPUT CONSTRAINT] 严禁输出任何工具调用、思考说明或 Markdown 围栏之外的多余解释，必须严格输出单个合法 JSON 对象。'
   : '',
 ]
  .filter(Boolean)
  .join('\n');

 const transcript = messages
  .map(m => `${m.role === 'assistant' ? '【Assistant】' : '【User】'}\n${m.content || ''}`.trim())
  .filter(Boolean)
  .join('\n\n');

 const fullText = [system.trim(), constraints, transcript].filter(Boolean).join('\n\n');
 const blocks: Array<Record<string, unknown>> = [{ type: 'text', text: fullText }];

 for (const msg of messages) {
  for (const imgUrl of msg.images ?? []) {
   const m = imgUrl.match(IMAGE_DATA_URL_RE);
   if (m?.[1] && m?.[2]) {
    blocks.push({
     type: 'image',
     mimeType: m[1],
     data: m[2],
    });
   }
  }
 }
 return blocks;
}

export class AcpStdioDriver implements LocalAgentDriver {
 readonly id: LocalProviderId;
 readonly name: string;

 private child: ChildProcessWithoutNullStreams | null = null;
 private rpc: JsonRpcStdioClient | null = null;
 private connectingPromise: Promise<ModelConfigDiscovery> | null = null;
 private discovery: ModelConfigDiscovery | null = null;
 private binaryPath: string | undefined;
 private cachedVersion: string | undefined;
 private sessionListeners = new Map<string, (update: Record<string, unknown>) => void>();
 private webSearchSessions = new Set<string>();
 private turnLock: Promise<void> = Promise.resolve();

 constructor(private readonly cfg: AcpDriverConfig) {
  this.id = cfg.id;
  this.name = cfg.name;
 }

 private resolveBin(): string {
  for (const key of this.cfg.binEnvKeys) {
   const val = process.env[key]?.trim();
   if (val) return val;
  }
  return this.cfg.defaultBin;
 }

 private async ensureConnected(): Promise<{ rpc: JsonRpcStdioClient; discovery: ModelConfigDiscovery; sandboxDir: string }> {
  const sandboxDir = ensureEmptySandboxDir();
  if (this.rpc && !this.rpc.isClosed() && this.discovery) {
   return { rpc: this.rpc, discovery: this.discovery, sandboxDir };
  }

  if (this.connectingPromise) {
   const discovery = await this.connectingPromise;
   if (!this.rpc || this.rpc.isClosed()) {
    throw new BridgeError('upstream_error', `${this.name} 连接意外中断`);
   }
   return { rpc: this.rpc, discovery, sandboxDir };
  }

  this.connectingPromise = (async () => {
   await this.dispose();
   const binName = this.resolveBin();
   const resolved = resolveSafeCommand(binName, this.cfg.spawnArgs);
   if (!resolved) {
    throw new BridgeError('missing_binary', `未检测到 ${this.name} CLI（${this.cfg.installHint}）`);
   }
   this.binaryPath = resolved.displayPath;

   const ver = await probeCommandVersion(binName, sandboxDir, 4500);
   this.cachedVersion = ver?.version;

   const child = spawnSafeProcess(resolved, sandboxDir);
   const rpc = new JsonRpcStdioClient(child);
   this.child = child;
   this.rpc = rpc;

   // Strict read-only sandbox: deny all local fs/terminal/write requests;
   // only permit read-only web search when the caller explicitly enabled allowWebSearch for this session.
   rpc.setServerRequestHandler((method, params) => {
    if (method === 'session/request_permission') {
     const sid = typeof params?.sessionId === 'string' ? params.sessionId : '';
     if (sid && this.webSearchSessions.has(sid)) {
      const tc = params?.toolCall && typeof params.toolCall === 'object' ? (params.toolCall as Record<string, unknown>) : null;
      const kind = typeof tc?.kind === 'string' ? tc.kind.toLowerCase() : '';
      const title = typeof tc?.title === 'string' ? tc.title : '';
      const rawName = `${kind} ${title}`;
      const isReadOnlyWeb =
       (kind === 'fetch' || /web.?search|search.?web|google.?search|web.?fetch|read.?url/i.test(rawName)) &&
       !/write|edit|delete|remove|shell|bash|terminal|exec|run|cmd|powershell|\bfs\b|file/i.test(rawName);
      if (isReadOnlyWeb && Array.isArray(params?.options)) {
       const allowOpt = (params.options as Array<Record<string, unknown>>).find(
        o => o?.kind === 'allow_once' || o?.optionId === 'allow_once',
       );
       const optId = typeof allowOpt?.optionId === 'string' ? allowOpt.optionId : '';
       if (optId) {
        return { outcome: { outcome: 'selected', optionId: optId } };
       }
      }
     }
     return { outcome: { outcome: 'cancelled' } };
    }
    return { outcome: { outcome: 'cancelled' }, approved: false };
   });

   rpc.onNotification((method, params) => {
    if (method !== 'session/update') return;
    const sid = typeof params.sessionId === 'string' ? params.sessionId : '';
    if (!sid) return;
    const listener = this.sessionListeners.get(sid);
    if (listener && params.update && typeof params.update === 'object') {
     listener(params.update as Record<string, unknown>);
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
    await rpc.request(
     'initialize',
     {
      protocolVersion: 1,
      clientInfo: { name: 'interview-study-bridge', version: BRIDGE_VERSION },
      capabilities: {},
     },
     20_000,
    );

    const probeSession = (await rpc.request(
     'session/new',
     {
      cwd: sandboxDir,
      mcpServers: [],
     },
     20_000,
    )) as Record<string, unknown>;

    const disc = extractAcpModels(probeSession, this.cfg.fallbackModelLabel);
    const probeSessionId = typeof probeSession?.sessionId === 'string' ? probeSession.sessionId : '';
    if (probeSessionId && disc.mode === 'configOptions' && disc.models.length > 1) {
     const modelConfigId = disc.configId || 'model';
     let switchedAny = false;
     for (const m of disc.models) {
      if (m.id === disc.defaultModel) continue;
      try {
       const setRes = (await rpc.request(
        'session/set_config_option',
        { sessionId: probeSessionId, configId: modelConfigId, value: m.id },
        5_000,
       )) as Record<string, unknown>;
       switchedAny = true;
       if (setRes && typeof setRes === 'object' && Array.isArray(setRes.configOptions)) {
        const perModelThinking = extractAcpThinkingConfig(setRes);
        m.thinkingLevels = perModelThinking.levels;
        if (perModelThinking.defaultLevel) {
         m.defaultThinkingLevel = perModelThinking.defaultLevel;
        } else {
         delete m.defaultThinkingLevel;
        }
       }
      } catch {}
     }
     if (switchedAny && disc.defaultModel) {
      try {
       await rpc.request(
        'session/set_config_option',
        { sessionId: probeSessionId, configId: modelConfigId, value: disc.defaultModel },
        5_000,
       );
      } catch {}
     }
    }
    this.discovery = disc;
    return disc;
   } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const fullMsg = [rawMsg, rpc.stderrSummary()].filter(Boolean).join(' | ');
    await this.dispose();
    if (isAuthLikeMessage(fullMsg) || (err instanceof JsonRpcError && Math.abs(err.code) === 401)) {
     throw new BridgeError('auth_required', `请先运行 ${this.cfg.loginHint}`);
    }
    throw new BridgeError('upstream_error', fullMsg || `${this.name} 初始化失败`);
   }
  })();

  try {
   const discovery = await this.connectingPromise;
   if (!this.rpc) {
    throw new BridgeError('upstream_error', `${this.name} 启动失败`);
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
   const { discovery } = await this.ensureConnected();
   return {
    id: this.id,
    name: this.name,
    status: 'ready',
    binaryPath: this.binaryPath,
    version: this.cachedVersion,
    defaultModel: discovery.defaultModel,
    models: discovery.models,
   };
  } catch (err) {
   if (err instanceof BridgeError) {
    if (err.code === 'missing_binary') {
     return {
      id: this.id,
      name: this.name,
      status: 'missing_binary',
      models: [],
      loginHint: this.cfg.installHint,
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
      loginHint: this.cfg.loginHint,
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

   const newRes = (await rpc.request(
    'session/new',
    { cwd: sandboxDir, mcpServers: [] },
    20_000,
   )) as Record<string, unknown>;
   const sessionId = typeof newRes?.sessionId === 'string' ? newRes.sessionId : '';
   if (!sessionId) {
    throw new BridgeError('upstream_error', `${this.name} 未返回 sessionId`);
   }

   const turnDisc = extractAcpModels(newRes, this.cfg.fallbackModelLabel);
   const requested = input.model?.trim();
   let effectiveModel = turnDisc.defaultModel || discovery.defaultModel || 'default';
   let activeConfigOptions: unknown[] | undefined = Array.isArray(newRes.configOptions)
    ? newRes.configOptions
    : undefined;

   if (requested && requested !== 'default') {
    let switched = false;
    if (turnDisc.mode === 'configOptions' || discovery.mode === 'configOptions') {
     const configId = turnDisc.configId || discovery.configId || 'model';
     try {
      const setRes = (await rpc.request(
       'session/set_config_option',
       { sessionId, configId, value: requested },
       10_000,
      )) as Record<string, unknown>;
      switched = true;
      if (setRes && typeof setRes === 'object' && Array.isArray(setRes.configOptions)) {
       activeConfigOptions = setRes.configOptions;
      }
     } catch {}
    }
    if (!switched) {
     try {
      await rpc.request('session/set_model', { sessionId, modelId: requested }, 10_000);
      switched = true;
     } catch {}
    }
    if (switched || requested !== 'default') {
     effectiveModel = requested;
    }
   }

   if (input.thinkingLevel && input.thinkingLevel !== 'auto' && Array.isArray(activeConfigOptions)) {
    for (const rawOpt of activeConfigOptions) {
     if (!rawOpt || typeof rawOpt !== 'object') continue;
     const opt = rawOpt as Record<string, unknown>;
     const id = typeof opt.id === 'string' ? opt.id : '';
     const cat = typeof opt.category === 'string' ? opt.category : '';
     if (cat !== 'thought_level' && !/thought|think|reason|effort/i.test(id)) continue;
     const choices = Array.isArray(opt.options) ? opt.options : [];
     const choiceValues = choices
      .map(c => {
       if (typeof c === 'string') return c.trim();
       if (!c || typeof c !== 'object') return '';
       const co = c as Record<string, unknown>;
       return String(co.value ?? co.id ?? '').trim();
      })
      .filter(Boolean);
     const target = input.thinkingLevel.trim().toLowerCase();
     const lookup = new Map(choiceValues.map(v => [v.toLowerCase(), v]));
     const fallbackOrder: Record<string, string[]> = {
      ultra: ['ultra', 'max', 'xhigh', 'high', 'medium', 'low'],
      max: ['max', 'xhigh', 'high', 'medium', 'low'],
      xhigh: ['xhigh', 'max', 'high', 'medium', 'low'],
      high: ['high', 'xhigh', 'medium', 'low'],
      medium: ['medium', 'high', 'low'],
      low: ['low', 'minimal', 'medium'],
      off: ['off', 'none', 'minimal', 'low'],
     };
     const candidates = [target, ...(fallbackOrder[target] ?? [])];
     let nextVal = '';
     for (const cand of candidates) {
      const hit = lookup.get(cand);
      if (hit) {
       nextVal = hit;
       break;
      }
     }
     if (id && nextVal) {
      try {
       await rpc.request('session/set_config_option', { sessionId, configId: id, value: nextVal }, 5_000);
      } catch {}
     }
     break;
    }
   }

   input.onModel(`local:${this.id}/${effectiveModel}`);

   this.sessionListeners.set(sessionId, update => {
    const kind = typeof update.sessionUpdate === 'string' ? update.sessionUpdate : '';
    const extractText = (raw: unknown): string => {
     if (typeof raw === 'string') return raw;
     if (Array.isArray(raw)) return raw.map(extractText).filter(Boolean).join('');
     if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.text === 'string') return obj.text;
     }
     return '';
    };
    const txt = extractText(update.content ?? update.text);
    if (!txt) return;
    if (kind === 'agent_thought_chunk' || kind === 'thought_chunk' || kind === 'reasoning_chunk') {
     input.onThink(txt);
    } else if (kind === 'agent_message_chunk' || kind === 'message_chunk') {
     input.onDelta(txt);
    }
   });

   let abortReject: ((err: Error) => void) | null = null;
   const abortPromise = new Promise<never>((_resolve, reject) => {
    abortReject = reject;
   });

   const onAbort = () => {
    rpc.notify('session/cancel', { sessionId });
    abortReject?.(new BridgeError('aborted', '已取消'));
   };
   input.signal.addEventListener('abort', onAbort, { once: true });

   if (input.allowWebSearch) {
    this.webSearchSessions.add(sessionId);
   }
   try {
    const promptBlocks = formatMessagesForPrompt(input.system, input.messages, input.jsonMode, input.allowWebSearch);
    const promptPromise = rpc.request('session/prompt', { sessionId, prompt: promptBlocks }, 240_000);
    await Promise.race([promptPromise, abortPromise]);
   } catch (err) {
    if (input.signal.aborted || (err instanceof BridgeError && err.code === 'aborted')) {
     throw new BridgeError('aborted', '已取消');
    }
    const rawMsg = err instanceof Error ? err.message : String(err);
    if (isAuthLikeMessage(rawMsg)) {
     throw new BridgeError('auth_required', `请先运行 ${this.cfg.loginHint}`);
    }
    throw new BridgeError('upstream_error', rawMsg || `${this.name} 请求失败`);
   } finally {
    input.signal.removeEventListener('abort', onAbort);
    this.sessionListeners.delete(sessionId);
    this.webSearchSessions.delete(sessionId);
   }
  };

  // Serialize turns on the shared ACP stdio worker to keep memory bounded
  const next = this.turnLock.then(run, run);
  this.turnLock = next.catch(() => {});
  return next;
 }

 async dispose(): Promise<void> {
  const child = this.child;
  this.child = null;
  this.rpc = null;
  this.discovery = null;
  this.sessionListeners.clear();
  if (child) {
   killChildProcess(child);
  }
 }
}

export function createAntigravityDriver(): LocalAgentDriver {
 return new AcpStdioDriver({
  id: 'antigravity',
  name: 'Google Antigravity',
  binEnvKeys: ['ANTIGRAVITY_BIN'],
  defaultBin: 'agy',
  spawnArgs: ['acp'],
  installHint: 'agy',
  loginHint: 'agy acp --login',
  fallbackModelLabel: 'Antigravity 默认模型',
 });
}

export function createWorkBuddyDriver(): LocalAgentDriver {
 return new AcpStdioDriver({
  id: 'workbuddy',
  name: 'WorkBuddy / CodeBuddy',
  binEnvKeys: ['WORKBUDDY_BIN', 'CODEBUDDY_BIN'],
  defaultBin: 'codebuddy',
  spawnArgs: ['--acp'],
  installHint: 'npm i -g @tencent-ai/codebuddy-code',
  loginHint: 'codebuddy login',
  fallbackModelLabel: 'WorkBuddy 默认模型',
 });
}
