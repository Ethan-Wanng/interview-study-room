import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 6 集：从源码到上线的打包工厂（ES Module 与 CommonJS、Webpack 与 Vite、Tree Shaking、代码分割、内容哈希、样式隔离、代码规范与 CI）。
export const feLazy6:LazyEpisode={id:'lazy-fe-6',subject:'frontend',tier:2,levels:['fe-build'],icon:'🏗️',title:'打包工厂：几百个文件怎样变成一个快快的网站',summary:'项目越来越大，小芽走进前端工程化的打包工厂：模块化、Vite 为什么快、Tree Shaking 摇掉什么、代码分割、文件名哈希，以及让团队不吵架的规范和自动检查。',beats:[
 {say:'书店官网已经有了几百个文件。小芽改一行代码，要等半分钟页面才刷新；打包出来的 JS 有三 MB，手机上打开要好几秒。老冯说：该认真看看我们的打包工厂了。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('src','📁','几百个源文件',460,90,{kind:'item'})]},
 {say:'第一件事是模块化。每个文件是一个模块，用 import 引入别人，用 export 导出自己，这是 ES Module。老一些的 Node 代码用 require 和 module.exports，叫 CommonJS，它在运行时才加载，可以写在 if 里面。',add:[A('esm','📘','ES Module：import / export',460,210,{kind:'item',tone:'primary'})]},
 {say:'ES Module 有个大优点：结构是静态的，不用运行代码，工具就能看出谁依赖了谁、用到了哪些导出。这一点，后面的 Tree Shaking 全靠它。需要按需加载时，可以用动态的 import()，它返回一个 Promise。',bubble:{who:'esm',text:'静态结构，工具看得懂'}},
 {say:'第二件事是构建工具。老项目用 Webpack：开发时也要先把整个项目打成一个包才能启动，项目越大，等得越久。小芽把它换成了 Vite，启动只要一秒。为什么这么快？',drop:['esm'],add:[A('wp','🐢','Webpack：先全部打包',300,300,{kind:'tag',tone:'warm'}),A('vite','⚡','Vite：按需编译',540,300,{kind:'tag',tone:'ok'})]},
 {say:'因为 Vite 在开发时根本不打包你的代码：现代浏览器原生支持 ES Module，浏览器请求到哪个文件，Vite 才临时编译哪个。第三方依赖用一个叫 esbuild 的工具预先处理一次。改了一个文件，热更新只替换这一个模块，速度和项目大小几乎无关。',bubble:{who:'vite',text:'用到哪个编译哪个'}},
 {say:'但上线时，Vite 依然会打包。因为生产环境里，几百个零散的小文件请求太慢了。打包时还要做很多事：把 TypeScript 和 JSX 转成浏览器认识的代码，压缩体积，给每个文件名加上内容哈希。',drop:['wp','vite'],add:[A('build','📦','上线构建：转译 · 压缩 · 哈希',460,210,{kind:'item',tone:'primary'})]},
 {say:'第三件事，为什么包有三 MB？小芽打开打包分析工具，一眼就看到：整个 lodash 都被打了进去，可她只用了其中两个函数。Tree Shaking 本来能把没用到的导出摇掉，像摇树掉落枯叶一样，可这次没生效。',drop:['build'],add:[A('tree','🌳','Tree Shaking：摇掉没用的',460,210,{kind:'item',tone:'warm'})]},
 {say:'原因有三个常见的：第一，依赖是 CommonJS 格式，工具没法静态分析；第二，模块有副作用，比如顶层修改了全局变量，工具不敢删，可以在 package.json 里用 sideEffects 声明哪些文件没有副作用；第三，整个库一起导入。改成从 lodash-es 按需导入，包一下子小了一大截。',sub:{tree:'ESM + sideEffects + 按需导入'},tone:{tree:'ok'}},
 {say:'第四件事是代码分割。用户打开首页，根本用不到后台管理和富文本编辑器的代码，凭什么一起下载？按路由拆分：每个页面一个独立的文件，访问时才加载。又大又不常用的组件，用 React.lazy 加动态 import，等真正需要时再加载。',drop:['tree'],add:[A('split','✂️','按路由和大组件拆分',460,210,{kind:'item',tone:'primary'})]},
 {say:'用户很可能马上要去的页面，可以在浏览器空闲时提前预加载。但也别拆得太碎，几百个小文件同样拖慢速度。拆完之后，首页的 JS 从三 MB 降到了四百 KB。',sub:{split:'首页 3MB → 400KB'},tone:{split:'ok'}},
 {say:'第五件事是缓存。打包后的文件名形如 app.3f9a.js，中间那串字符是根据内容算出来的哈希。内容不变，文件名就不变，浏览器可以放心地缓存一年；内容一变，文件名跟着变，用户自然会下载新的。这就是“长期缓存又能及时更新”的秘诀。',drop:['split'],add:[A('hash','🔖','文件名哈希：长期缓存',460,210,{kind:'item',tone:'ok'})]},
 {say:'第六件事是样式冲突。两个组件都写了一个 .title，后加载的把前一个的样式也改了。办法有很多：CSS Modules 在构建时把类名改成独一无二的名字；Vue 的 scoped 样式；BEM 这样的命名约定；Tailwind 原子类；Shadow DOM 真正隔离。再用 @layer 管理第三方样式的优先级。',drop:['hash'],add:[A('css','🎨','CSS Modules · scoped · BEM',460,210,{kind:'tag',tone:'primary'})]},
 {say:'最后一件事，是让团队不再为代码风格吵架。ESLint 检查可疑的写法，Prettier 统一格式，TypeScript 检查类型；提交代码前，用 lint-staged 只检查改动过的文件；推送之后，流水线自动跑类型检查、测试、构建，还检查打包体积有没有超出预算。',drop:['css'],add:[A('ci','✅','ESLint · Prettier · CI · 体积预算',460,210,{kind:'item',tone:'ok'})]},
 {say:'两周后，小芽改一行代码，页面眨眼就刷新了；手机上打开首页只要一秒多。她在笔记里写下：ESM 是静态的，所以能摇树；Vite 开发不打包，上线才打包；按路由拆分，大组件懒加载；文件名带哈希，放心长期缓存；规范交给工具，体积交给预算。',drop:['ci','src'],tone:{ya:'ok'}},
 {say:'这一集的要点。',memo:['ESM 静态结构支持 Tree Shaking；Vite 开发按需编译，上线仍打包','代码分割 + 懒加载，文件名哈希长期缓存，规范与体积预算交给 CI']},
]};
