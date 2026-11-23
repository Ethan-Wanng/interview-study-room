import { env } from 'cloudflare:workers';
import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import {
 ANTIGRAVITY_AGENT_ID,
 AntigravityError,
 pollAntigravityInteraction,
 startAntigravityInteraction,
 streamAntigravityInteraction,
 type AntigravityUsage,
} from '@/lib/antigravity-agent';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import {
 buildJdStage1Input,
 buildJdStage2Input,
 createThinkJsonStreamSplitter,
 extractThoughtsAndJson,
 getJdResearchStage1SystemPrompt,
 getJdResearchStage2SystemPrompt,
 inspectJdStreamProgress,
 mergeStage1AndStage2Report,
 normalizeJdSourceForCache,
 parseAndEnrichJdReport,
} from '@/lib/jd-research-server';
import { extractJdFromImages, jdResearchModelStream } from '@/lib/gemini';
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
 model?: string;
 usage?: AntigravityUsage;
};

type CachedStage1Payload = {
 report: JdResearchReport;
 rawText: string;
 thoughts: string;
 model?: string;
 usage?: AntigravityUsage;
};

type StoredJdRecordPayload = {
 kind: JdInputKind;
 source: string;
 model?: string;
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
  const initialTitle = draftTitle(source, kind);

  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
   async start(controller) {
    let lastSendAt = Date.now();
    const send = (ev: Record<string, unknown>) => {
     if (closed) return;
     lastSendAt = Date.now();
     try {
      controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
     } catch {
      closed = true;
     }
    };

    let activeStage: 1 | 2 = 1;
    let activeStep = 'connecting';
    const pingTimer = setInterval(() => {
     if (closed) return;
     if (Date.now() - lastSendAt >= 2400) {
      send({ type: 'ping', stage: activeStage, step: activeStep });
     }
    }, 2500);

    try {
     // Immediately confirm stream connection so client UI transitions out of waiting state in <100ms
     send({
      type: 'connected',
      recordId,
      title: initialTitle,
      extractedSource: source,
      stage: 1,
      progress: inspectJdStreamProgress(1, '', null, false),
     });

     // 1. Check Full-Report D1 deterministic cache first (0 token cost, instant response)
     if (!bypassCache) {
      const hit = await readPromptCache<CachedJdPayload>(cacheKey);
      if (
       hit?.payload?.report &&
       hit.payload.report.roadmap.length > 0 &&
       (hit.payload.report.questions.length > 0 || hasStructuredStudyQuizzes(hit.payload.report))
      ) {
       const rep = hit.payload.report;
       const hitModel = hit.payload.model || hit.model || '';
       const stored: StoredJdRecordPayload = {
        kind,
        source,
        model: hitModel || undefined,
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
        title: rep.roleTitle || initialTitle,
        subtitle: makeSubtitle(rep),
        status: 'completed',
        payload: stored,
       });
       if (hit.payload.thoughts) {
        send({ type: 'thought', stage: 1, text: hit.payload.thoughts });
       }
       send({
        type: 'done',
        recordId,
        cached: true,
        stage1Cached: true,
        model: hitModel,
        report: rep,
        rawText: hit.payload.rawText || '',
        thoughts: hit.payload.thoughts || '',
        usage: hit.payload.usage,
        extractedSource: source,
       });
       return;
      }
     }

     let s1Rep: JdResearchReport | null = null;
     let s1RawText = '';
     let s1Thoughts = '';
     let s1Model = '';
     let s1Usage: AntigravityUsage | undefined;
     let stage1Cached = false;
     let lastInteractionId = '';

     // 2. Check Stage 1 (Profile + Roadmap) D1 cache: if hit, push Stage 1 preview immediately & jump to Stage 2
     if (!bypassCache) {
      const s1Hit = await readPromptCache<CachedStage1Payload>(stage1CacheKey);
      if (s1Hit?.payload?.report && s1Hit.payload.report.roadmap.length > 0) {
       s1Rep = s1Hit.payload.report;
       s1RawText = s1Hit.payload.rawText || '';
       s1Thoughts = s1Hit.payload.thoughts || '';
       s1Model = s1Hit.payload.model || s1Hit.model || '';
       s1Usage = s1Hit.payload.usage;
       stage1Cached = true;
       if (s1Thoughts) {
        send({ type: 'thought', stage: 1, text: s1Thoughts });
       }
       send({
        type: 'stage1',
        recordId,
        stage1Cached: true,
        model: s1Model,
        partialReport: s1Rep,
        thoughts: s1Thoughts,
        usage: s1Usage,
        progress: inspectJdStreamProgress(2, '', s1Rep, true),
       });
      }
     }

     // Save initial running record in D1
     await saveAiInterviewRecord({
      id: recordId,
      userId: user.id,
      kind: 'jd-research',
      title: s1Rep?.roleTitle || initialTitle,
      subtitle: makeSubtitle(s1Rep),
      status: 'running',
      payload: {
       kind,
       source,
       model: s1Model || undefined,
       cacheKey,
       stage1CacheKey,
       stage: s1Rep ? 2 : 1,
       stage1Cached,
       partialReport: s1Rep,
       stage1RawText: s1RawText,
       stage1Thoughts: s1Thoughts,
       stage1Usage: s1Usage,
       report: null,
       rawText: '',
       thoughts: s1Thoughts,
      },
     });

     // 3. Stream Stage 1 (Profile + Roadmap):
     // DeepSeek V4.1 Flash（思考）优先负责考点画像与复习路径（秒连、稳定、零 503），失败自动降级 Gemini 4 / 3.8 / 3.6
     if (!s1Rep) {
      activeStage = 1;
      activeStep = 'thinking';
      let s1ThoughtBuf = '';
      const makeSplitter1 = () =>
       createThinkJsonStreamSplitter({
        onThoughtDelta: td => {
         activeStep = 'thinking';
         s1ThoughtBuf += td;
         send({ type: 'thought', stage: 1, text: td });
        },
        onJsonDelta: (jd, fullJsonBuf) => {
         activeStep = 'output';
         send({
          type: 'delta',
          stage: 1,
          text: jd,
          chars: fullJsonBuf.length,
          progress: inspectJdStreamProgress(1, fullJsonBuf, null, false),
         });
        },
       });
      let splitter1 = makeSplitter1();

      const s1Res = await jdResearchModelStream({
       strategy: 'deepseek-first',
       systemPrompt: getJdResearchStage1SystemPrompt(),
       userInput: buildJdStage1Input({ kind, source }),
       maxTokens: 8192,
       geminiProxy,
       signal: req.signal,
       validate: txt => {
        const rep = parseAndEnrichJdReport(txt);
        return Boolean(rep && (rep.roadmap.length > 0 || rep.dimensions.length > 0));
       },
       onModel: m => {
        activeStep = 'thinking';
        send({ type: 'model', stage: 1, model: m });
       },
       onThoughtDelta: td => {
        activeStep = 'thinking';
        s1ThoughtBuf += td;
        send({ type: 'thought', stage: 1, text: td });
       },
       onTextDelta: td => {
        splitter1.push(td);
       },
       onReset: () => {
        s1ThoughtBuf = '';
        splitter1 = makeSplitter1();
        send({ type: 'reset', stage: 1 });
       },
      });

      splitter1.flush();
      const extracted1 = extractThoughtsAndJson(s1Res.text);
      s1RawText = extracted1.jsonRaw || s1Res.text;
      s1Thoughts = (s1ThoughtBuf.trim() || s1Res.thoughts || extracted1.thoughts || '').trim();
      s1Model = s1Res.model;
      s1Rep = parseAndEnrichJdReport(s1Res.text);

      if (!s1Rep || (!s1Rep.roadmap.length && !s1Rep.dimensions.length)) {
       throw new AntigravityError('考点画像与复习路径解析失败，请点击「一键重试」重新生成。', 502, 'parse_error');
      }

      await writePromptCache(
       stage1CacheKey,
       'jd-stage1',
       s1Model || 'deepseek-flash',
       { report: s1Rep, rawText: s1RawText, thoughts: s1Thoughts, model: s1Model, usage: s1Usage } satisfies CachedStage1Payload,
       7 * 24 * 3600_000,
      );

      await saveAiInterviewRecord({
       id: recordId,
       userId: user.id,
       kind: 'jd-research',
       title: s1Rep.roleTitle || initialTitle,
       subtitle: makeSubtitle(s1Rep),
       status: 'running',
       interactionId: lastInteractionId || undefined,
       payload: {
        kind,
        source,
        model: s1Model || undefined,
        cacheKey,
        stage1CacheKey,
        stage: 2,
        stage1Cached: false,
        partialReport: s1Rep,
        stage1RawText: s1RawText,
        stage1Thoughts: s1Thoughts,
        stage1Usage: s1Usage,
        report: null,
        rawText: '',
        thoughts: s1Thoughts,
       },
      });

      send({
       type: 'stage1',
       recordId,
       stage1Cached: false,
       model: s1Model,
       partialReport: s1Rep,
       thoughts: s1Thoughts,
       usage: s1Usage,
       progress: inspectJdStreamProgress(2, '', s1Rep, false),
      });
     }

     // If Stage 1 already contains both study quizzes and interview questions, finish directly
     if (s1Rep.questions.length > 0 && hasStructuredStudyQuizzes(s1Rep)) {
      await writePromptCache(
       cacheKey,
       'jd-research',
       s1Model || 'deepseek-flash',
       { report: s1Rep, rawText: s1RawText, thoughts: s1Thoughts, model: s1Model, usage: s1Usage } satisfies CachedJdPayload,
       7 * 24 * 3600_000,
      );
      await saveAiInterviewRecord({
       id: recordId,
       userId: user.id,
       kind: 'jd-research',
       title: s1Rep.roleTitle || initialTitle,
       subtitle: makeSubtitle(s1Rep),
       status: 'completed',
       interactionId: lastInteractionId || undefined,
       payload: {
        kind,
        source,
        model: s1Model || undefined,
        cacheKey,
        stage1CacheKey,
        stage: 2,
        cached: false,
        stage1Cached,
        report: s1Rep,
        rawText: s1RawText,
        thoughts: s1Thoughts,
        usage: s1Usage,
       },
      });
      send({
       type: 'done',
       recordId,
       cached: false,
       stage1Cached,
       model: s1Model,
       report: s1Rep,
       rawText: s1RawText,
       thoughts: s1Thoughts,
       usage: s1Usage,
       extractedSource: source,
      });
      return;
     }

     // 4. Stream Stage 2 (5-Type Study Quizzes per Roadmap Stage + Interview Question Bank):
     // Gemini / Antigravity Agent 优先出题；若 Gemini 不可用（503 繁忙 / 429 限流 / 超时 / 循环 / 解析失败）自动无缝切换 DeepSeek V4.1 Flash（思考）
     activeStage = 2;
     activeStep = 'agent_init';
     send({
      type: 'stage2_start',
      stage: 2,
      stage1Cached,
      model: 'Antigravity Agent',
      progress: inspectJdStreamProgress(2, '', s1Rep, stage1Cached),
     });

     const stage2Header = s1Thoughts ? '\n\n── 阶段二：按复习路径设计五题型学习题与面试题库 ──\n' : '';
     if (stage2Header) {
      send({ type: 'thought', stage: 2, text: stage2Header });
     }

     let s2ThoughtBuf = '';
     let s2TextOut = '';
     let s2Model = 'Antigravity Agent';
     let s2Usage: AntigravityUsage | undefined;
     let finalReport: JdResearchReport | null = null;

     const makeSplitter2 = () =>
      createThinkJsonStreamSplitter({
       onThoughtDelta: td => {
        activeStep = 'thinking';
        s2ThoughtBuf += td;
        send({ type: 'thought', stage: 2, text: td });
       },
       onJsonDelta: (jd, fullJsonBuf) => {
        activeStep = 'output';
        send({
         type: 'delta',
         stage: 2,
         text: jd,
         chars: fullJsonBuf.length,
         progress: inspectJdStreamProgress(2, fullJsonBuf, s1Rep, stage1Cached),
        });
       },
      });
     let splitter2 = makeSplitter2();
     const s2SystemPrompt = getJdResearchStage2SystemPrompt();
     const s2UserInput = buildJdStage2Input({ kind, source, stage1: s1Rep });
     let s2WroteAny = false;

     // 4a. Primary Stage 2 engine: Antigravity Agent (strict 16s first-step timeout & loop guard)
     try {
      send({ type: 'model', stage: 2, model: 'Antigravity Agent' });
      const agentRes = await streamAntigravityInteraction({
       systemInstruction: s2SystemPrompt,
       input: s2UserInput,
       maxTotalTokens: 32_000,
       firstStepTimeoutMs: 16_000,
       maxThoughtSteps: 3,
       geminiProxy,
       signal: req.signal,
       onCreated: ({ id, environmentId }) => {
        lastInteractionId = id;
        activeStep = 'thinking';
        send({ type: 'agent_ready', stage: 2, interactionId: id, environmentId });
       },
       onStep: st => {
        activeStep = st;
        send({ type: 'step', stage: 2, stepType: st });
       },
       onKeepAlive: () => {
        send({ type: 'ping', stage: 2, step: activeStep });
       },
       onThoughtDelta: td => {
        s2WroteAny = true;
        activeStep = 'thinking';
        s2ThoughtBuf += td;
        send({ type: 'thought', stage: 2, text: td });
       },
       onTextDelta: td => {
        s2WroteAny = true;
        splitter2.push(td);
       },
       onTextReset: () => {
        splitter2 = makeSplitter2();
        send({ type: 'reset', stage: 2, keepThoughts: true });
       },
      });

      splitter2.flush();
      const merged = mergeStage1AndStage2Report(s1Rep, agentRes.text);
      if (merged.questions.length > 0 || hasStructuredStudyQuizzes(merged)) {
       finalReport = merged;
       s2TextOut = agentRes.text;
       s2Usage = agentRes.usage;
       s2Model = 'Antigravity Agent';
       if (!s2ThoughtBuf.trim() && agentRes.thoughts) {
        s2ThoughtBuf = agentRes.thoughts;
       }
      } else {
       throw new AntigravityError('Agent 阶段二题库输出不完整，切换引擎继续。', 502, 'parse_error');
      }
     } catch (agentErr) {
      if (req.signal?.aborted) throw agentErr;
      // 4b. Fallback Stage 2: Gemini 3.8 Flash -> Gemini 3.6 Flash -> DeepSeek V4.1 Flash（思考）
      if (s2WroteAny) {
       s2ThoughtBuf = '';
       splitter2 = makeSplitter2();
       send({ type: 'reset', stage: 2 });
      }
      const fbRes = await jdResearchModelStream({
       strategy: 'gemini-then-deepseek',
       includeHydrogen: false,
       systemPrompt: s2SystemPrompt,
       userInput: s2UserInput,
       maxTokens: 16384,
       geminiProxy,
       signal: req.signal,
       validate: txt => {
        const m = mergeStage1AndStage2Report(s1Rep!, txt);
        return m.questions.length > 0 || hasStructuredStudyQuizzes(m);
       },
       onModel: m => {
        activeStep = 'thinking';
        send({ type: 'model', stage: 2, model: m });
       },
       onThoughtDelta: td => {
        activeStep = 'thinking';
        s2ThoughtBuf += td;
        send({ type: 'thought', stage: 2, text: td });
       },
       onTextDelta: td => {
        splitter2.push(td);
       },
       onReset: () => {
        s2ThoughtBuf = '';
        splitter2 = makeSplitter2();
        send({ type: 'reset', stage: 2 });
       },
      });
      splitter2.flush();
      s2TextOut = fbRes.text;
      s2Model = fbRes.model;
      if (!s2ThoughtBuf.trim() && fbRes.thoughts) {
       s2ThoughtBuf = fbRes.thoughts;
      }
      finalReport = mergeStage1AndStage2Report(s1Rep, fbRes.text);
     }

     const extracted2 = extractThoughtsAndJson(s2TextOut);
     const s2RawText = extracted2.jsonRaw || s2TextOut;
     const s2Thoughts = (s2ThoughtBuf.trim() || extracted2.thoughts || '').trim();
     const combinedModel =
      s1Model && s2Model && s1Model !== s2Model ? `${s1Model} + ${s2Model}` : s2Model || s1Model || ANTIGRAVITY_AGENT_ID;
     const combinedThoughts = [s1Thoughts, s2Thoughts ? (s1Thoughts ? `── 阶段二：按复习路径设计五题型学习题与面试题库 ──\n${s2Thoughts}` : s2Thoughts) : '']
      .filter(Boolean)
      .join('\n\n')
      .trim();
     const combinedRaw = [s1RawText, s2RawText].filter(Boolean).join('\n\n');
     const combinedUsage = combineUsage(s1Usage, s2Usage);

     if (finalReport && (finalReport.questions.length > 0 || hasStructuredStudyQuizzes(finalReport))) {
      await writePromptCache(
       cacheKey,
       'jd-research',
       combinedModel,
       {
        report: finalReport,
        rawText: combinedRaw,
        thoughts: combinedThoughts,
        model: combinedModel,
        usage: combinedUsage,
       } satisfies CachedJdPayload,
       7 * 24 * 3600_000,
      );
     }

     const stored: StoredJdRecordPayload = {
      kind,
      source,
      model: combinedModel,
      cacheKey,
      stage1CacheKey,
      stage: 2,
      cached: false,
      stage1Cached,
      partialReport: null,
      report: finalReport,
      rawText: combinedRaw,
      thoughts: combinedThoughts,
      usage: combinedUsage,
     };
     await saveAiInterviewRecord({
      id: recordId,
      userId: user.id,
      kind: 'jd-research',
      title: finalReport?.roleTitle || s1Rep.roleTitle || initialTitle,
      subtitle: makeSubtitle(finalReport || s1Rep),
      status: finalReport ? 'completed' : 'error',
      interactionId: lastInteractionId || undefined,
      payload: finalReport ? stored : { ...stored, error: '题库解析不完整，请点击「一键重试」继续生成。' },
     });

     send({
      type: 'done',
      recordId,
      cached: false,
      stage1Cached,
      model: combinedModel,
      report: finalReport,
      rawText: combinedRaw,
      thoughts: combinedThoughts,
      usage: combinedUsage,
      extractedSource: source,
     });
    } catch (e) {
     if (!req.signal?.aborted) {
      const msg =
       e instanceof AuthError || e instanceof AntigravityError
        ? e.message
        : '深度调研流式生成中断，请点击「一键重试」（若阶段一已完成将直接从阶段二继续）。';
      try {
       const prev = await getAiInterviewRecord<StoredJdRecordPayload>(user.id, recordId);
       await saveAiInterviewRecord({
        id: recordId,
        userId: user.id,
        kind: 'jd-research',
        title: prev?.title || initialTitle,
        subtitle: prev?.subtitle || '',
        status: 'error',
        payload: {
         ...(prev?.payload || { kind, source, report: null, rawText: '', thoughts: '' }),
         error: msg,
        },
        createdAt: prev?.createdAt,
       });
      } catch {}
      send({ type: 'error', recordId, error: msg });
     }
    } finally {
     clearInterval(pingTimer);
     if (!closed) {
      closed = true;
      try {
       controller.close();
      } catch {}
     }
    }
   },
   cancel() {
    closed = true;
   },
  });

  return new Response(stream, {
   headers: {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
   },
  });
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
