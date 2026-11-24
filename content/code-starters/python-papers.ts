import type {StarterMap} from './types';

// Python 模拟卷代码题（6 题）的作答框架。
export const pythonPaperStarters:StarterMap={
'py-p1-c01':{
python:String.raw`from collections.abc import Iterable, Iterator
from typing import TypeVar

T = TypeVar("T")


def batched(iterable: Iterable[T], n: int) -> Iterator[list[T]]:
    # TODO 1：参数校验：n < 1 时抛出 ValueError("n must be at least 1")
    ...
    # TODO 2：惰性遍历 iterable（不能先 list(iterable) 展开），可用 iter+islice 或手动缓冲列表
    # TODO 3：每满 n 个元素 yield 当前列表并新建缓冲，确保不复用同一列表引用
    # TODO 4：结束时若仍有剩余不足 n 个元素的非空尾批，将其 yield 出来
    ...`,
},

'py-p1-c02':{
python:String.raw`from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def retry(
    max_attempts: int = 3,
    *,
    exceptions: tuple[type[Exception], ...] = (Exception,),
    on_retry: Callable[[int, Exception], None] | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    # TODO 1：在装饰器工厂层校验 max_attempts < 1，满足时立即抛出 ValueError
    ...

    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        # TODO 2：使用 @wraps 保留原函数元信息，并定义透传 *args, **kwargs 的 wrapper
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            # TODO 3：最多尝试 max_attempts 次，仅捕获 exceptions 指定异常；非目标异常直接透传
            # TODO 4：仅在仍有重试机会时调用 on_retry(attempt, exc)；最后一次失败时原样重新抛出异常
            ...

        return wrapper

    return decorator`,
},

'py-p2-c01':{
python:String.raw`from typing import Any, Callable


class ValidatedField:
    def __init__(
        self,
        expected_type: type,
        validator: Callable[[Any], bool] | None = None,
        error_msg: str = "invalid value",
    ) -> None:
        self.expected_type = expected_type
        self.validator = validator
        self.error_msg = error_msg
        self.name = ""

    def __set_name__(self, owner: type, name: str) -> None:
        # TODO 1：自动记录描述符绑定的属性名
        ...

    def __get__(self, instance: Any, owner: type | None = None) -> Any:
        # TODO 2：通过类访问时返回描述符自身；从实例字典读取属性，未赋值时抛出 AttributeError
        ...

    def __set__(self, instance: Any, value: Any) -> None:
        # TODO 3：校验 value 类型（expected_type 为 int 时需排除 bool）与 validator，分别抛出 TypeError 和 ValueError
        # TODO 4：校验通过后写入实例自身的 __dict__，避免多实例共享状态或无限递归
        ...`,
},

'py-p2-c02':{
python:String.raw`import asyncio
from collections.abc import Awaitable, Callable, Sequence
from typing import TypeVar

T = TypeVar("T")


async def run_with_concurrency(
    coro_factories: Sequence[Callable[[], Awaitable[T]]],
    limit: int,
    timeout: float,
    retries: int = 0,
) -> list[T]:
    # TODO 1：校验 limit <= 0（抛出 ValueError）及空列表边界，并初始化信号量与按索引存放的结果列表
    ...

    async def run_one(idx: int, factory: Callable[[], Awaitable[T]]) -> None:
        # TODO 2：获取信号量后最多尝试 retries + 1 次：每次调用 factory() 并施加单次 timeout 控制，成功写入对应索引位置
        # TODO 3：遇到 CancelledError 直接重抛不重试；其他异常仅在仍有重试机会时重试
        ...

    # TODO 4：并发执行所有任务并在任意任务最终失败时取消其余未完成任务、等待清理收敛，最后按原顺序返回结果
    return ...`,
},

'py-pf-c01':{
python:String.raw`from collections import OrderedDict
from functools import wraps
import time
from typing import Any, Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def ttl_lru_cache(
    maxsize: int = 128,
    ttl: float = 60.0,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    if maxsize <= 0:
        raise ValueError("maxsize must be > 0")

    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        cache: OrderedDict[tuple[Any, ...], tuple[float, R]] = OrderedDict()

        def make_key(args: tuple[Any, ...], kwargs: dict[str, Any]) -> tuple[Any, ...]:
            # TODO 1：组合位置参数与排序后的关键字参数生成唯一可哈希缓存键（注意避免与位置参数冲突）
            ...

        @wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            # TODO 2：用 time.monotonic() 检查缓存命中与过期：未过期则刷新为最近使用并返回，过期则删除旧项
            # TODO 3：未命中或已过期时调用原函数计算结果，写入缓存及过期时间，超容量时淘汰最久未使用条目
            ...

        # TODO 4：在 wrapper 上挂载可调用的 cache_clear() 方法用于清空缓存
        ...
        return wrapper

    return decorator`,
},

'py-pf-c02':{
python:String.raw`import asyncio
from collections.abc import Awaitable, Callable, Sequence
from typing import TypeVar

T = TypeVar("T")


async def gather_with_concurrency(
    limit: int,
    factories: Sequence[Callable[[], Awaitable[T]]],
    *,
    timeout: float | None = None,
) -> list[T]:
    # TODO 1：校验 limit <= 0 时抛出 ValueError；factories 为空时直接返回 []，并创建信号量与结果占位列表
    ...

    async def run_one(idx: int, factory: Callable[[], Awaitable[T]]) -> None:
        # TODO 2：先获取信号量再调用 factory() 创建并等待协程，将结果按 idx 存入结果列表以保持输入顺序
        ...

    # TODO 3：施加整体 timeout 超时控制并并发调度所有任务（如 TaskGroup 或 Task 列表）
    # TODO 4：确保任一任务失败或整体超时时取消其余未完成任务并等待收敛清理，最后返回结果列表
    return ...`,
},
};
