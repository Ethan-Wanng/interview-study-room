import {A,type Story} from '../story';

// 前端面试题动画（五）：渲染流程、事件委托、跨域、存储、HTTP 缓存、XSS。
export const feE:Record<string,Story>={
 'fe-q-render':{title:'从 HTML 到屏幕上的像素',beats:[
  {say:'浏览器拿到 HTML，一边下载一边解析，生成 DOM 树；CSS 解析成 CSSOM。',add:[A('dom','🌲','DOM',110,80,{kind:'item',tone:'primary'}),A('cssom','🎨','CSSOM',110,240,{kind:'item',tone:'primary'})]},
  {say:'两者合成渲染树，只包含要显示的节点。接着布局：算出每个元素的位置和大小。',add:[A('rt','🧩','渲染树 → 布局',330,160,{kind:'item'})],send:[{from:'dom',to:'rt'},{from:'cssom',to:'rt'}]},
  {say:'然后绘制，生成每一层的绘制指令；最后合成线程把各层拼起来，显示到屏幕上。',add:[A('scr','🖥️','绘制 → 合成',540,160,{kind:'item',tone:'ok'})],send:[{from:'rt',to:'scr'}]},
  {say:'同步 JS 会暂停 HTML 解析，CSS 会阻塞渲染。所以 CSS 放 head，JS 用 defer。只改 transform 和 opacity 的动画，可以跳过布局和绘制。',add:[A('tip','⚡','transform 只走合成',330,300,{kind:'tag',tone:'ok'})]},
  {say:'记住渲染流程。',memo:['DOM + CSSOM → 渲染树','布局 → 绘制 → 合成']},
 ]},
 'fe-q-event-delegation':{title:'事件委托：一个监听器管一千个按钮',beats:[
  {say:'列表里有一千个删除按钮，每个都绑一个点击监听，太多了，新加的条目还得再绑。',add:[A('list','📋','ul 列表',320,70,{kind:'item',tone:'primary'}),A('li','🔘','×1000 个按钮',320,190,{kind:'tag',tone:'warm'})]},
  {say:'点击事件会冒泡：从被点的按钮一路向上传到 ul、body、document。',send:[{from:'li',to:'list',text:'冒泡'}]},
  {say:'所以只在 ul 上绑一个监听器，用 event.target.closest("li") 判断点的是哪一条。新增的条目也自动生效。',tone:{li:'ok',list:'ok'},bubble:{who:'list',text:'我一个人全管了'}},
  {say:'事件传播先捕获（从上往下）、再冒泡（从下往上）。stopPropagation 停止传播，preventDefault 取消默认行为；focus 不冒泡，要用 focusin。',add:[A('phase','🔃','捕获 → 目标 → 冒泡',320,300,{kind:'tag'})]},
  {say:'记住事件委托。',memo:['监听挂在父元素，靠冒泡','用 target 判断具体元素']},
 ]},
 'fe-q-cors':{title:'跨域：请求发出去了，响应被浏览器拦下',beats:[
  {say:'页面在 app.example.com，要请求 api.example.com 的数据。域名不同，就是跨域。',add:[A('page','🌐','app.example.com',110,170,{kind:'item',tone:'primary'}),A('api','🖥️','api.example.com',530,170,{kind:'item'})],send:[{from:'page',to:'api',text:'请求'}]},
  {say:'请求其实到了服务器，服务器也返回了。但浏览器检查响应头，发现没有允许这个来源，就不让 JS 读到结果。',add:[A('br','🛡️','浏览器同源策略',320,60,{kind:'tag',tone:'bad'})],send:[{from:'api',to:'br',text:'响应'}]},
  {say:'解决：服务端返回 Access-Control-Allow-Origin: https://app.example.com。带 JSON 正文或自定义头的请求，会先发一个 OPTIONS 预检。',add:[A('hdr','📜','Allow-Origin 响应头',530,300,{kind:'tag',tone:'ok'})],tone:{br:'ok'}},
  {say:'要带 Cookie：前端 credentials: "include"，服务端 Allow-Credentials: true，且 Allow-Origin 不能写 *。开发时也常用代理绕开。',bubble:{who:'page',text:'拿到数据了'},tone:{page:'ok'}},
  {say:'记住跨域。',memo:['同源 = 协议、域名、端口都相同','CORS 响应头放行，复杂请求先预检']},
 ]},
 'fe-q-storage':{title:'四种浏览器存储',beats:[
  {say:'Cookie：只有约 4KB，每次请求都会自动带上，适合放会话标识。可以设置 HttpOnly，让 JS 读不到。',add:[A('ck','🍪','Cookie 4KB 自动携带',150,80,{kind:'item',tone:'primary'})]},
  {say:'localStorage：约 5MB，长期保存，同源共享，只能存字符串，读写是同步的。',add:[A('ls','💾','localStorage 长期',490,80,{kind:'item'})]},
  {say:'sessionStorage：只在当前标签页有效，关掉就没了。IndexedDB：异步、容量大，能存对象和文件，适合离线应用。',add:[A('ss','🗂️','sessionStorage',150,220,{kind:'item'}),A('idb','🗄️','IndexedDB',490,220,{kind:'item'})]},
  {say:'安全提醒：登录 token 放 localStorage，一旦有 XSS 就能被读走。更推荐 HttpOnly + Secure + SameSite 的 Cookie。',add:[A('sec','🔐','凭证：HttpOnly Cookie',320,320,{kind:'tag',tone:'ok'})],tone:{ck:'ok'}},
  {say:'记住区别。',memo:['Cookie 小、自动携带','local 长期，session 单标签，IndexedDB 大而异步']},
 ]},
 'fe-q-http-cache':{title:'强缓存和协商缓存',beats:[
  {say:'第一次访问，服务器返回 app.3f9a.js，并告诉浏览器：Cache-Control: max-age=31536000。',add:[A('b','🌐','浏览器',110,170,{tone:'primary'}),A('s','🖥️','服务器',530,170,{kind:'item'})],send:[{from:'s',to:'b',text:'max-age 一年'}]},
  {say:'强缓存：一年之内再用到这个文件，浏览器直接从本地拿，连请求都不发。',add:[A('disk','💾','强缓存命中',110,310,{kind:'tag',tone:'ok'})]},
  {say:'HTML 设置 no-cache：每次都带上 If-None-Match（ETag）问服务器“变了吗？”',send:[{from:'b',to:'s',text:'If-None-Match'}]},
  {say:'没变就返回 304，浏览器继续用本地副本，省下了传输内容的流量。这是协商缓存。',send:[{from:'s',to:'b',text:'304',tone:'ok'}],add:[A('neg','🤝','协商缓存：304',530,310,{kind:'tag',tone:'ok'})]},
  {say:'记住策略。',memo:['带哈希的静态资源：长期强缓存','HTML 入口：no-cache 协商']},
 ]},
 'fe-q-xss':{title:'XSS：评论区里藏着的脚本',beats:[
  {say:'攻击者在评论区提交了一条“评论”，里面藏着一段脚本，被存进了数据库。',add:[A('bad','🦹','攻击者',110,170,{tone:'bad'}),A('db','🗄️','评论数据',320,80,{kind:'item'})],send:[{from:'bad',to:'db',text:'<script>…'}]},
  {say:'其他用户打开页面，前端用 innerHTML 把评论直接渲染出来，脚本在他们的浏览器里执行了，偷走了登录凭证。',add:[A('u','🙂','普通用户',530,170)],send:[{from:'db',to:'u',text:'执行脚本',tone:'bad'}],tone:{u:'bad'}},
  {say:'防御一：按上下文转义输出，不用 innerHTML、v-html 渲染不可信内容，必须渲染 HTML 就用 DOMPurify 净化。',add:[A('esc','🧼','转义 · DOMPurify',320,250,{kind:'tag',tone:'ok'})],tone:{u:'ok'}},
  {say:'防御二：CSP 限制只能执行自己域名的脚本；登录 Cookie 设置 HttpOnly，脚本读不到。',add:[A('csp','🛡️','CSP · HttpOnly',320,320,{kind:'tag',tone:'ok'})]},
  {say:'记住 XSS。',memo:['不可信内容不能当 HTML 执行','转义、净化、CSP、HttpOnly']},
 ]},
};
