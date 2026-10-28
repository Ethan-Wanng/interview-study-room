import type {AiLevel} from '../journey';

// 前端入门（二）：布局、JavaScript 基础。
export const feLayout:AiLevel={id:'fe-layout',title:'CSS 布局：Flex、Grid 与响应式',summary:'排成一行、排成网格、适配不同屏幕',lessons:[
 {title:'Flex：一维排列',body:'容器 display: flex 后，子元素沿主轴排列。justify-content 控制主轴对齐（start、center、space-between），align-items 控制交叉轴对齐，gap 设置间距，flex-wrap 允许换行。子项 flex: 1 占满剩余空间，配合 min-width: 0 才能截断长文字。',code:'.toolbar { display: flex; align-items: center; gap: 8px; }\n.toolbar .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'},
 {title:'Grid：二维网格',body:'display: grid 同时规划行和列。grid-template-columns: repeat(3, 1fr) 三等分；repeat(auto-fill, minmax(220px, 1fr)) 根据宽度自动换行；grid-template-areas 给区域命名搭页面框架。整体框架用 Grid，内部排列用 Flex。'},
 {title:'居中和 BFC',body:'水平垂直居中：display: grid; place-items: center，或 flex 加两个 center。BFC 是独立的布局区域，display: flow-root 可以创建，用来包住浮动子元素、阻止 margin 合并。'},
 {title:'响应式',body:'先写好 viewport meta，再用流式布局 + 媒体查询在断点调整。rem 跟随根字号，vw 跟随视口宽度，clamp(最小, 首选, 最大) 让字号平滑变化。图片设置 max-width: 100%。',code:'.grid { display: grid; gap: 16px; grid-template-columns: 1fr; }\n@media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }\nh1 { font-size: clamp(24px, 4vw, 40px); }'},
],quiz:[
 {id:'fe-layout-1',q:'导航栏里 logo 在左、菜单在右，最简单的写法是？',options:['display: flex; justify-content: space-between','float 两个元素','position: absolute','table 布局'],answer:0,explain:'space-between 把两端元素推到两边。',interview:'fe-q-flex'},
 {id:'fe-layout-2',q:'flex: 1 等价于？',options:['flex: 1 0 auto','flex: 1 1 0%','flex: 0 1 auto','width: 100%'],answer:1,explain:'可放大、可缩小、初始大小为 0，多个 flex: 1 平分剩余空间。',interview:'fe-q-flex'},
 {id:'fe-layout-3',type:'judge',q:'flex 子项里的长文字设置了 text-overflow: ellipsis 却不截断，往往需要给子项加 min-width: 0。',answer:true,explain:'flex 子项默认 min-width: auto，不会比内容更窄。',interview:'fe-q-flex'},
 {id:'fe-layout-4',q:'做一个“卡片宽度不小于 220px、根据屏幕自动决定列数”的网格，用？',options:['grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))','flex-direction: column','float: left','display: inline'],answer:0,explain:'auto-fill + minmax 自动计算列数。',interview:'fe-q-grid'},
 {id:'fe-layout-5',type:'multi',q:'下面哪些写法能让子元素在父元素中水平垂直居中？（多选）',options:['父元素 display: grid; place-items: center','父元素 display: flex; justify-content: center; align-items: center','子元素 text-align: center','子元素 absolute + top/left 50% + translate(-50%, -50%)'],answers:[0,1,3],explain:'text-align 只能让行内内容水平居中。',interview:'fe-q-center'},
 {id:'fe-layout-6',q:'父元素里的子元素都浮动了，父元素高度变成 0。最推荐的修复是？',options:['给父元素设置固定高度','给父元素 display: flow-root 创建 BFC','删除父元素','给子元素 margin'],answer:1,explain:'BFC 会包含浮动子元素；flow-root 没有 overflow 裁剪的副作用。',interview:'fe-q-bfc'},
 {id:'fe-layout-7',type:'fill',q:'1rem 等于 ____ 元素的字体大小。',accepted:['html','根','根元素','html 根'],explain:'rem 相对根元素 html；em 相对当前元素。',interview:'fe-q-responsive'},
 {id:'fe-layout-8',q:'屏幕宽度大于等于 768px 时改成两栏，媒体查询怎么写？',options:['@media (max-width: 768px)','@media (min-width: 768px)','@screen 768','@width >= 768'],answer:1,explain:'移动优先：默认单栏，min-width 断点之上增强。',interview:'fe-q-responsive'},
 {id:'fe-layout-9',type:'judge',q:'Grid 只能做页面整体框架，不能和 Flex 一起使用。',answer:false,explain:'两者常常配合：Grid 搭框架，Flex 排内部。',interview:'fe-q-grid'},
 {id:'fe-layout-10',type:'short',q:'手机上 height: 100vh 的全屏页面，底部内容被浏览器地址栏挡住了，怎么解决？',reference:'移动端浏览器的 100vh 按地址栏收起时的最大视口计算，地址栏展开时就会超出屏幕。可以改用动态视口单位 100dvh（或 svh / lvh 按需选择），或者用 min-height 配合 flex 布局让内容自然撑开；老浏览器可用 JS 读取 window.innerHeight 设置 CSS 变量作为兜底。',points:['100vh 按最大视口计算','改用 100dvh 等动态视口单位','或用 min-height + 弹性布局','老浏览器用 innerHeight 兜底'],explain:'移动端视口会随地址栏变化。',interview:'fe-q-responsive'},
]};

