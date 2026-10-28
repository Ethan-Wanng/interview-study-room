import {A} from '../story';
import type {LazyEpisode} from './engine';

// 前端懒人模式第 7 集：书店官网的体检和保卫战（Web Vitals、首屏优化、图片优化、虚拟列表、长任务；XSS、CSRF、权限、前端监控、大文件上传、组件库设计、微前端）。
export const feLazy7:LazyEpisode={id:'lazy-fe-7',subject:'frontend',tier:3,levels:['fe-perf','fe-arch'],icon:'🩺',title:'官网体检和保卫战：又快又安全',summary:'先给书店官网做一次性能体检：三个核心指标、首屏、图片和长列表；再打一场保卫战：XSS、CSRF、权限、监控、大文件上传，以及组件库和微前端的架构取舍。',beats:[
 {say:'书店官网上线一年，流量翻了十倍。阿杰收到用户反馈：手机上打开要等好久，滑动商品列表会卡。老冯说：先别急着改，我们给它做一次全面的体检。',add:[A('ya','🌱','小芽',110,170,{tone:'primary'}),A('site','🩺','官网体检',460,90,{kind:'item',tone:'warm'})]},
 {say:'体检有三项核心指标。LCP，最大内容出现的时间，衡量加载，目标两点五秒以内；INP，用户点了之后多久有反应，衡量交互，目标两百毫秒以内；CLS，页面元素意外跳动的程度，衡量稳定，目标零点一以下。',add:[A('vitals','📊','LCP · INP · CLS',460,210,{kind:'item',tone:'primary'})]},
 {say:'体检要两种数据一起看。Lighthouse 是实验室里的检查，环境固定，方便对比；真实用户监控收集的是线上每个人的真实体验，不同的手机、不同的网络都在里面。实验室满分，不代表用户就满意。',bubble:{who:'vitals',text:'实验室 + 真实用户'}},
 {say:'体检报告出来了：首页 LCP 五秒。打开网络面板一看，首屏的 JS 有一点八 MB，首屏大图有两 MB。优化开始：按路由拆分代码、删掉没用的依赖，首屏 JS 降到三百 KB；关键 CSS 直接内联，其他脚本加 defer；静态资源上 CDN，带哈希的文件长期缓存。',drop:['vitals'],add:[A('js','📦','JS 1.8MB → 300KB',460,210,{kind:'tag',tone:'ok'})]},
 {say:'那张两 MB 的首屏大图，转成 WebP 或 AVIF 格式，按显示的尺寸准备几种分辨率，用 srcset 让浏览器自己挑；它是 LCP 元素，所以要预加载，并设置 fetchpriority 为 high。首屏以下的图片，全部 loading 懒加载。',add:[A('img','🖼️','新格式 · srcset · 首图优先',460,320,{kind:'tag',tone:'ok'})]},
 {say:'CLS 也不好：图片加载出来，把下面的文字一下子挤了下去，用户正要点的按钮跑走了。给每张图片都写上宽高或者 aspect-ratio，提前占好位置；广告位预留高度；网页字体用 font-display 并调整回退字体的尺寸，减少字体替换造成的跳动。',drop:['js','img'],add:[A('cls','📐','预留尺寸，不让页面跳',460,210,{kind:'item',tone:'primary'})]},
 {say:'接下来是滑动卡顿。商品列表有一万件商品，页面上生成了一万个 DOM 节点。办法是虚拟列表：不管有多少条，只渲染屏幕上能看见的二十来条，加上一点缓冲；用一个占位元素撑出整个滚动条的高度，滚动时根据位置算出该显示哪几条。',drop:['cls'],add:[A('virtual','🪟','虚拟列表：只渲染看得见的',460,210,{kind:'item',tone:'ok'})]},
 {say:'INP 偏高，是因为点击筛选按钮后，主线程执行了一个四百毫秒的长任务。把它拆成小块分批执行，重计算交给 Web Worker，非紧急的界面更新用 useTransition 标记成低优先级。复测之后，LCP 一点八秒，INP 九十毫秒，CLS 零点零三。老冯还在流水线里加了性能预算，防止以后又慢回去。',drop:['virtual'],add:[A('inp','⚡','拆长任务 · Worker · Transition',460,210,{kind:'tag',tone:'primary'})],tone:{site:'ok'},sub:{site:'LCP 1.8s'}},
 {say:'体检过关，保卫战却打响了。一天，安全团队发现：有人在书评区提交了一条“书评”，里面藏着一段脚本。其他读者打开这本书的页面时，脚本在他们的浏览器里执行了，偷走了登录信息。这就是 XSS，跨站脚本攻击。',drop:['inp'],add:[A('xss','🦹','书评里藏着脚本',460,210,{kind:'item',tone:'bad'})],tone:{site:'bad'}},
 {say:'防线有好几道。输出时一律转义，不用 innerHTML 渲染用户提交的内容，React 和 Vue 的插值默认就会转义；必须显示富文本时，先用 DOMPurify 按白名单净化。再配上内容安全策略 CSP，只允许执行自己域名的脚本；登录 Cookie 加上 HttpOnly，脚本读不到。',sub:{xss:'转义 · 净化 · CSP · HttpOnly'},tone:{xss:'ok',site:'ok'}},
 {say:'另一种攻击叫 CSRF。用户登录了书店，又打开了一个恶意网站，那个网站悄悄提交了一个指向书店的表单。浏览器发请求时自动带上了书店的 Cookie，书店还以为是用户本人在操作。防御的办法是：Cookie 设置 SameSite，关键操作加上 CSRF Token，服务器校验请求的来源，修改数据的接口不用 GET。',drop:['xss'],add:[A('csrf','🎣','CSRF：借用你的 Cookie',460,210,{kind:'item',tone:'warm'})]},
 {say:'还有一个常见的误会：前端把没有权限的菜单和按钮都隐藏了，就安全了吗？不是。有人可以绕过界面直接调用接口。前端控制权限只是为了体验，真正的安全，必须在后端的每一个接口上校验。',drop:['csrf'],add:[A('auth','🔐','前端隐藏 ≠ 安全，后端校验',460,210,{kind:'tag',tone:'primary'})]},
 {say:'保卫战还需要一套哨兵系统，也就是前端监控。用 window.onerror、unhandledrejection 和资源加载的错误事件采集报错，用框架的错误边界接住组件里的异常；用 PerformanceObserver 采集性能指标；页面关闭时用 sendBeacon 把数据发出去。压缩过的代码看不懂报错位置，就上传 source map 到监控平台去还原。',drop:['auth'],add:[A('monitor','🛰️','监控：错误 · 性能 · 行为',460,210,{kind:'item',tone:'ok'})]},
 {say:'书店新开了作者投稿功能，作者要上传几百 MB 的书稿和视频。小芽把文件切成五 MB 一片，在 Web Worker 里计算文件的哈希作为唯一标识；上传前先问服务器已经有哪些分片，已经有整个文件的直接成功，叫秒传，缺哪些就只传哪些，叫断点续传；同时上传四片，失败的重试。',drop:['monitor'],add:[A('upload','📤','分片 · 秒传 · 断点续传',460,210,{kind:'item',tone:'primary'})]},
 {say:'团队越来越大，几个项目里都有自己写的下拉框，样式不同、行为也不一样。老冯决定做一套组件库。好的组件要设计好接口：支持受控和非受控两种用法，选项能自定义渲染；支持键盘操作和读屏软件；弹层挂到 body 下面，靠近屏幕边缘时自动翻转；选项很多时用虚拟滚动；还要有文档、测试和版本管理。',drop:['upload'],add:[A('lib','🧩','组件库：API · 可访问 · 测试',460,210,{kind:'item',tone:'ok'})]},
 {say:'后来，公司的后台系统有五个团队一起开发，每次发布都要互相等。有人提议上微前端：主应用负责登录和导航，各团队的子应用独立开发、独立部署，按路由组合在一起。老冯提醒：微前端解决的是多团队独立交付的问题，代价是样式和全局变量的隔离、依赖重复加载、子应用通信。团队不大时，模块化的单体应用往往更简单。',drop:['lib'],add:[A('micro','🏘️','微前端：多团队独立交付',460,210,{kind:'item',tone:'warm'})]},
 {say:'年底，小芽升职了。她给新人讲课时说：性能优化，先测量再动手，加载看 LCP，交互看 INP，稳定看 CLS；安全，不可信的内容绝不当成 HTML 执行，Cookie 加上 HttpOnly 和 SameSite，权限靠后端；架构，没有银弹，按团队和业务来选。',drop:['micro','site'],tone:{ya:'ok'},bubble:{who:'ya',text:'先测量，再优化'}},
 {say:'这一集的要点。',memo:['性能：LCP 加载、INP 交互、CLS 稳定；首图优先、虚拟列表、拆长任务','安全：转义净化 + CSP 防 XSS，SameSite + Token 防 CSRF，权限靠后端；监控与 source map']},
]};
