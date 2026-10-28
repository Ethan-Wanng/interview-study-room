import type {AiLevel} from '../journey';

// 前端入门 / 进阶：函数、对象与数组，DOM 与事件。
export const feFunc:AiLevel={id:'fe-func',title:'函数、对象与数组',summary:'箭头函数、解构、展开、数组方法和拷贝',lessons:[
 {title:'函数的写法',body:'函数声明 function add(a, b) {}、函数表达式、箭头函数 (a, b) => a + b。参数可以有默认值，剩余参数 ...args 收集多余参数。箭头函数没有自己的 this，适合写回调；对象的方法通常用普通写法。',code:'const add = (a, b = 1) => a + b;\nfunction sum(...nums) { return nums.reduce((s, n) => s + n, 0); }'},
 {title:'对象、解构和展开',body:'对象是键值对集合。解构可以一次取出多个属性：const { name, age = 18 } = user；展开 {...user, age: 20} 复制并覆盖属性。展开和 Object.assign 都是浅拷贝：嵌套对象仍然共享引用。需要深拷贝用 structuredClone。'},
 {title:'数组常用方法',body:'map 映射生成新数组，filter 过滤，find 找第一个，some / every 判断，reduce 汇总，includes 判断包含。push、pop、splice、sort 会修改原数组；新的 toSorted、toSpliced 返回新数组。React 等框架里更新状态要返回新数组，不能原地修改。',code:"const prices = items.filter(i => i.stock > 0).map(i => i.price);\nconst total = prices.reduce((s, p) => s + p, 0);"},
 {title:'call、apply、bind 与 new',body:'call 和 apply 用指定的 this 立即调用函数，区别是传参方式；bind 返回绑定了 this 的新函数。new 一个构造函数会：创建新对象、把原型指向构造函数的 prototype、以它为 this 执行构造函数、返回这个对象。'},
],quiz:[
 {id:'fe-func-1',q:'[1, 2, 3].map(x => x * 2) 的结果是？',options:['[1, 2, 3]','[2, 4, 6]','6','undefined'],answer:1,explain:'map 对每个元素执行函数，返回新数组。'},
 {id:'fe-func-2',q:'从商品数组中找出所有有库存的商品，用哪个方法？',options:['map','filter','find','reduce'],answer:1,explain:'filter 返回所有满足条件的元素；find 只返回第一个。'},
 {id:'fe-func-3',type:'judge',q:'const copy = {...user} 之后修改 copy.address.city，user.address.city 不会变。',answer:false,explain:'展开是浅拷贝，address 仍是同一个对象。',interview:'fe-q-copy'},
 {id:'fe-func-4',q:'下面哪种方式能完整深拷贝一个包含 Date 和 Map 的对象？',options:['{...obj}','Object.assign({}, obj)','JSON.parse(JSON.stringify(obj))','structuredClone(obj)'],answer:3,explain:'JSON 方案会把 Date 变字符串、丢掉 Map。',interview:'fe-q-copy'},
 {id:'fe-func-5',type:'multi',q:'下面哪些数组方法会修改原数组？（多选）',options:['push','sort','map','splice'],answers:[0,1,3],explain:'map 返回新数组。'},
 {id:'fe-func-6',type:'fill',q:'把数组 [1, 2, 3] 求和：arr.____((s, n) => s + n, 0)',accepted:['reduce'],explain:'reduce 把数组归纳成一个值。'},
 {id:'fe-func-7',q:'fn.call(obj, 1, 2) 和 fn.apply(obj, [1, 2]) 的区别是？',options:['call 不执行函数','传参方式不同，效果相同','apply 返回新函数','没有任何区别'],answer:1,explain:'都立即执行；call 逐个传参，apply 用数组。',interview:'fe-q-call-apply'},
 {id:'fe-func-8',q:'const { name, age = 18 } = { name: "Tom" } 之后 age 是？',options:['undefined','18','null','报错'],answer:1,explain:'属性不存在时使用解构默认值。'},
 {id:'fe-func-9',type:'judge',q:'箭头函数可以用 new 调用来创建实例。',answer:false,explain:'箭头函数没有 prototype，也没有自己的 this，不能 new。',interview:'fe-q-new'},
 {id:'fe-func-10',type:'short',q:'说说 new Person("Tom") 执行时发生了哪几步。',reference:'1）创建一个新的空对象；2）把它的原型指向 Person.prototype；3）以这个对象为 this 执行 Person 函数，给它添加属性；4）如果构造函数显式返回了一个对象就返回那个对象，否则返回第一步创建的新对象。',points:['创建新对象','原型指向构造函数的 prototype','以新对象为 this 执行构造函数','返回对象（显式返回对象时用它）'],explain:'这也是手写 new 的思路。',interview:'fe-q-new'},
]};

