import {A,type Story} from '../story';

// 数据库面试题动画（七）：Elasticsearch 选主、倒排索引、写入、段、查询类型。
export const dbEsA:Record<string,Story>={
 'q-f6cf502061f92bbc':{title:'Elasticsearch 怎么选出 master',beats:[
  {say:'ES 集群里有一个 master 节点，负责管理集群状态：有哪些索引、分片分配在哪。',add:[A('m','👑','master',320,70,{tone:'primary'}),A('d1','🖥️','数据节点',150,300,{kind:'tag'}),A('d2','🖥️','数据节点',490,300,{kind:'tag'})]},
  {say:'只有“可当 master”的候选节点参与选举。生产环境常放 3 个，分布在不同故障域。',add:[A('c1','🙋','候选 A',150,180),A('c2','🙋','候选 B',490,180)],sub:{m:'候选 C（当前 master）'}},
  {say:'master 挂了。剩下的候选节点发起选举，得到投票配置中多数派支持的那个当选。',tone:{m:'bad'},send:[{from:'c2',to:'c1',text:'投你一票',tone:'ok'}]},
  {say:'A 当选新 master。任期编号增加，旧 master 就算恢复，也不能再提交集群状态，避免“两个皇帝”（脑裂）。',tone:{c1:'ok'},sub:{c1:'新 master（任期 +1）'},bubble:{who:'c1',text:'我是第 8 任 master'}},
  {say:'3 个候选能容忍 1 个故障；失去多数派时，宁可暂停也要保证集群状态安全。',add:[A('maj','🗳️','多数派 = 2 / 3',320,320,{kind:'tag',tone:'warm'})]},
  {say:'cluster.initial_master_nodes 只在第一次组建集群时用；旧版的 minimum_master_nodes 配置不能套到 7.x 以后。',memo:['候选节点多数派投票','任期防止旧主继续发号']},
 ]},
 'q-50f13c1c6dc21a1d':{title:'倒排索引：从“词”找“文档”',beats:[
  {say:'三篇文章：①“Go 并发编程”②“Go 内存管理”③“Redis 内存淘汰”。要找所有提到“内存”的文章。',add:[A('d1','📄','① Go 并发编程',110,80,{kind:'tag'}),A('d2','📄','② Go 内存管理',110,170,{kind:'tag'}),A('d3','📄','③ Redis 内存淘汰',110,260,{kind:'tag'})]},
  {say:'一篇篇翻太慢。先用分析器把文本拆成词，并统一大小写等格式。',add:[A('an','✂️','分析器：分词',320,170,{tone:'primary'})],send:[{from:'d1',to:'an'},{from:'d2',to:'an'},{from:'d3',to:'an'}]},
  {say:'然后反过来建一张表：每个词 → 出现在哪些文档里。这就是倒排索引。',add:[A('inv','📇','内存 → ②③   Go → ①②',505,170,{kind:'item',tone:'ok'})],send:[{from:'an',to:'inv'}]},
  {say:'查“内存”直接查表，马上得到②③；查“Go 内存”就把两个列表求交集，得到②。',add:[A('q','🔍','查：内存',520,300,{kind:'tag',tone:'warm'})],send:[{from:'q',to:'inv'}],bubble:{who:'inv',text:'②、③'}},
  {say:'表里还可以记词频和位置，位置信息用来做短语匹配。text 字段会分词，keyword 字段保持整体值。',memo:['词 → 文档列表','text 分词，keyword 整体']},
 ]},
 'q-583f8519476cc645':{title:'ES 写入一条数据的过程',beats:[
  {say:'客户端发来一条写请求，先到协调节点。它根据 routing（默认是文档 id）算出该放到哪个主分片。',add:[A('cl','🧑‍💻','客户端',80,170),A('co','🧭','协调节点',240,170,{tone:'primary'})],send:[{from:'cl',to:'co',text:'写入'}]},
  {say:'主分片验证并执行写入，再复制到副本分片，按复制规则返回成功。',add:[A('p','📦','主分片',375,90,{kind:'item',tone:'ok'}),A('r','📦','副本分片',375,260,{kind:'item'})],send:[{from:'co',to:'p'},{from:'p',to:'r',text:'复制'}]},
  {say:'在分片内部：数据先进入内存缓冲区，同时写 translog（事务日志），防止宕机丢失。',add:[A('buf','🧺','内存缓冲 + translog',540,90,{kind:'tag',tone:'warm'})],move:{p:[375,90]}},
  {say:'refresh（默认约每秒）把缓冲区写成新的 segment，这时才能被搜索到——所以叫“近实时”。refresh 不等于 fsync。',add:[A('seg','🧱','新 segment（可搜索）',540,190,{kind:'tag',tone:'ok'})],send:[{from:'buf',to:'seg',text:'refresh'}]},
  {say:'flush 生成 Lucene 提交点，把数据持久化，并清理 translog。按 id 实时 GET 能读到，search 要等 refresh。',add:[A('fl','💽','flush：持久化',540,290,{kind:'tag'})]},
  {say:'业务确实要“写完马上能搜到”，可以用 refresh=wait_for，但要权衡性能。',memo:['路由到主分片 → 复制副本','refresh 可搜，flush 持久化']},
 ]},
 'q-f2a89c6060d800c7':{title:'segment 为什么不可变',beats:[
  {say:'ES 底层的 Lucene 把索引存成一个个 segment（段），段写好后就不再修改。',add:[A('s1','🧱','段 1',150,100,{kind:'item'}),A('s2','🧱','段 2',320,100,{kind:'item'}),A('s3','🧱','段 3',490,100,{kind:'item'})]},
  {say:'好处：不用对文件随机修改，多个线程可以放心并发读，不需要读写锁；文件系统缓存和压缩也更好用。',add:[A('rd','👥','并发读取',320,240,{tone:'ok'})],send:[{from:'rd',to:'s2',tone:'ok'}]},
  {say:'那更新一条文档怎么办？旧版本在原来的段里被“标记删除”，新版本写到新的段里。',add:[A('s4','🧱','段 4（新版本）',490,240,{kind:'item',tone:'ok'})],sub:{s1:'旧文档：标记删除'},tone:{s1:'warm'}},
  {say:'段越来越多会拖慢查询，后台的 merge 会把小段合并成大段，并真正清掉被删除的文档。',add:[A('mg','🔀','merge 合并',150,300,{kind:'tag',tone:'primary'})],send:[{from:'s1',to:'mg'},{from:'s2',to:'mg'}]},
  {say:'“不可变”指段的核心索引内容，不代表整个索引只增不删。频繁更新和大量小段会增加合并成本。',memo:['段写好不改，利于并发读','更新 = 标记删除 + 写新段']},
 ]},
 'q-fe61f34b684b17a6':{title:'term、match、match_phrase 的区别',beats:[
  {say:'文档里有一句“Go Is Fast”，存进 text 字段时会被分析成小写的词：go、is、fast。',add:[A('doc','📄','索引里的词：go · is · fast',320,70,{kind:'item',tone:'primary'})]},
  {say:'term：拿你给的词原样去精确匹配，不做分析。term "Go" 查不到，因为索引里是小写的 go。适合 keyword、数字等精确值。',add:[A('t','🎯','term "Go"',120,200,{kind:'tag',tone:'bad'})],send:[{from:'t',to:'doc',tone:'bad'}]},
  {say:'match：先把输入分析成词，再去匹配，多个词默认是 OR。match "GO fast" 能查到。',add:[A('m','🔍','match "GO fast"',320,200,{kind:'tag',tone:'ok'})],send:[{from:'m',to:'doc',tone:'ok'}]},
  {say:'match_phrase：分析后还要求词的顺序和位置连在一起。“fast go” 顺序不对就查不到；slop 可以允许一点距离。',add:[A('p','🧵','match_phrase "go is"',520,200,{kind:'tag',tone:'ok'})],send:[{from:'p',to:'doc',tone:'ok'}]},
  {say:'常见的坑：对 text 字段用 term 查，因为大小写或分词不同，怎么都查不到。',bubble:{who:'t',text:'我只认原样的词'}},
  {say:'记住三种查询。',memo:['term：不分析，精确匹配','match 分词；phrase 还看顺序']},
 ]},
 'q-dc8f488334ac56de':{title:'明明写进去了，match 却查不到',beats:[
  {say:'刚写入一条文档，用 match 一查却查不到。别慌，按顺序排查。',add:[A('dev','🕵️','你',70,170,{tone:'primary'}),A('es','🔎','ES',230,170,{kind:'item'})],send:[{from:'dev',to:'es',text:'match 查询'}]},
  {say:'第一步：GET 能取到但 search 搜不到？可能只是还没 refresh，等一秒或者 refresh 一下。',add:[A('c1','⏱️','还没 refresh？',470,60,{kind:'tag'})]},
  {say:'第二步：是不是查错了索引或别名？routing、租户过滤、权限过滤对不对？',add:[A('c2','🗂️','索引 · routing · 过滤条件',470,130,{kind:'tag'})]},
  {say:'第三步：看 mapping，字段是 text 还是 keyword；用 _analyze 看文本到底被分成了哪些词，大小写、停用词对不对。',add:[A('c3','✂️','mapping + _analyze',470,200,{kind:'tag',tone:'warm'})]},
  {say:'第四步：operator、minimum_should_match 设得太严？字段是不是 index:false？bulk 写入有没有单条失败没检查？',add:[A('c4','📋','operator · index:false · bulk 结果',470,270,{kind:'tag'})]},
  {say:'方法：准备最小的一条文档和最小的查询，一个条件一个条件去掉，定位原因。',memo:['先看是否 refresh','再查 mapping 和分词']},
 ]},
};
