import type {AiQuiz} from '../journey';

// Rust「高级」阶段训练：智能指针与内部可变性、并发编程与内存序、异步 Future/Pin/Tokio 运行时。
export const rustTrain3:AiQuiz[]=[
 {
  id:'rust-x3-1',
  q:'下面这段代码运行后的标准输出是什么？',
  code:'struct Guard(&\'static str);\nimpl Drop for Guard {\n    fn drop(&mut self) {\n        print!("{} ", self.0);\n    }\n}\n\nfn main() {\n    let a = Guard("a");\n    let b = Guard("b");\n    let c = Guard("c");\n    drop(b);\n    print!("end ");\n}',
  options:['a b c end','b end a c','b end c a','end c b a'],
  why:['drop(b) 会在 print!("end ") 之前提前析构 b，且剩余变量按逆序释放。','离开作用域时局部变量按声明逆序（后进先出）析构，c 先于 a 释放。','','b 已经被 std::mem::drop 提前消费并释放，不会等到作用域末尾再析构。'],
  answer:2,
  explain:'调用 std::mem::drop(b) 会立即接管 b 的所有权并在该语句结束时触发 b 的析构，先输出 "b "；随后输出 "end "；最后离开 main 作用域时，剩余存活变量按声明逆序（LIFO）依次释放 c 和 a，完整输出为 "b end c a "。'
 },
 {
  id:'rust-x3-2',
  q:'下面这段使用 Rc<RefCell<Vec<i32>>> 的代码能通过编译吗？运行结果是什么？',
  code:'use std::cell::RefCell;\nuse std::rc::Rc;\n\nfn main() {\n    let data = Rc::new(RefCell::new(vec![10, 20]));\n    let first = data.borrow()[0];\n    data.borrow_mut().push(first + 5);\n    let guard = data.borrow();\n    data.borrow_mut().push(99);\n    println!("{:?}", *guard);\n}',
  options:['编译报错：RefCell 不允许在同一函数内既借只读又借可变','编译通过，但在第二次 borrow_mut() 处触发运行时 panic','编译通过，并正常打印 [10, 20, 15, 99]','编译通过，但在第一次 borrow_mut() 处触发运行时 panic'],
  why:['RefCell 将借用规则检查从编译期推迟到了运行期，因此编译期能够顺利通过。','','guard 持有的只读借用 Ref 直到 println! 才结束，期间调用 borrow_mut() 会违反运行期借用规则而 panic。','第一处 data.borrow()[0] 拷贝出 i32 后，临时 Ref 在该语句分号处即被释放，第一次 borrow_mut() 完全合法。'],
  answer:1,
  explain:'第一处 data.borrow()[0] 产出的临时 Ref 在语句末尾立即释放，所以第一次 borrow_mut() 正常执行；但第二处绑定给局部变量 guard 的 Ref 延续到最后的 println!，在它存活期间再次调用 borrow_mut() 会触发 "already borrowed: BorrowMutError" 运行时 panic。'
 },
 {
  id:'rust-x3-3',
  q:'下面关于 Rc 与 Weak 引用计数的代码运行后会打印什么？',
  code:'use std::rc::Rc;\n\nfn main() {\n    let strong1 = Rc::new(42);\n    let weak = Rc::downgrade(&strong1);\n    {\n        let _strong2 = Rc::clone(&strong1);\n        print!("{},{} ", Rc::strong_count(&strong1), Rc::weak_count(&strong1));\n    }\n    drop(strong1);\n    println!("{:?}", weak.upgrade());\n}',
  options:['2,1 None','2,2 None','2,1 Some(42)','1,1 None'],
  why:['','Rc::clone 增加的是强引用计数 strong_count，弱引用计数 weak_count 仍为 1。','drop(strong1) 后强引用计数归零，堆上内部值 42 已被销毁，weak.upgrade() 返回 None。','内层块中 _strong2 尚未离开作用域，此时共有 strong1 和 _strong2 两个强引用，强计数为 2。'],
  answer:0,
  explain:'内层块中有 strong1 与 _strong2 两个强引用、weak 一个弱引用，故打印 "2,1 "；离开内层块再 drop(strong1) 后，强引用计数变为 0，受管数据被释放，此时调用 weak.upgrade() 会安全地返回 None。'
 },
 {
  id:'rust-x3-4',
  type:'multi',
  q:'关于 Cell<T>、RefCell<T> 与写时克隆智能指针 Cow<\'a, B>，下面哪些说法正确？（多选）',
  options:['Cell<T> 通过整体替换或复制读写值，不向外提供指向内部值的引用','RefCell<T> 可以在多线程间共享并通过运行时锁保证并发读写安全','Cow<\'a, str> 在只读场景下可保持借用形态，需要修改时再克隆为 Owned','RefCell<T> 的 try_borrow_mut 在借用冲突时返回 Result 而非直接 panic'],
  why:['','RefCell 内部使用非原子的普通整数记录借用状态，没有实现 Sync，不能跨线程共享。','',''],
  answers:[0,2,3],
  explain:'Cell<T> 不交出内部引用，因此在单线程下不会出现别名悬垂，也无需运行期借用计数；RefCell<T> 仅适用于单线程，try_borrow_mut 可优雅返回 Err(BorrowMutError)；Cow<\'a, B> 通过 Borrowed/Owned 枚举按需推迟堆分配与克隆。'
 },
 {
  id:'rust-x3-5',
  type:'judge',
  q:'当类型实现了 Drop 特性后，如果希望在变量离开作用域前提前释放资源，可以直接在代码中调用 x.drop() 方法。',
  answer:false,
  explain:'Rust 编译器明确禁止显式调用 Drop::drop 方法（即 x.drop() 会报错），否则变量离开作用域时还会被自动析构一次造成双重释放；提前释放应调用标准库函数 std::mem::drop(x) 按值移走并销毁它。'
 },
 {
  id:'rust-x3-6',
  type:'fill',
  q:'为了打破 Rc 循环引用导致的内存泄漏，通常把父节点到子节点设为强引用，把子节点回指父节点设为 Weak<T>；从现有强引用 node 创建 Weak 指针应调用 Rc::＿(&node)。',
  accepted:['downgrade'],
  explain:'Rc::downgrade(&node) 会创建一个 Weak<T> 弱引用并使 weak_count 加 1，但不会增加 strong_count，从而避免环形强引用阻止析构。'
 },
 {
  id:'rust-x3-7',
  q:'下面这段使用 std::thread::scope 的代码能通过编译吗？运行输出是什么？',
  code:'use std::thread;\n\nfn main() {\n    let mut nums = vec![1, 2, 3];\n    let factor = 10;\n    thread::scope(|s| {\n        s.spawn(|| {\n            for n in &mut nums {\n                *n *= factor;\n            }\n        });\n    });\n    println!("{:?}", nums);\n}',
  options:['编译报错：闭包借用了非 \'static 的局部变量 nums 和 factor','编译报错：工作线程内没有调用 join，主线程无法在下面读取 nums','编译通过，但可能打印 [1, 2, 3] 因为子线程还没来得及执行完','编译通过，scope 返回前会自动汇合内部线程并打印 [10, 20, 30]'],
  why:['thread::scope 专门允许作用域内生成的线程安全借用外部非 \'static 栈变量。','thread::scope 会在闭包返回前自动等待（join）其内部派生的所有线程结束，借用随之归还。','由于 scope 返回前已阻塞等待所有内部线程执行完毕，println! 执行时修改已生效。',''],
  answer:3,
  explain:'std::thread::scope 保证所有通过 s.spawn 创建的线程都会在 scope 调用结束前完成 join，因此编译器允许子线程直接借用栈上局部变量（包括可变借用 &mut nums），并在 scope 结束后安全读取修改结果 [10, 20, 30]。'
 },
 {
  id:'rust-x3-8',
  q:'下面这段使用 mpsc 通道的代码在运行时会发生什么？',
  code:'use std::sync::mpsc;\nuse std::thread;\n\nfn main() {\n    let (tx, rx) = mpsc::channel();\n    let tx_worker = tx.clone();\n    thread::spawn(move || {\n        tx_worker.send("done").unwrap();\n    });\n    for msg in rx {\n        println!("{msg}");\n    }\n    println!("exit");\n}',
  options:['打印 done 后立即打印 exit 并正常退出','打印 done 后程序一直挂起，无法执行到打印 exit','编译报错：tx 在 clone 之后不能再留在主线程作用域','运行时 panic：rx 在子线程退出后读取已关闭通道报错'],
  why:['主线程手里还持有着原始的发送端 tx 未释放，通道并未关闭，for msg in rx 会一直阻塞等待。','','mpsc::Sender 支持多生产者克隆，克隆后原 tx 留在主线程在语法和类型上完全合法。','即使所有发送端都关闭，for msg in rx 也会收到 None 正常结束循环，不会触发 panic。'],
  answer:1,
  explain:'mpsc::Receiver 的迭代器 for msg in rx 只有在“所有”关联的 Sender（包括原始 tx 和所有克隆体）都被 drop 后才会结束循环；这里子线程只释放了 tx_worker，而主线程的原始 tx 要到 main 结束才释放，导致主线程在循环处永久阻塞（应先显式 drop(tx)）。'
 },
 {
  id:'rust-x3-9',
  q:'关于并发标记特性 Send 与 Sync 的推导规则及标准库类型，下面哪项说法正确？',
  options:['Rc<i32> 实现了 Send 但未实现 Sync，可按值移交给子线程','MutexGuard<\'a, i32> 既实现了 Send 也实现了 Sync，可跨线程解锁','不可变引用 &T 要实现 Send，前提是目标类型 T 实现了 Sync','裸指针 *const T 和 *mut T 默认自动实现了 Send 与 Sync'],
  why:['Rc 的引用计数器是非原子的，若移交子线程与原线程的克隆体并发增减计数会产生数据竞争，因此 Rc 既非 Send 也非 Sync。','操作系统底层互斥锁通常要求“加锁的线程亲自解锁”（如 pthread），因此标准库 MutexGuard 刻意不实现 Send。','','裸指针没有任何安全保障，标准库特意将 *const T 和 *mut T 设为既不实现 Send 也不实现 Sync。'],
  answer:2,
  explain:'Sync 的精确定义就是“当且仅当 &T 是 Send 时，T 是 Sync”——把 &T 发送到另一线程意味着多个线程同时通过共享引用访问 T，因此要求 T: Sync。'
 },
 {
  id:'rust-x3-10',
  q:'对比下面两段获取 Mutex 锁的代码，关于锁的释放时机，哪项分析是正确的？',
  code:'// 写法甲\nlet _ = mutex.lock().unwrap();\ndo_step_a();\n\n// 写法乙\nlet _guard = mutex.lock().unwrap();\ndo_step_a();',
  options:['写法甲在分号处立即释放锁，写法乙持有锁直到当前作用域结束','两种写法都会把锁一直保持到当前代码块花括号结束才释放','两种写法都会在 let 语句末尾立即释放锁，无法保护 do_step_a()','写法甲会触发编译错误，因为 MutexGuard 不允许赋给通配符 _'],
  why:['','单独的下划线 _ 是通配符模式，不会发生变量绑定，临时值在该语句结束时就会立刻 drop。','带名字的 _guard 是普通局部变量绑定（下划线前缀仅抑制未使用警告），其生命周期持续到所在作用域末尾。','把表达式赋给 _ 是合法语法，常用于显式忽略返回值，但对锁守卫使用会导致锁被立即释放的严重 bug。'],
  answer:0,
  explain:'在 Rust 中，`let _ = expr;` 不会把值绑定到变量上，右边的临时 MutexGuard 会在该条语句结束（分号处）立刻析构解锁，导致下面的 do_step_a() 完全不在锁保护下；而 `let _guard = expr;` 创建了具名局部变量，锁会一直保持到作用域结束。'
 },
 {
  id:'rust-x3-11',
  type:'multi',
  q:'关于原子类型（std::sync::atomic）的内存序与读写锁 RwLock，下面哪些说法正确？（多选）',
  options:['Ordering::Relaxed 既能保证当前原子操作本身的原子性，也能阻止前后普通内存读写重排','写线程用 Ordering::Release 写入、读线程用 Ordering::Acquire 读取同一原子变量可建立同步关系','RwLock 允许同一时刻存在多个只读守卫或一个写守卫，但不能读写守卫共存','AtomicUsize 的 fetch_add(1, Ordering::SeqCst) 返回的是加 1 之后的新值'],
  why:['Ordering::Relaxed 只保证该原子变量自身读写的原子性，不提供任何跨变量的内存屏障或顺序约束。','','','fetch_add 返回的是修改之前的旧值（previous value），而不是加上去之后的新值。'],
  answers:[1,2],
  explain:'Release-Acquire 配对可保证写线程在 Release 之前的所有内存写入对读线程在 Acquire 之后的读取可见；RwLock 支持“多读单写”；Relaxed 不建立跨变量同步顺序；fetch_add 返回的是运算前的旧值。'
 },
 {
  id:'rust-x3-12',
  type:'judge',
  q:'当 T: Send 时，RefCell<T> 实现了 Send 但没有实现 Sync；这意味着可以把独占的 RefCell<i32> 整体 move 到另一个线程，但不能用 Arc<RefCell<i32>> 在多线程间共享。',
  answer:true,
  explain:'把单个 RefCell<i32> 的所有权整体转移给另一个线程不会导致多线程同时读写借用计数，因此 RefCell<T> 在 T: Send 时也是 Send；但由于 RefCell<T> 不是 Sync，而 Arc<U> 要求 U: Send + Sync 才能跨线程传递，所以 Arc<RefCell<i32>> 既不是 Send 也不是 Sync。'
 },
 {
  id:'rust-x3-13',
  q:'在 Tokio 异步运行时中执行下面代码，输出顺序是什么？',
  code:'async fn task(name: &str) {\n    print!("{name} ");\n}\n\n#[tokio::main]\nasync fn main() {\n    let f1 = task("A");\n    let f2 = task("B");\n    print!("start ");\n    f2.await;\n    f1.await;\n}',
  options:['A B start','start A B','A start B','start B A'],
  why:['Rust 的 async fn 具有惰性（lazy），调用 task("A") 只是构造出未启动的 Future 状态机，不会立即执行函数体。','代码中先执行的是 f2.await 再执行 f1.await，因此 B 会先于 A 被轮询执行。','在遇到 .await 之前，f1 和 f2 的函数体都不会运行，所以 "start " 最先打印。',''],
  answer:3,
  explain:'与许多语言的即时启动 Promise 不同，Rust 的 Future 是惰性状态机：调用 task("A") 和 task("B") 时不会执行任何内部代码，直到显式调用 .await（或交给执行器轮询）才推进状态，因此依次输出 "start B A "。'
 },
 {
  id:'rust-x3-14',
  q:'下面这段在 tokio::spawn 中使用标准库 std::sync::Mutex 的代码为什么会编译报错？',
  code:'use std::sync::{Arc, Mutex};\nuse tokio::time::{sleep, Duration};\n\nasync fn process(shared: Arc<Mutex<i32>>) {\n    tokio::spawn(async move {\n        let mut guard = shared.lock().unwrap();\n        *guard += 1;\n        sleep(Duration::from_millis(10)).await;\n        println!("{}", *guard);\n    });\n}',
  options:['Arc<Mutex<i32>> 没有实现 Send，无法被 async move 闭包捕获','guard 跨越了 .await 挂起点，而 std::sync::MutexGuard 不是 Send','tokio::spawn 的异步代码块内部不允许调用 println! 宏','std::sync::Mutex 不能存放 i32 这类基础整数类型'],
  why:['当 T: Send 时，std::sync::Mutex<T> 既实现了 Send 也实现了 Sync，所以 Arc<Mutex<i32>> 完全是 Send。','','println! 可以在 tokio::spawn 的异步任务中正常调用。','Mutex<T> 可以包装任意类型 T，包括 i32。'],
  answer:1,
  explain:'tokio::spawn 要求传入的 Future 实现 Send（因为任务在挂起恢复后可能被调度到其他工作线程）；当局部变量 guard 在 .await 前后都存活时，它必须被保存进生成的 Future 状态机结构体中，而 std::sync::MutexGuard 是 !Send，导致整个 Future 变成 !Send 而编译失败。'
 },
 {
  id:'rust-x3-15',
  q:'关于 Future::poll(self: Pin<&mut Self>, cx: &mut Context<\'_>) 中的 Pin 与 Unpin，下面哪项说法正确？',
  options:['Pin 会在运行时把数据拷贝到只读内存页以阻止任何字段修改','绝大多数普通类型（如 i32、String）都自动实现了 Unpin，可自由移动','只有当类型实现了 Unpin 时，编译器才禁止在内存中移动该类型的实例','跨 .await 借用局部变量的 async 块所生成的 Future 默认实现了 Unpin'],
  why:['Pin 完全是编译期类型系统封装，没有任何运行时内存页保护或额外拷贝开销。','','恰好相反：实现了 Unpin 表示“即使被 Pin 包裹也可以安全移动”，未实现 Unpin（即 !Unpin）才会被禁止获取 &mut T 并禁止移动。','跨 .await 借用自身局部变量的 async 状态机属于自引用结构，一旦移动会导致内部指针悬垂，因此编译器将其生成为 !Unpin。'],
  answer:1,
  explain:'Pin<&mut T> 的作用是在类型层面限制对自引用类型（!Unpin）直接获取 &mut T（从而防止 mem::swap / mem::replace 把它在内存中搬走导致自引用指针失效）；而几乎所有不含自引用的常规类型都自动实现 Unpin，不受 Pin 的移动限制。'
 },
 {
  id:'rust-x3-16',
  type:'multi',
  q:'关于 Future 的轮询机制、Waker 以及 Tokio 异步编程实践，下面哪些说法正确？（多选）',
  options:['自定义 Future::poll 返回 Poll::Pending 前，需确保未来就绪时通过 cx.waker() 唤醒任务','在 async 任务中执行繁重的 CPU 密集计算或同步文件 I/O，应放到 tokio::task::spawn_blocking 中','对已經返回过 Poll::Ready 的普通 Future 再次调用 poll，可能会触发 panic 或未定义状态','tokio::select! 宏在某一个分支率先完成后，会直接丢弃（drop）其余尚未完成的分支 Future'],
  why:['','','',''],
  answers:[0,1,2,3],
  explain:'poll 返回 Pending 若未注册 Waker，执行器将不会再次轮询该任务（造成任务永久卡死）；CPU 密集或阻塞调用会卡住异步工作线程，应交由 spawn_blocking；普通 Future 完成后不应再被 poll（除非实现了 FusedFuture）；select! 会在首个分支胜出时取消并 drop 其余分支。'
 },
 {
  id:'rust-x3-17',
  type:'judge',
  q:'在 Tokio 的 async 函数内部调用标准库的 std::thread::sleep(Duration::from_secs(1))，只会让当前异步任务暂停 1 秒，工作线程会自动切换到其他就绪的异步任务继续执行。',
  answer:false,
  explain:'std::thread::sleep 是操作系统级线程阻塞调用，运行时不知道你要让出控制权，整个 Tokio 工作线程都会被卡死 1 秒，导致该线程上的其他异步任务全部饥饿；异步休眠应使用 tokio::time::sleep(...).await。'
 },
 {
  id:'rust-x3-18',
  type:'fill',
  q:'在 Tokio 异步上下文中，如果不得不调用无法改造为异步的同步阻塞库或耗时密集的 CPU 运算，应该使用 tokio::task::＿(move || { ... }).await 将其卸载到专用阻塞线程池执行。',
  accepted:['spawn_blocking'],
  explain:'tokio::task::spawn_blocking 会把闭包投递到专门用于阻塞操作的独立线程池中运行，并返回一个可 .await 的 JoinHandle，从而避免阻塞核心异步事件循环线程。'
 },
 {
  id:'rust-x3-19',
  type:'short',
  q:'请对比 Rc<RefCell<T>> 与 Arc<Mutex<T>>：它们分别解决什么场景下的共享与修改问题？为什么编译器能自动阻止把 Rc<RefCell<T>> 传给其他线程？两者在运行时可能遇到什么异常情况？',
  reference:'1. 适用场景：\n- Rc<RefCell<T>> 用于“单线程”下的多所有权共享与内部可变性（如树、图、观察者回调）；Rc 用非原子整数维护引用计数，RefCell 在运行期检查借用规则，开销极低。\n- Arc<Mutex<T>> 用于“多线程”下的跨线程共享与互斥修改；Arc 用原子指令维护引用计数，Mutex 通过操作系统原语阻塞等待，保证同一时刻只有一个线程访问数据。\n2. 编译器静态拦截原理：Rc 和 RefCell 都没有实现 Sync（Rc 甚至没实现 Send），而 thread::spawn 要求跨线程传递的闭包捕获满足 Send（共享引用需满足 Sync），因此编译器会在编译期直接拒绝跨线程共享 Rc<RefCell<T>>。\n3. 运行时异常风险：\n- RefCell 若在同一线程内同时持有活跃的可变借用与只读借用（或两个可变借用），会在运行时触发 borrow panic；\n- Mutex 若加锁顺序不当或同一线程重复加锁会导致死锁（deadlock），且持锁线程若发生 panic 会导致锁中毒（PoisonError）。',
  points:['指出 Rc<RefCell<T>> 面向单线程共享可变，非原子计数与运行期借用检查开销更低','指出 Arc<Mutex<T>> 面向多线程并发共享可变，依赖原子引用计数与互斥锁同步','结合 Send/Sync 说明 Rc 与 RefCell 未实现 Sync（Rc 亦非 Send），被编译器在编译期拦截','对比运行时风险：RefCell 借用期重叠会 panic，Mutex 可能死锁或因持锁线程崩溃而锁中毒'],
  explain:'单线程用 Rc + RefCell 避免原子指令与锁竞争开销，多线程用 Arc + Mutex（或 RwLock）保证线程安全，Send 与 Sync 让选错工具的代码根本无法通过编译。'
 },
 {
  id:'rust-x3-20',
  type:'short',
  q:'在 Tokio 异步代码中，为什么“持有标准库 std::sync::MutexGuard 跨越 .await 点”是一个严重反模式？请从编译期（Send 约束）和运行期（死锁风险）两方面分析，并给出两种正确的改造方案。',
  reference:'1. 编译期问题：多线程异步执行器（如 tokio::spawn）要求任务 Future 实现 Send，以便任务在 .await 挂起恢复后能在任意工作线程间迁移。如果 MutexGuard 跨越了 .await 点，它必须保存在 Future 状态机中；而 std::sync::MutexGuard 是 !Send，会导致整个 Future 变成 !Send 无法通过编译。\n2. 运行期死锁风险：即使在单线程运行时或不要求 Send 的场景下，任务带着同步锁在 .await 处挂起会让出执行权；一旦同一工作线程随后调度了另一个尝试获取同一把 std::sync::Mutex 的异步任务，该任务会直接阻塞整个工作线程，而原持锁任务又因为工作线程被卡死永远无法恢复去解锁，瞬间造成死锁。\n3. 两种正确改造方案：\n- 方案一（优先推荐，当临界区无需异步 I/O 时）：用独立代码块 `{ let mut g = lock.lock().unwrap(); ... }` 缩短锁的作用域，或先在锁内提取/更新数据后立刻 drop(g)，确保在执行 .await 前已释放同步锁。\n- 方案二（当持锁期间确实必须跨越 .await 执行异步操作时）：改用异步感知的 `tokio::sync::Mutex`，它在等待锁时让出 Future 而非阻塞物理线程，且其守卫实现了 Send。',
  points:['编译期层面：说明 std::sync::MutexGuard 是 !Send，跨 .await 保存在状态机中会导致 Future 不满足 tokio::spawn 的 Send 要求','运行期层面：说明持同步锁挂起后，同线程调度另一竞争该锁的任务会阻塞物理线程，导致原任务无法恢复解锁而死锁','方案一：当临界区仅含同步内存操作时，用花括号或显式 drop 在 .await 之前释放 std::sync::MutexGuard','方案二：当临界区内确实需要跨 .await 执行异步 I/O 时，改用 tokio::sync::Mutex'],
  explain:'绝大多数情况下锁内只是读写内存状态，优先把 std::sync::MutexGuard 的生命周期限制在 .await 之前，比盲目换成开销更大的 tokio::sync::Mutex 更高效。'
 },
 {
  id:'rust-x3-21',
  type:'code',
  q:'编写一个函数 parallel_square_sum(data: &[i64], chunks: usize) -> i64：利用 std::thread::scope 和切片的 chunks 方法，把 data 分成若干块并发计算每个元素的平方和，最后汇总返回总和（若 data 为空或 chunks 为 0 则返回 0）。要求零克隆直接借用输入切片 data，并在 main 中验证结果。',
  reference:'use std::thread;\n\nfn parallel_square_sum(data: &[i64], chunks: usize) -> i64 {\n    if data.is_empty() || chunks == 0 {\n        return 0;\n    }\n    let chunk_size = data.len().div_ceil(chunks);\n    thread::scope(|s| {\n        let mut handles = Vec::new();\n        for part in data.chunks(chunk_size) {\n            handles.push(s.spawn(move || -> i64 {\n                part.iter().map(|&x| x * x).sum()\n            }));\n        }\n        handles.into_iter().map(|h| h.join().unwrap()).sum()\n    })\n}\n\nfn main() {\n    let nums: Vec<i64> = (1..=10).collect();\n    let total = parallel_square_sum(&nums, 3);\n    println!("1..=10 平方和 = {total}");\n    assert_eq!(total, 385);\n}',
  points:['正确处理 data 为空或 chunks == 0 的边界情况，并合理计算每块大小（如 div_ceil 或 (len + chunks - 1) / chunks）','使用 std::thread::scope 派生线程，直接借用非 \'static 的子切片 part: &[i64] 而无需克隆 Vec 或包装 Arc','收集各作用域线程的 ScopedJoinHandle，通过 join().unwrap() 汇总各分块的平方和','main 函数构造测试数据调用 parallel_square_sum 并打印/断言结果正确'],
  explain:'借助 std::thread::scope，子线程可以直接捕获生命周期受限的不可变子切片 &[i64]，在享受多线程并行计算的同时实现了完全零拷贝。'
 }
];
