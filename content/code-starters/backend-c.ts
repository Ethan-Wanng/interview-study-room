import type {StarterMap} from './types';

// 后端题 be-f-28（一致性哈希环）、be-f-29（扣减库存不超卖）的作答框架。
export const backendStartersC:StarterMap={
'be-f-28':{
python:String.raw`import bisect
import zlib

class Ring:
    def __init__(self, replicas: int):
        self.replicas = replicas
        self.keys: list[int] = []        # 有序的虚拟节点哈希
        self.nodes: dict[int, str] = {}  # 虚拟节点哈希 → 真实节点

    def add(self, node: str) -> None:
        # TODO 1：给这个真实节点放 replicas 个虚拟节点：哈希 f"{node}#{i}"（用 zlib.crc32），
        #         记下“虚拟节点哈希 → 真实节点”，并按顺序插入 self.keys（bisect.insort）
        ...

    def get(self, key: str) -> str:
        # TODO 2：空环时返回 ""
        ...
        h = zlib.crc32(key.encode())
        # TODO 3：二分查找第一个 >= h 的位置（bisect.bisect_left）
        i = ...
        # TODO 4：越过末尾时绕回环的起点
        ...
        return self.nodes[self.keys[i]]`,
go:String.raw`type Ring struct {
    replicas int
    keys     []uint32          // 有序的虚拟节点哈希
    nodes    map[uint32]string // 虚拟节点哈希 → 真实节点
}

func NewRing(replicas int) *Ring {
    return &Ring{replicas: replicas, nodes: map[uint32]string{}}
}

func (r *Ring) Add(node string) {
    // TODO 1：给这个真实节点放 replicas 个虚拟节点：哈希 node + "#" + 序号（crc32.ChecksumIEEE），
    //         追加到 r.keys 并记下“虚拟节点哈希 → 真实节点”
    ...
    // TODO 2：把虚拟节点哈希排序
    ...
}

func (r *Ring) Get(key string) string {
    // TODO 3：空环时返回 ""
    ...
    h := crc32.ChecksumIEEE([]byte(key))
    // TODO 4：二分查找第一个 >= h 的位置（slices.BinarySearch）；越过末尾时绕回起点
    i := ...
    return r.nodes[r.keys[i]]
}`,
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
        // TODO 1：给这个真实节点放 replicas 个虚拟节点：哈希 node + "#" + 序号，放进 ring
        ...
    }

    String get(String key) {
        // TODO 2：空环时返回 ""
        ...
        // TODO 3：找到第一个 >= 该哈希的虚拟节点（ceilingEntry）；没有就绕回第一个（firstEntry）
        ...
    }
}`,
ts:String.raw`import { crc32 } from "node:zlib"; // Node.js 22 起自带 crc32

class Ring {
  private keys: number[] = [];               // 有序的虚拟节点哈希
  private nodes = new Map<number, string>(); // 虚拟节点哈希 → 真实节点
  constructor(private replicas: number) {}

  add(node: string): void {
    // TODO 1：给这个真实节点放 replicas 个虚拟节点：哈希 node + "#" + 序号，
    //         追加到 this.keys 并记下“虚拟节点哈希 → 真实节点”
    ...
    // TODO 2：把虚拟节点哈希从小到大排序
    ...
  }

  get(key: string): string {
    // TODO 3：空环时返回 ""
    ...
    const h = crc32(key);
    // TODO 4：二分查找第一个 >= h 的位置
    let lo = ...;
    // TODO 5：越过末尾时绕回起点
    ...
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
        // TODO 1：给这个真实节点放 replicas 个虚拟节点：哈希 "node#序号"，插入 self.ring
        ...
    }

    // 空环时返回 None
    fn get(&self, key: &str) -> Option<&String> {
        let h = hash(key);
        // TODO 2：从第一个 >= h 的位置开始找（self.ring.range(h..)）；没有就绕回第一个；返回真实节点
        ...
    }
}`,
},

'be-f-29':{
python:String.raw`class OutOfStock(Exception):
    pass

def deduct(conn, sku_id: int, n: int) -> None:
    cur = conn.cursor()
    # TODO 1：写一条 UPDATE，把“检查库存够不够”和“扣减”放在同一条语句里（WHERE available >= n）
    cur.execute(
        "...",
        (...),
    )
    # TODO 2：根据影响行数判断：没有行被更新说明库存不足，抛出 OutOfStock
    ...
    conn.commit()`,
go:String.raw`var ErrOutOfStock = errors.New("库存不足")

func Deduct(ctx context.Context, db *sql.DB, skuID int64, n int) error {
    // TODO 1：写一条 UPDATE，把“检查库存够不够”和“扣减”放在同一条语句里（WHERE available >= n）
    res, err := db.ExecContext(ctx, "...", ...)
    if err != nil {
        return err
    }
    // TODO 2：取出影响行数（res.RowsAffected）；为 0 说明库存不足，返回 ErrOutOfStock
    ...
    return nil
}`,
java:String.raw`static void deduct(Connection conn, long skuId, int n) throws SQLException {
    // TODO 1：写一条 UPDATE，把“检查库存够不够”和“扣减”放在同一条语句里（WHERE available >= ?）
    String sql = "...";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        // TODO 2：按顺序绑定参数
        ...
        int rows = ps.executeUpdate(); // 返回受影响的行数
        // TODO 3：没有行被更新说明库存不足，抛出明确的错误
        ...
    }
}`,
ts:String.raw`import type { Pool } from "mysql2/promise";

async function deduct(db: Pool, skuId: number, n: number): Promise<void> {
  // TODO 1：写一条 UPDATE，把“检查库存够不够”和“扣减”放在同一条语句里（WHERE available >= ?）
  const [res]: any = await db.execute(
    "...",
    [...],
  );
  // TODO 2：res.affectedRows 为 0 说明库存不足，抛出明确的错误
  ...
}`,
rust:String.raw`// 使用 sqlx（常用的异步数据库库）
async fn deduct(db: &sqlx::MySqlPool, sku_id: i64, n: i32) -> Result<(), String> {
    // TODO 1：写一条 UPDATE，把“检查库存够不够”和“扣减”放在同一条语句里（WHERE available >= ?），
    //         按顺序 bind 参数并执行
    let res = sqlx::query("...")
        ...
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    // TODO 2：res.rows_affected() 为 0 说明库存不足，返回明确的错误
    ...
    Ok(())
}`,
},
};
