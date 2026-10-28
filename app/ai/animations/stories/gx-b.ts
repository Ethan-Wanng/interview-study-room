import {A,type Story} from '../story';

// Go 面试题动画（基础二）：数组与切片、引号、Trim、溢出、值与引用数据、内嵌、len/cap、make 的两种写法。
export const gxB:Record<string,Story>={
 'q-a7e0804442cd1cb5':{title:'数组和切片：固定的盒子与可移动的窗口',beats:[
  {say:'数组 [3]int 的长度是类型的一部分：[3]int 和 [4]int 是不同的类型，长度不能变。',add:[A('arr','📦','数组 [3]int：长度固定',150,80,{kind:'item',tone:'primary'})]},
  {say:'数组是值类型：赋值和传参会把整个数组复制一份，改副本不影响原数组。',add:[A('cp','📋','赋值 = 复制全部元素',150,220,{kind:'tag',tone:'warm'})]},
  {say:'切片 []int 是对底层数组的一个“窗口”：指针 + len + cap，长度可以通过 append 增长。',add:[A('sl','🪟','切片：ptr · len · cap',490,80,{kind:'item',tone:'ok'})]},
  {say:'切片赋值只复制这三个字段，两个切片共享底层数组，改元素会互相看到。日常开发几乎都用切片。',add:[A('share','🔗','复制切片 = 共享元素',490,220,{kind:'tag',tone:'primary'})]},
  {say:'记住区别。',memo:['数组：长度是类型的一部分，值语义','切片：底层数组的窗口，可增长']},
 ]},
 'q-6d85c2ce0c9bef41':{title:'双引号、反引号和单引号',beats:[
  {say:'双引号 "…" 是解释型字符串：支持转义，\\n 是换行，\\t 是制表符，\\" 是引号。',add:[A('dq','💬','"a\\nb"：会转义',150,90,{kind:'item',tone:'primary'})]},
  {say:'反引号 `…` 是原始字符串：里面写什么就是什么，不处理转义，可以直接换行。',add:[A('bq','📜','`a\\nb`：原样保留',490,90,{kind:'item',tone:'ok'})]},
  {say:'所以写正则表达式、JSON 模板、SQL、Windows 路径时用反引号，不用写一堆反斜杠。',add:[A('use','🧩','正则 · SQL · 路径',490,230,{kind:'tag'})]},
  {say:'单引号 \'a\' 不是字符串，而是一个 rune（Unicode 码点，本质是 int32）。',add:[A('sq','🔤','\'a\'：rune（int32）',150,230,{kind:'tag',tone:'warm'})]},
  {say:'记住三种引号。',memo:['双引号支持转义','反引号原样保留，单引号是 rune']},
 ]},
 'q-dae74df7976ad00e':{title:'TrimRight 和 TrimSuffix：一字之差',beats:[
  {say:'字符串 s := "file.go.go"，想去掉末尾的 ".go"。',add:[A('s','📄','"file.go.go"',320,60,{kind:'item',tone:'primary'})]},
  {say:'strings.TrimSuffix(s, ".go")：把 ".go" 当成一个完整的后缀，只去掉一次，得到 "file.go"。',add:[A('suf','✂️','TrimSuffix → "file.go"',150,190,{kind:'tag',tone:'ok'})]},
  {say:'strings.TrimRight(s, ".go")：把 ".go" 当成字符集合 {. g o}，从右边一直删掉属于这个集合的字符，得到 "file"。',add:[A('right','🧹','TrimRight → "file"',490,190,{kind:'tag',tone:'bad'})]},
  {say:'所以去掉固定后缀用 TrimSuffix（前缀用 TrimPrefix）；TrimRight / TrimLeft / Trim 的第二个参数是“要删除的字符集合”。',bubble:{who:'right',text:'我按字符删'}},
  {say:'记住区别。',memo:['TrimSuffix 删完整后缀一次','TrimRight 按字符集合一直删']},
 ]},
 'q-3add429dd312a64e':{title:'整数溢出：静悄悄地绕回去',beats:[
  {say:'var x int8 = 127，这是 int8 能表示的最大值。',add:[A('x','🔢','int8：127',320,70,{kind:'item',tone:'primary'})]},
  {say:'运行时执行 x++，不会报错也不会 panic，而是绕回到 -128。无符号 uint8 的 255 + 1 会变成 0。',sub:{x:'x++ → -128'},tone:{x:'bad'},bubble:{who:'x',text:'我绕回去了'}},
  {say:'但常量表达式溢出在编译期就会报错，比如 var y int8 = 128。',add:[A('cst','🛑','常量溢出：编译报错',150,220,{kind:'tag',tone:'warm'})]},
  {say:'金额、计数、长度计算要选够大的类型，必要时在运算前检查边界，或用 math/big；浮点数则会变成 +Inf。',add:[A('fix','🛡️','检查边界 · math/big',490,220,{kind:'tag',tone:'ok'})]},
  {say:'记住溢出规则。',memo:['运行时整数溢出会回绕，不报错','常量溢出编译期报错，关键运算要检查']},
 ]},
 'q-faaef786b979e214':{title:'值本身和它引用的数据',beats:[
  {say:'一个切片变量本身只有 24 字节（64 位平台）：指针、长度、容量，这是它的“值”。',add:[A('hdr','🧾','切片头：24 字节',150,90,{kind:'item',tone:'primary'})]},
  {say:'它引用的底层数组可能有几 MB，在另一块内存里。unsafe.Sizeof 只算值本身，不算引用的数据。',add:[A('data','🗄️','底层数组：几 MB',490,90,{kind:'item'})],send:[{from:'hdr',to:'data',text:'指向'}]},
  {say:'string、map、channel、接口、函数值也一样：变量本身很小，真正的数据在别处。',add:[A('kinds','📦','string · map · chan · interface',320,220,{kind:'tag'})]},
  {say:'所以“传值”只复制这个小头部，开销很低，但共享底层数据：修改元素对方能看到，并发访问要同步。',add:[A('pass','🔗','复制小头部，共享数据',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住区别。',memo:['值本身：Sizeof 计算的部分','引用的数据在别处，复制时共享']},
 ]},
 'q-bc32ce223ccbe2b0':{title:'哪些类型可以内嵌到结构体里',beats:[
  {say:'结构体可以内嵌一个类型名，不写字段名：type Car struct { Engine }，Engine 的方法和字段被“提升”到 Car 上。',add:[A('car','🚗','Car { Engine }',320,70,{kind:'item',tone:'primary'})]},
  {say:'可以内嵌：具名类型 T，或指向具名非接口类型的指针 *T（T 本身不能是指针类型），比如结构体、具名的 int、具名的切片类型。',add:[A('ok','✅','T 或 *T',150,200,{kind:'tag',tone:'ok'})]},
  {say:'也可以内嵌接口类型，常用来“部分实现”一个接口；在接口里内嵌接口则用来组合方法集。',add:[A('iface','🔌','接口也可内嵌',490,200,{kind:'tag',tone:'ok'})]},
  {say:'不能内嵌：未命名的类型字面量（如 []int、map[string]int），以及指向指针或指向接口的指针。同名字段冲突时，浅层优先，同层冲突访问会报错。',add:[A('no','🚫','类型字面量不行',320,310,{kind:'tag',tone:'bad'})]},
  {say:'记住内嵌规则。',memo:['具名类型 T 或 *T、接口可以内嵌','提升字段和方法，同层同名会冲突']},
 ]},
 'q-22d6527e99891cd6':{title:'len 和 cap：用了多少，最多多少',beats:[
  {say:'s := make([]int, 3, 10)：底层数组有 10 个位置，现在用了 3 个。',add:[A('s','🪟','切片 s',150,80,{kind:'item',tone:'primary'}),A('arr','🗄️','底层数组 10 格',490,80,{kind:'item'})],send:[{from:'s',to:'arr'}]},
  {say:'len(s) 是 3：能访问的元素个数，下标必须小于 len。cap(s) 是 10：不重新分配内存最多能增长到多少。',add:[A('lc','📏','len 3 · cap 10',150,220,{kind:'tag',tone:'ok'})]},
  {say:'append 不超过 cap 时直接写进原数组；超过了就分配新数组、复制旧数据。',add:[A('ap','➕','append 超过 cap → 搬家',490,220,{kind:'tag',tone:'warm'})]},
  {say:'len 适用于字符串、数组、切片、map、channel；cap 只适用于数组、切片和 channel。字符串的 len 是字节数。',add:[A('types','🧩','cap：数组 · 切片 · chan',320,310,{kind:'tag'})]},
  {say:'记住区别。',memo:['len：当前元素个数','cap：不扩容时的最大容量']},
 ]},
 'q-1d24fad2bec0210b':{title:'make([]int, 5) 和 make([]int, 0, 5)',beats:[
  {say:'a := make([]int, 5)：长度 5，容量 5，里面已经有 5 个 0。',add:[A('a','🧱','a：[0 0 0 0 0]',150,90,{kind:'item',tone:'primary'})],sub:{a:'len 5 · cap 5'}},
  {say:'b := make([]int, 0, 5)：长度 0，容量 5，空的，但预留了 5 个位置。',add:[A('b','🫙','b：[]',490,90,{kind:'item',tone:'ok'})],sub:{b:'len 0 · cap 5'}},
  {say:'常见 bug：a := make([]int, 5) 之后循环 append 了 3 个数，结果是 [0 0 0 0 0 1 2 3]，前面多了 5 个 0。',add:[A('bug','🐞','append 到 5 个 0 后面',150,250,{kind:'tag',tone:'bad'})],tone:{a:'bad'}},
  {say:'规则：要用下标 a[i] = x 赋值，就用 make(T, n)；要用 append 逐个添加，就用 make(T, 0, n) 预留容量，减少扩容。',add:[A('rule','📏','下标赋值 vs append',490,250,{kind:'tag',tone:'ok'})]},
  {say:'记住区别。',memo:['make(T, n)：已有 n 个零值','make(T, 0, n)：空的，预留容量配合 append']},
 ]},
};
