import {A,type Story} from '../story';

// 设计模式面试题动画。
export const algA:Record<string,Story>={
 'q-2e484a0c5a039b1a':{title:'设计模式六大原则：让代码好改',beats:[
  {say:'这些原则只有一个目的：需求变化时，改动越少越好。',add:[A('code','🧩','代码模块',320,170,{kind:'item',tone:'primary'})]},
  {say:'单一职责：一个模块只因一种原因而变化。开闭原则：加新功能靠扩展，不改老代码。',add:[A('s','1️⃣','单一职责',120,60,{kind:'tag',tone:'ok'}),A('o','🚪','开闭原则',320,60,{kind:'tag',tone:'ok'})]},
  {say:'里氏替换：子类型能替换它的抽象，不出意外。依赖倒置：依赖抽象接口，而不是具体实现。',add:[A('l','🔁','里氏替换',520,60,{kind:'tag',tone:'ok'}),A('d','⬆️','依赖倒置',120,290,{kind:'tag',tone:'ok'})]},
  {say:'接口隔离：接口小而专一，不强迫别人实现用不到的方法。迪米特法则：只和直接朋友说话，少了解无关对象。',add:[A('i','✂️','接口隔离',320,290,{kind:'tag',tone:'ok'}),A('m','🤫','迪米特法则',520,290,{kind:'tag',tone:'ok'})]},
  {say:'Go 里用小接口和组合就能体现这些原则，不必照搬继承体系；原则是为了降低变化成本，不是为了多加几层抽象。',bubble:{who:'code',text:'io.Reader 只有\n一个方法'}},
  {say:'记住六个名字。',memo:['单一职责、开闭、里氏替换','依赖倒置、接口隔离、迪米特']},
 ]},
 'q-669b0d23e22f2dcb':{title:'23 种设计模式：按用途分三类',beats:[
  {say:'经典的 GoF 设计模式一共 23 种，分成三类。',add:[A('gof','📚','GoF 23 种模式',320,60,{kind:'item',tone:'primary'})]},
  {say:'创建型：怎么造对象。工厂方法、抽象工厂、建造者、原型、单例。',add:[A('c','🏭','创建型：工厂 · 建造者 · 单例…',320,140,{kind:'tag',tone:'ok'})]},
  {say:'结构型：怎么把对象组合起来。适配器、桥接、组合、装饰器、外观、享元、代理。',add:[A('s','🧱','结构型：适配器 · 装饰器 · 代理…',320,210,{kind:'tag',tone:'ok'})]},
  {say:'行为型：对象之间怎么协作。责任链、命令、观察者、策略、状态、模板方法、迭代器等。',add:[A('b','🤝','行为型：策略 · 观察者 · 责任链…',320,280,{kind:'tag',tone:'ok'})]},
  {say:'面试重点是从场景出发：多种支付方式用策略；可叠加的中间件用装饰器；对接不同协议用适配器。',add:[A('me','🧑‍💻','你',560,290,{tone:'ok'})],bubble:{who:'me',text:'支付渠道多 → 策略',tone:'ok'}},
  {say:'记住三类。',memo:['创建型、结构型、行为型','按场景选，不背名字']},
 ]},
 'q-ebaa8dd0a05023df':{title:'单例的饿汉式和懒汉式',beats:[
  {say:'单例：整个程序只有一个实例，比如一个全局配置或连接池。',add:[A('svc','🏛️','Service（唯一）',320,170,{kind:'item',tone:'primary'})]},
  {say:'饿汉式：程序启动、包初始化时就创建好。简单，没有并发问题，但就算一直不用也会初始化。',add:[A('eager','🍔','饿汉：启动就建好',130,70,{kind:'tag',tone:'warm'})],send:[{from:'eager',to:'svc',text:'var eager = &Service{}'}]},
  {say:'懒汉式：第一次用的时候才创建，省资源，但多个 goroutine 同时第一次调用，可能创建出两个。',add:[A('lazy','😴','懒汉：用时再建',510,70,{kind:'tag'}),A('g1','🐹','G1',450,300),A('g2','🐹','G2',570,300)],send:[{from:'g1',to:'svc',tone:'bad'},{from:'g2',to:'svc',tone:'bad'}]},
  {say:'用 sync.Once 包起来：once.Do 保证初始化函数只执行一次，其余调用者等它完成。',add:[A('once','🔒','sync.Once',320,300,{kind:'tag',tone:'ok'})],tone:{g1:'ok',g2:'ok'},bubble:{who:'svc',text:'只创建一次'}},
  {say:'注意：单例只保证“拿到的是同一个实例”，实例内部的可变字段还是要自己保证并发安全。',memo:['饿汉：启动创建','懒汉：sync.Once 首次创建']},
 ]},
 'q-6a1455420566ee2f':{title:'两种线程安全的单例写法',beats:[
  {say:'懒加载的单例要线程安全，Go 里有两种稳妥写法。',add:[A('c','🏛️','Client 实例',320,170,{kind:'item',tone:'primary'})]},
  {say:'写法一 sync.Once：once.Do(func(){ a = &Client{} })，最简洁，推荐。',add:[A('once','🔒','sync.Once',130,80,{kind:'tag',tone:'ok'})],send:[{from:'once',to:'c',tone:'ok'}]},
  {say:'写法二 互斥锁：每次读取和初始化都持有同一把锁，检查到 nil 才创建。正确，但每次调用都要加锁。',add:[A('mu','🔐','sync.Mutex',510,80,{kind:'tag',tone:'ok'})],send:[{from:'mu',to:'c',tone:'ok'}]},
  {say:'千万别写“没有原子操作的双重检查”：在锁外读指针，存在数据竞争，可能读到还没初始化好的对象。',add:[A('bad','❌','锁外读指针的双重检查',320,300,{kind:'tag',tone:'bad'})],send:[{from:'bad',to:'c',tone:'bad'}]},
  {say:'记住推荐写法。',memo:['首选 sync.Once','或每次都加同一把锁']},
 ]},
 'q-04ce9a49b93dbe18':{title:'简单工厂、工厂方法、抽象工厂',beats:[
  {say:'要根据配置创建不同的存储：内存存储或磁盘存储，它们都实现 Store 接口。',add:[A('i','📜','interface Store',320,60,{kind:'item',tone:'primary'})]},
  {say:'简单工厂：一个函数 NewStore(kind)，按参数返回对应实现。遇到不认识的类型要返回错误，别悄悄给个默认值。',add:[A('sf','🏭','NewStore("disk")',150,180,{kind:'item',tone:'ok'}),A('d','💽','DiskStore',150,300,{kind:'tag'})],send:[{from:'sf',to:'d'}]},
  {say:'工厂方法：把“创建”本身抽象成接口，每种产品有自己的工厂，加新产品就加一个新工厂。',add:[A('fm','🏗️','StoreFactory.Create()',440,140,{kind:'item'})]},
  {say:'抽象工厂：一次创建一整套配套产品，比如“本地环境”给出内存存储 + 本地队列，“云环境”给出云存储 + 云队列。',add:[A('af','🏢','环境工厂：存储 + 队列',440,240,{kind:'item',tone:'warm'}),A('kit','🧰','一套配套组件',440,330,{kind:'tag'})],send:[{from:'af',to:'kit'}]},
  {say:'Go 用函数、接口和组合就能表达，不需要继承。',memo:['简单工厂：按参数选产品','工厂方法单个，抽象工厂一套']},
 ]},
 'q-2d67e0ad5ef2d569':{title:'Go 怎么传任意数量、任意顺序的参数',beats:[
  {say:'可变参数 func Sum(nums ...int)：只能放在最后，已有切片用 nums... 展开。',add:[A('v','➕','Sum(1, 2, 3)',150,80,{kind:'tag',tone:'ok'})]},
  {say:'...any 可以接收不同类型，但要自己做类型检查，丢掉了类型安全。Go 不支持任意位置的可变参数，也没有命名参数。',add:[A('any','❓','...any：要类型检查',490,80,{kind:'tag',tone:'warm'})]},
  {say:'想要“任意顺序的可选配置”，用 functional options：每个选项是一个函数，比如 WithTimeout(3s)、WithAddr(":8080")。',add:[A('srv','🖥️','NewServer(opts...)',320,220,{kind:'item',tone:'primary'}),A('o1','⚙️','WithTimeout(3s)',130,320,{kind:'tag'}),A('o2','⚙️','WithAddr(":8080")',490,320,{kind:'tag'})],send:[{from:'o2',to:'srv'},{from:'o1',to:'srv'}]},
  {say:'主函数先设好默认值，再依次应用每个选项，最后统一校验。选项顺序可以随便排。',bubble:{who:'srv',text:'默认值 + 依次应用\n+ 统一校验'}},
  {say:'也可以用一个配置结构体传参，字段名就是“命名参数”。',memo:['可变参数只能在最后','可选配置用 functional options']},
 ]},
 'q-46d4c04882c43212':{title:'建造者模式：一步步组装复杂对象',beats:[
  {say:'创建一个 HTTP 客户端：地址必填，超时、重试次数、代理可选，而且代理和直连互斥。参数一多，构造函数就乱了。',add:[A('mess','😵','New(addr, 3, 5, "", true…)',320,70,{kind:'tag',tone:'bad'})]},
  {say:'建造者把“收集参数”和“生成对象”分开：链式设置每一项。',drop:['mess'],add:[A('b','🧱','Builder',150,190,{kind:'item',tone:'primary'})]},
  {say:'.Addr("…").Timeout(3s).Retry(2) 一步步填，Builder 里集中管理默认值。',add:[A('s1','⚙️','.Addr()',290,110,{kind:'tag'}),A('s2','⚙️','.Timeout()',290,190,{kind:'tag'}),A('s3','⚙️','.Retry()',290,270,{kind:'tag'})],send:[{from:'s1',to:'b'},{from:'s2',to:'b'},{from:'s3',to:'b'}]},
  {say:'最后 Build() 统一校验必填项和互斥关系，返回对象和错误。半初始化的对象不会被调用方拿到。',add:[A('obj','✅','Build() → (*Client, error)',490,190,{kind:'item',tone:'ok'})],send:[{from:'b',to:'obj'}]},
  {say:'只有两三个简单参数时没必要用 Builder；Go 里也常用配置结构体或 functional options 达到同样效果。',memo:['分开收集参数和生成对象','Build 统一校验']},
 ]},
 'q-e5ca6c952345f596':{title:'策略模式：多种支付方式',beats:[
  {say:'订单要支持微信、支付宝、银行卡支付。最直接的写法是一长串 if-else，每加一种渠道就要改订单代码。',add:[A('o','🧾','订单流程',150,170,{kind:'item',tone:'warm'}),A('ifs','🌀','if 微信… else if 支付宝…',150,300,{kind:'tag',tone:'bad'})]},
  {say:'策略模式：定义接口 PayStrategy { Pay(ctx, cents) error }，每种渠道各自实现。',drop:['ifs'],add:[A('i','📜','PayStrategy',400,170,{kind:'item',tone:'primary'}),A('w','💚','微信',560,70,{kind:'tag'}),A('a','💙','支付宝',560,170,{kind:'tag'}),A('c','💳','银行卡',560,270,{kind:'tag'})]},
  {say:'订单流程只依赖接口，运行时选一个策略传进来。加新渠道只要再写一个实现，订单代码不动。',send:[{from:'o',to:'i',text:'Pay()'},{from:'i',to:'a',tone:'ok'}],tone:{o:'ok'}},
  {say:'金额用“分”的整数，不用浮点数。',bubble:{who:'o',text:'金额单位：分'}},
  {say:'真实支付还要商户订单号、签名、幂等、超时和回调验签——本地返回成功不等于钱真的到账。',memo:['行为抽象成接口','加渠道不改调用方']},
 ]},
 'q-5965ea1a549e9829':{title:'装饰器模式：给处理器套一层层外衣',beats:[
  {say:'有一个业务 handler，现在想加上请求耗时日志，但不想改它的代码。',add:[A('h','🧑‍🍳','业务 handler',470,170,{tone:'primary'})]},
  {say:'装饰器保持同样的接口，在调用前后加功能：Logging(next) 返回一个新的 http.Handler，先记时间，再调用 next，最后打日志。',add:[A('log','📝','Logging',300,170,{kind:'item',tone:'ok'})],send:[{from:'log',to:'h',text:'next.ServeHTTP'}]},
  {say:'可以一层层套：Auth(RateLimit(Logging(h)))。请求从外往里穿，响应从里往外回。',add:[A('auth','🔐','Auth',130,90,{kind:'tag'}),A('rl','🚦','RateLimit',130,250,{kind:'tag'})],send:[{from:'auth',to:'log'},{from:'rl',to:'log'}]},
  {say:'顺序会影响结果：先鉴权再限流，和先限流再鉴权，效果不一样，要明确约定。',bubble:{who:'log',text:'套的顺序\n很重要'}},
  {say:'Go 的 HTTP 中间件就是装饰器最常见的形式。',memo:['保持接口，前后加功能','可以层层组合，注意顺序']},
 ]},
};
