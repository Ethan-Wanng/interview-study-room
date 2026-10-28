import {A,type Story} from '../story';

// Go 面试题动画（特性二）：channel 的结构与行为、鸭子类型、面向对象。
export const gxF:Record<string,Story>={
 'q-ea02ab8f721d0883':{title:'channel 的内部结构 hchan',beats:[
  {say:'make(chan int, 3) 在运行时创建一个 hchan 结构体，channel 变量其实是指向它的指针。',add:[A('ch','📮','hchan',320,60,{kind:'item',tone:'primary'})]},
  {say:'buf 指向一个环形缓冲区，qcount 是当前元素个数，dataqsiz 是容量，sendx / recvx 记录下一个写入和读取的位置。',add:[A('buf','🔄','环形缓冲 buf · sendx · recvx',320,170,{kind:'item'})],send:[{from:'ch',to:'buf'}]},
  {say:'sendq 和 recvq 是两条等待队列：发不出去的发送者、收不到的接收者，被包装成 sudog 挂在队列里睡眠。',add:[A('sq','⏳','sendq 发送等待',130,290,{kind:'tag',tone:'warm'}),A('rq','⏳','recvq 接收等待',510,290,{kind:'tag',tone:'warm'})]},
  {say:'还有一把互斥锁 lock 保护这些字段，以及 closed 标记是否已关闭。',bubble:{who:'ch',text:'锁 + 环形队列 + 两条等待队列'}},
  {say:'记住 hchan。',memo:['环形缓冲区 + 读写下标','sendq / recvq 等待队列，一把锁保护']},
 ]},
 'q-78adb94c0b5d08f1':{title:'无缓冲和有缓冲 channel',beats:[
  {say:'无缓冲 channel 像当面交接：发送方必须等到接收方来取，两边“碰头”才完成，同时也是一次同步。',add:[A('s1','🙋','发送方',110,90),A('u','🤝','无缓冲：必须碰头',320,90,{kind:'item',tone:'primary'}),A('r1','🙋','接收方',530,90)],send:[{from:'s1',to:'r1',text:'当面交'}]},
  {say:'有缓冲 channel 像快递柜：柜子没满，发送方放进去就走；柜子空了，接收方才需要等。',add:[A('b','📦','有缓冲：容量 3',320,240,{kind:'item',tone:'ok'})]},
  {say:'无缓冲保证“对方确实收到了”；有缓冲能削峰、解耦生产和消费的速度，但不能保证对方已经处理。',add:[A('diff','⚖️','同步保证 vs 解耦削峰',320,330,{kind:'tag'})]},
  {say:'缓冲不能解决设计问题：消费者太慢，再大的缓冲也会满。容量通常设成明确的数字，比如工作池的并发数。',bubble:{who:'b',text:'满了也得等'}},
  {say:'记住区别。',memo:['无缓冲：收发同步碰头','有缓冲：满才阻塞发送，空才阻塞接收']},
 ]},
 'q-11267891b83bdf99':{title:'对 nil channel 收发会怎样',beats:[
  {say:'var ch chan int 只声明没 make，ch 是 nil。',add:[A('ch','🕳️','nil channel',320,70,{kind:'item',tone:'warm'})]},
  {say:'向 nil channel 发送、从它接收，都会永远阻塞，不会 panic。',add:[A('send','⛔','发送：永远阻塞',150,200,{kind:'tag',tone:'bad'}),A('recv','⛔','接收：永远阻塞',490,200,{kind:'tag',tone:'bad'})]},
  {say:'如果所有 goroutine 都这样卡住，运行时会报 fatal error: all goroutines are asleep - deadlock!；close(nil channel) 则会 panic。',add:[A('dead','💀','全部卡住 → deadlock',320,300,{kind:'tag',tone:'bad'})]},
  {say:'这个特性也有用：在 select 中把某个已读完的 channel 设为 nil，它的 case 就永远不会被选中，相当于“关掉”这个分支。',bubble:{who:'ch',text:'select 里我被禁用了'},tone:{ch:'ok'}},
  {say:'记住 nil channel。',memo:['收发永远阻塞，close 会 panic','select 中设为 nil 可禁用分支']},
 ]},
 'q-4b394dccaecf89e0':{title:'对已关闭的 channel 收发会怎样',beats:[
  {say:'close(ch) 之后，向它发送会直接 panic：send on closed channel。重复 close 也会 panic。',add:[A('ch','🔒','已关闭的 channel',320,70,{kind:'item',tone:'primary'}),A('send','💥','发送 / 再次 close：panic',150,200,{kind:'tag',tone:'bad'})]},
  {say:'接收不会 panic：先把缓冲区里剩下的数据读完，之后再接收立即返回零值。',add:[A('recv','📥','先读完剩余数据',490,200,{kind:'tag',tone:'ok'})]},
  {say:'用 v, ok := <-ch 区分：ok 为 false 表示 channel 已关闭且没有数据了。for range ch 会在关闭后自动结束循环。',add:[A('ok','🔍','v, ok := <-ch',320,300,{kind:'tag',tone:'primary'})]},
  {say:'所以关闭 channel 应该由发送方（或唯一的协调者）来做，接收方不要关。',bubble:{who:'ch',text:'谁发送谁关闭'}},
  {say:'记住规则。',memo:['发送和重复关闭会 panic','接收读完剩余后返回零值，ok 为 false']},
 ]},
 'q-f425929256c4ad93':{title:'接口实现鸭子类型',beats:[
  {say:'“如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子。”Go 的接口就是这样：不需要声明 implements。',add:[A('i','🔌','type Speaker interface { Speak() }',320,60,{kind:'item',tone:'primary'})]},
  {say:'Dog 和 Robot 都有 Speak() 方法，它们自动满足 Speaker 接口，可以放进同一个 []Speaker 里统一调用。',add:[A('dog','🐶','Dog.Speak()',150,190,{kind:'item',tone:'ok'}),A('rob','🤖','Robot.Speak()',490,190,{kind:'item',tone:'ok'})],send:[{from:'dog',to:'i'},{from:'rob',to:'i'}]},
  {say:'好处：接口可以由使用方定义，只声明自己需要的方法，实现方完全不用知道，模块之间解耦，测试时也方便用假实现替换。',add:[A('use','🧪','使用方定义小接口',320,300,{kind:'tag',tone:'primary'})]},
  {say:'可以用 var _ Speaker = (*Dog)(nil) 在编译期确认实现了接口；注意指针接收者的方法只有指针类型才满足接口。',bubble:{who:'dog',text:'我会叫就行'}},
  {say:'记住鸭子类型。',memo:['方法齐全就隐式实现接口','接口小而由使用方定义']},
 ]},
 'q-a9fb4bcaaaf0844c':{title:'Go 怎么做面向对象',beats:[
  {say:'封装：用结构体组织数据，给类型定义方法；名字首字母大写才对包外可见，小写就是私有的。',add:[A('enc','📦','封装：方法 + 大小写可见性',320,60,{kind:'item',tone:'primary'})]},
  {say:'继承：Go 没有继承，用组合。把 Animal 内嵌到 Dog 里，Dog 直接拥有 Animal 的字段和方法。',add:[A('comp','🧩','组合：内嵌代替继承',150,190,{kind:'item',tone:'ok'})]},
  {say:'多态：通过接口实现，不同类型只要实现了同样的方法，就能被同一段代码处理。',add:[A('poly','🔌','多态：接口',490,190,{kind:'item',tone:'ok'})]},
  {say:'注意：内嵌不是继承，被提升的方法里 this（接收者）仍是 Animal，不会“虚调用”到 Dog 重写的方法。构造对象用 NewXxx 函数。',add:[A('pit','⚠️','内嵌 ≠ 继承，没有虚方法',320,310,{kind:'tag',tone:'warm'})]},
  {say:'记住 Go 的面向对象。',memo:['封装靠方法和可见性','组合代替继承，接口实现多态']},
 ]},
};
