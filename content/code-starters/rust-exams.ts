import type {StarterMap} from './types';

// Rust 训练与考试题（rustExams）共 13 道代码题的作答框架。
export const rustExamStarters:StarterMap={
'rust-x1-33':{
rust:String.raw`fn last_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    // TODO 1：从右向左跳过末尾空格（注意防止 usize 下溢），确定最后一个单词的结束下标
    ...
    // TODO 2：继续向左扫描确定单词起点，直接返回原串切片（空串或全为空格时返回 ""，不分配 String）
    ...
}

fn main() {
    let line = String::from("hello rust world  ");
    // TODO 3：分别传入 &line、单单词字面量和纯空格字面量调用 last_word 并打印输出
    ...
}`,
},

'rust-x1-34':{
rust:String.raw`fn longer_or_default<'a>(a: &'a str, b: &'a str, min_len: usize, note: &str) -> &'a str {
    // TODO 1：先打印 note；若 a 和 b 的字节长度都小于 min_len，返回固定字面量 "default"
    ...
    // TODO 2：否则按字节长度返回较长切片（长度相等时返回 a）
    ...
}

fn main() {
    let s1 = String::from("rust");
    let s2 = String::from("ownership");
    // TODO 3：在内层代码块创建临时 String 作为 note 调用函数，在代码块结束释放后再打印外层保留的返回值
    ...
}`,
},

'rust-x2-40':{
rust:String.raw`use std::collections::HashMap;
use std::num::ParseIntError;

#[derive(Debug, PartialEq)]
enum ScoreError {
    EmptyLine,
    BadFormat(String),
    BadNumber(ParseIntError),
}

impl From<ParseIntError> for ScoreError {
    // TODO 1：实现错误转换，将 ParseIntError 包装为对应的 ScoreError 变体
    fn from(e: ParseIntError) -> Self {
        ...
    }
}

fn sum_scores(lines: &[&str]) -> Result<HashMap<String, i32>, ScoreError> {
    let mut totals = HashMap::new();
    for &raw in lines {
        let line = raw.trim();
        // TODO 2：校验空行（返回 EmptyLine）与冒号格式（缺少 ':' 时返回 BadFormat）
        ...
        // TODO 3：解析分数字段并使用 ? 自动转换 ParseIntError，再按用户名累加总分
        ...
    }
    Ok(totals)
}

fn main() {
    let ok_data = ["Alice: 10", "Bob: 20", "Alice: 15"];
    let bad_data = ["Alice: 10", "Bob: xx"];
    // TODO 4：分别测试正常输入与错误输入并打印 sum_scores 返回结果
    ...
}`,
},

'rust-x2-41':{
rust:String.raw`struct StepRange {
    cur: i32,
    end: i32,
    step: i32,
}

impl StepRange {
    fn new(start: i32, end: i32, step: i32) -> Self {
        // TODO 1：校验 step 合法性并构造 StepRange 实例
        ...
    }
}

impl Iterator for StepRange {
    // TODO 2：声明关联类型 Item 并实现 next（超过 end 返回 None，否则产出当前值并按 step 推进）
    type Item = ...;

    fn next(&mut self) -> Option<Self::Item> {
        ...
    }
}

fn main() {
    // TODO 3：构造 StepRange::new(1, 20, 3)，用迭代器适配器筛偶数、平方、取前 3 项并收集为 Vec<i32> 打印
    let res: Vec<i32> = ...;
    println!("{:?}", res);
}`,
},

'rust-e1-24':{
rust:String.raw`use std::collections::HashMap;

pub fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    // TODO 1：按空白切分 text 并统一转为小写，使用 HashMap 统计各单词出现频次
    ...
    let mut items: Vec<(String, usize)> = counts.into_iter().collect();
    // TODO 2：按“频次从高到低、频次相同时按字典序从小到大”排序
    ...
    // TODO 3：截取前 k 个结果并返回
    ...
}`,
},

'rust-e1-25':{
rust:String.raw`pub struct SplitNonEmpty<'a> {
    rest: &'a str,
    sep: char,
}

impl<'a> SplitNonEmpty<'a> {
    pub fn new(s: &'a str, sep: char) -> Self {
        // TODO 1：初始化结构体字段
        ...
    }
}

impl<'a> Iterator for SplitNonEmpty<'a> {
    // TODO 2：声明关联类型 Item，使其切片生命周期绑定到原字符串 'a
    type Item = ...;

    fn next(&mut self) -> Option<Self::Item> {
        // TODO 3：若 rest 为空返回 None；否则查找 sep，跳过连续分隔符产生的空子串并按 UTF-8 字节长度推进 rest
        // TODO 4：未找到 sep 时返回剩余非空切片并将 rest 置空
        ...
    }
}`,
},

'rust-x3-21':{
rust:String.raw`use std::thread;

fn parallel_square_sum(data: &[i64], chunks: usize) -> i64 {
    // TODO 1：处理 data 为空或 chunks == 0 返回 0 的边界，并计算每个分块大小
    ...
    thread::scope(|s| {
        // TODO 2：按 chunks 切分 data 并派生作用域线程，零克隆直接借用子切片计算局部平方和
        ...
        // TODO 3：收集句柄并 join 汇总所有分块的平方和返回
        ...
    })
}

fn main() {
    let nums: Vec<i64> = (1..=10).collect();
    // TODO 4：调用 parallel_square_sum(&nums, 3) 并打印及断言验证结果
    ...
}`,
},

'rust-x4-14':{
rust:String.raw`macro_rules! svec {
    // TODO 1：匹配零个或多个表达式（兼容末尾可选逗号），将每项通过 .to_string() 收集为 Vec<String>
    ...
}

fn pick_two_mut<T>(slice: &mut [T], i: usize, j: usize) -> Option<(&mut T, &mut T)> {
    // TODO 2：当 i == j 或任一下标越界时提前返回 None，确保安全抽象的前置条件成立
    ...
    // TODO 3：通过 as_mut_ptr() 与 unsafe 裸指针偏移构造两个互不重叠的 &mut T，并附上 // SAFETY: 注释
    ...
}

fn main() {
    // TODO 4：用 svec! 构造测试数据，验证 pick_two_mut 的正常修改、i == j 以及越界边界场景
    ...
}`,
},

'rust-e2-24':{
rust:String.raw`use std::sync::{mpsc, Arc, Mutex};
use std::thread::{self, JoinHandle};

type Job = Box<dyn FnOnce() + Send + 'static>;

pub struct ThreadPool {
    // TODO 1：定义需由 Option 包裹的任务发送端与工作线程句柄集合，以便在 Drop 中移出所有权
    ...
}

impl ThreadPool {
    pub fn new(size: usize) -> Self {
        assert!(size > 0);
        // TODO 2：创建 mpsc 通道并用 Arc<Mutex<...>> 共享接收端；启动 size 个工作线程循环取任务，
        //         取出任务后立刻释放锁再执行，通道关闭后退出线程
        ...
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        // TODO 3：将闭包装箱为 Job 并通过发送端投递到任务队列
        ...
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        // TODO 4：先释放发送端关闭通道，再依次 join 等待所有工作线程优雅退出
        ...
    }
}`,
},

'rust-e2-25':{
rust:String.raw`#[macro_export]
macro_rules! btree_map {
    // TODO 1：空参分支，创建并返回空的 std::collections::BTreeMap
    ...
    // TODO 2：非空分支，匹配一个或多个 key => value 键值对（兼容末尾可选逗号），
    //         使用合法的块表达式插入全部键值对后返回 map
    ...
}`,
},

'rust-f-28':{
rust:String.raw`use std::collections::{HashMap, VecDeque};
use std::hash::Hash;

pub struct LruCache<K, V> {
    cap: usize,
    map: HashMap<K, V>,
    order: VecDeque<K>,
}

impl<K, V> LruCache<K, V>
where
    K: Eq + Hash + Clone,
{
    pub fn new(cap: usize) -> Self {
        assert!(cap > 0);
        Self {
            cap,
            map: HashMap::with_capacity(cap),
            order: VecDeque::with_capacity(cap),
        }
    }

    // TODO 1：实现辅助方法，将已有 key 移动到 order 的最近使用端
    fn touch(&mut self, key: &K) {
        ...
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        // TODO 2：若键存在则先更新访问顺序再返回引用（注意避免可变借用与返回引用的生命周期冲突）
        ...
    }

    pub fn put(&mut self, key: K, val: V) {
        // TODO 3：若键已存在，更新其值并刷新到最近使用端（不触发淘汰）
        // TODO 4：若键不存在且容量已满，先从 order 与 map 中淘汰最久未使用的键，再插入新键值
        ...
    }
}`,
},

'rust-f-29':{
rust:String.raw`use std::future::Future;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::time::timeout;

pub async fn run_bounded<T, E, Fut>(
    tasks: Vec<Fut>,
    limit: usize,
    timeout_dur: Duration,
) -> Vec<Result<T, String>>
where
    Fut: Future<Output = Result<T, E>> + Send + 'static,
    T: Send + 'static,
    E: std::fmt::Display + Send + 'static,
{
    // TODO 1：初始化并发上限信号量 Arc<Semaphore> 与按输入顺序存放 JoinHandle 的容器
    ...
    for fut in tasks {
        // TODO 2：通过 tokio::spawn 并发派发任务，先获取信号量许可，再用 timeout 包裹执行并统一映射超时与业务错误
        ...
    }
    // TODO 3：按 handles 原序依次 await 收集结果，保证输出顺序与 tasks 完全一致
    ...
}`,
},

'rust-f-30':{
rust:String.raw`use std::slice;

pub fn my_split_at_mut<T>(slice: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    // TODO 1：先取出长度并断言 mid 合法不越界，再获取裸指针 as_mut_ptr()
    ...
    // TODO 2：补充 // SAFETY: 注释，阐明指针范围合法性与左右区间互不重叠满足别名规则
    // TODO 3：在 unsafe 中利用裸指针与 std::slice::from_raw_parts_mut 构造并返回左右两个可变切片
    unsafe {
        ...
    }
}`,
},
};
