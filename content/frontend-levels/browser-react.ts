import type {AiLevel} from '../journey';

// 前端高阶：浏览器原理；组件化与框架原理。
export const feBrowser:AiLevel={id:'fe-browser',title:'浏览器原理与渲染',summary:'渲染流水线、重排重绘、合成，以及 Worker 和 Service Worker',lessons:[
 {title:'渲染流水线',body:'HTML → DOM，CSS → CSSOM，合成渲染树 → 布局（算位置大小）→ 绘制（生成绘制指令）→ 合成（把各层拼到屏幕）。同步 JS 阻塞 HTML 解析，CSS 阻塞渲染；浏览器目标是每帧 16.7 毫秒内完成工作，否则就会掉帧。'},
 {title:'重排、重绘和合成',body:'改尺寸、位置、增删节点触发重排（最贵）；只改颜色触发重绘；只改 transform、opacity 可以只在合成阶段完成，最流畅。避免读写交替造成强制同步布局：先统一读取，再统一写入，或者放进 requestAnimationFrame。',code:"// 不好：每次循环读写交替，强制布局\nitems.forEach(el => { el.style.width = el.offsetWidth + 10 + 'px'; });\n// 好：先读后写\nconst widths = items.map(el => el.offsetWidth);\nitems.forEach((el, i) => { el.style.width = widths[i] + 10 + 'px'; });"},
 {title:'主线程和 Worker',body:'渲染、执行 JS、处理输入都在主线程，长任务（超过 50 毫秒）会让页面卡顿。重计算放到 Web Worker：后台线程运行，通过 postMessage 通信，不能操作 DOM。Service Worker 是网络代理，用来做离线缓存和推送。'},
 {title:'从输入网址到首屏',body:'DNS → 连接（TLS）→ 请求 HTML → 解析并发现 CSS、JS、图片 → 渲染。可以在每一段优化：dns-prefetch / preconnect、CDN、压缩缓存、关键 CSS 内联、JS defer、首屏图片 preload、SSR。'},
],quiz:[
 {id:'fe-browser-1',q:'下面哪个顺序是浏览器渲染的主要步骤？',options:['绘制 → 布局 → 合成','DOM/CSSOM → 渲染树 → 布局 → 绘制 → 合成','布局 → DOM → 绘制','JS → 合成 → DOM'],answer:1,explain:'这是经典的渲染流水线。',interview:'fe-q-render'},
 {id:'fe-browser-2',type:'multi',q:'下面哪些修改会触发重排？（多选）',options:['修改 width','增删 DOM 节点','只修改 color','读取 offsetHeight（在样式改动之后）'],answers:[0,1,3],explain:'改颜色只重绘；改动后读取布局属性会强制同步布局。',interview:'fe-q-reflow'},
 {id:'fe-browser-3',q:'做一个流畅的位移动画，应该修改哪个属性？',options:['left','top','transform: translateX()','margin-left'],answer:2,explain:'transform 可以只在合成阶段完成，不触发布局。',interview:'fe-q-reflow'},
 {id:'fe-browser-4',type:'judge',q:'display: none 的元素不会出现在渲染树里。',answer:true,explain:'它不参与布局和绘制。',interview:'fe-q-render'},
 {id:'fe-browser-5',q:'页面要计算一个 1GB 文件的哈希，又不想卡住界面，应该？',options:['用 setTimeout 包一下','放进 Web Worker 计算','用 requestAnimationFrame','用 CSS 动画'],answer:1,explain:'Worker 在后台线程运行，不阻塞主线程。',interview:'fe-q-web-worker'},
 {id:'fe-browser-6',type:'fill',q:'通常把执行时间超过 ____ 毫秒的主线程任务称为长任务。',accepted:['50'],explain:'长任务会推迟输入响应，影响 INP。'},
 {id:'fe-browser-7',q:'发布新版本后，有用户一直看到旧页面，网站使用了 Service Worker。最可能的原因是？',options:['CDN 坏了','新的 Service Worker 在等待旧页面关闭，仍在用旧缓存','浏览器不支持 ES6','DNS 没生效'],answer:1,explain:'需要提示用户刷新并配合 skipWaiting，HTML 不宜缓存优先。',interview:'fe-q-service-worker'},
 {id:'fe-browser-8',type:'judge',q:'Web Worker 里可以直接修改页面上的 DOM 元素。',answer:false,explain:'Worker 不能访问 DOM，只能通过消息把结果交给主线程。',interview:'fe-q-web-worker'},
 {id:'fe-browser-9',q:'<link rel="preconnect" href="https://cdn.example.com"> 的作用是？',options:['预先下载整个网站','提前完成 DNS、TCP 和 TLS 握手，之后请求更快','禁止跨域','缓存 HTML'],answer:1,explain:'建连时间提前到浏览器空闲时完成。',interview:'fe-q-url-frontend'},
 {id:'fe-browser-10',type:'short',q:'为什么把 script 放在 head 里且不加 defer 会让首屏变慢？',reference:'HTML 解析遇到同步 script 会暂停，等脚本下载并执行完才继续；而且脚本执行前要等前面的 CSS 加载完（脚本可能读取样式）。这期间页面主体还没解析，用户看到白屏。加 defer 后脚本并行下载、解析完成后再执行，不阻塞首屏；或者把脚本放到 body 底部。',points:['同步脚本阻塞 HTML 解析','还要等前面的 CSS','白屏时间变长','用 defer 或放到底部'],explain:'关键渲染路径上要尽量少阻塞。',interview:'fe-q-script-defer'},
]};

