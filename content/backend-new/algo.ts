import type {AiLevel} from '../journey';

// 入门：数据结构，以及常考算法题。
export const beDs:AiLevel={id:'be-ds',title:'数据结构：链表、栈、队列和树',summary:'亲手实现常用数据结构，理解它们各自擅长什么',lessons:[
 {title:'数组和链表',body:'数组在内存里连续存放，按下标访问 O(1)，但在中间插入、删除要搬动后面的元素，O(n)。链表每个节点存值和指向下一个节点的指针，已知位置时插入、删除 O(1)，但按下标找要从头走，O(n)。Go 的切片底层就是数组。',code:'type Node struct {\n    Val  int\n    Next *Node\n}\n// 反转链表\nfunc reverse(head *Node) *Node {\n    var prev *Node\n    for head != nil {\n        head.Next, prev, head = prev, head, head.Next\n    }\n    return prev\n}'},
 {title:'栈和队列',body:'栈后进先出（LIFO），像叠盘子：括号匹配、函数调用、撤销操作都用栈。队列先进先出（FIFO），像排队：任务排队、广度优先搜索都用队列。用数组实现队列时，用环形缓冲区避免每次出队都搬移元素。'},
 {title:'哈希表和集合',body:'哈希表用哈希函数把 key 映射到位置，平均 O(1) 查找、插入、删除；Go 的 map 就是哈希表，遍历顺序不固定。Go 没有内置集合，用 map[T]struct{} 表示，struct{} 不占空间。'},
 {title:'二叉树',body:'每个节点最多两个孩子。前序（根左右）、中序（左根右）、后序（左右根）三种遍历用递归写很自然。二叉搜索树左小右大，中序遍历结果有序。树的很多题都是“先算孩子，再算自己”的后序思路。',code:'type Tree struct {\n    Val         int\n    Left, Right *Tree\n}\nfunc inorder(t *Tree, out *[]int) {\n    if t == nil { return }\n    inorder(t.Left, out)\n    *out = append(*out, t.Val)\n    inorder(t.Right, out)\n}'},
],quiz:[
 {id:'be-ds-1',q:'需要频繁按下标随机访问元素，选哪种结构更合适？',options:['链表','数组 / 切片','栈','队列'],answer:1,explain:'数组按下标访问 O(1)；链表要从头走 O(n)。',interview:'q-b13c09da3854131b'},
 {id:'be-ds-2',q:'检查一串括号 "({[]})" 是否匹配，最适合用哪种结构？',options:['队列','栈','哈希表','二叉树'],answer:1,explain:'遇到左括号压栈，遇到右括号和栈顶比较，后进先出正好匹配嵌套关系。'},
 {id:'be-ds-3',type:'judge',q:'用数组实现队列，每次出队都把后面所有元素往前移一位，这样出队是 O(1)。',answer:false,explain:'搬移元素是 O(n)；用环形缓冲区记录 head 才能做到 O(1)。',interview:'q-6eab38b038a5a8b0'},
 {id:'be-ds-4',q:'在 Go 里表示一个“不重复的字符串集合”，最常见的写法是？',options:['[]string','map[string]struct{}','chan string','[10]string'],answer:1,explain:'map 的 key 天然去重，value 用 struct{} 不占空间。',interview:'q-4bb9271918ffa37c'},
 {id:'be-ds-5',q:'一棵二叉搜索树（左小右大）做哪种遍历，结果是从小到大有序的？',options:['前序','中序','后序','层序'],answer:1,explain:'中序遍历：左子树 → 根 → 右子树。',interview:'q-57fb9e7af5c408c6'},
 {id:'be-ds-6',type:'multi',q:'设计一个能 O(1) 取到最小值的栈，下面哪些做法正确？（多选）',options:['再维护一个同步的“最小值栈”','每次 Min 时遍历整个栈','Push 时最小值栈压入 min(新值, 当前最小值)','Pop 时两个栈一起弹出'],answers:[0,2,3],explain:'遍历是 O(n)；辅助栈让每一层都记住“到这里为止的最小值”。',interview:'q-10fca5eeb2dea1df'},
 {id:'be-ds-7',type:'fill',q:'栈的特点是后进先出，英文缩写是 ____。',accepted:['LIFO','lifo'],explain:'LIFO：Last In First Out；队列是 FIFO。'},
 {id:'be-ds-8',type:'judge',q:'两棵二叉树的中序遍历结果相同，就说明它们完全相等。',answer:false,explain:'结构不同的树中序序列可能一样，要同时递归比较结构和值。',interview:'q-dbb76e7d3cfdb787'},
 {id:'be-ds-9',q:'反转字符串 "Go语言" 时，为什么要先转成 []rune？',options:['rune 更快','按字节反转会把一个汉字的多个字节打乱，变成乱码','Go 不允许反转字符串','[]byte 不能修改'],answer:1,explain:'汉字在 UTF-8 里占 3 字节，按 rune 反转才能以字符为单位。',interview:'q-0adefd5c99137f6a'},
 {id:'be-ds-10',type:'code',q:'用 Go 写一个函数，判断一个单链表是否有环，要求 O(1) 额外空间。',code:'type Node struct {\n    Val  int\n    Next *Node\n}\nfunc hasCycle(head *Node) bool {\n    // 在这里实现\n}',reference:'func hasCycle(head *Node) bool {\n    slow, fast := head, head\n    for fast != nil && fast.Next != nil {\n        slow = slow.Next\n        fast = fast.Next.Next\n        if slow == fast {\n            return true\n        }\n    }\n    return false\n}',points:['快慢双指针，快指针每次走两步','相遇说明有环','fast 或 fast.Next 为 nil 说明无环','不需要额外的哈希表'],explain:'快慢指针（Floyd 判圈）是链表题的常用套路。'},
]};

