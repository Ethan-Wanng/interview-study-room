import {A,type Story} from '../story';

// 数据库面试题动画（三）：唯一索引、自增、COUNT、字符类型。
export const dbMysqlC:Record<string,Story>={
 'q-bccf2c6308af43a2':{title:'有唯一索引，数据就一定不重复吗',beats:[
  {say:'用户表的 phone 列建了唯一索引，看起来手机号不会重复了。',add:[A('u','🔐','UNIQUE(phone)',320,70,{kind:'item',tone:'primary'})]},
  {say:'坑一：唯一索引允许多个 NULL。没填手机号的用户可以有很多个，NULL 之间不算重复。',add:[A('n1','∅','phone = NULL',140,190,{kind:'tag'}),A('n2','∅','phone = NULL',140,260,{kind:'tag'})],send:[{from:'n1',to:'u',tone:'warm'},{from:'n2',to:'u',tone:'warm'}],bubble:{who:'u',text:'两个 NULL 我都收'}},
  {say:'坑二：联合唯一索引 (a, b) 约束的是组合不重复，不代表 a 或 b 单独唯一。',add:[A('ab','🧩','UNIQUE(a,b)：(1,2)(1,3) 都合法',480,190,{kind:'tag',tone:'warm'})]},
  {say:'坑三：字符串是否“相同”看排序规则，比如大小写不敏感时 Tom 和 tom 算重复；前缀索引只比较前几个字符。',add:[A('co','🔤','Tom = tom ?',480,270,{kind:'tag'})]},
  {say:'手机号必填且唯一：NOT NULL 加 UNIQUE 一起用。软删除后能不能复用手机号，要单独设计约束，别只靠“先查再插”。',add:[A('fix','✅','NOT NULL + UNIQUE',320,320,{kind:'tag',tone:'ok'})],tone:{u:'ok'}},
  {say:'记住唯一索引的边界。',memo:['允许多个 NULL','联合唯一约束的是组合']},
 ]},
 'q-d4f5f1dfd78847c4':{title:'唯一索引一定比普通索引快吗',beats:[
  {say:'两张一样的表：一张在 email 上建唯一索引，一张建普通索引。来比比读和写。',add:[A('u','🔐','唯一索引',170,90,{kind:'item',tone:'primary'}),A('n','🌲','普通索引',470,90,{kind:'item'})]},
  {say:'等值查询：唯一索引找到一条就停；普通索引还要看看下一条是不是同一个值。但差别通常很小。',add:[A('r','🔍','WHERE email = ?',320,200,{kind:'tag'})],send:[{from:'r',to:'u',text:'找到即停',tone:'ok'},{from:'r',to:'n',text:'再看一条'}]},
  {say:'写入：唯一索引必须先检查有没有重复，往往要把相关页读进内存。',add:[A('w','✏️','INSERT',320,300,{kind:'tag',tone:'warm'})],send:[{from:'w',to:'u',text:'先查重',tone:'warm'}]},
  {say:'普通辅助索引在启用 change buffer 时，可以先把修改记下来，以后再合并，写入更省。',send:[{from:'w',to:'n',text:'先记下，稍后合并',tone:'ok'}]},
  {say:'所以没有绝对的快慢。要不要唯一索引，首先看业务是否要求唯一，再用真实负载测性能。',memo:['读：唯一略快，差别小','写：唯一要查重，可能更慢']},
 ]},
 'q-b6915aa2e0ed5bfb':{title:'自增主键为什么不连续',beats:[
  {say:'自增主键像银行取号机：来一个人发一个号，号发出去就收不回来了。',add:[A('m','🎫','取号机：下一个 5',320,70,{kind:'item',tone:'primary'})]},
  {say:'事务拿到了 5 号，插入后却回滚了。5 号作废，下一个人拿到 6。',add:[A('t1','🧾','事务 A：5 号 → 回滚',150,200,{kind:'tag',tone:'bad'})],sub:{m:'下一个 6'}},
  {say:'插入冲突、INSERT IGNORE 也会消耗号码；批量插入可能一次预留好几个号，没用完也不还。',add:[A('t2','📦','批量插入预留 8 个',480,200,{kind:'tag',tone:'warm'})],sub:{m:'下一个 14'}},
  {say:'并发事务交错拿号、删除记录，同样会留下空洞。MySQL 8.0 会持久化计数器，但“不保证连续”这一点没变。',add:[A('ids','🔢','1 2 3 4 6 7 14 …',320,300,{kind:'tag'})]},
  {say:'需要连续的业务流水号（比如发票号），应单独设计序列和作废记录，不要依赖主键连续。',bubble:{who:'m',text:'我只保证不重复，\n不保证连续'}},
  {say:'记住原因。',memo:['号发出去就不回收','回滚、冲突、批量、并发都会跳号']},
 ]},
 'q-748dcff591550a41':{title:'COUNT(*)、COUNT(1)、COUNT(字段)',beats:[
  {say:'一张表有 5 行，其中 2 行的 email 是 NULL。',add:[A('t','🗂️','5 行（2 行 email 为 NULL）',320,70,{kind:'item',tone:'primary'})]},
  {say:'COUNT(*) 和 COUNT(1)：数结果有几行，包括含 NULL 的行，都是 5。',add:[A('a','🔢','COUNT(*) = 5',130,200,{kind:'tag',tone:'ok'}),A('b','🔢','COUNT(1) = 5',130,270,{kind:'tag',tone:'ok'})],send:[{from:'t',to:'a'},{from:'t',to:'b'}]},
  {say:'COUNT(email)：只数 email 不是 NULL 的行，是 3。COUNT(DISTINCT email) 还会去重。',add:[A('c','🔢','COUNT(email) = 3',480,200,{kind:'tag',tone:'warm'})],send:[{from:'t',to:'c'}]},
  {say:'COUNT(1) 并不比 COUNT(*) 快，优化器对它们的处理基本一样。',bubble:{who:'a',text:'我俩一样快'}},
  {say:'InnoDB 因为 MVCC，不同事务看到的行数可能不同，所以没有一个现成的精确总数，通常要扫描一个可用的索引。题目里的 COUNT() 不带参数在 MySQL 里是语法错误。',add:[A('mv','👀','MVCC：各事务看到的行数不同',480,290,{kind:'tag'})]},
  {say:'记住区别。',memo:['COUNT(*) = COUNT(1)：数行','COUNT(字段)：不数 NULL']},
 ]},
 'q-fcb3818197d74840':{title:'CHAR 和 VARCHAR',beats:[
  {say:'CHAR(10) 像固定大小的格子：不管放几个字，都占满 10 个字符的位置。',add:[A('c','📦','CHAR(10)：定长',170,90,{kind:'item',tone:'primary'})],sub:{c:'"ab" 也占 10 格'}},
  {say:'VARCHAR(10) 像伸缩袋：放多少占多少，再额外记一下长度。',add:[A('v','👜','VARCHAR(10)：变长',470,90,{kind:'item',tone:'ok'})],sub:{v:'"ab" 占 2 + 长度'}},
  {say:'括号里的 M 主要是字符数，实际占多少字节还要看字符集，比如 utf8mb4 一个字符最多 4 字节。',add:[A('cs','🔤','字符数 × 字符集 = 字节',320,220,{kind:'tag'})]},
  {say:'CHAR 适合长度固定的短值（国家代码、MD5）；VARCHAR 适合长度变化大的内容（昵称、地址）。',add:[A('e1','🇨🇳','CN / md5',170,300,{kind:'tag'}),A('e2','🏠','昵称 / 地址',470,300,{kind:'tag'})]},
  {say:'两者对尾随空格的存取不同，比较时是否忽略空格还受排序规则影响。别图省事把所有列都设得很大。',memo:['CHAR：定长，适合固定短值','VARCHAR：变长，记录长度']},
 ]},
};
