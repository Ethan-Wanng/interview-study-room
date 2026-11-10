import type {StarterMap} from './types';

// 后端题 be-x4-15（熔断器）的作答框架。
export const backendStartersG:StarterMap={
'be-x4-15':{
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
            # TODO 1：打开状态：不到 30 秒就快速失败（抛出 BreakerOpen）；到了 30 秒就进入半开，放这个请求试探
            # TODO 2：半开状态：已经有一个试探请求在跑，其他请求仍然拒绝
            ...
        try:
            result = fn()  # 调用本身不持有锁，避免慢调用堵住其他线程
        except Exception:
            with self.lock:
                # TODO 3：失败次数加 1；试探失败，或者连续失败达到 5 次，就打开熔断器并记下时间
                ...
            raise
        with self.lock:
            # TODO 4：成功：清零失败次数，关闭熔断器
            ...
        return result`,
go:String.raw`type Breaker struct {
    mu       sync.Mutex
    fails    int
    state    string // closed / open / half
    openedAt time.Time
}

var ErrOpen = errors.New("熔断中")

func (b *Breaker) Do(fn func() error) error {
    b.mu.Lock()
    // TODO 1：打开状态：不到 30 秒就快速失败（返回 ErrOpen，记得先解锁）；到了 30 秒就进入半开，放这个请求试探
    // TODO 2：半开状态：已经有一个试探请求在跑，其他请求仍然返回 ErrOpen
    ...
    b.mu.Unlock()

    err := fn() // 调用本身不持有锁

    b.mu.Lock()
    defer b.mu.Unlock()
    // TODO 3：失败时：失败次数加 1；试探失败，或者连续失败达到 5 次，就打开熔断器并记下时间
    ...
    // TODO 4：成功：清零失败次数，关闭熔断器
    ...
    return nil
}`,
java:String.raw`class Breaker {
    private int fails = 0;
    private String state = "closed"; // closed 关闭 / open 打开 / half 半开
    private long openedAt = 0;

    <T> T call(Callable<T> fn) throws Exception {
        synchronized (this) {
            // TODO 1：打开状态：不到 30 秒就快速失败（抛异常）；到了 30 秒就进入半开，放这个请求试探
            // TODO 2：半开状态：已经有一个试探请求在跑，其他请求仍然拒绝
            ...
        }
        try {
            T result = fn.call(); // 调用本身不持有锁
            // TODO 3：成功：清零失败次数，关闭熔断器（要加锁）
            ...
            return result;
        } catch (Exception e) {
            synchronized (this) {
                // TODO 4：失败次数加 1；试探失败，或者连续失败达到 5 次，就打开熔断器并记下时间
                ...
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
    // TODO 1：打开状态：不到 30 秒就快速失败（抛出错误）；到了 30 秒就进入半开，放这个请求试探
    // TODO 2：半开状态：已经有一个试探请求在跑，其他请求仍然拒绝
    ...
    try {
      const result = await fn();
      // TODO 3：成功：清零失败次数，关闭熔断器
      ...
      return result;
    } catch (err) {
      // TODO 4：失败次数加 1；试探失败，或者连续失败达到 5 次，就打开熔断器并记下时间
      ...
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

    // Err(None) 表示被熔断拒绝，Err(Some) 是业务本身的错误
    fn call<T, E>(&self, f: impl FnOnce() -> Result<T, E>) -> Result<T, Option<E>> {
        {
            let mut s = self.inner.lock().unwrap();
            // TODO 1：打开状态：不到 30 秒就返回 Err(None)；到了 30 秒就进入半开，放这个请求试探
            // TODO 2：半开状态：已经有一个试探请求在跑，其他请求仍然返回 Err(None)
            match s.state {
                ...
            }
        } // 这里锁自动释放，调用本身不持有锁
        let res = f();
        let mut s = self.inner.lock().unwrap();
        match res {
            // TODO 3：成功：清零失败次数，关闭熔断器，返回 Ok(v)
            Ok(v) => ...,
            // TODO 4：失败：失败次数加 1；试探失败，或者连续失败达到 5 次，就打开熔断器并记下时间；返回 Err(Some(e))
            Err(e) => ...,
        }
    }
}`,
},
};
