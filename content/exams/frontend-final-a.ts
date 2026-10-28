import type {AiQuiz} from '../journey';

// 前端最终考试（一）：选择、判断、填空（覆盖全部关卡，难度最高）。
export const feFinalA:AiQuiz[]=[
 {id:'fe-f-1',q:'一个页面同时出现：CSS 放在 body 底部、同步脚本在 head、首屏图片懒加载。哪个对 LCP 伤害最大，为什么？',options:['CSS 在底部：只影响样式','同步脚本在 head：阻塞 HTML 解析，首屏内容迟迟无法开始渲染','首屏图片懒加载：完全不影响','三者都没有影响'],answer:1,explain:'三者都有害，其中阻塞解析的脚本影响最早、范围最大；首屏图片懒加载也会直接推迟 LCP。'},
 {id:'fe-f-2',q:'下面代码输出什么？',code:"const p = new Promise(r => { console.log('a'); r(); console.log('b'); });\np.then(() => console.log('c'));\nconsole.log('d');",options:['a b d c','a d b c','d a b c','a c b d'],answer:0,explain:'executor 同步执行，resolve 后的代码也会继续执行；then 回调是微任务。'},
 {id:'fe-f-3',q:'下面代码输出什么？',code:"function Foo() {}\nFoo.prototype.x = 1;\nconst a = new Foo();\nFoo.prototype = { x: 2 };\nconst b = new Foo();\nconsole.log(a.x, b.x, a instanceof Foo);",options:['1 2 false','2 2 true','1 2 true','1 1 false'],answer:0,explain:'a 的原型仍是旧对象；替换 prototype 后，旧实例的原型链上不再有新的 Foo.prototype，instanceof 为 false。'},
 {id:'fe-f-4',q:'React 中某个 Context 提供 { user, setTheme }，每次父组件渲染都新建这个对象。下面哪种改法最能减少无谓渲染？',options:['把 Context 换成全局变量','用 useMemo 缓存 value，并把常变的 user 和几乎不变的 setTheme 拆成两个 Context','给每个消费者加 key','改用 class 组件'],answer:1,explain:'按变化频率拆分 Context 是常用的性能手段。'},
 {id:'fe-f-5',q:'某接口的 HTML 页面设置了 Cache-Control: no-cache，带 ETag。下面哪种情况浏览器会显示 304？',options:['第一次访问','再次访问且服务器上的页面没有变化','服务器返回 500','用户清空了缓存'],answer:1,explain:'no-cache 表示每次都协商，内容没变返回 304。'},
 {id:'fe-f-6',q:'一个 TypeScript 函数参数类型是 unknown，下面哪种写法能安全地读取 value.name？',options:["(value as any).name","if (typeof value === 'object' && value !== null && 'name' in value) { value.name }","value!.name","String(value).name"],answer:1,explain:'先收窄到对象并确认属性存在；生产中常用 zod 做结构校验。'},
 {id:'fe-f-7',q:'评论区开启了 CSP 并禁止内联脚本，仍被攻击者通过 <img src=x onerror=...> 注入成功执行了脚本。最可能的原因是？',options:['CSP 不能防 XSS','CSP 配置了 unsafe-inline，或页面使用了不受 CSP 管控的方式（如旧浏览器）','img 标签不受 CSP 限制','onerror 不是脚本'],answer:1,explain:'内联事件处理器在严格 CSP 下会被拦截；同时仍应对内容做净化，CSP 只是纵深防御。'},
 {id:'fe-f-8',type:'multi',q:'关于浏览器存储和安全，下面哪些说法正确？（多选）',options:['HttpOnly Cookie 不能被 document.cookie 读取','SameSite=None 的 Cookie 必须同时设置 Secure','localStorage 的数据在不同子域名之间自动共享','sessionStorage 在同一个标签页刷新后仍然存在'],answers:[0,1,3],explain:'localStorage 按源隔离，子域名之间不共享。'},
 {id:'fe-f-9',type:'multi',q:'一个 SPA 首屏 6 秒，下面哪些措施能直接缩短 LCP？（多选）',options:['首屏主图 preload + fetchpriority="high"','服务端渲染首屏 HTML','路由级代码分割减少首屏 JS','给所有按钮加 hover 动画'],answers:[0,1,2],explain:'hover 动画与加载无关。'},
 {id:'fe-f-10',type:'multi',q:'下面哪些情况会创建新的层叠上下文？（多选）',options:['opacity: 0.5','transform: scale(1)','position: relative; z-index: 1','display: block'],answers:[0,1,2],explain:'普通的块级元素不会。'},
 {id:'fe-f-11',type:'multi',q:'关于 ES Module，下面哪些说法正确？（多选）',options:['import 声明会被提升，在模块代码执行前完成依赖加载','模块代码默认运行在严格模式','同一个模块被多次 import 只会执行一次','import 的绑定可以被导入方直接重新赋值'],answers:[0,1,2],explain:'导入的绑定是只读的。'},
 {id:'fe-f-12',type:'judge',q:'在 React 中，useEffect 的清理函数只会在组件卸载时执行一次。',answer:false,explain:'依赖变化导致 effect 重新执行之前，也会先执行上一次的清理函数。'},
 {id:'fe-f-13',type:'judge',q:'把一个对象传给 Web Worker 的 postMessage 时，默认会进行结构化克隆，Worker 拿到的是副本。',answer:true,explain:'ArrayBuffer 等可以通过 transfer 列表转移所有权，避免复制。'},
 {id:'fe-f-14',type:'judge',q:'Flex 容器设置 align-items: stretch（默认值）时，没有设置高度的子项会被拉伸到与容器交叉轴等高。',answer:true,explain:'这也是 sticky 子项在 flex 中失效的原因之一。'},
 {id:'fe-f-15',type:'judge',q:'Tree Shaking 能删除所有未被调用的函数，包括同一个模块内部被导出函数调用了的私有函数。',answer:false,explain:'被保留的导出所调用的内部函数也会被保留；它删除的是不可达的代码。'},
 {id:'fe-f-16',type:'judge',q:'只要前端隐藏了没有权限的菜单和按钮，就不需要在后端接口上再做权限校验。',answer:false,explain:'前端控制只是体验，安全必须由后端保证。'},
 {id:'fe-f-17',type:'fill',q:'在 JavaScript 中，判断一个值是否为“非数字”最可靠的方法是 Number.____(x)。',accepted:['isNaN'],explain:'全局 isNaN 会先做类型转换，isNaN("abc") 为 true。'},
 {id:'fe-f-18',type:'fill',q:'把一个对象冻结，使其属性不能新增、删除和修改（浅层），用 Object.____(obj)。',accepted:['freeze'],explain:'嵌套对象仍然可以修改，需要递归冻结。'},
 {id:'fe-f-19',type:'fill',q:'CSS 中让元素的宽高比固定为 16:9，用属性 aspect-____: 16 / 9。',accepted:['ratio'],explain:'为图片、视频预留尺寸，避免布局偏移。'},
 {id:'fe-f-20',type:'fill',q:'TypeScript 中，根据条件选择类型的语法 T extends U ? X : Y 叫做 ____ 类型。',accepted:['条件','conditional'],explain:'配合 infer 可以从类型中提取部分，比如 ReturnType 的实现。'},
];
