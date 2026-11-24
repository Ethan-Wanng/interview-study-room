import type {StarterMap} from './types';

// Go 关卡与训练/考试题 go-stdlib-10 ~ go-x4-22 的作答框架。
export const goStartersA:StarterMap={
'go-stdlib-10':{
go:String.raw`func CountLines(path string) (int, error) {
    // TODO 1：打开指定路径的文件并检查错误，出错直接返回
    ...
    // TODO 2：确保函数退出前关闭文件
    ...
    n := 0
    // TODO 3：按行读取文件并累加行数
    ...
    // TODO 4：返回行数与扫描过程中可能出现的错误
    return n, ...
}`,
},

'go-generics-10':{
go:String.raw`func Filter[T any](xs []T, keep func(T) bool) []T {
    // TODO 1：预分配容量初始化新切片，避免反复扩容
    ...
    for _, x := range xs {
        // TODO 2：调用判断函数保留满足条件的元素并追加到新切片
        ...
    }
    // TODO 3：返回过滤后的新切片
    return ...
}`,
},

'go-x1-32':{
go:String.raw`func WordCount(s string) map[string]int {
    // TODO 1：初始化用于统计词频的 map
    counts := ...
    // TODO 2：按空白字符切分字符串并遍历每个单词
    for ... {
        // TODO 3：将单词统一转为小写后累加出现次数
        ...
    }
    return counts
}`,
},

'go-x1-33':{
go:String.raw`func Unique(xs []int) []int {
    // TODO 1：初始化去重集合并预分配新切片容量（不修改输入切片）
    ...
    for _, x := range xs {
        // TODO 2：跳过已出现的元素；首次出现时记入集合并按原顺序追加到新切片
        ...
    }
    // TODO 3：返回去重后的结果切片
    return ...
}`,
},

'go-x2-34':{
go:String.raw`func Map[T, U any](xs []T, f func(T) U) []U {
    // TODO 1：预分配与输入切片等长的新切片容量
    ...
    for _, x := range xs {
        // TODO 2：对每个元素调用 f 并追加到新切片（不修改原切片）
        ...
    }
    // TODO 3：返回转换后的新切片
    return ...
}`,
},

'go-x2-35':{
go:String.raw`func FirstResult(ctx context.Context, fns ...func(context.Context) (string, error)) (string, error) {
    // TODO 1：派生可取消的子 context，并在函数返回前触发取消
    ...
    // TODO 2：创建容量合适的带缓冲结果 channel，防止其他 goroutine 阻塞泄漏
    ...
    for _, f := range fns {
        // TODO 3：并发执行每个函数并把结果（值与错误）写入 channel
        ...
    }
    var last error
    // TODO 4：接收结果：首个成功立即返回；全部失败则返回最后一个错误
    ...
    return "", last
}`,
},

'go-e1-24':{
go:String.raw`type Counter struct {
    // TODO 1：定义保护内部 map 的锁字段以及存储计数的 map
    ...
}

func NewCounter() *Counter {
    // TODO 2：初始化内部 map 并返回 Counter 指针
    return ...
}

func (c *Counter) Inc(key string) {
    // TODO 3：在锁保护下将对应 key 的计数加 1
    ...
}

func (c *Counter) Snapshot() map[string]int {
    // TODO 4：在锁保护下复制并返回内部 map 的副本，避免调用方修改影响内部状态
    ...
}`,
},

'go-e1-25':{
go:String.raw`func Batch[T any](in <-chan T, size int, maxWait time.Duration) <-chan []T {
    out := make(chan []T)
    go func() {
        // TODO 1：确保退出时关闭 out，并初始化批次缓冲切片和超时定时器
        ...
        for {
            select {
            // TODO 2：从 in 接收数据：若 in 已关闭，输出剩余元素并退出
            // TODO 3：追加元素到缓冲，攒够 size 个时输出、重建新切片并重置定时器
            case ...:
                ...
            // TODO 4：等待超过 maxWait 时输出当前已有元素，并重置定时器与缓冲切片
            case ...:
                ...
            }
        }
    }()
    return out
}`,
},

'go-x3-15':{
go:String.raw`func Fanout(ctx context.Context, n int, jobs <-chan int, work func(int) int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        // TODO 1：在启动前登记 worker 计数，并在 worker 退出时完成计数
        ...
        go func() {
            ...
            for {
                // TODO 2：同时监听 ctx 取消与 jobs；jobs 关闭或取消时退出
                // TODO 3：将 work(j) 写入 out 时也监听 ctx 取消，防止阻塞泄漏
                ...
            }
        }()
    }
    // TODO 4：启动协调 goroutine，等待全部 worker 退出后关闭 out
    ...
    return out
}`,
},

'go-x4-2':{
go:String.raw`type Counter struct {
    n atomic.Int64
}

func (c *Counter) IncUpTo(limit int64) bool {
    for {
        // TODO 1：原子读取当前计数值
        ...
        // TODO 2：若已达到或超过上限 limit，直接返回 false
        ...
        // TODO 3：尝试用 CompareAndSwap 加 1，成功返回 true，失败则继续循环重试
        ...
    }
}`,
},

'go-x4-22':{
go:String.raw`func Timeout(d time.Duration, next http.Handler) http.Handler {
    // TODO 1：返回包装 next 的 HTTP 处理器适配器
    // TODO 2：基于请求原有 context 派生带超时 d 的子 context，并确保退出时释放定时器资源
    // TODO 3：将携带新 context 的请求传给下游 next 处理
    ...
}`,
},
};
