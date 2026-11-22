import type {AiLevel} from '../journey';

// Rust 进阶：第 9 关（泛型与 Trait）与第 10 关（闭包与迭代器）。
export const rustGenerics:AiLevel={
 id:'rust-generics',
 title:'泛型与 Trait',
 summary:'泛型与单态化零开销、trait 定义与约束、常用标准库 trait、孤儿规则与 dyn Trait 动态分发',
 lessons:[
  {title:'泛型函数与结构体：用 <T> 消除重复代码',body:'写程序时经常遇到“逻辑一模一样，只是操作的数据类型不同”的情况：比如分别写一个取两个 i32 较大值的函数、再写一个取两个 f64 较大值的函数。泛型（Generics）就是把“具体类型”抽成占位符（习惯叫 T、U 等单个大写字母），同一份逻辑可以服务多种类型。\n第 4 关声明生命周期 <\'a> 时你已经见过尖括号，泛型类型参数也是写在尖括号里：\n一、泛型函数：fn first_of<T>(items: &[T]) -> Option<&T>，在函数名后声明 <T>，参数和返回值都能使用 T；\n二、泛型结构体与方法：struct Pair<T, U> 可以同时带多个类型参数；给它写方法时要写成 impl<T, U> Pair<T, U>，也可以只给特定具体类型写专属方法（比如 impl Pair<i32, i32>）；\n三、Turbofish（涡轮鱼）语法 ::<T>：大多数时候编译器能根据实参自动推断 T，但遇到像 "42".parse() 或 Vec::new() 这种仅看参数推不出目标类型的调用，就可以用 ::<类型> 显式指定，比如 "42".parse::<i32>()。因为 ::<> 长得像一条张嘴的小鱼，社区就给它起了这个绰号。',code:`struct Pair<T, U> {
    first: T,
    second: U,
}

impl<T, U> Pair<T, U> {
    fn first(&self) -> &T {
        &self.first
    }
}

fn pick_first<T>(a: T, _b: T) -> T {
    a
}

fn demo() {
    let p = Pair { first: "年龄", second: 18 };
    let v = pick_first(10, 20);
    let n = "42".parse::<i32>().unwrap();
    println!("{} = {}, v = {v}, n = {n}", p.first(), p.second);
}`,explain:[{at:'struct Pair<T, U> {',to:'second: U,',text:'定义一个带两个泛型参数 T 和 U 的结构体，两个字段可以是不同类型，也可以是相同类型。'},{at:'impl<T, U> Pair<T, U> {',text:'impl 后面的 <T, U> 声明“接下来用到的 T、U 是泛型参数”，后面的 Pair<T, U> 表示为任意 T、U 组合的 Pair 实现方法。'},{at:'fn first(&self) -> &T {',to:'&self.first',text:'返回第一个字段的不可变引用 &T，调用方拿到的类型自动跟着 T 走。'},{at:'fn pick_first<T>(a: T, _b: T) -> T {',to:'    a',text:'泛型函数：两个参数都用同一个 T，意味着调用时必须传入相同类型的值，返回值也是 T。'},{at:'fn demo() {',text:'示例函数，演示泛型的三种常见用法。'},{at:'let p = Pair { first: "年龄", second: 18 };',text:'编译器自动推断出 p 的类型是 Pair<&str, i32>，不用手写尖括号。'},{at:'let v = pick_first(10, 20);',text:'实参都是默认整数 i32，编译器自动把 T 推断为 i32。'},{at:'let n = "42".parse::<i32>().unwrap();',text:'parse 的返回类型依赖调用者想要哪种类型，这里用 turbofish ::<i32> 明确告诉编译器解析成 i32。'},{at:'println!("{} = {}, v = {v}, n = {n}", p.first(), p.second);',text:'调用泛型方法并打印结果。'}]},
  {title:'单态化（Monomorphization）：为什么泛型没有运行时开销',body:'不少人担心：“把代码写成泛型，程序运行起来会不会多一层类型判断、变慢？”在 Rust 里答案是不会——Rust 的泛型是“零成本抽象”，靠的是编译器的“单态化”（Monomorphization）。\n单态化的意思是：在编译期间，编译器会扫描整个程序，找出每个泛型函数、泛型结构体实际用到了哪些具体类型，然后为每种具体类型分别复制、展开出一份专属的代码。比如泛型函数 id<T>(x: T) -> T 在程序里分别用 i32 和 &str 调用过，编译器就会在底层自动生成 id_i32 和 id_str 两份独立函数，把调用点直接替换成对应的具体函数。\n结果就是：运行时的机器码和你亲手分别写两份具体函数完全一样快，没有装箱（boxing），也没有运行时类型查找。\n不过单态化也不是毫无代价，它是一场典型的“时间换空间”权衡：\n一、代码体积膨胀（Binary Bloat）：如果一个很长的泛型函数被几十种不同类型实例化，最终可执行文件里就会多出几十份机器码，增大二进制体积，也可能影响 CPU 指令缓存命中率；\n二、编译时间变长：编译器要做更多次代码生成和优化。\n日常开发中直接放心用泛型即可；如果写底层库时发现一个庞大的泛型函数只在内部处理切片或路径，可以把不依赖具体类型的核心逻辑抽成非泛型辅助函数，减少重复展开。',code:`fn id<T>(x: T) -> T {
    x
}

// 编译期单态化后，概念上会展开为两个具体函数：
fn id_i32(x: i32) -> i32 {
    x
}

fn id_str(x: &str) -> &str {
    x
}

fn main() {
    let a = id(42);
    let b = id("rust");
    println!("{a} / {b}");
}`,explain:[{at:'fn id<T>(x: T) -> T {',to:'    x',text:'源代码里只写了一份泛型函数 id<T>，接收任意类型 T 并原样返回。'},{at:'fn id_i32(x: i32) -> i32 {',to:'    x',text:'编译器看到 id(42)，在编译期为 i32 生成专属版本（实际符号名由编译器内部修饰，这里用 id_i32 示意）。'},{at:'fn id_str(x: &str) -> &str {',to:'    x',text:'看到 id("rust")，再为 &str 生成另一份专属版本，运行时直接调用，没有任何类型擦除开销。'},{at:'fn main() {',text:'程序入口。'},{at:'let a = id(42);',text:'调用点在编译后直接指向 i32 版本。'},{at:'let b = id("rust");',text:'调用点直接指向 &str 版本。'},{at:'println!("{a} / {b}");',text:'打印 42 / rust。'}]},
  {title:'Trait（特性）：定义类型之间的共享行为',body:'第 3 关讲 Copy 时提过“特性（trait）”这个词，现在正式认识它。Trait 用来定义一组共享的行为（方法签名），告诉编译器：“只要某个类型具备这组能力，就可以用统一的方式操作它。”\n它很像 Java 或 Go 里的接口（interface），但有几处鲜明特点：\n一、定义和实现分离：先用 trait 关键字定义行为契约，再在别处用 impl TraitName for TypeName 给具体类型实现它，不用修改类型定义本身；\n二、支持默认方法实现：trait 里的方法不仅能只写签名（留给实现者填空），还可以直接给出默认函数体；更妙的是，默认方法可以调用同一个 trait 里的其他必填方法！实现者只要补齐必填方法，就能白赚默认方法，也可以按需覆盖默认实现；\n三、没有继承树：Rust 不用“父类 / 子类”继承来复用代码，而是用“结构体组合数据 + trait 抽象行为”。',code:`trait Summary {
    fn headline(&self) -> String;

    fn preview(&self) -> String {
        format!("快讯：{}……", self.headline())
    }
}

struct Article {
    title: String,
    author: String,
}

impl Summary for Article {
    fn headline(&self) -> String {
        format!("《{}》- {}", self.title, self.author)
    }
}`,explain:[{at:'trait Summary {',text:'定义一个叫 Summary 的 trait，描述“能够生成摘要”的能力。'},{at:'fn headline(&self) -> String;',text:'只写方法签名加分号：这是必填方法，每个实现 Summary 的类型都必须自己写出实现。'},{at:'fn preview(&self) -> String {',to:'format!("快讯：{}……", self.headline())',text:'带函数体的是默认方法，它内部可以直接调用同一个 trait 里的 headline。实现者如果不覆盖，就会自动拥有这个行为。'},{at:'struct Article {',to:'author: String,',text:'一个普通的文章结构体，定义本身不需要提到任何 trait。'},{at:'impl Summary for Article {',text:'为 Article 实现 Summary trait。'},{at:'fn headline(&self) -> String {',to:'format!("《{}》- {}", self.title, self.author)',text:'补齐必填的 headline 方法后，Article 就同时拥有了 headline 和默认的 preview 方法。'}]},
  {title:'Trait Bound 约束、where 子句与 impl Trait',body:'如果写一个泛型函数 fn show<T>(x: &T) { println!("{x}"); }，编译器会立刻报错：T 可能是任意类型，凭什么认为它能用 {} 打印？在 Rust 里，泛型函数体只能调用“签名里明确承诺过的能力”，这种承诺叫 Trait Bound（特性约束）。\n写约束有三种常用形式：\n一、标准 Trait Bound：fn show<T: Display + Clone>(x: &T)，用 + 号要求 T 同时满足多个 trait；\n二、impl Trait 语法糖：fn show(x: &(impl Display + Clone))，写起来更简洁。要注意它和 <T: Trait> 的细微差别：fn cmp(a: &impl Display, b: &impl Display) 允许 a 和 b 是两种不同类型，而 fn cmp<T: Display>(a: &T, b: &T) 强制两者必须是同一种具体类型；\n三、where 子句：当泛型参数多、约束又长时，把约束移到返回值后面的 where 块里，函数签名立刻清爽很多。\nimpl Trait 还能写在返回值位置（-> impl Summary），表示“返回某种实现了 Summary 的类型，但不暴露具体类型名”，非常适合返回闭包或复杂迭代器。但它有一条硬限制：函数体内所有分支必须返回**同一种具体类型**，不能在 if 里返回 Article、在 else 里返回 Tweet（需要返回不同具体类型时，后面会讲到 dyn Trait）。',code:`use std::fmt::Display;

fn show_pair<T: Display + Clone>(a: &T, b: &T) {
    let copy = a.clone();
    println!("{copy} & {b}");
}

fn notify(item: &impl Display) {
    println!("通知：{item}");
}

fn combine<T, U>(first: &T, second: &U) -> String
where
    T: Display + Clone,
    U: Display,
{
    format!("{} -> {}", first.clone(), second)
}

fn make_greeting(name: &str) -> impl Display {
    format!("你好，{name}")
}`,explain:[{at:'use std::fmt::Display;',text:'引入标准库的 Display trait，表示“能用 {} 格式化输出”。'},{at:'fn show_pair<T: Display + Clone>(a: &T, b: &T) {',to:'println!("{copy} & {b}");',text:'标准 Trait Bound 写法：用 + 号要求 T 同时实现 Display 和 Clone，且 a、b 必须是同一种具体类型。'},{at:'fn notify(item: &impl Display) {',to:'println!("通知：{item}");',text:'参数位置的 impl Trait 语法糖，简单场景下比写 <T: Display> 更顺手。'},{at:'fn combine<T, U>(first: &T, second: &U) -> String',to:'format!("{} -> {}", first.clone(), second)',text:'多个泛型参数带多重约束时，用 where 子句把约束排在后面，函数名和参数列表一眼就能看清。'},{at:'fn make_greeting(name: &str) -> impl Display {',to:'format!("你好，{name}")',text:'返回值位置的 impl Trait：调用者只知道返回值实现了 Display，不必关心具体类型；注意函数内只能返回单一具体类型（这里是 String）。'}]},
  {title:'动手试试：泛型结构体、自定义 Trait 与默认方法',body:'把前面学到的泛型结构体、带默认方法的自定义 trait、带约束的泛型实现（只为“字段可打印的 Labeled<T>”实现 Describable）、where 子句以及 turbofish 串成一个完整程序跑一遍。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','在 impl<T: std::fmt::Display> Describable for Labeled<T> 里覆盖默认方法 banner，改成 format!("* {} *", self.brief())，重新运行看看输出怎么变。','试着把 impl<T: std::fmt::Display> 里的 : std::fmt::Display 删掉再运行，读一读编译器对 self.value 报的错。看完改回来。'],expect:'【摘要】分数 = 95\n【摘要】版本 = 1.99\n【摘要】解析结果 = 84'},code:`struct Labeled<T> {
    label: String,
    value: T,
}

impl<T> Labeled<T> {
    fn new(label: &str, value: T) -> Self {
        Self {
            label: label.to_string(),
            value,
        }
    }
}

trait Describable {
    fn brief(&self) -> String;

    fn banner(&self) -> String {
        format!("【摘要】{}", self.brief())
    }
}

impl<T: std::fmt::Display> Describable for Labeled<T> {
    fn brief(&self) -> String {
        format!("{} = {}", self.label, self.value)
    }
}

fn print_report<T>(item: &T)
where
    T: Describable,
{
    println!("{}", item.banner());
}

fn main() {
    let score = Labeled::new("分数", 95);
    let version = Labeled::new("版本", "1.99");
    print_report(&score);
    print_report(&version);

    let parsed = "42".parse::<i32>().unwrap();
    let answer = Labeled::new("解析结果", parsed * 2);
    print_report(&answer);
}`,explain:[{at:'struct Labeled<T> {',to:'value: T,',text:'泛型结构体 Labeled<T>，给任意类型的值贴上一个字符串标签。'},{at:'impl<T> Labeled<T> {',to:'value,',text:'通用的构造方法 new，对所有类型 T 都生效；Self 指代当前的 Labeled<T>。'},{at:'trait Describable {',to:'format!("【摘要】{}", self.brief())',text:'自定义 trait：brief 是必填方法，banner 是调用了 brief 的默认方法。'},{at:'impl<T: std::fmt::Display> Describable for Labeled<T> {',to:'format!("{} = {}", self.label, self.value)',text:'有条件地实现 trait：只有当内部的 T 实现了 Display 时，Labeled<T> 才实现 Describable，这样就能放心地用 {} 格式化 self.value。'},{at:'fn print_report<T>(item: &T)',to:'println!("{}", item.banner());',text:'使用 where 子句约束 T 必须实现 Describable，然后统一调用 banner 打印。'},{at:'fn main() {',text:'程序入口。'},{at:'let score = Labeled::new("分数", 95);',to:'print_report(&version);',text:'分别用 i32 和 &str 实例化 Labeled，编译器会单态化出两份代码，都能传给 print_report。'},{at:'let parsed = "42".parse::<i32>().unwrap();',text:'用 turbofish ::<i32> 指定把文字解析成 32 位整数 42。'},{at:'let answer = Labeled::new("解析结果", parsed * 2);',to:'print_report(&answer);',text:'把计算结果 84 装进 Labeled 并打印摘要。'}]},
  {title:'孤儿规则（Orphan Rule）与 Newtype 模式',body:'学完 impl Trait for Type，你可能会想：“Vec<String> 不能直接用 {} 打印，那我在自己项目里写一段 impl std::fmt::Display for Vec<String> 不就行了吗？”\n试着编译时，编译器会直接拒绝，这就是著名的“孤儿规则”（Orphan Rule）：在为一个类型实现一个 trait 时，这个 trait 或这个类型两者之中，至少有一个必须定义在你自己的当前 crate 里。也就是说，你不能给外部类型（比如标准库的 Vec）实现外部 trait（比如标准库的 Display）。\n为什么要定这条规矩？为了保证“相干性”（coherence）：试想如果库 A 给 Vec<String> 实现了一套 Display，库 B 也给 Vec<String> 实现了另一套 Display，当你的项目同时引入 A 和 B 时，编译器根本不知道该用哪一份实现，整个生态就会陷入冲突。孤儿规则确保任何两个独立 crate 都不会打架。\n那如果你确实想给外部类型定制外部 trait 怎么办？Rust 的惯用解法叫 Newtype 模式：用一个单字段的元组结构体把外部类型包一层，比如 struct JoinList(Vec<String>);。现在 JoinList 是你自己 crate 里定义的本地类型，就可以合法地为它实现 Display 了！更棒的是，单字段包装结构体在编译后会被完全擦除，内存布局和里面的 Vec<String> 一模一样，没有任何运行时开销。',code:`use std::fmt;

struct JoinList(Vec<String>);

impl fmt::Display for JoinList {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn demo() {
    let tags = JoinList(vec!["rust".into(), "trait".into()]);
    println!("{tags}");
}`,explain:[{at:'use std::fmt;',text:'引入 std::fmt 模块，里面包含 Display、Formatter 和 Result。'},{at:'struct JoinList(Vec<String>);',text:'Newtype 模式：用单字段元组结构体把标准库的 Vec<String> 包装成本地类型 JoinList。'},{at:'impl fmt::Display for JoinList {',text:'JoinList 是当前 crate 的本地类型，满足孤儿规则，可以合法实现外部的 Display trait。'},{at:'fn fmt(&self, f: &mut fmt::Formatter<\'_>) -> fmt::Result {',to:'write!(f, "[{}]", self.0.join(", "))',text:'用 self.0 取出内部的 Vec<String>，拼成逗号分隔的字符串，通过 write! 宏写入格式化目标 f。'},{at:'fn demo() {',text:'示例函数。'},{at:'let tags = JoinList(vec!["rust".into(), "trait".into()]);',text:'构造一个 JoinList，把两个 &str 转成 String 放进去。'},{at:'println!("{tags}");',text:'现在可以用 {} 直接打印，输出 [rust, trait]。'}]},
  {title:'常用标准库 Trait 全景',body:'Rust 标准库围绕一批核心 trait 运转，理解它们就能看懂绝大多数 Rust 代码：\n一、格式化：Debug 用于调试（{:?}），几乎所有自定义类型都能用 #[derive(Debug)] 自动生成；Display 面向最终用户（{}），需要按自己的文案手动实现；\n二、复制语义：Clone 提供显式的 .clone() 深拷贝；Copy 是标记 trait，让赋值自动按位浅拷贝而不移动所有权（前提是类型已实现 Clone 且所有字段都是 Copy，包含 String 或 Vec 的类型不能 Copy）；\n三、相等比较：PartialEq 解锁 == 和 !=；Eq 在 PartialEq 基础上额外承诺“自反性”（任何值都等于自身）。注意浮点数 f32 / f64 只实现 PartialEq 不实现 Eq，因为 NaN != NaN；\n四、大小排序：PartialOrd 解锁 <、<=、>、>=；Ord 承诺全序（任意两个值都能比出大小），slice::sort 和 BTreeMap 的键都要求 Ord，同样浮点数只有 PartialOrd；\n五、默认值：Default 提供 Type::default() 构造合理初始值，常配合结构体更新语法 ..Default::default() 只填自己关心的字段；\n六、无失败类型转换：From<T> 与 Into<U>。标准库有一条自动实现规则——只要你为目标类型 B 实现了 From<A>，源类型 A 就自动获得了 Into<B>（从而可以调用 a.into()）。所以工程实践是“只写 From，免费用 Into”；可能失败的转换则对应 TryFrom / TryInto。',code:`#[derive(Debug, Clone, PartialEq, Eq, Default)]
struct Profile {
    name: String,
    level: u32,
}

impl From<&str> for Profile {
    fn from(name: &str) -> Self {
        Self {
            name: name.to_string(),
            level: 1,
        }
    }
}

fn demo() {
    let guest = Profile::default();
    let alice = Profile::from("Alice");
    let bob: Profile = "Bob".into();
    println!("{guest:?} / {alice:?} / {bob:?}");
}`,explain:[{at:'#[derive(Debug, Clone, PartialEq, Eq, Default)]',text:'用 derive 宏一次性自动实现五个常用 trait：调试打印、克隆、相等比较和默认值（String 默认是空串，u32 默认是 0）。'},{at:'struct Profile {',to:'level: u32,',text:'因为包含堆上的 String，所以不能派生 Copy，但可以派生 Clone 和 Eq。'},{at:'impl From<&str> for Profile {',to:'level: 1,',text:'实现从 &str 到 Profile 的转换，默认等级设为 1。实现 From 后会自动获得对应的 Into。'},{at:'fn demo() {',text:'示例函数。'},{at:'let guest = Profile::default();',text:'调用 Default::default()，得到 name 为 ""、level 为 0 的默认对象。'},{at:'let alice = Profile::from("Alice");',text:'直接调用 From::from 构造 Profile。'},{at:'let bob: Profile = "Bob".into();',text:'因为实现了 From<&str> for Profile，&str 自动获得了 .into()，结合左侧标注的 Profile 类型完成转换。'},{at:'println!("{guest:?} / {alice:?} / {bob:?}");',text:'用 {:?} 调试格式打印三个 Profile。'}]},
  {title:'动手试试：实现 Display 与 From，融入标准库',body:'写两个温度类型 TempC（摄氏度）和 TempF（华氏度），用 #[derive(...)] 自动派生常用能力，再手动实现 Display 和 From<TempC> for TempF，亲身体验“实现 From 自动解锁 Into”以及 Copy 语义。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','试着在 TempC 的 #[derive(...)] 里加上 Eq 再运行，读一读编译器关于 f64 为什么没实现 Eq 的提示。看完改回来。','把 TempC 的 derive 里的 Copy 删掉再运行，看看 let room_f: TempF = room.into(); 之后再用 room 会报什么错。看完改回来。'],expect:'室温：25.0°C = 77.0°F\n冰点：0.0°C，调试格式：TempC(0.0)\n沸点：212.0°F\nCopy 比较：true'},code:`use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Default)]
struct TempC(f64);

#[derive(Debug, Clone, Copy, PartialEq)]
struct TempF(f64);

impl fmt::Display for TempC {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.1}°C", self.0)
    }
}

impl fmt::Display for TempF {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.1}°F", self.0)
    }
}

impl From<TempC> for TempF {
    fn from(c: TempC) -> Self {
        TempF(c.0 * 9.0 / 5.0 + 32.0)
    }
}

fn main() {
    let room = TempC(25.0);
    let freezing = TempC::default();
    let room_f: TempF = room.into();
    let boil_f = TempF::from(TempC(100.0));

    println!("室温：{room} = {room_f}");
    println!("冰点：{freezing}，调试格式：{freezing:?}");
    println!("沸点：{boil_f}");
    println!("Copy 比较：{}", room == TempC(25.0));
}`,explain:[{at:'use std::fmt;',text:'引入格式化模块，用于手动实现 Display。'},{at:'#[derive(Debug, Clone, Copy, PartialEq, Default)]',to:'struct TempC(f64);',text:'摄氏度 Newtype：内部只有 f64，因此可以同时派生 Copy 和 Default（默认 0.0），但不能派生 Eq。'},{at:'#[derive(Debug, Clone, Copy, PartialEq)]',to:'struct TempF(f64);',text:'华氏度 Newtype，同样是 Copy 且可比较相等。'},{at:'impl fmt::Display for TempC {',to:'write!(f, "{:.1}°C", self.0)',text:'为 TempC 实现面向用户的 Display，保留一位小数并带上 °C。'},{at:'impl fmt::Display for TempF {',to:'write!(f, "{:.1}°F", self.0)',text:'为 TempF 实现 Display，保留一位小数并带上 °F。'},{at:'impl From<TempC> for TempF {',to:'TempF(c.0 * 9.0 / 5.0 + 32.0)',text:'实现从摄氏度到华氏度的转换公式，自动为 TempC 解锁转成 TempF 的 .into()。'},{at:'fn main() {',text:'程序入口。'},{at:'let room = TempC(25.0);',to:'let freezing = TempC::default();',text:'创建 25.0°C 的室温和默认的 0.0°C 冰点。'},{at:'let room_f: TempF = room.into();',text:'调用自动获得的 .into()；因为 TempC 实现了 Copy，这里传值时复制了一份，room 后面仍然有效。'},{at:'let boil_f = TempF::from(TempC(100.0));',text:'直接用 TempF::from 转换 100°C 得到 212.0°F。'},{at:'println!("室温：{room} = {room_f}");',to:'println!("沸点：{boil_f}");',text:'同时对比 Display（{}）和 Debug（{:?}）的输出效果。'},{at:'println!("Copy 比较：{}", room == TempC(25.0));',text:'借助 PartialEq 用 == 比较，也印证了 room 在 into() 后依然可用。'}]},
  {title:'关联类型（Associated Types）与毯子实现',body:'设计一个产出数据的 trait 时，有两种办法表达“输出类型”：\n一、关联类型（Associated Type）：在 trait 内部写 type Output;，方法签名用 Self::Output；\n二、泛型 trait：写成 trait Converter<T>。\n怎么选？核心看“对同一个具体类型，这个 trait 应该实现几次”。\n如果对每种具体类型来说，输出类型是唯一确定的（比如标准库的 Iterator，一个迭代器每次吐出的元素类型 type Item 必然唯一），就用关联类型。好处有两个：一是调用处写约束时不必反复标注额外的泛型参数（写 I: Iterator 比写 I: Iterator<T> 简洁得多）；二是从语法上防止有人给同一个类型实现两份互相打架的 Iterator。\n反过来，如果同一个目标类型需要支持多种来源的转换（比如 String 既要 impl From<&str> 又要 impl From<char>），那就必须用泛型 trait。\n另一个高频技巧叫毯子实现（Blanket Implementation）：给“所有满足某个 trait 约束的类型 T”统一实现另一个 trait，就像一张毯子把符合条件的类型全盖住。标准库最经典的例子是 impl<T: Display + ?Sized> ToString for T——正因为有这行代码，你只要给自己的类型实现了 Display，就能白赚 .to_string() 方法；前面提到的“实现 From 自动送 Into”也是靠毯子实现完成的。',code:`use std::fmt;

trait Parser {
    type Output;
    fn parse(&self) -> Self::Output;
}

struct CsvRow(String);

impl Parser for CsvRow {
    type Output = Vec<String>;

    fn parse(&self) -> Self::Output {
        self.0.split(',').map(|s| s.trim().to_string()).collect()
    }
}

trait TagLine {
    fn tag_line(&self) -> String;
}

impl<T: fmt::Display> TagLine for T {
    fn tag_line(&self) -> String {
        format!("[TAG] {self}")
    }
}`,explain:[{at:'use std::fmt;',text:'引入 fmt 模块以使用 Display 约束。'},{at:'trait Parser {',to:'fn parse(&self) -> Self::Output;',text:'带关联类型 Output 的 trait：每个实现者只需确定唯一一种解析结果类型。'},{at:'struct CsvRow(String);',text:'代表一行逗号分隔的文本。'},{at:'impl Parser for CsvRow {',to:'type Output = Vec<String>;',text:'指定 CsvRow 对应的 Output 是 Vec<String>，调用方不用再写 Parser<Vec<String>>。'},{at:'fn parse(&self) -> Self::Output {',to:'self.0.split(\',\').map(|s| s.trim().to_string()).collect()',text:'按逗号切分并去掉首尾空白，收集成字符串列表（map 和 collect 会在下一关详细讲解）。'},{at:'trait TagLine {',to:'fn tag_line(&self) -> String;',text:'定义一个简单的标签化 trait。'},{at:'impl<T: fmt::Display> TagLine for T {',to:'format!("[TAG] {self}")',text:'毯子实现：为所有实现了 Display 的类型（包括 i32、&str 以及你自己实现了 Display 的类型）统一提供 tag_line 方法。'}]},
  {title:'静态分发 vs 动态分发（dyn Trait）与对象安全',body:'泛型和 impl Trait 走的是“静态分发”（Static Dispatch）：编译期通过单态化确定具体调用哪个函数，可以内联优化、没有额外开销。但它有个局限——一个 Vec<T> 里所有元素必须是同一种具体类型，不能同时装 Circle 和 Rect。\n当你需要一个“异构集合”（比如一个画布里同时存按钮、文本框和圆形），或者运行时才决定具体类型时，就要用“动态分发”（Dynamic Dispatch），写作 trait 对象（Trait Object）：&dyn Draw 或 Box<dyn Draw>。\n一、为什么必须套在引用 & 或 Box 里？因为 Circle 和 Rect 占用的内存大小不同，单看 dyn Draw 编译器在编译期不知道它多大（它不是 Sized），所以必须通过指针来间接访问；\n二、底层原理：&dyn Draw 或 Box<dyn Draw> 是一个“胖指针”（占两个普通指针的宽度）：一半指向堆上或栈上的真实数据，另一半指向该具体类型对应的“虚表”（vtable，里面存着各个 trait 方法的函数地址）。运行时调用方法会先查虚表再跳转，有一点点间接调用开销，也通常没法跨边界内联；\n三、dyn 兼容性（旧称“对象安全”，Object Safety）：并不是所有 trait 都能做成 dyn Trait。如果 trait 里有以下特征，就无法做 trait 对象：方法返回了 Self（擦除具体类型后编译器不知道 Self 占多大空间，标准库的 Clone 就是经典反例）；方法本身带有泛型类型参数 <T>（虚表无法提前穷举无限种类型组合）；或者 trait 要求 Self: Sized。',code:`trait Draw {
    fn draw(&self);
}

// 静态分发：编译期单态化，零虚表开销
fn render_static<T: Draw>(item: &T) {
    item.draw();
}

// 动态分发：接收胖指针（数据指针 + 虚表指针）
fn render_dyn(item: &dyn Draw) {
    item.draw();
}

fn render_all(items: &[Box<dyn Draw>]) {
    for item in items {
        render_dyn(item.as_ref());
    }
}`,explain:[{at:'trait Draw {',to:'fn draw(&self);',text:'Draw 的方法只借用 &self、不返回 Self 也不带泛型参数，满足 dyn 兼容性，可以做成 dyn Draw。'},{at:'fn render_static<T: Draw>(item: &T) {',to:'item.draw();',text:'静态分发：调用几种类型就单态化出几份机器码，速度最快，但每次调用 T 都是单一具体类型。'},{at:'fn render_dyn(item: &dyn Draw) {',to:'item.draw();',text:'动态分发：只生成一份机器码，运行时通过胖指针里的虚表找到对应类型的 draw 实现。'},{at:'fn render_all(items: &[Box<dyn Draw>]) {',to:'render_dyn(item.as_ref());',text:'借用异构列表的切片，列表里可以混合存放不同具体类型，用 as_ref() 取出 &dyn Draw 交给 render_dyn。'}]},
  {title:'动手试试：用 Vec<Box<dyn Trait>> 实现异构图形列表',body:'定义一个 Shape trait，分别给 Circle（圆形）和 Rect（矩形）实现它，然后把两种不同结构体装进同一个 Vec<Box<dyn Shape>>，统一遍历打印面积并求和，同时体验 Box<dyn Shape> 与 &dyn Shape 两种动态分发写法。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','试着再定义一个 Triangle { base: f64, height: f64 } 结构体并实现 Shape（面积 0.5 * base * height），把它也装进 shapes 列表里，体会 describe 和循环一行代码都不用改。','在 trait Shape 里临时加一行 fn copy_self(&self) -> Self; 再运行，看看编译器对“不满足 dyn 兼容”报的详细说明。看完删掉这一行。'],expect:'圆形的面积是 12.56\n矩形的面积是 12.00\n圆形的面积是 3.14\n总面积：27.70'},code:`trait Shape {
    fn name(&self) -> &str;
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Rect {
    width: f64,
    height: f64,
}

impl Shape for Circle {
    fn name(&self) -> &str {
        "圆形"
    }
    fn area(&self) -> f64 {
        3.14 * self.radius * self.radius
    }
}

impl Shape for Rect {
    fn name(&self) -> &str {
        "矩形"
    }
    fn area(&self) -> f64 {
        self.width * self.height
    }
}

fn describe(s: &dyn Shape) {
    println!("{}的面积是 {:.2}", s.name(), s.area());
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![
        Box::new(Circle { radius: 2.0 }),
        Box::new(Rect { width: 3.0, height: 4.0 }),
        Box::new(Circle { radius: 1.0 }),
    ];

    let mut total = 0.0;
    for s in &shapes {
        describe(s.as_ref());
        total += s.area();
    }
    println!("总面积：{:.2}", total);
}`,explain:[{at:'trait Shape {',to:'fn area(&self) -> f64;',text:'定义图形 trait，两个方法都只借用 &self 且不返回 Self，满足 dyn 兼容性。'},{at:'struct Circle {',to:'height: f64,',text:'圆形和矩形是两个大小不同的结构体（Circle 含 1 个 f64，Rect 含 2 个 f64）。'},{at:'impl Shape for Circle {',to:'3.14 * self.radius * self.radius',text:'为 Circle 实现 Shape：返回名称和圆面积。'},{at:'impl Shape for Rect {',to:'self.width * self.height',text:'为 Rect 实现 Shape：返回名称和矩形面积。'},{at:'fn describe(s: &dyn Shape) {',to:'println!("{}的面积是 {:.2}", s.name(), s.area());',text:'接收借用形式的 trait 对象 &dyn Shape，运行时通过虚表调用具体图形的 name 和 area。'},{at:'fn main() {',text:'程序入口。'},{at:'let shapes: Vec<Box<dyn Shape>> = vec![',to:'Box::new(Circle { radius: 1.0 }),',text:'用 Box::new 把不同大小的图形分别放到堆上，再统一转成 Box<dyn Shape> 放进同一个 Vec，组成异构集合。'},{at:'let mut total = 0.0;',to:'total += s.area();',text:'遍历列表：s.as_ref() 把 &Box<dyn Shape> 显式取出为 &dyn Shape 传给 describe，同时累加总面积。'},{at:'println!("总面积：{:.2}", total);',text:'打印全部图形的面积之和 27.70。'}]}
 ],
 quiz:[
  {id:'rust-generics-1',q:'Rust 的泛型为什么在运行时几乎没有额外性能开销？',options:['运行时通过反射缓存泛型方法地址','编译期按具体类型展开为专属代码','泛型值会被统一装箱后放在栈顶上','标准库为常见类型预编了全部版本'],why:['Rust 不靠运行时反射处理泛型，性能损耗不是靠缓存回避的。','','泛型不需要统一装箱，装箱反而会引入堆分配和间接寻址开销。','泛型支持任意用户自定义类型，不可能由标准库提前预编译好。'],answer:1,explain:'Rust 在编译期执行“单态化”（Monomorphization），把泛型按实际用到的具体类型分别展开成专属代码，运行时和手写多份具体函数一样快。'},
  {id:'rust-generics-2',q:'下面这行代码里 ::<i32>（turbofish 语法）的作用是什么？',code:'let n = "42".parse::<i32>().unwrap();',options:['把字符串切片强转成裸整数指针','声明一个名为 i32 的局部宏参数','显式指定泛型函数要使用的类型','告诉编译器跳过解析时的错误检查'],why:['parse 是按字符内容做文本解析，不是内存指针强转。','i32 是目标类型参数，与宏参数无关。','','错误处理由后面的 unwrap 负责，::<i32> 只负责提供类型参数。'],answer:2,explain:'当编译器无法从实参或上下文自动推断出泛型参数时，可以用 turbofish 语法 ::<具体类型> 显式指明目标类型。'},
  {id:'rust-generics-3',type:'judge',q:'函数返回类型写成 -> impl Summary 时，可以在 if / else 两个分支里分别返回两种不同但都实现了 Summary 的结构体。',answer:false,explain:'返回值位置的 impl Trait 底层仍是静态分发，要求函数体所有路径返回同一种具体类型；如果分支需要返回不同具体类型，应改用 Box<dyn Summary> 等动态分发形式。'},
  {id:'rust-generics-4',type:'multi',q:'关于 Rust 的 Trait 与 Trait Bound，下面哪些说法正确？（多选）',options:['trait 默认方法可以调用同 trait 的必填方法','where 子句可以把复杂的约束移到签名后部','可以对外部类型自由实现任意的外部 trait','用 + 号能为一个泛型参数叠加多项约束'],why:['','','这违反了孤儿规则：类型和 trait 至少有一个必须定义在当前 crate 里。',''],answers:[0,1,3],explain:'默认方法可复用同 trait 的其他方法，where 让多约束签名更清晰，+ 可叠加多个 trait bound；但给外部类型实现外部 trait 会被孤儿规则禁止。'},
  {id:'rust-generics-5',q:'想在自己的项目里给标准库的 Vec<String> 实现标准库的 Display，却被孤儿规则拦住，最常用的解法是？',options:['用单字段元组结构体包装后再实现','把 Vec 源码复制到项目里直接修改','给 trait 加上 pub 关键字对外公开','在 Cargo.toml 里关闭相干性检查'],why:['','复制标准库源码既不可行，也无法与标准库原有的 Vec 互通。','pub 控制可见性，不能绕开孤儿规则的归属限制。','Rust 编译器不支持关闭孤儿规则和相干性检查。'],answer:0,explain:'这就是 Newtype 模式：例如 struct Wrapper(Vec<String>);，Wrapper 是本地类型，即可合法实现外部 trait，且编译后没有额外运行时内存开销。'},
  {id:'rust-generics-6',type:'fill',q:'只要为目标类型实现了标准库的 From<T> trait，编译器就会通过毯子实现自动为源类型提供对应的＿ trait，从而可以直接调用 .into() 完成转换。',accepted:['Into','Into<U>','Into<T>'],explain:'标准库内置了 impl<T, U: From<T>> Into<U> for T，因此工程上通常只实现 From，即可免费获得 Into。'},
  {id:'rust-generics-7',q:'标准库中 f64 实现了 PartialEq，却没有实现 Eq，主要原因是什么？',options:['浮点数比较需要在堆上分配临时缓冲区','小数精度受限于二进制无法比较大小','标准库遗漏了为浮点数派生 Eq 的宏','存在 NaN != NaN 不满足自反性要求'],why:['f64 是栈上固定 8 字节标量，比较只需 CPU 指令，不涉及堆分配。','f64 实现了 PartialOrd，常规浮点数可以正常比较大小。','这不是遗漏，而是有意遵守数学语义的设计。',''],answer:3,explain:'Eq 要求自反性（任何值 x 都满足 x == x），而 IEEE 754 规定 NaN != NaN，因此 f32 和 f64 只实现 PartialEq，不实现 Eq。'},
  {id:'rust-generics-8',type:'judge',q:'像标准库中 impl<T: Display + ?Sized> ToString for T 这样，为满足某项约束的所有类型统一实现另一个 trait 的写法，叫作毯子实现（Blanket Implementation）。',answer:true,explain:'毯子实现能按 trait 约束批量提供能力，例如只要实现了 Display 就自动拥有 .to_string() 方法。'},
  {id:'rust-generics-9',q:'设计一个 trait 时，什么情况下更适合使用“关联类型（如 type Item;）”而不是泛型参数 trait Foo<T>？',options:['希望调用者在每次传参时都手写类型','每个实现类型对应的输出类型唯一确定','需要对同一目标类型实现多种来源转换','需要让方法在运行时动态切换返回类型'],why:['关联类型的优势恰恰是省去调用处重复填写泛型参数。','','同一类型需要多次实现（如 From<i32> 和 From<&str>）时应使用泛型 trait。','关联类型在编译期就已确定具体类型，不是运行时动态切换。'],answer:1,explain:'当一个具体类型对该 trait 只应有一种自然输出类型（例如 Iterator 的元素类型 Item）时，用关联类型能让签名更简洁并避免歧义实现。'},
  {id:'rust-generics-10',type:'multi',q:'下面哪些方法特征会导致 trait 无法作为 dyn Trait（不满足 dyn 兼容性 / 对象安全）？（多选）',options:['方法接收不可变借用参数 &self','方法直接按值返回 Self 类型本身','方法自身带有泛型类型参数 <T>','trait 为该方法提供了默认实现'],why:['&self 是最标准的 dyn 兼容接收者形式。','','','提供默认方法实现本身不会破坏 dyn 兼容性。'],answers:[1,2],explain:'返回 Self 会让擦除具体类型后的调用方无法确定返回值大小；方法带泛型参数则无法在虚表中穷举无限种实例化。两者都会破坏 dyn 兼容性。'},
  {id:'rust-generics-11',type:'fill',q:'在 Rust 中声明特征对象（使用动态分发）的关键字是＿，例如 Box<dyn Draw> 或 &dyn Draw。',accepted:['dyn'],explain:'dyn 是 dynamic 的缩写，显式标明此处通过虚表进行动态分发，与编译期静态分发的 impl Trait 清晰区分。'},
  {id:'rust-generics-12',q:'对比静态分发（泛型 / impl Trait）与动态分发（&dyn Trait / Box<dyn Trait>），哪项描述更准确？',options:['静态分发借助虚表支持存放异构集合','动态分发在编译期展开避免虚表查询','静态分发零虚表开销而动态支持异构','动态分发在栈上无需指针即可直接存'],why:['借助虚表支持异构集合的是动态分发，不是静态分发。','编译期展开单态化的是静态分发，动态分发会通过虚表分发。','','dyn Trait 大小在编译期未知，必须放在 & 或 Box 等指针后面。'],answer:2,explain:'静态分发在编译期单态化、无虚表查询开销且可内联；动态分发借助“数据指针 + 虚表指针”组成的胖指针，在运行时支持异构集合。'},
  {id:'rust-generics-13',type:'short',q:'简述什么是 Rust 的“孤儿规则（Orphan Rule）”，为什么编译器要强制这条规则，以及开发中如果确实想给外部类型实现外部 trait 该怎么解决。',reference:'孤儿规则规定：在为某个类型实现某个 trait 时，该类型或该 trait 两者之中至少有一个必须定义在当前 crate 中，不能在本地给外部类型实现外部 trait。编译器强制这条规则是为了保证“相干性”（coherence），防止两个不同的第三方 crate 各自为同一个外部类型实现同一个外部 trait，导致同时引入它们时产生无法解决的实现冲突。若确实有此需求，可用 Newtype 模式解决：在本地定义一个单字段元组结构体（如 struct Wrapper(Vec<String>);）把外部类型包一层，再为这个本地包装类型实现外部 trait，且编译后没有额外运行时开销。',points:['准确说出孤儿规则内容：类型和 trait 至少有一个在当前 crate 定义','说明原因：保证相干性，避免多个 crate 对同一“外部类型 + 外部 trait”给出冲突实现','给出解法：使用 Newtype 模式（单字段元组结构体包装）','补充 Newtype 属于本地类型且零运行时开销（加分点）'],explain:'孤儿规则是 Rust 生态能够安全组合大量第三方 crate 的基础，而 Newtype 模式是绕开限制的标准惯用法。'},
  {id:'rust-generics-14',type:'code',q:'定义一个 trait Printable，要求实现方法 fn label(&self) -> String，并提供一个默认方法 fn show(&self) 打印 "[标签] {}"。再定义结构体 Task { title: String } 实现 Printable，写一个使用 &impl Printable 参数的函数 print_item 调用 show，最后在 main 中演示调用。',reference:'trait Printable {\n    fn label(&self) -> String;\n    fn show(&self) {\n        println!("[标签] {}", self.label());\n    }\n}\n\nstruct Task {\n    title: String,\n}\n\nimpl Printable for Task {\n    fn label(&self) -> String {\n        self.title.clone()\n    }\n}\n\nfn print_item(item: &impl Printable) {\n    item.show();\n}\n\nfn main() {\n    let task = Task {\n        title: String::from("完成泛型练习"),\n    };\n    print_item(&task);\n}',points:['正确定义 trait Printable，含必填方法 label 与默认方法 show','默认方法 show 内部调用 self.label() 并打印指定格式','定义 Task 结构体并为其实现 Printable 的 label 方法','print_item 签名使用 &impl Printable（或等效泛型约束）并调用 show','main 中构造 Task 并传入 print_item'],explain:'默认方法可以直接复用同一个 trait 中的必填方法，参数位置的 &impl Printable 则是简洁的静态分发约束写法。'}
 ]
};

