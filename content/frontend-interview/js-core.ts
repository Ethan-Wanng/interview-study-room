import type {FeInterviewQuestion} from './types';
const p=(text:string)=>({type:'text' as const,text}),c=(text:string)=>({type:'code' as const,text});

// 前端面试题（二）：JavaScript 核心。
export const feJsCore:FeInterviewQuestion[]=[
 {id:'fe-q-types',section:'JavaScript',title:'JavaScript 有哪些数据类型？如何准确判断类型？',blocks:[
  p('7 种原始类型：undefined、null、boolean、number、bigint、string、symbol；其余都是对象（包括数组、函数、日期）。原始值按值存储、不可变；对象按引用访问。'),
  p('判断：typeof 适合原始类型和函数，但 typeof null === "object"、typeof [] === "object"；数组用 Array.isArray；具体对象类型用 instanceof（跨 iframe 会失效）；最通用的是 Object.prototype.toString.call(x)，返回 "[object Array]" 这类字符串。'),
  c("typeof null              // 'object'（历史遗留）\nArray.isArray([])        // true\nObject.prototype.toString.call(new Date()) // '[object Date]'")]},
 {id:'fe-q-equality',section:'JavaScript',title:'== 和 === 有什么区别？',blocks:[
  p('=== 严格相等：类型不同直接 false，不做转换。== 会先做类型转换再比较，规则复杂：null == undefined 为 true，但它们和其他值都不相等；字符串和数字比较会把字符串转成数字；对象和原始值比较会调用 valueOf / toString。'),
  p('因此 "" == 0、"0" == false 都是 true，容易出错。工程上统一用 ===，只在判断“null 或 undefined”时可以写 x == null。NaN 和任何值都不相等，判断用 Number.isNaN；区分 +0 和 -0 用 Object.is。')]},
 {id:'fe-q-closure',section:'JavaScript',title:'什么是闭包？有什么用途和需要注意的地方？',blocks:[
  p('函数和它创建时所在的词法环境一起构成闭包：内部函数即使在外部函数返回之后执行，仍能访问外部函数的变量。原因是这些变量仍被内部函数引用，不会被回收。'),
  p('用途：封装私有状态（计数器、模块模式）、函数工厂、柯里化、防抖节流里保存定时器。注意：闭包会延长变量的生命周期，长期存活的闭包（全局事件监听、定时器）引用了大对象，就可能造成内存泄漏，用完要移除监听、清理定时器。'),
  c('function counter() {\n  let n = 0;           // 外部访问不到\n  return () => ++n;\n}\nconst next = counter();\nnext(); next();      // 2')]},
 {id:'fe-q-this',section:'JavaScript',title:'this 的指向是怎么确定的？',blocks:[
  p('普通函数的 this 由调用方式决定：obj.fn() 中 this 是 obj；直接调用 fn() 在严格模式下是 undefined（非严格模式是全局对象）；new Fn() 中是新创建的对象；call / apply / bind 显式指定。优先级：new > bind/call/apply > 对象调用 > 默认。'),
  p('箭头函数没有自己的 this，捕获定义时外层的 this，也不能用 call 改变。常见坑：把方法作为回调传出去（setTimeout(obj.fn)）会丢失 this，可以用箭头函数包一层或 bind。'),
  c("const obj = { name: 'a', say() { return this.name } };\nconst f = obj.say;\nf();               // 严格模式下报错：this 是 undefined\nobj.say();         // 'a'")]},
 {id:'fe-q-prototype',section:'JavaScript',title:'说说原型和原型链。',blocks:[
  p('每个对象都有一个内部链接 [[Prototype]]（可通过 Object.getPrototypeOf 获取）指向它的原型对象。访问属性时，先在对象自身找，找不到就沿原型一层层往上找，直到 null，这条链就是原型链。'),
  p('构造函数的 prototype 属性会成为 new 出来的实例的原型；class 只是基于原型的语法糖，extends 通过原型链实现继承。instanceof 判断的就是构造函数的 prototype 是否出现在对象的原型链上。共享在原型上的方法节省内存，但不要把可变的引用数据放在原型上，否则所有实例共享。')]},
 {id:'fe-q-hoisting',section:'JavaScript',title:'var、let、const 有什么区别？什么是暂时性死区？',blocks:[
  p('var 是函数作用域，会变量提升（声明提升、初始化为 undefined），可重复声明；let 和 const 是块级作用域，不可重复声明。const 声明时必须赋值且不能重新赋值，但对象内部属性仍可修改。'),
  p('let / const 也会被“提升”，但在声明语句执行前处于暂时性死区（TDZ），访问会抛 ReferenceError。经典面试题：for 循环里用 var 声明 i，setTimeout 里打印都是最终值；用 let 每轮都是新的绑定。'),
  c('for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3 3 3\nfor (let j = 0; j < 3; j++) setTimeout(() => console.log(j)); // 0 1 2')]},
 {id:'fe-q-event-loop',section:'JavaScript',title:'说说浏览器的事件循环，宏任务和微任务的执行顺序。',blocks:[
  p('JavaScript 在主线程上单线程执行。同步代码执行完后，先清空微任务队列（Promise 的 then/catch/finally 回调、queueMicrotask、MutationObserver），清空过程中新加的微任务也会在本轮执行；然后浏览器可能进行渲染；再取下一个宏任务（setTimeout、setInterval、I/O、用户事件、MessageChannel）执行，如此循环。'),
  p('所以 Promise.then 总是先于同一时刻注册的 setTimeout。await 后面的代码相当于放进了微任务。微任务里无限添加微任务会饿死渲染，页面卡住。'),
  c("console.log(1);\nsetTimeout(() => console.log(2));\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);\n// 输出：1 4 3 2")]},
 {id:'fe-q-promise',section:'JavaScript',title:'Promise 有哪些状态？all、allSettled、race、any 有什么区别？',blocks:[
  p('Promise 有 pending、fulfilled、rejected 三种状态，一旦从 pending 变成另外两种就不再改变。then 返回新的 Promise，可以链式调用；没有被处理的 rejection 会触发 unhandledrejection。'),
  p('Promise.all：全部成功才成功，有一个失败立即失败；allSettled：等全部结束，返回每个的结果和状态；race：第一个结束的（无论成败）决定结果，常用来做超时；any：第一个成功的决定结果，全部失败才失败（AggregateError）。'),
  c("const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), ms));\nawait Promise.race([fetch('/api'), timeout(3000)]);")]},
 {id:'fe-q-async-await',section:'JavaScript',title:'async/await 的原理是什么？如何正确处理错误和并发？',blocks:[
  p('async 函数总是返回 Promise；await 会暂停函数执行，等 Promise 完成后从微任务里恢复，本质是 Promise + 生成器式的状态机语法糖。错误用 try/catch 捕获，或在调用处 .catch。'),
  p('常见坑：互不依赖的请求逐个 await 会变成串行，应该先发起再 Promise.all；在 forEach 里 await 不会等待，要用 for...of 或 Promise.all(map)；忘记 await 会导致错误没被捕获。需要取消时配合 AbortController。'),
  c('// 串行：总耗时 = a + b\nconst a = await getUser(); const b = await getOrders();\n// 并行：总耗时 ≈ max(a, b)\nconst [user, orders] = await Promise.all([getUser(), getOrders()]);')]},
 {id:'fe-q-copy',section:'JavaScript',title:'深拷贝和浅拷贝有什么区别？如何实现深拷贝？',blocks:[
  p('浅拷贝只复制第一层，嵌套对象仍是同一个引用：展开运算符 {...obj}、Object.assign、Array.prototype.slice。深拷贝会递归复制所有层级，修改副本不影响原对象。'),
  p('现代浏览器和 Node 提供 structuredClone，支持 Date、Map、Set、循环引用，但不能复制函数和 DOM 节点。JSON.parse(JSON.stringify(x)) 会丢掉 undefined、函数、Symbol，把 Date 变成字符串，遇到循环引用直接报错。手写时要处理循环引用（用 WeakMap 记录已复制的对象）和特殊类型。')]},
 {id:'fe-q-debounce',section:'JavaScript',title:'防抖和节流有什么区别？分别怎么实现？',blocks:[
  p('防抖（debounce）：事件停止触发一段时间后才执行一次，期间再触发就重新计时，适合搜索框输入联想、窗口 resize 结束后计算。节流（throttle）：一段时间内最多执行一次，适合滚动加载、拖拽、高频上报。'),
  c('function debounce(fn, wait) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\nfunction throttle(fn, wait) {\n  let last = 0;\n  return function (...args) {\n    const now = Date.now();\n    if (now - last >= wait) { last = now; fn.apply(this, args); }\n  };\n}'),
  p('在 React 里要用 useRef 或 useMemo 保持同一个防抖函数，组件卸载时清除定时器。')]},
 {id:'fe-q-modules',section:'JavaScript',title:'ES Module 和 CommonJS 有什么区别？',blocks:[
  p('CommonJS（require / module.exports）是 Node 早期的模块方案：运行时同步加载，导出的是值的拷贝（准确说是 module.exports 对象），可以在条件语句里动态 require。ES Module（import / export）是语言标准：静态结构，编译期就能确定依赖，导出的是活的绑定（live binding），顶层支持 await。'),
  p('静态结构让打包工具可以做 Tree Shaking 删除未使用的导出。浏览器原生支持 ESM（type="module"），按需加载用动态 import()。Node 中两者互操作有限制：ESM 可以 import CJS，CJS require ESM 在新版本才有条件支持。')]},
 {id:'fe-q-gc',section:'JavaScript',title:'JavaScript 的垃圾回收机制，常见的内存泄漏有哪些？',blocks:[
  p('现代引擎主要用“标记清除”：从根（全局对象、调用栈）出发，标记所有可达对象，不可达的被回收；V8 还分新生代（Scavenge 复制算法，回收短命对象）和老生代（标记清除 + 标记整理，增量和并发执行以减少停顿）。引用计数因为循环引用问题基本不用了。'),
  p('常见泄漏：意外的全局变量；没有清除的定时器和事件监听；闭包长期持有大对象；被删除的 DOM 节点仍被 JS 引用；无限增长的缓存 Map。排查用 Chrome DevTools 的 Memory 面板，对比两次堆快照，查看 Detached DOM 和保留路径。缓存可用 WeakMap / WeakRef 避免阻止回收。')]},
 {id:'fe-q-call-apply',section:'JavaScript',title:'call、apply、bind 有什么区别？手写一个 bind。',blocks:[
  p('三者都用来指定函数执行时的 this。call(thisArg, a, b) 立即执行、参数逐个传；apply(thisArg, [a, b]) 立即执行、参数用数组传；bind(thisArg, a) 不执行，返回一个绑定了 this 和部分参数的新函数。bind 返回的函数被 new 调用时，this 指向新对象，绑定的 this 失效。'),
  c('Function.prototype.myBind = function (ctx, ...preset) {\n  const fn = this;\n  function bound(...args) {\n    // 被 new 调用时，this 是新实例\n    return fn.apply(this instanceof bound ? this : ctx, [...preset, ...args]);\n  }\n  bound.prototype = Object.create(fn.prototype);\n  return bound;\n};')]},
 {id:'fe-q-new',section:'JavaScript',title:'new 一个对象时发生了什么？',blocks:[
  p('1）创建一个新对象；2）把它的原型指向构造函数的 prototype；3）以这个新对象为 this 执行构造函数；4）如果构造函数返回了一个对象，就用这个对象作为结果，否则返回第 1 步创建的对象。箭头函数没有 prototype，不能被 new。'),
  c('function myNew(Ctor, ...args) {\n  const obj = Object.create(Ctor.prototype);\n  const result = Ctor.apply(obj, args);\n  return result !== null && (typeof result === "object" || typeof result === "function") ? result : obj;\n}')]},
];
