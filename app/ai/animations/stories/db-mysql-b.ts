import {A,type Story} from '../story';

// 数据库面试题动画（二）：索引。
export const dbMysqlB:Record<string,Story>={
 'q-f9273f73300969a5':{title:'索引的底层：一棵 B+ 树',beats:[
  {say:'表里有 100 万个用户，按 id 查一个人。如果一行行翻，太慢了。索引就像一本书的目录。',add:[A('q','🔍','id = 42',90,60,{kind:'tag',tone:'primary'})]},
  {say:'InnoDB 的普通索引是 B+ 树，每个节点是一个“页”。最上面的根页只放分隔键和指向下一层的“门牌号”。',add:[A('root','📑','根页：1 | 500 | 1000',320,60,{kind:'item',tone:'primary'})],send:[{from:'q',to:'root'}]},
  {say:'沿着分隔键往下走一层，到中间页，范围越来越小。',add:[A('mid','📑','中间页：1 | 20 | 40',320,170,{kind:'item'})],send:[{from:'root',to:'mid',text:'42 < 500'}]},
  {say:'最底层是叶子页，按顺序存着记录，而且叶子页之间互相连着，范围查询和排序可以顺着往后读。',add:[A('l1','🍃','叶子：40 41 42',230,290,{kind:'item',tone:'ok'}),A('l2','🍃','叶子：43 44 45',450,290,{kind:'item'})],send:[{from:'mid',to:'l1',text:'找到 42',tone:'ok'},{from:'l1',to:'l2',text:'下一页'}]},
  {say:'聚集索引的叶子里就是整行数据；辅助索引的叶子里是“索引列 + 主键”。',sub:{l1:'聚集索引：整行数据'}},
  {say:'注意不是所有索引都是 B+ 树：全文索引用倒排结构，空间索引用 R 树。',memo:['B+ 树：内部页存分隔键','叶子有序且相连']},
 ]},
 'q-fb57f5db74209f3d':{title:'聚集索引和辅助索引：回表是怎么回事',beats:[
  {say:'一张 users 表，主键是 id，还在 name 上建了一个普通索引。',add:[A('pk','🌳','聚集索引（按 id）',470,120,{kind:'item',tone:'primary'}),A('sk','🌲','辅助索引（按 name）',170,120,{kind:'item'})]},
  {say:'聚集索引决定行数据怎么存，一张表只有一个：叶子里就是整行。优先用主键，没有就找非空唯一索引，再没有就生成隐藏行 ID。',sub:{pk:'叶子 = 整行数据'}},
  {say:'辅助索引可以有多个，叶子里只有“name + 主键 id”。',sub:{sk:'叶子 = name + id'}},
  {say:'执行 SELECT * FROM users WHERE name=\'Tom\'：先在辅助索引里找到 Tom，拿到 id = 7。',add:[A('q','🔍','name = Tom',170,280,{kind:'tag',tone:'warm'})],send:[{from:'q',to:'sk'}],bubble:{who:'sk',text:'Tom 的 id 是 7'}},
  {say:'但要的是整行，只好拿着 id 再去聚集索引查一次——这就叫“回表”。',send:[{from:'sk',to:'pk',text:'回表：id = 7',tone:'warm'}],tone:{pk:'ok'}},
  {say:'如果查询只需要 name 和 id，辅助索引里就都有，不用回表（覆盖索引）。主键太宽的话，每个辅助索引都会跟着变大。',add:[A('cov','✨','只查 name,id → 不回表',470,280,{kind:'tag',tone:'ok'})]},
  {say:'记住两种索引。',memo:['聚集索引：叶子是整行，只有一个','辅助索引：叶子存主键，需回表']},
 ]},
 'q-688f9f1b3801c7e8':{title:'为什么 InnoDB 选 B+ 树',beats:[
  {say:'数据存在磁盘上，读一次磁盘很慢。索引最重要的目标：查一条数据少读几次盘。',add:[A('disk','💽','磁盘（按页读取）',320,300,{kind:'item',tone:'warm'})]},
  {say:'二叉树：每个节点只能分两叉，100 万条数据要二十来层，意味着可能读二十来次盘。',add:[A('bt','🌿','二叉树：约 20 层',120,90,{kind:'item',tone:'bad'})]},
  {say:'B+ 树的内部页只放键和指针，不放整行，一页能装成百上千个分叉，三四层就能装下千万行。',add:[A('bp','🌳','B+ 树：3～4 层',320,90,{kind:'item',tone:'ok'})],tone:{disk:'ok'}},
  {say:'叶子页按顺序排好又互相连着，范围查询、ORDER BY 顺着读就行。',sub:{bp:'叶子有序相连'}},
  {say:'哈希索引等值查很快，但做不了范围和排序。',add:[A('hash','#️⃣','哈希：不支持范围',520,90,{kind:'item',tone:'warm'})]},
  {say:'优势来自“页大小、分叉多、访问模式”的配合，不是说任何查询 B+ 树都比哈希快。',memo:['分叉多 → 树矮 → 少读盘','叶子有序 → 范围和排序快']},
 ]},
 'q-15fd859316b9b092':{title:'最左前缀：电话簿先按姓再按名',beats:[
  {say:'联合索引 (a, b, c) 就像电话簿：先按姓排，姓相同再按名排，再按年龄排。',add:[A('idx','📒','索引 (姓, 名, 年龄)',320,70,{kind:'item',tone:'primary'})]},
  {say:'找“姓张、名三”：先翻到“张”那一段，再在里面找“三”，一段连续的范围就定位到了。',add:[A('ok1','✅','姓=张 AND 名=三',170,190,{kind:'tag',tone:'ok'})],send:[{from:'ok1',to:'idx',tone:'ok'}]},
  {say:'只按“名=三”找？名字只在同一个姓里才有顺序，整本电话簿里“三”散落各处，没法直接定位。',add:[A('bad','❌','只查 名=三',470,190,{kind:'tag',tone:'bad'})],send:[{from:'bad',to:'idx',tone:'bad'}]},
  {say:'WHERE 里条件写的顺序无所谓，优化器会自己分析。范围条件后面的列，仍可能用于过滤或覆盖。',add:[A('note','💡','书写顺序不重要',320,300,{kind:'tag'})]},
  {say:'MySQL 8.0 的 skip scan 在特定条件下能跳过第一列，所以“缺第一列就绝不走索引”也不绝对。',bubble:{who:'idx',text:'有例外，看执行计划'}},
  {say:'记住最左前缀。',memo:['按 a → b → c 排序','固定左边，右边才有序']},
 ]},
 'q-f1cc3f9a2d2ad8cc':{title:'覆盖索引和索引下推',beats:[
  {say:'有一个联合索引 (city, name)。现在要查：上海、名字里带“明”的人。',add:[A('idx','🌲','索引 (city, name)',170,120,{kind:'item',tone:'primary'}),A('pk','🌳','聚集索引（整行）',480,120,{kind:'item'})]},
  {say:'没有索引下推时：索引只帮忙找到所有“上海”的人，每个都回表，再在服务层判断名字。',add:[A('many','📦','上海 1000 人 → 全部回表',320,280,{kind:'tag',tone:'bad'})],send:[{from:'idx',to:'pk',text:'回表 ×1000',tone:'bad'}]},
  {say:'索引下推（ICP）：既然 name 就在索引里，存储引擎先用它把“名字不含明”的人筛掉，剩下的才回表。',drop:['many'],add:[A('few','📦','筛完剩 30 人 → 回表',320,280,{kind:'tag',tone:'ok'})],send:[{from:'idx',to:'pk',text:'回表 ×30',tone:'ok'}],sub:{idx:'Using index condition'}},
  {say:'覆盖索引是另一回事：如果只查 city 和 name，索引里全都有，根本不用回表。EXPLAIN 显示 Using index。',add:[A('cov','✨','只查 city,name → 不回表',320,30,{kind:'tag',tone:'ok'})]},
  {say:'一句话区分：覆盖索引解决“要不要回表”，索引下推解决“回表前能不能少留些候选”。',memo:['覆盖：不用回表','下推：回表前先过滤']},
 ]},
 'q-cd952018025fce71':{title:'哪些写法会让索引用不上',beats:[
  {say:'create_time 上有索引。查 2025 年的订单，写成 WHERE YEAR(create_time) = 2025。',add:[A('idx','🌲','索引：create_time',320,70,{kind:'item',tone:'primary'}),A('f','🧮','YEAR(create_time)=2025',150,200,{kind:'tag',tone:'bad'})],send:[{from:'f',to:'idx',tone:'bad'}]},
  {say:'对索引列套了函数，索引里存的是原始值，没法直接定位，只能全扫。改成时间范围就好了。',add:[A('fix','✅','create_time >= 2025-01-01 AND < 2026-01-01',320,290,{kind:'tag',tone:'ok'})],send:[{from:'fix',to:'idx',tone:'ok'}]},
  {say:'其他常见原因：不利的隐式类型转换（字符串列拿数字比）、LIKE \'%x\' 前导通配符、联合索引缺少最左前缀。',add:[A('c1','🔢','隐式类型转换',490,200,{kind:'tag',tone:'bad'})]},
  {say:'还有一种：优化器估算要回表的行太多，干脆全表扫描更便宜。',bubble:{who:'idx',text:'回表太多，\n不如全扫'}},
  {say:'OR、!=、IS NULL 不一定让索引失效，要看选择性和实际计划。排查看 EXPLAIN 的 key、type 和扫描行数；必要时用函数索引。',memo:['别对索引列做函数和运算','以 EXPLAIN 为准']},
 ]},
 'q-f6c633e90a335b42':{title:'LIKE \'%x\' 索引一定失效吗',beats:[
  {say:'name 上有索引。LIKE \'张%\' 是前缀匹配，能在 B+ 树上定位到“张”开头的一段。',add:[A('idx','🌲','索引：name',320,80,{kind:'item',tone:'primary'}),A('a','✅','LIKE \'张%\'',130,210,{kind:'tag',tone:'ok'})],send:[{from:'a',to:'idx',text:'范围定位',tone:'ok'}]},
  {say:'LIKE \'%明\' 以通配符开头，不知道从哪开始找，没法做范围定位。',add:[A('b','⚠️','LIKE \'%明\'',510,210,{kind:'tag',tone:'warm'})],send:[{from:'b',to:'idx',tone:'warm'}]},
  {say:'但不一定完全不用索引：如果只查索引里有的列，优化器可能选择扫描整个索引，比扫描更宽的整行便宜。',sub:{idx:'可能全索引扫描'},bubble:{who:'idx',text:'整本目录翻一遍，\n也比翻整本书快'}},
  {say:'所以要区分“不能高效定位”和“完全不用索引”。',tone:{b:'base'}},
  {say:'固定后缀搜索：存一列反转后的值并建索引，“%明”就变成“明%”。任意子串搜索：考虑 n-gram 或专门的搜索引擎。',add:[A('rev','🔄','反转列：明% ',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住结论。',memo:['%开头无法范围定位','但可能全索引扫描']},
 ]},
};
