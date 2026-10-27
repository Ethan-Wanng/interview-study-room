import {A,type Story} from '../story';

// 操作系统面试题动画（五）：I/O 模型、持久化、零拷贝、IP。
export const osE:Record<string,Story>={
 'q-91a8f84073b3f1fe':{title:'阻塞 I/O 和非阻塞 I/O',beats:[
  {say:'去餐厅取外卖。阻塞 I/O：你站在柜台前一直等，餐没好就不走，其他事都干不了。',add:[A('me','🧑','线程',110,170,{tone:'primary'}),A('desk','🍱','内核（数据还没好）',450,170,{kind:'item',tone:'warm'})],send:[{from:'me',to:'desk',text:'read()：等着',tone:'warm'}],sub:{me:'卡住等待'}},
  {say:'非阻塞 I/O：问一句“好了吗？”，没好立刻返回 EAGAIN，你可以先去干别的，过会儿再来问。',sub:{me:'先去干别的'},bubble:{who:'desk',text:'EAGAIN：\n还没好'}},
  {say:'非阻塞不代表业务就是异步的，也不保证一次 read / write 就处理完全部数据：要处理“只读了一部分”和 EINTR（被信号打断）。',add:[A('part','✂️','部分读写 · EINTR',320,300,{kind:'tag',tone:'warm'})]},
  {say:'事件循环通常把非阻塞 socket 和 epoll 配合使用：只在数据就绪时才去读，一个慢连接不会卡住整个循环。',add:[A('ep','📣','epoll：好了叫你',450,60,{kind:'tag',tone:'ok'})],tone:{me:'ok'}},
  {say:'记住区别。',memo:['阻塞：没好就一直等','非阻塞：没好立刻返回 EAGAIN']},
 ]},
 'q-c6f65211e594ea8c':{title:'同步 I/O 和异步 I/O',beats:[
  {say:'两个维度别混：阻塞 / 非阻塞说的是“等的时候干不干别的”；同步 / 异步说的是“最后谁把数据搬回来”。',add:[A('me','🧑','应用',110,170,{tone:'primary'}),A('k','🧠','内核',470,170,{kind:'item'})]},
  {say:'同步 I/O：就算先等通知说“数据好了”，最后还是你自己调用 read 把数据拷回来。select、poll、epoll 都只是就绪通知。',send:[{from:'k',to:'me',text:'好了（通知）'},{from:'me',to:'k',text:'我自己 read',tone:'warm'}],add:[A('sync','🔔','epoll：就绪通知',290,60,{kind:'tag',tone:'warm'})]},
  {say:'异步 I/O：你只提交请求“帮我读到这个缓冲区”，内核读完、拷好，再通知你“已经完成”。',add:[A('async','📬','完成通知：数据已在缓冲区',290,300,{kind:'tag',tone:'ok'})],send:[{from:'k',to:'me',text:'已完成',tone:'ok'}]},
  {say:'Linux 上的 io_uring 提供“完成通知”式的接口，具体行为还要看操作类型。',bubble:{who:'k',text:'io_uring：\n我帮你做完'}},
  {say:'记住两个维度。',memo:['阻塞/非阻塞：怎么等','同步/异步：谁完成搬运']},
 ]},
 'q-2c9515ac92903960':{title:'select、poll、epoll',beats:[
  {say:'服务器同时盯着 1 万个连接，只有少数有数据。怎么知道是哪些？',add:[A('srv','🖥️','服务器',100,170,{tone:'primary'}),A('conns','🔌','1 万个连接',520,170,{kind:'item'})]},
  {say:'select：每次把所有连接放进一个位图交给内核，最多 FD_SETSIZE（常见 1024）个；返回后还要自己逐个检查谁就绪。',add:[A('sel','🧮','select：位图 · 有上限 · 逐个查',320,60,{kind:'tag',tone:'bad'})]},
  {say:'poll：改用数组，没有那个小上限，但每次还是要传整个集合、扫描整个集合。',add:[A('poll','📋','poll：数组 · 仍要扫描',320,140,{kind:'tag',tone:'warm'})]},
  {say:'epoll：关注的连接集合保存在内核里（epoll_ctl 注册一次），epoll_wait 只返回就绪的那几个。适合连接多、活跃少的场景。',add:[A('ep','📣','epoll：只返回就绪的',320,270,{kind:'item',tone:'ok'})],send:[{from:'conns',to:'ep',text:'3 个就绪',tone:'ok'},{from:'ep',to:'srv'}]},
  {say:'水平触发 LT：只要还就绪就一直通知。边缘触发 ET：只在状态变化时通知一次，必须配合非阻塞读写到 EAGAIN，否则会漏处理。',add:[A('et','⚡','LT · ET（读到 EAGAIN）',520,320,{kind:'tag'})]},
  {say:'记住三者。',memo:['select 有上限，poll 要扫描','epoll 只返回就绪；ET 要读到空']},
 ]},
 'q-4d79d9e36de19dab':{title:'写文件时进程崩溃，数据会丢吗',beats:[
  {say:'程序调用 write 成功了。数据在哪？通常只是进了内核的页缓存，还没到磁盘。',add:[A('app','📱','进程缓冲',100,170,{kind:'item',tone:'primary'}),A('pc','🧠','内核页缓存（脏页）',320,170,{kind:'item',tone:'warm'}),A('disk','💽','磁盘',540,170,{kind:'item'})],send:[{from:'app',to:'pc',text:'write 成功'}]},
  {say:'如果只是进程崩溃：已经交给内核的脏页，系统之后照样会写回磁盘，不会丢。',tone:{app:'bad'},sub:{app:'进程崩溃'},send:[{from:'pc',to:'disk',text:'后台回写',tone:'ok'}]},
  {say:'但进程自己缓冲区里还没 write 出去的内容（比如 bufio 没 Flush）就丢了。',add:[A('lost1','💥','用户态缓冲：丢失',100,300,{kind:'tag',tone:'bad'})]},
  {say:'如果是系统崩溃或断电：页缓存里还没落盘的内容也会丢。',add:[A('lost2','⚡','断电：页缓存丢失',320,300,{kind:'tag',tone:'bad'})]},
  {say:'要保证持久化：调用 fsync / fdatasync 并检查返回值；新建或改名的文件，还可能要同步父目录。',add:[A('fs','✅','fsync + 同步父目录',540,300,{kind:'tag',tone:'ok'})],tone:{disk:'ok'}},
  {say:'记住分情况回答。',memo:['write 成功 = 进了页缓存','要持久化就 fsync']},
 ]},
 'q-1ff0f10ea03551b5':{title:'零拷贝是怎么实现的',beats:[
  {say:'把一个文件发到网络上。传统方式 read + write：磁盘 → 内核页缓存 → 用户缓冲区 → socket 缓冲区 → 网卡，中间来回拷了好几次。',add:[A('disk','💽','磁盘',80,80,{kind:'tag'}),A('pc','🧠','页缓存',230,80,{kind:'tag'}),A('user','📱','用户缓冲',380,80,{kind:'tag',tone:'warm'}),A('sock','📦','socket 缓冲',540,80,{kind:'tag'})],send:[{from:'disk',to:'pc'},{from:'pc',to:'user',tone:'warm'},{from:'user',to:'sock',tone:'warm'}]},
  {say:'数据在用户态和内核态之间拷来拷去，还要多次切换，但应用其实根本没改数据。',bubble:{who:'user',text:'我只是\n转一手而已',tone:'warm'}},
  {say:'sendfile：直接让内核把页缓存里的数据送到 socket，跳过用户缓冲区。',drop:['user'],add:[A('sf','🚀','sendfile：页缓存 → socket',380,220,{kind:'item',tone:'ok'})],send:[{from:'pc',to:'sock',text:'sendfile',tone:'ok'}]},
  {say:'splice 可以在支持的描述符和管道之间移动数据；mmap 把文件页映射到用户空间，但之后再普通 write 仍可能发生拷贝。',add:[A('sp','🔀','splice · mmap',230,300,{kind:'tag'})]},
  {say:'“零拷贝”指减少用户态和内核态之间的拷贝，不是物理上一次拷贝都没有：DMA 等成本还在，开启 TLS、需要处理数据时也可能走不了这条快路。',memo:['减少用户态 ↔ 内核态拷贝','sendfile 直接送 socket']},
 ]},
 'q-4c5f1e650374e6f3':{title:'读写大文件的过程',beats:[
  {say:'程序读一个大文件：先查页缓存，命中就直接拷给你。',add:[A('app','📱','应用',90,170,{tone:'primary'}),A('pc','🧠','页缓存',300,170,{kind:'item',tone:'ok'})],send:[{from:'pc',to:'app',text:'命中'}]},
  {say:'没命中：经过文件系统、块层、设备驱动，从磁盘读进内存。顺序读还会触发预读，提前把后面的数据读上来。',add:[A('fs','📁','文件系统 → 块层 → 设备',520,90,{kind:'tag'}),A('disk','💽','磁盘',520,250,{kind:'item'})],send:[{from:'disk',to:'pc',text:'读入 + 预读'}]},
  {say:'写入通常先改页缓存、标记脏页，由后台慢慢回写；需要确保落盘就调 fsync。直接 I/O 和 mmap 走的是别的路径。',send:[{from:'app',to:'pc',text:'写 → 脏页'},{from:'pc',to:'disk',text:'后台回写'}]},
  {say:'应用要分块流式处理、控制缓冲大小，千万别一次把整个大文件读进内存。',add:[A('chunk','🧩','分块流式处理',300,310,{kind:'tag',tone:'ok'})],bubble:{who:'app',text:'一块一块来'}},
  {say:'调优看：每次 I/O 的大小、是不是顺序访问、缓存命中率、并发数和持久化要求。',memo:['读：页缓存 → 未命中读盘 + 预读','写：脏页回写，要落盘 fsync']},
 ]},
 'q-08fb60683f76a0f5':{title:'IP 地址到底是什么',beats:[
  {say:'IP 地址标识一个网络接口在网络里的逻辑位置。IPv4 是 32 位，IPv6 是 128 位。',add:[A('ip','🏠','192.168.1.23',320,70,{kind:'item',tone:'primary'})]},
  {say:'CIDR 前缀划分网络部分：192.168.1.0/24 表示前 24 位是网络号。路由器按“最长前缀匹配”决定下一跳往哪发。',add:[A('cidr','📐','/24：前 24 位是网络号',140,190,{kind:'tag',tone:'ok'}),A('rt','🧭','路由：最长前缀匹配',500,190,{kind:'tag',tone:'ok'})]},
  {say:'私网地址通常通过 NAT 换成公网地址出去。NAT 不是加密，也不是完整的防火墙。',add:[A('nat','🔁','NAT：私网 ↔ 公网',140,300,{kind:'tag',tone:'warm'})]},
  {say:'别混淆：端口区分同一台机器上的不同程序；域名靠 DNS 解析成 IP；MAC 地址只用于本地链路转发。',add:[A('other','🧩','端口 · DNS · MAC',500,300,{kind:'tag'})]},
  {say:'IPv6 用邻居发现（ND）找局域网邻居，和 IPv4 的 ARP 不一样。',memo:['IP 标识接口位置，CIDR 划网络','NAT ≠ 加密，端口区分程序']},
 ]},
};
