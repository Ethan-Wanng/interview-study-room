import {A,type Story} from '../story';

// 数据结构面试题动画。
export const algB:Record<string,Story>={
 'q-65908ecd4d784c67':{title:'怎么准备数据结构和算法面试',beats:[
  {say:'第一层地基：数组、链表、哈希表、栈、队列、堆、树、图。',add:[A('ds','🧱','数组 · 链表 · 哈希 · 栈 · 堆 · 树 · 图',320,60,{kind:'item',tone:'primary'})]},
  {say:'第二层套路：双指针、滑动窗口、二分、DFS/BFS、回溯、贪心、动态规划，按类别练。',add:[A('pt','🧩','双指针 · 二分 · DFS/BFS · 回溯 · DP',320,150,{kind:'item',tone:'ok'})]},
  {say:'每道题的流程：先问清输入范围和边界，说出暴力解，再讲怎么优化和复杂度，然后写代码。',add:[A('me','🧑‍💻','你',110,270,{tone:'primary'}),A('flow','📋','范围 → 暴力 → 优化 → 代码',380,270,{kind:'tag'})],send:[{from:'me',to:'flow'}]},
  {say:'写完用空输入、重复值、极值手算一遍。',bubble:{who:'me',text:'空数组呢？\n全是负数呢？'}},
  {say:'复习时重点回做错题、口述推导过程，别用刷题数量代替理解。',memo:['先数据结构，再按套路分类','暴力 → 优化 → 验证边界']},
 ]},
 'q-b13c09da3854131b':{title:'用 Go 实现链表',beats:[
  {say:'链表的每个节点保存一个值，和一个指向下一个节点的指针 Next，像一节节火车车厢。',add:[A('n1','🚃','1',150,120,{kind:'tag',tone:'primary'}),A('n2','🚃','2',320,120,{kind:'tag'}),A('n3','🚃','3',490,120,{kind:'tag'})],send:[{from:'n1',to:'n2',text:'Next'},{from:'n2',to:'n3',text:'Next'}]},
  {say:'头插：新节点的 Next 指向原来的头，新节点成为新的头，O(1)。',add:[A('n0','🚃','0（新头）',150,270,{kind:'tag',tone:'ok'})],send:[{from:'n0',to:'n1',tone:'ok'}]},
  {say:'删除值为 2 的节点：找到它的前一个节点，把前一个的 Next 直接指向 2 的下一个，跳过它。',send:[{from:'n1',to:'n3',text:'跳过 2',tone:'warm'}],tone:{n2:'quiet'}},
  {say:'用一个“虚拟头节点” dummy 放在最前面，删除头节点和删除中间节点就是同一套逻辑。',add:[A('dm','👻','dummy',320,270,{kind:'tag',tone:'warm'})]},
  {say:'已知前驱时插入、删除 O(1)，按值查找 O(n)。双向链表多一个 Prev，用空间换来双向操作。',memo:['节点 = 值 + Next','虚拟头统一删除逻辑']},
 ]},
 'q-0adefd5c99137f6a':{title:'反转字符串：先按字符拆开',beats:[
  {say:'反转 "Go语言"。如果直接按字节反转，一个汉字的 3 个字节会被打乱，变成乱码。',add:[A('s','🔤','"Go语言"',320,60,{kind:'item',tone:'primary'}),A('bad','💥','按 byte 反转 → 乱码',320,150,{kind:'tag',tone:'bad'})]},
  {say:'正确做法：先转成 []rune，每个元素是一个 Unicode 字符。',drop:['bad'],add:[A('r','🧩','[G o 语 言]',320,150,{kind:'item'})],send:[{from:'s',to:'r',text:'[]rune(s)'}]},
  {say:'方法一 双指针：i 从头、j 从尾，交换后向中间靠拢，原地完成。',add:[A('m1','↔️','双指针交换',150,270,{kind:'tag',tone:'ok'})],send:[{from:'m1',to:'r'}]},
  {say:'方法二 倒序构建：新建一个切片，从后往前依次追加。两种方法都是 O(n) 时间、O(n) 空间。',add:[A('m2','🔁','倒序追加到新切片',490,270,{kind:'tag',tone:'ok'})],sub:{r:'→ [言 语 o G]'},tone:{r:'ok'}},
  {say:'更严格的场景：带组合音标、复合 emoji 的字符串，按码点反转仍可能拆坏，需要按字素簇处理。',memo:['先转 []rune 再反转','双指针或倒序构建']},
 ]},
 'q-10fca5eeb2dea1df':{title:'能随时取最小值的栈',beats:[
  {say:'要设计一个栈，Push、Pop 之外，还能 O(1) 拿到当前最小值。',add:[A('data','📚','数据栈',200,120,{kind:'item',tone:'primary'}),A('mins','📗','最小值栈',440,120,{kind:'item',tone:'ok'})]},
  {say:'再准备一个等长的“最小值栈”，每一层记录“到这一层为止的最小值”。',add:[A('p1','⬇️','Push 5 → 最小 5',200,240,{kind:'tag'})],sub:{data:'5',mins:'5'}},
  {say:'Push 3：3 比当前最小 5 小，最小值栈压入 3。Push 7：7 比 3 大，最小值栈再压一次 3。',sub:{data:'5 3 7',mins:'5 3 3'}},
  {say:'Min() 直接看最小值栈的栈顶：3。Pop 时两个栈一起弹出，最小值自动“回到”之前的状态。',bubble:{who:'mins',text:'栈顶就是最小值'},sub:{data:'5 3',mins:'5 3'}},
  {say:'Push、Pop、Min 都是 O(1)，额外空间 O(n)。空栈时返回 (值, false)，不要用特殊数字当错误标记。',memo:['再配一个最小值栈','两栈同步 Push / Pop']},
 ]},
 'q-25b0b292f35ec07f':{title:'把一个栈整个翻转过来',beats:[
  {say:'栈里从底到顶是 1 2 3，要变成 3 2 1。',add:[A('s','📚','原栈：1 2 3（3 在顶）',170,120,{kind:'item',tone:'primary'})]},
  {say:'最简单：准备一个辅助栈，逐个从原栈弹出、压进辅助栈，顺序就反过来了。时间 O(n)，额外空间 O(n)。',add:[A('t','📚','辅助栈：3 2 1',470,120,{kind:'item',tone:'ok'})],send:[{from:'s',to:'t',text:'逐个弹出压入',tone:'ok'}]},
  {say:'如果底层是切片、允许随机访问，也可以直接双指针交换。',add:[A('sw','↔️','切片双指针交换',320,250,{kind:'tag'})]},
  {say:'如果规定只能用栈操作、不能另建容器：递归取出栈底元素，翻转剩下的，再把原栈底压到顶上。',add:[A('rec','🔁','递归：取栈底 → 翻转其余 → 压回顶',320,320,{kind:'tag',tone:'warm'})]},
  {say:'注意：递归方案最坏 O(n²) 时间，递归栈 O(n) 空间，并不是 O(1) 空间。',memo:['辅助栈：O(n) 时间和空间','纯递归：O(n²)，不是 O(1) 空间']},
 ]},
 'q-6eab38b038a5a8b0':{title:'数组队列和链表队列',beats:[
  {say:'队列先进先出。用数组实现，如果每次出队都把后面的元素往前搬，太慢了。',add:[A('arr','🧱','数组：每次出队都搬移 ✗',320,60,{kind:'tag',tone:'bad'})]},
  {say:'环形队列：数组首尾相接，记住 head 和 size，入队放在 (head+size)%cap，出队 head 往前走一格，O(1)。',drop:['arr'],add:[A('ring','⭕','环形缓冲区',180,180,{kind:'item',tone:'ok'})],sub:{ring:'head 走一格，不搬移'}},
  {say:'固定容量满了就返回 false，提醒调用方。',bubble:{who:'ring',text:'满了，Push 失败'}},
  {say:'链表队列：维护头指针和尾指针，入队接在尾巴，出队从头部摘，也是 O(1)，没有容量限制。',add:[A('ll','🚃','链表：head → … → tail',470,180,{kind:'item',tone:'ok'})]},
  {say:'两种都不自带并发保护，多个 goroutine 同时用要加锁，或者直接用带缓冲的 channel。',add:[A('lock','🔒','并发需要加锁',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住两种实现。',memo:['数组：环形缓冲区 O(1)','链表：头尾指针 O(1)']},
 ]},
 'q-4bb9271918ffa37c':{title:'Go 实现不重复的集合',beats:[
  {say:'Go 没有内置 Set，用 map 的 key 来表示集合元素，value 用 struct{}，不占空间。',add:[A('set','🗂️','map[string]struct{}',320,80,{kind:'item',tone:'primary'})]},
  {say:'Add("go") 两次，map 里还是只有一个 key，天然去重。',add:[A('a','➕','Add("go") ×2',140,210,{kind:'tag'})],send:[{from:'a',to:'set'}],bubble:{who:'set',text:'只有一个 go'}},
  {say:'Has 查询、Remove 删除，平均都是 O(1)。',add:[A('h','🔍','Has · Remove：O(1)',500,210,{kind:'tag',tone:'ok'})]},
  {say:'Go 1.18 起可以写成泛型：type Set[T comparable] map[T]struct{}，任何可比较的类型都能用。',sub:{set:'Set[T comparable]'},tone:{set:'ok'}},
  {say:'注意：遍历顺序是随机的；多个 goroutine 并发读写要加锁。',memo:['map 的 key 当集合','value 用 struct{}']},
 ]},
 'q-57fb9e7af5c408c6':{title:'用 Go 实现二叉树和中序遍历',beats:[
  {say:'二叉树节点：一个值，加上左孩子和右孩子两个指针。',add:[A('r','🌳','4',320,60,{kind:'tag',tone:'primary'}),A('l','🍃','2',190,170,{kind:'tag'}),A('rr','🍃','6',450,170,{kind:'tag'}),A('ll','🍂','1',120,280,{kind:'tag'}),A('lr','🍂','3',260,280,{kind:'tag'})],send:[{from:'r',to:'l'},{from:'r',to:'rr'},{from:'l',to:'ll'},{from:'l',to:'lr'}]},
  {say:'中序遍历：先走左子树，再访问自己，最后走右子树，用递归写起来很自然。',add:[A('out','📝','输出：',500,300,{kind:'tag',tone:'warm'})]},
  {say:'从 4 往左一直走到 1，访问 1；回到 2，访问 2；再访问 3。',focus:['ll','l','lr'],sub:{out:'1 2 3'}},
  {say:'回到根 4，再走右子树 6。结果 1 2 3 4 6。二叉搜索树（左小右大）的中序遍历是有序的；普通二叉树不一定。',focus:['r','rr'],sub:{out:'1 2 3 4 6'},tone:{out:'ok'}},
  {say:'时间 O(n)；递归栈深度 O(h)，树完全偏向一边时 h 就是 n。',memo:['节点 = 值 + 左 + 右','中序：左 → 根 → 右']},
 ]},
 'q-dbb76e7d3cfdb787':{title:'判断两棵二叉树是否相等',beats:[
  {say:'两棵树相等，要结构和每个节点的值都相同。',add:[A('a','🌳','树 A',170,80,{kind:'item',tone:'primary'}),A('b','🌳','树 B',470,80,{kind:'item',tone:'primary'})]},
  {say:'递归比较：两个节点都是空 → 相等；只有一个是空 → 不等。',add:[A('r1','∅','都空：相等',170,210,{kind:'tag',tone:'ok'}),A('r2','⚠️','一个空：不等',470,210,{kind:'tag',tone:'bad'})]},
  {say:'否则比较当前值，再分别比较左子树和右子树，全部相等才相等。',add:[A('r3','🔁','值相等 && 左相等 && 右相等',320,300,{kind:'tag',tone:'primary'})]},
  {say:'坑：不能只比较中序遍历的结果——结构不同的树，中序序列可能一模一样。',bubble:{who:'b',text:'中序一样，\n形状不一样',tone:'warm'}},
  {say:'最坏 O(n) 时间，递归空间 O(h)。',memo:['都空相等，一空不等','比值，再递归比左右']},
 ]},
 'q-d0eb3a11efa1228e':{title:'二叉树的最大子树和',beats:[
  {say:'“子树”指某个节点和它的全部后代。要找出节点值加起来最大的那棵子树。',add:[A('r','🌳','-5',320,60,{kind:'tag',tone:'primary'}),A('l','🍃','3',190,180,{kind:'tag'}),A('rr','🍃','-2',450,180,{kind:'tag'}),A('ll','🍂','4',120,290,{kind:'tag'}),A('lr','🍂','1',260,290,{kind:'tag'})],send:[{from:'r',to:'l'},{from:'r',to:'rr'},{from:'l',to:'ll'},{from:'l',to:'lr'}]},
  {say:'后序遍历：先算左右孩子的子树和，再加上自己，得到当前子树和，同时更新最大值。',sub:{ll:'和 4',lr:'和 1'},focus:['ll','lr']},
  {say:'节点 3 的子树和 = 3 + 4 + 1 = 8，是目前最大的。',sub:{l:'和 8（最大）'},tone:{l:'ok'}},
  {say:'根的子树和 = -5 + 8 + (-2) = 1，比 8 小。答案是 8。',sub:{r:'和 1',rr:'和 -2'}},
  {say:'全部是负数时要返回真正的最大负数，不能默认返回 0；空树返回 ok=false；用 int64 防止溢出。',memo:['后序：先孩子，再自己','初值别默认 0']},
 ]},
};
