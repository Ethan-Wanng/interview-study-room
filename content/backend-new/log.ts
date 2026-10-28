import type {AiLevel} from '../journey';

// 进阶：MySQL 的日志、复制和分库分表。
export const beLog:AiLevel={id:'be-log',title:'MySQL 日志、主从复制与分库分表',summary:'redo、undo、binlog 各管什么，复制延迟和数据拆分怎么处理',lessons:[
 {title:'三本日志各管一件事',body:'undo log 记录修改前的旧值，用来回滚事务，也给 MVCC 提供旧版本。redo log 是 InnoDB 的物理日志，记录“哪个页改成了什么”，先写日志再慢慢刷数据页（WAL），崩溃后靠它恢复已提交的数据；它是固定大小、循环写的。binlog 是 Server 层的逻辑日志，记录数据变更事件，用于主从复制和按时间点恢复，按文件追加。'},
 {title:'两阶段提交和刷盘',body:'为了让 redo 和 binlog 一致，提交时先写 redo（prepare），再写 binlog，最后把 redo 标记为 commit。innodb_flush_log_at_trx_commit=1 每次提交都把 redo 刷盘；sync_binlog=1 每次提交都 fsync binlog。两个都设成 1（“双 1”）最安全，代价是更多磁盘同步。',code:'-- 查看当前设置\nSHOW VARIABLES LIKE \'innodb_flush_log_at_trx_commit\';\nSHOW VARIABLES LIKE \'sync_binlog\';'},
 {title:'主从复制和延迟',body:'主库写 binlog，从库的 I/O 线程拉取并写入 relay log，SQL 线程重放。默认是异步复制，主库提交不等从库。大事务、从库配置低、单线程重放都会导致延迟。处理：拆小事务、开启并行复制；“写完马上读”的请求走主库，或等从库追上指定位置再读。'},
 {title:'分库分表',body:'单表太大、单库扛不住写入时才考虑拆。先做索引优化、读写分离、归档冷数据。分片键选“查询最常带、分布均匀、几乎不变”的字段，比如订单按 user_id。不带分片键的查询用冗余表或搜索引擎；全局唯一 ID 用号段或雪花算法；扩容要做数据迁移和校验。'},
],quiz:[
 {id:'be-log-1',q:'事务执行到一半失败，要撤销已做的修改，靠的是哪种日志？',options:['redo log','undo log','binlog','慢查询日志'],answer:1,explain:'undo log 记录旧值，用于回滚和 MVCC。'},
 {id:'be-log-2',q:'数据库突然断电，重启后把已提交但还没写进数据页的修改补回来，靠的是？',options:['redo log','undo log','binlog','relay log'],answer:0,explain:'redo log 用于崩溃恢复。',interview:'q-f53de83dacee392c'},
 {id:'be-log-3',type:'multi',q:'关于 binlog，下面哪些说法正确？（多选）',options:['属于 Server 层','记录逻辑变更事件','用于主从复制和时间点恢复','是固定大小循环写的'],answers:[0,1,2],explain:'循环写的是 redo log；binlog 按文件追加。',interview:'q-f53de83dacee392c'},
 {id:'be-log-4',type:'judge',q:'redo log 写满时，MySQL 会直接覆盖还没刷到磁盘的那部分日志。',answer:false,explain:'未落盘的脏页对应的日志不能覆盖，InnoDB 会加快刷脏页推进 checkpoint，写入可能因此变慢甚至短暂停顿。',interview:'q-c7990f6d0727e5c2'},
 {id:'be-log-5',type:'fill',q:'每次事务提交都把 binlog fsync 到磁盘，需要把 sync_binlog 设为 ____。',accepted:['1'],explain:'0 交给操作系统，N 表示每 N 次提交同步一次。',interview:'q-51bd3b77aa3fb0b1'},
 {id:'be-log-6',q:'用户刚改完昵称，刷新页面却看到旧昵称，读请求走的是从库。最直接的处理是？',options:['让用户多刷新几次','写后短时间内的读请求走主库，或等从库追上再读','关闭 binlog','把主库降级成从库'],answer:1,explain:'这是主从复制延迟导致的读己之写问题。',interview:'q-8eed302c69b3eb2e'},
 {id:'be-log-7',q:'下面哪个最可能导致从库延迟突然变得很大？',options:['主库执行了一个更新上千万行的大事务','主库有很多只读查询','从库开启了并行复制','表上有主键'],answer:0,explain:'大事务在从库上要整体重放，期间后面的变更都在排队。',interview:'q-8eed302c69b3eb2e'},
 {id:'be-log-8',q:'订单表要分库分表，用户最常按“自己的订单”查询，分片键最好选？',options:['订单状态 status','user_id','创建时间的小时数','随机数'],answer:1,explain:'分片键要常被查询带上、分布均匀、几乎不变；status 取值太少、会变化。',interview:'q-cd319686c5f3c235'},
 {id:'be-log-9',type:'judge',q:'表数据量一过 500 万就应该立刻分库分表。',answer:false,explain:'要先确认瓶颈，做索引优化、读写分离、归档等；分库分表会带来跨片查询、事务、迁移等大量复杂度。',interview:'q-cd319686c5f3c235'},
 {id:'be-log-10',type:'short',q:'redo log 和 binlog 为什么需要“两阶段提交”？如果不用会出什么问题？',reference:'两份日志分别属于 InnoDB 和 Server 层，各自写盘。如果先写完 redo 再写 binlog，中间崩溃，主库靠 redo 恢复了这次修改，但 binlog 里没有，从库就少了这条数据；反过来先写 binlog，崩溃后主库没有这次修改，从库却有，主从不一致。两阶段提交先写 redo prepare，再写 binlog，最后 redo commit；恢复时根据 binlog 是否完整决定提交还是回滚，保证两边一致。',points:['两份日志属于不同层，分别写盘','中途崩溃会导致主库和从库数据不一致','prepare → 写 binlog → commit','恢复时按 binlog 是否完整决定提交或回滚'],explain:'这是把“日志”和“复制”串起来的经典题。',interview:'q-f53de83dacee392c'},
]};
