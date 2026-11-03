import type {AiLevel} from '../journey';

// 高阶：HTTP 与 DNS、线上故障排查。
export const beHttp:AiLevel={id:'be-http',title:'HTTP、HTTPS 与 DNS',summary:'HTTP 各版本的演进、HTTPS 握手、WebSocket/RPC 和域名解析',lessons:[
  {title:'这一关学什么：浏览器和服务器怎么“对话”',body:'上一关讲了 TCP 怎么把字节可靠地送到对方。这一关往上走一层，讲应用层最重要的几个协议：\n一、HTTP：请求和响应长什么样，常用的方法和状态码，以及 HTTP/1.1、HTTP/2、HTTP/3 各自解决了什么问题；\n二、HTTPS：比 HTTP 多了什么，TLS 握手做了哪些事，证书怎么校验；\n三、服务端怎么主动推消息：轮询、SSE、WebSocket；服务之间怎么调用：RPC 和 gRPC；\n四、DNS：域名是怎么一层层解析成 IP 的，为什么改了解析不能马上生效。'},
  {title:'HTTP 请求和响应长什么样',body:'HTTP 是“客户端发请求、服务端回响应”的协议。HTTP/1.1 的报文就是纯文本，分三部分：\n第一行：请求行写“方法 路径 版本”，响应写“版本 状态码 说明”；\n头部：一行一个“名字: 值”，描述附加信息，比如内容类型、长度、登录凭证、缓存规则；\n空一行之后是正文（body）：请求提交的数据，或者响应返回的内容。\n常用的方法：GET 获取数据，POST 新建或提交，PUT 整体修改，PATCH 部分修改，DELETE 删除。GET 不应该修改数据。',code:`GET /orders/42 HTTP/1.1
Host: shop.example.com
Authorization: Bearer abc123
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 27

{"id": 42, "status": "paid"}`,explain:[{at:'GET /orders/42 HTTP/1.1',text:'请求行：用 GET 方法获取路径 /orders/42 的内容，使用 HTTP/1.1。'},{at:'Host: shop.example.com',text:'要访问的域名。同一台服务器上可能有很多网站，靠它区分。'},{at:'Authorization: Bearer abc123',text:'登录凭证（令牌），服务端据此知道你是谁。'},{at:'Accept: application/json',text:'告诉服务端：我希望拿到 JSON 格式的数据。'},{at:'HTTP/1.1 200 OK',text:'响应的状态行：200 表示成功。'},{at:'Content-Type: application/json',text:'正文是 JSON 格式。'},{at:'Content-Length: 27',text:'正文有 27 个字节。接收方靠它知道正文在哪里结束，这就是 HTTP 的“分帧”方式之一。'},{at:'{"id": 42, "status": "paid"}',text:'空行之后是正文：订单 42 的信息。'}]},
  {title:'状态码：一眼看出结果',body:'状态码是三位数字，第一位表示大类：\n2xx 成功：200 成功，201 已创建，204 成功但没有内容返回；\n3xx 重定向：301 永久搬家，302 临时跳转，304 内容没变化、用你本地的缓存就行；\n4xx 客户端的问题：400 请求格式不对，401 没登录，403 登录了但没权限，404 找不到，405 不支持这个方法，429 请求太频繁被限流；\n5xx 服务端的问题：500 服务器内部出错，501 服务器不支持这个功能，502 网关从后端拿到了无效的响应（后端可能挂了），503 服务暂时不可用（过载或维护），504 网关等后端响应超时。\n排查线上问题时，先看状态码就能大致判断是谁的问题、往哪个方向查。'},
  {title:'动手试试：自己写一个 HTTP 服务并请求它',body:'我们用 Python 自带的 http.server 写一个最小的 HTTP 服务，再用 urllib 发请求，看看状态码、头部和正文；最后用它不支持的 POST 方法请求一次，看看会得到什么状态码。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 http_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python http_demo.py（Mac 用 python3 http_demo.py），对照下面的输出。','程序里的服务只在运行期间存在。想用浏览器访问的话，可以把最后一行 server.shutdown() 换成 input("按回车结束")，运行后用浏览器打开终端里提示的端口地址。'],expect:'状态码： 200\n内容类型： application/json\n响应体： {"path": "/orders/42?debug=1", "ua": "study-room"}\nPOST 的状态码： 501'},code:`import http.server
import json
import threading
import urllib.error
import urllib.request

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"path": self.path, "ua": self.headers["User-Agent"]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass

server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"

req = urllib.request.Request(base + "/orders/42?debug=1", headers={"User-Agent": "study-room"})
with urllib.request.urlopen(req) as resp:
    print("状态码：", resp.status)
    print("内容类型：", resp.headers["Content-Type"])
    print("响应体：", resp.read().decode())

try:
    urllib.request.urlopen(base + "/orders", data=b"{}")
except urllib.error.HTTPError as e:
    print("POST 的状态码：", e.code)
server.shutdown()`,explain:[{at:'import http.server',to:'import urllib.request',text:'都是 Python 自带的模块：http.server 写服务端，urllib 发请求，json 处理 JSON，threading 让服务在后台运行。'},{at:'class Handler(http.server.BaseHTTPRequestHandler):',text:'定义请求处理器：收到什么方法的请求，就调用对应的 do_方法名。'},{at:'def do_GET(self):',text:'处理 GET 请求。'},{at:'body = json.dumps({"path": self.path, "ua": self.headers["User-Agent"]}).encode()',text:'把请求的路径和 User-Agent 头放进一个 JSON，转成字节作为正文。'},{at:'self.send_response(200)',text:'写状态行：200 OK。'},{at:'self.send_header("Content-Type", "application/json")',to:'self.send_header("Content-Length", str(len(body)))',text:'写响应头：内容类型和正文长度。'},{at:'self.end_headers()',text:'写一个空行，表示头部结束。'},{at:'self.wfile.write(body)',text:'写正文。'},{at:'def log_message(self, *args):',to:'pass',text:'关掉默认的访问日志，让输出更干净。'},{at:'server = http.server.HTTPServer(("127.0.0.1", 0), Handler)',text:'在本机启动服务，端口 0 表示让系统分配一个空闲端口。'},{at:'threading.Thread(target=server.serve_forever, daemon=True).start()',text:'在后台线程里一直处理请求。'},{at:'base = f"http://127.0.0.1:{server.server_port}"',text:'拼出服务的地址。'},{at:'req = urllib.request.Request(base + "/orders/42?debug=1", headers={"User-Agent": "study-room"})',text:'构造一个 GET 请求，路径带查询参数，自定义 User-Agent 头。'},{at:'with urllib.request.urlopen(req) as resp:',text:'发出请求，拿到响应。'},{at:'print("状态码：", resp.status)',to:'print("响应体：", resp.read().decode())',text:'打印状态码、内容类型和正文。正文里能看到服务端收到的路径和头部。'},{at:'try:',to:'urllib.request.urlopen(base + "/orders", data=b"{}")',text:'带上 data 就会变成 POST 请求。我们的服务没有写 do_POST。'},{at:'except urllib.error.HTTPError as e:',to:'print("POST 的状态码：", e.code)',text:'服务器不支持 POST，返回 501（未实现）。urllib 遇到 4xx、5xx 会抛出 HTTPError。'},{at:'server.shutdown()',text:'关闭服务。'}]},
  {title:'HTTP/1.1：能复用连接，但要排队',body:'早期的 HTTP 每个请求都要新建一条 TCP 连接，用完就关，非常浪费。HTTP/1.1 默认使用持久连接（Keep-Alive）：一条连接可以连续发送多个请求。\n但它有一个大问题：同一条连接上，必须等前一个请求的响应完整返回，才能处理下一个。前面的响应慢了，后面的全都要等，这叫“队头阻塞”。\n浏览器的应对办法是对同一个域名同时开 6 条左右的连接，并行加载。前端过去流行的“合并文件、雪碧图、域名分片”等优化手段，都是为了绕开这个限制。'},
  {title:'HTTP/2 和 HTTP/3',body:'HTTP/2 的核心改进是“多路复用”：把请求和响应切成一个个二进制的“帧”，每个帧标明属于哪个“流”（一个请求就是一个流）。这样一条 TCP 连接上可以同时交错传输很多个请求和响应，谁先好谁先回，不用排队。它还会压缩头部（HPACK），减少重复的头部数据。\n但它并没有彻底解决队头阻塞：底层仍然是一条 TCP 连接，TCP 要保证字节有序，只要丢了一个包，后面所有流的数据都要等这个包重传回来，哪怕它们本身并没有丢。\nHTTP/3 把底层换成了基于 UDP 的 QUIC 协议：QUIC 在应用层自己实现了可靠传输，每个流单独重传，一个流丢包不影响其他流。它还内置了 TLS 1.3，建立连接更快；连接用一个 ID 标识而不是 IP 和端口，手机从 Wi-Fi 切到 4G 时连接也不会断。'},
  {title:'HTTPS：给 HTTP 加上一层 TLS',body:'普通 HTTP 是明文传输的：数据经过的每一个路由器、Wi-Fi 热点都能看到内容，也能偷偷修改内容，甚至有人可以冒充网站。\nHTTPS = HTTP + TLS。TLS 在 TCP 和 HTTP 之间加了一层，提供三种保护：\n一、加密：防窃听，中间人看到的只是一堆乱码；\n二、完整性校验：防篡改，内容被改动过，接收方能立刻发现；\n三、身份认证：防冒充，通过证书确认你连接的确实是这个域名的真正服务器。\n所以“HTTPS 只能防窃听、不能防篡改”是错误的说法，三样它都能防。'},
  {title:'TLS 握手做了什么',body:'TCP 连接建立后、发送 HTTP 请求前，要先进行 TLS 握手，主要完成三件事：\n一、协商：双方商量用哪个 TLS 版本、哪套加密算法（加密套件）；\n二、交换密钥：用“密钥交换算法”（比如 ECDHE）让双方各自算出同一个会话密钥，而这个密钥本身从来没有在网络上传输过，中间人即使看到全部握手数据也算不出来。之后的数据都用这个密钥做对称加密，速度很快；\n三、校验证书：服务器发来自己的证书，浏览器检查：证书里的域名和正在访问的域名是否一致；证书是否在有效期内；证书链是否能一级级追溯到浏览器信任的根证书颁发机构（CA）；证书是否已经被吊销。任何一项不通过，浏览器就会显示安全警告。\nTLS 1.3 把握手简化到只需要一个往返，比 TLS 1.2 少一个往返，连接建立更快。'},
  {title:'服务端怎么主动推消息',body:'HTTP 本来是“客户端问、服务端答”，服务端不能主动开口。需要服务端主动推送时，有几种办法：\n一、轮询：客户端每隔几秒问一次“有新消息吗”。最简单，但大部分请求都是白跑，实时性也差；\n二、SSE（Server-Sent Events）：客户端发一个普通的 HTTP 请求，服务端保持连接不关闭，有新数据就往里写一条。只能服务端往客户端单向推送，但它就是普通 HTTP，浏览器断线后还会自动重连，实现简单；\n三、WebSocket：先用一个 HTTP 请求“握手”，告诉服务端要升级协议（Upgrade: websocket），服务端同意后，这条连接就变成了一条全双工的长连接，双方可以随时互相发消息。\n怎么选：只需要服务端推送（订单状态更新、通知、AI 逐字输出回答），用 SSE 就够了；双方都要频繁实时地发消息（聊天室、协同编辑、在线游戏），用 WebSocket。',code:`GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade`,explain:[{at:'GET /chat HTTP/1.1',text:'WebSocket 握手就是一个普通的 HTTP GET 请求。'},{at:'Host: example.com',text:'要访问的域名。'},{at:'Upgrade: websocket',to:'Connection: Upgrade',text:'告诉服务端：我想把这条连接升级成 WebSocket 协议。'},{at:'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',text:'客户端随机生成的一个值，服务端要根据它算出一个回应值返回，证明自己确实理解 WebSocket 协议。'},{at:'HTTP/1.1 101 Switching Protocols',text:'服务端同意升级，状态码 101。之后这条 TCP 连接上就不再是 HTTP，而是 WebSocket 的数据帧，双方可以随时互发消息。'},{at:'Upgrade: websocket',to:'Connection: Upgrade',text:'确认升级的协议。'}]},
  {title:'RPC 和 gRPC：服务之间怎么调用',body:'后端拆成很多个服务后，服务之间要互相调用。RPC（远程过程调用）的目标是：调用另一台机器上的函数，写起来就像调用本地函数一样。\ngRPC 是目前最常用的 RPC 框架之一：\n一、用 IDL（接口描述语言，gRPC 用的是 Protocol Buffers 的 .proto 文件）定义服务有哪些方法、参数和返回值是什么结构；\n二、用工具根据 .proto 自动生成各种语言的客户端和服务端代码，参数和返回值都有明确的类型，写错了编译就报错；\n三、数据用 protobuf 二进制编码，比 JSON 更小、解析更快；\n四、底层运行在 HTTP/2 之上，天然支持多路复用和双向流式调用。\n对外给浏览器和第三方用的接口一般用 HTTP + JSON，内部服务之间的调用常用 gRPC。',code:`syntax = "proto3";

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
}

message GetOrderRequest {
  int64 id = 1;
}

message Order {
  int64 id = 1;
  string status = 2;
}`,explain:[{at:'syntax = "proto3";',text:'使用 protobuf 第 3 版语法。'},{at:'service OrderService {',text:'定义一个订单服务。'},{at:'rpc GetOrder (GetOrderRequest) returns (Order);',text:'服务里有一个方法 GetOrder：参数是 GetOrderRequest，返回 Order。'},{at:'message GetOrderRequest {',to:'int64 id = 1;',text:'请求消息：只有一个订单 id。后面的数字 1 是字段编号，二进制编码时用编号而不是字段名，所以数据很紧凑。'},{at:'message Order {',text:'返回的订单消息。'},{at:'int64 id = 1;',to:'string status = 2;',text:'两个字段：id 和状态。字段编号一旦用上就不能改，新增字段要用新的编号，这样新旧版本的程序能互相兼容。'}]},
  {title:'DNS：域名怎么变成 IP',body:'网络通信靠的是 IP 地址，但人记不住一串数字，所以有了域名。DNS 就是把域名翻译成 IP 的系统。常见的记录类型：\nA 记录：域名 → IPv4 地址；AAAA 记录：域名 → IPv6 地址；\nCNAME：域名 → 另一个域名（别名），比如把 www 指向 CDN 提供的域名；\nMX：邮件服务器；TXT：任意文本，常用来验证域名所有权。\n解析过程是一层层问路的：先查浏览器缓存、操作系统缓存和 hosts 文件；都没有，就问递归解析器（运营商或 8.8.8.8 这类公共 DNS）。递归解析器没有缓存时，先问根域名服务器，根告诉它“.com 归谁管”；再问 .com 顶级域服务器，它告诉你“example.com 归谁管”；最后问 example.com 的权威服务器，拿到真正的 IP。\nDNS 默认使用 UDP 的 53 端口。',code:`dig www.example.com +trace
dig www.example.com A +short
dig www.example.com CNAME
nslookup www.example.com`,explain:[{at:'dig www.example.com +trace',text:'从根服务器开始，一步步展示完整的解析过程：根 → .com → 权威服务器。'},{at:'dig www.example.com A +short',text:'只看 A 记录的结果，也就是 IP 地址。'},{at:'dig www.example.com CNAME',text:'查看这个域名是不是另一个域名的别名。'},{at:'nslookup www.example.com',text:'Windows 上也自带的查询工具，用法更简单。'}]},
  {title:'改了解析，为什么有人还访问旧 IP',body:'DNS 的每条记录都带有一个 TTL（生存时间，单位是秒），表示这条结果可以被缓存多久。递归解析器、操作系统、浏览器都会按 TTL 缓存结果，在缓存过期之前，不会再去问权威服务器。\n所以修改了域名的 A 记录后，各地的缓存要等旧 TTL 到期才会更新，在这段时间里，有的用户拿到新 IP，有的用户还在用缓存里的旧 IP。\n计划迁移服务器时的标准做法：提前一两天把 TTL 调小（比如 60 秒），等旧的、较长的 TTL 全部过期后，再修改 IP。这样切换时最多只有一分钟左右的不一致。迁移期间，旧服务器也要继续保留一段时间，接住还在访问它的请求。'}
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
  {title:'这一关学什么：线上出事了，按步骤排查',body:'前面几关学了很多命令和原理，这一关把它们串起来，用一个个真实场景练习：线上出了故障，怎么有条理地找到原因、解决问题。\n这一关讲：\n一、排查的总体思路：先止血、保存现场、自上而下定位、修复、复盘；\n二、几个典型案例：发布后大面积超时、CPU 飙高、负载高但 CPU 闲、Go 服务内存一直涨、磁盘满了、在大日志里找一个请求、定时任务不执行。\n其中会带你亲手复现一个 goroutine 泄漏，看看内存“只涨不降”是怎么来的。'},
  {title:'排查的总体思路',body:'一、先止血，再根治。线上故障影响的是真实用户，第一目标是尽快恢复服务，而不是马上找到根本原因。确认影响范围（哪些功能、多少用户）和开始时间，对照这个时间点有没有发布新版本、修改配置、流量突然上涨。有明显的怀疑对象，就先回滚、限流、扩容或者切走流量。\n二、动手前保存现场。重启会让内存、goroutine、连接这些证据全部消失。先保存日志、抓一份 pprof（CPU、heap、goroutine）、截图监控曲线，再做重启这类会破坏现场的操作。\n三、自上而下定位：哪个服务 → 哪台机器 → 哪个进程 → 哪个线程或 goroutine → 哪个函数。每一步都要有证据（监控、命令输出、日志），而不是凭感觉猜。\n四、修复后验证：用同样的负载验证问题确实消失了。\n五、复盘：写清楚时间线、根本原因、为什么没有提前发现，以及后续的改进措施（加监控、加测试、改流程），避免同样的问题再次发生。'},
  {title:'案例：发布 10 分钟后，接口大面积超时',body:'场景：线上接口突然大面积超时，查看发布记录，10 分钟前刚好上线了新版本。\n最合理的第一步：立刻回滚到上一个版本，而不是先去翻代码找原因。时间上如此吻合，新版本的嫌疑最大，回滚能最快恢复服务。回滚之前，花一两分钟保存现场：抓一份 pprof、保存一段错误日志。\n恢复后再慢慢分析新版本到底改了什么：是新增了一个慢查询？改了超时时间或连接池配置？引入了某个阻塞的调用？在测试环境里用相同的流量复现，确认原因后修复，再重新发布。\n如果回滚后问题依然存在，说明不是这次发布导致的，就要继续排查：下游服务、数据库、网络是不是出了问题，流量是不是突然变大了。'},
  {title:'从“看监控”开始：USE 方法',body:'不知道从哪里查起时，可以按 USE 方法，把每一种资源都过一遍：\nU 使用率（Utilization）：资源有多忙，比如 CPU 使用率、磁盘的 %util；\nS 饱和度（Saturation）：有多少任务在排队等这个资源，比如 load average、磁盘的队列长度、内存不够时的 swap；\nE 错误（Errors）：有没有出错，比如网卡丢包、磁盘 I/O 错误、OOM 记录。\n依次检查 CPU、内存、磁盘、网络，很快就能找到哪个资源出了问题，再继续往下深挖。\n对于服务本身，常看的是请求量、错误率和延迟（尤其是 P99）。很多问题能直接从这三条曲线的变化时间点看出端倪。'},
  {title:'案例：一个进程把 CPU 吃满了',body:'场景：监控显示某台机器 CPU 持续 100%。\n第一步，用 top 看是哪种 CPU 时间高、是哪个进程。假设是 PID 1234 的 Go 服务，us（用户态）很高，说明是程序自己的计算占满了 CPU。\n第二步，定位到具体的线程：top -H -p 1234 按线程显示。Go 程序的线程和 goroutine 不是一一对应的，这一步对 Go 帮助有限，更直接的是下一步。\n第三步，抓 CPU profile，找到热点函数：用 pprof 采样 30 秒，看哪些函数占用的 CPU 时间最多。常见原因有：某个循环在处理意外的大量数据、正则表达式写得不好导致回溯、频繁的 JSON 序列化、GC 太频繁（这时 runtime.gcBgMarkWorker 等函数会排在前面）。\n如果是 sy（内核态）很高，说明系统调用很多，比如频繁地读写小块数据、大量建立和关闭连接。',code:`top -H -p 1234
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
(pprof) top 10
(pprof) list handleOrder`,explain:[{at:'top -H -p 1234',text:'只看 1234 号进程，按线程显示各自的 CPU 占用。'},{at:'go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30',text:'对 Go 服务采样 30 秒的 CPU 数据（服务需要导入 net/http/pprof），然后进入 pprof 的交互命令行。'},{at:'(pprof) top 10',text:'在 pprof 里输入 top 10：列出最耗 CPU 的 10 个函数。'},{at:'(pprof) list handleOrder',text:'输入 list 函数名：逐行显示这个函数里每一行花了多少 CPU 时间，直接定位到具体的代码行。'}]},
  {title:'案例：负载很高，CPU 却很闲',body:'场景：一台 8 核机器的 load average 是 20，但 top 显示 CPU 利用率只有 10%，而 wa（iowait）很高。\n这说明大量的任务在等磁盘 I/O：它们处于不可中断睡眠（D 状态），也被算进了负载里，但并没有在使用 CPU。所以问题不在 CPU，而在磁盘。\n接下来：\n一、用 iostat -xz 1 看哪块磁盘很忙：%util 接近 100%、await（每次请求的等待时间）很大、队列很长；\n二、用 pidstat -d 1 或 iotop 找出是哪个进程在大量读写；\n三、常见原因：日志打得太多太频繁、数据库在执行大查询或者全表扫描、备份任务正在运行、磁盘本身出了故障或者是云盘的 I/O 配额用完了。\n处理：降低日志级别、给慢查询加索引、把备份任务挪到业务低峰期，或者换性能更好的磁盘。'},
  {title:'案例：Go 服务的内存一直涨',body:'场景：一个 Go 服务的 RSS（实际占用的物理内存）每天都在涨，几天后被 OOM 杀掉。可以按这个顺序排查：\n一、先确认是不是真的涨：看 RSS 和 Go 自己统计的堆大小。free 显示 used 很高不代表泄漏，可能只是页缓存；Go 释放的内存也不会马上还给操作系统，RSS 偏高一点是正常的；\n二、用 GODEBUG=gctrace=1 看每轮 GC 之后的堆大小：如果 GC 之后剩下的数据量一直在涨，说明有对象一直被引用着，回收不掉；\n三、抓 heap profile，按 inuse_space 看是哪些代码分配的内存还活着；隔一段时间再抓一份，用 -base 参数对比两份，看看增长的是哪部分；\n四、抓 goroutine profile，看 goroutine 的数量是不是也在一直涨。goroutine 泄漏是 Go 服务内存上涨最常见的原因之一：每个泄漏的 goroutine 都带着自己的栈和它引用的数据；\n五、常见的根源：全局 map 或缓存只加不删、goroutine 卡在 channel 上永远不退出、定时器没有 Stop、从大切片里截一小段长期保存。\n临时缓解可以设置 GOMEMLIMIT，让 GC 在接近上限时更积极地回收，但根本上还是要修复代码。',code:`GODEBUG=gctrace=1 ./app
go tool pprof -sample_index=inuse_space http://localhost:6060/debug/pprof/heap
go tool pprof -base heap1.pb.gz heap2.pb.gz
curl http://localhost:6060/debug/pprof/goroutine?debug=1 | head -30`,explain:[{at:'GODEBUG=gctrace=1 ./app',text:'启动时打开 GC 跟踪，每轮 GC 打印一行，其中包括 GC 前后的堆大小。'},{at:'go tool pprof -sample_index=inuse_space http://localhost:6060/debug/pprof/heap',text:'看当前还活着的内存都是哪些代码分配的。'},{at:'go tool pprof -base heap1.pb.gz heap2.pb.gz',text:'对比两个时间点抓的 heap profile，只显示这段时间里增长的部分，最容易找到泄漏点。'},{at:'curl http://localhost:6060/debug/pprof/goroutine?debug=1 | head -30',text:'查看所有 goroutine 按调用栈分组的统计。如果某个调用栈下有成千上万个 goroutine，而且数量一直涨，那里就是泄漏点。'}]},
  {title:'动手试试：复现一个 goroutine 泄漏',body:'下面的 leaky 函数在超时后就返回了，但它启动的 goroutine 还想把结果发送到一个无缓冲的 channel 里，再也没人接收，于是永远卡住。我们调用它 100 次，看看 goroutine 数量怎么变化；再看看只改了一个地方的 fixed 版本。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 leaky 和 fixed 的循环次数都改成 1000 再运行，看看泄漏的数量是不是跟着变成了 1000。想象一下线上服务每秒被调用几百次，一天会积累多少个 goroutine。'],expect:'开始时的 goroutine 数： 1\n调用 100 次有问题的版本后： 101\n再调用 100 次修好的版本，新增： 0'},code:`package main

import (
    "fmt"
    "runtime"
    "time"
)

func slowCall() string {
    time.Sleep(50 * time.Millisecond)
    return "ok"
}

func leaky() {
    ch := make(chan string)
    go func() { ch <- slowCall() }()
    select {
    case <-ch:
    case <-time.After(10 * time.Millisecond):
    }
}

func fixed() {
    ch := make(chan string, 1)
    go func() { ch <- slowCall() }()
    select {
    case <-ch:
    case <-time.After(10 * time.Millisecond):
    }
}

func main() {
    fmt.Println("开始时的 goroutine 数：", runtime.NumGoroutine())
    for i := 0; i < 100; i++ {
        leaky()
    }
    time.Sleep(200 * time.Millisecond)
    before := runtime.NumGoroutine()
    fmt.Println("调用 100 次有问题的版本后：", before)
    for i := 0; i < 100; i++ {
        fixed()
    }
    time.Sleep(200 * time.Millisecond)
    fmt.Println("再调用 100 次修好的版本，新增：", runtime.NumGoroutine()-before)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'导入 fmt、runtime 和 time。'},{at:'func slowCall() string {',to:'return "ok"',text:'模拟一个要 50 毫秒才返回的慢调用，比如查询下游服务。'},{at:'func leaky() {',text:'有问题的版本：带超时的调用。'},{at:'ch := make(chan string)',text:'无缓冲的 channel：发送方必须等到有人接收才能完成发送。'},{at:'go func() { ch <- slowCall() }()',text:'在后台做慢调用，完成后把结果发送进 ch。'},{at:'select {',text:'等结果或超时。'},{at:'case <-ch:',text:'结果先到。'},{at:'case <-time.After(10 * time.Millisecond):',text:'10 毫秒就超时了，函数返回。50 毫秒后后台 goroutine 想发送结果，却再也没有人接收，它就永远卡在发送那一行，泄漏了。'},{at:'func fixed() {',text:'修好的版本，只改了一个地方。'},{at:'ch := make(chan string, 1)',text:'容量为 1：即使没人接收，后台 goroutine 也能把结果放进缓冲区，然后正常结束。'},{at:'go func() { ch <- slowCall() }()',to:'case <-time.After(10 * time.Millisecond):',text:'其余逻辑和 leaky 完全一样。'},{at:'func main() {',to:'fmt.Println("开始时的 goroutine 数：", runtime.NumGoroutine())',text:'开始时只有 main 这一个 goroutine。'},{at:'for i := 0; i < 100; i++ {',to:'leaky()',text:'调用 100 次有问题的版本。'},{at:'time.Sleep(200 * time.Millisecond)',text:'等足够长的时间，让所有慢调用都完成。'},{at:'before := runtime.NumGoroutine()',to:'fmt.Println("调用 100 次有问题的版本后：", before)',text:'101 个：100 个 goroutine 永远卡在发送上，再也不会退出，它们占用的内存也永远不会释放。'},{at:'for i := 0; i < 100; i++ {',to:'fixed()',text:'调用 100 次修好的版本。'},{at:'time.Sleep(200 * time.Millisecond)',text:'同样等待。'},{at:'fmt.Println("再调用 100 次修好的版本，新增：", runtime.NumGoroutine()-before)',text:'新增 0 个：后台 goroutine 都正常结束了。'}]},
  {title:'案例：磁盘满了，du 却对不上',body:'场景：告警显示磁盘使用率 100%，df 显示满了，但用 du 统计各个目录的大小，加起来远小于 df 显示的已用空间。\n最常见的原因是：有大文件已经被删除了，但还有进程打开着它（比如运维直接 rm 掉了一个正在被写入的日志文件）。du 是按目录里的文件名统计的，看不到它；df 统计的是磁盘实际被占用的空间，它还在。\n处理方法：\n一、用 lsof +L1 找出“已删除但仍被打开”的文件，以及是哪个进程打开的；\n二、重启这个进程，或者让它重新打开日志文件（很多程序收到特定信号后会重新打开日志），空间就会释放；\n三、不能重启的话，通过 /proc/进程号/fd/ 下对应的文件描述符把文件截断成 0 字节；\n四、以后清理日志用 logrotate 这类工具，或者用 > 清空内容，而不是直接 rm 正在被写入的文件。'},
  {title:'案例：在 30GB 的日志里找一个请求',body:'场景：用户反馈某个订单支付失败，你拿到了这个请求的 ID，要在 30GB 的日志里找出它的所有记录。\n千万不要用 vim 或者普通编辑器打开，它会尝试把整个文件读进内存，可能直接把服务器拖垮。\n正确的做法是用流式的搜索工具，一边读一边匹配，不会把整个文件加载进内存：\n一、grep 或者更快的 rg（ripgrep）按请求 ID 搜索，加上 -n 显示行号；\n二、已经压缩的历史日志用 zgrep 直接搜索，不需要先解压；\n三、找到行号后，用 sed -n 打印那一段前后的内容，看完整的上下文。\n这也说明了一个好习惯：每条日志都要带上请求 ID（trace id），并且一次请求经过的所有服务都打印同一个 ID，出问题时才能把整条链路串起来。',code:`rg -n "req-7f3a9c" /var/log/app/app.log
