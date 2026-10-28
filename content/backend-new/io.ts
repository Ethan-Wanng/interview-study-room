import type {AiLevel} from '../journey';

// 高阶：I/O 模型、零拷贝和写盘。
export const beIo:AiLevel={id:'be-io',title:'I/O 模型、epoll 与零拷贝',summary:'阻塞与非阻塞、同步与异步、多路复用、写盘和 DMA',lessons:[
 {title:'阻塞 / 非阻塞，同步 / 异步',body:'这是两个维度。阻塞 I/O：数据没好就一直等；非阻塞 I/O：没好立刻返回 EAGAIN，你过会儿再来。同步 I/O：最后还是应用自己调用 read 把数据拷回来；异步 I/O：提交请求后内核完成读取和拷贝，再通知“已完成”（如 io_uring）。select、poll、epoll 都只是“就绪通知”，属于同步 I/O。'},
 {title:'select、poll、epoll',body:'select 用位图传一组文件描述符，有数量上限（常见 1024），每次都要整组传给内核、返回后逐个检查；poll 去掉了上限，但仍要整组扫描。epoll 把关注的连接注册在内核里（epoll_ctl），epoll_wait 只返回就绪的那些，适合连接多、活跃少的场景。边缘触发 ET 必须用非阻塞读到 EAGAIN。',code:'epfd := epoll_create1(0)\nepoll_ctl(epfd, EPOLL_CTL_ADD, connFd, EPOLLIN)\nfor {\n    n := epoll_wait(epfd, events, -1) // 只返回就绪的连接\n    for i := 0; i < n; i++ { handle(events[i]) }\n}'},
 {title:'写文件和持久化',body:'write 成功通常只代表数据进了内核页缓存（脏页），由后台慢慢写回磁盘。进程崩溃不会丢已经交给内核的数据；但断电会丢还没落盘的部分。要保证持久化就调用 fsync / fdatasync 并检查返回值。应用自己的缓冲（比如 bufio 没 Flush）在进程崩溃时会丢。'},
 {title:'零拷贝和 DMA',body:'传统发文件：磁盘 → 页缓存 → 用户缓冲 → socket 缓冲 → 网卡，来回拷贝好几次。sendfile 让内核直接把页缓存的数据送到 socket，跳过用户态。DMA 让设备直接和内存交换数据，CPU 只负责配置和处理完成中断。“零拷贝”指减少 CPU 在用户态和内核态之间的拷贝，不是一次拷贝都没有。'},
],quiz:[
 {id:'be-io-1',q:'非阻塞 socket 上调用 read，数据还没到，会发生什么？',options:['一直等到数据到来','立刻返回 EAGAIN（或 EWOULDBLOCK）','程序崩溃','返回 0 表示连接关闭'],answer:1,explain:'非阻塞调用不会等待；返回 0 才表示对端关闭。',interview:'q-91a8f84073b3f1fe'},
 {id:'be-io-2',type:'judge',q:'用了 epoll，就是“异步 I/O”。',answer:false,explain:'epoll 只是就绪通知，数据仍由应用调用 read 拷贝，属于同步 I/O。',interview:'q-c6f65211e594ea8c'},
 {id:'be-io-3',q:'服务器有 1 万个连接，每次只有几十个活跃，哪种方式效率最高？',options:['select','poll','epoll','每个连接一个阻塞线程'],answer:2,explain:'epoll_wait 只返回就绪连接，不需要每次扫描全部。',interview:'q-2c9515ac92903960'},
 {id:'be-io-4',type:'fill',q:'select 能监听的文件描述符数量受 ____ 限制，常见是 1024。',accepted:['FD_SETSIZE','fd_setsize'],explain:'poll 和 epoll 没有这个小上限。',interview:'q-2c9515ac92903960'},
 {id:'be-io-5',q:'epoll 使用边缘触发（ET）时，下面哪种做法是必须的？',options:['每次只读一个字节','把 socket 设为非阻塞，并一直读到 EAGAIN','使用 select 辅助','关闭 TCP_NODELAY'],answer:1,explain:'ET 只在状态变化时通知一次，读不完会漏数据。'},
 {id:'be-io-6',q:'进程调用 write 写日志成功后立刻崩溃（机器没断电），这些数据会怎样？',options:['一定丢失','已经进入内核页缓存，系统之后仍会写回磁盘','写进了 CPU 缓存','变成乱码'],answer:1,explain:'进程崩溃不影响内核里的脏页；断电才会丢未落盘的部分。',interview:'q-4d79d9e36de19dab'},
 {id:'be-io-7',type:'multi',q:'想确保数据真的落到磁盘，下面哪些做法是对的？（多选）',options:['调用 fsync 或 fdatasync 并检查返回值','新建或改名文件后，必要时同步父目录','只要 write 返回成功就够了','用户态缓冲先 Flush 再 fsync'],answers:[0,1,3],explain:'write 成功只代表进了页缓存。',interview:'q-4d79d9e36de19dab'},
 {id:'be-io-8',q:'Nginx、Kafka 发送文件时用 sendfile，主要省掉了什么？',options:['DNS 解析','数据在用户缓冲区和内核之间的拷贝','TCP 握手','磁盘读取'],answer:1,explain:'内核直接把页缓存的数据交给 socket。',interview:'q-1ff0f10ea03551b5'},
 {id:'be-io-9',type:'judge',q:'有了 DMA，CPU 在 I/O 过程中完全不需要参与。',answer:false,explain:'CPU 仍要配置描述符、处理完成中断、管理缓冲，只是不用逐字节搬数据。',interview:'q-c27a84be9ecfdf3e'},
 {id:'be-io-10',type:'short',q:'机械硬盘和 SSD 上，磁盘调度算法的重要性有什么不同？',reference:'机械硬盘要移动磁头寻道，调度算法（SCAN 电梯算法、C-SCAN、LOOK 等）通过调整请求顺序减少寻道距离，同时防止饥饿，影响很大。SSD 没有机械寻道，随机访问也很快，传统寻道优化意义不大；现代 Linux 多队列块层对 NVMe 常用 none 或 mq-deadline，更关注公平和延迟，要以压测结果为准。',points:['机械盘：减少寻道是关键','SCAN / C-SCAN / LOOK 防饥饿','SSD 无寻道，调度意义变小','NVMe 常用 none / mq-deadline，以压测为准'],explain:'同一个问题要结合硬件回答。',interview:'q-79ca7d2d3eb09607'},
]};
