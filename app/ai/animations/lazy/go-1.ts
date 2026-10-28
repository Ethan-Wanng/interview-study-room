import {A} from '../story';
import type {LazyEpisode} from './engine';

// Go 懒人模式第 1 集：小鹿开咖啡馆（模块与包、基础类型、数组切片与 map）。
export const goLazy1:LazyEpisode={id:'lazy-go-1',subject:'go',tier:0,levels:['go-start','go-values','go-collections'],icon:'☕',title:'小鹿的咖啡馆：从一张营业执照开始',summary:'用开一家咖啡馆的故事，讲清 Go 的模块、包、基础类型、切片和 map。',beats:[
 {say:'故事开始于一个下雨的早晨。程序员小鹿辞职了，她决定开一家咖啡馆，名字就叫“Gopher 咖啡”。在 Go 的世界里，开店的第一件事不是买咖啡豆，而是去领一张营业执照。',add:[A('lu','🦌','小鹿',110,170,{tone:'primary'})],bubble:{who:'lu',text:'我要开店啦！'}},
 {say:'这张营业执照就是 go.mod。她在空荡荡的店里敲下 go mod init gopher.cafe，执照上立刻写好了店名，也就是模块路径，还写上了用哪个版本的 Go 来经营。从此，这家店的一切都以这张执照为准。',add:[A('mod','📜','go.mod：营业执照',380,80,{kind:'item',tone:'ok'})],send:[{from:'lu',to:'mod',text:'go mod init'}]},
 {say:'开店需要供货商：磨豆机找一家，牛奶找一家。在代码里，这些供货商就是第三方模块。小鹿写下 import 语句，再运行 go mod tidy，它就像一位勤快的店长，把用到的供货商一家家记在执照背面，用不到的划掉。',add:[A('sup','🚚','第三方模块：供货商',380,200,{kind:'item'})],send:[{from:'sup',to:'mod',text:'go mod tidy'}]},
 {say:'每箱货送到时，箱子上都贴着一张防伪封条，这就是 go.sum。它记录了每个依赖内容的指纹。哪天有人偷偷把货换了，指纹对不上，Go 就会拒绝收货。所以 go.mod 和 go.sum 都要好好保存，一起提交到仓库里。',add:[A('sum','🔏','go.sum：防伪封条',380,310,{kind:'tag',tone:'warm'})],send:[{from:'sum',to:'sup',text:'校验指纹'}]},
 {say:'店开起来了，人手多了，就要分部门：前台、后厨、仓库。Go 里的部门叫“包”，一个目录就是一个包。前台负责接待客人，后厨负责做咖啡，各管各的，互不打扰，代码也一样清清楚楚。',drop:['sup','sum'],add:[A('front','🛎️','package front',150,300,{kind:'item',tone:'primary'}),A('kitchen','🍳','package kitchen',430,300,{kind:'item',tone:'primary'})]},
 {say:'部门之间怎么打交道？Go 用一个特别朴素的规矩：名字首字母大写，就是对外开放的窗口；首字母小写，就是部门内部的秘密。后厨的 MakeLatte 大写，前台可以喊它；后厨的 secretRecipe 小写，谁也看不到。',add:[A('pub','🔓','MakeLatte：大写对外',430,190,{kind:'tag',tone:'ok'})],send:[{from:'front',to:'pub',text:'点单'}]},
 {say:'还有一种更严格的门：员工通道，名字叫 internal。把配方放进 internal 目录，只有咖啡馆自己人能进，隔壁的面包店想导入？编译器会像保安一样拦住它：内部包，外人止步。',drop:['pub'],add:[A('int','🚪','internal：员工通道',600-90,190,{kind:'tag',tone:'warm'})],bubble:{who:'kitchen',text:'配方只给自己人'}},
 {say:'每天开门前，各部门都有准备工作：仓库先清点，后厨再预热，最后前台开灯。这就是包的初始化顺序。被依赖的包先初始化，每个包先给包级变量赋值，再执行 init 函数，等所有部门都准备好了，大门才打开，main 函数才开始营业。',drop:['int','mod'],add:[A('init','⏰','变量 → init() → main()',380,80,{kind:'item',tone:'primary'})]},
 {say:'小提醒：init 就像开门前的例行检查，别把整天的营业都塞进去。复杂的准备工作最好写成一个明确的函数，开门时亲手调用，出了问题也知道是哪一步。',bubble:{who:'lu',text:'init 只做小事'}},
 {say:'营业第一天，小鹿开始记账。账本上的数字是 Go 的数值类型。她给“今天来了多少客人”选了 int8，心想一天哪会超过一百个人。结果中午来了一个旅行团，计数器到了 127，再加一个，竟然变成了负 128！',drop:['init','front','kitchen'],add:[A('cnt','🔢','int8 计数器：127',320,90,{kind:'item',tone:'bad'})],sub:{cnt:'+1 → -128'}},
 {say:'这就像老式汽车的里程表，转到 999999 之后又回到 000000。Go 的整数溢出不会报错，只会悄悄绕回去。小鹿吓了一跳，赶紧换成足够大的 int，又在关键的金额计算前检查边界。数字的“容器”选小了，账就会算错。',add:[A('odo','🚗','里程表：转一圈回到 0',320,220,{kind:'tag',tone:'warm'})],tone:{cnt:'ok'},sub:{cnt:'改用 int'}},
 {say:'菜单牌上的字是字符串。Go 的字符串像一张已经印好的菜单：只能看，不能改。变量里其实只存了两样东西，菜单放在哪儿，以及菜单有多少个字节。复制一份字符串，只是多拿了一张写着同样地址的小纸条，非常便宜。',drop:['odo','cnt'],add:[A('menu','📋','字符串：只读的菜单',150,100,{kind:'item',tone:'primary'}),A('slip','🧾','地址 + 长度',450,100,{kind:'tag'})],send:[{from:'slip',to:'menu',text:'指向'}]},
 {say:'有位客人问：“拿铁”这两个字，len 为什么是 6？因为 Go 的字符串按 UTF-8 存储，一个汉字占 3 个字节。len 数的是字节，不是字。想一个字一个字地数，就用 for range，它会把字节解码成一个个 rune。',add:[A('len','📏','len("拿铁") = 6 字节',300,250,{kind:'tag',tone:'warm'})],bubble:{who:'menu',text:'我数的是字节'}},
 {say:'接着是指针。客人点完单，拿到一张取餐号。取餐号不是咖啡本身，而是告诉你咖啡在哪个窗口。Go 的指针就是这张取餐号：&cup 取得杯子的地址，*p 顺着地址找到那杯咖啡。没有号码的取餐单，就是 nil。',drop:['len','slip','menu'],move:{lu:[560,300]},add:[A('cup','☕','一杯拿铁',150,170,{kind:'item',tone:'primary'}),A('ticket','🎟️','取餐号 p := &cup',450,170,{kind:'item'})],send:[{from:'ticket',to:'cup',text:'*p'}]},
 {say:'有一天，小鹿让新来的店员小熊帮忙在杯子上写名字。如果她把杯子复印了一份交给小熊，小熊写在复印件上，原来的杯子毫无变化，这就是“传值”。如果她给的是取餐号，小熊照着号码找到真杯子去写，那才真正改到了，这就是“传指针”。',add:[A('bear','🐻','店员小熊',320,300)],send:[{from:'bear',to:'ticket',text:'按号码去找'}]},
 {say:'但小鹿也提醒大家：Go 其实只有值传递，传指针的时候，复制的是那张取餐号本身。所以函数想修改调用方的数据、或者结构体很大时，就传指针；小小的、只读的数据，传值更简单。',bubble:{who:'lu',text:'Go 只有值传递'}},
 {say:'到了下午，小鹿要整理蛋糕。她先买了一个固定六格的蛋托，这就是数组 [6]Cake。六格就是六格，多一块放不下，少一块也空着。而且长度是类型的一部分，六格蛋托和八格蛋托，在 Go 眼里根本是两种东西。',drop:['cup','ticket','bear'],add:[A('tray','🥚','数组：固定 6 格',320,80,{kind:'item',tone:'primary'})]},
 {say:'后来她发现更好用的是“窗口托盘”，也就是切片。切片自己不装蛋糕，它只是架在一排格子上的一扇窗：记着从哪一格开始看，窗里能看见几块（len），后面最多还能延伸几格（cap）。',add:[A('win','🪟','切片：ptr · len · cap',320,190,{kind:'item',tone:'ok'})],send:[{from:'win',to:'tray',text:'架在上面'}]},
 {say:'客人一多，蛋糕要不断加进去。append 就是往窗口里放新蛋糕。格子还够，就直接放；格子满了，小鹿只好去买一个更大的蛋托，把旧蛋糕一块块搬过去，再放新的。这就是切片扩容：容量小时大约翻倍，大了以后增长慢一些。',add:[A('move','🚚','满了就搬家',320,300,{kind:'tag',tone:'warm'})],sub:{win:'len 6 → 7，cap 6 → 12'}},
 {say:'搬家之后，旧窗口还看着旧蛋托，新窗口看着新蛋托，从此分道扬镳。所以 append 之后一定要接住返回值：s = append(s, x)。忘了接，就像搬了新店却还在老地址等客人。',bubble:{who:'win',text:'记得接住我'}},
 {say:'还有一个常见的乌龙：小鹿用 make([]Cake, 5) 准备托盘，然后又 append 了三块蛋糕，结果托盘里前面多了五个“空蛋糕”。原来 make 的第一个数是长度，已经放好了五个零值。想要一个空托盘、只是预留位置，应该写 make([]Cake, 0, 5)。',drop:['move','tray'],add:[A('mk','⚠️','make(T, 5) vs make(T, 0, 5)',320,300,{kind:'tag',tone:'bad'})]},
 {say:'最后是寄存柜，也就是 map。客人把包交给前台，拿到一把写着号码的钥匙，以后凭钥匙就能马上取回包，不用一个个柜子去翻。map 用 key 算出位置，平均一下就能找到。',drop:['mk','win'],add:[A('locker','🗄️','map：寄存柜',150,150,{kind:'item',tone:'primary'}),A('key','🔑','key：钥匙号码',450,150,{kind:'tag'})],send:[{from:'key',to:'locker',text:'直达'}]},
 {say:'寄存柜有三条规矩。第一，钥匙必须能比较是否相同，所以切片、map 不能当钥匙。第二，柜子没有固定顺序，每次遍历顺序都可能不同。第三，一个还没装好的柜子，也就是 nil map，可以看，但往里放东西会直接 panic，得先用 make 装好。',add:[A('rules','📏','key 可比较 · 无序 · nil 不能写',300,280,{kind:'tag',tone:'warm'})]},
 {say:'夜深了，小鹿关上店门，在本子上写下今天学到的事：执照管依赖，部门靠大小写，数字会溢出，字符串只读，指针是取餐号，切片是窗口，map 是寄存柜。咖啡馆的第一天，就这样平安结束了。',drop:['rules','key'],add:[A('note','📓','今日笔记',450,150,{kind:'item',tone:'ok'})],tone:{locker:'ok'}},
 {say:'这一集讲完了，记住几个关键画面。',memo:['go.mod 执照，go.sum 封条，大写对外','切片是窗口，append 要接住，map 是寄存柜']},
]};
