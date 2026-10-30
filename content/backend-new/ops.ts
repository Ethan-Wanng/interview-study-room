import type {AiLevel} from '../journey';

// 高阶：HTTP 与 DNS、线上故障排查。
export const beHttp:AiLevel={id:'be-http',title:'HTTP、HTTPS 与 DNS',summary:'HTTP 各版本的演进、HTTPS 握手、WebSocket/RPC 和域名解析',lessons:[
 {title:'HTTP/1.1 → HTTP/2 → HTTP/3',body:'HTTP/1.1 是文本协议，一条连接上的请求要排队（队头阻塞），浏览器只好开多条连接。HTTP/2 用二进制分帧，一条 TCP 连接上多路复用多个流，还压缩头部；但 TCP 丢一个包，所有流都要等。HTTP/3 基于 UDP 上的 QUIC，每个流独立重传，内置 TLS 1.3，切换网络也能保持连接。'},
 {title:'HTTPS 多了什么',body:'HTTPS = HTTP + TLS。TCP 连上后做 TLS 握手：协商版本和加密套件、交换密钥，浏览器校验服务器证书（域名、有效期、证书链是否由可信 CA 签发）。之后的内容都加密，防窃听、防篡改、防冒充。TLS 1.3 握手只要一个往返。'},
 {title:'WebSocket、SSE 和 RPC',body:'HTTP 是“客户端问、服务端答”。服务端要主动推送：单向推送用 SSE，双向实时通信用 WebSocket（先 HTTP 握手升级，再长期双向收发）。服务之间调用常用 RPC（如 gRPC）：用 IDL 定义接口、生成类型化代码，gRPC 底层就跑在 HTTP/2 上。'},
 {title:'DNS 一层层问路',body:'先查浏览器、系统缓存和 hosts；没有就问递归解析器，它再依次问根服务器、顶级域（.com）服务器、权威服务器，拿到 A/AAAA 记录。每一级结果按 TTL 缓存，所以修改解析要等旧缓存过期。DNS 默认用 UDP 53 端口。',code:'dig www.example.com +trace   # 看完整的解析过程\ndig www.example.com A +short # 只看 IP'},
],quiz:[
 {id:'be-http-1',q:'HTTP/2 相比 HTTP/1.1 最核心的改进是？',options:['底层传输改用了 UDP 协议','一条连接上多路复用多个请求','去掉了响应中的状态码','请求和响应都限定为 JSON'],why:['改用 UDP（QUIC）的是 HTTP/3，HTTP/2 仍基于 TCP。','','HTTP/2 保留了全部状态码语义。','HTTP/2 不限制内容类型，可以传输任何数据。'],answer:1,explain:'HTTP/2 的核心是二进制分帧 + 多路复用，还有头部压缩；但 TCP 层的队头阻塞仍然存在。',interview:'q-467a0dc0db3571c5'},
 {id:'be-http-2',type:'judge',q:'HTTP/2 彻底解决了队头阻塞，丢一个包也不会影响其他请求。',answer:false,explain:'HTTP/2 仍跑在 TCP 上，TCP 层丢包会让所有流等待重传；HTTP/3 用 QUIC 才解决。',interview:'q-467a0dc0db3571c5'},
 {id:'be-http-3',q:'HTTP/3 底层使用的传输协议是？',options:['TCP 传输控制协议','QUIC（基于 UDP）','SCTP 流控制协议','ICMP 控制报文协议'],why:['HTTP/1.1 和 HTTP/2 基于 TCP；HTTP/3 正是为了摆脱 TCP 的队头阻塞而换了传输层。','','SCTP 是另一种传输协议，主要用于电信信令，浏览器不支持。','ICMP 用于网络诊断（如 ping），不承载应用数据。'],answer:1,explain:'QUIC 在 UDP 上实现可靠传输和多路复用，并集成 TLS 1.3。'},
 {id:'be-http-4',type:'multi',q:'HTTPS 握手时，浏览器会检查服务器证书的哪些内容？（多选）',options:['证书中的域名与访问的一致','证书仍在有效期内','证书链由受信任的 CA 签发','证书没有被吊销'],why:['','','',''],answers:[0,1,2,3],explain:'浏览器会校验域名匹配、有效期、证书链信任，并检查吊销状态（OCSP、CRL 等），全部通过才能确认没有连到冒牌网站。',interview:'q-712d081146d2d5cd'},
 {id:'be-http-5',q:'做一个聊天室，服务端和客户端都要随时给对方发消息，最合适的是？',options:['客户端每秒轮询一次','WebSocket 双向连接','服务端 SSE 推送','客户端长轮询'],why:['轮询有延迟且浪费大量请求。','','SSE 只能服务端向客户端单向推送，客户端发消息还要另外请求。','长轮询能降低延迟，但每次都要重新建立请求，开销大且实现复杂。'],answer:1,explain:'WebSocket 建立后是持续的双向通道。',interview:'q-bae3ef9bd253e77c'},
 {id:'be-http-6',type:'fill',q:'gRPC 默认运行在 HTTP/____ 之上。',accepted:['2','2.0'],explain:'gRPC 利用 HTTP/2 的多路复用和流。',interview:'q-bae3ef9bd253e77c'},
 {id:'be-http-7',q:'修改了域名的 A 记录，有的用户仍然访问到旧 IP，最可能的原因是？',options:['DNS 服务器出现了故障','各级缓存还没到 TTL 过期','网站不支持 HTTP/2 协议','网站的 HTTPS 证书过期了'],why:['DNS 故障会导致无法解析，而不是解析到旧地址。','','HTTP 协议版本与域名解析结果无关。','证书过期会导致安全警告，而不是访问到旧 IP。'],answer:1,explain:'解析结果按 TTL 缓存在本机、运营商和递归解析器中，需要等过期；计划切换前可以先调小 TTL。',interview:'q-cb0c4508f2549bbd'},
 {id:'be-http-8',q:'递归解析器在没有缓存时，第一步去问的是？',options:['域名的权威服务器','根域名服务器','顶级域名服务器','最近的 CDN 节点'],why:['递归解析器一开始不知道权威服务器的地址，需要逐层询问才能找到。','','要先问根服务器才能知道 .com 等顶级域服务器在哪里。','CDN 节点不负责 DNS 的逐级解析。'],answer:1,explain:'迭代查询的顺序是：根服务器 → 顶级域服务器 → 权威服务器。',interview:'q-cb0c4508f2549bbd'},
 {id:'be-http-9',type:'judge',q:'HTTPS 只能防窃听，不能防止内容被中间人篡改。',answer:false,explain:'TLS 同时提供加密、完整性校验和身份认证。'},
 {id:'be-http-10',type:'short',q:'服务端需要实时把订单状态推给网页，SSE 和 WebSocket 怎么选？',reference:'如果只需要服务端单向推送给浏览器，SSE 更简单：基于普通 HTTP，浏览器自带断线重连，易于通过代理。如果需要双向频繁通信（如聊天、协同编辑），用 WebSocket。两者都要考虑连接数、心跳、断线重连后的补发、网关和负载均衡对长连接的支持。',points:['单向推送选 SSE，简单、自动重连','双向实时通信选 WebSocket','都要处理心跳和断线重连','注意长连接对网关和容量的影响'],explain:'按通信方向和复杂度选，不是越新越好。'},
]};

