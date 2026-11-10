import type {StarterMap} from './types';

// AI 闯关题 rag-advanced-12（RRF）、engineering-12（指数退避重试）的作答框架。
export const aiJourneyStartersB:StarterMap={
'rag-advanced-12':{
python:String.raw`def rrf(result_lists, k=60):
    scores = {}  # 文档 id -> 总分
    for results in result_lists:
        # TODO 1：遍历这一路的每个文档，同时拿到它的名次（第一名是 1）
        for ... in ...:
            # TODO 2：给这个文档加上 1 / (k + rank)（第一次出现时从 0 开始加）
            ...
    # TODO 3：按总分从高到低排序后返回文档 id
    return ...`,
go:String.raw`func rrf(resultLists [][]string, k int) []string {
    scores := map[string]float64{} // 文档 id -> 总分
    for _, results := range resultLists {
        // TODO 1：遍历这一路的每个文档，同时拿到它的名次（range 的下标从 0 开始）
        for ... {
            // TODO 2：给这个文档加上 1 / (k + rank)（整数要先转成 float64 再相除）
        }
    }
    ids := make([]string, 0, len(scores))
    for id := range scores {
        ids = append(ids, id)
    }
    // TODO 3：按总分从高到低排序 ids（可以用 sort.Slice）
    return ids
}`,
java:String.raw`static List<String> rrf(List<List<String>> resultLists, int k) {
    Map<String, Double> scores = new HashMap<>(); // 文档 id -> 总分
    for (List<String> results : resultLists) {
        // TODO 1：遍历这一路的每个文档，同时拿到它的名次（第一名是 1）
        for (...) {
            // TODO 2：给这个文档加上 1.0 / (k + rank)（可以用 scores.merge）
        }
    }
    List<String> ids = new ArrayList<>(scores.keySet());
    // TODO 3：按总分从高到低排序 ids
    return ids;
}`,
ts:String.raw`function rrf(resultLists: string[][], k = 60): string[] {
  const scores = new Map<string, number>(); // 文档 id -> 总分
  for (const results of resultLists) {
    // TODO 1：遍历这一路的每个文档，同时拿到它的名次（forEach 的下标从 0 开始）
    results.forEach((id, i) => {
      // TODO 2：给这个文档加上 1 / (k + rank)（第一次出现时从 0 开始加）
    });
  }
  // TODO 3：按总分从高到低排序后返回文档 id
  return [...scores.keys()];
}`,
rust:String.raw`use std::collections::HashMap;

fn rrf(result_lists: &[Vec<String>], k: f64) -> Vec<String> {
    let mut scores: HashMap<&str, f64> = HashMap::new(); // 文档 id -> 总分
    for results in result_lists {
        // TODO 1：遍历这一路的每个文档，同时拿到它的名次（enumerate 的下标从 0 开始）
        for ... {
            // TODO 2：给这个文档加上 1.0 / (k + rank)（可以用 entry().or_insert(0.0)）
        }
    }
    let mut ids: Vec<&str> = scores.keys().copied().collect();
    // TODO 3：按总分从高到低排序 ids（分数是 f64，用 partial_cmp 比较）
    ids.into_iter().map(String::from).collect()
}`,
},

'engineering-12':{
python:String.raw`import random, time

class RetryableError(Exception): ...

def with_retry(fn, max_retries=3, base=1.0):
    for attempt in range(max_retries + 1):
        try:
            return fn()
        # TODO 1：只捕获可重试的错误（其他错误直接往外抛）
        except ...:
            # TODO 2：已经用完重试次数时，把异常重新抛出
            ...
            # TODO 3：等待时间按 2 的指数增长（base、2×base、4×base……），再加一个随机抖动
            delay = ...
            time.sleep(delay)`,
go:String.raw`// retryable 判断哪些错误值得重试（如超时、429、5xx）
func withRetry(fn func() error, maxRetries int, base time.Duration, retryable func(error) bool) error {
    for attempt := 0; ; attempt++ {
        err := fn()
        // TODO 1：成功，或者是不可重试的错误时，直接返回 err
        ...
        // TODO 2：已经用完重试次数时，返回 err
        ...
        // TODO 3：等待时间按 2 的指数增长（base<<attempt），再加一个随机抖动（rand.Int63n）
        ...
    }
}`,
java:String.raw`class RetryableException extends RuntimeException {}

static <T> T withRetry(Supplier<T> fn, int maxRetries, long baseMs) throws InterruptedException {
    for (int attempt = 0; ; attempt++) {
        try {
            return fn.get();
        // TODO 1：只捕获可重试的错误（其他错误直接往外抛）
        } catch (... e) {
            // TODO 2：已经用完重试次数时，把异常重新抛出
            ...
            // TODO 3：等待时间按 2 的指数增长（baseMs << attempt），再加一个随机抖动
            ...
        }
    }
}`,
ts:String.raw`class RetryableError extends Error {}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseMs = 1000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // TODO 1：不是可重试的错误（不是 RetryableError），或者已经用完重试次数时，直接抛出
      ...
      // TODO 2：等待时间按 2 的指数增长（baseMs * 2 ** attempt），再加一个随机抖动
      const delay = ...;
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
                // TODO 1：不可重试，或者已经用完重试次数时，返回 Err(e)
                ...
                // TODO 2：等待时间按 2 的指数增长（base_ms << attempt），再加一个随机抖动（gen_range）
                ...
                attempt += 1;
            }
        }
    }
}`,
},
};
