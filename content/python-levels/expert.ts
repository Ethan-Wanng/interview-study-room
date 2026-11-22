// Python 专家篇（第 13～15 关）：CPython 底层原理、元编程与工程实践。
import type {AiLevel} from '../journey';

export const pyCpython:AiLevel={
 id:'py-cpython',
 title:'CPython 底层：对象模型、字节码与内存管理',
 summary:'PyObject 与引用计数、分代 GC 与弱引用、字节码与 dis 反汇编、对象驻留与性能边界',
 lessons:[
  {
   title:'一切皆对象：PyObject 头部里藏着什么',
   body:'我们平时在官网下载的 Python，默认实现叫 CPython——也就是用 C 语言写出来的 Python 解释器。理解它的第一把钥匙，是“一切皆对象”：整数、小数、字符串、列表、函数，甚至类本身，在内存里都是堆上分配的完整对象。\n在 C 语言层面，所有对象开头都共享一个叫 PyObject 的结构体头部，里面装着两样最核心的东西：\n一、ob_refcnt（引用计数）：记录当前有多少个名字或容器正指向这个对象，用来判断它什么时候没人用了、可以回收；\n二、ob_type（类型指针）：指向这个对象对应的“类型对象”（比如 int 或 str），决定了它支持加法、切片还是调用等哪些操作。如果是列表、字符串这种长度不固定的对象，还会在 PyVarObject 头部里多存一个 ob_size（元素个数）。\n这套设计让 Python 极其灵活：变量名本身没有类型，只是贴在对象上的标签，运行时顺着 ob_type 就能查到能做什么操作。但灵活是有代价的——在 C 或 Rust 里一个整数只占 4 或 8 字节，而在 64 位 CPython 里，连一个普通整数 42 都要带对象头和数值字段，占用 28 字节内存。',
   code:`import sys

num = 42
text = "hello"
def greet():
    return "hi"

print(type(num), sys.getsizeof(num))
print(type(text), sys.getsizeof(text))
print(type(greet), callable(greet))`,
   explain:[
    {at:'import sys',text:'导入 sys 标准库模块，后面用 sys.getsizeof 查看单个对象在内存里占了多少字节。'},
    {at:'num = 42',to:'text = "hello"',text:'创建两个对象：一个整数 42 和一个字符串 "hello"。它们在堆上都有各自的 PyObject 头部。'},
    {at:'def greet():',to:'return "hi"',text:'函数同样是对象，定义完成后 greet 就绑定到了一个 function 对象上。'},
    {at:'print(type(num)',to:'print(type(text)',text:'type() 读取的就是对象头里的 ob_type 指针；getsizeof() 会把 PyObject 头部开销也算进去，所以 42 通常占 28 字节。'},
    {at:'print(type(greet)',text:'函数对象也有自己的类型（function），callable(greet) 为 True，说明它实现了可调用协议。'},
   ],
  },
  {
   title:'从源码到执行：AST、字节码与栈式虚拟机',
   body:'很多人把 Python 叫做“解释型语言”，其实 CPython 并不是一行一行直接读源代码执行的，它在后台会走完一条完整的流水线：\n一、词法与语法解析：把 .py 源码解析成抽象语法树（AST，Abstract Syntax Tree），检查语法是否正确；\n二、编译成字节码（Bytecode）：把 AST 编译成一组面向虚拟机的紧凑指令，打包进代码对象（code object）。当你 import 一个模块时，CPython 会把编译好的字节码缓存到 __pycache__/模块名.cpython-xxx.pyc 里；下次再导入时，只要源码没改动，就直接读 .pyc 省去重新编译；\n三、栈式虚拟机逐条执行：CPython 的主循环就像一台小电脑，维护一个“求值栈”（evaluation stack）。算 a + b 时，先把 a 压栈、再把 b 压栈，执行加法指令把两个值弹出相加，再把结果压回栈顶。\n标准库的 dis 模块可以把任何函数反汇编成人类能看懂的字节码指令，让你亲眼看到每一行 Python 代码在虚拟机里究竟干了什么。',
   code:`import dis

def add_double(a, b):
    return a + b * 2

print("局部变量:", add_double.__code__.co_varnames)
print("常量表:", add_double.__code__.co_consts)
dis.dis(add_double)`,
   explain:[
    {at:'import dis',text:'导入标准库反汇编工具 dis，用来把函数的字节码翻译成可读指令。'},
    {at:'def add_double(a, b):',to:'return a + b * 2',text:'定义一个简单函数，Python 在定义阶段就已经把它编译成 code object。'},
    {at:'print("局部变量:"',to:'print("常量表:"',text:'通过 __code__ 属性直接查看编译器提取出的局部变量名表和常量表（比如常数 2）。'},
    {at:'dis.dis(add_double)',text:'打印该函数的全部字节码指令（如加载变量、压入常量、执行 BINARY_OP 乘法与加法、RETURN_VALUE 返回结果）。'},
   ],
  },
  {
   title:'动手试试：用 sys.getrefcount 和 dis 观察对象与字节码',
   body:'下面写一段小脚本，亲手观察自定义对象的引用计数如何随着绑定和释放而增减，并用 dis.get_instructions() 检查函数编译出来的字节码指令。\n这里有两个贴心细节：\n一、调用 sys.getrefcount(obj) 时，obj 作为参数传进函数本身也会临时多出 1 次引用，所以我们记录初始值 base，观察增减“差值”最直观；\n二、我们用自定义类 Box() 而不是数字 1 做实验——因为从 Python 3.12 起，小整数、None 等内置常量引入了“不朽对象（Immortal Objects）”优化，它们的引用计数固定不变，不会随普通赋值波动。',
   practice:{
    steps:[
     '新建一个文件 cpython_inspect.py，把下面的代码完整复制进去并保存。',
     '在终端里运行 python cpython_inspect.py（Windows 也可以运行 py cpython_inspect.py）。',
     '对照下面的期望输出，确认引用计数差值先变为 1、2，释放后回到 0，并看到字节码检查结果。',
     '想亲眼看完整反汇编列表的话，可以在文件最后临时加一行 dis.dis(calc) 再运行一次，观察每一条字节码指令。',
    ],
    expect:'增加别名后计数变化: 1\n放进列表后计数变化: 2\n释放引用后计数变化: 0\n形参名: (\'x\', \'y\')\n字节码指令条数大于 0: True\n包含二元运算指令 BINARY_OP: True\n包含返回指令 RETURN_VALUE: True',
   },
   code:`import dis
import sys


class Box:
    pass


obj = Box()
base = sys.getrefcount(obj)
alias = obj
print("增加别名后计数变化:", sys.getrefcount(obj) - base)

items = [obj]
print("放进列表后计数变化:", sys.getrefcount(obj) - base)

del alias
items.clear()
print("释放引用后计数变化:", sys.getrefcount(obj) - base)


def calc(x, y):
    return x + y * 2


instructions = list(dis.get_instructions(calc))
opnames = {ins.opname for ins in instructions}
print("形参名:", calc.__code__.co_varnames)
print("字节码指令条数大于 0:", len(instructions) > 0)
print("包含二元运算指令 BINARY_OP:", "BINARY_OP" in opnames)
print("包含返回指令 RETURN_VALUE:", "RETURN_VALUE" in opnames)`,
   explain:[
    {at:'import dis',to:'import sys',text:'导入反汇编模块 dis 和系统模块 sys。'},
    {at:'class Box:',to:'pass',text:'定义一个普通自定义类，避免触发 Python 3.12+ 对小整数和常量的不朽对象优化。'},
    {at:'obj = Box()',to:'base = sys.getrefcount(obj)',text:'创建实例 obj，并记录此时作为基准的引用计数 base。'},
    {at:'alias = obj',to:'print("增加别名后计数变化:"',text:'新增一个变量名 alias 指向同一对象，引用计数比基准多 1。'},
    {at:'items = [obj]',to:'print("放进列表后计数变化:"',text:'把 obj 放进列表容器，又增加一条引用，计数比基准多 2。'},
    {at:'del alias',to:'print("释放引用后计数变化:"',text:'删除变量 alias 并清空列表，两条额外引用消失，计数差值回到 0。'},
    {at:'def calc(x, y):',to:'return x + y * 2',text:'定义待反汇编的目标函数 calc。'},
    {at:'instructions = list(dis.get_instructions(calc))',to:'opnames = {ins.opname for ins in instructions}',text:'用 dis.get_instructions 逐条提取字节码指令对象，并把所有指令名收集进集合。'},
    {at:'print("形参名:"',to:'print("包含返回指令 RETURN_VALUE:"',text:'核对函数的形参表、指令条数以及核心字节码（二元运算 BINARY_OP 和返回指令 RETURN_VALUE）。'},
   ],
  },
  {
   title:'内存回收第一主力：引用计数与循环引用难题',
   body:'CPython 管理内存的第一道主力是“引用计数”（Reference Counting）。\n什么时候计数加 1？给新变量赋值、放进列表或字典、作为参数传进函数时。什么时候减 1？变量被 del 删除、重新绑定到别的值、函数执行结束局部变量出栈，或者从容器里移除时。\n一旦某个对象的 ob_refcnt 降到 0，CPython 会立刻调用它的析构方法（如果有）并马上归还内存。这样做有两个大好处：回收是实时的（不会攒到后面突然大卡顿），而且刚刚释放的内存热乎乎的，很快就能复用。\n但它有一个致命盲区——循环引用（Reference Cycle）：比如对象 a 的属性指着 b，b 的属性又指着 a。即使外面的变量 a 和 b 都被删光了，程序再也摸不到它们，但它们俩互相指着对方，引用计数都卡在 1，永远降不到 0！光靠引用计数，这类内存就会一直漏在堆里。',
   code:`class Node:
    def __init__(self, name):
        self.name = name
        self.peer = None

a = Node("A")
b = Node("B")
a.peer = b
b.peer = a
del a, b`,
   explain:[
    {at:'class Node:',to:'self.peer = None',text:'定义一个节点类，peer 属性用来保存对另一个节点的引用。'},
    {at:'a = Node("A")',to:'b = Node("B")',text:'创建两个节点对象，此时各自的引用计数都是 1。'},
    {at:'a.peer = b',to:'b.peer = a',text:'让两个节点互相指向对方，形成循环引用，各自引用计数升到 2。'},
    {at:'del a, b',text:'删掉外部变量名 a 和 b 后，两个节点的计数都从 2 降到 1——外部已无法访问它们，但仅靠引用计数无法释放。'},
   ],
  },
  {
   title:'分代垃圾回收（Generational GC）与 weakref 弱引用',
   body:'为了收拾引用计数搞不定的循环引用，CPython 配备了第二道防线：分代垃圾回收器（Generational GC，由标准库 gc 模块控制）。\n它有三个非常聪明的设计：\n一、只盯容器对象：整数、浮点数、字符串不可能引用别的对象，自然构不成循环；只有 list、dict、set、自定义类实例这些可能装其他对象的容器，才会被 GC 跟踪；\n二、按“年龄”分三代（0 / 1 / 2 代）：基于经验规律“绝大多数对象朝生夕死，活过几轮的对象往往会活很久”。新对象都在 0 代，0 代分配次数达到阈值（默认 700）就快速扫一次；扛过回收的晋升到 1 代，再到 2 代，越老的代扫描越少，大幅降低扫描开销；\n三、找出孤岛并拆环：扫描某一代时，GC 会试探性地把该代内部互相引用的计数扣掉；扣完后还有外部引用支撑（以及从它们出发能到达的）对象全部存活，剩下的“外部完全摸不到、只剩内部互指”的孤立环就会被断开并回收。\n而在日常业务里，如果你写缓存、父子节点回指或观察者列表，不想因为“留着一个引用”就卡死对象回收，可以使用 weakref（弱引用）：弱引用指向对象但**不增加引用计数**；只要强引用全没了，对象立刻释放，弱引用调用时会自动返回 None。',
   code:`import weakref

class User:
    def __init__(self, name):
        self.name = name

u = User("小李")
ref = weakref.ref(u)
print("存活时:", ref().name)
del u
print("释放后:", ref())`,
   explain:[
    {at:'import weakref',text:'导入标准库弱引用模块 weakref。'},
    {at:'class User:',to:'self.name = name',text:'普通自定义类的实例默认都支持创建弱引用（内置的 list、dict 等部分类型不直接支持）。'},
    {at:'u = User("小李")',to:'ref = weakref.ref(u)',text:'创建强引用 u，再基于 u 建立弱引用 ref；此时 u 的引用计数不会因 ref 而增加。'},
    {at:'print("存活时:"',text:'调用 ref() 取出原对象，此时 u 还活着，正常打印“小李”。'},
    {at:'del u',to:'print("释放后:"',text:'删掉唯一的强引用 u 后，对象立即被引用计数回收，再次调用 ref() 返回 None。'},
   ],
  },
  {
   title:'动手试试：构造循环引用并用 gc.collect() 和 weakref 验证回收',
   body:'光听原理不过瘾，我们来亲手做一次对照实验：先用 gc.disable() 暂时关掉自动垃圾回收，制造一对互相引用的 Node 对象并留下弱引用观察窗；删掉外部变量后，看看它们是不是真的“赖在内存里不走”；接着手动触发 gc.collect()，验证分代 GC 一出手就把循环引用清理干净。',
   practice:{
    steps:[
     '新建文件 gc_cycle_demo.py，粘贴下面的代码并保存。',
     '在终端里运行 python gc_cycle_demo.py（Windows 可用 py gc_cycle_demo.py）。',
     '核对输出：删除变量后、GC 前仍存活为 True，说明纯引用计数搞不定循环引用；gc.collect() 后已回收为 True，说明分代 GC 成功破环。',
     '试着把 b.peer = a 那一行注释掉再运行，看看没有循环引用时第一行输出会变成什么（体会引用计数的实时回收）。',
    ],
    expect:'删除变量后、GC 前仍存活: True\n手动 gc.collect() 后已回收: True',
   },
   code:`import gc
import weakref


class Node:
    def __init__(self, name):
        self.name = name
        self.peer = None


gc.disable()
try:
    a = Node("A")
    b = Node("B")
    a.peer = b
    b.peer = a

    ref_a = weakref.ref(a)
    ref_b = weakref.ref(b)

    del a, b
    print("删除变量后、GC 前仍存活:", ref_a() is not None and ref_b() is not None)

    gc.collect()
    print("手动 gc.collect() 后已回收:", ref_a() is None and ref_b() is None)
finally:
    gc.enable()`,
   explain:[
    {at:'import gc',to:'import weakref',text:'导入垃圾回收控制模块 gc 和弱引用模块 weakref。'},
    {at:'class Node:',to:'self.peer = None',text:'定义可互相引用的节点类。'},
    {at:'gc.disable()',to:'try:',text:'临时关闭自动分代 GC，防止解释器中途悄悄自动清理，用 try/finally 确保实验结束一定恢复开启。'},
    {at:'a = Node("A")',to:'b.peer = a',text:'创建 A、B 两个节点并让它们互相指向，构成循环引用。'},
    {at:'ref_a = weakref.ref(a)',to:'ref_b = weakref.ref(b)',text:'给两个节点各挂一个弱引用，作为观察它们生死状态的“窗口”，不会干扰引用计数。'},
    {at:'del a, b',to:'print("删除变量后、GC 前仍存活:"',text:'删除全部外部强引用，但因为循环引用存在，两个节点都没有被引用计数回收，弱引用仍能拿到对象。'},
    {at:'gc.collect()',to:'print("手动 gc.collect() 后已回收:"',text:'手动执行一次完整分代 GC，循环引用被检测并销毁，两个弱引用都变成 None。'},
    {at:'finally:',to:'gc.enable()',text:'无论中间是否报错，最终恢复自动垃圾回收。'},
   ],
  },
  {
   title:'小整数池与字符串驻留：别拿 is 当 ==',
   body:'学 Python 时你可能见过一道经典“怪题”：a = 100; b = 100 时 a is b 是 True，但用 int("1000") 造两个 1000，它们用 is 比较却是 False。背后是 CPython 的两项缓存优化：\n一、小整数池（Small Integer Cache）：程序里 -5 到 256 这些小整数用得太频繁了，CPython 启动时就提前把它们创建好存成共享单例。谁用到 100，就直接拿同一个对象，省去反复分配释放；\n二、字符串驻留（String Interning）：长得像合法变量名（字母、数字、下划线）的编译期短字符串，CPython 通常也会自动合并为同一份对象；如果是运行期动态拼出来的长字符串，可以用 sys.intern(s) 手动驻留——当内存里有百万个字典共用同一批长键名时，既能省内存，又能让字典比较键时先比指针地址，一步命中。\n但请记住一条铁律：这些缓存属于 CPython 的内部实现细节（同一代码块里的编译器常量折叠甚至会让大数字面量也共享地址）。写业务代码时，is 只用来判断单例身份（比如 x is None），比较值是否相等请一律用 ==！',
   code:`import sys

a = 100
b = 100
print("小整数身份相同:", a is b)

x = int("1000")
y = int("1000")
print("动态大整数 ==:", x == y, "is:", x is y)

s1 = sys.intern("user_" + "profile_key")
s2 = sys.intern("user_" + "profile_key")
print("手动驻留后身份相同:", s1 is s2)`,
   explain:[
    {at:'import sys',text:'导入 sys 模块，用来演示手动字符串驻留 sys.intern。'},
    {at:'a = 100',to:'print("小整数身份相同:"',text:'100 落在小整数池 [-5, 256] 内，a 和 b 指向同一个共享对象，所以 a is b 为 True。'},
    {at:'x = int("1000")',to:'print("动态大整数 ==:"',text:'通过 int() 在运行期分别构造出两个 1000，它们值相等（== 为 True），但内存地址不同（is 为 False）。'},
    {at:'s1 = sys.intern',to:'print("手动驻留后身份相同:"',text:'用 sys.intern 把两个动态拼接的字符串放进驻留池，两者复用同一份内存，s1 is s2 变成 True。'},
   ],
  },
  {
   title:'内存分配器 pymalloc 与 list / dict 的底层布局',
   body:'Python 里小对象成千上万，如果每次新建一个字符串或字典都找操作系统 malloc 要内存，不仅慢，还会造成严重的内存碎片。因此 CPython 内置了专门的小对象分配器 pymalloc：\n一、pymalloc 三级结构：凡是不超过 512 字节的对象，先向操作系统批发大块内存叫 Arena（256 KB），切成固定大小的 Pool（4 KB），再按 8/16 字节对齐切成一个个小 Block。要小对象直接从对应尺寸的 Pool 拿，还回来也放回 Pool 复用，极快且少碎片；\n二、list 底层是指针数组：Python 的 list 并不是直接把整数紧凑排在一起，而是存了一排指向各个 PyObject 的指针（所以同一个列表可以混装整数、字符串和对象）。为了避免每次 append 都重新搬家，list 会“超额预分配”（扩容时多留约 12.5% 的空位），让尾部 append 做到摊还 O(1)；但如果在头部 insert(0, x) 或 pop(0)，后面所有指针都要整体挪位，是 O(n)（频繁操作两端请换 collections.deque）；\n三、dict 紧凑哈希表（Python 3.6+）：早期字典把空的哈希槽位全存成完整三元组，非常浪费空间。现在拆成了两张表——稀疏的 indices 索引表只存很小的整数下标，紧凑的 entries 数组按插入顺序紧挨着存 (hash, key, value)。这样既省了约两成内存，又顺理成章保证了字典按插入顺序遍历，同时保持平均 O(1) 查找！',
   code:`import sys

nums = []
sizes = []
for i in range(10):
    nums.append(i)
    sizes.append(sys.getsizeof(nums))

print("扩容字节序列:", sizes)
d = {"b": 2, "a": 1, "c": 3}
print("紧凑 dict 保持插入顺序:", list(d.keys()))`,
   explain:[
    {at:'import sys',text:'导入 sys，用 getsizeof 观察 list 底层指针数组的容量变化。'},
    {at:'nums = []',to:'sizes = []',text:'准备一个空列表 nums 和记录每次内存大小的列表 sizes。'},
    {at:'for i in range(10):',to:'sizes.append(sys.getsizeof(nums))',text:'连续追加 10 个元素；你会看到字节数不是每次都涨，而是隔几次跳跃一次，这就是超额预分配策略。'},
    {at:'print("扩容字节序列:"',text:'打印每次追加后的列表头部加指针数组占用字节数，直观感受摊还 O(1) 扩容。'},
    {at:'d = {"b": 2',to:'print("紧凑 dict 保持插入顺序:"',text:'entries 数组按插入顺序紧密排列，所以迭代 keys() 严格输出 [\'b\', \'a\', \'c\']。'},
   ],
  },
  {
   title:'为什么纯 Python 计算慢，配 NumPy / Rust（PyO3）却很快',
   body:'面试里常被问：“大家都说 Python 慢，为什么 AI 和数据科学却全在用 Python？”答案正好藏在我们刚学过的对象模型里：\n纯 Python 跑一百万次数值循环为什么慢？主要有三座大山：\n一、装箱与指针追踪：一个装一百万个小数的 Python list，实际是 100 万个指向堆上零散位置的指针，CPU 每次读数都要跳来跳去，缓存命中率极低；\n二、逐元素动态类型分发：哪怕循环体只有一行 total += x，虚拟机每轮都要解释字节码、查 ob_type 确认两边是什么类型、分发到对应的加法函数，还要新分配一个 PyFloatObject 装结果；\n三、解释器循环开销：尽管 Python 3.11+ 引入了自适应特化解释器加快热点指令，但依然无法和直接跑在 CPU 上的原生机器码抗衡。\n而当你用 NumPy、PyTorch、Polars 或者用 Rust（通过 PyO3）写扩展时，游戏规则彻底变了：\n一、数据按未装箱的连续数组紧挨着躺在内存里（比如连续的 64 位浮点数），CPU 缓存命中率拉满，还能用 SIMD 单指令一次算多个数；\n二、整个数组共享同一数据类型，只需检查一次类型，核心循环直接以编译好的 C/Rust 机器码高速运行，甚至可以释放 GIL 跑满多核。\n所以 Python 真正的定位是“胶水语言”：上层业务与胶水逻辑用 Python 写得清晰敏捷，重计算内核交给 C/C++/Rust 扩展，兼得开发效率与原生性能。',
  },
  {
   title:'动手试试：用 WeakValueDictionary 实现自动释放的对象缓存',
   body:'在实际开发中，如果我们用普通 dict 缓存加载过的配置或资源对象，很容易忘了清理导致内存一路上涨。换成标准库的 weakref.WeakValueDictionary 后，只要外部业务代码还拿着对象的强引用，缓存就能直接命中复用；一旦业务代码用完释放了强引用，缓存条目会自动消失，彻底杜绝缓存内存泄漏。',
   practice:{
    steps:[
     '新建文件 weak_cache_demo.py，把下面的代码复制进去保存。',
     '在终端里运行 python weak_cache_demo.py（Windows 可用 py weak_cache_demo.py）。',
     '核对输出：两次获取同名资源返回的是同一个对象（缓存命中），删掉 r1 和 r2 后缓存长度自动归零。',
     '把 cache 改成普通字典 cache = {} 再运行一次，看看最后一行输出变成了 False——对比感受普通字典为什么容易引起内存泄漏。',
    ],
    expect:'命中同一个缓存对象: True\n持有强引用时缓存大小: 1\n释放强引用后缓存自动清空: True',
   },
   code:`import gc
import weakref


class Resource:
    def __init__(self, name):
        self.name = name


cache = weakref.WeakValueDictionary()


def get_resource(name):
    obj = cache.get(name)
    if obj is None:
        obj = Resource(name)
        cache[name] = obj
    return obj


r1 = get_resource("db-pool")
r2 = get_resource("db-pool")
print("命中同一个缓存对象:", r1 is r2)
print("持有强引用时缓存大小:", len(cache))

del r1, r2
gc.collect()
print("释放强引用后缓存自动清空:", len(cache) == 0 and "db-pool" not in cache)`,
   explain:[
    {at:'import gc',to:'import weakref',text:'导入 gc 与 weakref 模块。'},
    {at:'class Resource:',to:'self.name = name',text:'定义要被缓存的资源对象类。'},
    {at:'cache = weakref.WeakValueDictionary()',text:'创建弱值字典：键是普通字符串，值保存对 Resource 实例的弱引用，不阻止回收。'},
    {at:'def get_resource(name):',to:'return obj',text:'优先从弱引用缓存查找；未命中时新建 Resource 实例存入缓存并返回。'},
    {at:'r1 = get_resource("db-pool")',to:'print("持有强引用时缓存大小:"',text:'r1 持有强引用，所以第二次调用直接命中缓存（r1 is r2 为 True），此时缓存大小为 1。'},
    {at:'del r1, r2',to:'print("释放强引用后缓存自动清空:"',text:'删掉全部强引用并整理内存后，对象被回收，WeakValueDictionary 自动移除失效键，缓存长度变为 0。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-cpython-1',
   q:'在 CPython 底层，每个对象的 PyObject 结构体头部必备哪两个核心字段？',
   options:[
    '对象元素长度 ob_size 与源码调试行号表',
    '引用计数 ob_refcnt 与类型指针 ob_type',
    '对象缓存哈希值与所属模块命名空间指针',
    '分代回收链表指针与全局解释器锁标志位',
   ],
   why:[
    '对象元素个数 ob_size 仅存在于变长对象头部 PyVarObject，行号存在代码对象里而非每个对象头上。',
    '',
    '哈希值并非所有对象都缓存（可变对象甚至不可哈希），模块命名空间指针也不存在每个对象头上。',
    '分代 GC 链表头只在被跟踪的容器对象前额外附加，GIL 是解释器级状态而非对象头字段。',
   ],
   answer:1,
   explain:'所有 CPython 对象共享 PyObject 头部，其中 ob_refcnt 负责引用计数，ob_type 指向该对象的类型对象以支持动态分发。',
  },
  {
   id:'py-cpython-2',
   q:'导入 Python 模块时，解释器自动生成的 __pycache__/*.pyc 文件里存放的是什么？',
   options:[
    '模块导出的静态类型检查结果',
    '直接由 CPU 执行的本地机器码',
    '源码编译后的 Python 字节码缓存',
    '模块运行期间产生的日志快照',
   ],
   why:[
    'CPython 运行时不做静态类型检查，类型检查由 mypy、pyright 等外部工具完成。',
    'CPython 不会把 .py 直接编成本地机器码，而是由虚拟机执行跨平台的字节码。',
    '',
    '.pyc 是编译阶段产物，用来加速下次 import，与运行日志无关。',
   ],
   answer:2,
   explain:'.pyc 缓存了模块源码编译后的字节码与代码对象，下次导入且源码未变时可直接加载，跳过词法语法解析与编译步骤。',
  },
  {
   id:'py-cpython-3',
   type:'multi',
   q:'关于 CPython 的引用计数机制，下面哪些说法是正确的？（多选）',
   options:[
    '对象引用归零时可实时触发内存释放',
    '只针对列表和字典等容器类型做计数',
    '仅靠引用计数无法清理循环引用孤岛',
    '比 C 语言原生整数更节省单值内存',
   ],
   why:[
    '',
    '所有 PyObject 都有引用计数，只跟踪容器对象的是分代循环垃圾回收器。',
    '',
    '由于每个对象都带 PyObject 头部，单个 Python 整数比 C 原生整数占用更多内存。',
   ],
   answers:[0,2],
   explain:'引用计数的核心优势是实时释放、无明显大停顿，但致命弱点是互相引用的循环对象计数归不了零，需要分代 GC 兜底。',
  },
  {
   id:'py-cpython-4',
   type:'judge',
   q:'CPython 的分代垃圾回收器会把整数、字符串等所有对象都纳入 0/1/2 三代链表进行循环引用扫描。',
   answer:false,
   explain:'整数、浮点数、字符串等原子类型无法持有对其他对象的引用，不可能构成循环引用，因此只有容器类对象才会被分代 GC 跟踪。',
  },
  {
   id:'py-cpython-5',
   q:'用 weakref.WeakValueDictionary 实现对象缓存，相比普通 dict 最大的优势是什么？',
   options:[
    '不增加对象引用计数，无强引用时自动淘汰',
    '底层改为红黑树存储，支持按键范围切片',
    '自动把缓存值持久化到磁盘，重启后可恢复',
    '在多线程并发写入时自动免去一切同步开销',
   ],
   why:[
    '',
    'WeakValueDictionary 底层仍是哈希映射，并非红黑树，也不支持范围切片。',
    '弱引用字典纯内存运行，不提供磁盘持久化能力。',
    '弱引用解决的是生命周期与内存泄漏问题，并非并发锁机制。',
   ],
   answer:0,
   explain:'弱引用不增加目标对象的引用计数，一旦业务方不再持有强引用，对象会被正常回收，缓存条目也会随之自动清除。',
  },
  {
   id:'py-cpython-6',
   type:'fill',
   q:'Python 标准库中，用来将函数反汇编并查看其字节码指令的模块名是＿。',
   accepted:['dis'],
   explain:'dis（disassembler）模块提供 dis.dis() 和 dis.get_instructions()，可将代码对象反汇编为可读的字节码指令。',
  },
  {
   id:'py-cpython-7',
   q:'为什么生产代码判断两个整数数值是否相等时，应当使用 == 而不是 is？',
   options:[
    '因为 is 运算符在比较负数时会直接抛异常',
    '因为 == 会自动把字符串和整数转成同类型',
    '因为 is 专门用于比较字符串而不能用于数字',
    '因为 is 比较对象内存标识，大整数可能不同',
   ],
   why:[
    'is 可以安全比较任何两个对象，包括负数，不会抛异常。',
    'Python 是强类型语言，1 == "1" 返回 False，不会隐式互转类型。',
    'is 适用于任意 Python 对象，只是语义上是检查是否为同一对象而非值相等。',
    '',
   ],
   answer:3,
   explain:'is 检查的是 id(a) == id(b)（是否为同一个内存对象）。[-5, 256] 之外动态创建的整数通常是不同对象，值比较应使用 ==。',
  },
  {
   id:'py-cpython-8',
   type:'judge',
   q:'Python 3.6+ 的紧凑型 dict 通过分离稀疏索引表与密集条目数组，既减少了内存占用，又保留了键的插入顺序。',
   answer:true,
   explain:'紧凑型 dict 用小整数稀疏表 indices 指向按插入顺序排列的密集数组 entries，大幅节省空槽空间并天然保序。',
  },
  {
   id:'py-cpython-9',
   q:'在 CPython 中，list.append(x) 能做到摊还 O(1)，而 list.insert(0, x) 却是 O(n)，底层原因是？',
   options:[
    '头部插入需要先对整个列表重新计算哈希值',
    'list 底层是超额预分配指针数组，头插要搬移元素',
    'append 在单独后台线程执行，insert 在主线程执行',
    'Python 底层把 list 实现为单向链表，定位头部较慢',
   ],
   why:[
    'list 不是哈希表，插入元素不需要计算哈希值。',
    '',
    '两者都在当前线程同步执行，不存在后台线程差异。',
    'list 底层是连续动态指针数组而非链表；况且单向链表恰恰是头插更快。',
   ],
   answer:1,
   explain:'list 底层是连续的 PyObject* 指针数组，尾部扩容有超额预分配所以摊还 O(1)；而在下标 0 插入时，后面 n 个指针都要右移一位。',
  },
  {
   id:'py-cpython-10',
   type:'multi',
   q:'NumPy 或 Rust（PyO3）扩展在数值计算上远快于纯 Python 循环，主要得益于哪些底层原因？（多选）',
   options:[
    '数据在内存中连续未装箱，CPU 缓存命中率高',
    '热点循环以原生机器码执行，可配合 SIMD 向量化',
    '解释器会自动把纯 Python 循环改写成 GPU 核函数',
    '无需在每次迭代中重复做动态类型分发和对象装箱',
   ],
   why:[
    '',
    '',
    'CPython 不会自动把普通循环改写成 GPU 核函数，GPU 加速需要显式使用对应框架或算子。',
    '',
   ],
   answers:[0,1,3],
   explain:'连续未装箱内存、原生机器码/SIMD 向量化以及省去逐元素动态类型检查与对象分配，共同带来了数量级的性能差距。',
  },
  {
   id:'py-cpython-11',
   type:'short',
   q:'请简述 CPython 是如何把“引用计数”和“分代垃圾回收”结合起来管理内存的，并举例说明什么场景适合使用 weakref。',
   reference:'CPython 以引用计数为主力：每个对象头部维护 ob_refcnt，增删引用时实时更新，计数归零立即释放，没有大停顿，但无法回收互相引用的循环引用孤岛。为此辅以分代垃圾回收（Generational GC），专门跟踪可能产生循环的容器对象，按存活时间分 0/1/2 三代扫描（新对象高频扫描、老对象低频扫描），检测并拆断不可达的循环引用。在实现对象缓存、父子节点回指或事件观察者列表时，应使用 weakref（如 weakref.ref 或 WeakValueDictionary），让引用不阻止对象回收，从而防止内存泄漏。',
   points:[
    '说明引用计数作为主力，计数归零实时释放但无法处理循环引用',
    '说明分代 GC 只跟踪容器对象，按 0/1/2 三代检测并清理循环引用',
    '说明 weakref 不增加引用计数，对象无强引用时会正常释放',
    '给出至少一个适用场景（如缓存、父子回指、观察者注册表）',
   ],
   explain:'面试高频题，核心答清“引用计数为主、分代 GC 补循环引用短板、weakref 打破非必要强引用”这三层协作关系。',
  },
  {
   id:'py-cpython-12',
   type:'code',
   q:'编写一段 Python 代码：定义一个支持弱引用的类 Item(name)，并用 weakref.WeakValueDictionary 实现函数 get_item(name)（缓存命中时复用已有实例，未命中时新建并缓存）；最后写出演示代码，验证强引用存在时复用同一对象、删除强引用后缓存自动清空。',
   reference:'import gc\nimport weakref\n\nclass Item:\n    def __init__(self, name: str):\n        self.name = name\n\n_cache: weakref.WeakValueDictionary[str, Item] = weakref.WeakValueDictionary()\n\ndef get_item(name: str) -> Item:\n    obj = _cache.get(name)\n    if obj is None:\n        obj = Item(name)\n        _cache[name] = obj\n    return obj\n\na = get_item("cfg")\nb = get_item("cfg")\nassert a is b and len(_cache) == 1\ndel a, b\ngc.collect()\nassert len(_cache) == 0',
   points:[
    '正确定义自定义类 Item 并导入 weakref',
    '使用 weakref.WeakValueDictionary 作为缓存容器',
    'get_item 实现先查缓存、未命中再新建写入并返回的逻辑',
    '演示强引用存活时 a is b 命中缓存，删除强引用后缓存长度为 0',
   ],
   explain:'关键在于保留强引用期间能复用对象，且所有强引用删除后弱引用字典会自动清理对应条目。',
  },
 ],
};

export const pyMetaprogramming:AiLevel={
 id:'py-metaprogramming',
 title:'元编程：动态属性、类装饰器与元类',
 summary:'类即对象与 type 动态造类、__new__ vs __init__、__init_subclass__、元类与 ABCMeta、运行时自省',
 lessons:[
  {
   title:'类也是对象：class 语句背后其实是 type()',
   body:'在很多静态语言里，“类”只是编译期的一张图纸，程序跑起来后图纸就消失了；但在 Python 里，连类本身都是运行时活生生的对象——你可以把它赋给变量、放进字典、当参数传给函数，甚至在程序运行时凭空造出一个新类。\n平时我们写 class User(Base): role = "member"，Python 在后台做的其实很直白：\n一、先执行 class 缩进块里的代码，把里面定义的属性和方法收集成一个命名空间字典 namespace；\n二、调用内置的 type(类名, 父类元组, 命名空间字典) 来构造并返回一个真正的类对象。\n没错，type() 有两张面孔：传一个参数 type(obj) 是“查类型”，传三个参数 type("User", (Base,), {...}) 就是“造新类”！\n所以你会发现一个有趣的现象：isinstance(User, type) 是 True（类是 type 造出来的实例），连 isinstance(type, type) 也是 True——type 就是站在整个 Python 类型体系顶端的“造类工厂”。',
   code:`class User:
    role = "member"

    def hello(self):
        return f"hi, {self.role}"

DynamicUser = type(
    "DynamicUser",
    (),
    {"role": "guest", "hello": lambda self: f"hi, {self.role}"},
)

print(User().hello(), DynamicUser().hello())
print(isinstance(User, type), isinstance(type, type))`,
   explain:[
    {at:'class User:',to:'return f"hi, {self.role}"',text:'普通的 class 语法定义了一个带类属性和方法的新类。'},
    {at:'DynamicUser = type(',to:'"hello": lambda self',text:'用三参数 type(类名, 父类元组, 命名空间字典) 在运行时动态创建等价的新类。'},
    {at:'print(User().hello()',text:'两种方式造出来的类都能正常实例化并调用方法。'},
    {at:'print(isinstance(User, type)',text:'验证普通类是 type 的实例，且 type 自身也是 type 的实例。'},
   ],
  },
  {
   title:'对象诞生的两步：__new__ 与 __init__',
   body:'每当你写下 obj = Foo(x) 创建一个实例时，Python 并不是直接冲进 __init__，而是按固定顺序走两步：\n第一步：调用 Foo.__new__(cls, x)——这是一个静态方法（不用加 @staticmethod），负责真正在内存里分配并返回一个全新的实例对象，通常会调用 super().__new__(cls) 交给父类分配；\n第二步：只要 __new__ 返回的确实是 Foo（或其子类）的实例，Python 再调用 obj.__init__(x)，负责给这个刚出生的对象贴属性、做初始化，且 __init__ 必须返回 None。\n日常 95% 的情况只写 __init__ 就够了，那什么时候必须改写 __new__ 呢？主要有两类场景：\n一、继承不可变内置类型（如 int、str、tuple）：等到 __init__ 运行时，不可变对象的值早就定死改不了了，必须在 __new__ 里先加工好数据再交给 super().__new__；\n二、控制实例到底怎么造（甚至不新造）：比如实现单例模式、对象缓存复用，或者根据参数返回另一个子类的实例。',
   code:`class Singleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Singleton()
b = Singleton()
print("同一实例:", a is b)`,
   explain:[
    {at:'class Singleton:',to:'_instance = None',text:'在类上留一个槽位保存唯一实例。'},
    {at:'def __new__(cls, *args, **kwargs):',to:'return cls._instance',text:'拦截实例创建：只有第一次调用时才通过 super().__new__(cls) 真正分配新对象，之后都直接返回已缓存的同一个实例。'},
    {at:'a = Singleton()',to:'print("同一实例:"',text:'两次构造拿到的是内存中同一个对象，a is b 为 True。'},
   ],
  },
  {
   title:'动手试试：用 __new__ 定制不可变字符串子类，并用 type() 动态造类',
   body:'在这个练习里，我们亲手把前两张卡片的核心机制跑通：先继承不可变类型 str，通过改写 __new__ 让它在诞生瞬间自动去掉首尾空白并转成大写；再用三参数 type() 动态拼出一个带属性和方法的 Greeter 类，感受“类即对象”。',
   practice:{
    steps:[
     '新建文件 meta_new_type.py，将下面的代码复制进去并保存。',
     '在终端里运行 python meta_new_type.py（Windows 可用 py meta_new_type.py）。',
     '对照期望输出，确认 CleanStr("  python  ") 变成了 "PYTHON" 且仍是 str 的实例，动态类 Greeter 也能正常调用方法。',
     '试着把 CleanStr 里的 __new__ 改成 __init__ 并运行，观察为什么不可变类型不能在 __init__ 里修改自身内容，看完记得改回。',
    ],
    expect:'定制不可变字符串: PYTHON\n仍是 str 实例: True\n动态类调用结果: 你好，小明！\n类也是 type 的实例: True',
   },
   code:`class CleanStr(str):
    def __new__(cls, text):
        cleaned = text.strip().upper()
        return super().__new__(cls, cleaned)


s = CleanStr("  python  ")
print("定制不可变字符串:", s)
print("仍是 str 实例:", isinstance(s, str))

Greeter = type(
    "Greeter",
    (),
    {
        "prefix": "你好",
        "greet": lambda self, name: f"{self.prefix}，{name}！",
    },
)

g = Greeter()
print("动态类调用结果:", g.greet("小明"))
print("类也是 type 的实例:", isinstance(Greeter, type) and isinstance(type, type))`,
   explain:[
    {at:'class CleanStr(str):',to:'return super().__new__(cls, cleaned)',text:'继承不可变类型 str，在 __new__ 里先 strip 和 upper，再把加工后的字符串交给父类分配不可变实例。'},
    {at:'s = CleanStr("  python  ")',to:'print("仍是 str 实例:"',text:'创建 CleanStr 实例，它既是干净的大写字符串，也保持了 str 的全部方法与类型关系。'},
    {at:'Greeter = type(',to:'"greet": lambda self',text:'用三参数 type() 动态构造 Greeter 类，并写入类属性 prefix 和方法 greet。'},
    {at:'g = Greeter()',to:'print("类也是 type 的实例:"',text:'实例化动态类并调用 greet 方法，同时验证类对象和 type 自身都是 type 的实例。'},
   ],
  },
  {
   title:'现代首选钩子：__init_subclass__（Python 3.6+）',
   body:'很多框架都有类似需求：写一个插件基类 Parser，希望以后团队成员每新建一个子类（比如 JsonParser、YamlParser），就自动登记进插件注册表，或者顺便检查子类有没有漏写必需属性。\n在 Python 3.6 之前，这种事几乎非写自定义元类不可；但从 Python 3.6 起，官方推出了极其优雅的钩子方法 __init_subclass__。\n只要在父类里定义 def __init_subclass__(cls, **kwargs):（它会自动变成类方法），每当有人继承这个父类，Python 在构造完子类后就会自动回调它，并把新建的子类 cls 传进来！更爽的是，你甚至可以直接在 class 定义头部传关键字参数，比如 class JsonParser(Parser, fmt="json"):。\n以前需要写元类的场景，现在大约九成都可以用 __init_subclass__ 更简单、更安全地搞定，还完全不用担心元类冲突。',
   code:`class Parser:
    registry = {}

    def __init_subclass__(cls, fmt="", **kwargs):
        super().__init_subclass__(**kwargs)
        if fmt:
            Parser.registry[fmt] = cls

class JsonParser(Parser, fmt="json"):
    pass

print(Parser.registry)`,
   explain:[
    {at:'class Parser:',to:'registry = {}',text:'定义插件基类，用类字典 registry 统一登记所有子类。'},
    {at:'def __init_subclass__(cls, fmt="", **kwargs):',to:'Parser.registry[fmt] = cls',text:'每当新子类诞生时自动触发；先调用 super().__init_subclass__ 保持协作继承，再按类头传入的 fmt 参数自动注册。'},
    {at:'class JsonParser(Parser, fmt="json"):',to:'pass',text:'子类只要在继承括号里写上 fmt="json"，不用额外写任何注册语句就自动进入注册表。'},
    {at:'print(Parser.registry)',text:'打印注册表，里面已经自动收录了 {"json": <class JsonParser>}。'},
   ],
  },
  {
   title:'元类（Metaclass）与标准库经典应用 ABCMeta',
   body:'普通类用来造实例，而“元类（Metaclass）”用来造类——换句话说，元类就是“类的类”，默认元类就是内置的 type。\n自定义元类时，只需继承 type，并按需改写它的几个核心钩子：\n一、__prepare__(mcs, name, bases, **kwargs)：在执行 class 缩进体之前，先决定用什么字典来收集类属性（比如拦截同名属性重复定义）；\n二、__new__(mcs, name, bases, namespace)：在类对象创建前，可以检查或改写命名空间字典里的属性与方法，再调用 super().__new__ 造出类；\n三、__call__(cls, *args, **kwargs)：控制“调用这个类本身”时的行为——平时 obj = MyClass() 就是触发了元类的 __call__，由它负责依次调 __new__ 和 __init__！\n标准库里最经典的元类应用就是 abc.ABCMeta（通常通过继承 abc.ABC 来使用）：它在造类时扫描所有标了 @abstractmethod 的方法；如果子类漏了任何一个没实现，在你尝试实例化它时，ABCMeta 就会立刻抛出 TypeError 拦下来。Django 和 SQLAlchemy 的 ORM 模型把类字段转成数据库列映射，背后也用到了元类。',
   code:`from abc import ABC, abstractmethod

class RequireDocMeta(type):
    def __new__(mcs, name, bases, namespace):
        if bases and not namespace.get("__doc__"):
            raise TypeError(f"{name} 必须编写类文档字符串")
        return super().__new__(mcs, name, bases, namespace)

class BaseService(metaclass=RequireDocMeta):
    pass

class AuthService(BaseService):
    """认证服务。"""

class Exporter(ABC):
    @abstractmethod
    def export(self):
        pass`,
   explain:[
    {at:'from abc import ABC, abstractmethod',text:'导入抽象基类 ABC（其元类就是 ABCMeta）和抽象方法装饰器。'},
    {at:'class RequireDocMeta(type):',to:'return super().__new__(mcs, name, bases, namespace)',text:'自定义元类继承 type：在创建非基类的新子类前检查命名空间里是否有 __doc__，缺失就直接报错，通过后再调用父类真正造类。'},
    {at:'class BaseService(metaclass=RequireDocMeta):',to:'pass',text:'通过 metaclass=... 指定元类，所有继承它的子类都会自动受该元类约束。'},
    {at:'class AuthService(BaseService):',to:'"""认证服务。"""',text:'提供了文档字符串，顺利通过元类校验。'},
    {at:'class Exporter(ABC):',to:'pass',text:'继承 ABC 并标记 @abstractmethod；任何未实现 export 的子类一旦尝试实例化，就会被 ABCMeta 拦截。'},
   ],
  },
  {
   title:'动手试试：用 __init_subclass__ 做插件注册表，并对比 ABC',
   body:'这个练习把现代日常首选的 __init_subclass__ 和标准库的 ABC / @abstractmethod 结合在一起：父类 Storage 既负责在子类定义时把带 kind 参数的插件自动登记到注册表，又靠 @abstractmethod 强制所有具体存储插件必须实现 save() 方法，漏写的子类一实例化就会被稳稳拦住。',
   practice:{
    steps:[
     '新建文件 plugin_abc_demo.py，把下面的代码复制进去保存。',
     '在终端里运行 python plugin_abc_demo.py（Windows 可用 py plugin_abc_demo.py）。',
     '核对输出：MemoryStorage 自动登记进 registry 且可以正常保存，而没实现 save 的 BrokenStorage 在实例化时抛出 TypeError 被捕获。',
     '试着再加一个 FileStorage(Storage, kind="file") 子类并实现 save 方法，重新运行，看看已注册插件列表是否自动多出 "file"。',
    ],
    expect:'已注册插件: [\'memory\']\n保存结果: memory:lang=python\n未实现抽象方法被拦截: TypeError',
   },
   code:`from abc import ABC, abstractmethod


class Storage(ABC):
    registry = {}

    def __init_subclass__(cls, kind="", **kwargs):
        super().__init_subclass__(**kwargs)
        if kind:
            Storage.registry[kind] = cls

    @abstractmethod
    def save(self, key, value):
        pass


class MemoryStorage(Storage, kind="memory"):
    def save(self, key, value):
        return f"memory:{key}={value}"


class BrokenStorage(Storage):
    pass


print("已注册插件:", sorted(Storage.registry))
store = Storage.registry["memory"]()
print("保存结果:", store.save("lang", "python"))

try:
    BrokenStorage()
except TypeError:
    print("未实现抽象方法被拦截: TypeError")`,
   explain:[
    {at:'from abc import ABC, abstractmethod',text:'导入标准库抽象基类支持。'},
    {at:'class Storage(ABC):',to:'registry = {}',text:'定义抽象插件基类 Storage，准备注册表字典 registry。'},
    {at:'def __init_subclass__(cls, kind="", **kwargs):',to:'Storage.registry[kind] = cls',text:'子类定义完成后自动触发；当类头传入了 kind 名称时，把该子类登记进注册表。'},
    {at:'@abstractmethod',to:'pass',text:'声明抽象方法 save，规定每个具体存储插件都必须实现它。'},
    {at:'class MemoryStorage(Storage, kind="memory"):',to:'return f"memory:{key}={value}"',text:'声明 memory 插件并完整实现 save 方法，同时触发自动注册。'},
    {at:'class BrokenStorage(Storage):',to:'pass',text:'故意漏写 save 方法的子类，用来演示 ABCMeta 的实例化拦截。'},
    {at:'print("已注册插件:"',to:'print("保存结果:"',text:'查看已自动注册的插件键名，并从注册表取出类实例化后调用 save。'},
    {at:'try:',to:'print("未实现抽象方法被拦截: TypeError")',text:'尝试实例化未实现抽象方法的 BrokenStorage，捕获并确认 ABCMeta 抛出了 TypeError。'},
   ],
  },
  {
   title:'类装饰器 vs __init_subclass__ vs 元类：怎么选？',
   body:'面对“想在类定义时加点自动魔法”的需求，Python 给了三件工具，选择时请遵循“简单优先”原则：\n一、类装饰器（最轻量）：就是一个接收类对象、加工后返回类对象的普通函数，比如标准库的 @dataclass。它直观、易调试、绝不会引起元类冲突；唯一的局限是只对直接贴了 @ 的那个类生效，不会自动向下传播给子类；\n二、__init_subclass__（继承体系首选）：定义在基类上，会自动向下传播给所有子类乃至孙子类，还能在类头传关键字参数，同样没有元类冲突；插件注册、子类字段校验首选它；\n三、元类（重型武器）：当两个父类分别带着互不继承的自定义元类时，多重继承会直接触发让人头疼的 TypeError: metaclass conflict。所以只有当你真的需要用 __prepare__ 定制类体执行前的命名空间、拦截类自身被调用的行为（__call__），或像 Enum、ABCMeta 那样深度改写类型协议时，才应该请出元类。',
   code:`def add_repr(cls):
    def __repr__(self):
        fields = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{cls.__name__}({fields})"
    cls.__repr__ = __repr__
    return cls

@add_repr
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

print(Point(3, 4))`,
   explain:[
    {at:'def add_repr(cls):',to:'return cls',text:'类装饰器就是一个普通函数：动态给传入的类挂上 __repr__ 方法，再把类原样返回。'},
    {at:'@add_repr',to:'self.y = y',text:'用 @add_repr 装饰 Point 类，不需要改继承结构，也不会引入元类冲突。'},
    {at:'print(Point(3, 4))',text:'自动打印出清晰的 Point(x=3, y=4)。'},
   ],
  },
  {
   title:'运行时自省与动态操作：getattr、inspect 与 importlib',
   body:'除了控制类的创建，Python 还提供了一整套优雅的运行时“自省”（Introspection）工具，让代码能够在运行期间查看并操作对象结构：\n一、动态读写属性：getattr(obj, name, default)、setattr(obj, name, value)、hasattr(obj, name) 可以按字符串名字读写属性。注意读取时最好传上 default 默认值避免 AttributeError，也不要把未经校验的外部用户输入直接喂给 setattr；\n二、inspect.signature：可以精确拿到任何函数的形参名、默认值、参数种类和类型标注。最厉害的是 sig.bind(*args, **kwargs) + apply_defaults()，它能按 Python 原生调用规则把位置参数和关键字参数统一映射到参数名上——FastAPI 的依赖注入、pytest 的 fixture 匹配都在用它；\n三、importlib.import_module("pkg.mod")：按配置文件里的模块路径字符串动态加载插件，比底层内置函数 __import__ 更清晰安全，也是大型插件架构的标准写法。',
   code:`import importlib
import inspect

math_mod = importlib.import_module("math")
fn = getattr(math_mod, "pow")
sig = inspect.signature(fn)
print("动态调用 math.pow:", fn(2, 3), "签名:", sig)`,
   explain:[
    {at:'import importlib',to:'import inspect',text:'导入动态加载模块 importlib 和代码自省模块 inspect。'},
    {at:'math_mod = importlib.import_module("math")',text:'按字符串名字在运行时动态导入标准库 math 模块。'},
    {at:'fn = getattr(math_mod, "pow")',text:'按属性名动态取出 math.pow 函数对象。'},
    {at:'sig = inspect.signature(fn)',to:'print("动态调用 math.pow:"',text:'读取函数参数签名，并直接调用取出的函数打印结果 8.0。'},
   ],
  },
  {
   title:'动手试试：用 inspect.signature 写一个自动校验非空参数的装饰器',
   body:'普通装饰器收到的往往是一堆 *args 和 **kwargs，很难分清哪个值对应哪个形参名，也容易漏掉默认参数。借助 inspect.signature 的 bind() 与 apply_defaults()，我们只需十几行代码就能写出通用的参数校验装饰器——不管调用方按位置传、按关键字传，还是用了默认值，都能准确报出具体是哪个参数为空！',
   practice:{
    steps:[
     '新建文件 signature_check.py，把下面的代码复制进去并保存。',
     '在终端里运行 python signature_check.py（Windows 可用 py signature_check.py）。',
     '对照期望输出：合法调用正常返回，空用户名和空角色都被精准拦截并报出对应形参名，且 @wraps 保留了原函数名。',
     '试着把 create_user("alice") 改成 create_user(username=None) 再运行，观察按关键字传参时是否依然能准确报错。',
    ],
    expect:'函数名保留: create_user\n默认参数调用: alice(viewer)\n关键字调用: bob(admin)\n校验拦截: 参数 username 不能为空\n校验拦截: 参数 role 不能为空',
   },
   code:`from functools import wraps
import inspect


def require_non_empty(fn):
    sig = inspect.signature(fn)

    @wraps(fn)
    def wrapper(*args, **kwargs):
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()
        for name, value in bound.arguments.items():
            if value is None or value == "":
                raise ValueError(f"参数 {name} 不能为空")
        return fn(*args, **kwargs)

    return wrapper


@require_non_empty
def create_user(username, role="viewer"):
    return f"{username}({role})"


print("函数名保留:", create_user.__name__)
print("默认参数调用:", create_user("alice"))
print("关键字调用:", create_user("bob", role="admin"))

for call in [lambda: create_user(""), lambda: create_user("carol", role="")]:
    try:
        call()
    except ValueError as err:
        print("校验拦截:", err)`,
   explain:[
    {at:'from functools import wraps',to:'import inspect',text:'导入保留元信息的 wraps 装饰器和自省模块 inspect。'},
    {at:'def require_non_empty(fn):',to:'sig = inspect.signature(fn)',text:'在装饰函数时提前解析一次原函数签名，避免每次调用都重复反射开销。'},
    {at:'@wraps(fn)',to:'def wrapper(*args, **kwargs):',text:'用 @wraps(fn) 保留原函数的 __name__、__doc__ 和签名信息。'},
    {at:'bound = sig.bind(*args, **kwargs)',to:'bound.apply_defaults()',text:'把实际传入的位置参数和关键字参数按签名对齐，并补全未传的默认值。'},
    {at:'for name, value in bound.arguments.items():',to:'return fn(*args, **kwargs)',text:'逐个检查绑定后的参数值，一旦为 None 或空字符串就带参数名抛出 ValueError，全部通过才调用原函数。'},
    {at:'return wrapper',text:'返回包装后的新函数。'},
    {at:'@require_non_empty',to:'return f"{username}({role})"',text:'把校验装饰器应用到业务函数 create_user 上。'},
    {at:'print("函数名保留:"',to:'print("关键字调用:"',text:'验证函数名未丢失，以及默认参数和关键字传参的正常路径。'},
    {at:'for call in',to:'print("校验拦截:", err)',text:'分别测试空用户名和空角色两种非法输入，验证异常信息准确指出对应形参名。'},
   ],
  },
  {
   title:'元编程的克制法则：可读性与静态分析优先',
   body:'Python 核心开发者 Tim Peters 留下过一句广为流传的忠告：“元类是深奥的黑魔法，99% 的用户根本不需要操心它；如果你在犹豫自己需不需要用元类，那你大概率不需要。”\n为什么老练的 Python 工程师对元编程都非常克制？因为过度使用动态魔法会带来三笔沉重的维护账单：\n一、静态分析失明：如果你在运行时悄悄用 setattr 或元类往类上塞属性，IDE 的自动补全、跳转定义以及 mypy / pyright 静态类型检查全都会“看不见”这些属性，拼错名字要拖到线上运行才炸；\n二、心智负担翻倍：新同事打开一个类，发现找不到某方法是在哪定义的，顺着继承链翻了半小时才发现藏在某个远程元类里，排障成本极高；\n三、多重继承埋雷：自定义元类一旦增多，混用基类时动不动就冒出元类冲突。\n一条实用的选型阶梯是：普通函数与对象组合 → 装饰器 → __init_subclass__ 与描述符 → 万不得已才用元类。真要在框架层写元编程，也记得搭配清晰文档与类型协议（如 Protocol 或 typing.dataclass_transform），让工具和队友都能一眼看懂。',
  },
 ],
 quiz:[
  {
   id:'py-metaprogramming-1',
   q:'在 Python 中，调用三参数形式的 type("User", (object,), {"role": "guest"}) 会返回什么？',
   options:[
    '一个代表类名的普通字符串对象',
    '一个包含默认字段的字典副本',
    '一个动态创建出来的 User 类对象',
    '一个直接初始化好的 User 实例',
   ],
   why:[
    '单参数 type(x) 返回类型对象，三参数 type(...) 返回的是新类本身，而非字符串。',
    '第三个参数是传入的命名空间字典，返回值是构造完成的类而非字典副本。',
    '',
    '三参数 type(...) 返回的是类对象本身，再调用 User() 才会生成实例。',
   ],
   answer:2,
   explain:'class 语句在底层执行完类体后，本质上就是调用三参数 type(name, bases, namespace) 来构造并返回新的类对象。',
  },
  {
   id:'py-metaprogramming-2',
   q:'想继承内置不可变类型 str，在创建时自动去掉首尾空格，应当改写哪个魔术方法？',
   options:[
    '__new__，在分配不可变对象前先加工文本',
    '__init__，在实例创建后再原地修改字符串',
    '__call__，让字符串像普通函数一样被调用',
    '__del__，在字符串准备销毁之前整理内容',
   ],
   why:[
    '',
    'str 是不可变类型，执行到 __init__ 时内部字符内容已经固定，无法原地更改。',
    '__call__ 控制的是“把对象当函数调用”的行为，与构造不可变值无关。',
    '__del__ 在对象销毁回收时触发，不能用来初始化对象值。',
   ],
   answer:0,
   explain:'对象诞生先走 __new__ 再走 __init__；定制 int、str、tuple 等不可变子类的值必须在 __new__ 里处理后再传给 super().__new__。',
  },
  {
   id:'py-metaprogramming-3',
   type:'multi',
   q:'Python 3.6+ 引入的 __init_subclass__ 钩子，具备下面哪些工程优势？（多选）',
   options:[
    '无需自定义元类即可在子类创建时自动回调',
    '会自动向下传播，子类的子类同样触发钩子',
    '支持在 class 继承括号里直接传入关键字参数',
    '避免多重继承时常见的自定义元类冲突问题',
   ],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'__init_subclass__ 覆盖了大约九成过去需要元类的注册与校验需求，支持自动向下传播和类头关键字传参，且不引入元类冲突。',
  },
  {
   id:'py-metaprogramming-4',
   type:'judge',
   q:'在 Python 中，isinstance(int, type) 与 isinstance(type, type) 的返回值都是 True。',
   answer:true,
   explain:'内置类型 int 是由元类 type 构造出来的类对象，而 type 自身也是自己的实例，处于 Python 类型体系的顶点。',
  },
  {
   id:'py-metaprogramming-5',
   q:'下面哪种需求最适合动用自定义元类，而不是类装饰器或 __init_subclass__？',
   options:[
    '给某个具体数据类自动补充一个打印方法',
    '把所有新写的插件子类自动登记到全局字典',
    '检查某个函数的传参是否包含空字符串值',
    '在类体执行前定制命名空间字典 __prepare__',
   ],
   why:[
    '给单个类加方法用类装饰器最轻量、最直观。',
    '子类自动注册是 __init_subclass__ 最经典的适用场景，没必要上元类。',
    '函数调用参数校验用普通函数装饰器配 inspect.signature 即可。',
    '',
   ],
   answer:3,
   explain:'类装饰器和 __init_subclass__ 都在类体执行之后才运行，只有元类的 __prepare__ 能干预类体执行前的命名空间准备阶段。',
  },
  {
   id:'py-metaprogramming-6',
   type:'fill',
   q:'标准库 abc 模块中，给抽象基类的方法加上 ＿ 装饰器，可以强制子类在实例化之前必须实现该方法。',
   accepted:['@abstractmethod','abstractmethod'],
   explain:'继承 abc.ABC 后，被 @abstractmethod 标记的方法若未在子类中重写，实例化该子类时会由 ABCMeta 抛出 TypeError。',
  },
  {
   id:'py-metaprogramming-7',
   q:'写通用参数校验装饰器时，想把 *args 和 **kwargs 统一映射到真实形参名上，应使用 inspect 的什么能力？',
   options:[
    'inspect.getsource() 把函数源码读成纯文本',
    'inspect.signature(fn).bind() 绑定实参与形参',
    'inspect.isclass() 判断函数是否属于类对象',
    'inspect.stack() 逐层遍历当前的调用堆栈帧',
   ],
   why:[
    '读取源码字符串无法直接映射运行时的位置参数、关键字参数和默认值。',
    '',
    'isclass() 只能检查对象是不是类，与参数绑定无关。',
    'stack() 用于查看调用栈帧，开销大且不负责把 *args/**kwargs 按签名绑定。',
   ],
   answer:1,
   explain:'inspect.signature(fn).bind(*args, **kwargs) 按 Python 调用规则精准映射参数，配合 apply_defaults() 还能补全默认值。',
  },
  {
   id:'py-metaprogramming-8',
   type:'judge',
   q:'用类装饰器修饰父类后，后续所有继承该父类的子类在定义时都会自动再执行一遍这个类装饰器。',
   answer:false,
   explain:'类装饰器只在定义被直接装饰的那个类时调用一次，不会自动传播给子类；需要向下传播给子类时应使用 __init_subclass__。',
  },
  {
   id:'py-metaprogramming-9',
   q:'当一个类同时继承两个分别使用互不继承自定义元类的父类时，Python 通常会发生什么？',
   options:[
    '抛出 TypeError 提示存在元类冲突无法解析',
    '自动合并两个元类的全部方法继续正常执行',
    '静默忽略靠后父类的元类而只保留第一个',
    '把两个父类自动降级成普通函数装饰器运行',
   ],
   why:[
    '',
    'Python 无法自动合并两个无继承关系的元类，必须由开发者显式定义共同的子元类。',
    'Python 不会静默丢弃任何一个父类的元类，而是直接报错避免不可预测行为。',
    '元类与函数装饰器机制完全不同，不存在自动降级。',
   ],
   answer:0,
   explain:'多重继承要求存在一个“最派生”的兼容元类；若两个自定义元类互不为子类，就会抛出 TypeError: metaclass conflict。',
  },
  {
   id:'py-metaprogramming-10',
   type:'multi',
   q:'在工程中使用运行时自省与动态导入时，哪些做法更稳妥可维护？（多选）',
   options:[
    '把外部用户输入拼进 eval() 里来动态读取对象属性',
    '按配置加载插件使用 importlib.import_module',
    '用元类在运行时隐式注入大量属性省去类型注解',
    '调用 getattr() 动态取属性时传入默认兜底值',
   ],
   why:[
    '对外部输入使用 eval() 会带来严重的代码注入安全漏洞。',
    '',
    '隐式注入大量属性会让 IDE 补全和 mypy/pyright 静态类型检查失效，抬高维护成本。',
    '',
   ],
   answers:[1,3],
   explain:'importlib.import_module 是标准的动态导入方式，getattr 传入默认值可优雅处理缺失属性；应远离 eval 注入和过度黑魔法。',
  },
  {
   id:'py-metaprogramming-11',
   type:'short',
   q:'请对比类装饰器、__init_subclass__ 和元类（Metaclass）三者的能力差异，并说明实际开发中应该按怎样的优先级做技术选型。',
   reference:'三者都能定制类的行为，但重量级和作用范围不同：类装饰器最轻量，是加工已建好类的普通函数，易读且无元类冲突，但只作用于被直接装饰的类、不向子类传播；__init_subclass__ 定义在父类上，自动向下传播给所有子类并支持类头传关键字参数，同样没有元类冲突，适合插件注册与子类校验；元类权力最大，能通过 __prepare__ 定制类体执行前的命名空间，也能通过 __call__ 拦截类实例化，但容易在多重继承中引发元类冲突且不利于静态分析。选型应坚持简单优先：普通组合与函数 → 类装饰器 → __init_subclass__ → 确有底层协议需求才用元类。',
   points:[
    '说明类装饰器最轻量、无元类冲突，但不自动传播给子类',
    '说明 __init_subclass__ 自动向子类传播、支持类头传参，覆盖绝大多数注册与校验场景',
    '说明元类可干预 __prepare__ / __call__ 等底层协议，但易引发元类冲突与维护成本',
    '给出“简单优先”的渐进选型原则（装饰器 → __init_subclass__ → 元类）',
   ],
   explain:'这是区分“会背语法”和“懂工程取舍”的关键问题，答清作用时机、是否向子类传播以及元类冲突风险即可拿高分。',
  },
  {
   id:'py-metaprogramming-12',
   type:'code',
   q:'使用 __init_subclass__ 编写一个消息通道插件基类 Handler：在类属性 handlers 字典中按 channel 名称自动注册子类；若子类未传 channel，或传入的 channel 已被注册过，则抛出 ValueError。写出两个正常注册的子类作为演示。',
   reference:'class Handler:\n    handlers: dict[str, type["Handler"]] = {}\n\n    def __init_subclass__(cls, channel: str = "", **kwargs):\n        super().__init_subclass__(**kwargs)\n        if not channel:\n            raise ValueError(f"{cls.__name__} 必须指定 channel")\n        if channel in Handler.handlers:\n            raise ValueError(f"channel {channel!r} 已注册")\n        Handler.handlers[channel] = cls\n\nclass EmailHandler(Handler, channel="email"):\n    pass\n\nclass SmsHandler(Handler, channel="sms"):\n    pass',
   points:[
    '在基类定义字典 handlers 并在 __init_subclass__ 中调用 super().__init_subclass__',
    '校验 channel 为空时抛出 ValueError',
    '校验 channel 重复注册时抛出 ValueError',
    '正确将 cls 写入注册表，并写出两个带 channel 参数的子类演示',
   ],
   explain:'注意调用 super().__init_subclass__(**kwargs) 保证多重继承协作正常，同时在注册前做空值与重复校验。',
  },
 ],
};

export const pyEngineering:AiLevel={
 id:'py-engineering',
 title:'工程实践、测试、性能剖析与部署',
 summary:'unittest/pytest 与 Mock、ruff 与 mypy 工具链、cProfile/tracemalloc 性能定位、高频优化与 Web/部署实践',
 lessons:[
  {
   title:'自动化测试：unittest 与 pytest',
   body:'Python 是动态类型语言，变量拼错或分支少传一个参数往往要跑到那一行才暴露，所以自动化测试就是重构和团队协作的安全网。\n日常主要会碰到两套测试框架：\n一、标准库 unittest：开箱即用、零第三方依赖。写法接近 Java 的 JUnit——继承 unittest.TestCase，用 self.assertEqual、self.assertRaises 做断言，用 setUp / tearDown 准备和清理环境；\n二、社区事实标准 pytest：几乎成了现代 Python 项目的标配，胜在极度顺手：\n1. 直接写原生 assert：不用背一堆 assertEqual / assertIn，失败时 pytest 会自动把表达式两边的实际值展开给你看；\n2. fixture（夹具）：用 @pytest.fixture 定义可复用的测试前置资源（比如临时数据库、测试客户端），测试函数只要把 fixture 名字写进形参里就会自动注入；\n3. 参数化测试 @pytest.mark.parametrize：把 10 组边界输入和期望结果写成一张表，自动生成 10 条独立用例，彻底告别复制粘贴。',
   code:`import pytest

def discount(price: float, vip: bool) -> float:
    return round(price * (0.8 if vip else 1.0), 2)

@pytest.mark.parametrize(
    "price, vip, expected",
    [(100, False, 100.0), (100, True, 80.0), (0, True, 0.0)],
)
def test_discount(price, vip, expected):
    assert discount(price, vip) == expected`,
   explain:[
    {at:'import pytest',text:'导入 pytest 测试框架。'},
    {at:'def discount(price: float, vip: bool) -> float:',to:'return round(price',text:'待测业务函数：VIP 打八折，非 VIP 原价，保留两位小数。'},
    {at:'@pytest.mark.parametrize(',to:'[(100, False, 100.0)',text:'参数化装饰器：声明三组测试输入与预期输出，pytest 会把它们拆成 3 条独立用例分别执行。'},
    {at:'def test_discount(price, vip, expected):',to:'assert discount(price, vip) == expected',text:'直接使用 Python 原生 assert 断言，哪一组失败就会清楚打印出具体入参和左右两边的值。'},
   ],
  },
  {
   title:'测试替身 unittest.mock：MagicMock 与 patch 的经典大坑',
   body:'好的单元测试应当快如闪电、结果稳定，不能因为连不上外部汇率接口或今天刚好是闰年就突然失败。标准库 unittest.mock 就是用来制造“测试替身”的：\n一、Mock 与 MagicMock：可以模拟任意对象和方法（MagicMock 还预先支持 __len__、__enter__ 等魔术方法，适合伪造 with 上下文管理器）。通过 return_value 固定返回值，用 side_effect 模拟抛出异常或依次返回多个值，最后用 assert_called_once_with(...) 确认被测函数确实按预期传了参；\n二、patch 最大的经典大坑——一定要打在“被使用处”，而不是“定义处”！\n假设 client.py 定义了 fetch_rate()，而 service.py 顶部写了 from client import fetch_rate。这一瞬间，service 模块就已经把函数引用抄了一份存成 service.fetch_rate！如果你去 patch("client.fetch_rate")，换掉的是 client 那边的名字，service 里的引用纹丝不动，测试照样会打真实网络！正确写法是 patch("service.fetch_rate")。\n反过来，如果 service.py 写的是 import client 然后调用 client.fetch_rate()，因为每次调用都在查 client 属性，这时才 patch("client.fetch_rate")。',
   code:`from unittest.mock import patch

# 假设 service.py 顶部是: from client import fetch_rate
with patch("service.fetch_rate", return_value=7.2) as mock_rate:
    amount = service.to_cny(10)
    assert amount == 72.0
    mock_rate.assert_called_once_with("USD")`,
   explain:[
    {at:'from unittest.mock import patch',text:'导入 patch 上下文管理器（也可用作装饰器），在作用域结束时自动还原被替换的对象。'},
    {at:'with patch("service.fetch_rate"',text:'关键原则：因为 service.py 通过 from import 绑定了本地名字，所以必须 patch 被使用处 "service.fetch_rate"。'},
    {at:'amount = service.to_cny(10)',to:'assert amount == 72.0',text:'调用业务逻辑时不会发真实请求，而是拿到替身返回的 7.2，验证换算结果正确。'},
    {at:'mock_rate.assert_called_once_with("USD")',text:'进一步断言依赖函数恰好被调用一次，且传入了正确币种参数。'},
   ],
  },
  {
   title:'动手试试：用 unittest 与 unittest.mock.patch 编写确定性单元测试',
   body:'现在用 Python 自带的 unittest 和 unittest.mock.patch 跑一套完全独立、不依赖网络的单元测试。为了让你清楚对照每一次运行结果，我们在代码里显式使用 TestLoader 和 TestResult 收集测试统计，只输出确定性的汇总行（避开默认报告里每次都会跳动的毫秒耗时）。',
   practice:{
    steps:[
     '新建文件 test_billing_demo.py，把下面的代码复制进去保存。',
     '在终端里运行 python test_billing_demo.py（Windows 可用 py test_billing_demo.py）。',
     '核对输出：2 条测试全部通过，真实 fetch_price 从未被触发。',
     '试着把 return_value=25 改成 return_value=30 再运行一次，看看失败数变成 1、全部通过变成 False，体会断言如何立刻抓出偏差。',
    ],
    expect:'运行用例数: 2\n失败与错误数: 0\n全部通过: True',
   },
   code:`import unittest
from unittest.mock import patch


def fetch_price(sku):
    raise RuntimeError(f"单元测试不应发起真实请求: {sku}")


def calc_total(sku, qty):
    if qty <= 0:
        raise ValueError("数量必须大于 0")
    return fetch_price(sku) * qty


class TestBilling(unittest.TestCase):
    def test_calc_total_with_mock(self):
        with patch(f"{__name__}.fetch_price", return_value=25) as mock_fetch:
            total = calc_total("book", 3)
            self.assertEqual(total, 75)
            mock_fetch.assert_called_once_with("book")

    def test_invalid_qty(self):
        with self.assertRaises(ValueError):
            calc_total("book", 0)


suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestBilling)
result = unittest.TestResult()
suite.run(result)
print("运行用例数:", result.testsRun)
print("失败与错误数:", len(result.failures) + len(result.errors))
print("全部通过:", result.wasSuccessful())`,
   explain:[
    {at:'import unittest',to:'from unittest.mock import patch',text:'导入标准库测试框架 unittest 和替换工具 patch。'},
    {at:'def fetch_price(sku):',to:'raise RuntimeError',text:'模拟外部查价接口：若没被 mock 拦截就直接抛错，确保测试绝不漏网访问外部依赖。'},
    {at:'def calc_total(sku, qty):',to:'return fetch_price(sku) * qty',text:'被测业务逻辑：先校验数量合法，再查单价乘以数量。'},
    {at:'class TestBilling(unittest.TestCase):',to:'mock_fetch.assert_called_once_with("book")',text:'第一条用例：在当前模块路径上 patch fetch_price 返回 25，断言总价为 75 且仅按 "book" 调用一次。'},
    {at:'def test_invalid_qty(self):',to:'calc_total("book", 0)',text:'第二条用例：用 assertRaises 验证非法数量 0 会准确抛出 ValueError。'},
    {at:'suite = unittest.defaultTestLoader',to:'suite.run(result)',text:'加载 TestBilling 里的全部测试方法并用 TestResult 收集执行结果。'},
    {at:'print("运行用例数:"',to:'print("全部通过:"',text:'输出确定性的用例统计结果，不含会随电脑速度变化的耗时数字。'},
   ],
  },
  {
   title:'现代 Python 代码质量工具链：ruff、mypy 与 CI 门禁',
   body:'一个人写脚本可以随心所欲，但项目进入多人协作和长期维护后，必须靠自动化工具守住底线。现代 Python 工程的工具链比过去精简高效得多：\n一、ruff（全能极速代码检查 + 格式化）：用 Rust 编写，速度比老工具快几十倍。以前项目里要同时配 flake8（静态规则检查）、isort（import 排序）、black（代码格式化）和 pyupgrade，现在只需一个 ruff check 加 ruff format 全包圆；\n二、mypy / pyright（静态类型检查）：Python 运行时不强制检查类型注解，靠它们在运行前就把“可能把 None 传给需要 str 的函数”“字典值类型对不上”这类隐藏 Bug 提前扫出来；\n三、统一配置与门禁：把工具规则都收进根目录的 pyproject.toml，本地配 pre-commit 在 git commit 前自动拦截低级错误，远端 CI（如 GitHub Actions）在每次 Pull Request 跑完 ruff、mypy 和 pytest 全部绿灯后才允许合并。',
   code:`[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
python_version = "3.12"
disallow_untyped_defs = true
strict_optional = true`,
   explain:[
    {at:'[tool.ruff]',to:'target-version = "py312"',text:'在 pyproject.toml 中配置 ruff 的单行最大长度与目标 Python 版本。'},
    {at:'[tool.ruff.lint]',to:'select = ["E", "F", "I", "UP", "B"]',text:'开启核心规则集：基础错误（E/F）、import 排序（I）、现代语法升级（UP）和常见 Bug 模式（B，bugbear）。'},
    {at:'[tool.mypy]',to:'strict_optional = true',text:'配置 mypy：要求函数写清类型注解（disallow_untyped_defs），并严格区分值与 None（strict_optional）。'},
   ],
  },
  {
   title:'性能剖析：先测量，再优化（timeit、cProfile、tracemalloc）',
   body:'性能优化界有一句黄金法则：不要凭感觉猜哪里慢，先拿数据测量！工程师凭直觉优化的“热点”，十有八九其实只占了不到 5% 的耗时。\nPython 标准库自带三件非常趁手的剖析利器：\n一、timeit（微基准对比）：用来精确比较两段小代码谁更快（比如命令行 python -m timeit），它会自动重复执行成千上万次并尽量剔除垃圾回收抖动；\n二、cProfile + pstats（CPU 热点定位）：记录程序里每个函数的调用次数（ncalls）、自身纯耗时（tottime，不含它调用的子函数）和累计总耗时（cumtime，包含子函数）。先按 cumtime 找最耗时的调用链，再按 tottime 锁定真正干重活的罪魁祸首；\n三、tracemalloc（内存增长与泄漏追踪）：记录每一块 Python 内存是在哪个文件哪一行分配的。对长跑服务隔一段时间拍两张快照 snap1、snap2，调用 snap2.compare_to(snap1, "lineno")，内存持续上涨的代码行立刻原形毕露。',
   code:`import cProfile
import pstats

def work():
    return sum(i * i for i in range(50_000))

profiler = cProfile.Profile()
profiler.enable()
work()
profiler.disable()

stats = pstats.Stats(profiler).sort_stats("cumtime")
stats.print_stats(5)`,
   explain:[
    {at:'import cProfile',to:'import pstats',text:'导入标准库确定性 CPU 剖析器 cProfile 和结果格式化工具 pstats。'},
    {at:'def work():',to:'return sum',text:'定义一个待剖析的函数。'},
    {at:'profiler = cProfile.Profile()',to:'profiler.disable()',text:'只对关心的代码区间开启和关闭采样，避免混入无关启动耗时。'},
    {at:'stats = pstats.Stats(profiler)',to:'stats.print_stats(5)',text:'按累计耗时 cumtime 倒序排列，只打印最耗时的前 5 个函数。'},
   ],
  },
  {
   title:'动手试试：用 tracemalloc 对比列表与生成器的内存峰值',
   body:'同样是求 0 到 99,999 的平方和，用方括号的列表推导式会先把十万个整数全部塞进内存再求和，而去掉方括号的生成器表达式是边算边扔、按需产出。我们用标准库 tracemalloc 测量两者的内存峰值，亲眼验证流式计算的巨大差距。',
   practice:{
    steps:[
     '新建文件 memory_profile_demo.py，把下面的代码复制进去保存。',
     '在终端里运行 python memory_profile_demo.py（Windows 可用 py memory_profile_demo.py）。',
     '核对输出：两种写法算出的总和完全相同，列表峰值超过 1MB，而生成器峰值不到列表的百分之一。',
     '如果想亲眼看具体字节数，可以临时加一行 print(list_peak, gen_peak) 观察本机实测数据，感受列表与生成器在内存上的悬殊差距。',
    ],
    expect:'计算结果一致: True\n列表峰值大于 1MB: True\n生成器峰值远小于列表: True',
   },
   code:`import tracemalloc

N = 100_000

tracemalloc.start()
list_total = sum([i * i for i in range(N)])
_, list_peak = tracemalloc.get_traced_memory()

tracemalloc.reset_peak()
gen_total = sum(i * i for i in range(N))
_, gen_peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print("计算结果一致:", list_total == gen_total)
print("列表峰值大于 1MB:", list_peak > 1_000_000)
print("生成器峰值远小于列表:", gen_peak * 100 < list_peak)`,
   explain:[
    {at:'import tracemalloc',text:'导入标准库内存分配追踪模块 tracemalloc。'},
    {at:'N = 100_000',text:'设定十万规模的数据量，让两种写法的内存峰值差距清晰显现。'},
    {at:'tracemalloc.start()',to:'_, list_peak = tracemalloc.get_traced_memory()',text:'开启追踪并计算列表推导式求和，通过 get_traced_memory() 取出该阶段的峰值字节数 list_peak。'},
    {at:'tracemalloc.reset_peak()',to:'tracemalloc.stop()',text:'重置峰值统计再测生成器表达式求和，取出峰值 gen_peak 后停止追踪；由于边产生边累加，不需要整张列表驻留内存。'},
    {at:'print("计算结果一致:"',to:'print("生成器峰值远小于列表:"',text:'用确定性的布尔断言对比计算等价性与百倍以上的内存峰值差距。'},
   ],
  },
  {
   title:'Python 高频性能优化手法',
   body:'用剖析器定位到真正的热点后，以下五招在 Python 项目里性价比最高，往往改几行就能换来几倍到几十倍提速：\n一、选对数据结构（算法级收益最大）：成员存在性判断（x in pool）用 set 或 dict（平均 O(1)）取代 list（O(n)）；头部出队入队用 collections.deque 取代 list.pop(0)；\n二、批量字符串拼接用 "".join(parts)：字符串不可变，循环里频繁 s += chunk 会引发反复复制；"".join 会先算出总长度，一次分配完内存，复杂度稳稳 O(n)；\n三、减少热点循环内的属性与全局查找：访问局部变量（LOAD_FAST）比查全局或对象属性（LOAD_GLOBAL / LOAD_ATTR）快得多。把循环内重复用的方法先绑成局部变量（或直接改写为列表推导式交给 C 层循环），能省下大量字节码开销；\n四、大数据流式处理：读大文件直接 for line in f: 逐行迭代，不要一口气 f.readlines() 把内存撑爆；\n五、计算密集下沉原生层：矩阵与表格计算交给 NumPy / Polars，定制热点算法交给 Cython 或 Rust（PyO3）；I/O 密集则用 asyncio 并发。',
   code:`# 坏写法：每次 in 都线性扫描 list，整体 O(n * m)
# hits = [uid for uid in users if uid in blacklist_list]

# 好写法：先转 set，成员查找平均 O(1)
blacklist = set(blacklist_list)
hits = [uid for uid in users if uid in blacklist]

# 批量拼接字符串：一次分配完成
report = "\\n".join(f"hit:{uid}" for uid in hits)`,
   explain:[
    {at:'blacklist = set(blacklist_list)',text:'把黑名单一次性转成哈希集合 set，建立 O(1) 查找表。'},
    {at:'hits = [uid for uid in users',text:'用列表推导式过滤用户，每次成员判断平均只需 O(1)，整体复杂度从 O(n*m) 降到 O(n+m)。'},
    {at:'report = "\\n".join',text:'把生成器直接传给 "\\n".join()，避免循环中用 += 反复复制字符串。'},
   ],
  },
  {
   title:'动手试试：验证 "".join 拼接与 set 查找的等价优化',
   body:'优化代码的第一前提是“结果完全等价”。我们用一小段脚本同时验证两类最高频的 Python 优化：用 "-".join() 替代循环 += 拼接字符串，以及用 set 替代 list 做 VIP 名单过滤，确认它们在保持顺序和输出上完全一致。',
   practice:{
    steps:[
     '新建文件 perf_patterns_demo.py，复制下面代码并保存。',
     '在终端里运行 python perf_patterns_demo.py（Windows 可用 py perf_patterns_demo.py）。',
     '核对输出，确认两种拼接方式和两种查找过滤方式的结果完全一致。',
     '进阶挑战：试着在终端里用 python -m timeit 对比把 vip_list 扩充到 10000 条时，list 查找和 set 查找各自耗时差多少倍！',
    ],
    expect:'拼接结果: py-thon-3-13\njoin 与循环拼接结果一致: True\n命中的 VIP: [\'u2\', \'u5\']\n集合查找与列表查找结果一致: True',
   },
   code:`tokens = ["py", "thon", "3", "13"]

slow_joined = ""
for i, tok in enumerate(tokens):
    if i > 0:
        slow_joined += "-"
    slow_joined += tok

fast_joined = "-".join(tokens)
print("拼接结果:", fast_joined)
print("join 与循环拼接结果一致:", slow_joined == fast_joined)

ids = ["u1", "u2", "u3", "u4", "u5"]
vip_list = ["u2", "u5", "u9"]
vip_set = set(vip_list)

by_list = [uid for uid in ids if uid in vip_list]
by_set = [uid for uid in ids if uid in vip_set]
print("命中的 VIP:", by_set)
print("集合查找与列表查找结果一致:", by_list == by_set)`,
   explain:[
    {at:'tokens = ["py", "thon", "3", "13"]',text:'准备待拼接的字符串片段列表。'},
    {at:'slow_joined = ""',to:'slow_joined += tok',text:'传统的循环 += 拼接写法，数据量大时会反复产生中间字符串对象。'},
    {at:'fast_joined = "-".join(tokens)',to:'print("join 与循环拼接结果一致:"',text:'用 "-".join() 一次计算总长度并分配内存，既更简洁又更快，且结果完全等价。'},
    {at:'ids = ["u1"',to:'vip_set = set(vip_list)',text:'准备待筛用户列表以及列表版、集合版两份 VIP 名单。'},
    {at:'by_list = [uid for uid in ids',to:'by_set = [uid for uid in ids',text:'按原始 ids 顺序遍历，分别从 list 和 set 里做成员存在性判断；既保留了顺序，又把内层查找降到平均 O(1)。'},
    {at:'print("命中的 VIP:"',to:'print("集合查找与列表查找结果一致:"',text:'验证两种过滤方式输出的 VIP 列表一模一样。'},
   ],
  },
  {
   title:'Python Web 服务架构与容器部署',
   body:'代码在本地跑通后，怎么稳稳地交付到线上服务成千上万的用户？先分清 Python Web 世界的两代服务器协议：\n一、WSGI（同步网关接口）：一个请求占住一个线程或进程直到返回响应，代表组合是 Gunicorn + Flask / Django，生态成熟、心智简单，非常适合常规同步数据库业务；\n二、ASGI（异步网关接口）：原生支持 async / await 协程、WebSocket 和 SSE 流式输出，代表组合是 Uvicorn（生产常配 Gunicorn 托管多个 UvicornWorker）+ FastAPI + Pydantic，在高并发 I/O 和大模型流式接口场景吞吐优势明显。\n生产部署还有三条硬规范：\n一、多 Worker 进程 + 反向代理：绝不要把开发服务器（如 app.run(debug=True)）直接裸奔上线！用多进程 Worker 绕开单进程 GIL 吃满多核，前面挡一层 Nginx 或云负载均衡负责 HTTPS 终结、限流和缓冲慢客户端；\n二、锁定精确依赖版本：使用 uv.lock / poetry.lock 或锁定哈希的 requirements.txt，确保测试环境和生产环境装出的依赖一字节不差；\n三、容器瘦身与最小权限：用 Docker 多阶段构建——构建阶段装编译器打好虚拟环境，运行阶段只把虚拟环境和代码拷进精简 slim 镜像，并切换到非 root 用户运行服务。',
   code:`FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
RUN useradd --create-home appuser
COPY --from=builder /opt/venv /opt/venv
COPY app ./app
ENV PATH="/opt/venv/bin:$PATH"
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`,
   explain:[
    {at:'FROM python:3.12-slim AS builder',to:'RUN python -m venv',text:'第一阶段（构建阶段）：在独立虚拟环境 /opt/venv 中安装依赖，不污染最终镜像的缓存层。'},
    {at:'FROM python:3.12-slim',to:'RUN useradd --create-home appuser',text:'第二阶段（运行阶段）：从干净的 slim 基础镜像起步，创建一个低权限的普通用户 appuser。'},
    {at:'COPY --from=builder /opt/venv /opt/venv',to:'ENV PATH="/opt/venv/bin:$PATH"',text:'只把构建好的虚拟环境和业务代码拷贝进来，并把虚拟环境加入 PATH。'},
    {at:'USER appuser',to:'CMD ["uvicorn"',text:'以非 root 用户身份启动 4 个多进程 Worker 运行 ASGI 服务，兼顾多核吞吐与容器安全。'},
   ],
  },
  {
   title:'生产上线检查清单：可观测、稳定性与安全',
   body:'写完最后一个接口，离真正安心上线还差一份“防半夜报警”的生产检查清单：\n一、结构化日志而非 print：用标准库 logging（或 structlog）向标准输出打印结构化 JSON 日志，每条带上时间戳、日志级别、request_id 和错误堆栈，方便接入 ELK / Loki 检索告警；\n二、敏感配置与密钥管理：数据库密码、JWT 密钥、第三方 API Key 一律通过环境变量或密钥管理服务注入（可用 pydantic-settings 在启动时立刻校验缺失项），绝不能硬编码进源码或提交到 Git；\n三、超时、重试与限流：所有对外网络调用（如 requests.get / httpx / 数据库连接）都必须显式传入 timeout，否则对端卡死会拖垮全部 Worker；只有幂等操作才配置带退避抖动的有限重试；\n四、优雅关闭（Graceful Shutdown）：容器滚动发布时会先发 SIGTERM 信号，服务要能停止接收新连接、等手里正在处理的请求安全返回并关闭数据库连接池后再退出，实现零报错发版；\n五、健康检查接口：对外暴露存活探针 /healthz（确认进程没卡死）与就绪探针 /readyz（确认数据库、缓存等核心依赖已连通，可以接流量），让负载均衡和 Kubernetes 能自动摘除故障节点。',
  },
 ],
 quiz:[
  {
   id:'py-engineering-1',
   q:'service.py 顶部写了 from api import get_rate，单元测试想用 unittest.mock.patch 替换它，目标路径应写？',
   options:[
    'api.get_rate，因为函数最初在 api 中定义',
    'service.get_rate，替换被使用处的本地引用',
    'unittest.get_rate，挂到测试框架的命名空间',
    'builtins.get_rate，直接覆盖全局内置函数表',
   ],
   why:[
    'from api import get_rate 已在 service 模块里创建了独立绑定，只改 api.get_rate 不会影响 service。',
    '',
    '被测代码并不会去 unittest 模块里查找 get_rate。',
    'get_rate 不是 Python 内置函数，写入 builtins 无法拦截 service 的局部引用。',
   ],
   answer:1,
   explain:'mock.patch 的核心法则是“patch 在查找使用处，而非定义处”：from import 绑定了新名字，因此必须 patch service.get_rate。',
  },
  {
   id:'py-engineering-2',
   q:'现代 Python 工程里，哪款 Rust 编写的极速工具可以一把替代 flake8、isort 和 black？',
   options:[
    'pytest，用于执行单元测试与参数化断言',
    'gunicorn，用于托管多进程同步 Web 服务',
    'poetry，用于解析包依赖并生成锁定文件',
    'ruff，同时提供极速代码检查与格式化',
   ],
   why:[
    'pytest 是测试运行器，不负责代码风格检查与格式化。',
    'gunicorn 是 WSGI HTTP 服务器，用于部署运行服务。',
    'poetry 主要用于依赖与打包管理，而非 linter/formatter。',
    '',
   ],
   answer:3,
   explain:'ruff 用 Rust 实现，以极快速度集成 lint 检查（ruff check）、import 排序和格式化（ruff format），大幅简化配置。',
  },
  {
   id:'py-engineering-3',
   type:'multi',
   q:'关于标准库性能剖析工具 cProfile 与 tracemalloc 的分工，哪些说法正确？（多选）',
   options:[
    'cProfile 用于统计函数调用次数与 CPU 热点耗时',
    'cProfile 会自动把慢速函数改写成 C 语言扩展',
    'tracemalloc 可对比快照定位内存分配增长的代码行',
    'tracemalloc 专门用于检测多线程死锁与竞态条件',
   ],
   why:[
    '',
    'cProfile 只是测量与统计工具，不会自动改写或编译你的代码。',
    '',
    'tracemalloc 追踪的是 Python 内存分配栈，不负责排查线程死锁。',
   ],
   answers:[0,2],
   explain:'先测量再优化：排查 CPU 慢用 cProfile + pstats 找热点函数，排查内存涨用 tracemalloc 对比快照定位分配行号。',
  },
  {
   id:'py-engineering-4',
   type:'judge',
   q:'在 pytest 中，可以直接使用 Python 原生 assert 语句编写断言，失败时框架会自动展示两边表达式的实际值。',
   answer:true,
   explain:'pytest 通过断言重写机制增强了原生 assert，无需记忆大量 assertEqual 风格方法，报错信息依然清晰详细。',
  },
  {
   id:'py-engineering-5',
   q:'需要对一份 10 万条用户 ID 名单做高频成员存在性判断（uid in allowlist），最直接高效的优化是？',
   options:[
    '先把名单转为 set，把成员查找降为平均 O(1)',
    '把名单复制到元组 tuple，加快逐个顺序扫描',
    '把名单全部拼成长字符串，再用子串 in 判断',
    '在循环里每次先把名单排序，再从头开始遍历',
   ],
   why:[
    '',
    'tuple 成员查找依然是 O(n) 线性扫描，无法解决量级瓶颈。',
    '拼成长字符串不仅是 O(n) 匹配，还会把短 ID 误匹配进长 ID 里导致逻辑错误。',
    '每次循环重新排序反而把复杂度恶化到 O(n log n) 以上。',
   ],
   answer:0,
   explain:'将列表转换为哈希集合 set 后，成员判断从 O(n) 降为平均 O(1)，在高频查询场景下性能提升可达数百上千倍。',
  },
  {
   id:'py-engineering-6',
   type:'fill',
   q:'在 pytest 中，装饰器 @pytest.mark.＿ 可以把多组输入与期望结果批量注入同一个测试函数，自动生成多条参数化用例。',
   accepted:['parametrize'],
   explain:'@pytest.mark.parametrize 用来编写表驱动测试，减少重复样板代码，并且每组参数都会作为独立用例报告通过或失败。',
  },
  {
   id:'py-engineering-7',
   q:'相比传统同步 WSGI，Python 的 ASGI 网关协议最核心的增强能力是什么？',
   options:[
    '让纯 Python 数值循环自动释放 GIL 跑满多核',
    '免去反向代理，直接内置全局分布式数据库',
    '原生支持 async/await 异步并发与 WebSocket 长连接',
    '把所有同步阻塞数据库驱动自动变成异步非阻塞',
   ],
   why:[
    'ASGI 是 Web 服务器与应用间的异步通信协议，并不会改变 CPython 数值循环的 GIL 机制。',
    'ASGI 不包含数据库，生产环境前面依然建议配置反向代理或负载均衡。',
    '',
    '同步阻塞驱动在异步事件循环里直接调用反而会卡住整个循环，必须换用异步驱动或放进线程池。',
   ],
   answer:2,
   explain:'ASGI（Asynchronous Server Gateway Interface）是 WSGI 的异步继承者，支持协程高并发 I/O、WebSocket 及流式响应。',
  },
  {
   id:'py-engineering-8',
   type:'judge',
   q:'使用 requests.get(url) 请求外部第三方接口时，不传 timeout 参数会自动在 30 秒后超时返回，不会卡死工作进程。',
   answer:false,
   explain:'requests 默认没有超时限制，一旦对端网络挂起，当前 Worker 线程或进程可能无限期阻塞，生产代码必须显式传入 timeout。',
  },
  {
   id:'py-engineering-9',
   q:'用 cProfile 分析函数耗时报告时，tottime 与 cumtime 两列指标的区别是？',
   options:[
    'tottime 统计内存字节数，cumtime 统计磁盘读写',
    'tottime 不含子函数耗时，cumtime 包含子函数总耗时',
    'tottime 只记录首次调用，cumtime 记录最后一次调用',
    'tottime 是理论估算值，cumtime 是线上采样预测值',
   ],
   why:[
    'cProfile 统计的是时间与调用次数，不是内存或磁盘读写量。',
    '',
    '两列都会累计所有调用次数，区别在于是否把内部子调用的时间算进去。',
    'cProfile 属于确定性剖析器，两列都是本次运行的实际测量时间。',
   ],
   answer:1,
   explain:'排查瓶颈时，cumtime 帮你顺藤摸瓜找到最慢的业务入口，tottime 帮你锁定真正消耗 CPU 的叶子函数。',
  },
  {
   id:'py-engineering-10',
   type:'multi',
   q:'将 Python Web 服务部署到生产环境时，哪些做法属于稳健的工程实践？（多选）',
   options:[
    '启用多 Worker 进程并前置反向代理处理流量',
    '通过环境变量或密钥服务注入敏感配置而非硬编码',
    '线上开启 debug=True 自动重载方便实时看报错栈',
    '监听 SIGTERM 信号，等在途请求处理完再优雅退出',
   ],
   why:[
    '',
    '',
    '生产环境开启 debug=True 不仅性能差，还可能暴露源码、环境变量甚至交互式调试器造成严重安全风险。',
    '',
   ],
   answers:[0,1,3],
   explain:'多进程绕开单核限制、环境变量管密钥、优雅关闭防发版丢请求，以及关闭 debug 模式，都是线上服务的必备底线。',
  },
  {
   id:'py-engineering-11',
   type:'short',
   q:'线上一个 Python Web 服务最近响应越来越慢且内存持续上涨，请给出从问题定位到优化验证的完整排查思路及对应工具。',
   reference:'坚持先测量再优化，分两条线排查：一、CPU 与慢响应定位：先通过结构化日志和监控区分是外部 I/O 慢（数据库、第三方 API 缺超时或 N+1 查询）还是本机 CPU 热点；若为本机计算瓶颈，在压测或复现环境使用 cProfile + pstats（或线上低开销采样器 py-spy）按 cumtime 和 tottime 锁定热点函数，再针对性采用 set/dict 降复杂度、"".join()、生成器或向量化优化。二、内存持续上涨定位：启用 tracemalloc 间隔采集多个内存快照并 compare_to 对比增量分配行号，结合 gc 检查是否存在未清理的全局缓存、循环引用或一次性加载大文件；缓存改用带上限的 LRU 或 weakref，大文件改流式迭代。最后在压测环境复测响应延迟与内存曲线，验证回归不反弹。',
   points:[
    '坚持先测量再优化，先区分外部 I/O 阻塞与本机 CPU 瓶颈',
    '使用 cProfile + pstats（或采样剖析器）定位 CPU 热点函数',
    '使用 tracemalloc 对比前后快照定位内存持续增长的代码行与泄漏源（如无界缓存、循环引用）',
    '给出对应优化手段（数据结构、流式处理、有界缓存/weakref）并复测验证效果',
   ],
   explain:'实战高频架构题，重在展示“监控日志分层 → CPU/内存工具实证 → 针对性改动 → 数据复验”的闭环工程方法。',
  },
  {
   id:'py-engineering-12',
   type:'code',
   q:'已知当前模块中有 get_discount(user_id) 和 final_price(user_id, price)（后者返回 price * get_discount(user_id)）。请使用 unittest 和 unittest.mock.patch 编写一个测试类，确保不触发真实 get_discount，将其固定返回 0.8，断言 final_price(42, 100) 等于 80.0，且 get_discount 仅以参数 42 被调用一次。',
   reference:'import unittest\nfrom unittest.mock import patch\n\ndef get_discount(user_id: int) -> float:\n    raise RuntimeError("不应调用真实折扣服务")\n\ndef final_price(user_id: int, price: float) -> float:\n    return price * get_discount(user_id)\n\nclass TestFinalPrice(unittest.TestCase):\n    def test_apply_discount(self):\n        with patch(f"{__name__}.get_discount", return_value=0.8) as mock_get:\n            result = final_price(42, 100)\n            self.assertAlmostEqual(result, 80.0)\n            mock_get.assert_called_once_with(42)',
   points:[
    '继承 unittest.TestCase 编写测试类与 test_ 开头的方法',
    '在当前模块使用处正确 patch get_discount 并设置 return_value=0.8',
    '调用 final_price(42, 100) 并断言结果等于 80.0（assertEqual 或 assertAlmostEqual）',
    '使用 assert_called_once_with(42) 验证依赖调用次数与参数',
   ],
   explain:'使用 patch 隔离外部依赖后，既验证返回值正确，也验证了函数间的调用契约。',
  },
 ],
};
