import type {AiLevel} from '../journey';

// 前端入门（一）：HTML 与网页基础。
export const feHtml:AiLevel={id:'fe-html',title:'HTML 与网页基础',summary:'网页由什么组成，常用标签、语义化和脚本加载',lessons:[
 {title:'网页的三件套',body:'一个网页由三部分组成：HTML 负责结构和内容（这里有标题、段落、图片），CSS 负责样式（颜色、大小、位置），JavaScript 负责交互（点击后发生什么）。浏览器下载这些文件，把它们变成你看到的页面。',code:'<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>我的第一个网页</title>\n</head>\n<body>\n  <h1>你好，前端</h1>\n  <p>这是一个段落。</p>\n</body>\n</html>'},
 {title:'常用标签',body:'标题 h1～h6，段落 p，链接 a（href 写地址），图片 img（src 写地址，alt 写描述），列表 ul/ol + li，表格 table，表单 form + input + label + button。块级元素（div、p、h1）独占一行；行内元素（span、a、strong）在一行里排列。'},
 {title:'语义化',body:'用能表达含义的标签组织页面：header 页眉、nav 导航、main 主要内容、article 文章、aside 侧栏、footer 页脚。点击用 button，跳转用 a。好处：读屏软件能理解结构，搜索引擎更懂内容，代码也更清楚。'},
 {title:'脚本放在哪里',body:'浏览器从上往下解析 HTML，遇到普通 script 会停下来下载并执行。所以脚本加 defer：下载不阻塞解析，等 HTML 解析完再按顺序执行；独立的统计脚本用 async，下载完就执行。CSS 用 link 放在 head 里。',code:'<link rel="stylesheet" href="style.css">\n<script src="app.js" defer></script>'},
],quiz:[
 {id:'fe-html-1',q:'网页中负责“点击按钮后弹出提示”的通常是？',options:['HTML 标签结构','CSS 样式规则','JavaScript 脚本','图片资源文件'],why:['HTML 负责页面的结构和内容，本身不会响应点击去执行逻辑。','CSS 负责外观和布局，可以改变样式，但不能执行“弹出提示”这样的逻辑。','','图片只是被展示的资源，不具备任何交互能力。'],answer:2,explain:'HTML 管结构，CSS 管样式，JavaScript 管交互。'},
 {id:'fe-html-2',q:'img 标签的 alt 属性有什么用？',options:['设置图片在页面上显示的宽和高','图片无法显示或读屏时提供文字描述','给图片加上一圈指定颜色的边框','让图片变成一个可以点击的链接'],why:['图片尺寸用 width、height 属性或 CSS 设置。','','边框属于样式，用 CSS 的 border 设置。','让图片可点击要用 a 标签包裹或绑定点击事件，alt 没有这个作用。'],answer:1,explain:'alt 对可访问性和图片加载失败都很重要。',interview:'fe-q-a11y'},
 {id:'fe-html-3',type:'multi',q:'下面哪些是语义化标签？（多选）',options:['nav','article','div','span'],why:['','','div 是没有语义的通用块级容器，只用于分组和布局。','span 是没有语义的通用行内容器，常用来包裹一段文字设置样式。'],answers:[0,1],explain:'nav 表示导航区域，article 表示一篇独立的内容；div 和 span 没有语义，只是通用容器。',interview:'fe-q-semantic'},
 {id:'fe-html-4',q:'页面上一个“提交”按钮，最合适的写法是？',options:['<div onclick="submit()">提交</div>','<button type="submit">提交</button>','<span onclick="submit()">提交</span>','<a href="#" onclick="submit()">提交</a>'],why:['div 不能获得键盘焦点，读屏软件也不知道它是按钮，需要额外补很多属性。','','span 和 div 一样没有按钮语义，也不能用键盘触发。','a 标签表示跳转链接，用它当按钮语义不对，href="#" 还会改变地址。'],answer:1,explain:'button 自带键盘操作、聚焦和语义。',interview:'fe-q-semantic'},
 {id:'fe-html-5',type:'judge',q:'span 和 a 是块级元素，默认会独占一行。',answer:false,explain:'它们是行内元素；div、p、h1 才是块级元素。'},
 {id:'fe-html-6',q:'<meta name="viewport" content="width=device-width"> 的作用是？',options:['设置网页在标签页上的标题','让移动端按设备宽度显示页面','引入外部的 CSS 样式文件','设置页面使用的字符编码'],why:['网页标题用 title 标签设置。','','引入样式文件用 link rel="stylesheet"。','字符编码用 <meta charset="utf-8"> 设置。'],answer:1,explain:'没有它，手机会按很宽的虚拟视口渲染，页面被缩得很小。'},
 {id:'fe-html-7',q:'业务脚本依赖页面 DOM，并且要按顺序执行，应该怎么写？',options:['<script src="a.js"> 放在 head 里','<script src="a.js" async>','<script src="a.js" defer>','<script src="a.js"> 放在 head 里并加 type'],why:['head 中的普通 script 会阻塞解析，执行时 DOM 还没有生成，取不到页面元素。','async 下载完立即执行，多个 async 脚本之间的执行顺序无法保证。','','type 只说明脚本类型，不改变加载和执行时机，仍会阻塞解析且取不到 DOM。'],answer:2,explain:'defer 不阻塞解析，解析完按书写顺序执行。',interview:'fe-q-script-defer'},
 {id:'fe-html-8',type:'fill',q:'链接标签 <a> 用属性 ____ 指定跳转地址。',accepted:['href'],explain:'例如 <a href="/about">关于</a>。'},
 {id:'fe-html-9',type:'judge',q:'多个 async 脚本会严格按照书写顺序执行。',answer:false,explain:'async 脚本谁先下载完谁先执行，顺序不确定。',interview:'fe-q-script-defer'},
 {id:'fe-html-10',type:'short',q:'为什么表单里的输入框要配合 <label>？',reference:'label 和输入框关联（for 指向 input 的 id，或把 input 包在 label 里）后：读屏软件会读出输入框的用途；点击文字也能聚焦输入框，点击区域更大，手机上更好点；语义更清楚。只用 placeholder 代替 label 不够，输入后提示就消失了。',points:['读屏软件能读出用途','点击文字即可聚焦，区域更大','placeholder 不能代替 label'],explain:'这是最基础也最常被忽略的可访问性细节。',interview:'fe-q-a11y'},
]};

