// Go 学习空间：15 个关卡，每关先学习再答题。关卡按难度分为入门、进阶、高阶、专家四档。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// interview 字段关联 content/questions.json 里的 Go 面试题 id。
import type {AiLevel,Rank,Tier} from './journey';

export const goPassRate=0.65;
export const goTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:4},{name:'进阶',nameEn:'Intermediate',from:5,to:9},{name:'高阶',nameEn:'Advanced',from:10,to:11},{name:'专家',nameEn:'Expert',from:12,to:14}];
export const goRanks:Rank[]=[{min:0,name:'Gopher 新手'},{min:3,name:'入门'},{min:5,name:'熟手'},{min:8,name:'高手'},{min:12,name:'专家'},{min:15,name:'大神'}];

export const goLevels:AiLevel[]=[
 {id:'go-start',title:'起步：模块、包与初始化',summary:'写出第一个程序，管好依赖，弄懂包和 init',lessons:[
  {title:'Go 是什么，为什么学它',body:'Go（也叫 Golang）是 Google 在 2009 年发布的一门编程语言。它的设计目标很朴素：写起来简单、编译快、运行快、天生适合同时处理很多任务（并发）。\n它的几个特点：\n一、语法很少，关键字只有 25 个，新手上手快，不同人写出来的代码风格也很接近；\n二、编译成一个独立的可执行文件，复制到服务器上就能运行，不需要额外安装运行环境；\n三、用 go 关键字就能轻松地同时运行成千上万个任务；\n四、自带格式化、测试、性能分析等一整套工具。\n所以 Go 被大量用来写后端服务、微服务、云原生工具。Docker、Kubernetes 这些大家耳熟能详的软件，都是用 Go 写的。'},
  {title:'安装 Go，确认能用',body:'第一步是在自己的电脑上装好 Go：\n一、打开 go.dev/dl，下载对应系统的安装包：Windows 选 .msi，Mac 选 .pkg（苹果芯片选 arm64，Intel 芯片选 amd64）；\n二、双击安装，一路点“下一步”即可，安装程序会自动配置好环境；\n三、重新打开一个终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version 并回车。如果显示类似 go version go1.26.2 windows/amd64 的一行字，就说明装好了。\n如果提示“找不到命令”，通常是终端在安装前就打开了，关掉重开一个再试；还不行的话，可以点右下角的“问 AI”，让 AI 老师帮你排查。\n写代码推荐用 VS Code，安装后在扩展里搜索并安装 Go 扩展，就有代码提示和自动格式化了。'},
  {title:'第一个 Go 程序',body:'一个最简单的 Go 程序只有几行，但每一行都有固定的意义：\n第一行声明这个文件属于哪个“包”。包是 Go 组织代码的单位，一个文件夹里的 .go 文件属于同一个包。想要能直接运行的程序，包名必须是 main；\n然后用 import 导入要用的其他包，比如负责打印的 fmt；\n最后是 main 函数。程序运行时，就从 main 函数的第一行开始执行。',code:`package main

import "fmt"

func main() {
    fmt.Println("Hello, Gopher")
}`,explain:[{at:'package main',text:'声明这个文件属于 main 包。只有 main 包才能编译成可以直接运行的程序。'},{at:'import "fmt"',text:'导入标准库里的 fmt 包，它负责格式化输入输出，比如在屏幕上打印文字。'},{at:'func main() {',text:'定义 main 函数：func 是定义函数的关键字，程序从这里开始运行。'},{at:'fmt.Println("Hello, Gopher")',text:'调用 fmt 包的 Println 函数，打印一行文字并换行。Gopher（地鼠）是 Go 社区对 Go 程序员的昵称。'}]},
  {title:'动手试试：运行你的第一个程序',body:'我们在第一个程序的基础上加一个变量，打印一句带名字的问候。先用 go run 直接运行，再用 go build 编译成一个可执行文件运行一次，感受两者的区别。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','运行 go build main.go，文件夹里会多出一个可执行文件（Windows 是 main.exe）。直接运行它：Windows 输入 .\\main.exe，Mac 输入 ./main，输出和 go run 一样。','把 name 改成你自己的名字，再运行一次。'],expect:'Hello, Gopher\n你好，小明！今年是学 Go 的好时机。'},code:`package main

import "fmt"

func main() {
    fmt.Println("Hello, Gopher")
    name := "小明"
    fmt.Printf("你好，%s！今年是学 Go 的好时机。\\n", name)
}`,explain:[{at:'package main',to:'import "fmt"',text:'属于 main 包，导入 fmt。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println("Hello, Gopher")',text:'打印第一行。'},{at:'name := "小明"',text:':= 表示“声明一个新变量并赋值”，Go 会根据值自动推断出 name 是字符串类型。'},{at:'fmt.Printf("你好，%s！今年是学 Go 的好时机。\\n", name)',text:'Printf 按格式打印：%s 是一个占位符，会被后面的 name 替换；\\n 表示换行（Printf 不会自动换行）。'}]},
  {title:'go run 和 go build',body:'go run main.go：先编译，再立刻运行，编译出的文件放在临时目录、用完就删。适合开发时快速试一试。\ngo build：只编译不运行，在当前目录生成一个可执行文件。这个文件可以拷到其他同系统的电脑上直接运行，不需要对方安装 Go，这是 Go 部署简单的原因之一。\n还可以“交叉编译”：在 Windows 上编译出 Linux 服务器用的程序，只要设置两个环境变量，比如 GOOS=linux GOARCH=amd64 go build。\n常用的其他命令：go fmt 自动整理代码格式；go vet 检查可疑的写法；go test 运行测试。'},
  {title:'模块：一个项目就是一个模块',body:'写一个稍微正经一点的项目，代码会分成很多个文件和文件夹，还会用到别人写好的库（依赖）。Go 用“模块”（module）来管理这些。现在官方推荐的方式就是 Go Modules。\n一个模块就是一个项目的根目录，里面有一个 go.mod 文件。在空文件夹里运行 go mod init 模块名 就会生成它。模块名通常写成代码仓库的地址，比如 github.com/你的用户名/项目名，自己练习时随便起一个也行，比如 hello。\n模块里的每个子文件夹是一个包，导入时写“模块名/子文件夹路径”。'},
  {title:'go.mod 和 go.sum',body:'go.mod 记录三件事：这个模块叫什么名字、需要哪个版本以上的 Go、依赖了哪些库以及各自的版本。\ngo.sum 记录每个依赖库内容的“校验和”（一串根据文件内容算出来的指纹）。下次下载同一个版本时，Go 会重新计算并核对，如果对不上，说明下载到的代码被篡改过或者损坏了，就会报错。这两个文件都要提交到代码仓库里。',code:`module github.com/xiaoming/shop

go 1.26

require (
    github.com/gin-gonic/gin v1.9.0
    golang.org/x/sync v0.10.0
)`,explain:[{at:'module github.com/xiaoming/shop',text:'模块的名字。项目里其他包的导入路径都以它开头，比如 github.com/xiaoming/shop/order。'},{at:'go 1.26',text:'这个模块要求的 Go 语言版本。'},{at:'require (',text:'下面列出直接依赖的库和版本。'},{at:'github.com/gin-gonic/gin v1.9.0',text:'依赖 Gin 框架的 v1.9.0 版本。版本号遵循“主版本.次版本.修订号”的规则。'},{at:'golang.org/x/sync v0.10.0',text:'依赖 Go 官方扩展库 sync。'}]},
  {title:'添加、整理和下载依赖',body:'go get 库地址@版本：添加或升级一个依赖，并更新 go.mod 和 go.sum。比如想用 Gin 的 v1.9.0 版本，就执行 go get github.com/gin-gonic/gin@v1.9.0；\ngo mod tidy：整理依赖。它会扫描你的代码，把用到了但 go.mod 里没写的依赖补上，把写了但已经不再用到的依赖删掉，同时更新 go.sum。提交代码前运行一次是好习惯；\ngo mod download：只是按照 go.mod 里已经写好的依赖，把它们下载到本机的模块缓存里，不会添加或升级任何依赖。常用在构建 Docker 镜像时提前下载依赖。\n在国内下载依赖慢的话，可以设置代理：go env -w GOPROXY=https://goproxy.cn,direct。',code:`go get github.com/gin-gonic/gin@v1.9.0
go mod tidy
go mod download
go env -w GOPROXY=https://goproxy.cn,direct`,explain:[{at:'go get github.com/gin-gonic/gin@v1.9.0',text:'添加指定版本的依赖。@ 后面写版本号，写 @latest 表示最新版。'},{at:'go mod tidy',text:'补上缺的依赖，删掉不用的依赖。'},{at:'go mod download',text:'只下载 go.mod 里已有的依赖到本地缓存。'},{at:'go env -w GOPROXY=https://goproxy.cn,direct',text:'设置国内的模块代理，加速下载。只需要设置一次。'}]},
  {title:'包和可见性：首字母大写才能被外面用',body:'Go 用一个非常简单的规则控制“谁能用谁”：名字首字母大写的函数、变量、类型、结构体字段是“导出”的，其他包可以使用；首字母小写的只能在同一个包里使用。\n不需要像其他语言那样写 public、private 关键字，看名字的首字母就知道。\n比如 greet 包里有 Hello 和 secret 两个函数，main 包可以调用 greet.Hello()，但调用 greet.secret() 会编译报错。'},
  {title:'动手试试：建一个有两个包的模块',body:'我们创建一个真正的模块：main 包调用另一个 greet 包里的函数，顺便验证一下首字母大小写的规则。这次有两个文件，要按步骤分别创建。',practice:{steps:['新建一个空文件夹 hello，在终端里进入它，运行 go mod init hello，会生成 go.mod 文件。','在 hello 里新建子文件夹 greet，在 greet 里新建 greet.go，复制下面代码中“// greet/greet.go”那一段（到 // main.go 之前）。','回到 hello 文件夹，新建 main.go，复制下面代码中“// main.go”之后的部分。','运行 go run .（注意最后有个点，表示运行当前目录这个包），对照下面的输出。','在 main.go 里加一行 greet.secret()，再运行，看看编译器报了什么错。'],expect:'你好，小明！欢迎来到 Go 的世界。'},code:`// greet/greet.go
package greet

func Hello(name string) string {
    return "你好，" + name + "！" + secret()
}

func secret() string {
    return "欢迎来到 Go 的世界。"
}

// main.go
package main

import (
    "fmt"

    "hello/greet"
)

func main() {
    fmt.Println(greet.Hello("小明"))
}`,explain:[{at:'package greet',text:'greet 文件夹里的文件属于 greet 包，包名通常和文件夹名一样。'},{at:'func Hello(name string) string {',text:'首字母大写的 Hello 是导出的，别的包可以调用。参数 name 是字符串，返回值也是字符串。'},{at:'return "你好，" + name + "！" + secret()',text:'用 + 拼接字符串。在同一个包里，可以调用小写的 secret。'},{at:'func secret() string {',to:'return "欢迎来到 Go 的世界。"',text:'首字母小写，只能在 greet 包内部使用。'},{at:'package main',text:'main.go 属于 main 包。'},{at:'import (',to:'"hello/greet"',text:'导入标准库的 fmt，和我们自己的 greet 包：路径是“模块名/文件夹路径”。'},{at:'func main() {',to:'fmt.Println(greet.Hello("小明"))',text:'用“包名.函数名”调用其他包里导出的函数。'}]},
  {title:'internal：只给自己人用的包',body:'有些包只是项目内部的实现细节，不希望被别的项目导入使用。把它放进名叫 internal 的文件夹就行，Go 的工具链会强制检查：internal 目录下的包，只能被 internal 的父目录及其子目录里的代码导入。\n比如包路径 example.com/app/admin/internal/auth：internal 的父目录是 admin，所以只有 example.com/app/admin 这个目录树下的代码（比如 example.com/app/admin/handler）能导入它；example.com/app/order 就不行，别的模块更不行。\n另外，多个本地模块一起开发时（比如一个服务模块和一个公共库模块），可以在上层目录用 go work init 创建一个 go.work 工作区文件，把它们组合起来，本地修改公共库后，服务模块立刻就能用上，不用先发布。'},
  {title:'init 函数和初始化顺序',body:'除了 main，Go 还有一个特殊的函数 init：它在包初始化时自动执行，常用来做一些准备工作，比如检查配置、注册驱动。它不能被手动调用，在代码里写 init() 会编译报错。\n程序启动时的顺序是：\n一、先初始化被依赖的包（比如 main 导入了包 A，就先初始化 A）；\n二、每个包内部，先给包级变量赋初值，再执行这个包的 init 函数；\n三、所有包都初始化完，才进入 main.main。\n一个包里可以有多个 init 函数（甚至一个文件里写好几个），它们会按出现的顺序依次执行。每个包无论被导入多少次，都只初始化一次。\n不要让业务逻辑依赖多个文件之间 init 的先后顺序，这种隐含的依赖很容易出错。'},
  {title:'动手试试：看看谁先执行',body:'我们写一个包含包级变量、两个 init 函数和 main 的程序，看看它们的执行顺序。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把第二个 init 函数移到第一个前面，再运行，看看顺序有没有变。'],expect:'1. 包级变量 version 初始化\n2. 第一个 init\n3. 第二个 init\n4. main 开始，版本 v1.0'},code:`package main

import "fmt"

var version = loadVersion()

func loadVersion() string {
    fmt.Println("1. 包级变量 version 初始化")
    return "v1.0"
}

func init() {
    fmt.Println("2. 第一个 init")
}

func init() {
    fmt.Println("3. 第二个 init")
}

func main() {
    fmt.Println("4. main 开始，版本", version)
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头。'},{at:'var version = loadVersion()',text:'包级变量（写在函数外面），它的初始值要调用 loadVersion 计算。'},{at:'func loadVersion() string {',to:'return "v1.0"',text:'计算初始值时打印第 1 行。包级变量最先初始化。'},{at:'func init() {',to:'fmt.Println("2. 第一个 init")',text:'第一个 init 函数，在包级变量之后自动执行。'},{at:'func init() {',to:'fmt.Println("3. 第二个 init")',text:'同一个包可以有多个 init，按出现顺序执行。'},{at:'func main() {',to:'fmt.Println("4. main 开始，版本", version)',text:'所有初始化完成后才进入 main，这时 version 已经有值了。'}]},
  {title:'程序怎么找到自己的配置文件',body:'新手常犯的错误：代码里用相对路径读配置文件，比如 os.ReadFile("config.yaml")。相对路径是相对于“启动程序时所在的目录”（工作目录），而不是可执行文件所在的目录，更不是源代码所在的目录。在自己电脑上 go run 没问题，部署到服务器上用别的目录启动，就找不到文件了。\n常用的解决办法：\n一、通过命令行参数或环境变量传入配置文件的绝对路径，比如 ./app -config /etc/app/config.yaml，这是最推荐的做法；\n二、用 os.Executable() 找到可执行文件自己的位置，再拼出相对于它的路径；\n三、用 Go 的 embed 功能，把配置模板、静态文件直接编译进可执行文件里，部署时就只有一个文件，不用担心路径。\n部署时还要注意：不要把密码、密钥写死在代码或打包进去的文件里，应该通过环境变量或密钥管理服务提供。'}
 ],quiz:[
  {id:'go-start-1',q:'现在 Go 官方推荐的依赖管理方式是？',options:['GOPATH 工作区','Go Modules','手动复制依赖进项目','只用 vendor 目录管理'],why:['GOPATH 是早期的方式，缺少版本管理，已不推荐。','','手动复制无法追踪版本，也难以升级和校验。','vendor 可以配合 Go Modules 使用，但不能替代 go.mod 的版本声明。'],answer:1,explain:'Go Modules 通过 go.mod 和 go.sum 管理依赖和版本，是官方推荐方式。vendor 目录也可以配合 Go Modules 使用，但不是替代它。',interview:'q-e2fa0702dc3aaf5e'},
  {id:'go-start-2',q:'go.sum 文件的作用是？',options:['记录项目直接依赖的列表','记录依赖内容的校验和','锁定项目使用的 Go 版本','保存私有仓库的访问凭据'],why:['依赖要求写在 go.mod 中。','','Go 版本由 go.mod 中的 go 指令（和 toolchain）声明。','凭据绝不应写进仓库文件，私有仓库通过 GOPRIVATE、.netrc 等配置访问。'],answer:1,explain:'go.sum 保存依赖的校验和，下载时用来校验内容是否被篡改；它不是 npm 那种锁文件，版本由 go.mod 经最小版本选择决定。',interview:'q-160bd2548d521bc9'},
  {id:'go-start-3',type:'multi',q:'go mod tidy 会做哪些事？（多选）',options:['补上代码用到但缺少的依赖','删掉不再使用的依赖','把所有依赖升级到最新版本','删除项目中的 vendor 目录'],why:['','','tidy 不会主动升级依赖，升级要用 go get。','tidy 不会删除 vendor 目录；需要更新 vendor 时用 go mod vendor。'],answers:[0,1],explain:'tidy 根据代码实际使用情况整理依赖：补缺、删多余，并同步 go.sum。',interview:'q-160bd2548d521bc9'},
  {id:'go-start-4',type:'judge',q:'go mod download 会根据已有配置把依赖下载到本地模块缓存，它本身不负责添加或升级依赖。',answer:true,explain:'go mod download 只是下载；添加、升级、降级依赖用 go get。构建时缺依赖通常也会自动下载。',interview:'q-160bd2548d521bc9'},
  {id:'go-start-5',q:'包路径 example.com/app/admin/internal/auth 可以被谁导入？',options:['任何模块都可以导入','只有 app/admin 目录树中的包','example.com/app 下的所有包','只有名字也叫 auth 的包'],why:['internal 正是用来限制外部导入的。','','限制以 internal 的父目录 app/admin 为界，app 下的其他目录不能导入。','导入权限与包名无关。'],answer:1,explain:'internal 的限制以它的父目录为界：只有 example.com/app/admin 及其子目录中的代码能导入。',interview:'q-0fc82d1d6d004254'},
  {id:'go-start-6',type:'fill',q:'多个本地模块一起开发时，用来把它们组合在一起的工作区文件名是 ____。',accepted:['go.work'],explain:'go.work 由 go work init / use 创建，用来联合多个本地模块；它不替代各模块自己的 go.mod。CI 里最好再用 GOWORK=off 单独验证每个模块。',interview:'q-33f1a19d908449b7'},
  {id:'go-start-7',q:'main 包导入了包 A，下面哪个执行顺序是正确的？',options:['A 变量 → A init → main 变量 → main init → main.main','main 变量 → main init → A 变量 → A init → main.main','A init → A 变量 → main init → main 变量 → main.main','A 变量 → main 变量 → A init → main init → main.main'],why:['','依赖的包 A 必须先完成初始化，main 包的初始化在它之后。','每个包都是先初始化包级变量，再执行 init，因为 init 里可能会用到这些变量。','一个包要完整初始化（变量和 init）之后，才轮到依赖它的包。'],answer:0,explain:'先初始化依赖的包；每个包先初始化包级变量再执行 init；最后才进入 main.main。',interview:'q-ebf42a72d069f3de'},
  {id:'go-start-8',type:'judge',q:'可以在代码里直接写 init() 手动再调用一次 init 函数。',answer:false,explain:'init 不能被引用或调用，写 init() 会编译报错。它只在包初始化时由运行时自动执行一次。',interview:'q-ebf42a72d069f3de'},
  {id:'go-start-9',type:'short',q:'Go 程序如何获取“项目根目录”？部署后要注意什么？',reference:'Go 没有统一的“项目根目录” API。os.Getwd() 拿到的是运行时工作目录，会随启动方式变化；开发工具可以从某个目录向上查找 go.mod，或者用 go env GOMOD。部署后的二进制不一定带着源码和 go.mod，所以配置和资源目录应通过参数、环境变量、配置文件或 embed 明确提供。',points:['没有统一 API','os.Getwd 是工作目录','向上找 go.mod','部署后用参数/环境变量/embed'],explain:'关键是区分“工作目录”“模块根”“可执行文件所在目录”，它们不一定相同。',interview:'q-f79f4e7ba8845c95'},
  {id:'go-start-10',q:'想在代码里用一个第三方库的指定版本，比如 v1.9.0，应该执行？',options:['go get example.com/lib@v1.9.0','go mod download example.com/lib','go install example.com/lib','go build -v ./...'],why:['','go mod download 只下载 go.mod 中已有的依赖到缓存，不会修改依赖版本。','go install 用于编译安装可执行程序，不修改项目依赖。','go build 只编译，不会添加或修改依赖版本。'],answer:0,explain:'go get 用来添加、升级或降级依赖并修改 go.mod；安装命令行工具则用 go install 包路径@版本。',interview:'q-160bd2548d521bc9'},
  {id:'go-start-11',type:'judge',q:'名字首字母小写的函数，只能在同一个包里使用。',answer:true,explain:'Go 用首字母大小写控制可见性：大写导出给其他包，小写只在包内可见。'},
  {id:'go-start-12',q:'一个包里定义了两个 init 函数，会怎样？',options:['编译直接报错','只执行第一个','按顺序都会执行','随机执行一个'],why:['init 是特殊函数，同一个包里允许定义多个。','所有 init 都会执行。','','执行顺序是确定的，按出现顺序依次执行。'],answer:2,explain:'一个包可以有多个 init，甚至同一个文件里也可以，它们按出现顺序依次执行。',interview:'q-ebf42a72d069f3de'},
  {id:'go-start-13',type:'fill',q:'编译出可执行文件但不运行，用命令 go ____。',accepted:['build','go build'],explain:'go build 只编译链接；go run 编译后直接运行；go install 编译并安装到 GOBIN。'},
 ]},
 {id:'go-values',title:'基础类型与值',summary:'字符串、数值、指针、nil 和传参方式',lessons:[
  {title:'这一关学什么：Go 里的数据长什么样',body:'程序处理的一切都是数据：名字是字符串，年龄是整数，价格是小数。这一关讲 Go 最基础的几种数据类型，以及容易踩坑的地方：\n一、怎么声明变量，什么是“零值”；\n二、字符串的两种写法和常用操作；\n三、数字类型之间怎么转换，溢出了会怎样，数字和字符串怎么互相转；\n四、指针是什么，nil 是什么；\n五、函数传参到底是复制了一份还是传了原件；\n六、怎么把结构体漂亮地打印出来。'},
  {title:'声明变量和零值',body:'Go 里声明变量有几种写法：\nvar 名字 类型：声明一个变量，不赋值时自动得到这个类型的“零值”；\nvar 名字 = 值：让 Go 根据值自动推断类型；\n名字 := 值：最常用的简写，只能在函数内部使用；\nconst 名字 = 值：声明常量，之后不能修改。\n零值是 Go 的一个重要特点：变量声明后一定有一个确定的初始值，不会是随机的“垃圾值”。数字的零值是 0，字符串是空字符串 ""，布尔值是 false，指针、切片、map 等是 nil。',code:`var count int
var name = "小明"
age := 18
const Pi = 3.14
var ok bool
fmt.Println(count, name, age, Pi, ok)`,explain:[{at:'var count int',text:'声明一个整数变量，没有赋值，它的零值是 0。'},{at:'var name = "小明"',text:'Go 根据值自动推断出 name 是 string 类型。'},{at:'age := 18',text:'最常用的简写：声明并赋值，类型推断为 int。'},{at:'const Pi = 3.14',text:'常量：值在编译时就确定，之后不能修改。'},{at:'var ok bool',text:'布尔值的零值是 false。'},{at:'fmt.Println(count, name, age, Pi, ok)',text:'打印 0 小明 18 3.14 false。'}]},
  {title:'常用的基本类型',body:'整数：int（最常用，64 位系统上是 64 位）、int8、int16、int32、int64，以及只能表示非负数的 uint、uint8 等。uint8 的范围是 0 到 255，它还有一个别名 byte，表示一个字节；\n小数：float64（最常用）和 float32。小数在计算机里有精度误差，0.1 + 0.2 并不精确等于 0.3，涉及金额时要用整数“分”来计算；\n布尔：bool，只有 true 和 false；\n字符串：string，内容只读；\nrune：int32 的别名，表示一个 Unicode 字符，比如一个汉字。\n一般情况下，整数用 int、小数用 float64 就够了，只有在节省内存或者和其他系统对接时才用指定位数的类型。'},
  {title:'字符串的两种写法',body:'双引号字符串：会处理转义字符，\\n 表示换行、\\t 表示制表符、\\" 表示一个双引号。\n反引号字符串（也叫原始字符串）：里面的内容原样保留，\\n 就是反斜杠和 n 两个普通字符，不会换行；而且可以直接跨越多行。写 JSON、SQL、正则表达式、多行文本时特别方便，不用到处写转义。',code:`a := "第一行\\n第二行"
b := \`第一行\\n还是第一行\`
sql := \`SELECT id, name
FROM users
WHERE age > 18\``,explain:[{at:'a := "第一行\\n第二行"',text:'双引号：\\n 被解释成换行，打印出来是两行。'},{at:'b := `第一行\\n还是第一行`',text:'反引号：\\n 原样保留，打印出来就是一行，里面能看到反斜杠和 n。'},{at:'sql := `SELECT id, name',to:'WHERE age > 18`',text:'反引号字符串可以直接写成多行，适合写 SQL。'}]},
  {title:'字符串常用操作',body:'strings 包提供了处理字符串的常用函数：Contains 判断是否包含、Split 按分隔符切开、Join 拼起来、Replace 替换、ToUpper 转大写、TrimSpace 去掉首尾空白。\n有一组函数特别容易用错：\nstrings.TrimRight(s, "abc") 的第二个参数不是一个“后缀”，而是一个“字符集合”：它会把 s 末尾所有属于 a、b、c 这三个字符的都去掉，直到遇到不属于的字符为止。所以 TrimRight("helloacb", "abc") 得到 "hello"；\n如果想去掉一个确定的后缀，要用 strings.TrimSuffix(s, "cb")，它只去掉完整匹配的后缀一次，得到 "helloa"。TrimLeft 和 TrimPrefix 的区别也一样。',code:`strings.Contains("golang", "go")
strings.Split("a,b,c", ",")
strings.Join([]string{"a", "b"}, "-")
strings.TrimRight("helloacb", "abc")
strings.TrimSuffix("helloacb", "cb")`,explain:[{at:'strings.Contains("golang", "go")',text:'golang 里包含 go，返回 true。'},{at:'strings.Split("a,b,c", ",")',text:'按逗号切开，得到切片 [a b c]。'},{at:'strings.Join([]string{"a", "b"}, "-")',text:'用横线连起来，得到 "a-b"。'},{at:'strings.TrimRight("helloacb", "abc")',text:'把末尾属于 {a, b, c} 的字符全部去掉，得到 "hello"。'},{at:'strings.TrimSuffix("helloacb", "cb")',text:'只去掉完整的后缀 "cb"，得到 "helloa"。'}]},
  {title:'数字类型必须显式转换',body:'Go 不会自动在不同的数字类型之间转换，哪怕只是 int32 和 int64：var a int32 = 1; var b int64 = 2，直接写 a + b 会编译报错。必须显式地写成 int64(a) + b，用“类型(值)”的方式转换。\n转换时要注意：\n一、小数转整数是“向零截断”，直接扔掉小数部分，不是四舍五入：3.9 转成 int 是 3，-3.9 转成 int 是 -3；\n二、大整数转成小整数，超出范围的高位会被直接截掉，结果可能完全不是你想要的；\n三、如果直接对常量写 int(3.9)，编译器会报错，因为它在编译时就能看出这会丢失精度；转换变量里的小数则没问题。'},
  {title:'溢出：会“绕回来”，不会报错',body:'每种整数类型都有范围。uint8 最大是 255，如果一个 uint8 变量的值是 255，再加 1，结果不是 256，而是“绕回”到 0；int8 的 127 加 1 会变成 -128。这叫溢出回绕，运行时不会报错，也不会 panic，程序会悄悄地得到一个错误的结果。\n只有在编译时就能算出来的常量表达式超出范围，编译器才会报错，比如 var x uint8 = 256。\n所以涉及可能很大的数字（比如金额累加、计数），要选择足够大的类型（一般用 int64），必要时自己检查是否溢出。'},
  {title:'数字和字符串互相转换',body:'数字和字符串之间的转换要用 strconv 包：\nstrconv.Atoi("42")：字符串转整数，返回两个值：结果和错误。字符串不是合法数字时（比如 "4a2"），错误不为空，一定要检查；\nstrconv.Itoa(42)：整数转字符串，得到 "42"；\nstrconv.ParseFloat、strconv.FormatFloat：小数和字符串互转。\n一个经典的坑：string(65) 得到的不是 "65"，而是 "A"。因为 string(整数) 的意思是“把这个数字当作 Unicode 编码，转成对应的字符”，65 正好是大写字母 A 的编码。想把数字变成字符串，一定要用 strconv.Itoa 或 fmt.Sprint。'},
  {title:'动手试试：字符串和数字的坑',body:'把前面几张卡片里的知识点放进一个程序跑一遍：原始字符串、TrimRight 和 TrimSuffix、溢出回绕、小数转整数，以及数字和字符串的互转。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 strconv.Atoi("42") 改成 strconv.Atoi("4a2")，再运行，看看 err 打印出了什么。'],expect:'第一行\\n还是第一行\nhello\nhelloa\nuint8 的 255 加 1： 0\nint(f)： 3\n43 <nil>\n42!\nA'},code:`package main

import (
    "fmt"
    "strconv"
    "strings"
)

func main() {
    raw := \`第一行\\n还是第一行\`
    fmt.Println(raw)
    fmt.Println(strings.TrimRight("helloacb", "abc"))
    fmt.Println(strings.TrimSuffix("helloacb", "cb"))

    var u uint8 = 255
    u++
    fmt.Println("uint8 的 255 加 1：", u)

    f := 3.9
    fmt.Println("int(f)：", int(f))

    n, err := strconv.Atoi("42")
    fmt.Println(n+1, err)
    fmt.Println(strconv.Itoa(42) + "!")
    fmt.Println(string(rune(65)))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"strings"',text:'导入 fmt、strconv（数字和字符串转换）和 strings（字符串操作）。'},{at:'func main() {',text:'程序入口。'},{at:'raw := `第一行\\n还是第一行`',to:'fmt.Println(raw)',text:'原始字符串：\\n 原样打印出来，没有换行。'},{at:'fmt.Println(strings.TrimRight("helloacb", "abc"))',text:'按字符集合去掉末尾字符，得到 hello。'},{at:'fmt.Println(strings.TrimSuffix("helloacb", "cb"))',text:'只去掉完整后缀 cb，得到 helloa。'},{at:'var u uint8 = 255',to:'fmt.Println("uint8 的 255 加 1：", u)',text:'255 加 1 溢出，绕回 0，不会报错。'},{at:'f := 3.9',to:'fmt.Println("int(f)：", int(f))',text:'小数转整数直接截掉小数部分，得到 3。'},{at:'n, err := strconv.Atoi("42")',to:'fmt.Println(n+1, err)',text:'字符串转整数成功，n 是 42，加 1 得 43；err 是 nil，表示没有错误。'},{at:'fmt.Println(strconv.Itoa(42) + "!")',text:'整数转字符串，才能和 "!" 拼接，得到 42!。'},{at:'fmt.Println(string(rune(65)))',text:'把 65 当作字符编码转成字符，得到 A。写 rune(65) 是为了让意图更明确，直接写 string(65) 效果一样，但 go vet 会警告。'}]},
  {title:'指针：变量的“门牌号”',body:'每个变量都存放在内存里的某个位置，这个位置的编号就是它的地址，可以把它想象成“门牌号”。指针就是一个专门用来保存地址的变量。\n两个符号：\n&x：取地址，得到变量 x 的门牌号；\n*p：解引用，顺着指针 p 里的门牌号找到那个变量，可以读它，也可以改它。\n*int 表示“指向 int 的指针”这种类型。\n和 C 语言不同，Go 的指针不能做运算，p++ 这样的写法会编译报错，所以不会因为算错地址而访问到不该访问的内存，更安全。',code:`x := 10
p := &x
fmt.Println(*p)
*p = 20
fmt.Println(x)`,explain:[{at:'x := 10',text:'一个普通的整数变量。'},{at:'p := &x',text:'&x 取出 x 的地址，存进 p。p 的类型是 *int（指向 int 的指针）。'},{at:'fmt.Println(*p)',text:'*p 顺着地址找到 x，读出 10。'},{at:'*p = 20',text:'通过指针修改它指向的变量。'},{at:'fmt.Println(x)',text:'x 变成了 20，因为 p 指向的就是 x 本身。'}]},
  {title:'nil：表示“什么都没有”',body:'nil 表示“没有指向任何东西”或者“还没有初始化”。不是所有类型都能是 nil，只有这 6 种类型的零值是 nil：指针、切片（slice）、映射（map）、通道（channel）、函数、接口。\nint、string、bool、数组、结构体的零值都不是 nil：int 是 0，string 是 ""，结构体是“每个字段都是零值”的那个结构体。所以 var s string; s == nil 会编译报错。\n对 nil 指针解引用（*p）会导致程序 panic（崩溃），这是 Go 新手最常见的运行时错误之一，用指针之前要先确认它不是 nil。'},
  {title:'坑：装了 nil 指针的接口不等于 nil',body:'接口（interface）可以装任何满足它要求的值，比如 any 可以装任何值。一个接口变量内部其实记录了两样东西：装进去的值的“类型”和“值本身”。只有这两样都为空时，接口才等于 nil。\n下面的代码里，p 是一个 nil 指针，把它赋值给接口 x 之后，x 记录了“类型是 *int，值是 nil”。类型不为空，所以 x == nil 是 false。\n这个坑在实际代码里最常见的形式是：函数返回类型是 error 接口，函数里却返回了一个类型为 *MyError、值为 nil 的指针，调用方用 err != nil 判断，结果永远是“有错误”。所以没有错误时，应该直接 return nil，而不是返回一个 nil 指针。',code:`var p *int
var x any = p
fmt.Println(p == nil)
fmt.Println(x == nil)`,explain:[{at:'var p *int',text:'一个指向 int 的指针，零值是 nil。'},{at:'var x any = p',text:'把 nil 指针装进接口 x：x 内部记录了类型 *int 和值 nil。'},{at:'fmt.Println(p == nil)',text:'p 本身是 nil，打印 true。'},{at:'fmt.Println(x == nil)',text:'x 的类型部分不为空，所以不等于 nil，打印 false。'}]},
  {title:'Go 只有值传递',body:'调用函数时，Go 总是把参数复制一份传进去，这叫值传递。函数里修改的是这份复制品，不会影响调用方原来的变量。\n如果希望函数能修改调用方的数据，就传指针：复制的是地址，函数顺着地址找到的是同一个对象，就能修改它。\n怎么选：\n一、需要修改调用方的数据，传指针；\n二、结构体很大（字段很多），传指针可以避免复制的开销；\n三、小的、只读的数据，直接传值更简单，也不用担心被意外修改。\n还要注意：如果结构体里有切片、map、指针这样的字段，传值时复制的只是这些字段本身（相当于复制了“门牌号”），它们指向的数据仍然是共享的，并不是完整地复制了一份（不是深拷贝）。'},
  {title:'结构体、组合字面量和打印格式',body:'结构体（struct）把几个相关的字段组合成一个整体，比如用户有名字和年龄。创建结构体的值，用“组合字面量”的写法：类型名后面跟花括号，里面写 字段名: 值，没写的字段自动取零值。切片和 map 也用类似的写法：[]int{1, 2, 3}、map[string]int{"a": 1}。\n用 fmt.Printf 打印结构体时，有三种常用的格式：\n%v：默认格式，只有值；\n%+v：带上字段名，调试时最常用；\n%#v：按 Go 语法的样子输出，连类型名都带上。\n另外，unsafe.Sizeof 对一个 string 返回的是 16（在 64 位系统上），而不是字符串内容的长度，因为 string 变量本身只存一个地址和一个长度，内容在别处。字符串的字节数要用 len。',code:`type User struct {
    Name string
    Age  int
}

u := User{Name: "Tom", Age: 18}
fmt.Printf("%v\\n", u)
fmt.Printf("%+v\\n", u)
fmt.Printf("%#v\\n", u)`,explain:[{at:'type User struct {',to:'Age  int',text:'定义一个结构体类型 User，有两个字段。'},{at:'u := User{Name: "Tom", Age: 18}',text:'组合字面量：创建一个 User 的值并给字段赋值。'},{at:'fmt.Printf("%v\\n", u)',text:'打印 {Tom 18}。'},{at:'fmt.Printf("%+v\\n", u)',text:'打印 {Name:Tom Age:18}，带字段名，最适合调试。'},{at:'fmt.Printf("%#v\\n", u)',text:'打印 main.User{Name:"Tom", Age:18}，像 Go 代码一样。'}]},
  {title:'动手试试：传值、传指针和 nil 接口',body:'我们写两个“过生日”的函数：一个接收 User 的值，一个接收 User 的指针，看看哪个真的让年龄加了一岁；顺便验证三种打印格式和“nil 指针装进接口不等于 nil”。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 birthdayByValue 改成返回修改后的 User（func birthdayByValue(u User) User），在 main 里用 u = birthdayByValue(u) 接收，看看这样能不能也让年龄加一。'],expect:'传值之后：{Name:Tom Age:18}\n传指针之后：{Name:Tom Age:19}\n{Tom 19} | main.User{Name:"Tom", Age:19}\np == nil： true\nx == nil： false'},code:`package main

import "fmt"

type User struct {
    Name string
    Age  int
}

func birthdayByValue(u User) {
    u.Age++
}

func birthdayByPointer(u *User) {
    u.Age++
}

func main() {
    u := User{Name: "Tom", Age: 18}
    birthdayByValue(u)
    fmt.Printf("传值之后：%+v\\n", u)
    birthdayByPointer(&u)
    fmt.Printf("传指针之后：%+v\\n", u)
    fmt.Printf("%v | %#v\\n", u, u)

    var p *User
    var x any = p
    fmt.Println("p == nil：", p == nil)
    fmt.Println("x == nil：", x == nil)
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头。'},{at:'type User struct {',to:'Age  int',text:'用户结构体。'},{at:'func birthdayByValue(u User) {',to:'u.Age++',text:'参数是 User 的值：函数拿到的是一份复制品，改的是复制品的年龄。'},{at:'func birthdayByPointer(u *User) {',to:'u.Age++',text:'参数是指针：顺着地址改的是原来那个 User。Go 允许直接写 u.Age，不用写 (*u).Age。'},{at:'func main() {',to:'u := User{Name: "Tom", Age: 18}',text:'创建 Tom，18 岁。'},{at:'birthdayByValue(u)',to:'fmt.Printf("传值之后：%+v\\n", u)',text:'传值调用后，原来的 u 没有变，还是 18。'},{at:'birthdayByPointer(&u)',to:'fmt.Printf("传指针之后：%+v\\n", u)',text:'传入 u 的地址，年龄真的变成了 19。'},{at:'fmt.Printf("%v | %#v\\n", u, u)',text:'对比 %v 和 %#v 两种格式。'},{at:'var p *User',to:'var x any = p',text:'一个 nil 指针，再把它装进接口 x。'},{at:'fmt.Println("p == nil：", p == nil)',to:'fmt.Println("x == nil：", x == nil)',text:'p 是 nil，但 x 不等于 nil。'}]}
 ],quiz:[
  {id:'go-values-1',q:'下面哪种字符串写法里，\\n 会被当作两个普通字符而不是换行？',options:['"a\\nb"','`a\\nb`','两种都会换行','两种都不会换行'],why:['双引号字符串会把 \\n 解释为换行符。','','反引号原始字符串不处理转义。','双引号字符串中的 \\n 会被解释为换行。'],answer:1,explain:'反引号是原始字符串，不处理转义；双引号会把 \\n 变成换行。',interview:'q-6d85c2ce0c9bef41'},
  {id:'go-values-2',q:'想去掉文件名后缀，误写了 strings.TrimRight("detail.html", ".html")，结果是？',options:['"detail.html"','"detai"','"detail"','"detail."'],why:['TrimRight 会删除右侧属于集合 .html 的字符，结果不会原样保留。','','detail 末尾的 l 也属于字符集合 .html，会被一并删掉，去后缀应使用 TrimSuffix。','点号和后面的字符都在集合中，会被全部删掉。'],answer:1,explain:'TrimRight 的第二个参数是字符集合，detail 末尾的 l 也在 ".html" 中所以被误删；去掉固定后缀应使用 strings.TrimSuffix。',interview:'q-dae74df7976ad00e'},
  {id:'go-values-3',q:'var u uint8 = 255; u++ 之后 u 的值是？',options:['256','0','程序 panic','编译报错'],why:['uint8 最大只能表示 255，存不下 256。','','运行时整数溢出会按位宽回绕，不会 panic。','变量运算在编译期不检查溢出；只有常量表达式溢出才会编译报错。'],answer:1,explain:'运行时整数溢出会按位宽回绕，uint8 的 255+1 变成 0，不会 panic。如果写成常量 uint8(255)+1 则会编译报错。',interview:'q-3add429dd312a64e'},
  {id:'go-values-4',type:'judge',q:'string(65) 的结果是字符串 "65"。',answer:false,explain:'string(65) 把 65 当作 Unicode 码点，结果是 "A"。数字转十进制字符串要用 strconv.Itoa。',interview:'q-b669b1002a6c863d'},
  {id:'go-values-5',type:'multi',q:'哪些类型的零值是 nil？（多选）',options:['指针','slice','string','map','数组'],why:['','','string 的零值是空字符串 ""。','','数组的零值是每个元素都为零值的数组，不是 nil。'],answers:[0,1,3],explain:'零值为 nil 的有指针、slice、map、channel、函数、接口；string 的零值是空字符串，数组的零值是每个元素的零值。',interview:'q-b9dd099025dad204'},
  {id:'go-values-6',q:'var p *int; var x any = p; x == nil 的结果是？',options:['true','false','编译报错','运行时 panic'],why:['接口里装着类型 *int，只有类型和值都为空时才等于 nil。','','代码完全合法。','比较操作不会 panic。'],answer:1,explain:'接口只有动态类型和值都为空时才等于 nil。x 里装着类型 *int（值为 nil），所以 x != nil。',interview:'q-df0cb4165226cb87'},
  {id:'go-values-7',type:'judge',q:'Go 的指针可以像 C 一样做 p++ 运算来访问下一个元素。',answer:false,explain:'Go 不支持指针运算，只能取地址、解引用和用 ==、!= 比较。特殊场景才用 unsafe，要非常谨慎。',interview:'q-614f336e16b21368'},
  {id:'go-values-8',q:'打印结构体时，想同时看到字段名，最常用哪个格式？',options:['%v','%+v','%#v','%s'],why:['%v 只输出字段值，不带字段名。','','%#v 输出 Go 语法表示，带类型名，内容更冗长。','%s 用于字符串，结构体会按字段逐个格式化，也不带字段名。'],answer:1,explain:'%+v 会输出字段名；%#v 输出 Go 语法表示（带类型名）；%v 只输出值。',interview:'q-0de2e4eb5c9fe77e'},
  {id:'go-values-9',q:'函数需要修改调用方传入的结构体字段，参数应该怎么写？',options:['传结构体的值','传结构体的指针','传值传指针都可以','改用全局变量传递'],why:['Go 是值传递，函数拿到的是副本，修改不影响调用方。','','传值无法修改调用方的结构体。','全局变量会带来耦合和并发问题，不是修改参数的正确方式。'],answer:1,explain:'Go 只有值传递，传值时函数拿到的是副本；传指针复制的是地址，才能修改原对象。',interview:'q-bf5fd01563f1e2b5'},
  {id:'go-values-10',type:'fill',q:'把字符串 "42" 转成 int，常用 strconv 包里的函数 ____。',accepted:['strconv.Atoi','Atoi','strconv.ParseInt','ParseInt'],explain:'strconv.Atoi 把十进制字符串转成 int，需要检查返回的 error；也可以用 ParseInt 指定进制和位数。',interview:'q-b669b1002a6c863d'},
  {id:'go-values-11',q:'float64 的 3.9 转成 int，int(3.9) 的结果是？',options:['4','3','编译报错','运行时 panic'],why:['转换是向零截断，不是四舍五入；四舍五入要用 math.Round。','','变量的浮点转整数是合法的显式转换。','在 int 范围内的转换不会 panic。'],answer:1,explain:'浮点转整数向零截断，3.9 变成 3，-3.9 变成 -3；需要四舍五入请用 math.Round。',interview:'q-b669b1002a6c863d'},
  {id:'go-values-12',type:'judge',q:'var a int32 = 1; var b int64 = 2; a + b 可以直接相加。',answer:false,explain:'Go 不做隐式类型转换，不同类型要先显式转换，比如 int64(a) + b。'},
  {id:'go-values-13',q:'下面哪个是合法的组合字面量？',options:['[]int{1, 2, 3}','map[string]int{"a"}','User{Name: "Tom", 18}','[2]int{1, 2, 3}'],why:['','map 字面量必须写成 key: value 的形式。','结构体字面量不能混用带字段名和不带字段名的写法。','数组字面量的元素个数不能超过数组长度。'],answer:0,explain:'map 字面量要写成 key: value；结构体不能混用带字段名和不带字段名的写法；数组元素不能超过长度。',interview:'q-75d8ba64324f7d70'},
  {id:'go-values-14',type:'judge',q:'unsafe.Sizeof(s) 对一个 string 返回的是字符串内容的总字节数。',answer:false,explain:'Sizeof 只算值本身的大小（string 描述信息通常是 16 字节），不包括它引用的数据。',interview:'q-faaef786b979e214'},
 ]},
 {id:'go-collections',title:'数组、切片与 map',summary:'最常用的三种容器，以及 new 和 make',lessons:[
  {title:'这一关学什么：装一组数据的容器',body:'程序经常要处理“一组”数据：一个班所有学生的成绩、购物车里的商品、用户名和年龄的对应关系。Go 最常用的三种容器是：\n数组：长度固定的一排数据；\n切片：长度可以变化的一排数据，日常开发几乎都用它；\nmap：通过“键”快速找到“值”的对应表。\n这一关讲它们怎么创建、怎么增删改查，len、cap、make、new 分别是什么，以及用 for range 遍历时容易踩的坑。'},
  {title:'数组：长度固定的一排格子',body:'数组就像一排编了号的格子，格子数量在创建时就定死了，不能再增减。编号（下标）从 0 开始。\n数组的长度是类型的一部分：[3]int 和 [4]int 是两种不同的类型，不能互相赋值。\n数组是“值”：把一个数组赋值给另一个变量，或者传给函数，会把所有元素完整地复制一份。改复制品不会影响原来的数组。\n因为长度固定、复制开销大，实际开发中直接用数组的场景不多，更常用的是切片。',code:`arr := [3]int{1, 2, 3}
fmt.Println(arr[0], len(arr))
b := arr
b[0] = 100
fmt.Println(arr, b)`,explain:[{at:'arr := [3]int{1, 2, 3}',text:'创建一个长度为 3 的整数数组。'},{at:'fmt.Println(arr[0], len(arr))',text:'用下标访问第一个元素 1；len 得到长度 3。'},{at:'b := arr',text:'赋值会把整个数组复制一份给 b。'},{at:'b[0] = 100',text:'修改 b 的第一个元素。'},{at:'fmt.Println(arr, b)',text:'打印 [1 2 3] [100 2 3]：arr 没有受影响。'}]},
  {title:'切片：可以变长的一排数据',body:'切片写成 []int，方括号里不写长度。它可以用 append 不断往后追加元素，长度会自动增长，用起来非常方便。\n切片本身并不存数据，它是一个“窗口”，指向背后的一个数组，记录了三样东西：从哪里开始（指针）、现在有几个元素（len，长度）、最多能放几个而不用换地方（cap，容量）。\nappend 时如果容量不够，Go 会自动分配一个更大的数组，把数据搬过去，返回一个指向新数组的切片。所以一定要用 s = append(s, x) 接收返回值，否则可能丢失追加的数据。\n对一个 nil 切片（只声明没有初始化的切片）直接 append 是完全没问题的，Go 会自动为它分配空间。',code:`var s []int
fmt.Println(s == nil, len(s))
s = append(s, 1)
s = append(s, 2, 3)
fmt.Println(s, len(s))
fmt.Println(s[1:3])`,explain:[{at:'var s []int',text:'只声明的切片，值是 nil，长度为 0。'},{at:'fmt.Println(s == nil, len(s))',text:'打印 true 0。'},{at:'s = append(s, 1)',text:'对 nil 切片 append 完全没问题，Go 会自动分配空间。一定要用 s = 接收结果。'},{at:'s = append(s, 2, 3)',text:'append 可以一次追加多个元素。'},{at:'fmt.Println(s, len(s))',text:'打印 [1 2 3] 3。'},{at:'fmt.Println(s[1:3])',text:'切片表达式 s[1:3] 取下标 1 到 3（不含 3）的部分，得到 [2 3]。'}]},
  {title:'len、cap 和 make',body:'len(s)：切片现在有几个元素，可以用下标访问的就是 0 到 len-1；\ncap(s)：在不重新分配内存的情况下，最多能放几个元素。\n用 make 创建切片时可以指定这两个值：\nmake([]int, 5)：长度和容量都是 5，里面已经有 5 个零值元素，可以直接用 s[0] 到 s[4] 读写；\nmake([]int, 0, 5)：长度为 0、容量为 5。里面一个元素都没有，只是预留了 5 个位置，要用 append 往里加。这时如果直接写 s[0] = 1，会因为下标超出长度而 panic（index out of range）。\n事先知道大概要放多少个元素时，用 make 预留好容量，可以避免 append 过程中反复扩容搬家。',code:`a := make([]int, 5)
a[0] = 1
b := make([]int, 0, 5)
fmt.Println(len(b), cap(b))
b = append(b, 1)
// b[1] = 2 // panic：下标超出长度`,explain:[{at:'a := make([]int, 5)',text:'长度 5，里面已经有 5 个 0。'},{at:'a[0] = 1',text:'可以直接用下标赋值。'},{at:'b := make([]int, 0, 5)',text:'长度 0，只预留了 5 个容量。'},{at:'fmt.Println(len(b), cap(b))',text:'打印 0 5。'},{at:'b = append(b, 1)',text:'要用 append 添加元素，添加后长度变成 1。此时 b[1] 仍然超出长度，赋值会 panic（见注释）。'}]},
  {title:'new 和 make 的区别',body:'new 和 make 都是用来“创建”东西的，但用途不同：\nnew(T)：可以用于任何类型，创建一个 T 类型的零值，返回指向它的指针 *T。比如 new(int) 返回一个指向 0 的 *int；\nmake：只能用于切片、map 和 channel 这三种类型，返回的是初始化好、可以直接使用的值本身（不是指针）。\n最容易出错的是 map：new(map[string]int) 得到的是一个指针，指向的是一个 nil map，往 nil map 里写入会 panic。必须用 make(map[string]int) 创建，或者写成字面量 map[string]int{}，才能直接写入。',code:`p := new(int)
*p = 5

m := make(map[string]int)
m["a"] = 1

bad := new(map[string]int)
// (*bad)["a"] = 1 // panic：往 nil map 写入`,explain:[{at:'p := new(int)',text:'创建一个 int 的零值，返回指向它的指针。'},{at:'*p = 5',text:'通过指针赋值。'},{at:'m := make(map[string]int)',text:'用 make 创建一个可以直接使用的 map。'},{at:'m["a"] = 1',text:'写入成功。'},{at:'bad := new(map[string]int)',text:'new 返回指向 nil map 的指针，往里写入会 panic（见注释）。'}]},
  {title:'比较两个切片',body:'切片不能用 == 直接比较（只能和 nil 比较），写 a == b 会编译报错。数组可以用 == 比较，因为长度和类型都确定。\n想比较两个切片的内容是否完全相同，Go 1.21 以后直接用标准库的 slices.Equal(a, b)：长度相同、每个位置的元素都相等，才返回 true。\n标准库的 slices 包还有很多常用函数：slices.Contains 是否包含某个元素，slices.Index 查找位置，slices.Sort 排序，slices.Max 找最大值，不用自己写循环。'},
  {title:'for range：遍历的坑',body:'for i, v := range s 会依次取出切片的下标 i 和元素值 v。要注意：v 只是元素的一个副本，修改 v 不会改到切片里的元素。想修改原元素，要用下标：s[i] = ...。\n遍历字符串时，range 是按字符（rune）一个个取的：下标 i 是这个字符在字符串里的字节位置，值是这个字符。中文一个字占 3 个字节，所以遍历“你好”时，第一次 i 是 0，第二次 i 是 3。\n遍历 map 时，顺序是随机的，每次运行都可能不同，不能依赖它的顺序。',code:`nums := []int{1, 2, 3}
for _, v := range nums {
    v *= 10
}
fmt.Println(nums)

for i := range nums {
    nums[i] *= 10
}
fmt.Println(nums)`,explain:[{at:'nums := []int{1, 2, 3}',text:'一个切片。'},{at:'for _, v := range nums {',to:'v *= 10',text:'v 是元素的副本，乘以 10 只改了副本。下划线 _ 表示不需要下标。'},{at:'fmt.Println(nums)',text:'nums 还是 [1 2 3]。'},{at:'for i := range nums {',to:'nums[i] *= 10',text:'只取下标，用下标直接修改原元素。'},{at:'fmt.Println(nums)',text:'这次变成了 [10 20 30]。'}]},
  {title:'map：用“键”找“值”',body:'map 是一张对应表，每一项是一个“键值对”：通过键（key）快速找到值（value），比如通过用户名找年龄。\n常用操作：\nm[k] = v：写入或修改；\nv := m[k]：读取。读一个不存在的 key 不会报错，也不会 panic，而是返回值类型的零值（比如 int 返回 0）；\nv, ok := m[k]：同时得到“是否存在”，ok 为 false 表示 key 不存在，用来区分“值是 0”和“根本没有”；\ndelete(m, k)：删除一个 key，删除不存在的 key 也不会报错；\nlen(m)：有几个键值对。\nmap 没有容量的概念，cap(m) 会编译报错。make(map[string]int, 100) 里的 100 只是对数量的预估，帮助提前分配空间，并不是上限。',code:`m := make(map[string]int)
m["tom"] = 18
if age, ok := m["bob"]; !ok {
    fmt.Println("没有 bob", age)
}
delete(m, "tom")
fmt.Println(len(m))`,explain:[{at:'m := make(map[string]int)',text:'创建一个“名字 → 年龄”的 map。'},{at:'m["tom"] = 18',text:'写入 tom 的年龄。'},{at:'if age, ok := m["bob"]; !ok {',to:'fmt.Println("没有 bob", age)',text:'bob 不存在：ok 是 false，age 是零值 0。这里用了 if 的简短写法，先执行分号前的语句，再判断条件。'},{at:'delete(m, "tom")',text:'删除 tom。'},{at:'fmt.Println(len(m))',text:'现在 map 是空的，打印 0。'}]},
  {title:'什么类型可以做 map 的 key',body:'map 要靠比较 key 是否相等来查找，所以 key 的类型必须是“可比较”的，也就是能用 == 比较：\n可以：数字、字符串、布尔值、指针、channel、接口，以及元素都可比较的数组、字段都可比较的结构体。比如用 [2]int 表示一个坐标当 key，用结构体 struct{Year, Month int} 当 key，都可以；\n不可以：切片、map、函数。它们不能用 == 比较，拿来当 key 会编译报错。\n另外记住：只声明没有初始化的 map 是 nil，读它没问题，但往里写入会 panic。'},
  {title:'动手试试：三种容器一起用',body:'把这一关的知识点放进一个程序：数组复制、nil 切片 append、make 的长度和容量、range 的副本陷阱、比较切片、遍历中文字符串，以及 map 的读取和删除。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 for i, r := range "你好" 改成遍历 "Go语言"，猜猜打印出的下标分别是多少，再运行验证。'],expect:'数组赋值是复制： [1 2 3] [100 2 3]\nnil 切片 append： [1 2 3] 3\nmake([]int, 0, 5)： 0 5\n改 range 的副本： [1 2 3]\n用下标修改： [10 20 30]\n内容相同吗： true\n0 你\n3 好\nbob： 0 false\n删除后： 0'},code:`package main

import (
    "fmt"
    "slices"
)

func main() {
    arr := [3]int{1, 2, 3}
    copyArr := arr
    copyArr[0] = 100
    fmt.Println("数组赋值是复制：", arr, copyArr)

    var s []int
    s = append(s, 1, 2, 3)
    fmt.Println("nil 切片 append：", s, len(s))

    buf := make([]int, 0, 5)
    fmt.Println("make([]int, 0, 5)：", len(buf), cap(buf))

    for _, v := range s {
        v *= 10
    }
    fmt.Println("改 range 的副本：", s)
    for i := range s {
        s[i] *= 10
    }
    fmt.Println("用下标修改：", s)
    fmt.Println("内容相同吗：", slices.Equal(s, []int{10, 20, 30}))

    for i, r := range "你好" {
        fmt.Println(i, string(r))
    }

    ages := map[string]int{"tom": 18}
    age, ok := ages["bob"]
    fmt.Println("bob：", age, ok)
    delete(ages, "tom")
    fmt.Println("删除后：", len(ages))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"slices"',text:'导入 fmt 和 slices。'},{at:'func main() {',text:'程序入口。'},{at:'arr := [3]int{1, 2, 3}',to:'fmt.Println("数组赋值是复制：", arr, copyArr)',text:'数组赋值会完整复制，改副本不影响原数组。'},{at:'var s []int',to:'fmt.Println("nil 切片 append：", s, len(s))',text:'对 nil 切片 append，得到 [1 2 3]，长度 3。'},{at:'buf := make([]int, 0, 5)',to:'fmt.Println("make([]int, 0, 5)：", len(buf), cap(buf))',text:'长度 0、容量 5。'},{at:'for _, v := range s {',to:'fmt.Println("改 range 的副本：", s)',text:'只改了副本，s 不变。'},{at:'for i := range s {',to:'fmt.Println("用下标修改：", s)',text:'用下标修改，s 变成 [10 20 30]。'},{at:'fmt.Println("内容相同吗：", slices.Equal(s, []int{10, 20, 30}))',text:'slices.Equal 逐个比较元素，打印 true。'},{at:'for i, r := range "你好" {',to:'fmt.Println(i, string(r))',text:'按字符遍历，下标是字节位置：0 和 3。'},{at:'ages := map[string]int{"tom": 18}',to:'fmt.Println("bob：", age, ok)',text:'读不存在的 bob，得到零值 0 和 false，不会 panic。'},{at:'delete(ages, "tom")',to:'fmt.Println("删除后：", len(ages))',text:'删除 tom 后，map 为空。'}]},
  {title:'数组和切片的区别，总结一下',body:'面试常问“数组和切片有什么区别”，可以从这几点回答：\n一、长度：数组长度固定，是类型的一部分，[3]int 和 [4]int 是不同类型；切片长度可变，类型里没有长度；\n二、本质：数组是一块连续的数据本身；切片是指向底层数组的一个“窗口”，记录指针、长度和容量；\n三、赋值和传参：数组会完整复制所有元素；切片只复制“窗口”（指针、长度、容量），多个切片可能共享同一个底层数组，通过一个修改元素，另一个也能看到；\n四、比较：数组可以用 == 比较；切片不能，要用 slices.Equal；\n五、用途：切片更灵活，日常开发几乎都用切片；数组适合长度确定且很小的场景，比如 RGB 颜色 [3]byte、坐标。'}
 ],quiz:[
  {id:'go-collections-1',type:'judge',q:'[3]int 和 [4]int 是两种不同的类型。',answer:true,explain:'数组长度是类型的一部分，所以它们不能互相赋值。切片 []int 则没有长度信息。',interview:'q-a7e0804442cd1cb5'},
  {id:'go-collections-2',q:'s := make([]int, 0, 5) 之后，len(s) 和 cap(s) 分别是？',options:['0 和 5','5 和 5','5 和 0','0 和 0'],why:['','第二个参数是长度 0，不是 5。','长度和容量的位置弄反了。','第三个参数 5 是容量，容量不是 0。'],answer:0,explain:'第二个参数是长度，第三个是容量。长度 0 表示还没有元素，容量 5 表示预留了空间，要用 append 添加。',interview:'q-1d24fad2bec0210b'},
  {id:'go-collections-3',q:'s := make([]int, 0, 5); s[0] = 1 会怎样？',options:['正常完成赋值','编译期直接报错','运行时 panic：下标越界','自动 append 一个元素'],why:['下标必须小于 len，容量大不代表可以直接访问。','编译器不知道运行时的长度，这类错误在运行时才发现。','','下标赋值不会自动扩展长度，要添加元素必须用 append。'],answer:2,explain:'下标必须小于 len。容量大不代表能直接访问，len 是 0 时 s[0] 会越界 panic。',interview:'q-1d24fad2bec0210b'},
  {id:'go-collections-4',q:'下面哪种声明方式得到的 map 可以直接写入键值对？',options:['var m map[string]int','var m = map[string]int(nil)','m := make(map[string]int)','以上三种写法都可以'],why:['只声明不初始化得到的是 nil map，直接写入会 panic。','显式转换得到的依然是 nil map，直接写入会 panic。','','前两种写法得到的都是 nil map，写入会触发 panic。'],answer:2,explain:'前两种得到的都是 nil map，写入会 panic；使用 make(map[string]int) 或字面量 map[string]int{} 初始化后才能写入。',interview:'q-8199eddca129ad93'},
  {id:'go-collections-5',type:'multi',q:'哪些类型可以作为 map 的 key？（多选）',options:['string','[]byte','[2]int','struct{ X, Y int }','map[string]int'],why:['','切片不可比较，不能作为 map 的 key。','','','map 不可比较，不能作为另一个 map 的 key。'],answers:[0,2,3],explain:'key 必须可比较。slice 和 map 不可比较，不能做 key；元素可比较的数组、字段都可比较的结构体可以。',interview:'q-9f26803641ccda2e'},
  {id:'go-collections-6',type:'judge',q:'可以用 cap(m) 查看一个 map 的容量。',answer:false,explain:'Go 没有给 map 定义 cap。make(map[K]V, n) 的 n 只是元素数量预估，不是上限。',interview:'q-d5dd4cc8f5848305'},
  {id:'go-collections-7',q:'两个切片 a、b 想比较内容是否相同，Go 1.21 以后推荐？',options:['a == b','slices.Equal(a, b)','&a == &b','len(a) == len(b)'],why:['切片只能和 nil 用 == 比较，比较两个切片会编译报错。','','比较的是两个变量的地址，不是内容。','长度相同不代表内容相同。'],answer:1,explain:'slices.Equal 认为 nil 切片和空切片相等，而 reflect.DeepEqual 认为不等。',interview:'q-0a207eae6b8d2b05'},
  {id:'go-collections-8',q:'下面代码运行后 nums 是多少？',code:'nums := []int{1, 2, 3}\nfor _, v := range nums {\n    v *= 10\n}\nfmt.Println(nums)',options:['[10 20 30]','[1 2 3]','编译报错','[0 0 0]'],why:['v 是元素的副本，修改它不会影响切片。','','代码是合法的，只是修改没有效果。','切片中的元素没有被清零。'],answer:1,explain:'要修改元素请用下标 nums[i] *= 10。',interview:'q-bf9c8ac5d385e3ff'},
  {id:'go-collections-9',q:'for i, r := range "你好" 中，第二次循环的 i 是多少？',options:['1','2','3','6'],why:['i 是字节偏移而不是字符序号。','“你”在 UTF-8 中占 3 个字节，不是 2 个。','','6 是整个字符串的字节长度。'],answer:2,explain:'range 字符串时 i 是字节偏移，r 是 rune。“你”在 UTF-8 里占 3 个字节，所以第二个字符从 3 开始。',interview:'q-bf9c8ac5d385e3ff'},
  {id:'go-collections-10',type:'short',q:'数组和切片有哪些区别？',reference:'数组长度固定，长度是类型的一部分，是值类型，赋值和传参会复制整个数组；切片是底层数组的视图，包含指针、len、cap，可以通过 append 增长，多个切片可能共享同一个底层数组。数组在元素可比较时可以用 == 比较，切片只能和 nil 比较。',points:['数组长度固定、属于类型','数组赋值复制整个数组','切片含指针 len cap','切片可能共享底层数组'],explain:'说清“长度是否固定”“复制什么”“是否共享”三点就够了。',interview:'q-a7e0804442cd1cb5'},
  {id:'go-collections-11',q:'下面代码输出什么？',code:'s := []int{1, 2, 3}\nfor i := range s {\n    s[i] *= 10\n}\nfmt.Println(s)',options:['[1 2 3]','[10 20 30]','编译报错','[0 0 0]'],why:['通过下标修改的是切片元素本身，结果会改变。','','代码完全合法。','元素被乘以 10，不会变成 0。'],answer:1,explain:'通过下标修改的是切片元素本身，所以结果改变了；用 range 的 value 副本才改不到。',interview:'q-bf9c8ac5d385e3ff'},
  {id:'go-collections-12',type:'judge',q:'读取 map 中不存在的 key 会 panic。',answer:false,explain:'读取不存在的 key 返回值类型的零值，不会 panic；用 v, ok := m[k] 可以区分“不存在”和“值为零”。'},
  {id:'go-collections-13',q:'对 nil 切片执行 append 会怎样？',options:['运行时 panic 退出','编译期直接报错','正常追加，返回新切片','什么都不做，原样返回'],why:['nil 切片可以安全地 append。','这是合法代码。','','append 会分配新的底层数组并返回包含新元素的切片。'],answer:2,explain:'nil 切片的 len 和 cap 都是 0，可以直接 append，Go 会分配新的底层数组。',interview:'q-22d6527e99891cd6'},
  {id:'go-collections-14',type:'fill',q:'删除 map 中的一个 key，使用内置函数 ____(m, k)。',accepted:['delete'],explain:'delete 删除不存在的 key 也不会报错；Go 1.21 起 clear(m) 可以清空整个 map。'},
 ]},
 {id:'go-funcs',title:'函数、接口与错误处理',summary:'可变参数、接口、比较、组合和 error',lessons:[
  {title:'这一关学什么：把代码组织起来',body:'代码多了，就要把它们拆成一个个有名字、能反复使用的小块，这就是函数。再进一步，Go 用“方法”和“接口”来组织代码，实现其他语言里“面向对象”的效果，但方式更简单。\n这一关讲：\n一、函数：多个返回值、可变参数、把函数当作值使用；\n二、方法和接口：Go 特有的“鸭子类型”；\n三、组合：Go 没有继承，用嵌入来复用代码；\n四、哪些值可以用 == 比较，空结构体有什么用；\n五、Go 的错误处理：返回 error、包装错误、errors.Is 和 errors.As。'},
  {title:'函数和多个返回值',body:'用 func 定义函数：函数名、参数列表（每个参数写“名字 类型”）、返回值类型，然后是函数体。\nGo 的函数可以返回多个值，最常见的形式是 (结果, error)：第二个返回值表示有没有出错。调用方先检查 err，没有错误再使用结果。这是 Go 处理错误的基本方式，你会在几乎所有代码里看到它。\n不需要某个返回值时，可以用下划线 _ 忽略它，但忽略错误要非常谨慎。',code:`func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("除数不能为 0")
    }
    return a / b, nil
}

q, err := divide(10, 2)
if err != nil {
    fmt.Println("出错了：", err)
    return
}
fmt.Println(q)`,explain:[{at:'func divide(a, b int) (int, error) {',text:'定义函数：两个 int 参数（类型相同可以合并写），返回一个 int 和一个 error。'},{at:'if b == 0 {',to:'return 0, errors.New("除数不能为 0")',text:'出错时返回零值和一个错误。errors.New 创建一个带说明文字的错误。'},{at:'return a / b, nil',text:'成功时返回结果，错误为 nil。'},{at:'q, err := divide(10, 2)',text:'调用函数，用两个变量接收两个返回值。'},{at:'if err != nil {',to:'return',text:'先检查错误，出错就处理并返回。'},{at:'fmt.Println(q)',text:'没有出错才使用结果，打印 5。'}]},
  {title:'可变参数：参数个数不固定',body:'有时函数要接收任意多个参数，比如求和。把最后一个参数写成 名字 ...类型，就是可变参数，调用时可以传 0 个、1 个或者很多个。在函数内部，它就是一个切片。\n规则：一个函数最多只能有一个可变参数，而且必须放在参数列表的最后。\n如果手里已经有一个切片，想把它的元素逐个传进去，要在切片后面加三个点展开：sum(nums...)。直接写 sum(nums) 会编译报错，因为类型对不上。fmt.Println 就是一个可变参数函数，所以它能接收任意多个值。',code:`func sum(xs ...int) int {
    total := 0
    for _, x := range xs {
        total += x
    }
    return total
}

sum(1, 2, 3)
nums := []int{1, 2}
sum(nums...)`,explain:[{at:'func sum(xs ...int) int {',text:'xs 是可变参数，在函数里它就是一个 []int。'},{at:'total := 0',text:'累加器。'},{at:'for _, x := range xs {',to:'total += x',text:'逐个累加。'},{at:'return total',text:'返回总和。'},{at:'sum(1, 2, 3)',text:'直接传多个参数，结果 6。'},{at:'nums := []int{1, 2}',text:'已经有一个切片。'},{at:'sum(nums...)',text:'用 ... 把切片展开成多个参数传入，结果 3。'}]},
  {title:'方法：属于某个类型的函数',body:'方法就是带“接收者”的函数，写在 func 和函数名之间，表示这个函数属于哪个类型。调用时用“变量.方法名()”。\n接收者可以是值（c Circle），也可以是指针（c *Circle）。需要在方法里修改对象的字段，或者对象很大时，用指针接收者。\n通过方法，就能实现其他语言里“类”的效果：数据（结构体的字段）和操作数据的行为（方法）放在一起。',code:`type Circle struct {
    R float64
}

func (c Circle) Area() float64 {
    return 3.14 * c.R * c.R
}

func (c *Circle) Grow(d float64) {
    c.R += d
}

c := Circle{R: 1}
c.Grow(1)
fmt.Println(c.Area())`,explain:[{at:'type Circle struct {',to:'R float64',text:'一个圆，只有半径一个字段。'},{at:'func (c Circle) Area() float64 {',to:'return 3.14 * c.R * c.R',text:'值接收者的方法：计算面积，只读不改。'},{at:'func (c *Circle) Grow(d float64) {',to:'c.R += d',text:'指针接收者的方法：要修改半径，所以用指针。'},{at:'c := Circle{R: 1}',text:'创建一个半径为 1 的圆。'},{at:'c.Grow(1)',text:'调用方法，半径变成 2。Go 会自动取 c 的地址传给指针接收者，不用写 (&c).Grow(1)。'},{at:'fmt.Println(c.Area())',text:'打印面积 12.56。'}]},
  {title:'接口：只要会叫，就是鸭子',body:'接口是一组方法的集合，它只规定“需要能做什么”，不关心“具体是谁”。\n一个类型只要实现了接口要求的全部方法，就自动满足这个接口，不需要写 implements 之类的声明。这叫“鸭子类型”：走起来像鸭子、叫起来像鸭子，那它就是鸭子。\n这样写代码可以只依赖接口：比如一个函数接收 Speaker 接口，任何会 Speak 的类型都能传进来，以后增加新的类型，函数一行都不用改。\n接口变量里其实装着两样东西：实际的类型（动态类型）和实际的值（动态值）。\n空接口 interface{} 没有任何方法要求，所以任何类型都满足它，Go 1.18 起可以简写成 any。',code:`type Speaker interface {
    Speak() string
}

type Dog struct{}

func (Dog) Speak() string { return "汪" }

type Cat struct{}

func (Cat) Speak() string { return "喵" }

func chorus(ss ...Speaker) {
    for _, s := range ss {
        fmt.Print(s.Speak(), " ")
    }
}

chorus(Dog{}, Cat{})`,explain:[{at:'type Speaker interface {',to:'Speak() string',text:'定义接口：只要有 Speak() string 这个方法，就是 Speaker。'},{at:'type Dog struct{}',text:'狗。'},{at:'func (Dog) Speak() string { return "汪" }',text:'Dog 实现了 Speak，就自动满足 Speaker，没有任何额外声明。接收者不用时可以省略变量名。'},{at:'type Cat struct{}',to:'func (Cat) Speak() string { return "喵" }',text:'猫也实现了 Speak。'},{at:'func chorus(ss ...Speaker) {',text:'函数只依赖接口，接收任意多个 Speaker。'},{at:'for _, s := range ss {',to:'fmt.Print(s.Speak(), " ")',text:'调用每个 Speaker 的 Speak，实际执行的是各自类型的实现。'},{at:'chorus(Dog{}, Cat{})',text:'打印 汪 喵。'}]},
  {title:'类型断言：看看接口里装的是什么',body:'拿到一个接口值后，有时需要知道它里面具体装的是什么类型，或者它是否还支持别的方法，这时用类型断言：\nv, ok := x.(T)：如果 x 里装的是 T 类型，ok 为 true，v 就是那个值；否则 ok 为 false，不会出错。只写 v := x.(T) 不带 ok 的话，类型不对会直接 panic，所以推荐总是带上 ok；\nT 也可以是一个接口：比如想判断一个对象是否有 Close() error 方法，就断言成 interface{ Close() error }，标准库里很多地方都这样检查“对方是否支持某个能力”。\n要同时判断很多种类型，用上一关见过的类型 switch。',code:`var x any = "hello"
s, ok := x.(string)
fmt.Println(s, ok)
n, ok := x.(int)
fmt.Println(n, ok)

if c, ok := obj.(interface{ Close() error }); ok {
    c.Close()
}`,explain:[{at:'var x any = "hello"',text:'接口里装了一个字符串。'},{at:'s, ok := x.(string)',to:'fmt.Println(s, ok)',text:'断言成 string 成功：打印 hello true。'},{at:'n, ok := x.(int)',to:'fmt.Println(n, ok)',text:'断言成 int 失败：n 是零值 0，ok 是 false，不会 panic。'},{at:'if c, ok := obj.(interface{ Close() error }); ok {',to:'c.Close()',text:'判断 obj 有没有 Close() error 方法：有的话就调用它关闭资源。'}]},
  {title:'组合代替继承：嵌入',body:'Go 没有类，也没有继承。它复用代码的方式是“组合”：把一个类型直接写进另一个结构体里（只写类型、不写字段名），这叫嵌入。\n被嵌入类型的字段和方法会被“提升”到外层，外层可以直接调用，就像是自己的一样。比如 Car 嵌入了 Engine，Engine 有 Start 方法，就可以直接写 car.Start()，也可以写完整的 car.Engine.Start()。\n但嵌入不是继承：Car 并不“是”一个 Engine，不能把 Car 赋值给 Engine 类型的变量。\n可以嵌入值类型 T，也可以嵌入指针 *T，还可以嵌入接口类型（这时外层必须在创建时给这个接口字段赋一个具体的实现）。',code:`type Engine struct {
    Power int
}

func (e Engine) Start() string {
    return fmt.Sprintf("%d 马力的发动机启动了", e.Power)
}

type Car struct {
    Engine
    Brand string
}

car := Car{Engine: Engine{Power: 150}, Brand: "小米"}
fmt.Println(car.Start())
fmt.Println(car.Power)`,explain:[{at:'type Engine struct {',to:'Power int',text:'发动机，有一个功率字段。'},{at:'func (e Engine) Start() string {',to:'return fmt.Sprintf("%d 马力的发动机启动了", e.Power)',text:'发动机的启动方法。Sprintf 和 Printf 一样按格式拼接，但不打印，而是返回字符串。'},{at:'type Car struct {',text:'汽车。'},{at:'Engine',text:'嵌入 Engine：只写类型名，不写字段名。'},{at:'Brand string',text:'汽车自己的字段。'},{at:'car := Car{Engine: Engine{Power: 150}, Brand: "小米"}',text:'创建汽车时，嵌入的字段名就是类型名 Engine。'},{at:'fmt.Println(car.Start())',text:'Engine 的方法被提升到 Car 上，可以直接调用。'},{at:'fmt.Println(car.Power)',text:'Engine 的字段也被提升了，打印 150。'}]},
  {title:'哪些值能用 == 比较',body:'不是所有值都能用 == 比较：\n一、切片、map、函数不能用 == 比较（只能和 nil 比）；\n二、结构体只有在所有字段都可比较时，才能用 ==。如果想故意让一个结构体不能被比较（比如防止别人误用 == 比较它），又不想增加它占用的内存，可以加一个字段 _ [0]func()：函数类型不可比较，长度为 0 的数组又不占空间；\n三、接口可以用 == 比较：先比动态类型，类型不同就不相等；类型相同再比较值。如果里面装的值本身不可比较（比如切片），编译时发现不了，运行时会 panic。比如 var a any = []int{1}，执行 a == a 就会 panic；\n四、time.Time 不要用 == 比较是否是同一时刻，因为它内部还带着时区等信息，同一时刻在不同时区表示时 == 会得到 false，应该用 t1.Equal(t2)。'},
  {title:'空结构体：不占空间的“占位符”',body:'struct{} 是一个没有任何字段的结构体，它的大小是 0，不占内存。它常被用来表示“我只关心有没有，不关心值是什么”：\n一、做集合：map[string]struct{}，只用 key 表示“这个元素存在”，value 不占空间。比用 map[string]bool 更省内存，意思也更清楚；\n二、发信号：chan struct{}，channel 里传的值本身没有意义，只是用来通知“某件事发生了”，比如通知 goroutine 该退出了；\n三、前面讲过的“号牌箱”：make(chan struct{}, n) 用来限制并发数。',code:`seen := map[string]struct{}{}
seen["go"] = struct{}{}
_, ok := seen["go"]
fmt.Println(ok)

done := make(chan struct{})
go func() {
    work()
    close(done)
}()
<-done`,explain:[{at:'seen := map[string]struct{}{}',text:'用 map 实现一个字符串集合，value 是空结构体。'},{at:'seen["go"] = struct{}{}',text:'struct{}{} 是空结构体的值：前面的 struct{} 是类型，后面的 {} 创建一个值。把 go 加入集合。'},{at:'_, ok := seen["go"]',to:'fmt.Println(ok)',text:'判断 go 在不在集合里，打印 true。'},{at:'done := make(chan struct{})',text:'一个只用来发信号的 channel。'},{at:'go func() {',to:'close(done)',text:'后台干完活就关闭 done，表示“完成了”。'},{at:'<-done',text:'在这里等待完成信号。'}]},
  {title:'错误处理：加上下文往上传',body:'Go 没有 try/catch，错误就是一个普通的返回值，调用方要检查并处理。一个错误往上层返回时，最好加上“在做什么的时候出的错”，否则最上层只看到一句“文件不存在”，根本不知道是哪里的哪个文件。\nfmt.Errorf("读取配置: %w", err)：用 %w 把原错误“包装”起来，既加上了上下文，又保留了原错误，形成一条“错误链”；\nerrors.Is(err, 目标错误)：沿着错误链查找，判断里面有没有某个特定的错误值，比如 os.ErrNotExist（文件不存在）；\nerrors.As(err, &目标变量)：沿着错误链查找某种类型的错误，找到就取出来，比如取出 *os.PathError 看看出错的路径是什么。\n注意：用 %v 代替 %w 也能加上下文，但原错误就“断链”了，errors.Is 和 errors.As 找不到它。普通的业务失败（参数错误、记录不存在）返回 error，不要用 panic。'},
  {title:'动手试试：包装错误，再把它认出来',body:'我们写一个读取配置文件的函数，故意读一个不存在的文件，看看包装后的错误信息长什么样，以及怎么用 errors.Is 和 errors.As 从错误链里把原始错误认出来。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 fmt.Errorf 里的 %w 改成 %v，再运行，看看后两行的结果有什么变化。'],expect:'加载配置失败: 读取配置: open not-exist.yaml: no such file or directory\n是“文件不存在”吗： true\n出错的路径： not-exist.yaml'},code:`package main

import (
    "errors"
    "fmt"
    "io/fs"
    "os"
)

func readConfig(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("读取配置: %w", err)
    }
    return data, nil
}

func main() {
    _, err := readConfig("not-exist.yaml")
    if err != nil {
        fmt.Println("加载配置失败:", err)
        fmt.Println("是“文件不存在”吗：", errors.Is(err, fs.ErrNotExist))
        var pathErr *fs.PathError
        if errors.As(err, &pathErr) {
            fmt.Println("出错的路径：", pathErr.Path)
        }
    }
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"os"',text:'errors 判断错误，fmt 打印和包装，io/fs 提供文件相关的错误定义，os 读文件。'},{at:'func readConfig(path string) ([]byte, error) {',text:'读取配置文件，返回文件内容和错误。'},{at:'data, err := os.ReadFile(path)',text:'读取整个文件。'},{at:'if err != nil {',to:'return nil, fmt.Errorf("读取配置: %w", err)',text:'出错时加上“读取配置”这个上下文，用 %w 包装原错误后返回。'},{at:'return data, nil',text:'成功时返回内容。'},{at:'func main() {',to:'_, err := readConfig("not-exist.yaml")',text:'读一个不存在的文件，内容用 _ 忽略。'},{at:'if err != nil {',to:'fmt.Println("加载配置失败:", err)',text:'打印完整的错误信息：外层上下文和原始错误串在一起。Windows 上原始错误的文字会是系统的中文或英文提示，和下面略有不同。'},{at:'fmt.Println("是“文件不存在”吗：", errors.Is(err, fs.ErrNotExist))',text:'沿着错误链找到了“文件不存在”这个错误，打印 true。'},{at:'var pathErr *fs.PathError',text:'准备一个变量，用来接收找到的 *fs.PathError 类型的错误。'},{at:'if errors.As(err, &pathErr) {',to:'fmt.Println("出错的路径：", pathErr.Path)',text:'在错误链里找到这种类型的错误后，就能读出它的详细信息，比如出错的文件路径。'}]},
  {title:'坑：返回值为 nil 的错误指针',body:'上一关讲过：装了 nil 指针的接口不等于 nil。这个坑在错误处理里最常见：\n如果函数的返回类型是 error（一个接口），函数里却写了 var e *MyError; return e，返回的是“类型为 *MyError、值为 nil”的接口值。调用方判断 err != nil 时，结果是 true，会误以为出错了。\n正确的写法：没有错误时，直接 return nil。'},
  {title:'函数也是值：闭包',body:'在 Go 里，函数可以像普通的值一样赋值给变量、作为参数传入、作为返回值返回。\n在函数里面定义的匿名函数，可以使用外面函数的变量，并且能一直“记住”它们，这叫闭包。\n下面的 counter 每次调用返回的函数，都有自己独立的 n，调用一次加一次。闭包常用于回调函数、中间件，以及前面学过的 defer、goroutine。',code:`func counter() func() int {
    n := 0
    return func() int {
        n++
        return n
    }
}

next := counter()
fmt.Println(next(), next(), next())`,explain:[{at:'func counter() func() int {',text:'counter 返回一个函数，这个函数的类型是 func() int。'},{at:'n := 0',text:'counter 的局部变量。'},{at:'return func() int {',to:'return n',text:'返回一个匿名函数，它使用并修改外面的 n。即使 counter 已经返回，n 依然被这个函数“记住”着。'},{at:'next := counter()',text:'拿到一个计数器函数。'},{at:'fmt.Println(next(), next(), next())',text:'每调用一次加一，打印 1 2 3。'}]}
 ],quiz:[
  {id:'go-funcs-1',q:'已有 nums := []int{1,2,3}，怎样传给 func sum(xs ...int)？',options:['sum(nums)','sum(nums...)','sum(...nums)','sum(&nums)'],why:['切片类型不能直接传给 ...int 参数，会编译报错。','','Go 的展开写法是把 ... 放在变量后面，前置是 JavaScript 的语法。','传的是切片指针，类型不匹配。'],answer:1,explain:'用 nums... 展开切片；注意此时函数里的 xs 和 nums 共享底层数组。',interview:'q-6c902cd1f29e0d6b'},
  {id:'go-funcs-2',type:'judge',q:'在 Go 里，一个类型必须显式声明 implements 某接口才能赋值给该接口。',answer:false,explain:'Go 的接口是隐式实现的：方法齐全就自动满足，这就是“鸭子类型”。',interview:'q-f425929256c4ad93'},
  {id:'go-funcs-3',q:'Go 如何实现面向对象中的“复用”？',options:['类的继承','结构体嵌入','代码宏展开','泛型类继承'],why:['Go 没有类和继承。','','Go 不支持宏。','Go 的泛型用于类型参数化，不提供继承。'],answer:1,explain:'嵌入把内层类型的字段和方法提升到外层，再配合接口实现多态。',interview:'q-a9fb4bcaaaf0844c'},
  {id:'go-funcs-4',q:'已知 var a, b any = []int{1}, []int{1}，下面哪个表达式在运行时会 panic？',options:['a == nil','a == 1','a == b','都不会 panic'],why:['和 nil 比较只检查接口的动态类型与值是否为空，不会 panic。','动态类型不同（[]int 与 int）时直接返回 false，不会 panic。','','a == b 的动态类型相同且为不可比较的切片类型，运行时会 panic。'],answer:2,explain:'两个接口变量的动态类型相同且为不可比较类型（如切片、map、函数）时，用 == 比较会在运行时 panic。',interview:'q-df0cb4165226cb87'},
  {id:'go-funcs-5',q:'只想让结构体不能用 == 比较，又不想增加字段大小，常用做法是加一个字段：',options:['_ [0]func()','_ int','_ string','_ *int'],why:['','int 可比较，加上后结构体仍然可以用 == 比较，还多占 8 字节。','string 可比较，而且会增加 16 字节。','指针可比较，也会增加 8 字节。'],answer:0,explain:'零长度的函数数组不占元素空间，但类型不可比较，所以整个结构体变得不可比较。',interview:'q-bfc5773e0464fe90'},
  {id:'go-funcs-6',type:'multi',q:'空结构体 struct{} 常见的用途有？（多选）',options:['map[string]struct{} 实现集合','chan struct{} 发送信号','用空结构体指针当唯一身份','放在结构体末尾时不占任何空间'],why:['','','不同零大小变量的指针可能相等，不能当作唯一身份。','作为最后一个字段时编译器会补齐填充，防止取地址越界，可能增大结构体。'],answers:[0,1],explain:'空结构体大小为 0，适合做集合值、信号和无状态的标记类型。',interview:'q-a2c63033182fa118'},
  {id:'go-funcs-7',q:'想给错误加上下文，同时让上层还能用 errors.Is 认出原错误，应该用？',options:['fmt.Errorf("读取配置: %v", err)','fmt.Errorf("读取配置: %w", err)','errors.New("读取配置失败")','log.Fatalf("读取配置: %v", err)'],why:['%v 只把错误格式化成字符串，包装链断了，errors.Is 认不出原错误。','','errors.New 创建了全新的错误，丢失了原错误。','log.Fatalf 会直接退出程序，不是给错误加上下文再返回。'],answer:1,explain:'%w 会保留包装关系；%v 只是格式化成字符串，链就断了。',interview:'q-7b293576983caa64'},
  {id:'go-funcs-8',type:'fill',q:'从错误链中取出某个具体错误类型（比如 *os.PathError），用 errors.____。',accepted:['As','errors.As'],explain:'errors.As 找到链上第一个匹配类型的错误并赋值给目标；errors.Is 判断的是是否匹配某个错误值。',interview:'q-7b293576983caa64'},
  {id:'go-funcs-9',q:'判断 obj 是否有 Close() error 方法，最推荐的做法是？',options:['定义小接口 Closer 再做类型断言','把 obj 转成字符串搜索 "Close"','直接调用，panic 了就说明没有','用 unsafe 包读取方法表'],why:['','字符串表示与方法集无关，结果不可靠。','用 panic 做控制流既危险又低效。','unsafe 依赖内部实现，不安全也不可移植。'],answer:0,explain:'已知方法签名时，小接口 + 类型断言最清晰安全；只有按字符串名查找时才用反射。',interview:'q-949f3e5850735e7e'},
  {id:'go-funcs-10',q:'两个 time.Time 想判断是否是同一时刻，推荐？',options:['t1 == t2','reflect.DeepEqual(t1, t2)','t1.Equal(t2)','t1.String() == t2.String()'],why:['Time 里还带有时区和单调时钟信息，同一时刻也可能不相等。','DeepEqual 同样会比较时区和单调时钟等内部字段。','','字符串表示受时区影响，同一时刻在不同时区格式化结果不同。'],answer:2,explain:'Time 里还带有时区和单调时钟信息，用 == 可能误判。判断“相同”要先想清楚业务含义，时间用领域方法 Equal。',interview:'q-e6ed7b3ed9129f29'},
  {id:'go-funcs-11',type:'judge',q:'结构体可以直接嵌入接口类型（如 io.Reader），但不能嵌入指向接口的指针（如 *io.Reader）。',answer:true,explain:'嵌入字段可以是接口类型 T 或具体类型指针 *S，但不能是指向接口的指针或指向指针的指针。',interview:'q-bc32ce223ccbe2b0'},
  {id:'go-funcs-12',q:'函数可以返回多个值，下面哪种是 Go 中最常见的形式？',options:['(结果, bool)','(结果, error)','出错时 panic','(error, 结果)'],why:['(结果, bool) 是 map 查找、类型断言这类“是否存在”的 comma-ok 写法，不携带错误原因。','','panic 用于不可恢复的程序错误，可预期的失败应返回 error。','惯例是把 error 放在最后，放在前面不符合习惯。'],answer:1,explain:'惯例是把 error 放在最后一个返回值，调用方先检查 err != nil。'},
  {id:'go-funcs-13',type:'judge',q:'把一个值为 nil 的 *MyError 指针作为 error 返回，调用方的 err != nil 判断结果为 false。',answer:false,explain:'接口里装了类型 *MyError，即使指针是 nil，接口也不等于 nil。没有错误时应直接 return nil。',interview:'q-7b293576983caa64'},
  {id:'go-funcs-14',q:'外层结构体嵌入了 Engine，Engine 有方法 Start()。外层变量 car 怎么调用？',options:['两种写法都可以','必须写 car.Engine.Start()','必须写 car.Start()','嵌入的方法无法调用'],why:['','嵌入会把内层的方法提升到外层，也可以直接调用 car.Start()。','通过嵌入字段名显式调用 car.Engine.Start() 同样可以。','嵌入类型的方法可以正常调用。'],answer:0,explain:'car.Engine.Start() 和 car.Start() 都可以：嵌入会把内层方法“提升”到外层，同名时外层的方法优先。',interview:'q-a9fb4bcaaaf0844c'},
  {id:'go-funcs-15',type:'fill',q:'Go 中表示“任意类型”的空接口，Go 1.18 起可以写作 ____。',accepted:['any','interface{}'],explain:'any 是 interface{} 的别名。使用时需要类型断言或类型 switch 才能取回具体类型。'},
 ]},
 {id:'go-stdlib',title:'标准库常用包',summary:'strings、strconv、time、io、bufio 和 encoding/json',lessons:[
  {title:'这一关学什么：Go 自带的工具箱',body:'Go 安装好之后，就自带了一个功能非常全的“标准库”：处理文字、数字转换、时间、读写文件、网络、JSON、加密……很多事情不用装任何第三方库就能完成。\n这一关挑最常用的几个包来讲：\nstrings：处理字符串；\nstrconv：字符串和数字互相转换；\ntime：时间和时长；\nio 和 bufio：读写数据，尤其是怎么读很大的文件；\nencoding/json：结构体和 JSON 互相转换。\n标准库每个包的完整说明都可以在 pkg.go.dev 网站上查到，遇到不会用的函数，搜包名就行。'},
  {title:'strings：处理文字',body:'strings 包里是各种处理字符串的函数，最常用的有：\nContains(s, sub)：s 里是否包含 sub；\nHasPrefix、HasSuffix：是否以某段文字开头、结尾；\nSplit(s, sep)：按分隔符切成切片；\nJoin(切片, sep)：用分隔符把切片连成一个字符串；\nTrimSpace：去掉首尾的空格、换行；\nReplaceAll(s, 旧, 新)：把所有的旧文字替换成新文字；\nToUpper、ToLower：转大写、小写。\n循环里大量拼接字符串时，用 strings.Builder，不要用 +=。',code:`strings.Contains("golang", "go")
strings.HasPrefix("order_42", "order_")
strings.Split("a,b,c", ",")
strings.Join([]string{"a", "b", "c"}, "-")
strings.TrimSpace("  go  \\n")
strings.ReplaceAll("a-b-c", "-", "/")`,explain:[{at:'strings.Contains("golang", "go")',text:'包含，返回 true。'},{at:'strings.HasPrefix("order_42", "order_")',text:'以 order_ 开头，返回 true。'},{at:'strings.Split("a,b,c", ",")',text:'按逗号切开，得到 [a b c]。'},{at:'strings.Join([]string{"a", "b", "c"}, "-")',text:'用横线连起来，得到 "a-b-c"。'},{at:'strings.TrimSpace("  go  \\n")',text:'去掉首尾的空格和换行，得到 "go"。'},{at:'strings.ReplaceAll("a-b-c", "-", "/")',text:'把所有横线换成斜线，得到 "a/b/c"。'}]},
  {title:'strconv：字符串和数字互转',body:'从用户输入、配置文件、网址参数里拿到的都是字符串，要做计算就得先转成数字；反过来，把数字拼进文字里又要转成字符串。\nstrconv.Atoi(s)：字符串转整数。如果字符串不是合法的整数（比如 "12a"），它会返回一个 error，而不是 panic，所以一定要检查错误；\nstrconv.Itoa(n)：整数转字符串；\nstrconv.ParseFloat(s, 64)、strconv.ParseBool(s)：转成小数、布尔值；\nstrconv.FormatInt(n, 2)：把整数按指定进制转成字符串，比如二进制。',code:`n, err := strconv.Atoi("42")
if err != nil {
    return err
}
s := strconv.Itoa(n + 1)
f, _ := strconv.ParseFloat("3.14", 64)
bin := strconv.FormatInt(5, 2)`,explain:[{at:'n, err := strconv.Atoi("42")',text:'字符串转整数，得到 42。'},{at:'if err != nil {',to:'return err',text:'转换失败（比如输入是 "12a"）就返回错误。'},{at:'s := strconv.Itoa(n + 1)',text:'43 转回字符串 "43"。'},{at:'f, _ := strconv.ParseFloat("3.14", 64)',text:'字符串转 float64。这里为了简短用 _ 忽略了错误，实际代码里要检查。'},{at:'bin := strconv.FormatInt(5, 2)',text:'5 转成二进制字符串 "101"。'}]},
  {title:'time：时间点和时长',body:'time 包里有两个最重要的类型：\ntime.Time：一个时间点，比如“2025 年 3 月 8 日 14:30”。time.Now() 取当前时间；\ntime.Duration：一段时长，比如“90 分钟”。它的底层是整数，单位是纳秒，通常用 time.Second、time.Minute、time.Hour 这些常量乘出来。\n常用操作：\nt.Add(2 * time.Hour)：两小时后的时间点；\nt2.Sub(t1)：两个时间点相差多久，得到一个 Duration；\ntime.Since(start)：从 start 到现在过了多久，最常用来统计代码耗时；\nt1.Before(t2)、t1.After(t2)、t1.Equal(t2)：比较两个时间点。',code:`start := time.Now()
doWork()
fmt.Println("耗时", time.Since(start))

deadline := time.Now().Add(30 * time.Minute)
if time.Now().After(deadline) {
    fmt.Println("已经超时")
}`,explain:[{at:'start := time.Now()',text:'记下开始的时间点。'},{at:'doWork()',text:'做一些事情。'},{at:'fmt.Println("耗时", time.Since(start))',text:'打印从开始到现在过了多久，比如 1.23s。'},{at:'deadline := time.Now().Add(30 * time.Minute)',text:'算出 30 分钟后的时间点，比如订单的支付截止时间。'},{at:'if time.Now().After(deadline) {',to:'fmt.Println("已经超时")',text:'当前时间晚于截止时间，就说明超时了。'}]},
  {title:'时间格式化：记住 2006-01-02 15:04:05',body:'其他语言格式化时间常写 yyyy-MM-dd，Go 却很特别：它用一个固定的“参考时间”当模板，你想要什么格式，就把这个参考时间写成那个样子。\n参考时间是：2006 年 1 月 2 日 下午 3 点 04 分 05 秒，也就是 2006-01-02 15:04:05。记忆方法：按“月 日 时 分 秒 年”的顺序，正好是 1 2 3 4 5 6。\n所以想要“2025-03-08”的格式，就写 t.Format("2006-01-02")；想要“14:30”，就写 t.Format("15:04")；想要中文的“2025年03月08日”，就写 "2006年01月02日"。\n反过来，把字符串解析成时间用 time.Parse(模板, 字符串)。写错模板（比如写成 2025-01-01）不会报错，但结果会是错的，要特别小心。'},
  {title:'动手试试：字符串、数字和时间',body:'我们用一个固定的时间点（2025 年 3 月 8 日 14:30），练习 strings、strconv 和 time 的常用函数。用固定时间而不是 time.Now()，是为了让每个人运行的结果都一样。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 t.Format("2006年01月02日 15:04") 改成你喜欢的格式，比如 "01/02 3:04PM"，运行看看效果。'],expect:'a-b-c\nGO\nAtoi("12a") 出错了吗： true\n2025-03-08\n2025年03月08日 14:30\n16:00 1h30m0s\n相差天数： 2'},code:`package main

import (
    "fmt"
    "strconv"
    "strings"
    "time"
)

func main() {
    fmt.Println(strings.Join([]string{"a", "b", "c"}, "-"))
    fmt.Println(strings.ToUpper(strings.TrimSpace("  go  ")))
    _, err := strconv.Atoi("12a")
    fmt.Println("Atoi(\\"12a\\") 出错了吗：", err != nil)

    t := time.Date(2025, 3, 8, 14, 30, 0, 0, time.UTC)
    fmt.Println(t.Format("2006-01-02"))
    fmt.Println(t.Format("2006年01月02日 15:04"))
    later := t.Add(90 * time.Minute)
    fmt.Println(later.Format("15:04"), later.Sub(t))
    d, _ := time.Parse("2006-01-02", "2025-03-10")
    fmt.Println("相差天数：", d.Sub(t.Truncate(24*time.Hour)).Hours()/24)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'导入四个标准库包。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println(strings.Join([]string{"a", "b", "c"}, "-"))',text:'用横线拼接，打印 a-b-c。'},{at:'fmt.Println(strings.ToUpper(strings.TrimSpace("  go  ")))',text:'先去掉首尾空格，再转大写，打印 GO。函数可以一层套一层地调用。'},{at:'_, err := strconv.Atoi("12a")',to:'fmt.Println("Atoi(\\"12a\\") 出错了吗：", err != nil)',text:'"12a" 不是合法整数，返回了错误，没有 panic。字符串里的 \\" 表示一个双引号。'},{at:'t := time.Date(2025, 3, 8, 14, 30, 0, 0, time.UTC)',text:'用 time.Date 构造一个固定的时间点：年、月、日、时、分、秒、纳秒、时区。'},{at:'fmt.Println(t.Format("2006-01-02"))',text:'按参考时间的样子写模板，得到 2025-03-08。'},{at:'fmt.Println(t.Format("2006年01月02日 15:04"))',text:'中文格式，得到 2025年03月08日 14:30。'},{at:'later := t.Add(90 * time.Minute)',to:'fmt.Println(later.Format("15:04"), later.Sub(t))',text:'90 分钟后是 16:00；两个时间点相差 1h30m0s（1 小时 30 分）。'},{at:'d, _ := time.Parse("2006-01-02", "2025-03-10")',text:'把字符串解析成时间点，模板同样是参考时间。'},{at:'fmt.Println("相差天数：", d.Sub(t.Truncate(24*time.Hour)).Hours()/24)',text:'Truncate 把 t 截到当天零点，再算相差多少小时、除以 24，得到 2 天。'}]},
  {title:'io.Reader 和 io.Writer：像积木一样组合',body:'io.Reader 和 io.Writer 是 Go 里最重要的两个接口，都只有一个方法：\nio.Reader：Read 方法，表示“可以从我这里读出数据”；\nio.Writer：Write 方法，表示“可以往我这里写入数据”。\n文件（*os.File）、网络连接、HTTP 请求和响应的内容、内存缓冲区（bytes.Buffer、strings.Reader）、压缩流……都实现了这两个接口。所以它们可以像积木一样自由组合：一个函数只要接收 io.Reader，就既能读文件，也能读网络数据，还能读一段内存里的字符串，测试时也很方便。\nio.Copy(dst, src) 把一个 Reader 的全部内容搬到一个 Writer 里，比如把文件内容直接写进 HTTP 响应。',code:`r := strings.NewReader("你好，Reader\\n")
io.Copy(os.Stdout, r)

var buf bytes.Buffer
fmt.Fprintf(&buf, "订单 %d 已支付", 42)
fmt.Println(buf.String())`,explain:[{at:'r := strings.NewReader("你好，Reader\\n")',text:'把一个字符串包装成 io.Reader。'},{at:'io.Copy(os.Stdout, r)',text:'os.Stdout（屏幕输出）是一个 io.Writer，把 Reader 里的内容全部复制过去，就打印到了屏幕上。'},{at:'var buf bytes.Buffer',text:'内存里的缓冲区，它既是 Reader 也是 Writer。'},{at:'fmt.Fprintf(&buf, "订单 %d 已支付", 42)',text:'Fprintf 可以往任何 io.Writer 里按格式写入，这里写进了缓冲区。'},{at:'fmt.Println(buf.String())',text:'取出缓冲区里的内容，打印“订单 42 已支付”。'}]},
  {title:'读大文件：一行一行地读',body:'os.ReadFile 会把整个文件一次性读进内存，小文件很方便。但如果是一个 10GB 的日志文件，一次读进来，内存就爆了。\n正确的做法是用 bufio.Scanner 一行一行地读：每次只在内存里保留当前这一行，读完处理完就丢掉，再大的文件也只占很少的内存。\n要注意三点：\n一、打开文件后马上 defer f.Close()，确保函数结束时文件一定会被关闭；\n二、循环结束后要检查 sc.Err()，确认是读完了，而不是中途出错了；\n三、Scanner 默认一行最长 64KB，超长的行要先用 sc.Buffer 调大上限。',code:`func CountLines(path string) (int, error) {
    f, err := os.Open(path)
    if err != nil {
        return 0, err
    }
    defer f.Close()
    sc := bufio.NewScanner(f)
    n := 0
    for sc.Scan() {
        n++
    }
    return n, sc.Err()
}`,explain:[{at:'func CountLines(path string) (int, error) {',text:'统计一个文件有多少行。'},{at:'f, err := os.Open(path)',to:'return 0, err',text:'打开文件，失败就返回错误。'},{at:'defer f.Close()',text:'函数结束时自动关闭文件。'},{at:'sc := bufio.NewScanner(f)',text:'创建一个按行读取的扫描器，文件是 io.Reader，所以能直接传进去。'},{at:'n := 0',text:'行数计数器。'},{at:'for sc.Scan() {',to:'n++',text:'每次 Scan 读取一行，读到就返回 true，读完或出错返回 false。这里只计数，需要内容时用 sc.Text() 取出这一行。'},{at:'return n, sc.Err()',text:'返回行数，以及读取过程中是否出错。正常读到文件末尾时 sc.Err() 是 nil。'}]},
  {title:'encoding/json：结构体和 JSON 互转',body:'前后端之间、服务之间传数据，最常用的格式是 JSON。Go 用 encoding/json 包转换：\njson.Marshal(v)：把结构体转成 JSON（编码）；\njson.Unmarshal(data, &v)：把 JSON 解析到结构体里（解码），注意第二个参数要传指针。\n几条规则：\n一、只有导出的字段（首字母大写）才会被处理，小写字段会被直接忽略；\n二、用结构体标签指定 JSON 里的字段名：`json:"name"`；\n三、`json:"email,omitempty"`：这个字段是零值（空字符串、0、nil）时，输出里直接省略它；\n四、`json:"-"`：完全忽略这个字段，比如密码；\n五、解码到 any 或 map[string]any 时，JSON 里的数字默认会变成 float64，而不是 int，取出来用时要注意类型。',code:`type User struct {
    Name     string \`json:"name"\`
    Email    string \`json:"email,omitempty"\`
    Password string \`json:"-"\`
    age      int
}

b, _ := json.Marshal(User{Name: "Tom", Password: "123", age: 18})
fmt.Println(string(b))

var u User
err := json.Unmarshal([]byte(\`{"name":"Amy","email":"a@x.com"}\`), &u)`,explain:[{at:'type User struct {',text:'用户结构体。'},{at:'Name     string `json:"name"`',text:'JSON 里叫 name。'},{at:'Email    string `json:"email,omitempty"`',text:'JSON 里叫 email，值为空字符串时省略。'},{at:'Password string `json:"-"`',text:'密码完全不参与 JSON 转换，避免泄露。'},{at:'age      int',text:'小写字段，JSON 包看不到它，也会被忽略。'},{at:'b, _ := json.Marshal(User{Name: "Tom", Password: "123", age: 18})',to:'fmt.Println(string(b))',text:'编码结果只有 {"name":"Tom"}：Email 为空被省略，Password 被忽略，age 是小写字段。'},{at:'var u User',text:'准备一个空结构体接收解码结果。'},{at:'err := json.Unmarshal([]byte(`{"name":"Amy","email":"a@x.com"}`), &u)',text:'把 JSON 解析进 u，要传 &u（指针）才能修改它。之后 u.Name 是 Amy，u.Email 是 a@x.com。'}]},
  {title:'动手试试：数行数和 JSON',body:'我们先写一个 3 行的小文件，用 CountLines 数一数它有几行；再试试 JSON 编码时哪些字段会出现，以及解码到 map 时数字是什么类型。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','给 User 加一个字段 Tags []string `json:"tags,omitempty"`，在 Marshal 时传入 Tags: []string{"go"}，看看输出有什么变化。'],expect:'行数： 3 <nil>\n{"name":"Tom"}\n18 float64'},code:`package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
)

type User struct {
    Name  string \`json:"name"\`
    Email string \`json:"email,omitempty"\`
    age   int
}

func CountLines(path string) (int, error) {
    f, err := os.Open(path)
    if err != nil {
        return 0, err
    }
    defer f.Close()
    sc := bufio.NewScanner(f)
    n := 0
    for sc.Scan() {
        n++
    }
    return n, sc.Err()
}

func main() {
    os.WriteFile("demo.txt", []byte("第一行\\n第二行\\n第三行\\n"), 0644)
    n, err := CountLines("demo.txt")
    fmt.Println("行数：", n, err)
    os.Remove("demo.txt")

    b, _ := json.Marshal(User{Name: "Tom", age: 18})
    fmt.Println(string(b))

    var m map[string]any
    json.Unmarshal([]byte(\`{"age": 18}\`), &m)
    fmt.Printf("%v %T\\n", m["age"], m["age"])
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"os"',text:'导入 bufio、encoding/json、fmt、os。'},{at:'type User struct {',to:'age   int',text:'和上一张卡片类似的用户结构体。'},{at:'func CountLines(path string) (int, error) {',to:'return n, sc.Err()',text:'前面讲过的按行计数函数。'},{at:'func main() {',text:'程序入口。'},{at:'os.WriteFile("demo.txt", []byte("第一行\\n第二行\\n第三行\\n"), 0644)',text:'先写一个 3 行的测试文件。0644 是文件权限：自己可读写，其他人只读。'},{at:'n, err := CountLines("demo.txt")',to:'fmt.Println("行数：", n, err)',text:'数出 3 行，错误为 nil。'},{at:'os.Remove("demo.txt")',text:'删掉测试文件。'},{at:'b, _ := json.Marshal(User{Name: "Tom", age: 18})',to:'fmt.Println(string(b))',text:'Email 为空被省略，age 是小写字段被忽略，只剩 name。'},{at:'var m map[string]any',to:'json.Unmarshal([]byte(`{"age": 18}`), &m)',text:'把 JSON 解码到一个 map 里。'},{at:'fmt.Printf("%v %T\\n", m["age"], m["age"])',text:'%T 打印值的类型：18 变成了 float64，而不是 int。'}]}
 ],quiz:[
  {id:'go-stdlib-1',q:'strings.Join([]string{"a","b","c"}, "-") 的结果是？',options:['"abc"','"a-b-c"','"-a-b-c"','"a-b-c-"'],why:['分隔符会插入到元素之间。','','分隔符只在元素之间，不会出现在开头。','分隔符只在元素之间，不会出现在末尾。'],answer:1,explain:'Join 用分隔符把切片里的字符串连起来；反过来按分隔符切开用 strings.Split。'},
  {id:'go-stdlib-2',type:'judge',q:'strconv.Atoi("12a") 会返回一个 error，而不是 panic。',answer:true,explain:'strconv 的解析函数在格式不对时返回 error，调用方需要检查。'},
  {id:'go-stdlib-3',q:'Go 中把时间格式化成“2025-03-08”这种样子，格式字符串应该写成？',options:['"yyyy-MM-dd"','"2006-01-02"','"%Y-%m-%d"','"YYYY-MM-DD"'],why:['这是 Java 等语言的格式写法，Go 不识别这些字母。','','这是 C 和 Python strftime 的写法。','Go 不使用字母占位符。'],answer:1,explain:'Go 用固定的参考时间 Mon Jan 2 15:04:05 MST 2006 当模板，年写 2006、月写 01、日写 02。'},
  {id:'go-stdlib-4',type:'fill',q:'统计一段代码的耗时：start := time.Now(); ...; 耗时 = time.____(start)。',accepted:['Since','time.Since'],explain:'time.Since(start) 等价于 time.Now().Sub(start)，返回 time.Duration。'},
  {id:'go-stdlib-5',type:'multi',q:'下面哪些类型实现了 io.Reader？（多选）',options:['*os.File','*bytes.Buffer','*strings.Reader','*bufio.Reader'],why:['','','',''],answers:[0,1,2,3],explain:'文件、bytes.Buffer、strings.Reader、bufio.Reader、网络连接、HTTP 请求体都实现了 Read 方法，所以都是 io.Reader，可以互相组合。'},
  {id:'go-stdlib-6',q:'读取一个 10GB 的日志文件并逐行处理，推荐？',options:['os.ReadFile 一次读完再按行切分','用 bufio.Scanner 逐行读取','把整个文件转成 string 再处理','开 10 万个 goroutine 同时读'],why:['一次性读完会占用 10GB 内存。','','转成 string 同样要一次性读入全部内容。','同一个文件的读取是顺序的，开大量 goroutine 只会带来调度开销和竞争。'],answer:1,explain:'Scanner 逐行读，内存占用很小；超长行要用 Buffer 方法调大缓冲区上限。'},
  {id:'go-stdlib-7',q:'下面结构体 json.Marshal 后会输出哪些字段？',code:'type User struct {\n    Name  string `json:"name"`\n    Email string `json:"email,omitempty"`\n    age   int\n}\njson.Marshal(User{Name: "Tom", age: 18})',options:['name、email、age','只有 name','name 和 age','name 和 email'],why:['age 是未导出字段，不会被编码；空的 Email 带 omitempty 也会被省略。','','age 是小写开头的未导出字段，json 包无法访问。','Email 为空且带 omitempty，会被省略。'],answer:1,explain:'结果是 {"name":"Tom"}。'},
  {id:'go-stdlib-8',type:'judge',q:'用 json.Unmarshal 解码到 map[string]any 时，JSON 里的数字默认会变成 int。',answer:false,explain:'默认会变成 float64；需要保留精确数字可以用 json.Decoder 的 UseNumber。'},
  {id:'go-stdlib-9',type:'fill',q:'让某个结构体字段在 JSON 编码时被完全忽略，标签写成 `json:"____"`。',accepted:['-'],explain:'json:"-" 表示忽略该字段；json:"name,omitempty" 表示值为空时省略。'},
  {id:'go-stdlib-10',type:'code',q:'写一个函数 CountLines(path string) (int, error)，统计文件的行数，记得关闭文件、检查错误。',reference:'func CountLines(path string) (int, error) {\n    f, err := os.Open(path)\n    if err != nil {\n        return 0, err\n    }\n    defer f.Close()\n    n := 0\n    sc := bufio.NewScanner(f)\n    for sc.Scan() {\n        n++\n    }\n    return n, sc.Err()\n}',points:['os.Open 并检查错误','defer f.Close()','bufio.Scanner 逐行计数','最后返回 sc.Err()'],explain:'容易漏掉的是最后的 sc.Err()：扫描过程中出错，Scan 会返回 false，要通过 Err 拿到原因。'},
 ]},
 {id:'go-flow',title:'流程控制：switch、defer 与 panic',summary:'switch 的细节，defer 的顺序和坑，panic 与 recover',lessons:[
  {title:'这一关学什么：让程序“拐弯”和“收尾”',body:'程序默认从上往下一行行执行。流程控制就是改变这个顺序：根据条件走不同的路（switch），在函数结束时自动做收尾工作（defer），以及遇到严重错误时紧急停下、必要时再把它接住（panic 和 recover）。\n这三样在 Go 里都有一些和其他语言不一样的规矩，面试也很爱考。这一关一个个讲清楚，最后还会带你在自己电脑上跑两段小程序，亲眼看看它们的执行顺序。'},
  {title:'switch：从多条路里选一条',body:'switch 用来“根据一个值，选一段代码执行”，比一长串 if-else 更清楚。\nGo 的 switch 有一个和 C、Java 不同的地方：命中一个 case，执行完就自动结束，不会继续往下“掉”到下一个 case，所以不用写 break。\n一个 case 后面还可以写多个值，用逗号隔开，命中其中任意一个都算。',code:`day := "周六"
switch day {
case "周六", "周日":
    fmt.Println("周末，休息")
case "周五":
    fmt.Println("明天就放假")
default:
    fmt.Println("工作日，加油")
}`,explain:[{at:'day := "周六"',text:':= 是“声明一个变量并赋值”，这里 day 的值是字符串“周六”。'},{at:'switch day {',text:'拿 day 的值，依次和下面每个 case 比较。'},{at:'case "周六", "周日":',text:'一个 case 可以写多个值：day 等于“周六”或“周日”都会进到这里。'},{at:'fmt.Println("周末，休息")',text:'命中后执行这一行。执行完 switch 就结束了，不会接着执行下面“明天就放假”那一行，所以不需要 break。'},{at:'case "周五":',to:'fmt.Println("明天就放假")',text:'另一个分支：day 是“周五”时执行。'},{at:'default:',to:'fmt.Println("工作日，加油")',text:'default 是“以上都不是”时走的分支，相当于 if-else 最后的 else，可以不写。'}]},
  {title:'不写表达式的 switch：一串条件判断',body:'switch 后面可以什么都不写。这时它相当于 switch true：从上往下找第一个“条件成立”的 case 执行。\n这种写法很适合代替一长串 if / else if，比如按分数给等级。注意顺序很重要：从上往下只会命中第一个成立的分支。',code:`score := 85
switch {
case score >= 90:
    fmt.Println("优秀")
case score >= 60:
    fmt.Println("及格")
default:
    fmt.Println("不及格")
}`,explain:[{at:'score := 85',text:'准备一个分数 85。'},{at:'switch {',text:'switch 后面不写任何值，相当于 switch true，下面每个 case 写的都是一个条件。'},{at:'case score >= 90:',to:'fmt.Println("优秀")',text:'85 不满足 >= 90，跳过这个分支。'},{at:'case score >= 60:',to:'fmt.Println("及格")',text:'85 >= 60 成立，打印“及格”，然后整个 switch 结束。'},{at:'default:',to:'fmt.Println("不及格")',text:'前面的条件都不成立时才会走这里。'}]},
  {title:'fallthrough：硬要“掉”到下一个分支',body:'如果真想在命中一个 case 后接着执行下一个 case，要显式写 fallthrough。\n它有两个容易记错的特点：\n一、它不会重新判断下一个 case 的条件，直接执行下一个分支的代码；\n二、只往下走一个分支，想继续走还得再写一个 fallthrough。\n实际项目里很少用到它，面试会考它的这两个特点。下面的代码会打印“大于 0”和“大于 10”两行，虽然 5 并不大于 10。',code:`n := 5
switch {
case n > 0:
    fmt.Println("大于 0")
    fallthrough
case n > 10:
    fmt.Println("大于 10")
case n > 100:
    fmt.Println("大于 100")
}`,explain:[{at:'n := 5',text:'n 的值是 5。'},{at:'switch {',text:'不写表达式的 switch，找第一个成立的条件。'},{at:'case n > 0:',to:'fmt.Println("大于 0")',text:'5 > 0 成立，打印“大于 0”。'},{at:'fallthrough',text:'强制进入下一个分支，而且不判断 n > 10 是否成立。'},{at:'case n > 10:',to:'fmt.Println("大于 10")',text:'因为上面的 fallthrough，这里也会执行，打印“大于 10”——虽然 5 并不大于 10。'},{at:'case n > 100:',to:'fmt.Println("大于 100")',text:'上一个分支没有再写 fallthrough，所以到此为止，这一行不会执行。'}]},
  {title:'类型 switch：看看接口里装的是什么',body:'Go 里的空接口 any（也写作 interface{}）可以装任何类型的值。想知道里面到底装的是什么类型，就用类型 switch：写成 x.(type)，每个 case 写一个类型。\n在命中的分支里，变量 v 已经是那个具体类型，可以直接当这个类型来用，比如在 int 分支里可以做加法。',code:`var x any = 41
switch v := x.(type) {
case nil:
    fmt.Println("里面是空的")
case int:
    fmt.Println("是整数，加一后：", v+1)
case string:
    fmt.Println("是字符串：", v)
default:
    fmt.Printf("其他类型：%T\\n", v)
}`,explain:[{at:'var x any = 41',text:'声明一个 any 类型的变量 x，里面装了整数 41。any 可以装任何值。'},{at:'switch v := x.(type) {',text:'类型 switch：判断 x 里装的是什么类型，同时把里面的值取出来放进 v。x.(type) 只能写在 switch 里。'},{at:'case nil:',to:'fmt.Println("里面是空的")',text:'x 里什么都没装时走这里。'},{at:'case int:',to:'fmt.Println("是整数，加一后：", v+1)',text:'x 装的是 int，就走这里。此时 v 就是 int 类型，可以直接 v+1，打印 42。'},{at:'case string:',to:'fmt.Println("是字符串：", v)',text:'x 装的是字符串时走这里，v 是 string 类型。'},{at:'default:',to:'fmt.Printf("其他类型：%T\\n", v)',text:'其他类型都走这里。%T 会打印出值的类型名，比如 float64。'}]},
  {title:'defer：先登记，函数结束时再做',body:'defer 的意思是“推迟”：在一个函数调用前面写 defer，这个调用不会马上执行，而是先登记下来，等当前函数快要结束（返回）时才执行。\n它最常用来做收尾工作：打开文件后马上写 defer 关闭，加锁后马上写 defer 解锁。这样不管函数中间从哪里 return、有多少个分支，收尾都不会忘。\n打个比方：进门时就在门口贴一张便签“走的时候关灯”，不管你从哪个门出去，都会看到它。',code:`func readConfig(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()

    data, err := io.ReadAll(f)
    if err != nil {
        return err
    }
    fmt.Println(string(data))
    return nil
}`,explain:[{at:'func readConfig(path string) error {',text:'定义一个读取配置文件的函数，参数是文件路径，返回一个 error（没出错时返回 nil）。'},{at:'f, err := os.Open(path)',text:'打开文件。Go 的习惯是同时返回结果和错误。'},{at:'if err != nil {',to:'return err',text:'打开失败（比如文件不存在）就直接把错误返回。这时文件没打开，也就不用关。'},{at:'defer f.Close()',text:'关键一行：文件打开成功后，马上登记“函数结束时关闭文件”。后面不管从哪里 return，文件都会被关掉。'},{at:'data, err := io.ReadAll(f)',text:'把文件内容全部读出来。'},{at:'if err != nil {',to:'return err',text:'读取失败就返回错误。这里提前 return 了，但上面登记的 f.Close() 依然会执行。'},{at:'fmt.Println(string(data))',text:'把读到的内容转成字符串打印出来。'},{at:'return nil',text:'正常结束。函数返回前，执行登记过的 f.Close()。'}]},
  {title:'多个 defer：像叠盘子，后放的先拿',body:'一个函数里可以写多个 defer。它们会按“后进先出”的顺序执行：最后登记的最先执行，就像叠盘子，最后放上去的盘子最先被拿走。\n这个顺序是有道理的：通常先打开的资源被后打开的资源依赖，所以要倒着关。\n下面的循环登记了 3 个 defer，函数结束时打印的是 321，而不是 123。',code:`func main() {
    for i := 1; i <= 3; i++ {
        defer fmt.Print(i)
    }
    fmt.Print("开始收尾：")
}
// 输出：开始收尾：321`,explain:[{at:'func main() {',text:'程序的入口函数。'},{at:'for i := 1; i <= 3; i++ {',text:'循环 3 次，i 依次是 1、2、3。'},{at:'defer fmt.Print(i)',text:'每次循环登记一个 defer，并且在登记时就记下当时 i 的值（1、2、3）。它们都要等 main 结束才执行。'},{at:'fmt.Print("开始收尾：")',text:'这行最先打印。然后 main 结束，三个 defer 按后进先出执行：先打印 3，再 2，最后 1。'}]},
  {title:'坑一：参数在登记时就算好了',body:'defer 后面函数的参数，是在写 defer 的那一刻就计算好的，之后变量再变也没用。\n如果想在函数结束时拿到变量的最新值，要用一个匿名函数（闭包）包起来：闭包里的代码要等真正执行时才去读变量。\n最典型的例子是统计函数耗时：写成 defer log.Print(time.Since(start)) 会在开头就算好耗时（几乎是 0），必须写成 defer func(){ log.Print(time.Since(start)) }()。',code:`func work() {
    start := time.Now()
    defer log.Print("错误写法：", time.Since(start))
    defer func() {
        log.Print("正确写法：", time.Since(start))
    }()
    time.Sleep(2 * time.Second)
}`,explain:[{at:'func work() {',text:'一个假装在干活的函数，我们想打印它花了多长时间。'},{at:'start := time.Now()',text:'记下开始时间。'},{at:'defer log.Print("错误写法：", time.Since(start))',text:'错误写法：time.Since(start) 是参数，在登记 defer 的这一刻就算好了，结果几乎是 0 秒。'},{at:'defer func() {',to:'}()',text:'正确写法：把要做的事放进一个匿名函数，defer 登记的是“调用这个函数”。函数里的 time.Since(start) 要等真正执行时才计算，结果约 2 秒。末尾的 () 表示调用它。'},{at:'time.Sleep(2 * time.Second)',text:'假装干了 2 秒的活。'}]},
  {title:'坑二：循环里的 defer 要等整个函数结束',body:'defer 绑定的是“函数结束”，而不是“这一轮循环结束”。\n如果在一个循环里打开 10 万个文件，每次都写 defer f.Close()，这些文件要等整个函数结束才会一起关，中途就会把系统允许打开的文件数用光而报错。同样，在循环里加锁后写 defer mu.Unlock()，锁也不会在本轮结束时释放，下一轮再加锁就会把自己卡死。\n正确做法：把“打开-处理-关闭”放进一个单独的小函数，每处理一个文件就调用一次，defer 在小函数结束时就执行了。',code:`func processAll(paths []string) error {
    for _, p := range paths {
        if err := processOne(p); err != nil {
            return err
        }
    }
    return nil
}

func processOne(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    return handle(f)
}`,explain:[{at:'func processAll(paths []string) error {',text:'处理一批文件，paths 是所有文件路径组成的切片（可以理解成可变长的数组）。'},{at:'for _, p := range paths {',text:'逐个取出路径 p。下划线 _ 表示不需要的下标。'},{at:'if err := processOne(p); err != nil {',to:'return err',text:'每个文件交给 processOne 处理，出错就返回。'},{at:'return nil',text:'全部处理完，返回没有错误。'},{at:'func processOne(path string) error {',text:'只处理一个文件的小函数。'},{at:'f, err := os.Open(path)',to:'return err',text:'打开文件，失败就返回错误。'},{at:'defer f.Close()',text:'defer 写在小函数里，processOne 一结束这个文件就关掉了，同一时刻最多只打开一个文件。'},{at:'return handle(f)',text:'真正处理文件内容（handle 代表你的处理逻辑）。返回前执行 f.Close()。'}]},
  {title:'坑三：defer 能改掉函数的返回值',body:'Go 的函数可以给返回值起名字，叫“具名返回值”，比如 func f() (n int)。\n这时 return 1 实际分两步：先把 1 赋给 n，再执行 defer，最后才真正返回 n。所以如果 defer 里的闭包修改了 n，函数的返回值就跟着变了。\n下面的函数写的是 return 1，实际返回的却是 2。这个特性常被用来在 defer 里统一处理错误，但读代码时很容易看漏。',code:`func result() (n int) {
    defer func() {
        n++
    }()
    return 1
}
// result() 返回 2`,explain:[{at:'func result() (n int) {',text:'返回值起了名字 n，它在函数开始时就存在，初始值是 0。'},{at:'defer func() {',to:'}()',text:'登记一个闭包，函数结束前把 n 加 1。'},{at:'return 1',text:'这一步先把 1 赋给 n，接着执行 defer 让 n 变成 2，最后返回的是 2。'}]},
  {title:'动手试试：亲眼看看 defer 的执行顺序',body:'我们写一个小程序，把“后进先出”和“参数登记时就算好”这两条规则一起跑一遍。先自己猜一猜会打印什么，再运行看看对不对。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 x = 2 这一行删掉再运行一次，看看“闭包里的 x”变成了多少，想想为什么。'],expect:'main 函数结束\n闭包里的 x： 2\n登记时的 x： 1\n循环里的 defer： 3\n循环里的 defer： 2\n循环里的 defer： 1'},code:`package main

import "fmt"

func main() {
    for i := 1; i <= 3; i++ {
        defer fmt.Println("循环里的 defer：", i)
    }
    x := 1
    defer fmt.Println("登记时的 x：", x)
    defer func() { fmt.Println("闭包里的 x：", x) }()
    x = 2
    fmt.Println("main 函数结束")
}`,explain:[{at:'package main',text:'每个能直接运行的 Go 程序都属于 main 包。'},{at:'import "fmt"',text:'导入标准库的 fmt 包，用来打印。'},{at:'func main() {',text:'程序从 main 函数开始执行。'},{at:'for i := 1; i <= 3; i++ {',to:'defer fmt.Println("循环里的 defer：", i)',text:'登记 3 个 defer，分别记住 i = 1、2、3。'},{at:'x := 1',text:'x 一开始是 1。'},{at:'defer fmt.Println("登记时的 x：", x)',text:'参数 x 在这一刻就算好了，是 1，之后 x 再变也没用。'},{at:'defer func() { fmt.Println("闭包里的 x：", x) }()',text:'闭包要等执行时才读 x，那时 x 已经是 2。'},{at:'x = 2',text:'把 x 改成 2。'},{at:'fmt.Println("main 函数结束")',text:'这一行最先打印。之后 main 结束，defer 按“最后登记的先执行”倒着执行：闭包 → 登记时的 x → 循环里的 3、2、1。'}]},
  {title:'defer 什么时候会执行，什么时候不会',body:'会执行的情况：\n一、函数正常 return；\n二、函数里发生了 panic（程序崩溃前会沿着调用链执行每一层的 defer）；\n三、调用了 runtime.Goexit 结束当前 goroutine。\n不会执行的情况：调用 os.Exit 直接退出整个程序。它不经过“函数返回”这一步，已登记的 defer 统统不会执行。要小心 log.Fatal，它内部就是先打印再调用 os.Exit，所以用了 log.Fatal 后，前面 defer 的关闭文件、写日志等收尾工作都不会做。'},
  {title:'panic：程序遇到了无法继续的严重错误',body:'panic 可以理解成“紧急停车”：当前函数立刻停止往下执行，然后一层层往回退，每退一层就执行这一层登记的 defer；如果一直没人处理，整个程序就会崩溃退出，并打印出错位置。\n有些 panic 是 Go 自动触发的，比如除以 0、数组下标越界、访问 nil 的 map 写入；也可以自己调用 panic("原因") 触发。\n日常业务里的“出错”，比如用户不存在、参数不对，应该返回 error 让调用方处理，而不是 panic。panic 只用于真正“不该发生”的情况。'},
  {title:'recover：在 defer 里把 panic 接住',body:'recover 能接住正在发生的 panic，让程序不崩溃。但它有严格的使用条件：\n一、必须写在 defer 的函数里，而且要在这个函数里直接调用。如果 defer 的函数又调用了另一个函数，在那个函数里才调用 recover，就接不住；\n二、只能接住同一个 goroutine 里的 panic。\n接住之后，程序不会回到 panic 那一行继续往下执行，而是直接从包含这个 defer 的函数返回。\n下面是 Web 服务里常见的写法：接住 panic，记录日志和调用栈，避免一个请求的错误拖垮整个服务。',code:`func handle(w http.ResponseWriter, r *http.Request) {
    defer func() {
        if v := recover(); v != nil {
            log.Printf("panic: %v\\n%s", v, debug.Stack())
            http.Error(w, "服务器内部错误", 500)
        }
    }()
    doWork(r)
}`,explain:[{at:'func handle(w http.ResponseWriter, r *http.Request) {',text:'一个处理网页请求的函数：w 用来写回响应，r 是收到的请求。'},{at:'defer func() {',text:'在函数一开始登记一个 defer 函数，专门负责“兜底”。'},{at:'if v := recover(); v != nil {',text:'在 defer 函数里直接调用 recover。没有 panic 时它返回 nil；有 panic 时返回 panic 的原因，同时阻止程序崩溃。'},{at:'log.Printf("panic: %v\\n%s", v, debug.Stack())',text:'记录 panic 原因和调用栈（debug.Stack 返回出错时的函数调用路径），方便之后排查。'},{at:'http.Error(w, "服务器内部错误", 500)',text:'给用户返回 500 错误，而不是让整个服务崩掉。'},{at:'doWork(r)',text:'真正干活的代码。这里面如果发生 panic，会被上面的 defer 接住，然后 handle 直接返回。'}]},
  {title:'动手试试：用 recover 接住除以 0',body:'整数除以 0 会触发 panic。我们写一个“安全除法”函数，用 recover 把 panic 接住，转换成普通的 error 返回，程序就能继续运行。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 safeDivide 里的整个 defer 删掉再运行一次，看看程序崩溃时打印了什么，以及“程序还在继续运行”还能不能打印出来。'],expect:'5 <nil>\n0 出错了：runtime error: integer divide by zero\n程序还在继续运行'},code:`package main

import "fmt"

func safeDivide(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("出错了：%v", r)
        }
    }()
    result = a / b
    return result, nil
}

func main() {
    fmt.Println(safeDivide(10, 2))
    fmt.Println(safeDivide(1, 0))
    fmt.Println("程序还在继续运行")
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序属于 main 包，导入 fmt 用来打印和创建错误。'},{at:'func safeDivide(a, b int) (result int, err error) {',text:'计算 a ÷ b。用了具名返回值 result 和 err，这样 defer 里可以修改 err。'},{at:'defer func() {',text:'登记兜底函数。'},{at:'if r := recover(); r != nil {',text:'发生 panic 时，recover 返回 panic 的原因并阻止崩溃。'},{at:'err = fmt.Errorf("出错了：%v", r)',text:'把 panic 原因包装成一个普通错误，赋给具名返回值 err，调用方就能像处理普通错误一样处理它。'},{at:'result = a / b',text:'b 是 0 时这里触发 panic，下面的 return 不会执行，直接跳去执行 defer。此时 result 还是默认值 0。'},{at:'return result, nil',text:'没出错时正常返回结果和 nil。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println(safeDivide(10, 2))',text:'10 ÷ 2 = 5，没有错误，打印“5 <nil>”。'},{at:'fmt.Println(safeDivide(1, 0))',text:'除以 0 触发 panic，被接住后返回 0 和错误信息。'},{at:'fmt.Println("程序还在继续运行")',text:'程序没有崩溃，这一行照常打印。'}]},
  {title:'recover 接不住的两种情况',body:'第一种：在子 goroutine 里发生的 panic。goroutine 是 Go 里很轻量的“并发任务”，用 go 关键字启动。每个 goroutine 的 panic 只能由它自己的 defer 接住，主 goroutine 里写再多 recover 也没用，子 goroutine 一 panic 整个程序照样崩溃。所以启动 goroutine 时，要在它自己的函数开头写 defer recover。\n第二种：recover 没有被 defer 的函数“直接”调用。下面的代码里，defer 的是 helper，helper 里面又套了一层匿名函数才调用 recover，隔了一层，所以接不住，程序依然崩溃。',code:`func safe() {
    defer helper()
    panic("boom")
}

func helper() {
    func() { recover() }()
}`,explain:[{at:'func safe() {',text:'我们希望这个函数能接住自己的 panic。'},{at:'defer helper()',text:'登记 helper 在函数结束时执行。helper 本身是被 defer 直接调用的函数。'},{at:'panic("boom")',text:'触发 panic，开始执行 defer 的 helper。'},{at:'func helper() {',text:'如果在这里直接写 recover() 是能接住的。'},{at:'func() { recover() }()',text:'但这里 recover 写在 helper 里面又套的一个匿名函数中，不是被 defer 的函数直接调用，所以返回 nil，接不住，程序还是会崩溃。'}]},
  {title:'什么时候用 panic，什么时候用 error',body:'记住一个原则：能预料到的失败用 error，真正不该发生的才用 panic。\n用 error 的情况：文件不存在、网络超时、用户输入格式错误、数据库查不到记录。这些都是正常业务里会遇到的，调用方应该检查错误并处理。\n可以用 panic 的情况：程序启动时必需的配置缺失，没法继续运行；代码自身的逻辑错误，比如走进了“理论上不可能”的分支。\n另外，不要用 panic + recover 来代替正常的错误返回，那样代码难读，也容易漏掉错误。recover 主要用在服务的最外层做兜底，防止一个请求的错误拖垮整个服务。'}
 ],quiz:[
  {id:'go-flow-1',type:'judge',q:'Go 的 switch 每个 case 末尾都要写 break，否则会继续执行下一个 case。',answer:false,explain:'Go 的 case 命中后自动结束；想继续执行下一个分支才写 fallthrough。',interview:'q-1117fbfafaf16819'},
  {id:'go-flow-2',q:'关于 fallthrough，哪个说法正确？',options:['会重新判断下一个 case 的条件','无条件进入下一个分支','可以用在类型 switch 里','可以写在最后一个 case 中'],why:['fallthrough 不会判断下一个 case 的条件。','','类型 switch 中不允许使用 fallthrough。','最后一个分支后面没有分支可进入，写了会编译报错。'],answer:1,explain:'fallthrough 无条件进入下一个分支，不重新判断；类型 switch 和最后一个分支都不能用。',interview:'q-1117fbfafaf16819'},
  {id:'go-flow-3',q:'下面代码输出什么？',code:'for i := 1; i <= 3; i++ {\n    defer fmt.Print(i)\n}',options:['123','321','333','111'],why:['defer 是后进先出，最后注册的先执行。','','defer 的参数在注册时就求值，分别是 1、2、3，不会都是 3。','每次注册时的参数值不同，不会都是 1。'],answer:1,explain:'defer 后注册先执行，且参数在注册时就求值，所以依次打印 3、2、1。',interview:'q-45f3e26274ac8bf2'},
  {id:'go-flow-4',q:'下面函数返回什么？',code:'func f() (n int) {\n    defer func() { n++ }()\n    return 1\n}',options:['0','1','2','编译报错'],why:['return 1 已经把 n 设为 1，不会是零值。','return 1 之后 defer 闭包还会修改具名返回值。','','在 defer 中修改具名返回值是合法写法。'],answer:2,explain:'return 1 先把 n 设为 1，然后执行 defer，闭包把具名返回值 n 加到 2。',interview:'q-45f3e26274ac8bf2'},
  {id:'go-flow-5',type:'multi',q:'哪些情况下函数里的 defer 会执行？（多选）',options:['函数正常 return','发生 panic 时','调用 os.Exit(1)','调用 log.Fatal 之后'],why:['','','os.Exit 直接结束进程，不会执行 defer。','log.Fatal 打印后会调用 os.Exit(1)，同样不会执行 defer。'],answers:[0,1],explain:'正常返回、panic、runtime.Goexit 都会执行当前调用链上的 defer；os.Exit 和 log.Fatal 不会。',interview:'q-45f3e26274ac8bf2'},
  {id:'go-flow-6',q:'要依次处理 10 万个文件，正确使用 defer 关闭的方式是？',options:['for 循环里 Open 后直接 defer Close','每个文件放进单独函数并 defer Close','不关闭文件，等待 GC 回收','全部打开后再统一关闭'],why:['defer 要等整个函数结束才执行，循环中会累积打开 10 万个文件句柄。','','GC 不保证及时关闭文件，句柄很快就会耗尽。','同时打开 10 万个文件会超过系统的文件句柄上限。'],answer:1,explain:'defer 绑定函数作用域，在循环里 defer 要等整个函数结束才关闭，会耗尽文件句柄。',interview:'q-0b9e92fc15005e5d'},
  {id:'go-flow-7',q:'下面代码先打印什么？',code:'i := 1\ndefer fmt.Println(i)\ndefer func() { fmt.Println(i) }()\ni = 2',options:['先 1 后 2','先 2 后 1','两次都是 2','两次都是 1'],why:['defer 后进先出，后注册的闭包先执行。','','第一个 defer 的参数在注册时就保存了 1，不会变成 2。','闭包执行时读到的 i 已经是 2。'],answer:1,explain:'后注册的闭包先执行，执行时读到 i=2；第一个 defer 的参数在注册时就保存了 1。',interview:'q-fd43307d59e4125a'},
  {id:'go-flow-8',type:'judge',q:'在主 goroutine 里 defer recover()，可以接住子 goroutine 里发生的 panic。',answer:false,explain:'recover 只对当前 goroutine 有效。子 goroutine 未恢复的 panic 会让整个程序崩溃，所以子 goroutine 要自己 recover。',interview:'q-3ca3e2c2a65b7c3a'},
  {id:'go-flow-9',type:'judge',q:'recover 成功后，程序会回到 panic 发生的那一行继续往下执行。',answer:false,explain:'恢复后，包含该 defer 的函数直接返回，不会回到 panic 的位置。',interview:'q-3ca3e2c2a65b7c3a'},
  {id:'go-flow-10',type:'short',q:'defer 有哪些常见的坑？',reference:'一是参数提前求值：defer 注册时就计算参数，比如 defer log.Print(time.Since(start)) 会立刻算耗时，应放进闭包；二是闭包读取的是退出时的变量值；三是在大循环里 defer，资源要等函数结束才释放；四是忽略 Close 返回的错误；还要先检查 Open 的错误再 defer Close；os.Exit 不会执行 defer。',points:['参数注册时求值','闭包读退出时的值','循环里 defer 资源累积','先判错再 defer Close'],explain:'能举出两三个并说明正确写法即可。',interview:'q-fd43307d59e4125a'},
  {id:'go-flow-11',q:'switch 不写表达式时，相当于？',options:['等价于 switch 0','等价于 switch true','会导致编译报错','等价于 switch nil'],why:['不写表达式不等于和 0 比较。','','这是合法且常用的写法。','不写表达式不等于和 nil 比较。'],answer:1,explain:'无表达式的 switch 等价于 switch true，可以在 case 里写条件，常用来代替一长串 if-else。',interview:'q-1117fbfafaf16819'},
  {id:'go-flow-12',q:'下面代码中 recover 能接住 panic 吗？',code:'func safe() {\n    defer helper()\n    panic("boom")\n}\nfunc helper() {\n    func() { recover() }()\n}',options:['能，正常接住这次 panic','不能，recover 位置不对','这段代码会编译报错','会把 panic 接住两次'],why:['recover 被套在另一层函数里调用，不在 defer 函数中直接调用，会返回 nil。','','代码合法，只是 recover 不起作用。','一个 panic 只能被恢复一次。'],answer:1,explain:'recover 只有在被 defer 的那个函数里直接调用才有效；再套一层函数调用就失效了。',interview:'q-3ca3e2c2a65b7c3a'},
  {id:'go-flow-13',type:'judge',q:'在循环里拿锁后写 defer mu.Unlock()，锁会在本轮循环结束时释放。',answer:false,explain:'defer 绑定的是函数，不是循环；锁要等整个函数返回才释放。循环里应直接 Unlock，或把循环体放进单独函数。',interview:'q-fd43307d59e4125a'},
  {id:'go-flow-14',type:'fill',q:'要在函数退出时打印准确的总耗时，应写成 defer func(){ log.Print(time.____(start)) }()，放在闭包里才不会提前求值。',accepted:['Since','time.Since'],explain:'直接写 defer log.Print(time.Since(start)) 会在注册时就算好耗时（几乎为 0）。',interview:'q-fd43307d59e4125a'},
 ]},
 {id:'go-generics',title:'泛型与反射',summary:'类型参数、约束、方法集，以及什么时候用反射',lessons:[
  {title:'这一关学什么：一份代码，适用多种类型',body:'写程序时经常遇到“逻辑完全一样，只是数据类型不同”的情况，比如求两个数的最大值，int 要一份、float64 要一份、string 又要一份。\n泛型就是解决这个问题的：写一份代码，用一个“类型占位符”代替具体类型，用的时候再填上真正的类型。\n这一关先讲泛型怎么写、怎么限制类型，再讲标准库里现成的泛型工具，然后讲另一种“在运行时查看类型”的技术——反射，最后讲接口里常考的方法集。'},
  {title:'没有泛型时有多麻烦',body:'Go 1.18 之前没有泛型。想写一个通用的“求最大值”，只有两条路：\n一、每种类型复制一份函数：MaxInt、MaxFloat、MaxString……逻辑一模一样，改一处要改好几处；\n二、参数用 any（可以装任何值），函数里再用类型断言判断到底是什么类型。这样写很啰嗦，而且传错类型要到运行时才发现，编译器帮不上忙。\n泛型让我们只写一份，而且类型检查仍然在编译时完成：传错类型，代码直接编译不通过。',code:`func MaxInt(a, b int) int {
    if a > b {
        return a
    }
    return b
}

func MaxFloat(a, b float64) float64 {
    if a > b {
        return a
    }
    return b
}`,explain:[{at:'func MaxInt(a, b int) int {',to:'return b',text:'整数版本：a 大就返回 a，否则返回 b。'},{at:'func MaxFloat(a, b float64) float64 {',to:'return b',text:'小数版本：逻辑和上面完全一样，只是类型从 int 换成了 float64。每多一种类型就要再复制一份，这正是泛型要解决的问题。'}]},
  {title:'第一个泛型函数：类型参数',body:'泛型函数在函数名后面多了一对方括号，里面声明“类型参数”。下面的 [T cmp.Ordered] 意思是：T 是一个类型占位符，它可以是任何“能比较大小”的类型。\n调用时通常不用写出 T 是什么，编译器会根据你传的参数自动推断：传 3 和 5，T 就是 int；传两个字符串，T 就是 string。\n类型参数这个功能从 Go 1.18 开始提供。',code:`func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

Max(3, 5)       // T 推断为 int，结果 5
Max("go", "ai") // T 推断为 string，结果 "go"`,explain:[{at:'func Max[T cmp.Ordered](a, b T) T {',text:'方括号里声明类型参数 T，cmp.Ordered 是它的“约束”，表示 T 必须能用 > < 比较大小。参数 a、b 和返回值都是 T 类型。'},{at:'if a > b {',to:'return a',text:'因为约束保证了 T 能比较大小，这里才能写 a > b。如果约束写成 any，这一行会编译报错。'},{at:'return b',text:'否则返回 b。'},{at:'Max(3, 5)',text:'传两个整数，编译器推断 T 是 int，返回 5。'},{at:'Max("go", "ai")',text:'传两个字符串，T 是 string。字符串按字母顺序比较，"go" 比 "ai" 大，返回 "go"。'}]},
  {title:'约束：规定 T 能做什么',body:'方括号里类型参数后面跟的叫“约束”，它规定 T 可以是哪些类型，从而决定函数里能对 T 做哪些操作。约束本身就是一个接口。常用的有：\nany：任何类型都行，但能做的操作最少，不能比较大小，也不能用 == 比较；\ncomparable：能用 == 和 != 比较的类型。想把 T 当 map 的 key，约束至少要是 comparable，因为 map 要靠 == 找 key；\ncmp.Ordered：能比较大小的类型，比如整数、小数、字符串。\n也可以自己写约束，列出允许的类型，用竖线 | 隔开。',code:`type Number interface {
    ~int | ~int64 | ~float64
}

func Sum[T Number](xs []T) T {
    var total T
    for _, x := range xs {
        total += x
    }
    return total
}`,explain:[{at:'type Number interface {',text:'自定义一个约束 Number。它看起来像接口，里面列的是允许的类型。'},{at:'~int | ~int64 | ~float64',text:'允许 int、int64、float64 这三类。~ 读作“底层类型是”：~int 表示底层类型是 int 的类型也算，比如自己定义的 type Age int。'},{at:'func Sum[T Number](xs []T) T {',text:'求和函数：T 必须满足 Number 约束，参数是 T 类型的切片。'},{at:'var total T',text:'声明一个 T 类型的变量，初始值是这个类型的零值（数字都是 0）。'},{at:'for _, x := range xs {',to:'total += x',text:'逐个累加。因为约束里都是数字类型，所以能用 +=。'},{at:'return total',text:'返回总和。'}]},
  {title:'~ 波浪号：自定义类型也能用',body:'Go 里可以基于已有类型定义新类型，比如 type Age int、type Celsius float64。它们的“底层类型”分别是 int 和 float64，但在 Go 看来已经是不同的类型了。\n如果约束里写的是 int（没有 ~），那 Age 不满足约束；写成 ~int，意思是“底层类型是 int 的都算”，Age 就可以用了。\n所以自己写数字类约束时，一般都加上 ~，让自定义类型也能直接使用泛型函数。',code:`type Age int

ages := []Age{18, 20, 25}
fmt.Println(Sum(ages)) // 63`,explain:[{at:'type Age int',text:'定义一个新类型 Age，它的底层类型是 int。'},{at:'ages := []Age{18, 20, 25}',text:'一组 Age 类型的值。'},{at:'fmt.Println(Sum(ages))',text:'因为 Number 约束里写的是 ~int，Age 也满足，所以可以直接求和，结果 63。如果约束写的是 int，这一行会编译报错。'}]},
  {title:'泛型类型：带类型参数的结构体',body:'不只是函数，结构体也可以带类型参数。比如“栈”这种数据结构（后放进去的先拿出来），里面装 int 还是装 string，逻辑都一样，就很适合写成泛型类型。\n给泛型类型写方法时，接收者要写成 Stack[T]。注意一个限制：方法不能再声明自己额外的类型参数，只能用类型本身的 T。',code:`type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}`,explain:[{at:'type Stack[T any] struct {',text:'定义泛型结构体 Stack，T 可以是任何类型。'},{at:'items []T',text:'用一个 T 类型的切片存放元素。'},{at:'func (s *Stack[T]) Push(v T) {',text:'入栈方法。接收者写成 *Stack[T]，表示这是 Stack 的方法，用指针是因为要修改栈的内容。'},{at:'s.items = append(s.items, v)',text:'把新元素追加到切片末尾。'},{at:'func (s *Stack[T]) Pop() (T, bool) {',text:'出栈方法：返回栈顶元素，以及“是否成功”。'},{at:'var zero T',text:'准备一个 T 类型的零值，栈为空时返回它。'},{at:'if len(s.items) == 0 {',to:'return zero, false',text:'栈是空的，就返回零值和 false。'},{at:'v := s.items[len(s.items)-1]',text:'取出最后一个元素，也就是栈顶。'},{at:'s.items = s.items[:len(s.items)-1]',text:'把切片缩短一位，相当于删掉栈顶。'},{at:'return v, true',text:'返回取出的元素和 true。'}]},
  {title:'标准库里现成的泛型工具',body:'Go 1.21 起，标准库加了 slices 和 maps 两个包，提供了很多现成的泛型函数，日常开发不用自己再写：\nslices.Contains(s, v)：切片里有没有 v；\nslices.Index(s, v)：v 在第几个位置，找不到返回 -1；\nslices.Sort(s)：从小到大排序；\nmaps.Keys(m)：取出 map 的所有 key。\n它们对任何元素类型都适用，而且类型检查在编译时完成。',code:`nums := []int{3, 1, 2}
slices.Sort(nums)
fmt.Println(nums)
fmt.Println(slices.Contains(nums, 2))
fmt.Println(slices.Index(nums, 3))

ages := map[string]int{"小明": 18, "小红": 20}
names := slices.Sorted(maps.Keys(ages))
fmt.Println(names)`,explain:[{at:'nums := []int{3, 1, 2}',text:'一个整数切片。'},{at:'slices.Sort(nums)',text:'原地从小到大排序，nums 变成 [1 2 3]。'},{at:'fmt.Println(nums)',text:'打印 [1 2 3]。'},{at:'fmt.Println(slices.Contains(nums, 2))',text:'2 在切片里，打印 true。'},{at:'fmt.Println(slices.Index(nums, 3))',text:'3 在下标 2 的位置（下标从 0 开始），打印 2。'},{at:'ages := map[string]int{"小明": 18, "小红": 20}',text:'一个 map：名字 → 年龄。'},{at:'names := slices.Sorted(maps.Keys(ages))',text:'maps.Keys 取出所有 key，slices.Sorted 把它们收集成切片并排好序（map 本身是无序的，排序后输出才稳定）。'},{at:'fmt.Println(names)',text:'打印排好序的名字。'}]},
  {title:'动手试试：写一个泛型的 Filter',body:'Filter（过滤）是最常用的泛型函数之一：给它一个切片和一个“判断函数”，它返回所有满足条件的元素。我们写一份 Filter，分别用来挑偶数和挑长单词，顺便试试前面的 Max。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','试着把 Max(3, 5) 改成 Max(3, "5") 再运行，看看编译器报什么错：泛型的类型错误在编译时就能发现。'],expect:'5\ngo\n[2 4 6]\n[rust java]'},code:`package main

import (
    "cmp"
    "fmt"
)

func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func Filter[T any](xs []T, keep func(T) bool) []T {
    var out []T
    for _, x := range xs {
        if keep(x) {
            out = append(out, x)
        }
    }
    return out
}

func main() {
    fmt.Println(Max(3, 5))
    fmt.Println(Max("go", "ai"))
    nums := []int{1, 2, 3, 4, 5, 6}
    even := Filter(nums, func(n int) bool { return n%2 == 0 })
    fmt.Println(even)
    words := []string{"go", "rust", "java"}
    long := Filter(words, func(s string) bool { return len(s) > 2 })
    fmt.Println(long)
}`,explain:[{at:'package main',text:'可直接运行的程序属于 main 包。'},{at:'import (',to:'"fmt"',text:'导入多个包时用括号括起来：cmp 提供 Ordered 约束，fmt 用来打印。'},{at:'func Max[T cmp.Ordered](a, b T) T {',to:'return b',text:'前面讲过的泛型 Max。'},{at:'func Filter[T any](xs []T, keep func(T) bool) []T {',text:'Filter 的参数：xs 是 T 类型的切片；keep 是一个函数，接收一个 T，返回 true 表示“要留下”。'},{at:'var out []T',text:'准备一个空切片，存放留下的元素。'},{at:'for _, x := range xs {',text:'逐个检查每个元素。'},{at:'if keep(x) {',to:'out = append(out, x)',text:'判断函数说“要留下”，就追加到结果里。'},{at:'return out',text:'返回过滤后的切片。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println(Max(3, 5))',to:'fmt.Println(Max("go", "ai"))',text:'分别打印 5 和 go。'},{at:'nums := []int{1, 2, 3, 4, 5, 6}',text:'准备 1 到 6。'},{at:'even := Filter(nums, func(n int) bool { return n%2 == 0 })',text:'传一个匿名函数作为判断条件：n 除以 2 余数为 0 就是偶数。这里 T 自动推断为 int。'},{at:'fmt.Println(even)',text:'打印 [2 4 6]。'},{at:'words := []string{"go", "rust", "java"}',text:'换成字符串切片。'},{at:'long := Filter(words, func(s string) bool { return len(s) > 2 })',text:'同一个 Filter，这次 T 是 string，留下长度大于 2 的单词。'},{at:'fmt.Println(long)',text:'打印 [rust java]。'}]},
  {title:'反射：程序运行时查看类型',body:'泛型是在写代码时就确定类型。反射则是在程序运行时，拿到一个值以后再去“看”它是什么类型、有哪些字段、字段上写了什么标签。Go 用 reflect 包做反射。\n很多库靠反射工作：encoding/json 把结构体转成 JSON 时，就是用反射读取每个字段和字段上的 json 标签，决定 JSON 里的名字。\n结构体标签是写在字段后面、用反引号括起来的一段说明，比如 `json:"name"`。'},
  {title:'反射的代价：能不用就不用',body:'反射很灵活，但有三个明显的缺点：\n一、慢：要在运行时查类型信息，比直接写代码慢很多；\n二、不安全：类型用错了，编译器发现不了，要到运行时才出错，甚至直接 panic；\n三、难读：代码里到处是 reflect.ValueOf、Field(i)，别人很难看懂。\n所以原则是：能用泛型或接口解决的问题，优先不用反射。反射主要留给写通用框架和库的场景，比如 JSON 编解码、ORM（把结构体映射到数据库表的库）。'},
  {title:'动手试试：用反射读出结构体标签',body:'我们定义一个带 json 标签的 User 结构体，用反射把每个字段的名字、类型和标签都打印出来，再用 encoding/json 转成 JSON，看看标签是怎么起作用的。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 Name 字段的标签改成 `json:"username"` 再运行，看看第一行和最后一行 JSON 都发生了什么变化。'],expect:'Name string name\nAge int age\n{"name":"小明","age":18}'},code:`package main

import (
    "encoding/json"
    "fmt"
    "reflect"
)

type User struct {
    Name string \`json:"name"\`
    Age  int    \`json:"age"\`
}

func main() {
    t := reflect.TypeOf(User{})
    for i := 0; i < t.NumField(); i++ {
        f := t.Field(i)
        fmt.Println(f.Name, f.Type, f.Tag.Get("json"))
    }
    data, _ := json.Marshal(User{Name: "小明", Age: 18})
    fmt.Println(string(data))
}`,explain:[{at:'package main',text:'可直接运行的程序属于 main 包。'},{at:'import (',to:'"reflect"',text:'导入三个包：encoding/json 做 JSON 转换，fmt 打印，reflect 做反射。'},{at:'type User struct {',text:'定义一个用户结构体。'},{at:'Name string `json:"name"`',to:'Age  int    `json:"age"`',text:'两个字段，反引号里是结构体标签：告诉 JSON 库，转成 JSON 时分别叫 name 和 age。'},{at:'func main() {',text:'程序入口。'},{at:'t := reflect.TypeOf(User{})',text:'用反射拿到 User 的类型信息。'},{at:'for i := 0; i < t.NumField(); i++ {',text:'NumField 返回字段个数，这里是 2，逐个查看。'},{at:'f := t.Field(i)',text:'取出第 i 个字段的信息。'},{at:'fmt.Println(f.Name, f.Type, f.Tag.Get("json"))',text:'打印字段名、字段类型，以及标签里 json 对应的值。'},{at:'data, _ := json.Marshal(User{Name: "小明", Age: 18})',text:'把一个 User 转成 JSON。json.Marshal 内部就是用反射读取上面这些标签的。'},{at:'fmt.Println(string(data))',text:'JSON 里的键是标签写的 name 和 age，而不是字段名 Name 和 Age。'}]},
  {title:'方法集：值接收者和指针接收者',body:'给类型写方法时，接收者可以是值 (c Counter)，也可以是指针 (c *Counter)。\n区别一：指针接收者能修改原来的对象，值接收者拿到的是一份复制品，改了也不影响原对象。所以需要修改字段，或者结构体很大、复制成本高时，用指针接收者。\n区别二（面试常考）：类型 T 的“方法集”只包含值接收者的方法；*T 的方法集包含值接收者和指针接收者两种方法。所以如果接口要求的方法是用指针接收者实现的，只有 *T（即 &Counter{}）能赋值给这个接口，Counter{} 不行。',code:`type Counter struct{ n int }

func (c *Counter) Inc() { c.n++ }

type Incer interface{ Inc() }

var a Incer = &Counter{}
// var b Incer = Counter{} // 编译错误：Counter 没有实现 Inc`,explain:[{at:'type Counter struct{ n int }',text:'一个计数器，字段 n 是当前计数。'},{at:'func (c *Counter) Inc() { c.n++ }',text:'Inc 方法用的是指针接收者，这样才能真正修改原对象的 n。'},{at:'type Incer interface{ Inc() }',text:'一个接口，要求有 Inc 方法。'},{at:'var a Incer = &Counter{}',text:'&Counter{} 是指针 *Counter，它的方法集包含 Inc，所以能赋值给接口。而值 Counter{} 的方法集里没有 Inc，赋值会编译报错（见最后一行注释）。'}]}
 ],quiz:[
  {id:'go-generics-1',q:'Go 从哪个版本开始支持泛型？',options:['Go 1.13','Go 1.16','Go 1.18','Go 1.21'],why:['1.13 引入了 errors.Is/As 和 %w 包装，没有泛型。','1.16 引入了 embed 和默认开启模块模式，没有泛型。','','1.21 在泛型基础上增加了 slices、maps、cmp 等标准库包。'],answer:2,explain:'Go 1.18 引入类型参数；1.21 起标准库又增加了 slices、maps、cmp 等泛型工具包。'},
  {id:'go-generics-2',q:'func Max[T cmp.Ordered](a, b T) T 中，cmp.Ordered 的作用是？',options:['限制 T 必须是 int 类型','约束 T 支持 < > 等大小比较','把参数转换成字符串再比较','在运行时检查参数的类型'],why:['Ordered 包含整数、浮点数和字符串等多种类型。','','约束不会转换参数的类型。','泛型约束在编译期检查，不是运行时。'],answer:1,explain:'约束规定类型参数能做哪些操作。cmp.Ordered 包含整数、浮点数和字符串等可以比较大小的类型。'},
  {id:'go-generics-3',type:'judge',q:'想把类型参数 K 用作 map 的 key，约束至少要是 comparable。',answer:true,explain:'map 的 key 必须可比较，所以写成 func F[K comparable, V any](m map[K]V)。'},
  {id:'go-generics-4',q:'约束 interface{ ~int } 中的 ~ 表示什么？',options:['表示对类型取反','底层为 int 的类型也满足','表示近似的数值范围','表示该类型的指针'],why:['Go 的约束中没有取反的写法。','','~ 与数值近似无关。','指针类型用 * 表示。'],answer:1,explain:'不加 ~ 只匹配 int 本身；加了 ~，所有底层类型是 int 的自定义类型（如 type Age int）都满足。'},
  {id:'go-generics-5',type:'fill',q:'判断切片里是否包含某个元素，Go 1.21 起可以直接用 slices.____(s, v)。',accepted:['Contains','slices.Contains'],explain:'slices 包提供了 Contains、Index、Sort、Equal 等泛型函数，元素类型需满足相应约束。'},
  {id:'go-generics-6',type:'judge',q:'泛型函数的类型错误要到程序运行时才会被发现。',answer:false,explain:'泛型的类型检查在编译期完成；反射和 any 加类型断言才会把问题推迟到运行时。'},
  {id:'go-generics-7',type:'multi',q:'关于反射，哪些说法正确？（多选）',options:['encoding/json 用反射读取字段和标签','反射调用比直接调用速度更快','反射的类型错误常在运行时才暴露','能用泛型或接口时优先不用反射'],why:['','反射需要在运行时查找类型信息，比直接调用慢得多。','',''],answers:[0,2,3],explain:'反射灵活但有性能开销，可读性也差，属于“最后的手段”。'},
  {id:'go-generics-8',q:'type Counter struct{n int}; func (c *Counter) Inc() { c.n++ }。接口 I 要求 Inc()，下面哪个能赋值给 I？',options:['Counter{}','&Counter{}','两个都可以','两个都不行'],why:['Inc 是指针接收者方法，不在 Counter 值类型的方法集里。','','值类型不满足接口，只有指针可以。','&Counter{} 满足接口。'],answer:1,explain:'Inc 是指针接收者方法，只在 *Counter 的方法集里，所以只有 &Counter{} 满足接口 I。'},
  {id:'go-generics-9',q:'需要在方法里修改结构体字段时，接收者应该写成？',options:['值接收者 (c Counter)','指针接收者 (c *Counter)','两种接收者都可以','方法里无法修改字段'],why:['值接收者拿到的是副本，修改不影响原对象。','','值接收者改不到原对象。','指针接收者可以修改字段。'],answer:1,explain:'值接收者拿到的是副本，修改不影响原对象；指针接收者才能改到原对象。'},
  {id:'go-generics-10',type:'code',q:'用泛型写一个 Filter 函数：输入一个切片和判断函数，返回满足条件的元素。',reference:'func Filter[T any](xs []T, keep func(T) bool) []T {\n    out := make([]T, 0, len(xs))\n    for _, x := range xs {\n        if keep(x) {\n            out = append(out, x)\n        }\n    }\n    return out\n}\n// evens := Filter([]int{1, 2, 3, 4}, func(n int) bool { return n%2 == 0 })',points:['类型参数 [T any]','参数 func(T) bool','预分配容量后 append','返回新切片'],explain:'这里对 T 没有任何操作要求，所以约束用 any 即可。'},
 ]},
 {id:'go-channel',title:'channel、select 与 context',summary:'goroutine 之间怎么传数据、等多个事件、传递取消',lessons:[
  {title:'这一关学什么：让多个任务一起干活、互相传话',body:'现实中的程序经常要同时做好几件事：一边接收用户请求，一边查数据库，一边写日志。Go 让“同时做几件事”变得很简单，这叫并发。\n这一关讲 Go 并发的三件核心工具：\ngoroutine：同时运行的任务；\nchannel：任务之间传递数据的“管道”；\ncontext：通知一整串任务“该停了”。\n还会讲 select（同时等好几件事）、channel 的各种边界情况，以及 channel 内部大概是怎么实现的。'},
  {title:'goroutine：用 go 启动一个并发任务',body:'在函数调用前面加上 go，这个函数就会在一个新的 goroutine 里运行，而当前代码不用等它，马上接着往下走。\ngoroutine 可以理解成非常轻量的“线程”：创建一个只要几 KB 内存，一个程序同时跑成千上万个也没问题。\n要注意：main 函数结束，整个程序就结束了，还没跑完的 goroutine 会被直接丢掉。所以要用某种方式等它们完成，比如下面用的 sync.WaitGroup（计数器：启动一个加 1，完成一个减 1，Wait 等到归零）。',code:`var wg sync.WaitGroup
for i := 1; i <= 3; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Println("任务", id, "完成")
    }(i)
}
wg.Wait()
fmt.Println("全部完成")`,explain:[{at:'var wg sync.WaitGroup',text:'创建一个 WaitGroup，用来等一组 goroutine 都完成。'},{at:'for i := 1; i <= 3; i++ {',text:'启动 3 个任务。'},{at:'wg.Add(1)',text:'每启动一个任务，计数加 1。要在 go 之前加，避免任务还没登记就开始等。'},{at:'go func(id int) {',text:'go 关键字启动一个新的 goroutine，运行这个匿名函数。参数 id 接收传进来的编号。'},{at:'defer wg.Done()',text:'任务结束时计数减 1。'},{at:'fmt.Println("任务", id, "完成")',text:'模拟干活。三个任务同时运行，所以打印顺序每次可能不一样。'},{at:'}(i)',text:'把当前的 i 作为参数传给匿名函数并立即启动。'},{at:'wg.Wait()',text:'阻塞在这里，直到计数归零，也就是 3 个任务都完成。'},{at:'fmt.Println("全部完成")',text:'所有任务完成后才会打印这一行。'}]},
  {title:'channel：goroutine 之间的传话管道',body:'几个 goroutine 同时运行时，怎么把数据从一个交给另一个？Go 推荐用 channel（通道）。\n可以把 channel 想成一根管子：一头往里放数据，另一头取数据。用 make(chan 类型) 创建，ch <- v 表示把 v 发送进去，v := <-ch 表示从里面接收一个值。箭头的方向就是数据流动的方向。\nGo 有一句名言：“不要通过共享内存来通信，而要通过通信来共享内存。”意思是尽量用 channel 传数据，而不是让多个 goroutine 去抢着改同一个变量。',code:`ch := make(chan string)
go func() {
    ch <- "你好"
}()
msg := <-ch
fmt.Println(msg)`,explain:[{at:'ch := make(chan string)',text:'创建一个传字符串的 channel。'},{at:'go func() {',text:'启动一个 goroutine。'},{at:'ch <- "你好"',text:'把“你好”发送进 channel。'},{at:'msg := <-ch',text:'main 在这里接收。如果数据还没到，就一直等着，直到收到为止。'},{at:'fmt.Println(msg)',text:'打印收到的“你好”。'}]},
  {title:'无缓冲和有缓冲：当面交接还是放信箱',body:'无缓冲 channel（make(chan int)）像当面交接：发送方必须等到接收方来取，交到对方手上，发送才算完成；反过来接收方也要等发送方。所以它常被用来让两个 goroutine 同步。\n有缓冲 channel（make(chan int, 3)）像一个能放 3 封信的信箱：信箱没满，发送方放进去就走，不用等人来取；信箱满了，发送才会阻塞等待。信箱空了，接收才会阻塞。\n注意：往有缓冲 channel 发送成功，只说明数据放进了缓冲区，不代表接收方已经收到，更不代表处理完了。',code:`ch := make(chan int, 3)
ch <- 1
ch <- 2
ch <- 3
fmt.Println(len(ch), cap(ch))
fmt.Println(<-ch)`,explain:[{at:'ch := make(chan int, 3)',text:'创建一个缓冲区容量为 3 的 channel。'},{at:'ch <- 1',to:'ch <- 3',text:'连续放进 3 个数。缓冲区还没满，所以都不会阻塞，即使现在还没有任何接收方。如果再放第 4 个，就会卡住等待。'},{at:'fmt.Println(len(ch), cap(ch))',text:'len 是缓冲区里现在有几个元素，cap 是容量，打印 3 3。'},{at:'fmt.Println(<-ch)',text:'取出一个，按先进先出，得到 1。'}]},
  {title:'关闭 channel 和 for range',body:'发送方发完所有数据后，可以调用 close(ch) 关闭 channel，告诉接收方“不会再有新数据了”。\n接收方用 for v := range ch 循环接收，它会把数据一个个取出来，channel 关闭并且缓冲里的数据都取完后，循环自动结束。\n记住一条规矩：由发送方关闭 channel，不要由接收方关闭；如果有多个发送方，就要额外协调，确保只关一次。',code:`ch := make(chan int)
go func() {
    for i := 1; i <= 3; i++ {
        ch <- i
    }
    close(ch)
}()
for v := range ch {
    fmt.Println(v)
}`,explain:[{at:'ch := make(chan int)',text:'创建一个无缓冲 channel。'},{at:'go func() {',text:'启动发送方 goroutine。'},{at:'for i := 1; i <= 3; i++ {',to:'ch <- i',text:'依次发送 1、2、3。'},{at:'close(ch)',text:'发完了，关闭 channel，通知接收方没有更多数据了。'},{at:'for v := range ch {',text:'不断接收，直到 channel 关闭且数据取完才退出循环。如果发送方忘了 close，这个循环会一直等下去。'},{at:'fmt.Println(v)',text:'依次打印 1、2、3。'}]},
  {title:'单向 channel：限制只能收或只能发',body:'函数参数里可以把 channel 声明成“单向”的，让编译器帮你防止用错：\n<-chan int：只读 channel，只能从里面接收；\nchan<- int：只写 channel，只能往里发送。\n记忆方法：箭头在 chan 左边，数据从 chan 里出来，是只读；箭头在 chan 右边，数据进到 chan 里，是只写。\n普通的双向 channel 可以直接传给这两种参数，会自动转换。',code:`func producer(out chan<- int) {
    out <- 1
    close(out)
}

func consumer(in <-chan int) {
    for v := range in {
        fmt.Println(v)
    }
}`,explain:[{at:'func producer(out chan<- int) {',text:'生产者只需要发送，参数声明成只写 channel。'},{at:'out <- 1',text:'往里发送数据。如果在这里写 <-out 尝试接收，会编译报错。'},{at:'close(out)',text:'发送方负责关闭。'},{at:'func consumer(in <-chan int) {',text:'消费者只需要接收，参数声明成只读 channel，在函数里既不能发送也不能关闭它。'},{at:'for v := range in {',to:'fmt.Println(v)',text:'接收并打印，直到 channel 关闭。'}]},
  {title:'nil channel 和已关闭的 channel 会怎样',body:'这些边界情况是面试高频题，记一张表：\nnil channel（只声明没 make，值是 nil）：发送和接收都会永远阻塞；close 它会 panic。\n已关闭的 channel：\n一、再发送会 panic；\n二、再 close 一次也会 panic；\n三、接收不会出错：先把缓冲区里剩下的数据取完，之后每次接收都立刻返回这个类型的零值。\n怎么区分“收到了真的 0”和“channel 已关闭”？用两个返回值的写法 v, ok := <-ch：ok 为 false 就表示 channel 已关闭并且数据取完了。',code:`v, ok := <-ch
if !ok {
    fmt.Println("channel 已关闭，数据也取完了")
    return
}
fmt.Println("收到", v)`,explain:[{at:'v, ok := <-ch',text:'接收时多拿一个 ok。正常收到数据时 ok 是 true。'},{at:'if !ok {',to:'return',text:'ok 为 false，说明 channel 已关闭且缓冲取完了，此时 v 只是零值，没有意义，直接返回。'},{at:'fmt.Println("收到", v)',text:'ok 为 true 时，v 才是真正收到的数据。'}]},
  {title:'动手试试：生产者、消费者和关闭',body:'一个 goroutine 往有缓冲 channel 里放 5 个数然后关闭，main 用 for range 全部取出，最后再从已关闭的 channel 接收一次，看看会得到什么。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 close(ch) 这一行删掉再运行，程序会报 “all goroutines are asleep - deadlock!”：range 一直在等新数据，却再也没人发送了。'],expect:'收到 10\n收到 20\n收到 30\n收到 40\n收到 50\n关闭后再收： 0 false'},code:`package main

import "fmt"

func main() {
    ch := make(chan int, 3)
    go func() {
        for i := 1; i <= 5; i++ {
            ch <- i * 10
        }
        close(ch)
    }()
    for v := range ch {
        fmt.Println("收到", v)
    }
    v, ok := <-ch
    fmt.Println("关闭后再收：", v, ok)
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头，导入 fmt 用来打印。'},{at:'func main() {',text:'程序入口。'},{at:'ch := make(chan int, 3)',text:'缓冲为 3 的 channel：生产者最多可以先放 3 个，不用等消费者。'},{at:'go func() {',text:'启动生产者 goroutine。'},{at:'for i := 1; i <= 5; i++ {',to:'ch <- i * 10',text:'依次发送 10、20、30、40、50。缓冲满了就等 main 取走一些再继续。'},{at:'close(ch)',text:'发完关闭。'},{at:'for v := range ch {',to:'fmt.Println("收到", v)',text:'main 是消费者，逐个接收并打印，channel 关闭且取完后循环结束。'},{at:'v, ok := <-ch',text:'对已关闭且已取空的 channel 再接收：不会阻塞，也不会 panic，立刻得到零值 0 和 ok=false。'},{at:'fmt.Println("关闭后再收：", v, ok)',text:'打印“0 false”。'}]},
  {title:'select：同时等好几件事',body:'有时一个 goroutine 要同时等好几个 channel：可能是结果来了，也可能是超时了，也可能是收到了退出通知。select 就是干这个的。\n它的写法像 switch，但每个 case 都是一个 channel 操作。select 会等到其中某个 case 能执行（就绪）时，执行那个 case。\n如果有多个 case 同时就绪，select 会随机选一个，而不是按书写顺序，这样可以避免某个 channel 一直“饿着”。',code:`select {
case msg := <-results:
    fmt.Println("拿到结果：", msg)
case <-time.After(2 * time.Second):
    fmt.Println("等了 2 秒还没结果，超时")
case <-quit:
    fmt.Println("收到退出通知")
}`,explain:[{at:'select {',text:'开始同时等待下面三件事，哪件先发生就处理哪件，只处理一件。'},{at:'case msg := <-results:',to:'fmt.Println("拿到结果：", msg)',text:'results 里来了数据，就接收并打印。'},{at:'case <-time.After(2 * time.Second):',to:'fmt.Println("等了 2 秒还没结果，超时")',text:'time.After 返回一个 channel，2 秒后会收到一个值。所以这个分支的意思是“2 秒到了”，用来实现超时。'},{at:'case <-quit:',to:'fmt.Println("收到退出通知")',text:'quit 有消息（或被关闭）时执行。关闭的 channel 总是能立刻接收，所以“关闭 quit”是广播退出的常见写法。'}]},
  {title:'select 的两个技巧：default 和 nil 分支',body:'技巧一：加 default 分支，select 就不会阻塞。如果其他分支都没就绪，立刻执行 default。常用来“试着发一下，发不出去就算了”，比如日志队列满了就丢弃，不拖慢主流程。\n技巧二：把某个 channel 变量设成 nil，对应的分支就永远不会被选中，相当于把这个分支“关掉”。比如同时读两个 channel，其中一个已经关闭读完了，就把它设成 nil，select 只等另一个。',code:`select {
case logCh <- line:
default:
    dropped++
}

for a != nil || b != nil {
    select {
    case v, ok := <-a:
        if !ok {
            a = nil
            continue
        }
        fmt.Println("a:", v)
    case v, ok := <-b:
        if !ok {
            b = nil
            continue
        }
        fmt.Println("b:", v)
    }
}`,explain:[{at:'select {',text:'第一个例子：非阻塞发送。'},{at:'case logCh <- line:',text:'试着把一行日志发送进 logCh。'},{at:'default:',to:'dropped++',text:'logCh 满了发不进去，就立刻走 default，记一次丢弃，不会卡住。'},{at:'for a != nil || b != nil {',text:'只要 a、b 还有一个没读完就继续循环。'},{at:'select {',text:'每一轮同时等 a 和 b，哪个有数据就先处理哪个。'},{at:'case v, ok := <-a:',text:'从 a 接收。'},{at:'if !ok {',to:'continue',text:'a 已关闭读完，把 a 设成 nil：之后这个分支永远不会被选中，select 只等 b。'},{at:'fmt.Println("a:", v)',text:'正常收到 a 的数据。'},{at:'case v, ok := <-b:',to:'fmt.Println("b:", v)',text:'b 的处理方式和 a 一样。两个都变成 nil 后，循环结束。'}]},
  {title:'context：通知一整串任务“该停了”',body:'一个网页请求进来，服务端可能会启动好几个 goroutine：查数据库、调别的服务、算推荐……如果用户中途关掉了网页，或者整个请求超时了，这些工作都应该尽快停下，别白白浪费资源。\ncontext（上下文）就是用来传递这种“该停了”信号的。它像一根贯穿整条调用链的绳子：上游一拉（取消或超时），下游所有拿着这根绳子的函数都能感觉到。\n它还能携带截止时间，以及少量“这次请求”相关的信息，比如请求 ID。'},
  {title:'WithTimeout 和 cancel：设定超时，用完收尾',body:'从一个已有的 context 可以派生出新的 context：\ncontext.WithTimeout(父, 时长)：到时间自动取消；\ncontext.WithCancel(父)：手动调用 cancel() 取消。\n两者都会返回一个 cancel 函数，无论是否超时，用完都要调用它，否则相关资源要等到超时才释放。最常见的写法就是派生后马上 defer cancel()。\n下游代码通过 ctx.Done() 得知该停了：它返回一个 channel，取消或超时时这个 channel 会被关闭；ctx.Err() 说明停止的原因。',code:`func fetch(parent context.Context) error {
    ctx, cancel := context.WithTimeout(parent, 2*time.Second)
    defer cancel()

    select {
    case res := <-callService(ctx):
        fmt.Println("结果：", res)
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}`,explain:[{at:'func fetch(parent context.Context) error {',text:'按惯例，context 作为函数的第一个参数传进来，参数名通常叫 ctx 或 parent。'},{at:'ctx, cancel := context.WithTimeout(parent, 2*time.Second)',text:'在 parent 的基础上派生一个最多 2 秒的 ctx。如果 parent 先被取消，ctx 也会跟着取消。'},{at:'defer cancel()',text:'函数结束时一定调用 cancel，及时释放计时器等资源。'},{at:'select {',text:'同时等两件事：结果先到，还是超时先到。'},{at:'case res := <-callService(ctx):',to:'return nil',text:'把 ctx 继续传给下游，结果先到就打印并返回。'},{at:'case <-ctx.Done():',to:'return ctx.Err()',text:'2 秒到了（或上游取消了），Done() 的 channel 被关闭，这里立刻执行，返回原因，比如 context deadline exceeded。'}]},
  {title:'动手试试：到点就停的任务',body:'我们写一个每 0.4 秒完成一步的任务，给它 1 秒的期限。任务每一步之前都检查一下 ctx 有没有被取消，到点后自己停下来。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 time.Second 改成 3*time.Second 再运行，看看能完成几步。'],expect:'完成第 1 步\n完成第 2 步\n停下来了： context deadline exceeded'},code:`package main

import (
    "context"
    "fmt"
    "time"
)

func work(ctx context.Context) error {
    for step := 1; ; step++ {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(400 * time.Millisecond):
            fmt.Println("完成第", step, "步")
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()
    err := work(ctx)
    fmt.Println("停下来了：", err)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'导入 context、fmt 和 time 三个包。'},{at:'func work(ctx context.Context) error {',text:'一个可以被取消的任务，ctx 是第一个参数。'},{at:'for step := 1; ; step++ {',text:'不写结束条件的循环，一直做下去，直到被叫停。'},{at:'select {',text:'每一步都同时等两件事。'},{at:'case <-ctx.Done():',to:'return ctx.Err()',text:'期限到了就停下，返回原因。这就是“协作式取消”：任务要自己检查信号、自己退出。'},{at:'case <-time.After(400 * time.Millisecond):',to:'fmt.Println("完成第", step, "步")',text:'0.4 秒过去，算完成一步。第 1 步在 0.4 秒，第 2 步在 0.8 秒，第 3 步要到 1.2 秒，但 1 秒时期限已到。'},{at:'func main() {',text:'程序入口。'},{at:'ctx, cancel := context.WithTimeout(context.Background(), time.Second)',text:'context.Background() 是最顶层的空 context，在它基础上派生一个 1 秒后超时的 ctx。'},{at:'defer cancel()',text:'用完记得 cancel。'},{at:'err := work(ctx)',to:'fmt.Println("停下来了：", err)',text:'运行任务，结束后打印停止原因：context deadline exceeded（超过截止时间）。'}]},
  {title:'context 的使用规矩',body:'一、作为函数的第一个参数传递，不要存进结构体里长期保存。\n二、不要传 nil。暂时不知道该用哪个 context 时，传 context.TODO()；在 main 函数、初始化或测试这类最顶层的地方，用 context.Background()。\n三、取消是“协作式”的：cancel() 只是发出信号，不会强行杀死正在运行的 goroutine。下游代码要自己检查 ctx.Done() 或 ctx.Err()，然后主动退出；不检查的话，它会一直跑下去。\n四、WithValue 只用来传“请求级”的小信息，比如请求 ID、登录用户 ID。数据库连接、配置这类依赖应该通过函数参数或结构体字段显式传递，藏在 context 里会让代码难以理解和测试。'},
  {title:'channel 内部是怎么实现的',body:'在 Go 运行时里，一个 channel 是一个叫 hchan 的结构体，主要包含：\n一、一个环形缓冲区（有缓冲时才有），以及当前元素个数和容量；\n二、下一次发送和接收的位置；\n三、两个等待队列：等着发送的 goroutine，和等着接收的 goroutine；\n四、一把锁，保证多个 goroutine 同时操作时数据不乱。\n发送一个值时，大致按这个顺序处理：\n先看有没有 goroutine 正在等着接收，有的话直接把值交给它并唤醒它，连缓冲区都不经过；\n没有就看缓冲区满没满，没满就放进缓冲区；\n缓冲区满了（或者是无缓冲 channel），当前 goroutine 就把自己挂到发送等待队列里，暂停运行，等接收方来了再被唤醒。'}
 ],quiz:[
  {id:'go-channel-1',q:'无缓冲 channel 的发送什么时候完成？',options:['调用后立刻完成','有接收方接走时完成','缓冲区满的时候','channel 被关闭时'],why:['无缓冲 channel 没有地方暂存数据，必须等接收方。','','无缓冲 channel 没有缓冲区。','向已关闭的 channel 发送会 panic，而不是完成。'],answer:1,explain:'无缓冲 channel 的发送和接收必须配对，所以常用来做同步交接。',interview:'q-78adb94c0b5d08f1'},
  {id:'go-channel-2',type:'judge',q:'往有缓冲 channel 发送成功，说明接收方已经处理完了这条数据。',answer:false,explain:'有缓冲时发送成功只说明数据进了缓冲区，不代表已被接收或处理。',interview:'q-78adb94c0b5d08f1'},
  {id:'go-channel-3',q:'对一个 nil channel 执行 <-ch 会怎样？',options:['立刻返回零值','发生 panic','永久阻塞','编译报错'],why:['立即返回零值是已关闭 channel 的行为。','只有 close(nil) 才会 panic。','','代码合法，问题在运行时。'],answer:2,explain:'nil channel 的发送和接收都会永久阻塞；close(nil) 才会 panic。',interview:'q-11267891b83bdf99'},
  {id:'go-channel-4',type:'multi',q:'对一个已关闭的 channel，哪些操作会 panic？（多选）',options:['向它发送数据','再次 close 它','从它接收数据','用 for range 遍历它'],why:['','','接收会先取完缓冲，再立即返回零值和 ok=false，不会 panic。','range 会在 channel 关闭且缓冲取完后自然结束。'],answers:[0,1],explain:'接收会先取完缓冲，再返回零值和 ok=false；range 会自然结束。只有发送和重复关闭会 panic。',interview:'q-4b394dccaecf89e0'},
  {id:'go-channel-5',q:'channel 已关闭且缓冲取完后，v, ok := <-ch 得到？',options:['阻塞等待新数据','零值和 ok=false','发生 panic','上一次的值和 ok=true'],why:['关闭后的接收不再阻塞。','','接收已关闭的 channel 不会 panic。','不会重复返回旧值。'],answer:1,explain:'关闭后的接收不再阻塞，立即返回元素类型的零值，ok 为 false。',interview:'q-4b394dccaecf89e0'},
  {id:'go-channel-6',q:'select 中有多个分支同时就绪，会执行哪个？',options:['代码中的第一个','代码中的最后一个','伪随机选一个','全部依次执行'],why:['select 没有优先级，不按书写顺序选择。','不按书写顺序选择。','','每次 select 只执行一个分支。'],answer:2,explain:'select 会伪随机挑一个就绪分支，避免总偏向某一个。',interview:'q-b69ba4003ff7b624'},
  {id:'go-channel-7',q:'select 里想暂时禁用某个 channel 分支，常见技巧是？',options:['把该 channel 变量设为 nil','关闭该 channel','给 select 加 default 分支','把该分支注释掉'],why:['','关闭后接收分支会一直就绪，反而频繁被选中。','default 让 select 不阻塞，不能禁用某个分支。','注释是改代码，不能在运行时动态禁用。'],answer:0,explain:'nil channel 的分支永远不会就绪，相当于禁用。',interview:'q-11267891b83bdf99'},
  {id:'go-channel-8',q:'用 context.WithTimeout 派生出 ctx 后，正确的做法是？',options:['不用管返回的 cancel','紧接着 defer cancel()','把 cancel 存成全局变量','只在超时后调用 cancel'],why:['不调用 cancel 会让计时器等资源直到超时才释放，go vet 也会警告。','','全局保存 cancel 会让生命周期混乱。','即使提前完成也应调用 cancel 释放资源。'],answer:1,explain:'派生 context 后要及时调用 cancel 释放资源，常见写法是紧接着 defer cancel()。',interview:'q-24b68e3ea02c8051'},
  {id:'go-channel-9',type:'judge',q:'调用 cancel() 后，正在运行的 goroutine 会被立即强制终止。',answer:false,explain:'取消是协作式的：只是发出通知，goroutine 要自己检查 ctx.Done() 并退出；cancel 也不会等待它们结束。',interview:'q-24b68e3ea02c8051'},
  {id:'go-channel-10',type:'fill',q:'函数参数需要 context 但暂时不知道用哪个时，应该传 context.____()。',accepted:['TODO','context.TODO','TODO()','context.TODO()'],explain:'不要传 nil；不确定时用 context.TODO()，程序入口等顶层用 context.Background()。',interview:'q-24b68e3ea02c8051'},
  {id:'go-channel-11',type:'short',q:'向 channel 发送一个值时，运行时内部大致怎么处理？',reference:'先加锁。如果有接收者在等待队列里，就直接把值交给它并唤醒；否则如果有缓冲且没满，就写入环形缓冲区；都不满足时，把当前 goroutine 放进发送等待队列并挂起，等有接收者时再被唤醒。向已关闭的 channel 发送会 panic。',points:['有接收者等待就直接交付','缓冲未满写入缓冲区','否则进入发送等待队列挂起','已关闭会 panic'],explain:'三种情况按顺序说出来就是满分答案。',interview:'q-2df1131ab7d03ee5'},
  {id:'go-channel-12',q:'for v := range ch 什么时候结束？',options:['读到零值的时候结束','关闭且缓冲取完后结束','一直循环不会结束','读到第一个值后就结束'],why:['零值也可能是正常发送的数据，不会因此结束。','','channel 关闭并取完后就会结束。','range 会持续接收，直到 channel 关闭。'],answer:1,explain:'没人关闭 channel 时 range 会一直阻塞，可能导致 goroutine 泄漏。',interview:'q-4b394dccaecf89e0'},
  {id:'go-channel-13',type:'judge',q:'select 带 default 分支时，如果其他分支都没就绪，会立即执行 default 而不阻塞。',answer:true,explain:'default 让 select 变成非阻塞的；但在死循环里这样写会忙等占满 CPU。',interview:'q-b69ba4003ff7b624'},
  {id:'go-channel-14',q:'只读 channel 的类型写法是？',options:['chan<- int','<-chan int','chan int','readonly chan int'],why:['chan<- int 是只发送 channel。','','chan int 是双向 channel，可收可发。','Go 中没有 readonly 关键字。'],answer:1,explain:'<-chan int 只能接收，chan<- int 只能发送；把它们用在函数参数上，可以在编译期防止误用。'},
  {id:'go-channel-15',type:'judge',q:'context.WithValue 适合用来传递数据库连接、配置这类依赖。',answer:false,explain:'Value 只放请求级的元数据（比如请求 ID、用户身份），依赖应通过参数或结构体字段显式传入；key 要用自定义类型。',interview:'q-24b68e3ea02c8051'},
 ]},
 {id:'go-memory',title:'底层：字符串、切片与内存布局',summary:'string 和 slice 在内存里长什么样，扩容和拷贝的代价',lessons:[
  {title:'这一关学什么：数据在内存里长什么样',body:'前面我们一直在用 string（字符串）和 slice（切片），这一关钻到底层看看它们在内存里到底是什么样子。\n搞懂这一点，很多“奇怪”的现象就都能解释了：为什么改了一个切片，另一个也跟着变？为什么循环里用 + 拼字符串会越来越慢？为什么从大字符串里截一小段，内存却一直降不下来？为什么两个字段一样的结构体，占的内存却不一样大？\n这些都是面试里考察“基本功”的高频题。'},
  {title:'string：一个地址加一个长度',body:'在 Go 里，一个 string 变量本身只存两样东西：\n一、一个地址，指向真正存放文字内容的那块内存；\n二、内容的长度（字节数）。\n字符串的内容是只读的，不能修改，所以 s[0] = \'H\' 这种写法会直接编译报错。想“修改”只能生成一个新字符串。\n因为只读，复制一个字符串时只需要复制这两样（16 字节），不用复制内容，非常便宜；截取子串时，新字符串也可能直接指向原来那块内存的一部分。',code:`s := "hello"
t := s
sub := s[1:3]
fmt.Println(t, sub)
// s[0] = 'H' // 编译错误：字符串不能修改`,explain:[{at:'s := "hello"',text:'s 内部记录：内容 hello 所在的地址，长度 5。'},{at:'t := s',text:'复制字符串只复制地址和长度，t 和 s 指向同一份内容。因为内容只读，共享也很安全。'},{at:'sub := s[1:3]',text:'截取下标 1 到 3（不含 3）的部分，得到 "el"。sub 指向原内容中间的位置，不一定复制数据。'},{at:'fmt.Println(t, sub)',text:'打印 hello el。'}]},
  {title:'len 是字节数，不是字数',body:'Go 的字符串内部用 UTF-8 编码：英文字母一个占 1 个字节，常见汉字一个占 3 个字节。\nlen(s) 返回的是字节数，所以 len("你好") 是 6，而不是 2。\n想知道有几个“字”（Go 里叫 rune，也就是一个 Unicode 字符），要用 utf8.RuneCountInString(s)。用 for i, r := range s 遍历时，Go 会按字符一个个取出来，i 是这个字符的起始字节位置。\n所以处理中文时，不要用 s[i] 按下标取，那样取到的是单个字节，可能是半个汉字。'},
  {title:'拼接字符串：别在循环里用 +',body:'因为字符串只读，s += x 每次都要分配一块新内存，把旧内容和新内容一起复制进去。在循环里这样拼 1 万次，前面的内容会被反复复制，越来越慢。\n推荐做法：\n一、只拼固定的几段，用 + 最清楚，没问题；\n二、循环里拼接，用 strings.Builder：它内部有一块可以增长的缓冲区，最后一次性生成字符串；\n三、已经有一个字符串切片，用 strings.Join(parts, 分隔符) 一步拼好。\n另外，[]byte(s) 和 string(b) 这两种转换一般都会复制一份数据，因为要保证字符串的内容不会被别人改掉。',code:`var b strings.Builder
b.Grow(64)
for _, part := range parts {
    b.WriteString(part)
}
s := b.String()

all := strings.Join(parts, ", ")`,explain:[{at:'var b strings.Builder',text:'创建一个字符串构建器，零值就能直接用。'},{at:'b.Grow(64)',text:'可选：如果大概知道最终长度，提前预留空间，减少中途扩容。'},{at:'for _, part := range parts {',to:'b.WriteString(part)',text:'把每一段追加到内部缓冲区，不会每次都生成新字符串。'},{at:'s := b.String()',text:'最后一次性拿到拼好的字符串。'},{at:'all := strings.Join(parts, ", ")',text:'如果只是把一组字符串用分隔符连起来，Join 一行就够了。'}]},
  {title:'动手试试：字节、字符和 Builder',body:'我们用“你好go”这个字符串，看看字节数和字符数有什么不同，range 遍历时下标是怎么跳的，再用 Builder 拼一个字符串。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 s 换成你自己的名字（中文或英文都行）再运行，看看字节数和字符数分别是多少。'],expect:'字节数： 8\n字符数： 4\n0 你\n3 好\n6 g\n7 o\nababab'},code:`package main

import (
    "fmt"
    "strings"
    "unicode/utf8"
)

func main() {
    s := "你好go"
    fmt.Println("字节数：", len(s))
    fmt.Println("字符数：", utf8.RuneCountInString(s))
    for i, r := range s {
        fmt.Println(i, string(r))
    }
    var b strings.Builder
    for i := 0; i < 3; i++ {
        b.WriteString("ab")
    }
    fmt.Println(b.String())
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"unicode/utf8"',text:'导入 fmt 打印、strings 用 Builder、unicode/utf8 数字符。'},{at:'func main() {',text:'程序入口。'},{at:'s := "你好go"',text:'两个汉字（各 3 字节）加两个字母（各 1 字节）。'},{at:'fmt.Println("字节数：", len(s))',text:'len 是字节数：3 + 3 + 1 + 1 = 8。'},{at:'fmt.Println("字符数：", utf8.RuneCountInString(s))',text:'按字符数是 4。'},{at:'for i, r := range s {',to:'fmt.Println(i, string(r))',text:'range 按字符遍历：i 是字符的起始字节位置，所以是 0、3、6、7；r 是这个字符，用 string(r) 转回字符串打印。'},{at:'var b strings.Builder',text:'创建构建器。'},{at:'for i := 0; i < 3; i++ {',to:'b.WriteString("ab")',text:'追加 3 次 "ab"。'},{at:'fmt.Println(b.String())',text:'打印 ababab。'}]},
  {title:'slice：一个指针、一个长度、一个容量',body:'切片本身不存数据，它是底层数组的一个“窗口”，只记录三样东西：\n一、指针：窗口从底层数组的哪里开始；\n二、len（长度）：窗口里现在有几个元素；\n三、cap（容量）：从窗口起点到底层数组末尾，最多能放几个元素。\n所以 b := a 复制一个切片，只是复制了这三样，a 和 b 看的是同一个底层数组。通过 b 改元素，a 也会看到变化。',code:`a := []int{1, 2, 3}
b := a
b[0] = 100
fmt.Println(a[0])          // 100
fmt.Println(len(a), cap(a)) // 3 3`,explain:[{at:'a := []int{1, 2, 3}',text:'创建切片 a，底层有一个装着 1、2、3 的数组。'},{at:'b := a',text:'复制的只是指针、len、cap，b 和 a 指向同一个底层数组。'},{at:'b[0] = 100',text:'通过 b 修改第一个元素，改的是共享的底层数组。'},{at:'fmt.Println(a[0])',text:'所以 a[0] 也变成了 100。'},{at:'fmt.Println(len(a), cap(a))',text:'长度 3，容量 3。'}]},
  {title:'append：容量够就原地写，不够就搬家',body:'append 往切片末尾加元素时分两种情况：\n一、容量还够：直接写进底层数组的下一个位置，不分配新内存。如果别的切片也指向这个底层数组，它们会看到这个位置被改写了；\n二、容量不够：分配一块更大的新数组，把旧元素复制过去，再追加。返回的切片指向新数组，而其他还指向旧数组的切片不会跟着变。\n因为 append 可能“搬家”，所以一定要接收它的返回值：s = append(s, x)。\n下面是一个经典陷阱：b 是 a 的前两个元素，容量还剩 2，append 直接写进了共享数组，把 a 的第三个元素改掉了。',code:`a := []int{1, 2, 3, 4}
b := a[:2]
b = append(b, 99)
fmt.Println(a) // [1 2 99 4]`,explain:[{at:'a := []int{1, 2, 3, 4}',text:'a 的长度 4，容量 4。'},{at:'b := a[:2]',text:'b 是 a 的前两个元素 [1 2]，长度 2，但容量是 4，因为后面还有 a 的两个位置。'},{at:'b = append(b, 99)',text:'b 的容量够，99 直接写进底层数组的第 3 个位置，也就是 a[2] 原来放 3 的地方。'},{at:'fmt.Println(a)',text:'a 变成了 [1 2 99 4]，被“悄悄”改掉了。'}]},
  {title:'三索引切片：给新切片限制容量',body:'想避免上一张卡片的陷阱，可以用三个数的切片写法 s[低:高:上限]：第三个数限制新切片的容量，容量 = 上限 - 低。\n比如 a[:2:2] 得到的切片长度 2、容量也是 2，没有多余空间。这时再 append，必须分配新数组，就不会改写到 a 的数据了。\n写一个函数，返回自己内部切片的一部分给别人用时，经常这样做，防止调用方一 append 就改坏你的数据。',code:`a := []int{1, 2, 3, 4}
c := a[:2:2]
c = append(c, 7)
fmt.Println(a) // [1 2 3 4]
fmt.Println(c) // [1 2 7]`,explain:[{at:'a := []int{1, 2, 3, 4}',text:'同样的 a。'},{at:'c := a[:2:2]',text:'取前两个元素，并把容量限制为 2 - 0 = 2。'},{at:'c = append(c, 7)',text:'容量不够，append 分配新数组，把 1、2 复制过去再加 7。'},{at:'fmt.Println(a)',text:'a 没有被改动。'},{at:'fmt.Println(c)',text:'c 指向新数组，是 [1 2 7]。'}]},
  {title:'切片怎么扩容',body:'append 发现容量不够时，新容量大致按下面的规则算（Go 1.18 之后的版本）：\n一、如果需要的长度比旧容量的两倍还大，就直接用需要的长度；\n二、否则，旧容量小于 256 时，新容量通常是旧容量的两倍。比如容量 4 的切片满了再 append 一个，新容量通常是 8；\n三、旧容量更大时，增长倍数从 2 倍逐渐过渡到约 1.25 倍，避免一次多占太多内存。\n最后还会按内存分配器的规格向上取整，所以实际容量不一定是整好的倍数。\n很多旧资料说“以 1024 为分界，之前翻倍、之后 1.25 倍”，那是老版本的规则，已经不适用了。\n如果事先知道大概要放多少个元素，用 make([]int, 0, n) 一次性预留容量，可以完全避免中途扩容。'},
  {title:'动手试试：亲手验证共享和扩容',body:'把前面几张卡片的结论放进一个程序里跑一遍：复制切片后的共享、append 改写共享数组、三索引切片，最后看着容量一步步增长。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 make([]int, 0, 4) 里的 4 改成 10 再运行，看看最后一行的容量变化有什么不同。'],expect:'改 b 之后的 a： [100 2 3]\nappend 之后的 c： [1 2 99 4]\n三索引 append 之后的 c： [1 2 99 4] e： [1 2 7]\n4 4 4 4 8 8 8 8 16 16'},code:`package main

import "fmt"

func main() {
    a := []int{1, 2, 3}
    b := a
    b[0] = 100
    fmt.Println("改 b 之后的 a：", a)

    c := []int{1, 2, 3, 4}
    d := c[:2]
    d = append(d, 99)
    fmt.Println("append 之后的 c：", c)

    e := c[:2:2]
    e = append(e, 7)
    fmt.Println("三索引 append 之后的 c：", c, "e：", e)

    s := make([]int, 0, 4)
    for i := 0; i < 10; i++ {
        s = append(s, i)
        fmt.Print(cap(s), " ")
    }
    fmt.Println()
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头。'},{at:'func main() {',text:'程序入口。'},{at:'a := []int{1, 2, 3}',to:'fmt.Println("改 b 之后的 a：", a)',text:'实验一：b 和 a 共享底层数组，改 b[0]，a 也变成 [100 2 3]。'},{at:'c := []int{1, 2, 3, 4}',to:'fmt.Println("append 之后的 c：", c)',text:'实验二：d 容量够，append 的 99 写进了 c 的第三个位置。'},{at:'e := c[:2:2]',to:'fmt.Println("三索引 append 之后的 c：", c, "e：", e)',text:'实验三：e 的容量被限制为 2，append 时搬到新数组，c 不受影响。'},{at:'s := make([]int, 0, 4)',text:'实验四：创建一个长度 0、容量 4 的切片。'},{at:'for i := 0; i < 10; i++ {',to:'fmt.Print(cap(s), " ")',text:'每追加一个元素，打印一次当前容量。前 4 个直接放进预留的空间，容量不变；放第 5 个时容量满了，翻倍成 8；放第 9 个时再翻倍成 16。'},{at:'fmt.Println()',text:'最后换行。'}]},
  {title:'内存滞留：一小段拽住一大块',body:'前面说过，子串和子切片可能和原来的数据共享同一块内存。这会带来一个隐蔽的问题：\n比如从一个 10MB 的大字符串里截出 16 个字节，存进一个长期存在的缓存。只要这 16 字节还在用，整块 10MB 的内存都不能被回收，因为它们是同一块。这叫“内存滞留”。\n解决办法：把这一小段单独复制一份再保存。Go 1.18 起可以直接用 strings.Clone；切片可以用 slices.Clone 或者 append([]byte(nil), b...)。',code:`func extractID(page string) string {
    id := page[100:116]
    return strings.Clone(id)
}`,explain:[{at:'func extractID(page string) string {',text:'从一个很大的网页内容 page 里，取出其中 16 个字符的 ID。'},{at:'id := page[100:116]',text:'直接截取得到的 id 和 page 共享同一块内存。如果把它长期保存，整个 page 都释放不掉。'},{at:'return strings.Clone(id)',text:'复制出一份只有 16 字节的新字符串再返回，原来的大字符串用完就能被回收。'}]},
  {title:'结构体对齐：字段顺序会影响大小',body:'CPU 读取内存时，喜欢从“对齐”的地址开始读：比如 8 字节的 int64，最好放在 8 的倍数的地址上。所以编译器会在结构体字段之间、末尾插入一些空着的“填充字节”，让每个字段都对齐。\n这样一来，字段顺序不同，结构体的大小就可能不同。在 64 位平台上：\nstruct{ X byte; Y int64; Z byte }：X 占 1 字节，后面要空 7 字节让 Y 对齐到 8，Y 占 8 字节，Z 占 1 字节，末尾再补 7 字节让整体是 8 的倍数，一共 24 字节；\n把 Y 放到最前面：Y 占 8，X、Z 紧挨着各 1 字节，末尾补 6，一共只要 16 字节。\n一般把大的字段放前面能省空间。不确定时用 unsafe.Sizeof 看大小，unsafe.Offsetof 看某个字段的偏移量。'},
  {title:'动手试试：量一量结构体有多大',body:'我们定义两个字段完全相同、只是顺序不同的结构体，用 unsafe 包量一量它们的大小和字段偏移；顺便看看 time.Duration 的单位。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','给 Good 再加一个 byte 字段，猜猜大小会不会变，再运行验证。'],expect:'Bad 大小： 24\nGood 大小： 16\nBad.Y 的偏移： 8\ntime.Duration(3) = 3ns\n1500 毫秒 = 1.5s'},code:`package main

import (
    "fmt"
    "time"
    "unsafe"
)

type Bad struct {
    X byte
    Y int64
    Z byte
}

type Good struct {
    Y int64
    X byte
    Z byte
}

func main() {
    fmt.Println("Bad 大小：", unsafe.Sizeof(Bad{}))
    fmt.Println("Good 大小：", unsafe.Sizeof(Good{}))
    fmt.Println("Bad.Y 的偏移：", unsafe.Offsetof(Bad{}.Y))
    fmt.Println("time.Duration(3) =", time.Duration(3))
    fmt.Println("1500 毫秒 =", 1500*time.Millisecond)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"unsafe"',text:'unsafe 包可以查看内存布局，名字叫 unsafe 是提醒你：它绕过了类型安全，日常业务代码里别乱用。'},{at:'type Bad struct {',to:'Z byte',text:'byte、int64、byte 的顺序：X 后面要填 7 个字节，Z 后面也要填 7 个字节。'},{at:'type Good struct {',to:'Z byte',text:'同样三个字段，把 int64 放在最前面。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println("Bad 大小：", unsafe.Sizeof(Bad{}))',text:'Sizeof 返回占多少字节：24。'},{at:'fmt.Println("Good 大小：", unsafe.Sizeof(Good{}))',text:'换个顺序只要 16。'},{at:'fmt.Println("Bad.Y 的偏移：", unsafe.Offsetof(Bad{}.Y))',text:'Offsetof 返回字段距离结构体开头多少字节：Y 从第 8 个字节开始，说明 X 后面确实填充了 7 个字节。'},{at:'fmt.Println("time.Duration(3) =", time.Duration(3))',text:'time.Duration 其实就是 int64，单位是纳秒，所以 Duration(3) 是 3 纳秒，打印 3ns。'},{at:'fmt.Println("1500 毫秒 =", 1500*time.Millisecond)',text:'正确写法是“数字 × 单位常量”，1500 毫秒打印为 1.5s。'}]}
 ],quiz:[
  {id:'go-memory-1',q:'len("你好") 的值是？',options:['2','4','6','3'],why:['2 是字符数，len 返回的是字节数。','汉字在 UTF-8 中占 3 个字节，不是 2 个。','','3 只是一个汉字的字节数。'],answer:2,explain:'要数字符可以用 utf8.RuneCountInString。',interview:'q-79fc8e4df94b1c8e'},
  {id:'go-memory-2',type:'judge',q:'可以通过 s[0] = \'H\' 修改字符串的第一个字节。',answer:false,explain:'string 的内容是只读的，s[0] 不可赋值。要修改请先转成 []byte 或 []rune。',interview:'q-79fc8e4df94b1c8e'},
  {id:'go-memory-3',q:'在循环里拼接大量字符串，推荐用？',options:['s += part','strings.Builder','fmt.Sprintf("%s%s", s, part)','每次 string([]byte) 转换'],why:['+= 每次都重新分配并复制已有内容，累计接近平方级。','','Sprintf 同样每次生成新字符串，还多了格式化解析的开销。','每次转换都会复制一份数据，问题和 += 一样。'],answer:1,explain:'Builder 在内部缓冲区里追加，最后一次性取出；知道大致长度时还可以先 Grow 预分配。',interview:'q-4ea932dd887287be'},
  {id:'go-memory-4',type:'judge',q:'b := []byte(s) 一般会分配并复制一份数据。',answer:true,explain:'因为 b 可以修改而 s 必须只读，所以通常要复制。编译器在少数只读场景会优化掉，但不能依赖。',interview:'q-871d1d61cf54d76d'},
  {id:'go-memory-5',q:'从 10MB 的字符串里截出 16 字节长期保存在缓存里，会有什么问题？如何解决？',options:['没有问题，只占 16 字节','共享原存储，10MB 无法回收','GC 回收时会报错','需要手动 free 原字符串'],why:['子串和原字符串共享底层存储，只要子串还在，整块 10MB 都无法回收。','','GC 不会报错，只是无法回收那块内存。','Go 没有手动 free，内存由 GC 管理。'],answer:1,explain:'用 strings.Clone（Go 1.18+）复制出独立的小字符串，只对需要长期保存的小段这样做。',interview:'q-cdae0785b6563bf0'},
  {id:'go-memory-6',q:'下面代码输出什么？',code:'a := []int{1, 2, 3}\nb := a\nb[0] = 100\nfmt.Println(a[0])',options:['1','100','编译报错','0'],why:['b 和 a 共享底层数组，修改 b[0] 会影响 a[0]。','','代码合法。','元素没有被清零。'],answer:1,explain:'复制 slice 只复制指针、len、cap，a 和 b 共享同一个底层数组。',interview:'q-bad4e305aeacacde'},
  {id:'go-memory-7',type:'fill',q:'s[1:3:3] 这种写法里，第三个数用来限制新切片的 ____。',accepted:['cap','容量'],explain:'第三个索引限制容量，之后 append 就会分配新数组，不会覆盖原切片后面的元素。',interview:'q-bad4e305aeacacde'},
  {id:'go-memory-8',q:'较新的 Go 中，一个 cap 为 4 的切片满了再 append 一个元素，新容量通常是？',options:['5','6','8','16'],why:['Go 不会每次只多分配一个元素，那样频繁扩容效率很低。','增长系数在小容量时约为 2 倍，不是 1.5 倍。','','16 是翻两倍，扩容一次只翻一倍。'],answer:2,explain:'旧容量小于 256 时通常翻倍；之后增长系数逐渐趋近 1.25，还会按内存规格取整，所以实际值可能略有不同。',interview:'q-52752c7219520e33'},
  {id:'go-memory-9',type:'judge',q:'切片扩容后，其他还指向旧数组的切片也会自动指向新数组。',answer:false,explain:'扩容返回的是新切片；之前共享旧数组的切片仍然指向旧数组，从此“分家”。',interview:'q-52752c7219520e33'},
  {id:'go-memory-10',q:'在常见 64 位平台上，struct{ X byte; Y int64; Z byte } 的大小是？',options:['10','16','24','32'],why:['10 只是字段大小之和，没有考虑对齐填充。','16 是把两个 byte 放在一起时的大小。','','对齐后不需要 32 字节。'],answer:2,explain:'Y 要 8 字节对齐，X 后补 7 字节；整体对齐到 8 的倍数，Z 后再补 7，共 24。调成 {Y int64; X, Z byte} 就是 16。',interview:'q-1ce6cbb60fc0bad0'},
  {id:'go-memory-11',q:'time.Duration(3) 表示多长时间？',options:['3 秒','3 毫秒','3 纳秒','3 微秒'],why:['3 秒要写 3 * time.Second。','3 毫秒要写 3 * time.Millisecond。','','3 微秒要写 3 * time.Microsecond。'],answer:2,explain:'Duration 底层是 int64，单位是纳秒；变量秒数写 time.Duration(n) * time.Second。',interview:'q-7c836d025b71239b'},
  {id:'go-memory-12',q:'utf8.RuneCountInString("你好go") 的结果是？',options:['4','6','8','2'],why:['','6 只是两个汉字的字节数。','8 是 len 返回的字节数。','2 只数了汉字，没算 g 和 o。'],answer:0,explain:'它数的是字符（rune）个数：你、好、g、o 共 4 个；len 则是字节数 8。',interview:'q-79fc8e4df94b1c8e'},
  {id:'go-memory-13',q:'下面代码运行后 a 是多少？',code:'a := []int{1, 2, 3, 4}\nb := a[:2]\nb = append(b, 99)\nfmt.Println(a)',options:['[1 2 3 4]','[1 2 99 4]','[1 2 99]','运行时 panic'],why:['b 的容量足够，append 直接写进了共享数组，a[2] 被覆盖了。','','a 的长度没有变，仍然是 4 个元素。','没有越界，不会 panic。'],answer:1,explain:'用三下标切片 a[:2:2] 限制容量，append 时就会扩容到新数组，不会覆盖 a。',interview:'q-bad4e305aeacacde'},
  {id:'go-memory-14',type:'judge',q:'Go 1.18 起可以用 strings.Clone 复制一段子串，避免它拽住整个大字符串。',answer:true,explain:'Clone 会分配独立的存储；只对需要长期保存的小段使用，不要所有子串都复制。',interview:'q-cdae0785b6563bf0'},
  {id:'go-memory-15',type:'fill',q:'查看结构体某个字段相对起始位置的偏移量，用 unsafe.____。',accepted:['Offsetof','unsafe.Offsetof'],explain:'Sizeof 看大小，Alignof 看对齐，Offsetof 看偏移，结果都和目标平台有关。',interview:'q-1ce6cbb60fc0bad0'},
 ]},
 {id:'go-sync',title:'底层：map 与同步原语',summary:'map 的实现和使用规则，Mutex、RWMutex、WaitGroup 与 sync.Map',lessons:[
  {title:'这一关学什么：map 和“加锁”',body:'map（映射）是 Go 里最常用的数据结构之一：通过一个 key 快速找到对应的 value，比如通过用户名找到用户信息。\n这一关先讲 map 的用法规则和底层实现，再讲多个 goroutine 同时读写数据时怎么保证不出错：互斥锁 Mutex、读写锁 RWMutex、等待一组任务的 WaitGroup，以及并发安全的 sync.Map。\n这些都是写并发程序的基本功，也是面试的高频题。'},
  {title:'map 的基本用法',body:'map 用 make(map[key类型]value类型) 创建，然后像字典一样存取：m[key] = value 写入，m[key] 读取。\n读取一个不存在的 key 不会报错，而是返回 value 类型的零值。如果需要区分“值是 0”和“根本没有这个 key”，用两个返回值的写法 v, ok := m[key]。\n用 delete(m, key) 删除，len(m) 得到元素个数。key 的类型必须能用 == 比较，所以切片、map、函数都不能当 key。',code:`ages := make(map[string]int)
ages["小明"] = 18
ages["小红"] = 20
fmt.Println(ages["小明"])
fmt.Println(ages["小刚"])
v, ok := ages["小刚"]
fmt.Println(v, ok)
delete(ages, "小红")
fmt.Println(len(ages))`,explain:[{at:'ages := make(map[string]int)',text:'创建一个 key 是字符串、value 是整数的 map，用来存“名字 → 年龄”。'},{at:'ages["小明"] = 18',to:'ages["小红"] = 20',text:'写入两条数据。'},{at:'fmt.Println(ages["小明"])',text:'读取小明的年龄，打印 18。'},{at:'fmt.Println(ages["小刚"])',text:'小刚不存在，返回 int 的零值 0，不会报错。'},{at:'v, ok := ages["小刚"]',to:'fmt.Println(v, ok)',text:'用 ok 判断 key 是否存在：打印 0 false。'},{at:'delete(ages, "小红")',text:'删除小红这条记录。'},{at:'fmt.Println(len(ages))',text:'现在只剩 1 条。'}]},
  {title:'map 底层：哈希表，实现随版本变化',body:'map 是一个哈希表：先用哈希函数把 key 算成一个数字（哈希值），再根据这个数字决定数据放在哪个位置，查找时同样算一下就能直接定位，所以很快。\nGo 1.23 及以前的实现是“桶 + 溢出桶”：数据分到很多个桶里，每个桶放 8 对键值，放不下就挂一个溢出桶。\nGo 1.24 起，默认换成了 Swiss Table：数据按“组”存放，每组配一组控制字节，查找时可以一次比较好几个位置，更快也更省内存。\n实现变了，但使用规则没变：key 必须可比较；遍历顺序不固定；多个 goroutine 同时读写必须加锁。'},
  {title:'遍历顺序是随机的',body:'用 for range 遍历 map，每次顺序都可能不一样。这是 Go 故意的：它在遍历时会随机选一个起点，防止大家依赖某种碰巧的顺序。\n需要固定顺序时（比如输出报表、写测试），先把所有 key 取出来放进切片，排好序，再按这个顺序去取 value。',code:`keys := slices.Sorted(maps.Keys(ages))
for _, k := range keys {
    fmt.Println(k, ages[k])
}`,explain:[{at:'keys := slices.Sorted(maps.Keys(ages))',text:'maps.Keys 取出所有 key，slices.Sorted 收集成切片并排好序。也可以先自己 append 到切片里，再调用 slices.Sort。'},{at:'for _, k := range keys {',to:'fmt.Println(k, ages[k])',text:'按排好的顺序逐个取值，每次运行输出都一样。'}]},
  {title:'map 的几个“不能”',body:'一、nil map 不能写。只声明没 make 的 map 是 nil，读它、求长度、遍历都没问题（就像空的），但写入会直接 panic。\n二、不能对 map 的元素取地址，&m[k] 会编译报错。因为 map 扩容时元素会搬家，地址会失效。\n三、value 是结构体时，不能直接改它的字段，m["tom"].Age = 19 会编译报错。要先取出一个副本，改完再整个写回去。或者把 value 设计成指针类型 map[string]*User。',code:`var m map[string]int
fmt.Println(m["a"], len(m))
// m["a"] = 1 // panic：不能写 nil map

users := map[string]User{"tom": {Age: 18}}
u := users["tom"]
u.Age++
users["tom"] = u`,explain:[{at:'var m map[string]int',text:'只声明，没有 make，m 是 nil。'},{at:'fmt.Println(m["a"], len(m))',text:'读 nil map 是安全的：打印 0 0。'},{at:'users := map[string]User{"tom": {Age: 18}}',text:'value 是结构体 User 的 map。'},{at:'u := users["tom"]',text:'取出 tom 的一个副本。'},{at:'u.Age++',text:'修改副本的字段。'},{at:'users["tom"] = u',text:'把改好的副本整个写回 map，这样才真正改到了。'}]},
  {title:'delete 不会让 map 变小',body:'一个容易被忽视的问题：往 map 里放了 100 万个元素，再 delete 掉其中 99 万个，map 占用的内存并不会变小。delete 只是把位置标记成空的，底层的哈希表还保持着原来的大小。\n如果一个长期存在的 map（比如缓存）曾经很大，后来大部分被删掉，内存就一直降不下来，看起来像“内存泄漏”。\n治理办法：\n一、定期新建一个 map，把还需要的数据复制过去，丢掉旧的，让旧的被垃圾回收；\n二、缓存要设置容量上限和过期时间，不要让它无限增长；\n三、value 很大时存指针，减少表本身的大小。'},
  {title:'动手试试：map 的规则和函数传参',body:'把前面讲的规则跑一遍：排序后遍历、修改结构体 value、读 nil map。最后再看一个常考题：把切片传给函数，函数里 append，调用方的切片长度会不会变？',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 for 循环改成直接 for name, age := range ages 遍历，多运行几次，看看输出顺序是不是每次都一样。'],expect:'amy 20\nbob 19\ntom 18\ntom 的新年龄： 19\n读 nil map： 0 0\n调用后的长度： 1'},code:`package main

import (
    "fmt"
    "maps"
    "slices"
)

type User struct {
    Age int
}

func addOne(s []int) {
    s = append(s, 1)
}

func main() {
    ages := map[string]int{"tom": 18, "amy": 20, "bob": 19}
    for _, name := range slices.Sorted(maps.Keys(ages)) {
        fmt.Println(name, ages[name])
    }

    users := map[string]User{"tom": {Age: 18}}
    u := users["tom"]
    u.Age++
    users["tom"] = u
    fmt.Println("tom 的新年龄：", users["tom"].Age)

    var empty map[string]int
    fmt.Println("读 nil map：", empty["x"], len(empty))

    s := []int{0}
    addOne(s)
    fmt.Println("调用后的长度：", len(s))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"slices"',text:'导入 fmt、maps、slices 三个包。'},{at:'type User struct {',to:'Age int',text:'一个只有年龄字段的用户结构体。'},{at:'func addOne(s []int) {',to:'s = append(s, 1)',text:'函数参数是切片的一份副本（指针、len、cap 三样都复制了）。append 修改的是这个副本的 len，调用方的 len 不变。想让调用方看到变化，要把新切片返回出去。'},{at:'func main() {',text:'程序入口。'},{at:'ages := map[string]int{"tom": 18, "amy": 20, "bob": 19}',text:'直接用字面量创建并填好一个 map。'},{at:'for _, name := range slices.Sorted(maps.Keys(ages)) {',to:'fmt.Println(name, ages[name])',text:'按名字排序后遍历，输出顺序固定：amy、bob、tom。'},{at:'users := map[string]User{"tom": {Age: 18}}',to:'fmt.Println("tom 的新年龄：", users["tom"].Age)',text:'取出副本 → 修改 → 写回，tom 的年龄变成 19。'},{at:'var empty map[string]int',to:'fmt.Println("读 nil map：", empty["x"], len(empty))',text:'nil map 可以读，得到 0，长度也是 0。'},{at:'s := []int{0}',to:'fmt.Println("调用后的长度：", len(s))',text:'s 的长度是 1，调用 addOne 后仍然是 1。'}]},
  {title:'为什么需要锁：多个 goroutine 同时改数据',body:'count++ 看起来是一步，其实是三步：读出 count、加 1、写回去。两个 goroutine 同时执行时，可能都读到了 5，各自加 1 后都写回 6，结果少加了一次。这种“多个任务同时读写同一份数据导致结果出错”的情况叫“数据竞争”。\n普通 map 更严重：两个 goroutine 同时写同一个 map，哪怕写的是不同的 key，Go 运行时一旦检测到就会直接让程序崩溃（fatal error: concurrent map writes），而且这种错误不能用 recover 接住。\n解决办法是加锁：同一时刻只允许一个 goroutine 修改共享数据。运行程序时加上 -race 参数（go run -race main.go），Go 能帮你检查出数据竞争。'},
  {title:'Mutex：互斥锁',body:'sync.Mutex 是最基本的锁，“互斥”的意思是同一时刻只有一个 goroutine 能拿到它。\nLock() 拿锁，拿不到就等着；Unlock() 释放锁。夹在 Lock 和 Unlock 之间、需要保护的那段代码叫“临界区”。\n通常写成拿锁后马上 defer Unlock()，保证不管从哪里返回都会释放。\n下面是一个并发安全的计数器：把锁和要保护的数据放在同一个结构体里，是很常见的写法。',code:`type Counter struct {
    mu sync.Mutex
    n  int
}

func (c *Counter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.n++
}`,explain:[{at:'type Counter struct {',text:'并发安全的计数器。'},{at:'mu sync.Mutex',text:'一把互斥锁，零值就能直接用，不用初始化。'},{at:'n  int',text:'要保护的数据：计数值。'},{at:'func (c *Counter) Inc() {',text:'加一的方法。必须用指针接收者：锁不能被复制，复制出来的锁和原来的锁互不相干，就起不到保护作用了。'},{at:'c.mu.Lock()',text:'拿锁。如果别的 goroutine 正拿着，就在这里等。'},{at:'defer c.mu.Unlock()',text:'函数结束时释放锁。'},{at:'c.n++',text:'临界区：同一时刻只有一个 goroutine 能执行到这里，加一不会丢。'}]},
  {title:'Mutex 的几个细节',body:'一、不能重入：同一个 goroutine 已经拿着锁，再调用一次 Lock 会把自己永远卡住（死锁）。所以一个加了锁的方法里，不要再调用另一个也会加同一把锁的方法。\n二、不能复制：用过的锁不能复制，含锁的结构体要通过指针传递。go vet 工具能检查出这类错误。\n三、内部怎么工作：没人抢的时候，一次原子操作（CPU 保证不会被打断的一步操作）就能拿到锁，非常快；有人抢的时候，先原地短暂“自旋”尝试几次，还拿不到就进入等待队列睡下，等锁释放时被唤醒。\n四、防饿死：如果某个 goroutine 等锁等了超过 1 毫秒，锁会切换到“饥饿模式”，按排队顺序把锁直接交给等待者，不让新来的插队。'},
  {title:'RWMutex：读多写少时用读写锁',body:'很多数据是“读得多、改得少”，比如配置、缓存。如果读的时候也互斥，大家只能一个个排队读，很浪费。\nsync.RWMutex 是读写锁：\n读锁 RLock / RUnlock：多个 goroutine 可以同时拿读锁，一起读；\n写锁 Lock / Unlock：写的时候独占，读和写都要等。\n还有一个面试常考的细节：如果已经有写者在等待，新来的读者也要排队，不能继续拿读锁。否则读者源源不断，写者就永远拿不到锁（写者饿死）。',code:`type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(k string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.data[k]
    return v, ok
}

func (c *Cache) Set(k, v string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[k] = v
}`,explain:[{at:'type Cache struct {',text:'一个并发安全的缓存。'},{at:'mu   sync.RWMutex',text:'读写锁。'},{at:'data map[string]string',text:'被保护的 map。'},{at:'func (c *Cache) Get(k string) (string, bool) {',text:'读操作。'},{at:'c.mu.RLock()',to:'defer c.mu.RUnlock()',text:'拿读锁：多个 Get 可以同时进行。'},{at:'v, ok := c.data[k]',to:'return v, ok',text:'读取并返回。'},{at:'func (c *Cache) Set(k, v string) {',text:'写操作。'},{at:'c.mu.Lock()',to:'defer c.mu.Unlock()',text:'拿写锁：独占，等所有正在读的人读完才能拿到，拿到后别人既不能读也不能写。'},{at:'c.data[k] = v',text:'安全地写入 map。'}]},
  {title:'WaitGroup：等一组任务都完成',body:'sync.WaitGroup 是一个计数器，用来等一批 goroutine 全部结束：\n启动每个 goroutine 之前调用 Add(1)，goroutine 结束时调用 Done()（计数减 1），主流程调用 Wait() 等到计数归零。\n注意 Add 一定要写在 go 语句之前，而不是写在 goroutine 里面。否则可能 goroutine 还没来得及 Add，主流程的 Wait 就发现计数是 0，直接返回了。\nGo 1.25 新增了 wg.Go(f)，它把“Add(1)、启动 goroutine、结束时 Done”三步合成一步，更不容易写错。',code:`var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func() {
        defer wg.Done()
        fetch(url)
    }()
}
wg.Wait()

for _, url := range urls {
    wg.Go(func() { fetch(url) })
}
wg.Wait()`,explain:[{at:'var wg sync.WaitGroup',text:'创建计数器。'},{at:'for _, url := range urls {',text:'为每个网址启动一个下载任务。'},{at:'wg.Add(1)',text:'在 go 之前加 1。'},{at:'go func() {',text:'启动 goroutine。Go 1.22 起每轮循环的 url 都是新变量，闭包里直接用不会出错。'},{at:'defer wg.Done()',text:'任务结束时减 1。'},{at:'fetch(url)',text:'真正的下载工作。'},{at:'wg.Wait()',text:'等所有下载完成。'},{at:'for _, url := range urls {',text:'同样的事，用 Go 1.25 的新写法。'},{at:'wg.Go(func() { fetch(url) })',text:'一步完成 Add、启动和 Done。'},{at:'wg.Wait()',text:'同样等全部完成。'}]},
  {title:'sync.Map：自带锁的 map',body:'sync.Map 是标准库提供的并发安全 map，不用自己加锁。但它不是万能的，只适合两种场景：\n一、读多写少，比如一次写入、之后反复读取的缓存；\n二、不同的 goroutine 读写的是不同的 key。\n其他情况下，普通 map 加一把 Mutex 或 RWMutex 往往更快、类型也更清楚（sync.Map 的值都是 any，取出来要类型断言）。\n使用时要注意：每一次 Load、Store 单独看是安全的，但“先 Load 判断不存在，再 Store”这两步合起来不是原子的，中间可能被别人抢先写入。要用它提供的组合操作：LoadOrStore（不存在才写入）、CompareAndSwap（值等于旧值才替换）。另外，Range 遍历时别人还可能在修改，它看到的不是某一时刻的一致快照。',code:`var m sync.Map
m.Store("a", 1)
v, ok := m.Load("a")
fmt.Println(v, ok)

actual, loaded := m.LoadOrStore("b", 2)
fmt.Println(actual, loaded)

m.Range(func(k, v any) bool {
    fmt.Println(k, v)
    return true
})`,explain:[{at:'var m sync.Map',text:'零值即可使用，不需要 make。'},{at:'m.Store("a", 1)',text:'写入 a → 1。'},{at:'v, ok := m.Load("a")',to:'fmt.Println(v, ok)',text:'读取，打印 1 true。v 的类型是 any，要当 int 用需要 v.(int)。'},{at:'actual, loaded := m.LoadOrStore("b", 2)',text:'b 不存在就写入 2，并返回 loaded=false；如果已经存在，就不写，返回已有的值和 loaded=true。整个过程是原子的。'},{at:'fmt.Println(actual, loaded)',text:'打印 2 false。'},{at:'m.Range(func(k, v any) bool {',to:'return true',text:'遍历所有键值对，回调返回 true 表示继续，返回 false 就停止。'}]},
  {title:'动手试试：1000 个 goroutine 一起加一',body:'启动 1000 个 goroutine，每个给同一个计数器加一。加了锁，结果一定是 1000。然后试试 sync.Map 的 LoadOrStore：同一个 key 写两次，看看第二次发生了什么。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 mu.Lock() 和 mu.Unlock() 两行删掉，多运行几次，看看结果是不是每次都是 1000（很可能会小于 1000，而且每次不一样）。Mac 和 Linux 上还可以用 go run -race main.go 运行，让 Go 直接报告 DATA RACE（数据竞争）；Windows 上用 -race 需要另外安装 C 编译器。'],expect:'加锁后的结果： 1000\nGo false\nGo true'},code:`package main

import (
    "fmt"
    "sync"
)

func main() {
    var mu sync.Mutex
    var wg sync.WaitGroup
    count := 0
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            mu.Lock()
            count++
            mu.Unlock()
        }()
    }
    wg.Wait()
    fmt.Println("加锁后的结果：", count)

    var m sync.Map
    v1, loaded1 := m.LoadOrStore("lang", "Go")
    v2, loaded2 := m.LoadOrStore("lang", "Rust")
    fmt.Println(v1, loaded1)
    fmt.Println(v2, loaded2)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"sync"',text:'导入 fmt 和 sync 包。'},{at:'func main() {',text:'程序入口。'},{at:'var mu sync.Mutex',to:'count := 0',text:'一把锁、一个等待计数器，和要保护的 count。'},{at:'for i := 0; i < 1000; i++ {',to:'wg.Add(1)',text:'循环 1000 次，每次先 Add(1)。'},{at:'go func() {',to:'defer wg.Done()',text:'启动 goroutine，结束时 Done。'},{at:'mu.Lock()',to:'mu.Unlock()',text:'加锁后再加一，同一时刻只有一个 goroutine 在改 count，一次都不会丢。'},{at:'wg.Wait()',to:'fmt.Println("加锁后的结果：", count)',text:'等全部完成，打印 1000。'},{at:'var m sync.Map',text:'创建 sync.Map。'},{at:'v1, loaded1 := m.LoadOrStore("lang", "Go")',text:'lang 还不存在，写入 Go，返回 Go 和 false。'},{at:'v2, loaded2 := m.LoadOrStore("lang", "Rust")',text:'lang 已经存在，不会写入 Rust，而是返回已有的 Go 和 true。'},{at:'fmt.Println(v1, loaded1)',to:'fmt.Println(v2, loaded2)',text:'打印两次的结果。'}]}
 ],quiz:[
  {id:'go-sync-1',q:'Go 1.24 起，map 的默认底层实现是？',options:['红黑树','bucket 链表','Swiss Table','跳表结构'],why:['Go 的 map 从来不是红黑树实现，也不保证有序。','hmap 加 bucket 和溢出桶是 Go 1.23 及以前的实现。','','跳表常见于 Redis 的有序集合，不是 Go map 的实现。'],answer:2,explain:'讲 map 的实现要先说版本：Go 1.24 起默认改为 Swiss Table。',interview:'q-17c3228b5c6651ff'},
  {id:'go-sync-2',type:'judge',q:'同一个 map 多次 for range，遍历顺序保证一致。',answer:false,explain:'map 不保证顺序，运行时还会随机遍历起点。要稳定顺序请先取出 key 排序。',interview:'q-f637e69141a11784'},
  {id:'go-sync-3',q:'m 是 map[string]User，下面哪种写法能修改 tom 的 Age？',options:['m["tom"].Age = 20','p := &m["tom"]; p.Age = 20','取出副本修改后再写回','以上写法都不行'],why:['map 元素不可寻址，不能直接修改其字段，会编译报错。','不能对 map 元素取地址，会编译报错。','','取副本修改再写回是可行的。'],answer:2,explain:'u := m["tom"]; u.Age = 20; m["tom"] = u；或者在 map 中存 *User。',interview:'q-b636b1393a3a8dd4'},
  {id:'go-sync-4',q:'var m map[string]int; m["a"] = 1 会怎样？',options:['正常写入','编译报错','运行时 panic','自动初始化后写入'],why:['nil map 不能写入。','编译器无法在编译期判断 map 是否为 nil。','','Go 不会自动初始化 map。'],answer:2,explain:'nil map 可以读、len、range、delete，但写入会 panic；要先用 make 或字面量初始化。',interview:'q-0d755e9ed1b2889c'},
  {id:'go-sync-5',type:'judge',q:'delete 掉 map 里大部分 key 后，map 的底层表会自动缩小，内存马上还给操作系统。',answer:false,explain:'delete 让值可以被回收，但底层表通常不缩小。要缩小就新建一个小 map 复制保留项，并丢掉旧 map。',interview:'q-6748940acd480401'},
  {id:'go-sync-6',type:'judge',q:'两个 goroutine 同时写同一个普通 map 的不同 key，是安全的。',answer:false,explain:'只要有并发写，就要同步所有访问，即使 key 不同也不行，运行时可能直接报 fatal error。',interview:'q-e1c5a6d1929e59e4'},
  {id:'go-sync-7',q:'函数 f(s []int) 里执行 s = append(s, 1)，调用方的切片长度会变吗？',options:['会变长','不会，要返回新切片','取决于容量是否足够','编译报错'],why:['传参复制的是切片头，函数里修改长度不会传回调用方。','','即使容量足够写进了共享数组，调用方的长度也不会变。','代码合法。'],answer:1,explain:'修改长度的函数应返回新切片：items = add(items)。',interview:'q-4553c1bda7201981'},
  {id:'go-sync-8',q:'RWMutex 在什么情况下会让新来的读者等待？',options:['新读者在任何时候都不用等','已有写者在等待时','读者数量超过 10 个时','锁被复制了一份的时候'],why:['为了防止写者饥饿，有写者等待时新读者会被挡住。','','读者数量没有上限。','复制锁是错误用法，会导致不可预测的行为，但不是这个问题的答案。'],answer:1,explain:'已有写者等待时，新读者会被挡住，避免写者一直拿不到锁。',interview:'q-3d511cfd7f584e24'},
  {id:'go-sync-9',type:'multi',q:'关于 Mutex，哪些说法正确？（多选）',options:['同一 goroutine 可以重复 Lock','无竞争时用原子操作快速拿锁','用过的 Mutex 不应被复制','RWMutex 读锁可以直接升级为写锁'],why:['Go 的 Mutex 不可重入，重复 Lock 会死锁。','','','读锁不能升级为写锁，持有读锁时再加写锁会死锁。'],answers:[1,2],explain:'Go 的锁不可重入，读锁也不能升级为写锁；无竞争时走 CAS 快路径；使用后不能复制。',interview:'q-3d511cfd7f584e24'},
  {id:'go-sync-10',q:'使用 WaitGroup 时，wg.Add(1) 应该写在哪里？',options:['goroutine 里的第一行','启动 goroutine 之前','wg.Wait() 之后','写在哪里都可以'],why:['写在 goroutine 里时，Wait 可能在 Add 执行前就返回。','','Wait 之后再 Add 已经晚了。','位置很重要，Add 必须先于 Wait 生效。'],answer:1,explain:'Add 必须先于 Wait 生效，所以要在 go 语句之前调用；写在 goroutine 里，Wait 可能提前返回。',interview:'q-f9fb9ff3b253228d'},
  {id:'go-sync-11',q:'用 sync.Map 实现“不存在才写入”，应该用？',options:['先 Load，没有再 Store','LoadOrStore','Range 遍历后判断','Delete 后再 Store'],why:['Load 和 Store 两步之间可能被其他 goroutine 插入，不是原子的。','','遍历判断同样不是原子操作，而且效率低。','先删除会覆盖已有的值，与“不存在才写入”相反。'],answer:1,explain:'Load 再 Store 两步之间可能被别人插入，不是原子的；LoadOrStore 一步完成。',interview:'q-70a9b74ab21752dd'},
  {id:'go-sync-12',type:'short',q:'map 为什么可能出现“内存泄漏”？怎么治理？',reference:'map 本身不会泄漏，常见原因是长期存在的 map 只增不删、缓存没有淘汰；大量 delete 后底层容量仍保留；值里引用了大对象、指针或子串，连带保留更多内存。治理方法：明确生命周期和容量上限，做淘汰、过期清理或定期重建，用 heap profile 查看实际引用链。',points:['只进不出、没有淘汰','删除后容量不缩','值引用大对象','设上限，淘汰或重建'],explain:'先说原因再说办法；注意不要把“RSS 没降”直接等同于泄漏。',interview:'q-b5082c04a1ba8f9f'},
  {id:'go-sync-13',q:'nil map 和空 map 都能做的操作是？',options:['执行 m["a"] = 1 写入','读取 m["a"] 和 len(m)','两者都不能做任何操作','只有 nil map 可以读取'],why:['写入 nil map 会 panic，只有空 map 能写。','','两者都可以读、len、range、delete。','两者都可以读取，结果都是零值。'],answer:1,explain:'读取都得到零值、len 都是 0、range 和 delete 都安全；只有写入时 nil map 会 panic。',interview:'q-0d755e9ed1b2889c'},
  {id:'go-sync-14',type:'judge',q:'sync.Map 的 Range 遍历得到的是调用那一刻的一致性快照。',answer:false,explain:'Range 不是快照，遍历期间其他 goroutine 的增删可能被看到也可能看不到。',interview:'q-70a9b74ab21752dd'},
  {id:'go-sync-15',q:'Go 1.25 新增的 wg.Go(f) 做了什么？',options:['自动 Add，运行 f 后 Done','收集并返回 f 产生的错误','限制同时运行的 goroutine 数','可以强制取消正在运行的 f'],why:['','wg.Go 不收集错误，需要错误处理用 errgroup。','它不限制并发数，限流用 errgroup.SetLimit 或信号量。','Go 无法强制取消 goroutine，取消要靠 context。'],answer:0,explain:'wg.Go 简化了 Add/Done 的写法，但 f 不能 panic，也不负责收集错误；需要错误和取消用 errgroup。',interview:'q-f9fb9ff3b253228d'},
  {id:'go-sync-16',type:'fill',q:'需要按固定顺序遍历 map，先把 key 收集到切片里，再用 slices.____ 排序。',accepted:['Sort','slices.Sort'],explain:'map 遍历无序；收集 key、排序后再按顺序读取 map。',interview:'q-f637e69141a11784'},
 ]},
 {id:'go-runtime',title:'Runtime：编译、启动与 GMP 调度',summary:'程序怎么跑起来，成千上万个 goroutine 怎么被调度',lessons:[
  {title:'这一关学什么：程序背后的“管家”',body:'你写的 Go 程序在运行时，背后一直有一个“管家”在帮你干活：分配内存、回收垃圾、安排成千上万个 goroutine 轮流使用 CPU。这个管家叫 runtime（运行时），它会被自动编译进你的程序里。\n这一关讲三件事：\n一、从源码到可执行文件，再到程序启动，中间发生了什么；\n二、goroutine 为什么比线程“轻”；\n三、GMP 调度模型：runtime 怎么把大量 goroutine 分配给少量线程去执行。\nGMP 是 Go 面试里最经典的底层题之一。'},
  {title:'从源码到可执行文件：go build 做了什么',body:'运行 go build 时，大致经过这几步：\n一、确定要编译哪些文件、依赖哪些包；\n二、编译器读入源码，检查语法和类型；\n三、做优化：比如“内联”（把小函数的代码直接展开到调用的地方，省掉函数调用的开销）、“逃逸分析”（判断变量能不能放在栈上，下一关详细讲）；\n四、转成一种叫 SSA 的中间形式，再做一轮优化，然后生成对应 CPU 的机器码；\n五、链接：把你的代码、用到的库和 runtime 合到一起，生成一个可执行文件。\n注意：go build 只编译，不会运行程序，也不会执行 main 或 init 函数。想看它实际调用了哪些工具，可以加 -x 参数：go build -x。'},
  {title:'程序启动的顺序',body:'双击或运行一个 Go 程序后，顺序是这样的：\n一、runtime 先做准备：设置好线程、栈、内存分配器和调度器；\n二、初始化各个包：先初始化被依赖的包，每个包里先给包级变量赋初值，再执行这个包的 init 函数；\n三、最后进入 main 包的 main 函数，也就是你写的程序入口。\n还有一条很重要的规则：main 函数一返回，整个程序就结束了。这时其他还在运行的 goroutine 不会被等待，直接随进程一起结束，它们没做完的事情就丢掉了。所以需要等 goroutine 时，一定要用 WaitGroup、channel 之类的方式显式等待。'},
  {title:'动手试试：看看谁先执行',body:'我们写一个程序，分别在包级变量初始化、init 函数和 main 函数里打印，看看执行顺序；再在 main 里启动一个要睡 1 秒的 goroutine，看看 main 结束时它还能不能打印出来。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','在 main 函数最后加一行 time.Sleep(2 * time.Second) 再运行，看看那一行是不是打印出来了。'],expect:'1. 包级变量初始化\n2. init 函数执行\n3. main 开始，name = Go\n4. main 结束'},code:`package main

import (
    "fmt"
    "time"
)

var name = initName()

func initName() string {
    fmt.Println("1. 包级变量初始化")
    return "Go"
}

func init() {
    fmt.Println("2. init 函数执行")
}

func main() {
    fmt.Println("3. main 开始，name =", name)
    go func() {
        time.Sleep(time.Second)
        fmt.Println("这一行不会打印出来")
    }()
    fmt.Println("4. main 结束")
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'导入 fmt 和 time。'},{at:'var name = initName()',text:'包级变量（写在所有函数外面的变量），它的初始值要调用 initName 来计算。包级变量最先初始化。'},{at:'func initName() string {',to:'return "Go"',text:'计算初始值时打印第 1 行，返回 "Go"。'},{at:'func init() {',to:'fmt.Println("2. init 函数执行")',text:'init 是特殊函数：不能手动调用，在包级变量初始化之后、main 之前自动执行。'},{at:'func main() {',to:'fmt.Println("3. main 开始，name =", name)',text:'最后才进入 main，这时 name 已经是 "Go" 了。'},{at:'go func() {',to:'fmt.Println("这一行不会打印出来")',text:'启动一个 goroutine，它要先睡 1 秒再打印。'},{at:'fmt.Println("4. main 结束")',text:'main 打印后马上返回，整个程序随之结束。那个还在睡觉的 goroutine 被直接丢掉，它的那一行永远没机会打印。'}]},
  {title:'进程、线程和 goroutine',body:'进程：一个运行中的程序，操作系统给它分配独立的内存等资源，进程之间互相隔离，一个崩了不影响另一个。\n线程：进程里真正执行代码的单位，一个进程可以有多个线程，它们共享这个进程的内存。线程由操作系统调度，创建一个通常要预留 MB 级别的栈，切换时要进入操作系统内核，代价比较大。\ngoroutine：由 Go 的 runtime 调度的“用户态线程”。runtime 用少量操作系统线程，轮流执行大量 goroutine，操作系统甚至不知道 goroutine 的存在。'},
  {title:'goroutine 为什么这么轻',body:'一、栈很小：一个 goroutine 刚创建时栈只有大约 2KB，不够用时 runtime 会自动换一块更大的；而线程一开始就要预留 MB 级别。所以同样的内存，goroutine 能开的数量多几百倍。\n二、切换便宜：goroutine 之间的切换由 runtime 在用户态完成，只需要保存几个寄存器，不用进入操作系统内核。\n三、创建便宜：创建一个 goroutine 只是在 runtime 里分配一个小结构体。\n所以一个 Go 程序同时跑几万、几十万个 goroutine 都很常见。但要记住它的代价：goroutine 之间没有崩溃隔离，任何一个 goroutine 里没被 recover 的 panic，都会让整个程序退出。'},
  {title:'GMP：任务、工人和工位',body:'Go 的调度器用三个角色来安排工作，可以用“工厂”来理解：\nG（Goroutine）：一个个待完成的任务；\nM（Machine）：操作系统线程，真正干活的工人；\nP（Processor）：工位。每个工位上有一个自己的任务队列（本地队列），还有执行 Go 代码所需的资源，比如内存分配缓存。\n规则是：工人（M）必须坐到一个工位（P）上，才能从这个工位的队列里拿任务（G）来执行。\n工位的数量由 GOMAXPROCS 决定，默认等于 CPU 核数。它限制的是“同一时刻最多有几个 goroutine 在并行执行 Go 代码”，而不是 goroutine 的总数，也不是线程的总数。GOMAXPROCS=4 时照样可以创建 10 万个 goroutine，只是同一时刻最多 4 个在跑。'},
  {title:'动手试试：看看你的电脑有几个工位',body:'我们打印出 CPU 核数和 GOMAXPROCS，再一口气启动 1 万个 goroutine，看看 goroutine 的数量。前两行的数字取决于你的电脑，后两行应该和下面一样。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','运行前在终端设置环境变量 GOMAXPROCS=2（Windows PowerShell 写 $env:GOMAXPROCS=2，Mac 写 export GOMAXPROCS=2），再运行一次，看看第二行变成了多少。'],expect:'CPU 核数： 8\nGOMAXPROCS： 8\n启动前的 goroutine 数： 1\n启动后的 goroutine 数： 10001'},code:`package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    fmt.Println("CPU 核数：", runtime.NumCPU())
    fmt.Println("GOMAXPROCS：", runtime.GOMAXPROCS(0))
    fmt.Println("启动前的 goroutine 数：", runtime.NumGoroutine())
    for i := 0; i < 10000; i++ {
        go time.Sleep(time.Second)
    }
    fmt.Println("启动后的 goroutine 数：", runtime.NumGoroutine())
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'runtime 包可以查看运行时的状态。'},{at:'func main() {',text:'程序入口。'},{at:'fmt.Println("CPU 核数：", runtime.NumCPU())',text:'打印电脑的 CPU 逻辑核数。'},{at:'fmt.Println("GOMAXPROCS：", runtime.GOMAXPROCS(0))',text:'传 0 表示只查询不修改，返回当前 P 的数量，默认等于核数。'},{at:'fmt.Println("启动前的 goroutine 数：", runtime.NumGoroutine())',text:'现在只有 main 自己这一个 goroutine。'},{at:'for i := 0; i < 10000; i++ {',to:'go time.Sleep(time.Second)',text:'启动 1 万个 goroutine，每个都睡 1 秒。'},{at:'fmt.Println("启动后的 goroutine 数：", runtime.NumGoroutine())',text:'1 万个加上 main 自己，一共 10001 个，远远超过工位数，这完全没问题。'}]},
  {title:'调度流程：工人怎么找活干',body:'一个 M 坐在 P 上，每执行完一个 G，就要找下一个。大致顺序是：\n一、先看 P 的 runnext：一个“插队位”，刚被唤醒或新创建的 G 常放在这里，下一个就轮到它；\n二、再看 P 自己的本地队列；\n三、为了公平，每调度大约 61 次就去看一眼全局队列，防止全局队列里的 G 一直没人管；\n四、本地和全局都没有，就去看网络轮询器（等网络数据的 G 是否已经可以继续了）和到期的定时器；\n五、还是没活，就去别的 P 那里“偷”：一次拿走对方本地队列里一半的 G。这叫“工作窃取”，能让忙的 P 和闲的 P 自动均衡。\n新创建的 G 一般放进当前 P 的本地队列；本地队列满了（256 个），就把一半挪到全局队列。'},
  {title:'什么时候会换下一个 goroutine',body:'一个 G 在下面这些情况下会让出 M，让调度器换别的 G 来执行：\n一、G 执行完了；\n二、真的阻塞了：等 channel、等锁、time.Sleep、等网络数据。这时只把这个 G 挂起，M 和 P 马上去执行别的 G；\n三、主动让出：调用 runtime.Gosched()。它只是“让一下”，把自己放回队列，很快还会再被执行，并不会睡眠一段时间；\n四、运行太久被抢占：一个 G 连续运行超过约 10 毫秒，就会被强行打断，给别人机会。\n另外，在 select 里想要“1 秒超时”，就用 case <-time.After(time.Second)，等待超时的过程中 G 也是挂起状态，不占 M。'},
  {title:'系统调用：工人被卡住时，工位交给别人',body:'有些操作要请操作系统帮忙，叫“系统调用”，比如读写文件。如果这个调用要等很久（阻塞的系统调用），执行它的 M（线程）会被操作系统卡住，什么都干不了。\n如果 P 也跟着一起等，这个工位上排队的其他 G 就全都被耽误了。所以 runtime 会把 P 从这个被卡住的 M 身上解开，交给另一个空闲的 M（没有就新建一个）继续执行队列里的 G。等系统调用返回后，原来的 M 再去找一个空闲的 P，找不到就把 G 放回队列，自己休息。\n这也是 Go 程序里线程数可能比 GOMAXPROCS 多的原因：一部分线程正卡在系统调用里。\n网络读写不一样：Go 用网络轮询器（Linux 上基于 epoll）处理，等待网络时只挂起 G，不会卡住 M。'},
  {title:'抢占：防止一个 goroutine 霸占 CPU',body:'假如某个 G 在跑一个很长的循环，里面没有函数调用、没有 channel、也不阻塞，它就一直不会主动让出 CPU，同一个 P 上的其他 G 全都饿着，垃圾回收也可能因为等不到它停下而卡住。\nGo 1.14 之前，抢占只能发生在函数调用的地方，这种纯计算的死循环抢占不了。\nGo 1.14 引入了“异步抢占”：runtime 里有一个后台监控线程（sysmon），发现某个 G 连续运行超过约 10 毫秒，就给它所在的线程发一个信号，强行打断，让调度器换别的 G 上来。所以现在即使是没有函数调用的死循环，也能被抢占。',code:`go func() {
    for {
        counter++
    }
}()

for i := 0; i < 3; i++ {
    runtime.Gosched()
    fmt.Println("main 仍然能运行", i)
}`,explain:[{at:'go func() {',text:'启动一个 goroutine。'},{at:'for {',to:'counter++',text:'一个没有任何函数调用的死循环。Go 1.14 之前它可能一直霸占 CPU；现在运行约 10 毫秒就会被异步抢占。'},{at:'for i := 0; i < 3; i++ {',text:'main 循环 3 次。'},{at:'runtime.Gosched()',text:'main 主动让出一下 CPU，把自己放回队列，过一会儿又会被调度回来。它不是睡眠，没有固定的等待时间。'},{at:'fmt.Println("main 仍然能运行", i)',text:'因为有抢占，即使只有一个 P，main 也一定有机会继续运行。'}]},
  {title:'把 GMP 串起来讲一遍',body:'面试被问“简述 GMP 调度流程”，可以这样回答：\n一、G 是 goroutine，M 是操作系统线程，P 是执行 Go 代码所需的资源和本地队列，数量由 GOMAXPROCS 决定；M 必须绑定 P 才能执行 G。\n二、go 语句创建 G，放进当前 P 的本地队列（或 runnext），本地满了就分一半到全局队列。\n三、M 循环找 G 执行：runnext → 本地队列 → 定期检查全局队列 → 网络轮询器 → 从其他 P 偷一半。\n四、G 阻塞在 channel、锁、网络上时只挂起 G，M 继续执行别的 G；阻塞的系统调用会把 P 交给别的 M。\n五、sysmon 后台线程负责抢占运行太久的 G、回收卡在系统调用里的 P 等工作。'}
 ],quiz:[
  {id:'go-runtime-1',type:'judge',q:'go build 会顺带执行一遍 main 和 init 函数来检查程序。',answer:false,explain:'go build 只编译和链接，不会运行 main 或 init；想看工具调用细节可以加 -x。',interview:'q-3fcd2ed322ebe27c'},
  {id:'go-runtime-2',q:'main 函数返回时，还在运行的其他 goroutine 会怎样？',options:['main 会等它们全部执行完','随进程结束，defer 也不执行','自动转到后台继续运行','程序会报错并异常退出'],why:['main 返回即进程结束，不会等待其他 goroutine。','','Go 没有“后台继续运行”的机制。','这是正常退出，不会报错。'],answer:1,explain:'需要等待时用 WaitGroup、errgroup 或 channel。',interview:'q-333f00e6d884d3f8'},
  {id:'go-runtime-3',q:'GMP 中的 P 代表什么？',options:['一个操作系统进程','调度资源，带本地运行队列','一个正在运行的 goroutine','一个物理 CPU 核心'],why:['Go 程序就是一个进程，GMP 描述的是进程内部的调度。','','goroutine 是 G。','P 的数量默认等于 CPU 核数，但它不是 CPU 本身。'],answer:1,explain:'P 是 Processor，持有本地可运行队列等调度状态；M 必须拿到 P 才能执行 Go 代码。',interview:'q-9799fca0cc7b0d43'},
  {id:'go-runtime-4',type:'judge',q:'GOMAXPROCS=4 表示程序最多只能创建 4 个 goroutine。',answer:false,explain:'GOMAXPROCS 决定 P 的数量，即同时执行 Go 代码的并行度；goroutine 数量不受它限制，线程数也可能超过它。',interview:'q-9799fca0cc7b0d43'},
  {id:'go-runtime-5',q:'P 的本地队列空了，M 一般会怎么做？',options:['立刻销毁当前这个线程','查全局队列后去别的 P 偷任务','直接结束整个程序的运行','挂起并等待用户的输入'],why:['线程会被复用，找不到任务时先自旋再休眠，而不是立即销毁。','','本地队列空不代表程序没有任务。','调度与用户输入无关。'],answer:1,explain:'找不到活时会依次检查全局队列、网络轮询器、定时器，并从其他 P 窃取任务，实在没活才休眠。',interview:'q-a2ed53373aac9bdd'},
  {id:'go-runtime-6',q:'工作窃取时，常见做法是从别的 P 拿走多少任务？',options:['一个','大约一半','全部','正在执行的那个'],why:['只偷一个效率低，很快又要再去偷。','','全部拿走会让对方立刻没活可干。','正在别的 M 上执行的 G 不会被偷走。'],answer:1,explain:'“偷一半”是常见实现行为，不是语言保证。',interview:'q-c1b29358f7aa962f'},
  {id:'go-runtime-7',type:'multi',q:'哪些情况会让当前 goroutine 让出执行？（多选）',options:['channel 接收时没有数据而阻塞','调用 runtime.Gosched()','执行一次普通的加法运算','运行时间太长被抢占'],why:['','','一次普通运算不会让出 CPU。',''],answers:[0,1,3],explain:'阻塞、主动让出、被抢占都会切换；一次普通运算或函数调用不必然切换。',interview:'q-320610842e622d30'},
  {id:'go-runtime-8',q:'一个 goroutine 进入阻塞的系统调用时，它的 P 会怎样？',options:['跟着这个 M 一起卡住','交给其他 M 继续调度','这个 P 会被销毁回收','P 被转换成全局队列'],why:['P 可以被移交出去，这正是 GMP 设计的目的之一。','','P 的数量固定，不会被销毁。','P 是调度资源，不是队列。'],answer:1,explain:'系统调用占住 M，但 P 被移交出去继续调度；系统调用返回后，原来的 G 再去争取 P 或排队。',interview:'q-cba90ec136457684'},
  {id:'go-runtime-9',q:'想在 select 里设置“1 秒超时”，应该用？',options:['time.Sleep(time.Second)','case <-time.After(time.Second):','case <-runtime.Gosched():','default: time.Sleep(time.Second)'],why:['Sleep 只会让当前 goroutine 睡着，不能和其他 case 竞争。','','Gosched 没有返回值，不是 channel，不能用在 case 中。','default 会在其他分支都没就绪时立即执行，睡 1 秒后不会再回头等待其他分支。'],answer:1,explain:'time.After 返回一个 channel，到时会收到值，可以和其他 case 竞争；Sleep 只会让当前 goroutine 睡着。',interview:'q-ee5d553586716d4b'},
  {id:'go-runtime-10',type:'judge',q:'一个 goroutine 里没有被 recover 的 panic，只会结束这个 goroutine，不影响整个程序。',answer:false,explain:'goroutine 没有崩溃隔离，未恢复的 panic 会让整个 Go 进程退出。',interview:'q-83f6a75a931c18df'},
  {id:'go-runtime-11',type:'short',q:'简述 GMP 的调度流程。',reference:'M 绑定一个 P 后寻找可运行的 G：通常优先取 runnext 和 P 的本地队列，并定期检查全局队列保证公平；本地没有时检查网络轮询、定时器，并尝试从其他 P 窃取一半任务。G 阻塞、退出或被抢占后，M 再继续找下一个；完全没有工作时 M 和 P 进入休眠。新 G 一般进入当前 P 的本地队列，满了转移一批到全局队列。',points:['M 绑定 P 才能执行 G','本地队列优先，定期看全局','网络轮询与工作窃取','阻塞/退出/抢占后继续找'],explain:'按“从哪里取 G”这条线讲清楚即可，真实分支更多。',interview:'q-a2ed53373aac9bdd'},
  {id:'go-runtime-12',q:'Go 1.14 引入的异步抢占解决了什么问题？',options:['goroutine 数量太多','无函数调用的循环霸占线程','程序发生内存泄漏','GC 运行太慢'],why:['goroutine 数量多是正常的，与抢占机制无关。','','内存泄漏与调度抢占无关。','GC 本身不是问题，问题是 STW 时紧密循环迟迟不停下。'],answer:1,explain:'以前只在函数调用等安全点检查抢占，纯计算循环可能长时间不让出；异步抢占用信号打断它。',interview:'q-320610842e622d30'},
  {id:'go-runtime-13',type:'judge',q:'runtime.Gosched() 会让当前 goroutine 睡眠一段时间。',answer:false,explain:'Gosched 只是主动让出 CPU，当前 G 仍是可运行状态，回去排队；Sleep 才是等待定时器。',interview:'q-320610842e622d30'},
  {id:'go-runtime-14',q:'goroutine 的初始栈大概有多大？',options:['几 KB，可按需增长','固定 8MB','1GB','和线程一样大且不能变'],why:['','8MB 是常见的线程默认栈大小，goroutine 小得多。','1GB 是 64 位平台上 goroutine 栈的最大上限，而不是初始大小。','goroutine 栈会按需扩缩，这是它比线程轻的原因之一。'],answer:0,explain:'goroutine 初始栈只有几 KB，不够时由 runtime 扩容，这是它比线程轻的原因之一。',interview:'q-83f6a75a931c18df'},
  {id:'go-runtime-15',type:'fill',q:'查看编译过程中实际调用了哪些工具，可以给 go build 加参数 ____。',accepted:['-x','x'],explain:'-x 打印执行的命令；-work 保留临时构建目录。',interview:'q-3fcd2ed322ebe27c'},
 ]},
 {id:'go-gc',title:'内存管理与 GC',summary:'对象放栈还是堆，GC 怎么工作、何时触发，怎么分析',lessons:[
  {title:'这一关学什么：内存是谁分配、谁回收的',body:'程序运行时会不断地创建数据，用完的数据占着的内存要还回去，不然内存迟早用光。C 语言要程序员自己手动释放，Go 则有一个“垃圾回收器”（GC，Garbage Collector）自动找出不再使用的数据并回收。\n这一关讲：\n一、数据放在哪：栈还是堆，由编译器的“逃逸分析”决定；\n二、Go 的 GC 是怎么工作的：并发标记清扫、三色标记、写屏障；\n三、GC 什么时候触发，怎么调；\n四、有了 GC 为什么还会内存泄漏，怎么排查。'},
  {title:'栈和堆：草稿纸和仓库',body:'程序的内存主要有两块地方放数据：\n栈：每个函数调用都有一块自己的“草稿纸”，函数里的局部变量就写在上面。函数一返回，整张草稿纸直接作废，不需要任何回收工作，所以又快又便宜。\n堆：一个公共的“仓库”。放在这里的数据不跟着某个函数走，可以活得更久，但用完以后需要 GC 来找出并回收，有额外的成本。\n所以从性能上说，能放栈上的数据尽量放栈上。在 Go 里你不用自己决定放哪，编译器会自动判断。'},
  {title:'逃逸分析：编译器决定放栈还是放堆',body:'编译器在编译时会分析每个变量：如果它在函数返回后还可能被用到，就不能放在函数的栈上（栈会作废），只能“逃逸”到堆上。这个分析过程叫逃逸分析。\n最典型的例子是返回局部变量的地址。在 C 语言里这是严重的 bug（返回的指针指向已经作废的栈）；但在 Go 里完全合法、很常见，因为编译器发现 u 会被外面用到，会自动把它放到堆上。\n下面这些情况变量通常会逃逸：被返回了地址；被赋值给全局变量；被 goroutine 里的闭包引用；被转换成接口类型传出去（比如传给 fmt.Println）；大小在编译时不确定或者太大。',code:`func newUser() *User {
    u := User{Name: "Tom"}
    return &u
}

func sum() int {
    nums := [3]int{1, 2, 3}
    return nums[0] + nums[1] + nums[2]
}`,explain:[{at:'func newUser() *User {',text:'返回一个 User 指针的函数。'},{at:'u := User{Name: "Tom"}',text:'创建一个局部变量 u。'},{at:'return &u',text:'把 u 的地址返回出去，函数结束后外面还要用它，所以 u 逃逸到堆上。这在 Go 里是安全的。'},{at:'func sum() int {',text:'另一个函数。'},{at:'nums := [3]int{1, 2, 3}',text:'局部数组 nums 只在函数内部使用，不会被外面引用，可以放在栈上。'},{at:'return nums[0] + nums[1] + nums[2]',text:'返回的是计算结果（一个值），不是 nums 的地址，函数结束时 nums 随栈一起作废。'}]},
  {title:'动手试试：让编译器告诉你谁逃逸了',body:'加上 -gcflags=-m 参数编译，编译器会把它的判断打印出来：哪些函数被内联了，哪些变量被移到了堆上。这比靠猜可靠得多。',practice:{steps:['确认装好了 Go（终端输入 go version）。','新建文件夹和 main.go，把下面的代码复制进去保存。','在这个文件夹里运行 go build -gcflags=-m main.go，看看输出。行号和列号可能和下面略有不同，重点找 “moved to heap: u” 这一行。','找一找有没有关于 nums 的输出：没有提到它，说明它留在了栈上。'],expect:'./main.go:9:6: can inline newUser\n./main.go:14:6: can inline sum\n./main.go:10:5: moved to heap: u\n./main.go:21:18: u.Name escapes to heap'},code:`package main

import "fmt"

type User struct {
    Name string
}

func newUser() *User {
    u := User{Name: "Tom"}
    return &u
}

func sum() int {
    nums := [3]int{1, 2, 3}
    return nums[0] + nums[1] + nums[2]
}

func main() {
    u := newUser()
    fmt.Println(u.Name, sum())
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头。'},{at:'type User struct {',to:'Name string',text:'一个只有名字字段的结构体。'},{at:'func newUser() *User {',to:'return &u',text:'上一张卡片的例子：u 的地址被返回，输出里会看到 moved to heap: u。'},{at:'func sum() int {',to:'return nums[0] + nums[1] + nums[2]',text:'nums 没有逃逸，输出里不会提到它。can inline 表示这两个小函数都会被内联。'},{at:'func main() {',text:'程序入口。'},{at:'u := newUser()',text:'调用 newUser。'},{at:'fmt.Println(u.Name, sum())',text:'传给 fmt.Println 的参数会被转换成接口类型，所以输出里会看到 u.Name escapes to heap。'}]},
  {title:'少逃逸，少分配',body:'逃逸到堆上的数据越多，GC 要做的工作就越多。写性能敏感的代码时可以注意：\n一、小结构体直接返回值，而不是返回指针；\n二、切片事先知道大小就用 make 预留好容量，避免反复扩容分配；\n三、频繁创建又丢弃的临时对象，可以用 sync.Pool 复用。\n但不要凭感觉优化。先用 -gcflags=-m 看逃逸情况，再用 benchmark（基准测试）的 -benchmem 参数看每次操作分配了几次内存，确认真的有改善再改。大部分业务代码不需要在这上面花心思。'},
  {title:'两种 GC 思路：数引用和顺藤摸瓜',body:'自动回收垃圾，主要有两种思路：\n一、引用计数：每个对象记着“有几个人在用我”，降到 0 就立刻回收。简单直接，但两个对象互相引用时，计数永远不会归零，回收不掉。\n二、追踪式：定期从“根”出发，顺着指针把所有还能找到的对象都标记一遍，找不到的就是垃圾。“根”是一定还在用的东西：全局变量、每个 goroutine 栈上的变量。\nGo 用的是追踪式中的“标记-清扫”：先标记所有活着的对象，再把没标记的清扫掉。'},
  {title:'Go 的 GC：边干活边回收',body:'Go 的 GC 有几个特点：\n一、并发：标记工作和你的业务代码同时进行，而不是让程序停下来专心回收。整轮 GC 只在开始和标记结束时，有两段非常短的“全部暂停”（STW，Stop The World），通常不到 1 毫秒；\n二、不分代：有的语言（比如 Java）把对象按“年龄”分成新生代、老年代分别回收，Go 不这么做；\n三、不搬动对象：回收后不会把活着的对象挪到一起整理碎片。\n这样设计的目标是让暂停时间尽量短，适合对响应速度要求高的服务端程序。代价是 GC 会占用一部分 CPU（默认目标大约 25%）。'},
  {title:'三色标记：白、灰、黑',body:'标记过程用三种颜色给对象分类：\n白色：还没被发现。一开始所有对象都是白色；\n灰色：已经被发现是活的，但它引用的其他对象还没检查完；\n黑色：它自己是活的，它引用的对象也都检查过了。\n过程是：先把所有根直接引用的对象标成灰色；然后不断取出一个灰色对象，把它引用的白色对象标成灰色，再把它自己标成黑色；直到没有灰色对象为止。这时剩下的白色对象，就是从根出发怎么都找不到的垃圾，可以清扫掉。\n可以想成“顺藤摸瓜”：灰色是摸到了但还没顺着往下摸的瓜，黑色是摸完的瓜，白色是没摸到的。'},
  {title:'写屏障：防止边改边标时漏掉对象',body:'因为标记和业务代码同时进行，标记过程中业务代码还在修改指针。可能出现这种情况：一个黑色对象（已经检查完，不会再看）新指向了一个白色对象，同时原来指向这个白色对象的灰色对象断开了引用。这个白色对象明明还在用，却再也不会被扫到，会被错误地回收，程序就出错了。\n写屏障就是为了防止这种漏标：在标记阶段，每次修改指针时，编译器插入的一小段额外代码会把相关对象记录下来、标成灰色，保证它们会被检查到。Go 1.8 起用的是“混合写屏障”。\n另外，标记阶段新分配的对象直接标成黑色，这一轮不会被回收。'},
  {title:'什么时候触发 GC：GOGC 和 GOMEMLIMIT',body:'GC 主要按堆的增长来触发。GOGC 环境变量控制这个节奏，默认 100，意思是：堆增长到上一轮 GC 后存活数据的 2 倍（增长 100%）时，开始下一轮。比如上一轮后活着 100MB，就在堆达到大约 200MB 时触发。\n把 GOGC 调到 200，就是长到 3 倍才回收：GC 次数变少、CPU 省了，但占用的内存变多。设成 off 则完全关闭按比例触发。\nGOMEMLIMIT 是 Go 1.19 加入的“软内存上限”：内存接近这个值时，GC 会更积极地回收。它是“软”的，不是硬上限，超过了也不会马上崩溃退出，只是 GC 会更频繁。在容器里跑程序时，常把它设成容器内存限制的 90% 左右。\n另外，两分钟没有 GC 会强制来一次；也可以手动调用 runtime.GC()。'},
  {title:'有 GC 也会内存泄漏',body:'GC 只能回收“没人引用”的对象。只要还有引用，哪怕你再也不会用它，GC 也不会动。常见的泄漏情况：\n一、全局 map 或缓存只往里加、从不删除；\n二、从大字符串或大切片里截一小段长期保存，拽住了整块内存；\n三、goroutine 泄漏：goroutine 卡在一个永远等不到数据的 channel 上，永远不退出，它引用的所有数据也都回收不掉；\n四、定时器、连接等资源用完没有关闭。\n排查方法：用 GODEBUG=gctrace=1 运行程序，每轮 GC 会打印耗时和堆大小的变化；用 pprof 抓取堆内存快照（heap profile），看是哪段代码分配的内存还活着；goroutine profile 可以看 goroutine 数量有没有一直涨。\n治理要从源头下手：删掉无用的引用、缩短引用的生命周期、给缓存加上限。定时手动调用 runtime.GC() 解决不了问题，因为对象还被引用着，GC 也回收不了。',code:`import _ "net/http/pprof"

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()

// 终端里：
// GODEBUG=gctrace=1 ./app
// go tool pprof http://localhost:6060/debug/pprof/heap`,explain:[{at:'import _ "net/http/pprof"',text:'导入 pprof 包。下划线表示只需要它的初始化效果：它会自动注册 /debug/pprof/ 这些查看性能数据的网址。'},{at:'go func() {',text:'在后台启动一个只给自己看的 HTTP 服务。'},{at:'log.Println(http.ListenAndServe("localhost:6060", nil))',text:'在本机 6060 端口提供 pprof 数据。只监听 localhost，别暴露到公网。注释里是两条常用命令：gctrace 打印每轮 GC 的情况，go tool pprof 分析堆内存。'}]},
  {title:'动手试试：引用还在，GC 就回收不了',body:'我们往一个全局变量里放 100MB 数据，手动触发 GC，看看内存能不能降下来；再把全局变量清空，再触发一次 GC 对比。这就是“有 GC 也会泄漏”的根本原因。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 cache = nil 这一行删掉再运行，看看第二行变成了什么。'],expect:'还被引用，回收不掉： true\n去掉引用后被回收： true\nGC 次数大于 0： true'},code:`package main

import (
    "fmt"
    "runtime"
)

var cache [][]byte

func heapMB() uint64 {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    return m.HeapAlloc / 1024 / 1024
}

func main() {
    for i := 0; i < 100; i++ {
        cache = append(cache, make([]byte, 1<<20))
    }
    runtime.GC()
    fmt.Println("还被引用，回收不掉：", heapMB() >= 100)
    cache = nil
    runtime.GC()
    fmt.Println("去掉引用后被回收：", heapMB() < 10)
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    fmt.Println("GC 次数大于 0：", m.NumGC > 0)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"runtime"',text:'导入 fmt 和 runtime。'},{at:'var cache [][]byte',text:'一个全局变量，模拟一个只加不删的缓存。全局变量是 GC 的“根”之一。'},{at:'func heapMB() uint64 {',text:'一个小工具：返回当前堆上活着的数据有多少 MB。'},{at:'var m runtime.MemStats',to:'runtime.ReadMemStats(&m)',text:'读取运行时的内存统计信息。'},{at:'return m.HeapAlloc / 1024 / 1024',text:'HeapAlloc 是堆上已分配且还没回收的字节数，换算成 MB。'},{at:'func main() {',text:'程序入口。'},{at:'for i := 0; i < 100; i++ {',to:'cache = append(cache, make([]byte, 1<<20))',text:'分配 100 块、每块 1MB（1<<20 字节）的数据，全部放进全局 cache。'},{at:'runtime.GC()',text:'手动触发一次完整的 GC。'},{at:'fmt.Println("还被引用，回收不掉：", heapMB() >= 100)',text:'这 100MB 都还被 cache 引用着，GC 一点也回收不了，所以打印 true。'},{at:'cache = nil',text:'去掉引用：这 100 块数据从根出发再也找不到了，变成了垃圾。'},{at:'runtime.GC()',text:'再触发一次 GC。'},{at:'fmt.Println("去掉引用后被回收：", heapMB() < 10)',text:'这次全部被回收，堆一下子降到几 MB 以内，打印 true。'},{at:'var m runtime.MemStats',to:'fmt.Println("GC 次数大于 0：", m.NumGC > 0)',text:'NumGC 记录一共做了几轮 GC，这里至少有我们手动触发的 2 轮。'}]}
 ],quiz:[
  {id:'go-gc-1',type:'judge',q:'在 Go 里返回局部变量的地址是危险的，会得到悬空指针。',answer:false,explain:'Go 的逃逸分析会把这类变量放到堆上，返回它的地址是安全的。',interview:'q-8128966a2c96a4cc'},
  {id:'go-gc-2',type:'fill',q:'查看编译器的逃逸分析结果，可以用 go build -gcflags=____。',accepted:['-m','-m=2','"-m"','\'-m\'','-m -m'],explain:'-m 输出优化决策，-m=2 更详细。结论要结合 benchmark 的 allocs/op 验证。',interview:'q-8128966a2c96a4cc'},
  {id:'go-gc-3',q:'Go 的堆 GC 属于哪一种？',options:['引用计数回收','分代复制回收','并发标记清扫','手动调用 free'],why:['引用计数无法处理循环引用，Go 不使用。','Go 的 GC 不分代也不复制移动对象，这是 JVM 等的常见设计。','','Go 没有手动 free。'],answer:2,explain:'Go 采用并发追踪式标记和清扫，不分代、不移动对象。',interview:'q-defad805e1383e94'},
  {id:'go-gc-4',type:'judge',q:'Go 的一轮 GC 从头到尾都要暂停所有业务代码。',answer:false,explain:'只有开启写屏障前和标记终止时两段短暂的 STW，标记和清扫大部分时间与业务并发进行。',interview:'q-47c68700a4e49401'},
  {id:'go-gc-5',q:'三色标记中，“灰色”表示？',options:['已经确认是垃圾的对象','已发现但引用未扫完','引用全部扫描完成的对象','刚刚新分配出来的对象'],why:['标记结束后仍为白色的对象才是垃圾。','','扫描完成的是黑色。','颜色与对象新旧无关，标记期间新分配的对象直接标为黑色。'],answer:1,explain:'白色未发现、灰色待扫描、黑色已扫描完；标记结束时剩下的白色对象可以回收。',interview:'q-b1c743761d552ac8'},
  {id:'go-gc-6',q:'写屏障在并发标记中的作用是？',options:['加快内存分配速度','记录指针变化，防止漏标','暂停所有 goroutine','把对象搬到新空间'],why:['写屏障会带来少量开销，不会加快分配。','','写屏障的目的正是避免长时间暂停，让标记和业务并发进行。','Go 的 GC 不移动对象。'],answer:1,explain:'标记期间业务还在改引用，混合写屏障保证不会有活着的对象被“藏”起来误删。',interview:'q-b1c743761d552ac8'},
  {id:'go-gc-7',q:'GOGC 默认值是多少？',options:['50','100','200','0'],why:['默认值不是 50。','','默认值不是 200。','GOGC=0 会让 GC 几乎不停地运行；关闭要写 GOGC=off。'],answer:1,explain:'GOGC=100 表示新分配量大约达到上一轮存活堆大小时触发下一次 GC。',interview:'q-3ff9ea5bb93469b8'},
  {id:'go-gc-8',type:'judge',q:'GOMEMLIMIT 是硬上限，超过就会立刻 OOM 退出。',answer:false,explain:'GOMEMLIMIT 是软限制，约束 runtime 管理的内存，接近时 GC 会更积极；它不等于进程 RSS 或容器硬上限。',interview:'q-3ff9ea5bb93469b8'},
  {id:'go-gc-9',type:'multi',q:'哪些情况容易造成 Go 程序的内存泄漏？（多选）',options:['全局缓存只加不删','goroutine 阻塞后一直不退出','大字符串截取小子串长期保存','Ticker 不 Stop 且一直被引用'],why:['','','',''],answers:[0,1,2,3],explain:'这些都是“业务不用了但仍被引用”；普通局部变量在函数结束后不再被引用，可以回收。',interview:'q-d41a25b004023e30'},
  {id:'go-gc-10',q:'想看每一轮 GC 的耗时和堆大小变化，最直接的方法是？',options:['用 GODEBUG=gctrace=1 运行程序','在代码里反复调用 runtime.GC()','把 GOGC 设为 off 后观察内存','观察服务器的 CPU 温度变化'],why:['','手动触发 GC 会改变程序本来的 GC 行为，而且看不到每轮的耗时。','关闭 GC 后就没有 GC 可以观察了。','CPU 温度与 GC 的耗时和堆变化无关。'],answer:0,explain:'gctrace=1 会输出每轮 GC 的阶段耗时和堆变化；再结合 heap profile、runtime/metrics 分析。',interview:'q-ade7587e017cd344'},
  {id:'go-gc-11',type:'judge',q:'标记阶段新分配的对象会被当作已标记（黑色），这一轮不会被回收。',answer:true,explain:'这样保证正在使用的新对象不会被误删，它们要等下一轮 GC 再判断。',interview:'q-b1c743761d552ac8'},
  {id:'go-gc-12',q:'把 GOGC 从 100 调到 200，通常会怎样？',options:['GC 更频繁、内存占用更少','GC 次数减少、内存占用变高','对 GC 和内存都没有影响','程序因内存不足而崩溃'],why:['方向反了：GOGC 越大，触发越晚、次数越少。','','GOGC 直接决定下一次 GC 的触发目标。','只要内存足够，调大 GOGC 只会占用更多内存，不会崩溃。'],answer:1,explain:'GOGC 越大，允许堆长得越多才触发下一轮，GC CPU 开销降低，内存占用升高。',interview:'q-3ff9ea5bb93469b8'},
  {id:'go-gc-13',q:'下面哪种情况，变量 u 很可能逃逸到堆上？',options:['u 只在函数内部使用','函数返回 &u','u 是一个 int 常量','u 按值传给另一个函数'],why:['只在函数内使用的变量通常可以留在栈上。','','常量不是变量，不存在逃逸问题。','按值传递会复制一份，u 本身不需要逃逸。'],answer:1,explain:'返回指针后 u 的生命周期超出了当前函数，编译器会把它分配到堆上；可以用 go build -gcflags=-m 查看。',interview:'q-8128966a2c96a4cc'},
  {id:'go-gc-14',type:'judge',q:'内存一直涨，最好的办法是在代码里定时调用 runtime.GC()。',answer:false,explain:'手动 GC 治标不治本，内存涨多半是还有引用没释放；先用 heap profile 找到谁拽着内存。',interview:'q-ade7587e017cd344'},
 ]},
 {id:'go-concurrency',title:'并发编程实战',summary:'原子操作、锁的选择、并发控制、channel 用法和常见坑',lessons:[
  {title:'这一关学什么：把并发写对、写稳',body:'前面学了 goroutine、channel、锁这些工具。这一关讲实战中怎么选、怎么用，以及最容易踩的坑：\n一、原子操作和锁怎么选；\n二、怎么控制同时运行的 goroutine 数量，怎么限速；\n三、channel 该由谁关闭，goroutine 怎么避免“泄漏”；\n四、闭包捕获循环变量的老坑；\n五、用 singleflight 合并重复请求，用 errgroup 管理一组任务，以及服务怎么优雅退出。'},
  {title:'原子操作：一步完成、不会被打断',body:'count++ 其实是“读出、加一、写回”三步，多个 goroutine 同时做就会丢更新。除了加锁，还有一种更轻量的办法：原子操作。\n“原子”的意思是这个操作由 CPU 保证一步完成，中途不会被别的 goroutine 插进来。Go 的 sync/atomic 包提供了 atomic.Int64、atomic.Bool、atomic.Pointer 等类型。\n注意要用它提供的组合操作，比如 Add。如果写成 count.Store(count.Load()+1)，Load 和 Store 各自是原子的，但两步之间仍然可能被别人插进来，照样会丢更新。\nCAS（CompareAndSwap，比较并交换）是另一个常用操作：“如果现在的值等于我预期的旧值，就换成新值，并返回 true；否则什么都不做，返回 false”。',code:`var count atomic.Int64
count.Add(1)
fmt.Println(count.Load())

// count.Store(count.Load() + 1) // 错误：两步之间可能被插队

var flag atomic.Bool
if flag.CompareAndSwap(false, true) {
    fmt.Println("只有第一个调用者能进来")
}`,explain:[{at:'var count atomic.Int64',text:'一个原子整数，零值就是 0，可以直接用。'},{at:'count.Add(1)',text:'原子地加一，多个 goroutine 同时调用也不会丢。'},{at:'fmt.Println(count.Load())',text:'原子地读出当前值。'},{at:'var flag atomic.Bool',text:'一个原子布尔值，初始为 false。'},{at:'if flag.CompareAndSwap(false, true) {',text:'CAS：如果现在是 false 就改成 true 并返回 true。多个 goroutine 同时调用，只有一个能成功。'},{at:'fmt.Println("只有第一个调用者能进来")',text:'常用来实现“只执行一次”的初始化或开关。'}]},
  {title:'atomic.Pointer：安全地发布新配置',body:'一个常见场景：程序运行时要热更新配置，很多 goroutine 在不停地读配置，偶尔有一个 goroutine 要换上新配置。\n用 atomic.Pointer 的做法是：先在旁边完整地构造好一份新配置，然后用 Store 一次性把指针换成新的；读的一方用 Load 拿到指针后直接用。\n关键规则：配置一旦发布出去，就当它是只读的，再也不要修改它的字段；想改就再构造一份新的。这样读的一方要么拿到完整的旧配置，要么拿到完整的新配置，绝不会看到改了一半的数据。',code:`type Config struct {
    Timeout time.Duration
    Hosts   []string
}

var current atomic.Pointer[Config]

func reload(timeout time.Duration, hosts []string) {
    c := &Config{Timeout: timeout, Hosts: hosts}
    current.Store(c)
}

func timeout() time.Duration {
    return current.Load().Timeout
}`,explain:[{at:'type Config struct {',to:'Hosts   []string',text:'一份配置：超时时间和一组服务器地址。'},{at:'var current atomic.Pointer[Config]',text:'一个原子指针，指向当前正在使用的配置。'},{at:'func reload(timeout time.Duration, hosts []string) {',text:'热更新配置的函数。'},{at:'c := &Config{Timeout: timeout, Hosts: hosts}',text:'第一步：构造一份全新的、完整的配置。'},{at:'current.Store(c)',text:'第二步：一次性把指针换成新配置。之后不再修改 c 的任何字段。'},{at:'func timeout() time.Duration {',to:'return current.Load().Timeout',text:'读取方：Load 拿到当前配置的指针，直接读字段。'}]},
  {title:'原子操作还是锁：看要保护什么',body:'只保护一个独立的变量，比如计数器、开关、配置指针，用原子操作，简单又快。\n要保护的是“一整段流程”或者“好几个变量之间的关系”，就必须用锁。最典型的例子是“余额够才扣款”：先读余额、判断够不够、再扣减，这三步必须作为一个整体，中间不能被别人插进来。只把余额换成原子类型也没用，因为两个请求可能同时判断“够”，然后都扣了。\n另外，原子操作不一定总比锁快。很多 goroutine 激烈地争抢同一个变量时，CAS 会频繁失败、反复重试，性能反而可能更差。',code:`type Account struct {
    mu      sync.Mutex
    balance int
}

func (a *Account) Withdraw(n int) bool {
    a.mu.Lock()
    defer a.mu.Unlock()
    if a.balance < n {
        return false
    }
    a.balance -= n
    return true
}`,explain:[{at:'type Account struct {',to:'balance int',text:'一个账户：一把锁和余额。'},{at:'func (a *Account) Withdraw(n int) bool {',text:'扣款 n 元，成功返回 true。'},{at:'a.mu.Lock()',to:'defer a.mu.Unlock()',text:'整个“判断 + 扣减”都在锁里完成。'},{at:'if a.balance < n {',to:'return false',text:'余额不够，扣款失败。'},{at:'a.balance -= n',to:'return true',text:'余额够就扣减。因为在锁里，判断和扣减之间不会有别人插进来，不会扣成负数。'}]},
  {title:'乐观锁、悲观锁和 Mutex 的两种模式',body:'悲观锁：认为冲突经常发生，所以先拿锁再干活，别人只能等。sync.Mutex 就是悲观锁，虽然它内部用 CAS 来实现“拿锁”这个动作，但不改变它“先锁后做”的性质。\n乐观锁：认为冲突很少，先不加锁直接干，提交时再检查有没有人改过（比如用 CAS 或者数据库里的版本号），有冲突就重试。\nsync.Mutex 内部有两种模式：\n正常模式：锁被释放时，被唤醒的等待者要和刚好新来的 goroutine 一起抢锁。新来的正在 CPU 上运行，通常更容易抢到，这样整体吞吐量高；\n饥饿模式：如果某个等待者等了超过约 1 毫秒还没拿到，锁就切换到饥饿模式：释放时直接把锁交给排在最前面的等待者，新来的一律排到队尾。等待队列清空或等待时间变短后，再切回正常模式。'},
  {title:'动手试试：原子计数和 CAS',body:'1000 个 goroutine 同时用原子操作加一，结果一定是 1000，不需要锁。再试试 CAS：预期值对得上才能换，对不上就失败。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 count.Add(1) 改成 count.Store(count.Load() + 1)，多运行几次，看看结果还是不是每次都是 1000。'],expect:'原子加一的结果： 1000\n第一次 CAS： true\n第二次 CAS： false\n现在的值： 10'},code:`package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    var count atomic.Int64
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            count.Add(1)
        }()
    }
    wg.Wait()
    fmt.Println("原子加一的结果：", count.Load())

    var v atomic.Int64
    v.Store(5)
    fmt.Println("第一次 CAS：", v.CompareAndSwap(5, 10))
    fmt.Println("第二次 CAS：", v.CompareAndSwap(5, 20))
    fmt.Println("现在的值：", v.Load())
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"sync/atomic"',text:'导入 fmt、sync 和 sync/atomic。'},{at:'func main() {',text:'程序入口。'},{at:'var count atomic.Int64',to:'var wg sync.WaitGroup',text:'一个原子计数器和一个 WaitGroup。'},{at:'for i := 0; i < 1000; i++ {',to:'count.Add(1)',text:'启动 1000 个 goroutine，每个原子地加一，没有加锁。'},{at:'wg.Wait()',to:'fmt.Println("原子加一的结果：", count.Load())',text:'等全部完成，结果一定是 1000。'},{at:'var v atomic.Int64',to:'v.Store(5)',text:'另一个原子整数，先设成 5。'},{at:'fmt.Println("第一次 CAS：", v.CompareAndSwap(5, 10))',text:'现在是 5，和预期的 5 一样，换成 10，返回 true。'},{at:'fmt.Println("第二次 CAS：", v.CompareAndSwap(5, 20))',text:'现在已经是 10，和预期的 5 不一样，什么都不做，返回 false。'},{at:'fmt.Println("现在的值：", v.Load())',text:'值仍然是 10。'}]},
  {title:'控制并发数：用 channel 当号牌',body:'goroutine 虽然便宜，但不能无限制地开。比如要下载 10 万个文件，一口气开 10 万个 goroutine，会同时打开 10 万个网络连接，对方服务器和你自己的机器都受不了。\n注意 GOMAXPROCS 管不了这件事：它只限制同时执行 Go 代码的 P 的数量，既不限制 goroutine 总数，也不限制线程总数，等待网络的 goroutine 根本不占 P。\n常用的办法是拿一个容量为 N 的 channel 当“号牌箱”：启动任务前先往里放一个号牌（放不进去就说明已经有 N 个在跑，只能等），任务做完再取出一个号牌归还。这样同时最多只有 N 个任务在跑。\n号牌一定要在启动 goroutine 之前拿，这样循环本身也会被挡住，不会先创建出 10 万个 goroutine 再让它们排队。',code:`sem := make(chan struct{}, 8)
var wg sync.WaitGroup
for _, item := range items {
    sem <- struct{}{}
    wg.Add(1)
    go func() {
        defer wg.Done()
        defer func() { <-sem }()
        work(item)
    }()
}
wg.Wait()`,explain:[{at:'sem := make(chan struct{}, 8)',text:'容量为 8 的号牌箱。struct{} 是不占内存的空结构体，我们只关心“有几个”，不关心内容。'},{at:'var wg sync.WaitGroup',text:'用来等所有任务完成。'},{at:'for _, item := range items {',text:'逐个处理任务。'},{at:'sem <- struct{}{}',text:'先拿号牌：箱子里已经有 8 个时，这里会阻塞，循环停下来等。'},{at:'wg.Add(1)',text:'登记一个任务。'},{at:'go func() {',text:'拿到号牌后才启动 goroutine。'},{at:'defer wg.Done()',text:'任务结束时登记完成。'},{at:'defer func() { <-sem }()',text:'任务结束时取出一个号牌归还，让下一个任务可以开始。'},{at:'work(item)',text:'真正的工作。'},{at:'wg.Wait()',text:'等所有任务完成。'}]},
  {title:'errgroup：一组任务，任一出错就全部取消',body:'实际项目里，常常是“并发做一组任务，只要有一个失败，其他的就没必要做了，整体返回错误”。用 golang.org/x/sync/errgroup 包写起来最省心：\neg.Go(f) 启动一个任务，f 返回 error；\neg.Wait() 等所有任务结束，返回第一个出现的错误；\n用 errgroup.WithContext 创建时，任何一个任务返回错误，ctx 就会被取消，其他任务检查到 ctx.Done() 就可以提前退出；\neg.SetLimit(n) 还能直接限制同时运行的任务数，不用自己写号牌。',code:`eg, ctx := errgroup.WithContext(ctx)
eg.SetLimit(8)
for _, url := range urls {
    eg.Go(func() error {
        return download(ctx, url)
    })
}
if err := eg.Wait(); err != nil {
    return err
}`,explain:[{at:'eg, ctx := errgroup.WithContext(ctx)',text:'创建一个任务组，同时得到一个新的 ctx：组里任何任务出错，它就会被取消。'},{at:'eg.SetLimit(8)',text:'同时最多运行 8 个任务，超出的 eg.Go 会等待。'},{at:'for _, url := range urls {',text:'为每个网址启动一个下载任务。'},{at:'eg.Go(func() error {',to:'return download(ctx, url)',text:'启动任务。把 ctx 传给下载函数，这样别的任务出错时，它能及时停下来。'},{at:'if err := eg.Wait(); err != nil {',to:'return err',text:'等所有任务结束。只要有一个失败，就返回第一个错误。'}]},
  {title:'限速：每秒最多开始几个',body:'控制并发数，管的是“同一时刻最多有几个在做”。限速管的是另一件事：“每秒最多开始几个”。比如对方接口规定每秒最多调用 10 次，即使每次调用很快就结束，也不能超过这个频率。\n常用的限速工具是“令牌桶”：一个桶按固定速度往里放令牌（比如每秒 10 个），每次请求要先拿到一个令牌才能发出，桶空了就等。桶有一个容量上限，允许短时间内有少量突发。\nGo 里可以直接用 golang.org/x/time/rate 包，简单的场景也可以用 time.Ticker 每隔固定时间放行一次。',code:`limiter := rate.NewLimiter(10, 5)
for _, req := range requests {
    if err := limiter.Wait(ctx); err != nil {
        return err
    }
    send(req)
}`,explain:[{at:'limiter := rate.NewLimiter(10, 5)',text:'创建令牌桶：每秒放 10 个令牌，桶最多存 5 个，允许短时间突发 5 个请求。'},{at:'for _, req := range requests {',text:'逐个发送请求。'},{at:'if err := limiter.Wait(ctx); err != nil {',to:'return err',text:'等拿到一个令牌再继续。如果 ctx 被取消或者等不到，就返回错误。'},{at:'send(req)',text:'拿到令牌后发送请求，整体速度就不会超过每秒 10 个。'}]},
  {title:'动手试试：同时最多只跑 3 个',body:'我们用号牌箱把并发数限制为 3，启动 10 个各需要 0.1 秒的任务，并在任务里统计“同一时刻最多有几个在跑”。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把号牌箱的容量 3 改成 5 再运行，看看第一行变成多少；再想想整个程序大概要运行多久。'],expect:'最多同时运行： 3\n完成任务数： 10'},code:`package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    sem := make(chan struct{}, 3)
    var wg sync.WaitGroup
    var mu sync.Mutex
    running, maxRunning, done := 0, 0, 0
    for i := 0; i < 10; i++ {
        sem <- struct{}{}
        wg.Add(1)
        go func() {
            defer wg.Done()
            defer func() { <-sem }()
            mu.Lock()
            running++
            if running > maxRunning {
                maxRunning = running
            }
            mu.Unlock()

            time.Sleep(100 * time.Millisecond)

            mu.Lock()
            running--
            done++
            mu.Unlock()
        }()
    }
    wg.Wait()
    fmt.Println("最多同时运行：", maxRunning)
    fmt.Println("完成任务数：", done)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"time"',text:'导入 fmt、sync 和 time。'},{at:'func main() {',text:'程序入口。'},{at:'sem := make(chan struct{}, 3)',text:'容量为 3 的号牌箱，同时最多 3 个任务。'},{at:'var wg sync.WaitGroup',to:'running, maxRunning, done := 0, 0, 0',text:'running 是正在跑的任务数，maxRunning 记录出现过的最大值，done 是完成数，用 mu 保护这三个变量。'},{at:'for i := 0; i < 10; i++ {',to:'wg.Add(1)',text:'循环 10 次：先拿号牌，再登记。'},{at:'go func() {',to:'defer func() { <-sem }()',text:'启动任务，结束时登记完成并归还号牌。'},{at:'mu.Lock()',to:'mu.Unlock()',text:'任务开始：running 加一，如果超过了记录的最大值就更新。'},{at:'time.Sleep(100 * time.Millisecond)',text:'模拟干活 0.1 秒。'},{at:'mu.Lock()',to:'mu.Unlock()',text:'任务结束：running 减一，完成数加一。'},{at:'wg.Wait()',text:'等 10 个任务全部完成。'},{at:'fmt.Println("最多同时运行：", maxRunning)',to:'fmt.Println("完成任务数：", done)',text:'最大并发正好是 3，完成数是 10。'}]},
  {title:'并发读写 map 和切片，哪些安全',body:'记住这几条：\n一、多个 goroutine 只读同一个 map 或切片，没有任何人写，是安全的；\n二、只要有一个 goroutine 在写，其他 goroutine 的读和写都必须加锁（或者用 sync.Map）。普通 map 被并发写时，Go 会直接让程序崩溃；\n三、多个 goroutine 各自写同一个切片里“不同下标”的元素，而且切片在这期间不会扩容（不 append），是安全的，常用来并发计算结果后按位置存放；\n四、多个 goroutine 同时对同一个切片 append 是不安全的，会丢数据。\n另外，“用了 channel 就不会有数据竞争”是错误的：channel 只保证通过它传递数据这件事是安全的，如果 goroutine 之间还直接共享了别的变量，照样会有数据竞争。'},
  {title:'channel 该由谁关闭',body:'关闭 channel 的意思是告诉接收方“不会再有数据了”，所以应该由发送方来关。接收方不要自作主张地关闭：它不知道发送方是不是还要发，一旦发送方再发送就会 panic。\n只有一个发送者时，它发完就关。有多个发送者时，任何一个发送者都不能自己关（别人可能还在发），要由一个“协调者”等所有发送者都结束之后，再统一关闭。最常见的做法是用 WaitGroup 等所有发送者，然后关闭。',code:`out := make(chan Result)
var wg sync.WaitGroup
for _, job := range jobs {
    wg.Add(1)
    go func() {
        defer wg.Done()
        out <- process(job)
    }()
}
go func() {
    wg.Wait()
    close(out)
}()
for r := range out {
    fmt.Println(r)
}`,explain:[{at:'out := make(chan Result)',text:'所有工作 goroutine 共用的结果 channel，有多个发送者。'},{at:'var wg sync.WaitGroup',text:'用来知道所有发送者什么时候都结束了。'},{at:'for _, job := range jobs {',to:'go func() {',text:'每个任务登记一次，然后启动一个发送者 goroutine。'},{at:'defer wg.Done()',to:'out <- process(job)',text:'每个发送者处理完就把结果发出去，自己不关闭 out。'},{at:'go func() {',text:'单独启动一个协调者 goroutine。'},{at:'wg.Wait()',to:'close(out)',text:'等所有发送者都结束后，由它统一关闭 out。'},{at:'for r := range out {',to:'fmt.Println(r)',text:'主流程接收所有结果，out 关闭后循环自动结束。'}]},
  {title:'channel 也能当锁用',body:'一个容量为 1 的 channel 可以当互斥锁用：\n加锁：往里发送一个值 ch <- struct{}{}。如果里面已经有一个了，发送就会阻塞，相当于“锁被别人拿着，等着”；\n解锁：从里面取出一个值 <-ch，空出位置让下一个人能放进去。\n这和前面的“号牌箱”其实是同一个思路：容量为 N 的号牌箱允许 N 个同时进入，N = 1 时就是互斥锁。日常还是直接用 sync.Mutex 更清楚，但面试会考这个原理。',code:`lock := make(chan struct{}, 1)

lock <- struct{}{}
count++
<-lock`,explain:[{at:'lock := make(chan struct{}, 1)',text:'容量为 1 的 channel，最多只能放一个值。'},{at:'lock <- struct{}{}',text:'加锁：放进一个值。如果已经满了，就阻塞等待别人取走。'},{at:'count++',text:'临界区：同一时刻只有一个 goroutine 能到这里。'},{at:'<-lock',text:'解锁：取出那个值，让下一个等待的 goroutine 可以放进去。'}]},
  {title:'协程泄漏：永远不会结束的 goroutine',body:'如果一个 goroutine 卡在某个永远不会发生的操作上，比如等一个没人会发送的 channel、往一个没人接收的 channel 发送，它就永远不会结束。它占用的栈和它引用的所有数据也都回收不掉。这叫“协程泄漏”（goroutine 泄漏）。一次泄漏一点点，服务跑上几天，内存就涨上去了。\n下面是一个典型例子：调用方超时先走了，后台 goroutine 想把结果发回去，却再也没人接收，永远卡住。\n预防方法：每个 goroutine 启动时就要想好它怎么退出；阻塞操作都配上 context 或超时；用容量为 1 的 channel，让发送方即使没人接收也能放下结果直接退出。排查时用 pprof 的 goroutine profile，看 goroutine 数量是不是一直在涨、都卡在哪一行。',code:`func query(ctx context.Context) (string, error) {
    ch := make(chan string, 1)
    go func() {
        ch <- slowCall()
    }()
    select {
    case v := <-ch:
        return v, nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}`,explain:[{at:'func query(ctx context.Context) (string, error) {',text:'带超时的查询。'},{at:'ch := make(chan string, 1)',text:'关键：容量为 1。如果写成无缓冲的 make(chan string)，超时后没人接收，下面的 goroutine 就会永远卡在发送上，造成泄漏。'},{at:'go func() {',to:'ch <- slowCall()',text:'后台做慢查询，结果放进 ch。有 1 个缓冲位，即使没人接收也能放下，然后 goroutine 正常结束。'},{at:'select {',text:'等结果或超时。'},{at:'case v := <-ch:',to:'return v, nil',text:'结果先到就返回结果。'},{at:'case <-ctx.Done():',to:'return "", ctx.Err()',text:'超时先到就返回错误，不再等后台 goroutine。'}]},
  {title:'闭包和循环变量的坑',body:'闭包（匿名函数）捕获的是变量本身，而不是捕获那一刻的值。在 Go 1.22 之前，for 循环的变量在整个循环里只有一个，每轮只是修改它的值。\n所以下面的代码在旧版本里，三个 goroutine 真正运行时，循环通常已经结束了，v 停在最后的 "c"，最可能打印出 ccc。\nGo 1.22 起，for 循环里用 := 声明的变量每一轮都是一个新变量，这个坑被修复了，会打印 a、b、c（顺序不固定）。但这取决于 go.mod 文件里写的 go 版本，老项目可能仍是旧行为。\n最稳妥的写法是把值当参数传进 goroutine。',code:`for _, v := range []string{"a", "b", "c"} {
    go func() {
        fmt.Print(v)
    }()
}

for _, v := range []string{"a", "b", "c"} {
    go func(s string) {
        fmt.Print(s)
    }(v)
}`,explain:[{at:'for _, v := range []string{"a", "b", "c"} {',text:'第一种写法：闭包直接使用循环变量 v。'},{at:'go func() {',to:'fmt.Print(v)',text:'Go 1.22 之前，三个 goroutine 共享同一个 v，运行时 v 很可能已经是 "c"，打印 ccc，而且还存在数据竞争。'},{at:'for _, v := range []string{"a", "b", "c"} {',text:'第二种写法，任何版本都正确。'},{at:'go func(s string) {',to:'fmt.Print(s)',text:'用参数 s 接收值。'},{at:'}(v)',text:'启动时把当前的 v 作为参数传进去，每个 goroutine 拿到的是自己的那份值。'}]},
  {title:'singleflight：同一时刻只查一次',body:'缓存里某个热门数据刚好过期的一瞬间，成百上千个请求同时发现缓存没有，全都跑去查数据库，数据库可能被一下子压垮。这叫“缓存击穿”。\ngolang.org/x/sync/singleflight 能解决这个问题：对同一个 key，同一时刻只真正执行一次查询，其他同时到达的调用者不去查，而是等着共享这一次的结果。\n要注意：它不是缓存，查询完成后结果不会保存，下一波请求还会再查一次；它也只在当前进程内生效，多台服务器之间不共享。',code:`var group singleflight.Group

func getUser(ctx context.Context, id string) (any, error) {
    v, err, shared := group.Do(id, func() (any, error) {
        return loadFromDB(ctx, id)
    })
    log.Println("是否共享了别人的结果：", shared)
    return v, err
}`,explain:[{at:'var group singleflight.Group',text:'一个 singleflight 组，零值即可使用。'},{at:'func getUser(ctx context.Context, id string) (any, error) {',text:'按用户 ID 查询。'},{at:'v, err, shared := group.Do(id, func() (any, error) {',to:'return loadFromDB(ctx, id)',text:'用 id 作为 key：同一时刻对同一个 id，只有第一个调用者会真正执行这个函数去查数据库，其他人等着拿同一个结果。'},{at:'log.Println("是否共享了别人的结果：", shared)',text:'shared 为 true 表示这个结果被多个调用者共享了。'},{at:'return v, err',text:'返回结果。'}]},
  {title:'死锁、活锁和饥饿',body:'死锁：几个 goroutine 互相等待对方释放资源，谁都动不了。比如 A 拿着锁 1 等锁 2，B 拿着锁 2 等锁 1。如果所有 goroutine 都卡住了，Go 会报 “all goroutines are asleep - deadlock!”。预防方法：多把锁总是按固定顺序获取。\n活锁：大家都没卡住，一直在忙，但事情毫无进展。比如两个人在走廊里相遇，同时让到同一边，又同时让回另一边，一直让个不停。程序里常见的是多个任务冲突后同时重试、又同时冲突。解决办法：重试时加上随机的等待时间。\n饥饿：某个 goroutine 一直抢不到资源，迟迟得不到执行。Mutex 的饥饿模式就是为了防止这种情况。'},
  {title:'服务怎么优雅退出',body:'一个后台服务的 main 函数要一直“守住”，不能执行完就退出；收到停止信号（比如按 Ctrl+C，或者部署系统发来的 SIGTERM）时，又要先停止接收新请求、等正在处理的请求做完，再退出。这叫“优雅退出”。\n不要用 time.Sleep 或者空的 for {} 来守住 main。标准做法是用 signal.NotifyContext 得到一个“收到信号就取消”的 context，阻塞等它结束，然后调用 Shutdown 做收尾。',code:`func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{Addr: ":8080"}
    go srv.ListenAndServe()

    <-ctx.Done()
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(shutdownCtx)
}`,explain:[{at:'func main() {',text:'服务的入口。'},{at:'ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)',text:'得到一个 ctx：收到 Ctrl+C（os.Interrupt）或 SIGTERM 时，它会被取消。'},{at:'defer stop()',text:'退出时停止监听信号。'},{at:'srv := &http.Server{Addr: ":8080"}',text:'创建一个监听 8080 端口的 HTTP 服务。'},{at:'go srv.ListenAndServe()',text:'在后台 goroutine 里开始接收请求。'},{at:'<-ctx.Done()',text:'main 阻塞在这里“守住”，直到收到停止信号。'},{at:'shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)',to:'defer cancel()',text:'给收尾工作最多 10 秒时间。'},{at:'srv.Shutdown(shutdownCtx)',text:'优雅关闭：不再接收新连接，等正在处理的请求完成后再返回。超过 10 秒就不再等了。'}]}
 ],quiz:[
  {id:'go-concurrency-1',q:'多个 goroutine 同时给计数器加一，最简单正确的写法是？',options:['直接写 count++','count.Store(count.Load() + 1)','count.Add(1)（atomic.Int64）','用 time.Sleep 错开执行'],why:['count++ 是读改写三步，并发时会丢失更新，是数据竞争。','Load 和 Store 之间可能被别人插队，同样会丢更新。','','Sleep 无法保证互斥，只是降低了冲突概率。'],answer:2,explain:'Add 一步完成读改写；Load 后再 Store 中间可能被别人插队，会丢更新。',interview:'q-f6ed8f3b8422ead0'},
  {id:'go-concurrency-2',q:'“余额够才扣款”这种先判断再修改的操作，应该用？',options:['两次单独的原子操作','互斥锁保护整段流程','不需要任何同步','用 channel 的 len 判断'],why:['两次原子操作之间会被别的 goroutine 插队，判断和扣款不再一致。','','并发扣款不加同步会出现超扣。','len 只是瞬时值，判断后马上可能变化。'],answer:1,explain:'锁能把读、判断、修改作为一个整体保护；也可以用 CompareAndSwap 循环重试。',interview:'q-c64065110f9663bf'},
  {id:'go-concurrency-3',q:'用 atomic.Pointer 发布新配置，正确流程是？',options:['直接修改旧配置对象的字段','构造完整新对象后 Store 指针','先 Store 空对象再逐个填字段','每次读取配置时都加锁'],why:['修改正在被读取的对象会产生数据竞争，读者可能看到一半新一半旧的配置。','','读者可能读到填了一半的对象。','加锁可以正确，但失去了原子指针“读无锁”的优势。'],answer:1,explain:'发布后的对象只读不改；更新时构造新对象再一次性替换，读者拿到的总是完整快照。',interview:'q-72b0b65f69db06ce'},
  {id:'go-concurrency-4',type:'judge',q:'sync.Mutex 内部用了 CAS，所以它是乐观锁。',answer:false,explain:'Mutex 先获取锁再进入临界区，是悲观锁。悲观/乐观描述的是使用策略，不看是否用了原子指令。',interview:'q-eee62e3325e927d9'},
  {id:'go-concurrency-5',q:'Mutex 什么时候进入饥饿模式？',options:['持锁的时间超过 1 秒','等待者超过约 1 毫秒仍未拿到锁','goroutine 数量超过 1000 个','连续调用了两次 Unlock'],why:['切换条件看的是等待者的等待时间，而不是持锁时间。','','goroutine 数量与锁模式无关。','重复 Unlock 会直接 fatal error。'],answer:1,explain:'饥饿模式下解锁直接交给队首等待者，新来的不能抢，减少尾部等待时间。',interview:'q-e55940cf9777073a'},
  {id:'go-concurrency-6',type:'judge',q:'GOMAXPROCS 限制的就是程序能使用的操作系统线程总数。',answer:false,explain:'它限制的是 P 的数量；阻塞系统调用、cgo 可能需要额外线程。真要设线程上限用 debug.SetMaxThreads，超了会直接崩溃。',interview:'q-d20ac209ee708302'},
  {id:'go-concurrency-7',q:'用带缓冲 channel 控制并发数时，号牌应该在什么时候获取？',options:['goroutine 启动之后在里面获取','启动 goroutine 之前获取','任务全部完成之后再获取','不需要获取，直接启动即可'],why:['在里面获取时 goroutine 已经全部启动了，只限制了执行而没有限制数量。','','任务完成后再获取就起不到限制作用。','不获取号牌就没有任何并发限制。'],answer:1,explain:'先拿号牌再启动，才能真正限制 goroutine 数量；否则 10 万个 goroutine 已经开起来了。',interview:'q-2ade0ebaffc554bf'},
  {id:'go-concurrency-8',type:'multi',q:'关于并发访问 map 和 slice，哪些做法是安全的？（多选）',options:['多个 goroutine 只读一个不再修改的 map','两个 goroutine 写同一 map 的不同 key','预分配长度，各自只写自己的下标','多个 goroutine 同时 append 同一个切片'],why:['','写不同的 key 也会修改 map 的内部结构，仍然是并发写，会 fatal error。','','并发 append 会互相覆盖长度和底层数组，导致数据丢失。'],answers:[0,2],explain:'有并发写就要同步；不同 key 也不行；并发 append 会丢数据。固定长度、写互不重叠的下标是安全的分工方式。',interview:'q-fd0565d8def739be'},
  {id:'go-concurrency-9',q:'用带缓冲的 sem := make(chan struct{}, N) 控制并发上限时，“获取令牌”对应的操作是？',options:['close(sem)','sem <- struct{}{}','<-sem','len(sem) == 0'],why:['关闭 channel 不能表示占用名额，之后再发送还会 panic。','','从 sem 接收对应的是任务结束后归还令牌。','len 只是读取瞬时长度，无法原子地占用并发名额。'],answer:1,explain:'往容量为 N 的缓冲 channel 发送一个空结构体占住位置即获取令牌，任务完成后接收出来即释放名额。',interview:'q-7aea80bce665a043'},
  {id:'go-concurrency-10',q:'下面代码在 Go 1.22 之前的语言版本下，最可能输出什么？',code:'for _, v := range []string{"a", "b", "c"} {\n    go func() { fmt.Print(v) }()\n}\ntime.Sleep(time.Second)',options:['abc（固定顺序）','ccc','编译报错','什么都不输出'],why:['旧语义下所有 goroutine 共用同一个 v，而且执行顺序也不固定。','','代码是合法的。','假设程序等待了 goroutine 结束，会有输出。'],answer:1,explain:'旧语义下整个循环共用一个 v，goroutine 运行时循环往往已结束，都读到 "c"；Go 1.22 起循环变量每轮独立。',interview:'q-e462fc9949aeed83'},
  {id:'go-concurrency-11',q:'有多个发送者往同一个 channel 发数据，应该由谁来关闭它？',options:['任意一个发送者关闭','由接收者负责关闭','发送者都结束后由协调者关闭','一直不关闭这个 channel'],why:['其他发送者再发送时会 panic。','接收者关闭后，发送者再发送会 panic。','','不关闭时接收方的 for range 无法结束，可能导致 goroutine 泄漏。'],answer:2,explain:'关闭表示不会再有数据：用 WaitGroup 等所有发送者结束，再由协调者关闭。',interview:'q-663d42e7c0e290fb'},
  {id:'go-concurrency-12',type:'short',q:'什么是协程泄漏？举例并说说怎么预防。',reference:'协程泄漏是 goroutine 在业务结束后仍无法退出，比如往无人接收的无缓冲 channel 发送、等待一个永远不会关闭的 channel、忘记 cancel、锁一直不释放、后台循环没有退出分支。它会占用栈和引用的对象，数量持续上涨会拖垮服务。预防：给每个 goroutine 定义生命周期，阻塞操作配 context 或超时，select 里监听 ctx.Done()，调用方等待它们收尾；用 goroutine profile 观察数量和堆栈。',points:['goroutine 无法退出','发送无人接收/等待不关闭的 channel','用 context、超时、退出分支','用 goroutine profile 定位'],explain:'举一个具体例子并给出对应的修复方式最有说服力。',interview:'q-f6132d872e9784ca'},
  {id:'go-concurrency-13',q:'singleflight 最适合解决哪个问题？',options:['长期缓存每次查询的结果','缓存失效时相同请求一起回源','实现跨机器的分布式锁','限制每秒钟的请求次数'],why:['singleflight 不保存结果，调用结束后结果就不再共享。','','它只在单个进程内生效。','限流要用令牌桶等方案。'],answer:1,explain:'同一个 key 的并发调用只执行一次、共享结果。',interview:'q-05b541b03bf3f929'},
  {id:'go-concurrency-14',type:'judge',q:'使用了 channel 的程序就不会有数据竞争。',answer:false,explain:'channel 只同步交接那一刻；传过去的指针或切片，两边之后同时修改照样会竞争。',interview:'q-5d35537eb1d002b0'},
  {id:'go-concurrency-15',q:'程序“一直在忙着重试，但业务没有任何进展”，这叫？',options:['死锁','活锁','饥饿','数据竞争'],why:['死锁是互相等待，谁都动不了，不会一直重试。','','饥饿是某个任务长期拿不到资源，其他任务仍有进展。','数据竞争是并发读写同一数据没有同步。'],answer:1,explain:'死锁是互相等待谁都动不了；活锁是一直在执行和重试但没进展；饥饿是某个任务老拿不到资源。',interview:'q-5d35537eb1d002b0'},
  {id:'go-concurrency-16',q:'服务的 main 函数怎样“守住”并能优雅退出？',options:['用 for {} 空循环守住进程','用 select {} 永久阻塞住','等退出信号后优雅收尾','用 time.Sleep 睡很长时间'],why:['空循环会一直占满一个 CPU 核心。','select{} 会永久阻塞，无法优雅退出，所有 goroutine 都阻塞时还会被报告死锁。','','Sleep 结束后程序就退出了，而且收不到退出信号。'],answer:2,explain:'等待退出信号后关闭监听、等待进行中的请求、释放资源，才是服务的正确写法。',interview:'q-81c523006197611b'},
  {id:'go-concurrency-17',type:'fill',q:'需要“任一任务出错就取消其他任务并返回错误”，可以用 golang.org/x/sync 里的 ____ 包。',accepted:['errgroup'],explain:'errgroup.WithContext 返回的 ctx 会在第一个错误时取消，Wait 返回第一个错误。',interview:'q-c9ec292e716d6fa3'},
 ]},
 {id:'go-testing',title:'测试与工具链',summary:'单元测试、表格驱动、基准、竞态检测、模糊测试和常用工具',lessons:[
  {title:'这一关学什么：让代码自己检查自己',body:'写完一个函数，你怎么知道它是对的？手动运行几次看看当然可以，但代码一改，又得全部手动再试一遍。\n测试就是写一段代码去检查你的代码：给定输入，判断输出是不是期望的结果。写好之后，一条命令就能把所有检查全跑一遍，以后每次修改都能马上知道有没有改坏东西。\nGo 自带了测试工具，不用安装任何框架。这一关讲：怎么写单元测试和表格驱动测试，怎么测性能（基准测试），怎么检测数据竞争、做模糊测试，怎么测试依赖数据库的代码，以及 Go 工具链里的常用工具。'},
  {title:'第一个测试',body:'Go 的测试有三条约定：\n一、测试代码放在以 _test.go 结尾的文件里，通常和被测代码放在同一个文件夹；\n二、测试函数的名字以 Test 开头，后面跟一个大写字母开头的名字，比如 TestAdd；\n三、参数是 t *testing.T，通过它报告测试失败。\n运行 go test 执行当前文件夹的测试，go test ./... 执行所有子文件夹的测试，加 -v 可以看到每个测试的详细结果。',code:`// add.go
func Add(a, b int) int {
    return a + b
}

// add_test.go
func TestAdd(t *testing.T) {
    got := Add(1, 2)
    if got != 3 {
        t.Errorf("Add(1, 2) = %d，期望 3", got)
    }
}`,explain:[{at:'func Add(a, b int) int {',to:'return a + b',text:'被测试的函数，写在普通的 add.go 里。'},{at:'func TestAdd(t *testing.T) {',text:'测试函数，写在 add_test.go 里。名字以 Test 开头，go test 会自动找到并运行它。'},{at:'got := Add(1, 2)',text:'调用被测函数，拿到实际结果。习惯上把实际结果叫 got，期望结果叫 want。'},{at:'if got != 3 {',text:'和期望结果比较。'},{at:'t.Errorf("Add(1, 2) = %d，期望 3", got)',text:'不相等就报告失败，并打印出实际值，方便排查。没有调用任何报错方法，测试就算通过。'}]},
  {title:'动手试试：跑通你的第一个测试',body:'我们新建一个小项目，写一个 Add 函数和它的测试，然后用 go test 运行。测试需要在一个 Go 模块（module）里运行，所以第一步要先用 go mod init 创建模块。',practice:{steps:['新建一个空文件夹 demo，在终端里进入它，运行 go mod init demo，会生成一个 go.mod 文件，表示这是一个名叫 demo 的模块。','新建文件 add.go，写入三行：package demo、空一行，然后是 func Add(a, b int) int { return a + b }。','新建文件 add_test.go，把下面的代码复制进去保存。','运行 go test -v，对照下面的输出（最后一行的耗时数字会不一样）。','把 Add 里的 a + b 改成 a - b 再运行，看看失败时会打印什么。'],expect:'=== RUN   TestAdd\n--- PASS: TestAdd (0.00s)\nPASS\nok  	demo	0.152s'},code:`package demo

import "testing"

func TestAdd(t *testing.T) {
    got := Add(1, 2)
    if got != 3 {
        t.Errorf("Add(1, 2) = %d，期望 3", got)
    }
}`,explain:[{at:'package demo',text:'测试文件和被测代码属于同一个包 demo，所以可以直接调用 Add。'},{at:'import "testing"',text:'导入标准库的 testing 包。'},{at:'func TestAdd(t *testing.T) {',text:'测试函数。'},{at:'got := Add(1, 2)',to:'t.Errorf("Add(1, 2) = %d，期望 3", got)',text:'调用 Add(1, 2)，结果不是 3 就报告失败。'}]},
  {title:'t.Errorf 和 t.Fatalf：失败后还要不要继续',body:'报告测试失败的方法主要有两组：\nt.Error / t.Errorf：记录这次失败，但测试函数继续往下执行。适合一个测试里检查好几个结果，一次把所有问题都报出来；\nt.Fatal / t.Fatalf：记录失败，并立刻结束当前这个测试函数。适合后面的检查依赖前面的结果，比如连数据都没准备成功，后面的检查就没意义了，继续执行还可能 panic。\n另外，go test -run 后面跟一个名字（支持正则表达式），可以只运行名字匹配的测试，比如 go test -run TestLogin。',code:`func TestParse(t *testing.T) {
    u, err := Parse("tom,18")
    if err != nil {
        t.Fatalf("解析失败：%v", err)
    }
    if u.Name != "tom" {
        t.Errorf("Name = %q，期望 tom", u.Name)
    }
    if u.Age != 18 {
        t.Errorf("Age = %d，期望 18", u.Age)
    }
}`,explain:[{at:'func TestParse(t *testing.T) {',text:'测试一个把 "名字,年龄" 解析成用户的函数。'},{at:'u, err := Parse("tom,18")',text:'调用被测函数。'},{at:'if err != nil {',to:'t.Fatalf("解析失败：%v", err)',text:'解析都失败了，u 没有意义，后面的检查不用做了，用 Fatalf 立刻结束。'},{at:'if u.Name != "tom" {',to:'t.Errorf("Name = %q，期望 tom", u.Name)',text:'名字不对用 Errorf，继续检查年龄，一次报出所有问题。%q 会给字符串加上引号打印。'},{at:'if u.Age != 18 {',to:'t.Errorf("Age = %d，期望 18", u.Age)',text:'检查年龄。'}]},
  {title:'表格驱动测试：一张表测很多种情况',body:'一个函数通常要测好几种情况：正数、负数、零、边界值……每种都写一个测试函数会很啰嗦。\nGo 里最常见的写法是“表格驱动测试”：把每组输入和期望结果写成一个切片里的一行，然后用循环逐行检查。每一行用 t.Run 跑成一个“子测试”，起一个名字。\n好处是：新增一种情况只要加一行；某一行失败时，输出会显示是哪个子测试失败了；还可以用 go test -run TestAdd/负数 只运行其中一个子测试。',code:`func TestAdd(t *testing.T) {
    tests := []struct {
        name       string
        a, b, want int
    }{
        {"正数", 1, 2, 3},
        {"负数", -1, -2, -3},
        {"零", 0, 0, 0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d, %d) = %d，期望 %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}`,explain:[{at:'func TestAdd(t *testing.T) {',text:'一个测试函数覆盖多种情况。'},{at:'tests := []struct {',to:'a, b, want int',text:'定义“表格”的每一行有哪些列：用例名、两个输入和期望结果。'},{at:'{"正数", 1, 2, 3},',to:'{"零", 0, 0, 0},',text:'表格内容：每一行是一组用例。'},{at:'for _, tt := range tests {',text:'逐行检查。'},{at:'t.Run(tt.name, func(t *testing.T) {',text:'为每一行运行一个名叫 tt.name 的子测试。'},{at:'if got := Add(tt.a, tt.b); got != tt.want {',to:'t.Errorf("Add(%d, %d) = %d，期望 %d", tt.a, tt.b, got, tt.want)',text:'用这一行的输入调用 Add，结果不对就报告，并带上输入和期望值。'}]},
  {title:'基准测试：量一量有多快',body:'想知道一段代码有多快、每次分配了多少内存，用基准测试（benchmark）。\n基准测试函数以 Benchmark 开头，参数是 b *testing.B。Go 会反复运行你的代码，自动决定运行多少次，最后算出平均每次的耗时。\n运行命令是 go test -bench=.，其中 . 表示运行所有基准测试；加上 -benchmem 还会显示每次操作分配了多少字节内存、分配了几次。\n写循环的方式有两种：传统写法是 for i := 0; i < b.N; i++；Go 1.24 起推荐 for b.Loop()，更简洁也更不容易写错。',code:`func BenchmarkConcat(b *testing.B) {
    for b.Loop() {
        s := ""
        for i := 0; i < 100; i++ {
            s += "x"
        }
    }
}

func BenchmarkBuilder(b *testing.B) {
    for b.Loop() {
        var sb strings.Builder
        for i := 0; i < 100; i++ {
            sb.WriteString("x")
        }
        _ = sb.String()
    }
}`,explain:[{at:'func BenchmarkConcat(b *testing.B) {',text:'第一个基准测试：用 += 拼接 100 次。'},{at:'for b.Loop() {',text:'Go 会反复执行这个循环体，直到测得足够准确。'},{at:'s := ""',to:'s += "x"',text:'每次 += 都会分配一个新字符串。'},{at:'func BenchmarkBuilder(b *testing.B) {',text:'第二个基准测试：用 strings.Builder 做同样的事。'},{at:'for b.Loop() {',text:'同样的循环方式。'},{at:'var sb strings.Builder',to:'sb.WriteString("x")',text:'往 Builder 里追加 100 次。'},{at:'_ = sb.String()',text:'生成最终字符串。赋给下划线表示结果不用，但这一步也算在耗时里。'}]},
  {title:'动手试试：比一比两种拼接方式',body:'把上一张卡片的两个基准测试放进测试文件跑一下，亲眼看看 += 和 strings.Builder 在耗时和内存分配上的差距。具体数字和你的电脑有关，重点对比最后两列。',practice:{steps:['沿用上一个动手练习的 demo 文件夹（里面已经有 go.mod），新建文件 concat_test.go，把下面的代码复制进去保存。','运行 go test -bench=. -benchmem。开头几行是你的系统和 CPU 信息，-16 表示用了 16 个 P，这些都和电脑有关。','看输出里的 B/op（每次分配的字节数）和 allocs/op（每次分配的次数）：Concat 每次要分配约 99 次，Builder 只要几次。','ns/op 是每次操作的平均耗时（纳秒），也对比一下。'],expect:'goos: windows\ngoarch: amd64\npkg: demo\ncpu: AMD Ryzen 7 5800H with Radeon Graphics\nBenchmarkConcat-16    	  285324	      4180 ns/op	    5728 B/op	      99 allocs/op\nBenchmarkBuilder-16    	 3497108	       342.1 ns/op	     248 B/op	       5 allocs/op\nPASS\nok  	demo	2.744s'},code:`package demo

import (
    "strings"
    "testing"
)

func BenchmarkConcat(b *testing.B) {
    for b.Loop() {
        s := ""
        for i := 0; i < 100; i++ {
            s += "x"
        }
    }
}

func BenchmarkBuilder(b *testing.B) {
    for b.Loop() {
        var sb strings.Builder
        for i := 0; i < 100; i++ {
            sb.WriteString("x")
        }
        _ = sb.String()
    }
}`,explain:[{at:'package demo',text:'和 demo 文件夹里其他文件同一个包。'},{at:'import (',to:'"testing"',text:'导入 strings 和 testing。'},{at:'func BenchmarkConcat(b *testing.B) {',to:'s += "x"',text:'用 += 拼接 100 次。'},{at:'func BenchmarkBuilder(b *testing.B) {',to:'_ = sb.String()',text:'用 Builder 拼接 100 次。'}]},
  {title:'竞态检测：go test -race',body:'go test -race 会在运行测试时打开“竞态检测器”：它监视所有内存读写，一旦发现两个 goroutine 没有同步地访问同一个变量，并且至少有一个在写，就报告 DATA RACE，并打印两边各自的代码位置。\n要注意它的局限：它只能发现这次运行中“实际执行到”的代码路径上的问题。没报警不等于程序里一定没有数据竞争，可能只是那条有问题的路径没被测到。所以测试要尽量覆盖并发的场景。\n开启后程序会变慢好几倍、占用更多内存，一般在测试和预发布环境用，也可以用 go build -race 编译出带检测的程序来跑。Windows 上使用 -race 需要安装 C 编译器。'},
  {title:'模糊测试：让电脑帮你想测试用例',body:'自己写测试用例，总会漏掉一些想不到的奇怪输入。模糊测试（fuzzing）让 Go 自动生成大量随机输入去调用你的函数，专门寻找让它崩溃或者出错的输入，特别适合测试解析器、编解码这类处理外部输入的函数。\n模糊测试函数以 Fuzz 开头，参数是 f *testing.F。先用 f.Add 提供几个正常的种子输入，Go 会在此基础上不断变异出新输入。\n运行 go test -fuzz=FuzzReverse，它会一直跑，直到发现问题或者你按 Ctrl+C 停止。找到的出错输入会保存到 testdata 文件夹，之后普通的 go test 也会自动用它回归测试。',code:`func FuzzReverse(f *testing.F) {
    f.Add("hello")
    f.Add("你好")
    f.Fuzz(func(t *testing.T, s string) {
        twice := Reverse(Reverse(s))
        if twice != s {
            t.Errorf("反转两次后变了：%q → %q", s, twice)
        }
    })
}`,explain:[{at:'func FuzzReverse(f *testing.F) {',text:'对一个“反转字符串”的函数做模糊测试。'},{at:'f.Add("hello")',to:'f.Add("你好")',text:'提供种子输入，Go 会在它们的基础上变异出各种新字符串。'},{at:'f.Fuzz(func(t *testing.T, s string) {',text:'Go 会用大量生成的字符串 s 反复调用这个函数。'},{at:'twice := Reverse(Reverse(s))',text:'我们不知道每个随机输入的“正确答案”，但知道一个必然成立的性质：反转两次应该变回原样。'},{at:'if twice != s {',to:'t.Errorf("反转两次后变了：%q → %q", s, twice)',text:'不成立就说明有 bug，比如按字节反转会把中文弄成乱码。'}]},
  {title:'覆盖率：测试到底测到了多少代码',body:'go test -cover 会显示测试覆盖率：测试运行时，执行到了多少比例的代码。\n想看具体哪些行没被测到，可以先生成覆盖率文件，再用浏览器打开查看，没测到的行会标成红色：\ngo test -coverprofile=cover.out\ngo tool cover -html=cover.out\n覆盖率是一个参考指标，不是越高越好。100% 覆盖也不代表没有 bug，因为“执行到了”不等于“检查对了”。重点是把核心逻辑和容易出错的边界情况测到。'},
  {title:'依赖数据库的代码怎么测',body:'一个函数如果直接连真实的数据库，测试就会又慢又不稳定：要先装好数据库、准备数据，网络一抖测试就失败。\n常用的做法是“依赖接口，而不是具体实现”：\n一、业务代码不直接用数据库，而是依赖一个接口，比如 UserStore，里面声明需要的方法；\n二、正式运行时传入真正查数据库的实现；\n三、单元测试时传入一个自己写的“假实现”（fake），数据直接放在内存的 map 里，想返回什么就返回什么，还能模拟出错的情况。\n这样单元测试又快又稳定。和真实数据库的配合，再用少量“集成测试”去验证，比如用 Docker 启动一个临时数据库来跑。',code:`type UserStore interface {
    GetUser(id int) (User, error)
}

func Greeting(s UserStore, id int) string {
    u, err := s.GetUser(id)
    if err != nil {
        return "你好，访客"
    }
    return "你好，" + u.Name
}

type fakeStore struct {
    users map[int]User
}

func (f fakeStore) GetUser(id int) (User, error) {
    u, ok := f.users[id]
    if !ok {
        return User{}, errors.New("not found")
    }
    return u, nil
}

func TestGreeting(t *testing.T) {
    s := fakeStore{users: map[int]User{1: {Name: "小明"}}}
    if got := Greeting(s, 1); got != "你好，小明" {
        t.Errorf("got %q", got)
    }
    if got := Greeting(s, 2); got != "你好，访客" {
        t.Errorf("got %q", got)
    }
}`,explain:[{at:'type UserStore interface {',to:'GetUser(id int) (User, error)',text:'定义一个接口：只要能按 ID 查到用户就行，不关心数据到底存在哪。'},{at:'func Greeting(s UserStore, id int) string {',text:'业务函数依赖的是接口 UserStore，而不是某个具体的数据库。'},{at:'u, err := s.GetUser(id)',to:'return "你好，访客"',text:'查不到用户就当作访客。'},{at:'return "你好，" + u.Name',text:'查到了就带上名字。'},{at:'type fakeStore struct {',to:'users map[int]User',text:'测试用的假实现，数据放在一个 map 里。'},{at:'func (f fakeStore) GetUser(id int) (User, error) {',to:'return u, nil',text:'实现接口的方法：在 map 里找，找不到就返回错误。它满足 UserStore 接口，所以能传给 Greeting。'},{at:'func TestGreeting(t *testing.T) {',text:'测试 Greeting。'},{at:'s := fakeStore{users: map[int]User{1: {Name: "小明"}}}',text:'准备假数据：只有 1 号用户小明。'},{at:'if got := Greeting(s, 1); got != "你好，小明" {',to:'t.Errorf("got %q", got)',text:'测查得到的情况。'},{at:'if got := Greeting(s, 2); got != "你好，访客" {',to:'t.Errorf("got %q", got)',text:'测查不到的情况：用假实现可以很方便地模拟各种分支，不需要真的数据库。'}]},
  {title:'Go 工具链里的常用工具',body:'gofmt：自动把代码整理成统一的格式（缩进、空格、换行），Go 社区所有代码风格都一样，不用为格式争论。大部分编辑器保存时会自动执行。\ngo vet：检查那些能编译通过、但很可能有问题的写法，比如 Printf 的格式占位符和参数对不上、复制了含锁的结构体、永远执行不到的代码、结构体标签写错了格式。\ngo mod tidy：整理 go.mod，加上缺少的依赖，删掉没用到的依赖。\n性能分析：pprof 看 CPU 和内存都花在了哪里，trace 看 goroutine 的调度和阻塞情况。\n很多团队还会用 staticcheck 或 golangci-lint（把几十种检查工具合在一起）做更严格的代码检查，并放进 CI（每次提交代码时自动运行的检查流程）里。'}
 ],quiz:[
  {id:'go-testing-1',type:'fill',q:'Go 测试文件的文件名必须以 ____ 结尾。',accepted:['_test.go','test.go'],explain:'go test 只编译和运行 _test.go 文件里的 TestXxx、BenchmarkXxx、FuzzXxx、ExampleXxx。'},
  {id:'go-testing-2',q:'t.Errorf 和 t.Fatalf 的区别是？',options:['两者的行为没有任何区别','Errorf 继续执行，Fatalf 立即结束','Errorf 会让整个程序崩溃','Fatalf 只打印日志，不算失败'],why:['两者在失败后是否继续执行上不同。','','Errorf 只标记当前测试失败，不会让程序崩溃。','Fatalf 会标记测试失败并停止。'],answer:1,explain:'后续断言依赖前面的结果时用 Fatalf，其他情况用 Errorf 能一次看到更多失败。'},
  {id:'go-testing-3',q:'表格驱动测试中，为每组用例调用的方法是？',options:['t.Run','t.Parallel','t.Skip','t.Cleanup'],why:['','t.Parallel 标记测试可以并行运行，不创建子测试。','t.Skip 用于跳过测试。','t.Cleanup 注册测试结束后的清理函数。'],answer:0,explain:'t.Run(name, func) 创建子测试，失败时显示用例名，还能用 -run 单独运行某个子测试。'},
  {id:'go-testing-4',type:'fill',q:'运行基准测试并显示内存分配情况：go test -bench=. ____。',accepted:['-benchmem','benchmem'],explain:'-benchmem 输出 B/op 和 allocs/op；比较优化效果时最好多跑几次（-count）并用 benchstat。'},
  {id:'go-testing-5',type:'judge',q:'go test -race 没有报警，就证明程序里一定没有数据竞争。',answer:false,explain:'竞态检测只能发现这次实际执行到的路径上的竞争，证明不了“一定没有”。'},
  {id:'go-testing-6',q:'想自动生成大量随机输入来寻找解析函数的 bug，用哪种测试？',options:['单元测试','基准测试','模糊测试','示例测试'],why:['单元测试使用人工准备的固定输入。','基准测试衡量性能，不是找 bug。','','示例测试用于文档示例和输出校验。'],answer:2,explain:'Go 1.18 起支持 FuzzXxx(f *testing.F)，会不断变异输入，发现导致失败的输入后保存为回归用例。'},
  {id:'go-testing-7',type:'multi',q:'go vet 能发现哪些问题？（多选）',options:['Printf 的格式与参数不匹配','复制了含 Mutex 的结构体','业务逻辑的计算算错了','存在不可达的代码'],why:['','','静态检查无法判断业务是否正确，要靠测试。',''],answers:[0,1,3],explain:'go vet 做静态检查，找常见的可疑写法；业务逻辑对不对还得靠测试。'},
  {id:'go-testing-8',q:'统一代码格式用哪个工具？',options:['go vet','gofmt','go mod tidy','pprof'],why:['go vet 检查可疑写法，不调整格式。','','go mod tidy 整理依赖。','pprof 用于性能分析。'],answer:1,explain:'gofmt 按官方风格格式化代码，大多数编辑器保存时会自动运行。'},
  {id:'go-testing-9',type:'judge',q:'只运行名字匹配 TestLogin 的测试，可以用 go test -run TestLogin。',answer:true,explain:'-run 接受正则表达式，匹配测试名和子测试名，比如 -run TestAdd/负数。'},
  {id:'go-testing-10',type:'short',q:'怎么给一个依赖数据库的函数写单元测试？',reference:'把对数据库的依赖抽象成一个小接口，函数接收这个接口；测试时传入一个内存实现或假的实现（fake / mock），只验证业务逻辑。真正和数据库交互的代码另外写集成测试，用测试容器或测试库运行，并在 t.Cleanup 里清理数据。',points:['依赖抽象成接口','测试传入 fake / mock','集成测试单独连真实数据库','用 t.Cleanup 清理'],explain:'核心是依赖注入：业务逻辑不直接依赖具体的数据库客户端。'},
 ]},
 {id:'go-engineering',title:'工程实战与性能优化',summary:'写 Web 服务、用好常见库，用工具找到并解决性能问题',lessons:[
  {title:'这一关学什么：从写代码到做项目',body:'前面学的都是语言本身。这一关把它们用到真实项目里：\n一、用标准库 net/http 和 Gin 框架写 Web 服务：路由、中间件、参数校验；\n二、数据库事务、配置热更新、服务优雅关闭、防止重复提交这些工程问题；\n三、性能优化：先用 benchmark、pprof、trace 找到瓶颈，再用常见的优化手法解决。\n这些都是 Go 后端岗位面试的高频内容。'},
  {title:'net/http：标准库就能写 Web 服务',body:'Go 的标准库自带了一个生产可用的 HTTP 服务器。它的工作方式是：\n一、http.ListenAndServe 先在指定端口上监听；\n二、然后循环接收新连接，每来一个连接，就启动一个 goroutine 专门处理它，所以天然支持大量并发请求；\n三、处理时读出请求，交给 Handler 去处理，Handler 往 ResponseWriter 里写响应。\n用 http.HandleFunc 注册的路由会放进一个默认的路由表 http.DefaultServeMux。ListenAndServe 的第二个参数传 nil，就表示使用这个默认路由表。'},
  {title:'动手试试：写一个能用浏览器访问的服务',body:'我们写一个最小的 Web 服务：访问 /hello?name=你的名字，它就回复一句问候。这次需要用浏览器（或者 curl 命令）来看结果。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里运行 go run main.go，看到“服务已启动”后不要关闭终端，服务正在运行。','打开浏览器，访问 http://localhost:8080/hello?name=小明，页面上会显示下面这句话。','把网址里的 name=小明 去掉再访问一次，看看显示什么。','回到终端按 Ctrl+C 停止服务。'],expect:'你好，小明'},code:`package main

import (
    "fmt"
    "net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    if name == "" {
        name = "陌生人"
    }
    fmt.Fprintf(w, "你好，%s\\n", name)
}

func main() {
    http.HandleFunc("/hello", hello)
    fmt.Println("服务已启动：http://localhost:8080/hello?name=小明")
    http.ListenAndServe(":8080", nil)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"net/http"',text:'导入 fmt 和 net/http。'},{at:'func hello(w http.ResponseWriter, r *http.Request) {',text:'处理函数：w 用来写回响应，r 是收到的请求。'},{at:'name := r.URL.Query().Get("name")',text:'从网址的查询参数里取出 name，也就是 ?name= 后面的部分。'},{at:'if name == "" {',to:'name = "陌生人"',text:'没传 name 时用默认值。'},{at:'fmt.Fprintf(w, "你好，%s\\n", name)',text:'把问候语写进响应，浏览器上就会显示出来。'},{at:'func main() {',text:'程序入口。'},{at:'http.HandleFunc("/hello", hello)',text:'注册路由：访问 /hello 时调用 hello 函数。注册到默认路由表 DefaultServeMux。'},{at:'fmt.Println("服务已启动：http://localhost:8080/hello?name=小明")',text:'提示服务地址。'},{at:'http.ListenAndServe(":8080", nil)',text:'在 8080 端口启动服务。第二个参数 nil 表示用默认路由表。这一行会一直运行，不会返回，直到出错或被停止。'}]},
  {title:'Gin 中间件：请求的“过滤网”',body:'实际项目里常用 Gin、Echo 这类框架，它们在 net/http 之上提供了更方便的路由、参数绑定和中间件。\n中间件是在真正的处理函数前后执行的通用逻辑，比如记录日志、统计耗时、检查登录。多个中间件组成一条链，请求依次穿过它们。\n在 Gin 的中间件里：\nc.Next()：先去执行后面的中间件和处理函数，执行完再回到这里，继续执行 Next 之后的代码。所以 Next 之前写“前置逻辑”，之后写“后置逻辑”；\nc.Abort()：阻止后面的中间件和处理函数执行，比如没登录就不让继续。但它不会让当前函数退出，后面的代码还会执行，所以通常要紧接着写 return。',code:`r.Use(func(c *gin.Context) {
    start := time.Now()
    c.Next()
    log.Printf("%d %s", c.Writer.Status(), time.Since(start))
})

r.Use(func(c *gin.Context) {
    if c.GetHeader("Authorization") == "" {
        c.AbortWithStatus(401)
        return
    }
    c.Next()
})`,explain:[{at:'r.Use(func(c *gin.Context) {',text:'注册第一个中间件：统计每个请求的耗时。'},{at:'start := time.Now()',text:'前置逻辑：记下开始时间。'},{at:'c.Next()',text:'去执行后面的中间件和处理函数，全部执行完才回到这里。'},{at:'log.Printf("%d %s", c.Writer.Status(), time.Since(start))',text:'后置逻辑：此时响应已经生成，打印状态码和总耗时。'},{at:'r.Use(func(c *gin.Context) {',text:'第二个中间件：检查登录。'},{at:'if c.GetHeader("Authorization") == "" {',text:'请求头里没有登录凭证。'},{at:'c.AbortWithStatus(401)',text:'返回 401（未登录），并阻止后续处理函数执行。'},{at:'return',text:'Abort 不会退出当前函数，必须自己 return，否则会接着执行下面的 c.Next()。'},{at:'c.Next()',text:'登录检查通过，继续往后执行。'}]},
  {title:'参数绑定和校验：0 也合法怎么办',body:'Gin 用 c.ShouldBindJSON(&req) 把请求里的 JSON 自动填进结构体，用字段上的 binding 标签做校验，比如 required 表示必填、min=1 表示最小值。\n有一个常见的坑：required 是检查字段“不是零值”。如果年龄 0 也是一个合法输入，age 字段用 int 类型时，传了 0 和根本没传，填进结构体后都是 0，没法区分，而且 required 还会把合法的 0 当成没传而报错。\n解决办法是把字段定义成指针 *int：没传时是 nil，传了 0 时是一个指向 0 的指针，两者就能区分开了。',code:`type CreateReq struct {
    Name string \`json:"name" binding:"required"\`
    Age  *int   \`json:"age" binding:"required,min=0,max=150"\`
}

func create(c *gin.Context) {
    var req CreateReq
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, gin.H{"name": req.Name, "age": *req.Age})
}`,explain:[{at:'type CreateReq struct {',text:'请求参数的结构体。'},{at:'Name string `json:"name" binding:"required"`',text:'name 必填，空字符串会校验失败。'},{at:'Age  *int   `json:"age" binding:"required,min=0,max=150"`',text:'age 用指针：没传是 nil，required 会报错；传了 0 是指向 0 的指针，算传了，再检查范围 0 到 150。'},{at:'func create(c *gin.Context) {',text:'处理创建请求。'},{at:'var req CreateReq',text:'准备一个空结构体接收参数。'},{at:'if err := c.ShouldBindJSON(&req); err != nil {',to:'return',text:'解析和校验，失败就返回 400 和错误原因。'},{at:'c.JSON(200, gin.H{"name": req.Name, "age": *req.Age})',text:'成功后使用参数。*req.Age 取出指针指向的值。'}]},
  {title:'数据库事务：要么全成功，要么全撤销',body:'事务是把好几步数据库操作打包成一个整体：要么全部成功，要么一步都不生效。最典型的例子是转账：A 扣钱和 B 加钱必须一起成功，不能扣了 A 的钱却没加到 B 那里。\nGORM（Go 里常用的 ORM 库，可以用操作结构体的方式操作数据库）提供了 db.Transaction：把所有步骤写在一个回调函数里，回调返回 nil 就提交（真正生效），返回错误就回滚（全部撤销）。\n最容易犯的错：回调里必须用参数 tx 来执行操作。如果不小心用了外面的 db，那一步就不在这个事务里，出错时不会被撤销。',code:`err := db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Model(&Account{}).Where("id = ?", from).
        Update("balance", gorm.Expr("balance - ?", amount)).Error; err != nil {
        return err
    }
    if err := tx.Model(&Account{}).Where("id = ?", to).
        Update("balance", gorm.Expr("balance + ?", amount)).Error; err != nil {
        return err
    }
    return nil
})`,explain:[{at:'err := db.Transaction(func(tx *gorm.DB) error {',text:'开启一个事务，所有操作都写在回调里，并且都要用 tx。'},{at:'if err := tx.Model(&Account{}).Where("id = ?", from).',to:'return err',text:'第一步：转出账户扣钱。gorm.Expr 让数据库自己做减法，避免先读后写的并发问题。出错就返回错误，整个事务回滚。'},{at:'if err := tx.Model(&Account{}).Where("id = ?", to).',to:'return err',text:'第二步：转入账户加钱，出错同样回滚，第一步的扣款也会被撤销。'},{at:'return nil',text:'两步都成功，返回 nil，GORM 提交事务，两步同时生效。'}]},
  {title:'配置热更新：先校验，再整体替换',body:'服务运行时修改配置文件，希望不重启就能生效，这叫配置热更新。常用的 Viper 库可以监听配置文件的变化，文件一改就通知你。\n收到通知后不要直接一个个修改正在使用的配置字段：业务代码可能正读到一半，看到一部分新值、一部分旧值。正确做法是：\n一、把新文件完整解析成一个新的配置结构体；\n二、校验它是否合法，不合法就继续用旧配置，并记录告警；\n三、合法就用 atomic.Pointer 一次性整体替换。业务代码每次用 Load 拿到的，要么是完整的旧配置，要么是完整的新配置。',code:`var cfg atomic.Pointer[Config]

viper.OnConfigChange(func(e fsnotify.Event) {
    var next Config
    if err := viper.Unmarshal(&next); err != nil {
        log.Printf("新配置解析失败，继续用旧配置：%v", err)
        return
    }
    if err := next.Validate(); err != nil {
        log.Printf("新配置不合法，继续用旧配置：%v", err)
        return
    }
    cfg.Store(&next)
})
viper.WatchConfig()`,explain:[{at:'var cfg atomic.Pointer[Config]',text:'当前生效的配置，用原子指针保存。'},{at:'viper.OnConfigChange(func(e fsnotify.Event) {',text:'注册回调：配置文件一变化就执行。'},{at:'var next Config',text:'准备一个全新的配置结构体。'},{at:'if err := viper.Unmarshal(&next); err != nil {',to:'return',text:'把文件内容解析进 next，失败就保留旧配置。'},{at:'if err := next.Validate(); err != nil {',to:'return',text:'校验新配置，比如端口范围、必填项，不合法也保留旧配置。'},{at:'cfg.Store(&next)',text:'都没问题，整体替换。'},{at:'viper.WatchConfig()',text:'开始监听配置文件的变化。'}]},
  {title:'优雅关闭的完整步骤',body:'部署新版本时，旧的服务进程会收到 SIGTERM 信号，要求它退出。优雅关闭要按顺序做三件事：\n一、停止接收新请求；\n二、给正在处理的请求一段有上限的时间（比如 10 秒）把它们做完；\n三、关闭后台任务、数据库连接、消息队列的消费者等资源。\nnet/http 的 srv.Shutdown(ctx) 做的就是前两步。要注意两点：调用 Shutdown 后，ListenAndServe 会立刻返回 http.ErrServerClosed，这是正常现象，不是错误；main 函数要等 Shutdown 执行完再退出，否则正在处理的请求还是会被打断。',code:`go func() {
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatalf("服务启动失败：%v", err)
    }
}()

<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
    log.Printf("没能在 10 秒内处理完：%v", err)
}
closeResources()`,explain:[{at:'go func() {',text:'在后台运行服务。'},{at:'if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {',to:'log.Fatalf("服务启动失败：%v", err)',text:'ErrServerClosed 表示是我们主动关闭的，属于正常情况，要排除掉；其他错误（比如端口被占用）才是真正的启动失败。'},{at:'<-ctx.Done()',text:'等待退出信号（这个 ctx 来自 signal.NotifyContext）。'},{at:'shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)',to:'defer cancel()',text:'收尾最多等 10 秒。'},{at:'if err := srv.Shutdown(shutdownCtx); err != nil {',to:'log.Printf("没能在 10 秒内处理完：%v", err)',text:'停止接收新请求，等正在处理的请求完成。main 会在这里等它返回。'},{at:'closeResources()',text:'最后关闭数据库连接、后台任务等资源。'}]},
  {title:'防止重复提交：靠后端的幂等键',body:'用户点“提交订单”时手一抖点了两次，或者网络超时后前端自动重试，后端就会收到两个一模一样的请求，可能创建出两个订单、扣两次钱。\n前端把按钮置灰只是辅助手段，挡不住网络重试，也挡不住有人直接调接口。可靠的做法是在后端做“幂等”：同一个操作不管执行多少次，结果都和执行一次一样。\n常见实现是幂等键：前端在打开提交页面时生成一个唯一的 ID（幂等键），提交时带上。后端处理前先检查这个 ID 是否已经处理过：比如用 Redis 的 SET key NX（不存在才设置成功）抢占，或者在数据库里给这个 ID 建唯一索引。已经处理过的，就直接返回上次的结果，不再重复执行。'},
  {title:'性能优化第一条：先测量，再动手',body:'凭感觉优化，往往改了半天，真正慢的地方一点没动，还把代码改得难懂了。正确的顺序是：先用工具找到真正的瓶颈，改完再测一次确认真的变快了。Go 自带了一整套工具：\nbenchmark：测一个函数的耗时和内存分配（-benchmem）；\npprof：抓取一段时间的运行数据，看 CPU 时间花在哪些函数上、内存被谁占着、锁的争抢和阻塞发生在哪里；\ntrace：按时间线记录每个 goroutine 什么时候在运行、什么时候在等待、GC 什么时候发生；\nGODEBUG=schedtrace=1000：每 1000 毫秒打印一次调度器的概况，比如有多少 P、多少线程、队列里排着多少 goroutine；GODEBUG=gctrace=1 打印每轮 GC 的情况。'},
  {title:'pprof：找到最耗 CPU 和内存的地方',body:'pprof 是最常用的性能分析工具。在服务里导入 net/http/pprof 后，就可以随时抓取数据：\nCPU profile：采样一段时间（比如 30 秒），统计每个函数占用了多少 CPU 时间，找出“热点”函数；\nheap profile：分析内存。它有两种看法：inuse_space 是“现在还占着”的内存，用来找内存为什么一直降不下来；alloc_space 是“累计分配过”的内存（包括已经回收的），用来找哪里分配得太频繁、给 GC 增加了压力；\nmutex 和 block profile：看锁争抢和阻塞等待。\n用 go tool pprof 打开后，输入 top 看排名，或者用 -http 参数在浏览器里看火焰图：越宽的方块，占用越多。',code:`go tool pprof -http=:8081 http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof -sample_index=inuse_space http://localhost:6060/debug/pprof/heap
go tool pprof -sample_index=alloc_space http://localhost:6060/debug/pprof/heap`,explain:[{at:'go tool pprof -http=:8081 http://localhost:6060/debug/pprof/profile?seconds=30',text:'采集 30 秒的 CPU 数据，并在浏览器的 8081 端口打开图形界面，可以看火焰图。'},{at:'go tool pprof -sample_index=inuse_space http://localhost:6060/debug/pprof/heap',text:'按“当前还占用着的内存”分析堆，用来查内存泄漏。'},{at:'go tool pprof -sample_index=alloc_space http://localhost:6060/debug/pprof/heap',text:'按“累计分配过的内存”分析堆，用来查分配过于频繁的地方。'}]},
  {title:'trace：看清楚时间都花在等什么上',body:'pprof 擅长回答“CPU 忙的时候在忙什么”。但有些问题是“CPU 明明没跑满，请求却很慢”，时间都花在等待上了：等锁、等 channel、等网络、等系统调用、等 GC，或者 goroutine 已经可以运行了，却在队列里排队等 P。\n这类问题更适合用 trace：它按时间线记录每个 goroutine 的状态变化，能看到某个请求在哪个时间点、因为什么原因卡住了多久。\n用法：go test -trace=trace.out，或者在服务里通过 /debug/pprof/trace?seconds=5 采集 5 秒数据，再用 go tool trace trace.out 在浏览器里查看。'},
  {title:'几个常见的优化手法',body:'一、删除切片元素：如果不需要保持顺序，把最后一个元素搬过来覆盖要删除的位置，再把切片缩短一位，只要 O(1) 的时间；而保持顺序的删除要把后面的元素全部往前挪，是 O(n)。\n二、复制切片用 slices.Clone。要注意它是“浅拷贝”：只复制切片里的元素本身。如果元素是指针，复制出来的仍然指向同一批对象，通过新切片修改对象，原切片也能看到。\n三、JSON 解析尽量直接解码到结构体。先解码到 map[string]any 再一个个取值，要多做很多分配和类型断言，通常更慢，代码也更乱。\n四、热点循环里避免反复复制大结构体，可以用指针或下标访问。\n五、字符串和 []byte 的“零拷贝”转换需要用 unsafe 包，只有在确认这里就是瓶颈、并且能保证数据不会被修改时才用。'},
  {title:'动手试试：快速删除和浅拷贝',body:'验证上一张卡片的两个结论：用最后一个元素覆盖来删除，以及 slices.Clone 只是浅拷贝。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。'],expect:'[10 40 30]\n改了 b[0].N 之后 a[0].N = 100\n换掉 b[1] 之后 a[1].N = 2'},code:`package main

import (
    "fmt"
    "slices"
)

type Item struct{ N int }

func removeAt(s []int, i int) []int {
    s[i] = s[len(s)-1]
    return s[:len(s)-1]
}

func main() {
    nums := []int{10, 20, 30, 40}
    fmt.Println(removeAt(nums, 1))

    a := []*Item{{N: 1}, {N: 2}}
    b := slices.Clone(a)
    b[0].N = 100
    fmt.Println("改了 b[0].N 之后 a[0].N =", a[0].N)
    b[1] = &Item{N: 9}
    fmt.Println("换掉 b[1] 之后 a[1].N =", a[1].N)
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"slices"',text:'导入 fmt 和 slices。'},{at:'type Item struct{ N int }',text:'一个简单的结构体。'},{at:'func removeAt(s []int, i int) []int {',text:'删除第 i 个元素，不保持顺序。'},{at:'s[i] = s[len(s)-1]',text:'用最后一个元素覆盖第 i 个。'},{at:'return s[:len(s)-1]',text:'切掉最后一位。整个过程和切片长度无关，是 O(1)。'},{at:'func main() {',text:'程序入口。'},{at:'nums := []int{10, 20, 30, 40}',to:'fmt.Println(removeAt(nums, 1))',text:'删掉下标 1 的 20：40 被搬到了它的位置，结果是 [10 40 30]，顺序变了。'},{at:'a := []*Item{{N: 1}, {N: 2}}',text:'一个装着两个指针的切片。'},{at:'b := slices.Clone(a)',text:'复制出 b。复制的是两个指针，它们仍然指向原来那两个 Item。'},{at:'b[0].N = 100',to:'fmt.Println("改了 b[0].N 之后 a[0].N =", a[0].N)',text:'通过 b 修改第一个 Item 的字段，a 看到的是同一个对象，也变成了 100。这就是浅拷贝。'},{at:'b[1] = &Item{N: 9}',to:'fmt.Println("换掉 b[1] 之后 a[1].N =", a[1].N)',text:'但把 b[1] 整个换成一个新指针，不影响 a，因为两个切片的元素存放位置是各自独立的。a[1].N 还是 2。'}]},
  {title:'案例：一个接口的 P99 延迟很高，怎么查',body:'P99 延迟的意思是：把所有请求按耗时从小到大排序，第 99% 位置的那个耗时。它反映的是“最慢的那 1% 用户”的体验，比平均值更能暴露问题。排查可以按这个思路：\n一、先看监控：是一直高还是某个时间点开始变高？和发版、流量上涨、某个下游变慢的时间是否吻合？错误率有没有一起升高？\n二、看链路追踪：一个慢请求的时间都花在了哪一段：数据库、缓存、调用别的服务，还是自己的计算？\n三、用 pprof 看 CPU 热点、内存分配和锁争抢；用 trace 看 goroutine 是不是在排队、等锁或者被 GC 拖慢。\n四、常见的优化方向：减少下游调用次数（合并请求、批量查询、加缓存）；复用连接（数据库和 HTTP 连接池）；控制并发数，避免把下游打垮；给慢查询加索引；减少不必要的内存分配，降低 GC 压力。\n五、改完之后用压测和监控对比，确认 P99 真的降下来了。'}
 ],quiz:[
  {id:'go-engineering-1',q:'http.ListenAndServe(addr, nil) 中 Handler 传 nil 时会使用？',options:['不处理任何请求','http.DefaultServeMux','Gin 框架的默认路由','返回 404 的空 Handler'],why:['nil 时会使用默认的路由器，而不是不处理。','','标准库与 Gin 无关。','会按 DefaultServeMux 中注册的路由处理。'],answer:1,explain:'通过 http.HandleFunc 注册的路由就在 DefaultServeMux 中。',interview:'q-99686b73b491e50b'},
  {id:'go-engineering-2',q:'Gin 中间件里调用 c.Next() 的作用是？',options:['跳过当前这个请求不处理','先跑后续 handler 再回来','结束整个服务进程的运行','复制一份 Context 对象'],why:['Next 会继续执行后续处理，跳过要用 Abort。','','Next 与服务生命周期无关。','复制 Context 用 c.Copy()。'],answer:1,explain:'Next 让中间件形成“前后包裹”，常用于计时、日志、恢复 panic。',interview:'q-0bd2aeebf1173124'},
  {id:'go-engineering-3',type:'judge',q:'在 Gin 中间件里调用 c.Abort() 后，当前函数会立刻退出。',answer:false,explain:'Abort 只阻止后续 handlers 执行，当前函数会继续往下跑，所以通常要紧跟 return。',interview:'q-0bd2aeebf1173124'},
  {id:'go-engineering-4',q:'Gin 参数校验时，年龄 0 也是合法输入，又要区分“没有传”，字段该怎么定义？',options:['Age int `binding:"required"`','Age *int `binding:"required"`','Age string `binding:"required"`','Age int（不加任何校验）'],why:['required 会把零值 0 当作没传，合法的 0 会被拒绝。','','改成字符串失去了数字校验，还要自己转换。','不校验就无法区分“没传”和“传了 0”。'],answer:1,explain:'用指针字段时，nil 表示没传，指向 0 表示传了 0。',interview:'q-14e3558c2af9031a'},
  {id:'go-engineering-5',q:'防止表单重复提交，最可靠的做法是？',options:['前端点击后禁用提交按钮','后端幂等键识别，唯一约束兜底','提交后让服务端 Sleep 一秒','表单中加入 CSRF token'],why:['前端禁用只能改善体验，绕过前端或网络重试时仍会重复。','','Sleep 不能阻止重复请求，只会拖慢响应。','CSRF token 防的是跨站伪造请求，不是重复提交。'],answer:1,explain:'前端禁用只能改善体验；CSRF token 防的是跨站伪造，不是幂等。后端幂等设计才可靠。',interview:'q-5c023688dd855a4c'},
  {id:'go-engineering-6',q:'GORM 的 db.Transaction(func(tx *gorm.DB) error {...}) 中，回调返回错误会怎样？',options:['提交事务','回滚事务','忽略错误继续提交','发生 panic'],why:['只有回调返回 nil 时才提交。','','返回错误不会被忽略。','返回错误是正常流程，不会 panic。'],answer:1,explain:'回调里的所有操作都要用 tx，不能误用外层 db。',interview:'q-5eab15dc233fb980'},
  {id:'go-engineering-7',type:'multi',q:'服务优雅关闭需要做哪些事？（多选）',options:['停止接收新请求','给进行中的请求有上限的完成时间','从注册中心或负载均衡中摘除实例','关闭后台任务和资源'],why:['','','',''],answers:[0,1,2,3],explain:'net/http 用 Shutdown(ctx) 停止接收并等待进行中的请求；直接 os.Exit 会中断请求，也不执行 defer。',interview:'q-d3a96968976d3e7d'},
  {id:'go-engineering-8',type:'fill',q:'运行 benchmark 时想同时看到每次操作的内存分配次数和字节数，要加参数 ____。',accepted:['-benchmem','benchmem'],explain:'-benchmem 会输出 B/op 和 allocs/op；也可以在基准里调用 b.ReportAllocs()。',interview:'q-27a7996ddf3bff5d'},
  {id:'go-engineering-9',q:'想知道“请求为什么等了很久、CPU 为什么没跑满”，更适合哪个工具？',options:['pprof CPU profile','runtime trace','gofmt','go vet'],why:['CPU profile 看的是 CPU 时间花在哪，等待时间不会体现。','','gofmt 是代码格式化工具。','go vet 是静态检查工具。'],answer:1,explain:'trace 记录 goroutine 调度、阻塞、系统调用和 GC 的时间线。',interview:'q-410a01521534bfcc'},
  {id:'go-engineering-10',q:'用 pprof 分析内存时，inuse_space 表示？',options:['启动以来累计分配的字节','当前仍存活的内存','操作系统统计的 RSS','GC 运行的次数'],why:['累计分配量是 alloc_space。','','RSS 包含运行时未归还的内存、栈等，与堆上存活对象不同。','GC 次数不是内存大小指标。'],answer:1,explain:'inuse_space 看当前存活的内存，alloc_space 看累计分配量，两者意义不同。',interview:'q-d918716097c90db8'},
  {id:'go-engineering-11',q:'不要求保持顺序时，删除切片第 i 个元素最快的方式是？',options:['用末尾元素覆盖 s[i] 再截短','把后面的元素逐个往前移','新建一个切片复制其余元素','改用 map 来存储这些元素'],why:['','逐个前移是 O(n)，适合需要保序的场景。','新建并复制同样是 O(n)，还要额外分配内存。','换数据结构改变了使用方式，不是删除元素的方法。'],answer:0,explain:'覆盖再截短是 O(1)；元素含指针时记得把尾部清零，避免残留引用。',interview:'q-ce9139e2ff585c12'},
  {id:'go-engineering-12',type:'judge',q:'slices.Clone 会把切片里指针指向的对象也一起深拷贝。',answer:false,explain:'slices.Clone 是浅拷贝，只复制元素本身；指针、map、slice 元素指向的数据仍然共享。',interview:'q-03de90c85069fa3d'},
  {id:'go-engineering-13',q:'用 Viper 实现配置热更新时，新配置应该怎样发布给业务代码？',options:['直接修改正在使用的配置字段','校验后用原子指针整体替换','每次修改配置都重启整个服务','每次请求都重新读取配置文件'],why:['修改正在被读取的对象会产生数据竞争。','','重启会中断服务，失去热更新的意义。','频繁读文件开销大，还可能读到写了一半的文件。'],answer:1,explain:'先解析校验，失败就保留旧配置；成功后整体替换，读者拿到的始终是完整快照。',interview:'q-eee7ec9d9516a477'},
  {id:'go-engineering-14',type:'judge',q:'json.Unmarshal 到 map[string]any 再逐个取值，通常比直接解码到结构体更快。',answer:false,explain:'经过 map 中转会多出大量分配和类型断言，通常更慢；直接解码到结构体更快也更安全。',interview:'q-fd7a0f3562629bc1'},
  {id:'go-engineering-15',q:'GODEBUG=schedtrace=1000 的作用是？',options:['每 1000 毫秒输出一次调度器概况','限制最多运行 1000 个 goroutine','每 1000 次请求打印一条日志','启动 1000 个系统线程'],why:['','它不限制 goroutine 数量。','它与业务请求无关。','它不控制线程数量。'],answer:0,explain:'schedtrace 定期输出 P、M、运行队列等信息，加 scheddetail=1 更详细。',interview:'q-eaf00bfd1d8e3bdb'},
  {id:'go-engineering-16',type:'short',q:'一个 API 接口 P99 延迟很高，你会怎么排查和优化？',reference:'先建立指标：QPS、错误率、P50/P95/P99 和资源使用；用链路追踪找出最慢的阶段，再用 pprof、trace 看 CPU 热点和等待。常见优化：减少下游调用次数、能批量就批量、设置超时并传递取消、复用连接、减少内存分配和序列化开销、缩小锁的范围、限制并发防止排队；必要时加缓存或异步化，但要明确一致性。优化后用同样的数据和负载对比，确认 P99 和错误率都没有变差。',points:['先看指标和链路追踪','pprof / trace 找热点和等待','减少调用、批量、超时、复用连接','同样负载下对比验证'],explain:'面试官想听的是“先测量、再定位、再优化、再验证”的完整闭环。',interview:'q-a2c3d84afb7585b5'},
 ]},
];
