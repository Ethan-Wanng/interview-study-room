import { DurableObject } from 'cloudflare:workers';

type PendingRpc = {
  resolve: (v: { status: number; data: unknown }) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type PendingStream = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  enc: TextEncoder;
  closed: boolean;
};

type BridgeAttachment = {
  version?: string;
  connectedAt?: number;
};

export class BridgeRelayDO extends DurableObject<Cloudflare.Env> {
  private pendingRpc = new Map<string, PendingRpc>();
  private pendingStreams = new Map<string, PendingStream>();

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  private getActiveBridgeSocket(): WebSocket | null {
    const sockets = this.ctx.getWebSockets('bridge');
    for (let i = sockets.length - 1; i >= 0; i--) {
      if (sockets[i].readyState === WebSocket.OPEN) {
        return sockets[i];
      }
    }
    return sockets[0] ?? null;
  }

  private failAllPending(reason: string): void {
    for (const [id, item] of this.pendingRpc.entries()) {
      clearTimeout(item.timer);
      item.reject(new Error(reason));
      this.pendingRpc.delete(id);
    }
    for (const [id, stream] of this.pendingStreams.entries()) {
      if (!stream.closed) {
        stream.closed = true;
        void stream.writer
          .write(stream.enc.encode(JSON.stringify({ t: 'error', code: 'bridge_disconnected', message: reason }) + '\n'))
          .catch(() => {})
          .finally(() => {
            void stream.writer.close().catch(() => {});
          });
      }
      this.pendingStreams.delete(id);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/bridge-ws') {
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      for (const old of this.ctx.getWebSockets('bridge')) {
        try {
          old.close(1000, 'replaced');
        } catch {}
      }
      this.failAllPending('电脑端桥接已重新连接');

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, ['bridge']);
      server.serializeAttachment({
        version: url.searchParams.get('v') || '',
        connectedAt: Date.now(),
      } satisfies BridgeAttachment);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (pathname === '/status') {
      const ws = this.getActiveBridgeSocket();
      if (!ws) {
        return Response.json({ ok: true, connected: false });
      }
      let att: BridgeAttachment | null = null;
      try {
        att = ws.deserializeAttachment() as BridgeAttachment | null;
      } catch {
        att = null;
      }
      return Response.json({
        ok: true,
        connected: true,
        version: att?.version || '',
        connectedAt: att?.connectedAt || 0,
      });
    }

    if (pathname === '/rpc' && request.method === 'POST') {
      const ws = this.getActiveBridgeSocket();
      if (!ws) {
        return Response.json({ error: 'bridge_offline', message: '电脑端桥接未在线' }, { status: 503 });
      }
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json({ error: 'bad_request', message: '无效请求' }, { status: 400 });
      }
      const id = crypto.randomUUID();
      try {
        const result = await new Promise<{ status: number; data: unknown }>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pendingRpc.delete(id);
            reject(new Error('电脑端桥接响应超时'));
          }, 25_000);
          this.pendingRpc.set(id, { resolve, reject, timer });
          try {
            ws.send(JSON.stringify({ id, ...body }));
          } catch (err) {
            clearTimeout(timer);
            this.pendingRpc.delete(id);
            reject(err instanceof Error ? err : new Error('发送命令到桥接失败'));
          }
        });
        return Response.json(result.data, { status: result.status || 200 });
      } catch (err) {
        return Response.json(
          { error: 'bridge_rpc_error', message: err instanceof Error ? err.message : '桥接调用失败' },
          { status: 502 },
        );
      }
    }

    if (pathname === '/stream' && request.method === 'POST') {
      const ws = this.getActiveBridgeSocket();
      if (!ws) {
        return Response.json({ error: 'bridge_offline', message: '电脑端桥接未在线' }, { status: 503 });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'bad_request', message: '无效请求' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const entry: PendingStream = {
        writer,
        enc: new TextEncoder(),
        closed: false,
      };
      this.pendingStreams.set(id, entry);

      const onAbort = () => {
        if (entry.closed) return;
        entry.closed = true;
        this.pendingStreams.delete(id);
        try {
          ws.send(JSON.stringify({ id, op: 'abort' }));
        } catch {}
        void writer.close().catch(() => {});
      };
      request.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        ws.send(JSON.stringify({ id, op: 'stream', payload: body }));
      } catch (err) {
        this.pendingStreams.delete(id);
        entry.closed = true;
        void writer.close().catch(() => {});
        return Response.json(
          { error: 'bridge_offline', message: err instanceof Error ? err.message : '电脑端桥接已断开' },
          { status: 503 },
        );
      }

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(message) as Record<string, unknown>;
    } catch {
      return;
    }
    const id = typeof msg.id === 'string' ? msg.id : '';
    if (!id) return;

    if (msg.t === 'result') {
      const pending = this.pendingRpc.get(id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingRpc.delete(id);
      pending.resolve({
        status: typeof msg.status === 'number' ? msg.status : 200,
        data: msg.data ?? {},
      });
      return;
    }

    const stream = this.pendingStreams.get(id);
    if (!stream || stream.closed) return;

    if (msg.t === 'ndjson') {
      try {
        await stream.writer.write(stream.enc.encode(JSON.stringify(msg.event) + '\n'));
      } catch {
        stream.closed = true;
        this.pendingStreams.delete(id);
        try {
          ws.send(JSON.stringify({ id, op: 'abort' }));
        } catch {}
      }
      return;
    }

    if (msg.t === 'stream_end') {
      stream.closed = true;
      this.pendingStreams.delete(id);
      await stream.writer.close().catch(() => {});
      return;
    }

    if (msg.t === 'stream_error') {
      stream.closed = true;
      this.pendingStreams.delete(id);
      const errLine = JSON.stringify({
        t: 'error',
        code: typeof msg.code === 'string' ? msg.code : 'upstream_error',
        message: typeof msg.message === 'string' ? msg.message : '桥接执行失败',
      });
      await stream.writer.write(stream.enc.encode(errLine + '\n')).catch(() => {});
      await stream.writer.close().catch(() => {});
    }
  }

  async webSocketClose(): Promise<void> {
    this.failAllPending('电脑端桥接连接中断');
  }

  async webSocketError(): Promise<void> {
    this.failAllPending('电脑端桥接连接异常');
  }
}
