// 后端通用学习空间：23 个关卡，从“后端是什么”的小白起步，到数据库、缓存、Linux、网络、操作系统、消息队列、云原生、搜索和系统设计。
// 新增关卡写在 content/backend-new/ 下，最后按 backendLevelOrder 的顺序组装。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// interview 字段关联 content/questions.json 里的后端面试题 id。
import type {AiLevel,Rank,Tier} from './journey';
import {beBasics,beCli} from './backend-new/basics';
import {beDb101} from './backend-new/db101';
import {beDs,beAlgo2} from './backend-new/algo';
import {beLog} from './backend-new/log';
import {beHttp,beTrouble} from './backend-new/ops';
import {beIo} from './backend-new/io';
import {beKafka,beCloud} from './backend-new/expert';

export const backendPassRate=0.65;
export const backendTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:5},{name:'进阶',nameEn:'Intermediate',from:6,to:11},{name:'高阶',nameEn:'Advanced',from:12,to:17},{name:'专家',nameEn:'Expert',from:18,to:22}];
export const backendRanks:Rank[]=[{min:0,name:'后端小白'},{min:3,name:'入门'},{min:6,name:'熟手'},{min:12,name:'高手'},{min:18,name:'架构师'},{min:23,name:'大神'}];

const coreLevels:AiLevel[]=[
 {id:'be-sql',title:'SQL 与表设计',summary:'写对 SQL，选对字段类型，理解计数和自增',lessons:[
  {title:'这一关学什么：写对 SQL，设计好表',body:'上一关学会了对一张表增删改查。真实的业务数据会分散在很多张表里：用户在 users 表，订单在 orders 表。这一关学：\n一、JOIN：把多张表的数据连起来查；\n二、GROUP BY 和聚合函数：分组统计，比如每个用户花了多少钱；\n三、COUNT 的几种写法有什么区别；\n四、窗口函数：排名、“每组取前几条”；\n五、字段类型怎么选，主键、自增和唯一约束的细节。\n每个知识点都会在 SQLite 里亲手跑一遍。'},
  {title:'JOIN：把两张表连起来',body:'订单表里只存了 user_id，没有存用户名。想同时看到订单和下单人的名字，就要把 orders 表和 users 表按“订单的 user_id 等于用户的 id”连起来，这就是 JOIN（连接）。\n两种最常用的连接：\nINNER JOIN（直接写 JOIN）：只保留两边都能对上的行。没下过单的用户、找不到用户的订单都不会出现；\nLEFT JOIN：保留左边表的所有行，右边对不上的部分填 NULL。比如用户 LEFT JOIN 订单，没下过单的用户也会出现，只是订单的列都是 NULL。利用这一点，WHERE 订单.id IS NULL 就能找出“没下过单的用户”。\n一个常见的坑：LEFT JOIN users u ... WHERE u.status = \'active\'。把右表的条件写在 WHERE 里，那些对不上的行（u.status 是 NULL）会被过滤掉，效果就变成了普通的 JOIN。如果想保留左表的所有行，要把条件写进 ON 里。',code:`SELECT o.id, u.name, o.amount
FROM orders o
JOIN users u ON o.user_id = u.id;

SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;`,explain:[{at:'SELECT o.id, u.name, o.amount',text:'查出订单号、下单人名字和金额。o 和 u 是下面给表起的简短别名。'},{at:'FROM orders o',text:'从订单表出发，别名 o。'},{at:'JOIN users u ON o.user_id = u.id;',text:'连接用户表：按订单的 user_id 等于用户的 id 配对。'},{at:'SELECT u.name',text:'第二个例子：找出没下过单的用户。'},{at:'FROM users u',to:'LEFT JOIN orders o ON o.user_id = u.id',text:'从用户表出发 LEFT JOIN 订单表：每个用户都保留，没有订单的用户，订单那几列是 NULL。'},{at:'WHERE o.id IS NULL;',text:'只留下订单为 NULL 的，也就是没下过单的用户。判断 NULL 要用 IS NULL，不能用 = NULL。'}]},
  {title:'GROUP BY：分组统计',body:'GROUP BY 把数据按某一列分组，再用聚合函数对每一组做统计：COUNT 计数、SUM 求和、AVG 平均、MAX 最大、MIN 最小。\nWHERE 和 HAVING 都是过滤，但时机不同：\nWHERE：在分组之前过滤一行行的原始数据，比如只统计已支付的订单；\nHAVING：在分组之后过滤分组的结果，比如只保留总额超过 1000 的用户。\n所以“统计每个用户的订单数，只保留订单数大于 5 的用户”，这个“大于 5”是针对分组结果的，要写在 HAVING 里，不能写在 WHERE 里。',code:`SELECT user_id, SUM(amount) AS total
FROM orders
WHERE status = 'paid'
GROUP BY user_id
HAVING SUM(amount) > 1000;`,explain:[{at:'SELECT user_id, SUM(amount) AS total',text:'每个用户的已支付总额，AS total 给这一列起个名字。'},{at:'FROM orders',text:'从订单表查。'},{at:'WHERE status = \'paid\'',text:'分组前先过滤：只要已支付的订单。'},{at:'GROUP BY user_id',text:'按用户分组，每个用户的订单算一组。'},{at:'HAVING SUM(amount) > 1000;',text:'分组后再过滤：只留下总额超过 1000 的用户。'}]},
  {title:'COUNT 的几种写法',body:'COUNT(*)：统计行数，不管里面有没有 NULL，每一行都算；\nCOUNT(1)：效果和 COUNT(*) 完全一样，性能也基本没有差别，MySQL 会对它们做同样的优化。所以“COUNT(1) 比 COUNT(*) 快”是一个流传很广的误解，按团队习惯写就行；\nCOUNT(列名)：只统计这一列不为 NULL 的行；\nCOUNT(DISTINCT 列名)：统计这一列不为 NULL 的值，还会去重。\n比如表里有 5 行，其中 2 行的 email 为 NULL：COUNT(*) 和 COUNT(1) 都是 5，COUNT(email) 是 3。\n另外，MySQL 的 InnoDB 引擎因为支持多版本并发（MVCC），不同的事务可能看到不同的行数，所以它没有一个现成的“总行数”，COUNT(*) 通常要扫描一遍索引，大表上会比较慢。'},
  {title:'动手试试：JOIN、GROUP BY 和 COUNT',body:'我们建一张用户表和一张订单表，练习 COUNT 的区别、JOIN 连表、GROUP BY 加 HAVING 统计，以及用 LEFT JOIN 找出没下过单的用户。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 sql_join.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python sql_join.py（Mac 用 python3 sql_join.py），对照下面的输出。','把 HAVING SUM(o.amount) > 1000 改成 > 500，看看结果多出了谁。'],expect:'COUNT(*)、COUNT(email)、COUNT(DISTINCT user_id)： [(5, 3, 3)]\n订单和用户名连起来： [(1, \'Tom\', 800), (2, \'Tom\', 500), (3, \'Amy\', 300)]\n已支付总额超过 1000 的用户： [(\'Bob\', 1200), (\'Tom\', 1300)]\n没下过单的用户： [(\'Cat\',), (\'Dan\',)]'},code:`import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER, status TEXT);
INSERT INTO users VALUES (1, 'Tom', 't@x.com'), (2, 'Amy', NULL), (3, 'Bob', 'b@x.com'),
                         (4, 'Cat', NULL), (5, 'Dan', 'd@x.com');
INSERT INTO orders VALUES (1, 1, 800, 'paid'), (2, 1, 500, 'paid'), (3, 2, 300, 'paid'),
                          (4, 1, 900, 'unpaid'), (5, 3, 1200, 'paid');
""")

def show(title, sql):
    print(title, db.execute(sql).fetchall())

show("COUNT(*)、COUNT(email)、COUNT(DISTINCT user_id)：",
     "SELECT COUNT(*), COUNT(email), (SELECT COUNT(DISTINCT user_id) FROM orders) FROM users")
show("订单和用户名连起来：",
     "SELECT o.id, u.name, o.amount FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id LIMIT 3")
show("已支付总额超过 1000 的用户：",
     """SELECT u.name, SUM(o.amount) AS total FROM orders o JOIN users u ON o.user_id = u.id
        WHERE o.status = 'paid' GROUP BY u.name HAVING SUM(o.amount) > 1000 ORDER BY total""")
show("没下过单的用户：",
     "SELECT u.name FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE o.id IS NULL ORDER BY u.id")`,explain:[{at:'import sqlite3',to:'db = sqlite3.connect(":memory:")',text:'用 Python 自带的 SQLite，在内存里建一个临时数据库。'},{at:'db.executescript("""',text:'executescript 可以一次执行多条用分号隔开的 SQL。'},{at:'CREATE TABLE users',to:'CREATE TABLE orders',text:'建用户表和订单表，订单通过 user_id 关联到用户。'},{at:'INSERT INTO users VALUES',to:'(4, \'Cat\', NULL), (5, \'Dan\', \'d@x.com\');',text:'5 个用户，其中 Amy 和 Cat 没有邮箱（NULL）。'},{at:'INSERT INTO orders VALUES',to:'""")',text:'5 笔订单：Tom 3 笔（其中 1 笔未支付），Amy 1 笔，Bob 1 笔，Cat 和 Dan 没有。'},{at:'def show(title, sql):',to:'print(title, db.execute(sql).fetchall())',text:'执行查询并打印结果。'},{at:'show("COUNT(*)、COUNT(email)、COUNT(DISTINCT user_id)：",',to:'"SELECT COUNT(*), COUNT(email), (SELECT COUNT(DISTINCT user_id) FROM orders) FROM users")',text:'COUNT(*) 是 5；COUNT(email) 跳过 NULL，是 3；括号里的子查询统计下过单的不同用户，是 3。'},{at:'show("订单和用户名连起来：",',to:'"SELECT o.id, u.name, o.amount FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id LIMIT 3")',text:'JOIN 后每个订单都带上了用户名，这里只取前 3 条。'},{at:'show("已支付总额超过 1000 的用户：",',to:'WHERE o.status = \'paid\' GROUP BY u.name HAVING SUM(o.amount) > 1000 ORDER BY total""")',text:'先用 WHERE 去掉未支付的订单，按用户分组求和，再用 HAVING 留下总额超过 1000 的：Bob 1200、Tom 1300（Tom 未支付的 900 没算进去）。'},{at:'show("没下过单的用户：",',to:'"SELECT u.name FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE o.id IS NULL ORDER BY u.id")',text:'LEFT JOIN 保留所有用户，订单为 NULL 的就是没下过单的：Cat 和 Dan。'}]},
  {title:'窗口函数：排名和“每组前几条”',body:'GROUP BY 会把每一组合并成一行。有时候我们想在“不合并行”的情况下，给每一行算出它在组内的排名，这时用窗口函数。写法是：函数() OVER (PARTITION BY 分组的列 ORDER BY 排序的列)。\n三个常用的排名函数，区别在于遇到并列时怎么排：\nROW_NUMBER：不管是否并列，都依次编号 1、2、3；\nRANK：并列的名次相同，之后跳号：1、1、3；\nDENSE_RANK：并列的名次相同，之后不跳号：1、1、2。\n最常见的用途是“每组取前 N 条”：比如每个用户最新的 2 笔订单。先用 ROW_NUMBER 按用户分组、按时间倒序编号，再在外层只保留编号小于等于 2 的行。一条 SQL 就能对所有用户同时完成。'},
  {title:'动手试试：每个用户最新的 2 笔订单',body:'用 ROW_NUMBER 为每个用户的订单按时间倒序编号，取每人最新的 2 笔；再对比 RANK 和 DENSE_RANK 处理并列分数的方式；最后验证唯一约束：允许多个 NULL，但不允许重复的值。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 sql_window.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python sql_window.py（Mac 用 python3 sql_window.py），对照下面的输出。','把外层的 rn <= 2 改成 rn = 1，就变成了“每个用户最新的一笔订单”，运行看看。'],expect:'每个用户最新的 2 笔： [(1, 3, \'03-09\'), (1, 2, \'03-05\'), (2, 5, \'03-08\'), (2, 4, \'03-02\')]\n分数、RANK、DENSE_RANK： [(95, 1, 1), (95, 1, 1), (90, 3, 2)]\n重复手机号被拒绝： UNIQUE constraint failed: users.phone\n唯一列里的 NULL 有几个： 2'},code:`import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER, created TEXT);
INSERT INTO orders VALUES (1, 1, 800, '03-01'), (2, 1, 500, '03-05'), (3, 1, 900, '03-09'),
                          (4, 2, 300, '03-02'), (5, 2, 700, '03-08');
""")
rows = db.execute("""
SELECT user_id, id, created FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created DESC) AS rn
    FROM orders
) WHERE rn <= 2 ORDER BY user_id, rn
""").fetchall()
print("每个用户最新的 2 笔：", rows)

scores = db.execute("""
SELECT score,
       RANK() OVER (ORDER BY score DESC),
       DENSE_RANK() OVER (ORDER BY score DESC)
FROM (SELECT 95 AS score UNION ALL SELECT 95 UNION ALL SELECT 90)
""").fetchall()
print("分数、RANK、DENSE_RANK：", scores)

db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE)")
db.execute("INSERT INTO users (phone) VALUES (NULL)")
db.execute("INSERT INTO users (phone) VALUES (NULL)")
db.execute("INSERT INTO users (phone) VALUES ('13800000000')")
try:
    db.execute("INSERT INTO users (phone) VALUES ('13800000000')")
except sqlite3.IntegrityError as e:
    print("重复手机号被拒绝：", e)
print("唯一列里的 NULL 有几个：", db.execute("SELECT COUNT(*) FROM users WHERE phone IS NULL").fetchone()[0])`,explain:[{at:'import sqlite3',to:'db = sqlite3.connect(":memory:")',text:'创建内存数据库。'},{at:'db.executescript("""',to:'""")',text:'建订单表并插入数据：用户 1 有 3 笔订单，用户 2 有 2 笔。日期简化成“月-日”的文本，按文本排序正好是时间顺序。'},{at:'rows = db.execute("""',to:'SELECT user_id, id, created FROM (',text:'外层查询，从下面的子查询结果里取数据。'},{at:'SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created DESC) AS rn',text:'窗口函数：按 user_id 分组（PARTITION BY），每组内按日期从新到旧排序，依次编号 1、2、3，编号存在 rn 列。'},{at:'FROM orders',text:'子查询从订单表查。'},{at:') WHERE rn <= 2 ORDER BY user_id, rn',text:'外层只保留每组编号 1 和 2 的行，也就是每个用户最新的 2 笔。'},{at:'""").fetchall()',to:'print("每个用户最新的 2 笔：", rows)',text:'用户 1 的最新两笔是订单 3 和 2，用户 2 的是订单 5 和 4。'},{at:'scores = db.execute("""',to:'SELECT score,',text:'第二个实验：对三个分数 95、95、90 排名。'},{at:'RANK() OVER (ORDER BY score DESC),',to:'DENSE_RANK() OVER (ORDER BY score DESC)',text:'分别用 RANK 和 DENSE_RANK，按分数从高到低排名。'},{at:'FROM (SELECT 95 AS score UNION ALL SELECT 95 UNION ALL SELECT 90)',text:'用 UNION ALL 临时拼出一张只有三行的分数表。'},{at:'""").fetchall()',to:'print("分数、RANK、DENSE_RANK：", scores)',text:'两个 95 并列第 1；90 用 RANK 是第 3（跳号），用 DENSE_RANK 是第 2（不跳号）。'},{at:'db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE)")',text:'第三个实验：手机号列有唯一约束，但允许为空。'},{at:'db.execute("INSERT INTO users (phone) VALUES (NULL)")',to:'db.execute("INSERT INTO users (phone) VALUES (\'13800000000\')")',text:'插入两个 NULL 和一个手机号，都成功了：唯一约束不限制 NULL 的个数。'},{at:'try:',to:'print("重复手机号被拒绝：", e)',text:'再插一次同样的手机号，被唯一约束拒绝。'},{at:'print("唯一列里的 NULL 有几个："',text:'确认表里确实有 2 个 NULL。'}]},
  {title:'字段类型怎么选',body:'选择字段类型的原则：够用、准确、尽量小。\n字符串：\nCHAR(M)：定长，不足 M 个字符会补空格。适合长度固定的短值，比如国家代码 CN、性别、MD5 值；\nVARCHAR(M)：变长，实际存多少占多少，再额外用一两个字节记录长度。适合昵称、地址这类长度不固定的内容；\nM 指的是字符数，不是字节数。MySQL 现在推荐用 utf8mb4 字符集（能存表情符号），一个字符最多占 4 个字节。\n数字：用能装下的最小整数类型，id 一般用 BIGINT。\n金额：用 DECIMAL，或者用整数存“分”。绝不用 FLOAT、DOUBLE，它们是近似值，0.1 + 0.2 都不精确等于 0.3。\n时间：用 DATETIME 或 TIMESTAMP，不要用字符串存时间，否则比较、排序和计算都很麻烦。'},
  {title:'自增主键会跳号，这很正常',body:'自增主键只保证“不重复、一般递增”，不保证“连续”。下面这些情况都会出现跳号（比如 1、2、5）：\n一、插入时事务回滚了，已经分配出去的 id 不会收回；\n二、插入时违反了唯一约束失败了，id 同样用掉了；\n三、批量插入时，数据库可能一次预留了多个 id，没用完的就空着。\n所以看到跳号，不能说明数据被误删了。如果业务真的需要连续不断的编号（比如发票号），要单独设计一个号码生成方式，而不是依赖自增主键。'},
  {title:'唯一约束：别用“先查再插”',body:'唯一约束（UNIQUE）保证一列（或几列的组合）的值不重复，比如用户名、手机号：\n一、唯一列允许有多个 NULL，因为 NULL 表示“未知”，两个未知不算相等。如果要求“必填并且唯一”，要同时加 NOT NULL 和 UNIQUE；\n二、联合唯一：比如 UNIQUE(user_id, product_id)，约束的是这两列的组合不能重复，单独某一列可以重复。比如同一个用户不能重复收藏同一件商品。\n一个非常常见的错误：想保证用户名唯一，先 SELECT 查一下这个用户名存不存在，不存在再 INSERT。在并发的情况下，两个注册请求可能同时查到“不存在”，然后都插入成功，就出现了两个同名用户。\n正确的做法是在数据库上建唯一索引，直接插入：数据库会保证只有一个能成功，另一个会收到唯一约束冲突的错误，程序捕获这个错误，提示“用户名已被占用”。'}
 ],quiz:[
  {id:'be-sql-1',q:'统计每个用户的订单数，只保留订单数大于 5 的用户，过滤条件应该写在哪里？',options:['WHERE COUNT(*) > 5','HAVING COUNT(*) > 5','ORDER BY COUNT(*) > 5','GROUP BY COUNT(*) > 5'],why:['WHERE 在分组之前执行，此时还没有聚合结果，不能使用聚合函数。','','ORDER BY 只负责排序，不会过滤掉任何分组。','GROUP BY 指定分组依据，不能用来写过滤条件。'],answer:1,explain:'聚合结果的过滤用 HAVING；WHERE 在分组之前执行，不能使用聚合函数。',interview:'q-e5b8e628fbdb3be0'},
  {id:'be-sql-2',type:'multi',q:'表里有 5 行，其中 2 行的 email 为 NULL。下面哪些结果是 5？（多选）',options:['COUNT(*)','COUNT(1)','COUNT(email)','COUNT(id)'],why:['','','COUNT(列) 不统计 NULL，2 行 email 为空，结果是 3。',''],answers:[0,1,3],explain:'COUNT(*) 和 COUNT(1) 统计行数；COUNT(email) 不统计 NULL，结果是 3；id 是主键，不能为 NULL，所以 COUNT(id) 也是 5。',interview:'q-748dcff591550a41'},
  {id:'be-sql-3',type:'judge',q:'COUNT(1) 比 COUNT(*) 快，所以应该一律写 COUNT(1)。',answer:false,explain:'MySQL 对两者的处理基本相同，没有性能差别。',interview:'q-748dcff591550a41'},
  {id:'be-sql-4',q:'存储用户的国家代码（固定 2 个字母，如 CN），最合适的类型是？',options:['VARCHAR(255)','CHAR(2)','TEXT','INT'],why:['长度声明远超需要，也无法表达“固定两个字母”的约束。','','TEXT 用于长文本，存放在溢出页，不适合短小的常用字段和普通索引。','国家代码是字母，不是数字。'],answer:1,explain:'长度固定的短值用 CHAR；VARCHAR(255) 过大，TEXT 不适合做普通索引字段。',interview:'q-fcb3818197d74840'},
  {id:'be-sql-5',type:'judge',q:'自增主键 ID 出现了跳号（比如 1、2、5），说明数据被误删了。',answer:false,explain:'事务回滚、插入冲突、批量插入预留等都会跳号，自增值发出去不会回收。',interview:'q-b6915aa2e0ed5bfb'},
  {id:'be-sql-6',q:'phone 列有唯一索引，但允许为空。下面哪种情况能成功插入？',options:['两行的 phone 都是 "13800000000"','两行的 phone 都是 NULL','有唯一索引后任何重复都不允许','这一列总共只允许插入一行数据'],why:['相同的非空值违反唯一约束，插入会失败。','','唯一索引允许多个 NULL，因为 NULL 之间不认为相等。','唯一约束只限制重复值，不限制行数。'],answer:1,explain:'唯一索引允许多个 NULL；如果要求必填且唯一，应同时设置 NOT NULL。',interview:'q-bccf2c6308af43a2'},
  {id:'be-sql-7',q:'用户 1 需要“最新的 2 笔订单”，同时也要对每个用户做同样的事，最合适的写法是？',options:['ORDER BY created_at DESC LIMIT 2','ROW_NUMBER() 按用户分区编号后取前 2','GROUP BY user_id LIMIT 2','SELECT DISTINCT user_id LIMIT 2'],why:['这只能取整张表最新的 2 笔，而不是每个用户各 2 笔。','','GROUP BY 每组只产生一行，LIMIT 2 只会取出 2 个用户。','DISTINCT 只得到用户 id 列表，没有订单信息。'],answer:1,explain:'“每组前 N 条”是窗口函数的典型用法：ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) 编号后取 <= 2。',interview:'q-e5b8e628fbdb3be0'},
  {id:'be-sql-8',type:'fill',q:'RANK 遇到并列会跳号（1,1,3），不跳号（1,1,2）的排名函数是 ____。',accepted:['DENSE_RANK','dense_rank','DENSE_RANK()'],explain:'ROW_NUMBER 不并列，RANK 跳号，DENSE_RANK 不跳号。',interview:'q-e5b8e628fbdb3be0'},
  {id:'be-sql-9',q:'LEFT JOIN users u ON o.user_id = u.id WHERE u.status = \'active\'，这个查询的效果相当于？',options:['仍然是左连接，保留所有订单','实际变成了内连接','这条 SQL 存在语法错误','相当于变成了右连接'],why:['没有匹配用户的订单 u.status 为 NULL，会被 WHERE 过滤掉，并没有全部保留。','','语法完全合法，只是语义变了。','右连接保留的是右表全部行，这里也没有保留未匹配的用户。'],answer:1,explain:'右表的过滤条件写在 WHERE 中会把未匹配的行过滤掉；想保留左表全部行，要把条件放进 ON。',interview:'q-e5b8e628fbdb3be0'},
  {id:'be-sql-10',type:'short',q:'为什么不能用“先 SELECT 判断不存在，再 INSERT”来保证用户名唯一？应该怎么做？',reference:'两个请求可能同时 SELECT 都发现不存在，然后都 INSERT，出现重复。正确做法是在数据库层建唯一索引，让数据库原子地保证唯一性；插入时捕获唯一冲突错误返回“已存在”，或者使用 INSERT ... ON DUPLICATE KEY UPDATE 等语句。',points:['先查再插有并发竞态','唯一索引由数据库原子保证','捕获冲突错误','不依赖应用层判断'],explain:'业务约束最终要落在数据库约束上。',interview:'q-bccf2c6308af43a2'},
 ]},
 {id:'be-index',title:'索引与执行计划',summary:'B+ 树、回表、最左前缀，以及怎么看 EXPLAIN',lessons:[
  {title:'这一关学什么：让查询从“翻遍全书”变成“查目录”',body:'一张表有几百万行数据时，如果数据库每次查询都要从第一行看到最后一行（全表扫描），会非常慢。索引就像一本书的目录：先在目录里找到页码，再直接翻到那一页。\n这一关讲：\n一、MySQL 的 InnoDB 引擎用什么结构做索引（B+ 树），为什么选它；\n二、聚集索引、辅助索引、回表和覆盖索引；\n三、联合索引的“最左前缀”规则，以及哪些写法会让索引失效；\n四、怎么用 EXPLAIN 看懂一条 SQL 是怎么执行的，以及慢 SQL 的优化步骤。\n最后会在你电脑上用 Python 自带的 SQLite 数据库亲手验证这些规则。'},
  {title:'为什么是 B+ 树，而不是二叉树',body:'数据库的数据主要存在磁盘上，而读一次磁盘比读内存慢成千上万倍。所以索引设计的核心目标是：查一条数据时，读磁盘的次数越少越好。\n二叉树每个节点只有两个分叉，几百万条数据要十几二十层，可能要读十几二十次磁盘。\nB+ 树每个节点是一个“页”（InnoDB 默认 16KB），一页里能放上千个分叉，所以树非常“矮胖”：三四层就能装下千万行数据，查一条记录只需要读三四次磁盘，而且上面几层经常已经缓存在内存里。\nB+ 树还有两个特点：\n一、内部节点只存“分隔用的键”和指向下一层的指针，不存整行数据，所以能放更多分叉；\n二、所有数据都在最底层的叶子页里，叶子页按顺序排好并且互相连接，范围查询（比如 age 在 20 到 30 之间）和排序时可以顺着叶子一路读下去。'},
  {title:'聚集索引和辅助索引',body:'InnoDB 的每张表都有一个聚集索引，通常就是主键。它的叶子页里存的是完整的一整行数据，可以说“表本身就是按主键组织的一棵 B+ 树”。所以一张表只能有一个聚集索引。\n你自己在其他列上建的索引叫辅助索引（也叫二级索引）。它的叶子页里只存“索引列的值 + 这一行的主键值”，不存整行。\n所以通过辅助索引查数据，常常要走两步：先在辅助索引里找到主键，再拿着主键回到聚集索引里查出整行。第二步叫“回表”。',code:`CREATE TABLE users (
    id   BIGINT PRIMARY KEY,
    name VARCHAR(50),
    city VARCHAR(50),
    age  INT,
    INDEX idx_name (name)
);

SELECT * FROM users WHERE name = 'Tom';`,explain:[{at:'CREATE TABLE users (',text:'建一张用户表。'},{at:'id   BIGINT PRIMARY KEY,',text:'主键 id：InnoDB 会以它建聚集索引，叶子里存整行。'},{at:'name VARCHAR(50),',to:'age  INT,',text:'其他普通列。'},{at:'INDEX idx_name (name)',text:'在 name 上建一个辅助索引，它的叶子里只有 name 和对应的 id。'},{at:'SELECT * FROM users WHERE name = \'Tom\';',text:'执行过程：先在 idx_name 里找到 name = Tom 的 id，再拿 id 回到聚集索引取出整行（因为 SELECT * 要所有列），这就是回表。'}]},
  {title:'覆盖索引：不用回表',body:'如果一条查询需要的所有列，在辅助索引里就都有了，数据库就不用再回表，直接从辅助索引里返回结果，这叫“覆盖索引”，速度会快很多。\n比如在 (city, name) 上建了联合索引，那么 SELECT id, name FROM users WHERE city = \'上海\' 需要的 city、name、id 在这个索引里全都有（别忘了辅助索引的叶子里自带主键 id），就不用回表。\n这也是为什么不建议随手写 SELECT *：只查需要的列，才有机会用上覆盖索引。'},
  {title:'联合索引和最左前缀',body:'在多个列上建的索引叫联合索引，比如 (a, b, c)。它的排序方式像查字典：先按 a 排；a 相同的，再按 b 排；a、b 都相同的，再按 c 排。\n所以只有先固定了左边的列，右边的列才是有序的、才能用来快速定位。这叫“最左前缀”规则：\nWHERE a = 1：能用；\nWHERE a = 1 AND b = 2：能用，而且定位更准；\nWHERE a = 1 AND b > 2 AND c = 3：a、b 能用来定位，b 是范围条件，b 右边的 c 就不能再用来定位了（但可能用来过滤）；\nWHERE b = 2 或 WHERE c = 3：跳过了最左边的 a，通常不能用这个索引定位。\n条件在 WHERE 里写的先后顺序无所谓，数据库会自己调整，看的是有没有包含最左边的列。'},
  {title:'哪些写法会让索引失效',body:'一、对索引列套函数或者做计算：WHERE YEAR(create_time) = 2025。索引里存的是 create_time 原本的值，不是 YEAR() 算出来的结果，没法用来定位，只能一行行算。改成范围查询：create_time >= \'2025-01-01\' AND create_time < \'2026-01-01\'。\n二、隐式类型转换：phone 是字符串类型，却写成 WHERE phone = 13800000000（数字），数据库要把每一行都转成数字再比较，索引用不上。\n三、LIKE 以通配符开头：LIKE \'%明\' 不知道开头是什么，没法按顺序定位。LIKE \'张%\' 就可以用索引。但 LIKE \'%x\' 也不是“一定不用索引”：如果查询的列都在索引里，数据库可能会扫描整棵索引（比扫整张表小），这也算用到了索引。\n四、优化器估算后觉得回表次数太多，还不如直接全表扫描，也会主动放弃索引。'},
  {title:'看懂 EXPLAIN：数据库打算怎么查',body:'在 SQL 前面加上 EXPLAIN，MySQL 不会真正执行它，而是告诉你它打算怎么执行（执行计划）。重点看这几列：\ntype：访问方式，从好到差大致是 const（按主键或唯一索引查一行）、ref（用普通索引按等值查）、range（用索引查一个范围）、index（把整棵索引扫一遍）、ALL（全表扫描，通常需要优化）；\nkey：实际用到的索引，NULL 表示没用索引；\nrows：估计要扫描多少行，越少越好；\nExtra：补充信息。Using index 表示覆盖索引，不用回表；Using index condition 表示用了索引下推；Using filesort 表示需要额外排序；Using temporary 表示用了临时表。\nMySQL 8.0.18 起还有 EXPLAIN ANALYZE，它会真正执行这条 SQL，并给出每一步的实际耗时和行数。',code:`EXPLAIN SELECT id, name FROM users
WHERE city = '上海' AND name LIKE '张%';`,explain:[{at:'EXPLAIN SELECT id, name FROM users',text:'查看这条查询的执行计划。假设表上有联合索引 (city, name)。'},{at:'WHERE city = \'上海\' AND name LIKE \'张%\';',text:'city 等值、name 前缀匹配，都能用上联合索引，type 一般是 range；查的 id、name 都在索引里，Extra 会显示 Using index。'}]},
  {title:'索引下推：在索引里先过滤掉一部分',body:'假设有联合索引 (city, name)，查询条件是 city = \'上海\' AND name LIKE \'%明%\'。\nname 以 % 开头，不能用来定位，只有 city 能用来定位。没有索引下推时，数据库在索引里找到所有上海的记录后，要逐条回表取出整行，再判断 name 是否包含“明”。\n有了索引下推（Index Condition Pushdown，MySQL 5.6 起支持），数据库会在索引里就先用 name 条件筛一遍，因为 name 的值在索引里就有。只有符合条件的记录才回表，回表次数大大减少。EXPLAIN 的 Extra 里会显示 Using index condition。'},
  {title:'深分页为什么慢，怎么改',body:'订单列表翻到很深的页，比如 LIMIT 10000000, 20，意思是“跳过前 1000 万条，取 20 条”。数据库并不能直接跳过去，而是要真的数出前 1000 万条再丢掉，越往后翻越慢。\n如果是“一页一页往下翻”的场景，最好的方案是“游标分页”（也叫键集分页）：记住上一页最后一条的 id，下一页直接从这个 id 往后取，利用主键索引一步定位，不管翻到多深都一样快。\n如果确实需要跳页，可以先用覆盖索引只查出这一页的 id（不回表，比较快），再用这些 id 回表取完整数据。',code:`SELECT * FROM orders ORDER BY id LIMIT 10000000, 20;

SELECT id, user_id, amount FROM orders
WHERE id > 10000020
ORDER BY id
LIMIT 20;`,explain:[{at:'SELECT * FROM orders ORDER BY id LIMIT 10000000, 20;',text:'慢的写法：要先读出并丢弃 1000 万行。'},{at:'SELECT id, user_id, amount FROM orders',text:'快的写法：游标分页。顺便只查需要的列。'},{at:'WHERE id > 10000020',text:'10000020 是上一页最后一条订单的 id，由前端在请求下一页时带过来。主键索引能直接定位到这里。'},{at:'ORDER BY id',to:'LIMIT 20;',text:'按 id 顺序往后取 20 条，只需要读 20 行。'}]},
  {title:'动手试试：亲眼看看索引怎么被用上和用不上',body:'我们用 Python 自带的 SQLite 数据库（不用安装任何东西），建一张 10 万行的用户表，然后用 EXPLAIN QUERY PLAN（SQLite 版的 EXPLAIN）看看不同查询的执行计划。SQLite 和 MySQL 的输出格式不同，但规则是相通的：SCAN 表示全表扫描，SEARCH ... USING INDEX 表示用索引定位，COVERING INDEX 表示覆盖索引。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 index_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python index_demo.py（Mac 用 python3 index_demo.py），对照下面的输出。','把第 5 条查询改成 city = \'城市7\' AND name = \'用户7\'，看看计划会不会变得更精确。'],expect:'1. 没有索引：\n   SCAN users\n2. 建了 (city, name) 联合索引：\n   SEARCH users USING INDEX idx_city_name (city=?)\n3. 只查索引里有的列（覆盖索引）：\n   SEARCH users USING COVERING INDEX idx_city_name (city=?)\n4. 跳过最左边的 city，只用 name：\n   SCAN users\n5. 对索引列套函数：\n   SCAN users'},code:`import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, city TEXT, name TEXT, age INTEGER)")
rows = [(i, f"城市{i % 100}", f"用户{i}", i % 60) for i in range(1, 100001)]
db.executemany("INSERT INTO users VALUES (?, ?, ?, ?)", rows)

def plan(sql):
    for row in db.execute("EXPLAIN QUERY PLAN " + sql):
        print("  ", row[3])

print("1. 没有索引：")
plan("SELECT * FROM users WHERE city = '城市7'")

db.execute("CREATE INDEX idx_city_name ON users (city, name)")
print("2. 建了 (city, name) 联合索引：")
plan("SELECT * FROM users WHERE city = '城市7'")
print("3. 只查索引里有的列（覆盖索引）：")
plan("SELECT id, name FROM users WHERE city = '城市7'")
print("4. 跳过最左边的 city，只用 name：")
plan("SELECT * FROM users WHERE name = '用户7'")
print("5. 对索引列套函数：")
plan("SELECT * FROM users WHERE substr(city, 1, 3) = '城市7'")`,explain:[{at:'import sqlite3',text:'导入 Python 自带的 SQLite 数据库模块，不用另外安装数据库。'},{at:'db = sqlite3.connect(":memory:")',text:'在内存里创建一个临时数据库，程序结束就消失。'},{at:'db.execute("CREATE TABLE users',text:'建一张用户表，id 是主键。'},{at:'rows = [(i, f"城市{i % 100}"',text:'生成 10 万行假数据：城市从“城市0”到“城市99”轮流出现。'},{at:'db.executemany("INSERT INTO users',text:'一次性插入所有行。'},{at:'def plan(sql):',text:'定义一个小函数：打印一条 SQL 的执行计划。'},{at:'for row in db.execute("EXPLAIN QUERY PLAN " + sql):',to:'print("  ", row[3])',text:'执行 EXPLAIN QUERY PLAN，结果的第 4 列是计划的文字说明。'},{at:'print("1. 没有索引：")',to:'plan("SELECT * FROM users WHERE city = \'城市7\'")',text:'还没建索引，只能全表扫描：SCAN users。'},{at:'db.execute("CREATE INDEX idx_city_name ON users (city, name)")',text:'在 (city, name) 上建联合索引。'},{at:'print("2. 建了 (city, name) 联合索引：")',to:'plan("SELECT * FROM users WHERE city = \'城市7\'")',text:'同一条查询，现在用索引定位了：SEARCH ... USING INDEX。因为要 SELECT *，还需要回表。'},{at:'print("3. 只查索引里有的列（覆盖索引）：")',to:'plan("SELECT id, name FROM users WHERE city = \'城市7\'")',text:'只查 id 和 name，它们都在索引里，显示 COVERING INDEX，不用回表。'},{at:'print("4. 跳过最左边的 city，只用 name：")',to:'plan("SELECT * FROM users WHERE name = \'用户7\'")',text:'不符合最左前缀，用不上这个索引，又变回全表扫描。'},{at:'print("5. 对索引列套函数：")',to:'plan("SELECT * FROM users WHERE substr(city, 1, 3) = \'城市7\'")',text:'对 city 套了 substr 函数，索引失效，全表扫描。'}]},
  {title:'一条 SQL 很慢，怎么优化',body:'按这个步骤来：\n一、确认问题：在慢查询日志里找到这条 SQL，记下它执行的频率和耗时，确认它真的是瓶颈；\n二、看执行计划：用 EXPLAIN（或 EXPLAIN ANALYZE）看 type 是不是 ALL、key 有没有用上索引、rows 估算是不是很大、Extra 里有没有 Using filesort 或 Using temporary；\n三、对症下药：\n没有合适的索引，就按 WHERE、ORDER BY 里的列建联合索引，注意最左前缀和列的顺序；\n索引失效，就去掉对索引列的函数和计算、修正类型不一致、避免前导 %；\n回表太多，就只查需要的列，争取用上覆盖索引；\n深分页，就改成游标分页；\n四、还不够的话，从业务和架构上想办法：拆分复杂的大 SQL、加缓存、读写分离、分库分表；\n五、改完后再用 EXPLAIN 和实际耗时验证效果，并在数据量接近生产环境的数据上测试。'}
 ],quiz:[
  {id:'be-index-1',q:'InnoDB 选择 B+ 树而不是二叉树做索引，最主要的原因是？',options:['B+ 树的代码更容易实现','分叉多、树很矮，读盘次数少','二叉树结构不支持查找操作','B+ 树里的数据不需要排序'],why:['B+ 树的实现比二叉树复杂得多。','','二叉搜索树当然支持查找，问题在于树太高、读盘次数多。','B+ 树中的键正是按顺序存放的，这样才支持范围查询。'],answer:1,explain:'磁盘按页读取，B+ 树每个节点能放很多分叉，三四层就能存千万级数据；叶子节点相连也方便范围查询。',interview:'q-688f9f1b3801c7e8'},
  {id:'be-index-2',q:'users 表主键 id，name 上有普通索引。SELECT * FROM users WHERE name = \'Tom\' 的执行过程是？',options:['直接在聚集索引中按 name 查','先查 name 索引得 id，再回表','没有用到索引，直接全表扫描','只读 name 索引就能返回结果'],why:['聚集索引按主键排序，不能直接按 name 查找。','','name 上有索引，等值查询可以走索引。','SELECT * 需要整行数据，二级索引中只有 name 和主键。'],answer:1,explain:'辅助索引叶子只存 name 和主键，SELECT * 需要回表取整行。',interview:'q-fb57f5db74209f3d'},
  {id:'be-index-3',type:'multi',q:'联合索引 (a, b, c)，下面哪些条件能用到这个索引来定位？（多选）',options:['WHERE a = 1 AND b > 0','WHERE a = 1 AND b = 2','WHERE b = 2 AND a = 1','WHERE a = 1 AND c = 3'],why:['','','',''],answers:[0,1,2,3],explain:'只要包含最左列 a 就能用索引定位：a 等值 + b 范围、a 和 b 等值（书写顺序不重要，优化器会调整）、a 等值后跳过 b 的 c 只能在定位后过滤。只有 c 而没有 a 时通常无法定位。',interview:'q-15fd859316b9b092'},
  {id:'be-index-4',q:'create_time 上有索引，WHERE YEAR(create_time) = 2025 很慢。最好的改法是？',options:['在 create_time 上再多加几个索引','改成 create_time 的范围条件','把条件改成 LIKE \'2025%\'','加上 FORCE INDEX 强制走索引'],why:['索引已经存在，问题是对索引列套了函数，加多少索引都用不上。','','时间类型用 LIKE 会发生隐式转换，同样无法利用索引顺序。','强制使用索引也无法让函数表达式按索引顺序定位，只会变成全索引扫描。'],answer:1,explain:'对索引列套函数无法利用索引顺序；改成 create_time >= \'2025-01-01\' AND create_time < \'2026-01-01\' 就能走 range 扫描。',interview:'q-cd952018025fce71'},
  {id:'be-index-5',type:'judge',q:'LIKE \'%abc\' 一定不会使用索引。',answer:false,explain:'无法做范围定位，但如果只查索引里的列，优化器可能选择全索引扫描（type=index）。',interview:'q-f6c633e90a335b42'},
  {id:'be-index-6',q:'EXPLAIN 的 Extra 显示 Using index，说明什么？',options:['使用了索引条件下推','覆盖索引，不需要回表','执行了全表扫描','需要额外的文件排序'],why:['索引下推显示为 Using index condition。','','全表扫描体现在 type 为 ALL。','额外排序显示为 Using filesort。'],answer:1,explain:'Using index condition 才是索引下推；Using filesort 表示额外排序。',interview:'q-f1cc3f9a2d2ad8cc'},
  {id:'be-index-7',q:'索引 (city, name)，查询 WHERE city = \'上海\' AND name LIKE \'%明%\'，“索引下推”起了什么作用？',options:['让 name 条件也能做范围定位','回表前先用索引中的 name 过滤','让查询避免额外的排序操作','让这个查询变成覆盖索引'],why:['前导 % 的模糊匹配无法定位，索引下推也不能改变这一点。','','索引下推与排序无关。','是否覆盖索引取决于查询的列，下推不会改变它。'],answer:1,explain:'索引条件下推（ICP）在存储引擎层先用索引中的 name 列过滤，减少回表次数。',interview:'q-f1cc3f9a2d2ad8cc'},
  {id:'be-index-8',type:'fill',q:'EXPLAIN 中 type 为 ____ 表示全表扫描，通常需要优化。',accepted:['ALL','all'],explain:'index 是全索引扫描，ALL 是全表扫描；还要结合 rows 估算行数判断。',interview:'q-30e09e7fac732f1d'},
  {id:'be-index-9',q:'订单列表翻到很深的页：LIMIT 10000000, 20 很慢。连续翻页最好的方案是？',options:['把 LIMIT 后面的数值改大','游标分页：id 大于上页末尾','给数据库服务器加更多 CPU','把写法改成 LIMIT 20 OFFSET 10000000'],why:['偏移量越大要扫描并丢弃的行越多，只会更慢。','','瓶颈在于扫描大量无用的行，加 CPU 收效甚微。','OFFSET 写法与 LIMIT m, n 完全等价，性能一样差。'],answer:1,explain:'游标分页直接从上次的位置继续：WHERE id > 上一页最后的 id ORDER BY id LIMIT 20；按时间排序时加唯一 id 做第二排序键。',interview:'q-f040a7419f630ff3'},
  {id:'be-index-10',type:'short',q:'一条 SQL 很慢，你的优化步骤是什么？',reference:'先通过慢查询日志确认它确实又慢又频繁；用 EXPLAIN / EXPLAIN ANALYZE 看访问方式、使用的索引、扫描行数、是否回表、是否有额外排序或临时表；对症优化：只取需要的列，按过滤和排序建合适的联合索引，改写对索引列做函数的条件，深分页改游标，消除 N+1 查询；用有代表性的数据验证扫描行数和耗时，注意索引带来的写入成本。',points:['慢查询日志定位','EXPLAIN 看访问方式和扫描行数','建合适的联合索引、改写条件','只取需要的列、避免深分页','用真实数据验证'],explain:'先定位、再分析、再优化、再验证。',interview:'q-3338596b521f2957'},
 ]},
 {id:'be-algo',title:'设计模式与代码设计',summary:'六大原则、常用设计模式，以及用 Go 写出好改的代码',lessons:[
  {title:'这一关学什么：写出“好改”的代码',body:'代码写出来能跑只是第一步。真实项目里需求一直在变：今天加一种支付方式，明天换一个短信服务商。好的代码设计，目标就是需求变化时要改的地方尽量少、改了也不容易把别的东西改坏。\n这一关分两部分：\n一、设计：六大设计原则，以及最常用的几种设计模式在 Go 里怎么写；\n二、算法基础：怎么分析复杂度，常用数据结构和排序查找算法的特点，以及分布式系统里常用的一致性哈希。'},
  {title:'六大设计原则，用大白话说',body:'一、单一职责：一个模块只负责一件事。“用户注册”和“发送邮件”分开写，改邮件模板时就不会碰到注册逻辑；\n二、开闭原则：对扩展开放，对修改关闭。加一种新的支付方式，应该是“新增一个文件”，而不是“去改一个巨大的 if-else”；\n三、里氏替换：子类型要能完全替代父类型使用。一个接口的所有实现，行为都要符合接口的约定；\n四、依赖倒置：高层的业务逻辑依赖抽象的接口，而不是具体的实现。比如业务代码依赖“消息发送器”接口，而不是直接依赖某家短信公司的 SDK；\n五、接口隔离：接口要小，只放调用方真正需要的方法。Go 标准库的 io.Reader 只有一个方法，就是很好的例子；\n六、迪米特法则（最少知道）：只和直接的“朋友”打交道，不要写 a.GetB().GetC().DoSomething() 这样一路深入别人内部的代码。\n这六条的共同目标都是：降低模块之间的耦合，让变化的影响范围尽量小。'},
  {title:'策略模式：多种做法，随时可换',body:'场景：订单系统要支持微信、支付宝、银行卡多种支付方式，以后还会增加。\n如果写成一个大函数，里面 if 微信……else if 支付宝……，每加一种支付方式都要改这个函数，越改越长，也越容易改出 bug。\n策略模式的做法是：定义一个统一的接口（比如 Payer，有一个 Pay 方法），每种支付方式各写一个实现。业务代码只认接口，根据用户的选择拿到对应的实现去调用。加一种支付方式，只要新写一个实现、注册进去就行，原有代码一行都不用改，这正是开闭原则。'},
  {title:'动手试试：用策略模式做多种支付',body:'我们用 Go 写一个简化的收银台：两种支付方式各自实现 Payer 接口，注册在一个 map 里，Checkout 根据用户选择的方式去找对应的实现。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','仿照 WeChat 再写一个 Card（银行卡）类型并注册到 payers 里，不改 Checkout 函数，让 Checkout("card", 10) 也能成功。'],expect:'微信支付 30 元\n支付宝支付 99 元\n不支持的支付方式：card'},code:`package main

import "fmt"

type Payer interface {
    Pay(amount int) string
}

type WeChat struct{}

func (WeChat) Pay(amount int) string { return fmt.Sprintf("微信支付 %d 元", amount) }

type Alipay struct{}

func (Alipay) Pay(amount int) string { return fmt.Sprintf("支付宝支付 %d 元", amount) }

var payers = map[string]Payer{
    "wechat": WeChat{},
    "alipay": Alipay{},
}

func Checkout(method string, amount int) string {
    p, ok := payers[method]
    if !ok {
        return "不支持的支付方式：" + method
    }
    return p.Pay(amount)
}

func main() {
    fmt.Println(Checkout("wechat", 30))
    fmt.Println(Checkout("alipay", 99))
    fmt.Println(Checkout("card", 10))
}`,explain:[{at:'package main',to:'import "fmt"',text:'可运行程序的固定开头。'},{at:'type Payer interface {',to:'Pay(amount int) string',text:'定义“支付方式”的统一接口：只要能 Pay，就是一种支付方式。'},{at:'type WeChat struct{}',text:'微信支付，一个空结构体就够了。'},{at:'func (WeChat) Pay(amount int) string',text:'实现 Pay 方法，所以 WeChat 满足 Payer 接口。Go 不需要显式声明“实现了某接口”。'},{at:'type Alipay struct{}',to:'func (Alipay) Pay(amount int) string',text:'支付宝支付，同样实现 Pay。'},{at:'var payers = map[string]Payer{',to:'"alipay": Alipay{},',text:'把所有支付方式注册到一个 map 里：名字 → 实现。'},{at:'func Checkout(method string, amount int) string {',text:'收银台：只依赖 Payer 接口，不知道也不关心具体有哪些支付方式。'},{at:'p, ok := payers[method]',to:'return "不支持的支付方式：" + method',text:'按名字找到对应的实现，找不到就提示不支持。'},{at:'return p.Pay(amount)',text:'调用接口方法，实际执行的是对应支付方式的实现。'},{at:'func main() {',to:'fmt.Println(Checkout("card", 10))',text:'分别用微信、支付宝和还没实现的银行卡结账。'}]},
  {title:'装饰器模式：一层层包上新功能',body:'装饰器模式是在不修改原有代码的前提下，给它“包”上一层新功能，而且可以一层套一层。\nGo 的 HTTP 中间件就是装饰器模式最典型的应用：一个中间件接收一个 handler，返回一个新的 handler，新 handler 在调用原 handler 的前后加上日志、鉴权、限流等逻辑。多个中间件层层包裹，最里面才是真正的业务处理。',code:`func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

handler := Logging(Auth(http.HandlerFunc(orderHandler)))`,explain:[{at:'func Logging(next http.Handler) http.Handler {',text:'装饰器：接收被包裹的 handler，返回一个包装后的新 handler，两者类型相同，所以可以无限嵌套。'},{at:'return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',text:'返回一个新的处理函数。'},{at:'start := time.Now()',text:'前置逻辑：记录开始时间。'},{at:'next.ServeHTTP(w, r)',text:'调用被包裹的原 handler。'},{at:'log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))',text:'后置逻辑：打印请求方法、路径和耗时。'},{at:'handler := Logging(Auth(http.HandlerFunc(orderHandler)))',text:'层层包裹：请求先经过 Logging，再经过 Auth（鉴权），最后才到真正的 orderHandler。'}]},
  {title:'适配器、选项模式和单例',body:'适配器模式：把一个接口“转换”成另一个接口。比如你的业务代码依赖自己定义的 SMSSender 接口，而某家短信公司的 SDK 方法名和参数都不一样，就写一个适配器包住 SDK，对外实现 SMSSender。以后换供应商，只要再写一个适配器。\n选项模式（functional options）：构造参数很多、大部分有默认值的对象时，Go 里常用这种写法代替复杂的建造者模式：每个可选参数写成一个“设置函数”，构造时按需传入。\n单例模式：全局只需要一个实例，比如数据库连接池、配置。Go 里最推荐用 sync.Once 实现懒加载：第一次用到时才创建，并且保证在多个 goroutine 同时调用时也只创建一次。',code:`type Server struct {
    port    int
    timeout time.Duration
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(port int, opts ...Option) *Server {
    s := &Server{port: port, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

var (
    db   *sql.DB
    once sync.Once
)

func GetDB() *sql.DB {
    once.Do(func() {
        db, _ = sql.Open("mysql", dsn)
    })
    return db
}`,explain:[{at:'type Server struct {',to:'timeout time.Duration',text:'一个有多个配置项的服务器对象。'},{at:'type Option func(*Server)',text:'选项就是一个“修改 Server 的函数”。'},{at:'func WithTimeout(d time.Duration) Option {',to:'return func(s *Server) { s.timeout = d }',text:'每个可选参数提供一个 WithXxx 函数，返回对应的设置函数。'},{at:'func NewServer(port int, opts ...Option) *Server {',text:'构造函数：必填的参数直接写，可选的用 ...Option 接收任意多个。'},{at:'s := &Server{port: port, timeout: 30 * time.Second}',text:'先填好默认值。'},{at:'for _, opt := range opts {',to:'opt(s)',text:'依次执行调用方传入的设置函数，覆盖默认值。调用方式：NewServer(8080, WithTimeout(5*time.Second))。'},{at:'return s',text:'返回构造好的对象。'},{at:'var (',to:'once sync.Once',text:'单例：一个全局的数据库连接，和一个 sync.Once。'},{at:'func GetDB() *sql.DB {',text:'获取单例的函数。'},{at:'once.Do(func() {',to:'db, _ = sql.Open("mysql", dsn)',text:'once.Do 里的函数整个程序只会执行一次，即使很多 goroutine 同时调用 GetDB 也一样。（这里为了简短忽略了错误，实际要处理。）'},{at:'return db',text:'之后每次调用都直接返回同一个实例。'}]},
  {title:'复杂度：数据变多时，要多干多少活',body:'时间复杂度描述的是：输入的数据量 n 变大时，程序要做的工作量大致怎么增长。用大 O 表示，只看增长的“量级”，忽略常数：\nO(1)：不管数据多少，工作量都一样，比如按下标取数组元素、哈希表查找；\nO(log n)：数据翻倍，工作量只多一步，比如在有序数组里二分查找。100 万个数只要查约 20 次；\nO(n)：数据翻倍，工作量也翻倍，比如从头到尾扫描一遍；\nO(n log n)：好的排序算法，比如快速排序、归并排序；\nO(n²)：数据翻倍，工作量变成 4 倍，比如两两比较的双重循环。n 到了几万就会很慢。\n空间复杂度同理，看的是需要多少额外的存储空间，递归调用时每一层的调用栈也要算进去。\n还要会区分最好、平均、最坏情况。另外有一种“摊还”复杂度：切片 append 偶尔需要扩容，要复制全部元素是 O(n)，但扩容很少发生，平均分摊到每次 append 上只有 O(1)。'},
  {title:'常用数据结构速览',body:'数组：按下标访问 O(1)，在中间插入或删除要挪动后面的元素，O(n)；\n链表：已知前一个节点时插入、删除只要改指针，O(1)；但查找要从头一个个找，O(n)；\n栈：后进先出，像叠盘子。函数调用、括号匹配、撤销操作都用到它；\n队列：先进先出，像排队。用数组实现时常用“环形缓冲区”，首尾相连，避免反复挪动元素；\n哈希表：平均 O(1) 的查找、插入和删除，Go 的 map 就是；\n堆：能在 O(log n) 时间内取出最大或最小的元素。找“最大的前 K 个”（Top K）时，维护一个大小为 K 的小顶堆最合适；\n二叉搜索树：左子树都比根小、右子树都比根大，中序遍历（左、根、右）得到的就是有序序列；\nLRU 缓存：用“哈希表 + 双向链表”组合实现，哈希表负责 O(1) 找到节点，双向链表负责 O(1) 把节点挪到最前面、从末尾淘汰。'},
  {title:'最小栈：随时 O(1) 拿到最小值',body:'题目：设计一个栈，除了普通的入栈、出栈，还要能在 O(1) 时间内返回当前栈里的最小值。\n如果每次都扫描一遍找最小值，是 O(n)。巧妙的做法是再配一个“辅助栈”：每次入栈时，同时往辅助栈里压入“到目前为止的最小值”；出栈时两个栈一起弹出。这样辅助栈的栈顶永远是当前的最小值。',code:`type MinStack struct {
    data []int
    mins []int
}

func (s *MinStack) Push(x int) {
    s.data = append(s.data, x)
    if len(s.mins) == 0 || x < s.mins[len(s.mins)-1] {
        s.mins = append(s.mins, x)
    } else {
        s.mins = append(s.mins, s.mins[len(s.mins)-1])
    }
}

func (s *MinStack) Pop() {
    s.data = s.data[:len(s.data)-1]
    s.mins = s.mins[:len(s.mins)-1]
}

func (s *MinStack) Min() int {
    return s.mins[len(s.mins)-1]
}`,explain:[{at:'type MinStack struct {',text:'最小栈。'},{at:'data []int',text:'普通的栈，存放所有元素。'},{at:'mins []int',text:'辅助栈：第 i 个位置存的是“前 i+1 个元素里的最小值”。'},{at:'func (s *MinStack) Push(x int) {',to:'s.data = append(s.data, x)',text:'入栈：先放进普通栈。'},{at:'if len(s.mins) == 0 || x < s.mins[len(s.mins)-1] {',to:'s.mins = append(s.mins, x)',text:'如果辅助栈是空的，或者 x 比当前最小值还小，x 就是新的最小值。'},{at:'} else {',to:'s.mins = append(s.mins, s.mins[len(s.mins)-1])',text:'否则最小值不变，再压一次当前的最小值，保持两个栈一样高。'},{at:'func (s *MinStack) Pop() {',to:'s.mins = s.mins[:len(s.mins)-1]',text:'出栈：两个栈一起弹出。弹出后辅助栈顶自动变成之前的最小值。'},{at:'func (s *MinStack) Min() int {',to:'return s.mins[len(s.mins)-1]',text:'直接返回辅助栈顶，O(1)。'}]},
  {title:'反转单链表',body:'单链表的每个节点只知道下一个节点是谁。反转链表就是把所有的“指向下一个”都改成“指向上一个”。\n思路是从头到尾走一遍，用三个变量：prev（已经反转好的部分的头）、cur（当前节点）、next（先记住下一个节点，免得改了指针后找不到）。每一步把 cur 指向 prev，然后三个变量一起往前挪一位。时间 O(n)，空间 O(1)。',code:`type Node struct {
    Val  int
    Next *Node
}

func Reverse(head *Node) *Node {
    var prev *Node
    cur := head
    for cur != nil {
        next := cur.Next
        cur.Next = prev
        prev = cur
        cur = next
    }
    return prev
}`,explain:[{at:'type Node struct {',to:'Next *Node',text:'链表节点：一个值，和指向下一个节点的指针。'},{at:'func Reverse(head *Node) *Node {',text:'输入原链表的头，返回反转后的头。'},{at:'var prev *Node',text:'prev 一开始是 nil：原来的头节点反转后变成尾巴，要指向 nil。'},{at:'cur := head',text:'从头节点开始。'},{at:'for cur != nil {',text:'一直处理到链表末尾。'},{at:'next := cur.Next',text:'先记住下一个节点。'},{at:'cur.Next = prev',text:'把当前节点的指针掉头，指向前一个节点。'},{at:'prev = cur',to:'cur = next',text:'prev 和 cur 都往前挪一位。'},{at:'return prev',text:'循环结束时 cur 是 nil，prev 正好是原来的最后一个节点，也就是新的头。'}]},
  {title:'排序算法：快不快、稳不稳',body:'冒泡、选择、插入排序：都是 O(n²)，数据量大时很慢。但插入排序对“几乎已经排好序”的数据非常快，接近 O(n)，所以很多语言的标准库在数据量小时会改用它。\n快速排序：平均 O(n log n)，实际中通常最快；但如果每次选的基准值都很差（比如对已经有序的数组总选第一个元素），会退化成 O(n²)。\n归并排序：稳定的 O(n log n)，但需要 O(n) 的额外空间。\n堆排序：O(n log n)，不需要额外空间，但不稳定。\n“稳定”是指：排序后，值相等的元素保持原来的相对顺序。比如先按时间排好的订单，再按金额稳定排序，金额相同的订单仍然按时间先后排列。冒泡、插入、归并是稳定的；选择、快速、堆排序不稳定。Go 的 sort.SliceStable 和 slices.SortStableFunc 提供稳定排序。'},
  {title:'二分查找',body:'在一个有序数组里找一个数，最快的方法是二分查找：每次看中间那个数，比目标大就去左半边找，比目标小就去右半边找，每次排除一半，时间复杂度 O(log n)。\n有两个细节容易写错：\n一、中点要写成 l + (r-l)/2，而不是 (l+r)/2，后者在 l 和 r 都很大时，相加可能超出整数范围（溢出）；\n二、循环条件和边界要配套：这里用的是闭区间 [l, r]，所以循环条件是 l <= r，更新时是 m+1 和 m-1。',code:`func Binary(a []int, x int) int {
    l, r := 0, len(a)-1
    for l <= r {
        m := l + (r-l)/2
        if a[m] == x {
            return m
        }
        if a[m] < x {
            l = m + 1
        } else {
            r = m - 1
        }
    }
    return -1
}`,explain:[{at:'func Binary(a []int, x int) int {',text:'在有序数组 a 里找 x，找到返回下标，找不到返回 -1。'},{at:'l, r := 0, len(a)-1',text:'查找范围是闭区间 [l, r]，一开始是整个数组。'},{at:'for l <= r {',text:'范围里还有元素就继续。'},{at:'m := l + (r-l)/2',text:'取中点，这种写法不会溢出。'},{at:'if a[m] == x {',to:'return m',text:'正好找到。'},{at:'if a[m] < x {',to:'l = m + 1',text:'中间的数比目标小，目标只可能在右半边。'},{at:'} else {',to:'r = m - 1',text:'中间的数比目标大，去左半边找。'},{at:'return -1',text:'范围缩小到空了还没找到，说明不存在。'}]},
  {title:'一致性哈希：加机器时少搬家',body:'把数据分散到多台缓存服务器上，最简单的办法是 hash(key) % N：N 是机器数量。问题是 N 一变，几乎所有 key 算出来的机器都变了。比如从 3 台扩到 4 台，大约 75% 的 key 换了位置，缓存大面积失效，请求全部压到数据库上。\n一致性哈希的做法是：把哈希值的范围想象成一个首尾相连的圆环，机器和 key 都按哈希值放到环上，每个 key 顺时针找到的第一台机器就是它的归属。加一台机器时，只有新机器和它前一台机器之间那一段的 key 要搬到新机器上，其他 key 都不动，大约只迁移 1/N 的数据。\n为了让数据分布更均匀，通常给每台真实机器在环上放很多个“虚拟节点”。'},
  {title:'动手试试：取模和一致性哈希，各搬多少',body:'我们用 1 万个 key 做实验：分别用“取模”和“一致性哈希（每台机器 100 个虚拟节点）”分配到 3 台机器上，再扩到 4 台，统计有多少 key 换了机器。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 ring.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python ring.py（Mac 用 python3 ring.py），对照下面的输出。','把 4 台改成 10 台（在两个地方都加上更多机器），看看两种方法换机器的比例分别变成多少。'],expect:'取模：3 台变 4 台，74% 的 key 换了机器\n一致性哈希：3 台变 4 台，24% 的 key 换了机器'},code:`import bisect
import hashlib

def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(), 16)

keys = [f"user:{i}" for i in range(10000)]

def by_mod(n):
    return {k: h(k) % n for k in keys}

before, after = by_mod(3), by_mod(4)
moved = sum(before[k] != after[k] for k in keys)
print(f"取模：3 台变 4 台，{moved * 100 // len(keys)}% 的 key 换了机器")

def ring(nodes, replicas=100):
    points = sorted((h(f"{n}#{i}"), n) for n in nodes for i in range(replicas))
    hashes = [p for p, _ in points]
    def locate(key):
        i = bisect.bisect(hashes, h(key)) % len(points)
        return points[i][1]
    return locate

r3, r4 = ring(["A", "B", "C"]), ring(["A", "B", "C", "D"])
moved = sum(r3(k) != r4(k) for k in keys)
print(f"一致性哈希：3 台变 4 台，{moved * 100 // len(keys)}% 的 key 换了机器")`,explain:[{at:'import bisect',text:'bisect 提供在有序列表里二分查找的函数。'},{at:'import hashlib',text:'用 md5 计算哈希值。'},{at:'def h(s):',to:'return int(hashlib.md5(s.encode()).hexdigest(), 16)',text:'把字符串算成一个很大的整数哈希值。'},{at:'keys = [f"user:{i}" for i in range(10000)]',text:'1 万个 key：user:0 到 user:9999。'},{at:'def by_mod(n):',to:'return {k: h(k) % n for k in keys}',text:'取模分配：每个 key 去第 hash % n 台机器。'},{at:'before, after = by_mod(3), by_mod(4)',text:'分别算出 3 台和 4 台时每个 key 的归属。'},{at:'moved = sum(before[k] != after[k] for k in keys)',text:'数一数有多少 key 换了机器。'},{at:'print(f"取模：3 台变 4 台',text:'换算成百分比打印，大约 3/4 的 key 都要搬家。'},{at:'def ring(nodes, replicas=100):',text:'构造一致性哈希环，每台机器放 100 个虚拟节点。'},{at:'points = sorted((h(f"{n}#{i}"), n) for n in nodes for i in range(replicas))',text:'给每台机器的每个虚拟节点（比如 A#0、A#1……）算一个哈希值，作为它在环上的位置，并排好序。'},{at:'hashes = [p for p, _ in points]',text:'单独取出所有位置，方便二分查找。'},{at:'def locate(key):',text:'查找一个 key 属于哪台机器。'},{at:'i = bisect.bisect(hashes, h(key)) % len(points)',text:'在环上找到 key 的哈希值之后的第一个虚拟节点。% len(points) 让找过头时绕回环的开头。'},{at:'return points[i][1]',text:'返回这个虚拟节点所属的真实机器。'},{at:'return locate',text:'ring 返回这个查找函数。'},{at:'r3, r4 = ring(["A", "B", "C"]), ring(["A", "B", "C", "D"])',text:'分别构造 3 台和 4 台机器的环。'},{at:'moved = sum(r3(k) != r4(k) for k in keys)',text:'同样统计换了机器的 key 数量。'},{at:'print(f"一致性哈希：3 台变 4 台',text:'只有约 1/4 的 key 搬到了新机器 D 上，正好是新机器应该分担的那部分，其他 key 原地不动。'}]}
 ],quiz:[
  {id:'be-algo-1',q:'订单系统要支持微信、支付宝、银行卡多种支付，以后还会增加。最合适的设计模式是？',options:['单例模式','策略模式','观察者模式','原型模式'],why:['单例只保证全局一个实例，不解决多种实现的切换。','','观察者用于事件通知，一个事件通知多个订阅者。','原型模式通过复制已有对象创建新对象。'],answer:1,explain:'把支付行为抽象成接口，各渠道分别实现；订单流程只依赖接口，新增渠道无需修改调用方，符合开闭原则。',interview:'q-e5ca6c952345f596'},
  {id:'be-algo-2',q:'Go 中实现线程安全的懒加载单例，最推荐的写法是？',options:['不加锁的双重检查','sync.Once','每次调用都新建实例','init 函数里直接初始化'],why:['不使用原子操作的双重检查存在数据竞争。','','每次新建就不是单例了。','init 在包加载时就执行，做不到“用到时才初始化”的懒加载。'],answer:1,explain:'once.Do 保证初始化函数只执行一次，并发调用者会等它完成。',interview:'q-6a1455420566ee2f'},
  {id:'be-algo-3',type:'judge',q:'HTTP 中间件（日志、鉴权、限流层层包裹 handler）是装饰器模式的典型应用。',answer:true,explain:'装饰器保持原接口，在调用前后增加功能，可以层层组合；注意组合顺序会影响语义。',interview:'q-5965ea1a549e9829'},
  {id:'be-algo-4',q:'在一个有序数组里查找一个数，最好的时间复杂度是？',options:['O(1)','O(log n)','O(n)','O(n log n)'],why:['O(1) 需要能直接定位，比如哈希表或已知下标。','','O(n) 是顺序查找，没有利用数组有序的特点。','O(n log n) 是排序的复杂度，比查找还慢。'],answer:1,explain:'二分查找每次排除一半，O(log n)。',interview:'q-d8f795112d612596'},
  {id:'be-algo-5',type:'multi',q:'下面哪些排序算法是稳定的（相等元素的相对顺序不变）？（多选）',options:['快速排序（常规实现）','插入排序','选择排序（常规交换实现）','归并排序'],why:['快速排序在划分时会交换元素，可能改变相等元素的相对顺序，一般不稳定。','','选择排序把最小值和区间首元素交换，可能让相等元素跨越彼此，不稳定。',''],answers:[1,3],explain:'插入排序和归并排序（合并时相等取左边）是稳定的；快速排序、选择排序、堆排序一般不稳定。',interview:'q-d7c77c0dfce33a1a'},
  {id:'be-algo-6',q:'实现 LRU 缓存，要求 Get 和 Put 都是 O(1)，应该用？',options:['普通的动态数组','哈希表 + 双向链表','单向的先进先出队列','平衡的二叉搜索树'],why:['数组移动元素是 O(n)。','','单向队列无法 O(1) 把中间的元素移到头部。','二叉搜索树的操作是 O(log n)，也无法维护访问顺序。'],answer:1,explain:'哈希表 O(1) 定位节点，双向链表 O(1) 移动到头部和删除尾部。',interview:'q-ed48de08e02103b9'},
  {id:'be-algo-7',type:'fill',q:'从海量数据中找出最大的 K 个元素（Top K 问题），通常维护一个容量为 K 的 ____ 堆。',accepted:['小顶','最小','小根','小顶堆','最小堆','小根堆','min-heap'],explain:'堆顶是当前前 K 大里最小的那个，新元素比堆顶大就替换堆顶并下沉调整，时间复杂度 O(N log K)。',interview:'q-6034c887d767799b'},
  {id:'be-algo-8',q:'分布式缓存从 3 台扩到 4 台，用 hash(key) % N 分配会导致大部分 key 换了位置。用什么能只迁移一小部分？',options:['随机分配到某台机器','一致性哈希加虚拟节点','按 key 的长度分配','扩容后全部重新加载'],why:['随机分配无法在读取时找回 key 所在的机器。','','按长度分配不均匀，扩容时同样要大量迁移。','全部重新加载会让缓存瞬间失效，大量请求打到数据库。'],answer:1,explain:'一致性哈希中新节点只接管环上相邻的一段数据；虚拟节点让负载更均匀。',interview:'q-38541cc7f4c6e66a'},
  {id:'be-algo-9',q:'切片 append 偶尔会触发 O(n) 的扩容复制，但我们常说它是 O(1)，这是哪种复杂度？',options:['最好情况复杂度','最坏情况复杂度','摊还（均摊）复杂度','空间复杂度'],why:['最好情况只看最理想的那一次，不能概括整体。','最坏情况是扩容那次的 O(n)。','','这里讨论的是时间开销，不是占用的空间。'],answer:2,explain:'扩容按倍数增长，把偶尔的 O(n) 复制平摊到每次操作上，平均是 O(1)。',interview:'q-7934b553b7e39e8d'},
  {id:'be-algo-10',type:'code',q:'写一个反转单链表的函数（Go、Python、Java、JS/TS、Rust 任选，Go 签名为 Reverse(head *Node) *Node）。',reference:'type Node struct {\n    Val  int\n    Next *Node\n}\n\nfunc Reverse(head *Node) *Node {\n    var prev *Node\n    for cur := head; cur != nil; {\n        next := cur.Next\n        cur.Next = prev\n        prev = cur\n        cur = next\n    }\n    return prev\n}',points:['用 prev、cur、next 三个指针','先保存 next 再改指向','循环结束返回 prev','空链表返回空'],explain:'时间 O(n)，空间 O(1)；也可以用递归，但递归栈是 O(n)。',interview:'q-b13c09da3854131b'},
 ]},
 {id:'be-tx',title:'事务、隔离级别与锁',summary:'隔离级别、MVCC、各种锁和幻读，日志先认识一下',lessons:[
  {title:'这一关学什么：多人同时改数据，怎么不乱',body:'数据库同时服务着成百上千个请求，它们会同时读写同一批数据。如果不加控制，就会出现各种奇怪的问题：钱扣了一半、读到别人还没确认的数据、同一个查询两次结果不一样。\n这一关讲数据库怎么解决这些问题：\n一、事务和它的四个特性（ACID）；\n二、四种隔离级别，以及 InnoDB 用 MVCC 实现的“快照读”；\n三、InnoDB 的各种锁：共享锁、排他锁、记录锁、间隙锁、临键锁，以及死锁；\n四、先认识一下 redo log、undo log、binlog 这三种日志，以及主从复制和分库分表。下一关“MySQL 日志”会讲得更深入。'},
  {title:'事务：一组操作要么全做，要么全不做',body:'事务是把几条 SQL 打包成一个整体。经典例子是转账：A 扣 100 元、B 加 100 元，这两步必须同时成功，或者同时失败。\n事务有四个特性，简称 ACID：\nA 原子性：要么全部成功，要么全部撤销，不会只做一半；\nC 一致性：事务前后数据都满足规则，比如转账前后总金额不变、余额不能为负；\nI 隔离性：多个事务同时进行时，互相之间的影响被控制在一定范围内；\nD 持久性：事务一旦提交，即使马上断电，数据也不会丢。\n用 BEGIN 开始事务，COMMIT 提交让修改生效，ROLLBACK 回滚撤销所有修改。',code:`BEGIN;
UPDATE account SET balance = balance - 100 WHERE name = 'A';
UPDATE account SET balance = balance + 100 WHERE name = 'B';
COMMIT;`,explain:[{at:'BEGIN;',text:'开始一个事务。'},{at:'UPDATE account SET balance = balance - 100 WHERE name = \'A\';',text:'A 扣 100。此时别的事务还看不到这个修改（具体看隔离级别）。'},{at:'UPDATE account SET balance = balance + 100 WHERE name = \'B\';',text:'B 加 100。如果这一步失败，应该执行 ROLLBACK，把 A 的扣款也撤销。'},{at:'COMMIT;',text:'提交：两步修改一起生效，并且持久保存。'}]},
  {title:'动手试试：转账失败时自动回滚',body:'我们用 Python 自带的 SQLite 模拟转账。表上加了一条规则“余额不能小于 0”。转 30 元会成功；转 500 元时，扣款违反了规则，整个事务回滚，连已经执行的“加钱”也会被撤销。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 transfer.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python transfer.py（Mac 用 python3 transfer.py），对照下面的输出。','把 transfer 里两条 UPDATE 的顺序交换一下，再运行，看看结果有没有变化，想想这说明了什么。'],expect:'转账 30 成功\n{\'小明\': 70, \'小红\': 30}\n转账 500 失败，已回滚\n{\'小明\': 70, \'小红\': 30}'},code:`import sqlite3

db = sqlite3.connect(":memory:", isolation_level=None)
db.execute("CREATE TABLE account (name TEXT PRIMARY KEY, balance INTEGER CHECK (balance >= 0))")
db.execute("INSERT INTO account VALUES ('小明', 100), ('小红', 0)")

def transfer(src, dst, amount):
    try:
        db.execute("BEGIN")
        db.execute("UPDATE account SET balance = balance + ? WHERE name = ?", (amount, dst))
        db.execute("UPDATE account SET balance = balance - ? WHERE name = ?", (amount, src))
        db.execute("COMMIT")
        print(f"转账 {amount} 成功")
    except sqlite3.IntegrityError:
        db.execute("ROLLBACK")
        print(f"转账 {amount} 失败，已回滚")

def show():
    print(dict(db.execute("SELECT name, balance FROM account ORDER BY name")))

transfer("小明", "小红", 30)
show()
transfer("小明", "小红", 500)
show()`,explain:[{at:'import sqlite3',text:'导入 Python 自带的 SQLite 模块。'},{at:'db = sqlite3.connect(":memory:", isolation_level=None)',text:'创建内存数据库。isolation_level=None 表示由我们自己写 BEGIN、COMMIT 来控制事务。'},{at:'db.execute("CREATE TABLE account',text:'建账户表。CHECK (balance >= 0) 是一条规则：余额不能为负，违反时数据库会报错。'},{at:'db.execute("INSERT INTO account VALUES',text:'小明有 100 元，小红有 0 元。'},{at:'def transfer(src, dst, amount):',text:'转账函数：从 src 转 amount 元给 dst。'},{at:'try:',to:'db.execute("BEGIN")',text:'开始事务。'},{at:'db.execute("UPDATE account SET balance = balance + ?',text:'先给收款人加钱。? 是占位符，后面元组里的值会安全地填进去，防止 SQL 注入。'},{at:'db.execute("UPDATE account SET balance = balance - ?',text:'再给付款人扣钱。转 500 时小明的余额会变成 -400，违反规则，这里抛出 IntegrityError。'},{at:'db.execute("COMMIT")',to:'print(f"转账 {amount} 成功")',text:'两步都成功就提交。'},{at:'except sqlite3.IntegrityError:',to:'print(f"转账 {amount} 失败，已回滚")',text:'违反规则时回滚：已经执行的“给小红加 500”也被撤销，这就是原子性。'},{at:'def show():',to:'print(dict(db.execute("SELECT name, balance FROM account ORDER BY name")))',text:'把每个人的余额查出来，转成字典打印。'},{at:'transfer("小明", "小红", 30)',to:'show()',text:'第一次转 30，成功：小明 70，小红 30。'},{at:'transfer("小明", "小红", 500)',text:'第二次转 500，失败回滚。'},{at:'show()',text:'余额和失败前完全一样，没有出现“小红多了 500、小明没扣”的情况。'}]},
  {title:'并发事务的三种问题和四种隔离级别',body:'多个事务同时运行时，可能出现三种读数据的问题：\n脏读：读到了别的事务还没提交的修改，如果对方最后回滚了，你读到的就是根本不存在的数据；\n不可重复读：同一个事务里两次读同一行，中间别人提交了修改，两次结果不一样；\n幻读：同一个事务里两次按同样的条件查询，中间别人插入了新行，第二次多出了“幻影”行。\nSQL 标准定义了四种隔离级别，越往下越严格，并发性能也越差：\n读未提交：三种问题都可能出现；\n读已提交：不会脏读，每条语句都看最新已提交的数据；\n可重复读：InnoDB 的默认级别，普通查询在整个事务里看的都是同一张“快照”，同一行读多少次都一样；\n可串行化：完全排队执行，最安全也最慢。'},
  {title:'MVCC：每个人看到自己的那张快照',body:'InnoDB 用 MVCC（多版本并发控制）来实现读已提交和可重复读，让读和写互不阻塞。\n原理是：每一行数据被修改时，旧版本不会马上丢掉，而是记在 undo log 里，新旧版本串成一条“版本链”。事务做普通查询时，会生成一个“读视图”，记录此刻哪些事务已经提交了，然后沿着版本链找到自己“应该看到”的那个版本。\n在可重复读级别下，读视图在事务里第一次查询时生成，之后一直用同一个，所以整个事务看到的是同一张快照：别的事务后来提交的修改，这个事务里的普通 SELECT 都看不到。读已提交级别则是每条语句都生成一个新的读视图。\n这种基于快照的普通 SELECT 叫“快照读”，不加锁。'},
  {title:'当前读：读最新的数据，并且加锁',body:'和快照读相对的是“当前读”：读取最新的已提交版本，并且给读到的数据加锁，防止别人在你处理期间修改。下面这些语句都是当前读：\nSELECT ... FOR UPDATE：加排他锁；\nSELECT ... FOR SHARE（老版本写作 LOCK IN SHARE MODE）：加共享锁；\nUPDATE、DELETE、INSERT：修改前要先读到最新的数据并加锁。\n典型用法是“先查再改”：比如扣库存时，先用 SELECT ... FOR UPDATE 锁住这一行，判断库存够不够，再 UPDATE。在提交之前，别的事务想修改这一行都要等着。',code:`BEGIN;
SELECT stock FROM goods WHERE id = 1 FOR UPDATE;
UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0;
COMMIT;`,explain:[{at:'BEGIN;',text:'开始事务。'},{at:'SELECT stock FROM goods WHERE id = 1 FOR UPDATE;',text:'当前读：读最新的库存，并对这一行加排他锁，别的事务要改这一行必须等我提交。'},{at:'UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0;',text:'扣减库存。条件里再加上 stock > 0 作为保险，防止扣成负数。'},{at:'COMMIT;',text:'提交后释放锁。'}]},
  {title:'共享锁、排他锁和意向锁',body:'InnoDB 的行锁主要有两种：\n共享锁（S 锁）：读锁。多个事务可以同时持有同一行的共享锁，一起读，但谁都不能改；\n排他锁（X 锁）：写锁。一个事务持有后，别的事务既不能再加共享锁，也不能加排他锁，只能等它提交。\n还有一种表级的“意向锁”：事务给某一行加锁之前，会先在整张表上挂一个“意向锁”标记，表示“这张表里有行被锁了”。这样当有人想锁整张表时，只要看一眼这个标记就知道能不能锁，不用一行行去检查。意向锁之间互不冲突，只和表级锁冲突。'},
  {title:'记录锁、间隙锁和临键锁',body:'InnoDB 的行锁其实是加在索引记录上的，按锁住的范围分三种：\n记录锁：锁住索引上的某一条记录；\n间隙锁：锁住两条索引记录之间的“空隙”，不锁记录本身，作用是防止别的事务往这个空隙里插入新行；\n临键锁（Next-Key Lock）：记录锁加上这条记录前面的间隙，是可重复读级别下默认的加锁方式。\n间隙锁和临键锁就是用来防止“幻读”的：当前读锁住了一个范围后，别人插不进新行，同样的条件再查一次，就不会多出幻影行。\n比如 age 上有索引，现有 20、30 两个值，执行 SELECT * FROM users WHERE age > 25 FOR UPDATE，就会锁住 20 到 30 之间、30 之后的间隙，别的事务此时插入 age = 28 的行会被阻塞。'},
  {title:'更新条件没有索引：几乎锁住整张表',body:'因为行锁是加在索引上的，如果 UPDATE 或 DELETE 的条件列上没有索引，InnoDB 只能扫描整个聚集索引去找符合条件的行，而在可重复读级别下，扫描过的每一条记录和间隙都会被加锁。\n结果就是：虽然只想更新几行，实际上几乎锁住了整张表，其他事务对这张表的写入全都要等待，线上会表现为大量请求卡住、超时。\n所以经常作为更新条件的列，一定要建索引；执行大批量更新前，先用 EXPLAIN 确认能用上索引。',code:`UPDATE orders SET status = 1 WHERE remark = 'x';

ALTER TABLE orders ADD INDEX idx_remark (remark);`,explain:[{at:'UPDATE orders SET status = 1 WHERE remark = \'x\';',text:'remark 上没有索引：要扫描全表，并在可重复读级别下锁住扫描到的所有记录和间隙，效果接近锁表。'},{at:'ALTER TABLE orders ADD INDEX idx_remark (remark);',text:'给 remark 建索引后，只会锁住符合条件的那些记录和附近的间隙。'}]},
  {title:'死锁：两个事务互相等对方',body:'死锁的典型场景：事务 1 锁住了 A 行，接着想锁 B 行；事务 2 锁住了 B 行，接着想锁 A 行。两个事务都在等对方先释放，谁也动不了。\nInnoDB 会自动检测死锁：发现等待关系形成了一个环，就选一个“代价较小”的事务（通常是修改行数少的那个）回滚掉，让另一个继续执行。被回滚的事务会收到死锁错误（错误码 1213），应用程序应该捕获这个错误并重试整个事务。\n开发上减少死锁的办法：\n一、多个事务按相同的顺序访问数据，比如批量更新时先按 id 排好序；\n二、事务尽量小、尽量短，别在事务里做网络调用这类耗时的事；\n三、给更新条件建好索引，减少锁住的范围；\n四、用 SHOW ENGINE INNODB STATUS 查看最近一次死锁的详细信息，分析是哪两条 SQL 冲突了。'},
  {title:'先认识三种日志',body:'MySQL 里有三种和事务关系最紧密的日志，下一关会细讲，这里先建立印象：\nredo log（重做日志）：InnoDB 的物理日志，记录“某个数据页改成了什么”。修改数据时先写 redo log，数据页稍后再慢慢写回磁盘。突然断电重启后，靠它把已经提交、但还没写进数据页的修改恢复回来，保证持久性；\nundo log（回滚日志）：记录修改前的旧值，用来回滚事务，也是 MVCC 版本链的来源；\nbinlog（二进制日志）：MySQL Server 层写的逻辑日志，记录执行了哪些修改，用于主从复制和按时间点恢复数据。注意它不是 InnoDB 写的，任何存储引擎都会有。\nredo log 和 binlog 通过“两阶段提交”保持一致。强持久性的场景常用“双 1”配置：innodb_flush_log_at_trx_commit=1（每次提交都把 redo log 刷到磁盘）和 sync_binlog=1（每次提交都把 binlog 刷到磁盘）。'},
  {title:'读写分离的坑：刚写完就读不到',body:'为了分担压力，很多系统会做读写分离：写操作走主库，读操作走从库。主库把 binlog 发给从库，从库重放这些修改。\n但这个复制通常是异步的，从库会比主库慢一点点，叫“复制延迟”，平时可能是几毫秒，压力大时可能是几秒。\n于是会出现这种问题：用户刚下完单，马上跳转到订单详情页，详情查询走了从库，从库还没收到这条订单，显示“订单不存在”。\n处理方法：对“刚写完马上要读”的请求，强制走主库读，比如写操作后的几秒内，这个用户的读请求都走主库；或者在业务上把刚写入的结果直接返回给前端展示，不再去查一次。'},
  {title:'分库分表：分片键怎么选',body:'当一张表的数据量或访问量大到一个数据库扛不住时，才考虑分库分表：把数据按某个字段（分片键）拆到多个库、多张表里。\n分片键的选择最关键，要满足：\n一、大部分查询都会带上它，这样查询能直接定位到某一个分片；\n二、数据分布均匀，不会让某个分片特别大、特别忙；\n三、值不会改变，否则数据要在分片之间搬家。\n比如订单表按 user_id 分片，用户查“我的订单”时直接定位到一个分片，很快。但商家要按 shop_id 查自己店铺的所有订单时，不带 user_id，只能查遍所有分片。常见解决办法是：再按 shop_id 维护一份冗余的订单数据（异构表），或者把订单同步到 Elasticsearch 这类搜索引擎里查。\n分库分表后，各个分片自增的 id 会重复，需要全局唯一 ID，常用号段模式或雪花算法生成。'}
 ],quiz:[
  {id:'be-tx-1',q:'InnoDB 默认隔离级别下，同一事务里两次普通 SELECT 之间，别的事务提交了修改。第二次 SELECT 看到的是？',options:['别的事务最新提交的数据','和第一次一样的快照数据','查询会因为数据冲突而报错','返回空结果，数据被锁定'],why:['读到最新提交的数据是读已提交（RC）的行为。','','快照读不会因为别的事务提交而报错。','数据没有被删除，不会返回空结果。'],answer:1,explain:'可重复读级别下，普通查询复用事务第一次一致性读时建立的快照。',interview:'q-4e7895e6f2331baa'},
  {id:'be-tx-2',type:'multi',q:'下面哪些语句是“当前读”，会读最新数据并加锁？（多选）',options:['SELECT ... FOR UPDATE','普通的 SELECT ... WHERE 查询','UPDATE ... WHERE ...','SELECT ... FOR SHARE'],why:['','普通 SELECT 是快照读，读历史版本，不加行锁。','',''],answers:[0,2,3],explain:'普通 SELECT 是快照读，不加行锁；加锁读和修改语句都是当前读。',interview:'q-6eddf08403456b92'},
  {id:'be-tx-3',q:'UPDATE orders SET status=1 WHERE remark=\'x\'，remark 上没有索引。在可重复读级别下会怎样？',options:['只锁住匹配的那一行记录','扫描时锁住大量记录和间隙','这条语句不会加任何锁','InnoDB 会自动为 remark 建索引'],why:['没有索引时要扫描整个聚集索引，扫描过的记录都会被加锁。','','UPDATE 是当前读，一定会加锁。','数据库不会自动创建索引。'],answer:1,explain:'InnoDB 按实际访问的索引记录加锁，没有索引时效果接近锁表，其他事务的写入都会等待。应给过滤条件建索引。',interview:'q-38fbf93f4a3999f5'},
  {id:'be-tx-4',q:'间隙锁的主要作用是？',options:['锁住整张表，禁止所有读写','阻止向范围内插入，防止幻读','加快范围查询的执行速度','只锁住某一条具体的记录'],why:['间隙锁只锁住记录之间的空隙，不是表锁。','','加锁是为了正确性，不会让查询变快。','锁住单条记录的是记录锁。'],answer:1,explain:'间隙锁锁的是记录之间的空隙；临键锁 = 记录锁 + 前面的间隙。',interview:'q-eeb2b187b632bc0c'},
  {id:'be-tx-5',type:'judge',q:'redo log 和 binlog 都是 InnoDB 存储引擎写的。',answer:false,explain:'redo log 属于 InnoDB；binlog 属于 MySQL Server 层，所有引擎都可以使用。',interview:'q-f53de83dacee392c'},
  {id:'be-tx-6',q:'服务器突然断电，重启后 MySQL 是靠哪个日志把已提交但还没写到数据页的修改恢复回来的？',options:['binlog','redo log','undo log','慢查询日志'],why:['binlog 用于复制和时间点恢复，不负责把数据页恢复到崩溃前的状态。','','undo log 用于回滚未提交的事务。','慢查询日志只记录执行慢的 SQL。'],answer:1,explain:'redo log 记录数据页的修改，崩溃恢复时重放；undo log 用于回滚未提交的事务。',interview:'q-f53de83dacee392c'},
  {id:'be-tx-7',type:'fill',q:'强持久性场景常用“双 1”配置：innodb_flush_log_at_trx_commit=1 和 ____=1。',accepted:['sync_binlog'],explain:'sync_binlog=1 表示每个提交组都同步 binlog 到磁盘，配合 redo 每次提交刷盘。',interview:'q-51bd3b77aa3fb0b1'},
  {id:'be-tx-8',q:'用户下单后立刻查看订单详情，有时显示“订单不存在”。系统使用了读写分离。最可能的原因和处理是？',options:['数据库丢失了刚写入的数据','主从延迟，读到了未同步的从库','缓存中的旧数据还没有过期','网络抖动导致请求丢失'],why:['数据已经写入主库，稍后就能在从库查到，并没有丢失。','','题目中没有缓存，而且“不存在”说明读的是还没同步的数据源。','网络问题会导致请求失败，而不是返回“不存在”。'],answer:1,explain:'异步复制必然有延迟，写后立即读的请求要走主库，或等待从库追上指定位置。',interview:'q-8eed302c69b3eb2e'},
  {id:'be-tx-9',q:'订单表按 user_id 分片后，商家要按 shop_id 查自己的所有订单。最合适的方案是？',options:['每次查询所有分片再合并结果','建 shop_id 冗余表或同步 ES','把分片键改成按 shop_id 分片','不支持商家按店铺查询订单'],why:['每次全分片扫描，分片越多越慢，代价太高。','','改分片键会让用户按 user_id 查询变成全分片扫描。','这是商家的核心需求，不能不支持。'],answer:1,explain:'不带分片键的查询，要么建另一个维度的冗余数据，要么借助搜索引擎，避免每次全分片扫描。',interview:'q-cd319686c5f3c235'},
  {id:'be-tx-10',type:'short',q:'两个事务互相等待对方持有的锁，发生了死锁。InnoDB 会怎么处理？开发上如何减少死锁？',reference:'InnoDB 有死锁检测，发现等待环后会选择代价较小的事务回滚，另一个继续执行，被回滚的事务收到死锁错误。减少死锁：缩短事务，避免在事务里做网络调用；多个事务按相同的顺序访问资源（比如按主键从小到大更新）；给更新条件建合适的索引，减少锁住的范围；控制单次更新的行数；对死锁错误做有限次的重试。',points:['死锁检测并回滚一个事务','缩短事务','统一加锁顺序','合适的索引减少锁范围','有限次重试'],explain:'死锁无法完全避免，但可以让它很少发生，并能安全重试。',interview:'q-eeb2b187b632bc0c'},
 ]},
 {id:'be-redis',title:'Redis 与缓存设计',summary:'持久化、过期与淘汰、缓存三大问题、一致性和高可用',lessons:[
  {title:'这一关学什么：用 Redis 给数据库挡在前面',body:'数据库的数据在磁盘上，扛不住每秒几万次的查询。最常见的做法是在数据库前面加一层缓存：把经常读的数据放在内存里，大部分请求直接从缓存拿，不用去查数据库。Redis 就是最常用的缓存。\n这一关讲：\n一、Redis 是什么、有哪些数据类型；\n二、它怎么把内存里的数据保存到磁盘（持久化）；\n三、过期的 key 怎么删、内存满了淘汰谁；\n四、缓存最经典的三大问题：穿透、击穿、雪崩；\n五、缓存和数据库的一致性、高可用方案，以及分布式锁。'},
  {title:'Redis 是什么',body:'Redis 是一个把数据放在内存里的键值数据库：每条数据都有一个名字（key），通过 key 存取对应的值（value）。因为数据在内存里，读写一次通常不到 1 毫秒，单台每秒能处理十万次左右的请求。\n它执行命令是单线程的：所有命令排成一队，一条条执行。好处是不用加锁，每条命令都是原子的；坏处是只要有一条命令执行得慢（比如一次删除几百万个元素），后面所有命令都要等着，整个 Redis 就卡住了。\nRedis 也能把数据保存到磁盘，重启后恢复，但它最主要的用途还是做缓存，配合数据库一起使用。'},
  {title:'五种常用的数据类型',body:'Redis 的 value 不只是字符串，常用的有五种：\nString（字符串）：最基本的类型，可以存文本、数字、序列化后的对象。数字可以直接用 INCR 原子加一，常用来做计数器；\nHash（哈希）：一个 key 下面存多个“字段 → 值”，适合存一个对象的各个属性；\nList（列表）：按插入顺序排列，可以从两头放入、取出，能做简单的队列；\nSet（集合）：不重复的元素集合，可以求交集、并集，比如共同好友；\nZSet（有序集合）：每个元素带一个分数，按分数排序，最适合做排行榜。\n每个 key 都可以用 EXPIRE 设置过期时间，到期后自动失效。',code:`SET user:1:name "小明"
INCR page:views
HSET user:1 name "小明" age 18
LPUSH tasks "发邮件"
SADD tags:go "并发" "后端"
ZADD rank 95 "小明" 88 "小红"
ZREVRANGE rank 0 2 WITHSCORES
EXPIRE user:1:name 60`,explain:[{at:'SET user:1:name "小明"',text:'String：存一个字符串。key 的名字习惯用冒号分层，比如“对象类型:id:字段”。'},{at:'INCR page:views',text:'把数字加一并返回新值，是原子操作，适合做访问计数。'},{at:'HSET user:1 name "小明" age 18',text:'Hash：在 user:1 下面存 name 和 age 两个字段。'},{at:'LPUSH tasks "发邮件"',text:'List：从左边放入一个任务，另一端可以用 RPOP 取出，就是一个简单的队列。'},{at:'SADD tags:go "并发" "后端"',text:'Set：添加两个不重复的标签。'},{at:'ZADD rank 95 "小明" 88 "小红"',text:'ZSet：添加两个成员，分数分别是 95 和 88。'},{at:'ZREVRANGE rank 0 2 WITHSCORES',text:'按分数从高到低取前 3 名，带上分数，排行榜就这么实现。'},{at:'EXPIRE user:1:name 60',text:'让这个 key 60 秒后过期。'}]},
  {title:'动手试试：用 Docker 跑一个 Redis',body:'最省事的安装方式是用 Docker（一个可以一键运行各种软件的工具）。如果你还没装 Docker，可以先跳过这张卡片，或者让 AI 老师一步步教你安装。装好后，按下面的步骤启动 Redis，再进入 redis-cli（Redis 自带的命令行客户端）敲几条命令。',practice:{steps:['安装 Docker Desktop（docker.com 下载），安装后打开它，等它显示正在运行。','打开终端，运行 docker run -d --name my-redis -p 6379:6379 redis，第一次会自动下载 Redis。','运行 docker exec -it my-redis redis-cli，看到 127.0.0.1:6379> 提示符就说明连上了。','依次输入下面的命令，每输入一条按一次回车，对照下面的输出。','输完后过 10 秒再输入 GET code，看看会得到什么。用完输入 exit 退出，docker stop my-redis 停掉 Redis。'],expect:'127.0.0.1:6379> SET code 1234 EX 10\nOK\n127.0.0.1:6379> GET code\n"1234"\n127.0.0.1:6379> TTL code\n(integer) 7\n127.0.0.1:6379> INCR views\n(integer) 1\n127.0.0.1:6379> INCRBY views 5\n(integer) 6'},code:`SET code 1234 EX 10
GET code
TTL code
INCR views
INCRBY views 5`,explain:[{at:'SET code 1234 EX 10',text:'存一个验证码 1234，EX 10 表示 10 秒后过期。'},{at:'GET code',text:'读出验证码。'},{at:'TTL code',text:'查看还剩几秒过期，你看到的数字取决于输入有多快。过期后会返回 -2。'},{at:'INCR views',text:'views 不存在时当作 0，加一后返回 1。'},{at:'INCRBY views 5',text:'一次加 5，返回 6。多个客户端同时执行 INCR、INCRBY 也不会丢失更新。'}]},
  {title:'持久化一：RDB 快照',body:'Redis 的数据在内存里，进程重启就没了。持久化就是把数据保存到磁盘上，重启时再加载回来。有两种方式。\nRDB：每隔一段时间，把内存里的全部数据拍一张“快照”，存成一个紧凑的二进制文件。执行 BGSAVE 时，Redis 会 fork（复制）出一个子进程去写文件，主进程继续处理请求，互不影响。\n优点：文件小，重启时加载很快，也方便拿去做备份。\n缺点：两次快照之间的修改，如果遇到宕机就丢了。比如每 5 分钟拍一次，最多可能丢 5 分钟的数据。另外，数据量很大时，fork 子进程本身也会让主进程短暂卡一下。'},
  {title:'持久化二：AOF 日志，以及混合使用',body:'AOF（追加日志）：把每一条写命令都追加记录到一个文件里，重启时从头到尾重新执行一遍，就恢复出了数据。\n写到磁盘的时机由 appendfsync 控制：always 每条命令都刷盘，最安全但最慢；everysec 每秒刷一次，最多丢约 1 秒的数据，是最常用的折中；no 交给操作系统决定。\nAOF 文件会越来越大（同一个 key 改了一万次就记了一万条），所以 Redis 会定期“重写”：根据当前的数据生成一份最精简的命令集合，替换掉旧文件。\n实际生产中常用混合持久化（Redis 4.0 起支持）：AOF 重写时，文件开头直接写一份 RDB 格式的全量数据，后面再追加增量的命令。这样既能像 RDB 一样快速加载，又能像 AOF everysec 一样最多只丢 1 秒的数据。\n另外要记住：主从复制不能代替备份。误删了数据，删除操作也会立刻同步到从库，只有定期的 RDB 备份文件才能救回来。'},
  {title:'过期的 key 是怎么删除的',body:'给 key 设置了过期时间，到期之后它并不一定会马上从内存里消失。Redis 用两种方式配合删除：\n一、惰性删除：每次访问一个 key 时，先检查它是否过期，过期了就当场删掉，并返回“不存在”。所以过期的 key 你永远读不到；\n二、定期删除：后台每秒若干次，随机抽查一批设置了过期时间的 key，把其中已经过期的删掉。如果抽到的过期比例很高，就接着再抽一批。\n为什么不到期就立刻删？因为要给每个 key 都安排一个精确的定时器，代价太大。这种“惰性 + 定期抽查”的方式，用很少的 CPU 就能把大部分过期 key 清理掉。代价是：一些很久没人访问、又一直没被抽到的过期 key，会多占一段时间内存。'},
  {title:'内存满了：淘汰策略',body:'用 maxmemory 给 Redis 设置一个内存上限。达到上限后再写入新数据，就按 maxmemory-policy（淘汰策略）处理：\nnoeviction：不淘汰任何数据，新的写入命令直接报错（读命令照常）。这是默认策略，适合不能丢数据的场景，做缓存时通常不用它；\nallkeys-lru：在所有 key 里，淘汰最久没被访问过的；\nallkeys-lfu：在所有 key 里，淘汰访问次数最少的；\nvolatile-lru、volatile-lfu：只在设置了过期时间的 key 里按 LRU 或 LFU 淘汰；\nvolatile-ttl：在设置了过期时间的 key 里，淘汰最快要过期的；\n还有 allkeys-random、volatile-random 随机淘汰。\n纯缓存场景最常用的是 allkeys-lru 或 allkeys-lfu。'},
  {title:'LRU 和 LFU 的区别',body:'LRU（最近最少使用）：看“最后一次被访问是什么时候”，淘汰最久没被碰过的。它的问题是：一次性的批量扫描（比如导出报表把所有数据读了一遍）会让一大批冷数据看起来“刚被用过”，反而把真正的热数据挤出去。\nLFU（最不经常使用）：看“访问的频率”，淘汰访问次数最少的。偶尔被访问一次的冷数据不容易挤掉长期的热数据。Redis 的 LFU 还会让计数随时间衰减，过去很热、现在没人用的数据也能被淘汰。\n为了省内存和 CPU，Redis 的 LRU 和 LFU 都是近似实现：不维护一个全局精确的排序，而是每次随机抽几个 key，在里面淘汰最该淘汰的那个。'},
  {title:'动手试试：用 Python 写一个 LRU 缓存',body:'我们用 Python 自带的 OrderedDict（会记住顺序的字典）实现一个容量为 3 的 LRU 缓存：每次访问都把这个 key 挪到最后，满了就淘汰排在最前面的，也就是最久没被访问的那个。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 lru.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python lru.py（Mac 用 python3 lru.py），对照下面的输出。','在 cache.get("a") 这一行前面加一个 # 注释掉它，再运行，看看这次被淘汰的变成了谁。'],expect:'访问 a： 1\n放入 d 后的顺序： [\'c\', \'a\', \'d\']\nb 还在吗： None'},code:`from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return None
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)

cache = LRUCache(3)
cache.put("a", 1)
cache.put("b", 2)
cache.put("c", 3)
print("访问 a：", cache.get("a"))
cache.put("d", 4)
print("放入 d 后的顺序：", list(cache.data))
print("b 还在吗：", cache.get("b"))`,explain:[{at:'from collections import OrderedDict',text:'OrderedDict 是能记住插入顺序、还能调整顺序的字典。'},{at:'class LRUCache:',text:'定义一个 LRU 缓存类。'},{at:'def __init__(self, capacity):',to:'self.data = OrderedDict()',text:'创建时指定容量，数据存在 OrderedDict 里：越靠后表示越近被访问过。'},{at:'def get(self, key):',text:'读取。'},{at:'if key not in self.data:',to:'return None',text:'不存在就返回 None。'},{at:'self.data.move_to_end(key)',text:'被访问了，挪到最后，表示“刚刚用过”。'},{at:'return self.data[key]',text:'返回值。'},{at:'def put(self, key, value):',to:'self.data.move_to_end(key)',text:'写入或更新，同样挪到最后。'},{at:'if len(self.data) > self.capacity:',to:'self.data.popitem(last=False)',text:'超过容量，就弹出最前面的那个，也就是最久没被访问的。'},{at:'cache = LRUCache(3)',to:'cache.put("c", 3)',text:'容量为 3，依次放入 a、b、c。此时顺序是 a、b、c。'},{at:'print("访问 a：", cache.get("a"))',text:'访问一次 a，a 被挪到最后，顺序变成 b、c、a。'},{at:'cache.put("d", 4)',text:'放入 d 后超出容量，淘汰最前面的 b。'},{at:'print("放入 d 后的顺序：", list(cache.data))',text:'剩下 c、a、d。'},{at:'print("b 还在吗：", cache.get("b"))',text:'b 已经被淘汰，返回 None。'}]},
  {title:'大 key：删除时把 Redis 卡住',body:'“大 key”是指 value 特别大的 key，比如一个 Hash 里有 500 万个字段，或者一个 String 存了几十 MB。\n因为 Redis 单线程执行命令，用 DEL 删除这样的大 key 时，要一个个释放 500 万个字段的内存，可能要好几秒，这几秒里其他所有请求都卡住了。\n更好的做法：\n一、用 UNLINK 代替 DEL：它先把 key 从数据库里摘掉（马上返回），真正释放内存的工作交给后台线程慢慢做；\n二、也可以用 HSCAN 每次取一小批字段，用 HDEL 分批删除；\n三、从设计上避免大 key：把一个大 Hash 按 id 拆成多个小 Hash。可以用 redis-cli --bigkeys 扫描找出现有的大 key。',code:`UNLINK big:hash

HSCAN big:hash 0 COUNT 1000
HDEL big:hash field1 field2 field3`,explain:[{at:'UNLINK big:hash',text:'异步删除：立刻把 key 摘掉，内存在后台线程里释放，不会阻塞其他命令。'},{at:'HSCAN big:hash 0 COUNT 1000',text:'另一种办法：从游标 0 开始，每次取大约 1000 个字段。返回结果里有下一次的游标，游标回到 0 表示遍历完了。'},{at:'HDEL big:hash field1 field2 field3',text:'把这一批字段删掉，然后继续下一批，每次只占用很短的时间。'}]},
  {title:'缓存穿透：查根本不存在的数据',body:'缓存穿透是指请求的数据在数据库里根本不存在，所以缓存里也永远不会有。每次请求都“穿过”缓存直接打到数据库上。如果有人故意用大量随机的、不存在的商品 id 来刷接口，数据库就会被压垮。\n防护办法：\n一、参数校验：明显不合法的 id（负数、格式不对）直接拒绝；\n二、缓存空值：数据库查不到时，也在缓存里存一个“空”标记，设置较短的过期时间（比如 1 分钟），下次同样的请求直接返回空；\n三、布隆过滤器：把所有存在的 id 预先放进一个布隆过滤器，请求来了先问它。它说“一定不存在”，就直接返回，根本不查缓存和数据库。'},
  {title:'动手试试：布隆过滤器挡住不存在的 id',body:'布隆过滤器用一个很长的“位数组”（每一位只有 0 或 1）来记录哪些东西存在：放入一个元素时，用几个不同的哈希函数算出几个位置，都设成 1；查询时如果这几个位置有任何一个是 0，就“一定不存在”；如果都是 1，就“可能存在”（可能是别的元素碰巧把这些位置设成了 1，有一点误判）。\n它非常省内存，代价是有少量误判，而且不能删除元素。我们用 Python 实现一个简单版本试试。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 bloom.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python bloom.py（Mac 用 python3 bloom.py），对照下面的输出。','把 SIZE 从 1000 改成 5000 再运行，看看误判的数量会怎么变化：位数组越大，误判越少。'],expect:'商品 42 可能存在： True\n商品 99999 可能存在： False\n1000 个不存在的 id 里，被误判为“可能存在”的有： 20'},code:`import hashlib

SIZE = 1000
bits = [0] * SIZE

def positions(item):
    for seed in range(3):
        h = hashlib.md5(f"{seed}:{item}".encode()).hexdigest()
        yield int(h, 16) % SIZE

def add(item):
    for p in positions(item):
        bits[p] = 1

def might_contain(item):
    return all(bits[p] for p in positions(item))

for goods_id in range(1, 101):
    add(goods_id)

print("商品 42 可能存在：", might_contain(42))
print("商品 99999 可能存在：", might_contain(99999))
fake = [i for i in range(100000, 101000) if might_contain(i)]
print("1000 个不存在的 id 里，被误判为“可能存在”的有：", len(fake))`,explain:[{at:'import hashlib',text:'导入 Python 自带的哈希库，用来把任意数据算成一个大数字。'},{at:'SIZE = 1000',to:'bits = [0] * SIZE',text:'准备一个 1000 位的位数组，初始全是 0。'},{at:'def positions(item):',text:'算出一个元素对应的 3 个位置。'},{at:'for seed in range(3):',to:'yield int(h, 16) % SIZE',text:'用 3 个不同的前缀（相当于 3 个不同的哈希函数）各算一次 md5，转成数字后对 1000 取余，得到 0 到 999 之间的位置。yield 表示一个个地产出结果。'},{at:'def add(item):',to:'bits[p] = 1',text:'放入元素：把它的 3 个位置都设成 1。'},{at:'def might_contain(item):',to:'return all(bits[p] for p in positions(item))',text:'查询：3 个位置全是 1 才返回 True（可能存在），有一个是 0 就返回 False（一定不存在）。'},{at:'for goods_id in range(1, 101):',to:'add(goods_id)',text:'假设数据库里有 1 到 100 号商品，全部放进过滤器。'},{at:'print("商品 42 可能存在：", might_contain(42))',text:'42 号确实存在，返回 True。存在的元素绝不会被判成不存在。'},{at:'print("商品 99999 可能存在：", might_contain(99999))',text:'99999 号不存在，返回 False，这个请求可以直接拦下，不用查数据库。'},{at:'fake = [i for i in range(100000, 101000) if might_contain(i)]',text:'再用 1000 个不存在的 id 测一测，统计有多少被误判成“可能存在”。'},{at:'print("1000 个不存在的 id 里',text:'只有 20 个误判，也就是 98% 的恶意请求被直接挡住了。误判的那些会去查缓存和数据库，再配合缓存空值就能兜住。'}]},
  {title:'缓存击穿：一个热点 key 突然过期',body:'缓存击穿是指某一个特别热门的 key（比如秒杀商品的详情）刚好过期的瞬间，有成千上万个请求同时发现缓存没有，全都去查数据库重建缓存，数据库一下子被打垮。\n解决办法：\n一、互斥重建：同一时刻只让一个请求去查数据库、写回缓存，其他请求等着它的结果，或者先稍等片刻再重新读缓存。单个进程内可以用 Go 的 singleflight，多台服务器之间可以用一把分布式锁；\n二、逻辑过期：不给热点 key 设置真正的过期时间，而是在 value 里存一个“逻辑过期时间”。读的时候发现逻辑上过期了，先把旧数据返回给用户，同时只派一个后台任务去刷新。用户永远不会等，代价是短时间内可能读到旧数据。'},
  {title:'缓存雪崩：大批 key 同时失效',body:'缓存雪崩是指大量的 key 在同一时间失效，或者整个缓存服务挂了，所有请求一起压到数据库上。\n常见原因一：上线时批量预热了一大批缓存，都设置了同样的 1 小时过期，1 小时后它们一起过期。解决办法是给过期时间加一个随机的“抖动”，比如 1 小时加上 0 到 5 分钟的随机值，让它们分散在不同的时刻过期。\n常见原因二：Redis 整体故障。解决办法是：\n一、Redis 做高可用（主从 + 哨兵，或集群），一台挂了马上切换；\n二、多级缓存：应用服务器本地再放一层小缓存；\n三、限流和降级：数据库前面加限流，超过承受能力的请求直接返回一个兜底结果或者友好提示，保护数据库不被压垮。'},
  {title:'Cache Aside：最常用的缓存读写方式',body:'Cache Aside（旁路缓存）是最常用的模式：\n读：先查缓存，命中就直接返回；没命中就查数据库，然后把结果写回缓存（回填），再返回。\n写：先更新数据库，再删除缓存。注意是“删除”而不是“更新”缓存：下一次读的时候自然会从数据库重新加载最新的值。\n为什么是先更新数据库、再删缓存？如果反过来先删缓存，在“删缓存”和“改数据库”之间，另一个读请求可能把旧值重新读进缓存，缓存就一直是旧的了。',code:`v, err := rdb.Get(ctx, key).Result()
if err == redis.Nil {
    v = loadFromDB(id)
    rdb.Set(ctx, key, v, 10*time.Minute+jitter())
}

updateDB(id, newV)
rdb.Del(ctx, key)`,explain:[{at:'v, err := rdb.Get(ctx, key).Result()',text:'读：先查 Redis（这里用的是 Go 的 go-redis 库）。'},{at:'if err == redis.Nil {',text:'redis.Nil 表示 key 不存在，也就是缓存没命中。'},{at:'v = loadFromDB(id)',text:'去数据库查。'},{at:'rdb.Set(ctx, key, v, 10*time.Minute+jitter())',text:'写回缓存，过期时间 10 分钟再加一点随机抖动，防止雪崩。'},{at:'updateDB(id, newV)',text:'写：先更新数据库。'},{at:'rdb.Del(ctx, key)',text:'再删除缓存，下次读的时候会重新加载新值。'}]},
  {title:'缓存和数据库的一致性',body:'Cache Aside 并不是强一致的，还是有几种情况会让缓存里留着旧数据：\n一、删除缓存失败了（比如网络抖动），缓存里就一直是旧值；\n二、并发的时序问题：一个读请求在缓存没命中后读到了旧值，还没来得及写回缓存；这时一个写请求更新了数据库并删除了缓存；然后读请求才把旧值写回缓存。\n减少不一致的常用办法：\n一、删除失败就重试，或者把删除操作放进消息队列，保证一定执行；\n二、订阅数据库的 binlog（用 Canal 这类 CDC 工具），数据一变化就可靠地删除对应的缓存；\n三、“延迟双删”：更新数据库、删除缓存后，过几百毫秒再删一次，清掉可能被并发写回的旧值；\n四、所有缓存都设置过期时间，即使出现不一致，也只会持续一段时间；\n五、关键数据定期对账，发现不一致就修正。\n如果业务要求必须强一致（比如余额），就不要读缓存，直接读数据库。'},
  {title:'高可用：主从、哨兵和集群',body:'单台 Redis 挂了，缓存就全没了。常见的高可用方案：\n主从复制：一个主节点负责写，数据异步复制到一个或多个从节点，从节点可以分担读请求；\n哨兵（Sentinel）：几个哨兵进程一起监控主节点，发现主节点挂了，就投票选出一个从节点升级为新的主节点，并通知客户端连接新主节点，实现自动故障切换；\n集群（Cluster）：数据量大到一台机器放不下时使用。它把所有 key 分成 16384 个哈希槽（slot），用 key 算出属于哪个槽，每个主节点负责一部分槽，每个主节点也都有自己的从节点。\n要注意：Redis 的复制是异步的，主节点刚写入、还没来得及复制给从节点就挂了的话，切换之后这部分最近的写入会丢失。'},
  {title:'用 Redis 实现分布式锁',body:'多台服务器上的程序要互斥地做某件事（比如同一个订单只能被处理一次），可以用 Redis 做一把“分布式锁”。要注意这几点：\n一、加锁要用一条命令同时完成“不存在才设置”和“设置过期时间”：SET key value NX PX 30000。如果分成 SETNX 和 EXPIRE 两条命令，中间程序崩了，锁就永远不会过期；\n二、一定要设置过期时间，防止持有锁的程序崩溃后锁永远不释放；\n三、value 要用一个唯一的随机值（比如 UUID），释放锁时先检查是不是自己加的锁，是才删除，防止误删别人的锁。“检查 + 删除”要用 Lua 脚本保证原子；\n四、业务执行时间可能超过锁的过期时间，需要有“续期”机制（比如 Redisson 的看门狗），或者把过期时间设得足够长；\n五、主从切换时锁可能丢失，对正确性要求极高的场景，要在数据库层面再加一道保护，比如唯一约束或版本号。',code:`SET lock:order:42 "uuid-abc" NX PX 30000

if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end`,explain:[{at:'SET lock:order:42 "uuid-abc" NX PX 30000',text:'加锁：NX 表示 key 不存在才设置成功，PX 30000 表示 30 秒后自动过期，uuid-abc 是这次加锁者的唯一标识。返回 OK 表示抢到了锁。'},{at:'if redis.call("GET", KEYS[1]) == ARGV[1] then',text:'释放锁的 Lua 脚本：先看锁的值是不是自己的 uuid。整个脚本在 Redis 里原子执行，中间不会被插队。'},{at:'return redis.call("DEL", KEYS[1])',text:'是自己的锁，才删除。'},{at:'else',to:'end',text:'不是自己的（比如自己的锁早已过期，被别人重新拿到了），就什么都不做。'}]}
 ],quiz:[
  {id:'be-redis-1',q:'业务能接受最多丢失 1 秒的数据，又希望重启恢复快。下面哪种持久化配置最合适？',options:['只用 RDB，每小时快照一次','AOF everysec 加混合持久化','关闭全部持久化功能','AOF always，每条命令刷盘'],why:['每小时一次快照，宕机最多丢一小时数据，不满足要求。','','不持久化重启后数据全部丢失。','always 每条写命令都刷盘，数据最安全，但性能代价很大，超出了“丢 1 秒可接受”的需要。'],answer:1,explain:'everysec 最多丢失约 1 秒；混合持久化用 RDB 做前导，重启恢复更快。',interview:'q-69f69b18e3ca037a'},
  {id:'be-redis-2',type:'judge',q:'设置了过期时间的 key 到期后，Redis 会立即把它从内存中删除。',answer:false,explain:'Redis 用惰性删除加定期抽查，过期 key 可能暂时还占内存，但读取时不会被当作有效值返回。',interview:'q-eb490c6677302d5f'},
  {id:'be-redis-3',q:'maxmemory 已满，淘汰策略是 noeviction，此时执行 SET 会怎样？',options:['自动删除最旧的一个 key 腾空间','返回 OOM 错误，读写删除仍可用','Redis 进程因内存不足自动重启','把新写入的数据暂存到磁盘上'],why:['noeviction 不淘汰任何 key，不会自动删除。','','内存满不会让 Redis 重启。','Redis 不会把超出内存的数据转存到磁盘。'],answer:1,explain:'noeviction 下，会增加内存的写命令直接报 OOM 错误，读取和删除命令通常仍能执行。',interview:'q-673bae355c0f16fd'},
  {id:'be-redis-4',q:'有人用大量不存在的商品 id 刷接口，请求全部打到数据库。这是什么问题？怎么防？',options:['缓存雪崩，给 TTL 加随机值','缓存穿透，校验参数并缓存空值','缓存击穿，用互斥锁重建缓存','大 key 问题，拆分成小 key'],why:['雪崩是大量 key 同时过期或缓存整体不可用。','','击穿是某个存在的热点 key 过期，请求都去重建它。','大 key 是单个 key 体积过大，与查询不存在的数据无关。'],answer:1,explain:'穿透是查询根本不存在的数据，缓存永远不命中；可以校验参数、缓存空值、使用布隆过滤器。',interview:'q-5380e13be164d77c'},
  {id:'be-redis-5',q:'一个超级热门的商品缓存过期，瞬间上万请求同时回源数据库。最合适的做法是？',options:['把这个 key 的 TTL 设为 0','只让一个请求重建，其他等待','直接关闭缓存，全部读数据库','调大数据库的最大连接数'],why:['TTL 设为 0 会让 key 立即过期，问题更严重。','','关闭缓存会让全部流量压到数据库上。','连接数调大只会让更多请求同时压到数据库，可能把数据库打垮。'],answer:1,explain:'这是缓存击穿：用互斥锁或 singleflight 只让一个请求回源，也可以用逻辑过期在后台异步刷新。',interview:'q-5380e13be164d77c'},
  {id:'be-redis-6',type:'multi',q:'Cache Aside 模式下，下面哪些做法能减少缓存和数据库的不一致？（多选）',options:['先更新数据库，再删除缓存','删缓存失败时可靠重试或用 binlog 删除','缓存设置合理的过期时间兜底','先删缓存再更新数据库，不做其他处理'],why:['','','','先删缓存后，在数据库更新完成前，并发读会把旧值回填进缓存，造成长期不一致。'],answers:[0,1,2],explain:'先删缓存再写库，期间并发读会把旧值回填进缓存；还可以加版本校验和定期对账。',interview:'q-93e8dfebc307c185'},
  {id:'be-redis-7',type:'fill',q:'Redis Cluster 把数据分成 ____ 个哈希槽，分布到多个主节点上。',accepted:['16384'],explain:'每个 key 通过 CRC16(key) % 16384 映射到槽，槽再分配给主节点。',interview:'q-117d2cac6f786ddb'},
  {id:'be-redis-8',q:'一个 Hash 里有 500 万个字段，执行 DEL 时 Redis 卡顿了好几秒。更好的做法是？',options:['先用 KEYS * 找到它再删除','用 UNLINK 异步删或分批 HDEL','重启 Redis 让内存一次性释放','给 Redis 实例增加更多的内存'],why:['KEYS * 本身会遍历所有 key，同样会阻塞 Redis。','','重启会导致服务中断，大 key 问题依然存在。','删除时的卡顿来自释放大量内存的耗时，与内存总量无关。'],answer:1,explain:'UNLINK 把释放内存的工作放到后台线程；根本上应从设计上拆分大 key。',interview:'q-5f578456bdbb0143'},
  {id:'be-redis-9',q:'LRU 和 LFU 淘汰策略的区别是？',options:['两种策略的淘汰依据完全相同','LRU 看最近访问，LFU 看访问次数','LRU 优先淘汰体积最大的 key','LFU 仅适用于设置了过期的 key'],why:['两者的淘汰依据不同。','','LRU 按最近访问时间淘汰，与 key 的大小无关。','LFU 有 allkeys-lfu 和 volatile-lfu 两种，并不限于设置了过期的 key。'],answer:1,explain:'LRU 容易被一次性的全量扫描污染；LFU 更能保住长期热点，但需要计数衰减来淘汰过时的热点。',interview:'q-baae548966245f03'},
  {id:'be-redis-10',type:'short',q:'用 Redis 实现分布式锁，需要注意哪些问题？',reference:'加锁用 SET key 随机值 NX PX 过期时间，保证互斥和自动过期；解锁时用 Lua 脚本判断值是自己的再删除，避免误删别人的锁。业务执行时间可能超过过期时间导致锁提前失效，可以用看门狗续期，但续期也可能失败；Redis 主从切换时锁可能丢失。对正确性要求高的场景，要在被保护的资源上校验 fencing token（递增版本号），或直接用数据库唯一约束、乐观锁。',points:['SET NX PX + 随机值','Lua 判断后删除','锁可能提前过期，续期也可能失败','主从切换可能丢锁','关键处用 fencing token'],explain:'分布式锁只能降低冲突概率，正确性最终要在资源侧保证。',interview:'q-c90bd2a4838c6555'},
 ]},
 {id:'be-linux',title:'Linux 进阶：进程、文件与权限',summary:'进程与信号、inode 与链接、shell 环境，以及排查入门',lessons:[
  {title:'这一关学什么：在服务器上“看病”的基本功',body:'后端程序几乎都跑在 Linux 服务器上。程序出了问题，你要能登录服务器，自己查日志、看进程、找出是什么占满了 CPU、内存或磁盘。\n这一关讲：\n一、常用命令，尤其是怎么看日志、怎么重定向输出；\n二、进程和信号：怎么正确地停止一个程序，什么是僵尸进程；\n三、文件、inode、硬链接和软链接，以及“删了文件空间却没释放”的问题；\n四、文件权限和定时任务；\n五、CPU、内存、磁盘 I/O 问题的排查思路。'},
  {title:'在自己电脑上用 Linux 命令',body:'要动手练习这一关的命令，需要一个 Linux 环境，有三种简单的办法：\n一、Mac：自带的“终端”就能运行绝大部分命令；\n二、Windows：用 WSL（Windows 自带的 Linux 子系统）。以管理员身份打开 PowerShell，运行 wsl --install，重启电脑后在开始菜单里打开 Ubuntu 即可；\n三、装了 Docker 的话，运行 docker run -it --rm ubuntu bash，马上就得到一个临时的 Ubuntu 命令行，退出后自动删除。\n不确定怎么装，可以点右下角的“问 AI”，让 AI 老师按你的电脑一步步教你。'},
  {title:'常用命令速查',body:'按用途记住这些命令，排查问题时就知道该用哪个：\n找文件：find；搜文件内容：grep，或者更快的 rg（ripgrep）；\n看日志：less、tail；\n看进程：ps、top、pidstat；\n看内存：free、vmstat；\n看磁盘：df（各个磁盘还剩多少空间）、du（某个目录占了多少）、iostat（磁盘读写忙不忙）；\n看网络：ip（网卡和地址）、ss（连接和监听的端口）、curl（发 HTTP 请求）、tcpdump（抓包）；\n管服务：systemctl（启动、停止服务）、journalctl（看服务的日志）。',code:`find /var/log -name "*.log" -mtime -1
grep -n "ERROR" app.log
ps aux | grep java
df -h
du -sh /var/log/*
ss -lntp`,explain:[{at:'find /var/log -name "*.log" -mtime -1',text:'在 /var/log 下找最近 1 天内修改过的 .log 文件。'},{at:'grep -n "ERROR" app.log',text:'在 app.log 里搜索包含 ERROR 的行，-n 会显示行号。'},{at:'ps aux | grep java',text:'列出所有进程，再用竖线 | 把结果交给 grep，筛出包含 java 的那些。竖线叫“管道”，把前一个命令的输出当作后一个命令的输入。'},{at:'df -h',text:'查看每个磁盘分区的总大小、已用和剩余空间，-h 表示用 G、M 这样易读的单位显示。'},{at:'du -sh /var/log/*',text:'查看 /var/log 下每个文件和目录分别占了多少空间，用来找“谁把磁盘占满了”。'},{at:'ss -lntp',text:'列出所有正在监听（l）的 TCP（t）端口，用数字显示端口号（n），并显示是哪个进程（p）在监听。'}]},
  {title:'看日志：tail 和 less',body:'线上的日志文件经常有几个 GB 大，千万不要用 vim 这样的编辑器整个打开，会把内存撑爆，甚至拖慢整台服务器。正确的做法是只看需要的部分：\ntail -n 200 app.log：只看最后 200 行；\ntail -F app.log：持续跟随文件的新内容，有新日志就实时打印出来；\nless app.log：分页浏览大文件，按 / 输入关键字搜索，按 G 跳到末尾，按 q 退出。\n注意 -f 和 -F 的区别：日志通常会按天“轮转”，也就是把今天的 app.log 改名成 app.log.1，再新建一个空的 app.log 继续写。tail -f 跟着的是原来那个文件，改名后就看不到新日志了；tail -F 会按文件名重新打开，轮转后也能继续跟。',code:`tail -n 200 -F app.log
less +G app.log
grep -n "订单 42" app.log | tail -n 20
sed -n '1000,1100p' app.log`,explain:[{at:'tail -n 200 -F app.log',text:'先显示最后 200 行，然后持续跟随新内容，日志轮转后也不会断。按 Ctrl+C 停止。'},{at:'less +G app.log',text:'用 less 打开，+G 表示直接跳到文件末尾，适合先看最新的日志再往上翻。'},{at:'grep -n "订单 42" app.log | tail -n 20',text:'搜出所有和订单 42 有关的行，只看最后 20 条。'},{at:'sed -n \'1000,1100p\' app.log',text:'只打印第 1000 到 1100 行，已经知道问题大概在哪几行时用。'}]},
  {title:'重定向：把输出写进文件',body:'每个程序默认有两个输出：标准输出（编号 1，正常的输出）和标准错误（编号 2，错误信息）。默认它们都显示在屏幕上。\n> 文件：把标准输出写进文件（覆盖原内容），>> 则是追加到末尾；\n2>&1：把标准错误指向“标准输出当前指向的地方”。\n重定向是从左到右依次生效的，所以顺序很重要：\n./app > app.log 2>&1：先把标准输出指向 app.log，再让标准错误跟着标准输出走，所以两者都写进 app.log；\n./app 2>&1 > app.log：先让标准错误指向标准输出“当时”指向的屏幕，再把标准输出改到 app.log。结果是错误信息仍然显示在屏幕上，只有正常输出进了文件。',code:`./app > app.log 2>&1
./app >> app.log 2>&1
./app 2>&1 > app.log
nohup ./app > app.log 2>&1 &`,explain:[{at:'./app > app.log 2>&1',text:'正确写法：正常输出和错误都写进 app.log。'},{at:'./app >> app.log 2>&1',text:'同上，但是追加到文件末尾，不覆盖原来的内容。'},{at:'./app 2>&1 > app.log',text:'顺序反了：错误信息还是显示在屏幕上，只有正常输出写进了文件。'},{at:'nohup ./app > app.log 2>&1 &',text:'末尾的 & 表示放到后台运行，nohup 让你退出登录后程序也不会被关掉。'}]},
  {title:'进程和信号：怎么正确地停掉一个程序',body:'信号是操作系统发给进程的“通知”，kill 命令就是用来发信号的（名字叫 kill，其实不一定是杀死）。最常用的两个：\nSIGTERM（15 号，kill 默认发的就是它）：礼貌地请程序退出。程序可以捕获这个信号，先做清理工作：处理完手上的请求、保存数据、关闭连接，然后再退出。前面学的“优雅关闭”就是在处理它；\nSIGKILL（9 号，kill -9）：强制杀死。程序根本收不到这个信号，也就没有机会做任何清理，由操作系统直接结束它。\n所以停服务应该先发 SIGTERM，等一会儿还不退出，再用 kill -9。直接 kill -9 可能导致数据没保存、文件写了一半。',code:`ps aux | grep myapp
kill 12345
sleep 10
kill -0 12345 && kill -9 12345`,explain:[{at:'ps aux | grep myapp',text:'找到 myapp 进程的 PID（进程编号），假设是 12345。'},{at:'kill 12345',text:'发送 SIGTERM，请它自己清理后退出。'},{at:'sleep 10',text:'给它 10 秒时间收尾。'},{at:'kill -0 12345 && kill -9 12345',text:'kill -0 不发任何信号，只检查进程还在不在。还在的话（&& 表示前一个命令成功才执行后一个），就用 kill -9 强制结束。'}]},
  {title:'僵尸进程和 D 状态进程',body:'用 ps 或 top 看进程时，STAT 这一列表示进程的状态。有两种状态经常被问到：\nZ（僵尸进程）：进程已经结束了，但它的父进程还没有调用 wait 去“回收”它，所以它还在进程表里占着一个位置。僵尸进程不占 CPU 和内存，杀也杀不掉（它已经死了）。少量没关系，大量积累会耗尽进程号。解决办法是让父进程正确地回收子进程；父进程有问题时，结束父进程，僵尸会被 1 号进程接管并回收。\nD（不可中断睡眠）：进程正在等待某些不能被打断的操作，最常见的是等磁盘 I/O 或网络文件系统（NFS）。这时连 kill -9 也要等它从等待中出来才会生效。大量 D 状态的进程，通常说明磁盘或存储出了问题。'},
  {title:'inode：文件名和文件内容是分开存的',body:'在 Linux 里，一个文件其实分成三部分存放：\n一、文件内容，存在磁盘的数据块里；\n二、inode（索引节点）：记录文件的“元数据”，包括大小、权限、所有者、修改时间、内容存在哪些数据块里，以及有几个名字指向它（链接数）。每个 inode 有一个编号；\n三、文件名：存在目录里。目录本质上是一张“文件名 → inode 编号”的对照表。\n所以文件名并不是文件本身的一部分，同一个 inode 可以有好几个名字，这就是硬链接。\n还有一个常见的坑：磁盘的 inode 数量是有限的。如果有程序产生了几百万个小文件，可能磁盘空间还有很多，df -i 一看 inode 却用光了，同样无法再创建新文件。'},
  {title:'硬链接和软链接',body:'硬链接（ln 原文件 新名字）：给同一个 inode 再起一个名字。两个名字地位完全相等，都直接指向同一份内容。删除其中一个名字，只是 inode 的链接数减一，内容还在；链接数减到 0（并且没有进程打开着它），内容才真正被删除。硬链接不能跨文件系统，一般也不能给目录创建。\n软链接（ln -s 原文件 新名字，也叫符号链接）：一个单独的小文件，里面存的是目标文件的路径，类似 Windows 的快捷方式。可以指向目录，也可以跨文件系统。目标文件被删除后，软链接就变成了“悬空链接”，打不开了。'},
  {title:'删了大文件，磁盘空间却没释放',body:'一个常见的线上问题：磁盘满了，rm 删掉了一个 20GB 的日志文件，df 一看空间一点没少。\n原因是：还有进程打开着这个文件。rm 删除的只是文件名（链接数变成 0），但只要还有进程打开着它，inode 和数据就不会被真正释放，那个进程还在往里写。\n排查和处理：\n一、用 lsof +L1 列出所有“已经被删除、但仍被进程打开”的文件，找到是哪个进程；\n二、重启那个进程，或者让它重新打开日志文件，空间就释放了；\n三、如果暂时不能重启，可以把文件内容清空：通过 /proc/进程号/fd/文件描述符号 找到它，用 > 截断成 0 字节。\n以后清理正在被写的日志，应该用 > app.log 把内容清空，而不是 rm 删除文件。',code:`lsof +L1 | grep deleted
> /proc/12345/fd/4
> app.log`,explain:[{at:'lsof +L1 | grep deleted',text:'列出链接数小于 1（已经被删除）但仍被打开的文件，输出里能看到进程名、PID、文件描述符号和文件大小。'},{at:'> /proc/12345/fd/4',text:'假设查到是 12345 号进程的 4 号文件描述符，用 > 把它截断成 0 字节，空间马上释放，进程也不用重启。'},{at:'> app.log',text:'以后清理还在被写入的日志，用这种方式清空内容，而不是 rm。'}]},
  {title:'文件权限：谁能读、写、执行',body:'ls -l 的输出开头像 -rwxr-x--- 这样的一串字符，就是文件权限：\n第 1 位：文件类型，- 是普通文件，d 是目录，l 是软链接；\n后面 9 位分三组，每组三位：文件所有者（u）、所属的用户组（g）、其他所有人（o）各自的权限；\nr 是读、w 是写、x 是执行，- 表示没有这个权限。\n权限也常用数字表示：r = 4、w = 2、x = 1，每组加起来。比如 750 表示所有者 rwx（4+2+1=7）、同组 r-x（4+1=5）、其他人没有权限（0）。\n对目录来说，x 表示“能不能进入这个目录”。脚本文件要有 x 权限才能用 ./脚本 的方式直接运行。',code:`ls -l deploy.sh
chmod 750 deploy.sh
chmod +x deploy.sh
chown app:app deploy.sh`,explain:[{at:'ls -l deploy.sh',text:'查看文件的权限、所有者、大小和修改时间。'},{at:'chmod 750 deploy.sh',text:'设置权限：所有者可读写执行，同组用户可读和执行，其他人无权限。'},{at:'chmod +x deploy.sh',text:'给所有人加上执行权限，不改变其他权限。'},{at:'chown app:app deploy.sh',text:'把文件的所有者和所属组都改成 app。'}]},
  {title:'定时任务：手动能跑，定时就失败',body:'crontab 用来让脚本定时自动运行。crontab -e 编辑，每行一个任务，前五个字段分别是：分钟、小时、日、月、星期。\n一个非常常见的问题：脚本手动执行完全正常，放进 crontab 定时执行却失败了。最常见的原因是环境变量不同：cron 运行任务时的环境非常精简，PATH 里只有几个基本目录，你在终端里配置的环境变量（比如 JAVA_HOME、自己装的命令的路径）它都没有，于是“找不到命令”。\n解决办法：脚本里的命令都写完整路径，或者在脚本开头自己设置好 PATH 等环境变量；并且一定要把输出重定向到日志文件，否则出错了你根本看不到原因。',code:`30 2 * * * /home/app/backup.sh >> /home/app/backup.log 2>&1

#!/bin/bash
export PATH=/usr/local/bin:/usr/bin:/bin
cd /home/app
/usr/local/bin/python3 backup.py`,explain:[{at:'30 2 * * * /home/app/backup.sh >> /home/app/backup.log 2>&1',text:'每天凌晨 2 点 30 分执行备份脚本（* 表示“每一个”），输出和错误都追加到日志里，出问题时有据可查。'},{at:'export PATH=/usr/local/bin:/usr/bin:/bin',text:'脚本开头（第一行 #!/bin/bash 表示用 bash 执行）自己设置 PATH，不依赖 cron 的环境。'},{at:'cd /home/app',text:'切换到正确的目录，cron 的当前目录通常是用户的主目录，不一定是你以为的地方。'},{at:'/usr/local/bin/python3 backup.py',text:'命令写完整路径，最保险。'}]},
  {title:'动手试试：硬链接、软链接和重定向',body:'在 Linux 环境里（Mac 终端、WSL 或 Docker 的 Ubuntu）依次运行下面的命令，验证这一关讲的两个知识点：删掉原文件后，硬链接还能读、软链接就失效了；重定向的顺序不同，错误信息去的地方也不同。',practice:{steps:['按“在自己电脑上用 Linux 命令”那张卡片的方法，打开一个 Linux 终端。','新建一个练习目录并进入：mkdir ~/link-try && cd ~/link-try。','把下面的命令一行一行地输入执行，对照下面的输出。ls -li 第一列的 inode 编号在你的电脑上会不一样，重点看 a.txt 和 b.txt 的编号相同，链接数都是 2。'],expect:'151 -rw-r--r-- 2 you you 6 Nov  3 03:10 a.txt\n151 -rw-r--r-- 2 you you 6 Nov  3 03:10 b.txt\n152 lrwxrwxrwx 1 you you 5 Nov  3 03:10 c.txt -> a.txt\nhello\ncat: c.txt: No such file or directory\n---\nls: cannot access \'/nope\': No such file or directory\n文件内容：'},code:`echo hello > a.txt
ln a.txt b.txt
ln -s a.txt c.txt
ls -li a.txt b.txt c.txt
rm a.txt
cat b.txt
cat c.txt
echo ---
ls /nope 2>&1 > out.log
echo "文件内容：$(cat out.log)"`,explain:[{at:'echo hello > a.txt',text:'创建 a.txt，内容是 hello。'},{at:'ln a.txt b.txt',text:'给 a.txt 创建一个硬链接 b.txt，它们指向同一个 inode，链接数变成 2。'},{at:'ln -s a.txt c.txt',text:'创建一个软链接 c.txt，里面存的是路径“a.txt”。'},{at:'ls -li a.txt b.txt c.txt',text:'-i 显示 inode 编号：a.txt 和 b.txt 的编号相同，c.txt 是另一个，并显示 c.txt -> a.txt。'},{at:'rm a.txt',text:'删除 a.txt 这个名字，inode 的链接数变回 1，内容还在。'},{at:'cat b.txt',text:'硬链接照样能读出 hello。'},{at:'cat c.txt',text:'软链接指向的路径 a.txt 已经不存在了，报错 No such file or directory。'},{at:'echo ---',text:'打印一条分隔线。'},{at:'ls /nope 2>&1 > out.log',text:'列一个不存在的目录，会产生错误信息。因为 2>&1 写在前面，错误信息仍然打印在屏幕上。'},{at:'echo "文件内容：$(cat out.log)"',text:'$(...) 会把里面命令的输出放到这里。out.log 是空的，说明错误信息没有进文件。'}]},
  {title:'CPU 突然 100%：排查步骤',body:'线上服务器 CPU 突然飙到 100%，可以按这个顺序一步步缩小范围：\n一、先看是哪种 CPU 时间高：用 top 或 mpstat，看 us（用户态，程序自己的计算）、sy（内核态，系统调用多）、wa（iowait，在等磁盘）、st（steal，虚拟机的 CPU 被宿主机上的其他虚拟机抢走了）；\n二、找到是哪个进程：top 按 CPU 排序，或者用 pidstat 1 每秒看一次；\n三、找到进程里是哪个线程：top -H -p 进程号；\n四、找到具体在执行哪段代码：Go 程序用 pprof 抓 CPU profile；Java 程序把线程号转成十六进制，再用 jstack 找到对应的线程栈；通用的办法是 perf top；\n五、常见原因：死循环、正则表达式回溯、频繁 GC、某个接口流量突增。先止血（限流、扩容、回滚最近的发布），再根据分析结果修复代码。',code:`top
pidstat -u 1 5
top -H -p 12345
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
perf top -p 12345`,explain:[{at:'top',text:'看整体 CPU 使用情况和占用最高的进程。按 P 按 CPU 排序，按 1 可以分别显示每个核。'},{at:'pidstat -u 1 5',text:'每 1 秒采样一次，共 5 次，显示每个进程的 CPU 使用率，比 top 的瞬时值更稳定。'},{at:'top -H -p 12345',text:'只看 12345 号进程，并按线程显示（-H），找出最忙的线程。'},{at:'go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30',text:'Go 程序：采样 30 秒，看 CPU 时间花在了哪些函数上。'},{at:'perf top -p 12345',text:'通用工具：实时显示这个进程里最耗 CPU 的函数，任何语言写的程序都能用。'}]},
  {title:'load average 高，CPU 却很闲',body:'uptime 或 top 第一行显示的 load average 有三个数，分别是最近 1 分钟、5 分钟、15 分钟的平均负载。\n负载指的是“正在运行的任务数 + 在排队等 CPU 的任务数 + 处于不可中断睡眠（D 状态）的任务数”。一般来说，负载接近 CPU 核数就说明比较满了。\n关键在于：等磁盘 I/O 的 D 状态任务也算在负载里。所以会出现这种情况：一台 8 核机器负载是 20，CPU 使用率却只有 15%。这时问题多半不是 CPU 不够，而是有大量任务卡在等磁盘（或者网络文件系统）上。应该接着用 iostat 看磁盘是不是很忙、用 ps 看有没有很多 D 状态的进程。'},
  {title:'内存：free 很少不一定是坏事',body:'用 free -h 看内存时，经常会吓一跳：used 很高，free 只剩一点点。先别急，看 available 这一列。\nLinux 会把暂时空闲的内存拿去做 page cache（缓存最近读写过的文件内容），这样再读这些文件就不用访问磁盘，速度快很多。这部分内存算在 buff/cache 里，free 就显得很少。但程序需要内存时，内核会马上把缓存让出来。\navailable 就是“程序现在还能用的内存”，它包括了可以回收的缓存。所以 free 很少、available 很大，说明一切正常，只是缓存占得多。\n真正要关注的是：available 持续下降、某个进程的 RSS（实际占用的物理内存）一直上涨，或者系统日志里出现了 OOM（内存耗尽，进程被内核杀掉）的记录。可以用 dmesg | grep -i oom 查看。',code:`free -h
ps aux --sort=-rss | head -5
dmesg -T | grep -i "out of memory"`,explain:[{at:'free -h',text:'查看内存总量、已用、空闲、缓存和 available。'},{at:'ps aux --sort=-rss | head -5',text:'按实际占用的物理内存（RSS）从大到小排序，看前几个进程。'},{at:'dmesg -T | grep -i "out of memory"',text:'查看内核日志里有没有 OOM 记录，-T 显示可读的时间。能看到是哪个进程被杀掉了。'}]},
  {title:'磁盘 I/O：谁在拼命读写',body:'怀疑磁盘是瓶颈时（比如 iowait 高、很多 D 状态进程），用 iostat 看每块磁盘有多忙：\n%util：磁盘忙碌的时间比例，长期接近 100% 说明很忙（对 SSD 来说只能参考）；\nr_await、w_await：每次读、写请求的平均等待时间（毫秒），突然变大说明磁盘跟不上了；\naqu-sz：排队等待的请求数。\n然后用 pidstat -d 或 iotop 找出是哪个进程在大量读写。常见原因：日志打得太多、数据库在做大查询或者备份、某个程序在疯狂写临时文件。',code:`iostat -xz 1
pidstat -d 1`,explain:[{at:'iostat -xz 1',text:'-x 显示详细指标，-z 不显示没有活动的设备，每 1 秒刷新一次。'},{at:'pidstat -d 1',text:'每秒显示每个进程的磁盘读写速度，找出 I/O 大户。'}]}
 ],quiz:[
  {id:'be-linux-1',q:'要实时查看一个会按天轮转的日志文件的新内容，应该用？',options:['tail -f app.log','tail -F app.log','less app.log','cat app.log'],why:['-f 跟随的是文件句柄，日志轮转后仍盯着旧文件，看不到新内容。','','less 默认不会自动刷新新内容。','cat 输出当前内容后就结束了。'],answer:1,explain:'-F 按文件名跟随，文件被轮转替换后会自动打开新文件。',interview:'q-076449b355ef6734'},
  {id:'be-linux-2',q:'cmd 2>&1 >out.log 执行后，错误信息会出现在哪里？',options:['out.log 文件中','终端屏幕上','终端和文件中都有','错误信息会丢失'],why:['2>&1 执行时标准输出还指向终端，之后才把 1 改到文件，错误输出不受影响。','','每个输出流只会指向一个目标。','错误信息仍然输出到终端，没有丢失。'],answer:1,explain:'重定向从左到右执行。想让两种输出都进文件，要写 cmd >out.log 2>&1。',interview:'q-f5db80a74a10c0eb'},
  {id:'be-linux-3',type:'judge',q:'kill -9（SIGKILL）可以被程序捕获并执行清理逻辑。',answer:false,explain:'SIGKILL 和 SIGSTOP 不能被捕获或忽略；停止服务应先发 SIGTERM 让程序优雅退出。',interview:'q-4e7ba0cd44f8f0c2'},
  {id:'be-linux-4',q:'rm 删除了一个 20GB 的日志文件，df 显示磁盘空间没有减少。最可能的原因是？',options:['rm 删除命令没有执行成功','仍有进程打开着这个文件','磁盘出现了硬件故障','需要重启系统才能生效'],why:['文件已经从目录中消失，删除是成功的。','','磁盘故障不会表现为删除后空间不释放。','重启能释放空间是因为进程被关闭了，但并非必须重启，找到进程即可。'],answer:1,explain:'用 lsof +L1 找到持有已删除文件的进程，让它重新打开日志或重启该服务。',interview:'q-d17fdfcf3be09b46'},
  {id:'be-linux-5',type:'multi',q:'关于硬链接和软链接，下面哪些说法正确？（多选）',options:['硬链接和原文件指向同一个 inode','删除原文件后硬链接仍能访问内容','软链接可以跨文件系统、指向目录','硬链接不能跨文件系统创建'],why:['','','',''],answers:[0,1,2,3],explain:'硬链接是同一个 inode 的另一个名字，只能在同一文件系统内；软链接保存的是路径，可以跨文件系统，但目标删除后会变成悬空链接。',interview:'q-945fd8838f586e85'},
  {id:'be-linux-6',q:'一台 8 核机器 load average 是 20，但 CPU 使用率只有 15%。最可能是什么情况？',options:['CPU 计算资源严重不足','许多任务在等 I/O，计入 load','监控系统采集的数据出错了','机器配置的内存容量太多了'],why:['CPU 使用率只有 15%，计算资源并不紧张。','','两个指标的含义不同，同时出现是正常的。','内存多不会让 load 升高。'],answer:1,explain:'Linux 的 load 包括可运行和不可中断睡眠（等 I/O）的任务；要结合 iowait、iostat 判断是否是 I/O 瓶颈。',interview:'q-94fc03cdda96b367'},
  {id:'be-linux-7',q:'free 显示 used 很高、free 很少，但 available 很大。这说明？',options:['内存马上就要不够用了','大部分是可回收的页缓存','程序发生了内存泄漏','swap 交换分区出了问题'],why:['available 很大，说明实际可用的内存是充足的。','','页缓存占用不是泄漏，需要时内核会回收。','free 的输出与 swap 是否损坏无关。'],answer:1,explain:'Linux 会用空闲内存做文件缓存，需要时可以回收；判断是否够用要看 available。',interview:'q-5507ee2fe6c6f2a9'},
  {id:'be-linux-8',type:'fill',q:'查看本机所有正在监听的 TCP 端口及对应进程，常用命令是 ss -____。',accepted:['lntp','tlnp','ltnp','ntlp'],explain:'-l 监听，-n 数字显示，-t TCP，-p 显示进程。',interview:'q-eedf93d3b0d049a4'},
  {id:'be-linux-9',q:'crontab 里的脚本手动执行正常，定时执行却失败了。最常见的原因是？',options:['cron 服务调度执行得太慢','cron 环境变量少，找不到命令','脚本的内容写得太长了','服务器的磁盘空间已经满了'],why:['执行时间早晚不会导致脚本失败。','','脚本长度不影响能否执行。','磁盘满时手动执行也会失败，不会只在定时任务中出错。'],answer:1,explain:'cron 的 PATH 很短，也不会加载你的配置；在脚本里使用绝对路径、显式设置环境变量，并把输出重定向到日志。',interview:'q-785843ed24adfb0e'},
  {id:'be-linux-10',type:'short',q:'线上一台服务器 CPU 突然 100%，请说出你的排查步骤。',reference:'先用 top 或 mpstat 看是用户态、内核态、iowait 还是 steal 高；用 top 找到 CPU 最高的进程，再用 top -H -p PID 或 pidstat -t 找到具体线程。用户态高：用 perf 或语言自带的 profiler（Go 用 pprof 的 CPU profile）找热点函数，看是否有死循环、频繁分配或正则回溯；内核态高：检查系统调用、网络包量和上下文切换。先保留现场证据，必要时限流或扩容止血，修复后用同样负载验证。',points:['先分清用户态/内核态/iowait/steal','定位进程再定位线程','perf / pprof 找热点','保留证据，先止血','修复后验证'],explain:'有步骤、有工具、有止血和验证，就是完整答案。',interview:'q-b515960b47d0fb77'},
 ]},
 {id:'be-network',title:'TCP/IP 与传输层',summary:'IP、TCP 握手挥手、可靠传输与拥塞控制、UDP 与 Keepalive',lessons:[
  {title:'这一关学什么：数据是怎么在网络上跑的',body:'后端服务之间、浏览器和服务器之间的所有通信，几乎都建立在 TCP/IP 之上。线上很多问题，比如连接超时、大量 TIME_WAIT、收到的数据“粘”在一起，都要懂一点网络原理才能看明白。\n这一关讲：\n一、网络分层，IP 和端口分别负责什么；\n二、TCP 的三次握手、四次挥手和 TIME_WAIT；\n三、TCP 怎么保证可靠、怎么做流量控制和拥塞控制；\n四、TCP 是字节流，为什么会“粘包”，怎么分帧；\n五、UDP、Keepalive，以及从输入网址到页面显示的全过程。'},
  {title:'网络分层：每一层只管一件事',body:'网络通信被分成几层，每一层只负责自己的事，下层为上层提供服务。常用的是四层模型：\n应用层：具体的业务协议，比如 HTTP、DNS、MySQL 的通信协议；\n传输层：负责“把数据交给对方机器上的哪个程序”，靠端口号区分，主要是 TCP 和 UDP；\n网络层：负责“把数据从一台机器送到另一台机器”，靠 IP 地址寻址，中间经过一个个路由器转发；\n链路层：负责同一个局域网内相邻设备之间的传输，比如以太网、Wi-Fi，靠 MAC 地址。\n发送数据时从上往下，每层加上自己的“头部”信息；接收时从下往上，每层拆掉自己的头部，交给上一层。IP 地址加端口号，就能唯一确定一台机器上的一个程序。'},
  {title:'三次握手：建立连接',body:'TCP 是“面向连接”的：真正传数据之前，双方要先建立连接，确认彼此都能收能发，并交换各自的起始序列号（序列号用来给传输的字节编号，保证顺序和不丢）。这个过程叫三次握手：\n第一次：客户端发 SYN，带上自己的起始序号，意思是“我想和你建立连接”；\n第二次：服务端回 SYN+ACK，确认收到了客户端的序号，同时带上自己的起始序号；\n第三次：客户端回 ACK，确认收到了服务端的序号。\n为什么不能只握两次？两次握手时，服务端发出的序号没有得到客户端的确认；而且如果网络里有一个很久以前滞留的旧 SYN 突然到达，服务端会误以为有新连接，白白建立并等待。第三次确认能让客户端拒绝这种过期的连接请求。'},
  {title:'四次挥手和 TIME_WAIT',body:'TCP 连接是双向的，关闭时两个方向要各自关闭，所以需要四次：\n一、主动关闭方发 FIN：“我没有数据要发了”；\n二、对方回 ACK：“收到”。但对方可能还有数据没发完，可以继续发；\n三、对方也发完了，发 FIN：“我也没有了”；\n四、主动关闭方回 ACK。\n发完最后一个 ACK 后，主动关闭的一方不会立刻释放连接，而是进入 TIME_WAIT 状态，等待 2 倍的 MSL（报文在网络中最长的存活时间，Linux 上 TIME_WAIT 约 60 秒）。原因有两个：\n一、如果最后的 ACK 丢了，对方会重发 FIN，这时还能再回一次 ACK；\n二、等这条旧连接在网络里残留的报文都过期，避免它们被误认为是同一个地址和端口上新连接的数据。\n所以服务器上如果有大量 TIME_WAIT，说明是服务器在主动关闭连接，常见于短连接、或者服务器作为客户端频繁调用别的服务。解决办法是用长连接、连接池复用连接。'},
  {title:'可靠传输：序号、确认和重传',body:'IP 层只负责尽力投递，数据包可能丢失、重复、乱序。TCP 在它之上保证数据可靠、有序地到达：\n序列号：给发送的每个字节编号，接收方按编号重新排好顺序，并丢掉重复的；\n确认（ACK）：接收方告诉发送方“编号 N 之前的数据我都收到了”；\n重传：发送方一段时间内没收到确认，就认为丢了，重新发送；\n校验和：检查数据在传输中有没有出错。\n要注意 ACK 的含义：它只表示对方的“操作系统”已经收到这些数据、放进了接收缓冲区，并不代表对方的应用程序已经读取，更不代表已经处理完了。所以业务上“对方确实处理成功了”，需要应用层自己的确认，比如 HTTP 响应。'},
  {title:'流量控制和拥塞控制',body:'流量控制：防止发送方发得太快，把接收方撑爆。接收方在每个 ACK 里告诉发送方“我的接收缓冲区还剩多少空间”（接收窗口），发送方发出去但还没被确认的数据量不能超过它。\n拥塞控制：防止发送方发得太快，把整个网络堵死。发送方自己维护一个“拥塞窗口”，根据网络状况调整：\n慢启动：刚开始时窗口很小，每收到一轮确认就翻倍，指数增长，快速试探网络能承受多少；\n拥塞避免：窗口涨到一个阈值后，改成每轮只加一点，线性增长；\n超时重传：说明网络严重拥塞，阈值减半，窗口退回到很小，重新慢启动；\n快重传和快恢复：连续收到 3 个重复的 ACK，说明某个包丢了但网络还算通畅，不等超时就立刻重传这个包，窗口减半后继续线性增长，而不是退回到最小。\n实际可以发送的数据量，取接收窗口和拥塞窗口中较小的那个。'},
  {title:'TCP 是字节流：“粘包”是怎么回事',body:'TCP 传输的是一串连续的字节流，它只保证这些字节按顺序、不丢失地到达，并不知道哪里是一条消息的开始和结束，没有“消息边界”。\n所以客户端分两次发送的 hello 和 world，服务端可能一次 read 就读到了 helloworld（常说的“粘包”）；反过来，一条很长的消息也可能要读好几次才能读完（“拆包”）。这不是 TCP 的 bug，而是它本来就这样设计的。\n解决办法是应用层自己“分帧”，约定好每条消息怎么切分：\n一、长度前缀：每条消息前面先放一个固定长度（比如 4 字节）的数字，表示后面这条消息有多少字节。接收方先读 4 字节得到长度，再读出正好这么多字节；\n二、分隔符：用一个特殊字符结尾，比如换行符，Redis 的协议和很多文本协议都是这样做的。\nHTTP、gRPC 等协议都已经帮你处理好了分帧，自己直接用 TCP 写通信程序时才需要考虑。'},
  {title:'动手试试：亲眼看到“粘包”，再用长度前缀解决',body:'我们在一个 Python 程序里同时启动服务端和客户端（都在本机）。第一次，客户端连着发 hello 和 world 两条消息，服务端稍等一下再读，会一次收到粘在一起的数据。第二次，每条消息前面加上 4 字节的长度，服务端按长度分帧，就能准确地拆出每一条。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 frame.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python frame.py（Mac 用 python3 frame.py），对照下面的输出。','把 plain_server 里的 time.sleep(0.3) 删掉再运行几次，看看结果是不是每次都一样。'],expect:'不分帧，一次 recv 收到： b\'helloworld\'\n按长度分帧收到： 你好\n按长度分帧收到： TCP'},code:`import socket
import struct
import threading
import time

def plain_server(srv):
    conn, _ = srv.accept()
    time.sleep(0.3)
    print("不分帧，一次 recv 收到：", conn.recv(1024))
    conn.close()

def framed_server(srv):
    conn, _ = srv.accept()
    reader = conn.makefile("rb")
    for _ in range(2):
        size = struct.unpack("!I", reader.read(4))[0]
        print("按长度分帧收到：", reader.read(size).decode())
    conn.close()

def run(handler, payloads):
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen()
    t = threading.Thread(target=handler, args=(srv,))
    t.start()
    cli = socket.create_connection(srv.getsockname())
    for p in payloads:
        cli.sendall(p)
    t.join()
    cli.close()
    srv.close()

run(plain_server, [b"hello", b"world"])
msgs = ["你好", "TCP"]
run(framed_server, [struct.pack("!I", len(m.encode())) + m.encode() for m in msgs])`,explain:[{at:'import socket',text:'socket 是 Python 里做网络通信的基础模块。'},{at:'import struct',text:'struct 用来把数字和固定长度的字节互相转换。'},{at:'import threading',to:'import time',text:'用线程让服务端和客户端在同一个程序里同时运行；time 用来稍等一下。'},{at:'def plain_server(srv):',text:'第一个服务端：不做任何分帧。'},{at:'conn, _ = srv.accept()',text:'等待并接受客户端的连接，conn 用来和这个客户端收发数据。'},{at:'time.sleep(0.3)',text:'故意等 0.3 秒，让客户端的两条消息都先到达服务端的接收缓冲区。'},{at:'print("不分帧，一次 recv 收到：", conn.recv(1024))',text:'最多读 1024 字节：两条消息被一次读了出来，粘成了 helloworld，已经分不清哪里是第一条的结尾。'},{at:'conn.close()',text:'关闭连接。'},{at:'def framed_server(srv):',text:'第二个服务端：按长度前缀分帧。'},{at:'conn, _ = srv.accept()',text:'接受连接。'},{at:'reader = conn.makefile("rb")',text:'把连接包装成一个可以“读出指定字节数”的文件对象，read(n) 会一直等到读满 n 个字节。'},{at:'for _ in range(2):',text:'读两条消息。'},{at:'size = struct.unpack("!I", reader.read(4))[0]',text:'先读 4 个字节，按“网络字节序的无符号整数”（!I）解析出这条消息的长度。'},{at:'print("按长度分帧收到：", reader.read(size).decode())',text:'再读出正好 size 个字节，就是一条完整的消息，转成字符串打印。'},{at:'conn.close()',text:'关闭连接。'},{at:'def run(handler, payloads):',text:'一个小工具：启动指定的服务端，再用客户端把 payloads 依次发过去。'},{at:'srv = socket.socket()',to:'srv.listen()',text:'创建 TCP 服务端，绑定本机地址。端口写 0 表示让系统随便分配一个空闲端口，然后开始监听。'},{at:'t = threading.Thread(target=handler, args=(srv,))',to:'t.start()',text:'在另一个线程里运行服务端处理函数。'},{at:'cli = socket.create_connection(srv.getsockname())',text:'客户端连接到服务端的地址（三次握手就发生在这里）。'},{at:'for p in payloads:',to:'cli.sendall(p)',text:'把每条数据依次发出去。'},{at:'t.join()',to:'srv.close()',text:'等服务端处理完，然后关闭客户端和服务端。'},{at:'run(plain_server, [b"hello", b"world"])',text:'实验一：分两次发送 hello 和 world。'},{at:'msgs = ["你好", "TCP"]',text:'实验二要发送的两条消息。'},{at:'run(framed_server, [struct.pack("!I", len(m.encode())) + m.encode() for m in msgs])',text:'每条消息先转成字节，在前面加上 4 字节的长度再发送。“你好”是 6 个字节，“TCP”是 3 个字节。'}]},
  {title:'UDP：不建连接，发了就走',body:'UDP 是传输层的另一个协议，和 TCP 正好相反：不需要建立连接，不保证送达、不保证顺序、不重传，也没有拥塞控制。但它头部很小、延迟很低，而且保留消息边界：发送一次就是一个完整的数据包，不会粘在一起。\n适合 UDP 的场景：DNS 查询（一问一答，很短）、视频通话和直播（晚到的数据不如不要）、在线游戏的实时状态同步。\nDNS 默认使用 UDP 的 53 端口；当响应太大（比如超过 512 字节，或者做区域传送）时会改用 TCP。\nHTTP/3 用的 QUIC 协议也是基于 UDP 的，它在应用层自己实现了可靠传输和拥塞控制。'},
  {title:'TCP Keepalive 和应用层心跳',body:'一条 TCP 连接如果长时间没有数据往来，双方都无法知道对方是不是还活着：对方机器可能已经断电了，或者中间的防火墙、NAT 设备早就把这条连接的记录删掉了。\nTCP Keepalive：连接空闲一段时间后（Linux 默认 2 小时），操作系统自动发送探测包，对方不回应就认为连接已经断了。默认时间太长，通常要调短。\n应用层心跳：更常用的做法是业务自己定时发一个很小的“心跳”消息，比如每 30 秒一次，几次收不到回应就主动断开重连。它还能检测到“连接还在但对方程序已经卡死”的情况，这是 TCP Keepalive 发现不了的。\n数据库连接池、长连接的 RPC 框架、WebSocket 都会做心跳保活。'},
  {title:'ping 得通，端口却连不上',body:'一个常见的排查场景：ping 服务器能通，但 curl 它的 8080 端口一直超时。\nping 用的是 ICMP 协议，只说明网络层是通的，两台机器之间的路由没问题。端口连不上，问题在传输层或者应用本身：\n一、防火墙或云服务器的安全组没有放行 8080 端口，数据包被直接丢弃，所以表现为超时；\n二、服务根本没在运行，或者监听的是 127.0.0.1（只接受本机连接），而不是 0.0.0.0（接受所有网卡的连接）。这种情况通常会立刻返回 Connection refused（连接被拒绝），而不是超时；\n排查步骤：在服务器上用 ss -lntp 确认服务确实在监听，并且监听地址正确；在服务器本机 curl localhost:8080 看服务是否正常；最后检查防火墙和安全组规则。',code:`ping 10.0.0.5
curl -v --connect-timeout 3 http://10.0.0.5:8080/health
ss -lntp | grep 8080
nc -zv 10.0.0.5 8080`,explain:[{at:'ping 10.0.0.5',text:'检查网络层是否可达。'},{at:'curl -v --connect-timeout 3 http://10.0.0.5:8080/health',text:'-v 显示连接的详细过程，最多等 3 秒。看是卡在建立连接（超时）还是被拒绝（refused）。'},{at:'ss -lntp | grep 8080',text:'在服务器上执行：确认有进程在监听 8080，并看监听地址是 0.0.0.0 还是 127.0.0.1。'},{at:'nc -zv 10.0.0.5 8080',text:'用 nc 只测试端口能不能连上，不发送任何数据。'}]},
  {title:'从输入网址到页面显示',body:'在浏览器里输入 https://www.example.com 并回车，大致经过这些步骤：\n一、DNS 解析：浏览器先查自己的缓存和系统的 hosts 文件，没有的话问递归解析器（通常是运营商或公共 DNS）。解析器从根域名服务器问到 .com 顶级域服务器，再问到 example.com 的权威服务器，拿到 IP 地址，并按 TTL 缓存下来；\n二、建立连接：和这个 IP 的 443 端口进行 TCP 三次握手，再进行 TLS 握手：协商加密方式、交换密钥、验证服务器的证书是不是可信的、域名对不对得上。如果是 HTTP/3，则用基于 UDP 的 QUIC，把这两步合在一起，更快；\n三、发送请求：请求可能先到达 CDN 节点，静态资源直接由 CDN 返回；动态请求经过负载均衡，转发到某台后端服务器；\n四、后端处理：查缓存、查数据库，生成响应返回；\n五、浏览器渲染：解析 HTML，构建页面结构，再去加载 CSS、JavaScript、图片等子资源，最后把页面画出来。\n下一关“HTTP、HTTPS 与 DNS”会把其中的 HTTP 部分讲得更细。'}
 ],quiz:[
  {id:'be-network-1',q:'TCP 为什么需要三次握手，而不是两次？',options:['为了让连接建立得更快一些','双方都要确认对方收到了序号','为了在握手过程中完成加密','两次握手其实已经完全足够'],why:['多一次握手只会更慢，不是为了速度。','','TCP 握手不负责加密，加密由 TLS 完成。','两次握手时服务端无法确认客户端收到了自己的序号，迟到的旧 SYN 也会让服务端误建连接。'],answer:1,explain:'第三次 ACK 让服务端确认客户端收到了它的序号；迟到的旧 SYN 也不会让服务端单方面建立连接。',interview:'q-9cafb41f379b66d3'},
  {id:'be-network-2',q:'服务器上出现大量 TIME_WAIT 连接，它们属于哪一方？',options:['被动关闭连接的那一方','主动关闭、发最后 ACK 的一方','发起连接的客户端那一方','中间转发数据的防火墙'],why:['被动关闭的一方会经过 CLOSE_WAIT 和 LAST_ACK，不会进入 TIME_WAIT。','','服务端主动关闭连接时，TIME_WAIT 就出现在服务端。','TIME_WAIT 是通信两端的 TCP 状态，与防火墙无关。'],answer:1,explain:'谁主动关闭谁进入 TIME_WAIT；服务端主动关闭大量短连接时会堆积，应优先使用长连接复用。',interview:'q-d3b1f758513041ee'},
  {id:'be-network-3',type:'judge',q:'TCP 收到对方的 ACK，说明对方的应用程序已经处理了这些数据。',answer:false,explain:'ACK 只表示数据到达了对方的内核协议栈；应用可能还没读，甚至在读之前崩溃。端到端可靠要靠应用层确认。',interview:'q-a78e03291e96f652'},
  {id:'be-network-4',q:'客户端连续发了两条消息，服务端一次 read 收到了两条粘在一起的数据。正确的处理方式是？',options:['让客户端每条消息间 sleep 一下','在应用层协议中分帧','把服务端的读缓冲区调大','这是 TCP 的 bug，需要换协议'],why:['sleep 不能保证消息分开到达，网络和内核仍可能合并或拆分数据。','','缓冲区越大，越可能一次读到多条消息。','TCP 本来就是字节流，不保留消息边界，这是设计如此。'],answer:1,explain:'在消息前加长度字段或使用分隔符，由应用协议自己划分消息边界。',interview:'q-9cafb41f379b66d3'},
  {id:'be-network-5',type:'multi',q:'关于 TCP 拥塞控制，下面哪些说法正确？（多选）',options:['慢启动阶段拥塞窗口约每轮翻倍','超时重传后拥塞窗口会大幅减小','收到 1 个重复 ACK 就立即重传','拥塞控制和流量控制是同一个机制'],why:['','','快重传要收到 3 个重复 ACK 才触发，1 个重复 ACK 可能只是包乱序。','流量控制靠接收窗口保护接收方，拥塞控制靠拥塞窗口保护网络，是两回事。'],answers:[0,1],explain:'流量控制靠接收窗口保护接收方，拥塞控制靠拥塞窗口保护网络，是两回事。',interview:'q-dd0a574cb5397142'},
  {id:'be-network-6',q:'HTTP/2 已经多路复用了，HTTP/3 为什么还要换成 QUIC？',options:['为了兼容老旧的浏览器','TCP 丢包时所有流都要等待','HTTP/2 不支持加密传输','QUIC 能大幅减少带宽消耗'],why:['QUIC 是更新的协议，旧浏览器反而不支持。','','HTTP/2 在浏览器中实际都运行在 TLS 之上。','QUIC 的主要收益是延迟和抗丢包，不是节省带宽。'],answer:1,explain:'HTTP/2 底层仍是 TCP，一个包丢了整条连接上的所有流都要等（队头阻塞）；QUIC 让每个流独立重传，握手更快，还支持网络切换时连接不断。',interview:'q-467a0dc0db3571c5'},
  {id:'be-network-7',q:'HTTPS 建立连接比 HTTP 多了什么？',options:['和 HTTP 相比什么都没多','多了 TLS 握手和证书验证','多了一次 DNS 域名查询','多了一次 TCP 三次握手'],why:['HTTPS 需要额外的 TLS 握手。','','DNS 查询次数与是否使用 HTTPS 无关。','TCP 握手只有一次，TLS 握手在它之上进行。'],answer:1,explain:'TLS 握手协商加密参数和密钥、验证服务器证书和域名；之后的 HTTP 内容都会加密。',interview:'q-712d081146d2d5cd'},
  {id:'be-network-8',type:'fill',q:'DNS 查询默认使用 UDP 的 ____ 端口，响应过大时会改用 TCP。',accepted:['53'],explain:'TCP 和 UDP 的 53 端口可以同时被 DNS 服务监听，它们是独立的端口空间。',interview:'q-cb0c4508f2549bbd'},
  {id:'be-network-9',q:'ping 一台服务器能通，但 curl 它的 8080 端口超时。最可能的原因是？',options:['网络已经完全断开不通了','ICMP 通不代表 TCP 端口可达','DNS 把域名解析到了错误地址','ping 命令本身的结果有问题'],why:['ping 能通说明网络层是连通的。','','ping 同一个地址能通，说明解析结果是能访问的。','ping 只是验证了 ICMP 路径，结果本身没有问题。'],answer:1,explain:'可能是服务没启动、端口没监听，或被防火墙、安全组拦截；用 ss -lntp 查看监听，再检查防火墙规则。',interview:'q-7eaa08c3883d24fd'},
  {id:'be-network-10',type:'short',q:'在浏览器输入一个 https 网址并回车，到页面显示出来，中间发生了什么？',reference:'浏览器解析 URL，检查 HSTS、缓存和 Service Worker；需要联网时做 DNS 解析（浏览器缓存、系统缓存、递归解析器向根、顶级域、权威服务器查询）；建立 TCP 连接并完成 TLS 握手（HTTP/3 则是 QUIC），或复用已有连接；发送 HTTP 请求，经过 CDN、负载均衡到达后端，后端查询数据后返回响应；浏览器处理重定向、缓存和 Cookie，解析 HTML/CSS 构建 DOM 和 CSSOM，执行 JavaScript，布局、绘制和合成，并继续加载图片等子资源。',points:['缓存与 HSTS 检查','DNS 解析过程','TCP + TLS 或 QUIC','CDN、负载均衡、后端','解析、执行脚本、渲染'],explain:'能把网络、服务端、浏览器三段讲清楚就是好答案。',interview:'q-7314d29f4c8ca639'},
 ]},
 {id:'be-os',title:'操作系统原理',summary:'用户态与内核态、虚拟内存、内存分配、进程通信与调度',lessons:[
  {title:'这一关学什么：操作系统在背后做了什么',body:'你写的程序读一个文件、发一个网络请求、申请一块内存，背后都是操作系统在帮你干活。懂一点操作系统原理，才能解释很多性能问题和面试题。\n这一关讲：\n一、用户态和内核态，系统调用是什么；\n二、进程、线程，以及进程之间怎么通信；\n三、虚拟内存：程序看到的地址和真实的物理内存是什么关系，内存不够时会发生什么，页面置换算法；\n四、I/O 的基本概念：阻塞和非阻塞、同步和异步、写文件什么时候才真正落盘、零拷贝和 DMA。下一关会专门深入讲 I/O 模型和 epoll。'},
  {title:'用户态、内核态和系统调用',body:'为了安全，CPU 把运行的代码分成两种权限：\n用户态：你的程序平时运行的状态，只能访问自己的内存，不能直接操作硬件；\n内核态：操作系统内核运行的状态，可以访问所有内存和硬件。\n程序想读文件、发网络包、申请内存、创建进程，自己没有权限，必须请内核帮忙。这个“请求”就叫系统调用（比如 read、write、open）。系统调用时，CPU 从用户态切换到内核态，内核做完再切换回来。\n除了系统调用，硬件中断（比如网卡收到数据）和异常（比如访问了还没分配物理内存的地址，产生“缺页异常”）也会让 CPU 进入内核态。\n要注意：用户态和内核态之间的切换，不等于进程切换。系统调用通常只是同一个进程在两种状态之间来回，只有当它要等待（比如等磁盘数据），内核才会把它挂起，调度别的进程运行。'},
  {title:'进程和线程',body:'进程是操作系统分配资源的基本单位：每个进程有自己独立的内存空间、打开的文件等资源，进程之间互相隔离，一个进程崩了一般不影响其他进程。\n线程是 CPU 调度执行的基本单位：一个进程里可以有多个线程，它们共享这个进程的内存和资源，所以线程之间交换数据很方便，但也要小心同时修改同一份数据。\n对比一下：\n创建和切换的代价：进程 > 线程 > 协程（比如 Go 的 goroutine，在用户态调度）；\n隔离性：进程最好，一个线程崩溃通常会带着整个进程一起崩溃；\n通信：线程直接读写共享内存，进程之间要借助专门的通信机制。'},
  {title:'进程间通信的几种方式',body:'进程之间的内存是隔离的，要交换数据，需要借助操作系统提供的机制：\n管道：一端写、一端读的字节流。命令行里的 | 就是管道，常用于父子进程之间；\n消息队列：内核里的一个队列，按消息为单位收发；\n共享内存：让两个进程把同一块物理内存映射到各自的地址空间里，一方写了另一方马上能看到，不需要任何拷贝，是最快的方式。但多个进程同时读写要自己加锁同步；\n信号：通知对方发生了某个事件（比如 SIGTERM），只能传一个编号，带不了数据；\nsocket：最通用，不仅能在同一台机器上通信，还能跨机器。\n两个进程要交换大量数据、并且要尽量少拷贝时，最合适的是共享内存。'},
  {title:'动手试试：管道和共享内存',body:'我们用 Python 的 multiprocessing 启动子进程，分别用管道和共享内存和它交换数据。子进程是一个真正独立的进程，有自己的内存空间。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 ipc.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python ipc.py（Mac 用 python3 ipc.py），对照下面的输出。','在 child_shm 里把 HELLO 换成别的 5 个字母，再运行，看看父进程读到的是不是也变了。'],expect:'通过管道收到： 你好，我是子进程\n共享内存被子进程改成了： HELLO'},code:`from multiprocessing import Pipe, Process, shared_memory

def child_pipe(conn):
    conn.send("你好，我是子进程")
    conn.close()

def child_shm(name):
    shm = shared_memory.SharedMemory(name=name)
    shm.buf[:5] = b"HELLO"
    shm.close()

if __name__ == "__main__":
    parent, child = Pipe()
    p = Process(target=child_pipe, args=(child,))
    p.start()
    print("通过管道收到：", parent.recv())
    p.join()

    shm = shared_memory.SharedMemory(create=True, size=5)
    shm.buf[:5] = b"hello"
    p = Process(target=child_shm, args=(shm.name,))
    p.start()
    p.join()
    print("共享内存被子进程改成了：", bytes(shm.buf[:5]).decode())
    shm.close()
    shm.unlink()`,explain:[{at:'from multiprocessing import Pipe, Process, shared_memory',text:'Python 自带的多进程模块：Pipe 管道、Process 子进程、shared_memory 共享内存。'},{at:'def child_pipe(conn):',to:'conn.close()',text:'子进程要运行的函数一：通过管道的一端发送一条消息。'},{at:'def child_shm(name):',text:'子进程要运行的函数二：按名字找到同一块共享内存。'},{at:'shm = shared_memory.SharedMemory(name=name)',text:'打开已经存在的共享内存。'},{at:'shm.buf[:5] = b"HELLO"',text:'直接修改这块内存的前 5 个字节。'},{at:'shm.close()',text:'子进程用完后断开映射（不删除内存）。'},{at:'if __name__ == "__main__":',text:'只有直接运行这个文件时才执行下面的代码。多进程程序必须这样写，因为子进程启动时会重新导入这个文件。'},{at:'parent, child = Pipe()',text:'创建一个管道，得到两端。'},{at:'p = Process(target=child_pipe, args=(child,))',to:'p.start()',text:'启动子进程，把管道的一端交给它。'},{at:'print("通过管道收到：", parent.recv())',text:'父进程从另一端接收，会一直等到有数据。数据在两个进程之间经过了复制。'},{at:'p.join()',text:'等子进程结束。'},{at:'shm = shared_memory.SharedMemory(create=True, size=5)',text:'创建一块 5 字节的共享内存。'},{at:'shm.buf[:5] = b"hello"',text:'父进程先写入小写的 hello。'},{at:'p = Process(target=child_shm, args=(shm.name,))',to:'p.join()',text:'启动子进程，把共享内存的名字传给它，等它改完。'},{at:'print("共享内存被子进程改成了：", bytes(shm.buf[:5]).decode())',text:'父进程直接读同一块内存，看到的是子进程写的 HELLO，没有经过任何复制。'},{at:'shm.close()',to:'shm.unlink()',text:'断开映射，并删除这块共享内存，避免占用系统资源。'}]},
  {title:'虚拟内存：每个程序都以为自己独占内存',body:'程序里用到的内存地址，并不是内存条上真实的物理地址，而是“虚拟地址”。每个进程都有一套自己的虚拟地址空间，好像整台机器的内存都归它一个人用。\nCPU 里有一个叫 MMU（内存管理单元）的硬件，负责把虚拟地址翻译成物理地址，翻译的依据是操作系统为每个进程维护的“页表”。为了加快翻译，MMU 里还有一个小缓存 TLB，存放最近用过的翻译结果。\n这样设计的好处：\n一、隔离：进程 A 根本访问不到进程 B 的内存，一个程序出错不会破坏别的程序；\n二、方便：每个程序都可以从同样的地址开始布局，不用关心物理内存的实际情况；\n三、可以“用多少给多少”，甚至让程序申请的内存超过实际的物理内存。'},
  {title:'分页：内存切成一页一页的',body:'现代操作系统主要用“分页”的方式管理内存：把虚拟内存和物理内存都切成固定大小的“页”（通常 4KB），页表记录每个虚拟页对应哪个物理页。\n因为是按页对应的，程序看起来连续的一大块内存，在物理上可以分散在各个地方，不需要找一整块连续的空闲物理内存，碎片问题小了很多。\n如果程序访问的虚拟页还没有对应的物理页（比如刚申请还没用过，或者被换到了磁盘上），CPU 会产生“缺页异常”，进入内核，由内核分配一个物理页或者从磁盘读回来，然后程序继续执行，程序本身完全感觉不到。'},
  {title:'申请了 8GB，机器只有 4GB 内存',body:'在 4GB 内存的 Linux 上，一个程序成功 malloc（申请）了 8GB 内存，这并不奇怪。\nLinux 默认允许“超额分配”（overcommit）：申请内存时，内核只是在虚拟地址空间里划出一段，并不马上分配物理内存。只有当程序真正往某一页里写数据时，才通过缺页异常分配物理页。很多程序申请了一大块内存，实际只用了一小部分，这样可以更充分地利用内存。\n但如果程序真的把 8GB 都写满了：物理内存不够时，内核会先把一些不常用的页换到磁盘上的 swap（交换空间）里，腾出物理内存，但这会让程序变得非常慢；swap 也不够了，内核就会触发 OOM Killer，挑一个占内存多的进程直接杀掉。\n所以“申请成功”只代表拿到了虚拟地址，不代表物理内存一定够用。'},
  {title:'页面置换：内存满了，换出谁',body:'物理内存满了又需要新的页时，要选一个页换出去（写到磁盘的 swap，或者丢掉可以重新读回的文件页）。选谁换出去，就是页面置换算法要决定的。好的算法能让“缺页”（要用的页不在内存里）的次数尽量少：\nOPT（最优算法）：换出“以后最长时间都不会再用到”的页。缺页最少，但需要预知未来，实际上无法实现，只能作为评价其他算法的标准；\nFIFO（先进先出）：换出最早进入内存的页。简单，但可能把一直在用的常用页换出去；\nLRU（最近最少使用）：换出最久没被访问过的页。效果接近 OPT，但精确记录每次访问的代价太大；\nClock（时钟算法）：LRU 的近似实现。每个页有一个“访问位”，被访问时置 1。像时钟指针一样转圈检查，访问位是 1 的就清成 0 再给一次机会，遇到是 0 的就换出。Linux 实际使用的是类似的近似算法。'},
  {title:'动手试试：比一比三种置换算法',body:'用同一串页面访问序列，内存只能放 3 页，分别模拟 FIFO、LRU 和 OPT，数一数各自缺页了多少次。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 page.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python page.py（Mac 用 python3 page.py），对照下面的输出。','把 FRAMES 改成 4 再运行，看看三种算法的缺页次数分别变成多少。'],expect:'FIFO 缺页次数： 10\nLRU  缺页次数： 9\nOPT  缺页次数： 7'},code:`refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]
FRAMES = 3

def fifo(refs):
    mem, misses = [], 0
    for p in refs:
        if p not in mem:
            misses += 1
            if len(mem) == FRAMES:
                mem.pop(0)
            mem.append(p)
    return misses

def lru(refs):
    mem, misses = [], 0
    for p in refs:
        if p in mem:
            mem.remove(p)
        else:
            misses += 1
            if len(mem) == FRAMES:
                mem.pop(0)
        mem.append(p)
    return misses

def opt(refs):
    mem, misses = [], 0
    for i, p in enumerate(refs):
        if p in mem:
            continue
        misses += 1
        if len(mem) == FRAMES:
            future = refs[i + 1:]
            victim = max(mem, key=lambda q: future.index(q) if q in future else len(future))
            mem.remove(victim)
        mem.append(p)
    return misses

print("FIFO 缺页次数：", fifo(refs))
print("LRU  缺页次数：", lru(refs))
print("OPT  缺页次数：", opt(refs))`,explain:[{at:'refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]',text:'程序依次访问的页号。'},{at:'FRAMES = 3',text:'物理内存最多只能放 3 页。'},{at:'def fifo(refs):',to:'mem, misses = [], 0',text:'FIFO：mem 按进入的先后顺序存放内存中的页，misses 统计缺页次数。'},{at:'for p in refs:',to:'misses += 1',text:'要访问的页不在内存里，就是一次缺页。'},{at:'if len(mem) == FRAMES:',to:'mem.pop(0)',text:'内存满了，换出最前面（最早进来）的页。'},{at:'mem.append(p)',text:'把新页放进内存末尾。'},{at:'return misses',text:'返回缺页次数。'},{at:'def lru(refs):',to:'mem, misses = [], 0',text:'LRU：mem 按“最近访问的时间”排列，最后面的是刚访问过的。'},{at:'for p in refs:',to:'mem.remove(p)',text:'页已经在内存里：先把它从原位置拿出来，后面再放到末尾，表示“刚用过”。'},{at:'else:',to:'mem.pop(0)',text:'不在内存里就是缺页；满了就换出最前面的，也就是最久没被访问的页。'},{at:'mem.append(p)',text:'放到末尾。'},{at:'return misses',text:'返回缺页次数。'},{at:'def opt(refs):',to:'mem, misses = [], 0',text:'OPT：用“未来的信息”做决定。'},{at:'for i, p in enumerate(refs):',to:'continue',text:'页已经在内存里，什么都不用做。'},{at:'misses += 1',text:'缺页。'},{at:'if len(mem) == FRAMES:',to:'future = refs[i + 1:]',text:'内存满了，先取出“之后还要访问的序列”。'},{at:'victim = max(mem, key=lambda q: future.index(q) if q in future else len(future))',text:'对内存里的每一页，看它下一次被用到是在多久以后（以后不再用就当作无穷远），选最远的那个换出。'},{at:'mem.remove(victim)',to:'mem.append(p)',text:'换出它，放入新页。'},{at:'return misses',text:'返回缺页次数。'},{at:'print("FIFO 缺页次数：", fifo(refs))',to:'print("OPT  缺页次数：", opt(refs))',text:'打印对比：OPT 最少，LRU 接近它，FIFO 最多。'}]},
  {title:'阻塞/非阻塞 和 同步/异步，不是一回事',body:'读取网络数据可以分成两个阶段：第一阶段，等数据到达（数据还在路上）；第二阶段，把数据从内核复制到你的程序里。这两组概念说的是不同阶段的事：\n阻塞和非阻塞，说的是第一阶段“数据还没准备好时，调用会不会等”：阻塞的 read 会一直等到有数据；非阻塞的 read 发现没数据就立刻返回一个 EAGAIN 错误，让你过会儿再来。\n同步和异步，说的是“最后谁负责把数据搬回来”：同步是你自己调用 read 把数据读回来，这一步你要等它完成；异步是你提交一个请求就走，内核把数据都准备好、复制到你的缓冲区之后，再通知你“已经完成了”。\n所以 select、poll、epoll 都属于同步 I/O：它们只负责告诉你“哪些连接有数据了”（就绪通知），数据还得你自己调用 read 去读。Linux 的 io_uring 可以做到真正的异步。'},
  {title:'select、poll、epoll',body:'一个服务器要同时管理成千上万个连接，不可能每个连接开一个线程去阻塞地等。I/O 多路复用让一个线程同时“盯着”很多连接，哪个有数据了就处理哪个：\nselect：每次调用都要把要关注的全部连接列表从用户态复制到内核，内核逐个检查，返回后你还要自己遍历一遍才知道是哪些就绪了，而且默认最多只能关注 1024 个；\npoll：去掉了 1024 的数量限制，但每次复制和遍历全部连接的问题还在；\nepoll：用 epoll_ctl 把要关注的连接一次性注册到内核里保存着，之后不用每次都传；有连接就绪时，内核把它放进一个就绪列表，epoll_wait 只返回就绪的那些。连接再多，开销也只和“就绪的连接数”有关，适合大量连接、但同一时刻只有少数活跃的场景。\nGo 的网络库、Nginx、Redis 在 Linux 上都基于 epoll。'},
  {title:'epoll 的边缘触发：一定要读干净',body:'epoll 有两种通知方式：\n水平触发（LT，默认）：只要连接的缓冲区里还有数据没读完，每次调用 epoll_wait 都会再通知你。这次没读完也没关系，下次还会提醒。\n边缘触发（ET）：只有在“状态发生变化”时才通知一次，比如从没数据变成有新数据到达。如果这次通知后你只读了一部分，剩下的数据就不会再触发通知了，直到下次有新数据到来，这部分数据可能就一直“卡”在那里。\n所以使用 ET 模式时，必须把连接设成非阻塞，并且在收到通知后循环读取，一直读到返回 EAGAIN（表示真的读空了）为止。ET 模式的好处是通知次数少，效率更高。'},
  {title:'write 成功了，数据就安全了吗',body:'调用 write 写文件返回成功，通常只说明数据已经复制到了内核的“页缓存”（内存里），并没有真正写到磁盘上。内核会在之后的某个时间，把页缓存里的数据批量写回磁盘。\n分两种情况看：\n一、写完后程序崩溃了，但机器没有断电：数据已经在内核的页缓存里了，内核之后照样会把它写到磁盘，数据不会丢；\n二、写完后机器突然断电：页缓存里还没写回磁盘的数据就丢了。\n如果必须保证数据已经落盘（比如数据库的日志），要在 write 之后调用 fsync，它会等到数据真正写到磁盘才返回。代价是慢，所以数据库会把多个事务的日志合在一起 fsync（组提交）来提高效率。'},
  {title:'零拷贝：少搬几次数据',body:'用最普通的方式把一个文件发送到网络上：先 read 把文件内容从磁盘读到内核的页缓存，再复制到程序自己的缓冲区；然后 write 又把它从程序的缓冲区复制到内核的 socket 缓冲区，最后发给网卡。数据在内核和用户程序之间来回复制了两次，还伴随着多次用户态和内核态的切换，而程序本身根本没有修改这些数据。\n零拷贝就是去掉这些不必要的复制。Linux 的 sendfile 系统调用让内核直接把页缓存里的文件数据送到 socket，完全不经过用户态的缓冲区。Kafka 把消息发给消费者、Nginx 发送静态文件，都用了这种方式，大大减少了 CPU 的消耗。\n下一关“I/O 模型、epoll 与零拷贝”还会更详细地讲 mmap 和 sendfile 的区别。'},
  {title:'DMA：让硬件自己搬数据',body:'早期从磁盘读数据，需要 CPU 亲自一个字节一个字节地把数据从设备搬到内存，CPU 在这期间什么别的事都干不了。\nDMA（直接内存访问）是一种专门负责搬运数据的硬件。CPU 只需要告诉它“从哪个设备、搬多少数据、放到内存的哪个位置”（配置好描述符），之后就去干别的事了。DMA 自己把数据搬完，再通过中断通知 CPU“搬好了”。\n所以“DMA 让 I/O 完全不需要 CPU 参与”这个说法不对：CPU 仍然要负责配置 DMA 和处理完成后的中断，只是省掉了中间最耗时的逐字节搬运工作。网卡、磁盘这些设备都使用 DMA。'}
 ],quiz:[
  {id:'be-os-1',type:'judge',q:'每次系统调用都会导致进程被调度出去，换别的进程运行。',answer:false,explain:'系统调用只是切到内核态执行，完成后回到原进程；只有阻塞等待时才可能发生进程切换。',interview:'q-e589589dbad27964'},
  {id:'be-os-2',q:'两个进程要交换大量数据，而且要求尽量少拷贝。最合适的通信方式是？',options:['发送信号通知对方','通过普通管道传输','共享内存配合锁','通过命名管道传输'],why:['信号只能传递一个编号，无法传输大量数据。','管道需要在内核和进程之间拷贝数据。','','命名管道同样需要拷贝数据。'],answer:2,explain:'共享内存让两个进程映射同一块物理内存，没有数据拷贝，但需要用信号量或锁自己做同步。',interview:'q-d9be8db39304efb7'},
  {id:'be-os-3',q:'在 4GB 内存的 Linux 上，程序成功 malloc 了 8GB。这说明？',options:['系统实际有 8GB 物理内存','先给了虚拟地址，写入时才分配','程序的申请逻辑出错了','系统把内存数据压缩了'],why:['申请成功不代表拿到了物理内存。','','在 overcommit 策略下这是正常行为，不是错误。','内存压缩（如 zram）不是申请成功的原因。'],answer:1,explain:'Linux 按 overcommit 策略先分配虚拟地址，真正写入时才分配物理页；全部写满时可能触发 OOM Killer。',interview:'q-3815bab197131d92'},
  {id:'be-os-4',type:'multi',q:'关于 select、poll、epoll，下面哪些说法正确？（多选）',options:['select 监视的描述符数量有上限','poll 每次仍要传入并扫描整个集合','epoll 只返回就绪的描述符','epoll 会把数据读到用户缓冲区'],why:['','','','epoll 只通知哪些描述符就绪，读数据仍由应用自己调用 read。'],answers:[0,1,2],explain:'三者都是就绪通知，读数据仍由应用自己调用 read。',interview:'q-2c9515ac92903960'},
  {id:'be-os-5',q:'使用 epoll 的边缘触发（ET）模式时，最重要的编程要求是？',options:['使用阻塞模式的 socket','非阻塞读，读到 EAGAIN 为止','每次只从缓冲区读一个字节','必须在单线程中处理事件'],why:['阻塞 socket 在最后一次读时会把线程卡住。','','一次读一个字节效率极低，读不完的数据也不会再收到通知。','ET 模式可以配合多线程使用，单线程不是要求。'],answer:1,explain:'ET 只在状态变化时通知一次，没读完的数据不会再次通知，会导致漏处理。',interview:'q-2c9515ac92903960'},
  {id:'be-os-6',q:'程序调用 write 写文件成功后进程立刻崩溃了（系统没有断电），数据会怎样？',options:['数据随进程一起全部丢失','在页缓存中，稍后写回磁盘','数据只丢失一半','整个文件会被删除'],why:['进程崩溃不影响内核页缓存中的数据。','','数据要么已经交给内核，要么还在用户态缓冲，不会按一半丢失。','进程崩溃不会删除文件。'],answer:1,explain:'系统崩溃或断电时没 fsync 的数据可能丢失；用户态缓冲中还没 write 的数据也会随进程丢失。',interview:'q-4d79d9e36de19dab'},
  {id:'be-os-7',type:'fill',q:'把文件内容直接从内核页缓存发送到 socket、不经过用户态缓冲区的系统调用是 ____。',accepted:['sendfile','sendfile()'],explain:'这就是常说的零拷贝；开启 TLS 或需要修改数据时可能无法使用这条快路径。',interview:'q-1ff0f10ea03551b5'},
  {id:'be-os-8',q:'页面置换算法中，“理论最优但无法实现、只能作为对照”的是？',options:['FIFO 先进先出','LRU 最近最少使用','OPT 最佳置换','Clock 时钟算法'],why:['FIFO 实现简单，但效果较差，还可能出现 Belady 异常。','LRU 是可以实现的常用算法。','','Clock 是 LRU 的近似实现，实际系统广泛使用。'],answer:2,explain:'OPT 淘汰未来最久不会被使用的页，需要预知未来，只能作为评估其他算法的对照。',interview:'q-120d31b841b7fb71'},
  {id:'be-os-9',type:'judge',q:'DMA 让 I/O 完全不需要 CPU 参与。',answer:false,explain:'CPU 仍要配置描述符、处理完成中断和管理缓冲区；DMA 省掉的是逐字节搬运数据的工作。',interview:'q-c27a84be9ecfdf3e'},
  {id:'be-os-10',type:'short',q:'说说阻塞/非阻塞 和 同步/异步 这两组概念的区别，并举例。',reference:'阻塞与非阻塞描述的是“数据还没准备好时调用方怎么等”：阻塞调用会一直等待，非阻塞调用立刻返回 EAGAIN，调用方稍后再试。同步与异步描述的是“最后由谁完成数据搬运”：同步 I/O 中数据由调用方自己 read 出来，即使先通过 epoll 等到了就绪通知；异步 I/O 是提交请求后由内核完成读写，再通知调用方结果已经在缓冲区里，比如 io_uring。所以 epoll + 非阻塞 socket 属于“同步非阻塞”。',points:['阻塞/非阻塞：等待方式','同步/异步：谁完成搬运','epoll 是就绪通知，仍属同步','io_uring 是完成通知','epoll + 非阻塞 = 同步非阻塞'],explain:'两组概念是两个维度，不要混为一谈。',interview:'q-c6f65211e594ea8c'},
 ]},
 {id:'be-mq',title:'消息队列与 Kafka 基础',summary:'为什么用 MQ、怎么选型，Kafka 的存储、写入和高吞吐',lessons:[
  {title:'这一关学什么：让服务之间“留言”而不是“打电话”',body:'服务 A 调用服务 B，最直接的方式是同步调用：A 发请求，一直等到 B 处理完返回结果，就像打电话。消息队列（MQ）则像留言板：A 把消息放进队列就去干别的了，B 有空的时候再去取出来处理。\n这一关讲：\n一、为什么要用消息队列，它带来什么好处和代价，几种常见消息队列怎么选；\n二、Kafka 的基本结构：topic、分区、副本，以及它为什么这么快；\n三、消费组和位移：消息是怎么被分配和记录进度的；\n四、怎么做到不丢、有序、不重复，以及消息积压了怎么办。\n下一关“Kafka 可靠性”会更深入地讲生产和消费两端的配置细节。'},
  {title:'为什么要用消息队列',body:'以“用户下单”为例，下单成功后还要：扣库存、发短信、加积分、通知仓库、写数据分析……如果订单服务挨个同步调用这些服务：任何一个慢了，下单就慢；任何一个挂了，下单就失败；以后每加一个新需求，都要改订单服务。\n引入消息队列后，订单服务只发一条“订单已创建”的消息，谁关心谁去订阅：\n一、解耦：订单服务不需要知道有哪些下游，新增下游不用改它；\n二、削峰：秒杀时瞬间涌入的大量请求先进队列缓冲，下游按自己的能力慢慢处理，不会被冲垮；\n三、异步：发短信、加积分这些不需要马上完成的工作不再拖慢下单；\n四、广播：一个事件可以同时被多个系统消费。\n代价是：数据变成了“最终一致”（下游晚一点才处理），多了一个要维护的组件，还要处理消息丢失、重复、乱序这些新问题。所以必须立刻得到确定结果的操作（比如下单前检查库存够不够），不适合放进消息队列异步处理。'},
  {title:'Kafka、RabbitMQ、RocketMQ 怎么选',body:'Kafka：吞吐量极高，消息持久化保存在磁盘上，可以按位移回放历史消息，生态最完善。适合日志收集、数据管道、事件流、大数据处理，也常用于业务消息；\nRabbitMQ：路由规则非常灵活（可以按规则把消息分发到不同的队列），功能丰富、延迟低，但吞吐量比 Kafka 低。适合业务逻辑复杂、消息量中等的场景；\nRocketMQ：阿里开源，原生支持延迟消息（比如“30 分钟后检查订单是否支付”）和事务消息，在国内电商、金融业务里用得很多。\n选型时主要考虑：消息量有多大、需不需要回放、要不要延迟消息和事务消息、团队熟悉哪一个、运维成本。'},
  {title:'Kafka 的结构：topic、分区和副本',body:'topic（主题）：一类消息的名字，比如 order-events。\n分区（partition）：一个 topic 被分成多个分区，分散在不同的机器（broker）上，这是 Kafka 能水平扩展的关键。每个分区就是一个只能往末尾追加的日志文件，里面的每条消息有一个从 0 开始递增的编号，叫位移（offset）。\n副本（replica）：每个分区可以有多个副本，放在不同的 broker 上。其中一个是 leader，负责处理所有的读写；其他的是 follower，不停地从 leader 拉取数据复制过来。leader 所在的机器挂了，就从跟得上的 follower 里选一个当新的 leader。\n生产者发消息时可以指定一个 key，Kafka 对 key 算哈希来决定发到哪个分区，同一个 key 的消息总是进同一个分区。'},
  {title:'Kafka 为什么这么快',body:'Kafka 单机每秒可以处理几十万甚至上百万条消息，主要靠这几点：\n一、顺序写：每个分区的消息只追加到文件末尾，磁盘顺序写的速度比随机写快很多倍；\n二、批量和压缩：生产者把很多条消息攒成一批再发送，并且整批压缩，大大减少了网络请求次数和传输的数据量；\n三、页缓存：Kafka 不在自己的进程里缓存消息，而是直接利用操作系统的页缓存，刚写入的消息被消费时，通常直接从内存里读；\n四、零拷贝：把消息发给消费者时用 sendfile，数据直接从页缓存送到网络，不经过 Kafka 进程；\n五、分区并行：一个 topic 的多个分区可以分布在多台机器上，同时被多个消费者并行处理。\n文件按大小或时间切成多个 segment（段），每段配一个稀疏索引，按位移查找消息时能快速定位。'},
  {title:'消费组：一个分区只给一个消费者',body:'消费者是按“消费组”（consumer group）来工作的。同一个消费组里的消费者分工合作：一个分区在同一时刻只会分配给组里的一个消费者，这样同一个分区里的消息就是按顺序被处理的。\n所以一个消费组里有效的消费者数量，最多等于分区数量。比如一个 topic 有 6 个分区，组里启动了 10 个消费者，那么只有 6 个能分到分区，另外 4 个只能闲着。想提高消费能力，要同时增加分区数。\n不同的消费组之间互不影响：每个组都会完整地收到 topic 里的全部消息，各自记录自己的进度。比如“积分服务”和“短信服务”是两个消费组，都能收到每一条订单消息。\n组里有消费者加入、退出或者崩溃时，Kafka 会重新分配分区，这个过程叫“重平衡”（rebalance），重平衡期间整个组会短暂地停止消费。'},
  {title:'动手试试：按 key 分区和消费组分配',body:'我们用 Python 模拟 Kafka 的两个规则：生产者按 key 的哈希值选分区，同一个订单的事件都进同一个分区，因此保持顺序；6 个分区分配给 10 个消费者时，有 4 个消费者分不到分区。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 partition.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python partition.py（Mac 用 python3 partition.py），对照下面的输出。','把 PARTITIONS 改成 12 再运行，看看闲着的消费者变成了几个。'],expect:'订单 1001 的事件都在分区 3 ： [\'order-1001 创建\', \'order-1001 支付\', \'order-1001 发货\']\n分到分区的消费者： 6 个\n闲着的消费者： 4 个'},code:`import zlib

PARTITIONS = 6
partitions = [[] for _ in range(PARTITIONS)]

def send(key, value):
    p = zlib.crc32(key.encode()) % PARTITIONS
    partitions[p].append(value)
    return p

for step in ["创建", "支付", "发货"]:
    p = send("order-1001", f"order-1001 {step}")
send("order-2002", "order-2002 创建")
print("订单 1001 的事件都在分区", p, "：", partitions[p])

consumers = [f"消费者{i}" for i in range(1, 11)]
assignment = {c: [] for c in consumers}
for p in range(PARTITIONS):
    assignment[consumers[p % len(consumers)]].append(p)
busy = [c for c, ps in assignment.items() if ps]
print("分到分区的消费者：", len(busy), "个")
print("闲着的消费者：", len(consumers) - len(busy), "个")`,explain:[{at:'import zlib',text:'zlib 里的 crc32 是一个稳定的哈希函数，同样的输入每次都得到同样的结果。'},{at:'PARTITIONS = 6',to:'partitions = [[] for _ in range(PARTITIONS)]',text:'模拟一个有 6 个分区的 topic，每个分区是一个列表，只往末尾追加。'},{at:'def send(key, value):',text:'模拟生产者发送一条消息。'},{at:'p = zlib.crc32(key.encode()) % PARTITIONS',text:'对 key 算哈希再对分区数取余，决定发到哪个分区。同一个 key 永远落在同一个分区。'},{at:'partitions[p].append(value)',to:'return p',text:'追加到这个分区的末尾，返回分区号。'},{at:'for step in ["创建", "支付", "发货"]:',to:'p = send("order-1001", f"order-1001 {step}")',text:'同一个订单依次发送三个事件，key 都是订单号。'},{at:'send("order-2002", "order-2002 创建")',text:'另一个订单，可能落在别的分区。'},{at:'print("订单 1001 的事件都在分区", p, "：", partitions[p])',text:'三个事件都在同一个分区，而且按发送的顺序排列。消费者按顺序读这个分区，就能按顺序处理这个订单的事件。'},{at:'consumers = [f"消费者{i}" for i in range(1, 11)]',text:'同一个消费组里有 10 个消费者。'},{at:'assignment = {c: [] for c in consumers}',text:'记录每个消费者分到了哪些分区。'},{at:'for p in range(PARTITIONS):',to:'assignment[consumers[p % len(consumers)]].append(p)',text:'把 6 个分区轮流分给消费者，每个分区只分给一个消费者。'},{at:'busy = [c for c, ps in assignment.items() if ps]',text:'找出分到了分区的消费者。'},{at:'print("分到分区的消费者：", len(busy), "个")',to:'print("闲着的消费者：", len(consumers) - len(busy), "个")',text:'只有 6 个在工作，4 个闲着：消费者数超过分区数是浪费。'}]},
  {title:'位移：记住“读到哪儿了”',body:'消费者读完消息后，要告诉 Kafka 自己处理到哪里了，这叫“提交位移”（commit offset）。位移保存在 Kafka 内部一个叫 __consumer_offsets 的特殊 topic 里。注意提交的是“下一条要读的位置”：处理完了位移为 5 的消息，提交的是 6。\n消费者重启或者分区被重新分配给别人时，就从提交的位移继续读。\n提交的时机决定了出问题时的结果：\n先处理、再提交：如果处理完了、还没来得及提交就崩溃了，重启后会从旧位移开始，把这条消息再处理一次。消息不会丢，但可能重复，这叫“至少一次”；\n先提交、再处理：如果提交后、处理完之前崩溃了，重启后会从新位移开始，这条消息就再也不会被处理了，也就是丢了，这叫“至多一次”。\n业务上一般选择“至少一次”，再在消费端做好去重。'},
  {title:'消费太慢被踢出组',body:'消费者每次调用 poll 拉取一批消息，处理完再拉下一批。如果两次 poll 之间的间隔超过了 max.poll.interval.ms（默认 5 分钟），Kafka 会认为这个消费者“卡死了”，把它踢出消费组，触发重平衡，把它的分区分给别人。\n被踢的消费者处理完的消息也来不及提交位移，新的消费者会重新处理这一批，于是消息被重复处理。如果每批都处理很慢，就会陷入“被踢 → 重平衡 → 再被踢”的循环，整个组都在不停地重平衡，几乎不消费了。\n解决办法：\n一、调小 max.poll.records，每次少拉一些消息，确保一批能在时间限制内处理完；\n二、优化处理逻辑，比如批量写数据库；\n三、确实需要很长时间的任务，可以适当调大 max.poll.interval.ms，或者把消息交给单独的线程池处理，同时注意位移要在真正处理完之后才提交。'},
  {title:'不丢、有序、不重复',body:'不丢：三个环节都要做好。生产端设置 acks=all，等 ISR（和 leader 保持同步的副本集合）里的副本都确认写入才算成功，并开启幂等；broker 端每个分区设置多个副本，并配置 min.insync.replicas（比如 2），至少要有这么多副本同步写入才接受；消费端先处理成功、再提交位移。\n有序：Kafka 只保证同一个分区内的消息是有序的，不同分区之间没有顺序。所以要保证同一个订单的“创建、支付、发货”按顺序处理，就用订单号作为 key，让它们进同一个分区，并且由同一个消费者按顺序处理。\n不重复：在分布式环境里，网络重试、重平衡都可能导致消息重复投递，“恰好一次”很难在整个链路上保证。实际的做法是按“至少一次”来设计，在消费端做幂等：同一条消息处理多少次，结果都和处理一次一样。'},
  {title:'消费端幂等：最可靠的去重方式',body:'最可靠的去重方式是：每个事件带一个唯一的 ID；数据库里建一张“已处理事件表”，事件 ID 设成唯一约束；处理消息时，在同一个数据库事务里，先插入事件 ID，再做业务修改。\n第一次处理时插入成功，业务修改也随之生效；重复的消息再来时，插入事件 ID 会因为唯一约束冲突而失败，整个事务回滚，业务修改也就不会执行第二次。\n为什么一定要放在同一个事务里？如果分开做，比如先改业务数据、再记录事件 ID，两步之间崩溃了，下次重复的消息来了查不到记录，就又改了一次。只放在 Redis 里判断“处理过没有”也不够可靠，Redis 和数据库之间同样可能不一致。'},
  {title:'动手试试：重复的消息只生效一次',body:'我们用 SQLite 模拟一个积分服务：消息 e1 被重复投递了两次。用“已处理事件表 + 唯一约束 + 同一个事务”的方法，看看积分是不是只加了一次。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 dedup.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python dedup.py（Mac 用 python3 dedup.py），对照下面的输出。','把 handle 里 INSERT INTO processed 这一行删掉再运行，看看小明的积分变成了多少。'],expect:'处理 e1：加 10 分\n处理 e2：加 5 分\n跳过 e1：已经处理过\n小明的积分： 15'},code:`import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE processed (event_id TEXT PRIMARY KEY)")
db.execute("CREATE TABLE account (user TEXT PRIMARY KEY, points INTEGER)")
db.execute("INSERT INTO account VALUES ('小明', 0)")

def handle(event_id, user, points):
    try:
        with db:
            db.execute("INSERT INTO processed VALUES (?)", (event_id,))
            db.execute("UPDATE account SET points = points + ? WHERE user = ?", (points, user))
        print(f"处理 {event_id}：加 {points} 分")
    except sqlite3.IntegrityError:
        print(f"跳过 {event_id}：已经处理过")

messages = [("e1", "小明", 10), ("e2", "小明", 5), ("e1", "小明", 10)]
for m in messages:
    handle(*m)
print("小明的积分：", db.execute("SELECT points FROM account").fetchone()[0])`,explain:[{at:'import sqlite3',text:'用 Python 自带的 SQLite 模拟数据库。'},{at:'db = sqlite3.connect(":memory:")',text:'创建一个内存数据库。'},{at:'db.execute("CREATE TABLE processed (event_id TEXT PRIMARY KEY)")',text:'已处理事件表：事件 ID 是主键，同一个 ID 不能插入两次。'},{at:'db.execute("CREATE TABLE account',to:'db.execute("INSERT INTO account VALUES',text:'积分表，小明一开始 0 分。'},{at:'def handle(event_id, user, points):',text:'处理一条“给某人加积分”的消息。'},{at:'try:',to:'with db:',text:'with db 表示下面的操作在同一个事务里：全部成功就提交，出错就全部回滚。'},{at:'db.execute("INSERT INTO processed VALUES (?)", (event_id,))',text:'先记录事件 ID。重复的 ID 在这里就会违反主键约束，抛出 IntegrityError。'},{at:'db.execute("UPDATE account SET points',text:'再加积分。和上一步在同一个事务里，要么一起生效，要么一起撤销。'},{at:'print(f"处理 {event_id}：加 {points} 分")',text:'处理成功。'},{at:'except sqlite3.IntegrityError:',to:'print(f"跳过 {event_id}：已经处理过")',text:'事件 ID 重复，事务回滚，积分不会再加，直接跳过。这时仍然应该正常提交位移，否则这条消息会被一直重试。'},{at:'messages = [("e1", "小明", 10), ("e2", "小明", 5), ("e1", "小明", 10)]',text:'模拟收到的三条消息，其中 e1 被重复投递了。'},{at:'for m in messages:',to:'handle(*m)',text:'依次处理。*m 把元组拆开作为三个参数传入。'},{at:'print("小明的积分：", db.execute("SELECT points FROM account").fetchone()[0])',text:'最终是 15 分：e1 只生效了一次。'}]},
  {title:'消息积压了怎么办',body:'消息积压是指消费者的进度（lag，落后的消息数量）持续上涨，消息越堆越多。处理思路：\n一、先找原因：是生产者的发送量突然暴涨了（比如做活动）？是部分消费者挂了、或者一直在重平衡？还是下游（数据库、外部接口）变慢了，拖慢了消费速度？看监控里生产速率、消费速率和消费者日志就能判断；\n二、对症处理：消费者故障就恢复它；处理逻辑慢就优化，比如批量写数据库；\n三、扩容消费者，但要记住数量不能超过分区数，超过的会闲着。分区太少时，可以临时把消息转发到一个分区更多的新 topic，再用更多的消费者处理；\n四、保护下游：消费加速后，不要把下游的数据库或接口打垮，必要时限流；\n五、如果业务允许，对已经过时没有价值的消息可以跳过，先处理最新的；\n六、事后补上 lag 告警，在积压刚开始时就发现。'}
 ],quiz:[
  {id:'be-mq-1',type:'multi',q:'下面哪些场景适合引入消息队列？（多选）',options:['下单后异步发短信、加积分','秒杀时削峰，缓冲后慢慢处理','转账前实时校验余额是否充足','查询商品详情这类要立即返回的读请求'],why:['','','余额校验必须同步得到结果再决定是否转账，放进 MQ 会失去即时结果。','读请求需要马上返回数据给用户，异步化反而增加延迟和复杂度，应该用缓存优化。'],answers:[0,1],explain:'MQ 适合异步解耦、削峰填谷、日志和事件流；需要实时结果的校验和读请求不适合。',interview:'q-e6c72f010b0cee81'},
  {id:'be-mq-2',q:'Kafka 吞吐量高的主要原因不包括？',options:['分区日志只追加，顺序写磁盘','批量发送并压缩消息','利用页缓存和 sendfile 零拷贝','每条消息立即 fsync 到所有副本'],why:['顺序写是 Kafka 高吞吐的重要原因。','批量和压缩减少了网络与磁盘的开销，是高吞吐的原因之一。','页缓存和零拷贝减少了数据拷贝，是高吞吐的原因之一。',''],answer:3,explain:'每条都同步刷盘会严重拖慢吞吐；Kafka 依靠副本复制保证可靠，而不是每条 fsync。',interview:'q-79e3ddc50f8c1d3d'},
  {id:'be-mq-3',q:'一个 topic 有 6 个分区，同一个消费组里启动了 10 个消费者。会怎样？',options:['10 个消费者平均分担 6 个分区','6 个各分一个分区，4 个闲着','消费组启动失败并报错','每个分区被 10 个消费者同时读取'],why:['同组内一个分区同一时刻只能分给一个消费者，无法再细分。','','消费者多于分区是允许的，只是多出来的会空闲。','同组内每条消息只会给一个消费者，不会被同时读取。'],answer:1,explain:'组内一个分区同一时刻只能分给一个消费者，扩消费者不能超过分区数带来更多并行。',interview:'q-d52b9b98efc875aa'},
  {id:'be-mq-4',type:'judge',q:'消费者处理完消息、提交位移之前崩溃了，重启后这条消息可能会被再消费一次。',answer:true,explain:'这是“至少一次”语义的正常表现，所以消费逻辑必须幂等。',interview:'q-81c178be884a95ad'},
  {id:'be-mq-5',q:'要保证同一个订单的“创建、支付、发货”事件按顺序处理，应该怎么做？',options:['整个 topic 只使用一个分区','以订单号为 key，进同一分区','让消费者处理前 sleep 一下','开启生产者事务保证顺序'],why:['单分区能保证全局有序，但失去了并行度，吞吐受限。','','sleep 不能保证顺序，只会降低处理速度。','事务保证多条消息原子写入，不负责跨分区的顺序。'],answer:1,explain:'Kafka 只保证分区内有序：同一订单用相同的 key，事件进入同一分区，消费端按分区顺序处理。',interview:'q-f46b7545e229dd20'},
  {id:'be-mq-6',type:'fill',q:'Kafka 生产者设置 acks=____，表示要等 ISR 中的副本都确认后才算写入成功。',accepted:['all','-1'],explain:'还要配合 min.insync.replicas 规定最少同步副本数，否则 ISR 只剩 leader 时也会“成功”。',interview:'q-d4f4d2117fb88f36'},
  {id:'be-mq-7',q:'消费者经常因为“处理一批消息太久”被踢出消费组，引发频繁重平衡。最合适的处理是？',options:['只调大 max.poll.interval.ms','减小每批数量并优化处理速度','关闭消费组改为独立消费','增加 topic 的分区数量'],why:['调大超时只是掩盖问题，处理慢的根源还在，故障时重平衡会更久才发现。','','放弃消费组就失去了自动分配和故障转移。','分区多了不会让单个消费者处理一批消息变快。'],answer:1,explain:'减小每批拉取量、优化处理，必要时异步处理并正确提交连续完成的位移；静态成员和协作式分配也能减少重平衡影响。',interview:'q-9b6c6aae2bfba860'},
  {id:'be-mq-8',q:'消息被重复投递时，下面哪种去重方式最可靠？',options:['在内存里记录处理过的 id','先 SETNX 标记再更新数据库','去重记录与业务更新在同一事务','不处理，重复消费影响不大'],why:['内存记录在重启或多实例时就失效了。','两步分开做，标记成功后写库前崩溃，这条消息就再也不会被处理。','','加积分等操作重复执行会导致数据错误。'],answer:2,explain:'同一事务原子地完成“记录已处理”和“业务修改”，唯一约束兜底并发重复。',interview:'q-81c178be884a95ad'},
  {id:'be-mq-9',type:'multi',q:'下面哪些情况可能导致 Kafka 的业务数据“丢失”？（多选）',options:['生产者没等发送结果就退出','acks=1 时 leader 复制前宕机','消费者先提交位移再处理，处理时崩溃','消息超过保留期还没被消费就被清理'],why:['','','',''],answers:[0,1,2,3],explain:'丢失可能发生在生产、存储、消费任何一层，每一层都要配合好。',interview:'q-64d6c9192640528c'},
  {id:'be-mq-10',type:'short',q:'Kafka 出现了严重的消息积压（lag 持续上涨），你会怎么处理？',reference:'先看 lag 增长速度和最旧未处理消息的时间，判断原因：生产量突增、消费者故障或变慢、某个分区是热点、下游数据库或服务变慢。处理：恢复故障的消费者；优化消费逻辑（批量处理、减少外部调用）；在分区数允许的范围内增加消费者；扩容时注意保护下游，别把数据库压垮；把处理失败的“毒消息”隔离到重试队列。必要时延长保留期防止消息过期丢失。长期看要评估分区数和消费能力的规划。',points:['先判断原因','恢复和优化消费者','扩消费者不超过分区数','保护下游，隔离毒消息','延长保留期，做容量规划'],explain:'先止血再根治，别让扩容把下游压垮。',interview:'q-d52b9b98efc875aa'},
 ]},
 {id:'be-ms',title:'微服务架构与治理',summary:'拆分原则、容错限流超时、注册发现、灰度发布与可观测',lessons:[
  {title:'这一关学什么：服务拆开以后，怎么管好它们',body:'业务小的时候，所有功能都写在一个程序里（单体应用），开发和部署都简单。业务和团队变大后，常常会拆成很多个独立的小服务，这就是微服务。拆开之后，原本在一个程序里的函数调用变成了网络调用，会出现很多新问题。\n这一关讲：\n一、什么时候该拆、按什么拆，拆错了有什么信号；\n二、远程调用的容错：超时、重试、熔断、降级、隔离；\n三、限流算法，以及整条调用链怎么共享超时时间；\n四、服务注册发现、灰度发布、可观测性；\n五、跨服务的数据一致性怎么保证。'},
  {title:'单体和微服务：不是越细越好',body:'单体应用：所有功能在一个程序里，一起开发、一起部署。优点是简单：调用就是函数调用，事务就是数据库事务，排查问题也容易。缺点是项目变大后，几十个人改同一个代码库互相影响，任何一个小改动都要整体重新发布，某个功能的流量暴涨也只能整体扩容。\n微服务：按业务拆成多个独立的服务，每个服务有自己的代码、数据库，独立开发、部署和扩容。代价是：网络调用会失败、会变慢；跨服务的数据一致性变难了；需要注册发现、监控、链路追踪等一整套基础设施；排查一个问题可能要跨好几个服务。\n所以微服务不是越早越好、越细越好。团队小、业务还在快速变化时，一个结构清晰的单体往往是更好的选择。'},
  {title:'怎么拆：按业务领域和数据归属',body:'拆分的核心原则是按业务领域和数据的归属来拆：一块业务规则和它所管理的数据，放在同一个服务里。比如订单服务管订单表，库存服务管库存表。\n服务之间只能通过 API 或者事件来交互，绝不能直接读写别人的数据库。否则对方一改表结构，你的服务就坏了，两个服务实际上又耦合在了一起。\n拆错了（或者拆得太细）的典型信号：\n一、两个服务每次都必须一起发布；\n二、两个服务之间调用非常频繁，完成一件事要来回调用好多次；\n三、多个服务共享同一张表，或者一个服务直接读写另一个服务的表。\n比如订单服务和库存服务每次都要一起发版，而且订单服务直接读写库存表，说明边界划错了：要么库存的逻辑应该归到一起，要么订单服务应该改成调用库存服务的接口。'},
  {title:'从单体迁移到微服务：一点点替换',body:'不要试图一次性把单体重写成微服务，风险太大。常用的是“绞杀者模式”：\n一、在单体前面加一层网关或代理，所有请求先经过它；\n二、挑一个边界清晰、相对独立的功能，用新服务实现；\n三、通过网关把这部分功能的请求逐步切到新服务，先切一小部分流量，观察没问题再全部切过去，有问题随时能切回单体；\n四、数据的所有权要在一个明确的时间点转移：在那之前以单体的数据库为准，之后以新服务的数据库为准，中间可能需要一段时间的数据同步；\n五、重复这个过程，单体越来越小，最后被完全替换掉。\n每一步都要能回滚，并且不影响用户。'},
  {title:'超时：每次远程调用都要设',body:'网络调用和本地函数调用最大的不同是：它可能失败，也可能一直不返回。如果调用下游时没有设置超时，下游一卡住，调用方的线程或 goroutine 就一直等着，越积越多，最后把自己也拖垮，故障就沿着调用链一层层往上蔓延，这叫“雪崩”。\n所以每一次远程调用都必须设置超时，而且超时时间要根据下游正常的响应时间来定（比如正常 P99 是 200 毫秒，超时可以设 500 毫秒），不能随手写个 30 秒。\n更进一步，整条调用链要共享一个总的截止时间：入口处定一个总预算（比如 1 秒），往下调用时把剩余的时间传下去。如果每一层都各自重新设置 1 秒，三层调用加起来可能要 3 秒，用户早就放弃了，后面的服务还在白白地干活。Go 里用 context 的截止时间就能自然地做到这一点。',code:`func PlaceOrder(ctx context.Context, req Order) error {
    ctx, cancel := context.WithTimeout(ctx, time.Second)
    defer cancel()

    if err := inventory.Reserve(ctx, req.Items); err != nil {
        return err
    }
    return payment.Charge(ctx, req.Amount)
}`,explain:[{at:'func PlaceOrder(ctx context.Context, req Order) error {',text:'下单的入口函数，接收上游传来的 ctx。'},{at:'ctx, cancel := context.WithTimeout(ctx, time.Second)',text:'入口定一个总预算：整个下单最多 1 秒。如果上游的截止时间比这更早，以更早的为准。'},{at:'defer cancel()',text:'用完释放。'},{at:'if err := inventory.Reserve(ctx, req.Items); err != nil {',to:'return err',text:'调用库存服务，传同一个 ctx。假设它用掉了 300 毫秒。'},{at:'return payment.Charge(ctx, req.Amount)',text:'调用支付服务时，ctx 里只剩大约 700 毫秒，而不是重新获得 1 秒。gRPC 等框架还会把剩余时间通过请求头传给下游服务。'}]},
  {title:'重试：用对了是救命，用错了是火上浇油',body:'网络偶尔抖一下，重试一次往往就成功了。但重试必须遵守几条规则：\n一、只重试幂等的操作。查询可以放心重试；“扣款”这种操作，如果第一次其实成功了只是响应丢了，重试就会扣两次钱，必须先做好幂等（比如带上幂等键）；\n二、用指数退避加随机抖动：第一次等 100 毫秒，第二次 200 毫秒，第三次 400 毫秒……每次再加一点随机时间，避免所有客户端在同一时刻一起重试；\n三、要有重试预算：比如重试的请求不能超过正常请求的 10%。下游已经过载时，大量重试只会把它彻底压垮；\n四、只在一层做重试。如果网关、服务的客户端 SDK、Service Mesh 三层都配置了“失败重试 3 次”，一次下游故障时，请求数会被放大到 3 × 3 × 3 = 27 倍，下游会被自己人的重试打垮。'},
  {title:'熔断、降级和隔离',body:'熔断：像电路里的保险丝。对某个下游的调用失败率超过阈值时，熔断器“打开”，在一段时间内直接返回失败，不再真的去调用它，给下游喘息和恢复的时间，也避免自己的资源被大量卡住的调用占满。过一会儿进入“半开”状态，放少量请求试探，成功了就恢复正常，失败了继续熔断。\n降级：非核心的功能出了问题时，返回一个简化的结果，保住核心功能。比如商品详情页的“猜你喜欢”服务挂了，就不显示推荐，或者显示一份默认的热门列表，但商品信息和下单按钮必须正常。\n隔离：按下游依赖划分资源，比如给每个下游单独的连接池、并发上限。这样一个慢的下游最多耗尽分给它的那部分资源，不会把整个服务的线程或连接都占满。这种做法也叫“舱壁模式”，就像船舱分隔开，一个舱进水不会让整条船沉没。'},
  {title:'四种限流算法',body:'限流是为了保护服务：请求量超过承受能力时，主动拒绝一部分，而不是被全部压垮。常见的四种算法：\n固定窗口：每秒（每个时间窗口）一个计数器，超过上限就拒绝，下一秒清零。简单，但有“窗口边界”问题：在上一秒的最后一刻和下一秒的第一刻各来一波满额的请求，短短一瞬间就放进了 2 倍的量；\n滑动窗口：统计“最近一秒内”的请求数，窗口随时间平滑移动，解决了边界突刺的问题，但要记录更多的数据；\n漏桶：请求先进入一个桶里排队，再以固定的速度流出处理，桶满了就拒绝。输出非常平滑，但即使系统有余力，也处理不了突发的流量；\n令牌桶：系统按固定速度往桶里放令牌，桶有容量上限；每个请求要拿到一个令牌才能通过。平时攒下的令牌允许短时间的突发，长期来看平均速度又不会超过放令牌的速度。\n令牌桶和漏桶最主要的区别就是：令牌桶允许一定程度的突发，漏桶强制平滑输出。'},
  {title:'动手试试：固定窗口的边界问题',body:'限额都是每秒 10 个。我们让请求在第 800 毫秒和第 1000 毫秒各来 10 个，也就是 0.2 秒之内来了 20 个，看看固定窗口和令牌桶分别放行多少。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 limiter.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python limiter.py（Mac 用 python3 limiter.py），对照下面的输出。','把 burst 改成 [100] * 10 + [600] * 10（两波请求都在同一秒内），再看看两种算法分别放行多少。'],expect:'固定窗口：第 800 和 1000 毫秒各来 10 个请求，放行 20 个\n令牌桶：同样的 20 个请求，放行 12 个'},code:`class FixedWindow:
    def __init__(self, limit):
        self.limit, self.window, self.count = limit, -1, 0

    def allow(self, now_ms):
        w = now_ms // 1000
        if w != self.window:
            self.window, self.count = w, 0
        if self.count < self.limit:
            self.count += 1
            return True
        return False

class TokenBucket:
    def __init__(self, rate, capacity):
        self.rate, self.capacity = rate, capacity
        self.tokens, self.last = capacity, 0

    def allow(self, now_ms):
        self.tokens = min(self.capacity, self.tokens + (now_ms - self.last) * self.rate / 1000)
        self.last = now_ms
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

burst = [800] * 10 + [1000] * 10
fw = FixedWindow(10)
print("固定窗口：第 800 和 1000 毫秒各来 10 个请求，放行", sum(fw.allow(t) for t in burst), "个")
tb = TokenBucket(rate=10, capacity=10)
print("令牌桶：同样的 20 个请求，放行", sum(tb.allow(t) for t in burst), "个")`,explain:[{at:'class FixedWindow:',text:'固定窗口限流器。'},{at:'def __init__(self, limit):',to:'self.limit, self.window, self.count = limit, -1, 0',text:'每个窗口最多放行 limit 个；记录当前是第几个窗口，以及这个窗口里已经放行了几个。'},{at:'def allow(self, now_ms):',text:'判断在 now_ms 这个时刻（毫秒）到达的请求能不能放行。'},{at:'w = now_ms // 1000',text:'按整秒划分窗口：0 到 999 毫秒是第 0 个窗口，1000 到 1999 是第 1 个。'},{at:'if w != self.window:',to:'self.window, self.count = w, 0',text:'进入了新的窗口，计数清零。'},{at:'if self.count < self.limit:',to:'return True',text:'还没到上限就放行，计数加一。'},{at:'return False',text:'超过上限就拒绝。'},{at:'class TokenBucket:',text:'令牌桶限流器。'},{at:'def __init__(self, rate, capacity):',to:'self.tokens, self.last = capacity, 0',text:'每秒放 rate 个令牌，桶最多装 capacity 个，一开始是满的。'},{at:'def allow(self, now_ms):',text:'判断请求能不能放行。'},{at:'self.tokens = min(self.capacity, self.tokens + (now_ms - self.last) * self.rate / 1000)',text:'先补充令牌：距离上次过了多少毫秒，就按速度补多少，但不超过桶的容量。'},{at:'self.last = now_ms',text:'记住这次的时间。'},{at:'if self.tokens >= 1:',to:'return True',text:'有令牌就拿走一个，放行。'},{at:'return False',text:'没有令牌就拒绝。'},{at:'burst = [800] * 10 + [1000] * 10',text:'20 个请求：前 10 个在第 800 毫秒，后 10 个在第 1000 毫秒。'},{at:'fw = FixedWindow(10)',to:'print("固定窗口：',text:'固定窗口：800 毫秒属于第 0 秒，1000 毫秒属于第 1 秒，两个窗口各放行 10 个，0.2 秒内放进了 20 个，是限额的 2 倍。'},{at:'tb = TokenBucket(rate=10, capacity=10)',to:'print("令牌桶：',text:'令牌桶：第一波用掉了攒满的 10 个令牌；过了 200 毫秒只补充了 2 个，所以第二波只放行 2 个，一共 12 个。'}]},
  {title:'服务注册与发现',body:'微服务的实例会随时增加、减少、换机器，调用方不可能把对方的 IP 地址写死在配置里。注册中心（比如 Consul、Nacos、etcd，Kubernetes 里则是它自带的 Service）就是一本实时更新的“通讯录”：\n一、服务实例启动后，把自己的地址注册到注册中心，并定期发送心跳续约；\n二、实例挂了、心跳停了，注册中心在超时后自动把它删掉；\n三、调用方从注册中心拿到某个服务当前所有可用实例的列表，在本地做负载均衡（比如轮询、随机、按权重），选一个去调用。\n要注意“优雅下线”：实例要停止之前，应该先从注册中心摘除自己，等一小段时间让调用方更新了实例列表、不再发新请求过来，然后再处理完手上的请求、停止进程。如果直接停机，在调用方还没感知到之前，发过来的请求都会失败。'},
  {title:'灰度发布：先给一小部分用户用',body:'新版本上线时，不直接替换所有实例，而是先让一小部分流量（比如 1%，或者内部员工、某个城市的用户）用上新版本，其余的仍然用旧版本。\n灰度期间重点盯：错误率、延迟的分位数（P99）、以及业务指标（下单量、支付成功率）。新版本的指标和旧版本对比没有问题，再逐步放大到 10%、50%、100%；一旦发现异常，马上把流量切回旧版本。\n灰度期间新旧两个版本同时在线，所以它们必须互相兼容，数据库变更尤其要小心。最安全的方式是“扩展-收缩”两步走：\n一、扩展：先只做“加法”，比如新增一个字段，新旧代码都能正常运行；\n二、等新版本全部上线、稳定之后，再做“减法”，删除旧版本才用到的字段。\n千万不要在灰度期间直接重命名或删除字段，旧版本的代码会立刻出错。'},
  {title:'可观测性：日志、指标和链路追踪',body:'服务多了以后，出了问题要能快速知道是哪个服务、哪个环节出的问题，这就要靠“可观测性”的三大支柱：\n日志：记录每个事件的详细信息，适合查看某个具体请求发生了什么。要带上请求 ID，并输出成结构化的格式（比如 JSON），方便搜索；\n指标：随时间变化的数字，适合看整体趋势和设置告警，比如每秒请求数、错误率、延迟分布。Prometheus 有四种指标类型：Counter（计数器，只增不减，比如请求总数）、Gauge（可增可减的当前值，比如正在处理的请求数、内存用量）、Histogram（直方图，按区间统计分布，可以在服务端聚合计算分位数，比如请求耗时）、Summary（在客户端直接算好分位数）；\n链路追踪：一个请求经过的每个服务、每一步各花了多少时间，串成一棵调用树，适合定位“慢在哪一环”。常用 OpenTelemetry 采集，再用 Jaeger 等工具查看。',code:`var requests = prometheus.NewCounterVec(
    prometheus.CounterOpts{Name: "http_requests_total"},
    []string{"path", "code"},
)
var latency = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{Name: "http_request_seconds", Buckets: prometheus.DefBuckets},
    []string{"path"},
)

requests.WithLabelValues("/order", "200").Inc()
latency.WithLabelValues("/order").Observe(time.Since(start).Seconds())`,explain:[{at:'var requests = prometheus.NewCounterVec(',text:'定义一个 Counter：统计请求总数（Go 的 Prometheus 客户端库）。'},{at:'prometheus.CounterOpts{Name: "http_requests_total"},',text:'指标的名字，Counter 习惯以 _total 结尾。'},{at:'[]string{"path", "code"},',text:'两个标签：接口路径和状态码，可以按它们分组统计，比如算出每个接口的错误率。'},{at:'var latency = prometheus.NewHistogramVec(',text:'定义一个 Histogram：统计请求耗时的分布。'},{at:'prometheus.HistogramOpts{Name: "http_request_seconds", Buckets: prometheus.DefBuckets},',text:'按默认的时间区间（5 毫秒、10 毫秒……10 秒）分桶计数，之后可以在 Prometheus 里算出 P99 等分位数。'},{at:'[]string{"path"},',text:'按接口路径分别统计。'},{at:'requests.WithLabelValues("/order", "200").Inc()',text:'每处理一个请求，对应标签的计数加一。'},{at:'latency.WithLabelValues("/order").Observe(time.Since(start).Seconds())',text:'记录这个请求的耗时（秒）。'}]},
  {title:'跨服务的一致性：下单扣库存扣余额',body:'场景：下单要同时扣库存、扣余额、创建订单，三件事分别在库存服务、账户服务、订单服务里，各自有自己的数据库。没法用一个数据库事务把它们包起来，怎么保证一致？\n常用的方案是放弃“强一致”，追求“最终一致”：\n一、Saga：把一个大事务拆成一串本地事务，每一步都有对应的“补偿操作”。比如依次执行“创建订单（待支付）→ 扣库存 → 扣余额”，如果扣余额失败了，就依次执行补偿：“退还库存 → 取消订单”。可以由一个中心的编排者按顺序调用，也可以由各服务通过事件接力；\n二、TCC（Try-Confirm-Cancel）：每个服务提供三个接口。Try 先预留资源（冻结库存、冻结余额），全部 Try 成功后调用 Confirm 真正扣减，有任何一个失败就调用 Cancel 释放冻结。一致性更强，但每个服务都要实现三个接口，改造成本高；\n三、本地消息表 / 事务发件箱：在本地事务里同时写业务数据和“待发送的消息”，再由后台可靠地投递给其他服务，配合消费端幂等。\n无论哪种方案，每一步和每个补偿操作都必须幂等，因为网络超时后一定会有重试。'},
  {title:'先认识容器和 Kubernetes',body:'微服务通常跑在容器里，用 Kubernetes（K8s）来管理，下一关会详细讲，这里先记住几个面试常考的点：\n容器和虚拟机最本质的区别：虚拟机模拟出一整台计算机，里面运行一个完整的操作系统；容器只是宿主机上一个被“隔离”起来的普通进程，所有容器共享宿主机的操作系统内核，所以启动只要几秒、占用资源也少得多。容器靠 Linux 的 namespaces 隔离“看到的东西”（进程、网络、文件系统），靠 cgroups 限制能用多少 CPU 和内存；\nK8s 是声明式的：你声明“我要 3 个这样的实例”，控制器会持续检查，少了就补、坏了就重建，这就是自愈；\nK8s 有三种探针：startupProbe 等程序启动完成；livenessProbe（存活探针）失败会重启容器；readinessProbe（就绪探针）失败不会重启，只是把这个 Pod 从 Service 的流量里摘除，等它恢复了再放流量进来。'}
 ],quiz:[
  {id:'be-ms-1',q:'订单服务和库存服务每次发版都要一起发布，而且订单服务直接读写库存表。这说明？',options:['服务拆分得非常合理','边界划分有问题，耦合太紧','说明需要拆出更多的服务','说明需要更换数据库类型'],why:['总是一起发布、直接读写对方的表，说明两者并没有真正解耦。','','继续拆分只会让耦合更复杂。','问题在于数据所有权，与数据库类型无关。'],answer:1,explain:'服务应拥有自己的数据，通过 API 或事件交互；总是一起改，说明它们本应在同一个边界里。',interview:'q-edec811e0206d842'},
  {id:'be-ms-2',type:'multi',q:'调用下游服务时，下面哪些容错措施是合理的？（多选）',options:['给调用设置合理的超时','非幂等的扣款接口无限重试','持续失败时熔断并降级','按依赖隔离连接池或并发额度'],why:['','非幂等操作重试可能扣两次款；重试必须针对幂等操作并设置次数上限。','',''],answers:[0,2,3],explain:'非幂等操作重试可能扣两次款，重试必须针对幂等操作并有次数上限。',interview:'q-0fc17c67c73985e3'},
  {id:'be-ms-3',q:'网关、服务 SDK、Service Mesh 三层都配置了“失败重试 3 次”。一次下游故障会怎样？',options:['整体只会重试 3 次','请求被放大到 27 倍','对下游没有任何影响','下游会自动触发熔断'],why:['每一层都会各自重试，次数会相乘。','','放大的请求会进一步压垮正在故障的下游。','熔断需要专门配置，多层重试本身不会触发熔断。'],answer:1,explain:'三层各重试 3 次，一次请求最多变成 3×3×3=27 次；应只在一层重试，并设置重试预算。',interview:'q-cfbeeb3c8e1b795c'},
  {id:'be-ms-4',q:'令牌桶和漏桶限流最主要的区别是？',options:['两者在实现和效果上没有区别','令牌桶允许突发，漏桶匀速放行','漏桶处理请求的速度比令牌桶快','令牌桶仅适用于网关层的限流'],why:['两者的放行方式不同。','','漏桶以固定速率输出，不存在“更快”。','令牌桶在任何需要限流的地方都可以使用。'],answer:1,explain:'令牌桶在桶容量内允许短时突发；漏桶输出更平滑。',interview:'q-7e9b9c3a30161c07'},
  {id:'be-ms-5',type:'judge',q:'入口设置了 1 秒总超时，下游调用每次都可以重新设置 1 秒的超时，这样更保险。',answer:false,explain:'子调用的超时不能超过剩余预算，重试也要消耗同一份预算，否则入口早已超时返回，后台还在白白干活。',interview:'q-a05df95decf82b88'},
  {id:'be-ms-6',q:'Prometheus 中统计接口请求总数，应该用哪种指标类型？',options:['Gauge','Counter','Summary','Histogram'],why:['Gauge 表示可增可减的瞬时值，如当前连接数。','','Summary 在客户端计算分位数，适合单实例的耗时统计。','Histogram 用于耗时等分布，可以跨实例聚合计算 P99。'],answer:1,explain:'Counter 只增不减，配合 rate() 计算每秒请求数。',interview:'q-f63a9898d9719658'},
  {id:'be-ms-7',type:'fill',q:'K8s 中，探针失败时会把 Pod 从 Service 流量中摘除、但不重启容器的是 ____Probe。',accepted:['readiness','readinessProbe'],explain:'livenessProbe 失败会重启容器；liveness 不要依赖数据库等外部系统，否则外部故障会导致全体重启。',interview:'q-fc7ea79fe2b6761b'},
  {id:'be-ms-8',q:'容器和虚拟机最本质的区别是？',options:['容器的体积比虚拟机更大','容器共享宿主机内核','容器默认不能访问网络','虚拟机的启动速度更快'],why:['容器通常比虚拟机小得多。','','容器默认就可以联网。','容器启动通常是秒级，比虚拟机快得多。'],answer:1,explain:'容器共享宿主机内核，用 namespaces 和 cgroups 做隔离和限制；虚拟机有自己的内核，所以容器启动快、开销小，但隔离性更弱。',interview:'q-3679d212a21d6fd0'},
  {id:'be-ms-9',q:'灰度发布期间新旧版本同时在线，下面哪种数据库变更方式最安全？',options:['直接删除旧字段并添加新字段','先加新字段，全量后再删旧字段','直接修改字段名','先删表再重新建表'],why:['灰度期间旧版本仍在读写旧字段，直接删除会让它报错。','','改名会让仍在运行的旧代码立即出错。','删表会丢失数据，服务也会中断。'],answer:1,explain:'变更要向前、向后兼容并分步进行：加新字段 → 新代码读写新字段 → 全量发布后再删除旧字段，每一步都能回滚。',interview:'q-08815d2a347da9a6'},
  {id:'be-ms-10',type:'short',q:'下单要同时扣库存、扣余额、创建订单，分布在三个服务里。你会用什么方案保证一致性？',reference:'先看一致性要求。常见选择：用本地消息表 / 事务性 outbox——订单服务在本地事务里写订单和一条待发送消息，后台可靠投递到 MQ，库存和余额服务幂等消费，失败时重试并对账，达到最终一致。流程长、每步都能补偿时用 Saga，失败时按相反顺序执行补偿（释放库存、退款）。对一致性要求很高且能接受复杂度时用 TCC（Try 冻结资源、Confirm 确认、Cancel 释放），要处理空回滚、悬挂和幂等。2PC 强一致但阻塞、锁资源久，互联网业务较少直接用。',points:['先明确一致性要求','outbox + MQ + 幂等消费 + 对账','Saga 逆序补偿','TCC 冻结-确认-取消','2PC 的代价'],explain:'说清各方案的取舍，并选出适合场景的那个。',interview:'q-e994dda5397d9993'},
 ]},
 {id:'be-es',title:'搜索引擎 Elasticsearch',summary:'倒排索引、写入与近实时、查询类型、分页、并发和高可用',lessons:[
  {title:'这一关学什么：为什么搜索要用专门的引擎',body:'在数据库里用 LIKE \'%分布式%\' 搜索文章内容，数据一多就极慢（前导 % 用不上索引，只能全表扫描），而且不会分词、不会按相关程度排序。Elasticsearch（简称 ES）是专门做全文搜索的引擎。\n这一关讲：\n一、倒排索引：搜索为什么能那么快；\n二、分词，以及 text 和 keyword 两种字段的区别；\n三、数据写入后为什么要等大约 1 秒才能搜到（近实时）；\n四、term、match、filter 等查询方式和深分页问题；\n五、并发更新、集群高可用，以及搜索结果的权限控制。'},
  {title:'倒排索引：从“词”找到“文档”',body:'普通的索引是“正排”的：根据文档 ID 找到它的内容。搜索要反过来：已知一个词，找出所有包含它的文档。\n倒排索引就是提前把这个关系建好：对每篇文档分词，记录“每个词出现在哪些文档里”。比如：\n“go” → 文档 1、文档 2\n“fast” → 文档 1、文档 3\n搜索“go fast”时，直接查出两个词各自的文档列表，再合并（求并集或交集），并按相关度打分排序，不需要逐篇扫描所有文档。这就像书末尾的“名词索引”：查某个术语，直接告诉你出现在哪几页。'},
  {title:'分词和分析器',body:'建倒排索引之前，文本要先经过“分析器”处理：\n一、切分：把一段文字切成一个个词（英文按空格和标点，中文需要专门的中文分词器，比如 IK 分词器）；\n二、归一化：统一转成小写、去掉“is”“的”这类没有意义的停用词、把复数还原成单数等。\n所以 “Go Is Fast” 存进倒排索引的词其实是 go 和 fast。\nES 的字段有两种常用的字符串类型：\ntext：会被分析器分词，用于全文搜索，比如文章标题和内容；\nkeyword：不分词，整个值原样作为一个词存储，用于精确匹配、过滤、排序和聚合统计，比如状态、标签、用户 ID、邮箱。\n一个字段经常可以同时设置成两种，用于不同的查询。'},
  {title:'term、match 和 match_phrase',body:'term：不对你输入的查询词做任何分析，拿它原样去倒排索引里精确查找。适合 keyword 字段和数字。如果对一个 text 字段（存的是 “Go Is Fast”）用 term 查 “Go”，什么也查不到：索引里存的是小写的 go，而 term 不会把 “Go” 转成小写；\nmatch：先用同样的分析器处理查询词，再去查找，适合全文搜索。match “Go FAST” 会先变成 go 和 fast，再找出包含任一个词的文档；\nmatch_phrase：除了要包含这些词，还要求它们按同样的顺序挨在一起出现，用于搜索一个短语。\n文档已经写入、用 match 却搜不到时，最先应该检查的是：用 _analyze 接口看看文档和查询词分别被分成了哪些词，是不是对不上（比如中文没有配置合适的分词器）。'},
  {title:'动手试试：自己实现一个倒排索引',body:'我们用 Python 实现一个迷你版的倒排索引：简单的分析器（转小写、去掉停用词），然后分别模拟 term 和 match 查询，看看为什么 term 查 “Go” 什么都查不到。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 inverted.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python inverted.py（Mac 用 python3 inverted.py），对照下面的输出。','给 docs 加一篇新文档 4: "Fast Go Fast"，再运行，看看倒排索引和 match 的结果有什么变化。'],expect:'倒排索引： {\'fast\': [1, 3], \'friends\': [2], \'go\': [1, 2], \'learning\': [2], \'rust\': [3]}\nterm "Go"： []\nterm "go"： [1, 2]\nmatch "Go FAST"： [1, 2, 3]'},code:`import re
from collections import defaultdict

docs = {1: "Go Is Fast", 2: "Learning Go with friends", 3: "Rust is fast too"}
STOP = {"is", "with", "too"}

def analyze(text):
    return [w for w in re.findall(r"[a-z]+", text.lower()) if w not in STOP]

index = defaultdict(set)
for doc_id, text in docs.items():
    for word in analyze(text):
        index[word].add(doc_id)

print("倒排索引：", {w: sorted(ids) for w, ids in sorted(index.items())})

def term(word):
    return sorted(index.get(word, set()))

def match(query):
    result = set()
    for word in analyze(query):
        result |= index.get(word, set())
    return sorted(result)

print('term "Go"：', term("Go"))
print('term "go"：', term("go"))
print('match "Go FAST"：', match("Go FAST"))`,explain:[{at:'import re',text:'re 是正则表达式模块，用来切分单词。'},{at:'from collections import defaultdict',text:'defaultdict 在访问不存在的 key 时自动创建一个默认值，这里用来自动创建空集合。'},{at:'docs = {1: "Go Is Fast"',text:'三篇文档：ID → 内容。'},{at:'STOP = {"is", "with", "too"}',text:'停用词：出现太频繁、对搜索没有意义的词。'},{at:'def analyze(text):',to:'return [w for w in re.findall(r"[a-z]+", text.lower()) if w not in STOP]',text:'分析器：先转小写，用正则找出所有由字母组成的单词，再去掉停用词。'},{at:'index = defaultdict(set)',text:'倒排索引：词 → 包含它的文档 ID 集合。'},{at:'for doc_id, text in docs.items():',to:'index[word].add(doc_id)',text:'对每篇文档分析，把每个词和这篇文档的 ID 记进索引。'},{at:'print("倒排索引：", {w: sorted(ids) for w, ids in sorted(index.items())})',text:'按词排序后打印整个倒排索引。'},{at:'def term(word):',to:'return sorted(index.get(word, set()))',text:'term 查询：不分析输入，原样去索引里找。'},{at:'def match(query):',text:'match 查询。'},{at:'result = set()',to:'result |= index.get(word, set())',text:'先用同一个分析器处理查询词，再把每个词对应的文档合并（|= 是求并集）。'},{at:'return sorted(result)',text:'返回排好序的文档 ID。'},{at:'print(\'term "Go"：\', term("Go"))',text:'索引里只有小写的 go，原样查 “Go” 找不到，结果是空列表。'},{at:'print(\'term "go"：\', term("go"))',text:'查小写的 go 才能找到文档 1 和 2。'},{at:'print(\'match "Go FAST"：\', match("Go FAST"))',text:'match 会把查询也转成小写、分成 go 和 fast，找到包含任一个词的文档 1、2、3。'}]},
  {title:'写入和“近实时”',body:'文档写入 ES 后，并不能马上被搜到，通常要等大约 1 秒，所以 ES 被称为“近实时”搜索。过程是这样的：\n一、写请求按 routing（默认是文档 ID 的哈希）路由到某个主分片，主分片执行写入，再复制到它的副本分片；\n二、文档先进入内存缓冲区，同时写一份 translog（事务日志），防止宕机时丢失；\n三、refresh：默认每秒一次，把内存缓冲区里的文档写成一个新的 segment（段）。只有进入了 segment，文档才能被搜索到；\n四、flush：定期把 segment 真正持久化到磁盘，生成一个提交点，之后就可以清空对应的 translog。\nsegment 一旦生成就不可修改：不可变的结构不需要加锁，可以放心地被缓存，也容易压缩。删除和更新文档时，只是把旧文档标记为已删除，再写一份新的。segment 越来越多时，后台会把小段合并（merge）成大段，同时真正清理掉被标记删除的文档。\n所以写入后马上用 search 查，可能查不到；如果必须马上能搜到，可以在写入时指定 refresh=wait_for，但不应该每次写入都强制 refresh，那样会产生大量小段，严重影响性能。'},
  {title:'bool 查询：must 和 filter',body:'实际的搜索往往同时包含“全文搜索”和“精确条件”。ES 用 bool 查询组合多个条件：\nmust：必须满足，并且参与相关度打分，适合全文搜索的部分，比如内容里包含“分布式事务”；\nfilter：必须满足，但不参与打分，结果还可以被缓存，适合精确的过滤条件，比如租户 ID、状态等于已发布、时间范围、价格区间；\nshould：满足了会加分，适合“最好有”的条件；\nmust_not：必须不满足。\n把精确条件放进 filter 而不是 must，查询更快（不用算分，还能用缓存），也不会让这些条件干扰相关度排序。',code:`GET /docs/_search
{
  "query": {"bool": {
    "must":   [{"match": {"content": "分布式事务"}}],
    "filter": [
      {"term": {"tenant_id": "t1"}},
      {"range": {"publish_time": {"gte": "2025-01-01"}}}
    ]
  }}
}`,explain:[{at:'GET /docs/_search',text:'在 docs 这个索引里搜索。'},{at:'"query": {"bool": {',text:'使用 bool 组合查询。'},{at:'"must":   [{"match": {"content": "分布式事务"}}],',text:'内容里要和“分布式事务”相关，会分词并参与打分，越相关的排得越靠前。'},{at:'"filter": [',text:'以下是精确的过滤条件，不参与打分。'},{at:'{"term": {"tenant_id": "t1"}},',text:'只看 t1 这个租户的数据。tenant_id 应该是 keyword 类型。'},{at:'{"range": {"publish_time": {"gte": "2025-01-01"}}}',text:'只看 2025 年 1 月 1 日以后发布的文档（gte 表示大于等于）。'}]},
  {title:'深分页：别用 from 一直往后翻',body:'ES 的数据分布在多个分片上。用 from + size 分页时，比如 from=50000、size=10，每个分片都要先找出自己排在前 50010 名的文档，汇总到协调节点后再统一排序，最后只取其中的 10 条。翻得越深，要处理和传输的数据越多，越慢、越占内存。所以 ES 默认限制 from + size 不能超过 10000。\n解决办法：\n一、产品上限制：一般用户很少翻到很深的页，可以只允许看前 100 页，引导用户换更精确的关键词；\n二、连续往后翻页，用 search_after：记住上一页最后一条的排序值，下一页从它之后开始取，配合 PIT（Point In Time，时间点快照）保证翻页过程中看到的数据是一致的；\n三、要导出全部数据，也用 PIT + search_after 一批批地取。'},
  {title:'并发更新：乐观锁',body:'两个请求同时修改同一个商品文档的库存：都读到库存是 10，一个改成 9，另一个也改成 9，结果少扣了一次。\nES 用乐观并发控制解决这个问题：每个文档都有一个 _seq_no（序列号）和 _primary_term（主分片任期），每修改一次，序列号就会变。更新时带上自己读到的这两个值（if_seq_no 和 if_primary_term），意思是“只有文档还是我读到的那个版本，才执行这次修改”。如果文档在这期间已经被别人改过了，ES 返回 409 冲突错误，这时应该重新读取最新的文档，再基于新的值修改。',code:`GET /products/_doc/42

PUT /products/_doc/42?if_seq_no=15&if_primary_term=3
{"name": "键盘", "stock": 9}`,explain:[{at:'GET /products/_doc/42',text:'先读取商品 42，返回结果里除了文档内容，还有 _seq_no（比如 15）和 _primary_term（比如 3）。'},{at:'PUT /products/_doc/42?if_seq_no=15&if_primary_term=3',text:'带上读到的版本号去更新：只有文档的版本还是 15 和 3 时才会成功。如果别人先改了，这次会返回 409，需要重新读取再试。'},{at:'{"name": "键盘", "stock": 9}',text:'新的文档内容：库存从 10 改成 9。'}]},
  {title:'集群和高可用',body:'一个索引被分成多个主分片，分布在集群的不同节点上；每个主分片可以有若干副本分片，副本一定放在和主分片不同的节点上（最好还在不同的可用区）。副本既用来提高可用性，也能分担查询压力。\n某个节点挂了，它上面的主分片所对应的副本会被提升为新的主分片，数据不丢、服务不中断。集群里还有一个 master 节点负责管理分片的分配和集群状态，它由“有资格当 master 的节点”按多数派投票选出，所以候选 master 节点一般设置成 3 个。\n集群的健康状态：\ngreen：所有主分片和副本分片都正常；\nyellow：所有主分片都可用，但有副本分片还没有分配（比如单节点集群，副本没地方放）。数据可以正常读写，只是少了冗余；\nred：有主分片不可用，部分数据读写不了，需要立刻处理。\n副本不能代替备份：误删了索引，副本也会一起被删。要定期做快照（snapshot）备份。\n另外，生产环境部署时不能为了“顺利启动”而关掉启动检查（bootstrap checks），它们检查的是内存锁定、文件句柄数等关键配置，关掉只会把问题留到线上。'},
  {title:'案例：搜索结果的权限控制',body:'场景：设计企业网盘的搜索功能，要保证用户绝对搜不到自己没有权限查看的文件。\n关键原则：权限过滤必须在 ES 查询里完成，而不是先搜出来再在程序里过滤。如果先搜后过滤，分页、总数都会出错（一页 10 条过滤后只剩 3 条），而且一旦过滤代码有漏洞，就会泄露数据。\n常见的做法：\n一、写入索引时，把每个文件的权限信息一起存进文档，比如允许访问的用户 ID 列表、部门 ID 列表、租户 ID，都用 keyword 类型；\n二、搜索时，由服务端根据当前登录用户的身份，在 bool 查询的 filter 里强制加上权限条件，比如“租户 ID 等于我的租户，并且允许访问的用户或部门里包含我”。这些条件绝不能信任前端传来的参数；\n三、权限变更时（比如把某人移出部门、取消分享），要及时更新受影响文档的权限字段；对时效要求高的场景，还可以在返回结果前再用权限服务校验一次；\n四、多个租户的数据量都很大时，也可以每个租户用独立的索引，从结构上就隔离开。'}
 ],quiz:[
  {id:'be-es-1',q:'对一个 text 类型的字段（存了 “Go Is Fast”）执行 term 查询 “Go”，结果是？',options:['能查到这条文档','查不到，已转成小写','查询会直接报错','匹配到部分内容'],why:['text 字段写入时被分词并转成小写，索引里只有 go，没有 Go。','','term 查询对 text 字段是合法的，只是匹配不到。','一个词要么匹配要么不匹配，不存在“一半”。'],answer:1,explain:'term 不分析查询输入，对 text 字段用 term 是常见错误；精确匹配用 keyword 字段，全文检索用 match。',interview:'q-fe61f34b684b17a6'},
  {id:'be-es-2',type:'judge',q:'文档写入 ES 成功后，马上就能被 search 查询搜到。',answer:false,explain:'要等 refresh 生成新的 segment 后才可搜索（默认约 1 秒），按 id 的实时 GET 则可以立即读到。',interview:'q-583f8519476cc645'},
  {id:'be-es-3',q:'ES 的 segment 为什么设计成不可变的？',options:['为了节省磁盘空间','不可变便于并发读和利用缓存','为了支持数据库式事务','Lucene 无法修改任何文件'],why:['不可变反而需要后台合并来回收空间，并不节省磁盘。','','ES 不提供多文档事务，这不是设计原因。','这是设计选择而不是能力限制。'],answer:1,explain:'segment 写好后不再修改，多个线程可以放心并发读、利用文件缓存，不需要读写锁；更新文档是把旧版本标记删除，在新 segment 写入新版本，后台 merge 再清理。',interview:'q-f2a89c6060d800c7'},
  {id:'be-es-4',type:'multi',q:'下面哪些条件适合放进 bool 查询的 filter 子句？（多选）',options:['租户 id 等于 t1','创建时间在最近 7 天','标题包含“分布式事务”并按相关度排序','按评论内容的匹配程度给结果打分'],why:['','','需要相关度排序的全文条件要放在 must 中参与算分。','需要打分的条件不能放在 filter 中，filter 不计算相关度。'],answers:[0,1],explain:'精确条件不需要算分，放 filter 更快且可以缓存；需要相关度的全文条件放 must。',interview:'q-255ea12bba3109d1'},
  {id:'be-es-5',q:'用户在搜索结果里一直往后翻页，from 到了 50000 时查询变得很慢。正确的方案是？',options:['调大 max_result_window 限制','改用 PIT + search_after 游标','增加索引的副本数量','把查询改成 term 查询'],why:['调大限制只是放宽检查，每个分片取出大量候选再合并的成本没有变。','','副本能分担并发查询，但不能降低单次深翻页的成本。','查询类型与翻页成本无关。'],answer:1,explain:'from+size 让每个分片都要取出大量候选再合并；调大限制只是放宽检查，成本没变。',interview:'q-ce12f5e3bd470427'},
  {id:'be-es-6',q:'两个请求同时修改同一个商品文档的库存，如何避免后写的覆盖先写的？',options:['加大索引的 refresh 间隔时间','带 if_seq_no 更新，冲突后重试','改用 term 查询来读取库存值','关闭这个索引的全部副本分片'],why:['refresh 间隔影响的是可见性，与并发覆盖无关。','','查询方式改变不了并发写入的覆盖问题。','副本与并发写冲突无关，关闭还会降低可用性。'],answer:1,explain:'乐观并发控制：更新时带 if_seq_no 和 if_primary_term，冲突返回 409 后重新读取再修改。',interview:'q-e852cae670f60f1e'},
  {id:'be-es-7',type:'fill',q:'集群健康状态为 ____ 表示所有主分片都可用，但有副本分片还没分配。',accepted:['yellow','黄色'],explain:'green 主副本都正常，red 表示至少有一个主分片缺失，部分数据不可用。',interview:'q-34abf51f2155f612'},
  {id:'be-es-8',q:'文档已经写入，用 match 却搜不到。下面哪个排查步骤最先做？',options:['先重建整个 ES 集群','查 refresh 和分词结果','先删索引重新导入','换一种查询语言重写'],why:['没有定位原因就重建集群，代价巨大且很可能无效。','','删除重建同样没有定位原因，问题可能再次出现。','查询语言不是问题所在。'],answer:1,explain:'常见原因：还没 refresh、字段类型不对（text/keyword）、写入和查询的分析器不一致，或被过滤条件挡掉。',interview:'q-dc8f488334ac56de'},
  {id:'be-es-9',type:'judge',q:'部署 Elasticsearch 时，为了让它顺利启动，可以直接关闭所有启动检查（bootstrap checks）。',answer:false,explain:'应该按要求调整文件描述符、vm.max_map_count、swap、JVM 堆等系统配置，而不是关闭检查。',interview:'q-ef1273fe7017c2a6'},
  {id:'be-es-10',type:'short',q:'设计企业网盘的搜索功能，如何保证用户搜不到自己没有权限的文件？',reference:'权限以数据库为权威：索引文档里带上 tenant_id、所有者、可见范围等权限字段，查询时由服务端根据登录身份强制加上 filter 条件，不能依赖前端传参。权限继承和群组变化时，要通过事件更新索引里的权限字段，避免把所有成员展开成巨大的 ACL 字段。因为索引更新有延迟，用户点开或下载文件时，还要按数据库里的权限再校验一次。缓存搜索结果时，缓存键要包含租户和权限版本。',points:['索引带权限字段','服务端强制 filter','权限变化通过事件更新索引','下载时按权威权限再校验','缓存键含租户和权限版本'],explain:'搜索命中不等于有权限，最终校验要在权威数据上做。',interview:'q-d3c8669e41992c81'},
 ]},
 {id:'be-design',title:'系统设计与项目实战',summary:'秒杀、短链、延迟任务、评论与计数，以及怎样讲好项目和排查故障',lessons:[
  {title:'这一关学什么：把学过的东西组合起来解决问题',body:'最后一关是“系统设计”：给你一个真实的业务需求，设计出能撑住流量、数据不出错、出了问题能兜底的方案。它考的是把前面所有知识组合起来用的能力：数据库、缓存、消息队列、限流、幂等、监控……\n这一关讲：\n一、系统设计题的答题方法和容量估算；\n二、几个经典场景：秒杀、短链接、订单超时取消、高并发计数、评论楼中楼；\n三、面试时怎么把自己做过的项目讲清楚，以及线上故障的处理思路回顾。\n其中会带你亲手验证“先查再扣”为什么会超卖，以及短链的 62 进制编码。'},
  {title:'系统设计题怎么答',body:'系统设计题没有唯一的标准答案，考的是思考过程。推荐按这个顺序：\n一、先问清需求，不要一上来就画架构。核心功能有哪些？规模多大（多少用户、每秒多少请求、多少数据）？对一致性和延迟有什么要求？哪些功能可以暂时不考虑？\n二、做粗略的容量估算，知道瓶颈大概在哪；\n三、画出主链路：请求从入口进来，经过哪些服务，数据存在哪里，哪里用缓存，哪里用消息队列；\n四、针对瓶颈逐个设计：读多写少加缓存；写入有尖峰用队列削峰；数据量大做分库分表；关键数据用事务和唯一约束兜底；\n五、讲失败路径：每个环节挂了怎么办？超时、重试、幂等、降级、限流、对账、监控告警。\n能主动讲清楚“在什么情况下会出问题、怎么兜底”，往往比画出一个复杂的架构图更能体现水平。'},
  {title:'容量估算：心里要有数',body:'估算不需要精确，数量级对就行，目的是判断瓶颈在哪、需要多少资源。以一个日活 1000 万的应用为例：\n一、请求量：每人每天平均请求 20 次，一天 2 亿次。一天约 8.64 万秒，平均每秒约 2300 次；高峰一般是平均的几倍，按 5 倍算，高峰约 1.2 万 QPS；\n二、存储量：每天新增 100 万条记录，每条 1KB，一天约 1GB，一年约 365GB，加上索引和副本还要再乘几倍；\n三、对照能力：一台 MySQL 大约能扛几千 QPS 的简单查询，一台 Redis 能扛十万级别。所以 1.2 万 QPS 的读请求，主要应该由缓存来扛；如果写入也有这么多，单个数据库就扛不住了，需要队列削峰或者分库。\n常用的几个数字：一天约 10 万秒；读内存是纳秒到微秒级，同机房网络往返约 0.5 毫秒，读 SSD 约 0.1 毫秒，机械硬盘寻道约 10 毫秒。'},
  {title:'秒杀：层层过滤',body:'秒杀的特点是：商品很少（比如 100 件），瞬间涌进来的请求极多（几十万）。核心思路是“层层过滤”，让真正到达数据库的请求尽量少：\n一、前端和 CDN：商品详情等静态页面放在 CDN 上，按钮在开始前置灰，提交后防止重复点击；\n二、网关限流和防刷：按用户、按 IP 限流，拦截机器人和恶意请求；\n三、资格校验：是否已登录、是否已经抢过、是否满足活动条件；\n四、原子地预扣库存：在 Redis 里用 Lua 脚本，或者用数据库的条件更新扣减库存，扣成功的才继续；\n五、异步下单：抢到的请求发到消息队列，订单服务按自己的能力慢慢创建订单，前端提示“排队中”，再轮询结果。\n要区分三种状态：抢到资格（排队成功）、订单创建成功、支付成功。用户超时不支付就取消订单，并且把库存释放回去，释放操作要幂等，不能多加。每个环节都要有可靠的记录，定期对账，确保 Redis 里的库存、订单和实际情况一致。'},
  {title:'防超卖：判断和扣减必须是一步',body:'超卖的根本原因是“先查库存、再扣减”分成了两步：很多请求几乎同时读到“还有 10 件”，都判断可以卖，然后各自扣减，结果卖出的远远超过库存。\n正确的做法是把“判断够不够”和“扣减”合成一个原子操作：\n一、数据库条件更新：UPDATE goods SET stock = stock - 1 WHERE id = ? AND stock > 0，然后检查影响的行数，是 1 才算扣成功，是 0 就说明卖完了。数据库保证这条语句执行时不会被其他请求插进来；\n二、Redis Lua 脚本：在一个脚本里完成“读库存、判断、扣减”，Redis 会原子地执行整个脚本。\n用 Redis 扛住高并发的预扣，再用数据库的条件更新做最终兜底，是常见的组合。',code:`UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0;

local stock = tonumber(redis.call("GET", KEYS[1]))
if stock and stock > 0 then
    redis.call("DECR", KEYS[1])
    return 1
end
return 0`,explain:[{at:'UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0;',text:'数据库方案：只有库存大于 0 才扣减。程序里检查影响行数，1 表示抢到，0 表示卖完了。'},{at:'local stock = tonumber(redis.call("GET", KEYS[1]))',text:'Redis 方案（Lua 脚本）：读出当前库存，转成数字。'},{at:'if stock and stock > 0 then',to:'end',text:'库存存在且大于 0，就扣减一件，返回 1 表示抢到。整个脚本原子执行，判断和扣减之间不会被其他请求插入。'},{at:'return 0',text:'否则返回 0，表示已经卖完。'}]},
  {title:'动手试试：先查再扣为什么会超卖',body:'我们模拟 100 个请求抢 10 件商品。第一种做法“先查再扣”：100 个请求几乎同时读到了库存 10，然后各自扣减。第二种做法用 SQLite 的条件更新，判断和扣减在一条语句里完成。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 oversell.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python oversell.py（Mac 用 python3 oversell.py），对照下面的输出。','把条件更新语句里的 AND stock > 0 删掉再运行，看看卖出了多少件、库存变成了多少。'],expect:'先查再扣：卖出 100 件，库存显示 9\n条件更新：卖出 10 件，库存剩 0'},code:`import sqlite3

stock = 10
reads = [stock for _ in range(100)]
sold = 0
for r in reads:
    if r > 0:
        stock = r - 1
        sold += 1
print("先查再扣：卖出", sold, "件，库存显示", stock)

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE goods (id INTEGER PRIMARY KEY, stock INTEGER)")
db.execute("INSERT INTO goods VALUES (1, 10)")
sold = 0
for _ in range(100):
    cur = db.execute("UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0")
    if cur.rowcount == 1:
        sold += 1
left = db.execute("SELECT stock FROM goods WHERE id = 1").fetchone()[0]
print("条件更新：卖出", sold, "件，库存剩", left)`,explain:[{at:'import sqlite3',text:'用 Python 自带的 SQLite 做第二种做法。'},{at:'stock = 10',text:'库存 10 件。'},{at:'reads = [stock for _ in range(100)]',text:'模拟高并发：100 个请求几乎同时去查库存，每个都读到了 10。'},{at:'sold = 0',text:'统计卖出的件数。'},{at:'for r in reads:',to:'sold += 1',text:'每个请求都根据自己读到的 10 判断“还有货”，然后把库存写成 10 - 1 = 9。100 个请求全部“成功”。'},{at:'print("先查再扣：卖出", sold, "件，库存显示", stock)',text:'卖出了 100 件，库存却只显示 9：严重超卖，而且库存数也是错的。'},{at:'db = sqlite3.connect(":memory:")',to:'db.execute("INSERT INTO goods VALUES (1, 10)")',text:'建商品表，1 号商品库存 10。'},{at:'sold = 0',text:'重新计数。'},{at:'for _ in range(100):',to:'cur = db.execute("UPDATE goods SET stock = stock - 1 WHERE id = 1 AND stock > 0")',text:'100 个请求，每个都执行条件更新：判断和扣减在同一条语句里原子完成。'},{at:'if cur.rowcount == 1:',to:'sold += 1',text:'rowcount 是这条语句影响的行数，1 表示扣减成功。'},{at:'left = db.execute("SELECT stock FROM goods WHERE id = 1").fetchone()[0]',text:'查出最终库存。'},{at:'print("条件更新：卖出", sold, "件，库存剩", left)',text:'只卖出 10 件，库存刚好为 0，没有超卖。'}]},
  {title:'短链接系统',body:'短链接就是把一个很长的网址变成 https://s.cn/6LAze 这样的短网址，访问它会自动跳转到原网址。核心设计：\n一、生成短码：最常见、冲突最少的做法是用发号器生成一个全局唯一的递增 ID（比如数据库自增、号段模式、雪花算法），再把它转成 62 进制（0-9、a-z、A-Z 一共 62 个字符）。6 位 62 进制就能表示 568 亿个不同的短码。用哈希截取的办法会有冲突，需要额外检测和处理；\n二、存储：一张映射表“短码 → 原网址”，短码上建唯一索引。同一个长网址要不要复用同一个短码，看业务需求；\n三、跳转：访问短链时查表，返回 302（临时重定向）跳到原网址。用 302 而不是 301（永久重定向），是因为 301 会被浏览器缓存，之后的访问不再经过短链服务，就没法统计点击次数，也没法修改或下线链接；\n四、性能：短链的访问是典型的读多写少，热门短码放进缓存；不存在的短码可以用布隆过滤器挡掉，防止缓存穿透。'},
  {title:'动手试试：62 进制短码',body:'我们用 Python 实现 62 进制的编码和解码，看看数字 ID 是怎么变成短码、又怎么还原回来的。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 base62.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python base62.py（Mac 用 python3 base62.py），对照下面的输出。','试试把一个很大的数，比如 62 ** 7 - 1，加进列表，看看它的短码有几位。'],expect:'1 → 1 → 1\n61 → Z → 61\n62 → 10 → 62\n100000000 → 6LAze → 100000000\n56800235583 → ZZZZZZ → 56800235583'},code:`ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode(n):
    if n == 0:
        return ALPHABET[0]
    chars = []
    while n:
        n, r = divmod(n, 62)
        chars.append(ALPHABET[r])
    return "".join(reversed(chars))

def decode(code):
    n = 0
    for ch in code:
        n = n * 62 + ALPHABET.index(ch)
    return n

for id_ in [1, 61, 62, 100000000, 62 ** 6 - 1]:
    code = encode(id_)
    print(id_, "→", code, "→", decode(code))`,explain:[{at:'ALPHABET = ',text:'62 个字符，分别代表 0 到 61。'},{at:'def encode(n):',text:'把一个数字 ID 编码成短码。'},{at:'if n == 0:',to:'return ALPHABET[0]',text:'0 直接返回第一个字符。'},{at:'chars = []',text:'从低位到高位依次存放每一位的字符。'},{at:'while n:',to:'chars.append(ALPHABET[r])',text:'和十进制转二进制一样：不断除以 62，余数就是当前这一位，用对应的字符表示。divmod 同时返回商和余数。'},{at:'return "".join(reversed(chars))',text:'余数是从低位到高位得到的，反转后拼起来就是短码。'},{at:'def decode(code):',text:'把短码还原成数字。'},{at:'n = 0',to:'n = n * 62 + ALPHABET.index(ch)',text:'从高位到低位，每读一个字符，就把之前的结果乘以 62，再加上这个字符代表的数。'},{at:'return n',text:'得到原来的 ID。'},{at:'for id_ in [1, 61, 62, 100000000, 62 ** 6 - 1]:',to:'print(id_, "→", code, "→", decode(code))',text:'对几个数字编码再解码：62 变成两位的 10；1 亿只要 5 位；6 位的最大值 ZZZZZZ 能表示五百多亿个链接。'}]},
  {title:'订单超时 30 分钟自动取消',body:'常见的实现方案：\n一、定时扫表：每分钟扫描一次“待支付并且创建时间超过 30 分钟”的订单，逐个取消。简单可靠，但有延迟，订单量大时扫表有压力，要有合适的索引；\n二、延迟消息：下单时发一条 30 分钟后才投递的延迟消息（RocketMQ 原生支持），到时间后消费者去取消订单；\n三、Redis 有序集合：以“到期时间”作为分数，把订单 ID 放进有序集合，后台不断取出分数小于当前时间的订单处理。\n无论哪种方案，都要注意：\n一、取消时一定要检查订单当前的状态：用 UPDATE orders SET status = \'已取消\' WHERE id = ? AND status = \'待支付\'。用户可能刚好在第 29 分 59 秒付了款，如果不检查状态，就会把已支付的订单错误地取消掉；\n二、取消成功（影响行数为 1）后才释放库存、优惠券，并且这些操作都要幂等；\n三、延迟消息和 Redis 都可能丢失或者延迟，要保留一个低频的扫表任务做兜底；\n四、支付回调和取消可能同时发生，靠状态条件更新保证只有一个能成功。',code:`UPDATE orders
SET status = 'cancelled'
WHERE id = 42 AND status = 'unpaid';`,explain:[{at:'UPDATE orders',text:'取消订单。'},{at:'SET status = \'cancelled\'',text:'改成已取消。'},{at:'WHERE id = 42 AND status = \'unpaid\';',text:'关键在于条件里的 status = unpaid：只有订单还处于“待支付”时才会取消。如果用户已经支付，状态是 paid，这条语句影响 0 行，什么都不会改。'}]},
  {title:'高并发计数：点赞数、浏览量',body:'一条热门微博每秒有几万次点赞，如果所有请求都去给同一个计数器加一，这一个 key（或者数据库里的这一行）就成了热点，所有请求都在抢它，性能上不去。常用的办法：\n一、计数分片：把一个计数器拆成 N 个，比如 like:42:0 到 like:42:9，每次点赞随机选一个加一，读的时候把 N 个加起来。热点被分散到了 N 个 key 上；\n二、本地聚合：服务在内存里先累加一小段时间（比如 1 秒），再一次性写入 Redis；\n三、异步落库：Redis 里的计数定期批量同步到数据库，而不是每次点赞都写数据库。\n还要注意：\n一、去重：同一个用户不能重复点赞，要用“用户 ID + 对象 ID”的唯一记录来判断；\n二、对账：计数器可能因为各种故障不准确，要保留点赞明细，定期用明细重新统计、修正计数器。'},
  {title:'评论和楼中楼',body:'评论区常见的展示方式是“楼中楼”：一级评论下面挂着一串回复，回复里还可以 @ 某个人回复。表结构可以这样设计：\nparent_id：这条评论直接回复的是哪一条，用来显示“回复 @某某”；\nroot_id：这一串回复最开始的那条一级评论。一级评论的 root_id 为 0（或者等于自己）。\n有了 root_id，查询就很简单：先分页查出一级评论（root_id = 0），再对每条一级评论，按 root_id 查出它下面的前几条回复。不需要递归地一层层往下找。\n热门内容的评论数量巨大，还可以把评论数、热门评论缓存起来，按时间或热度建合适的索引。',code:`CREATE TABLE comments (
    id         BIGINT PRIMARY KEY,
    post_id    BIGINT NOT NULL,
    root_id    BIGINT NOT NULL DEFAULT 0,
    parent_id  BIGINT NOT NULL DEFAULT 0,
    user_id    BIGINT NOT NULL,
    content    TEXT,
    created_at DATETIME,
    INDEX idx_post_root (post_id, root_id, created_at)
);

SELECT * FROM comments WHERE post_id = 7 AND root_id = 0
ORDER BY created_at DESC LIMIT 20;

SELECT * FROM comments WHERE post_id = 7 AND root_id = 1001
ORDER BY created_at LIMIT 3;`,explain:[{at:'CREATE TABLE comments (',to:'post_id    BIGINT NOT NULL,',text:'评论表：评论 ID 和所属的帖子。'},{at:'root_id    BIGINT NOT NULL DEFAULT 0,',text:'这串回复的一级评论 ID，一级评论自己是 0。'},{at:'parent_id  BIGINT NOT NULL DEFAULT 0,',text:'直接回复的那条评论，用于显示“回复 @某某”。'},{at:'user_id    BIGINT NOT NULL,',to:'created_at DATETIME,',text:'评论人、内容和时间。'},{at:'INDEX idx_post_root (post_id, root_id, created_at)',text:'联合索引，正好支持下面两种查询：按帖子和 root_id 过滤，再按时间排序。'},{at:'SELECT * FROM comments WHERE post_id = 7 AND root_id = 0',to:'ORDER BY created_at DESC LIMIT 20;',text:'第一步：查帖子 7 最新的 20 条一级评论。'},{at:'SELECT * FROM comments WHERE post_id = 7 AND root_id = 1001',to:'ORDER BY created_at LIMIT 3;',text:'第二步：对一级评论 1001，查出它下面最早的 3 条回复，页面上显示“共 N 条回复，点击展开”。'}]},
  {title:'面试时怎么讲项目',body:'讲项目时按这条线讲，逻辑最清楚：\n一、业务目标和规模：这个系统是做什么的，有多少用户、多大的流量和数据量；\n二、我的职责：我具体负责哪一部分，不要把团队的工作都说成自己的；\n三、遇到的瓶颈或难点：比如高峰期接口超时、数据不一致；\n四、方案和取舍：考虑过哪几种方案，为什么选了这个，代价是什么；\n五、怎么验证：压测、灰度、监控指标；\n六、结果和复盘：用真实的数据说明效果，以及如果重来会怎么做得更好。\n数据一定要真实、能解释。如果你说“我把接口性能提升了 10 倍”，面试官几乎一定会追问：原来是多少、现在是多少，用什么指标衡量的（平均值还是 P99），在什么压力下测的，瓶颈具体是什么、怎么定位到的，为什么这个改法有效。答不上来，反而会减分。'},
  {title:'故障处理：再回顾一遍',body:'系统设计面试最后，面试官常常会问：“线上接口突然大面积超时，你怎么办？”可以按“线上故障排查实战”那一关的思路回答：\n一、止血优先：确认影响范围和开始时间，看最近有没有发布、改配置、流量突增。和发布时间吻合就立刻回滚；也可以先扩容、限流、降级非核心功能；\n二、保存现场：日志、pprof、监控截图；\n三、定位：用链路追踪看慢在哪一段，再沿着那个方向深入：慢查询、连接池被占满、下游服务变慢、GC、网络；\n四、修复和验证：用同样的流量验证问题已经解决；\n五、复盘改进：补监控告警、压测、预案，避免再次发生。\n回答时体现出“先恢复服务、再找原因、最后防止复发”的顺序，就能给面试官留下有实战经验的印象。'}
 ],quiz:[
  {id:'be-design-1',q:'系统设计面试一开始，最应该先做的是？',options:['直接画出最复杂的架构图','先问清需求和数据规模','先确定用哪个数据库品牌','马上开始写核心代码'],why:['不了解需求就画复杂架构，很可能过度设计或答非所问。','','技术选型要依据需求和规模，应在后面决定。','系统设计关注架构和取舍，不是先写代码。'],answer:1,explain:'功能范围、QPS、数据量、一致性和延迟要求决定了设计方向；没有数字的设计无法判断是否合理。',interview:'q-7effdfe28efadfc5'},
  {id:'be-design-2',q:'秒杀扣库存，下面哪种做法能防止超卖？',options:['先 SELECT 查库存，大于 0 再 UPDATE','条件 UPDATE n > 0 并检查影响行数','在应用内存里用变量计数','Redis 先 GET 判断再 DECR'],why:['先查后改之间有并发窗口，多个请求可能同时看到库存大于 0。','','多实例部署时内存计数各自独立，重启也会丢失。','GET 和 DECR 是两条命令，中间同样有并发窗口；要用 Lua 合成一步。'],answer:1,explain:'检查和扣减必须原子完成：UPDATE stock SET n = n - 1 WHERE id = ? AND n > 0，并确认影响行数为 1。',interview:'q-d8a0de319df7b53f'},
  {id:'be-design-3',type:'multi',q:'秒杀系统应对瞬时流量，下面哪些手段有效？（多选）',options:['静态资源和页面放到 CDN','网关按用户、IP 限流防刷','库存预热到缓存，请求进队列异步下单','让所有请求直接访问数据库'],why:['','','','瞬时流量直接打到数据库会把它压垮，核心思路是层层过滤。'],answers:[0,1,2],explain:'核心是层层过滤，越往后请求越少；队列满时要明确拒绝或返回排队中。',interview:'q-86c77d0e210b4bb1'},
  {id:'be-design-4',q:'短链接系统中，生成短码最常见、冲突最少的方式是？',options:['随机生成 3 个字母','发号器取唯一整数转 62 进制','长网址 MD5 取前 2 位','使用当前时间戳的秒数'],why:['3 个字母只有一万多种组合，很快就会冲突。','','只取 2 位冲突概率极高。','同一秒内的多个请求会得到相同短码。'],answer:1,explain:'62 进制 7 位就能表示三万多亿个；还要对 ID 做混淆，避免短码被逐个遍历。',interview:'q-3d7048a20ee437b3'},
  {id:'be-design-5',type:'judge',q:'订单超时取消时，只要延迟消息按时到了，就可以直接把订单改成“已取消”，不需要检查订单当前状态。',answer:false,explain:'用户可能恰好在此时付款，取消必须带状态条件（WHERE status = 待支付），保证两个操作只有一个成功。',interview:'q-6cfed07bfb92e432'},
  {id:'be-design-6',q:'一条热门微博每秒有几万次点赞，单个计数 key 成了热点。下面哪种方案最合适？',options:['每次点赞都 UPDATE 数据库','计数拆成多个分片 key 再汇总','干脆不统计点赞数','用一把全局锁串行计数'],why:['每秒几万次更新同一行，数据库会被行锁竞争拖垮。','','点赞数是核心功能，不能不统计。','全局锁让所有点赞串行执行，吞吐极低。'],answer:1,explain:'分片计数分散写入，读取时求和或定期汇总，并保留明细对账；事件要有唯一 ID 去重。',interview:'q-06d4d7964ebf2ecc'},
  {id:'be-design-7',type:'fill',q:'评论表中，用 ____ 字段指向一串回复最开始的那条一级评论，方便查询“楼中楼”。',accepted:['root_id','rootid','root'],explain:'parent_id 表示直接回复的是哪一条；索引按“root_id + 状态 + 时间”这类查询模式设计。',interview:'q-0b3b2ad9786d85b5'},
  {id:'be-design-8',q:'介绍项目时说“我把接口性能提升了 10 倍”，面试官最可能追问什么？',options:['平时用的是什么代码编辑器','瓶颈怎么定位、怎么测的','这个项目对外叫什么名字','一共有几个人参与了开发'],why:['工具与性能提升无关。','','项目名称说明不了数据的可信度。','团队规模不是这类数字最关心的问题。'],answer:1,explain:'面试官会追问定位过程、对比过哪些方案、测试的数据规模和流量、P99 和错误率的变化；说不清来源的数字反而减分。',interview:'q-7effdfe28efadfc5'},
  {id:'be-design-9',q:'线上接口突然大面积超时，你第一步应该做什么？',options:['立刻开始阅读代码找出原因','确认范围、对照变更并止血','马上把所有的服务都重启一遍','先等待用户反馈更多的信息'],why:['大面积故障时应先止血，读代码可以放到之后。','','没有证据就重启所有服务，可能扩大影响并丢失现场。','等待会让故障持续扩大。'],answer:1,explain:'先止血再定位：确认影响范围、对照最近的发布和配置变更，必要时回滚、扩容或限流，同时保留现场证据。',interview:'q-8fcc9f406b2f5246'},
  {id:'be-design-10',type:'short',q:'设计一个“订单超时 30 分钟未支付自动取消”的功能，说说方案和需要注意的点。',reference:'方案：下单时发一条 30 分钟后投递的延迟消息（或用 Redis 有序集合按到期时间存订单 id，后台轮询），到期后检查并取消；同时保留定时扫表作为兜底，扫描“待支付且创建超过 30 分钟”的订单，状态和创建时间上建索引、分批处理。注意点：取消时按状态条件更新，防止和用户支付并发冲突；释放库存要幂等，防止重复补回；消息可能丢失或重复，所以要幂等消费加扫表兜底；记录日志便于对账。',points:['延迟消息或 ZSet + 扫表兜底','按状态条件更新','库存释放幂等','消息可能丢失或重复','索引、分批、对账'],explain:'核心难点是并发下的状态一致和可靠兜底。',interview:'q-6cfed07bfb92e432'},
 ]},
];

// 从小白到专家的关卡顺序：入门 6 关、进阶 6 关、高阶 6 关、专家 5 关。
export const backendLevelOrder=['be-basics','be-cli','be-db101','be-sql','be-ds','be-algo2','be-index','be-tx','be-log','be-redis','be-linux','be-algo','be-network','be-http','be-os','be-io','be-trouble','be-mq','be-kafka','be-ms','be-cloud','be-es','be-design'];
const allLevels=[...coreLevels,beBasics,beCli,beDb101,beDs,beAlgo2,beLog,beHttp,beTrouble,beIo,beKafka,beCloud];
export const backendLevels:AiLevel[]=backendLevelOrder.map(id=>{const l=allLevels.find(x=>x.id===id);if(!l)throw new Error('缺少关卡：'+id);return l});
