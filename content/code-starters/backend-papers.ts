import type {StarterMap} from './types';

// 后端阶段考与结业考综合试卷中的代码题（be-p1-c02、be-p2-c01、be-p2-c02、be-pf-c01、be-pf-c02）作答框架。
export const backendPaperStarters:StarterMap={
'be-p1-c02':{
python:String.raw`class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map: dict[int, Node] = {}
        self.head = Node()  # 哨兵头（head.next 为最近使用）
        self.tail = Node()  # 哨兵尾（tail.prev 为最久未使用）
        self.head.next = self.tail
        self.tail.prev = self.head

    # TODO 1：实现双向链表的 _remove（摘除节点）与 _add_front（插入 head 之后），保持指针不断链
    def _remove(self, node: Node) -> None:
        ...

    def _add_front(self, node: Node) -> None:
        ...

    def get(self, key: int) -> int:
        # TODO 2：未命中返回 -1；命中时把节点移到头部并返回值
        ...

    def put(self, key: int, value: int) -> None:
        # TODO 3：若 key 已存在，更新值并移到头部后返回
        ...
        # TODO 4：新键插入头部并写入 self.map；超出容量时淘汰 tail.prev 并同步从 self.map 删除
        ...`,
go:String.raw`type node struct {
    key, val   int
    prev, next *node
}

type LRUCache struct {
    cap        int
    m          map[int]*node
    head, tail *node // 哨兵节点
}

func NewLRUCache(capacity int) *LRUCache {
    h, t := &node{}, &node{}
    h.next, t.prev = t, h
    return &LRUCache{cap: capacity, m: make(map[int]*node), head: h, tail: t}
}

// TODO 1：实现双向链表的 remove（摘除节点）与 addFront（插入 head 之后），保持指针不断链
func (c *LRUCache) remove(n *node) {
    ...
}

func (c *LRUCache) addFront(n *node) {
    ...
}

func (c *LRUCache) Get(key int) int {
    // TODO 2：未命中返回 -1；命中时把节点移到头部并返回值
    ...
}

func (c *LRUCache) Put(key, value int) {
    // TODO 3：若 key 已存在，更新值并移到头部后返回
    ...
    // TODO 4：新键插入头部并写入 map；超出容量时淘汰 tail.prev 并同步从 map 删除
    ...
}`,
java:String.raw`class LRUCache {
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }

    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);

    public LRUCache(int capacity) {
        this.cap = capacity;
        head.next = tail;
        tail.prev = head;
    }

    // TODO 1：实现双向链表的 remove（摘除节点）与 addFront（插入 head 之后），保持指针不断链
    private void remove(Node n) {
        ...
    }

    private void addFront(Node n) {
        ...
    }

    public int get(int key) {
        // TODO 2：未命中返回 -1；命中时把节点移到头部并返回值
        ...
    }

    public void put(int key, int value) {
        // TODO 3：若 key 已存在，更新值并移到头部后返回
        ...
        // TODO 4：新键插入头部并写入 map；超出容量时淘汰 tail.prev 并同步从 map 删除
        ...
    }
}`,
ts:String.raw`class DNode {
  prev: DNode | null = null;
  next: DNode | null = null;
  constructor(public key = 0, public val = 0) {}
}

class LRUCache {
  private map = new Map<number, DNode>();
  private head = new DNode();
  private tail = new DNode();

  constructor(private cap: number) {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // TODO 1：实现双向链表的 remove（摘除节点）与 addFront（插入 head 之后），保持指针不断链
  private remove(n: DNode): void {
    ...
  }

  private addFront(n: DNode): void {
    ...
  }

  get(key: number): number {
    // TODO 2：未命中返回 -1；命中时把节点移到头部并返回值
    ...
  }

  put(key: number, value: number): void {
    // TODO 3：若 key 已存在，更新值并移到头部后返回
    ...
    // TODO 4：新键插入头部并写入 map；超出容量时淘汰 tail.prev 并同步从 map 删除
    ...
  }
}`,
rust:String.raw`use std::collections::HashMap;

// 用数组下标模拟双向链表：nodes[0] 是哨兵（next 是最新，prev 是最旧）
struct Entry { key: i32, val: i32, prev: usize, next: usize }

struct LRUCache {
    cap: usize,
    map: HashMap<i32, usize>,
    nodes: Vec<Entry>,
}

impl LRUCache {
    fn new(capacity: usize) -> Self {
        let sentinel = Entry { key: 0, val: 0, prev: 0, next: 0 };
        LRUCache { cap: capacity, map: HashMap::new(), nodes: vec![sentinel] }
    }

    // TODO 1：实现双向链表的 remove（摘除节点 i）与 add_front（插到哨兵 nodes[0] 之后）
    fn remove(&mut self, i: usize) {
        ...
    }

    fn add_front(&mut self, i: usize) {
        ...
    }

    fn get(&mut self, key: i32) -> i32 {
        // TODO 2：未命中返回 -1；命中时把节点移到头部并返回值
        ...
    }

    fn put(&mut self, key: i32, value: i32) {
        // TODO 3：若 key 已存在，更新值并移到头部后返回
        ...
        // TODO 4：超出容量时淘汰尾部（nodes[0].prev）并复用其槽位、从 map 删掉旧 key；否则新推入节点，再插入头部与 map
        ...
    }
}`,
},

'be-p2-c01':{
python:String.raw`import uuid
import redis

# TODO 1：编写 Lua 解锁脚本：先比较 KEYS[1] 存的值是否等于 ARGV[1]，相等才删除，否则返回 0
UNLOCK = "..."

def try_lock(r: redis.Redis, key: str, ttl_ms: int) -> str | None:
    # TODO 2：生成唯一随机 token 标识持有者
    token = ...
    # TODO 3：原子执行 SET（NX + PX ttl_ms）；成功返回 token，失败返回 None
    ...

def unlock(r: redis.Redis, key: str, token: str) -> bool:
    # TODO 4：正确传参执行 UNLOCK 脚本，返回是否释放成功
    ...`,
go:String.raw`// TODO 1：编写 Lua 解锁脚本：先比较 KEYS[1] 存的值是否等于 ARGV[1]，相等才删除，否则返回 0
var unlockScript = redis.NewScript("...")

// 成功返回 token 与 nil；抢锁失败返回 "", nil
func tryLock(ctx context.Context, rdb *redis.Client, key string, ttlMs int64) (string, error) {
    // TODO 2：生成唯一随机 token 标识持有者
    token := ...
    // TODO 3：原子执行 SET NX PX 加锁并设置过期；抢锁成功返回 token，失败返回 ""
    ...
}

func unlock(ctx context.Context, rdb *redis.Client, key, token string) (bool, error) {
    // TODO 4：正确传入 key 与 token 执行 unlockScript，返回是否释放成功
    ...
}`,
java:String.raw`// 使用 Jedis 客户端
// TODO 1：编写 Lua 解锁脚本：先比较 KEYS[1] 存的值是否等于 ARGV[1]，相等才删除，否则返回 0
static final String UNLOCK = "...";

static String tryLock(Jedis jedis, String key, long ttlMs) {
    // TODO 2：生成唯一随机 token 标识持有者
    String token = ...;
    // TODO 3：原子执行 SET（nx + px ttlMs）；抢锁成功返回 token，失败返回 null
    ...
}

static boolean unlock(Jedis jedis, String key, String token) {
    // TODO 4：正确传入 key 与 token 执行 UNLOCK 脚本，返回是否释放成功
    ...
}`,
ts:String.raw`import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";

// TODO 1：编写 Lua 解锁脚本：先比较 KEYS[1] 存的值是否等于 ARGV[1]，相等才删除，否则返回 0
const UNLOCK = "...";

async function tryLock(r: Redis, key: string, ttlMs: number): Promise<string | null> {
  // TODO 2：生成唯一随机 token 标识持有者
  const token = ...;
  // TODO 3：原子执行 SET key token PX ttlMs NX；抢锁成功返回 token，失败返回 null
  ...
}

async function unlock(r: Redis, key: string, token: string): Promise<boolean> {
  // TODO 4：正确传入 key 与 token 执行 UNLOCK 脚本，返回是否释放成功
  ...
}`,
rust:String.raw`use uuid::Uuid;

// TODO 1：编写 Lua 解锁脚本：先比较 KEYS[1] 存的值是否等于 ARGV[1]，相等才删除，否则返回 0
const UNLOCK: &str = "...";

// 成功返回 Ok(Some(token))，抢锁失败返回 Ok(None)
async fn try_lock(con: &mut redis::aio::MultiplexedConnection, key: &str, ttl_ms: u64) -> redis::RedisResult<Option<String>> {
    // TODO 2：生成唯一随机 token 标识持有者
    let token = ...;
    // TODO 3：原子执行 SET key token NX PX ttl_ms；成功返回 Some(token)，失败返回 None
    ...
}

async fn unlock(con: &mut redis::aio::MultiplexedConnection, key: &str, token: &str) -> redis::RedisResult<bool> {
    // TODO 4：正确传入 key 与 token 执行 UNLOCK 脚本，返回是否释放成功
    ...
}`,
},

'be-p2-c02':{
python:String.raw`from collections import defaultdict, deque
import time

WINDOW_MS = 60_000
LIMIT = 100
windows: dict[str, deque[int]] = defaultdict(deque)  # 生产可用定长环形缓冲区并定期清理不活跃用户

def allow(user_id: str, now_ms: int | None = None) -> bool:
    # TODO 1：单机版：清理该用户 60 秒窗口外的过期时间戳（注意 O(1) 头删与内存清理）
    ...
    # TODO 2：单机版：若窗口内请求数已达 100 返回 False，否则记录本次时间并返回 True
    ...

# TODO 3：分布式版 Lua 脚本：用 Redis ZSet 删除窗口外记录、统计数量并判断是否超限，未超限时写入唯一成员并设置过期时间
SLIDING_LUA = "..."

def allow_distributed(r, user_id: str) -> bool:
    # TODO 4：传入参数调用 r.eval 执行 SLIDING_LUA，返回是否放行
    ...`,
go:String.raw`const (
    windowMs = 60_000
    limit    = 100
)

type SlidingLimiter struct {
    mu      sync.Mutex
    windows map[string][]int64 // 生产可用环形缓冲区降低头删开销，并定期清理不活跃用户
}

func (l *SlidingLimiter) allow(userID string, nowMs int64) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    // TODO 1：单机版：清理该用户 60 秒窗口外的过期时间戳
    ...
    // TODO 2：单机版：若窗口内请求数已达 100 返回 false，否则记录本次时间并返回 true
    ...
}

// TODO 3：分布式版 Lua 脚本：用 Redis ZSet 删除窗口外记录、统计数量并判断是否超限，未超限时写入唯一成员并设置过期时间
var slidingScript = redis.NewScript("...")

func allowDistributed(ctx context.Context, rdb *redis.Client, userID string) (bool, error) {
    // TODO 4：传入参数执行 slidingScript，返回是否放行
    ...
}`,
java:String.raw`static final long WINDOW_MS = 60_000;
static final int LIMIT = 100;
// 生产中可用环形缓冲区优化复杂度并定期清理不活跃用户
static final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

static boolean allow(String userId, long nowMs) {
    Deque<Long> q = windows.computeIfAbsent(userId, k -> new ArrayDeque<>());
    synchronized (q) {
        // TODO 1：单机版：清理该用户 60 秒窗口外的过期时间戳
        ...
        // TODO 2：单机版：若窗口内请求数已达 100 返回 false，否则记录本次时间并返回 true
        ...
    }
}

// TODO 3：分布式版 Lua 脚本：用 Redis ZSet 删除窗口外记录、统计数量并判断是否超限，未超限时写入唯一成员并设置过期时间
static final String SLIDING_LUA = "...";

static boolean allowDistributed(Jedis jedis, String userId) {
    // TODO 4：传入参数调用 jedis.eval 执行 SLIDING_LUA，返回是否放行
    ...
}`,
ts:String.raw`const WINDOW_MS = 60_000;
const LIMIT = 100;
const windows = new Map<string, number[]>(); // 生产可用环形缓冲区优化头删，并定期清理不活跃用户

function allow(userId: string, now = Date.now()): boolean {
  // TODO 1：单机版：获取该用户的时间戳队列并清理 60 秒窗口外的过期记录
  ...
  // TODO 2：单机版：若窗口内请求数已达 100 返回 false，否则记录本次时间并返回 true
  ...
}

// TODO 3：分布式版 Lua 脚本：用 Redis ZSet 删除窗口外记录、统计数量并判断是否超限，未超限时写入唯一成员并设置过期时间
const SLIDING_LUA = "...";

async function allowDistributed(redis: Redis, userId: string): Promise<boolean> {
  // TODO 4：传入参数调用 redis.eval 执行 SLIDING_LUA，返回是否放行
  ...
}`,
rust:String.raw`use std::collections::{HashMap, VecDeque};

const WINDOW_MS: u64 = 60_000;
const LIMIT: usize = 100;

struct SlidingLimiter {
    windows: HashMap<String, VecDeque<u64>>, // 生产可用定长环形缓冲区并定期清理不活跃用户
}

impl SlidingLimiter {
    fn allow(&mut self, user_id: &str, now_ms: u64) -> bool {
        // TODO 1：单机版：清理该用户 60 秒窗口外的过期时间戳（VecDeque 头删为 O(1)）
        ...
        // TODO 2：单机版：若窗口内请求数已达 100 返回 false，否则记录本次时间并返回 true
        ...
    }
}

// TODO 3：分布式版 Lua 脚本：用 Redis ZSet 删除窗口外记录、统计数量并判断是否超限，未超限时写入唯一成员并设置过期时间
const SLIDING_LUA: &str = "...";

async fn allow_distributed(con: &mut redis::aio::MultiplexedConnection, user_id: &str, now_ms: u64) -> redis::RedisResult<bool> {
    // TODO 4：传入参数通过 redis::Script 执行 SLIDING_LUA，返回是否放行
    ...
}`,
},

'be-pf-c01':{
python:String.raw`def top_k_frequent(nums: list[int], k: int) -> list[int]:
    if k <= 0 or not nums:
        return []
    # TODO 1：用哈希表统计每个元素的出现次数
    count: dict[int, int] = {}
    ...
    # TODO 2：用桶排序（频次作下标）或大小为 k 的小顶堆筛选高频元素
    ...
    # TODO 3：收集结果，取满 k 个即停止并返回；并在下方注释说明时间复杂度
    res: list[int] = []
    ...
    return res
# 复杂度说明：...`,
go:String.raw`func topKFrequent(nums []int, k int) []int {
    if k <= 0 || len(nums) == 0 {
        return nil
    }
    // TODO 1：用 map 统计每个元素的出现次数
    count := map[int]int{}
    ...
    // TODO 2：用桶排序（频次作下标）或大小为 k 的小顶堆筛选高频元素
    ...
    // TODO 3：收集结果，取满 k 个即停止并返回；并在下方注释说明时间复杂度
    var res []int
    ...
    return res
}
// 复杂度说明：...`,
java:String.raw`static List<Integer> topKFrequent(int[] nums, int k) {
    if (k <= 0 || nums.length == 0) return List.of();
    // TODO 1：用 HashMap 统计每个元素的出现次数
    Map<Integer, Integer> count = new HashMap<>();
    ...
    // TODO 2：用桶排序（频次作下标）或大小为 k 的小顶堆（PriorityQueue）筛选高频元素
    ...
    // TODO 3：收集结果，取满 k 个即停止并返回；并在下方注释说明时间复杂度
    List<Integer> res = new ArrayList<>();
    ...
    return res;
}
// 复杂度说明：...`,
ts:String.raw`function topKFrequent(nums: number[], k: number): number[] {
  if (k <= 0 || nums.length === 0) return [];
  // TODO 1：用 Map 统计每个元素的出现次数
  const count = new Map<number, number>();
  ...
  // TODO 2：用桶排序（频次作下标）或大小为 k 的小顶堆筛选高频元素
  ...
  // TODO 3：收集结果，取满 k 个即停止并返回；并在下方注释说明时间复杂度
  const res: number[] = [];
  ...
  return res;
}
// 复杂度说明：...`,
rust:String.raw`use std::collections::HashMap;

fn top_k_frequent(nums: &[i32], k: usize) -> Vec<i32> {
    if k == 0 || nums.is_empty() {
        return Vec::new();
    }
    // TODO 1：用 HashMap 统计每个元素的出现次数
    let mut count: HashMap<i32, usize> = HashMap::new();
    ...
    // TODO 2：用桶排序（频次作下标）或大小为 k 的小顶堆筛选高频元素
    ...
    // TODO 3：收集结果，取满 k 个即停止并返回；并在下方注释说明时间复杂度
    let mut res = Vec::new();
    ...
    res
}
// 复杂度说明：...`,
},

'be-pf-c02':{
python:String.raw`# TODO 1：用映射表定义合法流转（CREATED→PAID/CANCELLED，PAID→SHIPPED/CANCELLED，SHIPPED→COMPLETED），并在开头校验非法流转
ALLOWED: dict[str, set[str]] = {
    ...
}

def transition(conn, order_id: int, from_status: str, to_status: str, request_id: str) -> dict:
    ...
    # TODO 2：开启事务，先按 request_id 查 order_events 实现幂等（表上对 request_id 建唯一索引兜底）
    with conn.transaction():
        ...
        # TODO 3：执行条件更新（WHERE id = %s AND status = %s）；影响行数为 0 时查当前状态，已为 to_status 则幂等返回，否则报错
        ...
        # TODO 4：在同一事务中往 order_events 写入状态变更日志
        ...
    return {"ok": True}`,
go:String.raw`// TODO 1：用映射表定义合法流转（CREATED→PAID/CANCELLED，PAID→SHIPPED/CANCELLED，SHIPPED→COMPLETED），并在开头校验非法流转
var allowed = map[string]map[string]bool{
    ...
}

func transition(ctx context.Context, db *sql.DB, orderID int64, from, to, requestID string) (bool, error) {
    ...
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return false, err
    }
    defer tx.Rollback()
    // TODO 2：先按 requestID 查 order_events 实现幂等（表上对 request_id 建唯一索引兜底）
    ...
    // TODO 3：执行条件更新（WHERE id = ? AND status = ?）；影响行数为 0 时查当前状态，已是 to 则幂等返回，否则返回明确错误
    ...
    // TODO 4：在同一事务中往 order_events 写入状态变更日志并提交事务
    ...
    return true, nil
}`,
java:String.raw`// TODO 1：用映射表定义合法流转（CREATED→PAID/CANCELLED，PAID→SHIPPED/CANCELLED，SHIPPED→COMPLETED），并在开头校验非法流转
static final Map<String, Set<String>> ALLOWED = Map.of(
    ...
);

static boolean transition(Connection conn, long orderId, String from, String to, String requestId) throws SQLException {
    ...
    conn.setAutoCommit(false);
    try {
        // TODO 2：先按 requestId 查 order_events 实现幂等（表上对 request_id 建唯一索引兜底）
        ...
        // TODO 3：执行条件更新（WHERE id = ? AND status = ?）；影响行数为 0 时查当前状态，已是 to 则幂等返回，否则抛错
        ...
        // TODO 4：在同一事务中往 order_events 写入状态变更日志并 commit（异常时回滚）
        ...
        return true;
    } catch (SQLException | RuntimeException e) {
        conn.rollback();
        throw e;
    }
}`,
ts:String.raw`// TODO 1：用映射表定义合法流转（CREATED→PAID/CANCELLED，PAID→SHIPPED/CANCELLED，SHIPPED→COMPLETED），并在开头校验非法流转
const ALLOWED: Record<string, string[]> = {
  ...
};

async function transition(orderId: number, from: string, to: string, requestId: string) {
  ...
  return db.transaction(async tx => {
    // TODO 2：先按 requestId 查 order_events 实现幂等（表上对 request_id 建唯一索引兜底）
    ...
    // TODO 3：执行条件更新（WHERE id = ? AND status = ?）；affectedRows 为 0 时查当前状态，已是 to 则幂等返回，否则抛错
    ...
    // TODO 4：在同一事务中往 order_events 写入状态变更日志并返回结果
    ...
  });
}`,
rust:String.raw`fn is_allowed(from: &str, to: &str) -> bool {
    // TODO 1：用 match 定义合法流转（CREATED→PAID/CANCELLED，PAID→SHIPPED/CANCELLED，SHIPPED→COMPLETED）
    ...
}

async fn transition(db: &sqlx::MySqlPool, order_id: i64, from: &str, to: &str, request_id: &str) -> Result<bool, String> {
    if !is_allowed(from, to) {
        return Err(format!("非法流转：{} -> {}", from, to));
    }
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    // TODO 2：先按 request_id 查 order_events 实现幂等（表上对 request_id 建唯一索引兜底）
    ...
    // TODO 3：执行条件更新（WHERE id = ? AND status = ?）；rows_affected 为 0 时查当前状态，已是 to 则幂等返回，否则返回明确错误
    ...
    // TODO 4：在同一事务中往 order_events 写入状态变更日志并提交事务
    ...
    Ok(true)
}`,
},
};
