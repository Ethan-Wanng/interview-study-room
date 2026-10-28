import {A,type Story} from '../story';

// 前端面试题动画（三）：数据类型、相等、闭包、this、原型链、变量提升、事件循环、Promise。
export const feC:Record<string,Story>={
 'fe-q-types':{title:'七种原始类型和一个对象',beats:[
  {say:'JavaScript 的值分两类：原始值和对象。原始值有 7 种：undefined、null、boolean、number、bigint、string、symbol。',add:[A('prim','🔤','7 种原始类型',150,80,{kind:'item',tone:'primary'}),A('obj','📦','对象：数组、函数…',490,80,{kind:'item'})]},
  {say:'用 typeof 判断：数字、字符串都没问题，可 typeof null 竟然是 "object"——这是历史遗留的 bug。',add:[A('t','❓','typeof null = object',150,210,{kind:'tag',tone:'bad'})]},
  {say:'typeof [] 也是 "object"。判断数组用 Array.isArray。',add:[A('arr','📚','Array.isArray([])',490,210,{kind:'tag',tone:'ok'})]},
  {say:'最通用的是 Object.prototype.toString.call(x)，返回 [object Date] 这样精确的类型名。',add:[A('ts','🔍','toString.call → [object Date]',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住判断方法。',memo:['typeof 判原始类型，注意 null','数组 isArray，通用 toString.call']},
 ]},
 'fe-q-equality':{title:'== 会偷偷做类型转换',beats:[
  {say:'用 == 比较 "0" 和 false。两边类型不同，它会先把它们都转成数字：0 == 0，结果是 true。',add:[A('a','"0"','"0"',150,120,{kind:'item'}),A('b','🚫','false',490,120,{kind:'item'}),A('eq','🟰','==',320,120,{kind:'tag',tone:'warm'})],bubble:{who:'eq',text:'都转成 0，相等！'}},
  {say:'类似的还有 "" == 0 为 true、[] == false 为 true，规则复杂，很容易踩坑。',add:[A('trap','🕳️','"" == 0 · [] == false',320,250,{kind:'tag',tone:'bad'})]},
  {say:'=== 严格相等：类型不同直接 false，不做任何转换。工程里统一用 ===。',drop:['eq'],add:[A('se','✅','===',320,120,{kind:'tag',tone:'ok'})],tone:{trap:'quiet'}},
  {say:'唯一常用的例外：x == null 同时判断 null 和 undefined。NaN 用 Number.isNaN 判断。',bubble:{who:'se',text:'类型不同，不相等'}},
  {say:'记住规则。',memo:['== 会类型转换，=== 不会','统一用 ===，x == null 例外']},
 ]},
 'fe-q-closure':{title:'闭包：函数背着它的小背包',beats:[
  {say:'函数 counter 里有一个变量 n = 0，它返回了一个内部函数 next。',add:[A('outer','🏠','counter()',150,90,{kind:'item'}),A('n','🎒','n = 0',150,220,{kind:'tag',tone:'primary'})]},
  {say:'counter 执行完返回了，按理说 n 应该被回收。但内部函数 next 还引用着它，就像把 n 装进小背包带走了。',add:[A('next','🏃','next()',480,160,{tone:'primary'})],send:[{from:'n',to:'next',text:'背走'}]},
  {say:'每次调用 next()，n 加一：1、2、3……外部代码没法直接改 n，这就是私有状态。',sub:{next:'n = 3'},tone:{next:'ok'}},
  {say:'小心：长期存活的闭包（全局事件监听、定时器）背着大对象，就会造成内存泄漏。用完记得移除监听、清理定时器。',add:[A('leak','⚠️','长期持有大对象 → 泄漏',480,300,{kind:'tag',tone:'warm'})]},
  {say:'记住闭包。',memo:['内部函数记住外部变量','私有状态；用完记得释放']},
 ]},
 'fe-q-this':{title:'this 指向谁：看怎么调用',beats:[
  {say:'对象 user 有个方法 say。user.say() 时，this 是点前面的 user。',add:[A('user','🧑','user',150,100,{tone:'primary'}),A('say','🗣️','say()',450,100,{kind:'item'})],send:[{from:'user',to:'say',text:'this = user',tone:'ok'}]},
  {say:'把方法单独拿出来 const f = user.say; f()：没有点了，严格模式下 this 是 undefined，报错。',add:[A('f','📤','f()',450,230,{kind:'item',tone:'bad'})],bubble:{who:'f',text:'我的 this 呢？'}},
  {say:'用 bind、call、apply 可以显式指定 this；new 调用时 this 是新创建的对象。',add:[A('bind','🔗','bind / call / apply',150,300,{kind:'tag',tone:'ok'})],tone:{f:'ok'}},
  {say:'箭头函数没有自己的 this，用的是定义时外层的 this，所以常用来写回调，避免 this 丢失。',add:[A('arrow','➡️','箭头函数：继承外层',450,320,{kind:'tag',tone:'primary'})]},
  {say:'记住判断顺序。',memo:['new > bind/call > obj.fn() > 默认','箭头函数没有自己的 this']},
 ]},
 'fe-q-prototype':{title:'原型链：找不到就问上一级',beats:[
  {say:'dog 是 new Dog() 创建的。访问 dog.bark，dog 自己身上没有这个方法。',add:[A('dog','🐶','dog',110,170,{tone:'primary'})],bubble:{who:'dog',text:'bark 是什么？'}},
  {say:'沿着原型往上找：Dog.prototype 上有 bark，找到了！',add:[A('dp','📘','Dog.prototype：bark',360,80,{kind:'item',tone:'ok'})],send:[{from:'dog',to:'dp',text:'找原型'}]},
  {say:'再访问 dog.toString：Dog.prototype 也没有，继续往上到 Object.prototype，找到了。',add:[A('op','📗','Object.prototype',360,220,{kind:'item'})],send:[{from:'dp',to:'op',text:'再往上'}]},
  {say:'Object.prototype 的原型是 null，到头了还找不到就返回 undefined。这条链就是原型链；class extends 也是靠它实现继承。',add:[A('nul','⛔','null（终点）',360,320,{kind:'tag',tone:'quiet'})]},
  {say:'记住原型链。',memo:['先找自身，再沿原型往上找','到 null 为止，class 是语法糖']},
 ]},
 'fe-q-hoisting':{title:'var 和 let：循环里的三个定时器',beats:[
  {say:'用 var 写循环，每轮注册一个 setTimeout 打印 i。var 是函数作用域，整个循环只有一个 i。',add:[A('v','📦','var i（只有一个）',150,90,{kind:'item',tone:'warm'})]},
  {say:'定时器执行时循环早结束了，i 已经变成 3，于是打印 3、3、3。',add:[A('out1','🖨️','3 3 3',150,230,{kind:'tag',tone:'bad'})],send:[{from:'v',to:'out1'}]},
  {say:'换成 let：块级作用域，每一轮都创建一个新的 i，三个定时器各自记住 0、1、2。',add:[A('l','📦','let i（每轮一个）',490,90,{kind:'item',tone:'primary'}),A('out2','🖨️','0 1 2',490,230,{kind:'tag',tone:'ok'})],send:[{from:'l',to:'out2'}]},
  {say:'let 和 const 在声明之前访问会报错，这段区域叫暂时性死区；const 不能重新赋值，但对象内部属性可以改。',add:[A('tdz','🚧','暂时性死区',320,320,{kind:'tag'})]},
  {say:'记住区别。',memo:['var 函数作用域、会提升','let/const 块级作用域、有暂时性死区']},
 ]},
 'fe-q-event-loop':{title:'事件循环：先清微任务，再取宏任务',beats:[
  {say:'代码依次是：打印 1、setTimeout 打印 2、Promise.then 打印 3、打印 4。主线程先跑完同步代码：1、4。',add:[A('main','🧵','主线程：1 4',320,70,{kind:'item',tone:'primary'})]},
  {say:'setTimeout 的回调进了宏任务队列；Promise.then 的回调进了微任务队列。',add:[A('macro','📮','宏任务：打印 2',150,210,{kind:'item'}),A('micro','⚡','微任务：打印 3',490,210,{kind:'item',tone:'warm'})]},
  {say:'同步代码跑完，先把微任务队列全部清空：打印 3。',send:[{from:'micro',to:'main',text:'3',tone:'ok'}],tone:{micro:'ok'}},
  {say:'浏览器可能顺便渲染一帧，然后才取下一个宏任务：打印 2。所以输出是 1 4 3 2。',send:[{from:'macro',to:'main',text:'2'}],tone:{macro:'ok'},bubble:{who:'main',text:'1 4 3 2'}},
  {say:'记住顺序。',memo:['同步 → 清空微任务 → 渲染 → 下一个宏任务','await 之后的代码也是微任务']},
 ]},
 'fe-q-promise':{title:'Promise 的四个组合方法',beats:[
  {say:'同时发出三个请求 A、B、C，B 失败了。四个组合方法会给出不同的结果。',add:[A('a','✅','A 成功',110,80,{kind:'tag',tone:'ok'}),A('b','❌','B 失败',320,80,{kind:'tag',tone:'bad'}),A('c','✅','C 成功',530,80,{kind:'tag',tone:'ok'})]},
  {say:'Promise.all：有一个失败就整体失败。适合“缺一不可”的场景。',add:[A('all','🧩','all → 失败',150,210,{kind:'item',tone:'bad'})]},
  {say:'allSettled：等全部结束，告诉你每个是成功还是失败。适合“能拿多少拿多少”。',add:[A('as','📋','allSettled → 全部结果',490,210,{kind:'item',tone:'ok'})]},
  {say:'race：第一个结束的说了算，常用来做超时。any：第一个成功的说了算，全失败才失败。',add:[A('race','🏁','race · any',320,320,{kind:'tag',tone:'primary'})]},
  {say:'记住四个方法。',memo:['all 全成功，allSettled 全结果','race 第一个结束，any 第一个成功']},
 ]},
};
