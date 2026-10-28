import type {AiLevel} from '../journey';

// 前端进阶：网络请求、跨域与存储；TypeScript。
export const feNet:AiLevel={id:'fe-net',title:'网络请求、跨域与存储',summary:'fetch、HTTP 缓存、CORS、Cookie 和本地存储、实时通信',lessons:[
 {title:'用 fetch 发请求',body:'fetch 返回 Promise。注意：HTTP 404、500 不会让 fetch 失败，要自己检查 response.ok；只有网络断开、被取消才会 reject。发 JSON 时设置 Content-Type 并 JSON.stringify 正文。',code:"const res = await fetch('/api/orders', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ sku: 42, qty: 1 }),\n});\nif (!res.ok) throw new Error('请求失败：' + res.status);\nconst data = await res.json();"},
 {title:'HTTP 缓存',body:'强缓存：Cache-Control: max-age 在有效期内不发请求，直接用本地副本。协商缓存：带 If-None-Match（ETag）问服务器，没变返回 304。带内容哈希的静态资源设置长期缓存；HTML 用 no-cache 每次协商，保证能拿到新版本。'},
 {title:'跨域和 CORS',body:'协议、域名、端口有一个不同就是跨域。浏览器会拦下没有被允许的跨域响应。服务端返回 Access-Control-Allow-Origin 等响应头放行；复杂请求先发 OPTIONS 预检；带 Cookie 需要 credentials: "include" 且 Allow-Origin 不能是 *。'},
 {title:'存储和实时通信',body:'Cookie 小、自动随请求携带，登录凭证放 HttpOnly Cookie；localStorage 长期保存、同步读写；sessionStorage 只在当前标签页；IndexedDB 容量大、异步。实时更新：单向推送用 SSE，双向用 WebSocket，都要处理断线重连。'},
],quiz:[
 {id:'fe-net-1',type:'judge',q:'fetch 请求返回 404 时，Promise 会进入 catch。',answer:false,explain:'HTTP 错误状态码仍算“请求成功完成”，要检查 response.ok。'},
 {id:'fe-net-2',q:'页面 https://a.com 请求 https://a.com:8080/api，算跨域吗？',options:['不算，域名一样','算，端口不同','只有协议不同才算','只有 POST 算'],answer:1,explain:'协议、域名、端口都相同才同源。',interview:'fe-q-cors'},
 {id:'fe-net-3',q:'跨域请求要携带 Cookie，下面哪项配置是错误的？',options:['前端 credentials: "include"','服务端 Access-Control-Allow-Credentials: true','服务端 Access-Control-Allow-Origin: *','服务端返回具体的来源域名'],answer:2,explain:'携带凭证时 Allow-Origin 不能是通配符。',interview:'fe-q-cors'},
 {id:'fe-net-4',q:'app.3f9a1c.js 这种带内容哈希的文件，最合适的缓存策略是？',options:['no-store','Cache-Control: max-age=31536000, immutable','每次都协商','不设置任何缓存头'],answer:1,explain:'内容变了文件名就变，可以放心长期强缓存。',interview:'fe-q-http-cache'},
 {id:'fe-net-5',type:'fill',q:'协商缓存时资源没有变化，服务器返回状态码 ____。',accepted:['304'],explain:'304 Not Modified，浏览器继续使用本地副本。',interview:'fe-q-http-cache'},
 {id:'fe-net-6',q:'登录凭证存在哪里最能防止被 XSS 脚本读走？',options:['localStorage','sessionStorage','HttpOnly 的 Cookie','全局变量'],answer:2,explain:'HttpOnly 的 Cookie 无法被 JS 读取。',interview:'fe-q-storage'},
 {id:'fe-net-7',type:'multi',q:'关于 localStorage，下面哪些说法正确？（多选）',options:['同源的页面共享','只能存字符串','读写是同步的','每次请求都会自动发给服务器'],answers:[0,1,2],explain:'自动携带的是 Cookie。',interview:'fe-q-storage'},
 {id:'fe-net-8',q:'AI 对话需要服务器把回答一段段推给页面，最简单合适的是？',options:['短轮询','SSE（EventSource 或 fetch 流）','FTP','WebRTC'],answer:1,explain:'单向持续推送用 SSE 最简单。',interview:'fe-q-websocket-fe'},
 {id:'fe-net-9',type:'judge',q:'Content-Type 为 application/json 的跨域 POST 请求，浏览器会先发送 OPTIONS 预检请求。',answer:true,explain:'非简单请求需要预检。',interview:'fe-q-cors'},
 {id:'fe-net-10',type:'short',q:'设计一个前端请求封装（比如 request 函数），应该统一处理哪些事情？',reference:'统一 baseURL 和请求头（如 Authorization）；JSON 序列化和解析；检查 response.ok，把 HTTP 错误和业务错误码转成统一的错误对象；超时和取消（AbortController）；401 时刷新 token 或跳转登录，并防止并发请求重复刷新；对幂等请求做有限次重试；统一的加载状态和错误提示；记录请求耗时和失败上报。',points:['统一地址、请求头和序列化','检查 ok 和业务错误码','超时、取消、有限重试','401 统一处理，监控上报'],explain:'封装的目标是让业务代码只关心数据。'},
]};

