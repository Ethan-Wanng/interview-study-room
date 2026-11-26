import handler from 'vinext/server/fetch-handler';
export { BridgeRelayDO } from './bridge-relay-do';

const SESSION_COOKIE = '__Host-study-session';
const RELAY_SECRET_RE = /^rly_[a-f0-9]{64}$/;
const GUEST_CODE_RE = /^[A-Z0-9]{6}$/;
const PROVIDERS = new Set(['antigravity', 'codex', 'workbuddy']);

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function sessionTokenFrom(headers: Headers): string | null {
  const value = headers
    .get('cookie')
    ?.split(';')
    .map(x => x.trim())
    .find(x => x.startsWith(SESSION_COOKIE + '='))
    ?.slice(SESSION_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

async function resolveSessionUser(
  request: Request,
  db: D1Database | undefined,
): Promise<{ id: string; is_guest: number } | null> {
  if (!db) return null;
  const token = sessionTokenFrom(request.headers);
  if (!token) return null;
  try {
    const row = await db
      .prepare(
        'SELECT accounts.id, accounts.is_guest FROM sessions JOIN accounts ON accounts.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?',
      )
      .bind(await sha256Hex(token), Date.now())
      .first<{ id: string; is_guest: number }>();
    return row ?? null;
  } catch {
    return null;
  }
}

function assertSameOriginLight(request: Request): Response | null {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ error: 'forbidden', message: '请求来源无效' }, { status: 403 });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'forbidden', message: '请求来源无效' }, { status: 403 });
  }
  return null;
}

async function resolveRoomForBrowser(
  request: Request,
  env: Cloudflare.Env,
): Promise<{ roomKey: string; mode: 'account' | 'guest'; guestCode?: string } | null> {
  const rawCode = request.headers.get('x-relay-code')?.trim().toUpperCase() || '';
  if (rawCode && GUEST_CODE_RE.test(rawCode) && env.DB) {
    try {
      const row = await env.DB
        .prepare('SELECT room_key FROM bridge_relay_links WHERE guest_code = ?')
        .bind(rawCode)
        .first<{ room_key: string }>();
      if (row?.room_key) {
        return { roomKey: row.room_key, mode: 'guest', guestCode: rawCode };
      }
    } catch {}
    return null;
  }

  const user = await resolveSessionUser(request, env.DB);
  if (user && !user.is_guest) {
    return { roomKey: `user:${user.id}`, mode: 'account' };
  }
  return null;
}

async function handleRelayRoute(request: Request, env: Cloudflare.Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith('/api/bridge-relay/') || pathname === '/api/bridge-relay/link') {
    return null;
  }

  if (!env.BRIDGE_RELAY || !env.DB) {
    return Response.json({ error: 'relay_unavailable', message: '云端中继未启用' }, { status: 503 });
  }

  if (pathname === '/api/bridge-relay/ws' && request.method === 'GET') {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const secret = url.searchParams.get('secret')?.trim() || '';
    if (!RELAY_SECRET_RE.test(secret)) {
      return new Response('Invalid relay secret', { status: 401 });
    }
    const row = await env.DB
      .prepare('SELECT room_key FROM bridge_relay_links WHERE secret_hash = ?')
      .bind(await sha256Hex(secret))
      .first<{ room_key: string }>();
    if (!row?.room_key) {
      return new Response('Unknown relay secret', { status: 401 });
    }
    const stub = env.BRIDGE_RELAY.get(env.BRIDGE_RELAY.idFromName(row.room_key));
    const version = url.searchParams.get('v') || '';
    return stub.fetch(
      new Request(`https://relay.internal/bridge-ws?v=${encodeURIComponent(version)}`, {
        headers: request.headers,
      }),
    );
  }

  if (pathname === '/api/bridge-relay/status' && request.method === 'GET') {
    const resolved = await resolveRoomForBrowser(request, env);
    if (!resolved) {
      return Response.json({ ok: true, connected: false, authenticated: false });
    }
    const stub = env.BRIDGE_RELAY.get(env.BRIDGE_RELAY.idFromName(resolved.roomKey));
    const res = await stub.fetch('https://relay.internal/status');
    const data = (await res.json()) as { ok?: boolean; connected?: boolean; version?: string; connectedAt?: number };
    return Response.json({
      ok: true,
      connected: Boolean(data.connected),
      version: data.version || '',
      connectedAt: data.connectedAt || 0,
      authenticated: true,
      mode: resolved.mode,
      roomKey: resolved.roomKey,
      ...(resolved.guestCode ? { guestCode: resolved.guestCode } : {}),
    });
  }

  if (pathname === '/api/bridge-relay/providers' && request.method === 'GET') {
    const resolved = await resolveRoomForBrowser(request, env);
    if (!resolved) {
      return Response.json({ error: 'unauthorized', message: '请先登录或输入 6 位连接码' }, { status: 401 });
    }
    const stub = env.BRIDGE_RELAY.get(env.BRIDGE_RELAY.idFromName(resolved.roomKey));
    return stub.fetch(
      new Request('https://relay.internal/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'providers' }),
      }),
    );
  }

  const refreshMatch = request.method === 'POST' ? pathname.match(/^\/api\/bridge-relay\/providers\/([a-z0-9_-]+)\/refresh$/i) : null;
  if (refreshMatch) {
    const originErr = assertSameOriginLight(request);
    if (originErr) return originErr;
    const resolved = await resolveRoomForBrowser(request, env);
    if (!resolved) {
      return Response.json({ error: 'unauthorized', message: '请先登录或输入 6 位连接码' }, { status: 401 });
    }
    const id = refreshMatch[1].toLowerCase();
    if (!PROVIDERS.has(id)) {
      return Response.json({ error: 'bad_request', message: `未知客户端：${id}` }, { status: 400 });
    }
    const stub = env.BRIDGE_RELAY.get(env.BRIDGE_RELAY.idFromName(resolved.roomKey));
    return stub.fetch(
      new Request('https://relay.internal/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'refresh', provider: id }),
      }),
    );
  }

  if (pathname === '/api/bridge-relay/stream' && request.method === 'POST') {
    const originErr = assertSameOriginLight(request);
    if (originErr) return originErr;
    const resolved = await resolveRoomForBrowser(request, env);
    if (!resolved) {
      return Response.json({ error: 'unauthorized', message: '请先登录或输入 6 位连接码' }, { status: 401 });
    }
    const stub = env.BRIDGE_RELAY.get(env.BRIDGE_RELAY.idFromName(resolved.roomKey));
    const bodyText = await request.text();
    return stub.fetch(
      new Request('https://relay.internal/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyText,
        signal: request.signal,
      }),
    );
  }

  return Response.json({ error: 'not_found', message: '接口不存在' }, { status: 404 });
}

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const relayRes = await handleRelayRoute(request, env);
    if (relayRes) return relayRes;
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
