// Rust 学习空间：15 个关卡，每关先学习再答题。关卡按难度分为入门、进阶、高级、大神四档。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// 第 5–15 关写在 content/rust-levels/ 下，在这里按顺序组装。
import type {AiLevel,Rank,Tier} from './journey';
import {rustStruct,rustEnum} from './rust-levels/struct-enum';
import {rustCollections,rustModules} from './rust-levels/collections-mod';
import {rustGenerics,rustIterators} from './rust-levels/generics-iter';
import {rustSmartPtr,rustConcurrency,rustAsync} from './rust-levels/advanced';
import {rustUnsafeMacros,rustEngineering} from './rust-levels/master';

export const rustPassRate=0.65;
export const rustTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:3},{name:'进阶',nameEn:'Intermediate',from:4,to:9},{name:'高级',nameEn:'Advanced',from:10,to:12},{name:'大神',nameEn:'Master',from:13,to:14}];
export const rustRanks:Rank[]=[{min:0,name:'Rust 新手'},{min:2,name:'入门'},{min:4,name:'熟手'},{min:8,name:'高手'},{min:12,name:'专家'},{min:15,name:'大神'}];

export const rustLevels:AiLevel[]=[
 {id:'rust-start',title:'起步：工具链、cargo 与第一个程序',summary:'Rust 是什么，装好 rustup 和 cargo，写出并运行第一个程序',lessons:[
  {title:'Rust 是什么，为什么学它',body:'Rust 是一门“编译型”编程语言：你写好的代码，要先交给一个叫“编译器”的程序翻译成电脑能直接执行的机器码，然后才能运行。它最早由 Mozilla 公司的工程师开发，2015 年发布 1.0 正式版，现在由 Rust 基金会和社区一起维护。\n学 Rust 的人常说它解决了一个老难题：既要跑得快，又要不出内存错误。\n一、跑得快：Rust 和 C、C++ 一样直接编译成机器码，运行时没有额外的“垃圾回收器”（一种在程序运行时自动找出不再使用的内存并回收的机制，回收时可能让程序停顿一下），所以速度和 C++ 接近；\n二、内存安全：C、C++ 程序里常见的“用了已经释放的内存”“两个线程同时改同一份数据”这类错误，Rust 会在编译阶段就检查出来，编译不通过，程序根本跑不起来，也就不会带着这种错误上线；\n三、工具好用：官方自带 cargo（项目管理和构建工具）、rustfmt（代码格式化）、clippy（代码检查）和完整的文档工具，新手不用自己东拼西凑。\n所以 Rust 常用来写对性能和稳定性要求高的软件：命令行工具、网络服务、数据库、浏览器组件、操作系统内核模块、区块链和嵌入式设备程序等。Linux 内核、Windows、Android 里都已经有用 Rust 写的部分。\n学习 Rust 的难点是“所有权”和“借用”这套规则，一开始会觉得编译器很严格。别担心，这门课会一关一关地讲清楚。'},
  {title:'几个名词：编译器、工具链、crate',body:'在动手之前，先认识几个后面会反复出现的名词：\n一、rustc：Rust 的编译器，负责把 .rs 结尾的源代码文件翻译成可执行程序（Windows 上是 .exe 文件）；\n二、cargo：Rust 官方的项目管理工具。新建项目、编译、运行、下载别人写好的库、跑测试，都用它。日常写代码时，你几乎只和 cargo 打交道，它会在背后帮你调用 rustc；\n三、rustup：Rust 的“安装和版本管理工具”，用来安装 rustc、cargo 等全套工具，以后升级到新版本也靠它；\n四、工具链（toolchain）：rustc、cargo、标准库等一整套配合使用的工具的统称。Rust 有 stable（稳定版，每 6 周发布一次）、beta（测试版）和 nightly（每天构建的尝鲜版）三条发布渠道，新手用 stable 就行；\n五、crate（读作“克雷特”，原意是“板条箱”）：Rust 里一个编译单位，可以理解成一个“包”。你写的一个项目是一个 crate，别人发布出来给大家用的库也是 crate。公共的库都放在网站 crates.io 上，cargo 可以自动下载。'},
  {title:'安装 Rust，确认能用',body:'官方推荐用 rustup 来安装 Rust：\n一、打开网站 rustup.rs（也可以在 rust-lang.org 上点 Install）；\n二、Windows：下载 rustup-init.exe 并运行。Rust 在 Windows 上默认借用微软的 C++ 生成工具来做最后一步“链接”（把编译好的各个部分拼成一个 .exe），所以如果电脑上没装 Visual Studio 的“使用 C++ 的桌面开发”组件，安装程序会提示你先安装它，按提示操作即可；\n三、Mac 或 Linux：在终端里粘贴网站上给出的那一行 curl 命令并回车，按提示选默认安装（输入 1 回车）；\n四、装完以后，关掉终端重新打开一个（让新的环境变量生效），依次输入 rustc --version 和 cargo --version。看到类似 rustc 1.99.1 和 cargo 1.99.1 这样带版本号的一行，就说明装好了。\n以后想升级到最新的稳定版，运行 rustup update 即可。\n在国内下载慢的话，可以在安装前设置两个环境变量，改用国内镜像，比如 RUSTUP_DIST_SERVER=https://rsproxy.cn 和 RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup。遇到问题可以点右下角的“问 AI”，让 AI 老师帮你排查。\n写代码推荐用 VS Code，在扩展里搜索并安装 rust-analyzer，就有代码提示、跳转和实时报错了。'},
  {title:'用 cargo 新建一个项目',body:'装好以后，不用自己手动建文件夹和文件，让 cargo 帮你生成一个标准的项目骨架。打开终端，进入你想放代码的位置，运行下面的命令。',code:`cargo new hello
cd hello
cargo run`,explain:[{at:'cargo new hello',text:'新建一个名叫 hello 的项目：cargo 会创建 hello 文件夹，在里面生成配置文件 Cargo.toml 和源代码文件 src/main.rs，还会顺手初始化一个 git 仓库（git 是记录代码修改历史的工具，暂时不用管它）。'},{at:'cd hello',text:'cd 是终端的“进入文件夹”命令，进入刚建好的项目文件夹。后面的 cargo 命令都要在项目文件夹里运行。'},{at:'cargo run',text:'编译并运行这个项目。cargo new 生成的 main.rs 里已经写好了一个打印 Hello, world! 的程序，所以第一次运行就能看到 Hello, world!。'}]},
  {title:'项目里有什么：Cargo.toml 和 src',body:'cargo new 生成的项目结构是这样的：\nhello/\n├── Cargo.toml   项目的配置文件\n└── src/\n    └── main.rs  程序的源代码\n运行过 cargo run 之后，还会多出两样东西：target 文件夹（编译出来的文件都放在这里，可以随时删掉，下次会重新生成）和 Cargo.lock 文件（记录这次实际用到的每个依赖库的精确版本，保证别人在另一台电脑上编译时用的是一模一样的版本）。\nCargo.toml 用的是 TOML 格式：方括号里的是“小节”的名字，下面一行一个“键 = 值”。新项目的 Cargo.toml 长下面这样。',code:`[package]
name = "hello"
version = "0.1.0"
edition = "2024"

[dependencies]`,explain:[{at:'[package]',text:'package 小节，描述这个项目本身的信息。'},{at:'name = "hello"',text:'项目（crate）的名字，也是编译出来的可执行文件的名字，Windows 上就是 hello.exe。'},{at:'version = "0.1.0"',text:'项目自己的版本号，格式是“主版本.次版本.修订号”。0 开头表示还在早期开发阶段。'},{at:'edition = "2024"',text:'edition（版次）：Rust 每隔几年会推出一个新的版次，里面可以有少量不兼容旧写法的改动。每个项目在这里声明自己按哪个版次的规则编译，所以老项目不会因为升级编译器而突然编译不过。新项目默认用最新的 2024 版次。'},{at:'[dependencies]',text:'dependencies 小节，用来写这个项目依赖的第三方库，比如以后会加的 rand = "0.9"。现在是空的，表示还没有依赖。'}]},
  {title:'第一个 Rust 程序',body:'打开 src/main.rs，里面就是 cargo 帮你写好的第一个程序。它只有三行，但每一部分都有固定的意义：\nfn 是 function（函数）的缩写，用来定义一个函数。函数就是一段有名字、可以被执行的代码；\nmain 是一个特殊的函数名：程序运行时，就从 main 函数的第一行开始执行，执行到最后一行结束；\n花括号 { } 把函数的内容（函数体）包起来；\nprintln! 用来在屏幕上打印一行文字。注意名字后面的感叹号：带感叹号的是“宏”（macro），可以先把宏理解成一种“特殊的函数”，它在编译时会被展开成更多的代码，所以能做到普通函数做不到的事，比如接收数量不固定的参数。',code:`fn main() {
    println!("Hello, world!");
}`,explain:[{at:'fn main() {',text:'定义 main 函数：fn 是定义函数的关键字，main 是函数名，() 里写参数（这里没有参数），{ 表示函数体开始。程序从这里开始运行。'},{at:'println!("Hello, world!");',text:'调用 println! 宏，打印双引号里的文字并换行。双引号括起来的是“字符串”（一串文字）。行末的分号 ; 表示这一句结束，Rust 里大多数语句都要以分号结尾。'},{at:'}',text:'右花括号表示 main 函数结束，程序也就运行完了。'}]},
  {title:'动手试试：运行你的第一个程序',body:'我们在第一个程序的基础上加一个变量，打印一句带名字的问候。先用 cargo run 运行，再用 cargo build 编译出可执行文件，直接运行它一次，感受两者的区别。\n代码里的 let 用来声明变量（下一关会细讲），{} 是一个“占位符”：打印时会被后面对应位置的值替换掉。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','运行 cargo build，然后看看 target/debug 文件夹，里面多了一个 rust-try.exe（Mac 和 Linux 上叫 rust-try，没有后缀）。直接运行它：Windows 输入 .\\target\\debug\\rust-try.exe，Mac 输入 ./target/debug/rust-try，输出和 cargo run 一样。','把 name 改成你自己的名字，再运行一次 cargo run。'],expect:'Hello, Rustacean!\n你好，小明！今天开始学 Rust。'},code:`fn main() {
    println!("Hello, Rustacean!");
    let name = "小明";
    println!("你好，{}！今天开始学 Rust。", name);
}`,explain:[{at:'fn main() {',text:'程序入口 main 函数。'},{at:'println!("Hello, Rustacean!");',text:'打印第一行。Rustacean（读作“拉斯忒信”）是 Rust 社区对 Rust 程序员的昵称，来自 crustacean（甲壳动物），所以 Rust 的吉祥物是一只叫 Ferris 的螃蟹。'},{at:'let name = "小明";',text:'用 let 声明一个叫 name 的变量，把字符串 "小明" 存进去。Rust 会根据值自动推断出它的类型，不用手写。'},{at:'println!("你好，{}！今天开始学 Rust。", name);',text:'字符串里的 {} 是占位符，打印时被逗号后面的 name 的值替换，于是打印出“你好，小明！……”。'}]},
  {title:'println! 的占位符',body:'println! 的第一个参数叫“格式字符串”，里面的花括号会被替换成后面的值。常用写法：\n一、{}：按顺序依次用后面的参数替换；\n二、{name}：直接写变量名，打印同名变量的值，这样写更直观；\n三、{:.2}：冒号后面是格式要求，.2 表示保留两位小数（会四舍五入）；\n四、{:?}：用“调试格式”打印，字符串会带上双引号，以后打印一组数据（比如列表）时特别有用；\n五、{:>5}、{:<5}、{:^5}：占 5 个字符宽，分别是右对齐、左对齐、居中，不够的地方用空格补齐，打印表格时用得上。\n还有两个“兄弟”：print! 打印但不换行，eprintln! 把文字打印到“标准错误”（专门用来输出错误信息的通道，平时也显示在终端上）。'},
  {title:'动手试试：各种占位符',body:'把上面几种占位符都试一遍，对照输出，看看每一种的效果。注意最后一行的方括号是普通文字，用来让你看清空格补在了哪里。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 {:.2} 改成 {:.3}，再运行，看看小数位数的变化。'],expect:'小明 今年 18 岁\n小明 明年 19 岁\n价格保留两位小数：3.14\n调试格式："带引号"\n[   42] [42   ] [ 42  ]'},code:`fn main() {
    let name = "小明";
    let age = 18;
    let price = 3.14159;
    println!("{} 今年 {} 岁", name, age);
    println!("{name} 明年 {} 岁", age + 1);
    println!("价格保留两位小数：{:.2}", price);
    println!("调试格式：{:?}", "带引号");
    println!("[{:>5}] [{:<5}] [{:^5}]", 42, 42, 42);
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let name = "小明";',to:'let price = 3.14159;',text:'声明三个变量：一个字符串、一个整数、一个小数（带小数点的数叫“浮点数”）。'},{at:'println!("{} 今年 {} 岁", name, age);',text:'两个 {} 按顺序被 name 和 age 替换。'},{at:'println!("{name} 明年 {} 岁", age + 1);',text:'{name} 直接打印变量 name；后面的 {} 被 age + 1 的计算结果 19 替换。占位符里不能写算式，所以算式要写在逗号后面。'},{at:'println!("价格保留两位小数：{:.2}", price);',text:'{:.2} 把 3.14159 保留两位小数，打印成 3.14。'},{at:'println!("调试格式：{:?}", "带引号");',text:'{:?} 用调试格式打印字符串，会带上双引号。'},{at:'println!("[{:>5}] [{:<5}] [{:^5}]", 42, 42, 42);',text:'三个 42 都占 5 个字符宽：右对齐时空格补在左边；左对齐时补在右边；居中时左边补 1 个、右边补 2 个（补不均匀时右边多一个）。'}]},
  {title:'cargo 的常用命令',body:'写 Rust 时最常用的就是下面这几条 cargo 命令，都在项目文件夹里运行。\n“调试版”和“发布版”的区别：调试版编译得快，但几乎不做优化，运行慢一些，适合开发时反复试；发布版编译时会花更多时间优化代码，运行速度可能快好几倍，适合最后上线。',code:`cargo check
