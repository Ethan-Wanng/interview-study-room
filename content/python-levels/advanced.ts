import type {AiLevel} from '../journey';

// Python 高阶：第 10 关数据模型与描述符、第 11 关并发与 GIL、第 12 关 asyncio 异步编程。
export const pyDataModel:AiLevel={
 id:'py-data-model',
 title:'数据模型、魔术方法与描述符',
 summary:'双下划线魔术方法、__eq__/__hash__ 契约、属性查找顺序、描述符协议与 __slots__ 内存优化',
 lessons:[
  {
   title:'Python 数据模型：为什么写 len(x) 而不是 x.length()',
   body:'从其他语言转来学 Python 时，很多人会好奇：为什么求长度要写 len(items) 而不是 items.length()？为什么自定义对象也能用 + 相加、用 in 判断包含、用 for 遍历？\n答案就是 Python 的“数据模型”（Data Model）。Python 把语法操作和内置函数统一映射成了一组以双下划线开头和结尾的特殊方法（常称为“魔术方法”或 dunder methods，double underscore 的缩写）：\n一、len(x) 会去调用 x.__len__()；\n二、a + b 会去调用 a.__add__(b)；\n三、k in box 会去调用 box.__contains__(k)；\n四、for item in seq 会去调用 seq.__iter__()（或退而求其次调用 __getitem__）。\n这套设计带来两个好处：第一，不管是内置的 list、dict 还是你自己写的类，都遵守同一套协议，阅读和复用代码时完全没有割裂感；第二，对内置容器（如 list、str、dict），CPython 甚至可以直接读取底层 C 结构体里记录长度的字段，省去方法查找开销，既统一又快。\n写 Pythonic 的类，秘诀就是：不要发明各种 get_size()、add_item()，而是顺着数据模型实现对应的双下划线方法。',
   code:`class Playlist:
    def __init__(self, songs):
        self._songs = list(songs)

    def __len__(self):
        return len(self._songs)

    def __contains__(self, song):
        return song in self._songs

pl = Playlist(["晴天", "七里香", "稻香"])
print(len(pl), "晴天" in pl)`,
   explain:[
    {at:'class Playlist:',to:'self._songs = list(songs)',text:'定义一个播放列表类，把传入的歌曲复制成内部列表 _songs 保存，避免外部修改原列表影响内部数据。'},
    {at:'def __len__(self):',to:'return len(self._songs)',text:'实现 __len__ 后，外部就可以直接对实例调用 len(pl)，Python 会自动转发到这里。'},
    {at:'def __contains__(self, song):',to:'return song in self._songs',text:'实现 __contains__ 后，就能用 in 和 not in 判断某首歌是否在播放列表里。'},
    {at:'pl = Playlist',text:'创建包含 3 首歌的 Playlist 实例。'},
    {at:'print(len(pl), "晴天" in pl)',text:'len(pl) 调用 __len__ 返回 3，"晴天" in pl 调用 __contains__ 返回 True。'}
   ]
  },
  {
   title:'__repr__ 与 __str__，以及运算符重载的 NotImplemented',
   body:'自定义对象转成文字时有两个魔术方法，职责分明：\n一、__repr__（面向开发者）：目标是“准确、无歧义”，最好能直接当成合法的 Python 代码还原出对象，比如 Money(50, "CNY")。在交互式终端直接输入变量名、打印日志、或者把对象放进列表 print([m]) 时，Python 调用的都是 __repr__；\n二、__str__（面向最终用户）：目标是“易读好看”，比如 ¥50。用 print(m) 或 str(m) 时优先调用 __str__；如果类没有定义 __str__，Python 会自动退回到 __repr__。所以如果你只想实现一个，优先写 __repr__。\n做运算符重载（如 __add__、__lt__）时，有一个极容易踩的坑：遇到不支持的另一侧类型，千万不要 raise TypeError，也不要 raise NotImplementedError，而是应该返回内置单例 NotImplemented！\n为什么要返回 NotImplemented？当表达式 a + b 的左操作数 a.__add__(b) 返回 NotImplemented 时，Python 不会立刻放弃，而是会尝试调用右操作数的反向方法 b.__radd__(a)；只有两边都返回 NotImplemented，Python 才会统一抛出 TypeError。这让不同类型之间可以优雅协作。',
   code:`class Money:
    def __init__(self, amount, currency="CNY"):
        self.amount = amount
        self.currency = currency

    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"

    def __str__(self):
        return f"{self.amount} {self.currency}"

    def __add__(self, other):
        if isinstance(other, Money) and self.currency == other.currency:
            return Money(self.amount + other.amount, self.currency)
        return NotImplemented

    def __radd__(self, other):
        if other == 0:
            return self
        return NotImplemented`,
   explain:[
    {at:'class Money:',to:'self.currency = currency',text:'定义金额类，记录数值 amount 和币种 currency。'},
    {at:'def __repr__(self):',to:'return f"Money({self.amount!r}',text:'开发者视图：用 !r 把字段按 repr 格式拼出来，结果类似 Money(50, \'CNY\')，方便调试。'},
    {at:'def __str__(self):',to:'return f"{self.amount} {self.currency}"',text:'用户视图：print(m) 时显示更友好的 50 CNY。'},
    {at:'def __add__(self, other):',to:'return Money(self.amount + other.amount',text:'同币种的 Money 相加时返回一个新 Money 对象，不修改原对象。'},
    {at:'return NotImplemented',text:'遇到不同币种或其他类型时返回 NotImplemented，把机会交给右操作数的 __radd__ 处理。'},
    {at:'def __radd__(self, other):',to:'return self',text:'支持内置 sum([Money(10), Money(20)])：sum 默认从整数 0 开始累加，0.__add__(Money) 返回 NotImplemented 后，Python 会转而调用 Money.__radd__(0)。'},
    {at:'return NotImplemented',text:'其他不支持的左操作数同样返回 NotImplemented，让 Python 统一报 TypeError。'}
   ]
  },
  {
   title:'__eq__ 与 __hash__：不可打破的哈希契约',
   body:'要把自定义对象放进 set 或当作 dict 的键，对象必须是“可哈希”（hashable）的。Python 的哈希表依赖一条铁律——哈希契约：\n一、如果 a == b 为 True，那么 hash(a) == hash(b) 必须成立（反过来不要求：不同对象允许碰巧算出相同哈希值，这叫哈希冲突）；\n二、对象在放进 dict 或 set 期间，它的哈希值不能改变，否则以后再按新哈希值去找，就再也找不回自己了。\n普通类如果不重写任何方法，默认继承自 object：__eq__ 按对象身份（is）比较，__hash__ 也基于对象地址计算，两者天生满足契约。\n但只要你在类里自定义了 __eq__（改成按字段值比较）却没写 __hash__，Python 就会自动把类的 __hash__ 设为 None，让实例直接变成“不可哈希”（放进 set 会报 TypeError: unhashable type）。\n这不是 bug，而是 Python 在保护你：如果不这么做，两个字段相等的实例就会算出不同的地址哈希，放进 set 会去重失败。\n实践原则：可变对象（比如字段会随时改的购物车）干脆保持不可哈希；只有不可变的值对象（如坐标 Point、版本号）才应该同时实现 __eq__ 和 __hash__，并且让 __hash__ 基于 __eq__ 用到的同一组不可变字段计算（或直接用 @dataclass(frozen=True) 自动生成）。',
   code:`class Point:
    def __init__(self, x, y):
        self._x = x
        self._y = y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self._x, self._y) == (other._x, other._y)

    def __hash__(self):
        return hash((self._x, self._y))

class MutableBox:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return isinstance(other, MutableBox) and self.value == other.value`,
   explain:[
    {at:'class Point:',to:'self._y = y',text:'不可变坐标点：用下划线约定 _x 和 _y 创建后不再改动，适合作为值对象。'},
    {at:'def __eq__(self, other):',to:'return (self._x, self._y) == (other._x, other._y)',text:'按坐标值比较相等性；遇到非 Point 类型返回 NotImplemented。'},
    {at:'def __hash__(self):',to:'return hash((self._x, self._y))',text:'把 __eq__ 比较的同一组不可变字段打包成元组再求哈希，严格遵守“相等则哈希相等”契约。'},
    {at:'class MutableBox:',to:'self.value = value',text:'可变容器类，value 随时可能被修改。'},
    {at:'def __eq__(self, other):',to:'return isinstance(other, MutableBox)',text:'只重写了 __eq__ 而没写 __hash__，Python 会自动把 MutableBox.__hash__ 设为 None，防止可变对象误入 set/dict。'}
   ]
  },
  {
   title:'容器协议与可调用对象',
   body:'除了 len 和运算符，还有几个高频魔术方法能让你的类用起来像内置对象一样顺手：\n一、__getitem__(self, index)：支持方括号取值 obj[0]。更妙的是，切片语法 obj[1:3] 也会传给 __getitem__，只不过这时收到的 index 是一个 slice 对象（如 slice(1, 3, None)）。用 isinstance(index, slice) 就能区分单个下标和切片，切片通常返回一个同类型的新容器；\n二、__contains__(self, item)：定制 item in obj。如果类没实现 __contains__，Python 会退回到逐个迭代查找（O(n)），自己实现后可以用内部 set/dict 做到 O(1)；\n三、__bool__(self)：定制 if obj: 和 bool(obj) 的真值判断。没实现 __bool__ 时，Python 会退而求其次看 __len__() != 0；如果两个都没实现，自定义实例默认都为 True；\n四、__call__(self, *args, **kwargs)：让“实例本身”可以像函数一样加括号调用 obj(x)。这非常适合编写带配置或带状态的函数对象，比如限流器、带参数的装饰器类、以及 PyTorch 里的神经网络层（model(x)）。',
   code:`class ThresholdFilter:
    def __init__(self, limit):
        self.limit = limit
        self.hit_count = 0

    def __call__(self, values):
        matched = [v for v in values if v >= self.limit]
        self.hit_count += len(matched)
        return matched

high_pass = ThresholdFilter(60)
passed = high_pass([45, 72, 88, 59])
print(passed, high_pass.hit_count)`,
   explain:[
    {at:'class ThresholdFilter:',to:'self.hit_count = 0',text:'创建一个带阈值的过滤器类，同时在实例上记录累计命中的元素个数。'},
    {at:'def __call__(self, values):',to:'return matched',text:'实现 __call__ 后，实例就能像函数一样被调用：筛选出大于等于 limit 的元素，顺便累加命中次数并返回结果。'},
    {at:'high_pass = ThresholdFilter(60)',text:'构造阈值 60 的过滤器实例。'},
    {at:'passed = high_pass([45, 72, 88, 59])',text:'像普通函数一样调用 high_pass(...)，实际执行的是 __call__。'},
    {at:'print(passed, high_pass.hit_count)',text:'输出 [72, 88] 和累计命中数 2。'}
   ]
  },
  {
   title:'动手试试：打造支持切片、相加与去重的自定义向量',
   body:'把前面学到的魔术方法串起来，亲手写一个不可变向量类 Vector：它支持 repr/str、len、索引与切片、in、bool、+ 相加、== 比较以及放进 set 去重。\n特别留意 __getitem__ 里对 slice 的判断：单个索引返回数字，切片返回一个新的 Vector，这样向量切片后依然能继续相加和求长度。',
   practice:{
    steps:[
     '打开终端（Windows 用 PowerShell，Mac/Linux 用终端），输入 py --version 或 python3 --version 确认已安装 Python 3.11 及以上版本。',
     '新建文件 vector_demo.py，把下面的代码完整粘贴进去并保存（建议用 UTF-8 编码）。',
     '在终端里运行 py vector_demo.py（Mac/Linux 运行 python3 vector_demo.py），核对输出是否与预期完全一致。',
     '试着把 __hash__ 方法注释掉再运行，看看把 Vector 放进集合 {v1, ...} 时 Python 会报什么错，亲眼验证 __eq__ 与 __hash__ 的契约。'
    ],
    expect:'repr: Vector(1, 2, 3, 4)\nstr: <1, 2, 3, 4>\n长度与索引: 4 2 Vector(2, 3)\n成员与布尔: True False\n相加: <11, 22, 33, 44>\n相等与集合去重: True 2'
   },
   code:`class Vector:
    def __init__(self, *items):
        self._items = tuple(items)

    def __repr__(self):
        args = ", ".join(repr(x) for x in self._items)
        return f"Vector({args})"

    def __str__(self):
        return f"<{', '.join(str(x) for x in self._items)}>"

    def __len__(self):
        return len(self._items)

    def __bool__(self):
        return bool(self._items)

    def __getitem__(self, index):
        if isinstance(index, slice):
            return Vector(*self._items[index])
        return self._items[index]

    def __contains__(self, value):
        return value in self._items

    def __eq__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return self._items == other._items

    def __hash__(self):
        return hash(self._items)

    def __add__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        if len(self) != len(other):
            raise ValueError("向量长度不一致")
        return Vector(*(a + b for a, b in zip(self._items, other._items)))

v1 = Vector(1, 2, 3, 4)
v2 = Vector(10, 20, 30, 40)
print("repr:", repr(v1))
print("str:", str(v1))
print("长度与索引:", len(v1), v1[1], repr(v1[1:3]))
print("成员与布尔:", 3 in v1, bool(Vector()))
v3 = v1 + v2
print("相加:", v3)
print("相等与集合去重:", v1 == Vector(1, 2, 3, 4), len({v1, Vector(1, 2, 3, 4), v3}))`,
   explain:[
    {at:'class Vector:',to:'self._items = tuple(items)',text:'用不可变元组保存元素，既保护内部数据，也为后面实现 __hash__ 打好基础。'},
    {at:'def __repr__(self):',to:'return f"Vector({args})"',text:'开发者视图：拼出可直接还原对象的 Vector(1, 2, 3, 4)。'},
    {at:'def __str__(self):',to:'return f"<{',text:'用户视图：打印成更简洁的 <1, 2, 3, 4>。'},
    {at:'def __len__(self):',to:'return bool(self._items)',text:'实现长度和布尔真值判断：空向量 Vector() 的 bool 值为 False。'},
    {at:'def __getitem__(self, index):',to:'return self._items[index]',text:'同时支持索引和切片：切片时返回新 Vector，单个下标时直接返回对应元素。'},
    {at:'def __contains__(self, value):',to:'return value in self._items',text:'支持 3 in v1 的成员判断。'},
    {at:'def __eq__(self, other):',to:'return hash(self._items)',text:'按元组内容判断相等，并用同一个元组算哈希，满足哈希契约。'},
    {at:'def __add__(self, other):',to:'return Vector(*(a + b',text:'先判断类型（不是 Vector 就返回 NotImplemented），再校验长度，最后逐项相加生成新向量。'},
    {at:'v1 = Vector(1, 2, 3, 4)',to:'print("相等与集合去重:"',text:'依次验证 repr、str、长度、索引切片、in、bool、加法、相等判断以及放进 set 去重的效果。'}
   ]
  },
  {
   title:'属性访问链全解析：obj.attr 到底按什么顺序找？',
   body:'每次在 Python 里写下 obj.attr，背后并不是简单地去查一下字典，而是严格走完一条 5 级优先级的查找链（由 object.__getattribute__ 实现）：\n一、先进入类的 __getattribute__(self, name)：这是所有属性访问的总入口，无论属性存不存在都会经过它；\n二、查类及其父类（按 MRO 顺序）里有没有同名的“数据描述符”（同时定义 __get__ 且定义了 __set__ 或 __delete__）。只要找到，直接调用它的 __get__ 并返回，连实例自己的 __dict__ 都不看！\n三、查实例自己的属性字典 obj.__dict__[name]：找到了就直接返回；\n四、查类及其父类（MRO）里有没有同名的“非数据描述符”（只定义了 __get__）或普通类属性：是非数据描述符就调用 __get__，否则直接返回类属性；\n五、前面全没找到，就会触发兜底钩子 __getattr__(self, name)；如果连 __getattr__ 也没定义，才正式抛出 AttributeError。\n记住 __getattribute__ 和 __getattr__ 的核心区别：前者每次访问属性都会触发（在里面直接写 self.x 会无限递归，必须调用 super().__getattribute__）；后者只在“常规查找失败”时才触发，安全得多，常用于延迟加载或动态代理对象。',
   code:`class SafeConfig:
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"配置项 {name!r} 不存在")

cfg = SafeConfig({"host": "localhost", "port": 8080})
cfg.env = "prod"
print(cfg.env, cfg.host)`,
   explain:[
    {at:'class SafeConfig:',to:'self._data = data',text:'把配置字典存在实例属性 _data 里。'},
    {at:'def __getattr__(self, name):',to:'raise AttributeError',text:'只有当属性不在实例 __dict__ 和类属性里时，才会进入这里，从 _data 字典里兜底查找；找不到则按规范抛 AttributeError。'},
    {at:'cfg = SafeConfig',to:'cfg.env = "prod"',text:'env 被直接存进了 cfg.__dict__。'},
    {at:'print(cfg.env, cfg.host)',text:'访问 cfg.env 直接命中实例 __dict__，不会触发 __getattr__；访问 cfg.host 在 __dict__ 和类里都找不到，才触发 __getattr__ 返回 localhost。'}
   ]
  },
  {
   title:'描述符协议与 Python 方法绑定的底层真相',
   body:'刚才的查找链里反复出现了一个高手词汇——“描述符”（Descriptor）。它到底是什么？\n只要一个类定义了 __get__、__set__、__delete__ 三个方法中的任意一个，它的实例作为“另一个类的类属性”使用时，就是一个描述符，用来接管该属性的读取、赋值和删除。\n另外，Python 3.6+ 提供了 __set_name__(self, owner, name) 钩子：当宿主类刚创建完毕时，Python 会自动通知描述符“你在类里被起名叫什么”，省去了重复传属性名的麻烦。\n描述符分两派：\n一、数据描述符（Data Descriptor）：定义了 __set__ 或 __delete__。它的优先级高于实例 __dict__，用来做字段校验、只读属性（如 @property），防止被外部直接塞进实例字典绕过；\n二、非数据描述符（Non-data Descriptor）：只定义了 __get__。它的优先级低于实例 __dict__，因此实例可以给同名属性赋值来覆盖它（比如 @functools.cached_property 就是先算一次，再把结果塞进 instance.__dict__，下次访问直接命中缓存！）。\n最震撼的真相来了：Python 里你每天都在用的 @property、@classmethod、@staticmethod，甚至每一个普通的 def 实例方法，底层全都是描述符！普通函数对象自带 __get__，当你写 u.greet 时，Python 调用 User.greet.__get__(u, User)，返回一个自动把 u 绑成第一个参数 self 的绑定方法（bound method）。',
   code:`class User:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"你好，{self.name}"

u = User("小雅")
bound = User.greet.__get__(u, User)
print(u.greet() == bound(), hasattr(User.greet, "__get__"))`,
   explain:[
    {at:'class User:',to:'return f"你好，{self.name}"',text:'定义一个带普通实例方法 greet 的类。'},
    {at:'u = User("小雅")',text:'创建实例 u。'},
    {at:'bound = User.greet.__get__(u, User)',text:'手动演示 Python 访问 u.greet 时在幕后做的事：调用函数对象的 __get__ 非数据描述符，把 u 绑定为 self，生成绑定方法。'},
    {at:'print(u.greet() == bound()',text:'两者调用结果完全一致（True），且函数确实带有 __get__ 方法（True）。'}
   ]
  },
  {
   title:'动手试试：手写带类型与范围校验的数据描述符',
   body:'在业务代码或框架（比如 ORM、Pydantic 思路）里，如果价格、库存、年龄都要校验“必须是整数且在范围内”，写一堆重复的 @property 会非常啰嗦。把校验逻辑抽成一个数据描述符 BoundedInt，声明类属性时一行搞定！\n注意一个小细节：在 Python 里 bool 是 int 的子类（isinstance(True, int) 是 True），所以校验整数时要额外排除 bool。同时留意值是怎么存的：因为 BoundedInt 是数据描述符，即使我们把数据直接存进 instance.__dict__[self.name]，后续读取 p.price 依然会先经过描述符的 __get__，不会被实例字典遮盖。',
   practice:{
    steps:[
     '新建文件 descriptor_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py descriptor_demo.py（Mac/Linux 运行 python3 descriptor_demo.py），核对输出是否与预期完全一致。',
     '留意输出第二行：通过类名 Product.price 访问时，__get__ 收到的 instance 是 None，按惯例返回描述符对象本身。',
     '试着把 p.stock = 500 改成 p.stock = 2000，看看能否拦截越界赋值。'
    ],
    expect:'机械键盘: 价格=399, 库存=15\n类属性访问描述符: BoundedInt\n拦截非法赋值: ValueError price 必须在 1..10000 之间\n拦截非法赋值: TypeError price 必须是整数'
   },
   code:`class BoundedInt:
    def __init__(self, min_val, max_val):
        self.min_val = min_val
        self.max_val = max_val

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner=None):
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        if isinstance(value, bool) or not isinstance(value, int):
            raise TypeError(f"{self.name} 必须是整数")
        if not (self.min_val <= value <= self.max_val):
            raise ValueError(f"{self.name} 必须在 {self.min_val}..{self.max_val} 之间")
        instance.__dict__[self.name] = value

class Product:
    price = BoundedInt(1, 10000)
    stock = BoundedInt(0, 999)

    def __init__(self, name, price, stock):
        self.name = name
        self.price = price
        self.stock = stock

p = Product("机械键盘", 399, 15)
print(f"{p.name}: 价格={p.price}, 库存={p.stock}")
print("类属性访问描述符:", type(Product.price).__name__)

for bad in (-10, True):
    try:
        p.price = bad
    except (TypeError, ValueError) as e:
        print("拦截非法赋值:", type(e).__name__, e)`,
   explain:[
    {at:'class BoundedInt:',to:'self.max_val = max_val',text:'描述符初始化时保存允许的最小值和最大值。'},
    {at:'def __set_name__(self, owner, name):',to:'self.name = name',text:'类创建时 Python 自动调用，把宿主类上的属性名（price / stock）记下来。'},
    {at:'def __get__(self, instance, owner=None):',to:'return instance.__dict__[self.name]',text:'通过类访问（Product.price）时 instance 为 None，返回描述符自身；通过实例访问时从实例字典取出值。'},
    {at:'def __set__(self, instance, value):',to:'instance.__dict__[self.name] = value',text:'先排除 bool 并检查 int 类型，再检查上下界，全部通过才写入实例字典；任何非法赋值都会立刻抛出异常。'},
    {at:'class Product:',to:'self.stock = stock',text:'把 price 和 stock 声明为类级别的描述符；__init__ 里的 self.price = price 也会自动触发描述符的 __set__ 校验。'},
    {at:'p = Product("机械键盘", 399, 15)',to:'print("类属性访问描述符:"',text:'创建合法商品并打印字段，以及通过类名直接访问描述符的结果。'},
    {at:'for bad in (-10, True):',to:'print("拦截非法赋值:"',text:'分别尝试赋负数和布尔值 True，验证范围校验和类型校验都能准确拦截。'}
   ]
  },
  {
   title:'__slots__：告别每实例一个 __dict__ 的内存优化',
   body:'默认情况下，Python 每个实例都自带一个 __dict__ 字典来存属性。字典底层是哈希表，为了查询快会预留空槽，单个实例看起来只多占几十上百字节，可一旦程序里同时创建几百万个小对象（比如坐标点、游戏粒子、日志条目、ORM 行对象），这些 __dict__ 就会吃掉几百 MB 甚至数 GB 内存。\n在类里定义 __slots__ = ("x", "y") 就能彻底改变存储方式：Python 不再为每个实例创建 __dict__（默认也不创建 __weakref__），而是在实例底层结构体里直接预留固定槽位，并在类上为每个槽位自动生成一种叫 member_descriptor 的数据描述符。\n好处很直接：\n一、内存占用通常能降低 40%～60% 以上；\n二、属性访问走固定偏移量，比查哈希表稍快；\n三、顺带防止拼错属性名时悄悄动态新增字段（未在 __slots__ 里的属性赋值会直接报 AttributeError）。\n使用 __slots__ 必须记住两个常见坑：\n一、继承坑：如果子类继承了带 __slots__ 的父类，但子类自己没写 __slots__，子类实例就会重新长出 __dict__，省内存效果直接泡汤！即使子类不加新字段，也要写 __slots__ = ()；\n二、不要在子类 __slots__ 里重复写父类的字段名，否则会造成重复槽位浪费内存甚至遮蔽父类槽位。',
   code:`class Point2D:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y

class Point3D(Point2D):
    __slots__ = ("z",)

    def __init__(self, x, y, z):
        super().__init__(x, y)
        self.z = z`,
   explain:[
    {at:'class Point2D:',to:'__slots__ = ("x", "y")',text:'声明实例只允许有 x 和 y 两个槽位，不再为每个实例分配 __dict__。'},
    {at:'def __init__(self, x, y):',to:'self.y = y',text:'给槽位赋值，写法和普通类完全一样，底层实际走的是类上的 member_descriptor。'},
    {at:'class Point3D(Point2D):',to:'__slots__ = ("z",)',text:'子类只需列出新增的字段 z（不要重复写 x、y），并且必须显式声明 __slots__，否则实例会重新获得 __dict__。'},
    {at:'def __init__(self, x, y, z):',to:'self.z = z',text:'先调用父类初始化 x、y，再初始化子类自己的槽位 z。'}
   ]
  },
  {
   title:'动手试试：对比普通类与 __slots__ 的行为和内存',
   body:'眼见为实：下面同时创建普通类 NormalPoint 和使用 __slots__ 的 SlotPoint，亲手检查 __dict__ 是否存在、尝试动态挂属性、查看槽位描述符的真实类型、对比单实例内存占用，以及验证子类漏写 __slots__ 的继承坑。',
   practice:{
    steps:[
     '新建文件 slots_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py slots_demo.py（Mac/Linux 运行 python3 slots_demo.py），核对每一行输出。',
     '观察 SubNoSlots 和 SubWithSlots 的差异：只是少写了一行 __slots__，子类实例就重新带上了 __dict__。',
     '试着在代码末尾打印 normal_bytes 和 slot_bytes 的具体数字，感受一下当前 Python 版本下单个小对象省了多少字节。'
    ],
    expect:'普通实例有 __dict__: True\nslots 实例有 __dict__: False\n槽位属性类型: member_descriptor\n禁止动态加属性: AttributeError\nslots 更省内存: True\n子类未写 slots 有 __dict__: True\n子类写了 slots 有 __dict__: False (1, 2, 3)'
   },
   code:`import sys

class NormalPoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class SlotPoint:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y

class SubNoSlots(SlotPoint):
    pass

class SubWithSlots(SlotPoint):
    __slots__ = ("z",)

    def __init__(self, x, y, z):
        super().__init__(x, y)
        self.z = z

np = NormalPoint(1, 2)
sp = SlotPoint(1, 2)
print("普通实例有 __dict__:", hasattr(np, "__dict__"))
print("slots 实例有 __dict__:", hasattr(sp, "__dict__"))
print("槽位属性类型:", type(SlotPoint.x).__name__)

try:
    sp.z = 3
except AttributeError as e:
    print("禁止动态加属性:", type(e).__name__)

normal_bytes = sys.getsizeof(np) + sys.getsizeof(np.__dict__)
slot_bytes = sys.getsizeof(sp)
print("slots 更省内存:", slot_bytes < normal_bytes)

s1 = SubNoSlots(1, 2)
s2 = SubWithSlots(1, 2, 3)
print("子类未写 slots 有 __dict__:", hasattr(s1, "__dict__"))
print("子类写了 slots 有 __dict__:", hasattr(s2, "__dict__"), (s2.x, s2.y, s2.z))`,
   explain:[
    {at:'import sys',text:'引入 sys，用来通过 getsizeof 比较对象占用的内存字节数。'},
    {at:'class NormalPoint:',to:'self.y = y',text:'普通类，每个实例都会自动创建一个 __dict__ 字典存属性。'},
    {at:'class SlotPoint:',to:'self.y = y',text:'带 __slots__ 的类，只为 x 和 y 预留固定槽位，没有 __dict__。'},
    {at:'class SubNoSlots(SlotPoint):',to:'pass',text:'反面教材：子类没声明 __slots__，实例会重新拥有 __dict__。'},
    {at:'class SubWithSlots(SlotPoint):',to:'self.z = z',text:'正确示范：子类声明新增槽位 z，保持无 __dict__ 状态。'},
    {at:'np = NormalPoint(1, 2)',to:'print("槽位属性类型:"',text:'检查两边有没有 __dict__，并打印 SlotPoint.x 的类型——它其实是 CPython 生成的 member_descriptor。'},
    {at:'try:',to:'print("禁止动态加属性:"',text:'试图给 SlotPoint 实例动态添加未声明的 z 属性，捕获预期的 AttributeError。'},
    {at:'normal_bytes = sys.getsizeof',to:'print("slots 更省内存:"',text:'普通实例的真实开销要算上对象头和 __dict__ 两部分，远大于 slots 实例。'},
    {at:'s1 = SubNoSlots(1, 2)',to:'print("子类写了 slots 有 __dict__:"',text:'对比两种子类的行为，验证子类漏写 __slots__ 的坑。'}
   ]
  }
 ],
 quiz:[
  {
   id:'py-data-model-1',
   q:'如果一个自定义类只打算实现 __repr__ 和 __str__ 中的一个，应该优先实现哪一个？',
   options:['优先实现 __str__，因为 print 会用它','优先实现 __repr__，缺 __str__ 时会兜底','两个都不重要，object 默认输出已足够','两者互相独立，少写任意一个都会报错'],
   why:['如果只写 __str__，在 REPL、日志和列表里打印对象时仍会退回到难懂的 <Foo object at 0x...>。','','object 默认输出只含类名和内存地址，排查问题很不方便。','不写其中任何一个都不会报错，只是缺 __str__ 时会自动调用 __repr__。'],
   answer:1,
   explain:'当类没有定义 __str__ 时，str(obj) 和 print(obj) 会自动回退到 __repr__；反过来 __repr__ 不会回退到 __str__。所以只实现一个时优先写 __repr__。'
  },
  {
   id:'py-data-model-2',
   q:'在自定义类的 __add__(self, other) 里遇到不支持的 other 类型时，应该怎么做？',
   options:['直接抛出 TypeError 并给出提示信息','抛出 NotImplementedError 通知调用方','返回内置常量 NotImplemented 交由右侧尝试','返回 None 让表达式安静地跳过本次运算'],
   why:['直接抛 TypeError 会阻断 Python 尝试右侧对象的 __radd__ 方法。','NotImplementedError 是留给抽象方法未实现的异常，不是运算符协议的信号。','','返回 None 会让 a + b 静默变成 None，掩盖类型错误。'],
   answer:2,
   explain:'返回单例 NotImplemented 告诉解释器“左侧处理不了”，Python 会继续尝试调用 other.__radd__(self)；如果两边都返回 NotImplemented，再由 Python 统一抛出 TypeError。'
  },
  {
   id:'py-data-model-3',
   q:'自定义类重写了 __eq__（按字段值比较相等），但没有定义 __hash__，把实例放进 set 会怎样？',
   options:['报 TypeError，因为 __hash__ 被设为 None','正常运行，自动继续沿用 object.__hash__','报 AttributeError，提示找不到哈希方法','正常运行，自动按全部实例属性算哈希值'],
   why:['','如果继续沿用按内存地址算的 object.__hash__，值相等的两个对象哈希却不同，会破坏 set 和 dict。','类上存在 __hash__ 属性，只是其值被置为 None，所以抛的是 TypeError（unhashable type）。','Python 不会猜测字段是否可变，因此不会自动按属性生成哈希。'],
   answer:0,
   explain:'为了维护“a == b 则 hash(a) == hash(b)”的哈希契约，一旦自定义 __eq__ 而未定义 __hash__，Python 会自动把类的 __hash__ 设为 None，使实例变为不可哈希。'
  },
  {
   id:'py-data-model-4',
   q:'访问实例属性 obj.attr 时，如果类上同名数据描述符、实例 __dict__ 和类上非数据描述符同时存在，优先级最高的是？',
   options:['实例自身 __dict__ 里保存的同名键值','类上定义的 __getattr__ 兜底查找方法','类上的非数据描述符或普通类属性定义','类上定义的数据描述符（如 @property）'],
   why:['数据描述符优先级高于实例 __dict__，这样 @property 等校验不会被实例字典绕过。','__getattr__ 优先级最低，只在常规查找彻底失败后才会被调用。','非数据描述符优先级低于实例 __dict__，所以实例属性可以覆盖普通方法。',''],
   answer:3,
   explain:'属性查找顺序为：__getattribute__ → 类的数据描述符 → 实例 __dict__ → 类的非数据描述符/普通类属性 → __getattr__ 兜底。'
  },
  {
   id:'py-data-model-5',
   q:'父类定义了 __slots__ = ("x", "y")，如果子类什么也没加（未定义 __slots__），子类实例会怎样？',
   options:['自动继承父类限制，同样没有 __dict__','会重新创建 __dict__，失去省内存效果','在定义子类阶段就直接抛出 TypeError','无法访问从父类继承下来的 x 和 y 槽位'],
   why:['不写 __slots__ 的子类不会自动保持无 __dict__，至少要显式写 __slots__ = ()。','','定义不带 __slots__ 的子类完全合法，不会报错。','父类的 x、y 槽位依然能正常读写，只是子类实例额外多了一个 __dict__。'],
   answer:1,
   explain:'子类如果不显式定义 __slots__（即使是不新增字段也要写 __slots__ = ()），Python 会为子类实例重新分配 __dict__，导致内存优化失效。'
  },
  {
   id:'py-data-model-6',
   type:'multi',
   q:'下面哪些 Python 内置机制底层依赖了描述符协议？（多选）',
   options:['@property 只读或校验属性装饰器','类里用 def 定义的普通实例方法','@classmethod 类方法绑定装饰器','存放在实例 __dict__ 里的普通整数'],
   why:['','','','实例 __dict__ 里的值只是普通数据对象，描述符要作为类属性挂载到类上才会触发协议。'],
   answers:[0,1,2],
   explain:'@property 是数据描述符，普通函数对象、@classmethod、@staticmethod 都是非数据描述符；调用 obj.method 时正是通过函数对象的 __get__ 绑定 self。'
  },
  {
   id:'py-data-model-7',
   type:'multi',
   q:'关于 __eq__ 与 __hash__ 的设计，下面哪些做法符合 Python 哈希契约？（多选）',
   options:['两个对象哈希值相等时，== 也须返回 True','两个对象 == 返回 True 时，哈希值须相等','可变对象重写 __eq__ 后随意返回常量哈希','不可变值对象按 __eq__ 同组字段计算哈希'],
   why:['哈希冲突允许不同对象拥有相同哈希值，所以哈希相等不要求对象相等。','','可变对象放进 dict/set 后若状态改变会影响相等性或哈希，且全返回常量会让哈希表退化为 O(n) 链表。',''],
   answers:[1,3],
   explain:'哈希契约要求：若 a == b 则 hash(a) == hash(b)，且对象在生命周期内哈希稳定。不可变值对象应基于与 __eq__ 相同的不可变字段元组来算哈希。'
  },
  {
   id:'py-data-model-8',
   type:'judge',
   q:'只要给类定义了 __getattr__，每次访问该实例上已存在的普通属性时都会先调用 __getattr__。',
   answer:false,
   explain:'错误。每次属性访问都会进入的是 __getattribute__；__getattr__ 只是兜底方法，只有在常规属性查找链全部找不到目标属性时才会被触发。'
  },
  {
   id:'py-data-model-9',
   type:'judge',
   q:'在自定义类里实现 __getitem__ 并针对 slice 对象做分支处理后，实例就能支持 obj[1:3] 切片语法。',
   answer:true,
   explain:'正确。Python 会把切片语法 obj[1:3] 转成 slice(1, 3, None) 对象传给 __getitem__(self, index)，通过 isinstance(index, slice) 即可返回切片结果。'
  },
  {
   id:'py-data-model-10',
   type:'fill',
   q:'在自定义类里声明 ＿ 属性，可以让实例改用固定槽位存储字段而不再创建 __dict__，从而显著降低海量小对象的内存占用。',
   accepted:['__slots__'],
   explain:'定义 __slots__ = ("a", "b") 后，Python 会为实例分配固定槽位并用类级 member_descriptor 访问，省去每实例一个 __dict__ 的内存开销。'
  },
  {
   id:'py-data-model-11',
   type:'short',
   q:'请说明数据描述符与非数据描述符的区别、它们与实例 __dict__ 的优先级关系，并分别举一个 Python 标准机制的例子。',
   reference:`一、定义区别：
- 数据描述符（Data Descriptor）：定义了 __set__ 或 __delete__（通常也定义 __get__）。
- 非数据描述符（Non-data Descriptor）：只定义了 __get__，没有定义 __set__ 和 __delete__。

二、与实例 __dict__ 的优先级关系：
查找顺序为「类的数据描述符 > 实例 __dict__ > 类的非数据描述符」。
- 数据描述符优先级高于实例 __dict__，因此即使实例字典里有同名键，访问属性时仍然会优先走描述符，确保只读或校验逻辑不被绕过。
- 非数据描述符优先级低于实例 __dict__，因此只要往实例字典写入同名键，后续访问就会直接命中实例字典。

三、典型例子：
- 数据描述符：@property（哪怕只定义了 getter，property 对象本身也实现了 __set__，只读时会抛 AttributeError）以及 __slots__ 生成的 member_descriptor。
- 非数据描述符：普通函数对象（绑定实例方法）、@classmethod、@staticmethod、@functools.cached_property（首次计算后写入实例 __dict__ 实现缓存）。`,
   points:[
    '准确区分数据描述符（定义 __set__ 或 __delete__）与非数据描述符（只定义 __get__）',
    '说清优先级顺序：数据描述符 > 实例 __dict__ > 非数据描述符',
    '解释为何这样设计（防止绕过校验 vs 允许实例覆盖/缓存）',
    '分别给出标准例子（如 @property / __slots__ 与 普通方法 / cached_property）'
   ],
   explain:'掌握这两类描述符与 __dict__ 的先后关系，就彻底看透了 Python 面向对象属性查找和装饰器绑定的底层原理。'
  },
  {
   id:'py-data-model-12',
   type:'code',
   q:'编写一个数据描述符 PositiveNumber：用 __set_name__ 自动记录属性名，写入时校验值必须是 int 或 float（排除 bool）且严格大于 0，不合法时分别抛出 TypeError 或 ValueError；再定义一个 Order 类，用它管理 price 和 quantity 两个属性。',
   reference:`class PositiveNumber:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner=None):
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise TypeError(f"{self.name} 必须是数字")
        if value <= 0:
            raise ValueError(f"{self.name} 必须大于 0")
        instance.__dict__[self.name] = value

class Order:
    price = PositiveNumber()
    quantity = PositiveNumber()

    def __init__(self, price, quantity):
        self.price = price
        self.quantity = quantity`,
   points:[
    '实现 __set_name__ 自动保存属性名',
    '实现 __get__ 且在 instance is None 时返回 self',
    '实现 __set__ 校验数值类型（并排除 bool）且严格大于 0，分别抛 TypeError 与 ValueError',
    '将值存储在实例（如 instance.__dict__[self.name]）而非描述符自身，避免多实例串数据',
    '在 Order 类上以类属性方式声明 price 和 quantity 描述符'
   ],
   explain:'描述符实例挂载在类上，被所有 Order 实例共享，所以真实数据必须存在 instance（如 instance.__dict__）里，绝不能直接存在 self.value 上。'
  }
 ]
};

