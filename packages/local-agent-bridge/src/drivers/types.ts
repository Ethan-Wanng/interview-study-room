export type LocalProviderId = 'antigravity' | 'codex' | 'workbuddy';

export type ProviderStatus = 'ready' | 'auth_required' | 'missing_binary' | 'error';

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

export type ProviderDetection = {
 id: LocalProviderId;
 name: string;
 status: ProviderStatus;
 binaryPath?: string;
 version?: string;
 defaultModel?: string;
 models: LocalModelOption[];
 quota?: LocalProviderQuota;
 loginHint?: string;
 errorMessage?: string;
};

export type StreamTurnMessage = {
 role: 'user' | 'assistant';
 content: string;
 images?: string[];
};

export type StreamTurnInput = {
 model?: string;
 system: string;
 messages: StreamTurnMessage[];
 thinkingLevel?: string;
 jsonMode?: boolean;
 allowWebSearch?: boolean;
 signal: AbortSignal;
 onModel: (modelBadgeId: string) => void;
 onThink: (delta: string) => void;
 onDelta: (delta: string) => void;
};

export type BridgeErrorCode =
 | 'auth_required'
 | 'missing_binary'
 | 'bad_request'
 | 'upstream_error'
 | 'aborted';

export class BridgeError extends Error {
 constructor(
  public readonly code: BridgeErrorCode,
  message: string,
 ) {
  super(message);
  this.name = 'BridgeError';
 }
}

export interface LocalAgentDriver {
 readonly id: LocalProviderId;
 readonly name: string;
 detect(forceRefresh?: boolean): Promise<ProviderDetection>;
 streamTurn(input: StreamTurnInput): Promise<void>;
 dispose(): Promise<void>;
}
