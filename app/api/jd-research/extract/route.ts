import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { extractJdFromImages } from '@/lib/gemini';
import { fetchJdTextFromUrl } from '@/lib/jd-extract';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);
  if (user.is_guest) throw new AuthError('游客不支持使用该功能，请登录后重试。', 403);
  await rateLimit('jd-extract:' + user.id, 30);

  const raw = await req.text();
  if (raw.length > 8_000_000) throw new AuthError('上传内容过大，请减少图片数量或压缩后重试。', 413);
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。', 400);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images = rawImages
   .filter((x): x is string => typeof x === 'string' && x.length <= 2_000_000 && IMG_RE.test(x))
   .slice(0, 4);
  const geminiProxy = body.geminiProxy !== false;

  if (!url && !images.length) {
   throw new AuthError('请提供岗位链接或上传 JD 图片。', 400);
  }

  const parts: string[] = [];
  if (url) {
   const fromUrl = await fetchJdTextFromUrl(url);
   if (fromUrl) parts.push(fromUrl);
  }
  if (images.length) {
   const fromImg = await extractJdFromImages(images, geminiProxy, true);
   if (fromImg) parts.push(fromImg);
  }

  const text = parts.join('\n\n').slice(0, 14_000).trim();
  if (text.length < 12) {
   throw new AuthError('未能提取到有效内容，请检查链接或图片是否清晰。', 400);
  }
  return Response.json({ text }, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: (e as Error)?.message || '内容提取失败，请重试。' }, { status: 400, headers: noCache });
 }
}
