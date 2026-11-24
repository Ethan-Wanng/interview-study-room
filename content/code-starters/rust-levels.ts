import type {StarterMap} from './types';

// Rust 闯关代码题（15 道关卡编程题）的作答框架。
export const rustLevelStarters:StarterMap={
'rust-start-16':{
rust:String.raw`fn main() {
    // TODO 1：用 let 声明变量 city 存 "杭州"，变量 year 存 2026
    ...
    // TODO 2：用 println! 和 {} 占位符打印“我在杭州，今年是 2026 年”（注意语句以分号结尾）
    ...
}`,
},

'rust-basics-18':{
rust:String.raw`fn max_of(a: i32, b: i32) -> i32 {
    // TODO 1：用 if 表达式返回 a、b 中较大的值（不使用 return，末尾不加分号）
    ...
}

fn main() {
    // TODO 2：调用 max_of(3, 9) 并打印结果
    ...
}`,
},

'rust-ownership-17':{
rust:String.raw`fn shout(s: &mut String) {
    // TODO 1：在可变引用指向的字符串末尾追加 "!!!"
    ...
}

fn count(s: &str) -> usize {
    // TODO 2：返回字符串切片的字节数
    ...
}

fn main() {
    // TODO 3：创建 String::from("hi")，并传入 shout 修改它的内容
    ...
    // TODO 4：传入不可变引用调用 count 并打印结果（应为 5）
    ...
}`,
},

'rust-lifetime-16':{
rust:String.raw`// TODO 1：在函数名后声明生命周期参数，只给需要的参数和返回值标上生命周期（临时参数不标）
fn pick_first(a: &str, b: &str) -> &str {
    // TODO 2：打印 b 后返回 a
    ...
}

fn main() {
    let name = String::from("Ferris");
    // TODO 3：在内层作用域创建临时 String 作为第二个参数调用 pick_first，块外仍能打印返回值
    ...
}`,
},

'rust-struct-14':{
rust:String.raw`#[derive(Debug)]
struct BankAccount {
    owner: String,
    balance: u32,
}

impl BankAccount {
    fn new(owner: String, balance: u32) -> Self {
        // TODO 1：构造并返回 BankAccount 实例
        ...
    }

    fn deposit(&mut self, amount: u32) {
        // TODO 2：把 amount 累加到当前余额
        ...
    }

    fn balance(&self) -> u32 {
        // TODO 3：返回当前余额
        ...
    }
}

fn main() {
    // TODO 4：创建小明（余额 100）的账户，存入 50 后打印户主、当前余额以及 Debug 信息
    ...
}`,
},

'rust-enum-14':{
rust:String.raw`enum Command {
    Quit,
    Echo(String),
    Add(i32, i32),
}

fn run(cmd: Command) {
    // TODO 1：用 match 穷尽匹配 Command::Quit、Echo 与 Add 三个变体
    // TODO 2：解构出携带的数据，分别打印“退出”、“回显：{msg}”和“{a} + {b} = 结果”
    match cmd {
        ...
    }
}

fn main() {
    // TODO 3：依次构造 Echo、Add、Quit 三种命令并传入 run 调用
    ...
}`,
},

'rust-collections-14':{
rust:String.raw`#[derive(Debug)]
enum AgeError {
    Empty,
    InvalidNumber,
    OutOfRange(u8),
}

fn parse_age(input: &str) -> Result<u8, AgeError> {
    // TODO 1：去掉两端空白并判空，空字符串返回 Empty 错误
    ...
    // TODO 2：将去空白后的文本解析为 u8，失败返回 InvalidNumber 错误
    let age: u8 = ...;
    // TODO 3：若大于 120 返回 OutOfRange 错误，否则返回 Ok(age)
    ...
}

fn main() {
    // TODO 4：用正常输入及三类错误输入调用 parse_age 并打印匹配结果
    ...
}`,
},

'rust-modules-12':{
rust:String.raw`mod math {
    pub fn clamp(val: i32, min: i32, max: i32) -> i32 {
        // TODO 1：若 min > max 则 panic!("范围无效")；否则把 val 限制在 [min, max] 区间内返回
        ...
    }
}

#[cfg(test)]
mod tests {
    // TODO 2：通过 super 导入 math 模块中的 clamp 函数
    ...

    // TODO 3：编写 #[test] 用例，用 assert_eq! 断言中间值、下界和上界的结果
    ...

    // TODO 4：编写 #[should_panic(expected = "范围无效")] 用例，测试 min > max 的非法区间
    ...
}`,
},

'rust-generics-14':{
rust:String.raw`trait Printable {
    fn label(&self) -> String;

    fn show(&self) {
        // TODO 1：调用自身的 label 方法并按 "[标签] {}" 格式打印
        ...
    }
}

struct Task {
    title: String,
}

impl Printable for Task {
    fn label(&self) -> String {
        // TODO 2：返回任务标题
        ...
    }
}

fn print_item(item: &impl Printable) {
    // TODO 3：调用参数上的展示方法
    ...
}

fn main() {
    // TODO 4：创建 Task 实例并传入 print_item 演示调用
    ...
}`,
},

'rust-iterators-14':{
rust:String.raw`struct Counter {
    current: u32,
    max: u32,
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        // TODO 1：推进 current 依次产出 1 到 max（包含 max）的 Some 值，超出则返回 None
        ...
    }
}

fn main() {
    let c = Counter { current: 0, max: 10 };
    // TODO 2：组合迭代器适配器筛选奇数、计算平方并求和
    let sum: u32 = ...;
    // TODO 3：打印求和结果（应为 165）
    ...
}`,
},

'rust-smart-ptr-14':{
rust:String.raw`use std::borrow::Cow;

fn replace_underscores(s: &str) -> Cow<'_, str> {
    // TODO 1：若 s 包含 '_'，将所有 '_' 替换成 '-' 并返回拥有所有权的 Cow
    if ... {
        ...
    } else {
        // TODO 2：否则零拷贝返回借用原切片的 Cow
        ...
    }
}

fn main() {
    // TODO 3：测试 "rust_lang" 和 "rust-lang"，调用 replace_underscores 并打印结果
    ...
}`,
},

'rust-concurrency-14':{
rust:String.raw`use std::thread;

fn parallel_sum(nums: &[i32]) -> i32 {
    // TODO 1：在 scope 外部将切片拆成左右两半 &[i32]
    let (left, right) = ...;
    // TODO 2：用 std::thread::scope 启动两个作用域线程，闭包直接借用切片求和（不用 Arc 或拷贝）
    // TODO 3：调用 join() 获取两半结果并相加返回
    thread::scope(|s| {
        ...
    })
}`,
},

'rust-async-14':{
rust:String.raw`use std::future::Future;
use std::pin::{Pin, pin};
use std::task::{Context, Poll, Waker};

struct ReadyValue(i32);

impl Future for ReadyValue {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        // TODO 1：直接返回就绪的 Poll 结果
        ...
    }
}

fn block_on<F: Future>(fut: F) -> F::Output {
    // TODO 2：固定 fut 并用 Waker 构造 Context
    ...
    // TODO 3：循环轮询 fut，就绪后返回结果
    ...
}

fn main() {
    // TODO 4：用 block_on 驱动 ReadyValue(42) 并打印 42
    ...
}`,
},

'rust-unsafe-macros-14':{
rust:String.raw`macro_rules! max_of {
    // TODO 1：单参数分支（支持可选尾逗号），直接返回该表达式
    ...
    // TODO 2：多参数分支（支持可选尾逗号），使用重复语法匹配剩余参数
    // TODO 3：把每个参数绑定到局部临时变量后再比较，避免重复求值
    ...
}

fn main() {
    // TODO 4：调用并打印 max_of!(3) 和 max_of!(10, 42, 18,) 的结果
    ...
}`,
},

'rust-engineering-14':{
rust:String.raw`#[derive(Debug)]
struct Pair<'a> {
    key: &'a str,
    val: &'a str,
}

fn parse_pair(line: &str) -> Option<Pair<'_>> {
    // TODO 1：按第一个 '=' 零拷贝拆分键值，缺少 '=' 时直接返回 None
    let (k, v) = ...;
    // TODO 2：去掉两端空白并检查键是否为空，为空时返回 None
    ...
    // TODO 3：零拷贝构造并返回 Pair（不分配 String）
    ...
}

fn main() {
    // TODO 4：分别测试 " host = 127.0.0.1 " 与 "invalid" 并打印结果
    ...
}`,
},
};