export const beTrouble:AiLevel={id:'be-trouble',title:'线上故障排查实战',summary:'CPU、内存、磁盘、日志和定时任务，按证据一步步定位',lessons:[
 {title:'排查的总思路',body:'先止血再根治：确认影响范围和开始时间，对照有没有发布、改配置、流量突增，必要时回滚、限流、扩容。动手前保存现场（日志、profile、监控截图）。然后自上而下定位：哪台机器 → 哪个进程 → 哪个线程 / 函数。修复后用同样的负载验证并复盘。'},
 {title:'CPU 和负载',body:'top 看 us（用户态）、sy（内核态）、wa（等 I/O）、st（被宿主机抢走）。load average 是“正在跑 + 排队 + 不可中断睡眠”的任务数，load 高不一定 CPU 忙，可能大家都在等磁盘。定位到进程后用 top -H -p PID 找线程，再用 perf 或 Go 的 pprof 找热点函数。',code:'top -H -p 1234              # 看进程里哪个线程最忙\ngo tool pprof http://localhost:6060/debug/pprof/profile?seconds=30'},
 {title:'内存和磁盘',body:'free 看 available，不要被 used 吓到：page cache 可以回收。看进程 RSS 用 ps / pidstat，内核日志里找 OOM killer 记录。磁盘慢用 iostat -xz 看 await 和队列，pidstat -d / iotop 找是谁在读写。df 满了但 du 对不上，多半是文件被删了但进程还开着，用 lsof +L1 找出来。'},
 {title:'大日志和定时任务',body:'几十 GB 的日志别用 vim 打开：less 分页，tail -n 看最后几行，grep / rg 按请求 ID 定位，zgrep 搜压缩日志。crontab 不执行时查：cron 服务和时区、脚本权限、PATH 太短（用绝对路径）、% 需要转义；把输出重定向到日志文件才能看到报错。'},
],quiz:[
 {id:'be-trouble-1',q:'线上接口大面积超时，刚好 10 分钟前发布了新版本，第一步最合理的是？',options:['先花一小时读代码找 bug','先回滚止血，同时保留现场','立刻重启所有数据库实例','先不处理，等它自己恢复'],why:['大面积故障时应先恢复服务，再慢慢定位根因。','','没有证据就重启数据库可能扩大影响，还会丢失现场。','故障持续会造成更大的损失。'],answer:1,explain:'先恢复服务、缩小影响，再定位根因。',interview:'q-8fcc9f406b2f5246'},
 {id:'be-trouble-2',q:'机器 load average 很高，但 top 显示 CPU 利用率只有 10%，wa 很高，最可能是？',options:['CPU 计算能力不够用','大量任务在等待磁盘 I/O','机器的内存容量太多了','网络带宽太大导致拥塞'],why:['CPU 利用率只有 10%，说明计算资源并不紧张。','','内存多不会导致 load 升高。','网络快不是问题，wa 指标反映的是磁盘 I/O 等待。'],answer:1,explain:'处于不可中断睡眠（等 I/O）的任务也计入 load average，所以 wa 高时 load 会很高。',interview:'q-94fc03cdda96b367'},
 {id:'be-trouble-3',q:'已经知道是 PID 1234 的进程 CPU 很高，下一步要定位到具体线程，用哪个命令？',options:['top -H -p 1234','df -h 1234','ps aux | head','free -m 1234'],why:['','df 查看磁盘空间使用情况。','ps aux 列出所有进程，不显示线程级的 CPU 占用。','free 查看系统内存使用情况。'],answer:0,explain:'top -H 显示线程，-p 指定进程；找到热点线程后再用 profiler 或线程栈定位热点函数。',interview:'q-b515960b47d0fb77'},
 {id:'be-trouble-4',type:'judge',q:'free 显示 used 很高、free 很少，就说明一定发生了内存泄漏。',answer:false,explain:'page cache 会占用“used”但可以回收，要看 available、swap 和进程 RSS 的趋势。',interview:'q-5507ee2fe6c6f2a9'},
 {id:'be-trouble-5',type:'multi',q:'磁盘被删除的大日志占着，df 显示空间没有释放，正确的处理有哪些？（多选）',options:['用 lsof +L1 找到仍打开文件的进程','让服务重新打开日志文件或重启服务','反复执行 rm 直到空间被释放','等几分钟，系统会自动回收空间'],why:['','','文件已经被删除，再执行 rm 也找不到它，空间不会释放。','只要进程还打开着文件，数据块就不会被释放，等待没有用。'],answers:[0,1],explain:'被删除的文件只要仍被进程打开，数据块就要等关闭后才释放；找到进程后让它重新打开日志（或重启），也可以截断 /proc/<pid>/fd 下的文件。',interview:'q-d17fdfcf3be09b46'},
 {id:'be-trouble-6',type:'fill',q:'查看磁盘 await、队列长度等扩展统计的常用命令是 iostat ____。',accepted:['-xz','-x','-xz 1','-x 1'],explain:'-x 显示扩展统计，-z 隐藏空闲设备。',interview:'q-a8f1e56596cf95da'},
 {id:'be-trouble-7',q:'要在 30GB 的日志里找某个请求 ID 的所有记录，最合适的是？',options:['用 vim 打开后再搜索','用 rg 或 grep 流式搜索','用 cat 输出全部内容','下载到电脑用记事本打开'],why:['vim 会把整个大文件加载进内存，打开极慢甚至卡死。','','cat 只会把 30GB 内容刷满屏幕，无法定位。','下载 30GB 文件很耗时，记事本也打不开这么大的文件。'],answer:1,explain:'流式搜索不需要把整个文件加载进内存。',interview:'q-076449b355ef6734'},
 {id:'be-trouble-8',q:'脚本在终端里手动执行没问题，放进 crontab 就失败，最常见的原因是？',options:['cron 不支持执行 bash 写的脚本','cron 环境变量少，找不到命令','脚本的内容写得太短无法执行','服务器的系统时间走得太快了'],why:['cron 可以执行 bash 脚本，只要指定解释器。','','脚本长短与能否执行无关。','时间偏差只影响执行时刻，不会导致脚本失败。'],answer:1,explain:'cron 的环境非常精简，命令和文件要写绝对路径，需要的环境变量要显式设置，并把输出重定向到日志方便排查。',interview:'q-785843ed24adfb0e'},
 {id:'be-trouble-9',type:'judge',q:'排查线上问题时，应该先保存日志、profile 等证据，再执行重启这类会破坏现场的操作。',answer:true,explain:'重启后线程栈、内存状态都没了，很难再定位根因。'},
 {id:'be-trouble-10',type:'short',q:'Go 服务的内存（RSS）一直上涨，你会怎么排查？',reference:'先看监控确认是持续上涨还是随负载波动；看 goroutine 数量有没有一直涨（goroutine 泄漏）；采集 heap profile，对比两个时间点的 inuse_space，找出存活对象增长的地方，比如只增不删的 map 或缓存、未关闭的连接、子串/子切片引用大对象；注意 RSS 不降不一定是泄漏，runtime 归还内存给系统有延迟；修复后在相同负载下验证。',points:['确认趋势，排除正常波动','看 goroutine 数量','对比 heap profile 的存活对象','检查缓存、连接、引用大对象，修复后验证'],explain:'内存问题要用 profile 的证据说话。',interview:'q-5507ee2fe6c6f2a9'},
]};
