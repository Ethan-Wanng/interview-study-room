import type {AiLevel} from '../journey';

// Python 进阶（一）：面向对象、异常处理与文件 I/O、模块与标准库（第 5–7 关）。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。

export const pyOop:AiLevel={
 id:'py-oop',
 title:'面向对象：类、继承与数据类',
 summary:'class 与实例/类属性、@property、继承与 MRO、classmethod/staticmethod、dataclass 与鸭子类型',
 lessons:[
  {
   title:'类与对象：class、__init__ 与 self 的本质',
   body:'当程序要表达“用户”“订单”“账户”这类既有数据又有行为的事物时，把它们封装成“类”（class）会清爽很多。\n一、类与实例：class 就像一张设计图纸，按图纸造出来的具体对象叫“实例”（instance）。调用 User("小雅", 3) 时，Python 先创建一个空对象，再自动调用 __init__ 给它贴上初始属性；\n二、__init__ 不是返回值用的：它只负责初始化实例属性，默认返回 None（在里面返回非 None 值会直接报错）；\n三、self 到底是什么？self 并不是关键字，只是社区约定的第一个参数名，它指代“当前正在操作的这个实例本身”。当你写 u.greet() 时，Python 在背后自动把它翻译成 User.greet(u)，把 u 传给 self；\n四、__repr__ 负责给对象一个清晰的开发者展示文本，打印对象或在调试器里查看它时都会用到，养成给常用类写 __repr__ 的习惯能省下不少排查时间。',
   code:`class User:
    def __init__(self, name: str, level: int = 1) -> None:
        self.name = name
        self.level = level

    def greet(self) -> str:
        return f"你好，我是 {self.name}（Lv.{self.level}）"

    def __repr__(self) -> str:
        return f"User(name={self.name!r}, level={self.level})"

u = User("小雅", 3)
print(u.greet())
print(User.greet(u))
print(u)`,
   explain:[
    {at:'class User:',text:'定义一个名为 User 的类，类名按 PEP 8 习惯用大驼峰（PascalCase）。'},
    {at:'def __init__(self',to:'self.level = level',text:'初始化方法：创建实例时自动执行，把传入的 name 和 level 存到当前实例 self 上。'},
    {at:'def greet(self)',to:'Lv.{self.level}',text:'实例方法：通过 self 读取当前对象的属性，返回问候语。'},
    {at:'def __repr__(self)',to:'level={self.level})',text:'定义对象的官方字符串表示，!r 会给字符串加上引号，方便调试时一眼看清类型。'},
    {at:'u = User("小雅", 3)',text:'实例化一个 User 对象，Python 自动把新对象作为 self 传给 __init__。'},
    {at:'print(u.greet())',to:'print(User.greet(u))',text:'两种写法完全等价：u.greet() 就是 Python 自动把 u 绑定为 self 后调用 User.greet(u)。'},
    {at:'print(u)',text:'打印对象时会调用 __repr__（如果没定义 __str__），输出 User(name=\'小雅\', level=3)。'},
   ],
  },
  {
   title:'类属性 vs 实例属性，以及封装约定',
   body:'刚学 Python 面向对象时，最容易踩的一个大坑就是把“类属性”和“实例属性”混为一谈。\n一、查找顺序：读取 obj.attr 时，Python 先在实例自己的 __dict__ 里找，找不到才顺着去类（以及父类）里找；\n二、不可变类属性很安全：像 currency = "CNY" 放在类体里，所有实例共享同一份配置；如果某个实例写了 g1.currency = "USD"，只会在 g1 自己身上新增一个同名实例属性“遮住”类属性，不会影响别的实例；\n三、可变类属性是经典陷阱：如果在类体里写了 items = []，所有实例拿到的都是同一个列表对象！c1.items.append("键盘") 是原地修改，并没有重新赋值，结果 c2.items 也被莫名污染了。每个实例独享的列表、字典，必须在 __init__ 里用 self.items = [] 单独创建；\n四、封装约定：Python 没有强制的 private 关键字，靠下划线传达意图——单下划线 _items 表示“内部细节，外部不要直接依赖”；双下划线 __token 会触发“名称改写”（name mangling），自动变成 _类名__token，主要用来避免子类意外覆盖同名属性，并不是真正的加密隐藏。',
   code:`class BadCart:
    items = []  # 危险：所有实例共享同一个列表

c1, c2 = BadCart(), BadCart()
c1.items.append("键盘")
print("错误示范：", c2.items)

class GoodCart:
    currency = "CNY"

    def __init__(self, owner: str) -> None:
        self.owner = owner
        self._items: list[str] = []
        self.__token = "secret"

g1, g2 = GoodCart("小王"), GoodCart("小李")
g1._items.append("鼠标")
print("正确示范：", g1._items, g2._items)
print("改写后的名字：", g1._GoodCart__token)`,
   explain:[
    {at:'class BadCart:',to:'items = []',text:'反面教材：在类体直接定义可变列表，所有 BadCart 实例都会指向这同一个列表。'},
    {at:'c1, c2 = BadCart()',to:'print("错误示范："',text:'只往 c1.items 里追加了元素，但 c2.items 也变成了 [\'键盘\']，造成串数据。'},
    {at:'class GoodCart:',to:'currency = "CNY"',text:'不可变的字符串作为类属性很安全，所有实例共享一份默认值。'},
    {at:'def __init__(self',to:'self.__token = "secret"',text:'在 __init__ 中为每个实例新建独立列表 _items；_ 前缀表示内部属性，__ 前缀触发名称改写。'},
    {at:'g1, g2 = GoodCart',to:'print("正确示范："',text:'修改 g1._items 后，g2._items 依然是空列表，互不干扰。'},
    {at:'print("改写后的名字："',text:'Python 把 __token 改写成了 _GoodCart__token，所以它不是真正的访问控制，而是防子类重名冲突的机制。'},
   ],
  },
  {
   title:'@property：把方法伪装成属性',
   body:'用惯 Java 或 C++ 的同学刚写 Python，常会给每个字段配一对 get_price() 和 set_price()。在 Python 里完全没必要提前写这些样板代码——先直接暴露普通属性 item.price 就好。\n等哪天需求变了，需要对价格做“不能为负”的校验，或者想把 total 改成按单价×数量实时计算，再把方法加上 @property 装饰器就行：外部调用方依然写 item.price 和 item.price = 259，一行调用代码都不用改，这就是接口无痛升级的威力。\n写 @property 时有两个细节要记牢：\n一、只写 @property 不写 setter，就得到一个只读属性（比如 total），外部给 item.total 赋值会直接报 AttributeError；\n二、在 setter 内部存真实数据时，一定要存到带下划线的底层属性 self._price，千万别写成 self.price = value，否则 setter 会反复调用自己，立刻触发 RecursionError。',
   code:`class Product:
    def __init__(self, name: str, price: float, qty: int) -> None:
        self.name = name
        self.price = price
        self.qty = qty

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        if value < 0:
            raise ValueError("价格不能为负数")
        self._price = float(value)

    @property
    def total(self) -> float:
        return self._price * self.qty

item = Product("机械键盘", 299, 2)
print(item.price, item.total)
item.price = 259
print(item.total)`,
   explain:[
    {at:'class Product:',to:'self.qty = qty',text:'注意 self.price = price 这一行会自动走下面的 @price.setter，连初始化时的非法价格也能一起拦住。'},
    {at:'@property',to:'return self._price',text:'把 price 方法变成只读 getter，读取 item.price 时实际执行的是这里。'},
    {at:'@price.setter',to:'self._price = float(value)',text:'配对的 setter：先拦截负数，再写入底层的 self._price（不能写 self.price，否则无限递归）。'},
    {at:'@property',to:'return self._price * self.qty',text:'计算属性 total 没有定义 setter，因此对外是只读的，价格一改它会自动算出新总价。'},
    {at:'item = Product',to:'print(item.total)',text:'外部像操作普通字段一样读写 price、读取 total，完全感知不到背后有校验和计算逻辑。'},
   ],
  },
  {
   title:'动手试试：带校验的账户类与 @property',
   body:'我们写一个带单日限额校验和独立流水的 BankAccount 类，亲手验证三件事：类属性共享、实例流水互不污染，以及 @property 拦截非法赋值。',
   practice:{
    steps:[
     '新建一个文件 account_demo.py，把下面的代码复制进去并保存（建议用 UTF-8 编码）。',
     '打开终端进入文件所在目录，Windows 运行 py account_demo.py（Mac / Linux 运行 python3 account_demo.py）。',
     '对照下面的预期输出，观察小明和小红的余额、流水是否完全独立，以及设置负数限额时是否被 setter 拦住。',
     '试着在末尾加一行 a.balance = 99999 再运行一次，看看只读属性会报什么错。',
    ],
    expect:'星辰银行 | 小明 余额：700，流水：[\'+1000\', \'-300\']\n星辰银行 | 小红 余额：500，流水：[\'+500\']\n拦截非法限额：单日限额必须大于 0',
   },
   code:`class BankAccount:
    bank_name = "星辰银行"

    def __init__(self, owner: str, balance: float = 0) -> None:
        self.owner = owner
        self._balance = 0.0
        self._logs: list[str] = []
        self._daily_limit = 5000.0
        if balance > 0:
            self.deposit(balance)

    @property
    def balance(self) -> float:
        return self._balance

    @property
    def daily_limit(self) -> float:
        return self._daily_limit

    @daily_limit.setter
    def daily_limit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("单日限额必须大于 0")
        self._daily_limit = float(amount)

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("存款金额必须大于 0")
        self._balance += amount
        self._logs.append(f"+{amount:.0f}")

    def withdraw(self, amount: float) -> None:
        if amount <= 0 or amount > self._daily_limit:
            raise ValueError("超出单日限额或金额无效")
        if amount > self._balance:
            raise ValueError("余额不足")
        self._balance -= amount
        self._logs.append(f"-{amount:.0f}")

a = BankAccount("小明", 1000)
b = BankAccount("小红", 500)
a.daily_limit = 800
a.withdraw(300)
print(f"{a.bank_name} | {a.owner} 余额：{a.balance:.0f}，流水：{a._logs}")
print(f"{b.bank_name} | {b.owner} 余额：{b.balance:.0f}，流水：{b._logs}")
try:
    a.daily_limit = -100
except ValueError as err:
    print(f"拦截非法限额：{err}")`,
   explain:[
    {at:'class BankAccount:',to:'bank_name = "星辰银行"',text:'类属性 bank_name 是不可变字符串，所有账户安全共享。'},
    {at:'def __init__(self',to:'self.deposit(balance)',text:'在 __init__ 里给每个账户创建独立的 _logs 列表；初始余额复用 deposit 方法顺便记入流水。'},
    {at:'@property',to:'return self._balance',text:'balance 只定义 getter，外部只能查看余额，不能直接篡改，必须走 deposit / withdraw。'},
    {at:'@property',to:'self._daily_limit = float(amount)',text:'daily_limit 同时提供读写能力，setter 拒绝非正数。'},
    {at:'def deposit(self',to:'self._logs.append(f"+{amount:.0f}")',text:'存款方法：校验正数后累加余额并记录流水。'},
    {at:'def withdraw(self',to:'self._logs.append(f"-{amount:.0f}")',text:'取款方法：同时检查单日限额和当前余额，确保账户状态合法。'},
    {at:'a = BankAccount',to:'a.withdraw(300)',text:'创建两个账户，只调整小明（a）的限额并取款 300。'},
    {at:'print(f"{a.bank_name}',to:'print(f"{b.bank_name}',text:'打印两个账户的状态，验证各自余额和流水完全隔离。'},
    {at:'try:',to:'print(f"拦截非法限额：{err}")',text:'尝试设置非法限额 -100，触发 setter 抛出 ValueError 并被捕获打印。'},
   ],
  },
  {
   title:'继承、super() 与多继承 MRO',
   body:'继承让子类复用父类的属性和方法，并按需重写（override）其中一部分。单继承很直观，真正容易让人困惑的是多继承（比如菱形继承：LogMixin 和 AuthMixin 都继承自 Base，而 ApiService 同时继承这两个 Mixin）。\n这时候如果有人在两个 Mixin 里硬写 Base.__init__(self)，Base.__init__ 就会被重复执行两次！Python 用两样东西优雅地解决了这个问题：\n一、MRO（Method Resolution Order，方法解析顺序）：Python 按 C3 线性化算法为每个类算出一张确定的查找清单，可以通过 类.__mro__ 查看。它保证“子类排在父类前面，且保留括号里从左到右的顺序”；\n二、super() 的真正含义：它并不是“调用我括号里写死的那个父类”，而是“沿着当前实例所属类的 MRO，调用排在我后面的下一个类”。\n看看下面 ApiService 的 MRO：[ApiService, LogMixin, AuthMixin, Base, object]。在 LogMixin 里调 super().__init__() 时，跳去的不是 Base，而是 MRO 里的下一站 AuthMixin，再由 AuthMixin 跳去 Base，于是 Base 只初始化一次，所有 Mixin 严丝合缝地协作起来。',
   code:`class Base:
    def __init__(self) -> None:
        self.steps = ["Base"]

class LogMixin(Base):
    def __init__(self) -> None:
        super().__init__()
        self.steps.append("LogMixin")

class AuthMixin(Base):
    def __init__(self) -> None:
        super().__init__()
        self.steps.append("AuthMixin")

class ApiService(LogMixin, AuthMixin):
    def __init__(self) -> None:
        super().__init__()
        self.steps.append("ApiService")

svc = ApiService()
print("MRO：", [c.__name__ for c in ApiService.__mro__])
print("初始化顺序：", svc.steps)`,
   explain:[
    {at:'class Base:',to:'self.steps = ["Base"]',text:'公共基类，初始化 steps 列表。'},
    {at:'class LogMixin(Base):',to:'self.steps.append("LogMixin")',text:'继承自 Base，先用 super() 把调用交给 MRO 的下一站，返回后再记录自己。'},
    {at:'class AuthMixin(Base):',to:'self.steps.append("AuthMixin")',text:'另一个 Mixin，同样用 super() 协作式传递，不写死 Base.__init__(self)。'},
    {at:'class ApiService(LogMixin, AuthMixin):',to:'self.steps.append("ApiService")',text:'同时继承两个 Mixin，形成经典的菱形继承结构。'},
    {at:'svc = ApiService()',to:'print("初始化顺序：", svc.steps)',text:'MRO 是 ApiService → LogMixin → AuthMixin → Base → object；因为先 super 再 append，实际执行顺序是 Base → AuthMixin → LogMixin → ApiService，且 Base 只执行了一次。'},
   ],
  },
  {
   title:'三种方法对比：实例方法、@classmethod 与 @staticmethod',
   body:'类里面定义的函数有三种常见形态，选对形态能让代码意图一目了然：\n一、实例方法（默认）：第一个参数是 self（当前实例），用来读取或修改这个对象的状态，最常见；\n二、类方法（@classmethod）：第一个参数是 cls（当前类本身），最经典的用途是写“替代构造函数”（工厂方法），比如 Member.from_dict(data)、datetime.fromisoformat(s)。为什么不用 @staticmethod 写工厂？因为类方法内部调用 cls(...) 而不是写死 Member(...)，当子类 VipMember 调用 VipMember.from_dict(...) 时，cls 自动就是 VipMember，造出来的对象天然就是子类实例！\n三、静态方法（@staticmethod）：既不接收 self 也不接收 cls，本质上就是一个普通工具函数，只是因为业务上和这个类密切相关（例如格式校验、单位换算），放进类的命名空间里更好找。',
   code:`class Member:
    def __init__(self, name: str, points: int) -> None:
        self.name = name
        self.points = points

    def badge(self) -> str:
        return f"{self.name}({self.points}分)"

    @classmethod
    def from_dict(cls, data: dict) -> "Member":
        return cls(data["name"], int(data["points"]))

    @staticmethod
    def is_valid_name(name: str) -> bool:
        return bool(name.strip())

class VipMember(Member):
    def badge(self) -> str:
        return f"VIP·{self.name}({self.points}分)"

m = VipMember.from_dict({"name": "阿青", "points": "120"})
print(type(m).__name__, m.badge(), Member.is_valid_name("  "))`,
   explain:[
    {at:'class Member:',to:'self.points = points',text:'定义基类 Member 和初始化方法。'},
    {at:'def badge(self)',to:'return f"{self.name}({self.points}分)"',text:'实例方法，依赖具体实例的 name 和 points。'},
    {at:'@classmethod',to:'return cls(data["name"], int(data["points"]))',text:'类方法工厂：用 cls(...) 构造实例，这样谁调用它就返回谁的实例，对子类完全友好。'},
    {at:'@staticmethod',to:'return bool(name.strip())',text:'静态方法：不需要访问任何实例或类属性，纯粹是归属于 Member 命名空间的校验工具。'},
    {at:'class VipMember(Member):',to:'VIP·{self.name}',text:'子类没有重写 from_dict，只重写了 badge。'},
    {at:'m = VipMember.from_dict',to:'is_valid_name("  "))',text:'通过子类调用继承来的 from_dict，cls 自动绑定为 VipMember，因此输出 VipMember、VIP·阿青(120分) 和 False。'},
   ],
  },
  {
   title:'动手试试：多继承 MRO、类方法工厂与静态工具',
   body:'把多继承管道（Mixin 协作）、@classmethod 子类工厂和 @staticmethod 放到一段脚本里跑一遍，亲眼看看 MRO 的传递路径和 cls 如何自动识别子类。',
   practice:{
    steps:[
     '新建文件 mro_factory_demo.py，复制下面的代码并保存。',
     '在终端运行 py mro_factory_demo.py（Mac / Linux 运行 python3 mro_factory_demo.py）。',
     '对照预期输出：看看 TrimMixin 和 UpperMixin 如何按 MRO 接力处理文本，以及 EBook.from_line 返回的到底是不是 EBook。',
     '把 CleanPipeline(TrimMixin, UpperMixin) 改成 CleanPipeline(UpperMixin, TrimMixin)，再跑一次，看看 MRO 怎么变。',
    ],
    expect:'MRO: CleanPipeline -> TrimMixin -> UpperMixin -> Handler\n处理结果: HELLO PYTHON\nEBook 流畅的 Python ¥139.00',
   },
   code:`class Handler:
    def handle(self, text: str) -> str:
        return text

class TrimMixin(Handler):
    def handle(self, text: str) -> str:
        return super().handle(text.strip())

class UpperMixin(Handler):
    def handle(self, text: str) -> str:
        return super().handle(text.upper())

class CleanPipeline(TrimMixin, UpperMixin):
    pass

class Book:
    def __init__(self, title: str, price: float) -> None:
        self.title = title
        self.price = price

    @classmethod
    def from_line(cls, line: str) -> "Book":
        title, raw_price = line.split(",")
        return cls(title.strip(), float(raw_price))

    @staticmethod
    def format_yuan(amount: float) -> str:
        return f"¥{amount:.2f}"

class EBook(Book):
    pass

pipe = CleanPipeline()
print("MRO:", " -> ".join(c.__name__ for c in CleanPipeline.__mro__[:-1]))
print("处理结果:", pipe.handle("  hello python  "))
eb = EBook.from_line("流畅的 Python, 139")
print(type(eb).__name__, eb.title, Book.format_yuan(eb.price))`,
   explain:[
    {at:'class Handler:',to:'return text',text:'基类终点，直接返回收到的文本。'},
    {at:'class TrimMixin(Handler):',to:'return super().handle(text.strip())',text:'去掉首尾空白后，通过 super() 传给 MRO 里的下一位。'},
    {at:'class UpperMixin(Handler):',to:'return super().handle(text.upper())',text:'把文本转大写后，通过 super() 传给 MRO 里的下一位（Handler）。'},
    {at:'class CleanPipeline(TrimMixin, UpperMixin):',to:'pass',text:'组合两个 Mixin 形成处理管道，无需再手写 handle。'},
    {at:'class Book:',to:'self.price = price',text:'定义 Book 基类。'},
    {at:'@classmethod',to:'return cls(title.strip(), float(raw_price))',text:'类方法工厂：把逗号分隔的一行文字拆解并创建 cls 对应的实例。'},
    {at:'@staticmethod',to:'return f"¥{amount:.2f}"',text:'静态工具方法：负责把金额格式化为两位小数的人民币字符串。'},
    {at:'class EBook(Book):',to:'pass',text:'子类 EBook 继承了 Book 的构造方法与 from_line 工厂。'},
    {at:'pipe = CleanPipeline()',to:'print("处理结果:"',text:'打印去掉末尾 object 后的 MRO，并执行文本清洗管道。'},
    {at:'eb = EBook.from_line',to:'Book.format_yuan(eb.price))',text:'用子类调用 from_line 得到 EBook 实例，并用静态方法格式化价格。'},
   ],
  },
  {
   title:'现代数据载体 @dataclass',
   body:'业务代码里大量类纯粹是用来装数据的（比如坐标、配置、接口返回、订单项）。如果每个类都要手写 __init__、__repr__ 和 __eq__，不仅啰嗦，加减字段时还容易漏改。\n标准库的 @dataclass（Python 3.7+）会根据类体里的类型注解自动生成这些方法，还有四个极实用的能力：\n一、field(default_factory=list)：dataclass 直接禁止写 tags: list[str] = []（会抛 ValueError），逼着你用工厂函数为每个实例创建全新列表，彻底消灭前面讲过的可变类属性污染坑；\n二、frozen=True：让实例变成不可变对象（修改字段会报错），同时自动生成 __hash__，于是对象可以直接当字典的 key 或放进 set 去重；\n三、slots=True（Python 3.10+）：自动生成 __slots__，不再为每个实例分配字典 __dict__，大量对象时省内存且访问更快，还能防止手误拼错属性名（比如 p.xx = 1 会报错）；\n四、__post_init__：紧接在自动生成的 __init__ 后面执行，最适合写字段校验。',
   code:`from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Point:
    x: int
    y: int

@dataclass
class Task:
    title: str
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.title.strip():
            raise ValueError("任务标题不能为空")

p1, p2 = Point(1, 2), Point(1, 2)
print(p1 == p2, len({p1, p2}))
t1, t2 = Task("写测试"), Task("改文档")
t1.tags.append("urgent")
print(t1, t2)`,
   explain:[
    {at:'from dataclasses import',text:'从标准库 dataclasses 导入装饰器和字段配置函数 field。'},
    {at:'@dataclass(frozen=True, slots=True)',to:'y: int',text:'不可变且使用 __slots__ 的轻量坐标类，自动获得 __init__、__repr__、__eq__ 和 __hash__。'},
    {at:'@dataclass',to:'tags: list[str] = field(default_factory=list)',text:'用 default_factory=list 确保每个 Task 实例拿到独立的空列表。'},
    {at:'def __post_init__(self)',to:'raise ValueError("任务标题不能为空")',text:'初始化后钩子：拦截全空白的非法标题。'},
    {at:'p1, p2 = Point(1, 2)',to:'len({p1, p2}))',text:'两个相同坐标按值比较相等（True），且因为 frozen=True 可哈希，放进 set 会自动去重成 1 个。'},
    {at:'t1, t2 = Task',to:'print(t1, t2)',text:'只往 t1.tags 追加标签，t2.tags 仍是空列表，两者完全隔离。'},
   ],
  },
  {
   title:'鸭子类型（Duck Typing）与组合优于继承',
   body:'在很多静态语言里，两个类要被同一个函数接收，往往得先继承同一个基类或显式声明实现同一个接口。Python 推崇的是“鸭子类型”——如果一只鸟走起来像鸭子、叫起来也像鸭子，那它就可以当鸭子用。\n换成代码里的意思就是：函数只关心传进来的对象有没有我需要的方法（比如 .send(msg)），不在乎它的祖先是谁。如果项目启用了类型检查，还可以用 typing.Protocol 定义结构化协议，既享受鸭子类型的灵活，又拿到静态类型提示；只有确实需要强制规范且复用模板逻辑时，才请出 abc.ABC 抽象基类。\n和鸭子类型相得益彰的另一条设计原则是“组合优于继承”（has-a 优于 is-a）：与其搞出 EmailOrderService、SmsOrderService、MockOrderService 一堆僵硬的子类，不如让 OrderService “持有一个” notifier 对象。以后加企业微信通知，只需写个带 send 方法的新类塞进去，原有代码一字不改，写单元测试时传入假对象也轻松得多。',
   code:`class EmailNotifier:
    def send(self, msg: str) -> str:
        return f"[邮件] {msg}"

class SmsNotifier:
    def send(self, msg: str) -> str:
        return f"[短信] {msg}"

class OrderService:
    def __init__(self, notifier) -> None:
        self.notifier = notifier

    def confirm(self, order_id: str) -> str:
        return self.notifier.send(f"订单 {order_id} 已确认")

for ch in (EmailNotifier(), SmsNotifier()):
    svc = OrderService(ch)
    print(svc.confirm("A1001"))`,
   explain:[
    {at:'class EmailNotifier:',to:'return f"[邮件] {msg}"',text:'邮件通知器，没有继承任何公共基类，只实现了 send 方法。'},
    {at:'class SmsNotifier:',to:'return f"[短信] {msg}"',text:'短信通知器，同样只需提供同名同签名的 send 方法。'},
    {at:'class OrderService:',to:'self.notifier = notifier',text:'通过组合（has-a）持有任意通知器对象，而不是把渠道逻辑写死在继承树里。'},
    {at:'def confirm(self',to:'self.notifier.send(',text:'鸭子类型：只要 self.notifier 有 send 方法就能正常工作，无需做 isinstance 检查。'},
    {at:'for ch in',to:'print(svc.confirm("A1001"))',text:'分别注入邮件和短信通知器，同一套 OrderService 无缝切换不同渠道。'},
   ],
  },
  {
   title:'动手试试：用 dataclass + match 构建轻量订单模型',
   body:'把 @dataclass（frozen、slots、default_factory）、@property 和 Python 3.10+ 的结构模式匹配 match 组合起来，写一个简洁又现代的订单模型。',
   practice:{
    steps:[
     '确认你的 Python 版本在 3.10 及以上（终端输入 py --version 或 python3 --version 查看）。',
     '新建文件 order_model.py，把下面的代码复制进去并保存。',
     '在终端运行 py order_model.py（Mac / Linux 运行 python3 order_model.py），对照下面的输出。',
     '试着给 o1 加一行 o1.items[0].price = 1，看看 frozen=True 的 OrderItem 会抛出什么异常。',
    ],
    expect:'OD01: 大额已支付（2 件，¥238）\nOD02: 待付款（¥58）\nOD03: 其他状态（cancelled）',
   },
   code:`from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class OrderItem:
    name: str
    price: float
    qty: int = 1

    @property
    def subtotal(self) -> float:
        return self.price * self.qty

@dataclass
class Order:
    order_id: str
    status: str = "pending"
    items: list[OrderItem] = field(default_factory=list)

    @property
    def total(self) -> float:
        return sum(i.subtotal for i in self.items)

def describe(order: Order) -> str:
    match order:
        case Order(status="paid", items=items) if order.total >= 200:
            return f"{order.order_id}: 大额已支付（{len(items)} 件，¥{order.total:.0f}）"
        case Order(status="paid"):
            return f"{order.order_id}: 已支付（¥{order.total:.0f}）"
        case Order(status="pending"):
            return f"{order.order_id}: 待付款（¥{order.total:.0f}）"
        case _:
            return f"{order.order_id}: 其他状态（{order.status}）"

o1 = Order("OD01", "paid", [OrderItem("耳机", 199), OrderItem("保护套", 39)])
o2 = Order("OD02", "pending", [OrderItem("数据线", 29, 2)])
o3 = Order("OD03", "cancelled")
for o in (o1, o2, o3):
    print(describe(o))`,
   explain:[
    {at:'from dataclasses import',text:'导入 dataclass 装饰器和 field。'},
    {at:'@dataclass(frozen=True, slots=True)',to:'return self.price * self.qty',text:'订单明细项设为不可变，并用只读 @property 动态算小计。'},
    {at:'@dataclass',to:'return sum(i.subtotal for i in self.items)',text:'Order 用 default_factory=list 避免订单间共享明细列表，total 属性汇总所有明细。'},
    {at:'def describe(order: Order)',to:'match order:',text:'对 Order 实例使用结构模式匹配，直接按属性名解包。'},
    {at:'case Order(status="paid", items=items)',to:'大额已支付',text:'类模式配合 if 守卫：匹配已支付且总价满 200 的大额订单。'},
    {at:'case Order(status="paid"):',to:'其他状态（{order.status}）"',text:'其余分支按顺序匹配普通已支付、待付款和兜底情况。'},
    {at:'o1 = Order',to:'print(describe(o))',text:'构造三笔不同状态的订单并依次打印描述。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-oop-1',
   q:'调用实例方法 u.greet() 时，参数 self 的值是怎么来的？',
   options:[
    '需要调用者在括号里手动把 u 传进去',
    'Python 自动把实例 u 作为第一个参数传入',
    '由类属性 self 提前在类体里统一绑定',
    'Python 自动把类 User 本身作为参数传入',
   ],
   why:[
    '调用 u.greet() 时不用手写 u，手动再传反而会报参数过多。',
    '',
    'self 不是类属性，而是方法定义时接收当前实例的第一个形参。',
    '把类本身作为第一参数传入的是 @classmethod 的 cls，不是普通实例方法的 self。',
   ],
   answer:1,
   explain:'u.greet() 本质上是 User.greet(u) 的语法糖，Python 会自动把接收者实例 u 绑定给方法的第一个参数 self。',
  },
  {
   id:'py-oop-2',
   q:'如果在类体里直接写 tags = []，并在实例方法中调用 self.tags.append("vip")，会产生什么后果？',
   options:[
    '每个实例各自生成独立的列表副本，互不影响',
    'Python 在定义类时立刻报错并拒绝执行类体',
    '所有实例共享同一个列表，一处修改会污染其他实例',
    'append 会自动在当前实例上新建一个同名空列表',
   ],
   why:[
    '类体只执行一次，列表对象只创建一份，并不会按实例自动拷贝。',
    '普通 class 定义里写 tags = [] 语法上是允许的，只有 @dataclass 会主动拦截可变默认值。',
    '',
    'append 是原地修改已有对象，不会像赋值语句那样在实例上新建遮蔽属性。',
   ],
   answer:2,
   explain:'类属性属于类本身并被所有实例共享；对可变对象做原地修改（如 append）会影响所有未覆盖该属性的实例，应在 __init__ 中为每个实例单独创建。',
  },
  {
   id:'py-oop-3',
   q:'在 @price.setter 方法内部保存数据时，为什么应写 self._price = value 而不是 self.price = value？',
   options:[
    '写 self.price = value 会再次触发 setter 导致无限递归',
    'Python 语法禁止在 setter 内部引用不带下划线的属性名',
    '带下划线的属性读写速度比普通实例属性快一倍以上',
    '不带下划线的变量会被自动识别成全局共享的类属性',
   ],
   why:[
    '',
    '语法上并不禁止，但运行到赋值语句时会反复重新进入同一个 setter。',
    '下划线只是命名约定，底层依然存在实例字典里，没有性能差别。',
    '在实例方法里给 self.xxx 赋值操作的都是实例属性或描述符，不会变成类属性。',
   ],
   answer:0,
   explain:'给 self.price 赋值会触发 @price.setter 本身，如果在 setter 内部再写 self.price = value，就会不断调用自己直到触发 RecursionError。',
  },
  {
   id:'py-oop-4',
   type:'multi',
   q:'关于 Python 中的 _name 和 __name 命名约定，下面哪些说法正确？（多选）',
   options:[
    '_name 是约定俗成的内部成员提示，外部语法上仍可访问',
    '_name 会在运行前由解释器拦截来自类外部的直接读取',
    '__name 会触发名称改写，变成 _类名__name 的形式',
    '__name 能从底层加密字段，防止外部代码读取到数据',
   ],
   why:[
    '',
    'Python 不会对单下划线属性做访问拦截，它只是给开发者的约定提示。',
    '',
    '名称改写只是换了个属性名防子类冲突，外部写 obj._类名__name 依然能读到。',
   ],
   answers:[0,2],
   explain:'单下划线 _name 是社区封装约定；双下划线 __name 会触发名称改写（_ClassName__name），目的是避免子类意外重名冲突，而非安全加密。',
  },
  {
   id:'py-oop-5',
   type:'judge',
   q:'在多继承体系中，super() 会固定调用当前类括号里排在最左边的那个直接父类。',
   answer:false,
   explain:'super() 并不是硬指向某个父类，而是沿着当前实例所属类的 MRO（方法解析顺序）查找排在当前类之后的下一个类，从而支持菱形继承下的协作调用。',
  },
  {
   id:'py-oop-6',
   q:'为什么替代构造函数（如 from_dict）通常写成 @classmethod 而不是 @staticmethod？',
   options:[
    '@staticmethod 无法在函数体内调用类的构造函数',
    '@classmethod 的调用速度比 @staticmethod 快很多',
    '@staticmethod 在子类中无法被继承也不能被直接调用',
    '@classmethod 接收 cls 参数，子类调用时能自动返回子类实例',
   ],
   why:[
    '静态方法里可以硬写 Member(...)，但写死后子类调用返回的仍是父类实例。',
    '两者开销差异微乎其微，核心区别在于是否动态绑定调用它的类 cls。',
    '静态方法同样会被子类继承，只是拿不到当前调用者的类引用 cls。',
    '',
   ],
   answer:3,
   explain:'@classmethod 会把实际调用它的类作为 cls 传入，内部写 return cls(...) 时，子类调用 Sub.from_dict(...) 会自然构造并返回 Sub 实例。',
  },
  {
   id:'py-oop-7',
   type:'multi',
   q:'使用标准库 @dataclass 定义数据类时，下面哪些做法合理且有效？（多选）',
   options:[
    '用 field(default_factory=list) 为列表字段提供默认值',
    '设置 frozen=True 让实例不可变并在字段可哈希时支持哈希',
    '直接在字段上写 tags: list[str] = [] 让每个实例独享空列表',
    '设置 slots=True 减少实例内存开销并拦住手误拼错的属性赋值',
   ],
   why:[
    '',
    '',
    '@dataclass 禁止把可变对象 [] 直接当默认值，运行类定义时会直接抛出 ValueError。',
    '',
   ],
   answers:[0,1,3],
   explain:'@dataclass 要求可变默认值通过 field(default_factory=...) 提供；frozen=True 生成不可变对象并自动支持哈希；slots=True 生成 __slots__ 省内存并防止动态挂错属性。',
  },
  {
   id:'py-oop-8',
   type:'judge',
   q:'鸭子类型关注对象是否具备所需的方法和行为，而不要求它们继承自同一个公共基类。',
   answer:true,
   explain:'只要对象实现了调用方期望的方法（例如 .send()），即使彼此毫无继承关系，也能在 Python 中无缝替换使用。',
  },
  {
   id:'py-oop-9',
   q:'下面这段代码会输出什么？',
   code:`class Counter:
    step = 1

a, b = Counter(), Counter()
a.step = 5
print(a.step, b.step, Counter.step)`,
   options:['5 5 5','5 1 1','1 1 1','5 5 1'],
   why:[
    'a.step = 5 只在实例 a 身上创建了实例属性，不会改动类属性 Counter.step，也不影响 b。',
    '',
    '给 a.step 赋值后，读取 a.step 会优先命中实例属性 5。',
    'b 身上没有自己的 step 实例属性，读取时会回落到类属性 1。',
   ],
   answer:1,
   explain:'对实例属性重新赋值（a.step = 5）只会在实例 a 自己的 __dict__ 中写入新值并遮蔽类属性；类属性 Counter.step 和另一个实例 b.step 仍保持 1。',
  },
  {
   id:'py-oop-10',
   type:'fill',
   q:'在 @dataclass 中给列表或字典字段设默认值时，应使用 field(＿=list) 传入工厂函数，避免多实例共享同一对象。',
   accepted:['default_factory'],
   explain:'field(default_factory=list) 会在每次实例化时调用 list() 生成全新的空列表。',
  },
  {
   id:'py-oop-11',
   type:'short',
   q:'什么是多继承里的 MRO？在菱形继承中，为什么应该用 super() 而不是在子类里直接写“父类名.__init__(self)”？',
   reference:'MRO（Method Resolution Order，方法解析顺序）是 Python 用 C3 线性化算法为类计算出的属性与方法查找顺序，可通过 Cls.__mro__ 查看。在菱形继承（如 D 同时继承 B 和 C，而 B、C 都继承 A）中，若 B 和 C 各自直接调用 A.__init__(self)，基类 A 会被重复初始化两次；而使用 super() 时，Python 会严格按 D 的 MRO（D -> B -> C -> A）依次调用下一个类，确保每个祖先类都只初始化一次。',
   points:[
    '说明 MRO 是 Python 通过 C3 线性化确定的方法查找顺序（可用 __mro__ 查看）',
    '指出硬调 父类名.__init__(self) 在菱形继承下会导致公共基类被重复执行多次',
    '指出 super() 按当前实例所属类的 MRO 跳向下一个类，保证公共基类只执行一次',
   ],
   explain:'理解 super() 走的是“实例的 MRO 下一站”而不是“写死的直接父类”，就抓住了 Python 协作式多继承的核心。',
  },
  {
   id:'py-oop-12',
   type:'code',
   q:'用 @dataclass 定义一个 CartItem 类，包含字段 name: str、price: float 和 qty: int = 1。要求：在 __post_init__ 中校验 price >= 0 且 qty > 0（不满足抛出 ValueError），并提供一个只读 @property 属性 subtotal 返回 price * qty。',
   reference:`from dataclasses import dataclass

@dataclass
class CartItem:
    name: str
    price: float
    qty: int = 1

    def __post_init__(self) -> None:
        if self.price < 0 or self.qty <= 0:
            raise ValueError("价格不能为负且数量必须大于 0")

    @property
    def subtotal(self) -> float:
        return self.price * self.qty`,
   points:[
    '正确导入并使用 @dataclass 装饰器定义 CartItem',
    '声明 name: str、price: float 和带默认值的 qty: int = 1',
    '实现 __post_init__ 并在 price < 0 或 qty <= 0 时抛出 ValueError',
    '用 @property 实现只读属性 subtotal 返回 self.price * self.qty',
   ],
   explain:'__post_init__ 会在 dataclass 自动生成的 __init__ 末尾执行，非常适合集中校验字段合法性；只写 @property 不写 setter 就能得到只读计算属性。',
  },
 ],
};

export const pyErrorsIo:AiLevel={
 id:'py-errors-io',
 title:'异常处理、文件 I/O 与上下文管理器',
 summary:'try/except/else/finally、异常链、pathlib 与文件读写、with 上下文管理器协议与 json/csv',
 lessons:[
  {
   title:'异常机制、EAFP 风格与 try / except / else / finally',
   body:'程序运行中难免遇到文件不存在、字符串转数字失败、网络超时等意外，Python 用“异常”（Exception）把错误沿着调用栈向上抛出，交给能处理它的地方接住。\nPython 社区推崇 EAFP 风格（Easier to Ask for Forgiveness than Permission，先做再捕获），而不是 LBYL（Look Before You Leap，先层层检查再做）。比如读文件时，即使你先检查了文件存在，下一微秒它也可能被别的进程删掉；直接 try 打开并捕获 FileNotFoundError 反而更干净、也避免了“检查与使用之间的竞态”。\n完整的异常处理语句有四段，各有明确分工：\n一、try：放可能出错的那一小段核心代码（范围越小越好）；\n二、except 异常类型 as err：只有匹配到该异常时才执行；\n三、else：只有 try 全程没出错时才执行！把“成功后的后续逻辑”放进 else，可以避免意外吞掉后续逻辑自己抛出的异常；\n四、finally：不管 try 成没成功、有没有被 except 接住，甚至哪怕里面已经执行了 return，finally 都会在离开前雷打不动地执行，适合收尾清理。',
   code:`def parse_port(raw: str) -> int:
    try:
        port = int(raw)
    except ValueError as err:
        print(f"转换失败：{err}")
        return 8080
    else:
        print(f"转换成功，使用端口 {port}")
        return port
    finally:
        print("本次解析流程结束")

print("结果：", parse_port("9000"))
print("结果：", parse_port("abc"))`,
   explain:[
    {at:'def parse_port',to:'port = int(raw)',text:'try 块只包住真正可能失败的 int(raw)，范围克制清晰。'},
    {at:'except ValueError as err:',to:'return 8080',text:'字符串不是合法整数时进入这里，打印原因并返回默认端口 8080。'},
    {at:'else:',to:'return port',text:'只有 int(raw) 成功时才走 else，返回解析出来的端口。'},
    {at:'finally:',to:'print("本次解析流程结束")',text:'无论走了 except 的 return 还是 else 的 return，离开函数前都会先执行 finally。'},
    {at:'print("结果：", parse_port("9000"))',to:'parse_port("abc"))',text:'分别测试成功与失败两条路径，观察 else 和 finally 的触发时机。'},
   ],
  },
  {
   title:'异常继承树、自定义异常与异常链',
   body:'Python 所有内置异常都挂在一棵继承树上，最顶层的根是 BaseException。它下面分成两支：一支是 SystemExit（程序正常退出）、KeyboardInterrupt（用户按 Ctrl+C 中断）、GeneratorExit 等“系统级退出信号”；另一支才是 Exception，日常遇到的 ValueError、KeyError、OSError 全都在 Exception 下面。\n这就解释了为什么千万不要裸写 except:（也不该捕获 BaseException）：它会把 Ctrl+C 和 sys.exit() 一块吞掉，导致程序按半天 Ctrl+C 都停不下来！\n写中大型项目时，常见两个好习惯：\n一、自定义业务异常：写一个空类（或带错误码字段的类）继承 Exception，让调用方一眼区分“配置错”还是“余额不足”；\n二、保留异常链：在底层异常（如 KeyError、ValueError）转成上层业务异常时，写成 raise ConfigError("...") from err。Python 会把原始异常保存在新异常的 __cause__ 属性里，打印报错时两条堆栈完整相连，既给出清晰的业务提示，又不丢真正的根因。',
   code:`class ConfigError(Exception):
    pass

def load_timeout(cfg: dict[str, str]) -> int:
    try:
        return int(cfg["timeout"])
    except (KeyError, ValueError) as err:
        raise ConfigError("配置项 timeout 缺失或格式非法") from err

try:
    load_timeout({"timeout": "fast"})
except ConfigError as err:
    print("业务异常：", err)
    print("原始根因：", type(err.__cause__).__name__)`,
   explain:[
    {at:'class ConfigError(Exception):',to:'pass',text:'自定义业务异常必须继承 Exception（绝不能继承 BaseException）。'},
    {at:'def load_timeout',to:'return int(cfg["timeout"])',text:'读取配置并转成整数，可能缺键（KeyError）或值非法（ValueError）。'},
    {at:'except (KeyError, ValueError) as err:',to:'from err',text:'用元组同时捕获两种底层异常，并用 raise ... from err 包装成业务异常同时保留根因链。'},
    {at:'try:',to:'type(err.__cause__).__name__)',text:'调用方只需捕获 ConfigError，同时仍能通过 __cause__ 追溯到底层的 ValueError。'},
   ],
  },
  {
   title:'动手试试：try/except/else/finally 完整路径与异常链',
   body:'运行下面这段脚本，一次看清正常路径、异常路径、return 与 finally 的先后顺序，以及 raise ... from err 保留的原始根因。',
   practice:{
    steps:[
     '新建文件 error_chain_demo.py，把下面的代码复制进去保存。',
     '在终端运行 py error_chain_demo.py（Mac / Linux 运行 python3 error_chain_demo.py）。',
     '对照预期输出：注意第一次调用中，[finally] 在“返回：88.5”之前就先打印了；第二次调用中，根因 ValueError 也被完整保留。',
     '把 raise PaymentError(...) from err 里的 from err 删掉再跑一次，看看 err.__cause__ 变成了什么。',
    ],
    expect:'[else] 校验通过：88.50\n[finally] 清理临时状态\n返回： 88.5\n[except] 输入无效：\'-10\'\n[finally] 清理临时状态\n捕获上层异常：支付参数校验失败 | 根因：ValueError(金额必须大于 0)',
   },
   code:`class PaymentError(Exception):
    pass

def parse_amount(raw: str) -> float:
    try:
        value = float(raw)
        if value <= 0:
            raise ValueError("金额必须大于 0")
    except ValueError as err:
        print(f"[except] 输入无效：{raw!r}")
        raise PaymentError("支付参数校验失败") from err
    else:
        print(f"[else] 校验通过：{value:.2f}")
        return value
    finally:
        print("[finally] 清理临时状态")

print("返回：", parse_amount("88.5"))
try:
    parse_amount("-10")
except PaymentError as err:
    print(f"捕获上层异常：{err} | 根因：{type(err.__cause__).__name__}({err.__cause__})")`,
   explain:[
    {at:'class PaymentError(Exception):',to:'pass',text:'定义一个支付领域的自定义异常类。'},
    {at:'def parse_amount',to:'raise ValueError("金额必须大于 0")',text:'把字符串转成浮点数，并主动拦截非正数金额。'},
    {at:'except ValueError as err:',to:'from err',text:'捕获格式或范围错误，通过异常链转换为上层 PaymentError。'},
    {at:'else:',to:'return value',text:'校验顺利通过时执行，随后准备返回 value。'},
    {at:'finally:',to:'print("[finally] 清理临时状态")',text:'无论返回还是抛异常，离开函数前都会先执行这一行。'},
    {at:'print("返回："',text:'正常路径：依次经过 try → else → finally，最后把 88.5 交给外层 print。'},
    {at:'try:',to:'({err.__cause__})")',text:'异常路径：捕获转换后的 PaymentError，同时读取 __cause__ 验证原始 ValueError 没丢。'},
   ],
  },
  {
   title:'现代路径 pathlib.Path 与文件读写编码',
   body:'老教材里常见 os.path.join、os.path.dirname 等一堆零散函数，路径只是一段脆弱的字符串。现代 Python（3.4+）请直接用标准库 pathlib.Path：\n一、面向对象拼接路径：用 / 运算符直接拼接 Path("data") / "logs" / "app.log"，Windows 和 Mac/Linux 的斜杠差异自动处理；.parent、.name、.stem（去后缀文件名）、.suffix（后缀）随手即取，还有 .mkdir(parents=True, exist_ok=True)、.read_text(encoding="utf-8")、.write_text(..., encoding="utf-8") 等便捷方法；\n二、Windows 默认编码大坑：在中文 Windows 上，不写 encoding 直接调 open("a.txt", "r") 时，Python 默认按系统编码（通常是 GBK / cp936）打开，一读 UTF-8 文件就报 UnicodeDecodeError 或乱码！养成肌肉记忆：读写文本文件始终显式写 encoding="utf-8"；\n三、大文件别一口吞：f.read() 会把整个文件一次塞进内存，读几个 GB 的日志会把程序撑爆。文件对象本身是惰性迭代器，直接 for line in f: 逐行读取，内存占用几乎恒定。',
   code:`from pathlib import Path

log_path = Path("data") / "logs" / "app.log"
print(log_path.parent, log_path.name, log_path.stem, log_path.suffix)

def count_errors(path: Path) -> int:
    total = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                total += 1
    return total`,
   explain:[
    {at:'from pathlib import Path',text:'导入现代路径处理类 Path，替代繁琐的 os.path 字符串拼接。'},
    {at:'log_path = Path("data")',to:'log_path.suffix)',text:'用 / 跨平台拼接路径，并分别取出父目录、完整文件名、主干名（app）和后缀（.log）。'},
    {at:'def count_errors',to:'total = 0',text:'统计日志文件中包含 ERROR 的行数。'},
    {at:'with open(path, "r", encoding="utf-8") as f:',text:'以只读文本模式打开文件，显式指定 UTF-8 避免 Windows 编码坑，并用 with 确保自动关闭。'},
    {at:'for line in f:',to:'return total',text:'逐行惰性迭代文件对象，哪怕日志高达数 GB 也只占极少内存。'},
   ],
  },
  {
   title:'with 语句与上下文管理器协议',
   body:'如果手动写 f = open(...) 然后在最后写 f.close()，只要中间任何一行抛了异常或提前 return，f.close() 就会被跳过，造成文件句柄或锁泄漏。with 语句专门负责把“获取资源”和“必然释放资源”成对绑定。\n任何对象只要实现了两个魔术方法，就满足“上下文管理器协议”，可以放进 with 里用：\n一、__enter__(self)：进入 with 块时调用，它的返回值会赋给 as 后面的变量；\n二、__exit__(self, exc_type, exc_val, exc_tb)：离开 with 块时自动调用。如果块内一切正常，三个异常参数都是 None；如果块内抛了异常，它们分别是异常类、异常实例和回溯对象。\n特别注意 __exit__ 的返回值：返回 False 或 None（默认）时，异常会照常向外传播；如果返回 True，Python 会认为“异常已经被妥善处理”，把异常抑制掉，程序接着 with 后面的代码继续跑。\n需要同时管理多个资源时，Python 3.10+ 支持带括号换行：with (open(src) as a, open(dst, "w") as b):。',
   code:`class ManagedLock:
    def __init__(self, name: str) -> None:
        self.name = name

    def __enter__(self) -> str:
        print(f"获取锁：{self.name}")
        return self.name

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        print(f"释放锁：{self.name}（是否异常：{exc_type is not None}）")
        return False

with ManagedLock("order") as lock_name:
    print(f"在锁 {lock_name} 保护下执行业务")`,
   explain:[
    {at:'class ManagedLock:',to:'self.name = name',text:'定义一个演示用的上下文管理器类，保存锁的名字。'},
    {at:'def __enter__(self)',to:'return self.name',text:'进入 with 块前执行：模拟获取锁，并把锁名作为 as 变量的取值返回。'},
    {at:'def __exit__(self',to:'return False',text:'离开 with 块时无论是否报错都会执行释放；返回 False 表示不吞掉块内抛出的异常。'},
    {at:'with ManagedLock("order") as lock_name:',to:'保护下执行业务")',text:'进入时自动调 __enter__，块结束后自动调 __exit__ 释放资源。'},
   ],
  },
  {
   title:'@contextlib.contextmanager：用生成器速写上下文管理器',
   body:'每次写个轻量级的“进入做 A、退出做 B”逻辑都要单独建一个类、写 __enter__ 和 __exit__，未免太重。标准库的 @contextlib.contextmanager 可以直接把一个带 yield 的生成器函数变成上下文管理器：\n一、yield 之前的代码相当于 __enter__；\n二、yield 后面跟的值，就是 as 变量拿到的对象；\n三、yield 之后的代码相当于 __exit__。\n这里有一个极其重要、面试也常问的坑：如果 with 代码块里抛了异常，Python 会把异常从 yield 处抛回生成器里。要是你没用 try ... finally 把 yield 包起来，yield 后面的清理代码根本不会执行！所以凡是必须执行的收尾逻辑，一定要写在 finally 里。\n另外，标准库 contextlib 里还有两个很顺手的小工具：suppress(FileNotFoundError) 可以优雅地忽略指定异常；ExitStack 可以管理数量在运行时才确定的多个上下文管理器。',
   code:`from contextlib import contextmanager

@contextmanager
def open_section(title: str):
    print(f"=== 开始：{title} ===")
    try:
        yield title.upper()
    finally:
        print(f"=== 结束：{title} ===")

with open_section("sync") as label:
    print(f"正在运行 {label}")`,
   explain:[
    {at:'from contextlib import contextmanager',text:'从标准库 contextlib 导入装饰器。'},
    {at:'@contextmanager',to:'print(f"=== 开始：{title} ===")',text:'yield 之前的部分对应 __enter__，负责准备工作。'},
    {at:'try:',to:'yield title.upper()',text:'暂停生成器并把 title.upper() 交给 with ... as label；用 try 包住 yield 是关键。'},
    {at:'finally:',to:'print(f"=== 结束：{title} ===")',text:'写在 finally 里确保即使 with 块内抛异常，收尾日志也照样会执行。'},
    {at:'with open_section("sync") as label:',to:'print(f"正在运行 {label}")',text:'像普通上下文管理器一样使用，输出开始、主体和结束三行。'},
   ],
  },
  {
   title:'动手试试：手写类与 @contextmanager 两种上下文管理器',
   body:'我们来同时跑通两种写法：用类实现一个只抑制 KeyError 的管理器，再用 @contextmanager 配合标准库 tempfile.TemporaryDirectory() 和 Path 创建、读取并自动清理临时文件——运行完磁盘上不留任何垃圾文件。',
   practice:{
    steps:[
     '新建文件 ctx_demo.py，复制下面的代码并保存。',
     '在终端运行 py ctx_demo.py（Mac / Linux 运行 python3 ctx_demo.py）。',
     '对照预期输出：看看 KeyError 被抑制后程序是否继续往下跑，以及退出 with 后临时文件 p.exists() 是否立刻变成了 False。',
     '把 data["missing"] 改成 1 / 0 再跑一次，验证 SuppressKeyError 不会乱吞其他异常。',
    ],
    expect:'已抑制 KeyError：\'missing\'\n程序继续执行\n创建临时文件：hello.txt\n读取行数： 2 内容： [\'第一行\', \'第二行\']\n准备清理：hello.txt\n退出后文件还存在吗？ False',
   },
   code:`from contextlib import contextmanager
from pathlib import Path
import tempfile

class SuppressKeyError:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_type is KeyError:
            print(f"已抑制 KeyError：{exc_val}")
            return True
        return False

@contextmanager
def temp_note(filename: str, text: str):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / filename
        path.write_text(text, encoding="utf-8")
        print(f"创建临时文件：{path.name}")
        try:
            yield path
        finally:
            print(f"准备清理：{path.name}")

with SuppressKeyError():
    data = {"a": 1}
    print(data["missing"])
print("程序继续执行")

with temp_note("hello.txt", "第一行\\n第二行") as p:
    lines = p.read_text(encoding="utf-8").splitlines()
    print("读取行数：", len(lines), "内容：", lines)
print("退出后文件还存在吗？", p.exists())`,
   explain:[
    {at:'from contextlib import',to:'import tempfile',text:'导入 contextmanager、Path 和用于创建自动清理临时目录的 tempfile。'},
    {at:'class SuppressKeyError:',to:'return False',text:'类式上下文管理器：仅当异常类型正好是 KeyError 时返回 True 抑制异常，其余异常照常抛出。'},
    {at:'@contextmanager',to:'print(f"创建临时文件：{path.name}")',text:'借用 TemporaryDirectory 自动建临时目录，写入 UTF-8 文件后交给调用方。'},
    {at:'try:',to:'print(f"准备清理：{path.name}")',text:'用 try...finally 包裹 yield，退出后内层 TemporaryDirectory 随即删掉整个临时目录。'},
    {at:'with SuppressKeyError():',to:'print("程序继续执行")',text:'触发 KeyError 被 __exit__ 拦截并抑制，后续语句正常执行。'},
    {at:'with temp_note',to:'p.exists())',text:'在 with 块里读回刚写入的两行文字；离开 with 后临时目录已自动删除，p.exists() 为 False。'},
   ],
  },
  {
   title:'常用结构化数据读写：json 与 csv',
   body:'配置文件、接口报文、数据导出表是日常高频打交道的格式，标准库的 json 和 csv 模块开箱即用。\n一、json 模块：记住带 s 的处理字符串（dumps / loads），不带 s 的直接读写文件对象（dump / load）。序列化含中文的数据时，json.dumps 默认会把中文转成 \\u4e0a\\u6d77 这样的转义码，加上 ensure_ascii=False 就能直接保留可读中文；调试或落盘配置文件时再加 indent=2 会漂亮得多。\n二、csv 模块：千万别图省事用 line.split(",") 手拆 CSV——只要单元格里本身带逗号（比如 "热,少冰"），手拆立刻错位！用 csv.DictReader 会自动按 RFC 规则处理引号和逗号，把每一行变成“表头 → 值”的字典（注意读出来的值全是 str，数字需要手动 int / float 转换）；写表格则用 csv.DictWriter。\n两个实战小提示：在 Windows 上用 open 写 CSV 文件时要额外传 newline=""，防止多出空行；做单元测试或解析网络拿到的文本时，用 io.StringIO(text) 把字符串伪装成内存文件，不用落盘就能直接喂给 csv 或 json.load。',
   code:`import csv
import io
import json

payload = {"city": "上海", "items": ["咖啡", "面包"], "paid": True}
text = json.dumps(payload, ensure_ascii=False)
print("JSON：", text)
print("还原：", json.loads(text)["city"])

raw_csv = 'name,note,price\\n拿铁,"热,少冰",28\\n可颂,"原味",16\\n'
reader = csv.DictReader(io.StringIO(raw_csv))
for row in reader:
    print(row["name"], row["note"], int(row["price"]))`,
   explain:[
    {at:'import csv',to:'import json',text:'导入标准库的 csv、内存文本流 io 和 json 模块。'},
    {at:'payload = {',to:'print("JSON：", text)',text:'用 ensure_ascii=False 保留中文，Python 的 True 会自动转成 JSON 的 true。'},
    {at:'print("还原："',text:'用 json.loads 把 JSON 字符串还原回 Python 字典并取值。'},
    {at:'raw_csv =',to:'io.StringIO(raw_csv))',text:'用 StringIO 把多行 CSV 字符串包装成类文件对象，交给 DictReader 按表头解析。'},
    {at:'for row in reader:',to:'int(row["price"]))',text:'"热,少冰" 里的逗号不会被误拆分；字段默认是字符串，金额转成 int 后使用。'},
   ],
  },
  {
   title:'动手试试：JSON 与 CSV 内存流解析与汇总',
   body:'把本关学到的 io.StringIO、csv.DictReader、try/except 容错和 json.dumps 串起来：解析一份带引号逗号和一条脏数据的账单 CSV，按分类汇总金额并输出标准 JSON 报告。',
   practice:{
    steps:[
     '新建文件 report_demo.py，把下面的代码复制进去并保存。',
     '在终端运行 py report_demo.py（Mac / Linux 运行 python3 report_demo.py）。',
     '对照预期输出，确认带逗号的书名没有错位、非法数字那一行被安全跳过计入 skipped、中文保留在 JSON 中。',
     '把 json.dumps 里的 ensure_ascii=False 删掉再跑一次，亲眼对比一下默认 ASCII 转义后的输出。',
    ],
    expect:'{"skipped": 1, "totals": {"图书": 228, "文具": 45}}',
   },
   code:`import csv
import io
import json

raw_csv = (
    'category,item,amount\\n'
    '图书,"Python 实战,第2版",89\\n'
    '文具,"钢笔",45\\n'
    '图书,"算法导论",bad_num\\n'
    '图书,"流畅的 Python",139\\n'
)

totals: dict[str, int] = {}
skipped = 0

for row in csv.DictReader(io.StringIO(raw_csv)):
    try:
        amount = int(row["amount"])
    except ValueError:
        skipped += 1
        continue
    cat = row["category"]
    totals[cat] = totals.get(cat, 0) + amount

report = {"totals": totals, "skipped": skipped}
print(json.dumps(report, ensure_ascii=False, sort_keys=True))`,
   explain:[
    {at:'import csv',to:'import json',text:'导入 csv、io、json 三个标准库模块。'},
    {at:'raw_csv = (',to:'"流畅的 Python",139\\n\'',text:'准备包含引号内逗号以及一条坏金额（bad_num）的示例 CSV 文本。'},
    {at:'totals: dict[str, int] = {}',to:'skipped = 0',text:'准备分类汇总字典和跳过计数。'},
    {at:'for row in csv.DictReader',to:'continue',text:'逐行解析，仅对 int 转换做精确的 ValueError 捕获，坏行计入 skipped 后跳过。'},
    {at:'cat = row["category"]',to:'totals.get(cat, 0) + amount',text:'按分类累加合法金额。'},
    {at:'report = {',to:'sort_keys=True))',text:'组装结果并序列化为中文可读、键名有序的 JSON 字符串输出。'},
   ],
  },
  {
   title:'异常处理工程清单：写给生产环境的四条原则',
   body:'语法学会不难，真正拉开工程代码差距的，是处理异常时的克制与边界感。上线前不妨按这四条清单自检：\n一、只捕获你真能处理的异常，且 try 块尽量窄：把十行不相关的代码全塞进一个大 try，往往会掩盖真正的变量拼写错或空指针 bug；\n二、绝不静默吞异常：except Exception: pass 是排查线上事故的噩梦，数据悄悄丢了却没有任何痕迹。哪怕确实要忽略某个预期内的小错误，也请用 contextlib.suppress(特定异常) 写明意图；\n三、在模块边界翻译异常：底层库抛出的连接失败、JSON 解析失败，到了业务层边界时用 raise ServiceError(...) from err 统一转换成清晰的领域异常，别让内部实现细节裸露给上层；\n四、统一在入口边界记日志：不要每一层都“打印一次日志又重新 raise”，造成同一错刷屏五遍。中间层负责补充语义或传播，最外层（如接口处理器、任务调度器）统一用 logging.exception 记录完整堆栈，并给用户返回友好的提示信息。',
   code:`import logging

logger = logging.getLogger(__name__)

class OrderLoadError(Exception):
    pass

def parse_order_id(raw: str) -> int:
    try:
        return int(raw)
    except ValueError as err:
        raise OrderLoadError(f"非法订单号：{raw!r}") from err

def handle_request(raw_id: str) -> dict[str, str]:
    try:
        oid = parse_order_id(raw_id)
    except OrderLoadError as err:
        logger.exception("订单查询失败")
        return {"error": str(err)}
    return {"status": "ok", "order_id": str(oid)}`,
   explain:[
    {at:'import logging',to:'logger = logging.getLogger(__name__)',text:'按模块名获取日志器，用来在边界层记录异常堆栈。'},
    {at:'class OrderLoadError(Exception):',to:'pass',text:'定义明确的业务异常类型。'},
    {at:'def parse_order_id',to:'from err',text:'内层函数不重复打日志，只做窄范围捕获并通过异常链翻译成业务异常。'},
    {at:'def handle_request',to:'return {"error": str(err)}',text:'入口边界层统一捕获业务异常，用 logger.exception 记录完整堆栈，并向调用方返回干净的错误响应。'},
    {at:'return {"status": "ok"',text:'正常路径返回业务数据。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-errors-io-1',
   q:'在 try / except / else / finally 结构中，else 分支什么时候会执行？',
   options:[
    '无论 try 是否报错都会在最后执行',
    '当 try 抛出的异常没有被 except 匹配时',
    '只有 try 代码块全程未抛出异常时才执行',
    '当 except 分支处理完异常并正常结束后',
   ],
   why:[
    '无论成败都会执行的是 finally 分支，不是 else。',
    '未匹配异常会直接跳去执行 finally 并向外传播，不会进入 else。',
    '',
    '一旦进了 except，else 就不会再执行。',
   ],
   answer:2,
   explain:'else 只在 try 块顺利执行完且没有触发任何异常时运行，常用来放置“成功后的后续逻辑”，以免后续逻辑的报错被同一个 try 意外捕获。',
  },
  {
   id:'py-errors-io-2',
   q:'为什么工程实践强烈不建议裸写 except:（不指定任何异常类型）？',
   options:[
    '会把 KeyboardInterrupt 和 SystemExit 也一并拦住',
    'Python 3 已废弃裸 except 语法并直接报语法错误',
    '裸 except 捕获不到内置的 ValueError 与 KeyError',
    '裸 except 会导致对应的 finally 清理块被自动跳过',
   ],
   why:[
    '',
    'Python 3 语法上仍允许裸 except，所以才需要开发者主动避免。',
    '问题恰恰相反：它捕得太宽了，连退出信号一起捕。',
    '无论怎么写 except，finally 都会在退出前照常执行。',
   ],
   answer:0,
   explain:'裸 except: 等价于 except BaseException:，会把用户按 Ctrl+C 触发的 KeyboardInterrupt 和 sys.exit() 触发的 SystemExit 都吞掉；至少应写成 except Exception:，更推荐捕获具体异常。',
  },
  {
   id:'py-errors-io-3',
   q:'如果函数在 try 块中执行了 return 1，同时后面配有 finally 块，实际会发生什么？',
   options:[
    '立即返回 1，跳过后面的 finally 代码块',
    '抛出语法错误，try 里不允许出现 return',
    '跳过 return 1，直接执行 finally 后返回 None',
    '先执行完 finally 代码块，再把 1 返回给调用方',
   ],
   why:[
    'finally 的职责就是保证清理逻辑在离开前执行，不会被 return 跳过。',
    'try 块里完全可以写 return，语法合法。',
    '只要 finally 自己里没有写新的 return，原定的返回值 1 不会丢失。',
    '',
   ],
   answer:3,
   explain:'遇到 return 时，Python 会暂存返回值，先执行完 finally 块，再把返回值交给调用方（所以也不要在 finally 里乱写 return 覆盖原返回值或异常）。',
  },
  {
   id:'py-errors-io-4',
   type:'multi',
   q:'关于自定义异常和异常链，下面哪些做法符合 Python 规范？（多选）',
   options:[
    '让自定义业务异常直接继承自 BaseException',
    '让自定义业务异常继承自 Exception 或其子类',
    '转换异常时丢弃原异常，避免堆栈里出现根因',
    '用 raise NewError("...") from err 保留异常链',
   ],
   why:[
    'BaseException 是留给系统退出信号的，自定义异常继承它会导致 except Exception 抓不到。',
    '',
    '丢弃原始异常会丢失排错线索，应尽量保留根因链。',
    '',
   ],
   answers:[1,3],
   explain:'自定义异常应继承 Exception；将底层异常翻译为业务异常时用 raise ... from err 可以把原始异常挂在 __cause__ 上，完整保留排错链路。',
  },
  {
   id:'py-errors-io-5',
   type:'judge',
   q:'上下文管理器的 __exit__ 方法如果返回 True，with 代码块里抛出的异常会被抑制而不再向外传播。',
   answer:true,
   explain:'这是上下文管理器协议的既定行为：__exit__ 返回真值表示异常已处理并被抑制；返回 False 或 None 则异常继续向外传播。',
  },
  {
   id:'py-errors-io-6',
   q:'在跨平台项目（含中文 Windows）中读取 UTF-8 文本文件，哪种写法最稳妥？',
   options:[
    'open(path, "r") 依赖操作系统默认编码即可',
    'open(path, "r", encoding="utf-8") 显式指定编码',
    'open(path, "rb", encoding="utf-8") 同时启用二进制',
    '先改系统区域设置再调用不带参数的 open(path)',
   ],
   why:[
    '中文 Windows 默认编码常为 GBK（cp936），直接读 UTF-8 文件极易乱码或报 UnicodeDecodeError。',
    '',
    '二进制模式 "rb" 不能同时传 encoding 参数，会直接抛出 ValueError。',
    '靠用户手工改系统全局设置既不可靠也无法跨机器复用。',
   ],
   answer:1,
   explain:'读写文本文件时显式传入 encoding="utf-8"（或 Path.read_text(encoding="utf-8")），才能在 Windows、macOS、Linux 上表现一致。',
  },
  {
   id:'py-errors-io-7',
   type:'multi',
   q:'下面哪些场景适合用 with 上下文管理器来自动管理资源？（多选）',
   options:[
    '打开本地文件进行读写并在结束后自动关闭',
    '申请线程互斥锁并在离开代码块后自动释放',
    '获取数据库连接并在操作完成后归还或关闭',
    '创建临时目录并在退出作用域时自动清理',
   ],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'凡是“成对出现获取与释放、即使中间报错也要收尾”的资源——文件、锁、网络连接、临时目录——都非常适合交由 with 上下文管理器接管。',
  },
  {
   id:'py-errors-io-8',
   type:'judge',
   q:'用 @contextlib.contextmanager 写上下文管理器时，即使不把 yield 包在 try ... finally 里，with 块抛异常后 yield 后面的清理代码也会自动执行。',
   answer:false,
   explain:'with 块内抛出的异常会被注入到生成器的 yield 处；如果没写 try ... finally，异常会直接中断生成器，yield 之后的清理语句完全不会运行。',
  },
  {
   id:'py-errors-io-9',
   q:'解析可能含引号和逗号（如 "热,少冰"）的 CSV 文本时，为什么推荐用 csv.DictReader 而不是按逗号 split？',
   options:[
    'DictReader 会自动把所有数字列转换成 int 或 float',
    'Python 字符串的 split 方法不支持传入逗号分隔符',
    'DictReader 能正确处理引号包裹的逗号并按表头映射字典',
    'DictReader 会自动把整张表格先转存成 JSON 再读取',
   ],
   why:[
    'DictReader 读出的所有字段值依然是字符串，需要自行按需转换类型。',
    'split(",") 语法完全合法，只是遇到字段内部自带逗号时会错误拆散单元格。',
    '',
    'csv 模块直接逐行流式解析 CSV 文本，并不会转成 JSON。',
   ],
   answer:2,
   explain:'csv.DictReader 遵循 CSV 引号转义规则，不会把引号内部的逗号误当列分隔符，而且用表头作为字典键，比按数字下标取值清晰得多。',
  },
  {
   id:'py-errors-io-10',
   type:'fill',
   q:'使用 json.dumps 将含中文的字典序列化为字符串时，若希望直接保留中文而非 \\u 转义码，应传入关键字参数 ＿=False。',
   accepted:['ensure_ascii'],
   explain:'json.dumps 默认 ensure_ascii=True，会把非 ASCII 字符转义成 \\uXXXX；设为 False 即可直接输出中文。',
  },
  {
   id:'py-errors-io-11',
   type:'short',
   q:'什么是 Python 推崇的 EAFP 风格？它与 LBYL（先检查再操作）相比有什么好处，请举一个文件读写或字典访问的例子说明。',
   reference:'EAFP 指“先尝试操作，出错了再捕获异常”（Easier to Ask for Forgiveness than Permission），与“先层层 if 检查再操作”的 LBYL（Look Before You Leap）相对。好处有两点：一是正常路径少一次额外检查，代码更简洁、符合鸭子类型；二是在文件等外部资源场景下能避免“刚检查完存在，下一刻文件就被删除”的竞态问题。例如读文件直接 try: with open(path, encoding="utf-8") ... except FileNotFoundError: ...，而不是先 path.exists() 再 open。',
   points:[
    '准确解释 EAFP（先操作再捕获）与 LBYL（先检查再操作）的区别',
    '指出 EAFP 减少冗余检查、代码更简洁且契合鸭子类型',
    '指出文件或并发场景下可避免检查与使用之间的竞态条件',
    '给出具体的文件读写或字典取值对比示例',
   ],
   explain:'当然，如果某件事频繁失败且检查成本极低（比如 d.get(key)），也没必要强行写 try/except，结合场景选最清晰的写法即可。',
  },
  {
   id:'py-errors-io-12',
   type:'code',
   q:'用 @contextlib.contextmanager 写一个名为 temp_flag(cfg: dict, key: str) 的上下文管理器：进入时把 cfg[key] 临时设为 True，退出时（无论代码块是否抛异常）都恢复原状——如果原来存在该键就恢复旧值，原来不存在就删掉该键。',
   reference:`from contextlib import contextmanager

@contextmanager
def temp_flag(cfg: dict, key: str):
    existed = key in cfg
    old_value = cfg.get(key)
    cfg[key] = True
    try:
        yield cfg
    finally:
        if existed:
            cfg[key] = old_value
        else:
            cfg.pop(key, None)`,
   points:[
    '正确使用 @contextmanager 装饰生成器函数',
    '进入前区分键原本是否存在并保存旧值（不能只靠 old_value is None 判断）',
    '将 yield 包裹在 try ... finally 中保证异常时也能恢复',
    '退出时按原本是否存在分别恢复旧值或删除该键',
   ],
   explain:'用 existed = key in cfg 区分“原本不存在”和“原本的值就是 None”，并用 try...finally 兜底，是写状态临时切换型上下文管理器的标准姿势。',
  },
 ],
};

export const pyModules:AiLevel={
 id:'py-modules',
 title:'模块、包、虚拟环境与常用标准库',
 summary:'import 机制与 sys.modules、__name__ == "__main__"、包与循环导入、venv/pyproject.toml 与核心标准库',
 lessons:[
  {
   title:'模块与 import 机制：sys.modules 与 sys.path',
   body:'在 Python 里，每一个 .py 文件天然就是一个“模块”（module）。当你写下 import math 或 from math import sqrt 时，解释器背后只做两件很踏实的事：\n一、先查缓存 sys.modules：这是一个存放“模块名 → 模块对象”的字典。如果模块已经加载过，Python 直接把缓存里的同一个对象返回给你，绝不会再执行一遍模块里的顶层代码；\n二、没命中才顺着 sys.path 找：sys.path 是一个目录列表，通常依次包含当前脚本所在目录、标准库目录和第三方库 site-packages。找到文件后，Python 创建模块对象、先登记进 sys.modules，再把文件里的顶层代码从上到下执行一遍。\n新手最常踩的一个暗坑就藏在 sys.path 的顺序里：因为当前目录排在标准库前面，千万不要把自己的练习文件起名叫 json.py、random.py 或 logging.py！否则同目录里一写 import json，Python 会先撞上你自己的文件，把真正的标准库彻底遮住，报出一堆莫名其妙的 AttributeError。',
   code:`import math
import sys
from math import sqrt as square_root

print("是否已缓存：", "math" in sys.modules)
print("同一个模块对象：", sys.modules["math"] is math)
print("搜索路径数量：", len(sys.path))
print("平方根：", square_root(81))`,
   explain:[
    {at:'import math',to:'import sys',text:'导入标准库的 math 和 sys 模块，模块对象会缓存进 sys.modules。'},
    {at:'from math import sqrt as square_root',text:'只导入指定成员并起别名；注意 math 早已在缓存里，不会重新执行加载。'},
    {at:'print("是否已缓存："',to:'is math)',text:'验证 math 就在 sys.modules 中，且拿到的是完全同一个对象。'},
    {at:'print("搜索路径数量："',to:'square_root(81))',text:'查看当前 sys.path 条目数，并调用导入的平方根函数。'},
   ],
  },
  {
   title:'if __name__ == "__main__": 的真正含义',
   body:'刚看 Python 项目时，几乎每个脚本底部都写着一行神秘的 if __name__ == "__main__":。其实原理一句话就能讲透：\n每个模块加载时，Python 都会自动给它塞一个内置变量 __name__。\n一、当你直接运行这个文件（比如 python tax.py 或 python -m app.tax）时，Python 把它的 __name__ 设成字符串 "__main__"，表示“你是这次启动的主入口”；\n二、当别的文件导入它（import tax，或者测试框架 pytest 导入它做单元测试）时，Python 把它的 __name__ 设成它真正的模块名（比如 "tax" 或 "app.tax"）。\n因为导入模块时会执行顶层代码，如果你把启动服务、读写文件、打印演示结果的代码直接散落在顶层，别人一 import 就会误触发这些副作用。把“只有直接运行才该干的事”关进 if __name__ == "__main__": 里，文件就能身兼两职：既能直接跑，又能安全地被别的模块复用和测试。',
   code:`def calc_tax(amount: float, rate: float = 0.06) -> float:
    return round(amount * rate, 2)

print(f"模块已加载，当前 __name__ = {__name__!r}")

if __name__ == "__main__":
    print("直接运行时才会执行：", calc_tax(200))`,
   explain:[
    {at:'def calc_tax',to:'return round(amount * rate, 2)',text:'可复用的纯函数定义在顶层，无论直接运行还是被导入都能使用。'},
    {at:'print(f"模块已加载',text:'演示用：顶层语句在被 import 时也会执行，所以真实库代码里顶层通常只放定义和常量。'},
    {at:'if __name__ == "__main__":',to:'calc_tax(200))',text:'入口保护判断：直接运行本文件时为 True，被其他文件 import 时为 False，避免误触发脚本逻辑。'},
   ],
  },
  {
   title:'包（Package）、目录组织与循环导入',
   body:'项目变大后，一个文件塞不下，就需要把相关模块放进文件夹组成“包”（package）。\n一、__init__.py 与 __all__：文件夹里放一个 __init__.py，它就是一个标准包，导入包时会先执行 __init__.py（常用来对外暴露精选接口）。在里面定义 __all__ = ["create_order"] 可以规定 from pkg import * 只导出哪些名字；不过工程代码里一般不推荐用 import *，因为会污染命名空间、让读代码的人找不到名字出处；\n二、绝对导入 vs 相对导入：绝对导入写完整包路径（from app.order.service import create_order），清晰直白；包内部同级或上级引用也可以用相对导入（from .service import create_order）。注意带相对导入的子模块不能直接 python app/order/sub.py 跑，而要在项目根目录用模块方式运行：python -m app.order.sub；\n三、循环导入（Circular Import）：如果 a.py 顶层 import b，而 b.py 顶层又 from a import Foo，加载到一半时 Foo 还没定义好，就会报 ImportError。两个正经解法：① 架构上把双方共用的类或工具抽到第三个模块 common.py（最推荐）；② 把其中一处导入延迟到真正用到的函数内部（如果只为了类型注解，则放进 if TYPE_CHECKING: 分支）。',
   code:`# app/order/__init__.py
from .service import create_order

__all__ = ["create_order"]

# 延迟局部导入：打破两个模块加载期的循环依赖
def send_receipt(order_id: str) -> str:
    from .mailer import render_mail
    return render_mail(order_id)`,
   explain:[
    {at:'from .service import create_order',text:'包内相对导入：点号 . 代表当前包目录，把常用函数提升到包顶层方便外部导入。'},
    {at:'__all__ = ["create_order"]',text:'明确声明本包的公开导出列表，也限制了 from app.order import * 的导出范围。'},
    {at:'def send_receipt',to:'return render_mail(order_id)',text:'如果外层已经存在双向依赖，把导入延后到函数调用时执行（此时两个模块都早已加载完毕），即可化解循环导入。'},
   ],
  },
  {
   title:'虚拟环境与现代包管理：venv、pyproject.toml 与 uv',
   body:'把所有第三方库都装在全局 Python 里，很快就会撞上“依赖地狱”：老项目依赖 pydantic 1.x，新项目需要 pydantic 2.x，装了一个另一个就崩。解决办法是给每个项目建一个独立的“虚拟环境”，互不干扰。\n一、标准库自带的 venv：在项目根目录运行 python -m venv .venv 就能建好隔离环境。激活后（Windows PowerShell 运行 .venv\\Scripts\\Activate.ps1，Mac/Linux 运行 source .venv/bin/activate），再用 pip install 安装依赖，并用 pip freeze > requirements.txt 导出精确版本清单。切记把 .venv/ 写进 .gitignore，不要提交到仓库；\n二、现代标准 pyproject.toml：过去 Python 项目散落着 setup.py、requirements.txt、pytest.ini 等一堆文件，现在社区已经统一到 pyproject.toml，一个文件写清项目名、Python 版本要求、运行依赖、开发依赖和各工具配置；\n三、高速工具 uv：近年来生态里极其流行的 Rust 编写工具，把环境创建、依赖安装和锁文件合并成一套飞快的命令：uv init 初始化项目，uv add httpx 添加依赖并自动维护 pyproject.toml 与 uv.lock，uv run pytest 直接在项目隔离环境里运行命令，连手动激活环境都省了。',
   code:`[project]
name = "study-demo"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.9",
]

[dependency-groups]
dev = ["pytest>=8.0", "ruff>=0.6"]`,
   explain:[
    {at:'[project]',to:'version = "0.1.0"',text:'PEP 621 标准项目元信息小节，声明包名和版本号。'},
    {at:'requires-python = ">=3.11"',text:'声明项目支持的最低 Python 版本，防止在过老的解释器里装错依赖。'},
    {at:'dependencies = [',to:'"pydantic>=2.9",',text:'生产运行所需的直接依赖及最低版本约束。'},
    {at:'[dependency-groups]',to:'dev = ["pytest>=8.0", "ruff>=0.6"]',text:'仅开发和测试阶段使用的依赖组（如测试框架 pytest、代码检查工具 ruff），生产部署时可不安装。'},
   ],
  },
  {
   title:'日期时间 datetime：时区、格式化与时间计算',
   body:'处理时间最容易埋雷的地方不是格式，而是“时区”。Python 的 datetime 对象分两种：\n一、无时区（naive）：不含 tzinfo，只写了“2026-06-01 12:30”，你根本不知道它是北京中午还是伦敦中午，跨服务器部署极易差出 8 小时；\n二、带时区（aware）：明确携带了时区信息（如 timezone.utc、固定偏移 timezone(timedelta(hours=8))，或标准库 zoneinfo.ZoneInfo("Asia/Shanghai")；注：Windows 上使用 ZoneInfo 需额外安装 tzdata 包）。\n行业通行铁律：获取当前时间用 datetime.now(timezone.utc)（老的 datetime.utcnow() 因返回无时区对象已在 Python 3.12+ 标记弃用），数据库存储和接口传输统一用 UTC 和 ISO 8601 字符串（.isoformat() / fromisoformat()），直到最后要展示给用户时才用 .astimezone(...) 转成目标本地时区。\n做日期加减或算两个时间的间隔，则用 timedelta（支持 days、hours、minutes、seconds），格式化与解析按需用 strftime / strptime。',
   code:`from datetime import datetime, timedelta, timezone

utc_now = datetime(2026, 6, 1, 12, 30, tzinfo=timezone.utc)
cn_tz = timezone(timedelta(hours=8))
cn_time = utc_now.astimezone(cn_tz)
deadline = cn_time + timedelta(days=3, hours=2)

print("ISO 格式：", utc_now.isoformat())
print("北京时间：", cn_time.strftime("%Y-%m-%d %H:%M"))
print("截止时间：", deadline.strftime("%Y-%m-%d %H:%M"))`,
   explain:[
    {at:'from datetime import',text:'导入 datetime 类、时间间隔 timedelta 和时区类 timezone。'},
    {at:'utc_now = datetime(',text:'构造一个带 UTC 时区的 aware datetime 对象，时间含义明确无歧义。'},
    {at:'cn_tz = timezone(',to:'cn_time = utc_now.astimezone(cn_tz)',text:'创建东八区时区并转换同一时刻，UTC 12:30 变成北京时间 20:30。'},
    {at:'deadline = cn_time + timedelta(',text:'用 timedelta 准确计算 3 天 2 小时后的截止时刻。'},
    {at:'print("ISO 格式："',to:'print("截止时间："',text:'分别演示标准 ISO 8601 输出和 strftime 自定义格式输出。'},
   ],
  },
  {
   title:'正则表达式 re：原始字符串、匹配方法与命名分组',
   body:'遇到“从日志提取耗时”“校验编号格式”“批量替换文本”这类文本模式任务，标准库 re 模块是利器。掌握四个核心习惯就能避开绝大多数坑：\n一、始终用原始字符串 r"..."：正则里大量出现 \\d、\\s、\\b，普通字符串会先按 Python 转义解释一遍，加上前缀 r 让反斜杠原样传给正则引擎；\n二、分清 match、search 和 findall：re.match 只从字符串最开头匹配，中间出现也返回 None（新手最高频踩坑点！）；re.search 会扫描整个字符串找第一处匹配；re.findall 一次性找出所有非重叠匹配；\n三、循环里先 re.compile(...)：把频繁使用的正则提前编译成 Pattern 对象，代码更清晰也省去重复查找缓存的开销；\n四、多用命名分组 (?P<name>...)：用 m.groupdict() 直接拿到带语义键名的字典，远比靠数字下标 m.group(1)、m.group(2) 易读且不易改坏。',
   code:`import re

LOG_RE = re.compile(r"\\[(?P<level>\\w+)\\]\\s+user=(?P<user>\\w+)\\s+cost=(?P<ms>\\d+)ms")
line = "2026-06-01 [WARN] user=alice cost=142ms"

print("match 结果：", LOG_RE.match(line))
m = LOG_RE.search(line)
if m:
    print("命名分组：", m.groupdict())
print("全部数字：", re.findall(r"\\d+", line))`,
   explain:[
    {at:'import re',text:'导入标准库正则表达式模块 re。'},
    {at:'LOG_RE = re.compile(',text:'用原始字符串预编译正则，并用 (?P<名称>...) 定义 level、user、ms 三个命名分组。'},
    {at:'line = "2026-06-01',text:'示例日志行，注意开头是日期，不是 [WARN]。'},
    {at:'print("match 结果："',text:'因为开头不匹配模式，match 直接返回 None。'},
    {at:'m = LOG_RE.search(line)',to:'print("命名分组："',text:'search 在整行中成功找到匹配，groupdict() 返回 {\'level\': \'WARN\', \'user\': \'alice\', \'ms\': \'142\'}。'},
    {at:'print("全部数字："',text:'findall 找出字符串中所有连续数字段，返回列表 [\'2026\', \'06\', \'01\', \'142\']。'},
   ],
  },
  {
   title:'动手试试：datetime 格式化计算与 re 命名分组解析日志',
   body:'把 datetime 时区转换、时间差计算与 re 命名分组结合起来，写一个迷你日志分析脚本：解析带 UTC 时间戳的日志，转成北京时间格式化输出，并统计总耗时跨度与慢请求。',
   practice:{
    steps:[
     '新建文件 log_parse_demo.py，复制下面的代码并保存。',
     '在终端运行 py log_parse_demo.py（Mac / Linux 运行 python3 log_parse_demo.py）。',
     '对照预期输出：看看 UTC 01:15 如何转成北京时间 09:15，以及跨度分钟数和慢请求清单是否完全吻合。',
     '把慢请求阈值从 300 改成 100，再运行一次，观察输出变化。',
    ],
    expect:'09:15:00 | INFO  | ming | 45ms\n09:45:30 | WARN  | hong | 320ms\n10:15:00 | ERROR | ming | 510ms\n日志跨度：60 分钟\n慢请求： hong(320ms), ming(510ms)',
   },
   code:`from datetime import datetime, timedelta, timezone
import re

LOG_RE = re.compile(
    r"^(?P<ts>\\S+)\\s+\\[(?P<level>\\w+)\\]\\s+user=(?P<user>\\w+)\\s+cost=(?P<ms>\\d+)ms$"
)
LOGS = [
    "2026-06-01T01:15:00+00:00 [INFO] user=ming cost=45ms",
    "2026-06-01T01:45:30+00:00 [WARN] user=hong cost=320ms",
    "2026-06-01T02:15:00+00:00 [ERROR] user=ming cost=510ms",
]

cn_tz = timezone(timedelta(hours=8))
times: list[datetime] = []
slow_users: list[str] = []

for line in LOGS:
    m = LOG_RE.search(line)
    if not m:
        continue
    info = m.groupdict()
    dt = datetime.fromisoformat(info["ts"]).astimezone(cn_tz)
    times.append(dt)
    ms = int(info["ms"])
    if ms >= 300:
        slow_users.append(f"{info['user']}({ms}ms)")
    print(f"{dt.strftime('%H:%M:%S')} | {info['level']:<5} | {info['user']} | {ms}ms")

span = times[-1] - times[0]
print(f"日志跨度：{int(span.total_seconds() // 60)} 分钟")
print("慢请求：", ", ".join(slow_users))`,
   explain:[
    {at:'from datetime import',to:'import re',text:'导入时间处理和正则模块。'},
    {at:'LOG_RE = re.compile(',to:'cost=(?P<ms>',text:'预编译整行日志的命名分组正则，分别抓取时间戳、级别、用户名和耗时。'},
    {at:'LOGS = [',to:'cost=510ms",',text:'三条带 ISO 8601 UTC 时区的模拟日志。'},
    {at:'cn_tz = timezone(',to:'slow_users: list[str] = []',text:'定义东八区时区和结果收集列表。'},
    {at:'for line in LOGS:',to:'info = m.groupdict()',text:'逐行匹配，提取结构化字典。'},
    {at:'dt = datetime.fromisoformat',to:'times.append(dt)',text:'把带时区的 ISO 时间字符串直接解析成 aware datetime，并转换成北京时间。'},
    {at:'ms = int(info["ms"])',to:'| {ms}ms")',text:'筛选耗时达到 300ms 的慢请求，同时用 :<5 左对齐打印整齐的日志行。'},
    {at:'span = times[-1] - times[0]',to:'print("慢请求："',text:'两个 aware datetime 相减得到 timedelta，算出跨越的整分钟数并输出慢请求汇总。'},
   ],
  },
  {
   title:'日志 logging 与命令行解析 argparse',
   body:'写小练习时随手 print 很痛快，但真到项目上线，print 会立刻捉襟见肘：没法按重要程度开关、没有时间戳和来源模块、也很难同时写文件又发监控系统。\n一、logging 模块：把输出按严重程度分成 DEBUG < INFO < WARNING < ERROR < CRITICAL 五级，开发时开 DEBUG，线上调成 INFO 或 WARNING，一行代码都不用删。推荐习惯：① 每个模块顶部写 logger = logging.getLogger(__name__)，日志自动带上模块名；② basicConfig 只在程序主入口配一次，别在被别人导入的工具库里乱改全局配置；③ 用 %s 占位符（logger.info("处理 %s", uid)）代替 f-string，当该级别被过滤掉时连字符串拼接都省了；\n二、argparse 模块：写自动化脚本和命令行小工具时，别自己硬啃 sys.argv[1:]。用 argparse 声明参数类型、默认值和布尔开关（action="store_true"），立刻白嫖类型转换、出错提示和专业美观的 --help 帮助文档。',
   code:`import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)

parser = argparse.ArgumentParser(description="批量导入工具")
parser.add_argument("--env", default="dev", help="运行环境")
parser.add_argument("--workers", type=int, default=2, help="并发数")
parser.add_argument("--dry-run", action="store_true", help="仅演练不写入")

args = parser.parse_args(["--env", "prod", "--workers", "4", "--dry-run"])
logger.info("启动参数 env=%s workers=%d dry_run=%s", args.env, args.workers, args.dry_run)`,
   explain:[
    {at:'import argparse',to:'import logging',text:'导入命令行解析和日志模块。'},
    {at:'logging.basicConfig(',to:'logger = logging.getLogger(__name__)',text:'在入口设置日志级别和格式，并按当前模块名创建 logger。'},
    {at:'parser = argparse.ArgumentParser',to:'action="store_true"',text:'声明三个可选参数：字符串 env、自动转整数的 workers 和布尔开关 dry-run。'},
    {at:'args = parser.parse_args(',text:'演示中直接传入模拟参数列表；真实脚本里留空 parse_args() 会自动读取命令行 sys.argv。'},
    {at:'logger.info(',text:'用延迟格式化 %s / %d 输出结构化日志，若级别设为 WARNING 则不会执行格式化。'},
   ],
  },
  {
   title:'动手试试：functools、itertools 与结构化数据处理',
   body:'标准库的 functools 和 itertools 是写地道 Python 的秘密武器：@lru_cache 一行加记忆化缓存，partial 提前固定部分参数，groupby 与 islice 组合出清爽的数据流水线。注意用 itertools.groupby 前必须先按相同的 key 排好序，因为它只合并相邻的同组元素！',
   practice:{
    steps:[
     '新建文件 tools_demo.py，复制下面的代码并保存。',
     '在终端运行 py tools_demo.py（Mac / Linux 运行 python3 tools_demo.py）。',
     '对照预期输出：看看 @lru_cache 命中了多少次、partial 生成的 vip_price 如何算折后价，以及排序后 groupby 的汇总结果。',
     '试着注释掉 orders.sort(...) 那一行再运行，观察 groupby 没排序时的“分裂”现象。',
    ],
    expect:'爬 10 级台阶方案数： 89 缓存命中： 7\n按分类折后汇总： [(\'图书\', 160.0), (\'数码\', 400.0), (\'文具\', 32.0)]\n前两项： [(\'图书\', 160.0), (\'数码\', 400.0)]',
   },
   code:`from functools import lru_cache, partial
from itertools import groupby, islice

@lru_cache(maxsize=None)
def climb(n: int) -> int:
    if n <= 2:
        return n
    return climb(n - 1) + climb(n - 2)

def apply_discount(price: float, rate: float) -> float:
    return round(price * rate, 2)

vip_price = partial(apply_discount, rate=0.8)

orders = [
    ("图书", 80),
    ("数码", 300),
    ("图书", 120),
    ("数码", 200),
    ("文具", 40),
]
orders.sort(key=lambda x: x[0])

summary = [
    (cat, sum(vip_price(p) for _, p in grp))
    for cat, grp in groupby(orders, key=lambda x: x[0])
]

print("爬 10 级台阶方案数：", climb(10), "缓存命中：", climb.cache_info().hits)
print("按分类折后汇总：", summary)
print("前两项：", list(islice(summary, 2)))`,
   explain:[
    {at:'from functools import',to:'from itertools import',text:'导入缓存装饰器 lru_cache、偏函数 partial，以及迭代器工具 groupby 和 islice。'},
    {at:'@lru_cache(maxsize=None)',to:'return climb(n - 1) + climb(n - 2)',text:'递归算爬楼梯方案数；加上 @lru_cache 后重复子问题直接命中缓存，时间复杂度从指数降为线性。'},
    {at:'def apply_discount',to:'vip_price = partial(',text:'用 partial 提前绑定 8 折参数，得到一个只需传价格的新函数 vip_price。'},
    {at:'orders = [',to:'orders.sort(key=lambda x: x[0])',text:'使用 itertools.groupby 前先按分类名排序，确保同分类相邻。'},
    {at:'summary = [',to:'groupby(orders, key=lambda x: x[0])',text:'按分类分组并汇总折后总价。'},
    {at:'print("爬 10 级台阶',to:'list(islice(summary, 2)))',text:'打印递归结果、缓存命中次数、全部分类汇总以及用 islice 切片出的前两项。'},
   ],
  },
  {
   title:'Python 标准库“自带电池”地图',
   body:'Python 素有“Batteries Included（自带电池）”的美誉——很多常见需求不用装任何第三方库，标准库里早就有久经考验的方案。记住这张速查地图，动手前先想一想标准库有没有：\n一、文件与压缩：pathlib（路径）、shutil（复制/移动/打包目录）、tempfile（临时文件与目录）、zipfile / tarfile（解压缩）；\n二、数据与序列化：json、csv、sqlite3（内置轻量关系型数据库）、tomllib（Python 3.11+ 直接读 TOML 配置）、collections（Counter、defaultdict、deque）；\n三、网络与 URL：urllib.parse（拆解和拼接 URL 参数）、ipaddress（IP 与网段计算）、http.server（一行起静态测试服务）；发复杂 HTTP 请求时常用第三方库 httpx 或 requests；\n四、哈希与安全：hashlib（SHA-256 等摘要算法）、hmac（签名校验）、secrets（加密级安全随机数——生成验证码、登录令牌、重置密码链接时请务必用 secrets，不要用面向模拟抽样的 random！）；\n五、并发与系统（后续关卡深入）：threading（多线程）、multiprocessing（多进程）、concurrent.futures（线程池/进程池）、asyncio（异步协程）、subprocess（调用外部命令）。',
   code:`import hashlib
import secrets
import tomllib
from urllib.parse import parse_qs, urlparse

parsed = urlparse("https://api.example.com/search?q=python&page=2")
print("路径与参数：", parsed.path, parse_qs(parsed.query))

digest = hashlib.sha256("python".encode("utf-8")).hexdigest()[:12]
token = secrets.token_hex(8)
print("SHA256 前缀：", digest, "安全令牌长度：", len(token))

cfg = tomllib.loads('[app]\\nname = "demo"\\nport = 8000\\n')
print("解析 TOML：", cfg["app"])`,
   explain:[
    {at:'import hashlib',to:'from urllib.parse import',text:'导入标准库摘要、安全随机、TOML 解析和 URL 解析工具。'},
    {at:'parsed = urlparse(',to:'parse_qs(parsed.query))',text:'把 URL 拆出路径和查询参数字典，不用手写字符串切割。'},
    {at:'digest = hashlib.sha256',to:'安全令牌长度：", len(token))',text:'计算 UTF-8 字节串的 SHA-256 摘要，并用 secrets 生成 16 个十六进制字符的加密级随机令牌。'},
    {at:'cfg = tomllib.loads(',to:'print("解析 TOML："',text:'Python 3.11+ 内置 tomllib，无需第三方库就能直接解析 TOML 配置。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-modules-1',
   q:'在同一个进程中先后两次执行 import utils，第二次执行时 Python 会做什么？',
   options:[
    '重新从磁盘读取 utils.py 并再次执行顶层代码',
    '直接从 sys.modules 缓存取出已加载的模块对象',
    '把旧模块从内存销毁后按最新代码重新初始化',
    '触发 ModuleAlreadyLoadedError 提醒避免重复导入',
   ],
   why:[
    '模块顶层代码只会在首次导入时执行一次，二次导入不会重读磁盘。',
    '',
    '除非显式调用 importlib.reload，否则 Python 不会销毁重建已加载模块。',
    'Python 没有这个异常，多个文件重复 import 同一个模块完全正常。',
   ],
   answer:1,
   explain:'Python 会在 sys.modules 字典中缓存已加载的模块；再次 import 同名模块时直接命中缓存并复用同一模块对象，顶层代码不会重复执行。',
  },
  {
   id:'py-modules-2',
   q:'把演示或启动代码放进 if __name__ == "__main__": 里的主要作用是？',
   options:[
    '仅在直接运行该文件时执行，被导入时不误触发',
    '让函数编译成机器码从而显著提升脚本运行速度',
    '防止文件里定义的函数和类被外部其他模块导入',
    '在程序发生未捕获异常时自动重启主流程一次',
   ],
   why:[
    '',
    '这只是一条普通条件判断，不会改变执行方式或性能。',
    '顶层定义的函数和类照样可以被正常导入，它只隔离放进 if 块内的执行逻辑。',
    '它没有异常重启机制，只用于区分“直接运行”和“被导入”。',
   ],
   answer:0,
   explain:'直接运行脚本时 __name__ 为 "__main__"，被别的模块导入时 __name__ 为模块名；加上这层判断就能兼顾可运行性与可复用性。',
  },
  {
   id:'py-modules-3',
   q:'包内模块 app/sub.py 中写了相对导入 from .utils import parse，直接运行 python app/sub.py 为什么常报 ImportError？',
   options:[
    'Python 3 已移除点号开头的相对导入语法',
    '相对导入要求模块名里必须包含下划线前缀',
    '直接运行子文件不带包上下文，应改用 python -m app.sub',
    '相对导入只允许写在 __init__.py 文件里，不能写在子模块',
   ],
   why:[
    'Python 3 支持显式相对导入（. 和 ..），移除的是容易混淆的隐式相对导入。',
    '模块名是否带下划线与相对导入能否生效无关。',
    '',
    '包内任意子模块都可以写相对导入，前提是以包模块方式（-m）或被上层包导入运行。',
   ],
   answer:2,
   explain:'直接执行 python app/sub.py 时，sub.py 被当成顶层脚本 __main__，不知道自己隶属于 app 包；在项目根目录用 python -m app.sub 启动即可正确解析包内相对导入。',
  },
  {
   id:'py-modules-4',
   type:'multi',
   q:'当 a.py 和 b.py 顶层互相导入导致循环导入报错时，下面哪些化解方式合理？（多选）',
   options:[
    '把双方共同依赖的类型或函数抽到第三个公共模块',
    '把两个文件都改名为 __init__.py 放进同一个文件夹',
    '在文件顶部补写 import sys 强行清空模块缓存字典',
    '将其中一处的导入延迟到真正调用它的函数内部执行',
   ],
   why:[
    '',
    '同一个文件夹里不可能存在两个同名文件，也无法解决双向依赖。',
    '清空 sys.modules 反而会让模块反复重新加载，引发更隐蔽的状态错乱。',
    '',
   ],
   answers:[0,3],
   explain:'治理循环导入最好的办法是抽取公共依赖模块（理顺分层）；若只是个别函数互相调用，也可以把导入延迟到函数内部（纯类型注解则可放进 if TYPE_CHECKING:）。',
  },
  {
   id:'py-modules-5',
   type:'judge',
   q:'调用 re.match(r"\\d+", "abc123") 会扫描整个字符串并成功匹配到 "123"。',
   answer:false,
   explain:'re.match 只会尝试从字符串开头位置匹配，"abc123" 开头是字母所以返回 None；要扫描整个字符串应使用 re.search。',
  },
  {
   id:'py-modules-6',
   q:'在现代 Python 工程中，pyproject.toml 的核心定位是什么？',
   options:[
    '存放已下载好的第三方库源码压缩包的目录索引',
    '专门用来替代 .py 编写业务逻辑的配置型脚本文件',
    '仅在 Windows 平台生效的 Python 解释器注册表配置',
    '统一声明项目元信息、依赖约束和工具配置的现代标准文件',
   ],
   why:[
    '压缩包缓存由 pip 或 uv 自行管理，不在 pyproject.toml 里。',
    '它只是声明式 TOML 配置文件，不写业务逻辑代码。',
    'pyproject.toml 是跨平台的 PEP 621 社区通用标准。',
    '',
   ],
   answer:3,
   explain:'pyproject.toml 统一了项目名称、Python 版本、依赖列表以及 pytest/ruff 等工具配置，配合 uv、pip 等现代工具成为当前主流标准。',
  },
  {
   id:'py-modules-7',
   type:'multi',
   q:'关于 Python 中的 datetime 和时区处理，下面哪些做法值得推荐？（多选）',
   options:[
    '存储和跨服务传输时间优先采用带 UTC 时区的 aware 对象',
    '用 datetime.utcnow() 获取带 UTC 时区的当前时间对象',
    '用 timedelta 做日期加减，用 isoformat() 输出标准时间串',
    '展示给用户前再用 .astimezone(...) 转换成目标本地时区',
   ],
   why:[
    '',
    'datetime.utcnow() 返回的是无时区（naive）对象且已在 Python 3.12+ 弃用，应改用 datetime.now(timezone.utc)。',
    '',
    '',
   ],
   answers:[0,2,3],
   explain:'推荐用 datetime.now(timezone.utc) 获取带时区的 UTC 时间，统一存储和传输 ISO 8601 字符串，展示时再通过 astimezone 转成本地时区。',
  },
  {
   id:'py-modules-8',
   type:'judge',
   q:'在当前工作目录下新建一个名为 json.py 的文件后，同目录脚本里写 import json 可能会遮蔽标准库的 json 模块。',
   answer:true,
   explain:'脚本所在目录排在 sys.path 最前面，与标准库同名的本地文件会被优先命中，导致导入到自己的文件而非标准库。',
  },
  {
   id:'py-modules-9',
   q:'为什么线上服务通常用 logging 模块代替 print 来输出运行信息？',
   options:[
    'Python 在生产服务器上运行时会自动禁用 print 函数',
    '支持日志级别过滤、统一格式与灵活输出到文件或监控',
    'print 输出的内容无法包含中文字符和浮点数变量',
    'logging 可以自动修复业务代码里抛出的运行期异常',
   ],
   why:[
    'print 在任何环境都能跑，只是缺乏分级、格式和分流管理能力。',
    '',
    'print 配合 UTF-8 和 f-string 完全可以正常打印中文和各类变量。',
    'logging 只负责记录运行状态和异常堆栈，不会替程序修复逻辑错误。',
   ],
   answer:1,
   explain:'logging 具备五级日志过滤（DEBUG 到 CRITICAL）、时间戳与模块名格式、文件轮转与多渠道输出等工程能力，且无需改动业务代码即可按环境切换详细程度。',
  },
  {
   id:'py-modules-10',
   type:'fill',
   q:'在 Python 标准库中，生成用于登录会话或密码重置的安全随机令牌时，不应使用 random，而应使用标准库里的＿模块。',
   accepted:['secrets'],
   explain:'random 基于伪随机数算法，适合抽样和模拟，结果可预测；涉及安全令牌、密钥、验证码应使用基于操作系统加密随机源的 secrets 模块。',
  },
  {
   id:'py-modules-11',
   type:'short',
   q:'为什么每个 Python 项目都建议使用独立的虚拟环境（如 venv 或 uv）？并简述 pyproject.toml 与传统 requirements.txt 的主要区别。',
   reference:'不同项目往往依赖同一个第三方库的不同版本（例如旧项目要 pydantic 1.x、新项目要 2.x），装在全局环境会产生版本冲突，且容易把本机杂乱的包带到部署清单里；使用独立虚拟环境能让每个项目的依赖彻底隔离、随时重建。pyproject.toml 是现代统一配置标准，用来声明项目元信息、Python 版本、直接依赖范围以及测试/检查等工具配置；而 requirements.txt 通常是纯文本包列表（常通过 pip freeze 导出所有直接和间接依赖的精确版本），现在常由 pyproject.toml 搭配锁文件（如 uv.lock）分工替代。',
   points:[
    '说明虚拟环境解决多项目依赖版本冲突、隔离环境与便于复现',
    '说明 pyproject.toml 统一管理项目元信息、直接依赖约束和工具配置',
    '说明 requirements.txt 是平铺依赖清单，常用于固定安装版本，现代工作流多用 pyproject.toml + 锁文件分工',
   ],
   explain:'隔离环境管“安装空间”，pyproject.toml 管“人类声明的需求”，锁文件（或冻结清单）管“机器复现的精确版本”，三者各司其职。',
  },
  {
   id:'py-modules-12',
   type:'code',
   q:'写一个函数 parse_access_log(line: str) -> dict | None，使用 re.compile 和命名分组解析形如 "2026-06-01 09:30:00 GET /api/users 200" 的访问日志，返回包含 time、method、path、status（int 类型）的字典；若格式不匹配则返回 None。',
   reference:`import re

ACCESS_RE = re.compile(
    r"^(?P<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}) "
    r"(?P<method>[A-Z]+) (?P<path>\\S+) (?P<status>\\d{3})$"
)

def parse_access_log(line: str) -> dict | None:
    m = ACCESS_RE.search(line)
    if not m:
        return None
    data = m.groupdict()
    return {
        "time": data["time"],
        "method": data["method"],
        "path": data["path"],
        "status": int(data["status"]),
    }`,
   points:[
    '使用原始字符串和 re.compile 预编译正则表达式',
    '正确定义 time、method、path、status 四个命名分组 (?P<name>...)',
    '未匹配时返回 None，不抛出 AttributeError',
    '使用 groupdict() 提取结果并将 status 转换为 int',
   ],
   explain:'把 ACCESS_RE 预编译在函数外可以避免重复编译；命名分组配合 groupdict() 让字段映射一目了然，别忘了把正则提取的字符串 status 转成整数。',
  },
 ],
};
