import type {AiLevel} from '../journey';

// 专家：Kafka 可靠性、Docker 与 Kubernetes。
export const beKafka:AiLevel={id:'be-kafka',title:'Kafka 可靠性：不丢、不重、有序',summary:'副本与 ISR、位移提交、幂等与事务、重平衡和积压处理',lessons:[
 {title:'不丢：三层都要配合',body:'生产端：acks=all，等待发送结果，失败重试，开启幂等。broker：副本数 ≥ 3，min.insync.replicas=2，禁止“不干净选主”（unclean.leader.election.enable=false）。消费端：处理成功之后再提交位移。任何一层偷懒都可能丢消息。',code:'# 生产者\nacks=all\nenable.idempotence=true\n# topic / broker\nreplication.factor=3\nmin.insync.replicas=2\nunclean.leader.election.enable=false'},
 {title:'不重：按“至少一次”设计幂等',body:'消费者处理完还没提交位移就崩溃，重启后会再收到同一条消息，重复无法完全避免。幂等生产者只能去掉“发送重试”造成的重复，Kafka 事务只覆盖 Kafka 内部。业务侧要用唯一事件 ID：把去重记录和业务修改放在同一个数据库事务里，用唯一约束保证只生效一次。'},
 {title:'有序：同 key 进同一分区',body:'Kafka 只保证分区内有序。需要按订单有序，就用订单号作 key，同一订单总进同一个分区；消费端按分区串行处理。注意：增加分区会改变 key 到分区的映射；失败消息转到重试主题后，后面的消息可能先被处理。'},
 {title:'重平衡和积压',body:'消费组成员增减、心跳超时、处理一批消息太久（超过 max.poll.interval.ms）都会触发重平衡，期间相关分区暂停消费。减少无谓重平衡：小批量、及时 poll、静态成员、协作式分配。积压时先查原因（生产暴涨、消费者故障、下游变慢），在分区数范围内扩消费者，并保护下游。'},
],quiz:[
 {id:'be-kafka-1',q:'acks=all 时，生产者等待谁的确认？',options:['只等 leader 写入','ISR 中的所有副本都写入','所有 broker','不等待'],answer:1,explain:'acks=all 等 ISR 里的副本都确认，配合 min.insync.replicas 规定最少副本数。',interview:'q-8651521ae8627b69'},
 {id:'be-kafka-2',type:'multi',q:'为了尽量不丢消息，下面哪些配置是合理的？（多选）',options:['acks=all','min.insync.replicas=2，副本数 3','允许不干净选主','消费者处理成功后再提交位移'],answers:[0,1,3],explain:'不干净选主会让落后的副本当 leader，导致已确认的数据丢失。',interview:'q-64d6c9192640528c'},
 {id:'be-kafka-3',type:'judge',q:'开启了幂等生产者，消费端就不会处理到重复消息。',answer:false,explain:'幂等生产者只消除发送重试造成的重复；消费端崩溃重放仍会重复，业务要幂等。',interview:'q-fbd8a4dce2890044'},
 {id:'be-kafka-4',q:'“给用户加 10 积分”的消息可能被重复消费，最可靠的去重方式是？',options:['用内存 map 记录处理过的消息','把事件 ID 写入去重表和加积分放在同一个数据库事务里，靠唯一约束去重','每条消息处理两次','关闭重试'],answer:1,explain:'同一事务保证“去重记录”和“业务修改”同时成功或同时失败。',interview:'q-81c178be884a95ad'},
 {id:'be-kafka-5',q:'订单 42 的“创建、支付、发货”消息必须按顺序处理，生产时应该？',options:['随机分区','用订单号作 key，同一订单进同一分区','每条消息一个新 topic','开很多分区并行消费'],answer:1,explain:'Kafka 只保证分区内有序。',interview:'q-f46b7545e229dd20'},
 {id:'be-kafka-6',type:'fill',q:'消费者处理一批消息的时间超过 max.____.interval.ms，会被认为失联，触发重平衡。',accepted:['poll'],explain:'处理慢时应减小批量或优化处理，而不是一味调大这个参数。',interview:'q-9b6c6aae2bfba860'},
 {id:'be-kafka-7',q:'提交位移 42 的含义是？',options:['第 42 条已经处理完','下一次从第 42 条开始读','删除前 42 条','42 号分区已完成'],answer:1,explain:'提交的是“下一条要读的位置”。',interview:'q-051a5cf2e2d57304'},
 {id:'be-kafka-8',q:'topic 有 6 个分区，消费组里已有 6 个消费者，lag 还在涨，再加 4 个消费者会怎样？',options:['消费速度提升 66%','多出的 4 个消费者闲着，没有分区可分','分区自动变成 10 个','消息会被重复消费 4 次'],answer:1,explain:'同组内一个分区只分给一个消费者，扩消费者不能超过分区数。',interview:'q-d52b9b98efc875aa'},
 {id:'be-kafka-9',type:'judge',q:'协作式（cooperative）重平衡只转移需要变化的分区，比 eager 方式全员停下来影响更小。',answer:true,explain:'eager 需要所有成员先放下全部分区再重新分配。',interview:'q-fdd9d1567fb96ff8'},
 {id:'be-kafka-10',type:'short',q:'监控发现某个消费组 lag 持续上涨，你会怎么处理？',reference:'先看原因：是生产量突然暴涨、消费者实例挂了或频繁重平衡、某个分区是热点，还是下游数据库/接口变慢。止血：恢复故障消费者，优化批处理和外部 I/O，在分区数范围内扩消费者，同时保护下游不被压垮；毒消息转入重试或死信队列。必要时延长保留期防止消息过期丢失。长期：评估分区数、热点 key 和容量规划。',points:['先定位：生产、消费者还是下游','扩消费者不超过分区数','保护下游，隔离毒消息','延长保留期，做容量规划'],explain:'积压是结果，要先找到原因。',interview:'q-d52b9b98efc875aa'},
]};

