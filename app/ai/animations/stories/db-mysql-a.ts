import {A,type Story} from '../story';

// 数据库面试题动画（一）：面试准备、MySQL 日志。
export const dbMysqlA:Record<string,Story>={
 'q-29a390724db3a232':{title:'为什么数据库题几乎必考',beats:[
  {say:'一家网店：订单、库存、账户余额，这些最重要的数据都存在数据库里。',add:[A('db','🗄️','数据库',320,170,{kind:'item',tone:'primary'}),A('o','🧾','订单',110,80,{kind:'tag'}),A('s','📦','库存',110,170,{kind:'tag'}),A('m','💰','余额',110,260,{kind:'tag'})],send:[{from:'o',to:'db'},{from:'s',to:'db'},{from:'m',to:'db'}]},
  {say:'面试官不会只问概念，而是从真实问题追问：“接口为什么慢？”',add:[A('iv','🧑‍💼','面试官',540,90)],bubble:{who:'iv',text:'接口为什么慢？'}},
  {say:'“库存怎么保证不超卖？”“提交成功了，为什么数据还会丢？”',bubble:{who:'iv',text:'怎么不超卖？\n为什么会丢数据？'}},
  {say:'这些问题一次能考到：数据建模、SQL、并发控制、性能和故障恢复。',add:[A('sk','🧩','建模 · SQL · 并发 · 性能 · 恢复',320,300,{kind:'tag',tone:'warm'})]},
  {say:'所以准备时，要把原理和自己真实做过的场景对应起来，说得出“我当时怎么查、怎么改”。',add:[A('me','🧑‍💻','你',540,260,{tone:'ok'})],bubble:{who:'me',text:'我上次慢查询是这样定位的…',tone:'ok'}},
  {say:'记住为什么必考。',memo:['核心数据都在数据库','原理要连上真实场景']},
 ]},
 'q-b724a77c6e49ca6e':{title:'数据库面试怎么准备：一条路线图',beats:[
  {say:'把数据库知识想成一条闯关路线，一站一站往前走。',add:[A('me','🧑‍🎓','你',70,170,{tone:'primary'})]},
  {say:'第一站：表结构和 SQL。第二站：索引和执行计划。',add:[A('s1','📐','表结构 · SQL',200,80,{kind:'tag'}),A('s2','🌲','索引 · EXPLAIN',380,80,{kind:'tag'})],move:{me:[200,170]}},
  {say:'第三站：事务、MVCC 和锁。第四站：日志和主从复制。',add:[A('s3','🔒','事务 · MVCC · 锁',200,260,{kind:'tag'}),A('s4','📜','日志 · 复制',380,260,{kind:'tag'})],move:{me:[380,170]}},
  {say:'第五站：缓存一致性。第六站：故障排查。',add:[A('s5','⚡','缓存一致性',560,80,{kind:'tag'}),A('s6','🩺','故障排查',560,260,{kind:'tag'})],move:{me:[560,170]}},
  {say:'每个知识点都要能说清：作用、原理、适用场景和限制。最好用小表亲手验证，比如开两个事务看锁等待，用 EXPLAIN ANALYZE 对比加索引前后。',tone:{me:'ok'},bubble:{who:'me',text:'亲手试过才记得牢',tone:'ok'}},
  {say:'MySQL 题目一般以 8.0 / 8.4 的 InnoDB 为背景，不要把不同存储引擎的结论混在一起。',memo:['SQL → 索引 → 事务锁','日志 → 缓存 → 排查']},
 ]},
 'q-f53de83dacee392c':{title:'redo log 和 binlog：两本不同的账本',beats:[
  {say:'MySQL 有两层：上面是 Server 层，下面是 InnoDB 存储引擎。两本日志分别住在不同的层。',add:[A('srv','🏢','Server 层',320,70,{kind:'item'}),A('inno','⚙️','InnoDB 引擎',320,260,{kind:'item',tone:'primary'})]},
  {say:'redo log 是 InnoDB 的账本，记的是“哪个数据页改成了什么”。规则是先写日志，再改磁盘上的数据页（预写日志）。',add:[A('redo','📗','redo log：数据页改动',110,260,{kind:'item',tone:'ok'})],send:[{from:'inno',to:'redo'}]},
  {say:'它用来崩溃恢复：突然断电后，重放 redo 就能把已提交的修改补回来。空间是循环复用的。',sub:{redo:'崩溃恢复 · 循环写'}},
  {say:'binlog 是 Server 层的账本，记录逻辑事件，比如“这一行从 A 改成了 B”，按文件追加写。',add:[A('bin','📘','binlog：逻辑变更',540,70,{kind:'item',tone:'warm'})],send:[{from:'srv',to:'bin'}]},
  {say:'它用来主从复制和按时间点恢复：从库照着 binlog 重放一遍。',add:[A('rep','🖥️','从库',540,260,{kind:'item'})],send:[{from:'bin',to:'rep',text:'复制'}],sub:{bin:'复制 · 时间点恢复'}},
  {say:'两本账要一致：提交时用内部“两阶段提交”协调，防止一边认为提交了、一边认为没提交。别忘了还有第三本 undo log，负责回滚。',note:'redo prepare → 写 binlog → redo commit'},
  {say:'记住区别。',memo:['redo：InnoDB，物理页，崩溃恢复','binlog：Server，逻辑事件，复制']},
 ]},
 'q-c7990f6d0727e5c2':{title:'redo log 写满了会怎样',beats:[
  {say:'redo log 像一个环形跑道：写指针在前面写新日志，checkpoint 在后面，标记“这之前的修改已经落盘，可以覆盖”。',add:[A('ring','⭕','redo 环形空间',320,170,{kind:'item',tone:'primary'}),A('w','✍️','写指针',140,90,{kind:'tag'}),A('cp','🚩','checkpoint',500,90,{kind:'tag'})]},
  {say:'写入很猛时，写指针越跑越快，快要追上 checkpoint 了。',add:[A('biz','🛒','大促写入',140,280,{tone:'warm'})],send:[{from:'biz',to:'w',text:'疯狂写'}],sub:{ring:'可用空间越来越少'},tone:{ring:'warm'}},
  {say:'还被用于恢复的旧日志不能覆盖。InnoDB 只能加快把脏页刷到磁盘，推着 checkpoint 往前走。',add:[A('disk','💽','刷脏页到磁盘',500,280,{kind:'item'})],send:[{from:'ring',to:'disk',text:'加速刷页'}]},
  {say:'如果磁盘刷得比日志产生得慢，前台写入就得等：接口延迟抖动，甚至短暂卡住。',tone:{biz:'bad',ring:'bad'},bubble:{who:'biz',text:'怎么卡住了？',tone:'bad'}},
  {say:'排查看 checkpoint age、redo 容量、写入峰值和磁盘延迟。MySQL 8.0.30 起用 innodb_redo_log_capacity 调容量；优化大事务和 I/O 才是根本。',tone:{ring:'ok'},sub:{ring:'加大容量只能缓冲峰值'}},
  {say:'记住写满的后果。',memo:['不能覆盖未落盘的日志','刷页跟不上 → 写入等待']},
 ]},
 'q-51bd3b77aa3fb0b1':{title:'binlog 什么时候真正落盘',beats:[
  {say:'事务执行时，binlog 事件先放在这个事务自己的缓存里。',add:[A('tx','🧾','事务',90,170,{tone:'primary'}),A('cache','🧺','事务 binlog 缓存',280,170,{kind:'item'})],send:[{from:'tx',to:'cache'}]},
  {say:'提交时写进 binlog 文件——但这一步通常只是写到操作系统的页缓存，还在内存里。',add:[A('os','🧠','操作系统缓存',470,90,{kind:'item',tone:'warm'})],send:[{from:'cache',to:'os',text:'write'}]},
  {say:'只有 fsync 之后才真正持久化到磁盘。什么时候 fsync，由 sync_binlog 决定。',add:[A('disk','💽','磁盘',470,270,{kind:'item',tone:'ok'})],send:[{from:'os',to:'disk',text:'fsync'}]},
  {say:'sync_binlog=1：每个提交组都同步一次，最安全；组提交让多个事务共享一次同步，减轻开销。',add:[A('v1','1️⃣','=1 每组都刷',140,300,{kind:'tag',tone:'ok'})]},
  {say:'=0：交给操作系统决定，断电可能丢一部分；=N：每累计 N 个提交组同步一次。',add:[A('v0','0️⃣','=0 交给系统',300,320,{kind:'tag',tone:'warm'})],tone:{os:'bad'}},
  {say:'强持久性场景一般“双 1”：sync_binlog=1 加 innodb_flush_log_at_trx_commit=1，还要确认磁盘真的兑现了刷盘。',memo:['write 到缓存 ≠ 落盘','sync_binlog 决定 fsync 时机']},
 ]},
 'q-c67968a5590c5998':{title:'MySQL 8.0 为什么删掉了查询缓存',beats:[
  {say:'旧的查询缓存：把一条 SELECT 的完整结果存起来，下次一模一样的 SQL 直接返回。',add:[A('q','🔍','SELECT * FROM goods…',125,90,{kind:'item'}),A('qc','🗃️','查询缓存',360,90,{kind:'item',tone:'primary'})],send:[{from:'q',to:'qc',text:'命中！',tone:'ok'}]},
  {say:'听起来很美，问题是：表里只要有一行被更新，这张表相关的所有缓存结果都得作废。',add:[A('w','✏️','UPDATE goods',110,260,{kind:'item',tone:'warm'})],send:[{from:'w',to:'qc',text:'全部失效',tone:'bad'}],tone:{qc:'bad'}},
  {say:'读写混合、高并发时，缓存刚建好就被清掉，还要加全局锁维护，命中的好处被开销抵消，延迟还忽高忽低。',bubble:{who:'qc',text:'刚存好又被清…',tone:'bad'}},
  {say:'所以 MySQL 5.7.20 宣布弃用，8.0 直接移除。',sub:{qc:'8.0 已移除'},tone:{qc:'quiet'}},
  {say:'注意：Buffer Pool 还在！它缓存的是数据页和索引页，不是查询结果。',add:[A('bp','🧠','Buffer Pool（还在）',490,260,{kind:'item',tone:'ok'})]},
  {say:'需要缓存结果，可以在应用层按业务粒度用 Redis，但要自己设计过期和一致性。',memo:['表一更新，缓存全失效','高并发下得不偿失']},
 ]},
};