cargo build
cargo run
cargo build --release
cargo fmt
cargo clippy`,explain:[{at:'cargo check',text:'只检查代码能不能编译通过，不生成可执行文件，所以比 build 快得多。写代码时经常用它快速看有没有错误。'},{at:'cargo build',text:'编译出调试版，放在 target/debug 文件夹里。'},{at:'cargo run',text:'先编译（代码改过才会重新编译，没改过就跳过），再运行。开发时最常用。'},{at:'cargo build --release',text:'加上 --release 编译发布版，放在 target/release 文件夹里。'},{at:'cargo fmt',text:'调用 rustfmt，把代码自动整理成社区统一的格式，比如缩进 4 个空格。'},{at:'cargo clippy',text:'调用 clippy（代码检查工具），找出能编译但写法不好、可能有问题的地方，并给出改进建议。'}]},
  {title:'看懂编译器的报错',body:'Rust 编译器以报错信息详细著称：它会告诉你错在哪个文件第几行、为什么错，经常还会直接给出修改建议。新手最重要的习惯就是：别害怕红字，从上往下认真读第一条错误。\n比如把变量名 name 写错成 nme，运行 cargo run 会看到类似下面的报错（下面是报错原文，不是要运行的代码）。',code:`error[E0425]: cannot find value \`nme\` in this scope
 --> src/main.rs:3:23
  |
3 |     println!("你好，{}", nme);
  |                          ^^^
  |
help: a local variable with a similar name exists
  |
3 |     println!("你好，{}", name);
  |                           +`,explain:[{at:'error[E0425]',text:'error 表示这是错误（编译不通过）；如果是 warning 则只是警告，程序还能运行。E0425 是错误编号，运行 rustc --explain E0425 可以看到这类错误的详细说明和例子。冒号后面是错误原因：在当前作用域（变量能被访问到的那段代码范围）里找不到叫 nme 的值。'},{at:'--> src/main.rs:3:23',to:'  |',text:'出错的位置：src/main.rs 文件的第 3 行第 23 列。下面一行单独的竖线只是排版用的分隔，没有含义。'},{at:'3 |     println!("你好，{}", nme);',text:'把出错的那一行代码原样显示出来，左边的 3 是行号。'},{at:'^^^',to:'name);',text:'^^^ 指出具体是哪几个字符出了问题。下面以 help 开头的部分是编译器的修改建议：附近有一个名字很像的变量 name，并把改好以后的那一行显示出来，你是不是想写它？'},{at:'+',text:'+ 号标出建议里新加的字符：在 nme 中间补上一个 a，就变成了 name。'}]}
 ],quiz:[
{id:'rust-start-1',q:'Rust 是靠什么来保证内存安全的？',options:['运行时用垃圾回收器定期回收内存','编译时按所有权规则检查内存使用','每次访问内存前都弹窗让用户确认','由操作系统在程序结束后统一检查'],why:['Rust 没有垃圾回收器，这正是它运行时没有回收停顿的原因。','','程序运行时不会弹窗确认，那样根本没法用。','程序结束后再检查已经来不及了，错误早就发生了。'],answer:1,explain:'Rust 在编译阶段按照所有权和借用规则检查代码，违反规则的代码编译不通过，所以既不需要垃圾回收器，又能避免“用已释放的内存”这类错误。'},
  {id:'rust-start-2',q:'官方推荐用哪个工具来安装和升级 Rust？',options:['rustup','rustc','cargo','clippy'],why:['','rustc 是编译器本身，由 rustup 负责安装。','cargo 是项目管理和构建工具，也是由 rustup 装好的。','clippy 是代码检查工具，用来给写法提改进建议。'],answer:0,explain:'rustup 负责安装和升级整套工具链（rustc、cargo、标准库等），以后升级运行 rustup update 即可。'},
  {id:'rust-start-3',type:'multi',q:'cargo 可以帮你完成哪些事？（多选）',options:['新建一个标准结构的项目','编译并运行项目里的代码','下载并管理第三方依赖库','把代码改成解释执行免编译'],why:['','','','Rust 是编译型语言，cargo run 也是先编译再运行，不存在免编译的解释执行。'],answers:[0,1,2],explain:'cargo new 建项目、cargo build / run 编译运行、在 Cargo.toml 里写依赖后 cargo 会自动下载，cargo test 还能跑测试。'},
  {id:'rust-start-4',type:'judge',q:'println! 名字末尾的感叹号表示它是一个宏，而不是普通函数。',answer:true,explain:'Rust 里名字后面带 ! 的都是宏。宏在编译时展开成更多代码，所以 println! 能接收数量不固定的参数。'},
  {id:'rust-start-5',q:'cargo check 和 cargo build 相比，有什么不同？',options:['只检查能否编译，不生成程序','编译出发布版，运行速度更快','会把代码自动整理成统一格式','会顺便运行项目里的所有测试'],why:['','编译发布版要用 cargo build --release。','整理格式是 cargo fmt 的工作。','运行测试要用 cargo test。'],answer:0,explain:'cargo check 只做类型检查等编译前期的工作，不生成可执行文件，所以比 cargo build 快很多，适合写代码时频繁使用。'},
  {id:'rust-start-6',type:'fill',q:'cargo 项目根目录下，记录项目名字、版本号和依赖库的配置文件，文件名是＿。',accepted:['Cargo.toml','cargo.toml'],explain:'Cargo.toml 是项目的配置文件（TOML 格式），[package] 小节写项目信息，[dependencies] 小节写依赖。'},
  {id:'rust-start-7',q:'运行 cargo build --release 后，编译好的程序放在哪个文件夹？',options:['target/debug','target/release','src/release','build/output'],why:['不加 --release 时编译出的调试版才放在这里。','','src 文件夹只放源代码，不放编译产物。','cargo 不会生成这个文件夹，编译产物都在 target 里。'],answer:1,explain:'调试版放在 target/debug，发布版放在 target/release。发布版做了更多优化，运行更快。'},
  {id:'rust-start-8',type:'judge',q:'Rust 程序运行时，从 main 函数的第一行开始执行。',answer:true,explain:'main 是可执行程序的入口函数，程序启动后从它的第一行开始执行，执行完最后一行就结束。'},
  {id:'rust-start-9',q:'下面代码打印什么？',code:'fn main() {\n    let a = 1;\n    let b = 2;\n    println!("{} + {} = {}", a, b, a + b);\n}',options:['1 + 2 = 3','a + b = 3','{} + {} = {}','1 + 2 = a + b'],why:['','{} 会被替换成变量的值，不会打印变量名。','{} 是占位符，打印时会被后面的参数替换掉。','最后一个 {} 对应的是 a + b 的计算结果 3。'],answer:0,explain:'三个 {} 按顺序被 a、b、a + b 的值替换，所以打印 1 + 2 = 3。'},
  {id:'rust-start-10',type:'multi',q:'下面关于 Rust 的说法，哪些是对的？（多选）',options:['代码会编译成机器码再运行','运行时没有垃圾回收器停顿','需要虚拟机才能运行编译结果','新建项目时不生成配置文件'],why:['','','Rust 编译出的是可以直接运行的机器码程序，不需要虚拟机。','cargo new 会生成 Cargo.toml 配置文件。'],answers:[0,1],explain:'Rust 编译成机器码直接运行，没有垃圾回收器，所以性能接近 C++、没有回收停顿。'},
  {id:'rust-start-11',type:'judge',q:'修改了 src/main.rs 之后，要先手动运行 cargo build，cargo run 才能用上新代码。',answer:false,explain:'cargo run 会自动检查代码有没有改过，改过就先重新编译再运行，不需要手动 build。'},
  {id:'rust-start-12',type:'fill',q:'想把 3.14159 打印成 3.14（保留两位小数），println! 的格式字符串里应该写的占位符是＿。',accepted:['{:.2}'],explain:'冒号后面写格式要求，.2 表示保留两位小数，会四舍五入。'},
  {id:'rust-start-13',q:'Cargo.lock 文件的作用是？',options:['记录每个依赖实际用到的精确版本','锁住项目，防止别人修改源代码','保存编译好的可执行程序文件','记录项目作者的账号和密码'],why:['','它和“锁住文件”无关，lock 指的是锁定依赖版本。','可执行程序放在 target 文件夹里。','账号密码这类机密绝不应该写进项目文件。'],answer:0,explain:'Cargo.lock 记录第一次解析出的每个依赖的精确版本，之后在任何电脑上编译都用同样的版本，保证结果一致。'},
  {id:'rust-start-14',q:'Cargo.toml 里的 edition = "2024" 表示什么？',options:['项目按 2024 版次的规则编译','程序要在 2024 年后才能运行','这是项目的第 2024 个版本','编译器要升级到 2024 版'],why:['','edition 和运行日期无关。','项目自己的版本写在 version 字段里。','编译器有自己的版本号（比如 1.99），edition 只是声明按哪套语言规则编译。'],answer:0,explain:'edition（版次）让 Rust 能在不破坏老项目的前提下改进语法：每个项目声明自己按哪个版次编译，新项目默认是 2024。'},
  {id:'rust-start-15',type:'judge',q:'target 文件夹里放的是编译产物，删掉以后，下次编译时会重新生成。',answer:true,explain:'target 只放编译出来的文件，可以随时删除（cargo clean 也是做这件事），一般也不提交到代码仓库。'},
  {id:'rust-start-16',type:'code',q:'写一个完整的 Rust 程序：声明变量 city 存 "杭州"，变量 year 存 2026，打印一行“我在杭州，今年是 2026 年”。要求用占位符，不要把城市和年份直接写进字符串。',reference:'fn main() {\n    let city = "杭州";\n    let year = 2026;\n    println!("我在{}，今年是 {} 年", city, year);\n}',points:['有 fn main() 入口函数','用 let 声明 city 和 year','println! 里用 {} 占位符引用变量','语句以分号结尾，输出内容正确'],explain:'也可以写成 println!("我在{city}，今年是 {year} 年")，直接在占位符里写变量名。'},
 ]},
 {id:'rust-basics',title:'变量、类型、函数与流程控制',summary:'let 和 mut、常用类型、函数、表达式，以及 if、loop、while、for',lessons:[
  {title:'变量：用 let 给值起名字',body:'变量就是给一个值起的名字，以后用这个名字就能拿到这个值。比如 let age = 18; 意思是“造一个叫 age 的变量，里面放 18”。\nRust 和很多语言有一个重要的不同：变量默认是“不可变”的（immutable），也就是放进去以后就不能再改。如果写了 age = 19; 想改它，编译器会报错：cannot assign twice to immutable variable（不能给不可变变量赋值两次）。\n为什么要这样设计？因为程序里大部分值其实都不需要改。默认不可变，读代码的人一眼就知道“这个值从头到尾不会变”，也能避免不小心改错数据。\n真的需要修改的变量，在 let 后面加上 mut（mutable，可变的）：let mut age = 18; 之后就可以写 age = 19; 了。',code:`let age = 18;
// age = 19;  这一行会编译报错：age 不可变
let mut score = 60;
score = 75;
println!("age = {age}, score = {score}");`,explain:[{at:'let age = 18;',text:'声明不可变变量 age，值是 18。'},{at:'let mut score = 60;',text:'加了 mut，score 是可变变量，初始值 60。'},{at:'score = 75;',text:'给可变变量重新赋值，这时 score 变成 75。注意重新赋值时不再写 let。'},{at:'println!("age = {age}, score = {score}");',text:'打印 age = 18, score = 75。'}]},
  {title:'遮蔽和常量',body:'遮蔽（shadowing）：可以用 let 再声明一个同名的新变量，新变量会“遮住”旧的，之后再用这个名字拿到的都是新变量。它和 mut 的区别在于：\n一、遮蔽是造了一个全新的变量，所以新变量的类型可以和旧的不同，比如先是一段文字 "42"，再变成数字 42；mut 变量的类型不能变；\n二、遮蔽以后的变量如果没加 mut，仍然是不可变的。\n常量（constant）用 const 声明，比如 const MAX_POINTS: u32 = 100_000;。它和不可变变量的区别：\n一、常量必须写明类型（冒号后面的 u32 就是类型，马上会讲）；\n二、常量的值必须在编译时就能算出来，不能是程序运行时才得到的结果；\n三、常量名按惯例全部大写，单词之间用下划线连接；\n四、常量可以写在函数外面，整个文件都能用。\n数字里的下划线 _ 只是为了方便阅读，100_000 就是 100000。'},
  {title:'动手试试：mut、遮蔽和常量',body:'把可变变量、遮蔽和常量放在一个程序里跑一遍。代码里 text.parse() 的意思是“把这段文字解析成数字”，后面的 unwrap() 表示“我确定能解析成功，万一失败就让程序直接停下来报错”。这种写法第 7 关讲错误处理时会细讲，现在照着用就行。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 count 前面的 mut 删掉，再运行 cargo run，读一读编译器给出的错误和修改建议。'],expect:'count 一开始是 1\n加 1 以后是 2\n遮蔽后 text 变成了数字：43\n常量 MAX_POINTS = 100000'},code:`fn main() {
    let mut count = 1;
    println!("count 一开始是 {count}");
    count = count + 1;
    println!("加 1 以后是 {count}");

    let text = "42";
    let text: i32 = text.parse().unwrap();
    println!("遮蔽后 text 变成了数字：{}", text + 1);

    const MAX_POINTS: u32 = 100_000;
    println!("常量 MAX_POINTS = {MAX_POINTS}");
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let mut count = 1;',text:'可变变量 count，初始值 1。'},{at:'println!("count 一开始是 {count}");',text:'打印当前值 1。'},{at:'count = count + 1;',text:'先算出右边 count + 1 等于 2，再赋给 count。'},{at:'println!("加 1 以后是 {count}");',text:'打印 2。'},{at:'let text = "42";',text:'text 是一段文字（字符串）"42"，不是数字，不能直接拿来做加法。'},{at:'let text: i32 = text.parse().unwrap();',text:'用 let 遮蔽旧的 text：右边把旧 text 解析成数字，冒号后面的 i32 告诉 parse 要解析成哪种数字类型。从这行起，text 指的就是数字 42。'},{at:'println!("遮蔽后 text 变成了数字：{}", text + 1);',text:'新 text 是数字，可以加 1，打印 43。'},{at:'const MAX_POINTS: u32 = 100_000;',text:'声明常量：必须写类型 u32，名字全大写。100_000 里的下划线只是分隔，值是 100000。'},{at:'println!("常量 MAX_POINTS = {MAX_POINTS}");',text:'打印常量的值 100000（打印时不会带下划线）。'}]},
  {title:'基本类型：整数、小数、布尔和字符',body:'每个值都有“类型”，类型决定了这个值占多大内存、能做哪些操作。Rust 是“静态类型”语言：每个变量的类型在编译时就必须确定。大多数时候编译器能根据值自己推断出来，推断不出来或者你想指定时，在变量名后面加冒号写上类型。\n最基本的四种类型（叫“标量类型”，表示单个值）：\n一、整数：i 开头的是“有符号”整数，可以是负数，比如 i8、i16、i32、i64、i128，数字是占用的二进制位数，位数越多能表示的范围越大，i32 的范围大约是正负 21 亿；u 开头的是“无符号”整数，只能是 0 和正数，比如 u8 的范围是 0 到 255。还有 isize 和 usize，大小和电脑的位数一样（64 位电脑上就是 64 位），数组的下标、长度都用 usize。不写类型的整数默认是 i32；\n二、浮点数（小数）：f32 和 f64，默认是 f64，精度更高；\n三、布尔值 bool：只有 true（真）和 false（假）两个值，常用来做判断；\n四、字符 char：用单引号括起来的一个字符，比如 \'A\'、\'蟹\'，甚至一个表情符号。注意单引号是字符，双引号是字符串（一串文字），两者不是同一个类型。',code:`let a: i32 = -42;
let b: u8 = 255;
let c = 3.5;
let d: bool = true;
let e: char = '蟹';
let big = 1_000_000;`,explain:[{at:'let a: i32 = -42;',text:'32 位有符号整数，可以是负数。'},{at:'let b: u8 = 255;',text:'8 位无符号整数，最大就是 255；写 256 会编译报错，因为装不下。'},{at:'let c = 3.5;',text:'带小数点的数，没写类型时默认是 f64。'},{at:'let d: bool = true;',text:'布尔值，只能是 true 或 false。'},{at:'let e: char = \'蟹\';',text:'字符用单引号。Rust 的 char 能表示任何 Unicode 字符（Unicode 是给全世界的文字和符号统一编号的标准），包括汉字。'},{at:'let big = 1_000_000;',text:'没写类型的整数默认是 i32，下划线只是方便阅读，值是一百万。'}]},
  {title:'算术运算和类型转换',body:'整数和小数都能做加 +、减 -、乘 *、除 /、取余 %（求除法的余数，比如 7 % 3 等于 1）运算。要注意几点：\n一、两个整数相除，结果还是整数，小数部分直接丢掉：7 / 2 等于 3，想要 3.5 就得用小数 7.0 / 2.0；\n二、Rust 不会偷偷帮你转换类型，i32 和 f64 不能直接相加，u8 和 i32 也不能直接相加，编译器会报错。需要时用 as 手动转换，比如 x as f64；\n三、用 as 把大的整数转成装不下它的小类型时，会直接截掉多出来的二进制位，结果可能和你想的不一样：300 转成 u8 会变成 44（300 减去 256）；\n四、“整数溢出”：计算结果超出了类型能表示的范围，比如 u8 的 255 再加 1。调试版程序遇到溢出会直接停止并报错（叫 panic，可以理解成“程序遇到无法继续的错误，紧急停车”），发布版则默认“绕回去”变成 0。如果确实需要处理溢出，可以用 checked_add 这类方法，后面的关卡会遇到。'},
  {title:'元组和数组：把几个值放在一起',body:'有时候需要把几个值打包成一个整体，Rust 内置了两种“复合类型”：\n一、元组（tuple）：用圆括号把几个值括起来，每个值的类型可以不同，比如 (3, 1.5, \'R\')。元组的长度固定，造好以后不能增减。取值有两种方式：用 .0、.1、.2 按位置取（位置从 0 开始数）；或者用 let (x, y, z) = 元组; 一次拆开，这叫“解构”；\n二、数组（array）：用方括号把几个值括起来，所有值的类型必须相同，长度也固定，比如 [90, 85, 77]。用 数组[下标] 取值，下标同样从 0 开始；数组.len() 得到长度。[0; 3] 是一种简写，意思是“3 个 0”。\n如果下标超出了范围，比如长度为 3 的数组取 [5]，程序会 panic（紧急停止）而不是读到一块乱七八糟的内存，这正是 Rust 安全的地方。\n需要能变长的列表时，用的是 Vec（动态数组），第 7 关会讲。'},
  {title:'动手试试：元组、数组和数字运算',body:'把元组、数组、整数除法和 as 转换放在一起跑一遍，对照每一行输出，弄清楚它们的行为。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 scores[1] 改成 scores[5]，再运行，看看程序 panic 时打印了什么。'],expect:'x = 3, y = 1.5, z = R\n第一个元素：3\n一共 3 个成绩，第二个是 85\n[0, 0, 0]\n7 / 2 = 3，7.0 / 2.0 = 3.5\n300 转成 u8 变成 44'},code:`fn main() {
    let point: (i32, f64, char) = (3, 1.5, 'R');
    let (x, y, z) = point;
    println!("x = {x}, y = {y}, z = {z}");
    println!("第一个元素：{}", point.0);

    let scores = [90, 85, 77];
    println!("一共 {} 个成绩，第二个是 {}", scores.len(), scores[1]);
    let zeros = [0; 3];
    println!("{:?}", zeros);

    let total = 7 / 2;
    let exact = 7.0 / 2.0;
    println!("7 / 2 = {total}，7.0 / 2.0 = {exact}");
    let n = 300_i32 as u8;
    println!("300 转成 u8 变成 {n}");
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let point: (i32, f64, char) = (3, 1.5, \'R\');',text:'一个元组，三个值的类型分别是整数、小数、字符。冒号后面的 (i32, f64, char) 是元组的类型，写出来是为了让你看清楚，不写也能推断。'},{at:'let (x, y, z) = point;',text:'解构：把元组的三个值依次放进 x、y、z 三个变量。'},{at:'println!("x = {x}, y = {y}, z = {z}");',text:'打印三个变量。'},{at:'println!("第一个元素：{}", point.0);',text:'point.0 按位置取元组的第一个值 3。'},{at:'let scores = [90, 85, 77];',text:'一个有 3 个整数的数组。'},{at:'println!("一共 {} 个成绩，第二个是 {}", scores.len(), scores[1]);',text:'len() 返回长度 3；scores[1] 是下标 1，也就是第二个值 85。'},{at:'let zeros = [0; 3];',text:'简写：3 个 0 组成的数组 [0, 0, 0]。'},{at:'println!("{:?}", zeros);',text:'数组不能用 {} 打印，要用调试格式 {:?}，打印出 [0, 0, 0]。'},{at:'let total = 7 / 2;',text:'两个整数相除，结果是整数 3，小数部分被丢掉。'},{at:'let exact = 7.0 / 2.0;',text:'两个小数相除，结果是 3.5。'},{at:'println!("7 / 2 = {total}，7.0 / 2.0 = {exact}");',text:'打印两个结果作对比。'},{at:'let n = 300_i32 as u8;',text:'300_i32 表示“类型为 i32 的 300”（数字后面直接写类型叫“类型后缀”）。as u8 把它转成 u8，装不下的高位被截掉，得到 44。'},{at:'println!("300 转成 u8 变成 {n}");',text:'打印 44。'}]},
  {title:'函数：参数和返回值',body:'函数把一段代码打包起来、起个名字，需要时调用它，就不用把同样的代码写好几遍。Rust 的函数这样写：\nfn 函数名(参数名: 类型, 参数名: 类型) -> 返回值类型 { 函数体 }\n要点：\n一、每个参数都必须写明类型，编译器不会帮你推断参数类型；\n二、-> 后面写返回值的类型；不返回值的函数不写 -> 这一部分；\n三、函数名按惯例用小写字母加下划线，比如 add_one，这叫“蛇形命名”（snake_case）；\n四、函数写在 main 前面还是后面都可以，Rust 不要求先定义后使用。\n返回值有个特别的写法：函数体最后一行如果是一个“没有分号的表达式”，它的值就是函数的返回值。比如 a + b 后面不加分号，就表示返回 a + b。也可以用 return a + b; 提前返回，但习惯上最后一行直接写表达式。'},
  {title:'语句和表达式：分号的意义',body:'Rust 把代码分成两类：\n一、语句（statement）：执行一个动作，但不产生值。比如 let x = 5; 就是语句。所以 let a = (let b = 5); 这样的写法是错的，因为 let b = 5 没有值可以给 a；\n二、表达式（expression）：会算出一个值。比如 5、a + b、调用函数 add(1, 2)，甚至用花括号括起来的一整个代码块，都是表达式。\n关键在于分号：在表达式后面加上分号，它就变成了语句，值就被丢掉了。代码块 { } 的值，就是它里面最后那个没加分号的表达式的值。\n所以函数最后一行写 a + b 表示返回它；如果不小心写成 a + b;，这个函数就什么也没返回（Rust 里“什么也没有”用一个空元组 () 表示，读作 unit），编译器会报“类型不匹配：期望 i32，实际是 ()”，并提示你删掉分号。'},
  {title:'动手试试：函数和代码块的值',body:'写两个函数：一个有返回值，一个只打印不返回；再用一个代码块算出一个值。代码里 name: &str 表示参数 name 是一段文字，&str 这个类型下一关会细讲。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','在 add 函数的 a + b 后面加一个分号，再运行，读一读编译器的报错和建议。'],expect:'你好，小红！\n3 + 4 = 7\n代码块的值是 20'},code:`fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn greet(name: &str) {
    println!("你好，{name}！");
}

fn main() {
    greet("小红");
    let sum = add(3, 4);
    println!("3 + 4 = {sum}");
    let y = {
        let x = 10;
        x * 2
    };
    println!("代码块的值是 {y}");
}`,explain:[{at:'fn add(a: i32, b: i32) -> i32 {',text:'定义函数 add：两个 i32 类型的参数 a 和 b，-> i32 表示返回一个 i32。'},{at:'a + b',text:'最后一行是没有分号的表达式，它的值就是返回值。'},{at:'fn greet(name: &str) {',text:'定义函数 greet：参数 name 是一段文字；没有 ->，表示不返回值。'},{at:'println!("你好，{name}！");',text:'打印问候语。'},{at:'fn main() {',text:'程序入口。main 写在两个函数后面，但程序仍然从 main 开始执行。'},{at:'greet("小红");',text:'调用 greet，把 "小红" 传给参数 name，打印第一行。'},{at:'let sum = add(3, 4);',text:'调用 add(3, 4)，返回值 7 存进 sum。'},{at:'println!("3 + 4 = {sum}");',text:'打印 3 + 4 = 7。'},{at:'let y = {',to:'};',text:'花括号代码块也是表达式：里面先声明 x = 10，最后一行 x * 2 没有分号，所以整个代码块的值是 20，赋给 y。末尾的分号属于 let 语句。代码块里的 x 只在这对花括号里有效。'},{at:'println!("代码块的值是 {y}");',text:'打印 20。'}]},
  {title:'if：根据条件选择走哪条路',body:'if 用来“如果……就……否则……”：if 条件 { 条件成立时执行 } else { 条件不成立时执行 }。中间还可以加 else if 再判断别的条件，从上往下检查，第一个成立的分支执行后就不再看后面的。\n和其他语言相比，有两点要注意：\n一、条件必须是 bool 类型。有些语言里 if 1 { } 表示“真”，Rust 不行，必须写成 if x != 0 这样真正的判断；\n二、if 本身是表达式，有值，可以直接放在 let 右边：let level = if score >= 60 { "及格" } else { "不及格" };。这时每个分支的值类型必须相同，不能一个分支是文字、另一个是数字。\n常用的比较运算：== 等于、!= 不等于、> 大于、< 小于、>= 大于等于、<= 小于等于；组合条件用 && 表示“并且”，|| 表示“或者”，! 表示“不是”。'},
  {title:'三种循环：loop、while 和 for',body:'循环就是让一段代码重复执行。Rust 有三种写法：\n一、loop { }：无限循环，一直重复，直到遇到 break（跳出循环）。loop 也是表达式，break 后面可以带一个值，作为整个 loop 的值，常用来“反复尝试直到成功，并带回结果”；\n二、while 条件 { }：每次执行前先检查条件，条件成立就执行一遍，不成立就结束；\n三、for 变量 in 范围或集合 { }：依次取出每个元素执行一遍，最常用，也最不容易写错。1..5 表示从 1 到 4（不包含 5），1..=5 表示从 1 到 5（包含 5）。\n在任何一种循环里，break 跳出整个循环，continue 跳过这一次剩下的代码、直接进入下一次。\n有循环嵌套时，可以给外层循环起个“标签”，比如 \'outer: for ... { }，在里层写 break \'outer; 就能直接跳出外层循环。'},
  {title:'动手试试：条件和循环',body:'把 if 表达式和三种循环都用一遍：给成绩评级、找出第一个平方大于 50 的数、倒计时，再用 for 算 1 到 10 里奇数的和，最后遍历一个数组。\n代码里的 n += 1 是 n = n + 1 的简写，同样还有 -=、*= 等。print! 和 println! 一样，只是打印完不换行。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 score 改成 95 和 30 各运行一次，看看评级怎么变。','把 1..=10 改成 1..10，想一想结果会不会变，再运行验证。'],expect:'82 分：及格\n第一个平方大于 50 的数是 8\n3... 2... 1... 发射！\n1 到 10 的奇数和：25\n水果：苹果\n水果：香蕉\n水果：橙子'},code:`fn main() {
    let score = 82;
    let level = if score >= 90 {
        "优秀"
    } else if score >= 60 {
        "及格"
    } else {
        "不及格"
    };
    println!("{score} 分：{level}");

    let mut n = 0;
    let found = loop {
        n += 1;
        if n * n > 50 {
            break n;
        }
    };
    println!("第一个平方大于 50 的数是 {found}");

    let mut countdown = 3;
    while countdown > 0 {
        print!("{countdown}... ");
        countdown -= 1;
    }
    println!("发射！");

    let mut sum = 0;
    for i in 1..=10 {
        if i % 2 == 0 {
            continue;
        }
        sum += i;
    }
    println!("1 到 10 的奇数和：{sum}");

    let fruits = ["苹果", "香蕉", "橙子"];
    for fruit in fruits {
        println!("水果：{fruit}");
    }
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let score = 82;',text:'要评级的成绩。'},{at:'let level = if score >= 90 {',to:'};',text:'if 表达式：82 不满足 >= 90，满足 >= 60，所以 level 得到 "及格"。三个分支的值都是文字，类型相同；每个分支里的值后面都不加分号。'},{at:'println!("{score} 分：{level}");',text:'打印 82 分：及格。'},{at:'let mut n = 0;',text:'计数用的可变变量，从 0 开始。'},{at:'let found = loop {',text:'开始一个无限循环，它最后的值会存进 found。'},{at:'n += 1;',text:'每转一圈 n 加 1。'},{at:'if n * n > 50 {',to:'break n;',text:'n 的平方大于 50 时跳出循环，并把 n 作为整个 loop 的值带出去。7 的平方是 49 不够，8 的平方是 64，所以在 n 等于 8 时跳出。'},{at:'println!("第一个平方大于 50 的数是 {found}");',text:'打印 8。'},{at:'let mut countdown = 3;',text:'倒计时从 3 开始。'},{at:'while countdown > 0 {',text:'每次循环前检查 countdown 是否大于 0，变成 0 时循环结束。'},{at:'print!("{countdown}... ");',text:'打印数字但不换行，所以 3... 2... 1... 都在同一行。'},{at:'countdown -= 1;',text:'减 1，否则条件永远成立，循环停不下来。'},{at:'println!("发射！");',text:'循环结束后接着打印，并换行。'},{at:'let mut sum = 0;',text:'用来累加的变量。'},{at:'for i in 1..=10 {',text:'i 依次取 1 到 10（..= 表示包含 10）。'},{at:'if i % 2 == 0 {',to:'continue;',text:'i 除以 2 余数为 0 就是偶数，continue 跳过下面的累加，直接进入下一个 i。'},{at:'sum += i;',text:'只有奇数会走到这里：1 + 3 + 5 + 7 + 9 = 25。'},{at:'println!("1 到 10 的奇数和：{sum}");',text:'打印 25。'},{at:'let fruits = ["苹果", "香蕉", "橙子"];',text:'一个有 3 段文字的数组。'},{at:'for fruit in fruits {',to:'println!("水果：{fruit}");',text:'for 依次取出数组里的每个元素放进 fruit，打印三行。'}]},
  {title:'注释：写给人看的说明',body:'注释是写给读代码的人看的，编译器会忽略它。Rust 有三种常见注释：\n一、// 单行注释：从 // 到这一行结尾都是注释；\n二、/* */ 多行注释：中间可以跨好几行，但 Rust 程序员很少用；\n三、/// 文档注释：写在函数、类型的上面，用来说明它的用途和用法。运行 cargo doc --open 会把这些文档注释生成一个网页版的说明书，标准库的官方文档就是这样生成的。\n好的注释解释“为什么这样做”，而不是重复代码已经说清楚的事。比如 // 加 1 就是多余的，// 下标从 1 开始，因为第 0 位是表头 就很有用。'}
 ],quiz:[
{id:'rust-basics-1',q:'下面代码能编译通过吗？',code:'let x = 5;\nx = 6;\nprintln!("{x}");',options:['不能，因为 x 不可变','能编译，运行打印 6','能编译，运行打印 5','不能，6 的类型不对'],why:['','x 没有加 mut，不能重新赋值，所以编译不通过。','编译阶段就报错了，程序根本不会运行。','6 和 5 都是 i32，类型没有问题，问题在于 x 不可变。'],answer:0,explain:'Rust 的变量默认不可变，要重新赋值必须声明成 let mut x = 5;。'},
  {id:'rust-basics-2',q:'关于遮蔽（用 let 再声明一个同名变量），下面说法正确的是？',options:['新变量的类型可以和旧变量不同','遮蔽以后旧变量的值也被改掉了','加了 mut 的变量才可以被遮蔽','遮蔽后的新变量自动变成可变'],why:['','遮蔽是造了一个新变量，旧变量的值没有被修改，只是之后用这个名字拿到的是新变量。','不可变变量同样可以被遮蔽，和 mut 无关。','新变量没加 mut 时仍然不可变。'],answer:0,explain:'遮蔽创建的是全新的变量，所以类型可以变，比如先是文字 "42"，再遮蔽成数字 42。'},
  {id:'rust-basics-3',q:'没有写类型的整数（比如 let n = 10;），默认是什么类型？',options:['i32','i64','u32','usize'],why:['','i64 要自己写明类型，比如 let n: i64 = 10;。','u32 是无符号整数，不是默认类型。','usize 一般用于下标和长度，不是默认类型。'],answer:0,explain:'编译器推断不出更具体的类型时，整数默认是 i32，小数默认是 f64。'},
  {id:'rust-basics-4',type:'judge',q:'let c = \'AB\'; 可以编译通过，c 是 char 类型。',answer:false,explain:'char 用单引号，只能放一个字符，比如 \'A\'。一串文字要用双引号写成字符串 "AB"。'},
  {id:'rust-basics-5',q:'println!("{}", 7 / 2); 打印什么？',options:['3','3.5','4','3.0'],why:['','两个整数相除，结果还是整数，小数部分直接丢掉。','整数除法不会四舍五入，而是直接丢掉小数部分。','结果是整数类型，打印时不会带 .0。'],answer:0,explain:'整数除以整数得到整数，7 / 2 等于 3；想得到 3.5 要写 7.0 / 2.0。'},
  {id:'rust-basics-6',type:'multi',q:'函数签名是 fn add(a: i32, b: i32) -> i32，下面哪些写法能让它正确返回 a 与 b 的和？（多选）',options:['最后一行写 a + b，不加分号','最后一行写 return a + b;','最后一行写 a + b; 带分号','删掉签名里的 -> i32'],why:['','','加了分号就变成语句，函数返回的是空元组 ()，和 i32 不匹配，编译报错。','删掉 -> i32 表示函数不返回值，和“返回和”的要求不符。'],answers:[0,1],explain:'函数体最后一个不带分号的表达式就是返回值；也可以用 return 显式返回。'},
  {id:'rust-basics-7',type:'fill',q:'用 let 声明变量时，想让它以后还能被修改，要在 let 后面加上的关键字是＿。',accepted:['mut'],explain:'mut 是 mutable（可变的）的缩写：let mut x = 5; 之后可以写 x = 6;。'},
  {id:'rust-basics-8',q:'for i in 1..5 会让 i 依次取哪些值？',options:['1、2、3、4','1、2、3、4、5','0、1、2、3、4','2、3、4、5'],why:['','.. 不包含右边的 5，要包含得写 1..=5。','范围从左边的 1 开始，不是从 0 开始。','范围包含左边的 1。'],answer:0,explain:'a..b 包含 a、不包含 b；a..=b 两端都包含。'},
  {id:'rust-basics-9',type:'judge',q:'Rust 的 if 是表达式，所以可以写 let x = if a > b { 1 } else { 0 };。',answer:true,explain:'if 有值，两个分支的值类型相同（这里都是整数）就能直接赋给变量。'},
  {id:'rust-basics-10',q:'下面代码打印什么？',code:'let mut n = 1;\nlet r = loop {\n    n *= 2;\n    if n > 20 {\n        break n;\n    }\n};\nprintln!("{r}");',options:['32','16','20','64'],why:['','16 还不大于 20，循环会继续，n 再翻倍成 32。','n 每次翻倍，取值是 2、4、8、16、32，不会等于 20。','n 等于 32 时已经满足条件跳出了，不会再翻倍。'],answer:0,explain:'n 依次变成 2、4、8、16、32，32 大于 20，break n 把 32 作为 loop 的值赋给 r。'},
  {id:'rust-basics-11',type:'judge',q:'if 1 { println!("真"); } 在 Rust 里可以编译通过。',answer:false,explain:'Rust 的 if 条件必须是 bool 类型，不会把数字自动当成真假，要写成 if x != 0 这样的判断。'},
  {id:'rust-basics-12',q:'常量 const 和不可变变量 let 相比，下面哪个说法正确？',options:['常量要写明类型，值在编译时确定','常量的值在程序运行时可以修改','常量名按惯例用小写字母开头','常量要写在 main 函数的里面'],why:['','常量的值永远不能改，也不能加 mut。','常量名按惯例全部大写，单词间用下划线，比如 MAX_POINTS。','常量可以写在函数外面，整个文件都能用。'],answer:0,explain:'const 必须标注类型，值必须是编译时就能算出来的，名字习惯全大写。'},
  {id:'rust-basics-13',type:'fill',q:'for 循环要遍历从 1 到 10 并且包含 10 的范围，写成 for i in ＿ { }。',accepted:['1..=10'],explain:'..= 表示包含右端；写 1..10 只到 9。也可以写 1..11，但 1..=10 更直观。'},
  {id:'rust-basics-14',type:'multi',q:'下面哪些是 Rust 内置的标量类型（表示单个值的类型）？（多选）',options:['i32','f64','bool','char'],why:['','','',''],answers:[0,1,2,3],explain:'四种标量类型：整数（如 i32）、浮点数（如 f64）、布尔值 bool 和字符 char。元组和数组是复合类型。'},
  {id:'rust-basics-15',q:'u8 类型能表示的最大值是？',options:['255','256','127','65535'],why:['','u8 有 8 个二进制位，能表示 0 到 255 共 256 个数，最大是 255。','127 是 i8（有符号 8 位整数）的最大值。','65535 是 u16 的最大值。'],answer:0,explain:'u8 是 8 位无符号整数，范围 0 到 2 的 8 次方减 1，也就是 0 到 255。'},
  {id:'rust-basics-16',type:'judge',q:'函数参数的类型可以省略不写，编译器会自动推断。',answer:false,explain:'Rust 要求每个函数参数都写明类型，这让函数签名本身就是清楚的说明；函数体里的局部变量才可以靠推断。'},
  {id:'rust-basics-17',q:'let t = (1, "a", 2.5); 怎样取出其中的 "a"？',options:['t.1','t[1]','t.0','t(1)'],why:['','方括号下标是数组的取值方式，元组要用点加位置。','t.0 取的是第一个值 1。','元组不能像函数一样用圆括号调用。'],answer:0,explain:'元组用 .位置 取值，位置从 0 开始，"a" 在第 1 位，所以是 t.1。'},
  {id:'rust-basics-18',type:'code',q:'写一个函数 max_of(a: i32, b: i32) -> i32，返回两个数中较大的那个。要求用 if 表达式实现，不使用 return。再在 main 里调用 max_of(3, 9) 并打印结果。',reference:'fn max_of(a: i32, b: i32) -> i32 {\n    if a > b { a } else { b }\n}\n\nfn main() {\n    let m = max_of(3, 9);\n    println!("较大的是 {m}");\n}',points:['函数签名写对参数和返回值类型','用 if 表达式作为函数最后一行且不加分号','两个分支返回的都是 i32','main 中调用并打印结果 9'],explain:'if 表达式本身有值，作为函数最后一行就是返回值；分支里的 a、b 后面不能加分号。'},
 ]},
 {id:'rust-ownership',title:'所有权与借用',summary:'栈和堆、所有权转移、Clone 与 Copy、引用和借用规则、String 与 &str、切片',lessons:[
  {title:'为什么需要所有权：内存由谁来收拾',body:'程序运行时要把数据放在内存里。内存是有限的，用完的数据所占的内存必须“还回去”，否则程序越跑越占内存，最后耗尽（这叫“内存泄漏”）。不同语言用不同办法解决“谁来还、什么时候还”：\n一、C、C++：程序员自己手动申请、手动释放。忘了释放就泄漏；释放早了、后面又去用它（叫“释放后使用”），或者释放两次，程序就可能崩溃，甚至被黑客利用；\n二、Java、Go、Python：运行时有一个“垃圾回收器”（GC），定期找出没人再用的数据并回收。程序员省心了，但回收器本身要占用 CPU，有时还会让程序短暂停顿；\n三、Rust：第三条路——所有权（ownership）。编译器按一套固定规则在编译时就算清楚“每块内存什么时候不再需要”，并在那个位置自动插入释放内存的代码。既不用手动释放，也没有垃圾回收器，违反规则的代码直接编译不通过。\n所有权是 Rust 最核心、也是和其他语言最不一样的概念，这一关会慢慢讲透。'},
  {title:'栈和堆：内存里的两块区域',body:'理解所有权之前，先认识程序使用的两块内存区域：\n一、栈（stack）：像一摞盘子，后放上去的先拿走。往栈上放数据和取数据都非常快，但放在栈上的数据必须在编译时就知道大小、而且大小固定，比如一个 i32 固定占 4 个字节。函数里的普通局部变量都放在栈上，函数结束时自动弹出；\n二、堆（heap）：像一个大仓库。要放一个编译时不知道大小、或者运行中会变大变小的数据（比如用户输入的一段文字）时，程序向“内存分配器”申请一块足够大的空间，分配器找到空位后返回这块空间的地址（叫“指针”，就是一个记录位置的数字）。这个指针本身大小固定，可以放在栈上；真正的数据在堆上。\n在堆上申请和找数据都比栈慢，而且堆上的内存必须有人负责还回去。所有权规则管的，主要就是堆上的数据：谁负责它、什么时候释放它。'},
  {title:'所有权的三条规则',body:'Rust 的所有权只有三条规则，后面的一切都从这里推出来：\n一、每个值都有一个“所有者”（owner），也就是拥有它的那个变量；\n二、同一时刻，一个值只能有一个所有者；\n三、所有者离开它的作用域时，这个值就被丢弃（drop），占用的内存被释放。\n“作用域”是一个变量有效的代码范围，通常从声明它的那一行开始，到它所在的那对花括号结束。下面的代码里，s 在内层花括号结束时离开作用域，Rust 会在这里自动调用一个叫 drop 的函数，释放 s 在堆上占用的内存。你不用写任何释放代码。',code:`fn main() {
    {
        let s = String::from("hello");
        println!("{s}");
    }
    // 这里 s 已经离开作用域，内存已经释放，再用 s 会编译报错
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let s = String::from("hello");',text:'上一行单独的 { 开始了一个内层代码块，也就是一个新的作用域。s 从这里开始有效。String::from 在堆上申请内存，放进 hello 这几个字符，s 就是这块数据的所有者。'},{at:'println!("{s}");',text:'在作用域内使用 s，没有问题。'}]},
  {title:'String：可以变长的字符串',body:'前面用过的 "hello" 这种写在双引号里的字符串叫“字符串字面量”，它的内容在编译时就确定了，直接写进程序文件里，不能修改。\n如果字符串的内容要在运行时才知道（比如用户输入），或者要往后追加文字，就要用 String 类型。String 把文字存在堆上，可以变长：\n一、String::from("hello") 或 "hello".to_string()：用字面量造一个 String。两个冒号 :: 表示“属于某个类型的函数”，String::from 就是 String 类型自带的 from 函数；\n二、s.push_str("文字")：在末尾追加一段文字，s 必须是 mut；\n三、s.len()：返回字符串占多少个字节（不是字符个数）。Rust 的字符串统一用 UTF-8 编码保存（UTF-8 是一种把字符变成字节的规则），英文字母每个占 1 个字节，一个汉字通常占 3 个字节，所以 "你好".len() 是 6。\n一个 String 变量在栈上存三样东西：指向堆上数据的指针、当前长度（len）和已申请的容量（capacity），真正的文字在堆上。'},
  {title:'移动：把所有权交给别人',body:'看这两行：let s1 = String::from("你好"); let s2 = s1;\n如果 Rust 像有些语言那样，把堆上的数据也复制一份，字符串很长时会很慢；如果只复制栈上的指针，让 s1 和 s2 都指向同一块堆内存，那么两个变量离开作用域时都会释放这块内存，同一块内存被释放两次，就出错了（叫“重复释放”）。\nRust 的做法是：只复制栈上的指针、长度和容量，同时宣布 s1 从此无效。这叫“移动”（move）：所有权从 s1 转移到了 s2。之后再用 s1，编译器会报错 borrow of moved value（使用了已经被移动的值）。这样同一时刻只有 s2 一个所有者，离开作用域时只释放一次。\n下面的代码演示了这个错误（第 3 行会编译报错）。',code:`let s1 = String::from("你好");
let s2 = s1;
println!("{s1}");`,explain:[{at:'let s1 = String::from("你好");',text:'s1 是堆上这段文字的所有者。'},{at:'let s2 = s1;',text:'所有权从 s1 移动到 s2：s2 拿到了指针、长度和容量，s1 从这里开始失效。'},{at:'println!("{s1}");',text:'编译报错：s1 的值已经被移动走了，不能再用。编译器会提示你：如果确实需要两份，可以调用 s1.clone()。'}]},
  {title:'Clone 和 Copy：复制一份',body:'如果确实需要两份独立的数据，就明确地调用 .clone()：let s2 = s1.clone(); 会把堆上的数据也完整复制一份，s1 和 s2 各有各的内存，都能用。clone 可能比较耗时，所以 Rust 要求你明确写出来，看到 .clone() 就知道这里有一次复制。\n那为什么 let a = 5; let b = a; 之后 a 还能用？因为像 i32 这样的类型大小固定、完全放在栈上，复制一份非常便宜，复制以后两个变量互不影响，也就不存在重复释放的问题。这类类型实现了 Copy 特性（“特性”叫 trait，第 9 关会讲，这里理解成“这个类型具备的一种能力”）：赋值时自动复制，原变量继续有效。\n实现了 Copy 的常见类型：所有整数、浮点数、bool、char，以及只包含这些类型的元组和数组，比如 (i32, f64)。String 不是 Copy，因为它在堆上有数据。'},
  {title:'动手试试：移动、克隆和复制',body:'把移动、clone 和 Copy 放在一起跑一遍。代码里有一行被注释掉的打印，运行通过以后，按步骤把它打开，亲眼看看编译器怎么拦住“使用已移动的值”。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 // println!("{s1}"); 这一行开头的 // 删掉，再运行 cargo run，读一读报错：编译器会指出 s1 在哪一行被移动、又在哪一行被使用。看完把 // 加回去。'],expect:'s2 = 你好\ns2 = 你好, s3 = 你好\na = 5, b = 5\nFerris 螃蟹，长度 13 字节'},code:`fn main() {
    let s1 = String::from("你好");
    let s2 = s1;
    // println!("{s1}");
    println!("s2 = {s2}");

    let s3 = s2.clone();
    println!("s2 = {s2}, s3 = {s3}");

    let a = 5;
    let b = a;
    println!("a = {a}, b = {b}");

    let mut name = String::from("Ferris");
    name.push_str(" 螃蟹");
    println!("{name}，长度 {} 字节", name.len());
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let s1 = String::from("你好");',text:'s1 拥有堆上的“你好”。'},{at:'let s2 = s1;',text:'所有权移动到 s2，s1 失效。被注释掉的下一行如果打开，就会编译报错。'},{at:'println!("s2 = {s2}");',text:'s2 是现在的所有者，可以正常使用。'},{at:'let s3 = s2.clone();',text:'clone 把堆上的数据完整复制一份交给 s3，s2 仍然有效。'},{at:'println!("s2 = {s2}, s3 = {s3}");',text:'两个变量各有一份数据，都能打印。'},{at:'let a = 5;',to:'let b = a;',text:'i32 实现了 Copy：赋值时自动复制一份，a 不会失效。'},{at:'println!("a = {a}, b = {b}");',text:'a 和 b 都能用。'},{at:'let mut name = String::from("Ferris");',text:'要往字符串里追加文字，变量必须是 mut。'},{at:'name.push_str(" 螃蟹");',text:'在末尾追加一个空格和“螃蟹”。'},{at:'println!("{name}，长度 {} 字节", name.len());',text:'Ferris 6 个字节 + 空格 1 个字节 + 两个汉字各 3 个字节 = 13 字节。len() 数的是字节，不是字符个数。'}]},
  {title:'函数调用也会移动所有权',body:'把一个值传给函数，和把它赋给另一个变量一样：String 这种类型会被移动进函数，函数的参数成了新的所有者；i32 这种 Copy 类型则是复制一份传进去。\n所以下面的代码里，调用 take(s) 以后，s 就不能再用了。函数结束时参数离开作用域，堆上的数据被释放。\n函数的返回值也会转移所有权：函数把一个 String 返回出来，调用者用变量接住，这个变量就成了新的所有者。\n如果每次调用函数都要把所有权交出去、再让函数还回来，会非常麻烦。为此 Rust 提供了“引用”，下一张卡片讲。',code:`fn take(text: String) {
    println!("拿到了：{text}");
}

fn make() -> String {
    String::from("新做的")
}

fn main() {
    let s = String::from("你好");
    take(s);
    let t = make();
    println!("{t}");
}`,explain:[{at:'fn take(text: String) {',text:'参数类型是 String，调用时传进来的值的所有权会移动给参数 text。'},{at:'println!("拿到了：{text}");',text:'函数里使用 text。函数结束时 text 离开作用域，这段文字的内存被释放。'},{at:'fn make() -> String {',to:'String::from("新做的")',text:'在函数里新建一个 String 并作为返回值交出去，所有权转给调用者。'},{at:'fn main() {',text:'程序入口。'},{at:'let s = String::from("你好");',text:'s 是所有者。'},{at:'take(s);',text:'s 被移动进了 take，这一行之后再用 s 会编译报错。'},{at:'let t = make();',text:'make 返回的 String 的所有权交给 t。'},{at:'println!("{t}");',text:'打印 新做的。'}]},
  {title:'引用和借用：只借来用，不拿走',body:'引用（reference）就像“借书”：书还是图书馆的，你只是借来看，看完要还，也不能把它卖掉。\n在值前面加 & 就得到它的引用：&s 是指向 s 的引用，类型写作 &String。把引用传给函数，函数可以读取数据，但不获得所有权，函数结束时也不会释放数据。这种“创建引用”的行为叫“借用”（borrowing）。\n引用默认是不可变的：通过 &s 只能读，不能改。想通过引用修改数据，要用“可变引用”：原变量必须是 mut，引用写成 &mut s，函数参数类型写成 &mut String。\n通过引用调用方法时直接写 r.len()、r.push_str(...) 就行，Rust 会自动找到引用指向的数据。',code:`fn length(s: &String) -> usize {
    s.len()
}

fn add_exclaim(s: &mut String) {
    s.push_str("！");
}`,explain:[{at:'fn length(s: &String) -> usize {',text:'参数 s 的类型是 &String，即“一个 String 的引用”。函数只是借用，不拿走所有权；返回 usize（长度、下标用的无符号整数）。'},{at:'s.len()',text:'通过引用读取数据，返回字节数。函数结束时 s 这个引用失效，但它指向的 String 不受影响。'},{at:'fn add_exclaim(s: &mut String) {',text:'参数是可变引用 &mut String，函数可以修改借来的字符串。'},{at:'s.push_str("！");',text:'通过可变引用在末尾追加一个感叹号，调用者手里的那个 String 真的被改了。'}]},
  {title:'借用规则：要么多个读，要么一个写',body:'引用有两条规则，编译器会严格检查：\n一、在同一时刻，对同一个值，要么有任意多个不可变引用 &，要么只有一个可变引用 &mut，两者不能同时存在；\n二、引用必须一直有效：它指向的值不能比引用先被释放。\n第一条规则的道理：如果一个人在读、另一个人同时在改，读的人可能读到改了一半的数据。这种问题叫“数据竞争”，在多线程程序里尤其难查。Rust 在编译时就把它拦住了。\n“同一时刻”指的是引用实际被使用的那段范围：一个引用从创建开始，到它最后一次被使用为止有效，而不是一直到花括号结束。所以先创建两个不可变引用并用完，之后再创建可变引用，是完全没问题的，下面的练习就是这样写的。\n第二条规则要防止“悬垂引用”（引用指向的数据已经被释放了），下一关“生命周期”会专门讲。'},
  {title:'动手试试：借用',body:'用上一张卡片的两个函数，分别做一次不可变借用和可变借用；再在同一个变量上先建两个不可变引用、用完以后再建一个可变引用；最后把所有权交给一个函数。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 let r3 = &mut text; 这一行挪到 let r2 = &text; 的下一行（也就是 r1、r2 还没用完的时候），再运行，读一读报错 cannot borrow `text` as mutable because it is also borrowed as immutable（不能可变借用 text，因为它同时被不可变借用着）。看完改回来。'],expect:'Rust 有 4 个字节\n改完以后：Rust！\n两个不可变引用：Rust！ Rust！\n可变引用改完：Rust！加油\ntake 拿到了：Rust！加油'},code:`fn length(s: &String) -> usize {
    s.len()
}

fn add_exclaim(s: &mut String) {
    s.push_str("！");
}

fn take(s: String) {
    println!("take 拿到了：{s}");
}

fn main() {
    let mut text = String::from("Rust");
    let n = length(&text);
    println!("{text} 有 {n} 个字节");

    add_exclaim(&mut text);
    println!("改完以后：{text}");

    let r1 = &text;
    let r2 = &text;
    println!("两个不可变引用：{r1} {r2}");

    let r3 = &mut text;
    r3.push_str("加油");
    println!("可变引用改完：{r3}");

    take(text);
}`,explain:[{at:'fn length(s: &String) -> usize {',to:'s.len()',text:'借用一个 String，只读，返回字节数。'},{at:'fn add_exclaim(s: &mut String) {',to:'s.push_str("！");',text:'可变借用一个 String，在末尾加感叹号。'},{at:'fn take(s: String) {',to:'println!("take 拿到了：{s}");',text:'参数是 String 本身：调用时所有权被移动进来，函数结束时释放。'},{at:'fn main() {',text:'程序入口。'},{at:'let mut text = String::from("Rust");',text:'要被可变借用，text 必须是 mut。'},{at:'let n = length(&text);',text:'&text 创建不可变引用传进去，text 的所有权没有变。'},{at:'println!("{text} 有 {n} 个字节");',text:'借用结束后 text 照常可用，打印 Rust 有 4 个字节。'},{at:'add_exclaim(&mut text);',text:'&mut text 创建可变引用，函数把 text 改成了“Rust！”。'},{at:'println!("改完以后：{text}");',text:'打印修改后的内容。'},{at:'let r1 = &text;',to:'let r2 = &text;',text:'同时存在两个不可变引用，完全允许。'},{at:'println!("两个不可变引用：{r1} {r2}");',text:'这是 r1、r2 最后一次被使用，之后它们就不再算“正在借用”。'},{at:'let r3 = &mut text;',text:'r1、r2 已经用完，这时创建唯一的可变引用是合法的。'},{at:'r3.push_str("加油");',text:'通过可变引用追加文字。'},{at:'println!("可变引用改完：{r3}");',text:'打印 Rust！加油，这也是 r3 最后一次使用。'},{at:'take(text);',text:'把 text 的所有权交给 take，这一行之后 text 不能再用。'}]},
  {title:'切片：借用其中的一段',body:'切片（slice）是一种特殊的引用：它不是借用整个值，而是借用其中连续的一段。\n字符串切片写作 &s[开始..结束]，类型是 &str。比如 s 是 "hello world"，&s[0..5] 就是 "hello"，&s[6..] 是从下标 6 到末尾的 "world"，&s[..] 是整个字符串。这里的数字是“字节位置”，同样遵循“包含开始、不包含结束”。\n要特别小心中文：一个汉字占 3 个字节，切片的边界必须落在一个完整字符的开头或结尾。"你好" 取 &s[0..3] 得到“你”，取 &s[0..2] 会把“你”从中间切开，程序会 panic。\n数组也能切片：&nums[1..4] 借用数组下标 1 到 3 的三个元素，类型写作 &[i32]。\n切片因为是引用，同样受借用规则保护：只要切片还在使用，原来的数据就不能被修改或释放，所以不会出现“切片指向的数据已经变了”的问题。'},
  {title:'String 和 &str 到底有什么区别',body:'新手最常见的困惑之一：Rust 里怎么有两种字符串？\n一、String：拥有自己的数据，数据在堆上，可以修改、可以变长。它是所有者，离开作用域时释放内存；\n二、&str（读作“字符串切片”）：借用别人的一段文字，只能读，不能改，自己不拥有数据。字符串字面量 "hello" 的类型就是 &str，它借用的是编译后存放在程序文件里的那段文字。\n怎么选：\n一、函数参数只需要读取文字时，参数类型写 &str 最好，因为 String 的引用 &String 可以自动转换成 &str，于是这个函数既能接收 &String，也能直接接收字面量；\n二、需要拥有、保存或修改文字时（比如放进结构体里长期保存），用 String。\n互相转换：&str 变 String 用 .to_string() 或 String::from()；String 变 &str 用 &s 或 s.as_str()。'},
  {title:'动手试试：字符串切片和数组切片',body:'写一个 first_word 函数，找出一句话里的第一个单词：逐个检查每个字节，遇到空格就返回空格前面那一段的切片；一直没遇到空格，说明整句就是一个单词，原样返回。\n代码里的 s.as_bytes() 把字符串看成一串字节；b\' \' 表示“空格这个字符对应的字节”（前缀 b 表示 byte，字节）；return 用来提前从函数返回。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','在 main 最后加一行 println!("{}", &cn[0..2]);，再运行，看看切到汉字中间时 panic 打印了什么。看完删掉这一行。'],expect:'第一个单词：hello\nhello / world\n字面量本身就是\n[20, 30, 40]，共 3 个\n你好'},code:`fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for i in 0..bytes.len() {
        if bytes[i] == b' ' {
            return &s[..i];
        }
    }
    s
}