export const rustIterators:AiLevel={
 id:'rust-iterators',
 title:'闭包与迭代器',
 summary:'闭包捕获语义与 Fn/FnMut/FnOnce、move 关键字、Iterator trait、惰性适配器链与零成本抽象',
 lessons:[
  {title:'闭包（Closure）基础：把一段逻辑当值传递',body:'闭包是可以存进变量、也可以当参数传给其他函数的“匿名函数”。语法用两条竖线包住参数：|x| x + 1；多个参数用逗号隔开 |a, b| a + b；没有参数写 || ...；函数体不止一行就套上花括号。\n闭包和普通 fn 函数有两个最核心的区别：\n一、类型自动推断并锁定：普通 fn 必须手写每个参数和返回值的类型，而闭包通常可以省略类型标注，编译器会根据你**第一次**调用它时传入的实参自动推断出类型。要注意，一旦推断确定就会被锁定——比如同一个闭包先传了 String，后面再传 i32 就会编译报错；\n二、可以捕获环境：闭包能够直接使用定义它时所在作用域里的局部变量，普通 fn 做不到这一点。正是这个能力让闭包特别适合写回调、排序规则和迭代器处理逻辑。',code:`fn main() {
    let factor = 3;
    let scale = |x| x * factor;
    let add = |a: i32, b: i32| -> i32 {
        a + b
    };

    println!("scale(5) = {}", scale(5));
    println!("add(2, 4) = {}", add(2, 4));
}`,explain:[{at:'fn main() {',text:'程序入口。'},{at:'let factor = 3;',text:'外层作用域里的普通局部变量。'},{at:'let scale = |x| x * factor;',text:'定义一个闭包：省去了参数 x 和返回值类型，同时捕获了外层的 factor。'},{at:'let add = |a: i32, b: i32| -> i32 {',to:'a + b',text:'闭包也可以像普通函数一样显式写全参数类型、返回值类型和花括号函数体。'},{at:'println!("scale(5) = {}", scale(5));',text:'第一次调用把 x 推断为 i32，算出 15；此后 scale 的参数类型就锁定为 i32。'},{at:'println!("add(2, 4) = {}", add(2, 4));',text:'调用带显式标注的多参数闭包，打印 6。'}]},
  {title:'闭包如何捕获外部变量与 move 关键字',body:'闭包使用外部变量时，不用你手动选择“按引用还是按值捕获”，Rust 编译器会严格遵循“最小权限原则”，根据闭包体里对变量做了什么自动决定：\n一、只读取：按不可变借用（&T）捕获。只要闭包还在，外部依然可以同时不可变地读取原变量；\n二、会修改：按可变借用（&mut T）捕获。这时存放闭包的变量本身必须加 mut，而且在闭包最后一次调用之前，外层不能再访问这个变量；\n三、消耗所有权：比如在闭包里把一个 String 传给 drop 或作为返回值移出，闭包会直接拿走它的所有权（T）。\n如果你希望不管闭包体是不是只读，都**强制**把用到的外部变量所有权移进闭包，就在参数前面加上 move 关键字：move |...| ...。常见场景是把闭包交给另一个线程，或从函数里把闭包返回出去——原作用域马上就结束了，闭包里如果还留着借用就会变成悬垂引用，必须用 move 把数据带走（对 i32 这类 Copy 类型，move 则是复制一份进去）。',code:`fn demo() {
    let text = String::from("Rust");
    let read_only = || println!("只读：{text}");
    read_only();
    println!("原变量还能读：{text}");

    let mut total = 0;
    let mut add_one = || total += 1;
    add_one();
    println!("修改后的 total = {total}");

    let owner = move || println!("已移交所有权：{text}");
    owner();
}`,explain:[{at:'fn demo() {',text:'示例函数，依次演示三种捕获方式。'},{at:'let text = String::from("Rust");',text:'一个拥有堆数据的 String。'},{at:'let read_only = || println!("只读：{text}");',to:'println!("原变量还能读：{text}");',text:'闭包体只读取 text，因此按不可变引用 &String 捕获；调用前后外层都能继续读取 text。'},{at:'let mut total = 0;',to:'add_one();',text:'闭包体修改了 total，按可变引用 &mut i32 捕获，所以 add_one 本身也必须声明为 mut。'},{at:'println!("修改后的 total = {total}");',text:'add_one 已用完，可变借用结束，外层可以重新读取到更新后的 total = 1。'},{at:'let owner = move || println!("已移交所有权：{text}");',to:'owner();',text:'加上 move 后，即使闭包体只是打印，text 的所有权也已经被移进 owner，这之后外层就不能再用 text 了。'}]},
  {title:'三个函数 Trait：FnOnce、FnMut、Fn',body:'在 Rust 里，每个闭包都会生成自己独一无二的匿名类型（里面装着它捕获的变量），所以接收闭包作为参数的高阶函数必须用泛型或 impl Trait 来约束。标准库提供了三个逐层包含的函数 trait：\n一、FnOnce：表示“至少可以被调用一次”。所有闭包都实现它；如果闭包体把捕获变量的所有权移出去了（比如 drop 掉或直接返回），那它调用一次后数据就没了，因此只实现 FnOnce；\n二、FnMut：表示“可以多次调用，调用时可能会修改捕获的变量”。实现 FnMut 的闭包自动也实现了 FnOnce；\n三、Fn：表示“可以多次调用，而且不会修改捕获的变量（只不可变借用或不捕获）”。实现 Fn 的闭包自动也实现了 FnMut 和 FnOnce。\n记忆层级：Fn ⊂ FnMut ⊂ FnOnce（能力要求从左到右越来越宽松）。\n一个容易踩的误区：加上 move 关键字并不等于闭包就只能实现 FnOnce！move 决定的是“创建闭包时怎么捕获”，而实现 Fn / FnMut / FnOnce 取决于“调用闭包时怎么用它”。比如 move || println!("{text}") 虽然移走了 text，但调用时只是读取它，所以可以调用无数次，依然实现了 Fn。\n写高阶函数时的经验法则：只调一次写 FnOnce，需要反复调用且允许修改外部状态写 FnMut，只读反复调用写 Fn；而且普通 fn 函数天然实现了全部三个 trait，可以直接传进去！',code:`fn run_once<F: FnOnce() -> String>(f: F) -> String {
    f()
}

fn repeat_three<F: FnMut(usize)>(mut f: F) {
    for i in 0..3 {
        f(i);
    }
}

fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(f(x))
}`,explain:[{at:'fn run_once<F: FnOnce() -> String>(f: F) -> String {',to:'f()',text:'最宽松的约束：函数体内只调用 f 一次，所以无论传入 Fn、FnMut 还是只能调一次的 FnOnce 闭包都接收。'},{at:'fn repeat_three<F: FnMut(usize)>(mut f: F) {',to:'f(i);',text:'循环里反复调用，且允许闭包内部修改捕获的状态；调用 FnMut 需要可变绑定，所以参数写成 mut f。'},{at:'fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {',to:'f(f(x))',text:'最严格的约束：只接受不修改捕获状态的 Fn 闭包（或者普通 fn 函数），因此 f 不需要 mut，甚至可以在多线程间安全共享调用。'}]},
  {title:'动手试试：三种闭包捕获、move 与高阶函数',body:'把不可变借用捕获、可变借用捕获、move 移交所有权，以及把闭包和普通函数同时传给高阶函数 apply_twice 放在一个程序里跑一遍。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','在 consume(); 的下一行加上 println!("{tag}"); 再运行，观察编译器指出 tag 在 move 闭包处已经被移动。看完删掉这一行。','在 main 里试着把 consume(); 多写一遍（连调两次），体会“带 move 但只读取的闭包依然实现 Fn，可以多次调用”。'],expect:'不可变借用捕获：15，base 仍可用：10\n可变借用捕获：第 1 次，第 2 次\n调用结束后 count = 2\nmove 拿走了：Rust\n闭包传给高阶函数：10\n普通函数也能传入：12'},code:`fn apply_twice<F>(f: F, x: i32) -> i32
where
    F: Fn(i32) -> i32,
{
    f(f(x))
}

fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let base = 10;
    let add_base = |x| x + base;
    println!("不可变借用捕获：{}，base 仍可用：{base}", add_base(5));

    let mut count = 0;
    let mut bump = || {
        count += 1;
        count
    };
    let first = bump();
    let second = bump();
    println!("可变借用捕获：第 {first} 次，第 {second} 次");
    println!("调用结束后 count = {count}");

    let tag = String::from("Rust");
    let consume = move || {
        println!("move 拿走了：{tag}");
    };
    consume();

    let plus_three = |n| n + 3;
    println!("闭包传给高阶函数：{}", apply_twice(plus_three, 4));
    println!("普通函数也能传入：{}", apply_twice(double, 3));
}`,explain:[{at:'fn apply_twice<F>(f: F, x: i32) -> i32',to:'f(f(x))',text:'高阶函数：把传入的函数 f 连续作用在 x 上两次，使用 where 子句约束 F: Fn(i32) -> i32。'},{at:'fn double(n: i32) -> i32 {',to:'n * 2',text:'一个普通的具名函数，用来验证普通 fn 也能直接满足 Fn 约束。'},{at:'fn main() {',text:'程序入口。'},{at:'let base = 10;',to:'println!("不可变借用捕获：{}，base 仍可用：{base}", add_base(5));',text:'add_base 只读取 base，属于不可变借用捕获，所以同时还能在外面打印 base。'},{at:'let mut count = 0;',to:'println!("调用结束后 count = {count}");',text:'bump 每次调用都让 count 加 1，属于可变借用捕获（FnMut）；两次调用结束后借用释放，外层就能读取到 count = 2。'},{at:'let tag = String::from("Rust");',to:'consume();',text:'move 关键字把 tag 的所有权移进了闭包内部，之后不能再在外层使用 tag，但闭包本身因为只读 tag 仍实现了 Fn。'},{at:'let plus_three = |n| n + 3;',to:'println!("普通函数也能传入：{}", apply_twice(double, 3));',text:'apply_twice 既能接收闭包（4+3+3=10），也能直接接收普通函数 double（3*2*2=12）。'}]},
  {title:'Iterator Trait 与 for 循环的底层原理',body:'迭代器（Iterator）是 Rust 里处理一系列数据的统一抽象。打开标准库看它的核心定义，你会惊讶于它的极简——只需要一个关联类型 Item 和一个必填方法 next：\n一、type Item; 声明这个迭代器每次吐出的元素类型；\n二、fn next(&mut self) -> Option<Self::Item>; 每次调用推进内部游标，有下一个元素就返回 Some(元素)，全部遍历完了就返回 None。因为要推进状态，所以手动调用 next() 时迭代器变量必须是 mut。\n其实你早在第 2 关就用过迭代器了：for x in collection { ... } 在底层并不是魔法，编译器会自动把它脱糖成两步——先调用 IntoIterator::into_iter(collection) 拿到迭代器，再用 while let Some(x) = iter.next() { ... } 一直拉取直到遇到 None。这也是为什么范围 1..5、数组、Vec、HashMap 甚至你自己实现的类型都能直接放进 for 循环。',code:`// 标准库 Iterator 的核心骨架：
// trait Iterator {
//     type Item;
//     fn next(&mut self) -> Option<Self::Item>;
// }

fn demo() {
    let nums = [10, 20];
    let mut it = nums.iter();
    assert_eq!(it.next(), Some(&10));
    assert_eq!(it.next(), Some(&20));
    assert_eq!(it.next(), None);

    let mut it2 = nums.into_iter();
    while let Some(x) = it2.next() {
        println!("等价于 for 循环：{x}");
    }
}`,explain:[{at:'fn demo() {',text:'示例函数，演示手动驱动迭代器和 for 循环的等价写法。'},{at:'let nums = [10, 20];',text:'一个包含两个整数的数组。'},{at:'let mut it = nums.iter();',text:'创建借用迭代器；因为调用 next 会改变内部位置，it 必须是 mut。'},{at:'assert_eq!(it.next(), Some(&10));',to:'assert_eq!(it.next(), None);',text:'前两次调用依次吐出 Some(&10) 和 Some(&20)，耗尽后返回 None。'},{at:'let mut it2 = nums.into_iter();',to:'println!("等价于 for 循环：{x}");',text:'这就是 for x in nums 在编译器内部的真实展开形式：先转迭代器，再循环调用 next 直到 None。'}]},
  {title:'三种迭代方式对比：iter()、iter_mut()、into_iter()',body:'对 Vec<T> 这类集合做迭代时，Rust 严格区分所有权，提供了三种方法，分别对应三种 for 循环写法：\n一、v.iter()（对应 for x in &v）：产出 &T（不可变引用）。只读遍历，结束后原集合 v 完好无损，可以继续使用；\n二、v.iter_mut()（对应 for x in &mut v）：产出 &mut T（可变引用）。可以原地修改每个元素（比如 *x *= 2），结束后 v 依然可用且已经变成新值；\n三、v.into_iter()（对应 for x in v）：产出 T（元素所有权）。会把整个集合 v 消费掉、拆出一个个拥有所有权的元素，循环结束后 v 不能再用（除非像 [i32; 3] 这种 Copy 数组）。\n新手高频踩坑：写完 for name in names { println!("{name}"); } 之后又想再用 names，编译器报 borrow of moved value——原因就是 for name in names 默认调用了 into_iter() 把 names 移走了！只需要只读遍历时，养成习惯写 for name in &names 或 names.iter()。',code:`fn demo() {
    let mut nums = vec![1, 2, 3];

    for n in nums.iter() {
        println!("只读借用：{n}");
    }

    for n in nums.iter_mut() {
        *n *= 10;
    }

    let names = vec![String::from("Alice"), String::from("Bob")];
    for name in names.into_iter() {
        println!("拿到所有权：{name}");
    }
    // 这里 nums 仍可用（[10, 20, 30]），而 names 已被消费
}`,explain:[{at:'fn demo() {',text:'示例函数，把三种迭代方式放在一起对比。'},{at:'let mut nums = vec![1, 2, 3];',text:'因为后面要做可变迭代，nums 声明为 mut。'},{at:'for n in nums.iter() {',to:'println!("只读借用：{n}");',text:'iter() 产出 &i32，只读不消费，等价于 for n in &nums。'},{at:'for n in nums.iter_mut() {',to:'*n *= 10;',text:'iter_mut() 产出 &mut i32，解引用 *n 就能把元素原地改成 10、20、30，等价于 for n in &mut nums。'},{at:'let names = vec![String::from("Alice"), String::from("Bob")];',text:'存放拥有堆数据的 String 列表。'},{at:'for name in names.into_iter() {',to:'println!("拿到所有权：{name}");',text:'into_iter() 消费 names 并直接移出每个 String 的所有权，等价于 for name in names；结束后 names 不再有效。'}]},
  {title:'惰性求值与常用迭代器适配器（Adapters）',body:'迭代器方法分两大类：把一个迭代器变成另一个新迭代器的叫“适配器”（Adapter），把迭代器彻底跑完算出结果的叫“消费器”（Consumer）。\nRust 迭代器最重要的一条性质是“惰性求值”（Lazy Evaluation）：你写 v.iter().filter(...).map(...) 时，里面的闭包一行都不会立刻执行，也不会生成任何中间 Vec！它只是把一层层规则套在一起拼成一条待命的管道，直到后面接上消费器（或放进 for 循环）拉取元素，数据才会一个接一个流过整条管道。如果你只调用了适配器却不消费它，编译器还会贴心给出 unused Map that must be used 警告。\n日常最高频的适配器有这些：\n一、map：把每个元素按闭包规则一一映射成新值；\n二、filter：只保留闭包返回 true 的元素（注意：iter() 产出 &T，filter 再借一次就成了 &&T，闭包参数常写成 |&&x| 或解引用）；\n三、filter_map：过滤和转换一步完成，闭包返回 Option，留下 Some(新值)、丢掉 None；\n四、flat_map：把每个元素展开成多个元素再拍平成一条流；\n五、enumerate：给每个元素配对从 0 开始的下标，产出 (usize, Item)；\n六、zip：把两个迭代器按位置一一配对成元组，谁先结束就停在哪；\n七、take(n) / skip(n)：只取前 n 个 / 跳过前 n 个，配合惰性求值，即使对 0.. 这种无限迭代器也能安全截取。',code:`fn demo() {
    let words = ["10", "x", "20", "30"];
    let nums: Vec<i32> = words
        .iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .skip(1)
        .take(2)
        .collect();

    let tags = ["A", "B"];
    for (idx, (tag, n)) in tags.iter().zip(nums.iter()).enumerate() {
        println!("#{idx}: {tag} -> {n}");
    }

    let chars: Vec<char> = ["hi", "rs"]
        .iter()
        .flat_map(|s| s.chars())
        .collect();
    println!("{chars:?}");
}`,explain:[{at:'fn demo() {',text:'示例函数，演示常用适配器的链式组合。'},{at:'let words = ["10", "x", "20", "30"];',text:'混杂着非法数字的字符串数组。'},{at:'let nums: Vec<i32> = words',to:'.filter_map(|s| s.parse::<i32>().ok())',text:'parse 返回 Result，.ok() 把它转成 Option：成功留下 Some(数字)，"x" 变成 None 被 filter_map 自动丢弃。'},{at:'.skip(1)',to:'.collect();',text:'跳过第一个有效数字 10，再取接下来的 2 个（20 和 30），最后用 collect 驱动整条管道算出 Vec。'},{at:'let tags = ["A", "B"];',to:'println!("#{idx}: {tag} -> {n}");',text:'zip 把 tags 和 nums 配对成 ("A", 20)、("B", 30)，enumerate 再在外面套上序号 0、1。'},{at:'let chars: Vec<char> = ["hi", "rs"]',to:'println!("{chars:?}");',text:'flat_map 把每个字符串拆成字符流并拍平，最终收集成 [\'h\', \'i\', \'r\', \'s\']。'}]},
  {title:'消费器（Consumers）：驱动管道产出最终结果',body:'消费器会在内部反复调用 next()，把惰性的迭代器链真正跑起来并交出最终结果（同时消费掉这个迭代器）：\n一、collect()：最万能的消费器，只要目标容器实现了 FromIterator 都能收集，比如 Vec、HashMap、String。因为目标类型不唯一，需要靠左侧变量类型标注（let v: Vec<_> = ...）或 turbofish（.collect::<Vec<_>>()）指定，里面的下划线 _ 让编译器自动推断元素类型；\n二、collect::<Result<Vec<_>, _>>()：超实用黑科技！当你手里是一串 Result<T, E> 时，这样收集会按顺序检查——全成功就得到 Ok(Vec<T>)，只要遇到第一个 Err 就立刻短路停止并返回那个 Err；\n三、fold(初始值, |累计, 元素| ...) 与 reduce(|累计, 元素| ...)：把整条流归约成一个值。区别是 fold 需要给初始值，空迭代器直接返回初始值；reduce 用第一个元素当初始值，所以返回 Option（空迭代器返回 None）；\n四、sum() / count()：求和与计数，sum 通常需要标注结果类型如 .sum::<i32>()；\n五、any / all / find：带“短路求值”的查找消费器——比如 any 只要找到第一个满足条件的元素就会立刻返回 true，后面的元素根本不会再算！',code:`fn demo() {
    let squares = (1..=4).map(|x| x * x).collect::<Vec<_>>();
    let product = squares.iter().fold(1, |acc, &x| acc * x);
    let max_val = squares.iter().copied().reduce(|a, b| a.max(b));

    let ok_res = ["1", "2", "3"]
        .iter()
        .map(|s| s.parse::<i32>())
        .collect::<Result<Vec<_>, _>>();

    let has_even = squares.iter().any(|&x| x % 2 == 0);
    let first_gt_5 = squares.iter().find(|&&x| x > 5);
    println!("{product}, {max_val:?}, {ok_res:?}, {has_even}, {first_gt_5:?}");
}`,explain:[{at:'fn demo() {',text:'示例函数，集中演示常用消费器。'},{at:'let squares = (1..=4).map(|x| x * x).collect::<Vec<_>>();',text:'用 turbofish 指定收集成 Vec，下划线 _ 让编译器自动推导出元素类型 i32，得到 [1, 4, 9, 16]。'},{at:'let product = squares.iter().fold(1, |acc, &x| acc * x);',text:'fold 从初始值 1 开始累乘，得到 576。'},{at:'let max_val = squares.iter().copied().reduce(|a, b| a.max(b));',text:'copied() 把 &i32 复制成 i32，reduce 用首元素作初始值求最大值，返回 Some(16)。'},{at:'let ok_res = ["1", "2", "3"]',to:'.collect::<Result<Vec<_>, _>>();',text:'把一串 Result 聚合成单个 Result：全部成功得到 Ok([1, 2, 3])，若中途有任意一项失败则立即短路返回 Err。'},{at:'let has_even = squares.iter().any(|&x| x % 2 == 0);',text:'any 遇到 4 就发现满足偶数条件，立刻短路返回 true，不再检查 9 和 16。'},{at:'let first_gt_5 = squares.iter().find(|&&x| x > 5);',text:'find 返回第一个大于 5 的元素引用 Some(&9)；注意 find 对迭代器元素再借用一次，所以闭包里是 &&x。'},{at:'println!("{product}, {max_val:?}, {ok_res:?}, {has_even}, {first_gt_5:?}");',text:'打印各项消费器的计算结果。'}]},
  {title:'动手试试：用迭代器链处理订单数据并统计汇总',body:'把前面学的 filter、map、filter_map、sum、collect、any、find 组合起来，处理一组真实的订单数据，感受声明式迭代器链比手写多层 if 和临时变量有多清爽。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 raw 那一段改成 let parsed: Result<Vec<i32>, _> = raw.iter().map(|s| s.parse::<i32>()).collect(); 并打印 {:?}，看看遇到 "abc" 时如何立刻返回 Err。','在 orders.iter().any(...) 的闭包里加一句 println!("检查 {}", o.id);，把 200.0 改成 40.0 再运行，亲眼观察短路求值：检查完 101 就立刻停手了。'],expect:'已支付订单：[101, 103, 104]\n已支付总金额：398.00\n有大额已付单：true，首笔未付单：Some(102)\n有效数字：[10, 25, 5]，合计：40'},code:`struct Order {
    id: u32,
    amount: f64,
    paid: bool,
}

fn main() {
    let orders = vec![
        Order { id: 101, amount: 49.5, paid: true },
        Order { id: 102, amount: 120.0, paid: false },
        Order { id: 103, amount: 88.0, paid: true },
        Order { id: 104, amount: 260.5, paid: true },
    ];

    let paid_ids: Vec<u32> = orders
        .iter()
        .filter(|o| o.paid)
        .map(|o| o.id)
        .collect();
    println!("已支付订单：{:?}", paid_ids);

    let paid_total: f64 = orders
        .iter()
        .filter(|o| o.paid)
        .map(|o| o.amount)
        .sum();
    println!("已支付总金额：{:.2}", paid_total);

    let has_big = orders.iter().any(|o| o.paid && o.amount >= 200.0);
    let first_unpaid = orders.iter().find(|o| !o.paid).map(|o| o.id);
    println!("有大额已付单：{has_big}，首笔未付单：{:?}", first_unpaid);

    let raw = ["10", "abc", "25", "5"];
    let valid: Vec<i32> = raw
        .iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("有效数字：{:?}，合计：{}", valid, valid.iter().sum::<i32>());
}`,explain:[{at:'struct Order {',to:'paid: bool,',text:'订单结构体：包含编号、金额和是否已支付。'},{at:'fn main() {',text:'程序入口。'},{at:'let orders = vec![',to:'Order { id: 104, amount: 260.5, paid: true },',text:'构造四笔测试订单，其中 102 未支付。'},{at:'let paid_ids: Vec<u32> = orders',to:'println!("已支付订单：{:?}", paid_ids);',text:'先借用迭代（不消费 orders），筛选出已支付的，再映射出订单号收集成 Vec。'},{at:'let paid_total: f64 = orders',to:'println!("已支付总金额：{:.2}", paid_total);',text:'orders 仍然可用；这次把已支付订单的金额直接交给 sum 累加，全程不分配任何中间列表。'},{at:'let has_big = orders.iter().any(|o| o.paid && o.amount >= 200.0);',text:'any 判断是否存在大额已支付订单，找到 104 后立刻短路返回 true。'},{at:'let first_unpaid = orders.iter().find(|o| !o.paid).map(|o| o.id);',text:'find 返回 Option<&Order>，这里顺手调用 Option 自己的 map 提取出订单号，得到 Some(102)。'},{at:'println!("有大额已付单：{has_big}，首笔未付单：{:?}", first_unpaid);',text:'打印查询结果。'},{at:'let raw = ["10", "abc", "25", "5"];',to:'println!("有效数字：{:?}，合计：{}", valid, valid.iter().sum::<i32>());',text:'用 filter_map 一步过滤掉无法解析的 "abc" 并拿到整数列表，再用 turbofish 版 sum 求和。'}]},
  {title:'自定义 Iterator 与零成本抽象',body:'想让你自己的结构体也支持 for 循环、map、filter、zip、sum 等几十个标准库方法，做法简单得惊人：只要为它实现 Iterator trait，写好关联类型 type Item 和唯一的必填方法 next，标准库里那几十个默认方法就全部免费到手！\n下面写一个按页切分偏移量的分页迭代器 PageOffsets，每次 next 吐出当前页的起止下标，到总数为止返回 None。\n最后回答一个大家最关心的问题：写这么长一串 .iter().filter(...).map(...).sum()，会不会比手写 for 循环慢？\n在发布版（cargo build --release）里，两者几乎一样快，有时迭代器链甚至更快！这就是 Rust 引以为傲的“零成本抽象”（Zero-Cost Abstraction），背后有三层原因：\n一、无中间分配：适配器是惰性的，不会每步都新建临时 Vec，元素逐个流过；\n二、单态化与内联：每个适配器（Filter、Map 等）和每个闭包都是具体泛型类型，编译期单态化后没有任何虚表间接调用，LLVM 优化器会把嵌套的 next() 全部内联融合成一个紧致的单层循环；\n三、消除越界检查：手写下标访问 nums[i] 每次都要做数组越界检查，而切片迭代器内部直接推进指针，更容易去掉多余检查、触发 CPU 向量化（SIMD）加速。',code:`struct PageOffsets {
    cursor: usize,
    total: usize,
    page_size: usize,
}

impl Iterator for PageOffsets {
    type Item = (usize, usize);

    fn next(&mut self) -> Option<Self::Item> {
        if self.cursor >= self.total {
            return None;
        }
        let start = self.cursor;
        let end = (start + self.page_size).min(self.total);
        self.cursor = end;
        Some((start, end))
    }
}`,explain:[{at:'struct PageOffsets {',to:'page_size: usize,',text:'保存分页迭代器的当前游标、总条数和每页大小。'},{at:'impl Iterator for PageOffsets {',to:'type Item = (usize, usize);',text:'实现 Iterator trait，指定每次吐出一个 (起始下标, 结束下标) 元组。'},{at:'fn next(&mut self) -> Option<Self::Item> {',text:'唯一需要手写的方法，返回 Option<(usize, usize)>。'},{at:'if self.cursor >= self.total {',to:'return None;',text:'游标到达或超过总数时返回 None，通知调用方迭代结束。'},{at:'let start = self.cursor;',to:'Some((start, end))',text:'算出当前页边界（末页不足时用 .min(self.total) 截断），推进 cursor 并返回 Some((start, end))。'}]},
  {title:'动手试试：实现自定义 Iterator 并组合适配器',body:'手写一个无限的斐波那契（Fibonacci）数列迭代器：它的 next 永远返回 Some，但在惰性求值的配合下，你可以放心地接上 take、skip、filter、zip、sum 等标准库工具，按需拉取任意一段数列。',practice:{steps:['确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。','在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。','用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。','在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。','把 Fibonacci::new().take(8) 改成 Fibonacci::new().skip(5).take(6)，运行看看是不是跳过了前 5 项、拿到了第 6 到第 11 项。','试着再写一条链：算出斐波那契数列前 10 项中所有奇数的平方和（提示：组合 take、filter、map、sum）。'],expect:'前 8 项：[0, 1, 1, 2, 3, 5, 8, 13]\n前 10 项中偶数之和：44\n第一个正斐波那契数：1\n第二个正斐波那契数：1\n第三个正斐波那契数：2\n第四个正斐波那契数：3'},code:`struct Fibonacci {
    curr: u64,
    next: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Self { curr: 0, next: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let val = self.curr;
        let sum = self.curr + self.next;
        self.curr = self.next;
        self.next = sum;
        Some(val)
    }
}

fn main() {
    let first_eight: Vec<u64> = Fibonacci::new().take(8).collect();
    println!("前 8 项：{:?}", first_eight);

    let even_sum: u64 = Fibonacci::new()
        .take(10)
        .filter(|x| x % 2 == 0)
        .sum();
    println!("前 10 项中偶数之和：{even_sum}");

    let labels = ["一", "二", "三", "四"];
    for (label, num) in labels.iter().zip(Fibonacci::new().skip(1)) {
        println!("第{label}个正斐波那契数：{num}");
    }
}`,explain:[{at:'struct Fibonacci {',to:'next: u64,',text:'只需保存当前项 curr 和下一项 next 两个整数，就能不断往后递推。'},{at:'impl Fibonacci {',to:'Self { curr: 0, next: 1 }',text:'构造方法，从经典的前两项 0、1 起步。'},{at:'impl Iterator for Fibonacci {',to:'type Item = u64;',text:'实现 Iterator，每次吐出一个 u64。'},{at:'fn next(&mut self) -> Option<Self::Item> {',to:'Some(val)',text:'先暂存当前值，再向前推进一对状态，始终返回 Some(val)——这是一个无限序列。'},{at:'fn main() {',text:'程序入口。'},{at:'let first_eight: Vec<u64> = Fibonacci::new().take(8).collect();',to:'println!("前 8 项：{:?}", first_eight);',text:'take(8) 只拉取前 8 次 next() 就停下，所以不会陷入死循环，收集得到 [0, 1, 1, 2, 3, 5, 8, 13]。'},{at:'let even_sum: u64 = Fibonacci::new()',to:'println!("前 10 项中偶数之和：{even_sum}");',text:'前 10 项里的偶数是 0、2、8、34，直接过滤后累加得到 44。'},{at:'let labels = ["一", "二", "三", "四"];',to:'println!("第{label}个正斐波那契数：{num}");',text:'skip(1) 跳过开头的 0，再和只有 4 个元素的 labels 配对；zip 会在较短的一侧耗尽时自动停止。'}]}
 ],
 quiz:[
  {id:'rust-iterators-1',q:'下面这段代码为什么会编译报错？',code:'let id = |x| x;\nlet s = id(String::from("hi"));\nlet n = id(5);',options:['闭包不写参数类型语法本身不合法','闭包里不能原样返回输入参数 x','首次调用已把参数类型锁定为 String','i32 类型不支持传给匿名闭包函数'],why:['闭包允许省略参数类型，编译器会根据上下文自动推断。','闭包可以原样返回参数，这没有语法或语义限制。','','任何合法类型（包括 i32）都可以传给闭包，这里只是前后类型冲突。'],answer:2,explain:'编译器在第一次调用 id(String::from("hi")) 时把参数 x 的类型推断并固定为 String，再次用整数 5 调用就会报类型不匹配。'},
  {id:'rust-iterators-2',q:'在闭包前加上 move 关键字（如 move || println!("{s}")）的核心作用是？',options:['强制把用到的外部变量所有权移入闭包','让闭包内部的循环自动并行到多核执行','把闭包从静态分发转换成 dyn 动态分发','阻止编译器为闭包推断参数和返回类型'],why:['','move 只控制变量捕获的所有权转移，本身不开启多线程并行。','加了 move 的闭包仍是具体匿名类型，默认按静态分发处理。','加了 move 同样可以正常省略并自动推断参数和返回值类型。'],answer:0,explain:'move 强制将闭包用到的外部变量所有权转移进闭包（Copy 类型则复制一份），常用于把闭包传给新线程或从函数返回，避免产生悬垂引用。'},
  {id:'rust-iterators-3',type:'judge',q:'只要给闭包加上了 move 关键字，它就只会实现 FnOnce，而不会实现 Fn 或 FnMut。',answer:false,explain:'move 只决定创建闭包时如何捕获外部变量，而闭包实现 Fn / FnMut / FnOnce 取决于调用时闭包体怎么使用这些变量。例如 move || println!("{s}") 调用时只读 s，仍然实现了 Fn。'},
  {id:'rust-iterators-4',q:'关于三个闭包 trait（Fn、FnMut、FnOnce）的继承包含关系，下面哪项正确？',options:['三者彼此独立，互相之间不存在包含关系','实现 FnOnce 时也会同时满足 Fn 与 FnMut','实现 FnMut 时也会同时满足 Fn 与 FnOnce','实现 Fn 时也会同时满足 FnMut 与 FnOnce'],why:['标准库定义为 Fn: FnMut 且 FnMut: FnOnce，三者有明确的层次关系。','说反了：只实现 FnOnce 的闭包可能会消耗捕获值，无法满足 Fn 和 FnMut。','说反了：FnMut 会修改捕获状态，无法满足只读的 Fn。',''],answer:3,explain:'Fn 要求最严格（只读捕获），因此任何 Fn 都能安全地当作 FnMut 或 FnOnce 来调用；写高阶函数时应按实际需求选尽量宽松的约束。'},
  {id:'rust-iterators-5',type:'fill',q:'标准库 Iterator trait 中唯一必须手动实现的方法名是＿，它的返回类型是 Option<Self::Item>。',accepted:['next','next()'],explain:'只要确定了 type Item 并实现 fn next(&mut self) -> Option<Self::Item>，标准库里的 map、filter、sum 等几十个默认方法就能直接使用。'},
  {id:'rust-iterators-6',q:'对 let v = vec![String::from("a"), String::from("b")];，哪种迭代方式会消费 v 并直接产出 String 所有权？',options:['v.iter()','v.into_iter()','v.iter_mut()','(&v).into_iter()'],why:['iter() 只不可变借用元素，产出 &String，不会消费 v。','','iter_mut() 可变借用元素，产出 &mut String，且要求 v 为 mut。','对引用 &v 调用 into_iter() 等价于 v.iter()，同样只产出 &String。'],answer:1,explain:'v.into_iter()（对应 for s in v）会消费集合并逐个移出元素所有权 T；若遍历完还要继续使用 v，应改用 iter() 或 for s in &v。'},
  {id:'rust-iterators-7',type:'multi',q:'关于 Rust 迭代器的“惰性求值”，下面哪些说法正确？（多选）',options:['只调用 map 和 filter 时闭包不会立即执行','每接一个 map 都会先分配中间 Vec 存结果','遇到 collect 或 sum 等消费器才按需拉取计算','给 0.. 这种无限范围接上 map 会立刻死循环'],why:['','适配器只包裹迭代器状态，不分配任何中间 Vec。','','正因为 map 是惰性的，给 0.. 接上 map 不会死循环，后续配 take(n) 即可安全截取。'],answers:[0,2],explain:'迭代器适配器本身不执行计算，只在被消费器驱动时按需逐个元素流过管道，既省中间内存又能优雅表达无限序列。'},
  {id:'rust-iterators-8',q:'要把 [&str] 中的文字解析成 i32 列表，并希望遇到第一个解析失败就立刻短路返回 Err，最惯用的写法是？',options:['.map(|s| s.parse::<i32>()).collect::<Result<Vec<_>, _>>()','.filter(|s| s.parse::<i32>().is_ok()).collect::<Vec<_>>()','.filter_map(|s| s.parse::<i32>().ok()).collect::<Vec<_>>()','.map(|s| s.parse::<i32>().unwrap()).collect::<Vec<_>>()'],why:['','filter 只过滤掉非法字符串，返回的是 Vec<&&str>，既没转成 i32 也不返回 Err。','filter_map 会静默丢弃解析失败的项，返回 Vec<i32> 而不是在首个失败处返回 Err。','unwrap 遇到解析失败会直接 panic 崩溃，不会优雅地返回 Err。'],answer:0,explain:'Result 实现了 FromIterator，collect::<Result<Vec<_>, _>>() 会在全部成功时产出 Ok(Vec)，一旦遇到首个 Err 就立刻停止遍历并返回该 Err。'},
  {id:'rust-iterators-9',type:'judge',q:'for x in &nums 在底层等价于借用迭代，循环结束后 nums 仍然可以正常使用。',answer:true,explain:'for x in &nums 会调用 (&nums).into_iter()，效果等同于 nums.iter()，逐个产出元素的不可变引用，不会移走 nums 的所有权。'},
  {id:'rust-iterators-10',type:'fill',q:'在一条迭代器链中，想先跳过前 2 个元素、再只取接下来的 3 个元素，依次调用的两个适配器是 .skip(2) 和 .＿(3)。',accepted:['take'],explain:'skip(n) 跳过前 n 个元素，take(m) 最多再拉取 m 个元素后就结束迭代。'},
  {id:'rust-iterators-11',q:'下面这段代码会打印什么？',code:'let nums = [1, 2, 3, 4, 5, 6];\nlet total: i32 = nums\n    .iter()\n    .filter(|&&x| x % 2 == 0)\n    .map(|&x| x * 10)\n    .sum();\nprintln!("{total}");',options:['210','90','60','120'],why:['210 是全部六个元素都乘以 10 再相加的结果，忽略了 filter 筛选偶数。','90 是筛选奇数（1、3、5）乘 10 求和的结果，x % 2 == 0 选的是偶数。','60 只加了其中一部分偶数，漏掉了 20、40、60 三者中的某一项。',''],answer:3,explain:'filter 留下的偶数是 2、4、6，经 map 乘以 10 变成 20、40、60，sum 相加得到 120。'},
  {id:'rust-iterators-12',type:'multi',q:'只要为自定义结构体实现了 Iterator trait 的 type Item 和 next 方法，下面哪些方法就能直接开箱使用？（多选）',options:['map（对每个元素做一对一转换）','filter（按闭包条件筛选保留元素）','take（截取序列中的前若干项）','sum（累加计算全部元素的总和）'],why:['','','',''],answers:[0,1,2,3],explain:'标准库在 Iterator trait 上以默认方法提供了 map、filter、take、zip、fold、sum、collect 等几十个常用工具，只需写好 next 即可全部解锁。'},
  {id:'rust-iterators-13',type:'short',q:'为什么说 Rust 的迭代器链是“零成本抽象”（Zero-Cost Abstraction）？相比手写 for 循环，编译器做了哪些关键优化让两者性能相当甚至更快？',reference:'Rust 迭代器链被称为零成本抽象，是因为它在提供声明式高可读性的同时，编译后的机器码开销与手写底层循环相当：一、惰性求值避免中间分配：filter、map 等适配器不会在每一步分配临时 Vec，元素按需逐个流过管道；二、编译期单态化与激进内联：每个适配器和闭包都是唯一具体泛型类型，没有虚表动态分发，LLVM 优化器会把嵌套的 next() 和闭包完全内联，融合成一个紧致的单层循环；三、消除越界检查并利于向量化：切片迭代器内部直接推进指针，免去手写下标 nums[i] 的逐次边界检查，也更容易触发 CPU 的 SIMD 向量化优化。',points:['惰性求值：不分配中间临时集合，元素按需流过','编译期单态化：适配器和闭包均为具体泛型类型，无虚表开销','内联优化：嵌套的 next() 和闭包被融合成紧致循环','免去下标越界检查，且更容易触发 SIMD 向量化'],explain:'在发布模式（--release）下，写得清晰的迭代器链往往既不容易出现下标越界 bug，又和手写循环跑得一样快。'},
  {id:'rust-iterators-14',type:'code',q:'定义结构体 Counter { current: u32, max: u32 } 并为其实现 Iterator（type Item = u32），每次调用 next 依次产出 1 到 max（包含 max）的整数，超过 max 时返回 None。再在 main 中创建 Counter { current: 0, max: 10 }，用迭代器适配器计算其中所有奇数的平方和并打印（结果为 165）。',reference:'struct Counter {\n    current: u32,\n    max: u32,\n}\n\nimpl Iterator for Counter {\n    type Item = u32;\n\n    fn next(&mut self) -> Option<Self::Item> {\n        if self.current < self.max {\n            self.current += 1;\n            Some(self.current)\n        } else {\n            None\n        }\n    }\n}\n\nfn main() {\n    let c = Counter { current: 0, max: 10 };\n    let sum: u32 = c.filter(|x| x % 2 == 1).map(|x| x * x).sum();\n    println!("奇数平方和：{sum}");\n}',points:['定义 Counter 结构体并为它实现 Iterator，关联类型 Item = u32','next 正确推进 current，在 1..=max 范围内返回 Some，超出返回 None','main 中组合 filter 筛选奇数、map 计算平方、sum 求和','输出正确结果 165'],explain:'1² + 3² + 5² + 7² + 9² = 1 + 9 + 25 + 49 + 81 = 165；实现 next 后所有适配器都可直接链式调用。'}
 ]
};
