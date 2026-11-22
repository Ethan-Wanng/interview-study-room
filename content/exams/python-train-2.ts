import type {AiQuiz} from '../journey';

// Python「进阶」阶段训练：面向对象与 dataclass、异常与文件上下文管理器、模块工程与常用标准库、迭代器与生成器、闭包装饰器与类型注解。题目全新，比关卡更综合、更易踩坑。
export const pythonTrain2:AiQuiz[]=[
 {
  id:'py-x2-1',
  q:'下面这段关于类属性与实例属性的代码运行后输出什么？',
  code:'class Worker:\n    tags = []\n    count = 0\n\nw1 = Worker()\nw2 = Worker()\nw1.tags.append("py")\nw1.count += 1\nprint(w2.tags, w2.count, Worker.count)',
  options:['[\'py\'] 1 1','[] 0 0','[\'py\'] 0 0','[] 1 0'],
  why:['w1.count += 1 等价于 w1.count = w1.count + 1，会在实例 w1 的 __dict__ 上新建同名实例属性，不会修改 Worker.count 和 w2.count。','w1.tags.append("py") 是对类属性列表的原地修改，没有给 w1 重新绑定新列表，因此 w2.tags 也会看到 [\'py\']。','','tags 是原地修改共享类属性，而 count += 1 是给实例 w1 绑定新属性，两者的行为刚好相反。'],
  answer:2,
  explain:'w1.tags.append("py") 直接原地修改了类属性 Worker.tags 指向的列表，所有未遮蔽该属性的实例都会看到 [\'py\']；而整数不可变，w1.count += 1 会在 w1 自身创建实例属性 count = 1，类属性 Worker.count 与 w2.count 仍为 0。'
 },
 {
  id:'py-x2-2',
  q:'下面这段菱形继承代码运行后的输出是什么？',
  code:'class A:\n    def run(self):\n        return "A"\n\nclass B(A):\n    def run(self):\n        return "B->" + super().run()\n\nclass C(A):\n    def run(self):\n        return "C->" + super().run()\n\nclass D(B, C):\n    def run(self):\n        return "D->" + super().run()\n\nprint(D().run())',
  options:['D->B->A','D->B->C->A','D->C->B->A','D->B->A->C->A'],
  why:['super() 不是简单调用父类 A，而是按照当前实例所属类 D 的 MRO 顺序查找下一个类，B 的下一站是 C。','','D(B, C) 的 MRO 线性化顺序是 [D, B, C, A, object]，因此先走 B 再走 C。','C3 线性化保证公共基类 A 在所有子类 B、C 之后只被调用一次，不会出现两次 A。'],
  answer:1,
  explain:'D 的方法解析顺序（MRO）为 D -> B -> C -> A -> object。super() 动态沿着 self 所属类的 MRO 链向后委派，因此 B.run() 中的 super().run() 会调用 MRO 中排在 B 后面的 C.run()，最终输出 D->B->C->A。'
 },
 {
  id:'py-x2-3',
  q:'运行下面这段包含 @classmethod 与 @staticmethod 的继承代码，输出是什么？',
  code:'class Base:\n    @classmethod\n    def make(cls):\n        return f"make:{cls.__name__}"\n\n    @staticmethod\n    def label():\n        return "label:Base"\n\nclass Sub(Base):\n    pass\n\nprint(Sub.make(), Sub.label())',
  options:['make:Base label:Base','make:Sub label:Sub','make:Base label:Sub','make:Sub label:Base'],
  why:['@classmethod 的第一个参数 cls 会自动绑定为实际发起调用的子类 Sub，因此 cls.__name__ 是 "Sub"。','@staticmethod 不接收 cls 或 self，内部返回固定字面量 "label:Base"，通过子类调用也不会变为 Sub。','make 是类方法，cls 会绑定为 Sub；label 是静态方法，保持 Base，两个方法的输出刚好写反。',''],
  answer:3,
  explain:'@classmethod 会将第一个参数 cls 绑定为调用时的实际类（通过 Sub.make() 调用时 cls 就是 Sub），非常适合编写能自动返回子类实例的备选构造器；@staticmethod 则不绑定类或实例。'
 },
 {
  id:'py-x2-4',
  type:'multi',
  q:'关于 Python 的 @property、@dataclass 与鸭子类型，下面哪些说法正确？（多选）',
  options:['在 @dataclass 中给字段设置可变默认值应使用 field(default_factory=list)，直接写 items: list = [] 会抛 ValueError','@dataclass 自动生成的类不支持再定义任何普通的实例方法或 @property 计算属性','@dataclass(frozen=True) 会让实例成为只读对象，尝试修改其属性会抛出 FrozenInstanceError','鸭子类型关注对象是否具备所需的方法或行为特征，而不强制要求继承自同一个基类'],
  why:['','@dataclass 只是自动生成 __init__、__repr__、__eq__ 等样板方法，类体内依然可以自由定义任意普通方法或 @property。','',''],
  answers:[0,2,3],
  explain:'dataclass 禁止直接用可变对象字面量做默认值以防跨实例共享；frozen=True 可生成不可变实例；dataclass 完全支持自定义方法与 @property；鸭子类型强调行为契约而非继承层级。'
 },
 {
  id:'py-x2-5',
  type:'judge',
  q:'在 @property 装饰的方法 def price(self): 内部，直接写 return self.price 即可返回实例底层的同名属性，不会引发无限递归。',
  answer:false,
  explain:'一旦定义了 @property def price(self):，在方法体内访问 self.price 会再次触发该 getter 属性本身，导致无限递归并抛出 RecursionError；底层数据应当存放在单下划线私有属性（如 self._price）中。'
 },
 {
  id:'py-x2-6',
  q:'下面这段包含 try / except / else / finally 的代码运行后输出什么？',
  code:'def run(x):\n    log = []\n    try:\n        res = 10 // x\n    except ZeroDivisionError:\n        log.append("err")\n    else:\n        log.append(f"ok:{res}")\n    finally:\n        log.append("end")\n    return ",".join(log)\n\nprint(run(2), "|", run(0))',
  options:['ok:5,end | err,end','ok:5,err | err,end','err,ok:5,end | err,end','ok:5,end | err,ok:0,end'],
  why:['','run(2) 中 10 // 2 未抛异常，不会进入 except 分支追加 "err"，末尾则会进入 finally 追加 "end"。','else 子句仅在 try 块没有抛出任何异常时执行，except 与 else 在同一次执行中互斥。','run(0) 触发了 ZeroDivisionError 并进入 except 分支，此时 else 分支会被跳过。'],
  answer:0,
  explain:'try 块未抛异常时跳过 except、执行 else，最后执行 finally；try 块抛出异常并被 except 捕获时，跳过 else，最后同样执行 finally。'
 },
 {
  id:'py-x2-7',
  q:'下面这段自定义上下文管理器的代码运行后输出什么？',
  code:'class Guard:\n    def __enter__(self):\n        print("in", end=" ")\n        return self\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        print("out", end=" ")\n        return exc_type is ValueError\n\nwith Guard():\n    print("work", end=" ")\n    raise ValueError("bad")\nprint("after")',
  options:['in work out 随后抛出未捕获的 ValueError','in work 随后直接抛出 ValueError，不打印 out','in work out after','in out work after'],
  why:['__exit__ 在 exc_type is ValueError 时返回了 True，告诉解释器该异常已被压制处理，不会继续向外抛出。','即使 with 块内抛出异常，Python 也会保证调用 __exit__ 执行清理，因此 out 会正常打印。','','__enter__ 在进入 with 块时执行，__exit__ 在离开 with 块（或块内抛异常）时才执行，顺序是 in -> work -> out。'],
  answer:2,
  explain:'上下文管理器的 __exit__ 方法若返回真值（True），表示 with 块内抛出的异常已被吞掉（压制），程序不会中断，而是正常继续执行 with 语句块后面的 print("after")。'
 },
 {
  id:'py-x2-8',
  q:'下面这段使用 pathlib.Path 处理文件路径的代码，输出是什么？',
  code:'from pathlib import Path\n\np = Path("/var/log") / "archive.tar.gz"\nprint(p.stem, p.suffix, p.with_suffix(".bak").name)',
  options:['archive .tar.gz archive.bak','archive.tar .gz archive.tar.bak','archive .gz archive.bak','archive.tar .tar.gz archive.tar.bak'],
  why:['Path.suffix 只返回最后一个点号起的扩展名 ".gz"，因此 stem 是去掉最后一个扩展名后的 "archive.tar"。','','多段扩展名如 "archive.tar.gz" 中，with_suffix(".bak") 只替换最末尾的 ".gz"，保留 ".tar"。','p.suffix 是最后一个后缀 ".gz"；若要获取所有后缀列表应使用 p.suffixes（返回 [\'.tar\', \'.gz\']）。'],
  answer:1,
  explain:'pathlib.Path 的 suffix 属性仅指最末尾的扩展名（".gz"），stem 是文件名去掉最后一个 suffix 后的部分（"archive.tar"），with_suffix(".bak") 也只替换最后一个后缀，故新文件名为 "archive.tar.bak"。'
 },
 {
  id:'py-x2-9',
  type:'multi',
  q:'关于 Python 异常处理、json 模块与上下文管理器，下面哪些说法正确？（多选）',
  options:['try...except...else 结构中，如果 else 子句内部抛出了异常，会被前面的 except 子句自动捕获','except Exception: 可以捕获绝大多数业务异常，但不会拦截 KeyboardInterrupt 和 SystemExit','使用 @contextmanager 时，即使不用 try...finally 包裹 yield，with 块抛异常也会执行 yield 后的清理代码','json.dumps(data, ensure_ascii=False) 可以让字典里的中文字符原样输出，而不是转义为 \\uXXXX'],
  why:['else 块的设计初衷就是只保护 try 块里的代码，else 块内部抛出的异常不会被同一层的 except 捕获。','','with 块抛出的异常会在生成器的 yield 处重新抛出，若不用 try...finally 包裹 yield，生成器会直接异常终止而跳过后续清理代码。',''],
  answers:[1,3],
  explain:'KeyboardInterrupt 与 SystemExit 直接继承自 BaseException 而非 Exception；else 块异常不归同级 except 管；@contextmanager 的 yield 必须配合 try...finally 才能保证异常时清理；ensure_ascii=False 可直接输出非 ASCII 文本。'
 },
 {
  id:'py-x2-10',
  type:'judge',
  q:'使用 @contextlib.contextmanager 编写生成器上下文管理器时，必须用 try...finally 包裹 yield 语句，才能确保 with 块内抛出异常时仍然执行 yield 之后的资源释放代码。',
  answer:true,
  explain:'当 with 块内发生异常时，上下文管理器会通过 generator.throw() 把该异常抛回 yield 暂停处；如果没有 try...finally，生成器会在 yield 处立即向外冒泡异常并结束，不会执行 yield 后面的清理逻辑。'
 },
 {
  id:'py-x2-11',
  type:'fill',
  q:'在 except 块中使用 raise ServiceError("转换失败") from err 显式链接异常原因时，原始异常 err 会被自动绑定到新异常实例的 ＿ 属性上。',
  accepted:['__cause__'],
  explain:'raise NewException from err 会将显式原因保存在新异常的 __cause__ 属性中；若写 raise NewException from None 则会压制异常上下文显示。'
 },
 {
  id:'py-x2-12',
  q:'假设模块 config.py 内容为 `PORT = 8000` 和 `def update(p): global PORT; PORT = p`。主程序执行下面代码后输出什么？',
  code:'import config\nfrom config import PORT, update\n\nupdate(9000)\nprint(PORT, config.PORT)',
  options:['9000 9000','8000 8000','9000 8000','8000 9000'],
  why:['from config import PORT 是在导入时刻把当前的主程序局部变量 PORT 绑定到了整数对象 8000 上，后续模块内重新绑定不会同步更新它。','update(9000) 已经通过 global 修改了 config 模块命名空间里的 PORT，因此 config.PORT 会变成 9000。','主程序直接引用的本地名称 PORT 仍指向旧对象 8000，通过模块属性访问的 config.PORT 才是新值 9000。',''],
  answer:3,
  explain:'from config import PORT 相当于在当前作用域执行了 PORT = config.PORT（绑定到整数 8000）。调用 update(9000) 让 config.PORT 重新指向了 9000，但当前模块里的名字 PORT 仍指向 8000。跨模块读取可能被重新赋值的配置变量时，应通过 config.PORT 访问。'
 },
 {
  id:'py-x2-13',
  q:'下面这段使用正则表达式匹配 HTML 标签的代码，运行后输出什么？',
  code:'import re\n\ntext = "<span>hi</span><span>ok</span>"\ngreedy = re.findall(r"<(.*)>", text)\nlazy = re.findall(r"<(.*?)>", text)\nprint(len(greedy), lazy)',
  options:['1 [\'span\', \'/span\', \'span\', \'/span\']','4 [\'span\', \'ok\']','2 [\'span\', \'/span\']','1 [\'<span>\', \'</span>\', \'<span>\', \'</span>\']'],
  why:['','贪婪模式 r"<(.*)>" 会从第一个 < 一直吞到最后一个 >，只产生 1 个匹配项 "span>hi</span><span>ok</span"。','text 中共有 4 个尖括号标签，非贪婪模式 r"<(.*?)>" 会逐一匹配每个标签，返回 4 个元素。','圆括号 (.*?) 是捕获组，re.findall 在模式含有单个捕获组时只返回括号内捕获的内容，不含外侧的 < 和 >。'],
  answer:0,
  explain:'默认量词 .* 是贪婪的，会从首字符 < 一直匹配到末尾最后一个 >，因此 greedy 只有 1 个结果；.*? 是非贪婪（懒惰）量词，遇到最近的 > 就停止，配合捕获组返回 4 个标签名。'
 },
 {
  id:'py-x2-14',
  q:'下面这段关于 re.match 与 re.search 的代码运行后输出什么？',
  code:'import re\n\ns = "user_id: 408"\nm1 = re.match(r"\\d+", s)\nm2 = re.search(r"\\d+", s)\nprint(m1, m2.group(0) if m2 else None)',
  options:['408 408','None None','None 408','<re.Match> 408'],
  why:['re.match 只从字符串起始位置（索引 0）开始尝试匹配，s 开头是字母 "u" 而非数字，因此 m1 为 None。','re.search 会扫描整个字符串找到第一处匹配的数字子串 "408"，因此 m2 不为 None。','','s 的开头不是数字，re.match 返回 None 而不是 Match 对象。'],
  answer:2,
  explain:'re.match 仅检查字符串开头是否匹配模式（相当于隐式锚定了开头），遇到 "user_id: 408" 直接返回 None；re.search 则向后搜索整个字符串，成功提取出 "408"。'
 },
 {
  id:'py-x2-15',
  type:'multi',
  q:'关于 Python 模块导入机制、虚拟环境与常用标准库，下面哪些说法正确？（多选）',
  options:['同一进程内多次 import 同一个模块时，后续导入会直接从 sys.modules 字典中取缓存，不会重复执行模块代码','当脚本被直接运行时内置变量 __name__ 的值为 "__main__"，被其他模块导入时则为该模块的模块名','配置 logging.basicConfig(level=logging.WARNING) 后，调用 logging.info("ok") 依然会在控制台打印该日志','处理跨时区时间戳时，推荐使用带时区信息的 datetime.now(timezone.utc) 而非不带时区的 naive datetime'],
  why:['','','日志级别高低顺序为 DEBUG < INFO < WARNING < ERROR < CRITICAL，设置阈值为 WARNING 后，较低级别的 INFO 和 DEBUG 日志会被忽略。',''],
  answers:[0,1,3],
  explain:'sys.modules 保证了模块的进程内单例缓存；if __name__ == "__main__": 利用模块名区分直接执行与被导入；logging 会过滤掉低于当前级别的消息；现代 Python 推荐使用 timezone-aware 的 UTC 时间。'
 },
 {
  id:'py-x2-16',
  type:'judge',
  q:'两个模块 a.py 和 b.py 只要都在文件最顶部写 from 对方模块 import 某个函数，Python 解释器就会自动延迟解析它们，不会发生循环导入报错。',
  answer:false,
  explain:'当 a.py 在顶部执行 from b import func_b，而 b.py 又在顶部执行 from a import func_a 时，此时 a.py 尚未执行到定义 func_a 的位置，b.py 会立即抛出 ImportError（partially initialized module）。打破循环导入应抽取公共模块、改为延迟在函数内导入或只 import 模块名。'
 },
 {
  id:'py-x2-17',
  q:'下面这段关于生成器表达式遍历的代码运行后输出什么？',
  code:'gen = (n * 10 for n in [1, 2, 3])\nfirst = sum(gen)\nsecond = list(gen)\nprint(f"sum={first}, rest={second}")',
  options:['sum=60, rest=[10, 20, 30]','sum=60, rest=[]','sum=0, rest=[10, 20, 30]','sum=60, rest=[10]'],
  why:['生成器是单向一次性迭代器，sum(gen) 已经把生成器里的元素消费完毕，第二次转 list 时已无元素。','','第一次调用 sum(gen) 会正常消费所有元素并求和得到 60。','sum(gen) 会一直消费直到生成器耗尽，不会留下第一个元素 10。'],
  answer:1,
  explain:'生成器对象属于一次性迭代器（Iterator），内部维护着当前迭代位置状态。sum(gen) 遍历到底触发 StopIteration 后，生成器即处于耗尽状态，随后 list(gen) 会直接返回空列表 []。'
 },
 {
  id:'py-x2-18',
  q:'运行下面这段生成器代码，标准输出的精确顺序是什么？',
  code:'def make_gen():\n    print("A", end=" ")\n    yield 1\n    print("B", end=" ")\n    yield 2\n\nprint("S", end=" ")\ng = make_gen()\nprint("M", end=" ")\nprint(next(g), end=" ")',
  options:['S A M 1 ','S M A 1 B ','A S M 1 ','S M A 1 '],
  why:['调用 make_gen() 只是创建并返回生成器对象，此时函数体内的代码一行也不会执行，因此 M 在 A 之前打印。','第一次调用 next(g) 推进到第一个 yield 1 就暂停并返回 1，不会继续往下执行 print("B")。','打印 "S" 在调用 make_gen() 之前，且 make_gen() 在首次 next(g) 前不会打印 "A"。',''],
  answer:3,
  explain:'含有 yield 的函数在调用时立即返回一个处于暂停起点的生成器对象，不执行任何函数体语句（故先输出 S M）；直到第一次调用 next(g) 时，才从函数开头执行到第一个 yield 1 处暂停（输出 A 1）。'
 },
 {
  id:'py-x2-19',
  q:'下面这段使用 yield from 的生成器代码运行后输出什么？',
  code:'def child():\n    yield "a"\n    yield "b"\n    return "done"\n\ndef parent():\n    result = yield from child()\n    yield f"ret:{result}"\n\nprint(list(parent()))',
  options:['[\'a\', \'b\', \'ret:done\']','[\'a\', \'b\', \'ret:None\']','[\'a\', \'b\', \'done\', \'ret:None\']','[\'a\', \'b\', \'done\']'],
  why:['','yield from 会捕获子生成器结束时 return 的返回值 "done" 并赋给 result，因此 result 不是 None。','子生成器的 return "done" 是放在 StopIteration.value 里的返回值，不会直接作为子生成器的产出元素。','父生成器在 yield from 结束拿到返回值 result 后，还会继续执行下一行 yield f"ret:{result}"。'],
  answer:0,
  explain:'yield from child() 会先把 child() 产出的每个值直接委派给外层调用方；当 child() 执行 return "done" 结束时，解释器把 "done" 作为 yield from 表达式的返回值赋给 result，接着父生成器产出 "ret:done"。'
 },
 {
  id:'py-x2-20',
  q:'下面这段使用 itertools.groupby 的代码运行后输出什么？',
  code:'from itertools import groupby\n\nitems = ["a1", "a2", "b1", "a3"]\ngroups = [(k, list(g)) for k, g in groupby(items, key=lambda s: s[0])]\nprint(len(groups), [k for k, _ in groups])',
  options:['2 [\'a\', \'b\']','4 [\'a\', \'a\', \'b\', \'a\']','3 [\'a\', \'b\', \'a\']','2 [\'b\', \'a\']'],
  why:['itertools.groupby 只会把“连续相邻且 key 相同”的元素归为一组，由于 "a3" 被 "b1" 隔开，不会自动合并到前面的 "a" 组。','"a1" 和 "a2" 相邻且首字母相同，会被合并为同一组，因此总共是 3 组而不是 4 组。','','groupby 按输入序列原有顺序扫描连续区间，会产生 [\'a\', \'b\', \'a\'] 三个分组。'],
  answer:2,
  explain:'itertools.groupby 的工作方式类似 Unix 的 uniq 命令，仅合并相邻且 key 相等的元素。若希望把全局所有同 key 元素归并到同一组，必须在调用 groupby 之前先按相同的 key 对数据排序。'
 },
 {
  id:'py-x2-21',
  type:'multi',
  q:'关于 Python 迭代器协议与 itertools 工具集，下面哪些说法正确？（多选）',
  options:['列表 list 实现了 __iter__ 但没有实现 __next__，因此它是可迭代对象（Iterable）而非迭代器（Iterator）','迭代器对象的 __iter__() 方法返回它自身，__next__() 在无更多元素时抛出 StopIteration','生成器对象不支持普通下标切片 gen[:5]，截取前 5 个元素应使用 itertools.islice(gen, 5)','处理海量数据流水线时，用生成器表达式替代中间列表推导式可以把内存占用从 O(N) 降到 O(1)'],
  why:['','','',''],
  answers:[0,1,2,3],
  explain:'Iterable 提供 __iter__ 每次产出新的 Iterator；Iterator 同时具备 __iter__ 和 __next__；生成器没有长度也不支持下标切片，需借助 itertools.islice；生成器按需惰性求值，内存中同一时刻只保留当前元素。'
 },
 {
  id:'py-x2-22',
  q:'下面这段包含闭包列表的代码运行后输出什么？',
  code:'adders = [lambda x: x + step for step in range(3)]\nebinds = [lambda x, s=step: x + s for step in range(3)]\nprint([f(10) for f in adders], [f(10) for f in ebinds])',
  options:['[10, 11, 12] [10, 11, 12]','[12, 12, 12] [10, 11, 12]','[12, 12, 12] [12, 12, 12]','[10, 11, 12] [12, 12, 12]'],
  why:['adders 里的 lambda 引用的是自由变量 step，由于闭包晚绑定，在循环结束后调用时 step 已经停留在最后一个值 2。','','ebinds 利用了默认参数 s=step 在定义每个 lambda 时立即求值的特性，分别固化了 0、1、2。','第一种写法踩了闭包晚绑定坑（全为 12），第二种默认参数写法才是按当次循环值绑定的正确修复方案。'],
  answer:1,
  explain:'Python 闭包捕获的是变量名称（引用）而非创建函数那一刻的值（即晚绑定 late binding）：循环结束时 step 为 2，故 adders 中三个函数都计算 10 + 2 = 12；而默认参数 s=step 在每次创建 lambda 时立即求值，成功保存了 0、1、2。'
 },
 {
  id:'py-x2-23',
  q:'当两个装饰器叠加修饰同一个函数时，下面代码运行后的输出是什么？',
  code:'def deco_a(fn):\n    def wrap():\n        return "A(" + fn() + ")"\n    return wrap\n\ndef deco_b(fn):\n    def wrap():\n        return "B(" + fn() + ")"\n    return wrap\n\n@deco_a\n@deco_b\ndef core():\n    return "X"\n\nprint(core())',
  options:['A(B(X))','B(A(X))','A(X)B(X)','B(X)'],
  why:['','@deco_a 写在 @deco_b 上方等价于 core = deco_a(deco_b(core))，调用时最外层是 deco_a 的 wrap，因此最外层是 A(...)。','装饰器是俄罗斯套娃式的嵌套调用而非并列拼接。','两层装饰器都会生效，不会丢掉外层的 deco_a。'],
  answer:0,
  explain:'多层装饰器语法 @deco_a 叠在 @deco_b 之上，完全等价于 core = deco_a(deco_b(core))：装饰（包装）顺序是自下而上（先包 B 再包 A），而调用执行顺序是自上而下（先进入 A 的 wrap，内部再调用 B 的 wrap），故返回 A(B(X))。'
 },
 {
  id:'py-x2-24',
  type:'multi',
  q:'关于装饰器进阶用法、@functools.lru_cache 与现代类型注解（Type Hints），下面哪些说法正确？（多选）',
  options:['使用 @functools.wraps(func) 修饰内层 wrapper 函数，可以保留原函数的 __name__、__doc__ 以及 __wrapped__ 属性','给函数加上 @functools.lru_cache 后，可以直接把列表 list 或字典 dict 作为位置参数传入并自动缓存结果','typing.Protocol 支持结构化子类型（静态鸭子类型），实现类无需显式继承该 Protocol 即可通过静态类型检查','带参数的装饰器（如 @retry(times=3)）只需要编写两层嵌套函数（外层接收 func 和 times，内层为 wrapper）'],
  why:['','lru_cache 底层用字典以实参元组为键缓存结果，要求所有传入参数必须可哈希（hashable），传入 list 或 dict 会直接抛 TypeError。','','带参数的装饰器需要三层函数：最外层接收装饰器参数（如 times=3）并返回真正的装饰器，中间层接收被装饰函数 func，最内层 wrapper 接收调用实参。'],
  answers:[0,2],
  explain:'functools.wraps 负责拷贝原函数元信息；lru_cache 依赖哈希表缓存，实参必须可哈希；Protocol 在静态类型检查期实现结构化鸭子类型；带参装饰器标准结构为三层嵌套函数。'
 },
 {
  id:'py-x2-25',
  type:'judge',
  q:'在 Python 函数签名中标注类型注解 def calc(x: int) -> int: 后，如果运行时调用 calc("abc")，Python 解释器会在进入函数体前因为类型不匹配直接抛出 TypeError。',
  answer:false,
  explain:'Python 标准解释器在运行时只把类型注解存放在函数的 __annotations__ 字典中，不会自动做任何运行时类型拦截；静态类型检查需要借助 mypy、pyright 等工具，运行时校验则需要 Pydantic 等库。'
 },
 {
  id:'py-x2-26',
  type:'fill',
  q:'编写自定义装饰器时，为了避免被装饰后的函数丢失原有的 __name__ 和文档字符串 __doc__，通常会用标准库中的 @functools.＿(func) 修饰内层的包装函数。',
  accepted:['wraps'],
  explain:'@functools.wraps(func) 会将原函数的 __module__、__name__、__qualname__、__doc__ 和 __annotations__ 复制到 wrapper 上，并设置 wrapper.__wrapped__ = func。'
 },
 {
  id:'py-x2-27',
  type:'short',
  q:'Python 中的可迭代对象（Iterable，如 list）与迭代器（Iterator，如生成器或 map/zip 的返回值）有什么本质区别？为什么对同一个生成器对象连续执行两次 for x in gen:，第二次循环什么都不会输出？',
  reference:'1. 本质区别：\n- 可迭代对象（Iterable）只实现了 __iter__() 方法，每次对其调用 iter(obj)（或进入 for 循环）都会创建并返回一个全新的迭代器对象，自身不保存迭代游标状态，因此可以重复遍历多次；\n- 迭代器（Iterator）同时实现了 __iter__()（返回 self 自身）和 __next__() 方法，内部维护着当前消费位置的游标状态，每调用一次 next() 就推进一次，直到抛出 StopIteration。\n2. 生成器二次遍历为空的原因：生成器本身就是 Iterator，它的 __iter__() 直接返回自身。第一次 for 循环通过 next(gen) 将其内部状态一直推进到耗尽（触发 StopIteration）；第二次 for 循环再次对同一个已耗尽的生成器调用 next() 时，会立即触发 StopIteration 结束循环，因此不会输出任何元素。',
  points:['说明 Iterable 实现 __iter__，每次遍历都会返回全新的迭代器，可重复遍历','说明 Iterator 同时实现 __iter__（返回自身）和 __next__，内部保存单向游标状态','指出生成器属于 Iterator，第一次 for 循环消费到底触发 StopIteration 后即处于耗尽状态','说明第二次遍历对同一个已耗尽的生成器调用 __next__ 会立即抛出 StopIteration 退出循环'],
  explain:'区分一个对象能否重复遍历，只需检查 iter(obj) is obj：若为 True 则是迭代器（一次性消费），若为 False 则是容器型可迭代对象（每次生成新迭代器）。'
 },
 {
  id:'py-x2-28',
  type:'short',
  q:'阅读下面的代码，为什么打印结果不是 [0, 2, 4, 6] 而是 [6, 6, 6, 6]？请结合 Python 闭包的晚绑定（late binding）机制解释原因，并写出两种不同的修复方案。',
  code:'multipliers = [lambda x: x * i for i in range(4)]\nprint([m(2) for m in multipliers])',
  reference:'1. 原因（闭包晚绑定）：Python 闭包捕获的是外层作用域中的变量名引用 i，而不是创建 lambda 那一刻 i 的数值快照。列表推导式中的 4 个 lambda 共享同一个外层循环变量 i；当推导式循环执行完毕后，i 的最终值停留在 3，随后调用 m(2) 时才去查找变量 i，4 个函数读到的都是 3，故全输出 2 * 3 = 6。\n2. 修复方案一（默认参数早绑定）：利用函数默认参数在定义时立即求值的特性，写成 [lambda x, i=i: x * i for i in range(4)]。\n3. 修复方案二（使用 functools.partial 或外层工厂函数）：例如 [functools.partial(lambda factor, x: x * factor, i) for i in range(4)]，或单独定义一层 def make_mul(factor): return lambda x: x * factor 为每次循环创建独立的作用域绑定。',
  points:['指出闭包捕获的是变量 i 的引用而非创建函数时的值（晚绑定机制）','说明循环结束后变量 i 停留在 3，后续调用时所有闭包都读取这同一个最终值 3','给出修复方案一：利用默认参数在定义时求值 lambda x, i=i: x * i','给出修复方案二：使用外层工厂函数创建独立闭包作用域，或使用 functools.partial'],
  explain:'在循环中创建闭包或回调函数时，只要函数体直接引用了循环变量，都要警惕晚绑定问题。'
 },
 {
  id:'py-x2-29',
  type:'code',
  q:'使用生成器与 itertools.islice 编写一个分批迭代函数 batched_stream(iterable, batch_size: int)：当 batch_size <= 0 时抛出 ValueError；否则接受任意可迭代对象（包括一次性生成器），按每批最多 batch_size 个元素逐批 yield 出列表（list），直到数据源耗尽（注意不能先把整个 iterable 转成大列表）。最后写出测试代码验证对生成器的分批效果。',
  reference:'from itertools import islice\n\ndef batched_stream(iterable, batch_size: int):\n    if batch_size <= 0:\n        raise ValueError("batch_size must be positive")\n    it = iter(iterable)\n    while batch := list(islice(it, batch_size)):\n        yield batch\n\nif __name__ == "__main__":\n    source = (x * x for x in range(7))\n    for chunk in batched_stream(source, 3):\n        print(chunk)',
  points:['校验 batch_size <= 0 时主动抛出 ValueError','先调用 iter(iterable) 获取迭代器，保证传入列表或生成器都能按游标惰性推进','使用 islice(it, batch_size) 每次只拉取一批并转为非空列表后 yield，不预先展开整个数据源','提供测试代码，验证最后一批不足 batch_size 时的余数切分（如 7 个元素按 3 分成 3、3、1）'],
  explain:'先用 iter(iterable) 转为统一迭代器，再在循环中用 list(islice(it, batch_size)) 拉取下一批，当返回空列表时循环自然终止，既支持任意流式数据源又保持 O(batch_size) 内存开销。'
 },
 {
  id:'py-x2-30',
  type:'code',
  q:'编写一个带参数的重试装饰器 retry(max_attempts: int = 3, allowed_exc: type[Exception] = Exception)：使用 @functools.wraps 保留原函数元信息；调用被装饰函数时若抛出 allowed_exc 异常则自动重试，最多尝试 max_attempts 次；若某次成功则直接返回结果，若达到最大次数仍失败则将最后一次捕获的异常重新抛出。写出测试代码验证前两次失败、第三次成功的场景。',
  reference:'from functools import wraps\n\ndef retry(max_attempts: int = 3, allowed_exc: type[Exception] = Exception):\n    def decorator(func):\n        @wraps(func)\n        def wrapper(*args, **kwargs):\n            last_err = None\n            for _ in range(max_attempts):\n                try:\n                    return func(*args, **kwargs)\n                except allowed_exc as err:\n                    last_err = err\n            raise last_err\n        return wrapper\n    return decorator\n\nif __name__ == "__main__":\n    attempts = 0\n\n    @retry(max_attempts=3, allowed_exc=ValueError)\n    def flaky_task(x: int) -> str:\n        """模拟偶发失败的任务"""\n        global attempts\n        attempts += 1\n        if attempts < 3:\n            raise ValueError(f"第 {attempts} 次失败")\n        return f"成功: {x}"\n\n    print(flaky_task(42), flaky_task.__name__, attempts)',
  points:['采用三层嵌套函数结构（retry 接收配置参数 -> decorator 接收 func -> wrapper 接收 *args, **kwargs）','在 wrapper 上正确使用 @functools.wraps(func) 保留原函数元信息','循环最多 max_attempts 次，捕获 allowed_exc，成功时立即 return，全部失败后 raise 最后一次异常','测试代码演示重试恢复成功并验证被装饰函数的返回值及 __name__ 未丢失'],
  explain:'带参数装饰器的核心是三层闭包：最外层绑定装饰器配置参数，中间层绑定目标函数对象并用 @wraps 复制元信息，最内层拦截每次调用并实现重试控制流。'
 }
];
