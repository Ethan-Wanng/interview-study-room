import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 3 集：会说话的搜索框（DOM 操作、事件冒泡与委托、防抖节流、事件循环、Promise、async/await、请求竞态、闭包、this、原型链、内存泄漏）。
export const feLazy3:LazyEpisode={id:'lazy-fe-3',subject:'frontend',tier:1,levels:['fe-dom','fe-async','fe-scope'],icon:'🔎',title:'一个会说话的搜索框',summary:'小芽给书店做搜索联想：用 DOM 和事件委托响应点击，用防抖减少请求，用事件循环理解异步，用 Promise 和 async 串起请求，再弄懂闭包、this 和原型链。',beats:[
 {say:'新需求来了：搜索框里每输入一个字，下面就要弹出联想的书名，点一下联想项就跳到那本书。小芽觉得这个功能不难，结果整整写了一周，踩遍了 JavaScript 里最经典的几个坑。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('search','🔎','搜索框',460,90,{kind:'item',tone:'primary'})]},
 {say:'第一步是操作页面。浏览器把 HTML 变成了一棵 DOM 树，JavaScript 可以找到树上的节点并修改它。document.querySelector 用 CSS 选择器找到第一个匹配的元素；改文字用 textContent，它不会把内容当 HTML 解析，比 innerHTML 安全得多。',add:[A('dom','🌲','DOM 树',460,210,{kind:'item'})]},
 {say:'联想列表有几十个条目，小芽一开始给每一条都绑了一个点击事件。老冯说：太累了，而且新加进来的条目还得重新绑。点击事件会冒泡：从被点的那一项开始，一路往上传到列表、页面、document。只在列表上绑一个监听，用 event.target.closest 找到具体点的是哪一项就行。这叫事件委托。',drop:['dom'],add:[A('list','📋','联想列表（一个监听）',460,210,{kind:'item',tone:'ok'})],send:[{from:'search',to:'list'}]},
 {say:'事件的旅程其实分三段：先从上往下捕获，到达目标，再从下往上冒泡。preventDefault 阻止默认行为，比如链接跳转、表单提交；stopPropagation 让事件不再继续传播。别随手 stopPropagation，它会让外面的委托监听收不到事件。',bubble:{who:'list',text:'捕获 → 目标 → 冒泡'}},
 {say:'第二个坑：用户飞快地输入“javascript”，十个字母发了十个请求，服务器被打得喘不过气。老冯教她防抖：每次输入都重新计时，停下三百毫秒后才真正发请求，像电梯门，有人进来就重新计时关门。滚动加载更多则用节流：不管滚得多快，每两百毫秒最多执行一次。',drop:['list'],add:[A('debounce','⏱️','防抖：停下才执行',460,210,{kind:'tag',tone:'primary'})]},
 {say:'第三个坑是异步。小芽写了一段代码，结果打印的顺序和她预想的完全不同。老冯在白板上画了一个餐厅：JavaScript 只有一个服务员，也就是主线程，一次只能做一件事。网络请求、定时器交给后厨去等，等好了，把回调放进不同的队列里。',drop:['debounce','search'],add:[A('waiter','🧑‍🍳','主线程：唯一的服务员',460,90,{tone:'primary'})]},
 {say:'规则是：先做完手头所有的同步代码；然后把“微任务”篮子全部清空，Promise 的 then、await 后面的代码都在这里；浏览器可能顺便刷新一下画面；最后才取一个“宏任务”，比如 setTimeout 的回调、用户的点击。所以 Promise.then 总是比同一时刻注册的 setTimeout 先执行。',add:[A('micro','⚡','微任务：Promise.then',290,250,{kind:'tag',tone:'warm'}),A('macro','📮','宏任务：setTimeout',520,250,{kind:'tag'})]},
 {say:'有一次，小芽在微任务里不停地添加新的微任务，页面直接卡死了。因为微任务篮子永远清不空，浏览器根本没机会刷新画面。很重的计算要拆成小块放进宏任务，或者交给 Web Worker 去后台做。',bubble:{who:'waiter',text:'篮子清不空就卡死'}},
 {say:'Promise 是一张“取餐凭证”，代表一个将来才会有结果的操作。它有三种状态：等待中、已成功、已失败，一旦确定就再也不会变。then 接成功，catch 接失败，finally 都会执行。',drop:['micro','macro'],add:[A('promise','🎟️','Promise：取餐凭证',460,210,{kind:'item',tone:'primary'})]},
 {say:'同时发好几个请求时，有四种等法。Promise.all：全部成功才算成功，有一个失败就整体失败；allSettled：等全部结束，告诉你每一个的结果；race：第一个结束的说了算，常用来做超时；any：第一个成功的说了算。',sub:{promise:'all · allSettled · race · any'}},
 {say:'async 和 await 让异步代码看起来像同步代码：在 async 函数里 await 一个 Promise，就像排队等它的结果。出错用 try catch 接住。但小芽踩了一个坑：书的详情和评论两个请求互不依赖，她却一个一个地 await，白白多等了一倍的时间。改成先同时发出，再用 Promise.all 一起等，快了一半。',drop:['promise'],add:[A('await','⏳','互不依赖 → Promise.all 并行',460,210,{kind:'tag',tone:'ok'})]},
 {say:'还有一个坑：在 forEach 里写 await，forEach 根本不会等它。要按顺序执行用 for of；要并行，就用 Promise.all 加 map。',bubble:{who:'await',text:'forEach 不等 await'}},
 {say:'第四个坑最诡异：用户先输入“re”，接着输入“react”，联想列表最后显示的却是“re”的结果。原来第一个请求比较慢，比第二个请求更晚回来，把正确的结果覆盖了。这叫请求竞态。办法是发新请求之前，用 AbortController 把上一个请求取消掉。',drop:['await'],add:[A('race','🏁','竞态：旧结果覆盖新结果',460,210,{kind:'tag',tone:'bad'})]},
 {say:'第五个坑在闭包。小芽写了一个防抖函数，返回一个内部函数，里面用到外面的定时器变量。外面的函数早就执行完了，可内部函数还记得那个变量，就像背着一个小背包走了。这就是闭包：函数记住了它出生时周围的变量。',drop:['race','waiter'],add:[A('bag','🎒','闭包：背着外部变量',460,90,{kind:'item',tone:'primary'})]},
 {say:'闭包很有用，能做私有变量、函数工厂。但背包背太久也有麻烦：一个全局的事件监听里，闭包引用了一个很大的数据，页面切换了，监听却没移除，那块数据就永远回收不了。',sub:{bag:'用完要释放'}},
 {say:'第六个坑是 this。小芽把对象的方法 book.show 当作回调传给了 setTimeout，结果 this 变成了 undefined。因为普通函数的 this 取决于怎么调用：book.show() 是 book；单独拿出来调用，就丢了。可以用箭头函数包一层，或者 bind 绑定。箭头函数没有自己的 this，用的是外面那层的。',add:[A('this','👆','this：看怎么调用',460,210,{kind:'item',tone:'warm'})]},
 {say:'最后，老冯讲了原型链。小芽问：为什么一个普通的对象，也能调用 toString？因为每个对象都有一个原型，属性在自己身上找不到，就沿着原型一层层往上找，一直找到 Object.prototype，再往上就是 null。class 和 extends 只是在原型链上包了一层好看的写法。',drop:['this'],add:[A('chain','🔗','原型链：一层层往上找',460,210,{kind:'item',tone:'ok'})]},
 {say:'内存的回收也和“找得到”有关。浏览器从全局对象和正在执行的函数出发，顺着引用找，能找到的都留着，找不到的就回收。所以内存泄漏，就是“不用了，但还被引用着”：忘了清除的定时器、没移除的监听、全局缓存只增不减、被删掉的 DOM 还被变量拽着。',drop:['chain'],add:[A('gc','🧹','不用了却还被引用 = 泄漏',460,210,{kind:'tag',tone:'warm'})]},
 {say:'一周后，搜索框终于完美了：输入停顿才请求，旧请求会被取消，点联想项靠事件委托，离开页面时清理干净所有监听。小芽在笔记里写下：先同步、再微任务、最后宏任务；不相关的请求要并行；闭包是背包，this 看调用，属性沿原型链找。',drop:['gc','bag'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['事件委托靠冒泡；输入用防抖，滚动用节流','同步 → 微任务 → 宏任务；并行用 Promise.all，竞态用 AbortController；闭包、this、原型链']},
]};
