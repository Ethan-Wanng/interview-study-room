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
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdStage1Input,
 buildJdStage2Input,
 getJdResearchStage1SystemPrompt,
 getJdResearchStage2SystemPrompt,
 inspectJdStreamProgress,
 mergeStage1AndStage2Report,
 normalizeJdSourceForCache,
 parseAndEnrichJdReport,
} from '@/lib/jd-research-server';
import { extractJdFromImages } from '@/lib/gemini';
import { fetchJdTextFromUrl } from '@/lib/jd-extract';
import {
 hasStructuredStudyQuizzes,
 type JdInputKind,
 type JdResearchReport,
} from '@/lib/jd-research-types';

const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

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

type CachedStage1Payload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 usage?: AntigravityUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 source: string;
 cacheKey?: string;
 stage1CacheKey?: string;
 stage?: 1 | 2;
 cached?: boolean;
 stage1Cached?: boolean;
 partialReport?: JdResearchReport | null;
 stage1RawText?: string;
 stage1Thoughts?: string;
 stage1Usage?: AntigravityUsage;
 report: JdResearchReport | null;
 rawText: string;
 thoughts: string;
 usage?: AntigravityUsage;
 imported?: { count: number; subject: string } | null;
 error?: string;
};

function draftTitle(source: string, kind: JdInputKind): string {
 const first =
  source
   .split('\n')
   .map(l => l.trim())
   .find(Boolean) || '';
 const clean = first.replace(/^(?:岗位|职位|标题|题目)[:：\s]*/, '').slice(0, 36);
 return clean || (kind === 'experience' ? '面经深度调研' : '岗位 JD 深度调研');
}

function makeSubtitle(rep: JdResearchReport | null): string {
 if (!rep) return '';
 return [rep.inferredLevel, rep.prepDays, rep.companyStyle].filter(Boolean).join(' · ').slice(0, 80);
}

function combineUsage(a?: AntigravityUsage, b?: AntigravityUsage): AntigravityUsage | undefined {
 if (!a && !b) return undefined;
 return {
  totalTokens: (a?.totalTokens || 0) + (b?.totalTokens || 0),
  inputTokens: (a?.inputTokens || 0) + (b?.inputTokens || 0),
  cachedTokens: (a?.cachedTokens || 0) + (b?.cachedTokens || 0),
  outputTokens: (a?.outputTokens || 0) + (b?.outputTokens || 0),
  thoughtTokens: (a?.thoughtTokens || 0) + (b?.thoughtTokens || 0),
 };
}

