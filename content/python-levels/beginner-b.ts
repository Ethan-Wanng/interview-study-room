import type {AiLevel} from '../journey';

// Python 入门（三）：列表、元组、字典与集合。
export const pyCollections:AiLevel={id:'py-collections',title:'列表、元组、字典与集合',summary:'list/tuple/dict/set 核心操作、切片与解包、推导式、浅拷贝陷阱与 collections 实用容器',lessons:[
 {title:'列表 list：有序可变的动态数组',body:'列表（list）是 Python 里用得最多的容器：把一串元素按顺序排在方括号 [ ] 里，随时可以增、删、改。底层类似“动态数组”，按位置取值非常快，在末尾追加元素也高效。\n核心操作记住四件事：\n一、索引与负索引：下标从 0 开始，xs[0] 是第一个；负数从后往前数，xs[-1] 就是最后一个，不用再写 xs[len(xs) - 1]；\n二、切片 xs[start:stop:step]：切出一段新列表，遵循“左闭右开”（包含 start，不含 stop）。省略 start 表示从头开始，省略 stop 表示到末尾，step 是步长；xs[::-1] 是最经典的“反转副本”写法；\n三、常用增删方法：append(x) 在末尾塞进一个元素，extend(iterable) 把另一串元素逐个拼到末尾，insert(i, x) 在指定位置插入，pop() 默认弹出并返回最后一个（也可传下标 pop(i)）；\n四、sort() 和 sorted() 的区别：xs.sort() 是“原地排序”，直接修改原列表本身，返回值是 None！千万别写 ys = xs.sort()，那会让 ys 变成 None；想要不改动原列表而拿到一个排好序的新列表，用内置函数 sorted(xs)。',code:`nums = [30, 10, 40, 20]
nums.append(50)
nums.extend([60, 70])
nums.insert(1, 15)
last = nums.pop()

part = nums[1:4]
rev = nums[::-1]

asc = sorted(nums)
ret = nums.sort()
print(part, rev, asc, ret, nums)`,explain:[{at:'nums = [30, 10, 40, 20]',text:'创建一个包含 4 个整数的列表，按放入顺序保存。'},{at:'nums.append(50)',text:'在列表末尾追加单个元素 50，列表变为 [30, 10, 40, 20, 50]。'},{at:'nums.extend([60, 70])',text:'把 [60, 70] 里的元素逐个展开追加到末尾；如果误用 append([60, 70])，会把整个子列表当成一个元素放进去。'},{at:'nums.insert(1, 15)',text:'在下标 1 的位置插入 15，原本下标 1 及后面的元素依次往右挪一位。'},{at:'last = nums.pop()',text:'弹出并返回末尾元素 70 赋给 last，原列表同步变短。'},{at:'part = nums[1:4]',text:'左闭右开切片，取下标 1、2、3 这三个元素，生成新列表，不改变原列表。'},{at:'rev = nums[::-1]',text:'步长为 -1 表示从后往前切，得到一份反转后的新列表副本。'},{at:'asc = sorted(nums)',text:'内置函数 sorted 返回排序后的新列表，nums 原顺序保持不变。'},{at:'ret = nums.sort()',text:'list.sort() 原地把 nums 排好序，但返回值是 None，所以 ret 的值是 None。'},{at:'print(part, rev, asc, ret, nums)',text:'打印切片、反转副本、sorted 结果、sort() 的返回值 None 以及原地排序后的 nums。'}]},
 {title:'列表复制与浅拷贝陷阱',body:'在 Python 里，变量名更像是贴在对象上的“便利贴”（引用），而不是装数据的盒子。理解这一点，就能避开新手最常踩的三个列表复制坑：\n一、直接赋值 b = a 根本没有复制：只是给同一个列表多贴了一张标签 b，改 b[0] 时 a[0] 也会跟着变；\n二、a.copy()、a[:] 和 list(a) 都是“浅拷贝”（shallow copy）：它们只复制最外层列表。如果列表里装的是整数、字符串这类不可变值，浅拷贝完全够用；但如果列表里嵌套了子列表，内外层分开、子列表仍然共享同一份引用——往 b[0] 里 append 元素，a[0] 同样会被改掉！\n三、经典乘法陷阱 [[0] * 3] * 3：写棋盘或二维表格时，很多人图省事写 [[0] * 3] * 3，结果外层的 * 3 只是把同一个内层列表的引用重复放了 3 遍！改 grid[0][0] = 1，三行第一列会一起变成 1。正确写法是用列表推导式 [[0] * 3 for _ in range(3)]，让每一行都新建独立列表；\n四、嵌套结构要彻底互不干扰，用标准库的 copy.deepcopy(a) 做深拷贝。',code:`import copy

a = [[1, 2], [3, 4]]
alias = a
shallow = a.copy()
deep = copy.deepcopy(a)

a[0].append(99)
print(alias[0], shallow[0], deep[0])

bad = [[0] * 3] * 3
bad[0][0] = 1
good = [[0] * 3 for _ in range(3)]
good[0][0] = 1`,explain:[{at:'import copy',text:'导入标准库 copy 模块，下面要用它的 deepcopy 函数做深拷贝。'},{at:'a = [[1, 2], [3, 4]]',text:'创建一个嵌套列表：外层列表里装了两个内层子列表。'},{at:'alias = a',text:'没有创建任何新列表，alias 和 a 指向内存里的同一个对象。'},{at:'shallow = a.copy()',text:'浅拷贝：外层列表是新建的，但 shallow[0] 和 a[0] 指向同一个内层子列表 [1, 2]。'},{at:'deep = copy.deepcopy(a)',text:'深拷贝：连同内部嵌套的子列表一起递归复制，与原列表彻底独立。'},{at:'a[0].append(99)',text:'原地修改第一个内层子列表，追加 99。'},{at:'print(alias[0], shallow[0], deep[0])',text:'alias[0] 和 shallow[0] 都变成了 [1, 2, 99]，只有 deep[0] 保持原来的 [1, 2]。'},{at:'bad = [[0] * 3] * 3',text:'外层乘 3 只是复制了 3 次同一个子列表的引用，三行其实是同一行。'},{at:'bad[0][0] = 1',text:'修改第 0 行第 0 列，三行的第 0 列全部变成 1，结果是 [[1, 0, 0], [1, 0, 0], [1, 0, 0]]。'},{at:'good = [[0] * 3 for _ in range(3)]',text:'推导式每轮循环都会新建一个独立的 [0, 0, 0] 列表，三行互不共享引用。'},{at:'good[0][0] = 1',text:'只改到第 0 行第 0 列，另外两行依然是 [0, 0, 0]。'}]},
 {title:'元组 tuple 与序列解包',body:'元组（tuple）用圆括号 ( ) 表示，可以把它看成“创建后不能增删改的列表”。\n使用元组要注意四个要点：\n一、单元素元组必须带尾逗号：(42,) 才是只有一个元素的元组；写成 (42) 时，圆括号只起数学分组作用，得到的还是整数 42！空元组则写成 ()；\n二、为什么需要“不能改”的元组？首先它天然防误改，适合表示坐标 (x, y)、颜色 (255, 128, 0) 这类固定结构的记录；其次只要元组里的元素都不可变，它就是“可哈希”的，能当字典的键或放进集合（列表不行）；最后 Python 函数返回多个值时，本质上就是打包返回一个元组；\n三、序列解包（unpacking）：可以把元组或列表里的元素一次拆给多个变量，比如 x, y = point；交换两个变量也不需要临时变量，直接写 a, b = b, a；\n四、星号解包：变量个数少于元素个数时，在某个变量前加 *（只能有一个带 * 的变量），比如 first, *middle, last = seq，带星号的变量会收拢中间剩下的所有元素，结果一定是 list（哪怕剩 0 个也是空列表 []）。',code:`point = (3, 4)
single = (42,)
not_tuple = (42)

x, y = point
x, y = y, x

first, *middle, last = [10, 20, 30, 40, 50]
head, *rest = (1,)
print(type(single).__name__, type(not_tuple).__name__)
print(x, y, first, middle, last, head, rest)`,explain:[{at:'point = (3, 4)',text:'创建一个包含两个整数的元组，表示坐标 (3, 4)；之后不能执行 point[0] = 9。'},{at:'single = (42,)',text:'逗号才是构成元组的关键，(42,) 是长度为 1 的元组。'},{at:'not_tuple = (42)',text:'没有逗号，圆括号只是普通括号，not_tuple 的类型是 int，不是 tuple。'},{at:'x, y = point',text:'序列解包：把元组的两个元素按顺序分别赋给 x 和 y。'},{at:'x, y = y, x',text:'Python 风格的交换变量：右边先打包成临时元组 (y, x)，再解包回 x, y。'},{at:'first, *middle, last = [10, 20, 30, 40, 50]',text:'星号解包：first 得 10，last 得 50，middle 接住中间其余元素组成列表 [20, 30, 40]。'},{at:'head, *rest = (1,)',text:'当剩余元素为 0 个时，带星号的 rest 会得到空列表 []，不会报错。'},{at:'print(type(single).__name__',text:'打印两个变量的类型名，分别是 tuple 和 int，一眼看出尾逗号的差别。'},{at:'print(x, y, first',text:'打印交换后的 x、y 以及星号解包的各个变量。'}]},
 {title:'动手试试：列表切片、解包与避开浅拷贝陷阱',body:'把列表切片、sorted()、星号解包、[[0] * 3] * 3 陷阱以及浅拷贝/深拷贝的对比放在一个脚本里亲手跑一遍，亲眼看看共享引用是怎么“牵一发而动全身”的。',practice:{steps:['确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac/Linux 可能是 python3 --version，Windows 也可以用 py --version），看到 3.10 或更高版本就行。','新建一个文件夹（例如 py-try），在里面用编辑器（比如 VS Code）新建文件 list_tuple_demo.py，把下面的代码粘贴进去并保存。','在终端里进入该文件夹，运行 python list_tuple_demo.py（Mac/Linux 用 python3 list_tuple_demo.py），核对输出是否与下方完全一致。','做个小实验：在文件末尾加上 scores.sort() 并打印 scores，对比前面 sorted(scores) 的效果；再试试把 (42,) 改成 (42)，用 type() 打印它的类型。'],expect:'切片 [1:4]： [95, 88, 60]\n反转副本： [91, 60, 88, 95, 72]\nsorted 不改原列表： [60, 72, 88, 91, 95] 原列表： [72, 95, 88, 60, 91]\n解包： 72 [95, 88, 60] 91\n乘法建表踩坑： [[9, 0, 0], [9, 0, 0], [9, 0, 0]]\n推导式建表： [[9, 0, 0], [0, 0, 0], [0, 0, 0]]\n浅拷贝受影响： [[1, 2, 99], [3, 4]]\n深拷贝不受影响： [[1, 2], [3, 4]]'},code:`import copy

scores = [72, 95, 88, 60, 91]
print("切片 [1:4]：", scores[1:4])
print("反转副本：", scores[::-1])
print("sorted 不改原列表：", sorted(scores), "原列表：", scores)

first, *middle, last = scores
print("解包：", first, middle, last)

bad = [[0] * 3] * 3
bad[0][0] = 9
print("乘法建表踩坑：", bad)

good = [[0] * 3 for _ in range(3)]
good[0][0] = 9
print("推导式建表：", good)

nested = [[1, 2], [3, 4]]
shallow = nested.copy()
deep = copy.deepcopy(nested)
nested[0].append(99)
print("浅拷贝受影响：", shallow)
print("深拷贝不受影响：", deep)`,explain:[{at:'import copy',text:'引入 copy 标准库，用于后面的深拷贝对比。'},{at:'scores = [72, 95, 88, 60, 91]',text:'定义 5 个分数组成的列表。'},{at:'print("切片 [1:4]："',text:'切出下标 1、2、3 的三个分数 [95, 88, 60]。'},{at:'print("反转副本："',text:'步长 -1 生成反转列表，原 scores 不受影响。'},{at:'print("sorted 不改原列表："',text:'sorted(scores) 返回升序新列表，原 scores 依然保持 [72, 95, 88, 60, 91]。'},{at:'first, *middle, last = scores',text:'星号解包首尾元素，中间三个分数打包成列表 middle。'},{at:'print("解包："',text:'打印首元素、中间列表和尾元素。'},{at:'bad = [[0] * 3] * 3',to:'print("乘法建表踩坑："',text:'演示外层乘 3 复用同一个内层列表：改 bad[0][0] 会让三行第一列一起变成 9。'},{at:'good = [[0] * 3 for _ in range(3)]',to:'print("推导式建表："',text:'推导式每次创建新子列表，改 good[0][0] 只影响第一行。'},{at:'nested = [[1, 2], [3, 4]]',to:'deep = copy.deepcopy(nested)',text:'分别对嵌套列表做浅拷贝和深拷贝。'},{at:'nested[0].append(99)',text:'修改原列表第一个子列表的内容。'},{at:'print("浅拷贝受影响："',to:'print("深拷贝不受影响："',text:'浅拷贝因为共享内层子列表而跟着出现 99，深拷贝完全不受影响。'}]},
 {title:'字典 dict：O(1) 哈希查找与键值对操作',body:'字典（dict）把数据存成“键: 值”（key: value）配对，底层是哈希表，按 key 查找、新增、删除平均都是 O(1) 常数时间——哪怕存了十万条记录也能瞬间找到。\n掌握字典的五个高频特性：\n一、有序性：从 Python 3.7 起，语言规范正式保证字典按“键的插入顺序”保存和遍历；\n二、键必须可哈希（hashable）：通常是不可变对象，如 str、int、float 和只含不可变元素的 tuple；list、dict、set 因为可变而不能当键，否则会报 TypeError: unhashable type；\n三、安全读取 d.get(k, default)：直接用 d[k] 在键不存在时会抛出 KeyError；用 d.get(k, default) 则在找不到时优雅返回默认值（不传 default 时返回 None），不会报错；\n四、setdefault(k, default)：键存在时直接返回旧值，不存在时先把 k: default 写进字典再返回该值，常用来初始化分组列表；\n五、合并与视图：Python 3.9+ 可以用合并运算符 c = a | b 生成合并后的新字典（两边有同名键时，右边覆盖左边），用 a |= b 原地合并；遍历时常用 d.keys()、d.values() 和 d.items()（最常配合 for k, v in d.items()）。',code:`user = {"name": "小安", "role": "dev"}
city = user.get("city", "未知")

groups = {}
groups.setdefault("py", []).append("list")
groups.setdefault("py", []).append("dict")

base = {"host": "localhost", "port": 8000}
extra = {"port": 9000, "debug": True}
merged = base | extra

for k, v in merged.items():
    print(f"{k}={v}")
print(city, list(merged.keys()), list(merged.values()), groups)`,explain:[{at:'user = {"name": "小安", "role": "dev"}',text:'用花括号和键值对字面量创建字典。'},{at:'city = user.get("city", "未知")',text:'"city" 不在 user 里，get() 不报错，直接返回指定的默认值 "未知"。'},{at:'groups = {}',text:'创建空字典，准备演示 setdefault。'},{at:'groups.setdefault("py", []).append("list")',text:'"py" 原本不在 groups 中，setdefault 先放入 "py": [] 再返回这个列表，紧接着 append("list")。'},{at:'groups.setdefault("py", []).append("dict")',text:'"py" 已经存在，setdefault 直接返回已有列表，把 "dict" 追加进去。'},{at:'base = {"host": "localhost", "port": 8000}',to:'extra = {"port": 9000, "debug": True}',text:'准备两个配置字典，都有 "port" 键。'},{at:'merged = base | extra',text:'用 | 合并生成新字典，同名键 "port" 取右边 extra 的 9000，原字典 base 和 extra 都不变。'},{at:'for k, v in merged.items():',to:'print(f"{k}={v}")',text:'items() 每次产出一个 (键, 值) 元组，配合解包同时拿到 k 和 v，且按插入顺序遍历。'},{at:'print(city, list(merged.keys())',text:'keys() 和 values() 返回动态视图，转成 list 方便查看全部键和全部值。'}]},
 {title:'集合 set：自动去重与数学集合运算',body:'集合（set）就像“只存键、不存值的字典”：元素不重复、无固定顺序，且每个元素都必须可哈希。\n为什么实战里经常专门把列表转成集合？\n一、自动去重：set([1, 2, 2, 3]) 一行就去掉重复项；\n二、O(1) 成员检查：判断 x in s 平均只需 O(1) 哈希查找；而在大列表里写 x in my_list 要从头扫到尾（O(n)），循环里查几万次时差距能达到成百上千倍；\n三、空集合的经典坑：千万不要写 s = {}，花括号留空在 Python 里是空字典 dict！创建空集合必须明确写 s = set()；\n四、数学集合运算：交集 a & b（两边都有）、并集 a | b（合并去重）、差集 a - b（a 有但 b 没有）、对称差 a ^ b（只属于其中一方，不含公共部分）。增删单个元素用 add(x) 和 discard(x)（discard 删不存在的元素也不会报错，比 remove 更安全）。',code:`empty_set = set()
empty_dict = {}

nums = [3, 1, 2, 3, 2, 4]
unique = set(nums)
unique.add(5)
unique.discard(99)

a = {"py", "sql", "git"}
b = {"py", "docker", "linux"}
print("py" in a, a & b, a | b, a - b, a ^ b)
print(type(empty_set).__name__, type(empty_dict).__name__, len(unique))`,explain:[{at:'empty_set = set()',text:'创建空集合的唯一正确写法。'},{at:'empty_dict = {}',text:'空花括号创建的是空字典 dict，不是集合！'},{at:'nums = [3, 1, 2, 3, 2, 4]',to:'unique = set(nums)',text:'用 set() 对列表快速去重，得到 {1, 2, 3, 4}。'},{at:'unique.add(5)',text:'往集合里添加一个新元素 5。'},{at:'unique.discard(99)',text:'安全删除 99：元素不存在也不会抛 KeyError（若用 remove(99) 会报错）。'},{at:'a = {"py", "sql", "git"}',to:'b = {"py", "docker", "linux"}',text:'非空集合可以用花括号直接写元素（没有冒号键值对）。'},{at:'print("py" in a',text:'演示 O(1) 成员判断 in，以及交集 &、并集 |、差集 - 和对称差 ^ 四种运算。'},{at:'print(type(empty_set).__name__',text:'确认 empty_set 类型是 set、empty_dict 类型是 dict，并打印去重后元素个数。'}]},
 {title:'推导式（Comprehensions）：一行优雅构造容器',body:'推导式（Comprehension）是 Python 最具代表性的地道写法，让你用一行清晰的表达式从已有数据“筛选 + 变换”出新的列表、字典或集合，通常还比手写 for + append 略快。\n三种常用推导式：\n一、列表推导式：[表达式 for 变量 in 可迭代对象 if 条件]，例如 [x * x for x in nums if x > 0]；\n二、字典推导式：{键表达式: 值表达式 for ...}，常用于过滤字典、键值互换或批量建映射表；\n三、集合推导式：{表达式 for ...}，和列表推导式一样但换成花括号，自动完成去重。\n重要代码规范：推导式非常适合一层循环，最多到简单的两层扁平化（比如把二维列表展平）；一旦嵌套超过两层，或者里面塞了复杂的条件分支与副作用（比如在推导式里调用 print），可读性会断崖式下降——这时老老实实写普通 for 循环反而更专业。',code:`nums = [-2, 1, 3, -4, 5]
squares = [x * x for x in nums if x > 0]

prices = {"apple": 6, "milk": 12, "cake": 25}
discounted = {k: v * 0.8 for k, v in prices.items() if v >= 10}

words = ["Py", "go", "PY", "Rust", "go"]
normalized = {w.lower() for w in words}

matrix = [[1, 2], [3, 4]]
flat = [cell for row in matrix for cell in row]
print(squares, discounted, normalized, flat)`,explain:[{at:'nums = [-2, 1, 3, -4, 5]',to:'squares = [x * x for x in nums if x > 0]',text:'列表推导式：先用 if x > 0 过滤掉负数，再对留下的正数求平方，得到 [1, 9, 25]。'},{at:'prices = {"apple": 6, "milk": 12, "cake": 25}',to:'discounted = {k: v * 0.8 for k, v in prices.items() if v >= 10}',text:'字典推导式：只保留原价不低于 10 元的商品并打八折，得到 {"milk": 9.6, "cake": 20.0}。'},{at:'words = ["Py", "go", "PY", "Rust", "go"]',to:'normalized = {w.lower() for w in words}',text:'集合推导式：统一转小写并自动去重，得到 {"py", "go", "rust"}。'},{at:'matrix = [[1, 2], [3, 4]]',to:'flat = [cell for row in matrix for cell in row]',text:'两层推导式按外层 row 到内层 cell 的阅读顺序展平二维列表，得到 [1, 2, 3, 4]；超过两层就建议改用普通 for 循环。'},{at:'print(squares, discounted, normalized, flat)',text:'打印四种推导式的构造结果。'}]},
 {title:'动手试试：字典合并、集合运算与推导式数据处理',body:'下面脚本把字典的 | 合并、get 安全取值、集合交/差/对称差以及三种推导式串在一起。注意打印集合结果时套了 sorted()，因为集合本身无序，排序后再打印能保证每次输出顺序一致。',practice:{steps:['确认装好了 Python 3：在终端输入 python --version（或 python3 --version），确认版本不低于 3.10。','在 py-try 文件夹里新建文件 dict_set_comp.py，粘贴下面的代码并保存。','在终端运行 python dict_set_comp.py（Mac/Linux 用 python3 dict_set_comp.py），核对输出与下方预期是否逐字一致。','做个小实验：把 defaults | override 改成 override | defaults，看看 port 和 debug 的值有什么变化；再给 nums 里多加一个正数 6，观察列表和字典推导式的输出。'],expect:"合并配置： {'host': '127.0.0.1', 'port': 9000, 'debug': True}\n安全读取 timeout： 30\n交集： ['python']\n差集 a - b： ['sql', 'web']\n对称差： ['ai', 'docker', 'sql', 'web']\n正数平方： [4, 16, 25]\n字典推导式： {2: 4, 4: 16, 5: 25}\n集合去重归一化： ['go', 'py', 'sql']"},code:`defaults = {"host": "127.0.0.1", "port": 8000, "debug": False}
override = {"port": 9000, "debug": True}
config = defaults | override
print("合并配置：", config)
print("安全读取 timeout：", config.get("timeout", 30))

tags_a = {"python", "web", "sql", "web"}
tags_b = {"python", "ai", "docker"}
print("交集：", sorted(tags_a & tags_b))
print("差集 a - b：", sorted(tags_a - tags_b))
print("对称差：", sorted(tags_a ^ tags_b))

nums = [-3, 2, -1, 4, 5]
squares = [x * x for x in nums if x > 0]
square_map = {x: x * x for x in nums if x > 0}
raw_words = ["Py", "py", "SQL", "sql", "Go"]
unique_lower = sorted({w.lower() for w in raw_words})
print("正数平方：", squares)
print("字典推导式：", square_map)
print("集合去重归一化：", unique_lower)`,explain:[{at:'defaults = {"host": "127.0.0.1"',to:'config = defaults | override',text:'用 | 合并默认配置和覆盖配置，右边的 port=9000 与 debug=True 覆盖掉默认值。'},{at:'print("合并配置："',to:'print("安全读取 timeout："',text:'打印合并结果，并用 get("timeout", 30) 在键不存在时安全拿到默认值 30。'},{at:'tags_a = {"python", "web", "sql", "web"}',to:'tags_b = {"python", "ai", "docker"}',text:'创建两个标签集合，tags_a 里重复的 "web" 会自动去重。'},{at:'print("交集："',to:'print("对称差："',text:'分别求交集 &、差集 -、对称差 ^，用 sorted() 排成固定顺序方便比对输出。'},{at:'nums = [-3, 2, -1, 4, 5]',to:'square_map = {x: x * x for x in nums if x > 0}',text:'用列表推导式和字典推导式同时完成“过滤正数 + 计算平方”。'},{at:'raw_words = ["Py", "py", "SQL", "sql", "Go"]',to:'unique_lower = sorted({w.lower() for w in raw_words})',text:'先用集合推导式统一转小写并去重，再用 sorted() 排序输出。'},{at:'print("正数平方："',to:'print("集合去重归一化："',text:'依次打印三种推导式的处理结果。'}]},
 {title:'collections 宝藏三件套：Counter、defaultdict 与 deque',body:'日常写 Python 做统计、分组和队列时，千万别每次都拿普通 dict 和 list 硬写样板代码。标准库 collections 模块里有三件“神器”，装完 Python 就能直接导入：\n一、Counter（计数器）：传进任何可迭代对象，一行统计出每个元素出现次数；most_common(k) 直接拿到前 k 名；而且查一个没出现过的键会返回 0，不会抛 KeyError！\n二、defaultdict(工厂函数)：给字典指定一个默认值工厂（比如 list 或 int）。访问不存在的键时，它自动调用工厂函数创建初始值，按类分组直接写 groups[k].append(v)，省掉繁琐的 if k not in groups 判断；\n三、deque（双端队列，读作“deck”）：支持在头部和尾部都以 O(1) 常数时间进出（append / appendleft / pop / popleft）。对比普通 list：list.pop(0) 或 list.insert(0, x) 需要把后面所有元素整体搬家，时间复杂度是 O(n)，数据一大就会明显变慢！给 deque 传 maxlen=N 还能零代码实现“只保留最近 N 条”的滑动窗口。',code:`from collections import Counter, defaultdict, deque

freq = Counter(["a", "b", "a", "c", "a", "b"])
top2 = freq.most_common(2)
missing = freq["z"]

groups = defaultdict(list)
for dept, name in [("后端", "小陈"), ("算法", "小林"), ("后端", "小周")]:
    groups[dept].append(name)

q = deque(["t1", "t2"], maxlen=3)
q.append("t3")
q.append("t4")
first = q.popleft()
print(top2, missing, dict(groups), first, list(q))`,explain:[{at:'from collections import Counter, defaultdict, deque',text:'从标准库 collections 导入三大高频容器类。'},{at:'freq = Counter(["a", "b", "a", "c", "a", "b"])',text:'自动统计列表中每个字符串出现的次数，得到 Counter({"a": 3, "b": 2, "c": 1})。'},{at:'top2 = freq.most_common(2)',text:'返回频次最高的前 2 个 (元素, 次数) 元组列表：[("a", 3), ("b", 2)]。'},{at:'missing = freq["z"]',text:'Counter 查询未出现的键不会报错，而是直接返回 0。'},{at:'groups = defaultdict(list)',text:'声明一个以空列表 list 为默认工厂的字典。'},{at:'for dept, name in [("后端", "小陈")',to:'groups[dept].append(name)',text:'无需先判断 dept 是否存在，第一次访问会自动创建 [] 再 append。'},{at:'q = deque(["t1", "t2"], maxlen=3)',text:'创建最大长度为 3 的双端队列。'},{at:'q.append("t3")',to:'q.append("t4")',text:'追加 "t3" 后队列满 3 个；再追加 "t4" 时，最老的队头 "t1" 自动被挤出，留下 ["t2", "t3", "t4"]。'},{at:'first = q.popleft()',text:'以 O(1) 复杂度从队头弹出 "t2"，不像 list.pop(0) 那样需要移动后续元素。'},{at:'print(top2, missing, dict(groups), first, list(q))',text:'把 defaultdict 转成普通 dict、deque 转成 list 后统一打印查看。'}]},
 {title:'动手试试：用 Counter、defaultdict 和 deque 做文本与窗口统计',body:'把 collections 三件套放到一个实用小脚本里：统计词频榜、把记录按类别分组、用定长 deque 维护“最近 3 条用户事件”的滑动窗口。',practice:{steps:['确认装好了 Python 3：在终端输入 python --version（或 python3 --version），确认环境可用。','在 py-try 文件夹里新建文件 collections_demo.py，把下面的代码粘贴进去并保存。','在终端运行 python collections_demo.py（Mac/Linux 用 python3 collections_demo.py），核对输出是否与下方完全一致。','做个小实验：把 deque(maxlen=3) 改成 deque(maxlen=2)，看看“最近事件”列表如何变化；再往 words 里追加两个 "pear"，看看 Top 2 排行榜怎么更新。'],expect:"词频 Top 2： [('apple', 3), ('banana', 2)]\n未出现词计数： 0\n按类别分组： {'水果': ['苹果', '梨'], '蔬菜': ['番茄', '黄瓜']}\n最近 3 条事件： ['浏览', '加购', '下单']\n队头出队： 浏览 剩余： ['加购', '下单']"},code:`from collections import Counter, defaultdict, deque

words = ["apple", "banana", "apple", "pear", "banana", "apple"]
counts = Counter(words)
print("词频 Top 2：", counts.most_common(2))
print("未出现词计数：", counts["mango"])

records = [("水果", "苹果"), ("蔬菜", "番茄"), ("水果", "梨"), ("蔬菜", "黄瓜")]
groups = defaultdict(list)
for kind, name in records:
    groups[kind].append(name)
print("按类别分组：", dict(groups))

recent = deque(maxlen=3)
for event in ["登录", "浏览", "加购", "下单"]:
    recent.append(event)
print("最近 3 条事件：", list(recent))
print("队头出队：", recent.popleft(), "剩余：", list(recent))`,explain:[{at:'from collections import Counter, defaultdict, deque',text:'导入 Counter、defaultdict 和 deque。'},{at:'words = ["apple", "banana"',to:'counts = Counter(words)',text:'统计单词列表里每个词出现的次数。'},{at:'print("词频 Top 2："',to:'print("未出现词计数："',text:'打印前两名高频词，并验证查询不存在的 "mango" 返回 0 而不抛异常。'},{at:'records = [("水果", "苹果")',to:'groups = defaultdict(list)',text:'准备待分组的 (类别, 名称) 元组列表，并创建默认值为列表的字典。'},{at:'for kind, name in records:',to:'groups[kind].append(name)',text:'解包每条记录，按类别直接追加，免去手动初始化空列表。'},{at:'print("按类别分组："',text:'转成普通 dict 打印分组结果。'},{at:'recent = deque(maxlen=3)',to:'recent.append(event)',text:'逐条写入 4 个事件；因为 maxlen=3，第 4 条 "下单" 进来时最早的 "登录" 自动淘汰。'},{at:'print("最近 3 条事件："',to:'print("队头出队："',text:'打印当前窗口里的 3 条事件，再演示 O(1) 复杂度的 popleft() 从队头取出 "浏览"。'}]},
 {title:'四大容器选型速查：什么时候选谁',body:'写代码时容器选对了，逻辑会简洁一半、性能也能快上几个数量级。记住下面这张“选型对照表”：\n一、需要有序、可随时增删改、按位置索引或切片、主要在末尾追加/弹出 → 选 list（动态数组，尾插尾删 O(1)，但按值查找 x in list 和头部 pop(0) 都是 O(n)）；\n二、需要固定结构的一小组数据、防意外修改、函数返回多个值，或拿组合值当字典键 → 选 tuple（不可变、省内存、可哈希）；\n三、需要按名字/编号快速查对应信息（配置项、缓存表、索引映射） → 选 dict（哈希表，按键读写平均 O(1)，Python 3.7+ 保持插入顺序）；\n四、需要去重、频繁判断“某个元素在不在里面”，或做交/并/差集对比 → 选 set（成员检查 x in s 平均 O(1)，空集合写 set() 别写 {}）；\n五、需要从两头快速进出（队列、广度优先搜索 BFS、固定长度滑动窗口） → 选 collections.deque（两头 append/pop 都是 O(1)，彻底替代慢吞吞的 list.pop(0)）；做计数选 Counter，做分组选 defaultdict(list)。'}
],quiz:[
 {id:'py-collections-1',q:'执行 nums = [3, 1, 2]; res = nums.sort() 后，res 和 nums 的值分别是？',options:['res 是 [1, 2, 3]，nums 是 [3, 1, 2]','res 是 [1, 2, 3]，nums 是 [1, 2, 3]','res 是 None，nums 是 [1, 2, 3]','res 是 None，nums 是 [3, 1, 2]'],why:['这是内置函数 sorted(nums) 的行为，而不是 list.sort() 的行为。','list.sort() 不会返回排好序的列表副本，它的返回值是 None。','','list.sort() 会原地修改 nums，使其变为升序 [1, 2, 3]。'],answer:2,explain:'list.sort() 会原地排好原列表并返回 None；若想保留原列表并获得排序后的新列表，应使用 sorted(nums)。'},
 {id:'py-collections-2',q:'下面代码会打印什么？',code:'grid = [[0] * 3] * 3\ngrid[0][0] = 9\nprint(grid)',options:['[[9, 0, 0], [0, 0, 0], [0, 0, 0]]','[[9, 0, 0], [9, 0, 0], [9, 0, 0]]','[[9, 9, 9], [0, 0, 0], [0, 0, 0]]','[[9, 9, 9], [9, 9, 9], [9, 9, 9]]'],why:['只有用 [[0] * 3 for _ in range(3)] 创建独立行时才会得到这个结果。','','内层 [0] * 3 复制的是不可变整数 0，改 [0][0] 不会影响同一行的 [0][1] 和 [0][2]。','同一行里的 0 互相独立，被共享引用的是三个外层子列表而非列元素。'],answer:1,explain:'外层的 * 3 把同一个内层列表的引用重复了三次，三行指向同一份列表对象，修改第 0 行第 0 列会让三行第 0 列同时变成 9。'},
 {id:'py-collections-3',type:'multi',q:'下面关于元组（tuple）和序列解包的说法，哪些是正确的？（多选）',options:['t = (42,) 会创建一个单元素元组','t = (42) 会创建一个单元素元组','a, *mid, b = [1, 2, 3, 4] 中 mid 是 [2, 3]','元组可用 t[0] = 99 原地修改首元素'],why:['','不带尾逗号的 (42) 只是括号分组，类型是整数 int。','','元组是不可变序列，给下标重新赋值会抛出 TypeError。'],answers:[0,2],explain:'单元素元组必须加尾逗号 (42,)；星号解包会把中间剩余元素收集为 list；元组创建后不可原地修改。'},
 {id:'py-collections-4',type:'judge',q:'在 Python 中，执行 s = {} 可以创建一个空集合（set）。',answer:false,explain:'{} 创建的是空字典 dict；创建空集合必须使用 set()。'},
 {id:'py-collections-5',q:'下面哪个对象可以作为 Python 字典（dict）的键？',options:['(1, "ok")','[1, "ok"]','{"k": 1}','{1, 2}'],why:['','列表 list 是可变对象、不可哈希，作键会抛 TypeError。','字典 dict 是可变对象、不可哈希，不能作为字典的键。','集合 set 是可变对象、不可哈希，不能作为字典的键。'],answer:0,explain:'字典的键必须可哈希（hashable）。只包含不可变元素的元组 (1, "ok") 可哈希，而 list、dict、set 均不可哈希。'},
 {id:'py-collections-6',type:'fill',q:'想安全读取字典 user 中键 "city" 的值，键不存在时返回默认值 "未知" 而不抛 KeyError，应调用字典的 ＿ 方法（只填方法名）。',accepted:['get','.get','get()'],explain:'user.get("city", "未知") 在键缺失时返回第二个参数指定的默认值，不传默认值则返回 None。'},
 {id:'py-collections-7',q:'下面切片表达式的结果是？',code:'nums = [0, 1, 2, 3, 4, 5]\nprint(nums[1:5:2])',options:['[1, 2, 3, 4]','[1, 3, 5]','[0, 2, 4]','[1, 3]'],why:['忽略了步长 2，[1:5] 才会返回 [1, 2, 3, 4]。','切片是左闭右开，不包含 stop 处的下标 5，所以不会取到 5。','起点 start 是 1 而不是 0，[0:5:2] 才会得到 [0, 2, 4]。',''],answer:3,explain:'nums[1:5:2] 从下标 1 开始、到下标 5 之前（不含 5）、步长为 2，依次取下标 1 和 3，结果是 [1, 3]。'},
 {id:'py-collections-8',q:'在 Python 3.9+ 中，执行下方代码后 c 的内容是？',code:'a = {"x": 1, "y": 2}\nb = {"y": 20, "z": 3}\nc = a | b',options:['{"x": 1, "y": 2, "z": 3}','{"x": 1, "y": 20, "z": 3}','{"x": 1, "y": 22, "z": 3}','{"y": 20, "z": 3}'],why:['同名键 "y" 冲突时，运算符右侧的字典会覆盖左侧，不是保留左侧。','','字典合并 | 不会把数值相加，而是用右侧的值直接覆盖左侧。','合并会保留左侧独有的键 "x"，不会只剩下右侧字典的内容。'],answer:1,explain:'字典合并运算符 a | b 返回新字典，包含双方全部键，遇到同名键时右侧 b 的值（20）覆盖左侧 a 的值（2）。'},
 {id:'py-collections-9',type:'multi',q:'下面哪些操作的平均时间复杂度是 O(1)？（多选）',options:['在集合中判断 x in my_set','用 deque.popleft() 弹出队头','用 list.pop(0) 弹出队头','按指定键读取字典 d[key]'],why:['','','list.pop(0) 弹出首元素后，后面所有元素都要向左挪动一位，时间复杂度是 O(n)。',''],answers:[0,1,3],explain:'set 和 dict 基于哈希表，成员查找和按键读取平均 O(1)；deque 是双端队列，两头增删均 O(1)；而 list.pop(0) 需要移动后续元素，是 O(n)。'},
 {id:'py-collections-10',type:'judge',q:'对二维列表 a = [[1, 2], [3, 4]] 执行 b = a.copy() 后，再执行 b[0].append(99)，a[0] 的内容也会跟着变成 [1, 2, 99]。',answer:true,explain:'a.copy() 是浅拷贝，只复制了外层列表，b[0] 与 a[0] 仍指向同一个内层列表对象；需要彻底隔离时应使用 copy.deepcopy(a)。'},
 {id:'py-collections-11',q:'已知集合 a = {1, 2, 3}、b = {2, 3, 4}，表达式 a ^ b 的结果是？',options:['{2, 3}','{1, 2, 3, 4}','{1, 4}','{1}'],why:['{2, 3} 是交集 a & b 的结果。','{1, 2, 3, 4} 是并集 a | b 的结果。','','{1} 是差集 a - b 的结果。'],answer:2,explain:'^ 是集合对称差运算，返回只出现在 a 或只出现在 b 中的元素（去掉公共部分 {2, 3}），即 {1, 4}。'},
 {id:'py-collections-12',type:'fill',q:'想统计列表中各元素出现次数并直接取频次最高的前 k 项，通常从 collections 模块导入 ＿ 类。',accepted:['Counter','collections.Counter'],explain:'collections.Counter 专为频次统计设计，自带 most_common(k) 方法，且查询缺失键时返回 0。'},
 {id:'py-collections-13',type:'short',q:'请说明对嵌套列表 a = [[1, 2], [3, 4]] 执行 b = a、b = a.copy() 和 b = copy.deepcopy(a) 的区别，并解释为什么 [[0] * 3] * 3 是常见陷阱、应如何正确初始化二维列表。',reference:'1. b = a 不创建新对象，只是给同一个列表贴上新标签，增删外层或内层元素双方都会变化。\n2. b = a.copy() 是浅拷贝，新建了外层列表，往 b 外层 append 不会影响 a，但内层子列表仍然共享引用，修改 b[0] 会同步改到 a[0]。\n3. b = copy.deepcopy(a) 是深拷贝，会递归复制外层和所有嵌套子列表，a 与 b 彻底互不干扰。\n4. [[0] * 3] * 3 的外层 * 3 只是把同一个内层子列表的引用重复了 3 遍，修改任意一行的元素会导致三行同步改变；正确写法是用列表推导式 [[0] * 3 for _ in range(3)]，让每一行都生成独立的列表对象。',points:['说明 b = a 仅共享同一个列表引用（别名）','说明 a.copy() 浅拷贝新建外层但内层仍共享引用','说明 copy.deepcopy(a) 递归复制实现完全隔离','解释 [[0] * 3] * 3 共享同一子列表引用，并给出推导式 [[0] * 3 for _ in range(3)] 的正确写法'],explain:'理解“变量是对象引用”和浅/深拷贝边界，是写出无意外副作用 Python 代码的关键。'},
 {id:'py-collections-14',type:'code',q:'给定列表 words = ["apple", "banana", "apple", "pear", "banana", "apple", "kiwi"]，写一段 Python 代码完成三件事：\n1. 用 collections.Counter 统计词频，打印出现次数最多的前 2 个词（most_common(2)）；\n2. 用集合推导式选出长度大于 4 的不重复单词集合并打印；\n3. 用 collections.defaultdict(list) 按首字母把去重后的单词分组，转成普通 dict 打印。',reference:'from collections import Counter, defaultdict\n\nwords = ["apple", "banana", "apple", "pear", "banana", "apple", "kiwi"]\n\ntop2 = Counter(words).most_common(2)\nprint("Top 2:", top2)\n\nlong_words = {w for w in words if len(w) > 4}\nprint("长度>4:", long_words)\n\ngroups = defaultdict(list)\nfor w in sorted(set(words)):\n    groups[w[0]].append(w)\nprint("按首字母分组:", dict(groups))',points:['导入并使用 Counter(words).most_common(2) 统计并输出前 2 名','使用集合推导式 {w for w in words if len(w) > 4} 过滤长度大于 4 的单词','使用 defaultdict(list) 按首字母 w[0] 对去重后的单词分组','将分组结果转为 dict 打印且代码无语法错误'],explain:'Counter 省去手动计数循环，集合推导式一步完成筛选与去重，defaultdict(list) 省去键不存在时的空列表初始化判断。'}
]};

