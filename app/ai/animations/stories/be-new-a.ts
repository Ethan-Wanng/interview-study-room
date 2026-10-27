import {A,type Story} from '../story';

// 新增后端面试题动画（一）：数据库、微服务、设计模式与算法。
export const beNewA:Record<string,Story>={
 'q-8eed302c69b3eb2e':{title:'主从复制延迟：从库跟不上主库',beats:[
  {say:'主库把 binlog 发给从库，从库的 I/O 线程写进 relay log，SQL 线程再一条条重放。',add:[A('m','👑','主库',110,120,{kind:'item',tone:'primary'}),A('relay','📜','relay log',320,120,{kind:'tag'}),A('s','📋','从库（重放）',530,120,{kind:'item'})],send:[{from:'m',to:'relay',text:'binlog'},{from:'relay',to:'s',text:'重放'}]},
  {say:'主库来了一个大事务，或者从库机器更弱、单线程重放跟不上，从库就落后了。',add:[A('big','🐘','大事务 · 单线程重放',320,250,{kind:'tag',tone:'bad'})],tone:{s:'warm'},sub:{s:'落后 30 秒'}},
  {say:'用户下单后马上查订单，读的是从库，结果“订单不见了”。',add:[A('u','🧑','用户',110,280,{tone:'bad'})],send:[{from:'s',to:'u',text:'查不到订单',tone:'bad'}],bubble:{who:'u',text:'我的订单呢？',tone:'bad'}},
  {say:'发现延迟：Seconds_Behind_Source 只是估算，更可靠的是主库定时写心跳表，从库比对时间。',add:[A('hb','💓','心跳表比对',530,250,{kind:'tag',tone:'ok'})]},
  {say:'处理：拆小大事务，开启并行复制，提升从库配置；刚写完马上要读的请求走主库，或等从库追上指定位置。',tone:{s:'ok',u:'ok'},drop:['big']},
  {say:'记住处理思路。',memo:['拆大事务，开启并行复制','写后立即读走主库']},
 ]},
 'q-cd319686c5f3c235':{title:'分库分表：怎么拆，按什么拆',beats:[
  {say:'订单表涨到 20 亿行。先确认真的需要拆：索引优化、读写分离、归档冷数据都做过了还扛不住，才考虑分库分表。',add:[A('big','🐘','订单表 20 亿行',320,70,{kind:'item',tone:'warm'})]},
  {say:'选分片键：查询最常带上、分布均匀、几乎不变的字段。订单按 user_id 分片，用户查自己的订单只落在一个分片上。',add:[A('key','🔑','分片键：user_id',320,170,{kind:'tag',tone:'primary'}),A('d1','🗄️','库 0',150,280,{kind:'tag'}),A('d2','🗄️','库 1',320,280,{kind:'tag'}),A('d3','🗄️','库 2',490,280,{kind:'tag'})],send:[{from:'key',to:'d1'},{from:'key',to:'d2'},{from:'key',to:'d3'}]},
  {say:'路由方式：哈希取模分布均匀，但扩容要迁移；按时间范围便于归档，但最新的分片是热点。',add:[A('route','🧭','哈希 · 范围 · 映射表',130,170,{kind:'tag'})]},
  {say:'不带分片键的查询（比如商家查订单）：按另一维度建冗余表，或同步到 ES 去查。',add:[A('es','🔎','商家维度：冗余表 / ES',520,170,{kind:'tag',tone:'warm'})]},
  {say:'全局 ID 改用号段或雪花算法；扩容靠双写或 binlog 迁移，切换前做数据校验。',drop:['big'],memo:['先优化，真扛不住再拆','分片键：常查、均匀、不变']},
 ]},
 'q-c90bd2a4838c6555':{title:'Redis 分布式锁的正确姿势',beats:[
  {say:'两个服务实例要抢同一个任务。加锁：SET lock 随机值 NX PX 30000，只有一个能成功，30 秒后自动过期。',add:[A('a','🖥️','实例 A',100,120,{tone:'primary'}),A('b','🖥️','实例 B',100,280),A('lock','🔒','lock = A 的随机值',360,190,{kind:'item',tone:'ok'})],send:[{from:'a',to:'lock',text:'SET NX PX',tone:'ok'},{from:'b',to:'lock',text:'失败',tone:'bad'}]},
  {say:'解锁时必须先确认“值是我设的”再删，并用 Lua 把判断和删除做成一步，否则可能误删别人的锁。',add:[A('lua','📜','Lua：判断 + 删除',545,100,{kind:'tag',tone:'ok'})]},
  {say:'坑一：A 的业务跑了 40 秒，锁 30 秒就过期了，B 抢到锁，两个人同时在临界区里。看门狗续期能缓解，但续期本身也可能卡住。',tone:{a:'warm',b:'warm'},bubble:{who:'b',text:'我也拿到锁了？',tone:'bad'}},
  {say:'坑二：Redis 主从是异步复制，主库挂了切到从库，刚加的锁可能丢了。',add:[A('fail','💥','主从切换锁丢失',555,280,{kind:'tag',tone:'bad'})]},
  {say:'要求严格正确时，加 fencing token：每次加锁拿到递增的版本号，写资源时校验版本，旧的写入被拒绝。或者直接靠数据库唯一约束、乐观锁。',add:[A('ft','🎫','fencing token 版本号',360,320,{kind:'tag',tone:'ok'})]},
  {say:'记住要点。',memo:['NX + 过期 + 随机值 + Lua 解锁','锁会过期会丢，关键处加版本校验']},
 ]},
 'q-e994dda5397d9993':{title:'分布式事务的几种方案',beats:[
  {say:'下单要同时扣库存、扣余额、建订单，分在三个服务三个库里。本地事务管不到了。',add:[A('o','🧾','订单',150,80,{kind:'tag'}),A('s','📦','库存',320,80,{kind:'tag'}),A('p','💰','余额',490,80,{kind:'tag'})]},
  {say:'2PC：协调者先问所有人“能提交吗”，都同意再统一提交。强一致，但锁资源久，协调者挂了大家可能一直卡着。',add:[A('c','🧑‍⚖️','2PC 协调者',320,200,{tone:'warm'})],send:[{from:'c',to:'o',text:'prepare'},{from:'c',to:'s',text:'prepare'},{from:'c',to:'p',text:'prepare'}]},
  {say:'TCC：每个服务提供 Try（冻结余额）、Confirm（确认扣款）、Cancel（解冻）。业务自己写补偿，要处理空回滚、悬挂和幂等。',drop:['c'],add:[A('tcc','🧊','TCC：Try · Confirm · Cancel',150,220,{kind:'item',tone:'primary'})]},
  {say:'Saga：拆成一串本地事务，每步配一个补偿操作；失败就按相反顺序补偿。适合长流程，但中间状态别人看得见。',add:[A('saga','🔗','Saga：逐步执行，失败逆向补偿',490,220,{kind:'item'})]},
  {say:'本地消息表 / outbox：在本地事务里同时写业务数据和一条待发消息，后台可靠投递，下游幂等消费，最终一致。',add:[A('ob','📨','outbox：本地事务 + 可靠投递',320,320,{kind:'item',tone:'ok'})]},
  {say:'选型看一致性要求、能否写补偿、开发成本。很多业务用 outbox 加对账就够了。',memo:['2PC 强一致但阻塞','TCC、Saga 补偿，outbox 最终一致']},
 ]},
 'q-42228e55cc58156f':{title:'服务注册与发现',beats:[
  {say:'订单服务启动了 3 个实例，IP 每次都可能不同。调用方怎么知道该找谁？',add:[A('reg','📇','注册中心',320,80,{kind:'item',tone:'primary'}),A('i1','🖥️','实例 1',150,260,{kind:'tag'}),A('i2','🖥️','实例 2',320,260,{kind:'tag'}),A('i3','🖥️','实例 3',490,260,{kind:'tag'})]},
  {say:'实例启动时把地址注册到注册中心（etcd、Consul、Nacos，或 K8s 的 Service），并靠心跳或租约保持在线。',send:[{from:'i1',to:'reg',text:'注册 + 心跳'},{from:'i2',to:'reg'},{from:'i3',to:'reg'}]},
  {say:'实例 3 挂了，心跳停了，超时后被摘除。',tone:{i3:'bad'},sub:{i3:'心跳超时 → 摘除'}},
  {say:'客户端发现：调用方订阅实例列表，自己做负载均衡。服务端发现：请求先到负载均衡器或网关，由它转发。',add:[A('caller','🧑‍💻','调用方',110,90,{tone:'ok'})],send:[{from:'reg',to:'caller',text:'实例 1、2'}]},
  {say:'注意：实例没准备好前别接流量（就绪检查）；下线时先摘注册再停机；客户端缓存列表，注册中心短暂不可用也能继续调用。',bubble:{who:'reg',text:'我也要高可用'}},
  {say:'记住流程。',memo:['注册 + 心跳续约','客户端发现或服务端发现']},
 ]},
 'q-08815d2a347da9a6':{title:'灰度发布：先让一小部分人试用',beats:[
  {say:'新版本上线，不直接全量替换，而是先让一小部分流量试一试。',add:[A('gw','🚦','网关 / Mesh 分流',140,170,{kind:'item',tone:'primary'}),A('old','📦','旧版本',480,90,{kind:'item'}),A('new','🆕','新版本',480,260,{kind:'item',tone:'warm'})]},
  {say:'先切 1%，可以按比例，也可以按用户 ID、地区，或者只给内部员工。',send:[{from:'gw',to:'old',text:'99%'},{from:'gw',to:'new',text:'1%',tone:'warm'}]},
  {say:'每一步都盯着错误率、延迟分位数、业务指标；超过阈值自动回滚。',add:[A('mon','📊','错误率 · P99 · 业务指标',320,320,{kind:'tag'})]},
  {say:'指标正常，再逐步放大：5%、20%、50%、100%。',send:[{from:'gw',to:'new',text:'50%',tone:'ok'}],tone:{new:'ok'}},
  {say:'新旧版本会同时在线，所以接口、数据库结构、缓存和消息格式都要前后兼容：先加字段再使用，旧字段晚点再删。',bubble:{who:'new',text:'我和旧版本\n要能共存'}},
  {say:'记住灰度要点。',memo:['小流量先试，逐步放量','盯指标能回滚，新旧要兼容']},
 ]},
 'q-41b371208c8a2b18':{title:'观察者模式：一处发布，多处收到',beats:[
  {say:'订单支付成功后，短信、积分、物流都要知道。如果支付代码逐个调用它们，以后每加一个都要改支付代码。',add:[A('pay','💳','支付服务',140,170,{kind:'item',tone:'primary'})]},
  {say:'观察者模式：支付服务只管“发布事件”，谁关心谁订阅，发布方不需要知道有谁在听。',add:[A('bus','📢','事件总线',330,170,{kind:'item',tone:'ok'}),A('a','📱','短信',540,70,{kind:'tag'}),A('b','⭐','积分',540,170,{kind:'tag'}),A('c','🚚','物流',540,270,{kind:'tag'})],send:[{from:'pay',to:'bus',text:'支付成功'},{from:'bus',to:'a'},{from:'bus',to:'b'},{from:'bus',to:'c'}]},
  {say:'Go 里每个订阅者拿到一个 channel；发布时向所有 channel 发送。订阅者列表的增删和遍历要加锁。',add:[A('ch','🔒','订阅列表加锁',330,60,{kind:'tag'})]},
  {say:'某个订阅者处理太慢，会拖住发布方：用带缓冲的 channel，满了就丢弃或交给独立 goroutine。',tone:{c:'warm'},bubble:{who:'c',text:'我太慢了…',tone:'warm'}},
  {say:'取消订阅时关闭 channel 并移出列表，避免 goroutine 泄漏。跨进程的发布订阅交给 MQ。',memo:['发布方不知道订阅者','慢订阅者别拖住发布方']},
 ]},
 'q-c7bff07bdc346cf3':{title:'用小顶堆找最大的 K 个数',beats:[
  {say:'100 万个数里找最大的 3 个。全排序要 O(n log n)，太浪费。',add:[A('data','🔢','数据流：5 1 9 3 7 8 …',320,60,{kind:'item',tone:'primary'})]},
  {say:'维护一个只能放 3 个数的小顶堆，堆顶是堆里最小的那个——它是“门槛”。',add:[A('heap','⛰️','小顶堆（容量 3）',320,190,{kind:'item',tone:'ok'})],sub:{heap:'[1 5 9]，门槛 1'}},
  {say:'来了 3：比门槛 1 大，替换堆顶并调整，门槛变成 3。来了 7：比门槛 3 大，再替换。',send:[{from:'data',to:'heap',text:'3 > 1，替换'}],sub:{heap:'[5 7 9]，门槛 5'}},
  {say:'来了一个比门槛小的数，直接跳过。遍历完，堆里就是最大的 K 个。',bubble:{who:'heap',text:'比门槛小的\n不用进来'}},
  {say:'时间 O(n log K)，空间 O(K)，适合数据流。只要第 K 大的一个数，也可以用快速选择，平均 O(n)。Go 用 container/heap。',memo:['大小为 K 的小顶堆','比堆顶大才替换，O(n log K)']},
 ]},
 'q-b8e7fa67643486dd':{title:'滑动窗口：无重复字符的最长子串',beats:[
  {say:'字符串 "abcabcbb"，找不含重复字符的最长子串。用左右两个指针夹出一个窗口。',add:[A('s','🔤','a b c a b c b b',320,60,{kind:'item',tone:'primary'}),A('win','🪟','窗口：abc',320,180,{kind:'tag',tone:'ok'})]},
  {say:'右指针每次向右扩一个字符。读到第二个 a 时，窗口里已经有 a 了。',add:[A('r','👉','右指针',530,180,{tone:'warm'})],bubble:{who:'r',text:'a 重复了！'}},
  {say:'左指针直接跳到上一个 a 的下一位，窗口变成 "bca"，依然没有重复。用 map 记录每个字符最后出现的位置。',add:[A('l','👈','左指针',110,180,{tone:'primary'}),A('map','🗂️','map：字符 → 最后位置',320,300,{kind:'tag'})],sub:{win:'窗口：bca'}},
  {say:'每一步更新最长长度，这里答案是 3。每个字符最多被左右指针各访问一次，O(n)。',sub:{win:'最长 = 3'},tone:{win:'ok'}},
  {say:'注意左指针只能往右走，别因为旧的下标往回退；中文先转 []rune 再处理。',memo:['右扩窗口，遇重复左跳','map 记最后位置，O(n)']},
 ]},
};
