import { BRIDGE_VERSION } from './config.js';
import { BridgeError, type LocalProviderId, type StreamTurnMessage } from './drivers/types.js';
import type { DriverProcessPool } from './process-pool.js';

const VALID_ROLES = new Set(['user', 'assistant']);

export function parseStreamMessages(raw: unknown): StreamTurnMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null;
  const out: StreamTurnMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    if (typeof o.role !== 'string' || !VALID_ROLES.has(o.role)) return null;
    const content = typeof o.content === 'string' ? o.content : '';
    const images = Array.isArray(o.images) ? o.images.filter((u): u is string => typeof u === 'string') : undefined;
    if (!content && (!images || !images.length)) return null;
    out.push({
      role: o.role as StreamTurnMessage['role'],
      content,
      ...(images?.length ? { images } : {}),
    });
  }
  return out;
}

export type RelayStatus = {
  configured: boolean;
  connected: boolean;
  relayUrl?: string;
  roomKey?: string;
  lastError?: string;
};

export type RelayConnectOpts = {
  relayUrl: string;
  relaySecret: string;
  roomKey?: string;
};

export class BridgeRelayClient {
  private ws: WebSocket | null = null;
  private cfg: RelayConnectOpts | null = null;
  private stopped = true;
  private connected = false;
  private lastError = '';
  private backoffMs = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private activeStreams = new Map<string, AbortController>();

  constructor(private readonly pool: DriverProcessPool) {}

