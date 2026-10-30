import type {AiLevel} from '../journey';

// 小白起步：数据库入门。
export const beDb101:AiLevel={id:'be-db101',title:'数据库入门：表、行和增删改查',summary:'从零学会建表、插入、查询、修改、删除，认识主键和事务',lessons:[
 {title:'数据库、表、行、列',body:'数据库像一个装满表格的柜子。一张表（table）存一类东西，比如 users 存用户；每一行（row）是一条记录，比如一个用户；每一列（column）是一个属性，比如 name、age。MySQL、PostgreSQL 都是常见的关系型数据库，用 SQL 语言操作。'},
 {title:'建表和主键',body:'建表时要给每列定类型：INT 整数、VARCHAR(n) 字符串、DATETIME 时间、DECIMAL 金额。主键（PRIMARY KEY）唯一标识一行，不能重复也不能为空，通常用自增整数 id。',code:'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(50) NOT NULL,\n  age INT,\n  created_at DATETIME\n);'},
 {title:'增删改查（CRUD）',body:'INSERT 插入，SELECT 查询，UPDATE 修改，DELETE 删除。WHERE 写条件，ORDER BY 排序，LIMIT 限制条数。UPDATE 和 DELETE 一定要带 WHERE，否则会改掉或删掉整张表。',code:"INSERT INTO users(name, age) VALUES ('Tom', 20);\nSELECT name, age FROM users WHERE age >= 18 ORDER BY age DESC LIMIT 10;\nUPDATE users SET age = 21 WHERE id = 1;\nDELETE FROM users WHERE id = 1;"},
 {title:'事务：要么全做，要么全不做',body:'转账要“A 扣钱”和“B 加钱”两步。如果只做了一步就断电，钱就凭空少了。事务把多步操作包成一个整体：BEGIN 开始，全部成功就 COMMIT 提交，出错就 ROLLBACK 回滚。这叫原子性；事务还保证一致性、隔离性和持久性（合称 ACID）。'},
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
