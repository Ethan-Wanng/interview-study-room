import type {AiQuiz} from '../journey';

// 进阶阶段训练补充题：日志与复制、事务、Redis、Linux、设计模式。
export const beTrain2Extra:AiQuiz[]=[
 {id:'be-x2-16',q:'innodb_flush_log_at_trx_commit=2、sync_binlog=0 时，哪种故障最可能丢失已提交的事务？',options:['MySQL 进程崩溃，操作系统正常','整台机器断电','只是网络抖动','从库重启'],answer:1,explain:'=2 时 redo 写到操作系统缓存，=0 时 binlog 交给系统刷盘；进程崩溃数据还在 OS 缓存里，断电才会丢。'},
 {id:'be-x2-17',type:'multi',q:'主从复制延迟持续增大，下面哪些措施有效？（多选）',options:['把一次删除千万行的大事务拆成小批次','开启从库并行复制','提升从库的磁盘和 CPU 配置','把所有读请求都改到从库'],answers:[0,1,2],explain:'把更多读压到延迟的从库只会让问题更严重。'},
 {id:'be-x2-18',q:'订单表按 user_id 分成 16 张表后，商家后台要按 shop_id 查询订单。最合理的方案是？',options:['每次查询扫描全部 16 张表','按 shop_id 建一份冗余的订单索引表或同步到 ES 查询','把分片键改成 shop_id','禁止商家查询'],answer:1,explain:'不带分片键的查询用冗余数据或搜索引擎；全分片扫描在数据量大时代价很高。'},
 {id:'be-x2-19',type:'judge',q:'在 RR 隔离级别下，SELECT ... FOR UPDATE 读取的是事务开始时的快照数据。',answer:false,explain:'加锁读是“当前读”，读取最新已提交的数据并加锁。'},
 {id:'be-x2-20',q:'Redis 缓存一个热点 key，过期瞬间大量请求同时回源数据库。下面哪种做法最直接？',options:['把 TTL 设成 1 秒','只允许一个请求重建缓存（互斥锁 / singleflight），其他请求等待或返回旧值','关闭缓存','增加 Redis 内存'],answer:1,explain:'这是缓存击穿，关键是控制回源并发；也可以用逻辑过期后台刷新。'},
 {id:'be-x2-21',q:'服务进程收到 kill 后没有退出，ps 显示状态为 Z。正确的理解是？',options:['进程卡在 I/O 上','进程已经退出，是僵尸进程，等待父进程 wait 回收；要处理父进程','需要 kill -9 它','磁盘满了'],answer:1,explain:'僵尸进程已经死了，kill 它没用。'},
 {id:'be-x2-22',type:'fill',q:'Go 中保证初始化函数只执行一次，常用 sync.____。',accepted:['Once','Once.Do'],explain:'once.Do(f) 保证 f 只执行一次，其他调用者等待它完成。'},
 {id:'be-x2-23',type:'short',q:'支付系统要支持微信、支付宝、银行卡，以后还会加新渠道。用什么设计模式？说说接口怎么设计、要注意什么。',reference:'用策略模式：定义 PayChannel 接口，例如 Pay(ctx, order) (Result, error)、Query、Refund，每个渠道各自实现，运行时按订单选择的渠道注入；新增渠道只需新增实现和注册，不改下单流程（开闭原则）。注意金额用整数分，带商户订单号做幂等，设置超时，回调要验签，结果以对账和渠道查询为准，而不是只看同步返回。',points:['策略模式：统一接口，各渠道实现','新增渠道不改调用方','金额用分，商户订单号幂等','超时、回调验签、对账'],explain:'设计模式题一定要落到真实约束上。'},
];

// 专家阶段训练补充题：Kafka 可靠性、微服务、云原生、ES、系统设计。
export const beTrain4Extra:AiQuiz[]=[
 {id:'be-x4-16',q:'消费者异步并发处理一个分区的消息，41、42 已完成，43 还在处理，44 已完成。此时能提交的位移是？',options:['45','43（下一条要读 43）','44','任意一个都可以'],answer:1,explain:'只能提交连续完成的前缀，否则崩溃后 43 会被跳过。'},
 {id:'be-x4-17',type:'multi',q:'关于 Kafka 事务，下面哪些说法正确？（多选）',options:['可以把写多个分区和提交消费位移放进一个原子操作','消费者要设置 isolation.level=read_committed 才看不到未提交的消息','能保证写 MySQL 也恰好一次','依赖 transactional.id 识别生产者'],answers:[0,1,3],explain:'Kafka 事务只覆盖 Kafka 内部，外部系统仍需幂等或 outbox。'},
 {id:'be-x4-18',q:'Pod 的 livenessProbe 配成调用依赖的下游服务健康接口。下游故障时会发生什么？',options:['什么都不会发生','所有 Pod 被反复重启，故障被放大','流量自动切到其他集群','Pod 会自动扩容'],answer:1,explain:'liveness 只应检查进程自身；依赖问题用 readiness 或降级处理。'},
 {id:'be-x4-19',type:'judge',q:'Docker 镜像里只要不写 USER，容器内进程默认以 root 运行，这在生产中通常应该避免。',answer:true,explain:'以非 root 用户运行、只读根文件系统、去掉多余 capabilities 都能减小被攻破后的影响。'},
 {id:'be-x4-20',q:'滚动更新时新版本 Pod 启动后立刻接到流量，但前 20 秒都在加载缓存，大量请求超时。应该怎么改？',options:['把副本数调成 1','配置 readinessProbe，预热完成才标记就绪；必要时设置 maxSurge/maxUnavailable','关闭滚动更新','去掉所有探针'],answer:1,explain:'就绪前不接流量，滚动更新会等新 Pod Ready 再替换旧 Pod。'},
 {id:'be-x4-21',type:'fill',q:'ES 中对 keyword 字段做精确过滤并希望结果可被缓存、不参与算分，应该把条件放在 bool 查询的 ____ 子句里。',accepted:['filter'],explain:'filter 不算分，可利用缓存；全文匹配放 must。'},
 {id:'be-x4-22',q:'设计“订单 30 分钟未支付自动取消”，用户恰好在第 30 分钟付款。怎样保证不会既取消又支付成功？',options:['加大超时时间','取消和支付都用带状态条件的更新，如 UPDATE ... WHERE status = 待支付，并检查影响行数','先取消再退款','用定时器精确到毫秒'],answer:1,explain:'状态机 + 条件更新让两个操作只有一个能成功，另一个按结果处理。'},
 {id:'be-x4-23',type:'short',q:'一个服务每天要把 1000 万条订单事件可靠地同步给搜索服务（ES）。说说你的链路设计，以及如何保证不丢、不乱、可恢复。',reference:'订单服务在本地事务中同时写订单和 outbox 表；后台投递器或 CDC（读 binlog）把事件发到 Kafka，以订单号为 key 保证同一订单有序；索引服务消费后按订单号作为文档 ID 写 ES，带版本号（如 updated_at 或 binlog 位点）用外部版本控制，旧事件不能覆盖新数据；处理成功后再提交位移，失败重试并进入死信队列；用 bulk 批量写并检查每条结果；定期全量对账，支持从某个时间点重放或全量重建索引。',points:['outbox 或 CDC，保证事件不漏','按订单号分区保证顺序','版本号防旧覆盖新，文档 ID 幂等','成功后提交位移，死信、对账、可重放'],explain:'数据同步题的核心是：可靠捕获、有序、幂等、可修复。'},
];
