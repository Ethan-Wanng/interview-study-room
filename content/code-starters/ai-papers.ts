import type {StarterMap} from './types';

// AI 阶段考与结业考论文/综合试卷中的代码题（ai-p1-c01、ai-p1-c02、ai-p2-c01、ai-p2-c02、ai-pf-c01、ai-pf-c02）作答框架。
export const aiPaperStarters:StarterMap={
'ai-p1-c01':{
python:String.raw`import asyncio
import random

# 假设已有 send(request, timeout) 函数，失败时抛出带 status 字段或超时的异常
async def call_with_retry(request, max_retries: int = 5):
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            # TODO 1：调用 send(request, 30) 发起单次请求（超时 30 秒），成功直接返回
            return ...
        except Exception as err:
            last_err = err
            # TODO 2：判断是否为可重试错误（429、5xx 或超时）；不可重试（如其他 4xx）或已达 max_retries 时直接抛出
            ...
            # TODO 3：计算指数退避时间（初始 1 秒、上限 30 秒）并加入随机抖动，await asyncio.sleep(...)
            ...
    # TODO 4：超过最大重试次数后抛出最后一次的错误
    ...`,
go:String.raw`// 假设已有 send(ctx, request, timeout) 函数，失败时返回的 err 可提取状态码或判断超时
func callWithRetry(ctx context.Context, request Request, maxRetries int) (Response, error) {
    var lastErr error
    for attempt := 0; attempt <= maxRetries; attempt++ {
        // TODO 1：调用 send(ctx, request, 30*time.Second) 发起单次请求（超时 30 秒），成功直接返回
        ...
        lastErr = err
        // TODO 2：判断是否为可重试错误（429、5xx 或超时）；不可重试（如其他 4xx）或已达 maxRetries 时直接返回 err
        ...
        // TODO 3：计算指数退避时间（初始 1 秒、上限 30 秒）并加入随机抖动，等待后重试
        ...
    }
    // TODO 4：超过最大重试次数后返回最后一次的错误
    return Response{}, ...
}`,
java:String.raw`// 假设已有 send(request, timeoutMs) 方法，失败时抛出带 status 字段的异常或超时异常
static Response callWithRetry(Request request, int maxRetries) throws Exception {
    Exception lastErr = null;
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // TODO 1：调用 send(request, 30_000) 发起单次请求（超时 30 秒），成功直接返回
            return ...;
        } catch (Exception err) {
            lastErr = err;
            // TODO 2：判断是否为可重试错误（429、5xx 或超时）；不可重试（如其他 4xx）或已达 maxRetries 时直接抛出
            ...
            // TODO 3：计算指数退避时间（初始 1 秒、上限 30 秒）并加入随机抖动，Thread.sleep(...)
            ...
        }
    }
    // TODO 4：超过最大重试次数后抛出最后一次的错误
    throw ...;
}`,
ts:String.raw`// 假设已有 send(request, timeoutMs) 函数，失败时抛出带 status 字段或 TimeoutError 的错误
async function callWithRetry(request: Request, maxRetries = 5): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // TODO 1：调用 await send(request, 30_000) 发起单次请求（超时 30 秒），成功直接返回
      return ...;
    } catch (err: any) {
      lastErr = err;
      // TODO 2：判断是否为可重试错误（429、5xx 或超时）；不可重试（如其他 4xx）或已达 maxRetries 时直接抛出
      ...
      // TODO 3：计算指数退避时间（初始 1 秒、上限 30 秒）并加入随机抖动，等待后重试
      ...
    }
  }
  // TODO 4：超过最大重试次数后抛出最后一次的错误
  throw ...;
}`,
rust:String.raw`use std::time::Duration;

// 假设已有 send(request, timeout) 异步函数，失败时返回带 status 和超时信息的 ApiError
async fn call_with_retry(request: &Request, max_retries: u32) -> Result<Response, ApiError> {
    let mut last_err = None;
    for attempt in 0..=max_retries {
        // TODO 1：调用 send(request, Duration::from_secs(30)).await 发起单次请求，成功直接返回
        match ... {
            Ok(resp) => return Ok(resp),
            Err(err) => {
                // TODO 2：判断是否为可重试错误（429、5xx 或超时）；不可重试（如其他 4xx）或已达 max_retries 时直接返回 Err(err)
                ...
                last_err = Some(err);
                // TODO 3：计算指数退避时间（初始 1 秒、上限 30 秒）并加入随机抖动，sleep 后重试
                ...
            }
        }
    }
    // TODO 4：超过最大重试次数后返回最后一次的错误
    Err(...)
}`,
},

'ai-p1-c02':{
python:String.raw`from dataclasses import dataclass
import math

@dataclass
class Doc:
    id: str
    text: str
    vector: list[float]

@dataclass
class ScoredDoc:
    id: str
    score: float

def search(query: str, docs: list[Doc], k: int) -> list[ScoredDoc]:
    # TODO 1：调用 embed(query) 生成查询向量并计算其模长（范数）；若为零向量返回 []
    q = ...
    ...
    scored: list[ScoredDoc] = []
    for d in docs:
        # TODO 2：跳过零向量文档，并计算 q 与 d.vector 的余弦相似度（点积除以范数之积）
        ...
        # TODO 3：过滤掉相似度低于 0.3 的结果，将 ScoredDoc(id, score) 加入 scored
        ...
    # TODO 4：按 score 降序排序并截取前 k 个
    return ...`,
go:String.raw`type Doc struct {
    ID     string
    Text   string
    Vector []float64
}

type ScoredDoc struct {
    ID    string
    Score float64
}

func search(query string, docs []Doc, k int) []ScoredDoc {
    // TODO 1：调用 embed(query) 生成查询向量并计算其模长（范数）；若为零向量直接返回 nil
    q := ...
    ...
    var scored []ScoredDoc
    for _, d := range docs {
        // TODO 2：跳过零向量文档，并计算 q 与 d.Vector 的余弦相似度（点积除以范数之积）
        ...
        // TODO 3：过滤掉相似度低于 0.3 的结果，将 ScoredDoc 追加到 scored
        ...
    }
    // TODO 4：按 Score 降序排序并截取前 k 个（注意 k 大于 len(scored) 的边界）
    return ...
}`,
java:String.raw`record Doc(String id, String text, double[] vector) {}
record ScoredDoc(String id, double score) {}

static List<ScoredDoc> search(String query, List<Doc> docs, int k) {
    // TODO 1：调用 embed(query) 生成查询向量并计算其模长（范数）；若为零向量返回空列表
    double[] q = ...;
    ...
    List<ScoredDoc> scored = new ArrayList<>();
    for (Doc d : docs) {
        // TODO 2：跳过零向量文档，并计算 q 与 d.vector() 的余弦相似度（点积除以范数之积）
        ...
        // TODO 3：过滤掉相似度低于 0.3 的结果，加入 scored
        ...
    }
    // TODO 4：按 score 降序排序并截取前 k 个
    return ...;
}`,
ts:String.raw`type Doc = { id: string; text: string; vector: number[] };
type ScoredDoc = { id: string; score: number };

async function search(query: string, docs: Doc[], k: number): Promise<ScoredDoc[]> {
  // TODO 1：调用 await embed(query) 生成查询向量并计算其范数；若为零向量返回 []
  const q = ...;
  ...
  const scored: ScoredDoc[] = [];
  for (const d of docs) {
    // TODO 2：跳过零向量文档，并计算 q 与 d.vector 的余弦相似度（点积除以范数之积）
    ...
    // TODO 3：过滤掉相似度低于 0.3 的结果，加入 scored
    ...
  }
  // TODO 4：按 score 降序排序并截取前 k 个
  return ...;
}`,
rust:String.raw`struct Doc {
    id: String,
    text: String,
    vector: Vec<f64>,
}

struct ScoredDoc {
    id: String,
    score: f64,
}

fn search(query: &str, docs: &[Doc], k: usize) -> Vec<ScoredDoc> {
    // TODO 1：调用 embed(query) 生成查询向量并计算其范数；若为零向量返回空 Vec
    let q = ...;
    ...
    let mut scored = Vec::new();
    for d in docs {
        // TODO 2：跳过零向量文档，并计算 q 与 d.vector 的余弦相似度（点积除以范数之积）
        ...
        // TODO 3：过滤掉相似度低于 0.3 的结果，加入 scored
        ...
    }
    // TODO 4：按 score 降序排序（f64 用 partial_cmp）并截取前 k 个
    ...
}`,
},

'ai-p2-c01':{
python:String.raw`import json

# tools 形如 {name: {"def": ..., "run": fn}}；llm(messages, tool_defs) 返回 {"text": ...} 或 {"toolCall": {"name": ..., "args": ...}}
def run_agent(task: str, tools: dict, llm) -> str:
    messages = [{"role": "user", "content": task}]
    # TODO 1：收集所有工具定义 tool_defs，并设置最多执行 8 步的循环
    tool_defs = ...
    for step in ...:
        out = llm(messages, tool_defs)
        # TODO 2：若没有 toolCall，直接返回最终文本；否则先把模型调用追加到 messages
        ...
        # TODO 3：按 name 查找并执行工具；未知工具或执行异常时构造错误信息作为结果（不向外抛出）
        ...
        # TODO 4：把工具结果（JSON 字符串）以 tool 角色追加到 messages，继续下一轮
        ...
    return "已达到步数上限，任务未完成。"`,
go:String.raw`// Tool{Def, Run(args)}；llm 返回 LLMOut{Text, ToolCall *ToolCall}，ToolCall{Name, Args}
func runAgent(task string, tools map[string]Tool, llm func([]Message, []ToolDef) (LLMOut, error)) (string, error) {
    messages := []Message{{Role: "user", Content: task}}
    // TODO 1：收集所有工具定义 toolDefs，并设置最多执行 8 步的循环
    var toolDefs []ToolDef
    ...
    for step := 0; step < ...; step++ {
        out, err := llm(messages, toolDefs)
        if err != nil {
            return "", err
        }
        // TODO 2：若 out.ToolCall == nil，直接返回 out.Text；否则先把模型调用追加到 messages
        ...
        // TODO 3：按 name 查找并执行工具；未知工具或执行出错时构造错误信息作为结果（不向上返回）
        ...
        // TODO 4：把工具结果（JSON 字符串）以 tool 角色追加到 messages，继续下一轮
        ...
    }
    return "已达到步数上限，任务未完成。", nil
}`,
java:String.raw`// Tool(def, run(args))；LLMOut(text, toolCall)，ToolCall(name, args)
static String runAgent(String task, Map<String, Tool> tools, LLM llm) throws Exception {
    List<Message> messages = new ArrayList<>();
    messages.add(Message.user(task));
    // TODO 1：收集所有工具定义 toolDefs，并设置最多执行 8 步的循环
    List<ToolDef> toolDefs = ...;
    for (int step = 0; step < ...; step++) {
        LLMOut out = llm.call(messages, toolDefs);
        // TODO 2：若 out.toolCall() 为 null，直接返回 out.text()；否则先把模型调用追加到 messages
        ...
        // TODO 3：按 name 查找并执行工具；未知工具或执行抛异常时构造错误信息作为结果（不向外抛出）
        ...
        // TODO 4：把工具结果（JSON 字符串）以 tool 角色追加到 messages，继续下一轮
        ...
    }
    return "已达到步数上限，任务未完成。";
}`,
ts:String.raw`type Tool = { def: ToolDef; run: (args: any) => Promise<any> };
type LLMOut = { text?: string; toolCall?: { name: string; args: any } };

async function runAgent(
  task: string,
  tools: Record<string, Tool>,
  llm: (messages: Message[], toolDefs: ToolDef[]) => Promise<LLMOut>,
): Promise<string> {
  const messages: Message[] = [{ role: "user", content: task }];
  // TODO 1：收集所有工具定义 toolDefs，并设置最多执行 8 步的循环
  const toolDefs = ...;
  for (let step = 0; step < ...; step++) {
    const out = await llm(messages, toolDefs);
    // TODO 2：若没有 out.toolCall，直接返回 out.text；否则先把模型调用追加到 messages
    ...
    // TODO 3：按 name 查找并执行工具；未知工具或执行抛错时构造错误信息作为结果（不向外抛出）
    ...
    // TODO 4：把工具结果（JSON 字符串）以 tool 角色追加到 messages，继续下一轮
    ...
  }
  return "已达到步数上限，任务未完成。";
}`,
rust:String.raw`use std::collections::HashMap;

// Tool { def, run(args) }；LLMOut { text: Option<String>, tool_call: Option<ToolCall> }
async fn run_agent(task: &str, tools: &HashMap<String, Tool>, llm: &LLM) -> Result<String, Error> {
    let mut messages = vec![Message::user(task)];
    // TODO 1：收集所有工具定义 tool_defs，并设置最多执行 8 步的循环
    let tool_defs: Vec<_> = ...;
    for _step in ... {
        let out = llm.call(&messages, &tool_defs).await?;
        // TODO 2：若没有 tool_call，直接返回最终文本；否则先把模型调用追加到 messages
        ...
        // TODO 3：按 name 查找并执行工具；未知工具或执行返回 Err 时构造错误信息作为结果（不向外传播）
        ...
        // TODO 4：把工具结果（JSON 字符串）以 tool 角色追加到 messages，继续下一轮
        ...
    }
    Ok("已达到步数上限，任务未完成。".to_string())
}`,
},

'ai-p2-c02':{
python:String.raw`import asyncio
from dataclasses import dataclass

@dataclass
class Case:
    id: str
    question: str
    reference: str
    should_refuse: bool

async def evaluate(cases: list[Case], answer_fn, judge_fn) -> dict:
    results = [None] * len(cases)

    async def run_one(i: int, c: Case) -> None:
        try:
            # TODO 1：调用 answer_fn(c.question)；若 should_refuse 为 True 按包含“未找到/无法回答”记 1/0，否则用 judge_fn 打分（限 0~1）
            ...
        except Exception as err:
            # TODO 2：单个用例异常时记 0 分并保留错误信息
            ...

    # TODO 3：控制并发不超过 5（如固定数量 worker 或信号量）并发跑完所有 cases
    ...
    # TODO 4：分别统计总平均、拒答类和普通类平均分（处理空列表），并找出得分最低的 5 个用例 id
    return ...`,
go:String.raw`type Case struct {
    ID           string
    Question     string
    Reference    string
    ShouldRefuse bool
}

type caseResult struct {
    id     string
    refuse bool
    score  float64
    err    string
}

type EvalSummary struct {
    Average, RefuseAverage, NormalAverage float64
    Worst                                 []string
    Errors                                []caseResult
}

func evaluate(cases []Case, answerFn func(string) (string, error), judgeFn func(string, string, string) (float64, error)) EvalSummary {
    results := make([]caseResult, len(cases))
    // TODO 1：用固定数量（最多 5 个）的 worker 并发执行所有用例
    ...
        // TODO 2：调用 answerFn；若 ShouldRefuse 为 true 按包含“未找到/无法回答”记 1/0，否则用 judgeFn 打分（限 0~1）
        // TODO 3：单个用例出错时记 0 分并记录错误信息
        ...
    // TODO 4：分别统计总平均、拒答类和普通类平均分（处理空集合），并找出得分最低的 5 个用例 ID
    return EvalSummary{}
}`,
java:String.raw`record Case(String id, String question, String reference, boolean shouldRefuse) {}
record CaseResult(String id, boolean refuse, double score, String error) {}
record EvalSummary(double average, double refuseAverage, double normalAverage, List<String> worst, List<CaseResult> errors) {}

static EvalSummary evaluate(List<Case> cases, AnswerFn answerFn, JudgeFn judgeFn) throws InterruptedException {
    CaseResult[] results = new CaseResult[cases.size()];
    // TODO 1：用固定上限为 5 的并发池/信号量执行所有用例
    ...
        // TODO 2：调用 answerFn；若 shouldRefuse 为 true 按包含“未找到/无法回答”记 1/0，否则用 judgeFn 打分（限 0~1）
        // TODO 3：捕获单个用例异常，记 0 分并记录错误信息
        ...
    // TODO 4：分别统计总平均、拒答类和普通类平均分（处理空列表），并找出得分最低的 5 个用例 id
    return ...;
}`,
ts:String.raw`type Case = { id: string; question: string; reference: string; shouldRefuse: boolean };
type CaseResult = { id: string; refuse: boolean; score: number; error?: string };

async function evaluate(
  cases: Case[],
  answerFn: (question: string) => Promise<string>,
  judgeFn: (question: string, reference: string, answer: string) => Promise<number>,
) {
  const results: CaseResult[] = new Array(cases.length);
  let next = 0;

  async function worker() {
    while (next < cases.length) {
      const i = next++;
      const c = cases[i];
      try {
        // TODO 1：调用 answerFn(c.question)；若 shouldRefuse 为 true 按包含“未找到/无法回答”记 1/0，否则用 judgeFn 打分（限 0~1）
        ...
      } catch (e) {
        // TODO 2：单个用例出错时记 0 分并记录错误信息
        ...
      }
    }
  }

  // TODO 3：启动最多 5 个并发 worker 并等待全部完成（注意 cases 为空）
  ...
  // TODO 4：分别统计总平均、拒答类和普通类平均分（处理空集合），并找出得分最低的 5 个用例 id
  return ...;
}`,
rust:String.raw`struct Case {
    id: String,
    question: String,
    reference: String,
    should_refuse: bool,
}

struct CaseResult {
    id: String,
    refuse: bool,
    score: f64,
    error: Option<String>,
}

struct EvalSummary {
    average: f64,
    refuse_average: f64,
    normal_average: f64,
    worst: Vec<String>,
    errors: Vec<CaseResult>,
}

async fn evaluate(cases: &[Case], answer_fn: &AnswerFn, judge_fn: &JudgeFn) -> EvalSummary {
    // TODO 1：控制并发不超过 5，并发执行每个用例（如固定 worker 或信号量）
    ...
        // TODO 2：调用 answer_fn；若 should_refuse 为 true 按包含“未找到/无法回答”记 1/0，否则用 judge_fn 打分（限 0~1）
        // TODO 3：单个用例返回 Err 时记 0 分并保留错误信息
        ...
    // TODO 4：分别统计总平均、拒答类和普通类平均分（处理空切片），并找出得分最低的 5 个用例 id
    ...
}`,
},

'ai-pf-c01':{
python:String.raw`def fit_history(system: str, history: list[dict], budget: int, count_tokens) -> list[dict]:
    # TODO 1：计算 system 与最新一条消息（history[-1]）的 token 开销；超出 budget 时抛出异常
    ...
    # TODO 2：从倒数第二条往最旧累加，在不超 budget 时保留完整消息，并统计被丢弃的消息数
    kept = ...
    ...
    # TODO 3：若有消息被丢弃，构造省略提示并计入预算；若超预算则继续丢弃较旧消息（保留最新一条）并更新 N
    ...
    # TODO 4：按顺序返回 [system 消息, (可选省略提示), ...保留的历史消息]
    return ...`,
go:String.raw`type Message struct {
    Role    string
    Content string
}

func fitHistory(system string, history []Message, budget int, countTokens func(string) int) ([]Message, error) {
    // TODO 1：计算 system 与最新一条消息的 token 开销；超出 budget 时返回错误
    ...
    // TODO 2：从倒数第二条往最旧累加，在不超 budget 时保留完整消息，并统计被丢弃的消息数
    ...
    // TODO 3：若有消息被丢弃，构造省略提示并计入预算；若超预算则继续丢弃较旧消息（保留最新一条）并更新 N
    ...
    // TODO 4：按顺序组装并返回 [system 消息, (可选省略提示), ...保留的历史消息]
    return nil, nil
}`,
java:String.raw`record Message(String role, String content) {}

static List<Message> fitHistory(String system, List<Message> history, int budget, ToIntFunction<String> countTokens) {
    // TODO 1：计算 system 与最新一条消息的 token 开销；超出 budget 时抛出异常
    ...
    // TODO 2：从倒数第二条往最旧累加，在不超 budget 时保留完整消息，并统计被丢弃的消息数
    ...
    // TODO 3：若有消息被丢弃，构造省略提示并计入预算；若超预算则继续丢弃较旧消息（保留最新一条）并更新 N
    ...
    // TODO 4：按顺序返回 [system 消息, (可选省略提示), ...保留的历史消息]
    return ...;
}`,
ts:String.raw`type Message = { role: string; content: string };

function fitHistory(
  system: string,
  history: Message[],
  budget: number,
  countTokens: (text: string) => number,
): Message[] {
  // TODO 1：计算 system 与最新一条消息的 token 开销；超出 budget 时抛出 Error
  ...
  // TODO 2：从倒数第二条往最旧累加，在不超 budget 时保留完整消息，并统计被丢弃的消息数
  ...
  // TODO 3：若有消息被丢弃，构造省略提示并计入预算；若超预算则继续丢弃较旧消息（保留最新一条）并更新 N
  ...
  // TODO 4：按顺序返回 [system 消息, (可选省略提示), ...保留的历史消息]
  return ...;
}`,
rust:String.raw`struct Message {
    role: String,
    content: String,
}

fn fit_history(
    system: &str,
    history: &[Message],
    budget: usize,
    count_tokens: impl Fn(&str) -> usize,
) -> Result<Vec<Message>, String> {
    // TODO 1：计算 system 与最新一条消息的 token 开销；超出 budget 时返回 Err
    ...
    // TODO 2：从倒数第二条往最旧累加，在不超 budget 时保留完整消息，并统计被丢弃的消息数
    ...
    // TODO 3：若有消息被丢弃，构造省略提示并计入预算；若超预算则继续丢弃较旧消息（保留最新一条）并更新 N
    ...
    // TODO 4：按顺序组装并返回 [system 消息, (可选省略提示), ...保留的历史消息]
    ...
}`,
},

'ai-pf-c02':{
python:String.raw`import asyncio
import hashlib
import logging

cache: dict[str, tuple[str, float]] = {}  # key -> (value, expires_at)
inflight: dict[str, asyncio.Task] = {}    # key -> 进行中的异步任务
FALLBACK = "抱歉，服务暂时繁忙，请稍后再试。"

async def smart_answer(question: str) -> str:
    # TODO 1：规范化 question 并计算哈希作为 cache key；命中未过期（TTL 1 小时）缓存时直接返回
    key = ...
    ...
    # TODO 2：检查 inflight 进行中请求表以合并同一问题的并发调用，并在结束时清理
    ...
        # TODO 3：先以 8 秒超时调用 primary(question)，失败时记日志并降级调用 5 秒超时的 backup(question)
        ...
        # TODO 4：主备都失败时记录错误并返回 FALLBACK（不缓存）；成功时写入 cache（TTL 1 小时）并返回
        ...
    return ...`,
go:String.raw`const fallbackText = "抱歉，服务暂时繁忙，请稍后再试。"

// cache 保存结果与过期时间；inflight 合并同一问题的并发请求
func smartAnswer(ctx context.Context, question string) string {
    // TODO 1：规范化 question 并计算哈希作为 cache key；命中未过期（TTL 1 小时）缓存时直接返回
    key := ...
    ...
    // TODO 2：通过 inflight / singleflight 合并同 key 并发请求，并在结束时清理记录
    ...
    // TODO 3：先以 8 秒超时调用 primary(ctx, question)，失败时记日志并降级调用 5 秒超时的 backup(ctx, question)
    ...
    // TODO 4：主备都失败时记录错误并返回 fallbackText（不缓存）；成功时写入 cache（TTL 1 小时）并返回
    return ""
}`,
java:String.raw`static final String FALLBACK = "抱歉，服务暂时繁忙，请稍后再试。";

// cache 保存结果与过期时间；inflight 合并同一问题的并发请求
static CompletableFuture<String> smartAnswer(String question) {
    // TODO 1：规范化 question 并计算哈希作为 cache key；命中未过期（TTL 1 小时）缓存时直接返回
    String key = ...;
    ...
    // TODO 2：通过 inflight 表合并同 key 并发请求，并在完成后移除记录
    ...
    // TODO 3：先以 8 秒超时调用 primary(question)，失败时记日志并降级调用 5 秒超时的 backup(question)
    ...
    // TODO 4：主备都失败时记录错误并返回 FALLBACK（不缓存）；成功时写入 cache（TTL 1 小时）并返回
    return ...;
}`,
ts:String.raw`const cache = new Map<string, { value: string; expires: number }>();
const inflight = new Map<string, Promise<string>>();
const FALLBACK = "抱歉，服务暂时繁忙，请稍后再试。";

async function smartAnswer(question: string): Promise<string> {
  // TODO 1：规范化 question 并计算哈希作为 cache key；命中未过期（TTL 1 小时）缓存时直接返回
  const key = ...;
  ...
  // TODO 2：检查 inflight 进行中请求表以合并同一问题的并发调用，并在 finally 中清理
  ...
    // TODO 3：先以 8 秒超时调用 primary(question)，失败时记日志并降级调用 5 秒超时的 backup(question)
    ...
    // TODO 4：主备都失败时记录错误并返回 FALLBACK（不缓存）；成功时写入 cache（TTL 1 小时）并返回
    ...
  return ...;
}`,
rust:String.raw`const FALLBACK: &str = "抱歉，服务暂时繁忙，请稍后再试。";

// state 中维护带过期时间的 cache 与合并并发请求的 inflight 表
async fn smart_answer(state: &AppState, question: &str) -> String {
    // TODO 1：规范化 question 并计算哈希作为 cache key；命中未过期（TTL 1 小时）缓存时直接返回
    let key = ...;
    ...
    // TODO 2：通过 inflight 表合并同一 key 的并发请求，并在结束时清理
    ...
    // TODO 3：先以 8 秒超时调用 primary(question)，失败时记日志并降级调用 5 秒超时的 backup(question)
    ...
    // TODO 4：主备都失败时记录错误并返回 FALLBACK（不缓存）；成功时写入 cache（TTL 1 小时）并返回
    ...
}`,
},
};
