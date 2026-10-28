import {A,type LessonStory} from './story';

// 前端开发动画课堂（一）：入门与进阶关卡。
export const feLessonsA:LessonStory[]=[
 ({id:'fe-an-html',level:'fe-html',kind:'basic',icon:'🧱',title:'网页的骨架、衣服和动作',summary:'HTML、CSS、JavaScript 各管什么。',beats:[
  {say:'盖一栋房子：HTML 是钢筋骨架，决定这里是标题、那里是段落、那里是按钮。',add:[A('html','🦴','HTML：结构',150,80,{kind:'item',tone:'primary'})]},
  {say:'CSS 是装修：颜色、字体、大小、位置，让骨架变得好看。',add:[A('css','🎨','CSS：样式',490,80,{kind:'item',tone:'primary'})]},
  {say:'JavaScript 是电线和开关：点一下按钮，弹出提示、提交表单、加载数据。',add:[A('js','⚡','JS：交互',320,210,{kind:'item',tone:'primary'})],send:[{from:'html',to:'js'},{from:'css',to:'js'}]},
  {say:'骨架要用对标签：导航用 nav，正文用 main，按钮用 button。读屏软件和搜索引擎都能看懂。',add:[A('sem','🏷️','语义化标签',150,320,{kind:'tag',tone:'ok'})]},
  {say:'脚本加上 defer，就不会挡住页面解析，等骨架搭好再执行。',add:[A('defer','⏳','script defer',490,320,{kind:'tag',tone:'ok'})]},
  {say:'记住网页三件套。',memo:['HTML 结构，CSS 样式，JS 交互','语义化标签，脚本用 defer']},
 ]}),
 ({id:'fe-an-css',level:'fe-css',kind:'basic',icon:'📦',title:'给盒子量尺寸、找位置',summary:'选择器优先级、盒模型和定位。',beats:[
  {say:'页面上每个元素都是一个盒子：内容、内边距、边框、外边距一层层包起来。',add:[A('box','📦','content',320,170,{kind:'item',tone:'primary'})],sub:{box:'padding · border · margin'}},
  {say:'设置 box-sizing: border-box，width 就包含内边距和边框，说 200px 就是 200px。',add:[A('bb','📐','border-box',150,60,{kind:'tag',tone:'ok'})]},
  {say:'三条规则都想给它上色：#id 胜过 .class，.class 胜过标签名；一样时后写的赢。',add:[A('sp','🏆','ID > 类 > 元素',490,60,{kind:'tag',tone:'warm'})]},
  {say:'想把一个角标放在卡片右上角：卡片 relative，角标 absolute 加 top 和 right。',add:[A('badge','🔴','absolute 角标',490,290,{kind:'tag',tone:'primary'})],send:[{from:'badge',to:'box',text:'以我为参照'}]},
  {say:'回到顶部按钮用 fixed，钉在屏幕上；吸顶的标题栏用 sticky。',add:[A('fx','📌','fixed · sticky',150,290,{kind:'tag',tone:'ok'})]},
  {say:'记住盒子的三件事。',memo:['border-box 好计算','优先级 ID > 类 > 元素；relative + absolute']},
 ]}),
 ({id:'fe-an-layout',level:'fe-layout',kind:'basic',icon:'🧩',title:'排版三板斧：Flex、Grid、媒体查询',summary:'一行排列、网格排列和响应式。',beats:[
  {say:'导航栏：logo、菜单、头像排成一行。容器 display: flex，justify-content: space-between 推到两端。',add:[A('logo','🅻','logo',110,70,{kind:'tag'}),A('menu','📋','菜单 flex: 1',320,70,{kind:'tag',tone:'primary'}),A('avatar','🙂','头像',530,70,{kind:'tag'})]},
  {say:'商品卡片墙：display: grid 加 repeat(auto-fill, minmax(220px, 1fr))，屏幕宽就多放几列。',add:[A('g1','🃏','卡片',200,190,{kind:'tag',tone:'ok'}),A('g2','🃏','卡片',320,190,{kind:'tag',tone:'ok'}),A('g3','🃏','卡片',440,190,{kind:'tag',tone:'ok'})]},
  {say:'弹窗居中：父元素 display: grid; place-items: center，一行搞定。',add:[A('center','🎯','place-items: center',320,290,{kind:'tag',tone:'primary'})]},
  {say:'手机上变成一列：媒体查询在 768px 断点切换列数，字号用 clamp 平滑变化。',tone:{g3:'quiet'},sub:{g1:'手机：一列'},bubble:{who:'center',text:'小屏也好看'}},
  {say:'记住三板斧。',memo:['一维用 Flex，二维用 Grid','媒体查询 + rem / clamp 做响应式']},
 ]}),
 ({id:'fe-an-js',level:'fe-js',kind:'basic',icon:'🔤',title:'变量和类型：给数据贴标签',summary:'const / let、类型判断和严格相等。',beats:[
  {say:'变量像一个贴了名字的盒子。不会换内容的用 const，会变的用 let，旧的 var 别再用了。',add:[A('c','📦','const name',150,80,{kind:'item',tone:'primary'}),A('l','📦','let count',490,80,{kind:'item'})]},
  {say:'盒子里可以放 7 种原始值：字符串、数字、布尔、undefined、null、bigint、symbol，其余都是对象。',add:[A('types','🔢','7 种原始类型 + 对象',320,190,{kind:'tag'})]},
  {say:'typeof 能判断大多数原始类型，但 typeof null 是 "object"，数组要用 Array.isArray。',add:[A('tp','❓','typeof null = object',150,300,{kind:'tag',tone:'warm'})]},
  {say:'比较用 ===：类型不同直接 false。== 会偷偷转换类型，"0" == false 竟然是 true。',add:[A('eq','✅','永远用 ===',490,300,{kind:'tag',tone:'ok'})]},
  {say:'空值合并 ?? 只在 null 和 undefined 时用默认值，0 和空字符串会被保留。',bubble:{who:'l',text:'count ?? 10'}},
  {say:'记住基础规则。',memo:['优先 const，需要变才用 let','用 === 比较，typeof null 是坑']},
 ]}),
 ({id:'fe-an-func',level:'fe-func',kind:'basic',icon:'🛠️',title:'购物车里的数组方法',summary:'filter、map、reduce 与浅拷贝。',beats:[
  {say:'购物车里有 5 件商品，其中 2 件没货了。',add:[A('cart','🛒','购物车：5 件',110,170,{kind:'item',tone:'primary'})]},
  {say:'filter 过滤出有货的 3 件，map 把它们变成价格数组，reduce 加起来得到总价。',add:[A('f','🔍','filter 有货',320,70,{kind:'tag'}),A('m','🔁','map 取价格',320,170,{kind:'tag'}),A('r','➕','reduce 求和',320,270,{kind:'tag',tone:'ok'})],send:[{from:'cart',to:'f'},{from:'f',to:'m'},{from:'m',to:'r'}]},
  {say:'它们都返回新数组，不改原来的购物车。push、sort、splice 才会修改原数组。',add:[A('total','💰','总价 ¥299',540,270,{kind:'item',tone:'ok'})],send:[{from:'r',to:'total'}]},
  {say:'复制购物车用 {...cart} 是浅拷贝：里面的商品对象还是同一个，改副本会改到原件。深拷贝用 structuredClone。',bubble:{who:'cart',text:'嵌套对象是共享的'}},
  {say:'记住数组和拷贝。',memo:['filter → map → reduce','展开是浅拷贝，深拷贝用 structuredClone']},
 ]}),
 ({id:'fe-an-dom',level:'fe-dom',kind:'basic',icon:'🖱️',title:'一次点击的旅程',summary:'事件捕获、冒泡和事件委托。',beats:[
  {say:'用户点了列表里的第 3 个删除按钮。事件先从 document 往下“捕获”到这个按钮。',add:[A('doc','📄','document',320,50,{kind:'item'}),A('ul','📋','ul 列表',320,150,{kind:'item',tone:'primary'}),A('btn','🗑️','第 3 个删除按钮',320,260,{kind:'tag',tone:'warm'})],send:[{from:'doc',to:'ul',text:'捕获'}]},
  {say:'到达目标后，再一路“冒泡”回去：按钮 → ul → document。',send:[{from:'btn',to:'ul',text:'冒泡'}]},
  {say:'所以不用给 1000 个按钮都绑监听，只在 ul 上绑一个，用 event.target.closest("li") 找到是哪一条——事件委托。',tone:{ul:'ok'},bubble:{who:'ul',text:'我一个人全管了'}},
  {say:'搜索框每敲一个字都触发 input 事件，用防抖：停下 300 毫秒才请求。',add:[A('db','⏱️','防抖 300ms',540,150,{kind:'tag',tone:'ok'})]},
  {say:'记住事件机制。',memo:['捕获 → 目标 → 冒泡','事件委托 + 防抖节流']},
 ]}),
 ({id:'fe-an-async',level:'fe-async',kind:'advanced',icon:'🔄',title:'餐厅里的事件循环',summary:'同步任务、微任务和宏任务。',beats:[
  {say:'餐厅只有一个服务员（主线程），一次只能做一件事。先把手头的同步任务做完：点单 1、点单 4。',add:[A('w','🧑‍🍳','服务员（主线程）',320,80,{tone:'primary'})],bubble:{who:'w',text:'1、4 搞定'}},
  {say:'“Promise.then”是加急小纸条，放进微任务篮；“setTimeout”是普通预约，放进宏任务队列。',add:[A('mi','⚡','微任务篮：3',150,240,{kind:'item',tone:'warm'}),A('ma','📮','宏任务队列：2',490,240,{kind:'item'})]},
  {say:'同步做完，服务员先把微任务篮清空：处理 3。',send:[{from:'mi',to:'w',text:'3',tone:'ok'}],tone:{mi:'ok'}},
  {say:'可能顺便刷新一下页面，再取一个宏任务：处理 2。所以输出 1 4 3 2。',send:[{from:'ma',to:'w',text:'2'}],tone:{ma:'ok'}},
  {say:'await 之后的代码也是微任务。两个互不依赖的请求要用 Promise.all 一起发，别排队等。',add:[A('all','🚀','Promise.all 并行',320,320,{kind:'tag',tone:'ok'})]},
  {say:'记住事件循环。',memo:['同步 → 微任务 → 渲染 → 宏任务','并行请求用 Promise.all']},
 ]}),
 ({id:'fe-an-scope',level:'fe-scope',kind:'advanced',icon:'🎒',title:'闭包、this 和原型链',summary:'函数的背包、调用者和寻物链。',beats:[
  {say:'闭包：内部函数离开外部函数后，还背着外部变量的小背包。计数器的 n 就这样被“私藏”起来。',add:[A('fn','🏃','next()',150,80,{tone:'primary'}),A('bag','🎒','背包：n = 2',150,230,{kind:'tag',tone:'primary'})],send:[{from:'bag',to:'fn'}]},
  {say:'this：谁调用就指向谁。user.say() 的 this 是 user；把方法单独拿出来调用，this 就丢了。',add:[A('user','🧑','user.say()',490,80,{kind:'item',tone:'ok'})],bubble:{who:'user',text:'this = 我'}},
  {say:'箭头函数没有自己的 this，用外层的，适合写回调。',add:[A('arrow','➡️','箭头函数：继承外层',490,200,{kind:'tag'})]},
  {say:'原型链：dog 身上找不到 bark，就去 Dog.prototype 找，再找不到去 Object.prototype，到 null 为止。',add:[A('chain','🔗','dog → Dog.prototype → Object.prototype',320,310,{kind:'tag',tone:'ok'})]},
  {say:'闭包和监听用完要释放，否则会内存泄漏。',tone:{bag:'warm'}},
  {say:'记住三个概念。',memo:['闭包记住外部变量，this 看调用方式','原型链逐级向上查找']},
 ]}),
];
