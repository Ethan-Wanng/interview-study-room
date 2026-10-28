import {A,type LessonStory} from './story';

// 后端通用动画课堂（二）：高阶与专家关卡。
export const beLessonsB:LessonStory[]=[
 ({id:'be-an-network',level:'be-network',kind:'advanced',icon:'🌐',title:'TCP 握手、传数据、挥手',summary:'三次握手、可靠传输和 TIME_WAIT。',beats:[
  {say:'客户端要和服务端说话，先三次握手：SYN → SYN+ACK → ACK，双方确认了彼此的起始序号。',add:[A('c','💻','客户端',100,170,{tone:'primary'}),A('s','🖥️','服务端',540,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'SYN'},{from:'s',to:'c',text:'SYN+ACK'}]},
  {say:'开始传数据：每个字节都有序号，对方用 ACK 确认；丢了就重传。拥塞窗口从小开始，慢慢变大，网络一堵就减速。',add:[A('cw','🪟','拥塞窗口：慢启动 → 线性增长',320,60,{kind:'tag',tone:'warm'})],send:[{from:'c',to:'s',text:'数据 seq=1000'},{from:'s',to:'c',text:'ACK',tone:'ok'}]},
  {say:'TCP 是字节流，两条消息可能粘在一起，应用要自己按长度或分隔符分帧。',add:[A('fr','📦','长度 + 数据 分帧',320,290,{kind:'tag'})]},
  {say:'聊完了，四次挥手：两个方向各发一次 FIN、各回一次 ACK。',send:[{from:'c',to:'s',text:'FIN'},{from:'s',to:'c',text:'ACK + FIN'}]},
  {say:'主动关闭的一方进入 TIME_WAIT，等 2MSL：万一最后的 ACK 丢了还能重发，也让旧报文过期，不干扰新连接。',tone:{c:'warm'},sub:{c:'TIME_WAIT'}},
  {say:'记住 TCP 的一生。',memo:['三次握手，四次挥手','序号 + ACK + 重传，拥塞控制']},
 ]}),
 ({id:'be-an-os',level:'be-os',kind:'advanced',icon:'🧠',title:'epoll：一个线程盯一万个连接',summary:'非阻塞 I/O、就绪通知和零拷贝。',beats:[
  {say:'服务器有一万个连接，大部分时间都在等数据。给每个连接一个线程？线程太多，切换和内存都扛不住。',add:[A('srv','🖥️','服务器',100,170,{tone:'primary'}),A('conns','🔌','1 万个连接',540,170,{kind:'item'})]},
  {say:'select 和 poll：每次把所有连接交给内核检查，返回后还要逐个看谁就绪，连接越多越慢。',add:[A('sel','🧮','select / poll：每次全扫',320,60,{kind:'tag',tone:'bad'})]},
  {say:'epoll：关注的连接只注册一次，内核在数据到达时把它放进就绪列表，epoll_wait 只返回这几个。',drop:['sel'],add:[A('ep','📣','epoll：只返回就绪的',320,170,{kind:'item',tone:'ok'})],send:[{from:'conns',to:'ep',text:'3 个就绪',tone:'ok'},{from:'ep',to:'srv'}]},
  {say:'配合非阻塞 socket：数据没好立刻返回 EAGAIN，线程去处理别的连接。边缘触发模式要一直读到 EAGAIN。',add:[A('nb','⏩','非阻塞 · 读到 EAGAIN',320,290,{kind:'tag',tone:'warm'})]},
  {say:'发文件时用 sendfile：内核直接把页缓存的数据送到 socket，不经过用户态，这就是零拷贝。',bubble:{who:'srv',text:'sendfile：\n少拷几次'}},
  {say:'记住 I/O 多路复用。',memo:['epoll 只返回就绪连接','非阻塞 + 读到 EAGAIN']},
 ]}),
 ({id:'be-an-mq',level:'be-mq',kind:'advanced',icon:'📨',title:'一条 Kafka 消息的旅程',summary:'分区、副本、消费组和位移。',beats:[
  {say:'订单服务发出“订单已创建”消息，用订单号作 key，同一订单的消息总是进同一个分区，保证顺序。',add:[A('p','📦','生产者',90,170,{tone:'primary'}),A('part','📒','分区 2（leader）',320,90,{kind:'item'})],send:[{from:'p',to:'part',text:'key=订单 42'}]},
  {say:'leader 追加到日志末尾，follower 复制。acks=all 加 min.insync.replicas=2，保证至少两份才算成功。',add:[A('f','📋','follower 副本',320,250,{kind:'tag',tone:'ok'})],send:[{from:'part',to:'f',text:'复制'}]},
  {say:'消费组里，一个分区只分给一个消费者。消费者处理成功后再提交位移，记下“下一条从哪读”。',add:[A('c','🧑','消费者',550,170,{tone:'ok'})],send:[{from:'part',to:'c',text:'消息'}]},
  {say:'处理完还没来得及提交就崩溃了？重启后会再收到一次——所以消费要幂等：事件 ID 和业务更新放在同一个事务里。',tone:{c:'warm'},bubble:{who:'c',text:'这条处理过了，\n跳过'}},
  {say:'lag 一直涨？先看是生产暴涨、消费者故障还是下游变慢，再在分区数范围内扩消费者，并保护下游。',add:[A('lag','📈','lag 监控',550,300,{kind:'tag',tone:'warm'})]},
  {say:'记住可靠消费的要点。',memo:['同 key 同分区保证顺序','处理后提交，消费要幂等']},
 ]}),
 ({id:'be-an-ms',level:'be-ms',kind:'advanced',icon:'🧩',title:'微服务里的一次故障',summary:'超时、熔断、降级和链路追踪。',beats:[
  {say:'下单请求：网关 → 订单服务 → 库存服务。某天库存服务变得很慢。',add:[A('gw','🚪','网关',90,170,{kind:'item'}),A('o','🧾','订单服务',320,170,{kind:'item',tone:'primary'}),A('s','🐢','库存服务（变慢）',550,170,{kind:'item',tone:'bad'})],send:[{from:'gw',to:'o'},{from:'o',to:'s',text:'等…',tone:'bad'}]},
  {say:'没有超时的话，订单服务的连接全卡在等库存，自己也挂了，故障一路传到网关——级联雪崩。',tone:{o:'bad'}},
  {say:'加上超时，并把剩余时间预算沿调用链往下传；持续失败就熔断，直接返回降级结果。',add:[A('cb','🔌','超时 + 熔断 + 降级',320,60,{kind:'tag',tone:'ok'})],tone:{o:'warm'}},
  {say:'按依赖隔离连接池，库存出问题不会拖垮其他功能；入口限流，超出容量的请求快速拒绝。',add:[A('iso','🧱','隔离 · 限流',320,290,{kind:'tag',tone:'ok'})],tone:{o:'ok'}},
  {say:'链路追踪把一次请求在各个服务的耗时串起来，一眼看出慢在库存服务。部署在 K8s 上时，readiness 探针会把没准备好的实例摘掉。',add:[A('tr','🧵','链路追踪',550,300,{kind:'tag'})]},
  {say:'记住容错手段。',memo:['超时、熔断、降级、隔离','链路追踪定位慢在哪']},
 ]}),
 ({id:'be-an-es',level:'be-es',kind:'advanced',icon:'🔎',title:'从写入到搜到：Elasticsearch',summary:'倒排索引、refresh 和查询类型。',beats:[
  {say:'写入一篇文档“Go 并发编程实战”。分析器先把它切成词：go、并发、编程、实战。',add:[A('doc','📄','文档',90,100,{kind:'item'}),A('an','✂️','分析器：分词',320,100,{tone:'primary'})],send:[{from:'doc',to:'an'}]},
  {say:'倒排索引记录每个词出现在哪些文档里：“并发”→ 文档 1、5、9。',add:[A('inv','📇','倒排索引：词 → 文档',530,100,{kind:'item',tone:'ok'})],send:[{from:'an',to:'inv'}]},
  {say:'数据先进内存缓冲区并写 translog；refresh（约 1 秒一次）生成新的 segment 后才能被搜到——近实时。',add:[A('seg','🧱','refresh → 新 segment',530,250,{kind:'tag',tone:'warm'})]},
  {say:'查询“并发编程”用 match（会分词）；按租户、状态过滤用 term 放进 filter，不算分还能缓存。',add:[A('q','🔍','match + filter',150,250,{kind:'tag',tone:'primary'})],send:[{from:'q',to:'inv'}]},
  {say:'翻到很深的页别用 from+size，用 PIT + search_after；并发修改同一文档时带 if_seq_no，冲突返回 409。',bubble:{who:'q',text:'深分页用\nsearch_after'}},
  {say:'记住搜索的关键点。',memo:['分词建倒排，refresh 后可搜','全文 match，过滤 filter']},
 ]}),
 ({id:'be-an-design',level:'be-design',kind:'advanced',icon:'🏗️',title:'秒杀系统：层层过滤',summary:'限流、预扣库存、异步下单和状态机。',beats:[
  {say:'1 万件商品，100 万人同时抢。核心思路：越往后，请求越少。',add:[A('u','👥','100 万用户',90,170,{tone:'warm'})]},
  {say:'第一层：静态页面放 CDN；网关按用户、IP 限流防刷，挡掉大部分请求。',add:[A('gw','🚦','CDN + 网关限流',260,80,{kind:'item',tone:'primary'})],send:[{from:'u',to:'gw'}]},
  {say:'第二层：资格校验后原子预扣库存（Redis Lua，或数据库 UPDATE … WHERE 库存 > 0 并检查影响行数），防止超卖。',add:[A('stock','📦','原子预扣库存',430,170,{kind:'item',tone:'ok'})],send:[{from:'gw',to:'stock',text:'少量请求'}]},
  {say:'第三层：抢到的进队列，订单服务异步下单，数据库事务落单，订单号唯一约束防重复。',add:[A('mq','📨','队列 → 订单服务',430,300,{kind:'item'})],send:[{from:'stock',to:'mq'}]},
  {say:'状态要分清：排队成功、下单成功、支付成功。超时未支付自动取消，库存幂等释放；预扣和消息都要对账。',bubble:{who:'mq',text:'排队 ≠ 下单\n≠ 支付'}},
  {say:'记住设计思路。',memo:['CDN、限流、原子预扣','异步下单，状态机与对账']},
 ]}),
];