export const pyConcurrency:AiLevel={
 id:'py-concurrency',
 title:'并发编程：GIL、线程与多进程',
 summary:'I/O vs CPU 密集型、CPython GIL 原理与演进、threading 与锁、multiprocessing 与 concurrent.futures',
 lessons:[
  {
   title:'并发 vs 并行，以及识别瓶颈的黄金法则',
   body:'学并发编程之前，先把两个经常混用的词分清：\n一、并发（Concurrency）：同一时间段内“同时应对”多件事。好比一位厨师烧着水的同时去切菜、顺手看一眼烤箱——虽然只有一个灶台一个厨师，但只要在一件事等待的时候切去做另一件事，整体耗时就大幅缩短；\n二、并行（Parallelism）：同一时刻“真正同时执行”多件事。好比请了四位厨师在四个灶台同时炒四道菜，对应电脑里的多核 CPU 同时跑指令。\n决定你在 Python 里该选多线程、多进程还是异步协程的黄金法则，就是先看任务属于哪类瓶颈：\n一、I/O 密集型（I/O-bound）：程序绝大多数时间都在“傻等”——等网络接口回包、等数据库查询、等读写磁盘文件。这类任务用多线程或 asyncio 效果立竿见影；\n二、CPU 密集型（CPU-bound）：程序绝大多数时间都在埋头算——图像处理、视频转码、加密解密、大规模纯 Python 数学运算。这类任务想提速必须真正吃满多核，靠多进程或 C/Rust 扩展。'
  },
  {
   title:'CPython 的 GIL：真相、常见误解与 3.13+ 自由线程',
   body:'谈到 Python 并发，面试官几乎必问 GIL（Global Interpreter Lock，全局解释器锁）。\n什么是 GIL？在官方默认实现 CPython 里，每个进程有一把全局互斥锁，保证同一进程内同一时刻只有一个线程在执行 Python 字节码。因此，哪怕你的电脑有 16 个核心，在单个进程里开 8 个线程去跑纯 Python 的循环计算，也无法利用多核，甚至因为线程切换和抢锁变得比单线程还慢。\n为什么当年要设计 GIL？因为 CPython 用“引用计数”管理对象内存，每个对象的增删引用都太频繁了；加一把全局大锁既让单线程极快，又让海量 C 扩展库（如早期的科学计算生态）写起来简单安全。\n但这里有两个必须纠正的常见误解：\n一、等待 I/O 时会释放 GIL！当线程在等网络 socket、读文件或执行 time.sleep() 时，CPython 会主动交出 GIL，让其他线程运行，所以多线程加速 I/O 密集型任务非常有效；\n二、很多 C/Rust 扩展计算时也会释放 GIL！比如 NumPy 矩阵运算、Pillow 图像压缩、hashlib 哈希计算，底层进入 C 代码后都会释放 GIL，即使配合 Python 线程也能真正跑满多核。\n演进动态：从 Python 3.13 开始，PEP 703 带来了实验性的自由线程构建（Free-threaded Python，如 python3.13t，编译选项 --disable-gil），通过细粒度对象锁与偏向引用计数尝试移除 GIL，后续版本（3.14+）正持续走向正式支持。即便如此，在相当长一段时间内，理解 GIL 依然是线上排障和面试的核心基本功。'
  },
  {
   title:'threading 基础：为什么有 GIL 还需要 Lock？',
   body:'标准库 threading 用来创建和管理线程：threading.Thread(target=fn, args=...) 构造线程对象，调用 start() 才真正启动新线程（千万别直接调 run()，那只是在当前线程里同步调用函数），调用 join() 等待线程结束。把 daemon=True 设为守护线程后，主线程结束时程序不会等它，直接随进程退出——适合做后台心跳监控，但不适合写还没落盘的重要数据。\n接下来是一个超高频面试陷阱：“既然 GIL 保证同一时刻只有一个线程执行字节码，那多个线程一起执行 count += 1 是线程安全的吗？”\n答案是：不安全！因为 count += 1 并不是一条原子指令，它至少会被编译成“读取 count → 加 1 → 存回 count”多条字节码。CPython 每隔几毫秒（默认 5ms，可用 sys.getswitchinterval() 查看）就可能切换线程：如果线程 A 刚读出 100 还没写回就被切走，线程 B 也读出 100 改成 101 写回，接着线程 A 醒来把自己的 101 写回去——两次加 1 只涨了 1，数据悄悄丢了！这就是“竞态条件”（Race Condition）。\n解决办法：用 threading.Lock() 保护共享数据的读写临界区，并且务必用 with lock: 上下文管理器，保证哪怕代码块里抛了异常，锁也会自动释放，不会把其他线程永久卡死。',
   code:`import threading

balance = 0
lock = threading.Lock()

def deposit(amount, times):
    global balance
    for _ in range(times):
        with lock:
            balance += amount

t1 = threading.Thread(target=deposit, args=(1, 1000))
t2 = threading.Thread(target=deposit, args=(1, 1000))
t1.start()
t2.start()
t1.join()
t2.join()`,
   explain:[
    {at:'import threading',text:'导入标准库线程模块。'},
    {at:'balance = 0',to:'lock = threading.Lock()',text:'声明共享变量 balance 和用来保护它的互斥锁 lock。'},
    {at:'def deposit(amount, times):',to:'global balance',text:'定义存款任务函数，声明修改外层全局变量 balance。'},
    {at:'for _ in range(times):',to:'balance += amount',text:'用 with lock: 包住读改写操作，确保同一时刻只有一个线程修改 balance，彻底杜绝竞态条件。'},
    {at:'t1 = threading.Thread',to:'t2 = threading.Thread',text:'创建两个线程，分别把 target 和参数元组 args 传进去。'},
    {at:'t1.start()',to:'t2.start()',text:'调用 start() 启动新线程，两个线程开始并发执行。'},
    {at:'t1.join()',to:'t2.join()',text:'主线程等待两个子线程都跑完再继续往下走，最终 balance 准确等于 2000。'}
   ]
  },
  {
   title:'RLock、Event、Semaphore 与线程安全 queue.Queue',
   body:'除了最基础的 Lock，多线程协作还有四个趁手的工具：\n一、RLock（可重入锁）：同一个线程可以多次获取同一把 RLock（退出时释放同等次数即可）。如果一个加了锁的函数内部又调用了另一个也要加同一把锁的辅助函数，普通 Lock 会“自己把自己锁死”，换 RLock 就迎刃而解；\n二、Event（事件信号）：一个线程安全的布尔开关。一个或多个线程调用 event.wait() 挂起等待，另一个线程调用 event.set() 瞬间唤醒全部等待者，最常用来优雅通知后台线程停止运行；\n三、Semaphore（信号量）：带计数器的锁，比如 Semaphore(5) 允许最多 5 个线程同时访问数据库连接池；\n四、queue.Queue（线程安全队列）：多线程之间传数据的首选！它内部已经自带锁和阻塞唤醒机制，生产者只管 put()，消费者只管 get()，处理完调 task_done()，主线程调 q.join() 就能等所有任务处理完毕。用队列解耦生产者与消费者，比自己手写复杂的共享列表加锁要安全省心得多。',
   code:`import queue

q = queue.Queue(maxsize=10)
q.put("任务1")
item = q.get()
q.task_done()
q.join()`,
   explain:[
    {at:'import queue',text:'导入标准库线程安全队列模块。'},
    {at:'q = queue.Queue(maxsize=10)',text:'创建最多缓存 10 个元素的队列；放满时 put() 会自动阻塞，形成天然背压。'},
    {at:'q.put("任务1")',text:'生产者把任务安全放入队列，不需要自己额外加锁。'},
    {at:'item = q.get()',text:'消费者取出任务；队列为空时 get() 会自动阻塞等待，不会空转浪费 CPU。'},
    {at:'q.task_done()',to:'q.join()',text:'每消费完一条调一次 task_done()，q.join() 会一直等到所有入队任务都被标记完成才返回。'}
   ]
  },
  {
   title:'动手试试：用 Lock 保护计数与 Queue 实现生产者-消费者',
   body:'把前面两张卡片的核心模式动手跑一遍：第一段用 4 个线程并发累加共享变量，借助 with lock: 拿到精确结果；第二段用 queue.Queue 搭建经典生产者-消费者，并通过“哨兵值”（None）优雅通知消费者结束循环。',
   practice:{
    steps:[
     '新建文件 thread_queue_demo.py，把下面的代码完整粘贴进去并保存。',
     '在终端里运行 py thread_queue_demo.py（Mac/Linux 运行 python3 thread_queue_demo.py），核对输出是否与预期一致。',
     '留意消费者里的 try ... finally: task_queue.task_done()：即便是取到哨兵值 None 准备 return，也必须调用 task_done()，否则主线程的 task_queue.join() 会一直卡住！'
    ],
    expect:"加锁累加结果: 20000\n队列消费结果: ['已处理:订单A', '已处理:订单B', '已处理:订单C']"
   },
   code:`import queue
import threading

counter = 0
lock = threading.Lock()

def add_many(times):
    global counter
    for _ in range(times):
        with lock:
            counter += 1

threads = [threading.Thread(target=add_many, args=(5000,)) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print("加锁累加结果:", counter)

task_queue = queue.Queue()
done = []

def consumer():
    while True:
        item = task_queue.get()
        try:
            if item is None:
                return
            done.append(f"已处理:{item}")
        finally:
            task_queue.task_done()

worker = threading.Thread(target=consumer)
worker.start()

for order in ("订单A", "订单B", "订单C"):
    task_queue.put(order)
task_queue.put(None)

task_queue.join()
worker.join()
print("队列消费结果:", done)`,
   explain:[
    {at:'import queue',to:'import threading',text:'导入线程安全队列和线程模块。'},
    {at:'counter = 0',to:'lock = threading.Lock()',text:'初始化共享计数器与互斥锁。'},
    {at:'def add_many(times):',to:'counter += 1',text:'每个线程循环累加，用 with lock: 保证每次加 1 的原子性。'},
    {at:'threads = [threading.Thread',to:'print("加锁累加结果:", counter)',text:'启动 4 个线程各加 5000 次，全部 join 后结果精确为 20000。'},
    {at:'task_queue = queue.Queue()',to:'done = []',text:'创建任务队列和结果列表。'},
    {at:'def consumer():',to:'task_queue.task_done()',text:'消费者循环取任务，遇到哨兵 None 退出；finally 确保不管正常处理还是遇到哨兵都会通知队列 task_done()。'},
    {at:'worker = threading.Thread',to:'worker.start()',text:'启动消费者后台线程。'},
    {at:'for order in ("订单A"',to:'task_queue.put(None)',text:'主线程依次放入 3 个订单，最后放入哨兵 None 表示生产结束。'},
    {at:'task_queue.join()',to:'print("队列消费结果:", done)',text:'等队列清空且消费者线程退出后，打印按先进先出顺序处理完的结果。'}
   ]
  },
  {
   title:'multiprocessing 多进程：真正跑满多核 CPU',
   body:'面对纯 Python 的 CPU 密集型任务，想绕开 GIL 跑满多核，标准武器就是 multiprocessing。\n原理很直接：每个子进程都有自己独立的 Python 解释器、独立的内存空间和独立的 GIL，操作系统可以把它们真正调度到不同的 CPU 核心上并行计算。\n但享受多核并行的同时，必须清楚它的三大代价和一条 Windows 铁律：\n一、创建更慢、内存更重：拉起一个新进程比建线程慢得多，而且子进程内存彼此隔离——在子进程里改一个普通的全局列表，父进程根本看不到；跨进程通信要靠 multiprocessing.Queue、Pipe 或 shared_memory；\n二、数据要经过 pickle 序列化：传给子进程的函数、参数和返回值都要能被 pickle 打包，所以匿名 lambda、函数内部定义的局部函数、或者打开的数据库连接都不能直接传；\n三、启动方式与 if __name__ == "__main__": 铁律：Linux 早期默认用 fork（直接复制父进程内存，快但在父进程已有多线程时容易死锁，Python 3.14 起转向更安全的 forkserver）；而 Windows 和 macOS 默认用 spawn——子进程会重新启动一个全新的解释器并把你的 .py 文件从头导入一遍！如果建进程的代码直接写在模块顶层，子进程导入时又会继续建子进程，瞬间陷入无限递归报错。所以多进程入口务必包在 if __name__ == "__main__": 里！',
   code:`from multiprocessing import Pool

def square_sum(n):
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    with Pool(processes=2) as pool:
        results = pool.map(square_sum, [100_000, 200_000])
        print(results)`,
   explain:[
    {at:'from multiprocessing import Pool',text:'导入进程池 Pool，用来复用固定数量的工作进程，避免频繁创建销毁进程的开销。'},
    {at:'def square_sum(n):',to:'return sum(i * i',text:'必须定义在模块顶层（不能用 lambda），方便子进程通过 pickle 按名字找到并导入它。'},
    {at:'if __name__ == "__main__":',text:'Windows 和 macOS 上必须加的入口保护，防止 spawn 模式导入模块时无限递归拉起子进程。'},
    {at:'with Pool(processes=2) as pool:',to:'print(results)',text:'启动 2 个工作进程并行计算平方和，退出 with 块时自动关闭并回收进程池。'}
   ]
  },
  {
   title:'现代统一接口：concurrent.futures',
   body:'直接手写 threading.Thread 或 multiprocessing.Process 时，收集返回值、捕获子任务异常、控制并发数量都很繁琐。现代 Python 代码更推荐使用标准库 concurrent.futures。\n它提供了两个接口完全一致的执行器：\n一、ThreadPoolExecutor(max_workers=...)：线程池，适合 I/O 密集型任务；\n二、ProcessPoolExecutor(max_workers=...)：进程池，适合 CPU 密集型任务。\n因为它们共用同一套 API，很多时候把线程池换成进程池只需要改一个类名！核心用法有三招：\n一、配合 with 使用：退出 with 块时自动等待已提交任务完成并回收线程/进程，不会泄漏资源；\n二、executor.map(fn, items)：批量提交任务，并严格按照“输入顺序”返回结果（即使后面的任务先算完）；\n三、executor.submit(fn, arg)：提交单个任务并立刻返回一个 Future（代表将来会就绪的结果）。配合 as_completed(futures) 可以“谁先完成就先处理谁”；调用 future.result() 时，如果子任务内部抛了异常，会在这里原样重新抛出，方便集中处理。',
   code:`from concurrent.futures import ThreadPoolExecutor, as_completed

def double(n):
    return n * 2

with ThreadPoolExecutor(max_workers=3) as ex:
    ordered = list(ex.map(double, [1, 2, 3]))
    futures = [ex.submit(double, x) for x in [10, 20]]
    done = [f.result() for f in as_completed(futures)]`,
   explain:[
    {at:'from concurrent.futures import',text:'导入线程池和按完成顺序迭代结果的 as_completed。'},
    {at:'def double(n):',to:'return n * 2',text:'待并发执行的工作函数。'},
    {at:'with ThreadPoolExecutor(max_workers=3) as ex:',text:'创建最多 3 个工作线程的线程池，离开 with 自动清理。'},
    {at:'ordered = list(ex.map(double, [1, 2, 3]))',text:'ex.map 并发执行并按输入顺序收集结果，得到 [2, 4, 6]。'},
    {at:'futures = [ex.submit',text:'ex.submit 逐个提交任务，立刻拿到对应的 Future 对象列表。'},
    {at:'done = [f.result() for f in as_completed(futures)]',text:'as_completed 在任意任务完成时立刻产出它的 Future，f.result() 取出返回值（若任务出错则在这里抛异常）。'}
   ]
  },
  {
   title:'动手试试：ThreadPoolExecutor 按序汇总与异常捕获',
   body:'这个练习演示 concurrent.futures 最常用的两个特性：用 executor.map 并发查询并保证输出顺序与输入一致，再用 executor.submit 演示如何通过 future.result() 把子线程里抛出的异常准确抓回到主线程。',
   practice:{
    steps:[
     '新建文件 futures_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py futures_demo.py（Mac/Linux 运行 python3 futures_demo.py），核对输出。',
     '观察一下：在普通 threading.Thread 里子线程抛异常主线程抓不到，但在 Future 模型里，调用 bad_future.result() 会把异常干净地重新抛到主线程的 except 块里。'
    ],
    expect:"按输入顺序汇总: ['小明:92分', '小红:88分', '小李:95分']\n捕获子线程异常: KeyError 找不到用户 未知用户"
   },
   code:`from concurrent.futures import ThreadPoolExecutor

def fetch_score(name):
    scores = {"小明": 92, "小红": 88, "小李": 95}
    if name not in scores:
        raise KeyError(f"找不到用户 {name}")
    return f"{name}:{scores[name]}分"

users = ["小明", "小红", "小李"]
with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(fetch_score, users))
    print("按输入顺序汇总:", results)

    bad_future = executor.submit(fetch_score, "未知用户")
    try:
        bad_future.result()
    except KeyError as e:
        print("捕获子线程异常:", type(e).__name__, e.args[0])`,
   explain:[
    {at:'from concurrent.futures import ThreadPoolExecutor',text:'导入线程池执行器。'},
    {at:'def fetch_score(name):',to:'return f"{name}:{scores[name]}分"',text:'模拟查询分数的函数，用户不存在时抛出 KeyError。'},
    {at:'users = ["小明", "小红", "小李"]',text:'准备待查询的用户名列表。'},
    {at:'with ThreadPoolExecutor(max_workers=3) as executor:',to:'print("按输入顺序汇总:", results)',text:'并发查询三个用户，executor.map 保证结果顺序与 users 完全一致。'},
    {at:'bad_future = executor.submit',text:'单独提交一个会触发异常的任务，此时不会立刻报错，异常会被记录在 Future 内部。'},
    {at:'try:',to:'print("捕获子线程异常:"',text:'调用 bad_future.result() 时异常在主线程重抛，被 except KeyError 精准捕获。'}
   ]
  },
  {
   title:'死锁排查与 Python 并发选型指南',
   body:'多线程编程里最让人头疼的事故就是“死锁”（Deadlock）：线程 A 拿着锁 1 等锁 2，线程 B 拿着锁 2 等锁 1，双方寸步不让，程序彻底卡死。\n排查和预防死锁有三条实用守则：\n一、固定全局加锁顺序：只要需要同时拿多把锁（比如账户 A 给账户 B 转账），所有线程一律按统一顺序加锁（比如先锁 ID 较小的账户，再锁较大的），从数学上杜绝循环等待；\n二、给抢锁加超时：必要时使用 lock.acquire(timeout=2.0)，拿不到就放弃并回退重试，并打印日志告警，不要无限期挂死；\n三、少用嵌套手写锁：优先用 queue.Queue 传消息或用 concurrent.futures 提交无共享状态的纯任务，把共享可变状态缩到最小。\n最后送你一张 Python 并发选型速查表：\n一、高并发网络 I/O（成千上万连接、爬虫、API 网关）→ asyncio（下一关详解）；\n二、中小规模 I/O 且依赖同步库（如 requests、旧版数据库驱动、本地文件）→ ThreadPoolExecutor；\n三、纯 Python 的 CPU 重计算（解析、加密、仿真）→ ProcessPoolExecutor / multiprocessing；\n四、矩阵/数值/图像重计算 → 直接用 NumPy、PyTorch 或 C/Rust 扩展，它们内部已释放 GIL 并用 C/SIMD 加速，往往比开多进程更快。'
  },
  {
   title:'动手试试：用 threading.Event 优雅停止后台线程',
   body:'后台常驻工作线程最忌讳“强杀”，否则可能把任务干到一半就中断。工程上最标准的做法是配一个 threading.Event 作为停止信号：工作线程每隔一小段时间醒来看一眼 stop_event.is_set()，主线程等所有任务干完后调用 stop_event.set()，再 join() 等它安全收尾退出。',
   practice:{
    steps:[
     '新建文件 event_stop_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py event_stop_demo.py（Mac/Linux 运行 python3 event_stop_demo.py），核对输出顺序。',
     '思考为什么 jobs.get(timeout=0.02) 要加 timeout：如果不加超时，队列空了以后工作线程会一直死等在 get() 上，就算主线程调用了 stop_event.set()，它也没机会检查到停止信号。'
    ],
    expect:'后台处理：发送邮件\n后台处理：写入日志\n后台处理：清理缓存\n所有任务完成，通知后台线程退出\n后台线程收到停止信号，安全退出\n主线程结束'
   },
   code:`import queue
import threading

jobs = queue.Queue()
stop_event = threading.Event()

def worker():
    while not stop_event.is_set():
        try:
            item = jobs.get(timeout=0.02)
        except queue.Empty:
            continue
        print(f"后台处理：{item}")
        jobs.task_done()
    print("后台线程收到停止信号，安全退出")

t = threading.Thread(target=worker)
t.start()

for name in ("发送邮件", "写入日志", "清理缓存"):
    jobs.put(name)

jobs.join()
print("所有任务完成，通知后台线程退出")
stop_event.set()
t.join()
print("主线程结束")`,
   explain:[
    {at:'import queue',to:'stop_event = threading.Event()',text:'创建任务队列和用来通知退出的事件对象 stop_event（初始为未触发状态）。'},
    {at:'def worker():',to:'while not stop_event.is_set():',text:'工作线程持续运行，直到主线程把 stop_event 置为触发状态。'},
    {at:'try:',to:'continue',text:'带 0.02 秒超时地取任务：队列暂时为空时会抛 queue.Empty 并回到循环头重新检查停止信号，不会永远卡死在 get() 上。'},
    {at:'print(f"后台处理：{item}")',to:'jobs.task_done()',text:'处理任务并向队列报告完成。'},
    {at:'print("后台线程收到停止信号，安全退出")',text:'跳出循环后做收尾打印，线程干净退出。'},
    {at:'t = threading.Thread(target=worker)',to:'t.start()',text:'启动后台工作线程。'},
    {at:'for name in ("发送邮件"',to:'jobs.put(name)',text:'往队列投递三个任务。'},
    {at:'jobs.join()',to:'stop_event.set()',text:'先等三个任务全部处理完，再打印提示并触发停止信号。'},
    {at:'t.join()',to:'print("主线程结束")',text:'等后台线程完成退出打印后再结束主线程，确保输出和资源回收完全有序。'}
   ]
  }
 ],
 quiz:[
  {
   id:'py-concurrency-1',
   q:'在有 GIL 的 CPython 里，为什么用多线程并发请求 50 个网页依然能大幅提速？',
   options:['GIL 会自动为每个新线程复制一份解释器','网页请求属于纯计算，能触发多核并行','线程在等待网络 I/O 期间会主动释放 GIL','threading 模块底层默认改用多进程实现'],
   why:['同一进程内的线程共享同一个解释器和同一把 GIL，不会复制解释器。','请求网页绝大部分时间在等网络回包，属于 I/O 密集型，不是纯计算。','','threading 是真正的操作系统线程，不会偷偷变成多进程。'],
   answer:2,
   explain:'线程在执行网络读写、磁盘 I/O 或 time.sleep() 等阻塞等待时会释放 GIL，其他线程立刻可以拿到 GIL 继续发起或处理请求，因此多线程对 I/O 密集型任务提速明显。'
  },
  {
   id:'py-concurrency-2',
   q:'既然 CPython 的 GIL 保证同一时刻只有一个线程执行字节码，为什么多线程执行 count += 1 仍然可能算错？',
   options:['count += 1 由多条字节码组成，中途可能切换线程','GIL 在整数加法运算时会自动临时关闭释放','Python 整数是可变对象，原地修改会导致损坏','多个线程各自持有不同的全局变量副本相互覆盖'],
   why:['','纯 Python 整数加法仍在解释器内执行，不会主动释放 GIL。','Python 的 int 是不可变对象，+= 实际是算出新整数再重新绑定名字。','同一进程内的线程共享全局变量，问题出在读改写非原子。'],
   answer:0,
   explain:'count += 1 包含读取、加 1、写回多条字节码；线程切换可能发生在读取之后、写回之前，导致后写入的值覆盖先写入的结果，所以仍需要用 threading.Lock 保护。'
  },
  {
   id:'py-concurrency-3',
   q:'一个函数加锁后，在函数内部又调用了另一个也会获取同一把锁的辅助函数。如果使用的是普通 threading.Lock，会发生什么？',
   options:['自动识别同一线程并放行，正常执行完毕','自动把内层的加锁语句跳过，给出一条警告','直接抛出 RuntimeError 提示禁止重复加锁','同一线程等待自己释放锁，立刻发生自我死锁'],
   why:['能识别同一线程并允许重入的是 RLock，普通 Lock 不记录持有者线程。','普通 Lock 不会跳过加锁，而是会阻塞等待锁释放。','普通 Lock 重复 acquire 不会抛异常，而是无限期阻塞。',''],
   answer:3,
   explain:'普通 Lock 不可重入，同一线程在未释放前再次 acquire 会一直等自己释放，形成自我死锁；需要嵌套加同一把锁时应改用 threading.RLock。'
  },
  {
   id:'py-concurrency-4',
   q:'在 Windows 上使用 multiprocessing 创建子进程时，为什么必须把创建进程的代码放进 if __name__ == "__main__": 里？',
   options:['Windows 要求进程池对象声明在局部作用域内','spawn 会重新导入模块，不保护会无限递归建进程','不加这行代码，子进程里无法使用 pickle 序列化','不加这行代码，程序会自动退化成单线程顺序执行'],
   why:['进程池并非要求放进局部作用域，关键在于避免模块被导入时重复执行建进程代码。','','pickle 序列化能力与是否写 __main__ 判断无关。','不加保护不会退化成单线程，而是会反复拉起子进程并抛出 RuntimeError。'],
   answer:1,
   explain:'Windows 和 macOS 默认使用 spawn 启动方式：子进程会启动新的 Python 解释器并重新导入主模块。把启动代码放进 if __name__ == "__main__": 能确保只有主进程真正创建子进程。'
  },
  {
   id:'py-concurrency-5',
   q:'使用 ThreadPoolExecutor 时，executor.map() 与 submit() 配合 as_completed() 的主要区别是？',
   options:['map 按单线程串行运行，as_completed 才并发执行','map 遇到异常会忽略，as_completed 会立刻终止程序','map 按输入顺序返回结果，as_completed 按完成先后产出','map 适用于进程池，as_completed 仅适用于线程池'],
   why:['两者都会在线程池里并发执行提交的任务。','map 迭代到出错项时同样会抛出异常，不会默默忽略。','','map 和 as_completed 对 ThreadPoolExecutor 与 ProcessPoolExecutor 都适用。'],
   answer:2,
   explain:'executor.map 按输入序列的原始顺序返回结果；submit + as_completed 则谁先跑完就先返回谁的 Future，适合需要尽快响应最快结果的场景。'
  },
  {
   id:'py-concurrency-6',
   type:'multi',
   q:'在标准 CPython 环境下，下面哪些场景能释放 GIL 或突破单核 GIL 限制实现提速？（多选）',
   options:['多线程并发等待网络接口与文件读写','多线程调用释放 GIL 的 NumPy 矩阵计算','多线程并发执行纯 Python 的素数筛选循环','用 multiprocessing 开启多个工作进程算哈希'],
   why:['','','纯 Python 字节码循环不会释放 GIL，多线程反而因切换开销变慢，应改用多进程。',''],
   answers:[0,1,3],
   explain:'I/O 阻塞等待会释放 GIL，NumPy 等 C 扩展在底层重计算时会主动释放 GIL，multiprocessing 则通过多进程拥有各自独立的 GIL 实现真正多核并行。'
  },
  {
   id:'py-concurrency-7',
   type:'multi',
   q:'下面哪些工程做法能有效降低多线程程序发生死锁的风险？（多选）',
   options:['需要同时拿多把锁时统一约定加锁顺序','获取锁时设置合理的 timeout 超时时间','把所有业务线程都改成 daemon 守护线程','给每个共享变量都额外再套一层普通锁'],
   why:['','','daemon 只决定主线程退出时是否等待子线程，并不能防止运行期间的死锁。','随意增加嵌套锁反而会大幅增加循环等待与死锁的概率。'],
   answers:[0,1],
   explain:'统一全局加锁顺序可从根本上消除循环等待，设置超时可防止无限期挂死；此外用 queue.Queue 替代手写多把锁也是减少死锁的好办法。'
  },
  {
   id:'py-concurrency-8',
   type:'judge',
   q:'创建 threading.Thread 实例后，直接调用 t.run() 就能启动一个新线程与主线程并发执行。',
   answer:false,
   explain:'错误。直接调用 t.run() 只是在当前线程里当成普通函数同步执行；必须调用 t.start() 才会真正创建并启动新线程，由新线程去执行 run()。'
  },
  {
   id:'py-concurrency-9',
   type:'judge',
   q:'使用 multiprocessing 时，子进程拥有独立的内存空间，在子进程里修改普通全局列表不会影响父进程里的同名列表。',
   answer:true,
   explain:'正确。进程之间内存隔离，若需要共享或传递数据，必须通过 Queue、Pipe、Manager 或 shared_memory 等进程间通信机制。'
  },
  {
   id:'py-concurrency-10',
   type:'fill',
   q:'CPython 解释器用来保证同一进程内同一时刻只有一个线程执行 Python 字节码的全局互斥锁，通常简称为 ＿。',
   accepted:['GIL','gil'],
   explain:'GIL（Global Interpreter Lock，全局解释器锁）是 CPython 并发特性里最核心的概念之一；Python 3.13+ 已推出实验性无 GIL 的自由线程构建。'
  },
  {
   id:'py-concurrency-11',
   type:'short',
   q:'请从 GIL 影响、内存共享与开销、适用场景三个维度对比 Python 的多线程（threading）与多进程（multiprocessing）。',
   reference:`一、GIL 影响：
- 多线程：同属一个进程、共用一把 GIL，纯 Python CPU 计算无法并行利用多核；但等待 I/O 或调用释放 GIL 的 C 扩展（如 NumPy）时会释放 GIL。
- 多进程：每个进程有独立的 Python 解释器和独立的 GIL，可以真正跑满多核 CPU。

二、内存共享与开销：
- 多线程：共享同一进程内存，创建和切换轻量，但共享可变状态需用 Lock/Queue 防竞态条件与死锁。
- 多进程：内存彼此隔离，创建开销和内存占用都高得多；跨进程传数据需经 pickle 序列化（或用 Queue/Pipe/shared_memory），Windows/macOS 使用 spawn 时还要写 if __name__ == "__main__":。

三、适用场景：
- I/O 密集型（网络请求、文件读写、阻塞式数据库驱动）优先选多线程（ThreadPoolExecutor）或 asyncio。
- 纯 Python CPU 密集型计算（数据解析、加密、仿真）优先选多进程（ProcessPoolExecutor / multiprocessing）或 C/Rust 扩展。`,
   points:[
    '说明 GIL 对两者的不同影响（线程共用 GIL 但 I/O 释放 vs 进程独立 GIL 真多核并行）',
    '对比内存模型与开销（线程共享内存且轻量但要加锁 vs 进程内存隔离、开销大且需序列化）',
    '提及多进程的工程细节（pickle 限制或 spawn 下的 __main__ 保护）',
    '给出清晰选型结论（I/O 密集用线程/异步，纯 Python CPU 密集用多进程）'
   ],
   explain:'这是 Python 后端与数据工程面试最经典的必考题，答清“瓶颈类型 + GIL 行为 + 内存开销”三要素就非常完整。'
  },
  {
   id:'py-concurrency-12',
   type:'code',
   q:'编写一个线程安全的计数器类 SafeCounter：用 threading.Lock 保护内部计数，提供 increment(n=1) 方法和只读属性 value；再用 ThreadPoolExecutor 启动 5 个并发任务，每个任务调用 increment(100)，最后打印最终的 value（应为 500）。',
   reference:`import threading
from concurrent.futures import ThreadPoolExecutor

class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self, n=1):
        with self._lock:
            self._value += n

    @property
    def value(self):
        with self._lock:
            return self._value

counter = SafeCounter()
with ThreadPoolExecutor(max_workers=5) as ex:
    futures = [ex.submit(counter.increment, 100) for _ in range(5)]
    for f in futures:
        f.result()

print(counter.value)`,
   points:[
    '在 SafeCounter 内部初始化 _value 和 threading.Lock()',
    'increment 中使用 with self._lock: 保护自增操作',
    '使用 @property 提供只读 value（加锁读取更严谨）',
    '使用 with ThreadPoolExecutor 并发提交 5 个任务并等待完成，输出 500'
   ],
   explain:'with ThreadPoolExecutor 退出时也会等待任务完成，显式调用 f.result() 还能确保任务中若有异常不会被静默吞掉。'
  }
 ]
};

