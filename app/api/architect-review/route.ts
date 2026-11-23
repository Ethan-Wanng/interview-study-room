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

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };

const DESIGN_SYSTEM = `你是顶级互联网大厂（P8/Staff 级别）系统设计与架构面试官。请对候选人的架构方案进行深度、务实、直击要害的技术评审（不要执行 shell 命令或写文件，直接基于专业架构经验作答，必要时可核查最新主流工程实践）。
输出结构请使用清晰 Markdown：
1. **综合评级与一句话结论**（给出 10 分制评分与当前水平定位，如 P6/P7/P8）
2. **方案亮点**（2–3 条具体肯定）
3. **关键漏洞与瓶颈拆解**（按严重程度列出 3–5 个具体问题：高并发热点、数据一致性、故障降级、容量估算、扩展性等，并给出可落地的修复架构）
4. **生产级改进架构要点**（给出关键链路或核心数据结构/SQL/伪代码要点）
5. **面试官深度追问（3 题）**（模拟真实二面/终面最刁钻的 3 个连环追问，引导候选人在下方继续作答）
语气专业、直接、有干货，用简体中文输出。`;

const MOCK_SYSTEM = `你是顶级互联网大厂（P8/Staff 级别）高阶技术面试官，正在进行真实的多轮深度技术面（不要执行 shell 命令或写文件，直接用简体中文输出）。
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
 usage?: AntigravityUsage;
 error?: string;
 interactionId?: string;
};

type StoredArchitectPayload = {
 mode: 'design' | 'mock';
 topic: string;
 cacheKey?: string;
 turns: StoredTurn[];
};

function signingSecret(): string {
 const e = env as unknown as Record<string, string | undefined>;
 return (e?.GEMINI_API_KEY || e?.ADMIN_BOOTSTRAP_HASH || 'isr-arch-sig').slice(0, 48);
}

async function signInteraction(userId: string, interactionId: string): Promise<string> {
 return (await sha256Hex([signingSecret(), userId, interactionId])).slice(0, 32);
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) throw new AuthError('请先登录后再使用高阶架构评审。', 401);
  if (user.is_guest) throw new AuthError('游客不支持调用 Gemini 模型，请登录后使用高阶架构评审。', 403);
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
  const previousInteractionId =
   typeof body.previousInteractionId === 'string' ? body.previousInteractionId.trim().slice(0, 160) : '';
  const prevSig = typeof body.prevSig === 'string' ? body.prevSig.trim() : '';
  const followupContext =
   typeof body.followupContext === 'string' ? body.followupContext.trim().slice(0, 3000) : '';
  const existingRid = typeof body.recordId === 'string' ? body.recordId.trim().slice(0, 80) : '';
  const geminiProxy = body.geminiProxy !== false;

  if (!answer) throw new AuthError('请填写你的架构方案或回答内容。');
  if (!previousInteractionId && !topic) throw new AuthError('请填写或选择一个架构题目。');

  if (previousInteractionId) {
   const expected = await signInteraction(user.id, previousInteractionId);
   if (prevSig !== expected) throw new AuthError('会话签名无效，请重新发起评审。', 403);
  }

  const existingRec = existingRid ? await getAiInterviewRecord<StoredArchitectPayload>(user.id, existingRid) : null;
  const recordId = existingRec ? existingRec.id : 'arch-' + crypto.randomUUID();
  const priorTurns: StoredTurn[] = Array.isArray(existingRec?.payload?.turns) ? existingRec!.payload.turns : [];
  const turnId = 't-' + Date.now();
  const modeLabel = mode === 'mock' ? '高阶模拟面试' : '系统设计评审';

  const promptInput = previousInteractionId
   ? `【候选人追问 / 补充回答】\n${answer}\n\n请延续上一轮评审语境继续点评与深入追问。`
   : followupContext
     ? `【${mode === 'mock' ? '高阶模拟面试题' : '系统设计题目'}】\n${topic}\n\n【上一轮对话摘要】\n${followupContext}\n\n【候选人最新追问 / 补充回答】\n${answer}\n\n请延续上一轮评审语境继续点评与深入追问。`
     : `【${mode === 'mock' ? '高阶模拟面试题' : '系统设计题目'}】\n${topic}\n\n【候选人方案 / 回答】\n${answer}`;

  // Turn 1 deterministic D1 prompt cache (0 Antigravity RPD cost on repeat submissions!)
  let cacheKey = '';
  if (!previousInteractionId && !followupContext) {
   cacheKey = 'arch:' + (await sha256Hex([mode, topic, answer]));
   const hit = await readPromptCache<{ text: string; thoughts: string; usage?: AntigravityUsage }>(cacheKey);
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
     title: topic || existingRec?.title || modeLabel,
     subtitle: modeLabel,
     status: 'completed',
     payload: { mode, topic: topic || existingRec?.payload?.topic || '', cacheKey, turns: [...priorTurns, doneTurn] },
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

  const started = await startAntigravityInteraction({
   systemInstruction: mode === 'mock' ? MOCK_SYSTEM : DESIGN_SYSTEM,
   input: promptInput,
   previousInteractionId: previousInteractionId || undefined,
   geminiProxy,
  });

  const sig = await signInteraction(user.id, started.id);
  const ckSig = cacheKey ? await signInteraction(user.id, cacheKey) : '';

  const runningTurn: StoredTurn = {
   id: turnId,
   userText: answer,
   status: 'running',
   text: '',
   thoughts: '',
   interactionId: started.id,
  };
  await saveAiInterviewRecord({
   id: recordId,
   userId: user.id,
   kind: 'architect',
   title: topic || existingRec?.title || modeLabel,
   subtitle: modeLabel,
   status: 'running',
   interactionId: started.id,
   payload: {
    mode,
    topic: topic || existingRec?.payload?.topic || '',
    cacheKey: cacheKey || existingRec?.payload?.cacheKey,
    turns: [...priorTurns, runningTurn],
   },
   createdAt: existingRec?.createdAt,
  });

  return Response.json(
   {
    recordId,
    turnId,
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
  return Response.json({ error: '架构评审服务暂时不可用，请重试。' }, { status: 503, headers: noCache });
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
  const expected = await signInteraction(user.id, id);
  if (sig !== expected) throw new AuthError('无权查询该评审任务。', 403);

  const polled = await pollAntigravityInteraction({ interactionId: id, geminiProxy });
  if (polled.status === 'completed' && polled.text.trim() && ck.startsWith('arch:') && ckSig) {
   const expectedCk = await signInteraction(user.id, ck);
   if (ckSig === expectedCk) {
    await writePromptCache(
     ck,
     'architect',
     ANTIGRAVITY_AGENT_ID,
     { text: polled.text, thoughts: polled.thoughts, usage: polled.usage },
     3 * 24 * 3600_000,
    );
   }
  }

  if (rid && (polled.status === 'completed' || polled.status === 'failed' || polled.status === 'cancelled')) {
   const prev = await getAiInterviewRecord<StoredArchitectPayload>(user.id, rid);
   if (prev && Array.isArray(prev.payload?.turns)) {
    const turns = prev.payload.turns.map(t =>
     t.interactionId === id || (t.status === 'running' && !t.interactionId)
      ? polled.status === 'completed'
        ? { ...t, status: 'done' as const, text: polled.text || '（未返回文本内容）', thoughts: polled.thoughts || '', usage: polled.usage, interactionId: id }
        : { ...t, status: 'error' as const, error: polled.error || '评审任务中断' }
      : t,
    );
    await saveAiInterviewRecord({
     id: rid,
     userId: user.id,
     kind: 'architect',
     title: prev.title,
     subtitle: prev.subtitle,
     status: polled.status === 'completed' ? 'completed' : 'error',
     interactionId: id,
     payload: { ...prev.payload, turns },
     createdAt: prev.createdAt,
    });
   }
  }

  return Response.json(polled, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status, headers: noCache });
  if (e instanceof AntigravityError) return Response.json({ error: e.message, code: e.code }, { status: e.status, headers: noCache });
  return Response.json({ error: '查询评审进度失败，请稍后重试。' }, { status: 503, headers: noCache });
 }
}
