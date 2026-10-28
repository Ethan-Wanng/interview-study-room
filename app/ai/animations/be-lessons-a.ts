import {A,type LessonStory} from './story';

// 后端通用动画课堂（一）：入门与进阶关卡。
export const beLessonsA:LessonStory[]=[
 ({id:'be-an-sql',level:'be-sql',kind:'basic',icon:'🧮',title:'一条 SQL 的统计之旅',summary:'WHERE、GROUP BY、HAVING 和窗口函数。',beats:[
  {say:'订单表里有成千上万条订单。老板问：“哪些用户已支付的总额超过 1000 元？”',add:[A('t','🗂️','orders 表',110,170,{kind:'item',tone:'primary'}),A('boss','🧑‍💼','老板',540,80)],bubble:{who:'boss',text:'谁买得最多？'}},
  {say:'第一步 WHERE：先把没支付的订单筛掉，只留 status = paid 的行。',add:[A('w','🔍','WHERE status = paid',320,80,{kind:'tag',tone:'warm'})],send:[{from:'t',to:'w'}]},
  {say:'第二步 GROUP BY：按用户分组，用 SUM 算出每个人的总额。',add:[A('g','🧺','GROUP BY user_id',320,180,{kind:'tag',tone:'primary'})],send:[{from:'w',to:'g'}]},
  {say:'第三步 HAVING：分组之后再过滤，只留总额超过 1000 的用户。WHERE 不能用 SUM，HAVING 可以。',add:[A('h','✅','HAVING SUM > 1000',320,280,{kind:'tag',tone:'ok'})],send:[{from:'g',to:'h'},{from:'h',to:'boss',text:'结果',tone:'ok'}]},
  {say:'老板又要“每个用户最近的 2 笔订单”：用窗口函数 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 时间 DESC)，再取前 2。',add:[A('win','🪟','窗口函数：每组前 N',540,280,{kind:'tag'})]},
  {say:'记住执行顺序。',memo:['WHERE → GROUP BY → HAVING','每组前 N 用窗口函数']},
 ]}),
 ({id:'be-an-index',level:'be-index',kind:'basic',icon:'🌲',title:'查一行数据：B+ 树和回表',summary:'从根页到叶子，辅助索引如何回表。',beats:[
  {say:'用户表 1000 万行，按名字查 Tom。先在 name 的辅助索引里找：从根页往下走，只读三四页就到了叶子。',add:[A('root','📑','name 索引：根页',150,70,{kind:'item',tone:'primary'}),A('leaf','🍃','叶子：Tom → id 7',150,190,{kind:'item'})],send:[{from:'root',to:'leaf'}]},
  {say:'辅助索引的叶子里只有 name 和主键 id。要的是整行，只好拿着 id=7 去主键索引再查一次——这就是回表。',add:[A('pk','🌳','主键索引：id 7 → 整行',470,190,{kind:'item',tone:'warm'})],send:[{from:'leaf',to:'pk',text:'回表',tone:'warm'}]},
  {say:'如果只查 id 和 name，辅助索引里就都有，不用回表：覆盖索引。',add:[A('cov','✨','覆盖索引：不用回表',150,310,{kind:'tag',tone:'ok'})]},
  {say:'联合索引 (城市, 名字) 像电话簿，先按城市再按名字排；只按名字查，就用不上这个顺序（最左前缀）。',add:[A('lp','📒','最左前缀',470,310,{kind:'tag'})]},
  {say:'写 SQL 后用 EXPLAIN 看看：type、key、rows，还有 Extra 里的 Using index。',bubble:{who:'pk',text:'EXPLAIN 一下'}},
  {say:'记住索引查询的路径。',memo:['B+ 树：树矮，读盘少','辅助索引 → 回表；覆盖索引免回表']},
 ]}),
 ({id:'be-an-algo',level:'be-algo',kind:'basic',icon:'🧩',title:'LRU 缓存：书桌上的书',summary:'哈希表 + 双向链表实现 O(1) 淘汰。',beats:[
  {say:'书桌只能放 3 本书。最近看的放最上面，桌子满了就把最下面（最久没看）的那本收走——这就是 LRU。',add:[A('desk','📚','书桌（容量 3）',320,70,{kind:'item',tone:'primary'})]},
  {say:'要快速找到某本书，用哈希表：书名 → 它在书堆里的位置。',add:[A('map','🗂️','哈希表：书名 → 节点',130,200,{kind:'item',tone:'ok'})]},
  {say:'书堆用双向链表：拿出中间某一本、放到最上面，都只要 O(1)。',add:[A('list','🚃','双向链表：新 ↔ 旧',510,200,{kind:'item',tone:'ok'})],send:[{from:'map',to:'list',text:'直接定位'}]},
  {say:'Get：哈希表找到节点，把它移到链表头部。Put 新书：放在头部；超过容量就删掉链表尾部，并从哈希表里删掉它。',send:[{from:'list',to:'desk',text:'移到最上面',tone:'ok'}],bubble:{who:'list',text:'尾部那本\n收走'}},
  {say:'这个组合在面试里很常考；Go 可以用 container/list 实现。',memo:['哈希表定位，双向链表排序','访问移到头，满了删尾']},
 ]}),
 ({id:'be-an-tx',level:'be-tx',kind:'basic',icon:'🔒',title:'两个事务同时改一行',summary:'隔离级别、MVCC 和行锁。',beats:[
  {say:'小明的事务和小红的事务，同时操作同一个账户。',add:[A('a','🧑','小明的事务',110,90),A('b','👩','小红的事务',110,260),A('row','💰','账户：余额 100',400,170,{kind:'item',tone:'primary'})]},
  {say:'小红执行 UPDATE 扣款，对这一行加上排他锁，还没提交。',send:[{from:'b',to:'row',text:'UPDATE 加锁',tone:'warm'}],tone:{row:'warm'},sub:{row:'新值 50（未提交）'}},
  {say:'小明普通 SELECT：不用等锁，通过 MVCC 从 undo log 里读到旧版本 100——读不阻塞写。',add:[A('undo','📜','undo log：旧版本 100',400,60,{kind:'tag'})],send:[{from:'undo',to:'a',text:'快照 100',tone:'ok'}]},
  {say:'小明如果也执行 UPDATE（当前读），就要等小红提交或回滚释放锁。',send:[{from:'a',to:'row',text:'UPDATE 等待',tone:'bad'}],bubble:{who:'a',text:'等锁中…'}},
  {say:'小红提交后，redo log 保证断电也不丢；binlog 把这次修改复制给从库。',add:[A('log','📗','redo · binlog',560,300,{kind:'tag',tone:'ok'})],tone:{row:'ok'},sub:{row:'余额 50'}},
  {say:'记住事务的关键机制。',memo:['快照读走 MVCC，不加锁','当前读加锁，写写互斥']},
 ]}),
 ({id:'be-an-redis',level:'be-redis',kind:'basic',icon:'⚡',title:'缓存的三个经典问题',summary:'穿透、击穿、雪崩各自怎么防。',beats:[
  {say:'正常情况：请求先查 Redis，命中直接返回；没命中再查数据库并回填。',add:[A('u','👥','请求',90,170,{tone:'primary'}),A('r','⚡','Redis',320,170,{kind:'item',tone:'ok'}),A('db','🗄️','MySQL',550,170,{kind:'item'})],send:[{from:'u',to:'r'}]},
  {say:'穿透：一直查不存在的数据，缓存永远不命中。用参数校验、缓存空值、布隆过滤器挡住。',add:[A('p','🕳️','穿透 → 布隆过滤器',320,60,{kind:'tag',tone:'warm'})],send:[{from:'u',to:'db',text:'id=-1',tone:'bad'}]},
  {say:'击穿：一个超热的 key 过期，上万请求一起回源。只放一个请求去重建（互斥或 singleflight），或者逻辑过期后台刷新。',add:[A('j','🔥','击穿 → 互斥重建',320,280,{kind:'tag',tone:'warm'})],tone:{db:'warm'}},
  {say:'雪崩：大量 key 同时过期或 Redis 挂了。TTL 加随机、多级缓存、限流降级。',add:[A('x','🌨️','雪崩 → TTL 抖动',550,280,{kind:'tag',tone:'warm'})]},
  {say:'更新数据时：先写数据库，再删缓存，失败要可靠重试。',send:[{from:'db',to:'r',text:'写库后删缓存',tone:'ok'}],tone:{db:'ok'}},
  {say:'记住三个问题。',memo:['穿透：不存在；击穿：热点过期','雪崩：同时过期']},
 ]}),
 ({id:'be-an-linux',level:'be-linux',kind:'basic',icon:'🐧',title:'服务器 CPU 飙到 100% 怎么查',summary:'top、线程、profile，一步步缩小范围。',beats:[
  {say:'告警：一台服务器 CPU 100%，接口全变慢了。',add:[A('srv','🖥️','服务器 CPU 100%',320,70,{kind:'item',tone:'bad'}),A('me','🧑‍💻','你',90,200,{tone:'primary'})]},
  {say:'第一步 top：看是用户态（us）高，还是内核态（sy）、等 I/O（wa）高，找到占 CPU 最多的进程。',add:[A('top','📊','top：us / sy / wa',320,190,{kind:'tag'})],send:[{from:'me',to:'top'}]},
  {say:'第二步 top -H -p 进程号：定位到具体是哪个线程。',add:[A('th','🧵','top -H：定位线程',540,190,{kind:'tag',tone:'warm'})],send:[{from:'top',to:'th'}]},
  {say:'第三步 用 perf 或语言自带的 profiler（Go 用 pprof）找到热点函数：死循环？频繁分配？正则回溯？',add:[A('pp','🔥','pprof / perf 找热点',430,310,{kind:'tag',tone:'ok'})],send:[{from:'th',to:'pp'}]},
  {say:'先保存证据，再限流或扩容止血；修复后用同样的负载验证。还要记住：load 高不一定是 CPU 忙，也可能都在等磁盘。',tone:{srv:'ok'},sub:{srv:'恢复正常'}},
  {say:'记住排查顺序。',memo:['top 分清哪种忙','定位线程，profile 找热点']},
 ]}),
];
