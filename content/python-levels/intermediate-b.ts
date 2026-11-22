// Python 学习空间进阶关卡（下）：第 8 关（迭代器、生成器与惰性求值）与第 9 关（装饰器、闭包进阶与类型注解）。
import type {AiLevel} from '../journey';

export const pyIterators:AiLevel={
 id:'py-iterators',
 title:'迭代器、生成器与惰性求值',
 summary:'Iterable 与 Iterator 协议、StopIteration、yield 生成器与内存优势、yield from 与 itertools 管道',
 lessons:[
  {
   title:'可迭代对象（Iterable）与迭代器（Iterator）',
   body:'在 Python 里，列表、字符串、字典、集合、文件对象，都能直接放进 for 循环里逐个取值，这背后靠的是一套统一的「迭代协议」。初学时最容易混淆两个长得很像的名词：\n一、可迭代对象（Iterable）：只要实现了 __iter__() 方法、能返回一个迭代器，它就是可迭代对象。像 list、str、dict、set、range 都是可迭代对象，特点是可以反复遍历，每次 for 循环都会拿到一个全新的迭代器；\n二、迭代器（Iterator）：同时实现了 __iter__()（通常直接返回 self）和 __next__()（返回下一个元素，没有更多元素时抛出 StopIteration 异常）。迭代器自己也属于可迭代对象，但它是“一次性消耗品”——从头走到尾耗尽之后，再次遍历什么也不会产出。\n可以这样类比：书架上的一整本书是 Iterable（随时可以重新翻开从第一页读起），夹在书里的书签是 Iterator（记着当前读到哪一页，翻到最后一页就停了）。',
   code:`from collections.abc import Iterable, Iterator

nums = [10, 20, 30]
print(isinstance(nums, Iterable), isinstance(nums, Iterator))

it = iter(nums)
print(isinstance(it, Iterable), isinstance(it, Iterator))
print(next(it), next(it))
print("列表还能重头遍历：", list(nums))
print("迭代器只剩未取部分：", list(it))
print("迭代器耗尽后为空：", list(it))`,
   explain:[
    {at:'from collections.abc import Iterable, Iterator',text:'从标准库导入两个抽象基类，用来检查对象是否满足可迭代对象或迭代器协议。'},
    {at:'nums = [10, 20, 30]',to:'print(isinstance(nums, Iterable)',text:'列表实现了 __iter__ 但没有 __next__，因此是 Iterable（True），不是 Iterator（False）。'},
    {at:'it = iter(nums)',to:'print(isinstance(it, Iterable)',text:'iter(nums) 调用 nums.__iter__() 生成列表迭代器，它同时满足 Iterable 和 Iterator（两个 True）。'},
    {at:'print(next(it), next(it))',text:'连续两次调用 next(it)，依次推进书签并取出 10 和 20。'},
    {at:'print("列表还能重头遍历："',text:'原列表 nums 丝毫不受影响，再次遍历依然是完整的 [10, 20, 30]。'},
    {at:'print("迭代器只剩未取部分："',to:'print("迭代器耗尽后为空："',text:'list(it) 把剩下的 [30] 全部消费完；再调一次 list(it) 只能得到空列表 []，因为迭代器是一次性的。'},
   ],
  },
  {
   title:'for 循环的底层原理与 StopIteration',
   body:'写惯了 C 或 Java 的同学常以为 for 循环底层是靠下标 i = 0, 1, 2... 逐个取值的，但在 Python 里并不是——集合（set）和文件流根本就没有下标，却照样能用 for 遍历。\nPython 执行 for item in data: 时，底层只做三步非常干净的事情：\n一、先调用 iter(data)（内部触发 data.__iter__()）拿到一个迭代器对象 it；\n二、不断调用 next(it)（内部触发 it.__next__()），把取出的元素赋给循环变量 item 并执行循环体；\n三、一旦收到 StopIteration 异常，for 循环就静静捕获它并正常结束，不会把异常抛给用户。\n另外，next(it, default) 支持传入第二个默认值参数：当迭代器已经耗尽时，不再抛 StopIteration，而是直接返回 default，在“找第一个符合条件的元素”时非常顺手。补充一个小知识：如果某个老式对象没写 __iter__ 但实现了 __getitem__，iter() 也会退而求其次按 0, 1, 2... 依次索引，直到遇到 IndexError 结束。',
   code:`fruits = ["apple", "banana"]
it = iter(fruits)

while True:
    try:
        item = next(it)
    except StopIteration:
        break
    print("取出：", item)

print("耗尽后给默认值：", next(it, "已取完"))`,
   explain:[
    {at:'fruits = ["apple", "banana"]',to:'it = iter(fruits)',text:'第一步：调用 iter(fruits) 拿到迭代器对象，这正是 for 循环开始前自动做的动作。'},
    {at:'while True:',to:'item = next(it)',text:'第二步：在循环里反复调用 next(it) 推进迭代器，拿到下一个水果。'},
    {at:'except StopIteration:',to:'break',text:'第三步：当所有元素都取完后，next(it) 抛出 StopIteration，捕获后立刻跳出循环。'},
    {at:'print("取出：", item)',text:'等价于普通 for 循环的循环体，依次打印 apple 和 banana。'},
    {at:'print("耗尽后给默认值："',text:'此时 it 已经空了，给 next 传第二个参数 "已取完"，就能安全拿到默认值而不抛异常。'},
   ],
  },
  {
   title:'动手试试：手写自定义迭代器与观察一次性耗尽',
   body:'亲手写一个倒计时迭代器类 Countdown，同时实现 __iter__ 和 __next__，亲眼看看两件事：第一，只要遵守迭代协议，不需要继承任何父类，就能直接交给 list() 和 for 循环消费；第二，同一个迭代器实例走完一轮后内部状态已归零，第二次遍历就是空的。',
   practice:{
    steps:[
     '确认电脑已装好 Python 3：在终端运行 python --version（Windows 也可以用 py --version），看到 3.x 版本号即可。',
     '新建文件 countdown_iter.py，把下面的代码完整复制进去并按 UTF-8 编码保存。',
     '在终端进入文件所在目录，运行 python countdown_iter.py（Windows 若遇编码问题可用 py -X utf8 countdown_iter.py），对照下方预期输出。',
     '试试把倒数第 1 行的 next(step, \'已结束\') 改成不带默认值的 next(step)，重新运行，观察 Python 抛出的 StopIteration 报错。',
    ],
    expect:'第一次遍历：[3, 2, 1]\n第二次遍历：[]\n第 1 次 next：2\n第 2 次 next：1\n耗尽后默认值：已结束',
   },
   code:`class Countdown:
    def __init__(self, start: int):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

cd = Countdown(3)
print(f"第一次遍历：{list(cd)}")
print(f"第二次遍历：{list(cd)}")

step = Countdown(2)
print(f"第 1 次 next：{next(step)}")
print(f"第 2 次 next：{next(step)}")
print(f"耗尽后默认值：{next(step, '已结束')}")`,
   explain:[
    {at:'class Countdown:',to:'self.current = start',text:'定义倒计时类，把当前剩余计数存进实例属性 self.current，记录迭代进度。'},
    {at:'def __iter__(self):',to:'return self',text:'按照迭代器协议，__iter__ 返回迭代器自身 self，这样实例就能直接放进 for 或 list() 里。'},
    {at:'def __next__(self) -> int:',to:'raise StopIteration',text:'每次取值前先检查是否归零；如果 <= 0，抛出 StopIteration 通知调用方迭代结束。'},
    {at:'value = self.current',to:'return value',text:'先暂存当前数字，再把内部计数减 1，最后返回本次产出的值。'},
    {at:'cd = Countdown(3)',to:'print(f"第二次遍历：{list(cd)}")',text:'第一次 list(cd) 会把 3、2、1 全部消费完；此时 cd.current 已经变成 0，第二次 list(cd) 立刻遇到 StopIteration，返回 []。'},
    {at:'step = Countdown(2)',to:'print(f"耗尽后默认值：',text:'新建一个独立的 Countdown(2)，手动一步步调用 next()；取完 2 和 1 后，再用带默认值的 next() 优雅兜底。'},
   ],
  },
  {
   title:'生成器函数 yield：把迭代器写得像普通函数',
   body:'上一张卡片里，仅仅为了倒数几个数，我们就要写类、写 __init__、维护 self.current、手动抛 StopIteration，实在有点啰嗦。Python 给了一个极其优雅的武器——生成器函数（Generator Function）。\n只要函数体里出现了 yield 关键字，它就不再是普通函数，而变成了一个生成器函数：\n一、调用它时（比如 g = fib(3)），函数体里的代码一行都不会立刻执行，而是马上返回一个生成器对象（天然实现了 __iter__ 和 __next__）；\n二、第一次调用 next(g) 时，函数才从第一行往下跑，遇到 yield 就把后面的值“交出去”，然后原地暂停，所有局部变量和当前执行位置都被完整冻结保存在栈帧里；\n三、下一次调用 next(g) 时，函数从上次暂停的下一行无缝恢复继续执行，直到遇到下一个 yield，或者跑到函数末尾自动抛出 StopIteration。\n这种“调用方要一个，我才算一个”的机制叫做惰性求值（Lazy Evaluation），写起来像普通函数一样直观，底层却拥有完整的迭代器能力。',
   code:`def countdown(n: int):
    print("生成器正式启动")
    while n > 0:
        yield n
        n -= 1
    print("倒计时结束")

gen = countdown(2)
print("刚创建好：", type(gen).__name__)
print("拿到第 1 个：", next(gen))
print("拿到第 2 个：", next(gen))
print("最后收尾：", next(gen, "结束"))`,
   explain:[
    {at:'def countdown(n: int):',to:'print("生成器正式启动")',text:'函数体里包含 yield，因此是生成器函数。调用 countdown(2) 时连这行 print 都不会立刻执行。'},
    {at:'while n > 0:',to:'n -= 1',text:'每次跑到 yield n 就把当前 n 交出去并暂停；直到下次 next() 才会从 n -= 1 这行继续往下跑。'},
    {at:'print("倒计时结束")',text:'循环退出后打印收尾信息，紧接着函数返回，Python 自动向外抛出 StopIteration。'},
    {at:'gen = countdown(2)',to:'print("刚创建好："',text:'此时只是拿到一个 generator 对象，函数体还没开始执行，屏幕上不会看到“生成器正式启动”。'},
    {at:'print("拿到第 1 个："',to:'print("最后收尾："',text:'前两次 next 依次唤醒生成器拿到 2 和 1；第三次 next 让它执行完最后的 print 并触发 StopIteration，被默认值 "结束" 接住。'},
   ],
  },
  {
   title:'生成器表达式与常数级 O(1) 内存优势',
   body:'学会了列表推导式 [x * x for x in range(10**7)] 之后，只要把外层的方括号 [] 换成圆括号 ()，就得到了生成器表达式（Generator Expression）：(x * x for x in range(10**7))。\n别小看这一对括号的差别，它们在内存占用上天差地别：\n一、列表推导式是急切求值（Eager）：一口气把 1000 万个平方数全算出来塞进内存，轻松吃掉几百 MB；如果后续你只取前 5 个，或者只是求和，绝大部分内存都白白浪费了；\n二、生成器表达式是惰性求值：创建时只保存计算逻辑和当前位置，无论数据规模是一百还是一亿，对象本身只占固定的几百字节——也就是常数级 O(1) 内存，每次需要时现算现给、用完即扔；\n三、当生成器表达式作为函数唯一参数时（如 sum(...)、any(...)、all(...)），还可以省略外层括号，配合 any()/all() 的短路特性，找到答案就立刻停下，后面的元素根本不用算；\n四、流式读取几 GB 的大日志文件时，直接写 for line in f:（文件对象本身就是迭代器），再叠加生成器表达式逐行清洗，哪怕电脑只有 4GB 内存也能轻松扛住。',
   code:`import sys

nums_list = [x * x for x in range(100_000)]
nums_gen = (x * x for x in range(100_000))

print("列表占用字节：", sys.getsizeof(nums_list))
print("生成器占用字节：", sys.getsizeof(nums_gen))

total = sum(x * x for x in range(1000))
has_big = any(x * x > 500 for x in range(100_000))
print("前 1000 平方和：", total, "存在大于 500：", has_big)`,
   explain:[
    {at:'import sys',text:'导入 sys 模块，用 getsizeof 查看对象本身占用的内存字节数。'},
    {at:'nums_list = [x * x for x in range(100_000)]',text:'列表推导式立刻算出 10 万个元素并存入列表，仅指针数组本身就占约 800KB（加上整数对象要几 MB）。'},
    {at:'nums_gen = (x * x for x in range(100_000))',text:'生成器表达式把 [] 换成 ()，此时一个平方数都没算，对象本身只占大约 200 字节，与 100_000 这个规模无关。'},
    {at:'print("列表占用字节："',to:'print("生成器占用字节："',text:'直观对比两者占用的字节数，差距往往达到数千倍。'},
    {at:'total = sum(x * x for x in range(1000))',text:'把生成器表达式直接传给 sum()（省掉多余括号），边算边累加，全程只占 O(1) 额外内存。'},
    {at:'has_big = any(x * x > 500 for x in range(100_000))',to:'print("前 1000 平方和："',text:'any() 支持短路：算到 x = 23（23*23 = 529 > 500）就立刻返回 True，剩下 99,976 个数根本不会计算。'},
   ],
  },
  {
   title:'动手试试：用生成器搭建惰性流式数据处理管道',
   body:'在后端日志分析、ETL 数据清洗和 AI 语料预处理中，最经典的写法就是把多个生成器首尾串联成一条“流式管道”：过滤 → 转换 → 分块。整条管道只有最末端被 for 拉取时，数据才会像水流一样逐条穿过每一级，中间不产生任何庞大的临时列表。',
   practice:{
    steps:[
     '新建文件 log_pipeline.py，把下面的代码复制进去并保存。',
     '在终端运行 python log_pipeline.py（或 py -X utf8 log_pipeline.py），观察日志如何被按批输出。',
     '试试在 filter_errors 的 yield line 前面加一行 print("过滤命中：", line)，再运行一次，亲眼观察数据是“一条条拉过去、凑够一批就吐出一批”，而不是先全部过滤完再解析。',
    ],
    expect:"第 1 批：['[pay] timeout 504', '[order] stock empty']\n第 2 批：['[auth] token expired']",
   },
   code:`raw_logs = [
    "INFO  | auth  | login ok",
    "ERROR | pay   | timeout 504",
    "WARN  | cache | miss key=u1",
    "ERROR | order | stock empty",
    "INFO  | order | created #99",
    "ERROR | auth  | token expired",
]

def filter_errors(lines):
    for line in lines:
        if line.startswith("ERROR"):
            yield line

def parse_records(lines):
    for line in lines:
        _, service, detail = [part.strip() for part in line.split("|")]
        yield f"[{service}] {detail}"

def chunked(items, size: int):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch

pipeline = chunked(parse_records(filter_errors(raw_logs)), size=2)
for idx, batch in enumerate(pipeline, start=1):
    print(f"第 {idx} 批：{batch}")`,
   explain:[
    {at:'raw_logs = [',to:'"ERROR | auth  | token expired",',text:'模拟原始服务器日志流；真实项目里把这里换成 open("app.log") 就能零改动处理几十 GB 的大文件。'},
    {at:'def filter_errors(lines):',to:'yield line',text:'第一级管道（过滤）：逐行检查，只把 ERROR 开头的日志交给下一级，其余行直接跳过。'},
    {at:'def parse_records(lines):',to:'yield f"[{service}] {detail}"',text:'第二级管道（转换）：按竖线拆出模块名和详情，去掉多余空格后拼成统一格式。'},
    {at:'def chunked(items, size: int):',to:'batch.append(item)',text:'第三级管道（分块）：维护临时列表 batch，每收到上游传来的一条记录就往里追加。'},
    {at:'if len(batch) == size:',to:'batch = []',text:'一旦攒够 size 条，立刻 yield 这一整批并重置 batch 为空列表，准备接下一批。'},
    {at:'if batch:',to:'yield batch',text:'循环结束后如果手里还剩不足一整批的尾巴（本例第 2 批只有 1 条），别忘了把它也交出去。'},
    {at:'pipeline = chunked(parse_records(filter_errors(raw_logs)), size=2)',text:'组装整条管道。注意执行完这行时一条日志都还没处理，它只是搭好了惰性流水线。'},
    {at:'for idx, batch in enumerate(pipeline, start=1):',to:'print(f"第 {idx} 批：{batch}")',text:'外层 for 开始真正拉取数据，驱动整条管道按需运转，打印出第 1 批（2 条）和第 2 批（1 条）。'},
   ],
  },
  {
   title:'yield from：优雅地委派子生成器',
   body:'当一个生成器需要把另一个可迭代对象或子生成器里的所有元素原样吐出去时，手写 for item in sub: yield item 虽然能用，但写多层递归时显得笨拙。Python 3.3 引入了 yield from 语法，专门用来“委派给子生成器”：\n一、写法简洁：yield from sub 可以替代整段 for 循环，在递归展开树形结构或扁平化任意深度的嵌套列表时格外清爽；\n二、直通双向通道：yield from 不只是省几行代码的语法糖，它会在最外层调用方和最内层子生成器之间建立一条直接通道，把外部发来的 .send() 数据、.throw() 异常原封不动透传进去；\n三、接收子生成器的返回值：生成器内部写 return result 时，这个值会藏在 StopIteration.value 里；而使用 result = yield from sub_gen() 可以直接优雅地拿到它。',
   code:`def flatten(items):
    for item in items:
        if isinstance(item, (list, tuple)):
            yield from flatten(item)
        else:
            yield item

def collect_sum(nums):
    total = 0
    for n in nums:
        total += n
        yield n
    return total

def run_task():
    result = yield from collect_sum([10, 20, 30])
    print("子生成器返回总和：", result)

print(list(flatten([1, [2, (3, 4)], 5])))
print(list(run_task()))`,
   explain:[
    {at:'def flatten(items):',to:'if isinstance(item, (list, tuple)):',text:'定义递归扁平化生成器：遍历每个元素，判断它是不是嵌套的列表或元组（注意不要把 str 也当容器拆成单字符）。'},
    {at:'yield from flatten(item)',text:'如果是嵌套容器，直接把迭代控制权委派给递归调用的子生成器，把深层元素一层层透传出来。'},
    {at:'else:',to:'yield item',text:'如果是普通叶子元素，直接 yield 产出。'},
    {at:'def collect_sum(nums):',to:'return total',text:'子生成器一边把每个数字 yield 出去，一边累加总和，最后通过 return total 返回汇总值。'},
    {at:'def run_task():',to:'print("子生成器返回总和："',text:'yield from 不仅把 10、20、30 原样吐给外层，还自动捕获子生成器结束时的 return 值赋给 result。'},
    {at:'print(list(flatten([1, [2, (3, 4)], 5])))',to:'print(list(run_task()))',text:'分别输出扁平化后的 [1, 2, 3, 4, 5]，以及先打印“子生成器返回总和： 60”再输出 [10, 20, 30]。'},
   ],
  },
  {
   title:'双向通信：.send()、.close() 与协程的雏形',
   body:'前面我们一直把生成器当成单向的“数据生产者”，用 next(g) 往外拉数据。其实 yield 还可以当表达式用，变成一条双向通道，让调用方往暂停的生成器里推数据：\n一、g.send(value)：把 value 传给当前暂停处（作为 received = yield output 这一整段表达式的求值结果），然后唤醒生成器继续往下跑到下一个 yield；\n二、必须先“预激（Priming）”：刚创建好的生成器停在函数体开头，还没走到第一个 yield，此时直接调 g.send(10) 会报 TypeError（can\'t send non-None value to a just-started generator）。必须先调一次 next(g) 或 g.send(None) 把它推到第一个 yield 处暂停；\n三、g.close()：主动关闭不再需要的生成器。Python 会在当前暂停的 yield 处抛入 GeneratorExit 异常，触发 try ... finally 块做资源清理。\n之所以专门认识这一节，是因为生成器具备“主动交出控制权 → 保留局部状态 → 稍后带值恢复”的核心能力——Python 早期的异步协程正是建立在生成器之上，第 12 关学习 async / await 与 asyncio 时，你会发现它们的思想一脉相承。',
   code:`def running_avg():
    total, count = 0.0, 0
    avg = None
    try:
        while True:
            num = yield avg
            total += num
            count += 1
            avg = total / count
    finally:
        print("生成器已清理关闭")

gen = running_avg()
next(gen)
print("推入 10 ->", gen.send(10))
print("推入 20 ->", gen.send(20))
print("推入 30 ->", gen.send(30))
gen.close()`,
   explain:[
    {at:'def running_avg():',to:'avg = None',text:'定义一个持续计算移动平均值的双向生成器，初始化总和、计数和当前均值。'},
    {at:'try:',to:'while True:',text:'用 try ... finally 包住无限循环，确保外部调用 close() 时能够执行资源收尾逻辑。'},
    {at:'num = yield avg',text:'核心语句：先向外吐出当前的 avg 并暂停；下次外部调 send(val) 时，val 就会成为这里的求值结果赋给 num。'},
    {at:'total += num',to:'avg = total / count',text:'用收到的新数字更新累加和、计数与最新平均值，下一轮循环再通过 yield avg 吐回去。'},
    {at:'finally:',to:'print("生成器已清理关闭")',text:'当外部调用 gen.close() 抛入 GeneratorExit 时，finally 块必定运行，打印清理提示。'},
    {at:'gen = running_avg()',to:'next(gen)',text:'创建生成器并调用一次 next(gen) 完成“预激”，让它停在 num = yield avg 处等待第一个输入。'},
    {at:'print("推入 10 ->"',to:'gen.close()',text:'依次推入 10、20、30，分别得到实时均值 10.0、15.0、20.0，最后调用 close() 优雅结束。'},
   ],
  },
  {
   title:'itertools：工业级迭代器工具箱',
   body:'处理流式数据、排列组合、分页批处理时，别急着自己写循环——标准库 itertools 全用 C 语言实现，速度极快，而且全都是惰性迭代器，内存占用极低。工程和面试里最高频的 5 个工具：\n一、islice(it, start, stop, step)：对任意迭代器做切片（包括无限序列 count()）。普通切片 it[:5] 对迭代器会报 TypeError，用 islice 就迎刃而解；\n二、chain(it1, it2, ...)：把多个可迭代对象无缝拼成一条流，不用像 list1 + list2 那样复制一份新列表；\n三、groupby(it, key=...)：把连续相邻且 key 相同的元素分进同一组。超级高频面试坑：groupby 只看相邻元素，不会全局扫描！如果相同 key 分散在不同位置，会被拆成好几组，所以分组前几乎都要先用同一个 key 排序（sorted）；\n四、accumulate(it)：惰性计算前缀和（也可以传 func 参数做前缀乘积、前缀最大值等）；\n五、batched(it, n)（Python 3.12 新增）：按固定大小 n 把任意数据流切成元组批次，最后一批不足 n 个也会完整保留，做批量写库或分批调用模型接口特别爽。',
   code:`from itertools import accumulate, batched, chain, count, groupby, islice

print("无限序列切片：", list(islice(count(10, 5), 4)))
print("无缝拼接：", list(chain([1, 2], (3, 4), "ab")))
print("前缀和：", list(accumulate([2, 3, 5])))
print("按 2 个分批：", list(batched("ABCDE", 2)))

raw = ["A", "A", "B", "A"]
print("未排序分组：", [(k, len(list(g))) for k, g in groupby(raw)])
print("先排序再分组：", [(k, len(list(g))) for k, g in groupby(sorted(raw))])`,
   explain:[
    {at:'from itertools import accumulate',text:'从标准库 itertools 导入六个常用的工业级惰性迭代器构造器。'},
    {at:'print("无限序列切片："',text:'count(10, 5) 生成 10, 15, 20, 25... 无限序列，islice(..., 4) 惰性截取前 4 个，得到 [10, 15, 20, 25]。'},
    {at:'print("无缝拼接："',text:'chain 把列表、元组和字符串首尾接成一条流，逐个产出 1, 2, 3, 4, \'a\', \'b\'，不创建中间合并列表。'},
    {at:'print("前缀和："',text:'accumulate 依次产出 2、2+3=5、5+5=10，得到 [2, 3, 5] 的前缀累加和 [2, 5, 10]。'},
    {at:'print("按 2 个分批："',text:'batched（Python 3.12+）把 "ABCDE" 惰性切分成 [(\'A\', \'B\'), (\'C\', \'D\'), (\'E\',)]。'},
    {at:'raw = ["A", "A", "B", "A"]',to:'print("未排序分组："',text:'未排序时，末尾的 "A" 和前面两个 "A" 被 "B" 隔开了，所以 groupby 会分成 (\'A\', 2)、(\'B\', 1)、(\'A\', 1) 三组！'},
    {at:'print("先排序再分组："',text:'先 sorted(raw) 让相同的键挨在一起，再 groupby 就能准确聚合成 (\'A\', 3) 和 (\'B\', 1) 两组。'},
   ],
  },
  {
   title:'动手试试：yield from 扁平化与 itertools 组合实战',
   body:'把这一关学到的核心招式串联起来完成一个小实战：用 yield from 递归展开多层嵌套分数列表，用 accumulate 算出累计曲线，用 sorted + groupby 统计各城市订单总额，再用 count + islice + batched 从无限编号流中按批取出工单号。（提示：batched 需要 Python 3.12 及以上版本。）',
   practice:{
    steps:[
     '确认本机 Python 版本为 3.12 及以上（运行 python --version 查看）。',
     '新建文件 itertools_lab.py，把下面的代码复制进去并按 UTF-8 保存。',
     '在终端运行 python itertools_lab.py（或 py -X utf8 itertools_lab.py），核对每一行输出。',
     '把 sorted_orders 那一行删掉，直接对 orders 调用 groupby，重新运行一次，亲眼看看“未先排序导致同一城市被拆成多行”的经典现象。',
    ],
    expect:'扁平化结果：[10, 20, 30, 40, 50, 60]\n前缀累加和：[10, 30, 60, 100, 150, 210]\n上海合计：230\n北京合计：320\n分批编号：[(1001, 1002), (1003, 1004), (1005,)]',
   },
   code:`from itertools import accumulate, batched, count, groupby, islice

def flatten(items):
    for item in items:
        if isinstance(item, (list, tuple)):
            yield from flatten(item)
        else:
            yield item

nested = [10, [20, [30, 40]], (50, 60)]
flat = list(flatten(nested))
print(f"扁平化结果：{flat}")
print(f"前缀累加和：{list(accumulate(flat))}")

orders = [
    ("北京", 120),
    ("上海", 80),
    ("北京", 200),
    ("上海", 150),
]
sorted_orders = sorted(orders, key=lambda x: x[0])
for city, group in groupby(sorted_orders, key=lambda x: x[0]):
    total = sum(amount for _, amount in group)
    print(f"{city}合计：{total}")

ids = islice(count(1001), 5)
print(f"分批编号：{list(batched(ids, 2))}")`,
   explain:[
    {at:'from itertools import accumulate',text:'导入本例用到的 5 个 itertools 工具函数。'},
    {at:'def flatten(items):',to:'yield item',text:'递归生成器：遇到列表或元组就用 yield from 委派给下一层 flatten，遇到普通数值直接产出。'},
    {at:'nested = [10, [20, [30, 40]], (50, 60)]',to:'print(f"前缀累加和：',text:'把三层嵌套结构展平为一维列表，再用 accumulate 计算出逐步累加的前缀和。'},
    {at:'orders = [',to:'("上海", 150),',text:'准备按城市分散排列的原始订单数据（北京与上海交替出现）。'},
    {at:'sorted_orders = sorted(orders, key=lambda x: x[0])',text:'调用 groupby 前先按城市名排序，把同一个城市的订单聚到相邻位置（UTF-8 编码下“上”排在“北”前面）。'},
    {at:'for city, group in groupby(sorted_orders, key=lambda x: x[0]):',to:'print(f"{city}合计：{total}")',text:'按城市分组后，用生成器表达式惰性求和并打印每个城市的合计金额。'},
    {at:'ids = islice(count(1001), 5)',to:'print(f"分批编号：',text:'count(1001) 从 1001 无限递增，islice 截取前 5 个，再由 batched 每 2 个切成一组元组，最后剩余的 1005 单独成批。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-iterators-1',
   q:'关于 Python 中的列表 nums = [1, 2, 3] 与迭代器 it = iter(nums)，下面哪项描述正确？',
   options:[
    'nums 既是可迭代对象，也是可直接调用 next 的迭代器',
    'nums 可反复遍历，而 it 在遍历耗尽后再次遍历为空',
    'it 属于可迭代对象，调用 iter(it) 会返回全新副本',
    'nums 和 it 都可以用下标索引访问，且都不会耗尽',
   ],
   why:[
    '列表没有实现 __next__ 方法，直接调用 next(nums) 会报 TypeError，它不是迭代器。',
    '',
    '迭代器的 __iter__() 返回 self 自身，不会重置也不会生成新副本。',
    '迭代器不支持下标访问（it[0] 会报 TypeError），而且是一次性消耗品。',
   ],
   answer:1,
   explain:'列表是 Iterable（可反复调用 iter() 生成新迭代器），而 iter(nums) 得到的迭代器是一次性的，耗尽后再次遍历产出为空。',
  },
  {
   id:'py-iterators-2',
   q:'定义生成器函数 def gen(): print("start"); yield 1 后，执行 g = gen() 这一行时，会发生什么？',
   code:'def gen():\n    print("start")\n    yield 1\n\ng = gen()',
   options:[
    '立刻打印 start 并直接返回整数 1 赋给变量 g',
    '立刻打印 start 后暂停在 yield 1 处等待调用',
    '不执行函数体代码，直接返回一个生成器对象 g',
    '抛出 StopIteration 异常提示未在循环中调用',
   ],
   why:[
    '生成器函数不会在调用时直接执行并返回 yield 后面的值。',
    '调用生成器函数时一行函数体都不会跑，必须等到第一次 next(g) 才会打印 start。',
    '',
    'StopIteration 只在生成器执行完毕、没有更多元素可产出时才会抛出。',
   ],
   answer:2,
   explain:'调用含 yield 的生成器函数只会创建一个处于初始暂停状态的 generator 对象，直到第一次调用 next(g) 才开始执行函数体。',
  },
  {
   id:'py-iterators-3',
   type:'multi',
   q:'以下哪些对象属于 Python 中的迭代器（Iterator，即同时实现 __iter__ 和 __next__）？（多选）',
   options:[
    '生成器表达式 (x for x in range(5)) 产出的对象',
    '内置类型 list 创建的普通列表对象 [1, 2, 3]',
    '对字符串调用 iter("python") 得到的返回对象',
    '内置函数 range(10) 返回的惰性数字区间对象',
   ],
   why:[
    '',
    'list 只是可迭代对象（Iterable），没有 __next__ 方法，不能直接传给 next()。',
    '',
    'range(10) 虽然省内存且支持惰性索引，但它是可迭代对象而非迭代器（支持多次重复遍历，不支持 next(range(10))）。',
   ],
   answers:[0,2],
   explain:'生成器对象和 iter(...) 返回的对象都实现了 __iter__ 与 __next__，属于 Iterator；list 和 range 都是可重复遍历的 Iterable，不是 Iterator。',
  },
  {
   id:'py-iterators-4',
   type:'judge',
   q:'对同一个生成器对象 g 连续执行两次 list(g)，两次都能得到完全相同的非空元素列表。',
   answer:false,
   explain:'生成器是迭代器，属于一次性消耗品。第一次 list(g) 已经把它全部消费完毕，第二次 list(g) 只会得到空列表 []。',
  },
  {
   id:'py-iterators-5',
   q:'运行下面代码，输出的结果是什么？',
   code:'from itertools import groupby\n\nres = [(k, len(list(g))) for k, g in groupby("AABBCAA")]\nprint(len(res), res[0], res[-1])',
   options:[
    "4 ('A', 2) ('A', 2)",
    "3 ('A', 4) ('C', 1)",
    "3 ('A', 2) ('C', 1)",
    "4 ('A', 4) ('A', 2)",
   ],
   why:[
    '',
    'groupby 不会全局合并相同键，只有先排序把四个 A 放相邻才会得到 3 组且首个为 (\'A\', 4)。',
    '末尾的两个 A 不会被丢弃，而是独立组成第 4 组 (\'A\', 2)。',
    '首组只包含前面连续的两个 A，计数是 2 而不是把末尾两个 A 一并算进去的 4。',
   ],
   answer:0,
   explain:'itertools.groupby 只把连续相邻且键相同的元素聚到一组，因此 "AABBCAA" 被分成 AA、BB、C、AA 共 4 组，首尾分组都是 (\'A\', 2)；需要全局分组前应先排序。',
  },
  {
   id:'py-iterators-6',
   type:'fill',
   q:'当自定义迭代器没有更多元素可返回时，__next__ 方法应当抛出内置异常＿来通知 for 循环正常结束。',
   accepted:['StopIteration'],
   explain:'for 循环底层反复调用 next(it)，捕获到 StopIteration 后便静默退出循环。',
  },
  {
   id:'py-iterators-7',
   q:'新建一个双向生成器 g = running_avg() 后，还没调用过 next(g) 就直接执行 g.send(10)，Python 报错的原因是？',
   options:[
    'send 方法的参数不支持整型，需要传入字符串对象',
    '生成器尚未绑定任何迭代目标，无法分配内部缓冲区',
    'send 需要在 for 循环体内调用，不能在顶层单独调用',
    '生成器停在函数开头尚未运行到首个 yield，需先预激',
   ],
   why:[
    'send 可以传入任意 Python 对象（整数、字典、实例均可），不限制类型。',
    '生成器通过栈帧保存状态，不存在“绑定迭代目标”的要求。',
    'send 完全可以在顶层代码中直接调用，只是首次调用前需要先启动生成器。',
    '',
   ],
   answer:3,
   explain:'刚创建的生成器停在函数体第一行之前，还没走到第一个 yield 表达式接收值，因此必须先调用 next(g) 或 g.send(None) 完成预激。',
  },
  {
   id:'py-iterators-8',
   type:'multi',
   q:'在生成器函数中使用 yield from sub_gen() 委派子生成器时，具备以下哪些特性？（多选）',
   options:[
    '自动迭代并逐个产出子生成器里的全部元素，写法简洁',
    '把外部调用方发来的 send 数据与 throw 异常透传给子生成器',
    '把子生成器产出的结果先缓存在列表中再一次性对外返回',
    '可以直接通过赋值语句接收子生成器 return 返回的最终值',
   ],
   why:[
    '',
    '',
    'yield from 保持惰性流式产出，不会预先把子生成器的元素缓存成列表。',
    '',
   ],
   answers:[0,1,3],
   explain:'yield from 在调用方和子生成器之间建立了惰性双向通道：逐个产出元素、透传 send/throw/close，并能用 res = yield from sub_gen() 接住子生成器的 return 值。',
  },
  {
   id:'py-iterators-9',
   type:'judge',
   q:'执行 for x in obj: 时，Python 底层会先调用 iter(obj) 获取迭代器，再循环调用 next() 直到捕获 StopIteration 为止。',
   answer:true,
   explain:'这正是 Python 迭代协议的核心执行流程，所有实现了 __iter__ 或迭代协议的对象都因此无缝支持 for 循环。',
  },
  {
   id:'py-iterators-10',
   q:'要从无限递增迭代器 itertools.count(1) 中安全取出前 5 个数字组成列表，哪种写法正确？',
   options:[
    'list(itertools.count(1))[:5]',
    'list(itertools.count(1)[:5])',
    'list(itertools.islice(itertools.count(1), 5))',
    'list(itertools.chain(itertools.count(1), 5))',
   ],
   why:[
    'list(count(1)) 会试图把无限序列全部装进列表，导致内存耗尽或死循环卡死。',
    'count(1) 是迭代器，不支持下标切片 [:5]，会直接抛出 TypeError。',
    '',
    'chain 用于拼接多个可迭代对象，传整数 5 也会报错，且无法截断无限序列。',
   ],
   answer:2,
   explain:'itertools.islice 可以对任意迭代器（包括无限迭代器）做惰性切片，取满 5 个元素即停，不会卡死也不会报 TypeError。',
  },
  {
   id:'py-iterators-11',
   type:'short',
   q:'处理一个 10GB 的服务器日志文件时，为什么通常优先用生成器表达式 (parse(line) for line in f) 而不是列表推导式 [parse(line) for line in f]？什么场景下反而应该转成列表？',
   reference:'生成器表达式采用惰性求值，只在迭代到当前行时才解析该行并交给下游消费，内存中只需保留当前处理的一条记录，额外内存占用为常数级 O(1)，不会把 10GB 数据一次性读爆内存；配合 any/islice 还能提前短路终止。但如果数据量很小，且后续需要反复多次遍历、按随机下标访问、求长度 len() 或做排序 sort()，则应转成列表，因为生成器是一次性消耗品且不支持索引和 len()。',
   points:[
    '说明生成器表达式是惰性求值、逐行按需计算，内存占用为 O(1)，避免 OOM 爆内存',
    '说明列表推导式会急切求值，把全部解析结果一次性加载到内存',
    '提及生成器在短路查找或仅取前 N 条时可避免多余计算',
    '指出需要列表的场景：数据量可控且需多次遍历、下标随机访问、len() 或排序等',
   ],
   explain:'惰性流式管道是 Python 处理大文件的标准做法；选生成器还是列表，本质是在“省内存、单次流式”和“可重复读、支持随机访问”之间权衡。',
  },
  {
   id:'py-iterators-12',
   type:'code',
   q:'请用 yield from 编写一个生成器函数 flatten(items)，把任意深度嵌套的列表或元组展平为单层元素流；注意不要把字符串（str）或字节串（bytes）拆分成单个字符。例如 list(flatten([1, ["hi", (2, [3])]])) 应返回 [1, "hi", 2, 3]。',
   reference:'from collections.abc import Iterable\n\ndef flatten(items):\n    for item in items:\n        if isinstance(item, Iterable) and not isinstance(item, (str, bytes)):\n            yield from flatten(item)\n        else:\n            yield item',
   points:[
    '定义为生成器函数，使用 yield 产出叶子元素',
    '递归展开嵌套容器时正确使用 yield from flatten(item)',
    '准确识别嵌套容器（list/tuple 或 Iterable）并显式排除 str 和 bytes 避免被拆成单字符',
    '边界情况处理正确（多层嵌套与空容器均能正常运行）',
   ],
   explain:'判断容器时既可以写 isinstance(item, (list, tuple))，也可以写更通用的 isinstance(item, Iterable) and not isinstance(item, (str, bytes))；排除 str/bytes 是这道面试题最常见的防死循环细节（单字符依然是 str）。',
  },
 ],
};

export const pyDecorators:AiLevel={
 id:'py-decorators',
 title:'装饰器、闭包进阶与类型注解',
 summary:'闭包晚绑定陷阱、@decorator 语法与 functools.wraps、带参装饰器、lru_cache 与现代 Type Hints',
 lessons:[
  {
   title:'闭包进阶：自由变量与 __closure__ 中的 cell 对象',
   body:'之前我们已经见过闭包（Closure）：内层函数引用了外层函数的局部变量，即便外层函数已经执行结束并返回了，内层函数以后被调用时依然能读到那个变量。\nPython 是怎么让“已经退出的外层函数里的变量”继续活着的？\n一、自由变量（Free Variable）：在内层函数里被使用、但既不是自己定义的局部变量也不是全局变量的名字；\n二、cell 对象：Python 编译外层函数时，一旦发现某个局部变量被内层函数捕获，就不会把它随普通栈帧一起销毁，而是装进一个叫 cell 的小盒子里，再把引用挂到内层函数的 __closure__ 属性上；\n三、修改外部状态要用 nonlocal：如果内层函数只是“读取”外层变量，直接用就行；但如果想在里面给它重新赋值（如 count += 1），必须先声明 nonlocal count，否则 Python 会把它当成新的局部变量，并在赋值前读取时抛出 UnboundLocalError。',
   code:`def make_counter(start: int = 0):
    count = start

    def inc() -> int:
        nonlocal count
        count += 1
        return count

    return inc

counter = make_counter(10)
print(counter(), counter())
print("自由变量名：", counter.__code__.co_freevars)
print("cell 里的当前值：", counter.__closure__[0].cell_contents)`,
   explain:[
    {at:'def make_counter(start: int = 0):',to:'count = start',text:'外层函数定义局部变量 count；因为它被内层 inc 引用，Python 会把它装进 cell 对象里持久化。'},
    {at:'def inc() -> int:',to:'nonlocal count',text:'内层函数要修改外层的 count，必须用 nonlocal 声明，告诉解释器去改外层闭包变量而不是新建同名局部变量。'},
    {at:'count += 1',to:'return count',text:'每次调用 inc() 都会把 cell 里的数值加 1 并返回。'},
    {at:'return inc',text:'返回内层函数对象本身（注意没有加括号），此时 make_counter 的调用帧已经结束。'},
    {at:'counter = make_counter(10)',to:'print(counter(), counter())',text:'两次调用分别返回 11 和 12，说明 count 在两次调用之间持续保留并递增。'},
    {at:'print("自由变量名："',to:'print("cell 里的当前值："',text:'亲眼查看闭包内部结构：co_freevars 显示 (\'count\',)，__closure__[0].cell_contents 里存着最新值 12。'},
   ],
  },
  {
   title:'经典面试坑：循环里创建闭包的“晚绑定”（Late Binding）',
   body:'这是 Python 面试出场率最高的一道陷阱题。假设你在循环里批量生成 3 个无参函数：[lambda: i for i in range(3)]，然后依次调用它们。直觉上以为会得到 [0, 1, 2]，可实际上打印出来竟然是 [2, 2, 2]！\n原因叫做「晚绑定（Late Binding）」：\n一、闭包捕获的是“变量 i 本身”（3 个 lambda 共享同一个指向 i 的 cell），而不是创建 lambda 那一刻 i 的数值；\n二、循环跑完之后，变量 i 最终停留在 2。等到后面真正调用这些函数时，它们才去读 i，于是全读到了最后的 2。\n两种干净的修法：\n一、默认参数绑定：写成 lambda i=i: i。因为 Python 函数的默认参数是在函数“定义那一刻”求值的，相当于每轮循环给当前的 i 拍一张快照固定进默认参数；\n二、使用 functools.partial：显式把当前循环值冻结成偏函数的参数，读起来比默认参数黑魔法更直白，大项目里更推荐。',
   code:`from functools import partial

buggy = [lambda: i for i in range(3)]
print("晚绑定结果：", [f() for f in buggy])

fix_default = [lambda i=i: i for i in range(3)]
print("默认参数修复：", [f() for f in fix_default])

def identity(x: int) -> int:
    return x

fix_partial = [partial(identity, i) for i in range(3)]
print("partial 修复：", [f() for f in fix_partial])`,
   explain:[
    {at:'from functools import partial',text:'导入标准库里的偏函数工具 partial，用来预先固定函数的部分参数。'},
    {at:'buggy = [lambda: i for i in range(3)]',to:'print("晚绑定结果："',text:'3 个 lambda 共享同一个外层变量 i，循环结束后 i 变成 2，调用时全部返回 [2, 2, 2]。'},
    {at:'fix_default = [lambda i=i: i for i in range(3)]',to:'print("默认参数修复："',text:'默认参数 i=i 在每轮定义 lambda 时立刻求值绑定，分别固定下 0、1、2，调用返回 [0, 1, 2]。'},
    {at:'def identity(x: int) -> int:',to:'return x',text:'准备一个普通的具名函数，配合 partial 冻结参数。'},
    {at:'fix_partial = [partial(identity, i) for i in range(3)]',to:'print("partial 修复："',text:'每轮把当前的 i 立即绑定进新的偏函数对象中，语义清晰，调用同样返回 [0, 1, 2]。'},
   ],
  },
  {
   title:'动手试试：复现并修复闭包晚绑定陷阱',
   body:'自己动手跑一遍晚绑定陷阱和两种修复方式，顺便把前面学过的 __closure__ 和 cell_contents 也一起验证一遍，把闭包的底层机制彻底刻进脑子里。',
   practice:{
    steps:[
     '新建文件 closure_lab.py，把下面的代码完整复制进去并按 UTF-8 保存。',
     '在终端运行 python closure_lab.py（或 py -X utf8 closure_lab.py），对比三种写法的输出结果。',
     '试试在 make_counter 里把 nonlocal count 那一行注释掉再运行，看看 Python 报出的 UnboundLocalError 长什么样，再取消注释恢复。',
    ],
    expect:'晚绑定踩坑：[20, 20, 20]\n默认参数修复：[0, 10, 20]\npartial 修复：[0, 10, 20]\n计数结果：11, 12\n自由变量值：12',
   },
   code:`from functools import partial

bad_funcs = [lambda: i * 10 for i in range(3)]
print(f"晚绑定踩坑：{[fn() for fn in bad_funcs]}")

fixed_default = [lambda i=i: i * 10 for i in range(3)]
print(f"默认参数修复：{[fn() for fn in fixed_default]}")

def multiply(factor: int, base: int) -> int:
    return factor * base

fixed_partial = [partial(multiply, i, 10) for i in range(3)]
print(f"partial 修复：{[fn() for fn in fixed_partial]}")

def make_counter(start: int = 0):
    count = start
    def inc() -> int:
        nonlocal count
        count += 1
        return count
    return inc

counter = make_counter(10)
print(f"计数结果：{counter()}, {counter()}")
print(f"自由变量值：{counter.__closure__[0].cell_contents}")`,
   explain:[
    {at:'from functools import partial',text:'导入 partial，用于构造固定了参数的偏函数。'},
    {at:'bad_funcs = [lambda: i * 10 for i in range(3)]',to:'print(f"晚绑定踩坑：',text:'复现晚绑定：三个 lambda 调用时才去读循环结束后的 i = 2，全部算出 20。'},
    {at:'fixed_default = [lambda i=i: i * 10 for i in range(3)]',to:'print(f"默认参数修复：',text:'用默认参数 i=i 在定义瞬间定格每一轮的 i，输出预期的 [0, 10, 20]。'},
    {at:'def multiply(factor: int, base: int) -> int:',to:'print(f"partial 修复：',text:'用 partial 把每轮的 i 和 10 绑定到 multiply 上，同样得到 [0, 10, 20]。'},
    {at:'def make_counter(start: int = 0):',to:'return inc',text:'创建一个带状态的闭包计数器，靠 nonlocal count 修改外层 cell 中的值。'},
    {at:'counter = make_counter(10)',to:'print(f"自由变量值：',text:'连续调用两次得到 11 和 12，并直接打印 __closure__[0].cell_contents 验证其值为 12。'},
   ],
  },
  {
   title:'装饰器（Decorator）本质：@dec 就是语法糖',
   body:'看到函数头顶上的 @app.get("/users")、@login_required、@lru_cache 时，新手常觉得很神秘。其实装饰器的本质简单到只有一句话：在 Python 里函数是一等公民（可以当参数传、也可以当返回值返回），@dec 写在 def f(): 上面，和定义完之后手动写一行 f = dec(f) 完全等价！\n记住两个关键点：\n一、装饰动作发生在「函数定义时」（模块导入那一步），而不是等到后面调用 f() 时才包装；\n二、装饰器最擅长的事情是「无侵入式叠加横切逻辑」：不改原业务函数的一行代码，就能统一加上日志打印、耗时统计、权限校验、异常重试或结果缓存。为了兼容任意参数签名的原函数，内层 wrapper 通常写成 def wrapper(*args, **kwargs)。',
   code:`def log_call(fn):
    def wrapper(*args, **kwargs):
        print(f"准备调用 {fn.__name__}，参数：{args} {kwargs}")
        result = fn(*args, **kwargs)
        print(f"调用完成，返回值：{result}")
        return result
    return wrapper

@log_call
def add(a: int, b: int) -> int:
    return a + b

print("结果：", add(3, 5))`,
   explain:[
    {at:'def log_call(fn):',text:'装饰器本身就是一个普通函数，接收被装饰的原函数 fn 作为参数。'},
    {at:'def wrapper(*args, **kwargs):',text:'内层包装函数用 *args 和 **kwargs 接住任意位置参数和关键字参数，确保能装饰各种签名的函数。'},
    {at:'print(f"准备调用',to:'result = fn(*args, **kwargs)',text:'在调用原函数之前插入前置日志，然后把收到的参数原封不动转发给原函数 fn 并接住返回值。'},
    {at:'print(f"调用完成',to:'return result',text:'打印后置日志，并务必把原函数的返回值 return 出去，否则调用方拿到的是 None。'},
    {at:'return wrapper',text:'返回包装后的新函数 wrapper，替代原来的函数名绑定。'},
    {at:'@log_call',to:'return a + b',text:'语法糖等价于先定义 add，再执行 add = log_call(add)。注意这一步还没加上 @wraps，下一张卡片马上补全！'},
    {at:'print("结果：", add(3, 5))',text:'此时调用 add(3, 5) 实际执行的是 wrapper(3, 5)，会自动打出前后日志并返回 8。'},
   ],
  },
  {
   title:'为什么必须写 @functools.wraps(fn)',
   body:'上一张卡片里我们手写了 log_call，它虽然能跑，但埋了一个真实项目里极其坑人的隐患：因为 add 已经被替换成了内层函数 wrapper，原函数的“身份证”全丢了！\n一、不加 @wraps(fn) 的后果：add.__name__ 会变成 \'wrapper\'，add.__doc__ 会变成 None，inspect.signature(add) 也变成 (*args, **kwargs)。后果很惨烈——日志和监控里满屏都是 wrapper、自动 API 文档消失、Flask 多个路由直接报端点重名错误、测试框架和调试器也找不到原签名；\n二、加上 @functools.wraps(fn)：wraps 本身也是一个装饰器，它会自动把原函数的 __name__、__doc__、__annotations__、__module__ 等元信息完整复制给 wrapper，还会顺手挂上 wrapper.__wrapped__ = fn，让 inspect.signature 和调试工具能一键穿透拿到原始函数。\n养成肌肉记忆：只要手写函数装饰器，闭眼给内层 wrapper 加上 @functools.wraps(fn) 就对了。',
   code:`from functools import wraps

def bad_dec(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

def good_dec(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

@bad_dec
def calc_a(x: int) -> int:
    """计算 A"""
    return x * 2

@good_dec
def calc_b(x: int) -> int:
    """计算 B"""
    return x * 2

print("没加 wraps：", calc_a.__name__, calc_a.__doc__)
print("加了 wraps：", calc_b.__name__, calc_b.__doc__, hasattr(calc_b, "__wrapped__"))`,
   explain:[
    {at:'from functools import wraps',text:'从标准库 functools 导入 wraps 辅助装饰器。'},
    {at:'def bad_dec(fn):',to:'return wrapper',text:'反面教材：直接返回裸的 wrapper，会覆盖掉被装饰函数的所有元信息。'},
    {at:'def good_dec(fn):',to:'@wraps(fn)',text:'正确姿势：在内层 wrapper 头上加 @wraps(fn)，自动拷贝原函数元信息并记录 __wrapped__。'},
    {at:'def wrapper(*args, **kwargs):',to:'return wrapper',text:'wrapper 内部正常透传调用并返回结果，最后由 good_dec 返回 wrapper。'},
    {at:'@bad_dec',to:'return x * 2',text:'用反面教材装饰 calc_a，它的名字和文档字符串都会丢失。'},
    {at:'@good_dec',to:'return x * 2',text:'用正确装饰器装饰 calc_b，保留完整的名字、文档和类型注解。'},
    {at:'print("没加 wraps："',to:'print("加了 wraps："',text:'第一行输出 wrapper 和 None；第二行准确输出 calc_b、计算 B 以及 True（存在 __wrapped__）。'},
   ],
  },
  {
   title:'带参装饰器、类装饰器与多层叠加顺序',
   body:'掌握基础装饰器之后，真实工程和面试里还会遇到三种高频进阶形态：\n一、带参数的装饰器（三层嵌套）：比如 @repeat(times=3)。因为 Python 会先调用 repeat(times=3)，期望它返回一个真正的装饰器 decorator(fn)，再由 decorator 去包装原函数并返回 wrapper。记住口诀：「外层收配置，中层收函数，内层收调用参数」；\n二、类装饰器（实现 __call__）：当装饰器需要维护复杂状态（比如统计调用次数、滑动窗口限流）时，用类比用一堆 nonlocal 变量更清晰：__init__(self, fn) 保存原函数并调用 update_wrapper(self, fn)，__call__(self, *args, **kwargs) 让类的实例可以像函数一样直接被调用；\n三、多个装饰器叠加时的顺序（面试必考）：\n@dec_a\n@dec_b\ndef f(): ...\n等价于 f = dec_a(dec_b(f))。所以：\n• 定义（包装）时自下而上：先由离 f 最近的 dec_b 包装，再交给上面的 dec_a；\n• 调用执行时自上而下进入：先进入 dec_a 前置逻辑 → dec_b 前置逻辑 → 原函数 f → dec_b 后置逻辑 → dec_a 后置逻辑（像剥洋葱一样先进后出）。',
   code:`from functools import update_wrapper, wraps

def repeat(times: int):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            return [fn(*args, **kwargs) for _ in range(times)]
        return wrapper
    return decorator

class CallCounter:
    def __init__(self, fn):
        self.fn = fn
        self.count = 0
        update_wrapper(self, fn)

    def __call__(self, *args, **kwargs):
        self.count += 1
        return self.fn(*args, **kwargs)

@CallCounter
@repeat(times=2)
def ping(host: str) -> str:
    return f"ok:{host}"

print(ping("db"), "累计调用：", ping.count)`,
   explain:[
    {at:'from functools import update_wrapper, wraps',text:'wraps 给函数装饰器用，update_wrapper 给类装饰器实例用，两者功能等价。'},
    {at:'def repeat(times: int):',to:'return decorator',text:'三层嵌套的带参装饰器：外层 repeat 接收配置 times，中层 decorator 接收原函数 fn，内层 wrapper 执行重复调用并返回列表。'},
    {at:'class CallCounter:',to:'update_wrapper(self, fn)',text:'类装饰器在 __init__ 中接住被装饰函数、初始化计数器 self.count，并用 update_wrapper 同步元信息。'},
    {at:'def __call__(self, *args, **kwargs):',to:'return self.fn(*args, **kwargs)',text:'实现 __call__ 后，CallCounter 实例就变成了可调用对象，每次调用自动把 count 加 1 再转发给原函数。'},
    {at:'@CallCounter',to:'return f"ok:{host}"',text:'等价于 ping = CallCounter(repeat(times=2)(ping))：定义时先由下层的 repeat(2) 包装，再交给上层的 CallCounter；调用时先走 CallCounter 计数 +1，再进入 repeat 连续执行 2 次。'},
    {at:'print(ping("db"), "累计调用："',text:'输出 [\'ok:db\', \'ok:db\'] 以及 累计调用： 1（因为 CallCounter 在外层，单次外部调用计作 1 次）。'},
   ],
  },
  {
   title:'动手试试：带参重试装饰器与 functools.lru_cache 记忆化',
   body:'把两个在生产环境里天天用得上的装饰器亲手跑一遍：一个是手写三层带参 @retry(max_attempts=3) 重试装饰器（应对网络抖动），另一个是标准库内置神器 @functools.lru_cache(maxsize=128)——给递归纯函数加上记忆化缓存后，计算速度能从指数级直接降到线性 O(n)。顺便记住 lru_cache 的一个关键约束：被缓存函数的参数必须可哈希（hashable），不能直接传 list 或 dict。',
   practice:{
    steps:[
     '新建文件 decorator_lab.py，把下面的代码完整复制进去并按 UTF-8 保存。',
     '在终端运行 python decorator_lab.py（或 py -X utf8 decorator_lab.py），核对重试日志、保留下来的函数名与缓存命中统计。',
     '试试把 @lru_cache(maxsize=128) 注释掉，再把 fib(10) 改成 fib(35) 跑一次，对比加和不加缓存的速度差异（记得测完改回来）。',
    ],
    expect:'第 1 次失败：网络抖动\n第 2 次失败：网络抖动\n返回结果：BOOK-01: ¥99\n保留原名：fetch_price\nfib(10) = 55\n缓存统计：命中 8 次，未命中 11 次',
   },
   code:`from functools import lru_cache, wraps

def retry(max_attempts: int = 3):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            last_err = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except RuntimeError as err:
                    last_err = err
                    print(f"第 {attempt} 次失败：{err}")
            raise last_err
        return wrapper
    return decorator

calls = 0

@retry(max_attempts=3)
def fetch_price(sku: str) -> str:
    global calls
    calls += 1
    if calls < 3:
        raise RuntimeError("网络抖动")
    return f"{sku}: ¥99"

print(f"返回结果：{fetch_price('BOOK-01')}")
print(f"保留原名：{fetch_price.__name__}")

@lru_cache(maxsize=128)
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(f"fib(10) = {fib(10)}")
info = fib.cache_info()
print(f"缓存统计：命中 {info.hits} 次，未命中 {info.misses} 次")`,
   explain:[
    {at:'from functools import lru_cache, wraps',text:'导入标准库的记忆化缓存装饰器 lru_cache 和元信息保留工具 wraps。'},
    {at:'def retry(max_attempts: int = 3):',to:'def wrapper(*args, **kwargs):',text:'三层带参装饰器：外层收最大重试次数，中层收原函数，内层用 @wraps(fn) 保留原函数名并接管调用。'},
    {at:'last_err = None',to:'return fn(*args, **kwargs)',text:'循环尝试调用原函数，只要某一次成功就立刻把结果返回给调用方。'},
    {at:'except RuntimeError as err:',to:'raise last_err',text:'捕获可重试的运行时错误并记录日志；如果全部次数用完仍失败，把最后一次异常重新抛出。'},
    {at:'return wrapper',to:'return decorator',text:'逐层返回包装后的函数和装饰器本身。'},
    {at:'calls = 0',to:'return f"{sku}: ¥99"',text:'用全局计数模拟不稳定接口：前两次故意抛 RuntimeError，第 3 次成功返回价格。'},
    {at:'print(f"返回结果：',to:'print(f"保留原名：',text:'触发重试直到第 3 次成功拿到结果，并验证 fetch_price.__name__ 依然是 fetch_price。'},
    {at:'@lru_cache(maxsize=128)',to:'return fib(n - 1) + fib(n - 2)',text:'给斐波那契递归函数加上 LRU 缓存，相同参数 n 只算一次，后续直接查表返回。'},
    {at:'print(f"fib(10) =',to:'print(f"缓存统计：',text:'计算 fib(10) = 55，通过 cache_info() 可以看到 0~10 这 11 个值各算了一次（未命中 11），其余 8 次重复子问题全部直接命中缓存。'},
   ],
  },
  {
   title:'类型注解（Type Hints）基础与现代写法',
   body:'Python 是动态类型语言，写小脚本时不用声明类型很痛快；可一旦代码超过几千行、几个人协作，满眼都是 def handle(data, cfg):，谁也不知道 data 里有哪些字段、返回值会不会是 None。\n类型注解（Type Hints）专门解决这个痛点：\n一、运行时不强制检查：你在参数上写了 age: int，运行期硬传 "18"，CPython 解释器并不会自动报错——注解只是安静地存进函数的 __annotations__ 字典里。它真正服务于三类角色：IDE（自动补全和跳转）、队友（一眼看懂接口契约）、静态类型检查器（mypy / pyright 在上线前把低级类型 bug 全揪出来），以及 FastAPI / Pydantic 这类在运行时主动读取注解做数据校验的现代框架；\n二、Python 3.9+ / 3.10+ 现代简洁写法：老代码里常见的 typing.List、typing.Dict、typing.Union 已经退出历史舞台，如今直接用内置容器和竖线 | 即可：\n• list[str]、dict[str, int]、tuple[int, str]、set[str]\n• int | str（联合类型：可以是整数或字符串）\n• Callable[[int, int], str]（从 collections.abc 导入，表示接收两个 int、返回 str 的函数）。',
   code:`from collections.abc import Callable

def format_id(raw: int | str) -> str:
    return f"ID-{raw}"

def apply_all(names: list[str], fn: Callable[[str], str]) -> dict[str, str]:
    return {name: fn(name) for name in names}

print(format_id(42), format_id("vip"))
print(apply_all(["alice", "bob"], str.upper))
print("运行时注解字典：", format_id.__annotations__)`,
   explain:[
    {at:'from collections.abc import Callable',text:'Python 3.9+ 推荐直接从 collections.abc 导入 Callable 来标注函数/可调用对象类型。'},
    {at:'def format_id(raw: int | str) -> str:',to:'return f"ID-{raw}"',text:'使用 Python 3.10+ 的 | 联合类型语法，声明 raw 既可以传 int 也可以传 str，返回值标注为 str。'},
    {at:'def apply_all(names: list[str], fn: Callable[[str], str]) -> dict[str, str]:',to:'return {name: fn(name) for name in names}',text:'直接用内置的 list[str] 和 dict[str, str]；Callable[[str], str] 表示“接收一个 str、返回一个 str 的函数”。'},
    {at:'print(format_id(42), format_id("vip"))',to:'print(apply_all(',text:'正常调用两个带类型注解的函数，str.upper 正好符合 Callable[[str], str] 的契约。'},
    {at:'print("运行时注解字典："',text:'打印 __annotations__，可以看到 Python 把注解保存为运行时元数据字典，但不会在调用时自动拦错。'},
   ],
  },
  {
   title:'进阶类型工具：T | None、Literal、TypedDict、Protocol 与泛型',
   body:'光会标 int 和 list[str] 还不够，现代 Python 工程（尤其是 FastAPI、AI Agent SDK 和大型后端）里下面 5 个工具几乎天天见：\n一、T | None（旧写法 Optional[T]）：明确标明值可能是 None，提醒调用方和静态检查器先写 if x is not None 再访问属性，彻底消灭线上 AttributeError: \'NoneType\'；\n二、Literal["GET", "POST"]：把取值收窄到几个固定的字面量，拼错成 "GTE" 时 mypy / pyright 立刻红线告警；\n三、TypedDict：给“键名固定、不同键对应不同值类型”的字典加上精确结构描述，非常契合 JSON 报文；\n四、Protocol（静态鸭子类型！）：不用写 class Foo(Base) 显式继承，只要一个类实现了协议约定的方法签名，静态检查器就认可它满足该协议——既保留 Python 鸭子类型的解耦灵活，又拿到类似 Go 接口的静态类型安全；\n五、泛型（Generics）：表达“输入元素是什么类型，返回值就是什么类型”。Python 3.12+ 带来了超级清爽的新语法 def first[T](xs: list[T]) -> T:，省去了老版本先写 T = TypeVar("T") 的样板代码（读老代码时认识 TypeVar 即可）。',
   code:`from typing import Literal, Protocol, TypedDict

class UserCard(TypedDict):
    name: str
    role: Literal["admin", "member"]

class Saver(Protocol):
    def save(self, text: str) -> None: ...

class MemorySaver:
    def save(self, text: str) -> None:
        print("已保存：", text)

def first[T](items: list[T]) -> T | None:
    return items[0] if items else None

def persist(card: UserCard, saver: Saver) -> None:
    saver.save(f"{card['name']}({card['role']})")

top = first([{"name": "林林", "role": "admin"}])
if top is not None:
    persist(top, MemorySaver())`,
   explain:[
    {at:'from typing import Literal, Protocol, TypedDict',text:'从 typing 模块导入字面量限制、结构化协议和类型化字典工具。'},
    {at:'class UserCard(TypedDict):',to:'role: Literal["admin", "member"]',text:'定义字典结构：必须有 str 类型的 name，且 role 只能取 "admin" 或 "member" 这两个字面量之一。'},
    {at:'class Saver(Protocol):',to:'def save(self, text: str) -> None: ...',text:'定义结构化协议（静态鸭子类型）：约定只要有匹配的 save(self, text: str) -> None 方法就符合 Saver。'},
    {at:'class MemorySaver:',to:'print("已保存：", text)',text:'MemorySaver 完全没有继承 Saver，但实现了同名同签名的 save 方法，因此在静态检查器眼里自动满足 Saver 协议。'},
    {at:'def first[T](items: list[T]) -> T | None:',to:'return items[0] if items else None',text:'Python 3.12+ 泛型函数写法：传入 list[int] 就推断返回 int | None，传入 list[UserCard] 就推断返回 UserCard | None，不丢失类型信息。'},
    {at:'def persist(card: UserCard, saver: Saver) -> None:',to:'saver.save(',text:'业务函数只依赖抽象协议 Saver，不绑死具体实现类，测试时随时可以换成一个假的 MockSaver。'},
    {at:'top = first([{"name": "林林", "role": "admin"}])',to:'persist(top, MemorySaver())',text:'先判空（if top is not None）把类型收窄为确定的字典，再传给 persist 执行保存。'},
   ],
  },
  {
   title:'动手试试：用 Protocol、TypedDict 与泛型写出清晰接口',
   body:'写一段完整的现代 Python 3.12+ 类型注解实战代码：用 TypedDict 描述订单结构、Literal 限定订单状态、Protocol 定义格式化器接口，两个完全独立的格式化类无需继承即可无缝替换，再用泛型函数 pick_first[T] 安全取出首条订单并导出。',
   practice:{
    steps:[
     '确认本机 Python 版本为 3.12 及以上（运行 python --version 查看，因为代码使用了 3.12 新泛型语法 def pick_first[T]）。',
     '新建文件 typing_lab.py，把下面的代码完整复制进去并按 UTF-8 保存。',
     '在终端运行 python typing_lab.py（或 py -X utf8 typing_lab.py），对照下方预期输出。',
     '如果电脑里装了 mypy 或 VS Code 启用了 Pylance（pyright），试着把 status 改成 "cancelled" 或把 TextFormatter 的 format 方法改名，体验静态类型检查器提前帮你在运行前拦截错误的感觉！',
    ],
    expect:'文本格式：#101 [paid] ¥59.50\nCSV 格式：101,paid,59.5\n空列表首项：None',
   },
   code:`from typing import Literal, Protocol, TypedDict

class Order(TypedDict):
    id: int
    status: Literal["paid", "pending"]
    amount: float

class Formatter(Protocol):
    def format(self, order: Order) -> str: ...

class TextFormatter:
    def format(self, order: Order) -> str:
        return f"#{order['id']} [{order['status']}] ¥{order['amount']:.2f}"

class CsvFormatter:
    def format(self, order: Order) -> str:
        return f"{order['id']},{order['status']},{order['amount']}"

def export_order(order: Order, fmt: Formatter) -> str:
    return fmt.format(order)

def pick_first[T](items: list[T]) -> T | None:
    return items[0] if items else None

orders: list[Order] = [
    {"id": 101, "status": "paid", "amount": 59.5},
    {"id": 102, "status": "pending", "amount": 120.0},
]
first_order = pick_first(orders)
if first_order is not None:
    print(f"文本格式：{export_order(first_order, TextFormatter())}")
    print(f"CSV 格式：{export_order(first_order, CsvFormatter())}")
print(f"空列表首项：{pick_first([])}")`,
   explain:[
    {at:'from typing import Literal, Protocol, TypedDict',text:'导入现代类型注解常用的三个工具。'},
    {at:'class Order(TypedDict):',to:'amount: float',text:'用 TypedDict 定义订单字典的三个字段及精确类型，并用 Literal 把 status 限定在 "paid" 和 "pending"。'},
    {at:'class Formatter(Protocol):',to:'def format(self, order: Order) -> str: ...',text:'定义格式化器协议：任何提供 format(self, order: Order) -> str 方法的类都符合要求。'},
    {at:'class TextFormatter:',to:'return f"#{order[\'id\']}',text:'人类可读的文本格式化实现，不继承 Formatter，按结构匹配协议。'},
    {at:'class CsvFormatter:',to:'return f"{order[\'id\']},{order[\'status\']},{order[\'amount\']}"',text:'CSV 导出格式实现，同样不继承 Formatter，靠相同方法签名即可传入 export_order。'},
    {at:'def export_order(order: Order, fmt: Formatter) -> str:',to:'return fmt.format(order)',text:'面向协议编程：只依赖 Formatter 契约，方便随时扩展 Markdown、JSON 等新格式。'},
    {at:'def pick_first[T](items: list[T]) -> T | None:',to:'return items[0] if items else None',text:'Python 3.12+ 泛型函数：返回列表中第一项，列表为空时返回 None。'},
    {at:'orders: list[Order] = [',to:'{"id": 102, "status": "pending", "amount": 120.0},',text:'声明订单列表，IDE 和静态检查器会逐项校验每个字典的键名和取值是否合规。'},
    {at:'first_order = pick_first(orders)',to:'print(f"空列表首项：',text:'先判空再分别用 TextFormatter 和 CsvFormatter 导出第一笔订单，最后测试空列表返回 None。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-decorators-1',
   q:'运行下面这段代码，打印出来的列表是什么？',
   code:'funcs = [lambda: i * 10 for i in range(3)]\nprint([f() for f in funcs])',
   options:[
    '[0, 10, 20]',
    '[0, 0, 0]',
    '[20, 20, 20]',
    '[30, 30, 30]',
   ],
   why:[
    '这是把闭包误以为“定义时按值拷贝”的直觉结果；实际上 lambda 发生晚绑定。',
    '循环结束时 i 已经是 2，不会停留在起始值 0。',
    '',
    'range(3) 产生的是 0、1、2，不包含 3，因此最后 i 为 2 而非 3。',
   ],
   answer:2,
   explain:'三个 lambda 闭包捕获的是同一个循环变量 i（晚绑定），循环结束时 i 等于 2，因此后续调用时全部计算 2 * 10 = 20。',
  },
  {
   id:'py-decorators-2',
   q:'对函数 greet 叠加两个装饰器（@dec_a 在上、@dec_b 在下），关于包装与执行顺序的说法哪项正确？',
   code:'@dec_a\n@dec_b\ndef greet():\n    print("hello")',
   options:[
    '等价于 dec_a(dec_b(greet))，调用时先进入 dec_a 再进 dec_b',
    '等价于 dec_b(dec_a(greet))，调用时先进入 dec_a 再进 dec_b',
    '等价于 dec_a(dec_b(greet))，调用时先进入 dec_b 再进 dec_a',
    '等价于 dec_b(dec_a(greet))，调用时先进入 dec_b 再进 dec_a',
   ],
   why:[
    '',
    '定义时离原函数最近的 dec_b 先执行包装，所以外层是 dec_a 而不是 dec_b。',
    '既然 dec_a 包在最外层，调用 greet() 时会最先进入 dec_a 返回的包装函数。',
    '包装顺序写反了：多层装饰器定义时自下而上，外层函数是写在上面的 dec_a。',
   ],
   answer:0,
   explain:'多个装饰器叠加等价于 greet = dec_a(dec_b(greet))：定义时自下而上依次包装，调用时从最外层 dec_a 自上而下逐层进入。',
  },
  {
   id:'py-decorators-3',
   type:'multi',
   q:'针对 funcs = [lambda: i for i in range(3)] 的闭包晚绑定问题，下面哪些写法可以让 [f() for f in funcs] 输出 [0, 1, 2]？（多选）',
   options:[
    '改为 [lambda i=i: i for i in range(3)] 利用默认参数绑定当前值',
    '用 functools.partial 把每轮循环的 i 提前绑定到辅助函数上',
    '在 lambda 体里加上 nonlocal i 强制锁定当前外层循环变量',
    '把外层列表推导式改写成元组表达式 tuple(lambda: i for ...)',
   ],
   why:[
    '',
    '',
    'lambda 表达式体内不支持 nonlocal 语句，而且即使能写也依然指向同一个 i。',
    '换成元组或生成器推导式仍共享同一个循环变量 i（且若一次性消费完仍全拿到末尾值），并未解除晚绑定。',
   ],
   answers:[0,1],
   explain:'函数默认参数在定义时求值，functools.partial 在构造时冻结实参，两者都能在每轮循环把当前 i 的值保存下来。',
  },
  {
   id:'py-decorators-4',
   type:'judge',
   q:'给函数写上类型注解 def double(x: int) -> int: 之后，如果在运行时传入字符串 "hi"，Python 解释器会自动拦截并直接抛出 TypeError。',
   answer:false,
   explain:'Python 运行时不会强制校验类型注解（"hi" * 2 甚至会正常返回 "hihi"）；类型注解主要供 mypy/pyright 静态检查、IDE 提示或 Pydantic 等框架主动读取。',
  },
  {
   id:'py-decorators-5',
   q:'编写函数装饰器时，给内层 wrapper 加上 @functools.wraps(fn) 的核心目的是什么？',
   options:[
    '给原函数自动开启结果缓存以加速重复调用',
    '保留原函数的名字、文档字符串与签名元信息',
    '自动捕获原函数抛出的异常并按默认次数重试',
    '把被装饰函数的参数强制转换成注解声明的类型',
   ],
   why:[
    '结果缓存由 @functools.lru_cache 或 @functools.cache 提供，不是 wraps 的职责。',
    '',
    'wraps 不负责异常处理或重试，它只处理函数元信息复制与 __wrapped__ 绑定。',
    'wraps 不会在运行时做任何参数类型转换或校验。',
   ],
   answer:1,
   explain:'@functools.wraps(fn) 会把原函数的 __name__、__doc__、__annotations__ 等属性复制到 wrapper，并设置 __wrapped__ 指向原函数。',
  },
  {
   id:'py-decorators-6',
   type:'fill',
   q:'Python 标准库中，给纯函数添加带容量上限的记忆化缓存，常用的装饰器是 functools.＿。',
   accepted:['lru_cache','lru_cache()'],
   explain:'@functools.lru_cache(maxsize=128) 采用最近最少使用（LRU）策略缓存纯函数的调用结果，可通过 cache_info() 查看命中统计。',
  },
  {
   id:'py-decorators-7',
   q:'使用 @functools.lru_cache 装饰一个函数后，调用时向其传入一个列表参数（如 f([1, 2, 3])），会出现什么情况？',
   options:[
    '自动把列表转换成元组后再查缓存并正常返回结果',
    '跳过缓存机制直接执行原函数，但不写入缓存字典',
    '正常缓存结果，但后续修改列表内容时缓存不会失效',
    '抛出 TypeError 异常，提示列表类型不可哈希',
   ],
   why:[
    'lru_cache 不会隐式把 list 转成 tuple，调用方需要自行传入 tuple 等不可变对象。',
    'lru_cache 在构造缓存键时就会对所有参数求哈希，不会悄悄跳过缓存。',
    '因为 list 不可哈希，根本无法作为底层缓存字典的键存入。',
    '',
   ],
   answer:3,
   explain:'lru_cache 内部使用字典按参数构造缓存键，要求所有实参都是可哈希（hashable）对象；传入 list 或 dict 会触发 TypeError: unhashable type。',
  },
  {
   id:'py-decorators-8',
   type:'multi',
   q:'关于 typing.Protocol（结构化子类型 / 静态鸭子类型），以下哪些说法正确？（多选）',
   options:[
    '实现类无需显式继承该 Protocol，只要具备匹配的方法签名即符合协议',
    '实现类必须在初始化方法中调用 super().__init__() 才能通过协议检查',
    '配合 mypy 或 pyright 等静态检查器使用，可以在运行前发现接口不匹配',
    '有助于业务代码面向抽象契约编程，降低模块耦合也方便单元测试替换',
   ],
   why:[
    '',
    'Protocol 的核心价值正是“不需要继承”，自然不需要也不存在调用 super().__init__() 的要求。',
    '',
    '',
   ],
   answers:[0,2,3],
   explain:'typing.Protocol 把 Python 的鸭子类型带入了静态类型检查世界：不要求显式继承，只看结构（方法与属性签名）是否吻合。',
  },
  {
   id:'py-decorators-9',
   type:'judge',
   q:'带参数的装饰器（如 @retry(max_attempts=3)）通常写成三层嵌套函数：最外层接收装饰器配置参数，中间层接收被装饰函数，最内层接收实际调用参数。',
   answer:true,
   explain:'Python 会先求值 retry(max_attempts=3) 得到中间层 decorator，再执行 fn = decorator(fn) 得到最内层 wrapper。',
  },
  {
   id:'py-decorators-10',
   q:'在 Python 3.12+ 中，泛型函数签名 def first[T](items: list[T]) -> T: 向静态类型检查器表达了什么约束？',
   options:[
    '限制函数在运行时拒绝接收除内置 list 外的其他类型',
    '返回值类型与传入列表的元素类型 T 保持一一对应',
    '把返回值类型统一放宽为 Any 以跳过后续类型检查',
    '要求调用方必须在调用语句里手动传入类型参数 T',
   ],
   why:[
    '泛型注解属于静态类型提示，运行时 Python 解释器并不会拦截其他类型。',
    '',
    '泛型的目的恰好相反：保留精确的元素类型关联，避免退化成 Any。',
    '静态检查器会根据实参 list[int] 或 list[str] 自动推断 T，调用方无需手动标注。',
   ],
   answer:1,
   explain:'类型参数 [T] 建立了入参元素类型和返回值类型之间的关联：传入 list[str] 就推导出返回值是 str，传入 list[int] 就是 int。',
  },
  {
   id:'py-decorators-11',
   type:'short',
   q:'请解释 Python 中循环创建闭包时的“晚绑定（Late Binding）”现象：为什么 [lambda: i for i in range(3)] 调用后全返回 2，并给出两种常见修复方式。',
   reference:'晚绑定指的是：闭包在定义时捕获的是外层变量 i 的引用（cell 对象），而不是定义那一刻 i 的具体数值；直到函数真正被调用时，Python 才去查找变量 i 当前的值。循环结束后 i 停留在 2，所有 lambda 共享同一个 i，因此调用时都返回 2。两种常见修法：1) 使用默认参数在定义瞬间绑定值，如 [lambda i=i: i for i in range(3)]；2) 使用 functools.partial 将当前循环值提前冻结为偏函数的固定参数（或在每轮通过外层工厂函数创建独立作用域）。',
   points:[
    '准确说明闭包捕获的是外层变量引用（cell）而非创建时的瞬时值，调用时才求值',
    '解释循环结束后 i 的终值为 2，因此所有函数调用均读取到 2',
    '给出修法一：利用默认参数在函数定义时求值的特性（如 lambda i=i: i）',
    '给出修法二：使用 functools.partial 冻结参数（或使用外层工厂函数隔离作用域）',
   ],
   explain:'这道题几乎是 Python 中高级面试必考题，答清“引用共享 + 调用时求值”以及“默认参数定义期求值 / partial 冻结”即可拿满分。',
  },
  {
   id:'py-decorators-12',
   type:'code',
   q:'请编写一个带参数的装饰器 retry(times: int = 3)：使用 @functools.wraps(fn) 保留被装饰函数元信息；当原函数抛出异常时自动重试，最多执行 times 次；某次成功则直接返回结果，全部失败则重新抛出最后一次异常。',
   reference:'from functools import wraps\n\ndef retry(times: int = 3):\n    def decorator(fn):\n        @wraps(fn)\n        def wrapper(*args, **kwargs):\n            last_err = None\n            for _ in range(times):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception as err:\n                    last_err = err\n            raise last_err\n        return wrapper\n    return decorator',
   points:[
    '正确写出三层嵌套结构（retry 接收 times → decorator 接收 fn → wrapper 接收 *args, **kwargs）',
    '在内层 wrapper 上使用 @functools.wraps(fn) 保留原函数元信息',
    '循环最多执行 times 次，成功时立刻 return 原函数结果',
    '捕获异常并记录最后一次错误，全部尝试失败后重新 raise 抛出（不静默吞掉异常）',
   ],
   explain:'真实生产代码里还可以再增加 exceptions=(TimeoutError, ...) 参数指定只重试可恢复异常，以及重试退避间隔 delay，避免对不可恢复错误盲目重试。',
  },
 ],
};