export const pyAsync:AiLevel={
 id:'py-async',
 title:'异步编程：asyncio 与事件循环',
 summary:'事件循环与协作式多任务、async/await、Task 与 TaskGroup、超时取消、Semaphore 限流与避坑',
 lessons:[
  {
   title:'为什么需要 asyncio：单线程撑起上万并发',
   body:'既然多线程已经能加速 I/O 密集型任务，为什么现代 Python 后端（FastAPI、aiohttp、AI Agent 服务）还要大规模使用 asyncio？\n原因在于“规模”。每个操作系统线程都要预留几 MB 的调用栈内存，而且内核在几千个线程之间来回切换上下文的开销非常惊人——如果一台服务器同时挂着 10,000 个 WebSocket 长连接或大模型流式请求，开 10,000 个线程很快就会把内存和 CPU 调度拖垮。\nasyncio 走了另一条路——单线程协作式多任务：\n一、核心是事件循环（Event Loop），底层对接操作系统的 I/O 多路复用机制（Linux 是 epoll，macOS 是 kqueue，Windows 是 IOCP），由内核一次性盯着成千上万个网络连接；\n二、当协程 A 发出网络请求进入等待时，它通过 await 主动把控制权交回事件循环，事件循环立刻去执行别的就绪协程 B；等内核通知 A 的数据回来了，事件循环再把 A 叫醒接着跑；\n三、每个协程只是一个极轻量的 Python 对象（几 KB 级别），切换发生在用户态，几乎没有内核调度成本；而且在两个 await 之间绝不会被打断，省掉了大量线程锁。'
  },
  {
   title:'协程、async def 与 await：调用不等于执行',
   body:'写异步代码第一个要扭转的直觉是：调用一个 async def 函数时，函数体里的代码一行都不会立刻执行！它返回的只是一个“协程对象”（coroutine object），就像一张还没放进机器的工序单。\n如果你只写了 fetch() 却忘了交给事件循环运行，Python 会给出警告：RuntimeWarning: coroutine \'fetch\' was never awaited。\n让协程真正跑起来只有两种常规入口：\n一、在程序最顶层（同步代码里）调用 asyncio.run(main())：它负责新建一个事件循环、把 main() 跑完、清理剩余任务并关闭事件循环；\n二、在另一个 async def 函数内部写 await coro：await 是协作式调度的“挂起点”，意思是“我先在这里暂停，把控制权交回事件循环去跑别的协程，等 coro 产出结果再把我唤醒”。\n记住语法限制：await 只能写在 async def 函数内部，且后面跟的对象必须是“可等待对象”（Awaitable，包括协程、Task 和 Future）。',
   code:`import asyncio

async def greet(name):
    await asyncio.sleep(0.01)
    return f"你好，{name}"

async def main():
    coro = greet("异步世界")
    msg = await coro
    print(msg)

asyncio.run(main())`,
   explain:[
    {at:'import asyncio',text:'导入标准库异步 I/O 框架。'},
    {at:'async def greet(name):',to:'return f"你好，{name}"',text:'定义一个协程函数；await asyncio.sleep(0.01) 模拟非阻塞的异步等待，期间会交出控制权给事件循环。'},
    {at:'async def main():',text:'顶层入口协程。'},
    {at:'coro = greet("异步世界")',text:'这一步只是创建了协程对象，greet 内部代码还没有开始运行。'},
    {at:'msg = await coro',to:'print(msg)',text:'用 await 驱动协程执行并拿到返回值，再打印出来。'},
    {at:'asyncio.run(main())',text:'在同步代码里启动事件循环并运行 main()，结束后自动关闭循环。'}
   ]
  },
  {
   title:'真正并发的关键：create_task、gather 与 TaskGroup',
   body:'刚学 asyncio 的人十个里有九个踩过同一个坑：在 async def 里连续写了两行 await fetch(1) 和 await fetch(2)，以为它们会并发跑——其实它们是 100% 串行执行的！因为第一行没等完，第二行的协程对象都还没创建，事件循环根本不知道有第二个任务。\n想让多个协程真正并发，必须把它们包装成 Task（任务）注册到事件循环上，常用有三种方式：\n一、asyncio.create_task(coro)：立刻把协程排进事件循环的就绪队列，随后你可以继续做别的事，最后再 await task 拿结果。注意：务必把返回的 task 保存在变量或集合里，否则可能被垃圾回收中途销毁；\n二、await asyncio.gather(c1, c2, ...)：一次性并发运行多个可等待对象，按传入顺序返回结果列表；加上 return_exceptions=True 可以把失败的异常当成普通元素返回，不打断其余任务；\n三、async with asyncio.TaskGroup() as tg:（Python 3.11+，结构化并发首选）：在代码块里用 tg.create_task(...) 创建子任务，离开 async with 时自动等待所有子任务结束；如果任意一个子任务抛了异常，TaskGroup 会自动取消其余兄弟任务、等它们清理完，再把异常打包成 ExceptionGroup 抛出（可用 except* 捕获），彻底避免孤儿任务泄漏。',
   code:`import asyncio

async def fetch(tag):
    await asyncio.sleep(0.01)
    return f"{tag}完成"

async def main():
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch("A"))
        t2 = tg.create_task(fetch("B"))
    print(t1.result(), t2.result())`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio 模块。'},
    {at:'async def fetch(tag):',to:'return f"{tag}完成"',text:'模拟一个需要异步等待的请求协程。'},
    {at:'async def main():',text:'主协程函数。'},
    {at:'async with asyncio.TaskGroup() as tg:',text:'开启结构化并发任务组，保证块内创建的子任务在离开前全部结束或被妥善取消。'},
    {at:'t1 = tg.create_task(fetch("A"))',to:'t2 = tg.create_task(fetch("B"))',text:'把两个协程同时注册为并发任务，事件循环会一起推进它们。'},
    {at:'print(t1.result(), t2.result())',text:'走出 async with 时所有任务已全部完成，直接调用 result() 即可无阻塞地拿到返回值。'}
   ]
  },
  {
   title:'动手试试：对比串行 await 与 TaskGroup / gather 并发',
   body:'直接看数据最直观：我们在模拟请求 fetch 里记录“同一时刻正在运行中的协程峰值”（peak）。连续写三个 await 时，最大并发数只有 1；换成 asyncio.gather 和 asyncio.TaskGroup 后，三个协程同时进入挂起状态，最大并发数立刻变成 3，而且返回结果依然井井有条。',
   practice:{
    steps:[
     '新建文件 async_concurrency_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py async_concurrency_demo.py（Mac/Linux 运行 python3 async_concurrency_demo.py），核对每一行输出。',
     '对比第一行与后两行的“最大并发”数值：同样是三个 await asyncio.sleep(0.02)，只有包进 gather 或 TaskGroup 才会真正并发执行。'
    ],
    expect:"串行结果: ['用户数据', '订单数据', '库存数据'] 最大并发: 1\ngather 结果: ['用户数据', '订单数据', '库存数据'] 最大并发: 3\nTaskGroup 结果: ['用户数据', '订单数据', '库存数据'] 最大并发: 3"
   },
   code:`import asyncio

async def demo():
    active = 0
    peak = 0

    async def fetch(name):
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.02)
        active -= 1
        return f"{name}数据"

    r1 = await fetch("用户")
    r2 = await fetch("订单")
    r3 = await fetch("库存")
    print("串行结果:", [r1, r2, r3], "最大并发:", peak)

    peak = 0
    gathered = await asyncio.gather(fetch("用户"), fetch("订单"), fetch("库存"))
    print("gather 结果:", gathered, "最大并发:", peak)

    peak = 0
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch("用户"))
        t2 = tg.create_task(fetch("订单"))
        t3 = tg.create_task(fetch("库存"))
    print("TaskGroup 结果:", [t1.result(), t2.result(), t3.result()], "最大并发:", peak)

asyncio.run(demo())`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio。'},
    {at:'async def demo():',to:'peak = 0',text:'定义演示协程，用 active 记录当前在途请求数，peak 记录历史并发峰值。'},
    {at:'async def fetch(name):',to:'return f"{name}数据"',text:'进入时把 active 加 1 并刷新峰值，挂起 0.02 秒模拟网络等待，恢复后再减 1 并返回结果。'},
    {at:'r1 = await fetch("用户")',to:'print("串行结果:"',text:'依次 await 三个协程：前一个完全结束才开始下一个，所以最大并发恒为 1。'},
    {at:'peak = 0',to:'print("gather 结果:"',text:'重置峰值并用 gather 并发运行，三个任务同时进入挂起状态，最大并发为 3，结果仍按输入顺序返回。'},
    {at:'peak = 0',to:'print("TaskGroup 结果:"',text:'改用 Python 3.11+ 的 TaskGroup 结构化并发，同样达到最大并发 3。'},
    {at:'asyncio.run(demo())',text:'启动事件循环运行演示。'}
   ]
  },
  {
   title:'超时与取消：asyncio.timeout、wait_for 与 CancelledError',
   body:'线上调用外部接口绝不能无限期等下去，必须设置超时。asyncio 提供两种超时工具：\n一、async with asyncio.timeout(秒数):（Python 3.11+ 推荐）：给整个代码块设一个总截止时间，哪怕里面包含多个 await 步骤也共用这份预算；超时后自动取消内部任务，并在退出块时抛出标准 TimeoutError；\n二、await asyncio.wait_for(coro, timeout=秒数)：给单个可等待对象设超时，超时后取消该任务并抛 TimeoutError。\n取消在底层是怎么实现的？当外部调用 task.cancel()（或超时触发）时，事件循环会在协程下一次停在 await 处向它注入一个 asyncio.CancelledError。\n这里有一条至关重要的纪律：从 Python 3.8 起，CancelledError 继承自 BaseException 而不是 Exception，所以普通的 except Exception: 不会误吞它。如果你专门写了 except asyncio.CancelledError: 来释放连接或回滚状态，清理完以后务必重新 raise！一旦吞掉 CancelledError，外层的 asyncio.timeout 和 TaskGroup 就会以为任务没被取消，导致逻辑错乱甚至挂死。',
   code:`import asyncio

async def fetch_remote():
    try:
        await asyncio.sleep(5)
    except asyncio.CancelledError:
        print("清理连接资源")
        raise

async def main():
    try:
        async with asyncio.timeout(0.05):
            await fetch_remote()
    except TimeoutError:
        print("请求超时")`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio。'},
    {at:'async def fetch_remote():',to:'await asyncio.sleep(5)',text:'模拟一个耗时 5 秒的慢请求。'},
    {at:'except asyncio.CancelledError:',to:'raise',text:'捕获取消信号做资源清理后，必须把 CancelledError 重新抛出，让取消机制正常传播。'},
    {at:'async def main():',to:'async with asyncio.timeout(0.05):',text:'给代码块设置 0.05 秒的超时预算。'},
    {at:'await fetch_remote()',to:'print("请求超时")',text:'0.05 秒到达时 timeout 自动取消 fetch_remote()，等其清理完后在外层抛出 TimeoutError。'}
   ]
  },
  {
   title:'异步限流与同步原语：Semaphore、Queue、Lock',
   body:'asyncio 轻松就能同时发出几千个请求，但这往往是一把双刃剑——如果不加节制，瞬间就能把下游接口打挂，或者触发对方的 429 限流封禁。因此异步世界同样需要协调原语：\n一、asyncio.Semaphore(n)：最常用的“并发阀门”。比如 Semaphore(10) 配合 async with sem:，不管你提交了 1000 个任务，同一时刻最多只有 10 个在途请求，一个结束才放下一个进场；\n二、asyncio.Queue(maxsize=...)：异步生产者-消费者管道，await q.put(x) 在队列满时挂起生产方实现背压，await q.get() 在队列空时挂起消费方；\n三、asyncio.Lock：虽然单线程在两个 await 之间不会切换，但如果一段关键业务跨越了多次 await（例如先 await 查余额、再 await 扣款），中途就可能插进别的协程改坏状态，这时就要用 async with lock: 串行保护整段异步流程。\n切记：在 async def 里绝不能混用 threading.Lock 或 queue.Queue！它们的阻塞操作会直接把整个事件循环线程卡死，必须使用 asyncio 自己提供的版本。',
   code:`import asyncio

sem = asyncio.Semaphore(5)

async def call_api(url):
    async with sem:
        await asyncio.sleep(0.01)
        return f"OK:{url}"`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio。'},
    {at:'sem = asyncio.Semaphore(5)',text:'创建容量为 5 的异步信号量，限制最大并发数不超过 5。'},
    {at:'async def call_api(url):',text:'定义受限流保护的异步请求协程。'},
    {at:'async with sem:',to:'return f"OK:{url}"',text:'进入前异步等待拿到名额，离开块时（无论成功还是抛异常）自动归还名额给下一个等待的协程。'}
   ]
  },
  {
   title:'动手试试：Semaphore 限流与 asyncio.timeout 超时保护',
   body:'把线上最实用的两道保险合在一起演练：第一部分把 6 个任务放进 asyncio.Semaphore(2)，验证无论任务怎么并发，同时在途数量都被死死压在 2 以内；第二部分用 asyncio.timeout(0.03) 截断一个耗时 0.5 秒的慢任务，观察 CancelledError 的资源清理与外层 TimeoutError 的完整联动。',
   practice:{
    steps:[
     '新建文件 async_guard_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py async_guard_demo.py（Mac/Linux 运行 python3 async_guard_demo.py），核对全部输出。',
     '试着把 slow_job 里 except asyncio.CancelledError 下的 raise 删掉再跑一次，看看超时保护会怎么失效，深刻记住“不要吞掉 CancelledError”。看完记得改回来。'
    ],
    expect:"限流执行结果: ['任务1', '任务2', '任务3', '任务4', '任务5', '任务6']\n同时运行上限: 2\n慢任务启动\n慢任务收到取消信号，清理资源\n外层捕获 TimeoutError：超时保护生效"
   },
   code:`import asyncio

async def main():
    sem = asyncio.Semaphore(2)
    active = 0
    max_active = 0

    async def limited_job(n):
        nonlocal active, max_active
        async with sem:
            active += 1
            max_active = max(max_active, active)
            await asyncio.sleep(0.02)
            active -= 1
            return f"任务{n}"

    results = await asyncio.gather(*(limited_job(i) for i in range(1, 7)))
    print("限流执行结果:", results)
    print("同时运行上限:", max_active)

    async def slow_job():
        print("慢任务启动")
        try:
            await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            print("慢任务收到取消信号，清理资源")
            raise

    try:
        async with asyncio.timeout(0.03):
            await slow_job()
    except TimeoutError:
        print("外层捕获 TimeoutError：超时保护生效")

asyncio.run(main())`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio。'},
    {at:'async def main():',to:'max_active = 0',text:'创建限流上限为 2 的信号量，以及用于统计并发峰值的变量。'},
    {at:'async def limited_job(n):',to:'return f"任务{n}"',text:'受 Semaphore(2) 保护的任务：同时最多只有 2 个协程能进入 async with 块内运行。'},
    {at:'results = await asyncio.gather',to:'print("同时运行上限:", max_active)',text:'一次派发 6 个任务，结果按原顺序汇总，同时验证并发峰值被严格限制在 2。'},
    {at:'async def slow_job():',to:'raise',text:'模拟慢任务；被取消时捕获 CancelledError 打印清理日志并重新抛出。'},
    {at:'try:',to:'print("外层捕获 TimeoutError：超时保护生效")',text:'设置 0.03 秒超时预算，触发取消并在外层捕获 TimeoutError。'},
    {at:'asyncio.run(main())',text:'运行主协程。'}
   ]
  },
  {
   title:'异步头号大坑：阻塞事件循环与 asyncio.to_thread',
   body:'使用 asyncio 时最致命、也最隐蔽的事故就是“阻塞事件循环”。\n回想一下：整个事件循环跑在唯一的一条线程里，全靠各个协程主动 await 礼让。如果你在某个 async def 里不小心写了一句 time.sleep(3)、调用了同步库 requests.get()、做了同步数据库查询，或者写了一段跑 2 秒的纯 Python 死算，这条唯一线程就会彻底卡死 2～3 秒——期间事件循环一步都动不了，其他几千个本该响应的在线请求全部跟着冻结！\n遇到同步阻塞代码时，按这个顺序解决：\n一、首选换原生异步库：用 asyncio.sleep 替 time.sleep，用 httpx.AsyncClient 或 aiohttp 替 requests，用 asyncpg / aiomysql 替同步数据库驱动；\n二、如果旧 SDK 或第三方库实在没有异步版本（或需要读大本地文件），用 Python 3.9+ 内置的 await asyncio.to_thread(blocking_fn, arg1, arg2) 把它丢到后台线程池里跑，事件循环就能立刻去服务其他协程，等后台算完再唤醒你；\n三、如果遇到的是纯 Python 的重 CPU 计算，连线程池也会受 GIL 拖累，此时应该用 loop.run_in_executor(ProcessPoolExecutor(), cpu_fn, arg) 交给多进程池。',
   code:`import asyncio
import time

def legacy_sync_read(path):
    time.sleep(0.05)
    return f"读取:{path}"

async def load_files():
    a, b = await asyncio.gather(
        asyncio.to_thread(legacy_sync_read, "a.txt"),
        asyncio.to_thread(legacy_sync_read, "b.txt"),
    )
    return a, b`,
   explain:[
    {at:'import asyncio',to:'import time',text:'导入 asyncio 和用来模拟同步阻塞的 time 模块。'},
    {at:'def legacy_sync_read(path):',to:'return f"读取:{path}"',text:'假设这是一个无法替换的同步阻塞函数，直接调用会卡死事件循环。'},
    {at:'async def load_files():',to:'return a, b',text:'用 asyncio.to_thread 把两个阻塞调用送进后台线程池，再通过 gather 并发等待，主事件循环全程保持畅通。'}
   ]
  },
  {
   title:'异步上下文管理器（async with）与异步迭代器（async for）',
   body:'就像同步代码有 with 和 for，异步世界也有它们对应的协议，专门解决“进入/退出资源时需要 await”以及“每拿下一条数据时需要 await”的场景：\n一、async with（异步上下文管理器）：对象实现 async def __aenter__(self) 和 async def __aexit__(self, exc_type, exc, tb)。打开网络连接、开启异步数据库事务、创建 httpx.AsyncClient 会话时，建立和关闭连接本身都要走网络 I/O，所以需要 async with（也可以用 contextlib.asynccontextmanager 装饰器快速写出来）；\n二、async for（异步迭代器）：对象实现 __aiter__ 和 async def __anext__（迭代结束时抛 StopAsyncIteration）。最省心的写法是直接写“异步生成器”——在 async def 函数里使用 yield！\n异步生成器非常适合流式场景：比如逐条读取消息队列、分页拉取远程 API，或者把大语言模型（LLM）逐个 token 的流式输出源源不断地推给前端，每产出一小块就用 await 等下一块，既省内存又低延迟。',
   code:`import asyncio

async def token_stream(tokens):
    for tok in tokens:
        await asyncio.sleep(0.01)
        yield tok

async def consume():
    async for tok in token_stream(["Hello", " ", "Async"]):
        print(tok, end="")`,
   explain:[
    {at:'import asyncio',text:'导入 asyncio。'},
    {at:'async def token_stream(tokens):',to:'yield tok',text:'带 yield 的 async def 就是异步生成器，每次产出前可以 await 异步等待，自动满足 async for 协议。'},
    {at:'async def consume():',to:'print(tok, end="")',text:'用 async for 逐块消费异步流：每次迭代都会自动 await 下一份数据到达。'}
   ]
  },
  {
   title:'动手试试：async with / async for 与 to_thread 综合实战',
   body:'最后把异步上下文管理器、异步生成器流式产出和 asyncio.to_thread 桥接同步阻塞函数整合进一段干净的小程序，完整跑通现代 Python 异步开发的常见套路。',
   practice:{
    steps:[
     '新建文件 async_protocol_demo.py，把下面的代码粘贴进去并保存。',
     '在终端里运行 py async_protocol_demo.py（Mac/Linux 运行 python3 async_protocol_demo.py），核对每行输出。',
     '注意观察会话的关闭时机：即使你在 async with 块里主动 raise 一个异常，__aexit__ 依然会被 await 调用，保证异步连接不会泄漏。'
    ],
    expect:"打开会话：API\nAPI 收到流式片段: ['你好', '异步', '世界']\n关闭会话：API\nto_thread 并发结果: ['ALPHA', 'BETA']"
   },
   code:`import asyncio
import time

class AsyncSession:
    def __init__(self, name):
        self.name = name

    async def __aenter__(self):
        await asyncio.sleep(0.01)
        print(f"打开会话：{self.name}")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await asyncio.sleep(0.01)
        print(f"关闭会话：{self.name}")

async def stream_chunks(words):
    for w in words:
        await asyncio.sleep(0.01)
        yield w

def blocking_upper(text):
    time.sleep(0.01)
    return text.upper()

async def main():
    async with AsyncSession("API") as session:
        chunks = []
        async for w in stream_chunks(["你好", "异步", "世界"]):
            chunks.append(w)
        print(f"{session.name} 收到流式片段:", chunks)

    res = await asyncio.gather(
        asyncio.to_thread(blocking_upper, "alpha"),
        asyncio.to_thread(blocking_upper, "beta"),
    )
    print("to_thread 并发结果:", res)

asyncio.run(main())`,
   explain:[
    {at:'import asyncio',to:'import time',text:'导入异步框架和模拟同步阻塞的 time 模块。'},
    {at:'class AsyncSession:',to:'self.name = name',text:'定义一个异步会话类。'},
    {at:'async def __aenter__(self):',to:'return self',text:'进入 async with 时异步建立会话并返回会话对象。'},
    {at:'async def __aexit__(self',to:'print(f"关闭会话：{self.name}")',text:'离开 async with 时异步关闭连接，释放资源。'},
    {at:'async def stream_chunks(words):',to:'yield w',text:'异步生成器，每隔 0.01 秒流式产出一个片段。'},
    {at:'def blocking_upper(text):',to:'return text.upper()',text:'模拟一个带阻塞等待的传统同步函数。'},
    {at:'async def main():',to:'print(f"{session.name} 收到流式片段:", chunks)',text:'在 async with 会话内用 async for 逐个接收流式片段并汇总打印。'},
    {at:'res = await asyncio.gather(',to:'print("to_thread 并发结果:", res)',text:'通过 asyncio.to_thread 把两个同步函数交给线程池并发运行，避免卡死事件循环。'},
    {at:'asyncio.run(main())',text:'启动事件循环执行主协程。'}
   ]
  }
 ],
 quiz:[
  {
   id:'py-async-1',
   q:'定义了 async def fetch(): return 42 之后，直接执行 res = fetch()（不加 await），会发生什么？',
   options:['函数体立刻执行完毕，res 得到整数 42','函数体不会执行，res 是一个协程对象','解释器立刻抛出 SyntaxError 语法报错','自动在后台创建新线程去执行这个函数'],
   why:['调用 async def 不会立刻执行函数体，也不会直接得到返回值 42。','','不加 await 在语法上是合法的（比如准备传给 create_task），不会报 SyntaxError。','asyncio 是单线程事件循环模型，调用协程函数不会开新线程。'],
   answer:1,
   explain:'调用 async def 函数只会创建并返回一个 coroutine 对象；必须把它交给 await、asyncio.create_task() 或 asyncio.run() 驱动，函数体才会真正运行。'
  },
  {
   id:'py-async-2',
   q:'fetch_a() 和 fetch_b() 是两个互不依赖、各耗时 1 秒的异步请求，下面哪种写法总耗时约 1 秒？',
   options:['await asyncio.gather(fetch_a(), fetch_b())','先 await fetch_a() 再执行 await fetch_b()','在普通 for 循环里依次 await 这两个异步请求','把两个调用结果放进列表保存但先不做 await'],
   why:['','连续两次 await 是串行执行，第二个要等第一个跑完才开始，总耗时约 2 秒。','for 循环里逐个 await 同样是串行执行，总耗时约 2 秒。','不去 await 的话两个协程根本不会运行，还会触发未等待警告。'],
   answer:0,
   explain:'只有把多个协程同时交给 asyncio.gather()、asyncio.TaskGroup() 或先用 create_task() 注册成任务，事件循环才会并发推进它们。'
  },
  {
   id:'py-async-3',
   q:'在 FastAPI 等 asyncio 服务的 async def 接口里直接调用同步阻塞的 time.sleep(5)，最直接的后果是？',
   options:['只让当前这一个请求暂停 5 秒，其他请求不受影响','Python 会自动把它悄悄替换成 asyncio.sleep(5)','解释器立刻抛出 RuntimeError 拒绝执行同步函数','卡死单线程事件循环，同进程其他协程全部冻结 5 秒'],
   why:['因为所有协程共享同一条事件循环线程，同步阻塞会让整条线程停住，影响所有请求。','Python 不会自动重写或替换 time.sleep，必须由开发者改写或用 to_thread 包装。','Python 不会阻止你在 async def 里调用同步函数，这也是该坑隐蔽的原因。',''],
   answer:3,
   explain:'asyncio 依赖单线程协作让出控制权；任何未让出控制权的同步阻塞调用（time.sleep、requests.get 等）都会把整个事件循环冻住，拖垮所有并发请求。'
  },
  {
   id:'py-async-4',
   q:'在 Python 3.11+ 的 async with asyncio.TaskGroup() as tg: 中，如果其中一个子任务抛出异常，TaskGroup 会怎么做？',
   options:['把该异常安静丢弃，继续返回其余成功任务的结果','立刻强杀整个 Python 进程，避免留下错误状态','自动取消其余兄弟任务并抛出 ExceptionGroup','暂停等待用户手动决定是否取消剩下的并发任务'],
   why:['TaskGroup 遵守结构化并发原则，不会默默吞掉子任务异常。','它只会取消同组任务并抛出异常，供上层代码用 except* 处理，不会强杀进程。','','取消和异常聚合全部由 TaskGroup 自动完成，无需人工干预。'],
   answer:2,
   explain:'TaskGroup 实现结构化并发：任一子任务失败时会自动取消组内其他仍在运行的任务，等它们完成清理后统一抛出 ExceptionGroup，杜绝孤儿任务。'
  },
  {
   id:'py-async-5',
   q:'在协程里捕获 asyncio.CancelledError 做完连接关闭等资源清理后，正确的收尾动作是？',
   options:['重新 raise，让取消信号正常向上传播','直接 return None，假装本次调用正常结束','再次调用 asyncio.sleep(0) 把异常清空','把该异常改成普通 ValueError 再往外抛出'],
   why:['','吞掉 CancelledError 会让外层的 timeout 和 TaskGroup 误判任务未被取消，破坏结构化并发。','sleep(0) 只是让出一次调度，并不会重新传播取消异常。','篡改异常类型会让调用方无法识别这是正常取消而非业务错误。'],
   answer:0,
   explain:'清理资源后必须重新 raise CancelledError，这样外层的 asyncio.timeout、TaskGroup 和任务取消方才能正确感知取消完成。'
  },
  {
   id:'py-async-6',
   type:'multi',
   q:'在高并发 asyncio 项目里，下面哪些做法属于推荐的工程实践？（多选）',
   options:['用 httpx.AsyncClient 替代同步的 requests','直接在协程里调用 time.sleep 阻塞等待重试','用 asyncio.Semaphore 限制下游接口最大并发','用 await asyncio.to_thread 包装旧同步 I/O 库'],
   why:['','time.sleep 会阻塞整个事件循环，异步退避重试应使用 await asyncio.sleep。','',''],
   answers:[0,2,3],
   explain:'原生异步库、Semaphore 限流以及用 to_thread 隔离遗留同步阻塞调用，都是构建稳定异步服务的核心做法；切忌直接调用 time.sleep 等阻塞函数。'
  },
  {
   id:'py-async-7',
   type:'multi',
   q:'关于 async with 和 async for，下面哪些说法是正确的？（多选）',
   options:['两者可以直接写在普通的同步 def 函数顶层','async with 依赖 __aenter__ 与 __aexit__ 协议','在 async def 中使用 yield 可构造异步生成器','使用 async for 能让纯 Python CPU 运算跑满多核'],
   why:['async with 和 async for 同样只能在 async def 协程函数内部使用。','','','asyncio 仍是单线程，纯 Python CPU 密集计算需交给多进程或 C/Rust 扩展。'],
   answers:[1,2],
   explain:'async with 对应异步上下文协议 __aenter__/__aexit__，async for 对应异步迭代协议 __aiter__/__anext__（用带 yield 的 async def 编写最方便）。'
  },
  {
   id:'py-async-8',
   type:'judge',
   q:'在 async def 函数里连续写 a = await fetch(1) 和 b = await fetch(2)，两个网络请求会自动并发执行。',
   answer:false,
   explain:'错误。连续 await 是完全串行的：只有等 fetch(1) 完成后才会创建并启动 fetch(2)。要并发需使用 asyncio.gather、TaskGroup 或先 create_task。'
  },
  {
   id:'py-async-9',
   type:'judge',
   q:'从 Python 3.8 开始，asyncio.CancelledError 继承自 BaseException 而不是 Exception，因此 except Exception: 不会误吞任务取消信号。',
   answer:true,
   explain:'正确。这是 Python 3.8 的重要改进，避免了业务代码里宽泛的 except Exception: 意外拦截取消信号、导致超时和关停失效。'
  },
  {
   id:'py-async-10',
   type:'fill',
   q:'在异步协程里调用无法替换的同步阻塞 I/O 函数时，可以用 await asyncio.＿(fn, arg) 把它放到后台线程池执行，避免阻塞事件循环。',
   accepted:['to_thread'],
   explain:'Python 3.9 引入的 asyncio.to_thread() 会把同步函数交给默认线程池执行并返回可等待对象，既不阻塞事件循环，又无需手动操作 executor。'
  },
  {
   id:'py-async-11',
   type:'short',
   q:'为什么 asyncio 只用单线程就能支撑上万并发网络连接？如果在协程里写了同步阻塞代码会发生什么，应该怎么解决？',
   reference:`一、单线程高并发原理：
asyncio 通过事件循环配合操作系统的 I/O 多路复用（epoll / kqueue / IOCP）同时监听大量连接。协程在遇到网络等待时通过 await 主动让出控制权，事件循环立刻切换去运行其他就绪协程。协程只是轻量级 Python 对象，切换在用户态完成，省去了成千上万个线程的栈内存占用和内核上下文切换开销。

二、写入同步阻塞代码的后果：
一旦在 async def 里调用 time.sleep()、requests.get() 或重同步计算，唯一的事件循环线程会被卡住，无法切去运行其他协程，导致同进程内所有并发请求一起停顿、响应延迟飙升。

三、解决办法：
1. 首选替换为原生异步库（如 asyncio.sleep、httpx.AsyncClient / aiohttp、asyncpg）；
2. 无法替换的同步 I/O 函数，用 await asyncio.to_thread(fn, ...) 丢进后台线程池；
3. 重 CPU 密集计算，用 loop.run_in_executor 交给 ProcessPoolExecutor 多进程池处理。`,
   points:[
    '说明事件循环 + 操作系统 I/O 多路复用 + 协作式挂起（await）与轻量低开销',
    '准确指出同步阻塞会卡死单线程事件循环，拖垮所有并发协程',
    '给出原生异步库替换方案（如 httpx/aiohttp、asyncio.sleep）',
    '给出无法替换时的兜底方案（asyncio.to_thread 处理同步 I/O，进程池处理 CPU 重计算）'
   ],
   explain:'理解“单线程协作式调度”的本质，就能同时明白它为什么快、以及为什么最怕阻塞事件循环。'
  },
  {
   id:'py-async-12',
   type:'code',
   q:'假设已有异步函数 async def fetch_one(url: str) -> str。请编写 async def fetch_all(urls: list[str], limit: int = 3) -> list[str]：使用 asyncio.Semaphore(limit) 限制最大并发数，给每次 fetch_one 调用加上 5 秒超时保护（asyncio.timeout），并发抓取所有 urls 并按输入顺序返回结果列表。',
   reference:`import asyncio

async def fetch_all(urls: list[str], limit: int = 3) -> list[str]:
    sem = asyncio.Semaphore(limit)

    async def bounded_fetch(url: str) -> str:
        async with sem:
            async with asyncio.timeout(5):
                return await fetch_one(url)

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(bounded_fetch(u)) for u in urls]
    return [t.result() for t in tasks]`,
   points:[
    '使用 asyncio.Semaphore(limit) 与 async with sem: 控制最大并发',
    '将 asyncio.timeout(5) 放在获取信号量之后（只计实际请求耗时，不把排队时间算成超时）',
    '使用 TaskGroup 或 asyncio.gather 真正并发执行（不是串行 await）',
    '严格按照输入 urls 的顺序返回结果列表'
   ],
   explain:'把 asyncio.timeout(5) 写在 async with sem: 内部是个加分细节：这样 5 秒超时只计算请求实际发出后的等待时间，避免任务还在排队等信号量就已经超时。'
  }
 ]
};
