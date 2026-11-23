// Cloudflare Workers native proxy tunnel for Gemini API via `cloudflare:sockets` + WebCrypto TLS 1.3.
// Monthly schedule (China time UTC+8):
//   - Days 1..15:  AnyTLS node (19sdy.quandao.com:4430)
//   - Days 16..31: HTTPS CONNECT node (t4cache.71edgeiqiyi.com:22443)

import { connect } from 'cloudflare:sockets';
import { Tls13Stream, type ByteStream } from './tls13-client';

export const DEFAULT_DAY1_15_NODE =
 'anytls://cc051d14-6a12-41fc-8d4c-4037153143ce@19sdy.quandao.com:4430?skip_cert_verify=true&sni=psstatic.cdn.bcebos.com#%F0%9F%87%A6%F0%9F%87%BA19%E6%BE%B3%E6%B4%B2-%E7%A7%BB%E5%8A%A8%E4%BC%98%E5%8C%96(AnyTLS)';

export const DEFAULT_DAY16_END_NODE =
 'https://b98bc3e4-afc5-4d29-a934-161f6dc80654:b98bc3e4-afc5-4d29-a934-161f6dc80654@t4cache.71edgeiqiyi.com:22443#TW%20-%20%E5%8F%B0%E6%B9%BE%2004';

const GEMINI_HOST = 'generativelanguage.googleapis.com';
const GEMINI_PORT = 443;

const enc = new TextEncoder();
const dec = new TextDecoder();

export type ProxyNodeSpec =
 | {
    kind: 'https-proxy';
    id: 'day1-15' | 'day16-end';
    label: string;
    host: string;
    port: number;
    sni: string;
    username: string;
    password: string;
    skipCertVerify: boolean;
   }
 | {
    kind: 'anytls';
    id: 'day1-15' | 'day16-end';
    label: string;
    host: string;
    port: number;
    sni: string;
    password: string;
    skipCertVerify: boolean;
   };

export function parseProxyNodeUri(raw: string, id: 'day1-15' | 'day16-end'): ProxyNodeSpec {
 const u = new URL(raw.trim());
 const scheme = u.protocol.replace(/:$/, '').toLowerCase();
 const host = u.hostname;
 const port = u.port ? Number(u.port) : scheme === 'http' ? 80 : 443;
 const sni = u.searchParams.get('sni') || host;
 const skipRaw = (u.searchParams.get('skip_cert_verify') || u.searchParams.get('insecure') || '').toLowerCase();
 const skipCertVerify = skipRaw === '1' || skipRaw === 'true' || skipRaw === 'yes';
 let label = host;
 if (u.hash.length > 1) {
  try {
   label = decodeURIComponent(u.hash.slice(1));
  } catch {
   label = u.hash.slice(1);
  }
 }
 if (scheme === 'anytls') {
  return {
   kind: 'anytls',
   id,
   label,
   host,
   port,
   sni,
   password: decodeURIComponent(u.username),
   skipCertVerify,
  };
 }
 return {
  kind: 'https-proxy',
  id,
  label,
  host,
  port,
  sni,
  username: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  skipCertVerify,
 };
}

export function chinaDayOfMonth(nowMs = Date.now()): number {
 return new Date(nowMs + 8 * 3600_000).getUTCDate();
}

export function getScheduledProxyNodes(envMap?: Record<string, string | undefined>, nowMs = Date.now()): {
 cnDay: number;
 slot: 'day1-15' | 'day16-end';
 primary: ProxyNodeSpec;
 standby: ProxyNodeSpec;
} {
 const raw1 = (envMap?.GEMINI_NODE_1 || '').trim() || DEFAULT_DAY1_15_NODE;
 const raw2 = (envMap?.GEMINI_NODE_2 || '').trim() || DEFAULT_DAY16_END_NODE;
 const n1 = parseProxyNodeUri(raw1, 'day1-15');
 const n2 = parseProxyNodeUri(raw2, 'day16-end');
 const cnDay = chinaDayOfMonth(nowMs);
 if (cnDay >= 1 && cnDay <= 15) {
  return { cnDay, slot: 'day1-15', primary: n1, standby: n2 };
 }
 return { cnDay, slot: 'day16-end', primary: n2, standby: n1 };
}

function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
 let total = 0;
 for (const p of parts) total += p.length;
 const out = new Uint8Array(new ArrayBuffer(total));
 let off = 0;
 for (const p of parts) {
  out.set(p, off);
  off += p.length;
 }
 return out;
}