export const beCloud:AiLevel={id:'be-cloud',title:'容器与 Kubernetes',summary:'Docker 的隔离原理、镜像分层，K8s 的调度、探针和发布',lessons:[
 {title:'容器不是虚拟机',body:'容器共享宿主机内核。namespaces 让每个容器看到独立的进程、网络、挂载点；cgroups 限制 CPU、内存等资源；再加上 capabilities、seccomp 收紧权限。所以容器启动快、开销小，但隔离性不如虚拟机。Docker 负责镜像和容器管理，真正运行交给 containerd 和 runc。'},
 {title:'镜像和分层',body:'镜像由一层层只读层叠起来，每层记录相对下层的文件变化，多个镜像可以共享底层。启动容器时在最上面加一层可写层，删掉容器可写层也没了，数据要放到卷（Volume）。写 Dockerfile 时把变化少的步骤放前面，充分利用构建缓存；用多阶段构建减小镜像。',code:'FROM golang:1.26 AS build\nWORKDIR /src\nCOPY go.mod go.sum ./\nRUN go mod download        # 依赖层，代码改了也能复用缓存\nCOPY . .\nRUN go build -o /app ./cmd/server\n\nFROM gcr.io/distroless/base\nCOPY --from=build /app /app\nENTRYPOINT ["/app"]'},
 {title:'K8s：声明期望状态',body:'你声明“我要 3 个副本”，控制器持续把实际状态调整到期望状态：Pod 挂了自动补。创建流程：API Server 认证鉴权后写入 etcd → 控制器创建 Pod 对象 → scheduler 选节点 → 节点上的 kubelet 调用容器运行时启动容器。Deployment 负责滚动更新和回滚，Service 提供稳定的访问入口。'},
 {title:'探针和排查',body:'startupProbe 判断启动完成没有；livenessProbe 失败会重启容器，用来处理卡死；readinessProbe 失败只把 Pod 从流量里摘掉。liveness 不要依赖数据库，否则数据库一抖所有 Pod 一起重启。排查用 kubectl describe 看事件，kubectl logs --previous 看上一次崩溃的日志。'},
],quiz:[
 {id:'be-cloud-1',q:'容器和虚拟机最本质的区别是？',options:['容器更大','容器共享宿主机内核，虚拟机有自己的内核','容器不能联网','虚拟机不能运行 Linux'],answer:1,explain:'这也是容器轻量、隔离性相对弱的原因。',interview:'q-3679d212a21d6fd0'},
 {id:'be-cloud-2',type:'multi',q:'Docker 隔离和限制资源依赖哪些内核机制？（多选）',options:['namespaces','cgroups','seccomp / capabilities','DNS'],answers:[0,1,2],explain:'namespaces 隔离视图，cgroups 限资源，seccomp 和 capabilities 收紧权限。',interview:'q-3679d212a21d6fd0'},
 {id:'be-cloud-3',type:'judge',q:'数据库的数据写在容器的可写层里就很安全，删除容器也不会丢。',answer:false,explain:'可写层随容器删除而消失，数据要放卷或外部存储。',interview:'q-338e4cf75022dc37'},
 {id:'be-cloud-4',q:'Dockerfile 里先 COPY go.mod 并下载依赖，再 COPY 全部代码，好处是？',options:['镜像更安全','只改业务代码时可以复用依赖层缓存，构建更快','能少写一行','让容器启动更快'],answer:1,explain:'Docker 按层缓存，变化少的步骤放前面。'},
 {id:'be-cloud-5',q:'K8s 里负责“给新 Pod 选一个合适节点”的组件是？',options:['kubelet','scheduler','etcd','kube-proxy'],answer:1,explain:'scheduler 只选节点；kubelet 在节点上真正启动容器。',interview:'q-4682e872ed62f6cb'},
 {id:'be-cloud-6',type:'fill',q:'K8s 集群的所有状态最终保存在 ____ 中。',accepted:['etcd'],explain:'API Server 是唯一直接读写 etcd 的组件。',interview:'q-4682e872ed62f6cb'},
 {id:'be-cloud-7',q:'服务启动后需要预热 30 秒才能接流量，期间不应该被分配请求，应该配置？',options:['livenessProbe','readinessProbe（必要时再加 startupProbe）','更多副本','更大的内存'],answer:1,explain:'readiness 失败只摘流量不重启。',interview:'q-fc7ea79fe2b6761b'},
 {id:'be-cloud-8',type:'judge',q:'livenessProbe 里检查数据库连通性是好做法，数据库不通就重启应用。',answer:false,explain:'数据库抖动会导致所有 Pod 同时重启，雪上加霜；liveness 只检查进程自身是否卡死。',interview:'q-fc7ea79fe2b6761b'},
 {id:'be-cloud-9',q:'Pod 一直 CrashLoopBackOff，最先看什么？',options:['kubectl logs --previous 看上一次崩溃的日志，并 describe 看事件','直接删掉集群','扩容到 100 个副本','修改 DNS'],answer:0,explain:'上一次容器的日志通常能直接说明崩溃原因。',interview:'q-d6725d35240da255'},
 {id:'be-cloud-10',type:'short',q:'简述在 K8s 中执行 kubectl apply 一个 Deployment 后，到容器真正跑起来的过程。',reference:'kubectl 把请求发给 API Server，经过认证、授权和准入控制后写入 etcd；Deployment 控制器看到新对象，创建 ReplicaSet，ReplicaSet 控制器再创建 Pod 对象；scheduler 为未绑定的 Pod 选择节点并写回绑定；该节点上的 kubelet 发现分配给自己的 Pod，调用容器运行时拉镜像、准备网络和存储、启动容器；kubelet 执行探针并持续上报状态，就绪后 Service 才把流量转给它。',points:['API Server 鉴权并写入 etcd','控制器创建 ReplicaSet 和 Pod','scheduler 选节点','kubelet 启动容器、执行探针、上报状态'],explain:'各组件只做自己的事，通过 API Server 协作。',interview:'q-4682e872ed62f6cb'},
]};
