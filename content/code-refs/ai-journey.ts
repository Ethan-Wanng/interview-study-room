// AI 学习关卡里代码题的其他语言写法（主写法 Python 在题目自身的 reference 里）。
// 用 String.raw 是为了让代码里的 \n、\d 等原样保留。
import type {CodeRefEntry} from './index';

export const aiJourneyRefs:Record<string,CodeRefEntry>={
'calling-12':{base:'python',
go:String.raw`var messages []Message // Message{Role, Content}

func chat(userInput string) (string, error) {
    messages = append(messages, Message{Role: "user", Content: userInput})
    reply, err := llm(messages) // 每次都把完整历史发给模型
    if err != nil {
        return "", err
    }
    messages = append(messages, Message{Role: "assistant", Content: reply})
    return reply, nil
}`,
java:String.raw`record Message(String role, String content) {}

static final List<Message> messages = new ArrayList<>();

static String chat(String userInput) {
    messages.add(new Message("user", userInput));
    String reply = llm(messages); // 每次都把完整历史发给模型
    messages.add(new Message("assistant", reply));
    return reply;
}`,
ts:String.raw`type Message = { role: "user" | "assistant"; content: string };
const messages: Message[] = [];

async function chat(userInput: string): Promise<string> {
  messages.push({ role: "user", content: userInput });
  const reply = await llm(messages); // 每次都把完整历史发给模型
  messages.push({ role: "assistant", content: reply });
  return reply;
}`,
rust:String.raw`struct Message {
    role: String,
    content: String,
}

// 用结构体保存历史，避免全局可变变量
struct Chat {
    messages: Vec<Message>,
}

impl Chat {
    fn chat(&mut self, user_input: &str) -> String {
        self.messages.push(Message { role: "user".into(), content: user_input.into() });
        let reply = llm(&self.messages); // 每次都把完整历史发给模型
        self.messages.push(Message { role: "assistant".into(), content: reply.clone() });
        reply
    }
}`},

'tool-use-12':{base:'python',
go:String.raw`func run(ctx context.Context, messages []Message, tools []Tool, maxSteps int) (string, error) {
    for i := 0; i < maxSteps; i++ { // 防止无限循环
        reply, err := llm(ctx, messages, tools)
        if err != nil {
            return "", err
        }
        if reply.ToolCall == nil {
            return reply.Text, nil // 没有工具调用：最终回答
        }
        call := reply.ToolCall
        result := execute(call.Name, call.Arguments) // 执行前校验参数和权限
        messages = append(messages, reply.Message)   // 先带上模型的调用请求
        messages = append(messages, Message{Role: "tool", ToolCallID: call.ID, Content: result})
    }
    return "", errors.New("超过最大步数")
}`,
java:String.raw`static String run(List<Message> messages, List<Tool> tools, int maxSteps) {
    for (int i = 0; i < maxSteps; i++) { // 防止无限循环
        Reply reply = llm(messages, tools);
        if (reply.toolCall() == null) {
            return reply.text(); // 没有工具调用：最终回答
        }
        ToolCall call = reply.toolCall();
        String result = execute(call.name(), call.arguments()); // 执行前校验参数和权限
        messages.add(reply.message());                          // 先带上模型的调用请求
        messages.add(Message.tool(call.id(), result));
    }
    throw new IllegalStateException("超过最大步数");
}`,
ts:String.raw`async function run(messages: Message[], tools: Tool[], maxSteps = 8): Promise<string> {
  for (let i = 0; i < maxSteps; i++) { // 防止无限循环
    const reply = await llm(messages, tools);
    if (!reply.toolCall) return reply.text; // 没有工具调用：最终回答
    const call = reply.toolCall;
    const result = await execute(call.name, call.arguments); // 执行前校验参数和权限
    messages.push(reply.message);                            // 先带上模型的调用请求
    messages.push({ role: "tool", toolCallId: call.id, content: result });
  }
  throw new Error("超过最大步数");
}`,
rust:String.raw`fn run(messages: &mut Vec<Message>, tools: &[Tool], max_steps: usize) -> Result<String, String> {
    for _ in 0..max_steps { // 防止无限循环
        let reply = llm(messages, tools)?;
        // Option：Some 表示模型要调用工具，None 表示已经给出最终回答
        let Some(call) = reply.tool_call else {
            return Ok(reply.text);
        };
        let result = execute(&call.name, &call.arguments); // 执行前校验参数和权限
        messages.push(reply.message);                      // 先带上模型的调用请求
        messages.push(Message::tool(&call.id, &result));
    }
    Err("超过最大步数".into())
}`},

'rag-advanced-12':{base:'python',
go:String.raw`func rrf(resultLists [][]string, k int) []string {
    scores := map[string]float64{}
    for _, results := range resultLists {
        for i, id := range results {
            scores[id] += 1.0 / float64(k+i+1) // 排名 = i + 1，越靠前加分越多
        }
    }
    ids := make([]string, 0, len(scores))
    for id := range scores {
        ids = append(ids, id)
    }
    sort.Slice(ids, func(a, b int) bool { return scores[ids[a]] > scores[ids[b]] })
    return ids
}`,
java:String.raw`static List<String> rrf(List<List<String>> resultLists, int k) {
    Map<String, Double> scores = new HashMap<>();
    for (List<String> results : resultLists) {
        for (int i = 0; i < results.size(); i++) {
            // 排名 = i + 1；merge：没有就放入，有就相加
            scores.merge(results.get(i), 1.0 / (k + i + 1), Double::sum);
        }
    }
    List<String> ids = new ArrayList<>(scores.keySet());
    ids.sort((a, b) -> Double.compare(scores.get(b), scores.get(a))); // 降序
    return ids;
}`,
ts:String.raw`function rrf(resultLists: string[][], k = 60): string[] {
  const scores = new Map<string, number>();
  for (const results of resultLists) {
    results.forEach((id, i) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)); // 排名 = i + 1
    });
  }
  return [...scores.keys()].sort((a, b) => scores.get(b)! - scores.get(a)!); // 降序
}`,
rust:String.raw`use std::collections::HashMap;

fn rrf(result_lists: &[Vec<String>], k: f64) -> Vec<String> {
    let mut scores: HashMap<&str, f64> = HashMap::new();
    for results in result_lists {
        for (i, id) in results.iter().enumerate() {
            *scores.entry(id.as_str()).or_insert(0.0) += 1.0 / (k + i as f64 + 1.0); // 排名 = i + 1
        }
    }
    let mut ids: Vec<&str> = scores.keys().copied().collect();
    ids.sort_by(|a, b| scores[b].partial_cmp(&scores[a]).unwrap()); // 降序
    ids.into_iter().map(String::from).collect()
}`},

'engineering-12':{base:'python',
go:String.raw`// retryable 判断哪些错误值得重试（如超时、429、5xx）
func withRetry(fn func() error, maxRetries int, base time.Duration, retryable func(error) bool) error {
    for attempt := 0; ; attempt++ {
        err := fn()
        if err == nil || !retryable(err) {
            return err // 成功，或不可重试的错误：直接返回
        }
        if attempt == maxRetries {
            return err // 用完重试次数
        }
        jitter := time.Duration(rand.Int63n(int64(base))) // 随机抖动，避免大家同时重试
        time.Sleep(base<<attempt + jitter)                 // 1s、2s、4s……
    }
}`,
java:String.raw`class RetryableException extends RuntimeException {}

static <T> T withRetry(Supplier<T> fn, int maxRetries, long baseMs) throws InterruptedException {
    for (int attempt = 0; ; attempt++) {
        try {
            return fn.get();
        } catch (RetryableException e) { // 只有可重试的错误才进这里
            if (attempt == maxRetries) throw e; // 用完重试次数，抛出
            long jitter = ThreadLocalRandom.current().nextLong(baseMs); // 随机抖动
            Thread.sleep((baseMs << attempt) + jitter); // 1s、2s、4s……
        }
    }
}`,
ts:String.raw`class RetryableError extends Error {}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseMs = 1000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // 不可重试的错误，或已经用完重试次数：直接抛出
      if (!(err instanceof RetryableError) || attempt === maxRetries) throw err;
      const delay = baseMs * 2 ** attempt + Math.random() * baseMs; // 1s、2s、4s……加抖动
      await new Promise(r => setTimeout(r, delay));
    }
  }
}`,
rust:String.raw`use rand::Rng;
use std::{thread, time::Duration};

// Err 里的 bool 表示这个错误是否值得重试
fn with_retry<T, E>(mut f: impl FnMut() -> Result<T, (E, bool)>, max_retries: u32, base_ms: u64) -> Result<T, E> {
    let mut attempt = 0;
    loop {
        match f() {
            Ok(v) => return Ok(v),
            Err((e, retryable)) => {
                if !retryable || attempt == max_retries {
                    return Err(e); // 不可重试，或用完重试次数
                }
                let jitter = rand::thread_rng().gen_range(0..base_ms); // 随机抖动
                thread::sleep(Duration::from_millis((base_ms << attempt) + jitter)); // 1s、2s、4s……
                attempt += 1;
            }
        }
    }
}`},

'model-internals-12':{base:'python',
go:String.raw`func softmaxWithTemperature(logits []float64, temperature float64) []float64 {
    maxZ := math.Inf(-1)
    z := make([]float64, len(logits))
    for i, l := range logits {
        z[i] = l / temperature
        maxZ = math.Max(maxZ, z[i])
    }
    sum := 0.0
    for i := range z {
        z[i] = math.Exp(z[i] - maxZ) // 减去最大值，防止 exp 溢出
        sum += z[i]
    }
    for i := range z {
        z[i] /= sum
    }
    return z
}`,
java:String.raw`static double[] softmaxWithTemperature(double[] logits, double temperature) {
    double[] z = new double[logits.length];
    double max = Double.NEGATIVE_INFINITY;
    for (int i = 0; i < logits.length; i++) {
        z[i] = logits[i] / temperature;
        max = Math.max(max, z[i]);
    }
    double sum = 0;
    for (int i = 0; i < z.length; i++) {
        z[i] = Math.exp(z[i] - max); // 减去最大值，防止 exp 溢出
        sum += z[i];
    }
    for (int i = 0; i < z.length; i++) z[i] /= sum;
    return z;
}`,
ts:String.raw`function softmaxWithTemperature(logits: number[], temperature = 1): number[] {
  const z = logits.map(l => l / temperature);
  const max = Math.max(...z);
  const e = z.map(v => Math.exp(v - max)); // 减去最大值，防止 exp 溢出
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / sum);
}`,
rust:String.raw`fn softmax_with_temperature(logits: &[f64], temperature: f64) -> Vec<f64> {
    let z: Vec<f64> = logits.iter().map(|l| l / temperature).collect();
    let max = z.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let e: Vec<f64> = z.iter().map(|v| (v - max).exp()).collect(); // 减去最大值，防止 exp 溢出
    let sum: f64 = e.iter().sum();
    e.iter().map(|v| v / sum).collect()
}`},

'model-internals-kv-size':{base:'python',
go:String.raw`func kvCacheGB(layers, kvHeads, headDim, seqLen, bytesPerElem int) float64 {
    // 2 表示 K 和 V 各存一份
    total := 2.0 * float64(layers) * float64(kvHeads) * float64(headDim) * float64(seqLen) * float64(bytesPerElem)
    return total / (1 << 30)
}
// kvCacheGB(32, 8, 128, 8192, 2) -> 1.0`,
java:String.raw`static double kvCacheGB(int layers, int kvHeads, int headDim, int seqLen, int bytesPerElem) {
    // 2 表示 K 和 V 各存一份；用 double 计算避免 int 溢出
    double total = 2.0 * layers * kvHeads * headDim * seqLen * bytesPerElem;
    return total / (1L << 30);
}
// kvCacheGB(32, 8, 128, 8192, 2) -> 1.0`,
ts:String.raw`function kvCacheGB(layers: number, kvHeads: number, headDim: number, seqLen: number, bytesPerElem = 2): number {
  const total = 2 * layers * kvHeads * headDim * seqLen * bytesPerElem; // 2 表示 K 和 V 各存一份
  return total / 1024 ** 3;
}
// kvCacheGB(32, 8, 128, 8192) -> 1`,
rust:String.raw`fn kv_cache_gb(layers: u64, kv_heads: u64, head_dim: u64, seq_len: u64, bytes_per_elem: u64) -> f64 {
    let total = 2 * layers * kv_heads * head_dim * seq_len * bytes_per_elem; // 2 表示 K 和 V 各存一份
    total as f64 / (1u64 << 30) as f64
}
// kv_cache_gb(32, 8, 128, 8192, 2) -> 1.0`},

'agents-12':{base:'python',
go:String.raw`func refine(task string, maxRounds int) string {
    draft := generate(task)
    for i := 0; i < maxRounds; i++ {
        passed, feedback := review(task, draft)
        if passed {
            return draft
        }
        draft = improve(task, draft, feedback) // 带着具体意见修改
    }
    return draft // 达到上限，返回当前最好版本
}`,
java:String.raw`record Review(boolean passed, String feedback) {}

static String refine(String task, int maxRounds) {
    String draft = generate(task);
    for (int i = 0; i < maxRounds; i++) {
        Review r = review(task, draft);
        if (r.passed()) return draft;
        draft = improve(task, draft, r.feedback()); // 带着具体意见修改
    }
    return draft; // 达到上限，返回当前最好版本
}`,
ts:String.raw`async function refine(task: string, maxRounds = 3): Promise<string> {
  let draft = await generate(task);
  for (let i = 0; i < maxRounds; i++) {
    const { passed, feedback } = await review(task, draft);
    if (passed) return draft;
    draft = await improve(task, draft, feedback); // 带着具体意见修改
  }
  return draft; // 达到上限，返回当前最好版本
}`,
rust:String.raw`fn refine(task: &str, max_rounds: usize) -> String {
    let mut draft = generate(task);
    for _ in 0..max_rounds {
        let (passed, feedback) = review(task, &draft);
        if passed {
            return draft;
        }
        draft = improve(task, &draft, &feedback); // 带着具体意见修改
    }
    draft // 达到上限，返回当前最好版本
}`},

'evals-12':{base:'python',
go:String.raw`type Item struct {
    Text, Label string
}

type Failure struct {
    Item
    Pred string // 模型给出的错误答案
}

func evaluate(dataset []Item) (float64, []Failure) {
    if len(dataset) == 0 {
        return 0, nil
    }
    var failures []Failure
    for _, it := range dataset {
        if pred := classify(it.Text); pred != it.Label {
            failures = append(failures, Failure{it, pred})
        }
    }
    accuracy := 1 - float64(len(failures))/float64(len(dataset))
    return accuracy, failures // 答错的样本用于分析和改进
}`,
java:String.raw`record Item(String text, String label) {}
record Failure(Item item, String pred) {}
record EvalResult(double accuracy, List<Failure> failures) {}

static EvalResult evaluate(List<Item> dataset) {
    List<Failure> failures = new ArrayList<>();
    for (Item it : dataset) {
        String pred = classify(it.text());
        if (!pred.equals(it.label())) failures.add(new Failure(it, pred));
    }
    double accuracy = dataset.isEmpty() ? 0 : 1 - (double) failures.size() / dataset.size();
    return new EvalResult(accuracy, failures); // 答错的样本用于分析和改进
}`,
ts:String.raw`type Item = { text: string; label: string };

async function evaluate(dataset: Item[]) {
  const failures: (Item & { pred: string })[] = [];
  for (const item of dataset) {
    const pred = await classify(item.text);
    if (pred !== item.label) failures.push({ ...item, pred });
  }
  const accuracy = dataset.length ? 1 - failures.length / dataset.length : 0;
  return { accuracy, failures }; // 答错的样本用于分析和改进
}`,
rust:String.raw`struct Item {
    text: String,
    label: String,
}

// 返回 (准确率, 答错的样本及模型的预测)
fn evaluate(dataset: &[Item]) -> (f64, Vec<(&Item, String)>) {
    let mut failures = Vec::new();
    for item in dataset {
        let pred = classify(&item.text);
        if pred != item.label {
            failures.push((item, pred));
        }
    }
    if dataset.is_empty() {
        return (0.0, failures);
    }
    let accuracy = 1.0 - failures.len() as f64 / dataset.len() as f64;
    (accuracy, failures) // 答错的样本用于分析和改进
}`},

'evals-h2':{base:'python',
go:String.raw`type Diff struct {
    Fixed, Broken []string
    Net           int
}

func compare(dataset []Item, oldFn, newFn func(string) string, check func(Item, string) bool) Diff {
    var d Diff
    for _, it := range dataset {
        oldOK := check(it, oldFn(it.Input))
        newOK := check(it, newFn(it.Input))
        if newOK && !oldOK {
            d.Fixed = append(d.Fixed, it.ID) // 新版修好的
        } else if oldOK && !newOK {
            d.Broken = append(d.Broken, it.ID) // 新版弄坏的（回归）
        }
    }
    d.Net = len(d.Fixed) - len(d.Broken)
    return d
}`,
java:String.raw`record Diff(List<String> fixed, List<String> broken, int net) {}

static Diff compare(List<Item> dataset, Function<String, String> oldFn,
                    Function<String, String> newFn, BiPredicate<Item, String> check) {
    List<String> fixed = new ArrayList<>(), broken = new ArrayList<>();
    for (Item it : dataset) {
        boolean oldOk = check.test(it, oldFn.apply(it.input()));
        boolean newOk = check.test(it, newFn.apply(it.input()));
        if (newOk && !oldOk) fixed.add(it.id());        // 新版修好的
        else if (oldOk && !newOk) broken.add(it.id());  // 新版弄坏的（回归）
    }
    return new Diff(fixed, broken, fixed.size() - broken.size());
}`,
ts:String.raw`type Item = { id: string; input: string; expected: string };

function compare(
  dataset: Item[],
  oldFn: (input: string) => string,
  newFn: (input: string) => string,
  check: (item: Item, output: string) => boolean,
) {
  const fixed: string[] = [], broken: string[] = [];
  for (const item of dataset) {
    const oldOk = check(item, oldFn(item.input));
    const newOk = check(item, newFn(item.input));
    if (newOk && !oldOk) fixed.push(item.id);       // 新版修好的
    else if (oldOk && !newOk) broken.push(item.id); // 新版弄坏的（回归）
  }
  return { fixed, broken, net: fixed.length - broken.length };
}`,
rust:String.raw`struct Diff {
    fixed: Vec<String>,
    broken: Vec<String>,
    net: i64,
}

fn compare(
    dataset: &[Item],
    old_fn: impl Fn(&str) -> String,
    new_fn: impl Fn(&str) -> String,
    check: impl Fn(&Item, &str) -> bool,
) -> Diff {
    let (mut fixed, mut broken) = (Vec::new(), Vec::new());
    for item in dataset {
        let old_ok = check(item, &old_fn(&item.input));
        let new_ok = check(item, &new_fn(&item.input));
        if new_ok && !old_ok {
            fixed.push(item.id.clone()); // 新版修好的
        } else if old_ok && !new_ok {
            broken.push(item.id.clone()); // 新版弄坏的（回归）
        }
    }
    let net = fixed.len() as i64 - broken.len() as i64;
    Diff { fixed, broken, net }
}`},

'serving-12':{base:'python',
go:String.raw`var bytesPerParam = map[string]float64{"fp32": 4, "fp16": 2, "bf16": 2, "int8": 1, "int4": 0.5}

func weightMemoryGB(paramsBillion float64, precision string) (float64, error) {
    b, ok := bytesPerParam[precision]
    if !ok {
        return 0, fmt.Errorf("未知精度 %s", precision)
    }
    return paramsBillion * b, nil // 十亿参数 × 字节数 ≈ GB
}
// weightMemoryGB(7, "fp16")  -> 14
// weightMemoryGB(70, "int4") -> 35`,
java:String.raw`static final Map<String, Double> BYTES_PER_PARAM =
    Map.of("fp32", 4.0, "fp16", 2.0, "bf16", 2.0, "int8", 1.0, "int4", 0.5);

static double weightMemoryGB(double paramsBillion, String precision) {
    Double b = BYTES_PER_PARAM.get(precision);
    if (b == null) throw new IllegalArgumentException("未知精度 " + precision);
    return paramsBillion * b; // 十亿参数 × 字节数 ≈ GB
}
// weightMemoryGB(7, "fp16")  -> 14.0
// weightMemoryGB(70, "int4") -> 35.0`,
ts:String.raw`const BYTES_PER_PARAM = { fp32: 4, fp16: 2, bf16: 2, int8: 1, int4: 0.5 };

function weightMemoryGB(paramsBillion: number, precision: keyof typeof BYTES_PER_PARAM = "fp16"): number {
  return paramsBillion * BYTES_PER_PARAM[precision]; // 十亿参数 × 字节数 ≈ GB
}
// weightMemoryGB(7)          -> 14
// weightMemoryGB(70, "int4") -> 35`,
rust:String.raw`fn weight_memory_gb(params_billion: f64, precision: &str) -> Option<f64> {
    let bytes = match precision {
        "fp32" => 4.0,
        "fp16" | "bf16" => 2.0,
        "int8" => 1.0,
        "int4" => 0.5,
        _ => return None, // 未知精度
    };
    Some(params_billion * bytes) // 十亿参数 × 字节数 ≈ GB
}
// weight_memory_gb(7.0, "fp16")  -> Some(14.0)
// weight_memory_gb(70.0, "int4") -> Some(35.0)`},

'fine-tuning-12':{base:'python',
go:String.raw`type Msg struct {
    Role    string ` + "`json:\"role\"`" + String.raw`
    Content string ` + "`json:\"content\"`" + String.raw`
}

type Record struct {
    Messages []Msg ` + "`json:\"messages\"`" + String.raw`
}

func toJSONL(pairs [][2]string, system string) (string, error) {
    lines := make([]string, 0, len(pairs))
    for _, p := range pairs {
        rec := Record{Messages: []Msg{
            {"system", system},
            {"user", p[0]},
            {"assistant", p[1]},
        }}
        b, err := json.Marshal(rec) // Go 默认输出中文原文，不转义
        if err != nil {
            return "", err
        }
        lines = append(lines, string(b))
    }
    return strings.Join(lines, "\n"), nil // 每行一个 JSON 对象
}`,
java:String.raw`record Msg(String role, String content) {}
record Record(List<Msg> messages) {}

static final ObjectMapper JSON = new ObjectMapper(); // Jackson

static String toJsonl(List<String[]> pairs, String system) throws Exception {
    List<String> lines = new ArrayList<>();
    for (String[] p : pairs) {
        Record rec = new Record(List.of(
            new Msg("system", system),
            new Msg("user", p[0]),
            new Msg("assistant", p[1])));
        lines.add(JSON.writeValueAsString(rec)); // 一条记录序列化成一行 JSON
    }
    return String.join("\n", lines); // 每行一个 JSON 对象
}`,
ts:String.raw`function toJsonl(pairs: [string, string][], system: string): string {
  return pairs
    .map(([question, answer]) => JSON.stringify({ // JSON.stringify 默认保留中文原文
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ],
    }))
    .join("\n"); // 每行一个 JSON 对象
}`,
rust:String.raw`use serde_json::json;

fn to_jsonl(pairs: &[(&str, &str)], system: &str) -> String {
    pairs
        .iter()
        .map(|(question, answer)| {
            // json! 宏直接写出 JSON 结构，to_string 输出一行
            json!({"messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ]})
            .to_string()
        })
        .collect::<Vec<_>>()
        .join("\n") // 每行一个 JSON 对象
}`},

'fine-tuning-grpo-adv':{base:'python',
go:String.raw`func groupAdvantages(rewards []float64, eps float64) []float64 {
    n := float64(len(rewards))
    mean := 0.0
    for _, r := range rewards {
        mean += r
    }
    mean /= n
    variance := 0.0
    for _, r := range rewards {
        variance += (r - mean) * (r - mean)
    }
    std := math.Sqrt(variance / n)
    adv := make([]float64, len(rewards))
    for i, r := range rewards {
        adv[i] = (r - mean) / (std + eps) // eps 防止全对或全错时除以 0
    }
    return adv
}`,
java:String.raw`static double[] groupAdvantages(double[] rewards, double eps) {
    double mean = Arrays.stream(rewards).average().orElse(0);
    double variance = Arrays.stream(rewards).map(r -> (r - mean) * (r - mean)).average().orElse(0);
    double std = Math.sqrt(variance);
    // eps 防止全对或全错时除以 0
    return Arrays.stream(rewards).map(r -> (r - mean) / (std + eps)).toArray();
}`,
ts:String.raw`function groupAdvantages(rewards: number[], eps = 1e-6): number[] {
  const n = rewards.length;
  const mean = rewards.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(rewards.reduce((s, r) => s + (r - mean) ** 2, 0) / n);
  return rewards.map(r => (r - mean) / (std + eps)); // eps 防止全对或全错时除以 0
}`,
rust:String.raw`fn group_advantages(rewards: &[f64], eps: f64) -> Vec<f64> {
    let n = rewards.len() as f64;
    let mean = rewards.iter().sum::<f64>() / n;
    let std = (rewards.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / n).sqrt();
    rewards.iter().map(|r| (r - mean) / (std + eps)).collect() // eps 防止全对或全错时除以 0
}`},

'safety-12':{base:'python',
go:String.raw`// Go 的 regexp 不支持 (?<!...) 这类“环视”，所以用 (^|\D) 和 (\D|$) 表示“前后不是数字”，
// 替换时用 ${'${1}'}、${'${2}'} 把前后那个字符原样放回去
var phone = regexp.MustCompile(` + "`(^|\\D)1[3-9]\\d{9}(\\D|$)`" + String.raw`)
var email = regexp.MustCompile(` + "`[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+`" + String.raw`)

func maskPII(text string) string {
    text = phone.ReplaceAllString(text, "${'${1}'}[手机号]${'${2}'}")
    return email.ReplaceAllString(text, "[邮箱]")
}`,
java:String.raw`static final Pattern PHONE = Pattern.compile("(?<!\\d)1[3-9]\\d{9}(?!\\d)"); // 前后都不能是数字
static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");

static String maskPii(String text) {
    text = PHONE.matcher(text).replaceAll("[手机号]");
    return EMAIL.matcher(text).replaceAll("[邮箱]");
}`,
ts:String.raw`const PHONE = /(?<!\d)1[3-9]\d{9}(?!\d)/g; // 前后都不能是数字；g 表示替换全部
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

function maskPii(text: string): string {
  return text.replace(PHONE, "[手机号]").replace(EMAIL, "[邮箱]");
}`,
rust:String.raw`use regex::Regex;

// regex 库不支持“环视”，所以用 (^|\D) 和 (\D|$) 表示“前后不是数字”，替换时把前后字符放回去
fn mask_pii(text: &str) -> String {
    let phone = Regex::new(r"(^|\D)1[3-9]\d{9}(\D|$)").unwrap();
    let email = Regex::new(r"[\w.+-]+@[\w-]+(\.[\w-]+)+").unwrap();
    let text = phone.replace_all(text, "${'${1}'}[手机号]${'${2}'}");
    email.replace_all(&text, "[邮箱]").into_owned()
}`},
};
