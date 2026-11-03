import type {AiQuiz} from '../journey';

// 英语进阶、流畅对话阶段训练：综合后几关的内容，比关卡题更难。id 以 en-x 开头。
export const enTrain3:AiQuiz[]=[
 {id:'en-x3-1',type:'fill',q:'Yesterday I ＿ a new phone.（昨天我买了一部新手机）',accepted:['bought'],explain:'buy 是不规则动词：buy → bought，gh 不发音。'},
 {id:'en-x3-2',q:'What did you do last night? 最合适的回答是？',options:['I watched a movie.','I watch a movie.','I will watch a movie.','I am watching a movie.'],why:['','last night 已经过去，不用一般现在时。','will 表示将来，和 last night 冲突。','进行时表示现在正在做。'],answer:0,explain:'问过去，用过去时回答。'},
 {id:'en-x3-3',q:'听录音，说话人明天三点要做什么？',say:'I’m meeting my boss at three tomorrow.',options:['和老板见面','正在和老板开会','和老板吃午饭','给老板打电话'],why:['','录音里有 tomorrow，说的是明天的安排，不是现在。','录音里说的是 meeting（见面），没有提到吃饭。','打电话会说 calling。'],answer:0,explain:'进行时 + 将来时间 = 已经约好的安排。'},
 {id:'en-x3-4',q:'It’s cold in here. — ___ close the window.（当下临时决定）',options:['I’ll','I’m going to','I closed','I close'],why:['','be going to 表示早就想好的计划，这里是刚刚才决定的。','过去式说的是已经关过了。','一般现在时说的是习惯。'],answer:0,explain:'说话时临时做的决定用 will：I’ll close the window.'},
 {id:'en-x3-5',type:'multi',q:'下面哪些动词加 ed 后读 /ɪd/，多出一拍？（多选）',options:['needed','started','played','worked'],why:['','','played 读 /pleɪd/，不加拍。','worked 读 /wɜːrkt/，不加拍。'],answers:[0,1],explain:'只有 t 或 d 结尾的动词加 ed 才读 /ɪd/。'},
 {id:'en-x3-6',type:'judge',q:'Why don’t we go by bus? 是在问对方为什么不坐公交。',answer:false,explain:'Why don’t we…? 是提建议，意思是“我们坐公交吧”。'},
 {id:'en-x3-7',q:'Would you like some more tea? 你不想要了，应该说？',options:['No, thank you.','No, I don’t like.','No, I wouldn’t like.','No, I’m not.'],why:['','Do you like…? 才用 don’t 回答，而且 like 后面缺宾语。','这样说很生硬，也不完整。','Are you…? 才用 I’m not 回答。'],answer:0,explain:'回答 Would you like…? 用 Yes, please. / No, thank you.'},
 {id:'en-x3-8',type:'fill',q:'They ＿＿ to the party last night.（他们昨晚没来聚会）',accepted:['didn’t come',"didn't come",'did not come'],explain:'过去时否定：didn’t + 动词原形。'},
 {id:'en-x3-9',q:'听录音，客人想怎么付钱？',say:'Can we pay separately?',options:['分开付','刷卡付','一起付','下次付'],why:['','刷卡会说 by card。','一起付会说 together。','录音里没有提到 next time。'],answer:0,explain:'separately = 分开地。'},
 {id:'en-x3-10',q:'Look at those clouds! It ___ rain.',options:['is going to','rained','rains','was'],why:['','过去式表示已经下过了。','一般现在时说的是规律。','was 后面不能直接接动词原形 rain。'],answer:0,explain:'有眼前的证据，马上要发生的事，用 be going to。'},
 {id:'en-x3-11',type:'multi',q:'下面哪些是礼貌的请求？（多选）',options:['Could you open the door, please?','Can I have the menu, please?','I’d like a table for two.','Could I use your phone?'],why:['','','',''],answers:[0,1,2,3],explain:'Could you…、Can I have…、I’d like…、Could I… 都是礼貌的请求方式。'},
 {id:'en-x3-12',q:'Were you at home yesterday? 最合适的肯定回答是？',options:['Yes, I was.','Yes, I did.','Yes, I were.','Yes, I am.'],why:['','问句用 were（be 动词），不用 did 回答。','I 的 be 动词过去式是 was。','am 是现在时，问的是昨天。'],answer:0,explain:'Were you…? → Yes, I was. / No, I wasn’t.'},
 {id:'en-x3-13',type:'short',q:'朋友约你周六一起吃晚饭，但你那天要加班。用英语写一条 3～4 句的消息：礼貌拒绝、说明原因、提议另一个时间。',reference:'Thanks so much for asking! I’m afraid I can’t make it on Saturday because I’m working late. Can we make it another day? How about Sunday evening?',points:['先感谢对方的邀请','用 I’m afraid I can’t 等委婉的说法拒绝','用 because 说明原因，用进行时或 have to 说安排','提议另一个时间，比如 How about…? / Can we make it…?'],explain:'礼貌拒绝 = 感谢 + 委婉拒绝 + 原因 + 新提议。'},
 {id:'en-x3-14',type:'fill',q:'I’ll 是 I ＿ 的缩写（填一个词）。',accepted:['will'],explain:'I’ll = I will；否定 won’t = will not。'},
 {id:'en-x3-15',q:'She ___ to Japan two years ago.',options:['went','goes','has gone','is going'],why:['','two years ago 是过去，不用一般现在时。','有明确的过去时间 ago 时，不用现在完成时。','进行时表示现在或将来的安排。'],answer:0,explain:'ago、last year、yesterday 这些明确的过去时间要用一般过去时。'},
];

