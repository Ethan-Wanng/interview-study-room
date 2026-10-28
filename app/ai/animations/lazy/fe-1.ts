import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 1 集：给书店盖一座网页小楼（HTML 骨架与语义化、脚本加载、选择器与盒模型、定位与层叠、Flex、Grid、响应式）。
export const feLazy1:LazyEpisode={id:'lazy-fe-1',subject:'frontend',tier:0,levels:['fe-html','fe-css','fe-layout'],icon:'🏡',title:'给书店盖一座网页小楼',summary:'新人小芽给书店做官网：HTML 是钢筋骨架，CSS 是装修，盒模型量尺寸，定位摆家具，Flex 和 Grid 排布局，响应式让手机和电脑都好看。',beats:[
 {say:'阿杰的书店要做一个官网，他请来了刚入行的前端新人小芽。小芽打开编辑器，有点紧张。带她的师傅老冯说：别怕，做网页就像盖一座小楼，先搭骨架，再装修，最后通上电。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('feng','🧑‍🏫','老冯',110,300)]},
 {say:'骨架是 HTML。它决定页面上有什么：标题用 h1，段落用 p，链接用 a，图片用 img，按钮用 button。CSS 是装修，决定长什么样：颜色、字体、大小、位置。JavaScript 是电线和开关，决定点了以后发生什么。',add:[A('html','🦴','HTML 骨架',460,90,{kind:'item',tone:'primary'}),A('css','🎨','CSS 装修',460,190,{kind:'item'}),A('js','⚡','JS 电路',460,290,{kind:'item'})]},
 {say:'小芽一开始全用 div 搭页面，看起来一模一样。老冯摇摇头：读屏软件和搜索引擎可分不清哪里是导航、哪里是正文。他让小芽换成有含义的标签：页眉用 header，导航用 nav，主要内容用 main，文章用 article，页脚用 footer。这叫语义化。',drop:['css','js'],add:[A('sem','🏷️','header · nav · main · footer',460,190,{kind:'tag',tone:'ok'})]},
 {say:'语义化不只是好看。视障用户用读屏软件，可以直接跳到导航、跳到正文；用 button 而不是 div 做按钮，键盘按 Tab 能选中，按回车能点击。图片写上有意义的 alt，图片加载失败或者读屏的时候，用户也知道这里是什么。',bubble:{who:'sem',text:'人和机器都看得懂'}},
 {say:'接着老冯讲脚本放在哪里。浏览器从上往下读 HTML，读到一个普通的 script，就停下来下载、执行，执行完才继续往下读，页面就卡住了。给脚本加上 defer，它在后台下载，等整个 HTML 读完，再按书写的顺序依次执行。统计这类独立的脚本，可以用 async，下完就执行，不管顺序。',drop:['sem'],add:[A('defer','⏳','script defer：读完再执行',460,190,{kind:'tag',tone:'primary'})]},
 {say:'骨架搭好，开始装修。CSS 先要选中元素：标签选择器、类选择器、ID 选择器。几条规则都想给同一个按钮上色时，比优先级：行内样式最高，然后是 ID，再是类和伪类，最后是标签；一样高，就看谁写在后面。老冯建议：多用类，少用 ID，尽量别用 !important。',drop:['defer','html'],add:[A('spec','🏆','行内 > ID > 类 > 标签',460,90,{kind:'item',tone:'primary'})]},
 {say:'然后是量尺寸。页面上的每个元素都是一个盒子：最里面是内容，外面一圈内边距 padding，再一圈边框 border，最外面是外边距 margin。默认情况下，width 只算内容。小芽设置了宽度两百，内边距二十、边框五，结果盒子实际宽了五十像素，把布局撑破了。',drop:['spec'],add:[A('box','📦','content · padding · border · margin',460,190,{kind:'item'})]},
 {say:'老冯教她加一句 box-sizing: border-box，width 就包含了内边距和边框，说两百就是两百。很多项目在全局都这么设置。还有一个小坑：上下相邻的两个块，外边距会合并，取两者中较大的那个，而不是相加。',sub:{box:'border-box：说多宽就多宽'},tone:{box:'ok'}},
 {say:'接下来摆家具，也就是定位。relative 是在原位置的基础上挪一挪，原来的位置还占着；absolute 脱离了正常的排列，相对最近一个“定位过的祖先”摆放，所以卡片设成 relative，角标设成 absolute，就能贴在卡片的右上角。',drop:['box'],add:[A('card','🃏','卡片 relative',400,190,{kind:'item'}),A('badge','🔴','角标 absolute',560,110,{kind:'tag',tone:'warm'})],send:[{from:'badge',to:'card',text:'以我为参照'}]},
 {say:'fixed 相对屏幕定位，页面滚动它也不动，比如回到顶部的按钮。sticky 很有意思：滚动到某个位置之前，它老老实实待着；之后就像被吸住一样贴在顶部，但只在父容器的范围里有效，父元素设置了 overflow: hidden 时，它就吸不住了。',add:[A('fix','📌','fixed 钉屏幕 · sticky 吸顶',400,300,{kind:'tag',tone:'primary'})]},
 {say:'弹窗写了 z-index 九千九百九十九，却还是被页头盖住了。老冯说：z-index 只在同一个“层叠上下文”里比较。弹窗的父元素设置了 transform，自己成了一个独立的小世界，整个小世界的层级比页头低，里面的数字再大也没用。办法是把弹窗挂到 body 下面。',drop:['card','badge','fix'],add:[A('z','🪜','z-index 只在同层比较',460,190,{kind:'item',tone:'warm'})]},
 {say:'隐藏元素也有三种写法。display: none 彻底不渲染，不占位置；visibility: hidden 看不见，但还占着位置；opacity: 0 完全透明，还占着位置，而且还能被点到！小芽就做出过一个“隐形按钮”，用户莫名其妙地点了好几次。',drop:['z'],add:[A('hide','🙈','none · hidden · opacity: 0',460,190,{kind:'tag'})]},
 {say:'家具摆好了，开始排布局。导航栏要把 logo、菜单、头像排成一行，老冯拿出了 Flex。容器设成 display: flex，子元素就沿着一条主轴排开；justify-content 管主轴方向的对齐，align-items 管垂直方向的对齐，gap 设置间距。',drop:['hide'],add:[A('logo','🅻','logo',300,90,{kind:'tag'}),A('menu','📋','菜单 flex: 1',440,90,{kind:'tag',tone:'primary'}),A('ava','🙂','头像',570,90,{kind:'tag'})]},
 {say:'菜单设置 flex: 1，就会占满剩下的所有空间。可书名太长时，菜单把整行都撑破了。原来 flex 子项默认不肯比自己的内容更窄，加上 min-width: 0，再配上省略号的写法，长文字才能乖乖地截断。',bubble:{who:'menu',text:'加 min-width: 0'}},
 {say:'商品卡片墙是另一种需求：既要分行，又要分列。这时用 Grid。一行代码 grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))，屏幕宽就多放几列，窄就少放几列，卡片自动换行。老冯说：一维排列用 Flex，二维网格用 Grid，两者常常一起用。',drop:['logo','menu','ava'],add:[A('g1','🃏','卡片',300,190,{kind:'tag',tone:'ok'}),A('g2','🃏','卡片',420,190,{kind:'tag',tone:'ok'}),A('g3','🃏','卡片',540,190,{kind:'tag',tone:'ok'})]},
 {say:'要把一个登录框放在页面正中间，最简单的写法是父元素 display: grid，再加 place-items: center；或者 Flex 加上两个 center。以前流行的写法是绝对定位，top 和 left 各百分之五十，再用 transform 往回挪自身的一半。',add:[A('center','🎯','grid + place-items: center',420,300,{kind:'tag',tone:'primary'})]},
 {say:'最后一关是手机。小芽打开手机一看，页面被缩得像蚂蚁一样小。原来忘了在 head 里写 viewport 这一行 meta，手机默认按很宽的虚拟屏幕渲染。加上之后，再用媒体查询：屏幕宽度超过七百六十八像素时，变成两栏；手机上就是一栏。',drop:['g1','g2','g3','center'],add:[A('phone','📱','手机：一栏',300,190,{kind:'item'}),A('pc','🖥️','电脑：两栏',520,190,{kind:'item'})]},
 {say:'单位也要选对：px 是固定的；rem 跟着根元素的字号走，适合统一缩放；vw 是屏幕宽度的百分之一；clamp 能让字号在最小值和最大值之间随屏幕平滑变化。图片设置 max-width: 100%，就不会把手机屏幕撑破。',add:[A('unit','📏','rem · vw · clamp()',420,300,{kind:'tag',tone:'ok'})],tone:{phone:'ok',pc:'ok'}},
 {say:'一周后，书店官网上线了。阿杰在手机上、平板上、电脑上分别打开，都很好看。小芽在笔记里写下：骨架用语义化标签，脚本加 defer；盒子用 border-box，角标用 relative 加 absolute，弹窗挂到 body；一行用 Flex，网格用 Grid，手机先写 viewport。',drop:['phone','pc','unit'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['语义化标签 + defer；优先级 ID > 类 > 标签；border-box','定位看包含块，z-index 只在同层比较；一维 Flex，二维 Grid，响应式靠 viewport + 媒体查询']},
]};
