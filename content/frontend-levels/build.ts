import type {AiLevel} from '../journey';

// 前端高阶：工程化。
export const feBuild:AiLevel={id:'fe-build',title:'工程化：模块、构建与规范',summary:'ESM、Vite 与 Webpack、Tree Shaking、代码分割、样式隔离和代码规范',lessons:[
 {title:'模块化',body:'ES Module 用 import / export，结构静态，打包工具能分析依赖、删除没用的导出；CommonJS 用 require，运行时加载。浏览器原生支持 type="module"，按需加载用 import()。'},
 {title:'构建工具',body:'Webpack 开发时先打包再启动，配置灵活、生态成熟；Vite 开发时利用原生 ESM 按需编译，依赖用 esbuild 预构建，启动和热更新都很快，生产构建仍会打包。构建还负责转译（TS、JSX、新语法）、压缩、给文件名加内容哈希。'},
 {title:'Tree Shaking 和代码分割',body:'Tree Shaking 删除未使用的导出，前提是 ESM 且模块没有副作用（package.json 的 sideEffects）。代码分割用 import() 按路由、按大组件拆 chunk，首屏只加载必需代码；用 bundle 分析工具查看产物体积。',code:"const Editor = lazy(() => import('./Editor'));\n// vite.config.ts 中手动拆分第三方依赖\nbuild: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'] } } } }"},
 {title:'样式隔离和代码规范',body:'样式冲突用 CSS Modules、Vue scoped、BEM、Tailwind 或 Shadow DOM 解决。团队规范：ESLint 查问题、Prettier 统一格式、TypeScript 类型检查、提交前用 lint-staged 只检查改动文件，CI 里跑测试和构建，避免问题进入主分支。'},
],quiz:[
 {id:'fe-build-1',q:'Vite 开发服务器启动快的主要原因是？',options:['它跳过了 TypeScript 的转换','开发时不打包，浏览器按需请求编译','它要求开发机有更快的 CPU','它在开发时关闭了热更新'],why:['Vite 仍会转译 TypeScript（只是不做类型检查），并没有跳过。','','启动速度来自架构设计，与硬件无关。','Vite 的热更新同样很快，并没有关闭。'],answer:1,explain:'原生 ESM + 依赖预构建。',interview:'fe-q-bundler'},
 {id:'fe-build-2',type:'judge',q:'Vite 生产构建时也不打包，直接把每个源文件发给浏览器。',answer:false,explain:'生产环境仍要打包，大量零散请求性能不好。',interview:'fe-q-bundler'},
 {id:'fe-build-3',type:'multi',q:'下面哪些情况会让 Tree Shaking 失效？（多选）',options:['依赖包是 CommonJS 格式','模块顶层有副作用且未声明 sideEffects','import { debounce } from "lodash-es"','import _ from "lodash" 后只用一个函数'],why:['','','从 ESM 格式的 lodash-es 按需导入，其余函数可以被摇掉，这正是推荐写法。',''],answers:[0,1,3],explain:'按需从 ESM 包导入可以被摇掉其余部分。',interview:'fe-q-tree-shaking'},
 {id:'fe-build-4',q:'后台管理页面很少有人访问，但占了首页包体积的一半，应该？',options:['直接删掉这个后台管理页面','按路由用 import() 拆分出去','把所有代码合并成一个大文件','只压缩后台页面中用到的图片'],why:['删除功能不是优化，后台页面仍然需要。','','合并成一个文件会让首页包更大。','问题在 JS 体积，压缩图片解决不了首页包体积。'],answer:1,explain:'按路由分割，访问时才加载。',interview:'fe-q-code-split'},
 {id:'fe-build-5',type:'fill',q:'React 中把组件改成懒加载，用 React.____(() => import("./Chart"))。',accepted:['lazy'],explain:'配合 Suspense 显示加载状态。',interview:'fe-q-code-split'},
 {id:'fe-build-6',q:'ES Module 导出的是“活的绑定”，意思是？',options:['导出的是变量值的一份拷贝','导出方修改变量后，导入方读到最新值','每次 import 都会把模块重新执行一遍','ES Module 导出的内容都必须是函数'],why:['值拷贝是 CommonJS 的行为：导出后再修改，导入方看不到变化。','','模块只会执行一次，之后的 import 共享同一个实例。','ESM 可以导出变量、函数、类等任意绑定。'],answer:1,explain:'CommonJS 导出的是 module.exports 对象当时的值。',interview:'fe-q-modules'},
 {id:'fe-build-7',q:'给打包产物的文件名加上内容哈希（app.3f9a.js），主要是为了？',options:['让打包后的文件名看起来更规范','内容不变可长期缓存，变了就换文件名','对代码加密，防止被别人复制使用','通过改名来减小文件传输的体积'],why:['文件名中的哈希不是为了美观。','','哈希只是根据内容计算的摘要，代码本身仍是明文。','文件名不影响文件内容的体积。'],answer:1,explain:'这是长期缓存和版本更新兼得的做法。',interview:'fe-q-http-cache'},
 {id:'fe-build-8',type:'judge',q:'CSS Modules 会在构建时把类名改成带哈希的唯一名称，从而避免不同组件之间的样式冲突。',answer:true,explain:'类名局部化是最常见的隔离方式之一。',interview:'fe-q-css-modules'},
 {id:'fe-build-9',q:'团队希望提交代码前自动检查格式和规范，但只检查改动的文件，常用组合是？',options:['husky + lint-staged','只依靠人工代码评审','每次手动运行全量 ESLint','在提交前关闭 ESLint'],why:['','人工评审容易遗漏，也不能保证每次提交都检查。','全量检查随项目变大越来越慢，也依赖人记得去运行。','关闭检查与目标正好相反。'],answer:0,explain:'git hook 在提交前只对暂存的文件运行检查。'},
 {id:'fe-build-10',type:'short',q:'打包后的 JS 体积越来越大，你会怎么分析和优化？',reference:'先用 rollup-plugin-visualizer 或 webpack-bundle-analyzer 看清楚哪些模块最大；检查是否整包引入了大库（如 moment、lodash），换成按需导入或更轻的替代品（dayjs、lodash-es）；按路由和大组件做代码分割；确认依赖是 ESM、sideEffects 配置正确，让 Tree Shaking 生效；拆出稳定的第三方依赖便于长期缓存；去掉重复的依赖版本；在 CI 中加入体积预算，超出就报警。',points:['用分析工具找大模块','替换或按需引入大库','代码分割 + Tree Shaking','去重依赖，设置体积预算'],explain:'先看数据再动手。',interview:'fe-q-tree-shaking'},
]};
