import {A,type Story} from '../story';

// 微服务面试题动画（二）：容错、限流、超时、指标、Docker。
export const msB:Record<string,Story>={
 'q-0fc17c67c73985e3':{title:'微服务容错：别让一个服务拖垮全家',beats:[
  {say:'订单服务依赖推荐服务。某天推荐服务变得很慢。',add:[A('o','🧾','订单服务',150,170,{kind:'item',tone:'primary'}),A('r','🐢','推荐服务（变慢）',480,170,{kind:'item',tone:'bad'})],send:[{from:'o',to:'r',text:'等…',tone:'bad'}]},
  {say:'没有保护的话，订单服务的线程都卡在等推荐，最后自己也挂了，故障一路传上去，这叫级联雪崩。',tone:{o:'bad'},bubble:{who:'o',text:'线程全卡住了',tone:'bad'}},
  {say:'第一道防线：每次远程调用都设超时和资源上限，等不到就放弃。',add:[A('to','⏱️','超时',150,60,{kind:'tag',tone:'ok'})],tone:{o:'warm'}},
  {say:'第二道：只对幂等操作重试，用指数退避加随机抖动，并且有总的重试预算。持续失败就熔断，暂时不再调用。',add:[A('cb','🔌','重试预算 · 熔断',480,60,{kind:'tag',tone:'ok'})]},
  {say:'第三道：按依赖隔离连接池或并发额度，推荐服务坏了也只占用它那一小份；非核心功能降级，比如先不显示推荐。',add:[A('iso','🧱','隔离 · 降级',150,300,{kind:'tag',tone:'ok'})],tone:{o:'ok'},sub:{o:'推荐区先隐藏'}},
  {say:'关键操作用可靠消息或补偿来恢复；通过故障注入演练，确认真的不会雪崩。',add:[A('chaos','💥','故障注入演练',480,300,{kind:'tag'})]},
  {say:'记住容错手段。',memo:['超时、退避重试、熔断','隔离、降级、故障演练']},
 ]},
 'q-7e9b9c3a30161c07':{title:'限流的几种算法',beats:[
  {say:'接口每秒最多承受 100 个请求。怎么挡住多余的？',add:[A('api','🚪','接口',540,170,{kind:'item',tone:'primary'}),A('req','👥','请求洪流',80,170,{tone:'warm'})]},
  {say:'固定窗口：每秒一个计数器，到 100 就拒绝。简单，但两个窗口交界处可能一瞬间放进 200 个（边界突刺）。',add:[A('fw','🪟','固定窗口',300,60,{kind:'tag',tone:'warm'})]},
  {say:'滑动窗口：按最近 1 秒滚动统计，更平滑，但要记录更多数据。',add:[A('sw','🎞️','滑动窗口',300,120,{kind:'tag'})]},
  {say:'漏桶：请求进桶，以固定速度漏出去；令牌桶：按固定速度往桶里放令牌，拿到令牌才放行，桶里攒下的令牌允许一定突发。',add:[A('tb','🪣','漏桶 / 令牌桶',300,230,{kind:'item',tone:'ok'})],send:[{from:'req',to:'tb'},{from:'tb',to:'api',text:'匀速放行',tone:'ok'}]},
  {say:'并发信号量限制“同时在处理几个”，适合保护昂贵资源，但它不等于每秒速率限制。',add:[A('sem','🎟️','并发信号量',300,320,{kind:'tag'})]},
  {say:'分布式限流可以放在网关，或用 Redis 原子脚本维护配额。还要想清楚按用户、IP、租户还是全局限流，以及限流组件挂了是放行还是拒绝。',memo:['固定 / 滑动窗口、漏桶、令牌桶','并发数 ≠ 每秒速率']},
 ]},
 'q-a05df95decf82b88':{title:'整条调用链的超时：一份共享的时间预算',beats:[
  {say:'用户请求进来，入口给整条链路定一个总期限：1 秒内必须返回。',add:[A('gw','🚪','入口：deadline 1s',100,170,{kind:'item',tone:'primary'})]},
  {say:'订单服务处理用了 200 毫秒，调用库存时只剩 800 毫秒，传给库存的超时不能超过剩余预算。',add:[A('o','🧾','订单服务',300,90,{kind:'item'}),A('b1','⏳','剩余 800ms',300,200,{kind:'tag',tone:'warm'})],send:[{from:'gw',to:'o',text:'ctx'}]},
  {say:'库存再调数据库，剩余预算继续往下传。Go 里用 context.WithTimeout / WithDeadline，HTTP、gRPC 客户端和数据库都接受这个 ctx。',add:[A('s','📦','库存服务',520,90,{kind:'item'}),A('db','🗄️','数据库：剩 500ms',520,240,{kind:'tag',tone:'warm'})],send:[{from:'o',to:'s',text:'ctx'},{from:'s',to:'db',text:'ctx'}]},
  {say:'重试也要花同一份预算，不能每次重试都重新拿到完整的 1 秒。',add:[A('retry','🔁','重试消耗同一预算',300,310,{kind:'tag',tone:'bad'})]},
  {say:'用户等不及走了，取消信号会沿着 ctx 传下去，服务端要主动停下可取消的工作，避免后台还在堆积请求。',tone:{db:'quiet',s:'quiet'},bubble:{who:'gw',text:'用户已离开，\n全部停下'}},
  {say:'记住超时控制。',memo:['入口定总期限，向下传剩余预算','重试共用预算，取消要传播']},
 ]},
 'q-f63a9898d9719658':{title:'Prometheus 的四种指标',beats:[
  {say:'监控一个 Web 服务，Prometheus 有四种指标类型。',add:[A('svc','🌐','Web 服务',320,170,{kind:'item',tone:'primary'})]},
  {say:'Counter 计数器：只增不减（重启归零），比如请求总数。看速率用 rate() 或 increase()。',add:[A('c','➕','Counter：请求总数',130,70,{kind:'tag',tone:'ok'})]},
  {say:'Gauge 仪表盘：可增可减，比如当前内存、正在处理的请求数。',add:[A('g','🎚️','Gauge：当前并发',510,70,{kind:'tag',tone:'ok'})]},
  {say:'Histogram 直方图：把耗时分到一个个桶里计数，可以在服务端跨实例聚合后估算 P99。',add:[A('h','📊','Histogram：分桶计数',130,280,{kind:'tag',tone:'primary'})]},
  {say:'Summary 摘要：在客户端直接算好分位数，但各实例的分位数一般不能直接合并，不能把各台的 P99 取平均。',add:[A('s','📈','Summary：客户端分位数',510,280,{kind:'tag',tone:'warm'})]},
  {say:'标签别用 user_id、原始 URL 这类高基数的值，否则时间序列会爆炸。',bubble:{who:'svc',text:'label 别放 user_id',tone:'warm'}},
  {say:'记住四种指标。',memo:['Counter 只增，Gauge 可增减','Histogram 可聚合，Summary 不宜']},
 ]},
 'q-3679d212a21d6fd0':{title:'Docker 底层：隔离、限额和分层',beats:[
  {say:'一台 Linux 主机上跑着三个容器。它们共享同一个宿主机内核，不是三台虚拟机。',add:[A('k','🐧','宿主机内核',320,320,{kind:'item',tone:'primary'}),A('c1','📦','容器 A',150,90,{kind:'item'}),A('c2','📦','容器 B',320,90,{kind:'item'}),A('c3','📦','容器 C',490,90,{kind:'item'})]},
  {say:'namespaces 负责“看不见”：每个容器有自己的进程号、网络、挂载点视图，以为自己独占一台机器。',add:[A('ns','👓','namespaces：隔离视图',130,210,{kind:'tag',tone:'ok'})]},
  {say:'cgroups 负责“用不超”：限制每个容器的 CPU、内存等资源。再加上 capabilities、seccomp 限制权限。',add:[A('cg','📏','cgroups：资源限额',490,210,{kind:'tag',tone:'ok'})]},
  {say:'镜像是一层层只读的文件系统叠起来的，用 OverlayFS 等技术合成，最上面再加一层容器可写层。',sub:{c2:'只读镜像层 + 可写层'},focus:['c2']},
  {say:'Docker 负责镜像、容器和网络的管理，真正运行容器交给 containerd 和 runc。',add:[A('rt','⚙️','containerd · runc',320,255,{kind:'tag'})]},
  {say:'记住底层三件套。',memo:['namespaces 隔离，cgroups 限额','分层文件系统，共享宿主内核']},
 ]},
 'q-cb838566450dfa2f':{title:'Docker 和 LXC 有什么不同',beats:[
  {say:'它们都用 Linux 内核的隔离能力（namespaces、cgroups），底层原理并不是两套东西。',add:[A('k','🐧','Linux 内核隔离能力',320,300,{kind:'item',tone:'primary'})]},
  {say:'LXC 更像一台轻量的“完整 Linux 系统”：里面可以跑 init、多个服务，像一台小虚拟机那样用（系统容器）。',add:[A('lxc','🏠','LXC：系统容器',170,100,{kind:'item'})],send:[{from:'k',to:'lxc'}]},
  {say:'Docker 更强调应用容器：一个容器跑一个应用，配套镜像构建、分发、版本化交付和生命周期管理。',add:[A('dk','🐳','Docker：应用容器 + 镜像',470,100,{kind:'item',tone:'ok'})],send:[{from:'k',to:'dk'}]},
  {say:'早期 Docker 确实用过 LXC，但现代 Docker 基于 containerd 和 OCI 运行时，早就不依赖 LXC 了。',bubble:{who:'dk',text:'我现在用 runc'}},
  {say:'记住区别。',memo:['LXC：像一台小系统','Docker：应用 + 镜像交付']},
 ]},
 'q-338e4cf75022dc37':{title:'镜像和层：一叠透明胶片',beats:[
  {say:'镜像像一叠透明胶片：每张胶片是一层，记录相对下面一层的文件变化。',add:[A('l1','🎞️','层 1：基础系统',320,290,{kind:'tag'}),A('l2','🎞️','层 2：安装依赖',320,230,{kind:'tag'}),A('l3','🎞️','层 3：复制代码',320,170,{kind:'tag'})]},
  {say:'镜像（Image）是这叠胶片加上配置；层（Layer）是其中一张。多个镜像可以共享同一张底层胶片，省空间也省下载。',add:[A('img','🖼️','镜像 = 配置 + 有序的层',320,60,{kind:'item',tone:'primary'}),A('img2','🖼️','另一个镜像',560,230,{kind:'tag',tone:'ok'})],send:[{from:'img2',to:'l1',text:'共享',tone:'ok'}]},
  {say:'启动容器时，在只读的镜像层上面加一层可写层。修改底层文件会先把它复制上来再改（copy-up），删除则用一个“白化”标记盖住。',add:[A('rw','✏️','容器可写层',100,110,{kind:'tag',tone:'warm'})],send:[{from:'rw',to:'l3',text:'copy-up'}]},
  {say:'不是每条 Dockerfile 指令都会产生新的文件层，比如 ENV、CMD 只改配置。',bubble:{who:'img',text:'ENV 只改配置'}},
  {say:'容器删掉，可写层也没了。数据库数据要放到卷（Volume）里。',memo:['镜像 = 配置 + 一叠只读层','数据放卷，不靠可写层']},
 ]},
};
