import {A,type Story} from '../story';

// Go 面试题动画（特性一）：context、switch、defer 的结构与顺序、循环中的 defer、defer 的坑、panic 与 recover。
export const gxE:Record<string,Story>={
 'q-24b68e3ea02c8051':{title:'context 的正确用法',beats:[
  {say:'一个请求进来，handler 拿到 r.Context()，一路传给数据库查询和下游 RPC 调用，作为第一个参数 ctx。',add:[A('req','🌐','HTTP 请求',110,170,{tone:'primary'}),A('db','🗄️','查数据库',360,90,{kind:'item'}),A('rpc','📞','调下游',360,250,{kind:'item'})],send:[{from:'req',to:'db',text:'ctx'},{from:'req',to:'rpc',text:'ctx'}]},
  {say:'用 context.WithTimeout 设置总超时，记得 defer cancel() 及时释放资源。',add:[A('to','⏱️','超时 + cancel',560,90,{kind:'tag',tone:'ok'})]},
  {say:'用户关闭了页面，请求被取消，ctx.Done() 关闭，所有收到这个 ctx 的操作都会尽快停下。',tone:{db:'warm',rpc:'warm'},bubble:{who:'req',text:'用户走了，停下'}},
  {say:'不要把 ctx 存进结构体字段；不要传 nil，不确定时用 context.TODO()；WithValue 只放请求范围的元数据（trace id、用户身份），不要用来传业务参数。',add:[A('rules','📏','作为参数传 · Value 只放元数据',360,330,{kind:'tag',tone:'warm'})]},
  {say:'记住最佳实践。',memo:['ctx 作为第一个参数一路传递','设超时、defer cancel，Value 只放元数据']},
 ]},
 'q-1117fbfafaf16819':{title:'Go 的 switch 有什么不同',beats:[
  {say:'Go 的 switch 每个 case 执行完自动结束，不需要写 break，也不会“穿透”到下一个 case。',add:[A('sw','🔀','switch x',320,60,{kind:'item',tone:'primary'})]},
  {say:'想继续执行下一个 case，要显式写 fallthrough，而且它不判断下一个 case 的条件。',add:[A('ft','⬇️','fallthrough：不判断条件',150,180,{kind:'tag',tone:'warm'})]},
  {say:'一个 case 可以列多个值：case 1, 2, 3；switch 后面可以不写表达式，直接 case x > 10 当 if-else 链用。',add:[A('multi','📋','多值 case · 无表达式 switch',470,180,{kind:'tag',tone:'ok'})]},
  {say:'类型 switch：switch v := x.(type) { case int: … case string: … }。注意在 for 循环里的 switch 中写 break 只跳出 switch，要跳出循环得用标签。',add:[A('ty','🏷️','type switch · break 只出 switch',320,300,{kind:'tag',tone:'primary'})]},
  {say:'记住 switch 细节。',memo:['默认不穿透，fallthrough 不判断条件','break 只跳出 switch，跳循环用标签']},
 ]},
 'q-baf1690f65748343':{title:'defer 在底层是怎么存的',beats:[
  {say:'每个 defer 语句会生成一条“延迟调用记录”（runtime._defer）：要调用的函数、已经求值好的参数，挂在当前 goroutine 上。',add:[A('g','🧵','goroutine',110,170,{tone:'primary'}),A('d1','📝','_defer 记录',360,170,{kind:'item'})],send:[{from:'g',to:'d1',text:'链表头插'}]},
  {say:'多个 defer 用链表串起来，新的插在头部，函数返回时从头开始执行，所以是后进先出。',add:[A('d2','📝','更早的 _defer',560,170,{kind:'tag'})],send:[{from:'d1',to:'d2'}]},
  {say:'早期版本记录都分配在堆上，开销大。Go 1.13 起可以分配在栈上，Go 1.14 引入开放编码（open-coded defer）：编译器把 defer 直接展开到函数返回前，几乎零成本。',add:[A('opt','⚡','栈分配 → 开放编码',360,300,{kind:'tag',tone:'ok'})]},
  {say:'开放编码有条件：比如 defer 不在循环里、数量不多。循环里的 defer 仍然走链表方式，而且每轮都会积累。',add:[A('loop','🔁','循环里的 defer 无法展开',360,60,{kind:'tag',tone:'warm'})]},
  {say:'记住 defer 的实现。',memo:['_defer 记录挂在 goroutine 上，后进先出','1.14 开放编码，循环中的 defer 例外']},
 ]},
 'q-45f3e26274ac8bf2':{title:'defer 的执行顺序和常见场景',beats:[
  {say:'依次写了三个 defer：打印 1、2、3。函数返回时输出 3、2、1——后注册的先执行，像叠盘子。',add:[A('s','🍽️','defer 1 · 2 · 3',320,60,{kind:'item',tone:'primary'}),A('out','🖨️','输出 3 2 1',320,170,{kind:'tag',tone:'ok'})]},
  {say:'执行时机：return 语句先给返回值赋值，然后执行 defer，最后函数真正返回。所以 defer 能修改命名返回值。',add:[A('ret','↩️','赋值返回值 → defer → 返回',320,270,{kind:'tag',tone:'warm'})]},
  {say:'常见场景：打开文件后立刻 defer f.Close()；加锁后 defer mu.Unlock()；defer 里 recover 捕获 panic；统计函数耗时。',add:[A('use','🧰','Close · Unlock · recover · 计时',150,320,{kind:'tag'})]},
  {say:'就算发生 panic，已经注册的 defer 也会执行；但调用 os.Exit 时 defer 不会执行。',add:[A('exit','🚪','os.Exit 不执行 defer',490,320,{kind:'tag',tone:'bad'})]},
  {say:'记住顺序。',memo:['后进先出','赋值返回值后、真正返回前执行']},
 ]},
 'q-0b9e92fc15005e5d':{title:'循环打开 10 万个文件，defer 写在哪',beats:[
  {say:'for 循环里每打开一个文件就写一个 defer f.Close()。问题：defer 要等整个函数返回才执行。',add:[A('loop','🔁','for 10 万次：Open + defer Close',320,70,{kind:'item',tone:'bad'})]},
  {say:'循环跑完之前一个文件都没关，打开的文件越来越多，很快超过系统文件描述符上限：too many open files。',add:[A('fd','💥','too many open files',320,190,{kind:'tag',tone:'bad'})]},
  {say:'解决：把每次循环的处理抽成一个函数，在这个函数里 defer f.Close()，每处理完一个文件就关闭。',add:[A('fn','📦','抽成函数里 defer',170,300,{kind:'tag',tone:'ok'})],tone:{loop:'ok'}},
  {say:'或者在循环体里处理完就显式调用 Close 并检查错误；如果还要并发处理，用信号量限制同时打开的数量。',add:[A('sem','🎫','显式 Close · 限制并发',490,300,{kind:'tag',tone:'ok'})]},
  {say:'记住要点。',memo:['defer 在函数返回时才执行','循环体抽成函数，或显式关闭']},
 ]},
 'q-fd43307d59e4125a':{title:'defer 的三个坑',beats:[
  {say:'坑一：参数在 defer 注册时就求值了。i := 1; defer fmt.Println(i); i = 2，最后打印的是 1。想打印最新值，用闭包 defer func(){ fmt.Println(i) }()。',add:[A('a','1️⃣','参数注册时求值',150,80,{kind:'item',tone:'warm'})]},
  {say:'坑二：defer 能修改命名返回值。func f() (n int) { defer func(){ n++ }(); return 1 } 返回的是 2。',add:[A('b','2️⃣','可改命名返回值',490,80,{kind:'item',tone:'warm'})]},
  {say:'坑三：defer f.Close() 忽略了返回的错误。写文件时 Close 才真正刷盘，出错会丢数据，应该检查并把错误合并到返回值里。',add:[A('c','3️⃣','忽略 Close 的错误',150,230,{kind:'item',tone:'bad'})]},
  {say:'还要注意：资源打开失败时 f 是 nil，要先检查 err 再 defer；defer 写在循环里会积累。',add:[A('d','⚠️','先判 err 再 defer',490,230,{kind:'tag'})]},
  {say:'记住三个坑。',memo:['参数立即求值，闭包读最新值','能改命名返回值，Close 的错误要检查']},
 ]},
 'q-3ca3e2c2a65b7c3a':{title:'panic 和 recover 的细节',beats:[
  {say:'函数里发生 panic，正常流程立即停止，开始逐层执行已注册的 defer，一直向上冒到 goroutine 顶层。',add:[A('p','💥','panic',320,60,{kind:'item',tone:'bad'}),A('d','🧾','执行 defer',320,170,{kind:'item'})],send:[{from:'p',to:'d'}]},
  {say:'只有在 defer 函数里直接调用 recover() 才能接住 panic，返回 panic 的值，程序从当前函数正常返回。',add:[A('r','🛟','defer func(){ recover() }()',150,290,{kind:'tag',tone:'ok'})],send:[{from:'d',to:'r'}]},
  {say:'recover 只对当前 goroutine 有效：子 goroutine 里的 panic，主 goroutine 接不住，没被接住整个程序都会崩溃。所以每个后台 goroutine 都要自己 recover。',add:[A('g','🧵','跨 goroutine 接不住',490,290,{kind:'tag',tone:'bad'})]},
  {say:'有些错误 recover 不了：并发读写 map、栈溢出、内存耗尽是致命错误。panic 适合程序员错误，业务错误应该返回 error。',bubble:{who:'r',text:'fatal error 我接不住'}},
  {say:'记住细节。',memo:['recover 必须在 defer 中直接调用','只管当前 goroutine，fatal error 无法恢复']},
 ]},
};
