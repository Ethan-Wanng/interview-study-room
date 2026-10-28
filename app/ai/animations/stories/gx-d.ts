import {A,type Story} from '../story';

// Go 面试题动画（基础四）：接口比较、禁止比较、切片比较、空结构体、错误处理、深度相等、判断方法、for range。
export const gxD:Record<string,Story>={
 'q-df0cb4165226cb87':{title:'两个接口值能比较吗',beats:[
  {say:'接口值内部有两部分：动态类型和动态值。比较两个接口，要类型相同并且值相等，才算相等。',add:[A('a','🔌','接口 a：(int, 1)',150,90,{kind:'item',tone:'primary'}),A('b','🔌','接口 b：(int, 1)',490,90,{kind:'item',tone:'primary'})],bubble:{who:'a',text:'类型和值都一样'}},
  {say:'一个装 int(1)、一个装 int64(1)：类型不同，结果是 false。',add:[A('diff','⚖️','int ≠ int64',320,200,{kind:'tag',tone:'warm'})]},
  {say:'如果动态类型是切片、map、函数这类不可比较的类型，编译能通过，但运行时比较会 panic。',add:[A('panic','💥','装着切片 → 运行时 panic',150,300,{kind:'tag',tone:'bad'})]},
  {say:'接口和 nil 比较时也要小心：只有类型和值都为空的接口才等于 nil。',add:[A('nil','🪤','装 nil 指针 ≠ nil',490,300,{kind:'tag',tone:'warm'})]},
  {say:'记住规则。',memo:['类型相同且值相等才相等','装不可比较类型时运行时 panic']},
 ]},
 'q-bfc5773e0464fe90':{title:'让结构体不能被 == 比较',beats:[
  {say:'结构体的所有字段都可比较时，结构体就能用 == 比较。但有的类型比较没有意义，比如包含锁或缓存的对象。',add:[A('s','📦','type Key struct { … }',320,70,{kind:'item',tone:'primary'})]},
  {say:'技巧：加一个不占空间的字段 _ [0]func()。函数类型不可比较，于是整个结构体都不能 == 比较，也不能作 map 的 key。',add:[A('trick','🧩','_ [0]func()',320,190,{kind:'tag',tone:'ok'})],sub:{s:'不能 =='}},
  {say:'长度为 0 的数组不占内存，结构体大小不变。标准库也用过类似的写法。',add:[A('size','📏','大小不变',150,300,{kind:'tag'})]},
  {say:'放在结构体开头而不是最后：最后一个字段是零大小时，编译器可能会额外填充，让结构体变大。',add:[A('pos','⬆️','放在第一个字段',490,300,{kind:'tag',tone:'warm'})]},
  {say:'记住技巧。',memo:['加 _ [0]func() 禁止比较','零大小，放在第一个字段']},
 ]},
 'q-0a207eae6b8d2b05':{title:'两个切片怎么比较',beats:[
  {say:'a == b 直接编译报错：切片只能和 nil 比较，因为它是对底层数组的引用，“相等”有歧义。',add:[A('a','🪟','切片 a',150,90,{kind:'item'}),A('b','🪟','切片 b',490,90,{kind:'item'}),A('eq','🚫','a == b 编译报错',320,90,{kind:'tag',tone:'bad'})]},
  {say:'Go 1.21 起用 slices.Equal(a, b)：长度相同且每个元素都相等就返回 true，要求元素可比较。',add:[A('se','✅','slices.Equal',150,230,{kind:'tag',tone:'ok'})]},
  {say:'[]byte 用 bytes.Equal，最快；元素是结构体或需要自定义规则时用 slices.EqualFunc。',add:[A('be','⚡','bytes.Equal · EqualFunc',490,230,{kind:'tag',tone:'ok'})]},
  {say:'reflect.DeepEqual 也能比，但更慢，而且 nil 切片和空切片它认为不相等；slices.Equal 认为它们相等。',add:[A('deep','🐢','DeepEqual：nil ≠ []',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住比较方式。',memo:['切片只能和 nil 用 ==','slices.Equal / bytes.Equal 比内容']},
 ]},
 'q-a2c63033182fa118':{title:'空结构体 struct{} 有什么用',beats:[
  {say:'struct{} 不占任何内存，unsafe.Sizeof(struct{}{}) 是 0。',add:[A('es','🫥','struct{}：0 字节',320,60,{kind:'item',tone:'primary'})]},
  {say:'用途一：实现集合。map[string]struct{} 只关心 key 存不存在，value 不浪费空间。',add:[A('set','🧺','map[K]struct{}',150,180,{kind:'tag',tone:'ok'})]},
  {say:'用途二：只发信号的 channel。chan struct{} 表示“发生了一件事”，比如 done 通知、信号量的号牌。',add:[A('ch','📣','chan struct{}',490,180,{kind:'tag',tone:'ok'})]},
  {say:'用途三：只需要方法、不需要数据的类型，比如实现某个接口的空类型。',add:[A('m','⚙️','只有方法的类型',320,290,{kind:'tag'})]},
  {say:'记住空结构体。',memo:['不占内存','集合、信号 channel、只有方法的类型']},
 ]},
 'q-7b293576983caa64':{title:'优雅地处理错误',beats:[
  {say:'Go 的错误是普通的返回值。每次调用后检查 if err != nil，就地处理或者往上返回。',add:[A('call','📞','v, err := load()',320,60,{kind:'item',tone:'primary'})]},
  {say:'往上返回时加上下文：fmt.Errorf("加载配置 %s: %w", path, err)。%w 包装原错误，日志里能看到完整的链路。',add:[A('wrap','🎁','%w 包装 + 上下文',150,180,{kind:'tag',tone:'ok'})]},
  {say:'判断是不是某种错误用 errors.Is(err, ErrNotFound)，取出具体类型用 errors.As(err, &target)，不要比较错误字符串。',add:[A('is','🔍','errors.Is / As',490,180,{kind:'tag',tone:'ok'})]},
  {say:'同一个错误只处理一次：要么记日志，要么往上返回，别每层都打印一遍。panic 只用于真正不可恢复的程序错误；多个错误可以用 errors.Join 合并。',add:[A('once','📏','只处理一次，少用 panic',320,300,{kind:'tag',tone:'warm'})]},
  {say:'记住错误处理。',memo:['%w 包装并加上下文','errors.Is / As 判断，只处理一次']},
 ]},
 'q-e6ed7b3ed9129f29':{title:'判断两个对象完全相同',beats:[
  {say:'两个结构体字段都可比较时，直接用 ==：所有字段都相等才相等。',add:[A('a','📦','u1',150,90,{kind:'item'}),A('b','📦','u2',490,90,{kind:'item'}),A('eq','🟰','u1 == u2',320,90,{kind:'tag',tone:'ok'})]},
  {say:'如果字段里有切片、map，== 编译不过。可以用 reflect.DeepEqual 递归比较所有内容。',add:[A('deep','🔬','reflect.DeepEqual',320,210,{kind:'tag',tone:'primary'})]},
  {say:'DeepEqual 的坑：nil 切片和空切片不相等，NaN 不等于自己，未导出字段也会被比较，而且比较慢。',add:[A('pit','🪤','nil ≠ []，NaN ≠ NaN',150,310,{kind:'tag',tone:'warm'})]},
  {say:'业务代码更推荐写明确的 Equal 方法，只比较有意义的字段；测试里可以用 go-cmp 的 cmp.Diff 打印差异。',add:[A('eqm','✍️','自定义 Equal · cmp.Diff',490,310,{kind:'tag',tone:'ok'})]},
  {say:'记住比较方法。',memo:['可比较字段直接 ==','复杂结构 DeepEqual 或自定义 Equal']},
 ]},
 'q-949f3e5850735e7e':{title:'判断一个值有没有某个方法',beats:[
  {say:'想知道一个值是否有 Close() 方法。最 Go 的做法：定义一个只含这个方法的接口，用类型断言判断。',add:[A('v','📦','任意值 v',150,90,{kind:'item',tone:'primary'}),A('iface','🔌','interface{ Close() error }',490,90,{kind:'item'})]},
  {say:'c, ok := v.(interface{ Close() error })，ok 为 true 说明它实现了这个方法，可以安全调用。',send:[{from:'v',to:'iface',text:'类型断言',tone:'ok'}],add:[A('ok','✅','ok == true → 可以调用',490,220,{kind:'tag',tone:'ok'})]},
  {say:'标准库大量这样用，比如 io.Copy 会检查对方是否实现了 WriterTo，有就走更快的路径。',add:[A('std','📚','io.Copy 检查 WriterTo',150,220,{kind:'tag'})]},
  {say:'也可以用反射 reflect.ValueOf(v).MethodByName("Close")，但更慢、没有类型检查，只在框架代码里用。注意指针接收者的方法只在指针的方法集里。',add:[A('rf','🐢','反射：慢，少用',320,320,{kind:'tag',tone:'warm'})]},
  {say:'记住判断方式。',memo:['用小接口 + 类型断言','反射作兜底，注意方法集']},
 ]},
 'q-bf9c8ac5d385e3ff':{title:'for range 的几个坑',beats:[
  {say:'坑一：for _, v := range users 中，v 是元素的副本。改 v.Age 不会改到切片里的元素，要用 users[i].Age。',add:[A('copy','📋','v 是副本',150,80,{kind:'item',tone:'bad'})]},
  {say:'坑二：取 &v 存起来。Go 1.22 之前整个循环只有一个 v，存的地址全都一样；1.22 起每轮是新变量，但 &v 仍然不是元素的地址。',add:[A('addr','📍','&v ≠ &users[i]',490,80,{kind:'item',tone:'warm'})]},
  {say:'坑三：range 一个数组会先复制整个数组；range 切片时，循环次数在开始时就定了，循环中 append 不会让它多跑。',add:[A('eval','🔢','开始时就确定次数',150,230,{kind:'tag'})]},
  {say:'坑四：range 字符串按 rune 遍历，下标是字节偏移；range map 顺序随机。Go 1.22 还支持 range 整数：for i := range 10。',add:[A('str','🔤','字符串按 rune，map 无序',490,230,{kind:'tag',tone:'primary'})]},
  {say:'记住这些坑。',memo:['v 是副本，改元素用下标','1.22 前循环变量共享；字符串按 rune']},
 ]},
};