function toBase64(str: string): string {
 const bytes = enc.encode(str);
 let bin = '';
 for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
 return btoa(bin);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string, onTimeout?: () => void): Promise<T> {
 return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => {
   try {
    onTimeout?.();
   } catch {}
   reject(new Error(`${label} timeout (${ms}ms)`));
  }, ms);
  promise.then(
   (v) => {
    clearTimeout(timer);
    resolve(v);
   },
   (e) => {
    clearTimeout(timer);
    reject(e);
   },
  );
 });
}

async function openSocket(hostname: string, port: number, useNativeTls: boolean, timeoutMs: number, signal?: AbortSignal): Promise<ByteStream> {
 if (signal?.aborted) throw new Error('aborted');
 const sock = connect({ hostname, port }, { secureTransport: useNativeTls ? 'on' : 'off', allowHalfOpen: false });
 const onAbort = () => {
  void sock.close().catch(() => {});
 };
 signal?.addEventListener('abort', onAbort, { once: true });

 try {
  await withTimeout(sock.opened, timeoutMs, `connect ${hostname}:${port}`, () => {
   void sock.close().catch(() => {});
  });
 } catch (err) {
  signal?.removeEventListener('abort', onAbort);
  void sock.close().catch(() => {});
  throw err;
 }

 const reader = sock.readable.getReader();
 const writer = sock.writable.getWriter();
 return {
  async read() {
   const { done, value } = await reader.read();
   if (done || !value) return null;
   return value;
  },
  async write(data: Uint8Array) {
   await writer.write(data);
  },
  async close() {
   signal?.removeEventListener('abort', onAbort);
   try {
    reader.releaseLock();
   } catch {}
   try {
    writer.releaseLock();
   } catch {}
   await sock.close().catch(() => {});
  },
 };
}

function prependBytes(stream: ByteStream, initial: Uint8Array): ByteStream {
 let prefix: Uint8Array | null = initial.length > 0 ? initial : null;
 return {
  async read() {
   if (prefix) {
    const out = prefix;
    prefix = null;
    return out;
   }
   return stream.read();
  },
  write: (d) => stream.write(d),
  close: () => stream.close(),
 };
}

function findDoubleCRLF(buf: Uint8Array): number {
 for (let i = 0; i + 3 < buf.length; i++) {
  if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) return i;
 }
 return -1;
}

async function readUntilHeaderEnd(stream: ByteStream, maxBytes = 16384): Promise<{ head: string; rest: Uint8Array }> {
 let buf: Uint8Array = new Uint8Array(0);
 for (;;) {
  const idx = findDoubleCRLF(buf);
  if (idx >= 0) {
   return {
    head: dec.decode(buf.subarray(0, idx)),
    rest: buf.subarray(idx + 4),
   };
  }
  if (buf.length > maxBytes) throw new Error('HTTP header too large');
  const chunk = await stream.read();
  if (!chunk || chunk.length === 0) throw new Error('Unexpected EOF reading HTTP headers');
  buf = concatBytes(buf, chunk);
 }
}

async function dialViaHttpsProxy(
 node: Extract<ProxyNodeSpec, { kind: 'https-proxy' }>,
 targetHost: string,
 targetPort: number,
 timeoutMs: number,
 signal?: AbortSignal,
): Promise<ByteStream> {
 let outer: ByteStream;
 if (node.skipCertVerify) {
  const raw = await openSocket(node.host, node.port, false, timeoutMs, signal);
  try {
   outer = await withTimeout(Tls13Stream.connect(raw, node.sni, { alpn: ['http/1.1'] }), timeoutMs, `outer TLS ${node.host}`, () => {
    void raw.close().catch(() => {});
   });
  } catch (e) {
   await raw.close().catch(() => {});
   throw e;
  }
 } else {
  outer = await openSocket(node.host, node.port, true, timeoutMs, signal);
 }

 try {
  const target = `${targetHost}:${targetPort}`;
  const lines = [`CONNECT ${target} HTTP/1.1`, `Host: ${target}`, 'Proxy-Connection: Keep-Alive'];
  if (node.username || node.password) {
   lines.push(`Proxy-Authorization: Basic ${toBase64(`${node.username}:${node.password}`)}`);
  }
  lines.push('', '');
  await outer.write(enc.encode(lines.join('\r\n')));
  const { head, rest } = await withTimeout(readUntilHeaderEnd(outer, 8192), timeoutMs, `CONNECT ${node.host}`, () => {
   void outer.close().catch(() => {});
  });
  const statusLine = head.split('\r\n')[0] || '';
  if (!/^HTTP\/1\.[01]\s+200\b/i.test(statusLine)) {
   throw new Error(`HTTPS proxy CONNECT rejected: ${statusLine}`);
  }
  return prependBytes(outer, rest);
 } catch (e) {
  await outer.close().catch(() => {});
  throw e;
 }
}

