import type {StarterMap} from './types';

// Python 训练与考试题（13 题）的作答框架。
export const pythonExamStarters:StarterMap={
'py-x1-27':{
python:String.raw`def group_by_initial(words: list[str]) -> dict[str, list[str]]:
    groups: dict[str, set[str]] = {}
    for raw in words:
        # TODO 1：去除首尾空白并转为小写，若结果为空则跳过
        ...
        # TODO 2：按首字符分组并去重记录单词
        ...
    # TODO 3：将每组单词按字典序升序排列为列表并返回结果字典
    return ...


if __name__ == "__main__":
    # TODO 4：编写包含大小写、空白和重复词的调用示例并打印结果
    ...`,
},

'py-x1-28':{
python:String.raw`def make_counter(start: int = 0, step: int = 1):
    # TODO 1：初始化外层状态变量保存当前计数值
    ...

    def tick(reset: bool = False) -> int:
        # TODO 2：声明引用外层计数变量，避免赋值时创建局部变量
        ...
        # TODO 3：按 reset 是否为 True 重置回 start 或累加 step，并返回当前值
        ...

    return tick


if __name__ == "__main__":
    # TODO 4：创建两个独立计数器，验证互不干扰及 reset=True 重置效果
    ...`,
},

'py-x2-29':{
python:String.raw`from itertools import islice


def batched_stream(iterable, batch_size: int):
    # TODO 1：校验 batch_size <= 0 时抛出 ValueError
    ...
    # TODO 2：获取统一迭代器，保证列表和生成器都能按游标惰性推进
    it = ...
    # TODO 3：循环用 islice 每次截取最多 batch_size 个元素转为非空列表并 yield
    ...


if __name__ == "__main__":
    # TODO 4：用生成器表达式测试分批效果，验证末尾不足一批时的切分结果
    ...`,
},

'py-x2-30':{
python:String.raw`from functools import wraps


def retry(max_attempts: int = 3, allowed_exc: type[Exception] = Exception):
    def decorator(func):
        # TODO 1：用 @wraps 保留原函数元信息，并定义接收 *args, **kwargs 的 wrapper
        def wrapper(*args, **kwargs):
            # TODO 2：循环最多 max_attempts 次尝试调用 func，成功立即返回
            # TODO 3：仅捕获 allowed_exc 并记录最后一次异常，次数耗尽后重新抛出
            ...

        return wrapper

    return decorator


if __name__ == "__main__":
    # TODO 4：编写前两次失败、第三次成功的测试函数，打印返回值及 __name__
    ...`,
},

'py-e1-24':{
python:String.raw`def batched_lines(lines, size):
    # TODO 1：校验 size <= 0 时主动抛出 ValueError
    ...
    batch = []
    for raw in lines:
        # TODO 2：去除当前行首尾空白，若为空行则跳过
        ...
        # TODO 3：加入当前批次；凑满 size 条时 yield 该批次并重置新列表
        ...
    # TODO 4：若循环结束时仍有剩余不足 size 条的尾批数据，将其 yield 出来
    ...


if __name__ == "__main__":
    sample = ["  alpha ", "", "beta\n", "   ", "gamma", "delta", "epsilon"]
    print(list(batched_lines(sample, 2)))`,
},

'py-e1-25':{
python:String.raw`from functools import wraps


def retry(times=3, allowed=(ValueError,)):
    # TODO 1：校验 times < 1 时抛出 ValueError
    ...

    def decorator(func):
        # TODO 2：在 wrapper 上使用 @wraps 保留原函数元信息
        def wrapper(*args, **kwargs):
            # TODO 3：循环最多尝试 times 次，仅捕获 allowed 中的异常并重试，成功即返回
            # TODO 4：重试次数耗尽后将最后一次捕获的异常重新抛出
            ...

        return wrapper

    return decorator


if __name__ == "__main__":
    attempts = 0

    @retry(times=3, allowed=(ValueError,))
    def flaky(x):
        global attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("temporary fail")
        return x * 2

    print(flaky(21), attempts)`,
},

'py-x3-18':{
python:String.raw`import asyncio


async def fake_fetch(url: str) -> str:
    delay = 0.5 if "slow" in url else 0.1
    await asyncio.sleep(delay)
    return f"200:{url}"


async def fetch_all(urls: list[str], limit: int, timeout: float) -> list[str | None]:
    # TODO 1：创建并发上限为 limit 的信号量
    sem = ...

    async def _one(url: str) -> str | None:
        # TODO 2：先获取信号量再开启单次请求超时控制，避免排队等待计入超时
        # TODO 3：调用 fake_fetch(url)，若超时则捕获超时异常并返回 None
        ...

    # TODO 4：并发调度所有请求并按 urls 原顺序返回结果列表
    return ...


async def main() -> None:
    urls = ["https://a.com", "https://slow.com", "https://b.com"]
    results = await fetch_all(urls, limit=2, timeout=0.2)
    print(results)


if __name__ == "__main__":
    asyncio.run(main())`,
},

'py-x4-18':{
python:String.raw`class PluginBase:
    _registry: dict[str, type["PluginBase"]] = {}

    def __init_subclass__(cls, name: str | None = None, **kwargs) -> None:
        # TODO 1：先转发 kwargs 调用父类的 __init_subclass__
        ...
        # TODO 2：若 name 非空，校验是否重名（重复抛 ValueError），无冲突则注册 cls 到 _registry
        ...

    @classmethod
    def create(cls, name: str, *args, **kwargs) -> "PluginBase":
        # TODO 3：在 _registry 中查找对应子类（未注册抛 KeyError），并透传参数实例化返回
        ...


# TODO 4：定义两个带 name 参数的具体插件子类，并在下方测试入口中通过 PluginBase.create 创建实例验证
...

if __name__ == "__main__":
    ...`,
},

'py-e2-24':{
python:String.raw`class BoundedInt:
    def __init__(self, min_val, max_val):
        self.min_val = min_val
        self.max_val = max_val
        self.name = ""

    def __set_name__(self, owner, name):
        # TODO 1：记录描述符绑定的属性名
        ...

    def __get__(self, instance, owner=None):
        # TODO 2：通过类访问（instance is None）时返回描述符本身；通过实例访问时从实例字典读取属性值
        ...

    def __set__(self, instance, value):
        # TODO 3：校验 value 为非 bool 的 int（否则抛 TypeError）且在 [min_val, max_val] 闭区间内（否则抛 ValueError）
        # TODO 4：将通过校验的值写入实例自身的 __dict__ 中，避免多实例共享状态
        ...


class Config:
    workers = BoundedInt(1, 32)
    port = BoundedInt(1024, 65535)

    def __init__(self, workers, port):
        self.workers = workers
        self.port = port


if __name__ == "__main__":
    cfg = Config(4, 8080)
    print(cfg.workers, cfg.port)`,
},

'py-e2-25':{
python:String.raw`import asyncio


async def fetch_one(item_id, sem):
    # TODO 1：使用信号量 sem 限制同时处于执行中的协程数量
    # TODO 2：非阻塞等待 0.05 秒模拟异步 I/O，并返回 item_id * 10
    ...


async def fetch_all_limited(ids, limit):
    # TODO 3：创建并发上限为 limit 的信号量，并发调度所有任务并按 ids 原顺序返回结果
    ...


async def main():
    res = await fetch_all_limited([1, 2, 3, 4, 5], limit=2)
    print(res)


if __name__ == "__main__":
    # TODO 4：使用 asyncio.run 启动 main 协程
    ...`,
},

'py-f-28':{
python:String.raw`import time


class TimerContext:
    def __init__(self, label):
        self.label = label
        self.start = 0.0
        self.elapsed = 0.0

    def __enter__(self):
        # TODO 1：使用高精度计时器记录起点到 self.start，并返回对象本身以支持 as 绑定
        ...

    def __exit__(self, exc_type, exc_val, exc_tb):
        # TODO 2：计算经过的时间并保存到 self.elapsed
        ...
        # TODO 3：按是否发生异常打印对应格式的耗时或失败信息
        ...
        # TODO 4：返回合适的值，确保 with 块内的异常不会被吞掉而能正常向外传播
        ...


if __name__ == "__main__":
    with TimerContext("calc") as t:
        total = sum(range(10000))
    print("recorded:", t.elapsed >= 0)`,
},

'py-f-29':{
python:String.raw`from collections import OrderedDict


class SimpleLRUCache:
    def __init__(self, capacity):
        # TODO 1：校验 capacity <= 0 时抛出 ValueError，并初始化 OrderedDict 存储容器
        ...

    def get(self, key, default=None):
        # TODO 2：未命中返回 default；命中时将该键移至最近使用位置并返回对应值
        ...

    def put(self, key, value):
        # TODO 3：写入或更新键值，并将其标记为最近使用
        # TODO 4：当存储条目数超过 capacity 时，从最久未使用的一端淘汰一条记录
        ...


if __name__ == "__main__":
    cache = SimpleLRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    print(cache.get("a"))
    cache.put("c", 3)
    print(cache.get("b"), cache.get("c"))`,
},

'py-f-30':{
python:String.raw`import asyncio


async def fetch_with_retry(coro_fn, retries=3, timeout=0.2, base_delay=0.05):
    if retries < 1:
        raise ValueError("retries must be >= 1")
    last_err = None
    for attempt in range(retries):
        # TODO 1：每次调用 coro_fn() 创建新协程，并用 wait_for 限制单次超时；成功时立即返回
        # TODO 2：捕获超时异常与 RuntimeError 记录 last_err，未到最后一次时异步指数退避等待
        ...
    # TODO 3：全部尝试均失败时重新抛出最后一次捕获的异常
    ...


async def main():
    count = 0

    async def unstable_job():
        nonlocal count
        count += 1
        if count < 3:
            await asyncio.sleep(0.5)
        return "ok-on-3"

    result = await fetch_with_retry(unstable_job, retries=3, timeout=0.1, base_delay=0.02)
    print(result, count)


if __name__ == "__main__":
    asyncio.run(main())`,
},
};
