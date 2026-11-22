import type {AiQuiz} from '../journey';

// Rust「进阶」阶段训练：结构体与方法、枚举与模式匹配、集合与错误处理、包模块与测试、泛型与 Trait、闭包与迭代器。
export const rustTrain2:AiQuiz[]=[
 {
  id:'rust-x2-1',
  q:'下面这段使用结构体更新语法（..u1）的代码，编译与运行结果是什么？',
  code:'struct User {\n    name: String,\n    role: String,\n    level: u32,\n}\n\nfn main() {\n    let u1 = User {\n        name: String::from("Alice"),\n        role: String::from("admin"),\n        level: 3,\n    };\n    let u2 = User {\n        name: String::from("Bob"),\n        ..u1\n    };\n    println!("{} {} {}", u1.name, u1.level, u2.role);\n}',
  options:[
   '编译报错：..u1 把 u1 整体移走，后续不能再访问 u1.name',
   '编译报错：结构体更新语法要求全部字段都实现 Copy trait',
   '编译通过并输出 Alice 3 admin（仅 u1.role 发生了移动）',
   '编译通过并输出 Bob 3 admin（u2.name 会覆盖 u1.name）'
  ],
  why:[
   'u2 显式给出了 name 字段，并未从 u1 移走 name；Rust 支持部分移动，未移走的字段仍可访问。',
   '结构体更新语法不要求字段实现 Copy，非 Copy 字段会按所有权移动，Copy 字段则按位复制。',
   '',
   'u1 与 u2 是两个独立的结构体实例，给 u2.name 赋值不会反向修改 u1.name。'
  ],
  answer:2,
  explain:'结构体更新语法 ..u1 只会把 u2 未显式指定的字段从 u1 移过来：u1.role（String）被移入 u2，而 u1.name 未被使用、u1.level 实现了 Copy，因此 u1.name 和 u1.level 依然有效。'
 },
 {
  id:'rust-x2-2',
  q:'下面这段链式调用方法的代码运行后会输出什么？',
  code:'struct Counter {\n    val: i32,\n}\n\nimpl Counter {\n    fn new(val: i32) -> Self {\n        Self { val }\n    }\n    fn add(mut self, d: i32) -> Self {\n        self.val += d;\n        self\n    }\n    fn get(&self) -> i32 {\n        self.val\n    }\n}\n\nfn main() {\n    let c = Counter::new(10).add(5).add(3);\n    println!("{}", c.get());\n}',
  options:[
   '编译通过并输出 18（每次 add 接管所有权并返回新值）',
   '编译报错：Counter::new(10) 未绑定 let mut 变量，不能调 add',
   '编译报错：add 接收 mut self 后所有权已销毁，无法继续链式调用',
   '编译通过并输出 10（add 修改的是临时副本，原值保持 10）'
  ],
  why:[
   '',
   '方法签名里的 mut self 表示把所有权移入方法并在参数绑定上设为可变，不要求调用处的原变量带 mut。',
   'add 在修改 self.val 后把 self 作为返回值交还给了调用方，所有权得以继续向后传递。',
   'add 每次都把更新后的 self 返回并赋给下一步调用，最终绑定到 c 的就是累加后的实例。'
  ],
  answer:0,
  explain:'fn add(mut self, d: i32) -> Self 是典型的构建器（Builder）消费式方法：按值接管实例所有权，在函数内直接修改后再返回 Self，天然支持流畅的链式调用。'
 },
 {
  id:'rust-x2-3',
  q:'关于元组结构体（Newtype 模式）与类型别名（type alias），下面代码哪一行会触发编译错误？',
  code:'struct Meters(u32);\ntype MetresAlias = u32;\n\nfn take_u32(n: u32) -> u32 { n }\n\nfn main() {\n    let a = Meters(100);\n    let b: MetresAlias = 100;\n    let x = take_u32(a.0); // 第 1 行\n    let y = take_u32(b);   // 第 2 行\n    let z = take_u32(a);   // 第 3 行\n    println!("{x} {y} {z}");\n}',
  options:[
   '第 1 行报错：元组结构体不支持通过 .0 下标读取内部字段',
   '第 2 行报错：类型别名 MetresAlias 与 u32 属于不同的类型',
   '三行都能通过编译：Meters(u32) 会自动隐式解包为内部 u32',
   '第 3 行报错：元组结构体 Meters 是独立新类型，不能当 u32 传参'
  ],
  why:[
   '元组结构体使用从 0 开始的数字下标访问字段，a.0 的类型正是 u32，第 1 行合法。',
   'type MetresAlias = u32 只是给 u32 起同义别名，并未创建新类型，第 2 行完全合法。',
   'Rust 不会把元组结构体自动隐式转换为内部字段类型，直接传 a 会报类型不匹配。',
   ''
  ],
  answer:3,
  explain:'struct Meters(u32) 会创建一个与 u32 完全区分开的独立类型（Newtype 模式），防止不同量纲的数值混用；而 type Alias = u32 只是原类型的同义词。'
 },
 {
  id:'rust-x2-4',
  q:'下面这段包含引用字段的结构体代码，为什么在编译 take_note 方法时会报错？',
  code:'struct View<\'a> {\n    text: &\'a str,\n}\n\nimpl<\'a> View<\'a> {\n    fn get_text(&self, note: &str) -> &str {\n        println!("{note}");\n        self.text\n    }\n    fn take_note(&self, note: &str) -> &str {\n        note\n    }\n}',
  options:[
   'impl<\'a> 块内的方法不允许再接收除 &self 以外的引用参数',
   '省略规则三把返回引用绑定到了 &self，无法直接返回生命周期独立的 note',
   'get_text 和 take_note 都缺少生命周期标注，两个方法都会同时报错',
   '结构体字段 text 的类型是 &\'a str，方法返回值也得写成 &\'a str'
  ],
  why:[
   '方法完全可以接收任意多个额外的引用参数，只需生命周期关系合法即可。',
   '',
   'get_text 返回的是 self.text，恰好符合省略规则三“返回值赋予 &self 的生命周期”，因此 get_text 能正常编译。',
   '即使不写 &\'a str，只要返回的数据确实借自 self，省略规则三就能自动完成推断。'
  ],
  answer:1,
  explain:'根据生命周期省略规则三，带 &self 的方法默认把返回引用的生命周期绑定到 &self；take_note 却返回了与 self 无关的参数 note，编译器不知 note 能否活得像 &self 一样久，需显式写 fn take_note<\'b>(&self, note: &\'b str) -> &\'b str。'
 },
 {
  id:'rust-x2-5',
  type:'multi',
  q:'关于 Rust 的结构体、方法与关联函数，下面哪些说法正确？（多选）',
  options:[
   '同一个结构体可以分散编写多个 impl 块，编译器会将它们合并处理',
   '单元结构体（如 struct Empty;）在内存中固定占用 1 个字节的空间',
   '方法调用 obj.method() 会根据签名自动为接收者补上 &、&mut 或 * 解引用',
   '关联函数必须命名为 new，否则无法在外部通过 Type::func() 语法调用'
  ],
  why:[
   '',
   '单元结构体没有任何字段，属于零大小类型（ZST，Zero-Sized Type），在内存中占用 0 字节。',
   '',
   'new 只是社区约定的构造函数命名惯例，并非语言关键字，任意名字的无 self 关联函数都能用 Type::func() 调用。'
  ],
  answers:[0,2],
  explain:'Rust 允许为一个类型写多个 impl 块；方法调用具备自动引用与解引用机制；单元结构体大小是 0 字节（std::mem::size_of::<Empty>() == 0）；new 只是约定俗成的关联函数名。'
 },
 {
  id:'rust-x2-6',
  type:'judge',
  q:'使用结构体更新语法 let u2 = User { age: 20, ..u1 }; 时，Rust 会自动对 u1 中未实现 Copy 的字段调用 .clone()，因此 u1 的所有字段在之后依然可以继续使用。',
  answer:false,
  explain:'Rust 不会隐式调用 .clone()；结构体更新语法对未实现 Copy 的剩余字段执行的是所有权移动（move），被移走的字段无法再通过 u1 访问。'
 },
 {
  id:'rust-x2-7',
  q:'下面这段带有 @ 绑定与匹配守卫（match guard）的代码，运行后输出什么？',
  code:'fn classify(opt: Option<i32>) -> String {\n    match opt {\n        Some(n @ 1..=10) if n % 2 == 0 => format!("even:{n}"),\n        Some(n @ 1..=10) => format!("odd:{n}"),\n        Some(n) => format!("other:{n}"),\n        None => String::from("none"),\n    }\n}\n\nfn main() {\n    println!("{} {}", classify(Some(7)), classify(Some(8)));\n}',
  options:[
   'other:7 even:8',
   'odd:7 even:8',
   'odd:7 odd:8',
   'even:7 other:8'
  ],
  why:[
   '7 在 1..=10 范围内，第一条分支因守卫 7 % 2 == 0 为假而未命中，会落入第二条分支命中 odd:7，不会跳到第三条。',
   '',
   '8 在 1..=10 范围内且满足守卫 8 % 2 == 0，直接命中第一条分支输出 even:8。',
   '7 不满足偶数守卫会进入第二条分支得 odd:7，8 满足第一条分支得 even:8。'
  ],
  answer:1,
  explain:'n @ 1..=10 在测试值是否处于闭区间 [1, 10] 的同时将值绑定给变量 n；当匹配守卫计算为 false 时，match 会继续向下尝试后续分支。'
 },
 {
  id:'rust-x2-8',
  q:'下面这段操作 Option<String> 的代码，运行后输出什么？',
  code:'fn main() {\n    let mut slot = Some(String::from("rust"));\n    let len = slot.as_ref().map(|s| s.len()).unwrap_or(0);\n    let taken = slot.take();\n    println!("{len} {:?} {:?}", taken, slot);\n}',
  options:[
   '0 Some("rust") None',
   '4 Some("rust") Some("rust")',
   '0 None Some("rust")',
   '4 Some("rust") None'
  ],
  why:[
   'slot.as_ref() 成功借用到 "rust"，s.len() 计算出的长度是 4 而不是 0。',
   'slot.take() 会把 Option 内部的值移出，并在原位置留下 None，因此最后 slot 是 None。',
   'as_ref() 借用后长度 len 为 4，且 take() 返回取出的 Some("rust")、令原变量 slot 变为 None。',
   ''
  ],
  answer:3,
  explain:'Option::as_ref(&self) -> Option<&T> 用于在不消费原 Option 的前提下借用内部值；Option::take(&mut self) -> Option<T> 则把内部值取出并原地替换为 None。'
 },
 {
  id:'rust-x2-9',
  q:'下面代码中，调用 parse_pos("12") 与 parse_pos("-5") 的返回值分别是什么？',
  code:'fn to_num(s: &str) -> Option<i32> {\n    s.parse::<i32>().ok()\n}\n\nfn check_pos(n: i32) -> Option<i32> {\n    if n > 0 { Some(n) } else { None }\n}\n\nfn parse_pos(s: &str) -> Option<i32> {\n    to_num(s).and_then(check_pos).map(|n| n * 2)\n}',
  options:[
   'Some(24) 与 None',
   'Some(Some(24)) 与 None',
   'Some(12) 与 Some(-10)',
   'Some(24) 与 Some(-10)'
  ],
  why:[
   '',
   '如果用 .map(check_pos) 才会产生嵌套的 Option<Option<i32>>，而 and_then 会自动展平一层 Option。',
   '12 通过 check_pos 后还会经过 .map(|n| n * 2) 变为 Some(24)，且 -5 在 check_pos 中返回 None。',
   '-5 在 check_pos 中不满足 n > 0 返回 None，后续的 .map(|n| n * 2) 短路不执行。'
  ],
  answer:0,
  explain:'Option::and_then（类似 flat_map）专门用于串联返回 Option 的函数，遇到 Some 则继续调用并展平结果，遇到 None 则直接短路返回 None。'
 },
 {
  id:'rust-x2-10',
  q:'关于 Rust 的 let-else 语句，下面这段代码为什么会编译报错？',
  code:'fn read_port(opt: Option<u16>) -> u16 {\n    let Some(p) = opt else {\n        println!("使用默认端口");\n        8080\n    };\n    p + 1\n}',
  options:[
   'let-else 语句不支持用来解构标准库的 Option<T> 枚举',
   '模式里绑定的变量 p 作用域仅限 let 行内部，下方 p + 1 访问不到',
   'else 块没有发散（缺少 return / break / continue / panic!）',
   '8080 后面少写了分号，加上分号令 else 块返回 () 即可通过编译'
  ],
  why:[
   'let-else 专门用来匹配 Option、Result 等各种可驳模式（refutable pattern）。',
   'let-else 的核心优势正是把匹配成功的变量 p 直接绑定到外层作用域供后续代码使用。',
   '',
   '即使加上分号让 else 块求值为 ()，控制流仍会继续向下走到 p + 1（此时 p 未初始化），编译器禁止 else 块正常滑落。'
  ],
  answer:2,
  explain:'let Pattern = expr else { ... }; 要求 else 分支必须是发散块（diverging block，类型为 !），即通过 return、break、continue 或 panic! 提前离开当前控制流，以保证后续代码里模式绑定的变量已初始化。'
 },
 {
  id:'rust-x2-11',
  type:'multi',
  q:'关于 Rust 的枚举（enum）与模式匹配，下面哪些说法正确？（多选）',
  options:[
   '枚举的所有变体必须携带相同类型的数据，否则无法放入同一个枚举中',
   'match 表达式要求穷尽所有可能情况，遗漏变体会在编译期被直接拒绝',
   '当只关心某一种模式而忽略其余情况时，可用 if let 代替单分支 match',
   '在 match 分支中使用通配符 _ 不会绑定值，也不会触发值的移动（move）'
  ],
  why:[
   'Rust 枚举是代数数据类型（标签联合），不同变体可以分别是无数据、元组形式或结构体形式。',
   '',
   '',
   ''
  ],
  answers:[1,2,3],
  explain:'Rust 枚举各变体可携带完全不同形式的数据；match 强制编译期穷尽性检查；if let 适合简化只处理单一分支的场景；_ 通配符既不绑定变量也不移动被匹配的值（与之不同，普通变量名如 other 会绑定并可能移动值）。'
 },
 {
  id:'rust-x2-12',
  type:'judge',
  q:'得益于空指针生态位优化（niche optimization），Option<&T> 和 Option<Box<T>> 在内存中的字节大小与裸引用 &T、Box<T> 完全相同，没有额外的标签字节开销。',
  answer:true,
  explain:'因为合法的 &T 和 Box<T> 非空（不能为 0 地址），Rust 编译器直接复用全 0 位模式表示 None，使 std::mem::size_of::<Option<&T>>() == std::mem::size_of::<&T>()。'
 },
 {
  id:'rust-x2-13',
  type:'fill',
  q:'如果有一个可变变量 let mut opt = Some(String::from("data"));，想在不克隆的前提下把里面的 String 取出来（得到 Some(String)），同时让 opt 原地变成 None，应调用 opt.＿()。',
  accepted:['take'],
  explain:'Option::take(&mut self) -> Option<T> 通过 std::mem::replace(self, None) 把原 Option 中的值移出，并在原位置留下 None，常用于在 &mut self 方法中转移 Option 字段的所有权。'
 },
 {
  id:'rust-x2-14',
  q:'下面这段操作 Vec<i32> 的代码为什么无法通过编译？',
  code:'fn main() {\n    let mut v = vec![10, 20, 30];\n    let first = &v[0];\n    v.push(40);\n    println!("{first}");\n}',
  options:[
   'vec! 宏创建的动态数组容量固定，不能再调用 push 追加元素',
   'first 持有不可变借用期间调用 v.push(&mut v)，扩容可能令 first 悬垂',
   '&v[0] 会把第一个元素从 Vec 中移走，导致后续 v 处于不完整状态',
   '打印引用类型 first 时必须在格式串里使用 {:?} 而不能用 {}'
  ],
  why:[
   'Vec 是可在堆上动态扩容的连续数组，只要声明为 let mut 即可随时 push。',
   '',
   'i32 实现了 Copy，且 &v[0] 只创建不可变借用，并不会移走元素。',
   '&i32 自动实现了 Display，用 {} 打印完全合法；真正原因在于借用冲突。'
  ],
  answer:1,
  explain:'v.push(40) 需要 &mut v；若此时 Vec 容量已满，push 会在堆上分配新内存、拷贝旧元素并释放旧内存，这会使仍指向旧内存首元素的 first 沦为悬垂引用，借用检查器因此在编译期拦截。'
 },
 {
  id:'rust-x2-15',
  q:'关于 Rust 字符串的 UTF-8 编码与切片，下面这段代码运行后会发生什么？',
  code:'fn main() {\n    let s = String::from("Hi你好");\n    println!("{} {}", s.len(), s.chars().count());\n    let sub = &s[0..3];\n    println!("{sub}");\n}',
  options:[
   '编译通过，第一行输出 4 4，第二行输出 Hi你',
   '编译通过，第一行输出 8 4，第二行输出 Hi你',
   '编译期直接报错：String 类型不支持使用 [start..end] 范围切片',
   '第一行输出 8 4，随后在执行 &s[0..3] 时因切在字符中间触发 panic'
  ],
  why:[
   's.len() 返回的是 UTF-8 字节数（2 + 3 + 3 = 8）而不是字符个数，且字节索引 3 不在字符边界上。',
   '汉字“你”在 UTF-8 中占 3 个字节（索引 2..5），&s[0..3] 只截取了它的第 1 个字节，无法构成合法 UTF-8 切片。',
   'String 支持按字节范围切片，但字符边界校验是在运行期执行的，编译期不会报错。',
   ''
  ],
  answer:3,
  explain:'"Hi" 占 2 字节，"你好" 各占 3 字节，因此 s.len() 为 8、s.chars().count() 为 4；切片索引按字节计量，索引 3 落在“你”（字节 2..5）内部，运行时触发 byte index 3 is not a char boundary 的 panic。'
 },
 {
  id:'rust-x2-16',
  q:'下面这段使用 HashMap::entry 统计词频并修改计数的代码，运行后输出什么？',
  code:'use std::collections::HashMap;\n\nfn main() {\n    let mut map = HashMap::new();\n    for w in ["a", "b", "a", "a"] {\n        map.entry(w).and_modify(|c| *c += 10).or_insert(1);\n    }\n    println!("{} {}", map["a"], map["b"]);\n}',
  options:[
   '21 1',
   '30 10',
   '31 11',
   '3 1'
  ],
  why:[
   '',
   '某键第一次出现时 Entry 为 Vacant，and_modify 不会执行，而是由 or_insert(1) 插入初始值 1。',
   'and_modify 只在键已存在（Occupied）时才触发，第一次插入 "a" 和 "b" 时不会加 10。',
   '已存在的键每次触发的是 *c += 10 而不是加 1，"a" 共出现 3 次：初始 1 + 10 + 10 = 21。'
  ],
  answer:0,
  explain:'entry(w) 返回 Entry 枚举：键不存在时跳过 and_modify 并执行 or_insert(1) 设为 1；键已存在时执行 and_modify(|c| *c += 10) 并跳过 or_insert。因此 "a" 依次变为 1 -> 11 -> 21，"b" 为 1。'
 },
 {
  id:'rust-x2-17',
  q:'下面这段使用 ? 运算符传播错误的代码，为什么在编译 check_and_parse 时会报错？',
  code:'use std::num::ParseIntError;\n\nfn check_and_parse(s: &str) -> Result<i32, ParseIntError> {\n    let trimmed = s.trim();\n    if trimmed.is_empty() {\n        return Err("empty input");\n    }\n    let n = trimmed.parse::<i32>()?;\n    Ok(n * 2)\n}',
  options:[
   'trimmed.parse::<i32>() 返回的是 Option<i32>，不能对其使用 ? 运算符',
   '? 运算符仅允许放在 main 函数里使用，普通自定义函数不支持 ? 语法',
   'Err("empty input") 的错误类型是 &str，与签名中的 ParseIntError 不匹配',
   'let n = trimmed.parse::<i32>()?; 解包后 n 仍是 Result，不能直接乘 2'
  ],
  why:[
   'str::parse::<i32>() 返回的是 Result<i32, ParseIntError>，对其使用 ? 完全合法。',
   '任何返回 Result 或 Option 的函数都可以使用 ? 运算符提前传播错误或 None。',
   '',
   '? 在遇到 Ok(v) 时会直接把内部值 v 解包赋给 n，因此 n 的类型已经是 i32。'
  ],
  answer:2,
  explain:'函数签名声明的错误类型是 ParseIntError，而 return Err("empty input") 返回的是 Result<_, &str>；要在同一函数中返回多种错误，应定义自定义错误枚举并实现 From<ParseIntError>。'
 },
 {
  id:'rust-x2-18',
  type:'multi',
  q:'关于 Rust 的错误处理（panic!、Result 与 ? 运算符），下面哪些说法正确？（多选）',
  options:[
   '对 Result<T, E> 使用 ? 时，若遇到 Err(e) 会自动调用 From::from(e) 转换错误类型',
   '在返回 Option<T> 的函数中，也可以对另一个 Option 表达式使用 ? 提前返回 None',
   'Result::unwrap_or(fallback()) 具备惰性求值特性，仅在 Err 时才调用 fallback()',
   '编写供他人调用的库（library crate）时，通常应优先返回 Result 而非直接 panic!'
  ],
  why:[
   '',
   '',
   'unwrap_or(fallback()) 的参数在进入方法前就会立即求值；需要仅在 Err 时惰性调用闭包，应当使用 unwrap_or_else(|| fallback())。',
   ''
  ],
  answers:[0,1,3],
  explain:'? 运算符借助 From trait 实现跨错误类型自动转换，且同样适用于返回 Option 的函数；unwrap_or 是及早求值而 unwrap_or_else 才是惰性求值；库代码应把错误处理决定权通过 Result 交给调用方。'
 },
 {
  id:'rust-x2-19',
  type:'judge',
  q:'因为 String 底层封装了 Vec<u8>，所以可以直接写 s[0] 按 O(1) 时间复杂度取出字符串的第一个 char 字符。',
  answer:false,
  explain:'String 和 str 未实现整数下标索引 Index<usize>，写 s[0] 会直接编译报错；因为 UTF-8 是变长编码（1~4 字节），无法按 O(1) 定位第 N 个 Unicode 字符，且直接返回单个字节也容易被误当作字符。'
 },
 {
  id:'rust-x2-20',
  type:'fill',
  q:'使用 HashMap 统计频次时，经典的写法是 *map.entry(key).＿(0) += 1;：当 key 不存在时先插入默认值 0，然后返回指向该值的可变引用 &mut V。',
  accepted:['or_insert'],
  explain:'Entry::or_insert(default) 在键不存在时插入 default，在键已存在时保持原值，两种情况下都返回 &mut V，通过解引用 * 即可原地修改。'
 },
 {
  id:'rust-x2-21',
  q:'在下面这段模块代码中，外层函数 test_access 里哪一行会因为可见性（私有权）规则而编译报错？',
  code:'mod auth {\n    pub struct Account {\n        pub username: String,\n        token: String,\n    }\n    pub enum Role {\n        Guest,\n        Admin,\n    }\n}\n\nfn test_access() {\n    let r1 = auth::Role::Guest;   // 第 1 行\n    let r2 = auth::Role::Admin;   // 第 2 行\n    let acc = auth::Account {\n        username: String::from("u"),\n        token: String::from("t"), // 第 3 行\n    };\n    println!("{}", acc.username);\n}',
  options:[
   '第 1 行报错：枚举变体 Guest 没有单独标注 pub 关键字',
   '第 2 行报错：枚举变体 Admin 没有单独标注 pub 关键字',
   '第 3 行报错：pub struct 的字段默认仍是私有的，外部不能直接构造或访问 token',
   '都不会报错：既然 Account 标了 pub，它内部的所有字段都会自动对外公开'
  ],
  why:[
   '只要 enum 本身标记了 pub，它的所有变体都会自动变为公开，且语法上不允许给变体加 pub。',
   '与 Guest 同理，pub enum Role 下的 Admin 变体自动对外公开。',
   '',
   '结构体的可见性规则与枚举不同：pub struct 仅公开类型名，字段默认依然私有，需逐个标 pub。'
  ],
  answer:2,
  explain:'在 Rust 中：pub enum 的所有变体自动公开；而 pub struct 的字段默认仍是私有的，只要结构体含有私有字段，模块外部就不能直接用结构体字面量构造它，必须通过模块提供的公有关联函数（如 Account::new）构造。'
 },
 {
  id:'rust-x2-22',
  q:'关于 Rust 模块树中的父子模块可见性与 pub(crate) / pub(super)，下面哪项描述是正确的？',
  options:[
   '子模块可以直接访问父模块中的私有项，而父模块访问子模块中的项需要该项标 pub',
   '父模块可以直接访问子模块中的所有私有项，而子模块无法访问父模块的私有项',
   'pub(crate) 表示该项可以跨 crate 被任何依赖当前项目的外部第三方包公开调用',
   'pub(super) 表示该项在整个当前 crate 的根模块及所有层级的子模块中都可见'
  ],
  why:[
   '',
   '方向说反了：子模块位于父模块内部，天然能看到祖先模块的私有实现；父模块看子模块则受封装保护。',
   'pub(crate) 仅在“当前 crate 内部”可见，外部依赖当前库的其他 crate 无法访问它。',
   'pub(super) 仅向“直接上一级父模块”（及当前模块内部）公开，并非整个 crate 全局可见。'
  ],
  answer:0,
  explain:'Rust 模块的默认私有性是向内透明、向外隐藏的：子模块能访问祖先模块的私有项，父模块则只能访问子模块通过 pub、pub(super) 或 pub(crate) 暴露出来的项。'
 },
 {
  id:'rust-x2-23',
  q:'在一个标准的 Cargo 包（Package）中，关于库单元包（library crate）和二进制单元包（binary crate）的数量限制，下面哪项正确？',
  options:[
   '最多包含 1 个 binary crate，但可以同时包含任意多个 library crate',
   '最多包含 1 个 library crate，但可以同时包含任意多个 binary crate',
   'library crate 和 binary crate 互斥，同一个 Package 里不能同时存在 src/lib.rs 和 src/main.rs',
   '最多包含 1 个 library crate 和 1 个 binary crate，不支持放置多个可执行入口'
  ],
  why:[
   '限制关系反了：一个 Package 最多只能有 1 个 library crate（src/lib.rs）。',
   '',
   '同一个 Package 完全可以同时拥有 src/lib.rs 和 src/main.rs，且 main.rs 可直接引用 lib.rs 暴露的 API。',
   '除了 src/main.rs 外，还可以在 src/bin/ 目录下放置多个 .rs 文件，每个文件都会编译为独立的 binary crate。'
  ],
  answer:1,
  explain:'Cargo 规定一个 Package 至少包含一个 crate，其中 library crate（src/lib.rs）最多只能有 0 或 1 个，而 binary crate 可以有任意多个（src/main.rs 以及 src/bin/*.rs）。'
 },
 {
  id:'rust-x2-24',
  type:'multi',
  q:'关于 pub use 重导出、Cargo.toml 配置与 cargo test 测试体系，下面哪些说法正确？（多选）',
  options:[
   'pub use 可以将深层内部模块的类型重导出到顶层，隐藏内部目录结构并方便调用方导入',
   '写在同文件 #[cfg(test)] mod tests 里的单元测试属于子模块，可直接测试父模块的私有函数',
   '文档注释 /// 中的 Markdown 代码块在运行 cargo test 时会被当作文档测试自动编译并执行',
   'Cargo.toml 中 [dev-dependencies] 下的依赖仅在测试、示例和基准测试时参与编译链接'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'pub use 常用于打平对外 API 层级；#[cfg(test)] mod tests 作为子模块能直接测试父模块的私有函数；/// 文档注释中的代码示例由 rustdoc 作为测试运行，防止文档过时；[dev-dependencies] 不会污染正式发布构建。'
 },
 {
  id:'rust-x2-25',
  type:'judge',
  q:'在单元测试中，如果某个测试函数预期会触发 panic，可以为其加上 #[should_panic] 属性（还可配合 expected = "..." 校验 panic 消息子串），使该测试在发生预期 panic 时判定为通过。',
  answer:true,
  explain:'#[test] 搭配 #[should_panic(expected = "...")] 可以专门验证非法输入或越界防御逻辑是否按预期触发了含特定提示文本的 panic。'
 },
 {
  id:'rust-x2-26',
  q:'下面这段包含 Trait 默认方法与方法重写的代码，运行后输出什么？',
  code:'trait Summary {\n    fn title(&self) -> String;\n    fn badge(&self) -> String {\n        format!("[{}]", self.title())\n    }\n}\n\nstruct Post;\nimpl Summary for Post {\n    fn title(&self) -> String {\n        String::from("Rust")\n    }\n}\n\nstruct Alert;\nimpl Summary for Alert {\n    fn title(&self) -> String {\n        String::from("Warn")\n    }\n    fn badge(&self) -> String {\n        format!("!{}!", self.title())\n    }\n}\n\nfn main() {\n    println!("{} {}", Post.badge(), Alert.badge());\n}',
  options:[
   '编译报错：Trait 的默认方法 badge 内部不能调用尚未实现的 title 方法',
   '编译报错：Alert 已经实现了 title，不允许再重写带有默认实现的 badge 方法',
   '[Rust] [Warn]',
   '[Rust] !Warn!'
  ],
  why:[
   'Trait 的默认方法完全可以调用同一个 Trait 中的其他方法（哪怕该方法没有默认实现）。',
   '实现 Trait 的类型既可以直接沿用默认方法，也可以提供自定义实现来覆盖默认方法。',
   'Alert 重写了 badge() 方法，因此 Alert.badge() 会执行重写后的 format!("!{}!", ...)，输出 !Warn!。',
   ''
  ],
  answer:3,
  explain:'Trait 默认方法可以调用同 Trait 的其他方法；Post 沿用了默认的 badge() 输出 [Rust]，而 Alert 重写了 badge() 输出 !Warn!。'
 },
 {
  id:'rust-x2-27',
  q:'根据 Rust 的孤儿规则（Orphan Rule / 相干性原则），在【你自己编写的业务 crate】中，下面哪一个 impl 块会被编译器拒绝？',
  options:[
   '为你自己定义的结构体 MyPoint 实现标准库的 std::fmt::Display trait',
   '为标准库的 Vec<i32> 类型直接实现标准库的 std::fmt::Display trait',
   '为标准库的 String 类型实现你自己定义的清洗接口 Sanitize trait',
   '为你自己定义的元组结构体 Wrapper(Vec<i32>) 实现 std::fmt::Display trait'
  ],
  why:[
   'MyPoint 是当前 crate 本地定义的类型，为其实现外部 trait 符合孤儿规则。',
   '',
   'Sanitize 是当前 crate 本地定义的 trait，为外部类型 String 实现本地 trait 符合孤儿规则。',
   'Wrapper 是用 Newtype 模式在当前 crate 定义的本地包装类型，为其实现 Display 是绕开孤儿规则的标准做法。'
  ],
  answer:1,
  explain:'孤儿规则要求：在为类型 T 实现 Trait 时，Trait 和 T 中至少有一个必须是在当前 crate 本地定义的。Vec<T> 与 Display 都来自标准库，直接 impl Display for Vec<i32> 会被拒绝，需用 Newtype 包装。'
 },
 {
  id:'rust-x2-28',
  q:'关于标准库中的 From / Into 与 fmt::Display / ToString，下面这段代码为什么能直接调用 .into() 和 .to_string()？',
  code:'use std::fmt;\n\nstruct Code(u16);\n\nimpl From<u16> for Code {\n    fn from(v: u16) -> Self { Code(v) }\n}\n\nimpl fmt::Display for Code {\n    fn fmt(&self, f: &mut fmt::Formatter<\'_>) -> fmt::Result {\n        write!(f, "E{}", self.0)\n    }\n}\n\nfn main() {\n    let c: Code = 404_u16.into();\n    println!("{}", c.to_string());\n}',
  options:[
   '标准库提供了泛型一揽子实现（Blanket impl）：实现 From 自动获得 Into，实现 Display 自动获得 ToString',
   'Rust 编译器为所有元组结构体都在后台隐式生成了 Into 和 ToString 的宏展开代码',
   '只有当内部字段是 u16 等基础整数时，才能借用整数自带的 into() 和 to_string() 方法',
   '这段代码其实无法通过编译，必须再手写 impl Into<Code> for u16 和 impl ToString for Code'
  ],
  why:[
   '',
   '并非元组结构体特权，任何自定义类型只要实现了 From 和 Display，都会通过标准库的泛型实现获得对应能力。',
   'c.to_string() 调用的是 Code 上的 Display 实现（输出 "E404"），而不是直接调用内部 u16 的方法。',
   '这段代码完全合法，反而如果再去手写 impl Into<Code> for u16 会与标准库的一揽子实现发生冲突报错。'
  ],
  answer:0,
  explain:'标准库包含泛型一揽子实现 impl<T, U> Into<U> for T where U: From<T> 和 impl<T: fmt::Display> ToString for T；因此日常开发中只需实现 From 和 Display，就能免费获得 .into() 与 .to_string()。'
 },
 {
  id:'rust-x2-29',
  q:'如果想把 Circle 和 Square 两种不同大小的具体结构体混合存进同一个 Vec 并统一调用 draw(&self)，下面哪种类型定义能够通过编译？',
  code:'trait Draw {\n    fn draw(&self) -> String;\n}\nstruct Circle { r: f64 }\nstruct Square { a: f64, b: f64 }\n// Circle 和 Square 均已实现 Draw',
  options:[
   'fn render_all<T: Draw>(items: Vec<T>) —— 同一个 Vec<T> 里可同时放入 Circle 和 Square',
   'let items: Vec<dyn Draw> = vec![...]; —— 直接把裸 trait 对象按值存进 Vec 连续内存中',
   'let items: Vec<Box<dyn Draw>> = vec![Box::new(Circle { r: 1.0 }), Box::new(Square { a: 2.0, b: 2.0 })];',
   'fn make_shape(flag: bool) -> impl Draw { if flag { Circle { r: 1.0 } } else { Square { a: 2.0, b: 2.0 } } }'
  ],
  why:[
   '泛型 Vec<T> 在单态化后 T 只能对应同一种具体类型（要么全是 Circle，要么全是 Square），不能混装。',
   'dyn Draw 是动态大小类型（DST，编译期大小未知），不能直接作为 Vec 的元素类型，必须放在引用或智能指针如 Box 后面。',
   '',
   '返回值位置的 impl Trait 要求所有控制流分支返回同一种具体类型，if/else 分别返回 Circle 和 Square 会编译报错。'
  ],
  answer:2,
  explain:'混装不同具体类型的异构集合需要借助动态分发：Box<dyn Draw> 是固定大小（两个机器字长：数据指针 + 虚表 vtable 指针）的胖指针，可以整齐地存入 Vec<Box<dyn Draw>>。'
 },
 {
  id:'rust-x2-30',
  q:'在设计 Trait 时，关于“关联类型（type Item;）”与“泛型参数（trait Convert<T>）”的区别，下面哪项说法正确？',
  options:[
   '关联类型只允许绑定为基础标量类型，不能指定为结构体、枚举或带生命周期的引用',
   '同一个类型可以为含关联类型的 Trait（如 Iterator）同时提供多份不同 Item 类型的实现',
   '标准库的 From<T> 使用的是关联类型而非泛型参数，所以一个类型最多仅支持从一种类型转来',
   '关联类型限制每个具体类型对该 Trait 仅有一份实现，调用处无需像泛型 Trait 那样反复标注类型参数'
  ],
  why:[
   '关联类型可以绑定为任意类型，包括自定义结构体、枚举、元组乃至引用类型。',
   '含关联类型的 Trait 对同一个具体类型只能实现一次（例如一个计数器类型只能有一个确定的 Item 类型）。',
   'From<T> 使用的是泛型参数 T，正因如此 String 才能同时实现 From<&str>、From<char> 等多种转换。',
   ''
  ],
  answer:3,
  explain:'当“一个具体类型实现该 Trait 时，输出类型是唯一确定的”（如 Iterator 的 Item），应使用关联类型以简化调用方签名；当“同一个类型需要针对不同目标类型实现多次”（如 From<T>）时，则使用泛型 Trait。'
 },
 {
  id:'rust-x2-31',
  type:'multi',
  q:'关于泛型单态化（Monomorphization，静态分发）与 Trait 对象（dyn Trait，动态分发），下面哪些说法正确？（多选）',
  options:[
   '泛型函数在编译期会按用到的具体类型展开为专用机器码，运行期无虚表查找开销且便于内联',
   '使用 &dyn Trait 或 Box<dyn Trait> 时，胖指针中同时保存了数据地址和虚函数表（vtable）地址',
   '任何 Trait 都能直接做成 dyn Trait 使用，即使它的某个方法返回 Self 或带有泛型类型参数',
   '单态化虽然消除了运行期动态分发开销，但若对大量不同类型实例化同一大函数会增加二进制体积'
  ],
  why:[
   '',
   '',
   '只有满足“对象安全 / dyn 兼容（dyn compatibility）”的 Trait 才能作为 dyn Trait；方法返回 Self（无 Sized 约束）或方法自身带泛型参数都会破坏对象安全。',
   ''
  ],
  answers:[0,1,3],
  explain:'静态分发通过单态化实现零运行时抽象开销，代价是可能产生代码膨胀；动态分发通过（数据指针, vtable 指针）胖指针在运行期查表调用，支持异构集合但要求 Trait 满足 dyn 兼容性。'
 },
 {
  id:'rust-x2-32',
  type:'judge',
  q:'在为自定义类型实现类型转换时，只要手动实现了 Into<Target> for Source，标准库就会自动为你生成对应的 From<Source> for Target 实现。',
  answer:false,
  explain:'方向反了！标准库的泛型一揽子实现是“实现 From 自动赠送 Into”（impl<T, U> Into<U> for T where U: From<T>），反过来手写 Into 并不会自动生成 From，因此应当优先实现 From。'
 },
 {
  id:'rust-x2-33',
  q:'下面这段带 move 关键字的闭包代码，能通过编译并运行吗？',
  code:'fn call_twice<F: Fn() -> usize>(f: F) -> usize {\n    f() + f()\n}\n\nfn main() {\n    let s = String::from("hello");\n    let get_len = move || s.len();\n    println!("{}", call_twice(get_len));\n}',
  options:[
   '编译报错：加了 move 的闭包只实现 FnOnce，不能传给要求 Fn() 的 call_twice',
   '编译通过并输出 10（move 决定按值捕获 s，但闭包体仅只读借用 s，因此仍实现 Fn）',
   '编译报错：第一次调用 f() 时 s 已被销毁，call_twice 内部无法调用第二次 f()',
   '编译通过并输出 5（第二次调用 f() 时闭包内的 s 已经被置为空字符串）'
  ],
  why:[
   'move 只改变“如何捕获变量”（强制把 s 的所有权移入闭包结构体），而闭包实现 Fn/FnMut/FnOnce 取决于闭包体“如何使用被捕获的值”。',
   '',
   '闭包体里只调用了 s.len()（仅需 &s），并未把 s 从闭包自身中移走或消费掉，因此可以重复调用任意多次。',
   '两次调用读取的都是闭包自身持有的同一个 "hello"，5 + 5 = 10。'
  ],
  answer:1,
  explain:'这是极易混淆的高频考点：move 关键字只规定“捕获方式”（按所有权移入闭包环境），而 Fn / FnMut / FnOnce 取决于闭包体“对捕获变量的使用方式”。由于 s.len() 只读取 s，get_len 依然实现了 Fn。'
 },
 {
  id:'rust-x2-34',
  q:'下面这段使用闭包累加状态的代码，为什么无法通过编译？',
  code:'fn main() {\n    let mut total = 0;\n    let add = |x: i32| {\n        total += x;\n        total\n    };\n    println!("{} {}", add(3), add(4));\n}',
  options:[
   '闭包的参数类型和返回类型不能依赖编译器推断，必须把返回类型 -> i32 写出来',
   '闭包不能直接按可变借用捕获外层的 total，必须显式加上 move 关键字才能修改',
   'add 闭包内部修改了捕获的 total，调用 FnMut 闭包要求把变量声明为 let mut add',
   '在同一个 println! 宏的参数列表里不允许连续调用同一个闭包两次'
  ],
  why:[
   'Rust 能够自动推断闭包的参数与返回值类型，是否写出 -> i32 与本题报错无关。',
   '如果加上 move，由於 i32 实现了 Copy，闭包会复制一份独立的 total 副本，反而无法修改外层 total，且仍需 let mut add。',
   '',
   '只要声明为 let mut add，在 println!("{} {}", add(3), add(4)) 中先后调用两次完全合法。'
  ],
  answer:2,
  explain:'闭包体执行 total += x 需要按可变引用 &mut total 捕获变量，该闭包实现了 FnMut（签名为 call_mut(&mut self, ...)）；既然调用闭包本身需要 &mut self，绑定闭包的变量就必须声明为 let mut add。'
 },
 {
  id:'rust-x2-35',
  q:'Rust 迭代器适配器是惰性（lazy）的。下面这段代码运行后，最后一行打印的 steps 和 v 分别是什么？',
  code:'fn main() {\n    let mut steps = 0;\n    let data = [1, 2, 3, 4, 5, 6];\n    let v: Vec<i32> = data\n        .iter()\n        .map(|&x| {\n            steps += 1;\n            x * 10\n        })\n        .filter(|&y| y >= 20)\n        .take(2)\n        .collect();\n    println!("{steps} {:?}", v);\n}',
  options:[
   '3 [20, 30]',
   '6 [20, 30]',
   '2 [20, 30]',
   '3 [10, 20]'
  ],
  why:[
   '',
   '迭代器不会先把 6 个元素全部 map 完再 filter 和 take，而是按需逐个拉取，take(2) 拿够 2 个元素后立即停止拉取。',
   '第 1 个元素 1 经过 map 得到 10（steps=1），被 filter 过滤掉；随后还需处理 2（steps=2）和 3（steps=3）才能凑够 2 个结果，因此 steps 是 3 不是 2。',
   '元素 1 经过 map 得到的 10 不满足 filter(|&y| y >= 20)，被过滤掉了，结果 Vec 中是 [20, 30]。'
  ],
  answer:0,
  explain:'迭代器链按元素逐个流式拉取（pull-based）：x=1 -> map 得 10(steps=1) -> filter 不通过；x=2 -> map 得 20(steps=2) -> filter 通过(第1个)；x=3 -> map 得 30(steps=3) -> filter 通过(第2个)。此时 take(2) 已满，后续 4、5、6 根本不会进入 map！'
 },
 {
  id:'rust-x2-36',
  type:'multi',
  q:'关于迭代器的三种创建方式（iter / iter_mut / into_iter）与消费器，下面哪些说法正确？（多选）',
  options:[
   '对 Vec<String> 调用 v.iter() 后，每次 next() 产出的是拥有所有权的 String 元素',
   'for x in &v 等价于遍历 v.iter()，for x in v 则等价于调用 v.into_iter() 并转移 v 的所有权',
   'Iterator<Item = Result<T, E>> 可以直接 collect 为 Result<Vec<T>, E>，遇到首个 Err 即短路返回',
   '只要写下 v.iter().map(|x| println!("{x}")); 不加分号，即使不调用消费器也会立即打印所有元素'
  ],
  why:[
   'v.iter() 创建的是不可变借用迭代器，产出类型是 &String；只有 v.into_iter() 才会消费 Vec 并产出 String。',
   '',
   '',
   'map 返回的 Map<...> 适配器本身也是惰性的，如果不调用 collect()、count()、for_each() 或放入 for 循环，闭包一次也不会执行。'
  ],
  answers:[1,2],
  explain:'iter() 产出 &T，iter_mut() 产出 &mut T，into_iter() 产出 T；Result<FromIterator<T>, E> 实现了 FromIterator<Result<T, E>>，支持极其优雅的带短路错误收集；惰性适配器不消费就不执行。'
 },
 {
  id:'rust-x2-37',
  type:'fill',
  q:'在串联完 .map(...)、.filter(...) 等惰性迭代器适配器后，若想驱动迭代器运行并将产出元素汇总为 Vec<T>、HashMap<K, V> 或 Result<Vec<T>, E>，最常用的消费方法是 .＿()。',
  accepted:['collect'],
  explain:'Iterator::collect 借助 FromIterator trait，能将任意迭代器收集为各种集合类型（Vec、HashMap、HashSet、String）乃至 Result<Vec<T>, E> 和 Option<Vec<T>>。'
 },
 {
  id:'rust-x2-38',
  type:'short',
  q:'请简述 Rust 闭包的三个 Trait（Fn、FnMut、FnOnce）分别代表什么含义、它们之间的继承（子 Trait）关系是什么？为什么带有 move 关键字的闭包依然可能实现 Fn 或 FnMut？',
  reference:'1. 三个 Trait 的含义：\n- FnOnce：闭包在调用时需要消费（移走/销毁）其捕获的值，或者至少能被调用一次（签名接收 self）；此类闭包最多只能被调用一次。\n- FnMut：闭包在调用时会修改其捕获的环境（按可变借用访问捕获变量，签名接收 &mut self），不销毁捕获值，可被多次调用（绑定闭包的变量需加 mut）。\n- Fn：闭包在调用时仅以只读方式访问捕获的环境（或不捕获任何变量，签名接收 &self），可被并发或重复调用多次。\n2. 继承关系：Fn 是 FnMut 的子 Trait，FnMut 是 FnOnce 的子 Trait（即 Fn: FnMut，FnMut: FnOnce）。因此任何实现了 Fn 的闭包都自动实现了 FnMut 和 FnOnce，可传给要求 FnMut 或 FnOnce 的高阶函数。\n3. move 与 Fn/FnMut 的关系：move 关键字只决定闭包“如何从外层作用域捕获变量”（强制将变量的所有权移入闭包自身的结构体中），而闭包实现哪个 Trait 取决于闭包体内部“如何使用这些捕获进来的变量”。如果 move 闭包内部只是读取该字段或原地修改该字段、并没有把字段从闭包自身中移走，它就依然实现了 Fn 或 FnMut。',
  points:[
   '准确区分 FnOnce（消费捕获值/仅能调一次）、FnMut（可变修改环境/可调多次）与 Fn（只读访问环境/可调多次）',
   '指出三者的子 Trait 层级关系：Fn: FnMut: FnOnce（实现 Fn 则自动实现 FnMut 和 FnOnce）',
   '说明 move 仅强制按所有权“捕获”变量到闭包结构体内，而实现哪个 Trait 取决于闭包体“如何使用”捕获值',
   '举例或说明：若 move 闭包体只读取或原地修改自身持有的字段而不将其移出，仍实现 Fn 或 FnMut'
  ],
  explain:'记住一句话：“move 管怎么抓进来，Fn / FnMut / FnOnce 管抓进来之后怎么用”。'
 },
 {
  id:'rust-x2-39',
  type:'short',
  q:'在 Rust 中使用 Trait 时，静态分发（泛型 <T: Trait> / impl Trait）与动态分发（&dyn Trait / Box<dyn Trait>）在底层机制、运行期性能、二进制体积以及异构集合存储上各有什么差异？应如何选择？',
  reference:'1. 底层机制：\n- 静态分发：编译器在编译期执行“单态化”（Monomorphization），针对每个实际用到的具体类型生成专门的函数版本，调用地址在编译期完全确定。\n- 动态分发：使用 Trait 对象（胖指针，包含 1 个指向具体数据的指针和 1 个指向虚函数表 vtable 的指针），在运行期通过查 vtable 间接调用对应方法。\n2. 性能与体积权衡：\n- 静态分发没有运行期查表开销，且编译器可以对具体函数进行内联（inline）和优化，运行速度最快；但若针对大量类型实例化复杂泛型函数，会造成代码膨胀、增大二进制体积和编译时间。\n- 动态分发在编译期只生成一份处理胖指针的代码，二进制体积更紧凑；代价是每次调用有一次虚表间接跳转，且阻碍编译器内联，如果用 Box<dyn Trait> 还伴随一次堆分配。\n3. 异构集合与选型建议：\n- 泛型 Vec<T> 只能存放同一种具体类型；当需要在同一个容器里混合存放多种实现同一 Trait 的不同具体类型（如 UI 组件树、插件列表），或者运行期才能决定具体类型时，应选用 Box<dyn Trait> / &dyn Trait（注意 Trait 需满足对象安全 / dyn 兼容）。\n- 对性能敏感的热路径、通用算法和基础数据结构，优先选用静态分发。',
  points:[
   '说明静态分发基于编译期单态化，动态分发基于（数据指针 + vtable 虚表指针）胖指针运行期查表',
   '对比性能与体积：静态分发零运行时查表开销、可内联但可能增大二进制体积；动态分发体积小但有间接调用开销且难以内联',
   '说明异构集合差异：Vec<T> 仅限同一种具体类型，混装不同具体类型需用 Vec<Box<dyn Trait>> 或 Vec<&dyn Trait>',
   '给出合理选型原则（热路径/通用库优先泛型静态分发，插件化/异构容器/擦除类型选用 dyn Trait）'
  ],
  explain:'静态分发用编译期代码复制换取极致的运行期零成本抽象；动态分发用胖指针和 vtable 换取运行期灵活性与异构擦除能力。'
 },
 {
  id:'rust-x2-40',
  type:'code',
  q:'实现一个统计各用户总分的错误处理函数 sum_scores(lines: &[&str]) -> Result<HashMap<String, i32>, ScoreError>：\n1. 定义错误枚举 ScoreError（派生 Debug, PartialEq），包含 EmptyLine、BadFormat(String) 和 BadNumber(ParseIntError) 三个变体，并为 ScoreError 实现 From<ParseIntError>；\n2. 遍历 lines：若 trim 后为空串则返回 Err(ScoreError::EmptyLine)；按 \':\' 切分（可用 split_once(\':\')），若格式不对则返回 Err(ScoreError::BadFormat(原行字符串))；将分数部分用 .trim().parse::<i32>()? 解析（利用 ? 自动转换错误），再用 HashMap::entry 将同一名字的分数累加；\n3. 写出 main 分别测试正常输入与错误输入。',
  reference:'use std::collections::HashMap;\nuse std::num::ParseIntError;\n\n#[derive(Debug, PartialEq)]\nenum ScoreError {\n    EmptyLine,\n    BadFormat(String),\n    BadNumber(ParseIntError),\n}\n\nimpl From<ParseIntError> for ScoreError {\n    fn from(e: ParseIntError) -> Self {\n        ScoreError::BadNumber(e)\n    }\n}\n\nfn sum_scores(lines: &[&str]) -> Result<HashMap<String, i32>, ScoreError> {\n    let mut totals = HashMap::new();\n    for &raw in lines {\n        let line = raw.trim();\n        if line.is_empty() {\n            return Err(ScoreError::EmptyLine);\n        }\n        let Some((name, num_str)) = line.split_once(\':\') else {\n            return Err(ScoreError::BadFormat(line.to_string()));\n        };\n        let score = num_str.trim().parse::<i32>()?;\n        *totals.entry(name.trim().to_string()).or_insert(0) += score;\n    }\n    Ok(totals)\n}\n\nfn main() {\n    let ok_data = ["Alice: 10", "Bob: 20", "Alice: 15"];\n    println!("{:?}", sum_scores(&ok_data));\n    let bad_data = ["Alice: 10", "Bob: xx"];\n    println!("{:?}", sum_scores(&bad_data));\n}',
  points:[
   '正确定义含三个变体的 ScoreError 枚举，并实现 From<ParseIntError> for ScoreError',
   '正确校验空行与冒号格式（如使用 let Some((k, v)) = line.split_once(\':\') else { return Err(...); }）',
   '对 parse::<i32>()? 使用 ? 运算符，触发 From 自动将 ParseIntError 转为 ScoreError',
   '使用 *totals.entry(...).or_insert(0) += score 累加同名用户的分数并返回 Ok(totals)'
  ],
  explain:'这道题把自定义错误枚举、From 错误自动转换、? 运算符、let-else 模式解构以及 HashMap::entry 词频累加串联成了一个完整的工程常见模式。'
 },
 {
  id:'rust-x2-41',
  type:'code',
  q:'自定义一个产生闭区间等差数列的结构体 StepRange { cur: i32, end: i32, step: i32 } 并为它实现 Iterator trait（type Item = i32；每次 next 产出当前 cur 并令 cur += step，当 cur > end 时返回 None）。然后在 main 中构造 StepRange::new(1, 20, 3)，通过迭代器适配器链筛选出偶数、将其平方、最多取前 3 个元素并收集为 Vec<i32> 打印输出。',
  reference:'struct StepRange {\n    cur: i32,\n    end: i32,\n    step: i32,\n}\n\nimpl StepRange {\n    fn new(start: i32, end: i32, step: i32) -> Self {\n        assert!(step > 0, "step must be positive");\n        Self { cur: start, end, step }\n    }\n}\n\nimpl Iterator for StepRange {\n    type Item = i32;\n\n    fn next(&mut self) -> Option<Self::Item> {\n        if self.cur > self.end {\n            None\n        } else {\n            let val = self.cur;\n            self.cur += self.step;\n            Some(val)\n        }\n    }\n}\n\nfn main() {\n    let res: Vec<i32> = StepRange::new(1, 20, 3)\n        .filter(|&x| x % 2 == 0)\n        .map(|x| x * x)\n        .take(3)\n        .collect();\n    println!("{:?}", res);\n}',
  points:[
   '定义 StepRange 结构体与关联构造函数 StepRange::new',
   '在 impl Iterator for StepRange 中声明关联类型 type Item = i32',
   '在 next(&mut self) -> Option<Self::Item> 中正确判断边界、推进状态并返回 Some(val) / None',
   '在 main 中串联 .filter()、.map()、.take(3) 与 .collect::<Vec<i32>>() 得到 [16, 100, 256]'
  ],
  explain:'只要为自定义类型实现了 Iterator 的唯一核心方法 next(&mut self) -> Option<Self::Item>，就能自动获得标准库 Iterator 上数十个带默认实现的惰性适配器与消费方法。'
 },
];
