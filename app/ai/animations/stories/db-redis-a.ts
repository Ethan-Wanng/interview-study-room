import {A,type Story} from '../story';

// 数据库面试题动画（五）：Redis 持久化、缓存三兄弟、过期与淘汰。
export const dbRedisA:Record<string,Story>={
 'q-69f69b18e3ca037a':{title:'Redis 持久化：拍快照和记流水账',beats:[
  {say:'Redis 数据都在内存里，一断电就没了。持久化有两种思路：拍快照（RDB）和记流水账（AOF）。',add:[A('r','🧠','Redis 内存',320,70,{kind:'item',tone:'primary'})]},
  {say:'RDB：执行 BGSAVE 时 fork 一个子进程，把某一时刻的全部数据写成快照文件，父进程继续服务。',add:[A('child','👶','子进程',140,190),A('rdb','📸','RDB 快照',140,300,{kind:'tag',tone:'ok'})],send:[{from:'r',to:'child',text:'fork'},{from:'child',to:'rdb'}]},
  {say:'快照恢复很快；但两次快照之间的修改，宕机就丢了。写时复制还会额外占内存。',sub:{rdb:'恢复快，可能丢一段'}},
  {say:'AOF：每个写命令都追加到日志。everysec 每秒刷一次盘，最多丢约 1 秒；always 每次都刷，更慢；no 交给系统。',add:[A('aof','📝','AOF 日志',500,300,{kind:'tag',tone:'warm'})],send:[{from:'r',to:'aof',text:'SET / INCR …'}],sub:{aof:'everysec ≈ 丢 1 秒'}},
  {say:'日志会越来越长，AOF 重写把历史命令压缩成最终状态；Redis 7 起是多文件 AOF，还可以用“RDB 开头 + AOF 增量”的混合持久化。',add:[A('mix','🧩','混合持久化',500,190,{kind:'tag',tone:'ok'})]},
  {say:'选型看能接受丢多少数据（RPO）、恢复要多快、磁盘和 fork 峰值。主从复制不能代替备份。',memo:['RDB：快照，恢复快','AOF：记命令，丢得少']},
 ]},
 'q-5380e13be164d77c':{title:'缓存穿透、击穿、雪崩',beats:[
  {say:'正常情况：请求先查缓存，没命中再查数据库并写回缓存。数据库躲在缓存后面。',add:[A('u','👥','请求',90,170,{tone:'primary'}),A('c','⚡','Redis 缓存',320,170,{kind:'item',tone:'ok'}),A('db','🗄️','数据库',550,170,{kind:'item'})],send:[{from:'u',to:'c'}]},
  {say:'穿透：有人一直查根本不存在的数据（比如 id=-1），缓存永远不命中，全打到数据库。',add:[A('p','🕳️','穿透：查不存在的数据',320,50,{kind:'tag',tone:'bad'})],send:[{from:'u',to:'db',text:'id=-1',tone:'bad'}]},
  {say:'防穿透：参数校验，把“查不到”也缓存一小会儿（空值短 TTL），或用布隆过滤器提前拦住。',sub:{p:'校验 · 空值缓存 · 布隆过滤器'},tone:{p:'ok'}},
  {say:'击穿：某个超级热点 key 正好过期，一瞬间成千上万请求一起去数据库重建它。',add:[A('j','🔥','击穿：热点 key 过期',320,290,{kind:'tag',tone:'bad'})],tone:{db:'bad'}},
  {say:'防击穿：只让一个请求去重建（互斥锁或 singleflight），其他人等结果；或者逻辑过期，后台悄悄刷新。',sub:{j:'互斥重建 · 逻辑过期'},tone:{j:'ok',db:'base'}},
  {say:'雪崩：大量 key 同一时间过期，或整个缓存集群挂了。防法：TTL 加随机抖动、多级缓存、限流降级、缓存高可用。',add:[A('x','🌨️','雪崩：TTL 加随机',550,300,{kind:'tag',tone:'warm'})]},
  {say:'记住三兄弟。',memo:['穿透：不存在 → 布隆、空值','击穿：热点 → 互斥；雪崩：同时 → 打散']},
 ]},
 'q-f0bec2c563e570d6':{title:'过期删除和内存淘汰：两回事',beats:[
  {say:'Redis 里有两种“删数据”的机制，触发原因完全不同。',add:[A('r','🧠','Redis',320,170,{kind:'item',tone:'primary'})]},
  {say:'过期删除：给 key 设了 TTL，时间到了就该失效。它由时间驱动。',add:[A('ttl','⏰','过期删除：TTL 到了',140,70,{kind:'tag',tone:'warm'})],send:[{from:'ttl',to:'r'}]},
  {say:'内存淘汰：内存用到 maxmemory 上限了，得腾地方。它由内存压力驱动——没过期的 key 也可能被淘汰。',add:[A('max','📦','内存淘汰：满了',500,70,{kind:'tag',tone:'bad'})],send:[{from:'max',to:'r'}]},
  {say:'淘汰策略有：noeviction 不淘汰（写入报错）；allkeys-lru / lfu / random 从所有 key 里挑；volatile-* 只从设了过期时间的 key 里挑；volatile-ttl 挑最快过期的。',add:[A('pol','📋','noeviction · allkeys-* · volatile-*',320,300,{kind:'item'})]},
  {say:'注意：用 volatile 策略但没有设置过期时间的 key 时，可能一个都淘汰不掉。',bubble:{who:'r',text:'没得可删，\n写入报 OOM',tone:'bad'}},
  {say:'记住区别。',memo:['过期删除：时间到了','内存淘汰：内存满了']},
 ]},
 'q-eb490c6677302d5f':{title:'过期的 key 会立刻被删吗',beats:[
  {say:'设置了 10 秒过期的 key，10 秒一到，内存会马上释放吗？不一定。',add:[A('k','🔑','session:42（已过期）',320,90,{kind:'item',tone:'warm'})]},
  {say:'方式一 惰性删除：有人访问它时，先检查是否过期，过期了就删掉并返回“不存在”。',add:[A('u','🧑','访问者',100,90)],send:[{from:'u',to:'k',text:'GET'}],bubble:{who:'k',text:'我过期了，删掉'}},
  {say:'方式二 定期删除：后台定时随机抽查一批设了过期时间的 key，删掉过期的，每次有时间预算，不会一直扫。',add:[A('bg','🧹','后台定期抽查',540,90)],send:[{from:'bg',to:'k',text:'抽查'}]},
  {say:'所以过期但还没被清理的 key 可能暂时占着内存；不过普通读取绝不会把它当有效值返回。',add:[A('mem','📦','暂时占用内存',320,260,{kind:'tag',tone:'warm'})]},
  {say:'大量 key 同一时刻过期，会造成清理压力和回源压力，所以 TTL 要打散。系统时钟异常也会影响过期。',memo:['惰性删除 + 定期抽查','过期 ≠ 立刻释放内存']},
 ]},
 'q-673bae355c0f16fd':{title:'Redis 内存满了会怎样',beats:[
  {say:'Redis 配了 maxmemory，现在内存快满了。',add:[A('r','🧠','Redis：98%',320,90,{kind:'item',tone:'warm'})]},
  {say:'有写命令要增加内存时，Redis 按淘汰策略挑一些 key 删掉，腾出空间。',add:[A('w','✏️','SET 新数据',100,90,{kind:'tag'}),A('ev','🗑️','按策略淘汰',540,90,{kind:'tag'})],send:[{from:'w',to:'r'},{from:'r',to:'ev'}]},
  {say:'如果策略是 noeviction，或者没有能淘汰的 key，增加内存的写命令会直接返回 OOM 错误；读和删除一般还能用。',tone:{r:'bad'},bubble:{who:'r',text:'OOM command not allowed',tone:'bad'}},
  {say:'更隐蔽的坑：maxmemory 不是进程内存的硬上限。复制缓冲、客户端缓冲、内存碎片、fork 时的写时复制都会额外占内存。',add:[A('extra','📈','缓冲 · 碎片 · fork',320,250,{kind:'tag',tone:'warm'})]},
  {say:'超出机器或容器的限制时，进程可能被系统直接杀掉（OOM kill）。',add:[A('os','💀','系统 OOM kill',540,250,{kind:'tag',tone:'bad'})]},
  {say:'要预留余量，监控 used_memory、RSS、evicted_keys 和写入错误，不要只盯命中率。',memo:['满了按策略淘汰','淘汰不了 → 写入报错']},
 ]},
 'q-efbd531288490262':{title:'持久化时，过期的 key 怎么处理',beats:[
  {say:'有一个已经过期、但还没被清理的 key。持久化时会怎样？要分几个环节看。',add:[A('k','🔑','过期 key',320,60,{kind:'item',tone:'warm'})]},
  {say:'生成 RDB 时：过期的 key 会被过滤掉，不写进快照。',add:[A('rdb','📸','生成 RDB',120,170,{kind:'tag',tone:'ok'})],send:[{from:'k',to:'rdb',text:'跳过',tone:'ok'}]},
  {say:'主节点加载 RDB 时：按当前时间检查，已经过期的不载入。副本加载另有复制相关的规则。',add:[A('load','📥','加载 RDB',320,170,{kind:'tag'})]},
  {say:'AOF 运行时：主节点删除过期 key 时，会往 AOF 和副本传播一条删除命令；AOF 重写也不保留已过期的 key。',add:[A('aof','📝','AOF：传播 DEL',520,170,{kind:'tag',tone:'ok'})],send:[{from:'k',to:'aof',text:'DEL'}]},
  {say:'过期时间保存的是绝对时间点，所以 Redis 停机期间 TTL 也在走，不会“暂停后重新计时”。',add:[A('abs','🕰️','绝对时间：停机也在走',320,300,{kind:'tag',tone:'warm'})]},
  {say:'记住分环节回答。',memo:['RDB 生成和加载都会过滤','AOF 传播删除，重写不保留']},
 ]},
};
