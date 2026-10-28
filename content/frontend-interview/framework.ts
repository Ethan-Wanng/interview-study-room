import type {FeInterviewQuestion} from './types';
const p=(text:string)=>({type:'text' as const,text}),c=(text:string)=>({type:'code' as const,text});

// 前端面试题（四）：框架（React / Vue）与 TypeScript。
export const feFramework:FeInterviewQuestion[]=[
 {id:'fe-q-vdom',section:'框架原理',title:'什么是虚拟 DOM？它一定比直接操作 DOM 快吗？',blocks:[
  p('虚拟 DOM 是用普通 JS 对象描述的 UI 结构。状态变化时，框架生成新的虚拟 DOM 树，和旧树比较（diff），算出最小的变更，再批量更新真实 DOM。'),
  p('它不一定比精心手写的 DOM 操作快，多了一层计算。它的价值在于：让开发者用声明式写法描述“UI 应该是什么样”，由框架保证更新正确且足够快；还能跨平台渲染（原生、Canvas、服务端字符串）。Svelte、Solid 等框架通过编译或细粒度响应式，可以不用虚拟 DOM。')]},
 {id:'fe-q-key',section:'框架原理',title:'列表渲染时 key 有什么作用？为什么不建议用下标？',blocks:[
  p('diff 时，同一层的子节点通过 key 判断“是不是同一个元素”：key 相同就复用并更新，不同就销毁重建。稳定的 key 让框架在插入、删除、移动时只做最少的 DOM 操作，并保留组件内部状态。'),
  p('用下标当 key，在列表头部插入或删除时，所有元素的下标都变了：框架会把错误的状态复用到错误的元素上，比如输入框里的内容错位、选中状态跑到别的行，还会触发不必要的更新。应该用数据本身的唯一 id。'),
  c('{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}')]},
 {id:'fe-q-hooks-rules',section:'框架原理',title:'React Hooks 为什么不能写在条件语句里？',blocks:[
  p('React 不是按名字记住每个 Hook 的状态，而是按调用顺序把状态存在组件对应的链表里：第一次渲染第 1 个 useState 对应链表第 1 项，以此类推。如果某个 Hook 写在 if 里，某次渲染它没被调用，后面所有 Hook 的顺序都会错位，读到别人的状态。'),
  p('所以规则是：只在函数组件或自定义 Hook 的顶层调用 Hook，不要放在条件、循环、嵌套函数里。条件逻辑放到 Hook 内部判断。eslint-plugin-react-hooks 能自动检查。')]},
 {id:'fe-q-useeffect',section:'框架原理',title:'useEffect 的依赖数组怎么写？清理函数什么时候执行？',blocks:[
  p('useEffect 在渲染提交后执行。依赖数组决定何时重新执行：不传每次渲染后都执行；[] 只在挂载后执行一次；[a, b] 在 a 或 b 变化后执行。依赖要写全，effect 里用到的会变化的值都要列出，否则拿到的是旧的闭包值。'),
  p('清理函数在下一次 effect 执行前、以及组件卸载时执行，用来取消订阅、清除定时器、abort 请求。开发模式的 StrictMode 会故意挂载 → 卸载 → 再挂载一次，用来暴露没写清理函数的问题。不需要副作用的派生计算，直接在渲染时算或用 useMemo，不要放进 effect 再 setState。'),
  c('useEffect(() => {\n  const id = setInterval(tick, 1000);\n  return () => clearInterval(id); // 卸载或依赖变化时清理\n}, [tick]);')]},
 {id:'fe-q-react-perf',section:'框架原理',title:'React 组件重复渲染怎么优化？',blocks:[
  p('父组件渲染，子组件默认都会重新渲染。先用 React DevTools Profiler 找到真正慢的组件，再优化：React.memo 让 props 没变的子组件跳过渲染；useMemo 缓存昂贵的计算结果；useCallback 保持回调函数引用稳定，配合 memo 子组件使用。'),
  p('更根本的手段：把状态下放到真正用它的组件，减少影响范围；拆分 Context，避免一个大 Context 变化导致所有消费者重渲染；长列表用虚拟滚动；耗时的更新用 useTransition 标记为非紧急。React Compiler 能自动做一部分记忆化。不要到处加 memo，它本身也有比较成本。')]},
 {id:'fe-q-vue-reactivity',section:'框架原理',title:'Vue 3 的响应式原理是什么？和 Vue 2 有什么不同？',blocks:[
  p('Vue 3 用 Proxy 代理整个对象：读取属性时（get）收集当前正在运行的副作用（组件渲染函数、computed、watch）作为依赖；修改属性时（set）通知这些依赖重新执行。ref 用对象的 value 属性包装原始值实现响应式。'),
  p('Vue 2 用 Object.defineProperty 逐个劫持已有属性：新增或删除属性、通过下标修改数组都无法自动检测，需要 Vue.set；初始化时要递归遍历所有属性。Proxy 能拦截新增、删除和数组操作，并且是懒代理（访问到嵌套对象时才代理），性能和能力都更好。')]},
 {id:'fe-q-csr-ssr',section:'框架原理',title:'CSR、SSR、SSG 有什么区别？怎么选？',blocks:[
  p('CSR（客户端渲染）：服务器返回几乎空的 HTML，浏览器下载 JS 后再渲染，首屏慢、SEO 差，但服务器压力小，适合后台系统。SSR（服务端渲染）：每次请求在服务器生成完整 HTML，首屏快、利于 SEO，然后在浏览器“水合”（hydration）绑定交互，服务器成本更高。SSG（静态生成）：构建时生成 HTML，放 CDN，最快最便宜，适合内容不常变的页面；ISR 可以定时增量重新生成。'),
  p('选择看内容是否需要 SEO、数据的实时性和个性化程度。Next.js、Nuxt 等框架可以按页面混用；React Server Components 进一步把只负责展示的组件留在服务端，减少发送到浏览器的 JS。')]},
 {id:'fe-q-state-mgmt',section:'框架原理',title:'前端状态管理怎么选？什么状态该放全局？',blocks:[
  p('先给状态分类：服务端数据（列表、详情）用 React Query / SWR 这类工具管理缓存、请求去重和失效刷新；URL 状态（筛选、分页）放在地址栏，便于分享和刷新；表单状态放表单库；只有真正跨页面共享的客户端状态（登录用户、主题、购物车）才放全局 store（Redux Toolkit、Zustand、Pinia）。'),
  p('不要把所有东西都塞进全局 store：会让组件耦合、调试困难、更新范围变大。局部状态尽量留在组件里，需要共享时再提升。')]},
 {id:'fe-q-component-comm',section:'框架原理',title:'组件之间有哪些通信方式？',blocks:[
  p('父传子：props。子传父：父组件传回调函数（React），或子组件 emit 事件（Vue）。兄弟组件：把状态提升到共同的父组件。跨多层：Context（React）或 provide / inject（Vue），适合主题、语言这类变化不频繁的数据。'),
  p('更复杂的共享状态用全局 store；与服务端数据相关的用数据请求库共享缓存。事件总线（EventBus）虽然灵活，但数据流向不清晰、容易忘记解绑，大型项目中尽量少用。')]},
 {id:'fe-q-ts-type-interface',section:'TypeScript',title:'TypeScript 中 type 和 interface 有什么区别？',blocks:[
  p('两者都能描述对象类型，大部分场景可以互换。interface 可以重复声明自动合并（适合给第三方库扩展类型），可以 extends；type 是类型别名，能表示联合类型、交叉类型、元组、映射类型、条件类型等任何类型。'),
  p('常见约定：描述对象结构、需要被扩展的公共 API 用 interface；需要联合、工具类型、函数类型等组合时用 type。团队统一风格比纠结哪个更好重要。'),
  c("interface User { id: number; name: string }\ninterface User { email?: string }        // 声明合并\ntype Status = 'idle' | 'loading' | 'done'; // 联合类型只能用 type\ntype Admin = User & { role: 'admin' };")]},
 {id:'fe-q-ts-any-unknown',section:'TypeScript',title:'any、unknown、never 有什么区别？',blocks:[
  p('any 关闭类型检查，可以赋给任何类型、调用任何方法，会把错误“传染”到别处，应尽量避免。unknown 是安全版的 any：任何值都能赋给它，但使用前必须先收窄类型（typeof、instanceof、自定义类型守卫），适合处理外部输入、JSON.parse 的结果。'),
  p('never 表示不可能出现的值：总是抛错的函数返回 never；联合类型被完全收窄后剩下 never。常用于穷尽检查：switch 的 default 分支把值赋给 never，新增联合成员却没处理时编译就会报错。'),
  c("function assertNever(x: never): never { throw new Error('未处理：' + x); }\nswitch (status) {\n  case 'idle': ...; case 'loading': ...; case 'done': ...;\n  default: assertNever(status);\n}")]},
 {id:'fe-q-ts-generics',section:'TypeScript',title:'TypeScript 泛型有什么用？举例说明约束和工具类型。',blocks:[
  p('泛型让函数、类型在保持类型安全的同时适用于多种类型：调用时根据参数推断出具体类型，而不是退化成 any。用 extends 给泛型加约束，比如要求有 length 属性；keyof 结合泛型可以安全地按属性名取值。'),
  p('内置工具类型都是泛型：Partial<T> 全部可选，Required<T> 全部必填，Pick<T, K> 挑选属性，Omit<T, K> 排除属性，Record<K, V> 构造对象类型，ReturnType<F> 取函数返回值类型。'),
  c('function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\ntype UserPatch = Partial<Pick<User, "name" | "email">>;')]},
];
