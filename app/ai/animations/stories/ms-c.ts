import {A,type Story} from '../story';

// 微服务面试题动画（三）：Kubernetes 与消息中间件入门。
export const msC:Record<string,Story>={
 'q-7fe202eb59a13335':{title:'K8s：告诉它“我要什么”，它负责做到',beats:[
  {say:'你不用一台台登录服务器启动程序，只要写一份声明：“我要 3 个订单服务副本”。',add:[A('me','🧑‍💻','你',80,170),A('yaml','📄','期望状态：replicas 3',260,170,{kind:'item',tone:'primary'})],send:[{from:'me',to:'yaml'}]},
  {say:'K8s 的控制器不停地对比“期望状态”和“实际状态”，把实际调整到期望——这叫声明式编排。',add:[A('ctl','🔄','控制器',460,70,{tone:'warm'}),A('p1','📦','Pod',400,250,{kind:'tag'}),A('p2','📦','Pod',500,250,{kind:'tag'}),A('p3','📦','Pod',600,250,{kind:'tag'})],send:[{from:'yaml',to:'ctl'}]},
  {say:'一个 Pod 挂了，控制器发现只剩 2 个，马上重新创建一个——自愈。',tone:{p3:'bad'},bubble:{who:'ctl',text:'少了一个，补上'}},
  {say:'还有调度、滚动更新、服务发现、资源管理、弹性扩缩容，适合多服务、需要标准化运维的场景。',tone:{p3:'ok'},add:[A('feat','🧰','调度 · 滚动更新 · 服务发现 · 扩缩容',300,330,{kind:'tag',tone:'ok'})]},
  {say:'但它不会修你的业务 bug，也不保证数据库一致；小型单机应用要掂量集群的运维成本，有状态应用还要管持久卷和备份。',memo:['声明期望状态，控制器去实现','自愈、调度、滚动更新']},
 ]},
 'q-4682e872ed62f6cb':{title:'K8s 创建一个 Pod 的流程',beats:[
  {say:'kubectl apply 一个 Deployment。请求先到 API Server：认证、授权、准入检查，通过后写进 etcd。',add:[A('me','🧑‍💻','kubectl',70,80),A('api','🏛️','API Server',250,80,{kind:'item',tone:'primary'}),A('etcd','🗄️','etcd',250,220,{kind:'tag'})],send:[{from:'me',to:'api',text:'apply'},{from:'api',to:'etcd',text:'保存'}]},
  {say:'控制器看到新的 Deployment，创建 ReplicaSet，再创建 Pod 对象。此时 Pod 还没分配到节点。',add:[A('ctl','🔄','控制器',450,80,{tone:'warm'})],send:[{from:'api',to:'ctl'}]},
  {say:'调度器（scheduler）为这个 Pod 挑一个合适的节点，提交绑定。它只负责选节点，不拉镜像。',add:[A('sch','🧭','scheduler',450,220,{tone:'primary'})],send:[{from:'sch',to:'api',text:'绑定到 node-2'}]},
  {say:'node-2 上的 kubelet 发现有新任务，调用容器运行时：准备网络、挂载卷、拉镜像、启动容器。',add:[A('kl','🤖','kubelet（node-2）',250,320,{kind:'item',tone:'ok'})],send:[{from:'api',to:'kl'}]},
  {say:'kubelet 持续上报状态、执行健康探针。注意：API Server 自己不运行容器。',bubble:{who:'kl',text:'容器已启动，\nReady'}},
  {say:'记住分工。',memo:['API Server 存状态，控制器建 Pod','scheduler 选节点，kubelet 启动']},
 ]},
 'q-d6725d35240da255':{title:'Pod 的状态和排查命令',beats:[
  {say:'Pod 的生命周期阶段（phase）只有五种：Pending、Running、Succeeded、Failed、Unknown。',add:[A('pd','⏳','Pending',110,80,{kind:'tag'}),A('rn','▶️','Running',260,80,{kind:'tag',tone:'ok'}),A('sc','✅','Succeeded',420,80,{kind:'tag',tone:'ok'}),A('fl','❌','Failed',560,80,{kind:'tag',tone:'bad'})]},
  {say:'kubectl get pods 的 STATUS 列还会显示 ContainerCreating、CrashLoopBackOff、Terminating，它们是展示状态，不都是 phase。',add:[A('crash','🔁','CrashLoopBackOff',320,200,{kind:'item',tone:'bad'})]},
  {say:'排查三步：describe 看事件和条件；logs --previous 看上一次崩溃的日志；jsonpath 只取 phase。',add:[A('cmd','⌨️','describe · logs --previous',320,300,{kind:'tag',tone:'primary'})],send:[{from:'cmd',to:'crash'}]},
  {say:'注意：Running 不等于 Ready，还要看就绪条件和容器的状态。',bubble:{who:'crash',text:'启动就崩，\n看上一次日志'}},
  {say:'记住状态和命令。',memo:['phase 五种，STATUS 更细','describe、logs --previous']},
 ]},
 'q-48b7e0cab640bde1':{title:'静态 Pod：kubelet 自己管的 Pod',beats:[
  {say:'普通 Pod 由控制器创建、scheduler 调度。静态 Pod 不一样：它由某个节点上的 kubelet 直接读取本地文件来管理。',add:[A('node','🖥️','node-1',320,90,{kind:'item',tone:'primary'}),A('file','📄','/etc/kubernetes/manifests/',320,220,{kind:'tag'})],send:[{from:'file',to:'node',text:'kubelet 读取'}]},
  {say:'自建集群的控制平面组件（API Server、etcd 等）常常就是这样跑起来的——先有它们，才有集群。',add:[A('cp','🏛️','控制平面组件',120,90,{kind:'tag',tone:'ok'})]},
  {say:'kubelet 会在 API Server 上建一个“镜像 Pod”，方便你查看状态。但删掉这个镜像 Pod，实际的静态 Pod 并不会停。',add:[A('mir','🪞','镜像 Pod（只读展示）',520,90,{kind:'tag',tone:'warm'})],bubble:{who:'mir',text:'删我没用'}},
  {say:'要修改或停掉它，就去改或删节点上的清单文件。',send:[{from:'file',to:'node',text:'删文件 → 停止',tone:'warm'}]},
  {say:'它绑定在这个节点上，scheduler 不会把它迁到别的节点。',memo:['kubelet 读本地清单管理','改文件才生效，不会被调度']},
 ]},
 'q-fc7ea79fe2b6761b':{title:'Pod 的三种健康检查',beats:[
  {say:'一个 Java 服务启动要 60 秒。K8s 怎么知道它启动好了、还活着、能接流量？靠三种探针。',add:[A('pod','📦','订单 Pod',320,170,{kind:'item',tone:'primary'})]},
  {say:'startupProbe 启动探针：判断启动完成没有。成功之前，另外两种探针先不检查，免得慢启动被误杀。',add:[A('st','🚀','startupProbe',120,70,{kind:'tag',tone:'warm'})],send:[{from:'st',to:'pod'}]},
  {say:'livenessProbe 存活探针：连续失败达到阈值，就重启容器，适合处理“卡死”。',add:[A('lv','💓','livenessProbe → 重启',520,70,{kind:'tag',tone:'bad'})],send:[{from:'lv',to:'pod'}]},
  {say:'readinessProbe 就绪探针：失败时把 Pod 从 Service 的流量里摘掉，但不重启。',add:[A('rd','🚦','readinessProbe → 摘流量',320,310,{kind:'tag',tone:'ok'})],send:[{from:'rd',to:'pod'}]},
  {say:'探针可以用 exec、HTTP、TCP 或 gRPC。健康接口要轻量；liveness 别依赖数据库，否则数据库一抖，所有容器一起重启。',bubble:{who:'pod',text:'数据库挂了\n别让我重启',tone:'warm'}},
  {say:'记住三种探针。',memo:['startup 等启动，liveness 管重启','readiness 管流量']},
 ]},
 'q-4c426a32d66c1d34':{title:'为什么消息中间件越来越常考',beats:[
  {say:'下单后要发短信、加积分、通知仓库。全部同步调用，任何一个慢了，下单就慢。',add:[A('o','🧾','订单服务',110,170,{kind:'item',tone:'primary'}),A('a','📱','短信',520,70,{kind:'tag'}),A('b','⭐','积分',520,170,{kind:'tag'}),A('c','🏬','仓库',520,270,{kind:'tag'})],send:[{from:'o',to:'a',tone:'warm'},{from:'o',to:'b',tone:'warm'},{from:'o',to:'c',tone:'warm'}]},
  {say:'改成发一条消息到 MQ，谁关心谁去订阅：解耦、异步、削峰，还能广播事件。',add:[A('mq','📨','消息队列',320,170,{kind:'item',tone:'ok'})],send:[{from:'o',to:'mq',text:'订单已创建',tone:'ok'},{from:'mq',to:'a'},{from:'mq',to:'b'},{from:'mq',to:'c'}]},
  {say:'所以面试官爱从“为什么用 MQ”开始，一路追问：消息会不会丢？重复消费怎么办？顺序怎么保证？积压了怎么办？',add:[A('iv','🧑‍💼','面试官',320,290)],bubble:{who:'iv',text:'丢了怎么办？\n重复了怎么办？'}},
  {say:'考的不是“会用一个组件”，而是能不能说清引入后的最终一致、延迟和运维代价。',memo:['解耦、异步、削峰','追问：可靠、重复、顺序、积压']},
 ]},
 'q-e50ed379a12e63dd':{title:'消息队列题怎么答：四步法',beats:[
  {say:'第一步 业务需求：这条消息能不能丢？能不能重复？顺序要按什么粒度？允许多大延迟？',add:[A('s1','①','业务需求',100,90,{kind:'tag',tone:'primary'})]},
  {say:'第二步 投递语义：至多一次、至少一次，还是业务上“恰好一次”。',add:[A('s2','②','投递语义',260,90,{kind:'tag',tone:'primary'})]},
  {say:'第三步 链路：生产端确认、存储复制、消费端 offset 提交和幂等。',add:[A('s3','③','生产 → 存储 → 消费',420,90,{kind:'tag',tone:'primary'})]},
  {say:'第四步 异常恢复：重试、死信队列、积压处理、对账。',add:[A('s4','④','重试 · 死信 · 对账',540,200,{kind:'tag',tone:'primary'})]},
  {say:'最后用真实指标或压测结果说明效果，不要把理论峰值当项目成绩；MQ 的 exactly-once 也不等于数据库副作用恰好一次。',add:[A('me','🧑‍💻','你',200,250,{tone:'ok'})],bubble:{who:'me',text:'我们压测是 2 万/秒',tone:'ok'}},
  {say:'记住答题顺序。',memo:['需求 → 语义 → 链路 → 恢复','用真实数据说话']},
 ]},
 'q-e6c72f010b0cee81':{title:'什么时候用 MQ，选哪一个',beats:[
  {say:'适合用 MQ 的场景：订单通知、异步任务、削峰填谷、日志采集、事件流。',add:[A('use','📨','通知 · 异步 · 削峰 · 日志 · 事件流',320,60,{kind:'tag',tone:'ok'})]},
  {say:'不适合：必须马上拿到强一致结果的关键校验，比如“余额够不够”，还是要同步或用事务。',add:[A('no','🚫','实时强一致校验',320,140,{kind:'tag',tone:'bad'})]},
  {say:'Kafka：高吞吐的事件日志，能回放，适合流处理。',add:[A('k','📜','Kafka：高吞吐 · 回放',170,225,{kind:'item',tone:'primary'})]},
  {say:'RabbitMQ：路由规则灵活，适合任务队列。RocketMQ：常用于需要延迟消息、事务消息的业务场景。',add:[A('r','🐰','RabbitMQ：灵活路由',470,225,{kind:'item'}),A('rk','🚀','RocketMQ：延迟/事务消息',320,315,{kind:'item'})]},
  {say:'最终按消息规模、延迟、顺序、回放需求、团队运维能力和客户端生态，用压测来验证，不能只看名气选型。',memo:['异步解耦用 MQ，强一致别用','Kafka 吞吐，Rabbit 路由，Rocket 事务']},
 ]},
};
