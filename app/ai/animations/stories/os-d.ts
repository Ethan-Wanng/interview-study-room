import {A,type Story} from '../story';

// 操作系统面试题动画（四）：内存管理、进程通信与调度。
export const osD:Record<string,Story>={
 'q-c2e4202d9e1de1d3':{title:'内存分段和分页',beats:[
  {say:'分段：按逻辑把程序分成代码段、数据段、栈段，每段大小不一样，可以分别设置保护权限。',add:[A('code','📘','代码段',140,80,{kind:'tag',tone:'primary'}),A('data','📗','数据段',140,160,{kind:'tag',tone:'primary'}),A('stack','📙','栈段',140,240,{kind:'tag',tone:'primary'})]},
  {say:'问题：段大小不一，回收后物理内存里留下大大小小的空洞，大段放不进去——外部碎片。',add:[A('frag','🧩','物理内存：零碎空洞',470,120,{kind:'item',tone:'bad'})]},
  {say:'分页：把虚拟地址切成固定大小的页（常见 4KB），可以分散放到任意物理页框里，便于实现虚拟内存。',add:[A('page','🧱','固定大小的页',470,260,{kind:'item',tone:'ok'})],tone:{frag:'quiet'}},
  {say:'现代 x86-64 基本使用“平坦分段”，保护和地址转换主要靠分页；FS/GS 段寄存器还保留特殊用途（比如线程局部存储）。',bubble:{who:'page',text:'现在主要\n靠我'}},
  {say:'程序里说的“代码段、数据段”是逻辑布局，不代表硬件还在用传统分段。',memo:['分段：按逻辑，有外部碎片','分页：固定大小，现代主要靠它']},
 ]},
 'q-120d31b841b7fb71':{title:'页面置换算法：内存满了换掉谁',beats:[
  {say:'物理内存只有 3 个页框，现在要装入第 4 个页面，必须换出一个。',add:[A('mem','🗄️','页框：A B C（满）',320,80,{kind:'item',tone:'warm'}),A('new','📄','新页 D',560,80,{kind:'tag'})]},
  {say:'FIFO：换出最早进来的。简单，但可能出现“给更多页框，缺页反而更多”的 Belady 异常。',add:[A('fifo','🚶','FIFO：最早进来的',130,200,{kind:'tag',tone:'warm'})]},
  {say:'OPT 最优：换出未来最久不会用的。效果最好，但没法预知未来，只用作理论对照。',add:[A('opt','🔮','OPT：未来最久不用',320,200,{kind:'tag'})]},
  {say:'LRU：换出最久没用过的。精确实现成本高，所以常用 Clock 近似：页面有个访问位，指针转一圈，访问过的给“第二次机会”。',add:[A('lru','🕰️','LRU / Clock',510,200,{kind:'tag',tone:'ok'})]},
  {say:'还有 LFU 按访问次数。Linux 实际实现随版本变化，比如多代 LRU，还要区分匿名页、文件页、脏页和工作集。',add:[A('lfu','📊','LFU · 多代 LRU',320,310,{kind:'tag'})]},
  {say:'记住几种算法。',memo:['FIFO、OPT、LRU、Clock、LFU','OPT 是理论最优，Clock 近似 LRU']},
 ]},
 'q-57c6a0543894c09a':{title:'为什么不全用 mmap 分配内存',beats:[
  {say:'mmap 可以直接向内核要一大块内存，或者把文件映射进内存，很适合大块分配。',add:[A('mmap','🗺️','mmap：大块 / 文件映射',320,70,{kind:'item',tone:'primary'})]},
  {say:'但每次 mmap / munmap 都是系统调用，还要管理虚拟内存区域、页表和 TLB，开销不小。',add:[A('cost','💸','系统调用 · 页表 · TLB',320,170,{kind:'tag',tone:'warm'})]},
  {say:'它以页（4KB）为单位。申请 16 字节的小对象也占一整页，浪费空间。',add:[A('small','🐜','16 字节也占一页',130,280,{kind:'tag',tone:'bad'})]},
  {say:'所以内存分配器批量向系统要大块内存，自己切成不同大小的格子，用空闲链表管理小对象。Go 运行时、tcmalloc、jemalloc 都是这个思路。',add:[A('alloc','🧰','分配器：批量申请 + 分级管理',490,280,{kind:'item',tone:'ok'})]},
  {say:'另外 mmap 访问时也会缺页，文件映射还要处理同步和截断。现代分配器会把 mmap、堆和自己的缓存结合起来用。',memo:['mmap 适合大块，有系统调用开销','小对象交给分配器批量管理']},
 ]},
 'q-d9be8db39304efb7':{title:'进程间通信有哪些方式',beats:[
  {say:'两个进程内存是隔离的，想互相传数据，需要操作系统提供的通道。',add:[A('p1','⚙️','进程 A',100,170,{tone:'primary'}),A('p2','⚙️','进程 B',540,170,{tone:'primary'})]},
  {say:'管道：单向字节流，像水管，父子进程常用；命名管道有文件名，无关进程也能用。',add:[A('pipe','🚰','管道 / 命名管道',320,60,{kind:'tag'})],send:[{from:'p1',to:'p2',text:'字节流'}]},
  {say:'消息队列：保留每条消息的边界。信号：只适合发通知，不适合传大数据。',add:[A('mq','📨','消息队列 · 信号',320,130,{kind:'tag'})]},
  {say:'共享内存：两个进程映射同一块内存，最快、复制最少，但要自己加锁或用信号量同步。',add:[A('shm','🧠','共享内存（要同步）',320,230,{kind:'item',tone:'ok'})],send:[{from:'p1',to:'shm'},{from:'p2',to:'shm'}]},
  {say:'socket：Unix domain socket 用于同一台机器，网络 socket 可以跨机器，双向灵活。',add:[A('sock','🔌','Unix socket · 网络 socket',320,320,{kind:'tag'})]},
  {say:'选择时看：是否同机、数据量、可靠性、是否需要消息边界、权限和生命周期。',memo:['管道、消息队列、信号','共享内存最快需同步，socket 最灵活']},
 ]},
 'q-bcb204b094576be8':{title:'进程调度算法',beats:[
  {say:'CPU 只有一个，好几个进程排队等着运行，谁先上？',add:[A('cpu','🧠','CPU',320,70,{kind:'item',tone:'primary'}),A('q','👥','就绪队列',320,200,{tone:'warm'})]},
  {say:'先来先服务：按到达顺序，一个长任务会让后面的短任务等很久。短作业优先：平均等待短，但长作业可能一直轮不到。',add:[A('a','🚶','先来先服务 · 短作业优先',130,300,{kind:'tag'})]},
  {say:'时间片轮转：每人轮流用一小段时间，响应快、公平。优先级调度和多级反馈队列在响应、公平、吞吐之间做折中。',add:[A('rr','🔄','时间片轮转 · 多级反馈队列',510,300,{kind:'tag',tone:'ok'})],send:[{from:'q',to:'cpu',text:'轮流'}]},
  {say:'Linux 普通任务过去用 CFS（完全公平调度），较新的内核逐步改用 EEVDF。',add:[A('linux','🐧','CFS → EEVDF',130,90,{kind:'tag',tone:'primary'})]},
  {say:'实时任务另有 SCHED_FIFO、SCHED_RR、SCHED_DEADLINE 等调度类。实时调度也不代表程序不会阻塞。',add:[A('rt','⏱️','实时：FIFO · RR · DEADLINE',510,90,{kind:'tag',tone:'warm'})]},
  {say:'记住区分教材算法和实际内核。',memo:['FCFS、SJF、轮转、多级反馈','Linux：CFS → EEVDF，另有实时类']},
 ]},
 'q-c27a84be9ecfdf3e':{title:'DMA：让设备自己搬数据',beats:[
  {say:'没有 DMA 时，从网卡读数据，CPU 得一个字节一个字节地搬，忙得没空干别的。',add:[A('cpu','🧠','CPU',320,80,{tone:'bad'}),A('dev','📡','网卡 / 磁盘',100,220,{kind:'item'}),A('mem','💾','内存',540,220,{kind:'item'})],send:[{from:'dev',to:'cpu',text:'逐字节',tone:'bad'},{from:'cpu',to:'mem',tone:'bad'}]},
  {say:'有了 DMA：CPU 只需先配置好“描述符”——缓冲区地址、长度、方向，然后去忙别的。',tone:{cpu:'primary'},add:[A('desc','📋','描述符：地址 · 长度 · 方向',320,190,{kind:'tag',tone:'ok'})]},
  {say:'DMA 控制器让设备直接和内存交换数据，不经过 CPU。',send:[{from:'dev',to:'mem',text:'DMA 直接传',tone:'ok'}]},
  {say:'传完通过中断（或轮询）通知 CPU：“好了”。',bubble:{who:'cpu',text:'传完了，\n我来处理'},tone:{cpu:'ok'}},
  {say:'IOMMU 负责地址翻译和隔离；驱动还要处理缓存一致性和内存屏障。提交请求、处理完成、管理缓冲仍需要 CPU，不是零开销。',add:[A('io','🛡️','IOMMU：地址翻译与隔离',320,320,{kind:'tag'})]},
  {say:'记住 DMA。',memo:['CPU 配好描述符就去忙别的','设备直传内存，完成发中断']},
 ]},
 'q-79ca7d2d3eb09607':{title:'磁盘调度算法',beats:[
  {say:'机械硬盘的磁头要来回移动才能读不同位置（寻道），很慢。调度算法就是调整请求顺序，少走冤枉路。',add:[A('head','🎯','磁头',320,80,{tone:'primary'})]},
  {say:'FCFS 先来先服务：公平但来回乱跑。SSTF 最短寻道优先：总挑最近的，可能让远处的请求一直等（饥饿）。',add:[A('fcfs','🚶','FCFS · SSTF',130,200,{kind:'tag',tone:'warm'})]},
  {say:'SCAN 电梯算法：磁头像电梯一样一路扫到头再折返；C-SCAN 只单向扫，更均匀；LOOK / C-LOOK 不用扫到尽头。',add:[A('scan','🛗','SCAN · C-SCAN · LOOK',490,200,{kind:'tag',tone:'ok'})]},
  {say:'SSD 没有机械寻道，这些算法的意义不大。现代 Linux 多队列块层提供 mq-deadline、BFQ、none 等策略。',add:[A('ssd','💾','SSD / NVMe：mq-deadline · none',320,300,{kind:'item',tone:'primary'})]},
  {say:'别把老内核的 elevator 配置原样套到 NVMe 上，先看设备支持哪些调度器，再压测延迟和吞吐。',memo:['机械盘：减少寻道、防饥饿','SSD：多队列调度，以压测为准']},
 ]},
};
