import type {StarterMap} from './types';

// Python 闯关题（15 道编程题）的作答框架。
export const pythonLevelStarters:StarterMap={
'py-start-14':{
python:String.raw`raw = "  ming , 19 , 86.456  "

# TODO 1：把三个字段拆开并去掉两端多余空格
parts = ...

# TODO 2：姓名首字母大写，年龄转成整数，成绩转成浮点数
name = ...
age = ...
score = ...

# TODO 3：用 f-string 计算明年年龄并格式化成绩（保留两位小数），按题目格式打印
print(...)`,
},

'py-flow-14':{
python:String.raw`nums = [12, 19, 25, 31, 40]

for n in nums:
    # TODO 1：判断 n 是否能同时被 3 和 5 整除
    if ...:
        # TODO 2：打印“找到：数字”并立即结束循环
        ...
# TODO 3：用与 for 对齐的 else 分支在未命中时打印“未找到符合条件的数”
...`,
},

'py-collections-14':{
python:String.raw`# TODO 1：从 collections 导入 Counter 和 defaultdict
...

words = ["apple", "banana", "apple", "pear", "banana", "apple", "kiwi"]

# TODO 2：用 Counter 统计词频，打印出现次数最多的前 2 个词
top2 = ...
print("Top 2:", top2)

# TODO 3：用集合推导式选出长度大于 4 的不重复单词集合并打印
long_words = ...
print("长度>4:", long_words)

# TODO 4：用 defaultdict(list) 按首字母把去重后的单词分组，转成普通 dict 打印
groups = ...
...
print("按首字母分组:", ...)`,
},

'py-functions-14':{
python:String.raw`def make_counter(start=0, *, step=1):
    count = start

    # TODO 1：定义无参内层函数，使用 nonlocal 更新 count（增加 step）并返回更新后的值
    ...

    # TODO 2：返回内层函数对象本身（不要加括号）
    return ...


c1 = make_counter()
c2 = make_counter(10, step=5)
# TODO 3：分别调用 c1 和 c2 各两次并打印结果
...`,
},

'py-oop-12':{
python:String.raw`from dataclasses import dataclass


@dataclass
class CartItem:
    # TODO 1：声明字段 name: str、price: float 与带默认值的 qty: int = 1
    ...

    def __post_init__(self) -> None:
        # TODO 2：校验 price >= 0 且 qty > 0，不满足时抛出 ValueError
        ...

    # TODO 3：用 @property 实现只读属性 subtotal，返回 price * qty
    ...`,
},

'py-errors-io-12':{
python:String.raw`from contextlib import contextmanager


@contextmanager
def temp_flag(cfg: dict, key: str):
    # TODO 1：进入前记录 key 原本是否存在并保存旧值，再把 cfg[key] 设为 True
    ...
    # TODO 2：用 try ... finally 包裹 yield，保证代码块抛异常时也能执行恢复
    # TODO 3：退出时若原本存在该键则恢复旧值，否则删除该键
    ...`,
},

'py-modules-12':{
python:String.raw`import re

# TODO 1：使用原始字符串和 re.compile 预编译正则，定义 time、method、path、status 四个命名分组
ACCESS_RE = ...


def parse_access_log(line: str) -> dict | None:
    # TODO 2：对 line 执行匹配，若未匹配到则返回 None
    ...
    # TODO 3：提取命名分组结果，并将 status 转换为 int 后返回字典
    return ...`,
},

'py-iterators-12':{
python:String.raw`from collections.abc import Iterable


def flatten(items):
    for item in items:
        # TODO 1：判断 item 是否为需要继续展开的嵌套容器（注意排除 str 和 bytes）
        if ...:
            # TODO 2：使用 yield from 递归展平子容器
            ...
        else:
            # TODO 3：直接产出叶子元素
            ...`,
},

'py-decorators-12':{
python:String.raw`import functools


def retry(times: int = 3):
    # TODO 1：编写三层嵌套结构，并用 @functools.wraps(fn) 保留被装饰函数元信息
    # TODO 2：在包装函数中最多尝试执行 times 次原函数，成功则立刻返回结果
    # TODO 3：捕获异常并记录最后一次错误，全部失败后重新抛出
    # TODO 4：返回包装函数与装饰器函数
    ...`,
},

'py-data-model-12':{
python:String.raw`class PositiveNumber:
    def __set_name__(self, owner, name):
        # TODO 1：记录描述符绑定的属性名
        ...

    def __get__(self, instance, owner=None):
        # TODO 2：通过类访问时返回描述符自身，通过实例访问时从实例读取属性值
        ...

    def __set__(self, instance, value):
        # TODO 3：校验 value 为非 bool 的 int 或 float 且严格大于 0（否则抛 TypeError / ValueError），再存入实例
        ...


class Order:
    # TODO 4：以类属性形式声明 price 和 quantity 描述符，并在 __init__ 中完成赋值
    price = ...
    quantity = ...

    def __init__(self, price, quantity):
        ...`,
},

'py-concurrency-12':{
python:String.raw`import threading
from concurrent.futures import ThreadPoolExecutor


class SafeCounter:
    def __init__(self):
        # TODO 1：初始化内部计数和 threading.Lock()
        ...

    def increment(self, n=1):
        # TODO 2：加锁保护计数自增操作
        ...

    # TODO 3：用 @property 实现只读属性 value（加锁读取）
    ...


counter = SafeCounter()
# TODO 4：用 ThreadPoolExecutor 启动 5 个并发任务各调用 counter.increment(100)，等待完成后打印 counter.value
...`,
},

'py-async-12':{
python:String.raw`import asyncio

# 假定已存在异步函数：async def fetch_one(url: str) -> str


async def fetch_all(urls: list[str], limit: int = 3) -> list[str]:
    # TODO 1：创建容量为 limit 的 asyncio.Semaphore
    sem = ...

    async def bounded_fetch(url: str) -> str:
        # TODO 2：使用信号量限流与 5 秒超时保护（asyncio.timeout）调用 fetch_one(url)，注意两者的嵌套顺序
        ...

    # TODO 3：并发执行所有 urls 抓取任务，并严格按输入顺序返回结果列表
    return ...`,
},

'py-cpython-12':{
python:String.raw`import gc
import weakref


# TODO 1：定义支持弱引用的类 Item(name)，并用 weakref.WeakValueDictionary 创建缓存容器
class Item:
    ...


_cache = ...


def get_item(name: str) -> Item:
    # TODO 2：先查缓存，命中则复用已有实例，未命中则新建 Item(name) 并缓存后返回
    ...


# TODO 3：写出演示代码，验证强引用存在时复用同一对象，删除强引用后缓存自动清空
...`,
},

'py-metaprogramming-12':{
python:String.raw`class Handler:
    handlers: dict[str, type["Handler"]] = {}

    # TODO 1：定义 __init_subclass__ 接收 channel 与关键字参数，并调用父类 __init_subclass__
    # TODO 2：校验未传 channel 或 channel 重复注册时抛出 ValueError
    # TODO 3：将当前子类按 channel 注册到 handlers 中
    ...


# TODO 4：定义两个传入不同 channel 的 Handler 子类作为注册演示
...`,
},

'py-engineering-12':{
python:String.raw`import unittest
from unittest.mock import patch


def get_discount(user_id: int) -> float:
    raise RuntimeError("不应调用真实折扣服务")


def final_price(user_id: int, price: float) -> float:
    return price * get_discount(user_id)


# TODO 1：继承 unittest.TestCase 编写测试类及 test_ 开头的测试方法
# TODO 2：用 patch 替换当前模块中的 get_discount，使其固定返回 0.8
# TODO 3：调用 final_price(42, 100) 并断言结果等于 80.0
# TODO 4：断言 get_discount 仅以参数 42 被调用了一次
...`,
},
};
