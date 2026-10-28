import {A,type Story} from '../story';

// 前端面试题动画（二）：定位、层叠上下文、重排重绘、响应式、Grid、隐藏元素、可访问性、样式隔离。
export const feB:Record<string,Story>={
 'fe-q-position':{title:'position 的五种取值',beats:[
  {say:'static 是默认值，元素老老实实待在文档流里。relative 仍占着原来的位置，只是相对自己挪一点。',add:[A('st','📄','static',110,70,{kind:'tag'}),A('re','↘️','relative：占原位',320,70,{kind:'tag',tone:'primary'})]},
  {say:'absolute 脱离文档流，相对最近的“定位过的祖先”摆放，所以父元素常设 position: relative。',add:[A('ab','🎯','absolute',530,70,{kind:'tag',tone:'warm'})],send:[{from:'ab',to:'re',text:'以它为参照'}]},
  {say:'fixed 相对视口，页面滚动它也不动，比如回到顶部按钮。',add:[A('fx','📌','fixed：钉在屏幕上',150,240,{kind:'tag',tone:'ok'})]},
  {say:'sticky 滚动到阈值前像 relative，之后像 fixed 一样吸住，但只在父容器范围内有效。不生效时检查 top 和父元素的 overflow。',add:[A('sk','🧲','sticky：吸顶',490,240,{kind:'tag',tone:'ok'})]},
  {say:'记住五种定位。',memo:['relative 占原位，absolute 找定位祖先','fixed 相对视口，sticky 滚动吸附']},
 ]},
 'fe-q-zindex':{title:'z-index 9999 为什么还被盖住',beats:[
  {say:'页面上有两个区域：A 区 z-index 是 1，B 区 z-index 是 2，它们都创建了自己的层叠上下文。',add:[A('a','🟦','A 区（z 1）',180,170,{kind:'item'}),A('b','🟥','B 区（z 2）',460,170,{kind:'item',tone:'primary'})]},
  {say:'A 区里有一个弹窗，z-index 写到 9999。可它还是被 B 区盖住了！',add:[A('modal','💬','弹窗 z 9999',180,300,{kind:'tag',tone:'bad'})],bubble:{who:'modal',text:'我都 9999 了！'}},
  {say:'因为 z-index 只在同一个层叠上下文里比较。弹窗被关在 A 区里，A 区整体就比 B 区低。',send:[{from:'modal',to:'a',text:'只在 A 里比'}],tone:{a:'warm'}},
  {say:'opacity 小于 1、transform、filter、position 加 z-index 都会创建层叠上下文。解决办法：用 Portal 把弹窗挂到 body 下面。',add:[A('body','🏠','body（Portal）',320,60,{kind:'item',tone:'ok'})],send:[{from:'modal',to:'body',text:'搬出来',tone:'ok'}],tone:{modal:'ok'}},
  {say:'记住层叠上下文。',memo:['z-index 只在同一层叠上下文里比较','弹窗用 Portal 挂到 body']},
 ]},
 'fe-q-reflow':{title:'重排和重绘：改一个样式，浏览器要干多少活',beats:[
  {say:'改一个元素的颜色：浏览器只需要重新画一下，这是重绘，代价小。',add:[A('el','🟩','元素',320,170,{kind:'item',tone:'primary'}),A('rp','🎨','重绘：只改外观',150,60,{kind:'tag',tone:'ok'})]},
  {say:'改宽度、增删节点：位置和大小都变了，要重新计算布局，这是重排，代价大，还会连带重绘。',add:[A('rf','📐','重排：重新布局',490,60,{kind:'tag',tone:'bad'})],tone:{el:'warm'}},
  {say:'更糟的是在循环里“改一次样式、读一次 offsetHeight”：每次读取都逼浏览器立刻重新布局。',add:[A('loop','🔁','读写交替 → 强制布局',320,290,{kind:'tag',tone:'bad'})]},
  {say:'优化：先统一读、再统一写；批量改 class；动画用 transform 和 opacity，只在合成阶段完成，不触发布局。',tone:{loop:'ok',el:'ok'},sub:{loop:'先读后写'}},
  {say:'记住区别。',memo:['重排改几何，代价大','批量读写，动画用 transform']},
 ]},
 'fe-q-responsive':{title:'响应式：一套页面适配所有屏幕',beats:[
  {say:'同一个页面要在手机、平板和电脑上都好看。第一步：设置 viewport meta，让手机按设备宽度显示。',add:[A('ph','📱','手机',110,170,{kind:'item'}),A('tb','💻','平板',320,170,{kind:'item'}),A('pc','🖥️','电脑',530,170,{kind:'item'})]},
  {say:'用 flex 和 grid 做流式布局，再用媒体查询在断点处调整：宽度超过 768px 时变成两栏。',add:[A('mq','📏','@media (min-width: 768px)',320,60,{kind:'tag',tone:'primary'})],tone:{tb:'ok',pc:'ok'}},
  {say:'单位要选对：rem 跟着根字号走，vw 跟着视口宽度走，clamp 让字号在范围内平滑变化。',add:[A('u','🔤','rem · vw · clamp()',320,290,{kind:'tag'})]},
  {say:'图片用 max-width: 100% 和 srcset，不同屏幕加载合适的尺寸。组件级别的适配还可以用容器查询。',tone:{ph:'ok'},bubble:{who:'ph',text:'我也排得很好'}},
  {say:'记住响应式的要点。',memo:['viewport + 流式布局 + 媒体查询','rem / vw / clamp，图片 srcset']},
 ]},
 'fe-q-grid':{title:'Grid 还是 Flex',beats:[
  {say:'Flex 是一维的：沿着一条线排，适合导航栏、按钮组。',add:[A('fx','➡️','Flex：一行或一列',150,70,{kind:'item',tone:'primary'})]},
  {say:'Grid 是二维的：同时规划行和列，适合整体页面框架和卡片网格。',add:[A('gd','🔲','Grid：行和列',490,70,{kind:'item',tone:'primary'})]},
  {say:'一行代码做出自动换行的卡片墙：repeat(auto-fill, minmax(220px, 1fr))，屏幕宽就多放几列。',add:[A('cards','🗂️','auto-fill + minmax',490,200,{kind:'tag',tone:'ok'})],send:[{from:'gd',to:'cards'}]},
  {say:'两者常常一起用：Grid 搭页面骨架，每张卡片内部再用 Flex 排列图标和文字。',add:[A('both','🤝','Grid 搭框架 · Flex 排内部',320,300,{kind:'tag',tone:'ok'})]},
  {say:'记住怎么选。',memo:['一维排列用 Flex','二维网格用 Grid，两者常搭配']},
 ]},
 'fe-q-hide':{title:'三种“隐藏”有什么不同',beats:[
  {say:'三个按钮要“消失”，用了三种写法。',add:[A('a','🔘','display: none',110,170,{kind:'item'}),A('b','🔘','visibility: hidden',320,170,{kind:'item'}),A('c','🔘','opacity: 0',530,170,{kind:'item'})]},
  {say:'display: none：彻底不渲染、不占位置，切换会引起重排，读屏软件也读不到。',sub:{a:'不占位'},tone:{a:'quiet'}},
  {say:'visibility: hidden：看不见，但还占着位置，也点不到。',sub:{b:'占位，不可点'},tone:{b:'warm'}},
  {say:'opacity: 0：完全透明，仍占位置，而且还能被点击和聚焦！适合做淡入淡出动画，但要小心“隐形按钮”被误点。',sub:{c:'占位，仍可点'},tone:{c:'bad'},bubble:{who:'c',text:'我还能被点到'}},
  {say:'记住区别。',memo:['none 不占位，hidden 占位不可点','opacity: 0 仍可点击，适合做动画']},
 ]},
 'fe-q-a11y':{title:'可访问性：让每个人都能用',beats:[
  {say:'一位视障用户用读屏软件和键盘访问网站。用 div 做的“按钮”，Tab 键跳不过去，读屏也不知道它是按钮。',add:[A('u','🦻','读屏 + 键盘用户',110,170),A('d','🟫','div 按钮',450,100,{kind:'item',tone:'bad'})],bubble:{who:'u',text:'这是什么？'}},
  {say:'换成原生 button：自带键盘操作、焦点和语义，读屏会读出“提交，按钮”。',drop:['d'],add:[A('btn','🔘','button 提交',450,100,{kind:'item',tone:'ok'})],tone:{u:'ok'}},
  {say:'图片写有意义的 alt；表单控件配 label；焦点样式要看得见；颜色对比度足够，不只靠颜色传达信息。',add:[A('list','✅','alt · label · 焦点 · 对比度',450,240,{kind:'tag',tone:'primary'})]},
  {say:'弹窗打开时焦点移进去，关闭后回到原来的按钮。最后用 Lighthouse、axe 检查，再亲自用键盘走一遍。',add:[A('tool','🔍','Lighthouse · axe',450,320,{kind:'tag'})]},
  {say:'记住可访问性的原则。',memo:['优先用原生语义元素','键盘可用、焦点可见、对比度够']},
 ]},
 'fe-q-css-modules':{title:'大型项目的样式怎么不打架',beats:[
  {say:'两个组件都写了 .title，后加载的样式把前一个组件的标题也改了——全局 CSS 互相覆盖。',add:[A('a','🧩','组件 A：.title',150,80,{kind:'item'}),A('b','🧩','组件 B：.title',490,80,{kind:'item',tone:'bad'})],send:[{from:'b',to:'a',text:'覆盖了',tone:'bad'}]},
  {say:'CSS Modules：构建时把类名改成唯一的哈希，比如 title_a3f9，互不影响。',add:[A('cm','🔐','CSS Modules：title_a3f9',320,200,{kind:'tag',tone:'ok'})],tone:{b:'ok'}},
  {say:'其他方案：BEM 命名约定、Vue scoped、Tailwind 原子类、CSS-in-JS、Shadow DOM 真正隔离。',add:[A('more','🧰','BEM · scoped · Tailwind',320,290,{kind:'tag'})]},
  {say:'再用 @layer 管理第三方库和组件样式的优先级，用 CSS 变量统一颜色和间距。',bubble:{who:'a',text:'各管各的'}},
  {say:'记住样式隔离。',memo:['类名局部化：Modules、scoped','约定 + @layer + 设计变量']},
 ]},
};
