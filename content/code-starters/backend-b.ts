import type {StarterMap} from './types';

// 后端题 be-x1-15（LRU 缓存）的作答框架。
export const backendStartersB:StarterMap={
'be-x1-15':{
python:String.raw`from collections import OrderedDict

class LRU:
    # OrderedDict 内部就是“哈希表 + 双向链表”，能 O(1) 地把某个键移到末尾
    def __init__(self, capacity: int):
        self.cap = capacity
        self.data = OrderedDict()  # 末尾 = 最近使用，开头 = 最久未使用

    def get(self, key):
        if key not in self.data:
            return None
        # TODO 1：访问后把这个键移到末尾（变成最近使用），再返回值
        ...

    def put(self, key, val) -> None:
        # TODO 2：已经存在时，先把它移到末尾；然后写入新值
        ...
        # TODO 3：超过容量时，删掉最久未使用的那个（开头）
        ...
# 注意：不是线程安全的，多线程使用时要加锁`,
go:String.raw`type entry struct{ key, val int }

type LRU struct {
    cap int
    ll  *list.List            // 双向链表：头部 = 最近使用，尾部 = 最久未使用
    m   map[int]*list.Element // key → 链表节点
}

func NewLRU(capacity int) *LRU {
    return &LRU{cap: capacity, ll: list.New(), m: make(map[int]*list.Element)}
}

func (c *LRU) Get(k int) (int, bool) {
    // TODO 1：在 map 里找到节点后，移到链表头部，再返回它的值
    ...
    return 0, false
}

func (c *LRU) Put(k, v int) {
    // TODO 2：已经存在时，更新值并移到头部，然后返回
    ...
    // TODO 3：不存在时，插到链表头部并记进 map
    ...
    // TODO 4：超过容量时，删掉链表尾部的节点，同时从 map 里删掉它的 key
    ...
}
// 注意：不是并发安全的，多个 goroutine 使用时要加锁`,
java:String.raw`// LinkedHashMap 内部就是“哈希表 + 双向链表”
class LRU<K, V> extends LinkedHashMap<K, V> {
    private final int cap;

    LRU(int capacity) {
        // TODO 1：调用父类构造函数，并让条目按“访问顺序”排列（get/put 都会把条目移到末尾）
        super(...);
        this.cap = capacity;
    }

    // 每次 put 之后调用：返回 true 时删掉最久未使用的条目（链表头部）
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        // TODO 2：超过容量时返回 true
        return ...;
    }
}
// 用法：lru.get(k)、lru.put(k, v)；不是线程安全的，需要时加锁`,
ts:String.raw`// JS 的 Map 会记住插入顺序：先删再插入，就能把某个键“移到最后”
class LRU<K, V> {
  private data = new Map<K, V>(); // 末尾 = 最近使用，开头 = 最久未使用
  constructor(private cap: number) {}

  get(key: K): V | undefined {
    if (!this.data.has(key)) return undefined;
    // TODO 1：把这个键移到末尾（先删再插入），再返回值
    ...
  }

  put(key: K, val: V): void {
    // TODO 2：已经存在时先删掉，再把新值放到末尾
    ...
    // TODO 3：超过容量时，删掉开头那个（最久未使用；可以用 this.data.keys().next().value）
    ...
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

    // 把节点 i 从链表里摘下来
    fn unlink(&mut self, i: usize) {
        let (p, n) = (self.nodes[i].prev, self.nodes[i].next);
        self.nodes[p].next = n;
        self.nodes[n].prev = p;
    }

    // 把节点 i 放到头部（哨兵后面）
    fn push_front(&mut self, i: usize) {
        let first = self.nodes[0].next;
        self.nodes[i].prev = 0;
        self.nodes[i].next = first;
        self.nodes[first].prev = i;
        self.nodes[0].next = i;
    }

    fn get(&mut self, key: i32) -> Option<i32> {
        let i = *self.map.get(&key)?;
        // TODO 1：访问后把节点移到头部，再返回它的值
        ...
    }

    fn put(&mut self, key: i32, val: i32) {
        // TODO 2：已经存在时，更新值并移到头部，然后返回
        ...
        // TODO 3：满了时，摘下尾部（nodes[0].prev）的节点，从 map 删掉旧 key，复用这个位置；
        //         没满时，push 一个新节点。得到新节点的下标 i
        let i = ...;
        self.map.insert(key, i);
        self.push_front(i);
    }
}`,
},
};
