import {A,type Story} from '../story';

// 网络面试题动画（二）：挥手、保活、HTTPS 与浏览器。
export const osG:Record<string,Story>={
 'q-d3b1f758513041ee':{title:'第四次挥手后为什么要等 2MSL',beats:[
  {say:'主动关闭的一方（比如客户端）发完最后一个 ACK，不会马上消失，而是进入 TIME_WAIT，等待 2MSL。',add:[A('c','💻','客户端：TIME_WAIT',120,170,{tone:'warm'}),A('s','🖥️','服务端：LAST_ACK',520,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'最后的 ACK'}]},
  {say:'原因一：如果这个 ACK 丢了，服务端会重传 FIN，客户端还在，能再回一次 ACK，让对方正常关闭。',send:[{from:'s',to:'c',text:'重传 FIN',tone:'warm'},{from:'c',to:'s',text:'再次 ACK',tone:'ok'}]},
  {say:'原因二：让这条连接在网络里残留的旧报文都过期消失，免得马上用相同四元组建立的新连接收到旧数据。',add:[A('old','👻','残留的旧报文',320,300,{kind:'tag',tone:'bad'})]},
  {say:'MSL 是报文在网络里的最大生存时间，2MSL 足够一来一回。具体时长由协议栈实现决定。',tone:{s:'quiet'},sub:{s:'已关闭'},drop:['old']},
  {say:'它是整个连接关闭后的保护期，不是每个 ACK 都要等；同时关闭等情况要按状态机分析。',memo:['让最后的 ACK 能重发','让旧报文过期，保护新连接']},
 ]},
 'q-a78e03291e96f652':{title:'TCP 在哪些情况下会丢数据',beats:[
  {say:'网络丢包时，连接正常的话 TCP 会重传。但网络一直坏下去，最终会超时或被重置，不能保证总能送到。',add:[A('a','💻','发送方',100,170,{tone:'primary'}),A('b','🖥️','接收方',540,170)],send:[{from:'a',to:'b',text:'重传…',tone:'warm'}]},
  {say:'write 成功，可能只是放进了本地的发送缓冲区，还没发出去。这时进程崩溃或连接被 RST，就丢了。',add:[A('buf','📦','本地发送缓冲',100,300,{kind:'tag',tone:'bad'})]},
  {say:'收到 TCP 的 ACK，也只说明数据到了对方的内核协议栈，不代表对方应用已经处理，更不代表已经写进数据库。',add:[A('kb','🧠','对端内核缓冲',540,300,{kind:'tag',tone:'warm'})],send:[{from:'b',to:'a',text:'ACK（只到内核）'}]},
  {say:'对端应用读出来之前就崩溃了，数据也没了。',tone:{b:'bad'},bubble:{who:'b',text:'我崩溃了，\n数据还在缓冲里',tone:'bad'}},
  {say:'端到端可靠要靠应用层：应用级确认、持久化、幂等和重试，不能只指望 TCP。',memo:['write 成功 ≠ 已发出','TCP ACK ≠ 对方已处理']},
 ]},
 'q-98fad1e1370931ad':{title:'TCP Keepalive 和 HTTP Keep-Alive 不一样',beats:[
  {say:'名字很像，管的是两件完全不同的事。',add:[A('c','💻','客户端',100,170,{tone:'primary'}),A('s','🖥️','服务端',540,170,{tone:'primary'})]},
  {say:'TCP keepalive：连接长时间空闲时，发探测包看看对方还在不在，用来发现“死连接”。需要显式开启，并配置空闲时间、间隔和次数。',add:[A('tk','💓','TCP keepalive：空闲探测',320,60,{kind:'tag',tone:'warm'})],send:[{from:'c',to:'s',text:'还在吗？'}]},
  {say:'HTTP keep-alive：一条 TCP 连接上连续发多个 HTTP 请求，不用每次重新建连。HTTP/1.1 默认就是持久连接，HTTP/2 还能多路复用。',add:[A('hk','🔁','HTTP keep-alive：连接复用',320,300,{kind:'tag',tone:'ok'})],send:[{from:'c',to:'s',text:'请求 1'},{from:'c',to:'s',text:'请求 2'}]},
  {say:'两者都不等于业务心跳：业务心跳还能检查对方应用是否真的能处理请求，TCP 探测只能说明更底层的连接还活着。',add:[A('hb','🩺','业务心跳：检查应用可用',320,180,{kind:'tag'})]},
  {say:'记住区别。',memo:['TCP keepalive：探测死连接','HTTP keep-alive：复用连接']},
 ]},
 'q-688fc3aa9df825fa':{title:'拔掉网线，TCP 连接还在吗',beats:[
  {say:'一条 TCP 连接，中间某段网线被拔了。连接会马上断开吗？不一定。',add:[A('c','💻','客户端：ESTABLISHED',110,170,{tone:'primary'}),A('cut','✂️','网线断了',320,170,{kind:'tag',tone:'bad'}),A('s','🖥️','服务端：ESTABLISHED',530,170,{tone:'primary'})]},
  {say:'TCP 不一定能立刻知道物理链路断了，尤其断在远端或中间网络。如果双方都不发数据、也没开探测，连接状态可能一直显示 ESTABLISHED。',bubble:{who:'s',text:'我以为\n一切正常'}},
  {say:'一旦有一方发数据，就会不断重传，直到超时才判定失败。本机网卡事件或路由错误，也可能让问题更早暴露。',send:[{from:'c',to:'cut',text:'重传…',tone:'bad'}],tone:{c:'warm'}},
  {say:'网线很快插回去，而且没超时，连接可能还能继续用。',tone:{cut:'ok'},sub:{cut:'插回去了'}},
  {say:'应用要设置读写超时、业务心跳和必要的 keepalive；重连后处理幂等。不能把本地的连接状态当成端到端真的可用。',memo:['不发数据就可能一直显示已连接','靠超时、心跳、keepalive 发现']},
 ]},
 'q-712d081146d2d5cd':{title:'HTTPS 比 HTTP 多了什么',beats:[
  {say:'HTTP：TCP 三次握手后，直接明文发请求，路上的人都能看到、能篡改。',add:[A('c','💻','浏览器',100,170,{tone:'primary'}),A('s','🖥️','网站',540,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'明文 HTTP',tone:'bad'}]},
  {say:'HTTPS（HTTP/1.1、HTTP/2）：TCP 连上之后，再做一次 TLS 握手。',add:[A('tls','🔐','TLS 握手',320,60,{kind:'item',tone:'warm'})]},
  {say:'握手里：协商协议版本和加密算法、交换密钥；浏览器验证服务器证书、域名和证书链，确认没连到冒牌网站。',add:[A('cert','📜','证书 · 域名 · 证书链',320,290,{kind:'tag',tone:'ok'})],send:[{from:'s',to:'c',text:'证书'}]},
  {say:'之后的 HTTP 内容全部加密传输。',send:[{from:'c',to:'s',text:'加密的 HTTP',tone:'ok'}],tone:{tls:'ok'}},
  {say:'TLS 1.3 完整握手往返更少，会话恢复更快，但 0-RTT 有重放风险。HTTP/3 用基于 UDP 的 QUIC，把 TLS 1.3 集成进去，不是“先 TCP 再 TLS”。',memo:['多一次 TLS 握手：协商、验证、加密','HTTP/3：QUIC 集成 TLS']},
 ]},
 'q-bae3ef9bd253e77c':{title:'有了 HTTP，为什么还要 WebSocket 和 RPC',beats:[
  {say:'HTTP 是一问一答：客户端问，服务端答。服务端想主动推消息就不方便。',add:[A('c','💻','客户端',100,170,{tone:'primary'}),A('s','🖥️','服务端',540,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'请求'},{from:'s',to:'c',text:'响应'}]},
  {say:'WebSocket：先用 HTTP 握手升级，之后建立一条持续的双向通道，双方随时发消息。适合聊天、实时推送。只要服务端单向推送，也可以用 SSE。',add:[A('ws','🔄','WebSocket：持续双向',320,60,{kind:'item',tone:'ok'})],send:[{from:'s',to:'c',text:'主动推送',tone:'ok'}]},
  {say:'RPC 是一种“像调用本地函数一样调用远程服务”的接口模型：IDL 定义接口、生成类型化代码，带超时、错误码和流式调用。',add:[A('rpc','📞','RPC：IDL · 代码生成 · 超时',320,300,{kind:'item',tone:'primary'})]},
  {say:'它们不是互斥的层次：gRPC 通常就跑在 HTTP/2 上。',bubble:{who:'rpc',text:'gRPC 底层\n就是 HTTP/2'}},
  {say:'按通信模式、跨语言互通和治理需求来选。',memo:['WebSocket：长连接双向推送','RPC：类型化的远程调用']},
 ]},
 'q-7314d29f4c8ca639':{title:'浏览器输入 URL 到页面显示',beats:[
  {say:'输入 https://shop.com 回车。浏览器先解析 URL，检查 HSTS、本地缓存和 Service Worker，命中缓存就能跳过后面很多步。',add:[A('b','🌐','浏览器',90,90,{tone:'primary'})]},
  {say:'需要联网：DNS 解析出 IP，选择代理，建立或复用连接；HTTPS 还要验证证书，完成 TLS（或 HTTP/3 的 QUIC）握手。',add:[A('dns','📖','DNS → IP',260,60,{kind:'tag'}),A('tls','🔐','TCP + TLS / QUIC',430,60,{kind:'tag'})],send:[{from:'b',to:'dns'},{from:'dns',to:'tls'}]},
  {say:'请求可能经过 CDN、负载均衡，到达后端服务，读数据库后返回响应。',add:[A('cdn','🛰️','CDN · 负载均衡',560,170,{kind:'tag'}),A('be','🖥️','后端 · 数据库',560,280,{kind:'tag',tone:'ok'})],send:[{from:'tls',to:'cdn'},{from:'cdn',to:'be'}]},
  {say:'浏览器处理重定向、缓存和 Cookie，解析 HTML 和 CSS，构建 DOM 和 CSSOM，执行 JavaScript。',add:[A('dom','🧱','DOM + CSSOM',260,250,{kind:'tag',tone:'warm'})],send:[{from:'be',to:'dom',text:'HTML'}]},
  {say:'然后布局、绘制、合成，页面显示出来；同时继续加载图片、脚本等子资源。',add:[A('page','🖼️','布局 → 绘制 → 合成',105,320,{kind:'tag',tone:'ok'})],send:[{from:'dom',to:'page'}]},
  {say:'记住大流程。',memo:['缓存 → DNS → 连接 → 请求','解析 → 布局 → 绘制']},
 ]},
};
