import type {AiLevel} from '../journey';

// Rust 大神档（第 14–15 关）：Unsafe Rust、FFI、宏编程，以及内存布局、主流生态与工程实战。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
export const rustUnsafeMacros:AiLevel={
 id:'rust-unsafe-macros',
 title:'Unsafe Rust、FFI 与宏编程',
 summary:'unsafe 五种超能力与安全抽象封装、裸指针与 FFI、声明宏 macro_rules! 与过程宏原理',
 lessons:[
  {
   title:'为什么存在 unsafe：编译器看不穿的底线',
   body:'Rust 的静态分析本质上是“保守”的：只要编译器无法在编译期 100% 证明一段代码内存安全，它就会拒绝编译——哪怕这段代码在逻辑上其实是正确的。系统编程中总有一些场景超出了编译器的证明能力：直接和操作系统或硬件寄存器对话、调用 C 语言库（FFI）、手写底层数据结构（如双向链表、自定义内存分配器），或是把一个可变切片拆成两段互不重叠的可变切片。\n为此，Rust 提供了 unsafe 关键字，让程序员把一小块代码圈出来，向编译器立下军令状：“这里的内存安全不变式由我来人工证明和守住。”\n一个极容易踩坑的误区：unsafe 并不会关闭借用检查器，也不会关闭类型检查或数组越界检查！在 unsafe 代码块里，普通引用 &T 和 &mut T 依然受到全部所有权与生命周期规则的约束；unsafe 仅仅是解锁了五种特定的底层操作能力。\n此外要注意区分两种语义：unsafe { ... } 代码块表示“我已核实内部满足所有安全前提”；而 unsafe fn / unsafe trait 表示“这里存在编译器查不出来的安全前提，调用方或实现方必须自行保证”。',
   code:`let mut num = 5;
unsafe {
    let r1 = &mut num;
    // let r2 = &mut num;  即使在 unsafe 里，这行依然会被借用检查器报错
    *r1 += 1;
}
println!("num = {num}");`,
   explain:[
    {at:'let mut num = 5;',text:'声明一个普通的可变整数。'},
    {at:'unsafe {',text:'进入 unsafe 代码块：这里仅仅解锁五种特定底层操作，不会关闭借用检查器。'},
    {at:'let r1 = &mut num;',text:'创建指向 num 的可变引用。如果紧接着再建第二个 &mut num（被注释掉的那行），即使身处 unsafe 块里一样会编译报错。'},
    {at:'*r1 += 1;',text:'通过普通可变引用把 num 改成 6，解引用普通引用本身甚至不需要 unsafe。'},
    {at:'println!("num = {num}");',text:'离开 unsafe 块后打印 6，说明普通安全规则在块内外一视同仁。'}
   ]
  },
  {
   title:'unsafe 的五种超能力',
   body:'把代码写进 unsafe 块后，你精确地只多出以下五种“超能力”（超出这五项的普通规则依然严格生效）：\n一、解引用裸指针（*const T 和 *mut T）：直接读写某个内存地址上的值；\n二、调用 unsafe 函数或方法：包括标准库里的底层函数（如 slice::from_raw_parts_mut）以及外部 FFI 函数；\n三、访问或修改可变静态变量（static mut）：全局可变状态在多线程下极易引发数据竞争。特别提醒：Rust 2024 版次已经直接禁止对 static mut 创建普通引用 & 或 &mut，工程中应优先使用原子类型（如 AtomicUsize）或 Mutex；确需访问时也要配合 &raw const / &raw mut 裸指针；\n四、实现 unsafe trait：当 trait 本身带有编译器无法检查的并发或内存契约时（例如手工为包含裸指针的类型写 unsafe impl Send / Sync），需要由实现者承担安全责任；\n五、访问 union（联合体）的字段：union 的所有字段共享同一块内存，编译器不知道当前里面存的是哪一个字段，读取错误字段会读到无意义比特甚至触发未定义行为（UB），所以读字段需要 unsafe（写 Copy 字段不需要）。',
   code:`unsafe fn dangerous_add(ptr: *const i32, offset: isize) -> i32 {
    unsafe { *ptr.offset(offset) }
}

union RawValue {
    i: i32,
    f: f32,
}

unsafe trait TrustedMarker {}
unsafe impl TrustedMarker for RawValue {}

let val = RawValue { i: 42 };
let n = unsafe { val.i };
println!("union 里的整数：{n}");`,
   explain:[
    {at:'unsafe fn dangerous_add',text:'声明一个 unsafe 函数：它要求调用方自己保证 ptr 加上 offset 后仍指向有效、已初始化且对齐的 i32 内存。'},
    {at:'unsafe { *ptr.offset(offset) }',text:'从 Rust 2024 起，即使在 unsafe fn 函数体内部，执行 unsafe 操作也必须显式写出 unsafe { ... } 块，方便审计每一处危险点。'},
    {at:'union RawValue {',to:'f: f32,',text:'定义联合体：i 和 f 共用同一段 4 字节内存，不会像 enum 那样自动记录当前存放的是哪一种变体。'},
    {at:'unsafe trait TrustedMarker {}',to:'unsafe impl TrustedMarker for RawValue {}',text:'声明并实现一个 unsafe trait：实现方必须写 unsafe impl，表明自己核实过该类型满足 trait 的安全契约。'},
    {at:'let val = RawValue { i: 42 };',text:'初始化 union 的 i 字段（写入本身安全）。'},
    {at:'let n = unsafe { val.i };',text:'读取 union 字段必须放进 unsafe 块，因为编译器无法验证刚才写进去的是 i 而不是 f。'},
    {at:'println!("union 里的整数：{n}");',text:'刚才确实写入了 i，所以这里读取是安全的，打印 42。'}
   ]
  },
  {
   title:'裸指针 *const T 与 *mut T：创建安全，解引用危险',
   body:'裸指针（Raw Pointer）有两种：不可变裸指针 *const T 和可变裸指针 *mut T（这里的星号是类型名的一部分，不是解引用符号）。它和普通引用 &T / &mut T 的核心区别在于：\n一、允许忽略借用规则：可以同时存在指向同一地址的 *const T 和 *mut T，或者多个 *mut T；\n二、不保证指向有效内存：它可以是空指针（std::ptr::null()），可以是悬垂地址，甚至可以不满足对齐要求；\n三、没有生命周期约束，也不会自动调用 Drop 清理资源。\n特别容易考到的知识点：创建裸指针本身完全不需要 unsafe！你可以用 Rust 2024 推荐的 &raw const x / &raw mut x（或者 &x as *const T）在安全代码里放心造出裸指针，只有真正去解引用（*p）读写内存时才必须进入 unsafe 块。\n为什么要警惕“未定义行为”（Undefined Behavior，简称 UB）？即使在 unsafe 里，也绝不能制造同时存活、且指向重叠内存的两个 &mut T（或同时存在 &T 与 &mut T），也不能解引用空指针、悬垂指针或未对齐指针。Rust 编译器会把 &mut 的独占保证交给底层优化器（LLVM noalias）做激进优化；一旦你破坏了这条前提，结果不是报一个友好的运行时错误，而是可能被编译成完全错乱的机器码，悄悄损坏数据。',
   code:`let mut score = 80;
let r_const: *const i32 = &raw const score;
let r_mut: *mut i32 = &raw mut score;

unsafe {
    *r_mut += 20;
    println!("通过裸指针读到：{}", *r_const);
}`,
   explain:[
    {at:'let mut score = 80;',text:'在栈上声明一个普通的可变整数。'},
    {at:'let r_const: *const i32 = &raw const score;',to:'let r_mut: *mut i32 = &raw mut score;',text:'用 &raw const 和 &raw mut 同时创建指向同一地址的不可变与可变裸指针。注意这两行不在 unsafe 块里——创建裸指针是安全的，而且直接取地址不会先生成临时引用。'},
    {at:'unsafe {',text:'接下来要解引用裸指针读写内存，必须进入 unsafe 块。'},
    {at:'*r_mut += 20;',text:'通过可变裸指针原地修改 score 为 100。这里没有同时制造出冲突的 &mut 引用，且 score 依然有效、对齐。'},
    {at:'println!("通过裸指针读到：{}", *r_const);',text:'写完后再通过不可变裸指针读取，得到 100。'}
   ]
  },
  {
   title:'最小化 unsafe 与安全抽象封装',
   body:'写 Unsafe Rust 有一条最高工程原则：绝不让 unsafe 满天飞，而是把它严严实实地圈在最小范围的内部实现里，对外暴露一个普通的安全函数或安全类型（即“安全抽象”）。\n标准库里的 slice::split_at_mut 就是最经典的教科书案例。想把一个 &mut [T] 按下标 mid 拆成左右两段可同时修改的切片，直接写 (&mut s[..mid], &mut s[mid..]) 会被借用检查器拒绝——编译器只知道你对同一个切片 s 做了两次可变借用，看不出 [..mid] 和 [mid..] 互不重叠。\n于是标准库在内部用少量 unsafe 接管，同时守住安全抽象的三条铁律：\n一、满足健壮性（Soundness）：无论外部安全代码传入什么参数，都不可能触发 UB。所以进入 unsafe 前必须先用 assert!(mid <= len) 拦截越界下标；\n二、先取长度再取裸指针：在调用 as_mut_ptr() 之后不再通过原引用访问切片，避免违反借用模型（Stacked Borrows）导致裸指针失效；\n三、写清 // SAFETY: 注释：在每个 unsafe 块正上方逐条写明“为什么这里不会空指针、不会越界、不会内存重叠”，方便自己和评审者逐条核对。',
   code:`use std::slice;

fn split_at_mid<T>(s: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    let len = s.len();
    assert!(mid <= len);
    let ptr = s.as_mut_ptr();
    // SAFETY: ptr 非空且对齐；assert! 保证了 mid <= len，
    // 两段区间 [0..mid) 与 [mid..len) 不重叠且都在合法范围内。
    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}`,
   explain:[
    {at:'use std::slice;',text:'引入标准库 slice 模块，用来调用底层的 from_raw_parts_mut。'},
    {at:'fn split_at_mid<T>',text:'函数签名本身不带 unsafe：对调用方来说这是一个完全安全的普通函数，生命周期省略规则会自动把两个输出切片的生命周期绑定到输入 s。'},
    {at:'let len = s.len();',to:'assert!(mid <= len);',text:'先读取长度并用 assert! 做运行时边界检查：一旦调用方传入越界的 mid，程序会安全地 panic，而绝不会进入 unsafe 制造越界 UB。'},
    {at:'let ptr = s.as_mut_ptr();',text:'获取切片首元素的可变裸指针。之后不再触碰 s，保持指针权限干净。'},
    {at:'unsafe {',to:'slice::from_raw_parts_mut(ptr.add(mid), len - mid),',text:'把裸指针按 [0..mid) 和 [mid..len) 构造成两段互不重叠的可变切片。ptr.add(mid) 按元素个数（而非字节数）安全偏移。'}
   ]
  },
  {
   title:'动手试试：安全封装裸指针实现 split_mut_two',
   body:'亲手实现一个符合 Rust 2024 规则、零未定义行为的安全抽象 split_mut_two，把一个可变数组切片一分为二，同时修改左半段和右半段的元素，再观察原数组的变化。\n注意代码里先保存 len、用 assert! 校验边界、再调用 as_mut_ptr() 的顺序——这是标准库与 Miri 检测器共同认可的标准写法。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把调用处的分割点 2 分别改成边界值 0 和 5，运行确认不越界；再试着改成 6，观察 assert! 如何在进入 unsafe 之前安全地拦截越界调用。'
    ],
    expect:'左半段：[15, 20]\n右半段：[30, 40, 100]\n原数组：[15, 20, 30, 40, 100]'
   },
   code:`use std::slice;

fn split_mut_two<T>(values: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    let len = values.len();
    assert!(mid <= len, "分割位置 {mid} 超出切片长度 {len}");
    let ptr = values.as_mut_ptr();
    // SAFETY:
    // 1. ptr 来自有效的可变切片 values，非空且满足对齐要求；
    // 2. 已通过 assert! 确保 mid <= len，两段区间 [0..mid) 与 [mid..len) 不重叠且都在合法范围内；
    // 3. 返回的两个可变切片生命周期绑定到输入 values，原切片在它们存活期间不可再访问。
    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut nums = [10, 20, 30, 40, 50];
    let (left, right) = split_mut_two(&mut nums, 2);
    left[0] += 5;
    right[2] *= 2;
    println!("左半段：{left:?}");
    println!("右半段：{right:?}");
    println!("原数组：{nums:?}");
}`,
   explain:[
    {at:'use std::slice;',text:'引入 std::slice 以使用 from_raw_parts_mut。'},
    {at:'fn split_mut_two<T>',text:'对外暴露的安全函数，泛型 T 让它适用于任意元素类型的切片。'},
    {at:'let len = values.len();',text:'在取裸指针之前先把长度读出来。'},
    {at:'assert!(mid <= len',text:'安全防线：如果 mid > len 立即 panic，保证绝不把非法参数带进 unsafe 块。'},
    {at:'let ptr = values.as_mut_ptr();',text:'取出底层连续内存的可变裸指针，之后不再直接访问 values。'},
    {at:'unsafe {',to:'slice::from_raw_parts_mut(ptr.add(mid), len - mid),',text:'把 [0..mid) 和 [mid..len) 分别包装成两个互不重叠的 &mut [T]；即使 mid 等于 0 或 len，from_raw_parts_mut 对非空对齐指针也是完全合法的。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let mut nums = [10, 20, 30, 40, 50];',text:'创建包含 5 个整数的可变数组。'},
    {at:'let (left, right) = split_mut_two(&mut nums, 2);',text:'从下标 2 切开：left 对应 [10, 20]，right 对应 [30, 40, 50]，两者可同时持有并独立修改。'},
    {at:'left[0] += 5;',to:'right[2] *= 2;',text:'同时修改两段切片：10 变成 15，50 变成 100，没有任何内存拷贝。'},
    {at:'println!("左半段：{left:?}");',to:'println!("右半段：{right:?}");',text:'打印修改后的左半段和右半段。这行之后 left 和 right 不再使用，对 nums 的可变借用随之结束。'},
    {at:'println!("原数组：{nums:?}");',text:'可变借用结束后可以安全读取原数组，看到两处原地修改都已生效。'}
   ]
  },
  {
   title:'FFI 跨语言互操作：与 C 代码对话',
   body:'FFI（Foreign Function Interface，外部函数接口）让 Rust 可以直接调用 C/C++、操作系统内核 API，也能把 Rust 编译成动态库/静态库给 C、Python、Go 等语言调用。跨语言调用的关键是双方遵守同一套 ABI（应用二进制接口，最通用的是 "C" ABI），约定好参数放哪个寄存器、结构体怎么排版。\nRust 2024 版次在 FFI 安全性上引入了两项重要的语法要求：\n一、unsafe extern "C"：声明外部函数块必须在 extern 前加上 unsafe（因为如果函数签名写错了，链接和调用就会直接 UB）。块里的函数默认仍是 unsafe，只有你确定它对所有合法 Rust 参数都安全时才可额外标为 safe fn；\n二、#[unsafe(no_mangle)]：把 Rust 函数导出给 C 调用时，需要禁止编译器改写函数名（name mangling）。因为跨编译单元符号重名会导致 UB，Rust 2024 要求写作 #[unsafe(no_mangle)]。\n跨边界传递数据时还有两个必知工具：\n一、#[repr(C)]：让 Rust 结构体的字段顺序和对齐方式与 C 语言完全一致，否则 Rust 默认可能重排字段；\n二、std::ffi::{CString, CStr}：Rust 字符串带长度、不以 \\0 结尾且中间可以含 \\0；C 字符串（const char*）靠末尾 \\0 判断结束。传给 C 用 CString（自动补 \\0 并拒绝中间含 \\0），接收 C 传来的指针用 CStr 借用并转回 &str。\n实际工程中手写大量 C 声明既慢又易错，通常用 bindgen 从 C 头文件自动生成 Rust 绑定，用 cbindgen 把 Rust 接口导出成 C 头文件。',
   code:`use std::ffi::{CStr, CString, c_char, c_int};

#[repr(C)]
pub struct Point {
    pub x: c_int,
    pub y: c_int,
}

unsafe extern "C" {
    fn strlen(s: *const c_char) -> usize;
}

#[unsafe(no_mangle)]
pub extern "C" fn add_points(a: Point, b: Point) -> Point {
    Point { x: a.x + b.x, y: a.y + b.y }
}

fn demo_ffi() {
    let c_str = CString::new("hello").expect("不含内部空字节");
    let len = unsafe { strlen(c_str.as_ptr()) };
    let back = unsafe { CStr::from_ptr(c_str.as_ptr()) }.to_str().unwrap();
    println!("{back} 的 C 长度是 {len}");
}`,
   explain:[
    {at:'use std::ffi::{CStr, CString, c_char, c_int};',text:'引入与 C 互通的标准类型：CString/CStr 处理以 \\0 结尾的字符串，c_char/c_int 对应当前平台 C 语言的 char 和 int。'},
    {at:'#[repr(C)]',to:'pub y: c_int,',text:'用 #[repr(C)] 固定结构体内存布局为 C 风格，确保 Rust 与 C 看到的字段偏移完全一致。'},
    {at:'unsafe extern "C" {',to:'fn strlen(s: *const c_char) -> usize;',text:'Rust 2024 要求外部块写 unsafe extern "C"：这里声明了 C 标准库的 strlen 函数。'},
    {at:'#[unsafe(no_mangle)]',to:'Point { x: a.x + b.x, y: a.y + b.y }',text:'导出给 C 调用的 Rust 函数：#[unsafe(no_mangle)] 保留符号名 add_points，extern "C" 指定采用 C 调用约定。'},
    {at:'fn demo_ffi() {',text:'演示如何在 Rust 中安全准备数据并调用外部 C 函数。'},
    {at:'let c_str = CString::new("hello")',text:'把 Rust 字符串转成带末尾 \\0 的 CString；若字符串中间意外含 \\0 会返回 Err。'},
    {at:'let len = unsafe { strlen(c_str.as_ptr()) };',text:'把 *const c_char 指针传给外部 C 函数 strlen；由于 CString 保证了有效性和 \\0 结尾，这次调用是安全的。'},
    {at:'let back = unsafe { CStr::from_ptr(c_str.as_ptr()) }',text:'把 C 指针借用回 CStr，再验证 UTF-8 转成普通 &str。'},
    {at:'println!("{back} 的 C 长度是 {len}");',text:'打印结果：hello 的 C 长度是 5。'}
   ]
  },
  {
   title:'声明宏 macro_rules!：按语法模式生成代码',
   body:'前面学过 println! 和 vec!，名字带感叹号的就是宏。宏和普通函数的根本区别在于：普通函数在运行时被调用，参数个数和类型在签名里固定死了；而宏在编译期运行，直接按“代码语法模式”把你写进去的片段展开成新的 Rust 代码，然后再交给编译器做完整的类型检查和借用检查。\n最常用的是“声明宏”（Declarative Macro），用 macro_rules! 定义，写法很像针对代码语法的 match：\n一、片段指示符（Fragment Specifier）：用 $变量名:指示符 捕获代码片段，最常见的有：\n  - expr：任意表达式（如 1 + 2、foo()）；\n  - ident：标识符（变量名、函数名、类型名）；\n  - ty：类型（如 i32、Vec<String>）；\n  - stmt：语句；\n  - pat：模式（如 Some(x)）；\n  - tt：单个词法树（Token Tree，最灵活，可以是任意一个词法单元或一对括号括起来的整体）；\n二、重复语法：$( ... ),* 表示“以逗号分隔，重复 0 次或多次”；$( ... ),+ 表示“重复 1 次或多次”；末尾加上 $(,)? 表示“可选的尾逗号”，让用户写 my_vec![1, 2,] 时也能通过。',
   code:`macro_rules! my_vec {
    () => {
        Vec::new()
    };
    ( $( $x:expr ),+ $(,)? ) => {{
        let mut temp = Vec::new();
        $(
            temp.push($x);
        )+
        temp
    }};
}

let empty: Vec<i32> = my_vec![];
let nums = my_vec![10, 20, 30,];`,
   explain:[
    {at:'macro_rules! my_vec {',text:'定义名为 my_vec 的声明宏，里面可以写多个模式分支，自上而下依次匹配。'},
    {at:'() => {',to:'Vec::new()',text:'第一条分支：不传任何参数时，直接展开为 Vec::new()。'},
    {at:'( $( $x:expr ),+ $(,)? ) => {{',text:'第二条分支：匹配 1 个或多个逗号分隔的表达式，并允许末尾多写一个逗号。注意右边的双花括号 {{ ... }}：外层是宏分支边界，内层是一个普通 Rust 代码块，使多条语句作为一个表达式返回 temp。'},
    {at:'let mut temp = Vec::new();',text:'创建一个临时 Vec 用来存放元素。'},
    {at:'$(',to:'temp.push($x);',text:'展开区的重复语法：输入里匹配了几个 $x，这里就会按顺序展开成几条 temp.push(...) 语句。'},
    {at:')+',to:'temp',text:'重复块结束后，最后一行不加分号的 temp 作为块表达式的返回值，把填好的 Vec 交出去。'},
    {at:'let empty: Vec<i32> = my_vec![];',to:'let nums = my_vec![10, 20, 30,];',text:'调用宏时圆括号 ()、方括号 []、花括号 {} 都可以互换；第二行末尾带了尾逗号依然能正确匹配。'}
   ]
  },
  {
   title:'宏的卫生性（Hygiene）与常见陷阱',
   body:'在 C/C++ 里写 #define 宏臭名昭著，因为那只是粗暴的文本替换，很容易发生“宏里建了个变量 temp，结果把调用处同名的 temp 给覆盖了”的事故。Rust 的 macro_rules! 具有“局部变量卫生性（Hygiene）”：宏内部用 let 声明的局部变量生活在宏自己的语法上下文里，不会和调用处同名的局部变量打架；反过来，宏也无法偷偷读取调用方的局部变量，必须通过参数显式传进去。\n不过写声明宏仍然有两个经典陷阱要格外小心：\n一、重复求值陷阱：如果你在宏展开体里把同一个 $x:expr 写了两遍（比如 ($x:expr) => { $x + $x }），那么调用 double!(next_id()) 时，next_id() 会被执行两次！不仅浪费计算，还可能触发两次副作用（比如发两次请求、自增两次计数器）。正确做法是在块里先 let val = $x; 绑定到临时变量，再复用 val；\n二、路径可见性陷阱：如果宏要给其他模块或外部 crate 使用，展开代码里直接写 HashMap::new() 可能会因为调用方没 use HashMap 而编译报错。写库级宏时应使用完整路径（如 ::std::collections::HashMap::new()）或 $crate::... 指向当前 crate 的路径。\n最后牢记一条工程经验：能用普通函数、泛型或 trait 解决的问题，就不要写宏。宏会让报错信息变难读、增加编译时间，也不利于 IDE 重构。',
   code:`// 错误示范：如果写成 ($e:expr) => { $e + $e }，传入有副作用的表达式会执行两次
macro_rules! double_safe {
    ($e:expr) => {{
        let val = $e;
        val + val
    }};
}

let val = 100;
let mut count = 0;
let res = double_safe!({ count += 1; 7 });
println!("res = {res}, count = {count}, 外层 val = {val}");`,
   explain:[
    {at:'macro_rules! double_safe {',text:'定义一个把表达式结果翻倍的宏。'},
    {at:'($e:expr) => {{',text:'匹配任意表达式 $e，并用双花括号构造独立作用域块。'},
    {at:'let val = $e;',text:'先求值一次并存入局部变量 val，彻底避免重复求值；同时得益于卫生性，这个 val 不会干扰外部的 val。'},
    {at:'val + val',text:'复用已经算好的 val，计算 7 + 7 = 14 并作为块结果返回。'},
    {at:'let val = 100;',to:'let mut count = 0;',text:'调用方刚好也有一个同名变量 val，另设一个计数器 count 用来验证表达式到底执行了几次。'},
    {at:'let res = double_safe!({ count += 1; 7 });',text:'传入一个会修改 count 并返回 7 的块表达式。如果是重复求值的坏宏，count 会变成 2；这里安全地只执行了 1 次。'},
    {at:'println!("res = {res}, count = {count}, 外层 val = {val}");',text:'打印 res = 14, count = 1, 外层 val = 100，同时验证了“无重复求值”和“宏的卫生性”。'}
   ]
  },
  {
   title:'动手试试：用 macro_rules! 实现 map! 和计时宏',
   body:'把声明宏的重复匹配、可选尾逗号、单次求值和卫生性放进一个可直接运行的程序里：用 map! 像 vec! 一样快速构造有序映射 BTreeMap（使用 BTreeMap 可以让输出按键排序、每次运行结果完全一致），再用 timed! 宏统计一段代码块的执行结果与耗时。\n注意看 main 里故意声明了一个与宏内部同名的变量 result，验证宏的卫生性不会覆盖外层变量。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '试着把倒数第二行的 println! 改成直接打印 {elapsed:?}，观察真实耗时；再在 map! 里多加一组 "orange" => 8 试试尾逗号匹配。'
    ],
    expect:'空表：{}\n水果库存：{"apple": 3, "banana": 5, "pear": 2}\n[1到100求和] 计算结果 = 5050，耗时小于 1 秒 = true\n外层同名变量未被宏覆盖'
   },
   code:`use std::collections::BTreeMap;
use std::time::Instant;

macro_rules! map {
    () => {
        BTreeMap::new()
    };
    ( $( $k:expr => $v:expr ),+ $(,)? ) => {{
        let mut m = BTreeMap::new();
        $(
            m.insert($k, $v);
        )+
        m
    }};
}

macro_rules! timed {
    ($label:expr, $body:expr) => {{
        let start = Instant::now();
        let result = $body;
        let elapsed = start.elapsed();
        (result, elapsed, $label)
    }};
}

fn main() {
    let empty: BTreeMap<&str, i32> = map!();
    let scores = map! {
        "pear" => 2,
        "apple" => 3,
        "banana" => 5,
    };
    println!("空表：{empty:?}");
    println!("水果库存：{scores:?}");

    let result = "外层同名变量未被宏覆盖";
    let (sum, elapsed, label) = timed!("1到100求和", {
        let mut total = 0;
        for i in 1..=100 {
            total += i;
        }
        total
    });
    println!("[{label}] 计算结果 = {sum}，耗时小于 1 秒 = {}", elapsed.as_secs() < 1);
    println!("{result}");
}`,
   explain:[
    {at:'use std::collections::BTreeMap;',to:'use std::time::Instant;',text:'引入有序映射 BTreeMap（打印时按键名排序，结果稳定）和单调计时器 Instant。'},
    {at:'macro_rules! map {',text:'定义键值对初始化宏 map!。'},
    {at:'() => {',to:'BTreeMap::new()',text:'空参数分支：展开成一个空的 BTreeMap。'},
    {at:'( $( $k:expr => $v:expr ),+ $(,)? ) => {{',text:'非空分支：用自定义分隔符 => 匹配一组或多组“键 => 值”对，并支持末尾可选逗号。'},
    {at:'let mut m = BTreeMap::new();',text:'创建一个临时 BTreeMap 用来收集键值对。'},
    {at:'$(',to:'m.insert($k, $v);',text:'展开区的重复语法：输入里匹配了几对 ($k, $v)，就按顺序展开成几条 m.insert($k, $v); 语句。'},
    {at:')+',to:'m',text:'重复结束后，最后一行不加分号的 m 作为整个块表达式的值返回。'},
    {at:'macro_rules! timed {',to:'(result, elapsed, $label)',text:'定义计时宏：记录开始时间，把 $body 仅求值一次存入内部局部变量 result，再算出耗时 elapsed，连同标签一起打包成元组返回。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let empty: BTreeMap<&str, i32> = map!();',text:'调用空分支创建空表（需要显式类型标注让编译器知道键值类型）。'},
    {at:'let scores = map! {',to:'"banana" => 5,',text:'用花括号风格调用 map!，传入 3 组键值对且带尾逗号；BTreeMap 会自动按字母序排成 apple、banana、pear。'},
    {at:'println!("空表：{empty:?}");',to:'println!("水果库存：{scores:?}");',text:'打印空表和按键排序后的水果库存。'},
    {at:'let result = "外层同名变量未被宏覆盖";',text:'特意声明一个和 timed! 内部同名的变量 result，用来检验宏的卫生性。'},
    {at:'let (sum, elapsed, label) = timed!("1到100求和", {',to:'let mut total = 0;',text:'把整个求和代码块作为 $body 传给 timed!，宏在编译期展开计时逻辑，并把返回值解构到 sum、elapsed、label。'},
    {at:'for i in 1..=100 {',text:'循环遍历 1 到 100。'},
    {at:'total += i;',text:'逐个累加到 total（最终得到 5050）。'},
    {at:'        }',to:'total',text:'循环结束后，把 total 作为代码块的结果返回给 timed! 宏内部的 let result = $body;。'},
    {at:'println!("[{label}] 计算结果 = {sum}',text:'打印计算结果 5050，并验证耗时小于 1 秒。'},
    {at:'println!("{result}");',text:'外层 result 依然完好无损，印证了宏内部 let result 不会污染调用方作用域。'}
   ]
  },
  {
   title:'过程宏（Procedural Macros）三大家族与原理',
   body:'macro_rules! 擅长按模式拼装代码，但如果想“读懂一个结构体里有哪些字段名和类型，再据此自动生成序列化代码”，或者“在编译期检查一条 SQL 语句的语法”，声明宏就力不从心了。这时就要用到更强大的“过程宏”（Procedural Macro）。\n过程宏的原理非常直观：它必须放在一个独立的 crate 里（在 Cargo.toml 中设置 [lib] proc-macro = true），本质上就是一段在编译期间由 rustc 执行的普通 Rust 函数——输入是一串原始词法流 proc_macro::TokenStream，经过你的 Rust 代码分析与改写后，再输出一串新的 TokenStream 交回给编译器继续编译。生态里几乎都会配合三个标准工具 crate：syn 把 TokenStream 解析成结构化的 Rust 语法树（AST），quote 用接近原生 Rust 的模板语法把代码重新生成 TokenStream，proc-macro2 则方便在编译器之外写单元测试。\n过程宏分为三大家族：\n一、派生宏（Derive Macro）：如 #[derive(Debug, Serialize)]，贴在 struct / enum / union 上，只在原定义后面“追加”新代码（通常是 impl 块），不修改原结构体；\n二、属性宏（Attribute-like Macro）：如 #[tokio::main]、#[get("/users")]，可以贴在函数、模块、结构体等条目上，把整段被修饰的代码彻底“替换”成改写后的新代码（例如 #[tokio::main] 会把 async fn main() 改写成同步的 fn main() 并在里面启动 Tokio 运行时）；\n三、类函数宏（Function-like Macro）：如 sql!("SELECT * FROM users WHERE id = ?", id)，调用外形像 macro_rules!，但背后运行的是完整 Rust 逻辑，可在编译期做复杂解析与校验。',
   code:`// 位于独立的 proc-macro crate 中（Cargo.toml 需配置 proc-macro = true）
use proc_macro::TokenStream;
use quote::quote;
use syn::{DeriveInput, parse_macro_input};

#[proc_macro_derive(Describe)]
pub fn derive_describe(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;
    let expanded = quote! {
        impl #name {
            pub fn type_name() -> &'static str {
                stringify!(#name)
            }
        }
    };
    TokenStream::from(expanded)
}`,
   explain:[
    {at:'use proc_macro::TokenStream;',to:'use syn::{DeriveInput, parse_macro_input};',text:'引入编译器内置的 TokenStream，以及社区标配的 quote（代码生成）和 syn（语法树解析）。'},
    {at:'#[proc_macro_derive(Describe)]',text:'声明这是一个派生宏，之后用户就可以在任意结构体或枚举上写 #[derive(Describe)]。'},
    {at:'pub fn derive_describe(input: TokenStream) -> TokenStream {',text:'过程宏的固定函数签名：接收被标注条目的 TokenStream，返回要追加进去的新 TokenStream。'},
    {at:'let ast = parse_macro_input!(input as DeriveInput);',text:'用 syn 把原始词法流解析成结构化的语法树 DeriveInput；若语法有误会自动生成友好的编译错误。'},
    {at:'let name = &ast.ident;',text:'从语法树中取出结构体或枚举的名字（例如 User）。'},
    {at:'let expanded = quote! {',to:'};',text:'用 quote! 写生成模板，里面的 #name 会被替换成刚才取出的类型名，stringify!(#name) 把标识符转成静态字符串。'},
    {at:'TokenStream::from(expanded)',text:'把 quote! 生成的 proc_macro2::TokenStream 转回编译器要求的 proc_macro::TokenStream 返回。'}
   ]
  },
  {
   title:'工程守则：什么时候该用 unsafe 与宏',
   body:'学完 Unsafe Rust、FFI 和宏编程之后，最容易犯的错误不是“不会写”，而是“滥用”。在真实的 Rust 团队和面试里，资深工程师反而以“克制使用”为荣：\n一、关于 unsafe：先问自己三个问题——标准库或成熟 crate（如 bytes、bytemuck、smallvec）是不是已经提供了安全实现？性能瓶颈是不是通过基准测试实测出来的？如果确实非写不可，把 unsafe 缩到最小的一两个私有函数里，加好 assert! 与 // SAFETY: 注释，并在 CI 里用 Miri 跑测试检验是否隐藏 UB；\n二、关于 FFI：尽量把原始 C 指针和错误码封装在内部 sys 层，对外暴露带 RAII（实现 Drop 自动释放 C 资源）和 Result 返回值的安全 Rust API，绝不把裸指针直接漏给业务层；\n三、关于宏：优先级永远是“普通函数 / 泛型 / trait > macro_rules! > 过程宏”。只有当代码确实需要可变参数、编译期语法检查或消除大量机械样板（如序列化、CLI 解析、ORM 映射）时，再引入宏；调试复杂宏展开结果时，可以用 cargo expand 查看宏最终展开出的真实 Rust 代码。'
  }
 ],
 quiz:[
  {
   id:'rust-unsafe-macros-1',
   q:'关于 Rust 中的 unsafe 代码块，下面哪个说法是正确的？',
   options:[
    '关闭借用检查器并跳过类型检查',
    '允许程序在运行时自动修复空指针',
    '仅解锁五种编译器无法验证的操作',
    '让代码块里的变量自动分配到栈上'
   ],
   why:[
    'unsafe 不会关闭借用检查器，也不会关闭类型检查，普通引用依然受完整规则约束。',
    'unsafe 不会在运行时增加任何自动修复机制，解引用空指针会直接导致未定义行为。',
    '',
    '变量的栈/堆分配位置由类型决定（例如 Box 在堆上），与是否在 unsafe 块里无关。'
   ],
   answer:2,
   explain:'unsafe 只解锁解引用裸指针、调用 unsafe 函数、访问 static mut、实现 unsafe trait、读取 union 字段这五种能力，借用检查器依然全程生效。'
  },
  {
   id:'rust-unsafe-macros-2',
   type:'multi',
   q:'下面哪些操作必须在 unsafe 块或 unsafe 上下文中才能执行？（多选）',
   options:[
    '解引用裸指针 *const T 读取数据',
    '调用标记为 unsafe fn 的底层函数',
    '用 &raw const x 创建不可变裸指针',
    '读取一个 union 联合体内部的字段'
   ],
   why:[
    '',
    '',
    '创建裸指针本身是安全的，不需要 unsafe，只有解引用裸指针时才需要 unsafe。',
    ''
   ],
   answers:[0,1,3],
   explain:'解引用裸指针、调用 unsafe fn、读取 union 字段都属于 unsafe 的五种超能力；而创建裸指针不需要 unsafe。'
  },
  {
   id:'rust-unsafe-macros-3',
   type:'judge',
   q:'在安全代码里，只要用 &raw mut x 或 as *mut T 创建一个裸指针，就必须放进 unsafe 块中。',
   answer:false,
   explain:'创建裸指针本身不会读写任何非法内存，因而是完全安全的；只有真正解引用裸指针（*ptr）时才需要 unsafe。'
  },
  {
   id:'rust-unsafe-macros-4',
   q:'标准库的 slice::split_at_mut 内部用了 unsafe，但对外是安全函数，它如何保证安全调用方不会触发未定义行为？',
   options:[
    '先用 assert! 校验边界并拆成两段不重叠切片',
    '把整个切片深拷贝到新堆内存后再返回两个所有权',
    '在运行时关闭借用检查器并允许两段切片重叠修改',
    '要求调用方在每次调用外部再额外包一层 unsafe 块'
   ],
   why:[
    '',
    'split_at_mut 是零拷贝原地拆分，不会分配新堆内存或复制元素。',
    '借用检查是编译期机制，且制造指向重叠内存的两个 &mut 会直接触发未定义行为。',
    'split_at_mut 本身就是普通安全函数，调用方无需写 unsafe。'
   ],
   answer:0,
   explain:'安全抽象的核心是健壮性（soundness）：在进入 unsafe 前用 assert!(mid <= len) 挡住越界输入，再把内存拆成两段互不重叠的 &mut [T]。'
  },
  {
   id:'rust-unsafe-macros-5',
   type:'fill',
   q:'在 Rust 2024 版次中，声明调用外部 C 函数的 extern 块必须在前面显式加上关键字＿（填一个英文关键字）。',
   accepted:['unsafe'],
   explain:'Rust 2024 要求写作 unsafe extern "C" { ... }，强调外部函数签名写错本身就会引发未定义行为。'
  },
  {
   id:'rust-unsafe-macros-6',
   q:'在 Rust 2024 中导出一个可供 C 语言按原函数名链接的接口时，需要配合哪个属性？',
   options:[
    '#[derive(ExternC)]',
    '#[cfg(target_c)]',
    '#[inline(always)]',
    '#[unsafe(no_mangle)]'
   ],
   why:[
    '标准库没有 ExternC 派生宏，derive 用于为结构体/枚举自动生成 trait 实现。',
    '#[cfg(...)] 是条件编译属性，不能禁止编译器改写导出符号名。',
    '#[inline(always)] 是内联优化提示，不会保留 C 链接所需的导出符号名。',
    ''
   ],
   answer:3,
   explain:'导出函数给 C 调用需要禁止符号名改写（name mangling），Rust 2024 将其规范为 #[unsafe(no_mangle)]，配合 extern "C" 使用。'
  },
  {
   id:'rust-unsafe-macros-7',
   q:'把 Rust 的 String 传给期望 const char* 的 C 函数时，为什么要先转成 CString？',
   options:[
    'C 语言要求字符串按大端序存放并且开头记录长度',
    'Rust 字符串不以 \\0 结尾，而 C 字符串靠 \\0 判尾',
    'String 默认放在只读栈区，C 函数无法拿到其地址',
    'CString 会把 UTF-8 自动转成 UTF-16 供 C 读取'
   ],
   why:[
    'C 字符串不按字节序存字符，也没有开头的长度字段，而是靠末尾的 \\0 终止符判尾。',
    '',
    'String 的内容在堆上且有 .as_ptr()，问题不在于栈区只读，而在于缺少末尾 \\0 终止符。',
    'CString 保持原始字节（常见为 UTF-8），不会做 UTF-16 转码，只是保证无内部 \\0 并在末尾补 \\0。'
   ],
   answer:1,
   explain:'Rust 的 String 和 &str 靠长度记录范围、末尾没有 \\0；CString 会检查中间不含 \\0 并在末尾补 \\0，以满足 C 的 const char* 约定。'
  },
  {
   id:'rust-unsafe-macros-8',
   q:'在 macro_rules! 中，想匹配任意一个 Rust 表达式（如 1 + 2 或 foo()），应使用哪个片段指示符？',
   options:[
    '$x:expr',
    '$x:ident',
    '$x:ty',
    '$x:stmt'
   ],
   why:[
    '',
    'ident 只匹配单个标识符（如变量名、函数名），无法匹配 1 + 2 这样的表达式。',
    'ty 用来匹配类型名（如 i32、Vec<u8>），不是表达式。',
    'stmt 匹配语句，通常不直接用来捕获可求值的表达式位置。'
   ],
   answer:0,
   explain:'expr 对应 Rust 表达式（expression）；ident 匹配标识符，ty 匹配类型，stmt 匹配语句，tt 匹配词法树。'
  },
  {
   id:'rust-unsafe-macros-9',
   type:'multi',
   q:'下面关于 macro_rules! 卫生性与展开机制的说法，哪些是正确的？（多选）',
   options:[
    '宏在程序运行时动态拼接源码文本再交给解释器执行',
    '宏内部声明的局部变量不会意外覆盖调用方同名变量',
    '宏展开体里把同一 $x:expr 写两次会引发重复求值',
    '宏展开生成的 Rust 代码会直接绕过类型与借用检查'
   ],
   why:[
    '宏在编译期直接操作词法树并展开，不是运行时文本拼接，Rust 也没有运行时解释器。',
    '',
    '',
    '宏展开后的代码同样要接受编译器完整的类型检查和借用检查，不能绕过安全规则。'
   ],
   answers:[1,2],
   explain:'macro_rules! 具备局部变量卫生性，不会污染调用方同名变量；但如果在展开模板里多次出现同一个 $x:expr，该表达式会被求值多次，应先用 let 绑定一次。'
  },
  {
   id:'rust-unsafe-macros-10',
   type:'judge',
   q:'在 macro_rules! 中，模式 ( $( $x:expr ),* $(,)? ) 既可以匹配零个参数，也可以匹配末尾带逗号的多个参数。',
   answer:true,
   explain:'* 表示重复 0 次或多次，$(,)? 表示末尾逗号可有可无，这是支持空调用和尾逗号的标准写法。'
  },
  {
   id:'rust-unsafe-macros-11',
   q:'下面哪一个属于“属性宏（Attribute-like Macro）”的典型用法？',
   options:[
    '#[derive(Debug)] 为结构体生成实现',
    'vec![1, 2, 3] 构造动态数组',
    '#[tokio::main] 改写异步入口函数',
    'sql!("SELECT 1") 检查查询语句'
   ],
   why:[
    '#[derive(...)] 是派生宏（Derive Macro），只在类型定义后追加 impl 实现。',
    'vec![...] 是声明宏（macro_rules!），不是过程宏里的属性宏。',
    '',
    'sql!(...) 是类函数过程宏（Function-like Macro），调用形式带感叹号。'
   ],
   answer:2,
   explain:'#[tokio::main] 是典型的属性宏，它贴在 async fn main 上，并在编译期把整个函数改写成启动 Tokio 运行时的同步 main 函数。'
  },
  {
   id:'rust-unsafe-macros-12',
   type:'fill',
   q:'过程宏在编译期本质上是一个接收并返回＿（填标准库类型名）的 Rust 函数，社区常用 syn 解析语法树、用 quote 生成代码。',
   accepted:['TokenStream','proc_macro::TokenStream'],
   explain:'过程宏定义在独立的 proc-macro crate 中，签名接收 proc_macro::TokenStream 并返回转换后的 proc_macro::TokenStream。'
  },
  {
   id:'rust-unsafe-macros-13',
   type:'short',
   q:'为什么说“把 unsafe 最小化并封装在安全抽象里”是写 Unsafe Rust 的核心原则？封装一个可靠的安全抽象时必须守住哪些要点？',
   reference:'unsafe 不会关闭借用检查器，但把内存安全不变式的证明责任交给了程序员。把 unsafe 收敛在极小的内部范围、对外暴露普通安全 API，可以把安全审计与排错面缩到最小，调用方也无需关心底层细节。封装时必须守住四点：一、在进入 unsafe 之前用 assert! 或类型约束检查所有前置条件（边界、非空、对齐等），确保任何安全调用都不会触发未定义行为（满足健壮性 soundness）；二、严格遵守借用与别名规则，绝不制造指向重叠内存的多个 &mut 或悬垂/空指针解引用；三、在每个 unsafe 块上方写明 // SAFETY: 注释，逐条交代不变式成立的依据；四、补充边界测试并配合 Miri 校验是否存在潜在 UB。',
   points:[
    '说明封装价值：缩小 unsafe 审计面，对外暴露无需调用方操心不变式的安全接口',
    '前置检查与健壮性：进入 unsafe 前用 assert! 或类型系统校验边界、对齐等条件，防止安全调用触发 UB',
    '遵守内存与别名规则：不制造重叠可变引用，不解引用空指针或悬垂指针',
    '规范注释与验证：写明 // SAFETY: 注释说明安全依据，并结合测试或 Miri 检测 UB'
   ],
   explain:'标准库的 Vec、String、slice::split_at_mut 都是这一原则的典范：内部少量经过严格验证的 unsafe，外部零 UB 的安全抽象。'
  },
  {
   id:'rust-unsafe-macros-14',
   type:'code',
   q:'用 macro_rules! 编写一个名为 max_of! 的宏：接收 1 个或多个表达式参数（支持可选尾逗号），返回其中的最大值，且每个参数表达式只能求值一次。再写出 main 函数测试 max_of!(3) 和 max_of!(10, 42, 18,) 并打印结果。',
   reference:'macro_rules! max_of {\n    ($x:expr $(,)?) => {\n        $x\n    };\n    ($first:expr, $($rest:expr),+ $(,)?) => {{\n        let mut max = $first;\n        $(\n            let val = $rest;\n            if val > max {\n                max = val;\n            }\n        )+\n        max\n    }};\n}\n\nfn main() {\n    println!("{}", max_of!(3));\n    println!("{}", max_of!(10, 42, 18,));\n}',
   points:[
    '用 macro_rules! 定义 max_of!，支持单参数和多参数分支',
    '使用重复语法 $($rest:expr),+ 和可选尾逗号 $(,)?',
    '每个参数先绑定到局部临时变量再比较，避免重复求值',
    'main 函数中正确调用 max_of!(3) 和 max_of!(10, 42, 18,) 并打印 3 与 42'
   ],
   explain:'把每个 $rest 先存进局部临时变量 val 再和 max 比较，既避免了重复求值副作用，也利用宏的卫生性避免污染外部变量名。'
  }
 ]
};

