import type {AiLevel} from '../journey';

// Python 入门（一）：起步——环境、解释器与第一个程序。
export const pyStart:AiLevel={
 id:'py-start',
 title:'起步：环境、解释器与第一个程序',
 summary:'Python 是什么、装好 Python 3、缩进与代码风格、变量与动态类型、基本类型与 f-string',
 lessons:[
  {
   title:'Python 是什么，为什么学它',
   body:'Python 是一门“解释型”高级编程语言，由荷兰程序员 Guido van Rossum 在 1991 年发布。和 C、C++、Rust 这类需要先手动编译成可执行文件再运行的“编译型”语言不同，写好一个 .py 源代码文件后，直接交给“Python 解释器”就能边翻译边运行（更准确地说，主流解释器 CPython 会在幕后先把它变成字节码再交给虚拟机执行，但对写代码的人来说就是“改完立刻能跑”），试错成本非常低。\n为什么全球有这么多开发者和初学者选 Python？\n一、语法清晰接近自然英语：省去了花括号、行末分号和繁琐的模板代码，同样一个功能常常只用几行就能写完，读起来像在看伪代码；\n二、生态极其庞大：官方自带丰富的“标准库”（号称“自带电池”），社区里还有几十万个第三方包，从读写 Excel 到调用大模型几乎都有现成工具；\n三、应用版图极广：Web 后端（Django、FastAPI）、日常自动化脚本与运维批处理、数据分析与科学计算（NumPy、pandas），以及当下最火的人工智能与大模型开发（PyTorch、各类 AI SDK 与 Agent 框架），Python 都是当之无愧的首选语言。\n最后提醒一个版本常识：现在学习与生产环境一律使用 Python 3（例如 3.12、3.13）。古老的 Python 2 已在 2020 年正式停止维护、退出历史舞台，看到老文章里不带括号的 print "hello" 直接略过即可。',
  },
  {
   title:'安装 Python 3 与运行方式',
   body:'动手写代码前，先在电脑上装好 Python 3：\n一、下载安装：打开官网 python.org，进入 Downloads 下载最新的 Python 3 安装包；\n二、Windows 特别注意：打开安装程序后，第一步务必勾选窗口最底部的 “Add python.exe to PATH”，再点 Install Now。勾选它才能让终端直接认得 python 命令，省去自己配置环境变量的麻烦；\n三、Mac / Linux：Mac 可以直接用官网安装包（或通过 Homebrew 运行 brew install python），Linux 发行版大多自带 python3，也可以用系统包管理器安装；\n四、验证安装：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 和 Linux 上通常是 python3 --version，Windows 也可以用官方启动器 py --version），看到类似 Python 3.13.x 的版本号就说明装好了。\n运行 Python 代码有两种日常方式：\n一、交互式 REPL：在终端直接输入 python 回车，看到 >>> 提示符后输入一行就立刻算出一行，很适合临时当计算器或试验一小段语法；想退出时输入 exit() 回车；\n二、运行脚本文件：用编辑器写好代码保存成 .py 文件（如 hello.py），在终端运行 python hello.py，正式写程序都用这种方式。\n写代码推荐用 VS Code，在左侧扩展商店搜索并安装微软官方的 Python 扩展，就能获得语法高亮、智能补全和一键运行。',
   code:`# 检查是否安装成功
python --version

# 运行写好的脚本文件
python hello.py

# 终端直接输入 python 回车进入交互式 REPL
>>> 2 + 3
5
>>> exit()`,
   explain:[
    {at:'python --version',text:'查看当前终端默认 Python 的版本号，看到 Python 3.x.x 就表示环境正常；Mac 或 Linux 上如果提示找不到 python，改用 python3 --version。'},
    {at:'python hello.py',text:'让 Python 解释器从上到下执行当前文件夹里的 hello.py 脚本。'},
    {at:'>>> 2 + 3',to:'>>> exit()',text:'在终端不带文件名直接运行 python，就会进入交互式 REPL（读取-求值-打印循环）：看到 >>> 提示符后输入 2 + 3 回车立刻得到 5，最后输入 exit() 退出回到终端。'},
   ],
  },
  {
   title:'第一个 Python 程序与缩进规则',
   body:'Python 程序不需要像 C、Java 或 Rust 那样先套一层 main() 函数，也不用给每一行末尾加分号 ;。解释器打开文件后，就从第一行老老实实往下执行；想在屏幕上输出文字，直接调用内置函数 print()。\nPython 语法最鲜明的特点是用“缩进”来划分代码块：\n一、冒号 + 缩进：遇到 if、for、while、def 等需要引出一段下属代码的语句时，行末写一个英文冒号 :，下面属于它的代码统统往右缩进；\n二、统一用 4 个空格：Python 官方代码风格指南（PEP 8）规定每一级缩进用 4 个空格（现代编辑器按 Tab 键通常会自动转成 4 个空格），千万不要把真实的 Tab 制表符和空格混在一起；\n三、严格对齐：同一个代码块里的每一行，行首空格数必须完全一致，多一个或少一个空格，解释器都会立刻报 IndentationError（缩进错误）拒绝运行；\n四、注释用 #：井号 # 后面直到行末的内容都是给人类看的说明，解释器会直接忽略它。',
   code:`# 这是单行注释，解释器不会运行它
print("Hello, Python!")

ready = True
if ready:
    print("缩进 4 个空格，属于 if 代码块")
    print("同一块里的语句缩进必须对齐")

print("回到顶格，if 代码块已经结束")`,
   explain:[
    {at:'print("Hello, Python!")',text:'调用 print() 打印一行文字并自动换行。不需要 main() 函数，末尾也不加分号。'},
    {at:'ready = True',text:'把布尔值 True 赋给变量 ready，作为下面条件判断的开关。'},
    {at:'if ready:',text:'条件语句开头，行末的英文冒号 : 告诉解释器：接下来缩进的代码块受这个 if 控制。'},
    {at:'print("缩进 4 个空格',to:'必须对齐")',text:'这两行前面都缩进了 4 个空格，共同构成 if 的代码块；只有当 ready 为真时才会依次执行。'},
    {at:'print("回到顶格',text:'这一行没有缩进，表示它不属于上面的 if 代码块，无论 ready 是真是假都会执行。'},
   ],
  },
  {
   title:'动手试试：第一个程序与 f-string 格式化',
   body:'日常写程序很少只打印固定死的一句话，经常要把变量和计算结果拼进文字里。Python 最推荐的方式是 f-string（格式化字符串字面量）：在引号前面加上字母 f，字符串里面用花括号 {...} 就能直接塞进变量和表达式。\n常用格式写法：\n一、{name}：直接填入变量的值；\n二、{age + 1}：花括号里可以直接写算式或函数调用；\n三、{price:.2f}：冒号后面写格式说明，.2f 表示按浮点数保留两位小数（会自动四舍五入）；\n四、{val:>6}、{val:<6}、{val:^6}：一共占 6 个字符宽，分别是右对齐、左对齐、居中，不够的位置用空格补齐。下面代码里的方括号是普通文字，用来帮你看清空格补在了哪里。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '把 name 改成你自己的名字，再把 {price:.2f} 改成 {price:.1f}，重新运行看看结果怎么变。',
     '试试把 {val:>6} 改成 {val:0>6}（在 > 前面加一个 0），观察空格会变成什么填充字符。',
    ],
    expect:'你好，Python！\n小雅 今年 20 岁，明年就 21 岁了\n商品价格：19.99 元\n对齐演示：[    42] [42    ] [  42  ]',
   },
   code:`name = "小雅"
age = 20
price = 19.987
val = 42

print("你好，Python！")
print(f"{name} 今年 {age} 岁，明年就 {age + 1} 岁了")
print(f"商品价格：{price:.2f} 元")
print(f"对齐演示：[{val:>6}] [{val:<6}] [{val:^6}]")`,
   explain:[
    {at:'name = "小雅"',to:'val = 42',text:'依次定义四个变量：字符串 name、整数 age、小数 price 和整数 val，Python 会自动识别每个值的类型，不用提前声明。'},
    {at:'print("你好，Python！")',text:'打印一句普通字符串。'},
    {at:'print(f"{name}',text:'引号前加上 f 开启 f-string：{name} 和 {age} 会替换成对应变量的值，{age + 1} 会先算出 21 再填进去。'},
    {at:'print(f"商品价格',text:'{price:.2f} 把 19.987 按两位小数四舍五入，显示为 19.99。'},
    {at:'print(f"对齐演示',text:'三个 42 各占 6 个字符宽：> 右对齐时左侧补 4 个空格，< 左对齐时右侧补 4 个空格，^ 居中时左右各补 2 个空格。'},
   ],
  },
  {
   title:'变量：不是“盒子”，而是贴在对象上的“标签”',
   body:'很多入门教程把变量比喻成“装数据的盒子”，但在 Python 里，更准确的心智模型是“贴在对象上的名字标签”（引用）：\n数据对象自己待在内存里，写 x = 10 时，Python 并不是把 10 塞进叫 x 的盒子，而是把一张写着 x 的标签贴到整数对象 10 上；接着写 y = x，是把标签 y 也贴到同一个 10 上；之后再写 x = "hello"，只是把标签 x 撕下来改贴到新的字符串对象 "hello" 上，原来贴着 10 的标签 y 纹丝不动。\n由此引出几个重要特性与习惯：\n一、动态类型：类型属于对象而不是变量名，所以同一个变量名可以随时改指其他类型的值（不过真实项目里尽量保持一个变量用途单一，别把读代码的人绕晕）；\n二、多重赋值与一键交换：可以一行给多个变量贴标签，比如 a, b = 1, 2；交换两个变量也不需要第三个临时变量，直接写 a, b = b, a；\n三、命名规则与风格：变量名只能由字母、数字和下划线组成，不能以数字开头，区分大小写，不能使用 if、for、class 等关键字。按 PEP 8 规范，普通变量用“蛇形命名” snake_case（全小写加下划线，如 user_name）；约定为常量的名字全部大写，如 MAX_RETRY = 3（Python 语法上并不阻止修改它，全大写是在提醒协作者“别改这个值”）。',
   code:`x = 10
y = x
x = "hello"
print(x, y)

a, b = 1, 2
a, b = b, a
print(a, b)

user_name = "lin"
MAX_RETRY = 3
print(user_name, MAX_RETRY)`,
   explain:[
    {at:'x = 10',text:'创建整数对象 10，把标签 x 贴到它身上。'},
    {at:'y = x',text:'把标签 y 也贴到 x 当前指向的同一个对象 10 上。'},
    {at:'x = "hello"',text:'把标签 x 改贴到新对象 "hello" 上，体现动态类型；y 依然指向 10。'},
    {at:'print(x, y)',text:'print 传入多个参数时默认用空格隔开，输出 hello 10。'},
    {at:'a, b = 1, 2',text:'多重赋值：同时把 a 指向 1、b 指向 2。'},
    {at:'a, b = b, a',text:'一键交换：Python 会先求值右边得到 (2, 1)，再依次解包赋给左边的 a 和 b。'},
    {at:'print(a, b)',text:'交换成功，输出 2 1。'},
    {at:'user_name = "lin"',text:'遵循蛇形命名规范（snake_case），单词全小写并用下划线连接。'},
    {at:'MAX_RETRY = 3',text:'全大写加下划线表示约定常量，提醒阅读者不要在后续代码里修改它。'},
    {at:'print(user_name, MAX_RETRY)',text:'打印 lin 3。'},
   ],
  },
  {
   title:'常用基本类型：int、float、bool、str、None',
   body:'Python 里每个对象都有明确的类型，入门最常用的五种基本类型是：\n一、int（整数）：Python 的整数是“任意精度”的，只要电脑内存够大，算几百位的大数也不会像 C、Java、Rust 那样发生“整数溢出”。大数字中间可以插入下划线方便肉眼读数，1_000_000 和 1000000 完全一样；\n二、float（浮点数 / 小数）：底层按 IEEE 754 双精度二进制存储。由于很多十进制小数在二进制里是无限循环小数，会出现 0.1 + 0.2 得到 0.30000000000000004 这样著名的精度误差。日常展示用 f-string 的 :.2f 或 round() 处理，涉及金额记账等精确场景则要用标准库的 decimal.Decimal；\n三、bool（布尔值）：只有 True（真）和 False（假）两个值，注意首字母必须大写（写 true 会报 NameError）。一个小冷知识：bool 其实是 int 的子类，True 当数字算等于 1，False 等于 0；\n四、str（字符串）：表示文本。单引号 \'...\' 和双引号 "..." 完全等价，里面包含单引号时外面用双引号就省得转义；三个引号 """...""" 可以直接写跨多行的文本；\n五、None：类型叫 NoneType，用来表示“空值 / 什么也没有 / 尚未赋值”。整个 Python 程序里只存在唯一一个 None 对象（单例）。',
   code:`population = 1_400_000_000
huge = 2 ** 100
approx = 0.1 + 0.2
is_ready = True
note = """第一行
第二行"""
result = None`,
   explain:[
    {at:'population = 1_400_000_000',text:'整数里可以用下划线 _ 做千分位分隔，解释器会自动忽略下划线，值就是 1400000000。'},
    {at:'huge = 2 ** 100',text:'** 是幂运算，2 的 100 次方高达 31 位数，Python 的 int 轻松精确保存，不会溢出。'},
    {at:'approx = 0.1 + 0.2',text:'浮点数的二进制表示误差会让 approx 的实际值等于 0.30000000000000004，而不是精确的 0.3。'},
    {at:'is_ready = True',text:'布尔值首字母大写；因为 bool 继承自 int，True + 1 在 Python 里甚至会算出 2。'},
    {at:'note = """第一行',to:'第二行"""',text:'三引号字符串可以自然跨越多行，换行符会被原样保留在字符串内容里。'},
    {at:'result = None',text:'None 表示暂时没有结果或空值，常用来给变量设初始占位。'},
   ],
  },
  {
   title:'动手试试：变量引用、基本类型与类型检查',
   body:'想知道一个变量当前指向什么类型，可以用内置函数 type(x) 查看精确类型，或者用 isinstance(x, 类型) 判断“是不是某种类型（或其子类）”。isinstance 还支持一次传多个类型组成的元组，比如 isinstance(a, (int, float)) 表示“是整数或小数都算对”。\n动手跑一遍下面的代码，亲眼看看大整数、浮点数误差、round() 保留小数，以及 bool 和 int 的父子关系。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '把 2 ** 80 改成 2 ** 200 再运行，体会 Python 任意精度整数的威力。',
     '在末尾加一行 print(True + True, False * 10)，运行看看 bool 参与算术运算时的结果。',
    ],
    expect:`交换后：a = 25, b = 10
2 的 80 次方：1208925819614629174706176
带下划线的整数：1000000
直接相加：0.30000000000000004
保留两位：0.3
<class 'int'> <class 'float'> <class 'bool'> <class 'NoneType'>
True 是 int 的子类吗？True
a 是 int 或 float 吗？True`,
   },
   code:`a = 10
b = 25
a, b = b, a
print(f"交换后：a = {a}, b = {b}")

huge = 2 ** 80
print(f"2 的 80 次方：{huge}")
print(f"带下划线的整数：{1_000_000}")

total = 0.1 + 0.2
print(f"直接相加：{total}")
print(f"保留两位：{round(total, 2)}")

flag = True
empty = None
print(type(a), type(total), type(flag), type(empty))
print(f"True 是 int 的子类吗？{isinstance(flag, int)}")
print(f"a 是 int 或 float 吗？{isinstance(a, (int, float))}")`,
   explain:[
    {at:'a = 10',to:'a, b = b, a',text:'定义两个整数变量，并用多重赋值一行交换它们的值，不需要临时变量。'},
    {at:'print(f"交换后',text:'打印交换后的结果：a 变成 25，b 变成 10。'},
    {at:'huge = 2 ** 80',to:'带下划线的整数',text:'计算 2 的 80 次方（25 位整数，毫无溢出压力），并展示 1_000_000 打印时不会带下划线。'},
    {at:'total = 0.1 + 0.2',to:'保留两位',text:'观察 0.1 + 0.2 的二进制浮点精度误差，再用 round(total, 2) 按两位小数取近似值 0.3。'},
    {at:'flag = True',to:'print(type(a)',text:'用 type() 依次查看四个对象的精确类型，可以看到 None 的类型是 NoneType。'},
    {at:'True 是 int 的子类吗',text:'isinstance 会把子类也算在内，因为 bool 继承自 int，所以这里返回 True（而 type(flag) is int 则是 False）。'},
    {at:'a 是 int 或 float 吗',text:'isinstance 第二个参数可以传类型元组，只要满足其中任意一种类型就返回 True。'},
   ],
  },
  {
   title:'类型转换与 input() 避坑',
   body:'Python 虽然是动态类型语言，但它同时是“强类型”的——不会像 JavaScript 那样偷偷把数字和字符串自动混在一起算。直接写 "18" + 1 会立刻抛出 TypeError，你必须显式调用类型转换函数：\n一、int(x)：转成整数。int("42") 得到 42；int(3.9) 会直接丢掉小数部分得到 3（向零截断，不是四舍五入）；注意 int("3.14") 会报 ValueError，带小数点的文字得先 float("3.14") 再 int()；\n二、float(x)：转成小数，比如 float("3.14") 得到 3.14，float(5) 得到 5.0；\n三、str(x)：把任何值转成字符串，方便拼接；\n四、bool(x)：把值转成布尔值。\n新手最常踩的两个大坑，一定要提前记牢：\n一、input() 返回的永远是字符串！哪怕用户在键盘上敲的是 18，age = input("年龄：") 拿到的也是 "18"。忘了转 int() 就做加法，写 age + "1" 会拼出 "181"，写 age + 1 会直接报错；\n二、bool("False") 是 True！在 Python 里，只要字符串不是空的（长度大于 0），哪怕里面的字写着 "False" 或 "0"，套上 bool() 全都是 True；只有空字符串 "" 才是 False。把文本解析成布尔值，应该老老实实比对文本内容，比如 text.strip().lower() == "true"。',
   code:`# 模拟 input() 拿到的字符串
age_text = "18"
print(age_text + "1")
print(int(age_text) + 1)

print(int(3.9), float("3.14"), str(42))
print(bool(""), bool("False"))`,
   explain:[
    {at:'age_text = "18"',text:'用字符串 "18" 模拟从 input() 读取到的用户输入（真实程序里 input() 返回的始终是 str）。'},
    {at:'print(age_text + "1")',text:'两个字符串用 + 会做拼接而不是算术加法，结果是 "181"——这就是忘了转类型的常见坑。'},
    {at:'print(int(age_text) + 1)',text:'先用 int() 把 "18" 转成整数 18，再加 1，才得到正确的数值 19。'},
    {at:'print(int(3.9)',text:'int(3.9) 直接截断小数得到 3；float("3.14") 转成 3.14；str(42) 转成字符串 "42"。'},
    {at:'print(bool("")',text:'空字符串 "" 转 bool 是 False；但 "False" 是长度为 5 的非空字符串，转 bool 居然是 True！'},
   ],
  },
  {
   title:'字符串基础：索引、不可变性与常用方法',
   body:'处理文字是 Python 的拿手好戏，先掌握字符串最核心的三个概念和五个高频方法：\n一、索引与负数索引：len(s) 得到字符个数；下标从 0 开始，s[0] 是第一个字符。Python 还支持从右往左数的“负数索引”，s[-1] 是最后一个字符，s[-2] 是倒数第二个；越界访问会报 IndexError；\n二、不可变性（immutable）：字符串一旦造出来就不能原地修改里面的某个字符，写 s[0] = "H" 会直接报 TypeError。所有字符串方法都不会改动原字符串，而是返回一个全新的字符串，别忘了把结果重新存进变量（如 s = s.strip()）；\n三、五个每天都用的方法：\n  · strip()：去掉首尾空白字符（空格、制表符、换行符），也可以传字符参数如 strip(",")；\n  · lower() / upper()：全部转小写或大写，忽略大小写比较时必用；\n  · split(sep)：按分隔符把字符串切成列表，不传参数时默认按任意连续空白切分并忽略首尾空白；\n  · sep.join(items)：和 split 相反，用分隔符把一组字符串拼回一个字符串（注意是谁调方法：分隔符在前面，列表在括号里）；\n  · replace(old, new)：把所有 old 子串替换成 new，返回新字符串。',
   code:`word = "Python"
print(len(word), word[0], word[-1])

raw = "  Hello, World!  "
clean = raw.strip().lower().replace("world", "python")
print(clean)

parts = "a,b,c".split(",")
joined = "-".join(parts)
print(parts, joined)`,
   explain:[
    {at:'word = "Python"',text:'定义一个长度为 6 的字符串。'},
    {at:'print(len(word)',text:'len(word) 是 6，正向索引 word[0] 拿到首字母 P，负数索引 word[-1] 拿到尾字母 n。'},
    {at:'raw = "  Hello',text:'带前后空格和大小写混合的原始字符串。'},
    {at:'clean = raw.strip()',text:'链式调用三个方法：先 strip() 去掉首尾空格，再 lower() 全转小写，最后 replace() 把 world 换成 python，结果是 "hello, python!"；原变量 raw 保持不变。'},
    {at:'print(clean)',text:'打印清洗后的字符串 hello, python!。'},
    {at:'parts = "a,b,c".split(",")',text:'按逗号切分，得到包含三个元素的列表 ["a", "b", "c"]。'},
    {at:'joined = "-".join(parts)',text:'用短横线 "-" 作为粘合剂，把列表里的字符串拼回 "a-b-c"。'},
    {at:'print(parts, joined)',text:'打印切分后的列表和重新拼接的字符串。'},
   ],
  },
  {
   title:'动手试试：字符串清洗与类型转换',
   body:'真实开发里，从表单、日志或 CSV 文件读进来的一行文本往往满是多余空格、大小写不统一，而且所有字段都是字符串。下面我们用一个模拟输入变量 raw（不用交互式 input()，方便直接运行出确定输出），把一条脏数据一步步洗干净、转成正确类型，并避开 bool("False") 的坑。\n代码里顺便用到了 .title() 方法，它会把每个英文单词的首字母转成大写、其余字母转小写。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '把 raw 里的 False 改成 "  TRUE  " 再运行，验证 real_bool 能不能正确识别成 True。',
     '把 " | ".join(tags) 的分隔符改成 " / "，看看标签行怎么变化。',
    ],
    expect:`姓名：Zhang Wei，明年 23 岁，成绩：91.5
bool('False') 的坑：True，正确解析：False
首尾字符：Z 和 i
标签：python | 入门 | 第1关`,
   },
   code:`raw = "  zhang_wei , 22 , 91.5 , False  "
parts = raw.strip().split(",")

name = parts[0].strip().replace("_", " ").title()
age = int(parts[1].strip())
score = float(parts[2].strip())
flag_text = parts[3].strip()

wrong_bool = bool(flag_text)
real_bool = flag_text.lower() == "true"

tags = ["python", "入门", "第1关"]
joined = " | ".join(tags)
print(f"姓名：{name}，明年 {age + 1} 岁，成绩：{score:.1f}")
print(f"bool('False') 的坑：{wrong_bool}，正确解析：{real_bool}")
print(f"首尾字符：{name[0]} 和 {name[-1]}")
print(f"标签：{joined}")`,
   explain:[
    {at:'raw = "  zhang_wei',text:'模拟一行带多余空格和下划线的原始输入字符串。'},
    {at:'parts = raw.strip().split(",")',text:'先去掉整串首尾空白，再按逗号拆成 4 段；注意逗号附近的空格还留在各段里，下面需要逐段 strip()。'},
    {at:'name = parts[0]',text:'取出姓名段，去掉空格，把下划线替换成空格，再用 title() 把每个单词首字母大写，得到 "Zhang Wei"。'},
    {at:'age = int(parts[1]',to:'score = float(parts[2]',text:'分别把年龄和成绩去掉空白后转成 int 和 float，这样后面就能做算术运算和小数格式化。'},
    {at:'flag_text = parts[3]',text:'取出第四段文本 "False"。'},
    {at:'wrong_bool = bool(flag_text)',text:'反面教材：非空字符串 "False" 直接套 bool() 会得到 True！'},
    {at:'real_bool = flag_text.lower()',text:'正确做法：先统一转小写再和 "true" 比较，得到准确的布尔值 False。'},
    {at:'tags = ["python"',to:'joined = " | ".join(tags)',text:'用 " | " 把三个标签拼成一条字符串。'},
    {at:'print(f"姓名',to:'print(f"标签',text:'用 f-string 依次输出清洗结果、布尔坑对比、正负索引取首尾字符以及拼接后的标签。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-start-1',
   q:'在 Windows 上安装 Python 3 时，安装向导首页最容易漏勾、漏了会导致终端找不到 python 命令的选项是？',
   options:[
    'Install launcher for all users',
    'Add python.exe to PATH',
    'Download debugging symbols',
    'Precompile standard library',
   ],
   why:[
    '这是给所有系统用户安装 py 启动器，并不能把 python.exe 自动加入系统 PATH。',
    '',
    '这是下载调试符号文件，只有排查 C 扩展底层崩溃时才会用到。',
    '这是提前编译标准库字节码来略微加快首次导入，与终端能否找到 python 命令无关。',
   ],
   answer:1,
   explain:'勾选 Add python.exe to PATH 会把 Python 的安装目录写入系统环境变量 PATH，这样在 PowerShell 或命令提示符里就能直接运行 python 命令。',
  },
  {
   id:'py-start-2',
   q:'Python 用什么语法来划分 if、循环、函数等代码块？',
   options:[
    '用一对花括号 { } 包裹代码',
    '用 begin 和 end 关键字配对',
    '用冒号配合统一的行首空格缩进',
    '用分号分隔块内每一条语句',
   ],
   why:[
    '花括号是 C、Java、JavaScript、Rust 等语言的做法，在 Python 里花括号用来写字典或集合。',
    'begin / end 是 Ruby、Pascal 或部分 SQL 方言的写法，Python 不使用它们划分代码块。',
    '',
    '分号只用于偶尔把多条简单语句写在同一行，并不能表示代码块的层级。',
   ],
   answer:2,
   explain:'Python 使用语句末尾的冒号 : 配合统一的 4 个空格缩进来界定代码块，同一代码块内的行首缩进必须严格对齐。',
  },
  {
   id:'py-start-3',
   type:'multi',
   q:'下面关于 Python 变量与命名的说法，哪些是正确的？（多选）',
   options:[
    '变量更像贴在对象上的标签而非固定容器',
    '同一个变量名可以重新指向不同类型的对象',
    '普通变量习惯采用小写加下划线的蛇形命名',
    '变量名可以以数字开头只要后面带有字母',
   ],
   why:[
    '',
    '',
    '',
    'Python 标识符不能以数字开头，只能以字母或下划线开头，像 2nd_name 会直接报语法错误。',
   ],
   answers:[0,1,2],
   explain:'Python 变量是对内存对象的引用（标签），支持动态类型，PEP 8 规范推荐普通变量用 snake_case；但标识符开头不能是数字。',
  },
  {
   id:'py-start-4',
   type:'judge',
   q:'Python 的 int 是任意精度整数，只要内存足够，不会像固定 64 位整数那样发生数值溢出。',
   answer:true,
   explain:'Python 3 的 int 会按需动态扩展占用字节，可以精确计算几百甚至上千位的大整数，不存在 C/Java/Rust 那种固定位数整数溢出。',
  },
  {
   id:'py-start-5',
   q:'下面这段代码运行后会打印什么？',
   code:'price = 19.987\nprint(f"{price:.2f}")',
   options:['19.99','19.98','19.987','20.00'],
   why:[
    '',
    ':.2f 会按小数位四舍五入，不会直接截断掉末尾的 7。',
    ':.2f 指定保留两位小数，不会保留全部三位小数。',
    '19.987 保留两位小数是 19.99，还没有进位到 20.00。',
   ],
   answer:0,
   explain:'f-string 中的 :.2f 表示按浮点数格式保留两位小数并四舍五入，19.987 变成 19.99。',
  },
  {
   id:'py-start-6',
   type:'fill',
   q:'在 Python 里想查看一个值属于什么精确类型，可以调用内置函数 ＿（只写函数名，不带括号）。',
   accepted:['type'],
   explain:'type(x) 返回对象 x 的精确类型，比如 type(42) 返回 <class \'int\'>；如果要把子类也算在内，则用 isinstance()。',
  },
  {
   id:'py-start-7',
   q:'用户通过 input() 输入了 18，程序执行 age = input() 后再执行 print(age + "1")，结果是？',
   options:[
    '打印整数计算结果 19',
    '抛出 TypeError 错误',
    '打印文本内容 "18 + 1"',
    '打印拼接结果 "181"',
   ],
   why:[
    'input() 返回的是字符串 "18" 而不是整数 18，直接加 "1" 不会做数值加法。',
    'age 是 str，"1" 也是 str，两个字符串相加是合法的拼接操作，不会报 TypeError（写 age + 1 才会报错）。',
    '字符串拼接会把两段文本直接首尾连在一起，不会自动插入加号和空格。',
    '',
   ],
   answer:3,
   explain:'input() 返回的始终是字符串，所以 "18" + "1" 执行的是字符串拼接，打印 181；想做数学加法必须先 int(age)。',
  },
  {
   id:'py-start-8',
   q:'表达式 bool("False") 的求值结果是什么？',
   options:[
    'False，因为字符串内容是假',
    'True，因为非空字符串都为真',
    'None，因为字符串无法转布尔',
    '报错，因为不能直接转换文本',
   ],
   why:[
    'bool() 不会去解析字符串里的英文单词含义，它只看字符串是不是空的。',
    '',
    'bool() 返回值属于 bool 类型，不会返回 None。',
    'Python 允许对任意对象调用 bool()，不会报错。',
   ],
   answer:1,
   explain:'只要字符串长度大于 0，bool(s) 就是 True；只有空字符串 "" 转成布尔值才是 False。要解析文本里的真假应写 s.strip().lower() == "true"。',
  },
  {
   id:'py-start-9',
   type:'judge',
   q:'执行 s = "python" 后，可以通过 s[0] = "P" 直接把字符串首字母改成大写。',
   answer:false,
   explain:'Python 字符串是不可变对象（immutable），不允许通过下标原地修改字符，s[0] = "P" 会抛出 TypeError；应当用 s.capitalize() 或拼接生成新字符串。',
  },
  {
   id:'py-start-10',
   type:'multi',
   q:'关于下面这段代码，哪些说法是正确的？（多选）',
   code:'s = "  hello,python  "\ns.strip()\nprint(s[-1])',
   options:[
    's.strip() 会直接原地删掉原变量 s 的首尾空格',
    '原变量 s 未被重新赋值，内容依然带有首尾空格',
    '负数索引 s[-1] 取到的是单词末尾的字母 n',
    '负数索引 s[-1] 取到的是字符串末尾的空格',
   ],
   why:[
    '字符串不可变，s.strip() 只是返回一个新字符串，不会原地修改 s。',
    '',
    '因为 s 末尾的空格并没有被去掉，最后一个字符不是字母 n。',
    '',
   ],
   answers:[1,3],
   explain:'字符串不可变，调用 s.strip() 却没有写 s = s.strip() 接住返回值，原字符串 s 依然前后带空格，因此 s[-1] 取到的是最后一个空格字符。',
  },
  {
   id:'py-start-11',
   q:'想把列表 ["2026", "05", "01"] 用短横线拼成字符串 "2026-05-01"，下面哪种写法是对的？',
   options:[
    '["2026", "05", "01"].join("-")',
    'join("-", ["2026", "05", "01"])',
    '"-".join(["2026", "05", "01"])',
    '["2026", "05", "01"].split("-")',
   ],
   why:[
    '那是 JavaScript 的数组方法写法，Python 的列表对象没有 join 方法。',
    'Python 没有名为 join 的内置全局函数，join 是字符串对象的方法。',
    '',
    'split 是把字符串拆成列表的方法，而且列表对象也没有 split 方法。',
   ],
   answer:2,
   explain:'在 Python 中，join 是分隔符字符串的方法，格式为 分隔符.join(字符串序列)，所以应写作 "-".join(["2026", "05", "01"])。',
  },
  {
   id:'py-start-12',
   type:'fill',
   q:'在 Python 中，表示“空值 / 什么也没有”的唯一单例值写作 ＿（注意首字母大小写）。',
   accepted:['None'],
   explain:'None 的类型是 NoneType，首字母必须大写，整个 Python 程序里只存在唯一一个 None 对象。',
  },
  {
   id:'py-start-13',
   type:'short',
   q:'为什么说 Python 里的变量更像“贴在对象上的标签”，而不是“装数据的盒子”？请结合 a = 10、b = a 以及后续重新赋值的过程说明。',
   reference:'在 Python 中，数据对象独立存在内存中，变量名只是指向该对象的引用（标签）。执行 a = 10 是把标签 a 贴到整数对象 10 上；执行 b = a 是把标签 b 也贴到同一个对象 10 上，并不会复制出新数据。之后如果再写 a = "hi"，只是把标签 a 撕下来改贴到新的字符串对象 "hi" 上——这既解释了为什么同一个变量可以随时指向不同类型（动态类型），也解释了为什么改动 a 的绑定不会影响依然贴在 10 上的 b。',
   points:[
    '对象独立存在内存中，变量名是指向对象的引用/标签',
    'b = a 让两个标签指向同一个对象，而不是复制一份数据',
    '给 a 重新赋不同类型的值只是改贴标签，体现动态类型',
    '重新绑定 a 不会改变 b 原本指向的对象',
   ],
   explain:'建立“变量是标签”的模型非常关键，后面学到列表、字典等可变对象时，就能一眼明白为什么通过一个标签修改列表内容，另一个指向同一列表的标签也会看到变化。',
  },
  {
   id:'py-start-14',
   type:'code',
   q:'给定模拟输入 raw = "  ming , 19 , 86.456  "，写一段 Python 代码：把三个字段拆开并去掉多余空格，将姓名首字母大写、年龄转成整数并加 1、成绩转成浮点数，最后用 f-string 打印一行：Ming 明年 20 岁，成绩 86.46 分。',
   reference:'raw = "  ming , 19 , 86.456  "\nparts = raw.strip().split(",")\nname = parts[0].strip().capitalize()\nage = int(parts[1].strip())\nscore = float(parts[2].strip())\nprint(f"{name} 明年 {age + 1} 岁，成绩 {score:.2f} 分")',
   points:[
    '使用 strip() 和 split(",") 拆分并清除各字段多余空白',
    '将姓名首字母大写（如 capitalize() 或 title()），年龄转为 int，成绩转为 float',
    '在 f-string 中计算 age + 1 并用 :.2f 保留两位小数',
    '输出文本与题目要求的格式完全一致',
   ],
   explain:'raw.strip() 只去掉整串首尾的空白，按逗号 split(",") 后每段两端仍可能带空格，对各段分别 strip() 再转换最稳妥。',
  },
 ],
};

