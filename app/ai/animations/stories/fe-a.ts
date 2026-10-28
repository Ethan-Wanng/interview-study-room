import {A,type Story} from '../story';

// 前端面试题动画（一）：HTML 语义化、脚本加载、盒模型、BFC、Flex、居中、优先级。
export const feA:Record<string,Story>={
 'fe-q-semantic':{title:'语义化：给页面贴上正确的标签',beats:[
  {say:'一个页面全用 div 搭起来：看起来一样，但读屏软件和搜索引擎分不清哪里是导航、哪里是正文。',add:[A('page','📄','div div div…',320,170,{kind:'item',tone:'bad'})]},
  {say:'换成语义化标签：header 是页眉，nav 是导航，main 是主要内容，footer 是页脚。',drop:['page'],add:[A('h','🔝','header',320,50,{kind:'tag',tone:'primary'}),A('n','🧭','nav',120,150,{kind:'tag',tone:'primary'}),A('m','📰','main · article',380,150,{kind:'tag',tone:'primary'}),A('f','🔚','footer',320,260,{kind:'tag',tone:'primary'})]},
  {say:'视障用户的读屏软件可以直接“跳到导航”“跳到正文”，键盘也能顺畅操作。',add:[A('sr','🦻','读屏软件',540,270)],bubble:{who:'sr',text:'这里是导航区'}},
  {say:'搜索引擎也更容易理解哪部分是文章内容。按钮用 button 而不是 div，自带键盘和聚焦行为。',tone:{m:'ok'}},
  {say:'记住语义化。',memo:['用标签表达含义','可访问、利于 SEO、好维护']},
 ]},
 'fe-q-script-defer':{title:'defer 和 async：脚本什么时候执行',beats:[
  {say:'浏览器正在从上往下解析 HTML。遇到普通 script，它停下来，等脚本下载并执行完才继续。',add:[A('html','📜','解析 HTML',320,70,{kind:'item',tone:'primary'}),A('s','📦','普通 script',320,200,{kind:'tag',tone:'bad'})],sub:{html:'被阻塞'}},
  {say:'async：下载和解析同时进行，下载完立刻执行，谁先下完谁先执行，顺序不保证。',drop:['s'],add:[A('a','⚡','async：下完就跑',150,200,{kind:'tag',tone:'warm'})],sub:{html:'继续解析'}},
  {say:'defer：也是并行下载，但等 HTML 全部解析完，再按书写顺序依次执行。',add:[A('d','⏳','defer：解析完按顺序',490,200,{kind:'tag',tone:'ok'})]},
  {say:'所以依赖 DOM、有先后顺序的业务脚本用 defer；统计、广告这种独立脚本用 async。',add:[A('use','🧭','业务 defer · 统计 async',320,300,{kind:'tag'})]},
  {say:'记住两者区别。',memo:['async 下完就执行，无序','defer 解析完后按顺序执行']},
 ]},
 'fe-q-box-model':{title:'盒模型：一个盒子到底有多宽',beats:[
  {say:'每个元素都是一个盒子：最里面是内容，外面依次是内边距 padding、边框 border、外边距 margin。',add:[A('box','📦','content',320,170,{kind:'item',tone:'primary'})],sub:{box:'padding · border · margin'}},
  {say:'设置 width: 200px、padding: 20px、border: 5px。标准盒模型下，width 只算内容，实际宽度是 250px。',add:[A('cb','📏','content-box：250px',150,60,{kind:'tag',tone:'warm'})]},
  {say:'改成 box-sizing: border-box，width 就包含内容、内边距和边框，盒子正好 200px。',add:[A('bb','📐','border-box：200px',490,60,{kind:'tag',tone:'ok'})]},
  {say:'所以很多项目全局设置 border-box，布局计算直观得多。margin 不算在 width 里，相邻的上下 margin 还会合并。',bubble:{who:'box',text:'说多宽就多宽'}},
  {say:'记住盒模型。',memo:['content → padding → border → margin','border-box：width 包含边框和内边距']},
 ]},
 'fe-q-bfc':{title:'BFC：一个独立的布局小房间',beats:[
  {say:'父元素里的两个子元素都浮动了。父元素的高度塌成了 0，背景色都不见了。',add:[A('p','📦','父元素：高度 0',320,80,{kind:'item',tone:'bad'}),A('c1','🟦','float 子元素',210,220,{kind:'tag'}),A('c2','🟦','float 子元素',430,220,{kind:'tag'})]},
  {say:'给父元素加 display: flow-root，它就创建了一个 BFC：一块独立的布局区域，会把浮动的孩子包含进来。',tone:{p:'ok'},sub:{p:'display: flow-root'}},
  {say:'BFC 内部的布局不影响外部：还能阻止相邻元素的上下 margin 合并。',add:[A('m','📏','阻止 margin 合并',150,320,{kind:'tag',tone:'ok'})]},
  {say:'也能让一栏不被旁边的浮动元素压住，实现自适应两栏布局。overflow: hidden 也能触发，但会裁掉溢出内容。',add:[A('two','🧱','自适应两栏',490,320,{kind:'tag',tone:'ok'})]},
  {say:'记住 BFC。',memo:['独立的布局区域','包含浮动、阻止 margin 合并']},
 ]},
 'fe-q-flex':{title:'Flex 布局：一行里怎么分空间',beats:[
  {say:'容器设置 display: flex，子元素沿主轴排成一行。justify-content 管主轴对齐，align-items 管交叉轴对齐。',add:[A('row','➡️','display: flex',320,60,{kind:'item',tone:'primary'})]},
  {say:'三个子元素：左边图标固定宽度，中间标题设置 flex: 1，右边按钮固定宽度。',add:[A('a','🖼️','图标',110,180,{kind:'tag'}),A('b','📝','标题 flex: 1',320,180,{kind:'tag',tone:'primary'}),A('c','🔘','按钮',530,180,{kind:'tag'})]},
  {say:'flex: 1 等于 flex-grow 1、flex-shrink 1、flex-basis 0%：剩下的空间全给标题。',tone:{b:'ok'},sub:{b:'占满剩余空间'}},
  {say:'标题很长时却撑破了一行？子元素默认 min-width: auto，不会比内容窄。加上 min-width: 0 才能截断成省略号。',bubble:{who:'b',text:'加 min-width: 0\n我才能缩'}},
  {say:'记住 Flex 的要点。',memo:['justify 主轴，align 交叉轴','flex: 1 平分剩余空间，记得 min-width: 0']},
 ]},
 'fe-q-center':{title:'水平垂直居中的几种写法',beats:[
  {say:'要把一个对话框放在页面正中间，而且不知道它有多大。',add:[A('box','💬','对话框',320,170,{kind:'item',tone:'primary'})]},
  {say:'写法一：父元素 display: grid; place-items: center，一行搞定。',add:[A('g','🔲','grid + place-items',150,60,{kind:'tag',tone:'ok'})]},
  {say:'写法二：父元素 display: flex，justify-content 和 align-items 都设为 center。',add:[A('f','➡️','flex + 两个 center',490,60,{kind:'tag',tone:'ok'})]},
  {say:'写法三：子元素绝对定位 top 50%、left 50%，再 transform: translate(-50%, -50%) 往回挪自身一半。',add:[A('t','📍','absolute + translate',320,300,{kind:'tag',tone:'warm'})]},
  {say:'记住常用写法。',memo:['grid：place-items: center','flex 两个 center，或 absolute + translate']},
 ]},
 'fe-q-specificity':{title:'选择器优先级：谁说了算',beats:[
  {say:'同一个按钮，三条规则都想改它的颜色：.btn、#submit、button。',add:[A('btn','🔘','按钮',320,170,{kind:'item',tone:'primary'})]},
  {say:'按 (ID, 类, 元素) 比较：#submit 是 (1,0,0)，.btn 是 (0,1,0)，button 是 (0,0,1)。ID 选择器胜出。',add:[A('id','🆔','#submit (1,0,0)',150,60,{kind:'tag',tone:'ok'}),A('cl','🏷️','.btn (0,1,0)',490,60,{kind:'tag'}),A('el','🔤','button (0,0,1)',490,290,{kind:'tag'})],send:[{from:'id',to:'btn',tone:'ok'}]},
  {say:'内联 style 比它们都高；!important 会跳出普通比较，滥用后很难再覆盖。',add:[A('imp','⚠️','!important 慎用',150,290,{kind:'tag',tone:'warm'})]},
  {say:'优先级相同，后写的覆盖先写的。现代 CSS 还可以用 @layer 分层管理第三方样式和组件样式。',bubble:{who:'btn',text:'听 ID 的'}},
  {say:'记住比较规则。',memo:['内联 > ID > 类/属性/伪类 > 元素','同级后写覆盖，少用 !important']},
 ]},
};
