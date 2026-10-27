import {A,type Story} from '../story';

// 微服务面试题动画（四）：Kafka 存储、写入与消费组。
export const msD:Record<string,Story>={
 'q-79e3ddc50f8c1d3d':{title:'Kafka 为什么吞吐这么高',beats:[
  {say:'Kafka 把每个分区当成一本只往后追加的日记，新消息永远写在末尾——顺序写磁盘，比随机写快得多。',add:[A('log','📜','分区日志：只追加',320,80,{kind:'item',tone:'primary'})]},
  {say:'批量：生产者攒一批消息一起发，一起压缩，摊薄每条消息的网络和系统调用开销。',add:[A('p','📦','生产者：攒批 + 压缩',110,220,{kind:'item',tone:'ok'})],send:[{from:'p',to:'log',text:'一批'}]},
  {say:'借用操作系统的页缓存，读写多数在内存里完成；部分发送路径还能用 sendfile 减少数据复制。',add:[A('pc','🧠','页缓存 · sendfile',320,200,{kind:'tag',tone:'ok'})]},
  {say:'分区分布在多台 broker 上并行处理；消费者也是成批拉取。',add:[A('c','👥','消费者：批量拉取',530,220,{kind:'item',tone:'ok'})],send:[{from:'log',to:'c',text:'一批'}]},
  {say:'但 TLS、压缩格式转换、消息大小、磁盘和 acks 级别都会影响性能，不能说 Kafka 永远没有随机 I/O、任何路径都零拷贝。',add:[A('cav','⚠️','TLS · 消息大小 · acks',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住高吞吐的原因。',memo:['顺序追加 + 批量压缩','页缓存、分区并行']},
 ]},
 'q-c9408c92e3b633e8':{title:'Kafka 为什么用页缓存而不自己做缓存',beats:[
  {say:'Kafka 跑在 JVM 上。如果在 JVM 堆里自己存一大份消息缓存，会怎样？',add:[A('jvm','☕','JVM 堆',170,90,{kind:'item',tone:'warm'})]},
  {say:'堆越大，GC 越重；而且操作系统页缓存里还会再存一份，同一份数据存两遍。',add:[A('dup','📑','同一份数据缓存两次',170,220,{kind:'tag',tone:'bad'})],bubble:{who:'jvm',text:'GC 好累…',tone:'bad'}},
  {say:'直接用操作系统的页缓存：成熟的预读、回写机制现成可用，不占 JVM 堆，进程重启后缓存可能还在。',drop:['dup'],add:[A('pc','🧠','OS 页缓存',470,90,{kind:'item',tone:'ok'})],tone:{jvm:'base'}},
  {say:'代价：页缓存会受其他进程和系统内存压力影响。',add:[A('cost','⚖️','受系统内存压力影响',470,220,{kind:'tag',tone:'warm'})]},
  {say:'注意：Kafka 仍要管理元数据和请求的内存，JVM 堆不能随便缩；写进页缓存也不代表已经持久化到磁盘。',memo:['复用 OS 页缓存，少 GC、不重复','写入缓存 ≠ 已落盘']},
 ]},
 'q-cab215c3ebd54bc6':{title:'Kafka 的数据怎么存',beats:[
  {say:'一个 topic 分成多个分区（partition），分区分布在不同 broker 上。',add:[A('t','📚','topic：orders',320,50,{kind:'item',tone:'primary'}),A('p0','📒','分区 0',170,150,{kind:'tag'}),A('p1','📒','分区 1',470,150,{kind:'tag'})],send:[{from:'t',to:'p0'},{from:'t',to:'p1'}]},
  {say:'每个分区是一条有序追加的日志，按大小或时间切成多个 segment 段文件。',add:[A('seg','🧱','segment：.log + 索引',170,260,{kind:'item'})],send:[{from:'p0',to:'seg'}]},
  {say:'每个段有 .log 数据文件，还有稀疏的 offset 索引和时间索引，用来快速定位。offset 是分区内的逻辑序号，不是文件里的字节位置。',sub:{seg:'offset 是逻辑序号'}},
  {say:'清理旧数据有两种：retention 按时间或大小删掉旧段；compaction 按 key 只保留最新的一条。',add:[A('ret','🗑️','retention 删旧段',470,250,{kind:'tag',tone:'warm'}),A('cmp','🗜️','compaction 按 key 留最新',470,320,{kind:'tag'})]},
  {say:'消费并不会删除消息，所以多个消费组可以各自独立地从不同位置读。',memo:['topic → 分区 → segment','offset 是逻辑位置，消费不删数据']},
 ]},
 'q-d4f4d2117fb88f36':{title:'Kafka 写入一条消息的过程',beats:[
  {say:'生产者把消息序列化，按分区规则（比如 key 的哈希）选好分区，先放进本地缓冲区组成一批。',add:[A('p','📦','生产者（攒批）',90,170,{tone:'primary'}),A('l','👑','分区 leader',330,170,{kind:'item'})]},
  {say:'这一批发给该分区的 leader，leader 追加到本地日志。',send:[{from:'p',to:'l',text:'一批消息'}]},
  {say:'follower 主动来拉取并复制。',add:[A('f1','📋','follower 1',560,90,{kind:'tag'}),A('f2','📋','follower 2',560,250,{kind:'tag'})],send:[{from:'l',to:'f1',text:'复制'},{from:'l',to:'f2',text:'复制'}]},
  {say:'acks=0 不等确认；acks=1 等 leader 写好；acks=all 等 ISR 里的副本都确认，再配合 min.insync.replicas 规定最少副本数。',add:[A('acks','✅','acks = 0 / 1 / all',330,300,{kind:'tag',tone:'ok'})],send:[{from:'l',to:'p',text:'确认',tone:'ok'}]},
  {say:'确认不代表每个副本都 fsync 了。网络超时可能是“其实写成功了，只是回复丢了”，所以要开幂等生产，业务也要能去重。',bubble:{who:'p',text:'超时了，\n到底写没写？',tone:'warm'}},
  {say:'记住写入流程。',memo:['攒批 → leader 追加 → follower 复制','acks 决定等谁确认']},
 ]},
 'q-fdd9d1567fb96ff8':{title:'消费组重平衡：重新分工',beats:[
  {say:'一个消费组里 2 个消费者，分着读 4 个分区。',add:[A('c1','🧑','消费者 A：P0 P1',150,90),A('c2','👩','消费者 B：P2 P3',490,90),A('co','🧑‍⚖️','组协调器',320,250,{kind:'item',tone:'primary'})]},
  {say:'新来了消费者 C（或者有人掉线、心跳超时、分区数变了），就要重新分配——这就是重平衡（rebalance）。',add:[A('c3','🧑‍🦱','消费者 C（新）',320,90,{tone:'warm'})],send:[{from:'c3',to:'co',text:'JoinGroup'}]},
  {say:'经典协议：大家向协调器发 JoinGroup，选出的组 leader 计算分配方案，再通过 SyncGroup 发给每个人。',send:[{from:'co',to:'c1',text:'SyncGroup'},{from:'co',to:'c2',text:'SyncGroup'}]},
  {say:'eager 策略：所有人先放下全部分区再重新领，期间整组停下；cooperative 策略只转移需要变的分区，影响小得多。',sub:{c1:'A：P0 P1',c2:'B：P2',c3:'C：P3'},tone:{c3:'ok'}},
  {say:'Kafka 4.0 的新消费组协议把分配更多放到服务端，不能再完全照搬经典流程，具体看 broker、客户端和 group.protocol 配置。',memo:['成员或分区变化 → 重新分工','eager 全停，cooperative 增量']},
 ]},
 'q-9b6c6aae2bfba860':{title:'怎样减少不必要的重平衡',beats:[
  {say:'重平衡没法也不该完全避免：成员和分区真变了，就得重新分工。要减少的是“无谓的”重平衡。',add:[A('c','🧑','消费者',320,170,{tone:'primary'})]},
  {say:'最常见的原因：一批消息处理太久，超过 max.poll.interval.ms 没再 poll，协调器以为它死了，踢出消费组。',add:[A('slow','🐢','单批处理太久',120,80,{kind:'tag',tone:'bad'})],tone:{c:'bad'},bubble:{who:'c',text:'我只是慢，\n没死啊',tone:'bad'}},
  {say:'办法：及时 poll，调小每批数量，合理设置超时；避免频繁滚动重启。',add:[A('fix','⏱️','及时 poll · 小批量',520,80,{kind:'tag',tone:'ok'})],tone:{c:'ok'}},
  {say:'支持的话，用静态成员 group.instance.id（重启后还是同一个成员），或协作式分配、新消费者协议。',add:[A('st','🪪','静态成员 · 协作式分配',520,280,{kind:'tag',tone:'ok'})]},
  {say:'异步处理时要对每个分区施加背压，只提交连续完成的位移。别只是调大 max.poll.interval.ms 来掩盖处理卡死。',add:[A('bp','🚧','背压 + 连续位移提交',120,280,{kind:'tag',tone:'warm'})]},
  {say:'记住减少重平衡的方法。',memo:['及时 poll，小批量','静态成员、协作式分配']},
 ]},
 'q-81119323c2239050':{title:'Kafka 删除 topic 的流程',beats:[
  {say:'管理员发起删除 topic。这是一个异步操作：请求被接受，不代表磁盘文件已经删掉。',add:[A('adm','🧑‍💼','管理员',90,170),A('ctl','🎛️','控制器',300,170,{kind:'item',tone:'primary'})],send:[{from:'adm',to:'ctl',text:'删除 orders'}]},
  {say:'控制器更新元数据，通知各 broker 停止这个 topic 的分区服务。',add:[A('b1','🖥️','broker 1',520,90,{kind:'tag'}),A('b2','🖥️','broker 2',520,250,{kind:'tag'})],send:[{from:'ctl',to:'b1',text:'停止分区'},{from:'ctl',to:'b2',text:'停止分区'}]},
  {say:'之后各 broker 再清理副本的日志文件。',sub:{b1:'清理日志文件',b2:'清理日志文件'},tone:{b1:'ok',b2:'ok'}},
  {say:'前提：delete.topic.enable 打开、有权限、控制器健康。旧版用 ZooKeeper，Kafka 4.x 用 KRaft，别把“删 ZK 节点”当通用步骤。',add:[A('pre','📋','delete.topic.enable · 权限',300,300,{kind:'tag'})]},
  {say:'应用要先停止生产和消费，并关掉自动建 topic，否则删了又被重新创建出来。',bubble:{who:'adm',text:'先停生产者！',tone:'warm'}},
  {say:'记住删除流程。',memo:['控制器改元数据 → 通知停服务','异步清理文件，防自动重建']},
 ]},
};