export const enTrain4:AiQuiz[]=[
 {id:'en-x4-1',q:'听录音，对方是什么意思？',say:'I’m gonna grab a coffee. Do you wanna come?',options:['邀请你一起去喝咖啡','问你以前喝没喝过咖啡','请你帮忙去买咖啡','告诉你咖啡不好喝'],why:['','问经历会用 Have you ever…?','请人帮忙会用 Could you…?','录音里没有评价咖啡的话。'],answer:0,explain:'gonna = going to，wanna = want to。grab a coffee 是“去喝杯咖啡”。'},
 {id:'en-x4-2',q:'What’s it like working from home? 在问什么？',options:['在家办公感觉怎么样','你在家里做什么工作','你喜欢什么样的家','你家附近有没有工作'],why:['','这不是问工作内容，问的是体验。','这里的 like 不是“喜欢”，是“像什么”。','问的不是找工作的事。'],answer:0,explain:'What’s it like…? 问“……是什么样的体验”。'},
 {id:'en-x4-3',type:'multi',q:'朋友说他生病了，下面哪些回应合适？（多选）',options:['That’s too bad.','I’m sorry to hear that.','Good for you!','No way, that’s awesome!'],why:['','','Good for you 是“替你高兴”，用在好消息后面。','awesome 是“太棒了”，回应坏消息不合适。'],answers:[0,1],explain:'坏消息用 That’s too bad / I’m sorry to hear that / Oh no。'},
 {id:'en-x4-4',type:'fill',q:'Have you ever ＿ durian?（你吃过榴莲吗？）',accepted:['eaten'],explain:'现在完成时 have + 过去分词：eat → ate → eaten。'},
 {id:'en-x4-5',type:'judge',q:'I can swim. 这句里的 can 通常读得又轻又短。',answer:true,explain:'肯定句里 can 弱读 /kən/，重音落在 swim；否定的 can’t 才重读。'},
 {id:'en-x4-6',q:'朋友推荐一家餐厅，你觉得太贵了，最自然的不同意是？',options:['That’s true, but it’s a bit pricey.','No. You are totally wrong about it.','Expensive. Bad idea. No way.','I disagree you completely, sorry.'],why:['','直接说对方错，显得很冲。','像在发电报，生硬又不礼貌。','语法不对，要说 disagree with you，而且太直接。'],answer:0,explain:'先肯定（That’s true），再用 but 委婉地说出不同意见。'},
 {id:'en-x4-7',q:'听录音，会议怎么了？',say:'The meeting has been moved to Thursday afternoon.',options:['改到了周四下午','改到了周二下午','被取消了','改到了周四上午'],why:['','周二是 Tuesday，录音里是咬舌的 Thursday。','moved 是“改时间”，不是 cancelled。','录音说的是 afternoon（下午）。'],answer:0,explain:'抓关键词：meeting、moved、Thursday afternoon。'},
 {id:'en-x4-8',q:'同事说 “I just got a new job!”，最好的接话是？',options:['Congrats! What’s the new job?','OK. I have a job too.','Why? Your old job was fine.','I don’t care about jobs.'],why:['','没有表示高兴，还把话题转到了自己身上。','像在质疑对方，扫兴。','冷漠，对话会马上结束。'],answer:0,explain:'先回应情绪（Congrats!），再追问细节，对话才能聊下去。'},
 {id:'en-x4-9',type:'fill',q:'忘了 umbrella 这个词，可以说：It’s the thing you use ＿ it rains.（填一个词）',accepted:['when'],explain:'描述法：It’s the thing you use when… / It’s a kind of…'},
 {id:'en-x4-10',type:'multi',q:'一分钟的口语回答，应该包含哪些部分？（多选）',options:['明确的观点','支持观点的理由','具体的例子','背好的整段范文'],why:['','','','背出来的范文常常答非所问，听起来也不自然。'],answers:[0,1,2],explain:'观点 + 理由 + 例子 + 总结。'},
 {id:'en-x4-11',q:'Have you been to Xi’an? — Yes, I ___ there last year.',options:['went','have gone','go','have been'],why:['','有具体过去时间 last year，不用现在完成时。','last year 是过去，不用一般现在时。','有具体过去时间时，要换回一般过去时。'],answer:0,explain:'问经历用现在完成时；说出具体时间就换成过去时。'},
 {id:'en-x4-12',q:'听录音，说话人想做什么？',say:'Well, it was really nice talking to you. I should get going.',options:['准备结束对话','刚开始聊天','请你帮个忙','在向你道歉'],why:['','开始聊天会问 How are you? 或开个话题。','请人帮忙会用 Could you…?','录音里没有 sorry。'],answer:0,explain:'nice talking to you + I should get going 是自然结束对话的信号。'},
 {id:'en-x4-13',type:'short',q:'用英语回答：Do you prefer coffee or tea? Why? 至少 4 句，包含观点、理由和一个例子。',reference:'I prefer tea. I think it’s healthier than coffee, and it doesn’t keep me awake at night. For example, I drink green tea every afternoon at work, and it helps me relax. So for me, tea is the better choice.',points:['开头明确说出观点：I prefer… / I think…','用 because 或 and 给出至少一个理由','用 For example 举一个自己的例子','句子完整，语法基本正确，有总结或收尾'],explain:'观点 + 理由 + 例子 + 总结，是口语回答的万能结构。'},
 {id:'en-x4-14',type:'judge',q:'第一次见面问对方工资多少，在英语国家是常见的闲聊话题。',answer:false,explain:'收入、年龄、体重、婚姻、宗教、政治都属于隐私，闲聊时要避开。'},
 {id:'en-x4-15',q:'a cup of tea 里的 of 在口语中通常怎么读？',options:['弱读，轻轻带过','重读并拖长','读成 off','和 cup 分开停顿'],why:['','of 是小词，不重读。','off 是另一个词，结尾是 f 音。','口语里 cup of 会连起来读成 cup-pa。'],answer:0,explain:'of 弱读成 /əv/ 甚至 /ə/：a cup of tea → a cup-pa tea。'},
];
