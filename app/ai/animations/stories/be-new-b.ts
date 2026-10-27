import {A,type Story} from '../story';

// 新增后端面试题动画（二）：网络、项目设计与故障排查。
export const beNewB:Record<string,Story>={
 'q-dd0a574cb5397142':{title:'TCP 拥塞控制：先试探，再加速，堵了就减速',beats:[
  {say:'发送方有一个拥塞窗口 cwnd，决定一次能发多少。实际能发的量取它和对方接收窗口中较小的那个。',add:[A('snd','💻','发送方',100,170,{tone:'primary'}),A('cwnd','🪟','cwnd',320,80,{kind:'tag',tone:'primary'}),A('net','🌐','网络',540,170,{kind:'item'})]},
  {say:'慢启动：从很小开始，每个往返大约翻倍：1、2、4、8……',sub:{cwnd:'1 → 2 → 4 → 8'},send:[{from:'snd',to:'net',text:'试探'}]},
  {say:'到达慢启动阈值 ssthresh 后进入拥塞避免：每个往返只加一点，慢慢涨。',add:[A('ca','📈','拥塞避免：线性增长',320,300,{kind:'tag',tone:'ok'})],sub:{cwnd:'16 → 17 → 18'}},
  {say:'超时重传：说明堵得厉害，ssthresh 减半，cwnd 回到很小，重新慢启动。',tone:{net:'bad'},sub:{cwnd:'回到 1'},bubble:{who:'net',text:'太挤了！',tone:'bad'}},
  {say:'收到 3 个重复 ACK：快重传，马上补发丢的包；再快恢复，cwnd 降到一半左右继续发，不用从头来。',tone:{net:'base'},sub:{cwnd:'降到一半'},add:[A('fr','⚡','快重传 + 快恢复',540,300,{kind:'tag',tone:'warm'})]},
  {say:'Linux 默认 CUBIC，也可以选 BBR（按测出的带宽和时延发送）。拥塞控制保护网络，流量控制保护接收方，是两回事。',memo:['慢启动翻倍，拥塞避免线性','超时回到起点，重复 ACK 减半']},
 ]},
 'q-467a0dc0db3571c5':{title:'HTTP/1.1、HTTP/2、HTTP/3',beats:[
  {say:'HTTP/1.1：文本协议，一条连接上的请求基本要排队，前面慢后面都等（队头阻塞）。浏览器只好开多条连接。',add:[A('h1','🚶','HTTP/1.1：排队',150,80,{kind:'item',tone:'warm'})]},
  {say:'HTTP/2：二进制分帧，一条 TCP 连接上同时跑很多个流（多路复用），还压缩头部。',add:[A('h2','🛣️','HTTP/2：多路复用',480,80,{kind:'item',tone:'ok'})]},
  {say:'但 HTTP/2 底层还是 TCP：丢一个包，整条连接上的所有流都得等重传，TCP 层的队头阻塞还在。',add:[A('tcp','🧱','TCP 丢包 → 全部等待',480,200,{kind:'tag',tone:'bad'})]},
  {say:'HTTP/3：基于 QUIC，跑在 UDP 上，每个流独立重传，一个流丢包不影响别的；集成 TLS 1.3，握手更快；换网络连接也不断。',add:[A('h3','🚀','HTTP/3：QUIC · 流独立',320,310,{kind:'item',tone:'primary'})]},
  {say:'代价：有些网络会限制 UDP，服务端和中间设备也要支持。三个版本的语义（方法、状态码、头部）基本一样。',memo:['1.1 排队，2 多路复用','3 用 QUIC，流之间不互相阻塞']},
 ]},
 'q-cb0c4508f2549bbd':{title:'DNS 解析：一层层问路',beats:[
  {say:'输入 www.example.com。先查本地：浏览器缓存、系统缓存、hosts 文件。',add:[A('me','💻','你的电脑',90,170,{tone:'primary'})]},
  {say:'没命中，就问递归解析器（运营商 DNS 或 8.8.8.8）。它没有缓存时，替你一层层去问。',add:[A('rec','🧭','递归解析器',290,170,{kind:'item',tone:'warm'})],send:[{from:'me',to:'rec'}]},
  {say:'先问根服务器：“.com 归谁管？”再问 .com 顶级域服务器：“example.com 归谁管？”',add:[A('root','🌍','根服务器',480,60,{kind:'tag'}),A('tld','🏷️','.com 服务器',540,170,{kind:'tag'})],send:[{from:'rec',to:'root'},{from:'rec',to:'tld'}]},
  {say:'最后问 example.com 的权威服务器，拿到 A / AAAA 记录（IP 地址），返回给你。',add:[A('auth','🏛️','权威服务器：93.184.x.x',480,290,{kind:'tag',tone:'ok'})],send:[{from:'rec',to:'auth'},{from:'rec',to:'me',text:'IP',tone:'ok'}]},
  {say:'每一级结果按 TTL 缓存，所以改了 DNS 要等一会儿才生效。默认用 UDP 53，响应太大时用 TCP；加密可以用 DoH、DoT。',memo:['本地缓存 → 递归解析器','根 → 顶级域 → 权威，按 TTL 缓存']},
 ]},
 'q-3d7048a20ee437b3':{title:'设计一个短链接系统',beats:[
  {say:'用户提交一个很长的网址，系统返回一个短码，比如 s.cn/aZ3k9Q。',add:[A('u','🧑','用户',80,170),A('svc','🔗','短链服务',280,170,{kind:'item',tone:'primary'})],send:[{from:'u',to:'svc',text:'长网址'}]},
  {say:'生成短码：发号器给一个唯一整数，转成 62 进制（0-9a-zA-Z），7 位就能表示三万多亿个；也可以哈希取前几位，但要处理冲突。',add:[A('id','🔢','发号器 → 62 进制',280,60,{kind:'tag',tone:'ok'})]},
  {say:'存一张 code → url 的映射表，code 加唯一索引。',add:[A('db','🗄️','code → url',500,250,{kind:'item'})],send:[{from:'svc',to:'db'}]},
  {say:'访问短码：读多写少，热门短码放 Redis；不存在的短码也缓存空值，防穿透。302 跳转方便统计点击，301 会被浏览器缓存。',add:[A('cache','⚡','Redis 缓存',500,90,{kind:'tag',tone:'ok'})],send:[{from:'cache',to:'u',text:'302 跳转',tone:'ok'}]},
  {say:'还要考虑：限流和恶意网址检测，过期时间，点击统计异步写入；短码要不可预测，防止被逐个遍历。',bubble:{who:'svc',text:'别让人猜出\n下一个短码'}},
  {say:'记住设计要点。',memo:['发号器 + 62 进制','缓存读、302 统计、防滥用']},
 ]},
 'q-6cfed07bfb92e432':{title:'订单超时自动取消',beats:[
  {say:'下单 30 分钟不付款，就要自动取消并释放库存。',add:[A('o','🧾','订单：待支付',320,70,{kind:'item',tone:'primary'})]},
  {say:'方案一 定时扫表：每分钟查“待支付且超过 30 分钟”的订单。简单，但有延迟，数据多时压力大，要建索引、分批处理。',add:[A('scan','🔄','定时扫表',130,190,{kind:'tag'})]},
  {say:'方案二 延迟消息：下单时发一条 30 分钟后才投递的消息，到点后检查订单状态。方案三 Redis 有序集合，score 存到期时间，后台轮询。',add:[A('mq','⏰','延迟消息 · Redis ZSet',490,190,{kind:'tag',tone:'ok'})]},
  {say:'关键：取消要带状态条件 UPDATE … WHERE status = 待支付。用户恰好这时付款，两个操作只有一个能成功。',add:[A('pay','💳','用户刚好付款',490,290,{tone:'warm'})],send:[{from:'pay',to:'o',text:'支付'},{from:'mq',to:'o',text:'取消',tone:'warm'}],bubble:{who:'o',text:'按状态更新，\n只有一个成功'}},
  {say:'释放库存要幂等，防止重复补回；就算用了延迟消息，也保留扫表作为兜底。',add:[A('safe','🛡️','幂等释放 + 扫表兜底',130,310,{kind:'tag',tone:'ok'})]},
  {say:'记住设计。',memo:['扫表、延迟消息、ZSet','按状态条件更新，扫表兜底']},
 ]},
 'q-8fcc9f406b2f5246':{title:'线上接口突然超时怎么排查',beats:[
  {say:'告警：下单接口大量超时。第一步先看影响范围：全部接口还是一个？所有实例还是部分？从几点开始？',add:[A('alarm','🚨','下单接口超时',320,60,{kind:'item',tone:'bad'})]},
  {say:'对照那个时间点：有没有发布、改配置、流量突增？必要时先回滚、扩容或限流止血。',add:[A('stop','🩹','回滚 · 扩容 · 限流',130,170,{kind:'tag',tone:'warm'})]},
  {say:'沿链路定位：用链路追踪看耗时集中在哪——本服务、数据库、缓存、下游服务还是网络。',add:[A('trace','🧵','链路追踪',490,170,{kind:'tag',tone:'primary'})]},
  {say:'按方向深入：数据库看慢查询、锁等待、连接池；本服务看 CPU、GC、goroutine 数和 pprof；下游看延迟和错误率；网络看丢包、重传、DNS。',add:[A('deep','🔍','慢查询 · 连接池 · pprof · 重传',320,280,{kind:'item'})],send:[{from:'trace',to:'deep'}]},
  {say:'修复后用同样流量验证 P99 和错误率；复盘：补监控告警、超时和熔断配置，写成预案。全程保留现场证据。',tone:{alarm:'ok'},sub:{alarm:'已恢复'}},
  {say:'记住排查顺序。',memo:['先看范围和变更，先止血','链路定位，逐层深入，复盘']},
 ]},
};
