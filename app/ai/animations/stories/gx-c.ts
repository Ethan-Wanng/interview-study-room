import {A,type Story} from '../story';

// Go 面试题动画（基础三）：map 与 cap、组合字面量、指针限制、nil 零值、数值转换、map 的 key、可变参数、传值传指针。
export const gxC:Record<string,Story>={
 'q-d5dd4cc8f5848305':{title:'为什么 map 没有 cap',beats:[
  {say:'切片的底层是一段连续数组，“容量”就是这段数组的长度，有明确含义。',add:[A('sl','🪟','切片：连续数组，有 cap',150,90,{kind:'item',tone:'primary'})]},
  {say:'map 是哈希表，元素分散在多个桶（新版本是 Swiss Table 的组）里，装得越满冲突越多，运行时会自动扩容。',add:[A('m','🗂️','map：哈希表，自动扩容',490,90,{kind:'item'})]},
  {say:'它没有一个“到这里就满了”的固定容量，cap(m) 直接编译报错。',add:[A('err','🚫','cap(m) 编译报错',490,220,{kind:'tag',tone:'bad'})]},
  {say:'make(map[string]int, 1000) 里的 1000 只是提示：预估会放多少元素，提前分配减少扩容，不是上限，超过照样能放。',add:[A('hint','💡','make 的 hint 只是预估',150,220,{kind:'tag',tone:'ok'})]},
  {say:'记住原因。',memo:['map 是哈希表，没有固定容量','make 的第二个参数只是提示']},
 ]},
 'q-75d8ba64324f7d70':{title:'组合字面量：一行造出复杂的值',beats:[
  {say:'组合字面量用 类型{…} 直接构造值，适用于结构体、数组、切片和 map。',add:[A('cl','🧱','T{ … }',320,60,{kind:'item',tone:'primary'})]},
  {say:'结构体：User{Name: "Tom", Age: 18}；数组：[3]int{1, 2, 3}，也可以 [...]int{1, 2, 3} 让编译器数长度。',add:[A('st','🧑','User{Name: "Tom"}',150,180,{kind:'tag'}),A('ar','📦','[...]int{1, 2, 3}',490,180,{kind:'tag'})]},
  {say:'切片：[]string{"a", "b"}；map：map[string]int{"a": 1}。嵌套时内层可以省略类型：[]Point{{1, 2}, {3, 4}}。',add:[A('mp','🗂️','map[string]int{"a": 1}',150,290,{kind:'tag'}),A('nest','🪆','[]Point{{1, 2}}',490,290,{kind:'tag',tone:'ok'})]},
  {say:'&User{…} 直接得到指针，最常见的构造方式。基本类型（int、string）、channel、函数、接口不能用组合字面量。',bubble:{who:'cl',text:'chan 和接口不行'}},
  {say:'记住组合字面量。',memo:['结构体、数组、切片、map 可用','&T{} 直接得到指针']},
 ]},
 'q-614f336e16b21368':{title:'Go 的指针比 C 安全在哪里',beats:[
  {say:'Go 有指针：p := &x 取地址，*p 读写它指向的值。',add:[A('x','📦','x = 10',150,100,{kind:'item',tone:'primary'}),A('p','👉','p := &x',490,100,{kind:'item'})],send:[{from:'p',to:'x',text:'指向'}]},
  {say:'限制一：不能做指针运算，p++ 编译报错，不能像 C 一样随意移动到别的内存。',add:[A('arith','🚫','不能 p++',150,240,{kind:'tag',tone:'bad'})]},
  {say:'限制二：不同类型的指针不能直接互相转换或比较；不能对 map 元素、常量等不可寻址的值取地址。',add:[A('conv','🚫','*int ≠ *float64',490,240,{kind:'tag',tone:'bad'})]},
  {say:'需要绕过这些限制时只能用 unsafe 包，代价是放弃类型安全和兼容性保证。另外 Go 有垃圾回收，返回局部变量的地址也是安全的（会逃逸到堆）。',add:[A('unsafe','⚠️','unsafe：自担风险',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住指针限制。',memo:['没有指针运算，类型之间不能随便转','unsafe 才能绕过，返回局部变量地址安全']},
 ]},
 'q-b9dd099025dad204':{title:'哪些类型的零值是 nil',beats:[
  {say:'声明变量但不赋值，会得到零值。数字是 0，字符串是 ""，布尔是 false，结构体是各字段的零值——它们都不是 nil。',add:[A('zero','0️⃣','0 · "" · false · struct{}',320,60,{kind:'item'})]},
  {say:'零值是 nil 的六种：指针、切片、map、channel、函数、接口。',add:[A('nil','🕳️','指针 · 切片 · map · chan · func · interface',320,180,{kind:'item',tone:'primary'})]},
  {say:'它们对 nil 的容忍程度不同：nil 切片可以 append、len 为 0；nil map 可以读，但写会 panic；nil channel 收发会永远阻塞。',add:[A('diff','⚖️','行为各不相同',150,300,{kind:'tag',tone:'warm'})]},
  {say:'接口的坑：装了一个 nil 指针的接口，接口本身不等于 nil，因为它有类型信息。',add:[A('iface','🪤','(*T)(nil) 装进接口 ≠ nil',490,300,{kind:'tag',tone:'bad'})]},
  {say:'记住六种。',memo:['指针、切片、map、chan、func、interface','装了 nil 指针的接口不等于 nil']},
 ]},
 'q-b669b1002a6c863d':{title:'数值和字符串怎么互相转换',beats:[
  {say:'数值类型之间要显式转换：float64(i)、int(f)。浮点转整数会直接截断小数，超出范围的结果没有保证。',add:[A('num','🔢','int ⇄ float64：显式转换',320,60,{kind:'item',tone:'primary'})]},
  {say:'大类型转小类型会截断高位：v := 300; int8(v) 变成 44（直接写常量 int8(300) 会编译报错），要先检查范围。',add:[A('trunc','✂️','int8(v) = 44（v=300）',150,180,{kind:'tag',tone:'bad'})]},
  {say:'数字和字符串之间要用 strconv：Itoa / Atoi，ParseInt / FormatInt（可指定进制和位数），ParseFloat，解析失败返回 error。',add:[A('sc','🔁','strconv.Atoi / ParseFloat',490,180,{kind:'tag',tone:'ok'})]},
  {say:'千万别写 string(65)——它得到的是 "A"（把数字当码点），不是 "65"。go vet 会提示这个问题。',add:[A('pit','🪤','string(65) = "A"',320,300,{kind:'tag',tone:'warm'})]},
  {say:'记住转换方式。',memo:['数值之间显式转换，注意截断','和字符串互转用 strconv，检查 error']},
 ]},
 'q-9f26803641ccda2e':{title:'map 的 key 有什么要求',beats:[
  {say:'map 查找时要比较 key 是否相等，所以 key 的类型必须是“可比较的”，能用 == 判断。',add:[A('m','🗂️','map[K]V',320,60,{kind:'item',tone:'primary'})]},
  {say:'可以：数字、字符串、布尔、指针、channel、接口，以及只由这些组成的数组和结构体。',add:[A('ok','✅','int · string · 指针 · 结构体…',150,190,{kind:'tag',tone:'ok'})]},
  {say:'不行：切片、map、函数，以及包含它们的结构体，编译直接报错。',add:[A('no','🚫','slice · map · func',490,190,{kind:'tag',tone:'bad'})]},
  {say:'接口作 key 时，如果里面装的是切片这类不可比较的值，运行时才会 panic。浮点数 NaN 作 key 永远查不到。需要多字段组合时，用结构体当 key 很方便。',add:[A('pit','⚠️','接口里装切片 → 运行时 panic',320,310,{kind:'tag',tone:'warm'})]},
  {say:'记住 key 的要求。',memo:['key 必须可比较','切片、map、函数不能作 key']},
 ]},
 'q-6c902cd1f29e0d6b':{title:'可变参数函数',beats:[
  {say:'func Sum(nums ...int) int：参数前加 ...，调用时可以传任意个 int，Sum()、Sum(1, 2, 3) 都行。',add:[A('fn','⚙️','Sum(nums ...int)',320,60,{kind:'item',tone:'primary'})]},
  {say:'在函数内部，nums 就是一个 []int 切片，可以 range 遍历。',add:[A('in','🧺','函数内：[]int',150,190,{kind:'tag'})]},
  {say:'已经有一个切片 s，要展开传入：Sum(s...)。注意这时函数拿到的是同一个底层数组，修改元素会影响调用方。',add:[A('spread','🔓','Sum(s...) 共享底层数组',490,190,{kind:'tag',tone:'warm'})]},
  {say:'可变参数只能放在参数列表最后，而且只能有一个。fmt.Println(a ...any) 就是最常见的例子。',add:[A('rule','📏','只能放最后、只能一个',320,310,{kind:'tag',tone:'ok'})]},
  {say:'记住可变参数。',memo:['...T 在函数内是 []T','s... 展开切片，只能在最后']},
 ]},
 'q-bf5fd01563f1e2b5':{title:'传值还是传指针',beats:[
  {say:'Go 只有值传递：传参时总是复制一份。传结构体复制整个结构体，传指针复制一个地址。',add:[A('val','📋','传值：复制整个结构体',150,90,{kind:'item'}),A('ptr','👉','传指针：复制地址',490,90,{kind:'item',tone:'primary'})]},
  {say:'需要在函数里修改调用方的数据：传指针。方法要修改接收者，用指针接收者。',add:[A('mod','✍️','要修改 → 指针',490,220,{kind:'tag',tone:'ok'})]},
  {say:'结构体很大、复制成本高时也传指针。小结构体、只读访问传值更简单，还减少逃逸和 GC 压力。',add:[A('small','🪶','小且只读 → 值',150,220,{kind:'tag',tone:'ok'})]},
  {say:'切片、map、channel 本身就带指针，直接传值即可修改元素；但切片 append 后的新长度不会传回调用方，要返回新切片。一个类型的方法接收者最好统一。',add:[A('ref','🔗','切片 / map 传值也共享数据',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住选择原则。',memo:['要修改或很大：传指针','小且只读：传值；接收者保持一致']},
 ]},
};
