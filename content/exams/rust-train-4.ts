import type {AiQuiz} from '../journey';

// Rust「大神」阶段训练：Unsafe 边界与安全抽象、FFI 与宏编程、内存布局与 Niche 优化、生产工程与 Miri。
export const rustTrain4:AiQuiz[]=[
 {
  id:'rust-x4-1',
  q:'关于 Rust 中 unsafe 代码块的作用边界，下面哪项说法是正确的？',
  options:['进入 unsafe 块后会关闭借用检查器，允许同一变量同时存在多个 &mut 引用','只要函数内部包含 unsafe 代码块，该函数的对外签名也必须声明为 unsafe fn','unsafe 块主要解锁解引用裸指针、调用 unsafe 函数、访问可变静态变量等五种能力','在 unsafe 块中将不可变引用 &T 强转为可变引用 &mut T 并修改值是合法行为'],
  why:['unsafe 块绝不会关闭借用检查器，普通引用 &T 和 &mut T 在 unsafe 块内依然严格受借用与别名规则约束。','如果函数内部已经确保在所有可能输入下都满足安全不变式，完全可以对外暴露为普通的安全 fn（即安全抽象封装）。','','将 &T 非法强转为 &mut T 并写入（且内部无 UnsafeCell）属于直接的未定义行为（UB），无论是否包裹在 unsafe 中都违法。'],
  answer:2,
  explain:'unsafe 块不会关闭借用检查或放宽普通引用的别名规则，它仅仅允许执行五种编译器无法静态验证内存安全的操作：解引用裸指针、调用 unsafe 函数或方法、访问或修改可变静态变量、实现 unsafe trait、访问 union 的字段。'
 },
 {
  id:'rust-x4-2',
  q:'标准库的 slice.split_at_mut(mid) 需要把一个可变切片拆成左右两个互不重叠的可变子切片 (&mut [T], &mut [T])。为什么它不能直接用安全代码 (&mut self[..mid], &mut self[mid..]) 实现，而是要在内部封装 unsafe？',
  options:['借用检查器只看出对同一切片借用了两次 &mut，无法理解两段下标区间互不重叠','Rust 语法规定元组返回值中不能同时包含两个带有相同生命周期的可变引用','在安全代码中对可变切片做范围索引 &mut self[..mid] 会触发深拷贝并丢失原地址','slice::from_raw_parts_mut 会自动在运行时给左右两半加上互斥锁防止并发修改'],
  why:['','元组完全可以同时包含多个同生命周期的可变引用，只要它们借用自互不冲突的来源（如结构体不同字段）。','范围切片操作只是构造新的胖指针（地址 + 长度），不会发生元素深拷贝。','slice::from_raw_parts_mut 只是用裸指针和长度直接拼装切片胖指针，没有任何运行时锁开销。'],
  answer:0,
  explain:'借用检查器把整个切片视为单一实体，无法在编译期证明 `[..mid]` 与 `[mid..]` 下标区间不相交；标准库通过先做 `assert!(mid <= len)` 边界检查，再用 `as_mut_ptr()` 与 `slice::from_raw_parts_mut` 构造两段不重叠切片，将 unsafe 安全封装在安全函数内部。'
 },
 {
  id:'rust-x4-3',
  q:'在 Rust 2024 版次（Edition 2024）中，关于 FFI 外部块与导出符号属性的语法要求，下面哪项说法正确？',
  options:['extern "C" 块被彻底废除，调用 C 函数需改用 std::ffi::call_c 宏','extern "C" 块内声明的所有函数都会被编译器自动视为 safe fn 直接调用','#[no_mangle] 可以直接裸写，但 #[repr(C)] 必须改写为 #[unsafe(repr(C))]','声明外部块需写成 unsafe extern "C"，且影响符号的属性需写成 #[unsafe(no_mangle)]'],
  why:['Rust 2024 没有废除 extern 块，而是要求在声明外部块时显式标注 unsafe 关键字。','外部块中的函数默认仍是 unsafe，只有在 unsafe extern "C" 块中经程序员确认无额外前置条件后才可显式标为 safe fn。','#[repr(C)] 只规定类型内存布局，不破坏全局符号安全性，仍写成 #[repr(C)]；而 #[no_mangle] 因可能导致全局符号冲突在 Rust 2024 中需写成 #[unsafe(no_mangle)]。',''],
  answer:3,
  explain:'Rust 2024 版次强化了 FFI 边界的安全审计：外部块必须声明为 `unsafe extern "C" { ... }`（表示声明者担保签名与 C 端 ABI 一致），且可能引发链接符号冲突的属性必须写为 `#[unsafe(no_mangle)]` 或 `#[unsafe(export_name = "...")]`。'
 },
 {
  id:'rust-x4-4',
  type:'multi',
  q:'关于声明宏 macro_rules! 与过程宏（Procedural Macros），下面哪些说法正确？（多选）',
  options:['macro_rules! 具备卫生性（hygiene），宏内定义的局部标识符默认不会与调用处的同名变量冲突','过程宏可以直接定义在业务二进制 crate 的 src/main.rs 中并供同一文件直接调用','过程宏包括派生宏 #[derive(...)]、属性宏和类函数宏三类，运行在编译期并处理 TokenStream','在 macro_rules! 中，$x:ident 匹配任意算术表达式，$x:expr 只匹配单个变量名或函数名'],
  why:['','过程宏必须定义在 Cargo.toml 中配置了 `proc-macro = true` 的独立专用库 crate 中，不能直接写在普通 bin crate 的 main.rs 里。','','恰好写反了：$x:ident 只匹配标识符（变量名、函数名、类型名），而 $x:expr 匹配各类完整的 Rust 表达式。'],
  answers:[0,2],
  explain:'macro_rules! 通过模式匹配与卫生性避免局部变量名污染；过程宏必须放在独立的 `proc-macro = true` crate 中，接收并返回 TokenStream，分为派生宏、属性宏和类函数宏三类。'
 },
 {
  id:'rust-x4-5',
  type:'judge',
  q:'在 Rust 中，只要把普通引用转换为裸指针（例如 `let p = &x as *const i32;` 或 `let p = &raw const x;`），该语句本身就必须放在 `unsafe {}` 代码块中才能通过编译。',
  answer:false,
  explain:'在安全代码中创建、传递或比较裸指针是完全合法的，不需要 `unsafe` 块（仅仅拿着一个内存地址不会破坏内存安全）；只有当真正解引用裸指针（`*p`）去读写内存时，才必须放在 `unsafe {}` 块中。'
 },
 {
  id:'rust-x4-6',
  q:'在 64 位平台上运行下面代码，结构体 DefaultLayout 与 CLayout 的字节大小分别是多少？',
  code:'use std::mem::size_of;\n\nstruct DefaultLayout {\n    a: u8,\n    b: u32,\n    c: u8,\n}\n\n#[repr(C)]\nstruct CLayout {\n    a: u8,\n    b: u32,\n    c: u8,\n}\n\nfn main() {\n    println!("{} {}", size_of::<DefaultLayout>(), size_of::<CLayout>());\n}',
  options:['6 6','8 12','12 12','12 8'],
  why:['两个结构体都包含对齐要求为 4 字节的 u32 字段，整体大小必须是最大对齐值 4 的整数倍，不可能是 6。','','默认 repr(Rust) 允许编译器自动重排字段顺序，把 b: u32 放在前面、两个 u8 紧随其后加上 2 字节填充，总大小优化为 8 字节。','#[repr(C)] 严格按字段声明顺序排列：a(1)+padding(3)+b(4)+c(1)+padding(3) = 12 字节，比重排后的 DefaultLayout 更大。'],
  answer:1,
  explain:'默认 `repr(Rust)` 不承诺保持字段声明顺序，编译器会将 `DefaultLayout` 重排为 `[b: u32, a: u8, c: u8, pad: 2B]`，仅占 8 字节；而 `#[repr(C)]` 严格固定字段顺序并与 C ABI 对齐，在 `a` 和 `c` 后各插入 3 字节填充，共占 12 字节。'
 },
 {
  id:'rust-x4-7',
  q:'在 64 位平台上（指针占 8 字节），下面这行代码打印的三个数字依次是多少？',
  code:'use std::mem::size_of;\nuse std::num::NonZeroU64;\n\nfn main() {\n    println!(\n        "{} {} {}",\n        size_of::<Option<&u64>>(),\n        size_of::<Option<NonZeroU64>>(),\n        size_of::<[(); 1024]>(),\n    );\n}',
  options:['16 16 1024','8 16 0','16 8 0','8 8 0'],
  why:['&u64 和 NonZeroU64 都具备非零生态位（Niche），包一层 Option 不会膨胀到 16 字节；且单元类型 () 是零大小类型（ZST）。','NonZeroU64 明确排除了数值 0，编译器直接用全 0 位模式表示 Option::None，因此 Option<NonZeroU64> 也只占 8 字节。','引用 &u64 在合法状态下不会为空指针，Option<&u64> 用空指针 0 表示 None，同样只占 8 字节。',''],
  answer:3,
  explain:'得益于空位优化（Niche Optimization），`&u64` 和 `NonZeroU64` 的非法全 0 位模式都被编译器直接复用为 `Option::None` 的判别值，无需额外字节存储 tag，大小仍为 8 字节；而 `()` 是零大小类型（ZST），1024 个 `()` 组成的数组 `[(); 1024]` 在内存中占用依然是 0 字节。'
 },
 {
  id:'rust-x4-8',
  q:'在大型 Rust 生产项目中组合使用 thiserror 与 anyhow 进行错误处理时，社区最推崇的分工模式是什么？',
  options:['基础库用 thiserror 定义结构化错误枚举供调用方匹配，上层应用用 anyhow 统一聚合错误并附加业务上下文','基础库和上层应用统一把所有函数返回类型都写成 anyhow::Result<T>，避免定义任何错误枚举','基础库用 anyhow::Error 擦除所有底层错误类型，上层应用再用 thiserror 为 main 函数逐个定制枚举','thiserror 仅用于异步 Tokio 项目的错误转换，anyhow 仅用于单线程命令行同步工具'],
  why:['','如果对外发布的基础库只返回擦除类型的 anyhow::Error，调用方将无法通过模式匹配精确区分和处理特定错误分支。','恰好颠倒了两者定位：库边界需要精确、可穷举匹配的强类型错误枚举，应用顶层才需要擦除具体类型并附带调用链上下文。','thiserror 和 anyhow 与同步还是异步运行时无关，它们按“库（Library）与应用程序（Application）”的职责边界分工。'],
  answer:0,
  explain:'“Library 用 thiserror，Application 用 anyhow”是 Rust 工程界黄金准则：库需要为下游调用者提供可按变体 match 的精确错误类型（通过 `#[derive(thiserror::Error)]` 自动生成 Display/Error/From）；应用层更关心错误传播效率与排查链路（通过 `anyhow::Result` 与 `.context("...")`）。'
 },
 {
  id:'rust-x4-9',
  type:'multi',
  q:'关于 Cargo Workspace、条件编译特性（features）以及生态库 serde / tracing，下面哪些说法正确？（多选）',
  options:['同一 Cargo Workspace 下的各成员 crate 共用根目录的 Cargo.lock 与 target 构建目录','Cargo 的 feature 应具备可加性（additive），启用它不应删除公开 API 或与另一特性互斥','serde 反序列化结构体配合 #[serde(borrow)]，可让 &str 字段零拷贝借用原始输入缓冲区','tracing 库仅支持向标准输出打印单行纯文本日志，无法记录跨异步任务挂起与恢复的结构化 Span 调用上下文'],
  why:['','','','tracing 的核心优势正是结构化事件与具有生命周期的 Span，配合 #[tracing::instrument] 或 .instrument(span) 能完整追踪异步 Future 在多次 poll 之间的上下文。'],
  answers:[0,1,2],
  explain:'Workspace 共享 Cargo.lock 与 target 避免重复编译；Cargo 会对依赖图中同一 crate 的所有启用 features 求并集，故 feature 必须满足可加性；serde 的 `#[serde(borrow)]` 支持零拷贝反序列化；tracing 专为异步与结构化可观测性设计。'
 },
 {
  id:'rust-x4-10',
  type:'judge',
  q:'普通的 `cargo test` 即使测试通过，也无法证明 `unsafe` 代码块中没有未定义行为（UB）；而使用 `cargo +nightly miri test` 可以在抽象机解释执行下检测出越界指针访问、读取未初始化内存以及违反借用栈（Stacked/Tree Borrows）别名规则等深层 UB。',
  answer:true,
  explain:'`cargo test` 只检查编译后的机器码在当前优化级别和平台上有没有碰巧崩溃或断言失败，许多 UB（如悬垂指针读取、非法可变别名）在普通测试中可能看似“运行正常”；Miri 则在 Rust 抽象机层面跟踪每个字节的初始化状态与指针来源标签（Provenance），是验证 unsafe 代码健全性的必备利器。'
 },
 {
  id:'rust-x4-11',
  type:'fill',
  q:'使用 Newtype 模式定义单字段包装结构体（如 `struct UserId(u64);`）并跨越 FFI 边界或做安全类型转换时，若要编译器保证该包装类型与内部唯一非零大小字段拥有完全相同的内存布局和函数调用 ABI，应添加属性 `#[repr(＿)]`。',
  accepted:['transparent'],
  explain:'`#[repr(transparent)]` 应用于只含单个非零大小字段（可附带任意个对齐为 1 的零大小 PhantomData 字段）的结构体或单变体枚举，保证其内存表示和 ABI 与被包装的内部类型丝毫不差。'
 },
 {
  id:'rust-x4-12',
  type:'short',
  q:'什么是安全抽象的“健全性（Soundness）”？为什么在 unsafe 代码中通过裸指针同时构造出两个指向同一元素的可变引用 `(&mut a, &mut b)`，哪怕后续没有并发写入，也直接构成未定义行为（UB）？编写生产级 unsafe 代码时应遵循哪些工程规范？',
  reference:'1. 健全性（Soundness）含义：如果一个对外未标记 `unsafe` 的普通安全函数内部封装了 `unsafe` 块，那么无论外部调用者在安全 Rust 规则下传入什么刁钻的参数组合（如越界下标、空切片、极端整数、会 panic 的闭包），该函数都绝不能触发未定义行为（UB）。反之，若安全代码能诱发内部 UB，则该抽象就是不健全的（Unsound）。\n2. 为什么两个重叠的 `&mut T` 直接是 UB：Rust 语言规范将 `&mut T` 定义为“独占引用（unique/exclusive reference）”，LLVM 后端会基于 `noalias` 属性对所有 `&mut` 参数做激进的寄存器缓存、死存储消除和指令重排优化。一旦在同一时刻制造出两个指向重叠内存的活跃 `&mut T`，无论当时有没有写内存，就已经违背了语言与优化器的核心前置假设，立即触发 UB。\n3. 生产级 unsafe 工程规范：\n- 最小化 unsafe 范围，并在进入 unsafe 前用安全代码（如 `assert!`）校验所有前置条件（边界、对齐、非空）；\n- 在每个 `unsafe` 块上方编写 `// SAFETY:` 注释，逐条论证为何此处满足被调用 unsafe 操作的安全契约；\n- 若对外暴露 `unsafe fn`，在文档注释中补充 `# Safety` 章节，明确调用方必须遵守的不变式；\n- 配合 `cargo +nightly miri test` 与 `cargo clippy` 检验是否存在别名违规或悬垂访问。',
  points:['准确定义健全性（Soundness）：安全函数无论接收何种合法安全输入，内部封装的 unsafe 都不能触发 UB','说明 &mut T 的语义是严格独占（noalias），同时存在两个指向同一内存的活跃 &mut T 本身即直接违反别名规则触发 UB','提出前置条件校验规范：在进入 unsafe 块前先做边界、非空、对齐等检查，将最小化的 unsafe 封装在安全接口内','提出文档与工具规范：为 unsafe 块编写 // SAFETY: 注释（unsafe fn 写 # Safety 文档），并用 Miri 检测 UB'],
  explain:'记住 Rust 对 `&mut` 的铁律：它叫“独占引用”而不只是“可写引用”，哪怕只读不写，只要两个 `&mut` 在同一时刻别名重叠就是立即 UB。'
 },
 {
  id:'rust-x4-13',
  type:'short',
  q:'请对比 Rust 中默认的 `repr(Rust)`、`#[repr(C)]` 与 `#[repr(transparent)]` 三种类型布局策略在字段重排、填充对齐与典型用途上的区别，并解释编译器是如何利用空位优化（Niche Optimization）让 `Option<&T>` 和 `Option<Box<T>>` 实现零额外空间开销的。',
  reference:'1. 三种内存布局对比：\n- 默认 `repr(Rust)`：编译器不保证字段按声明顺序排列，会自动按对齐要求重排字段以减少对齐填充（padding）浪费，并支持空位优化；适用于绝大部分纯 Rust 内部数据结构，不可直接用于 FFI 或跨版本二进制协议。\n- `#[repr(C)]`：严格保持字段声明顺序，按 C 语言 ABI 规则插入对齐填充；适用于与 C/C++ 进行 FFI 互操作、内存映射硬件寄存器或固定二进制协议结构。\n- `#[repr(transparent)]`：仅用于只有一个非零大小字段（及可选的 ZST 如 PhantomData）的 Newtype 包装类型，保证包装前后的内存布局与函数调用寄存器传递 ABI 完全一致；常用于 FFI 强类型句柄包装。\n2. 空位优化（Niche Optimization）原理：\n普通枚举需要额外的判别标签（discriminant tag）字节加上对齐填充；但对于 `&T`、`Box<T>`、`NonNull<T>`、`NonZeroU32` 等类型，其合法值集合天然排除了某些位模式（例如引用和 Box 的底层指针在合法状态下绝不可能是全 0 空指针）。编译器发现这个“非法位模式空位（Niche）”后，直接用全 0 表示 `Option::None`，用非 0 地址表示 `Option::Some(ptr)`，从而省去独立的 tag 字段，使 `size_of::<Option<&T>>() == size_of::<&T>()`。',
  points:['说明默认 repr(Rust) 允许编译器自动重排字段以压缩对齐填充（padding），但二进制布局不稳定','说明 #[repr(C)] 严格保持字段声明顺序并遵循 C ABI 对齐规则，专用于 FFI 与固定二进制布局','说明 #[repr(transparent)] 用于单非零大小字段的 Newtype 包装，保证与内部字段的内存和调用 ABI 完全一致','解释 Niche 优化：利用 &T / Box<T> 合法值绝不为 null（全 0）的非法位模式直接编码 Option::None，省去额外 tag 字节'],
  explain:'理解字段重排与 Niche 优化，就能明白为什么在 Rust 中大量使用 Newtype 和 Option<&T> / Option<Box<T>> 几乎不会带来任何额外的内存体积负担。'
 },
 {
  id:'rust-x4-14',
  type:'code',
  q:'完成两项底层与宏编程任务并写在同一个可运行程序中：\n1. 用 `macro_rules!` 编写声明宏 `svec!`，支持传入零个或多个表达式（允许末尾带可选逗号），把每一项通过 `.to_string()` 转为 `String` 并返回 `Vec<String>`；\n2. 编写安全抽象函数 `fn pick_two_mut<T>(slice: &mut [T], i: usize, j: usize) -> Option<(&mut T, &mut T)>`：当 `i == j` 或任一下标越界时返回 `None`，否则在内部通过裸指针（`as_mut_ptr` 与 `unsafe { &mut *ptr.add(...) }`）并附上 `// SAFETY:` 注释，安全返回分别指向 `slice[i]` 和 `slice[j]` 的两个可变引用；最后在 `main` 中验证两者。',
  reference:'macro_rules! svec {\n    ($($x:expr),* $(,)?) => {{\n        let mut temp = Vec::new();\n        $(temp.push(($x).to_string());)*\n        temp\n    }};\n}\n\nfn pick_two_mut<T>(slice: &mut [T], i: usize, j: usize) -> Option<(&mut T, &mut T)> {\n    if i == j || i >= slice.len() || j >= slice.len() {\n        return None;\n    }\n    let ptr = slice.as_mut_ptr();\n    // SAFETY: 已在上方校验 i < slice.len()、j < slice.len() 且 i != j，\n    // 因此 ptr.add(i) 与 ptr.add(j) 均落在同一分配对象的合法边界内，且指向互不重叠的两个独立元素。\n    unsafe {\n        Some((&mut *ptr.add(i), &mut *ptr.add(j)))\n    }\n}\n\nfn main() {\n    let mut words = svec!["rust", "unsafe", "macro",];\n    if let Some((first, third)) = pick_two_mut(&mut words, 0, 2) {\n        first.push_str("-2024");\n        third.push_str("-rules");\n    }\n    assert!(pick_two_mut(&mut words, 1, 1).is_none());\n    assert!(pick_two_mut(&mut words, 0, 99).is_none());\n    println!("{:?}", words);\n}',
  points:['macro_rules! 使用 $($x:expr),* $(,)? 匹配零或多个表达式并兼容尾随逗号，对每项调用 .to_string() 构造 Vec<String>','pick_two_mut 在进入 unsafe 前严格校验 i != j 且 i < slice.len()、j < slice.len()，违例时返回 None 以保证健全性','使用 slice.as_mut_ptr() 与 ptr.add(i)/ptr.add(j) 在 unsafe 块中构造两个不重叠的 &mut T，并附上清晰的 // SAFETY: 注释','main 函数同时测试 svec! 宏以及 pick_two_mut 的正常修改、相同下标（i == j）与越界下标边界场景'],
  explain:'如果漏掉 `i == j` 的前置检查，调用方传入相同下标就能拿到指向同一元素的两个 `&mut T`，瞬间破坏独占别名规则导致 UB——这就是安全抽象必须先守住不变量的原因。'
 }
];
