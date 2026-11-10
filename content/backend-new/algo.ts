import type {AiLevel} from '../journey';

// 入门：数据结构，以及常考算法题。
export const beDs:AiLevel={id:'be-ds',title:'数据结构：链表、栈、队列和树',summary:'亲手实现常用数据结构，理解它们各自擅长什么',lessons:[
  {title:'这一关学什么：数据怎么摆放',body:'数据结构就是“数据在内存里怎么摆放、怎么组织”。同样是存一堆数字，摆放的方式不同，有的操作快、有的操作慢。选对数据结构，程序可以快成百上千倍。\n这一关用 Go 亲手实现最常用的几种：\n一、数组和链表：按位置访问快，还是插入删除快；\n二、栈和队列：后进先出和先进先出；\n三、哈希表和集合：快速查找；\n四、二叉树：遍历方式和二叉搜索树。\n面试中的很多算法题，都是在考这些数据结构的基本操作。'},
  {title:'先认识一下 O(1) 和 O(n)',body:'描述一个操作快不快，常用“时间复杂度”，写成大 O 的形式，表示数据量 n 变大时，操作所需的步骤数大致怎么增长：\nO(1)：不管数据有多少，步骤数都一样，比如按下标取数组的某个元素，一步就到；\nO(n)：步骤数和数据量成正比，比如从头到尾找一个数，数据翻倍、时间也翻倍；\nO(log n)：数据翻倍时只多一步，比如在有序数组里二分查找；\nO(n²)：数据翻倍、时间变成 4 倍，比如两层嵌套循环。\n不用追求精确计算，能判断出是哪个量级就够了。下一关“常考算法”会讲得更多。'},
  {title:'数组和链表',body:'数组：所有元素在内存里紧挨着、连续存放。因为位置可以直接算出来（起始地址 + 下标 × 每个元素的大小），按下标访问任何一个元素都是 O(1)。但在中间插入或删除一个元素，后面所有元素都要往后挪或往前挪，是 O(n)。Go 的切片底层就是数组。\n链表：元素分散在内存各处，每个节点除了存值，还存一个指向下一个节点的指针，一个连一个，像一列火车。已经找到某个位置时，插入、删除只要改一下指针，是 O(1)；但想找第 k 个元素，只能从头一个个往后走，是 O(n)。\n所以需要频繁按下标随机访问时，用数组（切片）；需要频繁在中间插入删除、又不需要随机访问时，才考虑链表。实际开发中，切片在绝大多数情况下都更好用。'},
  {title:'链表：反转和判断有没有环',body:'链表的面试题最常考两道：\n反转链表：从头走到尾，把每个节点的指针从“指向下一个”改成“指向上一个”。用 prev 记住已经反转好的部分，一边走一边改。\n判断链表有没有环（最后一个节点又指回了前面的某个节点）：用“快慢指针”。慢指针每次走一步，快指针每次走两步。如果没有环，快指针会先走到头（遇到 nil）；如果有环，快指针迟早会在环里追上慢指针，就像操场跑步时快的人会套圈追上慢的人。这种方法只用两个指针，额外空间是 O(1)。',code:`type Node struct {
    Val  int
    Next *Node
}

func reverse(head *Node) *Node {
    var prev *Node
    for head != nil {
        next := head.Next
        head.Next = prev
        prev = head
        head = next
    }
    return prev
}

func hasCycle(head *Node) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}`,explain:[{at:'type Node struct {',to:'Next *Node',text:'链表节点：一个值，加一个指向下一个节点的指针。最后一个节点的 Next 是 nil。'},{at:'func reverse(head *Node) *Node {',text:'反转链表，返回新的头节点。'},{at:'var prev *Node',text:'prev 指向已经反转好的部分，一开始是空的。'},{at:'for head != nil {',text:'一直走到链表末尾。'},{at:'next := head.Next',text:'先记住下一个节点，否则改了指针就找不到它了。'},{at:'head.Next = prev',text:'把当前节点的指针掉头，指向前一个。'},{at:'prev = head',to:'head = next',text:'prev 和 head 都往前挪一步。'},{at:'return prev',text:'循环结束时，prev 就是原来的最后一个节点，也就是新的头。'},{at:'func hasCycle(head *Node) bool {',text:'判断链表是否有环。'},{at:'slow, fast := head, head',text:'快慢两个指针都从头出发。'},{at:'for fast != nil && fast.Next != nil {',text:'快指针还没走到头，就继续。'},{at:'slow = slow.Next',to:'fast = fast.Next.Next',text:'慢的走一步，快的走两步。'},{at:'if slow == fast {',to:'return true',text:'两个指针指向了同一个节点，说明快的追上了慢的，有环。'},{at:'return false',text:'快指针走到了头，说明没有环。'}]},
  {title:'栈：后进先出，检查括号',body:'栈（Stack）的特点是后进先出，英文缩写 LIFO（Last In First Out），就像叠起来的盘子，最后放上去的最先被拿走。只能在一头操作：放进去叫入栈（push），拿出来叫出栈（pop）。\n用 Go 的切片就能实现栈：append 入栈，取最后一个元素并把切片缩短一位就是出栈。\n栈的典型用途：括号匹配、函数调用（每调用一层函数就压一层栈）、编辑器的撤销操作、浏览器的后退。\n检查 "({[]})" 这样的括号是否正确配对，最适合用栈：遇到左括号就入栈；遇到右括号，就看栈顶是不是和它配对的左括号，是就出栈，不是就说明不匹配；全部扫完后栈正好为空，才说明完全匹配。',code:`func balanced(s string) bool {
    pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
    var stack []rune
    for _, c := range s {
        switch c {
        case '(', '[', '{':
            stack = append(stack, c)
        case ')', ']', '}':
            if len(stack) == 0 || stack[len(stack)-1] != pairs[c] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}`,explain:[{at:'func balanced(s string) bool {',text:'判断字符串里的括号是否正确配对。'},{at:'pairs := map[rune]rune{\')\': \'(\', \']\': \'[\', \'}\': \'{\'}',text:'右括号 → 对应的左括号。单引号括起来的是一个字符（rune）。'},{at:'var stack []rune',text:'用切片当栈。'},{at:'for _, c := range s {',to:'switch c {',text:'逐个字符检查。'},{at:'case \'(\', \'[\', \'{\':',to:'stack = append(stack, c)',text:'左括号入栈。'},{at:'case \')\', \']\', \'}\':',text:'遇到右括号。'},{at:'if len(stack) == 0 || stack[len(stack)-1] != pairs[c] {',to:'return false',text:'栈是空的（右括号多了），或者栈顶不是对应的左括号（顺序错了），就不匹配。'},{at:'stack = stack[:len(stack)-1]',text:'配对成功，出栈：把切片缩短一位。'},{at:'return len(stack) == 0',text:'全部检查完，栈必须是空的，否则说明左括号多了。'}]},
  {title:'队列：先进先出',body:'队列（Queue）的特点是先进先出，英文缩写 FIFO（First In First Out），就像排队买票，先来的先买。从队尾进（入队），从队头出（出队）。\n典型用途：任务排队处理、消息队列、按层遍历一棵树（广度优先搜索）。\n用数组实现队列时要注意：如果每次出队都把后面所有元素往前挪一位，出队就是 O(n)，而不是 O(1)。常用的办法是“环形缓冲区”：用两个下标分别记住队头和队尾的位置，出队只是把队头下标往后移一位，到了数组末尾就绕回开头继续用，这样入队和出队都是 O(1)。\n在 Go 里，简单场景可以直接用切片（出队写 q = q[1:]），并发场景下更常用 channel 当队列。'},
  {title:'动手试试：链表、环和括号',body:'把上面的反转链表、判断有环和括号匹配放进一个完整的程序里运行。我们还会故意把一个链表的尾巴接回中间，造出一个环来测试。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','给 balanced 多测几个例子，比如 "((())" 和 "{[()]}()"，先猜结果再运行。'],expect:'1 -> 2 -> 3\n3 -> 2 -> 1\n有环吗： false\n首尾相连后有环吗： true\ntrue false'},code:`package main

import (
    "fmt"
    "strings"
)

type Node struct {
    Val  int
    Next *Node
}

func build(vals ...int) *Node {
    var head *Node
    for i := len(vals) - 1; i >= 0; i-- {
        head = &Node{Val: vals[i], Next: head}
    }
    return head
}

func show(head *Node) {
    var parts []string
    for n := head; n != nil; n = n.Next {
        parts = append(parts, fmt.Sprint(n.Val))
    }
    fmt.Println(strings.Join(parts, " -> "))
}

func reverse(head *Node) *Node {
    var prev *Node
    for head != nil {
        next := head.Next
        head.Next = prev
        prev = head
        head = next
    }
    return prev
}

func hasCycle(head *Node) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}

func balanced(s string) bool {
    pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
    var stack []rune
    for _, c := range s {
        switch c {
        case '(', '[', '{':
            stack = append(stack, c)
        case ')', ']', '}':
            if len(stack) == 0 || stack[len(stack)-1] != pairs[c] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}

func main() {
    list := build(1, 2, 3)
    show(list)
    show(reverse(list))
    fmt.Println("有环吗：", hasCycle(build(1, 2, 3)))
    loop := build(1, 2, 3)
    loop.Next.Next.Next = loop.Next
    fmt.Println("首尾相连后有环吗：", hasCycle(loop))
    fmt.Println(balanced("({[]})"), balanced("([)]"))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"strings"',text:'导入 fmt 和 strings。'},{at:'type Node struct {',to:'Next *Node',text:'链表节点。'},{at:'func build(vals ...int) *Node {',text:'一个小工具：用几个数字快速造出一个链表。'},{at:'var head *Node',text:'从空链表开始。'},{at:'for i := len(vals) - 1; i >= 0; i-- {',to:'head = &Node{Val: vals[i], Next: head}',text:'从最后一个数字往前，每次新建一个节点放在最前面，指向原来的头。'},{at:'return head',text:'返回头节点。'},{at:'func show(head *Node) {',text:'把链表打印成 1 -> 2 -> 3 的样子。'},{at:'var parts []string',to:'parts = append(parts, fmt.Sprint(n.Val))',text:'从头走到尾，把每个值转成字符串收集起来。'},{at:'fmt.Println(strings.Join(parts, " -> "))',text:'用箭头连起来打印。'},{at:'func reverse(head *Node) *Node {',to:'return prev',text:'上一张卡片讲过的反转链表。'},{at:'func hasCycle(head *Node) bool {',to:'return false',text:'快慢指针判断有没有环。'},{at:'func balanced(s string) bool {',to:'return len(stack) == 0',text:'用栈检查括号是否匹配。'},{at:'func main() {',text:'程序入口。'},{at:'list := build(1, 2, 3)',to:'show(list)',text:'造一个 1 -> 2 -> 3 的链表并打印。'},{at:'show(reverse(list))',text:'反转后打印 3 -> 2 -> 1。'},{at:'fmt.Println("有环吗：", hasCycle(build(1, 2, 3)))',text:'普通链表没有环。'},{at:'loop := build(1, 2, 3)',to:'loop.Next.Next.Next = loop.Next',text:'再造一个链表，让最后一个节点（3）的 Next 指回第二个节点（2），形成一个环。'},{at:'fmt.Println("首尾相连后有环吗：", hasCycle(loop))',text:'快指针追上了慢指针，返回 true。'},{at:'fmt.Println(balanced("({[]})"), balanced("([)]"))',text:'第一个正确配对；第二个交叉了，不匹配。'}]},
  {title:'最小栈：随时拿到当前最小值',body:'一道常见的设计题：实现一个栈，除了入栈、出栈，还要能在 O(1) 时间内拿到栈里当前的最小值。\n每次都把栈扫描一遍找最小值是 O(n)，不符合要求。常用的做法是再配一个“辅助栈”，专门记录“到目前为止的最小值”：\n入栈时，普通栈压入新元素；辅助栈压入“新元素”和“辅助栈原来的栈顶”中较小的那个；\n出栈时，两个栈一起弹出；\n要最小值时，直接看辅助栈的栈顶。\n另一种做法是每个栈元素同时存两个值：（元素值，入栈时的当前最小值），效果一样。进阶阶段“设计模式与代码设计”那一关里有完整的 Go 代码。'},
  {title:'哈希表和集合',body:'哈希表用一个“哈希函数”把 key 直接算成一个存放位置，所以查找、插入、删除平均只要 O(1)，不管里面有多少数据。Go 的 map 就是哈希表。注意 map 的遍历顺序是不固定的。\n集合（set）是“不重复的元素的集合”，只关心某个元素在不在里面。Go 没有内置的集合类型，最常见的写法是 map[string]struct{}：只用 key，value 是空结构体 struct{}，它不占任何内存。\n判断一个元素在不在集合里：_, ok := set["go"]。'},
  {title:'二叉树和三种遍历',body:'二叉树的每个节点最多有两个孩子：左孩子和右孩子。最上面的节点叫根节点。\n遍历二叉树（把每个节点都访问一遍）有三种常见的顺序，区别在于“根节点”在什么时候访问：\n前序遍历：根 → 左 → 右；\n中序遍历：左 → 根 → 右；\n后序遍历：左 → 右 → 根。\n用递归写非常自然：对左子树做同样的事，对右子树做同样的事，再在合适的位置处理根节点。很多树的题目都是“先算出左右孩子的结果，再算自己”，也就是后序的思路，比如求树的高度。',code:`type Tree struct {
    Val         int
    Left, Right *Tree
}

func inorder(t *Tree, out *[]int) {
    if t == nil {
        return
    }
    inorder(t.Left, out)
    *out = append(*out, t.Val)
    inorder(t.Right, out)
}`,explain:[{at:'type Tree struct {',to:'Left, Right *Tree',text:'树的节点：一个值，加上指向左右孩子的指针，没有孩子时是 nil。'},{at:'func inorder(t *Tree, out *[]int) {',text:'中序遍历，把访问到的值依次放进 out。out 是切片的指针，这样函数里 append 的结果调用方才能看到。'},{at:'if t == nil {',to:'return',text:'空树什么都不做，这是递归的终止条件。'},{at:'inorder(t.Left, out)',text:'先遍历左子树。'},{at:'*out = append(*out, t.Val)',text:'再访问根节点：把值放进结果。'},{at:'inorder(t.Right, out)',text:'最后遍历右子树。'}]},
  {title:'二叉搜索树：中序遍历就是有序的',body:'二叉搜索树（BST）是一种特殊的二叉树：每个节点左子树里的值都比它小，右子树里的值都比它大。查找一个值时，比当前节点小就往左走，大就往右走，每次排除一半，平均 O(log n)。\n它有一个非常重要的性质：对二叉搜索树做中序遍历（左 → 根 → 右），得到的结果正好是从小到大排好序的。\n还要注意：两棵二叉树的中序遍历结果相同，并不说明它们完全一样。比如 1、2、3 三个数，可以组成好几种形状不同的二叉搜索树，它们的中序遍历结果都是 1 2 3。要确定一棵树的形状，需要“中序 + 前序”或者“中序 + 后序”两种遍历结果一起才行。'},
  {title:'反转字符串：为什么要先转成 []rune',body:'Go 的字符串内部是 UTF-8 编码的字节，英文字母占 1 个字节，一个汉字占 3 个字节。\n如果直接把 "Go语言" 当作字节数组反转，会把每个汉字的 3 个字节拆开、顺序颠倒，结果就变成了乱码。\n正确的做法是先转成 []rune：rune 代表一个完整的字符，“Go语言”会变成 4 个 rune，反转这 4 个 rune，再转回字符串，得到“言语oG”。\n反转的方法是双指针：一个从头开始、一个从尾开始，交换两个位置的元素，然后同时向中间靠拢，直到相遇。'},
  {title:'动手试试：二叉搜索树和反转字符串',body:'我们把 5、3、8、1、4 依次插入一棵二叉搜索树，看看中序和前序遍历的结果；再对比按 rune 反转和按字节反转“Go语言”的区别。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','改变插入的顺序，比如 1、3、4、5、8，再运行：中序结果不变，但前序结果变了，说明树的形状不一样了。'],expect:'中序： [1 3 4 5 8]\n前序： [5 3 1 4 8]\n按 rune 反转： 言语oG\n按字节反转还是合法的文字吗： false'},code:`package main

import (
    "fmt"
    "slices"
    "unicode/utf8"
)

type Tree struct {
    Val         int
    Left, Right *Tree
}

func insert(t *Tree, v int) *Tree {
    if t == nil {
        return &Tree{Val: v}
    }
    if v < t.Val {
        t.Left = insert(t.Left, v)
    } else {
        t.Right = insert(t.Right, v)
    }
    return t
}

func inorder(t *Tree, out *[]int) {
    if t == nil {
        return
    }
    inorder(t.Left, out)
    *out = append(*out, t.Val)
    inorder(t.Right, out)
}

func preorder(t *Tree, out *[]int) {
    if t == nil {
        return
    }
    *out = append(*out, t.Val)
    preorder(t.Left, out)
    preorder(t.Right, out)
}

func reverseString(s string) string {
    r := []rune(s)
    for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
        r[i], r[j] = r[j], r[i]
    }
    return string(r)
}

