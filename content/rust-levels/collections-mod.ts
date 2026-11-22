import type {AiLevel} from '../journey';

// 第 7 关：常用集合与错误处理。
export const rustCollections:AiLevel={id:'rust-collections',title:'常用集合与错误处理',summary:'Vec、String UTF-8 细节与 HashMap，以及 panic!、Result<T, E>、? 运算符与自定义错误',lessons:[
 {title:'Vec<T>：可以变长的动态数组',body:'第 2 关学过的数组 [T; N] 长度固定，存在栈上；实际程序里经常不知道一开始有多少条数据，这时就用标准库里的 Vec<T>（动态数组，读作 vector）。Vec 把所有元素连续放在堆上，运行时可以随时增长或缩短，但同一个 Vec 里的元素必须是同一种类型 T。\n常见用法：\n一、创建：Vec::new() 建一个空列表（如果后面没有马上往里放值，要写明类型如 Vec<i32>）；带初始值时直接用 vec![1, 2, 3] 宏；如果提前知道大概会存多少元素，用 Vec::with_capacity(n) 一次性申请好容量，减少中途反复扩容；\n二、增删：v.push(值) 在末尾追加一个元素，v.pop() 弹出末尾元素并返回 Option<T>（空列表返回 None）；\n三、访问元素有两种方式：&v[i] 直接按索引取，越界会立刻 panic；v.get(i) 返回 Option<&T>，越界返回 None，更安全；\n四、遍历与修改：for x in &v 只读借用每个元素；for x in &mut v { *x += 1; } 可变借用并原地改值，其中 *x 是“解引用”，用来顺着引用拿到并修改里面的值；\n五、扩容原理：Vec 在栈上存指针、长度 len 和容量 capacity。push 超过容量时，会在堆上申请一块更大的连续空间（通常翻倍），把旧元素搬过去并释放旧空间。提前用 with_capacity 可以省掉这几次搬家。',code:`let mut v: Vec<i32> = Vec::with_capacity(4);
v.push(10);
v.push(20);
let mut scores = vec![60, 80, 95];
let first = &scores[0];
let maybe = scores.get(5);
println!("first = {first}, maybe = {:?}", maybe);
for s in &mut scores {
    *s += 5;
}
let last = scores.pop();
println!("v = {:?}, scores = {:?}, last = {:?}", v, scores, last);`,explain:[{at:'let mut v: Vec<i32> = Vec::with_capacity(4);',text:'预先申请能容纳 4 个 i32 的堆内存，此时 len 是 0、capacity 是 4，后面连续 push 4 次都不必扩容搬家。'},{at:'v.push(10);',to:'v.push(20);',text:'往末尾依次追加 10 和 20；因为修改了列表，变量 v 必须声明为 mut。'},{at:'let mut scores = vec![60, 80, 95];',text:'vec! 宏根据元素自动推断类型为 Vec<i32>，并一次装入三个初始值。'},{at:'let first = &scores[0];',text:'用索引直接借用第 0 个元素；如果写成 &scores[5] 越界，程序会直接 panic。'},{at:'let maybe = scores.get(5);',text:'get 安全访问：下标 5 越界，不崩溃而是返回 None（类型为 Option<&i32>）。'},{at:'println!("first = {first}, maybe = {:?}", maybe);',text:'打印 first = 60, maybe = None。注意这里用完 first 后，不可变借用就结束了。'},{at:'for s in &mut scores {',to:'*s += 5;',text:'可变遍历每个元素：s 的类型是 &mut i32，用 *s 解引用后把每个成绩都加 5。'},{at:'let last = scores.pop();',text:'弹出末尾元素 100，返回值是 Some(100)；若列表为空则返回 None。'},{at:'println!("v = {:?}, scores = {:?}, last = {:?}", v, scores, last);',text:'用调试格式 {:?} 打印两个 Vec 和刚弹出的 Option 值。'}]},
 {title:'借用规则在 Vec 上的体现：迭代时不能修改',body:'把第 3 关的借用规则放到 Vec 上，会遇到一个经典的编译报错：手里还拿着列表里某个元素的不可变引用，同时又想调用 v.push(...) 往列表里塞新元素。\n新手可能会疑惑：“我只是拿了第 0 个元素的引用，push 改的是末尾，互不影响吧？”其实大有影响：Vec 的元素在堆上是连续存放的。如果 push 正好触发扩容，Vec 就要在堆上另找一块更大的空间，把所有元素搬走，再释放旧内存——那时 first 还指着旧内存，立刻变成悬垂引用！\n同样道理，在 for x in &v 的循环体里也不能调用 v.push(...) 或 v.clear()，因为整个循环期间 v 一直被不可变借用着。\n解决思路很直接：要么先用完引用（或对 Copy 类型直接复制值 let first = v[0];）再修改 Vec；要么遍历时把新元素先收集到另一个 Vec 里，循环结束后再合并。',code:`let mut v = vec![1, 2, 3];
let first = &v[0];
v.push(4);
println!("第一个元素：{first}");`,explain:[{at:'let mut v = vec![1, 2, 3];',text:'创建一个可变 Vec，包含 3 个整数。'},{at:'let first = &v[0];',text:'对 v 建立一个不可变借用，first 指向第 0 个元素的内存地址。'},{at:'v.push(4);',text:'编译报错：push 需要 &mut v，但下面还要用到 first，此时不可变借用仍有效，借用检查器会阻止扩容可能导致的悬垂引用。'},{at:'println!("第一个元素：{first}");',text:'因为这里还使用了 first，所以不可变借用一直延续到这一行；如果把这行移到 v.push(4) 之前，就能正常编译。'}]},
 {title:'String 的 UTF-8 细节：为什么不能用 s[0] 索引',body:'第 3 关已经知道 String 存在堆上、用 UTF-8 编码保存。其实 String 底层就是包了一层 Vec<u8>，并且保证里面的字节始终是合法的 UTF-8。\n但 Rust 明确禁止写 s[0] 这样按整数下标取字符，原因有三点：\n一、UTF-8 是变长编码：英文字母占 1 字节，常见汉字占 3 字节，表情符号占 4 字节。如果按字节下标取，"你好"[0] 只能拿到第 1 个字节 228，既不是“你”也不是合法文字；\n二、如果改成按第 k 个字符取，每次都必须从头扫描数过去，耗时和字符串长度成正比（O(n)），违背了大家对索引瞬间取值（O(1)）的预期；\n三、在 Unicode 里，“原始字节（bytes）”“Unicode 标量值（chars）”和人眼看到的“完整字形（比如带音调符号的字母）”本身是不同层次，干脆让你明确说出要按哪一层遍历。\n因此：\n一、按字符遍历用 s.chars()，数字符个数用 s.chars().count()；\n二、按字节遍历用 s.bytes()，看字节长度用 s.len()；\n三、拼接字符串推荐 s.push_str("文字")、s.push(\'!\')（追加单个 char），或者用 format!("{a}-{b}") 拼出新 String——format! 不会拿走任何变量的所有权，比 s1 + &s2（会移走 s1 的所有权）更省心。',code:`let mut msg = String::from("你好");
msg.push_str("Rust");
msg.push('!');
println!("字节数：{}，字符数：{}", msg.len(), msg.chars().count());
for c in msg.chars() {
    print!("{c} ");
}
for b in "中".bytes() {
    print!("{b} ");
}
let tag = format!("[{msg}]");
println!();
println!("{tag}，原来的 msg 还能用：{msg}");`,explain:[{at:'let mut msg = String::from("你好");',text:'创建堆上的可变 String，“你好”占 6 个字节、2 个字符。'},{at:'msg.push_str("Rust");',text:'在末尾追加字符串切片 "Rust"（4 字节），不会拿走字面量的所有权。'},{at:'msg.push(\'!\');',text:'push 用来追加单个 char 字符，单引号表示字符。此时总共 11 字节、7 个字符。'},{at:'println!("字节数：{}，字符数：{}", msg.len(), msg.chars().count());',text:'len() 返回 UTF-8 字节数 11，chars().count() 逐个统计 Unicode 字符数为 7。'},{at:'for c in msg.chars() {',to:'print!("{c} ");',text:'按字符逐个遍历，依次得到 \'你\'、\'好\'、\'R\'、\'u\'、\'s\'、\'t\'、\'!\'。'},{at:'for b in "中".bytes() {',to:'print!("{b} ");',text:'按原始字节遍历，“中”在 UTF-8 里由 3 个字节组成（228、184、173）。'},{at:'let tag = format!("[{msg}]");',text:'format! 像 println! 一样格式化并返回新的 String，只借用 msg，不转移它的所有权。'},{at:'println!();',to:'println!("{tag}，原来的 msg 还能用：{msg}");',text:'先换行，再打印拼接后的 tag，同时证明原来的 msg 依然有效。'}]},
 {title:'HashMap<K, V> 与 HashSet<T>',body:'需要按“键 → 值”快速查找（比如用户名查积分、单词查出现次数）时，用 HashMap<K, V>。它不在默认预导入里，使用前要写 use std::collections::HashMap;。\n核心要点：\n一、所有权：调用 map.insert(k, v) 时，像 String 这样的非 Copy 类型会被移进 HashMap，由它拥有；i32 这类 Copy 类型会自动复制。如果键已经存在，insert 会用新值覆盖旧值；\n二、查询：map.get(&key) 接收键的引用，返回 Option<&V>（找到是 Some(&v)，找不到是 None）。如果值类型是 Copy，常连写成 map.get(&key).copied().unwrap_or(0) 直接拿到值或默认值；\n三、entry(...).or_insert(...)：先查这个键在不在，不在就插入默认值；无论原本在不在，都返回指向该值的可变引用 &mut V。词频统计写起来只需两行；\n四、遍历顺序不确定：为了防御哈希碰撞攻击，Rust 默认使用带随机种子的哈希算法，所以直接遍历 HashMap 每次顺序可能不同。需要固定顺序时，把条目放进 Vec 排好序再输出；\n五、HashSet<T>：同在 std::collections 里，相当于只存键、不存值的集合，用来去重和快速判断某元素是否存在（insert、contains、len）。',code:`use std::collections::{HashMap, HashSet};

let mut scores = HashMap::new();
scores.insert(String::from("小明"), 90);
scores.insert(String::from("小红"), 85);
let ming = scores.get("小明").copied().unwrap_or(0);
let count = scores.entry(String::from("小刚")).or_insert(60);
*count += 10;

let mut tags = HashSet::new();
tags.insert("rust");
let added_again = tags.insert("rust");
println!("小明：{ming}，小刚：{:?}，重复插入：{added_again}，去重后：{}", scores.get("小刚"), tags.len());`,explain:[{at:'use std::collections::{HashMap, HashSet};',text:'从标准库的 collections 模块引入 HashMap 和 HashSet（大括号可以一次引入多个项）。'},{at:'let mut scores = HashMap::new();',text:'创建空的哈希表，键值类型由后面的 insert 自动推断为 HashMap<String, i32>。'},{at:'scores.insert(String::from("小明"), 90);',to:'scores.insert(String::from("小红"), 85);',text:'插入两组键值对；String 键的所有权被移进 scores。'},{at:'let ming = scores.get("小明").copied().unwrap_or(0);',text:'get 返回 Option<&i32>；copied() 把 Option<&i32> 转成 Option<i32>；unwrap_or(0) 在查不到时返回 0。'},{at:'let count = scores.entry(String::from("小刚")).or_insert(60);',text:'“小刚”原本不在表里，or_insert(60) 把它插进去并返回指向 60 的可变引用 &mut i32。'},{at:'*count += 10;',text:'通过解引用原地把“小刚”的分数改成 70。'},{at:'let mut tags = HashSet::new();',to:'let added_again = tags.insert("rust");',text:'HashSet 自动去重：第一次插入 "rust" 成功，第二次插入返回 false 且不会重复保存，所以 tags.len() 为 1。'},{at:'println!("小明：{ming}，小刚：{:?}，重复插入：{added_again}，去重后：{}", scores.get("小刚"), tags.len());',text:'打印查询结果、重复插入的返回值 false 以及去重后的标签个数 1。'}]},
 {title:'动手试试：Vec、String 遍历与 HashMap 词频统计',body:'把前面学的三种集合合在一起练一遍：先用 Vec 做可变遍历和安全访问，再体验 String 的 UTF-8 字节数与字符数差异，最后用 HashMap 的 entry 统计词频、用 HashSet 统计不重复词数。\n注意 HashMap 的遍历顺序是不确定的，所以我们把键值对收集到 Vec 里调用 sort() 排序后再打印，这样每次运行输出都完全一致。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 nums.get(9) 改成 &nums[9]，再运行一次，看看越界时程序 panic 打印了什么信息；看完改回来。','把 sentence 末尾再加上一个 " rust"，再运行一次，观察不同单词数和 rust 的计数变化。'],expect:'列表：[15, 25, 35, 45]，第 2 个：Some(25)，越界：None\n你好Rust：10 字节，6 个字符\n逐字拆分：你|好|R|u|s|t|\n不同单词数：5\n  and: 1\n  fast: 1\n  is: 2\n  rust: 2\n  safe: 1'},code:`use std::collections::{HashMap, HashSet};

fn main() {
    let mut nums = vec![10, 20, 30];
    nums.push(40);
    for n in &mut nums {
        *n += 5;
    }
    println!("列表：{:?}，第 2 个：{:?}，越界：{:?}", nums, nums.get(1), nums.get(9));

    let word = String::from("你好Rust");
    println!("{}：{} 字节，{} 个字符", word, word.len(), word.chars().count());
    let mut chars_out = String::new();
    for c in word.chars() {
        chars_out.push(c);
        chars_out.push('|');
    }
    println!("逐字拆分：{chars_out}");

    let sentence = "rust is fast and rust is safe";
    let mut counts: HashMap<&str, i32> = HashMap::new();
    let mut unique: HashSet<&str> = HashSet::new();
    for w in sentence.split_whitespace() {
        let count = counts.entry(w).or_insert(0);
        *count += 1;
        unique.insert(w);
    }

    let mut pairs: Vec<(&str, i32)> = Vec::new();
    for (&k, &v) in &counts {
        pairs.push((k, v));
    }
    pairs.sort();
    println!("不同单词数：{}", unique.len());
    for (k, v) in &pairs {
        println!("  {k}: {v}");
    }
}`,explain:[{at:'use std::collections::{HashMap, HashSet};',text:'引入标准库的哈希表和哈希集合。'},{at:'fn main() {',text:'程序入口。'},{at:'let mut nums = vec![10, 20, 30];',to:'nums.push(40);',text:'创建 Vec 并在末尾追加 40，列表变成 [10, 20, 30, 40]。'},{at:'for n in &mut nums {',to:'*n += 5;',text:'可变遍历，把每个元素原地加 5，变成 [15, 25, 35, 45]。'},{at:'println!("列表：{:?}，第 2 个：{:?}，越界：{:?}", nums, nums.get(1), nums.get(9));',text:'get(1) 返回 Some(25)，get(9) 越界但安全返回 None。'},{at:'let word = String::from("你好Rust");',text:'两个汉字各占 3 字节、四个英文字母各占 1 字节，共 10 字节、6 个字符。'},{at:'println!("{}：{} 字节，{} 个字符", word, word.len(), word.chars().count());',text:'对照打印字节数 10 和字符数 6。'},{at:'let mut chars_out = String::new();',to:'println!("逐字拆分：{chars_out}");',text:'用 chars() 按字符遍历，把每个字符和竖线依次 push 进新字符串并打印。'},{at:'let sentence = "rust is fast and rust is safe";',text:'待统计的英文句子，共 7 个词，其中 rust 和 is 各出现两次。'},{at:'let mut counts: HashMap<&str, i32> = HashMap::new();',to:'let mut unique: HashSet<&str> = HashSet::new();',text:'counts 记录每个单词的频次，unique 顺手收集不重复的单词。'},{at:'for w in sentence.split_whitespace() {',to:'unique.insert(w);',text:'split_whitespace() 按空白拆词；entry(w).or_insert(0) 不存在就补 0 并返回可变引用，再通过 *count += 1 累加；同时把词放入 HashSet 去重。'},{at:'let mut pairs: Vec<(&str, i32)> = Vec::new();',to:'pairs.sort();',text:'把哈希表的条目放进 Vec 并调用 sort() 按字典序排序，确保输出顺序确定。'},{at:'println!("不同单词数：{}", unique.len());',to:'println!("  {k}: {v}");',text:'先打印不重复单词总数 5，再按字母序依次打印每个词的出现次数。'}]},
 {title:'不可恢复错误 panic! 与可恢复错误 Result<T, E>',body:'很多语言靠“抛异常”处理错误，常常让人搞不清某个函数到底会不会抛错。Rust 没有异常机制，而是把错误明确分成两类：\n一、不可恢复错误：调用 panic!("原因") 宏。程序遇到绝对不该发生的 bug、状态已经损坏时立刻紧急停机，默认会沿调用栈逐层清理内存（展开，unwind）后退出；也可以在 Cargo.toml 里配 panic = "abort" 直接中止以缩小可执行文件体积。数组或 Vec 越界触发的就是 panic；\n二、可恢复错误：让函数返回标准库自带的枚举 Result<T, E>，它只有两个变体：Ok(T) 表示成功并带回结果值，Err(E) 表示失败并带回错误信息。Result 和 Option 一样在预导入里，不用手动 use。\n什么时候该返回 Result，什么时候该用 panic!？\n一、默认首选 Result：文件不存在、网络超时、用户输入格式错误、除数为 0，这些都是预期中可能发生的失败，应把决定权交给调用者（重试、提示用户或采用默认值）；\n二、只在这几种场合用 panic!：写演示示例、写单元测试（断言失败就该停），或者代码内部约定的不变量被打破、继续运行反而会破坏数据时。',code:`fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err(String::from("除数不能为 0"))
    } else {
        Ok(a / b)
    }
}

fn must_non_empty(items: &[i32]) -> i32 {
    if items.is_empty() {
        panic!("内部约定：传入的切片不能为空");
    }
    items[0]
}`,explain:[{at:'fn divide(a: f64, b: f64) -> Result<f64, String> {',text:'返回值是 Result<f64, String>：成功返回 f64 商，失败返回 String 错误说明。'},{at:'if b == 0.0 {',to:'Err(String::from("除数不能为 0"))',text:'除数为 0 属于可预期的输入错误，包装成 Err 返回，不让程序崩溃。'},{at:'} else {',to:'Ok(a / b)',text:'正常相除，把结果包进 Ok 返回。'},{at:'fn must_non_empty(items: &[i32]) -> i32 {',text:'演示不可恢复错误：当函数前置约定被违背时才用 panic!。'},{at:'if items.is_empty() {',to:'panic!("内部约定：传入的切片不能为空");',text:'调用 panic! 宏立即停机并打印具体原因。'},{at:'items[0]',text:'确认非空后安全返回第一个元素。'}]},
 {title:'处理 Result：match、unwrap、expect 与默认值',body:'第 2 关写过 "42".parse().unwrap()，当时说过第 7 关再细讲。拿到一个 Result 后，编译器会提醒你必须处理它，常用方式有五种：\n一、match：最完整，分别匹配 Ok(v) 和 Err(e)，适合根据不同结果执行不同逻辑；\n二、unwrap()：如果是 Ok(v) 就直接取出 v，如果是 Err(e) 就立刻 panic。写练习或测试很顺手，但在正式上线代码里尽量少用，因为崩溃时只有一句默认报错，不好排查；\n三、expect("说明")：和 unwrap() 行为相同，但 panic 时会把你写的说明一起打出来。适合“我确信这里不会失败，因为……”的场景，顺便把假设写进代码；\n四、unwrap_or(默认值)：失败时返回你给好的默认值，不会崩溃；\n五、unwrap_or_else(|e| ...)：失败时才执行那段临时逻辑（一对竖线 |e| 包起来的写法叫闭包，第 10 关会细讲）来动态计算备选值或记日志，成功时完全不执行这段代码，避免白做开销。',code:`let parsed: Result<i32, _> = "42".parse();
match parsed {
    Ok(n) => println!("解析成功：{n}"),
    Err(e) => println!("解析失败：{e}"),
}

let port: u16 = "8080".parse().expect("默认端口字面量应是有效数字");
let retries: u32 = "abc".parse().unwrap_or(3);
let timeout: u32 = "bad".parse().unwrap_or_else(|err| {
    println!("超时配置无效（{err}），改用默认值");
    30
});
println!("port = {port}, retries = {retries}, timeout = {timeout}");`,explain:[{at:'let parsed: Result<i32, _> = "42".parse();',text:'parse() 返回 Result，这里用 _ 让编译器自动推断具体的错误类型（ParseIntError）。'},{at:'match parsed {',to:'Err(e) => println!("解析失败：{e}"),',text:'用 match 穷举 Ok 和 Err 两个分支，分别处理成功和失败。'},{at:'let port: u16 = "8080".parse().expect("默认端口字面量应是有效数字");',text:'expect 比 unwrap 更推荐：万一失败会附带可读说明，一眼看出哪条假设被打破。'},{at:'let retries: u32 = "abc".parse().unwrap_or(3);',text:'"abc" 解析失败，unwrap_or 不崩溃而是直接回退到默认值 3。'},{at:'let timeout: u32 = "bad".parse().unwrap_or_else(|err| {',to:'});',text:'unwrap_or_else 只有在 Err 时才运行闭包，可以顺便打印失败原因 err 并返回备选值 30。'},{at:'println!("port = {port}, retries = {retries}, timeout = {timeout}");',text:'打印最终拿到的三个配置值。'}]},
 {title:'? 运算符：把错误向上传播写成一行',body:'很多函数本身不适合决定“出错后怎么提示用户”，而是应该把错误原样交回给调用者处理，这叫“错误传播”。如果每一步都手写 match { Ok(v) => v, Err(e) => return Err(e) }，代码很快会被样板淹没。\nRust 提供了 ? 运算符，把上面整段 match 浓缩成一个问号：在返回 Result 的表达式末尾加 ?，结果是 Ok(v) 就取出 v 继续往下跑；结果是 Err(e) 就立刻从当前函数提前 return Err(e)！\n两个关键细节：\n一、自动转换错误类型：? 在提前返回 Err 前，会自动调用标准库的 From 转换（第 9 关讲 trait 时会细讲），把子步骤的错误类型转换成当前函数声明的返回错误类型；\n二、使用限制：? 只能用在返回 Result（或 Option）的函数里。普通的 fn main() 没有返回值，直接用 ? 会编译报错；不过 Rust 允许把 main 写成 fn main() -> Result<(), Box<dyn std::error::Error>>，并在末尾返回 Ok(())——其中 Box<dyn std::error::Error> 可以先理解成“能装下任意标准错误的通用错误盒子”（第 9、11 关会细讲）。',code:`use std::error::Error;

fn add_two_nums(a: &str, b: &str) -> Result<i32, std::num::ParseIntError> {
    let x: i32 = a.trim().parse()?;
    let y: i32 = b.trim().parse()?;
    Ok(x + y)
}

fn main() -> Result<(), Box<dyn Error>> {
    let total = add_two_nums(" 12 ", " 30 ")?;
    println!("合计：{total}");
    Ok(())
}`,explain:[{at:'use std::error::Error;',text:'引入标准库的 Error trait，用来搭配 Box<dyn Error> 接住各种标准错误。'},{at:'fn add_two_nums(a: &str, b: &str) -> Result<i32, std::num::ParseIntError> {',text:'函数返回 Result，错误类型与 parse() 一致，因此函数体里可以直接用 ?。'},{at:'let x: i32 = a.trim().parse()?;',to:'let y: i32 = b.trim().parse()?;',text:'任何一次 parse 失败都会立刻提前返回 Err，成功则把解析出的整数赋给 x 和 y。'},{at:'Ok(x + y)',text:'两步都成功时，把相加结果包进 Ok 返回。'},{at:'fn main() -> Result<(), Box<dyn Error>> {',text:'让 main 返回 Result，就能在 main 里直接使用 ?，并且 ParseIntError 会自动转换成 Box<dyn Error>。'},{at:'let total = add_two_nums(" 12 ", " 30 ")?;',text:'调用 add_two_nums 并用 ? 传播错误；如果出错，程序退出并打印错误信息。'},{at:'println!("合计：{total}");',text:'打印 合计：42。'},{at:'Ok(())',text:'正常结束时返回包着空元组 () 的 Ok(())。'}]},
 {title:'动手试试：用 Result 和 ? 写出解析与校验链',body:'写一个小型“用户信息解析链”：把 "姓名:年龄" 拆成两部分，检查姓名非空、年龄是合法数字且不超过 120。拆分、解析、组合分别写成独立小函数，再用 ? 串起来，感受代码有多清爽。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','往 samples 数组里再加一个 " :25"，运行 cargo run，看看空姓名会被哪一步拦截。','把 load_user 里的两个 ? 删掉一个，运行 cargo check，读一读类型不匹配的报错信息，体会 ? 帮你做的解包工作。'],expect:'通过：小明（20 岁）\n拒绝 [小红:abc]：无效年龄：abc\n拒绝 [小刚:150]：年龄超出范围：150\n拒绝 [没有冒号]：缺少冒号分隔符\n默认年龄：18'},code:`fn split_record(line: &str) -> Result<(&str, &str), String> {
    match line.split_once(':') {
        Some((name, age)) => {
            let name = name.trim();
            if name.is_empty() {
                Err(String::from("姓名不能为空"))
            } else {
                Ok((name, age.trim()))
            }
        }
        None => Err(String::from("缺少冒号分隔符")),
    }
}

fn parse_age(raw: &str) -> Result<u8, String> {
    let age: u8 = match raw.parse() {
        Ok(n) => n,
        Err(_) => return Err(format!("无效年龄：{raw}")),
    };
    if age > 120 {
        return Err(format!("年龄超出范围：{age}"));
    }
    Ok(age)
}

fn load_user(line: &str) -> Result<(String, u8), String> {
    let (name, raw_age) = split_record(line)?;
    let age = parse_age(raw_age)?;
    Ok((name.to_string(), age))
}

fn main() {
    let samples = ["小明:20", "小红:abc", "小刚:150", "没有冒号"];
    for line in samples {
        match load_user(line) {
            Ok((name, age)) => println!("通过：{name}（{age} 岁）"),
            Err(msg) => println!("拒绝 [{line}]：{msg}"),
        }
    }
    let fallback = parse_age("未知").unwrap_or(18);
    println!("默认年龄：{fallback}");
}`,explain:[{at:'fn split_record(line: &str) -> Result<(&str, &str), String> {',text:'把一行文本按冒号拆成姓名和年龄两段切片，失败返回 String 原因。'},{at:'match line.split_once(\':\') {',text:'split_once 返回 Option<(&str, &str)>：找到第一个冒号就返回左右两段，找不到返回 None。'},{at:'Some((name, age)) => {',to:'Ok((name, age.trim()))',text:'去掉首尾空白后如果姓名为空就返回 Err，否则返回清理后的两段切片。'},{at:'None => Err(String::from("缺少冒号分隔符")),',text:'整行里没有冒号，返回明确错误。'},{at:'fn parse_age(raw: &str) -> Result<u8, String> {',text:'把年龄文字解析成 u8 并检查上限。'},{at:'let age: u8 = match raw.parse() {',to:'Err(_) => return Err(format!("无效年龄：{raw}")),',text:'把 parse() 的解析失败转换成带原始输入的 String 错误并提前返回。'},{at:'if age > 120 {',to:'Ok(age)',text:'超过 120 岁判定为非法范围，否则返回 Ok(age)。'},{at:'fn load_user(line: &str) -> Result<(String, u8), String> {',to:'Ok((name.to_string(), age))',text:'连续用两个 ? 把拆分和解析串成一条直线：任何一步失败都会立刻把 Err 传给调用者。'},{at:'fn main() {',text:'程序入口。'},{at:'let samples = ["小明:20", "小红:abc", "小刚:150", "没有冒号"];',text:'准备 4 条覆盖正常与各类错误的测试输入。'},{at:'for line in samples {',to:'Err(msg) => println!("拒绝 [{line}]：{msg}"),',text:'逐条调用 load_user，用 match 分别打印通过和拒绝的原因。'},{at:'let fallback = parse_age("未知").unwrap_or(18);',to:'println!("默认年龄：{fallback}");',text:'演示 unwrap_or：解析失败时不报错，直接回退到默认值 18。'}]},
 {title:'自定义错误枚举：精准区分不同失败原因',body:'用 String 当错误类型写小例子很省事，但在真正的项目里有个痛点：调用者如果只想针对“缺少配置项”给默认值、对“格式错误”直接报错，难道要去比对中文报错字符串吗？只要改一个字，判断就失效了。\nRust 工程里的标准做法，是给业务定义专属的错误枚举：\n一、每个枚举变体代表一种明确的失败原因，还可以携带上下文数据（比如少了哪个 key、哪个值越界、或者把底层的 ParseIntError 包进来）；\n二、加上 #[derive(Debug)] 后就能直接用 {:?} 打印；\n三、调用方用 match 精准分流处理，而且以后如果新增了一种错误变体，编译器会自动提醒所有 match 补上对应分支，不会漏处理。\n顺带为第 9 关做个铺垫：等学完 trait 后，给自定义错误实现 Display 和 From，就能一边打印出更友好的人类提示，一边让 ? 在不同错误类型之间自动完成转换。',code:`#[derive(Debug)]
enum ConfigError {
    MissingKey(String),
    InvalidPort(std::num::ParseIntError),
    OutOfRange(u16),
}

fn validate_port(raw: &str) -> Result<u16, ConfigError> {
    let port: u16 = match raw.parse() {
        Ok(n) => n,
        Err(e) => return Err(ConfigError::InvalidPort(e)),
    };
    if port < 1024 {
        return Err(ConfigError::OutOfRange(port));
    }
    Ok(port)
}

fn describe(res: Result<u16, ConfigError>) {
    match res {
        Ok(p) => println!("有效端口：{p}"),
        Err(ConfigError::MissingKey(k)) => println!("缺少配置项：{k}"),
        Err(ConfigError::InvalidPort(e)) => println!("数字解析失败：{e}"),
        Err(ConfigError::OutOfRange(p)) => println!("端口 {p} 小于 1024"),
    }
}`,explain:[{at:'#[derive(Debug)]',to:'OutOfRange(u16),',text:'定义配置错误枚举：用三个带数据的变体精确表达“缺键”“解析数字失败”“范围越界”三种原因；派生 Debug 方便调试打印。'},{at:'fn validate_port(raw: &str) -> Result<u16, ConfigError> {',text:'返回自定义错误类型 ConfigError，调用方不需要猜字符串内容。'},{at:'let port: u16 = match raw.parse() {',to:'Err(e) => return Err(ConfigError::InvalidPort(e)),',text:'把标准库的 ParseIntError 包装进 InvalidPort 变体（第 9 关实现 From 后可以直接用 ? 替代这段 match）。'},{at:'if port < 1024 {',to:'Ok(port)',text:'检查端口号下限，小于 1024 返回 OutOfRange(port)，否则返回 Ok(port)。'},{at:'fn describe(res: Result<u16, ConfigError>) {',to:'Err(ConfigError::OutOfRange(p)) => println!("端口 {p} 小于 1024"),',text:'调用方用 match 按错误变体精准分流处理，编译器会保证所有情况都被覆盖。'}]},
 {title:'Option 与 Result 互转：ok_or 与 ok',body:'实际写业务经常要同时和 Option、Result 打交道：比如先从 HashMap::get 拿到 Option<&V>，再调用 parse() 得到 Result。如果当前函数返回 Result，你不能直接对着 Option 写 ?（两者类型不同，编译器会拒绝）。\n标准库提供了几组非常顺手的互转方法：\n一、option.ok_or(err)：把 Some(v) 转成 Ok(v)，把 None 转成 Err(err)。转成 Result 之后，后面就能顺畅接上 ?；\n二、option.ok_or_else(|| ...)：作用相同，但只在确实是 None 时才执行闭包去构造错误对象。如果构造错误要分配 String，用 ok_or_else 能避免成功路径上白白分配内存；\n三、result.ok()：反方向转换，把 Ok(v) 转成 Some(v)，把 Err(_) 丢弃错因直接转成 None——当你只关心“有没有拿到值”、不在乎具体为什么失败时很好用。',code:`use std::collections::HashMap;

fn find_port(cfg: &HashMap<&str, &str>) -> Result<u16, String> {
    let raw = cfg.get("port").ok_or_else(|| String::from("未配置 port"))?;
    match raw.parse::<u16>() {
        Ok(p) => Ok(p),
        Err(_) => Err(format!("端口格式错误：{raw}")),
    }
}

fn parse_optional_port(raw: &str) -> Option<u16> {
    raw.parse::<u16>().ok()
}`,explain:[{at:'use std::collections::HashMap;',text:'引入 HashMap。'},{at:'fn find_port(cfg: &HashMap<&str, &str>) -> Result<u16, String> {',text:'函数返回 Result，需要把中间步骤的 Option 转成 Result。'},{at:'let raw = cfg.get("port").ok_or_else(|| String::from("未配置 port"))?;',text:'get 返回 Option<&&str>；ok_or_else 在 None 时才构造错误 String，转成 Result 后用 ? 提前返回或解包出 raw。'},{at:'match raw.parse::<u16>() {',to:'Err(_) => Err(format!("端口格式错误：{raw}")),',text:'解析端口号并把错误转成可读的 String。'},{at:'fn parse_optional_port(raw: &str) -> Option<u16> {',to:'raw.parse::<u16>().ok()',text:'ok() 把 Result 转成 Option：成功变成 Some(u16)，失败丢弃错因直接变成 None。'}]},
 {title:'动手试试：自定义错误类型与 Option/Result 互转',body:'把 HashMap 配置查询、ok_or 转换、? 错误传播和自定义错误枚举串成一个完整程序：查找不同配置键，分别触发成功、缺键、非数字、端口越界四种分支，并在最后演示用 ok() 把 Result 转成 Option。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 load_port 里的 ok_or(AppError::MissingKey(key.to_string())) 改成 ok_or_else(|| AppError::MissingKey(key.to_string()))，再运行一次，确认输出完全一致并思考性能上的差别。','试着在 AppError 里删掉一个 match 分支，运行 cargo check，看看编译器如何帮你抓住漏掉的错误处理。'],expect:'port -> 端口 8080\nhost -> 缺少配置项 host\nbad -> 不是有效数字：abc\nlow -> 端口 80 小于 1024\n转为 Option：Some(8080)'},code:`use std::collections::HashMap;

#[derive(Debug)]
enum AppError {
    MissingKey(String),
    InvalidNumber(String),
    OutOfRange(u16),
}

fn load_port(cfg: &HashMap<&str, &str>, key: &str) -> Result<u16, AppError> {
    let raw = cfg.get(key).ok_or(AppError::MissingKey(key.to_string()))?;
    let port: u16 = match raw.parse() {
        Ok(n) => n,
        Err(_) => return Err(AppError::InvalidNumber(raw.to_string())),
    };
    if port < 1024 {
        return Err(AppError::OutOfRange(port));
    }
    Ok(port)
}

fn main() {
    let mut cfg = HashMap::new();
    cfg.insert("port", "8080");
    cfg.insert("bad", "abc");
    cfg.insert("low", "80");

    for key in ["port", "host", "bad", "low"] {
        match load_port(&cfg, key) {
            Ok(port) => println!("{key} -> 端口 {port}"),
            Err(AppError::MissingKey(k)) => println!("{key} -> 缺少配置项 {k}"),
            Err(AppError::InvalidNumber(v)) => println!("{key} -> 不是有效数字：{v}"),
            Err(AppError::OutOfRange(p)) => println!("{key} -> 端口 {p} 小于 1024"),
        }
    }

    let port_opt: Option<u16> = load_port(&cfg, "port").ok();
    println!("转为 Option：{:?}", port_opt);
}`,explain:[{at:'use std::collections::HashMap;',text:'引入 HashMap 存放配置项。'},{at:'#[derive(Debug)]',to:'OutOfRange(u16),',text:'定义业务错误枚举 AppError，三种变体各自携带出错上下文。'},{at:'fn load_port(cfg: &HashMap<&str, &str>, key: &str) -> Result<u16, AppError> {',text:'按 key 读取并校验端口，返回 Result<u16, AppError>。'},{at:'let raw = cfg.get(key).ok_or(AppError::MissingKey(key.to_string()))?;',text:'get 返回 Option；ok_or 把 None 转成 MissingKey 错误，再用 ? 传播或取出 raw。'},{at:'let port: u16 = match raw.parse() {',to:'Err(_) => return Err(AppError::InvalidNumber(raw.to_string())),',text:'尝试解析 u16，失败时把原始字符串装进 InvalidNumber 提前返回。'},{at:'if port < 1024 {',to:'Ok(port)',text:'低于 1024 视作越界错误，校验通过则返回 Ok(port)。'},{at:'fn main() {',text:'程序入口。'},{at:'let mut cfg = HashMap::new();',to:'cfg.insert("low", "80");',text:'准备三项配置，故意留空 "host" 来触发 MissingKey。'},{at:'for key in ["port", "host", "bad", "low"] {',to:'Err(AppError::OutOfRange(p)) => println!("{key} -> 端口 {p} 小于 1024"),',text:'依次查询四个键，用 match 针对每种错误变体输出清晰提示。'},{at:'let port_opt: Option<u16> = load_port(&cfg, "port").ok();',to:'println!("转为 Option：{:?}", port_opt);',text:'用 ok() 把 Result<u16, AppError> 转回 Option<u16>，打印 Some(8080)。'}]}
],quiz:[
 {id:'rust-collections-1',q:'对一个长度为 3 的 Vec<i32> 变量 v，访问越界位置时 &v[5] 和 v.get(5) 的区别是？',options:['两者都会让程序直接 panic 退出','两者都会安全地返回 None 值','前者直接 panic，后者返回 None','前者返回默认值 0，后者直接报错'],why:['v.get(5) 不会 panic，而是用 Option 表示可能不存在。','&v[5] 不会返回 Option，越界时会立刻 panic。','','Rust 不会给越界下标编造默认值 0，&v[5] 会 panic，v.get(5) 返回 None。'],answer:2,explain:'索引访问 &v[i] 越界会直接 panic；v.get(i) 返回 Option<&T>，越界时安全返回 None。'},
 {id:'rust-collections-2',q:'下面代码为什么会编译报错？',code:'let mut v = vec![1, 2, 3];\nlet first = &v[0];\nv.push(4);\nprintln!("{first}");',options:['Vec 里的整数元素不支持创建引用','不可变借用还活着时又做了可变借用','push 方法接收的值类型和元素不符','vec! 宏造出的列表大小不能再增长'],why:['Vec 里的任何元素都可以用 &v[0] 创建引用。','','4 是 i32，和 vec![1, 2, 3] 的元素类型完全一致。','vec! 造出来的就是普通 Vec，声明 mut 后可以随时 push 增长。'],answer:1,explain:'first 不可变借用了 v 且在 println! 里还要用；期间 v.push(4) 需要可变借用，若触发扩容搬移内存会让 first 悬垂，所以编译器拒绝通过。'},
 {id:'rust-collections-3',type:'judge',q:'Rust 里可以用 s[0] 直接取出 String 变量 s 的第一个字符。',answer:false,explain:'Rust 禁止用整数下标直接索引 String，因为 UTF-8 是变长编码，一个汉字占 3 字节；按字符遍历要用 s.chars()。'},
 {id:'rust-collections-4',q:'下面代码运行后打印的两个数字分别是？',code:'let s = String::from("你好!");\nprintln!("{} {}", s.len(), s.chars().count());',options:['3 3','6 3','7 7','7 3'],why:['len() 数的是 UTF-8 字节数，不是字符个数，“你好!”不止 3 字节。','两个汉字共 6 字节，漏算了末尾英文感叹号的 1 个字节。','chars().count() 数的是字符个数，不是字节数。',''],answer:3,explain:'UTF-8 中每个常用汉字占 3 字节，英文感叹号占 1 字节，共 7 字节；字符个数是 3 个。'},
 {id:'rust-collections-5',type:'fill',q:'用 HashMap 做词频统计时，想在键不存在时先插入 0 再拿到值的可变引用，常用 map.＿(word).or_insert(0)。',accepted:['entry'],explain:'entry(key) 返回该键对应的入口视图，配合 or_insert(0) 在缺键时写入初始值并返回 &mut V。'},
 {id:'rust-collections-6',type:'multi',q:'关于 HashMap<String, i32>，下面哪些说法正确？（多选）',options:['插入 String 键会把所有权移进集合','遍历键值对时会按插入先后顺序依次输出','用 get 查找时会返回 Option<&i32>','重复插入已存在的键会导致程序直接崩溃'],why:['','HashMap 使用带随机种子的哈希算法，遍历顺序不确定，不保证按插入顺序输出。','','对已存在的键再次 insert 不会崩溃，而是用新值覆盖旧值。'],answers:[0,2],explain:'非 Copy 类型的键（如 String）调用 insert 时会转移所有权；get 返回 Option<&V>；遍历顺序不确定，重复 insert 会覆盖旧值。'},
 {id:'rust-collections-7',q:'下面哪种场景更适合让函数返回 Result，而不是直接调用 panic!？',options:['读取用户输入的配置文件时找不到文件','单元测试里校验函数返回值不符合预期','代码内部不变量被打破导致状态已损坏','原型示例里快速验证思路不想写错误处理'],why:['','单元测试里用断言失败触发 panic 正是标记测试不通过的方式。','内部不变量被打破属于无法安全继续的程序 bug，适合用 panic! 尽早暴露。','写教学原型或临时脚本时可以暂时用 unwrap/panic，正式业务中可预期失败才返回 Result。'],answer:0,explain:'找不到配置文件是预期中可能发生的外部失败，返回 Result 可以让调用者决定提示用户、重试或使用默认配置。'},
 {id:'rust-collections-8',q:'拿到一个 Result<i32, ParseIntError>，想在解析失败时直接返回默认值 0 而不崩溃，应调用哪个方法？',options:['unwrap()','expect("0")','panic!()','unwrap_or(0)'],why:['unwrap() 在遇到 Err 时会直接 panic 崩溃。','expect("0") 在遇到 Err 时同样会 panic，只是打印提示 "0"。','panic!() 是直接让程序紧急停机的宏，不会返回默认值。',''],answer:3,explain:'unwrap_or(默认值) 在 Ok(v) 时取出 v，在 Err 时安全返回传入的默认值，不会 panic。'},
 {id:'rust-collections-9',type:'judge',q:'在返回 Result<T, E> 的函数里，对表达式使用 ? 运算符会在遇到 Err 时提前返回错误，并按需通过 From 转换错误类型。',answer:true,explain:'? 遇到 Ok(v) 会解包出 v 继续执行，遇到 Err(e) 会经由 From 自动转换错误类型并立刻提前 return Err。'},
 {id:'rust-collections-10',q:'在返回 Result<i32, MyError> 的函数里，let n = parse_num(s)?; 遇到 Err(e) 时会发生什么？',options:['忽略错误并把 n 设成默认零值','经 From 转换后提前返回 Err','立刻触发 panic 并打印错误栈','自动重试一次 parse_num 调用'],why:['? 不会静默吞掉错误，也不会给变量编造默认值。','','? 是可恢复错误的传播语法，不会触发 panic。','? 只做解包或提前返回，不会自动重试。'],answer:1,explain:'? 等价于遇到 Err(e) 时执行 return Err(From::from(e))，把错误交给上层调用者处理。'},
 {id:'rust-collections-11',type:'multi',q:'关于 Option 与 Result 互转及错误处理方法，下面哪些说法正确？（多选）',options:['ok_or 可把 Option 转成 Result','Result::ok 会把 Err 转成 None','unwrap 在遇到 Err 时返回类型默认值','expect 失败时会打印自定义的提示语'],why:['','','unwrap 在遇到 Err 时会直接 panic，不会返回默认值。',''],answers:[0,1,3],explain:'ok_or 把 Option 转成 Result 以便使用 ?；Result::ok 忽略错因转成 Option；expect 失败时 panic 并输出自定义消息。'},
 {id:'rust-collections-12',type:'fill',q:'在返回 Result 的函数里，想把 map.get("port") 得到的 Option 转成 Result 以便接上 ?，可调用方法＿（填方法名，不带括号）。',accepted:['ok_or','ok_or_else'],explain:'option.ok_or(err) 或 option.ok_or_else(|| err) 把 None 映射为 Err，从而在返回 Result 的函数里配合 ? 使用。'},
 {id:'rust-collections-13',type:'short',q:'为什么 Rust 既禁止用 s[0] 索引 String，又在持有 Vec 元素引用时禁止同时 push？请分别说明原因。',reference:'一、禁止 s[0] 索引 String：Rust 字符串以 UTF-8 变长编码存储，英文 1 字节、常用汉字 3 字节、表情 4 字节。按字节下标取可能切裂多字节字符，按第 k 个字符取又需要 O(n) 扫描，且字节、Unicode 标量值与字形簇含义不同，所以要求显式用 chars() 或 bytes() 遍历。\n二、持有 Vec 元素引用时禁止 push：Vec 元素在堆上连续存放，push 超过容量时会重新分配更大内存、搬移元素并释放旧内存；若此时旧元素引用仍在使用就会成为悬垂引用，借用检查器因此在编译期禁止不可变借用与可变借用共存。',points:['说明 String 采用 UTF-8 变长编码，字节下标可能切裂字符','指出按字符索引无法做到 O(1)，需显式用 chars() 或 bytes()','说明 Vec 连续存储且 push 扩容可能重分配并释放旧内存','指出借用检查阻止同时持有元素引用与可变借用，避免悬垂引用'],explain:'这两条限制看似严格，根源都是防止字符语义歧义与扩容后的悬垂引用。'},
 {id:'rust-collections-14',type:'code',q:'定义错误枚举 AgeError（派生 Debug，含 Empty、InvalidNumber、OutOfRange(u8) 三个变体），实现 parse_age(input: &str) -> Result<u8, AgeError>：去空白后为空返回 Empty，无法解析成 u8 返回 InvalidNumber，大于 120 返回 OutOfRange(n)，否则返回 Ok(n)。再写出 main 测试正常与出错输入。',reference:'#[derive(Debug)]\nenum AgeError {\n    Empty,\n    InvalidNumber,\n    OutOfRange(u8),\n}\n\nfn parse_age(input: &str) -> Result<u8, AgeError> {\n    let trimmed = input.trim();\n    if trimmed.is_empty() {\n        return Err(AgeError::Empty);\n    }\n    let age: u8 = match trimmed.parse() {\n        Ok(n) => n,\n        Err(_) => return Err(AgeError::InvalidNumber),\n    };\n    if age > 120 {\n        return Err(AgeError::OutOfRange(age));\n    }\n    Ok(age)\n}\n\nfn main() {\n    for raw in ["25", "  ", "abc", "150"] {\n        match parse_age(raw) {\n            Ok(age) => println!("{raw:?} -> 合法：{age}"),\n            Err(AgeError::Empty) => println!("{raw:?} -> 为空"),\n            Err(AgeError::InvalidNumber) => println!("{raw:?} -> 非法数字"),\n            Err(AgeError::OutOfRange(n)) => println!("{raw:?} -> 超出范围：{n}"),\n        }\n    }\n}',points:['定义 #[derive(Debug)] 的 AgeError 并包含三个指定变体','函数签名正确，先 trim 判空返回 Empty','解析 u8 失败返回 InvalidNumber，大于 120 返回 OutOfRange(age)','main 中调用并覆盖正常与错误分支'],explain:'自定义错误枚举让调用方能用 match 精准处理每一种失败原因，比纯 String 更健壮。'}
]};

