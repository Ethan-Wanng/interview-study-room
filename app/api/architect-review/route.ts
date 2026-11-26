import { AuthError, assertSameOrigin, rateLimit, sessionUser } from '@/lib/site-auth';
import { prepareDeepModelExecution } from '@/lib/deep-model-route';
import { runSelectedDeepModelStream } from '@/lib/gemini';
import { readPromptCache, sha256Hex, writePromptCache } from '@/lib/prompt-cache';
import { getAiInterviewRecord, saveAiInterviewRecord } from '@/lib/ai-interview-records';
import type { AiTokenUsage } from '@/lib/jd-research-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

const DESIGN_SYSTEM = `你是顶级互联网大厂（P8/Staff 级别）系统设计与架构面试官。请对候选人的架构方案进行深度、务实、直击要害的技术评审，直接基于专业架构经验作答。
输出结构请使用清晰 Markdown：
1. **综合评级与一句话结论**（给出 10 分制评分与当前水平定位，如 P6/P7/P8）
2. **方案亮点**（2–3 条具体肯定）
3. **关键漏洞与瓶颈拆解**（按严重程度列出 3–5 个具体问题：高并发热点、数据一致性、故障降级、容量估算、扩展性等，并给出可落地的修复架构）
4. **生产级改进架构要点**（给出关键链路或核心数据结构/SQL/伪代码要点）
5. **面试官深度追问（3 题）**（模拟真实二面/终面最刁钻的 3 个连环追问，引导候选人在下方继续作答）
语气专业、直接、有干货，用简体中文输出。`;

const MOCK_SYSTEM = `你是顶级互联网大厂（P8/Staff 级别）高阶技术面试官，正在进行真实的多轮深度技术面，直接用简体中文输出。
针对候选人的回答：
1. 先精准点评回答的**深度、准确度与遗漏边界**（指出模糊或背八股的地方，给出 10 分制当轮得分）；
2. 补充生产级底层原理或关键取舍（带具体数字/场景，简洁硬核）；
3. 顺着候选人回答中最薄弱或最值得深挖的点，抛出 **1–2 个层层递进的真实追问**，等待候选人下一轮继续回答。`;

type StoredTurn = {
 id: string;
 userText: string;
 status: 'running' | 'done' | 'error';
 text: string;
 thoughts: string;
 cached?: boolean;
 usage?: AiTokenUsage;
 error?: string;
 interactionId?: string;
};

