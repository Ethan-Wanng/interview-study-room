import {A,type Story} from '../story';

// 前端面试题动画（七）：虚拟 DOM、key、Hooks 规则、useEffect、React 性能、Vue 响应式。
export const feG:Record<string,Story>={
 'fe-q-vdom':{title:'虚拟 DOM：先在草稿上改，再誊到墙上',beats:[
  {say:'状态变了，框架不直接动真实 DOM，而是先生成一棵新的虚拟 DOM 树——普通的 JS 对象，像一张草稿。',add:[A('old','📝','旧虚拟树',150,80,{kind:'item'}),A('neo','📝','新虚拟树',490,80,{kind:'item',tone:'primary'})]},
  {say:'diff：比较新旧两棵树，找出真正变化的地方，比如只有一个文字变了。',add:[A('diff','🔍','diff：只改一处',320,190,{kind:'tag',tone:'warm'})],send:[{from:'old',to:'diff'},{from:'neo',to:'diff'}]},
  {say:'把这一处变化批量更新到真实 DOM 上，其他地方不动。',add:[A('dom','🖼️','真实 DOM',320,300,{kind:'item',tone:'ok'})],send:[{from:'diff',to:'dom',text:'patch'}]},
  {say:'它不一定比手写 DOM 操作快，但让你只需描述“界面应该是什么样”，框架保证更新正确又够快，还能渲染到其他平台。',bubble:{who:'dom',text:'只动了一处'}},
  {say:'记住虚拟 DOM。',memo:['新旧树 diff，批量更新','价值是声明式和跨平台']},
 ]},
 'fe-q-key':{title:'key：用下标当 key 会发生什么',beats:[
  {say:'待办列表有三项：买菜、洗衣、读书，用下标 0、1、2 当 key。每项旁边有个输入框，用户在“买菜”里写了备注。',add:[A('a','🥬','0：买菜（有备注）',320,70,{kind:'tag',tone:'primary'}),A('b','👕','1：洗衣',320,160,{kind:'tag'}),A('c','📚','2：读书',320,250,{kind:'tag'})]},
  {say:'现在在最前面插入“跑步”。下标全变了：跑步变成 0，买菜变成 1……',add:[A('n','🏃','0：跑步（新）',110,70,{kind:'tag',tone:'warm'})]},
  {say:'框架按 key 复用：key 0 原来那个带备注的输入框，被复用给了“跑步”。备注跑错了地方！',tone:{n:'bad',a:'bad'},bubble:{who:'n',text:'这备注不是我的'}},
  {say:'改用数据自己的 id 当 key，框架就知道是“插入了一个新项”，其他项原样保留，状态不会错位。',tone:{n:'ok',a:'ok'},sub:{n:'key = todo.id'}},
  {say:'记住 key 的作用。',memo:['key 判断是不是同一个元素','用稳定的 id，别用下标']},
 ]},
 'fe-q-hooks-rules':{title:'Hooks 为什么不能写在 if 里',beats:[
  {say:'React 按调用顺序记住每个 Hook：第 1 个 useState 存在第 1 格，第 2 个存在第 2 格。',add:[A('s1','1️⃣','格 1：name',150,80,{kind:'tag',tone:'primary'}),A('s2','2️⃣','格 2：age',320,80,{kind:'tag',tone:'primary'}),A('s3','3️⃣','格 3：theme',490,80,{kind:'tag',tone:'primary'})]},
  {say:'如果第 2 个 Hook 写在 if 里，这次渲染条件为假，它没被调用。',add:[A('if','❓','if (show) useState(age)',320,200,{kind:'tag',tone:'warm'})],tone:{s2:'quiet'}},
  {say:'于是原本的第 3 个 Hook 拿到了第 2 格的数据——theme 读到了 age，全乱了。',tone:{s3:'bad'},bubble:{who:'s3',text:'我怎么成了 age？'}},
  {say:'规则：只在组件或自定义 Hook 的顶层调用 Hook。条件判断放到 Hook 内部；eslint 插件会帮你检查。',add:[A('rule','📏','只在顶层调用',320,310,{kind:'tag',tone:'ok'})],tone:{s3:'ok',s2:'ok'}},
  {say:'记住规则。',memo:['Hook 状态按调用顺序存储','不放进条件、循环和嵌套函数']},
 ]},
 'fe-q-useeffect':{title:'useEffect：依赖和清理',beats:[
  {say:'组件要每秒刷新一次时间。在 useEffect 里开一个定时器。',add:[A('comp','🧩','时钟组件',150,170,{kind:'item',tone:'primary'}),A('timer','⏱️','setInterval',490,100,{kind:'item'})],send:[{from:'comp',to:'timer',text:'开启'}]},
  {say:'依赖数组决定什么时候重新执行：[] 只在挂载后一次；写上用到的变量，变化时重新执行。漏写依赖会读到旧值。',add:[A('deps','📋','依赖数组写全',490,250,{kind:'tag',tone:'warm'})]},
  {say:'组件卸载时如果不清理，定时器还在跑，还会对已卸载的组件 setState，造成泄漏。',tone:{timer:'bad'},bubble:{who:'timer',text:'组件没了我还在'}},
  {say:'返回一个清理函数 clearInterval：在下次执行前和卸载时都会调用。开发模式的严格模式会故意挂载两次，帮你发现漏写清理。',add:[A('clean','🧹','return 清理函数',150,310,{kind:'tag',tone:'ok'})],tone:{timer:'ok'}},
  {say:'记住要点。',memo:['依赖写全，避免读到旧值','订阅和定时器要返回清理函数']},
 ]},
 'fe-q-react-perf':{title:'子组件为什么总在重渲染',beats:[
  {say:'父组件里有个输入框，每输入一个字，父组件重新渲染，下面一个很重的图表子组件也跟着重新渲染，页面卡顿。',add:[A('p','👨','父组件（输入框）',320,70,{kind:'item',tone:'primary'}),A('chart','📊','重的图表组件',320,210,{kind:'item',tone:'bad'})],send:[{from:'p',to:'chart',text:'每次都渲染'}]},
  {say:'先用 Profiler 确认瓶颈，再用 React.memo 包住图表：props 没变就跳过渲染。',add:[A('memo','🧠','React.memo',110,320,{kind:'tag',tone:'ok'})]},
  {say:'可父组件每次都创建新的回调函数和新数组，memo 比较总是“变了”。用 useCallback 和 useMemo 保持引用稳定。',add:[A('cb','🔗','useCallback · useMemo',490,320,{kind:'tag',tone:'ok'})],tone:{chart:'ok'}},
  {say:'更根本的办法：把输入框的状态下放到它自己的小组件里，图表根本不受影响。',bubble:{who:'chart',text:'终于安静了'}},
  {say:'记住优化思路。',memo:['先 Profiler 找瓶颈','memo + 稳定引用，状态下放']},
 ]},
 'fe-q-vue-reactivity':{title:'Vue 3 响应式：读的时候登记，改的时候通知',beats:[
  {say:'reactive 用 Proxy 包住一个对象 state = { count: 0 }。',add:[A('proxy','🪞','Proxy(state)',320,70,{kind:'item',tone:'primary'})]},
  {say:'组件渲染时读取了 state.count，Proxy 的 get 拦截到，把“这个渲染函数”登记为 count 的依赖。',add:[A('render','🖼️','渲染函数',120,220,{kind:'item'})],send:[{from:'render',to:'proxy',text:'读 count'}],sub:{proxy:'登记依赖'}},
  {say:'点击按钮执行 state.count++，set 拦截到，通知所有登记过的依赖重新执行，页面更新。',add:[A('btn','🔘','count++',520,220,{kind:'tag',tone:'warm'})],send:[{from:'btn',to:'proxy'},{from:'proxy',to:'render',text:'通知更新',tone:'ok'}],tone:{render:'ok'}},
  {say:'Vue 2 用 Object.defineProperty 逐个劫持已有属性，新增属性和数组下标赋值检测不到；Proxy 能拦截这些操作，还是懒代理。',add:[A('v2','📜','Vue 2：defineProperty',320,320,{kind:'tag'})]},
  {say:'记住原理。',memo:['get 收集依赖，set 触发更新','Proxy 比 defineProperty 能拦截更多']},
 ]},
};
