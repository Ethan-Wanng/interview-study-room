import type {AiLevel} from '../journey';

// 专家：Kafka 可靠性、Docker 与 Kubernetes。
export const beKafka:AiLevel={id:'be-kafka',title:'Kafka 可靠性：不丢、不重、有序',summary:'副本与 ISR、位移提交、幂等与事务、重平衡和积压处理',lessons:[
  {title:'这一关学什么：把 Kafka 的可靠性配置搞清楚',body:'上一关讲了 Kafka 的基本结构和“不丢、有序、不重复”的大思路。这一关深入到具体的机制和配置：\n一、副本和 ISR：哪些副本算“跟上了”，acks 到底在等谁；\n二、生产端、broker、消费端分别要怎么配，才能尽量不丢消息；\n三、幂等生产者和 Kafka 事务能解决什么、解决不了什么；\n四、顺序性的几个隐藏陷阱；\n五、重平衡的原因、影响和优化方式。\n其中会用两个小模拟，让你亲眼看到 acks=1 怎么丢消息、两种位移提交方式分别导致重复还是丢失。'},
  {title:'ISR：和 leader 保持同步的副本',body:'每个分区有一个 leader 副本和若干 follower 副本，follower 不停地从 leader 拉取新消息。但 follower 可能因为网络慢、机器负载高而落后。\nISR（In-Sync Replicas，同步副本集合）就是“当前跟得上 leader 的副本”，包括 leader 自己。如果某个 follower 超过 replica.lag.time.max.ms（默认 30 秒）都没有追上 leader 的最新进度，就会被踢出 ISR；追上之后再重新加入。\nISR 很重要，因为：leader 挂了之后，新的 leader 只会从 ISR 里选，这样才能保证新 leader 上有所有已经确认过的消息；acks=all 等待的，也正是 ISR 里所有副本的确认。'},
  {title:'acks：发送成功到底意味着什么',body:'生产者的 acks 参数决定了“leader 收到消息后，要等到什么程度才告诉生产者成功”：\nacks=0：发出去就算成功，不等任何确认。最快，但消息可能根本没到达，丢了也不知道；\nacks=1：leader 写入自己的日志就返回成功，不等 follower。如果 leader 刚确认完、follower 还没来得及复制，leader 就宕机了，新选出来的 leader 上没有这条消息，消息就丢了；\nacks=all（也写作 -1）：要等 ISR 里所有副本都写入了才返回成功。这时即使 leader 宕机，新 leader 也一定有这条消息。\n要保证不丢消息，生产者必须用 acks=all。'},
  {title:'动手试试：acks=1 是怎么丢消息的',body:'我们用 Python 做一个极简的模拟：一个 leader 和两个 follower。acks=1 时 leader 写入就返回成功；acks=all 时要等 follower 也写入。然后让 leader 宕机、选出新 leader，看看消息还在不在。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 acks_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python acks_demo.py（Mac 用 python3 acks_demo.py），对照下面的输出。','想一想：如果 acks=all，但 ISR 里只剩 leader 自己一个副本，会发生什么？下一张卡片会讲到。'],expect:'acks=1：发送成功，leader 上有： [\'订单42已支付\']\n   leader 宕机，f1 当选新 leader，上面有： []\nacks=all：发送成功，leader 上有： [\'订单42已支付\']\n   leader 宕机，f1 当选新 leader，上面有： [\'订单42已支付\']'},code:`def produce(acks, msg, leader, followers):
    leader.append(msg)
    if acks == "all":
        for f in followers:
            f.append(msg)
    return "成功"

for acks in ["1", "all"]:
    leader, f1, f2 = [], [], []
    result = produce(acks, "订单42已支付", leader, [f1, f2])
    print(f"acks={acks}：发送{result}，leader 上有：", leader)
    new_leader = f1
    print("   leader 宕机，f1 当选新 leader，上面有：", new_leader)`,explain:[{at:'def produce(acks, msg, leader, followers):',text:'模拟发送一条消息：每个副本用一个列表表示。'},{at:'leader.append(msg)',text:'leader 先写入。'},{at:'if acks == "all":',to:'f.append(msg)',text:'acks=all 时，要等所有同步副本都写入（真实情况是 follower 拉取复制后确认）才返回。'},{at:'return "成功"',text:'两种情况下，生产者都收到了“成功”。'},{at:'for acks in ["1", "all"]:',text:'分别用两种配置做同样的实验。'},{at:'leader, f1, f2 = [], [], []',text:'三个空的副本。'},{at:'result = produce(acks, "订单42已支付", leader, [f1, f2])',to:'print(f"acks={acks}：发送{result}，leader 上有：", leader)',text:'发送一条消息，打印结果和 leader 上的内容。'},{at:'new_leader = f1',text:'leader 宕机了，从 follower 里选出 f1 当新 leader。'},{at:'print("   leader 宕机，f1 当选新 leader，上面有：", new_leader)',text:'acks=1 时新 leader 上是空的：生产者明明收到了“成功”，消息却丢了。acks=all 时消息还在。'}]},
  {title:'broker 端：副本数、最少同步副本和选主',body:'光有 acks=all 还不够。如果 ISR 里只剩下 leader 自己，“等 ISR 里所有副本确认”就等于只等 leader 自己，和 acks=1 没有区别。所以 broker 端还要配：\nreplication.factor=3：每个分区 3 个副本，放在 3 台不同的机器上；\nmin.insync.replicas=2：ISR 里至少要有 2 个副本，acks=all 的写入才会被接受。如果 ISR 少于 2 个，生产者会收到 NotEnoughReplicas 错误，宁可暂时写不进去，也不冒丢数据的风险。3 个副本配 2，允许坏掉 1 台机器还能正常写入；\nunclean.leader.election.enable=false：禁止“不干净的选主”。如果 ISR 里的副本全挂了，只剩一个落后很多的副本，开启这个选项会让它当选 leader，服务能更快恢复，但它没有的那些消息就永远丢了。为了不丢数据，应该关闭它，宁可等 ISR 里的副本恢复。',code:`acks=all
enable.idempotence=true
retries=2147483647

replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false`,explain:[{at:'acks=all',text:'生产者：等 ISR 里所有副本确认。'},{at:'enable.idempotence=true',text:'生产者：开启幂等，重试不会产生重复消息（下一张卡片讲原理）。新版本客户端默认就是开启的。'},{at:'retries=2147483647',text:'生产者：发送失败时一直重试（配合 delivery.timeout.ms 控制总的超时时间）。'},{at:'replication.factor=3',text:'topic：每个分区 3 个副本。'},{at:'min.insync.replicas=2',text:'topic 或 broker：至少 2 个同步副本才接受 acks=all 的写入。'},{at:'unclean.leader.election.enable=false',text:'broker：不允许落后的副本当选 leader，防止丢数据。'}]},
  {title:'生产端：别忘了检查发送结果',body:'生产者的 send 通常是异步的：调用后消息先放进本地的缓冲区，由后台线程攒批发送，send 本身马上就返回了。如果发送最终失败了（比如重试次数用完、超时），而你的代码从来没有检查发送结果，这条消息就悄无声息地丢了。\n所以一定要处理发送的结果：在回调函数里检查是否出错，出错了要记录日志、告警，或者把消息存起来稍后补发。程序退出前也要调用 flush，把缓冲区里还没发出去的消息发完。\n另一个常见的坑：在数据库事务里先发了 Kafka 消息，然后事务回滚了，消息却已经发出去了；或者反过来，事务提交了、消息没发出去。这种“数据库和消息要一致”的场景，常用“本地消息表”或“事务发件箱”（Outbox）模式：把要发的消息和业务数据写在同一个数据库事务里，再由一个后台任务把消息表里的记录可靠地发到 Kafka。',code:`def on_delivery(err, msg):
    if err is not None:
        log.error("发送失败，稍后补发：%s", err)
        save_for_retry(msg)

producer.produce("order-events", key=order_id, value=payload, on_delivery=on_delivery)
producer.poll(0)

producer.flush(10)`,explain:[{at:'def on_delivery(err, msg):',text:'发送结果的回调函数（这里以 Python 的 confluent-kafka 库为例），每条消息最终成功或失败时都会调用它。'},{at:'if err is not None:',to:'save_for_retry(msg)',text:'发送失败了：记录日志，并把消息存起来，之后补发，而不是默默忽略。'},{at:'producer.produce("order-events", key=order_id, value=payload, on_delivery=on_delivery)',text:'异步发送：用订单号做 key 保证同一订单进同一分区，并传入回调。'},{at:'producer.poll(0)',text:'让客户端处理已经完成的发送结果，触发回调。'},{at:'producer.flush(10)',text:'程序退出前调用：最多等 10 秒，把缓冲区里所有消息都发完。'}]},
  {title:'幂等生产者：去掉“重试”造成的重复',body:'生产者发出一条消息，broker 已经写入了，但返回的确认在网络上丢了。生产者以为失败了，于是重试，broker 就收到了两条一样的消息。\n开启幂等生产者（enable.idempotence=true）后：每个生产者会分到一个唯一的编号（PID），它发往每个分区的每条消息都带一个递增的序列号。broker 记住每个“生产者 + 分区”最后收到的序列号，收到重复的序列号就直接丢弃，不会写两次。\n但幂等生产者的作用范围很有限：它只能消除“同一个生产者在同一次运行中，因为重试”产生的重复。生产者重启后会分到新的 PID；消费端没提交位移就崩溃导致的重复消费，它也完全管不了。所以“开了幂等生产者，消费端就不会处理到重复消息”是错误的。'},
  {title:'Kafka 事务：只管 Kafka 内部',body:'Kafka 还支持事务：一个生产者可以把“发往多个分区的多条消息”和“消费位移的提交”放在一个事务里，要么全部生效，要么全部不生效。消费者设置 isolation.level=read_committed 后，只会读到已经提交的事务里的消息。\n它主要用于“从 Kafka 读 → 处理 → 写回 Kafka”的流处理场景，可以做到这个链路上的“恰好一次”。\n但它覆盖不到 Kafka 之外：如果你的消费者是去修改 MySQL 里的数据、调用别人的接口，Kafka 事务没法把这些操作和位移提交绑在一起。这类场景仍然要按“至少一次”来设计，在业务侧做幂等：用唯一事件 ID 加数据库唯一约束，并且把去重记录和业务修改放在同一个数据库事务里。'},
  {title:'位移提交：处理完再提交',body:'消费者默认会自动提交位移（enable.auto.commit=true）：每隔一段时间，自动把 poll 拿到的位移提交上去，不管这些消息是不是已经处理完了。如果消息还在处理中、位移已经被自动提交了，这时程序崩溃，这些消息就丢了。\n要保证不丢，应该关闭自动提交，在消息真正处理成功之后，再手动提交位移。\n再强调一次位移的含义：提交位移 42，表示“42 之前的消息都处理完了，下一次从 42 开始读”，而不是“42 这条处理完了”。',code:`consumer = Consumer({
    "bootstrap.servers": "kafka:9092",
    "group.id": "points-service",
    "enable.auto.commit": False,
})
consumer.subscribe(["order-events"])
while True:
    msg = consumer.poll(1.0)
    if msg is None or msg.error():
        continue
    handle(msg)
    consumer.commit(message=msg)`,explain:[{at:'consumer = Consumer({',text:'创建消费者（以 Python 的 confluent-kafka 库为例）。'},{at:'"bootstrap.servers": "kafka:9092",',text:'Kafka 集群的地址。'},{at:'"group.id": "points-service",',text:'所属的消费组：积分服务。'},{at:'"enable.auto.commit": False,',text:'关闭自动提交，由我们自己在处理完后提交。'},{at:'consumer.subscribe(["order-events"])',text:'订阅订单事件 topic。'},{at:'while True:',to:'msg = consumer.poll(1.0)',text:'不停地拉取消息，每次最多等 1 秒。'},{at:'if msg is None or msg.error():',to:'continue',text:'没拉到消息或者出错了，继续下一轮。'},{at:'handle(msg)',text:'处理消息，比如给用户加积分。处理要做到幂等，因为这条消息可能被重复投递。'},{at:'consumer.commit(message=msg)',text:'处理成功后再提交位移（提交的是这条消息的位移加一）。如果在 handle 之后、commit 之前崩溃，重启后这条消息会再处理一次，幂等保证结果不变。'}]},
  {title:'动手试试：两种提交顺序，一个重复一个丢',body:'模拟一个消费者处理 4 条消息，处理到第 3 条（m2）时崩溃，然后重启，从已提交的位移继续消费。对比“先处理再提交”和“先提交再处理”，看看最终每条消息被处理了几次。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 offset_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python offset_demo.py（Mac 用 python3 offset_demo.py），对照下面的输出。','把两处 offset == 2 都改成 offset == 0，再运行，看看崩溃发生在第一条消息时的结果。'],expect:'先处理再提交 ： [\'m0\', \'m1\', \'m2\', \'m2\', \'m3\']\n先提交再处理 ： [\'m0\', \'m1\', \'m3\']'},code:`messages = ["m0", "m1", "m2", "m3"]

def run(mode):
    committed, processed = 0, []
    for offset in range(len(messages)):
        if mode == "先提交再处理":
            committed = offset + 1
            if offset == 2:
                break
            processed.append(messages[offset])
        else:
            processed.append(messages[offset])
            if offset == 2:
                break
            committed = offset + 1
    for offset in range(committed, len(messages)):
        processed.append(messages[offset])
    return processed

for mode in ["先处理再提交", "先提交再处理"]:
    print(mode, "：", run(mode))`,explain:[{at:'messages = ["m0", "m1", "m2", "m3"]',text:'分区里的 4 条消息，位移分别是 0 到 3。'},{at:'def run(mode):',text:'按指定的提交方式模拟一次“消费 → 崩溃 → 重启”。'},{at:'committed, processed = 0, []',text:'committed 是已提交的位移，processed 记录实际处理过的消息（重复处理会出现两次）。'},{at:'for offset in range(len(messages)):',text:'第一次运行，逐条消费。'},{at:'if mode == "先提交再处理":',to:'committed = offset + 1',text:'先提交：拿到消息就先把位移提交上去。'},{at:'if offset == 2:',to:'break',text:'处理 m2 之前崩溃了。可是位移已经提交到 3。'},{at:'processed.append(messages[offset])',text:'处理消息。'},{at:'else:',to:'processed.append(messages[offset])',text:'先处理再提交：先处理消息。'},{at:'if offset == 2:',to:'break',text:'m2 已经处理完了，在提交位移之前崩溃了，已提交的位移还是 2。'},{at:'committed = offset + 1',text:'处理成功后才提交。'},{at:'for offset in range(committed, len(messages)):',to:'processed.append(messages[offset])',text:'重启后，从已提交的位移继续消费，把剩下的都处理完。'},{at:'return processed',text:'返回所有被处理过的消息。'},{at:'for mode in ["先处理再提交", "先提交再处理"]:',to:'print(mode, "：", run(mode))',text:'先处理再提交：m2 被处理了两次（重复，但没丢）；先提交再处理：m2 一次都没处理（丢了）。'}]},
  {title:'顺序性的隐藏陷阱',body:'同一个订单号做 key、发到同一个分区，就能保证有序，但还有几个容易忽略的地方会打乱顺序：\n一、增加分区：key 到分区的映射是“哈希值对分区数取余”，分区数一变，同一个 key 可能被分到新的分区。扩容前发到旧分区的消息还没消费完，新消息已经在新分区里被别的消费者处理了。所以对顺序敏感的 topic，要一开始就规划好足够的分区数；\n二、生产者重试：没开幂等时，如果允许同时有多批消息在路上（max.in.flight.requests.per.connection 大于 1），第一批失败重试、第二批先成功了，顺序就反了。开启幂等后，Kafka 在最多 5 个并发请求时仍能保证顺序；\n三、失败重试主题：一条消息处理失败，被转到一个“重试 topic”稍后再处理，同一个订单后面的消息却已经被正常处理了，顺序就乱了。对顺序要求严格的业务，失败时应该原地重试，或者让同一个 key 后面的消息也一起等待；\n四、消费端多线程：把同一个分区的消息交给多个线程并行处理，也会乱序。可以按 key 再分配到固定的线程上。'},
  {title:'重平衡：原因、影响和优化',body:'消费组需要重新分配分区（重平衡）的常见原因：\n一、有消费者加入或退出，比如发布新版本时逐台重启；\n二、消费者心跳超时（session.timeout.ms），比如长时间 GC 或者网络抖动；\n三、处理一批消息太久，两次 poll 的间隔超过了 max.poll.interval.ms；\n四、订阅的 topic 分区数变化了。\n传统的 eager（急切）方式：重平衡时，组里所有消费者都要先交出全部分区、停止消费，等分配完成后再重新开始，影响很大。\n优化方式：\n一、协作式（cooperative）重平衡：只把需要变动的那部分分区转移给别人，其他分区照常消费，影响小得多；\n二、静态成员（设置 group.instance.id）：消费者重启后用同一个身份重新加入，在超时时间内回来就不会触发重平衡，适合滚动发布；\n三、减少每批拉取的消息数，处理慢的任务异步执行，避免超过 max.poll.interval.ms。'},
  {title:'案例：消费组 lag 持续上涨',body:'监控发现某个消费组的 lag（落后的消息数）持续上涨，可以这样处理：\n一、先判断原因：生产速率是不是突然变大了（活动、上游故障导致重发）？消费者是不是有实例挂了、或者一直在重平衡（看消费者日志）？下游的数据库或接口是不是变慢了，拖慢了每条消息的处理时间？\n二、针对原因处理：恢复故障的消费者；优化慢的处理逻辑（批量写入、减少不必要的下游调用）；\n三、扩容：在分区数的范围内增加消费者实例。如果消费者数已经等于分区数，再加消费者也只会闲着。这时可以增加分区（注意上一张卡片讲的顺序问题），或者临时把积压的消息转发到一个分区更多的新 topic，用更多的消费者并行处理；\n四、保护下游：消费速度提上来后，下游的数据库和接口压力也会骤增，要控制好并发，必要时限流；\n五、事后：补充 lag 告警，并评估分区数和消费者数是否够用。'}
 ],quiz:[
 {id:'be-kafka-1',q:'acks=all 时，生产者等待谁的确认？',options:['只等 leader 写入成功','ISR 中所有副本都写入','集群里的所有 broker','不等待任何确认'],why:['只等 leader 是 acks=1 的行为，leader 宕机且未同步时会丢消息。','','ISR 之外的落后副本不参与确认，也不是所有 broker 都存有该分区。','不等待确认是 acks=0。'],answer:1,explain:'acks=all 等 ISR 中的副本都确认，再配合 min.insync.replicas 规定最少要有几个副本在 ISR 中。',interview:'q-8651521ae8627b69'},
 {id:'be-kafka-2',type:'multi',q:'为了尽量不丢消息，下面哪些配置是合理的？（多选）',options:['生产者设置 acks=all','min.insync.replicas=2，副本数 3','生产者开启重试和幂等','消费者处理成功后再提交位移'],why:['','','',''],answers:[0,1,2,3],explain:'不丢消息需要三端配合：生产者 acks=all + 重试 + 幂等；Broker 多副本 + min.insync.replicas，并禁止不干净选主；消费者处理成功后再提交位移。',interview:'q-64d6c9192640528c'},
 {id:'be-kafka-3',type:'judge',q:'开启了幂等生产者，消费端就不会处理到重复消息。',answer:false,explain:'幂等生产者只消除发送重试造成的重复；消费端崩溃重放仍会重复，业务要幂等。',interview:'q-fbd8a4dce2890044'},
 {id:'be-kafka-4',q:'“给用户加 10 积分”的消息可能被重复消费，最可靠的去重方式是？',options:['用内存 map 记录处理过的消息','事件 ID 去重和加积分放在同一事务','每条消息都故意处理两次','关闭生产者和消费者的重试'],why:['内存 map 在重启或多实例时会丢失，无法可靠去重。','','重复处理会让积分加两次，正是要避免的问题。','关闭重试会导致消息丢失，而且网络抖动时仍可能重复。'],answer:1,explain:'同一事务保证“去重记录”和“业务修改”同时成功或同时失败，唯一约束兜底并发重复。',interview:'q-81c178be884a95ad'},
 {id:'be-kafka-5',q:'订单 42 的“创建、支付、发货”消息必须按顺序处理，生产时应该？',options:['每条消息随机选择分区','以订单号为 key，进同一分区','每条消息发到一个新 topic','多开分区并行消费以加速'],why:['随机分区会让同一订单的消息落到不同分区，无法保证顺序。','','不同 topic 之间没有顺序保证。','并行消费不同分区会打乱同一订单的处理顺序。'],answer:1,explain:'Kafka 只保证同一分区内的消息有序，所以同一订单的消息要用相同的 key 发送。',interview:'q-f46b7545e229dd20'},
 {id:'be-kafka-6',type:'fill',q:'消费者处理一批消息的时间超过 max.____.interval.ms，会被认为失联，触发重平衡。',accepted:['poll'],explain:'处理慢时应减小批量或优化处理，而不是一味调大这个参数。',interview:'q-9b6c6aae2bfba860'},
 {id:'be-kafka-7',q:'提交位移 42 的含义是？',options:['第 42 条消息已经处理完','下一次从第 42 条开始读','删除分区里的前 42 条','第 42 号分区已经消费完'],why:['提交的是“下一条要读的位置”，表示 0～41 已经处理完。','','提交位移不会删除消息，消息按保留策略清理。','位移是分区内的位置，不是分区编号。'],answer:1,explain:'提交的是“下一条要读的位置”。',interview:'q-051a5cf2e2d57304'},
 {id:'be-kafka-8',q:'topic 有 6 个分区，消费组里已有 6 个消费者，lag 还在涨，再加 4 个消费者会怎样？',options:['消费速度提升约 66%','多出的 4 个消费者闲着','分区数自动扩到 10 个','每条消息被重复消费 4 次'],why:['同组内一个分区只分给一个消费者，6 个分区最多 6 个消费者在工作。','','分区数需要手动修改，不会随消费者数量自动增加。','同一消费组内每条消息只会分给一个消费者。'],answer:1,explain:'消费组的并行度上限是分区数；需要更高吞吐时要增加分区，或优化单条消息的处理速度。',interview:'q-d52b9b98efc875aa'},
 {id:'be-kafka-9',type:'judge',q:'协作式（cooperative）重平衡只转移需要变化的分区，比 eager 方式全员停下来影响更小。',answer:true,explain:'eager 需要所有成员先放下全部分区再重新分配。',interview:'q-fdd9d1567fb96ff8'},
 {id:'be-kafka-10',type:'short',q:'监控发现某个消费组 lag 持续上涨，你会怎么处理？',reference:'先看原因：是生产量突然暴涨、消费者实例挂了或频繁重平衡、某个分区是热点，还是下游数据库/接口变慢。止血：恢复故障消费者，优化批处理和外部 I/O，在分区数范围内扩消费者，同时保护下游不被压垮；毒消息转入重试或死信队列。必要时延长保留期防止消息过期丢失。长期：评估分区数、热点 key 和容量规划。',points:['先定位：生产、消费者还是下游','扩消费者不超过分区数','保护下游，隔离毒消息','延长保留期，做容量规划'],explain:'积压是结果，要先找到原因。',interview:'q-d52b9b98efc875aa'},
]};

