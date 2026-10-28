import type {FeInterviewQuestion} from './types';
const p=(text:string)=>({type:'text' as const,text}),c=(text:string)=>({type:'code' as const,text});

// 前端面试题（三）：浏览器、网络与安全。
export const feBrowser:FeInterviewQuestion[]=[
 {id:'fe-q-render',section:'浏览器与网络',title:'浏览器是怎么把 HTML 渲染成页面的？',blocks:[
  p('解析 HTML 生成 DOM 树，解析 CSS 生成 CSSOM；两者结合得到渲染树（不包含 display: none 的节点）；布局（Layout）计算每个元素的位置和尺寸；绘制（Paint）生成绘制指令；分层后由合成线程（Composite）把各层合成并显示到屏幕上。'),
  p('CSS 会阻塞渲染，同步 JS 会阻塞 HTML 解析（JS 可能修改 DOM，而且要等前面的 CSS 加载完才能执行）。所以 CSS 放 head、JS 用 defer 或放底部。只改 transform、opacity 的动画可以跳过布局和绘制，只在合成阶段完成，最流畅。')]},
 {id:'fe-q-event-delegation',section:'浏览器与网络',title:'说说事件冒泡、捕获和事件委托。',blocks:[
  p('事件传播分三个阶段：捕获（从 window 往下到目标）、目标、冒泡（从目标往上到 window）。addEventListener 第三个参数 { capture: true } 在捕获阶段监听，默认在冒泡阶段。stopPropagation 阻止继续传播，preventDefault 阻止默认行为（如链接跳转）。'),
  p('事件委托：把监听器挂在父元素上，通过 event.target 判断具体点了哪个子元素。好处是监听器少、动态新增的子元素也能响应。注意 focus、blur 等事件不冒泡（可用 focusin、focusout）。'),
  c("list.addEventListener('click', (e) => {\n  const item = e.target.closest('li[data-id]');\n  if (item) remove(item.dataset.id);\n});")]},
 {id:'fe-q-cors',section:'浏览器与网络',title:'什么是同源策略？跨域有哪些解决方案？',blocks:[
  p('同源指协议、域名、端口都相同。浏览器的同源策略限制脚本读取不同源的响应、访问不同源页面的 DOM 和存储，用来防止恶意网站窃取用户数据。注意：请求通常能发出去，是浏览器拦住了响应。'),
  p('方案：CORS 是标准做法，由服务端返回 Access-Control-Allow-Origin 等响应头；复杂请求（PUT、自定义头、JSON 正文）会先发 OPTIONS 预检；要带 Cookie 需前端 credentials: "include"，服务端 Allow-Credentials: true 且 Allow-Origin 不能是 *。开发环境常用 dev server 代理；生产可以让网关同域转发。JSONP 只支持 GET，已基本淘汰。'),
  c('Access-Control-Allow-Origin: https://app.example.com\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Methods: GET, POST, PUT\nAccess-Control-Allow-Headers: Content-Type, Authorization')]},
 {id:'fe-q-storage',section:'浏览器与网络',title:'Cookie、localStorage、sessionStorage、IndexedDB 有什么区别？',blocks:[
  p('Cookie：约 4KB，每次同域请求自动携带，可以设置过期时间、HttpOnly（JS 读不到）、Secure、SameSite，适合存会话标识。localStorage：约 5MB，长期保存，同源共享，只能存字符串，同步 API 会阻塞主线程。sessionStorage：只在当前标签页会话内有效，关闭即清除。IndexedDB：异步、容量大、能存结构化数据和文件，适合离线应用。'),
  p('安全建议：登录凭证放 HttpOnly + Secure + SameSite 的 Cookie，不要放 localStorage（XSS 能直接读走）。')]},
 {id:'fe-q-http-cache',section:'浏览器与网络',title:'说说浏览器的强缓存和协商缓存。',blocks:[
  p('强缓存：响应头 Cache-Control: max-age=31536000（或旧的 Expires）在有效期内，浏览器直接用本地缓存，不发请求。no-cache 表示每次都要先和服务器确认；no-store 才是完全不缓存。'),
  p('协商缓存：缓存过期后带上 If-None-Match（对应 ETag）或 If-Modified-Since（对应 Last-Modified）去问服务器，没变化就返回 304，浏览器继续用本地副本。常用策略：带内容哈希的静态资源（app.3f9a.js）设置长期强缓存 + immutable；HTML 入口用 no-cache，每次协商，保证能拿到最新的资源引用。')]},
 {id:'fe-q-xss',section:'浏览器与网络',title:'什么是 XSS 攻击？如何防范？',blocks:[
  p('XSS（跨站脚本）是攻击者把恶意脚本注入页面，在其他用户的浏览器里执行，窃取 Cookie、冒充用户操作。分为存储型（脚本存进数据库，比如评论）、反射型（脚本在 URL 参数里）、DOM 型（前端把不可信数据直接写进 DOM）。'),
  p('防范：输出时按上下文转义；不要用 innerHTML、v-html、dangerouslySetInnerHTML 渲染不可信内容，必要时用 DOMPurify 净化；React、Vue 默认会转义插值；配置 CSP（Content-Security-Policy）限制可执行脚本来源；关键 Cookie 设置 HttpOnly；URL 要校验协议，禁止 javascript:。')]},
 {id:'fe-q-csrf',section:'浏览器与网络',title:'什么是 CSRF 攻击？如何防范？',blocks:[
  p('CSRF（跨站请求伪造）：用户登录了 bank.com，又打开了恶意网站，恶意网站构造一个指向 bank.com 的请求（比如自动提交的表单），浏览器会自动带上 bank.com 的 Cookie，服务器以为是用户本人操作。'),
  p('防范：Cookie 设置 SameSite=Lax 或 Strict，跨站请求不带 Cookie；关键操作使用 CSRF Token（放在表单或请求头，攻击者拿不到）；校验 Origin / Referer 头；改变数据的操作不用 GET。用 Authorization 头携带 token 的接口天然不受 CSRF 影响，但要防 XSS 偷 token。')]},
 {id:'fe-q-url-frontend',section:'浏览器与网络',title:'从输入 URL 到页面显示，前端视角有哪些可以优化的点？',blocks:[
  p('网络阶段：DNS 预解析（dns-prefetch）、preconnect 提前建连；用 CDN 就近访问；HTTP/2 或 HTTP/3 多路复用；开启 Brotli/Gzip 压缩；合理的缓存策略。'),
  p('渲染阶段：关键 CSS 内联、非关键 CSS 异步加载；JS 用 defer、按路由代码分割；首屏图片用合适尺寸和格式（WebP/AVIF），非首屏懒加载；字体用 font-display: swap；服务端渲染或静态生成让首屏 HTML 直接有内容；用 preload 提前加载关键资源。最后用 Lighthouse 和真实用户监控验证。')]},
 {id:'fe-q-fetch-cancel',section:'浏览器与网络',title:'如何取消一个 fetch 请求？如何处理请求竞态？',blocks:[
  p('fetch 用 AbortController 取消：创建 controller，把 controller.signal 传给 fetch，需要时调用 controller.abort()，fetch 会以 AbortError 拒绝。AbortSignal.timeout(3000) 可以直接做超时。'),
  p('竞态：搜索框快速输入时，先发出的请求可能后返回，覆盖了新结果。解决：发新请求前取消上一个；或者给每个请求编号，只采用最新请求的结果。React 里在 useEffect 的清理函数中 abort，避免组件卸载后还在 setState。'),
  c("useEffect(() => {\n  const ctrl = new AbortController();\n  fetch(`/api/search?q=${q}`, { signal: ctrl.signal })\n    .then(r => r.json()).then(setList)\n    .catch(e => { if (e.name !== 'AbortError') setError(e); });\n  return () => ctrl.abort();\n}, [q]);")]},
 {id:'fe-q-websocket-fe',section:'浏览器与网络',title:'前端如何实现实时更新？轮询、长轮询、SSE、WebSocket 怎么选？',blocks:[
  p('短轮询：定时请求，简单但浪费且有延迟。长轮询：请求挂起直到有新数据再返回，实时性好一些。SSE（EventSource）：服务器通过一条 HTTP 连接单向持续推送，浏览器自动重连，适合通知、行情、AI 流式输出。WebSocket：全双工长连接，适合聊天、协同编辑、游戏。'),
  p('使用长连接要考虑：心跳检测、断线重连（指数退避）、重连后补齐丢失的消息、页面隐藏时降频、多个标签页共享连接（BroadcastChannel / SharedWorker），以及网关和负载均衡对长连接的支持。')]},
 {id:'fe-q-web-worker',section:'浏览器与网络',title:'Web Worker 是什么？什么时候用？',blocks:[
  p('Web Worker 让 JavaScript 在后台线程运行，不阻塞主线程的渲染和交互。它不能直接操作 DOM，和主线程通过 postMessage 传递消息（数据会被结构化克隆，大数据可以用 Transferable 转移所有权，零拷贝）。'),
  p('适合：大文件哈希计算、图片和视频处理、大量数据的解析和排序、加密计算。Service Worker 是另一种 Worker，作为网络代理实现离线缓存和推送；SharedWorker 可以被同源的多个页面共享。'),
  c("// main.js\nconst worker = new Worker(new URL('./hash.worker.js', import.meta.url));\nworker.postMessage(file);\nworker.onmessage = (e) => console.log('hash', e.data);")]},
 {id:'fe-q-service-worker',section:'浏览器与网络',title:'Service Worker 能做什么？更新时要注意什么？',blocks:[
  p('Service Worker 运行在页面之外，可以拦截页面的网络请求，实现离线访问、缓存策略（缓存优先、网络优先、stale-while-revalidate）、后台同步和推送通知，是 PWA 的核心。只能在 HTTPS（或 localhost）下注册。'),
  p('坑：新版本 SW 安装后会进入 waiting，等旧页面都关闭才激活，用户可能一直用旧缓存；需要设计“有新版本，点击刷新”的提示，配合 skipWaiting 和 clients.claim。缓存要带版本号并清理旧缓存，HTML 不宜缓存优先，否则发布后用户拿不到更新。')]},
];
