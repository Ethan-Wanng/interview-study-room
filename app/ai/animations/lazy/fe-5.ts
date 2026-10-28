import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 5 集：浏览器印刷厂和组件工厂（渲染流水线、重排重绘与合成、长任务、Web Worker、Service Worker；组件与数据流、虚拟 DOM 与 key、Hooks 规则、useEffect、渲染优化、Vue 响应式、状态管理、CSR/SSR/SSG）。
export const feLazy5:LazyEpisode={id:'lazy-fe-5',subject:'frontend',tier:2,levels:['fe-browser','fe-react'],icon:'⚛️',title:'浏览器印刷厂，和一座组件工厂',summary:'先参观浏览器把代码印成画面的流水线，弄懂重排、重绘和合成；再走进 React 和 Vue 的组件工厂，看虚拟 DOM、key、Hooks 和响应式怎样让界面跟着数据变。',beats:[
 {say:'书店官网的商品页越来越复杂，滚动起来一卡一卡的。小芽问老冯：浏览器到底是怎么把我写的代码变成屏幕上的画面的？老冯说：走，带你参观一下浏览器的印刷厂。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('press','🖨️','浏览器印刷厂',460,90,{kind:'item',tone:'primary'})]},
 {say:'第一道工序，排字。浏览器一边下载 HTML，一边把它解析成一棵 DOM 树；CSS 解析成另一棵 CSSOM 树。两棵树合在一起，变成一棵渲染树，只包含真正要显示的东西，display: none 的元素不在里面。',add:[A('tree','🌲','DOM + CSSOM → 渲染树',460,200,{kind:'tag'})]},
 {say:'第二道工序，排版，也叫布局：算出每个元素在屏幕上的位置和大小。第三道工序，上色，也叫绘制：生成每一层的绘制指令。最后一道，合成：合成线程把画好的各层叠在一起，显示到屏幕上。',add:[A('steps','🧩','布局 → 绘制 → 合成',460,300,{kind:'tag',tone:'primary'})]},
 {say:'改动页面时，代价不一样。改一个元素的宽度、增删节点，位置和大小都变了，要从排版重新来过，叫重排，最贵。只改颜色，只需要重新上色，叫重绘。只改 transform 和 opacity，前两道工序都能跳过，只在合成阶段完成，最便宜，也最流畅。',drop:['tree'],add:[A('cost','💸','重排 > 重绘 > 只合成',460,200,{kind:'item',tone:'warm'})]},
 {say:'小芽的卡顿正是因为这个：她在一个循环里，每次先改一个元素的高度，再马上读它的 offsetHeight。每读一次，浏览器就被迫立刻重新排版，一千个元素就排了一千次。老冯让她先把要读的都读出来，再统一写入，只排版一次。动画也改成了 transform。',bubble:{who:'cost',text:'别读写交替'}},
 {say:'浏览器希望每秒画六十帧，每一帧大约只有十六毫秒。主线程上一个超过五十毫秒的长任务，就会让页面掉帧、点了没反应。很重的计算，比如给大文件算哈希，可以交给 Web Worker，在后台线程里运行，算完通过消息把结果交回来。Worker 不能操作 DOM。',drop:['cost','steps'],add:[A('worker','👷','Web Worker：后台算',460,200,{kind:'item',tone:'ok'})]},
 {say:'还有一种特别的 Worker，叫 Service Worker。它站在页面和网络之间，能拦截每一个请求，实现离线访问和缓存策略。可它也让小芽吃过亏：发布了新版本，用户却一直看到旧页面。因为新的 Service Worker 要等旧页面全部关闭才接管，所以要提示用户“有新版本，点击刷新”，HTML 也不要用缓存优先。',drop:['worker'],add:[A('sw','🧑‍✈️','Service Worker：注意更新',460,200,{kind:'item',tone:'warm'})]},
 {say:'参观完印刷厂，老冯说：手动操作 DOM 写一个复杂的页面，就像每次都自己去排字。所以现代前端用框架，比如 React 和 Vue，它们是组件工厂。我们把界面拆成一个个组件：搜索框、商品卡片、购物车，像搭积木一样组装起来。',drop:['sw','press'],add:[A('factory','🏭','组件工厂',460,90,{kind:'item',tone:'primary'})]},
 {say:'组件之间的数据像水一样往下流：父组件通过 props 把数据传给子组件；子组件要通知父组件，就调用父组件传下来的回调函数，Vue 里叫 emit 事件。两个兄弟组件要共享数据，就把状态提升到它们共同的父组件。',add:[A('props','💧','props 向下，回调向上',460,210,{kind:'tag',tone:'ok'})]},
 {say:'状态一变，界面就要跟着变。React 的做法是：重新运行组件，生成一棵新的虚拟 DOM 树，它只是普通的 JavaScript 对象，像一张草稿；再和旧的草稿逐层比较，找出真正变化的地方，只把这些变化更新到真实的页面上。这个比较叫 diff。',drop:['props'],add:[A('vdom','📝','新旧虚拟树 diff',460,210,{kind:'item',tone:'primary'})]},
 {say:'列表渲染时，每一项要有一个 key，框架靠它认出“谁是谁”。小芽用数组下标当 key，结果在列表最前面插入一项后，所有的下标都变了，第一项输入框里填的内容，跑到了新插入的那一项里。改用数据自己的 id 当 key，问题就消失了。',sub:{vdom:'key 用稳定的 id'}},
 {say:'React 的 Hooks 有一条铁律：只能在组件的最顶层调用，不能写在 if 或者循环里。因为 React 是按照调用的顺序来记住每个 Hook 的状态的：第一个 useState 存在第一格，第二个存在第二格。某次渲染跳过了一个，后面的全都对不上号了。',drop:['vdom'],add:[A('hooks','🪝','Hooks 只在顶层调用',460,210,{kind:'item',tone:'warm'})]},
 {say:'useEffect 用来处理副作用，比如请求数据、订阅事件、开定时器。依赖数组要写全，用到的会变的值都要列进去，否则拿到的是旧的值。订阅和定时器一定要在返回的清理函数里取消，组件卸载、依赖变化时都会调用它。开发模式下 React 会故意挂载两次，帮你发现漏写的清理。',drop:['hooks'],add:[A('effect','🧹','依赖写全 · 返回清理函数',460,210,{kind:'item',tone:'primary'})]},
 {say:'商品页每输入一个字，下面那个很重的图表就重新渲染一次。小芽先用 Profiler 找到了它，再用 React.memo 包住图表，props 没变就跳过渲染；传给它的回调用 useCallback 保持引用不变。最根本的办法，是把输入框的状态放进它自己的小组件里，图表根本不会被牵连。',drop:['effect'],add:[A('memo','🧠','memo · useCallback · 状态下放',460,210,{kind:'tag',tone:'ok'})]},
 {say:'Vue 走的是另一条路，叫响应式。用 Proxy 把数据包起来：渲染时读到了哪个属性，就把“这个组件”登记为它的依赖；属性被修改时，只通知登记过的那些地方更新。Vue 2 用的是 defineProperty，检测不到新增的属性和用下标修改数组，Vue 3 的 Proxy 都能拦截。',drop:['memo'],add:[A('vue','🪞','Vue：读时登记，改时通知',460,210,{kind:'item',tone:'primary'})]},
 {say:'状态放在哪里，也要分类。商品列表这种来自服务器的数据，交给 React Query、SWR 这类工具管理缓存和刷新；筛选条件和页码放在网址里，刷新和分享都不丢；只有登录用户、购物车这种真正跨页面共享的，才放进全局的状态仓库。',drop:['vue'],add:[A('state','🗃️','服务端数据 · URL · 全局仓库',460,210,{kind:'tag'})]},
 {say:'最后，书店官网要被搜索引擎收录。纯客户端渲染时，服务器只返回一个空壳，浏览器下载完 JS 才画出内容，搜索引擎和用户都要等。服务端渲染每次请求都在服务器上生成完整的 HTML，首屏快、利于搜索，再在浏览器里“水合”绑上交互；静态生成在构建时就把页面做好，放到 CDN 上，最快也最省。',drop:['state'],add:[A('ssr','🍳','CSR · SSR · SSG',460,210,{kind:'item',tone:'ok'})]},
 {say:'水合有一个常见的坑：服务端和浏览器第一次渲染的结果不一样，比如直接用了当前时间或随机数，控制台就会报水合不匹配。只在浏览器里才有的东西，要放到 useEffect 里，挂载之后再渲染。Next.js、Nuxt 这类框架可以按页面选择不同的渲染方式。',bubble:{who:'ssr',text:'两边第一次要一致'}},
 {say:'商品页终于流畅了，搜索引擎也能收录了。小芽在笔记里写下：浏览器的流水线是排字、排版、上色、合成，动画只动 transform；组件数据向下流，diff 靠 key 认人，Hooks 只在顶层，effect 记得清理；Vue 读时登记改时通知；要 SEO 就用 SSR 或 SSG。',drop:['ssr','factory'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['渲染：DOM/CSSOM → 布局 → 绘制 → 合成；重排最贵，动画用 transform','框架：diff + 稳定 key，Hooks 顶层调用，effect 要清理；Vue 依赖收集；SSR 首屏快']},
]};
