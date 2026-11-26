import http from 'node:http';
import {
  BRIDGE_NAME,
  BRIDGE_VERSION,
  isAllowedHostHeader,
  isAllowedOrigin,
  isLoopbackHostHeader,
  normalizeAllowedHost,
  updateBridgeRelayConfig,
  verifyBearerToken,
} from './config.js';
import { BridgeError, type LocalProviderId } from './drivers/types.js';
import { DriverProcessPool } from './process-pool.js';
import { BridgeRelayClient, parseStreamMessages } from './relay-client.js';
import { installProviderTool, launchProviderLogin } from './tool-installer.js';

export type BridgeServerOptions = {
  port: number;
  token: string;
  allowOrigins?: string[];
  allowHosts?: string[];
  pool?: DriverProcessPool;
  relayClient?: BridgeRelayClient;
  configDir?: string;
};

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function writeJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown,
  corsHeaders: Record<string, string>,
): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders,
  });
  res.end(body);
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        aborted = true;
        reject(new BridgeError('bad_request', '请求体超过限制'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(text.trim() ? JSON.parse(text) : {});
      } catch {
        reject(new BridgeError('bad_request', '请求体必须是合法 JSON'));
      }
    });

    req.on('error', err => {
      if (!aborted) reject(err);
    });
  });
}

