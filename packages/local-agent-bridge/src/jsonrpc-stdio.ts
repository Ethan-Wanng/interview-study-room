import type { ChildProcessWithoutNullStreams } from 'node:child_process';

type PendingRequest = {
 resolve: (value: unknown) => void;
 reject: (err: Error) => void;
 timer?: ReturnType<typeof setTimeout>;
};

export type NotificationHandler = (method: string, params: Record<string, unknown>) => void;
export type ServerRequestHandler = (
 method: string,
 params: Record<string, unknown>,
 id: string | number,
) => unknown | Promise<unknown>;

export class JsonRpcError extends Error {
 constructor(
  public readonly code: number,
  message: string,
  public readonly data?: unknown,
 ) {
  super(message);
  this.name = 'JsonRpcError';
 }
}

const MAX_STDERR_LINES = 100;
const MAX_NOISE_LINES = 50;

export class JsonRpcStdioClient {
 private nextId = 1;
 private pending = new Map<number, PendingRequest>();
 private notificationHandlers = new Set<NotificationHandler>();
 private serverRequestHandler: ServerRequestHandler | null = null;
 private exitHandlers = new Set<(code: number | null, signal: NodeJS.Signals | null) => void>();
 private stdoutBuf = '';
 private stderrBuf = '';
 private stderrLines: string[] = [];
 private noiseLines: string[] = [];
 private closed = false;