const ANYTLS_CMD_WASTE = 0;
const ANYTLS_CMD_SYN = 1;
const ANYTLS_CMD_PSH = 2;
const ANYTLS_CMD_FIN = 3;
const ANYTLS_CMD_SETTINGS = 4;
const ANYTLS_CMD_ALERT = 5;
const ANYTLS_CMD_UPDATE_PADDING = 6;
const ANYTLS_CMD_SYNACK = 7;
const ANYTLS_CMD_HEART_REQ = 8;
const ANYTLS_CMD_HEART_RESP = 9;
const ANYTLS_CMD_SERVER_SETTINGS = 10;

function anyTlsFrame(cmd: number, sid: number, data?: Uint8Array): Uint8Array<ArrayBuffer> {
 const len = data ? data.length : 0;
 const out = new Uint8Array(new ArrayBuffer(7 + len));
 out[0] = cmd;
 out[1] = (sid >>> 24) & 0xff;
 out[2] = (sid >>> 16) & 0xff;
 out[3] = (sid >>> 8) & 0xff;
 out[4] = sid & 0xff;
 out[5] = (len >>> 8) & 0xff;
 out[6] = len & 0xff;
 if (data && len > 0) out.set(data, 7);
 return out;
}

class ExactStreamReader {
 private readonly s: ByteStream;
 private buf: Uint8Array = new Uint8Array(0);
 private eof = false;

 constructor(s: ByteStream) {
  this.s = s;
 }

 async readExact(n: number): Promise<Uint8Array | null> {
  while (this.buf.length < n) {
   if (this.eof) return null;
   const c = await this.s.read();
   if (!c || c.length === 0) {
    this.eof = true;
    return null;
   }
   this.buf = concatBytes(this.buf, c);
  }
  const out = this.buf.subarray(0, n);
  this.buf = this.buf.subarray(n);
  return out;
 }
}

async function dialViaAnyTls(
 node: Extract<ProxyNodeSpec, { kind: 'anytls' }>,
 targetHost: string,
 targetPort: number,
 timeoutMs: number,
 signal?: AbortSignal,
): Promise<ByteStream> {
 const raw = await openSocket(node.host, node.port, false, timeoutMs, signal);
 let tls: Tls13Stream;
 try {
  tls = await withTimeout(Tls13Stream.connect(raw, node.sni), timeoutMs, `AnyTLS outer TLS ${node.host}`, () => {
   void raw.close().catch(() => {});
  });
 } catch (e) {
  await raw.close().catch(() => {});
  throw e;
 }

 try {
  const pwHash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(node.password)));
  const padLen = 30;
  const authHdr = concatBytes(pwHash, new Uint8Array([0, padLen]), new Uint8Array(padLen));

  const settingsPayload = enc.encode('v=2\nclient=anytls/0.0.11\npadding-md5=a9b16d2b6c2e4d82e5c1f5e7f2b4a1c3');
  const hostBytes = enc.encode(targetHost);
  const socksAddr = concatBytes(
   new Uint8Array([0x03, hostBytes.length]),
   hostBytes,
   new Uint8Array([(targetPort >>> 8) & 0xff, targetPort & 0xff]),
  );

  await tls.write(
   concatBytes(
    authHdr,
    anyTlsFrame(ANYTLS_CMD_SETTINGS, 0, settingsPayload),
    anyTlsFrame(ANYTLS_CMD_SYN, 1),
    anyTlsFrame(ANYTLS_CMD_PSH, 1, socksAddr),
   ),
  );

  const er = new ExactStreamReader(tls);
  let closed = false;

  return {
   async read(): Promise<Uint8Array | null> {
    if (closed) return null;
    for (;;) {
     const hdr = await er.readExact(7);
     if (!hdr) {
      closed = true;
      return null;
     }
     const cmd = hdr[0];
     const sid = ((hdr[1] << 24) | (hdr[2] << 16) | (hdr[3] << 8) | hdr[4]) >>> 0;
     const len = (hdr[5] << 8) | hdr[6];
     const payload = len > 0 ? await er.readExact(len) : new Uint8Array(0);
     if (len > 0 && !payload) {
      closed = true;
      return null;
     }
     if (cmd === ANYTLS_CMD_PSH) {
      if (sid === 1 && payload && payload.length > 0) return payload;
      continue;
     }
     if (cmd === ANYTLS_CMD_SYNACK) {
      if (payload && payload.length > 0) {
       closed = true;
       throw new Error(`AnyTLS remote error: ${dec.decode(payload)}`);
      }
      continue;
     }
     if (cmd === ANYTLS_CMD_FIN) {
      if (sid === 1) {
       closed = true;
       return null;
      }
      continue;
     }
     if (cmd === ANYTLS_CMD_ALERT) {
      closed = true;
      throw new Error(`AnyTLS alert: ${payload ? dec.decode(payload) : 'unknown'}`);
     }
     if (cmd === ANYTLS_CMD_HEART_REQ) {
      await tls.write(anyTlsFrame(ANYTLS_CMD_HEART_RESP, sid)).catch(() => {});
      continue;
     }
     if (cmd === ANYTLS_CMD_WASTE || cmd === ANYTLS_CMD_SERVER_SETTINGS || cmd === ANYTLS_CMD_UPDATE_PADDING || cmd === ANYTLS_CMD_HEART_RESP) {
      continue;
     }
    }
   },
   async write(data: Uint8Array) {
    if (closed) throw new Error('AnyTLS stream closed');
    const maxFrame = 16000;
    for (let off = 0; off < data.length; off += maxFrame) {
     const slice = data.subarray(off, Math.min(data.length, off + maxFrame));
     await tls.write(anyTlsFrame(ANYTLS_CMD_PSH, 1, slice));
    }
   },
   async close() {
    if (closed) return;
    closed = true;
    await tls.write(anyTlsFrame(ANYTLS_CMD_FIN, 1)).catch(() => {});
    await tls.close().catch(() => {});
   },
  };
 } catch (e) {
  await tls.close().catch(() => {});
  throw e;
 }
}

