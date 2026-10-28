import {A,type Story} from '../story';

// Go 面试题动画（基础一）：包管理、go.mod 与 go.sum、internal、工作区、init、项目根目录、格式化动词、new 与 make。
export const gxA:Record<string,Story>={
 'q-e2fa0702dc3aaf5e':{title:'Go 的包管理：从 GOPATH 到 Go Modules',beats:[
  {say:'早期所有代码都要放在 GOPATH 目录下，同一个依赖只能有一个版本，多个项目很容易互相冲突。',add:[A('gp','📁','GOPATH：只能一个版本',150,90,{kind:'item',tone:'bad'})]},
  {say:'后来出现了 vendor 目录和 dep 等第三方工具，但都不统一。',add:[A('vd','📦','vendor · dep',490,90,{kind:'item',tone:'warm'})]},
  {say:'Go 1.11 引入 Go Modules，现在是默认方式：项目根目录一个 go.mod，记录模块名、Go 版本和依赖版本，项目可以放在任何目录。',add:[A('mod','📘','Go Modules：go.mod',320,220,{kind:'item',tone:'ok'})],send:[{from:'gp',to:'mod'},{from:'vd',to:'mod'}]},
  {say:'下载的依赖缓存在模块缓存里，通过 GOPROXY 代理下载，用 GOPRIVATE 配置公司私有仓库不走代理。',add:[A('proxy','🌐','GOPROXY · GOPRIVATE',320,320,{kind:'tag'})]},
  {say:'记住包管理的演进。',memo:['GOPATH → vendor → Go Modules','go.mod 记录依赖，GOPROXY 下载']},
 ]},
 'q-160bd2548d521bc9':{title:'go.mod、go.sum 和几个常用命令',beats:[
  {say:'go.mod 是“清单”：模块路径、Go 版本、直接和间接依赖的版本，还可以用 replace 替换依赖。',add:[A('mod','📘','go.mod：要哪些版本',150,80,{kind:'item',tone:'primary'})]},
  {say:'go.sum 是“指纹”：记录每个依赖模块内容的哈希，下载时校验，防止被篡改。两个文件都要提交到仓库。',add:[A('sum','🔏','go.sum：内容哈希',490,80,{kind:'item',tone:'ok'})]},
  {say:'go mod tidy：扫描代码里的 import，补上缺的依赖，删掉不再使用的，并更新 go.sum。',add:[A('tidy','🧹','go mod tidy',150,230,{kind:'tag',tone:'primary'})],send:[{from:'tidy',to:'mod'}]},
  {say:'go get 用来添加、升级或降级依赖并修改 go.mod；go mod download 只把 go.mod 里已有的依赖下载到本地缓存，不改文件，常用于 Docker 构建缓存。',add:[A('get','⬇️','get 改依赖 · download 只下载',490,230,{kind:'tag'})]},
  {say:'记住分工。',memo:['go.mod 清单，go.sum 校验','tidy 整理，get 改依赖，download 只下载']},
 ]},
 'q-0fc82d1d6d004254':{title:'internal 包：只给自己人用',beats:[
  {say:'项目 example.com/app 里有一个目录 internal/auth，放着鉴权的内部实现。',add:[A('app','🏠','example.com/app',320,60,{kind:'item',tone:'primary'}),A('int','🔒','app/internal/auth',320,170,{kind:'item',tone:'warm'})]},
  {say:'app 下面的包，比如 app/api，可以正常导入 internal/auth。',add:[A('api','📦','app/api',110,280,{kind:'tag',tone:'ok'})],send:[{from:'api',to:'int',text:'可以导入',tone:'ok'}]},
  {say:'但其他模块 example.com/other 想导入它，编译器直接报错：use of internal package not allowed。',add:[A('other','🚫','example.com/other',530,280,{kind:'tag',tone:'bad'})],send:[{from:'other',to:'int',text:'禁止',tone:'bad'}]},
  {say:'规则：internal 目录只能被它的父目录及父目录下的包导入。用它隐藏实现细节，对外只暴露稳定的 API，以后改内部代码不会影响别人。',bubble:{who:'int',text:'只给自己人用'}},
  {say:'记住 internal。',memo:['只有父目录树内的包能导入','隐藏实现，保护公开 API']},
 ]},
 'q-33f1a19d908449b7':{title:'工作区模式：同时开发多个模块',beats:[
  {say:'你同时在改两个模块：主服务 app 和它依赖的公共库 lib。改了 lib 想马上在 app 里试，但 app 的 go.mod 指向的是已发布的版本。',add:[A('app','🖥️','app 模块',150,100,{kind:'item',tone:'primary'}),A('lib','📚','lib 模块（本地修改）',490,100,{kind:'item'})]},
  {say:'以前只能在 app 的 go.mod 里加 replace 指向本地目录，一不小心就把 replace 提交上去了。',add:[A('rep','⚠️','replace 容易误提交',320,220,{kind:'tag',tone:'warm'})]},
  {say:'Go 1.18 起有工作区：在上层目录执行 go work init ./app ./lib，生成 go.work，构建时直接使用本地的 lib。',drop:['rep'],add:[A('work','🧰','go.work：use ./app ./lib',320,220,{kind:'item',tone:'ok'})],send:[{from:'work',to:'app'},{from:'work',to:'lib'}]},
  {say:'go.work 一般不提交到仓库，只用于本地开发；各模块自己的 go.mod 保持干净。',add:[A('git','🙈','go.work 通常不提交',320,320,{kind:'tag'})]},
  {say:'记住工作区。',memo:['go.work 组合多个本地模块','替代临时 replace，通常不提交']},
 ]},
 'q-ebf42a72d069f3de':{title:'init 函数什么时候执行',beats:[
  {say:'main 包导入了包 a，a 又导入了包 b。程序启动时，先初始化最底层的依赖 b。',add:[A('b','📦','包 b',110,170,{kind:'item',tone:'primary'}),A('a','📦','包 a',320,170,{kind:'item'}),A('main','🚀','main 包',530,170,{kind:'item'})]},
  {say:'每个包内部：先按依赖顺序初始化包级变量，再执行 init 函数。一个包可以有多个 init，同一文件中按出现顺序执行。',sub:{b:'变量 → init()'},send:[{from:'b',to:'a',text:'b 完成'}]},
  {say:'然后初始化 a，最后初始化 main 包自己，全部完成才进入 main 函数。每个包只初始化一次。',send:[{from:'a',to:'main',text:'a 完成'}],tone:{main:'ok'}},
  {say:'init 不能被显式调用，也不应写复杂逻辑；不同文件之间的 init 顺序不要依赖，副作用多的初始化最好改成显式的初始化函数。',add:[A('tip','⚠️','别把业务塞进 init',320,310,{kind:'tag',tone:'warm'})]},
  {say:'记住顺序。',memo:['依赖包先初始化','包级变量 → init() → main()']},
 ]},
 'q-f79f4e7ba8845c95':{title:'怎么找到项目的根目录',beats:[
  {say:'程序要读取 config/app.yaml。在项目目录下 go run 能读到，换个目录启动、或者跑测试时就找不到了。',add:[A('app','🖥️','程序',110,170,{tone:'primary'}),A('cfg','📄','config/app.yaml',530,170,{kind:'item',tone:'bad'})],bubble:{who:'app',text:'文件在哪？'}},
  {say:'原因：相对路径基于“当前工作目录”，而不是代码所在目录。go test 时工作目录是被测包的目录。',add:[A('wd','📂','相对路径 = 工作目录',320,60,{kind:'tag',tone:'warm'})]},
  {say:'常见办法：os.Executable 取可执行文件所在目录；开发时从当前目录往上找 go.mod；或者 runtime.Caller 取源文件路径（只适合开发和测试）。',add:[A('ways','🧭','Executable · 找 go.mod',320,280,{kind:'tag'})]},
  {say:'最推荐：通过命令行参数或环境变量显式传入配置路径；静态资源用 embed 直接编进二进制，部署时不再依赖目录结构。',tone:{cfg:'ok'},add:[A('embed','📦','参数 / 环境变量 / embed',530,300,{kind:'tag',tone:'ok'})]},
  {say:'记住要点。',memo:['相对路径基于工作目录','配置路径显式传入，资源用 embed']},
 ]},
 'q-0de2e4eb5c9fe77e':{title:'%v、%+v、%#v 打印出什么',beats:[
  {say:'有一个结构体 u := User{Name: "Tom", Age: 18}，用三种格式打印。',add:[A('u','🧑','User{Tom, 18}',320,60,{kind:'item',tone:'primary'})]},
  {say:'%v：只打印值，{Tom 18}。日常打印最常用。',add:[A('v','1️⃣','%v → {Tom 18}',320,150,{kind:'tag'})]},
  {say:'%+v：加上字段名，{Name:Tom Age:18}。看日志时更清楚；对 error 而言，一些错误库会用它打印堆栈。',add:[A('pv','2️⃣','%+v → {Name:Tom Age:18}',320,230,{kind:'tag',tone:'ok'})]},
  {say:'%#v：打印成 Go 语法的形式，main.User{Name:"Tom", Age:18}，连类型名和引号都有，适合调试。另外 %T 打印类型，%q 给字符串加引号。',add:[A('sv','3️⃣','%#v → main.User{…}',320,310,{kind:'tag',tone:'primary'})]},
  {say:'记住三种格式。',memo:['%v 值，%+v 加字段名','%#v Go 语法表示，%T 打印类型']},
 ]},
 'q-8199eddca129ad93':{title:'new 和 make 的区别',beats:[
  {say:'new(T)：为类型 T 分配一块零值内存，返回指向它的指针 *T。任何类型都能用，比如 new(int) 得到指向 0 的指针。',add:[A('new','🆕','new(T) → *T（零值）',150,90,{kind:'item',tone:'primary'})]},
  {say:'make 只用于三种内建引用类型：slice、map、channel，返回的是已经初始化好、可以直接用的值本身，不是指针。',add:[A('make','🛠️','make：slice · map · chan',490,90,{kind:'item',tone:'ok'})]},
  {say:'为什么需要 make？这三种类型内部有底层结构要初始化：map 要建哈希表，channel 要建缓冲区和等待队列。',add:[A('why','⚙️','初始化内部结构',490,230,{kind:'tag'})]},
  {say:'坑：p := new(map[string]int) 得到的是指向 nil map 的指针，往 (*p)["a"] 写会 panic。日常写结构体更常用 &T{}，map 用 make 或字面量。',add:[A('pit','💥','new(map) 写入 panic',150,230,{kind:'tag',tone:'bad'})]},
  {say:'记住区别。',memo:['new：任何类型，返回零值指针','make：slice/map/chan，返回初始化好的值']},
 ]},
};
