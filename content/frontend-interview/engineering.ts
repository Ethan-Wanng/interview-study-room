import type {FeInterviewQuestion} from './types';
const p=(text:string)=>({type:'text' as const,text}),c=(text:string)=>({type:'code' as const,text});

// 前端面试题（五）：工程化、性能优化与项目。
export const feEngineering:FeInterviewQuestion[]=[
 {id:'fe-q-bundler',section:'工程化',title:'Webpack 和 Vite 有什么区别？Vite 为什么开发时更快？',blocks:[
  p('Webpack 在开发时也要先把整个应用打包成 bundle 才能启动，项目越大启动和热更新越慢。Vite 开发时利用浏览器原生 ES Module：启动时不打包业务代码，浏览器请求到哪个模块才即时编译哪个；第三方依赖预构建一次（Vite 7 及以前用 esbuild，Vite 8 起改由 Rolldown 完成）；热更新只替换改动的模块，速度和项目大小关系不大。'),
  p('生产构建时 Vite 仍然会打包（Rollup / Rolldown），因为大量零散的模块请求在生产环境性能不好。Webpack 生态成熟、配置灵活，老项目和特殊需求（如复杂的模块联邦）仍很常见。')]},
 {id:'fe-q-tree-shaking',section:'工程化',title:'什么是 Tree Shaking？为什么有时不生效？',blocks:[
  p('Tree Shaking 是在打包时删除没有被使用的导出代码。它依赖 ES Module 的静态结构：编译期就能分析出哪些导出被 import 了。'),
  p('不生效的常见原因：依赖用的是 CommonJS；模块有副作用（顶层修改全局变量、引入 CSS），打包工具不敢删，可以在 package.json 里用 sideEffects 字段声明；从整个库导入（import _ from "lodash"）而不是按需导入（lodash-es）；Babel 把 ESM 转成了 CommonJS。')]},
 {id:'fe-q-code-split',section:'工程化',title:'如何做代码分割和按需加载？',blocks:[
  p('用动态 import() 把代码拆成独立的 chunk，用到时才加载。最常见的是按路由分割：每个页面一个 chunk；其次是体积大、不是首屏必需的组件（富文本编辑器、图表、弹窗）。React 用 React.lazy + Suspense，Vue 用 defineAsyncComponent。'),
  p('还要合理拆分第三方依赖（vendor chunk），利用浏览器长期缓存；对用户很可能马上访问的页面用 prefetch 预加载。分割过细会产生大量小请求，要用 bundle 分析工具（rollup-plugin-visualizer、webpack-bundle-analyzer）观察结果。'),
  c("const Chart = lazy(() => import('./Chart'));\n<Suspense fallback={<Spinner />}>\n  <Chart data={data} />\n</Suspense>")]},
 {id:'fe-q-web-vitals',section:'性能优化',title:'Core Web Vitals 有哪些指标？分别怎么优化？',blocks:[
  p('LCP（最大内容绘制）：首屏最大的图片或文本块渲染出来的时间，目标 ≤ 2.5 秒。优化：加快服务器响应和 CDN、首屏关键图片 preload 并设置 fetchpriority="high"、压缩图片、减少阻塞渲染的 CSS 和 JS、使用 SSR。'),
  p('INP（交互到下一次绘制）：用户操作到界面响应的延迟，目标 ≤ 200 毫秒。优化：拆分长任务、减少主线程 JS、重计算放 Web Worker、用 useTransition 降低非紧急更新优先级。CLS（累积布局偏移）：页面元素意外跳动的程度，目标 ≤ 0.1。优化：图片和广告位预留宽高或 aspect-ratio、字体加载不引起跳动、不在已有内容上方突然插入元素。')]},
 {id:'fe-q-first-screen',section:'性能优化',title:'首屏加载很慢，你会怎么分析和优化？',blocks:[
  p('先测量：用 Lighthouse、Chrome Performance 和 Network 面板，以及线上真实用户的数据（RUM），看慢在哪里：TTFB 高是服务端或网络问题；JS 体积大导致下载和执行慢；关键图片太大；请求瀑布太长。'),
  p('对症优化：路由级代码分割、删除无用依赖、Tree Shaking；资源压缩和长期缓存、CDN；关键 CSS 内联、JS defer；首屏图片优化尺寸和格式、非首屏懒加载；预连接关键域名；SSR / SSG 让首屏直接有内容；骨架屏改善感知体验。优化后用同样的指标对比，并加入性能预算防止回退。')]},
 {id:'fe-q-virtual-list',section:'性能优化',title:'一个列表有 10 万条数据，如何流畅渲染？',blocks:[
  p('不要一次性渲染 10 万个 DOM 节点。虚拟滚动（虚拟列表）只渲染可视区域加上下少量缓冲的几十条：用一个总高度等于“条数 × 行高”的占位撑出滚动条，根据 scrollTop 计算当前应显示的起止下标，再用 transform 把这几十条放到正确位置。'),
  p('行高不固定时，先估算高度，渲染后测量真实高度并缓存修正。成熟库：react-window、TanStack Virtual、vue-virtual-scroller。数据本身也要分页或流式加载，过滤排序等大计算放 Web Worker。'),
  c('const start = Math.floor(scrollTop / rowHeight);\nconst end = Math.min(total, start + Math.ceil(viewportHeight / rowHeight) + buffer);\nconst offsetY = start * rowHeight; // 用 transform: translateY(offsetY) 定位')]},
 {id:'fe-q-image-opt',section:'性能优化',title:'前端图片有哪些优化手段？',blocks:[
  p('格式：照片用 WebP / AVIF，图标用 SVG 或图标字体；尺寸：按显示尺寸提供多种分辨率，用 srcset 和 sizes 让浏览器选择；压缩：构建时或图片 CDN 自动压缩。'),
  p('加载：非首屏图片 loading="lazy"，首屏关键图片 fetchpriority="high" 甚至 preload；设置 width / height 或 aspect-ratio 避免布局跳动；可以先显示低质量占位图再替换。用图片 CDN 按设备动态裁剪、转格式，能省掉大量手工工作。'),
  c('<img src="hero-800.webp"\n     srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1600.webp 1600w"\n     sizes="(max-width: 600px) 100vw, 800px"\n     width="800" height="450" fetchpriority="high" alt="新品发布">')]},
 {id:'fe-q-big-upload',section:'项目实战',title:'如何实现大文件上传（分片、断点续传、秒传）？',blocks:[
  p('分片：用 file.slice 把文件切成固定大小（如 5MB）的块，并发上传（控制并发数，比如 3～6 个），每片带上文件标识和序号，服务端全部收到后合并。文件标识用内容哈希，在 Web Worker 里用 spark-md5 等增量计算，避免卡住页面。'),
  p('断点续传：上传前先问服务端“这个哈希已经有哪些分片”，只传缺的部分。秒传：服务端已经有相同哈希的完整文件，直接返回成功。还要做失败重试、暂停与取消（AbortController）、进度展示，以及服务端校验分片完整性。')]},
 {id:'fe-q-monitor',section:'项目实战',title:'如何搭建前端监控？要采集哪些数据？',blocks:[
  p('错误监控：window.onerror 捕获运行时错误，unhandledrejection 捕获未处理的 Promise 拒绝，资源加载错误在捕获阶段监听 error 事件，框架层用 ErrorBoundary / errorHandler；生产代码是压缩过的，要上传 source map 到监控服务（不要公开部署）才能还原源码位置。'),
  p('性能监控：用 PerformanceObserver 采集 LCP、INP、CLS 和资源耗时。行为数据：PV、点击、路由切换。上报用 navigator.sendBeacon（页面关闭时也能发出），做采样、合并和去重，避免影响用户。最后在后台按版本、浏览器、地区聚合，设置告警。')]},
 {id:'fe-q-auth-route',section:'项目实战',title:'前端权限控制怎么做？',blocks:[
  p('登录后从后端获取用户的角色和权限列表。路由级：根据权限动态生成可访问的路由和菜单，在路由守卫里拦截没有权限的访问，跳到 403 或登录页。按钮级：用指令或组件（如 <Can permission="order:delete">）控制显示。'),
  p('关键原则：前端控制只是为了体验，真正的安全必须在后端每个接口上校验权限，因为前端代码和请求都可以被篡改。token 过期要统一处理（刷新或跳登录），权限变更后要刷新本地缓存的权限数据。')]},
 {id:'fe-q-micro-frontend',section:'项目实战',title:'什么是微前端？有哪些实现方式和问题？',blocks:[
  p('微前端把一个大型前端应用拆成多个可以独立开发、独立部署的子应用，由主应用按路由组合起来，适合多团队协作、技术栈不同或需要渐进迁移的老系统。'),
  p('实现：iframe（隔离最好，但通信、弹窗、路由同步体验差）；single-spa、qiankun 这类运行时加载子应用并做 JS 沙箱和样式隔离；Module Federation 在构建层共享模块；Web Components 封装。问题：样式和全局变量冲突、依赖重复加载、子应用通信、整体性能和调试复杂。团队规模不大时，模块化的单体前端通常更简单。')]},
 {id:'fe-q-design-component',section:'项目实战',title:'如何设计一个通用组件（比如 Select 下拉框）？',blocks:[
  p('先定 API：受控和非受控两种用法（value / defaultValue + onChange）；选项数据结构；单选、多选、搜索、禁用、加载中、空状态等能力；用插槽或 render 函数支持自定义选项渲染；暴露必要的 ref 方法。'),
  p('再考虑细节：键盘操作（上下选择、回车确认、Esc 关闭）和 ARIA 角色；弹层用 Portal 挂到 body，处理滚动和边缘位置翻转；大量选项用虚拟滚动；样式可通过 CSS 变量定制；写单元测试和交互测试，配文档和示例。')]},
];
