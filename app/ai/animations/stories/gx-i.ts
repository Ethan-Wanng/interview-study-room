import {A,type Story} from '../story';

// Go 面试题动画（性能优化一）：benchmark、pprof、trace、GODEBUG、GC 分析、逃逸分析。
export const gxI:Record<string,Story>={
 'q-27a7996ddf3bff5d':{title:'用 benchmark 测性能',beats:[
  {say:'在 _test.go 里写 func BenchmarkJoin(b *testing.B)。Go 1.24 起推荐 for b.Loop() { … }，以前写 for i := 0; i < b.N; i++。',add:[A('bm','⏱️','BenchmarkJoin',320,60,{kind:'item',tone:'primary'})]},
  {say:'运行 go test -bench=Join -benchmem，得到三个关键数字：ns/op 每次耗时、B/op 每次分配的字节、allocs/op 每次分配次数。',add:[A('out','📊','ns/op · B/op · allocs/op',320,170,{kind:'tag',tone:'ok'})]},
  {say:'准备数据的代码不要计入：放在循环外，或用 b.ResetTimer()；结果要被使用，否则可能被编译器优化掉（b.Loop 会帮你避免）。',add:[A('pit','⚠️','准备数据不计时',130,280,{kind:'tag',tone:'warm'})]},
  {say:'一次结果有波动。用 -count=10 多跑几次，再用 benchstat 对比优化前后，看差异是否显著。',add:[A('stat','📈','-count=10 + benchstat',510,280,{kind:'tag',tone:'primary'})]},
  {say:'记住基准测试。',memo:['b.Loop()，-benchmem 看分配','多次运行，用 benchstat 对比']},
 ]},
 'q-d918716097c90db8':{title:'用 pprof 找到 CPU 热点',beats:[
  {say:'服务 CPU 很高。先 import _ "net/http/pprof" 暴露调试接口（只在内网端口开放）。',add:[A('svc','🖥️','Go 服务',110,170,{kind:'item',tone:'bad'}),A('ep','🔌','/debug/pprof',360,60,{kind:'tag'})]},
  {say:'go tool pprof -http=:0 http://host:6060/debug/pprof/profile?seconds=30，采样 30 秒 CPU。',add:[A('cpu','🔥','CPU profile 30s',360,170,{kind:'item',tone:'primary'})],send:[{from:'svc',to:'cpu'}]},
  {say:'在火焰图里，越宽的函数占用 CPU 越多。发现 regexp.Compile 占了 40%——每个请求都在重新编译正则。',add:[A('flame','🔥','火焰图：regexp.Compile 40%',360,290,{kind:'tag',tone:'bad'})]},
  {say:'其他 profile：heap 看内存（inuse 当前占用、alloc 累计分配），goroutine 看协程堆栈，mutex 和 block 看锁和阻塞。修复后再采一次对比。',add:[A('other','🧰','heap · mutex…',560,280,{kind:'tag'})],tone:{svc:'ok',flame:'ok'}},
  {say:'记住 pprof。',memo:['net/http/pprof 采样，火焰图看宽度','CPU、heap、goroutine、mutex 各有用途']},
 ]},
 'q-410a01521534bfcc':{title:'用 trace 看“时间去哪了”',beats:[
  {say:'接口延迟高，但 CPU profile 看不出热点。CPU 不忙，时间可能花在“等待”上：调度延迟、阻塞、GC。',add:[A('slow','🐢','延迟高，CPU 不高',320,60,{kind:'item',tone:'warm'})]},
  {say:'采集执行追踪：curl -o trace.out http://host:6060/debug/pprof/trace?seconds=5，再用 go tool trace trace.out 打开。',add:[A('tr','🎞️','go tool trace',320,170,{kind:'item',tone:'primary'})],send:[{from:'slow',to:'tr'}]},
  {say:'时间线上能看到每个 P 上运行的 goroutine、阻塞在 channel 或锁上的时间、系统调用、GC 暂停，以及 goroutine 从可运行到真正运行的调度延迟。',add:[A('view','📊','调度 · 阻塞 · 系统调用 · GC',320,280,{kind:'tag',tone:'ok'})]},
  {say:'pprof 回答“CPU 花在哪”，trace 回答“为什么在等”。trace 文件很大，只采几秒；新版本还支持飞行记录器，出问题时保存最近一段时间的追踪。',bubble:{who:'tr',text:'原来都在等锁'}},
  {say:'记住 trace。',memo:['看等待：调度、阻塞、GC','pprof 看占用，trace 看时间线']},
 ]},
 'q-eaf00bfd1d8e3bdb':{title:'用 GODEBUG 观察调度器',beats:[
  {say:'GODEBUG=schedtrace=1000 ./app：每 1000 毫秒打印一行调度器摘要。',add:[A('cmd','⌨️','GODEBUG=schedtrace=1000',320,60,{kind:'item',tone:'primary'})]},
  {say:'输出里有 gomaxprocs（P 的数量）、idleprocs（空闲 P）、threads（线程数）、runqueue（全局队列长度），以及每个 P 的本地队列长度 [3 0 5 1]。',add:[A('line','📜','gomaxprocs · idleprocs · runqueue',320,170,{kind:'tag'})]},
  {say:'如果本地队列长期很长、idleprocs 为 0，说明 CPU 不够用或 goroutine 太多；threads 一直上涨，可能有大量阻塞的系统调用或 cgo。',add:[A('read','🔍','队列长 → CPU 不够',150,280,{kind:'tag',tone:'warm'}),A('thr','🧵','线程涨 → 阻塞调用',490,280,{kind:'tag',tone:'warm'})]},
  {say:'加上 scheddetail=1 可以看到每个 G、M、P 的详细状态，但输出很多，只在排查时短暂打开。GODEBUG 还有 gctrace=1 等选项。',bubble:{who:'cmd',text:'只在排查时开'}},
  {say:'记住 GODEBUG。',memo:['schedtrace 周期打印调度摘要','看队列长度、空闲 P 和线程数']},
 ]},
 'q-ade7587e017cd344':{title:'分析 Go 程序的 GC 情况',beats:[
  {say:'GODEBUG=gctrace=1 运行程序，每次 GC 打印一行：第几次 GC、占用 CPU 的比例、各阶段耗时、堆大小变化 12->15->8 MB、目标堆大小。',add:[A('gt','📜','gctrace=1',320,60,{kind:'item',tone:'primary'})]},
  {say:'也可以在程序里读 runtime/metrics 或 runtime.ReadMemStats，把 GC 次数、暂停时间、堆大小接入监控面板。',add:[A('mx','📈','runtime/metrics → 监控',150,180,{kind:'tag',tone:'ok'})]},
  {say:'GC 太频繁的根本原因通常是分配太多：用 heap profile 的 alloc_space 找出分配最多的代码，减少临时对象、复用缓冲（sync.Pool）、预分配切片。',add:[A('alloc','🧮','alloc_space 找分配热点',490,180,{kind:'tag',tone:'warm'})]},
  {say:'调参是辅助手段：GOGC 调大以内存换更少的 GC；GOMEMLIMIT 设置软内存上限，容器里防止 OOM。先减少分配，再考虑调参。',add:[A('tune','🎛️','GOGC · GOMEMLIMIT',320,300,{kind:'tag'})]},
  {say:'记住 GC 分析。',memo:['gctrace 和 runtime/metrics 观察','先减少分配，再调 GOGC / GOMEMLIMIT']},
 ]},
 'q-8128966a2c96a4cc':{title:'内存逃逸分析',beats:[
  {say:'编译器决定变量放在栈上还是堆上。栈上的变量函数返回就回收，几乎没成本；逃逸到堆上的要由 GC 回收。',add:[A('stack','📚','栈：快，自动回收',150,80,{kind:'item',tone:'ok'}),A('heap','🗄️','堆：GC 回收',490,80,{kind:'item',tone:'warm'})]},
  {say:'用 go build -gcflags="-m" 查看：输出里有 "moved to heap: x" 或 "escapes to heap"。',add:[A('cmd','⌨️','go build -gcflags="-m"',320,200,{kind:'tag',tone:'primary'})]},
  {say:'常见逃逸原因：返回局部变量的指针、把值赋给接口（如传给 fmt.Println 的 any 参数）、闭包捕获变量、大小在编译期不确定的 make、对象太大。',add:[A('why','🔍','返回指针 · 接口 · 闭包 · 动态大小',320,300,{kind:'tag'})],send:[{from:'stack',to:'heap',text:'逃逸'}]},
  {say:'逃逸本身不是错误，Go 返回局部变量指针是安全的。只有在 profile 证明是热点时，才通过改成传值、预分配、避免接口装箱来减少逃逸。',bubble:{who:'heap',text:'先看 profile 再优化'}},
  {say:'记住逃逸分析。',memo:['-gcflags="-m" 查看逃逸','逃逸不是错，热点处才优化']},
 ]},
};
