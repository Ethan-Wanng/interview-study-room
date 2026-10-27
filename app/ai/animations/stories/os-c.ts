import {A,type Story} from '../story';

// 操作系统面试题动画（三）：RAID、内核、用户态与内存访问。
export const osC:Record<string,Story>={
 'q-775f4016dac8d309':{title:'磁盘阵列 RAID 0、1、5、6、10',beats:[
  {say:'RAID 0 条带化：数据切块轮流写到多块盘上，吞吐翻倍，但没有冗余，坏一块全没。',add:[A('r0','⚡','RAID 0：快，无冗余',150,70,{kind:'item',tone:'bad'})]},
  {say:'RAID 1 镜像：两块盘存一模一样的数据，坏一块没事，但只能用一半容量。',add:[A('r1','🪞','RAID 1：镜像，容量一半',490,70,{kind:'item',tone:'ok'})]},
  {say:'RAID 5 单校验：允许坏一块盘；RAID 6 双校验：允许坏两块。写入和重建都要额外计算。',add:[A('r5','🧮','RAID 5 / 6：校验',150,200,{kind:'item',tone:'warm'})]},
  {say:'RAID 10：先镜像再条带，性能和恢复都好，但容量成本高；能扛几块盘坏，要看坏在哪里。',add:[A('r10','🏗️','RAID 10：镜像 + 条带',490,200,{kind:'item',tone:'ok'})]},
  {say:'RAID 防不了误删、勒索病毒和逻辑错误，不能代替备份；重建期间再坏一块的风险也要考虑。',add:[A('bk','💾','RAID ≠ 备份',320,320,{kind:'tag',tone:'bad'})]},
  {say:'记住各级别。',memo:['0 快无冗余，1 镜像','5/6 校验，10 镜像加条带']},
 ]},
 'q-c68cdee90c65dfe4':{title:'怎么学好 Linux',beats:[
  {say:'准备一个随时能重来的实验环境：虚拟机或容器，弄坏了就重建。',add:[A('lab','🧪','可恢复的实验机',320,70,{kind:'item',tone:'primary'})]},
  {say:'围绕“部署一个服务”来练：建用户、设权限、放目录、看日志、写 systemd 服务、配网络、排查资源。',add:[A('svc','🖥️','部署一个服务',320,180,{kind:'item',tone:'ok'})],send:[{from:'lab',to:'svc'}]},
  {say:'每次先预测结果，再用 /proc、指标和日志去验证，预测错了就是学到了。',add:[A('me','🧑‍💻','你',110,180,{tone:'primary'})],bubble:{who:'me',text:'我猜这里会\n占满内存…'}},
  {say:'常用命令读 man 手册的关键选项，把遇到的错误和复现步骤记下来。',add:[A('note','📒','错误记录 + 复现步骤',530,180,{kind:'tag'})]},
  {say:'再逐步学系统调用和内核机制。别一开始就背庞大的命令清单，也别在生产环境试不熟悉的参数。',memo:['实验环境 + 真实部署场景','先预测，再验证']},
 ]},
 'q-abf6ed0c4ad00169':{title:'Linux 内核的设计理念',beats:[
  {say:'Linux 是宏内核：调度、内存管理、文件系统、网络这些核心部分都运行在内核态，彼此直接调用，效率高。',add:[A('k','🧠','Linux 内核（内核态）',320,190,{kind:'item',tone:'primary'}),A('a','⏱️','调度',140,90,{kind:'tag'}),A('b','💾','内存',260,70,{kind:'tag'}),A('c','📁','文件系统',390,70,{kind:'tag'}),A('d','🌐','网络',510,90,{kind:'tag'})]},
  {say:'同时它是模块化的：驱动等可以做成可加载模块，用的时候再装进内核。但支持模块不代表它变成了微内核。',add:[A('mod','🧩','可加载模块',540,210,{kind:'tag',tone:'ok'})],send:[{from:'mod',to:'k'}]},
  {say:'重视多任务、可移植性和权限隔离；用户程序通过系统调用请内核办事。',add:[A('app','📱','用户程序',140,300,{tone:'warm'})],send:[{from:'app',to:'k',text:'系统调用'}]},
  {say:'“一切皆文件”：文件、管道、socket、设备都能用文件描述符统一读写。这是很好用的抽象，但不是说所有东西真的都是普通文件。',add:[A('fd','📄','文件描述符统一访问',480,310,{kind:'tag',tone:'ok'})]},
  {say:'记住理念。',memo:['模块化的宏内核','文件描述符统一抽象']},
 ]},
 'q-adac1ec35e7f941e':{title:'Linux 程序为什么不能直接在 Windows 上跑',beats:[
  {say:'就算 CPU 都是 x86，一个 Linux 程序拷到 Windows 上也跑不起来。',add:[A('elf','📦','Linux 程序（ELF）',150,120,{kind:'item',tone:'primary'}),A('win','🪟','Windows',490,120,{kind:'item'})],send:[{from:'elf',to:'win',text:'直接运行？',tone:'bad'}]},
  {say:'可执行文件格式不同：Linux 用 ELF，Windows 用 PE，加载器根本读不懂对方的格式。',add:[A('fmt','📐','ELF vs PE',320,240,{kind:'tag',tone:'warm'})]},
  {say:'更重要的是 ABI 和系统调用：Linux 程序直接调用 Linux 系统调用、依赖 glibc；Windows 提供的是 Windows API，动态链接方式也不同。',add:[A('abi','🔌','系统调用 · glibc vs Windows API',320,320,{kind:'tag',tone:'warm'})]},
  {say:'办法：源码只用可移植接口的话，针对 Windows 重新编译；或者用 WSL、虚拟机、兼容层提供 Linux 环境。',tone:{win:'ok'},bubble:{who:'win',text:'WSL 里\n就能跑了'}},
  {say:'记住原因。',memo:['文件格式不同：ELF vs PE','系统调用和运行库不同']},
 ]},
 'q-e589589dbad27964':{title:'用户态和内核态怎么切换',beats:[
  {say:'程序平时在用户态运行，权限受限，不能直接操作硬件。要读文件，就得请内核帮忙。',add:[A('u','👤','用户态：你的程序',150,90,{kind:'item',tone:'primary'}),A('k','🧠','内核态：内核',470,90,{kind:'item',tone:'warm'})]},
  {say:'方式一 系统调用：程序主动调用 read()，CPU 保存现场，切到更高权限，跳到内核入口执行。',send:[{from:'u',to:'k',text:'系统调用 read()'}]},
  {say:'方式二 中断和异常：硬件中断（比如网卡收到包）、缺页、除零等，也会切进内核处理。',add:[A('irq','⚡','中断 · 异常',470,230,{kind:'tag'})],send:[{from:'irq',to:'k'}]},
  {say:'内核处理完，恢复现场，回到用户态继续执行。',send:[{from:'k',to:'u',text:'返回结果',tone:'ok'}]},
  {say:'注意：系统调用不一定导致进程被调度走；用户态/内核态切换和进程上下文切换不是一回事。缺页也可能只是建个映射，不一定读磁盘。',add:[A('nt','💡','态切换 ≠ 进程切换',150,240,{kind:'tag',tone:'ok'})]},
  {say:'记住切换方式。',memo:['系统调用、中断、异常进内核','态切换 ≠ 进程上下文切换']},
 ]},
 'q-d1acf4f9a611ff20':{title:'CPU 是怎么读写内存的',beats:[
  {say:'程序里用的是虚拟地址。CPU 执行“读内存”指令时，先交给 MMU 翻译成物理地址。',add:[A('cpu','🧠','CPU',90,170,{tone:'primary'}),A('mmu','🗺️','MMU（查 TLB / 页表）',270,170,{kind:'item'})],send:[{from:'cpu',to:'mmu',text:'虚拟地址'}]},
  {say:'TLB 是翻译结果的小缓存，命中就很快；没命中再去查页表。',add:[A('tlb','⚡','TLB 命中',270,60,{kind:'tag',tone:'ok'})]},
  {say:'拿到物理地址后，依次查 L1、L2、L3 缓存，都没有才去读内存条。',add:[A('cache','🧺','L1 → L2 → L3',460,170,{kind:'item',tone:'ok'}),A('ram','💾','内存',590,290,{kind:'tag'})],send:[{from:'mmu',to:'cache',text:'物理地址'},{from:'cache',to:'ram',text:'未命中'}]},
  {say:'页面不在内存或权限不对，会触发缺页异常，交给内核处理。',add:[A('pf','⚠️','缺页 / 权限异常',270,300,{kind:'tag',tone:'warm'})]},
  {say:'多核之间有缓存一致性协议，但这不等于没有数据竞争：编译器和 CPU 都可能重排指令，跨线程同步仍需要锁或原子操作。',memo:['虚拟地址 → MMU → 物理地址','缓存一致 ≠ 无数据竞争']},
 ]},
 'q-3815bab197131d92':{title:'4GB 内存的机器能申请 8GB 吗',beats:[
  {say:'在 4GB 内存的机器上，程序申请 8GB。申请成功了——但这不代表真的拿到了 8GB 物理内存。',add:[A('app','📱','程序：申请 8GB',150,90,{tone:'primary'}),A('ram','💾','物理内存 4GB',490,90,{kind:'item'})]},
  {say:'Linux 默认允许“超额承诺”（overcommit）：先给你一段虚拟地址空间，真正写入时才分配物理页。',add:[A('va','🗺️','虚拟地址 8GB（还没用）',320,210,{kind:'tag',tone:'ok'})],send:[{from:'app',to:'va'}]},
  {say:'如果程序真的往 8GB 里写满，物理内存不够，会用 swap，还不够就触发 OOM，进程可能被杀。',tone:{ram:'bad'},add:[A('oom','💀','用光 → swap → OOM',490,300,{kind:'tag',tone:'bad'})]},
  {say:'也可能一开始就失败：严格的提交限制、32 位地址空间、进程资源限制，或者容器的 memory.max。',add:[A('lim','🚧','限制：overcommit 策略 · 容器 memory.max',190,310,{kind:'tag',tone:'warm'})]},
  {say:'Go 等运行时也有自己的分配方式，所以回答要说清：怎么申请、实际写了多少、机器和容器的限制是什么。',memo:['申请成功 ≠ 拿到物理内存','写入时才分配，不够就 OOM']},
 ]},
};
