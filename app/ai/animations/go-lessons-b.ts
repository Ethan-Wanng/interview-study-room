import {A,type LessonStory} from './story';

// Go 动画课堂（二）：进阶、高阶与专家关卡。
export const goLessonsB:LessonStory[]=[
 ({id:'go-an-memory',level:'go-memory',kind:'basic',icon:'🧵',title:'字符串拼接：为什么循环里别用 +=',summary:'string 只读，Builder 才高效。',beats:[
  {say:'字符串是只读的。s += "a" 并不是在原地追加，而是新开一块内存，把旧内容和新内容一起复制进去。',add:[A('s1','📦','"ab"',110,90,{kind:'tag'}),A('s2','📦','"abc"',290,90,{kind:'tag'}),A('s3','📦','"abcd"',470,90,{kind:'tag'})],send:[{from:'s1',to:'s2',text:'复制'},{from:'s2',to:'s3',text:'再复制'}]},
  {say:'循环 1 万次，就要分配和复制 1 万次，越到后面复制得越多。',add:[A('slow','🐢','复制量越滚越大',290,200,{kind:'tag',tone:'bad'})]},
  {say:'strings.Builder 像一个可以伸缩的袋子：往里写只是追加，最后 String() 一次性取出。',drop:['slow'],add:[A('b','🧺','strings.Builder',290,220,{kind:'item',tone:'ok'})],tone:{s3:'quiet'}},
  {say:'知道大概长度时先 Grow 预留空间，连扩容都省了。',sub:{b:'Grow(64) 预留'},bubble:{who:'b',text:'一次取出'}},
  {say:'同理，切片扩容也会复制：预估好容量用 make([]T, 0, n)。',add:[A('mk','📏','make([]T, 0, n)',290,320,{kind:'tag',tone:'ok'})]},
  {say:'记住减少复制。',memo:['字符串只读，+= 每次复制','循环拼接用 Builder']},
 ]}),
 ({id:'go-an-sync',level:'go-sync',kind:'basic',icon:'🔒',title:'Mutex 和 WaitGroup：一把锁和一个计数器',summary:'保护共享数据，等所有人做完。',beats:[
  {say:'三个 goroutine 同时给计数器加一，不加保护，有的加一会丢。',add:[A('c','🔢','count',320,170,{kind:'item',tone:'bad'}),A('g1','🐹','G1',110,80),A('g2','🐹','G2',110,170),A('g3','🐹','G3',110,260)],send:[{from:'g1',to:'c',tone:'bad'},{from:'g2',to:'c',tone:'bad'}]},
  {say:'加一把 Mutex：同一时间只有一个 goroutine 能进去改，改完 Unlock，下一个再进。',add:[A('mu','🔒','sync.Mutex',320,60,{kind:'tag',tone:'ok'})],tone:{c:'ok'},bubble:{who:'c',text:'一个一个来'}},
  {say:'main 怎么知道三个都做完了？WaitGroup：启动前 Add(3)，每个做完 Done()，main 在 Wait() 处等着。',add:[A('main','🧑‍✈️','main：Wait()',530,170,{tone:'quiet'}),A('wg','🔢','WaitGroup：3',530,60,{kind:'tag'})]},
  {say:'三个都 Done 了，计数归零，main 继续往下走，打印正确的结果 3。',send:[{from:'g3',to:'wg',text:'Done'}],sub:{wg:'计数 0'},tone:{main:'ok'}},
  {say:'锁不能重入，也不能复制；读多写少可以用 RWMutex，但要实测。',memo:['Mutex 保护共享数据','WaitGroup 等一组任务']},
 ]}),
 ({id:'go-an-runtime',level:'go-runtime',kind:'advanced',icon:'🏭',title:'GMP 调度：工厂里的任务、工人和工位',summary:'本地队列、全局队列和工作窃取。',beats:[
  {say:'G 是任务单，M 是工人（系统线程），P 是工位。工人必须坐到工位上，才能处理任务。',add:[A('p1','🧰','P1 工位',170,90,{kind:'item',tone:'primary'}),A('p2','🧰','P2 工位',470,90,{kind:'item',tone:'primary'}),A('m1','👷','M1',170,200),A('m2','👷','M2',470,200)]},
  {say:'每个工位有自己的任务队列。P1 的队列里堆了 6 个 G，P2 的已经做完了。',sub:{p1:'本地队列：6 个 G',p2:'本地队列：空'},tone:{m1:'ok',m2:'quiet'}},
  {say:'M2 不干等：先看全局队列，再看网络轮询，还没活就去 P1 那里偷一半。',send:[{from:'p1',to:'p2',text:'偷 3 个',tone:'ok'}],sub:{p1:'剩 3 个',p2:'偷来 3 个'},tone:{m2:'ok'}},
  {say:'M1 上的 G 进入阻塞的系统调用，线程卡住了。P1 被交给另一个工人 M3，继续干活。',add:[A('m3','👷','M3（新）',320,285,{tone:'ok'})],tone:{m1:'bad'},sub:{m1:'卡在系统调用'},send:[{from:'p1',to:'m3',text:'交出工位'}]},
  {say:'GOMAXPROCS 决定有几个工位，也就是最多几个 G 同时执行 Go 代码。',add:[A('gmp','🎚️','GOMAXPROCS = 工位数',470,310,{kind:'tag',tone:'warm'})]},
  {say:'记住 GMP。',memo:['M 坐上 P 才能跑 G','空闲就偷，阻塞就交出 P']},
 ]}),
 ({id:'go-an-gc',level:'go-gc',kind:'advanced',icon:'🎨',title:'三色标记：GC 怎么找到垃圾',summary:'白灰黑三色，并发标记加写屏障。',beats:[
  {say:'堆里有 5 个对象，开始时都是白色（还没被发现）。',add:[A('root','🌳','根',80,170,{tone:'primary'}),A('a','⚪','A',230,90),A('b','⚪','B',230,250),A('c','⚪','C',400,90),A('d','⚪','D',400,250),A('e','⚪','E',560,170)]},
  {say:'从根出发，直接引用的 A、B 变灰：已发现、待检查。',send:[{from:'root',to:'a'},{from:'root',to:'b'}],tone:{a:'warm',b:'warm'}},
  {say:'检查 A：它引用了 C，C 变灰；A 检查完变黑。接着处理 B、C……',send:[{from:'a',to:'c'}],tone:{a:'ok',c:'warm'}},
  {say:'没有灰色了：A、B、C 是黑色（活着），D、E 还是白色，没人引用，就是垃圾，清扫掉。',tone:{b:'ok',c:'ok',d:'bad',e:'bad'},sub:{d:'回收',e:'回收'}},
  {say:'标记时业务还在运行，可能偷偷改指针。写屏障在每次写指针时做记录，防止活对象被漏标误删。',add:[A('wb','🛡️','写屏障',560,300,{kind:'tag',tone:'ok'})]},
  {say:'整个过程只有两段很短的暂停，其余时间和业务并发进行。',memo:['白未发现，灰待查，黑已查','写屏障防漏标']},
 ]}),
 ({id:'go-an-concurrency',level:'go-concurrency',kind:'advanced',icon:'🎟️',title:'控制并发数：先拿号牌再上岗',summary:'用带缓冲 channel 当信号量。',beats:[
  {say:'有 1000 个下载任务。一下开 1000 个 goroutine，对方服务器和自己的内存都扛不住。',add:[A('jobs','📦','1000 个任务',100,170,{kind:'item',tone:'warm'})]},
  {say:'做一个装 3 个号牌的盒子：sem := make(chan struct{}, 3)。',add:[A('sem','🎟️','号牌盒（3 个）',320,170,{kind:'item',tone:'primary'})]},
  {say:'启动 goroutine 之前先拿号牌：sem <- struct{}{}。拿不到就等着。',send:[{from:'jobs',to:'sem',text:'先拿号牌'}],bubble:{who:'sem',text:'3 个都发出去了，\n请稍等'}},
  {say:'拿到号牌的 worker 去干活，干完 defer 把号牌还回来，下一个任务才能上岗。',add:[A('w1','👷','worker',540,80,{tone:'ok'}),A('w2','👷','worker',540,170,{tone:'ok'}),A('w3','👷','worker',540,260,{tone:'ok'})],send:[{from:'sem',to:'w1'},{from:'w3',to:'sem',text:'还号牌'}]},
  {say:'最后 wg.Wait() 等所有任务完成。也可以直接用 errgroup 的 SetLimit。',add:[A('eg','🧯','errgroup.SetLimit(3)',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住并发控制。',memo:['启动前拿号牌','做完归还，最多 N 个同时跑']},
 ]}),
 ({id:'go-an-testing',level:'go-testing',kind:'advanced',icon:'🧪',title:'测试三件套：单测、基准和竞态检测',summary:'go test、表格驱动、benchmark、-race。',beats:[
  {say:'写了一个 Add 函数。在 add_test.go 里写 TestAdd(t *testing.T)，go test 就会运行它。',add:[A('code','📄','add.go',110,80,{kind:'item'}),A('test','🧪','add_test.go',330,80,{kind:'item',tone:'primary'})],send:[{from:'test',to:'code',text:'go test'}]},
  {say:'表格驱动测试：把多组输入和期望结果写成一个切片，循环用 t.Run 跑子测试，一个失败了也知道是哪一组。',add:[A('tbl','📋','{1,2,3} {0,0,0} {-1,1,0}',330,190,{kind:'tag',tone:'ok'})]},
  {say:'基准测试：BenchmarkAdd(b *testing.B)，go test -bench=. -benchmem 看每次耗时和分配次数。',add:[A('bench','⏱️','-bench -benchmem',540,190,{kind:'tag',tone:'warm'})]},
  {say:'竞态检测：go test -race 运行时监控内存访问，发现两个 goroutine 无同步地读写同一变量就报警。',add:[A('race','🚨','go test -race',110,190,{kind:'tag',tone:'bad'})],bubble:{who:'test',text:'WARNING: DATA RACE'}},
  {say:'还有模糊测试 FuzzXxx 自动生成输入找 bug，以及 go test -cover 看覆盖率。',add:[A('fz','🎲','Fuzz · -cover',330,300,{kind:'tag'})]},
  {say:'记住测试工具。',memo:['TestXxx + 表格驱动','Benchmark 测性能，-race 查竞态']},
 ]}),
 ({id:'go-an-engineering',level:'go-engineering',kind:'advanced',icon:'🧭',title:'一个 HTTP 请求在 Go 服务里的旅程',summary:'中间件、处理器与优雅关闭。',beats:[
  {say:'用户发来一个请求。net/http 为这个连接开一个 goroutine，读出请求。',add:[A('u','🧑','用户',70,170),A('srv','🌐','http.Server',230,170,{tone:'primary'})],send:[{from:'u',to:'srv',text:'GET /orders'}]},
  {say:'请求先穿过一层层中间件：日志计时、鉴权、恢复 panic。每层调用 c.Next() 交给下一层。',add:[A('mw','🧅','中间件：日志 → 鉴权',420,80,{kind:'item'})],send:[{from:'srv',to:'mw'}]},
  {say:'到达业务处理器：绑定并校验参数，带着 ctx 查数据库，ctx 有超时，客户端断开也会取消。',add:[A('h','🧑‍🍳','处理器',420,250,{tone:'ok'}),A('db','🗄️','数据库',580,250,{kind:'tag'})],send:[{from:'mw',to:'h'},{from:'h',to:'db',text:'ctx'}]},
  {say:'响应原路返回，中间件记下状态码和耗时。',send:[{from:'h',to:'u',text:'200 OK',tone:'ok'}]},
  {say:'发布新版本时收到 SIGTERM：srv.Shutdown(ctx) 先停止接新请求，等手上的处理完，再关闭资源——优雅关闭。',add:[A('sig','📡','SIGTERM → Shutdown',230,310,{kind:'tag',tone:'warm'})],tone:{srv:'warm'}},
  {say:'慢了就用 pprof 找热点，用 trace 看等待。',memo:['中间件层层包裹处理器','Shutdown 优雅关闭']},
 ]}),
];
