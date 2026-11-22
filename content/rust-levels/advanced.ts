import type {AiLevel} from '../journey';

// Rust 高级（第 11–13 关）：智能指针与内部可变性、并发编程、异步编程。
const rustSteps=[
 '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
 '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
 '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
 '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
];

export const rustSmartPtr:AiLevel={
 id:'rust-smart-ptr',
 title:'智能指针与内部可变性',
 summary:'Box<T>、Deref 与 Drop、Rc<T>、RefCell<T>、Weak<T> 防循环引用与 Cow 写时克隆',
 lessons:[
  {
   title:'什么是智能指针：指针 + 元数据 + 额外能力',
   body:'之前用过的普通引用 &T 和 &mut T 只是“借用”数据：它们本质上就是指向某块内存的地址，不包含额外信息，也不拥有数据。\n智能指针（Smart Pointer）是一类表现得像指针的数据结构，但比普通引用多两样东西：一是附带元数据（比如长度、容量、引用计数）和额外能力；二是大多数智能指针都**拥有**它们指向的数据，而不只是借用。\n其实你早就用过两种最常见的智能指针：\n一、String：栈上存着指向堆字节缓冲区的指针、当前长度 len 和容量 capacity，离开作用域时自动释放堆内存；\n二、Vec<T>：同样由堆指针、长度和容量组成，负责管理一整块连续的堆数组。\n智能指针在 Rust 里通常用结构体实现，之所以“智能”，核心靠两个标准库 Trait：\n一、Deref：让结构体可以像普通引用那样用 * 解引用，也能直接调用底层目标类型的方法；\n二、Drop：让结构体在离开作用域时自动运行清理代码，释放内存、关闭文件或归还锁。\n这一关把标准库里最常用的智能指针 Box<T>、Rc<T>、RefCell<T>、Cell<T>、Weak<T> 和 Cow<\'a, T> 一次讲透。',
  },
  {
   title:'Box<T>：把数据放到堆上',
   body:'Box<T> 是最直接的智能指针：它把值放到堆上，栈上只留下一个指向堆的指针。除了多一次堆分配外，没有任何额外的运行时开销。\n日常开发里，Box<T> 主要解决三个问题：\n一、定义编译期大小未知的递归类型：Rust 必须在编译时算出每个类型占多少字节。像链表 enum List { Cons(i32, List), Nil } 自己包含自己，大小会无限展开，编译器会报错 recursive type has infinite size。把内层改成 Box<List> 后，指针大小是固定的（64 位机器上占 8 字节），类型体积立刻确定；\n二、转移超大数据的所有权：如果一个结构体在栈上占几 KB，直接移动它要按字节整块拷贝；装进 Box 后，移动只拷贝一个 8 字节指针；\n三、存放 Trait 对象 Box<dyn Trait>：不同具体类型的大小各不相同，不能直接放进同一个 Vec，用 Box<dyn Display> 统一包成相同大小的胖指针就能一起存放。',
   code:`use std::fmt::Display;

enum List {
    Cons(i32, Box<List>),
    Nil,
}

fn demo() {
    let node = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));
    let items: Vec<Box<dyn Display>> = vec![Box::new(42), Box::new("Rust")];
    println!("共有 {} 个异构元素", items.len());
    drop(node);
}`,
   explain:[
    {at:'use std::fmt::Display;',text:'引入标准库的 Display Trait，凡是能用 {} 打印的类型都实现了它。'},
    {at:'enum List {',to:'Nil,',text:'经典递归链表：Cons 保存当前整数和指向下一节点的 Box<List>，Nil 表示链表末尾。因为 Box 是固定大小的指针，编译器能算出 List 的大小。'},
    {at:'fn demo() {',text:'示例函数。'},
    {at:'let node =',text:'用 Box::new 把每一层节点分配到堆上，构造出 1 -> 2 -> Nil 的链表。'},
    {at:'let items: Vec<Box<dyn Display>>',text:'用 Box<dyn Display> 把整数 42 和字符串切片 "Rust" 这两种不同类型放进同一个 Vec。'},
    {at:'println!("共有 {} 个异构元素", items.len());',text:'打印元素个数 2。'},
    {at:'drop(node);',text:'释放链表时，外层 Box 会自动递归释放内层所有节点，不会泄漏内存。'},
   ],
  },
  {
   title:'Deref 与隐式解引用强制转换（Deref Coercion）',
   body:'实现了 std::ops::Deref 的智能指针可以用 *x 取值。编译器遇到 *x 时，实际上会把它展开成 *(x.deref())：先调用 deref(&self) -> &Self::Target 拿到普通引用，再对普通引用解引用。\n更重要的是，Deref 带来了**解引用强制转换（Deref Coercion）**——这是让 Rust 代码写起来顺手的关键机制：\n当函数或方法期望的参数类型是 &U，而你传入的是 &T，只要 T 实现了 Deref<Target = U>，编译器就会在编译期自动插入 .deref() 调用，而且可以连续转多层。\n比如：\n一、String 实现了 Deref<Target = str>，所以可以把 &String 直接传给接收 &str 的函数；\n二、Vec<T> 实现了 Deref<Target = [T]>，所以 &Vec<i32> 能直接传给接收 &[i32] 的函数；\n三、如果 MyBox<T> 实现了 Deref<Target = T>，那么 &MyBox<String> 会自动连续转换：&MyBox<String> -> &String -> &str！\n整个过程完全在编译期完成，零运行时开销。可变版本由 DerefMut 负责：&mut T 可以转成 &mut U，也可以降级转成 &U；但不可变引用 &T 不能转成 &mut U，否则会破坏借用规则。',
   code:`use std::ops::Deref;

struct MyBox<T>(T);

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn hello(name: &str) {
    println!("Hello, {name}!");
}

fn use_my_box() {
    let m = MyBox(String::from("Rust"));
    hello(&m);
}`,
   explain:[
    {at:'use std::ops::Deref;',text:'引入 Deref Trait。'},
    {at:'struct MyBox<T>(T);',text:'定义一个极简的元组结构体，演示自定义智能指针如何实现解引用。'},
    {at:'impl<T> Deref for MyBox<T> {',text:'为任意泛型 T 的 MyBox<T> 实现 Deref。'},
    {at:'type Target = T;',text:'关联类型 Target 指定解引用后的目标类型就是里面的 T。'},
    {at:'fn deref(&self) -> &Self::Target {',to:'&self.0',text:'返回内部值 self.0 的引用；这里返回引用而不是直接移出值，避免了所有权被意外拿走。'},
    {at:'fn hello(name: &str) {',to:'println!("Hello, {name}!");',text:'只接收 &str 的普通函数。'},
    {at:'fn use_my_box() {',text:'调用演示函数。'},
    {at:'let m = MyBox(String::from("Rust"));',text:'把 String 包进 MyBox。'},
    {at:'hello(&m);',text:'编译器自动把 &MyBox<String> 连续解引用强制转换成 &String，再转换成 &str，不需要手写 &(*m)[..]。'},
   ],
  },
  {
   title:'Drop Trait 与 RAII：离开作用域自动清理',
   body:'Rust 用 **RAII**（Resource Acquisition Is Initialization，资源获取即初始化）管理一切资源：内存、文件句柄、网络连接、互斥锁都绑定在变量上，变量离开作用域时，编译器自动插入 Drop::drop(&mut self) 的调用，确保资源确定性地归还。\n关于 Drop，有三条必须牢记的规则：\n一、**逆序释放**：同一个作用域里声明的多个变量，离开作用域时按声明的**相反顺序**（后进先出）调用 drop——因为后声明的变量可能依赖先声明的变量；\n二、**不能手动调 x.drop()**：如果允许你显式写 x.drop()，离开作用域时编译器还会再自动调一次，就会造成“二次释放”（double free），所以 Rust 直接在编译期禁止显式调用 Drop::drop；\n三、**想提前释放用 std::mem::drop(x)**：它已经默认引入（直接写 drop(x) 即可），其实现非常简单：pub fn drop<T>(_x: T) {}。它通过拿走 x 的所有权并在函数结束时自然释放，外部之后再也无法访问 x，彻底避免二次释放。',
   code:`struct FileGuard(&'static str);

impl Drop for FileGuard {
    fn drop(&mut self) {
        println!("自动关闭：{}", self.0);
    }
}

fn demo_drop() {
    let a = FileGuard("日志A");
    let b = FileGuard("日志B");
    drop(a);
    println!("a 已提前关闭，准备离开作用域");
    let _keep = b;
}`,
   explain:[
    {at:'struct FileGuard(&\'static str);',text:'模拟一个持有文件资源的守卫类型，存着名字方便观察何时释放。'},
    {at:'impl Drop for FileGuard {',to:'println!("自动关闭：{}", self.0);',text:'实现 Drop Trait，离开作用域或被 drop 时打印日志。'},
    {at:'fn demo_drop() {',text:'示例函数。'},
    {at:'let a = FileGuard("日志A");',text:'先创建资源 a。'},
    {at:'let b = FileGuard("日志B");',text:'再创建资源 b。如果不提前释放，正常会先释放 b 再释放 a。'},
    {at:'drop(a);',text:'调用 std::mem::drop 提前把 a 的所有权移走并立刻释放，此时立即打印“自动关闭：日志A”。'},
    {at:'println!("a 已提前关闭，准备离开作用域");',text:'此时 a 已经失效不能再用，但 b 仍然活着。'},
    {at:'let _keep = b;',text:'把 b 移入 _keep；函数末尾 _keep 离开作用域，才打印“自动关闭：日志B”。'},
   ],
  },
  {
   title:'动手试试：Box 递归链表与自定义 Deref / Drop',
   body:'把前面学的 Box 递归类型、自定义 Deref 强制转换和 Drop 释放顺序放到一个完整程序里跑一遍。注意观察 g2 被 drop(g2) 提前释放后，剩下 g1 和 g3 在 main 结束时的释放顺序。',
   practice:{
    steps:[
     ...rustSteps,
     '把 drop(g2); 这一行删掉，重新运行 cargo run，观察三个 Guard 按什么顺序释放。',
     '试着把 drop(g2); 改成 g2.drop(); 再运行，读一读编译器关于 explicit destructor calls 的报错说明，看完改回来。',
    ],
    expect:'链表元素总和：60\n你好，Ferris！\n释放：第二个资源\n手动释放 g2 后，剩下的有：第一个资源、第三个资源\n释放：第三个资源\n释放：第一个资源',
   },
   code:`use std::ops::Deref;

enum List {
    Cons(i32, Box<List>),
    Nil,
}

fn sum(list: &List) -> i32 {
    match list {
        List::Cons(head, tail) => head + sum(tail),
        List::Nil => 0,
    }
}

struct MyBox<T>(T);

impl<T> Deref for MyBox<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

struct Guard(&'static str);

impl Drop for Guard {
    fn drop(&mut self) {
        println!("释放：{}", self.0);
    }
}

fn greet(name: &str) {
    println!("你好，{name}！");
}

fn main() {
    let list = List::Cons(10, Box::new(List::Cons(20, Box::new(List::Cons(30, Box::new(List::Nil))))));
    println!("链表元素总和：{}", sum(&list));

    let boxed_name = MyBox(String::from("Ferris"));
    greet(&boxed_name);

    let g1 = Guard("第一个资源");
    let g2 = Guard("第二个资源");
    let g3 = Guard("第三个资源");
    drop(g2);
    println!("手动释放 g2 后，剩下的有：{}、{}", g1.0, g3.0);
}`,
   explain:[
    {at:'use std::ops::Deref;',text:'引入 Deref Trait。'},
    {at:'enum List {',to:'Nil,',text:'用 Box<List> 解决递归类型的大小问题。'},
    {at:'fn sum(list: &List) -> i32 {',to:'List::Nil => 0,',text:'递归遍历链表：遇到 Cons 就把当前值和后半段的和相加；tail 是 &Box<List>，通过 Deref 自动转成 &List 传给 sum。'},
    {at:'struct MyBox<T>(T);',text:'自定义包装类型。'},
    {at:'impl<T> Deref for MyBox<T> {',to:'&self.0',text:'实现 Deref，让 &MyBox<T> 可以自动解引用成 &T。'},
    {at:'struct Guard(&\'static str);',text:'带名字的守卫类型，用来观察释放时机。'},
    {at:'impl Drop for Guard {',to:'println!("释放：{}", self.0);',text:'释放时打印自身标签。'},
    {at:'fn greet(name: &str) {',to:'println!("你好，{name}！");',text:'接收 &str 的问候函数。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let list = List::Cons',text:'构造 10 -> 20 -> 30 -> Nil 的堆链表。'},
    {at:'println!("链表元素总和：{}", sum(&list));',text:'递归求和得到 60。'},
    {at:'let boxed_name = MyBox(String::from("Ferris"));',text:'把 String 装进 MyBox。'},
    {at:'greet(&boxed_name);',text:'触发两级解引用强制转换：&MyBox<String> -> &String -> &str。'},
    {at:'let g1 = Guard("第一个资源");',to:'let g3 = Guard("第三个资源");',text:'依次创建三个资源 g1、g2、g3。'},
    {at:'drop(g2);',text:'用标准库函数提前释放 g2，立即打印“释放：第二个资源”。'},
    {at:'println!("手动释放 g2 后，剩下的有：{}、{}", g1.0, g3.0);',text:'此时 g1 和 g3 仍有效；这行结束后 main 退出，按声明逆序先释放 g3 再释放 g1。'},
   ],
  },
  {
   title:'Rc<T>：单线程多所有权引用计数',
   body:'所有权默认规定“一个值同一时刻只有一个所有者”。但实际场景里经常遇到“一份数据被多处共同拥有”：比如图结构里多条边指向同一个节点，或者多个组件共享同一份配置，谁先销毁不确定，必须等最后一个使用者也退出后才释放内存。\n这时就用 std::rc::Rc<T>（Reference Counted，引用计数智能指针）：\n一、Rc::new(val) 把数据放到堆上，并附带一个强引用计数（初始为 1）；\n二、Rc::clone(&a) 不会深拷贝数据，只是把强引用计数加 1，返回一个新的 Rc 指针，开销极小（社区习惯写 Rc::clone(&a) 而不是 a.clone()，一眼就能看出它只是加计数而非昂贵深拷贝）；\n三、每当一个 Rc 离开作用域，Drop 会把计数减 1；只有计数归零时，堆上的 T 才真正被清理；\n四、Rc::strong_count(&a) 可以随时查看当前有多少个所有者。\n两个关键限制：\n一、只读共享：Rc<T> 只实现 Deref 而不实现 DerefMut，默认不能通过它直接修改内部数据（否则多个所有者同时改会破坏借用规则）；\n二、仅限单线程：它内部用普通非原子整数增减计数，跨线程传递会导致数据竞争，因此编译器直接禁止把 Rc 发到别的线程（多线程要用下一关的 Arc<T>）。',
   code:`use std::rc::Rc;

fn demo_rc() {
    let shared = Rc::new(String::from("全局主题：深色"));
    println!("初始计数：{}", Rc::strong_count(&shared));

    let view_a = Rc::clone(&shared);
    {
        let view_b = Rc::clone(&shared);
        println!("三个所有者时计数：{}", Rc::strong_count(&shared));
        println!("视图 B 读到：{view_b}");
    }
    println!("view_b 释放后计数：{}", Rc::strong_count(&view_a));
}`,
   explain:[
    {at:'use std::rc::Rc;',text:'Rc 不在默认 prelude 里，需要手动从 std::rc 引入。'},
    {at:'fn demo_rc() {',text:'示例函数。'},
    {at:'let shared = Rc::new(String::from("全局主题：深色"));',text:'在堆上创建共享字符串，此时强引用计数为 1。'},
    {at:'println!("初始计数：{}", Rc::strong_count(&shared));',text:'打印计数 1。注意 strong_count 接收引用 &shared，本身不会增加计数。'},
    {at:'let view_a = Rc::clone(&shared);',text:'克隆一个新指针，不复制字符串内容，强引用计数变为 2。'},
    {at:'let view_b = Rc::clone(&shared);',text:'在内层作用域再克隆一份，计数变为 3。'},
    {at:'println!("三个所有者时计数：{}", Rc::strong_count(&shared));',text:'打印计数 3。'},
    {at:'println!("视图 B 读到：{view_b}");',text:'Rc 实现了 Display/Deref，可以直接读取内容。离开花括号时 view_b 被 drop，计数降回 2。'},
    {at:'println!("view_b 释放后计数：{}", Rc::strong_count(&view_a));',text:'通过任意一个存活的 Rc 看到的计数都是 2；函数结束时 view_a 和 shared 都释放，计数归零，字符串销毁。'},
   ],
  },
  {
   title:'内部可变性：RefCell<T> 与 Cell<T>',
   body:'有时候你手上只有一个不可变引用 &T（比如放进了 Rc<T>，或者实现某个签名固定为 &self 的 Trait 方法），却确实需要修改它里面的某个字段——比如记录缓存命中次数、在测试里往 Mock 对象里记录日志。\n这就是**内部可变性（Interior Mutability）**模式：对外暴露不可变接口，在内部借助运行时检查或值拷贝安全地修改数据。\n标准库提供两个单线程工具：\n一、**RefCell<T>**：把 Rust 的借用规则（“多不可变”或“单可变”）从**编译期推迟到运行期**检查。\n  • borrow() 返回智能指针 Ref<T>（不可变借用），可以同时存在多个；\n  • borrow_mut() 返回智能指针 RefMut<T>（可变借用），同一时刻只能有一个；\n  • 如果运行期同时存在可变借用和其他借用（比如借出后还没释放又再借一次），程序会立刻 **panic**（也可用 try_borrow_mut() 返回 Result 避免 panic）。\n二、**Cell<T>**：针对实现了 Copy 的小型类型（如 usize、bool）的零开销替代品。它不向外借出引用，而是直接用 get() 拷贝取值、set(v) 覆盖写值，没有借用计数，不会 panic。',
   code:`use std::cell::{Cell, RefCell};

fn demo_cell() {
    let hits = Cell::new(0usize);
    hits.set(hits.get() + 1);
    println!("命中次数：{}", hits.get());

    let logs = RefCell::new(vec!["启动"]);
    logs.borrow_mut().push("完成");
    println!("日志条数：{}", logs.borrow().len());
}`,
   explain:[
    {at:'use std::cell::{Cell, RefCell};',text:'从 std::cell 引入单线程内部可变容器 Cell 和 RefCell。'},
    {at:'fn demo_cell() {',text:'示例函数。'},
    {at:'let hits = Cell::new(0usize);',text:'注意 hits 前面没有写 mut，它是不可变变量。'},
    {at:'hits.set(hits.get() + 1);',text:'对 Copy 类型直接拷贝取出再写回新值，零运行时检查开销。'},
    {at:'println!("命中次数：{}", hits.get());',text:'打印 1。'},
    {at:'let logs = RefCell::new(vec!["启动"]);',text:'logs 同样没有声明为 mut，但内部 Vec 可以通过 RefCell 修改。'},
    {at:'logs.borrow_mut().push("完成");',text:'borrow_mut() 获取临时 RefMut 守卫并 push 元素，这一行分号结束时临时守卫立刻释放，归还可变借用。'},
    {at:'println!("日志条数：{}", logs.borrow().len());',text:'上一行的可变借用已释放，此时调用 borrow() 获取不可变借用安全无冲突，打印 2。'},
   ],
  },
  {
   title:'经典组合 Rc<RefCell<T>> 与 Weak<T> 防循环引用',
   body:'把 Rc<T>（多所有者）和 RefCell<T>（内部可变）嵌套起来，得到 **Rc<RefCell<T>>**：单线程里既允许多个所有者共同持有，又允许通过任意一个所有者修改里面的数据。\n但把它们组合在一起时，很容易踩进**循环引用（Reference Cycle）**的坑：如果 A 里用 Rc 强引用 B，B 里又通过 RefCell 存了指向 A 的 Rc，当外部变量全部离开作用域后，A 和 B 的强引用计数都还剩 1，永远不会归零，堆内存就泄漏了。\n（小提醒：Rust 保证内存安全——不悬垂、不越界、不数据竞争，但并不保证编译期彻底杜绝内存泄漏。）\n打破循环引用的标准武器是**弱引用 Weak<T>**：\n一、用 Rc::downgrade(&rc) 从强引用降级得到 Weak<T>，只增加 weak_count，不增加 strong_count；\n二、只要 strong_count 归零，数据立刻释放，不管还有多少个 Weak<T> 存在；\n三、Weak<T> 不能直接访问数据，使用前必须调用 weak.upgrade()，返回 Option<Rc<T>>：对象还活着就拿到 Some(rc)，已经释放就拿到 None，绝不会悬垂。\n实战口诀：树或双向结构里，**父节点用 Rc 拥有子节点，子节点用 Weak 指回父节点**。',
   code:`use std::rc::Rc;

fn demo_weak() {
    let strong = Rc::new(String::from("临时缓存"));
    let weak = Rc::downgrade(&strong);
    println!("释放前 upgrade：{:?}", weak.upgrade());
    drop(strong);
    println!("释放后 upgrade：{:?}", weak.upgrade());
}`,
   explain:[
    {at:'use std::rc::Rc;',text:'引入 Rc；Weak 由 Rc::downgrade 直接产出。'},
    {at:'fn demo_weak() {',text:'示例函数。'},
    {at:'let strong = Rc::new(String::from("临时缓存"));',text:'创建强引用，此时 strong_count = 1，weak_count = 0。'},
    {at:'let weak = Rc::downgrade(&strong);',text:'降级得到弱引用 Weak<String>，strong_count 仍为 1，weak_count 变为 1。'},
    {at:'println!("释放前 upgrade：{:?}", weak.upgrade());',text:'strong 还活着，upgrade() 返回 Some("临时缓存")。'},
    {at:'drop(strong);',text:'释放唯一的强引用，strong_count 归零，堆上的字符串立刻销毁。'},
    {at:'println!("释放后 upgrade：{:?}", weak.upgrade());',text:'此时再调用 upgrade() 安全返回 None，不会访问已释放内存。'},
   ],
  },
  {
   title:'动手试试：Rc<RefCell<T>> 共享修改与 Weak<T> 树节点',
   body:'用 Rc、RefCell 和 Weak 搭一个最小父子树节点结构：根节点用 Rc 拥有叶子节点，叶子节点用 Weak 指回根节点。运行程序观察强/弱引用计数的变化，以及根节点离开内层作用域后叶子节点能否安全感知父节点已被回收。',
   practice:{
    steps:[
     ...rustSteps,
     '为 Node 实现 Drop Trait（打印“销毁节点：{}”），重新运行，确认根节点确实在内层花括号结束时就被及时销毁，没有发生内存泄漏。',
     '试着在绑定父节点之前往 root.children.borrow_mut() 里再 push 一个新叶子，观察子节点数量和引用计数的变化。',
    ],
    expect:'初始时 leaf 父节点：None\n绑定后 root 强引用=1，弱引用=1\n此时 leaf 父节点：Some("根节点")\nroot 子节点数量：1\nroot 离开作用域后，leaf 父节点：None\nleaf 剩余强引用：1',
   },
   code:`use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    name: &'static str,
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    let leaf = Rc::new(Node {
        name: "叶子节点",
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });
    println!("初始时 leaf 父节点：{:?}", leaf.parent.borrow().upgrade().map(|n| n.name));

    {
        let root = Rc::new(Node {
            name: "根节点",
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![Rc::clone(&leaf)]),
        });
        *leaf.parent.borrow_mut() = Rc::downgrade(&root);
        println!(
            "绑定后 root 强引用={}，弱引用={}",
            Rc::strong_count(&root),
            Rc::weak_count(&root)
        );
        println!("此时 leaf 父节点：{:?}", leaf.parent.borrow().upgrade().map(|n| n.name));
        println!("root 子节点数量：{}", root.children.borrow().len());
    }

    println!("root 离开作用域后，leaf 父节点：{:?}", leaf.parent.borrow().upgrade().map(|n| n.name));
    println!("leaf 剩余强引用：{}", Rc::strong_count(&leaf));
}`,
   explain:[
    {at:'use std::cell::RefCell;',to:'use std::rc::{Rc, Weak};',text:'引入 RefCell、Rc 和 Weak。'},
    {at:'struct Node {',to:'children: RefCell<Vec<Rc<Node>>>,',text:'树节点定义：子节点列表用 Rc 表达“拥有”，父指针用 Weak 防止循环引用；两者都包在 RefCell 里以便节点建好后还能建立关联。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let leaf = Rc::new(Node {',to:'children: RefCell::new(vec![]),',text:'先创建叶子节点，parent 初始化为空弱引用 Weak::new()。'},
    {at:'println!("初始时 leaf 父节点',text:'空弱引用 upgrade() 返回 None。'},
    {at:'let root = Rc::new(Node {',to:'children: RefCell::new(vec![Rc::clone(&leaf)]),',text:'在内层作用域创建根节点，把 leaf 克隆一份放进 children，此时 leaf 强引用计数变为 2。'},
    {at:'*leaf.parent.borrow_mut() = Rc::downgrade(&root);',text:'借出 leaf.parent 的可变引用，写入 root 的弱引用。root 的强引用仍为 1，弱引用变为 1。'},
    {at:'println!(',to:'Rc::weak_count(&root)',text:'打印 root 的强引用=1、弱引用=1，验证弱引用不会拉高强引用计数。'},
    {at:'println!("此时 leaf 父节点',text:'此时 root 仍活着，upgrade() 返回 Some(Rc<Node>)，map 取出名字得到 Some("根节点")。'},
    {at:'println!("root 子节点数量',text:'通过 borrow() 读取 children 长度，为 1。离开花括号时 root 强引用归零被释放，顺带释放其 children 里的那份 leaf 克隆。'},
    {at:'println!("root 离开作用域后',text:'root 已经销毁，leaf 的弱引用 upgrade() 自动返回 None。'},
    {at:'println!("leaf 剩余强引用',text:'只剩 main 里的变量 leaf 持有强引用，计数回到 1。'},
   ],
  },
  {
   title:'Cow<\'a, T>（写时克隆）与智能指针选型速查',
   body:'开发字符串清洗、URL 转义或配置解析时，常常遇到一种场景：95% 的输入原本就是合法的、不需要修改，只有 5% 的输入需要替换字符。\n如果函数返回 String，每次都要分配堆内存并复制；如果返回 &str，遇到真要修改的那 5% 又无能为力。\n标准库的 **std::borrow::Cow<\'a, B>**（Clone-on-Write，写时克隆）正是为此而生。它是一个只有两个变体的枚举：\n一、Cow::Borrowed(&\'a B)：不修改时直接借用原数据，**零分配、零拷贝**；\n二、Cow::Owned(<B as ToOwned>::Owned)：真需要修改时才克隆分配新数据（比如 Cow<\'a, str> 对应的 Owned 类型就是 String）。\nCow 同样实现了 Deref，调用方拿它当 &str 用完全无感；如果需要原地改写，调 .to_mut() 会在第一次写入时自动把 Borrowed 克隆成 Owned。\n学完这一关，记住这份**智能指针选型速查表**：\n• 单一所有者，放堆上 / 递归类型 / dyn Trait → Box<T>\n• 单线程多所有者，只读共享 → Rc<T>\n• 多线程多所有者共享 → Arc<T>（下一关细讲）\n• 单线程内部可变：小 Copy 类型 → Cell<T>，一般类型 → RefCell<T>\n• 单线程多所有者 + 可变 → Rc<RefCell<T>>，防环回指用 Weak<T>\n• 读多改少、按需克隆避分配 → Cow<\'a, T>',
   code:`use std::borrow::Cow;

fn normalize_name(name: &str) -> Cow<'_, str> {
    if name.chars().any(|c| c.is_ascii_uppercase()) {
        Cow::Owned(name.to_ascii_lowercase())
    } else {
        Cow::Borrowed(name)
    }
}`,
   explain:[
    {at:'use std::borrow::Cow;',text:'引入写时克隆枚举 Cow。'},
    {at:'fn normalize_name(name: &str) -> Cow<\'_, str> {',text:'返回 Cow<\'_, str>，匿名生命周期 \'_ 表示借用时与输入 name 活得一样久。'},
    {at:'if name.chars().any(|c| c.is_ascii_uppercase()) {',text:'先快速扫描一遍，看有没有大写 ASCII 字母。'},
    {at:'Cow::Owned(name.to_ascii_lowercase())',text:'有大写字母时才分配新 String 转成小写，包在 Owned 里返回。'},
    {at:'} else {',to:'Cow::Borrowed(name)',text:'本来就全是小写时直接借用原切片返回，零堆分配。'},
   ],
  },
  {
   title:'动手试试：用 Cow<str> 零拷贝清理字符串',
   body:'写一个把制表符 \\t 替换成空格的清理函数 clean_spaces：没有制表符时返回 Cow::Borrowed，包含制表符时才返回 Cow::Owned。用 match 区分两种结果，直观验证“不改就不分配，要改才克隆”。',
   practice:{
    steps:[
     ...rustSteps,
     '把数组里再加一个带多个 \\t 的字符串和一个空字符串 ""，运行观察各自命中了哪种变体。',
     '尝试把 Cow::Borrowed(input) 改成 let mut out = Cow::Borrowed(input); 并在需要时调用 out.to_mut().push(\'!\')，体验 to_mut() 的按需克隆。',
    ],
    expect:'[hello rust] -> 借用（零拷贝）\n[hello rust cow] -> 克隆（新分配）',
   },
   code:`use std::borrow::Cow;

fn clean_spaces(input: &str) -> Cow<'_, str> {
    if input.contains('\\t') {
        Cow::Owned(input.replace('\\t', " "))
    } else {
        Cow::Borrowed(input)
    }
}

fn main() {
    for raw in ["hello rust", "hello\\trust\\tcow"] {
        let cleaned = clean_spaces(raw);
        let kind = match cleaned {
            Cow::Borrowed(_) => "借用（零拷贝）",
            Cow::Owned(_) => "克隆（新分配）",
        };
        println!("[{cleaned}] -> {kind}");
    }
}`,
   explain:[
    {at:'use std::borrow::Cow;',text:'引入 Cow 枚举。'},
    {at:'fn clean_spaces(input: &str) -> Cow<\'_, str> {',text:'接收字符串切片，返回写时克隆的 Cow。'},
    {at:'if input.contains(\'\\t\') {',to:'Cow::Owned(input.replace(\'\\t\', " "))',text:'检测到制表符时才创建新 String 替换，返回 Owned。'},
    {at:'} else {',to:'Cow::Borrowed(input)',text:'没有制表符时原样借用返回，不发生内存分配。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'for raw in ["hello rust", "hello\\trust\\tcow"] {',text:'依次测试不含制表符和含制表符的两条输入。'},
    {at:'let cleaned = clean_spaces(raw);',text:'调用清理函数得到 Cow<str>。'},
    {at:'let kind = match cleaned {',to:'Cow::Owned(_) => "克隆（新分配）",',text:'用模式匹配检查到底走了零拷贝借用还是新分配路径。'},
    {at:'println!("[{cleaned}] -> {kind}");',text:'Cow<str> 实现了 Display，可以直接放进 {} 打印内容。'},
   ],
  },
 ],
 quiz:[
  {
   id:'rust-smart-ptr-1',
   q:'定义链表 enum List { Cons(i32, List), Nil } 时，为什么需要把内层 List 改成 Box<List>？',
   options:[
    '堆上存储比栈上访问速度更快',
    '指针大小固定让编译期算得出体积',
    '枚举的成员不支持嵌套其他类型',
    '链表节点需要靠引用计数来回收',
   ],
   why:[
    '栈上访问通常比堆更快，用 Box 不是为了提速，而是为了确定大小。',
    '',
    '枚举成员完全可以嵌套其他结构体或枚举，问题在于无限递归自身。',
    'Box 是单一所有权，并没有引用计数；引用计数是 Rc 的能力。',
   ],
   answer:1,
   explain:'Rust 必须在编译期确定每个类型的字节大小。递归枚举直接嵌套自身会无限大，包进 Box 后该字段只占一个固定指针的大小，编译即可通过。',
  },
  {
   id:'rust-smart-ptr-2',
   q:'把 &String 直接传给接收 &str 的函数也能编译通过，背后依靠的机制是？',
   options:[
    '编译器自动复制出一份新切片',
    '两个类型在内存布局完全相同',
    '借助 Deref 触发解引用强制转换',
    '程序在运行时执行动态类型转换',
   ],
   why:[
    '解引用强制转换只是返回引用，不会复制字符串内容。',
    'String 包含指针、长度和容量，&str 只是指针和长度，布局不同。',
    '',
    'Deref Coercion 完全在编译期解析，没有运行时动态派发开销。',
   ],
   answer:2,
   explain:'String 实现了 Deref<Target = str>，编译器遇到实参 &String 匹配形参 &str 时，会自动插入 .deref() 完成解引用强制转换。',
  },
  {
   id:'rust-smart-ptr-3',
   type:'multi',
   q:'关于 Drop Trait 与资源释放，下面哪些说法正确？（多选）',
   options:[
    '同作用域的变量按声明逆序释放',
    '提前释放需要调用 std::mem::drop',
    '离开作用域时编译器会自动调用',
    '可以直接写 x.drop() 来提前释放',
   ],
   why:[
    '',
    '',
    '',
    'Rust 编译期禁止显式调用 x.drop()，以免离开作用域时再次释放造成二次释放。',
   ],
   answers:[0,1,2],
   explain:'Rust 按 RAII 在作用域结束时按声明逆序自动调用 Drop::drop；如需提前释放，必须使用移交所有权的 std::mem::drop(x)。',
  },
  {
   id:'rust-smart-ptr-4',
   type:'judge',
   q:'调用 Rc::clone(&a) 会把堆上的底层数据完整深拷贝一份，因此开销比较大。',
   answer:false,
   explain:'Rc::clone(&a) 只是把堆上的强引用计数加 1，不复制底层数据，是极低成本的浅拷贝操作。',
  },
  {
   id:'rust-smart-ptr-5',
   q:'RefCell<T> 能够提供内部可变性的核心机制是什么？',
   options:[
    '把借用规则检查推迟到运行期执行',
    '在编译期直接关闭借用检查器限制',
    '每次修改时都深拷贝出一份新数据',
    '借助互斥锁实现跨线程的安全读写',
   ],
   why:[
    '',
    'RefCell 并没有放弃借用规则，而是把同样的规则改到运行时强制检查。',
    'RefCell 原地修改内部数据，不会每次修改都深拷贝。',
    'RefCell 没有加锁且不支持多线程，跨线程互斥要用 Mutex<T>。',
   ],
   answer:0,
   explain:'RefCell<T> 在运行时维护借用计数：允许多个 borrow() 或单个 borrow_mut()，一旦违反规则立刻 panic。',
  },
  {
   id:'rust-smart-ptr-6',
   type:'fill',
   q:'要从强引用 Rc<T> 创建一个不增加强引用计数的弱引用 Weak<T>，应调用关联函数＿。',
   accepted:['Rc::downgrade','std::rc::Rc::downgrade','downgrade'],
   explain:'Rc::downgrade(&rc) 会返回一个 Weak<T>，只增加 weak_count，不增加 strong_count。',
  },
  {
   id:'rust-smart-ptr-7',
   q:'在单线程树结构里，父节点持有子节点列表，子节点又要指回父节点，哪种组合能避免循环引用泄漏？',
   options:[
    '父用 Box<Node>，子用 Rc<Node>',
    '父用 Rc<Node>，子也用 Rc<Node>',
    '父用 Weak<Node>，子用 Box<Node>',
    '父用 Rc<Node>，子用 Weak<Node>',
   ],
   why:[
    'Box 是单一所有权，子节点没法再拿 Rc 共享同一个父节点。',
    '父子互相持有强引用 Rc 会形成循环引用，计数无法归零导致内存泄漏。',
    '父节点用 Weak 无法拥有子节点，子节点会在创建完立刻被释放。',
    '',
   ],
   answer:3,
   explain:'父节点通过 Rc 拥有子节点，子节点通过 Weak 弱引用回指父节点；父节点释放时强引用归零，整棵树都能正常回收。',
  },
  {
   id:'rust-smart-ptr-8',
   q:'下面这段代码运行后会发生什么？',
   code:`use std::cell::RefCell;

fn main() {
    let data = RefCell::new(10);
    let r = data.borrow();
    let mut w = data.borrow_mut();
    *w += 1;
    println!("{r}");
}`,
   options:[
    '编译阶段直接报借用冲突错误',
    '编译通过，但运行时触发 panic',
    '正常执行并打印出数字 11',
    '自动复制数据，两者互不影响',
   ],
   why:[
    'RefCell 把借用检查推迟到运行时，这段代码能顺利通过编译。',
    '',
    '不可变借用 r 还没释放就申请 borrow_mut()，违反了借用规则，不会正常执行。',
    'RefCell 返回的是指向同一份数据的借用守卫，不会自动复制。',
   ],
   answer:1,
   explain:'r 是活跃的不可变借用，同一作用域内又调用 data.borrow_mut() 违反了“不可同时存在不可变与可变借用”规则，运行时立刻 panic（already borrowed）。',
  },
  {
   id:'rust-smart-ptr-9',
   type:'judge',
   q:'对实现了 Copy 的小型值（如 usize 或 bool），用 Cell<T> 实现单线程内部可变比 RefCell<T> 更轻量，也不存在借用冲突 panic。',
   answer:true,
   explain:'Cell<T> 不向外返回引用，直接通过 get/set 拷贝读写，不需要维护运行期借用计数，零额外开销也不会 panic。',
  },
  {
   id:'rust-smart-ptr-10',
   type:'multi',
   q:'下面哪些场景适合使用 Cow<\'a, str>（写时克隆）？（多选）',
   options:[
    '多数输入原样返回，少数需要替换字符',
    '每次调用都必须拼接生成全新字符串',
    '需要让多个线程同时可变修改字符串',
    '希望避免无改动情况下的堆内存分配',
   ],
   why:[
    '',
    '如果每次都要新生成字符串，直接返回 String 更简单，用 Cow 反而多一层包装。',
    'Cow 解决的是延迟克隆问题，不提供多线程同步修改能力。',
    '',
   ],
   answers:[0,3],
   explain:'Cow 在不需要修改数据时返回 Cow::Borrowed 实现零拷贝零分配，仅在真正需要修改时才克隆分配 Cow::Owned。',
  },
  {
   id:'rust-smart-ptr-11',
   type:'fill',
   q:'访问 Weak<T> 指向的数据前，必须先调用它的＿方法尝试升级为 Option<Rc<T>>。',
   accepted:['upgrade','upgrade()'],
   explain:'weak.upgrade() 会检查底层值是否仍然存活：存活返回 Some(Rc<T>)，已释放返回 None。',
  },
  {
   id:'rust-smart-ptr-12',
   q:'下面哪项准确概括了 Rc<T> 在使用上的核心限制？',
   options:[
    '无法把结构体和枚举放进堆内存里',
    '离开作用域后不会自动减少计数值',
    '仅限单线程使用且默认只允许只读共享',
    '每次克隆都会重新申请一份堆上缓冲区',
   ],
   why:[
    'Rc<T> 可以包裹任意实现了 Sized（或特定非定长）的结构体和枚举。',
    'Rc 实现了 Drop，离开作用域会自动递减引用计数。',
    '',
    'Rc::clone 只增加引用计数，不申请新缓冲区。',
   ],
   answer:2,
   explain:'Rc<T> 的计数是非原子的，所以仅限单线程使用；同时它默认只提供不可变引用，需要修改时通常配合 RefCell<T>。',
  },
  {
   id:'rust-smart-ptr-13',
   type:'short',
   q:'请对比 Box<T>、Rc<T> 和 RefCell<T> 在所有权数量、借用检查时机和线程限制上的差异，并说明为什么常见 Rc<RefCell<T>> 组合。',
   reference:'一、Box<T> 是单一所有权，编译期检查不可变和可变借用，只要 T: Send 就可以跨线程转移；二、Rc<T> 允许单线程内的多所有权，但默认只允许编译期不可变借用，非原子计数因此不能跨线程；三、RefCell<T> 是单一所有权，把不可变和可变借用检查推迟到运行期（违反即 panic），同样仅限单线程。把它们组合成 Rc<RefCell<T>>，就能在单线程场景下既拥有多个共享所有者，又能通过内部可变性修改同一份数据（若有相互引用，还需配合 Weak<T> 打破循环）。',
   points:[
    '说明 Box<T> 为单一所有权、编译期借用检查',
    '说明 Rc<T> 为单线程多所有权、默认只读共享',
    '说明 RefCell<T> 把借用检查推迟到运行期、仅限单线程',
    '解释 Rc<RefCell<T>> 组合解决了“单线程多所有者且需可变修改”的需求',
   ],
   explain:'这是 Rust 面试高频题：从“所有权个数（单一 vs 多个）”“检查时机（编译期 vs 运行期）”“线程模型（单线程 vs 多线程）”三个维度对比最清晰。',
  },
  {
   id:'rust-smart-ptr-14',
   type:'code',
   q:'请编写函数 replace_underscores(s: &str) -> Cow<\'_, str>：若 s 包含字符 \'_\'，将所有 \'_\' 替换成 \'-\' 并返回 Cow::Owned；否则零拷贝返回 Cow::Borrowed(s)。并写出 main 测试 "rust_lang" 和 "rust-lang"，分别打印结果。',
   reference:`use std::borrow::Cow;

fn replace_underscores(s: &str) -> Cow<'_, str> {
    if s.contains('_') {
        Cow::Owned(s.replace('_', "-"))
    } else {
        Cow::Borrowed(s)
    }
}

fn main() {
    for text in ["rust_lang", "rust-lang"] {
        let out = replace_underscores(text);
        println!("{out} (borrowed={})", matches!(out, Cow::Borrowed(_)));
    }
}`,
   points:[
    '正确引入 std::borrow::Cow 并写出签名 fn replace_underscores(s: &str) -> Cow<\'_, str>',
    '包含 \'_\' 时替换为 \'-\' 并返回 Cow::Owned',
    '不包含 \'_\' 时直接返回 Cow::Borrowed(s)，无堆分配',
    '在 main 中测试两种输入并打印结果',
   ],
   explain:'用 s.contains(\'_\') 先判断再决定是否调用 s.replace，避免对本来不含下划线的字符串做不必要的堆分配。',
  },
 ],
};

export const rustConcurrency:AiLevel={
 id:'rust-concurrency',
 title:'并发编程：线程、通道与共享状态',
 summary:'std::thread 与 thread::scope、mpsc 通道、Arc 与 Mutex/RwLock、Send/Sync 与原子操作',
 lessons:[
  {
   title:'无畏并发：为什么 Rust 能在编译期拦截数据竞争',
   body:'先分清两个常一起出现的词：\n一、**并发（Concurrency）**：程序拆成多个独立部分交替推进，即使只有一个 CPU 核心也能并发；\n二、**并行（Parallelism）**：多个部分在多核 CPU 上真正同一时刻同时运行。\n传统多线程编程（如 C/C++）最令人头疼的是**数据竞争（Data Race）**：两个线程同时访问同一块内存，至少一个在写，且没有同步机制。这种 Bug 往往本地测不出来，上线高并发才偶发崩溃或算错账。\nRust 提出“无畏并发（Fearless Concurrency）”，妙在它并没有发明一套全新的运行时监控，而是**直接复用所有权、借用规则和类型系统**：\n• 所有权决定数据同一时刻归哪个线程管；\n• 借用规则防止一个线程在写的同时另一个线程在读；\n• 标记 Trait（Send / Sync）在编译期拦住所有不适合跨线程的类型（比如把 Rc 传给新线程直接编译报错）。\n也要清醒记住边界：编译通过代表**不存在未定义行为级别的数据竞争**，但**逻辑竞态**（比如两个合法加锁操作的业务顺序错乱）和**死锁**依然需要靠良好的并发设计来避免。',
  },
  {
   title:'创建线程：std::thread::spawn 与 move 闭包',
   body:'Rust 标准库采用 **1:1 线程模型**——每调用一次 std::thread::spawn，就创建一个真实的操作系统线程。\n使用 thread::spawn 有三个核心要点：\n一、**JoinHandle::join**：spawn 返回一个 JoinHandle<T>。调用 handle.join().unwrap() 会阻塞当前线程，直到子线程跑完并把闭包的返回值 T 带回来。如果不调用 join，一旦 main 函数退出，所有还在跑的子线程都会被强行终止；\n二、**为什么闭包常加 move**：编译器不知道子线程会活多久（甚至可能比启动它的函数活得更久），所以 spawn 要求闭包满足 \'static 约束，不能借用外层的普通栈变量。加上 move 后，闭包里用到的变量所有权被**转移**进子线程，彻底杜绝悬垂引用；\n三、返回值类型：join() 返回 thread::Result<T>，如果子线程内部发生 panic，join 会返回 Err，主线程可以安全捕获而不会直接跟着失控。',
   code:`use std::thread;

fn spawn_demo() {
    let nums = vec![1, 2, 3, 4];
    let handle = thread::spawn(move || {
        let sum: i32 = nums.iter().sum();
        sum
    });
    let total = handle.join().unwrap();
    println!("子线程算出的总和：{total}");
}`,
   explain:[
    {at:'use std::thread;',text:'引入标准库线程模块。'},
    {at:'fn spawn_demo() {',text:'示例函数。'},
    {at:'let nums = vec![1, 2, 3, 4];',text:'在主线程里创建一个堆上的 Vec。'},
    {at:'let handle = thread::spawn(move || {',text:'启动新 OS 线程；move 强制把 nums 的所有权移进闭包，此后主线程不能再使用 nums。'},
    {at:'let sum: i32 = nums.iter().sum();',text:'在子线程里对移进来的 nums 求和。'},
    {at:'        sum',text:'末尾不加分号的表达式作为闭包返回值，稍后由 join() 取回主线程。'},
    {at:'let total = handle.join().unwrap();',text:'阻塞等待子线程执行完毕，取出返回值 10（unwrap 处理子线程未 panic 的正常情况）。'},
    {at:'println!("子线程算出的总和：{total}");',text:'打印结果 10。'},
   ],
  },
  {
   title:'作用域线程 std::thread::scope：直接借用栈上数据',
   body:'实际写并行计算时，经常只需要“把手头的数据分给几个临时线程算完，立刻汇总继续往下走”。\n如果用普通 thread::spawn，哪怕数据就在当前栈上、主线程也会等它们全跑完，编译器依然因为 \'static 要求而逼你克隆数据或套一层 Arc。\n标准库的 **std::thread::scope** 完美解决了这个痛点：\n一、在 thread::scope(|s| { ... }) 内部，用 s.spawn(...) 创建的子线程，**保证在 scope 返回之前全部自动 join 完毕**（就算你忘了手动 join，scope 退出前也会等它们结束）；\n二、正因为编译器能证明这些子线程活不过 scope 块，它们可以**直接借用 scope 外面的栈上不可变数据**，不需要 move，也不需要套 Arc；\n三、如果需要并行写同一块数组，还可以先用 split_at_mut 或 chunks_mut 拆成互不重叠的可变切片，各线程各自安全写入，零锁零拷贝！',
   code:`use std::thread;

fn scope_demo() {
    let data = vec![10, 20, 30, 40];
    let (left, right) = data.split_at(2);
    let total = thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<i32>());
        let h2 = s.spawn(|| right.iter().sum::<i32>());
        h1.join().unwrap() + h2.join().unwrap()
    });
    println!("原数据仍在：{:?}，总和：{total}", data);
}`,
   explain:[
    {at:'use std::thread;',text:'引入线程模块。'},
    {at:'fn scope_demo() {',text:'示例函数。'},
    {at:'let data = vec![10, 20, 30, 40];',text:'栈上拥有数据 data，后面还会继续用它。'},
    {at:'let (left, right) = data.split_at(2);',text:'在 scope 外面把 data 切成两个不可变切片 &[i32]，零拷贝。'},
    {at:'let total = thread::scope(|s| {',text:'开启线程作用域，闭包参数 s 用来在当前作用域内派发线程。'},
    {at:'let h1 = s.spawn(|| left.iter().sum::<i32>());',text:'直接借用外部切片 left 求和，不需要 move 也不需要 Arc。'},
    {at:'let h2 = s.spawn(|| right.iter().sum::<i32>());',text:'另一个线程并发计算 right 的和。'},
    {at:'h1.join().unwrap() + h2.join().unwrap()',text:'汇总两个作用域线程的返回值，作为 scope 表达式的整体结果。'},
    {at:'println!("原数据仍在：{:?}，总和：{total}", data);',text:'所有子线程已结束，借用归还，data 依然完整可用。'},
   ],
  },
  {
   title:'消息传递：mpsc 通道与有界 sync_channel',
   body:'并发编程有条经典原则：“不要通过共享内存来通信，而要通过通信来共享内存。”Rust 标准库在 std::sync::mpsc 里提供了通道（Channel）。\n**mpsc** 是 Multiple Producer, Single Consumer（多生产者、单消费者）的缩写：\n一、let (tx, rx) = mpsc::channel(); 创建无界通道，tx（transmitter）是发送端，rx（receiver）是接收端；\n二、需要多个线程往里发消息时，调用 **tx.clone()** 克隆多个发送端，分别 move 进不同线程；接收端 rx 只能有一个；\n三、调用 tx.send(val) 会把 val 的**所有权转移**到通道里，发送线程之后不能再访问 val，编译期杜绝了“发出去又被原线程偷偷修改”的并发 Bug；\n四、消费端除了调用 rx.recv()（阻塞读一条），更常用 **for msg in rx** 循环不断读取，直到**全部发送端都被 drop** 时循环才自动退出（常见坑：如果主线程自己克隆了 tx 分给子线程，却忘了 drop 原始 tx，for 循环会永远卡住等消息！）；\n五、生产环境里如果生产者远快于消费者，无界 channel() 可能把内存撑爆；改用 **mpsc::sync_channel(容量)** 创建有界通道，缓冲区满了以后 send 会阻塞等待消费，起到背压限流作用。',
   code:`use std::sync::mpsc;
use std::thread;

fn channel_demo() {
    let (tx, rx) = mpsc::channel();
    for msg in ["任务A", "任务B"] {
        let tx_i = tx.clone();
        thread::spawn(move || {
            tx_i.send(String::from(msg)).unwrap();
        });
    }
    drop(tx);
    for received in rx {
        println!("收到：{received}");
    }
}`,
   explain:[
    {at:'use std::sync::mpsc;',to:'use std::thread;',text:'引入多生产者单消费者通道和线程模块。'},
    {at:'fn channel_demo() {',text:'示例函数。'},
    {at:'let (tx, rx) = mpsc::channel();',text:'创建无界异步通道，拆出发送端 tx 和接收端 rx。'},
    {at:'for msg in ["任务A", "任务B"] {',text:'启动两个生产者线程。'},
    {at:'let tx_i = tx.clone();',text:'克隆一个发送端供当前子线程独占使用。'},
    {at:'thread::spawn(move || {',to:'tx_i.send(String::from(msg)).unwrap();',text:'把 String 的所有权通过通道发出去；send 之后该线程再也无法使用这个 String。'},
    {at:'drop(tx);',text:'非常关键！必须显式释放主线程手里留着的原始 tx，否则所有子线程结束后通道仍未关闭，下面的 for 会一直阻塞。'},
    {at:'for received in rx {',to:'println!("收到：{received}");',text:'持续接收消息，直到两个子线程的 tx_i 全部释放后自动退出循环。'},
   ],
  },
  {
   title:'动手试试：mpsc 多线程汇总与 thread::scope 并行求和',
   body:'把两种主流并发协作方式放进同一个程序对比运行：上半段用 mpsc 通道把 1..=30 拆给 3 个线程计算并排序汇总（排序保证多线程输出顺序完全确定）；下半段用 thread::scope 直接借用栈数组切片并行求和。',
   practice:{
    steps:[
     ...rustSteps,
     '把代码里的 drop(tx); 注释掉，再运行 cargo run，观察程序为什么会一直卡住不动（按 Ctrl + C 终止），体会释放原始发送端的重要性，看完取消注释。',
     '把 mpsc::channel() 改成 mpsc::sync_channel(1)，重新运行，确认结果一致。',
    ],
    expect:'通道分段 1 小计：55\n通道分段 2 小计：155\n通道分段 3 小计：255\n通道汇总总和：465\nscope 左半=60，右半=150，总和=210',
   },
   code:`use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    for id in 1..=3 {
        let tx_clone = tx.clone();
        thread::spawn(move || {
            let start = (id - 1) * 10 + 1;
            let end = id * 10;
            let part: i32 = (start..=end).sum();
            tx_clone.send((id, part)).unwrap();
        });
    }
    drop(tx);

    let mut parts: Vec<(i32, i32)> = rx.into_iter().collect();
    parts.sort_by_key(|&(id, _)| id);
    let mpsc_total: i32 = parts.iter().map(|&(_, p)| p).sum();
    for (id, p) in &parts {
        println!("通道分段 {id} 小计：{p}");
    }
    println!("通道汇总总和：{mpsc_total}");

    let nums = [10, 20, 30, 40, 50, 60];
    let (left, right) = nums.split_at(nums.len() / 2);
    let (left_sum, right_sum) = thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<i32>());
        let h2 = s.spawn(|| right.iter().sum::<i32>());
        (h1.join().unwrap(), h2.join().unwrap())
    });
    println!("scope 左半={left_sum}，右半={right_sum}，总和={}", left_sum + right_sum);
}`,
   explain:[
    {at:'use std::sync::mpsc;',to:'use std::thread;',text:'引入通道和线程模块。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let (tx, rx) = mpsc::channel();',text:'创建通道，准备收集 3 个分段线程的计算结果。'},
    {at:'for id in 1..=3 {',text:'派发 3 个工作线程，分别计算 1..=10、11..=20、21..=30 的和。'},
    {at:'let tx_clone = tx.clone();',text:'为每个线程克隆专属发送端。'},
    {at:'thread::spawn(move || {',to:'tx_clone.send((id, part)).unwrap();',text:'子线程算出分段小计后，把 (分段编号, 小计) 发回主线程，随后 tx_clone 随线程结束自动释放。'},
    {at:'drop(tx);',text:'释放主线程手上的原始发送端，让 rx 能在 3 个子线程都发完后结束迭代。'},
    {at:'let mut parts: Vec<(i32, i32)> = rx.into_iter().collect();',text:'把通道收到的所有元组一次性收集进 Vec。'},
    {at:'parts.sort_by_key(|&(id, _)| id);',text:'因为线程完成顺序不确定，按分段编号排序后再打印，确保输出稳定一致。'},
    {at:'let mpsc_total: i32 = parts.iter().map(|&(_, p)| p).sum();',text:'汇总三段之和 55 + 155 + 255 = 465。'},
    {at:'for (id, p) in &parts {',to:'println!("通道汇总总和：{mpsc_total}");',text:'依次打印各分段小计和总和。'},
    {at:'let nums = [10, 20, 30, 40, 50, 60];',text:'在栈上定义固定数组。'},
    {at:'let (left, right) = nums.split_at(nums.len() / 2);',text:'在 scope 外部零拷贝拆成左右两半切片。'},
    {at:'let (left_sum, right_sum) = thread::scope(|s| {',to:'(h1.join().unwrap(), h2.join().unwrap())',text:'两个作用域线程直接借用栈切片并发求和，返回 (60, 150)。'},
    {at:'println!("scope 左半=',text:'打印左右半之和及总和 210。'},
   ],
  },
  {
   title:'共享状态并发：Arc<Mutex<T>> 与锁中毒',
   body:'当多个线程确实需要共同读写同一份内存状态（如共享缓存、连接池、计数器）时，Rust 的标准组合是 **Arc<Mutex<T>>**——就像单线程里的 Rc<RefCell<T>> 升级成了线程安全版本：\n一、**Arc<T>**（Atomically Reference Counted，原子引用计数）：和 Rc<T> 用法几乎一模一样，但内部使用原子指令增减计数，可以安全跨线程克隆和共享所有权；\n二、**Mutex<T>**（Mutual Exclusion，互斥锁）：确保同一时刻最多只有一个线程访问里面的数据 T。和其他语言最大的区别是：**Rust 的锁把数据严严实实地包在里面**，不调用 .lock() 根本摸不到 T，编译器彻底杜绝“忘记加锁就读共享变量”的错误；\n三、**自动解锁**：.lock() 成功后返回智能指针 **MutexGuard<T>**（实现 Deref/DerefMut 和 Drop），只要守卫离开作用域就自动解锁，哪怕中途 return 或 panic 也不会忘了解锁；\n四、**锁中毒（Poisoning）**：如果某个线程在持有锁期间发生 panic，数据可能改到一半处于不一致状态，Rust 会把这把锁标记为“中毒”。后续线程调 .lock() 会得到 Err(PoisonError)，提醒你决定是传播错误还是通过 err.into_inner() 检查恢复。',
   code:`use std::sync::{Arc, Mutex};
use std::thread;

fn mutex_demo() {
    let total = Arc::new(Mutex::new(0));
    let cloned = Arc::clone(&total);
    let handle = thread::spawn(move || {
        let mut guard = cloned.lock().unwrap();
        *guard += 10;
    });
    handle.join().unwrap();
    println!("结果：{}", *total.lock().unwrap());
}`,
   explain:[
    {at:'use std::sync::{Arc, Mutex};',to:'use std::thread;',text:'引入原子引用计数 Arc、互斥锁 Mutex 和线程模块。'},
    {at:'fn mutex_demo() {',text:'示例函数。'},
    {at:'let total = Arc::new(Mutex::new(0));',text:'用 Mutex 包住整数 0 提供互斥修改，再用 Arc 包住 Mutex 允许多线程共享所有权。'},
    {at:'let cloned = Arc::clone(&total);',text:'增加原子引用计数，得到一份可移入子线程的句柄。'},
    {at:'let handle = thread::spawn(move || {',text:'把 cloned 移入子线程，主线程手里仍留着 total。'},
    {at:'let mut guard = cloned.lock().unwrap();',text:'加锁并解包 Result（处理未中毒情况），拿到可变守卫 MutexGuard<i32>。'},
    {at:'*guard += 10;',text:'通过 DerefMut 修改里面的值；紧接着闭包结束，guard 离开作用域自动解锁。'},
    {at:'handle.join().unwrap();',text:'等待子线程完成。'},
    {at:'println!("结果：{}", *total.lock().unwrap());',text:'主线程再加锁读出 10，这一行结束后临时 guard 立刻解锁。'},
   ],
  },
  {
   title:'RwLock<T> 读写锁与死锁预防',
   body:'Mutex<T> 不区分读和写：就算 10 个线程只是并发读一份配置表，也得排队挨个进。对于“**读多写少**”的场景，可以使用标准库的 **std::sync::RwLock<T>**（读写锁）：\n一、.read() 获取共享读锁：同一时刻允许**任意多个线程同时读**；\n二、.write() 获取独占写锁：同一时刻**只允许一个线程写**，且不能与任何读锁并存。\n可以看出，RwLock<T> 就像是把 Rust 的借用规则搬到了多线程运行时。但注意：如果写很频繁、或者锁内只做几纳秒操作，Mutex 往往因为开销更小而更快，别盲目全换成 RwLock。\n此外要警惕**死锁（Deadlock）**——编译器拦不住它，最常见的两种写法：\n一、**同线程重复加锁**：Rust 标准库 Mutex 和 RwLock 都不可重入，同一个线程手里还捏着 guard 就再次 .lock() 或 .write()，会立刻卡死自己；\n二、**交叉加锁顺序**：线程 A 先锁 L1 再等 L2，线程 B 先锁 L2 再等 L1，双方互等。\n两条黄金预防法则：\n• **缩小锁粒度**：用单独的花括号 { ... } 或 drop(guard) 拿完数据立刻放锁，绝不抱着锁做网络/磁盘等耗时操作；\n• **固定加锁顺序**：多个线程需要同时拿多把锁时，严格按相同顺序加锁。',
   code:`use std::sync::RwLock;

fn rwlock_demo() {
    let config = RwLock::new(vec!["v1"]);
    {
        let r1 = config.read().unwrap();
        let r2 = config.read().unwrap();
        println!("两个读者并发看到：{:?} / {:?}", *r1, *r2);
    }
    let mut w = config.write().unwrap();
    w.push("v2");
    println!("写入后：{:?}", *w);
}`,
   explain:[
    {at:'use std::sync::RwLock;',text:'引入标准库读写锁。'},
    {at:'fn rwlock_demo() {',text:'示例函数。'},
    {at:'let config = RwLock::new(vec!["v1"]);',text:'用读写锁保护一份配置列表。'},
    {at:'let r1 = config.read().unwrap();',to:'let r2 = config.read().unwrap();',text:'多个读锁可以同时获取，不会互相阻塞。'},
    {at:'println!("两个读者并发看到',text:'两个读者都能安全读取 ["v1"]；离开这个内层花括号时，r1 和 r2 全部释放。'},
    {at:'let mut w = config.write().unwrap();',text:'所有读锁都已释放，现在获取独占写锁不会死锁（若 r1 没释放就调 write() 会立刻死锁）。'},
    {at:'w.push("v2");',text:'独占期间安全追加新版本。'},
    {at:'println!("写入后：{:?}", *w);',text:'打印 ["v1", "v2"]。'},
   ],
  },
  {
   title:'Send 与 Sync：编译期并发安全的守门员',
   body:'Rust 语言核心其实没有写死“线程怎么检查”，所有跨线程安全规则都建在标准库两个**标记 Trait（Marker Trait，没有任何方法）**之上：\n一、**Send**：表示该类型的值可以安全地**把所有权转移到另一个线程**。绝大多数基本类型、String、Vec<T>（当 T: Send）都自动实现了 Send；\n二、**Sync**：表示该类型可以安全地**被多个线程同时通过不可变引用 &T 访问**。它的精确数学定义非常优雅：**T 是 Sync，当且仅当 &T 是 Send**（也就是把 &T 传给其他线程是安全的）。\n它们都是**自动 Trait（auto trait）**：只要一个结构体的所有字段都是 Send/Sync，编译器会自动推导它也是 Send/Sync，几乎不用手动实现（手动实现属于 unsafe）。\n记住这四个经典组合，面试和实战一通百通：\n• **Rc<T>**：既不是 Send 也不是 Sync（非原子计数，跨线程复制会竞争）；\n• **Arc<T>**：当 T: Send + Sync 时，Arc<T> 才是 Send + Sync；\n• **Cell<T> / RefCell<T>**：当 T: Send 时它们是 Send（整只搬去另一线程没问题），但**不是 Sync**（不能多线程同时拿 &RefCell 借用）；\n• **Mutex<T>**：只要 T: Send，**Mutex<T> 就是 Sync**！互斥锁把只能单线程改的 T 包装成了可安全共享的 Sync 类型，所以 Arc<Mutex<T>> 才能通行无阻。',
   code:`use std::sync::{Arc, Mutex};

fn assert_send_sync<T: Send + Sync>() {}

fn check_types() {
    assert_send_sync::<String>();
    assert_send_sync::<Arc<Mutex<Vec<i32>>>>();
    // assert_send_sync::<std::rc::Rc<i32>>();  // 编译报错：Rc 不是 Send 也不是 Sync
}`,
   explain:[
    {at:'use std::sync::{Arc, Mutex};',text:'引入线程安全智能指针 Arc 和互斥锁 Mutex。'},
    {at:'fn assert_send_sync<T: Send + Sync>() {}',text:'一个零运行时开销的编译期断言函数：只要传进来的类型 T 同时满足 Send + Sync 就能通过编译。'},
    {at:'fn check_types() {',text:'检查示例函数。'},
    {at:'assert_send_sync::<String>();',text:'String 拥有独立堆缓冲区，既可安全转移到另一线程（Send），也可被多线程同时只读借用（Sync）。'},
    {at:'assert_send_sync::<Arc<Mutex<Vec<i32>>>>();',text:'Vec<i32> 是 Send -> Mutex<Vec<i32>> 是 Send + Sync -> Arc<Mutex<Vec<i32>>> 是 Send + Sync。'},
   ],
  },
  {
   title:'动手试试：Arc<Mutex<T>> 并发计数与 AtomicUsize 无锁计数',
   body:'同时用 Arc<Mutex<usize>> 和 Arc<AtomicUsize> 让 4 个线程各自累加 1000 次，最后汇总校验两种方案都准确得到 4000，没有任何数据竞争或丢更新。',
   practice:{
    steps:[
     ...rustSteps,
     '把线程数改成 8、每线程循环改成 5000 次，运行验证两个计数是否都准确变成 40000。',
     '试着把 Arc 换成 Rc 再编译，读一读编译器报 Rc<...> cannot be sent between threads safely 的精确提示，看完改回来。',
    ],
    expect:'Mutex 最终计数：4000\nAtomic 最终计数：4000',
   },
   code:`use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let mutex_count = Arc::new(Mutex::new(0usize));
    let atomic_count = Arc::new(AtomicUsize::new(0));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let m = Arc::clone(&mutex_count);
        let a = Arc::clone(&atomic_count);
        handles.push(thread::spawn(move || {
            for _ in 0..1000 {
                *m.lock().unwrap() += 1;
                a.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("Mutex 最终计数：{}", *mutex_count.lock().unwrap());
    println!("Atomic 最终计数：{}", atomic_count.load(Ordering::SeqCst));
}`,
   explain:[
    {at:'use std::sync::atomic::{AtomicUsize, Ordering};',to:'use std::thread;',text:'引入原子无符号整数、内存序枚举、Arc、Mutex 和线程模块。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let mutex_count = Arc::new(Mutex::new(0usize));',text:'用互斥锁保护的计数器，初始值 0。'},
    {at:'let atomic_count = Arc::new(AtomicUsize::new(0));',text:'无锁原子计数器，初始值 0；AtomicUsize 本身支持内部可变且实现 Sync，无需再套 Mutex。'},
    {at:'let mut handles = Vec::new();',text:'收集所有子线程的 JoinHandle，方便后面统一 join。'},
    {at:'for _ in 0..4 {',text:'启动 4 个并发工作线程。'},
    {at:'let m = Arc::clone(&mutex_count);',to:'let a = Arc::clone(&atomic_count);',text:'克隆 Arc 句柄（只加原子引用计数）准备 move 进子线程。'},
    {at:'handles.push(thread::spawn(move || {',to:'for _ in 0..1000 {',text:'每个线程循环执行 1000 次累加。'},
    {at:'*m.lock().unwrap() += 1;',text:'加锁、加 1，行末临时 MutexGuard 立即释放锁。'},
    {at:'a.fetch_add(1, Ordering::Relaxed);',text:'通过 CPU 原子加指令直接把计数加 1，无需加锁。'},
    {at:'for h in handles {',to:'h.join().unwrap();',text:'等待全部 4 个子线程跑完。'},
    {at:'println!("Mutex 最终计数：{}", *mutex_count.lock().unwrap());',text:'打印加锁计数结果 4000。'},
    {at:'println!("Atomic 最终计数：{}", atomic_count.load(Ordering::SeqCst));',text:'打印原子计数结果 4000。'},
   ],
  },
  {
   title:'原子操作与内存序（Memory Ordering）直觉',
   body:'如果多线程间共享的只是一个布尔开关、统计计数或自增 ID，使用 Mutex 显得太重。标准库 std::sync::atomic 提供了 AtomicBool、AtomicUsize、AtomicI64 等原子类型：它们直接映射到 CPU 的原子机器指令，**无锁、不可死锁**，而且通过 &self 就能安全修改。\n调用 load、store、fetch_add、compare_exchange 时，必须传入一个 **Ordering（内存序）**，用来告诉编译器和 CPU“允许把周围其他读写指令重排到什么程度”：\n一、**Relaxed**：只保证这个原子操作本身不可分割，不约束周围其他普通变量的读写先后。最适合**纯统计计数器**（比如累计请求次数、已处理任务数）；\n二、**Release（写）与 Acquire（读）配对**：写线程先把数据准备好，再 store(true, Release) 竖起旗子；读线程 load(Acquire) 看到旗子竖起后，保证一定能读到写线程在 Release 之前写下的全部数据。最适合**就绪标志位、无锁队列、自定义锁**；\n三、**SeqCst**（Sequentially Consistent，顺序一致）：最强约束，所有线程看到全局统一的唯一操作顺序，心智负担最小。\n选型口诀：纯计数用 Relaxed；“准备数据 + 发信号”配对用 Release/Acquire；拿不准就先用 SeqCst，确有性能瓶颈再降级。',
   code:`use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

fn atomic_demo() {
    let requests = AtomicUsize::new(0);
    requests.fetch_add(1, Ordering::Relaxed);

    let ready = AtomicBool::new(false);
    ready.store(true, Ordering::Release);
    if ready.load(Ordering::Acquire) {
        println!("就绪，累计请求：{}", requests.load(Ordering::SeqCst));
    }
}`,
   explain:[
    {at:'use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};',text:'引入原子布尔、原子整数和内存序枚举。'},
    {at:'fn atomic_demo() {',text:'示例函数。'},
    {at:'let requests = AtomicUsize::new(0);',text:'创建原子计数器，不需要加 mut。'},
    {at:'requests.fetch_add(1, Ordering::Relaxed);',text:'纯计数不涉及同步其他内存写入，用 Relaxed 最轻快。'},
    {at:'let ready = AtomicBool::new(false);',text:'创建原子就绪标志。'},
    {at:'ready.store(true, Ordering::Release);',text:'用 Release 发布标志，保证它之前的写入不会被重排到它后面。'},
    {at:'if ready.load(Ordering::Acquire) {',text:'用 Acquire 读取标志，读到 true 时即可安全看到发布前写入的数据。'},
    {at:'println!("就绪，累计请求：{}", requests.load(Ordering::SeqCst));',text:'按最强顺序一致性读出当前计数并打印。'},
   ],
  },
 ],
 quiz:[
  {
   id:'rust-concurrency-1',
   q:'使用 std::thread::spawn 创建线程时，为什么闭包常常要加上 move 关键字？',
   options:[
    '让子线程获得更高的系统调度优先级',
    '让主线程自动等待子线程执行完毕',
    '把用到的外部变量所有权移进新线程',
    '让子线程可以直接修改主线程栈变量',
   ],
   why:[
    'move 只影响变量捕获方式，与操作系统调度优先级无关。',
    '等待子线程结束需要调用 JoinHandle::join，与 move 无关。',
    '',
    'move 是转移所有权，不是借用修改主线程栈上的局部变量。',
   ],
   answer:2,
   explain:'普通 thread::spawn 要求闭包满足 \'static，不能借用可能提前销毁的局部栈变量；加 move 会把外部变量的所有权移入子线程。',
  },
  {
   id:'rust-concurrency-2',
   q:'与普通 thread::spawn 相比，std::thread::scope 最突出的优势是什么？',
   options:[
    '可直接借用栈上变量且自动等待结束',
    '不依赖操作系统线程，属于用户态协程',
    '允许多个线程无锁同时修改同一切片',
    '可以把线程放到后台运行到程序退出',
   ],
   why:[
    '',
    'thread::scope 创建的仍然是真实的操作系统线程，不是用户态协程。',
    '多写同一块内存仍会数据竞争，可变切片必须先拆成互不重叠的片段。',
    'scope 会在块返回前等待所有子线程结束，不适合常驻后台线程。',
   ],
   answer:0,
   explain:'thread::scope 保证所有作用域线程在块结束前自动 join，因此编译器允许它们直接借用外层栈上数据，无需套 Arc。',
  },
  {
   id:'rust-concurrency-3',
   type:'multi',
   q:'关于 std::sync::mpsc 通道，下面哪些说法是正确的？（多选）',
   options:[
    '通过 tx.clone() 可创建多个发送端',
    '调用 send 会把数据的所有权移进通道',
    '所有发送端释放后 for v in rx 自动结束',
    'sync_channel 可限制队列长度防止爆内存',
   ],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'mpsc 支持多发送端单接收端：tx.clone() 扩展发送端，send 转移所有权防竞态，全部发送端 drop 后接收循环自然结束，有界 sync_channel 提供背压保护。',
  },
  {
   id:'rust-concurrency-4',
   type:'judge',
   q:'Rust 凭借所有权和借用检查，在编译期就能同时杜绝数据竞争和死锁问题。',
   answer:false,
   explain:'Rust 能在编译期杜绝未定义行为级别的数据竞争，但无法阻止死锁（例如交叉加锁或同线程重复对 Mutex 加锁）。',
  },
  {
   id:'rust-concurrency-5',
   q:'调用 Mutex<T>::lock() 拿到的 MutexGuard<T> 在什么时候会自动解锁？',
   options:[
    '必须由开发者显式调用 unlock() 方法',
    '等当前整个进程退出时由系统统一回收',
    '下一个线程发起 lock() 请求的那一刻',
    'MutexGuard 离开作用域触发 Drop 时',
   ],
   why:[
    'Rust 标准库 Mutex 没有暴露单独的 unlock()，靠 RAII 自动解锁。',
    '如果等到进程退出才解锁，其他线程将长时间阻塞甚至死锁。',
    '其他线程调用 lock() 只会排队等待，不会抢走当前持有者的锁。',
    '',
   ],
   answer:3,
   explain:'MutexGuard<T> 实现了 Drop Trait，离开作用域（或被 std::mem::drop 提前释放）时自动归还锁。',
  },
  {
   id:'rust-concurrency-6',
   type:'fill',
   q:'表示“类型的值可以安全地把所有权转移到另一个线程”的标记 Trait 是＿。',
   accepted:['Send'],
   explain:'Send 控制跨线程的所有权转移，Sync 控制跨线程的共享不可变引用。',
  },
  {
   id:'rust-concurrency-7',
   q:'持有 Mutex 锁的线程在临界区内发生 panic 后，后续线程再调用 .lock() 会遇到什么？',
   options:[
    '永久阻塞卡住无法返回，形成死锁',
    '返回 Err(PoisonError) 提示锁已中毒',
    '自动清空锁内数据并重置为默认值',
    '触发编译错误，要求重新修改代码',
   ],
   why:[
    'panic 展开时会正常 Drop 掉 MutexGuard 释放锁，所以不会死锁。',
    '',
    'Rust 不会擅自修改或重置数据，而是把决策权交给调用者。',
    '锁中毒是运行时现象，不会导致编译错误。',
   ],
   answer:1,
   explain:'持锁线程 panic 会让锁进入“中毒（Poisoned）”状态，提示数据可能只改了一半；后续 .lock() 返回 Err(PoisonError)，可用 into_inner() 检查恢复。',
  },
  {
   id:'rust-concurrency-8',
   q:'关于 Send 和 Sync 两个标记 Trait 的关系，下面哪项最准确？',
   options:[
    'T 是 Sync 等价于 &T 是 Send',
    'T 是 Sync 等价于 T 实现了 Copy',
    'T 是 Send 等价于 T 不能被修改',
    '凡是 Send 的类型都自带 Sync 属性',
   ],
   why:[
    '',
    'String 和 Mutex<T> 都不是 Copy，但它们都是 Sync。',
    'Send 表示所有权可转移到另一线程，移过去后依然可以可变修改。',
    '反例：RefCell<i32> 是 Send，但不是 Sync。',
   ],
   answer:0,
   explain:'多线程同时访问 &T 本质上就是把不可变引用 &T 传到多个线程，因此“T 是 Sync”在定义上等价于“&T 是 Send”。',
  },
  {
   id:'rust-concurrency-9',
   type:'judge',
   q:'Rc<T> 既不是 Send 也不是 Sync，多线程共享所有权时应改用原子引用计数 Arc<T>。',
   answer:true,
   explain:'Rc 内部用普通非原子整数计数，跨线程克隆会数据竞争；Arc 用原子操作增减计数，可安全用于多线程。',
  },
  {
   id:'rust-concurrency-10',
   type:'multi',
   q:'下面哪些做法有助于预防多线程程序中的死锁？（多选）',
   options:[
    '在持有第一把锁时等待耗时网络请求',
    '缩小锁粒度，拿完数据立刻释放守卫',
    '同一线程重复对同一个 Mutex 加锁',
    '多个线程按统一固定顺序获取多把锁',
   ],
   why:[
    '抱着锁做耗时 I/O 会拉长锁持有时间，极易加剧阻塞甚至引发死锁。',
    '',
    'Rust 标准库的 Mutex 不可重入，同线程二次加锁会立刻自己死锁。',
    '',
   ],
   answers:[1,3],
   explain:'缩小临界区及时释放锁、对多把锁规定统一获取顺序，是预防死锁最有效的两条工程实践。',
  },
  {
   id:'rust-concurrency-11',
   type:'fill',
   q:'针对“读多写少”的共享状态场景，允许多个读者同时访问、写者独占访问的标准库锁类型是＿。',
   accepted:['RwLock','RwLock<T>','std::sync::RwLock'],
   explain:'std::sync::RwLock<T> 区分 read() 共享锁和 write() 独占锁，适合读多写少场景。',
  },
  {
   id:'rust-concurrency-12',
   q:'多个线程只需各自对一个全局 AtomicUsize 做递增统计、不依赖周围其他变量的读写顺序，选用哪种内存序最合适？',
   options:[
    'Ordering::Acquire',
    'Ordering::Release',
    'Ordering::Relaxed',
    'Ordering::AcqRel',
   ],
   why:[
    'Acquire 只能用于读或读改写操作以配合发布方，纯统计计数不需要建立跨变量同步。',
    'Release 用于向其他线程发布之前写入的数据，纯计数没必要加这层约束。',
    '',
    'AcqRel 同时带获取和释放语义，比纯统计计数所需更重。',
   ],
   answer:2,
   explain:'Ordering::Relaxed 只保证当前原子加操作本身的原子性，不施加多余的跨变量重排屏障，最适合纯统计计数器。',
  },
  {
   id:'rust-concurrency-13',
   type:'short',
   q:'为什么 Rc<RefCell<T>> 不能用于多线程，而 Arc<Mutex<T>> 可以？请结合 Send 和 Sync 说明。',
   reference:'一、Rc<T> 内部采用非原子整数增减引用计数，多线程同时克隆或释放会产生数据竞争，因此 Rc 既不是 Send 也不是 Sync；二、RefCell<T> 的运行时借用计数也是非原子的，因此 RefCell 不是 Sync，不能多线程共享 &RefCell；三、相比之下，Arc<T> 用原子操作管理引用计数，只要内部类型同时满足 Send + Sync，Arc 就实现 Send + Sync；四、Mutex<T> 通过互斥锁保证同一时刻只有一个线程访问内部数据，只要 T: Send，Mutex<T> 就是 Send + Sync。因此 Arc<Mutex<T>> 满足跨线程共享与安全修改的编译期约束。',
   points:[
    '指出 Rc 计数非原子，既不是 Send 也不是 Sync',
    '指出 RefCell 运行期借用计数非线程安全，不是 Sync',
    '说明 Arc 使用原子计数，要求内部类型为 Send + Sync',
    '说明 Mutex<T> 将 T: Send 包装成 Sync，使 Arc<Mutex<T>> 可安全跨线程共享修改',
   ],
   explain:'理解 Arc<Mutex<T>> 的关键在于拆开两层：Arc 解决跨线程多所有权，Mutex 解决内部类型变成 Sync 并提供线程安全内部可变性。',
  },
  {
   id:'rust-concurrency-14',
   type:'code',
   q:'请使用 std::thread::scope 编写函数 parallel_sum(nums: &[i32]) -> i32：把切片分成左右两半，在两个作用域线程中分别求和再合并返回（要求直接借用切片，不使用 Arc 或拷贝）。',
   reference:`use std::thread;

fn parallel_sum(nums: &[i32]) -> i32 {
    let (left, right) = nums.split_at(nums.len() / 2);
    thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<i32>());
        let h2 = s.spawn(|| right.iter().sum::<i32>());
        h1.join().unwrap() + h2.join().unwrap()
    })
}`,
   points:[
    '在 scope 外部用 split_at 或切片下标拆出左右两半 &[i32]',
    '使用 std::thread::scope 和 s.spawn 启动两个作用域线程',
    '闭包直接借用切片求和，不复制也不包 Arc',
    '调用 join() 获取两个结果并相加返回',
   ],
   explain:'注意切片拆分要写在 thread::scope 外面（或把拆分出来的切片所有权 move 进闭包），因为 s.spawn 借用的引用必须活得比 scope 本身更久。',
  },
 ],
};

export const rustAsync:AiLevel={
 id:'rust-async',
 title:'异步编程：Future、async/await 与 Tokio',
 summary:'Future 与 Poll、状态机编译原理、Pin/Unpin、执行器与 Waker、Tokio 并发任务与异步避坑',
 lessons:[
  {
   title:'为什么需要异步编程：OS 线程 vs 异步任务',
   body:'上一关已经学会了多线程，为什么写高并发网络服务时还要学异步（async）？\n关键在**资源开销与等待模式**的差别：\n一、**OS 线程的成本**：每个操作系统线程通常要预留几 MB 的调用栈，线程切换需要陷入内核态做上下文切换。如果一个聊天服务或 API 网关同时维持 10 万个长连接，开 10 万个 OS 线程光内存就会爆掉；\n二、**异步任务（Task）的轻量**：Rust 的异步任务是编译出的用户态极小状态机，通常只占几百字节。几万甚至几十万个任务可以复用寥寥几个 OS 线程（比如按 CPU 核心数开 8 个线程），某个任务一进入网络等待，运行时立刻切去执行别的就绪任务，几乎零切换成本。\n实战怎么选型？记住三条经验：\n• **I/O 密集型高并发**（Web 服务、反向代理、RPC、微服务网关、爬虫）：绝大部分时间都在等网络/数据库回包，选 async 吞吐量极高；\n• **CPU 密集型计算**（视频编解码、图像渲染、密码哈希、大数据计算）：CPU 本身已经被算满，频繁让出毫无收益，直接用普通 OS 线程（或数据并行库 rayon）更快；\n• **并发数很少的小工具**：几个线程就够用时，直接用 std::thread 最简单，不必引入异步复杂度。',
  },
  {
   title:'Future Trait 与 Poll：惰性拉取（Pull-Based）模型',
   body:'Rust 异步生态看似庞大，底层核心其实非常精简——一切都围绕标准库里的 **std::future::Future** Trait 展开。\n它只要求实现一个关联类型 Output（完成后产出的结果）和一个方法 poll：\n• 返回 **Poll::Ready(val)**：异步操作已经完成，交出结果 val；\n• 返回 **Poll::Pending**：结果还没准备好，现在先让出执行权，等事件就绪后再来 poll。\n与 JavaScript 的 Promise 或 Go 的 goroutine 不同，Rust 的 Future 是**惰性拉取（pull-based / lazy）**的：\n一、调用一个 async fn 时，它**不会立刻执行里面的任何一行代码**，只是构造并返回一个实现了 Future 的值；\n二、只有你对它调用 .await，或者把它交给执行器反复 poll，它才会真正往前推进；\n三、这种设计带来两个巨大优势：一是创建 Future 无需立刻堆分配或调度，开销极低；二是**取消任务几乎零成本**——只要把还没完成的 Future 直接 drop 掉、不再 poll 它，任务就立刻终止了。',
   code:`use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

// 标准库 Future 的精简签名示意：
trait MyFuture {
    type Output;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}

async fn fetch_code() -> u16 {
    println!("真正开始执行！");
    200
}

fn lazy_demo() -> impl Future<Output = u16> {
    let fut = fetch_code();
    println!("此时还没打印“真正开始执行”");
    fut
}`,
   explain:[
    {at:'use std::future::Future;',to:'use std::task::{Context, Poll};',text:'引入标准库异步核心类型：Future、Pin、Context 和 Poll。'},
    {at:'trait MyFuture {',to:'fn poll(self: Pin<&mut Self>, cx: &mut Context<\'_>) -> Poll<Self::Output>;',text:'展示 Future Trait 的完整结构：Output 是产出类型，poll 每次被调用要么返回 Ready(结果)，要么返回 Pending 并通过 cx 里的 Waker 约定下次唤醒。'},
    {at:'async fn fetch_code() -> u16 {',to:'200',text:'async fn 是语法糖，编译器会自动把返回类型包装成 impl Future<Output = u16>。'},
    {at:'fn lazy_demo() -> impl Future<Output = u16> {',text:'返回 Future 而不立刻驱动它的示例函数。'},
    {at:'let fut = fetch_code();',text:'这行只构造状态机，完全不会执行 println!，这就是 Rust Future 的惰性特征。'},
    {at:'println!("此时还没打印“真正开始执行”");',text:'这行会先执行；只有调用方拿到 fut 后去 .await 或 poll，fetch_code 里的代码才会运行。'},
    {at:'    fut',text:'把未启动的 Future 返回给调用者。'},
   ],
  },
  {
   title:'async / .await 底层原理：无栈状态机',
   body:'写 async fn 时代码像同步代码一样从上往下流，遇到 .await 暂停，等以后又能从断点接着往下跑——而且还不需要像 Go 那样给每个协程分配独立栈。编译器是怎么做到的？\n秘密在于**状态机编译变换（State Machine Transformation）**：\n一、编译器把每个 async fn 或 async { ... } 块，直接翻译成一个实现了 Future 的匿名**状态机枚举（enum）**；\n二、函数里每出现一个 .await，就被切成一个独立的状态变体；\n三、只在某一步里短暂用到的变量，那一步结束就释放；只有**跨越 .await 仍需使用的局部变量**，才会被放进对应状态变体的字段里保存下来；\n四、每次执行器调用 poll 时，其实就是对这个枚举做一次 match：从上次停下来的状态恢复执行，驱动内部的子 Future；如果子 Future 返回 Pending，就把自身切到该等待状态并返回 Pending；如果 Ready，就推进到下一个状态。\n这就是 Rust 被称为**零成本无栈协程（Stackless Coroutine）**的原因：整个异步调用链往往能直接内联成一个固定大小的枚举，几乎不需要堆分配！',
   code:`async fn load_profile(uid: u32) -> String {
    let name = query_name(uid).await;
    let role = query_role(&name).await;
    format!("{name}:{role}")
}

// 编译器大致会将其展开成类似下面的状态机枚举：
enum LoadProfileState {
    Start { uid: u32 },
    WaitingName { name_fut: QueryNameFut },
    WaitingRole { name: String, role_fut: QueryRoleFut },
    Done,
}`,
   explain:[
    {at:'async fn load_profile(uid: u32) -> String {',text:'包含两个 .await 点的异步函数。'},
    {at:'let name = query_name(uid).await;',text:'第一个暂停点：等待查用户名。'},
    {at:'let role = query_role(&name).await;',text:'第二个暂停点：注意 name 跨越了这次 .await（后面 format! 还要用），所以编译器必须把 name 保存在状态机里。'},
    {at:'format!("{name}:{role}")',text:'两个异步步骤都完成后拼装最终结果，返回 Poll::Ready。'},
    {at:'enum LoadProfileState {',to:'Done,',text:'编译器生成的概念状态机：Start 保存入参，WaitingName 保存第一个子 Future，WaitingRole 同时保存跨越断点的 name 和第二个子 Future，完成后进入 Done。'},
   ],
  },
  {
   title:'执行器（Executor）、反应器（Reactor）与 Waker',
   body:'很多人初学 Rust 异步会纳闷：为什么标准库有 async/await 和 Future，却不能直接跑异步程序，非要装 Tokio？\n因为 Rust 是系统级语言，嵌入式单片机、命令行工具和百万并发 Web 服务器对调度策略、I/O 驱动的需求截然不同，标准库刻意只定标准接口，把运行时交给生态自由竞争（服务端最主流是 **Tokio**，嵌入式常用 Embassy）。\n一个完整的异步运行时通常由两半配合：\n一、**执行器（Executor）**：维护一个“就绪任务队列”，只从队列里挑任务来调用 poll；\n二、**反应器（Reactor）**：封装操作系统的事件通知机制（Linux epoll、macOS kqueue、Windows IOCP），负责帮成千上万个任务一起监听网卡、Socket 和定时器。\n怎么避免执行器傻等或死循环空转烧 CPU？答案是 **Waker**：\n• poll(self, cx) 的上下文参数 cx 里装着一个 Waker（用 cx.waker().clone() 拿到）；\n• 当 Future 发现数据还没到，就把 Waker 登记到反应器（或后台定时线程）里，然后返回 Poll::Pending；执行器立刻挂起它去跑别的任务，CPU 零空转；\n• 一旦数据到达或定时器到期，反应器调用 **waker.wake()**，把该任务重新推回执行器的就绪队列，执行器再次 poll 它，就能立刻拿到 Poll::Ready！',
   code:`use std::task::{Context, Poll};

fn poll_example(ready: bool, cx: &mut Context<'_>) -> Poll<&'static str> {
    if ready {
        Poll::Ready("数据到达")
    } else {
        let waker = cx.waker().clone();
        // 真实场景会把 waker 交给 Reactor 或后台线程，就绪时调用 waker.wake()
        waker.wake();
        Poll::Pending
    }
}`,
   explain:[
    {at:'use std::task::{Context, Poll};',text:'引入任务上下文 Context 和轮询结果枚举 Poll。'},
    {at:'fn poll_example(ready: bool, cx: &mut Context<\'_>) -> Poll<&\'static str> {',text:'演示 poll 内部如何使用 Context 中的 Waker。'},
    {at:'if ready {',to:'Poll::Ready("数据到达")',text:'条件满足时直接返回 Ready 和最终数据。'},
    {at:'} else {',text:'尚未就绪分支。'},
    {at:'let waker = cx.waker().clone();',text:'从上下文克隆出一个 Waker 句柄，用于将来通知执行器再次 poll 自己。'},
    {at:'waker.wake();',text:'触发唤醒（这里仅作调用演示；真实反应器会在 I/O 就绪或定时到期时异步调用它）。'},
    {at:'Poll::Pending',text:'返回 Pending 让出当前线程，等待唤醒后再次被执行器调度。'},
   ],
  },
  {
   title:'动手试试：纯标准库手写 Future 与极简 block_on',
   body:'不引入任何第三方库，只靠标准库就能亲手跑通一个 Future！下面我们写一个倒计时 Future Countdown（前两次 poll 返回 Pending，第三次返回 Ready），再写一个 7 行的极简执行器 simple_block_on 驱动它跑完。',
   practice:{
    steps:[
     ...rustSteps,
     '把 main 里的 Countdown { left: 2 } 改成 left: 4，运行观察 poll 被多调用了两次。',
     '尝试把 simple_block_on(Countdown { left: 2 }) 改成驱动一个真正的 async 块：simple_block_on(async { 10 + 32 })，验证你手写的执行器同样能跑通 async 语法！',
    ],
    expect:'poll：还剩 2 步，返回 Pending\npoll：还剩 1 步，返回 Pending\npoll：准备就绪！\n最终结果：发射成功',
   },
   code:`use std::future::Future;
use std::pin::{Pin, pin};
use std::task::{Context, Poll, Waker};

struct Countdown {
    left: u8,
}

impl Future for Countdown {
    type Output = &'static str;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.left == 0 {
            println!("poll：准备就绪！");
            Poll::Ready("发射成功")
        } else {
            println!("poll：还剩 {} 步，返回 Pending", self.left);
            self.left -= 1;
            Poll::Pending
        }
    }
}

fn simple_block_on<F: Future>(fut: F) -> F::Output {
    let mut fut = pin!(fut);
    let mut cx = Context::from_waker(Waker::noop());
    loop {
        if let Poll::Ready(val) = fut.as_mut().poll(&mut cx) {
            return val;
        }
    }
}

fn main() {
    let result = simple_block_on(Countdown { left: 2 });
    println!("最终结果：{result}");
}`,
   explain:[
    {at:'use std::future::Future;',to:'use std::task::{Context, Poll, Waker};',text:'只依赖标准库引入 Future、pin! 宏、Context、Poll 和 Waker。'},
    {at:'struct Countdown {',to:'left: u8,',text:'自定义一个倒计时状态机，只保存剩余步数 left。'},
    {at:'impl Future for Countdown {',to:'type Output = &\'static str;',text:'为 Countdown 实现 Future，完成后产出字符串切片。'},
    {at:'fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<\'_>) -> Poll<Self::Output> {',text:'实现核心 poll 方法；Countdown 里只有 u8，默认实现 Unpin，因此可以直接通过 self.left 修改字段。'},
    {at:'if self.left == 0 {',to:'Poll::Ready("发射成功")',text:'倒计时归零，打印就绪并返回 Poll::Ready。'},
    {at:'} else {',to:'Poll::Pending',text:'还没归零时把步数减 1 并返回 Pending，等待下一次 poll。'},
    {at:'fn simple_block_on<F: Future>(fut: F) -> F::Output {',text:'手写极简阻塞执行器，驱动任意 Future 直到完成。'},
    {at:'let mut fut = pin!(fut);',text:'用标准库 pin! 宏把 fut 钉在当前栈帧上，得到 Pin<&mut F>。'},
    {at:'let mut cx = Context::from_waker(Waker::noop());',text:'用标准库自带的空唤醒器 Waker::noop() 构造上下文（演示轮询流程；真实等待 I/O 的执行器要用带休眠唤醒的 Waker，本关最后一张实战卡就会写）。'},
    {at:'loop {',to:'return val;',text:'不断用 fut.as_mut().poll(&mut cx) 推进任务，拿到 Ready 就返回结果。'},
    {at:'fn main() {',to:'println!("最终结果：{result}");',text:'驱动倒计时 Future 并打印最终拿到的结果。'},
   ],
  },
  {
   title:'Pin<P> 与 Unpin：保护自引用状态机不被移动',
   body:'看到 Future::poll 的签名 self: Pin<&mut Self>，新手最容易一头雾水：为什么不能直接写 &mut self？\n根源出在**自引用结构（Self-Referential Struct）**。\n看一个极其普通的 async 函数：\n  let text = String::from("hello");\n  let slice = &text;\n  do_io().await;\n  println!("{slice}");\n编译器生成的状态机结构体里，会同时保存 text 和指向 text 内存地址的引用 slice——也就是**结构体的一个字段指向了自己内部的另一个字段**！\n一旦这个状态机开始 poll，如果外部把它 move 或 mem::swap 搬到内存的新地址，text 搬了新家，但 slice 里记录的还是旧地址，立刻变成**悬垂指针**！\n**Pin<P>**（如 Pin<&mut T> 或 Pin<Box<T>>）就是类型系统里的“图钉”：它把指针包起来，限制你不能随便拿到普通的 &mut T，从而保证被指向的对象在销毁之前**不会在内存里移动**。\n那为什么平时写普通结构体根本没感觉到 Pin 的限制？因为还有一个自动 Trait 叫 **Unpin**：\n• 绝大多数不包含自引用的普通类型（i32、String、Vec、以及我们上一张卡写的 Countdown）都自动实现了 **Unpin**——意思是“就算被 Pin 住了，移动我也完全安全”，因此它们依然能直接拿到 &mut T；\n• 只有真正怕移动的类型（比如编译器生成的 async 状态机）才会标记为 **!Unpin**，手动 poll 它们之前必须用 **std::pin::pin!(fut)**（钉在栈上）或 **Box::pin(fut)**（钉在堆上）。',
   code:`use std::future::Future;
use std::pin::Pin;

async fn self_ref_task() -> usize {
    let text = String::from("Rust Async");
    let slice = &text;
    std::future::ready(()).await;
    slice.len()
}

fn pin_on_heap() -> Pin<Box<dyn Future<Output = usize>>> {
    Box::pin(self_ref_task())
}`,
   explain:[
    {at:'use std::future::Future;',to:'use std::pin::Pin;',text:'引入 Future 和 Pin。'},
    {at:'async fn self_ref_task() -> usize {',text:'一个跨 .await 借用局部变量的异步函数。'},
    {at:'let text = String::from("Rust Async");',to:'let slice = &text;',text:'slice 借用了同一状态机里的 text，形成自引用。'},
    {at:'std::future::ready(()).await;',text:'跨越 .await 暂停点，编译器生成的匿名状态机因此是 !Unpin。'},
    {at:'slice.len()',text:'恢复执行后安全读取 slice 的长度 10，因为 Pin 保证状态机在此期间没有被移动过。'},
    {at:'fn pin_on_heap() -> Pin<Box<dyn Future<Output = usize>>> {',to:'Box::pin(self_ref_task())',text:'用 Box::pin 把 !Unpin 的 Future 固定在堆上，既能放进集合里也能安全返回和 poll。'},
   ],
  },
  {
   title:'Tokio 运行时实战速览：spawn、join! 与 select!',
   body:'在真实工程里（Web 后端、微服务、客户端网络层），最主流的异步运行时是 **Tokio**（在 Cargo.toml 里加 tokio = { version = "1", features = ["full"] } 即可使用）。\n下面这四个核心原语覆盖了 90% 的日常并发场景（下面代码展示 Tokio 项目中的典型写法，需在配置了 tokio 依赖的 Cargo 项目中运行）：\n一、**#[tokio::main]**：过程宏，自动帮你在 main 里创建多线程异步运行时并驱动 async fn main()；\n二、**tokio::spawn(async move { ... })**：把一个独立任务派发到后台并发运行，返回 JoinHandle。注意因为 Tokio 的工作窃取调度器可能把任务挪到其他 OS 线程执行，传给 spawn 的 Future 必须满足 **\'static + Send**（不能借用局部栈变量，也不能持有 Rc 等非 Send 类型）；\n三、**tokio::join!(fut1, fut2)**：在当前任务内**并发**等待多个 Future **全部**完成，按元组返回全部结果——比写两行顺序 .await 快得多，且不要求 \'static + Send；\n四、**tokio::select! { ... }**：同时盯住多个异步分支，**谁先完成就执行哪个分支**，其余未完成的分支会被直接 drop 取消，最常用于“请求 + 超时控制”或“业务循环 + 优雅停机信号”。',
   code:`use std::time::Duration;

#[tokio::main]
async fn main() {
    let bg = tokio::spawn(async move {
        tokio::time::sleep(Duration::from_millis(50)).await;
        "后台任务完成"
    });

    let (a, b) = tokio::join!(fetch("订单"), fetch("库存"));
    println!("join 结果：{a}, {b}");

    tokio::select! {
        res = bg => println!("最快完成：{:?}", res.unwrap()),
        _ = tokio::time::sleep(Duration::from_millis(200)) => println!("超时取消"),
    }
}

async fn fetch(name: &str) -> String {
    format!("{name}OK")
}`,
   explain:[
    {at:'use std::time::Duration;',text:'引入时间间隔类型。'},
    {at:'#[tokio::main]',to:'async fn main() {',text:'宏把 async fn main 展开成同步 main，内部自动初始化 Tokio 多线程运行时。'},
    {at:'let bg = tokio::spawn(async move {',to:'"后台任务完成"',text:'派发后台并发任务，需要满足 \'static + Send；内部用异步的 tokio::time::sleep 挂起而非阻塞线程。'},
    {at:'let (a, b) = tokio::join!(fetch("订单"), fetch("库存"));',text:'并发拉取订单和库存，两个都完成后分别解构给 a 和 b。'},
    {at:'println!("join 结果：{a}, {b}");',text:'打印两个并发请求的结果。'},
    {at:'tokio::select! {',to:'_ = tokio::time::sleep(Duration::from_millis(200)) => println!("超时取消"),',text:'竞争等待：bg 只需 50ms，比 200ms 超时分支先完成，于是打印“后台任务完成”并自动取消定时器分支。'},
    {at:'async fn fetch(name: &str) -> String {',to:'format!("{name}OK")',text:'模拟一个异步查询函数。'},
   ],
  },
  {
   title:'异步避坑一：跨 .await 持锁与取消安全',
   body:'写异步 Rust 时，最容易踩的两个深坑是**跨 .await 持锁**和**取消安全**：\n一、**千万别跨 .await 持有 std::sync::MutexGuard**\n  • 首先，std::sync::MutexGuard **没有实现 Send**。在 tokio::spawn 的 async 块里如果拿着它跨过 .await，编译器会把它放进状态机字段，立刻报错 future cannot be sent between threads safely；\n  • 其次，即使在单线程执行器里绕过编译，也极易**死锁**：任务 A 拿着同步锁在 .await 处挂起，同一线程切去跑任务 B，任务 B 也去 lock 同一把锁，整个 OS 线程直接卡死，任务 A 再也没机会恢复解锁！\n  • **正确做法**：99% 的场景根本不需要抱着锁等 I/O，只需用一对小花括号 { ... } 在 .await **之前**拿完或改完数据立刻释放同步锁；只有真的必须持锁跨越 .await 时，才选用异步锁 tokio::sync::Mutex。\n二、**留意取消安全（Cancellation Safety）**\n  • 当一个 Future 处在 tokio::select! 的落败分支里被中途 drop 时，它之前已经读进内部缓冲区、还没来得及返回的数据可能会丢失。在循环里使用 select! 时，要看清 API 文档是否标注“cancel safe”，避免半途丢数据。',
   code:`use std::sync::{Arc, Mutex};

async fn update_safely(shared: Arc<Mutex<Vec<String>>>) {
    let snapshot = {
        let mut guard = shared.lock().unwrap();
        guard.push(String::from("新记录"));
        guard.len()
    };
    send_metric(snapshot).await;
}

async fn send_metric(count: usize) {
    println!("上报记录数：{count}");
}`,
   explain:[
    {at:'use std::sync::{Arc, Mutex};',text:'即便在异步程序里，只要不跨 .await 持锁，标准库同步 Mutex 依然是最快、最推荐的共享内存锁。'},
    {at:'async fn update_safely(shared: Arc<Mutex<Vec<String>>>) {',text:'接收跨任务共享状态。'},
    {at:'let snapshot = {',to:'guard.len()',text:'用独立代码块包裹同步锁：加锁、写入、取出长度后，花括号结束时 guard 立刻被 drop 释放，不会进入状态机。'},
    {at:'send_metric(snapshot).await;',text:'现在手里没有任何锁守卫，放心跨越 .await，既满足 Send 又绝不会持锁死锁。'},
    {at:'async fn send_metric(count: usize) {',to:'println!("上报记录数：{count}");',text:'模拟异步上报操作。'},
   ],
  },
  {
   title:'异步避坑二：绝不阻塞执行器线程',
   body:'Tokio 默认只开和 CPU 核心数相当的少量工作线程（比如 8 核就开 8 个线程），成千上万个异步任务靠**协作式调度**轮流复用这 8 个线程。\n协作式调度有一条铁律：**任意两次 .await 之间的代码必须很快结束**，绝不能直接调用会阻塞整个 OS 线程的操作：\n一、**常见阻塞雷区**：\n  • std::thread::sleep（应该换成 tokio::time::sleep(...).await）；\n  • 同步文件读写 std::fs（大文件或慢磁盘应换 tokio::fs 或阻塞池）；\n  • 同步网络库、同步数据库驱动；\n  • 持续几十毫秒以上的繁重 CPU 计算（密码哈希、大图压缩、超大 JSON 解析）。\n二、**为什么危害极大**：一个阻塞操作会把当前整个工作线程卡住，排在这条线程上的几百个其他异步任务全都得不到 poll，服务的尾延迟（P99）瞬间飙升，极端情况下所有工作线程都被堵死，整个服务彻底假死。\n三、**标准解法**：把同步耗时代码或 CPU 重计算放进 **tokio::task::spawn_blocking(move || { ... }).await**，Tokio 会把它派发到专门的阻塞线程池里跑，让核心异步工作线程继续丝滑处理其他请求。',
   code:`async fn handle_request(data: Vec<u8>) -> usize {
    // 错误做法：直接在 async 里跑繁重同步计算或 std::thread::sleep，会卡死工作线程
    let checksum = tokio::task::spawn_blocking(move || {
        data.iter().fold(0usize, |acc, &b| acc.wrapping_add(b as usize))
    })
    .await
    .unwrap();
    checksum
}`,
   explain:[
    {at:'async fn handle_request(data: Vec<u8>) -> usize {',text:'异步请求处理函数，需要把数据交给繁重同步计算。'},
    {at:'let checksum = tokio::task::spawn_blocking(move || {',to:'data.iter().fold(0usize, |acc, &b| acc.wrapping_add(b as usize))',text:'用 spawn_blocking 把同步计算扔到专门的阻塞线程池，不占用 Tokio 核心异步工作线程。'},
    {at:'.await',to:'.unwrap();',text:'异步等待计算线程返回结果，期间当前异步工作线程可以去服务其他连接。'},
    {at:'checksum',text:'返回算好的校验和。'},
   ],
  },
  {
   title:'动手试试：带 Waker 唤醒的异步倒计时与两阶段 async',
   body:'第 5 张卡里的 simple_block_on 用 loop 一直空转，会白白吃满 CPU。这次我们只用标准库实现一个真正的休眠唤醒执行器：用 std::task::Wake + thread::park / unpark 让主线程在 Pending 时真正进入睡眠，等后台定时线程翻开原子标志并调用 waker.wake() 再精准唤醒，最后用真正的 async fn 和 .await 串联两阶段异步等待！',
   practice:{
    steps:[
     ...rustSteps,
     '在 block_on 的 loop 里加一行 println!("触发一次 poll");，重新运行，确认整趟两阶段异步等待只触发了极少次数的 poll，彻底告别死循环空转！',
     '在 two_steps 里再加上第三阶段 Delay::new(40).await，验证总耗时变成 90ms。',
    ],
    expect:'阶段一：开始等待 20ms\n阶段一完成（耗时 20ms），进入阶段二\n阶段二完成（耗时 30ms）\n全部完成，累计等待：50ms',
   },
   code:`use std::future::Future;
use std::pin::{Pin, pin};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::thread::{self, Thread};
use std::time::Duration;

struct ThreadWaker(Thread);

impl Wake for ThreadWaker {
    fn wake(self: Arc<Self>) {
        self.0.unpark();
    }
}

struct Delay {
    ms: u64,
    ready: Arc<AtomicBool>,
    started: bool,
}

impl Delay {
    fn new(ms: u64) -> Self {
        Self { ms, ready: Arc::new(AtomicBool::new(false)), started: false }
    }
}

impl Future for Delay {
    type Output = u64;

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.ready.load(Ordering::Acquire) {
            return Poll::Ready(self.ms);
        }
        if !self.started {
            self.started = true;
            let ready = Arc::clone(&self.ready);
            let waker = cx.waker().clone();
            let ms = self.ms;
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(ms));
                ready.store(true, Ordering::Release);
                waker.wake();
            });
        }
        Poll::Pending
    }
}

fn block_on<F: Future>(fut: F) -> F::Output {
    let mut fut = pin!(fut);
    let waker = Waker::from(Arc::new(ThreadWaker(thread::current())));
    let mut cx = Context::from_waker(&waker);
    loop {
        match fut.as_mut().poll(&mut cx) {
            Poll::Ready(val) => return val,
            Poll::Pending => thread::park(),
        }
    }
}

async fn two_steps() -> u64 {
    println!("阶段一：开始等待 20ms");
    let t1 = Delay::new(20).await;
    println!("阶段一完成（耗时 {t1}ms），进入阶段二");
    let t2 = Delay::new(30).await;
    println!("阶段二完成（耗时 {t2}ms）");
    t1 + t2
}

fn main() {
    let total = block_on(two_steps());
    println!("全部完成，累计等待：{total}ms");
}`,
   explain:[
    {at:'use std::future::Future;',to:'use std::time::Duration;',text:'纯标准库引入异步、原子、线程休眠唤醒所需的全部类型。'},
    {at:'struct ThreadWaker(Thread);',to:'self.0.unpark();',text:'包装当前线程句柄并实现 std::task::Wake：调用 wake() 时通过 unpark() 精准叫醒正在休眠的执行器线程。'},
    {at:'struct Delay {',to:'started: bool,',text:'异步定时器 Future：保存等待毫秒数、跨线程共享的原子完成标志 ready，以及是否已启动后台定时器的标记 started。'},
    {at:'impl Delay {',to:'Self { ms, ready: Arc::new(AtomicBool::new(false)), started: false }',text:'构造尚未启动的定时器（严格遵守惰性原则：创建时不启动线程，首次 poll 才启动）。'},
    {at:'impl Future for Delay {',to:'type Output = u64;',text:'为 Delay 实现 Future，完成后返回等待的毫秒数。'},
    {at:'fn poll(mut self: Pin<&mut Self>, cx: &mut Context<\'_>) -> Poll<Self::Output> {',to:'return Poll::Ready(self.ms);',text:'先用 Acquire 检查原子标志：如果后台定时已到期，立刻返回 Poll::Ready。'},
    {at:'if !self.started {',to:'waker.wake();',text:'第一次 poll 时启动后台计时线程：睡够指定毫秒后用 Release 置 ready 为 true，再调用 waker.wake() 通知执行器。'},
    {at:'Poll::Pending',text:'返回 Pending 让出控制权。'},
    {at:'fn block_on<F: Future>(fut: F) -> F::Output {',to:'let mut cx = Context::from_waker(&waker);',text:'把 fut 钉在栈上，用 ThreadWaker 构造能真正唤醒主线程的 Waker 和 Context。'},
    {at:'loop {',to:'Poll::Pending => thread::park(),',text:'每次 poll 返回 Pending 后调用 thread::park() 挂起休眠（零 CPU 空转），收到 unpark 通知后再继续 poll。'},
    {at:'async fn two_steps() -> u64 {',to:'t1 + t2',text:'用 async / .await 串联两个 Delay，编译器自动把它编成两阶段状态机；t1 跨越第二个 .await 仍被完整保存。'},
    {at:'fn main() {',to:'println!("全部完成，累计等待：{total}ms");',text:'把两阶段 async 函数交给手写 block_on 执行并打印总耗时 50ms。'},
   ],
  },
 ],
 quiz:[
  {
   id:'rust-async-1',
   q:'调用一个 async fn work() 但不对其 .await，也没有交给执行器 poll，会发生什么？',
   options:[
    '立刻在后台线程池里开始并发执行',
    '只返回一个 Future，函数体不会运行',
    '阻塞当前线程直到函数体执行完成',
    '编译器直接报错，禁止单独调用它',
   ],
   why:[
    '那是 JS Promise 或 Go goroutine 的推送模型，Rust Future 不会在创建时后台执行。',
    '',
    '调用 async fn 不会阻塞，也不会执行内部语句。',
    '单独调用合法，编译器最多给出未使用 Future 的警告，不会直接报编译错。',
   ],
   answer:1,
   explain:'Rust 的 Future 是惰性拉取（pull-based）的，调用 async fn 只构造状态机对象，必须被 .await 或执行器 poll 才会推进执行。',
  },
  {
   id:'rust-async-2',
   q:'Rust 编译器底层是如何实现 async / .await 的暂停和恢复的？',
   options:[
    '为每个异步函数分配独立操作系统线程',
    '在堆上给每个任务开辟固定大块调用栈',
    '靠内置垃圾回收器定期扫描挂起的任务',
    '把函数编译成保存跨断点变量的状态机',
   ],
   why:[
    '异步任务复用了少量 OS 线程，并非每个任务对应一个 OS 线程。',
    'Rust 采用无栈协程模型，不会像有栈协程那样为每个任务分配独立栈。',
    'Rust 没有垃圾回收器。',
    '',
   ],
   answer:3,
   explain:'编译器把每个 async 函数转换成实现了 Future 的匿名枚举状态机，只保存跨越 .await 存活的局部变量，实现零成本无栈异步。',
  },
  {
   id:'rust-async-3',
   type:'multi',
   q:'下面哪些场景更适合采用 Rust 异步编程（如 Tokio）？（多选）',
   options:[
    '维护十万级并发连接的网络聊天服务器',
    '同时发起上百个外部 HTTP 接口的网关',
    '持续占满 CPU 核心的视频编码压缩任务',
    '大量时间花在等待数据库响应的 Web 服务',
   ],
   why:[
    '',
    '',
    '纯 CPU 密集型计算不会因等待 I/O 让出核心，用普通 OS 线程或 rayon 数据并行更合适。',
    '',
   ],
   answers:[0,1,3],
   explain:'异步编程擅长高并发 I/O 密集型任务（大量连接和网络/数据库等待）；纯 CPU 重计算更适合多线程并行。',
  },
  {
   id:'rust-async-4',
   type:'judge',
   q:'Rust 标准库内置了完整的多线程异步执行器，不引入 Tokio 等第三方库就能直接调度并发网络 I/O。',
   answer:false,
   explain:'标准库只提供 Future、Poll、Context、Waker 等基础抽象，刻意不内置运行时；生产中需要引入 Tokio、smol 或 Embassy 等运行时库。',
  },
  {
   id:'rust-async-5',
   q:'Future::poll 返回 Poll::Pending 之后，执行器如何知道什么时候该再次 poll 这个任务？',
   options:[
    '事件就绪时由反应器调用 Waker::wake',
    '执行器每毫秒死循环反复扫描全部任务',
    '操作系统直接把结果写进异步函数栈帧',
    '等待当前线程其余任务全部退出后再试',
   ],
   why:[
    '',
    '死循环轮询会空耗 CPU，真实执行器靠事件驱动唤醒而非忙等。',
    '操作系统只负责通知事件就绪（如 epoll），不会直接改写 Rust 状态机。',
    '一旦就绪就会被放回就绪队列很快调度，不必等其他任务全部退出。',
   ],
   answer:0,
   explain:'poll 在返回 Pending 前会把 Context 里的 Waker 交给反应器或定时器；事件就绪时调用 wake() 把任务重新加入就绪队列。',
  },
  {
   id:'rust-async-6',
   type:'fill',
   q:'当异步任务尚未就绪、需要让出控制权等待唤醒时，Future::poll 应返回＿。',
   accepted:['Poll::Pending','Pending'],
   explain:'Poll<T> 只有两个变体：Poll::Ready(T) 表示完成并产出结果，Poll::Pending 表示尚未完成、暂时挂起。',
  },
  {
   id:'rust-async-7',
   q:'为什么 Future::poll 的接收者是 Pin<&mut Self> 而不是普通 &mut self？',
   options:[
    '为了让状态机能自动在线程间自由移动',
    '为了强制把每个异步任务都放到堆内存',
    '防止自引用状态机被移动产生悬垂指针',
    '为了在运行期动态修改结构体的字段数',
   ],
   why:[
    'Pin 的作用恰恰是阻止被钉住的 !Unpin 值在内存中移动，而非鼓励移动。',
    '用 pin! 宏可以把 Future 钉在栈上，并不强制放到堆内存。',
    '',
    'Rust 结构体字段数量在编译期固定，与 Pin 无关。',
   ],
   answer:2,
   explain:'跨 .await 借用局部变量会让编译器生成自引用状态机；一旦在内存里移动它，内部引用就会失效悬垂，Pin 在类型层面阻止了这种移动。',
  },
  {
   id:'rust-async-8',
   q:'在 Tokio 中想同时等待两个异步分支，“谁先完成就取谁的结果，并取消另一个”，应选用哪个宏？',
   options:[
    'tokio::join!',
    'tokio::select!',
    'tokio::spawn',
    'tokio::pin!',
   ],
   why:[
    'tokio::join! 会等所有分支全部完成，不会取消较慢的分支。',
    '',
    'tokio::spawn 用于派发独立后台任务，不是多分支竞争宏。',
    'tokio::pin! 用于把 Future 固定在栈上，不负责并发等待。',
   ],
   answer:1,
   explain:'tokio::select! 并发监听多个分支，第一个就绪的分支执行完毕后，其余分支会被自动 drop 取消，常用于超时和退出信号处理。',
  },
  {
   id:'rust-async-9',
   type:'judge',
   q:'绝大多数不包含自引用的普通类型（例如 i32、String、Vec<T>）都会自动实现 Unpin。',
   answer:true,
   explain:'Unpin 是自动 Trait，普通类型默认都实现 Unpin（可以安全移动）；只有包含 PhantomPinned 或编译器生成的异步状态机等类型才是 !Unpin。',
  },
  {
   id:'rust-async-10',
   type:'multi',
   q:'在 Tokio 多线程运行时里写 async 代码，下面哪些做法容易引发编译失败或线上故障？（多选）',
   options:[
    '在极短代码块里锁同步互斥锁并立刻释放',
    '持有 std::sync::MutexGuard 跨越 .await',
    '在异步任务里直接调用 std::thread::sleep',
    '把耗时同步压缩交给 spawn_blocking 处理',
   ],
   why:[
    '拿完数据在 .await 之前立刻释放同步锁是官方推荐的高效安全写法。',
    '',
    '',
    'spawn_blocking 会把阻塞代码放到专门线程池，避免卡住异步工作线程，这是正确做法。',
   ],
   answers:[1,2],
   explain:'跨 .await 持有 std::sync::MutexGuard 会导致非 Send 编译错误或死锁；直接调用 std::thread::sleep 会阻塞执行器工作线程、饿死其他任务。',
  },
  {
   id:'rust-async-11',
   type:'fill',
   q:'在 Tokio 异步代码里遇到必须执行的耗时同步计算或阻塞文件读写时，应把闭包交给 tokio::task:: 下的＿函数运行，避免阻塞执行器线程。',
   accepted:['spawn_blocking','tokio::task::spawn_blocking'],
   explain:'tokio::task::spawn_blocking 会把阻塞型任务派发到独立的阻塞线程池执行，保护异步核心工作线程不被卡死。',
  },
  {
   id:'rust-async-12',
   q:'传给 Tokio 多线程运行时 tokio::spawn 的异步块，通常需要满足哪两个约束？',
   options:[
    '\'static + Send',
    '\'static + Copy',
    'Unpin + Sync',
    'Clone + Default',
   ],
   why:[
    '',
    '异步状态机通常拥有资源或子 Future，一般不实现 Copy。',
    'tokio::spawn 内部会自行用堆固定任务，不要求传入的 Future 是 Unpin 或 Sync。',
    'Future 一般不需要可克隆或有默认值。',
   ],
   answer:0,
   explain:'后台任务生命周期独立于当前栈帧（需 \'static），且多线程调度器可能把它窃取到另一条工作线程执行（需 Send）。',
  },
  {
   id:'rust-async-13',
   type:'short',
   q:'为什么在 Tokio 的 async 函数里不要跨越 .await 持有 std::sync::MutexGuard，也不要直接调用 std::thread::sleep？请分别说明原因和正确替代方案。',
   reference:'一、关于 std::sync::MutexGuard 跨 .await：首先，std::sync::MutexGuard 不是 Send，跨 .await 会被捕获进状态机导致 tokio::spawn 编译失败；其次，即便在单线程里也会引发死锁——当前任务持锁挂起后，同线程调度到的另一个任务尝试加同一把锁会卡死整个线程。替代方案：优先用独立代码块在 .await 之前完成读写并释放同步锁；若确实必须持锁等待异步操作，改用 tokio::sync::Mutex。二、关于 std::thread::sleep：它会阻塞整个操作系统工作线程，导致复用该线程的大量其他异步任务全部被饿死、服务延迟飙升。替代方案：异步等待改用 tokio::time::sleep(...).await，其他不可避免的同步阻塞或重 CPU 计算交给 tokio::task::spawn_blocking。',
   points:[
    '指出 std::sync::MutexGuard 不是 Send（影响 tokio::spawn）且跨 .await 持锁容易死锁',
    '给出锁的替代方案：缩小作用域在 .await 前释放，或必要时用 tokio::sync::Mutex',
    '指出 std::thread::sleep 会阻塞整个异步工作线程、饿死同线程其他任务',
    '给出阻塞替代方案：用 tokio::time::sleep(...).await 或 tokio::task::spawn_blocking',
   ],
   explain:'这两条是 Rust 异步开发最常被问到的生产事故根源：一个是协作调度下持同步锁死锁，一个是阻塞执行器线程池。',
  },
  {
   id:'rust-async-14',
   type:'code',
   q:'请只使用标准库：定义结构体 ReadyValue(i32) 并为其实现 std::future::Future（Output = i32，poll 直接返回 Poll::Ready(self.0)），再写一个极简 block_on 函数在 main 里驱动 ReadyValue(42) 并打印结果 42。',
   reference:`use std::future::Future;
use std::pin::{Pin, pin};
use std::task::{Context, Poll, Waker};

struct ReadyValue(i32);

impl Future for ReadyValue {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        Poll::Ready(self.0)
    }
}

fn block_on<F: Future>(fut: F) -> F::Output {
    let mut fut = pin!(fut);
    let mut cx = Context::from_waker(Waker::noop());
    loop {
        if let Poll::Ready(val) = fut.as_mut().poll(&mut cx) {
            return val;
        }
    }
}

fn main() {
    let v = block_on(ReadyValue(42));
    println!("{v}");
}`,
   points:[
    '正确定义 ReadyValue(i32) 并实现 Future，指定 type Output = i32',
    '正确写出 poll 签名并返回 Poll::Ready(self.0)',
    'block_on 中用 pin! 固定 Future、用 Waker 构造 Context 并循环调用 poll',
    '在 main 中驱动 ReadyValue(42) 并打印 42',
   ],
   explain:'Rust 1.85+ 标准库内置了 Waker::noop() 和 std::pin::pin!，不依赖任何第三方库即可几行写出合法的最小执行器。',
  },
 ],
};
