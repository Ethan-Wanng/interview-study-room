import type {AiLevel} from '../journey';

// 前端专家：性能优化；安全与工程架构。
export const fePerf:AiLevel={id:'fe-perf',title:'性能优化：指标、首屏与长列表',summary:'Core Web Vitals、首屏优化、图片优化和虚拟列表',lessons:[
 {title:'用指标说话',body:'LCP（最大内容出现时间）≤ 2.5 秒，INP（交互响应延迟）≤ 200 毫秒，CLS（布局偏移）≤ 0.1。Lighthouse 是实验室数据，真实用户监控（RUM）反映线上情况；优化前先测量，优化后对比同样的指标。'},
 {title:'首屏优化',body:'减少关键路径：按路由分割 JS、删除无用依赖、关键 CSS 内联、脚本 defer；网络层：CDN、压缩、长期缓存、preconnect；首屏主图 preload 并设 fetchpriority="high"；SSR / SSG 让首屏直接有内容；骨架屏改善感知。'},
 {title:'图片与字体',body:'照片用 WebP / AVIF，按显示尺寸用 srcset 提供多种分辨率；非首屏图片 loading="lazy"；所有图片写 width / height 或 aspect-ratio 避免布局跳动。字体子集化，font-display: swap 先显示系统字体。',code:'<img src="p-800.webp" srcset="p-400.webp 400w, p-800.webp 800w" sizes="(max-width: 600px) 100vw, 800px" width="800" height="600" loading="lazy" alt="商品图">'},
 {title:'长列表和长任务',body:'上万条数据用虚拟列表，只渲染可视区域；长任务拆分（scheduler.yield、setTimeout 分片），重计算放 Web Worker；React 中非紧急更新用 useTransition。用 Performance 面板找出长任务和强制同步布局。'},
],quiz:[
 {id:'fe-perf-1',q:'LCP 衡量的是什么？',options:['服务器首个字节到达浏览器的时间','最大图片或文本块渲染完成的时间','用户点击后界面给出响应的延迟','页面元素在加载中意外跳动的程度'],why:['首字节时间是 TTFB，反映服务器响应速度。','','交互响应延迟是 INP。','布局跳动程度是 CLS。'],answer:1,explain:'目标 2.5 秒以内。',interview:'fe-q-web-vitals'},
 {id:'fe-perf-2',q:'图片加载出来后把下面的文字挤下去，主要影响哪个指标？',options:['LCP','INP','CLS','TTFB'],why:['LCP 衡量最大内容的加载时间，不衡量跳动。','INP 衡量交互后的响应速度。','','TTFB 衡量服务器的首字节响应时间。'],answer:2,explain:'预留宽高或 aspect-ratio 可避免。',interview:'fe-q-web-vitals'},
 {id:'fe-perf-3',type:'multi',q:'点击按钮后界面要 800 毫秒才有反应，下面哪些做法能改善 INP？（多选）',options:['把点击处理里的长任务拆分','把重计算放到 Web Worker','给按钮绑定更多的事件监听','给按钮加上更大的阴影效果'],why:['','','更多监听只会让点击时要执行的代码更多，响应更慢。','视觉样式不影响主线程处理点击的速度。'],answers:[0,1],explain:'INP 关注主线程能否尽快处理交互并画出下一帧：拆分长任务、把计算移出主线程、用 useTransition 标记非紧急更新都有效。',interview:'fe-q-web-vitals'},
 {id:'fe-perf-4',type:'judge',q:'首屏最重要的大图应该设置 loading="lazy" 来加快加载。',answer:false,explain:'首屏图片懒加载反而推迟 LCP；应该 preload 并 fetchpriority="high"。',interview:'fe-q-image-opt'},
 {id:'fe-perf-5',q:'10 万条数据的表格滚动卡顿，最有效的方案是？',options:['给每一行加上 will-change','虚拟列表，只渲染可见的几十行','把数据存进 localStorage','把每一列的宽度调窄一些'],why:['给大量元素提升图层会消耗大量显存，反而更卡。','','数据存放位置不影响 DOM 节点的数量。','列宽与渲染的节点数量无关。'],answer:1,explain:'DOM 节点数从 10 万降到几十个。',interview:'fe-q-virtual-list'},
 {id:'fe-perf-6',type:'fill',q:'用 img 的 ____ 属性提供多种分辨率，让浏览器按屏幕选择合适的图片。',accepted:['srcset'],explain:'配合 sizes 告诉浏览器图片的显示宽度。',interview:'fe-q-image-opt'},
 {id:'fe-perf-7',q:'首页加载慢，第一步应该做什么？',options:['先把所有图片删掉','用工具和线上数据测量，找到瓶颈','先升级到最新的框架版本','换一个更轻量的 UI 组件库'],why:['盲目删内容会影响功能，也不一定是瓶颈所在。','','升级框架不一定能解决问题，还可能引入新风险。','没有数据支撑就换库，很可能优化错了地方。'],answer:1,explain:'先测量再优化，否则容易优化错地方。',interview:'fe-q-first-screen'},
 {id:'fe-perf-8',type:'judge',q:'虚拟列表中行高不固定时，可以先估算高度，渲染后测量真实高度再修正位置。',answer:true,explain:'成熟的虚拟列表库都支持动态高度。',interview:'fe-q-virtual-list'},
 {id:'fe-perf-9',q:'Lighthouse 分数很高，但用户仍然反馈很慢，最可能的原因是？',options:['Lighthouse 工具本身出了问题导致误判','实验室环境与真实用户的设备、网络不同','用户的反馈不准确，可以直接忽略','分数越高的页面在真实环境中反而越慢'],why:['Lighthouse 的结果是可靠的，只是测量条件与真实用户不同。','','用户的体验就是真实数据，应该用 RUM 去量化而不是忽略。','分数与速度正相关，不存在这种反向关系。'],answer:1,explain:'要结合真实用户监控。',interview:'fe-q-web-vitals'},
 {id:'fe-perf-10',type:'short',q:'说一次你会怎么把首屏时间从 5 秒优化到 2 秒以内（可以假设场景）。',reference:'先测量：Network 显示 JS 1.8MB、首屏图 2MB，Performance 显示主线程解析执行 JS 1.5 秒，TTFB 600ms。优化：按路由分割和删除无用依赖，首屏 JS 降到 300KB；首屏图转 AVIF、按尺寸输出并 preload；静态资源上 CDN 并设长期缓存，HTML 协商缓存；关键 CSS 内联，其余异步；首页改为 SSR 或 SSG。结果：LCP 从 5.1 秒降到 1.8 秒，并在 CI 中加入体积和 LCP 预算防止回退。',points:['先测量，定位最大的几个瓶颈','JS：分割、去依赖','图片：格式、尺寸、预加载','网络与渲染：CDN、缓存、SSR，用数据验证并设预算'],explain:'面试时要有数据、有取舍、有验证。',interview:'fe-q-first-screen'},
]};

