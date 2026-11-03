import type {AiLevel} from '../journey';

// 进阶：MySQL 的日志、复制和分库分表。
export const beLog:AiLevel={id:'be-log',title:'MySQL 日志、主从复制与分库分表',summary:'redo、undo、binlog 各管什么，复制延迟和数据拆分怎么处理',lessons:[
  {title:'这一关学什么：MySQL 靠日志保证不丢、不乱',body:'上一关提到了 redo log、undo log、binlog 三种日志，这一关把它们讲透：各自记录什么、解决什么问题、提交时怎么配合（两阶段提交），以及刷盘参数怎么设。\n然后讲建立在 binlog 之上的主从复制：数据怎么从主库同步到从库，为什么会有延迟、怎么处理。\n最后讲数据量大到单库扛不住时的分库分表：什么时候该拆、按什么拆、拆完以后的唯一 ID 怎么生成。\n其中会带你用 Python 亲手模拟“断电后靠 redo log 恢复”和“雪花算法生成 ID”。'},
  {title:'WAL：先记账，再慢慢改',body:'数据库的数据存放在磁盘的“数据页”里。如果每次提交事务都要把修改过的数据页立刻写回磁盘，会非常慢：一个事务可能改了分散在各处的好多页，每页 16KB，而磁盘的随机写入很慢。\n所以数据库普遍采用 WAL（Write-Ahead Logging，预写日志）：提交时先把“改了什么”顺序追加到一个日志文件里，日志写到磁盘就算提交成功；被修改的数据页先留在内存里，之后再找合适的时机批量写回磁盘。\n这就像饭店老板记账：客人付钱时先在账本上记一笔（很快），晚上再统一整理到总账里。万一中途停电，只要账本还在，就能把没整理的部分补回来。InnoDB 的这本“账本”就是 redo log。'},
  {title:'undo log：记录改之前的样子',body:'undo log（回滚日志）记录的是“修改之前的旧值”：插入了一行，就记“删掉这一行”；把余额从 100 改成 70，就记“余额原来是 100”。\n它有两个用途：\n一、回滚：事务执行到一半失败，或者主动 ROLLBACK，就按 undo log 把修改一条条撤销回去；\n二、MVCC：上一关讲的快照读，要看某一行在“过去某个时刻”的版本，就是顺着 undo log 串起来的版本链往回找的。\n所以事务执行到一半要撤销已做的修改，靠的是 undo log，而不是 redo log。'},
  {title:'redo log：断电后把已提交的修改补回来',body:'redo log（重做日志）是 InnoDB 的物理日志，记录的是“哪个数据页的哪个位置改成了什么”。\n它保证的是持久性：事务提交时 redo log 已经写到磁盘，即使对应的数据页还在内存里没来得及写回、数据库就突然断电了，重启后 InnoDB 会读取 redo log，把这些已提交的修改重新应用到数据页上，数据就不会丢。\nredo log 的大小是固定的，由几个文件组成，循环写入：写到末尾就从头开始。但它不会随便覆盖：只有对应的数据页已经刷到磁盘的那部分日志，才可以被覆盖。如果 redo log 快写满了，而数据页还没刷完，MySQL 会暂停新的写入，先强制刷一批数据页（推进检查点），腾出空间后才继续。'},
  {title:'动手试试：模拟断电后用 redo log 恢复',body:'我们用 Python 写一个极简的模拟：先把修改写进日志，假装数据页还没来得及写就断电了，然后按日志恢复。只有带 COMMIT 标记的事务会被恢复，没提交的修改会被丢弃。\n（真实的 InnoDB 会先把 redo log 全部重放，再用 undo log 回滚没提交的事务，最终效果和这里一样。）',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 redo_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python redo_demo.py（Mac 用 python3 redo_demo.py），对照下面的输出。','把第二次 write_log 的 commit=False 改成 True，再运行，看看恢复后 A 变成了多少。'],expect:'断电！数据页还没来得及写： {\'A\': 100, \'B\': 0}\n重启后按 redo log 恢复： {\'A\': 70, \'B\': 30}\n没提交的修改被丢弃： [(\'A\', 0)]'},code:`disk_pages = {"A": 100, "B": 0}
redo_log = []

def write_log(changes, commit):
    for key, value in changes:
        redo_log.append(("SET", key, value))
    if commit:
        redo_log.append(("COMMIT", None, None))

write_log([("A", 70), ("B", 30)], commit=True)
write_log([("A", 0)], commit=False)
print("断电！数据页还没来得及写：", disk_pages)

pending = []
for op, key, value in redo_log:
    if op == "SET":
        pending.append((key, value))
    else:
        for k, v in pending:
            disk_pages[k] = v
        pending = []
print("重启后按 redo log 恢复：", disk_pages)
print("没提交的修改被丢弃：", pending)`,explain:[{at:'disk_pages = {"A": 100, "B": 0}',text:'模拟磁盘上的数据页：A 账户 100 元，B 账户 0 元。'},{at:'redo_log = []',text:'模拟磁盘上的 redo log，一开始是空的。'},{at:'def write_log(changes, commit):',text:'提交事务时只写日志，不改数据页，这就是 WAL。'},{at:'for key, value in changes:',to:'redo_log.append(("SET", key, value))',text:'每个修改记一条 SET 日志。'},{at:'if commit:',to:'redo_log.append(("COMMIT", None, None))',text:'事务提交时，再写一条 COMMIT 标记。'},{at:'write_log([("A", 70), ("B", 30)], commit=True)',text:'第一个事务：A 转 30 给 B，已提交。'},{at:'write_log([("A", 0)], commit=False)',text:'第二个事务：想把 A 改成 0，还没提交就断电了。'},{at:'print("断电！数据页还没来得及写：", disk_pages)',text:'此时数据页还是原来的样子。'},{at:'pending = []',text:'重启后开始恢复。pending 暂存当前事务的修改。'},{at:'for op, key, value in redo_log:',text:'从头到尾读一遍日志。'},{at:'if op == "SET":',to:'pending.append((key, value))',text:'遇到修改，先暂存起来。'},{at:'else:',to:'pending = []',text:'遇到 COMMIT，说明这个事务提交过，把暂存的修改真正应用到数据页上，然后清空暂存。'},{at:'print("重启后按 redo log 恢复：", disk_pages)',text:'已提交的转账被恢复了：A 70，B 30。'},{at:'print("没提交的修改被丢弃：", pending)',text:'最后剩在暂存里的，就是没等到 COMMIT 的修改，不会被应用。'}]},
  {title:'binlog：给复制和恢复用的“变更记录”',body:'binlog（二进制日志）是 MySQL Server 层写的，和用哪种存储引擎无关。它记录的是逻辑上的数据变更事件，比如“某张表的某一行，从什么值改成了什么值”。\n它和 redo log 的区别：\n一、谁写：redo log 是 InnoDB 写的，binlog 是 Server 层写的；\n二、记什么：redo log 是物理的“哪个页改了什么”，binlog 是逻辑的“哪一行改成了什么”；\n三、怎么写：redo log 固定大小循环写，binlog 按文件一直追加，写满一个就换下一个，旧文件会保留；\n四、做什么用：redo log 用于崩溃恢复，binlog 用于主从复制和按时间点恢复（用某个全量备份加上之后的 binlog，可以把数据恢复到任意时刻）。\nbinlog 有三种格式：STATEMENT 记录 SQL 语句本身，ROW 记录每一行修改前后的值，MIXED 混合使用。现在一般推荐用 ROW，最准确。'},
  {title:'两阶段提交：让 redo log 和 binlog 说法一致',body:'一个事务提交时，redo log 和 binlog 都要写。问题是它们是两个独立的文件，如果写完一个、还没写另一个时突然断电，会怎样？\n先写 redo、没写 binlog 就崩溃：重启后主库靠 redo log 恢复出了这次修改，但 binlog 里没有，从库永远收不到这次修改，主从数据不一致；用 binlog 做的恢复也会少这一笔。\n先写 binlog、没写 redo 就崩溃：从库收到并执行了这次修改，主库重启后却没有这次修改，同样不一致。\n两阶段提交的做法是把提交分成两步：\n第一步 prepare：先写 redo log，并标记为“准备好了”；\n第二步：写 binlog；\n第三步 commit：把 redo log 标记为“已提交”。\n崩溃恢复时：redo 是 commit 状态，直接提交；redo 是 prepare 状态，就去查 binlog 里有没有这个事务，有就提交，没有就回滚。这样两份日志的结论永远一致。'},
  {title:'刷盘参数和“双 1”配置',body:'日志写进文件，并不代表真的落到了磁盘上：操作系统会先把数据放在自己的缓存里，过一会儿才真正写到磁盘。要确保写到磁盘，需要调用 fsync 这样的系统调用，代价比较大。所以 MySQL 提供了两个参数，让你在“安全”和“性能”之间选择：\ninnodb_flush_log_at_trx_commit：设为 1 时每次提交都把 redo log 刷到磁盘，最安全；设为 2 时只写到操作系统缓存，MySQL 崩溃不丢数据，但机器断电可能丢最近 1 秒；设为 0 时每秒刷一次。\nsync_binlog：设为 1 时每次提交都 fsync binlog；设为 N 时每 N 次提交才 fsync 一次；设为 0 时交给操作系统决定。\n两个都设成 1，就是常说的“双 1”配置，持久性最强，代价是每次提交都要等磁盘同步。金融、订单这类不能丢数据的场景一般都用双 1。',code:`SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
SHOW VARIABLES LIKE 'sync_binlog';

SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;`,explain:[{at:'SHOW VARIABLES LIKE \'innodb_flush_log_at_trx_commit\';',text:'查看 redo log 的刷盘策略。'},{at:'SHOW VARIABLES LIKE \'sync_binlog\';',text:'查看 binlog 的刷盘策略。'},{at:'SET GLOBAL innodb_flush_log_at_trx_commit = 1;',text:'每次提交都把 redo log 刷到磁盘。'},{at:'SET GLOBAL sync_binlog = 1;',text:'每次提交都 fsync binlog。两个都是 1 就是“双 1”。SET GLOBAL 重启后会失效，要永久生效需要写进配置文件。'}]},
  {title:'主从复制是怎么工作的',body:'主从复制让一台或多台从库保持和主库一样的数据，可以用来分担读压力、做备份和故障切换。流程是：\n一、主库每次提交事务都写 binlog；\n二、从库有一个 I/O 线程，连接到主库，把主库新产生的 binlog 拉过来，写到自己的 relay log（中继日志）里；\n三、从库的 SQL 线程读取 relay log，把里面的修改在从库上重新执行一遍。\nMySQL 默认是异步复制：主库提交事务时不等从库，写完自己的 binlog 就返回成功。所以从库总会比主库慢一点，这就是“复制延迟”。还有半同步复制：主库提交时至少等一个从库确认收到了 binlog 再返回，更安全但会慢一些。',code:`SHOW REPLICA STATUS\\G`,explain:[{at:'SHOW REPLICA STATUS\\G',text:'在从库上执行，查看复制状态（老版本写作 SHOW SLAVE STATUS）。\\G 表示竖着显示每个字段。重点看 Replica_IO_Running 和 Replica_SQL_Running 是否都是 Yes，以及 Seconds_Behind_Source：从库落后主库大约多少秒。'}]},
  {title:'复制延迟：原因和处理',body:'从库延迟突然变大，常见原因：\n一、大事务：比如一条 SQL 删除或更新了几百万行。主库执行了 10 分钟，从库也要再执行差不多 10 分钟，这期间后面所有的修改都排着队，延迟一下子就上去了；\n二、从库的机器配置比主库差，或者从库上还跑着大量的查询；\n三、从库单线程重放：主库是多个事务并发写入，从库却一个个按顺序重放，跟不上。\n处理办法：\n一、把大事务拆成小批次，比如每次只删 1000 行，循环执行；\n二、开启并行复制，让从库多线程重放；\n三、对“写完马上读”的请求，比如用户刚改完昵称就刷新页面，读请求直接走主库，或者等从库追上主库的某个位置之后再读；\n四、监控 Seconds_Behind_Source，超过阈值就告警，或者暂时把这个从库摘掉不给它分配读请求。'},
  {title:'什么时候才需要分库分表',body:'分库分表会让系统复杂很多：跨库查询、跨库事务、全局 ID、扩容时的数据迁移都要额外处理。所以不是“表一过 500 万行就要拆”，那只是一个流传很广的经验数字，不是规则。要先把简单的办法用完：\n一、优化索引和 SQL；\n二、读写分离，让从库分担读压力；\n三、加缓存；\n四、把很少访问的历史数据（冷数据）归档到别的地方。\n真正需要拆的信号是：单表数据大到索引和查询都很吃力，或者单个数据库的写入能力已经到了上限。\n拆的时候，分片键要选查询最常带、分布均匀、几乎不变的字段。比如订单最常按“我的订单”查，就按 user_id 分片。不带分片键的查询，用冗余表或者搜索引擎解决。扩容（从 4 个分片变成 8 个）需要迁移数据，并做好数据校验。'},
  {title:'全局唯一 ID：雪花算法',body:'分库分表以后，每个分片自己的自增 ID 会互相重复，需要一种能在多台机器上各自生成、又保证全局不重复的 ID。常见方案：\n号段模式：每台服务器一次从数据库领一段号码（比如 1001 到 2000），用完再领下一段；\n雪花算法（Snowflake）：用一个 64 位整数，拼上三部分：时间戳（毫秒，约 41 位）、机器号（10 位）、同一毫秒内的序号（12 位）。不同机器的机器号不同，同一台机器同一毫秒内序号不同，所以不会重复；时间戳在最高位，所以 ID 大致按时间递增，适合做数据库主键。\n雪花算法要注意“时钟回拨”：如果服务器时间被往回调了，可能生成重复的 ID，需要检测并处理。'},
  {title:'动手试试：自己写一个雪花算法',body:'我们用 Python 实现一个简化版雪花算法，连续生成 5 个 ID，检查它们是否都不相同、是否递增，并从 ID 里把机器号解析出来。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 snowflake.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python snowflake.py（Mac 用 python3 snowflake.py），对照下面的输出。','把 print(ids) 加到最后一行，看看生成的 ID 长什么样：它们是一串很长的数字，开头几位相同，因为生成的时间几乎一样。'],expect:'5 个 ID 全部不同： True\n按生成顺序递增： True\n解析出的机器号： 3\nID 不超过 63 位： True'},code:`import time

EPOCH = 1700000000000
MACHINE_ID = 3
last_ms = -1
seq = 0

def next_id():
    global last_ms, seq
    ms = int(time.time() * 1000)
    if ms == last_ms:
        seq = (seq + 1) & 0xFFF
        if seq == 0:
            while ms <= last_ms:
                ms = int(time.time() * 1000)
    else:
        seq = 0
    last_ms = ms
    return ((ms - EPOCH) << 22) | (MACHINE_ID << 12) | seq

ids = [next_id() for _ in range(5)]
print("5 个 ID 全部不同：", len(set(ids)) == 5)
print("按生成顺序递增：", ids == sorted(ids))
print("解析出的机器号：", (ids[0] >> 12) & 0x3FF)
print("ID 不超过 63 位：", ids[0].bit_length() <= 63)`,explain:[{at:'import time',text:'用 time 模块获取当前时间。'},{at:'EPOCH = 1700000000000',text:'自定义的起始时间（毫秒）。时间戳部分存的是“距离这个时间过了多少毫秒”，这样能用得更久。'},{at:'MACHINE_ID = 3',text:'这台机器的编号，0 到 1023 之间，每台机器必须不同。'},{at:'last_ms = -1',to:'seq = 0',text:'记录上一次生成 ID 的毫秒数，和这一毫秒内的序号。'},{at:'def next_id():',to:'global last_ms, seq',text:'生成一个 ID。global 表示要修改外面的两个变量。'},{at:'ms = int(time.time() * 1000)',text:'取当前时间的毫秒数。'},{at:'if ms == last_ms:',to:'seq = (seq + 1) & 0xFFF',text:'还在同一毫秒里，序号加一。& 0xFFF 让它保持在 0 到 4095 之间（12 位）。'},{at:'if seq == 0:',to:'ms = int(time.time() * 1000)',text:'序号用完了（这一毫秒已经生成了 4096 个），就等到下一毫秒。'},{at:'else:',to:'seq = 0',text:'进入了新的一毫秒，序号从 0 开始。'},{at:'last_ms = ms',text:'记住这次的毫秒数。'},{at:'return ((ms - EPOCH) << 22) | (MACHINE_ID << 12) | seq',text:'拼出 ID：时间戳左移 22 位放在最高位，机器号左移 12 位放在中间，序号放在最低 12 位。'},{at:'ids = [next_id() for _ in range(5)]',text:'连续生成 5 个 ID。'},{at:'print("5 个 ID 全部不同：", len(set(ids)) == 5)',text:'放进集合去重后还是 5 个，说明没有重复。'},{at:'print("按生成顺序递增：", ids == sorted(ids))',text:'排序后和原来一样，说明是递增的。'},{at:'print("解析出的机器号：", (ids[0] >> 12) & 0x3FF)',text:'右移 12 位去掉序号，再用 & 0x3FF 取出 10 位机器号，得到 3。'},{at:'print("ID 不超过 63 位：", ids[0].bit_length() <= 63)',text:'最高位留作符号位，所以 ID 是正数，能放进数据库的 BIGINT 字段。'}]}
 ],quiz:[
 {id:'be-log-1',q:'事务执行到一半失败，要撤销已做的修改，靠的是哪种日志？',options:['redo log','undo log','binlog','慢查询日志'],why:['redo log 记录修改后的数据，用于崩溃后重做，不用于撤销。','','binlog 用于复制和时间点恢复，不负责事务内的回滚。','慢查询日志只记录执行慢的 SQL。'],answer:1,explain:'undo log 记录旧值，用于回滚和 MVCC。'},
 {id:'be-log-2',q:'数据库突然断电，重启后把已提交但还没写进数据页的修改补回来，靠的是？',options:['redo log','undo log','binlog','relay log'],why:['','undo log 记录旧值，用于回滚未提交的修改。','binlog 用于复制，崩溃恢复时只用来判断两阶段提交的事务是否完整。','relay log 是从库接收主库 binlog 的中继日志。'],answer:0,explain:'redo log 用于崩溃恢复。',interview:'q-f53de83dacee392c'},
 {id:'be-log-3',type:'multi',q:'关于 binlog，下面哪些说法正确？（多选）',options:['binlog 属于 InnoDB 引擎层','记录的是逻辑层面的变更事件','用于主从复制和时间点恢复','是固定大小、循环写入的文件'],why:['binlog 属于 MySQL Server 层，所有存储引擎都会写；InnoDB 引擎层的是 redo log 和 undo log。','','','循环写入的是 redo log；binlog 按文件追加，写满后切换到新文件。'],answers:[1,2],explain:'循环写的是 redo log；binlog 按文件追加。',interview:'q-f53de83dacee392c'},
 {id:'be-log-4',type:'judge',q:'redo log 写满时，MySQL 会直接覆盖还没刷到磁盘的那部分日志。',answer:false,explain:'未落盘的脏页对应的日志不能覆盖，InnoDB 会加快刷脏页推进 checkpoint，写入可能因此变慢甚至短暂停顿。',interview:'q-c7990f6d0727e5c2'},
 {id:'be-log-5',type:'fill',q:'每次事务提交都把 binlog fsync 到磁盘，需要把 sync_binlog 设为 ____。',accepted:['1'],explain:'0 交给操作系统，N 表示每 N 次提交同步一次。',interview:'q-51bd3b77aa3fb0b1'},
 {id:'be-log-6',q:'用户刚改完昵称，刷新页面却看到旧昵称，读请求走的是从库。最直接的处理是？',options:['提示用户多刷新几次','写后短时间内的读请求走主库','关闭 binlog 停止复制','把主库降级成从库'],why:['多刷新也可能一直读到落后的从库，体验很差。','','关闭 binlog 会让主从复制完全停止。','降级主库会影响整个集群的写入，与这个问题无关。'],answer:1,explain:'这是主从复制延迟导致的“读己之写”问题：写后短时间内读主库，或等从库追上后再读。',interview:'q-8eed302c69b3eb2e'},
 {id:'be-log-7',q:'下面哪个最可能导致从库延迟突然变得很大？',options:['主库执行了更新上千万行的大事务','主库上有大量的只读查询请求','从库开启了并行复制功能','表上定义了主键索引'],why:['','只读查询不产生 binlog，不会增加从库要重放的内容。','并行复制是用来减少延迟的。','有主键能让从库按行重放时快速定位，反而有助于降低延迟。'],answer:0,explain:'大事务在从库上要整体重放，期间后面的变更都在排队。',interview:'q-8eed302c69b3eb2e'},
 {id:'be-log-8',q:'订单表要分库分表，用户最常按“自己的订单”查询，分片键最好选？',options:['订单状态 status','用户 user_id','创建时间的小时数','随机生成的数字'],why:['status 取值很少，数据分布不均，而且状态会变化。','','按小时分片会让同一时段的写入集中在一个分片，也无法按用户查询。','随机分片后按用户查询需要扫描所有分片。'],answer:1,explain:'分片键要经常出现在查询条件中、分布均匀、几乎不变。',interview:'q-cd319686c5f3c235'},
 {id:'be-log-9',type:'judge',q:'表数据量一过 500 万就应该立刻分库分表。',answer:false,explain:'要先确认瓶颈，做索引优化、读写分离、归档等；分库分表会带来跨片查询、事务、迁移等大量复杂度。',interview:'q-cd319686c5f3c235'},
 {id:'be-log-10',type:'short',q:'redo log 和 binlog 为什么需要“两阶段提交”？如果不用会出什么问题？',reference:'两份日志分别属于 InnoDB 和 Server 层，各自写盘。如果先写完 redo 再写 binlog，中间崩溃，主库靠 redo 恢复了这次修改，但 binlog 里没有，从库就少了这条数据；反过来先写 binlog，崩溃后主库没有这次修改，从库却有，主从不一致。两阶段提交先写 redo prepare，再写 binlog，最后 redo commit；恢复时根据 binlog 是否完整决定提交还是回滚，保证两边一致。',points:['两份日志属于不同层，分别写盘','中途崩溃会导致主库和从库数据不一致','prepare → 写 binlog → commit','恢复时按 binlog 是否完整决定提交或回滚'],explain:'这是把“日志”和“复制”串起来的经典题。',interview:'q-f53de83dacee392c'},
]};
