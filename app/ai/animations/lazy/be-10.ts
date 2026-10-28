import {A} from '../story';
import type {LazyEpisode} from './engine';

// 后端懒人模式第 10 集：集装箱码头和一本反着写的索引（Docker 隔离与镜像分层、K8s 声明式与 Pod 生命周期、探针；Elasticsearch 倒排索引、写入与近实时、查询类型、深分页、并发控制、高可用与调优）。
export const beLazy10:LazyEpisode={id:'lazy-be-10',subject:'backend',tier:3,levels:['be-cloud','be-es'],icon:'🚢',title:'集装箱码头，和一本反着写的目录',summary:'用集装箱和港口调度讲 Docker 与 Kubernetes；再用一本“从词找书”的反向目录，讲 Elasticsearch 的倒排索引、近实时写入、查询类型和高可用。',beats:[
 {say:'书店的服务拆成了十几个，部署成了大难题：这台机器装的是这个版本的依赖，那台机器又是另一个版本，同样的程序换台机器就跑不起来。运维小刘说：我们把每个服务装进集装箱吧。',add:[A('jie','🧔','阿杰',110,170,{tone:'primary'}),A('liu','👷','运维小刘',110,300)]},
 {say:'集装箱就是容器。它把程序和它需要的所有依赖打包在一起，到哪台机器上都一样跑。容器不是虚拟机：它和宿主机共用同一个内核，所以启动只要一眨眼，开销很小；但隔离性也比虚拟机弱一些。',add:[A('box','📦','容器：共用宿主内核',460,90,{kind:'item',tone:'primary'})]},
 {say:'容器靠两样内核能力实现隔离。namespaces 让每个容器看到自己独立的进程、网络和文件系统，以为自己独占了一台机器，像集装箱的箱壁；cgroups 限制每个容器能用多少 CPU 和内存，像给每个箱子规定载重。',add:[A('ns','🧱','namespaces 隔离 · cgroups 限额',460,210,{kind:'tag',tone:'ok'})]},
 {say:'集装箱的“图纸”叫镜像，由一层层只读的层叠起来：最下面是基础系统，往上是安装的依赖，最上面是程序代码。不同的镜像可以共享相同的底层，省空间也省下载。容器运行时，在最上面加一层可写层；容器删掉，可写层也就没了，所以数据要放在卷里。',drop:['ns'],add:[A('layers','🥞','镜像分层 + 容器可写层',460,210,{kind:'tag',tone:'primary'})]},
 {say:'写 Dockerfile 有个窍门：变化少的步骤放前面。先拷贝依赖清单、下载依赖，再拷贝代码，这样只改代码时，依赖那一层可以直接复用缓存，构建快得多。再用多阶段构建，最终镜像里只留可执行文件，体积小、漏洞少，最好还用非 root 用户运行。',bubble:{who:'layers',text:'变化少的放前面'}},
 {say:'集装箱多了，需要一个港口调度中心，这就是 Kubernetes。它最大的特点是声明式：你不用告诉它“去哪台机器上启动三个容器”，只要声明“我要三个订单服务的副本”，它就会想办法让实际状态始终等于你声明的期望状态。',drop:['layers','box'],add:[A('k8s','☸️','K8s：声明期望状态',460,90,{kind:'item',tone:'primary'})]},
 {say:'一个 Pod 是怎么诞生的？你提交声明给 API Server，它认证、鉴权后写进 etcd，这是整个集群的记事本。控制器看到“要三个副本”，就创建三个 Pod 对象；调度器为每个 Pod 挑一台合适的机器；那台机器上的 kubelet 发现有新任务，拉取镜像、启动容器。',add:[A('flow','🔁','API Server → etcd → 控制器 → 调度器 → kubelet',380,210,{kind:'tag'})]},
 {say:'有一个 Pod 所在的机器宕机了，控制器发现只剩两个副本，马上在别的机器上补一个，这叫自愈。滚动更新时，它一批批地用新版本替换旧版本，出了问题还能一键回滚。',drop:['flow'],add:[A('heal','🩹','自愈 · 滚动更新',460,210,{kind:'tag',tone:'ok'})]},
 {say:'怎么知道一个容器是健康的？Kubernetes 有三种探针。启动探针判断程序启动完了没有，没完之前其他探针先不检查；存活探针失败，就重启容器，用来处理卡死；就绪探针失败，只是把它从流量里摘掉，不重启。程序预热时，就靠就绪探针挡住流量。',drop:['heal'],add:[A('probe','🩺','startup · liveness · readiness',460,210,{kind:'tag',tone:'primary'})]},
 {say:'小刘踩过一个坑：存活探针里检查了数据库能不能连上。有一天数据库抖了一下，所有的容器同时被判定为不健康，一起重启，雪上加霜。存活探针只该检查程序自己有没有卡死。容器一直崩溃重启，先用 kubectl describe 看事件，再用 kubectl logs --previous 看上一次崩溃的日志。',bubble:{who:'probe',text:'liveness 别查数据库'}},
 {say:'容器的事搞定了，书店又遇到了新问题：顾客搜“并发编程”，数据库用 LIKE 百分号查询，又慢又不准，搜不到《Go 并发实战》。小林说，全文搜索要请专业选手：Elasticsearch。',drop:['probe','k8s'],add:[A('es','🔎','Elasticsearch',460,90,{kind:'item',tone:'primary'})]},
 {say:'普通的目录是“从书找词”：翻开一本书，看里面有哪些词。ES 的目录是反着写的，叫倒排索引：先把每篇文档用分析器切成一个个词，再记下每个词出现在哪些文档里。“并发”这个词，在一号、五号、九号文档里出现过。查的时候，直接从词找到书。',add:[A('inv','📇','倒排索引：词 → 文档',460,210,{kind:'item',tone:'ok'})]},
 {say:'查“Go 并发”，就把“Go”的文档列表和“并发”的文档列表求个交集。表里还记着词出现的次数和位置，次数用来算相关度，位置用来做短语匹配。text 类型的字段会被分词，keyword 类型的字段保持整体，适合精确过滤，比如订单状态。',sub:{inv:'text 分词 · keyword 整体'}},
 {say:'写入一篇文档时，请求先到协调节点，按文档 id 算出它该去哪个主分片；主分片写好后复制给副本分片。在分片内部，数据先进内存缓冲区，同时写一份事务日志 translog，防止宕机丢失。',drop:['inv'],add:[A('write','✍️','缓冲区 + translog',460,210,{kind:'tag',tone:'primary'})]},
 {say:'大约每一秒，ES 做一次 refresh，把缓冲区里的内容生成一个新的 segment，这时文档才能被搜到，所以叫“近实时”。之后的 flush 才真正把数据持久化，并清理 translog。按 id 直接取文档马上就能拿到，搜索却要等那一秒。',bubble:{who:'write',text:'约 1 秒后才能搜到'}},
 {say:'segment 一旦写好就不再修改。好处是可以放心地被很多线程同时读，不需要加锁，缓存也好用。那更新怎么办？旧版本在原来的 segment 里标记删除，新版本写进新的 segment。小 segment 越来越多会拖慢查询，后台会把它们合并成大的，并真正清掉被删除的文档。',drop:['write'],add:[A('seg','🧱','segment 不可变 · 后台合并',460,210,{kind:'tag'})]},
 {say:'查询也有讲究。term 拿你给的词原样去精确匹配，不分词，所以用 term 去查 text 字段的“Go”，常常查不到，因为索引里存的是小写的 go。match 会先把输入分词再去匹配。match_phrase 还要求词的顺序和位置挨在一起。精确的过滤条件放进 filter，不算分，还能缓存。',drop:['seg'],add:[A('query','🔍','term · match · match_phrase · filter',380,210,{kind:'tag',tone:'primary'})]},
 {say:'明明写进去了却查不到？按顺序排查：是不是还没 refresh；是不是查错了索引或别名；看看字段的 mapping 是 text 还是 keyword，用 _analyze 看文本到底被切成了哪些词；批量写入时有没有某几条悄悄失败了没检查。',drop:['query'],add:[A('debug','🧪','refresh · mapping · _analyze · bulk 结果',380,210,{kind:'tag',tone:'warm'})]},
 {say:'翻到很深的页，用 from 加 size，每个分片都要先找出前一万多条交给协调节点，越往后越重。正确的做法是先打开一个时间点快照 PIT，再用 search_after，把上一页最后一条的排序值传进去，下一页直接从那里开始。',drop:['debug'],add:[A('deep','📄','深分页：PIT + search_after',460,210,{kind:'tag',tone:'ok'})]},
 {say:'两个人同时修改同一篇文档怎么办？ES 用乐观并发控制：更新时带上读取时的 seq_no 和 primary_term，如果文档已经被别人改过，ES 返回 409 冲突，不会盲目覆盖。拿到冲突，就重新读取、合并后再提交。',drop:['deep'],add:[A('occ','🔢','if_seq_no 冲突返回 409',460,210,{kind:'tag',tone:'warm'})]},
 {say:'高可用靠分片和副本：每个主分片配上副本，放在不同的节点上。一个节点宕机，它的副本马上升为新的主分片。集群的健康颜色：绿色全部正常，黄色有副本没分配，红色至少一个主分片缺失。但副本不是备份，误删索引时副本也一起删了，还得有快照。',drop:['occ'],add:[A('ha','🟢','主分片 + 副本，副本 ≠ 备份',460,210,{kind:'tag',tone:'ok'})]},
 {say:'调优先定位是哪一环慢：查询、写入，还是 GC、磁盘、某个热点分片。写入用合适大小的 bulk，适当调大 refresh 间隔；查询把精确条件放进 filter，少用通配符和脚本；提前规划好分片数量，显式写清 mapping。部署前还要调好系统参数，比如 vm.max_map_count，关闭 swap，给文件缓存留出足够的内存。',drop:['ha'],add:[A('tune','🎛️','bulk · refresh 间隔 · filter · 分片规划',380,210,{kind:'tag',tone:'primary'})]},
 {say:'现在，顾客搜“并发编程”，零点几秒就能看到《Go 并发实战》排在第一位。阿杰在笔记里写道：容器共用内核，namespaces 隔离、cgroups 限额，镜像一层层叠；K8s 只管期望状态，探针分清重启和摘流量；ES 反着写目录，一秒后可搜，深分页用 search_after。',drop:['tune','es','liu'],tone:{jie:'ok'}},
 {say:'这一集的要点。',memo:['容器：namespaces + cgroups，镜像分层，数据放卷；K8s 声明式，三种探针','ES：倒排索引，refresh 后可搜，term 不分词，深分页用 search_after']},
]};
