import {A} from '../story';
import type {LazyEpisode} from './engine';

// Go 懒人模式第 7 集：一个请求的一生与性能侦探（Web 服务、中间件、事务、配置、优雅关闭、pprof、trace、性能优化）。
export const goLazy7:LazyEpisode={id:'lazy-go-7',subject:'go',tier:3,levels:['go-engineering'],icon:'🕵️',title:'性能侦探：一个慢请求的破案记',summary:'跟着一个下单请求走完 Go Web 服务的一生，再请出性能侦探用 pprof 和 trace 找出慢的真凶。',beats:[
 {say:'这一集的主角，是一个普普通通的下单请求，我们叫它小单。它从用户的手机出发，穿过网络，敲响了 Gopher 咖啡服务器的大门。门口守着的，是 Go 标准库里的 http.Server。',add:[A('req','📨','请求小单',110,170,{tone:'primary'}),A('srv','🖥️','http.Server',420,90,{kind:'item',tone:'primary'})],send:[{from:'req',to:'srv'}]},
 {say:'服务器一直在门口 Accept 新连接，每来一个连接，就派一个 goroutine 专门接待。小单被领进门，请求被读出来、解析好，交给路由。Go 1.22 起，标准库的路由就能写 "POST /orders/{id}" 这样带方法和参数的规则了。',add:[A('route','🧭','路由 POST /orders',420,200,{kind:'tag'})],send:[{from:'srv',to:'route'}]},
 {say:'正式见到业务代码之前，小单要先穿过几层中间件，像穿过几道安检门。第一道是日志，记下进门的时间；第二道是鉴权，看看有没有合法的令牌；第三道是恢复，万一里面出了 panic，它会把错误接住，返回一个 500，而不是让整个服务崩溃。',drop:['route'],add:[A('mw','🚪','日志 → 鉴权 → recover',420,200,{kind:'item',tone:'warm'})],send:[{from:'req',to:'mw'}]},
 {say:'中间件是一层套一层的洋葱。请求从外往里穿，响应再从里往外回。日志中间件在调用下一层之后，才能算出整个请求花了多少时间。鉴权失败时直接 Abort，后面的层都不会再执行。',bubble:{who:'mw',text:'进门记时间，出门算耗时'}},
 {say:'到了业务处理器，第一件事是检查参数。小单说要买负一杯咖啡，处理器根据结构体上的校验标签，立刻把它挡了回去，返回 400。永远不要相信外面传进来的数据，这是 Web 服务的第一条军规。',drop:['mw'],add:[A('valid','🔍','参数校验：数量 ≥ 1',420,200,{kind:'tag',tone:'ok'})]},
 {say:'参数没问题，接下来要同时做两件事：扣库存和创建订单。它们必须在一个数据库事务里，要么都成功，要么都回滚。用 ORM 时，事务回调里的每一条语句都要用事务对象 tx，一不小心用了外面的 db，那条语句就不在事务里了。',drop:['valid'],add:[A('tx','🗄️','事务：扣库存 + 建订单',420,200,{kind:'item',tone:'primary'})]},
 {say:'处理过程中，小单身上一直带着一个 context。它记着这个请求的截止时间，也能感知用户是不是已经离开。查数据库、调支付，都把这个 ctx 传下去，用户一关页面，下游的工作也能及时停下。',add:[A('ctx','⏱️','ctx 一路传下去',420,310,{kind:'tag',tone:'ok'})]},
 {say:'服务的配置放在 viper 里，比如每个用户的限购数量。运营半夜改了配置文件，viper 监听到变化，服务把新配置解析、校验后，用原子指针一次性替换，正在处理的请求不会看到改了一半的配置。',drop:['tx','ctx'],add:[A('cfg','⚙️','配置热更新：原子替换',420,200,{kind:'tag',tone:'primary'})]},
 {say:'小单顺利完成，带着 201 回到了用户手机上。可就在这时，发布系统发来一个信号：新版本要上线了，旧服务请准备退场。收到 SIGTERM 的服务没有立刻倒下，而是调用 Shutdown：不再接新请求，等手上的请求都处理完，再关闭连接池。这就是优雅关闭。',drop:['cfg'],add:[A('sig','📨','SIGTERM → Shutdown',420,200,{kind:'item',tone:'warm'})],send:[{from:'srv',to:'req',text:'201',tone:'ok'}]},
 {say:'新版本上线后，问题来了：下单接口的 P99 延迟从 80 毫秒涨到了 900 毫秒。小鹿请来了一位性能侦探，一只戴着放大镜的狐狸。侦探说：破案的第一条规矩，先取证，别猜。',drop:['sig','req'],add:[A('fox','🦊','性能侦探',110,170,{tone:'primary'})],tone:{srv:'bad'},sub:{srv:'P99 900ms'}},
 {say:'第一件取证工具是 pprof。服务早就引入了 net/http/pprof，只在内网端口开放。侦探采集了 30 秒的 CPU 剖析，打开火焰图。火焰图里，越宽的格子，代表占用 CPU 越多。',add:[A('flame','🔥','CPU 火焰图',420,200,{kind:'item',tone:'primary'})],send:[{from:'fox',to:'flame'}]},
 {say:'一块特别宽的格子跳了出来：regexp.MustCompile 占了 35%。原来新版本在每个请求里都重新编译一次校验手机号的正则。侦探把正则提到包级变量，只编译一次，CPU 立刻降了下来。',add:[A('regex','🧩','每个请求都编译正则',420,310,{kind:'tag',tone:'bad'})]},
 {say:'但延迟只降了一半。CPU 不忙，时间去哪了？侦探换上第二件工具：执行追踪 trace。它记录的是一条时间线：每个 goroutine 什么时候在运行，什么时候在等锁，什么时候在等网络，GC 又停了多久。',drop:['flame','regex'],add:[A('trace','🎞️','go tool trace 时间线',420,200,{kind:'item',tone:'primary'})],tone:{fox:'warm'}},
 {say:'时间线上，很多 goroutine 都在同一把锁前面排着长队。新版本加了一个全局的统计 map，每个请求都要锁住它写一下。侦探把它改成按 CPU 分片的计数，或者用原子操作，锁等待一下子消失了。',add:[A('lock','🔒','全局锁排长队',420,310,{kind:'tag',tone:'bad'})],sub:{trace:'都在等同一把锁'}},
 {say:'第三件工具是内存剖析。heap profile 显示，每个请求都分配了一大块临时缓冲区，GC 每秒要跑好几次。侦探用 sync.Pool 把缓冲区复用起来，预先给切片设好容量，再用 -gcflags="-m" 检查哪些变量不必要地逃逸到了堆上。',drop:['lock','trace'],add:[A('heap','🧠','heap：分配太多',420,200,{kind:'item',tone:'warm'})]},
 {say:'还有几个小技巧也派上了用场。克隆切片用 slices.Clone，一次分配一次复制；删除元素不在乎顺序时，用最后一个元素补位；大结构体遍历用下标，避免每轮复制；确定只读的场景下，用 unsafe.String 做零拷贝转换，但要非常小心。',add:[A('tips','🧰','Clone · 补位删除 · 下标遍历',420,310,{kind:'tag'})]},
 {say:'最后是 JSON。返回给前端的订单列表很大，encoding/json 靠反射工作，分配很多。侦探先让接口只返回需要的字段，再用 Encoder 直接写到响应里，最后才考虑换成更快的 JSON 库，并且先验证兼容性。',drop:['tips','heap'],add:[A('json','📦','少返回 · 流式 · 再换库',420,200,{kind:'tag',tone:'ok'})]},
 {say:'修复全部完成，侦探在同样的负载下重新压测：P99 回到了 70 毫秒，比出问题前还快。他把每一步的证据和数据写进复盘文档，又在流水线里加了基准测试和性能告警，防止问题再次溜进来。',drop:['json'],tone:{srv:'ok',fox:'ok'},sub:{srv:'P99 70ms'},bubble:{who:'fox',text:'证据说话，案子结了'}},
 {say:'小鹿合上复盘文档，想起这一路：从一张营业执照，到中央厨房，到双十一，再到这次破案。原来学 Go，学的不只是语法，而是如何让成千上万的请求，又快又稳地被照顾好。',drop:['fox'],add:[A('lu','🦌','小鹿',110,170,{tone:'ok'})],bubble:{who:'lu',text:'下一站：更大的世界'}},
 {say:'这一集的要点。',memo:['中间件洋葱、参数校验、事务、ctx、优雅关闭','先取证：pprof 看 CPU，trace 看等待，heap 看分配']},
]};
