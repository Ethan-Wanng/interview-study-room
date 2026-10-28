import type {AiQuiz} from '../journey';

// 高阶阶段训练补充题：TCP、HTTP 与 DNS、操作系统、I/O、故障排查、消息队列。
export const beTrain3Extra:AiQuiz[]=[
 {id:'be-x3-16',q:'服务端出现大量 CLOSE_WAIT 状态的连接，最可能的原因是？',options:['网络丢包严重','对端已经关闭，但本端程序没有调用 close（比如忘了关闭响应体或连接）','TIME_WAIT 太多','DNS 解析失败'],answer:1,explain:'CLOSE_WAIT 表示收到了对方的 FIN，等待本端应用关闭；大量堆积通常是代码没有释放连接。'},
 {id:'be-x3-17',type:'multi',q:'关于 TIME_WAIT，下面哪些说法正确？（多选）',options:['出现在主动关闭连接的一方','持续 2MSL，用来重发最后的 ACK、让旧报文过期','大量短连接的客户端可能因此耗尽本地端口','可以通过把所有连接改成被动关闭彻底消除'],answers:[0,1,2],explain:'总有一方要主动关闭；常用连接复用（长连接、连接池）减少 TIME_WAIT。'},
 {id:'be-x3-18',q:'浏览器访问一个 HTTPS 网站提示“证书与域名不匹配”。最可能的原因是？',options:['网站用了 HTTP/2','证书签发的域名和当前访问的域名不一致（比如只签了 www）','DNS 的 TTL 太长','服务器 CPU 过高'],answer:1,explain:'浏览器会校验证书中的 SAN 是否包含访问的域名。'},
 {id:'be-x3-19',type:'judge',q:'HTTP/2 下，浏览器对同一个域名仍然需要开 6 个 TCP 连接来并发请求。',answer:false,explain:'HTTP/2 一个连接上就能多路复用，通常一个域名一个连接。'},
 {id:'be-x3-20',q:'计划把服务迁移到新 IP，想让切换尽快生效，DNS 方面应该提前做什么？',options:['迁移前提前调小该记录的 TTL，等旧 TTL 过期后再切换','切换后把 TTL 调大','删除域名','换一个 DNS 服务商'],answer:0,explain:'旧的长 TTL 缓存不会因为你修改记录而立即失效。'},
 {id:'be-x3-21',q:'一个 Go HTTP 客户端每次请求都 new 一个 http.Client 和 Transport，高并发下机器上 TIME_WAIT 暴涨、延迟升高。原因是？',options:['Go 不支持长连接','每个 Transport 有独立连接池，连接无法复用，频繁新建和关闭连接','HTTP/2 被禁用','DNS 太慢'],answer:1,explain:'应该复用同一个 Client/Transport，并读完、关闭响应体，让连接回到连接池。'},
 {id:'be-x3-22',type:'fill',q:'进程在用户态执行 read() 读取文件，会通过 ____ 调用切换到内核态。',accepted:['系统','syscall','system call'],explain:'系统调用是用户程序请求内核服务的入口。'},
 {id:'be-x3-23',q:'在 4GB 内存、开启默认 overcommit 的 Linux 上，程序 malloc 了 8GB 但只写了 100MB。会发生什么？',options:['分配立即失败','分配成功，实际只占用约 100MB 物理内存','立刻触发 OOM','系统自动扩展内存'],answer:1,explain:'物理页在真正写入时才分配；全部写满才可能因内存不足触发 OOM。'},
 {id:'be-x3-24',type:'multi',q:'进程间通信方式中，下面哪些描述正确？（多选）',options:['共享内存速度最快，但需要自己做同步','管道是字节流，不保留消息边界','Unix domain socket 只能用于同一台机器','信号适合传输大量数据'],answers:[0,1,2],explain:'信号只适合发通知。'},
 {id:'be-x3-25',q:'epoll 使用 ET 模式，某个连接一次到了 8KB 数据，程序只读了 4KB 就回去 epoll_wait。之后会怎样？',options:['epoll 会继续通知剩下的 4KB','如果没有新数据到达，可能不会再收到通知，剩下的数据“卡住”','连接自动断开','数据被丢弃'],answer:1,explain:'ET 只在状态变化时通知，必须一直读到 EAGAIN。'},
 {id:'be-x3-26',type:'judge',q:'使用 sendfile 发送文件时，如果连接启用了 TLS 且需要在用户态加密，就不能直接走内核的零拷贝路径。',answer:true,explain:'数据要经过加密处理，除非内核 TLS（kTLS）等机制支持。'},
 {id:'be-x3-27',q:'数据库服务器 iostat 显示 await 从 2ms 涨到 80ms，%util 接近 100%，CPU 大量处于 iowait。下一步最合理的是？',options:['加 CPU','用 pidstat -d / iotop 找出读写最多的进程，再看是否有慢查询、大批量写入或 checkpoint','重启网卡','关闭 swap'],answer:1,explain:'先定位 I/O 来源，再对症处理。'},
 {id:'be-x3-28',q:'Go 服务 CPU 使用率很高，用 pprof 采样发现 runtime.mallocgc 和 GC 相关函数占了 40%。最可能的优化方向是？',options:['增加 GOMAXPROCS','减少内存分配：复用对象、预分配切片容量、避免不必要的字符串转换','关闭 GC','升级网卡'],answer:1,explain:'分配越多 GC 越忙；先减少分配，再考虑调 GOGC。'},
 {id:'be-x3-29',type:'fill',q:'查看“已被删除但仍被进程打开”的文件，命令是 lsof ____。',accepted:['+L1'],explain:'这些文件的磁盘空间要等进程关闭后才释放。'},
 {id:'be-x3-30',q:'引入消息队列把“下单后发短信”改成异步后，下面哪项不是它带来的新问题？',options:['消息可能重复','消息可能丢失，需要可靠投递','短信发送有延迟，需要最终一致','下单接口必须等短信发完才能返回'],answer:3,explain:'异步的目的正是让下单不必等待短信；但要处理重复、丢失和延迟。'},
 {id:'be-x3-31',type:'multi',q:'Kafka 写入性能好，和下面哪些设计有关？（多选）',options:['分区日志顺序追加写','生产者批量发送并压缩','利用操作系统页缓存','每条消息都单独 fsync'],answers:[0,1,2],explain:'Kafka 默认依赖副本保证可靠，而不是每条消息 fsync。'},
 {id:'be-x3-32',type:'short',q:'用户反馈“页面偶尔要等 5 秒才打开”，你怀疑是网络或 DNS 问题。会怎么一步步排查？',reference:'先确定范围：哪些用户、哪个地区、什么时间、是否只有某个域名。用浏览器开发者工具或 curl -w 拆分耗时：DNS 解析、TCP 连接、TLS 握手、首字节时间、下载时间，看慢在哪一段。DNS 慢：用 dig 检查解析结果和耗时，看是否有某个解析器超时（5 秒常见于 DNS 超时重试）、IPv6 AAAA 记录问题。连接或 TLS 慢：看丢包、重传（ss -ti、抓包）、证书链是否过长、OCSP。首字节慢：看后端日志和链路追踪。修复后用同样方式验证。',points:['确定影响范围','用 curl -w / 开发者工具拆分各阶段耗时','DNS：dig、解析器超时、AAAA','连接与 TLS：丢包重传、抓包；首字节：后端追踪'],explain:'固定 5 秒的延迟常常是某种超时重试，拆分耗时最关键。'},
];