// 第 8 关：包、crate、模块与测试。
export const rustModules:AiLevel={id:'rust-modules',title:'包、crate、模块与测试',summary:'package/crate/module 结构、pub 可见性、use 路径管理、依赖配置与单元/集成/文档测试',lessons:[
 {title:'Package、Crate 与 Module：三层组织结构',body:'当代码从几十行长到几千行，全塞进 src/main.rs 会变得难以维护。Rust 用三层结构管理项目规模：\n一、Crate（编译单元）：rustc 一次编译的最小单位，分两种：\n  - 二进制 crate（binary crate）：包含 main 函数，编译成可执行程序，默认入口是 src/main.rs；想在一个项目里放多个工具，还可以在 src/bin/ 下建多个 .rs 文件；\n  - 库 crate（library crate）：没有 main 函数，用来提供功能给别的程序或测试调用，默认入口是 src/lib.rs。\n二、Package（包）：一个带有 Cargo.toml 的项目目录。规则是：一个 package 至少包含 1 个 crate，最多只能有 1 个库 crate，但可以有任意多个二进制 crate。\n工程里最常见的结构是同时保留 src/lib.rs 和 src/main.rs：\nmy_app/\n├── Cargo.toml\n├── src/\n│   ├── lib.rs    核心业务逻辑（库 crate，方便复用和写集成测试）\n│   ├── main.rs   薄入口（二进制 crate，只解析参数并调用库）\n│   └── bin/\n│       └── tool.rs 额外的命令行工具\n└── tests/        集成测试目录\n三、Module（模块）：crate 内部用来分组代码、避免重名并控制哪些接口对外公开的层级结构。'},
 {title:'用 mod 划分模块与 pub 可见性控制',body:'在 crate 里用 mod 名称 { ... } 定义模块，模块之间可以嵌套，形成一棵以 crate 为根的模块树。\nRust 的可见性规则非常清晰，记住五条就行：\n一、默认全部私有：函数、结构体、枚举、常量、模块本身，不写 pub 默认都是私有的；\n二、单向透明：父模块看不到子模块的私有项，但子模块可以看到父模块（乃至祖先模块）的私有项——就像孩子能用客厅里的东西，外人却不能随便翻孩子房间；\n三、层层公开：想让外部访问子模块里的函数，模块和函数都要加 pub；\n四、细粒度可见性：pub(crate) 表示整个当前 crate 内可见，但对外部依赖者隐藏（项目内共享最常用）；pub(super) 表示仅对父模块可见；\n五、结构体和枚举的差别：pub struct 公开后，它的字段默认仍是私有的，要按需逐个加 pub（这样可以强迫外部通过构造函数创建，保护内部数据合法性）；而 pub enum 公开后，它的所有变体默认都是公有的。',code:`mod account {
    pub struct User {
        pub name: String,
        balance: i32,
    }

    pub enum Role {
        Guest,
        Admin,
    }

    impl User {
        pub fn new(name: &str) -> User {
            User { name: String::from(name), balance: 0 }
        }

        pub(crate) fn deposit(&mut self, amount: i32) {
            self.balance += amount;
        }
    }

    pub(super) fn secret_tag() -> &'static str {
        "internal"
    }
}`,explain:[{at:'mod account {',text:'定义一个模块 account；不加 pub 时，它只在当前父模块内可见。'},{at:'pub struct User {',to:'balance: i32,',text:'User 结构体是公有的，name 字段公开，但 balance 没加 pub 所以默认私有，外部不能直接篡改余额。'},{at:'pub enum Role {',to:'Admin,',text:'Role 是公有枚举，它的所有变体（Guest、Admin）自动就是公有的，不需要逐个写 pub。'},{at:'impl User {',to:'User { name: String::from(name), balance: 0 }',text:'因为 balance 是私有的，外部无法直接用 User { ... } 构造，必须通过公开的构造函数 User::new 创建。'},{at:'pub(crate) fn deposit(&mut self, amount: i32) {',to:'self.balance += amount;',text:'pub(crate) 让整个当前 crate 里的其他模块都能调用 deposit，但不暴露给外部项目。'},{at:'pub(super) fn secret_tag() -> &\'static str {',to:'"internal"',text:'pub(super) 只把这个函数开放给 account 的直接父模块使用。'}]},
 {title:'路径与 use 关键字：简化长路径与 pub use 重导出',body:'定位模块树里的某一项有两种路径写法：\n一、绝对路径：从当前 crate 根开始写 crate::模块::条目；引用外部或标准库 crate 时以 crate 名开头，如 std::collections::HashMap；\n二、相对路径：从当前模块出发，或用 self::（当前模块）、super::（父模块，类似目录里的 ..）。\n路径很长时，用 use 把它引入当前作用域：\n一、社区习惯：引入函数一般引入到父模块（如 use crate::math; math::add(1, 2)），让人一眼看出它来自外部模块；引入结构体、枚举和集合则直接写全路径（use std::collections::HashMap;）；\n二、重名冲突时用 as 起别名：比如同时用到 std::fmt::Result 和 std::io::Result，可以写成 use std::io::Result as IoResult;；\n三、嵌套导入把公共前缀合并：use std::collections::{HashMap, HashSet};，想同时引入模块本身和子项就写 use std::io::{self, Write};；\n四、pub use 重导出：既引入当前作用域，又对外公开为更短的 API。内部代码可以按实现细节分得很深，外部调用者却只需一条简洁路径。',code:`use std::collections::{HashMap, HashSet};
use std::fmt::Result as FmtResult;

mod internal {
    pub mod auth {
        pub struct Token(pub String);
    }
}

pub use crate::internal::auth::Token;

mod service {
    use super::Token;

    pub fn make_token(raw: &str) -> Token {
        Token(String::from(raw))
    }
}`,explain:[{at:'use std::collections::{HashMap, HashSet};',text:'嵌套导入：共享 std::collections 前缀，一行引入多个集合类型。'},{at:'use std::fmt::Result as FmtResult;',text:'用 as 给导入的 Result 起别名，避免和标准库预导入的 Result 发生重名冲突。'},{at:'mod internal {',to:'pub struct Token(pub String);',text:'内部模块层级较深，按实现细节把 Token 放在 internal::auth 下。'},{at:'pub use crate::internal::auth::Token;',text:'用绝对路径加 pub use 重导出：外部使用者可以直接 use crate::Token，不必关心 internal::auth 这层内部结构。'},{at:'mod service {',text:'定义子模块 service。'},{at:'use super::Token;',text:'用相对路径 super:: 访问父模块重导出的 Token。'},{at:'pub fn make_token(raw: &str) -> Token {',to:'Token(String::from(raw))',text:'在子模块里构造并返回 Token。'}]},
 {title:'把模块拆到不同文件',body:'模块内容变多以后，不用都堆在同一个文件里：只要在父模块写一句带分号的 mod auth;（不写花括号），编译器就会自动去硬盘里找对应文件作为模块体。\nRust 支持两种文件布局：\n一、现代推荐写法（Rust 2018 及以后）：\n  src/lib.rs          写 mod auth;\n  src/auth.rs         auth 模块内容，里面写 pub mod token;\n  src/auth/token.rs   token 子模块内容\n二、传统写法：\n  src/auth/mod.rs     auth 模块内容\n  src/auth/token.rs   token 子模块内容\n注意两点：\n一、同一个模块不要同时存在 src/auth.rs 和 src/auth/mod.rs，编译器会报歧义错；现代项目普遍更推荐第一种，因为编辑器标签页上不会全叫 mod.rs；\n二、新手最常踩的坑：mod auth; 是“声明并把文件挂载进模块树”，只在父模块里写一次；别的文件想用 auth 里的东西，应该写 use crate::auth::...;，不要到处重复写 mod auth;。',code:`// --- src/lib.rs ---
pub mod auth;

// --- src/auth.rs ---
pub mod token;
pub fn login(user: &str) -> String {
    token::issue(user)
}

// --- src/auth/token.rs ---
pub fn issue(user: &str) -> String {
    format!("tok_{user}")
}`,explain:[{at:'pub mod auth;',text:'在 src/lib.rs 写带分号的 mod 声明，告诉编译器自动加载 src/auth.rs（或 src/auth/mod.rs）作为 pub 模块 auth。'},{at:'pub mod token;',text:'在 src/auth.rs 里再声明子模块 token，编译器会自动加载 src/auth/token.rs。'},{at:'pub fn login(user: &str) -> String {',to:'token::issue(user)',text:'auth 模块内直接用相对路径 token::issue 调用子模块的公有函数。'},{at:'pub fn issue(user: &str) -> String {',to:'format!("tok_{user}")',text:'子模块文件里不需要再包一层 mod token { ... }，整个文件的内容本身就是 token 模块。'}]},
 {title:'动手试试：多层模块、可见性与 pub use 重导出',body:'在一个单文件程序里把 mod、pub、pub(super)、结构体私有字段、公有枚举、嵌套 use、as 别名和 pub use 重导出全部串起来跑一遍，亲手验证哪些能访问、哪些会被编译器拦住。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','试着在 main 里把 book.stock() 改成 book.stock，运行 cargo check，看看编译器对私有字段给出的报错。看完改回来。','把 store 里的 pub use inventory::Item; 删掉，运行 cargo check，观察 use crate::store::{Item, ...} 为什么立刻报错。看完加回来。'],expect:'商品：Rust 实战，当前库存：5\n原价：100，折后价：80'},code:`mod store {
    pub mod inventory {
        pub struct Item {
            pub name: String,
            stock: u32,
        }

        impl Item {
            pub fn new(name: &str, stock: u32) -> Item {
                Item {
                    name: String::from(name),
                    stock,
                }
            }

            pub fn stock(&self) -> u32 {
                self.stock
            }

            pub(super) fn restock(&mut self, amount: u32) {
                self.stock += amount;
            }
        }
    }

    pub mod pricing {
        pub enum Discount {
            None,
            Percent(u32),
        }

        pub fn final_price(base: u32, discount: Discount) -> u32 {
            match discount {
                Discount::None => base,
                Discount::Percent(p) => base * (100 - p) / 100,
            }
        }
    }

    pub use inventory::Item;

    pub fn add_stock(item: &mut Item, amount: u32) {
        item.restock(amount);
    }
}

use crate::store::{Item, add_stock, pricing};
use crate::store::pricing::Discount as Disc;

fn main() {
    let mut book = Item::new("Rust 实战", 3);
    add_stock(&mut book, 2);
    println!("商品：{}，当前库存：{}", book.name, book.stock());

    let p1 = pricing::final_price(100, Disc::None);
    let p2 = pricing::final_price(100, Disc::Percent(20));
    println!("原价：{p1}，折后价：{p2}");
}`,explain:[{at:'mod store {',text:'外层模块 store，里面拆出库存 inventory 和定价 pricing 两个子模块。'},{at:'pub mod inventory {',to:'stock: u32,',text:'Item 结构体公开，name 公开但 stock 默认私有，防止外部绕过业务规则乱改库存。'},{at:'impl Item {',to:'pub fn stock(&self) -> u32 {',text:'提供公开构造方法 new 和只读方法 stock()。'},{at:'self.stock',text:'返回私有字段 stock 的值。'},{at:'pub(super) fn restock(&mut self, amount: u32) {',to:'self.stock += amount;',text:'pub(super) 允许父模块 store 调用 restock，但 main 不能直接调用它。'},{at:'pub mod pricing {',to:'Percent(u32),',text:'公有枚举 Discount 的所有变体默认公开，外部可以直接构造和匹配。'},{at:'pub fn final_price(base: u32, discount: Discount) -> u32 {',to:'Discount::Percent(p) => base * (100 - p) / 100,',text:'按折扣枚举计算折后价。'},{at:'pub use inventory::Item;',text:'把深层的 inventory::Item 重导出到 store 这一层，外部路径更短。'},{at:'pub fn add_stock(item: &mut Item, amount: u32) {',to:'item.restock(amount);',text:'store 作为父模块，有权调用 inventory 里标了 pub(super) 的 restock。'},{at:'use crate::store::{Item, add_stock, pricing};',text:'嵌套导入重导出的 Item、函数 add_stock 和子模块 pricing。'},{at:'use crate::store::pricing::Discount as Disc;',text:'用 as 给 Discount 起简短别名 Disc。'},{at:'fn main() {',to:'println!("商品：{}，当前库存：{}", book.name, book.stock());',text:'创建商品并补货 2 本，公有字段 name 可直接访问，私有库存通过 stock() 读取，打印 5。'},{at:'let p1 = pricing::final_price(100, Disc::None);',to:'println!("原价：{p1}，折后价：{p2}");',text:'分别计算无折扣和 8 折价格，打印 100 和 80。'}]},
 {title:'用 Cargo.toml 管理第三方依赖',body:'Rust 的公共库集中在 crates.io 上，管理依赖全靠 Cargo.toml 和 cargo 命令：\n一、添加依赖：不用手查版本号，在项目目录运行 cargo add rand（或加特性 cargo add serde --features derive），Cargo 会自动把最新兼容版本写进 [dependencies]；\n二、语义化版本（SemVer：主版本.次版本.修订号）与 ^ 规则：在 Cargo.toml 里写 "1.2.3" 默认等价于 "^1.2.3"（允许兼容更新）：\n  - 主版本不为 0 时（如 "^1.2.3"），允许更新到任意 >= 1.2.3 且 < 2.0.0 的版本，不会跨主版本引入破坏性变更；\n  - 主版本为 0 时（如 "^0.9.1"），最左边的非零数字被视为“大版本”，因此允许 < 0.10.0；"^0.0.3" 则锁定在 0.0.3；\n三、[dev-dependencies]：专门放只在跑测试、示例或基准测试时才需要的依赖，不会编进最终发布的程序里；\n四、Cargo.lock 该不该提交到 Git？社区通用规范：\n  - 二进制项目（应用、服务端、命令行工具）：应当提交 Cargo.lock，保证每台电脑和 CI 每次编译出完全一致的依赖版本；\n  - 库项目（给别人当依赖的 lib）：通常不提交 Cargo.lock，由最终使用该库的应用程序统一锁定整棵依赖树。',code:`[package]
name = "order_tool"
version = "0.1.0"
edition = "2024"

[dependencies]
rand = "0.9.1"
serde = { version = "1.0.219", features = ["derive"] }

[dev-dependencies]
tempfile = "3.19"`,explain:[{at:'[package]',to:'edition = "2024"',text:'项目基本信息：包名、自身版本号和使用的 Rust 版次。'},{at:'[dependencies]',text:'正式运行代码所需的依赖小节。'},{at:'rand = "0.9.1"',text:'等价于 ^0.9.1，允许自动拉取兼容的 0.9.x 补丁版，但不会升到 0.10.0。'},{at:'serde = { version = "1.0.219", features = ["derive"] }',text:'使用对象语法在指定版本（等价 ^1.0.219，允许 < 2.0.0）的同时启用可选特性 derive。'},{at:'[dev-dependencies]',to:'tempfile = "3.19"',text:'仅在 cargo test 等开发测试场景编译的依赖，不会增大最终发布程序的体积。'}]},
 {title:'编写单元测试：#[cfg(test)]、断言宏与测试属性',body:'Rust 内置完整的测试框架，不需要额外装第三方测试工具。单元测试通常直接写在被测代码的同一个文件底部，放进一个专门的测试模块：\n一、#[cfg(test)] mod tests：条件编译属性告诉编译器“只在运行 cargo test 时才编译这个模块”，普通 cargo build 不会把它打进最终程序；因为 tests 是子模块，按可见性规则它写上 use super::*; 就能直接测试父模块里的私有函数；\n二、#[test]：标在无参函数上，表示这是一个测试用例。测试函数只要发生 panic 就算失败，顺利执行完就算通过；\n三、三个核心断言宏：\n  - assert!(条件)：条件为 false 就 panic；\n  - assert_eq!(左, 右) 和 assert_ne!(左, 右)：检查相等或不相等，失败时会把左右两边的实际值打印出来（要求类型实现 PartialEq 和 Debug）；\n  - 自定义失败信息：所有断言宏后面都可以像 println! 一样附加提示，如 assert!(ok, "期望成功，实际值={val}")；\n四、三个高频进阶写法：\n  - #[should_panic(expected = "子串")]：验证这段代码“就应该 panic”，expected 进一步确认 panic 信息包含预期关键词，避免别的意外错误让测试误通过；\n  - fn my_test() -> Result<(), String>：测试函数也可以返回 Result，这样里面就能用 ?，返回 Ok(()) 算通过、Err 算失败（注意不能与 #[should_panic] 同用）；\n  - #[ignore]：标记耗时很长的测试，默认 cargo test 会跳过它，需要时再单独运行。'},
 {title:'标准单元测试写法：#[cfg(test)] mod tests',body:'下面是一份完整的单元测试模块范例，可以直接放进 src/lib.rs（或 src/main.rs）里，运行 cargo test 就会自动发现并执行里面的测试用例。注意它同时展示了测私有函数、自定义断言提示、Result 返回值测试、#[should_panic] 和 #[ignore]。',code:`fn clamp_score(score: i32) -> i32 {
    if score < 0 { 0 } else if score > 100 { 100 } else { score }
}

pub fn safe_divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("除数不能为 0"))
    } else {
        Ok(a / b)
    }
}

pub fn must_positive(n: i32) -> i32 {
    if n <= 0 {
        panic!("输入必须大于 0");
    }
    n
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp_private() {
        assert_eq!(clamp_score(-5), 0);
        assert_eq!(clamp_score(120), 100);
        assert_ne!(clamp_score(80), 0);
        assert!(clamp_score(60) >= 60, "正常分数不应被压低");
    }

    #[test]
    fn test_divide_ok() -> Result<(), String> {
        let q = safe_divide(10, 2)?;
        assert_eq!(q, 5);
        Ok(())
    }

    #[test]
    #[should_panic(expected = "必须大于 0")]
    fn test_must_positive_panics() {
        must_positive(0);
    }

    #[test]
    #[ignore]
    fn slow_report_check() {
        assert_eq!(clamp_score(99), 99);
    }
}`,explain:[{at:'fn clamp_score(score: i32) -> i32 {',to:'if score < 0 { 0 } else if score > 100 { 100 } else { score }',text:'一个私有辅助函数，把分数限制在 0 到 100 之间；同文件的 tests 子模块依然可以测它。'},{at:'pub fn safe_divide(a: i32, b: i32) -> Result<i32, String> {',to:'Ok(a / b)',text:'返回 Result 的公有除法函数，除数为 0 时返回 Err。'},{at:'pub fn must_positive(n: i32) -> i32 {',to:'    n',text:'输入不大于 0 时直接 panic，用来演示 #[should_panic] 测试。'},{at:'#[cfg(test)]',to:'use super::*;',text:'只在 cargo test 时编译 tests 模块；use super::*; 把父模块里包括私有函数在内的条目全部引入。'},{at:'fn test_clamp_private() {',to:'assert!(clamp_score(60) >= 60, "正常分数不应被压低");',text:'演示 assert_eq!、assert_ne! 以及带自定义失败提示的 assert!，同时覆盖下界、上界和正常值。'},{at:'fn test_divide_ok() -> Result<(), String> {',to:'Ok(())',text:'返回 Result 的测试函数：可以直接在测试体里用 ?，出错自动判失败，结尾返回 Ok(()) 判通过。'},{at:'#[should_panic(expected = "必须大于 0")]',to:'must_positive(0);',text:'预期 must_positive(0) 触发 panic，并且 panic 信息里必须包含“必须大于 0”。'},{at:'#[ignore]',to:'assert_eq!(clamp_score(99), 99);',text:'标记为暂时忽略的耗时测试，默认 cargo test 会跳过并在统计里显示 1 ignored。'}]},
 {title:'动手试试：用断言宏测试模块函数与边界用例',body:'写一个包含折扣计算和平均值计算的 calc 模块，在 main 里用 assert_eq!、assert_ne! 和带自定义提示的 assert! 验证正常值、边界值（0%、100%、空切片）与非法输入。运行 cargo run 就能直接看到验证结果；完成后也可以按最后一步把它改写成 #[cfg(test)] 用 cargo test 跑一遍。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','故意把 assert_eq!(calc::discount_price(200, 25), Ok(150)); 里的 150 改成 160，再运行 cargo run，看看 assert_eq! 失败时怎样同时打印 left 和 right 方便定位问题。看完改回来。','把文件末尾再加一个 #[cfg(test)] mod tests { use super::*; #[test] fn check_avg() { assert_eq!(calc::average(&[2, 4]), Some(3)); } }，然后运行 cargo test，体验标准测试输出。'],expect:'折扣函数测试通过：4 项\n平均值函数测试通过：3 项'},code:`mod calc {
    pub fn discount_price(price: u32, percent: u32) -> Result<u32, String> {
        if percent > 100 {
            return Err(format!("折扣不能超过 100：{percent}"));
        }
        Ok(price * (100 - percent) / 100)
    }

    pub fn average(nums: &[i32]) -> Option<i32> {
        if nums.is_empty() {
            return None;
        }
        let mut sum = 0;
        for &n in nums {
            sum += n;
        }
        Some(sum / nums.len() as i32)
    }
}

fn main() {
    assert_eq!(calc::discount_price(200, 25), Ok(150));
    assert_eq!(calc::discount_price(200, 0), Ok(200));
    assert_eq!(calc::discount_price(200, 100), Ok(0));
    assert!(calc::discount_price(200, 120).is_err(), "超过 100% 应返回 Err");
    println!("折扣函数测试通过：4 项");

    assert_eq!(calc::average(&[10, 20, 30]), Some(20));
    assert_ne!(calc::average(&[10, 20, 30]), None);
    assert_eq!(calc::average(&[]), None);
    println!("平均值函数测试通过：3 项");
}`,explain:[{at:'mod calc {',text:'把待测函数放进独立模块 calc 中。'},{at:'pub fn discount_price(price: u32, percent: u32) -> Result<u32, String> {',to:'Ok(price * (100 - percent) / 100)',text:'折扣超过 100% 时返回 Err，否则返回折后价格。'},{at:'pub fn average(nums: &[i32]) -> Option<i32> {',to:'Some(sum / nums.len() as i32)',text:'空切片返回 None 避免除以 0，非空时求和再除以长度返回 Some。'},{at:'fn main() {',text:'程序入口，用来执行两批断言自测。'},{at:'assert_eq!(calc::discount_price(200, 25), Ok(150));',to:'assert_eq!(calc::discount_price(200, 100), Ok(0));',text:'依次验证常规折扣 25% 以及 0%、100% 两个边界值。'},{at:'assert!(calc::discount_price(200, 120).is_err(), "超过 100% 应返回 Err");',text:'验证非法输入返回 Err，并附带自定义失败提示。'},{at:'println!("折扣函数测试通过：4 项");',text:'前面四条断言全部通过才会走到这一行。'},{at:'assert_eq!(calc::average(&[10, 20, 30]), Some(20));',to:'assert_eq!(calc::average(&[]), None);',text:'验证正常数组、assert_ne! 非空判断以及空切片边界用例。'},{at:'println!("平均值函数测试通过：3 项");',text:'打印第二组断言通过汇总。'}]},
 {title:'运行 cargo test 的常用技巧',body:'cargo test 命令行可以接受两部分参数，用 -- 隔开：-- 前面的传给 cargo 本身，-- 后面的传给编译出来的测试可执行文件。\n日常开发最常用的几条命令记牢就能大幅提升调试效率：\n一、默认并行执行：cargo test 会启动多线程同时跑所有测试，速度很快，但也要求各测试用例之间互不干扰，不要争抢同一个临时文件或全局变量；\n二、如果测试确实要读写共享资源，用 -- --test-threads=1 改成单线程顺序跑；\n三、测试通过时，Rust 默认会把测试里的 println! 隐藏掉以免刷屏；调试时加上 -- --nocapture 就能立刻看到所有打印日志。',code:`cargo test
cargo test divide
cargo test -- --test-threads=1
cargo test -- --nocapture
cargo test -- --ignored`,explain:[{at:'cargo test',text:'运行所有未被 #[ignore] 的单元测试、集成测试和文档测试，默认多线程并行。'},{at:'cargo test divide',text:'按名称过滤：只运行函数名或模块路径里包含 divide 的测试用例，改一小块代码时跑得飞快。'},{at:'cargo test -- --test-threads=1',text:'把参数传给测试程序，限制只用 1 个线程顺序执行，避免读写共享文件或端口的测试互相打架。'},{at:'cargo test -- --nocapture',text:'关闭输出捕获：即使测试通过，也把代码里的 println! 实时显示在终端里，调试很方便。'},{at:'cargo test -- --ignored',text:'专门运行标了 #[ignore] 的耗时测试；如果想连同普通测试一起跑，可用 -- --include-ignored。'}]},
 {title:'集成测试与文档测试：tests/ 目录与 /// 代码块',body:'除了测内部实现的单元测试，Rust 还内置了另外两种非常实用的测试形态：\n一、集成测试（Integration Tests）：\n  - 放在项目根目录的 tests/ 文件夹下（与 src/ 平级），比如 tests/calc_test.rs；\n  - tests/ 里的每个 .rs 文件都会被编译成一个独立的外部 crate，因此它只能调用你库 crate（src/lib.rs）对外公开的 pub API，站在外部用户的视角验证多个模块配合是否正常；\n  - 注意：只有包含 src/lib.rs 的库 crate 才能被 tests/ 导入，这也是工程里常把核心逻辑放到 lib.rs、让 main.rs 保持很薄的重要原因；\n  - 多个集成测试需要共享辅助函数时，把公共代码放进 tests/common/mod.rs（不要直接建 tests/common.rs，否则 Cargo 会把它也当成测试文件来跑）；单独跑某个集成测试文件用 cargo test --test calc_test。\n二、文档测试（Doc Tests）：\n  - 写在库 crate 的 /// 文档注释里、用三个反引号包起来的 Rust 示例，运行 cargo test 时会自动编译并执行！\n  - 只要测试绿灯，你的文档示例就绝不会因为代码改了接口而过时失效；运行 cargo doc --open 生成网页文档时，这些示例还会漂亮地呈现在说明书里。',code:`// --- src/lib.rs ---
/// 计算两数之和。
///
/// \`\`\`
/// assert_eq!(my_math::add(2, 3), 5);
/// \`\`\`
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// --- tests/calc_test.rs ---
#[test]
fn integration_add_works() {
    assert_eq!(my_math::add(10, 20), 30);
}`,explain:[{at:'/// 计算两数之和。',to:'/// ```',text:'/// 是文档注释，里面用三个反引号包起来的示例代码会被 cargo test 自动编译并执行（即文档测试）。'},{at:'pub fn add(a: i32, b: i32) -> i32 {',to:'a + b',text:'库 crate 对外公开的 pub 函数，既可被文档测试调用，也可被集成测试导入。'},{at:'fn integration_add_works() {',to:'assert_eq!(my_math::add(10, 20), 30);',text:'tests/ 下的集成测试不需要写 #[cfg(test)]，Cargo 只在 cargo test 时编译整个 tests/ 目录；它通过包名 my_math 调用公开 API。'}]}
],quiz:[
 {id:'rust-modules-1',q:'关于一个 Rust package（包）里可以包含的 crate 数量，下面哪个说法正确？',options:['最多包含一个二进制 crate 和多个库 crate','最多包含一个二进制 crate 和一个库 crate','最多包含一个库 crate 和多个二进制 crate','可以同时包含任意数量的库和二进制 crate'],why:['一个 package 不允许包含多个库 crate，但允许有多个二进制 crate。','二进制 crate 的数量没有上限，可在 src/bin/ 下放多个入口文件。','','库 crate 最多只有 1 个（src/lib.rs），不能有任意多个。'],answer:2,explain:'Cargo 规定一个 package 至少包含 1 个 crate，最多包含 1 个库 crate，以及任意多个二进制 crate。'},
 {id:'rust-modules-2',q:'关于 Rust 模块的可见性规则，下面哪个说法正确？',options:['子模块能访问父模块的私有条目','父模块能访问子模块的私有条目','结构体加 pub 后字段自动公开','枚举加 pub 后变体仍默认私有'],why:['','父模块不能访问子模块的私有条目，方向刚好相反。','pub struct 的字段默认仍是私有的，需要按需逐个加 pub。','pub enum 的所有变体默认都是公有的，无需再单独写 pub。'],answer:0,explain:'Rust 中一切条目默认私有；子模块可以看到父模块的私有项，父模块看不到子模块的私有项。'},
 {id:'rust-modules-3',type:'judge',q:'用 pub(crate) 修饰的函数可以在当前 crate 里的任意模块访问，但不会被外部依赖该项目的人看到。',answer:true,explain:'pub(crate) 把可见性限定在整个当前 crate 内部，很适合项目内多模块共享实现细节、对外保持简洁接口。'},
 {id:'rust-modules-4',q:'在库 crate 里写 pub use internal::auth::Token; 的主要作用是？',options:['把 Token 限制为仅在当前模块内可见','强制编译器把 Token 复制到独立文件','让 Token 的私有字段全部变为公有','把内部深层路径重导出为简短外部 API'],why:['限制可见性要用私有声明或 pub(super)，不是 pub use。','pub use 只是导出路径别名，不会复制源码或拆分文件。','重导出类型不会改变结构体字段原本的可见性。',''],answer:3,explain:'pub use 重导出可以让内部代码按实现拆成深层模块，同时对外暴露扁平、好用的公开路径。'},
 {id:'rust-modules-5',type:'multi',q:'在 src/lib.rs 里写了一句 mod auth;，编译器会在哪些常见位置寻找 auth 模块的代码？（多选）',options:['src/auth.rs','src/mod_auth.rs','src/auth/mod.rs','tests/auth.rs'],why:['','Rust 不会按 mod_ 前缀拼接文件名来找模块。','','tests/ 目录用于放置集成测试，不存放 crate 内部源码模块。'],answers:[0,2],explain:'写 mod auth; 时，Rust 会查找现代布局 src/auth.rs 或传统布局 src/auth/mod.rs（两者不可同时存在）。'},
 {id:'rust-modules-6',q:'在 Cargo.toml 的 [dependencies] 里写 serde = "1.2.3"（即 ^1.2.3），Cargo 默认允许更新到哪个版本？',options:['只锁定 1.2.3，不接受任何小版本更新','兼容升级到 1.x.y，但小于 2.0.0','可以升级到 2.0.0 及以上的新主版本','仅允许修补号变化，最高到 1.2.9'],why:['精确锁定需要写成 "=1.2.3"，默认的 ^ 允许兼容的次版本与修补版本更新。','','^1.2.3 遵循语义化版本，不会跨越有破坏性变更的主版本 2.0.0。','仅允许修补号变化是 "~1.2.3" 的语义，不是默认的 "^1.2.3"。'],answer:1,explain:'默认脱字符范围 ^1.2.3 允许升级到所有与 1.2.3 兼容的 1.x.y 版本，上限为 < 2.0.0。'},
 {id:'rust-modules-7',type:'judge',q:'放在 tests/ 目录里的集成测试可以直接调用 src/lib.rs 中没有加 pub 的私有函数。',answer:false,explain:'tests/ 里的每个文件都会被编译成独立的外部 crate，仅能调用库 crate 对外公开的 pub API；测私有函数应写在同文件的单元测试里。'},
 {id:'rust-modules-8',q:'运行 cargo test 时，通过的测试默认会隐藏 println! 输出。想在终端里看到打印内容，应运行？',options:['cargo test --release','cargo test -- --ignored','cargo test -- --nocapture','cargo test -- --test-threads=1'],why:['--release 是按发布模式优化编译后再测试，仍然会捕获标准输出。','-- --ignored 只负责运行被 #[ignore] 标记的测试用例。','','-- --test-threads=1 只是改为单线程顺序执行，不会关闭输出捕获。'],answer:2,explain:'传给测试二进制的参数 --nocapture 会关闭输出捕获，让通过的测试也能实时打印 println! 内容。'},
 {id:'rust-modules-9',type:'multi',q:'关于 Rust 的测试机制，下面哪些说法正确？（多选）',options:['#[cfg(test)] 块不会编进普通构建产物','#[should_panic] 用来验证代码触发崩溃','cargo test 默认单线程顺序跑所有测试','库 crate 的 /// 示例代码会被自动测试'],why:['','','cargo test 默认多线程并行跑测试，只有加 -- --test-threads=1 才单线程执行。',''],answers:[0,1,3],explain:'#[cfg(test)] 只在测试构建时编译；#[should_panic] 校验预期 panic；库 crate 的文档注释代码块会自动作为文档测试执行。'},
 {id:'rust-modules-10',type:'fill',q:'在单元测试模块 mod tests 上标注属性＿，可以让编译器只在执行 cargo test 时才编译它。',accepted:['#[cfg(test)]','cfg(test)'],explain:'#[cfg(test)] 是条件编译属性，避免把测试代码和仅用于测试的逻辑编进正常的构建产物。'},
 {id:'rust-modules-11',type:'short',q:'为什么工程里常把核心逻辑放进 src/lib.rs、让 src/main.rs 保持很薄，并且二进制项目和库项目对 Cargo.lock 的提交习惯不同？',reference:'一、拆分 lib.rs 与 main.rs：tests/ 集成测试和 /// 文档测试都只针对库 crate 的 pub API，核心逻辑放进 src/lib.rs 后既方便多层次测试又便于复用，src/main.rs 只负责参数解析、调用库与打印错误。\n二、Cargo.lock 提交习惯：二进制项目（应用、服务、CLI）应提交 Cargo.lock，保证所有开发者和 CI 每次构建出完全一致的依赖版本；库项目通常不提交 Cargo.lock，由最终使用该库的应用程序统一锁定整棵依赖树。',points:['指出 tests/ 集成测试和文档测试面向库 crate（src/lib.rs）','说明核心逻辑进 lib.rs 便于测试与复用，main.rs 保持薄入口','说明二进制项目应提交 Cargo.lock 以保证构建可复现','说明库项目通常不提交 Cargo.lock，由下游应用锁定版本'],explain:'“薄 main.rs + 核心 lib.rs”与区分提交 Cargo.lock 是 Rust 项目组织的两条基本工程约定。'},
 {id:'rust-modules-12',type:'code',q:'在同一文件里写出模块 math（含公有函数 clamp(val: i32, min: i32, max: i32) -> i32，把 val 限制在 [min, max] 内；若 min > max 则 panic!("范围无效")），再写出 #[cfg(test)] mod tests，包含正常边界断言测试与 #[should_panic(expected = "范围无效")] 测试。',reference:'mod math {\n    pub fn clamp(val: i32, min: i32, max: i32) -> i32 {\n        if min > max {\n            panic!("范围无效");\n        }\n        if val < min {\n            min\n        } else if val > max {\n            max\n        } else {\n            val\n        }\n    }\n}\n\n#[cfg(test)]\nmod tests {\n    use super::math::clamp;\n\n    #[test]\n    fn test_clamp_bounds() {\n        assert_eq!(clamp(5, 0, 10), 5);\n        assert_eq!(clamp(-3, 0, 10), 0);\n        assert_eq!(clamp(20, 0, 10), 10);\n    }\n\n    #[test]\n    #[should_panic(expected = "范围无效")]\n    fn test_invalid_range() {\n        clamp(5, 10, 0);\n    }\n}',points:['定义 mod math 及 pub fn clamp，正确处理区间限制与 min > max 时的 panic','使用 #[cfg(test)] mod tests 并通过 super 导入被测函数','编写 #[test] 用 assert_eq! 覆盖中间值、下界和上界','编写 #[should_panic(expected = "范围无效")] 测试非法区间'],explain:'一个标准的单元测试模块会同时覆盖正常边界条件和预期的 panic 分支。'}
]};
