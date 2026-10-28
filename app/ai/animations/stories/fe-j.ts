import {A,type Story} from '../story';

// 前端面试题动画（十）：图片优化、大文件上传、前端监控、权限、微前端、组件设计。
export const feJ:Record<string,Story>={
 'fe-q-image-opt':{title:'一张图片的瘦身之旅',beats:[
  {say:'设计师给了一张 4000 像素宽、5MB 的 PNG 主图，手机上只显示 400 像素宽。',add:[A('img','🖼️','原图 5MB PNG',320,70,{kind:'item',tone:'bad'})]},
  {say:'格式：照片转成 WebP 或 AVIF，体积小很多；图标用 SVG。',add:[A('fmt','🔄','WebP / AVIF',120,190,{kind:'tag',tone:'ok'})]},
  {say:'尺寸：准备 400、800、1600 三种宽度，用 srcset 和 sizes 让浏览器按屏幕挑最合适的。',add:[A('src','📐','srcset · sizes',520,190,{kind:'tag',tone:'ok'})],tone:{img:'ok'},sub:{img:'手机只下 40KB'}},
  {say:'加载：首屏主图 fetchpriority="high"，下面的图片 loading="lazy"；写上宽高，避免加载时页面跳动。',add:[A('load','⏬','lazy · 预留宽高',320,300,{kind:'tag',tone:'primary'})]},
  {say:'记住图片优化。',memo:['新格式 + 按尺寸输出','首图优先，其余懒加载，预留宽高']},
 ]},
 'fe-q-big-upload':{title:'上传 2GB 视频：分片、续传、秒传',beats:[
  {say:'一次性上传 2GB 文件，网络一断就要从头再来。先用 file.slice 把它切成 5MB 一块。',add:[A('file','🎞️','2GB 视频',110,170,{kind:'item',tone:'primary'}),A('chunks','🧩','5MB 分片 × 400',320,70,{kind:'tag'})],send:[{from:'file',to:'chunks',text:'slice'}]},
  {say:'在 Web Worker 里计算文件哈希作为唯一标识，主线程不卡。',add:[A('hash','🔑','Worker 算哈希',320,280,{kind:'tag',tone:'ok'})]},
  {say:'上传前先问服务器：这个哈希有哪些分片了？已有完整文件就直接成功（秒传）；只缺一部分就只传缺的（断点续传）。',add:[A('srv','🖥️','服务器',540,170,{kind:'item'})],send:[{from:'hash',to:'srv',text:'有哪些？'}],bubble:{who:'srv',text:'还缺 120 片'}},
  {say:'控制并发同时传 4 片，失败的重试，全部到齐后服务端合并并校验。用户能暂停、继续，看到进度。',send:[{from:'chunks',to:'srv',text:'并发 4',tone:'ok'}],tone:{srv:'ok'}},
  {say:'记住大文件上传。',memo:['分片 + 哈希标识','秒传、断点续传、并发重试']},
 ]},
 'fe-q-monitor':{title:'前端监控：线上出错第一时间知道',beats:[
  {say:'线上页面白屏了，但开发自己的电脑上一切正常。没有监控，只能等用户投诉。',add:[A('page','📄','线上页面',110,170,{kind:'item',tone:'bad'})]},
  {say:'采集错误：window.onerror、unhandledrejection、资源加载失败，以及框架的错误边界。',add:[A('err','🐞','错误采集',320,70,{kind:'tag',tone:'primary'})],send:[{from:'page',to:'err'}]},
  {say:'采集性能和行为：LCP、INP、CLS，页面访问和关键点击。用 sendBeacon 上报，页面关闭也能发出去，并做采样。',add:[A('perf','📊','性能 · 行为',320,270,{kind:'tag',tone:'primary'})],send:[{from:'page',to:'perf'}]},
  {say:'压缩后的代码看不懂报错位置，上传 source map 到监控平台还原源码行号；按版本聚合、设置告警。',add:[A('plat','🛰️','监控平台 + 告警',540,170,{kind:'item',tone:'ok'})],send:[{from:'err',to:'plat'},{from:'perf',to:'plat'}],tone:{page:'ok'}},
  {say:'记住监控三件事。',memo:['错误、性能、行为','source map 还原，聚合告警']},
 ]},
 'fe-q-auth-route':{title:'前端权限：藏起来不等于锁上',beats:[
  {say:'用户登录后，前端从后端拿到他的角色和权限列表。',add:[A('u','🧑','普通员工',110,170,{tone:'primary'}),A('perm','📜','权限列表',320,70,{kind:'item'})]},
  {say:'根据权限生成菜单和路由：没有“财务”权限，菜单里就不显示，直接访问地址也会被路由守卫拦到 403。',add:[A('guard','🚧','路由守卫 → 403',320,190,{kind:'tag',tone:'warm'})]},
  {say:'按钮级别也一样：没有删除权限，删除按钮不显示。',add:[A('btn','🔘','按钮按权限显示',320,290,{kind:'tag'})]},
  {say:'但是有人直接用工具调接口——前端藏起来的按钮挡不住他。真正的权限校验必须在后端每个接口上做。',add:[A('api','🔐','后端接口校验',540,170,{kind:'item',tone:'ok'})],send:[{from:'u',to:'api',text:'直接调接口',tone:'bad'}],bubble:{who:'api',text:'没权限，拒绝'}},
  {say:'记住原则。',memo:['前端控制菜单、路由、按钮','安全以后端校验为准']},
 ]},
 'fe-q-micro-frontend':{title:'微前端：一个大平台拆成几个小应用',beats:[
  {say:'公司的管理平台越来越大，五个团队改同一个仓库，每次发布都要互相等。',add:[A('mono','🏢','巨型前端应用',320,80,{kind:'item',tone:'warm'})]},
  {say:'微前端：主应用负责登录、导航和路由，按路由加载各团队独立开发、独立部署的子应用。',drop:['mono'],add:[A('host','🏠','主应用',320,70,{kind:'item',tone:'primary'}),A('a','🧩','订单子应用',150,210,{kind:'item'}),A('b','🧩','报表子应用',490,210,{kind:'item'})],send:[{from:'host',to:'a'},{from:'host',to:'b'}]},
  {say:'实现方式：iframe 隔离最好但体验差；qiankun 等运行时加载并做 JS 沙箱和样式隔离；Module Federation 在构建层共享模块。',add:[A('how','🛠️','iframe · qiankun · MF',320,320,{kind:'tag'})]},
  {say:'代价：样式和全局变量冲突、依赖重复加载、通信和调试复杂。团队不大时，模块化的单体应用往往更简单。',bubble:{who:'host',text:'别为拆而拆'}},
  {say:'记住微前端。',memo:['独立开发部署，主应用组合','有隔离和性能成本，按团队规模选']},
 ]},
 'fe-q-design-component':{title:'设计一个通用的下拉框组件',beats:[
  {say:'先定 API：value 和 onChange 支持受控，defaultValue 支持非受控；options 数据结构；单选、多选、搜索、禁用。',add:[A('api','📋','value · onChange · options',320,70,{kind:'item',tone:'primary'})]},
  {say:'支持自定义渲染：通过 render 函数或插槽，让使用者决定每个选项长什么样。',add:[A('slot','🎨','自定义选项渲染',120,190,{kind:'tag'})]},
  {say:'键盘操作：上下键切换、回车选中、Esc 关闭；加上 ARIA 角色，读屏软件能用。',add:[A('kbd','⌨️','键盘 + ARIA',520,190,{kind:'tag',tone:'ok'})]},
  {say:'弹层用 Portal 挂到 body，避免被父元素裁剪；靠近屏幕边缘时自动向上翻转；上万个选项用虚拟滚动。',add:[A('pop','🪟','Portal · 翻转 · 虚拟滚动',320,300,{kind:'tag',tone:'ok'})]},
  {say:'记住设计要点。',memo:['受控 / 非受控 + 可定制渲染','可访问、弹层定位、大数据性能']},
 ]},
};
