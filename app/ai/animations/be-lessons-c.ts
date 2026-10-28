import {A,type LessonStory} from './story';

// 后端通用动画课堂（三）：小白起步和入门、进阶新增关卡。
export const beLessonsC:LessonStory[]=[
 ({id:'be-an-basics',level:'be-basics',kind:'basic',icon:'🌍',title:'点一下“下单”，背后发生了什么',summary:'客户端、DNS、HTTP 请求、后端和数据库。',beats:[
  {say:'小明在手机上点了“下单”。手机里的 App 是前端，它要把这个请求发给远方的服务器。',add:[A('u','📱','小明的手机',90,170,{tone:'primary'})]},
  {say:'先问 DNS：“shop.example.com 在哪？”DNS 回答一个 IP 地址，就像查到了门牌号。',add:[A('dns','📒','DNS',320,60,{kind:'item'})],send:[{from:'u',to:'dns',text:'域名？'},{from:'dns',to:'u',text:'IP',tone:'ok'}]},
  {say:'手机按 IP 找到服务器，发出 HTTP 请求：POST /orders，正文是 JSON。',add:[A('srv','🖥️','后端服务',380,200,{kind:'item',tone:'primary'})],send:[{from:'u',to:'srv',text:'POST /orders'}]},
  {say:'后端检查登录、校验库存和价格，再把订单写进数据库。',add:[A('db','🗄️','数据库',560,300,{kind:'item'})],send:[{from:'srv',to:'db',text:'INSERT',tone:'warm'}],bubble:{who:'srv',text:'价格以我算的为准'}},
  {say:'处理完，后端返回响应：状态码 201 表示创建成功，正文里是订单号。前端收到后显示“下单成功”。',send:[{from:'srv',to:'u',text:'201 Created',tone:'ok'}],tone:{u:'ok'}},
  {say:'记住一次请求的旅程。',memo:['DNS 找地址，HTTP 发请求','后端校验、读写数据库、返回状态码']},
 ]}),
 ({id:'be-an-cli',level:'be-cli',kind:'basic',icon:'⌨️',title:'第一次登录服务器',summary:'ssh、目录、权限、管道和重定向。',beats:[
  {say:'小明第一次要上线服务。他在电脑上敲 ssh deploy@10.0.0.8，登录到远程服务器。',add:[A('me','🧑‍💻','小明',90,170,{tone:'primary'}),A('srv','🖥️','服务器',540,170,{kind:'item'})],send:[{from:'me',to:'srv',text:'ssh'}]},
  {say:'pwd 看自己在哪，cd /srv/app 进入项目目录，ls -l 列出文件。',add:[A('dir','📁','/srv/app',320,70,{kind:'tag'})],bubble:{who:'me',text:'pwd → cd → ls'}},
  {say:'执行 ./run.sh 提示 Permission denied：脚本没有执行权限。chmod +x run.sh 加上就好了。',add:[A('perm','🔐','-rw-r--r-- → -rwxr-xr-x',320,280,{kind:'tag',tone:'warm'})],tone:{srv:'warm'}},
  {say:'启动时把正常输出和错误都写进日志：./run.sh > app.log 2>&1。',add:[A('log','📄','app.log',540,300,{kind:'item'})],send:[{from:'srv',to:'log',text:'1 和 2'}]},
  {say:'想看有多少条错误？用管道把命令串起来：cat app.log | grep ERROR | wc -l。',bubble:{who:'me',text:'一共 3 条错误'},tone:{srv:'ok'}},
  {say:'记住命令行的基本功。',memo:['pwd、cd、ls、chmod +x','管道 | 串命令，2>&1 合并错误输出']},
 ]}),
 ({id:'be-an-db101',level:'be-db101',kind:'basic',icon:'🗃️',title:'第一张表和第一次转账',summary:'建表、增删改查和事务。',beats:[
  {say:'数据库像一个柜子，里面一张张表格。我们先建一张 users 表：id 是主键，还有 name 和 balance。',add:[A('t','📋','users 表',320,70,{kind:'item',tone:'primary'})]},
  {say:'INSERT 插入两行：Tom 有 100 元，Amy 有 50 元。每一行是一条记录，每一列是一个属性。',add:[A('tom','🧑','Tom：100',150,200,{kind:'tag'}),A('amy','👩','Amy：50',490,200,{kind:'tag'})]},
  {say:'SELECT 查询：SELECT name FROM users WHERE balance >= 60，只查到 Tom。',bubble:{who:'t',text:'结果：Tom'},tone:{tom:'ok'}},
  {say:'Tom 给 Amy 转 30 元，要两步：Tom 减 30、Amy 加 30。把它们放进一个事务：BEGIN … COMMIT。',add:[A('tx','📦','事务',320,300,{kind:'item',tone:'warm'})],send:[{from:'tom',to:'amy',text:'30 元'}],sub:{tom:'70',amy:'80'}},
  {say:'如果第二步失败，就 ROLLBACK：Tom 的钱回到 100，不会凭空消失。这就是事务的原子性。',tone:{tx:'ok'},bubble:{who:'tx',text:'要么都成，要么都不算'}},
  {say:'记住数据库的第一课。',memo:['表、行、列，主键唯一','UPDATE/DELETE 带 WHERE，多步操作用事务']},
 ]}),
 ({id:'be-an-ds',level:'be-ds',kind:'basic',icon:'🧱',title:'四种容器：排队、叠盘子、找钥匙、分叉路',summary:'队列、栈、哈希表和二叉树各擅长什么。',beats:[
  {say:'餐厅门口排队：先来的先进去，这是队列（FIFO）。任务排队、消息排队都用它。',add:[A('q','🚶','队列：先来先走',150,70,{kind:'item',tone:'primary'})]},
  {say:'后厨叠盘子：最后放上去的最先被拿走，这是栈（LIFO）。括号匹配、撤销操作、函数调用都用它。',add:[A('s','🍽️','栈：后进先出',490,70,{kind:'item',tone:'primary'})]},
  {say:'前台的钥匙柜：按房间号直接找到钥匙，平均 O(1)，这是哈希表。Go 的 map 就是它。',add:[A('h','🔑','哈希表：按 key 直达',150,250,{kind:'item',tone:'ok'})]},
  {say:'分叉的路：每个路口最多两条岔路，这是二叉树。左小右大的二叉搜索树，中序遍历就是有序的。',add:[A('t','🌳','二叉树：左小右大',490,250,{kind:'item',tone:'ok'})]},
  {say:'选结构就是选“最常做的操作”：按下标访问选数组，频繁插入删除选链表，查找去重选哈希表。',add:[A('pick','🤔','看最常用的操作',320,170,{kind:'tag',tone:'warm'})]},
  {say:'记住四种容器。',memo:['队列先进先出，栈后进先出','哈希表 O(1) 查找，树表达层级和有序']},
 ]}),
 ({id:'be-an-algo2',level:'be-algo2',kind:'basic',icon:'🔍',title:'猜数字：一次砍一半',summary:'二分查找、复杂度和 Top K。',beats:[
  {say:'游戏：我心里想一个 1 到 100 的数。你从 1 开始一个个猜，最坏要猜 100 次——这是 O(n)。',add:[A('me','🤔','出题人',90,170),A('you','🙋','猜数的人',540,170,{tone:'primary'})],bubble:{who:'me',text:'1 到 100 之间'}},
  {say:'聪明的猜法：先猜 50。我说“大了”，答案只可能在 1 到 49，一下砍掉一半。',add:[A('g1','🎯','猜 50 → 大了',320,70,{kind:'tag',tone:'warm'})],send:[{from:'you',to:'me',text:'50？'}]},
  {say:'再猜 25、37、31……每次砍一半，最多 7 次就能猜中。这就是二分查找，O(log n)。前提是数据有序。',add:[A('g2','✂️','每次砍一半：最多 7 次',320,280,{kind:'tag',tone:'ok'})],tone:{you:'ok'}},
  {say:'换个题：100 万个数里找最大的 3 个。不用全排序，维护一个只能放 3 个数的小顶堆，堆顶就是门槛。',drop:['g1'],add:[A('heap','⛰️','小顶堆（容量 3）',320,70,{kind:'item',tone:'primary'})]},
  {say:'新数比门槛大才进堆，挤掉堆顶；比门槛小直接跳过。总共 O(n log K)。',bubble:{who:'heap',text:'比我小的不用进来'}},
  {say:'记住两个套路。',memo:['有序数据：二分，O(log n)','Top K：小顶堆，O(n log K)']},
 ]}),
 ({id:'be-an-log',level:'be-log',kind:'basic',icon:'📚',title:'一次提交写了哪几本账',summary:'undo、redo、binlog 与主从复制。',beats:[
  {say:'事务要把余额从 100 改成 50。改之前，先在 undo log 记下旧值 100，万一要回滚就靠它。',add:[A('tx','🧾','事务：100 → 50',320,70,{kind:'item',tone:'primary'}),A('undo','↩️','undo：旧值 100',110,190,{kind:'tag'})],send:[{from:'tx',to:'undo'}]},
  {say:'修改先写进内存里的数据页，同时写 redo log：“某页改成了 50”。先写日志，数据页以后再慢慢刷盘。',add:[A('redo','📗','redo：页改动',320,190,{kind:'tag',tone:'warm'})],send:[{from:'tx',to:'redo',text:'prepare'}]},
  {say:'再写 binlog：“这一行从 100 改成 50”，最后把 redo 标记为 commit。这就是两阶段提交，保证两本账一致。',add:[A('bin','📘','binlog：逻辑变更',530,190,{kind:'tag',tone:'ok'})],send:[{from:'tx',to:'bin'}],tone:{redo:'ok'}},
  {say:'从库拉取 binlog，写进 relay log 再重放，数据就复制过去了。默认是异步的，主库不等从库。',add:[A('rep','🪞','从库',530,300,{kind:'item'})],send:[{from:'bin',to:'rep',text:'复制'}]},
  {say:'主库来了一个删除千万行的大事务，从库要整个重放，越落越远。拆小事务、并行复制，写后立即读走主库。',tone:{rep:'bad'},sub:{rep:'延迟 30 秒'},bubble:{who:'rep',text:'我跟不上了…'}},
  {say:'记住三本账。',memo:['undo 回滚，redo 崩溃恢复','binlog 复制，两阶段提交保一致']},
 ]}),
];
