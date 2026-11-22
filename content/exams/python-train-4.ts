import type {AiQuiz} from '../journey';

// Python「专家」阶段训练：CPython 底层与内存管理、元编程与元类、测试 Mock/类型检查/性能剖析/WSGI 与 ASGI 部署。
export const pythonTrain4:AiQuiz[]=[
 {
  id:'py-x4-1',
  q:'在 64 位 CPython 中，关于底层 PyObject 结构体头部字段以及 sys.getrefcount(x) 的返回值，下面哪项说法正确？',
  options:[
   'PyObject 头部只存有 ob_type 类型指针，引用计数统一存放在全局哈希表中',
   'PyObject 头部包含 ob_refcnt 与 ob_type，且 sys.getrefcount(x) 通常比实际引用数多 1',
   '所有定长和变长对象的 PyObject 头部都固定包含 ob_refcnt、ob_type 和 ob_hash 三个字段',
   '调用 sys.getrefcount(x) 会触发一次完整的分代垃圾回收，因此返回值会临时减 1'
  ],
  why:[
   'CPython 将引用计数 ob_refcnt 直接内嵌在每个对象的 PyObject 结构体头部，而不是放在外部全局哈希表中。',
   '',
   '基础 PyObject 只包含 ob_refcnt 和 ob_type 两个字段（变长对象 PyVarObject 额外增加 ob_size），并不包含 ob_hash。',
   'sys.getrefcount(x) 不会触发垃圾回收，相反因为把 x 作为实参压入函数调用栈帧又产生了一次临时引用，返回值会比调用前多 1。'
  ],
  answer:1,
  explain:'CPython 中每个对象都以 PyObject 头部开头，包含引用计数 ob_refcnt 和类型指针 ob_type（变长对象通过 PyVarObject 增加 ob_size）；调用 sys.getrefcount(x) 时形参本身持有一份临时引用，因此观察到的数值比外部真实引用数多 1。'
 },
 {
  id:'py-x4-2',
  q:'运行下面这段代码时，两个 Node 实例在执行完 del a, b 后的内存状态是什么？',
  code:'class Node:\n    def __init__(self):\n        self.peer = None\n\na = Node()\nb = Node()\na.peer = b\nb.peer = a\ndel a, b',
  options:[
   'del a, b 执行完毕的瞬间，两个实例的引用计数归零并立即被操作系统回收',
   '两个实例会变成永久内存泄漏，即使手动调用 gc.collect() 也无法回收它们',
   '解释器在执行 b.peer = a 时就会检测到循环引用并立即抛出 MemoryError',
   'del 后两者引用计数仍各为 1，不会立刻释放，需等待分代 GC 扫描或用 weakref 破环'
  ],
  why:[
   'del a, b 只是移除了当前作用域的两个局部变量绑定，但两个对象内部的 peer 属性仍然互相持有强引用，引用计数各自剩余 1。',
   'CPython 的分代垃圾回收器（gc 模块）专门负责检测并清理此类不可达的循环引用对象，调用 gc.collect() 即可回收。',
   'Python 完全允许对象之间建立双向或环形引用，赋值时不会报错。',
   ''
  ],
  answer:3,
  explain:'单纯依靠引用计数无法及时回收循环引用：del a, b 后两个 Node 实例的 ob_refcnt 均为 1；它们会暂留在堆内存中，直到触发分代 GC 的三色标记/引用摘除算法判定为不可达垃圾后才被回收，工程中也可使用 weakref.ref 避免产生强引用环。'
 },
 {
  id:'py-x4-3',
  q:'CPython 3.6+ 引入的紧凑字典（Compact Dict）是如何既大幅降低内存占用、又自然保持键的插入顺序的？',
  options:[
   '将稀疏哈希桶数组 dk_indices（仅存整数下标）与按插入顺序紧密排列的 dk_entries 条目数组拆分开',
   '在底层用红黑树全面替换了开放寻址哈希表，并在每个树节点上额外维护双向链表指针',
   '对字典的每个键在插入时自动做排序压缩，并在遍历时按时间戳字段重新排序输出',
   '继续使用单一稀疏大数组存放 hash/key/value，但把空槽位的大小从 24 字节压缩到了 16 字节'
  ],
  why:[
   '',
   'CPython 的 dict 底层依然是开放寻址哈希表而非红黑树，也没有为每个元素维护双向链表指针。',
   '紧凑字典并没有记录时间戳或排序，而是因为新条目直接追加到密集数组 dk_entries 尾部，天然具备插入顺序。',
   '紧凑字典的核心改进正是拆分了稀疏索引表与密集条目表，稀疏表每个槽位仅占 1/2/4/8 字节整数，而不再是存放完整 24 字节条目。'
  ],
  answer:0,
  explain:'传统字典在单一稀疏数组中直接存放 (hash, key, value) 导致大量空槽浪费；紧凑字典把哈希桶变成只存整数下标的紧凑数组 dk_indices，而真正的 (hash, key, value) 依次追加到密集数组 dk_entries 中，既节省约 20%~25% 内存，又免费获得了插入顺序保留。'
 },
 {
  id:'py-x4-4',
  type:'multi',
  q:'关于 CPython 字节码、对象驻留、列表扩容以及高性能扩展（NumPy / PyO3），下面哪些说法正确？（多选）',
  options:[
   '标准库 dis.dis(fn) 可以反编译函数代码对象，查看 LOAD_FAST、CALL 等底层字节码指令',
   'list 底层是存放 PyObject* 指针的动态数组，append 扩容时会按比例超额分配以实现均摊 O(1) 时间复杂度',
   'CPython 对任意长度的整数和所有运行时拼接生成的字符串都会在全局池中驻留并复用同一内存地址',
   'NumPy 向量化运算与使用 PyO3 编写的 Rust 扩展可以在连续内存上用原生机器码循环，并可释放 GIL 并行加速'
  ],
  why:[
   '',
   '',
   'CPython 仅预先缓存小整数（通常为 [-5, 256]）以及符合标识符规则的编译期常量字符串，运行时动态计算的大整数或拼接字符串默认不会全部自动驻留。',
   ''
  ],
  answers:[0,1,3],
  explain:'dis 模块用于检视 CPython 栈式虚拟机字节码；list 通过 over-allocation 超额分配避免每次 append 都 realloc；小整数池范围有限；NumPy 和 PyO3 则通过消除 PyObject 装箱拆箱开销与释放 GIL 实现数量级的性能提升。'
 },
 {
  id:'py-x4-5',
  type:'judge',
  q:'因为 CPython 内部有小整数缓存池与字符串驻留机制，所以在业务代码中比较两个整数或两个字符串的值是否相等时，应当优先使用 is 运算符代替 == 以提升性能。',
  answer:false,
  explain:'is 比较的是两个对象的内存地址（id 是否相同），== 才是调用 __eq__ 比较值是否相等；小整数池仅覆盖 [-5, 256]，字符串驻留也仅限编译期标识符等特定场景，对运行时数值或字符串用 is 极易产生偶发 bug，is 应仅用于 is None 或枚举单例判断。'
 },
 {
  id:'py-x4-6',
  q:'下面这段继承内置不可变类型 int 的代码运行后会输出什么？',
  code:'class UpperStr(str):\n    def __new__(cls, val: str):\n        return super().__new__(cls, val.strip().upper())\n    def __init__(self, val: str):\n        self.raw = val\n\ns = UpperStr("  hello  ")\nprint(s, s.raw, isinstance(s, UpperStr))',
  options:[
   '正常输出 hello   hello   True',
   '抛出 TypeError：不可变子类冲突',
   '正常输出 HELLO   hello   True',
   '正常输出 HELLO   HELLO   False'
  ],
  why:[
   '__new__ 在调用 super().__new__ 时已经把去空格并转大写的 "HELLO" 传给底层不可变字符串构造器，因此 s 的字符串值为 HELLO。',
   'str 的子类完全可以同时定义 __new__（负责构造不可变字符串值）与 __init__（负责初始化实例的附加属性如 self.raw）。',
   '',
   'super().__new__(cls, ...) 的第一个参数传入了子类 cls，创建出的实例类型正是 UpperStr，且 self.raw 保存的是原始入参 "  hello  "。'
  ],
  answer:2,
  explain:'对于 str、int、tuple 等不可变内置类型，实例的底层值在 __new__ 阶段就已固定，无法在 __init__ 中原地修改；因此定制不可变对象的值必须重写 __new__，随后 Python 会继续把返回的 cls 实例传给 __init__ 绑定附加属性。'
 },
 {
  id:'py-x4-7',
  q:'关于 Python 中类与元类（Metaclass）的关系及调用链路，下面哪项说法正确？',
  options:[
   '动态调用 type("User", (Base,), {"role": "admin"}) 与使用 class User(Base): 语句创建的类对象本质相同',
   '在自定义元类 Meta(type) 中，每当解释器执行 class MyCls(metaclass=Meta): 定义类时都会触发 Meta.__call__',
   '普通类 MyCls 的 type(MyCls) 是 object，而所有自定义元类都必须直接继承自 object',
   '如果一个类的 __new__ 方法返回了另一个无关类 Other 的实例，Python 依然会强制调用当前类的 __init__'
  ],
  why:[
   '',
   '执行 class 语句创建类对象本身时，调用的是元类的 Meta.__new__ 与 Meta.__init__；只有当后续调用 MyCls() 创建普通实例时，才会触发元类的 Meta.__call__。',
   '普通类的类型 type(MyCls) 默认是 type（或其自定义元类），且自定义元类通常必须继承自 type 而不是仅继承 object。',
   '根据 Python 数据模型规范，只有当 cls.__new__ 返回的是 cls（或其子类）的实例时，解释器才会自动调用该实例的 __init__。'
  ],
  answer:0,
  explain:'在 Python 中“类也是对象，默认是元类 type 的实例”：class 语句在执行完类体命名空间后，底层就是调用元类（默认为 type(name, bases, namespace)）的 __new__ 和 __init__ 构造类对象；而在调用 MyCls() 实例化时则会进入元类的 __call__。'
 },
 {
  id:'py-x4-8',
  type:'multi',
  q:'关于 Python 元编程中的 __init_subclass__、描述符 __set_name__ 以及抽象基类 abc.ABC，下面哪些说法正确？（多选）',
  options:[
   '在基类中定义 __init_subclass__(cls, **kwargs) 可以在每次定义子类时自动执行注册或校验，无需编写自定义元类',
   '描述符的 __set_name__(self, owner, name) 只有在首次访问实例属性 obj.attr 时才会被延迟调用',
   '继承 abc.ABC 且包含未实现的 @abstractmethod 方法的子类无法直接实例化，尝试实例化会抛出 TypeError',
   '抽象基类中的 @abstractmethod 方法体内部语法上禁止编写任何默认实现代码，否则在定义类时就会报错'
  ],
  why:[
   '',
   '__set_name__ 是在宿主类 owner 创建完成时（即类定义阶段）由 type.__new__ 自动调用的，而不是等到访问实例属性时才延迟调用。',
   '',
   '@abstractmethod 方法完全可以包含默认实现代码，子类在重写该方法时还可以通过 super() 调用这份基础实现。'
  ],
  answers:[0,2],
  explain:'Python 3.6 引入的 __init_subclass__ 与描述符 __set_name__（在类创建时自动注入属性名）覆盖了绝大多数过去需要自定义元类的场景；而 abc.ABC（底层元类为 ABCMeta）会在实例化时检查所有 @abstractmethod 是否均已实现。'
 },
 {
  id:'py-x4-9',
  type:'judge',
  q:'使用标准库 inspect.signature(fn) 获取函数签名对象 sig 后，调用 sig.bind(*args, **kwargs) 可以在不真正执行函数体的前提下，将实参按位置与关键字规则映射到形参并校验缺参或多参错误。',
  answer:true,
  explain:'inspect.signature 配合 Signature.bind()（以及 apply_defaults()）是实现装饰器参数校验、RPC 框架路由分发和依赖注入的核心工具，遇到参数不匹配时会直接抛出与真实调用一致的 TypeError。'
 },
 {
  id:'py-x4-10',
  q:'已知 db.py 定义了 def get_user(uid): ...，而 service.py 顶部写了 from db import get_user 并在 load_profile(uid) 中直接调用 get_user(uid)。在为 load_profile 编写单元测试时，应该如何正确使用 unittest.mock.patch？',
  options:[
   '应当写 @patch("db.get_user")，因为函数最初定义在 db.py 模块中',
   '应当写 @patch("builtins.get_user")，把替身函数注入全局内置命名空间',
   '应当写 @patch("service.get_user")，遵循“在哪里查找就在哪里打补丁”原则',
   '使用 from ... import 导入的函数无法用 patch 替换，必须先把业务代码改成动态 __import__'
  ],
  why:[
   'service.py 执行 from db import get_user 后，已经在 service 模块命名空间下创建了名为 get_user 的本地引用；此时修改 db.get_user 不会影响 service.get_user 指向的原函数。',
   'get_user 是模块级导入的符号而非内置函数，修改 builtins 不会拦截 service 模块自身的全局变量查找。',
   '',
   'from ... import 导入的符号完全可以用 mock.patch 替换，只要把目标路径指定为使用方模块 service.get_user 即可。'
  ],
  answer:2,
  explain:'from db import get_user 相当于在 service 模块的全局命名空间里执行了 get_user = db.get_user；因此测试 service.load_profile 时必须 patch 查找发生的位置 "service.get_user"，即著名的“patch where it is looked up, not where it is defined”原则。'
 },
 {
  id:'py-x4-11',
  q:'在 pytest 中，关于使用 yield 的 fixture 以及 fixture 的 scope（作用域），下面哪项描述正确？',
  options:[
   'fixture 函数中一旦使用了 yield 关键字，就会变成异步生成器，仅可用于测试 async def 用例',
   'yield 之前的代码在测试前执行并产出依赖对象，yield 之后的清理代码在该作用域内测试结束后仍会执行',
   '将 fixture 声明为 @pytest.fixture(scope="module") 时，该模块下的每个测试函数都会重新执行一次该 fixture',
   '如果测试函数内部发生了断言失败 AssertionError，fixture 中位于 yield 之后的 teardown 代码会被直接跳过'
  ],
  why:[
   '在普通 def fixture 中使用 yield 是 pytest 标准的前置/后置（setup/teardown）语法，普通同步测试和异步测试都可以使用。',
   '',
   'scope="module" 表示整个测试模块（.py 文件）生命周期内只初始化一次该 fixture，同模块内所有测试函数共享这同一个实例；每个函数都重跑一次的是默认的 scope="function"。',
   '即使测试函数抛出 AssertionError 或其他异常，pytest 也会保证执行 fixture 中 yield 之后的 teardown 清理逻辑（类似 try...finally）。'
  ],
  answer:1,
  explain:'pytest 通过在 fixture 中使用 yield 优雅地合一了 setup 与 teardown：yield 产出的值直接注入测试函数同名参数，无论测试通过还是失败，离开相应 scope（function / class / module / package / session）时都会继续执行 yield 之后的资源释放代码。'
 },
 {
  id:'py-x4-12',
  q:'对比 Python Web 开发中的 WSGI（如 Gunicorn + Flask/Django 同步模式）与 ASGI（如 Uvicorn + FastAPI），下面哪项说法正确？',
  options:[
   'WSGI 标准原生支持 WebSocket 长连接双向帧收发与 HTTP/2 服务端推送',
   'ASGI 应用的入口签名与 WSGI 完全相同，都是接收 (environ, start_response) 两个同步参数',
   '在多核服务器上部署 FastAPI 时，单进程 Uvicorn 就已经能够跨多个 CPU 核心并行执行所有同步计算代码',
   'WSGI 采用同步单次请求-响应调用模型，而 ASGI 采用 async def app(scope, receive, send) 异步消息流接口'
  ],
  why:[
   'WSGI（PEP 3333）是围绕同步“一请求一响应”设计的接口，无法原生支持 WebSocket 等持久双向异步通信协议。',
   '(environ, start_response) 是 WSGI 的调用签名；ASGI 的标准入口签名是 async def app(scope, receive, send)。',
   '单个 Uvicorn 进程只运行一个事件循环线程，为了跑满多核 CPU，生产环境通常使用 Gunicorn 搭配 UvicornWorker（或 uvicorn --workers N）启动多个工作进程。',
   ''
  ],
  answer:3,
  explain:'WSGI 是同步阻塞的 def app(environ, start_response) 接口，适合传统同步框架；ASGI 将连接上下文 scope 与异步接收 receive、异步发送 send 拆分为协程接口，原生支持异步高并发 HTTP、WebSocket 及 Server-Sent Events（SSE）。'
 },
 {
  id:'py-x4-13',
  type:'multi',
  q:'关于现代 Python 工程质量保障、静态类型检查与性能剖析工具，下面哪些说法正确？（多选）',
  options:[
   'ruff 基于 Rust 编写，能够以极高速度一站式替代 flake8、isort 和 black 完成代码静态检查与格式化',
   'mypy 能基于 PEP 484 类型注解在运行前捕获类型不匹配或未处理的 None，但不会在 Python 运行时强制拦截入参',
   'cProfile 适合统计各个函数的调用次数（ncalls）、自身耗时（tottime）与累计耗时（cumtime），定位 CPU 热点',
   'tracemalloc 可以追踪 Python 内存块的分配调用栈，通过对比两个时间点的 snapshot 定位内存持续增长的源头'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'现代 Python 工程实践中，通常用 ruff + mypy 作为 CI 静态门禁（注意类型注解默认仅做静态检查，运行时校验需借助 Pydantic 等库），而在性能调优时用 cProfile（或 py-spy）分析 CPU 时间分布，用 tracemalloc 分析堆内存分配与泄漏。'
 },
 {
  id:'py-x4-14',
  type:'judge',
  q:'在循环中高频拼接上万个子字符串时，使用 s += piece 与先收集到列表再用 "".join(pieces) 在任何 Python 解释器下的时间复杂度和内存分配次数都相同。',
  answer:false,
  explain:'str 是不可变对象，"".join(pieces) 会先遍历算出总长度并只分配一次目标内存，严格保证 O(n) 时间与空间；而 s += piece 仅在 CPython 局部变量引用计数恰好为 1 时有启发式原地扩容微优化，一旦存在额外引用或运行在 PyPy 等其他解释器上就会退化为 O(n²) 的反复分配与拷贝。'
 },
 {
  id:'py-x4-15',
  type:'fill',
  q:'从 Python 3.6 起，无需编写复杂的自定义元类，只需在基类中定义类钩子方法 def ＿(cls, **kwargs):，每当有子类继承该基类时就会自动触发，常用于实现插件自动注册或子类约束校验。',
  accepted:['__init_subclass__'],
  explain:'object.__init_subclass__(cls, **kwargs) 会在每次创建子类时由 type.__new__ 自动调用，其中 cls 是刚创建好的子类，还可以直接接收 class Sub(Base, key="val"): 头部的关键字参数。'
 },
 {
  id:'py-x4-16',
  type:'short',
  q:'请详细阐述 CPython 的内存回收机制：为什么在已经有引用计数（Reference Counting）的基础上还需要引入分代垃圾回收（Generational GC）？两者各自优缺点是什么，日常开发中应如何排查与避免循环引用问题？',
  reference:'1. 引用计数（主机制）：\n   - 原理：每个 PyObject 头部维护 ob_refcnt，产生新引用时加 1，引用离开作用域、被 del 或被重新赋值时减 1；一旦减到 0 立即同步释放对象内存（并级联递减其所持对象的引用计数）。\n   - 优缺点：优点是实时性极高，内存释放开销平摊到日常运行中，无长暂停；缺点是维护计数有额外开销，且致命缺陷是无法回收“循环引用”（两个或多个对象互相强引用，外部已无任何引用但彼此 ob_refcnt >= 1）。\n2. 分代垃圾回收（辅助机制）：\n   - 原理：专门针对可能包含其他对象的容器对象（list、dict、自定义类实例等）维护 0、1、2 三代双向链表；基于“弱代假说”（绝大多数对象朝生暮死），高频扫描第 0 代，存活对象晋升老年代。回收时通过将链表内对象的引用计数拷贝到 gc_refs 并模拟摘除内部互相引用，找出真正从根部不可达的循环引用垃圾并打破清理。\n3. 排查与规避手段：\n   - 双向关联结构（如树父子节点、缓存映射、观察者回调）将其中一侧改用 weakref.ref、weakref.proxy 或 WeakKeyDictionary / WeakValueDictionary；\n   - 使用 gc.get_objects()、gc.garbage 或 tracemalloc / objgraph 检查未能释放的容器对象，及时在 close() / __exit__() 中显式解绑回调或引用。',
  points:[
   '说明引用计数的工作原理（ob_refcnt 增减与归零即时释放）及其无法处理循环引用的致命缺陷',
   '说明分代 GC 只追踪容器对象，将对象分为 0/1/2 三代，利用模拟引用摘除（或标记清除）专门清理不可达循环引用',
   '指出两者的互补性：引用计数保证绝大多数对象实时回收，分代 GC 周期性兜底清理孤立引用环',
   '给出工程规避与排查方法：用 weakref 弱引用打破双向强引用环，结合 tracemalloc 或 gc 模块排查泄漏'
  ],
  explain:'回答 CPython GC 时切忌只背“引用计数 + 标记清除 + 分代回收”十二个字，必须点明“引用计数是实时主干，分代 GC 仅追踪容器对象并专门解决循环引用”这一核心分工。'
 },
 {
  id:'py-x4-17',
  type:'short',
  q:'在使用 unittest.mock.patch 编写单元测试时，为什么经常遇到“明明已经对目标函数打了 @patch，被测代码运行时却依然调用了真实函数”的问题？请结合 Python 的 import 名字绑定机制解释原因，并总结正确的打补丁规范。',
  reference:'1. 根本原因（import 名字绑定机制）：\n   - Python 的 import 不是 C 语言的文本宏替换，而是运行时的“名字绑定（赋值）”。\n   - 当被测模块 order.py 顶部写下 from payment import charge 时，order 模块在导入阶段就在自己的模块全局字典 order.__dict__ 中创建了一个名为 "charge" 的变量，直接指向原函数对象。\n   - 如果测试代码写 @patch("payment.charge")，它只把 payment 模块里的 charge 属性换成了 MagicMock，而 order.__dict__["charge"] 依然指向原来的真实函数对象，因此 order.py 调用 charge() 时完全不会走 mock。\n2. 正确打补丁规范（Patch where it is looked up）：\n   - 情况 A：被测模块 order.py 写的是 from payment import charge，在模块内直接调用 charge() —— 必须 patch 使用方命名空间：@patch("order.charge")；\n   - 情况 B：被测模块 order.py 写的是 import payment，在函数内通过属性访问调用 payment.charge() —— 此时每次都在 payment 模块对象上查找属性，因此 patch "@patch(\'payment.charge\')" 即可生效；\n   - 补充建议：配合 autospec=True（如 patch("order.charge", autospec=True)）让 Mock 对象严格校验原函数的参数签名，防止原函数重构改参后测试依然虚假通过。',
  points:[
   '结合 Python 名字绑定解释 from a import fn 会在当前被测模块的命名空间中创建指向原函数对象的独立引用',
   '指出只 patch 定义处（a.fn）不会更新使用方模块（b.fn）已经绑定的局部/模块级引用',
   '总结核心原则“在哪里查找就在哪里打补丁（patch where it is looked up）”并区分 from a import fn 与 import a 两种写法',
   '提及使用 autospec=True 等工程实践防止被 mock 函数的签名变更被测试漏检'
  ],
  explain:'理解“变量名只是指向对象的标签”就能瞬间看穿 mock.patch 的工作方式：mock.patch 的本质是在指定模块或对象上临时 setattr 替换标签指向，所以被测代码运行时从哪个命名空间读这个标签，就要把补丁打在哪个命名空间。'
 },
 {
  id:'py-x4-18',
  type:'code',
  q:'利用基类的 __init_subclass__ 钩子实现一个轻量级插件自动注册基类 PluginBase：\n1. 基类维护类属性字典 _registry: dict[str, type["PluginBase"]] = {}；\n2. 当定义子类（例如 class CsvPlugin(PluginBase, name="csv"):）时，通过 __init_subclass__(cls, name: str | None = None, **kwargs) 自动捕获参数：若 name 为非空字符串，则检查是否已存在同名插件（若已存在则抛出 ValueError），否则将 cls 注册到 _registry[name] 中；若未传 name（如中间抽象子类）则跳过注册；\n3. 提供类方法 create(cls, name: str, *args, **kwargs) -> "PluginBase"，根据注册名查找并实例化对应子类（未找到时抛出 KeyError）；\n4. 写出两个具体插件子类并在 main 中演示通过 PluginBase.create 动态创建实例。',
  reference:'class PluginBase:\n    _registry: dict[str, type["PluginBase"]] = {}\n\n    def __init_subclass__(cls, name: str | None = None, **kwargs) -> None:\n        super().__init_subclass__(**kwargs)\n        if name:\n            if name in cls._registry:\n                raise ValueError(f"Duplicate plugin name: {name}")\n            cls._registry[name] = cls\n\n    @classmethod\n    def create(cls, name: str, *args, **kwargs) -> "PluginBase":\n        if name not in cls._registry:\n            raise KeyError(f"Unknown plugin: {name}")\n        target_cls = cls._registry[name]\n        return target_cls(*args, **kwargs)\n\nclass JsonPlugin(PluginBase, name="json"):\n    def __init__(self, indent: int = 2) -> None:\n        self.indent = indent\n    def dump(self, data: str) -> str:\n        return f"JSON(indent={self.indent}):{data}"\n\nclass CsvPlugin(PluginBase, name="csv"):\n    def dump(self, data: str) -> str:\n        return f"CSV:{data}"\n\nif __name__ == "__main__":\n    p1 = PluginBase.create("json", indent=4)\n    p2 = PluginBase.create("csv")\n    print(p1.dump("ok"), p2.dump("row"))',
  points:[
   '在 PluginBase 中正确定义 __init_subclass__(cls, name: str | None = None, **kwargs) 并调用 super().__init_subclass__(**kwargs)',
   '当 name 非空时检查 _registry 是否重名（重名抛 ValueError），无冲突则将子类 cls 存入 _registry[name]',
   '实现 @classmethod 的 create(cls, name, *args, **kwargs)，未注册时抛 KeyError，已注册则转发参数并实例化返回',
   '通过 class Sub(PluginBase, name="...") 语法定义插件子类并成功演示动态创建调用'
  ],
  explain:'__init_subclass__ 是 Python 3.6+ 提供的标准元编程钩子，无需自定义 metaclass 即可优雅实现插件自注册、ORM 模型表收集和序列化器分发等架构模式。'
 }
];
