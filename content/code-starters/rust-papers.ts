import type {StarterMap} from './types';

// Rust 模拟试卷（paper/rust-*）共 6 道代码题的作答框架。
export const rustPaperStarters:StarterMap={
'rust-p1-c01':{
rust:String.raw`use std::collections::HashMap;

pub fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)> {
    // TODO 1：处理 k == 0 边界；按空白切分并转为全小写，用 HashMap Entry API 统计词频
    ...
    // TODO 2：通过消费式迭代转为 Vec<(String, usize)>，避免二次克隆字符串
    let mut items: Vec<(String, usize)> = ...;
    // TODO 3：按频次从高到低排序，频次相同时按单词字典序升序排列
    ...
    // TODO 4：截取前 k 项（兼容不同单词总数不足 k 的情况）并返回
    ...
}`,
},

'rust-p1-c02':{
rust:String.raw`use std::error::Error;
use std::fmt;
use std::fs;
use std::io;
use std::path::Path;

#[derive(Debug)]
pub enum ParseSumError {
    Io(io::Error),
    InvalidNumber { line: usize, raw: String },
}

impl fmt::Display for ParseSumError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // TODO 1：格式化输出 Io 与 InvalidNumber 两种错误变体
        ...
    }
}

// TODO 2：为 ParseSumError 实现 std::error::Error（暴露底层 source）以及 From<io::Error>
...

pub fn sum_valid_lines(input: &str) -> Result<i64, ParseSumError> {
    let mut total: i64 = 0;
    // TODO 3：按 1-based 行号遍历 input，去掉首尾空白后跳过空行与 '#' 注释行，
    //         将其余行解析为 i64 累加，失败时映射为 InvalidNumber 并用 ? 返回
    ...
    Ok(total)
}

pub fn sum_file(path: &Path) -> Result<i64, ParseSumError> {
    // TODO 4：用 std::fs::read_to_string(path)? 读取文件内容并调用 sum_valid_lines 返回结果
    ...
}`,
},

'rust-p2-c01':{
rust:String.raw`use std::cell::UnsafeCell;
use std::mem::MaybeUninit;
use std::sync::atomic::{AtomicU8, Ordering};

const UNINIT: u8 = 0;
const RUNNING: u8 = 1;
const READY: u8 = 2;

pub struct OnceCell<T> {
    state: AtomicU8,
    value: UnsafeCell<MaybeUninit<T>>,
}

// TODO 1：为 OnceCell<T> 实现 Send 和 Sync 的 unsafe impl（写出正确的 T trait 约束）
...

impl<T> OnceCell<T> {
    pub const fn new() -> Self {
        Self {
            state: AtomicU8::new(UNINIT),
            value: UnsafeCell::new(MaybeUninit::uninit()),
        }
    }

    pub fn get_or_init<F: FnOnce() -> T>(&self, f: F) -> &T {
        // TODO 2：快路径用合适内存序读取 state，若已 READY 则返回初始化后的只读引用
        ...
        // TODO 3：用 compare_exchange 抢占 UNINIT -> RUNNING 执行 f() 写入并发布 READY；
        //         未抢到初始化权的线程自旋等待直到 READY，然后返回 &T
        ...
    }
}

impl<T> Drop for OnceCell<T> {
    fn drop(&mut self) {
        // TODO 4：仅在 state 为 READY 时安全析构内部 MaybeUninit<T>
        ...
    }
}`,
},

'rust-p2-c02':{
rust:String.raw`use std::future::Future;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tokio::time::timeout;

pub async fn run_bounded<T, E, Fut>(
    tasks: Vec<Fut>,
    max_concurrency: usize,
    per_task_timeout: Duration,
) -> Result<Vec<T>, E>
where
    Fut: Future<Output = Result<T, E>> + Send + 'static,
    T: Send + 'static,
    E: From<tokio::time::error::Elapsed> + Send + 'static,
{
    // TODO 1：创建容量至少为 1 的 Arc<Semaphore> 与用于管理所有子任务的 JoinSet
    ...
    for (idx, fut) in tasks.into_iter().enumerate() {
        // TODO 2：在 JoinSet 中派生任务，先获取信号量许可再套用 per_task_timeout，
        //         将超时错误转换为 E，并携带原始下标 idx 返回结果
        ...
    }
    // TODO 3：收集已完成的子任务结果并按 idx 归位；一旦遇到首个 Err 立即取消其余后台任务并返回
    // TODO 4：全部成功后按输入 tasks 原序组装并返回 Ok(Vec<T>)
    ...
}`,
},

'rust-pf-c01':{
rust:String.raw`#[derive(Debug)]
pub struct SplitQuoted<'a> {
    rest: &'a str,
    done: bool,
}

pub fn split_quoted(input: &'a str) -> SplitQuoted<'a> {
    SplitQuoted { rest: input, done: false }
}

impl<'a> Iterator for SplitQuoted<'a> {
    // TODO 1：声明零拷贝切片关联类型 Item
    type Item = ...;

    fn next(&mut self) -> Option<Self::Item> {
        // TODO 2：检查 done 状态并跳过前导 ASCII 空白，耗尽时标记结束并返回 None
        ...
        // TODO 3：若以 '"' 开头，切出双引号内部子切片（兼容空引号 "" 与末尾未闭合引号边界）
        ...
        // TODO 4：否则切分普通非空白 token 并确保游标推进处于合法的 UTF-8 字符边界
        ...
    }
}`,
},

'rust-pf-c02':{
rust:String.raw`use std::collections::VecDeque;
use std::sync::{Condvar, Mutex};

struct State<T> {
    buf: VecDeque<T>,
    closed: bool,
}

pub struct BoundedQueue<T> {
    cap: usize,
    state: Mutex<State<T>>,
    not_empty: Condvar,
    not_full: Condvar,
}

impl<T> BoundedQueue<T> {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "capacity must be greater than 0");
        // TODO 1：初始化容量、Mutex<State<T>> 与两个 Condvar
        ...
    }

    pub fn send(&self, item: T) -> Result<(), T> {
        // TODO 2：加锁并循环等待至未满或已关闭（防范虚假唤醒）；若已关闭退还 Err(item)，否则入队并唤醒消费者
        ...
    }

    pub fn recv(&self) -> Option<T> {
        // TODO 3：加锁并循环等待至非空或已关闭（防范虚假唤醒）；优先排空残留元素后才对已关闭空队列返回 None，出队后唤醒生产者
        ...
    }

    pub fn close(&self) {
        // TODO 4：加锁设置关闭标志并广播唤醒所有等待中的生产者和消费者线程
        ...
    }
}`,
},
};
