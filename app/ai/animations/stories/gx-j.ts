import {A,type Story} from '../story';

// Go 面试题动画（性能优化二）：克隆切片、删除元素、值复制成本、零拷贝转换、JSON 性能、接口性能。
export const gxJ:Record<string,Story>={
 'q-03de90c85069fa3d':{title:'最高效地克隆一个切片',beats:[
  {say:'b := a 不是克隆：两个切片共享同一个底层数组，改 b[0] 会影响 a。',add:[A('a','🪟','a',150,90,{kind:'item'}),A('b','🪟','b := a',490,90,{kind:'item',tone:'bad'}),A('arr','🗄️','同一个底层数组',320,200,{kind:'tag',tone:'warm'})],send:[{from:'a',to:'arr'},{from:'b',to:'arr'}]},
  {say:'推荐：Go 1.21 起用 slices.Clone(a)，一次分配、一次复制，语义清楚。',drop:['arr'],add:[A('clone','✅','slices.Clone(a)',320,200,{kind:'tag',tone:'ok'})],tone:{b:'ok'}},
  {say:'等价写法：append([]T(nil), a...)，或 make 一个同样长度的切片再 copy。只用 make 加 append 逐个追加会更慢。',add:[A('alt','🔁','make + copy · append(nil, a...)',320,300,{kind:'tag'})]},
  {say:'注意这只是浅拷贝：元素如果是指针或包含切片、map，内部数据仍然共享。nil 切片克隆后仍是 nil。',bubble:{who:'clone',text:'只复制一层'}},
  {say:'记住克隆方法。',memo:['赋值只共享，不是克隆','slices.Clone 一次分配复制，浅拷贝']},
 ]},
 'q-ce9139e2ff585c12':{title:'高效删除切片里的元素',beats:[
  {say:'删除下标 i 的元素，保持顺序：s = append(s[:i], s[i+1:]...)，后面的元素整体前移，O(n)。Go 1.21 起可用 slices.Delete(s, i, i+1)。',add:[A('ord','➡️','保序删除：前移 O(n)',150,90,{kind:'item',tone:'primary'})]},
  {say:'不在乎顺序时更快：把最后一个元素搬到位置 i，再把长度减一，O(1)。',add:[A('swap','🔄','不保序：末尾补位 O(1)',490,90,{kind:'item',tone:'ok'})]},
  {say:'按条件批量删除：用一个写指针原地过滤，只遍历一次，比循环里多次删除快得多；或者用 slices.DeleteFunc。',add:[A('filter','🧹','原地过滤 · DeleteFunc',150,230,{kind:'tag',tone:'ok'})]},
  {say:'元素是指针时，被移出的尾部还引用着对象，GC 回收不了。新版 slices.Delete 会把尾部清零；自己写时要手动置为 nil 或用 clear。',add:[A('leak','⚠️','尾部置零，防止滞留',490,230,{kind:'tag',tone:'warm'})]},
  {say:'记住删除技巧。',memo:['保序 append / slices.Delete','不保序末尾补位，批量用原地过滤']},
 ]},
 'q-937a6c30659ced44':{title:'降低值复制的成本',beats:[
  {say:'一个 2KB 的大结构体，用 for _, v := range items 遍历：每一轮都把整个结构体复制给 v。',add:[A('big','🧱','结构体 2KB',150,90,{kind:'item',tone:'warm'}),A('loop','🔁','range 每轮复制一次',490,90,{kind:'item',tone:'bad'})],send:[{from:'big',to:'loop',text:'复制'}]},
  {say:'改成 for i := range items，用 items[i] 访问，或者存成 []*Item，就不再复制。',add:[A('idx','✅','用下标或存指针',490,220,{kind:'tag',tone:'ok'})],tone:{loop:'ok'}},
  {say:'函数参数和方法接收者也一样：大结构体用指针传递；map[string]BigStruct 每次读取都复制，可以存指针。',add:[A('ptr','👉','大对象传指针',150,220,{kind:'tag',tone:'ok'})]},
  {say:'但不要全部改成指针：小结构体传值更快，还能减少逃逸和 GC 压力。用 benchmark 和 profile 确认收益。',add:[A('bal','⚖️','小对象传值，以测量为准',320,320,{kind:'tag'})]},
  {say:'记住要点。',memo:['大结构体 range 用下标','大对象传指针，小对象传值']},
 ]},
 'q-b346976a227bc561':{title:'string 和 []byte 的零拷贝转换',beats:[
  {say:'普通转换 []byte(s) 和 string(b) 都会分配新内存并复制，因为 string 是只读的，必须保证不会被修改。',add:[A('s','🔤','string',150,90,{kind:'item',tone:'primary'}),A('b','🧱','[]byte',490,90,{kind:'item'})],send:[{from:'s',to:'b',text:'复制'}]},
  {say:'Go 1.20 起可以用 unsafe 零拷贝：unsafe.String(unsafe.SliceData(b), len(b)) 把 []byte 变成 string；unsafe.Slice(unsafe.StringData(s), len(s)) 反过来。',add:[A('unsafe','⚡','unsafe.String / unsafe.Slice',320,210,{kind:'tag',tone:'warm'})]},
  {say:'代价：转换后两者共享同一块内存。之后再修改那个 []byte，字符串也跟着变；修改从字符串转出来的字节是未定义行为，可能直接崩溃。',add:[A('risk','💥','共享内存，修改即出错',320,300,{kind:'tag',tone:'bad'})]},
  {say:'编译器本身已经在很多场景省掉了复制，比如 m[string(b)] 查 map、string(b) == "x" 比较。只在 profile 证明是热点、且能保证只读时才用 unsafe。',bubble:{who:'unsafe',text:'先 profile 再说'}},
  {say:'记住零拷贝转换。',memo:['普通转换会复制','unsafe 零拷贝要保证只读，慎用']},
 ]},
 'q-fd7a0f3562629bc1':{title:'优化 JSON 序列化的性能',beats:[
  {say:'接口每次返回一个大列表，encoding/json 序列化占了 CPU 的三成，它靠反射，分配也多。',add:[A('json','🐢','encoding/json：反射',320,60,{kind:'item',tone:'bad'})]},
  {say:'先减少要序列化的内容：只返回需要的字段、分页、去掉冗余嵌套。数据少了比任何库都快。',add:[A('less','✂️','少返回数据',150,180,{kind:'tag',tone:'ok'})]},
  {say:'流式处理：json.NewEncoder(w).Encode(v) 直接写到响应，json.NewDecoder 边读边解析，避免先在内存里拼出整段字节。复用 bytes.Buffer 减少分配。',add:[A('stream','🌊','Encoder / Decoder 流式',490,180,{kind:'tag',tone:'ok'})]},
  {say:'还不够再换实现：sonic、go-json 等更快的库，或 easyjson 生成代码避免反射；Go 新版本的 encoding/json/v2 也在改进性能。替换前要验证兼容性。',add:[A('lib','⚡','sonic · easyjson · json/v2',320,300,{kind:'tag',tone:'primary'})],tone:{json:'ok'}},
  {say:'记住优化顺序。',memo:['先减少数据，再流式处理','最后换库或代码生成，验证兼容']},
 ]},
 'q-a2c3d84afb7585b5':{title:'优化一个慢接口',beats:[
  {say:'订单列表接口 P99 2 秒。先测量：链路追踪显示数据库 1.2 秒、下游用户服务 500 毫秒、序列化 200 毫秒。',add:[A('api','🐢','接口 P99 2s',320,60,{kind:'item',tone:'bad'})]},
  {say:'数据库：加合适的索引、避免 N+1 查询（一次批量查出所有用户）、只查需要的列、用游标分页。',add:[A('db','🗄️','索引 · 批量 · 游标分页',150,180,{kind:'tag',tone:'ok'})]},
  {say:'下游：互不依赖的调用用 errgroup 并发执行，加缓存、超时和降级；热点数据放 Redis，用 singleflight 防止击穿。',add:[A('dep','🔀','并发调用 · 缓存',490,180,{kind:'tag',tone:'ok'})]},
  {say:'代码层：pprof 找热点、减少分配、复用连接；最后压测验证 P99 和错误率，并加上监控告警。结果 P99 降到 300 毫秒。',add:[A('code','🔥','pprof · 压测验证',320,300,{kind:'tag',tone:'primary'})],tone:{api:'ok'},sub:{api:'P99 300ms'}},
  {say:'记住优化思路。',memo:['先测量，定位最慢的环节','数据库、并发、缓存、代码逐层优化并验证']},
 ]},
};
