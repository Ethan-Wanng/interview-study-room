import {A,type LessonStory} from './story';

// Go 动画课堂（一）：入门与进阶关卡。每个动画关联一个学习关卡（content/go-journey.ts）。
export const goLessonsA:LessonStory[]=[
 ({id:'go-an-start',level:'go-start',kind:'basic',icon:'📦',title:'一个 Go 程序是怎么跑起来的',summary:'从 go.mod 到 init，再到 main。',beats:[
  {say:'小明新建了一个项目，第一步：go mod init，生成 go.mod，记下模块名和 Go 版本。',add:[A('me','🧑‍💻','小明',80,170,{tone:'primary'}),A('mod','📄','go.mod',260,70,{kind:'item'})],send:[{from:'me',to:'mod',text:'go mod init'}]},
  {say:'代码里 import 了一个第三方包。go mod tidy 把它写进 go.mod，并在 go.sum 里记下校验和。',add:[A('sum','🔏','go.sum 校验和',260,170,{kind:'item',tone:'ok'})],send:[{from:'mod',to:'sum',text:'tidy'}]},
  {say:'go run 启动程序：先初始化依赖的包——包级变量先赋值，再执行 init。',add:[A('dep','📚','依赖包：变量 → init',470,70,{kind:'item',tone:'warm'})],send:[{from:'sum',to:'dep'}]},
  {say:'然后初始化 main 包自己的变量和 init，最后进入 main 函数。',add:[A('main','🚀','main.main',470,270,{kind:'item',tone:'ok'})],send:[{from:'dep',to:'main',text:'都准备好了'}]},
  {say:'main 一返回，整个程序就结束了。',bubble:{who:'me',text:'Hello, Gopher!',tone:'ok'}},
  {say:'记住启动顺序。',memo:['go.mod 管依赖，go.sum 校验','依赖包 init → main']},
 ]}),
 ({id:'go-an-values',level:'go-values',kind:'basic',icon:'🔢',title:'传值还是传指针：复印件和地址条',summary:'Go 只有值传递。',beats:[
  {say:'小明有一张卡片，上面写着分数 60。他要请老师帮忙改分。',add:[A('me','🧑','小明',90,170,{tone:'primary'}),A('card','🪪','卡片：60 分',260,170,{kind:'item'})]},
  {say:'方式一 传值：给老师一张复印件。老师在复印件上改成 90，小明手里的原件还是 60。',add:[A('t','🧑‍🏫','老师',530,170),A('copy','📄','复印件：90',400,80,{kind:'tag',tone:'warm'})],send:[{from:'card',to:'t',text:'复印件'}],sub:{card:'原件仍是 60'}},
  {say:'方式二 传指针：给老师一张写着“卡片放在几号抽屉”的地址条。老师照地址找到原件改成 90。',drop:['copy'],add:[A('addr','📍','地址条 &card',400,280,{kind:'tag',tone:'ok'})],send:[{from:'addr',to:'t'}]},
  {say:'这次原件真的变成 90 了。注意：地址条本身也是复印过去的——Go 只有值传递，只是复制的是地址。',sub:{card:'原件变成 90'},tone:{card:'ok'}},
  {say:'要修改调用方的数据、或者结构体很大时传指针；小对象只读时传值更简单。',memo:['Go 只有值传递','传指针 = 复制地址']},
 ]}),
 ({id:'go-an-collections',level:'go-collections',kind:'basic',icon:'🪟',title:'切片：底层数组上的一扇窗',summary:'len、cap 和 append。',beats:[
  {say:'底层有一个能放 5 个元素的数组，现在放了 3 个。切片是开在它上面的一扇窗。',add:[A('arr','🧱','底层数组 [1 2 3 _ _]',320,80,{kind:'item'}),A('s','🪟','s：len 3 · cap 5',320,220,{kind:'item',tone:'primary'})],send:[{from:'s',to:'arr',text:'指向'}]},
  {say:'append(s, 4)：容量够，直接放进原数组的空位，len 变成 4。',sub:{s:'len 4 · cap 5'},tone:{arr:'ok'}},
  {say:'再 append 两个：容量不够了，Go 分配一个更大的新数组，把旧元素复制过去。',add:[A('new','🧱','新数组 cap 10',530,80,{kind:'item',tone:'ok'})],send:[{from:'arr',to:'new',text:'复制'}]},
  {say:'所以一定要写 s = append(s, x)，接住返回的新切片。',send:[{from:'s',to:'new',text:'改指新数组',tone:'ok'}],bubble:{who:'s',text:'s = append(s, x)'}},
  {say:'map 也一样常用：m := make(map[string]int)，用 v, ok := m[k] 判断有没有。',add:[A('m','🗂️','map：key → value',120,320,{kind:'tag'})]},
  {say:'记住切片三件套。',memo:['指针 + len + cap','append 要接收返回值']},
 ]}),
 ({id:'go-an-funcs',level:'go-funcs',kind:'basic',icon:'🦆',title:'接口：会叫就是鸭子',summary:'隐式实现、组合与错误包装。',beats:[
  {say:'动物园要一个“会叫的东西”：接口 Speaker，只要求有 Speak() 方法。',add:[A('i','📜','interface Speaker',320,60,{kind:'item',tone:'primary'})]},
  {say:'Dog 实现了 Speak()，Duck 也实现了。它们不用声明 implements，就自动满足接口。',add:[A('dog','🐶','Dog',150,190),A('duck','🦆','Duck',490,190)],send:[{from:'dog',to:'i',text:'汪',tone:'ok'},{from:'duck',to:'i',text:'嘎',tone:'ok'}]},
  {say:'Go 没有继承，用组合：把 Engine 嵌入 Car，Car 就能直接调用 Engine 的方法。',add:[A('car','🚗','Car { Engine }',320,300,{kind:'item'})],sub:{car:'car.Start() 来自 Engine'}},
  {say:'出错时返回 error，往上层传时加上下文：fmt.Errorf("读取配置: %w", err)。',add:[A('err','⚠️','%w 包装错误',150,300,{kind:'tag',tone:'warm'})]},
  {say:'上层用 errors.Is 判断是不是某个错误，用 errors.As 取出具体类型。',bubble:{who:'car',text:'errors.Is(err, ErrNotFound)'}},
  {say:'记住接口和错误。',memo:['方法齐全就满足接口','%w 包装，Is / As 判断']},
 ]}),
 ({id:'go-an-stdlib',level:'go-stdlib',kind:'basic',icon:'🧰',title:'标准库工具箱：一条日志的处理之旅',summary:'bufio、strings、strconv、time、json。',beats:[
  {say:'有一个日志文件，每行像这样：“2025-01-02 15:04:05 | 200 | 35”（时间、状态码、耗时毫秒）。',add:[A('f','📄','access.log',90,80,{kind:'item'})]},
  {say:'os.Open 打开文件，bufio.Scanner 一行一行读，不用一次把大文件读进内存。',add:[A('sc','📜','bufio.Scanner',300,80,{kind:'item',tone:'primary'})],send:[{from:'f',to:'sc',text:'逐行'}]},
  {say:'strings.Split 按“|”切开，strings.TrimSpace 去掉空格。',add:[A('sp','✂️','strings.Split',510,80,{kind:'tag'})],send:[{from:'sc',to:'sp'}]},
  {say:'strconv.Atoi 把 "35" 变成数字 35；time.Parse 用参考时间 "2006-01-02 15:04:05" 当格式解析时间。',add:[A('cv','🔢','strconv.Atoi',510,200,{kind:'tag',tone:'warm'}),A('tm','⏰','time.Parse',300,200,{kind:'tag',tone:'warm'})],send:[{from:'sp',to:'cv'},{from:'sp',to:'tm'}]},
  {say:'统计结果放进结构体，json.Marshal 转成 JSON；结构体标签 `json:"avg_ms"` 控制字段名。',add:[A('js','🧾','json.Marshal',300,310,{kind:'item',tone:'ok'})],send:[{from:'cv',to:'js'},{from:'tm',to:'js'}]},
  {say:'记住这些常用包。',memo:['bufio 逐行读，strings 切分','strconv 转数字，time 解析']},
 ]}),
 ({id:'go-an-flow',level:'go-flow',kind:'basic',icon:'🍽️',title:'defer：叠盘子，后放先拿',summary:'执行顺序、参数求值与 recover。',beats:[
  {say:'函数里依次写了三个 defer：关文件、解锁、打日志。它们不会马上执行，而是像盘子一样叠起来。',add:[A('fn','🧑‍🍳','函数',110,170,{tone:'primary'}),A('d1','🍽️','① 关文件',380,280,{kind:'tag'}),A('d2','🍽️','② 解锁',380,210,{kind:'tag'}),A('d3','🍽️','③ 打日志',380,140,{kind:'tag'})]},
  {say:'函数返回时，从最上面开始拿：先打日志，再解锁，最后关文件——后注册的先执行。',tone:{d3:'ok'},focus:['d3'],bubble:{who:'fn',text:'③ → ② → ①'}},
  {say:'注意：defer 的参数在注册那一刻就算好了。defer fmt.Println(i) 记住的是当时的 i。',add:[A('arg','📌','参数注册时求值',380,60,{kind:'tag',tone:'warm'})]},
  {say:'发生 panic 时，这些 defer 照样执行。在 defer 里调用 recover，能把 panic 接住。',add:[A('p','💥','panic',570,200,{tone:'bad'})],send:[{from:'p',to:'fn',tone:'bad'}],tone:{fn:'warm'}},
  {say:'recover 只在同一个 goroutine 的 defer 里有效；接住后函数直接返回，不会回到 panic 的地方。',tone:{fn:'ok',p:'quiet'}},
  {say:'记住 defer。',memo:['后注册先执行','参数在注册时求值']},
 ]}),
 ({id:'go-an-generics',level:'go-generics',kind:'basic',icon:'🧬',title:'泛型：一个函数，多种类型',summary:'类型参数、约束和反射。',beats:[
  {say:'要写“求最大值”：给 int 写一个，给 float64 再写一个，给 string 又写一个……代码全是重复的。',add:[A('a','📄','MaxInt',110,80,{kind:'tag',tone:'warm'}),A('b','📄','MaxFloat',110,170,{kind:'tag',tone:'warm'}),A('c','📄','MaxString',110,260,{kind:'tag',tone:'warm'})]},
  {say:'Go 1.18 起有了泛型：func Max[T cmp.Ordered](a, b T) T。T 是类型参数，cmp.Ordered 是约束，规定 T 必须能比较大小。',add:[A('g','🧬','Max[T cmp.Ordered]',360,170,{kind:'item',tone:'primary'})],send:[{from:'a',to:'g'},{from:'b',to:'g'},{from:'c',to:'g'}]},
  {say:'调用时编译器自动推断类型：Max(3, 5) 用 int，Max("a", "b") 用 string，类型检查在编译期完成。',add:[A('use','✅','Max(3,5) · Max("a","b")',360,300,{kind:'tag',tone:'ok'})]},
  {say:'约束可以自己写：type Number interface { ~int | ~float64 }，~ 表示底层类型是它也算。',bubble:{who:'g',text:'~int 也接受\ntype Age int'}},
  {say:'反射（reflect）是另一种工具：运行时查看值的类型和字段，比如 JSON 库读结构体标签。它灵活但慢，类型错误到运行时才发现。',add:[A('rf','🔬','reflect：运行时检查',535,80,{kind:'tag'})]},
  {say:'能用泛型或接口解决的，就别用反射。',memo:['泛型：编译期，类型安全','反射：运行时，灵活但慢']},
 ]}),
 ({id:'go-an-channel',level:'go-channel',kind:'basic',icon:'📨',title:'channel：goroutine 之间的传送带',summary:'无缓冲、有缓冲、select 和 context。',beats:[
  {say:'厨师（goroutine）做菜，服务员（另一个 goroutine）上菜，中间用 channel 传递。',add:[A('cook','🧑‍🍳','厨师',90,170,{tone:'primary'}),A('ch','📮','channel',320,170,{kind:'item'}),A('w','🧑‍💼','服务员',550,170)]},
  {say:'无缓冲 channel：厨师必须等到服务员亲手接过去才能做下一道——发送和接收要碰头。',send:[{from:'cook',to:'w',text:'手递手'}],sub:{ch:'无缓冲：必须碰头'}},
  {say:'有缓冲 channel：中间有个能放 3 盘的出菜台，台子没满厨师就能继续做。',sub:{ch:'缓冲 3：没满不用等'},send:[{from:'cook',to:'ch',text:'放上台'}]},
  {say:'服务员同时等好几件事：出菜、顾客叫单、下班通知，用 select 谁先来先处理谁。',add:[A('sel','🔀','select',550,300,{kind:'tag',tone:'warm'})]},
  {say:'打烊了，经理用 context 发取消信号，大家看到 ctx.Done() 就收工。取消是通知，不是强行打断。',add:[A('ctx','🛑','ctx.Done()',320,300,{kind:'tag',tone:'bad'})],send:[{from:'ctx',to:'cook'},{from:'ctx',to:'w'}]},
  {say:'记住 channel 的用法。',memo:['无缓冲碰头，有缓冲暂存','select 多路等，context 取消']},
 ]}),
];
