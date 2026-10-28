import type {AiQuiz} from '../journey';

// 前端高阶阶段训练（15 题）：浏览器原理、框架原理、工程化。
export const feTrain3:AiQuiz[]=[
 {id:'fe-x3-1',q:'下面代码在 1000 个元素上执行，为什么特别慢？',code:"boxes.forEach(b => {\n  b.style.height = b.offsetWidth / 2 + 'px';\n});",options:['forEach 太慢','每次循环先写样式再读 offsetWidth，导致反复的强制同步布局','height 不能用 px','元素太多无法优化'],answer:1,explain:'先把所有宽度读出来，再统一写入，只布局一次。'},
 {id:'fe-x3-2',type:'multi',q:'下面哪些属性的动画通常只需要合成、不会触发布局和绘制？（多选）',options:['transform','opacity','width','box-shadow'],answers:[0,1],explain:'width 触发布局，box-shadow 触发绘制。'},
 {id:'fe-x3-3',type:'judge',q:'requestAnimationFrame 的回调会在浏览器下一次重绘之前执行，适合做逐帧动画；页面在后台标签时它会被暂停或降频。',answer:true,explain:'比 setTimeout 更贴合刷新节奏，也更省电。'},
 {id:'fe-x3-4',q:'页面一个按钮点击后执行了 400ms 的同步计算，期间界面完全没反应。在不改变计算逻辑的前提下，最好的方案是？',options:['把按钮改大','把计算放进 Web Worker，或拆成小块在多个任务中执行','加 CSS 动画遮住','用更快的 for 循环'],answer:1,explain:'让主线程有机会处理渲染和输入。'},
 {id:'fe-x3-5',q:'React 列表用下标作为 key，删除第一项后，第二项输入框里的内容跑到了第一项。根本原因是？',options:['React 的 bug','key 变化导致组件按位置复用，状态跟着下标而不是数据走','输入框没有 value','缺少 useMemo'],answer:1,explain:'用数据 id 作为 key，组件状态才能跟着对应数据。'},
 {id:'fe-x3-6',q:'下面的组件每秒都打印 0，问题出在哪里？',code:"function Timer() {\n  const [n, setN] = useState(0);\n  useEffect(() => {\n    const id = setInterval(() => { console.log(n); setN(n + 1); }, 1000);\n    return () => clearInterval(id);\n  }, []);\n}",options:['setInterval 写错了','依赖数组为空，回调闭包里永远是第一次渲染的 n（陈旧闭包）；应使用 setN(v => v + 1)','useState 不能在 effect 里用','clearInterval 写错了'],answer:1,explain:'函数式更新不依赖闭包中的旧值；或者把 n 加进依赖。'},
 {id:'fe-x3-7',type:'fill',q:'React 中把耗时但不紧急的状态更新（比如过滤大列表）标记为可中断的低优先级，用 Hook use____。',accepted:['Transition','transition'],explain:'useTransition 让输入框等紧急更新先响应。'},
 {id:'fe-x3-8',type:'judge',q:'Vue 3 中对 reactive 对象解构 const { count } = state 之后，count 仍然是响应式的。',answer:false,explain:'解构得到的是普通值，失去响应式；要用 toRefs(state)。'},
 {id:'fe-x3-9',q:'SSR 页面在浏览器控制台出现 hydration mismatch 警告，最常见的原因是？',options:['服务器太慢','服务端和客户端第一次渲染的结果不同，比如直接用了 Date.now()、Math.random() 或 window','CSS 没加载','用了 TypeScript'],answer:1,explain:'只在客户端可用的值应放进 useEffect 或在客户端挂载后再渲染。'},
 {id:'fe-x3-10',type:'multi',q:'React Context 的值是一个每次渲染都新建的对象，会导致什么、怎么改？（多选）',options:['所有消费这个 Context 的组件每次都重新渲染','用 useMemo 缓存 value','把频繁变化和很少变化的数据拆成不同的 Context','Context 不能传对象'],answers:[0,1,2],explain:'Context 按引用比较 value。'},
 {id:'fe-x3-11',q:'引入一个组件库后，打包体积多了 800KB，但只用了 3 个组件。最可能的原因和处理是？',options:['组件库就是这么大','整包导入或库不支持 Tree Shaking；改为按需导入，确认使用 ESM 版本和 sideEffects 配置','关闭压缩','换浏览器'],answer:1,explain:'用打包分析工具确认是哪些模块进了产物。'},
 {id:'fe-x3-12',type:'judge',q:'动态 import() 会让被导入的模块拆分成独立的文件，并在调用时才下载。',answer:true,explain:'这是代码分割的基础。'},
 {id:'fe-x3-13',q:'两个包分别依赖 lodash@4.17.21 和 lodash@4.17.15，打包产物里出现了两份 lodash。应该怎么处理？',options:['无法处理','用包管理器的 dedupe / overrides（resolutions）统一版本','删掉 node_modules 就好','改成 CDN 引入'],answer:1,explain:'npm dedupe、pnpm overrides 或 yarn resolutions 可以统一依赖版本。'},
 {id:'fe-x3-14',type:'short',q:'React 中有一个包含 5000 行的表格，筛选时输入框明显卡顿。请给出排查思路和至少三个优化手段。',reference:'先用 React DevTools Profiler 录制一次输入，看哪些组件渲染、耗时多少。优化：1）虚拟列表只渲染可见行；2）把输入框状态放在单独组件里，用 useDeferredValue 或 useTransition 让表格更新延后、输入保持响应；3）行组件用 React.memo，并保证传入的 props 和回调引用稳定；4）筛选结果用 useMemo 缓存，避免每次渲染都重新计算；5）计算特别重时放 Web Worker；最后再用 Profiler 验证。',points:['先 Profiler 定位','虚拟列表','useDeferredValue / useTransition 区分优先级','memo + 稳定引用 + useMemo，必要时 Worker'],explain:'减少渲染的量，并让紧急更新优先。'},
 {id:'fe-x3-15',type:'code',q:'实现一个 React 自定义 Hook useDebouncedValue(value, delay)：value 停止变化 delay 毫秒后才返回最新值。',code:'function useDebouncedValue(value, delay) {\n  // 在这里实现\n}',reference:'function useDebouncedValue(value, delay) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(id);\n  }, [value, delay]);\n  return debounced;\n}',points:['用 state 保存延迟后的值','value 变化时重新设置定时器','清理函数清除上一个定时器','依赖写全 [value, delay]'],explain:'清理函数让“频繁变化”自动变成“只取最后一次”。'},
];