  getStatus(): RelayStatus {
    return {
      configured: Boolean(this.cfg?.relayUrl && this.cfg?.relaySecret),
      connected: this.connected,
      ...(this.cfg?.relayUrl ? { relayUrl: this.cfg.relayUrl } : {}),
      ...(this.cfg?.roomKey ? { roomKey: this.cfg.roomKey } : {}),
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  connect(opts: RelayConnectOpts): void {
    this.disconnect();
    this.cfg = { ...opts };
    this.stopped = false;
    this.lastError = '';
    this.backoffMs = 2000;
    this.openSocket();
  }

  disconnect(): void {
    this.stopped = true;
    this.cfg = null;
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.abortAllStreams();
    if (this.ws) {
      try {
        this.ws.close(1000, 'disconnect');
      } catch {}
      this.ws = null;
    }
  }

  private abortAllStreams(): void {
    for (const ctl of this.activeStreams.values()) {
      ctl.abort();
    }
    this.activeStreams.clear();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat(ws: WebSocket): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send('ping');
      } catch {}
    }, 25_000);
    if (typeof (this.heartbeatTimer as { unref?: () => void }).unref === 'function') {
      (this.heartbeatTimer as { unref: () => void }).unref();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || !this.cfg) return;
    if (this.reconnectTimer) return;
    const wait = this.backoffMs;
    this.backoffMs = Math.min(30_000, Math.round(this.backoffMs * 1.8));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopped && this.cfg) {
        this.openSocket();
      }
    }, wait);
    if (typeof (this.reconnectTimer as { unref?: () => void }).unref === 'function') {
      (this.reconnectTimer as { unref: () => void }).unref();
    }
  }

  private openSocket(): void {
    if (this.stopped || !this.cfg) return;
    const u = new URL(this.cfg.relayUrl);
    u.searchParams.set('secret', this.cfg.relaySecret);
    u.searchParams.set('v', BRIDGE_VERSION);

    let ws: WebSocket;
    try {
      ws = new WebSocket(u.toString());
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'WebSocket 创建失败';
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;
      this.connected = true;
      this.lastError = '';
      this.backoffMs = 2000;
      this.startHeartbeat(ws);
    });

    ws.addEventListener('message', event => {
      if (this.ws !== ws) return;
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw || raw === 'pong') return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }
      void this.handleCommand(ws, msg);
    });

    ws.addEventListener('close', event => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connected = false;
      this.stopHeartbeat();
      this.abortAllStreams();
      if (event.code === 4001 || event.code === 4401) {
        this.lastError = '云端中继配对密钥无效';
        this.stopped = true;
        return;
      }
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      if (this.ws !== ws) return;
      this.lastError = '云端中继连接失败';
    });
  }

  private sendJson(ws: WebSocket, payload: unknown): void {
    if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }

  private async handleCommand(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
    const id = typeof msg.id === 'string' ? msg.id : '';
    const op = typeof msg.op === 'string' ? msg.op : '';
    if (!id || !op) return;

    if (op === 'abort') {
      const ctl = this.activeStreams.get(id);
      if (ctl) {
        ctl.abort();
        this.activeStreams.delete(id);
      }
      return;
    }

    if (op === 'providers') {
      try {
        const providers = await this.pool.detectAll();
        this.sendJson(ws, { id, t: 'result', status: 200, data: { providers } });
      } catch (err) {
        this.sendJson(ws, {
          id,
          t: 'result',
          status: 500,
          data: { error: 'upstream_error', message: err instanceof Error ? err.message : '探测失败' },
        });
      }
      return;
    }

    if (op === 'refresh') {
      const pid = typeof msg.provider === 'string' ? msg.provider.trim().toLowerCase() : '';
      if (!this.pool.hasProvider(pid)) {
        this.sendJson(ws, { id, t: 'result', status: 404, data: { error: 'not_found', message: `未知客户端：${pid}` } });
        return;
      }
      try {
        const provider = await this.pool.refreshProvider(pid as LocalProviderId);
        this.sendJson(ws, { id, t: 'result', status: 200, data: provider });
      } catch (err) {
        this.sendJson(ws, {
          id,
          t: 'result',
          status: 500,
          data: { error: 'upstream_error', message: err instanceof Error ? err.message : '刷新失败' },
        });
      }
      return;
    }

    if (op === 'stream') {
      const o = msg.payload && typeof msg.payload === 'object' ? (msg.payload as Record<string, unknown>) : {};
      const providerRaw = typeof o.provider === 'string' ? o.provider.trim().toLowerCase() : '';
      if (!this.pool.hasProvider(providerRaw)) {
        this.sendJson(ws, { id, t: 'stream_error', code: 'bad_request', message: `不支持的客户端：${providerRaw || '(空)'}` });
        return;
      }
      const system = typeof o.system === 'string' ? o.system : '';
      const messages = parseStreamMessages(o.messages);
      if (!messages) {
        this.sendJson(ws, { id, t: 'stream_error', code: 'bad_request', message: 'messages 参数无效' });
        return;
      }
      const model = typeof o.model === 'string' ? o.model.trim() : undefined;
      const thinkingLevel = typeof o.thinkingLevel === 'string' ? o.thinkingLevel.trim() : undefined;
      const jsonMode = o.jsonMode === true;
      const allowWebSearch = o.allowWebSearch === true;

      const ctl = new AbortController();
      this.activeStreams.set(id, ctl);
      let finalModel = `local:${providerRaw}/${model || 'default'}`;

      this.sendJson(ws, { id, t: 'ndjson', event: { t: 'start' } });

      try {
        await this.pool.streamTurn(providerRaw as LocalProviderId, {
          model,
          system,
          messages,
          thinkingLevel,
          jsonMode,
          allowWebSearch,
          signal: ctl.signal,
          onModel: modelBadge => {
            finalModel = modelBadge;
            this.sendJson(ws, { id, t: 'ndjson', event: { t: 'model', model: modelBadge } });
          },
          onThink: text => {
            if (text) this.sendJson(ws, { id, t: 'ndjson', event: { t: 'think', text } });
          },
          onDelta: text => {
            if (text) this.sendJson(ws, { id, t: 'ndjson', event: { t: 'delta', text } });
          },
        });
        if (!ctl.signal.aborted) {
          this.sendJson(ws, { id, t: 'ndjson', event: { t: 'done', model: finalModel } });
        }
      } catch (err) {
        if (!ctl.signal.aborted) {
          const code = err instanceof BridgeError ? err.code : 'upstream_error';
          const message = err instanceof Error && err.message ? err.message : '本地客户端调用失败';
          this.sendJson(ws, { id, t: 'ndjson', event: { t: 'error', code, message } });
        }
      } finally {
        this.activeStreams.delete(id);
        this.sendJson(ws, { id, t: 'stream_end' });
      }
    }
  }
}
