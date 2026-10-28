import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 4 集：和后端打交道，再请一位类型检查员（fetch、跨域与 CORS、HTTP 缓存、Cookie 与本地存储、SSE 与 WebSocket；TypeScript 类型、联合与收窄、unknown/never、泛型与工具类型）。
export const feLazy4:LazyEpisode={id:'lazy-fe-4',subject:'frontend',tier:1,levels:['fe-net','fe-ts'],icon:'📡',title:'和后端打交道，再请一位类型检查员',summary:'小芽开始调后端接口：fetch 的坑、跨域被拦、缓存怎么设、登录凭证放哪；然后引入 TypeScript，让错误在写代码时就被抓住。',beats:[
 {say:'书店官网要接上阿杰的后端了：书目、订单、会员都要从接口里取。小芽写下第一个 fetch，满心欢喜地刷新页面，控制台却一片通红：被 CORS 策略拦截了。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('api','🖥️','后端接口',460,90,{kind:'item'})]},
 {say:'老冯解释：官网在 shop.com，接口在 api.shop.com，域名不一样，就是跨域。协议、域名、端口有一个不同，都算。浏览器的同源策略会拦下不被允许的跨域响应。请求其实已经到了服务器，服务器也返回了，是浏览器不让你的代码读到结果。',add:[A('sop','🛡️','同源策略：拦下响应',460,210,{kind:'tag',tone:'bad'})]},
 {say:'解决办法在后端：服务器返回一个响应头 Access-Control-Allow-Origin，写上允许的来源。如果请求带着 JSON 正文或者自定义的头，浏览器还会先发一个 OPTIONS 预检请求，问问服务器“我能这么发吗”。要带上 Cookie，前端要设置 credentials 为 include，而且服务器不能用星号表示“允许所有来源”。',sub:{sop:'CORS 响应头放行'},tone:{sop:'ok'}},
 {say:'第二个坑：订单接口返回了 500，可小芽的 catch 根本没触发。原来 fetch 只有在网络断了、请求被取消时才会失败；HTTP 返回 404、500，它仍然认为请求完成了。所以每次都要检查 response.ok，不对就自己抛出错误。',drop:['sop'],add:[A('ok','⚠️','404 / 500 不会 reject',460,210,{kind:'tag',tone:'warm'})]},
 {say:'老冯建议把请求封装成一个统一的函数：统一加上登录凭证，统一检查状态码，统一处理超时和取消，遇到 401 统一去刷新登录或跳转登录页，可以安全重试的请求做有限次重试。业务代码只关心拿到的数据。',sub:{ok:'封装：状态码 · 超时 · 401 统一处理'},tone:{ok:'ok'}},
 {say:'接着是缓存。书店的图片和脚本，每次打开页面都重新下载，太慢了。老冯说，浏览器缓存分两种。强缓存：服务器告诉浏览器“这个文件一年内都别来问我了”，Cache-Control: max-age，期间浏览器直接用本地的副本，连请求都不发。',drop:['ok'],add:[A('strong','💾','强缓存：max-age 内不请求',460,210,{kind:'item',tone:'primary'})]},
 {say:'协商缓存：浏览器带着上次拿到的指纹 ETag 去问“这个文件变了吗”，没变，服务器只回一个 304，浏览器继续用本地的副本。最佳实践是：文件名里带内容哈希的脚本、图片，设置长期强缓存；入口的 HTML 每次都协商，这样发布新版本时，用户总能拿到新的文件名。',add:[A('nego','🤝','协商缓存：ETag → 304',460,320,{kind:'tag',tone:'ok'})]},
 {say:'然后是登录。小芽把登录凭证存进了 localStorage，被老冯一眼拦下。localStorage 能存五 MB 左右，长期保存，但任何一段 JavaScript 都能读到它，一旦页面有了 XSS 漏洞，凭证就会被偷走。',drop:['strong','nego'],add:[A('ls','💾','localStorage：脚本可读',460,210,{kind:'item',tone:'bad'})]},
 {say:'更安全的做法是让服务器把凭证放进 Cookie，并加上三个标记：HttpOnly，JavaScript 读不到；Secure，只在 HTTPS 下发送；SameSite，跨站请求不带上它。Cookie 很小，每次请求都会自动带上，正适合放会话标识。sessionStorage 只在当前标签页有效；大量离线数据用 IndexedDB。',sub:{ls:'凭证放 HttpOnly Cookie'},tone:{ls:'ok'}},
 {say:'后台要实时显示新订单。每隔几秒问一次服务器，叫轮询，大部分请求都是白跑。只需要服务器单向推送，用 SSE，简单而且会自动重连；需要双向实时通信，比如客服聊天，用 WebSocket。长连接都要做心跳、断线重连，重连后还要补上错过的消息。',drop:['ls','api'],add:[A('push','📣','SSE 单向 · WebSocket 双向',460,150,{kind:'item',tone:'primary'})]},
 {say:'接口接完了，项目也越来越大，bug 却越来越多：拼错的属性名、传错类型的参数，都要等到用户点到那里才发现。老冯说：是时候请一位类型检查员了，TypeScript。它在你写代码的时候就检查类型，有错立刻画红线，编译之后变回普通的 JavaScript。',drop:['push'],add:[A('ts','🔷','TypeScript 检查员',460,150,{kind:'item',tone:'primary'})]},
 {say:'给数据写上类型很简单：function price(book: Book): number。描述对象结构用 interface，同名的会自动合并，适合扩展第三方的类型；type 是类型别名，能表示任何类型，比如“状态只能是 idle、loading、done 之一”这种联合类型。',add:[A('iface','📘','interface · type',300,280,{kind:'tag'})]},
 {say:'联合类型用之前要先“收窄”。接口返回 { ok: true, data } 或者 { ok: false, error }，先判断 ok，TypeScript 就知道在这个分支里一定有 data，在另一个分支里一定有 error。用 typeof、instanceof、in，或者自己写的类型守卫，都能收窄。',drop:['iface'],add:[A('narrow','🔀','联合类型 + 收窄',300,280,{kind:'tag',tone:'ok'})]},
 {say:'有三个特别的类型。any 等于告诉检查员“别管我”，错误会悄悄传染到别处，尽量不用。unknown 是安全版的 any：什么都能放进来，但用之前必须先确认类型，处理接口返回的数据、JSON.parse 的结果时最合适。never 表示不可能出现的值，能做穷尽检查：联合类型新增了一种状态却忘了处理，编译直接报错。',drop:['narrow'],add:[A('three','🎭','any 放弃 · unknown 先查 · never 穷尽',360,280,{kind:'tag',tone:'warm'})]},
 {say:'最后是泛型，让类型也能当参数。写一个取对象属性的函数 getProp，参数是任意对象 T 和它的某个属性名 K，K extends keyof T 规定只能传已有的属性名，返回的类型就是 T[K]。传错属性名，编译就报错。',drop:['three'],add:[A('gen','🧬','泛型：类型也是参数',360,280,{kind:'tag',tone:'primary'})]},
 {say:'TypeScript 自带的工具类型都是泛型：Partial 把所有属性变成可选，Required 全部必填，Pick 挑出几个，Omit 排除几个，Record 构造一个对象类型，ReturnType 取出函数的返回值类型。老冯还提醒：as 类型断言只骗得过检查员，运行时并不会真的校验数据，外部数据要用校验库检查。',sub:{gen:'Partial · Pick · Omit · Record'}},
 {say:'一个月后，项目的线上报错少了一大半。小芽在笔记里写下：跨域靠后端放行，fetch 要检查 ok；带哈希的文件长期缓存，HTML 每次协商；凭证放 HttpOnly Cookie；推送用 SSE，聊天用 WebSocket；类型用 unknown 代替 any，联合类型先收窄，泛型让类型跟着走。',drop:['gen','ts'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['跨域靠 CORS 响应头；fetch 要查 res.ok；强缓存 + 协商缓存；凭证放 HttpOnly Cookie','TS：联合类型先收窄，unknown 代替 any，never 穷尽检查，泛型与工具类型']},
]};
