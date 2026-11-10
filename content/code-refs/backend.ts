// 后端开发代码题的其他语言写法（主写法 Go 在题目自身的 reference 里）。
// 用 String.raw 是为了让代码里的 \n、\d 等原样保留。
import type {CodeRefEntry} from './index';

export const backendRefs:Record<string,CodeRefEntry>={
'be-ds-10':{base:'go',
python:String.raw`def has_cycle(head) -> bool:
    slow = fast = head
    while fast and fast.next:  # fast 走到尽头说明没有环
        slow = slow.next       # 慢指针每次走一步
        fast = fast.next.next  # 快指针每次走两步
        if slow is fast:       # is 比较是不是同一个节点对象
            return True
    return False`,
java:String.raw`static boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) { // fast 走到尽头说明没有环
        slow = slow.next;        // 慢指针每次走一步
        fast = fast.next.next;   // 快指针每次走两步
        if (slow == fast) return true; // 相遇说明有环
    }
    return false;
}`,
ts:String.raw`function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) { // fast 走到尽头说明没有环
    slow = slow!.next;        // 慢指针每次走一步
    fast = fast.next.next;    // 快指针每次走两步
    if (slow === fast) return true; // 相遇说明有环
  }
  return false;
}`,
rust:String.raw`// Rust 的所有权规则让“有环链表”很难用普通 Box 写出来，
// 这里把节点放在数组里，next 存下一个节点的下标（None 表示结尾）
struct Node {
    next: Option<usize>,
}

fn has_cycle(nodes: &[Node], head: Option<usize>) -> bool {
    let (mut slow, mut fast) = (head, head);
    // 快指针每次走两步，任何一步走到 None 都说明没有环
    while let Some(f) = fast {
        let Some(f1) = nodes[f].next else { return false };
        fast = nodes[f1].next;
        slow = nodes[slow.unwrap()].next; // 慢指针每次走一步
        if fast.is_some() && slow == fast {
            return true; // 相遇说明有环
        }
    }
    false
}`},

'be-algo-10':{base:'go',
python:String.raw`class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next   # 先保存下一个节点，否则改完指向就找不到了
        cur.next = prev  # 当前节点改为指向前一个
        prev = cur
        cur = nxt
    return prev          # 空链表时 prev 仍是 None`,
java:String.raw`class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}

static Node reverse(Node head) {
    Node prev = null, cur = head;
    while (cur != null) {
        Node next = cur.next; // 先保存下一个节点
        cur.next = prev;      // 当前节点改为指向前一个
        prev = cur;
        cur = next;
    }
    return prev; // 空链表时返回 null
}`,
ts:String.raw`type ListNode = { val: number; next: ListNode | null };

function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let cur = head;
  while (cur) {
    const next: ListNode | null = cur.next; // 先保存下一个节点
    cur.next = prev;                        // 当前节点改为指向前一个
    prev = cur;
    cur = next;
  }
  return prev; // 空链表时返回 null
}`,
rust:String.raw`struct Node {
    val: i32,
    next: Option<Box<Node>>, // Box 把下一个节点放在堆上；None 表示结尾
}

fn reverse(head: Option<Box<Node>>) -> Option<Box<Node>> {
    let mut prev = None;
    let mut cur = head;
    while let Some(mut node) = cur {
        cur = node.next.take(); // 先取出下一个节点（take 把原位置变成 None）
        node.next = prev;       // 当前节点改为指向前一个
        prev = Some(node);
    }
    prev // 空链表时返回 None
}`},

'be-x1-37':{base:'go',
python:String.raw`def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen = {}  # 值 → 下标
    for i, v in enumerate(nums):
        if target - v in seen:  # 先查，再存当前值，避免把自己用两次
            return seen[target - v], i
        seen[v] = i
    return None  # 找不到`,
java:String.raw`// 找不到时返回 null
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // 值 → 下标
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]); // 先查，再存当前值
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    return null;
}`,
ts:String.raw`function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>(); // 值 → 下标
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]); // 先查，再存当前值
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return null; // 找不到
}`,
rust:String.raw`use std::collections::HashMap;

fn two_sum(nums: &[i32], target: i32) -> Option<(usize, usize)> {
    let mut seen = HashMap::new(); // 值 → 下标
    for (i, &v) in nums.iter().enumerate() {
        if let Some(&j) = seen.get(&(target - v)) { // 先查，再存当前值
            return Some((j, i));
        }
        seen.insert(v, i);
    }
    None // 找不到
}`},

'be-x1-15':{base:'go',
python:String.raw`from collections import OrderedDict

class LRU:
    # OrderedDict 内部就是“哈希表 + 双向链表”，能 O(1) 地把某个键移到末尾
    def __init__(self, capacity: int):
        self.cap = capacity
        self.data = OrderedDict()  # 末尾 = 最近使用，开头 = 最久未使用

    def get(self, key):
        if key not in self.data:
            return None
        self.data.move_to_end(key)  # 访问后变成最近使用
        return self.data[key]

    def put(self, key, val) -> None:
        if key in self.data:
            self.data.move_to_end(key)  # 已存在：更新并移到最近
        self.data[key] = val
        if len(self.data) > self.cap:
            self.data.popitem(last=False)  # 删掉最久未使用的（开头）
# 注意：不是线程安全的，多线程使用时要加锁`,
java:String.raw`// LinkedHashMap 内部就是“哈希表 + 双向链表”；accessOrder=true 表示按访问顺序排列
class LRU<K, V> extends LinkedHashMap<K, V> {
    private final int cap;

    LRU(int capacity) {
        super(16, 0.75f, true); // 第三个参数 true：get/put 都会把条目移到末尾
        this.cap = capacity;
    }

    // 每次 put 之后调用：超过容量就删掉最久未使用的（链表头部）
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > cap;
    }
}
// 用法：lru.get(k)、lru.put(k, v)；不是线程安全的，需要时加锁`,
ts:String.raw`// JS 的 Map 会记住插入顺序：先删再插入，就能把某个键“移到最后”
class LRU<K, V> {
  private data = new Map<K, V>();
  constructor(private cap: number) {}

  get(key: K): V | undefined {
    if (!this.data.has(key)) return undefined;
    const val = this.data.get(key)!;
    this.data.delete(key); // 移到末尾 = 最近使用
    this.data.set(key, val);
    return val;
  }

  put(key: K, val: V): void {
    this.data.delete(key); // 已存在：先删掉，再放到末尾
    this.data.set(key, val);
    if (this.data.size > this.cap) {
      const oldest = this.data.keys().next().value!; // 开头 = 最久未使用
      this.data.delete(oldest);
    }
  }
}`,
rust:String.raw`use std::collections::HashMap;

// 用数组模拟双向链表：节点存在 Vec 里，prev/next 存下标，避免 Rust 里复杂的指针所有权
struct Entry { key: i32, val: i32, prev: usize, next: usize }

struct Lru {
    cap: usize,
    map: HashMap<i32, usize>, // key → 节点下标
    nodes: Vec<Entry>,        // nodes[0] 是哨兵：它的 next 是最新，prev 是最旧
}

impl Lru {
    fn new(cap: usize) -> Self {
        let head = Entry { key: 0, val: 0, prev: 0, next: 0 };
        Lru { cap, map: HashMap::new(), nodes: vec![head] }
    }

    fn unlink(&mut self, i: usize) {
        let (p, n) = (self.nodes[i].prev, self.nodes[i].next);
        self.nodes[p].next = n;
        self.nodes[n].prev = p;
    }

    fn push_front(&mut self, i: usize) {
        let first = self.nodes[0].next;
        self.nodes[i].prev = 0;
        self.nodes[i].next = first;
        self.nodes[first].prev = i;
        self.nodes[0].next = i;
    }

    fn get(&mut self, key: i32) -> Option<i32> {
        let i = *self.map.get(&key)?;
        self.unlink(i);
        self.push_front(i); // 访问后移到头部
        Some(self.nodes[i].val)
    }

    fn put(&mut self, key: i32, val: i32) {
        if let Some(&i) = self.map.get(&key) {
            self.nodes[i].val = val; // 已存在：更新并移到头部
            self.unlink(i);
            self.push_front(i);
            return;
        }
        let i = if self.map.len() == self.cap {
            let old = self.nodes[0].prev; // 尾部 = 最久未使用，复用它的位置
            self.unlink(old);
            self.map.remove(&self.nodes[old].key);
            self.nodes[old].key = key;
            self.nodes[old].val = val;
            old
        } else {
            self.nodes.push(Entry { key, val, prev: 0, next: 0 });
            self.nodes.len() - 1
        };
        self.map.insert(key, i);
        self.push_front(i);
    }
}`},

'be-f-28':{base:'go',
python:String.raw`import bisect
import zlib

class Ring:
    def __init__(self, replicas: int):
        self.replicas = replicas
        self.keys: list[int] = []        # 有序的虚拟节点哈希
        self.nodes: dict[int, str] = {}  # 虚拟节点哈希 → 真实节点

    def add(self, node: str) -> None:
        for i in range(self.replicas):  # 每个真实节点放 replicas 个虚拟节点
            h = zlib.crc32(f"{node}#{i}".encode())
            self.nodes[h] = node
            bisect.insort(self.keys, h)  # 插入并保持有序

    def get(self, key: str) -> str:
        if not self.keys:
            return ""  # 空环
        h = zlib.crc32(key.encode())
        i = bisect.bisect_left(self.keys, h)  # 第一个 >= h 的位置
        if i == len(self.keys):
            i = 0  # 越过末尾，绕回环的起点
        return self.nodes[self.keys[i]]`,
java:String.raw`import java.util.TreeMap;
import java.util.zip.CRC32;

class Ring {
    private final int replicas;
    // TreeMap 按键自动排序：虚拟节点哈希 → 真实节点
    private final TreeMap<Long, String> ring = new TreeMap<>();

    Ring(int replicas) { this.replicas = replicas; }

    private static long hash(String s) {
        CRC32 c = new CRC32();
        c.update(s.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return c.getValue();
    }

    void add(String node) {
        for (int i = 0; i < replicas; i++) ring.put(hash(node + "#" + i), node);
    }

    String get(String key) {
        if (ring.isEmpty()) return ""; // 空环
        // ceilingEntry：第一个 >= 该哈希的虚拟节点；没有就绕回第一个
        var e = ring.ceilingEntry(hash(key));
        return (e != null ? e : ring.firstEntry()).getValue();
    }
}`,
ts:String.raw`import { crc32 } from "node:zlib"; // Node.js 22 起自带 crc32

class Ring {
  private keys: number[] = [];               // 有序的虚拟节点哈希
  private nodes = new Map<number, string>(); // 虚拟节点哈希 → 真实节点
  constructor(private replicas: number) {}

  add(node: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const h = crc32(node + "#" + i);
      this.keys.push(h);
      this.nodes.set(h, node);
    }
    this.keys.sort((a, b) => a - b);
  }

  get(key: string): string {
    if (this.keys.length === 0) return ""; // 空环
    const h = crc32(key);
    // 二分查找第一个 >= h 的位置
    let lo = 0, hi = this.keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.keys[mid] < h) lo = mid + 1; else hi = mid;
    }
    if (lo === this.keys.length) lo = 0; // 越过末尾，绕回起点
    return this.nodes.get(this.keys[lo])!;
  }
}`,
rust:String.raw`use std::collections::BTreeMap;

// crc32fast 是常用的 CRC32 库
fn hash(s: &str) -> u32 {
    crc32fast::hash(s.as_bytes())
}

struct Ring {
    replicas: usize,
    ring: BTreeMap<u32, String>, // BTreeMap 按键有序：虚拟节点哈希 → 真实节点
}

impl Ring {
    fn new(replicas: usize) -> Self {
        Ring { replicas, ring: BTreeMap::new() }
    }

    fn add(&mut self, node: &str) {
        for i in 0..self.replicas {
            self.ring.insert(hash(&format!("{}#{}", node, i)), node.to_string());
        }
    }

    fn get(&self, key: &str) -> Option<&String> {
        let h = hash(key);
        // range(h..) 从第一个 >= h 的位置开始；没有就绕回第一个；空环返回 None
        self.ring.range(h..).next().or_else(|| self.ring.iter().next()).map(|(_, n)| n)
    }
}`},

'be-f-29':{base:'go',
python:String.raw`class OutOfStock(Exception):
    pass

def deduct(conn, sku_id: int, n: int) -> None:
    # 检查和扣减放在同一条 SQL 里，数据库保证原子性，不会超卖
    cur = conn.cursor()
    cur.execute(
        "UPDATE stock SET available = available - %s WHERE sku_id = %s AND available >= %s",
        (n, sku_id, n),
    )
    if cur.rowcount == 0:  # 没有行被更新：库存不足
        raise OutOfStock(f"商品 {sku_id} 库存不足")
    conn.commit()`,
java:String.raw`static void deduct(Connection conn, long skuId, int n) throws SQLException {
    // 检查和扣减放在同一条 SQL 里，数据库保证原子性，不会超卖
    String sql = "UPDATE stock SET available = available - ? WHERE sku_id = ? AND available >= ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setInt(1, n);
        ps.setLong(2, skuId);
        ps.setInt(3, n);
        int rows = ps.executeUpdate(); // 返回受影响的行数
        if (rows == 0) throw new IllegalStateException("库存不足"); // 没有行被更新
    }
}`,
ts:String.raw`import type { Pool } from "mysql2/promise";

async function deduct(db: Pool, skuId: number, n: number): Promise<void> {
  // 检查和扣减放在同一条 SQL 里，数据库保证原子性，不会超卖
  const [res]: any = await db.execute(
    "UPDATE stock SET available = available - ? WHERE sku_id = ? AND available >= ?",
    [n, skuId, n],
  );
  if (res.affectedRows === 0) throw new Error("库存不足"); // 没有行被更新
}`,
rust:String.raw`// 使用 sqlx（常用的异步数据库库）
async fn deduct(db: &sqlx::MySqlPool, sku_id: i64, n: i32) -> Result<(), String> {
    // 检查和扣减放在同一条 SQL 里，数据库保证原子性，不会超卖
    let res = sqlx::query("UPDATE stock SET available = available - ? WHERE sku_id = ? AND available >= ?")
        .bind(n)
        .bind(sku_id)
        .bind(n)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    if res.rows_affected() == 0 {
        return Err("库存不足".into()); // 没有行被更新
    }
    Ok(())
}`},

'be-f-30':{base:'go',
python:String.raw`import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

def add_limit(app: FastAPI, n: int) -> None:
    active = 0  # 正在处理的请求数；asyncio 是单线程的，加减不需要锁

    @app.middleware("http")
    async def limit(request: Request, call_next):
        nonlocal active
        if active >= n:  # 已满：不排队，直接拒绝
            return PlainTextResponse("服务繁忙，请稍后重试", status_code=503,
                                     headers={"Retry-After": "1"})
        active += 1
        try:
            return await call_next(request)
        finally:
            active -= 1  # 不管成功还是出错，都要归还名额`,
java:String.raw`import java.util.concurrent.Semaphore;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;

public class LimitFilter implements Filter {
    private final Semaphore sem; // 信号量：最多 n 个许可

    public LimitFilter(int n) { this.sem = new Semaphore(n); }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws java.io.IOException, ServletException {
        if (!sem.tryAcquire()) { // tryAcquire 拿不到立刻返回 false，不排队
            HttpServletResponse r = (HttpServletResponse) res;
            r.setHeader("Retry-After", "1");
            r.sendError(503, "服务繁忙，请稍后重试");
            return;
        }
        try {
            chain.doFilter(req, res);
        } finally {
            sem.release(); // 处理完归还许可
        }
    }
}`,
ts:String.raw`import type { Request, Response, NextFunction } from "express";

function limit(n: number) {
  let active = 0; // 正在处理的请求数；Node.js 是单线程的，加减不需要锁
  return (req: Request, res: Response, next: NextFunction) => {
    if (active >= n) { // 已满：不排队，直接拒绝
      res.set("Retry-After", "1").status(503).send("服务繁忙，请稍后重试");
      return;
    }
    active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.on("finish", release); // 正常响应完成
    res.on("close", release);  // 客户端提前断开
    next();
  };
}`,
rust:String.raw`use std::sync::Arc;
use axum::{extract::{Request, State}, http::StatusCode, middleware::Next, response::{IntoResponse, Response}};
use tokio::sync::Semaphore;

// 用法：.layer(axum::middleware::from_fn_with_state(Arc::new(Semaphore::new(n)), limit))
async fn limit(State(sem): State<Arc<Semaphore>>, req: Request, next: Next) -> Response {
    // try_acquire 拿不到许可立刻返回 Err，不排队
    match sem.try_acquire() {
        Ok(_permit) => next.run(req).await, // _permit 离开作用域时自动归还许可
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            [("Retry-After", "1")],
            "服务繁忙，请稍后重试",
        )
            .into_response(),
    }
}`},

'be-e1-25':{base:'go',
python:String.raw`import uuid
import redis

# Lua 脚本在 Redis 里原子执行：值相等（是自己的锁）才删除
UNLOCK = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0
"""

def lock(r: redis.Redis, key: str, ttl_ms: int) -> tuple[str, bool]:
    token = str(uuid.uuid4())  # 随机值，用来证明“这把锁是我加的”
    ok = r.set(key, token, nx=True, px=ttl_ms)  # NX：不存在才设置；PX：过期毫秒数
    return token, bool(ok)

def unlock(r: redis.Redis, key: str, token: str) -> None:
    r.eval(UNLOCK, 1, key, token)`,
java:String.raw`// 使用 Jedis 客户端
static final String UNLOCK =
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0";

// 返回 token；加锁失败返回 null
static String lock(Jedis jedis, String key, long ttlMs) {
    String token = UUID.randomUUID().toString(); // 随机值，证明锁是自己加的
    String ok = jedis.set(key, token, SetParams.setParams().nx().px(ttlMs));
    return "OK".equals(ok) ? token : null;
}

static void unlock(Jedis jedis, String key, String token) {
    // Lua 脚本原子执行：值相等才删除，不会误删别人的锁
    jedis.eval(UNLOCK, List.of(key), List.of(token));
}`,
ts:String.raw`import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";

// Lua 脚本在 Redis 里原子执行：值相等（是自己的锁）才删除
const UNLOCK =
  'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end return 0';

async function lock(r: Redis, key: string, ttlMs: number): Promise<{ token: string; ok: boolean }> {
  const token = randomUUID(); // 随机值，证明锁是自己加的
  const res = await r.set(key, token, "PX", ttlMs, "NX"); // 成功返回 "OK"，已被占用返回 null
  return { token, ok: res === "OK" };
}

async function unlock(r: Redis, key: string, token: string): Promise<void> {
  await r.eval(UNLOCK, 1, key, token);
}`,
rust:String.raw`use uuid::Uuid;

const UNLOCK: &str = r#"
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0"#;

// 返回 (token, 是否加锁成功)
async fn lock(con: &mut redis::aio::MultiplexedConnection, key: &str, ttl_ms: u64) -> redis::RedisResult<(String, bool)> {
    let token = Uuid::new_v4().to_string(); // 随机值，证明锁是自己加的
    // SET key token NX PX ttl：成功返回 "OK"，已被占用返回空
    let res: Option<String> = redis::cmd("SET")
        .arg(key).arg(&token).arg("NX").arg("PX").arg(ttl_ms)
        .query_async(con).await?;
    Ok((token, res.is_some()))
}

async fn unlock(con: &mut redis::aio::MultiplexedConnection, key: &str, token: &str) -> redis::RedisResult<()> {
    // Lua 脚本原子执行：值相等才删除，不会误删别人的锁
    let _: i32 = redis::Script::new(UNLOCK).key(key).arg(token).invoke_async(con).await?;
    Ok(())
}`},

'be-e2-24':{base:'go',
python:String.raw`import threading
import time

class Bucket:
    def __init__(self, rate: float, burst: float):
        self.rate = rate      # 每秒补充的令牌数
        self.burst = burst    # 桶容量
        self.tokens = burst   # 一开始桶是满的
        self.last = time.monotonic()  # monotonic：不受系统改时间影响的时钟
        self.lock = threading.Lock()

    def allow(self) -> bool:
        with self.lock:  # 加锁保证多线程同时调用也安全
            now = time.monotonic()
            # 按距离上次的时间差补充令牌，但不超过桶容量
            self.tokens = min(self.burst, self.tokens + (now - self.last) * self.rate)
            self.last = now
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False`,
java:String.raw`class Bucket {
    private final double rate, burst; // 每秒补充的令牌数、桶容量
    private double tokens;
    private long last = System.nanoTime();

    Bucket(double rate, double burst) {
        this.rate = rate;
        this.burst = burst;
        this.tokens = burst; // 一开始桶是满的
    }

    // synchronized：同一时间只有一个线程能进入，保证并发安全
    synchronized boolean allow() {
        long now = System.nanoTime();
        tokens = Math.min(burst, tokens + (now - last) / 1e9 * rate); // 按时间差补充
        last = now;
        if (tokens >= 1) {
            tokens--;
            return true;
        }
        return false;
    }
}`,
ts:String.raw`// Node.js 单线程执行，同步函数不会被打断，不需要加锁
class Bucket {
  private tokens: number;
  private last = performance.now(); // 毫秒

  constructor(private rate: number, private burst: number) {
    this.tokens = burst; // 一开始桶是满的
  }

  allow(): boolean {
    const now = performance.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }
}`,
rust:String.raw`use std::sync::Mutex;
use std::time::Instant;

struct State {
    tokens: f64,
    last: Instant,
}

struct Bucket {
    rate: f64,  // 每秒补充的令牌数
    burst: f64, // 桶容量
    state: Mutex<State>, // 会变化的部分放进 Mutex，多线程共享时安全
}

impl Bucket {
    fn new(rate: f64, burst: f64) -> Self {
        Bucket { rate, burst, state: Mutex::new(State { tokens: burst, last: Instant::now() }) }
    }

    fn allow(&self) -> bool {
        let mut s = self.state.lock().unwrap(); // 离开函数时自动解锁
        let now = Instant::now();
        s.tokens = self.burst.min(s.tokens + now.duration_since(s.last).as_secs_f64() * self.rate);
        s.last = now;
        if s.tokens >= 1.0 {
            s.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}`},

'be-e2-25':{base:'go',
python:String.raw`import psycopg  # PostgreSQL 驱动；其他数据库思路相同

def handle(conn: psycopg.Connection, ev) -> None:
    try:
        # with conn.transaction()：块内正常结束就提交，抛出异常就回滚
        with conn.transaction():
            conn.execute("INSERT INTO processed(event_id) VALUES (%s)", (ev.id,))
            conn.execute("UPDATE points SET n = n + %s WHERE user_id = %s", (ev.points, ev.user_id))
    except psycopg.errors.UniqueViolation:
        return  # 主键冲突：已经处理过，幂等返回成功
    # 走到这里说明事务已提交，调用方之后才能提交消息位移`,
java:String.raw`static void handle(Connection conn, Event ev) throws SQLException {
    conn.setAutoCommit(false); // 开启事务
    try (var ins = conn.prepareStatement("INSERT INTO processed(event_id) VALUES (?)");
         var upd = conn.prepareStatement("UPDATE points SET n = n + ? WHERE user_id = ?")) {
        ins.setString(1, ev.id());
        ins.executeUpdate();
        upd.setInt(1, ev.points());
        upd.setLong(2, ev.userId());
        upd.executeUpdate();
        conn.commit();
    } catch (SQLIntegrityConstraintViolationException dup) {
        conn.rollback();
        return; // 主键冲突：已经处理过，幂等返回成功
    } catch (SQLException e) {
        conn.rollback(); // 任何一步失败都回滚
        throw e;
    }
}`,
ts:String.raw`import type { Pool } from "pg";

async function handle(db: Pool, ev: { id: string; points: number; userId: number }): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO processed(event_id) VALUES ($1)", [ev.id]);
    await client.query("UPDATE points SET n = n + $1 WHERE user_id = $2", [ev.points, ev.userId]);
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK"); // 任何一步失败都回滚
    if (err.code === "23505") return; // 23505 = 主键冲突：已处理过，幂等返回成功
    throw err;
  } finally {
    client.release(); // 把连接还给连接池
  }
}`,
rust:String.raw`async fn handle(db: &sqlx::PgPool, ev: &Event) -> Result<(), sqlx::Error> {
    let mut tx = db.begin().await?; // tx 没提交就被丢弃时，会自动回滚
    let inserted = sqlx::query("INSERT INTO processed(event_id) VALUES ($1)")
        .bind(&ev.id)
        .execute(&mut *tx)
        .await;
    if let Err(sqlx::Error::Database(e)) = &inserted {
        if e.is_unique_violation() {
            return Ok(()); // 主键冲突：已处理过，幂等返回成功
        }
    }
    inserted?; // 其他错误向上返回（tx 自动回滚）
    sqlx::query("UPDATE points SET n = n + $1 WHERE user_id = $2")
        .bind(ev.points)
        .bind(ev.user_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await // 提交成功后，调用方才能提交消息位移
}`},

'be-x2-15':{base:'go',
python:String.raw`import json
import logging
import random
import redis

class NotFound(Exception):
    pass

def get_user(rdb: redis.Redis, user_id: str) -> dict:
    key = "user:" + user_id
    try:
        s = rdb.get(key)  # 未命中时返回 None
        if s is not None:
            if s == b"":
                raise NotFound(user_id)  # 命中空值缓存：数据库里也没有
            return json.loads(s)
    except redis.RedisError as err:
        logging.warning("redis: %s", err)  # 缓存故障时降级查库

    user = db.find_user(user_id)  # 查不到返回 None
    if user is None:
        rdb.set(key, "", ex=60)  # 缓存空值，TTL 短，防止穿透
        raise NotFound(user_id)
    ttl = 600 + random.randint(0, 59)  # 10 分钟 + 随机抖动，避免同时过期
    rdb.set(key, json.dumps(user), ex=ttl)
    return user`,
java:String.raw`// 使用 Jedis 和 Jackson；查不到时返回 Optional.empty()
static Optional<User> getUser(String id) throws Exception {
    String key = "user:" + id;
    try {
        String s = jedis.get(key); // 未命中时返回 null
        if (s != null) {
            if (s.isEmpty()) return Optional.empty(); // 命中空值缓存
            return Optional.of(JSON.readValue(s, User.class));
        }
    } catch (JedisException e) {
        log.warn("redis: {}", e.getMessage()); // 缓存故障时降级查库
    }
    Optional<User> u = db.findUser(id);
    if (u.isEmpty()) {
        jedis.setex(key, 60, ""); // 缓存空值，TTL 短，防止穿透
        return u;
    }
    long ttl = 600 + ThreadLocalRandom.current().nextInt(60); // 10 分钟 + 随机抖动
    jedis.setex(key, ttl, JSON.writeValueAsString(u.get()));
    return u;
}`,
ts:String.raw`// 使用 ioredis；查不到时返回 null
async function getUser(id: string): Promise<User | null> {
  const key = "user:" + id;
  try {
    const s = await redis.get(key); // 未命中时返回 null
    if (s !== null) {
      if (s === "") return null; // 命中空值缓存
      return JSON.parse(s) as User;
    }
  } catch (err) {
    console.warn("redis:", err); // 缓存故障时降级查库
  }
  const user = await db.findUser(id);
  if (!user) {
    await redis.set(key, "", "EX", 60); // 缓存空值，TTL 短，防止穿透
    return null;
  }
  const ttl = 600 + Math.floor(Math.random() * 60); // 10 分钟 + 随机抖动
  await redis.set(key, JSON.stringify(user), "EX", ttl);
  return user;
}`,
rust:String.raw`use rand::Rng;
use redis::AsyncCommands;

// 查不到时返回 Ok(None)
async fn get_user(con: &mut redis::aio::MultiplexedConnection, id: &str) -> Result<Option<User>, AppError> {
    let key = format!("user:{}", id);
    match con.get::<_, Option<String>>(&key).await {
        Ok(Some(s)) if s.is_empty() => return Ok(None), // 命中空值缓存
        Ok(Some(s)) => {
            if let Ok(u) = serde_json::from_str(&s) {
                return Ok(Some(u));
            }
        }
        Ok(None) => {} // 未命中
        Err(e) => eprintln!("redis: {}", e), // 缓存故障时降级查库
    }
    let Some(user) = db_find_user(id).await? else {
        let _: redis::RedisResult<()> = con.set_ex(&key, "", 60).await; // 缓存空值，TTL 短
        return Ok(None);
    };
    let ttl = 600 + rand::thread_rng().gen_range(0..60); // 10 分钟 + 随机抖动
    let _: redis::RedisResult<()> = con.set_ex(&key, serde_json::to_string(&user)?, ttl).await;
    Ok(Some(user))
}`},

'be-x3-15':{base:'go',
python:String.raw`import socket
import struct

MAX_FRAME = 1 << 20  # 1MB

def read_exact(sock: socket.socket, n: int) -> bytes:
    """读满 n 个字节；TCP 一次 recv 可能只拿到一部分，所以要循环读。"""
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("连接提前关闭")
        buf += chunk
    return bytes(buf)

def read_frame(sock: socket.socket) -> bytes:
    (n,) = struct.unpack(">I", read_exact(sock, 4))  # >I：大端序的 4 字节无符号整数
    if n > MAX_FRAME:
        raise ValueError(f"帧太大：{n} 字节")  # 防止恶意大帧耗尽内存
    return read_exact(sock, n)`,
java:String.raw`static final int MAX_FRAME = 1 << 20; // 1MB

static byte[] readFrame(DataInputStream in) throws IOException {
    // readInt 按大端序读 4 个字节；不够 4 个字节会一直等，连接关闭则抛异常
    int n = in.readInt();
    if (n < 0 || n > MAX_FRAME) {
        throw new IOException("帧太大：" + Integer.toUnsignedString(n) + " 字节");
    }
    byte[] buf = new byte[n];
    in.readFully(buf); // 读满 n 个字节
    return buf;
}`,
ts:String.raw`import type { Socket } from "node:net";

const MAX_FRAME = 1 << 20; // 1MB

// Node.js 的 socket 是“推”数据的：收到多少就给多少，所以要自己攒够再切帧
function onFrames(sock: Socket, handle: (frame: Buffer) => void): void {
  let buf = Buffer.alloc(0);
  sock.on("data", chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 4) {
      const n = buf.readUInt32BE(0); // 大端序读长度
      if (n > MAX_FRAME) {
        sock.destroy(new Error("帧太大：" + n + " 字节")); // 防止恶意大帧
        return;
      }
      if (buf.length < 4 + n) break; // 数据还没收全，等下一批
      handle(buf.subarray(4, 4 + n));
      buf = buf.subarray(4 + n);
    }
  });
}`,
rust:String.raw`use std::io::{self, Read};

const MAX_FRAME: u32 = 1 << 20; // 1MB

fn read_frame(r: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut head = [0u8; 4];
    r.read_exact(&mut head)?; // 读满 4 个字节
    let n = u32::from_be_bytes(head); // 按大端序解析长度
    if n > MAX_FRAME {
        return Err(io::Error::new(io::ErrorKind::InvalidData, format!("帧太大：{} 字节", n)));
    }
    let mut buf = vec![0u8; n as usize];
    r.read_exact(&mut buf)?; // 读满数据
    Ok(buf)
}`},

'be-x4-15':{base:'go',
python:String.raw`import threading
import time

class BreakerOpen(Exception):
    pass

class Breaker:
    def __init__(self):
        self.lock = threading.Lock()
        self.fails = 0
        self.state = "closed"  # closed 关闭 / open 打开 / half 半开
        self.opened_at = 0.0

    def call(self, fn):
        with self.lock:
            if self.state == "open":
                if time.monotonic() - self.opened_at < 30:
                    raise BreakerOpen("熔断中")  # 打开期间快速失败
                self.state = "half"  # 30 秒到了：放一个请求试探
            elif self.state == "half":
                raise BreakerOpen("熔断中")  # 试探期间其他请求仍被拒绝
        try:
            result = fn()  # 调用本身不持有锁，避免慢调用堵住其他线程
        except Exception:
            with self.lock:
                self.fails += 1
                if self.state == "half" or self.fails >= 5:
                    self.state, self.opened_at = "open", time.monotonic()
            raise
        with self.lock:
            self.fails, self.state = 0, "closed"  # 成功：关闭熔断器
        return result`,
java:String.raw`class Breaker {
    private int fails = 0;
    private String state = "closed"; // closed 关闭 / open 打开 / half 半开
    private long openedAt = 0;

    <T> T call(Callable<T> fn) throws Exception {
        synchronized (this) {
            if (state.equals("open")) {
                if (System.currentTimeMillis() - openedAt < 30_000) {
                    throw new IllegalStateException("熔断中"); // 打开期间快速失败
                }
                state = "half"; // 30 秒到了：放一个请求试探
            } else if (state.equals("half")) {
                throw new IllegalStateException("熔断中"); // 试探期间其他请求仍被拒绝
            }
        }
        try {
            T result = fn.call(); // 调用本身不持有锁
            synchronized (this) { fails = 0; state = "closed"; } // 成功：关闭
            return result;
        } catch (Exception e) {
            synchronized (this) {
                fails++;
                if (state.equals("half") || fails >= 5) {
                    state = "open";
                    openedAt = System.currentTimeMillis();
                }
            }
            throw e;
        }
    }
}`,
ts:String.raw`// Node.js 单线程，状态读写不需要加锁
class Breaker {
  private fails = 0;
  private state: "closed" | "open" | "half" = "closed";
  private openedAt = 0;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < 30_000) throw new Error("熔断中"); // 快速失败
      this.state = "half"; // 30 秒到了：放一个请求试探
    } else if (this.state === "half") {
      throw new Error("熔断中"); // 试探期间其他请求仍被拒绝
    }
    try {
      const result = await fn();
      this.fails = 0;
      this.state = "closed"; // 成功：关闭
      return result;
    } catch (err) {
      this.fails++;
      if (this.state === "half" || this.fails >= 5) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      throw err;
    }
  }
}`,
rust:String.raw`use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(PartialEq)]
enum State { Closed, Open, Half }

struct Inner { fails: u32, state: State, opened_at: Instant }

struct Breaker { inner: Mutex<Inner> }

impl Breaker {
    fn new() -> Self {
        Breaker { inner: Mutex::new(Inner { fails: 0, state: State::Closed, opened_at: Instant::now() }) }
    }

    fn call<T, E>(&self, f: impl FnOnce() -> Result<T, E>) -> Result<T, Option<E>> {
        {
            let mut s = self.inner.lock().unwrap();
            match s.state {
                State::Open if s.opened_at.elapsed() < Duration::from_secs(30) => return Err(None), // 熔断中
                State::Open => s.state = State::Half, // 30 秒到了：放一个请求试探
                State::Half => return Err(None),      // 试探期间其他请求仍被拒绝
                State::Closed => {}
            }
        } // 这里锁自动释放，调用本身不持有锁
        let res = f();
        let mut s = self.inner.lock().unwrap();
        match res {
            Ok(v) => {
                s.fails = 0;
                s.state = State::Closed; // 成功：关闭
                Ok(v)
            }
            Err(e) => {
                s.fails += 1;
                if s.state == State::Half || s.fails >= 5 {
                    s.state = State::Open;
                    s.opened_at = Instant::now();
                }
                Err(Some(e)) // Err(None) 表示被熔断拒绝，Err(Some) 是业务本身的错误
            }
        }
    }
}`},
};
