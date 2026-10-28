import {A,type Story} from '../story';

// 前端面试题动画（四）：async/await、深浅拷贝、防抖节流、模块化、垃圾回收、call/apply/bind、new。
export const feD:Record<string,Story>={
 'fe-q-async-await':{title:'await 串行和并行：慢了一倍的页面',beats:[
  {say:'页面要加载用户信息（1 秒）和订单列表（1 秒）。写成两个连续的 await：先等用户，再等订单。',add:[A('u','👤','getUser 1s',150,80,{kind:'item'}),A('o','🧾','getOrders 1s',490,80,{kind:'item'})],send:[{from:'u',to:'o',text:'等完再发'}]},
  {say:'两个请求互不依赖，却排了队，总共 2 秒。',add:[A('t1','⏱️','串行：2 秒',320,200,{kind:'tag',tone:'bad'})]},
  {say:'改成先同时发起，再 await Promise.all：两个请求并行，总共约 1 秒。',drop:['t1'],add:[A('t2','⏱️','Promise.all：约 1 秒',320,200,{kind:'tag',tone:'ok'})],tone:{u:'ok',o:'ok'}},
  {say:'另一个坑：forEach 里写 await 不会等待。需要顺序执行用 for...of，并行就用 Promise.all(map)。错误用 try/catch 捕获。',add:[A('fe','⚠️','forEach 不等 await',320,310,{kind:'tag',tone:'warm'})]},
  {say:'记住要点。',memo:['互不依赖的请求要并行','forEach 不等 await，用 for...of']},
 ]},
 'fe-q-copy':{title:'浅拷贝：改了副本，原件也变了',beats:[
  {say:'原对象 user 里有一个嵌套对象 address。用展开运算符 {...user} 复制了一份。',add:[A('orig','📄','user（原件）',150,80,{kind:'item',tone:'primary'}),A('copy','📃','{...user}（副本）',490,80,{kind:'item'}),A('addr','🏠','address 对象',320,230,{kind:'item'})],send:[{from:'orig',to:'addr'},{from:'copy',to:'addr'}]},
  {say:'修改副本的 address.city，原件也跟着变了！因为浅拷贝只复制第一层，嵌套对象还是同一个。',tone:{orig:'bad'},bubble:{who:'orig',text:'我怎么也变了？'}},
  {say:'深拷贝用 structuredClone(user)：递归复制每一层，还支持 Date、Map、Set 和循环引用。',add:[A('sc','🧬','structuredClone',490,320,{kind:'tag',tone:'ok'})],tone:{orig:'ok'}},
  {say:'JSON.parse(JSON.stringify()) 会丢掉 undefined 和函数，把 Date 变成字符串，遇到循环引用直接报错。',add:[A('json','⚠️','JSON 方案有坑',150,320,{kind:'tag',tone:'warm'})]},
  {say:'记住区别。',memo:['浅拷贝只复制第一层','深拷贝用 structuredClone']},
 ]},
 'fe-q-debounce':{title:'防抖和节流：电梯和地铁',beats:[
  {say:'用户在搜索框里飞快地打字，每敲一个键都发一次请求，服务器吃不消。',add:[A('in','⌨️','连续输入',110,170,{tone:'primary'}),A('api','🖥️','搜索接口',530,170,{kind:'item',tone:'bad'})],send:[{from:'in',to:'api',text:'g'},{from:'in',to:'api',text:'go'}]},
  {say:'防抖像电梯：有人进来就重新计时关门。停止输入 300 毫秒后才发一次请求。',add:[A('db','🛗','防抖：停下才执行',320,60,{kind:'tag',tone:'ok'})],tone:{api:'ok'}},
  {say:'节流像地铁：不管多少人，每隔固定时间发一班车。滚动加载、拖拽用节流，每 200 毫秒最多执行一次。',add:[A('th','🚇','节流：固定间隔执行',320,290,{kind:'tag',tone:'ok'})]},
  {say:'实现上防抖每次清掉旧定时器再设新的；节流记录上次执行时间。React 里要用 useRef 保持同一个函数，卸载时清除定时器。',bubble:{who:'in',text:'终于不刷屏了'}},
  {say:'记住区别。',memo:['防抖：停止触发后执行一次','节流：每段时间最多执行一次']},
 ]},
 'fe-q-modules':{title:'ES Module 和 CommonJS',beats:[
  {say:'CommonJS 用 require 和 module.exports，运行时才加载，可以写在 if 里动态加载。',add:[A('cjs','📦','CommonJS：require',150,80,{kind:'item'})]},
  {say:'ES Module 用 import 和 export，结构是静态的：不运行代码，打包工具就能知道谁依赖了谁。',add:[A('esm','📘','ESM：import',490,80,{kind:'item',tone:'primary'})]},
  {say:'正因为静态，打包时能把没用到的导出删掉，这就是 Tree Shaking，打出来的包更小。',add:[A('ts','🌳','Tree Shaking',490,220,{kind:'tag',tone:'ok'})],send:[{from:'esm',to:'ts'}]},
  {say:'ESM 导出的是“活的绑定”，导出方修改了值，导入方能看到最新的；按需加载用动态 import()。',add:[A('dyn','⚡','import() 按需加载',150,220,{kind:'tag',tone:'primary'})]},
  {say:'记住区别。',memo:['CJS 运行时加载，ESM 静态结构','ESM 支持 Tree Shaking 和动态 import()']},
 ]},
 'fe-q-gc':{title:'垃圾回收：从根出发，找不到的就扔掉',beats:[
  {say:'垃圾回收器从“根”出发：全局对象和正在执行的函数里的变量。',add:[A('root','🌱','根：全局 · 调用栈',110,170,{kind:'item',tone:'primary'})]},
  {say:'顺着引用能找到的对象都被标记为“还在用”。',add:[A('a','📦','对象 A',330,80,{kind:'tag',tone:'ok'}),A('b','📦','对象 B',330,260,{kind:'tag',tone:'ok'})],send:[{from:'root',to:'a'},{from:'root',to:'b'}]},
  {say:'找不到的对象 C 就是垃圾，被清除。这叫标记清除；V8 还把对象分成新生代和老生代，用不同的算法回收。',add:[A('c','🗑️','对象 C（无引用）',530,170,{kind:'tag',tone:'bad'})]},
  {say:'泄漏的本质是“不用了但还被引用”：忘了移除的事件监听、没清理的定时器、全局缓存只增不删、被删掉的 DOM 还被变量拽着。',tone:{c:'quiet'},bubble:{who:'b',text:'我被忘了\n但还被拽着'}},
  {say:'记住要点。',memo:['从根出发，不可达即回收','泄漏 = 不用了但仍被引用']},
 ]},
 'fe-q-call-apply':{title:'call、apply、bind',beats:[
  {say:'函数 greet 里用到了 this.name。现在想让它以 user 的身份执行。',add:[A('fn','🗣️','greet(greeting)',150,100,{kind:'item',tone:'primary'}),A('user','🧑','user',490,100)]},
  {say:'call：立刻执行，参数一个个传：greet.call(user, "你好")。',add:[A('call','📞','call(user, a, b)',150,240,{kind:'tag',tone:'ok'})],send:[{from:'fn',to:'user',text:'this = user'}]},
  {say:'apply：也立刻执行，但参数放进数组：greet.apply(user, ["你好"])。',add:[A('apply','📋','apply(user, [a, b])',490,240,{kind:'tag',tone:'ok'})]},
  {say:'bind：不执行，返回一个绑定好 this 的新函数，常用于回调。被 new 调用时，绑定的 this 会失效。',add:[A('bind','🔗','bind → 新函数',320,320,{kind:'tag',tone:'primary'})]},
  {say:'记住区别。',memo:['call、apply 立即执行，传参方式不同','bind 返回新函数']},
 ]},
 'fe-q-new':{title:'new 的四个步骤',beats:[
  {say:'执行 new Person("Tom")。第一步：创建一个空对象。',add:[A('obj','📦','{}',320,70,{kind:'item',tone:'primary'})]},
  {say:'第二步：把这个对象的原型指向 Person.prototype，这样它就能用原型上的方法。',add:[A('proto','📘','Person.prototype',110,200,{kind:'item'})],send:[{from:'obj',to:'proto',text:'原型'}]},
  {say:'第三步：以这个对象为 this 执行构造函数，this.name = "Tom" 就写到了新对象上。',add:[A('ctor','⚙️','Person 构造函数',530,200,{kind:'item'})],send:[{from:'ctor',to:'obj',text:'this.name'}],sub:{obj:'{ name: "Tom" }'}},
  {say:'第四步：构造函数如果返回了一个对象就用它，否则返回刚创建的对象。箭头函数没有 prototype，不能 new。',tone:{obj:'ok'},bubble:{who:'obj',text:'我就是 Tom'}},
  {say:'记住四步。',memo:['建对象 → 连原型','执行构造函数 → 返回对象']},
 ]},
};
