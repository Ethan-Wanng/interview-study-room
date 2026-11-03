import type {AiQuiz} from '../journey';

// 英语入门、基础阶段训练：综合前几关的内容，比关卡题更难。id 以 en-x 开头。
export const enTrain1:AiQuiz[]=[
 {id:'en-x1-1',q:'听录音，选出你听到的电话号码。',say:'My phone number is one three nine, oh four five.',options:['139 045','139 405','130 945','139 450'],why:['','录音里 oh（0）在 four 前面。','录音开头是 one three nine，没有 oh。','最后两位是 four five，不是 five oh。'],answer:0,explain:'电话号码一位一位地读，0 常读成 oh。'},
 {id:'en-x1-2',q:'下面哪个单词的重音在第二拍？',options:['hotel','teacher','water','coffee'],why:['','teacher 读 TEA-cher，重音在第一拍。','water 读 WA-ter，重音在第一拍。','coffee 读 COF-fee，重音在第一拍。'],answer:0,explain:'hotel 读 ho-TEL，重音在后面。查词典时看音标里的 ˈ。'},
 {id:'en-x1-3',type:'judge',q:'晚上见到朋友时，可以用 Good night 打招呼。',answer:false,explain:'Good night 是分别或睡前说的“晚安”；晚上见面要说 Good evening 或 Hi。'},
 {id:'en-x1-4',type:'fill',q:'别人说 Nice to meet you.，你回答：Nice to meet you ＿.',accepted:['too'],explain:'too 表示“也”。'},
 {id:'en-x1-5',type:'multi',q:'下面哪些单词开头要咬舌（th 音）？（多选）',options:['three','trees','fresh','that'],why:['','trees 开头是 tr，舌尖顶上牙，不咬舌。','fresh 开头是 f，上牙碰下唇。',''],answers:[0,3],explain:'th 开头要咬舌：three、that、think、thank。读成 t 或 f 意思就变了。'},
 {id:'en-x1-6',q:'I’m ___ office worker. 空里应该填？',options:['an','a','the','不填'],why:['','office 以元音开头，要用 an。','the 表示特指，介绍职业时用 a 或 an。','介绍职业时，单数名词前要有 a 或 an。'],answer:0,explain:'元音开头用 an：an office worker、an engineer。'},
 {id:'en-x1-7',q:'听录音，火车几点开？',say:'The train leaves at a quarter past nine.',options:['9:15','8:45','9:45','9:30'],why:['','8:45 是 a quarter to nine。','9:45 是 a quarter to ten。','9:30 是 half past nine。'],answer:0,explain:'quarter = 15 分钟，past = 过了：a quarter past nine = 9:15。'},
 {id:'en-x1-8',type:'fill',q:'2,500 读作 two thousand five ＿.',accepted:['hundred'],explain:'英语三位一组读：two thousand five hundred。'},
 {id:'en-x1-9',q:'英文表格里的 Last name，李明应该填？',options:['Li','Ming','Li Ming','Xiao Li'],why:['','Ming 是名，填在 First name 里。','Last name 只填姓，不填全名。','Xiao Li 是昵称，不是正式的姓。'],answer:0,explain:'Last name / Family name 是姓，First name / Given name 是名。'},
 {id:'en-x1-10',type:'multi',q:'下面哪些句子可以用在自我介绍里？（多选）',options:['I’m from China.','I live in Hangzhou.','I’m a nurse.','My name is Anna.'],why:['','','',''],answers:[0,1,2,3],explain:'名字、来自哪里、住在哪里、做什么，都是自我介绍的常见内容。'},
 {id:'en-x1-11',q:'$12.99 在口语里最常怎么读？',options:['twelve ninety-nine','one two nine nine','twelve point nine','twelve and ninety'],why:['','价格不像电话号码那样一位一位地读。','point 用于小数，读价格时一般不这么说，而且少了一个 9。','少了 nine，而且 and 不是这样用的。'],answer:0,explain:'价格口语常简化：$3.50 → three fifty，$12.99 → twelve ninety-nine。'},
 {id:'en-x1-12',q:'听录音，你们哪天见面？',say:'See you on Wednesday.',options:['周三','周二','周四','周日'],why:['','周二是 Tuesday，开头是 t 音。','周四是 Thursday，开头要咬舌。','周日是 Sunday。'],answer:0,explain:'Wednesday 的第一个 d 不发音，读 WENZ-day。'},
 {id:'en-x1-13',type:'judge',q:'回答 How are you? 时，简单说一句再反问 And you? 就很自然。',answer:true,explain:'How are you? 主要是问候，不需要详细讲自己的状况。'},
 {id:'en-x1-14',type:'short',q:'用英语写一段 3～5 句的自我介绍，包含名字、来自哪里、做什么。',reference:'Hello! My name is Li Ming. I’m from China, and I live in Hangzhou. I’m a software engineer. Nice to meet you!',points:['用 My name is… 或 I’m… 介绍名字','用 I’m from… 或 I live in… 说来自哪里、住在哪里','用 I’m a/an… 说职业，冠词用对','有礼貌的开头或结尾，比如 Hello / Nice to meet you'],explain:'自我介绍的四个要素：问好、名字、来自哪里、做什么，最后加 Nice to meet you。'},
 {id:'en-x1-15',q:'Wednesday 里哪个字母不发音？',options:['第一个 d','开头的 W','中间的 n','结尾的 y'],why:['','W 要读，嘴唇撅圆。','n 要读，WENZ 里有 n。','y 读作 /eɪ/ 或 /i/ 的一部分。'],answer:0,explain:'Wednesday 读 /ˈwenzdeɪ/，第一个 d 不发音。'},
];