export const rustEngineering:AiLevel={
 id:'rust-engineering',
 title:'内存布局、生态与工程实战',
 summary:'结构体对齐与 Niche 优化、零拷贝设计、主流生态 Crate、Cargo Workspace 与性能优化规范',
 lessons:[
  {
   title:'内存对齐与结构体字段重排',
   body:'CPU 读取内存时并不是逐字节随便读的：比如一个 4 字节的 u32，放在 4 的倍数地址上可以一次读完；如果歪着放，轻则变慢，重则在某些架构上直接崩溃。因此每个类型都有“对齐要求”（alignment，常见基本类型等于自身大小），结构体总大小也会向上补齐到最大字段对齐值的整数倍，中间空出来的位置叫“填充字节”（padding）。\nRust 提供了几种最常用的布局控制属性：\n一、默认 repr(Rust)：编译器不承诺按你写字段的顺序排版，而是有权自动重排字段以减少填充字节。例如 struct Auto { a: u8, b: u32, c: u8 }，编译器会把 4 字节的 b 挪到前面，两个 1 字节的 a 和 c 紧挨着放在后面，总大小只要 8 字节；\n二、#[repr(C)]：强制严格按声明顺序排列字段，匹配 C 语言 ABI。上面的字段按 a(1) + 填充(3) + b(4) + c(1) + 填充(3) 排列，总大小变成 12 字节——跨 FFI 通信或对接二进制协议时必须用它；\n三、#[repr(transparent)]：只能用在“仅含一个非零大小字段”的新类型包装（newtype，如 struct UserId(u32);）上，保证它在内存布局和函数调用 ABI 上与内部类型完全一致，是零成本类型安全包装的利器。\n另外还有 #[repr(packed)] 可以消除所有填充字节，但对未对齐字段直接取引用（&s.field）属于未定义行为，除非处理紧凑硬件协议，否则一般不要用。',
   code:`struct AutoLayout {
    a: u8,
    b: u32,
    c: u8,
}

#[repr(C)]
struct CLayout {
    a: u8,
    b: u32,
    c: u8,
}

#[repr(transparent)]
struct UserId(u32);`,
   explain:[
    {at:'struct AutoLayout {',to:'c: u8,',text:'默认 repr(Rust)：编译器自动把字段重排为 (b: u32, a: u8, c: u8) 加 2 字节尾填充，只占 8 字节。'},
    {at:'#[repr(C)]',to:'struct CLayout {',text:'强制按 C 语言规则排版，绝不重排字段顺序。'},
    {at:'    a: u8,',to:'    c: u8,',text:'a 后补 3 字节让 b 对齐到 4，c 后再补 3 字节让总大小是 4 的倍数，共占 12 字节。'},
    {at:'#[repr(transparent)]',to:'struct UserId(u32);',text:'透明包装：在类型系统里 UserId 和 u32 互不混淆，但在内存和 FFI ABI 上与 u32 完全等价，零运行时开销。'}
   ]
  },
  {
   title:'零大小类型（ZST）与空指针优化（Niche）',
   body:'Rust 的类型系统藏着两项非常巧妙的“零成本抽象”内存优化，面试和性能调优里经常出现：\n一、零大小类型（ZST，Zero-Sized Type）：单元类型 ()、无字段结构体 struct Marker;、空数组 [T; 0]，以及标记类型 PhantomData<T>，它们在内存里占用 0 字节！标准库正是利用这一点，把 HashSet<T> 直接实现成 HashMap<T, ()>——值的部分占 0 字节，连多余内存都不分配；往 Vec<()> 里 push 一百万次甚至不会向操作系统申请任何堆内存。PhantomData<T> 则常用于在编译期表达“逻辑上拥有或关联类型 T（或某个生命周期）”，同时在运行期不占任何空间。\n二、空位优化 / 空指针优化（Niche Optimization）：所谓 niche，指的是某个类型永远不会出现的非法比特模式。例如引用 &T、&mut T 和 Box<T> 绝不可能是空指针 0；于是 Option<&T> 和 Option<Box<T>> 根本不需要额外加一个“是 Some 还是 None”的标签字段，直接把 0 用来表示 None！因此在 64 位平台上，Option<&T> 和 Option<Box<T>> 都只占 8 字节，而不是 16 字节。\n同样的优化也适用于 bool（合法值是 0 和 1，2～255 都是空位，所以 Option<bool> 仍占 1 字节）以及 std::num::NonZeroU32（0 是非法值，所以 Option<NonZeroU32> 只占 4 字节，而 Option<u32> 因为 0～u32::MAX 全是合法值，必须加标签加对齐，占 8 字节）。',
   code:`use std::marker::PhantomData;
use std::mem::size_of;
use std::num::NonZeroU32;

struct Meter<Unit> {
    value: u32,
    _unit: PhantomData<Unit>,
}

let zst = size_of::<()>();
let opt_u32 = size_of::<Option<u32>>();
let opt_nz = size_of::<Option<NonZeroU32>>();
let same_ref = size_of::<Option<&i32>>() == size_of::<&i32>();`,
   explain:[
    {at:'use std::marker::PhantomData;',to:'use std::num::NonZeroU32;',text:'引入零大小幽灵标记 PhantomData、编译期大小查询 size_of，以及非零无符号整数 NonZeroU32。'},
    {at:'struct Meter<Unit> {',to:'_unit: PhantomData<Unit>,',text:'在结构体里用 PhantomData<Unit> 挂上泛型参数 Unit（例如区分米和秒），编译期防混用，运行期 _unit 占 0 字节，整个 Meter 仅占 4 字节。'},
    {at:'let zst = size_of::<()>();',text:'单元类型 () 的大小严格为 0 字节。'},
    {at:'let opt_u32 = size_of::<Option<u32>>();',to:'let opt_nz = size_of::<Option<NonZeroU32>>();',text:'Option<u32> 占 8 字节；而 Option<NonZeroU32> 利用 0 作为 None 的空位，只占 4 字节。'},
    {at:'let same_ref = size_of::<Option<&i32>>() == size_of::<&i32>();',text:'引用非空，空指针 0 用来表示 None，因此 Option<&i32> 与 &i32 大小完全相等（true）。'}
   ]
  },
  {
   title:'动手试试：实测结构体布局、ZST 与 Niche 优化',
   body:'用标准库的 size_of 和 align_of 亲自测一测默认重排与 #[repr(C)] 的字节差异、#[repr(transparent)] 的零开销包装、ZST 零字节特性，以及 Option<NonZeroU32> / Option<bool> / Option<&i32> / Option<Box<i32>> 的 Niche 优化效果。\n下面输出里的精确字节数都基于固定宽度整数（u8、u32、NonZeroU32），指针则打印相对等式，无论 32 位还是 64 位平台输出都完全一致。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把 CLayout 的字段顺序手动改成 b: u32 在最前面、a 和 c 在后面，重新运行看看 CLayout 的大小是不是也缩成了 8 字节；再试试把 size_of::<Option<Option<bool>>>() 打印出来看看多层 Option 的 Niche 效果！'
    ],
    expect:'AutoLayout: size=8, align=4\nCLayout:    size=12, align=4\nUserId == u32: true\n()=0, PhantomData=0\nTagged size=4\nOption<u32>=8, Option<NonZeroU32>=4\nOption<bool>=1\nOption<&i32> == &i32: true\nOption<Box<i32>> == Box<i32>: true'
   },
   code:`use std::marker::PhantomData;
use std::mem::{align_of, size_of};
use std::num::NonZeroU32;

#[allow(dead_code)]
struct AutoLayout {
    a: u8,
    b: u32,
    c: u8,
}

#[repr(C)]
#[allow(dead_code)]
struct CLayout {
    a: u8,
    b: u32,
    c: u8,
}

#[repr(transparent)]
#[allow(dead_code)]
struct UserId(u32);

#[allow(dead_code)]
struct Tagged {
    id: u32,
    _marker: PhantomData<u64>,
}

fn main() {
    println!("AutoLayout: size={}, align={}", size_of::<AutoLayout>(), align_of::<AutoLayout>());
    println!("CLayout:    size={}, align={}", size_of::<CLayout>(), align_of::<CLayout>());
    println!("UserId == u32: {}", size_of::<UserId>() == size_of::<u32>());
    println!("()={}, PhantomData={}", size_of::<()>(), size_of::<PhantomData<u64>>());
    println!("Tagged size={}", size_of::<Tagged>());
    println!("Option<u32>={}, Option<NonZeroU32>={}", size_of::<Option<u32>>(), size_of::<Option<NonZeroU32>>());
    println!("Option<bool>={}", size_of::<Option<bool>>());
    println!("Option<&i32> == &i32: {}", size_of::<Option<&i32>>() == size_of::<&i32>());
    println!("Option<Box<i32>> == Box<i32>: {}", size_of::<Option<Box<i32>>>() == size_of::<Box<i32>>());
}`,
   explain:[
    {at:'use std::marker::PhantomData;',to:'use std::num::NonZeroU32;',text:'引入内存布局检测函数 size_of / align_of，以及 PhantomData 和 NonZeroU32。'},
    {at:'struct AutoLayout {',to:'c: u8,',text:'默认布局结构体：编译器会自动重排字段消除多余填充。#[allow(dead_code)] 用来安静地抑制演示字段未读取的警告。'},
    {at:'#[repr(C)]',to:'struct CLayout {',text:'按 C 布局固定字段顺序的对照组结构体，字段完全相同。'},
    {at:'    a: u8,',to:'    c: u8,',text:'因为不能重排，a 后和 c 后各需要 3 字节填充，总大小比 AutoLayout 多 4 字节。'},
    {at:'#[repr(transparent)]',to:'struct UserId(u32);',text:'透明新类型包装，与内部的 u32 保持完全相同的大小和对齐。'},
    {at:'struct Tagged {',to:'_marker: PhantomData<u64>,',text:'即使 PhantomData 的类型参数是 8 字节的 u64，PhantomData 本身的大小仍是 0、对齐仍是 1，不增加 Tagged 的任何体积。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'println!("AutoLayout:',to:'println!("CLayout:',text:'对比默认重排（8 字节）与 #[repr(C)]（12 字节），两者对齐都是最大字段 u32 的 4 字节。'},
    {at:'println!("UserId == u32:',text:'验证 #[repr(transparent)] 不引入任何额外字节。'},
    {at:'println!("()={}, PhantomData={}',to:'println!("Tagged size={}',text:'验证 () 和 PhantomData 都是 0 字节，Tagged 依然只有 id 的 4 字节。'},
    {at:'println!("Option<u32>={}, Option<NonZeroU32>={}',to:'println!("Option<bool>={}',text:'验证整数与布尔的 Niche 优化：Option<NonZeroU32> 仅 4 字节，Option<bool> 仅 1 字节。'},
    {at:'println!("Option<&i32> == &i32:',to:'println!("Option<Box<i32>> == Box<i32>:',text:'验证非空指针的 Niche 优化：无论 32 位还是 64 位平台，Option<&T> 和 Option<Box<T>> 都与内部指针严格等大。'}
   ]
  },
  {
   title:'零拷贝设计与减少堆分配',
   body:'在高频网络服务、日志管道和解析器里，真正的性能杀手往往不是算法复杂度，而是热路径上密密麻麻的堆内存分配与字节拷贝。不用任何 unsafe，仅靠四条惯用 Rust 设计就能把分配次数砍掉一大半：\n一、优先借用切片（零拷贝 Zero-Copy）：解析输入文本或二进制报文时，让结构体保存 &\'a str 或 &\'a [u8] 直接指向原缓冲区，而不是每个字段都 .to_string() 分配新堆块。如果大多数时候只需借用、少数情况（例如包含转义符）才要修改，用标准库的 std::borrow::Cow<\'a, str>（写时克隆：Borrowed 时零分配，Owned 时才分配）；\n二、预分配容量：事先知道或能估算结果大小时，用 Vec::with_capacity(n)、String::with_capacity(n) 一次性申请好容量，避免反复扩容带来的重新分配与内存搬运；\n三、循环外复用缓冲区：逐行读取文件或逐条格式化日志时，把 String 或 Vec 挪到循环外，每轮调用 buf.clear()——clear() 只把长度清零，底层的 capacity 原封不动留给下一轮继续用，配合 std::fmt::Write 的 write! 就地写入，彻底省去反复 malloc/free；\n四、克制 .clone()：每次写 .clone() 前先停半秒，问问能不能传引用、转移所有权，或者把只读共享大对象装进 Arc<T> / Arc<str> 实现 O(1) 克隆。',
   code:`use std::borrow::Cow;

fn normalize_space(input: &str) -> Cow<'_, str> {
    if input.contains('\\t') {
        Cow::Owned(input.replace('\\t', " "))
    } else {
        Cow::Borrowed(input)
    }
}

let mut buf = Vec::with_capacity(128);
buf.extend_from_slice(b"hello");
buf.clear();
assert!(buf.is_empty() && buf.capacity() >= 128);`,
   explain:[
    {at:'use std::borrow::Cow;',text:'引入 Copy-on-Write（写时克隆）枚举 Cow，它只有 Borrowed(&\'a B) 和 Owned(Owned) 两种变体。'},
    {at:'fn normalize_space(input: &str) -> Cow<\'_, str> {',text:'需要替换制表符时才分配新 String，否则零拷贝直接借用原字符串。'},
    {at:'if input.contains(\'\\t\') {',to:'Cow::Owned(input.replace(\'\\t\', " "))',text:'少数命中含制表符的分支：生成替换后的新 String，包在 Cow::Owned 里返回。'},
    {at:'} else {',to:'Cow::Borrowed(input)',text:'绝大多数不含制表符的热路径：零堆分配，直接返回原切片的借用。'},
    {at:'let mut buf = Vec::with_capacity(128);',text:'预先申请 128 字节容量，避免后续写入时多次扩容。'},
    {at:'buf.extend_from_slice(b"hello");',to:'buf.clear();',text:'写入数据后调用 clear()：长度归零，但 128 字节的堆容量被保留下来，下一轮直接复用。'},
    {at:'assert!(buf.is_empty() && buf.capacity() >= 128);',text:'断言验证清空后长度为 0、容量并未释放。'}
   ]
  },
  {
   title:'动手试试：零拷贝 CSV 解析与缓冲区复用',
   body:'写一个零拷贝的 CSV 行解析器：每条 Record<\'a> 直接借用原始文本中的切片，解析过程完全不分配 String；同时在循环外部预分配一个 64 字节的 String 缓冲区，每轮用 buf.clear() + write!(&mut buf, ...) 就地格式化输出，最后确认整个循环下来缓冲区一次都没有扩容。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '试着往 raw 里多加一行格式错误的文本（比如 "BrokenLine"），确认 parse_record 会干净地返回 None 并跳过；再把初始容量 64 改成 8，看看最后一行是否因为发生扩容而变成 false。'
    ],
    expect:'Alice (Backend) -> 95分\nBob (Systems) -> 88分\nCarol (Compiler) -> 92分\n缓冲区容量未扩容：true'
   },
   code:`use std::fmt::Write;

struct Record<'a> {
    name: &'a str,
    role: &'a str,
    score: u32,
}

fn parse_record(line: &str) -> Option<Record<'_>> {
    let mut parts = line.split(',');
    let name = parts.next()?.trim();
    let role = parts.next()?.trim();
    let score = parts.next()?.trim().parse::<u32>().ok()?;
    Some(Record { name, role, score })
}

fn main() {
    let raw = "Alice, Backend, 95\\nBob, Systems, 88\\nCarol, Compiler, 92";
    let mut buf = String::with_capacity(64);
    let initial_cap = buf.capacity();

    for line in raw.lines() {
        if let Some(rec) = parse_record(line) {
            buf.clear();
            let _ = write!(&mut buf, "{} ({}) -> {}分", rec.name, rec.role, rec.score);
            println!("{buf}");
        }
    }
    println!("缓冲区容量未扩容：{}", buf.capacity() == initial_cap);
}`,
   explain:[
    {at:'use std::fmt::Write;',text:'引入 std::fmt::Write trait，这样就能用 write! 宏直接把格式化结果写进已有的 String 缓冲区，而不像 format! 那样每次新建 String。'},
    {at:'struct Record<\'a> {',to:'score: u32,',text:'零拷贝结构体：name 和 role 只是借用原始输入里的切片，不会为字段分配堆内存。'},
    {at:'fn parse_record(line: &str) -> Option<Record<\'_>> {',text:'按生命周期省略规则，返回的 Record 借用自输入 line。'},
    {at:'let mut parts = line.split(\',\');',to:'let score = parts.next()?.trim().parse::<u32>().ok()?;',text:'依次切出三列并去掉首尾空白，把第三列解析为 u32；任意一步缺失或格式不对，? 会立刻返回 None。'},
    {at:'Some(Record { name, role, score })',text:'组装零拷贝记录返回。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let raw = "Alice,',text:'模拟三行 CSV 原始文本。'},
    {at:'let mut buf = String::with_capacity(64);',to:'let initial_cap = buf.capacity();',text:'在循环外预分配 64 字节缓冲区，并记下初始容量。'},
    {at:'for line in raw.lines() {',text:'逐行切片遍历 raw，raw.lines() 本身也是零拷贝迭代器。'},
    {at:'if let Some(rec) = parse_record(line) {',text:'解析当前行，拿到零拷贝的 Record。'},
    {at:'buf.clear();',text:'清空上一轮的字符长度，但保留已分配好的底层内存容量。'},
    {at:'let _ = write!(&mut buf,',text:'就地格式化写入 buf，全程不触发新的堆分配。'},
    {at:'println!("{buf}");',text:'打印本行格式化结果。'},
    {at:'println!("缓冲区容量未扩容：{}", buf.capacity() == initial_cap);',text:'验证三轮复用后容量与初始值完全相等，说明整个循环零额外扩容。'}
   ]
  },
  {
   title:'错误处理工程范式：thiserror 与 anyhow',
   body:'标准库的 Result<T, E> 和 ? 运算符非常优雅，但在中大型项目里，如果每个模块都手工为自定义错误枚举实现 Display、std::error::Error 和一堆 From<...> 转换，样板代码会非常冗长。Rust 社区由此沉淀出了一套高度一致的“库与应用分工”错误处理范式：\n一、写库代码（Library Crate / 内部领域模块）用 thiserror：库的调用方可能需要针对不同错误类型做精准分支处理（例如超时就重试、权限不足就返回 403）。thiserror 提供 #[derive(Error, Debug)] 派生宏，用 #[error("...")] 自动生成 Display 文案，用 #[from] 自动生成 From 转换实现，并且它不会把任何运行时依赖强加给调用方，对外暴露的依然是标准、清晰的结构化枚举；\n二、写应用代码（Binary / 命令行 / 服务入口）用 anyhow：到了应用顶层，你通常不再挨个 match 每种底层错误，而是希望用统一的 anyhow::Result<T> 接住一切实现了 std::error::Error 的错误，再用 .context("读取配置文件失败")? 一层层附加上下文信息，最终在入口处打印完整的错误链（Error Chain）并打日志或退出。\n两者天生互补：底层库和领域层用 thiserror 精确建模错误，顶层应用入口通过 ? 无缝把它们转成 anyhow::Error 并补充业务上下文。',
   code:`// 1. 库 / 领域模块：使用 thiserror 定义结构化错误枚举
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("读取配置文件失败")]
    Io(#[from] std::io::Error),
    #[error("端口 {0} 超出合法范围")]
    InvalidPort(u16),
}

// 2. 应用入口：使用 anyhow 统一接收错误并附加上下文
use anyhow::{Context, Result};

fn run_app(path: &str) -> Result<()> {
    let raw = std::fs::read_to_string(path)
        .with_context(|| format!("无法加载应用配置：{path}"))?;
    println!("配置长度：{}", raw.len());
    Ok(())
}`,
   explain:[
    {at:'use thiserror::Error;',text:'引入 thiserror 的 Error 派生宏（用于库和领域模块）。'},
    {at:'#[derive(Debug, Error)]',to:'pub enum ConfigError {',text:'派生标准库 std::error::Error 与 Display 实现，免去手写大段样板代码。'},
    {at:'#[error("读取配置文件失败")]',to:'Io(#[from] std::io::Error),',text:'#[from] 自动生成 From<std::io::Error> for ConfigError，函数里对文件 IO 用 ? 就能自动包装成 ConfigError::Io。'},
    {at:'#[error("端口 {0} 超出合法范围")]',to:'InvalidPort(u16),',text:'支持按位置或字段名插值，自动格式化可读的错误消息。'},
    {at:'use anyhow::{Context, Result};',text:'在应用入口层引入 anyhow：Result<T> 等价于 std::result::Result<T, anyhow::Error>，Context 为 Result/Option 提供附加上下文的方法。'},
    {at:'fn run_app(path: &str) -> Result<()> {',text:'应用层函数直接返回 anyhow::Result，可以接住任意类型的标准错误。'},
    {at:'let raw = std::fs::read_to_string(path)',to:'.with_context(|| format!("无法加载应用配置：{path}"))?;',text:'用 with_context 惰性构造业务上下文（只在真的出错时才执行 format! 分配字符串），让排错日志一目了然。'},
    {at:'println!("配置长度：{}", raw.len());',to:'Ok(())',text:'读取成功后正常执行后续逻辑并返回 Ok(())。'}
   ]
  },
  {
   title:'主流工程生态 Crate 速览',
   body:'Rust 标准库刻意保持克制（不内置 HTTP、JSON、异步运行时和正则），把丰富能力留给了高质量的 crates.io 生态。搭建生产级 Rust 服务或工具时，下面这几张“明星底牌”几乎是行业默认标准：\n一、序列化与反序列化——serde（配合 serde_json、toml 等）：靠 #[derive(Serialize, Deserialize)] 在编译期生成零反射的编解码代码，同一套结构体无缝对接 JSON、TOML、YAML、Bincode 等几十种格式；\n二、异步运行时与 Web——tokio + axum + reqwest：tokio 是最主流的多线程异步运行时；axum 是 Tokio 团队基于 tower 中间件生态打造的 Web 框架，类型安全、提取器设计简洁；reqwest 是功能完善的异步/同步 HTTP 客户端；\n三、结构化日志与链路追踪——tracing（配合 tracing-subscriber）：针对异步高并发设计，不仅支持 key=value 结构化日志，还通过 Span 追踪一个异步请求跨越多次 .await 的完整上下文，并能对接 OpenTelemetry；\n四、命令行工具——clap：用 #[derive(Parser)] 把一个普通结构体直接变成命令行参数解析器，自动做类型校验、子命令分发和 --help 文档生成；\n五、数据与并行计算——数据库常用 sqlx（异步且支持编译期检查 SQL）或 diesel（强类型 ORM），CPU 密集型数据并行常用 rayon（把 .iter() 改成 .par_iter() 即可多核并行）。',
   code:`use clap::Parser;
use serde::{Deserialize, Serialize};

#[derive(Debug, Parser)]
#[command(about = "启动配置示例")]
struct Cli {
    #[arg(short, long, default_value_t = 8080)]
    port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    host: String,
    port: u16,
}

#[tracing::instrument]
async fn start_server(cfg: AppConfig) {
    tracing::info!(host = %cfg.host, port = cfg.port, "服务已启动");
}`,
   explain:[
    {at:'use clap::Parser;',to:'use serde::{Deserialize, Serialize};',text:'引入命令行解析宏 Parser 与序列化宏 Serialize / Deserialize。'},
    {at:'#[derive(Debug, Parser)]',to:'port: u16,',text:'用 clap 声明命令行参数：程序自动支持 -p / --port 传参，不传时默认 8080，并自动生成 --help 帮助。'},
    {at:'#[derive(Debug, Serialize, Deserialize)]',to:'struct AppConfig {',text:'用 serde 派生编译期编解码能力，结构体可直接与 JSON 或 TOML 互转。'},
    {at:'    host: String,',to:'    port: u16,',text:'普通字段即可被 serde 自动映射为同名 JSON/TOML 键，也可加 #[serde(rename = "...")] 定制字段名。'},
    {at:'#[tracing::instrument]',to:'async fn start_server(cfg: AppConfig) {',text:'tracing 属性宏：自动为整个异步函数创建一个 Span，并记录参数 cfg，即使内部多次 .await 也能保持链路上下文。'},
    {at:'tracing::info!(host = %cfg.host, port = cfg.port, "服务已启动");',text:'输出带结构化字段（host、port）的日志事件，方便接入日志平台按字段检索。'}
   ]
  },
  {
   title:'Cargo Workspace 与 Feature Flags',
   body:'项目代码超过几千行后，把所有逻辑堆在单个 crate 里会导致编译越来越慢、模块边界模糊。这时需要借助 Cargo 的两大工程化利器：\n一、Cargo Workspace（工作区）：在仓库根目录放一个声明 [workspace] 的 Cargo.toml，把项目拆成多个职责清晰的子 crate（如 crates/domain、crates/storage、crates/server）。它的核心收益有四点：所有成员共享同一份 Cargo.lock（彻底消除依赖版本漂移）；共用根目录的 target/ 编译缓存（公共依赖只需编一次）；用 [workspace.dependencies] 在根文件集中管理版本号，子 crate 只需写 serde.workspace = true；改一个底层模块时只重编受影响的 crate，显著提升增量与并行编译速度。\n二、Feature Flags（特性开关）：在 Cargo.toml 的 [features] 里声明可选功能与可选依赖，配合代码里的 #[cfg(feature = "...")] 做条件编译，让用户按需启用，避免把不用的重型依赖编进最终二进制。\n使用 Feature Flags 必须守住一条铁律——可叠加性（Additive）：Cargo 在解析整个依赖树时，如果 A 依赖启用了某 crate 的特性 x，B 依赖启用了特性 y，Cargo 会把它们合并成同时开启 x 和 y（称为 Feature Unification 特性统一）。因此开启任意一个特性都应该只是“增量开启能力”，绝不能设计彼此冲突互斥的 feature，也不要让开启某 feature 导致原有 API 消失或编译失败。',
   code:`# 根目录 Cargo.toml（工作区配置）
[workspace]
resolver = "3"
members = ["crates/core", "crates/server"]

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }

# crates/core/Cargo.toml 中的特性声明
[features]
default = ["json"]
json = ["dep:serde_json"]
metrics = []

// crates/core/src/lib.rs 中按特性条件编译
#[cfg(feature = "metrics")]
pub fn record_metric(name: &str) {
    println!("metric: {name}");
}`,
   explain:[
    {at:'[workspace]',text:'声明这是一个多 crate 工作区，统一协调所有子包。'},
    {at:'resolver = "3"',text:'指定最新的特性解析器版本（Rust 2024 默认启用），避免构建依赖与目标依赖的特征意外互相污染。'},
    {at:'members = ["crates/core", "crates/server"]',text:'列出工作区包含的所有子 crate 路径，它们共享同一份 Cargo.lock 和 target 目录。'},
    {at:'[workspace.dependencies]',to:'serde = { version = "1", features = ["derive"] }',text:'在工作区根部集中锁定公共依赖的版本与特性，各子 crate 只需继承引用即可。'},
    {at:'[features]',to:'metrics = []',text:'定义可选特性：default 指定默认开启 json；dep:serde_json 表示仅在开启 json 特性时才引入可选依赖 serde_json；metrics 是一个纯条件编译开关。'},
    {at:'#[cfg(feature = "metrics")]',to:'println!("metric: {name}");',text:'只有当用户启用了 metrics 特性时，这段代码才会被编译进产物；不启用时零代码体积、零运行开销。'}
   ]
  },
  {
   title:'编译优化与发布调优：[profile.release]',
   body:'cargo build --release 默认开启了 opt-level = 3，但面向线上高吞吐服务或嵌入式/命令行分发产物时，我们常在 Cargo.toml 的 [profile.release] 里进一步权衡“编译速度、运行性能、二进制体积”这个不可能三角：\n一、opt-level：控制优化级别。3 是默认最高运行速度优化；"s" 偏重缩小二进制体积；"z" 极致压缩体积（常用于 WASM 或嵌入式，会关闭循环向量化等体积换速度的优化）；\n二、lto（Link-Time Optimization，链接时优化）：普通编译只在一个 crate 内部做内联和优化，开启 LTO 后 LLVM 可以跨越 crate 边界做全局内联与死代码消除。lto = "thin" 支持并行 LTO，性能接近完全 LTO 而编译耗时温和，是线上服务的常见首选；lto = true（或 "fat"）最彻底但也最慢；\n三、codegen-units = 1：Cargo 默认把每个 crate 拆成 16 个代码生成单元并行交给 LLVM 编译；改为 1 会牺牲编译并行度，但能让优化器看见完整模块、生成更快的机器码；\n四、strip = true（等价于 "symbols"）：从最终可执行文件里剥离调试符号和符号表，体积经常能直接减半；注意如果线上崩了需要回溯可读堆栈，可以改用 strip = "debuginfo" 或把调试符号单独归档；\n五、panic = "abort"：默认策略是 "unwind"（发生 panic 时逐层展开调用栈并执行每个变量的 Drop 清理，还能被 catch_unwind 捕获）。改为 "abort" 后遇到 panic 直接中止进程，省去整套栈展开表，体积更小、代码略快，代价是不再运行 Drop 且无法捕获 panic。',
   code:`[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
strip = "symbols"
panic = "abort"`,
   explain:[
    {at:'[profile.release]',text:'定制 cargo build --release 的编译优化配置小节。'},
    {at:'opt-level = 3',text:'按最高运行速度做优化；若目标是 WASM 或超小 CLI，可改为 "s" 或 "z"。'},
    {at:'lto = "thin"',text:'开启并行链接时优化，允许跨 crate 内联并删掉未调用代码，兼顾运行性能与编译耗时。'},
    {at:'codegen-units = 1',text:'放弃单 crate 内部并行代码生成，换取 LLVM 最大化的全局优化视野。'},
    {at:'strip = "symbols"',text:'剥离二进制中的符号表与调试信息，大幅减小发布包体积。'},
    {at:'panic = "abort"',text:'把默认的栈展开（unwind）改为直接中止进程，省掉栈展开元数据，但 panic 时不会执行 Drop。'}
   ]
  },
  {
   title:'工程质量保障清单：格式化、Lint、Miri 与剖析',
   body:'把 Rust 项目带到生产环境，光靠编译器能过还不够，成熟团队通常会把以下四道质量防线固化进本地工作流和 CI 流水线：\n一、统一风格（rustfmt）：在 CI 里运行 cargo fmt --all -- --check。格式不符直接红灯，让代码评审精力全部放在逻辑与架构上，彻底消灭缩进和换行争论；\n二、严格静态检查（Clippy）：运行 cargo clippy --workspace --all-targets -- -D warnings，把所有警告升级为编译错误。Clippy 能自动揪出多余的 .clone()、可简化的迭代器链、低效的字符串拼接、潜在溢出和可疑的锁持有跨越 .await 等隐患；\n三、未定义行为检测（Miri）：只要项目里写了 unsafe 代码，就应当在 CI 里跑 cargo +nightly miri test。Miri 是 Rust 中间表示（MIR）的解释器，会在测试执行时严密跟踪每一块内存的初始化状态、边界、对齐与借用别名（Stacked/Tree Borrows），能抓出普通测试完全跑不出来的隐藏 UB 与内存泄漏；\n四、先测量、再优化（Criterion 与火焰图）：性能优化切忌凭感觉乱改。微观函数对比用 criterion crate 写统计严谨的基准测试（cargo bench，自动预热、消除抖动并标出回归百分比）；宏观服务定位 CPU 热点则用火焰图（cargo flamegraph / perf），先确认 80% 的时间花在哪一行，再针对性地落地零拷贝、数据结构优化或发布参数调优。',
   code:`cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo +nightly miri test
cargo bench`,
   explain:[
    {at:'cargo fmt --all -- --check',text:'检查工作区全部代码是否符合统一格式，不自动改写文件，有偏差就返回非零退出码拦截 CI。'},
    {at:'cargo clippy --workspace --all-targets -- -D warnings',text:'对工作区所有目标（库、主程序、测试、示例）运行 Clippy，并将任何警告视为错误。'},
    {at:'cargo test --workspace',text:'运行整个工作区的单元测试、集成测试与文档测试（doc tests）。'},
    {at:'cargo +nightly miri test',text:'在 Miri 解释器下执行测试，专门捕获 unsafe 代码中的越界、悬垂、别名违规、数据竞争与内存泄漏。'},
    {at:'cargo bench',text:'运行基准测试（通常配合 criterion），用量化数据验证性能优化是否真的生效、有没有引入性能回退。'}
   ]
  }
 ],
 quiz:[
  {
   id:'rust-engineering-1',
   q:'结构体 struct S { a: u8, b: u32, c: u8 } 分别采用默认布局和 #[repr(C)] 时，占用的字节数分别是多少？',
   options:[
    '默认 12 字节，#[repr(C)] 8 字节',
    '默认 8 字节，#[repr(C)] 12 字节',
    '默认 6 字节，#[repr(C)] 6 字节',
    '默认 12 字节，#[repr(C)] 12 字节'
   ],
   why:[
    '说反了：默认布局会重排字段减少填充，#[repr(C)] 才保留声明顺序导致更多填充。',
    '',
    '由于 u32 要求 4 字节对齐，结构体总大小必须是 4 的倍数，不加 packed 不可能是 6 字节。',
    '默认 repr(Rust) 会自动把 u32 挪到前面、两个 u8 放一起，省掉 4 字节填充，不是 12 字节。'
   ],
   answer:1,
   explain:'默认 repr(Rust) 把字段重排为 (b: u32, a: u8, c: u8) + 2 字节填充 = 8 字节；#[repr(C)] 按声明顺序 a(1)+pad(3)+b(4)+c(1)+pad(3) = 12 字节。'
  },
  {
   id:'rust-engineering-2',
   q:'在 64 位平台上，为什么 Option<Box<i32>> 和 Box<i32> 一样只占 8 字节，而不是 16 字节？',
   options:[
    'Box 把 None 标记额外藏在堆内存头部',
    '编译器把 i32 和标记位打包进同一寄存器',
    'Option 在 64 位下默认忽略对齐填充字节',
    'Box 指针非空，空指针 0 用来表示 None'
   ],
   why:[
    'None 根本不分配堆内存，不存在“藏在堆头部”的说法。',
    'Box<i32> 本身只是一个 8 字节指针，i32 存放在堆上，不是打包进同一寄存器。',
    'Option 依然严格遵守内存对齐规则，省空间靠的是空位优化而不是忽略对齐。',
    ''
   ],
   answer:3,
   explain:'这就是 Niche Optimization（空指针优化）：Box<T> 和 &T 的合法值不可能为 0，编译器用 0 这个无效位模式表示 None，省去额外的判别标签。'
  },
  {
   id:'rust-engineering-3',
   type:'judge',
   q:'Option<NonZeroU32> 的大小与 u32 相同（4 字节），而 Option<u32> 通常占 8 字节。',
   answer:true,
   explain:'NonZeroU32 不允许为 0，编译器用 0 表示 None，因此只需 4 字节；而 u32 的全部位模式都是合法值，Option<u32> 需要额外标签加对齐填充共占 8 字节。'
  },
  {
   id:'rust-engineering-4',
   q:'在循环里逐行拼接日志文本时，把 String::with_capacity(128) 放在循环外并在每轮调用 buf.clear()，主要收益是什么？',
   options:[
    '清空长度但保留容量，避免每轮重新堆分配',
    '把字符串数据转移到栈上，跳过 UTF-8 校验',
    '让 buf 自动释放底层内存并立即归还系统',
    '启用多线程并行写入，加快终端标准输出'
   ],
   why:[
    '',
    'String 的底层字节缓冲区仍在堆上，且依然严格保证 UTF-8 有效。',
    'clear() 并不会释放底层堆内存，恰恰是靠“不释放”来实现容量复用。',
    '复用局部 String 与多线程并发无关，收益来自减少堆分配次数。'
   ],
   answer:0,
   explain:'String::clear() 将 len 置 0 但保留已申请的 capacity，配合 write! 就地写入可以显著降低热路径上的堆分配频率。'
  },
  {
   id:'rust-engineering-5',
   type:'fill',
   q:'零拷贝场景下，如果多数时候只需借用 &str、少数需要修改时才分配新 String，标准库 std::borrow 提供的枚举类型是＿（填类型名，不含泛型参数）。',
   accepted:['Cow','std::borrow::Cow'],
   explain:'Cow（Clone-on-Write，写时克隆）有 Borrowed 和 Owned 两种变体，在只读热路径零分配，仅需修改时才拥有堆副本。'
  },
  {
   id:'rust-engineering-6',
   q:'按 Rust 社区主流工程实践，编写对外发布的库（Library Crate）与编写应用入口时，错误处理的经典搭配是？',
   options:[
    '库代码用 anyhow，应用入口用 thiserror',
    '库代码和应用入口都直接返回 String 错误',
    '库代码用 thiserror，应用入口用 anyhow',
    '库代码和应用入口都用 panic! 向上传播'
   ],
   why:[
    '搭配反了：库代码应提供可供调用方 match 的结构化枚举，应用入口才用 anyhow 统一收口。',
    '直接返回 String 丢失了结构化错误类型和底层错误链，不利于调用方按类型恢复。',
    '',
    'panic! 只适合不可恢复的逻辑缺陷，常规业务和 IO 错误应通过 Result 传播。'
   ],
   answer:2,
   explain:'库代码用 thiserror 定义结构化错误枚举便于调用方精细处理；应用入口用 anyhow 统一承接各种错误并用 .context() 附加可读上下文。'
  },
  {
   id:'rust-engineering-7',
   type:'multi',
   q:'使用 Cargo Workspace（工作区）管理多 crate 项目可以带来哪些工程收益？（多选）',
   options:[
    '多个子 crate 共享同一份 Cargo.lock 锁定依赖版本',
    '所有成员共用根目录 target 避免重复编译公共依赖',
    '通过 [workspace.dependencies] 集中维护依赖版本号',
    '按职责拆分为多个子 crate，有利于增量并行编译'
   ],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'Cargo Workspace 的四大核心优势正是统一锁文件、共享编译产物缓存、集中声明公共依赖版本，以及通过模块化拆分加速增量和并行编译。'
  },
  {
   id:'rust-engineering-8',
   type:'judge',
   q:'Cargo 的 Feature Flags 适合设计两个彼此互斥的开关（开了 A 就让 B 编译报错），因为 Cargo 会隔离不同依赖启用的特性。',
   answer:false,
   explain:'Cargo 会对依赖树中同一 crate 在各处启用的特性做并集统一（Feature Unification），不会互相隔离。因此特性设计必须满足可叠加性（Additive），不应设计互斥开关。'
  },
  {
   id:'rust-engineering-9',
   q:'在 [profile.release] 中开启 lto = "thin" 和 codegen-units = 1 的主要作用与代价分别是？',
   options:[
    '跳过借用检查并减小内存占用，代价是失去类型安全',
    '允许跨 crate 深度内联优化，代价是发布编译耗时增加',
    '自动启用多线程并行运行业务，代价是程序体积翻倍',
    '保留全部源码行号便于调试，代价是运行时显著变慢'
   ],
   why:[
    '发布优化配置不会跳过借用检查，更不会破坏 Rust 的类型与内存安全。',
    '',
    'LTO 与 codegen-units 优化的是单指令/内联效率并常能减小体积，不会自动把业务改成多线程。',
    '保留源码行号由 debug 选项控制，lto 与 codegen-units = 1 是为了加快运行速度而非变慢。'
   ],
   answer:1,
   explain:'LTO 让 LLVM 跨 crate 内联和消除死代码，codegen-units = 1 扩大了单次优化视野，代价是发布构建时间变长。'
  },
  {
   id:'rust-engineering-10',
   q:'在 Rust 工程生态中，以下哪一组“需求 → 主流 Crate”对应关系最准确？',
   options:[
    '命令行参数解析 → serde，序列化 → clap',
    '异步运行时 → criterion，基准测试 → tokio',
    '结构化日志追踪 → reqwest，HTTP 客户端 → tracing',
    '序列化 → serde，异步 Web 框架 → axum'
   ],
   why:[
    '两个写反了：serde 负责序列化/反序列化，clap 负责命令行参数解析。',
    '两个写反了：tokio 是异步运行时，criterion 是基准测试框架。',
    '两个写反了：tracing 负责结构化日志与链路追踪，reqwest 是 HTTP 客户端。',
    ''
   ],
   answer:3,
   explain:'生产生态的常见分工：serde 序列化、tokio 异步运行时、axum Web 框架、reqwest HTTP 客户端、tracing 日志追踪、clap 命令行解析、criterion 基准测试。'
  },
  {
   id:'rust-engineering-11',
   type:'multi',
   q:'关于 Rust 工程质量与发布工具，下面哪些说法是正确的？（多选）',
   options:[
    'cargo clippy -- -D warnings 可在 CI 中将警告视作失败',
    'cargo fmt 会在编译时自动修复代码里的逻辑错误',
    'Miri 能在测试运行期捕获 unsafe 代码中的未定义行为',
    'panic = "abort" 会在程序崩掉前依次执行栈上变量的 Drop'
   ],
   why:[
    '',
    'cargo fmt 只负责统一代码排版风格，不会分析或修复业务逻辑错误。',
    '',
    'panic = "abort" 会跳过栈展开直接中止进程，因此不会执行栈上变量的 Drop；执行 Drop 的是默认策略 unwind。'
   ],
   answers:[0,2],
   explain:'Clippy 配合 -D warnings 是 CI 拦住代码坏味道的标配；Miri 是检测 unsafe 潜在 UB 的核心利器。'
  },
  {
   id:'rust-engineering-12',
   type:'fill',
   q:'在 [profile.release] 中将 panic 设为 "abort" 会跳过栈展开，而 Rust 默认执行栈展开并运行 Drop 的策略值是＿（填英文词，不含引号）。',
   accepted:['unwind'],
   explain:'默认策略为 panic = "unwind"，遇到 panic 时沿调用栈逐层回退并调用局部变量的 Drop；设为 "abort" 则直接终止进程以减小二进制体积。'
  },
  {
   id:'rust-engineering-13',
   type:'short',
   q:'在高频调用的 Rust 服务中，有哪些不依赖 unsafe 就能明显降低堆分配与拷贝开销的工程实践？请至少列出四条并简要说明原理。',
   reference:'一、零拷贝借用：解析数据时优先用 &str、&[u8] 切片直接指向原始缓冲区，偶尔需要修改时再用 Cow<\'a, str> 实现写时克隆，避免每个字段都分配 String。二、容量预分配：对已知或可估算长度的容器用 Vec::with_capacity / String::with_capacity 一次性申请空间，避免反复 2 倍扩容搬运。三、复用缓冲区：在循环外保留 String 或 Vec，每轮用 .clear() 清零长度但保留容量，配合 write! 就地写入。四、克制 .clone()：优先传引用或移动所有权，多处共享只读大对象时用 Arc<T> / Arc<str> 替代深拷贝。五、优化数据结构大小（如利用 NonZero*、#[repr(Rust)] 字段紧凑布局）减少内存占用并提升缓存命中率。',
   points:[
    '零拷贝借用：用 &str / &[u8] 切片或 Cow 代替无脑分配副本',
    '容量预分配：用 with_capacity 减少集合反复扩容与搬运',
    '缓冲区复用：循环外创建 String / Vec，每轮 clear() 保留容量复用',
    '避免多余 clone：优先传引用/移动所有权，或用 Arc<T> 共享只读数据'
   ],
   explain:'落地这些技巧前，应先用 Criterion 基准测试和火焰图找出真正的热点路径，避免过早优化。'
  },
  {
   id:'rust-engineering-14',
   type:'code',
   q:'定义一个零拷贝结构体 Pair<\'a> { key: &\'a str, val: &\'a str }，并编写函数 parse_pair(line: &str) -> Option<Pair<\'_>>：按第一个 \'=\' 拆分键值对并去掉两端空白，若缺少 \'=\' 或键为空则返回 None，要求全程零堆分配。再写出 main 测试 " host = 127.0.0.1 " 和 "invalid" 并打印结果。',
   reference:'#[derive(Debug)]\nstruct Pair<\'a> {\n    key: &\'a str,\n    val: &\'a str,\n}\n\nfn parse_pair(line: &str) -> Option<Pair<\'_>> {\n    let (k, v) = line.split_once(\'=\')?;\n    let key = k.trim();\n    if key.is_empty() {\n        return None;\n    }\n    Some(Pair {\n        key,\n        val: v.trim(),\n    })\n}\n\nfn main() {\n    if let Some(p) = parse_pair(" host = 127.0.0.1 ") {\n        println!("{} => {}", p.key, p.val);\n    }\n    println!("{:?}", parse_pair("invalid"));\n}',
   points:[
    '定义带生命周期参数 \'a 的结构体 Pair<\'a>，字段 key 和 val 均为 &\'a str',
    '使用 split_once(\'=\') 按第一个等号零拷贝拆分，并用 ? 处理缺少等号的情况',
    '对键值调用 trim() 并检查 key.is_empty()，键为空时返回 None',
    '全程不分配 String，main 中验证有效行与无效行并输出结果'
   ],
   explain:'split_once 和 trim 都只返回原字符串的切片视图，没有任何堆分配；返回类型 Option<Pair<\'_>> 借助生命周期省略自动绑定到输入 line。'
  }
 ]
};