export const feDom:AiLevel={id:'fe-dom',title:'DOM 与事件',summary:'查找和修改元素、事件传播、事件委托、防抖节流',lessons:[
 {title:'查找和修改 DOM',body:'document.querySelector 找第一个匹配元素，querySelectorAll 找全部。修改文字用 textContent（不会解析 HTML，更安全），修改样式优先切换 class（classList.add / toggle），创建元素用 createElement 再 append。批量插入可以先放进 DocumentFragment。',code:"const btn = document.querySelector('#save');\nbtn.textContent = '保存中…';\nbtn.classList.add('loading');"},
 {title:'事件和传播',body:'addEventListener 绑定事件。事件先从上往下捕获，到达目标，再从下往上冒泡。event.target 是真正被点的元素，currentTarget 是绑定监听器的元素。preventDefault 阻止默认行为（链接跳转、表单提交），stopPropagation 阻止继续传播。'},
 {title:'事件委托',body:'在父元素上绑一个监听器，通过 event.target.closest(选择器) 找到真正点击的子元素。监听器少，新增的子元素也自动生效。注意 focus、blur 不冒泡，可以用 focusin、focusout。',code:"list.addEventListener('click', (e) => {\n  const li = e.target.closest('li[data-id]');\n  if (li) toggle(li.dataset.id);\n});"},
 {title:'防抖和节流',body:'输入、滚动、resize 事件触发得非常频繁。防抖：停止触发一段时间后才执行一次（搜索联想）。节流：一段时间内最多执行一次（滚动加载）。组件卸载或元素移除时，记得移除监听、清理定时器。'},
],quiz:[
 {id:'fe-dom-1',q:'找到页面上第一个 class 为 card 的元素，用？',options:["document.querySelector('.card')","document.getElementById('card')","document.querySelectorAll('card')","document.find('.card')"],answer:0,explain:'querySelector 接受 CSS 选择器，返回第一个匹配。'},
 {id:'fe-dom-2',q:'要把用户输入的昵称显示到页面上，更安全的写法是？',options:['el.innerHTML = name','el.textContent = name','document.write(name)','eval(name)'],answer:1,explain:'textContent 不会把内容当 HTML 解析，避免 XSS。',interview:'fe-q-xss'},
 {id:'fe-dom-3',q:'点击列表中的 li，事件冒泡的方向是？',options:['从 document 到 li','从 li 往上到 ul、body、document','只在 li 上','随机'],answer:1,explain:'冒泡从目标元素向上传播。',interview:'fe-q-event-delegation'},
 {id:'fe-dom-4',type:'multi',q:'事件委托的好处有哪些？（多选）',options:['监听器数量少','动态新增的子元素也能响应','所有事件都能冒泡','代码更集中'],answers:[0,1,3],explain:'并不是所有事件都冒泡，比如 focus。',interview:'fe-q-event-delegation'},
 {id:'fe-dom-5',type:'fill',q:'阻止表单提交后刷新页面，在提交事件里调用 event.____()。',accepted:['preventDefault'],explain:'preventDefault 阻止默认行为。'},
 {id:'fe-dom-6',q:'事件委托中，event.target 和 event.currentTarget 的区别是？',options:['完全相同','target 是真正触发的元素，currentTarget 是绑定监听器的元素','target 是父元素','currentTarget 永远是 document'],answer:1,explain:'委托时 currentTarget 是父元素，target 是被点的子元素。',interview:'fe-q-event-delegation'},
 {id:'fe-dom-7',q:'搜索框输入联想，希望用户停止输入 300ms 后才请求，应该用？',options:['节流','防抖','setInterval','事件委托'],answer:1,explain:'防抖在停止触发后执行一次。',interview:'fe-q-debounce'},
 {id:'fe-dom-8',type:'judge',q:'滚动加载更多数据，用节流让处理函数每 200ms 最多执行一次是合理的。',answer:true,explain:'节流保证固定频率执行。',interview:'fe-q-debounce'},
 {id:'fe-dom-9',q:'循环插入 1000 个 li 时，为了减少重排，比较好的做法是？',options:['每次插入后读取 offsetHeight','先放进 DocumentFragment，最后一次性插入','每次插入后 setTimeout','用 document.write'],answer:1,explain:'一次性插入只触发一次布局。',interview:'fe-q-reflow'},
 {id:'fe-dom-10',type:'code',q:'实现一个防抖函数 debounce(fn, wait)，并保证 this 和参数正确传递。',code:'function debounce(fn, wait) {\n  // 在这里实现\n}',reference:'function debounce(fn, wait) {\n  let timer = null;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => {\n      fn.apply(this, args);\n    }, wait);\n  };\n}',points:['用闭包保存定时器','每次触发先清除旧定时器','用普通函数接收 this，apply 转发','参数用剩余参数收集'],explain:'这是闭包和 this 的综合应用。',interview:'fe-q-debounce'},
]};
