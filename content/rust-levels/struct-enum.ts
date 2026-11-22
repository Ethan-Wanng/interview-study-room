import type {AiLevel} from '../journey';

// 第 5 关：结构体与方法。
export const rustStruct:AiLevel={
 id:'rust-struct',
 title:'结构体与方法',
 summary:'struct 定义与实例化、元组结构体、Debug 打印、impl 方法与关联函数、结构体中的生命周期',
 lessons:[
  {
   title:'结构体 struct：把相关数据打包成自定义类型',
   body:'第 2 关学过元组，可以把几个不同类型的值打包在一起，但取值要靠 .0、.1，字段一多就容易记混。结构体（struct）允许你给每一项数据起一个有意义的名字（叫“字段”，field），并造出一个全新的自定义类型。\n一、定义与实例化：用 struct 名字 { 字段: 类型, ... } 定义，名字按惯例用大驼峰（每个单词首字母大写，如 User）。创建实例时必须给每个字段都赋上值，顺序可以和定义时不同，取值用点号（如 user.name）；\n二、可变性：Rust 不允许只把某一个字段标成 mut。要修改字段，必须把整个实例声明成 let mut user = ...；\n三、字段初始化简写：如果变量名和字段名一模一样，可以直接写字段名，不用重复写 name: name；\n四、结构体更新语法（..other）：想基于已有实例改动一两个字段创建新实例，可以在末尾写 ..other 复用其余字段。要特别留意所有权：..other 就像逐个字段执行赋值（=），实现 Copy 的字段（如 u32、bool）会被复制，而 String 这类没有实现 Copy 的字段会被“移动”走！如果把 other 的 String 字段也移走了，other 整体就不能再使用；如果新实例自己提供了新的 String 字段、只复用了 Copy 字段，other 仍然完好可用。',
   code:`struct User {
    name: String,
    age: u32,
    active: bool,
}

fn build_user(name: String, age: u32) -> User {
    User {
        name,
        age,
        active: true,
    }
}

let mut u1 = build_user(String::from("小明"), 20);
u1.age = 21;

let u2 = User {
    name: String::from("小红"),
    ..u1
};
println!("{} 岁，u1 仍可用：{}", u2.age, u1.name);`,
   explain:[
    {at:'struct User {',to:'active: bool,',text:'定义结构体 User，包含三个字段：拥有所有权的姓名 String、年龄 u32 和是否活跃 bool。'},
    {at:'fn build_user(name: String, age: u32) -> User {',text:'一个辅助函数，接收参数并返回一个 User 实例。'},
    {at:'User {',to:'active: true,',text:'参数名 name、age 和字段名相同，使用字段初始化简写，不用写成 name: name、age: age；active 单独赋值 true。末尾不加分号表示作为返回值。'},
    {at:'let mut u1 = build_user(String::from("小明"), 20);',text:'要修改字段，必须把整个实例 u1 声明为 mut。'},
    {at:'u1.age = 21;',text:'用点号修改 u1 的 age 字段。'},
    {at:'let u2 = User {',to:'..u1',text:'结构体更新语法：u2 自己提供了新的 name，其余字段（age 和 active）从 u1 复用。..u1 必须写在最后。'},
    {at:'println!("{} 岁，u1 仍可用：{}", u2.age, u1.name);',text:'因为只从 u1 复制了 u32 和 bool（都是 Copy 类型），没有移动 u1.name，所以 u1 仍然完好可用。'}
   ]
  },
  {
   title:'元组结构体与单元结构体',
   body:'除了带字段名的常规结构体，Rust 还有两种更轻量的结构体：\n一、元组结构体（tuple struct）：长得像“有名字的元组”，只写字段类型、不起字段名，定义末尾加分号，比如 struct Color(u8, u8, u8);。取值和元组一样用 .0、.1，也可以解构，不过解构时要带上类型名（let Color(r, g, b) = c;）。\n元组结构体最经典的用途是“newtype 模式”——只包一个字段，比如 struct Meters(f64); 和 struct Seconds(f64);。它们运行时和裸 f64 占一样大的内存、没有额外开销，但在编译器眼里是两种完全不同的类型，能从根本上防止把“米”错传给需要“秒”的函数。\n二、单元结构体（unit-like struct）：没有任何字段，只写 struct Marker;，占用 0 字节内存，和空元组 () 类似。现在看起来像个空壳，到第 9 关学完 trait（特征）后，常用来给某个“状态标记”或“无状态工具”实现行为。',
   code:`struct Color(u8, u8, u8);
struct Meters(f64);
struct Seconds(f64);
struct Marker;

let red = Color(255, 0, 0);
let Color(r, g, b) = red;
println!("R={r}, G={g}, B={b}，首分量={}", red.0);

let distance = Meters(100.0);
let elapsed = Seconds(9.58);
let _tag = Marker;`,
   explain:[
    {at:'struct Color(u8, u8, u8);',text:'元组结构体：给三个 u8 组成的颜色起一个独立的类型名 Color，定义以分号结尾。'},
    {at:'struct Meters(f64);',to:'struct Seconds(f64);',text:'newtype 模式：虽然内部都是 f64，但 Meters 和 Seconds 是两个互不兼容的类型，防止单位传混。'},
    {at:'struct Marker;',text:'单元结构体：没有字段、不占内存，用来表示某种标记类型。'},
    {at:'let red = Color(255, 0, 0);',text:'像调用函数一样按位置传入字段值，创建 Color 实例。'},
    {at:'let Color(r, g, b) = red;',text:'解构元组结构体时，前面必须写上结构体名字 Color。'},
    {at:'println!("R={r}, G={g}, B={b}，首分量={}", red.0);',text:'也可以用 .0 按下标访问分量。因为 u8 实现了 Copy，前面解构只是复制，red 依然可用。'},
    {at:'let distance = Meters(100.0);',to:'let elapsed = Seconds(9.58);',text:'分别创建距离和时间实例，二者不能直接相加或互相赋值。'},
    {at:'let _tag = Marker;',text:'实例化单元结构体不需要括号；变量名前加下划线告诉编译器暂时不用它、别报未使用警告。'}
   ]
  },
  {
   title:'打印结构体：#[derive(Debug)] 与 dbg!',
   body:'直接写 println!("{}", user) 打印自定义结构体，编译器会报错，因为 Rust 不知道你希望给最终用户展示成什么格式（标准库不会替自定义类型猜面向用户的 Display 格式）。\n开发和排查问题时，只要在结构体上方加上一行 #[derive(Debug)]，编译器就会自动帮这个结构体生成调试打印能力（derive 叫“派生属性”，底层机制第 9 关讲 trait 时会详细展开）。之后就有三种常用打印方式：\n一、{:?}：把结构体以紧凑的一行调试格式打印出来；\n二、{:#?}：带换行和缩进的“美化调试格式”，字段一多清晰得多；\n三、dbg! 宏：专门用来临时看中间值。它会把“[文件名:行号] 表达式 = 值”打印到标准错误（stderr），而且有一个很顺手的特点——它会接管传入表达式的所有权，打印完再把值原样返回！所以你可以直接套在算式外面，比如 width: dbg!(30 * scale)，不用拆成好几行；如果不想移走变量所有权，传引用 dbg!(&rect) 即可。',
   code:`#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

let scale = 2;
let rect = Rectangle {
    width: dbg!(15 * scale),
    height: 20,
};
println!("单行：{:?}", rect);
println!("多行：{:#?}", rect);
dbg!(&rect);`,
   explain:[
    {at:'#[derive(Debug)]',text:'让编译器自动为 Rectangle 生成 Debug 调试打印实现，之后就能用 {:?}、{:#?} 和 dbg!。'},
    {at:'struct Rectangle {',to:'height: u32,',text:'定义一个包含宽和高的矩形结构体。'},
    {at:'let scale = 2;',text:'缩放倍数。'},
    {at:'let rect = Rectangle {',to:'height: 20,',text:'dbg!(15 * scale) 会打印 [文件:行号] 15 * scale = 30，然后把 30 原样返回并赋给 width。'},
    {at:'println!("单行：{:?}", rect);',text:'单行紧凑打印：Rectangle { width: 30, height: 20 }。'},
    {at:'println!("多行：{:#?}", rect);',text:'加 # 号换行缩进打印，方便查看字段较多的结构体。'},
    {at:'dbg!(&rect);',text:'传入引用 &rect，避免 dbg! 拿走 rect 的所有权，打印完后 rect 还能继续使用。'}
   ]
  },
  {
   title:'动手试试：定义结构体、更新语法与 Debug 打印',
   body:'把结构体定义、字段初始化简写、结构体更新语法、Debug 的两种格式以及元组结构体解构放在一个完整程序里运行一遍。\n留意 book2 用 ..book1 时单独给了新的 title，所以 book1.title 没有被移动，后面依然可以打印 book1。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把创建 book2 时的 title: String::from("Rust 实战"), 删掉，只留 ..book1 和把 available 改成 true，运行 cargo run 看看为什么后面打印 book1.title 会报所有权已被移动。看完改回来。',
     '在 main 最后加一行 dbg!(&book2); 再运行，观察终端里多出的文件名、行号和表达式信息。'
    ],
    expect:'book1：Rust 编程入门（320 页），可借：false\n单行 Debug：Book { title: "Rust 实战", pages: 320, available: false }\n缩进 Debug：\nBook {\n    title: "Rust 实战",\n    pages: 320,\n    available: false,\n}\n距离：Meters(42.5)，数值：42.5 米'
   },
   code:`#[derive(Debug)]
struct Book {
    title: String,
    pages: u32,
    available: bool,
}

#[derive(Debug)]
struct Meters(f64);

fn main() {
    let title = String::from("Rust 编程入门");
    let mut book1 = Book {
        title,
        pages: 320,
        available: true,
    };
    book1.available = false;

    let book2 = Book {
        title: String::from("Rust 实战"),
        ..book1
    };

    println!("book1：{}（{} 页），可借：{}", book1.title, book1.pages, book1.available);
    println!("单行 Debug：{:?}", book2);
    println!("缩进 Debug：\\n{:#?}", book2);

    let dist = Meters(42.5);
    let Meters(value) = dist;
    println!("距离：{:?}，数值：{} 米", dist, value);
}`,
   explain:[
    {at:'#[derive(Debug)]',to:'available: bool,',text:'定义支持调试打印的 Book 结构体，包含书名、页数和可借状态。'},
    {at:'#[derive(Debug)]',to:'struct Meters(f64);',text:'定义表示“米”的元组结构体 Meters，同样派生 Debug。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let title = String::from("Rust 编程入门");',text:'先准备好一个和字段同名的变量 title。'},
    {at:'let mut book1 = Book {',to:'available: true,',text:'创建可变实例 book1，其中 title 用了字段初始化简写。'},
    {at:'book1.available = false;',text:'因为 book1 是 mut，可以直接修改它的 available 字段。'},
    {at:'let book2 = Book {',to:'..book1',text:'用结构体更新语法复用 book1 的 pages 和 available；由于 title 是新创建的，book1 的 String 没有被移走。'},
    {at:'println!("book1：{}（{} 页），可借：{}", book1.title, book1.pages, book1.available);',text:'验证 book1 依然有效，打印出修改后的状态。'},
    {at:'println!("单行 Debug：{:?}", book2);',text:'用 {:?} 单行打印 book2。'},
    {at:'println!("缩进 Debug：\\n{:#?}", book2);',text:'用 {:#?} 换行缩进打印 book2，\\n 先换一行让输出更整齐。'},
    {at:'let dist = Meters(42.5);',text:'创建一个 Meters 实例。'},
    {at:'let Meters(value) = dist;',text:'解构元组结构体拿出里面的 f64；f64 是 Copy，所以 dist 依然完好。'},
    {at:'println!("距离：{:?}，数值：{} 米", dist, value);',text:'分别打印整个元组结构体和解构出的数值。'}
   ]
  },
  {
   title:'方法与 impl 块：&self、&mut self、self',
   body:'如果一个函数专门围着某个结构体干活（比如算矩形的面积），把它写进 impl 结构体名 { ... } 代码块里，变成“方法”（method），代码组织会清晰得多，调用时也更自然：rect.area()。\n方法的第一个参数总是某种形式的 self，代表正在调用方法的那个实例本身。呼应第 3 关的所有权与借用，self 有三种常见写法：\n一、&self（完整写法是 self: &Self）：不可变借用实例，只读不改，最常用；\n二、&mut self（self: &mut Self）：可变借用实例，用来修改字段，调用方的变量必须是 mut；\n三、self（self: Self）：拿走实例的所有权并“消费”掉它，调用完后原变量就不能再用了。一般用在把一个值转换成另一种类型、且不希望旧值继续被误用的场景。\n另外有两个小细节：第一，方法名可以和字段名重名，Rust 通过有没有 () 来区分（rect.width 是字段，rect.width() 是方法）；第二，Rust 有“自动引用和解引用”机制——调用 rect.area() 或 rect.scale(2) 时，编译器会按方法签名自动补上 &、&mut 或 *，所以不像 C/C++ 那样区分 . 和 ->，统一用点号 . 即可。',
   code:`struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn width(&self) -> bool {
        self.width > 0
    }

    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }

    fn into_area(self) -> u32 {
        self.width * self.height
    }
}`,
   explain:[
    {at:'struct Rectangle {',to:'height: u32,',text:'定义矩形结构体。'},
    {at:'impl Rectangle {',text:'impl 是 implementation（实现）的缩写，块里的内容都属于 Rectangle 类型。'},
    {at:'fn area(&self) -> u32 {',to:'self.width * self.height',text:'不可变借用 &self，只读取宽和高计算面积，调用后原矩形继续有效。'},
    {at:'fn width(&self) -> bool {',to:'self.width > 0',text:'方法名可以和字段 width 相同：rect.width 读字段，rect.width() 调用这个方法。'},
    {at:'fn scale(&mut self, factor: u32) {',to:'self.height *= factor;',text:'可变借用 &mut self，把宽和高都放大 factor 倍。调用它的变量必须是 mut。'},
    {at:'fn into_area(self) -> u32 {',to:'self.width * self.height',text:'按值接收 self，拿走所有权并返回面积；调用完后原 Rectangle 变量就被消费，不能再使用。'}
   ]
  },
  {
   title:'关联函数：Self::new 与多个 impl 块',
   body:'写在 impl 块里的所有函数都叫“关联函数”（associated function），因为它们都关联在 impl 后面的类型上。带 self 的关联函数叫“方法”，用点号在实例上调用；不带 self 的关联函数不是方法，而是用双冒号 :: 通过类型名直接调用——第 3 关已经用过的 String::from("hi") 就是关联函数！\n不带 self 的关联函数最常用来做“构造器”（创建新实例的函数），社区习惯命名为 new（注意 new 不是关键字，你完全可以起别的名字，比如 square）。在 impl 块内部，大写的 Self 是当前结构体类型的别名，写 fn new(...) -> Self 和 Self { ... } 既简洁，以后改结构体名字也省事。\nRust 还允许给同一个结构体写多个 impl 块，把不同职责的方法分组放开。写简单结构体时通常放一个 impl 块里就行；到第 9 关学泛型和 trait 时，多个 impl 块会非常有用。',
   code:`struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(size: u32) -> Self {
        Self { width: size, height: size }
    }
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}`,
   explain:[
    {at:'struct Rectangle {',to:'height: u32,',text:'定义矩形结构体。'},
    {at:'impl Rectangle {',text:'第一个 impl 块，专门放构造相关的关联函数。'},
    {at:'fn new(width: u32, height: u32) -> Self {',to:'Self { width, height }',text:'不带 self 的关联函数 new，用 Rectangle::new(3, 4) 调用；Self 在这里等价于 Rectangle。'},
    {at:'fn square(size: u32) -> Self {',to:'Self { width: size, height: size }',text:'再提供一个构造正方形的关联函数，只需传一个边长参数。'},
    {at:'impl Rectangle {',text:'同一个结构体可以写第二个 impl 块，放行为方法。'},
    {at:'fn can_hold(&self, other: &Rectangle) -> bool {',to:'self.width > other.width && self.height > other.height',text:'方法可以除了 &self 之外再接其他参数；这里借用另一个矩形，判断当前矩形能否完整装下它。'}
   ]
  },
  {
   title:'动手试试：给矩形和计数器写方法与关联函数',
   body:'同时练习 Rectangle 和 Counter 两个结构体：Rectangle 演示 new、square、&self、&mut self；Counter 额外演示一个消费 self 的 finish(self) 方法，用来体验“结算之后不能再继续计数”的编译期保护。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '在 let total = counter.finish(); 后面再加一行 println!("{}", counter.value()); 并运行，看看编译器如何拦住“已被 finish 消费的计数器”。看完删掉这一行。',
     '把 let mut rect 的 mut 删掉再运行，看看调用 rect.scale(2) 时编译器的报错和提示。'
    ],
    expect:'初始面积：12，能否装下正方形：false\n放大后：Rectangle { width: 6, height: 8 }，面积：48，能否装下：true\n当前计数：2\n最终结算：2'
   },
   code:`#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }

    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}

struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Self {
        Self { count: 0 }
    }

    fn inc(&mut self) {
        self.count += 1;
    }

    fn value(&self) -> u32 {
        self.count
    }

    fn finish(self) -> u32 {
        self.count
    }
}

fn main() {
    let mut rect = Rectangle::new(3, 4);
    let sq = Rectangle::square(5);
    println!("初始面积：{}，能否装下正方形：{}", rect.area(), rect.can_hold(&sq));

    rect.scale(2);
    println!("放大后：{:?}，面积：{}，能否装下：{}", rect, rect.area(), rect.can_hold(&sq));

    let mut counter = Counter::new();
    counter.inc();
    counter.inc();
    println!("当前计数：{}", counter.value());
    let total = counter.finish();
    println!("最终结算：{total}");
}`,
   explain:[
    {at:'#[derive(Debug)]',to:'height: u32,',text:'定义支持 Debug 打印的 Rectangle。'},
    {at:'impl Rectangle {',text:'开始为 Rectangle 实现关联函数和方法。'},
    {at:'fn new(width: u32, height: u32) -> Self {',to:'Self { width, height }',text:'关联函数 new：按指定宽高构造矩形。'},
    {at:'fn square(size: u32) -> Self {',to:'height: size,',text:'关联函数 square：构造边长相等的正方形。'},
    {at:'fn area(&self) -> u32 {',to:'self.width * self.height',text:'只读方法，返回面积。'},
    {at:'fn can_hold(&self, other: &Rectangle) -> bool {',to:'self.width > other.width && self.height > other.height',text:'判断当前矩形的长宽是否都严格大于另一个矩形。'},
    {at:'fn scale(&mut self, factor: u32) {',to:'self.height *= factor;',text:'可变方法，按比例原地放大宽高。'},
    {at:'struct Counter {',to:'count: u32,',text:'定义一个简单的计数器结构体。'},
    {at:'impl Counter {',to:'Self { count: 0 }',text:'关联函数 new 把初始计数设为 0。'},
    {at:'fn inc(&mut self) {',to:'self.count += 1;',text:'可变方法：计数加 1。'},
    {at:'fn value(&self) -> u32 {',to:'self.count',text:'只读方法：查看当前计数，不消耗计数器。'},
    {at:'fn finish(self) -> u32 {',to:'self.count',text:'按值接收 self：返回最终计数值并消费掉计数器，防止结算后继续误加。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let mut rect = Rectangle::new(3, 4);',to:'let sq = Rectangle::square(5);',text:'用双冒号 :: 调用关联函数创建两个矩形。'},
    {at:'println!("初始面积：{}，能否装下正方形：{}", rect.area(), rect.can_hold(&sq));',text:'3×4 面积是 12，装不下 5×5，打印 false。'},
    {at:'rect.scale(2);',text:'自动可变借用 rect，把尺寸放大到 6×8。'},
    {at:'println!("放大后：{:?}，面积：{}，能否装下：{}", rect, rect.area(), rect.can_hold(&sq));',text:'放大后面积 48，能装下 5×5，打印 true。'},
    {at:'let mut counter = Counter::new();',text:'调用关联函数新建计数器，初始计数为 0，需要 mut 才能调用可变方法。'},
    {at:'counter.inc();',to:'println!("当前计数：{}", counter.value());',text:'连续两次调用 inc(&mut self) 把计数加到 2，再用只读方法 value(&self) 查看并打印当前计数，counter 仍可继续使用。'},
    {at:'let total = counter.finish();',text:'调用消费 self 的方法结算，counter 的所有权移入 finish 并在调用结束后释放。'},
    {at:'println!("最终结算：{total}");',text:'打印最终结果 2。'}
   ]
  },
  {
   title:'结构体里的生命周期标注',
   body:'前面的结构体字段存的都是 String、u32 这类拥有所有权的数据。那结构体里能不能存引用，比如一段字符串切片 &str？可以，但必须加生命周期标注——这正是第 4 关生命周期在结构体上的落地。\n如果直接写 struct Excerpt { part: &str }，编译器会报 missing lifetime specifier。必须像函数一样，在结构体名后面用尖括号声明生命周期参数：struct Excerpt<\'a> { part: &\'a str }。它的含义很直观：Excerpt 实例不能比它内部 part 字段所借用的原始文本活得更久。只要原始文本被释放了，这个 Excerpt 就不能再使用，从而杜绝结构体里的悬垂引用。\n给带生命周期的结构体写 impl 块时，要在 impl 后面先声明 <\'a>，再写 Excerpt<\'a>：impl<\'a> Excerpt<\'a> { ... }。好消息是，第 4 关提到的“生命周期省略规则三”在这里大显身手：只要方法的第一个参数是 &self 或 &mut self，方法返回引用时就会自动沿用 self 的生命周期，即使还有其他 &str 参数也不用再手写标注！\n顺带一提：结构体里存 &\'a str 可以避免复制文本，但 <\'a> 会一路传导到 impl 和使用它的函数签名里；如果结构体需要长期保存或跨函数自由传递，直接存 String 通常省心得多。',
   code:`struct Excerpt<'a> {
    part: &'a str,
}

impl<'a> Excerpt<'a> {
    fn new(part: &'a str) -> Self {
        Self { part }
    }

    fn announce_and_return(&self, note: &str) -> &str {
        println!("提示：{note}");
        self.part
    }
}`,
   explain:[
    {at:'struct Excerpt<\'a> {',to:'part: &\'a str,',text:'在结构体名后声明生命周期 \'a，表示 Excerpt 实例存活的时间不能超过 part 指向的原始数据。'},
    {at:'impl<\'a> Excerpt<\'a> {',text:'为带生命周期的结构体写实现块：impl 后的 <\'a> 是声明，Excerpt<\'a> 是把这个生命周期填进类型里。'},
    {at:'fn new(part: &\'a str) -> Self {',to:'Self { part }',text:'构造器接收生命周期为 \'a 的切片，返回的 Self 就是 Excerpt<\'a>。'},
    {at:'fn announce_and_return(&self, note: &str) -> &str {',text:'按省略规则三，因为有 &self，返回的 &str 自动与 self 的生命周期绑定，和 note 的生命周期无关，不用手写标注。'},
    {at:'println!("提示：{note}");',to:'self.part',text:'打印临时提示后，返回内部保存的切片 self.part。'}
   ]
  },
  {
   title:'动手试试：带生命周期的结构体与方法省略规则三',
   body:'用 Excerpt<\'a> 从一首诗的 String 里摘出第一句（注意第 3 关学过的 UTF-8 规则：一个常用汉字占 3 字节，5 个汉字就是 15 字节）。\n重点观察内层花括号里的 temp_note：虽然它作为第二个参数传进了 announce_and_return，但在花括号结束就被释放了，而外层的 chosen 依然能正常打印——因为省略规则三把返回值绑定到了 &self（excerpt）而不是 note 上。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '试着把 poem 和 first_clause 放进一个内层花括号里，把 excerpt 留到外层再打印，运行 cargo run 看看借用检查器如何阻止悬垂结构体。看完改回来。'
    ],
    expect:'摘录：春眠不觉晓（15 字节）\n提示：古诗第一句\n返回内容：春眠不觉晓'
   },
   code:`struct Excerpt<'a> {
    part: &'a str,
}

impl<'a> Excerpt<'a> {
    fn new(part: &'a str) -> Self {
        Self { part }
    }

    fn byte_len(&self) -> usize {
        self.part.len()
    }

    fn announce_and_return(&self, note: &str) -> &str {
        println!("提示：{note}");
        self.part
    }
}

fn main() {
    let poem = String::from("春眠不觉晓，处处闻啼鸟");
    let first_clause = &poem[..15];
    let excerpt = Excerpt::new(first_clause);

    println!("摘录：{}（{} 字节）", excerpt.part, excerpt.byte_len());
    let chosen;
    {
        let temp_note = String::from("古诗第一句");
        chosen = excerpt.announce_and_return(&temp_note);
    }
    println!("返回内容：{chosen}");
}`,
   explain:[
    {at:'struct Excerpt<\'a> {',to:'part: &\'a str,',text:'保存一段字符串切片的结构体，带生命周期参数 \'a。'},
    {at:'impl<\'a> Excerpt<\'a> {',to:'Self { part }',text:'实现构造器 new，把借来的切片装进 Excerpt。'},
    {at:'fn byte_len(&self) -> usize {',to:'self.part.len()',text:'返回切片占用的字节数。'},
    {at:'fn announce_and_return(&self, note: &str) -> &str {',to:'self.part',text:'符合省略规则三：返回的引用只和 self 绑定，不要求 note 活得和返回值一样久。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let poem = String::from("春眠不觉晓，处处闻啼鸟");',text:'原始文本，活在整个 main 函数里。'},
    {at:'let first_clause = &poem[..15];',text:'5 个汉字各占 3 字节，前 15 字节正好是完整的“春眠不觉晓”。'},
    {at:'let excerpt = Excerpt::new(first_clause);',text:'创建借用 poem 的摘录实例，它在 poem 存活期间都有效。'},
    {at:'println!("摘录：{}（{} 字节）", excerpt.part, excerpt.byte_len());',text:'打印摘录文字和字节长度 15。'},
    {at:'let chosen;',text:'在外层先声明 chosen，稍后在内层赋值。'},
    {at:'let temp_note = String::from("古诗第一句");',text:'temp_note 只活在这个内层花括号里。'},
    {at:'chosen = excerpt.announce_and_return(&temp_note);',text:'调用方法并打印提示；返回值生命周期来自 excerpt 而不是 temp_note。'},
    {at:'println!("返回内容：{chosen}");',text:'尽管 temp_note 已经释放，excerpt 和 poem 都还活着，所以 chosen 可以安全打印。'}
   ]
  },
  {
   title:'结构体设计小建议：拥有数据、newtype 与校验',
   body:'学会语法之后，下面四条实用习惯能帮你写出更地道、更少踩坑的 Rust 结构体：\n一、默认用拥有所有权的类型（如 String）：像 User、Order、Config 这类长期保存或四处传递的业务结构体，字段直接用 String，不用和满屏的 <\'a> 搏斗；只有写临时视图、文本解析器或明确需要零拷贝时，再考虑 &\'a str。\n二、把校验逻辑收进构造器 new：如果需要确保数据合法（比如年龄在合理范围、端口不为 0），与其在外部到处写 if 检查，不如统一通过关联函数 new 来构造。下一关学了 Option 和第 7 关学了 Result 之后，new 甚至可以直接返回 Option<Self> 或 Result<Self, _>，从源头拒绝非法实例。\n三、易混淆的基础类型套一层 newtype：函数参数一长，f64 和 f64、u64 和 u64 很容易传反；包成 struct UserId(u64); 和 struct OrderId(u64); 之后，传错位置编译器当场报错，而且没有运行时性能损失。\n四、按职责选择接收者：只读查询用 &self，原地修改用 &mut self，一次性消费或类型转换用 self（社区常把这类方法命名为 into_xxx）。'
  }
 ],
 quiz:[
  {
   id:'rust-struct-1',
   q:'在 Rust 中，想修改一个结构体实例里的某个字段，正确的做法是？',
   options:['只在该字段定义前加 mut','把整个结构体实例声明为 mut','给 struct 关键字加上 mut','每次修改时前面都写上 let'],
   why:['Rust 不允许单独把结构体的某一个字段标记为可变。','','struct 定义本身不带 mut，可变性由创建实例的变量决定。','再写 let 是变量遮蔽（创建新变量），不是修改结构体字段。'],
   answer:1,
   explain:'Rust 的可变性挂在变量绑定上：let mut user = ... 之后，user 的各个字段都可以修改，不能只标记单个字段。'
  },
  {
   id:'rust-struct-2',
   q:'下面代码为什么会编译报错？',
   code:'struct User {\n    name: String,\n    age: u32,\n}\nlet u1 = User { name: String::from("小明"), age: 20 };\nlet u2 = User { age: 21, ..u1 };\nprintln!("{}", u1.name);',
   options:['结构体更新语法不能写在最后','age 是整数，不能被直接覆盖','u1.name 的所有权被移动给了 u2','User 没有加 #[derive(Debug)]'],
   why:['恰恰相反，..u1 正是要放在字段列表的最后。','在更新语法里列出某个字段就是用来替换新值的，u32 覆盖完全合法。','','println!("{}", u1.name) 打印的是 String 字段，不是打印整个结构体，不需要 Debug。'],
   answer:2,
   explain:'结构体更新语法 ..u1 像赋值一样转移其余字段：u1.name 是 String（非 Copy），所有权被移动到 u2，之后再读 u1.name 就会编译报错。'
  },
  {
   id:'rust-struct-3',
   type:'judge',
   q:'元组结构体 struct Meters(f64); 和 struct Seconds(f64); 内部字段类型完全相同，所以可以直接互换赋值。',
   answer:false,
   explain:'即使内部字段类型一模一样，每个元组结构体都是独立的自定义类型，不能直接互换。这正是 newtype 模式防止单位混淆的原理。'
  },
  {
   id:'rust-struct-4',
   q:'想用 println!("{:?}", rect) 打印自定义结构体 rect，通常需要在结构体定义上方加上？',
   options:['#[derive(Debug)]','#[derive(Print)]','#[format(Debug)]','#[export(Debug)]'],
   why:['','标准库里没有叫 Print 的可派生 trait，调试打印用的是 Debug。','派生宏的写法是 #[derive(...)]，不是 #[format(...)]。','Rust 没有 #[export(Debug)] 这种属性写法。'],
   answer:0,
   explain:'#[derive(Debug)] 让编译器自动生成 Debug 调试格式实现，之后就能使用 {:?}、{:#?} 和 dbg!。'
  },
  {
   id:'rust-struct-5',
   type:'multi',
   q:'关于 dbg! 宏，下面哪些说法是正确的？（多选）',
   options:['会输出文件名、行号和表达式的值','把输出结果写到标准输出 stdout','会接收表达式的所有权再原样返回','可以直接打印未派生 Debug 的类型'],
   why:['','dbg! 默认输出到标准错误（stderr），println! 才输出到标准输出（stdout）。','','dbg! 底层依赖 Debug 格式化，自定义结构体同样需要先加 #[derive(Debug)]。'],
   answers:[0,2],
   explain:'dbg! 把文件名、行号和表达式求值结果输出到 stderr，并且拿走表达式所有权后再原样返回，不想移动所有权时可以传引用如 dbg!(&x)。'
  },
  {
   id:'rust-struct-6',
   q:'在 impl 块里定义方法时，下面哪种 self 接收者会拿走实例的所有权、调用后原变量不能再用？',
   options:['&self（不可变借用实例）','&mut self（可变借用实例）','other: &Self（借用同类实例）','self（按值接收并消费实例）'],
   why:['&self 只是不可变借用，调用完后原实例可以继续使用。','&mut self 是可变借用，修改完后原实例仍然有效。','other: &Self 只是普通参数，并不会转移调用者的所有权。',''],
   answer:3,
   explain:'按值写 self（等价于 self: Self）会把实例的所有权移入方法，常用于消费旧值并转换成新类型的方法。'
  },
  {
   id:'rust-struct-7',
   type:'fill',
   q:'在 Rust 中，给结构体定义方法和关联函数时，需要把它们写在关键词＿引导的代码块里。',
   accepted:['impl'],
   explain:'impl 是 implementation（实现）的缩写，写作 impl StructName { ... }，同一个结构体还可以拆分到多个 impl 块。'
  },
  {
   id:'rust-struct-8',
   q:'关于不带 self 参数的关联函数（如 Rectangle::new），下面说法正确的是？',
   options:['调用时用点号 rect.new() 来执行','调用时用双冒号 :: 通过类型名调用','new 是 Rust 规定的构造器关键字','一个结构体最多写一个关联函数'],
   why:['点号用于调用带 self 的方法，不带 self 的关联函数要用类型名加 :: 调用。','','new 不是关键字，只是社区约定俗成的构造函数名字，你也可以叫 square 等。','可以在 impl 块里定义任意多个关联函数，比如同时提供 new 和 square。'],
   answer:1,
   explain:'不带 self 的关联函数通过 类型名::函数名(...) 调用，最常见的用途是构造新实例，如 String::from 和 Rectangle::new。'
  },
  {
   id:'rust-struct-9',
   type:'judge',
   q:'调用方法时，Rust 会自动插入 &、&mut 或 *（自动引用与解引用），所以无论方法需要 &self 还是 &mut self，调用处都统一写点号 .。',
   answer:true,
   explain:'Rust 编译器会根据方法签名自动补全引用或解引用，所以不像 C/C++ 那样区分 . 和 ->，统一用点号调用即可。'
  },
  {
   id:'rust-struct-10',
   q:'为什么 struct Excerpt<\'a> { part: &\'a str } 必须在结构体名后面声明生命周期参数 \'a？',
   options:['让结构体里存放的切片能直接修改','把借来的数据复制到堆上延长寿命','约束实例不能比所借用的数据活得久','通知编译器跳过该结构体的借用检查'],
   why:['生命周期标注不会改变可变性，&\'a str 仍然是不可变引用。','标注不会复制数据，也不会延长原数据的寿命，只是给借用检查器描述关系。','','借用检查器正是依据这个标注来严格检查的，不会跳过检查。'],
   answer:2,
   explain:'在结构体里存引用必须标明生命周期，告诉借用检查器：这个结构体实例的存活范围不能超过被借用的原始数据，从而杜绝悬垂引用。'
  },
  {
   id:'rust-struct-11',
   type:'multi',
   q:'下面关于结构体与 impl 块的说法，哪些是正确的？（多选）',
   options:['同一个结构体可以拆成多个 impl 块来写','方法名可以和结构体的某个字段名相同','在 impl 块内部必须写完整类型名，不能写 Self','在 &self 方法返回引用时，默认沿用 self 生命周期'],
   why:['','','在 impl 块内部，Self 是当前类型的别名，fn new() -> Self 和 Self { ... } 都是常用写法。',''],
   answers:[0,1,3],
   explain:'结构体支持多个 impl 块、方法可与字段同名（靠括号区分）、impl 内可用 Self 代替类型名，且 &self 方法返回引用遵循生命周期省略规则三。'
  },
  {
   id:'rust-struct-12',
   type:'fill',
   q:'在 println! 里想用带换行和缩进的“美化调试格式”打印结构体，占位符应写成＿。',
   accepted:['{:#?}'],
   explain:'{:?} 是紧凑的单行调试格式，加上 # 写成 {:#?} 就会按字段换行并缩进，结构体较大时更易阅读。'
  },
  {
   id:'rust-struct-13',
   type:'short',
   q:'在结构体里存放文本字段时，什么时候更推荐用 String，什么时候才考虑用 &\'a str？请结合所有权与生命周期说明。',
   reference:'1. 常规业务结构体（如 User、Config、Book）通常推荐用拥有所有权的 String：实例自己管理内存，不依赖外部变量活多久，也不必在结构体、impl 和相关函数签名里层层传递 <\'a> 生命周期标注。\n2. 只有在写临时视图、文本解析器（如 Excerpt）或明确需要避免分配复制的零拷贝场景，且借用范围清晰可控时，才考虑存 &\'a str。\n3. 存 &\'a str 会约束结构体实例不能比原始文本活得更久，无法脱离原数据独立返回或长期保存。',
   points:['说明常规结构体推荐用 String：拥有所有权，免去传播生命周期标注的复杂度','说明 &\'a str 的适用场景：临时视图、解析器或零拷贝性能需求','指出 &\'a str 会限制结构体实例不能比原始数据活得更久','概括两者的权衡：易用性与内存分配成本 vs 零拷贝与生命周期约束'],
   explain:'新手写结构体优先用 String 让数据自给自足；确实需要零拷贝临时视图时，再引入带 <\'a> 的借用结构体。'
  },
  {
   id:'rust-struct-14',
   type:'code',
   q:'定义一个带 #[derive(Debug)] 的结构体 BankAccount，包含 owner: String 和 balance: u32。在 impl BankAccount 里实现：关联函数 new(owner: String, balance: u32) -> Self；方法 deposit(&mut self, amount: u32) 增加余额；方法 balance(&self) -> u32 返回当前余额。在 main 里创建小明（余额 100）的账户，存入 50 后打印户主、当前余额以及账户的 Debug 信息。',
   reference:'#[derive(Debug)]\nstruct BankAccount {\n    owner: String,\n    balance: u32,\n}\n\nimpl BankAccount {\n    fn new(owner: String, balance: u32) -> Self {\n        Self { owner, balance }\n    }\n\n    fn deposit(&mut self, amount: u32) {\n        self.balance += amount;\n    }\n\n    fn balance(&self) -> u32 {\n        self.balance\n    }\n}\n\nfn main() {\n    let mut acc = BankAccount::new(String::from("小明"), 100);\n    acc.deposit(50);\n    println!("{} 当前余额：{}", acc.owner, acc.balance());\n    println!("{:?}", acc);\n}',
   points:['用 #[derive(Debug)] 定义包含 owner: String 和 balance: u32 的 BankAccount 结构体','impl BankAccount 中正确实现不带 self 的关联函数 new 并返回 Self','deposit 使用 &mut self 增加余额，balance 方法使用 &self 返回当前余额','main 中用 mut 创建实例、调用 deposit(50) 并用 {:?} 打印 Debug 信息'],
   explain:'方法名 balance(&self) 可以和字段名 balance 相同，调用时加 () 是调用方法，不加 () 是访问字段。'
  }
 ]
};

