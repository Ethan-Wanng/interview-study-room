import {A,type Story} from '../story';

// Go 面试题动画（库与框架一）：net/http 启动过程、表单、防重复提交、Web 框架、Gin 中间件、参数校验、静态资源。
export const gxG:Record<string,Story>={
 'q-99686b73b491e50b':{title:'http.ListenAndServe 背后发生了什么',beats:[
  {say:'调用 http.ListenAndServe(":8080", mux)：创建一个 Server，先 net.Listen 监听 8080 端口。',add:[A('srv','🖥️','http.Server',320,60,{kind:'item',tone:'primary'}),A('ln','👂','Listen :8080',320,160,{kind:'tag'})],send:[{from:'srv',to:'ln'}]},
  {say:'然后进入 Serve 循环：不断 Accept 新连接，每来一个连接就开一个 goroutine 处理。',add:[A('c1','🔌','连接 1 → goroutine',130,270,{kind:'tag',tone:'ok'}),A('c2','🔌','连接 2 → goroutine',510,270,{kind:'tag',tone:'ok'})],send:[{from:'ln',to:'c1'},{from:'ln',to:'c2'}]},
  {say:'在这个 goroutine 里读取并解析请求，交给 Handler 的 ServeHTTP。ServeMux 按路径找到注册的处理函数，Go 1.22 起还支持 "GET /items/{id}" 这样的方法和路径参数。',bubble:{who:'srv',text:'ServeMux 路由分发'}},
  {say:'HTTP/1.1 下一个连接可以连续处理多个请求（keep-alive）。生产环境要设置 ReadHeaderTimeout、ReadTimeout、WriteTimeout、IdleTimeout，避免慢连接占满资源。',add:[A('to','⏱️','设置各类超时',320,330,{kind:'tag',tone:'warm'})]},
  {say:'记住启动过程。',memo:['Listen → Accept 循环','每个连接一个 goroutine，ServeMux 分发']},
 ]},
 'q-8273848b3bced9fa':{title:'Go 怎么处理表单输入',beats:[
  {say:'浏览器提交表单，Content-Type 是 application/x-www-form-urlencoded。',add:[A('form','📝','表单提交',110,170,{tone:'primary'}),A('h','⚙️','handler',530,170,{kind:'item'})],send:[{from:'form',to:'h',text:'POST'}]},
  {say:'调用 r.ParseForm() 后，r.Form 包含 URL 查询参数和表单字段，r.PostForm 只有正文里的字段；r.FormValue("name") 会自动解析并取第一个值。',add:[A('pf','📋','ParseForm · FormValue',320,60,{kind:'tag',tone:'ok'})]},
  {say:'上传文件用 multipart/form-data：r.ParseMultipartForm(32 << 20) 设置内存上限，r.FormFile("avatar") 取文件。',add:[A('mp','📎','ParseMultipartForm · FormFile',320,290,{kind:'tag',tone:'primary'})]},
  {say:'安全：用 http.MaxBytesReader 限制请求体大小，校验每个字段的格式和长度，文件要检查类型，不要相信文件名；JSON 请求则用 json.NewDecoder 解析。',bubble:{who:'h',text:'先限大小再解析'}},
  {say:'记住表单处理。',memo:['ParseForm / FormValue 取字段','限制请求体，校验每个输入']},
 ]},
 'q-5c023688dd855a4c':{title:'防止表单重复提交',beats:[
  {say:'用户点“提交”后网络慢，又连点了三次，服务器收到四个一样的请求，生成了四个订单。',add:[A('u','🙋','用户连点',110,170,{tone:'bad'}),A('srv','🖥️','服务器',530,170,{kind:'item',tone:'bad'})],send:[{from:'u',to:'srv',text:'×4'}]},
  {say:'前端先挡一层：点击后禁用按钮。但这只是体验，请求依然可能被重放。',add:[A('fe','🔘','按钮禁用（体验）',320,60,{kind:'tag',tone:'warm'})]},
  {say:'服务端用一次性 token：打开表单时生成 token 存入会话或 Redis，提交时用 SETNX / 删除成功才处理，第二次提交 token 已失效。',add:[A('tok','🎫','一次性 token',320,290,{kind:'tag',tone:'ok'})],tone:{srv:'ok'}},
  {say:'最终兜底是数据库唯一约束或幂等键：同一个请求号只能创建一次，重复请求返回第一次的结果。',bubble:{who:'srv',text:'这个请求处理过了'}},
  {say:'记住防重复提交。',memo:['前端禁用按钮只是体验','token / 幂等键 + 唯一约束兜底']},
 ]},
 'q-6a315295084ecc7a':{title:'Go 的 Web 框架怎么选',beats:[
  {say:'标准库 net/http：Go 1.22 起路由支持方法和路径参数，小服务直接用就够了，依赖最少。',add:[A('std','📚','net/http：够用、零依赖',320,60,{kind:'item',tone:'primary'})]},
  {say:'Gin：最流行，基于 radix 树的高性能路由、中间件、参数绑定和校验，生态丰富。Echo 和 Chi 风格类似，Chi 完全兼容标准库的 Handler。',add:[A('gin','🍸','Gin · Echo · Chi',150,190,{kind:'item',tone:'ok'})]},
  {say:'Fiber 基于 fasthttp，单机压测很快，但和标准库不兼容，很多中间件不能复用。',add:[A('fiber','⚡','Fiber：快但不兼容标准库',490,190,{kind:'item',tone:'warm'})]},
  {say:'Kratos、go-zero 这类是完整的微服务框架，带服务发现、配置、代码生成。选型看团队规模、是否需要标准库兼容和生态，而不是只看压测分数。',add:[A('ms','🏗️','Kratos · go-zero：微服务全家桶',320,310,{kind:'tag'})]},
  {say:'记住选型思路。',memo:['小服务标准库，常规 Web 用 Gin / Chi','微服务考虑 go-zero / Kratos']},
 ]},
 'q-0bd2aeebf1173124':{title:'Gin 中间件的洋葱模型',beats:[
  {say:'路由 GET /orders 挂了三个处理函数：日志中间件、鉴权中间件、业务 handler，Gin 把它们放进一个 handlers 切片。',add:[A('log','📝','Logger',110,170,{kind:'item'}),A('auth','🔐','Auth',320,170,{kind:'item'}),A('h','📦','handler',530,170,{kind:'item',tone:'primary'})]},
  {say:'请求进来，Context 的下标 index 从 0 开始执行 Logger。Logger 调用 c.Next()，下标加一，执行下一个。',send:[{from:'log',to:'auth',text:'c.Next()'},{from:'auth',to:'h',text:'c.Next()'}]},
  {say:'handler 执行完，控制权按相反顺序回到 Auth、Logger 中 c.Next() 之后的代码：Logger 在这里计算耗时并打日志——这就是洋葱模型。',send:[{from:'h',to:'log',text:'返回',tone:'ok'}],bubble:{who:'log',text:'耗时 12ms'}},
  {say:'鉴权失败时调用 c.AbortWithStatusJSON(401, …)：把下标直接设到末尾，后面的处理函数都不再执行。',tone:{auth:'warm'},sub:{auth:'Abort'}},
  {say:'记住中间件原理。',memo:['handlers 切片 + 下标，Next 执行下一个','Next 之后的代码逆序执行，Abort 终止']},
 ]},
 'q-14e3558c2af9031a':{title:'Gin 的参数校验',beats:[
  {say:'定义请求结构体，用 binding 标签声明规则：Name string `json:"name" binding:"required,min=2"`，Age int `binding:"gte=0,lte=150"`。',add:[A('st','📋','binding:"required,min=2"',320,70,{kind:'item',tone:'primary'})]},
  {say:'在 handler 里 c.ShouldBindJSON(&req)：先把 JSON 解析到结构体，再用 validator 按标签校验，失败返回错误。',add:[A('bind','🔍','ShouldBindJSON',320,180,{kind:'tag',tone:'ok'})],send:[{from:'st',to:'bind'}]},
  {say:'ShouldBind 系列只返回错误，由你决定怎么响应；Bind 系列失败时会自动写 400，不够灵活，通常用 ShouldBind。',add:[A('should','📏','优先 ShouldBind',130,290,{kind:'tag'})]},
  {say:'复杂规则可以注册自定义校验函数（比如手机号格式），并把错误信息翻译成中文返回给前端。',add:[A('custom','🧩','自定义规则 + 中文提示',510,290,{kind:'tag',tone:'primary'})]},
  {say:'记住参数校验。',memo:['结构体 binding 标签声明规则','ShouldBindJSON 解析并校验']},
 ]},
 'q-5bfa6d0377e36a1c':{title:'Gin 加载静态资源',beats:[
  {say:'r.Static("/assets", "./public")：把 ./public 目录映射到 /assets 路径下；r.StaticFile("/favicon.ico", "./favicon.ico") 映射单个文件。',add:[A('dir','📁','./public',150,100,{kind:'item'}),A('url','🌐','/assets/*',490,100,{kind:'item',tone:'primary'})],send:[{from:'dir',to:'url'}]},
  {say:'问题：部署时要把 public 目录一起拷过去，路径还依赖启动时的工作目录。',add:[A('pit','⚠️','依赖工作目录',150,240,{kind:'tag',tone:'warm'})]},
  {say:'Go 1.16 起用 embed：//go:embed public 把文件编进二进制，再用 r.StaticFS("/assets", http.FS(sub)) 提供服务，部署只要一个可执行文件。',add:[A('embed','📦','//go:embed → 单个二进制',490,240,{kind:'tag',tone:'ok'})]},
  {say:'生产环境里大量静态文件更适合交给 Nginx 或 CDN，并给带哈希的文件设置长期缓存。',add:[A('cdn','🛰️','生产交给 CDN / Nginx',320,330,{kind:'tag'})]},
  {say:'记住两种方式。',memo:['Static / StaticFile 映射目录','embed 编进二进制，生产用 CDN']},
 ]},
};