export const beCloud:AiLevel={id:'be-cloud',title:'容器与 Kubernetes',summary:'Docker 的隔离原理、镜像分层，K8s 的调度、探针和发布',lessons:[
  {title:'这一关学什么：程序是怎么被“装箱”和“托管”的',body:'现在大部分后端服务都是打包成容器镜像，再交给 Kubernetes（简称 K8s）去运行和管理的。\n这一关讲：\n一、容器和虚拟机有什么不同，Docker 靠哪些 Linux 内核机制实现隔离；\n二、镜像为什么是一层层的，Dockerfile 怎么写才能构建得快、镜像小；\n三、K8s 的核心思想“声明期望状态”，以及它的主要组件；\n四、执行 kubectl apply 之后，到容器真正跑起来，中间发生了什么；\n五、滚动更新、探针的正确配置，以及 Pod 一直崩溃时怎么排查。'},
  {title:'容器不是虚拟机',body:'虚拟机：在物理机上用虚拟化软件模拟出一整台“计算机”，里面装一个完整的操作系统（有自己的内核），再在上面跑程序。隔离很彻底，但每台虚拟机都要启动一个完整的系统，占用几百 MB 到几 GB 内存，启动要几十秒。\n容器：本质上只是宿主机上的一个普通进程，只是被“隔离”了起来，让它以为自己独占了一台机器。所有容器共享宿主机的操作系统内核，不需要启动新的系统，所以启动只要几秒甚至更快，资源开销也很小，一台机器可以跑几十上百个容器。\n这也是它们最本质的区别：虚拟机有自己的内核，容器共享宿主机的内核。代价是容器的隔离性不如虚拟机，一个内核漏洞可能影响到同一台机器上的所有容器。'},
  {title:'Docker 靠什么实现隔离',body:'容器的隔离是靠 Linux 内核的几个机制组合出来的：\nnamespaces（命名空间）：隔离“看到的东西”。PID 命名空间让容器里只看到自己的进程，自己的主进程是 1 号；网络命名空间让容器有自己独立的网卡、IP 和端口；挂载命名空间让容器有自己的文件系统视图；还有主机名、用户等命名空间；\ncgroups（控制组）：限制“能用多少资源”，比如最多用 2 个 CPU 核、1GB 内存。超过内存限制，容器里的进程会被 OOM 杀掉；\ncapabilities 和 seccomp：收紧权限。即使容器里以 root 身份运行，也只给它一部分特权，并禁止调用危险的系统调用。\n另外，Docker 本身主要负责镜像的构建和管理、提供命令行工具，真正创建和运行容器的工作，交给底层的 containerd 和 runc 来完成。K8s 现在也是直接调用 containerd 这样的容器运行时。'},
  {title:'镜像分层和可写层',body:'镜像不是一个大文件，而是由一层层只读的“层”叠起来的。Dockerfile 里的每条主要指令（比如 RUN、COPY）都会产生一层，每层只记录相对于下面一层的文件变化。\n分层的好处：多个镜像可以共享相同的底层，比如很多镜像都基于同一个基础镜像，这个基础镜像在机器上只需要存一份、下载一次。\n启动容器时，会在镜像最上面加一层薄薄的“可写层”，容器运行时修改或新建的文件都写在这一层。删除容器时，可写层也随之删除，里面的数据就没了。\n所以数据库这类需要持久保存的数据，绝不能只写在容器的可写层里，而要放在卷（Volume）上：卷是独立于容器生命周期的存储，容器删了、重建了，数据还在。'},
  {title:'写一个好的 Dockerfile',body:'构建镜像时，Docker 会缓存每一层：如果某一步的指令和它依赖的文件都没变，就直接复用缓存，不用重新执行。一旦某一层变了，它后面的所有层都要重新构建。\n所以要把变化少的步骤放在前面：先只复制依赖清单（Go 的 go.mod 和 go.sum）并下载依赖，再复制全部代码去编译。这样平时只改了代码、依赖没变时，耗时的下载依赖步骤直接用缓存，构建快很多。\n多阶段构建：第一阶段用带完整编译工具的大镜像编译程序；第二阶段换一个极小的基础镜像，只把编译好的可执行文件复制过去。最终的镜像只有几 MB 到几十 MB，没有编译器和源代码，更小也更安全。',code:`FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app ./cmd/server

FROM gcr.io/distroless/base
COPY --from=build /app /app
ENTRYPOINT ["/app"]`,explain:[{at:'FROM golang:1.26 AS build',text:'第一阶段：以官方 Go 镜像为基础，给这个阶段起名叫 build。'},{at:'WORKDIR /src',text:'设置工作目录，后面的命令都在 /src 里执行。'},{at:'COPY go.mod go.sum ./',text:'先只复制依赖清单。'},{at:'RUN go mod download',text:'下载依赖，单独成为一层。只要 go.mod 和 go.sum 没变，以后构建都直接用缓存。'},{at:'COPY . .',text:'再复制全部源代码。改了代码只会让这一层和后面的层重新构建。'},{at:'RUN go build -o /app ./cmd/server',text:'编译出可执行文件 /app。'},{at:'FROM gcr.io/distroless/base',text:'第二阶段：换成一个极小的基础镜像，里面连 shell 都没有，攻击面很小。'},{at:'COPY --from=build /app /app',text:'只从 build 阶段复制编译好的程序过来，编译工具和源代码都不会进入最终镜像。'},{at:'ENTRYPOINT ["/app"]',text:'容器启动时运行这个程序。'}]},
  {title:'动手试试：构建并运行一个镜像',body:'这个练习需要先装好 Docker Desktop（docker.com 下载）。我们把前面 Go 进阶里写过的小 Web 服务打包成镜像，在容器里运行，再用浏览器访问它。不会安装或者遇到报错，可以点右下角的“问 AI”，让 AI 老师一步步带你做。',practice:{steps:['新建文件夹 hello-docker，在里面运行 go mod init hello，并创建 main.go，内容用 Go 进阶“工程实战”那一关里的 /hello 小服务。','把这张卡片的 Dockerfile 复制进去，并把最后一行 RUN go build 的路径 ./cmd/server 改成 .（一个点，表示当前目录）。','运行 docker build -t hello:v1 . 构建镜像，第一次会下载基础镜像，需要等一会儿。','运行 docker run --rm -p 8080:8080 hello:v1，然后用浏览器打开 http://localhost:8080/hello?name=小明。','再改一下 main.go 里的问候语，重新 docker build，注意观察输出里哪些步骤显示 CACHED（用了缓存）。'],expect:'你好，小明'},code:`docker build -t hello:v1 .
docker images hello
docker run --rm -p 8080:8080 hello:v1`,explain:[{at:'docker build -t hello:v1 .',text:'用当前目录（.）的 Dockerfile 构建镜像，起名叫 hello，版本标签是 v1。'},{at:'docker images hello',text:'查看构建好的镜像有多大。多阶段构建的结果通常只有二三十 MB。'},{at:'docker run --rm -p 8080:8080 hello:v1',text:'运行容器：-p 把本机的 8080 端口映射到容器的 8080 端口，--rm 表示容器停止后自动删除。按 Ctrl+C 停止。'}]},
  {title:'K8s 的核心思想：声明期望状态',body:'传统的运维方式是“命令式”的：你一步步下命令，在这台机器上启动一个程序，那台机器上停掉一个。机器挂了，得有人发现并手动处理。\nK8s 是“声明式”的：你只描述你想要的结果，比如“我要这个服务有 3 个副本在运行，每个用 1 个 CPU”，写进一个 YAML 文件提交给 K8s。K8s 里有各种“控制器”，它们不停地循环做同一件事：对比“期望状态”和“实际状态”，发现不一致就调整，让实际状态向期望靠拢。这个循环叫“调谐”（reconcile）。\n所以 Pod 挂了、节点宕机了，控制器会发现“现在只有 2 个，期望是 3 个”，自动在别的节点上补一个，这就是 K8s 的“自愈”。你想扩容，只要把期望副本数改成 5。'},
  {title:'动手试试：模拟一个控制器的调谐循环',body:'我们用 Python 模拟一个最简单的副本控制器：它只做一件事，让 Pod 的数量等于期望的副本数。看看节点宕机、扩容、缩容时，它分别做了什么。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 reconcile.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python reconcile.py（Mac 用 python3 reconcile.py），对照下面的输出。','在最后再加两行：desired = 4 和 reconcile()，预测一下会新建哪几个 Pod，再运行验证。'],expect:'初始： [\'web-1\', \'web-2\', \'web-3\']\nweb-2 所在的节点宕机了： [\'web-1\', \'web-3\']\n  补一个 Pod： web-4\n把期望副本数改成 5：\n  补一个 Pod： web-5\n  补一个 Pod： web-6\n再改成 2：\n  删掉多余的 Pod： web-6\n  删掉多余的 Pod： web-5\n  删掉多余的 Pod： web-4\n最终： [\'web-1\', \'web-3\']'},code:`desired = 3
pods = ["web-1", "web-2", "web-3"]
next_id = 4

def reconcile():
    global next_id
    while len(pods) < desired:
        pods.append(f"web-{next_id}")
        print("  补一个 Pod：", pods[-1])
        next_id += 1
    while len(pods) > desired:
        print("  删掉多余的 Pod：", pods.pop())

print("初始：", pods)
pods.remove("web-2")
print("web-2 所在的节点宕机了：", pods)
reconcile()
desired = 5
print("把期望副本数改成 5：")
reconcile()
desired = 2
print("再改成 2：")
reconcile()
print("最终：", pods)`,explain:[{at:'desired = 3',text:'期望状态：3 个副本。这就是你在 YAML 里写的 replicas: 3。'},{at:'pods = ["web-1", "web-2", "web-3"]',text:'实际状态：现在正在运行的 Pod。'},{at:'next_id = 4',text:'新建 Pod 时用的编号。'},{at:'def reconcile():',to:'global next_id',text:'调谐函数：对比期望和实际，并做调整。真实的控制器会一直循环调用它。'},{at:'while len(pods) < desired:',to:'next_id += 1',text:'实际比期望少，就新建 Pod，直到数量够了。'},{at:'while len(pods) > desired:',to:'print("  删掉多余的 Pod：", pods.pop())',text:'实际比期望多，就删掉多余的。'},{at:'print("初始：", pods)',text:'一开始 3 个 Pod 都在。'},{at:'pods.remove("web-2")',to:'print("web-2 所在的节点宕机了：", pods)',text:'模拟一个节点宕机，web-2 没了。没有任何人手动处理。'},{at:'reconcile()',text:'控制器发现只有 2 个，自动补了一个 web-4。这就是自愈。'},{at:'desired = 5',to:'reconcile()',text:'扩容：只修改期望状态，控制器自动补出 2 个。'},{at:'desired = 2',to:'reconcile()',text:'缩容：同样只改期望，控制器删掉多余的 3 个。'},{at:'print("最终：", pods)',text:'最后剩下 2 个，正好等于期望。'}]},
  {title:'K8s 的主要组件',body:'K8s 集群分成控制面（大脑）和工作节点（干活的机器）：\nAPI Server：整个集群唯一的入口。kubectl 命令、各个组件之间的交互都通过它，它负责认证（你是谁）、鉴权（你能做什么）和校验请求；\netcd：一个分布式的键值数据库，集群的所有状态（有哪些 Deployment、Pod、配置）最终都保存在这里。只有 API Server 直接读写它；\nscheduler（调度器）：给新创建、还没有分配节点的 Pod 选一个合适的节点，考虑节点剩余的 CPU 和内存、亲和性规则等；\ncontroller-manager：运行各种控制器，比如 Deployment 控制器、ReplicaSet 控制器，负责调谐；\nkubelet：运行在每个工作节点上，负责在本机启动、停止容器，执行探针，并把状态汇报给 API Server；\nkube-proxy：运行在每个节点上，负责把访问 Service 的流量转发到后端的 Pod。'},
  {title:'kubectl apply 之后发生了什么',body:'执行 kubectl apply -f deployment.yaml 创建一个 3 副本的 Deployment，到容器真正跑起来，大致经过这些步骤：\n一、kubectl 把 YAML 发给 API Server，API Server 认证、鉴权、校验通过后，把 Deployment 对象保存到 etcd；\n二、Deployment 控制器发现有了新的 Deployment，创建一个对应的 ReplicaSet；\n三、ReplicaSet 控制器发现期望 3 个 Pod、实际 0 个，于是创建 3 个 Pod 对象（这时它们还没有被分配到任何节点）；\n四、scheduler 发现这些还没有节点的 Pod，为每个选一个合适的节点，把选择结果写回 API Server；\n五、对应节点上的 kubelet 发现有 Pod 分配给了自己，调用容器运行时（比如 containerd）拉取镜像、创建并启动容器；\n六、kubelet 执行探针，Pod 就绪后，Service 开始把流量转发给它。\n注意整个过程中，各个组件之间并不直接互相调用，而是都通过 API Server“关注”自己关心的对象有没有变化，各司其职。'},
  {title:'Deployment 和 Service',body:'Deployment：描述一个无状态服务应该怎么运行：用哪个镜像、几个副本、要多少资源。修改镜像版本后，它会做“滚动更新”：逐个用新版本的 Pod 替换旧的，每次只替换一部分，新 Pod 就绪了才继续替换下一批，整个过程服务不中断。新版本有问题时，可以一条命令回滚到上一个版本。\nService：Pod 会被重建、IP 会变，调用方不能直接记 Pod 的 IP。Service 提供一个稳定的名字和虚拟 IP，自动把请求负载均衡到当前所有“就绪”的 Pod 上。',code:`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: hello:v2
          resources:
            requests:
              cpu: 500m
              memory: 256Mi
            limits:
              memory: 512Mi`,explain:[{at:'apiVersion: apps/v1',to:'kind: Deployment',text:'这是一个 Deployment 对象，属于 apps/v1 这个 API 版本。'},{at:'metadata:',to:'name: web',text:'名字叫 web。'},{at:'spec:',to:'replicas: 3',text:'期望状态：运行 3 个副本。'},{at:'selector:',to:'app: web',text:'这个 Deployment 管理哪些 Pod：带有标签 app=web 的那些。'},{at:'template:',to:'app: web',text:'Pod 模板：新建的每个 Pod 都按这个模板创建，并打上 app=web 标签。'},{at:'spec:',to:'containers:',text:'Pod 里运行的容器列表。'},{at:'- name: web',to:'image: hello:v2',text:'容器名和镜像。把 v2 改成 v3 再 apply，就会触发滚动更新。'},{at:'resources:',to:'memory: 256Mi',text:'requests：至少需要的资源，调度器按它选节点。500m 表示 0.5 个 CPU 核。'},{at:'limits:',to:'memory: 512Mi',text:'limits：最多能用的资源。内存超过 512Mi，容器会被 OOM 杀掉并重启。'}]},
  {title:'三种探针，用对很重要',body:'kubelet 用探针检查容器的健康状况，三种探针作用不同：\nstartupProbe（启动探针）：判断程序是否已经启动完成。启动慢的程序（比如要加载大量数据、预热缓存）在启动完成前，其他两种探针都不会执行，避免被误判；\nlivenessProbe（存活探针）：判断程序是否“卡死”了，失败时 kubelet 会重启这个容器；\nreadinessProbe（就绪探针）：判断程序现在能不能接收请求，失败时不会重启，只是把这个 Pod 从 Service 的流量里摘掉，恢复后再加回来。\n服务启动后需要预热 30 秒才能接流量，就应该配置 readinessProbe（以及 startupProbe），预热完成前探针返回失败，不会有请求进来。\n一个常见的错误：在 livenessProbe 里检查数据库能不能连上。数据库一抖动，所有 Pod 的存活检查同时失败，K8s 会把它们全部重启，问题反而更严重，而且重启也解决不了数据库的问题。liveness 只应该检查程序自身是否还活着。',code:`startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 2
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5`,explain:[{at:'startupProbe:',to:'port: 8080',text:'启动探针：访问 8080 端口的 /healthz。'},{at:'failureThreshold: 30',to:'periodSeconds: 2',text:'每 2 秒检查一次，最多允许失败 30 次，也就是给程序最多 60 秒的启动时间。'},{at:'livenessProbe:',to:'periodSeconds: 10',text:'存活探针：每 10 秒检查一次 /healthz，它只检查进程自身能不能响应，不依赖数据库等外部服务。'},{at:'readinessProbe:',to:'periodSeconds: 5',text:'就绪探针：检查 /ready。程序预热没完成、或者暂时过载时，让它返回失败，Pod 就会暂时不接流量。'}]},
  {title:'Pod 一直 CrashLoopBackOff，怎么查',body:'CrashLoopBackOff 的意思是：容器启动后很快就退出了，K8s 不断地重启它，而且每次重启之间等待的时间越来越长。排查步骤：\n一、kubectl describe pod 查看事件（Events）和容器的上一次退出状态：退出码是多少？原因是不是 OOMKilled（内存超过了 limits）？镜像拉取有没有失败？存活探针是不是一直失败？\n二、kubectl logs --previous 查看“上一次”崩溃的容器打印的日志。直接 kubectl logs 看到的是刚刚重启的新容器，可能还没来得及输出错误；\n三、根据线索判断常见原因：配置或环境变量缺失、连不上依赖的服务导致启动就退出、内存限制太小、启动命令写错、存活探针配置得太严（程序还没启动完就被判定为死亡）；\n四、需要的话，用 kubectl exec 进入正在运行的容器内部查看。',code:`kubectl get pods
kubectl describe pod web-7d9f8-abcde
kubectl logs web-7d9f8-abcde --previous
kubectl rollout undo deployment/web`,explain:[{at:'kubectl get pods',text:'查看 Pod 的状态，能看到 CrashLoopBackOff 和重启次数。'},{at:'kubectl describe pod web-7d9f8-abcde',text:'查看这个 Pod 的详细信息：最下面的 Events 和 Last State 里有退出原因和退出码。'},{at:'kubectl logs web-7d9f8-abcde --previous',text:'查看上一次崩溃的容器的日志，通常能直接看到报错原因。'},{at:'kubectl rollout undo deployment/web',text:'如果是新版本导致的，先回滚到上一个版本止血，再慢慢排查。'}]}
 ],quiz:[
 {id:'be-cloud-1',q:'容器和虚拟机最本质的区别是？',options:['容器的体积比虚拟机更大','容器共享宿主机内核','容器默认不能访问网络','虚拟机不能运行 Linux 系统'],why:['容器通常比虚拟机小得多，启动也更快。','','容器可以配置各种网络模式，默认就能联网。','虚拟机可以运行包括 Linux 在内的各种操作系统。'],answer:1,explain:'容器共享宿主机内核，虚拟机有自己独立的内核，这也是容器轻量、但隔离性相对弱的原因。',interview:'q-3679d212a21d6fd0'},
 {id:'be-cloud-2',type:'multi',q:'Docker 隔离和限制资源依赖哪些内核机制？（多选）',options:['namespaces','cgroups','iptables 限制 CPU 和内存','DNS 隔离不同容器的资源'],why:['','','iptables 用于网络包过滤和转发，不能限制 CPU 和内存。','DNS 只负责名称解析，与资源隔离无关。'],answers:[0,1],explain:'namespaces 隔离进程、网络、文件系统等视图，cgroups 限制 CPU、内存等资源；seccomp 和 capabilities 用来收紧权限。',interview:'q-3679d212a21d6fd0'},
 {id:'be-cloud-3',type:'judge',q:'数据库的数据写在容器的可写层里就很安全，删除容器也不会丢。',answer:false,explain:'可写层随容器删除而消失，数据要放卷或外部存储。',interview:'q-338e4cf75022dc37'},
 {id:'be-cloud-4',q:'Dockerfile 里先 COPY go.mod 并下载依赖，再 COPY 全部代码，好处是？',options:['构建出的镜像更加安全','改代码时复用依赖层缓存','Dockerfile 可以少写一行','容器启动的速度更快'],why:['这种写法与镜像安全无关。','','这样写反而多了一行 COPY。','启动速度取决于镜像内容和程序本身，与构建缓存无关。'],answer:1,explain:'Docker 按层缓存，变化少的步骤（依赖下载）放前面，只改业务代码时可以复用依赖层，构建更快。'},
 {id:'be-cloud-5',q:'K8s 里负责“给新 Pod 选一个合适节点”的组件是？',options:['kubelet','scheduler','etcd','kube-proxy'],why:['kubelet 运行在每个节点上，负责真正启动和管理容器，不负责选节点。','','etcd 是集群状态的存储。','kube-proxy 负责 Service 的网络转发规则。'],answer:1,explain:'scheduler 只选节点；kubelet 在节点上真正启动容器。',interview:'q-4682e872ed62f6cb'},
 {id:'be-cloud-6',type:'fill',q:'K8s 集群的所有状态最终保存在 ____ 中。',accepted:['etcd'],explain:'API Server 是唯一直接读写 etcd 的组件。',interview:'q-4682e872ed62f6cb'},
 {id:'be-cloud-7',q:'服务启动后需要预热 30 秒才能接流量，期间不应该被分配请求，应该配置？',options:['livenessProbe 存活探针','readinessProbe 就绪探针','增加更多的副本数量','给容器分配更大的内存'],why:['存活探针失败会重启容器，预热期间失败反而会导致不断重启。','','副本多了，新副本预热期间仍会接到请求。','内存大小不影响何时开始接流量。'],answer:1,explain:'readiness 失败只摘除流量、不重启；启动特别慢时再加 startupProbe 保护。',interview:'q-fc7ea79fe2b6761b'},
 {id:'be-cloud-8',type:'judge',q:'livenessProbe 里检查数据库连通性是好做法，数据库不通就重启应用。',answer:false,explain:'数据库抖动会导致所有 Pod 同时重启，雪上加霜；liveness 只检查进程自身是否卡死。',interview:'q-fc7ea79fe2b6761b'},
 {id:'be-cloud-9',q:'Pod 一直 CrashLoopBackOff，最先看什么？',options:['看上次崩溃的日志和事件','删除并重建整个 K8s 集群','把副本数扩容到 100 个','修改集群的 DNS 配置'],why:['','删除集群代价巨大，而且问题在应用本身。','扩容只会产生更多同样崩溃的 Pod。','没有证据表明问题与 DNS 有关。'],answer:0,explain:'kubectl logs --previous 看上一次崩溃前的日志，kubectl describe 看事件（如 OOMKilled、镜像拉取失败），通常能直接说明原因。',interview:'q-d6725d35240da255'},
 {id:'be-cloud-10',type:'short',q:'简述在 K8s 中执行 kubectl apply 一个 Deployment 后，到容器真正跑起来的过程。',reference:'kubectl 把请求发给 API Server，经过认证、授权和准入控制后写入 etcd；Deployment 控制器看到新对象，创建 ReplicaSet，ReplicaSet 控制器再创建 Pod 对象；scheduler 为未绑定的 Pod 选择节点并写回绑定；该节点上的 kubelet 发现分配给自己的 Pod，调用容器运行时拉镜像、准备网络和存储、启动容器；kubelet 执行探针并持续上报状态，就绪后 Service 才把流量转给它。',points:['API Server 鉴权并写入 etcd','控制器创建 ReplicaSet 和 Pod','scheduler 选节点','kubelet 启动容器、执行探针、上报状态'],explain:'各组件只做自己的事，通过 API Server 协作。',interview:'q-4682e872ed62f6cb'},
]};
