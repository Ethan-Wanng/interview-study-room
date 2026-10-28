import {A,type LessonStory} from './story';

// 前端开发动画课堂（二）：进阶后段、高阶与专家关卡。
export const feLessonsB:LessonStory[]=[
 ({id:'fe-an-net',level:'fe-net',kind:'advanced',icon:'📡',title:'一个请求的出门与回家',summary:'fetch、跨域、缓存和存储。',beats:[
  {say:'页面在 app.com，用 fetch 请求 api.com 的订单数据。域名不同，这是跨域请求。',add:[A('page','🌐','app.com',110,170,{kind:'item',tone:'primary'}),A('api','🖥️','api.com',530,170,{kind:'item'})],send:[{from:'page',to:'api',text:'fetch'}]},
  {say:'服务器返回 Access-Control-Allow-Origin: app.com，浏览器才放行响应。',add:[A('cors','🛂','CORS 响应头',320,60,{kind:'tag',tone:'ok'})],send:[{from:'api',to:'page',text:'放行',tone:'ok'}]},
  {say:'注意 404、500 不会让 fetch 失败，要检查 response.ok。',add:[A('ok','⚠️','检查 res.ok',320,290,{kind:'tag',tone:'warm'})]},
  {say:'静态资源带哈希长期强缓存；HTML 每次协商，没变就 304。登录凭证放 HttpOnly Cookie，不放 localStorage。',add:[A('cache','💾','强缓存 · 304',110,300,{kind:'tag',tone:'primary'})],tone:{page:'ok'}},
  {say:'记住要点。',memo:['跨域靠 CORS 响应头放行','检查 res.ok，凭证放 HttpOnly Cookie']},
 ]}),
 ({id:'fe-an-ts',level:'fe-ts',kind:'advanced',icon:'🔷',title:'TypeScript：在出错前就提醒你',summary:'类型标注、联合收窄和泛型。',beats:[
  {say:'JavaScript 里把 user.nmae 拼错了，要到运行时页面出 bug 才发现。',add:[A('js','🟨','JS：运行时才报错',150,80,{kind:'item',tone:'bad'})]},
  {say:'TypeScript 给数据写上类型，编辑器写代码时就画红线：User 上没有 nmae。',add:[A('ts','🔷','TS：写代码时就报错',490,80,{kind:'item',tone:'ok'})]},
  {say:'接口结果是“成功或失败”的联合类型，判断 ok 字段后，类型自动收窄到对应分支。',add:[A('union','🔀','ok ? data : error',320,210,{kind:'tag',tone:'primary'})]},
  {say:'泛型让一个函数适用多种类型又不丢类型信息：first<T>(arr: T[]) 返回的就是 T。',add:[A('gen','🧬','first<T>(arr: T[]): T',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住 TypeScript。',memo:['类型在编译期检查','联合 + 收窄，泛型保留类型']},
 ]}),
 ({id:'fe-an-browser',level:'fe-browser',kind:'advanced',icon:'🖥️',title:'一帧画面是怎么画出来的',summary:'渲染流水线和 16 毫秒预算。',beats:[
  {say:'浏览器把 HTML 变成 DOM、CSS 变成 CSSOM，合成渲染树。',add:[A('dom','🌲','DOM + CSSOM',110,90,{kind:'item',tone:'primary'})]},
  {say:'布局算位置大小，绘制生成像素指令，合成把各层拼到屏幕上。',add:[A('layout','📐','布局',330,90,{kind:'tag'}),A('paint','🎨','绘制',330,190,{kind:'tag'}),A('comp','🧩','合成',330,290,{kind:'tag',tone:'ok'})],send:[{from:'dom',to:'layout'},{from:'layout',to:'paint'},{from:'paint',to:'comp'}]},
  {say:'每帧只有大约 16 毫秒。一个 200 毫秒的长任务卡在主线程，动画就掉帧了。',add:[A('long','🐌','长任务 200ms',540,190,{kind:'tag',tone:'bad'})]},
  {say:'动画只改 transform 和 opacity，直接在合成阶段完成；重计算搬进 Web Worker。',tone:{long:'ok'},sub:{long:'移到 Worker'},bubble:{who:'comp',text:'60 帧流畅'}},
  {say:'记住渲染流水线。',memo:['DOM/CSSOM → 布局 → 绘制 → 合成','动画用 transform，长任务要拆']},
 ]}),
 ({id:'fe-an-react',level:'fe-react',kind:'advanced',icon:'⚛️',title:'状态变了，界面怎么更新',summary:'虚拟 DOM、key 和 Hooks。',beats:[
  {say:'用户勾选了一个待办，状态 todos 变了。组件重新运行，生成一棵新的虚拟 DOM 树。',add:[A('state','🗂️','状态 todos',110,90,{kind:'item',tone:'primary'}),A('vdom','📝','新虚拟树',330,90,{kind:'item'})],send:[{from:'state',to:'vdom'}]},
  {say:'和旧树 diff：靠每一项的 key（用 todo.id）认出“谁是谁”，发现只有一个勾选框变了。',add:[A('key','🔑','key = todo.id',330,210,{kind:'tag',tone:'ok'})]},
  {say:'只把这一处更新到真实 DOM，其他输入框的内容原封不动。',add:[A('dom','🖼️','真实 DOM',550,150,{kind:'item',tone:'ok'})],send:[{from:'vdom',to:'dom',text:'改一处'}]},
  {say:'Hooks 按调用顺序记住状态，所以只能在顶层调用；useEffect 里的订阅和定时器要返回清理函数。',add:[A('hooks','🪝','顶层调用 · 记得清理',330,320,{kind:'tag',tone:'warm'})]},
  {say:'记住更新过程。',memo:['状态 → 新虚拟树 → diff → 更新','key 用稳定 id，Hooks 只在顶层']},
 ]}),
 ({id:'fe-an-build',level:'fe-build',kind:'advanced',icon:'🏗️',title:'从源码到上线的打包流水线',summary:'模块、构建、Tree Shaking 和代码分割。',beats:[
  {say:'项目里有几百个 TS、JSX、CSS 文件，通过 import 互相依赖。',add:[A('src','📁','源码：几百个模块',110,170,{kind:'item',tone:'primary'})]},
  {say:'开发时 Vite 不打包，浏览器请求哪个文件就编译哪个，改代码立刻热更新。',add:[A('dev','⚡','开发：按需编译',330,70,{kind:'tag',tone:'ok'})],send:[{from:'src',to:'dev'}]},
  {say:'上线构建：转译、压缩，Tree Shaking 删掉没用的导出，文件名加内容哈希方便长期缓存。',add:[A('build','📦','构建：摇树 · 压缩 · 哈希',330,190,{kind:'tag',tone:'primary'})],send:[{from:'src',to:'build'}]},
  {say:'按路由用 import() 拆成多个 chunk：首页只下载首页需要的代码。',add:[A('chunks','✂️','home.js · admin.js',540,290,{kind:'tag',tone:'ok'})],send:[{from:'build',to:'chunks'}]},
  {say:'提交前 ESLint、Prettier、类型检查自动把关，CI 里再跑测试。',add:[A('lint','✅','lint · 测试 · CI',150,310,{kind:'tag'})]},
  {say:'记住工程化流水线。',memo:['开发按需编译，上线打包优化','摇树、分割、哈希缓存、自动检查']},
 ]}),
 ({id:'fe-an-perf',level:'fe-perf',kind:'advanced',icon:'🚀',title:'把首屏从 5 秒压到 2 秒',summary:'测量、定位、优化、验证。',beats:[
  {say:'首页 LCP 5 秒。先测量：JS 1.8MB、首屏大图 2MB、主线程执行 JS 1.5 秒。',add:[A('page','🐢','LCP 5.0s',320,70,{kind:'item',tone:'bad'})]},
  {say:'JS：按路由分割、删掉没用的大依赖，首屏 JS 降到 300KB。',add:[A('js','📦','JS 1.8MB → 300KB',150,190,{kind:'tag',tone:'ok'})]},
  {say:'图片：转 AVIF、按尺寸输出、首图预加载，其余懒加载并预留宽高，CLS 也降下来了。',add:[A('img','🖼️','图片 2MB → 150KB',490,190,{kind:'tag',tone:'ok'})]},
  {say:'再上 CDN、缓存和 SSR。复测 LCP 1.8 秒，在 CI 里设置体积和性能预算防止回退。',tone:{page:'ok'},sub:{page:'1.8s'},add:[A('budget','📏','性能预算',320,300,{kind:'tag',tone:'primary'})]},
  {say:'记住优化流程。',memo:['先测量定位，再对症优化','用指标验证，设预算防回退']},
 ]}),
 ({id:'fe-an-arch',level:'fe-arch',kind:'advanced',icon:'🛡️',title:'给前端应用加上护城河',summary:'XSS、CSRF、权限和监控。',beats:[
  {say:'攻击者在评论里塞了一段脚本。前端用 textContent 渲染、需要 HTML 时先净化，再配上 CSP，脚本执行不了。',add:[A('xss','🦹','XSS 脚本',110,80,{kind:'item',tone:'bad'}),A('app','🏰','你的前端应用',320,190,{kind:'item',tone:'primary'})],send:[{from:'xss',to:'app',text:'被拦下',tone:'bad'}]},
  {say:'恶意网站想借用户的 Cookie 偷偷转账。SameSite Cookie 和 CSRF Token 把它挡在门外。',add:[A('csrf','🎣','CSRF 请求',530,80,{kind:'item',tone:'bad'})],send:[{from:'csrf',to:'app',text:'被拦下',tone:'bad'}]},
  {say:'菜单和按钮按权限显示只是体验，真正的权限由后端每个接口校验。',add:[A('auth','🔐','后端校验权限',110,310,{kind:'tag',tone:'ok'})]},
  {say:'监控 SDK 采集错误和性能，source map 还原报错位置，出问题第一时间告警。',add:[A('mon','🛰️','监控 + 告警',530,310,{kind:'tag',tone:'ok'})],send:[{from:'app',to:'mon'}],tone:{app:'ok'}},
  {say:'记住安全与架构。',memo:['防 XSS、防 CSRF，权限靠后端','监控让问题可发现、可定位']},
 ]}),
];