export const feTs:AiLevel={id:'fe-ts',title:'TypeScript 从入门到实用',summary:'基本类型标注、interface 与 type、联合与收窄、泛型和工具类型',lessons:[
 {title:'为什么要用 TypeScript',body:'TypeScript 在 JavaScript 上加了静态类型：写代码时编辑器就能发现拼错的属性名、传错的参数类型，重构时也更有底气。它最终编译成普通 JS 运行，类型只在开发阶段起作用。',code:"function greet(name: string): string {\n  return `你好，${name}`;\n}\ngreet(42); // 编译报错：number 不能赋给 string"},
 {title:'interface 和 type',body:'interface 描述对象结构，可以 extends，同名会自动合并；type 是类型别名，能写联合类型、元组、函数类型和各种组合。对象结构两者都行，联合和工具类型用 type。'},
 {title:'联合类型和类型收窄',body:'string | number 表示二选一。使用前用 typeof、instanceof、in 或判断字面量字段来收窄类型。unknown 比 any 安全：必须先收窄才能用。never 可以做穷尽检查，联合类型新增成员却忘了处理时编译报错。',code:"type Result = { ok: true; data: string } | { ok: false; error: string };\nfunction show(r: Result) {\n  if (r.ok) console.log(r.data);   // 这里 r 被收窄成成功分支\n  else console.log(r.error);\n}"},
 {title:'泛型和工具类型',body:'泛型让函数或类型适用于多种类型，同时保留类型信息：function first<T>(arr: T[]): T | undefined。用 extends 加约束，keyof 取属性名。常用工具类型：Partial、Required、Pick、Omit、Record、ReturnType。'},
],quiz:[
 {id:'fe-ts-1',type:'judge',q:'TypeScript 的类型检查会在浏览器运行时进行。',answer:false,explain:'类型只在编译期检查，编译后就是普通 JS。'},
 {id:'fe-ts-2',q:'想表示“状态只能是 idle、loading、done 之一”，最合适的是？',options:["type Status = 'idle' | 'loading' | 'done'",'interface Status { idle; loading; done }','enum 以外没有办法','string'],answer:0,explain:'字面量联合类型简洁且安全。',interview:'fe-q-ts-type-interface'},
 {id:'fe-ts-3',type:'multi',q:'下面哪些只能用 type 而不能直接用 interface 表达？（多选）',options:["联合类型 'a' | 'b'",'对象结构 { id: number }','元组 [string, number]','映射类型 { [K in Keys]: string }'],answers:[0,2,3],explain:'对象结构两者都可以。',interview:'fe-q-ts-type-interface'},
 {id:'fe-ts-4',q:'JSON.parse 的结果类型应该标成什么更安全？',options:['any','unknown，使用前再校验和收窄','never','object'],answer:1,explain:'unknown 强制你先检查数据结构。',interview:'fe-q-ts-any-unknown'},
 {id:'fe-ts-5',type:'fill',q:'把 User 的所有属性变成可选，用工具类型 ____<User>。',accepted:['Partial'],explain:'Required 则是全部变必填。',interview:'fe-q-ts-generics'},
 {id:'fe-ts-6',q:'function getProp<T, K extends keyof T>(o: T, k: K) 中，K extends keyof T 的作用是？',options:['让 K 可以是任意字符串','限制 k 只能是 o 已有的属性名','把 T 变成数组','没有作用'],answer:1,explain:'传入不存在的属性名会编译报错，返回类型是 T[K]。',interview:'fe-q-ts-generics'},
 {id:'fe-ts-7',type:'judge',q:'同名的两个 interface 声明会自动合并成一个。',answer:true,explain:'这叫声明合并，常用来扩展第三方库的类型。',interview:'fe-q-ts-type-interface'},
 {id:'fe-ts-8',q:'switch 处理完联合类型的所有成员后，在 default 里把值赋给 never 类型的变量，目的是？',options:['提升运行速度','新增成员却忘记处理时编译报错（穷尽检查）','消除警告','让代码更短'],answer:1,explain:'没处理的成员不能赋给 never。',interview:'fe-q-ts-any-unknown'},
 {id:'fe-ts-9',q:'下面哪一项会造成“类型错误被隐藏、一路传染”？',options:['大量使用 any','使用 unknown','使用联合类型','使用泛型'],answer:0,explain:'any 关闭检查，错误会从这里扩散到使用它的地方。',interview:'fe-q-ts-any-unknown'},
 {id:'fe-ts-10',type:'code',q:'写一个泛型函数 groupBy，按回调返回的 key 把数组分组，返回 Record<K, T[]>。',code:'function groupBy<T, K extends string>(list: T[], getKey: (item: T) => K): Record<K, T[]> {\n  // 在这里实现\n}',reference:'function groupBy<T, K extends string>(list: T[], getKey: (item: T) => K): Record<K, T[]> {\n  const result = {} as Record<K, T[]>;\n  for (const item of list) {\n    const key = getKey(item);\n    (result[key] ??= []).push(item);\n  }\n  return result;\n}',points:['T 是元素类型，K 是分组键类型','遍历时用 getKey 计算键','不存在的组先初始化为空数组','返回 Record<K, T[]>'],explain:'泛型让返回值保留元素类型，调用方能直接得到正确的提示。',interview:'fe-q-ts-generics'},
]};