fn main() {
    let sentence = String::from("hello rust world");
    let word = first_word(&sentence);
    println!("第一个单词：{word}");

    let hello = &sentence[0..5];
    let world = &sentence[11..];
    println!("{hello} / {world}");

    let literal: &str = "字面量本身就是 &str";
    println!("{}", first_word(literal));

    let nums = [10, 20, 30, 40, 50];
    let middle: &[i32] = &nums[1..4];
    println!("{:?}，共 {} 个", middle, middle.len());

    let cn = String::from("你好世界");
    println!("{}", &cn[0..6]);
}`,explain:[{at:'fn first_word(s: &str) -> &str {',text:'参数和返回值都是 &str：借进来一段文字，借出去其中的一段。'},{at:'let bytes = s.as_bytes();',text:'把字符串当成字节数组来看，方便一个一个检查。'},{at:'for i in 0..bytes.len() {',text:'i 从 0 到最后一个字节的位置。'},{at:'if bytes[i] == b\' \' {',to:'return &s[..i];',text:'第 i 个字节是空格，就返回从开头到 i（不含 i）的切片，也就是第一个单词。'},{at:'    s',text:'循环结束都没遇到空格，整句就是一个单词，把 s 原样返回（最后一行不加分号）。'},{at:'fn main() {',text:'程序入口。'},{at:'let sentence = String::from("hello rust world");',text:'一个 String，下标 0 到 4 是 hello，5 是空格，6 到 9 是 rust，10 是空格，11 到 15 是 world。'},{at:'let word = first_word(&sentence);',text:'&sentence 是 &String，自动转换成 &str 传进去，得到切片 "hello"。'},{at:'println!("第一个单词：{word}");',text:'打印 hello。'},{at:'let hello = &sentence[0..5];',to:'let world = &sentence[11..];',text:'两个切片：0..5 是 hello；11.. 表示从 11 一直到末尾，是 world。'},{at:'println!("{hello} / {world}");',text:'打印 hello / world。'},{at:'let literal: &str = "字面量本身就是 &str";',text:'字符串字面量的类型就是 &str。'},{at:'println!("{}", first_word(literal));',text:'字面量可以直接传给参数为 &str 的函数。第一个空格在“是”后面，所以返回“字面量本身就是”。'},{at:'let nums = [10, 20, 30, 40, 50];',text:'一个有 5 个整数的数组。'},{at:'let middle: &[i32] = &nums[1..4];',text:'数组切片：借用下标 1、2、3 三个元素，类型是 &[i32]。'},{at:'println!("{:?}，共 {} 个", middle, middle.len());',text:'用调试格式打印 [20, 30, 40]，长度 3。'},{at:'let cn = String::from("你好世界");',text:'四个汉字，每个 3 个字节，一共 12 个字节。'},{at:'println!("{}", &cn[0..6]);',text:'前 6 个字节正好是两个完整的汉字，打印 你好。'}]}
 ],quiz:[
{id:'rust-ownership-1',q:'按照所有权规则，一个值在同一时刻可以有几个所有者？',options:['一个','两个','任意多个','没有限制'],why:['','同一时刻只能有一个所有者，赋值给别人时所有权会移动。','多个变量同时拥有同一块内存，离开作用域时就会重复释放。','所有者数量是有严格限制的。'],answer:0,explain:'每个值有且只有一个所有者；想让多个地方读取它，用引用（借用）而不是多个所有者。'},
  {id:'rust-ownership-2',q:'下面代码会怎样？',code:'let s1 = String::from("hi");\nlet s2 = s1;\nprintln!("{s1} {s2}");',options:['编译报错：s1 已被移动','正常运行：打印 hi hi','正常运行：s1 打印为空','运行时崩溃：重复释放'],why:['','String 赋值是移动而不是复制，s1 此后失效。','s1 不会变成空字符串，而是不能再用，编译阶段就拦住了。','Rust 在编译时就阻止了这种写法，不会等到运行时出问题。'],answer:0,explain:'let s2 = s1; 把所有权移动给 s2，之后使用 s1 会报 borrow of moved value。需要两份就用 s1.clone()。'},
  {id:'rust-ownership-3',type:'judge',q:'let a = 5; let b = a; 之后 a 仍然可以使用，因为 i32 实现了 Copy。',answer:true,explain:'i32 完全放在栈上，复制便宜，实现了 Copy：赋值时自动复制一份，原变量继续有效。'},
  {id:'rust-ownership-4',type:'multi',q:'下面哪些类型实现了 Copy（赋值时自动复制，原变量仍然可用）？（多选）',options:['i32','bool','String','(i32, char)'],why:['','','String 在堆上有数据，赋值时是移动，要复制得显式调用 clone。',''],answers:[0,1,3],explain:'整数、浮点数、bool、char 都是 Copy；只由 Copy 类型组成的元组和数组也是 Copy。'},
  {id:'rust-ownership-5',q:'关于借用规则，下面哪种情况会编译报错？',options:['同一时刻有两个不可变引用','不可变引用还在用时又建可变引用','先用完不可变引用再建可变引用','对一个 mut 变量建一个可变引用'],why:['任意多个不可变引用可以同时存在。','','引用在最后一次使用后就结束了，之后再建可变引用是合法的。','mut 变量本来就可以被可变借用。'],answer:1,explain:'同一时刻要么多个 &，要么一个 &mut。只要不可变引用之后还会被用到，就不能再创建可变引用。'},
  {id:'rust-ownership-6',type:'fill',q:'在一个值前面加上符号＿，就能得到它的不可变引用，传给函数时不会转移所有权。',accepted:['&'],explain:'&s 是 s 的不可变引用，&mut s 是可变引用。创建引用的行为叫借用。'},
  {id:'rust-ownership-7',q:'"你好".len() 的结果是？',options:['6','2','4','3'],why:['','len() 数的是字节数，不是字符个数。','UTF-8 中常用汉字各占 3 个字节，不是 2 个。','3 是一个汉字的字节数，这里有两个汉字。'],answer:0,explain:'Rust 字符串用 UTF-8 保存，常用汉字每个 3 个字节，两个就是 6。数字符个数用 .chars().count()。'},
  {id:'rust-ownership-8',type:'judge',q:'函数参数类型写成 &str，既能接收 &String，也能直接接收字符串字面量。',answer:true,explain:'&String 会自动转换成 &str，字面量本身就是 &str，所以只读文字的参数写 &str 最通用。'},
  {id:'rust-ownership-9',q:'关于 String 和 &str，下面哪个说法正确？',options:['String 拥有数据，&str 只是借用','&str 可以变长，String 不能','两者是一样的，只是写法不同','String 存英文，&str 存中文'],why:['','说反了：String 可以变长，&str 只能读。','两者是不同的类型：一个拥有数据，一个借用数据。','两者都用 UTF-8 保存，中英文都能存。'],answer:0,explain:'String 是所有者，数据在堆上，可修改；&str 是借用一段文字的切片，只读。'},
  {id:'rust-ownership-10',q:'下面代码打印什么？',code:'fn add(s: &mut String) {\n    s.push_str("!");\n}\n\nlet mut t = String::from("ok");\nadd(&mut t);\nadd(&mut t);\nprintln!("{t}");',options:['ok!!','ok!','ok','编译报错'],why:['','两次调用都修改了 t，各加一个感叹号。','可变引用修改的是 t 本身，不是副本。','两次可变借用一前一后，不同时存在，是合法的。'],answer:0,explain:'每次调用都借用 t 并追加 "!"，第一次借用结束后才开始第二次，所以合法，结果是 ok!!。'},
  {id:'rust-ownership-11',type:'judge',q:'变量离开作用域时，Rust 会自动释放它拥有的堆内存，不需要手写释放代码。',answer:true,explain:'所有者离开作用域时，编译器在那里自动插入 drop 调用，释放内存。'},
  {id:'rust-ownership-12',q:'let s = String::from("hello world"); 下面哪个表达式得到 "world"？',options:['&s[6..]','&s[5..]','&s[..6]','&s[6..10]'],why:['','下标 5 是空格，得到的是 " world"，开头多一个空格。','..6 是从开头到下标 5，得到 "hello "。','6..10 不包含 10，只得到 "worl"。'],answer:0,explain:'hello 占 0 到 4，空格是 5，world 从 6 开始到末尾，所以是 &s[6..]。'},
  {id:'rust-ownership-13',type:'multi',q:'把 String 变量 s 传给函数 fn f(x: String) 之后，下面哪些说法正确？（多选）',options:['s 的所有权移动给了参数 x','f 结束时释放这段文字的内存','调用之后 s 仍然可以正常使用','s 和 x 指向两份独立的数据'],why:['','','所有权已经移走，再用 s 会编译报错。','移动只复制栈上的指针、长度和容量，堆上的数据只有一份，归 x 所有。'],answers:[0,1],explain:'传 String 给函数就是移动：x 成为所有者，函数结束时 x 离开作用域并释放内存。只想读的话应该传 &s。'},
  {id:'rust-ownership-14',type:'fill',q:'想把一个 String 完整复制一份（连堆上的数据一起），让原变量继续可用，要调用的方法是＿。',accepted:['clone','clone()','.clone()'],explain:'s.clone() 深拷贝堆上的数据，代价可能较高，所以 Rust 要求你明确写出来。'},
  {id:'rust-ownership-15',type:'judge',q:'可以对一个没有加 mut 的变量创建可变引用 &mut。',answer:false,explain:'要可变借用，变量本身必须声明为 mut，比如 let mut s = String::new(); 才能写 &mut s。'},
  {id:'rust-ownership-16',q:'Rust 为什么禁止“可变引用和其他引用同时存在”？',options:['防止边读边改造成数据竞争','为了让程序编译得更快一些','因为引用会占用很多的内存','为了减少需要写的代码行数'],why:['','这条规则是为了安全，和编译速度无关。','引用只是一个地址，占用的内存很小。','这条规则和代码行数无关，有时反而要多写几行。'],answer:0,explain:'一边读一边改可能读到改了一半的数据（数据竞争），Rust 在编译时就杜绝了这种情况。'},
  {id:'rust-ownership-17',type:'code',q:'写两个函数：shout(s: &mut String) 在字符串末尾追加 "!!!"；count(s: &str) -> usize 返回字符串的字节数。在 main 里创建 String::from("hi")，先调用 shout，再打印 count 的结果（应为 5）。',reference:'fn shout(s: &mut String) {\n    s.push_str("!!!");\n}\n\nfn count(s: &str) -> usize {\n    s.len()\n}\n\nfn main() {\n    let mut text = String::from("hi");\n    shout(&mut text);\n    println!("{}", count(&text));\n}',points:['shout 参数用 &mut String 并调用 push_str','count 参数用 &str 并返回 len()','text 声明为 mut，调用时传 &mut text','调用 count 时传 &text，输出 5'],explain:'修改用 &mut，只读用 &str；两次借用一前一后，不冲突。'},
 ]},
 {id:'rust-lifetime',title:'生命周期',summary:'悬垂引用、生命周期标注、省略规则和 \'static',lessons:[
  {title:'悬垂引用：引用比数据活得还久',body:'上一关的借用规则第二条说：引用必须一直有效。违反它的情况叫“悬垂引用”（dangling reference）：引用还在，它指向的数据却已经被释放了。就像你手里还拿着一把钥匙，房子却已经拆了，再去开门就会出事。在 C、C++ 里这是常见的严重错误，Rust 在编译时就禁止它。\n下面的代码里，x 在内层花括号结束时就被释放了，而 r 在外面还想用它，编译器会报错：x does not live long enough（x 活得不够久）。',code:`fn main() {
    let r;
    {
        let x = 5;
        r = &x;
    }
    println!("r: {r}");
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let r;',text:'先声明变量 r，暂时不给值（Rust 允许先声明后赋值，只要在使用前赋过值）。r 在整个 main 里都有效。'},{at:'let x = 5;',text:'x 写在内层花括号里，只在内层有效。'},{at:'r = &x;',text:'让 r 引用 x。问题来了：r 活得比 x 久。'},{at:'println!("r: {r}");',text:'到这里 x 已经被释放，r 指向的数据不存在了。编译器在这一行报错，程序根本编译不出来。'}]},
  {title:'生命周期：引用的有效范围',body:'编译器里负责检查引用是否有效的部分叫“借用检查器”（borrow checker）。它给每个引用算出一个“生命周期”（lifetime）：这个引用从创建到最后一次被使用的那段范围。然后检查一件事：被引用的数据，活得至少要和引用一样久。\n上一张卡片里，r 的生命周期从第 2 行一直到第 7 行，而 x 只活在第 4 到第 6 行，数据比引用先死，所以报错。把 println 也挪进内层花括号，r 在 x 还活着时就用完了，就能编译通过。\n绝大多数时候，借用检查器自己就能算清楚，你什么都不用写。只有它“算不清楚”的时候，才需要你在代码里用“生命周期标注”告诉它引用之间的关系。最典型的场景就是：函数返回了一个引用。'},
  {title:'函数返回引用时的难题',body:'我们想写一个函数，比较两段文字，返回较长的那一段（返回引用，不复制）。下面这样写，编译器会报错：missing lifetime specifier（缺少生命周期标注），并提示返回值借用的到底是 x 还是 y，它看函数签名判断不出来。\n为什么它非知道不可？因为调用这个函数的地方，要根据“返回的引用借的是谁”来检查这个引用能用多久。可是返回 x 还是 y 要到运行时才知道（取决于文字长短），编译器在编译时只看函数签名，就没办法检查了。',code:`fn longest(x: &str, y: &str) -> &str {
    if x.len() >= y.len() { x } else { y }
}`,explain:[{at:'fn longest(x: &str, y: &str) -> &str {',text:'两个参数都是引用，返回值也是引用。编译器不知道返回值和哪个参数的生命周期有关，在这一行报错。'},{at:'if x.len() >= y.len() { x } else { y }',text:'按字节长度比较，返回较长的那个；可能返回 x，也可能返回 y。'}]},
  {title:'生命周期标注的写法',body:'解决办法是加“生命周期标注”，告诉编译器参数和返回值之间的关系。写法：\n一、生命周期参数的名字以单引号开头，通常用很短的小写字母，比如 \'a（读作“生命周期 a”）；\n二、先在函数名后面的尖括号里声明它：fn longest<\'a>(...)，尖括号里放的是“泛型参数”，生命周期就是其中一种，第 9 关讲泛型时会再看到尖括号；\n三、在引用的 & 后面写上它：&\'a str 表示“一个生命周期为 \'a 的字符串切片”。\n下面的签名意思是：x 和 y 都至少活 \'a 这么久，返回的引用也活 \'a 这么久。调用时，编译器会把 \'a 定为 x 和 y 中较短的那个生命周期，于是返回值只能在两个参数都还有效的范围内使用。',code:`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}`,explain:[{at:'fn longest<\'a>(x: &\'a str, y: &\'a str) -> &\'a str {',text:'<\'a> 声明一个生命周期参数；x、y 和返回值都标上 \'a，表示返回的引用在 x 和 y 都有效的范围内才能使用。'},{at:'if x.len() >= y.len() { x } else { y }',text:'函数体完全不用改，标注只是给编译器看的说明。'}]},
  {title:'动手试试：带生命周期标注的 longest',body:'用加了标注的 longest 比较两次：一次在内层作用域里比较并当场用掉结果，一次在外层把一个 String 和一个字面量作比较。两次都符合规则，能编译通过。\n代码里的 a.as_str() 把 String 转成 &str，和 &a 效果一样。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','试着让结果“活”到外层：在 let a 那一行下面加一行 let inner;，把内层的 let inner = 改成 inner =，再把内层的 println! 剪切到内层花括号的外面。运行后编译器会报 b does not live long enough（b 活得不够久），下一张卡片解释原因。看完改回来。'],expect:'内层最长的是：西瓜汁\n外层最长的是：苹果'},code:`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}

fn main() {
    let a = String::from("苹果");
    {
        let b = String::from("西瓜汁");
        let inner = longest(a.as_str(), b.as_str());
        println!("内层最长的是：{inner}");
    }
    let result = longest(a.as_str(), "梨");
    println!("外层最长的是：{result}");
}`,explain:[{at:'fn longest<\'a>(x: &\'a str, y: &\'a str) -> &\'a str {',to:'if x.len() >= y.len() { x } else { y }',text:'带生命周期标注的 longest，返回较长的那段文字。'},{at:'fn main() {',text:'程序入口。'},{at:'let a = String::from("苹果");',text:'a 在整个 main 里有效，占 6 个字节。'},{at:'let b = String::from("西瓜汁");',text:'b 写在内层花括号里，只在内层有效，占 9 个字节。'},{at:'let inner = longest(a.as_str(), b.as_str());',text:'\'a 取 a 和 b 中较短的生命周期，也就是 b 的，所以 inner 只能在内层使用。'},{at:'println!("内层最长的是：{inner}");',text:'在 b 还活着时用掉 inner，合法，打印 西瓜汁。'},{at:'let result = longest(a.as_str(), "梨");',text:'"梨" 是字面量，在整个程序运行期间都有效；\'a 取 a 的生命周期。苹果 6 个字节比梨的 3 个字节长，返回 a 的切片。'},{at:'println!("外层最长的是：{result}");',text:'a 还活着，合法，打印 苹果。'}]},
  {title:'标注不会让数据活得更久',body:'一个常见误解：以为加上 \'a 就能“延长”数据的寿命。其实生命周期标注不改变任何值活多久，它只是描述“几个引用的生命周期之间是什么关系”，让编译器能检查调用的地方有没有违反这个关系。\n下面的写法就违反了：result 要在外层使用，但 \'a 被定为 b 的生命周期，b 在内层就被释放了。编译器报错 b does not live long enough。即使实际运行时 a 更长、返回的其实是 a，编译器也不会放行，因为它只按签名检查，不去猜运行结果。\n遇到这种报错，常见的改法有：让 b 活得更久（挪到外层声明）；在 b 还活着时就用完结果；或者干脆返回一个新的 String（拥有数据，不再是借用）。',code:`let a = String::from("长长的字符串");
let result;
{
    let b = String::from("短");
    result = longest(a.as_str(), b.as_str());
}
println!("{result}");`,explain:[{at:'let a = String::from("长长的字符串");',text:'a 在外层，活得久。'},{at:'let result;',text:'result 在外层声明，打算在外层使用。'},{at:'let b = String::from("短");',text:'b 只活在内层。'},{at:'result = longest(a.as_str(), b.as_str());',text:'返回值的生命周期 \'a 被限制为 b 的生命周期。'},{at:'println!("{result}");',text:'这里 b 已经被释放，按签名 result 可能指向 b，所以编译报错。'}]},
  {title:'省略规则：大多数时候不用写',body:'上一关的 first_word(s: &str) -> &str 也返回了引用，为什么不用写 \'a？因为编译器有三条“生命周期省略规则”（lifetime elision rules），符合规则的常见写法，它会自动补上标注：\n一、每个引用参数各自得到一个生命周期。比如 fn f(x: &str, y: &str) 相当于 fn f<\'a, \'b>(x: &\'a str, y: &\'b str)；\n二、如果只有一个引用参数，它的生命周期就自动给所有返回的引用。所以 fn first_word(s: &str) -> &str 相当于 fn first_word<\'a>(s: &\'a str) -> &\'a str；\n三、如果是“方法”（属于某个类型的函数，第 5 关会讲），而且第一个参数是 &self 或 &mut self，那么返回的引用自动用 self 的生命周期。\n三条规则用完，返回值的生命周期还确定不了，编译器才会报错，要你自己标注。longest 有两个引用参数，第二条规则用不上，所以必须手写。\n另外，如果返回值只和其中一个参数有关，就只给那个参数标 \'a，另一个参数不用标，比如 fn first<\'a>(x: &\'a str, y: &str) -> &\'a str。'},
  {title:'\'static：活到程序结束',body:'有一个特殊的生命周期叫 \'static，表示“在整个程序运行期间都有效”。\n所有的字符串字面量都是 &\'static str：它们被直接写进了编译出来的程序文件，程序运行多久它们就存在多久，所以 let s: &\'static str = "hello"; 是合法的。常量里的字符串、返回固定文字的函数，也常用 &\'static str。\n要注意：编译器报生命周期错误时，有时会建议你加上 \'static。不要不假思索地照做，真正的问题通常是“引用指向的数据活得不够久”，正确的修法是调整数据的存放位置，或者改为返回拥有所有权的 String，而不是硬把引用标成 \'static（那往往编译不过，或者会让数据一直占着内存不释放）。'},
  {title:'动手试试：省略规则和 \'static',body:'这个练习有三个函数：trimmed 只有一个引用参数，符合省略规则，不用标注；longer_name 的返回值只和第一个参数有关，所以只给第一个参数标 \'a；status 返回的是字面量，返回类型写成 &\'static str。\ns.trim() 会去掉字符串开头和结尾的空白，返回的是借用原字符串中间那一段的切片。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 longer_name 签名里第二个参数也标成 &\'a str，再运行，看看这次 temp 为什么报活得不够久。看完改回来。'],expect:'[Rust]\n比较对象：临时\n保留下来的是：Ferris\n状态：成功，再查一次：失败'},code:`fn trimmed(s: &str) -> &str {
    s.trim()
}

fn longer_name<'a>(a: &'a str, b: &str) -> &'a str {
    println!("比较对象：{b}");
    a
}

fn status(code: i32) -> &'static str {
    if code == 200 { "成功" } else { "失败" }
}

fn main() {
    let input = String::from("   Rust   ");
    let t = trimmed(&input);
    println!("[{t}]");

    let name = String::from("Ferris");
    let kept;
    {
        let temp = String::from("临时");
        kept = longer_name(&name, &temp);
    }
    println!("保留下来的是：{kept}");

    let msg: &'static str = status(200);
    println!("状态：{msg}，再查一次：{}", status(404));
}`,explain:[{at:'fn trimmed(s: &str) -> &str {',text:'只有一个引用参数，按省略规则二，返回值自动和 s 有相同的生命周期，不用手写。'},{at:'s.trim()',text:'返回去掉首尾空白后的切片，借用的还是 s 的数据。'},{at:'fn longer_name<\'a>(a: &\'a str, b: &str) -> &\'a str {',text:'返回值只和 a 有关，就只给 a 和返回值标 \'a；b 的生命周期和返回值无关，不用标。'},{at:'println!("比较对象：{b}");',text:'函数里可以正常使用 b。'},{at:'    a',text:'总是返回 a，和签名的标注一致。'},{at:'fn status(code: i32) -> &\'static str {',to:'if code == 200 { "成功" } else { "失败" }',text:'返回的都是字符串字面量，它们活到程序结束，所以返回类型是 &\'static str。参数 code 不是引用，不涉及生命周期。'},{at:'fn main() {',text:'程序入口。'},{at:'let input = String::from("   Rust   ");',text:'前后各带三个空格的字符串。'},{at:'let t = trimmed(&input);',text:'t 借用 input 中间的 Rust 这一段。'},{at:'println!("[{t}]");',text:'用方括号包起来打印，能看出空格已经去掉：[Rust]。'},{at:'let name = String::from("Ferris");',text:'name 活在整个 main 里。'},{at:'let kept;',text:'先在外层声明，稍后在内层赋值。'},{at:'let temp = String::from("临时");',text:'temp 只活在内层。'},{at:'kept = longer_name(&name, &temp);',text:'返回值只和 name 绑定，所以即使 temp 在内层就被释放，kept 仍然可以在外层使用。'},{at:'println!("保留下来的是：{kept}");',text:'打印 Ferris。'},{at:'let msg: &\'static str = status(200);',text:'把返回的 &\'static str 存进 msg。'},{at:'println!("状态：{msg}，再查一次：{}", status(404));',text:'200 得到成功，404 得到失败。'}]},
  {title:'搞不定生命周期时：返回拥有所有权的值',body:'生命周期标注是为“返回引用”服务的。如果你发现一个函数的生命周期怎么标都很别扭，往往说明这里不适合返回引用。最简单的办法是返回一个新造的 String（或者 Vec 等拥有数据的类型）：调用者直接拿到所有权，想用多久就用多久，完全不涉及生命周期。\n比如 fn make_title(name: &str) -> String { format!("《{name}》") }，format! 和 println! 用法一样，只是不打印，而是把结果组装成一个新的 String 返回。\n代价是多了一次内存分配和复制。对新手来说，先写出正确、能编译的代码最重要，确实遇到性能瓶颈时再考虑改成借用。\n最后总结这一关：生命周期是“引用的有效范围”；借用检查器保证数据比引用活得久；大多数时候省略规则会自动处理，函数返回引用且关系不明确时才需要手写 \'a；标注只是描述关系，不会延长任何值的寿命。'}
 ],quiz:[
{id:'rust-lifetime-1',q:'什么是悬垂引用？',options:['引用指向的数据已经被释放了','一个值同时有两个可变引用','引用没有加 mut 不能修改','函数的参数里有多个引用'],why:['','这违反的是“同一时刻只能有一个可变引用”的规则，不叫悬垂引用。','不可变引用本来就不能修改数据，这是正常的。','多个引用参数是很常见的写法，本身没有问题。'],answer:0,explain:'悬垂引用就是“引用还在，数据没了”。Rust 的借用检查器在编译时保证数据比引用活得久，从根本上避免它。'},
  {id:'rust-lifetime-2',type:'judge',q:'生命周期标注可以让一个值活得比原来更久。',answer:false,explain:'标注不改变任何值的寿命，它只是描述几个引用之间生命周期的关系，供编译器检查。'},
  {id:'rust-lifetime-3',q:'fn longest(x: &str, y: &str) -> &str 为什么会编译报错？',options:['编译器不知道返回值借用的是谁','&str 类型的参数不能作比较','函数不能同时有两个引用参数','返回引用的函数要加上 mut'],why:['','&str 可以比较长度，也可以直接比较内容。','两个引用参数完全合法，问题出在返回值。','返回引用和 mut 无关，加 mut 也解决不了。'],answer:0,explain:'有两个引用参数时省略规则推不出返回值的生命周期，需要写成 fn longest<\'a>(x: &\'a str, y: &\'a str) -> &\'a str。'},
  {id:'rust-lifetime-4',type:'fill',q:'表示“在整个程序运行期间都有效”的特殊生命周期，写作＿。',accepted:['\'static','static','‘static'],explain:'\'static 引用在整个程序运行期间都有效，字符串字面量的类型就是 &\'static str。'},
  {id:'rust-lifetime-5',q:'字符串字面量 "hello" 的完整类型是？',options:['&\'static str','String','&mut str','\'static String'],why:['','String 拥有堆上的数据，字面量不是 String，要用 String::from 转换。','字面量是只读的，不能可变借用。','\'static 是引用的生命周期，要写在 & 后面，不能直接修饰 String。'],answer:0,explain:'字面量直接写在程序文件里，活到程序结束，所以是 &\'static str。'},
  {id:'rust-lifetime-6',type:'multi',q:'下面哪些函数签名不手写生命周期标注也能编译？（多选）',options:['fn a(s: &str) -> &str','fn b(x: &str, y: &str) -> &str','fn c(x: &str, y: &str) -> String','fn d(n: i32) -> &str'],why:['','两个引用参数，省略规则推不出返回值借用的是谁，要手写标注。','','没有引用参数，返回的引用不知道借自哪里，编译报错；返回字面量时应写 &\'static str。'],answers:[0,2],explain:'a 只有一个引用参数，按规则二自动补全；c 返回的是 String，不是引用，不涉及生命周期。'},
  {id:'rust-lifetime-7',type:'judge',q:'只有一个引用参数的函数返回引用时，编译器会自动让返回值和这个参数的生命周期相同。',answer:true,explain:'这是省略规则二，所以 fn first_word(s: &str) -> &str 不用写标注。'},
  {id:'rust-lifetime-8',q:'longest 已按 <\'a> 标注好，下面代码能编译吗？',code:'let a = String::from("长长的字符串");\nlet result;\n{\n    let b = String::from("短");\n    result = longest(a.as_str(), b.as_str());\n}\nprintln!("{result}");',options:['不能：b 活得不够久','能：返回的是较长的 a','能：result 会自动复制','不能：a 不是 &str'],why:['','编译器只按签名检查，不看运行时实际返回哪一个。','&str 是引用，不会自动把数据复制一份。','a.as_str() 已经把 String 转成了 &str。'],answer:0,explain:'\'a 被限制为 b 的生命周期，而 result 在 b 释放后还要使用，所以报 b does not live long enough。'},
  {id:'rust-lifetime-9',q:'对 fn longest<\'a>(x: &\'a str, y: &\'a str) -> &\'a str，调用时 \'a 会被定为？',options:['x 和 y 中较短的那个生命周期','x 和 y 中较长的那个生命周期','整个程序运行的全部时间','第一个参数 x 自己的生命周期'],why:['','取较长的会让返回值在较短的那个被释放后还能用，产生悬垂引用。','只有 \'static 才代表整个程序运行期间。','x 和 y 都标了 \'a，两个参数都会参与约束。'],answer:0,explain:'\'a 取两者重叠的部分，也就是较短的那个，保证返回值在两个参数都有效时才能使用。'},
  {id:'rust-lifetime-10',type:'judge',q:'编译器报生命周期错误时建议加 \'static，直接照做通常就是最好的修法。',answer:false,explain:'真正的问题往往是数据活得不够久。应该调整数据的存放位置、提前用完结果，或者改为返回 String。'},
  {id:'rust-lifetime-11',type:'fill',q:'编译器里负责检查“引用指向的数据是否一直有效”的部分，叫作＿检查器。',accepted:['借用','borrow'],explain:'借用检查器（borrow checker）给每个引用算出生命周期，并保证被引用的数据活得至少和引用一样久。'},
  {id:'rust-lifetime-12',q:'函数返回引用的生命周期怎么标都很别扭时，最简单的办法通常是？',options:['改为返回一个拥有数据的 String','把所有引用都标成 \'static','在函数里多调用几次 clone','给所有参数都加上 mut'],why:['','大多数数据活不到程序结束，硬标 \'static 往往编译不过。','在函数里 clone 了却仍返回引用，生命周期问题并没有消失。','mut 和生命周期无关。'],answer:0,explain:'返回 String 这类拥有所有权的值，调用者想用多久就用多久，代价只是一次分配和复制。'},
  {id:'rust-lifetime-13',type:'multi',q:'关于生命周期，下面哪些说法正确？（多选）',options:['它描述的是引用的有效范围','借用检查器在编译时检查它','大多数情况下可以省略不写','它会在运行时消耗额外内存'],why:['','','','生命周期只存在于编译阶段的检查中，编译后不留下任何运行时开销。'],answers:[0,1,2],explain:'生命周期是编译期的概念：描述引用的有效范围，由借用检查器检查，常见写法靠省略规则自动补全。'},
  {id:'rust-lifetime-14',type:'judge',q:'let r; { let x = 5; r = &x; } println!("{r}"); 可以编译通过。',answer:false,explain:'x 在内层花括号结束时被释放，r 在外层还要使用，报 x does not live long enough。'},
  {id:'rust-lifetime-15',q:'省略规则中，方法的第一个参数是 &self 时，返回的引用默认用谁的生命周期？',options:['self 的生命周期','最后一个参数的','\'static 生命周期','调用者自己指定'],why:['','规则三说的是 self，不是最后一个参数。','只有字面量这类数据才是 \'static，规则不会默认用它。','省略规则会自动补全，调用的地方不需要也不能指定。'],answer:0,explain:'规则三：方法的第一个参数是 &self 或 &mut self 时，返回的引用自动使用 self 的生命周期。'},
  {id:'rust-lifetime-16',type:'code',q:'写一个函数 pick_first，接收两个 &str 参数 a 和 b，打印 b 后返回 a。要求只给需要的参数标注生命周期，让调用时 b 可以是一个很快就被释放的临时 String。再写出 main 演示这种调用。',reference:'fn pick_first<\'a>(a: &\'a str, b: &str) -> &\'a str {\n    println!("{b}");\n    a\n}\n\nfn main() {\n    let name = String::from("Ferris");\n    let kept;\n    {\n        let temp = String::from("临时");\n        kept = pick_first(&name, &temp);\n    }\n    println!("{kept}");\n}',points:['在函数名后声明 <\'a>','只给 a 和返回值标 \'a，b 不标','函数体最后返回 a','main 中 temp 在内层释放后仍能使用返回值'],explain:'返回值只和 a 绑定，b 的生命周期不影响返回值；如果 b 也标 \'a，temp 就必须活到 kept 用完为止。'},
 ]},
 rustStruct,
 rustEnum,
 rustCollections,
 rustModules,
 rustGenerics,
 rustIterators,
 rustSmartPtr,
 rustConcurrency,
 rustAsync,
 rustUnsafeMacros,
 rustEngineering,
];