export const feCss:AiLevel={id:'fe-css',title:'CSS 基础：选择器、盒模型与定位',summary:'选中元素、理解盒子的大小、把元素放到想要的位置',lessons:[
 {title:'选择器和优先级',body:'元素选择器 p、类选择器 .btn、ID 选择器 #main、属性选择器 [type="text"]、伪类 :hover。多条规则冲突时比优先级：内联样式 > ID > 类/属性/伪类 > 元素；相同时后写的覆盖先写的。尽量用类选择器，少用 ID 和 !important。'},
 {title:'盒模型',body:'每个元素都是盒子：content → padding → border → margin。默认 width 只算内容；box-sizing: border-box 让 width 包含 padding 和 border，更好计算。上下相邻的 margin 会合并。',code:'*, *::before, *::after { box-sizing: border-box; }\n.card { width: 300px; padding: 16px; border: 1px solid #ddd; margin-bottom: 12px; }'},
 {title:'定位',body:'relative 相对自身偏移、仍占原位；absolute 脱离文档流，相对最近的定位祖先；fixed 相对视口；sticky 滚动到阈值时吸附。z-index 控制叠放，但只在同一个层叠上下文里比较。'},
 {title:'隐藏元素和颜色单位',body:'display: none 不渲染不占位；visibility: hidden 占位不可见；opacity: 0 占位且仍可点击。颜色可以用 #3366ff、rgb()、hsl()；长度单位 px 固定，rem 相对根字号，% 相对父元素。'},
],quiz:[
 {id:'fe-css-1',q:'.title 和 #header 两个选择器都设置了颜色，作用在同一个元素上，谁生效？',options:['.title 生效','#header 生效','后写的那个生效','两个都不生效'],why:['类选择器的优先级低于 ID 选择器。','','只有优先级相同时，才由书写顺序决定。','两条规则都匹配这个元素，按优先级取其一，不会都失效。'],answer:1,explain:'ID 选择器优先级高于类选择器。',interview:'fe-q-specificity'},
 {id:'fe-css-2',q:'width: 200px; padding: 10px; border: 2px solid，标准盒模型（content-box）下元素实际宽度是？',options:['200px','220px','224px','212px'],why:['200px 只是内容区宽度，content-box 下内边距和边框要另外加上。','只加了左右内边距，漏掉了左右边框各 2px。','','只加了内边距的一侧或漏算了边框，计算不完整。'],answer:2,explain:'200 + 10×2 + 2×2 = 224。',interview:'fe-q-box-model'},
 {id:'fe-css-3',type:'judge',q:'设置 box-sizing: border-box 后，width 包含 padding 和 border。',answer:true,explain:'所以设置多宽就占多宽。',interview:'fe-q-box-model'},
 {id:'fe-css-4',q:'想让一个“回到顶部”按钮固定在屏幕右下角，滚动也不动，用？',options:['position: relative','position: absolute','position: fixed','position: static'],why:['relative 相对元素自身原来的位置偏移，会随页面一起滚动。','absolute 相对最近的定位祖先，页面滚动时会跟着内容移动。','','static 是默认值，不能用 top、right 等属性定位。'],answer:2,explain:'fixed 相对视口定位。',interview:'fe-q-position'},
 {id:'fe-css-5',q:'子元素 position: absolute，它会相对谁定位？',options:['始终相对 body 元素','最近的非 static 定位祖先','直接父元素，不论其定位方式','始终相对浏览器视口'],why:['只有当所有祖先都没有定位时，才会相对初始包含块（接近 body/html）定位。','','父元素是 static 时不会作为参照，会继续向上查找。','相对视口定位的是 position: fixed。'],answer:1,explain:'所以父元素常设置 position: relative 作为参照。',interview:'fe-q-position'},
 {id:'fe-css-6',type:'multi',q:'下面哪些方式隐藏的元素仍然占据空间？（多选）',options:['display: none','visibility: hidden','opacity: 0','transform: scale(0)'],why:['display: none 会让元素不参与布局，完全不占空间。','','',''],answers:[1,2,3],explain:'visibility: hidden、opacity: 0 和 transform: scale(0) 都只影响显示效果，元素仍在布局中占位；display: none 和从 DOM 删除则不占空间。',interview:'fe-q-hide'},
 {id:'fe-css-7',type:'fill',q:'鼠标悬停时改变按钮颜色，用伪类 :____。',accepted:['hover'],explain:'例如 .btn:hover { background: #2255dd; }'},
 {id:'fe-css-8',q:'弹窗的 z-index 设置成 9999，仍被另一个 z-index: 2 的区域盖住，最可能的原因是？',options:['浏览器对大数值的 z-index 有 bug','父元素创建了层级更低的层叠上下文','z-index 数值太大超出了上限','没有给 z-index 加 !important'],why:['这是规范规定的层叠行为，不是浏览器 bug。','','z-index 上限约为 21 亿，9999 远未超出。','这里没有样式被覆盖的问题，加 !important 也无法跨越层叠上下文比较。'],answer:1,explain:'z-index 只在同一层叠上下文里比较；常用 Portal 把弹窗挂到 body。',interview:'fe-q-zindex'},
 {id:'fe-css-9',type:'judge',q:'opacity: 0 的按钮虽然看不见，但仍然可以被点击。',answer:true,explain:'它仍在原处响应事件，要小心“隐形按钮”。',interview:'fe-q-hide'},
 {id:'fe-css-10',type:'short',q:'sticky 吸顶不生效，你会检查哪些地方？',reference:'检查是否设置了 top 等阈值；祖先元素是否有 overflow: hidden / auto（会让粘性相对它而不是页面）；父容器高度是否足够，sticky 只在父容器范围内生效；元素本身是否被其他样式覆盖成别的 position；在 flex 容器里可能被拉伸，需要 align-self: flex-start。',points:['设置 top 阈值','祖先的 overflow','父容器的高度范围','flex 中的拉伸问题'],explain:'sticky 的作用范围限制在父容器里。',interview:'fe-q-position'},
]};
