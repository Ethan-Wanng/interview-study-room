import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import {
 fetchGeminiViaNode,
 fetchGeminiViaScheduledProxy,
 getScheduledProxyNodes,
 type ProxyNodeSpec,
} from '@/lib/gemini-worker-proxy';
import { readSiteGeminiQuotas } from '@/lib/gemini-rate-limit';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

export type ProxyCheckItem = {
 id: 'primary' | 'standby' | 'direct' | 'gemini4';
 host: string;
 protocol: string;
 ok: boolean;
 state: 'ok' | 'busy' | 'quota' | 'blocked' | 'error';
 status: number;
 ms: number;
 detail: string;
};

function isLocationBlocked(text: string): boolean {
 const low = text.toLowerCase();
 return (
  low.includes('location is not supported') ||
  low.includes('failed_precondition') ||
  low.includes('region not supported') ||
  low.includes('country is not supported')
 );
}

function classifyHttp(status: number, body: string): { ok: boolean; state: ProxyCheckItem['state']; detail: string } {
 if (isLocationBlocked(body)) return { ok: false, state: 'blocked', detail: 'location_blocked' };
 if (status === 200) return { ok: true, state: 'ok', detail: '200' };
 if (status === 429) return { ok: true, state: 'quota', detail: '429' };
 if (status === 503) return { ok: false, state: 'busy', detail: '503' };
 return { ok: false, state: 'error', detail: `HTTP ${status}` };
}

function compactErr(e: unknown): string {
 const msg = e instanceof Error ? e.message : String(e);
 if (/timeout|abort/i.test(msg)) return 'timeout';
 return msg.slice(0, 80);
}

const REGION_PROBE_PATH = '/v1beta/models/gemini-3.6-flash:generateContent';
const REGION_PROBE_BODY = JSON.stringify({
 contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
 generationConfig: { maxOutputTokens: 1 },
});

// Use GET /v1beta/models/gemini-4-hydrogen so network checks consume 0 Gemini 4 RPD/RPM quota.
const GEMINI4_PROBE_PATH = '/v1beta/models/gemini-4-hydrogen';

async function probeNode(
 id: 'primary' | 'standby',
 node: ProxyNodeSpec,
 key: string,
): Promise<ProxyCheckItem> {
 const t0 = Date.now();
 const ctl = new AbortController();
 const timer = setTimeout(() => ctl.abort(), 7500);
 try {
  const res = await fetchGeminiViaNode(node, REGION_PROBE_PATH, {
   method: 'POST',
   headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
   body: REGION_PROBE_BODY,
   signal: ctl.signal,
   connectTimeoutMs: 5500,
  });
  const body = (await res.text()).slice(0, 1024);
  const c = classifyHttp(res.status, body);
  return {
   id,
   host: node.host,
   protocol: node.kind,
   ok: c.ok,
   state: c.state,
   status: res.status,
   ms: Date.now() - t0,
   detail: c.detail,
  };
 } catch (e) {
  return {
   id,
   host: node.host,
   protocol: node.kind,
   ok: false,
   state: 'error',
   status: 0,
   ms: Date.now() - t0,
   detail: compactErr(e),
  };
 } finally {
  clearTimeout(timer);
 }
}

async function probeGateway(gatewayBase: string, key: string): Promise<ProxyCheckItem> {
 const t0 = Date.now();
 const ctl = new AbortController();
 const timer = setTimeout(() => ctl.abort(), 7500);
 let host = gatewayBase;
 try {
  host = new URL(gatewayBase).host;
 } catch {}
 try {
  const base = gatewayBase.replace(/\/+$/, '');
  const res = await fetch(`${base}${REGION_PROBE_PATH}`, {
   method: 'POST',
   headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
   body: REGION_PROBE_BODY,
   signal: ctl.signal,
  });
  const body = (await res.text()).slice(0, 1024);
  const modeHdr = res.headers.get('x-gemini-proxy-mode') || 'gateway';
  const c = classifyHttp(res.status, body);
  return {
   id: 'primary',
   host,
   protocol: modeHdr,
   ok: c.ok,
   state: c.state,
   status: res.status,
   ms: Date.now() - t0,
   detail: c.detail,
  };
 } catch (e) {
  return {
   id: 'primary',
   host,
   protocol: 'gateway',
   ok: false,
   state: 'error',
   status: 0,
   ms: Date.now() - t0,
   detail: compactErr(e),
  };
 } finally {
  clearTimeout(timer);
 }
}

