import {A} from '../story';
import type {LazyEpisode} from './engine';

// 后端懒人模式第 1 集：阿杰的网上书店开张了（前后端与 HTTP、命令行入门、数据库入门）。
export const beLazy1:LazyEpisode={id:'lazy-be-1',subject:'backend',tier:0,levels:['be-basics','be-cli','be-db101'],icon:'📚',title:'阿杰的网上书店：从一次点击说起',summary:'跟着书店老板阿杰，从零认识前端和后端、一次 HTTP 请求的旅程、服务器上的命令行，以及数据库的表和增删改查。',beats:[
 {say:'阿杰在小城里开了一家旧书店，生意不温不火。表妹说：哥，你得开个网店。阿杰一头雾水：网店到底是什么？表妹拿出手机，点开一个购物 App：你看，这一页页的画面，叫前端；而你看不见的那一部分，叫后端。',add:[A('jie','🧔','阿杰',110,170,{tone:'primary'}),A('phone','📱','手机上的书店',480,90,{kind:'item',tone:'primary'})]},
 {say:'表妹接着解释：当顾客点下“购买”，前端只是把这个请求送出去。真正检查库存、计算价格、扣款、记下订单的，是跑在远方服务器上的程序，这就是后端。订单最后被存进数据库，像一本永远不会丢的账本。',add:[A('srv','🖥️','后端服务器',480,210,{kind:'item'}),A('db','🗄️','数据库账本',480,320,{kind:'item'})],send:[{from:'phone',to:'srv',text:'购买'},{from:'srv',to:'db'}]},
 {say:'那请求是怎么找到服务器的？顾客的手机先问 DNS：“书店的网址在哪里？”DNS 就像一本电话簿，回答一个 IP 地址，相当于服务器的门牌号。有了门牌号，手机才能和服务器建立连接。',drop:['db'],add:[A('dns','📒','DNS：网址 → IP',300,60,{kind:'tag',tone:'primary'})],send:[{from:'phone',to:'dns',text:'书店在哪？'}]},
 {say:'连接建好后，手机发出一封“信”，这就是 HTTP 请求。信封上写着动作和地址：GET /books/42 表示“我想看看 42 号书”，POST /orders 表示“我要下一个新订单”。信里还附上身份凭证和具体的内容，内容通常是 JSON 格式。',drop:['dns'],add:[A('req','✉️','POST /orders + JSON',300,60,{kind:'tag',tone:'warm'})],send:[{from:'phone',to:'srv',text:'HTTP 请求'}]},
 {say:'服务器处理完，回一封信，信上最显眼的是一个三位数的状态码。200 表示成功，201 表示新东西创建好了；400 是你寄来的信写错了，401 是你没登录，403 是你没有权限，404 是找不到；500 是服务器自己出了故障。',drop:['req'],add:[A('code','🔢','200 · 400 · 401 · 404 · 500',240,60,{kind:'tag'})],send:[{from:'srv',to:'phone',text:'201 Created',tone:'ok'}]},
 {say:'表妹还特意叮嘱了一句：后端千万不能相信前端送来的价格。有人可以伪造请求，把一本一百元的书改成一元。价格、库存、权限，都要后端自己重新查、重新算。阿杰听了直点头：这跟收银台要自己扫码是一个道理。',bubble:{who:'srv',text:'价格以我算的为准'}},
 {say:'第二天，表妹帮阿杰租了一台云服务器。阿杰打开电脑，发现服务器上没有桌面、没有图标，只有一个黑色的窗口在闪光标。这就是命令行，后端工程师每天打交道的地方。',drop:['code','phone','srv'],add:[A('term','⌨️','黑色的终端窗口',480,170,{kind:'item',tone:'primary'})]},
 {say:'首先要登录：ssh deploy@服务器地址。进去之后，pwd 告诉你现在站在哪个文件夹，ls 列出这里有什么，cd 进入另一个文件夹，cd 两个点回到上一层。路径以斜杠开头是从根目录算起的绝对路径。',add:[A('nav','🧭','ssh · pwd · ls · cd',300,60,{kind:'tag',tone:'ok'})]},
 {say:'阿杰把网站程序上传到服务器，输入 ./start.sh，屏幕上冒出一行：Permission denied。表妹笑着说：这个脚本还没有执行权限。ls -l 能看到一串像 rw-r--r-- 的字母，分别是主人、同组、其他人的读、写、执行权限。chmod 加 x，就能执行了。',drop:['nav'],add:[A('perm','🔐','chmod +x start.sh',300,60,{kind:'tag',tone:'warm'})]},
 {say:'程序跑起来了，阿杰想看看运行日志。cat 一次性输出整个文件，less 可以一页一页翻，tail -f 会一直盯着日志的最新内容，有新的一行写进来就马上显示。',drop:['perm'],add:[A('log','📜','cat · less · tail -f',300,60,{kind:'tag'})]},
 {say:'表妹又教了他两样神器。竖线叫管道，能把前一个命令的输出交给下一个命令，比如 cat app.log | grep ERROR | wc -l，一口气数出有多少条错误。大于号叫重定向，把输出写进文件；加上 2>&1，连错误信息也一起写进去。',drop:['log'],add:[A('pipe','🔗','管道 | 和重定向 >',300,60,{kind:'tag',tone:'ok'})]},
 {say:'最后表妹提醒他：rm 删除的文件没有回收站。执行 rm -rf 之前，先 pwd 看清楚自己在哪，再 ls 看清楚要删什么，路径写完整。有人因为一个空变量，把整台服务器都删光了。',bubble:{who:'term',text:'删之前，先看清'}},
 {say:'第三天，轮到最重要的部分：数据库。表妹打开一个 MySQL，对阿杰说：数据库就像一个装满表格的大柜子。一张表存一类东西，比如 books 表存所有的书；每一行是一本书，每一列是书的一个属性：书名、作者、价格、库存。',drop:['pipe','term'],add:[A('table','📋','books 表',480,170,{kind:'item',tone:'primary'})]},
 {say:'建表的时候，每一列都要定好类型：书名用 VARCHAR 字符串，库存用 INT 整数，价格用 DECIMAL，千万别用浮点数，否则一毛钱都可能算不准。每张表还要有一个主键，通常是自增的 id，像每本书的身份证号，不能重复，也不能为空。',add:[A('cols','🧱','id 主键 · 书名 · 价格 DECIMAL',300,60,{kind:'tag'})]},
 {say:'对表的操作只有四种，叫增删改查。INSERT 新增一本书；SELECT 查书，用 WHERE 写条件，用 ORDER BY 排序，用 LIMIT 只取前几条；UPDATE 修改价格；DELETE 删除下架的书。',drop:['cols'],add:[A('crud','✏️','INSERT · SELECT · UPDATE · DELETE',300,60,{kind:'tag',tone:'ok'})]},
 {say:'表妹严肃地警告：UPDATE 和 DELETE 一定要带 WHERE。如果写成 DELETE FROM books，后面忘了加条件，整张表的书会在一瞬间全部消失。很多新人都踩过这个坑，所以执行之前，先用同样的条件 SELECT 一下，看看会影响哪几行。',bubble:{who:'table',text:'别忘了 WHERE'},tone:{table:'warm'}},
 {say:'最后，表妹讲了事务。顾客买书时，要做两件事：库存减一，订单表加一条记录。如果库存刚减完，服务器突然断电，订单却没写进去，账就对不上了。事务把多个操作包成一个整体：要么全部成功，要么全部撤销。',drop:['crud'],add:[A('tx','📦','事务：要么都做，要么都不做',300,60,{kind:'item',tone:'primary'})],tone:{table:'base'}},
 {say:'BEGIN 开始事务，两步都成功就 COMMIT 提交；中途出错就 ROLLBACK 回滚，库存会回到原来的数字。数据库保证事务的四个特性：原子性、一致性、隔离性、持久性，合起来叫 ACID。提交之后，就算断电，数据也不会丢。',add:[A('acid','🛡️','ACID',300,300,{kind:'tag',tone:'ok'})],send:[{from:'tx',to:'table'}]},
 {say:'三天之后，阿杰的网上书店开张了。第一个订单来自隔壁城市，阿杰盯着屏幕上那一行新出现的记录，激动得像收到了一封情书。他在小本子上记下：前端送信，后端干活，DNS 查门牌，状态码报平安，命令行开门，数据库记账，事务保平安。',drop:['acid','tx'],tone:{jie:'ok',table:'ok'},bubble:{who:'jie',text:'第一单！'}},
 {say:'这一集的要点。',memo:['一次请求：DNS → HTTP 请求 → 后端处理 → 状态码','命令行：pwd、cd、chmod、管道；数据库：CRUD 带 WHERE，事务保一致']},
]};
