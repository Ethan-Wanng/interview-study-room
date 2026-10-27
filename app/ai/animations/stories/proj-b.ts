import {A,type Story} from '../story';

// 项目面试题动画（二）：企业网盘搜索、微博评论与计数。
export const projB:Record<string,Story>={
 'q-bb52f073482e6b98':{title:'企业网盘搜索的整体架构',beats:[
  {say:'员工上传了一份合同 PDF。文件元数据和权限存在事务数据库里，它是权威；文件内容放对象存储。',add:[A('up','🧑','员工上传',80,90),A('meta','🗄️','元数据 + 权限（权威）',280,90,{kind:'item',tone:'primary'}),A('obj','📦','对象存储（文件内容）',280,220,{kind:'item'})],send:[{from:'up',to:'meta'},{from:'up',to:'obj'}]},
  {say:'上传或变更产生事件，异步任务去解析文件、抽取文本，再更新 ES 索引。',add:[A('parse','⚙️','解析 · 抽取文本',490,150,{kind:'item',tone:'warm'}),A('es','🔎','ES 索引',490,280,{kind:'item',tone:'ok'})],send:[{from:'obj',to:'parse',text:'变更事件'},{from:'parse',to:'es'}]},
  {say:'解析失败可以重试，坏文件单独隔离。事件带上稳定的 file_id 和版本号，重复、乱序的事件也能正确处理。',sub:{parse:'失败重试 · 按版本处理'}},
  {say:'查询服务结合关键词、结构化过滤和权限过滤返回结果。',add:[A('q','🔍','查询服务',80,300,{tone:'primary'})],send:[{from:'q',to:'es'}]},
  {say:'删除、收回权限后索引可能还没更新，所以下载时仍要按数据库里的权威权限再校验一次——搜得到不等于有权限。',bubble:{who:'meta',text:'下载前我再\n查一次权限'}},
  {say:'记住架构。',memo:['数据库管权限，对象存储放文件','事件驱动解析和索引，下载再鉴权']},
 ]},
 'q-d3c8669e41992c81':{title:'网盘搜索的索引怎么建模',beats:[
  {say:'每份文件建一条文档：tenant_id、file_id、版本、名称、路径、类型、大小、时间、所有者、可见范围和抽取的正文。',add:[A('doc','📄','文件文档',320,70,{kind:'item',tone:'primary'})]},
  {say:'精确过滤的字段用 keyword、数字、日期类型；正文用 text 做全文检索；文件名同时建 keyword 和 text 两个子字段。',add:[A('k','🏷️','keyword / 数字 / 日期：过滤',140,190,{kind:'tag',tone:'ok'}),A('t','📝','text：全文 · 名称多字段',500,190,{kind:'tag',tone:'ok'})]},
  {say:'超大的正文可以按片段建索引，每段保留文件级的 file_id。',add:[A('chunk','🧩','大文本按片段索引',140,300,{kind:'tag'})]},
  {say:'权限要考虑继承和群组变化，别把所有成员都展开写进一个无限大的 ACL 字段。',add:[A('acl','🔐','权限：继承 · 群组',500,300,{kind:'tag',tone:'warm'})],bubble:{who:'acl',text:'别把 1 万个\n用户 ID 塞进来'}},
  {say:'租户隔离可以共享索引并强制按 tenant_id 过滤，也可以每个租户独立索引，要权衡分片数量、隔离性和热点。',memo:['过滤用 keyword，全文用 text','权限别全展开，租户要隔离']},
 ]},
 'q-89147ac59229e9fa':{title:'网盘搜索的性能优化',beats:[
  {say:'先定位慢在哪：用查询追踪和 ES 慢日志，看是过滤、评分、聚合，还是某个分片是热点。',add:[A('slow','🐢','慢查询',320,70,{kind:'item',tone:'warm'})]},
  {say:'权限和结构化条件放进 filter：不参与评分，还能被缓存。限制高成本的通配符、深分页和大聚合，分页用 PIT + search_after。',add:[A('q','🔍','filter 前置 · search_after',150,190,{kind:'tag',tone:'ok'})]},
  {say:'缓存高频结果时，缓存键必须包含租户和权限版本，否则会把别人的结果给错人——越权。',add:[A('cache','⚡','缓存键含租户 + 权限版本',490,190,{kind:'tag',tone:'warm'})],bubble:{who:'cache',text:'别把 A 的结果\n给了 B',tone:'bad'}},
  {say:'写入用 bulk，同一文件的多次更新去重合并；解析任务分块处理、控制并发。',add:[A('w','✏️','bulk · 合并更新 · 控制并发',320,300,{kind:'tag',tone:'ok'})],tone:{slow:'ok'}},
  {say:'用一套基准查询同时验证：延迟、召回率，以及权限是否仍然正确。',memo:['filter 前置，避免深分页','缓存带权限版本，防越权']},
 ]},
 'q-520bd2250793bc5e':{title:'高并发微博评论系统',beats:[
  {say:'发一条评论：先做认证、风控、幂等校验，然后写进数据库持久化。',add:[A('u','🧑','用户',80,170),A('api','🛡️','认证 · 风控 · 幂等',240,170,{kind:'item',tone:'primary'}),A('db','🗄️','评论库',420,80,{kind:'item',tone:'ok'})],send:[{from:'u',to:'api'},{from:'api',to:'db'}]},
  {say:'写库成功后发事件（用 outbox 保证不漏），再异步更新缓存、计数、通知和审核结果。',add:[A('ev','📨','事件（outbox）',420,250,{kind:'tag',tone:'warm'}),A('side','🧩','缓存 · 计数 · 通知 · 审核',522,170,{kind:'tag'})],send:[{from:'db',to:'ev'},{from:'ev',to:'side'}]},
  {say:'读的时候，一级评论列表和楼中楼回复分开查，都用游标分页；热门内容用分层缓存。',add:[A('read','📖','一级 / 回复分开 · 游标分页',240,310,{kind:'tag',tone:'ok'})]},
  {say:'删除、审核、发布由状态机管理。一条超热门微博会成为热点，要单独控制它的缓存和计数压力。',bubble:{who:'db',text:'明星微博\n单独保护'}},
  {say:'不能把所有评论都塞进一个 Redis 大 key。',memo:['先持久化，再事件异步更新','读写分开，游标分页，防热点']},
 ]},
 'q-0b3b2ad9786d85b5':{title:'微博评论的表结构设计',beats:[
  {say:'一张 comments 表：id、post_id、user_id、parent_id、root_id、reply_to_user_id、content、status、时间。',add:[A('t','🗂️','comments 表',320,60,{kind:'item',tone:'primary'})]},
  {say:'root_id 指向这一串回复最开始的那条一级评论，用来找出“楼中楼”；parent_id 表示直接回复的是哪一条。',add:[A('root','💬','一级评论（root）',150,180,{kind:'tag'}),A('rep','↪️','回复（root_id = 一级评论）',470,180,{kind:'tag'})],send:[{from:'rep',to:'root',text:'root_id'}]},
  {say:'按查询模式建索引：一级列表用 (post_id, status, created_at, id)；回复列表用 (root_id, status, created_at, id)。具体顺序用实际查询验证。',add:[A('idx','🌲','索引按查询模式设计',320,290,{kind:'tag',tone:'ok'})]},
  {say:'数据量大了可以按 post_id 分片，但热门帖子仍可能成为热点。',bubble:{who:'t',text:'热门帖子\n还是会热'}},
  {say:'拆正文、冷热归档、路由扩展都要先算清收益，一开始别过度拆表。',memo:['root_id 找楼中楼，parent_id 找直接回复','索引跟着查询走']},
 ]},
 'q-06d4d7964ebf2ecc':{title:'海量数据的微博计数器',beats:[
  {say:'一条热门微博，每秒几万次点赞。计数用原子的增减来承接实时更新。',add:[A('likes','👍','点赞洪流',90,170,{tone:'warm'}),A('cnt','🔢','计数器',320,170,{kind:'item',tone:'primary'})],send:[{from:'likes',to:'cnt',text:'INCR'}]},
  {say:'太热的对象，一个计数 key 扛不住：拆成多个分片计数，读取时求和或定期汇总，用一点点即时性换吞吐。',add:[A('s1','🔢','分片 1',540,80,{kind:'tag',tone:'ok'}),A('s2','🔢','分片 2',540,170,{kind:'tag',tone:'ok'}),A('s3','🔢','分片 3',540,260,{kind:'tag',tone:'ok'})],send:[{from:'cnt',to:'s1'},{from:'cnt',to:'s2'},{from:'cnt',to:'s3'}]},
  {say:'坑：事件至少投递一次，重复消费就会多加。每个事件要有唯一 ID 或版本，消费端去重；取消点赞也要防止重复扣减。',add:[A('dup','🔁','事件去重 · 防重复扣减',320,310,{kind:'tag',tone:'warm'})]},
  {say:'显示的数字允许短暂不准（最终一致），但要保留权威的明细记录，定期重算对账。',bubble:{who:'cnt',text:'显示略有延迟\n没关系'}},
  {say:'注意：扣费、库存这类必须准确的场景，不能套用展示计数的方案。',memo:['原子增减 + 热点分片','事件去重，明细对账']},
 ]},
};
