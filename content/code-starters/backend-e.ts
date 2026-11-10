import type {StarterMap} from './types';

// 后端题 be-e2-24（令牌桶限流）、be-e2-25（消费者幂等处理）的作答框架。
export const backendStartersE:StarterMap={
'be-e2-24':{
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
        # TODO 1：加锁，保证多线程同时调用也安全
        with ...:
            now = time.monotonic()
            # TODO 2：按距离上次的时间差补充令牌，但不能超过桶容量；再更新 last
            ...
            # TODO 3：有令牌（>= 1）就消耗一个并返回 True，否则返回 False
            ...`,
go:String.raw`type Bucket struct {
    mu     sync.Mutex
    rate   float64 // 每秒补充的令牌数
    burst  float64 // 桶容量
    tokens float64
    last   time.Time
}

func NewBucket(rate, burst float64) *Bucket {
    return &Bucket{rate: rate, burst: burst, tokens: burst, last: time.Now()}
}

func (b *Bucket) Allow() bool {
    // TODO 1：加锁（并用 defer 解锁），保证并发安全
    ...
    now := time.Now()
    // TODO 2：按距离上次的时间差补充令牌，但不能超过桶容量；再更新 last
    ...
    // TODO 3：有令牌（>= 1）就消耗一个并返回 true，否则返回 false
    ...
}`,
java:String.raw`class Bucket {
    private final double rate, burst; // 每秒补充的令牌数、桶容量
    private double tokens;
    private long last = System.nanoTime();

    Bucket(double rate, double burst) {
        this.rate = rate;
        this.burst = burst;
        this.tokens = burst; // 一开始桶是满的
    }

    // TODO 1：让这个方法同一时间只有一个线程能进入（并发安全）
    ... boolean allow() {
        long now = System.nanoTime();
        // TODO 2：按距离上次的时间差补充令牌（纳秒换算成秒），但不能超过桶容量；再更新 last
        ...
        // TODO 3：有令牌（>= 1）就消耗一个并返回 true，否则返回 false
        ...
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
    // TODO 1：按距离上次的时间差补充令牌（毫秒换算成秒），但不能超过桶容量；再更新 last
    ...
    // TODO 2：有令牌（>= 1）就消耗一个并返回 true，否则返回 false
    ...
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
        // TODO 1：拿到锁（离开函数时自动解锁）
        let mut s = ...;
        let now = Instant::now();
        // TODO 2：按距离上次的时间差补充令牌，但不能超过桶容量；再更新 last
        ...
        // TODO 3：有令牌（>= 1.0）就消耗一个并返回 true，否则返回 false
        ...
    }
}`,
},

'be-e2-25':{
python:String.raw`import psycopg  # PostgreSQL 驱动；其他数据库思路相同

def handle(conn: psycopg.Connection, ev) -> None:
    try:
        # TODO 1：开一个事务（块内正常结束就提交，抛出异常就回滚）
        with ...:
            # TODO 2：先往去重表 processed 插入 ev.id
            ...
            # TODO 3：再执行业务更新：给 ev.user_id 的积分加上 ev.points
            ...
    # TODO 4：主键冲突说明这个事件已经处理过，直接返回（幂等）
    except ...:
        return
    # 走到这里说明事务已提交，调用方之后才能提交消息位移`,
go:String.raw`func Handle(ctx context.Context, db *sql.DB, ev Event) error {
    // TODO 1：开启事务；用 defer tx.Rollback() 保证中途失败会回滚（提交成功后 Rollback 是无操作）
    ...
    // TODO 2：先往去重表 processed 插入 ev.ID；主键冲突（isDuplicateKey）说明已处理过，直接返回 nil
    ...
    // TODO 3：再执行业务更新：给 ev.UserID 的积分加上 ev.Points
    ...
    // TODO 4：提交事务（提交成功后，调用方才能提交消息位移）
    ...
}`,
java:String.raw`static void handle(Connection conn, Event ev) throws SQLException {
    // TODO 1：开启事务（关闭自动提交）
    ...
    try (var ins = conn.prepareStatement("INSERT INTO processed(event_id) VALUES (?)");
         var upd = conn.prepareStatement("UPDATE points SET n = n + ? WHERE user_id = ?")) {
        // TODO 2：先插入去重记录，再执行业务更新，最后提交
        ...
    } catch (SQLIntegrityConstraintViolationException dup) {
        // TODO 3：主键冲突：回滚后直接返回（已经处理过，幂等）
        ...
    } catch (SQLException e) {
        // TODO 4：其他错误：回滚后继续往外抛
        ...
    }
}`,
ts:String.raw`import type { Pool } from "pg";

async function handle(db: Pool, ev: { id: string; points: number; userId: number }): Promise<void> {
  const client = await db.connect();
  try {
    // TODO 1：开启事务，先往去重表 processed 插入 ev.id，再给 ev.userId 的积分加上 ev.points，最后提交
    ...
  } catch (err: any) {
    // TODO 2：任何一步失败都先回滚
    ...
    // TODO 3：错误码 23505（主键冲突）说明已处理过，直接返回；其他错误继续抛出
    ...
  } finally {
    client.release(); // 把连接还给连接池
  }
}`,
rust:String.raw`async fn handle(db: &sqlx::PgPool, ev: &Event) -> Result<(), sqlx::Error> {
    // TODO 1：开启事务（tx 没提交就被丢弃时，会自动回滚）
    let mut tx = ...;
    let inserted = sqlx::query("INSERT INTO processed(event_id) VALUES ($1)")
        .bind(&ev.id)
        .execute(&mut *tx)
        .await;
    // TODO 2：主键冲突（is_unique_violation）说明已处理过，直接返回 Ok(())；其他错误向上返回
    ...
    // TODO 3：再执行业务更新：给 ev.user_id 的积分加上 ev.points
    ...
    // TODO 4：提交事务（提交成功后，调用方才能提交消息位移）
    ...
}`,
},
};
