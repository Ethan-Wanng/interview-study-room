import type {AiQuiz} from '../journey';

// 英语入门（A1）、基础（A2）阶段训练的补充题：覆盖新加的词汇和阅读关卡。id 以 en-x 开头。
export const enTrain1More:AiQuiz[]=[
 {id:'en-x1-16',q:'下面哪组词都是家庭成员？',options:['aunt, cousin, uncle','nurse, driver, cook','eye, ear, nose','red, blue, pink'],why:['','这一组是职业。','这一组是身体部位。','这一组是颜色。'],answer:0,explain:'aunt 阿姨、cousin 堂表兄弟姐妹、uncle 叔叔舅舅。'},
 {id:'en-x1-17',type:'fill',q:'foot 的复数是＿。',accepted:['feet'],explain:'foot → feet，tooth → teeth，都是不规则复数。'},
 {id:'en-x1-18',q:'I’m ___. This movie is so ___.（我好无聊，这电影好无聊）',options:['bored, boring','boring, bored','bored, bored','boring, boring'],why:['','顺序反了：说自己的感受用 bored。','说电影的特点要用 boring。','说自己“无聊的人”才用 boring。'],answer:0,explain:'-ed 说人的感受，-ing 说事物的特点。'},
 {id:'en-x1-19',q:'听录音，说话人哪里不舒服？',say:'I have a terrible stomachache.',options:['肚子疼','头疼','牙疼','背疼'],why:['','头疼是 headache。','牙疼是 toothache。','背疼是 backache 或 back pain。'],answer:0,explain:'stomach（胃、肚子）+ ache（疼）= stomachache，ch 读 /k/。'},
 {id:'en-x1-20',type:'multi',q:'下面哪些是不可数名词？（多选）',options:['milk','bread','egg','apple'],why:['','','egg 可数：two eggs。','apple 可数：three apples。'],answers:[0,1],explain:'milk、bread、water、rice 不可数；要数的时候用 a glass of milk、a piece of bread。'},
 {id:'en-x1-21',q:'朋友说 “Put on your coat. It’s freezing!”，freezing 最可能的意思是？',options:['非常冷','非常热','下大雨','风很大'],why:['','穿外套说明天冷，不会是热。','下雨会提醒带伞（umbrella）。','风大是 windy。'],answer:0,explain:'freeze 是结冰，freezing 形容“冷得要结冰”。根据 coat 也能猜出来。'},
 {id:'en-x1-22',type:'fill',q:'问天气：What’s the weather ＿ today?（填一个词）',accepted:['like'],explain:'What’s the weather like? 这里的 like 是“像……一样”，不是“喜欢”。'},
 {id:'en-x1-23',q:'商场门上写着 PUSH，你应该？',options:['把门推开','把门拉开','按门铃','门坏了，换一扇'],why:['','拉是 PULL。','按门铃会写 PRESS 或 RING。','门坏了会写 OUT OF ORDER。'],answer:0,explain:'PUSH 推，PULL 拉。'},
 {id:'en-x1-24',q:'根据“魔法 e”规律，kite 里的 i 读？',options:['/aɪ/，像字母 I 的名字','/ɪ/，像 sit 里的 i','/iː/，像 see 里的 ee','不发音，是哑的'],why:['','kit（没有结尾 e）里的 i 才读短音 /ɪ/。','/iː/ 是 ee、ea 的常见读音。','i 要读出来，不发音的是结尾的 e。'],answer:0,explain:'元音 + 辅音 + e 结尾：e 不发音，前面的元音读字母本身的名字。'},
 {id:'en-x1-25',passage:'On Sundays, we have dinner at my grandmother’s house. She makes the best noodles in the world!',q:'读短文，奶奶最拿手的是？',options:['面条','饺子','米饭','蛋糕'],why:['','文中没有提到饺子。','文中没有提到米饭。','文中没有提到蛋糕。'],answer:0,explain:'She makes the best noodles in the world!'},
 {id:'en-x1-26',type:'judge',q:'菜单上的 dessert 是甜点，desert 是沙漠，两个词重音位置不同。',answer:true,explain:'dessert /dɪˈzɜːrt/ 重音在后；desert /ˈdezərt/ 重音在前。'},
 {id:'en-x1-27',q:'朋友发消息 “Running late, omw!”，意思是？',options:['要迟到了，在路上了','我在跑步，别等我','我今晚很晚才睡','我刚到，你在哪'],why:['','running late 是“要迟到了”，不是跑步。','消息里没有提到睡觉。','omw 是 on my way，还在路上，没到。'],answer:0,explain:'running late 快迟到了；omw = on my way。'},
 {id:'en-x1-28',type:'multi',q:'下面哪些搭配是正确的？（多选）',options:['a cup of coffee','a glass of water','a piece of cake','a bottle of milk'],why:['','','',''],answers:[0,1,2,3],explain:'容器 + of 可以给不可数名词“计数”：杯、玻璃杯、块、瓶。'},
 {id:'en-x1-29',type:'fill',q:'“女人们”是＿（woman 的复数）。',accepted:['women'],explain:'woman → women，读 /ˈwɪmɪn/。'},
 {id:'en-x1-30',type:'short',q:'用英语写 3～4 句话描述你的一位家人：他/她是谁、做什么、长什么样、性格怎样。',reference:'This is my older sister, Lina. She is a nurse at a big hospital. She is tall and has long black hair. She is kind and very hard-working.',points:['说清这个人和你的关系（my older sister / my father…）','说出职业，冠词 a/an 用对','至少一个外貌形容词和一个性格形容词','he/she 后面的动词或 be 动词形式正确'],explain:'用学过的家人、职业、外貌、性格词，组合成一段完整的描述。'},
];