export const feArch:AiLevel={id:'fe-arch',title:'前端安全与工程架构',summary:'XSS、CSRF、权限、监控、大文件上传、微前端和组件设计',lessons:[
 {title:'XSS 和 CSRF',body:'XSS：恶意脚本被注入页面执行。防御：输出转义，不用 innerHTML 渲染不可信内容（必要时 DOMPurify），配置 CSP，凭证 Cookie 设 HttpOnly。CSRF：恶意网站借用户的 Cookie 发请求。防御：SameSite Cookie、CSRF Token、校验 Origin，修改数据不用 GET。'},
 {title:'权限和监控',body:'前端根据权限生成路由、菜单和按钮，只是为了体验，真正的权限校验必须在后端。监控采集错误（onerror、unhandledrejection、资源错误）、性能（Web Vitals）和行为，用 sendBeacon 上报，上传 source map 还原报错位置，按版本聚合告警。'},
 {title:'大文件上传',body:'用 file.slice 分片，在 Web Worker 中计算内容哈希作为标识；上传前询问服务端已有哪些分片，实现秒传和断点续传；控制并发、失败重试、可暂停取消；服务端合并并校验。',code:"const chunks = [];\nfor (let start = 0; start < file.size; start += SIZE) {\n  chunks.push(file.slice(start, start + SIZE));\n}"},
 {title:'组件库和微前端',body:'通用组件要设计好 API（受控 / 非受控、可定制渲染）、键盘与 ARIA、弹层定位、大数据性能，并有文档和测试。微前端让多个团队独立开发部署子应用，但带来样式隔离、依赖重复和通信的成本，团队规模小时模块化单体更合适。'},
],quiz:[
 {id:'fe-arch-1',q:'评论内容要支持部分 HTML 格式，渲染时最安全的做法是？',options:['直接赋值给 innerHTML','先用 DOMPurify 等库净化再渲染','用 eval 解析后再插入页面','把内容放进 script 标签里'],why:['直接渲染不可信的 HTML 会执行其中的脚本和事件属性，造成 XSS。','','eval 会把内容当代码执行，危险性更大。','放进 script 标签同样会被当作代码执行。'],answer:1,explain:'不可信 HTML 必须先净化；纯文本直接用 textContent。',interview:'fe-q-xss'},
 {id:'fe-arch-2',type:'multi',q:'下面哪些措施能防御 CSRF？（多选）',options:['Cookie 设置 SameSite=Lax','关键请求携带 CSRF Token','服务端校验 Origin 请求头','关键操作要求再次输入密码'],why:['','','',''],answers:[0,1,2,3],explain:'SameSite 让跨站请求不带 Cookie，CSRF Token 和 Origin 校验确认请求来自自己的页面，二次验证让攻击者无法替用户完成操作。修改数据的接口不应使用 GET。',interview:'fe-q-csrf'},
 {id:'fe-arch-3',type:'judge',q:'前端把“删除”按钮隐藏了，没有权限的用户就无法删除数据。',answer:false,explain:'请求可以绕过界面直接调用接口，后端必须校验权限。',interview:'fe-q-auth-route'},
 {id:'fe-arch-4',q:'线上报错堆栈显示 a.js:1:23456，看不懂。应该怎么做？',options:['让用户截图发给开发人员排查','生成 source map 上传监控平台还原位置','在线上环境关闭代码压缩后再排查','在线上代码中打印更多的 console.log'],why:['截图看到的仍是压缩后的位置，无法定位源码。','','关闭压缩会让所有用户下载更大的文件，代价太高。','日志不能还原堆栈，还会暴露内部信息。'],answer:1,explain:'source map 不要公开部署，只上传给监控服务。',interview:'fe-q-monitor'},
 {id:'fe-arch-5',type:'fill',q:'页面关闭时也能可靠地上报监控数据，常用 navigator.____。',accepted:['sendBeacon','sendBeacon()'],explain:'它在后台异步发送，不阻塞页面卸载。',interview:'fe-q-monitor'},
 {id:'fe-arch-6',q:'大文件上传中，“秒传”是指？',options:['上传速度极快，几秒就能传完','服务端已有相同哈希的文件，直接成功','只上传文件的第一个分片作为代表','先把文件压缩到很小再上传'],why:['“秒传”的快来自不需要传输，而不是网速快。','','只传第一片无法得到完整文件。','压缩只能减少体积，仍然需要上传。'],answer:1,explain:'依赖内容哈希判断文件是否已经存在。',interview:'fe-q-big-upload'},
 {id:'fe-arch-7',q:'计算大文件哈希时页面卡住了，应该？',options:['换一台性能更好的电脑来计算','放到 Web Worker 中分块增量计算','干脆不计算文件哈希，直接上传','用 setInterval 把计算分批执行'],why:['不能要求用户换电脑，问题在于计算占用了主线程。','','秒传、断点续传都依赖哈希，不能省略。','定时器回调仍在主线程执行，只能缓解卡顿，不能消除。'],answer:1,explain:'后台线程 + 增量计算，主线程保持响应。',interview:'fe-q-big-upload'},
 {id:'fe-arch-8',type:'judge',q:'只有一个小团队维护的中型后台系统，引入微前端通常能显著降低复杂度。',answer:false,explain:'微前端解决多团队独立交付的问题，本身会增加隔离、通信和性能成本。',interview:'fe-q-micro-frontend'},
 {id:'fe-arch-9',q:'设计 Select 组件时，下拉层被父元素 overflow: hidden 裁掉了，常见解决办法是？',options:['提示用户打开下拉层时不要滚动页面','用 Portal 渲染到 body 下并计算定位','把下拉层的 z-index 调成 99999','去掉下拉层，改成在原地展开纯文本'],why:['这不是解决问题，而是把问题推给用户。','','overflow 裁剪与层级无关，z-index 再大也会被裁掉。','去掉下拉层就失去了组件的功能。'],answer:1,explain:'脱离裁剪容器，再根据触发元素的位置定位和翻转。',interview:'fe-q-design-component'},
 {id:'fe-arch-10',type:'short',q:'设计一个前端错误监控 SDK，需要考虑哪些点？',reference:'采集：window.onerror 和 unhandledrejection、资源加载错误（捕获阶段监听 error）、框架错误边界、接口失败；附带上下文：页面 URL、版本号、浏览器、用户标识（脱敏）、操作路径（面包屑）。上报：采样、去重合并、批量发送、失败缓存重试，使用 sendBeacon；SDK 自身要轻量、异常不能影响业务。服务端：source map 还原、按版本和错误指纹聚合、告警和趋势。隐私：不上报敏感信息。',points:['全面采集错误并附带上下文','采样、去重、批量、sendBeacon','SDK 轻量且自身不能出错','source map 还原、聚合告警，注意隐私'],explain:'监控的价值在于第一时间发现并能快速定位。',interview:'fe-q-monitor'},
]};