export const enTrain2:AiQuiz[]=[
 {id:'en-x2-1',type:'fill',q:'My sister ＿＿ coffee.（我姐姐不喜欢咖啡）',accepted:['doesn’t like',"doesn't like",'does not like'],explain:'第三人称单数否定：doesn’t + 动词原形。'},
 {id:'en-x2-2',q:'选出正确的问句。',options:['Where does he live?','Where he lives?','Where does he lives?','Where is he live?'],why:['','问句需要帮手 does，并放在主语前面。','有了 does，动词变回原形 live。','有普通动词 live 时不用 is。'],answer:0,explain:'疑问词 + does + 主语 + 动词原形。'},
 {id:'en-x2-3',q:'听录音，对方在问什么？',say:'Does she work on weekends?',options:['她周末上不上班','她周末在哪上班','她上周末上班了吗','她周末喜欢干什么'],why:['','问地点会用 Where does she work…?','问过去会用 Did 和 last weekend。','问爱好会用 What does she like to do…?'],answer:0,explain:'Does she…? 是 Yes/No 问句，问的是习惯。'},
 {id:'en-x2-4',type:'multi',q:'下面哪些句子是正确的？（多选）',options:['She is always late.','She always late.','I usually get up at six.','I get up usually at six.'],why:['','缺少 be 动词 is。','','频率词要放在普通动词 get up 前面。'],answers:[0,2],explain:'频率词放在 be 动词后面、普通动词前面。'},
 {id:'en-x2-5',type:'fill',q:'＿ many brothers do you have?（填一个词）',accepted:['How','how'],explain:'How many + 可数名词复数，问数量。'},
 {id:'en-x2-6',type:'judge',q:'“I am like coffee.” 是正确的说法。',answer:false,explain:'句子里已经有普通动词 like，不能再加 am，要说 I like coffee.'},
 {id:'en-x2-7',q:'别人问 “Is this your bag?”，不是你的包，应该回答？',options:['No, it isn’t.','No, it doesn’t.','No, I’m not.','No, it not.'],why:['','is 问句不能用 doesn’t 回答。','问的是 this（这个包），回答主语用 it。','缺少 be 动词 is。'],answer:0,explain:'用什么问就用什么答：Is this…? → Yes, it is. / No, it isn’t.'},
 {id:'en-x2-8',q:'听录音，对方在问什么？',say:'How much are these shoes?',options:['这双鞋多少钱','这双鞋是几码','一共有几双鞋','这鞋在哪买的'],why:['','问尺码会说 What size…?','问数量会说 How many…?','问地点会说 Where did you buy…?'],answer:0,explain:'How much 问价格；shoes 是复数，所以用 are。'},
 {id:'en-x2-9',q:'My friends and I ___ in the same class.',options:['are','am','is','be'],why:['','主语是“我的朋友们和我”，是复数，不能只看 I。','主语是复数，不用 is。','be 要变成 am、is 或 are 才能用在句子里。'],answer:0,explain:'A and B 作主语是复数，用 are。'},
 {id:'en-x2-10',q:'How often do you go to the gym? 最合适的回答是？',options:['Twice a week.','At the gym.','Yes, I do.','By bus.'],why:['','这是在回答“在哪里”。','How 开头的问题不能用 Yes/No 回答。','这是在回答“怎么去”。'],answer:0,explain:'How often 问频率：every day、twice a week、sometimes。'},
 {id:'en-x2-11',type:'multi',q:'下面哪些问句的语序正确？（多选）',options:['What do you do?','Where is the bank?','When does the shop open?','Who is your teacher?'],why:['','','',''],answers:[0,1,2,3],explain:'四句都是正确的 wh 问句：疑问词 + 帮手或 be 动词 + 主语。'},
 {id:'en-x2-12',type:'fill',q:'She ＿ two cats.（她养了两只猫）',accepted:['has'],explain:'have 的第三人称单数是 has。'},
 {id:'en-x2-13',q:'对方说话太快，你想请他慢一点，最合适的是？',options:['Could you speak more slowly, please?','Hey, you talk way too fast.','Speak slow. I no understand.','Slowly you speak to me, please.'],why:['','像在抱怨对方，语气不友好。','语法不对，而且像命令。','语序不对，英语不这样说。'],answer:0,explain:'Could you…, please? 是礼貌请求的万能句型。'},
 {id:'en-x2-14',type:'short',q:'用英语描述你一个工作日的安排，至少 5 句，用一般现在时，包含时间，并用 first、then 等词连接。',reference:'I usually get up at seven. First, I have breakfast and drink some coffee. Then I take the subway to work. I work from nine to six. After that, I get home and cook dinner. I go to bed at eleven.',points:['至少 5 句，按时间顺序','用一般现在时，主语是 I 时动词不加 s','包含具体时间，用 at + 钟点','用 first、then、after that 等词连接句子'],explain:'讲日常：一般现在时 + 时间 + 连接词。'},
 {id:'en-x2-15',q:'听录音，路人让你怎么走？',say:'Go straight, then turn left. It’s across from the bank.',options:['直走后左转，在银行对面','直走后右转，在银行旁边','先左转再直走，在银行里','直走后左转，在银行旁边'],why:['','录音说的是 left（左转）和 across from（对面）。','录音是先 go straight 再 turn left。','across from 是“在对面”，next to 才是“在旁边”。'],answer:0,explain:'go straight 直走，turn left 左转，across from 在……对面。'},
];
