import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import {
 ANTIGRAVITY_AGENT_ID,
 AntigravityError,
 pollAntigravityInteraction,
 startAntigravityInteraction,
 type AntigravityUsage,
} from '@/lib/antigravity-agent';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import {
 buildJdResearchInput,
 getJdResearchSystemPrompt,
 parseAndEnrichJdReport,
} from '@/lib/jd-research-server';
import type { JdInputKind, JdPrepDays, JdResearchReport, JdSeniority } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

const ALLOWED_DAYS = new Set<JdPrepDays>([3, 7, 14, 30]);
const ALLOWED_COUNTS = new Set([8, 10, 12]);

function signingSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.GEMINI_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-jd-sig').slice(0, 48);
}

async function signToken(userId: string, token: string): Promise<string> {
 return (await sha256Hex([signingSecret(), 'jd', userId, token])).slice(0, 32);
}

type CachedJdPayload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 usage?: AntigravityUsage;
};

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用 JD / 面经调研。', 401);
  await rateLimit('jd-research:' + user.id, 25);

  const raw = await req.text();
  if (raw.length > 36_000) throw new AuthError('输入内容过长，请精简后再提交。');
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
  const source = typeof body.source === 'string' ? body.source.replace(/\r\n/g, '\n').trim().slice(0, 14_000) : '';
  const daysRaw = Number(body.days) as JdPrepDays;
  const days: JdPrepDays = ALLOWED_DAYS.has(daysRaw) ? daysRaw : 7;
  const level: JdSeniority = body.level === 'junior' || body.level === 'senior' ? body.level : 'mid';
  const countRaw = Number(body.questionCount);
  const questionCount = ALLOWED_COUNTS.has(countRaw) ? countRaw : 10;
  const geminiProxy = body.geminiProxy !== false;

  if (source.length < 20) throw new AuthError('请粘贴至少 20 字的岗位 JD 或面经内容。');

  const cacheKey = 'jd:' + (await sha256Hex([kind, String(days), level, String(questionCount), source]));
  const hit = await readPromptCache<CachedJdPayload>(cacheKey);
  if (hit?.payload?.report) {
   return Response.json(
    {
     status: 'completed',
     cached: true,
     report: hit.payload.report,
     rawText: hit.payload.rawText || '',
     thoughts: hit.payload.thoughts || '',
     usage: hit.payload.usage,
    },
    { headers: noCache },
   );
  }

  const started = await startAntigravityInteraction({
   systemInstruction: getJdResearchSystemPrompt(),
   input: buildJdResearchInput({ kind, source, days, level, questionCount }),
   geminiProxy,
  });

  const sig = await signToken(user.id, started.id);
  const ckSig = await signToken(user.id, cacheKey);

  return Response.json(
   {
    id: started.id,
    sig,
    status: started.status,
    cacheKey,
    ckSig,
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '深度调研服务暂时不可用，请重试。' }, { status: 503, headers: noCache });
 }
}

export async function GET(req: Request) {
 try {
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);

  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const sig = (url.searchParams.get('sig') || '').trim();
  const ck = (url.searchParams.get('ck') || '').trim();
  const ckSig = (url.searchParams.get('ckSig') || '').trim();
  const geminiProxy = url.searchParams.get('geminiProxy') !== '0';

  if (!id || !sig || id.length > 160) throw new AuthError('缺少任务标识。', 400);
  const expected = await signToken(user.id, id);
  if (sig !== expected) throw new AuthError('无权查询该调研任务。', 403);

  const polled = await pollAntigravityInteraction({ interactionId: id, geminiProxy });
  if (polled.status === 'completed') {
   const report = parseAndEnrichJdReport(polled.text);
   if (report && ck.startsWith('jd:') && ckSig) {
    const expectedCk = await signToken(user.id, ck);
    if (ckSig === expectedCk) {
     void writePromptCache(
      ck,
      'jd-research',
      ANTIGRAVITY_AGENT_ID,
      { report, rawText: polled.text, thoughts: polled.thoughts, usage: polled.usage } satisfies CachedJdPayload,
      7 * 24 * 3600_000,
     );
    }
   }
   return Response.json(
    {
     id: polled.id,
     status: 'completed',
     report,
     rawText: polled.text,
     thoughts: polled.thoughts,
     usage: polled.usage,
    },
    { headers: noCache },
   );
  }

  return Response.json(polled, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询调研进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
