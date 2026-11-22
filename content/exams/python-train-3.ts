import type {AiQuiz} from '../journey';

// Python「高阶」阶段训练：数据模型与魔术方法、描述符与 __slots__、GIL 与多线程/多进程并发、asyncio 异步编程。
export const pythonTrain3:AiQuiz[]=[
 {
  id:'py-x3-1',
  q:'下面这段 Python 代码运行后的输出结果是什么？',
  code:'class Tag:\n    def __init__(self, name: str):\n        self.name = name\n    def __repr__(self) -> str:\n        return f"Tag({self.name!r})"\n    def __str__(self) -> str:\n        return f"<{self.name}>"\n\nt = Tag("py")\nprint([t], f"{t} | {t!r}")',
  options:[
   '[<py>] <py> | <py>',
   '[Tag(\'py\')] Tag(\'py\') | <py>',
   '[Tag(\'py\')] <py> | Tag(\'py\')',
   '[<py>] <py> | Tag(\'py\')'
  ],
  why:[
   '列表等容器在转成字符串展示内部元素时调用的是元素的 __repr__，而不是 __str__，且 {t!r} 也会显式调用 __repr__。',
   'f"{t}" 在未加转换标志时默认走 __str__，因此竖线左侧会输出 <py> 而不是 Tag(\'py\')。',
   '',
   '打印列表 [t] 时，列表自身的 __repr__ 会对其中每个元素调用 repr(item)，因此第一部分是 [Tag(\'py\')]。'
  ],
  answer:2,
  explain:'容器（list、dict、tuple 等）在格式化输出其内部元素时会统一调用元素的 __repr__；而在 f-string 中，{t} 默认调用 __str__，加了 !r 转换符的 {t!r} 则显式调用 __repr__。'
 },
 {
  id:'py-x3-2',
  q:'执行下面这段代码时会发生什么？',
  code:'class Point:\n    def __init__(self, x: int, y: int):\n        self.x, self.y = x, y\n    def __eq__(self, other: object) -> bool:\n        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)\n\ns = {Point(1, 2), Point(1, 2)}\nprint(len(s))',
  options:[
   '正常输出 1，集合依据 __eq__ 自动去重',
   '抛出 TypeError，提示 Point 实例不可哈希',
   '正常输出 2，两个实例的内存地址各不相同',
   '抛出 AttributeError，缺少 __ne__ 方法实现'
  ],
  why:[
   '只自定义 __eq__ 而不定义 __hash__ 时，Python 会把 __hash__ 隐式设为 None，在放入集合前就会报错。',
   '',
   '集合去重需要先计算对象的哈希值，而此时 Point.__hash__ 已被置为 None，无法放入 set。',
   'Python 3 会基于 __eq__ 的结果自动取反来提供默认的 __ne__ 行为，不会报缺少 __ne__ 的错误。'
  ],
  answer:1,
  explain:'在 Python 数据模型中，如果一个类重写了 __eq__ 但没有显式定义 __hash__，解释器会自动将 cls.__hash__ 设为 None，防止可变对象放入 set 或作为 dict 键后因属性修改破坏哈希表不变量。'
 },
 {
  id:'py-x3-3',
  q:'下面代码运行后的输出是什么？',
  code:'class DataDesc:\n    def __get__(self, obj, cls=None):\n        return "from_data_desc"\n    def __set__(self, obj, val):\n        pass\n\nclass NonDataDesc:\n    def __get__(self, obj, cls=None):\n        return "from_nondata_desc"\n\nclass Box:\n    a = DataDesc()\n    b = NonDataDesc()\n\nbox = Box()\nbox.__dict__["a"] = "from_instance_a"\nbox.__dict__["b"] = "from_instance_b"\nprint(box.a, box.b)',
  options:[
   'from_data_desc from_instance_b',
   'from_instance_a from_instance_b',
   'from_data_desc from_nondata_desc',
   'from_instance_a from_nondata_desc'
  ],
  why:[
   '',
   '属性 a 是同时实现了 __get__ 与 __set__ 的数据描述符，优先级高于实例 __dict__，不会被实例字典中的同名键覆盖。',
   '属性 b 只实现了 __get__，属于非数据描述符，其查找优先级低于实例自身的 __dict__，因此读取 box.b 会返回实例字典中的值。',
   '数据描述符与非数据描述符相对于实例 __dict__ 的优先级正好相反：数据描述符在前，非数据描述符在后。'
  ],
  answer:0,
  explain:'object.__getattribute__ 的标准属性查找顺序为：类继承链上的数据描述符（定义了 __set__ 或 __delete__） → 实例自身的 __dict__ → 类继承链上的非数据描述符（仅定义 __get__，如普通方法）与普通类属性 → __getattr__ 兜底。'
 },
 {
  id:'py-x3-4',
  type:'multi',
  q:'关于 Python 类中的 __slots__ 声明，下面哪些说法正确？（多选）',
  options:[
   '声明 __slots__ 后实例默认不再创建 __dict__，能显著降低大量小对象的内存占用',
   '父类声明了 __slots__ 后，所有子类无需声明 __slots__ 也会自动禁止创建 __dict__',
   '若 __slots__ 中未包含 "__weakref__"，该类的实例默认不支持被 weakref.ref 弱引用',
   '给声明了 __slots__ 且未包含 "__dict__" 的类实例绑定未列出的新属性会报 AttributeError'
  ],
  why:[
   '',
   '如果子类没有定义自己的 __slots__，子类实例依然会自动生成 __dict__，需要在子类中也显式声明 __slots__（例如 __slots__ = ()）才能继续生效。',
   '',
   ''
  ],
  answers:[0,2,3],
  explain:'__slots__ 用固定偏移量的描述符槽位替代每个实例的动态 __dict__，大幅节省内存并限制动态属性绑定；需要注意的是未列入 "__weakref__" 时不支持弱引用，且子类若不声明 __slots__ 仍会恢复创建 __dict__。'
 },
 {
  id:'py-x3-5',
  type:'judge',
  q:'在 Python 中，如果一个自定义类没有定义 __iter__ 方法，只定义了接收从 0 开始整数索引并在越界时抛出 IndexError 的 __getitem__ 方法，那么对其实例执行 for 循环遍历会直接抛出 TypeError。',
  answer:false,
  explain:'Python 的 iter() 内置函数兼容旧式序列迭代协议：当对象没有实现 __iter__ 时，解释器会回退尝试调用 __getitem__(0)、__getitem__(1)……依次递增索引，直到捕获 IndexError 作为迭代结束信号。'
 },
 {
  id:'py-x3-6',
  q:'在标准 CPython（默认开启 GIL）环境下，10 个线程并发执行 10000 次全局计数器 total += 1（未加锁），最终结果往往小于 100000。其根本原因是什么？',
  options:[
   'CPython 的 GIL 在遇到 += 运算符时会自动降级为无锁并行模式',
   '每个 Python 线程默认会把全局变量拷贝到独立的 CPU 寄存器且不写回主存',
   'time.sleep 之外的任何算术运算都会触发操作系统的进程级内存写保护中断',
   'total += 1 对应多条字节码指令，GIL 可能在读取旧值与写回新值之间切换线程'
  ],
  why:[
   'GIL 并不会因为 += 运算符而关闭，问题在于单行 Python 代码并不等价于单条原子的字节码指令。',
   '这里的数据竞争并非源于硬件缓存一致性失效，而是字节码层面的“读-改-写”步骤被线程切换打断。',
   '普通算术运算不会触发所谓的进程级写保护中断，CPython 按字节码执行耗时或时间片阈值主动释放并重新竞争 GIL。',
   ''
  ],
  answer:3,
  explain:'total += 1 会被编译为 LOAD_GLOBAL、BINARY_OP（或 INPLACE_ADD）、STORE_GLOBAL 等多条字节码；CPython 线程可能在完成读取与加法后、执行写回前释放 GIL，导致另一线程基于过期旧值计算并互相覆盖，因此仍需 threading.Lock 保护临界区。'
 },
 {
  id:'py-x3-7',
  type:'multi',
  q:'关于 CPython 的全局解释器锁（GIL）以及 Python 3.13 引入的自由线程（PEP 703，Free-threaded Python），下面哪些说法正确？（多选）',
  options:[
   '在开启 GIL 的标准 CPython 中，多线程执行网络请求和磁盘读写完全无法并发等待',
   '标准 CPython 线程在进入底层阻塞式 I/O 系统调用前会释放 GIL，因此多线程适合 I/O 密集型任务',
   '自由线程版 CPython 移除 GIL 后，多个线程同时修改同一个 Python 字典无需任何同步也不会产生竞争',
   '自由线程构建（如 python3.13t）采用偏向引用计数与细粒度对象锁，让纯 Python 多线程能利用多核并行计算'
  ],
  why:[
   '标准 CPython 在执行 socket、文件读写等阻塞式 I/O 时会主动释放 GIL，其他线程可以继续运行，因此 I/O 密集型任务用多线程收益明显。',
   '',
   '自由线程模式虽然为 dict、list 等内置容器引入了内部细粒度锁以防解释器崩溃，但业务逻辑层面的复合操作（如“先查后改”）仍然存在竞态条件，仍需显式加锁。',
   ''
  ],
  answers:[1,3],
  explain:'标准 CPython 在 I/O 阻塞及部分 C 扩展计算（如 NumPy、hashlib）期间会释放 GIL；而 PEP 703 自由线程构建通过偏向引用计数（Biased Reference Counting）和容器内部细粒度锁移除了全局 GIL，使 CPU 密集型多线程得以在多核上并行。'
 },
 {
  id:'py-x3-8',
  q:'在 Windows 或 macOS 上运行下面这段多进程脚本（默认启动方式为 spawn），会出现什么现象？',
  code:'from multiprocessing import Pool\n\ndef run():\n    with Pool(2) as pool:\n        res = pool.map(lambda x: x * 2, [1, 2, 3])\n        print(res)\n\nif __name__ == "__main__":\n    run()',
  options:[
   '正常输出 [2, 4, 6]，子进程直接共享父进程内存中的匿名函数',
   '抛出 PicklingError 或 AttributeError，因为标准 pickle 无法序列化 lambda 函数',
   '程序陷入无限递归创建子进程，因为 if __name__ == "__main__" 写在了模块底部',
   '正常输出 [None, None, None]，因为 lambda 表达式没有显式写 return 关键字'
  ],
  why:[
   'spawn 模式下子进程是全新启动的 Python 解释器进程，不与父进程共享内存对象，所有任务函数和参数都必须经由 pickle 序列化跨进程传输。',
   '',
   '脚本已经正确使用了 if __name__ == "__main__": 保护入口，不会触发无限递归派生子进程。',
   'Python 的 lambda 表达式会自动返回主体表达式的计算结果，报错发生在跨进程序列化阶段而非返回值阶段。'
  ],
  answer:1,
  explain:'multiprocessing 在跨进程传递可调用对象时依赖标准库 pickle，而 pickle 只能按模块的顶层全限定名（qualname）序列化普通顶层函数，无法序列化 lambda 或嵌套局部函数。'
 },
 {
  id:'py-x3-9',
  type:'judge',
  q:'在使用 queue.Queue 构建生产者-消费者线程模型时，主线程调用 q.join() 会一直阻塞，直到每个通过 put() 入队的任务都被消费者调用了对应的 q.task_done()，而不是在 q.empty() 变为 True 的瞬间就立即返回。',
  answer:true,
  explain:'消费者调用 q.get() 取出最后一个元素后，q.empty() 虽然立即变为 True，但该任务可能仍在处理中；Queue 内部维护未完成任务计数器，put() 时加一、task_done() 时减一，q.join() 会在计数器归零时才解除阻塞。'
 },
 {
  id:'py-x3-10',
  q:'使用 concurrent.futures.ThreadPoolExecutor 提交一批耗时各不相同的任务时，关于 executor.map(fn, items) 与 as_completed(futures) 的差异，下面哪项描述正确？',
  options:[
   'executor.map 按输入 items 的原始顺序产出结果，而 as_completed 按任务实际完成的先后顺序产出 Future',
   'executor.map 按任务完成的先后顺序产出结果，而 as_completed 按提交列表的先后顺序产出 Future',
   'executor.map 返回的是未执行的 Future 对象列表，必须再手动调用每个元素的 .result() 才能拿到返回值',
   'as_completed 会在任意子任务抛出异常的瞬间立刻中断迭代，不需要等待调用 future.result() 才触发异常'
  ],
  why:[
   '',
   '两者顺序恰好说反了：保持输入顺序的是 executor.map，按完成先后顺序产出的是 as_completed。',
   'executor.map 直接返回产出任务结果值的迭代器，内部已经封装了 .result() 调用；返回 Future 对象的是 executor.submit 与 as_completed。',
   'as_completed 只负责在 Future 状态变为已完成（含异常结束）时将其产出，任务内部的异常要等到对该 future 调用 .result() 时才会重新抛出。'
  ],
  answer:0,
  explain:'executor.map(fn, items) 会并发提交任务，但严格按照输入序列的顺序依次等待并产出返回值；而 concurrent.futures.as_completed(fs) 则是一个谁先完成就先产出谁的 Future 迭代器，适合流式处理最先返回的结果。'
 },
 {
  id:'py-x3-11',
  q:'下面两个异步函数 seq() 与 conc() 分别运行完成，各自的耗时大约是多少？',
  code:'import asyncio\n\nasync def work(sec: float) -> float:\n    await asyncio.sleep(sec)\n    return sec\n\nasync def seq():\n    a = await work(1.0)\n    b = await work(2.0)\n    return a + b\n\nasync def conc():\n    t1 = asyncio.create_task(work(1.0))\n    t2 = asyncio.create_task(work(2.0))\n    return await t1 + await t2',
  options:[
   'seq() 约 2.0 秒，conc() 约 2.0 秒',
   'seq() 约 3.0 秒，conc() 约 3.0 秒',
   'seq() 约 3.0 秒，conc() 约 2.0 秒',
   'seq() 约 2.0 秒，conc() 约 1.0 秒'
  ],
  why:[
   'seq() 中直接对协程对象 await work(1.0)，必须等第一个协程彻底执行完才会创建并启动第二个协程，因此是串行耗时 1.0 + 2.0 = 3.0 秒。',
   'conc() 先通过 asyncio.create_task 将两个协程同时注册到事件循环中并发调度，两个 sleep 计时重叠进行，总耗时取决于最慢的 2.0 秒。',
   '',
   'conc() 需要等待 t1 和 t2 两个任务都完成，其中 t2 需要 2.0 秒，总耗时不可能比最慢的子任务 2.0 秒更短。'
  ],
  answer:2,
  explain:'直接 await coro() 是串行等待前一个协程结束后再启动下一个；而先调用 asyncio.create_task()（或使用 asyncio.gather / asyncio.TaskGroup）会把协程包装成 Task 立即排入事件循环就绪队列，从而在下一次挂起点并发运行。'
 },
 {
  id:'py-x3-12',
  q:'从 Python 3.8 起，关于 asyncio.CancelledError 与协程取消机制，下面哪项说法正确？',
  options:[
   'CancelledError 继承自 Exception，因此在协程里写 except Exception: 会默认吞掉取消信号',
   '对 Task 调用 task.cancel() 会立即在当前调用栈同步销毁目标协程，无需等待事件循环下一轮调度',
   '协程内捕获 CancelledError 后只要打印一条日志并 return 正常值，外层 asyncio.timeout 仍会按超时报错',
   'CancelledError 直接继承自 BaseException，在协程中捕获它做清理后通常应重新 raise 以免破坏取消传播'
  ],
  why:[
   '为了防止通用的 except Exception: 意外吞掉取消请求，Python 3.8 已将 asyncio.CancelledError 改为直接继承自 BaseException。',
   'task.cancel() 只是向目标 Task 预约在下一次事件循环调度到它的 await 挂起点时注入 CancelledError，并不是立即同步强杀。',
   '如果协程捕获了 CancelledError 却吞掉不重新抛出，Task 会被视为正常结束，从而导致外层 asyncio.timeout 或 TaskGroup 的取消协调机制失效。',
   ''
  ],
  answer:3,
  explain:'Python 3.8 将 CancelledError 移至 BaseException 子类，避免被常规 except Exception 误捕；当确实需要捕获它执行清理（或用 try...finally）时，清理完毕后必须重新 raise，否则取消信号被吞会导致上层超时或结构化并发失灵。'
 },
 {
  id:'py-x3-13',
  type:'multi',
  q:'关于 asyncio 中的结构化并发、同步原语与异步协议，下面哪些说法正确？（多选）',
  options:[
   'asyncio.TaskGroup 在离开 async with 块时会自动等待组内全部任务，若某任务抛异常则自动取消其余未完成任务',
   'asyncio.Semaphore 可通过 async with sem: 限制同时进入临界区的协程数量，常用于控制下游接口并发度',
   '支持 async with 的异步上下文管理器需要实现 __aenter__ 和 __aexit__ 两个异步魔术方法',
   '支持 async for 的异步迭代器需要实现返回自身的 __aiter__，以及每次产出值的 async def __anext__ 方法'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'Python 3.11 引入的 TaskGroup 提供了安全的结构化并发与 ExceptionGroup 错误聚合；Semaphore 用于异步限流；__aenter__/__aexit__ 与 __aiter__/__anext__（耗尽时抛出 StopAsyncIteration）分别构成了 async with 和 async for 的底层协议。'
 },
 {
  id:'py-x3-14',
  type:'judge',
  q:'在 async def 协程函数内部直接调用 time.sleep(3) 或 requests.get(url) 时，asyncio 事件循环会自动检测到底层阻塞并切换到其他就绪 Task，不会卡住当前线程。',
  answer:false,
  explain:'asyncio 是单线程协作式调度，只有遇到 await 挂起可等待对象时事件循环才能切换任务；直接调用 time.sleep 或同步 requests 会把整个事件循环所在线程卡死，应改用 await asyncio.sleep / httpx.AsyncClient 或 await asyncio.to_thread()。'
 },
 {
  id:'py-x3-15',
  type:'fill',
  q:'在 asyncio 协程中，如果必须调用无法改写的第三方同步阻塞 I/O 函数 sync_query(sql)，为了避免卡死事件循环，可以使用标准库提供的快捷函数 await asyncio.＿(sync_query, sql) 将其放到独立工作线程中执行。',
  accepted:['to_thread'],
  explain:'Python 3.9 引入的 asyncio.to_thread(func, /, *args, **kwargs) 会自动将同步阻塞调用委托给默认的 ThreadPoolExecutor 并拷贝当前 contextvars 上下文，返回可被 await 的协程。'
 },
 {
  id:'py-x3-16',
  type:'short',
  q:'请完整说明 Python 中读取实例属性 obj.attr 时的查找优先级顺序，并结合数据描述符与非数据描述符的区别，解释为什么 @property 装饰的属性不会被 obj.__dict__["attr"] 覆盖，而类中定义的普通方法却会被实例字典里的同名属性遮蔽。',
  reference:'1. obj.attr 的标准查找顺序（由 object.__getattribute__ 执行）：\n   ① 先在 type(obj) 及其 MRO 继承链的各个类字典中查找同名属性，若找到且该对象是“数据描述符”（同时定义了 __get__，以及 __set__ 或 __delete__ 之一），直接调用其 __get__(obj, type(obj)) 返回；\n   ② 若不是数据描述符，则在实例自身的属性字典 obj.__dict__ 中查找，命中则直接返回；\n   ③ 若实例字典未命中，再回到类及 MRO 继承链结果：若为“非数据描述符”（仅定义了 __get__），调用其 __get__(obj, type(obj)) 返回；若为普通类属性则直接返回该属性值；\n   ④ 若以上均未找到，且类定义了 __getattr__(self, name) 兜底方法，则调用它，否则抛出 AttributeError。\n2. @property 与普通方法的区别：\n   - @property 创建的 property 对象同时实现了 __get__、__set__ 和 __delete__（即便未定义 setter，其 __set__ 方法依然存在，只是调用时会抛出 AttributeError: can\'t set attribute），因此它属于数据描述符，优先级高于 obj.__dict__，不会被实例字典中的同名键覆盖；\n   - 类中定义的普通函数只实现了 __get__（用于绑定 self 生成 bound method），没有实现 __set__，属于非数据描述符，优先级低于 obj.__dict__，因此一旦向实例字典写入同名键就会将方法遮蔽。',
  points:[
   '准确写出查找顺序：类/MRO 数据描述符 → 实例 __dict__ → 类/MRO 非数据描述符及普通类属性 → __getattr__ 兜底',
   '说明数据描述符（含 __get__ 及 __set__/__delete__）与非数据描述符（仅含 __get__）的区分标准',
   '解释 property 对象天生实现了 __set__（未配 setter 时抛异常），属于数据描述符，优先级高于实例 __dict__',
   '解释普通函数仅实现 __get__ 用作方法绑定，属于非数据描述符，优先级低于实例 __dict__ 所以会被遮蔽'
  ],
  explain:'掌握“数据描述符 > 实例 __dict__ > 非数据描述符 > __getattr__”这一核心链条，就能彻底搞懂 @property、方法绑定、缓存属性（如 functools.cached_property 属于非数据描述符，写入实例 __dict__ 后下次直接命中字典）的工作原理。'
 },
 {
  id:'py-x3-17',
  type:'short',
  q:'对比 CPython 中 threading、multiprocessing 与 asyncio 三种并发模型的底层机制、适用场景以及各自最常见的踩坑点。',
  reference:'1. threading（多线程）：\n   - 机制与场景：操作系统内核抢占式调度，共享同一进程地址空间；受标准 CPython GIL 限制，同一时刻仅一个线程执行 Python 字节码，但在阻塞式 I/O 时会释放 GIL，适合中低并发规模的阻塞型 I/O 任务或无法改造成异步的旧代码；\n   - 常见坑点：共享内存读写存在数据竞争（如 += 非原子），需用 Lock 或 queue.Queue 同步；锁顺序不当易死锁。\n2. multiprocessing（多进程）：\n   - 机制与场景：每个子进程拥有独立的 Python 解释器实例和独立 GIL，可真正利用多核 CPU 并行执行，适合 CPU 密集型计算任务；\n   - 常见坑点：进程创建与内存开销大；Windows/macOS 默认 spawn 模式要求入口加 if __name__ == "__main__": 保护，且跨进程通信的参数与函数必须能被 pickle 序列化（不支持 lambda 和局部函数）。\n3. asyncio（单线程异步协程）：\n   - 机制与场景：单线程事件循环 + I/O 多路复用（epoll/kqueue/IOCP）协作式调度，在 await 处显式让出控制权，上下文切换成本极低，适合高并发网络 I/O（如网关、爬虫、大模型 API 聚合）；\n   - 常见坑点：协程内混入 time.sleep、requests 等同步阻塞调用会卡死整个事件循环（需换异步库或用 asyncio.to_thread）；捕获 CancelledError 后忘记重新 raise 会导致取消与超时失效。',
  points:[
   '准确说明 threading 受 GIL 限制但 I/O 期间释放 GIL，适合传统阻塞 I/O，需注意共享状态加锁与线程安全',
   '准确说明 multiprocessing 拥有独立解释器与 GIL，适合 CPU 密集型任务，需注意 spawn 入口保护与 pickle 序列化开销',
   '准确说明 asyncio 基于单线程事件循环协作式调度，适合高并发网络 I/O，切换开销小',
   '指出 asyncio 的关键避坑点：禁止在协程内直接调用同步阻塞函数（可用 to_thread），以及正确传播 CancelledError'
  ],
  explain:'面试回答 Python 并发选型时，先按“CPU 密集选多进程（或自由线程/C 扩展）、高并发网络 I/O 选 asyncio、存量同步阻塞 I/O 选多线程或 to_thread”给出清晰结论，再补充各自的底层边界与工程坑点。'
 },
 {
  id:'py-x3-18',
  type:'code',
  q:'使用 asyncio 编写一个带并发上限和单任务超时控制的批量请求函数 async def fetch_all(urls: list[str], limit: int, timeout: float) -> list[str | None]：\n1. 使用 asyncio.Semaphore(limit) 限制同时处于请求中的任务数不超过 limit；\n2. 调用题目给定的模拟请求协程 async def fake_fetch(url: str) -> str，并用 asyncio.wait_for（或 asyncio.timeout）将单次请求超时控制在 timeout 秒内（注意：排队等待信号量的时间不应计入请求超时，或获取信号量后再开启超时计时），若超时则返回 None 而不影响其他任务；\n3. 并发执行所有请求，按 urls 的原始顺序返回结果列表，并在 main 中演示调用。',
  reference:'import asyncio\n\nasync def fake_fetch(url: str) -> str:\n    delay = 0.5 if "slow" in url else 0.1\n    await asyncio.sleep(delay)\n    return f"200:{url}"\n\nasync def fetch_all(urls: list[str], limit: int, timeout: float) -> list[str | None]:\n    sem = asyncio.Semaphore(limit)\n\n    async def _one(url: str) -> str | None:\n        async with sem:\n            try:\n                return await asyncio.wait_for(fake_fetch(url), timeout=timeout)\n            except TimeoutError:\n                return None\n\n    tasks = [asyncio.create_task(_one(u)) for u in urls]\n    return await asyncio.gather(*tasks)\n\nasync def main() -> None:\n    urls = ["https://a.com", "https://slow.com", "https://b.com"]\n    results = await fetch_all(urls, limit=2, timeout=0.2)\n    print(results)  # [\'200:https://a.com\', None, \'200:https://b.com\']\n\nif __name__ == "__main__":\n    asyncio.run(main())',
  points:[
   '创建 asyncio.Semaphore(limit) 并使用 async with sem: 控制最大并发数',
   '在拿到信号量之后使用 asyncio.wait_for 或 async with asyncio.timeout 控制单次请求超时',
   '捕获 TimeoutError（或 asyncio.TimeoutError）并返回 None，保证单个超时不中断整体任务',
   '使用 asyncio.gather（或 TaskGroup）并发调度所有子任务并保持与输入 urls 一致的返回顺序'
  ],
  explain:'将信号量获取 async with sem: 放在外层、超时控制 wait_for/timeout 放在内层，可以避免任务还在排队等待信号量时就被误判为网络请求超时，这是生产级异步限流代码的常见细节考点。'
 }
];
