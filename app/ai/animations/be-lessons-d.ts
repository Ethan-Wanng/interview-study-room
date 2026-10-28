import {A,type LessonStory} from './story';

// 后端通用动画课堂（四）：高阶和专家新增关卡。
export const beLessonsD:LessonStory[]=[
 ({id:'be-an-http',level:'be-http',kind:'advanced',icon:'🔐',title:'从 HTTP/1.1 到 HTTP/3',summary:'排队、多路复用、QUIC 和 HTTPS。',beats:[
  {say:'HTTP/1.1：一条连接上的请求要排队，前一个慢，后面的都得等，这叫队头阻塞。浏览器只好同时开好几条连接。',add:[A('b','🌐','浏览器',90,170,{tone:'primary'}),A('s','🖥️','服务器',550,170,{kind:'item'}),A('h1','🚶','1.1：排队',320,70,{kind:'tag',tone:'bad'})],send:[{from:'b',to:'s',text:'请求 1'}]},
  {say:'HTTP/2：一条 TCP 连接上同时跑很多个流，请求和响应切成帧交错传输，还压缩头部。',drop:['h1'],add:[A('h2','🔀','2：多路复用',320,70,{kind:'tag',tone:'ok'})],send:[{from:'b',to:'s',text:'流 1'},{from:'s',to:'b',text:'流 3'}]},
  {say:'但 HTTP/2 底下还是 TCP：丢一个包，所有流都要等重传。',tone:{h2:'warm'},bubble:{who:'s',text:'丢了一个包，⏎大家都停下'}},
  {say:'HTTP/3 换成 QUIC，跑在 UDP 上，每个流独立重传，丢包只影响自己；还内置 TLS 1.3，握手更快。',add:[A('h3','⚡','3：QUIC · 流独立',320,280,{kind:'tag',tone:'ok'})]},
  {say:'HTTPS 的 TLS 握手里，浏览器会校验证书：域名对不对、有没有过期、是不是可信机构签发的。',add:[A('cert','📜','证书校验',550,300,{kind:'item',tone:'primary'})],send:[{from:'s',to:'b',text:'证书'}],tone:{b:'ok'}},
  {say:'记住三个版本。',memo:['1.1 排队，2 多路复用','3 用 QUIC，TLS 防窃听防篡改']},
 ]}),
 ({id:'be-an-trouble',level:'be-trouble',kind:'advanced',icon:'🚨',title:'凌晨三点的告警',summary:'先止血，再按证据一层层定位。',beats:[
  {say:'凌晨三点，告警：下单接口大量超时。值班的你先看影响范围：所有实例都慢，从 2:50 开始。',add:[A('alarm','🚨','下单接口超时',320,70,{kind:'item',tone:'bad'}),A('me','🧑‍💻','值班的你',90,200,{tone:'primary'})]},
  {say:'2:45 刚发布了新版本。先回滚止血，同时保存日志和 profile，别急着重启把现场弄没了。',add:[A('roll','⏪','回滚 + 留证据',320,190,{kind:'tag',tone:'warm'})],send:[{from:'me',to:'roll'}]},
  {say:'回滚后恢复了。接着找原因：top 看到 CPU 很高，top -H 找到最忙的线程。',add:[A('top','📊','top -H',540,190,{kind:'tag'})],tone:{alarm:'ok'},sub:{alarm:'已恢复'}},
  {say:'pprof 一采样，热点在新代码里的正则表达式：每个请求都重新编译一次正则。',add:[A('pp','🔥','pprof：regexp.Compile',430,300,{kind:'tag',tone:'bad'})],send:[{from:'top',to:'pp'}]},
  {say:'修复：正则只编译一次。用同样的流量压测，P99 正常，再重新发布；复盘时补上性能测试和告警。',tone:{pp:'ok'},bubble:{who:'me',text:'修好了，写复盘'}},
  {say:'记住排查顺序。',memo:['看范围和变更，先止血','留证据，逐层定位，修完验证']},
 ]}),
 ({id:'be-an-io',level:'be-io',kind:'advanced',icon:'📮',title:'等快递的三种方式',summary:'阻塞、非阻塞、多路复用和零拷贝。',beats:[
  {say:'阻塞 I/O：你站在快递柜前一直等，快递没到哪也不去。一个线程只能等一个连接。',add:[A('me','🧍','线程',90,170,{tone:'primary'}),A('box','📦','快递柜（内核）',540,170,{kind:'item'})],bubble:{who:'me',text:'我一直等…'}},
  {say:'非阻塞 I/O：问一句“到了吗？”，没到立刻返回 EAGAIN，你可以先去干别的，过一会儿再来问。',add:[A('nb','🔁','EAGAIN：还没到',320,70,{kind:'tag',tone:'warm'})],send:[{from:'me',to:'box',text:'到了吗？'}]},
  {say:'epoll：快递员到货时主动通知你，而且只告诉你“哪几个柜子有货”。一个线程就能照看上万个连接。',drop:['nb'],add:[A('ep','📣','epoll：只通知就绪的',320,70,{kind:'item',tone:'ok'})],send:[{from:'box',to:'ep',text:'3 个有货',tone:'ok'},{from:'ep',to:'me'}]},
  {say:'注意：epoll 只是通知，数据还是你自己用 read 取回来，所以仍然是同步 I/O。',bubble:{who:'me',text:'取件还得我自己'}},
  {say:'发文件时用 sendfile：内核直接把页缓存里的数据交给 socket，不用先拷到你的程序里再拷回去，这就是零拷贝。',add:[A('sf','🚚','sendfile：页缓存 → socket',320,290,{kind:'tag',tone:'ok'})]},
  {say:'记住 I/O 模型。',memo:['阻塞一直等，非阻塞返回 EAGAIN','epoll 只报就绪，sendfile 少拷贝']},
 ]}),
 ({id:'be-an-kafka',level:'be-kafka',kind:'advanced',icon:'🛡️',title:'一条积分消息的不丢不重',summary:'acks、ISR、位移提交和幂等消费。',beats:[
  {say:'订单完成后发一条“加 10 积分”的消息。生产者设置 acks=all：要等同步副本都写好才算成功。',add:[A('p','📤','生产者',90,170,{tone:'primary'}),A('l','📒','leader',320,100,{kind:'item'}),A('f','📋','follower ×2',320,250,{kind:'item'})],send:[{from:'p',to:'l'},{from:'l',to:'f',text:'复制'}]},
  {say:'min.insync.replicas=2，并且禁止不干净选主：落后的副本不能当 leader，已确认的消息不会丢。',add:[A('isr','✅','ISR ≥ 2',320,30,{kind:'tag',tone:'ok'})],tone:{f:'ok'}},
  {say:'消费者处理成功后再提交位移。可它刚加完积分、还没提交就崩溃了。',add:[A('c','🧑','消费者',550,170)],send:[{from:'l',to:'c',text:'加 10 分'}],tone:{c:'bad'}},
  {say:'重启后同一条消息又来了一次。重复无法完全避免，所以消费要幂等。',bubble:{who:'c',text:'这条我是不是⏎处理过？'}},
  {say:'把事件 ID 写入去重表和加积分放在同一个数据库事务里，唯一约束挡住第二次，积分不会多加。',add:[A('db','🗄️','去重表 + 积分',550,300,{kind:'item',tone:'ok'})],send:[{from:'c',to:'db',text:'同一事务'}],tone:{c:'ok'}},
  {say:'记住可靠消息的三层。',memo:['生产 acks=all，broker ISR 与禁止不干净选主','消费成功后提交，业务幂等']},
 ]}),
 ({id:'be-an-cloud',level:'be-cloud',kind:'advanced',icon:'☸️',title:'从一个镜像到三个副本',summary:'镜像分层、K8s 调度、探针和自愈。',beats:[
  {say:'Dockerfile 一层层构建出镜像：基础系统、依赖、代码。变化少的层放前面，改代码时依赖层直接复用缓存。',add:[A('img','📦','镜像：基础 · 依赖 · 代码',320,60,{kind:'item',tone:'primary'})]},
  {say:'你向 K8s 声明：“我要 3 个副本”。API Server 校验后存进 etcd。',add:[A('api','🏛️','API Server',110,180,{kind:'item'})],send:[{from:'img',to:'api',text:'replicas: 3'}]},
  {say:'控制器创建 3 个 Pod 对象，scheduler 为每个 Pod 挑选节点，节点上的 kubelet 拉镜像、启动容器。',add:[A('p1','🟦','Pod 1',360,200,{kind:'tag'}),A('p2','🟦','Pod 2',460,200,{kind:'tag'}),A('p3','🟦','Pod 3',560,200,{kind:'tag'})],send:[{from:'api',to:'p1'}]},
  {say:'服务启动要预热 20 秒。readinessProbe 没通过之前，Pod 不接流量；通过后才挂到 Service 上。',add:[A('svc','🚦','Service 只转给 Ready 的 Pod',360,300,{kind:'tag',tone:'ok'})],tone:{p1:'ok',p2:'ok',p3:'ok'}},
  {say:'Pod 3 所在节点宕机。控制器发现只剩 2 个，马上在别处补一个——这就是自愈。',tone:{p3:'bad'},sub:{p3:'节点宕机'},bubble:{who:'api',text:'少了一个，补上'}},
  {say:'记住容器和 K8s 的分工。',memo:['镜像分层，数据放卷','声明期望状态，探针管流量和重启']},
 ]}),
];
