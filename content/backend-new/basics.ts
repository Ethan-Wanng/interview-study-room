import type {AiLevel} from '../journey';

// 小白起步：后端是什么、命令行入门。
export const beBasics:AiLevel={id:'be-basics',title:'后端是什么：一次请求的旅程',summary:'从零认识客户端、服务器、HTTP、API 和 JSON',lessons:[
  {title:'前端、后端和数据库：像一家餐厅',body:'把一个 App 想象成一家餐厅：\n前端是菜单和服务员：你在手机或网页上看到、点到的一切，负责把你的需求（点什么菜）记下来，交给后厨，再把做好的菜端给你；\n后端是厨房：接收订单，按照规则做菜（检查库存够不够、算好价格、扣钱、生成订单），做好后交出去；\n数据库是仓库和账本：所有的食材（数据）和记录（订单、用户、商品）都长期存放在这里。\n所以你在 App 里点“下单”时，界面是前端；真正检查库存、扣钱、保存订单的程序，运行在远方的服务器上，这就是后端；订单最终存进数据库。\n后端工程师的工作，就是写这些在服务器上运行的程序：接收请求、执行业务规则、读写数据、返回结果。'},
  {title:'客户端和服务器',body:'发出请求的一方叫客户端，比如浏览器、手机 App、小程序；提供服务、处理请求的一方叫服务器。\n服务器其实就是一台一直开着、连着网络的电脑（通常放在机房或云上），上面运行着后端程序，24 小时等着接收请求。\n一个服务器程序同时为成千上万个客户端服务，所以后端特别关心几件事：能不能扛住很多人同时访问（并发和性能）、数据会不会出错（一致性）、出了故障能不能尽快恢复（可用性）、会不会被人攻击（安全）。这些也是后面各关要学的内容。'},
  {title:'一次请求的旅程',body:'你在浏览器里输入 shop.example.com 并回车，大致经过这几步：\n一、查地址：电脑只认 IP 地址（类似 203.0.113.10 这样的数字），不认识域名。浏览器先通过 DNS 把域名“翻译”成 IP 地址，就像查电话簿；\n二、建立连接：浏览器和这个 IP 地址的服务器建立网络连接（TCP，如果是 https 还要加密握手）；\n三、发送请求：浏览器发出一个 HTTP 请求，说明“我要什么”；\n四、服务器处理：后端程序收到请求，查数据库、执行业务逻辑；\n五、返回响应：服务器把结果放在 HTTP 响应里发回来；\n六、显示：浏览器把结果渲染成你看到的页面。\n一来一回，就是一次“请求—响应”。打开一个网页，背后可能有几十次这样的请求。'},
  {title:'网址的组成',body:'一个完整的网址（URL）由几部分组成，每部分都有自己的作用。看懂它，后面看接口文档、排查问题都会方便很多。',code:`https://shop.example.com:443/api/orders/42?debug=1#detail`,explain:[{at:'https://shop.example.com:443/api/orders/42?debug=1#detail',text:'从左到右：https 是协议（加密的 HTTP）；shop.example.com 是域名，要先通过 DNS 换成 IP；443 是端口，同一台服务器上用端口区分不同的程序，https 默认就是 443，所以平时省略不写；/api/orders/42 是路径，告诉服务器要哪个资源（订单 42）；? 后面的 debug=1 是查询参数，多个参数用 & 连接；# 后面的 detail 是锚点，只在浏览器里用于跳到页面某个位置，不会发给服务器。'}]},
  {title:'HTTP 方法：想做什么',body:'HTTP 请求的第一个词是“方法”，表示你想对资源做什么：\nGET：获取数据，比如查看订单详情。它不应该修改任何数据；\nPOST：新建，比如提交一个新订单；\nPUT：整体替换，PATCH：部分修改，比如修改收货地址；\nDELETE：删除。\n这里有一个重要的概念叫“幂等”：同一个请求执行一次和执行多次，结果一样。GET 天然是幂等的：同一个 GET /orders/42 连续发 3 次，正常情况下应该得到 3 次一样的结果，并且不会改变任何数据。PUT、DELETE 也应该是幂等的。POST 一般不是：同样的“下单”请求发 3 次，可能会创建 3 个订单，所以要特别处理重复提交。'},
  {title:'请求和响应长什么样',body:'HTTP 请求和响应都是有固定格式的文本，由几部分组成：\n请求：第一行是“方法 路径 版本”；然后是若干行“头部”，每行一个“名字: 值”，比如访问的域名、登录凭证；如果要提交数据，空一行之后是“正文”。\n响应：第一行是“版本 状态码 说明”；然后是头部，比如内容的格式；空一行之后是正文，也就是返回的数据。',code:`GET /api/orders/42 HTTP/1.1
Host: shop.example.com
Authorization: Bearer xxx

HTTP/1.1 200 OK
Content-Type: application/json

{"id":42,"status":"paid","amount":1999}`,explain:[{at:'GET /api/orders/42 HTTP/1.1',text:'请求行：用 GET 获取订单 42。'},{at:'Host: shop.example.com',text:'头部：要访问哪个网站。'},{at:'Authorization: Bearer xxx',text:'头部：登录凭证（令牌），服务器靠它知道你是谁。'},{at:'HTTP/1.1 200 OK',text:'响应的状态行：200 表示成功。'},{at:'Content-Type: application/json',text:'头部：正文是 JSON 格式。'},{at:'{"id":42,"status":"paid","amount":1999}',text:'正文：订单 42 已支付，金额 1999。金额通常用“分”做单位的整数存储，也就是 19.99 元，避免小数的精度问题。'}]},
  {title:'状态码：一眼看出结果',body:'每个响应都带一个三位数的状态码，第一位表示大类：\n2xx：成功。200 成功，201 已创建；\n3xx：重定向，要去别的地方取。301 永久搬家，302 临时跳转；\n4xx：客户端这边的问题，也就是请求本身有问题。400 参数不对，401 没有登录，403 登录了但没权限，404 要的东西不存在，429 请求太频繁；\n5xx：服务器这边出错了。500 服务器内部错误，502、503、504 通常是服务器挂了、太忙或者超时。\n注意：返回 500 并不能说明用户传的参数有问题，那是服务器自己的 bug 或故障；参数有问题应该返回 400。用户没登录就访问需要登录的接口，返回 401。'},
  {title:'API：后端的“接口说明书”',body:'API（应用程序接口）就是后端对外提供的“服务清单”：有哪些功能、每个功能访问哪个路径、用什么方法、要传什么参数、会返回什么数据、出错时返回什么。前端、App、其他服务都按照这份约定来调用后端。\n一种常见的设计风格叫 RESTful：\n一、路径用名词表示“资源”，用复数：/orders 表示订单集合，/orders/42 表示 42 号订单；\n二、用 HTTP 方法表示“动作”，而不是把动作写进路径：获取订单 42 用 GET /orders/42，而不是 GET /getOrder?id=42；\n三、出错时返回合适的状态码，以及清楚的错误信息。',code:`GET    /orders
GET    /orders/42
POST   /orders
PATCH  /orders/42
DELETE /orders/42`,explain:[{at:'GET    /orders',text:'获取订单列表。'},{at:'GET    /orders/42',text:'获取 42 号订单的详情。'},{at:'POST   /orders',text:'创建一个新订单，订单内容放在请求正文里。'},{at:'PATCH  /orders/42',text:'修改 42 号订单的部分内容，比如收货地址。'},{at:'DELETE /orders/42',text:'删除（或取消）42 号订单。'}]},
  {title:'JSON：前后端交换数据的格式',body:'JSON 是前后端之间、服务之间交换数据最常用的格式，人能读懂，程序也容易解析。它的规则很少：\n一、对象用花括号 {}，里面是“键: 值”，用逗号分隔；\n二、数组用方括号 []；\n三、键和字符串都必须用双引号，单引号不合法；\n四、值可以是字符串、数字、true、false、null、对象、数组；\n五、最后一个元素后面不能多写逗号，也不能写注释。\n下面第一段是合法的 JSON，第二段有三处错误：键没有引号、用了单引号、末尾多了一个逗号。',code:`{"name": "小明", "age": 18, "tags": ["go", "后端"], "vip": true, "address": null}

{name: '小明', "age": 18,}`,explain:[{at:'{"name": "小明", "age": 18, "tags": ["go", "后端"], "vip": true, "address": null}',text:'合法的 JSON：字符串、数字、数组、布尔值和 null 都有。'},{at:'{name: \'小明\', "age": 18,}',text:'不合法：name 没有加双引号，小明用了单引号，18 后面多了一个逗号。'}]},
  {title:'动手试试：写一个最简单的订单 API',body:'我们用 Python 自带的模块写一个只有一个功能的后端：GET /orders/编号，订单存在就返回 200 和订单的 JSON，不存在就返回 404。然后在同一个程序里扮演客户端，去请求它。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 order_api.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python order_api.py（Mac 用 python3 order_api.py），对照下面的输出。','在 ORDERS 里再加一个订单 7，再把请求改成 /orders/7，看看返回什么。'],expect:'200 {\'id\': 42, \'status\': \'paid\', \'amount\': 1999}\n订单状态： paid 金额（元）： 19.99\n404 {\'error\': \'订单不存在\'}'},code:`import http.server
import json
import threading
import urllib.error
import urllib.request

ORDERS = {42: {"id": 42, "status": "paid", "amount": 1999}}

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parts = self.path.strip("/").split("/")
        if len(parts) == 2 and parts[0] == "orders" and int(parts[1]) in ORDERS:
            self.reply(200, ORDERS[int(parts[1])])
        else:
            self.reply(404, {"error": "订单不存在"})

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass

server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"

with urllib.request.urlopen(base + "/orders/42") as resp:
    order = json.loads(resp.read())
    print(resp.status, order)
    print("订单状态：", order["status"], "金额（元）：", order["amount"] / 100)

try:
    urllib.request.urlopen(base + "/orders/99")
except urllib.error.HTTPError as e:
    print(e.code, json.loads(e.read()))
server.shutdown()`,explain:[{at:'import http.server',to:'import urllib.request',text:'都是 Python 自带的模块：http.server 写服务端，json 处理 JSON，threading 让服务在后台运行，urllib 发请求。'},{at:'ORDERS = {42: {"id": 42, "status": "paid", "amount": 1999}}',text:'用一个字典假装是数据库，里面只有 42 号订单。'},{at:'class Handler(http.server.BaseHTTPRequestHandler):',text:'后端的处理逻辑写在这个类里。'},{at:'def do_GET(self):',text:'收到 GET 请求时执行。'},{at:'parts = self.path.strip("/").split("/")',text:'把路径 /orders/42 去掉首尾斜杠再切开，得到 ["orders", "42"]。'},{at:'if len(parts) == 2 and parts[0] == "orders" and int(parts[1]) in ORDERS:',to:'self.reply(200, ORDERS[int(parts[1])])',text:'路径格式对、订单也存在，就返回 200 和订单数据。'},{at:'else:',to:'self.reply(404, {"error": "订单不存在"})',text:'否则返回 404 和一个说明错误的 JSON。'},{at:'def reply(self, code, data):',text:'一个小工具：把数据转成 JSON 返回。'},{at:'body = json.dumps(data, ensure_ascii=False).encode()',text:'把字典转成 JSON 文本，ensure_ascii=False 让中文原样输出，再转成字节。'},{at:'self.send_response(code)',to:'self.end_headers()',text:'写状态码和头部，声明正文是 UTF-8 编码的 JSON。'},{at:'self.wfile.write(body)',text:'写正文。'},{at:'def log_message(self, *args):',to:'pass',text:'关掉默认的访问日志。'},{at:'server = http.server.HTTPServer(("127.0.0.1", 0), Handler)',to:'base = f"http://127.0.0.1:{server.server_port}"',text:'在本机启动服务（端口由系统分配），放到后台线程里运行。'},{at:'with urllib.request.urlopen(base + "/orders/42") as resp:',text:'现在扮演客户端：请求 42 号订单。'},{at:'order = json.loads(resp.read())',text:'读出响应正文，把 JSON 文本解析成 Python 字典。'},{at:'print(resp.status, order)',to:'print("订单状态：", order["status"], "金额（元）：", order["amount"] / 100)',text:'打印状态码和订单；金额以分存储，除以 100 显示为元。'},{at:'try:',to:'urllib.request.urlopen(base + "/orders/99")',text:'请求一个不存在的订单。'},{at:'except urllib.error.HTTPError as e:',to:'print(e.code, json.loads(e.read()))',text:'4xx、5xx 会抛出 HTTPError，从中拿到状态码 404 和错误信息。'},{at:'server.shutdown()',text:'关闭服务。'}]},
  {title:'永远不要相信前端传来的数据',body:'后端最重要的一条安全原则：前端传来的任何数据都可能被篡改。\n用户可以绕过 App 界面，用工具直接给你的接口发请求，想传什么就传什么。所以：\n一、价格：下单时不能用前端传来的价格，要在后端根据商品 ID 重新查价格、重新算总额。否则有人把 1999 元的商品改成 1 分钱提交，你就亏了；\n二、权限：不能相信前端传的“我是管理员”、“这个订单是我的”，要根据登录凭证在后端确认用户身份，并检查他是否有权限操作这个订单；\n三、参数：数量是不是正数、长度是否超限、格式是否正确，都要在后端校验。前端的校验只是为了用户体验，挡不住故意的攻击。'}
 ],quiz:[
 {id:'be-basics-1',q:'用户在 App 里点“下单”，下面哪件事通常由后端完成？',options:['把下单按钮画成醒目的红色','检查库存、扣减余额并保存订单','点击时播放一段提示音效','根据屏幕调整页面字体大小'],why:['按钮样式属于界面展示，由前端 CSS 完成。','','播放音效是客户端的交互效果，由前端完成。','字体和排版适配属于前端的样式工作。'],answer:1,explain:'界面展示属于前端；业务规则和数据读写在后端完成。'},
 {id:'be-basics-2',q:'浏览器访问 shop.example.com 时，把域名翻译成 IP 地址的是？',options:['HTTP','DNS','JSON','SQL'],why:['HTTP 是拿到 IP、建立连接之后用来传输请求和响应的协议。','','JSON 是一种数据格式，与地址解析无关。','SQL 是操作数据库的语言。'],answer:1,explain:'DNS 负责域名解析；拿到 IP 后才能建立连接、发送 HTTP 请求。',interview:'q-7314d29f4c8ca639'},
 {id:'be-basics-3',q:'想“获取订单 42 的详情”，最符合习惯的请求是？',options:['POST /getOrder?id=42','GET /orders/42','DELETE /orders/42','PUT /orders'],why:['读取数据不该用 POST，路径里用动词 getOrder 也不符合 REST 习惯。','','DELETE 表示删除订单，会产生副作用。','PUT 用于整体更新资源，而且路径里没有指明是哪个订单。'],answer:1,explain:'获取资源用 GET，路径用名词表示资源。'},
 {id:'be-basics-4',type:'multi',q:'下面哪些状态码表示“客户端这边的问题”？（多选）',options:['400','401','502','500'],why:['','','502 Bad Gateway 表示网关从上游服务拿到了无效响应，是服务端问题。','500 表示服务器内部出错，是服务端问题。'],answers:[0,1],explain:'4xx 是客户端错误：400 参数有误、401 未登录、404 找不到；5xx 是服务端错误：500 内部错误、502 网关上游异常。'},
 {id:'be-basics-5',type:'judge',q:'接口返回 500 状态码，说明用户传的参数一定有问题。',answer:false,explain:'5xx 表示服务器出错，比如程序异常、数据库连不上；参数错误应该返回 400。'},
 {id:'be-basics-6',q:'下面哪一段是合法的 JSON？',options:['{name: "Tom", age: 18}','{"name": "Tom", "age": 18}','{"name": "Tom", "age": 18,}','{\'name\': \'Tom\', \'age\': 18}'],why:['JSON 的键必须加双引号，不能像 JS 对象那样省略。','','JSON 不允许最后一项后面有多余的逗号。','JSON 只认双引号，单引号的键和字符串都不合法。'],answer:1,explain:'JSON 的键和字符串都必须用双引号，最后一项后面不能有多余的逗号。'},
 {id:'be-basics-7',type:'fill',q:'用户没有登录就访问需要登录的接口，通常返回状态码 ____。',accepted:['401'],explain:'401 Unauthorized 表示未认证；已登录但没权限是 403。'},
 {id:'be-basics-8',q:'同一个 GET /orders/42 请求连续发 3 次，正常情况下应该？',options:['创建出 3 个相同的订单','返回同样的订单信息，不改变数据','第三次请求会把订单删除','重复请求会被服务器报错拒绝'],why:['读取请求不应该创建数据，创建应使用 POST。','','GET 不应产生任何副作用，更不会删除数据。','GET 是安全且幂等的，重复请求是正常行为，不应报错。'],answer:1,explain:'GET 用来读取，不应该产生副作用，重复请求结果一样。'},
 {id:'be-basics-9',type:'judge',q:'后端不能相信前端传来的数据，价格、权限这类关键信息要在服务器上重新校验。',answer:true,explain:'请求可以被任何人伪造，金额、库存、权限都必须由后端判断。'},
 {id:'be-basics-10',type:'short',q:'用自己的话说说：在浏览器里输入网址回车后，到看到页面，大致经过了哪些步骤？',reference:'先用 DNS 把域名解析成 IP；和服务器建立连接（HTTPS 还要做 TLS 握手）；浏览器发出 HTTP 请求；服务器上的后端程序处理请求，可能读写数据库，然后返回 HTTP 响应；浏览器解析 HTML、CSS、执行 JavaScript，最后把页面渲染出来。',points:['DNS 解析域名','建立连接（HTTPS 有 TLS）','发送 HTTP 请求，后端处理并返回响应','浏览器解析并渲染页面'],explain:'这是后端面试最经典的开场题，后面的关卡会把每一步讲得更深。',interview:'q-7314d29f4c8ca639'},
]};

