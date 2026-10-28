import {A,type Story} from '../story';

// 前端面试题动画（九）：构建工具、Tree Shaking、代码分割、Web Vitals、首屏优化、虚拟列表。
export const feI:Record<string,Story>={
 'fe-q-bundler':{title:'Vite 开发为什么快',beats:[
  {say:'Webpack 开发时要先把整个项目打成一个包才能启动。项目越大，等得越久。',add:[A('wp','📦','Webpack：先全部打包',150,80,{kind:'item',tone:'warm'})],sub:{wp:'启动 60 秒'}},
  {say:'Vite 不先打包：浏览器原生支持 ES Module，请求到哪个文件，Vite 就即时编译哪个。',add:[A('vt','⚡','Vite：按需编译',490,80,{kind:'item',tone:'ok'})],sub:{vt:'启动 1 秒'}},
  {say:'第三方依赖用 esbuild 预构建一次；改了一个文件，热更新只替换这一个模块，速度和项目大小无关。',add:[A('hmr','🔥','HMR 只换一个模块',490,230,{kind:'tag',tone:'ok'})],send:[{from:'vt',to:'hmr'}]},
  {say:'上线时 Vite 仍然会打包，因为生产环境大量零散的模块请求太慢。',add:[A('prod','🏭','生产构建：仍要打包',150,230,{kind:'tag'})]},
  {say:'记住区别。',memo:['Webpack 开发也要先打包','Vite 开发用原生 ESM 按需编译']},
 ]},
 'fe-q-tree-shaking':{title:'Tree Shaking：摇掉没用的代码',beats:[
  {say:'工具库 utils 导出了 50 个函数，页面只用了其中 2 个。',add:[A('lib','🌳','utils：50 个导出',150,170,{kind:'item',tone:'primary'}),A('app','📄','页面只用 2 个',490,170,{kind:'item'})],send:[{from:'lib',to:'app',text:'import { a, b }'}]},
  {say:'ES Module 的 import 是静态的，打包工具能分析出哪些导出没被用到，把它们删掉，包小了很多。',add:[A('shake','🍂','删掉 48 个',150,300,{kind:'tag',tone:'ok'})]},
  {say:'但如果库是 CommonJS，或者模块顶层有副作用（修改全局变量、引入 CSS），打包工具不敢删。',add:[A('no','⚠️','CJS · 有副作用',490,300,{kind:'tag',tone:'warm'})]},
  {say:'在 package.json 用 sideEffects 声明哪些文件无副作用；按需从 lodash-es 导入，而不是整个 lodash。',bubble:{who:'app',text:'包小了一大截'}},
  {say:'记住条件。',memo:['依赖 ESM 静态结构','CJS 和副作用会让它失效']},
 ]},
 'fe-q-code-split':{title:'代码分割：用到哪页加载哪页',beats:[
  {say:'所有页面打成一个 3MB 的大包，用户只看首页也要全部下载。',add:[A('big','📦','main.js 3MB',320,70,{kind:'item',tone:'bad'})]},
  {say:'按路由分割：每个页面一个 chunk，首页只下载自己的代码。',drop:['big'],add:[A('home','🏠','首页 chunk',150,170,{kind:'tag',tone:'ok'}),A('admin','🛠️','后台 chunk',490,170,{kind:'tag'})]},
  {say:'富文本编辑器、图表这种又大又不常用的组件，用 import() 和 React.lazy 等到真正需要时再加载。',add:[A('lazy','💤','lazy(() => import())',320,280,{kind:'tag',tone:'primary'})]},
  {say:'用户很可能马上要去的页面，可以空闲时 prefetch 预加载。分得太碎会产生大量小请求，用打包分析工具检查。',tone:{admin:'ok'},sub:{admin:'空闲时预加载'}},
  {say:'记住代码分割。',memo:['按路由和大组件拆分','import() 按需加载，必要时预加载']},
 ]},
 'fe-q-web-vitals':{title:'三个核心体验指标',beats:[
  {say:'LCP：页面最大的图片或文字块出现的时间，目标 2.5 秒以内。首屏大图要预加载、压缩，服务器响应要快。',add:[A('lcp','🖼️','LCP ≤ 2.5s',110,170,{kind:'item',tone:'primary'})]},
  {say:'INP：用户点击后，界面多久给出反馈，目标 200 毫秒以内。拆分长任务，重计算放 Worker。',add:[A('inp','👆','INP ≤ 200ms',320,170,{kind:'item',tone:'primary'})]},
  {say:'CLS：页面元素意外跳动的程度，目标 0.1 以下。图片和广告位提前预留尺寸，不要在内容上方突然插入东西。',add:[A('cls','📐','CLS ≤ 0.1',530,170,{kind:'item',tone:'primary'})]},
  {say:'用 Lighthouse 做实验室测试，用真实用户监控（RUM）看线上数据，两者结合。',add:[A('rum','📈','Lighthouse + RUM',320,300,{kind:'tag',tone:'ok'})],tone:{lcp:'ok',inp:'ok',cls:'ok'}},
  {say:'记住三个指标。',memo:['LCP 加载、INP 交互、CLS 稳定','实验室 + 真实用户数据']},
 ]},
 'fe-q-first-screen':{title:'首屏 6 秒：一步步找原因',beats:[
  {say:'用户反馈首页要 6 秒才显示。先别猜，打开 Network 和 Performance 面板测一测。',add:[A('page','🐢','首屏 6 秒',320,70,{kind:'item',tone:'bad'})]},
  {say:'发现：JS 包 2MB，主线程忙着解析执行；首屏大图 3MB，没有压缩。',add:[A('js','📦','JS 2MB',150,200,{kind:'tag',tone:'bad'}),A('img','🖼️','图片 3MB',490,200,{kind:'tag',tone:'bad'})]},
  {say:'对症下药：路由分割、删掉没用的依赖，JS 降到 400KB；图片转 WebP、按尺寸输出，再预加载。',tone:{js:'ok',img:'ok'},sub:{js:'400KB',img:'200KB'}},
  {say:'再加上 CDN、长期缓存和骨架屏。复测首屏 1.8 秒，并设置性能预算，防止以后又变慢。',tone:{page:'ok'},sub:{page:'1.8 秒'},add:[A('budget','📏','性能预算',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住优化流程。',memo:['先测量，找到真正的瓶颈','对症优化，复测并设预算']},
 ]},
 'fe-q-virtual-list':{title:'虚拟列表：10 万条只渲染 20 条',beats:[
  {say:'直接渲染 10 万行，页面生成 10 万个 DOM 节点，滚动卡成幻灯片。',add:[A('all','🧱','10 万个节点',320,70,{kind:'item',tone:'bad'})]},
  {say:'虚拟列表：只渲染可视区域能看到的 20 行，加上下各几行缓冲。',drop:['all'],add:[A('view','🪟','可视区域：20 行',320,170,{kind:'item',tone:'ok'})]},
  {say:'用一个高度等于“总行数 × 行高”的占位元素撑出滚动条，滚动时根据 scrollTop 算出该显示第几行到第几行。',add:[A('ph','📏','占位高度撑滚动条',120,300,{kind:'tag',tone:'primary'}),A('calc','🧮','start = scrollTop / 行高',520,300,{kind:'tag',tone:'primary'})]},
  {say:'行高不固定就先估算，渲染后测量真实高度再修正。可以直接用 react-window、TanStack Virtual。',bubble:{who:'view',text:'滚起来很顺'}},
  {say:'记住虚拟列表。',memo:['只渲染可见的几十行','占位撑高度，按滚动位置计算']},
 ]},
};
