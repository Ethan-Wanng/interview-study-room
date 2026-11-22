import type {PlaygroundLang} from '@/lib/playground-bridge';

export type PlaygroundExample={
 id:string;
 title:[string,string];
 tag:[string,string];
 summary:[string,string];
 code:string;
};

export type PlaygroundLangMeta={
 id:PlaygroundLang;
 label:string;
 file:string;
 runtime:[string,string];
};

export const PLAYGROUND_LANGS:PlaygroundLangMeta[]=[
 {id:'go',label:'Go',file:'main.go',runtime:['Go Playground (go.dev)','Go Playground (go.dev)']},
 {id:'python',label:'Python',file:'main.py',runtime:['Python 3.14 沙盒','Python 3.14 Sandbox']},
 {id:'java',label:'Java',file:'Main.java',runtime:['OpenJDK 21 沙盒','OpenJDK 21 Sandbox']},
 {id:'ts',label:'JS/TS',file:'main.ts',runtime:['浏览器隔离沙盒 (Web Worker)','Browser Sandbox (Web Worker)']},
 {id:'rust',label:'Rust',file:'main.rs',runtime:['Rust Playground (stable)','Rust Playground (stable)']},
 {id:'sql',label:'MySQL',file:'query.sql',runtime:['MySQL 8.0 兼容沙盒 (WASM)','MySQL 8.0 Compat Sandbox (WASM)']},
];