export const beAlgo2:AiLevel={id:'be-algo2',title:'常考算法：排序、二分、堆和滑动窗口',summary:'复杂度分析加几类高频算法套路，会写也会讲',lessons:[
 {title:'复杂度：看增长趋势',body:'复杂度看输入变大时工作量怎么增长：二分 O(log n)，遍历 O(n)，好的排序 O(n log n)，两层循环 O(n²)。空间复杂度要把递归调用栈算进去。append 偶尔扩容是 O(n)，但均摊下来每次 O(1)。'},
 {title:'排序',body:'冒泡、选择、插入都是 O(n²)，适合理解思路和小数据；插入排序对几乎有序的数据很快。快速排序平均 O(n log n)，最坏 O(n²)，不稳定；归并排序稳定、O(n log n)，但要额外空间。生产代码直接用 sort.Slice 或 slices.Sort。'},
 {title:'二分查找',body:'在有序数组里每次和中间元素比，砍掉一半。中点写 l+(r-l)/2 防溢出；循环条件、边界收缩要统一（左闭右闭就用 l<=r、r=m-1）。“找第一个大于等于 x 的位置”这类变体，标准库有 sort.Search。',code:'func search(a []int, x int) int {\n    l, r := 0, len(a)-1\n    for l <= r {\n        m := l + (r-l)/2\n        switch {\n        case a[m] == x:\n            return m\n        case a[m] < x:\n            l = m + 1\n        default:\n            r = m - 1\n        }\n    }\n    return -1\n}'},
 {title:'堆、滑动窗口和一致性哈希',body:'找最大的 K 个数：维护大小为 K 的小顶堆，比堆顶大才替换，O(n log K)。滑动窗口：右指针扩张、左指针收缩，求“最长无重复子串”这类连续区间题，O(n)。一致性哈希把节点和 key 放在同一个环上，增删节点只迁移相邻一段数据。'},
],quiz:[
 {id:'be-algo2-1',q:'在 100 万个有序数里二分查找，最多大约比较多少次？',options:['100 万次','1000 次','20 次','1 次'],answer:2,explain:'log₂(10⁶) ≈ 20。',interview:'q-d8f795112d612596'},
 {id:'be-algo2-2',type:'multi',q:'下面哪些排序算法是稳定的？（多选）',options:['冒泡排序','插入排序','归并排序','快速排序'],answers:[0,1,2],explain:'快速排序的划分会交换相等元素的相对顺序，一般不稳定。',interview:'q-0385c889a7b8ea8e'},
 {id:'be-algo2-3',q:'快速排序什么时候会退化到 O(n²)？',options:['数据量很小时','每次选的枢轴都是最大或最小值时','数据全是正数时','使用递归时'],answer:1,explain:'划分极不平衡时递归深度变成 n；随机选枢轴或三数取中可以缓解。',interview:'q-faeefd41b5278301'},
 {id:'be-algo2-4',q:'从 1 亿个数里找最大的 10 个，内存有限，最合适的做法是？',options:['全部排序后取前 10','维护大小为 10 的小顶堆，比堆顶大才替换','维护大小为 10 的大顶堆','随机抽 10 个'],answer:1,explain:'小顶堆的堆顶是“门槛”，O(n log K) 时间、O(K) 空间。',interview:'q-c7bff07bdc346cf3'},
 {id:'be-algo2-5',type:'judge',q:'二分查找的中点写成 (l+r)/2 在任何情况下都没有问题。',answer:false,explain:'l+r 可能溢出；写成 l+(r-l)/2 更安全。'},
 {id:'be-algo2-6',q:'求字符串中“不含重复字符的最长子串”长度，常用哪种技巧，时间复杂度多少？',options:['暴力枚举，O(n³)','滑动窗口 + 记录字符位置，O(n)','排序后二分，O(n log n)','递归回溯，O(2ⁿ)'],answer:1,explain:'右指针扩张，遇到重复时左指针跳到重复字符的下一位。',interview:'q-b8e7fa67643486dd'},
 {id:'be-algo2-7',type:'fill',q:'3 台缓存机器用 hash(key) % 3 分配数据，扩成 4 台后大部分数据都要迁移。用 ____ 哈希可以只迁移一小部分。',accepted:['一致性','一致'],explain:'一致性哈希扩缩容只影响环上相邻的一段区间。',interview:'q-38541cc7f4c6e66a'},
 {id:'be-algo2-8',q:'下面这段代码的时间复杂度是？',code:'for i := 0; i < n; i++ {\n    for j := i; j < n; j++ {\n        sum += a[j]\n    }\n}',options:['O(n)','O(n log n)','O(n²)','O(2ⁿ)'],answer:2,explain:'内层平均执行 n/2 次，总共约 n²/2 次，忽略常数是 O(n²)。',interview:'q-7934b553b7e39e8d'},
 {id:'be-algo2-9',type:'judge',q:'插入排序在数据几乎有序时可以接近 O(n)。',answer:true,explain:'每个元素只需要往前挪很少的位置。',interview:'q-b653f56b58554795'},
 {id:'be-algo2-10',type:'short',q:'面试中拿到一道算法题，你的答题流程是怎样的？',reference:'先复述题目并问清输入范围、边界（空、重复、负数、溢出）；先说一个暴力解和它的复杂度；再分析瓶颈，想用哈希表、双指针、二分、堆、DP 等优化，并说明新的时间和空间复杂度；确认后再写代码；写完用空输入、单个元素、极值手动走一遍，说明测试用例。',points:['问清范围和边界','先给暴力解和复杂度','说清优化思路和新复杂度','写完用边界用例验证'],explain:'面试官更看重思考过程，而不是一上来就背出最优解。',interview:'q-65908ecd4d784c67'},
]};