async function http11FetchOverStream(
 tls: ByteStream,
 method: string,
 host: string,
 pathWithQuery: string,
 headers: Record<string, string>,
 body?: string,
 signal?: AbortSignal,
): Promise<Response> {
 const bodyBytes = body ? enc.encode(body) : new Uint8Array(0);
 const reqLines = [`${method} ${pathWithQuery} HTTP/1.1`, `Host: ${host}`, 'Accept-Encoding: identity', 'Connection: close'];
 for (const [k, v] of Object.entries(headers)) {
  if (/^(host|connection|content-length|accept-encoding)$/i.test(k)) continue;
  reqLines.push(`${k}: ${v}`);
 }
 if (bodyBytes.length > 0 || method === 'POST') {
  reqLines.push(`Content-Length: ${bodyBytes.length}`);
 }
 reqLines.push('', '');
 const reqHead = enc.encode(reqLines.join('\r\n'));
 await tls.write(bodyBytes.length > 0 ? concatBytes(reqHead, bodyBytes) : reqHead);

 const { head, rest } = await readUntilHeaderEnd(tls, 32768);
 const lines = head.split('\r\n');
 const statusMatch = (lines[0] || '').match(/^HTTP\/1\.[01]\s+(\d{3})(?:\s+(.*))?$/i);
 if (!statusMatch) throw new Error(`Invalid HTTP response line: ${lines[0]}`);
 const status = Number(statusMatch[1]);
 const statusText = statusMatch[2] || '';

 const respHeaders = new Headers();
 for (let i = 1; i < lines.length; i++) {
  const colon = lines[i].indexOf(':');
  if (colon <= 0) continue;
  respHeaders.append(lines[i].slice(0, colon).trim(), lines[i].slice(colon + 1).trim());
 }

 const isChunked = (respHeaders.get('transfer-encoding') || '').toLowerCase().includes('chunked');
 const contentLenRaw = respHeaders.get('content-length');
 const contentLen = contentLenRaw && /^\d+$/.test(contentLenRaw.trim()) ? Number(contentLenRaw.trim()) : -1;
 respHeaders.delete('transfer-encoding');

 const bodyStream = new ReadableStream<Uint8Array>({
  async start(controller) {
   const onAbort = () => {
    void tls.close().catch(() => {});
    try {
     controller.error(new Error('aborted'));
    } catch {}
   };
   signal?.addEventListener('abort', onAbort, { once: true });

   const src = prependBytes(tls, rest);
   try {
    if (isChunked) {
     let buf: Uint8Array = new Uint8Array(0);
     const ensureLine = async (): Promise<string | null> => {
      for (;;) {
       for (let i = 0; i + 1 < buf.length; i++) {
        if (buf[i] === 13 && buf[i + 1] === 10) {
         const line = dec.decode(buf.subarray(0, i));
         buf = buf.subarray(i + 2);
         return line;
        }
       }
       const c = await src.read();
       if (!c || c.length === 0) return null;
       buf = concatBytes(buf, c);
      }
     };
     for (;;) {
      const sizeLine = await ensureLine();
      if (sizeLine === null) break;
      const sizeHex = sizeLine.split(';')[0].trim();
      if (!sizeHex) continue;
      let rem = Number.parseInt(sizeHex, 16);
      if (!Number.isFinite(rem) || rem < 0) throw new Error(`Invalid chunk size: ${sizeLine}`);
      if (rem === 0) break;
      while (rem > 0) {
       if (buf.length === 0) {
        const c = await src.read();
        if (!c || c.length === 0) {
         rem = 0;
         break;
        }
        buf = c;
       }
       const take = Math.min(rem, buf.length);
       controller.enqueue(buf.subarray(0, take).slice());
       buf = buf.subarray(take);
       rem -= take;
      }
      await ensureLine();
     }
    } else if (contentLen >= 0) {
     let rem = contentLen;
     while (rem > 0) {
      const c = await src.read();
      if (!c || c.length === 0) break;
      const take = Math.min(rem, c.length);
      controller.enqueue(c.subarray(0, take).slice());
      rem -= take;
     }
    } else {
     for (;;) {
      const c = await src.read();
      if (!c || c.length === 0) break;
      controller.enqueue(c.slice());
     }
    }
    controller.close();
   } catch (err) {
    if (!signal?.aborted) {
     try {
      controller.error(err);
     } catch {}
    }
   } finally {
    signal?.removeEventListener('abort', onAbort);
    await tls.close().catch(() => {});
   }
  },
  cancel() {
   void tls.close().catch(() => {});
  },
 });

 return new Response(bodyStream, { status, statusText, headers: respHeaders });
}

