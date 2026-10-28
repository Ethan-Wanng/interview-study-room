import {A,type Story} from '../story';

// 前端面试题动画（八）：渲染模式、状态管理、组件通信、TypeScript。
export const feH:Record<string,Story>={
 'fe-q-csr-ssr':{title:'CSR、SSR、SSG：页面在哪里做好',beats:[
  {say:'CSR：服务器只给一个空壳 HTML，浏览器下载完 JS 再渲染。首屏白一会儿，搜索引擎也看不到内容。',add:[A('csr','📦','CSR：浏览器现做',110,80,{kind:'item',tone:'warm'})]},
  {say:'SSR：每次请求，服务器把页面做好再发过来，首屏快、利于 SEO；然后浏览器“水合”，绑上交互。',add:[A('ssr','🍳','SSR：服务器现做',320,80,{kind:'item',tone:'primary'})]},
  {say:'SSG：构建时就把页面做好放到 CDN，最快最省，适合文档、博客这类不常变的内容。',add:[A('ssg','🥫','SSG：提前做好',530,80,{kind:'item',tone:'ok'})]},
  {say:'怎么选：后台系统用 CSR；商品页、新闻这种要 SEO 又常变的用 SSR；内容稳定的用 SSG。Next.js、Nuxt 能按页面混用。',add:[A('pick','🧭','按 SEO 和实时性选',320,250,{kind:'tag'})]},
  {say:'记住三种模式。',memo:['CSR 浏览器渲染，SSR 每次服务端渲染','SSG 构建时生成，可按页面混用']},
 ]},
 'fe-q-state-mgmt':{title:'状态该放哪里',beats:[
  {say:'一个电商页面有很多状态。先分类，再决定放哪里。',add:[A('page','🛒','电商页面',320,170,{kind:'item',tone:'primary'})]},
  {say:'商品列表、详情是服务端数据：交给 React Query、SWR 管理缓存、去重和自动刷新。',add:[A('server','🌐','服务端数据 → Query',120,70,{kind:'tag',tone:'ok'})]},
  {say:'筛选条件和页码放在 URL 里，刷新和分享都不丢。',add:[A('url','🔗','筛选 → URL',520,70,{kind:'tag',tone:'ok'})]},
  {say:'只有登录用户、购物车这类跨页面共享的客户端状态，才放全局 store。弹窗开关这种局部状态留在组件里。',add:[A('store','🏪','全局：用户 · 购物车',120,290,{kind:'tag',tone:'primary'}),A('local','🧩','局部：留在组件',520,290,{kind:'tag'})]},
  {say:'记住分类。',memo:['服务端数据交给数据请求库','URL、局部、全局各归其位']},
 ]},
 'fe-q-component-comm':{title:'组件之间怎么传话',beats:[
  {say:'父组件用 props 把数据传给子组件。',add:[A('p','👨','父组件',320,60,{kind:'item',tone:'primary'}),A('c1','👦','子组件 A',150,190,{kind:'item'}),A('c2','👧','子组件 B',490,190,{kind:'item'})],send:[{from:'p',to:'c1',text:'props'}]},
  {say:'子组件要通知父组件，就调用父组件传下来的回调（Vue 里是 emit 事件）。',send:[{from:'c1',to:'p',text:'onChange'}]},
  {say:'兄弟 A 和 B 要共享数据：把状态提升到共同的父组件，再分别传下去。',send:[{from:'p',to:'c2',text:'同一份数据'}],tone:{c2:'ok'}},
  {say:'隔了很多层就用 Context 或 provide / inject；复杂的共享状态用全局 store。事件总线虽然方便，但数据流向不清楚，尽量少用。',add:[A('ctx','📡','Context · store',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住通信方式。',memo:['props 向下，回调 / emit 向上','兄弟提升状态，跨层用 Context']},
 ]},
 'fe-q-ts-type-interface':{title:'type 和 interface',beats:[
  {say:'interface User 描述一个对象的结构。再写一个同名的 interface User，两个会自动合并。',add:[A('i1','📘','interface User',150,80,{kind:'item',tone:'primary'}),A('i2','📘','interface User（再声明）',150,220,{kind:'item'})],send:[{from:'i2',to:'i1',text:'合并'}]},
  {say:'type 是类型别名，能表示任何类型：联合 "idle" | "loading"、元组、函数类型、交叉类型。',add:[A('t','📗','type Status = A | B',490,150,{kind:'item',tone:'ok'})]},
  {say:'它不能重复声明合并，但可以用 & 组合，配合工具类型做各种变换。',bubble:{who:'t',text:'联合类型归我管'}},
  {say:'约定：对外的对象结构、要被扩展的用 interface；联合、组合和工具类型用 type。团队统一风格最重要。',add:[A('rule','🤝','团队统一',320,320,{kind:'tag'})]},
  {say:'记住区别。',memo:['interface 可声明合并','type 能写联合、元组、条件类型']},
 ]},
 'fe-q-ts-any-unknown':{title:'any、unknown、never',beats:[
  {say:'接口返回的数据先是 any：想怎么用都行，写错字段名也不报错，错误一路传染到别处。',add:[A('any','🙈','any：关闭检查',150,80,{kind:'item',tone:'bad'})]},
  {say:'换成 unknown：什么值都能放进来，但用之前必须先判断类型，编译器才放行。',add:[A('unk','🔒','unknown：先收窄再用',490,80,{kind:'item',tone:'ok'})],bubble:{who:'unk',text:'先告诉我是什么'}},
  {say:'用 typeof、instanceof 或自定义类型守卫收窄后，就能安全地使用了。',add:[A('guard','🔍','类型守卫',490,220,{kind:'tag',tone:'ok'})],send:[{from:'unk',to:'guard'}]},
  {say:'never 表示不可能出现的值。switch 的 default 里把值赋给 never：联合类型新增成员却忘了处理，编译直接报错。',add:[A('nev','🚫','never：穷尽检查',150,280,{kind:'tag',tone:'primary'})]},
  {say:'记住三者。',memo:['any 放弃检查，少用','unknown 先收窄，never 做穷尽检查']},
 ]},
 'fe-q-ts-generics':{title:'泛型：类型也能当参数',beats:[
  {say:'写一个取对象属性的函数。如果参数用 any，返回值也是 any，类型信息全丢了。',add:[A('fn','⚙️','getProp(obj, key)',320,70,{kind:'item',tone:'warm'})]},
  {say:'改成泛型 getProp<T, K extends keyof T>(obj: T, key: K): T[K]。T 是对象类型，K 只能是它已有的属性名。',sub:{fn:'<T, K extends keyof T>'},tone:{fn:'primary'}},
  {say:'调用 getProp(user, "name")，编译器推断出返回 string；写成 "nmae" 直接报错。',add:[A('ok','✅','返回 string',150,230,{kind:'tag',tone:'ok'}),A('err','❌','"nmae" 报错',490,230,{kind:'tag',tone:'bad'})]},
  {say:'内置工具类型都是泛型：Partial 全部可选、Pick 挑选、Omit 排除、Record 构造对象、ReturnType 取返回值。',add:[A('util','🧰','Partial · Pick · Omit',320,320,{kind:'tag'})]},
  {say:'记住泛型。',memo:['类型参数，调用时推断','extends 约束，工具类型都是泛型']},
 ]},
};
