import type {FeInterviewQuestion} from './types';
const p=(text:string)=>({type:'text' as const,text}),c=(text:string)=>({type:'code' as const,text});

// 前端面试题（一）：HTML 与 CSS。
export const feHtmlCss:FeInterviewQuestion[]=[
 {id:'fe-q-semantic',section:'HTML 与 CSS',title:'什么是 HTML 语义化？有什么好处？',blocks:[
  p('语义化是用能表达内容含义的标签来组织页面：页眉用 header，导航用 nav，主要内容用 main，独立文章用 article，侧栏用 aside，页脚用 footer，标题按层级用 h1～h6，按钮用 button 而不是给 div 绑点击。'),
  p('好处：屏幕阅读器等辅助技术能理解页面结构，键盘也能正常操作（可访问性）；搜索引擎更容易理解内容（SEO）；代码结构清晰、好维护；浏览器自带的行为（表单提交、按钮聚焦）可以直接复用。')]},
 {id:'fe-q-script-defer',section:'HTML 与 CSS',title:'script 标签的 defer 和 async 有什么区别？',blocks:[
  p('普通 script：HTML 解析遇到它就暂停，下载并执行完脚本才继续解析，会阻塞页面。async：下载和 HTML 解析并行，下载完立刻执行（此时会打断解析），多个 async 脚本谁先下载完谁先执行，顺序不确定。defer：下载并行，等 HTML 解析完成后、DOMContentLoaded 之前，按书写顺序依次执行。'),
  p('选择：依赖 DOM、彼此有顺序要求的业务脚本用 defer；独立的第三方脚本（统计、广告）用 async。type="module" 的脚本默认就是 defer 行为。'),
  c('<script src="analytics.js" async></script>\n<script src="vendor.js" defer></script>\n<script src="app.js" defer></script> <!-- 一定在 vendor.js 之后执行 -->')]},
 {id:'fe-q-box-model',section:'HTML 与 CSS',title:'说说 CSS 盒模型，box-sizing 有什么作用？',blocks:[
  p('每个元素都是一个盒子，由内到外是 content、padding、border、margin。标准盒模型（content-box）下，width 只指内容宽度，实际占用宽度 = width + 左右 padding + 左右 border。'),
  p('box-sizing: border-box 时，width 包含 content、padding 和 border，设置 width: 200px 就真的占 200px，布局更好算，所以很多项目全局设置 *, *::before, *::after { box-sizing: border-box; }。margin 不计入 width；相邻块级元素的垂直 margin 会发生合并。')]},
 {id:'fe-q-bfc',section:'HTML 与 CSS',title:'什么是 BFC？怎么触发？能解决什么问题？',blocks:[
  p('BFC（块级格式化上下文）是一块独立的布局区域，内部元素的布局不会影响外部。触发方式：overflow 不为 visible、display: flow-root、float、position: absolute/fixed、display: inline-block / flex 项 / grid 项等。推荐用 display: flow-root，副作用最小。'),
  p('能解决：1）父元素包含浮动子元素，避免高度塌陷；2）阻止相邻元素的垂直 margin 合并；3）阻止元素被浮动元素覆盖，实现自适应两栏布局。')]},
 {id:'fe-q-flex',section:'HTML 与 CSS',title:'Flex 布局的常用属性有哪些？flex: 1 是什么意思？',blocks:[
  p('容器属性：flex-direction（主轴方向）、justify-content（主轴对齐）、align-items（交叉轴对齐）、flex-wrap（是否换行）、gap（间距）。子项属性：flex-grow（剩余空间分配比例）、flex-shrink（空间不足时的收缩比例）、flex-basis（初始大小）、align-self、order。'),
  p('flex: 1 等于 flex: 1 1 0%：可以放大、可以缩小、初始大小为 0，于是多个 flex: 1 的子项平分剩余空间。注意子项默认 min-width: auto，内容太长时不会缩小到比内容窄，需要 min-width: 0 才能正常省略号截断。'),
  c('.row { display: flex; gap: 12px; align-items: center; }\n.row .grow { flex: 1; min-width: 0; }  /* 占满剩余空间，可以截断 */')]},
 {id:'fe-q-center',section:'HTML 与 CSS',title:'如何让一个元素水平垂直居中？',blocks:[
  p('最常用：父元素 display: flex; justify-content: center; align-items: center;，或者 display: grid; place-items: center;。不知道子元素尺寸也适用。'),
  p('其他方式：绝对定位 + transform（top: 50%; left: 50%; transform: translate(-50%, -50%)）；绝对定位 + inset: 0 + margin: auto（需要子元素有宽高）；单行文字可以用 line-height 等于高度、text-align: center。'),
  c('.parent { display: grid; place-items: center; }')]},
 {id:'fe-q-specificity',section:'HTML 与 CSS',title:'CSS 选择器优先级是怎么计算的？',blocks:[
  p('优先级按 (内联样式, ID 数, 类/属性/伪类数, 元素/伪元素数) 依次比较：内联 style 最高，然后 #id，再是 .class、[attr]、:hover，最后是 div、::before。通配符 * 和组合符不加分；:where() 的权重为 0，:is()、:not() 取参数里最高的。'),
  p('优先级相同时，后写的覆盖先写的。!important 会跳出普通比较，应尽量少用。现代 CSS 还有层叠层 @layer：未分层的样式优先于分层样式，后声明的层优先于先声明的层，适合管理第三方样式和组件样式。')]},
 {id:'fe-q-position',section:'HTML 与 CSS',title:'position 的几种取值有什么区别？',blocks:[
  p('static：默认，正常文档流。relative：仍占原位置，相对自己偏移，常用作绝对定位子元素的参照。absolute：脱离文档流，相对最近的“非 static 定位祖先”定位。fixed：相对视口定位，滚动时不动（祖先有 transform 时会改为相对该祖先）。sticky：在滚动到阈值前是 relative，之后像 fixed 一样吸附，作用范围限制在父容器内。'),
  p('sticky 不生效的常见原因：没设置 top 等阈值、父元素 overflow: hidden、父容器高度不够。')]},
 {id:'fe-q-zindex',section:'HTML 与 CSS',title:'z-index 为什么有时不生效？什么是层叠上下文？',blocks:[
  p('z-index 只在同一个层叠上下文里比较。层叠上下文由根元素、position 非 static 且 z-index 不为 auto、opacity < 1、transform / filter 不为 none、isolation: isolate、flex/grid 子项设置了 z-index 等创建。'),
  p('典型问题：弹窗 z-index: 9999 仍被盖住，是因为它所在的父元素创建了层叠上下文，且父元素整体层级低于另一个区域。解决：把弹窗通过 Portal 挂到 body 下，或调整父级的层叠上下文，而不是无限加大数字。')]},
 {id:'fe-q-reflow',section:'HTML 与 CSS',title:'什么是重排（回流）和重绘？如何减少？',blocks:[
  p('重排：元素的几何信息（尺寸、位置）变化，浏览器要重新计算布局，比如改 width、增删 DOM、读取 offsetHeight 强制同步布局。重绘：只是外观变化（颜色、背景），不影响布局。重排一定会导致重绘，代价更大。'),
  p('减少方法：批量修改 DOM（DocumentFragment、一次性修改 class）；避免“读写交替”导致的强制同步布局，先统一读再统一写；动画优先用 transform 和 opacity，它们可以只在合成阶段完成；长列表用虚拟滚动；对频繁变化的元素用 will-change 提示，但不要滥用。')]},
 {id:'fe-q-responsive',section:'HTML 与 CSS',title:'如何做响应式布局？rem、em、vw 有什么区别？',blocks:[
  p('响应式：设置 <meta name="viewport" content="width=device-width, initial-scale=1">；用 flex / grid 和百分比做流式布局；用媒体查询 @media (min-width: 768px) 在断点处调整；图片用 max-width: 100% 和 srcset；组件级适配可以用容器查询 @container。'),
  p('单位：em 相对当前元素的字体大小（嵌套时会层层叠加）；rem 相对根元素 html 的字体大小，适合统一缩放；vw / vh 相对视口宽高的 1%，移动端 100vh 会被地址栏影响，可用 dvh；clamp(最小, 首选, 最大) 可以让字号在范围内随视口变化。')]},
 {id:'fe-q-grid',section:'HTML 与 CSS',title:'Grid 布局和 Flex 布局怎么选？',blocks:[
  p('Flex 是一维布局：沿一条主轴排列，适合导航栏、按钮组、列表项内部这类“一行或一列”的排列。Grid 是二维布局：同时控制行和列，适合整体页面框架、卡片网格、需要对齐行列的表单。'),
  p('常见写法：grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) 自动按宽度换行的卡片网格；grid-template-areas 用命名区域描述页面结构。两者经常配合：Grid 搭整体框架，Flex 排列框架内部的元素。'),
  c('.cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }')]},
 {id:'fe-q-hide',section:'HTML 与 CSS',title:'display: none、visibility: hidden 和 opacity: 0 有什么区别？',blocks:[
  p('display: none：元素不渲染、不占空间，修改会引起重排，子元素也无法显示，屏幕阅读器读不到。visibility: hidden：不可见但仍占位置，不响应点击，子元素可以设置 visibility: visible 重新显示。opacity: 0：完全透明但仍占位置、仍能点击和聚焦，适合做淡入淡出动画。'),
  p('只想对视觉隐藏、但让屏幕阅读器能读到的文字，用常见的 .sr-only 写法（1px 大小、clip 裁剪），而不是 display: none。')]},
 {id:'fe-q-a11y',section:'HTML 与 CSS',title:'前端如何做好可访问性（a11y）？',blocks:[
  p('先用正确的原生元素：可点击的用 button、跳转用 a、表单控件配 label；图片写有意义的 alt，装饰图 alt 为空；标题层级连续。原生元素自带键盘操作和语义，比 div + ARIA 可靠。'),
  p('保证键盘可用：Tab 顺序合理、焦点样式可见、弹窗打开时焦点进入并在关闭后返回。颜色对比度足够，不只用颜色传达信息。确有必要时才用 ARIA（如 aria-expanded、aria-live）。用 Lighthouse、axe 检查，并亲自用键盘和读屏软件走一遍。')]},
 {id:'fe-q-css-modules',section:'HTML 与 CSS',title:'大型项目如何避免 CSS 样式冲突？',blocks:[
  p('全局 CSS 的类名会互相覆盖。常见方案：BEM 命名约定（block__element--modifier）；CSS Modules 在构建时把类名改成唯一的哈希；CSS-in-JS（styled-components 等）把样式和组件绑定；Tailwind 这类原子化 CSS 用工具类组合，几乎不写自定义类名；Vue 的 scoped 样式；Web Components 的 Shadow DOM 真正隔离。'),
  p('再配合 @layer 管理第三方库、基础样式和组件样式的优先级，用设计令牌（CSS 变量）统一颜色和间距。选型看团队习惯、运行时开销和是否需要服务端渲染。')]},
];
