import type {StarterMap} from './types';

// Go 考试与模拟卷题 go-e2-24 ~ go-pf-c02 的作答框架。
export const goStartersB:StarterMap={
'go-e2-24':{
go:String.raw`func ParallelMap(ctx context.Context, in []int, limit int, f func(context.Context, int) (int, error)) ([]int, error) {
    // TODO 1：创建可传播取消的并发任务组，并限制最大并发数为 limit
    ...
    // TODO 2：预分配与输入等长的结果切片，按输入下标存放结果
    out := ...
    for i, v := range in {
        // TODO 3：并发执行 f(ctx, v)，出错返回错误，成功将结果写入对应下标 out[i]
        ...
    }
    // TODO 4：等待全部任务结束，有错误则返回 nil 与首个错误，否则返回结果切片
    ...
}`,
},

'go-e2-25':{
go:String.raw`// TODO 1：可在此声明防止编译器优化的包级接收变量及测试数据构造辅助函数
...

func BenchmarkJoinPlus(b *testing.B) {
    // TODO 2：在计时循环外准备测试切片、开启内存分配报告并重置计时器
    ...
    // TODO 3：在循环内调用 JoinPlus 并将结果保存到包级变量
    ...
}

func BenchmarkJoinBuilder(b *testing.B) {
    // TODO 4：按相同口径编写 JoinBuilder 的基准测试并报告内存分配
    ...
}`,
},

'go-f-28':{
go:String.raw`// TODO 1：定义缓存条目结构（值与过期时间）以及 TTLCache 的读写锁和内部 map 字段
type entry[V any] struct {
    ...
}

type TTLCache[K comparable, V any] struct {
    ...
}

func NewTTLCache[K comparable, V any]() *TTLCache[K, V] {
    // TODO 2：初始化内部 map 并返回 TTLCache 实例
    return ...
}

func (c *TTLCache[K, V]) Set(k K, v V, ttl time.Duration) {
    // TODO 3：加写锁存入条目及过期时间，并记得解锁
    ...
}

func (c *TTLCache[K, V]) Get(k K) (V, bool) {
    // TODO 4：加读锁查询条目并及时解锁；不存在或已过期时返回零值与 false
    ...
}`,
},

'go-f-29':{
go:String.raw`func Retry(ctx context.Context, attempts int, base time.Duration, fn func(context.Context) error) error {
    var err error
    for i := 0; i < attempts; i++ {
        // TODO 1：执行 fn(ctx)，成功立即返回 nil；若已是最后一次尝试则跳出循环
        ...
        // TODO 2：按指数退避并叠加随机抖动计算本次等待时长
        ...
        // TODO 3：等待期间同时监听 ctx.Done()，若取消则停止计时器并立即返回
        ...
    }
    // TODO 4：全部尝试失败后返回最后一次错误
    return err
}`,
},

'go-f-30':{
go:String.raw`func main() {
    srv := &http.Server{Addr: ":8080", Handler: newRouter(), ReadHeaderTimeout: 5 * time.Second}
    go func() {
        // TODO 1：在 goroutine 中启动服务监听；忽略正常关闭错误，其他错误记录或退出
        ...
    }()

    // TODO 2：监听 SIGINT/SIGTERM 信号并阻塞等待触发，同时在退出时释放信号监听
    ...

    // TODO 3：创建最多 10 秒超时的上下文（记得释放资源），执行优雅关闭并处理错误
    ...
}`,
},

'go-p1-c01':{
go:String.raw`func Dedup(nums []int) []int {
    // TODO 1：初始化去重集合与新的结果切片（预分配容量并兼容空切片，不修改原切片）
    ...
    for _, n := range nums {
        // TODO 2：判断元素是否已出现过，首次出现时记入集合并按原顺序追加
        ...
    }
    // TODO 3：返回去重后的新切片
    return ...
}`,
},

'go-p1-c02':{
go:String.raw`func FetchAll(ctx context.Context, urls []string, limit int, fetch func(context.Context, string) (string, error)) ([]string, error) {
    // TODO 1：准备可取消上下文、最大并发数 limit 控制，以及按顺序存放结果的预分配切片
    ...
    for i, u := range urls {
        // TODO 2：并发调用 fetch：获取并发名额时监听取消，结束后释放名额
        // TODO 3：出错时取消其余请求并并发安全地记录首个错误；成功则写入对应下标保持顺序
        ...
    }
    // TODO 4：等待所有任务结束不泄漏 goroutine，有错返回首个错误，否则返回结果切片
    ...
}`,
},

'go-p2-c01':{
go:String.raw`type Limiter struct {
    // TODO 1：定义并发安全保护字段，以及速率、桶容量、当前令牌数和上次更新时间
    ...
}

func NewLimiter(rate float64, burst int) *Limiter {
    // TODO 2：初始化限流器各字段（不启动定时器或后台 goroutine）
    return ...
}

func (l *Limiter) Allow() bool {
    // TODO 3：在并发保护下按流逝时间差惰性补充令牌，上限为 burst 并更新时间戳
    ...
    // TODO 4：有可用令牌时扣减 1 个并返回 true，不足则返回 false
    ...
}`,
},

'go-p2-c02':{
go:String.raw`func RunPool(ctx context.Context, workers int, jobs []Job, handle func(context.Context, Job) error) []error {
    errs := make([]error, len(jobs))
    // TODO 1：创建任务传递通道与等待同步计数，启动固定 workers 个 goroutine 领取任务下标并写入 errs[i]
    for w := 0; w < workers; w++ {
        ...
    }
    // TODO 2：分发任务下标；若 ctx 取消则停止分发，并将未开始的任务记为 ctx.Err()
    ...
    // TODO 3：关闭通道并等待全部 worker 退出，无泄漏后返回 errs
    ...
    return errs
}

func safeCall(ctx context.Context, j Job, handle func(context.Context, Job) error) (err error) {
    // TODO 4：在单次任务外层捕获 panic 并转为 error 返回，执行前检查 ctx 是否已取消
    ...
}`,
},

'go-pf-c01':{
go:String.raw`func GroupBy[T any, K comparable](items []T, key func(T) K) map[K][]T {
    // TODO 1：初始化非 nil 结果 map，遍历 items 按 key 分组追加并保持组内原顺序
    ...
}

func TestGroupBy(t *testing.T) {
    // TODO 2：定义包含空切片与多分组情况的表驱动测试用例切片
    cases := []struct {
        ...
    }{
        ...
    }
    for _, c := range cases {
        // TODO 3：启动子测试执行 GroupBy 并比对结果是否符合预期
        ...
    }
}`,
},

'go-pf-c02':{
go:String.raw`// TODO 1：定义单次调用结构（等待同步原语及共享结果/错误）和 Group 结构（互斥锁与进行中的调用 map）
type call struct {
    ...
}

type Group struct {
    ...
}

func (g *Group) Do(key string, fn func() (any, error)) (any, error) {
    // TODO 2：加锁查询 key 是否已有进行中的调用；若有则释放锁并等待其完成后共享返回结果
    ...
    // TODO 3：否则登记本次调用并释放锁，避免执行 fn 期间阻塞其他 key
    ...
    // TODO 4：确保 fn 结束或 panic 时都能清理 map 中的 key 并唤醒等待者，然后执行 fn 返回结果
    ...
}`,
},
};