export const PLAYGROUND_EXAMPLES:Record<PlaygroundLang,PlaygroundExample[]>={
 go:[
  {
   id:'go-hello',
   title:['01 · Hello, 面试自习室','01 · Hello, Study Room'],
   tag:['入门','Basics'],
   summary:['最简 Go 程序结构、多返回值函数与格式化输出。','Minimal Go entry point, multiple return values, and fmt formatting.'],
   code:String.raw`package main

import (
	"fmt"
	"runtime"
)

func greet(topic string) (string, int) {
	msg := fmt.Sprintf("你好，欢迎来到 Go 操场 · 今日主题：%s", topic)
	return msg, len([]rune(topic))
}

func main() {
	msg, n := greet("并发与工程实践")
	fmt.Println(msg)
	fmt.Printf("主题字数：%d | 运行环境：%s %s/%s\n", n, runtime.Version(), runtime.GOOS, runtime.GOARCH)
}
`,
  },
  {
   id:'go-slice-map',
   title:['02 · 切片、Map 与词频统计','02 · Slices, Maps & Word Count'],
   tag:['数据结构','Data Structures'],
   summary:['统计关键词出现次数，并按频次降序、字典序升序稳定排序。','Count keyword frequencies with a map and sort slices stably.'],
   code:String.raw`package main

import (
	"fmt"
	"sort"
	"strings"
)

type Stat struct {
	Word  string
	Count int
}

func main() {
	notes := "go slice map go channel goroutine map context slice go mutex channel"
	freq := make(map[string]int)
	for _, w := range strings.Fields(notes) {
		freq[w]++
	}

	stats := make([]Stat, 0, len(freq))
	for w, c := range freq {
		stats = append(stats, Stat{Word: w, Count: c})
	}
	sort.Slice(stats, func(i, j int) bool {
		if stats[i].Count != stats[j].Count {
			return stats[i].Count > stats[j].Count
		}
		return stats[i].Word < stats[j].Word
	})

	for _, s := range stats {
		fmt.Printf("%-10s -> %d 次\n", s.Word, s.Count)
	}
}
`,
  },
  {
   id:'go-interface',
   title:['03 · 结构体、接口与多态策略','03 · Structs, Interfaces & Strategy'],
   tag:['接口设计','Interfaces'],
   summary:['用隐式接口实现不同存储引擎的统一抽象，无需显式 implements。','Implicit interface satisfaction for pluggable storage backends.'],
   code:String.raw`package main

import "fmt"

type CacheStore interface {
	Name() string
	Get(key string) (string, bool)
	Set(key, val string)
}

type MemoryCache struct {
	data map[string]string
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{data: make(map[string]string)}
}
func (m *MemoryCache) Name() string               { return "MemoryCache" }
func (m *MemoryCache) Set(k, v string)            { m.data[k] = v }
func (m *MemoryCache) Get(k string) (string, bool) { v, ok := m.data[k]; return v, ok }

func warmup(store CacheStore, pairs map[string]string) {
	for k, v := range pairs {
		store.Set(k, v)
	}
	if v, ok := store.Get("lang"); ok {
		fmt.Printf("[%s] 命中 key=lang -> %s\n", store.Name(), v)
	}
}

func main() {
	cache := NewMemoryCache()
	warmup(cache, map[string]string{"lang": "Go", "mode": "playground"})
}
`,
  },
  {
   id:'go-generics',
   title:['04 · 泛型：通用去重与 Filter','04 · Generics: Unique & Filter'],
   tag:['泛型','Generics'],
   summary:['利用 comparable 与 any 约束写出类型安全的集合工具函数。','Type-safe collection helpers using Go comparable and any constraints.'],
   code:String.raw`package main

import "fmt"

func Unique[T comparable](items []T) []T {
	seen := make(map[T]struct{}, len(items))
	out := make([]T, 0, len(items))
	for _, x := range items {
		if _, ok := seen[x]; ok {
			continue
		}
		seen[x] = struct{}{}
		out = append(out, x)
	}
	return out
}

func Filter[T any](items []T, keep func(T) bool) []T {
	out := make([]T, 0, len(items))
	for _, x := range items {
		if keep(x) {
			out = append(out, x)
		}
	}
	return out
}

func main() {
	nums := []int{3, 1, 4, 1, 5, 9, 2, 6, 5}
	uniq := Unique(nums)
	evens := Filter(uniq, func(n int) bool { return n%2 == 0 })
	fmt.Println("去重后:", uniq)
	fmt.Println("其中偶数:", evens)
	fmt.Println("标签去重:", Unique([]string{"go", "rust", "go", "ts"}))
}
`,
  },
  {
   id:'go-worker-pool',
   title:['05 · Goroutine 与 Channel 并发池','05 · Goroutine & Channel Worker Pool'],
   tag:['并发','Concurrency'],
   summary:['经典固定工人池模式：3 个 worker 并发消费任务并汇总结果。','Classic fixed worker pool consuming jobs via channels with WaitGroup.'],
   code:String.raw`package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, jobs <-chan int, results chan<- string, wg *sync.WaitGroup) {
	defer wg.Done()
	for j := range jobs {
		time.Sleep(80 * time.Millisecond)
		results <- fmt.Sprintf("worker#%d 完成任务 %d -> square=%d", id, j, j*j)
	}
}

func main() {
	jobs := make(chan int, 6)
	results := make(chan string, 6)
	var wg sync.WaitGroup

	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}
	for j := 1; j <= 6; j++ {
		jobs <- j
	}
	close(jobs)

	go func() {
		wg.Wait()
		close(results)
	}()

	for r := range results {
		fmt.Println(r)
	}
}
`,
  },
  {
   id:'go-context',
   title:['06 · Context 超时与取消传播','06 · Context Timeout & Cancellation'],
   tag:['并发控制','Context'],
   summary:['模拟下游慢查询被 context.WithTimeout 及时打断，避免 Goroutine 泄漏。','Gracefully cancel slow downstream work with context.WithTimeout.'],
   code:String.raw`package main

import (
	"context"
	"fmt"
	"time"
)

func queryDB(ctx context.Context, name string, cost time.Duration) (string, error) {
	select {
	case <-time.After(cost):
		return name + " 返回 42 条记录", nil
	case <-ctx.Done():
		return "", fmt.Errorf("%s 超时中止: %w", name, ctx.Err())
	}
}

func main() {
	for _, tc := range []struct {
		name string
		cost time.Duration
	}{
		{"快速缓存查询", 60 * time.Millisecond},
		{"慢 SQL 报表", 300 * time.Millisecond},
	} {
		ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
		res, err := queryDB(ctx, tc.name, tc.cost)
		cancel()
		if err != nil {
			fmt.Println("ERR:", err)
		} else {
			fmt.Println("OK :", res)
		}
	}
}
`,
  },
  {
   id:'go-lru',
   title:['07 · 面试手写：线程安全 LRU 缓存','07 · Interview: Thread-Safe LRU Cache'],
   tag:['面试手写','Interview'],
   summary:['标准库 container/list + map + sync.Mutex 实现 O(1) LRU 缓存。','O(1) thread-safe LRU cache using container/list, map, and sync.Mutex.'],
   code:String.raw`package main

import (
	"container/list"
	"fmt"
	"sync"
)

type entry struct {
	key string
	val int
}

type LRU struct {
	mu    sync.Mutex
	cap   int
	items map[string]*list.Element
	order *list.List
}

func NewLRU(cap int) *LRU {
	return &LRU{cap: cap, items: make(map[string]*list.Element), order: list.New()}
}

func (c *LRU) Get(key string) (int, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return 0, false
	}
	c.order.MoveToFront(el)
	return el.Value.(*entry).val, true
}

func (c *LRU) Put(key string, val int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		el.Value.(*entry).val = val
		c.order.MoveToFront(el)
		return
	}
	if c.order.Len() >= c.cap {
		oldest := c.order.Back()
		if oldest != nil {
			c.order.Remove(oldest)
			delete(c.items, oldest.Value.(*entry).key)
		}
	}
	c.items[key] = c.order.PushFront(&entry{key: key, val: val})
}

func main() {
	lru := NewLRU(2)
	lru.Put("a", 1)
	lru.Put("b", 2)
	v, _ := lru.Get("a") // a 变为最近使用
	fmt.Println("Get(a):", v)
	lru.Put("c", 3) // 淘汰最久未用的 b
	_, hasB := lru.Get("b")
	fmt.Println("b 是否还在:", hasB)
	v, hasC := lru.Get("c")
	fmt.Println("Get(c):", v, hasC)
}
`,
  },
 ],

 python:[
  {
   id:'py-hello',
   title:['01 · Hello, 面试自习室与解包','01 · Hello, f-strings & Unpacking'],
   tag:['入门','Basics'],
   summary:['体验 Python 简洁语法：f-string 格式化、序列解包与枚举遍历。','Clean Python syntax with f-strings, unpacking, and enumerate.'],
   code:`import sys

def summarize(track: str, levels: list[str]) -> None:
    first, *middle, last = levels
    print(f"欢迎来到 Python 操场 (Python {sys.version.split()[0]})")
    print(f"路线：{track} | 起点：{first} -> 进阶：{middle} -> 终点：{last}")
    for idx, lv in enumerate(levels, start=1):
        print(f"  第 {idx} 阶段：{lv}")

summarize("AI 开发", ["大模型基础", "RAG 检索", "Agent 工具调用", "评测与上线"])
`,
  },
  {
   id:'py-counter',
   title:['02 · 推导式、Counter 与分组聚合','02 · Comprehensions & Counter'],
   tag:['数据结构','Data Structures'],
   summary:['用列表/字典推导式与 collections.Counter 高效处理日志与词频。','Fast data aggregation using comprehensions, defaultdict, and Counter.'],
   code:`from collections import Counter, defaultdict

events = [
    ("go", "pass"), ("python", "pass"), ("go", "retry"),
    ("rust", "pass"), ("python", "pass"), ("go", "pass"),
    ("java", "retry"), ("ts", "pass"),
]

lang_counts = Counter(lang for lang, _ in events)
by_status: dict[str, list[str]] = defaultdict(list)
for lang, status in events:
    by_status[status].append(lang)

print("语言出现频次 Top 3:", lang_counts.most_common(3))
print("按状态分组:", {k: Counter(v) for k, v in by_status.items()})
squares = {n: n * n for n in range(1, 6) if n % 2 == 1}
print("奇数平方表:", squares)
`,
  },
  {
   id:'py-decorator',
   title:['03 · 装饰器、闭包与缓存记忆化','03 · Decorators & Memoization'],
   tag:['函数式','Functions'],
   summary:['手写带计数统计的缓存装饰器，并理解 functools.wraps 保留元信息。','Build a stateful memoization decorator using closures and @wraps.'],
   code:`from functools import wraps

def memoize(fn):
    cache = {}
    stats = {"hits": 0, "misses": 0}

    @wraps(fn)
    def wrapper(*args):
        if args in cache:
            stats["hits"] += 1
            return cache[args]
        stats["misses"] += 1
        res = fn(*args)
        cache[args] = res
        return res

    wrapper.stats = stats
    return wrapper

@memoize
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print("fib(20) =", fib(20))
print("函数名保留:", fib.__name__)
print("缓存命中统计:", fib.stats)
`,
  },
  {
   id:'py-generator',
   title:['04 · 生成器流式分块与惰性管道','04 · Generators & Lazy Pipelines'],
   tag:['迭代器','Iterators'],
   summary:['使用 yield 构建零拷贝流式分块器，常用于 RAG 文档切片场景。','Memory-efficient streaming chunker with yield for RAG pipelines.'],
   code:`def chunk_text(text: str, size: int, overlap: int = 0):
    step = max(1, size - overlap)
    for start in range(0, len(text), step):
        piece = text[start : start + size]
        yield piece
        if start + size >= len(text):
            break

doc = "检索增强生成(RAG)先切分文档再向量化并结合BM25重排最后交给大模型回答。"
for i, chunk in enumerate(chunk_text(doc, size=12, overlap=3), 1):
    print(f"chunk#{i}: {chunk!r}")
`,
  },
  {
   id:'py-dataclass',
   title:['05 · Dataclass 与结构化模式匹配','05 · Dataclass & Pattern Matching'],
   tag:['现代 Python','Modern Python'],
   summary:['用 @dataclass(frozen=True) 定义不可变消息对象并用 match/case 路由。','Immutable @dataclass models with Python structural pattern matching.'],
   code:`from dataclasses import dataclass

@dataclass(frozen=True)
class ToolCall:
    name: str
    args: dict

@dataclass(frozen=True)
class FinalAnswer:
    text: str
    confidence: float

def handle(msg):
    match msg:
        case ToolCall(name="search", args={"q": query}):
            return f"调用检索工具，关键词={query!r}"
        case ToolCall(name=other):
            return f"未知工具：{other}"
        case FinalAnswer(text=ans, confidence=c) if c >= 0.8:
            return f"高置信度回答 ({c:.0%}): {ans}"
        case FinalAnswer(text=ans):
            return f"需复核回答：{ans}"

for item in [
    ToolCall("search", {"q": "InnoDB MVCC"}),
    FinalAnswer("ReadView 通过活跃事务链表判断可见性", 0.92),
]:
    print(handle(item))
`,
  },
  {
   id:'py-asyncio',
   title:['06 · Asyncio 并发调用与超时保护','06 · Asyncio Gather & Timeout'],
   tag:['异步并发','Asyncio'],
   summary:['使用 asyncio.gather 并发执行多个 IO 任务，并用 wait_for 限制超时。','Run concurrent async tasks with asyncio.gather and wait_for timeouts.'],
   code:`import asyncio

async def fetch_source(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"{name} 完成 ({delay:.2f}s)"

async def main():
    results = await asyncio.gather(
        fetch_source("向量检索", 0.05),
        fetch_source("BM25 检索", 0.03),
        fetch_source("知识图谱", 0.04),
    )
    print("并发召回:", results)

    try:
        await asyncio.wait_for(fetch_source("慢模型", 0.2), timeout=0.05)
    except TimeoutError:
        print("超时降级：慢模型已触发熔断，返回缓存答案")

asyncio.run(main())
`,
  },
  {
   id:'py-rrf',
   title:['07 · AI 面试手写：RRF 倒数排名融合','07 · AI Interview: Reciprocal Rank Fusion'],
   tag:['AI 实战','AI Engineering'],
   summary:['面试高频题：把向量检索与关键词检索两路排名按 1/(k + rank) 融合重排。','Classic hybrid RAG reranker combining dense and sparse rankings via RRF.'],
   code:`def rrf_fuse(rankings: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranked_ids in rankings:
        for rank, doc_id in enumerate(ranked_ids, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda x: (-x[1], x[0]))

dense_hits = ["doc-rag", "doc-kv", "doc-agent"]
bm25_hits  = ["doc-kv", "doc-eval", "doc-rag"]

for rank, (doc_id, score) in enumerate(rrf_fuse([dense_hits, bm25_hits]), start=1):
    print(f"#{rank} {doc_id:<10} RRF={score:.6f}")
`,
  },
 ],

 java:[
  {
   id:'java-hello',
   title:['01 · Hello, 面试自习室与文本块','01 · Hello, Study Room & Text Blocks'],
   tag:['入门','Basics'],
   summary:['标准 Java 程序入口与 JDK 21 文本块、格式化输出示例。','Clean Java entry point using JDK 21 text blocks and formatted strings.'],
   code:`public class Main {
    public static void main(String[] args) {
        String lang = "Java";
        int examples = 7;
        String card = """
                欢迎来到 %s 操场！
                Runtime: Java %s
                本栏目内置 %d 段精选可运行示例。
                """.formatted(lang, System.getProperty("java.version"), examples);
        System.out.print(card);
    }
}
`,
  },
  {
   id:'java-stream',
   title:['02 · 集合框架与 Stream 分组聚合','02 · Collections & Stream Grouping'],
   tag:['集合与流','Streams'],
   summary:['用 Stream API 完成过滤、分组计数和按分值排序，面试必考写法。','Filter, group, count, and sort objects cleanly with Java Streams.'],
   code:`import java.util.*;
import java.util.stream.Collectors;

public class Main {
    record Attempt(String track, int score) {}

    public static void main(String[] args) {
        var logs = List.of(
                new Attempt("Go", 92),
                new Attempt("AI", 85),
                new Attempt("Go", 98),
                new Attempt("Backend", 88),
                new Attempt("AI", 91)
        );

        Map<String, Double> avgByTrack = logs.stream()
                .collect(Collectors.groupingBy(Attempt::track, Collectors.averagingInt(Attempt::score)));

        avgByTrack.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .forEach(e -> System.out.printf("%-8s 平均分: %.1f%n", e.getKey(), e.getValue()));
    }
}
`,
  },
  {
   id:'java-record',
   title:['03 · Record、密封接口与模式匹配','03 · Records, Sealed Types & Switch'],
   tag:['现代 Java','Modern Java'],
   summary:['Java 21 密封接口 + Record + switch 模式匹配，写代数数据类型更安全。','Exhaustive pattern matching over sealed interfaces and Java records.'],
   code:`public class Main {
    sealed interface AuthEvent permits LoginOk, LoginFail, TokenExpired {}
    record LoginOk(String user) implements AuthEvent {}
    record LoginFail(String user, int retries) implements AuthEvent {}
    record TokenExpired(long expiredSec) implements AuthEvent {}

    static String handle(AuthEvent ev) {
        return switch (ev) {
            case LoginOk(var user) -> "放行：欢迎回来 " + user;
            case LoginFail(var user, int r) when r >= 5 -> "锁定账号：" + user + "（连续失败 " + r + " 次）";
            case LoginFail(var user, int r) -> "密码错误：" + user + "（第 " + r + " 次）";
            case TokenExpired(long s) -> "会话已过期 " + s + " 秒，请重新登录";
        };
    }

    public static void main(String[] args) {
        for (var e : new AuthEvent[]{new LoginOk("alice"), new LoginFail("bob", 5), new TokenExpired(120)}) {
            System.out.println(handle(e));
        }
    }
}
`,
  },
  {
   id:'java-generics',
   title:['04 · 泛型与优先队列 Top-K','04 · Generics & PriorityQueue Top-K'],
   tag:['算法与泛型','Generics'],
   summary:['最小堆 PriorityQueue 维护 Top-K 高频元素，时间复杂度 O(N log K)。','Maintain Top-K elements in O(N log K) using a generic min-heap.'],
   code:`import java.util.*;

public class Main {
    static <T> List<T> topK(List<T> items, int k, Comparator<T> cmp) {
        PriorityQueue<T> minHeap = new PriorityQueue<>(cmp);
        for (T item : items) {
            minHeap.offer(item);
            if (minHeap.size() > k) {
                minHeap.poll();
            }
        }
        List<T> res = new ArrayList<>(minHeap);
        res.sort(cmp.reversed());
        return res;
    }

    public static void main(String[] args) {
        var scores = List.of(72, 95, 84, 99, 63, 91, 88);
        System.out.println("Top 3 分数: " + topK(scores, 3, Integer::compareTo));
    }
}
`,
  },
  {
   id:'java-async',
   title:['05 · CompletableFuture 异步编排与线程池','05 · CompletableFuture & Custom Executor'],
   tag:['并发编程','Concurrency'],
   summary:['用 CompletableFuture 编排多任务并发聚合，并显式传入 Executor 隔离调度。','Compose tasks with CompletableFuture and an explicit Executor strategy.'],
   code:`import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        // 生产环境推荐显式指定 Executor，避免与公共 ForkJoinPool 争抢线程
        Executor executor = Runnable::run;

        var profileFut = CompletableFuture.supplyAsync(() -> "用户: Ethan", executor);
        var statsFut = CompletableFuture.supplyAsync(() -> "已通关 42 关", executor);

        String summary = profileFut
                .thenCombineAsync(statsFut, (p, s) -> p + " | " + s, executor)
                .thenApply(res -> "[Dashboard] " + res)
                .exceptionally(ex -> "降级结果: " + ex.getMessage())
                .join();

        System.out.println(summary);
    }
}
`,
  },
  {
   id:'java-ratelimit',
   title:['06 · 面试手写：令牌桶限流器','06 · Interview: Token Bucket Limiter'],
   tag:['后端系统','Rate Limiter'],
   summary:['按固定速率补充令牌并允许一定突发流量，线程安全的经典限流实现。','Thread-safe token bucket rate limiter supporting burst capacity.'],
   code:`public class Main {
    static class TokenBucket {
        private final double capacity;
        private final double refillPerMs;
        private double tokens;
        private long lastMs;

        TokenBucket(double capacity, double ratePerSec, long nowMs) {
            this.capacity = capacity;
            this.refillPerMs = ratePerSec / 1000.0;
            this.tokens = capacity;
            this.lastMs = nowMs;
        }

        synchronized boolean allow(long nowMs) {
            if (nowMs > lastMs) {
                tokens = Math.min(capacity, tokens + (nowMs - lastMs) * refillPerMs);
                lastMs = nowMs;
            }
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
    }

    public static void main(String[] args) {
        var limiter = new TokenBucket(2, 10, 0);
        long[] reqTimes = {0, 10, 20, 150};
        for (long t : reqTimes) {
            System.out.printf("t=%3dms -> %s%n", t, limiter.allow(t) ? "ALLOW" : "429 RATE_LIMITED");
        }
    }
}
`,
  },
  {
   id:'java-lru',
   title:['07 · 面试手写：LRU 缓存 (LinkedHashMap)','07 · Interview: LRU Cache via LinkedHashMap'],
   tag:['面试手写','Interview'],
   summary:['利用 LinkedHashMap(accessOrder=true) 与 removeEldestEntry 实现 O(1) LRU。','Clean O(1) LRU cache extending Java LinkedHashMap with access-order mode.'],
   code:`import java.util.*;

public class Main {
    static class LRUCache<K, V> extends LinkedHashMap<K, V> {
        private final int cap;

        LRUCache(int cap) {
            super(cap, 0.75f, true);
            this.cap = cap;
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > cap;
        }
    }

    public static void main(String[] args) {
        var cache = new LRUCache<String, Integer>(2);
        cache.put("k1", 10);
        cache.put("k2", 20);
        cache.get("k1");        // 访问 k1，变为最新
        cache.put("k3", 30);    // 淘汰最久未用的 k2
        System.out.println("当前缓存内容: " + cache);
        System.out.println("包含 k2? " + cache.containsKey("k2"));
    }
}
`,
  },
 ],

 ts:[
  {
   id:'ts-hello',
   title:['01 · Hello, TypeScript 类型与解构','01 · Hello, TypeScript Types & Destructuring'],
   tag:['入门','Basics'],
   summary:['在浏览器隔离沙盒中运行 TypeScript：类型注解、模板字符串与解构赋值。','Run TypeScript directly in a sandboxed Web Worker with zero server roundtrip.'],
   code:`interface StudyProfile {
  name: string;
  tracks: string[];
  streakDays: number;
}

const profile: StudyProfile = {
  name: '面试自习室',
  tracks: ['Go', 'Python', 'Java', 'JS/TS', 'Rust'],
  streakDays: 14,
};

const { name, tracks, streakDays } = profile;
console.log(\`欢迎来到 \${name} JS/TS 操场！\`);
console.log(\`支持语言 (\${tracks.length})：\${tracks.join(' · ')} | 连续打卡 \${streakDays} 天\`);
`,
  },
  {
   id:'ts-map-reduce',
   title:['02 · Map/Set 去重与高阶函数分组','02 · Map, Set & Reduce Grouping'],
   tag:['数据结构','Data Structures'],
   summary:['用 Set 去重、Map 计数以及 reduce 实现类似 SQL GROUP BY 的数据透视。','Deduplicate with Set and aggregate structured items using Map and reduce.'],
   code:`interface QuestionLog {
  subject: 'go' | 'ai' | 'frontend';
  passed: boolean;
}

const logs: QuestionLog[] = [
  { subject: 'go', passed: true },
  { subject: 'ai', passed: false },
  { subject: 'go', passed: true },
  { subject: 'frontend', passed: true },
  { subject: 'ai', passed: true },
];

const uniqueSubjects = [...new Set(logs.map(l => l.subject))];
const summary = logs.reduce<Record<string, { total: number; passed: number }>>((acc, item) => {
  acc[item.subject] ??= { total: 0, passed: 0 };
  acc[item.subject].total += 1;
  if (item.passed) acc[item.subject].passed += 1;
  return acc;
}, {});

console.log('涉及学科:', uniqueSubjects);
console.log('通过统计:', JSON.stringify(summary));
`,
  },
  {
   id:'ts-unions',
   title:['03 · 可辨识联合类型与类型守卫','03 · Discriminated Unions & Narrowing'],
   tag:['类型系统','Type System'],
   summary:['用可辨识联合类型建模接口响应，避免空指针与分支遗漏。','Model API states safely with discriminated unions and type guards.'],
   code:`type ApiState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

function renderState<T>(state: ApiState<T>): string {
  switch (state.status) {
    case 'loading':
      return '加载中...';
    case 'ok':
      return '成功获取数据: ' + JSON.stringify(state.data);
    case 'error':
      return '请求失败: ' + state.message;
  }
}

const samples: ApiState<{ score: number }>[] = [
  { status: 'loading' },
  { status: 'ok', data: { score: 96 } },
  { status: 'error', message: '网络超时' },
];
for (const s of samples) console.log(renderState(s));
`,
  },
  {
   id:'ts-generics',
   title:['04 · 泛型记忆化与防抖工具函数','04 · Generic Memoize Utility'],
   tag:['泛型与工程','Generics'],
   summary:['使用泛型约束与 Map 实现带自定义 Key 生成器的通用 memoize 函数。','Build a strongly typed generic memoize utility with custom key hashing.'],
   code:`function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyOf: (...args: Args) => string = (...args) => JSON.stringify(args),
): (...args: Args) => R {
  const cache = new Map<string, R>();
  return (...args: Args): R => {
    const k = keyOf(...args);
    if (cache.has(k)) {
      console.log('命中缓存 key=' + k);
      return cache.get(k)!;
    }
    const res = fn(...args);
    cache.set(k, res);
    return res;
  };
}

const slowAdd = memoize((a: number, b: number) => a + b);
console.log('第1次:', slowAdd(12, 30));
console.log('第2次:', slowAdd(12, 30));
`,
  },
  {
   id:'ts-event-loop',
   title:['05 · 经典面试：Event Loop 微任务与宏任务','05 · Interview: Event Loop Microtasks'],
   tag:['前端原理','Event Loop'],
   summary:['直观验证同步代码、Promise.then 微任务与 setTimeout 宏任务的执行顺序。','Demonstrate execution order of sync code, microtasks, and macrotasks.'],
   code:`const order: string[] = [];

order.push('1. 同步开始');

setTimeout(() => {
  order.push('5. setTimeout 宏任务');
  console.log('执行顺序:\\n' + order.join('\\n'));
}, 0);

Promise.resolve()
  .then(() => {
    order.push('3. Promise 微任务 A');
  })
  .then(() => {
    order.push('4. Promise 微任务 B');
  });

order.push('2. 同步结束');
`,
  },
  {
   id:'ts-async-pool',
   title:['06 · Async/Await 并发限制调度器','06 · Concurrency-Limited Async Pool'],
   tag:['异步并发','Async Pool'],
   summary:['前端与 Node.js 高频手写题：控制同时最多并发执行 N 个 Promise 任务。','Run async tasks with a strict max concurrency limit using Promise workers.'],
   code:`async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function spawn() {
    while (next < items.length) {
      const cur = next++;
      results[cur] = await worker(items[cur], cur);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, spawn));
  return results;
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
(async () => {
  const tasks = ['词库', '题库', '动画', '评分', '搜索'];
  const out = await runPool(tasks, 2, async (name, i) => {
    await delay(20);
    return \`#\${i + 1} \${name} OK\`;
  });
  console.log('全部完成:', out.join(' | '));
})();
`,
  },
  {
   id:'ts-consistent-hash',
   title:['07 · 面试手写：带虚拟节点的一致性哈希','07 · Interview: Consistent Hashing Ring'],
   tag:['系统设计','System Design'],
   summary:['用 FNV-1a 哈希与二分查找实现带虚拟节点的一致性哈希环，观测负载均衡。','Consistent hash ring with virtual nodes and binary search routing.'],
   code:`class HashRing {
  private ring: { hash: number; node: string }[] = [];
  constructor(nodes: string[], private replicas = 32) {
    for (const node of nodes) {
      for (let i = 0; i < replicas; i++) {
        this.ring.push({ hash: this.fnv1a(\`\${node}#\${i}\`), node });
      }
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  private fnv1a(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  pick(key: string): string {
    const h = this.fnv1a(key);
    let lo = 0, hi = this.ring.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].hash >= h) hi = mid - 1;
      else lo = mid + 1;
    }
    return this.ring[lo % this.ring.length].node;
  }
}

const ring = new HashRing(['cache-A', 'cache-B', 'cache-C']);
const dist: Record<string, number> = {};
for (let i = 0; i < 300; i++) {
  const target = ring.pick('user:' + i);
  dist[target] = (dist[target] ?? 0) + 1;
}
console.log('300 个 Key 分布情况:', dist);
`,
  },
 ],

 rust:[
  {
   id:'rs-hello',
   title:['01 · Hello, Rust 与模式匹配','01 · Hello, Rust & Pattern Matching'],
   tag:['入门','Basics'],
   summary:['不可变默认绑定、元组解构以及覆盖全部分支的 match 表达式。','Immutable bindings, tuple destructuring, and exhaustive match arms.'],
   code:`fn describe(level: u8) -> &'static str {
    match level {
        1..=4 => "入门基础关",
        5..=10 => "核心进阶关",
        11..=15 => "系统工程与并发关",
        _ => "扩展探索关",
    }
}

fn main() {
    let (lang, total) = ("Rust", 7);
    println!("欢迎来到 {} 操场！共提供 {} 段示例。", lang, total);
    for lv in [2, 8, 13] {
        println!("Level {:>2} -> {}", lv, describe(lv));
    }
}
`,
  },
  {
   id:'rs-ownership',
   title:['02 · 所有权转移、借用与切片','02 · Ownership, Borrowing & Slices'],
   tag:['所有权','Ownership'],
   summary:['演示所有权移动 (Move)、不可变借用 (&T) 与可变借用 (&mut T) 的规则。','Demonstrate move semantics alongside shared (&T) and mutable (&mut T) borrows.'],
   code:`fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(idx) => &s[..idx],
        None => s,
    }
}

fn append_tag(buf: &mut String, tag: &str) {
    buf.push_str(" [");
    buf.push_str(tag);
    buf.push(']');
}

fn main() {
    let mut title = String::from("Rust 所有权与生命周期");
    let head = first_word(&title);
    println!("首词切片（借用）: {}", head);

    append_tag(&mut title, "已掌握");
    let moved = title; // 所有权移动到 moved
    println!("移动后的完整标题: {}", moved);
}
`,
  },
  {
   id:'rs-result',
   title:['03 · 枚举、Option 与 Result 错误传播','03 · Enums, Option & Result ?'],
   tag:['错误处理','Error Handling'],
   summary:['用自定义错误枚举和 ? 操作符优雅串联配置解析流程。','Chain fallible parsing cleanly with custom error enums and the ? operator.'],
   code:`#[derive(Debug)]
enum ParseError {
    Empty,
    BadNumber(String),
    OutOfRange(i32),
}

fn parse_port(raw: &str) -> Result<u16, ParseError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ParseError::Empty);
    }
    let n: i32 = trimmed
        .parse()
        .map_err(|_| ParseError::BadNumber(trimmed.to_string()))?;
    if !(1..=65535).contains(&n) {
        return Err(ParseError::OutOfRange(n));
    }
    Ok(n as u16)
}

fn main() {
    for input in ["8080", "", "abc", "70000"] {
        println!("{:>7} => {:?}", input, parse_port(input));
    }
}
`,
  },
  {
   id:'rs-trait-iter',
   title:['04 · Trait 抽象与零成本迭代器链','04 · Traits & Iterator Pipelines'],
   tag:['Trait 与迭代器','Traits'],
   summary:['定义公共 Trait 并利用 filter/map/sum 零开销链式统计数据。','Define a shared trait and process collections via zero-cost iterators.'],
   code:`trait Scorable {
    fn title(&self) -> &str;
    fn score(&self) -> u32;
}

struct QuizRecord {
    name: &'static str,
    points: u32,
}

impl Scorable for QuizRecord {
    fn title(&self) -> &str { self.name }
    fn score(&self) -> u32 { self.points }
}

fn main() {
    let records = vec![
        QuizRecord { name: "所有权", points: 95 },
        QuizRecord { name: "生命周期", points: 82 },
        QuizRecord { name: "并发模型", points: 91 },
    ];

    let high_titles: Vec<&str> = records
        .iter()
        .filter(|r| r.score() >= 90)
        .map(Scorable::title)
        .collect();
    let total: u32 = records.iter().map(Scorable::score).sum();

    println!("高分关卡: {:?} | 总分: {}", high_titles, total);
}
`,
  },
  {
   id:'rs-smart-ptr',
   title:['05 · 智能指针 Box 与 Rc<RefCell<T>>','05 · Smart Pointers: Box & Rc<RefCell>'],
   tag:['内存管理','Smart Pointers'],
   summary:['用 Box 定义递归链表，用 Rc<RefCell<T>> 实现单线程共享可变状态。','Recursive Box nodes and shared interior mutability with Rc<RefCell<T>>.'],
   code:`use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
enum List {
    Cons(i32, Box<List>),
    Nil,
}

fn main() {
    let list = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));
    println!("Box 链表: {:?}", list);

    let shared_counter = Rc::new(RefCell::new(10));
    let worker_a = Rc::clone(&shared_counter);
    let worker_b = Rc::clone(&shared_counter);

    *worker_a.borrow_mut() += 5;
    *worker_b.borrow_mut() *= 2;
    println!("共享计数结果: {} (强引用计数={})", shared_counter.borrow(), Rc::strong_count(&shared_counter));
}
`,
  },
  {
   id:'rs-concurrency',
   title:['06 · 多线程、Channel 与 Arc<Mutex>','06 · Threads, Channels & Arc<Mutex>'],
   tag:['并发安全','Concurrency'],
   summary:['编译期杜绝数据竞争：Arc<Mutex<T>> 共享累加 + mpsc 收集结果。','Fearless concurrency combining Arc<Mutex<T>> and mpsc channels.'],
   code:`use std::sync::{mpsc, Arc, Mutex};
use std::thread;

fn main() {
    let total = Arc::new(Mutex::new(0));
    let (tx, rx) = mpsc::channel();
    let mut handles = Vec::new();

    for id in 1..=4 {
        let total = Arc::clone(&total);
        let tx = tx.clone();
        handles.push(thread::spawn(move || {
            let val = id * 10;
            *total.lock().unwrap() += val;
            tx.send(format!("线程#{} 上报 +{}", id, val)).unwrap();
        }));
    }
    drop(tx);

    for msg in rx {
        println!("{}", msg);
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("最终汇总值: {}", *total.lock().unwrap());
}
`,
  },
  {
   id:'rs-sliding-window',
   title:['07 · 面试手写：滑动窗口最长无重复子串','07 · Interview: Sliding Window Substring'],
   tag:['面试算法','Algorithms'],
   summary:['O(n) 时间复杂度求解最长无重复字符子串长度及对应子串片段。','O(n) sliding window finding the longest substring without repeating chars.'],
   code:`use std::collections::HashMap;

fn longest_unique_substring(s: &str) -> (usize, &str) {
    let chars: Vec<(usize, char)> = s.char_indices().collect();
    let mut last_pos: HashMap<char, usize> = HashMap::new();
    let (mut left, mut best_len, mut best_start, mut best_end) = (0, 0, 0, 0);

    for (right, &(byte_idx, ch)) in chars.iter().enumerate() {
        if let Some(&prev) = last_pos.get(&ch) {
            if prev >= left {
                left = prev + 1;
            }
        }
        last_pos.insert(ch, right);
        let cur_len = right - left + 1;
        if cur_len > best_len {
            best_len = cur_len;
            best_start = chars[left].0;
            best_end = byte_idx + ch.len_utf8();
        }
    }
    (best_len, &s[best_start..best_end])
}

fn main() {
    for sample in ["abcabcbb", "pwwkew", "interview-study"] {
        let (len, sub) = longest_unique_substring(sample);
        println!("{:<16} -> len={}, sub={:?}", sample, len, sub);
    }
}
`,
  },
 ],
 sql:[
  {
   id:'sql-hello',
   title:['01 · MySQL 建表、插入与基础查询','01 · MySQL DDL, Insert & Select'],
   tag:['入门','Basics'],
   summary:['标准 MySQL 建表（AUTO_INCREMENT、ENGINE、CHARSET、COMMENT）、SHOW TABLES 与基础查询。','MySQL CREATE TABLE, AUTO_INCREMENT, SHOW TABLES and basic SELECT.'],
   code:`CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  city VARCHAR(32) NOT NULL DEFAULT '北京',
  score INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_score (city, score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

INSERT INTO users (name, city, score) VALUES
  ('Alice', '上海', 92),
  ('Bob',   '北京', 85),
  ('Carol', '上海', 96),
  ('Dave',  '深圳', 78),
  ('Eve',   '北京', 91);

SHOW TABLES;
DESC users;

SELECT id, name, city, score
FROM users
WHERE score >= 85
ORDER BY score DESC
LIMIT 0, 3;
`,
  },
  {
   id:'sql-join',
   title:['02 · 多表 LEFT JOIN、GROUP BY 与 HAVING','02 · LEFT JOIN, GROUP BY & HAVING'],
   tag:['聚合分组','JOIN & Aggregate'],
   summary:['面试高频：区分 ON 与 WHERE 对 LEFT JOIN 的影响，用 HAVING 过滤聚合结果。','Classic interview trap: ON vs WHERE in LEFT JOIN, plus HAVING aggregation.'],
   code:`CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(16) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (name) VALUES ('张三'), ('李四'), ('王五'), ('赵六');
INSERT INTO orders (user_id, amount, status) VALUES
  (1, 199.00, 'paid'),
  (1, 320.50, 'paid'),
  (1,  50.00, 'cancelled'),
  (2, 480.00, 'paid'),
  (3,  99.00, 'cancelled');

-- 统计每位用户的已支付订单数与总金额（保留 0 单用户：条件必须写在 ON 中）
SELECT
  u.id,
  u.name,
  COUNT(o.id) AS paid_orders,
  IFNULL(SUM(o.amount), 0) AS total_amount
FROM users u
LEFT JOIN orders o
  ON u.id = o.user_id AND o.status = 'paid'
GROUP BY u.id, u.name
ORDER BY total_amount DESC;

-- 仅筛出已支付总金额 > 400 的高价值用户
SELECT user_id, COUNT(*) AS cnt, SUM(amount) AS total_amount
FROM orders
WHERE status = 'paid'
GROUP BY user_id
HAVING SUM(amount) > 400;
`,
  },
  {
   id:'sql-window',
   title:['03 · 窗口函数：每组 Top-N 与排名对比','03 · Window Functions: Top-N & Ranks'],
   tag:['窗口函数','Window'],
   summary:['对比 ROW_NUMBER、RANK、DENSE_RANK 差异，并求出每个部门薪资前 2 名。','Compare ROW_NUMBER, RANK, DENSE_RANK and compute Top-2 salary per department.'],
   code:`CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  dept VARCHAR(32) NOT NULL,
  salary INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO employees (name, dept, salary) VALUES
  ('Alice', '后端', 32000),
  ('Bob',   '后端', 32000),
  ('Carol', '后端', 28000),
  ('Dave',  '后端', 25000),
  ('Eve',   '算法', 38000),
  ('Frank', '算法', 35000),
  ('Grace', '算法', 30000);

WITH ranked AS (
  SELECT
    dept,
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id ASC) AS rn,
    RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drnk
  FROM employees
)
SELECT dept, name, salary, rn, rnk, drnk
FROM ranked
WHERE drnk <= 2
ORDER BY dept, salary DESC;
`,
  },
  {
   id:'sql-cte',
   title:['04 · 面试高频：连续登录 3 天的用户','04 · Interview: 3-Day Consecutive Logins'],
   tag:['面试 SQL','Interview'],
   summary:['用日期减去 ROW_NUMBER 构造等差分组，找出至少连续 3 天登录的活跃用户。','Classic gaps-and-islands pattern using ROW_NUMBER and DATE_SUB.'],
   code:`CREATE TABLE user_logins (
  user_id INT NOT NULL,
  login_date DATE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO user_logins (user_id, login_date) VALUES
  (101, '2026-11-01'), (101, '2026-11-01'), -- 同一天重复登录先去重
  (101, '2026-11-02'),
  (101, '2026-11-03'),
  (101, '2026-11-05'),
  (102, '2026-11-01'),
  (102, '2026-11-03'),
  (102, '2026-11-04'),
  (103, '2026-11-02'),
  (103, '2026-11-03'),
  (103, '2026-11-04'),
  (103, '2026-11-05');

WITH dedup AS (
  SELECT DISTINCT user_id, login_date FROM user_logins
),
grouped AS (
  SELECT
    user_id,
    login_date,
    DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) DAY) AS grp
  FROM dedup
)
SELECT
  user_id,
  MIN(login_date) AS start_date,
  MAX(login_date) AS end_date,
  COUNT(*) AS streak_days
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) >= 3
ORDER BY streak_days DESC, user_id;
`,
  },
  {
   id:'sql-index-explain',
   title:['05 · 联合索引最左前缀与 EXPLAIN 分析','05 · Composite Index & EXPLAIN'],
   tag:['索引优化','Indexes'],
   summary:['查看联合索引结构，对比命中索引与全表扫描的 EXPLAIN 执行计划。','Inspect SHOW INDEX and compare EXPLAIN plans with and without index prefix.'],
   code:`CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL,
  amount INT NOT NULL,
  INDEX idx_user_status_time (user_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO orders (user_id, status, created_at, amount) VALUES
  (10, 'paid', '2026-11-20 10:00:00', 120),
  (10, 'paid', '2026-11-21 11:30:00', 260),
  (11, 'pending', '2026-11-21 12:00:00', 80);

SHOW INDEX FROM orders;

-- 命中联合索引 (user_id, status)
EXPLAIN SELECT id, amount
FROM orders
WHERE user_id = 10 AND status = 'paid';

-- 跳过最左列 user_id：无法利用最左前缀，退化为全表扫描
EXPLAIN SELECT id, amount
FROM orders
WHERE status = 'paid';
`,
  },
  {
   id:'sql-tx-upsert',
   title:['06 · 事务回滚与 ON DUPLICATE KEY UPDATE','06 · Transactions & Upsert'],
   tag:['事务与并发','Transactions'],
   summary:['演示 BEGIN / ROLLBACK 原子回滚、INSERT IGNORE 与 ON DUPLICATE KEY UPDATE 幂等更新。','Atomic rollback, INSERT IGNORE and ON DUPLICATE KEY UPDATE upsert.'],
   code:`CREATE TABLE inventory (
  sku VARCHAR(32) PRIMARY KEY,
  stock INT NOT NULL,
  sold INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO inventory (sku, stock) VALUES ('book-go', 10), ('book-mysql', 5);

-- 1. 冲突幂等累加（UPSERT）
INSERT INTO inventory (sku, stock, sold) VALUES ('book-go', 20, 1)
ON DUPLICATE KEY UPDATE
  stock = stock + VALUES(stock),
  sold = sold + VALUES(sold);

-- 2. 事务内扣减后异常回滚
BEGIN;
UPDATE inventory SET stock = stock - 100 WHERE sku = 'book-mysql';
ROLLBACK;

-- 3. 验证最终库存（book-go 已累加，book-mysql 未受回滚影响）
SELECT sku, stock, sold FROM inventory ORDER BY sku;
`,
  },
  {
   id:'sql-date-str',
   title:['07 · MySQL 常用日期、字符串与条件函数','07 · MySQL Date, String & IF Functions'],
   tag:['内置函数','Functions'],
   summary:['实操 CONCAT_WS、SUBSTRING_INDEX、DATE_FORMAT、DATEDIFF、IF 与 GROUP_CONCAT。','Practice CONCAT_WS, SUBSTRING_INDEX, DATE_FORMAT, DATEDIFF, IF and GROUP_CONCAT.'],
   code:`CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author VARCHAR(32) NOT NULL,
  email VARCHAR(64) NOT NULL,
  tag VARCHAR(32) NOT NULL,
  views INT NOT NULL,
  published_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO articles (author, email, tag, views, published_at) VALUES
  ('小易', 'xiaoyi@dev.cn', 'MySQL', 2400, '2026-11-18 09:30:00'),
  ('小易', 'xiaoyi@dev.cn', 'Go',    1800, '2026-11-20 14:15:00'),
  ('阿杰', 'ajie@cloud.io', 'MySQL',  650, '2026-11-21 20:00:00');

SELECT
  author,
  SUBSTRING_INDEX(email, '@', -1) AS domain,
  GROUP_CONCAT(tag SEPARATOR ' / ') AS tags,
  SUM(views) AS total_views,
  IF(SUM(views) >= 2000, '热门作者', '成长作者') AS level,
  DATE_FORMAT(MAX(published_at), '%Y-%m-%d') AS last_day,
  DATEDIFF('2026-11-22', MAX(published_at)) AS days_ago
FROM articles
GROUP BY author, domain
ORDER BY total_views DESC;
`,
  },
 ],
};