// 前端专家阶段训练（10 题）：性能优化、安全与工程架构。
export const feTrain4:AiQuiz[]=[
 {id:'fe-x4-1',q:'页面 LCP 元素是首屏轮播图的第一张，它是通过 JS 渲染后才设置 src 的。改善 LCP 最有效的是？',options:['给图片加 loading="lazy"','在 HTML 中直接输出首图，或 <link rel="preload" as="image"> 并设置 fetchpriority="high"','把图片改成 PNG','增加轮播动画'],answer:1,explain:'让浏览器尽早发现并优先下载 LCP 资源。'},
 {id:'fe-x4-2',type:'multi',q:'CLS 很高，下面哪些是常见原因？（多选）',options:['图片和广告位没有预留尺寸','网页字体加载后替换了系统字体导致文字重排','在已有内容上方异步插入横幅','使用 transform 做动画'],answers:[0,1,2],explain:'transform 动画不会引起布局偏移。'},
 {id:'fe-x4-3',type:'judge',q:'Lighthouse 分数达到 100 分，就说明线上所有用户的体验都很好。',answer:false,explain:'实验室数据不能代表真实设备和网络，要结合 RUM 的分位数据。'},
 {id:'fe-x4-4',q:'后台富文本编辑器允许用户提交 HTML，展示页需要渲染出来。下面哪种组合最安全？',options:['直接 innerHTML','服务端和前端都用白名单净化（如 DOMPurify），再配合 CSP 禁止内联脚本','只过滤 <script> 标签','用正则替换 <'],answer:1,explain:'事件属性（onerror）、javascript: 链接等都可能执行脚本，黑名单过滤不可靠。'},
 {id:'fe-x4-5',q:'接口使用 Authorization: Bearer token，token 存在 localStorage。它的主要风险是？',options:['CSRF','XSS 时脚本能直接读走 token','token 太长','跨域'],answer:1,explain:'这种方式天然不受 CSRF 影响，但更怕 XSS；HttpOnly Cookie 方案则反过来要防 CSRF。'},
 {id:'fe-x4-6',type:'fill',q:'通过 HTTP 响应头 Content-Security-____ 限制页面可以加载和执行哪些来源的脚本。',accepted:['Policy','policy'],explain:'CSP 是防御 XSS 的重要纵深手段。'},
 {id:'fe-x4-7',q:'大文件分片上传时，如何避免计算 10GB 文件的完整哈希耗时太久？',options:['不需要标识','在 Worker 中增量计算，或抽样（首尾和中间若干片）计算快速指纹，服务端合并后再完整校验','把文件读进内存一次算完','让用户自己输入文件名'],answer:1,explain:'抽样指纹用于秒传判断，最终完整性仍要校验。'},
 {id:'fe-x4-8',type:'judge',q:'前端错误监控上报时应该对数据进行采样和去重，并且 SDK 自身出错时不能影响业务代码运行。',answer:true,explain:'监控不能成为新的故障源。'},
 {id:'fe-x4-9',q:'采用微前端后，子应用 A 修改了全局的 body 样式，影响了子应用 B。下面哪个方向能解决？',options:['让 B 不要用 body','样式隔离：Shadow DOM、CSS 作用域前缀或沙箱，并约定子应用不修改全局样式','合并两个子应用','关闭 CSS'],answer:1,explain:'隔离 + 约定是微前端的基本要求。'},
 {id:'fe-x4-10',type:'short',q:'公司要从零建设一个组件库供多个业务线使用。请说说你的设计要点。',reference:'定位与规范：先和设计团队统一设计令牌（颜色、字号、间距、圆角），用 CSS 变量实现主题和暗色模式。组件 API：受控与非受控、一致的命名、可组合与可定制（插槽或 render 函数），避免过度配置。质量：可访问性（键盘、ARIA、焦点管理）、单元和交互测试、视觉回归测试、TypeScript 类型完整。性能：支持按需引入和 Tree Shaking，弹层等复杂组件注意渲染性能。工程：文档站和示例、语义化版本与变更日志、破坏性变更提供迁移指南、CI 自动发布。',points:['设计令牌和主题','一致、可组合的 API','可访问性 + 测试 + 类型','按需引入、文档、版本管理'],explain:'组件库是长期产品，规范和兼容性比数量更重要。'},
];
