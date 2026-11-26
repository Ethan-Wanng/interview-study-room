import handler from 'vinext/server/fetch-handler';
export { BridgeRelayDO } from './bridge-relay-do';

const SESSION_COOKIE = '__Host-study-session';
const RELAY_SECRET_RE = /^rly_[a-f0-9]{64}$/;
const GUEST_CODE_RE = /^[A-Z0-9]{6}$/;
const PROVIDERS = new Set(['antigravity', 'codex', 'workbuddy']);

const BRIDGE_ASSETS: Record<string, string> = {
  'win-x64': 'InterviewStudyBridge-win-x64.exe',
  'darwin-arm64': 'InterviewStudyBridge-darwin-arm64',
  'darwin-x64': 'InterviewStudyBridge-darwin-x64',
  'linux-x64': 'InterviewStudyBridge-linux-x64',
};

const CODEX_ASSETS: Record<string, string> = {
  'win-x64': 'codex-x86_64-pc-windows-msvc.exe',
  'win-arm64': 'codex-aarch64-pc-windows-msvc.exe',
  'darwin-arm64': 'codex-aarch64-apple-darwin.tar.gz',
  'darwin-x64': 'codex-x86_64-apple-darwin.tar.gz',
  'linux-x64': 'codex-x86_64-unknown-linux-musl.tar.gz',
  'linux-arm64': 'codex-aarch64-unknown-linux-musl.tar.gz',
};

const AGY_PLATFORMS = new Set([
  'windows_amd64',
  'windows_arm64',
  'darwin_arm64',
  'darwin_amd64',
  'linux_amd64',
  'linux_arm64',
]);

async function resolveDownloadSource(
  tool: string,
  os: string,
): Promise<{ url: string; filename: string; sha512?: string; version?: string } | { status: number; error: string; message: string }> {
  if (tool === 'bridge') {
    const assetName = BRIDGE_ASSETS[os];
    if (!assetName) {
      return { status: 400, error: 'invalid_os', message: '不支持的系统架构' };
    }
    return {
      url: `https://github.com/Ethan-Wanng/interview-study-room/releases/latest/download/${assetName}`,
      filename: assetName,
    };
  }

  if (tool === 'codex') {
    const assetName = CODEX_ASSETS[os];
    if (!assetName) {
      return { status: 400, error: 'invalid_os', message: '不支持的系统架构' };
    }
    const relRes = await fetch('https://api.github.com/repos/openai/codex/releases/latest', {
      headers: { 'User-Agent': 'interview-study-room', Accept: 'application/vnd.github+json' },
    });
    if (!relRes.ok) {
      return { status: 502, error: 'upstream_error', message: `获取 Codex 版本失败 (${relRes.status})` };
    }
    const rel = (await relRes.json()) as {
      tag_name?: string;
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };
    const asset = rel.assets?.find(a => a.name === assetName);
    const dlUrl = asset?.browser_download_url || '';
    if (!dlUrl.startsWith('https://github.com/openai/codex/releases/download/')) {
      return { status: 404, error: 'asset_not_found', message: '未找到匹配的 Codex 安装包' };
    }
    return {
      url: dlUrl,
      filename: assetName,
      ...(rel.tag_name ? { version: rel.tag_name } : {}),
    };
  }

  if (tool === 'agy') {
    if (!AGY_PLATFORMS.has(os)) {
      return { status: 400, error: 'invalid_os', message: '不支持的系统架构' };
    }
    const mfRes = await fetch(`https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/${os}.json`);
    if (!mfRes.ok) {
      return { status: 502, error: 'upstream_error', message: `获取 Antigravity 清单失败 (${mfRes.status})` };
    }
    const mf = (await mfRes.json()) as { url?: string; sha512?: string; version?: string };
    const dlUrl = typeof mf.url === 'string' ? mf.url : '';
    if (
      !dlUrl.startsWith('https://storage.googleapis.com/antigravity-public/') &&
      !dlUrl.startsWith('https://antigravity.google/')
    ) {
      return { status: 502, error: 'invalid_manifest', message: '无效的官方下载地址' };
    }
    return {
      url: dlUrl,
      filename: os.startsWith('windows_') ? 'agy.exe' : 'agy',
      ...(mf.sha512 ? { sha512: mf.sha512 } : {}),
      ...(mf.version ? { version: mf.version } : {}),
    };
  }

  return { status: 400, error: 'invalid_tool', message: '未知下载目标' };
}

async function handleBridgeDownload(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/bridge-download') return null;

  const isHead = request.method === 'HEAD';
  if (request.method !== 'GET' && !isHead) {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const tool = (url.searchParams.get('tool') || 'bridge').trim().toLowerCase();
  const os = (url.searchParams.get('os') || 'win-x64').trim();

  try {
    const src = await resolveDownloadSource(tool, os);
    if ('error' in src) {
      return Response.json({ error: src.error, message: src.message }, { status: src.status });
    }

    const reqHeaders = new Headers({
      'Accept-Encoding': 'identity',
      'User-Agent': 'interview-study-room',
    });
    const range = request.headers.get('range');
    if (range) reqHeaders.set('Range', range);
    const ifRange = request.headers.get('if-range');
    if (ifRange) reqHeaders.set('If-Range', ifRange);

    const fetchInit: RequestInit & { cf?: Record<string, unknown> } = {
      method: isHead ? 'HEAD' : 'GET',
      headers: reqHeaders,
      redirect: 'follow',
      ...(!isHead && !range ? { cf: { cacheEverything: true, cacheTtl: 1800 } } : {}),
    };

    const upstream = await fetch(src.url, fetchInit);
    if (upstream.status === 404) {
      return Response.json({ error: 'release_not_ready', message: '安装包正在构建中' }, { status: 404 });
    }
    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ error: 'upstream_error', message: `下载源返回 ${upstream.status}` }, { status: 502 });
    }

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${src.filename}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=600',
      'X-Asset-Filename': src.filename,
      ...(src.sha512 ? { 'X-Asset-Sha512': src.sha512 } : {}),
      ...(src.version ? { 'X-Asset-Version': src.version } : {}),
    });

    for (const key of ['content-length', 'content-range', 'etag', 'last-modified']) {
      const val = upstream.headers.get(key);
      if (val) headers.set(key, val);
    }

    return new Response(isHead ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json({ error: 'upstream_timeout', message: '下载连接异常，请重试' }, { status: 504 });
  }
}

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
    const dlRes = await handleBridgeDownload(request);
    if (dlRes) return dlRes;
    const relayRes = await handleRelayRoute(request, env);
    if (relayRes) return relayRes;
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