type StoredArchitectPayload = {
 mode: 'design' | 'mock';
 topic: string;
 cacheKey?: string;
 turns: StoredTurn[];
};

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用高阶架构评审。', 401);
  if (user.is_guest) throw new AuthError('游客暂不支持高阶架构评审，请登录后使用。', 403);
  await rateLimit('architect:' + user.id, 30);

  const raw = await req.text();
  if (raw.length > 32_000) throw new AuthError('输入内容过长，请精简后再提交。');
  let body: Record<string, unknown>;
  try {
   body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
   throw new AuthError('请求格式无效。');
  }

  const mode = body.mode === 'mock' ? 'mock' : 'design';
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) : '';
  const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 12_000) : '';
  const followupContext =
   typeof body.followupContext === 'string' ? body.followupContext.trim().slice(0, 3000) : '';
  const existingRid = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';

  if (!answer) throw new AuthError('请填写你的架构方案或回答内容。');

  const existingRec = existingRid ? await getAiInterviewRecord<StoredArchitectPayload>(user.id, existingRid) : null;
  const resolvedTopic = topic || existingRec?.payload?.topic || existingRec?.title || '';
  if (!resolvedTopic) throw new AuthError('请填写或选择一个架构题目。');

  const recordId = existingRec ? existingRec.id : 'arch-' + crypto.randomUUID();
  const priorTurns: StoredTurn[] = Array.isArray(existingRec?.payload?.turns) ? existingRec!.payload.turns : [];
  const turnId = 't-' + Date.now();
  const modeLabel = mode === 'mock' ? '高阶模拟面试' : '系统设计评审';

  const exec = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel, { chargeSiteQuota: false });

  const donePrior = priorTurns.filter(t => t.status === 'done' && t.text.trim());
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  donePrior.forEach((t, idx) => {
   messages.push({
    role: 'user',
    content:
     idx === 0
      ? `【${mode === 'mock' ? '高阶模拟面试题' : '系统设计题目'}】\n${resolvedTopic}\n\n【候选人方案 / 回答】\n${t.userText}`
      : `【候选人追问 / 补充回答】\n${t.userText}\n\n请延续上一轮评审语境继续点评与深入追问。`,
   });
   messages.push({ role: 'assistant', content: t.text });
  });

  if (donePrior.length > 0) {
   messages.push({
    role: 'user',
    content: `【候选人追问 / 补充回答】\n${answer}\n\n请延续上一轮评审语境继续点评与深入追问。`,
   });
  } else if (followupContext) {
   messages.push({
    role: 'user',
    content: `【${mode === 'mock' ? '高阶模拟面试题' : '系统设计题目'}】\n${resolvedTopic}\n\n【上一轮对话摘要】\n${followupContext}\n\n【候选人最新追问 / 补充回答】\n${answer}\n\n请延续上一轮评审语境继续点评与深入追问。`,
   });
  } else {
   messages.push({
    role: 'user',
    content: `【${mode === 'mock' ? '高阶模拟面试题' : '系统设计题目'}】\n${resolvedTopic}\n\n【候选人方案 / 回答】\n${answer}`,
   });
  }

  let cacheKey = '';
  if (!donePrior.length && !followupContext && !exec.custom) {
   cacheKey = 'arch:' + (await sha256Hex([mode, resolvedTopic, answer, exec.model, exec.thinkingLevel]));
   const hit = await readPromptCache<{ text: string; thoughts: string; usage?: AiTokenUsage }>(cacheKey);
   if (hit?.payload?.text) {
    const doneTurn: StoredTurn = {
     id: turnId,
     userText: answer,
     status: 'done',
     text: hit.payload.text,
     thoughts: hit.payload.thoughts || '',
     cached: true,
     usage: hit.payload.usage,
    };
    await saveAiInterviewRecord({
     id: recordId,
     userId: user.id,
     kind: 'architect',
     title: resolvedTopic || modeLabel,
     subtitle: modeLabel,
     status: 'completed',
     payload: { mode, topic: resolvedTopic, cacheKey, turns: [...priorTurns, doneTurn] },
     createdAt: existingRec?.createdAt,
    });
    return Response.json(
     {
      recordId,
      turnId,
      status: 'completed',
      cached: true,
      text: hit.payload.text,
      thoughts: hit.payload.thoughts || '',
      usage: hit.payload.usage,
     },
     { headers: noCache },
    );
   }
  }

  const charged = await prepareDeepModelExecution(req, user, body.model, body.thinkingLevel);
  let out: Awaited<ReturnType<typeof runSelectedDeepModelStream>>;
  try {
   out = await runSelectedDeepModelStream({
    model: charged.model,
    thinkingLevel: charged.thinkingLevel,
    custom: charged.custom,
    systemPrompt: mode === 'mock' ? MOCK_SYSTEM : DESIGN_SYSTEM,
    messages,
    maxTokens: 8192,
    signal: req.signal,
   });
  } catch (err) {
   await charged.refund();
   throw err;
  }

  if (cacheKey && out.text.trim()) {
   await writePromptCache(
    cacheKey,
    'architect',
    out.model,
    { text: out.text, thoughts: out.thoughts, usage: out.usage },
    3 * 24 * 3600_000,
   );
  }

  const doneTurn: StoredTurn = {
   id: turnId,
   userText: answer,
   status: 'done',
   text: out.text,
   thoughts: out.thoughts,
   usage: out.usage,
  };
  await saveAiInterviewRecord({
   id: recordId,
   userId: user.id,
   kind: 'architect',
   title: resolvedTopic || modeLabel,
   subtitle: modeLabel,
   status: 'completed',
   payload: {
    mode,
    topic: resolvedTopic,
    cacheKey: cacheKey || existingRec?.payload?.cacheKey,
    turns: [...priorTurns, doneTurn],
   },
   createdAt: existingRec?.createdAt,
  });

  return Response.json(
   {
    recordId,
    turnId,
    status: 'completed',
    cached: false,
    text: out.text,
    thoughts: out.thoughts,
    model: out.model,
    usage: out.usage,
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '架构评审服务暂时不可用，请重试。' }, { status: 503, headers: noCache });
 }
}

export async function GET(req: Request) {
 try {
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录。', 401);

  const url = new URL(req.url);
  const rid = (url.searchParams.get('rid') || '').trim();
  if (!rid) throw new AuthError('缺少任务标识。', 400);
  const rec = await getAiInterviewRecord<StoredArchitectPayload>(user.id, rid);
  if (!rec) throw new AuthError('未找到该评审记录。', 404);
  const lastTurn = rec.payload?.turns?.[rec.payload.turns.length - 1];
  if (rec.status === 'completed' && lastTurn) {
   return Response.json(
    {
     status: 'completed',
     text: lastTurn.text,
     thoughts: lastTurn.thoughts,
     usage: lastTurn.usage,
    },
    { headers: noCache },
   );
  }
  return Response.json(
   {
    status: rec.status === 'error' ? 'failed' : 'in_progress',
    error: lastTurn?.error || '',
   },
   { headers: noCache },
  );
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询评审进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
