import type {AiLevel} from '../journey';

// 小白起步：后端是什么、命令行入门。
export const beBasics:AiLevel={id:'be-basics',title:'后端是什么：一次请求的旅程',summary:'从零认识客户端、服务器、HTTP、API 和 JSON',lessons:[
 {title:'前端、后端和数据库',body:'你在手机上点“下单”，界面属于前端；接收请求、检查库存、扣钱、保存订单的程序跑在服务器上，这是后端；订单最终存进数据库。后端的工作就是：接收请求、执行业务规则、读写数据、返回结果。'},
 {title:'一次请求是怎么走的',body:'浏览器先用 DNS 把域名翻译成 IP 地址，再和服务器建立连接，发出一个 HTTP 请求。服务器上的程序处理完，返回一个 HTTP 响应，浏览器再把结果显示出来。一来一回，就是一次“请求—响应”。'},
 {title:'HTTP 请求长什么样',body:'请求由方法、路径、头部和正文组成。常见方法：GET 获取数据，POST 新建，PUT/PATCH 修改，DELETE 删除。响应带一个状态码：2xx 成功，3xx 重定向，4xx 是客户端的问题（400 参数错、401 未登录、403 没权限、404 不存在），5xx 是服务器出错。',code:'GET /api/orders/42 HTTP/1.1\nHost: shop.example.com\nAuthorization: Bearer xxx\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"id":42,"status":"paid","amount":1999}'},
 {title:'API 和 JSON',body:'API 是后端对外提供的“接口说明”：哪个路径、用什么方法、传什么参数、返回什么。数据最常用 JSON 表示：对象用 {}，数组用 []，字符串要双引号。好的 API 路径用名词表示资源（/orders/42），用方法表示动作，错误时返回合适的状态码和清楚的错误信息。'},
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
 {title:'在终端里走动',body:'服务器通常没有图形界面，要在终端里敲命令。pwd 看当前在哪个目录，ls -l 列出文件，cd 进入目录（cd .. 返回上一级，cd ~ 回到家目录）。路径以 / 开头是绝对路径，否则是相对当前目录的相对路径。',code:'pwd            # /home/tom\nls -l          # 列出详细信息\ncd /var/log    # 进入日志目录\ncd ..          # 回到 /var'},
 {title:'文件的增删改查',body:'mkdir 建目录，touch 建空文件，cp 复制，mv 移动或改名，rm 删除（rm -r 删目录）。cat 一次性输出整个文件，less 分页查看，head / tail 看开头和结尾，tail -f 持续跟踪新写入的日志。rm 删除没有回收站，执行前看清楚。'},
 {title:'权限：谁能读、写、执行',body:'ls -l 第一列像 -rwxr-xr--：第一个字符表示类型，后面三组分别是“所有者、同组用户、其他人”的读 r、写 w、执行 x 权限。chmod 改权限（chmod +x run.sh 加执行权限），chown 改所有者。sudo 临时用管理员身份执行命令。'},
 {title:'管道、重定向和远程登录',body:'| 管道把前一个命令的输出交给下一个命令；> 把输出写进文件（覆盖），>> 追加，2>&1 把错误输出也合进去。grep 按关键字过滤。ssh user@host 登录远程服务器，scp 复制文件过去。',code:'cat app.log | grep ERROR | wc -l    # 数一数有多少条错误\n./run.sh > out.log 2>&1             # 正常输出和错误都写进文件\nssh deploy@10.0.0.8'},
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
