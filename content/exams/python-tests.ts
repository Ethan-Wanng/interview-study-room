import type {AiQuiz} from '../journey';

// Python 阶段考试一（入门 + 进阶，L1–L9）：环境与基本类型、控制流、容器与推导式、函数与闭包、面向对象、异常与上下文管理器、模块与包、迭代器与生成器、装饰器与类型注解。
export const pythonStage1:AiQuiz[]=[
 {
  id:'py-e1-1',
  q:'下面这段 Python 代码运行后的输出是什么？',
  code:'grid = [[0] * 2] * 3\ngrid[0][1] = 9\ngrid[1] = [7, 8]\nprint(grid)',
  options:[
   '[[0, 9], [7, 8], [0, 0]]',
   '[[0, 9], [7, 8], [0, 9]]',
   '[[0, 9], [0, 9], [0, 9]]',
   '[[7, 8], [7, 8], [7, 8]]'
  ],
  why:[
   '外层列表用 * 3 复制了三个指向同一内层列表的引用，修改 grid[0][1] 会同步体现在 grid[2] 中。',
   '',
   'grid[1] = [7, 8] 把索引 1 重新绑定到了全新的列表对象，不会保持为 [0, 9]。',
   '给 grid[1] 重新赋值只改变外层列表索引 1 的引用指向，不会覆盖索引 0 和索引 2。'
  ],
  answer:1,
  explain:'[[0] * 2] * 3 创建的外层列表包含 3 个指向同一个内层列表对象的引用。grid[0][1] = 9 原地修改该共享子列表，使索引 0、1、2 都看到 [0, 9]；随后 grid[1] = [7, 8] 仅将外层索引 1 重新绑定到新列表，故最终为 [[0, 9], [7, 8], [0, 9]]。'
 },
 {
  id:'py-e1-2',
  q:'下面这段包含海象运算符（:=）和 for-else 的代码，运行后输出什么？',
  code:'nums = [2, 4, 7, 8]\nfor x in nums:\n    if (half := x // 2) > 4:\n        print("hit", half)\n        break\nelse:\n    print("done", half)',
  options:[
   '输出 hit 4',
   '输出 done 4',
   '输出 done 3',
   '报 NameError'
  ],
  why:[
   'nums 中最大元素是 8，8 // 2 等于 4，不满足 > 4，因此循环内不会触发 break。',
   '',
   '循环会遍历到最后一个元素 8，最后一轮计算的 half 是 8 // 2 = 4，而不是 7 // 2 = 3。',
   'for 循环与海象运算符绑定的变量属于当前外层作用域，在 else 分支中可以正常访问 half。'
  ],
  answer:1,
  explain:'for-else 的 else 子句在循环正常走完且未遇到 break 时执行。遍历完 [2, 4, 7, 8] 时没有任何元素满足 x // 2 > 4，最后一轮 x = 8 将 half 赋值为 4，随后进入 else 打印 done 4。'
 },
 {
  id:'py-e1-3',
  q:'下面代码运行后的输出结果是什么？',
  code:'def make_adders():\n    return [lambda x: x + i for i in range(3)]\n\nfns = make_adders()\nprint([f(10) for f in fns])',
  options:[
   '[10, 11, 12]',
   '[11, 12, 13]',
   '[10, 10, 10]',
   '[12, 12, 12]'
  ],
  why:[
   '闭包捕获的是变量 i 的引用而非创建当刻的值，要想得到 [10, 11, 12] 需要写成 lambda x, i=i: x + i。',
   'range(3) 生成的是 0、1、2，并且由于迟绑定特性，三个函数都会读取循环结束时的 i。',
   '循环结束时 i 的最终值是 2 而不是 0，所以每个函数计算的都是 10 + 2。',
   ''
  ],
  answer:3,
  explain:'Python 闭包对自由变量采用迟绑定（late binding），lambda 内部引用的 i 在函数被调用时才去外层列表推导式作用域查找；此时循环已结束，i 停留在 2，故三次调用均返回 12。'
 },
 {
  id:'py-e1-4',
  q:'在下面这段多重继承代码中，实例化 D() 时的打印顺序是？',
  code:'class A:\n    def __init__(self):\n        print("A", end=" ")\n\nclass B(A):\n    def __init__(self):\n        print("B", end=" ")\n        super().__init__()\n\nclass C(A):\n    def __init__(self):\n        print("C", end=" ")\n        super().__init__()\n\nclass D(B, C):\n    def __init__(self):\n        print("D", end=" ")\n        super().__init__()\n\nD()',
  options:[
   'D B C A',
   'D B A C A',
   'D B A',
   'A B C D'
  ],
  why:[
   '',
   'super() 按照 D 的 MRO 线性化链表依次推进，公共基类 A 在链路末端只会被调用一次。',
   'B.__init__ 中的 super() 会分发给 MRO 里紧随 B 之后的 C，而不会跳过 C 直接去调 A。',
   'print 语句都写在各自 super().__init__() 调用之前，因此会先打印子类名称再向后传递。'
  ],
  answer:0,
  explain:'D 的方法解析顺序（MRO）为 [D, B, C, A, object]。每个类的 __init__ 先打印自身名字再调用 super().__init__()，因此沿 MRO 链依次输出 D B C A。'
 },
 {
  id:'py-e1-5',
  q:'下面这个函数调用 task(0) 和 task(2) 组成的元组 (task(0), task(2)) 结果是什么？',
  code:'def task(n):\n    res = []\n    try:\n        res.append(10 // n)\n    except ZeroDivisionError:\n        res.append(-1)\n    else:\n        res.append(1)\n    finally:\n        res.append(9)\n    return res',
  options:[
   '([-1, 1, 9], [5, 1, 9])',
   '([-1, 9], [5, 9])',
   '([-1, 9], [5, 1, 9])',
   '([-1], [5, 1, 9])'
  ],
  why:[
   'try 块抛出异常进入 except 后，else 子句不会执行，所以 task(0) 里不会追加 1。',
   '当 try 块没有抛出异常时，else 子句会正常执行，因此 task(2) 会依次追加 5、1 和 9。',
   '',
   '无论 try 块是否抛出异常，finally 子句都会在离开前执行，因此 task(0) 末尾同样会追加 9。'
  ],
  answer:2,
  explain:'try-except-else-finally 中，else 仅在 try 未抛出异常时运行，finally 在两种情况下都会运行：task(0) 触发除零进入 except 和 finally 得 [-1, 9]；task(2) 走 try、else 和 finally 得 [5, 1, 9]。'
 },
 {
  id:'py-e1-6',
  q:'假设 config.py 中定义了 timeout = 5 和 retry = [1, 2]。另一模块执行 from config import timeout, retry 后，在本地运行 timeout = 30 与 retry.append(3)，此时 config 模块内部的真实状态是？',
  options:[
   'config.timeout 变为 30，config.retry 变为 [1, 2, 3]',
   'config.timeout 仍为 5，config.retry 变为 [1, 2, 3]',
   'config.timeout 变为 30，config.retry 仍为 [1, 2]',
   'config.timeout 仍为 5，config.retry 仍为 [1, 2]'
  ],
  why:[
   'from config import timeout 只是在当前模块命名空间创建了一个指向整数 5 的本地变量，对它重新赋值不会改动 config 模块的属性。',
   '',
   'retry.append(3) 是对同一个共享列表对象做原地修改，而 timeout = 30 只是重绑定当前模块的局部名字。',
   'retry 指向的是可变列表对象，未发生重绑定而是调用了 append 原地变更，config.retry 会同步看到新增的 3。'
  ],
  answer:1,
  explain:'from module import name 会把对象引用复制到当前模块命名空间。对不可变整数执行 timeout = 30 只重绑定本地名字；对可变列表调用 retry.append(3) 则原地修改了共享对象。'
 },
 {
  id:'py-e1-7',
  q:'下面这段关于迭代器配对的代码，运行后输出什么？',
  code:'it = iter([10, 20, 30, 40])\npairs = list(zip(it, it))\nrest = list(it)\nprint(pairs, rest)',
  options:[
   '[(10, 20), (30, 40)] []',
   '[(10, 10), (20, 20), (30, 30), (40, 40)] []',
   '[(10, 20), (30, 40)] [10, 20, 30, 40]',
   '[(10, 10), (20, 20)] [30, 40]'
  ],
  why:[
   '',
   'zip 的两个参数传入的是同一个迭代器对象 it，每次拉取第一个元素和第二个元素都会推进同一游标。',
   '迭代器是一次性消耗品，被 list(zip(it, it)) 取完所有元素后，再次调用 list(it) 只会得到空列表。',
   '同一迭代器每次调用 next(it) 都会向前移动一步，因此配对出来的是相邻元素 (10, 20) 和 (30, 40)。'
  ],
  answer:0,
  explain:'it 是单个列表迭代器，zip(it, it) 每轮先从第一个参数调用 next(it) 拿到 10，再从第二个参数调用 next(it) 拿到 20，依次组成 [(10, 20), (30, 40)]，此时迭代器已耗尽，rest 为 []。'
 },
 {
  id:'py-e1-8',
  q:'当一个函数同时叠加两个装饰器时，下面代码的输出是什么？',
  code:'def wrap_a(fn):\n    return lambda s: f"A({fn(s)})"\n\ndef wrap_b(fn):\n    return lambda s: f"B({fn(s)})"\n\n@wrap_a\n@wrap_b\ndef greet(name):\n    return name\n\nprint(greet("py"))',
  options:[
   'B(A(py))',
   'A(py) B(py)',
   'py(B(A))',
   'A(B(py))'
  ],
  why:[
   '@wrap_a 写在最外层，等价于 greet = wrap_a(wrap_b(greet))，调用时外层 A 包裹内层 B 的结果。',
   '装饰器是逐层嵌套包装原函数，而不是把两个装饰器分别独立执行后再拼接字符串。',
   'greet("py") 返回的是字符串 "py"，随后由内层 wrap_b 和外层 wrap_a 依次在外部包裹。',
   ''
  ],
  answer:3,
  explain:'多层装饰器 @wrap_a 叠加在 @wrap_b 之上，等价于 greet = wrap_a(wrap_b(greet))。装饰阶段自下而上包装，调用阶段自外向内执行：wrap_a 先运行并调用 wrap_b(greet)("py")，最终得到 A(B(py))。'
 },
 {
  id:'py-e1-9',
  type:'multi',
  q:'关于 Python 的字典（dict）与集合（set），下面哪些说法是正确的？（多选）',
  options:[
   'dict.keys() 返回的是动态视图对象，原字典新增键后通过该视图可直接观察到变化',
   '只包含整数和字符串的元组 (1, "a") 是可哈希的，可以作为 dict 的键或放入 set',
   '创建空集合和空字典都可以直接写成字面量 {}，解释器会根据后续方法调用自动区分',
   'Python 3.7+ 语言规范正式保证了普通 dict 会保留键值对的插入先后顺序'
  ],
  why:[
   '',
   '',
   '字面量 {} 创建的是空字典 dict，创建空集合必须显式调用 set()。',
   ''
  ],
  answers:[0,1,3],
  explain:'dict.keys()/values()/items() 返回动态字典视图；不可变且内部元素均不可变的元组可哈希；Python 3.7+ 正式保证 dict 按插入顺序保存；而空集合只能用 set() 表示。'
 },
 {
  id:'py-e1-10',
  type:'multi',
  q:'对于函数签名 def connect(host, port=5432, /, *, timeout=3, **extra):，下面哪些调用方式或说法是正确的？（多选）',
  options:[
   '调用 connect(host="localhost", timeout=5) 完全合法，host 既可按位置也可按关键字传入',
   '参数列表中的 / 表示其左侧的 host 和 port 都属于仅限位置参数（Positional-Only）',
   '调用 connect("db.internal", 3306, timeout=10, ssl=True) 合法，ssl 会进入 extra 字典',
   '参数列表中的 * 表示 timeout 可以按位置传入，只要它在 port 之后即可'
  ],
  why:[
   'host 位于 / 左侧，属于仅限位置参数，写成关键字参数 host="localhost" 会直接抛出 TypeError。',
   '',
   '',
   '单独的 * 之后的参数属于仅限关键字参数（Keyword-Only），timeout 在调用时必须显式写成 timeout=...。'
  ],
  answers:[1,2],
  explain:'/ 左侧的参数仅限按位置传递，* 右侧的普通命名参数仅限按关键字传递，未匹配的额外关键字参数会被收集进 **extra 字典。'
 },
 {
  id:'py-e1-11',
  type:'multi',
  q:'关于 Python 面向对象中的 @dataclass、@property 与 @classmethod，下面哪些说法正确？（多选）',
  options:[
   '@dataclass 会根据类属性上的类型注解自动生成 __init__、__repr__ 和 __eq__ 等方法',
   '在 @dataclass 中若某字段默认值是列表，应使用 field(default_factory=list) 避免实例共享同一列表',
   '@classmethod 的第一个参数通常命名为 cls，在子类上调用时 cls 会自动绑定为该子类',
   '@property 允许把方法伪装成属性访问，配合 @x.setter 可以在赋值时增加校验逻辑'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'四个选项全部正确：@dataclass 自动合成常用样板方法，并对可变默认值强制要求使用 default_factory；@classmethod 支持多态工厂构造；@property 实现受控属性读写。'
 },
 {
  id:'py-e1-12',
  type:'multi',
  q:'关于 Python 的异常处理、with 上下文管理器以及模块导入机制，下面哪些说法正确？（多选）',
  options:[
   '使用 with open(...) as f: 打开文件时，即使代码块中途抛出异常，离开块时也会自动关闭文件',
   '在 except Exception as e: 块中，直接写 raise new_err 与写 raise new_err from None 的异常链输出相同',
   '同一个进程内多次执行 import math，后续导入会直接从 sys.modules 缓存字典中复用已加载的模块对象',
   '自定义类只要正确实现了 __enter__ 和 __exit__ 两个魔术方法，就可以配合 with 语句使用'
  ],
  why:[
   '',
   '直接写 raise new_err 会保留隐式上下文 __context__ 并打印 During handling of the above exception，而 from None 会显式抑制原异常上下文。',
   '',
   ''
  ],
  answers:[0,2,3],
  explain:'with 语句通过上下文管理协议（__enter__/__exit__）保证资源释放；sys.modules 缓存已导入模块避免重复执行模块顶层代码；raise ... from None 则用于屏蔽外层不想暴露的底层异常链。'
 },
 {
  id:'py-e1-13',
  type:'multi',
  q:'关于生成器、装饰器以及 typing 类型注解体系，下面哪些说法正确？（多选）',
  options:[
   '生成器表达式按需惰性产出元素，在处理大规模数据流时比同等列表推导式更节省内存',
   '在编写装饰器时不加 @functools.wraps(fn) 会导致包装后的函数无法正常接收位置参数和关键字参数',
   '在生成器函数内部遇到 return value 时会直接把 value 作为最后一次 next() 调用的普通元素返回',
   'typing.Protocol 支持结构化子类型（静态鸭子类型），实现类无需显式继承该 Protocol 即可通过静态类型检查'
  ],
  why:[
   '',
   '能否接收任意参数取决于包装函数是否定义为 def wrapper(*args, **kwargs):，@wraps 的作用是复制 __name__、__doc__ 等元数据。',
   '生成器函数里的 return value 会触发 StopIteration(value) 异常并将 value 放在异常对象的 value 属性上，而不是作为普通产出值返回。',
   ''
  ],
  answers:[0,3],
  explain:'生成器表达式惰性求值、内存开销为 O(1)；typing.Protocol 提供结构化子类型检查；@wraps 负责同步被装饰函数的元信息；生成器中的 return 会抛出带返回值的 StopIteration。'
 },
 {
  id:'py-e1-14',
  type:'judge',
  q:'在使用 for k in d: 遍历字典 d 的过程中，如果直接在循环体内对 d 新增或删除键，Python 会在运行时抛出 RuntimeError: dictionary changed size during iteration。',
  answer:true,
  explain:'字典在迭代期间禁止改变键集合的大小，否则迭代器检测到结构版本变化会立即抛出 RuntimeError；若需边遍历边删改，可先拷贝一份 list(d.keys())。'
 },
 {
  id:'py-e1-15',
  type:'judge',
  q:'在嵌套函数中，只要内层函数需要读取外层函数定义的局部变量（不做任何赋值修改），就必须先写 nonlocal 声明，否则会报 UnboundLocalError。',
  answer:false,
  explain:'仅读取外层作用域变量时会按 LEGB 规则直接向上查找，无需声明 nonlocal；只有当内层函数试图对该变量名重新赋值绑定时，才需要用 nonlocal 显式声明。'
 },
 {
  id:'py-e1-16',
  type:'judge',
  q:'使用 @contextlib.contextmanager 编写基于生成器的上下文管理器时，如果 with 代码块内抛出了未捕获异常，生成器会在 yield 处收到该异常，因此清理代码应放在 try...finally 的 finally 块中。',
  answer:true,
  explain:'contextmanager 在 with 块抛异常时会调用生成器的 gen.throw() 将异常注入到 yield 位置；若不用 try...finally 包裹 yield，yield 下方的清理逻辑就会被直接跳过。'
 },
 {
  id:'py-e1-17',
  type:'judge',
  q:'Python 3 的函数类型注解（如 def add(a: int, b: int) -> int:）在解释器运行该函数时会自动校验实参类型，若传入字符串将由解释器直接拒绝并抛出 TypeError。',
  answer:false,
  explain:'Python 标准解释器在运行时仅把类型注解保存在函数的 __annotations__ 字典中，不会自动执行参数类型校验；静态检查需借助 mypy、pyright，运行时校验需借助 pydantic 等库。'
 },
 {
  id:'py-e1-18',
  type:'fill',
  q:'在闭包或嵌套函数中，若想对上一层（非全局）函数作用域中的变量重新赋值，需要在内层函数中使用关键字 ＿ 进行声明。',
  accepted:['nonlocal'],
  explain:'nonlocal 关键字用于声明变量来自外层嵌套函数作用域（Enclosing），避免赋值语句被解释器当成创建新的内层局部变量。'
 },
 {
  id:'py-e1-19',
  type:'fill',
  q:'在生成器函数中，若要把另一个可迭代对象或子生成器的产出直接委托给当前调用方，可以使用双词语法 ＿＿ sub_iter（无需手写内层 for 循环逐个产出）。',
  accepted:['yield from'],
  explain:'yield from 不仅能简化遍历子迭代器的样板代码，还能建立调用方与子生成器之间的双向通道，自动转发 send()、throw() 和 close() 并捕获子生成器的返回值。'
 },
 {
  id:'py-e1-20',
  type:'fill',
  q:'手写函数装饰器时，为了保留被装饰原函数的 __name__、__doc__、__annotations__ 及 __wrapped__ 属性，通常会给内层包装函数加上标准库 functools 模块中的 @＿(func) 装饰器。',
  accepted:['wraps','functools.wraps'],
  explain:'@functools.wraps(func) 会把原函数的关键元属性复制到 wrapper 上，并设置 __wrapped__ 指向原函数，便于调试、文档生成和签名自省。'
 },
 {
  id:'py-e1-21',
  type:'short',
  q:'为什么在定义 Python 函数时应避免使用可变对象作为默认参数（例如 def add_tag(tag, tags=[]):）？如果希望每次未传参时都拿到全新的空列表，应该怎么改写？',
  reference:'1. 原因：Python 函数的默认参数表达式只在 def 语句执行（函数定义阶段）时求值一次，生成的默认列表对象存放在函数对象的 __defaults__ 属性中。后续每次不传 tags 调用函数时，都会复用并原地修改同一个列表对象，导致跨调用的数据串扰。\n2. 正确改法：将默认值设为不可变的哨兵值 None（def add_tag(tag, tags=None):），在函数体开头判断 if tags is None: tags = []，从而保证每次未传参调用时都在运行期新建独立列表。',
  points:[
   '指出默认参数在函数定义（def 执行）时只求值一次，而非每次调用时重新求值',
   '说明可变默认参数会被保存在函数对象上，跨多次调用共享同一实例导致状态污染',
   '给出使用 None 作为默认哨兵值并在函数体内 if tags is None: tags = [] 初始化的标准写法'
  ],
  explain:'记住“默认参数在定义期绑定，函数体在调用期执行”，就能彻底避开可变默认参数陷阱。'
 },
 {
  id:'py-e1-22',
  type:'short',
  q:'在多重继承（尤其是菱形继承）场景下，在子类 __init__ 中直接写 Base.__init__(self) 与使用 super().__init__() 有什么区别？Python 的 MRO（方法解析顺序）是如何解决重复初始化问题的？',
  reference:'1. 直接写 Base.__init__(self) 是硬编码调用指定基类：在菱形继承（D 继承 B、C，而 B、C 都继承顶层基类 A）中，若 B 和 C 都直接写 A.__init__(self)，会导致顶层基类 A.__init__ 被重复执行两次；反之若漏写则会漏掉初始化。\n2. super().__init__() 并非简单调用“直接父类”，而是根据当前实例所属类的 MRO（__mro__ 列表）查找当前类之后的下一个类并协同传递。\n3. Python 采用 C3 线性化算法计算 MRO，保证子类排在父类之前、同一父类的多个基类保持声明顺序，且每个类在线性化列表中只出现一次，从而让协作式 super() 链对每个基类恰好初始化一次。',
  points:[
   '说明硬编码 Base.__init__(self) 在菱形继承下会导致公共顶层基类被重复调用两次',
   '指出 super() 是按实例所属类的 MRO 顺序动态委托给线性化列表中的下一个类',
   '说明 C3 线性化算法将继承图展平为无重复的有序链表，确保公共基类只初始化一次'
  ],
  explain:'super() 的核心含义是“MRO 链上的下一站”而非“直属父类”，所有参与多重继承的类都使用协作式 super() 才能保证调用链完整且不重复。'
 },
 {
  id:'py-e1-23',
  type:'short',
  q:'对比列表推导式 [f(x) for x in data] 与生成器表达式 (f(x) for x in data) 在求值时机、内存占用、可重复遍历性以及适用场景上的区别。',
  reference:'1. 求值时机与内存占用：列表推导式采用及早求值（Eager Evaluation），立即遍历全部数据并在内存中构造出完整列表，空间复杂度为 O(N)；生成器表达式采用惰性求值（Lazy Evaluation），仅返回一个生成器对象，每次迭代到下一步时才按需计算一个元素，额外内存开销为 O(1)。\n2. 可重复遍历性与特性：列表支持 len()、下标切片访问以及多次重复遍历；生成器是单向一次性迭代器，不支持下标切片，耗尽后再次遍历为空。\n3. 适用场景：需要对结果反复遍历、切片或结果集较小时用列表推导式；处理海量数据流、大文件逐行管道或只做单次聚合消费（如传给 sum/any/all/max）时用生成器表达式。',
  points:[
   '对比求值时机与内存：列表推导式立即求值占 O(N) 内存，生成器表达式惰性求值占 O(1) 内存',
   '对比操作特性：列表可反复遍历且支持索引切片与 len()，生成器只能单次顺序消费',
   '说明适用场景：多次复用或小集合用列表推导式，大数据流管道或单次聚合用生成器表达式'
  ],
  explain:'列表推导式买的是“随机访问与多次复用”，生成器表达式买的是“常数内存与按需流式计算”。'
 },
 {
  id:'py-e1-24',
  type:'code',
  q:'编写一个生成器函数 batched_lines(lines, size)：接收字符串可迭代对象 lines 和正整数批次大小 size（若 size <= 0 则抛出 ValueError）。要求依次去除每行首尾空白并跳过空行，每凑满 size 条非空行就 yield 一个列表；若结束时还有剩余不足 size 条的尾批，也将其 yield 出来。最后写出测试代码验证。',
  reference:'def batched_lines(lines, size):\n    if size <= 0:\n        raise ValueError("size must be positive")\n    batch = []\n    for raw in lines:\n        clean = raw.strip()\n        if not clean:\n            continue\n        batch.append(clean)\n        if len(batch) == size:\n            yield batch\n            batch = []\n    if batch:\n        yield batch\n\nif __name__ == "__main__":\n    sample = ["  alpha ", "", "beta\\n", "   ", "gamma", "delta", "epsilon"]\n    print(list(batched_lines(sample, 2)))',
  points:[
   '校验 size <= 0 时主动抛出 ValueError',
   '遍历输入时对每行做 strip() 并跳过空字符串',
   '维护当前批次列表，满 size 条时 yield 批次并重置新列表',
   '循环结束后检查并 yield 剩余不足 size 条的尾批数据'
  ],
  explain:'流式分批生成器的关键点在于：满批时重置为新列表（不能对原已产出的列表直接 clear()，否则外部持有引用时内容会被清空），并在循环末尾兜底产出尾批。'
 },
 {
  id:'py-e1-25',
  type:'code',
  q:'实现一个带参数的重试装饰器 retry(times=3, allowed=(ValueError,))：要求使用 @functools.wraps 保留被装饰函数元信息；当被装饰函数抛出属于 allowed 的异常时最多重试至 times 次（总调用次数上限为 times），一旦成功立即返回结果，若第 times 次仍失败则将最后一次捕获的异常原样抛出。',
  reference:'from functools import wraps\n\ndef retry(times=3, allowed=(ValueError,)):\n    if times < 1:\n        raise ValueError("times must be >= 1")\n    def decorator(func):\n        @wraps(func)\n        def wrapper(*args, **kwargs):\n            last_err = None\n            for _ in range(times):\n                try:\n                    return func(*args, **kwargs)\n                except allowed as err:\n                    last_err = err\n            raise last_err\n        return wrapper\n    return decorator\n\nif __name__ == "__main__":\n    attempts = 0\n    @retry(times=3, allowed=(ValueError,))\n    def flaky(x):\n        nonlocal_holder = globals()\n        global attempts\n        attempts += 1\n        if attempts < 3:\n            raise ValueError("temporary fail")\n        return x * 2\n    print(flaky(21), attempts)',
  points:[
   '采用三层函数结构（外层接收配置参数、中间层接收 func、内层 wrapper 接收 *args 和 **kwargs）',
   '内层 wrapper 使用 @functools.wraps(func) 保留原函数元信息',
   '循环最多尝试 times 次，仅捕获 allowed 指定的异常元组并在成功时直接 return',
   '重试次数耗尽后将最后一次捕获的异常重新 raise 出去'
  ],
  explain:'带参数装饰器的标准模式是“参数工厂返回真正的 decorator，decorator 再返回带 @wraps 的 wrapper”。'
 }
];

// Python 阶段考试二（高阶 + 专家，L10–L15）：数据模型与魔术方法、多线程/多进程与 GIL、asyncio 异步编程、CPython 底层与内存管理、描述符与元编程、测试与工程化实践。
export const pythonStage2:AiQuiz[]=[
 {
  id:'py-e2-1',
  q:'在一个没有继承其他自定义基类的普通 Python 类中，如果你只重写了 __eq__ 方法而没有显式定义 __hash__，会发生什么？',
  options:[
   '实例默认沿用 object.__hash__，可以按内存地址正常放入 set 中',
   '类的 __hash__ 会被自动设为 None，将实例放入 set 会抛出 TypeError',
   '解释器会在定义类时直接报 SyntaxError，强制要求同时写出 __hash__',
   '解释器会自动根据实例的 __dict__ 字段内容生成默认哈希值'
  ],
  why:[
   '一旦重写了 __eq__，Python 为防止相等对象拥有不同哈希值破坏字典不变式，不会继续沿用基于 id 的 object.__hash__。',
   '',
   '只定义 __eq__ 不定义 __hash__ 完全符合语法，常用于可变对象，只是该类的实例变为不可哈希（unhashable）。',
   '普通 class 不会自动按字段合成 __hash__（只有 @dataclass(frozen=True) 或 unsafe_hash=True 才会自动合成）。'
  ],
  answer:1,
  explain:'哈希表要求“若 a == b 为真，则 hash(a) == hash(b)”。当自定义类重写了 __eq__ 但未定义 __hash__ 时，Python 会自动把该类的 __hash__ 设为 None，使其成为不可哈希类型。'
 },
 {
  id:'py-e2-2',
  q:'关于数据模型中的 __getattr__ 与 __getattribute__，下面这段代码运行后的输出是？',
  code:'class Box:\n    def __init__(self):\n        self.a = 10\n\n    def __getattr__(self, name):\n        return f"missing:{name}"\n\n    def __getattribute__(self, name):\n        if name == "a":\n            return super().__getattribute__(name) + 5\n        return super().__getattribute__(name)\n\nb = Box()\nprint(b.a, b.b)',
  options:[
   '10 missing:b',
   'missing:a missing:b',
   '15 missing:b',
   '15 抛出 AttributeError'
  ],
  why:[
   '访问任何属性都会先经过 __getattribute__，读取 b.a 时命中了 name == "a" 分支，返回的是 10 + 5 = 15。',
   'a 存在于实例字典中且被 __getattribute__ 成功返回 15，不会退化触发 __getattr__。',
   '',
   '访问 b.b 时 __getattribute__ 调用 super().__getattribute__("b") 抛出 AttributeError，解释器随后自动调用 __getattr__("b") 兜底返回 missing:b。'
  ],
  answer:2,
  explain:'__getattribute__ 在每次属性访问时无条件先触发；若它内部抛出 AttributeError（如通过 super().__getattribute__ 未找到 b），解释器才会退而求其次调用 __getattr__ 兜底。'
 },
 {
  id:'py-e2-3',
  q:'在同一个线程内依次调用两次 lock.acquire()（中间未调用 release()），普通互斥锁 threading.Lock() 与可重入锁 threading.RLock() 分别会表现出什么行为？',
  options:[
   'Lock 会阻塞死锁，RLock 会成功获取并将递归计数加 1',
   'Lock 和 RLock 都会成功获取，因为它们都能识别当前持有线程',
   'Lock 会立即抛出 RuntimeError，RLock 会阻塞等待上一把锁释放',
   'Lock 和 RLock 都会原地阻塞死锁，必须改用 Semaphore(2)'
  ],
  why:[
   '',
   '普通 threading.Lock 不记录持有者线程身份，同一线程再次 acquire() 也会把自己阻塞住。',
   'Lock.acquire() 默认阻塞等待而不是抛异常，而 RLock 允许同一持有线程重复 acquire() 不会阻塞。',
   'RLock 专门为同一线程内的递归调用或跨方法重入设计，同一线程第二次 acquire() 会直接放行。'
  ],
  answer:0,
  explain:'threading.Lock 是非重入锁，不区分请求锁的是否为当前持有线程，同线程二次 acquire 会自我死锁；threading.RLock 记录持有线程与递归深度，同线程可多次 acquire，只需匹配相同次数的 release。'
 },
 {
  id:'py-e2-4',
  q:'在 asyncio 中，假设 step(t) 是内部执行 await asyncio.sleep(t) 后返回 t 的协程函数。下面两种写法各自的总耗时大约是多少？',
  code:'# 写法甲：\na = await step(1)\nb = await step(2)\n\n# 写法乙：\nt1 = asyncio.create_task(step(1))\nt2 = asyncio.create_task(step(2))\na, b = await t1, await t2',
  options:[
   '写法甲约 2 秒，写法乙约 2 秒',
   '写法甲约 3 秒，写法乙约 3 秒',
   '写法甲约 2 秒，写法乙约 1 秒',
   '写法甲约 3 秒，写法乙约 2 秒'
  ],
  why:[
   '写法甲是顺序等待 step(1) 完成后才启动 step(2)，总耗时为 1 + 2 = 3 秒。',
   '写法乙通过 create_task 把两个协程同时挂入事件循环并发计时，总耗时取决于最慢的 2 秒任务。',
   '写法乙需要等 t1 和 t2 都完成，t2 需要 2 秒，因此总耗时约为 2 秒而非 1 秒。',
   ''
  ],
  answer:3,
  explain:'直接写 await step(1) 再 await step(2) 是串行执行，耗时 1 + 2 = 3 秒；先用 create_task 调度两个任务再 await，两个睡眠在事件循环中并发重叠运行，总耗时约为 max(1, 2) = 2 秒。'
 },
 {
  id:'py-e2-5',
  q:'在 CPython 中，刚创建一个全新的非缓存对象 obj = object()，紧接着调用 sys.getrefcount(obj)，返回值通常是多少？为什么？',
  options:[
   '返回 1，因为目前只有变量名 obj 绑定了该对象',
   '返回 2，因为把 obj 作为实参传给 getrefcount 时栈帧形参也持有一份临时引用',
   '返回 0，因为新建对象在首次进入垃圾回收链表前不计入引用计数',
   '返回 3，因为全局命名空间、局部命名空间与 GC 链表各持有一份引用'
  ],
  why:[
   '除了变量 obj 本身的引用外，调用 sys.getrefcount(obj) 传参的过程还会增加一次临时引用。',
   '',
   '任何存活的 PyObject 引用计数至少为 1，若引用计数降为 0 会被立即销毁回收。',
   'object() 不属于容器对象，不进入分代 GC 循环链表，且只绑定在当前作用域的 obj 和函数调用实参上，共计 2 次。'
  ],
  answer:1,
  explain:'变量 obj 绑定该对象记 1 次引用；调用 sys.getrefcount(obj) 时，解释器把对象引用压入调用栈传给函数形参又临时增加 1 次引用，因此返回 2。'
 },
 {
  id:'py-e2-6',
  q:'下面这段关于描述符优先级的代码运行后输出什么？',
  code:'class DataDesc:\n    def __get__(self, inst, owner):\n        return "from_data_desc"\n    def __set__(self, inst, val):\n        pass\n\nclass NonDataDesc:\n    def __get__(self, inst, owner):\n        return "from_non_data"\n\nclass Demo:\n    x = DataDesc()\n    y = NonDataDesc()\n\nd = Demo()\nd.__dict__["x"] = "inst_x"\nd.__dict__["y"] = "inst_y"\nprint(d.x, d.y)',
  options:[
   'from_data_desc inst_y',
   'inst_x inst_y',
   'from_data_desc from_non_data',
   'inst_x from_non_data'
  ],
  why:[
   '',
   'x 是同时定义了 __get__ 和 __set__ 的数据描述符，其读取优先级高于实例字典 d.__dict__["x"]。',
   'y 只定义了 __get__，属于非数据描述符，实例字典 d.__dict__["y"] 的优先级高于非数据描述符。',
   '数据描述符与非数据描述符相对实例 __dict__ 的优先级恰好相反：x 走数据描述符，y 走实例字典。'
  ],
  answer:0,
  explain:'属性读取优先级为：数据描述符（定义了 __set__ 或 __delete__）> 实例 __dict__ > 非数据描述符（仅定义 __get__）。因此 d.x 返回 from_data_desc，而 d.y 被实例字典覆盖返回 inst_y。'
 },
 {
  id:'py-e2-7',
  q:'当使用自定义元类 class Meta(type): 创建类 class Service(metaclass=Meta):，并在之后执行 s = Service() 实例化时，下面关于各方法调用时机的说法哪项正确？',
  options:[
   '定义 Service 类时触发 Meta.__call__，实例化 Service() 时才触发 Meta.__new__ 与 Meta.__init__',
   'Meta.__prepare__ 会在每次执行 s = Service() 创建实例时运行一次，用来准备该实例的属性字典',
   '定义 Service 类时依次经过 Meta.__prepare__、__new__ 与 __init__，调用 Service() 时触发 Meta.__call__',
   'Service.__init__ 在定义 Service 类时由解释器自动执行，而 Meta.__init__ 则在创建实例 s 时执行'
  ],
  why:[
   '定义类时相当于构造 Meta 的实例（即类对象 Service），走的是 Meta.__new__ 与 Meta.__init__；而调用 Service() 时才触发 Meta.__call__。',
   'Meta.__prepare__ 仅在 class 语句开始执行前调用一次，用来创建类体执行所用的命名空间映射，实例化对象时不会调用。',
   '',
   'Meta.__init__ 在类定义完成时初始化类对象 Service；而 Service.__init__ 是在调用 Service() 时由 Meta.__call__ 触发来初始化实例 s。'
  ],
  answer:2,
  explain:'类对象本身是元类 Meta 的实例。执行 class Service(metaclass=Meta): 时依次调用 Meta.__prepare__ -> 执行类体 -> Meta.__new__ -> Meta.__init__；调用 Service() 时，作为 Meta 实例被调用，触发 Meta.__call__，内部再调用 Service.__new__ 与 Service.__init__。'
 },
 {
  id:'py-e2-8',
  q:'在 pytest 测试框架中，关于夹具（@pytest.fixture）和 monkeypatch 的行为，下面哪项说法正确？',
  options:[
   '在 fixture 函数中使用 yield 提供测试资源时，若测试函数断言失败抛错，yield 后面的清理代码将被跳过',
   '未显式指定 scope 参数时，@pytest.fixture 的默认作用域是 module（每个测试文件只执行一次）',
   '使用 monkeypatch.setenv 修改的环境变量会持久化保留到整个 pytest 进程退出，影响后续其他测试函数',
   '把 yield 写在 fixture 中时，yield 之前的代码作为前置准备，yield 之后的代码在测试结束后作为拆卸清理执行'
  ],
  why:[
   'pytest 会保证即使测试函数内部断言失败或抛出异常，fixture 中 yield 之后的 teardown 清理逻辑依然会执行。',
   '@pytest.fixture 的默认 scope 是 "function"（每个测试函数独立执行一次），而非 "module"。',
   'monkeypatch 夹具会在当前测试函数执行完毕后自动还原所有被修改的属性、字典项和环境变量，不会污染后续测试。',
   ''
  ],
  answer:3,
  explain:'@pytest.fixture 默认作用域为 function；使用 yield 可将 setup 与 teardown 写在同一函数内，无论测试是否通过都会执行 yield 后的清理；monkeypatch 也会在当前测试结束时自动回滚改动。'
 },
 {
  id:'py-e2-9',
  type:'multi',
  q:'关于 Python 数据模型中的常用魔术方法，下面哪些说法是正确的？（多选）',
  options:[
   '__new__ 是负责创建并返回实例的静态方法，只有当它返回当前类的实例时，解释器才会继续自动调用该实例的 __init__',
   '只要类实现了 __str__ 方法而未实现 __repr__，在交互式终端直接输出或打印列表 [obj] 时都会自动回退调用 __str__',
   '当对自定义对象求布尔值 bool(obj) 时，若类未定义 __bool__，解释器会尝试调用 __len__，长度非 0 则视为 True',
   '继承自 dict 的子类若定义了 __missing__(self, key) 方法，在使用 d[k] 访问不存在的键时会自动调用该方法'
  ],
  why:[
   '',
   '回退方向恰恰相反：定义了 __repr__ 未定义 __str__ 时，str(obj) 会回退调用 __repr__；而容器打印 [obj] 使用的是元素的 __repr__，不会回退到 __str__。',
   '',
   ''
  ],
  answers:[0,2,3],
  explain:'__new__ 决定实例创建与是否触发 __init__；bool(obj) 先找 __bool__ 再回退找 __len__；dict 子类的 d[k] 在键缺失时触发 __missing__；而字符串表示是 __str__ 缺失时回退到 __repr__。'
 },
 {
  id:'py-e2-10',
  type:'multi',
  q:'关于 Python 的 concurrent.futures 与 multiprocessing 多进程并发，下面哪些说法正确？（多选）',
  options:[
   'ProcessPoolExecutor 工作进程与主进程直接共享同一块全局变量内存，子进程修改全局列表后主进程立即可见',
   '提交给 ProcessPoolExecutor.submit 的目标函数、参数和返回值都需要能够被 pickle 序列化，因此局部 lambda 通常无法直接投递',
   '处理纯 CPU 密集型计算（如大规模矩阵运算或哈希穷举）时，ThreadPoolExecutor 能比 ProcessPoolExecutor 更好地跑满多核 CPU',
   '每个子进程拥有独立的 Python 解释器实例和独立的 GIL，因此多进程可以实现真正的跨核并行计算'
  ],
  why:[
   '进程间拥有各自独立的虚拟地址空间，不直接共享普通全局变量内存，跨进程通信需借助 Queue、Pipe 或共享内存。',
   '',
   'CPython 中受 GIL 限制，同一进程内的多线程无法在多核上并行执行 Python 字节码，纯 CPU 密集型任务应使用 ProcessPoolExecutor。',
   ''
  ],
  answers:[1,3],
  explain:'多进程通过每个进程独立解释器和独立 GIL 绕开单进程 GIL 限制，实现多核 CPU 并行；代价是进程间内存隔离，投递给进程池的可调用对象与数据需支持 pickle 序列化。'
 },
 {
  id:'py-e2-11',
  type:'multi',
  q:'关于 Python asyncio 异步编程，下面哪些说法是正确的？（多选）',
  options:[
   '直接调用 async def 定义的协程函数只会返回一个协程对象，必须通过 await 或挂入事件循环才会被驱动执行',
   '在协程中若必须调用无法改写的第三方同步阻塞 I/O 函数，可使用 await asyncio.to_thread(fn, ...) 避免卡死事件循环',
   '异步上下文管理器需要实现 __aenter__ 和 __aexit__ 协程方法，并配合 async with 语句使用',
   '当一个正在等待的 Task 被调用 cancel() 时，它会在当前 await 挂起点收到 asyncio.CancelledError 异常'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'四项均正确：协程函数调用返回 coroutine 对象；asyncio.to_thread 将同步阻塞调用卸载到后台线程池；async with 依赖 __aenter__/__aexit__；取消任务会在挂起点注入 CancelledError。'
 },
 {
  id:'py-e2-12',
  type:'multi',
  q:'关于 CPython 的底层内存管理与性能优化机制，下面哪些说法正确？（多选）',
  options:[
   '当普通对象的引用计数降为 0 时，CPython 会立即释放其内存（或归还至内部内存池），无需等待分代 GC 周期',
   '两个相互引用的自定义容器对象即使外部引用全部断开，只要定义了 __slots__，引用计数也会自动归零释放',
   '对 bytes 或 bytearray 创建 memoryview 后再做切片（如 mv[10:100]），可以在不复制底层字节缓冲区的情况下实现零拷贝视图',
   '所有在运行期动态拼接生成的长字符串都会被 CPython 自动驻留（intern），因此内容相同的字符串用 is 比较都返回 True'
  ],
  why:[
   '',
   '__slots__ 只是用固定槽位数组替代实例 __dict__ 以节省内存，并不会消除两个对象相互持有引用构成的循环引用，仍需分代 GC 介入打破循环。',
   '',
   '运行期动态拼接的字符串（尤其是包含非标识符字符或较长的字符串）通常不会自动驻留，判断字符串内容相等应使用 == 而非 is。'
  ],
  answers:[0,2],
  explain:'CPython 以引用计数实现即时回收，用分代 GC 清理容器间的循环引用；memoryview 基于缓冲协议（Buffer Protocol）提供零拷贝内存切片。'
 },
 {
  id:'py-e2-13',
  type:'multi',
  q:'关于 Python 元编程（__init_subclass__、描述符）与工程日志（logging），下面哪些说法正确？（多选）',
  options:[
   '基类定义的 __init_subclass__ 钩子会在每次创建子类实例（即调用 SubClass() 构造对象）时自动触发一次并传入该新实例',
   '定义了 __set_name__(self, owner, name) 的描述符，会在宿主类创建时由 type.__new__ 自动调用并传入属性名 name',
   '使用 logger.debug("user=%s", name) 比 f-string 更适合高频日志，因为在日志级别未开启时可跳过字符串格式化开销',
   '在 logging 模块中，调用 logger.exception("msg") 会自动将当前 except 块捕获到的异常堆栈（exc_info=True）一并记录'
  ],
  why:[
   '__init_subclass__ 是在子类被定义（class Sub(Base): 语句执行完毕）时触发，而不是在实例化 Sub() 时触发。',
   '',
   '',
   ''
  ],
  answers:[1,2,3],
  explain:'__init_subclass__ 和描述符的 __set_name__ 都在类定义阶段自动触发；logging 使用 % 占位符传参可实现惰性格式化，logger.exception 则专门在 except 块中附带完整 traceback。'
 },
 {
  id:'py-e2-14',
  type:'judge',
  q:'在 CPython 中，由于存在全局解释器锁（GIL），像 total += 1 这样只有一行的 Python 累加语句在多线程并发执行时是天然原子的，不会发生竞态条件。',
  answer:false,
  explain:'total += 1 编译成多条字节码指令（加载、相加、写回），GIL 可能会在两条字节码指令之间切换线程，导致多线程更新丢失，仍需使用 threading.Lock 保护。'
 },
 {
  id:'py-e2-15',
  type:'judge',
  q:'在 async def 协程函数内部直接调用标准库的 time.sleep(3) 会阻塞当前事件循环所在的线程，导致同一事件循环中的其他并发任务在这 3 秒内无法推进。',
  answer:true,
  explain:'time.sleep 是同步系统调用，不会向事件循环让出控制权；在异步协程中应使用 await asyncio.sleep(3) 挂起当前协程并交出事件循环。'
 },
 {
  id:'py-e2-16',
  type:'judge',
  q:'CPython 的内存回收完全依赖周期性运行的标记-清除分代垃圾回收器，因此函数内的局部变量在函数返回后还要等到下一次 GC 触发才会释放。',
  answer:false,
  explain:'CPython 以引用计数为主：无循环引用的局部变量在离开函数作用域、引用计数归零的瞬间就会立即释放；分代 GC 仅作为辅助机制用来检测并清理容器循环引用。'
 },
 {
  id:'py-e2-17',
  type:'judge',
  q:'一个描述符类如果同时实现了 __get__ 和 __set__ 方法，就属于数据描述符（Data Descriptor），通过实例读取该属性时它的优先级高于实例自身 __dict__ 中的同名键。',
  answer:true,
  explain:'实现了 __set__ 或 __delete__ 的描述符是数据描述符，type.__getattribute__ 会优先调用类上的数据描述符 __get__，之后才查找实例 __dict__。'
 },
 {
  id:'py-e2-18',
  type:'fill',
  q:'在 Python 数据模型中，若要自定义不可变类型（如 tuple 或 str）的子类并在对象分配阶段加工初始值，或者实现类级单例复用，需要重写魔术方法 ＿(cls, ...)。',
  accepted:['__new__'],
  explain:'__new__ 是在 __init__ 之前真正负责创建并返回实例对象的构造魔术方法；不可变对象的内容在 __new__ 返回时就已定型，无法在 __init__ 中原地修改。'
 },
 {
  id:'py-e2-19',
  type:'fill',
  q:'在 Python 3.6+ 中编写描述符类时，可以实现钩子方法 ＿(self, owner, name)，让描述符在宿主类创建时自动获知自己被绑定到了哪个属性名，无需手动重复传参。',
  accepted:['__set_name__'],
  explain:'type.__new__ 在构建类对象时会遍历类命名空间，自动调用所有描述符上的 __set_name__(self, owner, name)，传入宿主类 owner 和属性字符串名 name。'
 },
 {
  id:'py-e2-20',
  type:'fill',
  q:'在 Python 3.9+ 的 asyncio 模块中，若要把一个同步阻塞函数 sync_fn(*args) 放到独立工作线程中运行并可被直接 await，可以调用辅助函数 await asyncio.＿(sync_fn, *args)。',
  accepted:['to_thread'],
  explain:'asyncio.to_thread 会使用默认的 ThreadPoolExecutor 在后台线程执行同步阻塞函数，并自动传播当前上下文变量（contextvars），返回一个可被 await 的协程。'
 },
 {
  id:'py-e2-21',
  type:'short',
  q:'什么是 CPython 的 GIL（全局解释器锁）？为什么有了 GIL 之后，多线程修改共享字典或计数器时仍然需要加 threading.Lock？在实际工程中应如何针对 I/O 密集型与 CPU 密集型任务选择并发方案？',
  reference:'1. GIL 的含义：GIL 是 CPython 解释器层面的互斥锁，保证同一进程内任意时刻最多只有一个线程在执行 Python 字节码，用来保护解释器内部的引用计数和内存管理结构。\n2. 仍需 threading.Lock 的原因：GIL 保护的是解释器 C 层状态而非业务层面的复合操作原子性。一行 Python 代码（如 count += 1 或检查后再写入字典）往往对应多条字节码指令，解释器在执行一定时间片或遇到 I/O 时会释放并切换 GIL，导致多线程交错执行产生竞态条件（Race Condition），因此业务共享状态仍需显式加锁。\n3. 并发方案选择：\n- I/O 密集型任务（网络请求、磁盘读写、数据库查询）：线程或协程在等待 I/O 期间会释放 GIL，适合使用 asyncio（高并发连接、低内存开销）或 ThreadPoolExecutor（兼容同步第三方库）；\n- CPU 密集型任务（图像处理、复杂数值计算、加密压缩）：应使用 multiprocessing / ProcessPoolExecutor 开启多进程绕过单进程 GIL，或将热点计算下沉到会在 C/Rust 层释放 GIL 的原生扩展（如 NumPy）。',
  points:[
   '解释 GIL 是限制同一进程内同一时刻仅有一个线程执行 Python 字节码的解释器级互斥锁',
   '说明单行 Python 业务操作往往拆分为多条字节码，GIL 会在字节码间切换，故业务共享状态仍需 threading.Lock',
   '指出 I/O 密集型期间会释放 GIL，适合选用 asyncio 或多线程（ThreadPoolExecutor）',
   '指出 CPU 密集型受制于 GIL，应选用多进程（ProcessPoolExecutor）或释放 GIL 的原生扩展'
  ],
  explain:'区分“解释器内部引用计数的安全（GIL 负责）”与“业务复合读写操作的原子性（业务锁负责）”，是掌握 Python 并发的第一步。'
 },
 {
  id:'py-e2-22',
  type:'short',
  q:'在 asyncio 并发编排中，对比传统的 asyncio.gather(*coros) 与 Python 3.11 引入的结构化并发工具 asyncio.TaskGroup() 在异常处理和子任务取消行为上的核心差异。',
  reference:'1. asyncio.gather 的异常行为：当 return_exceptions=False（默认）且某个子任务抛出异常时，gather 会立即把该异常向上抛给调用方，但其余仍在后台运行的兄弟任务不会被自动取消，容易成为无人监管的孤儿任务（Orphan Tasks）继续消耗资源或产生后台未捕获异常。\n2. asyncio.TaskGroup 的结构化并发机制：通过 async with asyncio.TaskGroup() as tg: 配合 tg.create_task() 管理任务生命周期。只要组内任意一个子任务抛出非取消异常，TaskGroup 会自动调用其余未完成兄弟任务的 cancel()，并等待所有子任务都彻底退出后，再将所有失败任务的异常打包成 ExceptionGroup 统一抛出（可配合 except* 语法分类捕获）。\n3. 结论：TaskGroup 严格保证了“进入块创建的任务在离开块前全部完结”，在资源泄漏防护与错误传播一致性上明显优于传统 gather。',
  points:[
   '指出 asyncio.gather 默认在单任务抛错时立即向上抛异常，但不会自动取消其余仍在运行的兄弟任务',
   '说明 asyncio.TaskGroup 实现了结构化并发，任一子任务失败会自动取消组内其余任务并等待它们全部结束',
   '说明 TaskGroup 在离开 async with 时会将多个并发异常汇总为 ExceptionGroup（可配合 except* 处理）'
  ],
  explain:'结构化并发的核心原则是“子任务的生命周期绝不逃逸出父作用域”，TaskGroup 从语言机制上消除了后台孤儿任务。'
 },
 {
  id:'py-e2-23',
  type:'short',
  q:'请完整列出通过实例执行 obj.attr 读取属性时，CPython 在类与实例之间的查找优先级顺序（需包含数据描述符、实例 __dict__、非数据描述符以及 __getattr__），并说明在编写插件注册表或子类规范校验时为何优先推荐 __init_subclass__ 而不是自定义元类。',
  reference:'1. obj.attr 的完整属性查找顺序（由 object.__getattribute__ 实现）：\n① 首先若类自定义了 __getattribute__，则直接由其接管；默认实现下先沿 type(obj) 的 MRO 查找同名类属性；\n② 若在类的 MRO 中找到了数据描述符（实现了 __get__ 且实现了 __set__ 或 __delete__），立即调用该描述符的 __get__(obj, type(obj)) 并返回；\n③ 若不是数据描述符，接着查找实例自身的 obj.__dict__，若存在同名键则直接返回实例字典中的值；\n④ 若实例字典中不存在，但第①步在类 MRO 中找到了非数据描述符（如普通方法、@staticmethod，仅实现了 __get__），则调用其 __get__(obj, type(obj))；若只是普通类属性常量，则直接返回该类属性；\n⑤ 若以上全部未找到而抛出 AttributeError，且类定义了 __getattr__(self, name)，则最后调用 __getattr__ 做兜底。\n2. 优先使用 __init_subclass__ 的原因：自定义元类（metaclass）在多重继承中容易引发“元类冲突（metaclass conflict）”，且理解与维护成本高；而 __init_subclass__ 是标准基类钩子，支持直接接收 class Sub(Base, key=val): 形式的类定义关键字参数，能以极简代码完成子类自动注册与属性规范检查，且不会破坏元类继承树。',
  points:[
   '准确给出核心优先级：类 MRO 上的数据描述符 > 实例 obj.__dict__ > 类 MRO 上的非数据描述符与普通类属性',
   '说明 __getattribute__ 是一切查找的入口，而 __getattr__ 仅在常规查找全部失败抛 AttributeError 后兜底调用',
   '说明 __init_subclass__ 相比自定义元类代码更简洁、支持类定义关键字参数，且能避免多重继承下的元类冲突'
  ],
  explain:'这套属性查找链同时解释了 @property 为什么能拦截同名实例属性、普通方法为什么会被实例同名属性覆盖，以及 __getattr__ 为什么只在缺失时触发。'
 },
 {
  id:'py-e2-24',
  type:'code',
  q:'实现一个数据描述符类 BoundedInt(min_val, max_val)：利用 __set_name__ 自动获取属性名，将实例的实际属性值存放在实例自身的 __dict__ 中；在赋值时若值不是 int（注意在 Python 中 bool 是 int 的子类，需排除 bool）则抛出 TypeError，若超出 [min_val, max_val] 闭区间则抛出 ValueError。随后定义宿主类 Config 演示正常读写与异常拦截。',
  reference:'class BoundedInt:\n    def __init__(self, min_val, max_val):\n        self.min_val = min_val\n        self.max_val = max_val\n        self.name = ""\n\n    def __set_name__(self, owner, name):\n        self.name = name\n\n    def __get__(self, instance, owner=None):\n        if instance is None:\n            return self\n        return instance.__dict__.get(self.name)\n\n    def __set__(self, instance, value):\n        if isinstance(value, bool) or not isinstance(value, int):\n            raise TypeError(f"{self.name} must be an int")\n        if not (self.min_val <= value <= self.max_val):\n            raise ValueError(f"{self.name} must be between {self.min_val} and {self.max_val}")\n        instance.__dict__[self.name] = value\n\nclass Config:\n    workers = BoundedInt(1, 32)\n    port = BoundedInt(1024, 65535)\n\n    def __init__(self, workers, port):\n        self.workers = workers\n        self.port = port\n\nif __name__ == "__main__":\n    cfg = Config(4, 8080)\n    print(cfg.workers, cfg.port)',
  points:[
   '实现 __set_name__(self, owner, name) 自动记录绑定的属性名',
   '__get__ 中处理 instance is None（通过类访问）返回描述符自身，通过实例访问时从 instance.__dict__ 读取',
   '__set__ 中校验类型（排除 bool 子类并确保为 int）与闭区间范围，分别抛出 TypeError 和 ValueError',
   '将校验通过的值保存在 instance.__dict__[self.name] 中，避免多实例共享描述符对象上的状态'
  ],
  explain:'由于 BoundedInt 实现了 __get__ 和 __set__，它是数据描述符，优先级高于 instance.__dict__，因此把值直接存在 instance.__dict__[self.name] 中既不会绕过描述符，又无需单独起下划线私有属性名。'
 },
 {
  id:'py-e2-25',
  type:'code',
  q:'使用 asyncio 编写一个带并发度限制的异步批处理函数 fetch_all_limited(ids, limit)：内部通过 asyncio.Semaphore(limit) 控制同一时刻最多只有 limit 个协程处于活跃执行状态；每个子任务模拟异步 I/O（await asyncio.sleep(0.05) 后返回 id * 10），最终按 ids 的原始顺序返回结果列表。写出 main 协程并用 asyncio.run 启动验证。',
  reference:'import asyncio\n\nasync def fetch_one(item_id, sem):\n    async with sem:\n        await asyncio.sleep(0.05)\n        return item_id * 10\n\nasync def fetch_all_limited(ids, limit):\n    sem = asyncio.Semaphore(limit)\n    tasks = [asyncio.create_task(fetch_one(i, sem)) for i in ids]\n    return await asyncio.gather(*tasks)\n\nasync def main():\n    res = await fetch_all_limited([1, 2, 3, 4, 5], limit=2)\n    print(res)\n\nif __name__ == "__main__":\n    asyncio.run(main())',
  points:[
   '使用 asyncio.Semaphore(limit) 配合 async with sem: 控制并发进入临界区的协程数量',
   '单任务内部使用非阻塞的 await asyncio.sleep(...) 模拟异步 I/O 并返回计算结果',
   '使用 asyncio.gather 或 TaskGroup 并发调度所有任务并保持与输入 ids 相同的返回顺序',
   '在入口处通过 asyncio.run(main()) 启动事件循环完成调用演示'
  ],
  explain:'async with asyncio.Semaphore(limit) 是控制异步爬虫、批量 RPC 或数据库连接池并发度的标准惯用法。'
 }
];

// Python 最终考试（覆盖全部 15 关）：从语言基础、容器与函数式、OOP 与数据模型，到并发/异步、CPython 底层机制、描述符/元编程与工程实战。
export const pythonFinal:AiQuiz[]=[
 {
  id:'py-f-1',
  q:'下面这段对比切片原地赋值与变量重新绑定的代码，运行后输出什么？',
  code:'def mutate(a, b):\n    a[:] = [10, 20]\n    b = [30, 40]\n\nx = [1, 2]\ny = [3, 4]\nmutate(x, y)\nprint(x, y)',
  options:[
   '[1, 2] [3, 4]',
   '[10, 20] [3, 4]',
   '[10, 20] [30, 40]',
   '[1, 2] [30, 40]'
  ],
  why:[
   'a[:] = [10, 20] 是对 a 所指向的原列表做原地切片替换，调用方的 x 会同步变成 [10, 20]。',
   '',
   'b = [30, 40] 只是把函数局部变量 b 重新绑定到了一个新列表对象上，不会影响外部实参 y。',
   '发生原地修改的是使用 a[:] 切片赋值的第一个参数 x，而不是直接重绑定局部变量的 y。'
  ],
  answer:1,
  explain:'Python 参数传递是共享对象引用传递（Call by Object Reference）：a[:] = ... 原地改写原列表内容，外部 x 可见；b = ... 仅改变局部变量 b 的指向，外部 y 仍为 [3, 4]。'
 },
 {
  id:'py-f-2',
  q:'下面这段结合了列表推导式独立作用域与 LEGB 查找规则的代码，运行后输出什么？',
  code:'x = 100\n\ndef run():\n    x = 10\n    vals = [x * i for x in range(1, 4) for i in (2,)]\n    return x, vals\n\nprint(run())',
  options:[
   '(3, [2, 4, 6])',
   '(100, [20, 40, 60])',
   '(10, [2, 4, 6])',
   '(10, [20, 20, 20])'
  ],
  why:[
   'Python 3 中列表推导式拥有独立的隐式函数作用域，其中的循环变量 x 不会覆盖外层 run 函数里的局部变量 x = 10。',
   'run 函数内部定义了 x = 10，返回的是局部变量 x（值为 10），且推导式内 x * i 使用的是推导式自身的循环变量 x。',
   '',
   '推导式中第一个 for 的循环变量命名为 x（依次取 1、2、3），遮蔽了外层的 x = 10，因此计算出的是 [2, 4, 6]。'
  ],
  answer:2,
  explain:'在 Python 3 中，列表推导式编译为独立的作用域：推导式内的 for x in range(1, 4) 在该子作用域内依次取 1、2、3，算出 [2, 4, 6]，同时不会泄露或覆盖外层 run() 中的局部变量 x = 10。'
 },
 {
  id:'py-f-3',
  q:'关于 __slots__ 在继承体系中的行为，看下面这段代码，运行后的结果是什么？',
  code:'class Base:\n    __slots__ = ("x",)\n\nclass Sub(Base):\n    pass\n\ns = Sub()\ns.x = 1\ns.y = 2\nprint(s.x, s.y, "y" in s.__dict__, "x" in s.__dict__)',
  options:[
   '1 2 True False',
   '1 2 True True',
   '在执行 s.y = 2 时抛出 AttributeError',
   '在访问 s.__dict__ 时抛出 AttributeError'
  ],
  why:[
   '',
   'x 存放在 Base 声明的固定 slot 槽位描述符中，并不存放在子类实例的 __dict__ 字典里，所以 "x" in s.__dict__ 为 False。',
   '子类 Sub 没有显式声明 __slots__，Python 会自动为 Sub 的实例创建 __dict__，因此可以动态新增属性 s.y = 2。',
   '只有当整条继承链上的每一个类都声明了 __slots__ 时，实例才没有 __dict__；Sub 未声明 __slots__，故 s.__dict__ 存在。'
  ],
  answer:0,
  explain:'父类声明了 __slots__ = ("x",)，属性 x 存储在固定槽位中；但子类 Sub 未声明 __slots__，因此 Sub 实例仍然拥有 __dict__，动态赋予的 s.y 会进入 s.__dict__，而 s.x 仍走父类 slot。'
 },
 {
  id:'py-f-4',
  q:'在异常处理中，对比显式异常链 raise RuntimeError("fail") from err 与在 except 块中直接写 raise RuntimeError("fail")，下面哪项描述正确？',
  options:[
   '只有写 from err 时解释器才会在回溯信息中打印原异常 err，不写 from 时原异常会被自动丢弃',
   '两种写法都会把原异常 err 赋值给新异常对象的 __cause__ 属性，且 __suppress_context__ 均为 False',
   '写 from err 会把新异常附加到原异常 err 的 args 元组末尾，而不创建新的异常实例',
   '写 from err 会把 err 绑定到新异常的 __cause__ 并设置 __suppress_context__ 为 True，明确表达直接因果关系'
  ],
  why:[
   '即使不写 from err，在 except 块中抛出的新异常也会自动把原异常保存在 __context__ 属性中并在回溯里打印。',
   '直接写 raise NewError 时，原异常保存在 __context__ 中且 __cause__ 为 None；只有显式写 from err 才会设置 __cause__。',
   'raise RuntimeError("fail") from err 创建的是全新的 RuntimeError 实例，并通过 __cause__ 关联 err，不会改动 err.args。',
   ''
  ],
  answer:3,
  explain:'隐式异常链将外层正在处理的异常存入新异常的 __context__；显式 raise ... from err 则将 err 存入 __cause__ 并将 __suppress_context__ 设为 True，回溯提示也会变为 The above exception was the direct cause of the following exception。'
 },
 {
  id:'py-f-5',
  q:'下面这段使用生成器 .send() 方法的代码，运行后输出什么？',
  code:'def accumulator(start):\n    total = start\n    while True:\n        inc = yield total\n        total += inc\n\ng = accumulator(10)\nfirst = next(g)\nsecond = g.send(5)\nthird = g.send(3)\nprint(first, second, third)',
  options:[
   '输出 10 10 15',
   '输出 10 15 18',
   '输出 0 15 18',
   '抛出 TypeError'
  ],
  why:[
   'g.send(5) 会把 5 作为暂停处 yield 表达式的返回值赋给 inc，接着执行 total += 5 后推进到下一轮 yield total，返回 15 而非 10。',
   '',
   'start 传入的是 10，首次调用 next(g) 预激生成器，运行到第一个 yield total 时产出的初始值是 10。',
   '因为前面已经调用过 next(g) 将生成器预激并停在 yield 处，此时调用 g.send(5) 完全合法；只有对刚创建未启动的生成器直接 send 非 None 值才会报 TypeError。'
  ],
  answer:1,
  explain:'首次 next(g) 启动生成器并在 yield total 处暂停，产出 10；随后 g.send(5) 将当前暂停的 yield 表达式求值为 5 赋给 inc，total 变为 15 并进入下一轮循环再次暂停在 yield total，产出 15；同理 g.send(3) 产出 18。'
 },
 {
  id:'py-f-6',
  q:'关于标准库缓存装饰器 @functools.lru_cache(maxsize=128)，下面代码的运行结果是什么？',
  code:'from functools import lru_cache\n\ncalls = 0\n\n@lru_cache(maxsize=16)\ndef calc(a, b=2):\n    global calls\n    calls += 1\n    return a + b\n\ncalc(1, 2)\ncalc(1, 2)\ncalc(1, b=2)\nprint(calls, calc.cache_info().hits)',
  options:[
   '输出 1 2',
   '输出 3 0',
   '输出 2 1',
   '报 TypeError'
  ],
  why:[
   'lru_cache 按调用时传入的位置参数与关键字参数分别构造缓存键：calc(1, 2) 与 calc(1, b=2) 的缓存键不同，不会合并为同一次命中。',
   '第二次调用 calc(1, 2) 与第一次调用传参形式相同，会直接命中缓存，因此函数体只执行 2 次，命中次数为 1。',
   '',
   'lru_cache 支持带默认参数的函数，只要传入的所有实参都是可哈希（hashable）对象即可正常缓存。'
  ],
  answer:2,
  explain:'lru_cache 直接根据调用时的 *args 和 **kwargs 构造缓存键，不会先按函数签名将默认参数和关键字参数归一化。因此前两次 calc(1, 2) 共享同一缓存键（产生 1 次计算、1 次命中），而 calc(1, b=2) 视为不同缓存键触发第 2 次计算，输出 2 1。'
 },
 {
  id:'py-f-7',
  q:'在 asyncio 中，当一个协程正在执行 await asyncio.sleep(10) 时被外层 asyncio.wait_for(..., timeout=0.1) 超时中断，若该协程内部用 try...finally 包裹了这句 await，会发生什么？',
  options:[
   '在 await 处收到 CancelledError，执行完 finally 块后 wait_for 向外抛出 TimeoutError',
   '协程被底层事件循环直接强制销毁并回收栈帧，协程内部的 finally 清理块没有机会被执行',
   '协程会忽略取消请求继续把 10 秒睡眠跑完，等结束后 wait_for 再向调用方抛出 TimeoutError',
   '在 await 处直接抛出 RuntimeError，如果 finally 块中没有写 return 语句则程序直接异常退出'
  ],
  why:[
   '',
   'asyncio 的取消是协作式的：事件循环通过向协程挂起点注入 CancelledError 来终止任务，因此 try...finally 中的 finally 块依然会正常执行。',
   'wait_for 在达到 0.1 秒超时时会立即取消内部任务，不会傻等 10 秒跑完。',
   '挂起点注入的是 asyncio.CancelledError（在 Python 3.8+ 继承自 BaseException），而不是 RuntimeError。'
  ],
  answer:0,
  explain:'asyncio.wait_for 超时后会调用内部任务的 cancel()，在挂起的 await 处抛出 asyncio.CancelledError 以触发协程内的 finally 清理逻辑，随后 wait_for 捕获该取消状态并向外层调用者抛出 TimeoutError。'
 },
 {
  id:'py-f-8',
  q:'关于标准库 copy 模块的浅拷贝与深拷贝，下面这段构造了自引用列表的代码运行后输出什么？',
  code:'import copy\n\na = [1, [2]]\na.append(a)\nb = copy.copy(a)\nc = copy.deepcopy(a)\nprint(b[1] is a[1], b[2] is a, c[2] is c)',
  options:[
   'True False False',
   'False True True',
   '报 RecursionError',
   'True True True'
  ],
  why:[
   '浅拷贝 b 只复制最外层列表壳子，内部元素引用原样复制：a[2] 指向的是 a，因此 b[2] 同样指向 a（即 b[2] is a 为 True）；而深拷贝 c 会把自引用重构为指向新列表 c 自身。',
   'b 是浅拷贝，不会递归复制嵌套子列表 a[1]，因此 b[1] 与 a[1] 指向同一个列表 [2]，b[1] is a[1] 为 True。',
   'copy.deepcopy 内部维护了一个 memo 字典记录已拷贝对象的 id 到新对象的映射，遇到自引用或循环引用时会直接复用已登记的新对象，不会无限递归。',
   ''
  ],
  answer:3,
  explain:'浅拷贝 b = copy.copy(a) 仅复制顶层列表元素引用，所以 b[1] 仍是 a[1]，b[2] 仍指向原列表 a；深拷贝 copy.deepcopy(a) 通过 memo 字典跟踪已创建的副本，不仅递归复制子列表，还把自引用元素 c[2] 正确重定向到新列表 c 自身，故三项全为 True。'
 },
 {
  id:'py-f-9',
  q:'当我们使用装饰器包装函数，并通过 inspect.signature(func) 检查函数签名时，下面哪项说法正确？',
  options:[
   '一旦内层包装函数写成 def wrapper(*args, **kwargs):，就算加了 @functools.wraps，inspect.signature 也仅返回 (*args, **kwargs)',
   '加了 @functools.wraps(orig) 后，wrapper 会带有 __wrapped__ 属性，inspect.signature 默认会顺着 __wrapped__ 还原出原函数的真实签名',
   'inspect.signature 仅支持检查类方法与实例方法，对普通被装饰的模块顶层函数直接调用时会抛出 ValueError',
   '要想让 inspect.signature 读取到原函数签名，需要借助自定义元类在运行期直接改写函数对象的 __code__ 字节码'
  ],
  why:[
   '@functools.wraps 会把 __wrapped__ 设为被装饰的原函数，inspect.signature 默认 follow_wrapped=True 会自动穿透 wrapper 读取原函数签名。',
   '',
   'inspect.signature 适用于任何可调用对象（普通函数、方法、类、实现了 __call__ 的实例等）。',
   '无需改动 __code__ 字节码，只要正确设置 __wrapped__（通常由 @functools.wraps 自动完成），inspect.signature 即可自动追踪。'
  ],
  answer:1,
  explain:'@functools.wraps(orig) 会在 wrapper 上设置 __wrapped__ = orig；inspect.signature(fn) 默认开启 follow_wrapped=True，会沿着 __wrapped__ 链一路追溯到最内层原函数，从而拿到真实的参数签名与类型注解。'
 },
 {
  id:'py-f-10',
  type:'multi',
  q:'关于 Python 3 的序列解包（Unpacking）与字典合并运算符（| 和 |=），下面哪些说法正确？（多选）',
  options:[
   '执行 first, *middle, last = [10, 20] 时不会报错，其中 first 为 10、last 为 20、middle 为空列表 []',
   '星号解包变量 *middle 的结果类型取决于右侧序列类型，当右侧是元组 (1, 2, 3, 4) 时，middle 也会是元组',
   'Python 3.9+ 支持用 d1 | d2 合并两个字典并返回新字典，当存在同名键时，右侧字典 d2 的值会覆盖左侧 d1 的值',
   '在一个赋值语句左侧可以同时出现两个带星号的接收变量，例如 *a, *b = [1, 2, 3, 4] 会自动平分列表'
  ],
  why:[
   '',
   '无论右侧被解包的是元组、集合、字符串还是生成器，带星号的目标变量（如 *middle）收集到的结果类型都是列表 list。',
   '',
   '同一解包层级左侧最多只允许出现一个带星号的接收变量，写两个 * 变量会因产生歧义直接报 SyntaxError。'
  ],
  answers:[0,2],
  explain:'带星号的解包变量可匹配 0 个或多个元素，且结果统一为 list；Python 3.9+ 引入的 d1 | d2 返回合并后的新字典，同名键以右侧为准。'
 },
 {
  id:'py-f-11',
  type:'multi',
  q:'关于迭代器、生成器与 itertools 标准库工具，下面哪些说法是正确的？（多选）',
  options:[
   '迭代器协议要求对象同时实现 __iter__（返回自身 self）和 __next__（无元素时抛出 StopIteration），因此迭代器本身也是可迭代对象',
   '对无穷生成器或文件流做切片不能直接写 gen[0:5]，但可以使用 itertools.islice(gen, 0, 5) 按需惰性截取前 5 项',
   '生成器函数一旦抛出 StopIteration 耗尽后，只要再调用一次 iter(gen) 就能把它的内部游标重置回开头重新遍历',
   '在模块顶层给函数加上 @deco 装饰器时，deco(func) 会在该模块被导入（函数定义）时立即执行，而不是等到函数被调用时才执行'
  ],
  why:[
   '',
   '',
   '生成器对象是一次性迭代器，iter(gen) 返回的只是同一个已耗尽的 gen 自身，无法重置游标；要重新遍历必须重新调用生成器函数创建新生成器实例。',
   ''
  ],
  answers:[0,1,3],
  explain:'迭代器实现了 __iter__ 返回 self，天然属于 Iterable；生成器不支持下标切片，需用 itertools.islice；装饰器本身在函数定义（模块加载）期运行，返回的 wrapper 才在调用期运行。'
 },
 {
  id:'py-f-12',
  type:'multi',
  q:'关于面向对象设计、数据模型与弱引用（weakref），下面哪些说法是正确的？（多选）',
  options:[
   '在父类中用 @classmethod 编写备选构造工厂方法（内部调用 cls(...)），当子类调用该类方法时会自动创建子类的实例',
   '__repr__ 的设计目标是提供面向开发者的明确、无歧义的对象表示，而 __str__ 面向终端用户提供可读性友好的文本',
   'weakref.ref(obj) 或 WeakValueDictionary 可以持有对象引用而不增加其引用计数，适合构建不会阻碍对象被回收的内存缓存',
   '类的实例若要表现得像函数一样可以直接加圆括号调用（即 obj()），需要在其所属类中定义 __call__ 魔术方法'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'四个选项全部正确：@classmethod 通过 cls 参数天然支持继承多态构造；__repr__ 与 __str__ 分工明确；weakref 不会增加 PyObject 引用计数；__call__ 赋予实例可调用（Callable）能力。'
 },
 {
  id:'py-f-13',
  type:'multi',
  q:'关于现代 Python 工程化工具链（pathlib、pyproject.toml、pytest、cProfile），下面哪些说法正确？（多选）',
  options:[
   'pathlib.Path 使用 / 运算符拼接路径时，只会固定拼接正斜杠 "/"，因此在 Windows 系统上无法正确访问本地文件',
   'pyproject.toml 是 PEP 518/621 标准化的项目配置文件，可以集中管理项目依赖、构建后端以及 pytest、ruff、mypy 等工具配置',
   '使用 @pytest.mark.parametrize("x,expected", [(1, 2), (3, 6)]) 时，如果第一组参数断言失败，pytest 会跳过后续参数组合不再运行',
   '当发现程序运行缓慢时，应先借助 cProfile 或 py-spy 等剖析工具定位真正的 CPU/调用耗时热点，再针对瓶颈做优化'
  ],
  why:[
   'pathlib.Path 重载了 /（__truediv__）运算符，会根据当前操作系统自动生成 WindowsPath 或 PosixPath 并处理对应平台的分隔符。',
   '',
   'parametrize 会把每组参数展开为独立的测试用例条目，第一组失败不会阻止其余参数组合继续独立执行并报告结果。',
   ''
  ],
  answers:[1,3],
  explain:'pyproject.toml 是现代 Python 项目的统一配置中心；性能优化应遵循“先用 cProfile 测量剖析，再针对热点优化”；pathlib.Path 跨平台自动适配路径分隔符；pytest.mark.parametrize 各组用例彼此独立执行。'
 },
 {
  id:'py-f-14',
  type:'multi',
  q:'关于 Python 多线程、多进程与 asyncio 并发协作，下面哪些说法是正确的？（多选）',
  options:[
   '标准库 queue.Queue 内部已经集成了线程锁与条件变量，适合在多个操作系统线程之间安全地传递任务与结果',
   'asyncio.Queue 也是线程安全的，因此可以在后台工作线程中直接调用 async_q.put_nowait(item) 向主线程事件循环投递数据',
   '若要在后台工作线程中向运行在主线程的 asyncio 事件循环安全调度协程，应使用 loop.call_soon_threadsafe 或 asyncio.run_coroutine_threadsafe',
   '使用 with ThreadPoolExecutor(max_workers=4) as pool: 时，离开 with 块会自动调用 shutdown(wait=True) 等待已提交任务执行完毕'
  ],
  why:[
   '',
   'asyncio.Queue 专为单线程事件循环内的协程协作设计，并非线程安全（Not thread-safe），跨线程直接操作会破坏其内部状态。',
   '',
   ''
  ],
  answers:[0,2,3],
  explain:'queue.Queue 面向多线程同步且线程安全；asyncio.Queue 仅限同一事件循环线程内使用，跨线程与事件循环交互需使用 call_soon_threadsafe 或 run_coroutine_threadsafe；Executor 的上下文管理器退出时默认 wait=True。'
 },
 {
  id:'py-f-15',
  type:'multi',
  q:'关于 CPython 底层机制与元编程原理，下面哪些说法是正确的？（多选）',
  options:[
   '在 Python 中，普通类本身也是对象，默认都是元类 type 的实例，可以用 type(name, bases, namespace) 在运行期动态创建新类',
   '标准库 dis 模块（如 dis.dis(func)）可以把 Python 函数的字节码反汇编为人类可读的指令序列，便于分析底层执行步骤',
   '对大量重复出现的动态标识符或字典键字符串手动调用 sys.intern(s)，可复用同一字符串对象并加速驻留字符串之间的相等比较',
   '定义在类体中的普通函数之所以在通过实例调用 obj.fn() 时会自动传入 self，是因为函数对象实现了非数据描述符的 __get__ 方法'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'四个选项全部正确：type 既是查看类型的函数也是默认的元类；dis 用于检视 CPython 字节码；sys.intern 强制驻留字符串以节省内存并加速比较；函数对象的 __get__ 描述符协议正是实例方法自动绑定 self 的底层机制。'
 },
 {
  id:'py-f-16',
  type:'judge',
  q:'因为元组（tuple）在 Python 中是不可变序列类型，所以任意一个 tuple 实例都是可哈希（hashable）的，都可以直接作为 dict 的键或放入 set 中。',
  answer:false,
  explain:'元组可哈希的前提是其包含的所有元素也都可哈希；如果元组内部包含了列表或字典等不可哈希对象（如 (1, [2, 3])），调用 hash() 会抛出 TypeError: unhashable type: "list"。'
 },
 {
  id:'py-f-17',
  type:'judge',
  q:'在自定义上下文管理器中，如果 with 代码块内部抛出了异常，且 __exit__(self, exc_type, exc_val, exc_tb) 方法显式返回了真值（如 True），则该异常会被吞掉（抑制），程序继续执行 with 块之后的语句。',
  answer:true,
  explain:'上下文管理协议规定：当 with 块内发生异常时，异常信息会传给 __exit__；若 __exit__ 返回 True，解释器认为异常已被妥善处理并压制该异常；若返回 False 或 None，异常会在 __exit__ 结束后继续向外抛出。'
 },
 {
  id:'py-f-18',
  type:'judge',
  q:'调用一个包含 yield 关键字的生成器函数（如 g = count_up(5)）时，函数体内的代码会立即开始执行，直到遇到第一个 yield 语句才暂停并返回生成器对象。',
  answer:false,
  explain:'调用生成器函数 g = count_up(5) 时，函数体内的代码一行都不会执行，只是立即创建并返回一个生成器对象；直到首次对 g 调用 next(g) 或 send(None) 时，函数体才开始执行到第一个 yield。'
 },
 {
  id:'py-f-19',
  type:'judge',
  q:'Python 类中定义的普通函数对象天生实现了 __get__ 描述符协议（属于非数据描述符）：通过类访问 Cls.fn 得到原函数，通过实例访问 obj.fn 则触发 __get__ 返回自动绑定了 obj 的绑定方法（Bound Method）。',
  answer:true,
  explain:'在 Python 中，函数对象（function）带有 __get__ 方法但没有 __set__ 方法，是非数据描述符。obj.fn 会调用 Cls.__dict__["fn"].__get__(obj, Cls)，将实例 obj 封装为绑定方法的第一个参数 self。'
 },
 {
  id:'py-f-20',
  type:'fill',
  q:'在定义需要创建百万级实例的轻量数据类时，可以在类体中显式声明类属性 ＿ = ("x", "y")，告诉解释器用固定大小的紧凑数组替代每个实例的 __dict__ 字典，从而大幅降低内存占用。',
  accepted:['__slots__'],
  explain:'声明 __slots__ 后，CPython 不再为每个实例分配哈希表字典 __dict__，而是按固定偏移槽位存储属性并通过成员描述符访问，显著节省内存并略微提升属性访问速度。'
 },
 {
  id:'py-f-21',
  type:'fill',
  q:'在 except 块中将底层异常包装为业务异常向外抛出时，为了显式保留原始异常因果链（即设置新异常的 __cause__ 属性），应使用语法：raise ServiceError("查询失败") ＿ err。',
  accepted:['from'],
  explain:'raise NewException(...) from original_err 是 PEP 3134 引入的显式异常链语法，能将 original_err 记录到新异常的 __cause__ 属性中，方便排查根因。'
 },
 {
  id:'py-f-22',
  type:'fill',
  q:'在 Python 数据模型中，若希望仅在常规属性查找链（数据描述符、实例字典、类属性）全部未找到属性时才触发动态兜底逻辑，应该在类中实现魔术方法 ＿(self, name)。',
  accepted:['__getattr__'],
  explain:'__getattr__(self, name) 只有在常规属性查找抛出 AttributeError 后才会被解释器调用，非常适合实现按需代理、动态属性转发或友好报错，且不会拖慢已有正常属性的访问。'
 },
 {
  id:'py-f-23',
  type:'fill',
  q:'在 CPython 的标准库 gc 模块中，若要在批处理大对象或断开复杂容器循环引用后立即手动触发一次完整的垃圾回收扫描，可以调用函数 gc.＿()。',
  accepted:['collect'],
  explain:'gc.collect() 会立即执行一次跨三代（或指定代）的循环引用垃圾回收，并返回本次回收发现并清理的不可达（unreachable）对象数量。'
 },
 {
  id:'py-f-24',
  type:'short',
  q:'结合 Python 对象引用模型，说明浅拷贝（copy.copy）与深拷贝（copy.deepcopy）在处理嵌套可变容器时的本质区别；并解释当被拷贝对象内部存在自引用（如 a = []; a.append(a)）时，deepcopy 是如何避免无限递归的？',
  reference:'1. 浅拷贝与深拷贝的区别：\n- 浅拷贝（copy.copy）只为最外层容器分配一个新壳子，但容器内部的元素引用直接从原容器复制过来；如果内部包含可变子对象（如嵌套列表、字典），原地修改子对象会同时反映在原容器和浅拷贝容器上。\n- 深拷贝（copy.deepcopy）不仅复制最外层容器，还会递归地为内部所有嵌套可变子对象创建全新的独立副本，使新旧对象树在可变状态上彻底隔离。\n2. deepcopy 避免循环引用无限递归的机制：\ncopy.deepcopy(x, memo=None) 内部维护了一个 memo 字典（键为原对象的内存标识 id(obj)，值为已经创建好的新副本对象引用）。在拷贝任意容器时，先创建空的新容器并立即登记到 memo[id(orig)] = new_obj，然后再递归拷贝其子元素；一旦遇到已经存在于 memo 中的对象（如自引用或双向引用环），直接从 memo 取出对应的新对象引用返回，从而在 O(N) 步内安全还原出同构的引用环。',
  points:[
   '说明浅拷贝仅复制顶层容器壳子、共享内部嵌套子对象引用，而深拷贝递归复制所有层级的嵌套可变对象',
   '指出 deepcopy 内部通过维护 memo 字典（记录原对象 id 到新副本对象的映射）来跟踪已拷贝对象',
   '说明遇到自引用或循环引用时，deepcopy 直接从 memo 字典复用已登记的新副本引用，从而终止递归并保留环状结构'
  ],
  explain:'deepcopy 的 memo 字典既是避免循环引用导致 RecursionError 的安全阀，也是保证原本共享同一子对象的多处引用在深拷贝后依然共享同一新子对象的关键。'
 },
 {
  id:'py-f-25',
  type:'short',
  q:'说明装饰器在“模块导入（函数定义）阶段”与“被装饰函数调用阶段”分别执行什么逻辑；如果希望编写一个既支持不带括号 @trace 又支持带参数 @trace(prefix="API") 的双模式装饰器，应该如何利用可选的位置参数实现？',
  reference:'1. 两个阶段的执行分工：\n- 模块导入（函数定义）阶段：当解释器执行到 @deco 下的 def func(): 时，会立即调用装饰器函数本身 func = deco(func)，完成闭包绑定、元数据复制（@wraps）并返回包装函数 wrapper。\n- 函数调用阶段：后续业务代码每次调用 func(*args, **kwargs) 时，实际执行的都是装饰器当初返回的 wrapper(*args, **kwargs)，从而在调用前后插入增强逻辑。\n2. 双模式装饰器的设计方法：\n将装饰器签名设计为 def trace(func=None, *, prefix="LOG"):（把可选被装饰函数 func 设为默认值 None，其余配置参数用 * 设为仅限关键字参数）：\n- 当使用不带括号的 @trace 时，Python 会把被装饰函数作为第一个位置参数传入，此时 func is not None，直接构造并返回 wrapper(func)；\n- 当使用带参数的 @trace(prefix="API") 时，func 为默认的 None，此时返回一个单参数闭包 decorator(f)（或 return functools.partial(trace, prefix=prefix)），由它接收被装饰函数并返回 wrapper。',
  points:[
   '区分执行时机：装饰器外层函数在模块导入/定义期立即执行一次，返回的 wrapper 在每次业务调用期执行',
   '给出双模式签名设计：def trace(func=None, *, prefix="LOG"):，通过仅限关键字参数隔离配置项与 func',
   '说明分支逻辑：当 func 不为 None（无括号 @trace）时直接返回包装后的 wrapper，当 func 为 None（带括号传参）时返回内层 decorator'
  ],
  explain:'利用 func=None 配合仅限关键字参数 *，是标准库（如 @dataclass 和 @dataclass(frozen=True)）实现“无参有参皆可装饰”的经典写法。'
 },
 {
  id:'py-f-26',
  type:'short',
  q:'为什么 CPython 的内存管理要采用“引用计数为主、分代垃圾回收（Generational GC）为辅”的混合机制，而不是只用其中一种？另外，当我们自定义一个需要放入 set 或作为 dict 键的值对象（Value Object）类时，在 __eq__、__hash__ 与不可变性设计上必须遵守哪些原则？',
  reference:'1. 引用计数 + 分代 GC 混合机制的原因：\n- 引用计数的优势是实时性与确定性：一旦对象引用计数降为 0，内存立即释放，且开销平摊在日常赋值与销毁中，不会产生长时间全局停顿；但它的致命缺陷是无法回收“容器对象之间的循环引用”（彼此引用计数均 >= 1）。\n- 分代 GC（基于弱代假说，将容器对象按存活代数分为 0/1/2 三代）专门负责周期性扫描容器对象图，通过引用计数副本扣减（减去内部环引用）识别并打破孤立的循环引用。两者结合既获得了绝大多数对象的即时回收，又兜底解决了循环引用内存泄漏。\n2. 自定义可哈希值对象的原则：\n- 一致性定律：重写 __eq__ 后，由于 Python 会默认把 __hash__ 置为 None，必须同时显式实现 __hash__，且严格保证“若 a == b 为 True，则 hash(a) == hash(b) 必须相等”；\n- 参与比较与哈希的字段一致：__hash__ 应基于 __eq__ 所比较的那组核心字段组合计算，例如 return hash((self.x, self.y))；\n- 保持对象不可变性：用于计算哈希值的属性在实例创建后绝不能再被修改（可通过私有属性 + 只读 @property 或 @dataclass(frozen=True) 实现），否则对象放入 set/dict 后一旦属性变更导致哈希值改变，将无法在哈希桶中再次被正确查找到。',
  points:[
   '说明引用计数具备引用归零即刻释放的实时确定性，但无法独立解决容器对象间的循环引用问题',
   '说明分代 GC 基于弱代假说周期性扫描容器链表，专门负责检测并回收孤立的循环引用环',
   '指出重写 __eq__ 会使 __hash__ 默认变为 None，作为 dict/set 键必须同时实现 __hash__ 并保证 a == b 时 hash(a) == hash(b)',
   '强调参与 __eq__ 和 __hash__ 计算的字段必须保持不可变（如只读 @property 或 frozen=True），防止放入哈希表后哈希值漂移'
  ],
  explain:'理解了“引用计数管即时、分代 GC 管循环环”以及“哈希契约要求参与比较的字段不可变”，就打通了 Python 数据模型与底层内存管理的核心脉络。'
 },
 {
  id:'py-f-27',
  type:'short',
  q:'在一个基于 asyncio 的 Python 高并发后端服务中，主流程以异步网络 I/O 为主，但中途既要调用一个没有异步版本的遗留同步磁盘/网络库，又要执行一段耗时 200ms 的纯 Python CPU 密集型解析计算。请说明这两类操作为什么不能直接在 async def 中裸调，应当分别如何接入事件循环？并说明在 pytest 中如何对该异步服务做隔离单元测试。',
  reference:'1. 不能直接裸调的原因：asyncio 事件循环在单线程内靠协程主动在 await 处让出控制权来调度并发。如果在 async def 中直接执行同步阻塞 I/O 或耗时 200ms 的纯 CPU 计算，整个事件循环线程会被卡住，期间所有其他并发连接的心跳、超时和收发都会停滞。\n2. 正确接入方式：\n- 针对遗留同步阻塞 I/O 库：阻塞等待期间底层会释放 GIL，适合使用 await asyncio.to_thread(legacy_io_fn, *args)（或 loop.run_in_executor(thread_pool, ...)）卸载到后台线程池执行；\n- 针对 200ms 纯 Python CPU 密集型计算：由于受 GIL 限制，放进线程池依然会与主线程争抢同一个 GIL 从而拖慢事件循环响应，应预先创建全局 ProcessPoolExecutor，通过 await loop.run_in_executor(process_pool, cpu_heavy_fn, data) 卸载到独立工作进程中并行计算。\n3. pytest 隔离单元测试方案：\n- 使用 pytest-asyncio 插件（标记 @pytest.mark.asyncio）在独立测试事件循环中直接驱动 async def 测试用例；\n- 利用 monkeypatch 或 unittest.mock.AsyncMock 替掉真实的外部网络请求与进程池调用，并用 @pytest.fixture 的 yield 机制负责测试前后的连接池/执行器启停清理。',
  points:[
   '说明事件循环是单线程协作式调度，直接运行同步阻塞 I/O 或长耗时 CPU 计算会阻塞整个事件循环线程',
   '指出同步阻塞 I/O 在等待时释放 GIL，应通过 await asyncio.to_thread（或 ThreadPoolExecutor）卸载到线程池',
   '指出纯 Python CPU 密集型任务受 GIL 制约，应通过 loop.run_in_executor 配合 ProcessPoolExecutor 卸载到进程池',
   '说明测试层可结合 pytest-asyncio 驱动协程用例，并用 monkeypatch / AsyncMock 及 fixture 隔离外部依赖'
  ],
  explain:'异步服务的黄金法则是“绝不阻塞事件循环线程”：异步 I/O 直接 await，同步 I/O 走 to_thread 线程池，重度 CPU 走 run_in_executor 进程池。'
 },
 {
  id:'py-f-28',
  type:'code',
  q:'编写一个基于类的上下文管理器 TimerContext(label)：支持 with TimerContext("query") as timer: 语法。要求在 __enter__ 中使用 time.perf_counter() 记录起始时间并返回 self；在 __exit__ 中计算耗时（秒）存入 self.elapsed，若 with 块内未发生异常则打印 "{label} ok: {elapsed:.4f}s"，若发生异常则打印 "{label} failed: {exc_type.__name__}" 且不吞掉该异常（让异常正常向外传播）。写出测试代码演示。',
  reference:'import time\n\nclass TimerContext:\n    def __init__(self, label):\n        self.label = label\n        self.start = 0.0\n        self.elapsed = 0.0\n\n    def __enter__(self):\n        self.start = time.perf_counter()\n        return self\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        self.elapsed = time.perf_counter() - self.start\n        if exc_type is None:\n            print(f"{self.label} ok: {self.elapsed:.4f}s")\n        else:\n            print(f"{self.label} failed: {exc_type.__name__}")\n        return False\n\nif __name__ == "__main__":\n    with TimerContext("calc") as t:\n        total = sum(range(10000))\n    print("recorded:", t.elapsed >= 0)',
  points:[
   '__enter__ 使用高精度计时器 time.perf_counter() 记录起点并返回 self 以绑定 as 变量',
   '__exit__(self, exc_type, exc_val, exc_tb) 计算耗时并保存到实例属性 self.elapsed',
   '根据 exc_type is None 区分正常结束与异常退出的日志打印格式（异常时输出 exc_type.__name__）',
   '__exit__ 显式返回 False（或 None），确保 with 块内的异常不会被静默吞掉'
  ],
  explain:'衡量时间间隔应优先选用单调高精度时钟 time.perf_counter() 而非受系统时间校时影响的 time.time()；__exit__ 返回 False 可保证异常继续向上传播。'
 },
 {
  id:'py-f-29',
  type:'code',
  q:'基于标准库 collections.OrderedDict 实现一个时间复杂度为 O(1) 的 LRU 缓存类 SimpleLRUCache(capacity)：\n1. get(key, default=None)：若 key 存在，将其标记为最近使用并返回对应值；否则返回 default；\n2. put(key, value)：若 key 已存在则更新值并标记为最近使用；若不存在则插入，且当容量超过 capacity 时自动淘汰最久未使用的键值对。\n最后写出测试代码验证访问刷新与淘汰顺序。',
  reference:'from collections import OrderedDict\n\nclass SimpleLRUCache:\n    def __init__(self, capacity):\n        if capacity <= 0:\n            raise ValueError("capacity must be positive")\n        self.capacity = capacity\n        self.store = OrderedDict()\n\n    def get(self, key, default=None):\n        if key not in self.store:\n            return default\n        self.store.move_to_end(key)\n        return self.store[key]\n\n    def put(self, key, value):\n        if key in self.store:\n            self.store.move_to_end(key)\n        self.store[key] = value\n        if len(self.store) > self.capacity:\n            self.store.popitem(last=False)\n\nif __name__ == "__main__":\n    cache = SimpleLRUCache(2)\n    cache.put("a", 1)\n    cache.put("b", 2)\n    print(cache.get("a"))  # 刷新 a，"b" 成为最久未使用\n    cache.put("c", 3)      # 淘汰 "b"\n    print(cache.get("b"), cache.get("c"))',
  points:[
   '使用 collections.OrderedDict 维护键值对的访问先后顺序并校验 capacity > 0',
   'get(key, default=None) 命中时调用 move_to_end(key) 将其移至队尾（标记为最近使用），未命中返回 default',
   'put(key, value) 在键已存在时先或后调用 move_to_end(key) 更新顺序与值',
   '当 len(self.store) > self.capacity 时调用 popitem(last=False) 以 O(1) 弹出队首最久未使用的项'
  ],
  explain:'OrderedDict 底层采用哈希表加双向链表实现，move_to_end(key) 和 popitem(last=False) 都是严格的 O(1) 操作，是面试手写 Python LRU Cache 最地道简洁的实现。'
 },
 {
  id:'py-f-30',
  type:'code',
  q:'编写一个异步超时重试包装函数 fetch_with_retry(coro_fn, retries=3, timeout=0.2, base_delay=0.05)：每次尝试调用无参协程工厂 coro_fn() 创建新协程，并用 asyncio.wait_for(..., timeout=timeout) 限制单次超时；若抛出 TimeoutError 或 RuntimeError 且尚未达到 retries 次上限，则按 base_delay * (2 ** attempt) 进行异步指数退避等待（await asyncio.sleep(...)）后重试；一旦成功立即返回结果，若全部尝试失败则抛出最后一次捕获的异常。附带 main 测试演示。',
  reference:'import asyncio\n\nasync def fetch_with_retry(coro_fn, retries=3, timeout=0.2, base_delay=0.05):\n    if retries < 1:\n        raise ValueError("retries must be >= 1")\n    last_err = None\n    for attempt in range(retries):\n        try:\n            return await asyncio.wait_for(coro_fn(), timeout=timeout)\n        except (TimeoutError, asyncio.TimeoutError, RuntimeError) as err:\n            last_err = err\n            if attempt + 1 < retries:\n                await asyncio.sleep(base_delay * (2 ** attempt))\n    raise last_err\n\nasync def main():\n    count = 0\n    async def unstable_job():\n        nonlocal count\n        count += 1\n        if count < 3:\n            await asyncio.sleep(0.5)\n        return "ok-on-3"\n\n    result = await fetch_with_retry(unstable_job, retries=3, timeout=0.1, base_delay=0.02)\n    print(result, count)\n\nif __name__ == "__main__":\n    asyncio.run(main())',
  points:[
   '每次循环内调用 coro_fn() 生成全新的协程对象（因为同一个已消费的 coroutine 对象不能重复 await）',
   '使用 await asyncio.wait_for(coro_fn(), timeout=timeout) 控制单次调用的超时上限',
   '捕获超时与 RuntimeError，在未达最后一次尝试时使用 await asyncio.sleep(base_delay * (2 ** attempt)) 实现非阻塞指数退避',
   '成功时立即 return 结果，全部重试耗尽后将最后一次捕获的异常重新 raise'
  ],
  explain:'异步重试最容易踩的坑是直接传入一个已经创建好的 coroutine 对象反复 await（会报 RuntimeError: cannot reuse already awaited coroutine），因此必须接收可调用的协程工厂函数 coro_fn 并在每轮重试时重新调用 coro_fn()。'
 }
];