export const enTrain2More:AiQuiz[]=[
 {id:'en-x2-16',q:'The keys are ___ the table.（钥匙在桌上）',options:['on','in','under','at'],why:['','in 是在里面，钥匙不会在桌子“里面”。','under 是在下面。','at 一般用在地点点位，比如 at the door。'],answer:0,explain:'on 表示在表面上：on the table、on the wall。'},
 {id:'en-x2-17',type:'fill',q:'这附近有银行吗？Is ＿ a bank near here?',accepted:['there'],explain:'Is there a … near here? 问附近有没有某个地方。'},
 {id:'en-x2-18',q:'听录音，说话人怎么去上班？',say:'I usually go to work on foot, but when it rains I take the subway.',options:['平时走路，下雨坐地铁','平时坐地铁，下雨走路','一直开车','骑自行车'],why:['','顺序反了：on foot 是平时，subway 是下雨时。','录音里没有提到开车。','录音里没有提到自行车。'],answer:0,explain:'on foot 步行；take the subway 坐地铁。'},
 {id:'en-x2-19',type:'multi',q:'下面哪些搭配正确？（多选）',options:['play the guitar','go shopping','do yoga','play swimming'],why:['','','','以 -ing 结尾的活动用 go：go swimming。'],answers:[0,1,2],explain:'乐器 play the，-ing 活动 go，球类 play，其他 do。'},
 {id:'en-x2-20',q:'I need to make a ___ today.（我今天得做个决定）',options:['decision','homework','dishes','business'],why:['','homework 和 do 搭配：do homework。','dishes 和 do 搭配：do the dishes。','business 常和 do 搭配：do business。'],answer:0,explain:'make a decision、make a mistake、make money；do homework、do the dishes。'},
 {id:'en-x2-21',type:'judge',q:'job 和 work 都可以说 a job / a work。',answer:false,explain:'job 可数（a new job），work 表示工作量时不可数（a lot of work）。'},
 {id:'en-x2-22',passage:'NOTICE TO ALL RESIDENTS\nThe water will be turned off on Tuesday, May 12, from 9 a.m. to 3 p.m. Please store some water before Tuesday morning.\nBuilding Management',type:'fill',q:'停水从上午 9 点到下午几点？（填数字）',accepted:['3','三','3点','三点'],explain:'from 9 a.m. to 3 p.m.：上午 9 点到下午 3 点。'},
 {id:'en-x2-23',passage:'My brother bought a new bike last month. He rides it to school every day. His friends think it looks cool, and they often ask to try it.',q:'最后一句里的 it 指的是？',options:['新自行车','学校','上个月','他的朋友'],why:['','学校不能被试骑。','it 不指时间。','friends 是复数，要用 they。'],answer:0,explain:'代词往前找最近的、单复数对得上的名词：it → a new bike。'},
 {id:'en-x2-24',q:'The soup was so bland that I added salt and pepper. 里 bland 最可能的意思是？',options:['没味道的','太咸的','太烫的','很贵的'],why:['','太咸就不会再加盐。','加盐和胡椒不是为了降温。','加调料和价格无关。'],answer:0,explain:'加盐加胡椒说明汤味道太淡，bland = 寡淡无味的。用上下文猜词。'},
 {id:'en-x2-25',type:'fill',q:'正式邮件的开头：I’m ＿ to tell you about the meeting.（我写信是想告诉你会议的事）',accepted:['writing'],explain:'I’m writing to… 是邮件说明来意的固定开头。'},
 {id:'en-x2-26',q:'听录音，这件夹克为什么要退？',say:'I’d like to return this jacket. It’s too small for me.',options:['太小了','太贵了','颜色不对','有破洞'],why:['','录音没有提到价格。','录音没有提到颜色。','录音没有说有破洞。'],answer:0,explain:'too small 太小。return 退货。'},
 {id:'en-x2-27',type:'multi',q:'下面哪些是正确的句子？（多选）',options:['I go home at six.','She goes to work by bus.','I go to home at six.','He go to school on foot.'],why:['','','go home 前面不加 to。','he 后面动词要加 es：goes。'],answers:[0,1],explain:'go home 不加 to；第三人称单数 go → goes。'},
 {id:'en-x2-28',q:'问别人的职业，最自然的是？',options:['What do you do?','What are you do?','What do you doing?','What you do?'],why:['','are 和 do 不能这样连用。','do 后面不能接 doing。','问句缺少帮手 do。'],answer:0,explain:'What do you do? 问职业；What are you doing? 问此刻在做什么。'},
 {id:'en-x2-29',type:'short',q:'用英语写 4～5 句话介绍你住的地方：住房类型、有几个房间、附近有什么、你怎么出行。',reference:'I live in a small apartment on the eighth floor. It has two bedrooms, a kitchen and a living room. There is a supermarket and a park near my home. I usually go to work by subway, and it takes about thirty minutes.',points:['说出住房类型（apartment / house）和楼层或房间','用 There is / There are 说附近有什么','用 by + 交通工具或 on foot 说出行方式','句子完整，主谓一致，冠词基本正确'],explain:'把房间、地点、交通三组词和 There is / There are 句型组合起来。'},
];
