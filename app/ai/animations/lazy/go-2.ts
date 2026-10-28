import {A} from '../story';
import type {LazyEpisode} from './engine';

// Go 懒人模式第 2 集：咖啡馆招人了（函数、接口、组合、错误处理、标准库）。
export const goLazy2:LazyEpisode={id:'lazy-go-2',subject:'go',tier:0,levels:['go-funcs','go-stdlib'],icon:'🧑‍🍳',title:'咖啡馆招人了：会做咖啡的都是咖啡师',summary:'用招聘咖啡师的故事，讲函数、接口与鸭子类型、组合、错误处理和常用标准库。',beats:[
 {say:'咖啡馆的生意越来越好，小鹿一个人忙不过来了。她把做一杯拿铁的步骤写成一张卡片：磨豆、萃取、打奶、拉花。在 Go 里，这样一张写好步骤、可以反复使用的卡片，就是函数。',add:[A('lu','🦌','小鹿',110,170,{tone:'primary'}),A('card','📇','func MakeLatte()',420,90,{kind:'item',tone:'primary'})]},
 {say:'函数可以接收参数，比如几份浓缩、要不要加糖，也可以一次返回好几个结果。Go 最常见的写法，是同时返回“做好的咖啡”和“有没有出错”：latte, err := MakeLatte(2)。',add:[A('ret','📦','返回：咖啡, err',420,200,{kind:'tag',tone:'ok'})],send:[{from:'card',to:'ret'}]},
 {say:'有的客人要一杯，有的客人要一打。小鹿把函数改成 MakeCoffee(names ...string)，三个点表示“想传几个都行”。在函数里，names 就是一个切片。已经有一张名单，就用 names... 把它摊开传进去。',add:[A('var','🧺','可变参数 ...string',420,300,{kind:'tag'})]},
 {say:'接下来是招人。小鹿贴出一张告示：“招咖啡师，要求：会做咖啡。”她没有写必须毕业于哪所学校，也没有写必须是谁的徒弟。只要你会做咖啡，你就是咖啡师。',drop:['card','ret','var'],add:[A('ad','📢','招聘：会做咖啡就行',420,90,{kind:'item',tone:'warm'})]},
 {say:'这张告示，就是 Go 的接口：type Barista interface { MakeCoffee() Coffee }。它只规定“要会什么”，不关心“你是谁”。这种思路有个可爱的名字，叫鸭子类型：走路像鸭子、叫声像鸭子，那就当它是鸭子。',add:[A('iface','🔌','interface Barista',420,200,{kind:'item',tone:'primary'})],send:[{from:'ad',to:'iface'}]},
 {say:'第一个来应聘的是小熊，他会做咖啡；第二个是一台全自动咖啡机，它也会做咖啡。在 Go 里，它们都不用说一句“我实现了 Barista”，只要方法齐全，就自动满足接口，都能被安排上岗。',add:[A('bear','🐻','小熊',200,300),A('robot','🤖','咖啡机器人',520,300,{kind:'item'})],send:[{from:'bear',to:'iface'},{from:'robot',to:'iface'}]},
 {say:'这样做的好处，小鹿很快就体会到了。她写排班程序时，只认 Barista 这个接口，不认具体是谁。哪天换成新的机器人，排班程序一行都不用改。测试的时候，还能塞进一个假的咖啡师，专门用来检查流程。',bubble:{who:'lu',text:'只认本事，不认身份'}},
 {say:'有人问：Go 没有继承，那怎么让一个类型拥有另一个类型的本领？小鹿指着新买的咖啡机说：它里面装了一台磨豆机。把磨豆机内嵌进咖啡机，咖啡机就直接拥有了磨豆的方法。这叫组合，像搭积木一样拼出功能。',drop:['ad','bear'],add:[A('grind','⚙️','磨豆机 Grinder',200,90,{kind:'item'})],send:[{from:'grind',to:'robot',text:'内嵌'}],sub:{robot:'struct { Grinder }'}},
 {say:'不过组合不是继承。咖啡机调用的“磨豆”，用的还是磨豆机自己的方法，磨豆机并不知道自己被装在了谁的肚子里。Go 宁愿让关系简单直白，也不要一棵复杂的家谱树。',bubble:{who:'grind',text:'我只管磨豆'}},
 {say:'开业一个月，问题也来了：牛奶用完了，拉花失败了。Go 没有 try catch，错误就是一个普通的返回值，像一张写着问题的小纸条，从发生的地方一层层交回给负责的人。每一层都要看一眼：if err != nil。',drop:['grind','iface','robot'],add:[A('err','🧾','error：一张问题纸条',420,120,{kind:'item',tone:'bad'})]},
 {say:'纸条每往上交一层，就多写一句“当时在干什么”：fmt.Errorf("做拿铁: %w", err)。%w 像把原来的纸条装进一个新信封，外面写上说明，里面的原件还在。最后店长看到的是：做拿铁失败，因为打奶失败，因为牛奶用完了。',add:[A('wrap','✉️','%w：信封套信封',420,240,{kind:'tag',tone:'ok'})],send:[{from:'err',to:'wrap'}]},
 {say:'店长想知道“是不是牛奶用完了这类问题”，不需要拆开每个信封读字。errors.Is(err, ErrNoMilk) 会一层层打开信封帮她找；想拿到具体的错误类型，就用 errors.As。千万别靠比较错误的文字来判断，文字一改就失灵。',add:[A('is','🔍','errors.Is / As',420,330,{kind:'tag',tone:'primary'})]},
 {say:'小鹿还定了一条店规：同一个问题只处理一次。要么当场记到日志里，要么交给上级，不要每一层都大喊一遍，否则日志里同一件事会出现十次。而 panic 就像拉响火警，只留给真正无法继续营业的大事。',bubble:{who:'lu',text:'小问题递纸条，大事才拉警报'}},
 {say:'第二个月，小鹿开始用 Go 自带的工具箱，也就是标准库。第一个抽屉是 strings：切开、拼接、查找、去空格。她把订单 "拿铁|大杯|少糖" 用 strings.Split 一刀切成三段，又用 TrimSpace 擦掉两边多余的空格。',drop:['err','wrap','is'],add:[A('box','🧰','标准库工具箱',420,90,{kind:'item',tone:'primary'}),A('str','✂️','strings.Split',300,220,{kind:'tag'})]},
 {say:'第二个抽屉是 strconv，专门在数字和文字之间翻译。订单里的 "2" 份浓缩是文字，要用 strconv.Atoi 变成数字 2；反过来用 Itoa。翻译失败会返回错误，比如把“两”交给它，它会老老实实告诉你看不懂。',add:[A('conv','🔁','strconv.Atoi',540,220,{kind:'tag',tone:'ok'})]},
 {say:'第三个抽屉是 time。Go 里的时长 Duration，其实就是一个记录纳秒数的整数，像一个刻度极细的沙漏。3 * time.Second 才是三秒，单独写一个 3，只有 3 纳秒，连眨眼都来不及。',drop:['str','conv'],add:[A('time','⏳','Duration：纳秒沙漏',300,220,{kind:'tag',tone:'warm'})]},
 {say:'time 还有一个出名的怪癖：格式化时间不用 YYYY-MM-DD，而是用一个固定的参考时间：2006 年 1 月 2 日 15 点 04 分 05 秒。记住“1 2 3 4 5 6”：月 1、日 2、时 3（15 点）、分 4、秒 5、年 6，就不会写错。',add:[A('layout','📅','2006-01-02 15:04:05',540,300,{kind:'tag',tone:'primary'})]},
 {say:'第四个抽屉是 io 和 bufio。读一个巨大的账本文件，不要一口气全倒进内存，就像不会用一个碗去接整条河。bufio.Scanner 是一只水桶，一行一行地打水，读完一行处理一行，内存始终很小。',drop:['time','layout'],add:[A('io','🪣','bufio.Scanner：一桶一桶',300,220,{kind:'tag',tone:'ok'})]},
 {say:'最后一个抽屉是 encoding/json，它是打包员。把订单结构体交给 json.Marshal，就打包成一段 JSON 发给外卖平台；收到 JSON，用 json.Unmarshal 拆包。结构体字段后面的标签 json:"price" 就是贴在盒子上的名字标签。',add:[A('json','📦','json.Marshal / 标签',540,300,{kind:'tag',tone:'primary'})]},
 {say:'打包员也有脾气：只打包大写开头的字段，小写的私有字段它看不见。小鹿一开始把 price 写成小写，结果外卖平台收到的订单里一个价格都没有，这才明白大写不只是规矩，也是能不能被看见的门票。',bubble:{who:'json',text:'小写字段我看不见'}},
 {say:'晚上打烊，小鹿给新员工上了一课：函数是工序卡，接口是招聘告示，组合是拼积木，错误是层层装信封的纸条，标准库是一整箱趁手的工具。明天，咖啡馆还要迎接更复杂的挑战。',drop:['io','json'],tone:{box:'ok'}},
 {say:'这一集的要点。',memo:['接口只问会什么，方法齐全就满足','错误用 %w 包装，errors.Is / As 判断']},
]};
