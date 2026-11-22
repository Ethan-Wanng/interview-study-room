import type {AiQuiz} from '../journey';

// Rust 阶段考试一（入门 + 进阶，L1–L10）：25 题，覆盖所有题型，比阶段训练更综合。
export const rustStage1:AiQuiz[]=[
 {
  id:'rust-e1-1',
  q:'下面这段 Rust 代码运行后输出什么？',
  code:'fn main() {\n    let mut v = vec![10, 20, 30];\n    let first = v[0];\n    v.push(40);\n    println!("{first} {}", v.len());\n}',
  options:[
   '输出 10 4，i32 实现了 Copy',
   '编译报错：v 被不可变借用后不能 push',
   '运行时 panic：push 扩容导致 first 悬垂',
   '输出 10 3，push 的修改被忽略'
  ],
  why:[
   '',
   'v[0] 对实现了 Copy 的 i32 直接按值复制了一份，并没有保留对 v 的引用，后续 v.push(40) 完全合法。',
   'first 是独立的 i32 值副本而非引用，Vec 扩容重分配内存不会影响 first。',
   'v.push(40) 正常向 Vec 追加了第 4 个元素，v.len() 已变为 4。'
  ],
  answer:0,
  explain:'对于实现了 Copy 的元素类型（如 i32），let first = v[0] 会按位复制元素值，不会在语句结束后继续持有对 v 的借用；若是 let first = &v[0]，则会因持有共享借用而无法在打印前调用 v.push(40)。'
 },
 {
  id:'rust-e1-2',
  q:'下面代码编译或运行的结果是什么？',
  code:'fn main() {\n    let s = String::from("你好a");\n    let part = &s[0..4];\n    println!("{part}");\n}',
  options:[
   '正常输出字符“你”',
   '正常输出“你好”两个字',
   '运行时 panic：切在非字符边界上',
   '编译期直接报错：String 不支持字节切片'
  ],
  why:[
   'UTF-8 中汉字“你”占 3 个字节（0..3），0..4 把第二个汉字“好”的第 1 个字节也切进来了。',
   '“你好”两个汉字在 UTF-8 中共占 6 个字节，需要切片 &s[0..6] 才能完整取出。',
   '',
   'String 支持按 Range<usize> 做字节切片，但字符边界合法性是在运行时检查的。'
  ],
  answer:2,
  explain:'Rust 的字符串采用 UTF-8 编码，每个中文字符占 3 个字节（"你" 为 0..3，"好" 为 3..6）。&s[0..4] 的终点 4 落在 "好" 的中间字节，不是合法的 UTF-8 字符边界，运行时会触发 panic。'
 },
 {
  id:'rust-e1-3',
  q:'下面代码中，闭包捕获变量后运行输出什么？',
  code:'fn main() {\n    let mut count = 0;\n    let mut inc = || {\n        count += 1;\n        count\n    };\n    let a = inc();\n    let b = inc();\n    println!("{a} {b} {count}");\n}',
  options:[
   '输出 1 1 0，闭包修改的是内部副本',
   '输出 1 2 2，闭包可变借用了 count',
   '编译报错：inc 调用期间不能最后打印 count',
   '编译报错：闭包缺少 move 关键字'
  ],
  why:[
   '该闭包未使用 move 拷贝 i32，而是以可变引用 (&mut count) 捕获并直接修改了外层的 count。',
   '',
   '基于非词法作用域生命周期（NLL），第二次调用 inc() 后闭包不再使用，可变借用提前结束，println! 可以安全读取 count。',
   '在当前函数栈帧内同步调用闭包时，按可变借用捕获局部变量即可，无需加 move。'
  ],
  answer:1,
  explain:'闭包体对 count 执行了 += 1，编译器会自动按可变借用（FnMut）捕获 count；两次调用分别将其递增为 1 和 2。在 NLL 规则下，最后一次调用 inc() 结束后可变借用即告终止，因此后续 println! 可以共享借用 count 并输出 1 2 2。'
 },
 {
  id:'rust-e1-4',
  q:'下面这段使用 Entry API 的代码输出什么？',
  code:'use std::collections::HashMap;\n\nfn main() {\n    let mut map = HashMap::new();\n    for &w in &["a", "b", "a", "c", "a"] {\n        let c = map.entry(w).or_insert(0);\n        *c += 1;\n    }\n    println!("{} {}", map["a"], map.len());\n}',
  options:[
   '输出 1 3，or_insert 每次都会重置为 0',
   '输出 3 5，每次循环都会插入新槽位',
   '输出 3 3，按不同键累计出现次数',
   '编译报错：c 的可变借用与 map 冲突'
  ],
  why:[
   'or_insert(0) 仅在键不存在时插入初始值 0，键已存在时直接返回已有值的可变引用。',
   'HashMap 中相同的键只会保留一条记录，"a"、"b"、"c" 共 3 个不同键，map.len() 为 3。',
   '',
   '每次循环末尾局部变量 c 的生命周期结束，对 map 的可变借用随之释放，下一轮循环可正常继续。'
  ],
  answer:2,
  explain:'map.entry(w).or_insert(0) 返回值位置的可变引用 &mut i32（不存在时先插入 0），随后 *c += 1 原地递增计数。"a" 出现 3 次，共有 "a"、"b"、"c" 三个不同键，因此输出 3 3。'
 },
 {
  id:'rust-e1-5',
  q:'下面关于 ? 运算符与 From 转换的代码，调用 run() 的返回值是什么？',
  code:'fn parse_pos(s: &str) -> Result<i32, String> {\n    let n: i32 = s.parse().map_err(|_| String::from("bad int"))?;\n    if n <= 0 {\n        return Err(String::from("non-pos"));\n    }\n    Ok(n * 2)\n}\n\nfn run() -> Result<i32, String> {\n    let a = parse_pos("5")?;\n    let b = parse_pos("-2")?;\n    Ok(a + b)\n}',
  options:[
   '返回 Ok(6)',
   '返回 Err("bad int")',
   '返回 Err("non-pos")',
   '返回 Ok(10)'
  ],
  why:[
   'parse_pos("-2") 返回了 Err("non-pos")，后跟的 ? 运算符会立刻将错误提前返回，不会继续算 a + b。',
   '"-2" 是合法的十进制整数字符串，s.parse::<i32>() 会成功解析出 -2，不会触发 map_err。',
   '',
   '虽然 parse_pos("5") 得到 10，但第二步调用失败并提前返回了 Err，函数不会返回 Ok(10)。'
  ],
  answer:2,
  explain:'parse_pos("5") 成功解包出 a = 10；接着 parse_pos("-2") 解析出 n = -2，命中 n <= 0 分支返回 Err("non-pos")，run() 中的 ? 运算符立即将该 Err 作为整个函数的返回值返回。'
 },
 {
  id:'rust-e1-6',
  q:'下面关于生命周期省略规则与显式标注的说法，哪一项是正确的？',
  options:[
   'fn first(s: &str) -> &str 必须手写生命周期才能通过编译',
   '方法含 &self 参数时，返回引用默认赋给 self 的生命周期',
   '标注 <\'a> 会通知编译器在运行时延长被引用变量的销毁时间',
   'fn pick<\'a>(a: &\'a str, b: &str) -> &\'a str 要求 b 活得和 a 一样久'
  ],
  why:[
   '单引用参数的函数符合第二条生命周期省略规则，编译器会自动将输入生命周期赋给输出引用。',
   '',
   '生命周期标注属于纯编译期契约，仅用于借用检查器验证引用有效性，不会改变任何值的运行时销毁时机。',
   '该签名中只有 a 与返回值共享 \'a，b 拥有独立的匿名生命周期，调用后立刻释放 b 也不影响返回值。'
  ],
  answer:1,
  explain:'Rust 生命周期省略规则规定：一、每个引用参数获得独立的生命周期；二、若只有一个输入生命周期则赋给所有输出引用；三、若方法含 &self 或 &mut self，则将 self 的生命周期赋给所有输出引用。'
 },
 {
  id:'rust-e1-7',
  q:'下面这段迭代器链执行后，变量 res 的值是多少？',
  code:'fn main() {\n    let nums = [1, 2, 3, 4, 5];\n    let res: i32 = nums.iter()\n        .filter(|&&x| x % 2 == 1)\n        .map(|&x| x * 10)\n        .take(2)\n        .sum();\n    println!("{res}");\n}',
  options:[
   '输出 40',
   '输出 90',
   '输出 30',
   '输出 60'
  ],
  why:[
   '',
   'take(2) 限制只取前两个满足过滤条件的元素（10 和 30），第三个奇数映射出的 50 不会被消费。',
   'filter 筛出奇数 1 和 3 后，map 将它们乘以 10 变成 10 和 30，相加为 40 而不是 30。',
   '偶数 2 和 4 已被 filter(|&&x| x % 2 == 1) 过滤掉，前两个奇数元素映射后是 10 和 30。'
  ],
  answer:0,
  explain:'nums.iter() 产生 &i32，filter 保留奇数 1、3、5，map 将其映射为 10、30、50，take(2) 只取前两项 10 和 30（迭代器惰性求值，5 甚至不会被处理），最后 sum() 求和得到 40。'
 },
 {
  id:'rust-e1-8',
  q:'想要把 Trait 当作动态分发对象 Box<dyn Draw> 使用（即满足对象安全 / dyn 兼容），下面哪种方法签名可以出现在 Draw 中且不需要加 where Self: Sized？',
  options:[
   'fn clone_box(&self) -> Self;',
   'fn render<T: std::fmt::Display>(&self, item: T);',
   'fn default_size() -> (u32, u32);',
   'fn draw(&self, canvas: &mut Vec<u8>);'
  ],
  why:[
   '方法返回值中含有裸 Self 类型会导致编译器在擦除具体类型后无法确定返回值栈空间大小，违反 dyn 兼容性。',
   '带有泛型类型参数的方法在编译期需要按每个 T 单态化，无法放进固定布局的虚函数表（vtable）。',
   '不接收 self 指针的关联函数无法从胖指针的 vtable 中查找并派发，需加 where Self: Sized 排除。',
   ''
  ],
  answer:3,
  explain:'dyn Trait 通过胖指针（数据指针 + vtable 指针）实现动态分发，要求通过 vtable 调用的方法必须接收含 self 的接收者（如 &self、&mut self、Box<Self>），且签名中不在参数或返回值里直接暴露未知大小的 Self，也不能含泛型类型参数。'
 },
 {
  id:'rust-e1-9',
  type:'multi',
  q:'关于 Rust 中的 String、&str 与切片操作，下面哪些说法是正确的？（多选）',
  options:[
   'String 在堆上分配可增长的 UTF-8 字节缓冲区，拥有数据所有权',
   '函数参数优先写成 &str 而非 &String，因为 &String 可通过 Deref 自动转为 &str',
   '可以使用 s[0] 按下标 O(1) 直接取出 String 的第一个 char 字符',
   's.chars().count() 返回的是 Unicode 标量值个数，而 s.len() 返回字节数'
  ],
  why:[
   '',
   '',
   '由于 UTF-8 是变长编码（1~4 字节），Rust 禁止对 String 直接用整数下标 s[0] 取字符，避免误以为是按字符索引。',
   ''
  ],
  answers:[0,1,3],
  explain:'String 是拥有所有权的堆分配 UTF-8 缓冲，&str 是胖指针切片视图；String 实现了 Deref<Target = str>，因此参数写 &str 可同时接收 &str 和 &String；Rust 不允许 s[0] 索引，统计字符数用 s.chars().count()，字节长度用 s.len()。'
 },
 {
  id:'rust-e1-10',
  type:'multi',
  q:'关于 Rust 的所有权、Copy 与 Clone，下面哪些说法是正确的？（多选）',
  options:[
   '结构体只有在其所有字段都实现了 Copy 时，才能派生 #[derive(Copy, Clone)]',
   '包含 String 或 Vec<T> 字段的结构体可以直接实现 Copy trait',
   '实现了 Drop trait 的类型，编译器不允许它同时实现 Copy trait',
   '赋值语句 let b = a; 对所有实现了 Copy 的类型都会使原变量 a 失效'
  ],
  why:[
   '',
   'String 和 Vec<T> 管理着堆内存并实现了 Drop，自身不是 Copy 类型，因此包含它们的结构体也不能实现 Copy。',
   '',
   '实现了 Copy 的类型在赋值时执行按位浅拷贝，原变量 a 依然有效且可继续使用；只有未实现 Copy 的类型才会发生所有权转移。'
  ],
  answers:[0,2],
  explain:'Copy 代表可以通过简单的按位浅拷贝完成复制，不能与需要自定义资源释放逻辑的 Drop 共存；只有所有成员都是 Copy 时结构体才能实现 Copy；实现了 Copy 的类型在赋值后原变量仍然有效。'
 },
 {
  id:'rust-e1-11',
  type:'multi',
  q:'在 Rust 的模块系统与可见性规则中，下面哪些说法是正确的？（多选）',
  options:[
   '子模块可以直接访问父模块中的私有项，父模块访问子模块的项则需要子模块将其标为 pub',
   'pub(crate) 表示该项在当前 crate 内部各处可见，但不对外部依赖该 crate 的项目公开',
   '在 src/lib.rs 中写了 mod network; 后，编译器会去寻找 src/network.rs 或 src/network/mod.rs',
   '结构体被标为 pub struct User 后，它内部的所有字段也会自动对外变成 pub'
  ],
  why:[
   '',
   '',
   '',
   'pub struct 只公开结构体类型本身，其内部字段默认仍然是私有的，需要逐个显式标注 pub 才能在模块外直接访问。'
  ],
  answers:[0,1,2],
  explain:'Rust 默认私有，子模块对父模块拥有内部可见性；pub(crate) 将可见性限制在当前 crate；mod foo; 对应 foo.rs 或 foo/mod.rs；与 pub enum 变体默认公开不同，pub struct 的字段默认私有。'
 },
 {
  id:'rust-e1-12',
  type:'multi',
  q:'关于闭包实现的 Fn、FnMut、FnOnce 三个 Trait，下面哪些说法是正确的？（多选）',
  options:[
   '所有闭包都实现了 FnOnce，因为任何闭包至少都可以被调用一次',
   '实现了 Fn 的闭包同时也满足 FnMut 和 FnOnce 的约束，可传给要求 FnMut 的参数',
   '如果闭包体把捕获的 String 移交给了另一个函数消费，该闭包仍然可以实现 FnMut',
   'move 关键字强制闭包按所有权捕获环境变量，但它实现哪个 Fn* trait 取决于闭包体如何使用变量'
  ],
  why:[
   '',
   '',
   '将捕获的 String 移走（消耗所有权）意味着第二次调用时该变量已不复存在，因此该闭包仅实现 FnOnce，无法实现 FnMut。',
   ''
  ],
  answers:[0,1,3],
  explain:'三个闭包 Trait 的继承关系为 Fn: FnMut: FnOnce，所以实现 Fn 的闭包可传给 FnMut 或 FnOnce；move 决定“怎么捕获”（按值移入），而闭包体“怎么使用捕获的值”（只读、修改、移出消耗）决定实现到哪一层 Trait。'
 },
 {
  id:'rust-e1-13',
  type:'multi',
  q:'关于 Option<T> 和 Result<T, E> 的常用组合子方法，下面哪些行为描述是正确的？（多选）',
  options:[
   'opt.unwrap_or_else(|| expensive()) 是惰性的，仅在 opt 为 None 时才执行闭包',
   'opt.unwrap_or(expensive()) 在进入方法前就会先求值 expensive() 参数',
   'res.map(|v| v + 1) 在 res 为 Ok 时转换内部值，为 Err 时原样保留 Err',
   'Option<Result<T, E>> 可以调用 .transpose() 转换为 Result<Option<T>, E>'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'unwrap_or 的参数在调用前立即求值，若默认值构造成本高应使用接收闭包的 unwrap_or_else；map 仅转换 Some/Ok 分支；transpose() 用于在 Option<Result<T, E>> 与 Result<Option<T>, E> 之间互转，搭配 ? 非常顺手。'
 },
 {
  id:'rust-e1-14',
  type:'judge',
  q:'在 Rust 的孤儿规则（Orphan Rule）下，我们可以在自己的业务 crate 里直接为标准库的 Vec<T> 实现标准库的 std::fmt::Display trait。',
  answer:false,
  explain:'孤儿规则规定：要为类型 T 实现 Trait，Trait 或 T 至少有一个必须是在当前 crate 中定义的。Vec<T> 和 Display 都定义在标准库中，直接实现会违反孤儿规则；常用的解决办法是使用 Newtype 模式（如 struct MyVec<T>(Vec<T>);）。'
 },
 {
  id:'rust-e1-15',
  type:'judge',
  q:'枚举 enum Message { Quit, Move { x: i32, y: i32 }, Write(String) } 在内存中的大小取决于最大变体所需的空间加上判别式（tag）及对齐填充。',
  answer:true,
  explain:'Rust 枚举采用标签联合（Tagged Union）布局，实例大小等于最大变体（加上判别式 tag 与对齐填充）的大小；对于像 Option<&T> 或 Option<Box<T>> 这样含非空指针的类型，编译器还会利用空指针优化（Niche Optimization）省去额外 tag 空间。'
 },
 {
  id:'rust-e1-16',
  type:'judge',
  q:'使用 for x in vec 遍历 Vec<String> 时，如果不写 &vec 或 vec.iter()，for 循环会隐式调用 vec.into_iter() 并拿走 vec 的所有权。',
  answer:true,
  explain:'for 循环底层通过 IntoIterator trait 工作：直接传 vec 会调用 Vec::into_iter(self) 消费整个集合；传入 &vec 等价于 vec.iter()（产出 &T），传入 &mut vec 等价于 vec.iter_mut()（产出 &mut T）。'
 },
 {
  id:'rust-e1-17',
  type:'judge',
  q:'在 match 表达式中，如果已经覆盖了枚举现有的几个常见变体，可以省略其余变体和通配分支 _，编译器默认会在未匹配时返回 ()。',
  answer:false,
  explain:'Rust 的 match 匹配具有穷尽性（Exhaustiveness）检查，必须覆盖目标类型的所有可能取值；若有未列出的情况，必须使用通配模式 _ 或变量绑定兜底，否则无法通过编译。'
 },
 {
  id:'rust-e1-18',
  type:'fill',
  q:'在 Rust 2021/2024 中，若要在解构 Option 或模式匹配失败时直接执行 return / break / continue 提前退出当前块，可以使用 let Some(x) = opt ＿ { return; }; 语法。',
  accepted:['else'],
  explain:'let-else 语句（let PATTERN = EXPR else { DIVERGING_CODE };）用于把“匹配成功绑定到外层作用域，失败则立刻发散退出”的守卫逻辑写在一行里，避免层层缩进。'
 },
 {
  id:'rust-e1-19',
  type:'fill',
  q:'想要让自定义结构体 Point 支持使用 + 运算符进行相加，需要为它实现标准库 std::ops 模块下的 ＿ trait。',
  accepted:['Add','std::ops::Add'],
  explain:'Rust 通过 std::ops 下的 Trait 实现运算符重载，其中 + 对应 std::ops::Add（需定义关联类型 Output 和 add 方法）。'
 },
 {
  id:'rust-e1-20',
  type:'fill',
  q:'在调用迭代器的 .collect() 方法把元素收集成目标容器时，目标容器类型必须实现标准库的 ＿ trait。',
  accepted:['FromIterator','std::iter::FromIterator'],
  explain:'Iterator::collect() 是泛型方法，只要目标类型 B 实现了 FromIterator<Self::Item>（如 Vec<T>、HashMap<K, V>、String、Result<Vec<T>, E>），就可以把迭代器收集为该类型。'
 },
 {
  id:'rust-e1-21',
  type:'short',
  q:'请简述 Rust 的借用规则（读写锁式别名规则），并说明为什么在同一个作用域内“持有 Vec<i32> 元素引用 &v[0] 的同时调用 v.push(1)”会被编译器拒绝。',
  reference:'Rust 的借用规则核心是“共享不可变，可变不共享”：同一时刻，对同一份数据要么可以存在任意多个不可变引用（&T），要么只能存在唯一一个可变引用（&mut T），且引用的生命周期不得超过被引用数据的生命周期（不能产生悬垂引用）。当持有 let r = &v[0] 时，v 处于被不可变借用的状态；而 v.push(1) 需要获取 &mut v（可变借用）。从底层内存看，Vec 扩容时可能在堆上重新分配一块更大的缓冲区并将旧数据搬移过去、释放旧内存，若允许此时 push，原先指向旧内存的 r 就会变成悬垂指针。借用检查器在编译期阻止了这种读写冲突，从而在零运行时开销下消除了迭代器失效和悬垂指针问题。',
  points:[
   '借用规则：多个不可变引用 &T 与唯一可变引用 &mut T 互斥（共享不可变，可变不共享）',
   '引用必须始终有效，生命周期不能超过被借用值本身',
   '&v[0] 借用了 v（不可变），而 v.push(1) 需要可变借用 &mut v，两者在同一活跃期内冲突',
   '底层原因：Vec push 触发扩容重分配时会释放旧堆内存，使已有的元素引用悬垂'
  ],
  explain:'把借用检查器的语法规则和 Vec 扩容重分配导致悬垂指针的底层内存原因结合起来回答最为清晰。'
 },
 {
  id:'rust-e1-22',
  type:'short',
  q:'在泛型与 Trait 编程中，关联类型（Associated Types）和泛型类型参数（如 trait Iterator<Item> vs trait Iterator { type Item; }）有什么区别？什么场景下应该优先用关联类型？',
  reference:'如果把 Trait 定义为带泛型参数（如 trait Container<T>），那么同一个具体类型可以针对不同的 T 多次实现该 Trait（例如 From<u8>、From<u16>），调用方在使用时也往往需要显式指明类型参数。而使用关联类型（如 trait Iterator { type Item; }）时，一个具体类型只能实现该 Trait 一次，输出类型 Item 由实现者唯一确定。因此：当“一个类型对该抽象概念可以有多种参数化实现”（如 From<T>、Add<Rhs>）时用泛型 Trait；当“一个类型实现该抽象时，其配套类型是唯一确定的”（如迭代器的产出元素 Item、Future 的产出 Output、Add 的结果 Output）时，应优先使用关联类型，避免调用方处处书写冗余的泛型约束。',
  points:[
   '泛型 Trait 允许同一类型针对不同类型参数多次实现（如 From<u8> 与 From<u16>）',
   '关联类型限制同一类型只能实现该 Trait 一次，关联类型由实现方唯一决定',
   '关联类型能让函数签名和约束更简洁，无需调用方额外声明多余的泛型参数',
   '典型场景对比：输入多态（From<T>）用泛型参数，唯一输出（Iterator::Item）用关联类型'
  ],
  explain:'核心区分标准就是“对于同一个 Self 类型，这个关联的类型是否唯一”。'
 },
 {
  id:'rust-e1-23',
  type:'short',
  q:'在 Rust 项目工程实践中，编写一个“供他人调用的底层库（Library Crate）”与编写一个“顶层业务应用（Application Crate）”在错误处理策略上有什么不同？通常会怎样配合使用 thiserror 和 anyhow？',
  reference:'编写底层库（Library）时，调用方往往需要根据不同的错误原因采取差异化的恢复策略（例如区分网络超时重试与参数格式错误），因此库应当定义结构化、可枚举的强类型错误（enum MyError），实现 std::error::Error、Display 以及底层错误的 From 转换；工程上常使用 thiserror 派生宏通过 #[error("...")] 和 #[from] 零样板代码地生成这些实现。而在顶层应用（Application）或 CLI/服务端入口中，大多数错误只需要附加清晰的上下文信息（如 .context("读取配置文件失败")）向上汇报、打印日志或统一转成 HTTP 错误响应，调用方很少再去精确保留每种底层错误分支，因此常使用 anyhow::Result<T>（基于动态错误容器 anyhow::Error）来统一接收和串联各种不同来源的错误。',
  points:[
   '库（Library）面向调用方编程，需暴露可匹配的具体错误枚举类型并实现 std::error::Error',
   'thiserror 用于为自定义错误枚举自动派生 Display、Error 和 #[from] 转换',
   '应用（Application）侧重统一收集、附加上下文（context）并展示或记录日志',
   'anyhow 提供类型擦除的 anyhow::Error 和 Context 扩展，简化顶层应用中的错误传播'
  ],
  explain:'简记口诀：“库用 thiserror 定类型，应用用 anyhow 串上下文”。'
 },
 {
  id:'rust-e1-24',
  type:'code',
  q:'实现一个函数 top_k_words(text: &str, k: usize) -> Vec<(String, usize)>：按空白字符（split_whitespace）切分 text，将每个单词转为小写（to_lowercase）后统计出现频次；最后按“频次从高到低、频次相同时按字典序从小到大”排序，返回前 k 个结果。',
  reference:'use std::collections::HashMap;\n\npub fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)> {\n    let mut counts: HashMap<String, usize> = HashMap::new();\n    for word in text.split_whitespace() {\n        *counts.entry(word.to_lowercase()).or_insert(0) += 1;\n    }\n    let mut items: Vec<(String, usize)> = counts.into_iter().collect();\n    items.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));\n    items.truncate(k);\n    items\n}',
  points:[
   '使用 split_whitespace() 切分并调用 to_lowercase() 统一大小写',
   '使用 HashMap::entry(...).or_insert(0) 统计单词频次',
   '将 HashMap 转为 Vec 后用 sort_by 配合 cmp / then_with 按频次降序、字典序升序排列',
   '使用 truncate(k) 或 into_iter().take(k).collect() 截取前 k 项返回'
  ],
  explain:'考察字符串切片处理、HashMap Entry API、闭包自定义多级排序（Ordering::then_with）以及迭代器与集合转换。'
 },
 {
  id:'rust-e1-25',
  type:'code',
  q:'定义一个持有切片引用的分词迭代器结构体 struct SplitNonEmpty<\'a> { rest: &\'a str, sep: char }，提供构造函数 new(s: &\'a str, sep: char) -> Self，并为它实现 Iterator<Item = &\'a str>：每次 next() 返回下一个按 sep 切分出的非空子串（连续的分隔符自动跳过），全部读完后返回 None。',
  reference:'pub struct SplitNonEmpty<\'a> {\n    rest: &\'a str,\n    sep: char,\n}\n\nimpl<\'a> SplitNonEmpty<\'a> {\n    pub fn new(s: &\'a str, sep: char) -> Self {\n        Self { rest: s, sep }\n    }\n}\n\nimpl<\'a> Iterator for SplitNonEmpty<\'a> {\n    type Item = &\'a str;\n\n    fn next(&mut self) -> Option<Self::Item> {\n        loop {\n            if self.rest.is_empty() {\n                return None;\n            }\n            match self.rest.find(self.sep) {\n                Some(idx) => {\n                    let head = &self.rest[..idx];\n                    self.rest = &self.rest[idx + self.sep.len_utf8()..];\n                    if !head.is_empty() {\n                        return Some(head);\n                    }\n                }\n                None => {\n                    let tail = self.rest;\n                    self.rest = "";\n                    return Some(tail);\n                }\n            }\n        }\n    }\n}',
  points:[
   '正确在 struct 和 impl<\'a> Iterator for SplitNonEmpty<\'a> 上声明生命周期 \'a',
   '关联类型定义为 type Item = &\'a str（绑定到原字符串切片 \'a 而非 &mut self）',
   '切分时推进 self.rest 时注意跳过 sep.len_utf8() 字节以保证 UTF-8 安全',
   '跳过空串并在 self.rest 为空时返回 None'
  ],
  explain:'这道题综合考察了结构体生命周期标注、Iterator trait 实现以及返回的切片生命周期与输入源 \'a 绑定（而不是与 next(&mut self) 的临时可变借用绑定）。'
 }
];

// Rust 阶段考试二（高级 + 大神，L11–L15）：25 题，覆盖所有题型。
export const rustStage2:AiQuiz[]=[
 {
  id:'rust-e2-1',
  q:'下面这段使用 Rc 和 RefCell 的代码在运行时会发生什么？',
  code:'use std::cell::RefCell;\nuse std::rc::Rc;\n\nfn main() {\n    let data = Rc::new(RefCell::new(vec![1, 2]));\n    let r1 = data.borrow();\n    data.borrow_mut().push(3);\n    println!("{}", r1.len());\n}',
  options:[
   '正常输出 3，动态追加了新元素',
   '正常输出 2，r1 保留旧的长度',
   '编译期直接报借用冲突错误',
   '运行时 panic：already borrowed'
  ],
  why:[
   'r1 持有的不可变借用 Ref 尚未释放，此时调用 borrow_mut() 违反了运行时借用规则，不会成功 push。',
   '代码在 data.borrow_mut() 处就会因借用冲突而 panic，走不到最后的 println!。',
   'RefCell 将借用检查从编译期推迟到了运行时，编译期看到的是合法的不可变方法调用。',
   ''
  ],
  answer:3,
  explain:'RefCell 通过内部借用计数器在运行时强制执行“共享不可变、可变不共享”规则。r1 = data.borrow() 创建的 Ref 守卫一直存活到 println!，在此期间调用 data.borrow_mut() 会检测到已有活跃的不可变借用，从而在运行时触发 panic（already borrowed: BorrowMutError）。'
 },
 {
  id:'rust-e2-2',
  q:'关于 Send 和 Sync 两个并发标记 Trait，下面哪项推导是正确的？',
  options:[
   'Rc<i32> 实现了 Send，但没有实现 Sync',
   'RefCell<i32> 实现了 Send，但没有实现 Sync',
   'MutexGuard<\'a, i32> 实现了 Send，可以在跨线程后解锁',
   '裸指针 *const u8 默认实现了 Send 和 Sync'
  ],
  why:[
   'Rc 的引用计数采用非原子的普通整数递增递减，跨线程转移或共享都会造成计数数据竞争，因此既不是 Send 也不是 Sync。',
   '',
   '操作系统互斥锁通常要求在加锁的同一线程上解锁，因此 MutexGuard 故意不实现 Send（但实现了 Sync）。',
   '裸指针没有任何安全保障，标准库故意不为 *const T 和 *mut T 实现 Send 或 Sync，以提醒开发者手动审计。'
  ],
  answer:1,
  explain:'类型 T 实现 Sync 当且仅当 &T 是 Send。RefCell<i32> 可以安全地把整个所有权转移到另一个线程独占使用（因此是 Send），但若在多线程间共享 &RefCell<i32>，其非原子的运行时借用计数器会产生数据竞争（因此不是 Sync）。'
 },
 {
  id:'rust-e2-3',
  q:'在一个线程持有 std::sync::Mutex 锁期间发生了 panic，此后另一个线程对该 Mutex 调用 lock() 会得到什么结果？',
  options:[
   '调用线程一直阻塞死锁，等待崩溃线程解锁',
   '返回 Err(PoisonError)，可通过 into_inner() 取出内部数据',
   '自动将锁内的数据重置为 Default::default() 并返回 Ok',
   '直接导致当前调用 lock() 的线程也立刻触发不可恢复的 abort'
  ],
  why:[
   'MutexGuard 在栈展开析构时已经释放了底层操作系统锁，并把锁标记为中毒（poisoned），不会死锁。',
   '',
   'Mutex 不会也不要求内部类型实现 Default，它只通过中毒状态提醒后续线程数据不变量可能受损。',
   'lock() 返回的是 Result<MutexGuard<T>, PoisonError<...>>，如果不调用 unwrap()，当前线程完全可以自行处理该 Err。'
  ],
  answer:1,
  explain:'当持锁线程 panic 展开栈时，MutexGuard 的 Drop 实现会释放锁并将 Mutex 标记为“中毒（Poisoned）”。后续线程调用 lock() 会立即收到 Err(PoisonError)，提醒开发者受保护的数据可能处于修改到一半的不一致状态；若确认可恢复，可调用 err.into_inner() 继续获取守卫。'
 },
 {
  id:'rust-e2-4',
  q:'在 Tokio 多线程运行时中，为什么绝对不应该在 async 函数里直接写持有 std::sync::MutexGuard 跨越 .await 点？',
  code:'async fn bad(mu: &std::sync::Mutex<i32>) {\n    let mut guard = mu.lock().unwrap();\n    *guard += 1;\n    do_io().await; // 跨越 .await\n}',
  options:[
   '因为 std::sync::MutexGuard 不是 Send，且挂起占住锁易导致工作线程死锁',
   '因为 .await 会自动调用 std::mem::forget 把 MutexGuard 提前丢弃',
   '因为标准库 Mutex 在 async 函数里调用 lock() 会直接返回 PoisonError',
   '因为 Tokio 运行时检测到标准库锁后会直接取消当前正在执行的任务'
  ],
  why:[
   '',
   '.await 只是将跨点存活的局部变量保存在生成的匿名 Future 状态机里，不会自动丢弃或遗忘守卫。',
   '只要没有线程在持锁时 panic，调用 lock() 就会正常返回 Ok(MutexGuard)。',
   'Tokio 运行时不会自动检查或取消使用标准库锁的任务，问题会体现在编译报错（!Send）或运行时线程互等死锁。'
  ],
  answer:0,
  explain:'一方面，std::sync::MutexGuard 没有实现 Send，若跨 .await 存活，生成的 Future 状态机也会变成 !Send，无法传给 tokio::spawn；另一方面，即使在单线程运行时中，任务在持锁状态下于 .await 挂起让出线程，同一工作线程上被调度的其他任务若再去 lock() 同一把锁，就会直接把整个工作线程卡死。若锁操作纯属内存快速读写，应在 .await 前用花括号释放守卫；若确实需跨 .await 持锁，应改用 tokio::sync::Mutex。'
 },
 {
  id:'rust-e2-5',
  q:'为什么自引用结构体（包括编译器生成的跨 .await 借用局部变量的 async 状态机）在首次轮询前必须通过 Pin<P> 固定住内存位置？',
  options:[
   'Pin 会在运行时调用操作系统 mlock 将该页物理内存锁定防止换出',
   '防止对象在内存中被 move 搬移后，内部自引用指针仍指向旧地址而悬垂',
   'Pin 会把结构体所有字段都自动包装进 Arc<Mutex<T>> 以保证并发安全',
   '只有被 Pin 包裹的类型才允许在 Drop 析构函数里释放堆上分配的内存'
  ],
  why:[
   'Pin 是纯粹的 Rust 类型系统封装，不涉及任何操作系统虚拟内存或物理页锁定系统调用。',
   '',
   'Pin 与线程同步或引用计数无关，它只限制调用方获取被包裹对象的 &mut T。',
   '任何普通类型都可以实现 Drop 并释放堆内存，Pin 对 Drop 的要求是析构前不可将值移出该内存位置。'
  ],
  answer:1,
  explain:'在 Rust 中移动（move）一个值是按字节浅拷贝到新地址。如果结构体内部含有一个指向自身另一个字段的指针（如 async 状态机跨 .await 借用局部变量），一旦整个结构体被移动到新内存地址，内部指针仍然指向旧地址，解引用就会造成未定义行为。Pin 通过限制对 !Unpin 类型获取 &mut T（从而阻止 mem::swap / mem::replace），在类型系统层面保证对象一旦被固定就不再搬家。'
 },
 {
  id:'rust-e2-6',
  q:'在编写 unsafe 代码时，下面哪一种做法违反了 Rust 的内存与别名规则并会直接导致未定义行为（Undefined Behavior, UB）？',
  options:[
   '把引用转为裸指针后，在同一地址同时创建 *const i32 和 *mut i32 但不解引用',
   '在 unsafe 块外定义一个普通函数，并在其内部使用 unsafe 块调用裸指针解引用',
   '通过裸指针把同一个内存地址同时转换为活跃的 &i32 和 &mut i32 引用',
   '使用 std::ptr::NonNull<T> 保存非空可变裸指针并在结构体字段中具备协变性'
  ],
  why:[
   '仅仅创建并持有多个裸指针（*const T 和 *mut T）指向同一地址在 Rust 中是合法的，风险在于解引用和构造引用时。',
   '这是封装安全抽象的标准做法：对外暴露安全函数签名，内部在核实前置不变量后用最小范围的 unsafe 块执行底层操作。',
   '',
   'NonNull<T> 是标准库专门提供的非空、协变裸指针封装，广泛用于实现链表与自定义集合。'
  ],
  answer:2,
  explain:'unsafe 块只是允许执行五种底层超能力，绝不会关闭借用检查器的别名规则假设。LLVM 依赖 Rust 的 noalias 属性进行激进优化：一旦在任何时刻针对同一块内存同时构造出活跃的 &mut T 和 &T（或两个 &mut T），无论是否写在 unsafe 块里，都立即构成未定义行为（UB）。'
 },
 {
  id:'rust-e2-7',
  q:'在声明宏 macro_rules! 中，片段分类符（fragment specifier）$e:expr 与 $t:tt、以及宏卫生性（hygiene）的正确描述是？',
  options:[
   'macro_rules! 完全没有卫生性，宏内定义的局部变量名会直接污染调用方作用域',
   '$e:expr 匹配一个完整的 Rust 表达式，而 $t:tt 匹配单个标记树（Token Tree）',
   '声明宏在完成类型检查和借用检查之后才会展开为最终的机器指令',
   '在同一个库里定义的函数式过程宏 #[proc_macro] 可以直接被该库自身模块调用'
  ],
  why:[
   'Rust 的 macro_rules! 具备标识符卫生性（hygienic macros），宏内部新建的局部变量标识符拥有独立的语法上下文，不会意外覆盖调用方同名变量。',
   '',
   '所有宏（包括声明宏与过程宏）都在编译早期的 AST/HIR 构建阶段展开，展开后的代码才进入类型检查与借用检查。',
   '过程宏必须定义在独立的、Cargo.toml 中标注了 proc-macro = true 的专用 crate 中，编译成宿主插件后供其他 crate 使用。'
  ],
  answer:1,
  explain:'macro_rules! 中 $e:expr 用于匹配合法的 Rust 表达式，$t:tt 匹配单个 Token Tree（一个独立 token 或一对括号 ()/[]/{} 括起的整组内容）；且 macro_rules! 具有卫生性，在编译早期（类型与借用检查之前）展开。'
 },
 {
  id:'rust-e2-8',
  q:'使用 Criterion 或原生基准测试做性能度量时，std::hint::black_box(x) 的核心作用是什么？',
  options:[
   '把变量 x 加密隐藏，防止基准测试日志泄露敏感测试输入数据',
   '把变量 x 强制拷贝到操作系统内核态缓冲区以测量系统调用开销',
   '阻止编译器将未使用的计算结果或常量在编译期当作死代码优化掉',
   '在运行时为变量 x 自动分配独立的 CPU 缓存行以避免伪共享问题'
  ],
  why:[
   'black_box 是编译器优化屏障提示，与数据加密或日志脱敏无关。',
   'black_box 完全在用户态通过内联汇编或 volatile 语义实现，不会触发内核态切换。',
   '',
   '防止缓存行伪共享需要在结构体上使用 #[repr(align(64))] 等内存对齐手段，而不是调用 black_box。'
  ],
  answer:2,
  explain:'在 --release 模式下，LLVM 编译器一旦发现基准测试循环里的计算结果没有被外部使用，或者输入是编译期已知常量，往往会通过常量折叠（Constant Folding）或死代码消除（Dead Code Elimination）把整个待测循环优化为空操作。std::hint::black_box 对编译器扮演一个不透明的“黑盒”，强制编译器真实保留输入读取和结果计算。'
 },
 {
  id:'rust-e2-9',
  type:'multi',
  q:'关于智能指针 Rc<T>、Arc<T>、Weak<T> 和写时克隆 Cow<\'a, B>，下面哪些说法是正确的？（多选）',
  options:[
   '两个 Rc<RefCell<Node>> 互相持有对方的强引用会造成引用循环，导致内存泄漏',
   'Weak<T> 不增加强引用计数，访问前需调用 .upgrade() 检查并转为 Option<Rc<T>>',
   'Cow<\'a, str> 在构造时就会立即在堆上深拷贝一份新的 String 缓冲区',
   'Arc<T> 比 Rc<T> 更快，因为原子指令在多核 CPU 上比普通整数加减开销更低'
  ],
  why:[
   '',
   '',
   'Cow::Borrowed 在只读场景下零分配直接持有借用 &\'a str，只有在调用 to_mut() 需要修改时才会克隆到堆上。',
   '原子指令（AtomicUsize）需要保证跨核缓存一致性，开销明显高于 Rc 使用的普通非原子整数加减，单线程场景应优先用 Rc。'
  ],
  answers:[0,1],
  explain:'强引用循环会使 strong_count 无法归零从而泄漏堆内存，应将父指针或回指边改为 Weak<T> 并通过 upgrade() 安全提升；Cow（Clone-on-Write）延迟分配，只读零拷贝、写时才克隆；Arc 因使用原子操作同步计数，开销高于单线程的 Rc。'
 },
 {
  id:'rust-e2-10',
  type:'multi',
  q:'在 Rust 与 C 语言进行 FFI（外部函数接口）互操作时，下面哪些做法是正确且必要的？（多选）',
  options:[
   '跨 FFI 边界传递的结构体需加上 #[repr(C)]，以禁止 Rust 编译器重排字段顺序',
   '导出的 Rust 函数需使用 #[unsafe(no_mangle)]（或 #[no_mangle]）配合 pub extern "C" fn',
   '不允许让 Rust 的 panic 跨越 extern "C" 边界展开到 C 调用栈中，否则属于未定义行为',
   '可以直接把 Rust 的 &str 切片当作 C 的 const char* 传给期望以 \\0 结尾的 C 函数'
  ],
  why:[
   '',
   '',
   '',
   'Rust 的 &str 是由指针和长度组成的胖指针，且末尾不保证有 \\0 字节；传给 C 字符串接口应使用 std::ffi::CString / CStr。'
  ],
  answers:[0,1,2],
  explain:'Rust 默认的 repr(Rust) 允许编译器任意重排字段且不固定 ABI，跨 FFI 必须用 #[repr(C)]；导出函数需关闭符号名修饰（no_mangle）并指定 extern "C" 调用约定；Rust panic 跨越 C ABI 边界会触发 UB，应在边界处用 std::panic::catch_unwind 拦截；C 字符串需用 CString/CStr 处理末尾空字节。'
 },
 {
  id:'rust-e2-11',
  type:'multi',
  q:'在 Tokio 异步编程中，关于 tokio::select!、取消安全性（Cancellation Safety）与阻塞操作，下面哪些说法是正确的？（多选）',
  options:[
   'tokio::select! 在某一分支率先完成时，会直接丢弃（drop）其余尚未完成的分支 Future',
   '在 loop + select! 中若某分支不是取消安全的，可在循环外创建该 Future 并用 tokio::pin! 固定后在分支里传 &mut fut',
   '执行耗时的同步文件压缩或密码哈希计算时，应放入 tokio::task::spawn_blocking 专用线程池中',
   'tokio::join!(f1, f2) 会在 f1 刚完成的瞬间立即取消并丢弃还在运行中的 f2'
  ],
  why:[
   '',
   '',
   '',
   'tokio::join! 会并发轮询并等待所有分支全部执行完毕后才返回元组结果；只有 tokio::try_join! 在遇到首个 Err 时才会提前取消其余分支。'
  ],
  answers:[0,1,2],
  explain:'select! 通过直接 drop 未选中分支的 Future 实现取消，因此若分支内部已读出一半数据保存在局部变量里就会丢失；用 tokio::pin! 在循环外固定 Future 并传 &mut fut 可以跨轮次继续轮询同一个状态机；CPU 密集或同步阻塞任务必须用 spawn_blocking 隔离，避免饿死异步工作线程。'
 },
 {
  id:'rust-e2-12',
  type:'multi',
  q:'关于原子类型（std::sync::atomic）与内存序（Ordering），下面哪些说法是正确的？（多选）',
  options:[
   'Ordering::Relaxed 只保证当前单个原子变量自身读改写的原子性，不提供跨变量的同步顺序保证',
   '写端使用 Ordering::Release 与读端对同一原子变量使用 Ordering::Acquire 配对，可建立 happens-before 关系',
   'Release 写操作之前的普通内存写入，在另一线程通过 Acquire 读到该新值后均对其可见',
   '只要把结构体里的所有字段都换成 AtomicUsize，多个字段之间的复合业务不变量（如 a + b == 100）就能自动保持一致'
  ],
  why:[
   '',
   '',
   '',
   '单个原子操作无法把“修改 a”和“修改 b”两次独立指令合并为一个原子事务，其它线程仍可能观察到 a 已改而 b 未改的中间态。'
  ],
  answers:[0,1,2],
  explain:'Relaxed 仅保证单变量原子性，常用于单纯计数器；Release-Acquire 配对构成同步边，保证 Release 之前的所有内存写入对 Acquire 之后的代码可见；跨多变量的复合不变量无法靠各自独立的原子字段维护，需打包进同一个原子位域或使用互斥锁。'
 },
 {
  id:'rust-e2-13',
  type:'multi',
  q:'关于 Cargo 工作空间（Workspace）、条件编译（Features）与生产构建调优，下面哪些说法是正确的？（多选）',
  options:[
   '同一 Cargo Workspace 下的所有成员子包共享根目录下的同一个 Cargo.lock 和 target 构建缓存目录',
   'Cargo 的 feature 应当设计为“可叠加的（additive）”，开启某个 feature 不应破坏或删减已有公开 API',
   '在 Cargo.toml 的 [profile.release] 中开启 lto = true 和 codegen-units = 1 有助于提升运行时性能，但会增加编译耗时',
   'cargo test 会自动提取 lib crate 中 /// 文档注释里的代码块作为文档测试（Doc-tests）编译并执行'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'Workspace 统一管理 Cargo.lock 与 target 目录；由于 Cargo 会对依赖树中同一库的 features 取并集（feature unification），因此 feature 必须具有可加性；release 配置中开启 LTO 和单 codegen-unit 能让 LLVM 做跨 crate 全局内联与优化；文档注释中的代码会在 cargo test 时作为 Doc-test 实际编译执行。'
 },
 {
  id:'rust-e2-14',
  type:'judge',
  q:'在 Rust 中，调用 std::mem::forget(value) 或 Box::leak(boxed) 造成内存泄漏属于安全代码（Safe Rust）允许的行为，不属于未定义行为（UB）。',
  answer:true,
  explain:'Rust 的安全保证不包含“析构函数 Drop 一定会被调用”（史称 Leakpocalypse 决议，也是为了支持 Rc/Arc 循环引用无需 unsafe）。因此 mem::forget 和 Box::leak 都是完全安全的函数；这也意味着编写 unsafe 代码时绝不能把内存安全建立在“某个 Guard 的 Drop 必定会执行”这一假设之上。'
 },
 {
  id:'rust-e2-15',
  type:'judge',
  q:'std::thread::scope 可以直接借用父线程栈上的局部变量而无需 move 或 Arc，因为 scope 会在返回前阻塞等待其内部启动的所有作用域线程全部结束。',
  answer:true,
  explain:'std::thread::scope 通过在 scope 闭包的生命周期内强制 join 所有派生出的 ScopedJoinHandle，在编译期证明了子线程绝不会活过父线程栈帧，因此子线程可以直接安全地借用父线程栈上的非 \'static 变量。'
 },
 {
  id:'rust-e2-16',
  type:'judge',
  q:'在 Future::poll(self: Pin<&mut Self>, cx: &mut Context<\'_>) 的实现中，如果返回了 Poll::Pending，可以不必保存或注册 cx.waker()，因为异步运行时会以固定每毫秒一次的频率自动轮询所有挂起的任务。',
  answer:false,
  explain:'Rust 的 Future 采用基于事件唤醒（Waker-driven）的推进模型，运行时不会盲目轮询已返回 Pending 的任务。一旦 poll 返回 Poll::Pending，Future 必须确保已将 cx.waker().clone() 注册到底层事件源（如反应器 epoll/kqueue 或定时器），否则该任务将永远沉睡、再也不会被唤醒。'
 },
 {
  id:'rust-e2-17',
  type:'judge',
  q:'可以使用 cargo +nightly miri test 运行 Miri 解释器，来检测 unsafe 代码中是否存在越界访问、使用未初始化内存、违反 Stacked/Tree Borrows 别名规则等未定义行为。',
  answer:true,
  explain:'Miri 是基于 Rust 中间表示（MIR）的官方解释器，能够在执行测试时跟踪每个指针的来源（Provenance）、内存初始化状态、对齐和借用栈规则，是审计 unsafe 代码是否含 UB 的必备利器。'
 },
 {
  id:'rust-e2-18',
  type:'fill',
  q:'在单线程中，若结构体已经对外只暴露不可变引用 &self，但内部某个实现了 Copy 的计数器字段仍需在方法里读取和修改，除了 RefCell<T> 外更轻量、零借用计数开销的内部可变性容器是 std::cell::＿。',
  accepted:['Cell','Cell<T>'],
  explain:'Cell<T> 通过直接按值替换（get / set / replace）而不交出内部数据的引用 &T，在编译期就彻底杜绝了别名引用冲突，因此没有任何运行时借用计数器开销，非常适合 Copy 类型。'
 },
 {
  id:'rust-e2-19',
  type:'fill',
  q:'当自定义结构体中包含裸指针或手动管理堆内存时，为了向编译器准确表达“销毁该类型实例时会读取所指向的 T 类型数据”（用于 Drop Check 借用检查），通常会在结构体中添加一个零大小的 std::marker::＿<T> 字段。',
  accepted:['PhantomData','PhantomData<T>'],
  explain:'PhantomData<T> 是零大小类型（ZST，运行时占 0 字节），用于在类型系统层面告知编译器该结构体在逻辑上拥有或借用了类型 T，从而正确推导型变（Variance）、Send/Sync 自动实现以及 Drop Check 规则。'
 },
 {
  id:'rust-e2-20',
  type:'fill',
  q:'在自定义 Future 或异步流的状态机中，如果某个类型内部完全不包含自引用结构、无论何时在内存中移动都是安全的，它就会自动实现标准库的 std::marker::＿ 标记 trait。',
  accepted:['Unpin'],
  explain:'绝大多数普通 Rust 类型都自动实现了 Unpin；对于 T: Unpin，Pin<&mut T> 与普通 &mut T 几乎没有区别，可以通过 Pin::into_inner 或 DerefMut 直接拿到可变引用。只有跨 .await 自引用的 Future 或显式包含 PhantomPinned 的类型才是 !Unpin。'
 },
 {
  id:'rust-e2-21',
  type:'short',
  q:'请解释 Rust 异步编程的底层执行模型：async fn 编译后会变成什么？Future::poll、Context 与 Waker 是如何协作做到“零空转等待”的？',
  reference:'在 Rust 中，async fn 在编译期会被编译器展开为一个实现了 std::future::Future trait 的匿名状态机枚举：每个 .await 点对应状态机的一个挂起状态，跨越该 .await 点存活的局部变量会被提升为状态机对应变体的字段（因此可能产生自引用，需要 Pin）。Rust 的 Future 是惰性的（不 poll 不执行）：执行器（Executor，如 Tokio）首次调用 Future::poll(Pin<&mut Self>, &mut Context) 推进状态机；当遇到尚未就绪的异步 I/O 或定时器时，底层资源会将 Context 中的 cx.waker().clone() 保存并注册到反应器（Reactor，如 epoll/kqueue/iocp）上，然后返回 Poll::Pending，执行器立刻切去运行其他就绪任务，不占用任何线程。当操作系统通知底层 I/O 就绪时，反应器调用 waker.wake()，把该任务重新放回执行器的就绪队列，执行器随后再次调用 poll，状态机从上次挂起的分支继续向后运行，直至返回 Poll::Ready(output)。',
  points:[
   'async fn 编译为实现 Future 的匿名状态机枚举，跨 .await 局部变量保存为状态机字段',
   'Future 是惰性的，由执行器调用 poll(Pin<&mut Self>, &mut Context) 驱动状态流转',
   '未就绪时底层资源克隆并注册 cx.waker() 到 Reactor（如 epoll），返回 Poll::Pending 让出线程',
   '事件就绪后 Reactor 调用 waker.wake() 将任务放回就绪队列，执行器再次 poll 直至 Poll::Ready'
  ],
  explain:'围绕“编译期状态机 + 惰性 poll + Pending 时注册 Waker + wake() 重新入队”这四个环节作答即可拿到满分。'
 },
 {
  id:'rust-e2-22',
  type:'short',
  q:'什么是“安全抽象（Safe Abstraction）”？在编写包含 unsafe 块的底层数据结构或 FFI 封装时，应该遵循哪些核心工程原则？',
  reference:'“安全抽象”是指：虽然模块或结构体内部为了性能、底层硬件访问或 FFI 调用使用了 unsafe 块，但它对外暴露的公开函数与方法签名是完全安全的（不带 unsafe fn），使得任何外部调用者在 Safe Rust 中无论传入什么合法参数、以何种顺序调用，都不可能触发未定义行为（UB）。编写安全抽象应遵循以下核心原则：一、最小化信任边界，注意隐私边界才是真正的安全边界——一旦私有字段维护了不变量（如 Vec 的 ptr/len/cap），整个所在模块中所有能直接修改这些私有字段的安全代码都属于信任边界，建议把 unsafe 核心封装在尽可能小的独立子模块中；二、严格遵守别名规则与指针来源（Provenance），绝不同时构造重叠的 &mut T 与 &T；三、异常安全（Panic Safety）与防泄漏假设，在数据处于中间不一致状态时若用户闭包 panic，不能在 Drop 中读取未初始化或双重释放内存，且不能依赖某个 Guard 一定不会被 mem::forget；四、撰写清晰的 // SAFETY: 注释（说明为何满足前置条件）和 # Safety 文档（针对对外公开的 unsafe fn），并用 Miri 与属性测试验证。',
  points:[
   '安全抽象定义：内部用 unsafe 实现，但对外公开 API 保证在任何合法 Safe 调用下都不产生 UB',
   '最小化安全边界：利用模块私有性保护底层不变量（如 ptr/len/cap），把 unsafe 隔离在小模块中',
   '遵守别名规则与 Panic Safety：防止同时出现可变与共享引用，防止中途 panic 导致双重释放或读脏数据',
   '工程规范：为每个 unsafe 块编写 // SAFETY: 注释，并用 cargo +nightly miri test 验证'
  ],
  explain:'重点在于理解“unsafe 的边界不是那几行花括号，而是维护该不变量的整个私有模块”，以及 Panic Safety。'
 },
 {
  id:'rust-e2-23',
  type:'short',
  q:'在高并发 Rust 服务端程序（例如基于 Tokio + Axum 的 Web 服务）中，如果发现吞吐量上不去、尾延迟（P99）很高，你会从哪些维度排查和调优？',
  reference:'排查高并发 Rust 服务的吞吐与 P99 尾延迟问题，可按以下维度推进：一、排查异步线程饥饿与阻塞：检查是否在 async 任务里直接执行了耗时 CPU 计算、同步文件/网络 I/O 或持 std::sync::Mutex 锁等待，这类操作会卡住 Tokio worker 线程导致同队列任务尾延迟飙升，应迁移至 spawn_blocking 或改用异步原语；二、锁竞争与共享状态粒度：检查全局 Arc<Mutex<HashMap<...>>> 是否成为热点，可改用读多写少的 RwLock、分片并发哈希表（如 DashMap）、原子类型或通过 mpsc/actor 消息传递消除共享锁；三、内存分配与克隆开销：用 cargo flamegraph / samply / DHAT 分析热点路径，减少高频请求中不必要的 String/Vec 重复分配与 .clone()，使用 &str / Cow<str>、Bytes 零拷贝切片、String::with_capacity 预分配或对象池复用缓冲区；四、连接池与背压配置：检查 SQLx 数据库连接池或下游 HTTP 客户端连接池是否被打满排队，合理设置超时、限流（tower::limit）与批处理。',
  points:[
   '排查异步运行时阻塞：检查 async 中是否混入同步 I/O、耗时 CPU 计算或跨 .await 的同步锁',
   '降低锁竞争：缩小临界区，用分片锁（DashMap）、RwLock、原子操作或通道替代大粒度全局 Mutex',
   '减少堆分配与拷贝：借助 flamegraph 定位热点，利用 with_capacity、Cow、Bytes 避免高频 clone',
   '治理外部 I/O 与背压：检查数据库连接池、下游超时以及使用 Tower 中间件做并发限流'
  ],
  explain:'从“运行时调度阻塞 → 锁竞争 → 内存分配热点 → 下游连接池与背压”四层展开，既有 Rust 语言特性又有工程实战深度。'
 },
 {
  id:'rust-e2-24',
  type:'code',
  q:'使用 std::sync::{Arc, Mutex, mpsc} 和 std::thread 实现一个带优雅退出的固定大小线程池 struct ThreadPool：提供 ThreadPool::new(size: usize) -> Self 和 execute<F>(&self, f: F)（其中 F: FnOnce() + Send + \'static），并在 ThreadPool 的 Drop 实现中关闭发送端、等待所有工作线程处理完队列中的任务后正常 join 退出。',
  reference:'use std::sync::{mpsc, Arc, Mutex};\nuse std::thread::{self, JoinHandle};\n\ntype Job = Box<dyn FnOnce() + Send + \'static>;\n\npub struct ThreadPool {\n    sender: Option<mpsc::Sender<Job>>,\n    workers: Vec<Option<JoinHandle<()>>>,\n}\n\nimpl ThreadPool {\n    pub fn new(size: usize) -> Self {\n        assert!(size > 0);\n        let (tx, rx) = mpsc::channel::<Job>();\n        let rx = Arc::new(Mutex::new(rx));\n        let mut workers = Vec::with_capacity(size);\n\n        for _ in 0..size {\n            let rx = Arc::clone(&rx);\n            let handle = thread::spawn(move || loop {\n                let job = {\n                    let lock = rx.lock().unwrap();\n                    lock.recv()\n                };\n                match job {\n                    Ok(job) => job(),\n                    Err(_) => break,\n                }\n            });\n            workers.push(Some(handle));\n        }\n\n        Self {\n            sender: Some(tx),\n            workers,\n        }\n    }\n\n    pub fn execute<F>(&self, f: F)\n    where\n        F: FnOnce() + Send + \'static,\n    {\n        if let Some(tx) = &self.sender {\n            tx.send(Box::new(f)).unwrap();\n        }\n    }\n}\n\nimpl Drop for ThreadPool {\n    fn drop(&mut self) {\n        drop(self.sender.take());\n        for worker in &mut self.workers {\n            if let Some(handle) = worker.take() {\n                let _ = handle.join();\n            }\n        }\n    }\n}',
  points:[
   '使用 Arc<Mutex<mpsc::Receiver<Job>>> 让多个工作线程共享任务接收端',
   '工作线程在取出任务后立即释放 MutexGuard（不持锁执行 job()），否则线程池退化为串行执行',
   'sender 和 JoinHandle 用 Option 包裹，以便在 Drop(&mut self) 中通过 .take() 移出所有权',
   'Drop 中先 drop(self.sender.take()) 关闭通道令 recv() 返回 Err，再依次 join 所有工作线程'
  ],
  explain:'这道经典面试题中最关键的细节有两个：一是必须在执行 job() 之前释放 rx.lock() 的守卫，否则多个线程无法并发跑任务；二是 Drop 中必须先 take 并销毁 sender，否则工作线程会永远阻塞在 recv() 上导致 join 死锁。'
 },
 {
  id:'rust-e2-25',
  type:'code',
  q:'实现一个声明宏 macro_rules! btree_map：支持用 btree_map![] 创建空 BTreeMap，也支持用 btree_map!{ "a" => 1, "b" => 2, }（允许末尾带可选逗号）创建并填充 std::collections::BTreeMap。',
  reference:'#[macro_export]\nmacro_rules! btree_map {\n    () => {\n        ::std::collections::BTreeMap::new()\n    };\n    ( $( $k:expr => $v:expr ),+ $(,)? ) => {{\n        let mut map = ::std::collections::BTreeMap::new();\n        $(\n            map.insert($k, $v);\n        )+\n        map\n    }};\n}',
  points:[
   '提供空分支 () => { ::std::collections::BTreeMap::new() } 处理无参调用',
   '使用 $( $k:expr => $v:expr ),+ 匹配一个或多个键值对表达式，并用 $(,)? 兼容末尾可选逗号',
   '非空分支外层使用双花括号 {{ ... }} 构成块表达式，确保宏在任意表达式位置展开合法',
   '在重复块 $( map.insert($k, $v); )+ 中插入每个键值并返回 map'
  ],
  explain:'考察 macro_rules! 的多分支匹配、重复模式 $(...),+、尾随可选逗号 $(,)? 以及宏展开为块表达式 {{ ... }} 的卫生规范。'
 }
];

// Rust 最终考试（覆盖全部 15 关，难度最高）：30 题。
export const rustFinal:AiQuiz[]=[
 {
  id:'rust-f-1',
  q:'下面这段代码运行后输出什么（考察临时值与块表达式的析构顺序）？',
  code:'struct Guard(&\'static str);\nimpl Drop for Guard {\n    fn drop(&mut self) { print!("{} ", self.0); }\n}\n\nfn main() {\n    let _a = Guard("a");\n    let _b = Guard("b");\n    let _ = Guard("tmp");\n    print!("mid ");\n}',
  options:[
   'tmp mid b a ',
   'mid tmp b a ',
   'mid a b tmp ',
   'b a tmp mid '
  ],
  why:[
   '',
   'let _ = Guard("tmp"); 使用的是通配符 _ 而非具名变量 _tmp，它不会把值绑定到当前作用域末尾，而是在该语句结束时立即析构。',
   '局部变量按声明的逆序（后进先出）在作用域末尾析构，且 let _ = ... 会在 print!("mid ") 之前立即析构。',
   '_a 和 _b 是绑定到 main 作用域的具名变量，只有在 print!("mid ") 执行完、离开 main 花括号时才会按逆序析构。'
  ],
  answer:0,
  explain:'在 Rust 中，let _ = expr; 不会延长或绑定该值的生命周期，右侧创建的 Guard("tmp") 会在该条语句结束时立刻调用 drop（先打印 tmp）；而带名字的下划线前缀变量 _a 和 _b 会存活到当前块结束，在打印完 mid 后按后进先出顺序依次析构 _b 和 _a，因此输出 tmp mid b a 。'
 },
 {
  id:'rust-f-2',
  q:'下面关于生命周期协变与可变引用的代码，为什么无法通过编译？',
  code:'fn replace_with_short<\'a>(slot: &mut &\'a str) {\n    let local = String::from("temp");\n    *slot = local.as_str();\n}',
  options:[
   '因为 &mut T 对 T 是不变的，且 local 活不过 \'a',
   '因为 String::as_str() 返回的是 &\'static str，不能赋给 &\'a str',
   '因为 Rust 语法不允许出现像 &mut &\'a str 这样的二级引用类型',
   '因为 local 没有标注 mut，无法通过 as_str() 取出字符串切片'
  ],
  why:[
   '',
   'local.as_str() 返回的切片生命周期绑定在局部变量 local 上，绝不是 \'static。',
   'Rust 完全允许任意多层引用（如 &mut &\'a str），报错原因是局部变量的生命周期不足以满足外层调用者规定的 \'a。',
   'String::as_str(&self) 只需要不可变借用，不需要 local 声明为 mut。'
  ],
  answer:0,
  explain:'泛型生命周期参数 \'a 是由调用方决定的（至少涵盖 replace_with_short 的整次调用并延续到调用之后），而 local 是在函数内部创建的局部变量，函数返回时即被销毁。由于 &mut T 在 T 上是不变的（invariant），编译器绝不允许用寿命更短的 &local 替换掉调用方持有的 &\'a str，否则调用方在函数返回后就会读到悬垂引用。'
 },
 {
  id:'rust-f-3',
  q:'下面这段结合了 Result、Iterator 与 collect::<Result<Vec<_>, _>>() 的代码运行后输出什么？',
  code:'fn main() {\n    let mut visited = 0;\n    let inputs = ["10", "20", "bad", "40"];\n    let res: Result<Vec<i32>, _> = inputs.iter().map(|s| {\n        visited += 1;\n        s.parse::<i32>()\n    }).collect();\n    println!("{} {}", res.is_err(), visited);\n}',
  options:[
   '输出 true 4，collect 会把所有元素都处理完再汇总错误',
   '输出 true 3，遇到首个 Err 时立即短路停止消费后续元素',
   '输出 false 3，自动跳过解析失败的元素并收集其余三项',
   '编译报错：Iterator<Item = Result<T, E>> 不能直接 collect'
  ],
  why:[
   'Result<C, E> 对 FromIterator<Result<A, E>> 的实现具有短路特性，一旦遇到 Err 就会立即停止拉取迭代器的下一个元素。',
   '',
   'collect 为 Result<Vec<i32>, _> 时遇到 Err 会整体返回 Err，若想忽略错误只留成功项应先使用 .filter_map(Result::ok)。',
   '标准库为 Result<C, E>（当 C: FromIterator<A> 时）实现了 FromIterator<Result<A, E>>，可以直接用 collect 转换。'
  ],
  answer:1,
  explain:'标准库中 Result<V, E> 实现了 FromIterator<Result<A, E>>：它在消费迭代器时只要一切为 Ok 就收集进容器 V，一旦遇到第一个 Err（第 3 个元素 "bad"），就会立刻短路返回该 Err，不再对第 4 个元素 "40" 调用 map 闭包，所以 res.is_err() 为 true，visited 为 3。'
 },
 {
  id:'rust-f-4',
  q:'关于静态分发（impl Trait / 泛型）与动态分发（dyn Trait），下面哪项描述是准确的？',
  options:[
   'fn foo(x: impl Display) 会在运行时通过虚函数表（vtable）查找并调用方法',
   '一个函数的返回类型写 -> impl Display 时，可以在 if 和 else 分支分别返回 i32 和 String',
   '&dyn Display 是一个占两个 usize 宽度的胖指针，包含数据地址与 vtable 地址',
   'Box<dyn Send + Display + Clone> 可以直接通过编译，因为任意多个普通 Trait 都能用 + 拼成对象'
  ],
  why:[
   '参数位置的 impl Trait 是泛型加 Trait 约束的语法糖，编译器会在编译期做单态化（Monomorphization）静态分发，没有 vtable 开销。',
   '返回位置的 -> impl Trait 要求所有返回分支产出的底层具体类型必须完全相同；若需返回不同具体类型应返回 Box<dyn Display>。',
   '',
   'dyn Trait 最多只能包含一个非自动 Trait（主 Trait）加上若干个自动标记 Trait（如 Send、Sync、Unpin），且 Clone 因返回 Self 本身也不是 dyn 兼容的。'
  ],
  answer:2,
  explain:'动态分发引用 &dyn Trait（或 Box<dyn Trait>）在底层是两个机器字（2 × usize）宽度的胖指针：第一个指针指向具体实例的数据内存，第二个指针指向该类型对应此 Trait 的虚函数表（vtable，内含对象大小、对齐、drop 函数指针及各方法指针）。'
 },
 {
  id:'rust-f-5',
  q:'下面这段使用 Cell<i32> 的代码运行后输出什么？',
  code:'use std::cell::Cell;\n\nfn main() {\n    let c = Cell::new(10);\n    let old = c.replace(25);\n    c.set(c.get() + 5);\n    println!("{old} {}", c.get());\n}',
  options:[
   '输出 10 30，replace 返回旧值',
   '输出 25 30，replace 返回新值',
   '输出 10 15，replace 未改变原值',
   '运行时 panic：replace 后不可再 set'
  ],
  why:[
   '',
   'c.replace(25) 会把新值 25 放进去，并返回被替换出来的旧值 10，因此 old 是 10 而不是 25。',
   'replace(25) 之后 c 内部的值已经变为 25，再执行 c.get() + 5 会得到 30 而不是 15。',
   'Cell 不发借用守卫，每次 get / set / replace 都是立即完成的按值拷贝或替换，不会触发任何运行时借用 panic。'
  ],
  answer:0,
  explain:'Cell::replace(25) 将内部值更新为 25 并返回先前的旧值 10（故 old = 10）；随后 c.get() 读出 25，加上 5 后通过 c.set(30) 写入，最终输出 10 30。'
 },
 {
  id:'rust-f-6',
  q:'在多线程程序中，线程 A 先写入普通全局变量 DATA = 42，再执行 READY.store(true, Ordering::Release)；线程 B 循环检查 while !READY.load(ord) {}，跳出循环后读取 DATA。为了让线程 B 在理论上严格保证读到 DATA == 42（无数据竞争 UB），线程 B 的 load 至少需要使用哪种内存序？',
  options:[
   'Ordering::Relaxed 即可，因为 while 循环本身自带 CPU 屏障',
   'Ordering::Release，因为读写两端必须使用完全同名的枚举变体',
   '无论用什么 Ordering 都有数据竞争，原子变量不能用来同步普通变量',
   'Ordering::Acquire（或更强的 SeqCst），与写端的 Release 配对'
  ],
  why:[
   'Relaxed 不建立任何跨变量的 happens-before 关系，CPU 或编译器可以把循环后的 DATA 读取重排到 READY 检查之前。',
   'load 操作不支持传入 Ordering::Release（传入会在运行时 panic），读端应使用 Acquire 与写端的 Release 配对。',
   'Release-Acquire 语义的核心用途正是作为同步原语（如自旋锁、单次发布标志），把写端 Release 之前的普通内存写入安全同步给读端 Acquire 之后的代码。',
   ''
  ],
  answer:3,
  explain:'根据 C++20 / Rust 内存模型，当线程 A 对原子变量 X 执行 Release 写，线程 B 对同一原子变量 X 执行 Acquire 读并观察到线程 A 写入的值时，两线程间建立起 Synchronizes-With（进而形成 Happens-Before）关系：线程 A 在 Release 之前的所有内存写操作（包括非原子变量）对线程 B 在 Acquire 之后的读操作均保证可见。'
 },
 {
  id:'rust-f-7',
  q:'在 Tokio 中运行下面这段代码，最终的打印输出是什么？',
  code:'#[tokio::main]\nasync fn main() {\n    let f1 = async { print!("1 "); };\n    let f2 = async { print!("2 "); };\n    print!("0 ");\n    f2.await;\n    f1.await;\n}',
  options:[
   '0 2 1 ',
   '1 2 0 ',
   '0 1 2 ',
   '1 0 2 '
  ],
  why:[
   '',
   'Rust 的 async 块是惰性的（Lazy），在被 .await 或交给执行器 poll 之前，里面的代码一行也不会执行。',
   '代码里先执行了 f2.await 再执行 f1.await，因此 2 会在 1 之前打印。',
   'let f1 = async { ... }; 只是构造了未启动的 Future 状态机，不会在 print!("0 ") 之前抢先运行。'
  ],
  answer:0,
  explain:'与其他某些语言中 async 函数一调用就立即在后台启动不同，Rust 的 async 块和 async fn 是完全惰性的，只返回一个未曾轮询的 Future 状态机。因此程序先执行 print!("0 ")，接着 f2.await 驱动 f2 打印 "2 "，最后 f1.await 驱动 f1 打印 "1 "，输出为 0 2 1 。'
 },
 {
  id:'rust-f-8',
  q:'下面这段关于 std::mem::MaybeUninit<T> 的用法，哪一项是安全且符合规范的？',
  options:[
   '对 MaybeUninit::<String>::uninit() 直接调用 assume_init() 即可拿到空字符串',
   'MaybeUninit<T> 在离开作用域时会自动调用内部 T 的 Drop 析构函数以防泄漏',
   '先调用 val.write(String::from("ok")) 写入有效值后，再在 unsafe 块中调用 val.assume_init()',
   '可以用 MaybeUninit::<bool>::uninit().assume_init() 安全地生成一个随机布尔值'
  ],
  why:[
   '对尚未写入数据的 uninit 内存调用 assume_init() 会构造出包含垃圾字节的 String，立即引发未定义行为（UB）。',
   'MaybeUninit<T> 编译器无法知晓内部是否已初始化，因此它绝不会自动调用 T 的 Drop；若已初始化但未调用 assume_init 取出，需手动调用 assume_init_drop()。',
   '',
   'bool 的合法位模式只有 0x00 和 0x01，对未初始化内存 assume_init 成 bool 在 Rust 中是经典的立即未定义行为。'
  ],
  answer:2,
  explain:'MaybeUninit<T> 用于安全地处理延迟初始化内存：直接用 std::mem::uninitialized() 早已被废弃；正确流程是创建 uninit() 后通过 .write(...) 或向 as_mut_ptr() 完整写入合法位模式，确认初始化完毕后再在 unsafe 中调用 assume_init() 取出 T。'
 },
 {
  id:'rust-f-9',
  q:'在 Rust 的三类过程宏（Procedural Macros）中，下面关于它们对输入代码的处理方式哪项说法是正确的？',
  options:[
   '#[derive(MyTrait)] 派生宏会直接删掉原来的 struct 定义，只保留宏返回的新代码',
   '过程宏接收的输入参数是编译期的完整类型推导图（HIR）以及借用检查结果',
   '在同一个 crate 里定义过程宏时，无需在 Cargo.toml 中配置任何特殊的 [lib] 属性',
   '#[my_attr] 属性宏会用宏返回的 TokenStream 完全替换掉被标注的项（如整个函数或结构体）'
  ],
  why:[
   '#[derive(...)] 派生宏是追加式的（additive），原结构体或枚举定义原封不动保留，宏返回的 TokenStream 会被追加在其后面。',
   '过程宏在语法解析刚完成时运行，它只接收词法标记流 proc_macro::TokenStream，此时编译器尚未进行名称解析、类型推导或借用检查。',
   '过程宏必须放在单独的 crate 中，且其 Cargo.toml 必须在 [lib] 小节显式声明 proc-macro = true。',
   ''
  ],
  answer:3,
  explain:'派生宏（#[derive]）保留原始类型定义并在其后追加生成的代码（通常是 impl 块）；而属性宏（#[my_attr]）和函数式过程宏（my_macro!(...)）都是替换式的，宏返回的 TokenStream 会完全取代原有的被标注项或宏调用（因此属性宏若想保留原函数，需把解析出的原函数一并放进输出流中）。'
 },
 {
  id:'rust-f-10',
  type:'multi',
  q:'关于 Deref 强制转换（Deref Coercion）与智能指针方法调用，下面哪些说法是正确的？（多选）',
  options:[
   '当 T 实现了 Deref<Target = U> 时，编译器可在传参位置自动把 &T 转换为 &U',
   '&mut T 既可以通过 DerefMut 自动转为 &mut U，也可以通过 Deref 降级转为不可变的 &U',
   '也可以反过来把不可变引用 &T 通过 DerefMut 自动提升为可变引用 &mut U',
   '调用 Rc::clone(&rc) 时，标准库会在堆上深拷贝一份底层数据并分配新的内存块'
  ],
  why:[
   '',
   '',
   'Rust 的借用安全绝不允许将不可变引用 &T 自动转换为可变引用 &mut U。',
   'Rc::clone(&rc) 只会将堆上控制块里的强引用计数器加 1 并返回一个共享同块内存的新 Rc，不会深拷贝底层数据。'
  ],
  answers:[0,1],
  explain:'Deref 强制转换支持三条路径：&T -> &U（当 T: Deref<Target=U>）、&mut T -> &mut U（当 T: DerefMut<Target=U>）、以及可变降级为不可变 &mut T -> &U；不可变引用绝不能提升为可变引用。Rc::clone 仅递增引用计数，不深拷贝数据。'
 },
 {
  id:'rust-f-11',
  type:'multi',
  q:'关于模式匹配、守卫（match guard）与 @ 绑定，下面哪些说法是正确的？（多选）',
  options:[
   'match n { x @ 1..=5 => ..., _ => ... } 既能测试 n 是否在 1 到 5 闭区间内，又能把值绑定给变量 x',
   '在模式里写 Some(ref s) 或对 &Option<String> 直接 match 时，可以在不转移 String 所有权的前提下借用内部字符串',
   '带有守卫的分支 Some(x) if x > 0 => ... 在编译器做穷尽性检查时，会被认为已经完整覆盖了所有 Some(_)',
   'if let Some(v) = opt { ... } 在编译期不要求处理 None 的情况，因此在运行时遇到 None 会直接触发 panic'
  ],
  why:[
   '',
   '',
   '编译器无法在编译期静态判定任意布尔守卫表达式 if x > 0 是否为真，因此带守卫的分支不计入该模式的完全覆盖，仍需补充不带守卫的 Some(_) 或 _ 分支。',
   'if let 只是针对单一模式的语法糖，遇到不匹配的 None 时会安静地跳过该分支（或执行可选的 else 块），绝不会 panic。'
  ],
  answers:[0,1],
  explain:'@ 运算符允许在测试子模式范围的同时将匹配值绑定到变量；匹配引用（人体工程学匹配 match ergonomics）或使用 ref / ref mut 可避免拿走内部非 Copy 字段的所有权；match guard 不计入穷尽性覆盖；if let 匹配失败时正常跳过分支。'
 },
 {
  id:'rust-f-12',
  type:'multi',
  q:'在并发与异步通道（Channel）选型时，下面哪些说法是正确的？（多选）',
  options:[
   'std::sync::mpsc::sync_channel(0) 创建的是容量为 0 的会合同步通道，发送端会阻塞直到接收端同时交接',
   '当所有 Sender（包括克隆出的副本）都被 drop 销毁后，Receiver 的 recv() 会返回 Err（异步返回 None）',
   '在 Tokio 中使用无界通道 unbounded_channel 时，若生产速度远大于消费速度，易导致内存持续增长且缺乏背压',
   '在 Tokio 异步任务中等待通道消息时，直接调用 std::sync::mpsc::Receiver::recv() 阻塞当前工作线程是推荐的高吞吐做法'
  ],
  why:[
   '',
   '',
   '',
   'std::sync::mpsc::Receiver::recv() 是同步阻塞线程调用，在 async 任务中调用会直接卡死 Tokio 工作线程，应使用 tokio::sync::mpsc::channel 的异步 .recv().await。'
  ],
  answers:[0,1,2],
  explain:'通道通过“销毁全部 Sender 通知 Receiver 结束”实现优雅关停；生产环境推荐优先使用有界通道（bounded channel）向快速生产者施加背压（Backpressure），防止内存打爆（OOM）；异步上下文中接收消息必须使用异步通道的 .recv().await。'
 },
 {
  id:'rust-f-13',
  type:'multi',
  q:'关于 Rust 中的五种 unsafe 超能力与安全规则，下面哪些说法是正确的？（多选）',
  options:[
   '解引用裸指针（*const T / *mut T）和调用 unsafe fn 都必须放在 unsafe 块或 unsafe fn 中',
   '读写可变静态变量（static mut）以及访问 union（联合体）的字段都属于 unsafe 操作',
   '实现 unsafe trait（如 Send 和 Sync）时需要使用 unsafe impl 语法，向编译器承诺实现满足安全契约',
   '一旦进入 unsafe { ... } 花括号内部，普通引用 &T 和 &mut T 的借用检查器就会被完全关闭'
  ],
  why:[
   '',
   '',
   '',
   'unsafe 块只解锁那五种特定超能力，绝不会关闭对普通引用的借用检查或生命周期检查。'
  ],
  answers:[0,1,2],
  explain:'Rust 的五种 unsafe 超能力分别是：一、解引用裸指针；二、调用 unsafe 函数或方法；三、访问或修改可变静态变量（static mut）；四、实现 unsafe trait；五、访问 union 的字段。unsafe 块不会关闭借用检查器。'
 },
 {
  id:'rust-f-14',
  type:'multi',
  q:'在 Rust 工程测试、内存布局与性能优化中，下面哪些做法是有效的？（多选）',
  options:[
   '已知 Vec 大致元素数量时，使用 Vec::with_capacity(n) 预分配容量以消除多次成倍扩容与内存拷贝',
   '使用 std::mem::size_of::<MyEnum>() 检查热点数据结构的大小，避免单个罕见的大变体撑大整个枚举（必要时用 Box 包裹大变体）',
   '在集成测试目录 tests/ 下的每个独立 .rs 文件，都会被 Cargo 当作一个独立的外部 crate 编译并测试被测库的 pub 接口',
   '只读函数参数优先接收切片引用 &str 和 &[T]，而不是强行要求调用方传入拥有所有权的 String 和 Vec<T>'
  ],
  why:[
   '',
   '',
   '',
   ''
  ],
  answers:[0,1,2,3],
  explain:'with_capacity 避免动态扩容重分配；用 Box<LargeStruct> 瘦身枚举的大变体（Boxed Variant）是降低栈拷贝和提升缓存命中率的经典技巧；tests/ 目录下的文件作为外部消费者测试库的公共 API；只读参数优先使用借用切片 &str / &[T] 可以避免调用方做不必要的克隆且兼容更多输入类型。'
 },
 {
  id:'rust-f-15',
  type:'multi',
  q:'关于 Pin<P>、Unpin 与异步自引用状态机，下面哪些说法是正确的？（多选）',
  options:[
   'Pin<&mut T> 包裹的是指针类型（如 &mut T、Box<T>），而不是直接写成 Pin<T> 包裹值本身',
   '如果类型 T 实现了 Unpin（即 T: Unpin），那么可以通过 Pin::into_inner(pin) 安全地直接取回 &mut T',
   '当 T: !Unpin 时，把值放入 Box::pin(val) 会在堆上分配固定地址，调用方无法再通过安全 API 拿到 &mut T 把它换出',
   '只要在结构体定义上方加上 #[derive(Clone, Copy)]，该结构体就会自动变成 !Unpin 类型'
  ],
  why:[
   '',
   '',
   '',
   '默认情况下只要所有字段都是 Unpin，结构体就会自动实现 Unpin；想让结构体变成 !Unpin 需要包含 std::marker::PhantomPinned 字段或跨 .await 借用的 Future。'
  ],
  answers:[0,1,2],
  explain:'Pin<P> 是对指针 P（实现了 Deref）的包装器。当所指向的目标 T: Unpin 时，Pin 不施加任何限制；当 T: !Unpin（如含 PhantomPinned 或自引用 Future）时，Pin 禁止安全代码获取 &mut T，且 Box::pin 将其固定在稳定的堆地址上直到 Drop 析构完毕。'
 },
 {
  id:'rust-f-16',
  type:'judge',
  q:'在 Rust 中，Option<&T>、Option<&mut T> 和 Option<Box<T>> 在内存中的字节大小与裸 &T、&mut T、Box<T> 完全相同，没有额外的布尔判别式空间开销。',
  answer:true,
  explain:'因为引用（&T、&mut T）和智能指针（Box<T>、NonNull<T>）在合法状态下绝不可能是空指针（全 0 位模式），Rust 编译器会利用这一无效位模式（Niche / 空位优化）来表示 None，从而使 Option<&T> 与 &T 具有完全相同的内存大小（1 个 usize，胖指针则为 2 个 usize）。'
 },
 {
  id:'rust-f-17',
  type:'judge',
  q:'如果在某个结构体 T 的 Drop::drop(&mut self) 实现过程中再次触发了 panic，而此时线程本身已经处于前一次 panic 的栈展开（unwinding）过程中，Rust 运行时会立即终止（abort）整个进程。',
  answer:true,
  explain:'在栈展开清理局部变量期间如果某个析构函数 Drop 再次抛出未捕获的 panic（双重 panic / double panic），展开机制无法同时跟踪两个异常并保证资源清理安全，因此标准库会立刻调用 abort 终止进程。因此 Drop 实现中应尽量避免可能 panic 的操作（如不用 unwrap()）。'
 },
 {
  id:'rust-f-18',
  type:'judge',
  q:'对于切片 &[T] 的裸指针转换，只需要保存指向首元素的薄指针 ptr.as_ptr()，后续即使丢失了长度 len，也可以仅凭该薄指针直接调用 std::slice::from_raw_parts 恢复出原切片。',
  answer:false,
  explain:'切片引用 &[T] 是包含“首元素地址 data + 元素个数 len”的胖指针；转换成裸指针 *const T 后只保留了首地址，长度信息不在内存末尾也没有结尾标记。调用 std::slice::from_raw_parts(data, len) 必须同时传入非空对齐的指针和准确的元素个数 len。'
 },
 {
  id:'rust-f-19',
  type:'judge',
  q:'在 Axum Web 框架中，注册到 Router 上的共享应用状态（如 AppState）需要在多个并发工作线程间同时被多个请求处理器克隆和读取，因此 AppState 通常需要实现 Clone + Send + Sync + \'static（或用 Arc 包裹）。',
  answer:true,
  explain:'Axum 在多线程 Tokio 运行时上并发处理每个 HTTP 请求，State<S> 提取器在每次请求进入 handler 时都会对状态 S 调用 .clone()，因此通常把数据库连接池、配置等装进结构体并用 Arc<InnerState> 包裹（或为内部含 Arc 的 AppState 派生 Clone）。'
 },
 {
  id:'rust-f-20',
  type:'fill',
  q:'当我们需要在不析构、不克隆的前提下，把可变引用 &mut T 指向的位置替换成一个新值（或替换为 Default::default()）并拿走里面的旧值所有权时，可以使用标准库 std::mem 模块下的 replace 或 ＿ 函数。',
  accepted:['take','std::mem::take'],
  explain:'std::mem::replace(dest, src) 用新值 src 替换 *dest 并返回旧值的完整所有权；当 T: Default 时，std::mem::take(dest) 等价于 mem::replace(dest, T::default())，在实现状态机流转、链表节点摘除和 Drop 清理时极其常用。'
 },
 {
  id:'rust-f-21',
  type:'fill',
  q:'在多线程或全局静态变量中，如果希望某个配置或连接池只在首次被访问时才执行一次线程安全的延迟初始化（Rust 1.80+ 标准库原生支持，无需第三方 lazy_static），可以使用 std::sync::＿。',
  accepted:['LazyLock','OnceLock'],
  explain:'Rust 标准库在 std::sync 中提供了 OnceLock<T>（首次调用 get_or_init 初始化）以及更便捷的 LazyLock<T>（在声明 static 时直接绑定初始化闭包，首次解引用时自动完成线程安全初始化）。'
 },
 {
  id:'rust-f-22',
  type:'fill',
  q:'在异步编程中，如果希望给任意一个 Future 加上超时控制（超过指定 Duration 还未完成就取消该 Future 并返回 Err(Elapsed)），可以直接调用 tokio::time::＿(duration, fut).await。',
  accepted:['timeout'],
  explain:'tokio::time::timeout(duration, future) 会返回一个带有定时器的包装 Future：若内部 future 在期限内完成则返回 Ok(output)，否则到期后自动丢弃内部 future 并返回 Err(Elapsed)。'
 },
 {
  id:'rust-f-23',
  type:'fill',
  q:'在编写泛型结构体或 Trait 时，若希望允许类型参数 T 可以是编译期大小未知的动态大小类型（DST，如 str 或 [u8]），需要显式放宽默认的 Sized 约束，写作 T: ＿。',
  accepted:['?Sized'],
  explain:'Rust 中所有泛型类型参数默认都隐式带有 T: Sized 约束；只有显式写出 T: ?Sized（读作“T 可能不是 Sized”），该泛型才能接受 str、[U]、dyn Trait 等动态大小类型（通常通过指针或引用 &T / Box<T> 持有）。'
 },
 {
  id:'rust-f-24',
  type:'short',
  q:'请全面对比 Rust 中实现多态与抽象的三种方式：泛型单态化（Generics / impl Trait）、特征对象动态分发（dyn Trait）以及枚举分发（enum Dispatch）。它们各自在编译产物、运行时开销和可扩展性上有什么权衡？',
  reference:'一、泛型单态化（T: Trait / impl Trait）：编译器在编译期为每种实际用到的具体类型生成一份专门的机器码副本（静态分发）。优点是零运行时虚表开销、方法可被内联优化、无堆分配且不受 dyn 兼容性限制；缺点是如果类型组合很多会导致编译时间变长和二进制体积膨胀（Code Bloat），且同一 Vec<T> 中只能存放同一种具体类型。二、特征对象动态分发（&dyn Trait / Box<dyn Trait>）：通过胖指针（数据指针 + vtable 指针）在运行时查虚表调用方法。优点是支持在同一个异构集合（如 Vec<Box<dyn Plugin>>）中混合存放不同具体类型，减少二进制膨胀，并且开放扩展（外部 crate 可随时新增实现类型）；缺点是通常伴随堆分配（Box）、间接跳转无法被编译器内联，且 Trait 必须满足对象安全（dyn 兼容性）。三、枚举分发（enum Shape { Circle(Circle), Rect(Rect) }）：当所有可能的子类型在编译期是一个已知的封闭集合时，用枚举把它们包在一起并通过 match 分发。优点是无堆分配、内存紧凑连续、可内联、性能接近静态分发，还能放进同一个 Vec<Shape>；缺点是封闭集合，每次新增一种变体都要修改枚举定义和所有 match 分支。',
  points:[
   '泛型单态化（静态分发）：编译期按具体类型展开，零虚表开销且可内联，但可能导致二进制体积膨胀且集合必须同构',
   '特征对象（dyn Trait 动态分发）：通过胖指针 + vtable 运行时查表，支持异构集合与外部开放扩展，但无法内联且受 dyn 兼容性限制',
   '枚举分发（enum Dispatch）：适合编译期已知的封闭类型集合，兼具异构容器存储与无堆分配/可内联的高性能',
   '选型原则：开放异构集合用 dyn Trait，封闭异构集合用 enum，同构高性能通用逻辑用泛型'
  ],
  explain:'能把“泛型单态化 vs dyn Trait 虚表 vs enum 封闭集合”三者在内存布局、内联能力、异构容器支持和开闭原则上的差异讲透，是高级 Rust 面试的核心加分项。'
 },
 {
  id:'rust-f-25',
  type:'short',
  q:'请梳理 Rust 标准库中的内部可变性（Interior Mutability）与并发同步容器矩阵：在单线程和多线程场景下，分别有哪些容器？它们各自解决什么问题、有什么代价？',
  reference:'内部可变性允许在只持有共享引用（&T）的情况下安全地修改内部数据，按单线程（!Sync）与多线程（Sync）可分为两组：一、单线程场景（不可跨线程共享引用）：1. Cell<T>：通过按值拷贝/替换（get/set/replace）工作，绝不交出内部引用 &T，因此零运行时借用检查开销，适用于实现了 Copy 或可整体 take/replace 的轻量字段；2. RefCell<T>：可借出 Ref<T> 和 RefMut<T> 引用守卫，把借用规则检查推迟到运行时计数器，若在同一线程内同时借出可变与不可变守卫会在运行时 panic；3. OnceCell<T>：单线程单次延迟写入容器，初始化后可安全共享不可变引用 &T。常与单线程引用计数 Rc<T> 组合成 Rc<RefCell<T>>。二、多线程场景（实现了 Sync，通常与原子引用计数 Arc<T> 配合）：1. Atomic*（如 AtomicUsize / AtomicBool）：基于 CPU 原子指令的无锁单变量读写与 CAS，开销最小但只支持基础数值/布尔/指针类型；2. Mutex<T>：互斥锁，同一时刻只允许一个线程获取 MutexGuard 读写内部数据，竞争时阻塞挂起线程（在异步中若需跨 .await 则用 tokio::sync::Mutex）；3. RwLock<T>：读写锁，允许多个读者并发读或单个写者独占写，适合读远多于写的临界区；4. OnceLock<T> / LazyLock<T>：多线程安全的单次全局或延迟初始化容器。',
  points:[
   '单线程矩阵：Cell<T>（按值读写，零开销）、RefCell<T>（运行时借用计数，违规 panic）、OnceCell<T>，常配 Rc<T>',
   '多线程矩阵：Atomic*（无锁单变量）、Mutex<T>（独占互斥）、RwLock<T>（多读单写）、OnceLock/LazyLock（线程安全单次初始化），常配 Arc<T>',
   '清晰说明核心机制：为什么需要内部可变性（突破外层 &self 限制）以及编译期检查如何转化为按值替换、运行时计数或锁同步'
  ],
  explain:'把单线程（Rc + Cell / RefCell / OnceCell）与多线程（Arc + Atomic / Mutex / RwLock / OnceLock）对称列举并讲清开销差异，条理非常清晰。'
 },
 {
  id:'rust-f-26',
  type:'short',
  q:'什么是 Tokio 中的“取消安全性（Cancellation Safety）”？请举一个非取消安全的典型例子和一个取消安全的例子，并说明在 loop + tokio::select! 中如何避免因取消导致的数据丢失。',
  reference:'在 Tokio 中，取消一个异步操作是通过直接丢弃（drop）其 Future 状态机实现的。所谓“取消安全性（Cancellation Safety）”，是指当一个 Future 在 loop + tokio::select! 中被某次轮询推进了一部分（返回过 Pending），但随后因为其他分支率先完成而被 drop 丢弃时，是否会丢失已经从底层数据源读出但尚未交付给调用方的数据。一、非取消安全的典型例子：AsyncReadExt::read_exact(&mut buf) 或自己编写的“先读 4 字节长度头，再读 N 字节消息体”的 async 函数。如果它已经从 socket 读出了前一半字节保存在该 Future 自己的局部变量里，此时另一个 select! 分支（如心跳定时器）就绪导致该读取 Future 被 drop，那么那一半字节就会随着局部变量的销毁而永久丢失，下次循环重新创建 read_exact 时字节流就已经错位了。二、取消安全的典型例子：tokio::sync::mpsc::Receiver::recv() 或 AsyncReadExt::read(&mut buf)。若没有在当次 poll 就立刻拿到消息/字节，它不会提前消费通道或内核缓冲区里的任何数据。三、解决方案：1. 优先在 select! 分支中使用官方文档标明 Cancellation Safe 的方法（如用 AsyncReadExt::read_buf 往循环外持久化的 BytesMut 缓冲区里追加数据）；2. 若必须调用非取消安全的 async 函数，不要在每次循环的 select! 分支里重新调用它，而是在循环外创建该 Future 并用 tokio::pin!(fut) 固定，在 select! 分支里轮询 &mut fut，直到它真正完成后再重置。',
  points:[
   '定义：Future 在 select! 中未完成即被 drop 时，是否会丢失已从底层消费的中间状态数据',
   '非取消安全案例：read_exact 或多步串联的 async 读取函数（已读入局部变量的部分随 Future drop 丢失）',
   '取消安全案例：mpsc::Receiver::recv()、AsyncReadExt::read / read_buf（配合循环外持久化缓冲区）',
   '修复方案：改用取消安全 API + 外部缓冲区，或在循环外创建 Future 并用 tokio::pin! 固定后在 select! 中传 &mut fut'
  ],
  explain:'取消安全是 Rust 异步面试中区分熟手与专家的标志性问题，把原因（drop 状态机销毁了局部变量里的半包数据）和两种解法讲清楚即可。'
 },
 {
  id:'rust-f-27',
  type:'short',
  q:'在将 C/C++ 库通过 FFI 接入 Rust 项目，或者将 Rust 核心库通过 FFI 导出给 C/Python/移动端调用时，如何保证内存所有权边界、错误处理与并发安全？',
  reference:'跨 FFI 边界没有 Rust 借用检查器保护，必须严格设计边界契约：一、内存所有权与释放配对（“谁分配，谁释放”）：绝不能在 Rust 侧用 Box::into_raw 分配内存后让 C 侧直接调用 free()（两边可能使用不同的分配器如 jemalloc/mimalloc 与系统 malloc，且布局不同）。标准做法是：Rust 导出构造函数（如 my_ctx_new() -> *mut MyCtx，内部用 Box::into_raw）的同时，必须配套导出析构函数（如 unsafe extern "C" fn my_ctx_free(ptr: *mut MyCtx)，内部判空后用 drop(Box::from_raw(ptr)) 释放）；二、数据布局与字符串/切片传递：跨边界结构体加 #[repr(C)]（不透明句柄 Opaque Pointer 则无需暴露内部字段），字符串用 CStr / CString 处理末尾 \\0 并校验 UTF-8，数组切片传 (*const T, usize) 并在 Rust 侧先判空和检查长度（长度为 0 时也不要把 null 传给 slice::from_raw_parts）再构造切片；三、禁止 Panic 跨边界：在每个 extern "C" 入口函数外层使用 std::panic::catch_unwind 包裹业务逻辑，一旦捕获到 panic 立即转换为 C 风格的整型错误码或写入 thread-local 错误信息，严禁栈展开进入 C 栈帧；四、生命周期与线程安全：明确约定借用指针仅在当次同步调用期间有效，若 C 侧会跨线程并发调用同一个不透明句柄，Rust 侧的底层类型必须满足 Send + Sync（必要时内部用 Mutex/RwLock 保护）。',
  points:[
   '谁分配谁释放：用 Box::into_raw 移交不透明指针，并提供配套的 extern "C" 释放函数用 Box::from_raw 回收',
   'ABI 与类型校验：结构体标注 #[repr(C)]，用 CStr/CString 处理空结尾字符串，构造 slice 前严格判空和检查长度',
   '拦截 Panic：在 extern "C" 函数边界用 std::panic::catch_unwind 捕获 panic 并转为错误码，严禁跨 FFI 展开',
   '明确生命周期与并发契约：界定裸指针有效范围，跨线程访问的句柄在 Rust 内部确保 Send + Sync'
  ],
  explain:'牢记 FFI 四大铁律：Box::into_raw/from_raw 配对释放、#[repr(C)] 与空指针校验、catch_unwind 拦 panic、并发句柄保 Send + Sync。'
 },
 {
  id:'rust-f-28',
  type:'code',
  q:'实现一个支持 O(1) get 与 put 的简易 LRU 缓存 struct LruCache<K, V>（为简化代码并保证 100% Safe Rust，你可以使用 VecDeque<K> 记录访问顺序、HashMap<K, V> 存储键值，其中 K: Eq + std::hash::Hash + Clone；无需手写 unsafe 双向链表）：提供 new(cap: usize) -> Self、get(&mut self, key: &K) -> Option<&V>（命中时将该 key 移到最近使用端）和 put(&mut self, key: K, val: V)（若已存在则更新值并移到最近使用端；若不存在且容量已满则淘汰最久未使用的键后再插入）。',
  reference:'use std::collections::{HashMap, VecDeque};\nuse std::hash::Hash;\n\npub struct LruCache<K, V> {\n    cap: usize,\n    map: HashMap<K, V>,\n    order: VecDeque<K>,\n}\n\nimpl<K, V> LruCache<K, V>\nwhere\n    K: Eq + Hash + Clone,\n{\n    pub fn new(cap: usize) -> Self {\n        assert!(cap > 0);\n        Self {\n            cap,\n            map: HashMap::with_capacity(cap),\n            order: VecDeque::with_capacity(cap),\n        }\n    }\n\n    fn touch(&mut self, key: &K) {\n        if let Some(pos) = self.order.iter().position(|k| k == key) {\n            self.order.remove(pos);\n        }\n        self.order.push_back(key.clone());\n    }\n\n    pub fn get(&mut self, key: &K) -> Option<&V> {\n        if self.map.contains_key(key) {\n            self.touch(key);\n            self.map.get(key)\n        } else {\n            None\n        }\n    }\n\n    pub fn put(&mut self, key: K, val: V) {\n        if self.map.contains_key(&key) {\n            self.map.insert(key.clone(), val);\n            self.touch(&key);\n            return;\n        }\n        if self.map.len() >= self.cap {\n            if let Some(oldest) = self.order.pop_front() {\n                self.map.remove(&oldest);\n            }\n        }\n        self.order.push_back(key.clone());\n        self.map.insert(key, val);\n    }\n}',
  points:[
   '正确为 impl<K, V> 添加 K: Eq + Hash + Clone 的 Trait 约束',
   '在 get(&mut self, key: &K) 中注意借用顺序：先更新访问顺序队列 self.touch(key)，再返回 self.map.get(key) 以避免可变借用与返回引用冲突',
   '在 put 中区分“键已存在（原地更新并刷新顺序，不淘汰）”与“键不存在且已满（pop_front 淘汰最旧键）”两种情况',
   '维护好 map 与 order 队列中键的一致性'
  ],
  explain:'在 Rust 的 get(&mut self, key: &K) -> Option<&V> 中，如果先 let v = self.map.get(key) 再调用 self.touch(key)，会因为 self.map 被不可变借用而无法可变借用 self；先检查 contains_key 并完成 touch 更新，最后再返回 self.map.get(key)，就能优雅通过借用检查器。'
 },
 {
  id:'rust-f-29',
  type:'code',
  q:'使用 Tokio 实现一个带并发上限和单任务超时控制的异步批量执行函数：\npub async fn run_bounded<T, E, Fut>(tasks: Vec<Fut>, limit: usize, timeout_dur: std::time::Duration) -> Vec<Result<T, String>>\n其中 Fut: std::future::Future<Output = Result<T, E>> + Send + \'static，T: Send + \'static，E: std::fmt::Display + Send + \'static。要求：一、同时在运行的任务数不超过 limit（使用 tokio::sync::Semaphore）；二、每个任务若超过 timeout_dur 未完成则返回 Err("timeout".to_string())，任务自身报错 E 则转为 Err(e.to_string())；三、最终返回的 Vec 顺序必须与输入 tasks 的顺序完全一致。',
  reference:'use std::future::Future;\nuse std::sync::Arc;\nuse std::time::Duration;\nuse tokio::sync::Semaphore;\nuse tokio::time::timeout;\n\npub async fn run_bounded<T, E, Fut>(\n    tasks: Vec<Fut>,\n    limit: usize,\n    timeout_dur: Duration,\n) -> Vec<Result<T, String>>\nwhere\n    Fut: Future<Output = Result<T, E>> + Send + \'static,\n    T: Send + \'static,\n    E: std::fmt::Display + Send + \'static,\n{\n    let sem = Arc::new(Semaphore::new(limit.max(1)));\n    let mut handles = Vec::with_capacity(tasks.len());\n\n    for fut in tasks {\n        let sem_clone = Arc::clone(&sem);\n        let handle = tokio::spawn(async move {\n            let _permit = sem_clone.acquire_owned().await.unwrap();\n            match timeout(timeout_dur, fut).await {\n                Ok(Ok(val)) => Ok(val),\n                Ok(Err(e)) => Err(e.to_string()),\n                Err(_) => Err(String::from("timeout")),\n            }\n        });\n        handles.push(handle);\n    }\n\n    let mut results = Vec::with_capacity(handles.len());\n    for h in handles {\n        match h.await {\n            Ok(res) => results.push(res),\n            Err(join_err) => results.push(Err(join_err.to_string())),\n        }\n    }\n    results\n}',
  points:[
   '使用 Arc<Semaphore> 并通过 acquire_owned().await（或 acquire().await）将并发数限制在 limit 以内',
   '使用 tokio::time::timeout(timeout_dur, fut).await 为每个任务包裹超时控制，并区分超时 Err 与业务 Err',
   '通过 tokio::spawn 并发派发任务，并将 JoinHandle 按原序存入 Vec',
   '按 handles 的原始顺序依次 .await 收集结果，保证输出顺序与输入 tasks 一致'
  ],
  explain:'这是异步后端开发中最核心的并发控制模式：Semaphore 控制并发度防止打爆下游，timeout 防止慢请求无限挂起，按序收集 JoinHandle 保证结果顺序稳定。'
 },
 {
  id:'rust-f-30',
  type:'code',
  q:'使用 unsafe 裸指针操作，在不分配任何新堆内存的前提下，实现一个将可变切片拆分为左右两个不重叠可变切片的函数（即标准库 slice::split_at_mut 的核心实现）：\npub fn my_split_at_mut<T>(slice: &mut [T], mid: usize) -> (&mut [T], &mut [T])\n要求：一、在进入 unsafe 前用 assert!(mid <= slice.len()) 校验边界以保证安全抽象；二、使用 as_mut_ptr()、ptr.add(mid) 和 std::slice::from_raw_parts_mut 构造并返回左右两个可变切片；三、附上简短的 // SAFETY: 注释说明为什么这两个同时存在的可变引用不会触发未定义行为。',
  reference:'use std::slice;\n\npub fn my_split_at_mut<T>(slice: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {\n    let len = slice.len();\n    assert!(mid <= len, "mid out of bounds");\n    let ptr = slice.as_mut_ptr();\n\n    // SAFETY:\n    // 1. 已经通过 assert!(mid <= len) 保证了 0 <= mid <= len，ptr 与 ptr.add(mid) 均在原切片合法分配范围内且满足对齐；\n    // 2. 左半部分 [0..mid) 与右半部分 [mid..len) 内存区间互不重叠，因此同时返回两个 &mut [T] 完全满足 Rust 的别名独占规则，且生命周期绑定在输入 slice 上。\n    unsafe {\n        (\n            slice::from_raw_parts_mut(ptr, mid),\n            slice::from_raw_parts_mut(ptr.add(mid), len - mid),\n        )\n    }\n}',
  points:[
   '在 unsafe 块之前使用 assert!(mid <= len) 完成越界检查，确保对外构成 100% 安全抽象',
   '先取出 len = slice.len() 和 ptr = slice.as_mut_ptr()，避免在安全代码中对 slice 做两次可变借用',
   '在 unsafe 中使用 slice::from_raw_parts_mut(ptr, mid) 与 slice::from_raw_parts_mut(ptr.add(mid), len - mid) 构造左右切片',
   '编写清晰的 // SAFETY: 注释，阐明指针范围合法性以及左右区间互不重叠（disjoint）满足别名规则'
  ],
  explain:'借用检查器无法单凭安全代码理解 &mut slice[..mid] 和 &mut slice[mid..] 是互不重叠的两半，会认为对同一 slice 借用了两次 &mut；标准库正是通过先 assert!(mid <= len) 再用裸指针和 from_raw_parts_mut 封装出了这个经典的安全抽象。'
 }
];
