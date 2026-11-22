import type {AiQuiz} from '../journey';

// Python「入门」阶段训练：变量与基本类型、运算符与控制流、内置容器与推导式、函数与作用域。题目全新，比关卡更综合、更易踩坑。
export const pythonTrain1:AiQuiz[]=[
 {
  id:'py-x1-1',
  q:'下面这段 Python 代码运行后的输出是什么？',
  code:'d = {1: "a", True: "b", 1.0: "c"}\nprint(len(d), d[1], isinstance(True, int), True + True)',
  options:['3 a False 2','1 c True 2','2 b True 1','1 a False 2'],
  why:['在 Python 中 1 == True == 1.0 且三者哈希值相同，会被字典视为同一个键，len(d) 为 1。','','True 和 1.0 会先后覆盖键 1 关联的值，最终 d[1] 为 "c"，且 True + True 按整数相加得 2。','bool 是 int 的子类，isinstance(True, int) 为 True，且最终值已被更新为 "c"。'],
  answer:1,
  explain:'Python 中 bool 是 int 的子类（isinstance(True, int) 为 True），且 1 == True == 1.0、hash(1) == hash(True) == hash(1.0)。字典插入相同键时保留最初的键对象 1，但连续更新其对应的值，最终字典只有 1 个键值对 {1: "c"}。'
 },
 {
  id:'py-x1-2',
  q:'下面代码运行后的标准输出是什么？',
  code:'a = round(2.5)\nb = round(3.5)\nmsg = "py_train_py"\nprint(f"{a=} {b=} {msg.removeprefix(\'py_\')}")',
  options:['a=3 b=4 train_py','a=2 b=3 train','a=2 b=4 train_py','a=3 b=4 train'],
  why:['Python 3 的 round 采用银行家舍入（四舍六入五成双），2.5 距离 2 和 4 一样近时向偶数 2 舍入。','3.5 向最近的偶数舍入应得到 4，且 removeprefix 只移除开头的前缀，不会动末尾的 _py。','','round(2.5) 的结果是偶数 2 而非 3，同时 removeprefix 不会截掉尾部的后缀。'],
  answer:2,
  explain:'Python 3 的 round() 对恰好处于中间的 .5 采用“四舍六入五成双（round half to even）”，因此 round(2.5) 为 2、round(3.5) 为 4；f"{a=}" 会输出变量名与值，str.removeprefix("py_") 仅剥离起始匹配的完整前缀。'
 },
 {
  id:'py-x1-3',
  type:'multi',
  q:'关于 Python 字符串（str）的切片与常用方法，下面哪些说法正确？（多选）',
  options:['切片 s[10:20] 即使超出字符串长度也不会抛 IndexError，而是返回空串','s.split() 与 s.split(" ") 对含连续空格的字符串拆分出的结果列表相同','s.strip("ab") 会持续剥离首尾出现的所有字符 "a" 或 "b"，直到遇到其他字符','字符串是不可变对象，任何拼接或替换操作都会返回新字符串而不原地修改'],
  why:['','s.split() 会把连续空白合并视作单个分隔符并忽略首尾空白，而 s.split(" ") 按每个空格逐一切分，会产生空字符串元素。','',''],
  answers:[0,2,3],
  explain:'切片下标越界时会自动截断到合法边界；str.strip(chars) 的参数是字符集合而非固定前后缀（固定前后缀应使用 removeprefix / removesuffix）；s.split() 与 s.split(" ") 对连续空格的行为截然不同。'
 },
 {
  id:'py-x1-4',
  type:'judge',
  q:'执行 a = "hello"; b = a; a += " world" 后，因为 b 和 a 原本指向同一个字符串对象，b 的值也会跟着变成 "hello world"。',
  answer:false,
  explain:'Python 的 str 是不可变类型。a += " world" 会创建一个全新的字符串对象并让变量名 a 重新绑定到新对象上，原来的字符串对象保持不变，因此 b 依然是 "hello"。'
 },
 {
  id:'py-x1-5',
  q:'下面这段关于负数整除与取模的代码，运行后输出什么？',
  code:'q = -7 // 2\nr = -7 % 2\nprint(q, r, divmod(-7, 2))',
  options:['-4 1 (-4, 1)','-3 -1 (-3, -1)','-4 -1 (-4, -1)','-3 1 (-3, 1)'],
  why:['','Python 的 // 是向下取整（向负无穷方向取整），-3.5 向下取整为 -4 而非向零截断的 -3。','Python 满足 q * 2 + r == -7 且余数 r 与除数 2 同号，因此余数是 1 而不是 -1。','-7 // 2 向下取整得 -4，若商为 -3、余数为 1，则 (-3) * 2 + 1 = -5，等式不成立。'],
  answer:0,
  explain:'Python 的整除运算符 // 采用向下取整（floor division），-7 / 2 = -3.5 向下取整为 -4；取模运算满足 (a // b) * b + (a % b) == a 且余数结果与除数 b 同号（或为 0），故 -7 % 2 为 1。'
 },
 {
  id:'py-x1-6',
  q:'下面代码运行后的输出是什么？',
  code:'v1 = "" or "fallback" and "done"\nv2 = [] and "skip" or 0\ncmp = 1 < 2 == 2 > 0\nprint(v1, v2, cmp)',
  options:['fallback 0 False','done [] True','True False True','done 0 True'],
  why:['and 的优先级高于 or，会先算 "fallback" and "done" 得到 "done"，且链式比较每一段都成立。','[] and "skip" 短路返回假值 []，接着计算 [] or 0 会返回右操作数 0 而非 []。','Python 的 and 和 or 返回的是决定表达式结果的那个操作数原值，而不是强转为布尔值。',''],
  answer:3,
  explain:'逻辑运算符优先级为 not > and > or，且返回决定结果的原操作数："" or ("fallback" and "done") 得到 "done"；([] and "skip") or 0 即 [] or 0 得到 0；链式比较 1 < 2 == 2 > 0 等价于 1 < 2 and 2 == 2 and 2 > 0，结果为 True。'
 },
 {
  id:'py-x1-7',
  q:'下面这段带 for...else 的代码运行后输出什么？',
  code:'def check(nums):\n    for n in nums:\n        if n < 0:\n            print("neg", end=" ")\n            break\n        if n % 2 == 0:\n            continue\n    else:\n        print("clean", end=" ")\n\ncheck([2, 3, 4])\ncheck([1, -2, 5])',
  options:['clean clean ','clean neg ','neg clean ','clean neg clean '],
  why:['第二次调用遇到 -2 会触发 break 跳出循环，此时 for 对应的 else 分支不会执行。','','第一次调用中虽然触发了 continue，但并未执行 break，循环正常结束会执行 else 打印 clean。','第二次调用触发了 break，会直接跳过 else 块，末尾不会再打印第二个 clean。'],
  answer:1,
  explain:'Python 中 for...else 的 else 块仅在循环“正常遍历完所有元素、中途没有被 break 打断”时执行；continue 只是跳过单次迭代，不影响 else 的执行。'
 },
 {
  id:'py-x1-8',
  q:'在 Python 3.10+ 中运行下面这段 match...case 代码，输出是什么？',
  code:'TARGET = 200\nstatus = 404\n\nmatch status:\n    case TARGET:\n        print("hit", TARGET)\n    case _:\n        print("miss", TARGET)',
  options:['miss 200','hit 404','hit 200','miss 404'],
  why:['case 后不带点号的裸名称 TARGET 在模式匹配中是“捕获模式”，会匹配任意值，不会走到 case _。','','捕获模式 TARGET 会把被匹配的值 404 绑定给变量 TARGET，覆盖原来的 200。','第一条分支 case TARGET 就已经作为捕获变量模式匹配成功并打印 hit 404，不会进入通配分支。'],
  answer:1,
  explain:'在 match...case 中，不带点号的裸标识符（如 case TARGET:）会被解释为“捕获变量模式”，类似于赋值的通配符，既会匹配 404，又会把 TARGET 重新绑定为 404。若要按常量值匹配，需使用带点号的属性名（如 Enum 成员）或守卫条件 case x if x == TARGET:。'
 },
 {
  id:'py-x1-9',
  type:'multi',
  q:'关于 Python 中的相等比较、身份比较与海象运算符（:=），下面哪些说法正确？（多选）',
  options:['== 调用对象的 __eq__ 比较值是否相等，is 比较两个引用是否指向同一内存对象','判断变量 x 是否为 None 时，PEP 8 推荐使用 x == None 而不是 x is None','小整数池之外的两个新建列表 [1, 2] == [1, 2] 为 True，但 [1, 2] is [1, 2] 为 False','海象运算符 (n := len(data)) > 3 仅允许在 while 循环头中使用，不可出现在 if 或推导式里'],
  why:['','因为自定义类可能重写 __eq__，判断单例 None 时 PEP 8 明确要求使用 x is None 或 x is not None。','','赋值表达式（:=）既可用于 while，也可用于 if 条件判断和列表推导式的过滤条件中。'],
  answers:[0,2],
  explain:'is 比较对象的身份标识（id(a) == id(b)），== 比较值相等；None 是全局唯一单例，应用 is None 判断；每次字面量 [1, 2] 都会分配新的列表对象，因此值相等但身份不同。'
 },
 {
  id:'py-x1-10',
  type:'judge',
  q:'链式比较表达式 a < f() < b 等价于 a < f() and f() < b 的逻辑结果，但中间的函数 f() 只会被调用一次。',
  answer:true,
  explain:'Python 对链式比较做了专门优化：中间操作数只求值一次，且当左半部分 a < f() 为 False 时会直接短路，不再对右侧的 b 求值。'
 },
 {
  id:'py-x1-11',
  q:'下面这段操作二维列表的代码运行后输出什么？',
  code:'grid = [[0] * 2] * 3\ngrid[0][1] = 9\ngrid[1] = [7, 8]\nprint(grid)',
  options:['[[0, 9], [7, 8], [0, 9]]','[[0, 9], [7, 8], [0, 0]]','[[0, 9], [0, 9], [0, 9]]','[[0, 0], [7, 8], [0, 9]]'],
  why:['','[[0] * 2] * 3 让外层列表的 3 个位置指向同一个内层列表，修改 grid[0][1] 会同时体现在 grid[2] 上。','grid[1] = [7, 8] 是把外层列表索引 1 重新绑定到一个新列表对象，不会保持为 [0, 9]。','grid[0] 和 grid[2] 仍然共享同一个内层列表对象，所以两者的内容都是 [0, 9]。'],
  answer:0,
  explain:'外层列表用 * 3 复制时只复制了内层列表的引用，3 行最初指向同一个列表对象。grid[0][1] = 9 原地修改了该共享列表；随后 grid[1] = [7, 8] 只把第 2 行的引用替换为新列表，第 1 行和第 3 行仍指向被改过的 [0, 9]。'
 },
 {
  id:'py-x1-12',
  q:'运行下面这段代码，最终打印的结果是什么？',
  code:'t = (1, [2, 3])\ntry:\n    t[1] += [4]\nexcept TypeError:\n    pass\nprint(t)',
  options:['(1, [2, 3])','(1, [2, 3], [4])','(1, [4])','(1, [2, 3, 4])'],
  why:['虽然对元组项赋值的步骤抛出了 TypeError，但在报错前列表的 __iadd__ 已经完成了原地扩容。','t[1] += [4] 操作的是元组索引 1 处的列表元素，不会往元组尾部追加新元素。','列表的 += 是向原列表末尾原地追加元素 4，不会清空原有的 2 和 3。',''],
  answer:3,
  explain:'t[1] += [4] 分两步执行：第一步调用列表的 __iadd__ 方法原地把 4 追加进列表并返回该列表；第二步尝试执行元组项赋值 t[1] = 结果，此时元组抛出 TypeError。异常被捕获后，元组内部的列表其实已经被原地改成了 [2, 3, 4]。'
 },
 {
  id:'py-x1-13',
  q:'下面这段关于字典视图与 setdefault 的代码输出什么？',
  code:'d = {"a": [1]}\nkeys = d.keys()\nd.setdefault("a", []).append(2)\nd.setdefault("b", []).append(3)\nprint(list(keys), d["a"], d["b"])',
  options:['[\'a\'] [1, 2] [3]','[\'a\', \'b\'] [1, 2] [3]','[\'a\', \'b\'] [2] [3]','[\'a\'] [2] [3]'],
  why:['d.keys() 返回的是动态字典视图对象，不是静态列表快照，新增键 "b" 后视图会自动反映出来。','','键 "a" 原本已存在，setdefault("a", []) 会直接返回原有的列表 [1]，再 append(2) 得到 [1, 2]。','字典视图会随原字典动态更新，且已存在的键 "a" 不会被默认空列表覆盖。'],
  answer:1,
  explain:'d.keys() 返回动态视图（dict_keys），字典后续新增或删除键都会实时反映在视图中；dict.setdefault(k, default) 在键已存在时直接返回原值，在键不存在时才插入 default 并返回它。'
 },
 {
  id:'py-x1-14',
  q:'下面列表推导式运行后的结果是什么？',
  code:'res = [x if x % 2 == 0 else -x for x in range(5) if x > 0]\nprint(res)',
  options:['[0, -1, 2, -3, 4]','[1, 2, 3, 4]','[-1, 2, -3, 4]','[-1, -3, 2, 4]'],
  why:['末尾的过滤条件 if x > 0 会先筛掉 0，因此结果列表中只有 4 个元素。','开头的条件表达式 x if x % 2 == 0 else -x 会把奇数 1 和 3 映射为相反数 -1 和 -3。','','列表推导式保持 range(5) 原有的遍历顺序，不会把负数排在前面、偶数排在后面。'],
  answer:2,
  explain:'推导式中 for 右侧的 if x > 0 是过滤条件，先从 range(5) 中筛出 1, 2, 3, 4；for 左侧的 x if x % 2 == 0 else -x 是映射表达式，偶数保留原值、奇数取负，得到 [-1, 2, -3, 4]。'
 },
 {
  id:'py-x1-15',
  type:'multi',
  q:'关于 Python 内置容器与 collections 模块，下面哪些说法正确？（多选）',
  options:['字面量 {} 创建的是空字典 dict，创建空集合应当使用 set()','包含列表的元组（如 (1, [2, 3])）无法计算哈希值，不能作为 dict 的键','collections.Counter 访问不存在的键时会返回 0，而不会抛出 KeyError','list.sort() 会返回一个排好序的新列表，并且保持原列表的顺序不变'],
  why:['','','','list.sort() 是原地排序方法，返回值为 None；若需要保留原列表并返回新列表应使用内置函数 sorted()。'],
  answers:[0,1,2],
  explain:'{} 是空字典；元组只有当其所有元素都可哈希时才可哈希；Counter 的 __missing__ 对缺失键返回 0；list.sort() 原地修改列表并返回 None。'
 },
 {
  id:'py-x1-16',
  type:'judge',
  q:'对嵌套列表 matrix = [[1, 2], [3, 4]] 执行 copyed = matrix.copy() 后，修改 copyed[0].append(9) 不会影响原列表 matrix。',
  answer:false,
  explain:'list.copy()（以及切片 matrix[:] 和 copy.copy()）执行的都是浅拷贝，只复制了最外层列表容器，内层子列表仍然是同一个对象的引用；隔离嵌套可变结构需要使用 copy.deepcopy()。'
 },
 {
  id:'py-x1-17',
  type:'fill',
  q:'若想以一个可迭代对象中的元素作为键、统一赋予相同的初始不可变默认值来快速创建新字典，可调用字典的类方法 dict.＿(keys, default)。',
  accepted:['fromkeys'],
  explain:'dict.fromkeys(iterable, value=None) 会以 iterable 中的元素为键创建新字典。注意不要把可变对象（如 []）传给 value，否则所有键会共享同一个列表引用。'
 },
 {
  id:'py-x1-18',
  q:'下面这段含可变默认参数的代码运行后，输出是什么？',
  code:'def add_item(val, box=[]):\n    box.append(val)\n    return box\n\na = add_item(1)\nb = add_item(2, [])\nc = add_item(3)\nprint(a, b, c)',
  options:['[1, 3] [2] [1, 3]','[1] [2] [3]','[1] [2] [1, 3]','[1, 2, 3] [2] [1, 2, 3]'],
  why:['','默认参数列表 [] 在 def 定义函数时只创建一次，第 1 次和第 3 次未传 box 时会复用同一个默认列表。','变量 a 和 c 指向的是同一个默认列表对象，第三次调用往里追加 3 后，打印 a 也会看到 [1, 3]。','第二次调用显式传入了新列表 []，不会修改函数的默认列表，因此 2 不会进入默认列表中。'],
  answer:0,
  explain:'默认参数在函数定义时只求值一次并保存在函数对象的 __defaults__ 中。第一次和第三次调用使用同一个默认列表，且 a 与 c 引用同一对象，故都为 [1, 3]；第二次显式传入了独立的新列表 []，故 b 为 [2]。'
 },
 {
  id:'py-x1-19',
  q:'下面代码运行后的输出是什么？',
  code:'def mutate(x, y):\n    x += [10]\n    y = y + [20]\n\ns1 = [1]\ns2 = [2]\nmutate(s1, s2)\nprint(s1, s2)',
  options:['[1] [2]','[1, 10] [2, 20]','[1, 10] [2]','[1] [2, 20]'],
  why:['列表的 += 会调用 __iadd__（相当于 extend）原地修改传入的对象，因此外层的 s1 会变为 [1, 10]。','y = y + [20] 是先用 + 创建新列表，再把局部变量 y 重新绑定到新列表，外层 s2 不受影响。','','x += [10] 原地修改了 s1，而 y = y + [20] 只是重绑定了形参 y，结果恰好相反。'],
  answer:2,
  explain:'Python 参数传递是“按对象引用传递”：x += [10] 对可变列表执行原地修改（in-place），调用方可见；而 y = y + [20] 创建了新列表并只重绑定了函数内的局部名称 y，外层 s2 保持 [2] 不变。'
 },
 {
  id:'py-x1-20',
  q:'运行下面这段代码会发生什么？',
  code:'total = 10\n\ndef bump():\n    print(total)\n    total += 5\n\nbump()',
  options:['先后输出 10，随后全局变量 total 变为 15','输出 10 后在 total += 5 这一行抛出 TypeError','正常执行完毕，仅输出 10，全局 total 仍为 10','在 print(total) 这一行直接抛出 UnboundLocalError'],
  why:['函数体内存在对 total 的赋值（total += 5），编译字节码时 total 就被判定为局部变量，不会读取全局 total。','报错发生在读取未赋值的局部变量 print(total) 处，且异常类型是 UnboundLocalError 而非 TypeError。','只要函数体内任何位置给变量赋值（且未声明 global / nonlocal），整个函数作用域内该名字都视为局部变量。',''],
  answer:3,
  explain:'Python 在编译函数体时，看到 total += 5 就会把 total 标记为该函数的局部变量。执行到第一行 print(total) 时，局部变量 total 尚未绑定值，因此立即抛出 UnboundLocalError。'
 },
 {
  id:'py-x1-21',
  q:'已知函数定义如下，下面哪一次调用可以正常执行并返回 17？',
  code:'def compute(a, /, b, *, c=3):\n    return a + b * c',
  options:['compute(a=2, b=5, c=3)','compute(2, b=5)','compute(2, 5, 3)','compute(2, c=5)'],
  why:['/ 左侧的参数 a 是仅限位置参数（positional-only），按关键字 a=2 传参会抛出 TypeError。','','* 右侧的参数 c 是仅限关键字参数（keyword-only），第 3 个位置实参 3 无法按位置传入。','参数 b 没有默认值，compute(2, c=5) 遗漏了必传参数 b，会抛出 TypeError。'],
  answer:1,
  explain:'签名中 / 之前的 a 只能按位置传参；/ 与 * 之间的 b 既可按位置也可按关键字传参；* 之后的 c 只能按关键字传参（这里使用默认值 3），因此 compute(2, b=5) 合法并计算出 2 + 5 * 3 = 17。'
 },
 {
  id:'py-x1-22',
  type:'multi',
  q:'关于 Python 函数的参数解包、作用域与 lambda 表达式，下面哪些说法正确？（多选）',
  options:['函数定义中的 *args 会把多余的位置实参收集为一个元组（tuple）','函数定义中的 **kwargs 会把多余的关键字实参收集为一个字典（dict）','调用函数时可以使用 *iterable 和 **mapping 将容器解包后传入','lambda 表达式体仅限写单个表达式，不能包含 return、for 或普通赋值语句'],
  why:['','','',''],
  answers:[0,1,2,3],
  explain:'定义函数时 *args 打包为 tuple、**kwargs 打包为 dict；调用函数时 * 和 ** 执行反向解包；lambda 仅限单个表达式并自动返回该表达式的值。'
 },
 {
  id:'py-x1-23',
  type:'judge',
  q:'Python 函数的默认参数值是在执行 def 语句定义函数时计算一次，而不是在每次调用该函数时重新计算。',
  answer:true,
  explain:'正因为默认参数在 def 执行时只求值一次，如果默认值是列表、字典或 set 等可变对象，跨次调用就会共享同一个对象实例。'
 },
 {
  id:'py-x1-24',
  type:'fill',
  q:'在嵌套的内层函数中，若要对上一层（非全局）外层函数作用域中的变量重新赋值，需要在内层函数中使用关键字 ＿ 声明该变量。',
  accepted:['nonlocal'],
  explain:'nonlocal 用于将变量绑定到最近一层包含它的外层函数作用域（Enclosing scope），而 global 则直接绑定到模块级全局作用域。'
 },
 {
  id:'py-x1-25',
  type:'short',
  q:'为什么用 matrix = [[0] * 3] * 3 创建二维列表后，执行 matrix[0][0] = 1 会导致三行的第一列同时变成 1？如果用 copy.copy(matrix) 能否解决这个问题？请给出正确的二维列表初始化写法。',
  reference:'1. 原因：内层 [0] * 3 先创建了一个包含 3 个整数 0 的列表对象，随后外层 [... ] * 3 并没有克隆出 3 个独立的子列表，而是把同一个子列表的引用重复复制了 3 份。因此 matrix[0]、matrix[1]、matrix[2] 指向同一个列表对象，修改 matrix[0][0] 会同时反映在所有行上。\n2. copy.copy(matrix) 不能解决：浅拷贝只复制最外层容器，内层子列表引用依然共享；若要完整复制嵌套可变结构需使用 copy.deepcopy()。\n3. 正确初始化写法：使用列表推导式 matrix = [[0] * 3 for _ in range(3)]，让每次循环都独立创建一个新的内层列表。',
  points:['指出外层 * 3 只复制了同一个内层子列表对象的引用，三行共享同一列表','说明 copy.copy 只是浅拷贝，无法解除内层子列表的引用共享','提及复制已有嵌套列表应使用 copy.deepcopy','给出正确的列表推导式初始化写法 [[0] * 3 for _ in range(3)]'],
  explain:'序列乘法 seq * n 属于浅重复，当元素本身是可变容器时，务必改用列表推导式在每次迭代中新建内层容器。'
 },
 {
  id:'py-x1-26',
  type:'short',
  q:'阅读下面的函数，说明连续多次不带 log 参数调用 record("err") 时会发生什么问题及底层原因；为什么把函数体第一行改成 log = log + [msg] 就不会跨次污染？日常工程中最推荐的标准写法是什么？',
  code:'def record(msg, log=[]):\n    log.append(msg)\n    return log',
  reference:'1. 问题与原因：连续调用 record("a")、record("b") 时，第二次返回的是 ["a", "b"] 而非 ["b"]。因为默认参数 log=[] 在 def 定义函数时只求值一次，存储在函数的 __defaults__ 属性中，每次未传 log 时都会原地修改（append）这同一个默认列表。\n2. 为什么 log = log + [msg] 不污染：log + [msg] 会创建一个新列表，并将局部变量 log 重新绑定到新列表上，并没有原地修改 __defaults__ 里的那个默认空列表。\n3. 推荐标准写法：使用不可变的 None 作为默认值占位符（def record(msg, log=None):），在函数体内判断 if log is None: log = []。',
  points:['指出默认参数在 def 定义函数时只计算一次，多次调用共享同一个默认列表','说明 log.append 是原地修改该默认对象，导致历史数据残留','解释 log = log + [msg] 会创建新列表并重绑定局部变量，不修改原默认空列表','给出 log=None 配合 if log is None: log = [] 的标准惯用写法'],
  explain:'判断可变默认参数是否踩坑的关键在于：默认对象在 def 时只生成一次，而函数体内是否对该对象做了原地修改（in-place mutation）。'
 },
 {
  id:'py-x1-27',
  type:'code',
  q:'编写一个函数 group_by_initial(words: list[str]) -> dict[str, list[str]]：对传入的字符串列表去除首尾空白并转为小写，忽略处理后为空的字符串；按首字符分组，要求每个首字符对应的单词列表去重且按字典序升序排列。最后写出调用示例打印结果。',
  reference:'def group_by_initial(words: list[str]) -> dict[str, list[str]]:\n    groups: dict[str, set[str]] = {}\n    for raw in words:\n        w = raw.strip().lower()\n        if not w:\n            continue\n        groups.setdefault(w[0], set()).add(w)\n    return {k: sorted(v) for k, v in sorted(groups.items())}\n\nif __name__ == "__main__":\n    sample = [" Apple ", "ant", "banana", "APPLE", "  ", "Berry"]\n    print(group_by_initial(sample))',
  points:['使用 strip().lower() 清洗字符串，并正确过滤掉空字符串','按首字符 w[0] 分组（可用 setdefault、defaultdict 或普通判断）','利用 set 去重并对每组结果调用 sorted() 按升序排列返回 list','提供清晰的测试调用示例并包含大小写、空白与重复词边界情况'],
  explain:'先用 dict[str, set[str]] 收集分组并去重，最后用字典推导式统一将每个集合转换为 sorted(v) 有序列表，逻辑最清晰。'
 },
 {
  id:'py-x1-28',
  type:'code',
  q:'使用闭包与 nonlocal 编写一个计数器工厂函数 make_counter(start: int = 0, step: int = 1)：返回一个内部函数 tick(reset: bool = False) -> int。当 reset=True 时将当前计数值重置回初始值 start 并返回 start；否则每次调用将当前计数值增加 step 并返回新值。写出测试代码验证两个独立计数器互不干扰及重置功能。',
  reference:'def make_counter(start: int = 0, step: int = 1):\n    current = start\n\n    def tick(reset: bool = False) -> int:\n        nonlocal current\n        if reset:\n            current = start\n        else:\n            current += step\n        return current\n\n    return tick\n\nif __name__ == "__main__":\n    c1 = make_counter(10, 5)\n    c2 = make_counter(0, 1)\n    print(c1(), c1())        # 15 20\n    print(c2())              # 1\n    print(c1(reset=True))    # 10',
  points:['外层函数保存初始值 start、步长 step 和状态变量 current = start','内层函数 tick 使用 nonlocal current 声明外层状态变量','正确处理 reset=True 重置回 start 与默认累加 step 的分支逻辑','测试代码验证多个闭包实例状态隔离以及 reset=True 重置效果'],
  explain:'每次调用 make_counter 都会创建一个独立的外层函数帧（闭包单元），通过 nonlocal 即可在不定义类的情况下优雅维护私有状态。'
 }
];