export async function fetchGeminiViaNode(
 node: ProxyNodeSpec,
 pathWithQuery: string,
 init: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal; connectTimeoutMs?: number },
): Promise<Response> {
 const timeoutMs = init.connectTimeoutMs ?? 6000;
 const tunnel =
  node.kind === 'anytls'
   ? await dialViaAnyTls(node, GEMINI_HOST, GEMINI_PORT, timeoutMs, init.signal)
   : await dialViaHttpsProxy(node, GEMINI_HOST, GEMINI_PORT, timeoutMs, init.signal);
 let innerTls: Tls13Stream;
 try {
  innerTls = await withTimeout(
   Tls13Stream.connect(tunnel, GEMINI_HOST, { alpn: ['http/1.1'] }),
   timeoutMs,
   `inner TLS via ${node.host}`,
   () => {
    void tunnel.close().catch(() => {});
   },
  );
 } catch (e) {
  await tunnel.close().catch(() => {});
  throw e;
 }
 try {
  return await http11FetchOverStream(
   innerTls,
   init.method || 'GET',
   GEMINI_HOST,
   pathWithQuery,
   init.headers || {},
   init.body,
   init.signal,
  );
 } catch (e) {
  await innerTls.close().catch(() => {});
  throw e;
 }
}

export async function fetchGeminiViaScheduledProxy(
 pathWithQuery: string,
 init: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal; connectTimeoutMs?: number },
 envMap?: Record<string, string | undefined>,
 opts?: { preferStandby?: boolean },
): Promise<{ res: Response; node: ProxyNodeSpec; slot: 'day1-15' | 'day16-end' }> {
 const sched = getScheduledProxyNodes(envMap);
 const order = opts?.preferStandby ? [sched.standby, sched.primary] : [sched.primary, sched.standby];
 let lastErr: unknown;
 for (const node of order) {
  if (init.signal?.aborted) throw new Error('aborted');
  try {
   const res = await fetchGeminiViaNode(node, pathWithQuery, init);
   return { res, node, slot: sched.slot };
  } catch (e) {
   lastErr = e;
  }
 }
 throw lastErr instanceof Error ? lastErr : new Error('All Gemini proxy nodes failed');
}
