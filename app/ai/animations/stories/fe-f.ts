import {A,type Story} from '../story';

// 前端面试题动画（六）：CSRF、加载优化、请求取消、实时通信、Web Worker、Service Worker。
export const feF:Record<string,Story>={
 'fe-q-csrf':{title:'CSRF：借用你的登录状态',beats:[
  {say:'小明登录了银行网站，浏览器里存着银行的 Cookie。',add:[A('u','🧑','小明的浏览器',110,170,{tone:'primary'}),A('bank','🏦','bank.com',530,90,{kind:'item'})]},
  {say:'他又打开了一个恶意网站，页面里藏着一个自动提交的表单，目标是 bank.com/transfer。',add:[A('evil','🦹','恶意网站',320,300,{kind:'item',tone:'bad'})],send:[{from:'evil',to:'u',text:'自动提交表单'}]},
  {say:'浏览器发请求时自动带上了银行的 Cookie，银行以为是小明本人在转账。',send:[{from:'u',to:'bank',text:'带着 Cookie',tone:'bad'}],tone:{bank:'bad'}},
  {say:'防御：Cookie 设置 SameSite=Lax，跨站请求不带 Cookie；关键操作加 CSRF Token 并校验 Origin；改数据的操作不用 GET。',add:[A('def','🛡️','SameSite · Token',530,230,{kind:'tag',tone:'ok'})],tone:{bank:'ok'}},
  {say:'记住 CSRF。',memo:['利用浏览器自动携带 Cookie','SameSite + CSRF Token + 校验来源']},
 ]},
 'fe-q-url-frontend':{title:'首屏更快：一路上的优化点',beats:[
  {say:'用户输入网址。DNS 预解析和 preconnect 提前建立连接，CDN 让资源从最近的节点返回。',add:[A('u','🌐','浏览器',110,170,{tone:'primary'}),A('cdn','🛰️','CDN 就近返回',320,70,{kind:'item',tone:'ok'})],send:[{from:'u',to:'cdn',text:'preconnect'}]},
  {say:'HTML 到了：关键 CSS 内联，JS 加 defer，不阻塞首屏渲染。',add:[A('html','📄','关键 CSS · defer',320,200,{kind:'item'})],send:[{from:'cdn',to:'html'}]},
  {say:'只加载当前路由需要的代码，其他页面的代码按需加载。首屏大图 preload，下面的图片懒加载。',add:[A('split','✂️','代码分割 · 图片懒加载',530,300,{kind:'tag',tone:'ok'})]},
  {say:'字体用 font-display: swap 先显示系统字体；服务端渲染让首屏 HTML 直接有内容。最后用 Lighthouse 和真实用户数据验证。',bubble:{who:'u',text:'一下就打开了'},tone:{u:'ok'}},
  {say:'记住优化思路。',memo:['网络：预连接、CDN、压缩、缓存','渲染：关键 CSS、defer、分割、懒加载']},
 ]},
 'fe-q-fetch-cancel':{title:'请求竞态：旧结果覆盖了新结果',beats:[
  {say:'搜索框输入“re”发出请求 1，接着输入“react”发出请求 2。',add:[A('box','🔎','搜索框',110,170,{tone:'primary'}),A('r1','📨','请求 1：re',400,80,{kind:'tag'}),A('r2','📨','请求 2：react',400,260,{kind:'tag'})]},
  {say:'请求 2 先返回，显示了 react 的结果；请求 1 慢，后返回，把列表覆盖成了“re”的结果。',send:[{from:'r1',to:'box',text:'后到',tone:'bad'}],tone:{box:'bad'},bubble:{who:'box',text:'结果不对了'}},
  {say:'解决：发新请求前，用 AbortController 取消上一个请求。',add:[A('ab','✋','abort()',560,170,{kind:'tag',tone:'ok'})],tone:{r1:'quiet'},sub:{r1:'已取消'}},
  {say:'在 React 里写在 useEffect 的清理函数中：依赖变化或组件卸载时 abort，捕获 AbortError 时不当作错误处理。',tone:{box:'ok'}},
  {say:'记住竞态处理。',memo:['新请求前取消旧请求','useEffect 清理函数里 abort']},
 ]},
 'fe-q-websocket-fe':{title:'实时更新的四种方式',beats:[
  {say:'短轮询：每隔几秒问一次服务器“有新消息吗”。简单，但大部分请求都是白跑。',add:[A('c','💻','浏览器',110,170,{tone:'primary'}),A('s','🖥️','服务器',530,170,{kind:'item'}),A('poll','🔁','短轮询：白跑多',320,60,{kind:'tag',tone:'warm'})],send:[{from:'c',to:'s',text:'有新的吗？'}]},
  {say:'长轮询：请求挂着，有新数据才返回，返回后立刻再发一个。',drop:['poll'],add:[A('lp','⏳','长轮询',320,60,{kind:'tag'})]},
  {say:'SSE：一条连接，服务器单向持续推送，浏览器自动重连。适合通知、行情、AI 流式输出。',drop:['lp'],add:[A('sse','📡','SSE：单向推送',320,60,{kind:'tag',tone:'ok'})],send:[{from:'s',to:'c',text:'推送'}]},
  {say:'WebSocket：全双工，双方随时发消息，适合聊天和协同编辑。长连接都要做心跳、断线重连和消息补齐。',add:[A('ws','🔌','WebSocket：双向',320,290,{kind:'tag',tone:'ok'})],send:[{from:'c',to:'s',text:'发消息'},{from:'s',to:'c',text:'收消息'}]},
  {say:'记住怎么选。',memo:['单向推送用 SSE','双向实时用 WebSocket']},
 ]},
 'fe-q-web-worker':{title:'Web Worker：把重活搬到后台',beats:[
  {say:'用户上传一个 2GB 文件，页面要计算它的哈希。在主线程算，页面卡死，按钮点不动。',add:[A('main','🧵','主线程',110,170,{tone:'bad'}),A('file','📁','2GB 文件',320,60,{kind:'item'})],bubble:{who:'main',text:'我卡住了…'}},
  {say:'创建一个 Web Worker，用 postMessage 把文件交给它，在后台线程计算。',add:[A('w','👷','Web Worker',530,170,{tone:'primary'})],send:[{from:'main',to:'w',text:'postMessage'}],tone:{main:'ok'}},
  {say:'主线程继续响应点击和渲染，进度条流畅地往前走。',add:[A('ui','📊','进度条流畅',110,310,{kind:'tag',tone:'ok'})]},
  {say:'算完后 Worker 把结果发回来。Worker 不能操作 DOM；大数据可以用 Transferable 直接转移所有权，避免复制。',send:[{from:'w',to:'main',text:'哈希结果',tone:'ok'}]},
  {say:'记住 Worker。',memo:['重计算放后台线程','postMessage 通信，不能碰 DOM']},
 ]},
 'fe-q-service-worker':{title:'Service Worker：页面和网络之间的代理',beats:[
  {say:'Service Worker 注册后，站在页面和网络之间，能拦截页面发出的每一个请求。',add:[A('page','📄','页面',110,170,{kind:'item',tone:'primary'}),A('sw','🧑‍✈️','Service Worker',320,170,{tone:'primary'}),A('net','🌐','网络',530,170,{kind:'item'})],send:[{from:'page',to:'sw',text:'请求'}]},
  {say:'静态资源缓存优先，断网时也能打开页面；接口可以网络优先，失败再用缓存。',add:[A('cache','💾','Cache Storage',320,300,{kind:'item',tone:'ok'})],send:[{from:'sw',to:'cache'}]},
  {say:'发布新版本后，新的 Service Worker 会进入等待状态，要等旧页面全部关闭才接管，用户可能一直看到旧版本。',add:[A('wait','⏸️','新版本等待中',320,60,{kind:'tag',tone:'warm'})]},
  {say:'所以要提示“有新版本，点击刷新”，配合 skipWaiting；缓存带版本号，HTML 不要缓存优先。',tone:{wait:'ok'},sub:{sw:'已更新'}},
  {say:'记住 Service Worker。',memo:['拦截请求，离线缓存','注意更新：提示刷新、清旧缓存']},
 ]},
};