zgrep -n "req-7f3a9c" /var/log/app/app.log.*.gz
sed -n '1203000,1203050p' /var/log/app/app.log`,explain:[{at:'rg -n "req-7f3a9c" /var/log/app/app.log',text:'用 ripgrep 在当前日志里搜索这个请求 ID，-n 显示行号。它是流式读取的，再大的文件也不会占很多内存。'},{at:'zgrep -n "req-7f3a9c" /var/log/app/app.log.*.gz',text:'在已经压缩的历史日志里搜索，不用先解压。'},{at:'sed -n \'1203000,1203050p\' /var/log/app/app.log',text:'找到的行号附近，打印第 1203000 到 1203050 行，查看完整的上下文。'}]},
  {title:'案例：定时任务没有执行',body:'场景：放在 crontab 里的备份脚本没有执行，手动在终端里运行却完全正常。按这个清单逐项检查：\n一、cron 服务本身有没有在运行：systemctl status cron；\n二、时区：服务器的时区可能是 UTC，你以为的“凌晨 2 点”实际是北京时间上午 10 点；\n三、权限：脚本有没有执行权限，运行 cron 任务的用户有没有权限访问相关文件；\n四、环境变量：cron 的 PATH 非常短，你在终端里能用的命令，在 cron 里可能找不到。命令写绝对路径，或者在脚本开头设置 PATH；\n五、百分号：crontab 里的 % 有特殊含义（会被当成换行），如果命令里用到了 date +%F 这样的写法，要写成 \\%；\n六、没有日志：一定要把输出重定向到文件，2>&1 把错误也带上，否则任务失败了你根本看不到原因。'}
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
