import {A,type Story} from '../story';

// 数据库面试题动画（八）：ES 高可用、深分页、并发冲突、系统配置、Go 客户端、性能优化。
export const dbEsB:Record<string,Story>={
 'q-34abf51f2155f612':{title:'ES 的高可用：主分片和副本',beats:[
  {say:'一个索引被切成多个主分片，每个主分片再配副本分片，放在不同的节点上。',add:[A('n1','🖥️','节点 1：P0 · R1',150,90,{kind:'item',tone:'primary'}),A('n2','🖥️','节点 2：P1 · R0',490,90,{kind:'item',tone:'primary'})]},
  {say:'节点 1 宕机了，P0 跟着没了。',tone:{n1:'bad'},sub:{n1:'宕机'}},
  {say:'集群发现后，把节点 2 上的副本 R0 提升为新的主分片，数据还在，服务继续。',sub:{n2:'R0 → 新的 P0'},tone:{n2:'ok'},bubble:{who:'n2',text:'我顶上！',tone:'ok'}},
  {say:'集群健康颜色：green 主副本都在；yellow 主分片都在，但有副本没分配；red 至少一个主分片缺失。',add:[A('g','🟢','green',150,250,{kind:'tag',tone:'ok'}),A('y','🟡','yellow',320,250,{kind:'tag',tone:'warm'}),A('r','🔴','red',490,250,{kind:'tag',tone:'bad'})]},
  {say:'跨可用区配置分配感知，别让主副本落在同一个机房；故障后剩下的节点要有容量接住。副本还能分担查询，但会增加写入和存储成本。',add:[A('az','🏙️','主副本跨可用区',320,330,{kind:'tag'})]},
  {say:'副本不能代替快照备份：误删索引时，副本也一起删了。',memo:['主分片 + 副本分片','副本不能代替备份']},
 ]},
 'q-ce12f5e3bd470427':{title:'ES 深分页怎么解决',beats:[
  {say:'from=10000, size=10：每个分片都得先找出前 10010 条交给协调节点，协调节点再合并排序，只留 10 条。越往后越重。',add:[A('co','🧭','协调节点',320,70,{tone:'primary'}),A('s1','📦','分片 1：10010 条',150,200,{kind:'tag',tone:'bad'}),A('s2','📦','分片 2：10010 条',490,200,{kind:'tag',tone:'bad'})],send:[{from:'s1',to:'co'},{from:'s2',to:'co'}]},
  {say:'把 max_result_window 调大只是放宽了限制，成本一点没少。',bubble:{who:'co',text:'内存要爆了',tone:'bad'}},
  {say:'连续翻页用 PIT + search_after：先打开一个时间点快照（PIT），保证翻页期间数据视图稳定。',add:[A('pit','📸','PIT 快照',320,300,{kind:'tag',tone:'ok'})],tone:{s1:'base',s2:'base'}},
  {say:'用稳定的排序再加一个唯一字段兜底，把上一页最后一条的排序值传给 search_after，下一页直接从那里开始。',sub:{pit:'search_after：上页最后一条'},tone:{co:'ok'}},
  {say:'PIT 要及时续期和关闭。scroll 适合后台批量导出，不适合用户交互式翻页。',memo:['深分页：每个分片都要多取','连续翻页：PIT + search_after']},
 ]},
 'q-e852cae670f60f1e':{title:'ES 的并发冲突：乐观并发控制',beats:[
  {say:'两个人同时改同一个商品文档的库存。小明读到的版本是 seq_no=5。',add:[A('doc','📄','商品文档 seq_no=5',320,80,{kind:'item',tone:'primary'}),A('a','🧑','小明',110,220),A('b','👩','小红',530,220)],send:[{from:'doc',to:'a',text:'读到 5'},{from:'doc',to:'b',text:'读到 5'}]},
  {say:'小红先写成功了，文档变成 seq_no=6。',send:[{from:'b',to:'doc',text:'更新',tone:'ok'}],sub:{doc:'现在 seq_no=6'}},
  {say:'小明更新时带上条件：if_seq_no=5 和 if_primary_term。文档已经被改过，ES 返回 409 冲突，不会盲目覆盖。',send:[{from:'a',to:'doc',text:'if_seq_no=5',tone:'bad'}],bubble:{who:'doc',text:'409：已被修改',tone:'bad'}},
  {say:'小明重新读取最新版本，按业务规则合并后再提交。',send:[{from:'doc',to:'a',text:'重新读 6'}],tone:{a:'ok'}},
  {say:'也可以用脚本更新把运算放到服务端；有可靠递增版本号的同步任务可以用外部版本号。只看客户端旧的 _version 自己判断是不行的。',memo:['带 if_seq_no 条件更新','冲突返回 409，重读再改']},
 ]},
 'q-ef1273fe7017c2a6':{title:'部署 ES 前要调哪些系统配置',beats:[
  {say:'自己部署 Elasticsearch，启动时有一系列“启动检查”，系统配置不达标就不让上生产。',add:[A('es','🔎','Elasticsearch',320,170,{kind:'item',tone:'primary'})]},
  {say:'文件描述符和线程数要够多：ES 同时打开大量文件和连接。',add:[A('fd','📂','文件描述符 · 线程数',150,60,{kind:'tag'})]},
  {say:'vm.max_map_count 要调大，8.x 常见最低要求 262144，Lucene 大量使用内存映射文件。',add:[A('mm','🗺️','vm.max_map_count',490,60,{kind:'tag',tone:'warm'})]},
  {say:'关闭或限制 swap，避免 JVM 被换到磁盘；JVM 堆别设太大，要给操作系统文件缓存留出内存。',add:[A('sw','🚫','关闭 swap',150,280,{kind:'tag',tone:'bad'}),A('heap','☕','JVM 堆 + 留文件缓存',490,280,{kind:'tag'})]},
  {say:'还要检查磁盘空间水位、磁盘延迟、时钟、DNS、网络和 TLS。容器里有些参数要在宿主机上改。',bubble:{who:'es',text:'别为了能启动\n就关掉检查'}},
  {say:'记住几个关键项。',memo:['文件句柄、max_map_count','swap、堆和文件缓存']},
 ]},
 'q-df91f29d9c73e36c':{title:'用 Go 操作 Elasticsearch',beats:[
  {say:'用官方 go-elasticsearch 客户端，版本要和 ES 的主版本匹配。客户端创建一次、全局复用，连接也就复用了。',add:[A('app','🐹','Go 服务',110,170,{tone:'primary'}),A('cli','🔌','es 客户端（复用）',320,170,{kind:'item'}),A('es','🔎','Elasticsearch',530,170,{kind:'item'})],send:[{from:'app',to:'cli'},{from:'cli',to:'es'}]},
  {say:'配置好 TLS、认证、超时，每次请求带上 context，可以取消和超时。',add:[A('cfg','🔐','TLS · 认证 · 超时 · ctx',320,60,{kind:'tag'})]},
  {say:'批量写入用 Bulk。注意：HTTP 返回 200，里面也可能有部分条目失败，要逐条检查结果。',add:[A('bulk','📦','Bulk：200 也可能有失败项',320,290,{kind:'tag',tone:'warm'})],send:[{from:'app',to:'bulk'}]},
  {say:'只对可重试的错误做有限次退避重试；用稳定的文档 ID，重试也不会多出重复文档。',bubble:{who:'app',text:'同一个 ID，\n重试也不重复'}},
  {say:'低层 API 的响应体要读完并关闭，检查状态码和错误字段。分页用 search_after，别一次性把全部结果读进内存。',memo:['复用客户端，带 ctx 和超时','Bulk 逐条检查结果']},
 ]},
 'q-255ea12bba3109d1':{title:'怎么优化 Elasticsearch 性能',beats:[
  {say:'第一步先分清：慢的是查询、写入，还是 GC、磁盘，或者某个热点分片。看慢日志、拒绝任务、merge、堆和页缓存。',add:[A('es','🔎','ES 集群',320,170,{kind:'item',tone:'warm'}),A('mon','📊','慢日志 · 监控',320,50,{kind:'tag'})]},
  {say:'设计层面：按数据量和并发规划分片数；写清楚 mapping，避免字段爆炸。',add:[A('d','🗂️','分片规划 · 显式 mapping',130,290,{kind:'tag',tone:'ok'})]},
  {say:'查询层面：精确条件放到 filter 里（不算分、可缓存）；少用 script、通配符和深分页。',add:[A('q','🔍','filter · 少用通配符',130,170,{kind:'tag',tone:'ok'})]},
  {say:'写入层面：用合适大小的 bulk 和受控并发；按可见性要求调大 refresh_interval。大批量重建时才考虑临时减少副本，并接受风险。',add:[A('w','✏️','bulk · refresh_interval',510,170,{kind:'tag',tone:'ok'})]},
  {say:'force merge 一般只用在不再写入的索引上，不是日常万能药。',add:[A('fm','⚠️','force merge 慎用',510,290,{kind:'tag',tone:'warm'})],tone:{es:'ok'}},
  {say:'记住思路。',memo:['先定位是哪一环慢','查询用 filter，写入用 bulk']},
 ]},
};
