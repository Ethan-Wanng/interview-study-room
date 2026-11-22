import type {AiQuiz} from '../journey';

// Rust「入门」阶段训练：工具链与 cargo、变量类型与控制流、所有权与借用、生命周期。题目全新，比关卡更综合、更易踩坑。
export const rustTrain1:AiQuiz[]=[
 {
  id:'rust-x1-1',
  q:'下面这段 Rust 代码运行后的标准输出是什么？',
  code:'fn main() {\n    println!("{1} {0} {0:?} {{}}", "hi", 7);\n}',
  options:['输出 hi 7 "hi" {}','输出 7 hi hi {}','输出 7 hi "hi" {}','编译期报索引越界'],
  why:['{1} 对应索引 1 的实参 7，{0} 对应索引 0 的实参 "hi"，顺序刚好相反。','{0:?} 使用 Debug 格式打印字符串，输出会带双引号 "hi"。','','参数下标从 0 开始，0 和 1 都在范围内，{{}} 是转义后的字面花括号 {}。'],
  answer:2,
  explain:'格式字符串里 {0}、{1} 按位置索引实参，{0:?} 以 Debug 格式输出带引号的 "hi"，双花括号 {{ 和 }} 分别转义为字面字符 { 和 }。'
 },
 {
  id:'rust-x1-2',
  q:'下面代码分别用 cargo run（调试版）和 cargo run --release（发布版）运行时，会发生什么？',
  code:'fn main() {\n    let x: u8 = 250;\n    let step: u8 = 10;\n    println!("{}", x + step);\n}',
  options:['调试版输出 255，发布版输出 4','调试版触发 panic，发布版回绕输出 4','两个版本都会直接报编译期溢出错误','两个版本都在运行时统一触发 panic'],
  why:['Rust 普通的 + 运算不是饱和加法，调试版溢出不会停在 255，需要饱和语义应调用 saturating_add。','','这里的两个运算数是运行时变量而非字面量常量表达式，编译器不会在编译期直接拒绝。','发布版默认关闭整数溢出检查，按二进制补码回绕（260 - 256 = 4），不会 panic。'],
  answer:1,
  explain:'Rust 对运行时整数溢出在 debug 模式下插入检查并 panic，在 release 模式下默认按二进制补码回绕（u8 中 250 + 10 = 4）。明确需要特定行为应使用 checked_add、wrapping_add 或 saturating_add。'
 },
 {
  id:'rust-x1-3',
  type:'multi',
  q:'关于 Rust 的 edition（版次）与常用 cargo 命令，下面哪些说法正确？（多选）',
  options:['不同 edition 的 crate 可以在同一项目中互相依赖编译','cargo check 会完成类型与借用检查但不生成可执行文件','运行 cargo fmt 会自动修复代码里的所有权和生命周期报错','cargo clippy 能检查出可编译但不够地道或暗藏风险的写法'],
  why:['','','cargo fmt 只负责按社区规范整理缩进、换行等代码排版，无法修改语义或修复编译错误。',''],
  answers:[0,1,3],
  explain:'Rust 保证不同 edition 的 crate 完全兼容互操作；cargo check 跳过最终机器码生成以提速；cargo clippy 提供静态 lint 建议；cargo fmt 仅做格式化。'
 },
 {
  id:'rust-x1-4',
  type:'judge',
  q:'eprintln! 和 println! 都会把内容写入标准输出（stdout），只是 eprintln! 会在行首自动加上 "Error: " 前缀。',
  answer:false,
  explain:'eprintln! 写入的是标准错误流（stderr）而不是标准输出（stdout），并且不会自动拼接任何前缀。'
 },
 {
  id:'rust-x1-5',
  q:'下面代码运行后输出什么？',
  code:'fn main() {\n    let x = 2;\n    let x = x + 3;\n    {\n        let x = x * 10;\n        print!("{x} ");\n    }\n    println!("{x}");\n}',
  options:['50 50','20 5','5 5','50 5'],
  why:['内层花括号里的 let x 只是在局部作用域内遮蔽了外层变量，离开花括号后外层 x 仍为 5。','外层的第二次 let x = x + 3 已经把外层 x 变成了 5，所以内层 x * 10 得到 50。','内层作用域里 x 被遮蔽为 50，第一次打印的是 50 而不是 5。',''],
  answer:3,
  explain:'遮蔽（shadowing）会创建新变量并仅在其所在作用域内生效：外层 x 先变为 5，内层新建遮蔽变量 x = 50，离开内层块后外层的 x = 5 恢复可见，故输出 50 5。'
 },
 {
  id:'rust-x1-6',
  q:'下面这个函数为什么无法通过编译？',
  code:'fn double_positive(n: i32) -> i32 {\n    if n > 0 {\n        n * 2\n    }\n}',
  options:['缺少 else 分支导致与隐式 () 类型冲突','函数体最后一行没有写 return 关键字','条件表达式 n > 0 外面缺少圆括号','n * 2 后面遗漏了语句结束分号'],
  why:['','Rust 函数体最后一行不加分号的表达式本身就是返回值，不需要写 return。','Rust 的 if 条件不需要圆括号，加上反而会触发编译器警告。','如果给 n * 2 加上分号，该分支值会变成 ()，仍与函数返回类型 i32 不匹配。'],
  answer:0,
  explain:'在 Rust 中没有 else 的 if 表达式隐含一个返回 () 的 else 分支；if 分支产出 i32 而隐式 else 产出 ()，分支类型不一致且不符合函数返回类型 i32。'
 },
 {
  id:'rust-x1-7',
  q:'下面代码运行后的输出是？',
  code:'fn main() {\n    let mut sum = 0;\n    let res = \'outer: loop {\n        for i in 1..=5 {\n            sum += i;\n            if sum > 6 {\n                break \'outer i * 10;\n            }\n        }\n    };\n    println!("{res} {sum}");\n}',
  options:['30 6','40 6','40 10','30 10'],
  why:['当 i = 3 时 sum 刚好等于 6，不满足严格大于 6 的条件，循环还会继续到 i = 4。','到 i = 4 时 sum 已经累加了 1 + 2 + 3 + 4 = 10，不再是 6。','','触发跳出时 i 是 4 而不是 3，所以 break 带出的值是 4 * 10 = 40。'],
  answer:2,
  explain:'i 依次为 1(sum=1)、2(sum=3)、3(sum=6，不满足 sum > 6)、4(sum=10 > 6)，执行 break \'outer 40 直接跳出外层 loop 并把 40 赋给 res，最终打印 40 10。'
 },
 {
  id:'rust-x1-8',
  q:'下面代码运行后的输出是？',
  code:'fn main() {\n    let a: i32 = -1;\n    let b = a as u8;\n    let c = 257_i32 as u8;\n    println!("{b} {c}");\n}',
  options:['0 255','255 1','255 255','运行时 panic'],
  why:['as 转换整数不会做饱和夹断（clamp），负数不会变成 0，超上限也不会停在 255。','','257 的低 8 位是 1，不是 255；as 会截断高位二进制位。','as 整数转换在任何编译模式下都不会 panic，而是直接截断低位。'],
  answer:1,
  explain:'i32 的 -1 在补码中全部位为 1，截断为 u8 后得到 255；257（0x101）截断低 8 位得到 1。需要安全范围检查时应使用 try_into。'
 },
 {
  id:'rust-x1-9',
  q:'下面这段代码为什么会编译报错？',
  code:'fn main() {\n    let s = String::from("hi");\n    let arr = [s; 3];\n    println!("{}", arr[0]);\n}',
  options:['数组不支持存放 String 这类堆上类型','数组初始化简写 [值; 长度] 中长度过小','String 未加 mut 不能用来初始化数组','[s; 3] 要求非 Copy 变量被复制三次'],
  why:['数组完全可以存放 String，例如 [String::from("a"), String::from("b")] 就能正常编译。','数组长度只要是非负编译期常量 usize 即可，3 完全合法。','数组元素初始化与变量 s 是否带 mut 无关。',''],
  answer:3,
  explain:'用运行期变量 s 写 [s; 3] 时，Rust 需要把 s 复制 3 份，要求该类型实现 Copy；String 没有实现 Copy，因此报错（可改用 std::array::from_fn 等方式构造）。'
 },
 {
  id:'rust-x1-10',
  type:'multi',
  q:'关于常量 const、可变变量 mut 与变量遮蔽（shadowing），下面哪些说法正确？（多选）',
  options:['const 常量须显式标注类型且可在函数外顶层声明','const 常量可用运行期用户输入函数的返回值来初始化','用 let 遮蔽同名变量时，新变量可以改变类型和可变性','对 let mut 变量直接重新赋值时可以顺便改变变量类型'],
  why:['','const 的值必须在编译期就能求值，不能依赖运行期才能拿到的结果。','','mut 只允许修改同类型变量的值，不能改变变量的类型。'],
  answers:[0,2],
  explain:'const 必须标注类型且编译期求值，可放在全局/模块作用域；遮蔽是创建全新变量，所以可改变类型与是否 mut；mut 变量重新赋值不能改变类型。'
 },
 {
  id:'rust-x1-11',
  type:'judge',
  q:'空元组 () 在 Rust 中被称为单元类型（unit），既是一种合法类型，也是省略 -> 返回标注时函数的默认返回类型。',
  answer:true,
  explain:'() 类型只有一个值即 ()；不写 -> 的函数以及以分号结尾的代码块都默认求值为 ()。'
 },
 {
  id:'rust-x1-12',
  type:'judge',
  q:'Rust 的 char 类型采用 UTF-8 变长存储，因此 \'a\' 在内存中占 1 字节，\'中\' 占 3 字节。',
  answer:false,
  explain:'UTF-8 变长编码用于 str 和 String；单个 char 表示 Unicode 标量值，在内存中固定占用 4 个字节，无论存英文还是汉字都是 4 字节。'
 },
 {
  id:'rust-x1-13',
  type:'fill',
  q:'做整数加法时，如果想显式检测溢出而不触发 panic 或静默回绕，溢出时返回 None、未溢出返回 Some(结果)，可以调用方法 x.＿(y)。',
  accepted:['checked_add'],
  explain:'checked_add 在结果超出整数类型范围时返回 None，在正常范围内返回 Some(sum)，行为在 debug 与 release 下完全一致。'
 },
 {
  id:'rust-x1-14',
  q:'下面这段代码能通过编译吗？',
  code:'fn main() {\n    let s = String::from("rust");\n    if false {\n        drop(s);\n    }\n    println!("{s}");\n}',
  options:['不能编译：编译器按分支静态分析认为 s 可能已移动','能编译并输出 rust：因为 if false 分支根本不会执行','能编译但输出空串：s 在进入条件前已经被清空重置','运行时 panic：检测到重复释放 s 指向的堆内存'],
  why:['','借用检查器的移动分析是静态控制流分析，不会因为条件是 false 就把该分支当成不存在。','Rust 不会把变量隐式重置为空字符串，这里直接无法通过编译。','Rust 会在编译期拒绝可能使用已移动值的代码，不会留到运行时重复释放。'],
  answer:0,
  explain:'移动检查基于静态控制流路径：只要存在一条语法分支把 s 移走了，分支汇合点之后 s 就被视为可能已移动，不能再使用。'
 },
 {
  id:'rust-x1-15',
  q:'下面这段代码运行后会发生什么？',
  code:'fn main() {\n    let pair = (String::from("rust"), 42);\n    let name = pair.0;\n    println!("{} {}", name, pair.1);\n}',
  options:['编译报错：pair 已被移动，不能再访问 pair.1','编译报错：元组不支持按位置单独移出某一个元素','编译通过并正常打印出剩余字段：rust 42','运行时 panic：读取到已部分释放的元组内存'],
  why:['移动 pair.0 属于“部分移动”（partial move），只是 pair 整体和 pair.0 失效，未移动的 pair.1 仍可读取。','Rust 允许对元组和结构体字段做部分移动，编译器会精确跟踪每个字段的移动状态。','','借用检查器保证所有剩余字段有效，程序运行完全安全，不会 panic。'],
  answer:2,
  explain:'把 pair.0 移给 name 后，pair 发生部分移动：不能再整体使用 pair 或读取 pair.0，但尚未移动的 pair.1（i32）依然完好可用，打印 rust 42。'
 },
 {
  id:'rust-x1-16',
  q:'下面代码在编译时会报什么问题？',
  code:'fn main() {\n    let s = String::from("hello");\n    for _ in 0..2 {\n        let t = s;\n        println!("{t}");\n    }\n}',
  options:['循环范围 0..2 的语法缺少变量名','s 在循环体内可能被多次移动导致编译报错','t 离开循环体时没有显式调用 drop','s 未声明为 mut，不能在循环体内读取'],
  why:['用下划线 _ 忽略循环变量是完全合法的惯用写法。','','离开作用域时 Rust 会自动调用 drop 释放 t，无需手写。','把 s 移给 t 不要求 s 是 mut；问题在于循环会执行多轮，第一轮后 s 就失效了。'],
  answer:1,
  explain:'编译器假定循环体可能执行多次，而 s 是非 Copy 的 String，第一轮循环将其移动给 t 后，下一轮再移动 s 就会触发 use of moved value 编译错误（应借用 &s 或克隆）。'
 },
 {
  id:'rust-x1-17',
  q:'下面这段代码能通过编译并运行吗？',
  code:'fn main() {\n    let mut s = String::from("hi");\n    let r1 = &s;\n    let r2 = &s;\n    println!("{r1} {r2}");\n    let r3 = &mut s;\n    r3.push_str("!");\n    println!("{s}");\n}',
  options:['编译报错：r1、r2 未离开花括号，不能建 r3','编译报错：r3 未离开花括号，最后不能读 s','编译报错：r1 和 r2 不能同时借用 mut 变量','编译通过并先后打印 hi hi 与 hi!'],
  why:['Rust 使用非词法生命周期（NLL），r1 和 r2 的借用在第一次 println! 处最后一次使用后即结束。','同理，r3 在 r3.push_str("!") 后不再被使用，其可变借用随之结束，最后打印 s 合法。','mut 变量完全可以被多个不可变引用同时借用。',''],
  answer:3,
  explain:'借助非词法生命周期（NLL），引用的借用期在它最后一次被使用的位置结束而非代码块末尾：r1/r2 用完后建 r3，r3 用完后再读 s，三段互不重叠，正常打印 hi hi 和 hi!。'
 },
 {
  id:'rust-x1-18',
  q:'下面这段代码为什么会编译报错？',
  code:'fn main() {\n    let mut x = 10;\n    let r1 = &mut x;\n    let r2 = r1;\n    println!("{r1} {r2}");\n}',
  options:['&mut i32 未实现 Copy，赋值给 r2 时 r1 被移动','i32 是基础标量类型，不支持创建可变引用','r1 自身没有声明为 mut，因此不能赋给 r2','println! 不能在同一语句里打印两个引用'],
  why:['','任何声明为 mut 的变量都可以创建可变引用，包括 i32。','把 r1 移动给 r2 不需要 r1 本身是 mut；报错原因是 r1 移动后在下一行又被使用。','println! 可以同时打印任意多个处于有效期的引用，问题在于 r1 已失效。'],
  answer:0,
  explain:'不可变引用 &T 实现了 Copy，但可变引用 &mut T 为了维护“同一时刻至多一个可变引用”的独占性，刻意没有实现 Copy；let r2 = r1 发生了移动，之后再用 r1 会报错。'
 },
 {
  id:'rust-x1-19',
  q:'下面代码运行后的输出是什么？',
  code:'fn main() {\n    let s = String::from("Rust语言");\n    println!("{}", &s[4..7]);\n}',
  options:['编译报错：String 不能用范围切片','运行时 panic：下标 4 或 7 切在汉字中间','正常运行并打印 语','正常运行并打印 言'],
  why:['虽然 Rust 禁止 s[0] 单字节索引，但允许用范围表达式 &s[a..b] 获取 &str 切片。','前 4 个字节是 ASCII 字符 "Rust"，第 4..7 字节正好覆盖完整的汉字 "语"，未切裂字符。','','"言" 占据的是字节范围 7..10，不是 4..7。'],
  answer:2,
  explain:'UTF-8 中 "Rust" 占字节 0..4，"语" 占字节 4..7，"言" 占字节 7..10。&s[4..7] 恰好落在合法字符边界上，输出 "语"。'
 },
 {
  id:'rust-x1-20',
  q:'下面这段代码为什么会在 s.clear() 这一行报借用错误？',
  code:'fn main() {\n    let mut s = String::from("hello world");\n    let first = &s[..5];\n    s.clear();\n    println!("{first}");\n}',
  options:['&s[..5] 已经把 s 的所有权转移给了 first','first 仍持有不可变借用，与 clear 的可变借用冲突','String 的 clear 方法不接受带空格的字符串','对切片 first 使用 println! 时需要先解引用'],
  why:['切片只是借用而不是所有权转移，s 依然拥有这段字符串数据。','','clear 会直接清空任意内容的 String，和字符串里有没有空格无关。','println! 可以直接打印 &str，不需要手动解引用。'],
  answer:1,
  explain:'first 是对 s 的不可变切片借用，且在后面的 println! 中还会使用；s.clear() 需要 &mut s 清空缓冲区，若允许执行会导致 first 指向无效内容，因此被借用检查器拦截。'
 },
 {
  id:'rust-x1-21',
  type:'multi',
  q:'下面哪些类型实现了 Copy 特性（赋值时按位复制，原变量仍可继续使用）？（多选）',
  options:['(i32, &str)','[bool; 4]','(i32, &mut i32)','&String'],
  why:['','','虽然 i32 是 Copy，但 &mut i32 为了保证独占可变访问并未实现 Copy，包含它的元组也不实现 Copy。',''],
  answers:[0,1,3],
  explain:'所有不可变引用 &T（包括 &str、&String）都实现了 Copy，全由 Copy 类型组成的元组和数组也是 Copy；而可变引用 &mut T 不是 Copy。'
 },
 {
  id:'rust-x1-22',
  type:'multi',
  q:'关于 String 与 &str 的内存布局和切片语义，下面哪些说法正确？（多选）',
  options:['String 在栈上保存指针、长度和容量，字符数据存在堆上','&str 是胖指针，保存指向 UTF-8 字节数据的指针和字节长度','对 String 执行移动赋值只复制栈上元信息，不拷贝堆上文本','对 String 切片时若起止下标未落在 UTF-8 字符边界会 panic'],
  why:['','','',''],
  answers:[0,1,2,3],
  explain:'String 拥有堆缓冲区（栈上三字：ptr/len/cap），移动仅浅拷贝栈元信息并使原变量失效；&str 为二字胖指针（ptr/len）；切片越界或落在多字节字符中间都会在运行时 panic。'
 },
 {
  id:'rust-x1-23',
  type:'judge',
  q:'当变量 x 声明为 let mut x = 10; 且创建了不可变引用 let r = &x; 之后，只要在 r 最后一次使用前不通过 r 改值，就可以直接写 x = 20; 修改 x。',
  answer:false,
  explain:'只要不可变引用 r 仍处于活跃借用期，连所有者 x 本身也不能直接修改（写入 x 需要独占访问权），否则 r 读到的值会在无预警下变化。'
 },
 {
  id:'rust-x1-24',
  type:'judge',
  q:'同一作用域内声明的局部变量离开作用域时按声明的逆序（后进先出）依次释放，因此后声明的引用可以安全借用先声明的变量。',
  answer:true,
  explain:'例如 let a = String::from("hi"); let r = &a; 离开作用域时先释放 r 再释放 a，不会出现 a 先释放而 r 悬垂的问题。'
 },
 {
  id:'rust-x1-25',
  type:'fill',
  q:'把 String 变量 s 显式借用为字符串切片 &str 时，除了利用 &s 自动解引用强制转换，也可以直接调用方法 s.＿()。',
  accepted:['as_str'],
  explain:'s.as_str() 明确返回 &str 切片，在泛型推导或编译器无法自动触发解引用强制转换时尤其有用。'
 },
 {
  id:'rust-x1-26',
  q:'下面这个函数已经写上了生命周期参数 <\'a>，为什么依然无法通过编译？',
  code:'fn make_msg<\'a>() -> &\'a str {\n    let s = String::from("hello");\n    &s\n}',
  options:['s 在函数结束时释放，标注 \'a 无法避免悬垂引用','函数没有输入参数时语法上不允许写尖括号 <\'a>','&s 的类型是 &String，无法自动转换为 &str','String::from 创建的字符串不能借用为切片'],
  why:['','语法上允许没有输入参数的函数声明生命周期参数，但这里问题在于返回值指向了即将销毁的局部变量。','在返回位置 &String 可以通过解引用强制转换成 &str，不是类型转换问题。','String 完全可以借用为 &str，前提是不能把局部变量的引用返回到函数外部。'],
  answer:0,
  explain:'生命周期标注不会延长局部变量的寿命。s 在 make_msg 返回时就会被 drop，返回的 &s 成为悬垂引用，正确做法是直接返回拥有所有权的 String。'
 },
 {
  id:'rust-x1-27',
  q:'下面这段代码能否通过编译？如果可以，输出什么？',
  code:'fn pick_a<\'a, \'b>(x: &\'a str, y: &\'b str) -> &\'a str {\n    println!("忽略：{y}");\n    x\n}\n\nfn main() {\n    let a = String::from("outer");\n    let res;\n    {\n        let b = String::from("inner");\n        res = pick_a(&a, &b);\n    }\n    println!("{res}");\n}',
  options:['编译报错：b 在内层离开作用域，活得不够久','编译报错：函数声明了两个生命周期参数但只用了 \'a','编译通过，先后打印 忽略：inner 和 outer','编译通过，先后打印 忽略：outer 和 inner'],
  why:['返回值只绑定在 \'a（即 a 的生命周期）上，与 b 的生命周期 \'b 无关，所以 b 提前释放不影响 res。','参数 y 已经使用了 \'b（实际上 \'b 也可以省略不写），这不是错误。','','pick_a 打印的是 y（即 inner），返回的是 x（即 outer）。'],
  answer:2,
  explain:'因为返回类型 &\'a str 只与参数 x 关联，不依赖 y 的生命周期 \'b，所以即使 b 在内层块就释放了，res 指向的仍是外层存活的 a，代码合法并输出 忽略：inner 与 outer。'
 },
 {
  id:'rust-x1-28',
  q:'下面这个函数为什么无法通过编译？',
  code:'fn choose<\'a>(x: &\'a str, y: &str, use_x: bool) -> &\'a str {\n    if use_x { x } else { y }\n}',
  options:['bool 参数在签名里必须放在参数列表最前面','未标 \'a 的 y 拥有独立生命周期，活不够 \'a','if 和 else 两个分支不能返回不同的引用变量','函数体末尾缺少 return 语句来返回两个分支'],
  why:['普通非引用参数放在参数列表的任意位置都完全合法。','','只要两个分支的引用都满足返回值的生命周期要求，返回不同引用变量完全合法。','if 表达式本身就是函数体的最后一个表达式，不需要写 return。'],
  answer:1,
  explain:'根据省略规则一，未标注的 y 会获得独立生命周期 \'b；由于没有约束 \'b 至少和 \'a 一样长，else 分支把 &\'b str 当作 &\'a str 返回会编译报错，需给 y 也标上 &\'a str。'
 },
 {
  id:'rust-x1-29',
  q:'根据 Rust 的生命周期省略规则，下面哪个函数签名无法省略生命周期标注，直接这样写会编译报错？',
  options:['fn prefix(s: &str, n: usize) -> &str','fn concat(a: &str, b: &str) -> String','fn code_text(code: u16) -> &\'static str','fn pick(a: &str, b: &str) -> &str'],
  why:['省略规则二只计算“引用类型”的输入参数，n: usize 不是引用，这里仅有 1 个引用参数 s，返回值自动沿用 s 的生命周期。','返回值是拥有所有权的 String 而非引用，不需要生命周期标注。','返回值已显式标注了 &\'static str，编译器无需再做推断。',''],
  answer:3,
  explain:'规则二只在“恰好有一个输入引用参数”时生效（注意非引用参数不计入）；fn pick 有两个引用参数且不是 &self 方法，编译器无法确定返回引用借自 a 还是 b，必须显式标注。'
 },
 {
  id:'rust-x1-30',
  type:'multi',
  q:'关于 \'static 生命周期和生命周期标注，下面哪些说法正确？（多选）',
  options:['给局部变量的引用加上 \'static 标注即可把它的释放推迟到程序结束','字符串字面量存放在可执行文件的只读数据段中，类型是 &\'static str','函数没有引用参数但只返回固定字面量时，返回类型可写成 &\'static str','只要在函数签名中把参数和返回值都标上 \'a，就能返回函数内局部变量的引用'],
  why:['生命周期标注只描述关系，不会改变任何值的实际存活时间。','','','局部变量离开函数即被释放，标注 \'a 无法阻止悬垂引用，编译器会直接报错。'],
  answers:[1,2],
  explain:'&\'static str 表示引用在整个程序运行期都有效，所有字符串字面量都属于此类；而生命周期标注绝不会延长局部变量或任何堆数据的实际寿命。'
 },
 {
  id:'rust-x1-31',
  type:'short',
  q:'下面代码为什么编译报错？如果不允许使用 clone() 复制字符串，只调整代码写法或顺序，可以怎样修改让它通过编译？请结合借用规则与非词法生命周期（NLL）说明原因。',
  code:'let mut s = String::from("hello world");\nlet word = &s[..5];\ns.push_str("!");\nprintln!("{word}");',
  reference:'1. 报错原因：word 是对 s 的不可变切片借用，且在最后的 println!("{word}") 处还要使用；而 s.push_str("!") 需要获取 s 的可变借用 &mut s。push_str 若触发堆内存重新分配并释放旧缓冲区，会导致 word 成为悬垂引用，因此借用检查器禁止同一活跃期内不可变借用与可变借用共存。\n2. 不克隆的修法：利用非词法生命周期（NLL，借用期在最后一次使用处结束），要么把 println!("{word}") 移到 s.push_str("!") 之前，先用完 word 再修改 s；要么先执行 s.push_str("!")，修改完成后再创建切片 let word = &s[..5]; 并打印。',
  points:['指出 word 持有对 s 的不可变借用，且借用期持续到 println! 处','指出 s.push_str 需要 &mut s，扩容重分配可能令 word 悬垂','依据借用规则说明不可变借用与可变借用不能在同一活跃期共存','给出不克隆的合理修法：调整顺序先用完 word 再 push_str，或先 push_str 再切片'],
  explain:'遇到借用冲突时，先不要急着 clone()，通常先检查能否缩短引用的活跃范围，让只读借用与可变借用错开。'
 },
 {
  id:'rust-x1-32',
  type:'short',
  q:'为什么加上生命周期标注 <\'a> 也不能让函数返回内部局部变量的引用？在设计返回文本的函数时，什么情况下该返回 &\'a str、String 或 &\'static str？',
  reference:'1. 生命周期标注只是向借用检查器描述“输出引用与输入引用之间的存活关系”，并不会改变任何值的真实释放时机。函数内部创建的局部变量在函数返回、栈帧销毁时就会被 drop，即使签名写了 <\'a>，返回的引用仍指向已释放内存（悬垂引用），因此编译器会拒绝。\n2. 返回类型选择：\n- 返回 &\'a str：结果直接截取自调用方传入的借用数据（零拷贝、无需堆分配），且生命周期绑定到对应输入参数；\n- 返回 String：函数内部需要拼接、格式化或新生成文本（如 format!），把所有权直接交给调用方；\n- 返回 &\'static str：只返回编译期确定的固定字符串字面量（如状态码说明、固定错误文案）。',
  points:['说明生命周期标注仅描述关系、不延长数据寿命，局部变量离开函数即释放','说明 &\'a str 适用于从输入借用中零拷贝返回子切片','说明 String 适用于函数内新构造、拼接或加工后的文本','说明 &\'static str 适用于返回编译期固定的字符串字面量'],
  explain:'搞清楚数据究竟“借自输入”“函数新造”还是“编译期静态常量”，就能立刻选出正确的字符串返回类型。'
 },
 {
  id:'rust-x1-33',
  type:'code',
  q:'写一个函数 last_word(s: &str) -> &str，返回 ASCII 字符串 s 去掉末尾空格后的最后一个单词切片（若为空串或全为空格则返回 ""）。要求只用字节遍历（s.as_bytes()）和切片实现，不分配新的 String；再写出 main 对 String 和字面量进行测试打印。',
  reference:'fn last_word(s: &str) -> &str {\n    let bytes = s.as_bytes();\n    let mut end = bytes.len();\n    while end > 0 && bytes[end - 1] == b\' \' {\n        end -= 1;\n    }\n    let mut start = end;\n    while start > 0 && bytes[start - 1] != b\' \' {\n        start -= 1;\n    }\n    &s[start..end]\n}\n\nfn main() {\n    let line = String::from("hello rust world  ");\n    println!("[{}]", last_word(&line));\n    println!("[{}]", last_word("solo"));\n    println!("[{}]", last_word("   "));\n}',
  points:['签名使用 fn last_word(s: &str) -> &str，利用省略规则无需手写标注','通过 s.as_bytes() 从尾部跳过末尾空格，并防止 usize 下溢','继续向左找到单词起点后直接返回切片 &s[start..end]，无新堆分配','main 覆盖带尾空格的 String、单单词字面量和纯空格边界情况'],
  explain:'通过先检查 end > 0 / start > 0 再索引 bytes[idx - 1]，既避免无符号整数下溢，又优雅处理空串、纯空格和单个单词。'
 },
 {
  id:'rust-x1-34',
  type:'code',
  q:'写一个带生命周期标注的函数 longer_or_default<\'a>(a: &\'a str, b: &\'a str, min_len: usize, note: &str) -> &\'a str：先打印 note；若 a 和 b 的字节长度都小于 min_len，返回固定字面量 "default"，否则返回较长者（相等时返回 a）。要求 note 不绑定到 \'a，再写出 main 演示 note 为内层临时 String、释放后外层仍能正常使用返回值。',
  reference:'fn longer_or_default<\'a>(a: &\'a str, b: &\'a str, min_len: usize, note: &str) -> &\'a str {\n    println!("说明：{note}");\n    if a.len() < min_len && b.len() < min_len {\n        "default"\n    } else if a.len() >= b.len() {\n        a\n    } else {\n        b\n    }\n}\n\nfn main() {\n    let s1 = String::from("rust");\n    let s2 = String::from("ownership");\n    let picked;\n    {\n        let temp_note = String::from("比较长度");\n        picked = longer_or_default(&s1, &s2, 5, &temp_note);\n    }\n    println!("结果：{picked}");\n}',
  points:['函数签名正确声明 <\'a>，仅给 a、b 和返回值标注 \'a，note 保持独立生命周期','两段都短于 min_len 时返回 &\'static str 字面量 "default"（可协变为 &\'a str）','其余情况按字节长度返回较长切片，相等时返回 a','main 演示 temp_note 在内层释放后，外层仍安全使用返回值 picked'],
  explain:'只把真正可能被返回的引用参数绑定到 \'a，能让无关参数不受返回值存活期的牵连；而 &\'static str 可以安全缩短为任意 &\'a str 返回。'
 },
];
