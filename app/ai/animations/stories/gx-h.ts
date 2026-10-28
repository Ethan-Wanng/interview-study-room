import {A,type Story} from '../story';

// Go 面试题动画（库与框架二）：cron、mergo、ants、优雅关闭、ORM 事务、viper。
export const gxH:Record<string,Story>={
 'q-2e1f91a20db264a1':{title:'用 cron 跑定时任务',beats:[
  {say:'每天凌晨 2 点要清理过期数据。用 robfig/cron：c := cron.New()，c.AddFunc("0 2 * * *", cleanup)，c.Start()。',add:[A('c','⏰','cron.New()',150,100,{kind:'item',tone:'primary'}),A('job','🧹','cleanup()',490,100,{kind:'item'})],send:[{from:'c',to:'job',text:'0 2 * * *'}]},
  {say:'表达式五个字段：分、时、日、月、周；cron.WithSeconds() 可以加上秒。注意时区，用 cron.WithLocation 指定。',add:[A('expr','📅','分 时 日 月 周 · 时区',320,220,{kind:'tag'})]},
  {say:'任务执行太久，下一次又到点了会怎样？用 cron.SkipIfStillRunning 跳过，或 DelayIfStillRunning 排队；任务里 panic 用 cron.Recover 兜住。',add:[A('chain','🛡️','SkipIfStillRunning · Recover',150,320,{kind:'tag',tone:'ok'})]},
  {say:'服务部署多个实例时，每个实例都会执行一次！需要分布式锁，或者交给专门的调度系统（如 K8s CronJob）。退出时 c.Stop() 等待正在执行的任务。',add:[A('multi','⚠️','多实例要加锁',490,320,{kind:'tag',tone:'warm'})]},
  {say:'记住定时任务要点。',memo:['cron 表达式 + 时区','防重叠、防 panic，多实例加锁']},
 ]},
 'q-fe8a508afd143f39':{title:'用 mergo 合并配置',beats:[
  {say:'有一份默认配置 defaults，用户只传了部分字段 userCfg。想把两者合并：用户设置了的用用户的，没设置的用默认值。',add:[A('def','⚙️','默认配置',150,90,{kind:'item'}),A('usr','🧑','用户配置（部分）',490,90,{kind:'item',tone:'primary'})]},
  {say:'mergo.Merge(&userCfg, defaults)：把 defaults 中的值填进 userCfg 里还是零值的字段。',add:[A('merge','🔀','mergo.Merge',320,210,{kind:'tag',tone:'ok'})],send:[{from:'def',to:'merge'},{from:'usr',to:'merge'}]},
  {say:'加上 mergo.WithOverride 则反过来，用源对象覆盖目标的非零值。还有 mergo.Map 可以在 map 和结构体之间合并。',add:[A('opt','🎛️','WithOverride · Map',150,310,{kind:'tag'})]},
  {say:'坑：它按“零值”判断有没有设置。用户故意把布尔设成 false、数字设成 0，会被当成“没设置”而被默认值覆盖。需要区分时用指针字段。',add:[A('pit','🪤','false / 0 会被当成没设置',490,310,{kind:'tag',tone:'warm'})]},
  {say:'记住 mergo。',memo:['把默认值填进零值字段','零值无法区分“没设置”，用指针']},
 ]},
 'q-4a3d9f451639e241':{title:'用 ants 管理 goroutine 池',beats:[
  {say:'每来一个任务就 go 一个 goroutine，突发流量下可能瞬间创建几十万个，内存和下游都扛不住。',add:[A('burst','🌊','任务洪峰',110,170,{tone:'bad'})]},
  {say:'ants 是 goroutine 池：pool, _ := ants.NewPool(100)，最多 100 个工作 goroutine，并且会复用空闲的，减少创建开销。',add:[A('pool','🏊','ants 池（100）',360,170,{kind:'item',tone:'primary'})],send:[{from:'burst',to:'pool',text:'Submit'}]},
  {say:'pool.Submit(task) 提交任务；池满时默认阻塞等待，也可以设置非阻塞，直接返回 ErrPoolOverload，由调用方降级。',add:[A('full','⏳','满了：阻塞或报错',360,60,{kind:'tag',tone:'warm'})]},
  {say:'记得 defer pool.Release() 释放；任务里的 panic 要处理（可设置 PanicHandler）。简单场景用带缓冲 channel 做信号量或 errgroup.SetLimit 也足够。',add:[A('rel','🧹','Release · PanicHandler',360,300,{kind:'tag',tone:'ok'})],tone:{burst:'ok'}},
  {say:'记住 ants。',memo:['限制并发并复用 goroutine','满时阻塞或报错，记得释放和处理 panic']},
 ]},
 'q-d3a96968976d3e7d':{title:'优雅关闭服务',beats:[
  {say:'发布新版本时，K8s 给旧进程发 SIGTERM。直接退出的话，正在处理的请求会被打断，用户看到报错。',add:[A('sig','📨','SIGTERM',110,170,{kind:'item',tone:'warm'}),A('srv','🖥️','HTTP 服务',360,170,{kind:'item',tone:'primary'})],send:[{from:'sig',to:'srv'}]},
  {say:'用 signal.NotifyContext 监听信号，收到后调用 srv.Shutdown(ctx)：先停止接受新连接，再等正在处理的请求完成。',add:[A('sd','⏸️','Shutdown：不接新请求',360,60,{kind:'tag',tone:'ok'})]},
  {say:'给 Shutdown 一个超时 ctx（比如 10 秒），超时还没处理完就强制退出，别无限等。',add:[A('to','⏱️','超时 10s',570,170,{kind:'tag'})]},
  {say:'然后按顺序关闭其他资源：停止消费消息、刷新日志、关闭数据库连接池。K8s 里还要配合 readiness 先摘流量和 terminationGracePeriodSeconds。',add:[A('res','🧹','消费者 → 日志 → 连接池',360,300,{kind:'tag',tone:'ok'})],tone:{srv:'ok'}},
  {say:'记住优雅关闭。',memo:['监听信号，Shutdown 停新等旧','设超时，按顺序释放资源']},
 ]},
 'q-5eab15dc233fb980':{title:'ORM 中怎么做事务',beats:[
  {say:'下单要同时扣库存和建订单。GORM 里用 db.Transaction(func(tx *gorm.DB) error { … })。',add:[A('tx','📦','db.Transaction',320,60,{kind:'item',tone:'primary'})]},
  {say:'在回调里用 tx（不是外面的 db）执行所有操作：tx.Model(&stock).Update(...)、tx.Create(&order)。',add:[A('s','📉','扣库存（tx）',150,180,{kind:'tag'}),A('o','🧾','建订单（tx）',490,180,{kind:'tag'})],send:[{from:'tx',to:'s'},{from:'tx',to:'o'}]},
  {say:'回调返回 nil 就自动提交，返回 error 或发生 panic 就自动回滚。',add:[A('auto','🔁','nil 提交 · error 回滚',320,280,{kind:'tag',tone:'ok'})]},
  {say:'常见坑：在事务里用了外层的 db，那条语句就不在事务中；事务里不要做调用外部接口这类慢操作，会长时间占着连接和锁。原生 database/sql 用 BeginTx、Commit、defer Rollback。',bubble:{who:'tx',text:'别用错 db'}},
  {say:'记住 ORM 事务。',memo:['回调里一律用 tx','返回 error 回滚，事务要短']},
 ]},
 'q-eee7ec9d9516a477':{title:'用 viper 监听配置变化',beats:[
  {say:'viper.SetConfigFile("config.yaml")，viper.ReadInConfig() 读取配置；还能合并环境变量（AutomaticEnv）和命令行参数。',add:[A('v','🐍','viper',320,60,{kind:'item',tone:'primary'}),A('f','📄','config.yaml',110,170,{kind:'item'})],send:[{from:'f',to:'v'}]},
  {say:'viper.WatchConfig() 监听文件变化，viper.OnConfigChange(func(e fsnotify.Event){ … }) 在变化时回调。',add:[A('w','👀','WatchConfig',530,170,{kind:'tag',tone:'ok'})]},
  {say:'注意：回调可能在别的 goroutine 里执行，直接改全局变量有数据竞争。做法：解析成一个新的配置结构体，校验通过后用 atomic.Pointer 整体替换。',add:[A('atomic','⚛️','新配置 → 原子替换',320,280,{kind:'tag',tone:'warm'})]},
  {say:'不是所有配置都能热更新：监听端口、连接池大小这类需要重启或重建资源；编辑器保存文件时可能触发多次事件，要做好去抖。',bubble:{who:'v',text:'端口改了要重启'}},
  {say:'记住配置热更新。',memo:['WatchConfig + OnConfigChange','解析校验后原子替换，部分配置需重启']},
 ]},
};
