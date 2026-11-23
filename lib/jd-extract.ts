import { AuthError } from './site-auth';

function isBlockedHost(hostname: string): boolean {
 const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
 if (!h) return true;
 if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h.endsWith('.internal')) return true;
 if (/^0\./.test(h) || /^127\./.test(h) || /^10\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h)) {
  return true;
 }
 const m172 = h.match(/^172\.(\d+)\./);
 if (m172) {
  const n = Number(m172[1]);
  if (n >= 16 && n <= 31) return true;
 }
 if (/^fc|^fd|^fe80:/i.test(h)) return true;
 return false;
}

function decodeHtmlEntities(input: string): string {
 return input
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
   const cp = Number.parseInt(hex, 16);
   return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  })
  .replace(/&#(\d+);/g, (_, dec) => {
   const cp = Number.parseInt(dec, 10);
   return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  });
}

function htmlToPlainText(html: string): string {
 const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
 const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';

 const metaDescMatch =
  html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
  html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
 const metaDesc = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]).replace(/\s+/g, ' ').trim() : '';

 let body = html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|noscript|svg|iframe|template|head)[^>]*>[\s\S]*?<\/\1>/gi, '\n')
  .replace(/<(br|hr)\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote|dd|dt)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ');

 body = decodeHtmlEntities(body)
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

 const parts: string[] = [];
 if (title && !body.startsWith(title)) parts.push(title);
 if (metaDesc && !body.includes(metaDesc.slice(0, 40))) parts.push(metaDesc);
 if (body) parts.push(body);
 return parts.join('\n\n').slice(0, 12_000).trim();
}

export async function fetchJdTextFromUrl(rawUrl: string): Promise<string> {
 const trimmed = rawUrl.trim();
 let parsed: URL;
 try {
  parsed = new URL(trimmed);
 } catch {
  throw new AuthError('岗位链接格式无效，请输入完整的 http/https 网址。', 400);
 }
 if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
  throw new AuthError('仅支持 http 或 https 岗位链接。', 400);
 }
 if (isBlockedHost(parsed.hostname)) {
  throw new AuthError('不支持抓取本地或内网链接。', 400);
 }

 const ctl = new AbortController();
 const timer = setTimeout(() => ctl.abort(), 12_000);
 try {
  const res = await fetch(parsed.toString(), {
   method: 'GET',
   redirect: 'follow',
   signal: ctl.signal,
   headers: {
    'user-agent':
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
   },
  });
  if (!res.ok) {
   throw new AuthError(
    `链接读取失败（HTTP ${res.status}），目标站点可能需要登录或存在反爬限制，请改为上传 JD 截图或粘贴文字。`,
    400,
   );
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const raw = (await res.text()).slice(0, 600_000);
  const text = ct.includes('text/plain') || ct.includes('markdown')
   ? raw.replace(/\r\n?/g, '\n').trim().slice(0, 12_000)
   : htmlToPlainText(raw);

  if (text.length < 40) {
   throw new AuthError(
    '该链接页面需要登录或由前端动态渲染，未能提取到有效 JD 正文，请上传 JD 截图或直接复制粘贴文字。',
    400,
   );
  }
  return text;
 } catch (e) {
  if (e instanceof AuthError) throw e;
  throw new AuthError('链接读取超时或无法访问，请上传 JD 截图或直接粘贴文字。', 400);
 } finally {
  clearTimeout(timer);
 }
}
