import {A,type Story} from '../story';

// 微服务面试题动画（五）：Kafka 位移、生产语义与顺序。
export const msE:Record<string,Story>={
 'q-051a5cf2e2d57304':{title:'位移主题：记录每个消费组读到哪了',beats:[
  {say:'消费者读到第 42 条后重启了。它怎么知道从哪继续？靠提交的位移（offset）。',add:[A('c','🧑','消费组 G1',110,170,{tone:'primary'}),A('p','📒','orders 分区 0',330,90,{kind:'item'})],send:[{from:'p',to:'c',text:'读到 41'}]},
  {say:'位移存在一个内部主题 __consumer_offsets 里，按“消费组 + topic + 分区”记录。',add:[A('off','🗂️','__consumer_offsets',330,260,{kind:'item',tone:'ok'})],send:[{from:'c',to:'off',text:'提交 offset=42'}]},
  {say:'注意：提交的 42 是“下一条要读的位置”，不是最后处理完的那条。',bubble:{who:'off',text:'G1 下次从 42 读'}},
  {say:'组协调器负责处理提交和查询；这个主题是压缩主题，只保留每个 key 的最新位移。',add:[A('co','🧑‍⚖️','组协调器',550,260,{tone:'warm'})],send:[{from:'co',to:'off'}]},
  {say:'业务处理成功和提交位移是两个动作，中间崩溃就会重复或漏处理，要想清楚这个窗口。',memo:['位移存在 __consumer_offsets','提交的是下一条的位置']},
 ]},
 'q-809c5b34d0dfaf47':{title:'位移提交的几种方式',beats:[
  {say:'自动提交：客户端定时帮你提交。省事，但可能消息还没处理完就提交了，崩溃时会丢处理。',add:[A('auto','⏰','自动提交',120,80,{kind:'tag',tone:'warm'}),A('c','🧑','消费者',320,190,{tone:'primary'})]},
  {say:'手动提交：处理成功后再提交“下一条 offset”，得到“至少一次”：提交前崩溃会重复处理，但不会丢。',add:[A('man','✋','处理后手动提交',520,80,{kind:'tag',tone:'ok'})],send:[{from:'c',to:'man',text:'处理完再提交'}]},
  {say:'同步提交：等待结果，简单可靠，但会阻塞。异步提交：吞吐好，但要处理回调，不能盲目重试旧的 offset 覆盖新的。',add:[A('sync','⏳','同步：等结果',120,300,{kind:'tag'}),A('async','⚡','异步：看回调',520,300,{kind:'tag'})]},
  {say:'一个分区并发处理时，只能提交“连续完成的前缀”：41、42 完成、43 还在处理，就只能提交到 43。',bubble:{who:'c',text:'43 没完成，\n不能跳过它'}},
  {say:'记住几种方式。',memo:['先处理后提交 = 至少一次','并发时只提交连续完成的前缀']},
 ]},
 'q-fbd8a4dce2890044':{title:'幂等生产者和事务生产者',beats:[
  {say:'生产者发消息，网络超时后重试。broker 其实已经收到第一次了，会不会写两遍？',add:[A('p','📦','生产者',110,170,{tone:'primary'}),A('b','🖥️','broker 分区',470,170,{kind:'item'})],send:[{from:'p',to:'b',text:'seq=7'},{from:'p',to:'b',text:'重试 seq=7',tone:'warm'}]},
  {say:'幂等生产者：每个生产者有 ID 和 epoch，每条消息带分区内序列号。broker 看到同一个序号，就知道是重试，丢弃重复。',bubble:{who:'b',text:'seq=7 收过了，\n丢掉重复',tone:'ok'},tone:{b:'ok'}},
  {say:'事务生产者更进一步：把写多个分区、外加提交消费位移，放进同一个 Kafka 事务，要么全部可见，要么全部作废。',add:[A('tx','🔒','事务：多分区 + 位移',320,300,{kind:'item',tone:'ok'})]},
  {say:'消费者设成 read_committed，就看不到未提交或已中止事务里的消息。',add:[A('c','🧑','read_committed 消费者',520,300,{tone:'ok'})],send:[{from:'tx',to:'c'}]},
  {say:'但它们都管不到 Kafka 外面：写 MySQL、调 HTTP 依然可能重复，要用 outbox、幂等键等方式解决。',memo:['幂等：分区内去掉重试重复','事务：跨分区 + 位移原子提交']},
 ]},
 'q-f46b7545e229dd20':{title:'怎么保证消息有序',beats:[
  {say:'Kafka 只保证同一个分区内有序，不保证整个 topic 全局有序。',add:[A('p0','📒','分区 0',200,90,{kind:'item'}),A('p1','📒','分区 1',440,90,{kind:'item'})]},
  {say:'订单 42 的“创建 → 支付 → 发货”必须按顺序处理。用订单号做 key，同一个 key 总是进同一个分区。',add:[A('pr','📦','key = 订单 42',320,240,{kind:'item',tone:'primary'})],send:[{from:'pr',to:'p0',text:'创建 → 支付 → 发货',tone:'ok'}]},
  {say:'生产端开幂等，并配好 in-flight 参数，避免重试导致乱序。消费端按分区串行处理，或者按 key 有序调度。',add:[A('c','🧑','消费者：按分区串行',170,295,{tone:'ok'})],send:[{from:'p0',to:'c'}]},
  {say:'坑一：扩分区后，key 到分区的映射可能变化。坑二：失败的消息转到重试主题，后面的消息可能先被处理。',add:[A('w','⚠️','扩分区 · 重试主题会乱序',470,320,{kind:'tag',tone:'warm'})]},
  {say:'严格全局有序通常只能用一个分区，并行度就没了。',memo:['分区内有序，按 key 路由','扩分区、重试要小心']},
 ]},
 'q-a8b7c63e068c6143':{title:'Kafka 发送消息的方式',beats:[
  {say:'从“调用方式”看有三种：同步发送、异步回调、发了就不管。',add:[A('sync','⏳','同步：等结果',130,80,{kind:'tag'}),A('async','📞','异步：回调',320,80,{kind:'tag',tone:'ok'}),A('fire','🚀','发了不管',510,80,{kind:'tag',tone:'bad'})]},
  {say:'从“broker 确认”看是另一回事：acks=0、1、all。两个维度不要混为一谈。',add:[A('acks','✅','acks = 0 / 1 / all',320,200,{kind:'item',tone:'primary'})]},
  {say:'异步发送也可以配 acks=all；同步 API 也不自动保证最高可靠性。',bubble:{who:'acks',text:'异步 + all\n也很可靠'}},
  {say:'高吞吐一般靠异步和批量，但一定要处理成功和失败的回调，限制缓冲区，退出前 flush。',add:[A('fl','🧹','处理回调 · 退出前 flush',320,320,{kind:'tag',tone:'warm'})]},
  {say:'忽略发送结果，故障就变成了“静默丢消息”。',tone:{fire:'bad'},memo:['调用方式和 acks 是两个维度','处理回调，退出前 flush']},
 ]},
 'q-8651521ae8627b69':{title:'Kafka 怎么做到高可用',beats:[
  {say:'每个分区有多个副本，分布在不同 broker 上。一个是 leader，其余是 follower。',add:[A('l','👑','leader（broker 1）',170,90,{tone:'primary'}),A('f1','📋','follower（broker 2）',470,90,{tone:'ok'}),A('f2','📋','follower（broker 3）',470,250)]},
  {say:'跟得上的副本组成 ISR（同步副本集合）。broker 1 挂了，从 ISR 里选一个新 leader。',tone:{l:'bad'},sub:{l:'宕机'},send:[{from:'f1',to:'l',tone:'bad'}]},
  {say:'broker 2 成为新 leader，继续服务。',sub:{f1:'新的 leader'},tone:{f1:'primary'}},
  {say:'控制面在现代 Kafka 里用 KRaft 控制器多数派管理元数据。',add:[A('kr','🗳️','KRaft 控制器',170,250,{kind:'tag'})]},
  {say:'想要数据更安全：acks=all + 合理的 min.insync.replicas，并且禁止“不干净选主”（不让落后的副本当 leader）。副本跨机房放，监控 ISR 收缩。',add:[A('safe','🛡️','acks=all · min.insync · 禁止不干净选主',320,330,{kind:'tag',tone:'ok'})]},
  {say:'副本不是备份：误删和业务错误也会被复制过去。',memo:['多副本 + ISR 选主','acks=all + min.insync.replicas']},
 ]},
 'q-64d6c9192640528c':{title:'Kafka 会不会丢数据',beats:[
  {say:'会。关键是丢在哪一层。沿着消息走一遍。',add:[A('p','📦','生产者',90,170,{tone:'primary'}),A('b','🖥️','broker',320,170,{kind:'item'}),A('c','🧑','消费者',550,170)]},
  {say:'生产端：没等发送结果就退出；acks=0 或 1 太弱。',add:[A('e1','💥','没等结果 · acks 太弱',105,60,{kind:'tag',tone:'bad'})],send:[{from:'p',to:'b',tone:'bad'}]},
  {say:'broker 端：所有副本都坏了；允许落后的副本当 leader（不干净选主）；保留期到了，没消费的消息被清掉。',add:[A('e2','💥','副本全坏 · 不干净选主 · 过期',320,300,{kind:'tag',tone:'bad'})]},
  {say:'消费端：先提交位移再处理，处理时崩溃，这条就“跳过”了。',add:[A('e3','💥','先提交后处理',550,60,{kind:'tag',tone:'bad'})],send:[{from:'b',to:'c',tone:'bad'}]},
  {say:'可靠方案：生产幂等 + 等确认；多副本 + ISR 门槛；处理成功后再提交；重试、死信和对账。',tone:{p:'ok',b:'ok',c:'ok'},bubble:{who:'b',text:'每一层都要\n配合好',tone:'ok'}},
  {say:'即使 MQ 没丢，业务也可能漏处理；故障超出配置的承诺时，也不能绝对保证。',memo:['生产、存储、消费三层都可能丢','确认 + 副本 + 后提交 + 对账']},
 ]},
 'q-81c178be884a95ad':{title:'Kafka 怎么避免重复消费',beats:[
  {say:'消费者处理完一条“加 10 积分”，还没来得及提交位移就崩溃了。重启后这条又来了一次。',add:[A('c','🧑','消费者',110,170,{tone:'primary'}),A('m','📨','加 10 积分 #e-981',330,80,{kind:'item'})],send:[{from:'m',to:'c',text:'又来了',tone:'warm'}]},
  {say:'重复无法完全避免，所以按“至少一次”设计，让业务幂等：同一条消息执行多次，结果和一次一样。',bubble:{who:'c',text:'加过了吗？'}},
  {say:'给每个事件一个唯一 ID，把“去重记录”和“业务变更”放在同一个数据库事务里，用唯一约束保证只生效一次。',add:[A('db','🗄️','同一事务：去重表 + 积分',330,260,{kind:'item',tone:'ok'})],send:[{from:'c',to:'db',text:'INSERT 事件 ID'}]},
  {say:'第二次插入同一个事件 ID，唯一约束冲突，整个事务回滚，积分不会多加。',bubble:{who:'db',text:'e-981 已处理',tone:'ok'}},
  {say:'只用 Redis SETNX 再去改数据库，两步之间崩溃仍有窗口。去重记录的保留期要覆盖回放和重试周期。',add:[A('r','⚠️','SETNX + 改库：有窗口',540,170,{kind:'tag',tone:'warm'})]},
  {say:'记住去重方法。',memo:['按至少一次设计，业务幂等','去重记录和业务同一事务']},
 ]},
 'q-d52b9b98efc875aa':{title:'Kafka 消息积压了怎么办',beats:[
  {say:'监控报警：lag 一直在涨，最早的未处理消息已经是 30 分钟前的了。',add:[A('lag','📈','lag 持续上涨',320,60,{kind:'tag',tone:'bad'})]},
  {say:'先找原因：是生产量突然暴涨？消费者挂了？某个分区是热点？还是下游数据库变慢了？',add:[A('p','📦','生产激增？',110,180,{kind:'tag'}),A('c','🧑','消费者故障？',320,180,{kind:'tag'}),A('d','🗄️','下游变慢？',530,180,{kind:'tag'})]},
  {say:'恢复消费者、优化批处理和外部 I/O；分区数允许时增加消费者。注意：同组消费者比分区多，多出来的会闲着。',add:[A('scale','👥','扩消费者（≤ 分区数）',220,300,{kind:'tag',tone:'ok'})]},
  {say:'扩容时保护好数据库和缓存，别把下游压垮；“毒消息”要隔离到重试队列，并且能追踪。',add:[A('poison','☠️','毒消息隔离',470,300,{kind:'tag',tone:'warm'})],tone:{lag:'warm'}},
  {say:'必要时延长保留期防止过期丢消息，扩容存储；重新分区要评估对有序性的影响。',tone:{lag:'ok'},sub:{lag:'lag 开始下降'}},
  {say:'记住处理步骤。',memo:['先定位：生产、消费还是下游','扩消费者 ≤ 分区数，保护下游']},
 ]},
 'q-8fc0261d8b859786':{title:'用 Go 操作 Kafka 要注意什么',beats:[
  {say:'先确认 Go 客户端和 broker 的版本、支持的功能（事务、幂等、重平衡协议）。不同客户端的配置名也不一样。',add:[A('app','🐹','Go 服务',110,170,{tone:'primary'}),A('k','📜','Kafka',530,170,{kind:'item'})]},
  {say:'生产：复用连接，处理错误事件和背压，失败用稳定的消息 key 重试。',send:[{from:'app',to:'k',text:'发送 + 处理错误'}],add:[A('prod','📦','复用 · 背压 · 稳定 key',320,60,{kind:'tag'})]},
  {say:'消费：处理成功后再提交连续完成的位移；分区被收回时，停掉对应的任务，处理好没完成的工作。',send:[{from:'k',to:'app',text:'消息'}],add:[A('cons','✅','成功后提交 · 撤销时停任务',320,290,{kind:'tag',tone:'ok'})]},
  {say:'不要每来一条就开一个 goroutine，要有并发上限。',bubble:{who:'app',text:'收到 ≠ 处理成功'}},
  {say:'退出时：停止接新消息、取消 context、等处理中的任务完成，再 flush 和 close。',memo:['成功后才提交位移','限制并发，退出前 flush/close']},
 ]},
};