export const feJs:AiLevel={id:'fe-js',title:'JavaScript 基础：变量、类型与判断',summary:'let/const、七种原始类型、== 和 ===、条件与循环',lessons:[
 {title:'变量：let 和 const',body:'const 声明不会被重新赋值的变量，let 声明会变化的变量，优先用 const。var 是旧写法：函数作用域、会提升，容易出错，新代码不要用。let/const 是块级作用域，在声明前访问会报错（暂时性死区）。',code:"const name = '小明';\nlet count = 0;\ncount = count + 1;\n// name = '小红'; // 报错：const 不能重新赋值"},
 {title:'数据类型',body:'原始类型：string、number、boolean、undefined、null、bigint、symbol；其他都是对象（object、array、function）。typeof 判断原始类型，但 typeof null 是 "object"；数组用 Array.isArray。number 是浮点数，0.1 + 0.2 不等于 0.3。'},
 {title:'比较和转换',body:'=== 严格相等，不转换类型；== 会先转换类型，"0" == false 为 true，容易出错，统一用 ===。假值只有 false、0、""、null、undefined、NaN（和 0n），其余都是真值，空数组 [] 也是真值。Number("12") 转数字，String(12) 转字符串。'},
 {title:'条件与循环',body:'if / else、switch 做分支；for、for...of（遍历数组的值）、while 做循环。可选链 a?.b 在 a 为空时返回 undefined 而不报错；空值合并 x ?? 默认值 只在 x 是 null 或 undefined 时用默认值，比 || 更精确（0 和空字符串不会被替换）。',code:"for (const item of [1, 2, 3]) console.log(item);\nconst city = user?.address?.city ?? '未知';"},
],quiz:[
 {id:'fe-js-1',q:'一个变量声明后不会再被重新赋值，应该用？',options:['var','let','const','不写关键字'],answer:2,explain:'优先 const，需要重新赋值才用 let。',interview:'fe-q-hoisting'},
 {id:'fe-js-2',q:'typeof null 的结果是？',options:['"null"','"undefined"','"object"','"number"'],answer:2,explain:'这是语言早期留下的 bug。',interview:'fe-q-types'},
 {id:'fe-js-3',type:'judge',q:'"0" == false 的结果是 true，而 "0" === false 的结果是 false。',answer:true,explain:'== 会把两边都转换成数字 0 再比较。',interview:'fe-q-equality'},
 {id:'fe-js-4',type:'multi',q:'下面哪些值是假值（在 if 里会被当成 false）？（多选）',options:['0','""','[]','null'],answers:[0,1,3],explain:'空数组和空对象都是真值。'},
 {id:'fe-js-5',q:'0.1 + 0.2 === 0.3 的结果是？',options:['true','false','报错','undefined'],answer:1,explain:'浮点数精度问题，结果是 0.30000000000000004；比较时用误差范围或转成整数计算。'},
 {id:'fe-js-6',q:'count 为 0 时，count || 10 和 count ?? 10 分别是？',options:['10 和 10','0 和 0','10 和 0','0 和 10'],answer:2,explain:'|| 遇到假值就用右边；?? 只在 null / undefined 时用右边。'},
 {id:'fe-js-7',type:'fill',q:'判断一个值是不是数组，推荐用 Array.____(x)。',accepted:['isArray'],explain:'typeof [] 是 "object"，无法区分。',interview:'fe-q-types'},
 {id:'fe-js-8',q:'下面代码输出什么？',code:"console.log(a);\nlet a = 1;",options:['undefined','1','ReferenceError','null'],answer:2,explain:'let 在声明前处于暂时性死区，访问会报错；换成 var 才会输出 undefined。',interview:'fe-q-hoisting'},
 {id:'fe-js-9',type:'judge',q:'user?.address?.city 在 user 为 undefined 时会抛出错误。',answer:false,explain:'可选链遇到 null / undefined 直接返回 undefined。'},
 {id:'fe-js-10',type:'short',q:'为什么团队规范通常要求用 === 而不是 ==？有没有例外？',reference:'== 会按复杂规则做隐式类型转换，比如 "" == 0、"0" == false、[] == false 都是 true，读代码的人很难判断结果，容易产生隐蔽的 bug。=== 不做转换，结果可预测。常见例外是 x == null，它同时匹配 null 和 undefined，写法简洁且语义清楚。',points:['== 隐式转换规则复杂','=== 结果可预测','例外：x == null 同时判断 null 和 undefined'],explain:'可预测比少打一个字符更重要。',interview:'fe-q-equality'},
]};