func main() {
    var root *Tree
    for _, v := range []int{5, 3, 8, 1, 4} {
        root = insert(root, v)
    }
    var in, pre []int
    inorder(root, &in)
    preorder(root, &pre)
    fmt.Println("中序：", in)
    fmt.Println("前序：", pre)

    fmt.Println("按 rune 反转：", reverseString("Go语言"))
    b := []byte("Go语言")
    slices.Reverse(b)
    fmt.Println("按字节反转还是合法的文字吗：", utf8.Valid(b))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"unicode/utf8"',text:'导入 fmt、slices 和 unicode/utf8。'},{at:'type Tree struct {',to:'Left, Right *Tree',text:'树节点。'},{at:'func insert(t *Tree, v int) *Tree {',text:'往二叉搜索树里插入一个值，返回插入后的树。'},{at:'if t == nil {',to:'return &Tree{Val: v}',text:'走到了空位置，就在这里新建一个节点。'},{at:'if v < t.Val {',to:'t.Left = insert(t.Left, v)',text:'比当前节点小，就插到左子树里。'},{at:'} else {',to:'t.Right = insert(t.Right, v)',text:'否则插到右子树里。'},{at:'return t',text:'返回当前节点。'},{at:'func inorder(t *Tree, out *[]int) {',to:'inorder(t.Right, out)',text:'中序遍历：左 → 根 → 右。'},{at:'func preorder(t *Tree, out *[]int) {',to:'preorder(t.Right, out)',text:'前序遍历：先访问根，再左、再右。'},{at:'func reverseString(s string) string {',text:'按字符反转字符串。'},{at:'r := []rune(s)',text:'先转成 rune 切片，每个元素是一个完整的字符。'},{at:'for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {',to:'r[i], r[j] = r[j], r[i]',text:'双指针：首尾交换，然后同时向中间移动。Go 可以一行交换两个变量的值。'},{at:'return string(r)',text:'转回字符串。'},{at:'func main() {',text:'程序入口。'},{at:'var root *Tree',to:'root = insert(root, v)',text:'依次插入 5、3、8、1、4：5 是根，3 在左边，8 在右边，1 和 4 在 3 的下面。'},{at:'var in, pre []int',to:'preorder(root, &pre)',text:'分别做中序和前序遍历，传入切片的地址。'},{at:'fmt.Println("中序：", in)',to:'fmt.Println("前序：", pre)',text:'中序结果从小到大有序；前序结果反映了树的形状。'},{at:'fmt.Println("按 rune 反转：", reverseString("Go语言"))',text:'按字符反转，得到“言语oG”。'},{at:'b := []byte("Go语言")',to:'slices.Reverse(b)',text:'换成按字节反转：汉字的 3 个字节被拆开颠倒了。'},{at:'fmt.Println("按字节反转还是合法的文字吗：", utf8.Valid(b))',text:'utf8.Valid 检查是不是合法的 UTF-8 文字，返回 false，说明变成了乱码。'}]}
 ],quiz:[
 {id:'be-ds-1',q:'需要频繁按下标随机访问元素，选哪种结构更合适？',options:['单向链表','数组或切片','栈结构','队列结构'],why:['链表按下标访问要从头逐个走，是 O(n)。','','栈只能访问栈顶元素。','队列只能访问队头和队尾元素。'],answer:1,explain:'数组按下标访问 O(1)；链表要从头走 O(n)。',interview:'q-b13c09da3854131b'},
 {id:'be-ds-2',q:'检查一串括号 "({[]})" 是否匹配，最适合用哪种结构？',options:['队列','栈','哈希表','二叉树'],why:['队列先进先出，无法匹配“最近打开的括号先关闭”的嵌套关系。','','哈希表只能统计数量，无法判断括号顺序是否正确。','二叉树结构过于复杂，这里不需要。'],answer:1,explain:'遇到左括号压栈，遇到右括号和栈顶比较，后进先出正好匹配嵌套关系。'},
 {id:'be-ds-3',type:'judge',q:'用数组实现队列，每次出队都把后面所有元素往前移一位，这样出队是 O(1)。',answer:false,explain:'搬移元素是 O(n)；用环形缓冲区记录 head 才能做到 O(1)。',interview:'q-6eab38b038a5a8b0'},
 {id:'be-ds-4',q:'在 Go 里表示一个“不重复的字符串集合”，最常见的写法是？',options:['[]string','map[string]struct{}','chan string','map[string]string'],why:['切片允许重复元素，判断是否存在要遍历，是 O(n)。','','channel 用于 goroutine 之间传递数据，不是集合。','value 存字符串会浪费空间，集合只需要 key，用 struct{} 不占内存。'],answer:1,explain:'map 的 key 天然去重，value 用 struct{} 不占空间。',interview:'q-4bb9271918ffa37c'},
 {id:'be-ds-5',q:'一棵二叉搜索树（左小右大）做哪种遍历，结果是从小到大有序的？',options:['前序遍历','中序遍历','后序遍历','层序遍历'],why:['前序先访问根节点，结果不是有序的。','','后序最后访问根节点，结果不是有序的。','层序按层从上到下访问，结果不是有序的。'],answer:1,explain:'中序遍历：左子树 → 根 → 右子树。',interview:'q-57fb9e7af5c408c6'},
 {id:'be-ds-6',type:'multi',q:'设计一个能 O(1) 取到最小值的栈，下面哪些做法正确？（多选）',options:['再维护一个同步的“最小值栈”','最小值栈的栈顶就是当前最小值','Push 时压入 min(新值, 当前最小值)','Pop 时两个栈一起弹出'],why:['','','',''],answers:[0,1,2,3],explain:'辅助的最小值栈让每一层都记住“到这里为止的最小值”：Push 时压入当前最小值，Pop 时同步弹出，Min 直接读栈顶，都是 O(1)。每次遍历整个栈则是 O(n)。',interview:'q-10fca5eeb2dea1df'},
 {id:'be-ds-7',type:'fill',q:'栈的特点是后进先出，英文缩写是 ____。',accepted:['LIFO','lifo'],explain:'LIFO：Last In First Out；队列是 FIFO。'},
 {id:'be-ds-8',type:'judge',q:'两棵二叉树的中序遍历结果相同，就说明它们完全相等。',answer:false,explain:'结构不同的树中序序列可能一样，要同时递归比较结构和值。',interview:'q-dbb76e7d3cfdb787'},
 {id:'be-ds-9',q:'反转字符串 "Go语言" 时，为什么要先转成 []rune？',options:['因为 rune 的反转速度更快','按字节反转会把汉字的多个字节打乱','因为 Go 不允许直接反转字符串','因为 []byte 类型的值不能修改'],why:['转成 []rune 需要解码，速度并不更快，目的是正确性。','','字符串不可变，但转成切片后就可以反转，Go 并不禁止。','[]byte 是可以修改的。'],answer:1,explain:'汉字在 UTF-8 中占 3 个字节，按字节反转会打乱字节顺序变成乱码，按 rune 反转才能以字符为单位。',interview:'q-0adefd5c99137f6a'},
 {id:'be-ds-10',type:'code',q:'写一个函数（Go、Python、Java、JS/TS、Rust 任选），判断一个单链表是否有环，要求 O(1) 额外空间。',code:'type Node struct {\n    Val  int\n    Next *Node\n}\nfunc hasCycle(head *Node) bool {\n    // 在这里实现\n}',reference:'func hasCycle(head *Node) bool {\n    slow, fast := head, head\n    for fast != nil && fast.Next != nil {\n        slow = slow.Next\n        fast = fast.Next.Next\n        if slow == fast {\n            return true\n        }\n    }\n    return false\n}',points:['快慢双指针，快指针每次走两步','相遇说明有环','fast 或 fast 的下一个节点为空说明无环','不需要额外的哈希表'],explain:'快慢指针（Floyd 判圈）是链表题的常用套路。'},
]};

export const beAlgo2:AiLevel={id:'be-algo2',title:'常考算法：排序、二分、堆和滑动窗口',summary:'复杂度分析加几类高频算法套路，会写也会讲',lessons:[
  {title:'这一关学什么：几类最常考的算法套路',body:'面试的算法题看起来千变万化，其实大多是几种固定套路的组合。这一关先学会分析一段代码有多快（复杂度），再学几种高频套路：\n一、排序：几种排序算法各自的速度和特点，什么叫“稳定”；\n二、二分查找：在有序数据里飞快地找东西；\n三、堆：从海量数据里找最大的 K 个；\n四、滑动窗口：处理“连续的一段”的问题。\n最后讲面试时拿到一道算法题，应该按什么流程来回答。每个套路都有能直接运行的 Go 代码。'},
  {title:'复杂度：看工作量怎么增长',body:'时间复杂度描述的是：输入的数据量 n 变大时，程序要做的工作量大致怎么增长，用大 O 表示，只关心增长的“量级”：\nO(1)：常数，和数据量无关；\nO(log n)：数据翻倍只多一步，比如二分查找；\nO(n)：遍历一遍；\nO(n log n)：好的排序算法；\nO(n²)：两层嵌套循环。\n下面这段代码，外层循环 n 次，内层循环次数从 n 逐次减少到 1，总共大约 n × n / 2 次，去掉常数 1/2，就是 O(n²)。\n空间复杂度看的是额外需要多少存储，递归调用时每一层占用的调用栈也要算进去。\n还有一种“均摊”复杂度：Go 切片 append 偶尔需要扩容，要把所有元素复制一遍，是 O(n)；但扩容很少发生，平均分摊到每一次 append 上，只有 O(1)。',code:`for i := 0; i < n; i++ {
    for j := i; j < n; j++ {
        sum += a[j]
    }
}`,explain:[{at:'for i := 0; i < n; i++ {',text:'外层循环执行 n 次。'},{at:'for j := i; j < n; j++ {',text:'内层循环从 i 开始：第一轮 n 次，第二轮 n-1 次……最后一轮 1 次。'},{at:'sum += a[j]',text:'总共执行约 n(n+1)/2 次，量级是 n²，所以时间复杂度是 O(n²)。'}]},
  {title:'几种排序算法',body:'冒泡排序、选择排序、插入排序：都是 O(n²)，思路简单，适合理解排序的基本思想和处理很少的数据。其中插入排序很特别：如果数据已经几乎排好序，它只需要很少的移动，速度接近 O(n)，所以很多标准库在数据量小时会改用它；\n快速排序：选一个“基准”数，把比它小的放左边、大的放右边，再分别对两边重复这个过程。平均 O(n log n)，实际通常最快。但如果每次选的基准都很糟糕（比如数据本来就有序，又总是选第一个数当基准），每次只能分出一个元素，会退化成 O(n²)。随机选基准可以避免；\n归并排序：把数据分成两半各自排好，再合并起来。稳定地保持 O(n log n)，但需要额外的空间。\n“稳定”的意思是：值相等的元素，排序后保持原来的先后顺序。冒泡、插入、归并是稳定的，选择、快排、堆排序不稳定。\n实际写代码时，直接用标准库的 slices.Sort、sort.Slice 就行，需要稳定排序用 sort.SliceStable。'},
  {title:'动手试试：插入排序、稳定排序和二分查找',body:'我们自己实现插入排序和二分查找，再用标准库做一次稳定排序；最后在 100 万个有序的数里二分查找，数一数到底比较了多少次。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','把 big 的大小从 1000000 改成 1000，再运行，看看比较次数变成了多少（大约是 log₂1000 ≈ 10）。'],expect:'插入排序： [1 2 5 7 9]\n稳定排序： [{B 10} {D 10} {A 30} {C 30}]\n找到位置 999999 比较了 20 次\n找不存在的数，比较了 20 次'},code:`package main

import (
    "fmt"
    "sort"
)

type order struct {
    name   string
    amount int
}

func insertionSort(a []int) {
    for i := 1; i < len(a); i++ {
        x, j := a[i], i-1
        for j >= 0 && a[j] > x {
            a[j+1] = a[j]
            j--
        }
        a[j+1] = x
    }
}

func search(a []int, x int) (int, int) {
    l, r, steps := 0, len(a)-1, 0
    for l <= r {
        steps++
        m := l + (r-l)/2
        switch {
        case a[m] == x:
            return m, steps
        case a[m] < x:
            l = m + 1
        default:
            r = m - 1
        }
    }
    return -1, steps
}

func main() {
    a := []int{5, 2, 9, 1, 7}
    insertionSort(a)
    fmt.Println("插入排序：", a)

    orders := []order{{"A", 30}, {"B", 10}, {"C", 30}, {"D", 10}}
    sort.SliceStable(orders, func(i, j int) bool { return orders[i].amount < orders[j].amount })
    fmt.Println("稳定排序：", orders)

    big := make([]int, 1000000)
    for i := range big {
        big[i] = i * 2
    }
    idx, steps := search(big, 1999998)
    fmt.Println("找到位置", idx, "比较了", steps, "次")
    _, steps = search(big, 7)
    fmt.Println("找不存在的数，比较了", steps, "次")
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"sort"',text:'导入 fmt 和 sort。'},{at:'type order struct {',to:'amount int',text:'一个订单：名字和金额，用来演示稳定排序。'},{at:'func insertionSort(a []int) {',text:'插入排序：像整理手里的扑克牌，每次拿一张新牌，插到前面已经排好的牌中合适的位置。'},{at:'for i := 1; i < len(a); i++ {',to:'x, j := a[i], i-1',text:'从第二个元素开始，x 是这次要插入的数，j 指向它前面那个。'},{at:'for j >= 0 && a[j] > x {',to:'j--',text:'前面比 x 大的，都往后挪一位，给 x 腾地方。'},{at:'a[j+1] = x',text:'把 x 放进腾出来的位置。'},{at:'func search(a []int, x int) (int, int) {',text:'二分查找：返回找到的位置，以及比较了多少次。'},{at:'l, r, steps := 0, len(a)-1, 0',text:'查找范围是闭区间 [l, r]，一开始是整个数组。'},{at:'for l <= r {',to:'steps++',text:'范围里还有元素就继续，每轮比较一次。'},{at:'m := l + (r-l)/2',text:'取中点，这样写不会因为 l + r 太大而溢出。'},{at:'switch {',to:'return m, steps',text:'正好等于，找到了。'},{at:'case a[m] < x:',to:'l = m + 1',text:'中点比目标小，去掉左半边。'},{at:'default:',to:'r = m - 1',text:'中点比目标大，去掉右半边。'},{at:'return -1, steps',text:'范围空了还没找到，返回 -1。'},{at:'func main() {',to:'fmt.Println("插入排序：", a)',text:'测试插入排序。'},{at:'orders := []order{{"A", 30}, {"B", 10}, {"C", 30}, {"D", 10}}',to:'fmt.Println("稳定排序：", orders)',text:'按金额稳定排序：金额相同的 B 和 D、A 和 C，都保持了原来的先后顺序。'},{at:'big := make([]int, 1000000)',to:'big[i] = i * 2',text:'造一个 100 万个元素的有序数组：0、2、4……'},{at:'idx, steps := search(big, 1999998)',to:'fmt.Println("找到位置", idx, "比较了", steps, "次")',text:'找最后一个数，只比较了 20 次，因为 2 的 20 次方约等于 100 万。'},{at:'_, steps = search(big, 7)',to:'fmt.Println("找不存在的数，比较了", steps, "次")',text:'7 是奇数，不存在，也只比较了 20 次就确定了。'}]},
  {title:'二分查找的细节',body:'二分查找的前提是数据已经排好序。每次和中间的元素比较，就能排除一半，所以 100 万个数最多只要比较大约 20 次（log₂ 1000000 ≈ 20）。\n写的时候最容易出错的是边界，要前后统一：\n一、用“左闭右闭”区间 [l, r]：初始 r = len-1，循环条件 l <= r，缩小范围时 l = m+1、r = m-1；\n二、中点写成 l + (r-l)/2，而不是 (l+r)/2：当 l 和 r 都很大时，l + r 可能超出整数的范围（溢出）变成负数；\n三、“找第一个大于等于 x 的位置”“找最后一个等于 x 的位置”这类变体，标准库有 sort.Search 和 slices.BinarySearch 可以直接用。'},
  {title:'堆：从海量数据里找最大的 K 个',body:'堆是一种特殊的“完全二叉树”，通常用数组存放。小顶堆的特点是：每个节点都比它的孩子小，所以堆顶（第一个元素）永远是最小的。往堆里放入一个元素、或者取出堆顶，都只要 O(log n)。\n经典题目：从 1 亿个数里找出最大的 10 个，而且内存有限，不能全部读进来排序。\n做法是维护一个大小为 10 的小顶堆：先放入前 10 个数；之后每读一个数，就和堆顶（这 10 个里最小的）比较，比它大就替换掉堆顶，再调整堆。全部读完后，堆里剩下的就是最大的 10 个。时间复杂度 O(n log K)，内存只需要存 10 个数。\nGo 的标准库 container/heap 提供了堆的操作，只要为自己的类型实现几个方法。'},
  {title:'滑动窗口：处理“连续的一段”',body:'很多题目要求的是数组或字符串里“连续的一段”，比如“不含重复字符的最长子串”。暴力的做法是把每一段都检查一遍，是 O(n²) 甚至更慢。\n滑动窗口用左右两个指针框出一个“窗口”：\n右指针不断往右扩张，把新的元素加进窗口；\n一旦窗口不满足条件了（比如出现了重复字符），就把左指针往右收缩，直到窗口重新满足条件；\n在这个过程中，随时记录满足条件的最大窗口长度。\n因为左右指针都只往右走、不回头，每个元素最多被访问两次，时间复杂度是 O(n)。比如 "abcabcbb" 里不含重复字符的最长子串是 "abc"，长度 3。'},
  {title:'动手试试：Top K 和最长无重复子串',body:'我们用标准库 container/heap 实现一个小顶堆，找出一组数里最大的 3 个；再用滑动窗口求最长无重复子串的长度，中文也能正确处理。',practice:{steps:['确认装好了 Go：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 go version，能看到版本号就行；没装的话去 go.dev/dl 下载安装包，一路下一步即可。','新建一个空文件夹（比如 go-try），在里面新建文件 main.go，把下面的代码复制进去保存。','在终端里进入这个文件夹（cd 文件夹路径），运行 go run main.go，对照下面的输出。','给 longestUnique 再测一个你自己想的字符串，先在纸上算出答案，再运行验证。'],expect:'最大的 3 个： [9 8 7]\n3 3 3'},code:`package main

import (
    "container/heap"
    "fmt"
    "sort"
)

type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() any {
    old := *h
    x := old[len(old)-1]
    *h = old[:len(old)-1]
    return x
}

func topK(nums []int, k int) []int {
    h := &MinHeap{}
    for _, x := range nums {
        if h.Len() < k {
            heap.Push(h, x)
        } else if x > (*h)[0] {
            (*h)[0] = x
            heap.Fix(h, 0)
        }
    }
    res := []int(*h)
    sort.Sort(sort.Reverse(sort.IntSlice(res)))
    return res
}

func longestUnique(s string) int {
    last := map[rune]int{}
    best, left := 0, 0
    for right, c := range []rune(s) {
        if i, ok := last[c]; ok && i >= left {
            left = i + 1
        }
        last[c] = right
        if right-left+1 > best {
            best = right - left + 1
        }
    }
    return best
}

func main() {
    nums := []int{5, 1, 9, 3, 7, 8, 2, 6}
    fmt.Println("最大的 3 个：", topK(nums, 3))
    fmt.Println(longestUnique("abcabcbb"), longestUnique("pwwkew"), longestUnique("我爱我家"))
}`,explain:[{at:'package main',text:'可运行程序属于 main 包。'},{at:'import (',to:'"sort"',text:'container/heap 提供堆的操作，sort 用来最后排序。'},{at:'type MinHeap []int',text:'定义一个基于整数切片的小顶堆类型。'},{at:'func (h MinHeap) Len() int',to:'func (h MinHeap) Swap(i, j int)',text:'heap 包要求实现的前三个方法：长度、比较（h[i] < h[j] 表示小的在上面，就是小顶堆）、交换。'},{at:'func (h *MinHeap) Push(x any)',text:'放入一个元素：追加到切片末尾，heap 包会负责把它调整到正确的位置。'},{at:'func (h *MinHeap) Pop() any {',to:'return x',text:'取出最后一个元素。heap.Pop 会先把堆顶换到最后，再调用这个方法取走。'},{at:'func topK(nums []int, k int) []int {',text:'找出最大的 k 个数。'},{at:'h := &MinHeap{}',text:'一个空的小顶堆。'},{at:'for _, x := range nums {',to:'heap.Push(h, x)',text:'堆里不足 k 个时，直接放进去。'},{at:'} else if x > (*h)[0] {',to:'heap.Fix(h, 0)',text:'堆满了：如果新数比堆顶（当前 k 个里最小的）大，就替换堆顶，再用 heap.Fix 重新调整。'},{at:'res := []int(*h)',to:'sort.Sort(sort.Reverse(sort.IntSlice(res)))',text:'堆里剩下的就是最大的 k 个，从大到小排好序方便查看。'},{at:'return res',text:'返回结果。'},{at:'func longestUnique(s string) int {',text:'求不含重复字符的最长子串长度。'},{at:'last := map[rune]int{}',text:'记录每个字符最后一次出现的位置。'},{at:'best, left := 0, 0',text:'best 是目前最长的长度，left 是窗口左边界。'},{at:'for right, c := range []rune(s) {',text:'右指针 right 逐个往右扩张。转成 []rune，中文也按字符处理。'},{at:'if i, ok := last[c]; ok && i >= left {',to:'left = i + 1',text:'当前字符在窗口里出现过，就把左边界移到它上次出现位置的后一位，窗口里就没有重复了。'},{at:'last[c] = right',text:'更新这个字符最后出现的位置。'},{at:'if right-left+1 > best {',to:'best = right - left + 1',text:'当前窗口长度是 right - left + 1，比记录的长就更新。'},{at:'return best',text:'返回最长长度。'},{at:'func main() {',to:'fmt.Println("最大的 3 个：", topK(nums, 3))',text:'从 8 个数里找最大的 3 个：9、8、7。'},{at:'fmt.Println(longestUnique("abcabcbb"), longestUnique("pwwkew"), longestUnique("我爱我家"))',text:'三个例子的答案都是 3：abc、wke、爱我家。'}]},
  {title:'一致性哈希：再提一次',body:'把数据分到多台缓存服务器上，简单的做法是 hash(key) % 机器数。问题是机器数一变（比如 3 台扩成 4 台），几乎所有 key 算出的位置都变了，大部分缓存都要迁移，一下子全部失效。\n一致性哈希把机器和 key 都放到同一个“哈希环”上，每个 key 顺时针找到的第一台机器就是它的归属。加一台机器，只影响环上相邻的一小段 key，大约只需要迁移 1/N 的数据。进阶阶段“设计模式与代码设计”那一关里，有可以直接运行的对比实验。'},
  {title:'面试时拿到一道算法题，怎么答',body:'面试官看重的不只是能不能写出来，还有思考和沟通的过程。推荐这个流程：\n一、先确认题意：复述一遍题目，问清楚输入的范围和边界情况。数据有多大？有没有负数、重复？数组为空怎么办？\n二、先说一个最直接的暴力解法，以及它的复杂度，确保至少有一个能用的答案；\n三、再想优化：数据有序吗（二分）？要找连续的一段吗（滑动窗口）？要找最大的几个吗（堆）？需要快速查找吗（哈希表）？说出优化后的思路和复杂度，和面试官确认后再动手写；\n四、写代码：变量名清楚，边写边说自己在做什么；\n五、写完自己用一两个例子走一遍，特别是边界情况（空输入、只有一个元素）；\n六、最后总结时间复杂度和空间复杂度。\n卡住的时候，把自己的思路说出来，面试官往往会给提示。'}
 ],quiz:[
 {id:'be-algo2-1',q:'在 100 万个有序数里二分查找，最多大约比较多少次？',options:['约 100 万次','约 1000 次','约 20 次','约 2 次'],why:['100 万次是顺序查找的最坏情况。','1000 次大约是 √n，不是二分查找的复杂度。','','每次只能排除一半，不可能 2 次就找到。'],answer:2,explain:'二分查找每次排除一半，log₂(10⁶) ≈ 20。',interview:'q-d8f795112d612596'},
 {id:'be-algo2-2',type:'multi',q:'下面哪些排序算法是稳定的？（多选）',options:['冒泡排序','插入排序','归并排序','快速排序'],why:['','','','快速排序在划分时会交换元素，可能改变相等元素的相对顺序，一般不稳定。'],answers:[0,1,2],explain:'快速排序的划分会交换相等元素的相对顺序，一般不稳定。',interview:'q-0385c889a7b8ea8e'},
 {id:'be-algo2-3',q:'快速排序什么时候会退化到 O(n²)？',options:['待排序的数据量很小的时候','每次的枢轴都是最大或最小值','数据全部都是正数的时候','使用递归方式实现的时候'],why:['数据量小时运行很快，复杂度不会退化。','','数据的正负不影响划分是否平衡。','递归只是实现方式，决定复杂度的是划分是否平衡。'],answer:1,explain:'划分极不平衡时递归深度变成 n；随机选枢轴或三数取中可以避免。',interview:'q-faeefd41b5278301'},
 {id:'be-algo2-4',q:'从 1 亿个数里找最大的 10 个，内存有限，最合适的做法是？',options:['全部排序后取前 10 个','维护大小为 10 的小顶堆','维护大小为 10 的大顶堆','随机抽取 10 个数作为结果'],why:['1 亿个数全部排序需要大量内存和 O(n log n) 的时间。','','大顶堆的堆顶是最大值，无法作为“淘汰门槛”快速判断新数是否该进入。','随机抽取得不到正确结果。'],answer:1,explain:'小顶堆的堆顶是当前第 10 大的数，只有比它大的数才替换，时间 O(n log 10)，空间 O(10)。',interview:'q-c7bff07bdc346cf3'},
 {id:'be-algo2-5',type:'judge',q:'二分查找的中点写成 (l+r)/2 在任何情况下都没有问题。',answer:false,explain:'l+r 可能溢出；写成 l+(r-l)/2 更安全。'},
 {id:'be-algo2-6',q:'求字符串中“不含重复字符的最长子串”长度，常用哪种技巧，时间复杂度多少？',options:['暴力枚举所有子串，O(n³)','滑动窗口记录字符位置，O(n)','排序后二分查找，O(n log n)','递归回溯所有组合，O(2ⁿ)'],why:['暴力枚举可以得到结果，但复杂度太高。','','排序会打乱字符的原始顺序，子串就不存在了。','回溯枚举组合会指数级爆炸，而且子串要求连续，不是组合问题。'],answer:1,explain:'右指针扩张，遇到重复时左指针跳到重复字符的下一位。',interview:'q-b8e7fa67643486dd'},
 {id:'be-algo2-7',type:'fill',q:'3 台缓存机器用 hash(key) % 3 分配数据，扩成 4 台后大部分数据都要迁移。用 ____ 哈希可以只迁移一小部分。',accepted:['一致性','一致','一致性哈希','一致哈希'],explain:'一致性哈希把节点和数据映射到同一个环上，扩缩容时只影响环上相邻的一小段区间。',interview:'q-38541cc7f4c6e66a'},
 {id:'be-algo2-8',q:'下面这段代码的时间复杂度是？',code:'for i := 0; i < n; i++ {\n    for j := i; j < n; j++ {\n        sum += a[j]\n    }\n}',options:['O(n)','O(n log n)','O(n²)','O(2ⁿ)'],why:['内层循环也与 n 有关，不是单层循环。','内层不是每次减半，没有对数因子。','','没有每次分成两个分支的递归，不是指数级。'],answer:2,explain:'内层平均执行 n/2 次，总共约 n²/2 次，忽略常数是 O(n²)。',interview:'q-7934b553b7e39e8d'},
 {id:'be-algo2-9',type:'judge',q:'插入排序在数据几乎有序时可以接近 O(n)。',answer:true,explain:'每个元素只需要往前挪很少的位置。',interview:'q-b653f56b58554795'},
 {id:'be-algo2-10',type:'short',q:'面试中拿到一道算法题，你的答题流程是怎样的？',reference:'先复述题目并问清输入范围、边界（空、重复、负数、溢出）；先说一个暴力解和它的复杂度；再分析瓶颈，想用哈希表、双指针、二分、堆、DP 等优化，并说明新的时间和空间复杂度；确认后再写代码；写完用空输入、单个元素、极值手动走一遍，说明测试用例。',points:['问清范围和边界','先给暴力解和复杂度','说清优化思路和新复杂度','写完用边界用例验证'],explain:'面试官更看重思考过程，而不是一上来就背出最优解。',interview:'q-65908ecd4d784c67'},
]};