export const feReact:AiLevel={id:'fe-react',title:'组件化与框架原理（React / Vue）',summary:'虚拟 DOM、key、Hooks、响应式、状态管理和渲染模式',lessons:[
 {title:'组件和数据流',body:'把界面拆成组件，数据通过 props 从父到子单向流动，子组件通过回调（React）或 emit（Vue）通知父组件。兄弟组件共享数据就把状态提升到共同父组件；跨很多层用 Context / provide；真正全局的才放 store。服务端数据交给 React Query、SWR 管理。'},
 {title:'虚拟 DOM 和 key',body:'状态变化后生成新的虚拟 DOM 树，和旧树 diff，只把差异更新到真实 DOM。列表的 key 告诉框架“哪个是哪个”：用数据自己的 id，不要用下标，否则插入删除时组件状态会错位。'},
 {title:'React Hooks',body:'Hook 的状态按调用顺序存储，所以只能在顶层调用，不能写在条件和循环里。useEffect 处理副作用：依赖要写全，订阅和定时器要返回清理函数。优化重渲染：React.memo、useMemo、useCallback，更根本的是把状态下放。',code:"function Clock() {\n  const [now, setNow] = useState(Date.now());\n  useEffect(() => {\n    const id = setInterval(() => setNow(Date.now()), 1000);\n    return () => clearInterval(id);\n  }, []);\n  return <time>{new Date(now).toLocaleTimeString()}</time>;\n}"},
 {title:'Vue 响应式和渲染模式',body:'Vue 3 用 Proxy：读属性时收集依赖，改属性时通知依赖更新；Vue 2 的 defineProperty 检测不到新增属性和数组下标修改。渲染模式：CSR 浏览器渲染；SSR 服务端每次渲染、首屏快利于 SEO；SSG 构建时生成，最快。'},
],quiz:[
 {id:'fe-react-1',q:'渲染列表时，key 最好用什么？',options:['数组下标','Math.random()','数据自身稳定的唯一 id','不写 key'],answer:2,explain:'随机数每次都变，下标在插入删除时会变，都会导致错误复用。',interview:'fe-q-key'},
 {id:'fe-react-2',type:'judge',q:'虚拟 DOM 在任何情况下都比直接操作 DOM 更快。',answer:false,explain:'它多了一层计算；价值在于声明式开发和足够好的默认性能。',interview:'fe-q-vdom'},
 {id:'fe-react-3',q:'下面哪种写法违反了 Hooks 规则？',options:['在组件顶层调用 useState','在自定义 Hook 里调用 useEffect','if (isLogin) { useState(0) }','在顶层调用多个 useState'],answer:2,explain:'条件调用会打乱 Hook 的调用顺序。',interview:'fe-q-hooks-rules'},
 {id:'fe-react-4',q:'useEffect 里开了 setInterval，组件卸载后定时器还在运行。应该怎么做？',options:['在依赖数组里加上 interval','在 effect 中返回清理函数 clearInterval','改用 setTimeout','什么都不用做'],answer:1,explain:'清理函数在卸载和下次执行前调用。',interview:'fe-q-useeffect'},
 {id:'fe-react-5',type:'multi',q:'父组件输入时，一个很重的子组件跟着重渲染，下面哪些优化有效？（多选）',options:['用 React.memo 包住子组件','传给子组件的回调用 useCallback 保持稳定','把输入框状态下放到单独的小组件','给子组件加更多 props'],answers:[0,1,2],explain:'先用 Profiler 确认瓶颈再优化。',interview:'fe-q-react-perf'},
 {id:'fe-react-6',type:'fill',q:'Vue 3 实现响应式使用的是 ES6 的 ____ 对象。',accepted:['Proxy','proxy'],explain:'Vue 2 用的是 Object.defineProperty。',interview:'fe-q-vue-reactivity'},
 {id:'fe-react-7',q:'Vue 2 中直接给响应式对象新增一个属性，页面不更新，原因是？',options:['Vue 2 不支持对象','defineProperty 只能劫持已存在的属性','需要刷新页面','属性名太长'],answer:1,explain:'Vue 2 需要用 Vue.set；Vue 3 的 Proxy 能拦截新增属性。',interview:'fe-q-vue-reactivity'},
 {id:'fe-react-8',q:'新闻详情页既需要 SEO，又需要实时数据，最合适的渲染方式是？',options:['纯 CSR','SSR','只用 SSG 且从不更新','iframe'],answer:1,explain:'SSR 每次请求生成 HTML，首屏有内容、利于 SEO；也可用 ISR。',interview:'fe-q-csr-ssr'},
 {id:'fe-react-9',type:'judge',q:'商品列表这种服务端数据，最好全部手动塞进 Redux，自己处理缓存和刷新。',answer:false,explain:'服务端数据更适合用 React Query / SWR 管理缓存、去重和失效刷新。',interview:'fe-q-state-mgmt'},
 {id:'fe-react-10',type:'short',q:'两个兄弟组件需要共享同一份数据，有哪些方式？各自适合什么场景？',reference:'最简单的是状态提升：把状态放到共同的父组件，通过 props 分别传给两个兄弟，修改通过回调；层级较深时用 Context（React）或 provide / inject（Vue），适合主题、语言这类不常变的数据；跨页面、复杂的客户端共享状态用全局 store（Zustand、Redux、Pinia）；如果共享的是服务端数据，用数据请求库共享同一个缓存。事件总线灵活但数据流向不清晰，尽量少用。',points:['状态提升到共同父组件','跨层用 Context / provide','全局 store 放真正共享的客户端状态','服务端数据用请求库的共享缓存'],explain:'优先选最简单、数据流最清楚的方式。',interview:'fe-q-component-comm'},
]};
