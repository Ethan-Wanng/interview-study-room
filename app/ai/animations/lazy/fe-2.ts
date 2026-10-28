import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 2 集：给小楼通上电（变量与类型、相等与假值、可选链与空值合并、函数、对象与数组方法、拷贝、call/apply/bind 与 new）。
export const feLazy2:LazyEpisode={id:'lazy-fe-2',subject:'frontend',tier:0,levels:['fe-js','fe-func'],icon:'💡',title:'给小楼通上电：JavaScript 的第一课',summary:'小芽开始写 JavaScript：变量是贴了名字的盒子，类型有七种原始值，== 会偷偷换算，函数是工具，数组方法是流水线，拷贝要分深浅。',beats:[
 {say:'官网上线后，阿杰提了新需求：购物车要能自动算总价，点“加入购物车”时右上角的数字要跳一下。老冯说：这就该给小楼通电了，接下来要写 JavaScript。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('cart','🛒','购物车',460,90,{kind:'item',tone:'primary'})]},
 {say:'第一课是变量。变量像一个贴了名字的盒子。不会再换内容的盒子用 const，比如书店的名字；会变的用 let，比如购物车里的件数。老冯说：优先用 const；var 是老式写法，作用域容易出乱子，新代码别再用了。',add:[A('c','📦','const 店名',300,300,{kind:'tag',tone:'primary'}),A('l','📦','let 件数',500,300,{kind:'tag'})]},
 {say:'let 和 const 只在声明它们的那对大括号里有效，叫块级作用域。在声明之前就去用它，会直接报错，这段区域叫暂时性死区。const 只是不能重新赋值，如果里面装的是一个对象，对象里的属性还是可以改的。',bubble:{who:'c',text:'不能换盒子，能改里面'}},
 {say:'盒子里能放什么？七种原始值：字符串、数字、布尔、undefined、null、bigint、symbol；除此之外，都是对象，数组和函数也是对象。用 typeof 能看出大多数类型，但有个历史遗留的怪事：typeof null 竟然是 "object"。判断数组要用 Array.isArray。',drop:['c','l'],add:[A('types','🔢','7 种原始值 + 对象',460,210,{kind:'item'})]},
 {say:'小芽算总价时发现：0.1 加 0.2 等于 0.30000000000000004。老冯说，JavaScript 的数字是浮点数，有些小数无法精确表示。算钱的时候，统一用“分”为单位的整数来算，展示时再除以一百。',add:[A('float','🪙','0.1 + 0.2 ≠ 0.3',460,320,{kind:'tag',tone:'warm'})]},
 {say:'接着是比较。小芽写了 if (count == "0")，结果出了怪事。原来两个等号会偷偷做类型转换：字符串 "0" 和 false 比较，会先都转成数字 0，结果相等；空字符串等于 0，空数组也等于 false。规则复杂得让人头晕。',drop:['types','float'],add:[A('eq2','🟰','== 会偷偷换算',460,210,{kind:'item',tone:'bad'})]},
 {say:'所以团队规定统一用三个等号：类型不同直接不相等，不做任何转换。唯一的例外是 x == null，可以一次判断 null 和 undefined。NaN 和谁都不相等，连自己都不等，判断要用 Number.isNaN。',sub:{eq2:'统一用 ==='},tone:{eq2:'ok'}},
 {say:'在 if 里，有几个值会被当成“假”：false、0、空字符串、null、undefined 和 NaN；其余的都是“真”，连空数组和空对象都是真。读取深层的属性时，可以用可选链 user?.address?.city，中间某一层是空的，就返回 undefined，而不是报错。',drop:['eq2'],add:[A('falsy','🌓','假值只有这几个 · 可选链 ?.',460,210,{kind:'tag',tone:'primary'})]},
 {say:'设置默认值时，小芽写了 count || 10，可当件数是 0 时，也被换成了 10，因为 0 是假值。改成 count ?? 10 就对了：两个问号只有在 null 或 undefined 时才使用默认值，0 和空字符串都会被保留。',add:[A('nullish','❓','?? 只管 null 和 undefined',460,320,{kind:'tag',tone:'ok'})]},
 {say:'第二课是函数，它是一件可以反复使用的工具。可以用 function 声明，也可以写成箭头函数 (a, b) => a + b。参数可以有默认值，三个点的剩余参数能把多余的参数收进一个数组。箭头函数没有自己的 this，适合写回调。',drop:['falsy','nullish','cart'],add:[A('fn','🛠️','函数：一件工具',460,90,{kind:'item',tone:'primary'})]},
 {say:'第三课是对象和数组。对象是一堆“名字和值”的组合，比如一本书的书名、作者、价格。解构可以一次取出好几个属性：const { title, price } = book。展开运算符能复制一个对象，再改其中几项。',add:[A('obj','📘','对象 · 解构 · 展开',460,210,{kind:'item'})]},
 {say:'购物车里的商品是一个数组，小芽要算出“有库存的商品总价”。老冯教她用三个数组方法组成一条流水线：filter 先把没货的筛掉，map 把每件商品变成它的价格，reduce 把所有价格加起来。三步各管一件事，读起来像一句话。',drop:['fn','obj'],add:[A('f','🔍','filter 有货',300,90,{kind:'tag'}),A('m','🔁','map 取价格',300,200,{kind:'tag'}),A('r','➕','reduce 求和',300,310,{kind:'tag',tone:'ok'})],send:[{from:'f',to:'m'},{from:'m',to:'r'}]},
 {say:'这些方法都返回新数组，不会改动原来的购物车。而 push、pop、sort、splice 会直接修改原数组。在 React 这样的框架里，更新状态时必须给一个新数组，原地修改的话，框架会以为什么都没变，页面就不刷新。',bubble:{who:'r',text:'返回新数组'}},
 {say:'有一天，小芽复制了一份购物车 {...cart}，在副本里改了收货地址的城市，原来的购物车也跟着变了。老冯说：展开运算符是浅拷贝，只复制第一层，嵌套的地址对象还是同一个。需要彻底复制，用 structuredClone；JSON 转一圈的老办法，会丢掉函数、把日期变成字符串。',drop:['f','m','r'],add:[A('orig','📄','原购物车',300,190,{kind:'item'}),A('copy','📃','浅拷贝',520,190,{kind:'item',tone:'warm'}),A('addr','🏠','同一个地址对象',410,310,{kind:'tag',tone:'bad'})],send:[{from:'orig',to:'addr'},{from:'copy',to:'addr'}]},
 {say:'最后一课是 this 和 new 的小预告。函数里的 this 取决于怎么调用它：book.show() 里，this 就是 book。call 和 apply 能手动指定 this 并立刻执行，区别只是传参方式；bind 不执行，而是返回一个绑定好 this 的新函数。',drop:['orig','copy','addr'],add:[A('bind','🔗','call · apply · bind',460,190,{kind:'item',tone:'primary'})]},
 {say:'new 一个构造函数时，发生了四件事：先创建一个空对象，再把它的原型指向构造函数的 prototype，然后以这个对象为 this 执行构造函数，最后返回这个对象。箭头函数没有 prototype，不能用 new。',add:[A('new','🆕','new：建对象 → 连原型 → 执行 → 返回',400,310,{kind:'tag',tone:'ok'})]},
 {say:'周五下午，购物车功能上线了。点一下“加入购物车”，右上角的数字跳了一下，总价也算得分毫不差。小芽在笔记里写下：优先 const，比较用三个等号，默认值用两个问号；数组方法是流水线，展开只是浅拷贝；this 看怎么调用。',drop:['bind','new'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['const 优先，=== 比较，?? 给默认值，算钱用整数','filter → map → reduce，展开是浅拷贝，深拷贝用 structuredClone']},
]};
