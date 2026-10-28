import type {AiLevel} from '../journey';

// 前端入门（一）：HTML 与网页基础。
export const feHtml:AiLevel={id:'fe-html',title:'HTML 与网页基础',summary:'网页由什么组成，常用标签、语义化和脚本加载',lessons:[
 {title:'网页的三件套',body:'一个网页由三部分组成：HTML 负责结构和内容（这里有标题、段落、图片），CSS 负责样式（颜色、大小、位置），JavaScript 负责交互（点击后发生什么）。浏览器下载这些文件，把它们变成你看到的页面。',code:'<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>我的第一个网页</title>\n</head>\n<body>\n  <h1>你好，前端</h1>\n  <p>这是一个段落。</p>\n</body>\n</html>'},
 {title:'常用标签',body:'标题 h1～h6，段落 p，链接 a（href 写地址），图片 img（src 写地址，alt 写描述），列表 ul/ol + li，表格 table，表单 form + input + label + button。块级元素（div、p、h1）独占一行；行内元素（span、a、strong）在一行里排列。'},
 {title:'语义化',body:'用能表达含义的标签组织页面：header 页眉、nav 导航、main 主要内容、article 文章、aside 侧栏、footer 页脚。点击用 button，跳转用 a。好处：读屏软件能理解结构，搜索引擎更懂内容，代码也更清楚。'},
 {title:'脚本放在哪里',body:'浏览器从上往下解析 HTML，遇到普通 script 会停下来下载并执行。所以脚本加 defer：下载不阻塞解析，等 HTML 解析完再按顺序执行；独立的统计脚本用 async，下载完就执行。CSS 用 link 放在 head 里。',code:'<link rel="stylesheet" href="style.css">\n<script src="app.js" defer></script>'},
],quiz:[
 {id:'fe-html-1',q:'网页中负责“点击按钮后弹出提示”的通常是？',options:['HTML','CSS','JavaScript','图片'],answer:2,explain:'HTML 管结构，CSS 管样式，JavaScript 管交互。'},
 {id:'fe-html-2',q:'img 标签的 alt 属性有什么用？',options:['设置图片大小','图片无法显示或读屏时提供文字描述','设置图片边框','让图片可以点击'],answer:1,explain:'alt 对可访问性和图片加载失败都很重要。',interview:'fe-q-a11y'},
 {id:'fe-html-3',type:'multi',q:'下面哪些是语义化标签？（多选）',options:['nav','article','div','footer'],answers:[0,1,3],explain:'div 没有语义，只是通用容器。',interview:'fe-q-semantic'},
 {id:'fe-html-4',q:'页面上一个“提交”按钮，最合适的写法是？',options:['<div onclick="submit()">提交</div>','<button type="submit">提交</button>','<span>提交</span>','<p>提交</p>'],answer:1,explain:'button 自带键盘操作、聚焦和语义。',interview:'fe-q-semantic'},
 {id:'fe-html-5',type:'judge',q:'span 和 a 是块级元素，默认会独占一行。',answer:false,explain:'它们是行内元素；div、p、h1 才是块级元素。'},
 {id:'fe-html-6',q:'<meta name="viewport" content="width=device-width"> 的作用是？',options:['设置网页标题','让移动端按设备宽度显示页面','引入 CSS','设置字符编码'],answer:1,explain:'没有它，手机会按很宽的虚拟视口渲染，页面被缩得很小。'},
 {id:'fe-html-7',q:'业务脚本依赖页面 DOM，并且要按顺序执行，应该怎么写？',options:['<script src="a.js"> 放在 head 里','<script src="a.js" async>','<script src="a.js" defer>','把代码写进 CSS'],answer:2,explain:'defer 不阻塞解析，解析完按书写顺序执行。',interview:'fe-q-script-defer'},
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
 {id:'fe-css-1',q:'.title 和 #header 两个选择器都设置了颜色，作用在同一个元素上，谁生效？',options:['.title','#header','后写的那个','都不生效'],answer:1,explain:'ID 选择器优先级高于类选择器。',interview:'fe-q-specificity'},
 {id:'fe-css-2',q:'width: 200px; padding: 10px; border: 2px solid，标准盒模型（content-box）下元素实际宽度是？',options:['200px','220px','224px','212px'],answer:2,explain:'200 + 10×2 + 2×2 = 224。',interview:'fe-q-box-model'},
 {id:'fe-css-3',type:'judge',q:'设置 box-sizing: border-box 后，width 包含 padding 和 border。',answer:true,explain:'所以设置多宽就占多宽。',interview:'fe-q-box-model'},
 {id:'fe-css-4',q:'想让一个“回到顶部”按钮固定在屏幕右下角，滚动也不动，用？',options:['position: relative','position: absolute','position: fixed','position: static'],answer:2,explain:'fixed 相对视口定位。',interview:'fe-q-position'},
 {id:'fe-css-5',q:'子元素 position: absolute，它会相对谁定位？',options:['body','最近的 position 不是 static 的祖先','父元素，不管父元素是什么定位','视口'],answer:1,explain:'所以父元素常设置 position: relative 作为参照。',interview:'fe-q-position'},
 {id:'fe-css-6',type:'multi',q:'下面哪些方式隐藏的元素仍然占据空间？（多选）',options:['display: none','visibility: hidden','opacity: 0','从 DOM 中删除'],answers:[1,2],explain:'display: none 和删除元素都不占空间。',interview:'fe-q-hide'},
 {id:'fe-css-7',type:'fill',q:'鼠标悬停时改变按钮颜色，用伪类 :____。',accepted:['hover'],explain:'例如 .btn:hover { background: #2255dd; }'},
 {id:'fe-css-8',q:'弹窗的 z-index 设置成 9999，仍被另一个 z-index: 2 的区域盖住，最可能的原因是？',options:['浏览器有 bug','弹窗所在的父元素创建了层叠上下文，且整体层级更低','9999 太大了','没写 !important'],answer:1,explain:'z-index 只在同一层叠上下文里比较；常用 Portal 把弹窗挂到 body。',interview:'fe-q-zindex'},
 {id:'fe-css-9',type:'judge',q:'opacity: 0 的按钮虽然看不见，但仍然可以被点击。',answer:true,explain:'它仍在原处响应事件，要小心“隐形按钮”。',interview:'fe-q-hide'},
 {id:'fe-css-10',type:'short',q:'sticky 吸顶不生效，你会检查哪些地方？',reference:'检查是否设置了 top 等阈值；祖先元素是否有 overflow: hidden / auto（会让粘性相对它而不是页面）；父容器高度是否足够，sticky 只在父容器范围内生效；元素本身是否被其他样式覆盖成别的 position；在 flex 容器里可能被拉伸，需要 align-self: flex-start。',points:['设置 top 阈值','祖先的 overflow','父容器的高度范围','flex 中的拉伸问题'],explain:'sticky 的作用范围限制在父容器里。',interview:'fe-q-position'},
]};