// 第 6 关：枚举、Option 与模式匹配。
export const rustEnum:AiLevel={
 id:'rust-enum',
 title:'枚举、Option 与模式匹配',
 summary:'enum 与携带数据、用 Option<T> 告别空指针、match 穷尽匹配、if let / let else 与解构',
 lessons:[
  {
   title:'枚举 enum：列出所有可能的状态',
   body:'当一个值只可能是有限几种情况里的“某一种”时，就该用枚举（enum）。比如方向只能是东、南、西、北之一，每一种可能叫一个“变体”（variant），使用时写作 枚举名::变体名（如 Direction::North）。\nRust 的枚举比很多语言强大得多：每个变体都可以直接携带数据，而且不同变体携带的数据类型和形状可以完全不同！同一个枚举里可以同时出现：\n一、不带数据的单元变体（如 Quit）；\n二、像元组一样按位置带数据的变体（如 Write(String)、ChangeColor(u8, u8, u8)）；\n三、像结构体一样带命名字段的变体（如 Move { x: i32, y: i32 }）。\n和结构体一样，枚举也能加 #[derive(Debug)]，也能用 impl 块定义方法和关联函数，把与这组状态相关的行为收拢在一起。',
   code:`#[derive(Debug)]
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(u8, u8, u8),
}

impl Message {
    fn summary(&self) -> &'static str {
        match self {
            Message::Quit => "退出指令",
            Message::Move { .. } => "移动指令",
            Message::Write(_) => "文本消息",
            Message::ChangeColor(_, _, _) => "改色指令",
        }
    }
}

let msg = Message::Write(String::from("你好 Rust"));
println!("{} -> {:?}", msg.summary(), msg);`,
   explain:[
    {at:'#[derive(Debug)]',text:'枚举同样支持派生 Debug，方便调试打印。'},
    {at:'enum Message {',to:'ChangeColor(u8, u8, u8),',text:'定义枚举 Message：Quit 不带数据，Move 带命名字段，Write 带一个 String，ChangeColor 带三个 u8。一个 Message 值同一时刻只属于其中一种变体。'},
    {at:'impl Message {',text:'枚举也可以有自己的 impl 块来定义方法。'},
    {at:'fn summary(&self) -> &\'static str {',to:'Message::ChangeColor(_, _, _) => "改色指令",',text:'用 match 根据当前是哪种变体返回对应说明（match 马上在后两张卡片细讲）。'},
    {at:'let msg = Message::Write(String::from("你好 Rust"));',text:'用 枚举名::变体名 构造一个携带 String 的 Message 实例。'},
    {at:'println!("{} -> {:?}", msg.summary(), msg);',text:'像结构体一样用点号调用方法，并用 {:?} 打印调试格式。'}
   ]
  },
  {
   title:'Option<T>：Rust 为什么没有 null',
   body:'很多语言里都有 null（空指针 / 空值），表示“这里没有值”。问题是：任何变量都可能悄悄变成 null，如果程序员忘了检查就直接拿来用，程序就会在运行时崩溃——发明者自己都称它为“十亿美元的错误”。\nRust 干脆去掉了 null，改为在标准库里提供一个内置枚举 Option<T>（这里的 <T> 是泛型占位，表示里面可以装任意类型，第 9 关会细讲）：\n  enum Option<T> { Some(T), None }\n一、Some(值) 表示“有值”，None 表示“没有值”。因为它们在标准库的预导入（prelude）里，直接写 Some(5) 和 None 就行，不用写 Option::Some；\n二、安全的关键在于：Option<i32> 和 i32 是两种完全不同的类型！你不能直接写 5 + Some(3)，编译器会强制你先把 Option<i32> 拆开、处理掉 None 的可能，才能拿到里面的 i32；\n三、写 None 时编译器猜不出里面原本是什么类型，需要给出类型标注（如 let absent: Option<i32> = None;）或靠上下文推断；\n四、常用基础方法：is_some() / is_none() 判断有没有值；unwrap_or(默认值) 在有值时取出值、没值时返回安全默认值；unwrap() 会在 None 时直接 panic，正式代码里要少用。',
   code:`let some_num = Some(42);
let absent: Option<i32> = None;

println!("some_num 有值吗？{}", some_num.is_some());
println!("absent 没值吗？{}", absent.is_none());

let a = some_num.unwrap_or(0);
let b = absent.unwrap_or(0);
println!("安全取值并相加：{} + {} = {}", a, b, a + b);`,
   explain:[
    {at:'let some_num = Some(42);',text:'42 默认是 i32，所以编译器自动推断 some_num 的类型是 Option<i32>。'},
    {at:'let absent: Option<i32> = None;',text:'单独写 None 时编译器看不出里面的类型，必须写明 Option<i32>。'},
    {at:'println!("some_num 有值吗？{}", some_num.is_some());',to:'println!("absent 没值吗？{}", absent.is_none());',text:'is_some() 和 is_none() 返回 bool，用来检查里面有没有值。'},
    {at:'let a = some_num.unwrap_or(0);',to:'let b = absent.unwrap_or(0);',text:'unwrap_or(0) 安全取出值：Some(42) 得到 42，None 则返回默认值 0，不会 panic。'},
    {at:'println!("安全取值并相加：{} + {} = {}", a, b, a + b);',text:'拆成 i32 之后就能安全参与加法运算，结果是 42。'}
   ]
  },
  {
   title:'match 表达式：穷尽匹配与绑定值',
   body:'match 是 Rust 里处理枚举和各种条件的强力控制流工具。它把一个值和下面一排“分支”（arm，格式是 模式 => 代码）从上到下依次比对，命中第一个匹配的分支就执行它。\n掌握 match 的五个要点：\n一、穷尽性检查：编译器会检查你是否覆盖了所有可能情况。匹配枚举或 Option 时，只要漏掉一个变体且没有兜底分支，直接编译报错！以后给枚举新增变体时，编译器也会把所有漏改的 match 全部揪出来；\n二、match 是表达式：每个分支都会算出一个值（各分支返回值类型必须一致），可以直接赋给变量，比如 let cents = match coin { ... };；\n三、绑定内部数据：模式可以直接把枚举或 Option 里携带的值拆出来绑定到变量，比如 Some(v) => v + 1；\n四、兜底模式：放在最后一行。如果想用掉剩余的值，写一个变量名（如 other => ...）；如果不关心具体值，用通配符 _ => ...（什么都不做就写 _ => ()）；\n五、多模式与范围：用 | 表示“或”（如 6 | 7 => "周末"），用 ..= 表示包含两端的闭区间（如 1..=5 => "工作日" 或 \'a\'..=\'z\'）。',
   code:`fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}

fn describe(n: u8) -> &'static str {
    match n {
        0 => "零",
        1 | 2 => "一或二",
        3..=9 => "三到九",
        other => {
            println!("收到更大的数：{other}");
            "十及以上"
        }
    }
}`,
   explain:[
    {at:'fn plus_one(x: Option<i32>) -> Option<i32> {',text:'接收一个 Option<i32>，有值就加 1，没值还是 None。'},
    {at:'match x {',to:'Some(i) => Some(i + 1),',text:'穷尽匹配 None 和 Some(i)：Some(i) 把内部数字绑定到变量 i，算出 Some(i + 1) 返回。漏掉任一分支都会编译报错。'},
    {at:'fn describe(n: u8) -> &\'static str {',text:'演示字面量、多模式、范围和兜底变量。'},
    {at:'match n {',text:'从上到下逐条匹配 u8 类型的 n。'},
    {at:'0 => "零",',text:'精确匹配单个值 0。'},
    {at:'1 | 2 => "一或二",',text:'用竖线 | 把多个模式合并到同一个分支。'},
    {at:'3..=9 => "三到九",',text:'用 ..= 匹配闭区间（包含 3 和 9）。'},
    {at:'other => {',to:'"十及以上"',text:'分支代码超过一句时用花括号包起来；other 捕获其余所有值，最后一行不加分号作为该分支的返回值。'}
   ]
  },
  {
   title:'动手试试：带数据的枚举、match 与 Option',
   body:'定义一个带不同形态数据的 Shape 枚举，用 impl 和 match 计算每种图形的面积；再写一个返回 Option<f64> 的安全除法函数，以及使用 |、..= 和通配符 _ 的星期分类函数。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把 Shape::Point => 0.0, 这一行注释掉，运行 cargo run，读一读编译器关于 non-exhaustive patterns（模式未穷尽）的报错信息。看完取消注释。'
    ],
    expect:'面积：12.57\n面积：12.00\n面积：0.00\n10 / 4 = 2.5\n10 / 0 默认值：-1\n周三：工作日，周六：周末，周九：无效星期'
   },
   code:`const PI: f64 = 3.14159;

enum Shape {
    Circle(f64),
    Rectangle { width: f64, height: f64 },
    Point,
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(r) => PI * r * r,
            Shape::Rectangle { width, height } => width * height,
            Shape::Point => 0.0,
        }
    }
}

fn safe_divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None
    } else {
        Some(a / b)
    }
}

fn day_kind(day: u8) -> &'static str {
    match day {
        1..=5 => "工作日",
        6 | 7 => "周末",
        _ => "无效星期",
    }
}

fn main() {
    let shapes = [
        Shape::Circle(2.0),
        Shape::Rectangle { width: 3.0, height: 4.0 },
        Shape::Point,
    ];
    for s in &shapes {
        println!("面积：{:.2}", s.area());
    }

    match safe_divide(10.0, 4.0) {
        Some(v) => println!("10 / 4 = {v}"),
        None => println!("除数不能为 0"),
    }
    println!("10 / 0 默认值：{}", safe_divide(10.0, 0.0).unwrap_or(-1.0));
    println!("周三：{}，周六：{}，周九：{}", day_kind(3), day_kind(6), day_kind(9));
}`,
   explain:[
    {at:'const PI: f64 = 3.14159;',text:'声明圆周率常量。'},
    {at:'enum Shape {',to:'Point,',text:'定义包含三种不同形状变体的枚举：圆形带半径，矩形带命名宽高，点不带数据。'},
    {at:'impl Shape {',to:'fn area(&self) -> f64 {',text:'给枚举实现计算面积的方法。'},
    {at:'match self {',to:'Shape::Point => 0.0,',text:'穷尽匹配三种变体，并分别解构出半径 r 或宽高 width、height 来计算面积。'},
    {at:'fn safe_divide(a: f64, b: f64) -> Option<f64> {',to:'Some(a / b)',text:'除数为 0 返回 None，否则用 Some 包住商，把“可能除零”写进返回类型。'},
    {at:'fn day_kind(day: u8) -> &\'static str {',to:'_ => "无效星期",',text:'依次演示闭区间 1..=5、多模式 6 | 7 和通配符 _ 兜底。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let shapes = [',to:'Shape::Point,',text:'同一枚举的不同变体属于同一个类型 Shape，可以放进同一个数组里！'},
    {at:'for s in &shapes {',to:'println!("面积：{:.2}", s.area());',text:'借用数组逐个计算面积并保留两位小数打印。'},
    {at:'match safe_divide(10.0, 4.0) {',to:'None => println!("除数不能为 0"),',text:'用 match 处理安全除法返回的 Option，10 / 4 得到 2.5。'},
    {at:'println!("10 / 0 默认值：{}", safe_divide(10.0, 0.0).unwrap_or(-1.0));',text:'除零返回 None，unwrap_or(-1.0) 给出默认值 -1。'},
    {at:'println!("周三：{}，周六：{}，周九：{}", day_kind(3), day_kind(6), day_kind(9));',text:'测试三种星期分支的输出。'}
   ]
  },
  {
   title:'if let、while let 与 let ... else：只关心一种情况',
   body:'有时候你只关心一种模式（比如只在 Option 是 Some 时做点事，其余忽略），写完整的 match 还得补一行 _ => ()，略显啰嗦。Rust 提供了三种简洁语法：\n一、if let：只匹配一种模式，写作 if let Some(val) = opt { ... }，也可以按需配一个 else { ... }。它是只关注一个分支的 match 语法糖；代价是放弃了穷尽性检查，所以“只想处理某一种情况”时用它，“必须照顾所有变体”时还是用 match。\n二、while let：只要模式持续匹配，就一直循环，比如 while let Some(n) = counter.next() { ... }，一旦返回 None 循环自动结束。\n三、let ... else：想把匹配出的变量直接留在当前外层作用域继续用，而不是一层层缩进到 if let 的大括号里，就写 let Some(val) = opt else { return; };。注意它的 else 块必须“发散”（diverge），也就是必须通过 return、break、continue 或 panic! 提前离开当前流程，这样编译器才能保证：走到下一行时 val 必然有值。',
   code:`fn show_port(config: Option<u16>) {
    let Some(port) = config else {
        println!("未配置端口，直接返回");
        return;
    };
    println!("启用端口：{port}");
}

let debug_level = Some(2);
if let Some(lv) = debug_level {
    println!("调试级别：{lv}");
} else {
    println!("未开启调试");
}

let mut left = Some(3);
while let Some(n) = left {
    println!("还剩 {n}");
    left = if n > 1 { Some(n - 1) } else { None };
}`,
   explain:[
    {at:'fn show_port(config: Option<u16>) {',text:'接收一个可选的端口号。'},
    {at:'let Some(port) = config else {',to:'return;',text:'let ... else：如果是 None 就打印提示并 return 提前退出；匹配成功则把 port 绑定到外层作用域。'},
    {at:'println!("启用端口：{port}");',text:'主逻辑不用嵌套在缩进里，代码更扁平清晰。'},
    {at:'let debug_level = Some(2);',text:'一个有值的 Option。'},
    {at:'if let Some(lv) = debug_level {',to:'println!("未开启调试");',text:'只关心 Some 时用 if let，同样可以搭配 else 处理不匹配的情况。'},
    {at:'let mut left = Some(3);',text:'可变 Option，用来演示循环消耗。'},
    {at:'while let Some(n) = left {',to:'left = if n > 1 { Some(n - 1) } else { None };',text:'只要 left 匹配 Some(n) 就继续循环，减到 1 之后设为 None，下一次判断自动退出循环。'}
   ]
  },
  {
   title:'模式解构进阶：结构体、守卫、@ 绑定与 ..',
   body:'模式匹配不只用在枚举上，let 绑定、match 分支、if let 都能用来“按形状拆开数据”（解构）：\n一、解构结构体与固定值匹配：可以写 Point { x, y } 取出所有字段，也可以写 Point { x: a, y: b } 顺便改名，还能在字段上直接写具体值来筛选，比如 Point { x, y: 0 } 只匹配落在 x 轴上的点；\n二、忽略部分数据：_ 忽略单个位置（如 (first, _, third)），.. 忽略“剩余所有字段或元素”（如 User { name, .. } 只取姓名，其余字段一笔带过）；\n三、匹配守卫（match guard）：在模式后面补一个 if 条件，比如 Some(x) if x > 10 => ...，用来表达范围或结构写不出来的额外判断。注意编译器不会分析守卫里的逻辑是否穷尽，所以通常仍需要后面的兜底分支；\n四、@ 绑定：有时候既想测试值落不落在某个范围里，又想把这个具体值存进变量里使用，写法是 变量名 @ 模式，比如 id @ 1..=10 => println!("小号 {id}")。',
   code:`struct Point {
    x: i32,
    y: i32,
}

let p = Point { x: 5, y: 0 };
match p {
    Point { x, y: 0 } => println!("在 x 轴上，x = {x}"),
    Point { x: 0, y } => println!("在 y 轴上，y = {y}"),
    Point { x, .. } if x > 10 => println!("很远的点，x = {x}"),
    Point { x, y } => println!("普通点 ({x}, {y})"),
}

let code = 7;
match code {
    n @ 1..=10 => println!("命中区间，具体编号：{n}"),
    _ => println!("其他编号"),
}`,
   explain:[
    {at:'struct Point {',to:'y: i32,',text:'定义一个二维坐标结构体。'},
    {at:'let p = Point { x: 5, y: 0 };',text:'创建一个在 x 轴上的点。'},
    {at:'match p {',text:'对结构体 p 进行模式匹配。'},
    {at:'Point { x, y: 0 } => println!("在 x 轴上，x = {x}"),',text:'要求 y 恰好是 0，同时把 x 绑定成变量。这里正好命中。'},
    {at:'Point { x: 0, y } => println!("在 y 轴上，y = {y}"),',text:'要求 x 恰好是 0，绑定 y。'},
    {at:'Point { x, .. } if x > 10 => println!("很远的点，x = {x}"),',text:'.. 忽略 y 字段，后面的 if x > 10 是匹配守卫，只有条件为真才进入此分支。'},
    {at:'Point { x, y } => println!("普通点 ({x}, {y})"),',text:'兜底分支，解构出剩余所有点的 x 和 y。'},
    {at:'let code = 7;',text:'一个编号值。'},
    {at:'match code {',to:'_ => println!("其他编号"),',text:'n @ 1..=10 既检查 code 是否在 1 到 10 之间，又把具体数字 7 绑定到变量 n 上供打印使用。'}
   ]
  },
  {
   title:'动手试试：if let、let else 与解构守卫实战',
   body:'把 let ... else、if let、while let、结构体解构、.. 忽略、匹配守卫和 @ 绑定串进一个完整程序。\n小提示：classify 接收的是引用 &User，所以在 match user 里解构出的 age 是引用 &u8，守卫里用 *age 解引用取出数值再和 18 比较。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把 greet 函数里 else 块中的 return; 删掉再运行 cargo run，看看编译器关于 let ... else 的 else 分支必须发散的报错。看完改回来。'
    ],
    expect:'你好，小明！\n游客，欢迎光临！\n监听端口：8080\n小红：未成年用户\n老王：已停用账号\n儿童（10 岁）\n倒计时：3\n倒计时：2\n倒计时：1'
   },
   code:`struct User {
    name: String,
    age: u8,
    active: bool,
}

struct Countdown {
    current: u32,
}

impl Countdown {
    fn next(&mut self) -> Option<u32> {
        if self.current == 0 {
            None
        } else {
            let val = self.current;
            self.current -= 1;
            Some(val)
        }
    }
}

fn greet(name: Option<&str>) {
    let Some(who) = name else {
        println!("游客，欢迎光临！");
        return;
    };
    println!("你好，{who}！");
}

fn classify(user: &User) -> &'static str {
    match user {
        User { active: false, .. } => "已停用账号",
        User { age, .. } if *age < 18 => "未成年用户",
        User { age: 18..=60, .. } => "成年活跃用户",
        User { .. } => "长者活跃用户",
    }
}

fn describe_age(age: u8) {
    match age {
        n @ 0..=12 => println!("儿童（{n} 岁）"),
        n @ 13..=17 => println!("青少年（{n} 岁）"),
        n => println!("成年人（{n} 岁）"),
    }
}

fn main() {
    greet(Some("小明"));
    greet(None);

    let config_port: Option<u16> = Some(8080);
    if let Some(port) = config_port {
        println!("监听端口：{port}");
    }

    let u1 = User { name: String::from("小红"), age: 16, active: true };
    let u2 = User { name: String::from("老王"), age: 35, active: false };
    println!("{}：{}", u1.name, classify(&u1));
    println!("{}：{}", u2.name, classify(&u2));
    describe_age(10);

    let mut cd = Countdown { current: 3 };
    while let Some(n) = cd.next() {
        println!("倒计时：{n}");
    }
}`,
   explain:[
    {at:'struct User {',to:'active: bool,',text:'定义包含姓名、年龄和激活状态的用户结构体。'},
    {at:'struct Countdown {',to:'current: u32,',text:'定义一个倒计时器结构体。'},
    {at:'impl Countdown {',to:'Some(val)',text:'每次调用 next 返回 Some(当前值) 并减 1，归零后返回 None，很适合配合 while let。'},
    {at:'fn greet(name: Option<&str>) {',to:'println!("你好，{who}！");',text:'用 let ... else 处理 None 并提前 return，让主流程保持扁平。'},
    {at:'fn classify(user: &User) -> &\'static str {',text:'借用 User 进行分类。'},
    {at:'match user {',to:'User { .. } => "长者活跃用户",',text:'依次使用固定值 active: false + ..、匹配守卫 if *age < 18、范围 18..=60 和兜底 User { .. }。'},
    {at:'fn describe_age(age: u8) {',to:'n => println!("成年人（{n} 岁）"),',text:'用 @ 绑定同时判断年龄区间并拿到具体岁数 n。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'greet(Some("小明"));',to:'greet(None);',text:'分别测试有名字和 None 两种输入。'},
    {at:'let config_port: Option<u16> = Some(8080);',to:'println!("监听端口：{port}");',text:'只关心有端口时用 if let 解包打印。'},
    {at:'let u1 = User {',to:'println!("{}：{}", u2.name, classify(&u2));',text:'小红命中未成年守卫，老王先命中已停用分支。'},
    {at:'describe_age(10);',text:'10 命中 n @ 0..=12，打印“儿童（10 岁）”。'},
    {at:'let mut cd = Countdown { current: 3 };',to:'println!("倒计时：{n}");',text:'while let 反复调用 cd.next()，依次打印 3、2、1，拿到 None 后停止。'}
   ]
  },
  {
   title:'Option 常用组合子：map、and_then、unwrap_or_else、ok_or',
   body:'当一个 Option 需要连续做两三步转换时，层层嵌套 match 会变得很长。Option 自带了一组“组合子”（combinator）方法，可以像流水线一样链式处理。它们常配合“闭包”（写法是 |参数| 表达式，可以理解成一行写完的匿名小函数，第 11 关会细讲）：\n一、map(|x| ...)：有值时把内部值变换成新值再包回 Some(...)；是 None 就什么也不做，继续传出 None；\n二、and_then(|x| ...)：和 map 类似，但闭包本身返回的就是 Option！如果用 map 会套出两层 Option<Option<T>>，and_then 会自动把它摊平为一层 Option<T>，非常适合串联多个“可能失败”的步骤；\n三、unwrap_or(默认值) vs unwrap_or_else(|| ...)：前者不管是不是 Some，参数都会先算一遍；后者只在确实是 None 时才执行闭包计算默认值，如果默认值算起来比较贵（比如读配置、拼字符串），优先用 unwrap_or_else；\n四、ok_or(错误值)：把 Option<T> 转成 Result<T, E>——Some(v) 变成 Ok(v)，None 变成 Err(错误值)。这就是通往第 7 关错误处理的桥梁！',
   code:`fn half_if_even(n: i32) -> Option<i32> {
    if n % 2 == 0 { Some(n / 2) } else { None }
}

let a = Some(10)
    .and_then(half_if_even)
    .map(|x| x + 1)
    .unwrap_or_else(|| 0);

let b: Result<i32, &str> = half_if_even(7).ok_or("不是偶数");
println!("a = {a}, b = {:?}", b);`,
   explain:[
    {at:'fn half_if_even(n: i32) -> Option<i32> {',to:'if n % 2 == 0 { Some(n / 2) } else { None }',text:'如果是偶数就返回一半（Some），奇数返回 None。'},
    {at:'let a = Some(10)',text:'起点是 Some(10)。'},
    {at:'.and_then(half_if_even)',text:'因为 half_if_even 返回 Option，用 and_then 避免套出 Option<Option<i32>>，这里得到 Some(5)。'},
    {at:'.map(|x| x + 1)',text:'把里面的 5 加 1，变成 Some(6)；如果前面已经是 None，这一步会自动跳过。'},
    {at:'.unwrap_or_else(|| 0);',text:'只在 None 时才执行闭包算出默认值；这里因为是 Some(6)，直接取出 6，闭包不会运行。'},
    {at:'let b: Result<i32, &str> = half_if_even(7).ok_or("不是偶数");',text:'7 是奇数返回 None，ok_or 把 None 转成带原因的 Err("不是偶数")，预告第 7 关的 Result。'},
    {at:'println!("a = {a}, b = {:?}", b);',text:'打印 a = 6, b = Err("不是偶数")。'}
   ]
  },
  {
   title:'动手试试：链式组合处理 Option',
   body:'用组合子搭一条端口号解析流水线：先去空格并尝试解析成 u16，再检查是否是非特权端口（>= 1024），接着加 1 得到备用端口，任何一步失败就用 unwrap_or_else 退回默认端口 3000。\nparse_port 里的 .parse::<u16>() 返回的是第 7 关要学的 Result，后面的 .ok() 会把它顺手转成 Option（成功变 Some，失败变 None）。',
   practice:{
    steps:[
     '确认装好了 Rust：打开终端（Windows 用 PowerShell，Mac 用“终端”），输入 cargo --version，能看到版本号就行；没装的话按第 1 关「安装 Rust」那张卡片的步骤装好。',
     '在终端里运行 cargo new rust-try，新建一个叫 rust-try 的项目，再输入 cd rust-try 进入这个项目文件夹（已经建过的话直接进入即可）。',
     '用编辑器（比如 VS Code）打开 src/main.rs，把里面原有的内容全部删掉，换成下面的代码，保存。',
     '在终端里运行 cargo run，对照下面的输出。输出前面那几行 Compiling、Finished、Running 是 cargo 自己的进度提示，不算程序的输出。',
     '把 unwrap_or_else(|| 3000) 改成 unwrap_or_else(|| { println!("触发默认端口"); 3000 })，再运行，观察只有失败的三种输入才会打印“触发默认端口”，而 Some(" 8080 ") 不会触发。'
    ],
    expect:'Some(" 8080 ") -> 最终端口：8081\nSome("80") -> 最终端口：3000\nSome("abc") -> 最终端口：3000\nNone -> 最终端口：3000\nok_or 成功：Ok(9000)\nok_or 失败：Err("端口格式不对")'
   },
   code:`fn parse_port(raw: &str) -> Option<u16> {
    raw.trim().parse::<u16>().ok()
}

fn check_user_port(port: u16) -> Option<u16> {
    if port >= 1024 {
        Some(port)
    } else {
        None
    }
}

fn main() {
    let inputs = [Some(" 8080 "), Some("80"), Some("abc"), None];

    for input in inputs {
        let port = input
            .and_then(parse_port)
            .and_then(check_user_port)
            .map(|p| p + 1)
            .unwrap_or_else(|| 3000);
        println!("{:?} -> 最终端口：{port}", input);
    }

    let ok_res = parse_port("9000").ok_or("端口格式不对");
    let err_res = parse_port("oops").ok_or("端口格式不对");
    println!("ok_or 成功：{:?}", ok_res);
    println!("ok_or 失败：{:?}", err_res);
}`,
   explain:[
    {at:'fn parse_port(raw: &str) -> Option<u16> {',to:'raw.trim().parse::<u16>().ok()',text:'先去掉首尾空白，再尝试解析成 u16，.ok() 把解析结果转成 Option<u16>。'},
    {at:'fn check_user_port(port: u16) -> Option<u16> {',to:'None',text:'端口号大于等于 1024 返回 Some(port)，否则返回 None。'},
    {at:'fn main() {',text:'程序入口。'},
    {at:'let inputs = [Some(" 8080 "), Some("80"), Some("abc"), None];',text:'准备四组测试数据：合法端口、过小端口、非法文字和缺失值。'},
    {at:'for input in inputs {',text:'依次把每组数据送进流水线。'},
    {at:'let port = input',text:'从 Option<&str> 出发。'},
    {at:'.and_then(parse_port)',text:'第一步：解析成端口数字，遇到 "abc" 或 None 会直接短路成 None。'},
    {at:'.and_then(check_user_port)',text:'第二步：校验端口范围，80 小于 1024 在这里变成 None。'},
    {at:'.map(|p| p + 1)',text:'第三步：只有通过校验的 8080 会加 1 变成 Some(8081)。'},
    {at:'.unwrap_or_else(|| 3000);',text:'兜底：拿到内部端口号，前面任何一步是 None 都按需返回 3000。'},
    {at:'println!("{:?} -> 最终端口：{port}", input);',text:'打印每组输入对应的最终结果。'},
    {at:'let ok_res = parse_port("9000").ok_or("端口格式不对");',to:'let err_res = parse_port("oops").ok_or("端口格式不对");',text:'演示 ok_or：Some(9000) 变成 Ok(9000)，None 变成 Err("端口格式不对")。'},
    {at:'println!("ok_or 成功：{:?}", ok_res);',to:'println!("ok_or 失败：{:?}", err_res);',text:'用 Debug 格式打印转换后的 Result。'}
   ]
  },
  {
   title:'结构体 vs 枚举怎么选：乘积类型 vs 和类型',
   body:'学完第 5 关结构体和第 6 关枚举，你已经拿到了 Rust 建模的两块核心积木。它们在类型论里分别叫“乘积类型”和“和类型”，选择口诀非常简单：\n一、结构体（乘积类型，“且”关系）：当一个数据“同时拥有”所有字段时用 struct。例如一个 User 同时有姓名、年龄、状态；总可能取值数是各字段可能数的乘积。\n二、枚举（和类型，“或”关系）：当一个数据在几种互斥情况里“只能是其中之一”时用 enum。例如支付方式只能是现金、银行卡或未支付之一；总可能取值数是各变体可能数的和。\n三、黄金原则——让非法状态无法表示：新手常写出 struct Session { logged_in: bool, username: Option<String> }，这会允许 logged_in: true 却 username: None 这种自相矛盾的脏状态。改写成 enum Session { Guest, LoggedIn { username: String } } 之后，非法状态在类型层面根本造不出来，配合 match 的穷尽检查，一整类逻辑漏洞直接消失。\n实际项目里，两者经常嵌套搭配：枚举变体里包着结构体，结构体字段里放着枚举（包括 Option）。'
  }
 ],
 quiz:[
  {
   id:'rust-enum-1',
   q:'在 Rust 中，为什么 Option<i32> 和 i32 不能直接相加（例如 5 + Some(1)）？',
   options:['Option 里的数字在编译时会变成文本','Rust 不支持给枚举变体携带任何整数','两者是不同类型，必须先处理 None 情况','Some(1) 没有加 mut，不能参与加法'],
   why:['Option<i32> 内部保存的就是 i32，不会变成文本。','Rust 枚举的每个变体都可以自由携带整数、字符串、结构体等任意类型数据。','','加法不需要变量可变，问题在于 Option<i32> 可能是 None，不能直接当 i32 用。'],
   answer:2,
   explain:'Rust 把“可能没有值”编进了类型系统：Option<i32> 和 i32 是不同类型，必须先通过 match、if let 或 unwrap_or 等显式处理 None，才能拿到 i32。'
  },
  {
   id:'rust-enum-2',
   q:'如果一个 match 表达式匹配某个枚举，但漏掉了其中一个变体且没有兜底分支，会发生什么？',
   options:['编译报错，提示模式没有覆盖所有情况','编译通过，遇到漏掉的变体自动跳过','编译通过，遇到漏掉的变体返回默认值','编译给出警告，但程序仍能正常运行'],
   why:['','match 具有穷尽性检查，漏掉变体属于编译错误，不会自动跳过。','Rust 不会悄悄捏造默认值，必须由你明确写出每个分支或兜底处理。','这不是警告而是硬错误，不补全分支就编译不过。'],
   answer:0,
   explain:'match 是穷尽的：编译器强制覆盖所有可能情况，防止遗漏状态（包括以后给枚举新增变体时漏改旧代码）。'
  },
  {
   id:'rust-enum-3',
   type:'judge',
   q:'同一个 Rust 枚举的不同变体可以携带完全不同类型、不同数量的数据，甚至有的变体不带任何数据。',
   answer:true,
   explain:'例如 enum Message { Quit, Move { x: i32, y: i32 }, Write(String) }，一个枚举可以自由组合无数据、元组样式和结构体样式的变体。'
  },
  {
   id:'rust-enum-4',
   q:'下面这段使用 let ... else 的代码，为什么能通过编译？',
   code:'fn show(opt: Option<i32>) {\n    let Some(n) = opt else {\n        return;\n    };\n    println!("数值：{n}");\n}',
   options:['因为 else 里会自动把 n 初始化成 0','因为 Option<i32> 不会出现 None 分支','因为 let else 会跳过所有的借用检查','因为 else 分支通过 return 提前离开'],
   why:['else 块并不会给 n 赋默认值，而是直接中止当前流程。','opt 完全可能是 None，此时就会走入 else 分支执行 return。','let ... else 同样遵守所有权和借用检查，并没有跳过检查。',''],
   answer:3,
   explain:'let ... else 要求 else 块必须发散（如 return、break、continue 或 panic!），从而保证能走到后面代码时变量 n 已经绑定成功。'
  },
  {
   id:'rust-enum-5',
   type:'multi',
   q:'对比 match 和 if let，下面哪些说法是正确的？（多选）',
   options:['if let 会像 match 一样强制穷尽检查','只关心一种模式时 if let 写起来更简洁','match 是表达式，各分支返回值类型要一致','if let 后面不能再配合 else 分支使用'],
   why:['if let 恰恰放弃了穷尽性检查，只处理你指定的那一种模式，其余自动忽略。','','','if let 后面完全可以跟 else { ... }，用来处理不匹配时的逻辑。'],
   answers:[1,2],
   explain:'if let 适合只关注一种模式的场景，可以搭配 else，但不做穷尽检查；match 做穷尽检查且作为表达式时各分支返回值类型需一致。'
  },
  {
   id:'rust-enum-6',
   q:'下面代码会打印什么？',
   code:'let x: Option<i32> = Some(4);\nlet res = x.map(|n| n * 2).unwrap_or(0);\nprintln!("{res}");',
   options:['打印 Some(8)','打印数字 8','打印数字 4','打印数字 0'],
   why:['unwrap_or(0) 会把 Some(8) 里面的值取出来，得到的是 i32 类型的 8，不再包着 Some。','','map(|n| n * 2) 已经把内部的 4 乘以 2 变成了 Some(8)。','只有在值为 None 时 unwrap_or(0) 才会返回默认值 0。'],
   answer:1,
   explain:'map(|n| n * 2) 把 Some(4) 变成 Some(8)，再经 unwrap_or(0) 取出内部的 8。'
  },
  {
   id:'rust-enum-7',
   type:'fill',
   q:'在 match 分支里，想同时测试范围 1..=10 并把值绑定到变量 id，需要在 id 和 1..=10 之间写符号＿。',
   accepted:['@'],
   explain:'@ 绑定（如 id @ 1..=10）让你在检查值是否符合某个模式的同时，把它保存到变量 id 中供分支右侧使用。'
  },
  {
   id:'rust-enum-8',
   q:'在 Option 的链式调用里，map 和 and_then 的核心区别是？',
   options:['map 用来处理 None，and_then 处理 Some','map 会消耗所有权，and_then 不会消耗','and_then 接收返回 Option 的闭包并摊平','and_then 会把 Option 直接转成 Result'],
   why:['两者都是在 Some 时执行闭包、在 None 时直接透传 None。','两者对 Option<T> 都是按值接收 self，行为一致。','','把 Option 转成 Result 用的是 ok_or 或 ok_or_else，不是 and_then。'],
   answer:2,
   explain:'当闭包返回普通值 U 时用 map 得到 Option<U>；当闭包本身返回 Option<U> 时用 and_then，可避免嵌套出 Option<Option<U>>。'
  },
  {
   id:'rust-enum-9',
   type:'judge',
   q:'opt.unwrap_or(compute()) 和 opt.unwrap_or_else(|| compute()) 的执行效果完全一致，在 opt 为 Some 时都不会调用 compute()。',
   answer:false,
   explain:'unwrap_or 的参数在调用前就会立即求值，即使 opt 是 Some 也会先跑一遍 compute()；unwrap_or_else 只有在 opt 为 None 时才会调用闭包。'
  },
  {
   id:'rust-enum-10',
   q:'下面哪个 match 分支同时用到了“结构体解构”、“忽略其余字段”和“匹配守卫”？',
   options:['User { age, .. } if age >= 18 => "成年"','User { age: 18..=60, active: true } => "成年"','User { name, age, active } => "已匹配"','Some(x) if x > 18 => "大于十八"'],
   why:['','这个分支写全了字段且用的是范围模式，没有使用 .. 忽略其余字段，也没有写 if 守卫。','这里解构了所有字段，没有用 .. 忽略字段，也没有写匹配守卫。','这里匹配的是 Option 枚举而不是结构体，也没有使用 .. 忽略其余字段。'],
   answer:0,
   explain:'User { age, .. } 解构了结构体并用 .. 忽略其余字段，后面的 if age >= 18 就是匹配守卫。'
  },
  {
   id:'rust-enum-11',
   type:'multi',
   q:'下面关于 Rust 枚举与模式匹配的写法，哪些是合法的？（多选）',
   options:['用 | 把多个模式合并在同一分支','用 1..=5 匹配包含端点的闭区间','用 impl 给枚举定义方法和关联函数','用 ok_or 把 Option 转成 Result'],
   why:['','','',''],
   answers:[0,1,2,3],
   explain:'Rust 支持用 | 合并多模式、用 ..= 匹配闭区间、用 impl 给枚举写方法，也可以用 Option::ok_or 无缝衔接第 7 关的 Result。'
  },
  {
   id:'rust-enum-12',
   type:'fill',
   q:'在 match 表达式里，如果不需要使用捕获到的值、只想匹配任意剩余情况作为兜底分支，常用的通配符是＿。',
   accepted:['_'],
   explain:'_ 是通配符，能匹配任意值且不绑定变量（也不会移动所有权），常写在 match 最后一行兜底。'
  },
  {
   id:'rust-enum-13',
   type:'short',
   q:'在设计数据模型时，结构体（struct）和枚举（enum）分别适合什么场景？为什么说“用枚举代替 bool + Option 的组合”能让非法状态无法表示？',
   reference:'1. 结构体是“乘积类型”（且关系）：适合描述同时拥有多个属性的实体，例如 User 同时具有 name、age 和 active。\n2. 枚举是“和类型”（或关系）：适合描述在若干种互斥状态里“多选一”的数据，且每种状态可以携带各自专属的数据。\n3. 如果用 struct Session { logged_in: bool, username: Option<String> }，就会出现 logged_in: true 但 username: None 这种自相矛盾的非法状态，业务代码到处得做防御判断。\n4. 改用 enum Session { Guest, LoggedIn { username: String } } 后，只有已登录变体才携带用户名，非法状态在类型层面根本造不出来，配合 match 穷尽检查更安全。',
   points:['说明结构体表示“且”关系（同时拥有多个字段，乘积类型）','说明枚举表示“或”关系（互斥状态多选一，和类型）','指出 bool + Option 组合可能产生矛盾的非法状态','说明带数据的枚举能在编译期杜绝非法状态并配合 match 穷尽检查'],
   explain:'“让非法状态无法表示”是 Rust 类型建模的核心思想：把业务状态约束交给类型系统和编译器来把关。'
  },
  {
   id:'rust-enum-14',
   type:'code',
   q:'定义一个枚举 Command，包含三个变体：Quit（无数据）、Echo(String)（携带一段文字）、Add(i32, i32)（携带两个整数）。写一个函数 run(cmd: Command)，用 match 处理所有变体：Quit 打印“退出”；Echo(msg) 打印“回显：{msg}”；Add(a, b) 打印“{a} + {b} = {}”。在 main 中依次调用这三种命令。',
   reference:'enum Command {\n    Quit,\n    Echo(String),\n    Add(i32, i32),\n}\n\nfn run(cmd: Command) {\n    match cmd {\n        Command::Quit => println!("退出"),\n        Command::Echo(msg) => println!("回显：{msg}"),\n        Command::Add(a, b) => println!("{a} + {b} = {}", a + b),\n    }\n}\n\nfn main() {\n    run(Command::Echo(String::from("你好")));\n    run(Command::Add(3, 5));\n    run(Command::Quit);\n}',
   points:['正确定义包含 Quit、Echo(String)、Add(i32, i32) 三个变体的 Command 枚举','run 函数使用 match 穷尽匹配全部三个变体','在 Echo(msg) 和 Add(a, b) 分支中正确解构出携带的数据','main 中构造并依次传入三种变体调用 run'],
   explain:'枚举的不同变体可以携带不同类型和数量的数据，配合 match 解构能在一个函数里清晰且安全地分发所有命令。'
  }
 ]
};
