import type {StarterMap} from './types';

// AI 考试题（ai-e1-24、ai-e1-25、ai-e2-24、ai-e2-25）的作答框架。
export const aiExamStartersA:StarterMap={
'ai-e1-24':{
python:String.raw`def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    # TODO 1：参数非法（size <= 0、overlap < 0 或 overlap >= size）时返回空列表
    ...

    # TODO 2：算出每次向后移动的步长
    step = ...

    out = []
    # Python 的字符串按字符计数，切片不会把一个中文字切成两半
    for start in range(0, len(text), step):
        end = min(start + size, len(text))
        out.append(text[start:end])
        # TODO 3：已经切到结尾就停止（不然会多出一块只有重叠部分的小块）
        ...
    return out`,
go:String.raw`func ChunkText(text string, size, overlap int) []string {
    // TODO 1：参数非法（size <= 0 或 overlap >= size）时返回 nil
    ...

    // TODO 2：把字符串转成按字符（rune）的切片，避免把中文切坏
    r := ...

    var out []string
    // TODO 3：写出每次向后移动的步长
    for start := 0; start < len(r); start += ... {
        end := start + size
        if end > len(r) {
            end = len(r)
        }
        out = append(out, string(r[start:end]))
        // TODO 4：已经切到结尾就停止
        ...
    }
    return out
}`,
java:String.raw`static List<String> chunkText(String text, int size, int overlap) {
    List<String> out = new ArrayList<>();
    // TODO 1：参数非法（size <= 0、overlap < 0 或 overlap >= size）时返回空列表
    ...

    // TODO 2：按“码点”拆开（生僻字和 emoji 占两个 char，按 char 切会切坏）
    int[] cps = ...;

    // TODO 3：写出每次向后移动的步长
    for (int start = 0; start < cps.length; start += ...) {
        int end = Math.min(start + size, cps.length);
        out.add(new String(cps, start, end - start));
        // TODO 4：已经切到结尾就停止
        ...
    }
    return out;
}`,
ts:String.raw`function chunkText(text: string, size: number, overlap: number): string[] {
  // TODO 1：参数非法（size <= 0、overlap < 0 或 overlap >= size）时返回空数组
  ...

  // TODO 2：按字符拆开（emoji 等不能被拆成两半，可以用 Array.from）
  const chars = ...;

  const out: string[] = [];
  // TODO 3：写出每次向后移动的步长
  for (let start = 0; start < chars.length; start += ...) {
    const end = Math.min(start + size, chars.length);
    out.push(chars.slice(start, end).join(""));
    // TODO 4：已经切到结尾就停止
    ...
  }
  return out;
}`,
rust:String.raw`fn chunk_text(text: &str, size: usize, overlap: usize) -> Vec<String> {
    // TODO 1：参数非法（size == 0 或 overlap >= size）时返回空列表
    ...

    // TODO 2：按字符拆开（String 是 UTF-8 字节，按字节切会切坏中文）
    let chars: Vec<char> = ...;

    let mut out = Vec::new();
    let mut start = 0;
    while start < chars.len() {
        let end = (start + size).min(chars.len());
        out.push(chars[start..end].iter().collect());
        // TODO 3：已经切到结尾就停止
        ...
        // TODO 4：向后移动一个步长
        start += ...;
    }
    out
}`,
},

'ai-e1-25':{
python:String.raw`import asyncio

async def call_with_retry(req):
    last_err = None
    for attempt in range(4):  # 第 1 次调用 + 最多重试 3 次
        try:
            resp, status = await call_model(req)
        except Exception as err:  # 网络错误等：当作可重试
            status, last_err = 0, err
        else:
            if status == 200:
                return resp
            # TODO 1：不是 429、也不是 5xx 的状态码不能重试，直接抛出错误
            ...
            last_err = RuntimeError(f"第 {attempt + 1} 次调用失败：status={status}")
        if attempt == 3:
            break
        # TODO 2：依次等待 1s、2s、4s（用 asyncio.sleep，任务被取消时会立刻结束等待）
        ...
    # TODO 3：重试次数用完，抛出带着最后一次错误的异常
    ...`,
go:String.raw`func CallWithRetry(ctx context.Context, req Request) (Response, error) {
    var last error
    for attempt := 0; attempt <= 3; attempt++ {
        resp, status, err := callModel(ctx, req)
        if err == nil && status == 200 {
            return resp, nil
        }
        // TODO 1：不是 429、也不是 5xx 的状态码不能重试，直接返回错误
        ...
        last = fmt.Errorf("第 %d 次调用失败：status=%d err=%v", attempt+1, status, err)
        if attempt == 3 {
            break
        }
        // TODO 2：算出这次要等多久（1s、2s、4s 依次翻倍）
        wait := ...
        // TODO 3：等待期间如果 ctx 被取消，立刻返回 ctx.Err()（用 select）
        ...
    }
    // TODO 4：重试次数用完，返回最后一次的错误
    ...
}`,
java:String.raw`// 用线程中断表示“取消”：调用方 interrupt 这个线程，sleep 会立刻抛出 InterruptedException
static Response callWithRetry(Request req) throws Exception {
    Exception last = null;
    for (int attempt = 0; attempt <= 3; attempt++) {
        int status = 0;
        try {
            Result r = callModel(req); // r.status() 是 HTTP 状态码
            status = r.status();
            if (status == 200) return r.response();
            // TODO 1：不是 429、也不是 5xx 的状态码不能重试，直接抛出异常
            ...
            last = new RuntimeException("第 " + (attempt + 1) + " 次调用失败：status=" + status);
        } catch (IOException e) { // 网络错误：当作可重试
            last = e;
        }
        if (attempt == 3) break;
        // TODO 2：依次等待 1s、2s、4s（Thread.sleep，时间每次翻倍）
        ...
    }
    // TODO 3：重试次数用完，抛出带着最后一次错误的异常
    ...
}`,
ts:String.raw`// signal 来自 AbortController：调用方 abort() 后，等待会立刻结束
async function callWithRetry(req: Request, signal: AbortSignal): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt <= 3; attempt++) {
    let status = 0;
    try {
      const r = await callModel(req, signal);
      status = r.status;
      if (status === 200) return r.response;
    } catch (err) {
      if (signal.aborted) throw err; // 被取消：不再重试
      last = err; // 网络错误：当作可重试
    }
    // TODO 1：拿到了状态码，但不是 429、也不是 5xx 时，直接抛出错误
    ...
    if (status !== 0) last = new Error("第 " + (attempt + 1) + " 次调用失败：status=" + status);
    if (attempt === 3) break;
    // TODO 2：依次等待 1s、2s、4s（用下面的 sleep，并把 signal 传进去）
    ...
  }
  // TODO 3：重试次数用完，抛出带着最后一次错误的异常
  ...
}

// 可被取消的等待：signal 触发 abort 时立刻结束
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
  });
}`,
rust:String.raw`use std::time::Duration;
use tokio_util::sync::CancellationToken;

async fn call_with_retry(req: &Request, cancel: &CancellationToken) -> Result<Response, String> {
    let mut last = String::new();
    for attempt in 0..=3u32 {
        match call_model(req).await {
            Ok((resp, 200)) => return Ok(resp),
            // TODO 1：不是 429、也不是 5xx 的状态码不能重试，直接返回 Err
            ...
            Ok((_, status)) => last = format!("第 {} 次调用失败：status={}", attempt + 1, status),
            Err(e) => last = format!("第 {} 次调用失败：{}", attempt + 1, e), // 网络错误：可重试
        }
        if attempt == 3 {
            break;
        }
        // TODO 2：等待 1s、2s、4s；等待期间被取消就立刻返回 Err（用 tokio::select!）
        ...
    }
    // TODO 3：重试次数用完，返回最后一次的错误
    ...
}`,
},
};
