import {A,type Story} from '../story';

// Linux 面试题动画（二）：I/O、shell、文件与权限。
export const osB:Record<string,Story>={
 'q-a8f1e56596cf95da':{title:'磁盘 I/O 问题怎么排查',beats:[
  {say:'接口变慢，怀疑是磁盘。iostat -xz 看每块盘的吞吐、await（平均等待时间）和队列长度。',add:[A('disk','💽','磁盘',320,80,{kind:'item',tone:'warm'}),A('io','📊','iostat -xz：await · 队列',320,190,{kind:'tag',tone:'primary'})]},
  {say:'pidstat -d 或 iotop 找出是哪个进程在大量读写。',add:[A('who','🔎','pidstat -d · iotop',130,300,{kind:'tag'})]},
  {say:'await 高可能是排队，也可能是设备本身慢；多队列 SSD 上 util 到 100% 也不代表真的满了。',bubble:{who:'disk',text:'util 100%\n不一定是满了'}},
  {say:'常见元凶：大量随机小 I/O、同步刷盘、狂打日志、数据库 checkpoint、云盘被限速。',add:[A('cause','🧩','随机小 I/O · 同步刷盘 · 云盘限速',470,300,{kind:'tag',tone:'warm'})]},
  {say:'优化要分清是吞吐瓶颈还是延迟瓶颈；一味加大并发只会让队列更长。',memo:['iostat 看 await 和队列','找到进程，分清吞吐还是延迟']},
 ]},
 'q-ebbd68878265c297':{title:'Bash 启动时读哪些配置文件',beats:[
  {say:'登录 shell（比如 ssh 登录）：先读 /etc/profile，再在 ~/.bash_profile、~/.bash_login、~/.profile 里找第一个存在的读。',add:[A('login','🔑','登录 shell',150,80,{tone:'primary'}),A('p1','📄','/etc/profile',380,60,{kind:'tag'}),A('p2','📄','~/.bash_profile（第一个存在的）',380,130,{kind:'tag'})],send:[{from:'login',to:'p1'},{from:'login',to:'p2'}]},
  {say:'交互式非登录 shell（比如在终端里再开一个 bash）：主要读 ~/.bashrc。',add:[A('inter','💬','交互式非登录',150,250,{tone:'ok'}),A('rc','📄','~/.bashrc',380,250,{kind:'tag',tone:'ok'})],send:[{from:'inter',to:'rc'}]},
  {say:'很多 ~/.bash_profile 里会主动 source ~/.bashrc，但这是脚本自己写的，不是所有 shell 的固定规则。',send:[{from:'p2',to:'rc',text:'source',tone:'warm'}]},
  {say:'非交互的脚本可能读 BASH_ENV；zsh、dash、systemd、cron 的环境又各不相同。排查前先确认实际用的是哪个 shell、怎么启动的。',add:[A('cron','⏰','cron / systemd：环境更少',380,330,{kind:'tag',tone:'warm'})]},
  {say:'记住顺序。',memo:['登录：profile → bash_profile','交互非登录：bashrc']},
 ]},
 'q-f5db80a74a10c0eb':{title:'2>&1 是什么意思',beats:[
  {say:'每个进程默认有三个“出入口”：0 是标准输入，1 是标准输出，2 是标准错误。',add:[A('cmd','⚙️','命令',120,170,{tone:'primary'}),A('o','1️⃣','stdout',320,90,{kind:'tag'}),A('e','2️⃣','stderr',320,250,{kind:'tag',tone:'warm'})]},
  {say:'2>&1：把 2 号出口，指到 1 号出口当前指向的地方。& 表示后面的 1 是文件描述符，不是一个叫“1”的文件。',send:[{from:'e',to:'o',text:'指向同一处'}]},
  {say:'重定向从左往右执行。cmd >out.log 2>&1：先把 1 指向文件，再让 2 跟着 1，结果两者都进文件。',add:[A('f','📄','out.log',530,90,{kind:'item',tone:'ok'})],send:[{from:'o',to:'f'}]},
  {say:'反过来写 cmd 2>&1 >out.log：2 先跟了“原来的 1”（终端），之后 1 才改到文件，所以错误还是打在终端上。',add:[A('tty','🖥️','终端',530,250,{kind:'item',tone:'warm'})],send:[{from:'e',to:'tty',text:'还在终端',tone:'warm'}]},
  {say:'记住规则。',memo:['0 输入、1 输出、2 错误','2>&1 复制指向，顺序很重要']},
 ]},
 'q-945fd8838f586e85':{title:'inode、硬链接和软链接',beats:[
  {say:'文件内容和元数据（大小、权限、数据块位置）存在 inode 里；文件名其实存在目录里，指向这个 inode。',add:[A('ino','📦','inode #42（数据和元数据）',320,200,{kind:'item',tone:'primary'}),A('n1','📛','a.txt',140,80,{kind:'tag'})],send:[{from:'n1',to:'ino'}]},
  {say:'硬链接：再起一个名字 b.txt，指向同一个 inode #42。删掉 a.txt 只是链接计数减一，内容还在。',add:[A('n2','📛','b.txt（硬链接）',500,80,{kind:'tag',tone:'ok'})],send:[{from:'n2',to:'ino',tone:'ok'}],sub:{ino:'链接数 2'}},
  {say:'硬链接一般不能跨文件系统，普通用户也不能给目录建硬链接。',bubble:{who:'n2',text:'我和 a.txt\n是同一个文件'}},
  {say:'软链接：自己有一个新的 inode，里面存的是目标路径，像快捷方式。可以跨文件系统、指向目录。',add:[A('sl','🔗','c.txt（软链接 → a.txt）',320,320,{kind:'item',tone:'warm'})],send:[{from:'sl',to:'n1',text:'存的是路径'}]},
  {say:'目标被删或移动后，软链接就“悬空”了；硬链接不受影响。',tone:{n1:'quiet',sl:'bad'},memo:['硬链接：同一个 inode','软链接：存路径，可能悬空']},
 ]},
 'q-d17fdfcf3be09b46':{title:'删了文件，磁盘空间为什么没回来',beats:[
  {say:'磁盘满了，你 rm 掉一个 20GB 的大日志，df 一看，空间一点没少。',add:[A('df','💽','df：磁盘 99%',320,60,{kind:'item',tone:'bad'})]},
  {say:'rm 删除的只是目录里的名字。如果还有进程打开着这个文件，数据块要等它关闭后才会释放。',add:[A('proc','⚙️','服务进程（仍打开文件）',150,200,{tone:'warm'}),A('file','📜','已删除的 app.log',470,200,{kind:'item',tone:'quiet'})],send:[{from:'proc',to:'file',text:'还拿着句柄',tone:'warm'}]},
  {say:'用 lsof +L1 找出“已删除但还被打开”的文件，以及是哪个进程。',add:[A('lsof','🔎','lsof +L1',320,310,{kind:'tag',tone:'primary'})]},
  {say:'让服务按规范重新打开日志（比如发信号让它 reopen），或者重启服务，空间就回来了。',tone:{df:'ok'},sub:{df:'磁盘 60%'},bubble:{who:'proc',text:'已重新打开日志'}},
  {say:'另外快照、其他硬链接、文件系统保留空间也会让 df 和 du 对不上。别反复 rm，也别没确认就截断业务文件。',memo:['进程还开着，空间不释放','lsof +L1 找到它']},
 ]},
 'q-785843ed24adfb0e':{title:'crontab 配好了却不执行',beats:[
  {say:'写了一条 crontab，每天 2 点跑脚本，结果没反应。按顺序排查。',add:[A('cron','⏰','crontab',150,170,{kind:'item',tone:'primary'}),A('sh','📜','backup.sh',480,170,{kind:'item',tone:'bad'})],send:[{from:'cron',to:'sh',tone:'bad'}]},
  {say:'一：cron 服务在运行吗？任务装在对的用户下吗？时间表达式和时区对吗？看 cron 日志。',add:[A('c1','①','服务 · 用户 · 时区',150,60,{kind:'tag'})]},
  {say:'二：cron 的环境很精简，PATH 很短，没有你的虚拟环境和变量。命令和文件都用绝对路径，必要的变量显式设置。',add:[A('c2','②','PATH 太短 → 用绝对路径',480,60,{kind:'tag',tone:'warm'})]},
  {say:'三：脚本有执行权限吗？是不是 Windows 换行符？命令里没转义的 % 在 crontab 里有特殊含义。',add:[A('c3','③','权限 · 换行符 · 转义 %',150,300,{kind:'tag',tone:'warm'})]},
  {say:'把 stdout 和 stderr 都重定向到日志文件，出错一看就知道；长任务加锁，防止上一次没跑完下一次又开始。',add:[A('c4','④','输出写日志 · 加锁防重叠',480,300,{kind:'tag',tone:'ok'})],tone:{sh:'ok'}},
  {say:'记住排查顺序。',memo:['服务、用户、时区','绝对路径、权限、记录输出']},
 ]},
 'q-20647881755f1bcc':{title:'su、su -、sudo -i、sudo -s 的区别',beats:[
  {say:'小明想切换成 root 干活，有四种常见写法，区别在于“环境带不带过去”。',add:[A('me','🧑','小明',90,170,{tone:'primary'})]},
  {say:'su：切换用户，但不模拟完整登录，当前的环境变量会部分保留。su -：启动目标用户的登录 shell，进入他的主目录，加载他的登录环境。',add:[A('su','🔁','su：部分保留环境',330,70,{kind:'tag'}),A('sud','🏠','su -：完整登录环境',330,150,{kind:'tag',tone:'ok'})]},
  {say:'sudo -i：用 sudo 权限模拟目标用户登录，效果接近 su -。',add:[A('si','🏠','sudo -i：模拟登录',330,230,{kind:'tag',tone:'ok'})]},
  {say:'sudo -s：启动一个 shell，通常留在当前目录，保留哪些环境由 sudoers 配置决定。',add:[A('ss','💬','sudo -s：留在当前目录',330,310,{kind:'tag'})]},
  {say:'su 要输入目标用户的密码；sudo 用你自己的密码并看 sudoers 授权，默认目标是 root，也可以用 -u 指定。',add:[A('root','👑','root',560,170,{tone:'warm'})],send:[{from:'me',to:'root',text:'切换'}]},
  {say:'具体行为依系统配置而定，别假设“所有变量都会保留”。',memo:['带 - / -i：完整登录环境','不带：部分保留当前环境']},
 ]},
};
