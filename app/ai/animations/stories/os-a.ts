import {A,type Story} from '../story';

// Linux / 操作系统面试题动画（一）：准备方法、常用命令、进程与资源排查。
export const osA:Record<string,Story>={
 'q-31ed7ebd242ddb79':{title:'Linux 面试怎么准备：沿着服务运行的链路',beats:[
  {say:'别背一大本命令清单。想象你部署了一个后端服务，它会碰到哪些东西？',add:[A('svc','🖥️','你的后端服务',320,170,{kind:'item',tone:'primary'})]},
  {say:'文件和权限、进程与信号、CPU / 内存 / 磁盘 I/O、网络连接、日志、服务管理和 shell。',add:[A('a','📁','文件 · 权限',120,70,{kind:'tag'}),A('b','⚙️','进程 · 信号',320,60,{kind:'tag'}),A('c','📊','CPU · 内存 · I/O',520,70,{kind:'tag'}),A('d','🌐','网络 · 日志 · systemd',320,290,{kind:'tag'})]},
  {say:'每个主题配一个故障场景：接口变慢了，是 CPU 忙、锁等待、磁盘慢，还是连接耗尽？',bubble:{who:'svc',text:'我变慢了，\n为什么？',tone:'warm'},tone:{svc:'warm'}},
  {say:'命令要知道看哪一列、单位是什么、误用有什么风险。多用 /proc、man 手册和能重复的小实验去验证。',add:[A('lab','🧪','/proc · man · 小实验',120,290,{kind:'tag',tone:'ok'})],tone:{svc:'ok'}},
  {say:'记住准备方法。',memo:['沿服务运行链路准备','每个主题配一个故障场景']},
 ]},
 'q-064ae81801a23ffa':{title:'网络和操作系统题的答题技巧',beats:[
  {say:'先分层，再沿着请求路径讲：应用调用 → 系统调用 → 内核缓冲 → 协议栈 → 网卡 → 对端。',add:[A('app','📱','应用',80,170,{tone:'primary'}),A('sys','🚪','系统调用',220,170,{kind:'tag'}),A('k','🧠','内核缓冲 · 协议栈',390,170,{kind:'tag'}),A('nic','📡','网卡 → 对端',560,170,{kind:'tag'})],send:[{from:'app',to:'sys'},{from:'sys',to:'k'},{from:'k',to:'nic'}]},
  {say:'回答时先说清前提：“同步”指的是哪个接口？TCP 报文现在处于什么状态？“写入成功”是否包含落盘？',add:[A('pre','❓','先说前提',320,60,{kind:'tag',tone:'warm'})]},
  {say:'遇到故障，用指标、日志、抓包互相印证，不要凭一个现象就下结论。',add:[A('ev','🔍','指标 · 日志 · 抓包',320,300,{kind:'tag',tone:'ok'})]},
  {say:'加分项：主动区分“常见实现”和“协议保证”，以及不同内核版本的差异。',bubble:{who:'app',text:'协议没保证，\n但 Linux 是这样实现的'}},
  {say:'记住答题方法。',memo:['分层，沿请求路径讲','说前提，用证据验证']},
 ]},
 'q-eedf93d3b0d049a4':{title:'Linux 常用命令速查',beats:[
  {say:'找文件和内容：find 找文件，rg / grep 搜内容。',add:[A('f','🔎','find · rg · grep',140,70,{kind:'tag',tone:'primary'})]},
  {say:'看日志：less 翻看，tail -F 跟随（日志轮转后也能接着跟）。',add:[A('l','📜','less · tail -F',320,70,{kind:'tag',tone:'primary'})]},
  {say:'进程和资源：ps、top、pidstat 看进程；free、vmstat 看内存；df、du、iostat 看磁盘。',add:[A('p','⚙️','ps · top · pidstat',500,70,{kind:'tag'}),A('m','💾','free · vmstat',140,200,{kind:'tag'}),A('d','💽','df · du · iostat',320,200,{kind:'tag'})]},
  {say:'网络：ip、ss -lntp 看监听端口、curl 测接口、tcpdump 抓包。服务：systemctl 管理，journalctl 看服务日志。',add:[A('n','🌐','ip · ss · curl · tcpdump',522,200,{kind:'tag'}),A('s','🧰','systemctl · journalctl',320,310,{kind:'tag',tone:'ok'})]},
  {say:'技巧：先缩小时间、目录和进程范围；有些工具需要另外安装或者 root 权限。',memo:['文件、日志、进程、资源、网络','先缩小范围再查']},
 ]},
 'q-076449b355ef6734':{title:'怎么查看几十 GB 的超大日志',beats:[
  {say:'一个 30GB 的日志文件。用 vim 打开？内存直接被吃光，机器卡死。',add:[A('log','📜','app.log（30GB）',320,80,{kind:'item',tone:'warm'}),A('vim','💥','编辑器整体加载',320,200,{kind:'tag',tone:'bad'})]},
  {say:'按需看：less 分页翻；tail -n 200 只看最后 200 行；sed -n \'1000,1100p\' 截取某一段。',drop:['vim'],add:[A('a','👀','less · tail -n · sed -n',150,220,{kind:'tag',tone:'ok'})]},
  {say:'定位：rg -n 按时间或请求 ID 搜索，带上行号。压缩过的日志用 zgrep 边解压边搜。',add:[A('b','🎯','rg -n 请求ID · zgrep',490,220,{kind:'tag',tone:'ok'})]},
  {say:'日志会轮转，跟随新内容用 tail -F（大写），按文件名跟，而不是跟旧的文件句柄。',add:[A('c','🔄','tail -F 跟随轮转',320,310,{kind:'tag'})]},
  {say:'顺序扫描也有 I/O 成本：先限定文件和时间范围，别同时开好几个全量搜索。跨机器的问题优先用集中日志检索。',memo:['别整体加载，按需截取','rg 定位，tail -F 跟随']},
 ]},
 'q-4e7ba0cd44f8f0c2':{title:'进程管理：查看、停止和几个特殊状态',beats:[
  {say:'ps 看进程和进程树，top / pidstat 看实时资源，systemctl 管理由 systemd 托管的服务。',add:[A('p','⚙️','进程 1234',320,80,{kind:'item',tone:'primary'})]},
  {say:'停止服务先发 SIGTERM，给程序机会做清理；实在不退再用 SIGKILL。SIGKILL 不能被捕获，程序来不及收尾。',add:[A('t','🛑','SIGTERM：请优雅退出',150,210,{kind:'tag',tone:'ok'}),A('k','💀','SIGKILL：强制杀死',490,210,{kind:'tag',tone:'bad'})],send:[{from:'t',to:'p'}]},
  {say:'僵尸进程：已经退出了，但父进程还没 wait 回收它。要让父进程回收，杀僵尸本身没用。',add:[A('z','🧟','僵尸进程',150,310,{kind:'tag',tone:'warm'})]},
  {say:'D 状态：不可中断睡眠，通常在等磁盘等 I/O，可能暂时不响应 kill。',add:[A('d','😴','D 状态：等 I/O',490,310,{kind:'tag',tone:'warm'})]},
  {say:'进程号会被复用，动手前核对命令行和启动时间，别杀错。',memo:['先 SIGTERM，再 SIGKILL','僵尸要父进程回收']},
 ]},
 'q-94fc03cdda96b367':{title:'CPU 负载和 CPU 利用率不是一回事',beats:[
  {say:'CPU 利用率：一段时间里 CPU 有多少比例在干活。像收银员忙碌的时间比例。',add:[A('cpu','🧑‍💼','CPU（收银员）',200,120,{tone:'primary'}),A('u','📊','利用率：忙的时间比例',200,260,{kind:'tag'})]},
  {say:'load average：排队等着运行的任务数，加上在不可中断睡眠（常见是等磁盘）的任务数，取平均。像排队的人数。',add:[A('q','👥','load：排队 + 等 I/O 的人',470,120,{tone:'warm'})],send:[{from:'q',to:'cpu',text:'排队'}]},
  {say:'所以 load 高不一定 CPU 忙：大家都卡在等磁盘，收银员反而闲着。',add:[A('io','💽','都在等磁盘',470,260,{kind:'tag',tone:'bad'})],bubble:{who:'cpu',text:'我其实很闲',tone:'warm'}},
  {say:'判断容量要结合逻辑 CPU 核数、运行队列、iowait、steal（被虚拟机宿主抢走的时间）和实际延迟，不能只拿 load 和 1 比较。',memo:['利用率：CPU 忙的比例','load：排队 + 等 I/O 的任务数']},
 ]},
 'q-b515960b47d0fb77':{title:'CPU 占用过高怎么排查',beats:[
  {say:'告警：某台机器 CPU 打满。先用 top / mpstat 看清是哪种忙：用户态、内核态、iowait 还是 steal。',add:[A('m','🖥️','CPU 100%',320,70,{kind:'item',tone:'bad'})]},
  {say:'再定位进程和线程：pidstat 或 top -H。',add:[A('pid','🔎','pidstat · top -H',320,170,{kind:'tag',tone:'primary'})],send:[{from:'m',to:'pid'}]},
  {say:'用户态高：用 perf 或语言自带的 profiler 找热点，看是不是死循环、频繁分配。Go 服务直接采 CPU profile。',add:[A('us','👤','用户态：perf · pprof',150,280,{kind:'tag',tone:'warm'})],send:[{from:'pid',to:'us'}]},
  {say:'内核态高：检查系统调用是否太频繁、网络包量、上下文切换次数。',add:[A('sy','🧠','内核态：系统调用 · 切换',490,280,{kind:'tag',tone:'warm'})],send:[{from:'pid',to:'sy'}]},
  {say:'先保存现场证据，再限流或扩容止血；修复后用同样的负载验证吞吐和尾延迟。',tone:{m:'ok'},memo:['先分清哪种忙，再定位线程','profile 找热点，修完再验证']},
 ]},
 'q-5507ee2fe6c6f2a9':{title:'内存问题怎么排查',beats:[
  {say:'free 一看 used 很高，别慌：先看 available 和 swap。page cache 是可以回收的，不是泄漏。',add:[A('free','💾','free：看 available',320,70,{kind:'item',tone:'primary'})]},
  {say:'vmstat 看有没有频繁换页；ps、pidstat、/proc/PID/smaps_rollup 看具体进程占了多少 RSS。',add:[A('ps','🔎','vmstat · smaps_rollup',320,170,{kind:'tag'})]},
  {say:'分清是堆增长、文件映射、共享内存、碎片，还是容器 cgroup 的限制；再看内核日志有没有 OOM 记录。',add:[A('kind','🧩','堆 · 映射 · 碎片 · cgroup',150,280,{kind:'tag',tone:'warm'}),A('oom','💀','dmesg：OOM 日志',490,280,{kind:'tag',tone:'bad'})]},
  {say:'Go 服务用 heap profile 对比存活对象和分配热点，同时看 goroutine 数量有没有一直涨。',bubble:{who:'ps',text:'RSS 不降\n不一定是泄漏'}},
  {say:'真正的泄漏证据是：存活对象持续增长，而且解释不了。',memo:['先看 available，cache 不是泄漏','定位进程，再看堆和 OOM 日志']},
 ]},
};
