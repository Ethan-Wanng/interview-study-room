import type {Paper} from './types';

// Rust 阶段考试二（高级 + 大神）：智能指针与内部可变性、并发编程与内存模型、异步编程与 Tokio、Unsafe/FFI 与宏系统、内存布局与工程化实践。
export const rustExam2:Paper={id:'rust-exam-2',subject:'rust',title:'Rust 阶段考试二：高级 + 大神',questions:[
 // 一、单选题
 {id:'rust-p2-s01',q:'在单线程中构建双向链表或树结构时，父子节点之间需要互相持有引用。若双方都用 Rc<RefCell<Node>> 指向彼此，会导致什么后果？',
  options:[
   '产生循环引用使强引用计数无法归零，导致内存泄漏',
   '编译期直接报错，借用检查器禁止两个结构体互相引用',
   '运行时触发 RefCell 借用冲突，在创建节点时立刻崩溃',
   '当离开作用域时 Drop 会无限递归调用，导致线程栈溢出',
  ],answer:0,
  why:[
   '',
   'Rc 与 RefCell 的组合在编译期是合法的，编译器不会阻止运行时的引用环。',
   '仅仅互相持有 Rc 并不会触发 borrow_mut 冲突，只有同时可变借用同一节点才会崩溃。',
   '因为强引用计数降不到 0，节点的 Drop 根本不会被触发，也就不会发生析构递归栈溢出。',
  ],
  explain:'Rc 通过强引用计数决定何时释放内存。父子互相持有 Rc 会形成引用环，双方 strong_count 至少为 1，离开作用域后不会释放；应当让子节点持有父节点的 Weak<RefCell<Node>> 来打破循环。'},
 {id:'rust-p2-s02',q:'关于标准库中的 Cell<T> 与 RefCell<T>，下面哪一项对比是正确的？',
  options:[
   'Cell 也能在多线程间安全共享，因为它直接实现了 Sync',
   'Cell 通过值的移动或拷贝读写，不产生指向内部的引用',
   'RefCell 在编译期检查借用规则，因此在运行时没有额外开销',
   'RefCell 仅支持实现了 Copy 的类型，无法存放 String 或 Vec',
  ],answer:1,
  why:[
   'Cell 并未实现 Sync，跨线程并发读写非原子内存会导致数据竞争，因此不能跨线程共享。',
   '',
   'RefCell 把借用检查推迟到了运行时，内部维护借用计数，违规借用会在运行时触发 panic。',
   'RefCell 可以存放任意类型；反而是 Cell::get 方法要求 T 实现 Copy（但 set/take/replace 不要求）。',
  ],
  explain:'Cell<T> 不允许获取内部值的引用（&T 或 &mut T），而是通过 get/set/replace/take 按值进出，因此不可能违背别名规则，也没有运行时借用计数开销；RefCell<T> 则通过运行时借用计数支持借出 Ref<T> 和 RefMut<T>。'},
 {id:'rust-p2-s03',q:'下面哪种类型组合既实现了 Send，但又没有实现 Sync？',
  options:[
   'Rc<i32>（单线程引用计数包装的整数）',
   'Arc<Mutex<i32>>（原子引用计数加互斥锁）',
   'RefCell<i32>（提供运行时借用检查的容器）',
   '*const i32（指向整型数据的不可变裸指针）',
  ],answer:2,
  why:[
   'Rc 的非原子引用计数在多线程下不安全，因此它既没有实现 Send，也没有实现 Sync。',
   'Arc<Mutex<i32>> 既可以把所有权移交给其他线程，也可以跨线程共享引用，同时满足 Send 和 Sync。',
   '',
   '裸指针不做任何线程安全保证，标准库默认既不为其实现 Send，也不为其实现 Sync。',
  ],
  explain:'当 T: Send 时，RefCell<T> 和 Cell<T> 都实现了 Send，可以把独占所有权转移到另一个线程使用；但因为它们的运行时借用计数或内部写入不是原子的，不能让多个线程同时持有 &RefCell<T>，所以它们是 !Sync。'},
 {id:'rust-p2-s04',q:'在多线程编程中，使用 std::thread::scope 创建作用域线程相比直接调用 std::thread::spawn，最核心的优势是什么？',
  options:[
   '作用域线程由语言运行时在用户态做协程调度，开销远小于系统线程',
   '作用域内的子线程发生 panic 时会被自动静默忽略，不影响外部主线程',
   '作用域线程不需要等待子线程结束就能提前返回，并在后台继续运行',
   '允许子线程安全借用外部栈上的非 static 局部变量，并在退出前自动汇合',
  ],answer:3,
  why:[
   'thread::scope 创建的仍然是操作系统内核线程，不是用户态绿色线程或异步协程。',
   '若作用域内有子线程发生未捕获的 panic，scope 调用结束时会在当前线程重新抛出该 panic。',
   'scope 函数在返回前会阻塞等待所有派生的作用域线程执行完毕，这也是借用安全的根本前提。',
   '',
  ],
  explain:'thread::spawn 要求闭包满足 \'static，因为编译器无法预知子线程活多久；而 thread::scope 保证在 scope 返回前阻塞 join 所有子线程，因此编译器允许子线程直接借用外部的局部变量。'},
 {id:'rust-p2-s05',q:'线程 A 先写非原子数据再执行 flag.store(true, Ordering::Release)，线程 B 循环等待 flag.load(Ordering::Acquire) 为 true 后再读取该数据。这组内存序保证了什么？',
  options:[
   '线程 A 在 Release 之前的所有内存写入，对线程 B 在 Acquire 之后的读取均可见',
   '所有线程对全部原子变量的操作都会形成唯一的全局先后顺序，消除重排可能',
   '只保证 flag 变量本身在多核缓存间立刻刷新，但不约束周边普通变量的读写重排',
   '会导致线程 B 在读取 flag 时自动挂起让出 CPU，直到线程 A 发出内核唤醒信号',
  ],answer:0,
  why:[
   '',
   '形成全局唯一总序的是 SeqCst（顺序一致性）；Release-Acquire 只在配对的变量间建立同步关系。',
   '只保证原子变量自身原子性而不约束周边重排的是 Relaxed；Release/Acquire 恰恰用于约束重排。',
   '原子加载和存储只是 CPU 内存指令，不会阻塞挂起线程；挂起等待需要配合 Futex 或 Condvar。',
  ],
  explain:'Release-Acquire 语义在配对的同一个原子变量上建立 happens-before 关系：Release 防止前面的读写被重排到 store 之后，Acquire 防止后面的读写被重排到 load 之前，从而安全发布数据。'},
 {id:'rust-p2-s06',q:'在 Tokio 异步任务中，为什么不应该跨越 .await 挂起点继续持有标准库的 std::sync::MutexGuard？',
  options:[
   '标准库互斥锁在异步函数中每次调用 lock 都会立即触发运行时 panic',
   'MutexGuard 未实现 Send 会导致任务无法跨线程调度，且持锁挂起易引发死锁',
   '跨越 .await 后 MutexGuard 会被编译器提前自动释放，导致后续代码无锁裸奔',
   '标准库的 Mutex 只支持单核环境，在 Tokio 多线程运行时中会破坏内存安全',
  ],answer:1,
  why:[
   '在 async 函数内部可以使用 std::sync::Mutex，只要在进入 .await 之前把锁释放掉即可。',
   '',
   'Rust 的析构遵循作用域规则，只要变量还存活就不会在 .await 处被提前 drop。',
   'std::sync::Mutex 是完全线程安全的，问题出在阻塞线程与跨挂起点保存 !Send 守卫上。',
  ],
  explain:'一方面 MutexGuard 是 !Send，若跨 .await 存活会被保存在 Future 状态机中，使整个 Future 变成 !Send，无法传给 tokio::spawn；另一方面持锁挂起后同一工作线程若调度到另一个请求同一把锁的任务，就会直接把工作线程死锁。'},
 {id:'rust-p2-s07',q:'异步块因跨 .await 借用局部变量而生成自引用状态机，此类 Future 为什么需要通过 Pin<&mut Self> 来调用 poll？',
  options:[
   '把状态机对象从栈内存自动迁移到堆内存，并为其开启零拷贝引用计数管理',
   '通知操作系统的虚拟内存管理器将该页锁定在物理内存中，防止被换出到磁盘',
   '禁止安全代码获取可变引用并移动对象，防止状态机内部的自引用指针悬垂',
   '在编译期自动把所有自引用裸指针改写为相对于结构体起始地址的偏移量值',
  ],answer:2,
  why:[
   'Pin 只是一个类型包装层，本身不发生堆分配（Box::pin 才会堆分配），也不包含引用计数。',
   'Pin 是纯粹的 Rust 编译期类型系统约束，与操作系统的页表锁定（mlock）没有任何关系。',
   '',
   'Rust 编译器不会把自引用指针改写成相对偏移量，正因为存的是真实内存地址才禁止移动。',
  ],
  explain:'自引用状态机内部保存了指向自身其他字段的指针。如果对象在内存中被移动（如 mem::swap），内部指针仍指向旧地址就会变成悬垂指针。对于 !Unpin 类型，Pin<&mut T> 不允许安全代码拿到 &mut T，从而在类型层面封死了移动的可能。'},
 {id:'rust-p2-s08',q:'在自定义实现 Future::poll 时，若当前资源尚未就绪而需要返回 Poll::Pending，实现者必须确保完成哪项操作？',
  options:[
   '在 poll 函数内部循环调用 std::thread::yield_now 直到资源就绪为止',
   '立刻调用 cx.waker().wake_by_ref() 让执行器在下一轮循环继续轮询',
   '将当前 Future 重新包装进新的 Box::pin 并手动提交给全局运行时队列',
   '把 cx.waker() 克隆保存到事件源中，以便资源就绪时由事件源调用 wake 唤醒',
  ],answer:3,
  why:[
   '在 poll 中循环等待会彻底阻塞执行器工作线程，破坏异步并发能力。',
   '若无条件立即调用 wake_by_ref 并返回 Pending，会导致执行器以 100% CPU 陷入忙轮询。',
   'poll 方法只持有 Pin<&mut Self>，既不能转移所有权重新装箱，也不负责直接操作运行时队列。',
   '',
  ],
  explain:'Future 与执行器通过 Waker 解耦：返回 Poll::Pending 意味着暂停调度该任务，只有将 cx.waker().clone() 注册给底层反应器或通道，待事件就绪时触发 wake()，执行器才会把它重新放回就绪队列；否则任务会永远卡死。'},
 {id:'rust-p2-s09',q:'在 Rust 2024 Edition 中，编写供 C 语言调用的导出函数或声明外部 C 函数块时，语法规则发生了什么变化？',
  options:[
   'extern "C" 块以及 no_mangle、export_name 等属性必须显式写成 unsafe(...) 形式',
   '所有冠以 extern "C" 的函数在函数体内都默认开启 unsafe 权限，无需再写 unsafe 块',
   'FFI 函数参数不再允许使用裸指针，必须统一替换为 NonNull<T> 或 MaybeUninit<T>',
   '编译器会在 extern "C" 函数边界自动捕获全部 Rust panic 并将其转换为 C 错误码',
  ],answer:0,
  why:[
   '',
   'Rust 2024 反而收紧了安全性，函数体内部并不会默认变成 unsafe 块，需要时仍要显式写 unsafe。',
   '裸指针依然是 FFI 的基础类型，Rust 2024 并未禁止在 FFI 签名中使用 *const T 和 *mut T。',
   '跨越 extern "C" 边界展开 panic 属于未定义行为（或直接 abort），编译器不会自动转成错误码。',
  ],
  explain:'Rust 2024 要求把外部块写为 unsafe extern "C" { ... }，因为声明的外部签名若与实际 C 库不符会直接造成 UB；同时全局符号属性需写为 #[unsafe(no_mangle)]、#[unsafe(export_name = ...)]，以警示符号冲突风险。'},
 {id:'rust-p2-s10',q:'调用 unsafe 函数 std::slice::from_raw_parts(ptr, len) 构造切片时，即使 len 为 0，对传入的 ptr 仍然有什么严格要求？',
  options:[
   'ptr 可以是 std::ptr::null() 空指针，因为长度为 0 时不会真正发生内存解引用',
   'ptr 必须是非空且按元素类型 T 正确对齐的指针（例如可用 NonNull::dangling()）',
   'ptr 必须指向由全局分配器 Box 或 Vec 在堆上实际分配过的一块非零大小内存',
   'ptr 的地址值必须大于 4096，且必须指向当前线程栈帧以内的局部变量地址',
  ],answer:1,
  why:[
   '向 from_raw_parts 传入 null 指针在 Rust 中会立即产生未定义行为（UB），即便 len 为 0 也一样。',
   '',
   'len 为 0 时并不要求真有堆分配，像 NonNull::dangling().as_ptr() 或零大小类型指针都是合法的。',
   '标准库只要求非空和满足 align_of::<T>() 对齐，并没有大于 4096 或必须位于栈上的规定。',
  ],
  explain:'Rust 引用 &[T] 具有非空（non-null）和对齐（aligned）的布局不变量，编译器会利用这一点做 Niche 优化（如 Option<&[T]>）。因此即便 len == 0，把 null 或未对齐指针传给 from_raw_parts 也是即时 UB，空切片应使用 NonNull::dangling().as_ptr() 或 &[]。'},
 {id:'rust-p2-s11',q:'在 64 位平台上，结构体 struct Packet { a: u8, b: u64, c: u16, d: u8 } 在默认 #[repr(Rust)] 与 #[repr(C)] 下的字节大小分别是多少？',
  options:[
   '默认布局下是 24 字节，#[repr(C)] 下也是 24 字节',
   '默认布局下是 12 字节，#[repr(C)] 下是 16 字节',
   '默认布局下是 16 字节，#[repr(C)] 下是 24 字节',
   '默认布局下是 16 字节，#[repr(C)] 下也是 16 字节',
  ],answer:2,
  why:[
   '默认 #[repr(Rust)] 允许编译器重排字段以消除填充空洞，不会像 C 布局那样浪费到 24 字节。',
   '由于含 u64 字段，整个结构体的对齐要求是 8 字节，总大小必须是 8 的整数倍，不可能是 12 字节。',
   '',
   '#[repr(C)] 禁止重排字段：a(1)+pad(7)+b(8)+c(2)+d(1)+pad(5) = 24 字节，不可能是 16 字节。',
  ],
  explain:'#[repr(C)] 严格按声明顺序排列：a 占 1 字节后需填充 7 字节对齐到 8，b 占 8 字节，c 占 2 字节，d 占 1 字节，末尾再填充 5 字节满足整体 8 字节对齐，共 24 字节。默认 #[repr(Rust)] 会将字段重排为 b(8)、c(2)、a(1)、d(1) 加 4 字节尾部填充，缩减到 16 字节。'},
 {id:'rust-p2-s12',q:'在编写 Cargo 包的 features 时，官方规范强调 Feature 必须具备“可加性（Additive）”。下面哪种做法违反了这一原则？',
  options:[
   '开启某个 feature 后为结构体额外实现 serde::Serialize 和 Deserialize',
   '用 default = ["std"] 默认开启标准库支持，同时允许 --no-default-features',
   '开启某个 feature 后引入一个可选依赖，并对外导出基于该依赖的辅助模块',
   '新增一个 no-std 的 feature，开启该 feature 时禁用标准库并改变函数返回类型',
  ],answer:3,
  why:[
   '为已有类型增加 trait 实现属于纯增量扩展，不会破坏只依赖基础功能的其他上游包。',
   '用正面的 std feature 控制标准库、用 --no-default-features 进入 no_std，正是官方推荐的正向可加设计。',
   '启用可选依赖并新增导出模块完全符合可加性，不会导致已有 API 失效。',
   '',
  ],
  explain:'Cargo 在同一个依赖图中会对同一个包的 features 取并集（feature unification）。如果设计成负面开关（如开启 no-std 关闭功能）或破坏函数签名，当依赖树中一个包开启它而另一个包不开启时，合并后就会导致编译失败。'},

 // 二、多选题（少选、多选、错选都不得分）
 {id:'rust-p2-m01',type:'multi',q:'关于 Deref 强制转换（Deref Coercion）与 Drop 析构顺序，下面哪些说法是正确的？',
  options:[
   '若 T 实现了 Deref<Target = U>，则 &T 和 &mut T 都可以在传参时自动转换为 &U',
   '即使 T 只实现了 Deref 而没实现 DerefMut，&mut T 也能被自动强制转换为 &mut U',
   '同一个代码块内的局部变量，在离开作用域时按照与声明相反的顺序依次执行 Drop',
   '结构体被销毁时，会先执行结构体自身的 drop 方法，再按字段声明顺序依次析构各字段',
  ],answers:[0,2,3],
  why:[
   '',
   '将 &mut T 转换为 &mut U 必须要求 T 实现 DerefMut<Target = U>；只实现 Deref 时只能降级转成不可变引用 &U。',
   '',
   '',
  ],
  explain:'Deref 强制转换共有三种：&T -> &U、&mut T -> &mut U（需 DerefMut）、&mut T -> &U。析构顺序上，栈上局部变量采用后进先出（逆序）销毁，而结构体内部字段在外层 drop(&mut self) 执行完毕后，按定义时的先后顺序依次析构。'},
 {id:'rust-p2-m02',type:'multi',q:'关于标准库 std::sync::Mutex 的锁中毒（Poisoning）与守卫机制，下面哪些说法是正确的？',
  options:[
   '当某个线程在持有 MutexGuard 期间发生 panic 时，该互斥锁会被标记为中毒状态',
   '锁中毒后调用 lock() 会返回 Err(PoisonError)，可通过 into_inner() 取出守卫继续访问',
   'MutexGuard 实现了 Send，可以把加锁后拿到的守卫通过 channel 发送给其他线程解锁',
   '在 if let Some(x) = mutex.lock().unwrap().get() 中，锁守卫在进入 if 分支前就已释放',
  ],answers:[0,1],
  why:[
   '',
   '',
   'MutexGuard 专门被设计为 !Send，因为许多底层操作系统互斥原语要求必须在加锁的同一个线程上解锁。',
   'if let / match 条件表达式中产生的临时 MutexGuard 作用域会延续到整个 if 语句块结束，不会在进入分支前释放。',
  ],
  explain:'锁中毒旨在提醒其他线程受保护的数据可能处于不一致状态，但并非永久废除锁，调用 err.into_inner() 仍能恢复守卫。此外，if let 条件中的临时锁守卫会存活到整个 if 语句结束，且 MutexGuard 是 !Send。'},
 {id:'rust-p2-m03',type:'multi',q:'在异步 Rust 与 Tokio 运行时中，关于任务调度与阻塞处理，下面哪些做法或认知是正确的？',
  options:[
   'Future 是惰性的，调用 async fn 只会返回状态机实例，直到被 .await 或被执行器 poll 才会推进',
   '在异步任务中执行耗时几十毫秒的同步文件压缩或密码哈希，应放到 tokio::task::spawn_blocking 中运行',
   'tokio::select! 在某一个分支率先完成时，其余未完成的分支如果是临时创建的 Future 会被直接 drop 取消',
   'tokio::spawn 派生的后台任务可能被调度到任意工作线程，因此要求该 Future 满足 Send 与 static 约束',
  ],answers:[0,1,2,3],
  why:[
   '',
   '',
   '',
   '',
  ],
  explain:'Tokio 的异步 worker 线程采用协作式调度；若直接跑同步 IO 或重 CPU 计算会饿死同线程上的其他任务，必须用 spawn_blocking 交给专用阻塞线程池。select! 未命中分支会被 drop，而 tokio::spawn 要求 Future: Send + \'static。'},
 {id:'rust-p2-m04',type:'multi',q:'下列哪些操作属于必须放在 unsafe 块或 unsafe 函数中才能通过编译的“五种超能力”？',
  options:[
   '解引用裸指针（如读取 *const T 或写入 *mut T）以及调用 unsafe 函数',
   '将一个普通引用 &T 转换为裸指针 *const T，或者使用 std::mem::forget 放弃析构',
   '访问或修改可变静态变量（static mut），以及访问联合体（union）的字段',
   '为一个自定义类型实现带有 unsafe 标记的 trait（如 Send、Sync 或 GlobalAlloc）',
  ],answers:[0,2,3],
  why:[
   '',
   '创建裸指针（&x as *const T）以及调用 mem::forget 造成内存泄漏在 Rust 中都属于完全安全的代码，不需要 unsafe。',
   '',
   '',
  ],
  explain:'Unsafe Rust 的五种特权是：1) 解引用裸指针；2) 调用 unsafe 函数或方法；3) 访问或修改可变静态变量；4) 实现 unsafe trait；5) 访问 union 字段。注意：创建裸指针和调用 mem::forget（内存泄漏）在 Rust 类型安全模型中都属于 Safe Rust。'},
 {id:'rust-p2-m05',type:'multi',q:'下列哪些类型利用了编译器的利基优化（Niche Optimization），使得 Option<T> 与 T 自身的字节大小相等？',
  options:[
   '&u64 与 &mut Vec<u8>（普通共享引用与独占可变引用）',
   'Box<String> 与 std::ptr::NonNull<u8>（非空堆指针与非空裸指针包装）',
   'std::num::NonZeroU32 与 fn(i32) -> i32（非零整数与函数指针）',
   '*const u8 与 i64（普通不可变裸指针与全部位模式合法的有符号整数）',
  ],answers:[0,1,2],
  why:[
   '',
   '',
   '',
   '*const u8 可以合法取 null（0），i64 的所有 2^64 种位模式也都是合法整数，没有任何空闲位模式可用作 None，因此它们的 Option 会额外增大。',
  ],
  explain:'利基优化利用类型本身永远不会出现的非法位模式（例如全 0）来表示 Option::None。引用、Box、NonNull、函数指针以及 NonZero* 系列都不允许为 0，因此包上 Option 后不增加任何体积；而裸指针 *const T 和普通整数所有位模式均有效，无法享受该优化。'},
 {id:'rust-p2-m06',type:'multi',q:'关于 Rust 的声明宏（macro_rules!）与过程宏（Procedural Macros），下面哪些说法是正确的？',
  options:[
   '声明宏具备卫生性（Hygiene），宏内部定义的局部标识符默认不会与调用处的同名变量发生意外冲突',
   '过程宏必须定义在 Cargo.toml 中标记了 proc-macro = true 的独立 crate 里，并在编译期执行',
   '#[derive(MyTrait)] 派生宏不仅能为目标结构体追加 impl 块，还能直接修改或删除原结构体的字段定义',
   'macro_rules! 中的每个宏分支在展开前就会立刻做完整的类型检查，即使该宏从未被任何代码调用',
  ],answers:[0,1],
  why:[
   '',
   '',
   'derive 派生宏的输入只用于生成追加在原条目之后的新代码（如 impl 块），不会修改或替换原结构体的定义；要修改原条目需用属性宏。',
   'macro_rules! 在定义时只检查语法结构，真正的类型检查是在宏被调用并展开为具体 AST 之后才进行的。',
  ],
  explain:'声明宏通过模式匹配替换语法树，并具有标识符卫生性，在展开后才进行类型检查；过程宏在编译期以 TokenStream 为输入输出，必须放在独立的 proc-macro crate 中。三类过程宏里，derive 宏只能增量追加代码。'},
 {id:'rust-p2-m07',type:'multi',q:'在大型 Rust 项目的错误处理与可观测性设计中，关于 thiserror、anyhow 和 tracing，下面哪些实践是推荐的？',
  options:[
   '对外提供复用的基础库推荐使用 thiserror 定义枚举错误，以便调用方能按具体错误变体进行 match 处理',
   '顶层业务应用或命令行工具推荐使用 anyhow::Result 搭配 .context()，快速聚合多来源错误并附加上下文',
   '在异步函数中追踪跨 .await 的执行区间时，应当使用 .instrument(span) 而不是跨挂起点持有 span.enter() 守卫',
   'thiserror 支持通过 #[from] 自动生成 From 实现用于 ? 转换，或用 #[source] 指定底层原因错误供 source() 追溯',
  ],answers:[0,1,2,3],
  why:[
   '',
   '',
   '',
   '',
  ],
  explain:'库重类型契约（thiserror 枚举），应用重上下文聚合（anyhow::Result + context）。在异步场景中，由于同一个工作线程会交替轮询多个 Future，跨 .await 持有 Entered 守卫会污染其他任务的 Span 上下文，正确做法是使用 tracing::Instrument::instrument。'},
 {id:'rust-p2-m08',type:'multi',q:'下面哪些行为属于 Rust 中的未定义行为（Undefined Behavior，简称 UB），且可以通过 cargo miri test 进行检测？',
  options:[
   '通过裸指针同时构造出指向同一内存区域的两个可变引用 &mut T 并交替使用',
   '用 MaybeUninit::uninit().assume_init() 直接构造一个未初始化的 bool 或引用类型',
   '通过裸指针访问跨越分配块边界的内存，或者使用已经释放（dangling）的堆内存指针',
   '调用 Vec::with_capacity(1024) 分配内存后使用 std::mem::forget 使其直到进程结束都不释放',
  ],answers:[0,1,2],
  why:[
   '',
   '',
   '',
   '内存泄漏（例如 mem::forget 或 Rc 循环引用）在 Rust 语言规范中明确不属于未定义行为（尽管 Miri 也能开启泄漏提示，但它不是 UB）。',
  ],
  explain:'违反借用别名规则（同时存在活跃的可变引用与其他引用）、读取未初始化内存或构造非法位模式（如非 0/1 的 bool）、越界与悬垂指针解引用都是典型的 UB。Miri 通过解释执行 MIR 并检查 Stacked/Tree Borrows 模型，能精准捕获这些 UB。'},

 // 三、判断题
 {id:'rust-p2-j01',type:'judge',q:'Cow<\'a, str>（Clone-on-Write）只有在需要对数据进行修改（调用 to_mut）或显式提取所有权（into_owned）时，才会对借用的切片执行堆分配与克隆。',
  answer:true,
  explain:'Cow 枚举包含 Borrowed(&\'a B) 和 Owned(<B as ToOwned>::Owned) 两个变体。只读场景下直接持有借用而不分配堆内存；只有在调用 to_mut() 修改数据且当前处于 Borrowed 状态时，才会触发一次克隆升级为 Owned。'},
 {id:'rust-p2-j02',type:'judge',q:'对于任意类型 T，只有当不可变引用 &T 实现了 Send（即不可变引用可以安全发送到另一个线程使用）时，类型 T 才满足 Sync。',
  answer:true,
  explain:'Sync 的精确定义就是：T: Sync 当且仅当 &T: Send。如果多个线程都能通过共享引用 &T 安全地并发访问同一份数据，那么把 &T 发送给别的线程就是安全的。'},
 {id:'rust-p2-j03',type:'judge',q:'在 unsafe { ... } 代码块内部，Rust 编译器会暂时关闭借用检查器（Borrow Checker）和生命周期检查，允许对普通安全引用直接做多重可变借用。',
  answer:false,
  explain:'unsafe 块绝不会关闭借用检查器！普通引用（&T 和 &mut T）在 unsafe 块中依然受生命周期和借用规则的完整约束；unsafe 只是开启了五种超能力（如解引用裸指针、调用 unsafe 函数等）。'},
 {id:'rust-p2-j04',type:'judge',q:'使用 #[repr(transparent)] 修饰的单字段包装结构体（Newtype），在内存布局和函数调用 ABI 上与它内部唯一的非零大小字段完全一致。',
  answer:true,
  explain:'#[repr(transparent)] 要求结构体有且仅有一个非零大小字段（可以附带任意个零大小的 PhantomData），并保证外层包装类型与内层字段拥有完全相同的大小、对齐和 C ABI 传参规则，常用于 FFI 强类型封装。'},
 {id:'rust-p2-j05',type:'judge',q:'在异步编程中，如果一个自定义结构体只包含整数、String、Vec<u8> 等常规字段，那么它默认不会实现 Unpin，必须添加特殊标记才能放入 Pin 中。',
  answer:false,
  explain:'恰好相反：Unpin 是一个自动派生 trait（auto trait），绝大多数常规类型（整数、String、Vec、普通引用等）都默认自动实现了 Unpin；只有包含 PhantomPinned 或由 async 块生成的自引用状态机才是 !Unpin。'},
 {id:'rust-p2-j06',type:'judge',q:'调用 AtomicUsize::compare_exchange_weak 时，即使当前原子变量的实际值等于预期的 current 值，该操作也有可能因为底层硬件原因而伪失败（Spurious Failure）。',
  answer:true,
  explain:'在 ARM、RISC-V 等采用 LL/SC（Load-Linked / Store-Conditional）指令的架构上，缓存行争用或上下文切换会导致即使值相等也写入失败。因此 compare_exchange_weak 允许伪失败且性能更好，通常配合循环重试使用。'},

 // 四、填空题（共 15 个空，每空 1 分）
 {id:'rust-p2-f01',type:'fill',q:'在尚未离开当前作用域时，若希望提前主动销毁一个智能指针或释放锁守卫，应当调用标准库预导入的 ＿(x) 函数，而不能直接显式调用 x.drop() 方法。',
  accepted:['drop','std::mem::drop'],
  explain:'编译器禁止直接调用 Drop::drop(&mut self) 以防离开作用域时发生二次析构（double free）；std::mem::drop(x) 通过按值接收所有权并让形参在函数结束时自然析构来实现提前释放。'},
 {id:'rust-p2-f02',type:'fill',q:'将 Rc<T> 降级为不增加强引用计数的弱引用应调用 Rc::＿(&rc)；在使用弱引用前，必须调用其 ＿() 方法尝试将其转为 Option<Rc<T>>。',
  accepted:['downgrade'],blanks:[['downgrade','Rc::downgrade'],['upgrade']],
  explain:'Rc::downgrade(&rc) 创建 Weak<T> 并使 weak_count 加 1；由于目标对象可能已被销毁，读取时必须调用 weak.upgrade()，若 strong_count > 0 则返回 Some(Rc<T>)，否则返回 None。'},
 {id:'rust-p2-f03',type:'fill',q:'对 RefCell<T> 调用 borrow() 会返回不可变借用守卫 Ref<T>，而若想在运行时不触发 panic 地尝试获取可变借用，应当调用 ＿() 方法，它返回 Result<RefMut<T>, BorrowMutError>。',
  accepted:['try_borrow_mut'],
  explain:'borrow_mut() 在发生借用冲突时会直接 panic；如果不确定当前是否已有活跃借用，应使用 try_borrow_mut()（以及对应的不可变版本 try_borrow()）通过 Result 优雅处理冲突。'},
 {id:'rust-p2-f04',type:'fill',q:'在五种原子内存序中，仅保证当前原子变量自身读写的原子性、不提供任何跨线程同步与重排约束的是 Ordering::＿；而提供全局唯一操作总序的最强内存序是 Ordering::＿。',
  accepted:['Relaxed'],blanks:[['Relaxed','Ordering::Relaxed'],['SeqCst','Ordering::SeqCst']],
  explain:'Relaxed 开销最小，适合单纯的计数器；SeqCst（Sequentially Consistent）在 Acquire/Release 基础上额外保证所有线程看到的 SeqCst 操作顺序完全一致，开销也最大。'},
 {id:'rust-p2-f05',type:'fill',q:'标准库 Future trait 中，核心方法 poll 的返回类型是 Poll<Self::Output>，该枚举包含表示已完成的 ＿(T) 和表示尚未就绪的 ＿ 两个变体。',
  accepted:['Ready'],blanks:[['Ready','Poll::Ready'],['Pending','Poll::Pending']],
  explain:'Poll<T> 只有 Poll::Ready(T) 和 Poll::Pending 两个变体：Ready 携带最终计算结果（此后不应再对该 Future 调用 poll），Pending 表示需等待 Waker 唤醒后再重新轮询。'},
 {id:'rust-p2-f06',type:'fill',q:'若想让一个自定义结构体显式退出 Unpin 自动实现（即变成 !Unpin），可以在结构体中添加一个类型为 std::marker::＿ 的零大小标记字段。',
  accepted:['PhantomPinned'],
  explain:'PhantomPinned 是标准库提供的零大小类型（ZST），它自身未实现 Unpin；由于 auto trait 的传递规则，任何包含 PhantomPinned 字段的结构体都会自动变成 !Unpin。'},
 {id:'rust-p2-f07',type:'fill',q:'在定义不携带某泛型参数 T 或某生命周期 \'a 的实际数据、但希望编译器在类型检查和 Drop 检查中表现得像拥有它一样时，应使用 std::marker::＿ 零大小类型。',
  accepted:['PhantomData','PhantomData<T>'],
  explain:'PhantomData<T> 在运行时占 0 字节，但能告诉编译器该结构体在型变（variance）、Send/Sync 推导以及退化检查（drop check）上的所有权或借用关系，常用于裸指针包装和生命周期绑定。'},
 {id:'rust-p2-f08',type:'fill',q:'在安全地逐步初始化一块栈上或堆上内存、避免读取未初始化内存触发 UB 时，应当使用标准库 std::mem::＿<T> 包装类型，并在确认全部写入完成后调用其 unsafe 方法 ＿() 取出 T。',
  accepted:['MaybeUninit'],blanks:[['MaybeUninit'],['assume_init']],
  explain:'直接用已废弃的 mem::uninitialized::<T>() 会立即触发 UB（尤其是含引用、bool、枚举等具有非法位模式的类型）。MaybeUninit<T> 告诉编译器内部内存可能未初始化，写完后通过 unsafe { val.assume_init() } 完成转换。'},
 {id:'rust-p2-f09',type:'fill',q:'在声明宏 macro_rules! 的重复匹配模式 $( $x:expr ),* 中，星号 * 表示匹配 ＿ 次或多次；若要求至少匹配一次，应当把星号替换为符号 ＿。',
  accepted:['0'],blanks:[['0','零'],['+']],
  explain:'macro_rules! 的重复量词与正则表达式类似：* 表示 0 次或多次，+ 表示 1 次或多次，? 表示 0 次或 1 次。'},
 {id:'rust-p2-f10',type:'fill',q:'使用 serde 进行序列化或反序列化时，若希望把结构体中所有的 snake_case 字段名统一自动映射为驼峰命名 camelCase，应在结构体上添加属性 #[serde(＿ = "camelCase")]。',
  accepted:['rename_all'],
  explain:'#[serde(rename_all = "camelCase")] 会批量将结构体字段或枚举变体名按指定风格转换，免去在每个字段上逐一手写 #[serde(rename = "...")] 的繁琐。'},

 // 五、简答题（每题 5 分）
 {id:'rust-p2-q01',type:'short',q:'请对比 Rc<RefCell<T>> 与 Arc<Mutex<T>> 的设计目的、适用场景与性能/安全边界，并说明各自容易踩到的运行时隐患。',
  reference:'1. 适用线程边界：Rc<RefCell<T>> 仅用于单线程环境（Rc 和 RefCell 都是 !Sync，Rc 还是 !Send），适合图、树、UI 组件或观察者模式中多所有者加内部可变性的场景；Arc<Mutex<T>> 实现了 Send + Sync，用于多线程间共享且需要修改的状态。\n2. 开销与机制对比：Rc 使用普通非原子整数增减引用计数，RefCell 使用普通整数在运行时记录借用计数，无原子指令和系统调用开销；Arc 使用硬件原子指令维护计数，Mutex 在争用时涉及操作系统线程阻塞与唤醒，开销更高。\n3. 常见运行时隐患：RefCell 在同一线程内若违背“多个不可变借用或一个可变借用”（如跨函数调用未及时释放 RefMut）会在运行时直接 panic；Mutex 在同一线程重入加锁或多线程加锁顺序不一致时会产生死锁，持锁线程 panic 还会触发锁中毒（Poisoning）；此外两者若形成强引用环都会造成内存泄漏，需配合 Weak 打破循环。',
  points:[
   '线程边界：Rc<RefCell<T>> 仅限单线程（!Send/!Sync），Arc<Mutex<T>> 用于多线程（Send + Sync）',
   '机制与开销：非原子计数 + 运行时借用检查 vs 原子引用计数 + 互斥锁同步阻塞',
   'RefCell 隐患：同一线程内借用作用域重叠会在运行时触发 BorrowMutError panic',
   'Mutex 与引用环隐患：锁重入/加锁顺序不当导致死锁、锁中毒，以及强引用环需用 Weak 打破',
  ],scores:[1,1,1,2],
  explain:'这道题是 Rust 面试高频必考题，核心是区分“单线程 vs 多线程”下“共享所有权（Rc/Arc）+ 内部可变性（RefCell/Mutex）”的正交组合。'},
 {id:'rust-p2-q02',type:'short',q:'深入解释 Send 和 Sync 两个标记 trait 的含义、它们之间的推导关系，并说明为什么裸指针（*const T / *mut T）和 Rc<T> 不实现它们，而在 FFI 封装中该如何安全地让包含裸指针的类型跨线程使用？',
  reference:'1. 含义与关系：Send 表示类型的所有权可以安全地跨线程转移；Sync 表示类型的不可变引用可以安全地在多个线程间同时共享。两者的数学关系是：T: Sync 当且仅当 &T: Send（而 &mut T: Send 当且仅当 T: Send）。\n2. 为什么 Rc 和裸指针不实现：Rc 内部使用非原子的 Cell<usize> 维护强弱引用计数，若两个线程同时克隆或 drop 同一个 Rc 的副本，会产生非原子数据竞争（UB），因此 Rc 既不是 Send 也不是 Sync。裸指针本身不包含任何生命周期、所有权或同步保护信息，编译器无法验证其指向的内存是否线程安全，因此出于保守原则将 *const T 和 *mut T 设为 !Send + !Sync。\n3. FFI 安全封装做法：不应在业务代码中直接传递裸指针，而应将裸指针封装在私有字段的 Newtype 结构体中（不对外暴露裸指针）；在人工确认底层 C 库句柄满足线程安全不变量（例如可跨线程移动句柄，或 C 库内部已加锁）后，为该包装结构体显式编写 unsafe impl Send for Wrapper {}（以及在确实支持并发调用时才写 unsafe impl Sync for Wrapper {}），并通过方法签名（如修改操作要求 &mut self）在安全抽象层守卫并发不变量。',
  points:[
   '准确说明 Send（所有权可跨线程转移）与 Sync（共享引用可跨线程并发访问）的含义',
   '指出核心等价关系：T: Sync 当且仅当 &T: Send',
   '解释 Rc 因非原子引用计数会导致数据竞争、裸指针无安全语义保证而均为 !Send + !Sync',
   '说明 FFI 封装实践：用私有字段结构体包装裸指针，验证底层线程安全契约后 unsafe impl Send/Sync 并用 &self/&mut self 约束接口',
  ],scores:[1,1,1,2],
  explain:'考察对 Rust 并发安全基石的理解，尤其是“为什么裸指针默认 !Send/!Sync”以及如何围绕 unsafe impl Send/Sync 构建安全抽象。'},
 {id:'rust-p2-q03',type:'short',q:'Rust 的 async/await 为什么被称为“零成本异步抽象”？请简述编译器如何将 async fn 编译为状态机，以及为什么这种状态机会产生自引用并需要 Pin。',
  reference:'1. 零成本状态机编译：不同于需要为每个协程动态分配独立调用栈的运行时，Rust 编译器在编译期将 async fn 转换得像一个枚举状态机（每个 .await 挂起点对应一个枚举变体）。状态机的大小在编译期完全确定，只保存跨越 .await 存活的局部变量，无需默认堆分配，且 poll 调用可被内联优化。\n2. 自引用的产生：如果在 async 函数中先定义了局部变量 x，又定义了引用 r = &x，随后经过了一个 .await 并在恢复后继续使用 r，那么生成的枚举状态机结构体就必须同时保存字段 x 和指向字段 x 的指针 r。这使状态机变成了一个指向自身内部地址的“自引用结构体”。\n3. 为什么需要 Pin：如果这个自引用状态机在第一次被 poll 后被移动到了新的内存地址（例如通过 mem::swap 或重新赋值移动），字段 x 的地址变了，但字段 r 里存的仍然是旧地址，再次恢复执行解引用 r 就会读到悬垂指针，造成严重的内存安全漏洞（UB）。因此该状态机被标记为 !Unpin，且 Future::poll 的接收者被设计为 Pin<&mut Self>，从类型系统层面保证一旦开始轮询，对象在内存中的地址就固定不变，直到析构为止。',
  points:[
   '编译期将 async fn 转化为枚举状态机，每个 .await 对应一个状态变体，编译期确定大小、无默认栈分配开销',
   '跨 .await 存活的局部变量和指向该局部变量的引用会同时保存在状态机字段中，形成自引用结构体',
   '一旦对象在内存中被移动（如 mem::swap），自引用指针仍指向旧地址就会变成悬垂指针导致 UB',
   '通过 !Unpin + Pin<&mut Self> 禁止安全代码获取 &mut Self，从而保证状态机一旦被轮询就固定在原内存地址直至 Drop',
  ],scores:[1,1,1,2],
  explain:'把 async 状态机转化、跨 .await 借用产生自引用、移动导致悬垂指针、Pin<&mut Self> 封死移动这四步逻辑串起来，是理解 Rust 异步底层的关键。'},
 {id:'rust-p2-q04',type:'short',q:'在编写 Unsafe Rust 或 FFI 代码时，什么是“安全抽象（Safe Abstraction）”？请结合借用别名规则与切片/未初始化内存，列举 4 类常见的未定义行为（UB）及其规避手段。',
  reference:'1. 安全抽象的核心原则：将必须使用 unsafe 的底层操作封装在模块私有实现内部，对外暴露没有 unsafe 标记的安全函数或方法；并且必须保证“无论外部调用者向该安全 API 传入什么合法的 Safe Rust 参数、以何种顺序调用，都不可能触发未定义行为”。如果调用者需要遵守额外前置条件才能避免 UB，则该函数必须标记为 unsafe fn 并在文档的 # Safety 小节写明契约。\n2. 四类常见 UB 与规避：\n- 借用别名冲突：同时构造出指向同一内存的 &mut T 与另一个 &T / &mut T（即使暂未写入也违反 Stacked/Tree Borrows）。规避：在裸指针运算阶段全程使用裸指针，直到确认无重叠且生命周期受控时再转为引用。\n- 悬垂/空指针/未对齐引用：把 null、未对齐地址或越界长度传给 slice::from_raw_parts。规避：长度 0 时使用 NonNull::dangling() 或 &[]，转换前校验非空、对齐及总字节数不超过 isize::MAX。\n- 读取未初始化内存或构造非法位模式：对 bool 赋予非 0/1、对枚举赋予非法判别式、对含引用的结构体直接未初始化读取。规避：一律使用 MaybeUninit<T> 按字段或 ptr::write 初始化后再 assume_init()。\n- 跨 FFI 边界展开 panic 或双重释放：Rust 回调在 C 栈帧中 panic 展开会导致 UB，或双方同时释放同一块内存。规避：FFI 入口使用 std::panic::catch_unwind 拦截 panic，明确内存“谁分配谁释放”并提供专用释放函数。',
  points:[
   '安全抽象原则：对内封装 unsafe，对外提供无论传入何种合法参数都不会触发 UB 的安全接口（否则必须标为 unsafe fn）',
   '别名规则类 UB：禁止同时存在指向同一内存的 &mut T 与其他引用，操作阶段应保持使用裸指针',
   '切片/指针类 UB：from_raw_parts 要求指针非空、正确对齐、连续有效，空切片应使用 NonNull::dangling()',
   '未初始化内存与 FFI 类 UB：使用 MaybeUninit 避免非法位模式，FFI 边界使用 catch_unwind 防止跨语言栈展开并明确内存释放权属',
  ],scores:[2,1,1,1],
  explain:'Unsafe 的意义不是“绕过编译器”，而是由程序员人工证明不变量后构建坚固的安全边界（Safe Abstraction）。'},
 {id:'rust-p2-q05',type:'short',q:'在网络协议解析或大数据处理场景中，Rust 如何实现“零拷贝（Zero-Copy）”？请说明生命周期借用、Cow<\'a, [u8]> 与 bytes::Bytes 各自的优缺点与适用场景。',
  reference:'1. 基于生命周期借用（&\'a [u8] / &\'a str / Serde 借用反序列化）：解析出的数据结构直接持有指向原始输入缓冲区的切片引用（如 struct Frame<\'a> { payload: &\'a [u8] }）。优点是真正的零分配、零引用计数开销，性能最高；缺点是结构体带上了传染性的生命周期参数 \'a，受限于底层缓冲区的作用域，难以直接放进要求 \'static 的异步任务（如 tokio::spawn）或长期缓存中。\n2. 写时克隆 Cow<\'a, str> / Cow<\'a, [u8]>：在绝大多数无需转义或修改的热路径上直接使用 Cow::Borrowed(&\'a str) 零拷贝借用原缓冲区；只在遇到需要解码转义字符或修改的冷路径时才分配堆内存转为 Cow::Owned。兼顾了热路径零分配与按需修改的灵活性，但依然携带生命周期 \'a。\n3. 引用计数切片 bytes::Bytes：底层通过原子引用计数共享同一块不可变堆内存，支持 O(1) 成本的 slice() 子切片切分和 clone()，且类型本身不带生命周期（满足 Send + Sync + \'static）。缺点是有一次初始堆分配和原子计数开销，但非常适合跨异步任务、跨 channel 传递网络帧。',
  points:[
   '生命周期借用（&\'a [u8] / &\'a str）：真正零分配零开销，但生命周期 \'a 具有传染性，难以跨 \'static 异步任务传递',
   'Cow<\'a, B> 写时克隆：未修改/无需转义时走 Borrowed 零拷贝，需修改/转义时才走 Owned 分配，适合冷热路径分离',
   'bytes::Bytes：基于原子引用计数共享底层缓冲，支持 O(1) 切分子切片且满足 \'static + Send + Sync，适合异步网络与跨任务传输',
   '能结合具体场景总结工程取舍（同步栈内解析优先借用/Cow，异步跨任务流转优先 Bytes）',
  ],scores:[1,1,2,1],
  explain:'零拷贝不是单一技术，而是在“纯借用切片（最高性能但受限于生命周期）”、“Cow（按需分配）”与“Bytes（引用计数换取 \'static）”之间按场景取舍。'},

 // 六、代码题
 {id:'rust-p2-c01',type:'code',q:'请使用标准库的原子类型与内存序，实现一个线程安全的“单次自旋初始化器” OnceCell<T>（不依赖 std::sync::OnceLock 或 Mutex）：\n1. 结构体定义包含 state: AtomicU8（0=未初始化，1=初始化中，2=已初始化）和 value: UnsafeCell<MaybeUninit<T>>。\n2. 为 OnceCell<T> 正确实现 Send 和 Sync 的 unsafe impl（写出正确的 trait 约束）。\n3. 实现 pub fn get_or_init<F: FnOnce() -> T>(&self, f: F) -> &T：多个线程并发调用时，只有一个线程执行 f() 写入数据，其余线程等待初始化完成后返回同一个 &T 引用。（假设 f() 不会发生 panic）\n4. 实现 Drop，确保已初始化的 T 在 OnceCell 销毁时被正确析构。',
  reference:`use std::cell::UnsafeCell;
use std::mem::MaybeUninit;
use std::sync::atomic::{AtomicU8, Ordering};

const UNINIT: u8 = 0;
const RUNNING: u8 = 1;
const READY: u8 = 2;

pub struct OnceCell<T> {
    state: AtomicU8,
    value: UnsafeCell<MaybeUninit<T>>,
}

// 跨线程转移 OnceCell 所有权要求 T: Send；
// 多线程通过 &OnceCell 共享访问 &T 且任一线程都可能完成首次写入，要求 T: Send + Sync。
unsafe impl<T: Send> Send for OnceCell<T> {}
unsafe impl<T: Send + Sync> Sync for OnceCell<T> {}

impl<T> OnceCell<T> {
    pub const fn new() -> Self {
        Self {
            state: AtomicU8::new(UNINIT),
            value: UnsafeCell::new(MaybeUninit::uninit()),
        }
    }

    pub fn get_or_init<F: FnOnce() -> T>(&self, f: F) -> &T {
        // 快路径：用 Acquire 加载，若已 READY，则保证能看到写入线程在 Release 前写入的 T
        if self.state.load(Ordering::Acquire) == READY {
            return unsafe { (*self.value.get()).assume_init_ref() };
        }

        // 尝试抢占初始化权：从 UNINIT 切换到 RUNNING
        if self
            .state
            .compare_exchange(UNINIT, RUNNING, Ordering::Acquire, Ordering::Acquire)
            .is_ok()
        {
            let val = f();
            unsafe {
                (*self.value.get()).write(val);
            }
            // 用 Release 发布状态为 READY，建立与后续读者 Acquire 的 happens-before 关系
            self.state.store(READY, Ordering::Release);
        } else {
            // 其他线程正在初始化，自旋等待直到状态变为 READY（需用 Acquire 读取）
            while self.state.load(Ordering::Acquire) != READY {
                std::hint::spin_loop();
            }
        }

        unsafe { (*self.value.get()).assume_init_ref() }
    }
}

impl<T> Drop for OnceCell<T> {
    fn drop(&mut self) {
        // 拥有 &mut self 时无并发竞争，可用 get_mut() 或 Relaxed 判断是否需要析构内部 T
        if *self.state.get_mut() == READY {
            unsafe {
                (*self.value.get()).assume_init_drop();
            }
        }
    }
}`,
  points:[
   '正确写出 unsafe impl<T: Send> Send 和 unsafe impl<T: Send + Sync> Sync 约束（Sync 需同时要求 T: Send + Sync）',
   '使用 compare_exchange 抢占 UNINIT -> RUNNING 状态，未抢到的线程循环等待（配合 spin_loop）直到 READY',
   '内存序正确配对：写入 UnsafeCell<MaybeUninit<T>> 后使用 Ordering::Release 发布 READY，读取端使用 Ordering::Acquire 读取 READY 后再 assume_init_ref()',
   '正确实现 Drop：仅在状态为 READY 时对 MaybeUninit<T> 调用 assume_init_drop()，避免未初始化析构或内存泄漏',
  ],scores:[2,3,3,2],
  explain:'这道题综合考察 UnsafeCell、MaybeUninit、Send/Sync 约束推导以及 Release-Acquire 内存序配对。若写入后用 Relaxed 更新 state 或读取端用 Relaxed 判断 READY，在弱内存序架构（如 ARM）下会导致读者读到尚未刷新的未初始化内存。'},
 {id:'rust-p2-c02',type:'code',q:'在 Tokio 异步环境下，实现一个通用的“带最大并发度限制与超时取消的批量执行器”：\n函数签名为：\npub async fn run_bounded<T, E, Fut>(\n    tasks: Vec<Fut>,\n    max_concurrency: usize,\n    per_task_timeout: Duration,\n) -> Result<Vec<T>, E>\n其中：\n- Fut: Future<Output = Result<T, E>> + Send + \'static，T: Send + \'static，E: From<tokio::time::error::Elapsed> + Send + \'static。\n- 最多同时运行 max_concurrency 个任务（保证 max_concurrency >= 1）；每个任务真正开始执行后有 per_task_timeout 的超时限制（超时通过 E::from 转成错误）。\n- 如果所有任务都成功，按输入 tasks 的原始顺序返回 Ok(Vec<T>)；只要有任何一个任务返回 Err 或超时，立刻取消其余尚未完成的子任务并返回这第一个错误，不泄漏后台任务。',
  reference:`use std::future::Future;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tokio::time::timeout;

pub async fn run_bounded<T, E, Fut>(
    tasks: Vec<Fut>,
    max_concurrency: usize,
    per_task_timeout: Duration,
) -> Result<Vec<T>, E>
where
    Fut: Future<Output = Result<T, E>> + Send + 'static,
    T: Send + 'static,
    E: From<tokio::time::error::Elapsed> + Send + 'static,
{
    let total = tasks.len();
    let sem = Arc::new(Semaphore::new(max_concurrency.max(1)));
    let mut set = JoinSet::new();

    for (idx, fut) in tasks.into_iter().enumerate() {
        let sem_clone = Arc::clone(&sem);
        set.spawn(async move {
            // 先获取信号量许可，拿到许可后才开始计时并执行任务
            let _permit = sem_clone.acquire_owned().await.expect("semaphore closed");
            let res = timeout(per_task_timeout, fut).await;
            let val = match res {
                Ok(Ok(v)) => Ok(v),
                Ok(Err(e)) => Err(e),
                Err(elapsed) => Err(E::from(elapsed)),
            };
            (idx, val)
        });
    }

    let mut results: Vec<Option<T>> = (0..total).map(|_| None).collect();

    while let Some(join_res) = set.join_next().await {
        let (idx, task_res) = join_res.expect("task panicked");
        match task_res {
            Ok(val) => {
                results[idx] = Some(val);
            }
            Err(err) => {
                // 任一任务失败，立刻 abort 其余所有在飞任务（JoinSet drop 时也会自动 abort）
                set.abort_all();
                return Err(err);
            }
        }
    }

    Ok(results.into_iter().map(| item | item.unwrap()).collect())
}`,
  points:[
   '使用 Arc<tokio::sync::Semaphore>（acquire_owned / acquire）准确限制并发运行任务数为 max_concurrency',
   '在获取到信号量许可之后才对单个任务套用 tokio::time::timeout(per_task_timeout, fut)，避免排队等待时间被计入任务执行超时',
   '通过记录原始下标 idx 并将结果填入预分配的 Vec<Option<T>>，保证最终按输入顺序返回 Vec<T>',
   '使用 JoinSet（或 FuturesUnordered / AbortHandle）管理任务，遇到首个错误时立即 abort 取消剩余任务并返回 Err，无后台任务泄漏',
   '类型约束、所有权转移（async move）与 Elapsed 错误转换处理完整无误',
  ],scores:[3,3,3,3,2],
  explain:'常见扣分点：1) 在 acquire 信号量之前就开始算 timeout，导致排在后面的任务还没跑就超时；2) 用 tokio::spawn 但出错返回时没有 abort 剩余的 JoinHandle，导致后台任务继续运行泄漏；3) 没有保存 idx 导致结果顺序变成完成先后顺序。'},

 // 七、综合题（设计 + 代码）
 {id:'rust-p2-d01',type:'design',q:`设计并实现一个面向高并发异步网关的“分片式请求合并与热点缓存组件” ShardedCoalescingCache<K, V>：
业务背景：网关背后是高成本的下游存储。大量并发异步请求可能在同一时刻查询同一个热点 Key（缓存击穿 / 惊群效应）。我们需要一个进程内异步组件满足以下要求：
1. 读多写少且高并发：按 Key 的哈希值分片（Sharding）以降低锁竞争；切勿跨越 .await 持有同步锁（std::sync::MutexGuard / RwLockGuard）。
2. 带过期时间（TTL）：支持 get_or_try_init(key, ttl, loader) 方法。若缓存命中且未过期，直接返回克隆的值 V；若已过期或未命中，则触发异步回源加载。
3. 请求合并（Singleflight / Request Coalescing）：当多个并发任务同时请求同一个未命中/已过期的 Key 时，只允许第一个任务真正执行异步 loader 回源，其余同 Key 请求在异步等待通道（如 tokio::sync::watch 或 Notify/Broadcast）上等待并直接共享这次回源的结果；若回源失败，本轮等待者都收到错误，且后续新请求可以重新发起回源（不能永久卡死在 in-flight 状态）。
4. 取消安全（Cancel Safety）与防死锁：如果首个发起回源的调用方因为外层 timeout 被 drop 取消，不能导致其余等待同一个 Key 的任务永久挂起（可将回源放到独立 spawn 任务或用 Drop 守卫清理 in-flight 表）。

请先阐述架构设计（分片与锁选型、缓存与 in-flight 状态分离、请求合并与广播机制、取消安全保障），再给出核心可编译的 Rust 代码实现。`,
  reference:`### 一、架构设计
1. **分片与并发锁选型**：
   - 将整个组件划分为 N 个独立分片（如 16 或 64 个 Shard），通过 \`DefaultHasher\` 计算 \`hash(key) % N\` 定位分片。
   - 每个分片内部维护两张表：\`data: HashMap<K, CacheEntry<V>>\`（存放已缓存的值和过期时刻 \`Instant\`）与 \`inflight: HashMap<K, watch::Receiver<Option<Result<V, String>>>>\`（存放正在回源中的广播接收端）。
   - 因为对这两张表的查找、插入和删除都是纯内存的 O(1) 操作，耗时极短且绝不跨越 \`.await\`，所以分片锁选用同步的 \`std::sync::Mutex<Shard<K, V>>\`（或 \`parking_lot::Mutex\`），比 \`tokio::sync::Mutex\` 更快；关键在于**在进入任何 \`.await\` 之前必须离开锁作用域释放 \`MutexGuard\`**。
2. **请求合并（Singleflight）机制**：
   - 当请求进入 \`get_or_try_init\` 时，先加分片锁检查 \`data\`：若存在且 \`now < expires_at\`，直接返回 \`entry.val.clone()\`。
   - 若未命中或已过期，在同一把锁内检查 \`inflight\` 表：
     - 若该 Key 已在 \`inflight\` 中，克隆出一份 \`watch::Receiver\`，**立刻释放分片锁**，然后异步等待 \`rx.changed().await\` 拿到首飞任务广播的结果。
     - 若不在 \`inflight\` 中，创建一对 \`tokio::sync::watch::channel(None)\`，把 \`rx\` 存入 \`inflight\` 表，**立刻释放分片锁**，当前请求成为 Leader 负责触发回源。
3. **取消安全（Cancel Safety）与防死锁**：
   - 如果 Leader 直接在当前 Future 栈上执行 \`loader.await\`，一旦调用方外层套了 \`tokio::time::timeout\` 并在中途把当前 Future drop 掉，\`inflight\` 里的记录如果没清理，后续所有请求都会死等。
   - 解决方案有两层保障：
     1) 将真正的 \`loader\` 执行放入 \`tokio::spawn\` 独立后台任务中运行，这样即便首个调用方中途取消，后台回源仍能完成并惠及其他等待者；
     2) 同时设计一个 RAII 清理守卫 \`InflightGuard\`，无论回源任务正常结束、报错还是意外 panic 被取消，在 \`Drop\` 中都会加分片锁从 \`inflight\` 表移除该 Key，并关闭 \`watch::Sender\`（此时等待方的 \`rx.changed().await\` 会收到通道关闭错误从而安全退出或重试，绝不死锁）。

### 二、核心代码实现
\`\`\`rust
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::future::Future;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::watch;

#[derive(Clone)]
struct CacheEntry<V> {
    value: V,
    expires_at: Instant,
}

type InflightResult<V, E> = Option<Result<V, E>>;

struct Shard<K, V, E> {
    data: HashMap<K, CacheEntry<V>>,
    inflight: HashMap<K, watch::Receiver<InflightResult<V, E>>>,
}

impl<K, V, E> Shard<K, V, E> {
    fn new() -> Self {
        Self {
            data: HashMap::new(),
            inflight: HashMap::new(),
        }
    }
}

/// RAII 守卫：确保回源任务无论成功、失败还是被取消/panic，都会从 inflight 表中移除 Key
struct InflightCleanup<K: Eq + Hash, V, E> {
    shard: Arc<Mutex<Shard<K, V, E>>>,
    key: Option<K>,
}

impl<K: Eq + Hash, V, E> Drop for InflightCleanup<K, V, E> {
    fn drop(&mut self) {
        if let Some(k) = self.key.take() {
            if let Ok(mut guard) = self.shard.lock() {
                guard.inflight.remove(&k);
            }
        }
    }
}

pub struct ShardedCoalescingCache<K, V, E> {
    shards: Vec<Arc<Mutex<Shard<K, V, E>>>>,
}

impl<K, V, E> ShardedCoalescingCache<K, V, E>
where
    K: Eq + Hash + Clone + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
    E: Clone + Send + Sync + 'static,
{
    pub fn new(shard_count: usize) -> Self {
        let count = shard_count.max(1);
        let shards = (0..count)
            .map(|_| Arc::new(Mutex::new(Shard::new())))
            .collect();
        Self { shards }
    }

    fn get_shard(&self, key: &K) -> &Arc<Mutex<Shard<K, V, E>>> {
        let mut hasher = DefaultHasher::new();
        key.hash(&mut hasher);
        let idx = (hasher.finish() as usize) % self.shards.len();
        &self.shards[idx]
    }

    pub async fn get_or_try_init<Fut>(
        &self,
        key: K,
        ttl: Duration,
        loader: Fut,
    ) -> Result<V, E>
    where
        Fut: Future<Output = Result<V, E>> + Send + 'static,
    {
        let shard = Arc::clone(self.get_shard(&key));

        // 第一步：在同步锁作用域内检查缓存与 inflight 状态，绝不跨 .await 持锁
        let mut rx = {
            let mut guard = shard.lock().unwrap();
            let now = Instant::now();

            if let Some(entry) = guard.data.get(&key) {
                if now < entry.expires_at {
                    return Ok(entry.value.clone());
                }
            }

            if let Some(existing_rx) = guard.inflight.get(&key) {
                existing_rx.clone()
            } else {
                let (tx, new_rx) = watch::channel(None);
                guard.inflight.insert(key.clone(), new_rx.clone());
                drop(guard); // 显式提前释放同步锁

                // 启动独立后台任务执行回源，保证某个调用方被取消时不影响其他等待者
                let shard_for_task = Arc::clone(&shard);
                let key_for_task = key.clone();
                tokio::spawn(async move {
                    let _cleanup = InflightCleanup {
                        shard: Arc::clone(&shard_for_task),
                        key: Some(key_for_task.clone()),
                    };

                    let res = loader.await;
                    if let Ok(ref val) = res {
                        let mut g = shard_for_task.lock().unwrap();
                        g.data.insert(
                            key_for_task.clone(),
                            CacheEntry {
                                value: val.clone(),
                                expires_at: Instant::now() + ttl,
                            },
                        );
                    }
                    // 先从 inflight 移除再广播结果，防止新请求读到旧通道
                    if let Ok(mut g) = shard_for_task.lock() {
                        g.inflight.remove(&key_for_task);
                    }
                    let _ = tx.send(Some(res));
                });

                new_rx
            }
        };

        // 第二步：在锁外异步等待回源结果广播
        loop {
            if let Some(res) = rx.borrow_and_update().clone() {
                return res;
            }
            if rx.changed().await.is_err() {
                // 如果后台任务因 panic 导致 tx 被丢弃，通道关闭，避免死等
                if let Some(res) = rx.borrow().clone() {
                    return res;
                }
                panic!("loader task panicked or cancelled unexpectedly");
            }
        }
    }
}
\`\`\``,
  points:[
   '分片与锁边界设计：按 Key 哈希分片降低锁竞争，且严格在进入 .await 之前释放 std::sync::MutexGuard（或合理说明同步锁 vs 异步锁取舍）',
   '缓存与 TTL 逻辑：维护带过期时间 Instant 的缓存条目，命中且未过期时直接返回，过期时触发重新加载',
   '请求合并（Singleflight）状态机：将已缓存数据与 in-flight 回源状态分离，同一時刻同 Key 只发起一次 loader，其余并发请求通过 watch/broadcast/Notify 共享结果',
   '失败恢复与状态清理：回源失败时不写入有效缓存，且必定从 in-flight 表移除该 Key，允许后续请求重试',
   '取消安全（Cancel Safety）设计：使用 tokio::spawn 隔离回源任务或使用 Drop RAII 守卫清理 in-flight 表，防止首个调用方超时取消后其余等待者永久死锁',
   '代码完整性与并发正确性：泛型约束（Eq + Hash + Clone + Send + Sync）、Arc/watch 通道与生命周期使用正确，无数据竞争与死锁隐患',
  ],scores:[4,4,5,4,4,5],
  explain:'这道综合题融合了 Rust 高级并发与异步工程的核心痛点：1) 跨 .await 持同步锁的陷阱；2) 高并发缓存击穿下的 Singleflight 请求合并；3) 异步任务在 select!/timeout 下被 drop 时的取消安全性（Cancel Safety）与 RAII Drop 守卫清理。'},
]};
