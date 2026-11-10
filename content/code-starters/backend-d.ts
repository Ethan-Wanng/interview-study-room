import type {StarterMap} from './types';

const BT='`'; // Go 原始字符串的反引号

// 后端题 be-f-30（最大并发中间件）、be-e1-25（Redis 分布式锁）的作答框架。
export const backendStartersD:StarterMap={
'be-f-30':{
python:String.raw`from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

def add_limit(app: FastAPI, n: int) -> None:
    active = 0  # 正在处理的请求数；asyncio 是单线程的，加减不需要锁

    @app.middleware("http")
    async def limit(request: Request, call_next):
        nonlocal active
        # TODO 1：已经有 n 个请求在处理时，不排队，直接返回 503，并带上 Retry-After 头
        ...
        # TODO 2：占用一个名额，再交给后面处理
        ...
        try:
            return await call_next(request)
        finally:
            # TODO 3：不管成功还是出错，都要归还名额
            ...`,
go:String.raw`func Limit(n int, next http.Handler) http.Handler {
    // TODO 1：创建容量为 n 的带缓冲 channel 当作信号量
    sem := ...
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        select {
        // TODO 2：能放进去就占到了名额：处理完（无论成败）用 defer 归还名额，再调用 next
        case ...:
            ...
        // TODO 3：放不进去（default）：不排队，设置 Retry-After 头并返回 503
        default:
            ...
        }
    })
}`,
java:String.raw`import java.util.concurrent.Semaphore;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;

public class LimitFilter implements Filter {
    private final Semaphore sem; // 信号量：最多 n 个许可

    public LimitFilter(int n) { this.sem = new Semaphore(n); }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws java.io.IOException, ServletException {
        // TODO 1：用 tryAcquire 拿许可，拿不到立刻返回 false（不排队）；
        //         拿不到时设置 Retry-After 头，返回 503
        ...
        try {
            chain.doFilter(req, res);
        } finally {
            // TODO 2：处理完（无论成败）都归还许可
            ...
        }
    }
}`,
ts:String.raw`import type { Request, Response, NextFunction } from "express";

function limit(n: number) {
  let active = 0; // 正在处理的请求数；Node.js 是单线程的，加减不需要锁
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO 1：已经有 n 个请求在处理时，不排队，设置 Retry-After 头并返回 503
    ...
    active++;
    // TODO 2：响应结束（finish）或客户端提前断开（close）时归还名额，注意只能归还一次
    ...
    next();
  };
}`,
rust:String.raw`use std::sync::Arc;
use axum::{extract::{Request, State}, http::StatusCode, middleware::Next, response::{IntoResponse, Response}};
use tokio::sync::Semaphore;

// 用法：.layer(axum::middleware::from_fn_with_state(Arc::new(Semaphore::new(n)), limit))
async fn limit(State(sem): State<Arc<Semaphore>>, req: Request, next: Next) -> Response {
    // TODO 1：用 sem.try_acquire() 拿许可，拿不到立刻返回 Err（不排队）
    match ... {
        // TODO 2：拿到许可就处理请求；许可变量离开作用域时会自动归还
        Ok(_permit) => ...,
        // TODO 3：拿不到许可：返回 503，并带上 Retry-After 头
        Err(_) => ...,
    }
}`,
},

'be-e1-25':{
python:String.raw`import uuid
import redis

# TODO 1：写解锁用的 Lua 脚本：GET 出来的值等于 ARGV[1]（是自己的锁）才 DEL，否则返回 0
UNLOCK = """
...
"""

def lock(r: redis.Redis, key: str, ttl_ms: int) -> tuple[str, bool]:
    # TODO 2：生成一个随机 token，用来证明“这把锁是我加的”
    token = ...
    # TODO 3：用 SET 加锁：NX（不存在才设置）+ PX（过期毫秒数）
    ok = ...
    # TODO 4：返回 token 和是否加锁成功
    return ...

def unlock(r: redis.Redis, key: str, token: str) -> None:
    r.eval(UNLOCK, 1, key, token)`,
go:String.raw`// TODO 1：写解锁用的 Lua 脚本：GET 出来的值等于 ARGV[1]（是自己的锁）才 DEL，否则返回 0
var unlockScript = redis.NewScript(${BT}
...${BT})

// 返回 (token, 是否加锁成功, 错误)
func Lock(ctx context.Context, rdb *redis.Client, key string, ttl time.Duration) (string, bool, error) {
    // TODO 2：生成一个随机 token（uuid），用来证明“这把锁是我加的”
    token := ...
    // TODO 3：用 SetNX 加锁，并带上过期时间
    ...
}

func Unlock(ctx context.Context, rdb *redis.Client, key, token string) error {
    _, err := unlockScript.Run(ctx, rdb, []string{key}, token).Result()
    return err
}`,
java:String.raw`// 使用 Jedis 客户端
// TODO 1：写解锁用的 Lua 脚本：GET 出来的值等于 ARGV[1]（是自己的锁）才 DEL，否则返回 0
static final String UNLOCK = "...";

// 返回 token；加锁失败返回 null
static String lock(Jedis jedis, String key, long ttlMs) {
    // TODO 2：生成一个随机 token（UUID），用来证明“这把锁是我加的”
    String token = ...;
    // TODO 3：用 SET 加锁：nx（不存在才设置）+ px（过期毫秒数）
    String ok = ...;
    // TODO 4：返回值是 "OK" 说明加锁成功，返回 token；否则返回 null
    return ...;
}

static void unlock(Jedis jedis, String key, String token) {
    jedis.eval(UNLOCK, List.of(key), List.of(token));
}`,
ts:String.raw`import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";

// TODO 1：写解锁用的 Lua 脚本：GET 出来的值等于 ARGV[1]（是自己的锁）才 DEL，否则返回 0
const UNLOCK = "...";

async function lock(r: Redis, key: string, ttlMs: number): Promise<{ token: string; ok: boolean }> {
  // TODO 2：生成一个随机 token，用来证明“这把锁是我加的”
  const token = ...;
  // TODO 3：用 SET 加锁：PX（过期毫秒数）+ NX（不存在才设置）；成功返回 "OK"
  const res = ...;
  // TODO 4：返回 token 和是否加锁成功
  return ...;
}

async function unlock(r: Redis, key: string, token: string): Promise<void> {
  await r.eval(UNLOCK, 1, key, token);
}`,
rust:String.raw`use uuid::Uuid;

// TODO 1：写解锁用的 Lua 脚本：GET 出来的值等于 ARGV[1]（是自己的锁）才 DEL，否则返回 0
const UNLOCK: &str = r#"
..."#;

// 返回 (token, 是否加锁成功)
async fn lock(con: &mut redis::aio::MultiplexedConnection, key: &str, ttl_ms: u64) -> redis::RedisResult<(String, bool)> {
    // TODO 2：生成一个随机 token（Uuid::new_v4），用来证明“这把锁是我加的”
    let token = ...;
    // TODO 3：执行 SET key token NX PX ttl：成功返回 Some("OK")，已被占用返回 None
    let res: Option<String> = ...;
    // TODO 4：返回 token 和是否加锁成功
    ...
}

async fn unlock(con: &mut redis::aio::MultiplexedConnection, key: &str, token: &str) -> redis::RedisResult<()> {
    let _: i32 = redis::Script::new(UNLOCK).key(key).arg(token).invoke_async(con).await?;
    Ok(())
}`,
},
};
