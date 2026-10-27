import {A,type Story} from '../story';

// 数据库面试题动画（六）：LRU/LFU、大 key、缓存一致性、Redis 高可用。
export const dbRedisB:Record<string,Story>={
 'q-baae548966245f03':{title:'LRU 和 LFU：淘汰谁',beats:[
  {say:'书架只能放 3 本书，再来一本就得扔一本。扔哪本？',add:[A('shelf','📚','书架（容量 3）',320,70,{kind:'item',tone:'primary'})]},
  {say:'LRU（最近最少使用）：扔掉最久没碰过的那本。适合“最近用过的，很可能马上还会用”的场景。',add:[A('lru','🕰️','LRU：最久没用的走',160,190,{kind:'tag',tone:'ok'})]},
  {say:'LRU 的弱点：有人把全部书一次性翻了一遍（全量扫描），真正常用的书反而被挤掉了。',add:[A('scan','🌊','一次性扫描污染',160,280,{kind:'tag',tone:'bad'})]},
  {say:'LFU（最不经常使用）：扔掉被翻次数最少的那本，热门书更稳。',add:[A('lfu','📈','LFU：用得最少的走',480,190,{kind:'tag',tone:'ok'})]},
  {say:'LFU 的弱点：以前很火、现在没人看的书，次数一直很高赖着不走，所以计数要随时间衰减。',add:[A('old','👴','过时热点要衰减',480,280,{kind:'tag',tone:'warm'})]},
  {say:'Redis 用的是近似实现：LRU 随机采样估计，LFU 用会衰减的近似计数，不维护精确排行榜。选哪个要拿命中率实测。',memo:['LRU：看最近一次访问','LFU：看访问频率']},
 ]},
 'q-5f578456bdbb0143':{title:'大 key：一个 key 拖慢整个 Redis',beats:[
  {say:'Redis 处理命令基本是一个接一个来的。有个 key 特别大：一个 50MB 的字符串，或者有几百万个成员的集合。',add:[A('big','🐘','大 key：500 万成员',320,90,{kind:'item',tone:'bad'}),A('r','🧠','Redis',320,250,{kind:'item',tone:'primary'})]},
  {say:'读写它要传很多数据、序列化很久，这期间后面的命令都在排队，延迟一下子变高；复制、迁移、删除也都很重。',add:[A('q','👥','排队的请求',110,250,{tone:'warm'})],send:[{from:'q',to:'r',text:'等待…',tone:'warm'}],bubble:{who:'q',text:'怎么这么慢？'}},
  {say:'怎么发现：MEMORY USAGE 看单个 key，用 SCAN 渐进地扫描，或者大 key 分析工具。千万别在线上执行 KEYS *。',add:[A('find','🔍','MEMORY USAGE · SCAN',530,170,{kind:'tag',tone:'ok'})]},
  {say:'怎么处理：拆分成多个小 key，限制成员数量，分页读取。',drop:['big'],add:[A('s1','🔑','user:1:part1',200,90,{kind:'tag',tone:'ok'}),A('s2','🔑','user:1:part2',440,90,{kind:'tag',tone:'ok'})],tone:{q:'ok'}},
  {say:'删除时用 UNLINK，把释放内存的工作放到后台；或者对集合分批删除，同时注意后台释放和复制的压力。',add:[A('ul','🗑️','UNLINK 异步删除',530,300,{kind:'tag'})]},
  {say:'记住大 key 的处理。',memo:['会阻塞、拖慢复制和删除','拆分、分页、UNLINK']},
 ]},
 'q-93e8dfebc307c185':{title:'缓存和数据库怎么保持一致',beats:[
  {say:'常用模式 Cache Aside：读的时候先查缓存，没命中就查数据库，再把结果写回缓存。',add:[A('app','🧑‍💻','应用',100,170,{tone:'primary'}),A('c','⚡','缓存',320,80,{kind:'item'}),A('db','🗄️','数据库',320,260,{kind:'item'})],send:[{from:'app',to:'c',text:'读'},{from:'db',to:'c',text:'回填'}]},
  {say:'写的时候：先提交数据库，再删除缓存（不是更新缓存）。下次读会重新加载新值。',send:[{from:'app',to:'db',text:'① 写库'},{from:'app',to:'c',text:'② 删缓存',tone:'warm'}]},
  {say:'但这不是强一致：删缓存可能失败；或者一个慢的读请求，拿着旧值在删除之后才回填，缓存又变旧了。',add:[A('slow','🐢','慢读回填旧值',540,170,{tone:'bad'})],send:[{from:'slow',to:'c',text:'旧值',tone:'bad'}],tone:{c:'bad'}},
  {say:'补救：用事务 outbox 或 CDC（监听 binlog）可靠地触发删除，失败了重试，加上幂等、短 TTL 和定期对账。',add:[A('cdc','📡','binlog / CDC → 删缓存',525,300,{kind:'tag',tone:'ok'})],tone:{c:'ok',slow:'quiet'}},
  {say:'回填旧值可以用版本号校验挡住。“延迟双删”只是缓解，证明不了消除所有竞态。',bubble:{who:'app',text:'缓存只做加速，\n强一致看数据库'}},
  {say:'记住思路。',memo:['先写库，再删缓存','可靠删除 + TTL + 对账']},
 ]},
 'q-117d2cac6f786ddb':{title:'Redis 高可用：主从、哨兵和集群',beats:[
  {say:'只有一台 Redis，挂了服务就停了。第一步：主从复制，从节点保存一份数据副本。',add:[A('m','👑','主节点',320,70,{tone:'primary'}),A('s1','🧑','从节点 1',170,200),A('s2','🧑','从节点 2',470,200)],send:[{from:'m',to:'s1',text:'复制'},{from:'m',to:'s2',text:'复制'}]},
  {say:'第二步：Sentinel 哨兵盯着主节点，主节点挂了，多个哨兵投票达成多数后，把一个从节点提升为新主。',add:[A('sen','🛡️','Sentinel × 3',320,310,{kind:'tag',tone:'warm'})],tone:{m:'bad'},sub:{m:'宕机'}},
  {say:'新主上任，客户端重新连接。',tone:{s1:'ok'},sub:{s1:'新的主节点'},send:[{from:'sen',to:'s1',text:'提升',tone:'ok'}]},
  {say:'注意：复制通常是异步的，切换时最近几条写入可能丢失。WAIT 命令能降低风险，但不能变成强一致。',bubble:{who:'s1',text:'最后几条写入\n我没收到',tone:'warm'}},
  {say:'数据量大时用 Redis Cluster：按 16384 个槽分片到多个主节点，每个主节点再配从节点，可扩容、可故障接管。',add:[A('cl','🧩','Cluster：16384 个槽',110,310,{kind:'tag',tone:'ok'})]},
  {say:'还要跨故障域部署、客户端重试和刷新拓扑、持久化加备份、定期演练。只有一个副本或一个哨兵都不算完整高可用。',memo:['主从复制 + 哨兵切换','数据多用 Cluster 分片']},
 ]},
};