// Python 入门（二）：运算符、条件判断与循环。
export const pyFlow:AiLevel={
 id:'py-flow',
 title:'运算符、条件判断与循环',
 summary:'除法与整除、== 与 is、真值测试与短路逻辑、if/elif、for/while 循环与 match/case',
 lessons:[
  {
   title:'算术运算符与容易踩的坑',
   body:'除了加 +、减 -、乘 * 之外，Python 里有四个特别容易和其他语言记混的算术运算符：\n一、真除法 /：不管两边是不是整数，/ 的结果一律是浮点数 float。比如 7 / 2 是 3.5，就连能整除的 6 / 2 得到的也是 3.0；\n二、向下取整除 //（地板除）：除完后向负无穷方向取整（找小于等于商的最大整数）。正数时 7 // 2 等于 3 很直观；负数最容易踩坑：-7 / 2 是 -3.5，比它小的最大整数是 -4，所以 -7 // 2 == -4，而不是 C/Java 里的 -3；\n三、取余 %（取模）：Python 严格遵守恒等式 a == (a // b) * b + (a % b)，余数与除数 b 同号。所以 -7 % 2 等于 1（因为 (-4) * 2 + 1 == -7），用来算星期循环或环形下标特别顺手；\n四、幂运算 **：2 ** 10 是 1024，9 ** 0.5 是 3.0。注意 ** 的优先级高于一元负号，-2 ** 2 算的是 -(2 ** 2) 等于 -4，想算负 2 的平方必须加括号写成 (-2) ** 2。\n另外，Python 支持 +=、-=、*=、//= 等复合赋值，但没有 ++ 和 --，加一就老老实实写 n += 1。',
   code:`print(6 / 2, 7 / 2)
print(7 // 2, -7 // 2)
print(7 % 2, -7 % 2)
print(-2 ** 2, (-2) ** 2)

count = 10
count += 1
print(count)`,
   explain:[
    {at:'print(6 / 2, 7 / 2)',text:'真除法 / 无论能否整除都返回 float，输出 3.0 3.5。'},
    {at:'print(7 // 2, -7 // 2)',text:'地板除向负无穷取整：7 // 2 是 3，-7 // 2 是 -4（不是 -3）。'},
    {at:'print(7 % 2, -7 % 2)',text:'余数与除数 2 同号：7 % 2 是 1，-7 % 2 也是 1。'},
    {at:'print(-2 ** 2, (-2) ** 2)',text:'** 优先级高于负号，所以 -2 ** 2 是 -4；加括号后的 (-2) ** 2 才是 4。'},
    {at:'count = 10',to:'print(count)',text:'Python 没有 count++，自增 1 用复合赋值 count += 1，输出 11。'},
   ],
  },
  {
   title:'比较、链式比较与 == vs is',
   body:'Python 的比较运算符有 ==、!=、<、<=、>、>=，结果都是 bool。\n有一个非常好用的语法糖叫“链式比较”：你可以直接像数学课本那样写 0 < x < 10 或 60 <= score < 90，它等价于 (0 < x) and (x < 10)，而且中间的表达式只会求值一次，读起来非常自然。\n接下来是面试和日常开发都极易考到的区别：== 和 is。\n一、== 比较“值相等”：两个对象的内容是不是一样；\n二、is 比较“身份相同”：两个变量贴的是不是内存中同一个对象的标签（等价于 id(a) == id(b)）。\n记住两条实用原则：\n一、判断 None 一律用 x is None 或 x is not None（PEP 8 规范）。因为 None 全局唯一，用 is 既快又不会被自定义对象的 == 逻辑干扰；\n二、千万别用 is 去比较普通整数或字符串的值！CPython 为了省内存会悄悄复用小整数（-5 到 256）和部分简单字符串，偶尔会让 a is b 碰巧为 True，一旦换成更大的数字或运行时拼出来的字符串就变成 False，埋下非常隐蔽的 Bug。比较值统一用 ==。',
   code:`score = 78
print(60 <= score < 90)

a = [1, 2]
b = [1, 2]
c = a
print(a == b, a is b, a is c)

token = None
print(token is None, token is not None)`,
   explain:[
    {at:'score = 78',to:'print(60 <= score < 90)',text:'链式比较一次判断 score 是否落在 [60, 90) 区间内，结果是 True。'},
    {at:'a = [1, 2]',to:'c = a',text:'a 和 b 是两个分别创建的列表，内容相同但地址不同；c 和 a 贴在同一个列表对象上。'},
    {at:'print(a == b',text:'a == b 为 True（值相同），a is b 为 False（不是同一个对象），a is c 为 True（指向同一个对象）。'},
    {at:'token = None',to:'token is not None)',text:'判断空值规范写法是 is None / is not None，输出 True False。'},
   ],
  },
  {
   title:'真值测试（Truthiness）与逻辑运算符',
   body:'在 Python 的 if 或 while 条件里，不一定要写比较式——任何对象都可以直接做“真值测试”。记住哪些值是“假（Falsy）”，其余绝大多数都是“真（Truthy）”：\n一、False 和 None；\n二、各种形式的零：0、0.0、0j；\n三、空字符串与空容器：""、[]、()、{}、set()。\n因此判断列表或字符串是否非空，地道的 Python 写法直接是 if items:，不用啰嗦地写 if len(items) > 0:。\n逻辑运算符有三个：and（且）、or（或）、not（非），优先级顺序是 not > and > or。\n特别要注意的是，and 和 or 采用“短路求值”，而且它们返回的不是强行转成的 True/False，而是“决定整个表达式结果的那个操作数本身”：\n一、a and b：若 a 为假，直接短路返回 a（根本不计算 b）；若 a 为真，返回 b；\n二、a or b：若 a 为真，直接短路返回 a（根本不计算 b）；若 a 为假，返回 b。\n这带来两个经典用法：一是防报错（count > 0 and total / count >= 60，当 count 为 0 时右边压根不执行，避免除以零）；二是设兜底默认值（name = nickname or "匿名用户"——但注意如果合法值可能是 0 或 ""，就别用 or，应改用 if x is None 判断）。',
   code:`items = []
if not items:
    print("列表是空的")

nickname = ""
display = nickname or "匿名用户"
print(display)

print("ok" and 0 and "不会执行到这里")

count = 0
safe = count > 0 and (100 / count > 10)
print(safe)`,
   explain:[
    {at:'items = []',to:'print("列表是空的")',text:'空列表 [] 在真值测试中为假，not items 变成 True，于是进入分支。'},
    {at:'nickname = ""',to:'print(display)',text:'空字符串 "" 为假，or 继续求值右边并返回 "匿名用户" 本身，而不是返回 True。'},
    {at:'print("ok" and 0',text:'"ok" 为真继续往右看，遇到假值 0 立刻短路，直接返回 0，最右边的字符串不会被求值。'},
    {at:'count = 0',to:'print(safe)',text:'count > 0 为 False 时 and 直接短路返回 False，右边的 100 / count 根本不执行，成功避开 ZeroDivisionError。'},
   ],
  },
  {
   title:'if / elif / else 与条件表达式',
   body:'条件分支用来让程序根据不同情况走不同路径：\n一、多分支用 if ...:、elif ...:（else if 的缩写）、else:。解释器从上往下逐条检查，一旦命中第一个为真的分支，执行完它的缩进代码块就会跳过后面所有分支；\n二、pass 占位符：有时你先把分支框架搭出来，里面暂时不想写代码，但 Python 不允许冒号下面空着，这时写一行 pass 表示“什么也不做”，就能顺利通过语法检查；\n三、条件表达式（三元运算符）：如果只是简单的二选一赋值，可以一行写成“真时的值 if 条件 else 假时的值”，比如 label = "及格" if score >= 60 else "不及格"。注意阅读顺序和 C/Java 的 ? : 相反，更接近英语句子；如果分支超过两个或逻辑变复杂，还是老老实实写多行 if / elif / else，可读性第一。',
   code:`score = 85
if score >= 90:
    level = "优秀"
elif score >= 60:
    level = "及格"
else:
    level = "不及格"

tag = "通过" if score >= 60 else "补考"
print(level, tag)

debug = False
if debug:
    pass`,
   explain:[
    {at:'score = 85',text:'设定待判断的分数 85。'},
    {at:'if score >= 90:',to:'level = "优秀"',text:'先检查是否达到 90 分，85 >= 90 为假，跳过这个分支。'},
    {at:'elif score >= 60:',to:'level = "及格"',text:'接着检查 elif 条件，85 >= 60 为真，把 level 设为 "及格"，并跳过后面的 else。'},
    {at:'else:',to:'level = "不及格"',text:'前面所有条件都不成立时的兜底分支。'},
    {at:'tag = "通过"',text:'条件表达式（三元写法）：条件 score >= 60 为真时取左边 "通过"，为假时取右边 "补考"。'},
    {at:'print(level, tag)',text:'输出 及格 通过。'},
    {at:'debug = False',to:'pass',text:'pass 是空操作占位语句，用来占住还没实现的缩进代码块，避免报缩进错误。'},
   ],
  },
  {
   title:'动手试试：运算符、== vs is 与条件评级',
   body:'把前面四张卡片的重点串在一个脚本里跑一遍：亲眼确认 -7 // 2 和 -2 ** 2 的结果、对比两个等值列表的 == 和 is、体验 or 短路设默认值，以及链式比较搭配条件表达式给成绩评级。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '把 score 分别改成 95 和 52 运行一次，观察评级和及格状态的变化。',
     '把 nickname 改成 "小陈" 再运行，看看 or 短路后 display 会输出什么。',
    ],
    expect:`真除法：7 / 2 = 3.5
整除：7 // 2 = 3，-7 // 2 = -4
取余：7 % 2 = 1，-7 % 2 = 1
幂运算：-2 ** 2 = -4，(-2) ** 2 = 4
值相等吗 (==)：True
同一对象吗 (is)：False
显示昵称：匿名学习者
76 分：良好（及格）
当前暂无加分记录`,
   },
   code:`print(f"真除法：7 / 2 = {7 / 2}")
print(f"整除：7 // 2 = {7 // 2}，-7 // 2 = {-7 // 2}")
print(f"取余：7 % 2 = {7 % 2}，-7 % 2 = {-7 % 2}")
print(f"幂运算：-2 ** 2 = {-2 ** 2}，(-2) ** 2 = {(-2) ** 2}")

list_a = [1, 2, 3]
list_b = [1, 2, 3]
print(f"值相等吗 (==)：{list_a == list_b}")
print(f"同一对象吗 (is)：{list_a is list_b}")

nickname = ""
display = nickname or "匿名学习者"
print(f"显示昵称：{display}")

score = 76
if score >= 90:
    grade = "优秀"
elif 60 <= score < 90:
    grade = "良好"
else:
    grade = "待提高"
status = "及格" if score >= 60 else "不及格"
print(f"{score} 分：{grade}（{status}）")

bonus = None
if bonus is None:
    print("当前暂无加分记录")`,
   explain:[
    {at:'print(f"真除法',to:'幂运算',text:'依次验证真除法 / 返回浮点、负数地板除 // 向负无穷取整、取余 % 与除数同号，以及 ** 优先级高于负号。'},
    {at:'list_a = [1, 2, 3]',to:'同一对象吗 (is)',text:'两个独立创建的列表内容一样，所以 == 为 True；但它们占两块不同内存，所以 is 为 False。'},
    {at:'nickname = ""',to:'显示昵称',text:'空字符串为假，or 返回右边的兜底值 "匿名学习者"。'},
    {at:'score = 76',to:'grade = "待提高"',text:'多分支判断评级，其中 elif 用到了链式比较 60 <= score < 90。'},
    {at:'status = "及格"',to:'print(f"{score}',text:'用条件表达式算出及格状态，并把分数、评级和状态拼成一行输出。'},
    {at:'bonus = None',to:'print("当前暂无加分记录")',text:'用规范写法 is None 判断空值，命中后打印提示。'},
   ],
  },
  {
   title:'for 循环、range、enumerate 与 zip',
   body:'Python 的 for 循环不是靠手写计数器 i++ 驱动，而是直接“从序列里依次把每个元素拿出来”：for item in 序列:。搭配三个超实用的内置工具，90% 的遍历都能写得干净又不容易越界：\n一、range(start, stop, step)：按需生成整数序列，规则是“左闭右开”（包含 start，不包含 stop）。只传一个数 range(5) 生成 0, 1, 2, 3, 4；传两个数 range(2, 6) 生成 2, 3, 4, 5；传步长 range(10, 0, -2) 倒数生成 10, 8, 6, 4, 2。range 是惰性的，哪怕写 range(1_000_000) 也不会瞬间占满内存；\n二、enumerate(items, start=1)：遍历时如果既要元素又要序号，别再写 for i in range(len(items)) 了！enumerate 会把“(序号, 元素)”成对交给你，start 默认从 0 开始，做榜单或菜单时传 start=1 特别顺手；\n三、zip(a, b)：把两个或多个序列同一位置的元素配对打包，实现并行遍历。默认在较短的序列用完时停止（Python 3.10+ 支持传 strict=True，两边长度不一致时会主动报错提醒）。',
   code:`for n in range(1, 6, 2):
    print(n)

fruits = ["苹果", "香蕉", "橙子"]
for idx, fruit in enumerate(fruits, start=1):
    print(f"{idx}. {fruit}")

names = ["甲", "乙"]
scores = [90, 85]
for name, score in zip(names, scores):
    print(f"{name}: {score}")`,
   explain:[
    {at:'for n in range(1, 6, 2):',to:'print(n)',text:'range(1, 6, 2) 从 1 开始每次加 2、不包含 6，依次打印 1、3、5。'},
    {at:'fruits = ["苹果"',to:'print(f"{idx}. {fruit}")',text:'enumerate(..., start=1) 每次吐出一个 (编号, 水果) 二元组，循环头直接拆包成 idx 和 fruit，打印 1. 苹果 到 3. 橙子。'},
    {at:'names = ["甲"',to:'print(f"{name}: {score}")',text:'zip(names, scores) 把同位置的名字和分数配对，依次打印 甲: 90 和 乙: 85。'},
   ],
  },
  {
   title:'while 循环、break、continue 与 for...else',
   body:'当你事先不知道要循环多少次，只知道“只要某个条件还成立就继续做”时，就用 while 条件:。写 while 时一定要确保循环体内能让条件最终变假（或者有 break 出口），否则会陷入死循环（在终端里按 Ctrl + C 可以强制中断）。\n控制循环节奏的两个关键字：\n一、break：立刻跳出当前所在的这一层循环；\n二、continue：跳过这一轮剩下的代码，直接进入下一轮循环。\n最后认识一个 Python 独具特色、面试也爱问的语法：for ... else:（while 同样支持 else）。\n初学者第一次见到循环后面跟 else 往往会困惑，其实把 else 理解成“no-break（没有被中途打断）”就瞬间通透了：\n只要循环正常跑完全部元素、一次 break 都没触发，就会执行 else 分支；如果中途执行了 break，else 就会被跳过。\n它非常适合写“在集合里查找某个目标”的逻辑，不用额外定义一个 found = False 标志变量来回改来改去。',
   code:`n = 0
while n < 5:
    n += 1
    if n == 3:
        continue
    print(n)

nums = [4, 8, 15, 16]
for x in nums:
    if x == 10:
        print("找到了 10")
        break
else:
    print("没找到 10")`,
   explain:[
    {at:'n = 0',to:'while n < 5:',text:'初始化计数器 n，只要 n 小于 5 就继续循环。'},
    {at:'n += 1',text:'每轮先把 n 加 1（注意写在 continue 前面，否则遇到 continue 时 n 不变会导致死循环）。'},
    {at:'if n == 3:',to:'continue',text:'当 n 等于 3 时跳过本次剩下的 print(n)，直接进入下一轮。'},
    {at:'print(n)',text:'最终打印 1、2、4、5，唯独跳过了 3。'},
    {at:'nums = [4, 8, 15, 16]',to:'for x in nums:',text:'遍历列表查找目标数字 10。'},
    {at:'if x == 10:',to:'break',text:'如果命中 10 就打印提示并 break 跳出（同时跳过 else）。'},
    {at:'else:',to:'print("没找到 10")',text:'整个列表里没有 10，循环正常走完未触发 break，于是执行 else 打印“没找到 10”。'},
   ],
  },
  {
   title:'动手试试：enumerate、zip 与 for...else 查找',
   body:'把几个循环利器组合起来实战一次：先用 enumerate 和 zip 套在一起打印带编号的成绩单（注意 enumerate(zip(...)) 每次产出 (idx, (name, score))，可以直接嵌套拆包），再用 range + continue 求奇数和、用 while 倒计时，最后用 for...else 分别测试“找得到”和“找不到”两种情况。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '把 range(1, 10) 改成 range(1, 11) 并把 if n % 2 == 0 改成 != 0，计算 1 到 10 的偶数和并运行验证。',
     '在 for target in [95, 100] 里多加一个 72，观察命中时 else 会不会被执行。',
    ],
    expect:`第 1 位：小陈 - 88 分
第 2 位：小林 - 95 分
第 3 位：小周 - 72 分
1 到 9 的奇数和：25
倒计时：3
倒计时：2
倒计时：1
找到了 95 分，提前结束搜索
遍历完毕，没有找到 100 分`,
   },
   code:`students = ["小陈", "小林", "小周"]
scores = [88, 95, 72]

for idx, (name, score) in enumerate(zip(students, scores), start=1):
    print(f"第 {idx} 位：{name} - {score} 分")

odd_sum = 0
for n in range(1, 10):
    if n % 2 == 0:
        continue
    odd_sum += n
print(f"1 到 9 的奇数和：{odd_sum}")

countdown = 3
while countdown > 0:
    print(f"倒计时：{countdown}")
    countdown -= 1

for target in [95, 100]:
    for s in scores:
        if s == target:
            print(f"找到了 {target} 分，提前结束搜索")
            break
    else:
        print(f"遍历完毕，没有找到 {target} 分")`,
   explain:[
    {at:'students = ["小陈"',to:'scores = [88, 95, 72]',text:'准备两个等长列表，分别存放学生姓名和对应分数。'},
    {at:'for idx, (name, score)',to:'print(f"第 {idx} 位',text:'zip 先把姓名和分数两两配对，enumerate 再给每一对加上从 1 开始的编号，循环头一次解包成 idx、name、score。'},
    {at:'odd_sum = 0',to:'print(f"1 到 9',text:'遍历 1 到 9，遇到偶数就用 continue 跳过，把奇数 1+3+5+7+9 累加得到 25。'},
    {at:'countdown = 3',to:'countdown -= 1',text:'while 倒计时，每次打印后减 1，减到 0 时条件变假结束循环。'},
    {at:'for target in [95, 100]:',text:'外层循环依次测试两个目标分：95（存在）和 100（不存在）。'},
    {at:'for s in scores:',to:'break',text:'内层循环找 95 时命中并触发 break，因此跳过 else；找 100 时全程没命中。'},
    {at:'else:',to:'print(f"遍历完毕',text:'与内层 for 对齐的 else：找 100 正常走完没有 break，进入这里打印未找到。'},
   ],
  },
  {
   title:'结构化模式匹配 match / case（Python 3.10+）',
   body:'从 Python 3.10 开始，语言正式引入了 match / case。第一眼看它像其他语言的 switch，但它比 switch 强大得多——它的全称是“结构化模式匹配（Structural Pattern Matching）”，不仅能比对值，还能按数据结构“拆形状”。\n先记住一个省心的规则：Python 的每个 case 执行完后会自动离开整个 match，不需要像 C/Java 那样手动写 break。\n四大核心本领：\n一、用 | 匹配多个候选值：比如 case 200 | 201: 表示 200 或 201 都命中；\n二、解构序列和字典并绑定变量：比如 case ["move", x, y]: 要求列表恰好 3 个元素且第一个是 "move"，同时把后两个值绑给 x 和 y；用 *rest 可以收拢不定长的剩余元素；匹配字典 case {"type": "click", "x": x}: 时，只检查列出来的键是否匹配，字典里多出来的其他键会自动忽略；\n三、守卫条件（guard）：在模式后面接 if 条件，例如 case ["pay", amount] if amount > 0:，只有形状对得上且守卫条件为真才会命中；\n四、通配符 _：case _: 匹配其余所有情况，不绑定变量，通常放在最后兜底。\n顺带避个小坑：写一个裸名字比如 case OK: 不会拿去和外部变量 OK 比值，而是把任何值都捕获进新变量 OK！真要按外部常量比值，名字里必须带点号（比如枚举 Status.OK）。',
   code:`def handle(msg):
    match msg:
        case ["ping" | "hello"]:
            return "收到问候"
        case ["pay", amount] if amount > 0:
            return f"入账 {amount} 元"
        case {"type": "error", "code": code}:
            return f"错误码 {code}"
        case _:
            return "未知消息"`,
   explain:[
    {at:'def handle(msg):',text:'定义一个接收消息 msg 的函数（函数语法下一关会系统展开，这里先把它当成打包一段逻辑的写法）。'},
    {at:'match msg:',text:'对 msg 开始模式匹配，从上往下依次尝试每个 case。'},
    {at:'case ["ping" | "hello"]:',to:'return "收到问候"',text:'匹配单元素列表，且元素是 "ping" 或 "hello" 之一。'},
    {at:'case ["pay", amount] if amount > 0:',to:'return f"入账',text:'解构两元素列表，把第二项绑定为 amount，并且要求守卫条件 amount > 0 成立才命中。'},
    {at:'case {"type": "error"',to:'return f"错误码',text:'匹配字典模式：只要包含 "type": "error" 和键 "code" 即可命中并取出 code，字典里若还有别的键会被自动忽略。'},
    {at:'case _:',to:'return "未知消息"',text:'下划线 _ 是通配符，兜底处理上面都没匹配到的所有情况。'},
   ],
  },
  {
   title:'动手试试：用 match/case 解析命令与结构化数据',
   body:'我们来写一个迷你的命令行指令解析器，再用 match/case 处理一条模拟的登录事件字典。把 | 多值匹配、序列解构、*nums 变长捕获、if 守卫条件、字典模式和 _ 通配符一次练全。',
   practice:{
    steps:[
     '确认装好了 Python 3：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 python --version（Mac 可能是 python3 --version），看到 3.x 版本号即可（本卡片需要 Python 3.10 及以上版本）。',
     '新建一个脚本文件（如 demo.py），把下面的代码复制进去保存。',
     '在终端里进入文件所在目录，运行 python demo.py（Mac 用 python3 demo.py），对照下面的输出。',
     '在 commands 列表里新增一条 "?" 和一条 "add 1 2 3 4"，重新运行看看输出。',
     '试着把两个 pay 分支的上下顺序对调，想一想为什么 "pay 88" 会突然变成金额无效，再运行验证。',
    ],
    expect:`支持命令：move、add、pay、quit
移动到坐标 (3, 5)
求和结果：60
金额无效：-50
支付成功：88 元
未识别命令：quit
用户 alice 登录了系统`,
   },
   code:`commands = [
    "help",
    "move 3 5",
    "add 10 20 30",
    "pay -50",
    "pay 88",
    "quit",
]

for line in commands:
    match line.split():
        case ["help" | "?"]:
            print("支持命令：move、add、pay、quit")
        case ["move", x, y]:
            print(f"移动到坐标 ({x}, {y})")
        case ["add", *nums]:
            total = 0
            for n in nums:
                total += int(n)
            print(f"求和结果：{total}")
        case ["pay", amount] if int(amount) > 0:
            print(f"支付成功：{amount} 元")
        case ["pay", amount]:
            print(f"金额无效：{amount}")
        case _:
            print(f"未识别命令：{line}")

event = {"type": "login", "user": "alice", "ip": "127.0.0.1"}
match event:
    case {"type": "login", "user": user}:
        print(f"用户 {user} 登录了系统")
    case _:
        print("其他事件")`,
   explain:[
    {at:'commands = [',to:'"quit",',text:'准备一组模拟的用户指令字符串，覆盖不同命令格式。'},
    {at:'for line in commands:',to:'match line.split():',text:'逐条取出命令，用 split() 按空格拆成单词列表后再交给 match 匹配。'},
    {at:'case ["help" | "?"]:',to:'支持命令',text:'单元素列表且内容为 "help" 或 "?" 时打印帮助。'},
    {at:'case ["move", x, y]:',to:'移动到坐标',text:'匹配恰好三个词且首词为 "move" 的列表，把坐标解包进 x 和 y。'},
    {at:'case ["add", *nums]:',to:'求和结果',text:'*nums 接住 "add" 后面的任意多个参数，用 for 循环逐个转成 int 累加。'},
    {at:'case ["pay", amount] if int(amount) > 0:',to:'支付成功',text:'带守卫条件的分支：必须先转 int 判断大于 0 才算支付成功；因此 "pay -50" 会跳过这里落到下一个分支。'},
    {at:'case ["pay", amount]:',to:'金额无效',text:'接住上面守卫未通过的非正数金额，打印金额无效。'},
    {at:'case _:',to:'未识别命令',text:'兜底处理其余未定义的命令（这里是 "quit"）。'},
    {at:'event = {"type": "login"',to:'print("其他事件")',text:'字典模式匹配：虽然 event 多了一个 "ip" 键，只要 "type" 和 "user" 对得上就会命中并把 "alice" 绑定给 user。'},
   ],
  },
 ],
 quiz:[
  {
   id:'py-flow-1',
   q:'在 Python 中，表达式 -7 // 2 和 -7 % 2 的结果分别是？',
   options:['-3 和 -1','-3 和 1','-4 和 1','-4 和 -1'],
   why:[
    '这是 C/Java 等语言向零取整的结果，Python 的 // 是向负无穷向下取整。',
    '-7 / 2 等于 -3.5，向下取整应得到 -4 而不是 -3。',
    '',
    'Python 取余结果的符号与除数一致，除数 2 是正数，所以余数是 1 而不是 -1。',
   ],
   answer:2,
   explain:'// 向下取整，-3.5 向下取整为 -4；再按恒等式 a == (a // b) * b + (a % b)，-7 - (-4) * 2 = 1。',
  },
  {
   id:'py-flow-2',
   q:'表达式 6 / 2 和 -2 ** 2 在 Python 里的求值结果分别是？',
   options:['3.0 和 -4','3 和 -4','3.0 和 4','3 和 4'],
   why:[
    '',
    '真除法 / 即使能整除也返回浮点数 3.0，而不是整数 3。',
    '幂运算 ** 优先级高于一元负号，-2 ** 2 先算 2 ** 2 再取负，得 -4。',
    '既忽略了 / 返回浮点数的规则，也把 -2 ** 2 错算成了 (-2) ** 2。',
   ],
   answer:0,
   explain:'真除法 / 返回 float（6 / 2 == 3.0）；** 优先级高于一元负号，-2 ** 2 等价于 -(2 ** 2) == -4。',
  },
  {
   id:'py-flow-3',
   q:'关于 == 和 is 的用法，下面哪一项符合 Python 的规范与事实？',
   options:[
    '判断变量是否为空值应优先使用 x == None',
    '判断变量是否为 None 应写 x is None',
    '比较两个大整数的值相等推荐用 is 运算符',
    '两个内容相同的列表用 is 比较结果为 True',
   ],
   why:[
    'PEP 8 规范要求判断 None 使用 is None，避免被自定义类的 == 逻辑干扰。',
    '',
    'is 比较的是对象内存身份，大整数常是不同对象，比较值应使用 ==。',
    '两个分别创建的列表即使元素相同，也是不同的内存对象，is 结果为 False。',
   ],
   answer:1,
   explain:'None 是全局唯一单例，判断它应写 x is None；比较普通对象的值是否相等则统一用 ==。',
  },
  {
   id:'py-flow-4',
   type:'multi',
   q:'下面哪些值在 Python 的真值测试（如 if 条件判断）中会被当作假（False）？（多选）',
   options:['数值零 0.0','空列表 []','字符串 "0"','字符串 "False"'],
   why:[
    '',
    '',
    '"0" 是长度为 1 的非空字符串，在真值测试中为真。',
    '"False" 是非空字符串，在真值测试中同样为真。',
   ],
   answers:[0,1],
   explain:'Python 中的假值包括 False、None、各类数值零（0、0.0）以及空字符串和空容器（""、[]、()、{}、set()）；非空字符串不管内容写什么都是真值。',
  },
  {
   id:'py-flow-5',
   q:'下面两个表达式的求值结果分别是？',
   code:'"" or "默认名称"\n"ok" and 0 and "跳过"',
   options:[
    'True 和 False',
    '"" 和 "跳过"',
    '"默认名称" 和 False',
    '"默认名称" 和 0',
   ],
   why:[
    'Python 的 and 和 or 返回的是决定结果的操作数本身，不会强行转成布尔值。',
    '"" 为假，or 会返回右边的 "默认名称"；and 遇到假值 0 就短路返回 0，不会走到 "跳过"。',
    '第二个表达式在 0 处短路，返回的是数字 0 本身，而不是 False。',
    '',
   ],
   answer:3,
   explain:'"" 为假，所以 "" or "默认名称" 返回 "默认名称"；"ok" 为真后遇到假值 0，and 立刻短路返回 0。',
  },
  {
   id:'py-flow-6',
   type:'judge',
   q:'在 Python 中可以直接写 0 < x < 10 这样的链式比较，它等价于 (0 < x) and (x < 10)，且中间的 x 只求值一次。',
   answer:true,
   explain:'链式比较是 Python 的原生语法特性，既简洁又避免重复计算中间表达式，还可以串联更多条件如 a == b == c。',
  },
  {
   id:'py-flow-7',
   type:'fill',
   q:'用条件表达式（三元运算符）一行给变量赋值：label = "及格" ＿ score >= 60 else "不及格"。',
   accepted:['if'],
   explain:'Python 条件表达式的格式是 真时的值 if 条件 else 假时的值。',
  },
  {
   id:'py-flow-8',
   q:'list(range(10, 2, -3)) 生成的列表内容是？',
   options:['[10, 7, 4, 1]','[10, 7, 4, 2]','[10, 7, 4]','[7, 4, 1]'],
   why:[
    '1 已经小于终点 2，超过了范围边界，不会被包含进来。',
    'range 是左闭右开区间，终点 2 不包含在结果内，且 4 减 3 也不会落到 2。',
    '',
    '起点 10 本身是包含在内的，不应该漏掉 10。',
   ],
   answer:2,
   explain:'range(10, 2, -3) 从 10 开始每次减 3，只要严格大于终点 2 就继续：10 → 7 → 4，下一步是 1 ≤ 2 停止，所以得到 [10, 7, 4]。',
  },
  {
   id:'py-flow-9',
   type:'judge',
   q:'在 for ... else: 结构中，只要循环体里执行了 break，就会紧接着执行 else 分支里的代码。',
   answer:false,
   explain:'正好相反：for ... else 中的 else 只有在循环正常遍历完毕、从未触发 break 时才会执行；一旦触发了 break，else 分支会被跳过。',
  },
  {
   id:'py-flow-10',
   q:'遍历列表 names = ["甲", "乙", "丙"] 时，想同时拿到从 1 开始的编号和名字，最地道、正确的写法是？',
   options:[
    'for i, n in zip(range(1, 3), names):',
    'for i, n in enumerate(names, start=1):',
    'for i, n in range(1, len(names) + 1):',
    'for i, n in enumerate(names, step=1):',
   ],
   why:[
    'range(1, 3) 只有 1 和 2 两个数字，zip 会在较短序列结束时截断，漏掉 "丙"。',
    '',
    'range 只产出单个整数，拆包成 i, n 两个变量会直接抛出 TypeError。',
    'enumerate 指定起始编号的参数名是 start，没有 step 这个参数。',
   ],
   answer:1,
   explain:'enumerate(names, start=1) 依次产出 (1, "甲")、(2, "乙")、(3, "丙")，是最简洁且不易出错的 Python 惯用法。',
  },
  {
   id:'py-flow-11',
   type:'multi',
   q:'在 Python 3.10+ 的 match / case 结构化模式匹配中，下面哪些写法是支持的？（多选）',
   options:[
    '用竖线 | 在同一分支匹配多个值',
    '直接解构列表、元组或字典中的字段',
    '在 case 模式后加 if 守卫做附加判断',
    '用通配符 _ 兜底匹配其余所有情况',
   ],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'这四项都是 Python 3.10+ 结构化模式匹配的核心能力，而且每个 case 执行完毕后自动结束整个 match，无需手写 break。',
  },
  {
   id:'py-flow-12',
   type:'fill',
   q:'在 Python 3.10+ 的 match / case 语句中，用来匹配所有其余情况、但不绑定变量的兜底通配符是 ＿。',
   accepted:['_'],
   explain:'case _: 可以匹配任意未被前面分支命中的值，且不会把值绑定到变量上，通常放在 match 的最后一行。',
  },
  {
   id:'py-flow-13',
   type:'short',
   q:'请说明 Python 中 == 与 is 的区别，并解释为什么判断 None 要写 x is None，而比较普通整数和字符串时不应该用 is。',
   reference:'== 比较两个对象的值（内容）是否相等，is 比较两个变量是否指向内存中的同一个对象（身份相同，等价于 id(a) == id(b)）。None 在整个 Python 进程中是唯一的单例对象，写 x is None 既快又准确，还不会被自定义对象的 __eq__ 方法误导；而普通整数和字符串虽然偶尔会因 CPython 的小整数缓存（-5 到 256）或字符串驻留碰巧指向同一对象，但换一个大数或运行时拼出来的字符串就会变成不同对象，用 is 比较值容易埋下隐蔽 Bug，所以比较值应统一用 ==。',
   points:[
    '== 比较对象的值是否相等，is 比较是否为内存中同一个对象',
    'None 是全局唯一单例，用 is None 更准确且不受自定义相等逻辑干扰',
    '小整数缓存或字符串驻留可能让 is 偶尔返回 True，造成假象',
    '大整数或动态生成的字符串对象身份不同，比较值必须用 ==',
   ],
   explain:'记住一句话：比值用 ==，比身份（尤其是判断 None）用 is。',
  },
  {
   id:'py-flow-14',
   type:'code',
   q:'给定列表 nums = [12, 19, 25, 31, 40]，请写一段 Python 代码，用 for ... else 查找列表中第一个能同时被 3 和 5 整除的数：找到就打印“找到：数字”并立即结束循环；遍历完都没找到就打印“未找到符合条件的数”。',
   reference:'nums = [12, 19, 25, 31, 40]\nfor n in nums:\n    if n % 3 == 0 and n % 5 == 0:\n        print(f"找到：{n}")\n        break\nelse:\n    print("未找到符合条件的数")',
   points:[
    '使用 for 循环遍历 nums',
    '用 n % 3 == 0 and n % 5 == 0（或 n % 15 == 0）判断条件',
    '找到时打印结果并用 break 立刻跳出循环',
    '使用与 for 对齐的 else 分支在未命中时打印提示',
   ],
   explain:'这个列表里没有同时被 3 和 5 整除的数，循环正常走完未触发 break，所以会进入 else 打印“未找到符合条件的数”；如果列表里有 30，命中后执行 break，else 会被跳过。',
  },
 ],
};