export const beCli:AiLevel={id:'be-cli',title:'命令行与 Linux 入门',summary:'目录、文件、权限、管道和远程登录，服务器上的基本功',lessons:[
  {title:'为什么后端要会命令行',body:'我们平时用电脑，都是用鼠标点图标、点菜单。但后端程序运行在服务器上，服务器通常没有图形界面，没有桌面也没有鼠标，只能通过“终端”输入一行行文字命令来操作它。\n部署程序、看日志、查问题、改配置，都要在命令行里完成。而且绝大多数服务器用的是 Linux 系统，所以后端工程师一定要会 Linux 的基本命令。\n好消息是：常用的命令其实就二三十个，这一关先学最基础的：在目录之间走动、管理文件、看文件内容、权限、管道和重定向，以及怎么登录远程服务器。'},
  {title:'先准备一个 Linux 终端',body:'要动手练习，需要一个能运行 Linux 命令的终端：\n一、Mac：打开“终端”应用就行，绝大部分命令都一样；\n二、Windows：推荐用 WSL（Windows 自带的 Linux 子系统）。以管理员身份打开 PowerShell，运行 wsl --install，按提示重启电脑，之后在开始菜单里打开 Ubuntu，第一次会让你设置一个用户名和密码；\n三、已经装了 Docker 的话，运行 docker run -it --rm ubuntu bash 也能得到一个临时的 Ubuntu 终端。\n终端里会显示一个“提示符”，比如 tom@laptop:~$，意思是“用户 tom，在电脑 laptop 上，当前在 ~ 目录，可以输入命令了”。输入命令后按回车执行。\n安装过程中遇到问题，可以点右下角的“问 AI”。'},
  {title:'目录和路径',body:'Linux 的所有文件和目录（也就是文件夹）组成一棵倒过来的树，最顶上是根目录，写作 /。常见的目录有：/home 存放用户的个人文件，/etc 存放配置文件，/var/log 存放日志，/tmp 存放临时文件。\n每个用户有自己的“家目录”，比如 /home/tom，用 ~ 表示。\n路径有两种写法：\n绝对路径：以 / 开头，从根目录开始一级级写，比如 /var/log/nginx，在哪里用都指向同一个地方；\n相对路径：不以 / 开头，从当前所在的目录开始算，比如当前在 /var，写 log/nginx 就是 /var/log/nginx。\n两个特殊的名字：. 表示当前目录，.. 表示上一级目录。'},
  {title:'在目录之间走动',body:'三个最基本的命令：\npwd：显示“我现在在哪个目录”（打印当前工作目录的完整路径）；\nls：列出当前目录里有哪些文件和目录。ls -l 显示详细信息（权限、大小、修改时间），ls -a 连隐藏文件（名字以 . 开头的）也显示；\ncd 目录：进入某个目录。cd .. 返回上一级，cd ~ 或者只写 cd 回到家目录，cd - 回到上一次所在的目录。\n小技巧：输入路径时按 Tab 键会自动补全名字，按两下会列出所有可能的选项，既省事又不容易打错。',code:`pwd
ls -l
cd /var/log
pwd
cd ..
pwd
cd ~`,explain:[{at:'pwd',text:'看看现在在哪，比如显示 /home/tom。'},{at:'ls -l',text:'列出当前目录的文件和详细信息。'},{at:'cd /var/log',text:'用绝对路径进入日志目录。'},{at:'pwd',text:'显示 /var/log。'},{at:'cd ..',text:'返回上一级目录。'},{at:'pwd',text:'显示 /var。如果原来在 /var/log/nginx，cd .. 之后就在 /var/log。'},{at:'cd ~',text:'回到自己的家目录。'}]},
  {title:'管理文件：建、复制、移动、删除',body:'mkdir 目录名：新建目录，mkdir -p a/b/c 可以一次建好多级目录；\ntouch 文件名：新建一个空文件；\ncp 源 目标：复制文件，复制目录要加 -r；\nmv 源 目标：移动文件，也用来改名；\nrm 文件：删除文件，删除目录要用 rm -r。\n特别注意：Linux 的 rm 没有回收站，删了就找不回来了。rm -rf 更危险：-r 表示连目录里的东西一起删，-f 表示强制删除、不提示确认，一旦路径写错，后果非常严重。',code:`mkdir -p project/logs
touch project/readme.txt
cp project/readme.txt project/readme.bak
mv project/readme.bak project/old.txt
rm project/old.txt
rm -r project`,explain:[{at:'mkdir -p project/logs',text:'一次建好 project 和它下面的 logs 两级目录。'},{at:'touch project/readme.txt',text:'新建一个空文件。'},{at:'cp project/readme.txt project/readme.bak',text:'复制一份备份。'},{at:'mv project/readme.bak project/old.txt',text:'把备份改名为 old.txt（mv 既能移动也能改名）。'},{at:'rm project/old.txt',text:'删除这个文件，没有回收站。'},{at:'rm -r project',text:'删除整个 project 目录以及里面的所有内容。'}]},
  {title:'查看文件内容',body:'cat 文件：把整个文件的内容一次性输出到屏幕上，适合小文件；\nless 文件：分页查看，按空格翻页，按 / 再输入关键字搜索，按 q 退出，适合大文件；\nhead -n 20 文件：只看开头 20 行；\ntail -n 20 文件：只看最后 20 行，最新的日志通常在文件末尾；\ntail -f 文件：持续盯着文件，有新内容写进来就马上显示出来，看实时日志时最常用，按 Ctrl+C 停止。\n很大的日志文件不要用 cat 全部输出，也不要用编辑器打开，用 less、head、tail 只看需要的部分。',code:`cat config.yaml
less app.log
head -n 20 app.log
tail -n 50 app.log
tail -f app.log`,explain:[{at:'cat config.yaml',text:'输出整个配置文件。'},{at:'less app.log',text:'分页浏览日志，按 q 退出。'},{at:'head -n 20 app.log',text:'看日志的前 20 行。'},{at:'tail -n 50 app.log',text:'看日志的最后 50 行。'},{at:'tail -f app.log',text:'实时跟踪新写入的日志，按 Ctrl+C 结束。'}]},
  {title:'动手试试：在终端里建一个小项目',body:'在你的 Linux 终端里，依次输入下面的命令（每输入一行按一次回车），建一个练习目录，写一个简单的日志文件，再在目录之间走一走。',practice:{steps:['按“先准备一个 Linux 终端”那张卡片的方法，打开终端。','把下面的命令一行一行地输入执行。','对照下面的输出。pwd 显示的路径里，you 会是你自己的用户名（Mac 上是 /Users/你的用户名/cli-try）。','最后输入 ls -l，看看 logs 这一行开头的 d 是什么意思（d 表示它是目录）。'],expect:'/home/you/cli-try\napp.log\nINFO 启动成功\nERROR 数据库连接失败\nINFO 处理请求\n/home/you/cli-try/logs'},code:`mkdir -p ~/cli-try && cd ~/cli-try
pwd
mkdir logs
echo "INFO 启动成功" > logs/app.log
echo "ERROR 数据库连接失败" >> logs/app.log
echo "INFO 处理请求" >> logs/app.log
ls logs
cat logs/app.log
cd logs
pwd
cd ..`,explain:[{at:'mkdir -p ~/cli-try && cd ~/cli-try',text:'在家目录下建一个练习目录并进入它。&& 表示前一个命令成功后再执行后一个。'},{at:'pwd',text:'确认现在的位置。'},{at:'mkdir logs',text:'建一个 logs 子目录。'},{at:'echo "INFO 启动成功" > logs/app.log',text:'echo 输出一段文字，> 把它写进文件（文件不存在就新建，存在就覆盖）。'},{at:'echo "ERROR 数据库连接失败" >> logs/app.log',to:'echo "INFO 处理请求" >> logs/app.log',text:'>> 是追加到文件末尾，不会覆盖原来的内容。'},{at:'ls logs',text:'列出 logs 目录里的文件：app.log。'},{at:'cat logs/app.log',text:'查看日志内容，三行都在。'},{at:'cd logs',to:'pwd',text:'进入 logs 目录，再看一下位置。'},{at:'cd ..',text:'回到上一级的 cli-try。'}]},
  {title:'权限：谁能读、写、执行',body:'用 ls -l 查看文件时，每行开头有一串像 -rwxr-x--- 的字符，这就是权限：\n第 1 个字符：文件类型，- 是普通文件，d 是目录；\n接下来 9 个字符分成 3 组，每组 3 个，依次是：文件所有者、同组用户、其他所有人的权限；\n每组里的 r 表示可以读，w 表示可以写，x 表示可以执行，- 表示没有这个权限。\n比如 -rwxr-x---：所有者可以读、写、执行；同组用户可以读和执行；其他人什么权限都没有。\n常用命令：\nchmod +x run.sh：给脚本加上执行权限，之后才能用 ./run.sh 运行它；\nchown tom run.sh：把文件的所有者改成 tom；\nsudo 命令：临时用管理员（root）的身份执行一条命令，比如安装软件、修改系统配置。sudo 权限很大，执行前要确认清楚。'},
  {title:'管道和 grep：把命令连起来',body:'| 叫管道：把前一个命令的输出，直接作为后一个命令的输入。多个简单的命令用管道连起来，就能完成复杂的任务。\ngrep 关键字 文件：只显示包含关键字的行，排查日志时最常用。grep -c 只统计有多少行匹配，grep -i 不区分大小写，grep -n 显示行号；\nwc -l：统计有多少行。\n比如 cat app.log | grep ERROR | wc -l 的意思是：输出日志内容 → 只留下包含 ERROR 的行 → 数一数有几行，也就是“一共有多少条错误”。',code:`grep ERROR app.log
grep -c INFO app.log
cat app.log | grep INFO | wc -l
ps aux | grep nginx`,explain:[{at:'grep ERROR app.log',text:'只显示包含 ERROR 的行。'},{at:'grep -c INFO app.log',text:'直接统计包含 INFO 的行数。'},{at:'cat app.log | grep INFO | wc -l',text:'用管道连接三个命令：输出全部内容 → 过滤出 INFO 的行 → 数行数。结果和上一行一样。'},{at:'ps aux | grep nginx',text:'列出所有进程，再筛选出和 nginx 有关的，看看它有没有在运行。'}]},
  {title:'重定向：把输出写进文件',body:'程序有两种输出：正常输出（标准输出）和错误信息（标准错误），默认都显示在屏幕上。\n> 文件：把正常输出写进文件，会覆盖原来的内容；\n>> 文件：追加到文件末尾；\n2>&1：把错误信息也合并到正常输出去的地方。\n要特别注意：./run.sh > out.log 只会把正常输出写进 out.log，错误信息仍然显示在屏幕上，不会进文件。想把两种都写进文件，要写成 ./run.sh > out.log 2>&1。',code:`./run.sh > out.log
./run.sh > out.log 2>&1
./run.sh >> out.log 2>&1`,explain:[{at:'./run.sh > out.log',text:'只有正常输出进了文件，错误信息还是显示在屏幕上。'},{at:'./run.sh > out.log 2>&1',text:'正常输出和错误信息都写进 out.log（覆盖）。'},{at:'./run.sh >> out.log 2>&1',text:'同上，但追加到末尾，适合长期记录日志。'}]},
  {title:'动手试试：管道、权限和重定向',body:'继续在刚才的 cli-try 目录里操作：用 grep 筛选日志，新建一个脚本，看看没有执行权限时运行会怎样，加上权限后再运行；最后试试把错误信息重定向到文件里。',practice:{steps:['确认还在 ~/cli-try 目录里（用 pwd 看一下，不在的话先 cd ~/cli-try）。','把下面的命令一行一行地输入执行，对照下面的输出。','第一次运行 ./run.sh 会报 Permission denied（权限不够），这是正常的，加上执行权限后就能运行了。','练习完后，可以用 cd ~ && rm -r ~/cli-try 删除练习目录（删除前再确认一遍路径）。'],expect:'ERROR 数据库连接失败\n2\n2\n-rw-r--r--\nbash: ./run.sh: Permission denied\n-rwxr-xr-x\n脚本运行了\nls: cannot access \'/nope\': No such file or directory'},code:`grep ERROR logs/app.log
grep -c INFO logs/app.log
cat logs/app.log | grep INFO | wc -l
printf '#!/bin/bash\\necho 脚本运行了\\n' > run.sh
ls -l run.sh | cut -c1-10
./run.sh
chmod +x run.sh
ls -l run.sh | cut -c1-10
./run.sh
ls /nope > out.log 2>&1
cat out.log`,explain:[{at:'grep ERROR logs/app.log',text:'找出错误日志。'},{at:'grep -c INFO logs/app.log',text:'统计 INFO 有 2 行。'},{at:'cat logs/app.log | grep INFO | wc -l',text:'用管道得到同样的结果 2。'},{at:'printf \'#!/bin/bash\\necho 脚本运行了\\n\' > run.sh',text:'用 printf 写一个两行的脚本：第一行 #!/bin/bash 表示用 bash 来执行，第二行打印一句话。\\n 表示换行。'},{at:'ls -l run.sh | cut -c1-10',text:'只看权限部分（每行前 10 个字符）：-rw-r--r--，没有 x，不能执行。'},{at:'./run.sh',text:'./ 表示运行当前目录下的这个文件。没有执行权限，报 Permission denied。'},{at:'chmod +x run.sh',text:'加上执行权限。'},{at:'ls -l run.sh | cut -c1-10',text:'权限变成了 -rwxr-xr-x。'},{at:'./run.sh',text:'这次运行成功，打印“脚本运行了”。'},{at:'ls /nope > out.log 2>&1',text:'列一个不存在的目录会产生错误，2>&1 让错误信息也写进 out.log，屏幕上什么都不显示。'},{at:'cat out.log',text:'错误信息果然在文件里。'}]},
  {title:'远程登录：ssh 和 scp',body:'服务器在机房或者云上，要通过网络登录上去操作：\nssh 用户名@服务器地址：登录远程服务器，比如 ssh deploy@10.0.0.8，登录后输入的命令就在那台服务器上执行，输入 exit 退出；\nscp 本地文件 用户名@服务器地址:目标路径：把文件复制到服务器上，反过来写就是从服务器下载。\n登录通常有两种方式：输入密码，或者使用“密钥”。密钥更安全也更方便：用 ssh-keygen 在自己电脑上生成一对密钥，把公钥放到服务器上，之后登录就不用再输密码了。私钥要妥善保管，绝不能发给别人。',code:`ssh deploy@10.0.0.8
scp app.tar.gz deploy@10.0.0.8:/opt/app/
ssh-keygen -t ed25519`,explain:[{at:'ssh deploy@10.0.0.8',text:'以 deploy 用户登录 IP 为 10.0.0.8 的服务器。'},{at:'scp app.tar.gz deploy@10.0.0.8:/opt/app/',text:'把本地的 app.tar.gz 复制到服务器的 /opt/app/ 目录里。'},{at:'ssh-keygen -t ed25519',text:'生成一对 ed25519 类型的密钥，默认保存在 ~/.ssh/ 目录下，.pub 结尾的是可以公开的公钥。'}]},
  {title:'rm -rf 之前，先做这些检查',body:'在服务器上误删文件是最常见、也最严重的事故之一。执行 rm -rf 之前，养成这些习惯：\n一、先用 pwd 确认当前在哪个目录，用 ls 看清楚要删的是什么；\n二、路径尽量写绝对路径，并且仔细检查一遍，尤其注意不要多打空格：rm -rf /opt/app /old 和 rm -rf /opt/app/old 是完全不同的意思，前者会删掉两个目录；\n三、路径里有变量时（比如 rm -rf $DIR/*），先确认变量不是空的，否则可能变成 rm -rf /*；\n四、重要的数据先备份，或者先 mv 到一个临时目录，确认没问题后再删；\n五、确认自己登录的是哪一台服务器（测试环境还是生产环境），能不用 sudo 就不用。'}
 ],quiz:[
 {id:'be-cli-1',q:'想知道自己“现在在哪个目录”，用哪个命令？',options:['ls','pwd','cd','whoami'],why:['ls 列出目录里的文件，不显示当前路径。','','cd 用于切换目录，不带参数时会回到家目录。','whoami 显示当前登录的用户名。'],answer:1,explain:'pwd 打印当前工作目录；whoami 显示当前用户。'},
 {id:'be-cli-2',q:'当前在 /var/log/nginx，执行 cd .. 之后在哪？',options:['/','/var','/var/log','/var/nginx'],why:['/ 是根目录，需要连续多次 cd .. 才能到达。','/var 是上两级目录。','','.. 只是回到上一级目录，不会跳过 log 这一层。'],answer:2,explain:'.. 表示上一级目录。'},
 {id:'be-cli-3',type:'multi',q:'下面哪些命令可以查看文件内容？（多选）',options:['cat','less','tail','head'],why:['','','',''],answers:[0,1,2,3],explain:'cat 输出整个文件，less 分页浏览，tail 查看末尾（-f 持续跟踪），head 查看开头。'},
 {id:'be-cli-4',q:'要持续盯着日志文件的新内容，用哪个命令？',options:['head app.log','tail -f app.log','less app.log','cat app.log'],why:['head 只显示文件开头的若干行。','','less 打开后默认不会自动刷新新内容，需要再按 F 进入跟随模式。','cat 输出当前全部内容后就结束，不会持续显示新内容。'],answer:1,explain:'tail -f 会一直输出新追加的行；日志会轮转时用 tail -F 更稳。',interview:'q-eedf93d3b0d049a4'},
 {id:'be-cli-5',q:'文件权限显示为 -rwxr-x---，“其他人”有什么权限？',options:['读、写和执行','读和执行','只有读','没有任何权限'],why:['rwx 是所有者的权限。','r-x 是同组用户的权限。','只读应显示为 r--，这里其他人一组是 ---。',''],answer:3,explain:'三组依次是所有者 rwx、同组 r-x、其他人 ---。'},
 {id:'be-cli-6',type:'fill',q:'给脚本 run.sh 加上执行权限的命令是 chmod ____ run.sh。',accepted:['+x','u+x','a+x','755'],explain:'chmod +x 加执行权限；用数字 755 也行。'},
 {id:'be-cli-7',q:'cat app.log | grep ERROR 中的 | 是什么作用？',options:['表示后面的内容是注释说明','把前一个命令的输出交给后一个','让整条命令放到后台去运行','把命令的输出写入到文件中'],why:['Shell 中的注释符号是 #。','','后台运行使用 & 符号。','写入文件使用重定向 > 或 >>。'],answer:1,explain:'管道把数据从一个命令传给下一个，可以把小工具组合起来。'},
 {id:'be-cli-8',type:'judge',q:'./run.sh > out.log 会把错误输出也写进 out.log。',answer:false,explain:'> 只重定向标准输出（1），错误输出（2）还会打在屏幕上；要加 2>&1。',interview:'q-f5db80a74a10c0eb'},
 {id:'be-cli-9',q:'要登录 IP 为 10.0.0.8 的服务器，用户是 deploy，命令是？',options:['ssh deploy@10.0.0.8','ping deploy@10.0.0.8','cd deploy@10.0.0.8','telnet 10.0.0.8 deploy'],why:['','ping 只检测网络是否连通，不能登录。','cd 只能切换本机的目录。','telnet 是明文传输的旧协议，而且这里的参数是端口而不是用户名。'],answer:0,explain:'ssh 用户名@主机 进行远程登录。'},
 {id:'be-cli-10',type:'short',q:'在服务器上执行 rm -rf 前，你会做哪些检查来避免误删？',reference:'先用 pwd 确认当前目录，用 ls 看清要删的是哪些文件；路径尽量写绝对路径，避免变量为空时变成删除根目录；不确定时先 mv 到临时目录或备份；生产环境谨慎使用 sudo；重要数据要有备份。',points:['确认当前目录和目标文件','用明确的路径，提防空变量','先备份或移动而不是直接删','谨慎使用 sudo，重要数据有备份'],explain:'rm 没有回收站，养成检查的习惯比记住命令更重要。',interview:'q-c68cdee90c65dfe4'},
]};