export async function startBridgeServer(opts: BridgeServerOptions): Promise<{
  server: http.Server;
  port: number;
  url: string;
  pool: DriverProcessPool;
  relayClient: BridgeRelayClient;
  allowHost: (hostOrUrl: string) => void;
  close: () => Promise<void>;
}> {
  const pool = opts.pool ?? new DriverProcessPool();
  const relayClient = opts.relayClient ?? new BridgeRelayClient(pool);
  let actualPort = opts.port;
  const extraHosts = new Set<string>();
  for (const item of opts.allowHosts ?? []) {
    const norm = normalizeAllowedHost(item);
    if (norm) extraHosts.add(norm);
  }
  const allowHost = (hostOrUrl: string) => {
    const norm = normalizeAllowedHost(hostOrUrl);
    if (norm) extraHosts.add(norm);
  };

  const server = http.createServer(async (req, res) => {
    const reqMethod = (req.method || 'GET').toUpperCase();
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0] || '/';

    // 1. Strict Host header validation (DNS rebinding protection)
    if (!isAllowedHostHeader(req.headers.host, actualPort, extraHosts)) {
      writeJson(res, 403, { error: 'forbidden_host', message: '不允许的 Host 头' }, {});
      return;
    }

    // 2. Strict Origin allowlist + Chrome Private Network Access (PNA) headers (never output '*')
    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
    const corsHeaders: Record<string, string> = {};
    if (originHeader) {
      if (!isAllowedOrigin(originHeader, opts.allowOrigins)) {
        writeJson(res, 403, { error: 'forbidden_origin', message: '未授权的来源域名' }, {});
        return;
      }
      corsHeaders['Access-Control-Allow-Origin'] = originHeader;
      corsHeaders['Vary'] = 'Origin';
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      if (String(req.headers['access-control-request-private-network'] || '').toLowerCase() === 'true') {
        corsHeaders['Access-Control-Allow-Private-Network'] = 'true';
      }
    }

    // 3. Preflight OPTIONS
    if (reqMethod === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // 4. Public health endpoint (must not expose secrets or client environment)
    if (reqMethod === 'GET' && pathname === '/v1/ping') {
      writeJson(
        res,
        200,
        { ok: true, name: BRIDGE_NAME, version: BRIDGE_VERSION },
        corsHeaders,
      );
      return;
    }

    // 5. Constant-time Bearer token authentication for all remaining routes
    if (!verifyBearerToken(req.headers.authorization, opts.token)) {
      writeJson(res, 401, { error: 'unauthorized', message: '配对码无效' }, corsHeaders);
      return;
    }

    if (reqMethod === 'GET' && pathname === '/v1/providers') {
      const providers = await pool.detectAll();
      writeJson(res, 200, { providers }, corsHeaders);
      return;
    }

    const refreshMatch = reqMethod === 'POST' ? pathname.match(/^\/v1\/providers\/([a-z0-9_-]+)\/refresh$/i) : null;
    if (refreshMatch) {
      const id = refreshMatch[1].toLowerCase();
      if (!pool.hasProvider(id)) {
        writeJson(res, 404, { error: 'not_found', message: `未知客户端：${id}` }, corsHeaders);
        return;
      }
      const provider = await pool.refreshProvider(id);
      writeJson(res, 200, provider, corsHeaders);
      return;
    }

    // 6. Loopback-only management routes (/v1/relay/*, /v1/tools/*)
    if (pathname.startsWith('/v1/relay/') || pathname.startsWith('/v1/tools/')) {
      if (!isLoopbackHostHeader(req.headers.host, actualPort)) {
        writeJson(res, 403, { error: 'forbidden_host', message: '管理接口仅限本机访问' }, corsHeaders);
        return;
      }

      if (reqMethod === 'GET' && pathname === '/v1/relay/status') {
        writeJson(res, 200, relayClient.getStatus(), corsHeaders);
        return;
      }

      if (reqMethod === 'POST' && pathname === '/v1/relay/connect') {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const relayUrl = typeof body.relayUrl === 'string' ? body.relayUrl.trim() : '';
          const relaySecret = typeof body.relaySecret === 'string' ? body.relaySecret.trim() : '';
          const roomKey = typeof body.roomKey === 'string' ? body.roomKey.trim() : undefined;
          const { config } = updateBridgeRelayConfig(
            { relayUrl, relaySecret, ...(roomKey ? { roomKey } : {}) },
            { configDir: opts.configDir },
          );
          if (config.relayUrl && config.relaySecret) {
            relayClient.connect({
              relayUrl: config.relayUrl,
              relaySecret: config.relaySecret,
              ...(config.relayRoomKey ? { roomKey: config.relayRoomKey } : {}),
            });
          }
          writeJson(res, 200, { ok: true, status: relayClient.getStatus() }, corsHeaders);
        } catch (err) {
          writeJson(
            res,
            400,
            { error: 'bad_request', message: err instanceof Error ? err.message : '连接云端中继失败' },
            corsHeaders,
          );
        }
        return;
      }

      if (reqMethod === 'POST' && pathname === '/v1/relay/disconnect') {
        updateBridgeRelayConfig(null, { configDir: opts.configDir });
        relayClient.disconnect();
        writeJson(res, 200, { ok: true, status: relayClient.getStatus() }, corsHeaders);
        return;
      }

      if (reqMethod === 'POST' && pathname === '/v1/tools/install') {
        let body: Record<string, unknown>;
        try {
          body = (await readJsonBody(req)) as Record<string, unknown>;
        } catch (err) {
          writeJson(res, 400, { error: 'bad_request', message: err instanceof Error ? err.message : '请求无效' }, corsHeaders);
          return;
        }
        const providerRaw = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
        if (!pool.hasProvider(providerRaw)) {
          writeJson(res, 400, { error: 'bad_request', message: `不支持的客户端：${providerRaw || '(空)'}` }, corsHeaders);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Accel-Buffering': 'no',
          ...corsHeaders,
        });
        const ctl = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) ctl.abort();
        });
        const send = (ev: Record<string, unknown>) => {
          if (!res.writableEnded) {
            try {
              res.write(JSON.stringify(ev) + '\n');
            } catch {}
          }
        };
        try {
          await installProviderTool(
            providerRaw as LocalProviderId,
            ev => send({ t: 'progress', stage: ev.stage, pct: ev.pct }),
            {
              configDir: opts.configDir,
              signal: ctl.signal,
              ...(originHeader ? { siteOrigin: originHeader } : {}),
            },
          );
          const refreshed = await pool.refreshProvider(providerRaw as LocalProviderId);
          send({ t: 'done', provider: refreshed });
        } catch (err) {
          send({ t: 'error', message: err instanceof Error ? err.message : '安装失败' });
        } finally {
          if (!res.writableEnded) res.end();
        }
        return;
      }

      if (reqMethod === 'POST' && pathname === '/v1/tools/login') {
        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const providerRaw = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
          if (!pool.hasProvider(providerRaw)) {
            writeJson(res, 400, { error: 'bad_request', message: `不支持的客户端：${providerRaw || '(空)'}` }, corsHeaders);
            return;
          }
          const result = await launchProviderLogin(providerRaw as LocalProviderId, { configDir: opts.configDir });
          writeJson(res, 200, { ok: true, ...result }, corsHeaders);
        } catch (err) {
          const status = err instanceof BridgeError && err.code === 'missing_binary' ? 404 : 400;
          writeJson(res, status, { error: 'login_error', message: err instanceof Error ? err.message : '启动登录失败' }, corsHeaders);
        }
        return;
      }

      writeJson(res, 404, { error: 'not_found', message: '接口不存在' }, corsHeaders);
      return;
    }

    if (reqMethod === 'POST' && pathname === '/v1/stream') {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        writeJson(
          res,
          400,
          { error: 'bad_request', message: err instanceof Error ? err.message : '请求无效' },
          corsHeaders,
        );
        return;
      }

      const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      const providerRaw = typeof o.provider === 'string' ? o.provider.trim().toLowerCase() : '';
      if (!pool.hasProvider(providerRaw)) {
        writeJson(res, 400, { error: 'bad_request', message: `不支持的客户端：${providerRaw || '(空)'}` }, corsHeaders);
        return;
      }
      const system = typeof o.system === 'string' ? o.system : '';
      const messages = parseStreamMessages(o.messages);
      if (!messages) {
        writeJson(res, 400, { error: 'bad_request', message: 'messages 参数无效' }, corsHeaders);
        return;
      }
      const model = typeof o.model === 'string' ? o.model.trim() : undefined;
      const thinkingLevel = typeof o.thinkingLevel === 'string' ? o.thinkingLevel.trim() : undefined;
      const jsonMode = o.jsonMode === true;
      const allowWebSearch = o.allowWebSearch === true;

      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
        ...corsHeaders,
      });

      let closed = false;
      const sendEvent = (ev: Record<string, unknown>) => {
        if (closed || res.writableEnded) return;
        try {
          res.write(JSON.stringify(ev) + '\n');
        } catch {
          closed = true;
        }
      };

      const ctl = new AbortController();
      const onClose = () => {
        if (!res.writableEnded) {
          closed = true;
          ctl.abort();
        }
      };
      res.on('close', onClose);

      let finalModel = `local:${providerRaw}/${model || 'default'}`;
      sendEvent({ t: 'start' });

      try {
        await pool.streamTurn(providerRaw, {
          model,
          system,
          messages,
          thinkingLevel,
          jsonMode,
          allowWebSearch,
          signal: ctl.signal,
          onModel: modelBadge => {
            finalModel = modelBadge;
            sendEvent({ t: 'model', model: modelBadge });
          },
          onThink: text => {
            if (text) sendEvent({ t: 'think', text });
          },
          onDelta: text => {
            if (text) sendEvent({ t: 'delta', text });
          },
        });
        if (!ctl.signal.aborted && !closed) {
          sendEvent({ t: 'done', model: finalModel });
        }
      } catch (err) {
        if (!ctl.signal.aborted && !closed) {
          const code = err instanceof BridgeError ? err.code : 'upstream_error';
          const message = err instanceof Error && err.message ? err.message : '本地客户端调用失败';
          sendEvent({ t: 'error', code, message });
        }
      } finally {
        res.off('close', onClose);
        if (!closed && !res.writableEnded) {
          res.end();
        }
      }
      return;
    }

    writeJson(res, 404, { error: 'not_found', message: '接口不存在' }, corsHeaders);
  });

  await new Promise<void>((resolve, reject) => {
    const onErr = (err: Error) => reject(err);
    server.once('error', onErr);
    server.listen(opts.port, '127.0.0.1', () => {
      server.off('error', onErr);
      resolve();
    });
  });

  const addr = server.address();
  if (addr && typeof addr === 'object') {
    actualPort = addr.port;
  }

  const close = async () => {
    relayClient.disconnect();
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
    await pool.disposeAll();
  };

  return {
    server,
    port: actualPort,
    url: `http://127.0.0.1:${actualPort}`,
    pool,
    relayClient,
    allowHost,
    close,
  };
}
