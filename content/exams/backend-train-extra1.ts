import type {AiQuiz} from '../journey';

// 入门阶段训练补充题：后端基础、命令行、数据库入门、SQL、数据结构与算法。比关卡题更难，侧重综合运用。
export const beTrain1Extra:AiQuiz[]=[
 {id:'be-x1-16',q:'前端提交订单时把价格 price=1 一起传给后端，后端直接用这个价格扣款。问题在哪？',options:['没有问题，前端算好了','请求可以被任意修改，价格必须由后端按商品 ID 查询并计算','应该改用 GET 请求','应该把价格放在 Cookie 里'],answer:1,explain:'客户端的数据都不可信，金额、权限、库存都要后端重新计算和校验。'},
 {id:'be-x1-17',q:'“创建订单”接口因为网络超时，客户端自动重试，结果生成了两个订单。最合理的改进是？',options:['取消重试','客户端生成幂等键随请求发送，后端用唯一约束保证同一个键只创建一次','把 POST 改成 GET','让用户自己删掉重复订单'],answer:1,explain:'POST 不天然幂等，靠幂等键 + 唯一约束可以安全重试。'},
 {id:'be-x1-18',type:'multi',q:'下面哪些状态码的使用是恰当的？（多选）',options:['参数格式错误返回 400','已登录但无权访问别人的订单返回 403','订单不存在返回 404','数据库连接失败返回 200 并在正文里写“失败”'],answers:[0,1,2],explain:'服务端故障应该返回 5xx，用 200 包装错误会让监控和客户端都无法正确判断。'},
 {id:'be-x1-19',type:'judge',q:'PUT /users/1 用完整数据覆盖用户 1，重复执行多次结果相同，所以 PUT 是幂等的。',answer:true,explain:'GET、PUT、DELETE 按语义是幂等的；POST 一般不是。'},
 {id:'be-x1-20',q:'执行 ./deploy.sh 提示 Permission denied，而文件确实存在。最可能的原因和处理是？',options:['磁盘满了，删文件','脚本没有执行权限，chmod +x deploy.sh','网络断了，重启网卡','需要先 ping 一下'],answer:1,explain:'没有 x 权限就不能直接执行；也可以用 bash deploy.sh 运行。'},
 {id:'be-x1-21',q:'cmd > out.log 2>&1 和 cmd 2>&1 > out.log 的区别是？',options:['完全一样','前者正常输出和错误都进文件；后者错误仍然打在终端上','后者两种输出都进文件','两者都只保存错误输出'],answer:1,explain:'重定向从左到右执行：2>&1 复制的是“1 当前指向的地方”。'},
 {id:'be-x1-22',type:'fill',q:'统计 access.log 中包含 " 500 " 的行数：grep " 500 " access.log | ____ -l',accepted:['wc'],explain:'wc -l 统计行数；也可以用 grep -c。'},
 {id:'be-x1-23',q:'有人在服务器上执行了 rm -rf $DIR/，但 DIR 变量没有设置。实际会发生什么？',options:['什么都不发生','命令变成 rm -rf /，可能删除整个系统','只删除当前目录','报错退出，不会删除任何东西'],answer:1,explain:'空变量会让路径变成根目录；脚本里要用 ${DIR:?} 之类的保护，或先校验变量。'},
 {id:'be-x1-24',q:'转账事务里先执行 UPDATE 扣 A 的钱，第二条 UPDATE 因为 B 的账户不存在而失败。程序应该？',options:['直接 COMMIT，A 的扣款保留','ROLLBACK，让 A 的扣款也撤销','再执行一次 A 的扣款','什么都不做'],answer:1,explain:'事务要么全部成功，要么全部撤销，这正是原子性。'},
 {id:'be-x1-25',type:'judge',q:'只要用了事务，UPDATE stock SET n = n - 1 这类语句就一定不会出现超卖，不需要任何条件判断。',answer:false,explain:'还要在 WHERE 里加 n > 0 并检查影响行数，否则库存可能被扣成负数。'},
 {id:'be-x1-26',q:'查询“每个城市年龄最大的用户”，下面哪种写法是正确思路？',options:['SELECT city, name, MAX(age) FROM users GROUP BY city','用窗口函数 ROW_NUMBER() OVER (PARTITION BY city ORDER BY age DESC) 编号，再取编号为 1 的行','SELECT * FROM users ORDER BY age DESC LIMIT 1','SELECT DISTINCT city FROM users'],answer:1,explain:'GROUP BY 时 name 不在聚合里，结果不确定（严格模式下直接报错）；“每组第一”用窗口函数。'},
 {id:'be-x1-27',type:'multi',q:'orders 有 100 行，其中 10 行 coupon_id 为 NULL。下面哪些结果是 90？（多选）',options:['COUNT(*)','COUNT(coupon_id)','SUM(CASE WHEN coupon_id IS NOT NULL THEN 1 ELSE 0 END)','COUNT(1)'],answers:[1,2],explain:'COUNT(*) 和 COUNT(1) 统计全部 100 行。'},
 {id:'be-x1-28',q:'SELECT * FROM users WHERE email = NULL 返回 0 行，但表里确实有 email 为空的行。原因是？',options:['表损坏','和 NULL 比较要用 IS NULL，= NULL 的结果是“未知”','需要加索引','NULL 必须写成小写'],answer:1,explain:'NULL 和任何值比较都不是 true；要写 WHERE email IS NULL。'},
 {id:'be-x1-29',type:'fill',q:'表里已经存在 username 唯一索引，插入重复用户名时，MySQL 会报唯一键冲突错误，错误码是 ____。',accepted:['1062'],explain:'ER_DUP_ENTRY（1062）；业务层捕获后可返回“用户名已存在”。'},
 {id:'be-x1-30',q:'用切片实现栈，Pop 写成 s = s[1:] 有什么问题？',options:['没有问题','这是从队头取，变成了队列；栈应该从末尾 s[len(s)-1] 取并截掉最后一个','会编译错误','会死循环'],answer:1,explain:'栈后进先出，从末尾进出；切片头部出队还可能让底层数组无法释放。'},
 {id:'be-x1-31',type:'judge',q:'在 Go 中遍历 map 时，结果的顺序在多次运行之间是不固定的，如果要有序输出，需要先取出 key 排序。',answer:true,explain:'map 遍历顺序是故意随机化的。'},
 {id:'be-x1-32',q:'二叉树有 n 个节点，树完全偏向一侧（像链表）。递归中序遍历的额外空间是？',options:['O(1)','O(log n)','O(n)','O(n²)'],answer:2,explain:'递归栈深度等于树高，退化成链表时高度是 n。'},
 {id:'be-x1-33',q:'判断两个字符串是否互为字母异位词（如 "listen" 和 "silent"），最合适的方法是？',options:['两层循环逐个比较，O(n²)','用 map 或长度 26 的数组统计字符次数后比较，O(n)','比较长度就够了','直接 ==' ],answer:1,explain:'计数法线性时间；排序后比较是 O(n log n)。'},
 {id:'be-x1-34',type:'multi',q:'下面哪些问题适合用滑动窗口解决？（多选）',options:['无重复字符的最长子串','和至少为 k 的最短连续子数组（元素都为正数）','数组中任意两数之和等于 target（无序数组）','长度为 k 的子数组的最大平均值'],answers:[0,1,3],explain:'两数之和适合哈希表；滑动窗口处理“连续区间”并且窗口可以单调伸缩的问题。'},
 {id:'be-x1-35',q:'对 n 个数先排序再二分查找 m 次，总时间复杂度是？',options:['O(n + m)','O(n log n + m log n)','O(n·m)','O(log n)'],answer:1,explain:'排序 O(n log n)，每次二分 O(log n)。'},
 {id:'be-x1-36',type:'short',q:'设计一个 REST 风格的“订单”接口：创建、查询单个、按用户分页查询、取消订单，分别用什么方法和路径？取消为什么不用 DELETE？',reference:'创建：POST /orders；查询单个：GET /orders/{id}；按用户分页：GET /orders?user_id=1&cursor=xxx&limit=20（或 GET /users/1/orders）；取消：POST /orders/{id}/cancel 或 PATCH /orders/{id} 把状态改为 cancelled。取消是业务状态变化，订单记录仍然要保留用于对账和售后，并不是删除资源，所以不用 DELETE；同时取消接口要做状态校验和幂等。',points:['POST 创建，GET 查询','分页带 limit 和游标','取消是状态变化，用 POST 动作或 PATCH','订单要保留，接口要幂等并校验状态'],explain:'路径表示资源，方法表示动作；业务状态变化不等于删除。'},
 {id:'be-x1-37',type:'code',q:'用 Go 实现：给定整数数组 nums 和目标值 target，返回两个数的下标，使它们的和等于 target，要求 O(n)。',code:'func twoSum(nums []int, target int) (int, int, bool) {\n    // 在这里实现\n}',reference:'func twoSum(nums []int, target int) (int, int, bool) {\n    seen := make(map[int]int) // 值 → 下标\n    for i, v := range nums {\n        if j, ok := seen[target-v]; ok {\n            return j, i, true\n        }\n        seen[v] = i\n    }\n    return 0, 0, false\n}',points:['用 map 记录已经见过的值和下标','先查 target-v 再存当前值，避免用到自己','一次遍历 O(n)','找不到时返回 false'],explain:'哈希表把“找另一半”从 O(n) 降到 O(1)。'},
];