// Exclusively uses the managed agent backend (`background: true` + HMAC polling + D1 persistence).
// Uses Two-Stage Generation (Stage 1: Profile + Roadmap -> Stage 2: Path Study Quizzes + Interview Questions)
// and multi-layer caching (Full D1 cache + Stage 1 D1 cache + byte-identical prefix prompt cache).
export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用 JD / 面经调研。', 401);
  if (user.is_guest) throw new AuthError('游客不支持调用 Gemini 模型，请登录后使用 JD / 面经调研。', 403);
  await rateLimit('jd-research:' + user.id, 30);

  const raw = await req.text();
  if (raw.length > 8_000_000) throw new AuthError('输入内容或图片过大，请精简后再提交。');
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const kind: JdInputKind = body.kind === 'experience' ? 'experience' : 'jd';
  const rawSource = typeof body.source === 'string' ? body.source.replace(/\r\n/g, '\n').trim().slice(0, 14_000) : '';
  const jdUrl = typeof body.url === 'string' ? body.url.trim().slice(0, 2000) : '';
  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images = rawImages
   .filter((x): x is string => typeof x === 'string' && x.length <= 2_000_000 && IMG_RE.test(x))
   .slice(0, 4);
  const geminiProxy = body.geminiProxy !== false;
  const bypassCache = body.bypassCache === true;
  const existingRecordId = typeof body.recordId === 'string' && body.recordId.startsWith('jdr-') ? body.recordId.trim().slice(0, 80) : '';

  const parts: string[] = [];
  if (rawSource) parts.push(rawSource);
  if (jdUrl) {
   const fromUrl = await fetchJdTextFromUrl(jdUrl);
   if (fromUrl) parts.push(fromUrl);
  }
  if (images.length) {
   const fromImg = await extractJdFromImages(images, geminiProxy, true);
   if (fromImg) parts.push(fromImg);
  }
  const source = parts.join('\n\n').slice(0, 14_000).trim();

  if (source.length < 20) throw new AuthError('请粘贴至少 20 字的岗位 JD / 面经内容，或提供岗位链接 / 图片。');

  const recordId = existingRecordId || 'jdr-' + crypto.randomUUID();
  const normSource = normalizeJdSourceForCache(source);
  const hashHex = await sha256Hex([kind, normSource]);
  const cacheKey = 'jd-auto-v2:' + hashHex;
  const stage1CacheKey = 'jd-s1-v2:' + hashHex;

  // 1. Check Full-Report D1 deterministic cache first (0 token cost, instant response)
  if (!bypassCache) {
   const hit = await readPromptCache<CachedJdPayload>(cacheKey);
   if (
    hit?.payload?.report &&
    hit.payload.report.roadmap.length > 0 &&
    (hit.payload.report.questions.length > 0 || hasStructuredStudyQuizzes(hit.payload.report))
   ) {
    const rep = hit.payload.report;
    const stored: StoredJdRecordPayload = {
     kind,
     source,
     cacheKey,
     stage1CacheKey,
     cached: true,
     report: rep,
     rawText: hit.payload.rawText || '',
     thoughts: hit.payload.thoughts || '',
     usage: hit.payload.usage,
    };
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: rep.roleTitle || draftTitle(source, kind),
     subtitle: makeSubtitle(rep),
     status: 'completed',
     payload: stored,
    });
    return Response.json(
     {
      recordId,
      status: 'completed',
      cached: true,
      report: rep,
      rawText: hit.payload.rawText || '',
      thoughts: hit.payload.thoughts || '',
      usage: hit.payload.usage,
      extractedSource: source,
     },
     { headers: noCache },
    );
   }

   // 2. Check Stage 1 (Profile + Roadmap) D1 cache: if hit, jump directly to Stage 2!
   const s1Hit = await readPromptCache<CachedStage1Payload>(stage1CacheKey);
   if (s1Hit?.payload?.report && s1Hit.payload.report.roadmap.length > 0) {
    const s1Rep = s1Hit.payload.report;
    const started2 = await startAntigravityInteraction({
     systemInstruction: getJdResearchStage2SystemPrompt(),
     input: buildJdStage2Input({ kind, source, stage1: s1Rep }),
     geminiProxy,
    });
    const sig = await signToken(user.id, started2.id);
    const ckSig = await signToken(user.id, cacheKey);
    const pendingPayload: StoredJdRecordPayload = {
     kind,
     source,
     cacheKey,
     stage1CacheKey,
     stage: 2,
     stage1Cached: true,
     partialReport: s1Rep,
     stage1RawText: s1Hit.payload.rawText || '',
     stage1Thoughts: s1Hit.payload.thoughts || '',
     stage1Usage: s1Hit.payload.usage,
     report: null,
     rawText: '',
     thoughts: s1Hit.payload.thoughts || '',
    };
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'jd-research',
     title: s1Rep.roleTitle || draftTitle(source, kind),
     subtitle: makeSubtitle(s1Rep),
     status: 'running',
     interactionId: started2.id,
     payload: pendingPayload,
    });
    return Response.json(
     {
      recordId,
      id: started2.id,
      sig,
      status: started2.status,
      stage: 2,
      stage1Cached: true,
      partialReport: s1Rep,
      progress: inspectJdStreamProgress(2, '', s1Rep, true),
      title: s1Rep.roleTitle || draftTitle(source, kind),
      cacheKey,
      ckSig,
      extractedSource: source,
     },
     { headers: noCache },
    );
   }
  }

  // 3. Start Stage 1 managed background interaction (Profile + Roadmap)
  const started = await startAntigravityInteraction({
   systemInstruction: getJdResearchStage1SystemPrompt(),
   input: buildJdStage1Input({ kind, source }),
   geminiProxy,
  });

  const sig = await signToken(user.id, started.id);
  const ckSig = await signToken(user.id, cacheKey);

  const pendingPayload: StoredJdRecordPayload = {
   kind,
   source,
   cacheKey,
   stage1CacheKey,
   stage: 1,
   report: null,
   rawText: '',
   thoughts: '',
  };
  await saveAiInterviewRecord({
   id: recordId,
   userId: user.id,
   kind: 'jd-research',
   title: draftTitle(source, kind),
   subtitle: '',
   status: 'running',
   interactionId: started.id,
   payload: pendingPayload,
  });

  return Response.json(
   {
    recordId,
    id: started.id,
    sig,
    status: started.status,
    stage: 1,
    progress: inspectJdStreamProgress(1, '', null, false),
    title: draftTitle(source, kind),
    cacheKey,
    ckSig,
    extractedSource: source,
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
  const rid = (url.searchParams.get('rid') || '').trim();
  const geminiProxy = url.searchParams.get('geminiProxy') !== '0';

  if (!id || !sig || id.length > 160) throw new AuthError('缺少任务标识。', 400);
  const prev = rid ? await getAiInterviewRecord<StoredJdRecordPayload>(user.id, rid) : null;

  const expectedIdSig = await signToken(user.id, id);
  const expectedRidSig = rid ? await signToken(user.id, rid) : '';
  const expectedPrevIdSig = prev?.interactionId ? await signToken(user.id, prev.interactionId) : '';
  if (sig !== expectedIdSig && sig !== expectedRidSig && sig !== expectedPrevIdSig) {
   throw new AuthError('无权查询该调研任务。', 403);
  }

  // If the record already completed (e.g. polled by another tab or background watcher), return immediately!
  if (prev?.status === 'completed' && prev.payload?.report) {
   return Response.json(
    {
     id: prev.interactionId || id,
     recordId: rid || undefined,
     status: 'completed',
     cached: prev.payload.cached,
     stage1Cached: prev.payload.stage1Cached,
     report: prev.payload.report,
     rawText: prev.payload.rawText || '',
     thoughts: prev.payload.thoughts || '',
     usage: prev.payload.usage,
    },
    { headers: noCache },
   );
  }

  const activeInteractionId = prev?.interactionId || id;
  const stage: 1 | 2 = prev?.payload?.stage === 2 ? 2 : 1;
  const partialReport = prev?.payload?.partialReport ?? null;
  const stage1Cached = Boolean(prev?.payload?.stage1Cached);

  const polled = await pollAntigravityInteraction({ interactionId: activeInteractionId, geminiProxy });

  if (polled.status === 'in_progress') {
   const progress = inspectJdStreamProgress(stage, polled.text, partialReport, stage1Cached);
   const combinedThoughts = [prev?.payload?.stage1Thoughts, polled.thoughts].filter(Boolean).join('\n\n');
   return Response.json(
    {
     id: activeInteractionId,
     recordId: rid || undefined,
     status: 'in_progress',
     stage,
     stage1Cached,
     partialReport,
     progress,
     text: polled.text,
     thoughts: combinedThoughts,
    },
    { headers: noCache },
   );
  }

  if (polled.status === 'completed') {
   // ---- Stage 1 Completed: parse Profile + Roadmap, cache Stage 1, and transition to Stage 2 ----
   if (stage === 1) {
    const s1Report = parseAndEnrichJdReport(polled.text);
    // If single-pass report already has both roadmap study quizzes and interview questions, finish directly
    const alreadyComplete = Boolean(
     s1Report && s1Report.questions.length > 0 && hasStructuredStudyQuizzes(s1Report),
    );

    if (!s1Report || (!s1Report.roadmap.length && !s1Report.dimensions.length)) {
     if (rid && prev) {
      await saveAiInterviewRecord({
       id: rid,
       userId: user.id,
       kind: 'jd-research',
       title: prev.title,
       subtitle: prev.subtitle,
       status: 'error',
       interactionId: activeInteractionId,
       payload: {
        ...prev.payload,
        rawText: polled.text,
        thoughts: polled.thoughts,
        error: '考点画像与复习路径解析失败，请点击「一键重试」重新生成。',
       },
       createdAt: prev.createdAt,
      });
     }
     return Response.json(
      {
       id: activeInteractionId,
       recordId: rid || undefined,
       status: 'failed',
       error: '考点画像与复习路径解析失败，请点击「一键重试」重新生成。',
      },
      { headers: noCache },
     );
    }

    if (!alreadyComplete) {
     const prevKind: JdInputKind = prev?.payload?.kind || 'jd';
     const prevSource = prev?.payload?.source || '';
     const s1CacheKey =
      prev?.payload?.stage1CacheKey ||
      (prevSource ? 'jd-s1-v2:' + (await sha256Hex([prevKind, normalizeJdSourceForCache(prevSource)])) : '');

     if (s1CacheKey) {
      await writePromptCache(
       s1CacheKey,
       'jd-stage1',
       ANTIGRAVITY_AGENT_ID,
       { report: s1Report, rawText: polled.text, thoughts: polled.thoughts, usage: polled.usage } satisfies CachedStage1Payload,
       7 * 24 * 3600_000,
      );
     }

     const started2 = await startAntigravityInteraction({
      systemInstruction: getJdResearchStage2SystemPrompt(),
      input: buildJdStage2Input({ kind: prevKind, source: prevSource, stage1: s1Report }),
      geminiProxy,
     });
     const newSig = await signToken(user.id, started2.id);

     if (rid) {
      const nextPayload: StoredJdRecordPayload = {
       kind: prevKind,
       source: prevSource,
       cacheKey: prev?.payload?.cacheKey || ck,
       stage1CacheKey: s1CacheKey,
       stage: 2,
       stage1Cached: false,
       partialReport: s1Report,
       stage1RawText: polled.text,
       stage1Thoughts: polled.thoughts,
       stage1Usage: polled.usage,
       report: null,
       rawText: '',
       thoughts: polled.thoughts,
       imported: prev?.payload?.imported ?? null,
      };
      await saveAiInterviewRecord({
       id: rid,
       userId: user.id,
       kind: 'jd-research',
       title: s1Report.roleTitle || prev?.title || '深度调研报告',
       subtitle: makeSubtitle(s1Report) || prev?.subtitle || '',
       status: 'running',
       interactionId: started2.id,
       payload: nextPayload,
       createdAt: prev?.createdAt,
      });
     }

     return Response.json(
      {
       id: started2.id,
       sig: newSig,
       recordId: rid || undefined,
       status: 'in_progress',
       stage: 2,
       stage1Cached: false,
       partialReport: s1Report,
       progress: inspectJdStreamProgress(2, '', s1Report, false),
       text: '',
       thoughts: polled.thoughts,
      },
      { headers: noCache },
     );
    }
   }

   // ---- Stage 2 (or Legacy Single-Pass) Completed: Merge Stage 1 + Stage 2 ----
   const report = partialReport
    ? mergeStage1AndStage2Report(partialReport, polled.text)
    : parseAndEnrichJdReport(polled.text);

   const combinedThoughts = [prev?.payload?.stage1Thoughts, polled.thoughts].filter(Boolean).join('\n\n');
   const combinedRaw = [prev?.payload?.stage1RawText, polled.text].filter(Boolean).join('\n\n');
   const combinedUsage = combineUsage(prev?.payload?.stage1Usage, polled.usage);

   const effectiveCk = prev?.payload?.cacheKey || ck;
   if (
    report &&
    (report.questions.length > 0 || hasStructuredStudyQuizzes(report)) &&
    effectiveCk.startsWith('jd')
   ) {
    const canWriteCache =
     (ckSig && ckSig === (await signToken(user.id, effectiveCk))) ||
     Boolean(prev?.payload?.cacheKey);
    if (canWriteCache) {
     await writePromptCache(
      effectiveCk,
      'jd-research',
      ANTIGRAVITY_AGENT_ID,
      { report, rawText: combinedRaw, thoughts: combinedThoughts, usage: combinedUsage } satisfies CachedJdPayload,
      7 * 24 * 3600_000,
     );
    }
   }

   if (rid) {
    const merged: StoredJdRecordPayload = {
     kind: prev?.payload?.kind || 'jd',
     source: prev?.payload?.source || '',
     cacheKey: effectiveCk,
     stage1CacheKey: prev?.payload?.stage1CacheKey,
     stage: 2,
     cached: false,
     stage1Cached,
     partialReport: null,
     report,
     rawText: combinedRaw,
     thoughts: combinedThoughts,
     usage: combinedUsage,
     imported: prev?.payload?.imported ?? null,
    };
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: report?.roleTitle || prev?.title || '深度调研报告',
     subtitle: makeSubtitle(report) || prev?.subtitle || '',
     status: report ? 'completed' : 'error',
     interactionId: activeInteractionId,
     payload: report ? merged : { ...merged, error: '报告结果解析不完整，可点击「一键重试」重新生成。' },
     createdAt: prev?.createdAt,
    });
   }

   return Response.json(
    {
     id: activeInteractionId,
     recordId: rid || undefined,
     status: 'completed',
     cached: false,
     stage1Cached,
     report,
     rawText: combinedRaw,
     thoughts: combinedThoughts,
     usage: combinedUsage,
    },
    { headers: noCache },
   );
  }

  if ((polled.status === 'failed' || polled.status === 'cancelled') && rid) {
   if (prev) {
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'jd-research',
     title: prev.title,
     subtitle: prev.subtitle,
     status: 'error',
     interactionId: activeInteractionId,
     payload: { ...prev.payload, error: polled.error || '调研任务中断，可点击一键重试' },
     createdAt: prev.createdAt,
    });
   }
  }

  return Response.json(polled, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询调研进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