async function probeDirect(key: string): Promise<ProxyCheckItem> {
 const t0 = Date.now();
 const ctl = new AbortController();
 const timer = setTimeout(() => ctl.abort(), 7500);
 try {
  const res = await fetch(`https://generativelanguage.googleapis.com${REGION_PROBE_PATH}`, {
   method: 'POST',
   headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
   body: REGION_PROBE_BODY,
   signal: ctl.signal,
  });
  const body = (await res.text()).slice(0, 1024);
  const c = classifyHttp(res.status, body);
  return {
   id: 'direct',
   host: 'generativelanguage.googleapis.com',
   protocol: 'direct',
   ok: c.ok,
   state: c.state,
   status: res.status,
   ms: Date.now() - t0,
   detail: c.detail,
  };
 } catch (e) {
  return {
   id: 'direct',
   host: 'generativelanguage.googleapis.com',
   protocol: 'direct',
   ok: false,
   state: 'error',
   status: 0,
   ms: Date.now() - t0,
   detail: compactErr(e),
  };
 } finally {
  clearTimeout(timer);
 }
}

async function probeGemini4(
 gatewayBase: string | undefined,
 envMap: Record<string, string | undefined>,
 key: string,
): Promise<ProxyCheckItem> {
 const t0 = Date.now();
 const ctl = new AbortController();
 const timer = setTimeout(() => ctl.abort(), 10000);
 try {
  let res: Response;
  let host = 'gemini-4-hydrogen';
  let proto = 'worker-tunnel';
  if (gatewayBase) {
   const base = gatewayBase.replace(/\/+$/, '');
   res = await fetch(`${base}${GEMINI4_PROBE_PATH}`, {
    method: 'GET',
    headers: { 'x-goog-api-key': key },
    signal: ctl.signal,
   });
   proto = res.headers.get('x-gemini-proxy-mode') || 'gateway';
  } else {
   const out = await fetchGeminiViaScheduledProxy(
    GEMINI4_PROBE_PATH,
    {
     method: 'GET',
     headers: { 'x-goog-api-key': key },
     signal: ctl.signal,
     connectTimeoutMs: 5500,
    },
    envMap,
   );
   res = out.res;
   host = out.node.host;
   proto = out.node.kind;
  }
  const body = (await res.text()).slice(0, 1024);
  const c = classifyHttp(res.status, body);
  // For Gemini 4 specifically, 429 means API reachable but rate-limited (amber), 200 means fully ready
  return {
   id: 'gemini4',
   host,
   protocol: proto,
   ok: res.status === 200,
   state: c.state,
   status: res.status,
   ms: Date.now() - t0,
   detail: c.detail,
  };
 } catch (e) {
  return {
   id: 'gemini4',
   host: 'gemini-4-hydrogen',
   protocol: gatewayBase ? 'gateway' : 'worker-tunnel',
   ok: false,
   state: 'error',
   status: 0,
   ms: Date.now() - t0,
   detail: compactErr(e),
  };
 } finally {
  clearTimeout(timer);
 }
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再检测网络。', 401);
  if (user.is_guest) throw new AuthError('游客不支持调用 Gemini 服务，请登录后使用。', 403);
  await rateLimit('proxy-check:' + user.id, 40);

  const e = env as unknown as Record<string, string | undefined>;
  const gmKey = e?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) || '';
  if (!gmKey) throw new AuthError('站点未配置 Gemini Key。', 503);

  const sched = getScheduledProxyNodes(e);
  const proxy1 = e?.GEMINI_PROXY_URL || (typeof process !== 'undefined' ? process.env?.GEMINI_PROXY_URL : undefined);
  const proxy2 = e?.GEMINI_PROXY_URL_2 || (typeof process !== 'undefined' ? process.env?.GEMINI_PROXY_URL_2 : undefined);
  const gatewayBase = sched.slot === 'day1-15' ? proxy1 || proxy2 : proxy2 || proxy1;

  const cfColo =
   ((req as unknown as { cf?: { colo?: string } }).cf?.colo || '').trim() ||
   (req.headers.get('cf-ray')?.split('-')[1] || '').trim() ||
   '';

  const [checks, allQuotas] = await Promise.all([
   gatewayBase
    ? Promise.all([probeGateway(gatewayBase, gmKey), probeDirect(gmKey), probeGemini4(gatewayBase, e, gmKey)])
    : Promise.all([
       probeNode('primary', sched.primary, gmKey),
       probeNode('standby', sched.standby, gmKey),
       probeDirect(gmKey),
       probeGemini4(undefined, e, gmKey),
      ]),
   readSiteGeminiQuotas(),
  ]);

  // Never expose raw proxy hostnames, Antigravity internal quota, or cache hit stats in the client response.
  const sanitizedChecks = checks.map(({ host: _host, ...rest }) => rest);
  const quotas = allQuotas.filter(q => !q.model.startsWith('antigravity-'));

  return Response.json(
   {
    cnDay: sched.cnDay,
    slot: sched.slot,
    colo: cfColo,
    mode: gatewayBase ? 'gateway' : 'worker-tunnel',
    checks: sanitizedChecks,
    quotas,
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '代理网络检测失败，请重试。' }, { status: 503, headers: noCache });
 }
}
