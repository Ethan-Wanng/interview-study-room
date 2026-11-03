import type {AiLevel} from '../journey';

// 小白起步：数据库入门。
export const beDb101:AiLevel={id:'be-db101',title:'数据库入门：表、行和增删改查',summary:'从零学会建表、插入、查询、修改、删除，认识主键和事务',lessons:[
  {title:'数据库是什么，为什么需要它',body:'程序运行时的数据都在内存里，程序一重启就没了。用户、订单、商品这些数据要长期、可靠地保存下来，还要能被很多请求同时安全地读写、快速地查找，这就是数据库的工作。\n为什么不直接存成文件？因为数据库帮你解决了很多难题：几百万条数据里怎么快速找到一条；很多人同时修改时数据怎么不乱；只写了一半就断电怎么办；怎么方便地统计、排序、筛选。\n最常用的是“关系型数据库”，比如 MySQL、PostgreSQL，用 SQL 语言来操作。几乎所有后端岗位都会用到数据库，面试也一定会问，这一关从最基础的开始学。'},
  {title:'表、行、列：像 Excel 一样',body:'关系型数据库可以想象成一个装满了表格的柜子：\n数据库（database）：整个柜子，一个项目通常用一个；\n表（table）：柜子里的一张表格，存一类东西，比如 users 表存用户，orders 表存订单；\n行（row）：表里的一行，是一条完整的记录，比如“Tom，20 岁”就是一个具体的用户；\n列（column）：表里的一列，是所有记录共有的一个属性，比如 name、age。\n和 Excel 不同的是：每一列都要事先规定好数据类型，比如 age 只能存整数，不能存“二十岁”这样的文字。这样数据才规范，查询和计算也更快。'},
  {title:'建表：定义每一列的类型',body:'用 CREATE TABLE 建表，要写清楚每一列的名字和类型。MySQL 中常用的类型：\nINT、BIGINT：整数，BIGINT 范围更大，常用于 id；\nVARCHAR(n)：最多 n 个字符的字符串，比如名字、邮箱；\nTEXT：很长的文本，比如文章内容；\nDATETIME：日期和时间；\nDECIMAL(10,2)：精确的小数，总共 10 位、其中 2 位小数，专门用来存金额，比如 19.99 元。不要用 FLOAT、DOUBLE 存金额，它们有精度误差；另一种常见做法是用整数存“分”。\n还可以给列加约束：NOT NULL 表示不能为空，DEFAULT 指定默认值。',code:`CREATE TABLE users (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(50) NOT NULL,
    age        INT,
    balance    DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME
);`,explain:[{at:'CREATE TABLE users (',text:'创建一张叫 users 的表。'},{at:'id         BIGINT PRIMARY KEY AUTO_INCREMENT,',text:'id 列：大整数，是主键，插入新行时自动加一，不用自己填。'},{at:'name       VARCHAR(50) NOT NULL,',text:'名字：最多 50 个字符，不能为空。'},{at:'age        INT,',text:'年龄：整数，可以为空。'},{at:'balance    DECIMAL(10,2) DEFAULT 0,',text:'余额：精确的小数，两位小数，默认是 0。'},{at:'created_at DATETIME',text:'创建时间。'}]},
  {title:'主键：每一行的身份证号',body:'主键（PRIMARY KEY）用来唯一地标识表里的每一行，就像身份证号：\n一、不能重复：两行的主键不能一样，插入重复的主键会报错；\n二、不能为空。\n有了主键，就能准确地找到、修改、删除某一行，不会弄错人。比如两个用户都叫 Tom，用名字没法区分，用主键 id 就可以。\n最常见的做法是用一个自增的整数 id 当主键：每插入一行，数据库自动给它分配下一个编号。一张表只能有一个主键，MySQL 还会按主键来组织和存储数据，按主键查询非常快。'},
  {title:'增删改查：四个最基本的操作',body:'对数据的操作归纳起来就四种，简称 CRUD：\nINSERT（增）：插入新的行；\nSELECT（查）：查询数据，最常用；\nUPDATE（改）：修改已有的行；\nDELETE（删）：删除行。\n查询时常用的几个部分：\nWHERE：筛选条件，比如 age >= 18；\nORDER BY 列 DESC：按某列排序，DESC 是从大到小，ASC（默认）是从小到大；\nLIMIT n：最多只取 n 条。\n最重要的一条安全规则：UPDATE 和 DELETE 一定要带 WHERE 条件。没有 WHERE 的 DELETE FROM users; 会把整张表的所有行都删掉，而不是只删第一行。',code:`INSERT INTO users (name, age) VALUES ('Tom', 20);
SELECT name, age FROM users WHERE age >= 18 ORDER BY age DESC LIMIT 5;
UPDATE users SET age = 21 WHERE id = 1;
DELETE FROM users WHERE id = 1;`,explain:[{at:'INSERT INTO users (name, age) VALUES (\'Tom\', 20);',text:'插入一行：括号里列出要填的列，VALUES 后面是对应的值。id 自增，不用写。SQL 里的字符串用单引号。'},{at:'SELECT name, age FROM users WHERE age >= 18 ORDER BY age DESC LIMIT 5;',text:'查询年龄大于等于 18 的用户的名字和年龄，按年龄从大到小排，只取前 5 个。'},{at:'UPDATE users SET age = 21 WHERE id = 1;',text:'把 id 为 1 的用户年龄改成 21。'},{at:'DELETE FROM users WHERE id = 1;',text:'删除 id 为 1 的用户。'}]},
  {title:'动手试试：用 SQLite 练习增删改查',body:'不用安装 MySQL，Python 自带了一个小巧的数据库 SQLite，SQL 语法几乎一样，最适合入门练习。我们建一张用户表，把增删改查都做一遍，再试试主键重复和不带 WHERE 的 DELETE 会发生什么。\n（SQLite 的写法和 MySQL 有一点点不同：自增写成 AUTOINCREMENT，类型也更宽松，但基本的 SQL 是通用的。）',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 crud.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python crud.py（Mac 用 python3 crud.py），对照下面的输出。','自己加一句查询：找出名字是 Bob 的用户，用 show 打印出来。'],expect:'全部： [(1, \'Tom\', 20), (2, \'Amy\', 17), (3, \'Bob\', 25), (4, \'Cat\', 18)]\n成年人按年龄倒序： [(\'Bob\', 25), (\'Tom\', 20)]\n改完 Tom： [(\'Tom\', 21)]\n删掉 Amy 后还剩： [(3,)]\n主键重复： UNIQUE constraint failed: users.id\n不带 WHERE 的 DELETE 之后： [(0,)]'},code:`import sqlite3

db = sqlite3.connect(":memory:")
db.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER
)
""")
db.execute("INSERT INTO users (name, age) VALUES ('Tom', 20)")
db.executemany("INSERT INTO users (name, age) VALUES (?, ?)",
               [("Amy", 17), ("Bob", 25), ("Cat", 18)])

def show(title, sql):
    print(title, db.execute(sql).fetchall())

show("全部：", "SELECT id, name, age FROM users")
show("成年人按年龄倒序：", "SELECT name, age FROM users WHERE age >= 18 ORDER BY age DESC LIMIT 2")
db.execute("UPDATE users SET age = 21 WHERE id = 1")
show("改完 Tom：", "SELECT name, age FROM users WHERE id = 1")
db.execute("DELETE FROM users WHERE name = 'Amy'")
show("删掉 Amy 后还剩：", "SELECT COUNT(*) FROM users")
try:
    db.execute("INSERT INTO users (id, name) VALUES (1, 'Dup')")
except sqlite3.IntegrityError as e:
    print("主键重复：", e)
db.execute("DELETE FROM users")
show("不带 WHERE 的 DELETE 之后：", "SELECT COUNT(*) FROM users")`,explain:[{at:'import sqlite3',text:'导入 Python 自带的 SQLite 模块。'},{at:'db = sqlite3.connect(":memory:")',text:'在内存里创建一个临时数据库，程序结束就消失，练习时不会留下任何文件。'},{at:'db.execute("""',to:'""")',text:'执行建表语句。三个双引号是 Python 的多行字符串，方便写长 SQL。表里有自增主键 id、不能为空的 name 和 age。'},{at:'db.execute("INSERT INTO users (name, age) VALUES (\'Tom\', 20)")',text:'插入 Tom，他会自动得到 id 1。'},{at:'db.executemany("INSERT INTO users (name, age) VALUES (?, ?)",',to:'[("Amy", 17), ("Bob", 25), ("Cat", 18)])',text:'一次插入多行。? 是占位符，后面列表里每一组值依次填进去，这样写还能防止 SQL 注入攻击。'},{at:'def show(title, sql):',to:'print(title, db.execute(sql).fetchall())',text:'一个小工具：执行查询，用 fetchall 取出所有结果行，和标题一起打印。'},{at:'show("全部：", "SELECT id, name, age FROM users")',text:'查出全部 4 个用户，每行是一个元组。'},{at:'show("成年人按年龄倒序："',text:'筛选 18 岁及以上，按年龄从大到小，取前 2 个：Bob 和 Tom。'},{at:'db.execute("UPDATE users SET age = 21 WHERE id = 1")',to:'show("改完 Tom：", "SELECT name, age FROM users WHERE id = 1")',text:'把 id 1（Tom）改成 21 岁，再查出来确认。'},{at:'db.execute("DELETE FROM users WHERE name = \'Amy\'")',to:'show("删掉 Amy 后还剩：", "SELECT COUNT(*) FROM users")',text:'删除 Amy。COUNT(*) 统计行数，还剩 3 个。'},{at:'try:',to:'print("主键重复：", e)',text:'故意插入一个 id 为 1 的新行，主键重复，数据库拒绝并报错。'},{at:'db.execute("DELETE FROM users")',to:'show("不带 WHERE 的 DELETE 之后：", "SELECT COUNT(*) FROM users")',text:'不带 WHERE 的 DELETE：整张表的数据全没了，只剩 0 行。真实环境里这就是重大事故。'}]},
  {title:'事务：要么全做，要么全不做',body:'有些操作必须由好几步一起完成。比如转账：A 扣 100 元，B 加 100 元。如果只执行了第一步就断电了，A 的钱扣了，B 却没收到，100 元凭空消失。\n事务就是把多步操作打包成一个整体：\nBEGIN（或 START TRANSACTION）：开始事务；\nCOMMIT：所有步骤都成功了，提交，让修改正式生效；\nROLLBACK：中途出错了，回滚，把已经做的修改全部撤销，就像什么都没发生过。\n事务有四个特性，简称 ACID：原子性（A，要么全做、要么全不做）、一致性（C，前后数据都符合规则，比如转账前后总金额不变）、隔离性（I，多个事务同时进行时互不干扰）、持久性（D，提交后即使断电数据也不会丢）。进阶阶段的“事务、隔离级别与锁”会详细讲。',code:`BEGIN;
UPDATE account SET balance = balance - 100 WHERE name = 'A';
UPDATE account SET balance = balance + 100 WHERE name = 'B';
COMMIT;`,explain:[{at:'BEGIN;',text:'开始一个事务。'},{at:'UPDATE account SET balance = balance - 100 WHERE name = \'A\';',text:'A 扣 100。'},{at:'UPDATE account SET balance = balance + 100 WHERE name = \'B\';',text:'B 加 100。如果这一步失败，就执行 ROLLBACK，A 的扣款也会被撤销。'},{at:'COMMIT;',text:'两步都成功，提交，修改一起生效。'}]},
  {title:'学数据库的顺序',body:'几乎所有后端面试都会问数据库，因为后端的核心工作就是“正确、高效地读写数据”，数据库是最容易出性能问题和数据错误的地方。\n建议按这个顺序学，后面的关卡也是这样安排的：\n一、会用：建表、增删改查、多表查询（下一关“SQL 与表设计”）；\n二、会设计：表结构怎么设计合理，字段类型怎么选；\n三、懂索引：为什么查询会慢，怎么让它变快（“索引与执行计划”）；\n四、懂事务和锁：多个请求同时修改数据时，怎么保证不出错（“事务、隔离级别与锁”）；\n五、懂原理和架构：日志、主从复制、分库分表（“MySQL 日志、主从复制与分库分表”）。\n每学一个概念，都在 SQLite 或者 MySQL 里亲手试一试，比只看书记得牢得多。'}
 ],quiz:[
 {id:'be-db101-1',q:'在 users 表里，“一个具体的用户 Tom 的全部信息”对应的是？',options:['表中的一列','表中的一行','一整张表','一个数据库'],why:['一列是所有用户的同一个属性，比如全部用户的年龄。','','一张表包含所有用户的记录。','数据库里可以有很多张表。'],answer:1,explain:'一行是一条记录；一列是所有记录的同一个属性。'},
 {id:'be-db101-2',q:'关于主键，下面说法正确的是？',options:['主键的值允许重复','主键可以为空值','唯一且非空，用来标识一行','主键必须是字符串类型'],why:['主键必须唯一，否则无法区分两行记录。','主键不允许为 NULL。','','主键常用自增整数，也可以是字符串或组合字段。'],answer:2,explain:'主键唯一、非空，常用自增整数。'},
 {id:'be-db101-3',q:'查询所有年龄大于等于 18 的用户名字，正确的 SQL 是？',options:['SELECT name FROM users WHERE age >= 18','GET name FROM users IF age >= 18','SELECT users WHERE age >= 18','SELECT name IN users WHERE age >= 18'],why:['','SQL 中没有 GET 和 IF 这样的查询语法。','缺少要查询的列和 FROM 关键字。','表名前应使用 FROM，而不是 IN。'],answer:0,explain:'SELECT 列 FROM 表 WHERE 条件。'},
 {id:'be-db101-4',type:'judge',q:'执行 DELETE FROM users;（没有 WHERE）只会删除第一行。',answer:false,explain:'没有 WHERE 会删除整张表的所有行，这是新手最危险的错误之一。'},
 {id:'be-db101-5',type:'fill',q:'把 id 为 1 的用户年龄改成 21：____ users SET age = 21 WHERE id = 1;',accepted:['UPDATE','update'],explain:'修改用 UPDATE ... SET ... WHERE ...。'},
 {id:'be-db101-6',q:'想按年龄从大到小取前 5 个用户，应该用？',options:['ORDER BY age LIMIT 5','ORDER BY age DESC LIMIT 5','GROUP BY age LIMIT 5','ORDER BY age ASC LIMIT 5'],why:['默认是升序，取到的是年龄最小的 5 个。','','GROUP BY 用于分组聚合，不能保证按年龄排序。','ASC 是升序，取到的是年龄最小的 5 个。'],answer:1,explain:'DESC 降序，LIMIT 限制条数。'},
 {id:'be-db101-7',q:'存储商品价格（比如 19.99 元），最合适的类型是？',options:['FLOAT 单精度浮点','DECIMAL(10,2) 定点数','VARCHAR 字符串','DOUBLE 双精度浮点'],why:['浮点数存在精度误差，金额累加后可能出现几分钱的偏差。','','字符串无法直接参与数值计算和排序比较。','双精度同样是浮点数，仍有精度误差。'],answer:1,explain:'金额用 DECIMAL 定点数，或者用整数存“分”；浮点数不能精确表示很多小数。'},
 {id:'be-db101-8',type:'multi',q:'转账“A 扣 100、B 加 100”放在一个事务里，下面哪些说法正确？（多选）',options:['两步都成功了才会提交','中途出错可以回滚，A 的钱不会凭空少','提交前其他事务就能看到 A 已扣款','使用事务能让这两条 SQL 跑得更快'],why:['','','在默认隔离级别下，未提交的修改对其他事务不可见，否则会出现脏读。','事务是为了保证正确性（原子、一致、隔离、持久），还会带来少量开销，不是为了加速。'],answers:[0,1],explain:'事务保证原子性（全成功或全回滚）、隔离性（未提交的修改别人看不到）和持久性（提交后不丢）。'},
 {id:'be-db101-9',type:'judge',q:'ACID 中的 A 指原子性：事务里的操作要么全部生效，要么全部不生效。',answer:true,explain:'A 原子性、C 一致性、I 隔离性、D 持久性。'},
 {id:'be-db101-10',type:'short',q:'为什么几乎所有后端面试都会问数据库？准备数据库题应该按什么顺序学？',reference:'订单、库存、余额等最核心的数据都在数据库里，接口慢、超卖、数据丢失这些真实问题都和数据库有关，所以一定会考。建议按顺序学：先会建表和 CRUD、事务概念；再学 SQL 进阶和表设计；然后是索引和执行计划；接着是事务隔离、锁、MVCC；再到日志、主从复制和分库分表；最后是缓存一致性和故障排查。',points:['核心数据都在数据库','真实问题：慢、超卖、丢数据','先 CRUD 和事务，再索引','然后锁与 MVCC、日志与复制、缓存'],explain:'后面的关卡就是按这个顺序安排的。',interview:'q-29a390724db3a232'},
]};