// Python 入门（四）：函数、参数传递与作用域。
export const pyFunctions:AiLevel={id:'py-functions',title:'函数、参数传递与作用域',summary:'def 与多返回值、默认参数陷阱、*args/**kwargs、按对象引用传递、LEGB 作用域与 lambda/闭包基础',lessons:[
 {title:'定义函数 def 与返回值',body:'函数把一段可复用的逻辑装进一个带名字的“积木块”，在 Python 里用 def 关键字定义。\n写好函数先记住三件事：\n一、文档字符串（docstring）：紧跟在 def 下一行用三引号 """...""" 写一句简短说明，它不只是注释，会被 Python 存到函数的 __doc__ 属性里，help(函数名) 和编辑器悬停提示都会自动显示它；\n二、没有 return 时返回 None：如果函数体里没写 return，或者只写了一个光秃秃的 return，函数执行完会自动返回 None；\n三、多返回值其实是元组：写 return lo, hi 看起来像返回了两个值，本质上是 Python 把它们打包成一个元组 (lo, hi) 返回；调用方配合解包 low, high = min_max(nums) 接住，既清爽又地道。',code:`def min_max(nums):
    """返回非空序列中的最小值和最大值。"""
    return min(nums), max(nums)

def greet(name):
    print(f"你好，{name}！")

low, high = min_max([8, 3, 15, 6])
result = greet("小安")
print(low, high, result, min_max.__doc__)`,explain:[{at:'def min_max(nums):',text:'用 def 定义函数 min_max，接收一个参数 nums。'},{at:'"""返回非空序列中的最小值和最大值。"""',text:'紧跟函数头的三引号字符串就是文档字符串（docstring），方便人读也能被工具提取。'},{at:'return min(nums), max(nums)',text:'逗号把两个结果打包成一个二元元组 (min, max) 返回。'},{at:'def greet(name):',to:'print(f"你好，{name}！")',text:'只打印不写 return 的函数，执行结束后默认返回 None。'},{at:'low, high = min_max([8, 3, 15, 6])',text:'调用函数并用序列解包把返回的元组拆进 low（3）和 high（15）。'},{at:'result = greet("小安")',text:'greet 没有 return 语句，所以 result 拿到的是 None。'},{at:'print(low, high, result, min_max.__doc__)',text:'打印解包结果、None 以及存放在 __doc__ 里的文档字符串。'}]},
 {title:'参数形式全解与 Python 第一大经典坑：可变默认参数',body:'调用函数时可以按顺序传“位置参数”，也可以指名道姓传“关键字参数”（比如 power(exp=3, base=2)，顺序随意且一眼能看懂含义）；定义函数时还可以给参数设默认值（有默认值的参数必须放在无默认值参数之后）。\n但这里藏着 Python 排名第一的经典大坑——把可变对象（如 [] 或 {}）当默认参数：\n很多新手会写 def add(item, box=[]):，以为每次不传 box 都会新建一个空列表。错了！Python 在执行 def 定义函数的那一刻，只会对默认值表达式求值一次，然后把这同一个列表对象存进函数里反复复用。结果第二次调用 add("B") 时，第一次放进去的 "A" 居然还在里面！\n正确写法是行业统一惯例：默认值写不可变的 None，进入函数体后再用 if box is None: box = [] 现造一个全新的列表。',code:`def power(base, exp=2):
    return base ** exp

print(power(3), power(2, 3), power(exp=4, base=2))

def add_buggy(item, box=[]):
    box.append(item)
    return box

def add_safe(item, box=None):
    if box is None:
        box = []
    box.append(item)
    return box

print(add_buggy("A"), add_buggy("B"))
print(add_safe("A"), add_safe("B"))`,explain:[{at:'def power(base, exp=2):',to:'return base ** exp',text:'exp 带默认值 2，调用时省略它就默认算平方。'},{at:'print(power(3), power(2, 3)',text:'依次演示默认参数、位置参数和关键字参数（可调换顺序）三种传参方式。'},{at:'def add_buggy(item, box=[]):',to:'return box',text:'错误示范：默认列表 [] 在 def 定义时只创建一次，所有不传 box 的调用都会共享同一个列表！'},{at:'def add_safe(item, box=None):',to:'box = []',text:'标准修复：用不可变的 None 当占位默认值，每次未传 box 时在函数内部新建独立空列表。'},{at:'box.append(item)',to:'return box',text:'往本次使用的列表里追加元素并返回，不影响其他调用。'},{at:'print(add_buggy("A"), add_buggy("B"))',text:'两次调用共用同一列表，最终打印出两个 ["A", "B"]（因为先算完两个实参再一起 print）。'},{at:'print(add_safe("A"), add_safe("B"))',text:'两次调用各自新建列表，干净地打印出 ["A"] 和 ["B"]。'}]},
 {title:'动手试试：观察可变默认参数陷阱并修复它',body:'亲手跑一遍出错版 add_bad 和修复版 add_good，看看“同一个默认列表被跨调用偷偷累积”到底长什么样，并确认传入已有列表时 add_good 依然能正常工作。',practice:{steps:['确认装好了 Python 3：在终端输入 python --version（或 python3 --version），确认环境正常。','在 py-try 文件夹里新建文件 default_arg_trap.py，粘贴下面的代码并保存。','在终端运行 python default_arg_trap.py（Mac/Linux 用 python3 default_arg_trap.py），核对每一行输出是否与预期一致。','做个小实验：在文件末尾加上 print(add_bad.__defaults__)，看看 Python 把那个被污染的默认列表藏在了哪里。'],expect:"踩坑第 1 次： ['苹果']\n踩坑第 2 次： ['苹果', '香蕉']\n修复第 1 次： ['苹果']\n修复第 2 次： ['香蕉']\n传入已有列表： ['橙子', '葡萄']"},code:`def add_bad(item, box=[]):
    box.append(item)
    return box

def add_good(item, box=None):
    if box is None:
        box = []
    box.append(item)
    return box

print("踩坑第 1 次：", add_bad("苹果"))
print("踩坑第 2 次：", add_bad("香蕉"))

print("修复第 1 次：", add_good("苹果"))
print("修复第 2 次：", add_good("香蕉"))

basket = ["橙子"]
print("传入已有列表：", add_good("葡萄", basket))`,explain:[{at:'def add_bad(item, box=[]):',to:'return box',text:'把可变列表 [] 设为默认值：每次未传 box 时都在往同一个列表里追加。'},{at:'def add_good(item, box=None):',to:'box = []',text:'用 None 作为哨兵值，只有调用方没传 box 时才新建空列表。'},{at:'box.append(item)',to:'return box',text:'向目标列表追加 item 并返回该列表。'},{at:'print("踩坑第 1 次："',to:'print("踩坑第 2 次："',text:'第 1 次打印 ["苹果"]，第 2 次因为复用了旧列表变成 ["苹果", "香蕉"]。'},{at:'print("修复第 1 次："',to:'print("修复第 2 次："',text:'修复后两次调用互不干扰，分别得到 ["苹果"] 和 ["香蕉"]。'},{at:'basket = ["橙子"]',to:'print("传入已有列表："',text:'显式传入已有的 basket 时，box is None 为假，直接往 basket 里追加 "葡萄"。'}]},
 {title:'可变参数 *args、**kwargs 与参数限定 / 和 *',body:'当你希望函数能接住数量不固定的参数，或者想把函数接口设计得更防呆，Python 提供了两套极好用的语法：\n一、收集多余参数：形参里的 *args 会把所有多余的位置参数收进一个元组（tuple）；**kwargs 会把所有多余的关键字参数收进一个字典（dict）。名字叫 args 和 kwargs 只是社区习惯，真正起作用的是前面的 * 和 **；\n二、调用时反向解包：调用函数时也能用 *seq 把列表/元组拆成位置参数，用 **mapping 把字典拆成关键字参数传进去；\n三、用 / 和 * 限定传参方式（Python 3.8+）：\n  · 写在 / 左边的参数是“仅位置参数”（positional-only），调用时不能写参数名，适合参数名没语义或避免与 **kwargs 里的键撞名；\n  · 写在 * 右边的参数是“仅关键字参数”（keyword-only），调用时必须写参数名（比如 timeout=5），特别适合开关项和可选配置，让调用代码读起来一目了然！\n完整参数书写顺序是：仅位置参数, /, 普通参数, *args, 仅关键字参数, **kwargs。',code:`def fetch(url, /, *headers, timeout=5, **params):
    return url, headers, timeout, params

res1 = fetch("https://api.test", "Auth:1", timeout=10, page=2)

args = ("https://api.test", "Accept:json")
opts = {"timeout": 3, "limit": 20}
res2 = fetch(*args, **opts)
print(res1)
print(res2)`,explain:[{at:'def fetch(url, /, *headers, timeout=5, **params):',text:'url 在 / 左边，只能按位置传；*headers 收集其余位置参数成元组；timeout 在 *headers 后面成为仅关键字参数；**params 收集其余关键字参数成字典。'},{at:'return url, headers, timeout, params',text:'把四类参数打包成元组返回，方便观察各自收到了什么。'},{at:'res1 = fetch("https://api.test", "Auth:1", timeout=10, page=2)',text:'"https://api.test" 进 url，"Auth:1" 进 headers 元组，timeout=10 匹配仅关键字参数，page=2 进 params 字典。'},{at:'args = ("https://api.test", "Accept:json")',to:'opts = {"timeout": 3, "limit": 20}',text:'准备待解包的位置参数元组和关键字参数字典。'},{at:'res2 = fetch(*args, **opts)',text:'调用时用 *args 展开成位置参数、**opts 展开成关键字参数传入。'},{at:'print(res1)',to:'print(res2)',text:'打印两次调用收到的完整参数结构。'}]},
 {title:'Python 的参数传递机制：按对象引用传递',body:'学过 C/C++ 或 Java 的人常问：Python 传参到底是“值传递”还是“引用传递”？答案是两者都不完全准确，Python 官方称之为“按对象引用传递”（Call by Object Reference，也叫按共享传递 Call by Sharing）。\n用“标签贴对象”的画面秒懂它的全部行为：\n一、调用函数时，Python 不会拷贝实参对象本身，而是把形参这个新标签也贴到同一个对象上；\n二、如果你在函数里对形参“重新赋值”（比如 n = n + 1 或 items = [99]），只是把形参标签撕下来贴到了新对象上，函数外面原来的变量依然贴在旧对象上，毫发无损！整数、字符串、元组因为本身不可变，所以传进函数里绝不可能被修改；\n三、如果你在函数里对“可变对象”（如 list、dict）做原地修改（比如 items.append(4) 或 d["k"] = 1），修改的是两个标签共同指着的那份对象本身，函数外面的变量立刻就能看到变化！\n好习惯：如果函数不打算改动调用方传入的列表或字典，先做一份拷贝（如 items = list(items)）再操作，或者清晰地在文档字符串里说明“会原地修改”。',code:`def demo(num, items, bag):
    num = num + 10
    items.append(4)
    bag = ["replaced"]

x = 5
a = [1, 2, 3]
b = ["keep"]
demo(x, a, b)
print(x, a, b)`,explain:[{at:'def demo(num, items, bag):',text:'进入函数时，num 指向 5，items 指向列表 a，bag 指向列表 b。'},{at:'num = num + 10',text:'整数不可变，算出新对象 15 后把局部变量 num 改贴到 15，外部的 x 仍然指向 5。'},{at:'items.append(4)',text:'原地修改 items 指向的列表对象本身，所以外部的 a 也变成了 [1, 2, 3, 4]。'},{at:'bag = ["replaced"]',text:'这里是给形参 bag 重新赋值指向一个全新列表，不是原地修改，因此外部的 b 依然是 ["keep"]。'},{at:'x = 5',to:'demo(x, a, b)',text:'准备三个外部变量并传给 demo。'},{at:'print(x, a, b)',text:'打印 5 [1, 2, 3, 4] ["keep"]：只有原地修改的 a 发生了变化。'}]},
 {title:'作用域与 LEGB 查找规则',body:'程序里到处都有变量名，函数内部访问一个名字时，Python 按从内到外的固定顺序找四个“作用域”，简称 LEGB：\n一、L（Local，局部）：当前函数内部定义的变量；\n二、E（Enclosing，外层嵌套）：如果函数嵌套在另一个函数里，向外找外层函数的局部变量；\n三、G（Global，全局）：当前 .py 文件（模块）最外层定义的变量；\n四、B（Built-in，内置）：Python 自带的内置名字，比如 len、sum、print（顺便提醒：千万别给自己的变量取名叫 list 或 len，否则会遮住内置函数！）。\n一个极易踩的坑——UnboundLocalError：只“读取”全局变量可以直接读；但只要函数体内任何一行出现了对同名变量的赋值（比如 count = count + 1），Python 在编译这个函数时就会认定 count 是局部变量，运行到右边的 count 时它还没赋值，直接抛 UnboundLocalError！\n如果确实要重新绑定外层或全局变量，需要显式声明：\n· 修改外层嵌套函数（E）的变量用 nonlocal；\n· 修改模块全局（G）的变量用 global（实际工程里尽量少用 global，通过传参和返回值传递状态更易测试和维护）。',code:`x = "global"

def outer():
    x = "enclosing"
    count = 0

    def inner():
        nonlocal count
        count += 1
        return f"读到 {x}，计数={count}"

    return inner()

print(outer(), "全局仍是:", x)`,explain:[{at:'x = "global"',text:'模块顶层的全局变量（G 作用域）。'},{at:'def outer():',to:'count = 0',text:'outer 内部定义两个局部变量，对嵌套的 inner 而言它们处于外层作用域（E）。'},{at:'def inner():',text:'定义嵌套内层函数。'},{at:'nonlocal count',text:'显式声明下面的 count 指向外层 outer 的 count，而不是新建局部变量；没有这行写 count += 1 会报 UnboundLocalError。'},{at:'count += 1',text:'把外层 count 递增 1。'},{at:'return f"读到 {x}，计数={count}"',text:'inner 内没有定义 x，按 L→E→G→B 顺序在 E 层找到 "enclosing"（遮住了全局的 "global"）。'},{at:'return inner()',text:'调用 inner 并返回它的结果。'},{at:'print(outer(), "全局仍是:", x)',text:'打印 outer() 的返回值，并验证全局变量 x 未被改动。'}]},
 {title:'动手试试：*args/**kwargs、参数传递与 nonlocal 计数器',body:'把可变参数、仅关键字参数、按对象引用传递，以及用 nonlocal 记住状态的嵌套计数器放进一个脚本里跑一遍，亲眼验证每一条规则。',practice:{steps:['确认装好了 Python 3：在终端输入 python --version（或 python3 --version），确认环境可用。','在 py-try 文件夹里新建文件 args_scope_demo.py，把下面的代码粘贴进去并保存。','在终端运行 python args_scope_demo.py（Mac/Linux 用 python3 args_scope_demo.py），核对输出是否与预期完全一致。','做个小实验：把 make_counter 里的 nonlocal count 注释掉再运行，读一读 Python 抛出的 UnboundLocalError 报错信息。'],expect:"期中：平均 90.0分，附加信息={'teacher': '林老师', 'term': '春'}\n调用后： 5 [1, 2, 3, 4]\n计数： 11 16 17"},code:`def report(title, *scores, unit="分", **meta):
    avg = sum(scores) / len(scores)
    print(f"{title}：平均 {avg:.1f}{unit}，附加信息={meta}")

report("期中", 80, 90, 100, teacher="林老师", term="春")

def try_modify(num, items):
    num = num + 10
    items.append(4)

x = 5
nums = [1, 2, 3]
try_modify(x, nums)
print("调用后：", x, nums)

def make_counter(start=0):
    count = start
    def inc(delta=1):
        nonlocal count
        count += delta
        return count
    return inc

c = make_counter(10)
print("计数：", c(), c(5), c())`,explain:[{at:'def report(title, *scores, unit="分", **meta):',text:'title 是普通参数，*scores 收集所有分数成元组，unit 在 *scores 后成为仅关键字参数，**meta 收集额外信息成字典。'},{at:'avg = sum(scores) / len(scores)',to:'print(f"{title}：平均 {avg:.1f}{unit}',text:'计算平均分并用 f-string 保留 1 位小数打印出来。'},{at:'report("期中", 80, 90, 100',text:'调用 report：三个分数进 scores，未传 unit 使用默认值 "分"，teacher 和 term 进入 meta。'},{at:'def try_modify(num, items):',to:'items.append(4)',text:'对比按对象引用传递：num 重新绑定不影响外部，items 原地 append 会影响外部。'},{at:'x = 5',to:'print("调用后："',text:'调用后 x 仍是 5，nums 变成了 [1, 2, 3, 4]。'},{at:'def make_counter(start=0):',to:'return inc',text:'定义闭包工厂：内层 inc 用 nonlocal 改写外层 count，并返回 inc 函数本身（注意不带括号）。'},{at:'c = make_counter(10)',to:'print("计数："',text:'创建一个初始值为 10 的计数器 c，依次加 1、加 5、加 1，打印 11、16、17。'}]},
 {title:'函数是一等对象与 lambda 匿名函数',body:'在 Python 里，函数和整数、字符串一样都是“一等对象”（first-class object）：\n一、可以放进变量、列表或字典里（写不带括号的函数名就是引用函数本身，加括号才是调用）。把操作名映射到函数的“表驱动字典”，常常比一长串 if/elif 清爽得多；\n二、可以当参数传给别的函数（接收或返回函数的函数叫“高阶函数”），最常见的就是 sorted(..., key=...)、min/max(..., key=...)；\n三、lambda 匿名函数：语法是 lambda 参数: 单个表达式，用来临时写一个短小的一次性函数，非常适合做排序键，比如 sorted(users, key=lambda u: (-u["score"], u["name"])) 实现“先按分数降序、同分按名字升序”。\n注意边界：lambda 里只能写一个表达式，不能写多条语句、循环或赋值。只要逻辑稍微复杂一点，或者需要复用、写文档说明，就老老实实用 def 起个好名字，不要强行写成一行 lambda。',code:`def add(a, b):
    return a + b

def sub(a, b):
    return a - b

actions = {"+": add, "-": sub}
print(actions["+"](10, 4), actions["-"](10, 4))

users = [
    {"name": "Bob", "score": 90},
    {"name": "Alice", "score": 90},
    {"name": "Cara", "score": 95},
]
ranked = sorted(users, key=lambda u: (-u["score"], u["name"]))
print([u["name"] for u in ranked])`,explain:[{at:'def add(a, b):',to:'return a - b',text:'定义两个普通函数 add 和 sub。'},{at:'actions = {"+": add, "-": sub}',text:'把函数对象直接存进字典值里（不加括号），形成清晰的表驱动分发。'},{at:'print(actions["+"](10, 4)',text:'从字典取出函数对象后加括号调用，打印 14 和 6。'},{at:'users = [',to:'{"name": "Cara", "score": 95},',text:'准备用户字典列表，其中 Bob 和 Alice 同为 90 分。'},{at:'ranked = sorted(users, key=lambda u: (-u["score"], u["name"]))',text:'用 lambda 返回元组 (-分数, 名字) 作为排序键：分数取负实现降序，同分时按名字字母升序排列。'},{at:'print([u["name"] for u in ranked])',text:'按排序结果提取名字列表，打印 ["Cara", "Alice", "Bob"]。'}]},
 {title:'闭包入门与 functools.partial',body:'上一张“动手试试”里的 make_counter 其实已经用到了一个很优雅的概念——闭包（closure）。\n一、什么是闭包？当外层函数返回了内层函数，即便外层函数已经执行结束，内层函数依然“记住”了它所引用的外层局部变量（专业说法叫自由变量）。这样你就能用工厂函数按不同参数“批量生产”带专属配置的小函数，而且不用污染全局变量。预告一下：后面第 9 关讲的装饰器（@decorator），底层靠的就是闭包！\n二、循环中建闭包的小提醒：在 for 循环里创建多个 lambda 时，如果直接引用循环变量 i，它们记住的是变量本身而非当时的值；想立刻锁定当轮的值，可以写成默认参数 lambda x, k=i: x + k；\n三、functools.partial（偏函数）：如果你只是想把一个已有函数的部分参数提前“冻结”成固定值，甚至不用自己写外层闭包函数，直接用标准库的 partial(原函数, 固定参数) 就能一行造出新函数，代码更短更清晰。',code:`from functools import partial

def make_multiplier(factor):
    def mul(x):
        return x * factor
    return mul

double = make_multiplier(2)
triple = make_multiplier(3)

base2 = partial(int, base=2)
print(double(7), triple(7), base2("1010"))`,explain:[{at:'from functools import partial',text:'从标准库 functools 导入 partial，用来冻结已有函数的部分参数。'},{at:'def make_multiplier(factor):',to:'return mul',text:'闭包工厂：内层 mul 记住了外层传入的 factor，即使 make_multiplier 返回后依然有效。'},{at:'double = make_multiplier(2)',to:'triple = make_multiplier(3)',text:'造出两个各自记住不同倍数的函数对象 double 和 triple，互不干扰。'},{at:'base2 = partial(int, base=2)',text:'把内置 int 函数的 base 参数冻结为 2，一行得到专门解析二进制字符串的新函数。'},{at:'print(double(7), triple(7), base2("1010"))',text:'分别输出 14、21 和 10（二进制 1010 等于十进制 10）。'}]},
 {title:'动手试试：高阶函数、自定义排序与闭包工厂',body:'把表驱动函数字典、多条件 lambda 排序、闭包折扣工厂和 functools.partial 放在同一个脚本里跑一遍，体会 Python 函数式写法的简洁威力。',practice:{steps:['确认装好了 Python 3：在终端输入 python --version（或 python3 --version），确认环境正常。','在 py-try 文件夹里新建文件 higher_order_demo.py，把下面的代码粘贴进去并保存。','在终端运行 python higher_order_demo.py（Mac/Linux 用 python3 higher_order_demo.py），核对输出是否与下方完全一致。','做个小实验：把排序键里的 -u["score"] 改成 u["score"]，观察升序效果；再参考 parse_bin 用 partial(int, base=16) 造一个十六进制解析函数，试试解析 "ff"。'],expect:"表驱动调用： 7 12\n排序结果： [('Alice', 95), ('Bob', 95), ('Charlie', 88)]\n会员价： 80.0 200.0\n二进制转十进制： 22"},code:`from functools import partial

ops = {
    "add": lambda a, b: a + b,
    "mul": lambda a, b: a * b,
}
print("表驱动调用：", ops["add"](3, 4), ops["mul"](3, 4))

users = [
    {"name": "Bob", "score": 95},
    {"name": "Charlie", "score": 88},
    {"name": "Alice", "score": 95},
]
ranked = sorted(users, key=lambda u: (-u["score"], u["name"]))
print("排序结果：", [(u["name"], u["score"]) for u in ranked])

def make_discount(rate):
    def apply(price):
        return round(price * rate, 2)
    return apply

vip_price = make_discount(0.8)
print("会员价：", vip_price(100), vip_price(250))

parse_bin = partial(int, base=2)
print("二进制转十进制：", parse_bin("10110"))`,explain:[{at:'from functools import partial',text:'导入 partial 用于固定参数。'},{at:'ops = {',to:'print("表驱动调用："',text:'把两个简短运算放进字典 ops，按名字查表直接调用。'},{at:'users = [',to:'{"name": "Alice", "score": 95},',text:'定义三位用户，Bob 和 Alice 分数并列 95。'},{at:'ranked = sorted(users, key=lambda u: (-u["score"], u["name"]))',text:'按分数降序、同分按名字升序排序，Alice 排在 Bob 前面。'},{at:'print("排序结果："',text:'用列表推导式提取 (名字, 分数) 打印，结果更清爽。'},{at:'def make_discount(rate):',to:'return apply',text:'闭包工厂记住折扣率 rate，返回专属计价函数 apply。'},{at:'vip_price = make_discount(0.8)',to:'print("会员价："',text:'生成 8 折计价函数并分别计算 100 和 250 的折后价。'},{at:'parse_bin = partial(int, base=2)',to:'print("二进制转十进制："',text:'冻结 int 的 base=2，把二进制 "10110" 转成十进制 22。'}]},
 {title:'函数设计好习惯速查',body:'写业务代码和面试手写题时，养成下面五个习惯，你的 Python 函数会立刻显得很专业：\n一、一个函数只做一件事：取清晰的“动词+名词”函数名（如 parse_config、calc_avg），补上一行简洁的 docstring 说明输入和返回；\n二、绝不把可变对象当默认参数：需要空列表、空字典作默认值时，一律写 =None 并在函数体内初始化；\n三、可选配置和布尔开关放到 * 后面：写成 def send(msg, *, retry=3, dry_run=False):，避免调用方写出一堆让人猜不透含义的 send(msg, 3, True)；\n四、尽量用“传参 + 返回新值”代替原地修改实参和 global 全局状态：函数没有隐蔽副作用时，阅读、复用和写单元测试都会轻松得多；\n五、克制使用 lambda：只用在 key= 这类简短一次性的表达式里；一旦需要多步逻辑或起名字，果断写成 def。'}
],quiz:[
 {id:'py-functions-1',q:'在 Python 中，如果一个函数执行完没有遇到任何 return 语句，它的返回值是？',options:['整数 0','None','布尔值 False','空字符串 ""'],why:['Python 函数不会默认返回数值 0。','','没有 return 不会返回 False，虽然 None 在布尔判断里也视为假。','没有 return 不会返回空字符串。'],answer:1,explain:'Python 函数若不写 return（或只写裸的 return），会隐式返回单例对象 None。'},
 {id:'py-functions-2',q:'运行下面代码，终端会依次打印什么？',code:'def add(x, buf=[]):\n    buf.append(x)\n    return buf\n\nprint(add(1))\nprint(add(2))',options:['第一行 [1]，第二行 [2]','第一行 [1]，第二行 [1]','第一行 [1]，第二行 [1, 2]','直接报 SyntaxError 语法错'],why:['默认列表 buf=[] 不会在每次调用时重新创建，第二次调用会继续往旧列表追加。','第二次调用把 2 追加进列表了，结果里会包含 2。','','可变默认参数在语法上是合法的，不会报 SyntaxError，属于容易忽略的逻辑陷阱。'],answer:2,explain:'默认参数表达式在 def 定义时只求值一次，两次不传 buf 的调用共用了同一个列表，因此第二次打印 [1, 2]。'},
 {id:'py-functions-3',type:'multi',q:'定义函数 def fn(*args, **kwargs): 时，下面哪些说法是正确的？（多选）',options:['args 在函数内是一个元组','args 在函数内是一个列表','kwargs 在函数内是一个字典','kwargs 用来收集位置参数'],why:['','*args 收集多余位置参数后得到的是不可变元组 tuple，不是列表。','','**kwargs 收集的是多余关键字参数，位置参数由 *args 收集。'],answers:[0,2],explain:'函数形参中的 *args 把多余位置参数打包为 tuple，**kwargs 把多余关键字参数打包为 dict。'},
 {id:'py-functions-4',type:'judge',q:'在 Python 函数里写 return a, b 看似返回两个值，本质上是把它们打包成一个元组返回。',answer:true,explain:'逗号表达式会打包成二元元组 (a, b) 返回，调用方通常通过解包 x, y = fn() 接收。'},
 {id:'py-functions-5',q:'已知函数定义 def connect(host, *, timeout=5):，下面哪次调用会抛出 TypeError？',options:['connect("db", 10)','connect("db")','connect("db", timeout=10)','connect(host="db", timeout=10)'],why:['','timeout 有默认值 5，只传 host 完全合法。','timeout 按关键字形式传入，符合 * 后仅关键字参数的要求。','host 在 * 左边且没有 / 限制，可以按关键字形式传入。'],answer:0,explain:'* 右边的 timeout 是仅关键字参数，调用时必须写 timeout=10，按位置传入 10 会抛出 TypeError。'},
 {id:'py-functions-6',type:'fill',q:'Python 变量查找的 LEGB 规则中，L 是 Local，G 是 Global，B 是 Built-in，字母 E 代表英文 ＿（外层嵌套函数作用域）。',accepted:['Enclosing','enclosing'],explain:'LEGB 依次表示 Local（局部）→ Enclosing（外层嵌套函数）→ Global（模块全局）→ Built-in（内置）。'},
 {id:'py-functions-7',q:'运行下面代码，会打印什么？',code:'def touch(n, xs):\n    n = n + 10\n    xs.append(4)\n\na, b = 5, [1, 2, 3]\ntouch(a, b)\nprint(a, b)',options:['15 [1, 2, 3, 4]','15 [1, 2, 3]','5 [1, 2, 3]','5 [1, 2, 3, 4]'],why:['n = n + 10 只是把形参 n 重新绑定到新整数 15，不会改变外部变量 a。','a 不会被改为 15，而且列表 b 被原地 append(4) 修改了。','xs 和 b 指向同一个可变列表，xs.append(4) 会直接反映到 b 上。',''],answer:3,explain:'Python 按对象引用传递：对形参 n 重新赋值不影响外部的 a（仍为 5），但对可变列表 xs 原地 append(4) 会改变外部的 b。'},
 {id:'py-functions-8',q:'运行下面代码会发生什么？',code:'count = 10\ndef bump():\n    count = count + 1\n    return count\nbump()',options:['返回 11，全局 count 变成 11','抛出 UnboundLocalError 异常','返回 11，全局 count 仍是 10','返回 None，跳过此次赋值'],why:['函数内给 count 赋值而未声明 global 时，不会去修改全局变量。','','因为函数体里存在对 count 的赋值，Python 将它视为局部变量，读取右边的 count 时尚未绑定值。','Python 不会静默跳过赋值并返回 None，而是直接抛出异常。'],answer:1,explain:'函数体内出现了对 count 的赋值，Python 在编译阶段就把它当作局部变量；执行 count + 1 时局部 count 尚未赋值，从而抛出 UnboundLocalError。'},
 {id:'py-functions-9',type:'multi',q:'关于 Python 中的函数、lambda 与闭包，下面哪些说法是正确的？（多选）',options:['函数可放进字典或当参数传递','lambda 适合简短的单表达式回调','闭包能让内层函数记住外层变量','lambda 内可写多条 for 循环语句'],why:['','','','lambda 主体仅允许单个表达式，不能包含多条语句、for 循环或普通赋值语句。'],answers:[0,1,2],explain:'Python 函数是一等对象，可存进容器或作回调；lambda 限于单个表达式；闭包允许内层函数捕获并记住外层函数的变量。'},
 {id:'py-functions-10',type:'judge',q:'在嵌套函数里，想重新给外层函数的局部变量赋值时，应该使用 global 关键字声明。',answer:false,explain:'修改外层嵌套函数（Enclosing）里的变量要用 nonlocal；global 指向的是模块顶层的全局变量。'},
 {id:'py-functions-11',q:'运行下面代码会打印什么？',code:'from functools import partial\ndef power(base, exp):\n    return base ** exp\nsquare = partial(power, exp=2)\nprint(square(5))',options:['25','10','32','52'],why:['','10 是 5 * 2 的结果，而 ** 是乘方运算符。','32 是 2 ** 5 的结果，这里冻结的是 exp=2，传入的 5 是底数 base。','power 做的是幂运算，不是把数字拼成字符串。'],answer:0,explain:'partial(power, exp=2) 把指数 exp 固定为 2，调用 square(5) 等价于 power(5, exp=2)，即 5 ** 2 = 25。'},
 {id:'py-functions-12',type:'fill',q:'在嵌套函数内部，若要重新给外层函数的局部变量赋值而不是新建内层变量，需先用关键字 ＿ 声明该变量。',accepted:['nonlocal'],explain:'nonlocal 用于在嵌套函数里绑定并修改外层函数（Enclosing 作用域）中的变量。'},
 {id:'py-functions-13',type:'short',q:'为什么 def append_log(msg, logs=[]): 是 Python 中最常见的陷阱之一？它的底层原因是什么？应该如何正确改写？',reference:'1. 现象：多次不传 logs 参数调用 append_log 时，新日志会不断累积到同一个列表里，而不是每次从空列表开始。\n2. 原因：Python 的函数默认参数表达式只在执行 def 定义函数时求值一次，生成的列表对象会被保存在函数对象的默认值属性（__defaults__）中，后续调用会反复复用这同一个可变对象。\n3. 改写方法：把默认值改为不可变的 None，在函数体内部检查 if logs is None: logs = []，这样每次未传 logs 时都会新建一个独立的空列表。',points:['指出多次调用会共享并累积同一个列表的现象','解释默认参数只在 def 定义时求值一次的底层原因','给出使用 logs=None 作为默认值的正确签名','在函数体内用 if logs is None: logs = [] 现造新列表'],explain:'凡是需要列表、字典、集合等可变对象作为默认值，统一用 None 哨兵模式即可彻底避免共享污染。'},
 {id:'py-functions-14',type:'code',q:'请编写一个闭包工厂函数 make_counter(start=0, *, step=1)：\n1. step 必须是仅关键字参数；\n2. 返回一个无参内层函数，每次调用时将内部计数增加 step（使用 nonlocal）并返回更新后的值；\n3. 创建两个独立计数器 c1 = make_counter() 和 c2 = make_counter(10, step=5)，各调用两次并打印结果。',reference:'def make_counter(start=0, *, step=1):\n    count = start\n    def inc():\n        nonlocal count\n        count += step\n        return count\n    return inc\n\nc1 = make_counter()\nc2 = make_counter(10, step=5)\nprint(c1(), c1())\nprint(c2(), c2())',points:['签名正确使用 * 将 step 限定为仅关键字参数并设置默认值','在内层函数中使用 nonlocal count 更新外层计数变量','外层函数返回内层函数对象本身（不带括号）','正确创建 c1 和 c2 两个独立计数器并验证输出分别为 1 2 与 15 20'],explain:'每次调用 make_counter 都会创建一个独立的闭包环境，c1 与 c2 各自保存自己的 count 与 step，互不干扰。'}
]};