 constructor(private readonly child: ChildProcessWithoutNullStreams) {
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk: string) => {
   this.stdoutBuf += chunk.replace(/\r\n/g, '\n');
   let nl: number;
   while ((nl = this.stdoutBuf.indexOf('\n')) >= 0) {
    const line = this.stdoutBuf.slice(0, nl);
    this.stdoutBuf = this.stdoutBuf.slice(nl + 1);
    this.handleStdoutLine(line);
   }
  });

  child.stderr.on('data', (chunk: string) => {
   this.stderrBuf += chunk.replace(/\r\n/g, '\n');
   let nl: number;
   while ((nl = this.stderrBuf.indexOf('\n')) >= 0) {
    const line = this.stderrBuf.slice(0, nl).trim();
    this.stderrBuf = this.stderrBuf.slice(nl + 1);
    if (line) this.pushStderr(line);
   }
  });

  child.on('exit', (code, signal) => {
   if (this.stderrBuf.trim()) {
    this.pushStderr(this.stderrBuf.trim());
    this.stderrBuf = '';
   }
   this.closed = true;
   const err = new Error(
    `子进程已退出 (code=${code ?? 'null'}, signal=${signal ?? 'null'})${this.stderrSummary() ? `: ${this.stderrSummary()}` : ''}`,
   );
   for (const p of this.pending.values()) {
    if (p.timer) clearTimeout(p.timer);
    p.reject(err);
   }
   this.pending.clear();
   for (const h of this.exitHandlers) {
    try {
     h(code, signal);
    } catch {}
   }
  });

  child.on('error', err => {
   this.closed = true;
   for (const p of this.pending.values()) {
    if (p.timer) clearTimeout(p.timer);
    p.reject(err);
   }
   this.pending.clear();
  });
 }

 private pushStderr(line: string): void {
  this.stderrLines.push(line);
  if (this.stderrLines.length > MAX_STDERR_LINES) {
   this.stderrLines.shift();
  }
 }

 private pushNoise(line: string): void {
  this.noiseLines.push(line);
  if (this.noiseLines.length > MAX_NOISE_LINES) {
   this.noiseLines.shift();
  }
 }

 getStderrLines(): string[] {
  return [...this.stderrLines];
 }

 stderrSummary(): string {
  return this.stderrLines.slice(-6).join(' | ').slice(0, 400);
 }

 getNoiseLines(): string[] {
  return [...this.noiseLines];
 }

 isClosed(): boolean {
  return this.closed || this.child.killed || this.child.exitCode !== null;
 }

 setServerRequestHandler(handler: ServerRequestHandler | null): void {
  this.serverRequestHandler = handler;
 }

 onNotification(handler: NotificationHandler): () => void {
  this.notificationHandlers.add(handler);
  return () => {
   this.notificationHandlers.delete(handler);
  };
 }

 onExit(handler: (code: number | null, signal: NodeJS.Signals | null) => void): () => void {
  this.exitHandlers.add(handler);
  return () => {
   this.exitHandlers.delete(handler);
  };
 }

 private writeJson(obj: Record<string, unknown>): void {
  if (this.isClosed()) {
   throw new Error('JSON-RPC 通道已关闭');
  }
  this.child.stdin.write(JSON.stringify(obj) + '\n');
 }

 notify(method: string, params?: unknown): void {
  if (this.isClosed()) return;
  try {
   this.writeJson({
    jsonrpc: '2.0',
    method,
    ...(params !== undefined ? { params } : {}),
   });
  } catch {}
 }

 request<T = unknown>(method: string, params?: unknown, timeoutMs = 45_000): Promise<T> {
  if (this.isClosed()) {
   return Promise.reject(new Error(`无法发送 ${method}：子进程已退出`));
  }
  const id = this.nextId++;
  return new Promise<T>((resolve, reject) => {
   const timer = timeoutMs > 0
    ? setTimeout(() => {
       if (this.pending.has(id)) {
        this.pending.delete(id);
        reject(new Error(`RPC ${method} 超时 (${Math.round(timeoutMs / 1000)}s)`));
       }
      }, timeoutMs)
    : undefined;
   this.pending.set(id, {
    resolve: value => resolve(value as T),
    reject,
    timer,
   });
   try {
    this.writeJson({
     jsonrpc: '2.0',
     id,
     method,
     ...(params !== undefined ? { params } : {}),
    });
   } catch (err) {
    if (timer) clearTimeout(timer);
    this.pending.delete(id);
    reject(err instanceof Error ? err : new Error(String(err)));
   }
  });
 }

 private handleStdoutLine(rawLine: string): void {
  const trimmed = rawLine.trim();
  if (!trimmed) return;
  if (!trimmed.startsWith('{')) {
   this.pushNoise(trimmed.slice(0, 300));
   return;
  }

  let msg: Record<string, unknown>;
  try {
   msg = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
   this.pushNoise(trimmed.slice(0, 300));
   return;
  }

  // Incoming response to our request
  if (typeof msg.method !== 'string' && msg.id !== undefined) {
   const numericId = typeof msg.id === 'number' ? msg.id : Number(msg.id);
   const pending = this.pending.get(numericId);
   if (!pending) return;
   this.pending.delete(numericId);
   if (pending.timer) clearTimeout(pending.timer);
   if (msg.error && typeof msg.error === 'object') {
    const eo = msg.error as Record<string, unknown>;
    pending.reject(
     new JsonRpcError(
      typeof eo.code === 'number' ? eo.code : -32000,
      typeof eo.message === 'string' ? eo.message : 'JSON-RPC error',
      eo.data,
     ),
    );
   } else {
    pending.resolve(msg.result);
   }
   return;
  }

  // Incoming server-initiated request (expects a response)
  if (typeof msg.method === 'string' && msg.id !== undefined) {
   const reqId = msg.id as string | number;
   const params = msg.params && typeof msg.params === 'object' ? (msg.params as Record<string, unknown>) : {};
   const handler = this.serverRequestHandler;
   if (!handler) {
    try {
     this.writeJson({ jsonrpc: '2.0', id: reqId, result: { outcome: { outcome: 'cancelled' }, approved: false, decision: 'decline' } });
    } catch {}
    return;
   }
   Promise.resolve(handler(msg.method, params, reqId))
    .then(result => {
     try {
      this.writeJson({ jsonrpc: '2.0', id: reqId, result: result ?? {} });
     } catch {}
    })
    .catch(err => {
     try {
      this.writeJson({
       jsonrpc: '2.0',
       id: reqId,
       error: { code: -32000, message: err instanceof Error ? err.message : 'Rejected' },
      });
     } catch {}
    });
   return;
  }

  // Incoming notification
  if (typeof msg.method === 'string') {
   const params = msg.params && typeof msg.params === 'object' ? (msg.params as Record<string, unknown>) : {};
   for (const h of this.notificationHandlers) {
    try {
     h(msg.method, params);
    } catch {}
   }
  }
 }
}
