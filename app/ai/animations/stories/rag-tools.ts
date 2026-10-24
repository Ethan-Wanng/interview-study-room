import {A,type Story} from '../story';

// 第 3、4 关「让它更聪明」「让它办事」相关面试题的动画脚本。
export const ragToolStories:Record<string,Story>={
 'ai-q-rag-flow':{title:'RAG 全流程：让模型开卷答题',beats:[
  {say:'公司有一堆内部文档，模型从没读过。RAG 的思路是：先帮它把相关资料找出来，再让它看着资料回答。',add:[A('docs','📚','内部文档',90,90,{kind:'item'}),A('m','🤖','模型',540,170,{tone:'primary'})]},
  {say:'离线准备：文档被切成小块，每块用 embedding 模型变成一串数字（向量），存进向量数据库。',add:[A('db','🗄️','向量数据库',90,250,{kind:'item',tone:'primary'})],send:[{from:'docs',to:'db',text:'切块 → 向量'}]},
  {say:'员工提问：“年假可以分几次休？”问题也被变成向量。',add:[A('u','👩‍💼','员工',320,80)],bubble:{who:'u',text:'年假可以分几次休？'}},
  {say:'向量数据库找出和问题意思最接近的 3 段资料。',send:[{from:'u',to:'db',text:'问题向量'},{from:'db',to:'u',text:'Top 3 片段',tone:'ok'}],focus:['db']},
  {say:'把这 3 段资料和问题一起放进提示词，并要求“只根据资料回答，找不到就说不知道，标注出处”。',add:[A('p','📝','提示词 = 资料 + 问题',320,250,{kind:'item',tone:'warm'})],send:[{from:'p',to:'m'}]},
  {say:'模型开卷作答：“年假最多分 3 次休 [片段 2]”，员工可以点开出处核对。',send:[{from:'m',to:'u',text:'最多分 3 次 [2]',tone:'ok'}],tone:{u:'ok',m:'ok'}},
  {say:'文档更新了？只要重新处理那几篇文档、更新索引，不用重新训练模型。',memo:['离线：切块 → 向量 → 入库','在线：检索 → 拼提示 → 开卷回答']},
 ]},
 'ai-q-rag-vs-ft':{title:'RAG 还是微调：给模型“资料”还是“培训”',beats:[
  {say:'有两种办法让模型更懂你的业务：给它一本可以随时翻的资料（RAG），或者送它去培训（微调）。',add:[A('m','🤖','模型',320,170,{tone:'primary'}),A('rag','📚','RAG：开卷资料',110,90,{kind:'item'}),A('ft','🎓','微调：岗前培训',530,90,{kind:'item'})]},
  {say:'场景一：价格表每周都变。用 RAG，更新资料就立即生效，还能告诉用户依据在哪一页。',add:[A('price','🏷️','每周变的价格',110,260,{kind:'tag',tone:'warm'})],send:[{from:'rag',to:'m',text:'最新资料',tone:'ok'}],tone:{rag:'ok'}},
  {say:'如果用微调来“背”价格：每变一次就要重新训练，而且没法精确控制它到底记住了什么。',send:[{from:'ft',to:'m',text:'重新训练？',tone:'bad'}],tone:{ft:'bad'}},
  {say:'场景二：客服回答必须是固定的格式和语气，而且你已经有几千条标准回答。这时微调更合适。',add:[A('style','🗣️','固定话术',530,260,{kind:'tag',tone:'primary'})],tone:{ft:'ok',rag:'base'}},
  {say:'RAG 还有一个独门本领：可以按员工权限过滤资料，不该看的文档根本不会被检索出来。',add:[A('lock','🔐','按权限过滤',110,310,{kind:'tag',tone:'ok'})]},
  {say:'很多系统两者一起用：微调固化风格，RAG 提供知识。顺序上：先改提示词，再上 RAG，最后才考虑微调。',tone:{m:'ok',rag:'ok',ft:'ok'}},
  {say:'记住怎么选。',memo:['会变的知识 → RAG','固定的行为和风格 → 微调']},
 ]},
 'ai-q-embedding-choice':{title:'怎么挑 embedding 模型',beats:[
  {say:'embedding 模型像一位“翻译官”，把文字翻译成坐标。意思越像的句子，坐标离得越近。',add:[A('e','🧭','embedding 模型',320,120,{tone:'primary'}),A('s1','💬','怎么退款',110,250,{kind:'tag'}),A('s2','💬','如何申请退货',530,250,{kind:'tag'})],send:[{from:'s1',to:'e'},{from:'s2',to:'e'}]},
  {say:'不同翻译官水平不同：有的擅长英文，有的懂中文，有的熟悉代码或医学术语。',add:[A('c1','🔤','英文强',110,60,{kind:'tag'}),A('c2','🀄','中文强',320,40,{kind:'tag',tone:'ok'}),A('c3','💻','代码强',530,60,{kind:'tag'})]},
  {say:'公开排行榜（如 MTEB）可以帮你初步筛选，但最终要用自己的问题和文档测一测“能不能找回正确的资料”。',add:[A('test','🧪','自己的测试集',320,320,{kind:'item',tone:'primary'})],note:'看召回率，不只看榜单'},
  {say:'向量维度越高，表达越细，但存储和检索也越贵。不是越高越好。',add:[A('dim','📏','维度 ↑ 成本 ↑',530,320,{kind:'tag',tone:'warm'})]},
  {say:'最重要的一条规矩：换了 embedding 模型，就必须用新模型把全部文档重新计算一遍。新旧坐标不能混用！',tone:{e:'warm'},bubble:{who:'e',text:'我换了新的“坐标系”，\n旧坐标全部作废！',tone:'warm'}},
  {say:'还要看最大输入长度、速度、价格，以及能不能私有化部署。',tone:{e:'ok'}},
  {say:'记住挑选方法。',memo:['用自己的数据测召回','换模型就全量重算']},
 ]},
 'ai-q-tool-use':{title:'工具调用：模型出主意，程序来动手',beats:[
  {say:'用户问：“帮我查一下订单 1024 到哪了？”模型自己查不到物流，但它知道有个工具可以用。',add:[A('u','🧑','用户',90,170),A('m','🤖','模型',320,170,{tone:'primary'}),A('app','🧑‍💻','你的程序',550,170,{kind:'char'})],send:[{from:'u',to:'m',text:'订单 1024 到哪了？'}]},
  {say:'开发者事先告诉模型：有一个工具叫 track_order，需要参数“订单号”。这份说明用 JSON Schema 描述。',add:[A('tool','🧰','track_order(订单号)',320,50,{kind:'item'})],send:[{from:'tool',to:'m',tone:'quiet'}]},
  {say:'模型不直接回答，而是回复：“请帮我调用 track_order，订单号 1024。”',send:[{from:'m',to:'app',text:'调用 track_order(1024)'}],focus:['m']},
  {say:'你的程序先检查参数、确认这个订单属于当前用户，再真的去查物流系统。',add:[A('ship','🚚','物流系统',550,310,{kind:'item'})],send:[{from:'app',to:'ship'},{from:'ship',to:'app',text:'已到上海',tone:'ok'}],tone:{app:'ok'}},
  {say:'程序把查询结果作为“工具结果”发回给模型。',send:[{from:'app',to:'m',text:'结果：已到上海',tone:'warm'}]},
  {say:'模型据此组织语言回答用户。需要的话，它还可以继续调用下一个工具。',send:[{from:'m',to:'u',text:'已到上海，明天送达',tone:'ok'}],tone:{u:'ok'}},
  {say:'记住分工：模型决定“做什么”，程序负责“真正去做”，高风险操作还要让用户确认。',memo:['模型：选工具、填参数','程序：校验、执行、回传结果']},
 ]},
 'ai-q-mcp':{title:'MCP：给 AI 应用的“万能插座”',beats:[
  {say:'以前，每个 AI 应用想接入一个新工具（比如日历、数据库、网盘），都要自己写一套对接代码。',add:[A('a1','📱','应用 A',90,90,{kind:'item'}),A('a2','💻','应用 B',90,250,{kind:'item'}),A('t1','📅','日历',550,90,{kind:'item'}),A('t2','🗄️','数据库',550,250,{kind:'item'})],send:[{from:'a1',to:'t1',tone:'bad'},{from:'a1',to:'t2',tone:'bad'},{from:'a2',to:'t1',tone:'bad'},{from:'a2',to:'t2',tone:'bad'}],note:'N 个应用 × M 个工具 = N×M 套对接代码'},
  {say:'MCP（模型上下文协议）就像一个统一规格的插座。',add:[A('mcp','🔌','MCP 协议',320,170,{tone:'primary'})]},
  {say:'工具提供方只要做一个“MCP 服务器”，按标准说明：我有哪些工具、哪些资料。',send:[{from:'t1',to:'mcp',text:'我有这些工具',tone:'ok'},{from:'t2',to:'mcp',tone:'ok'}],tone:{t1:'ok',t2:'ok'}},
  {say:'任何支持 MCP 的应用接上就能用，不用再重复写对接代码。',send:[{from:'mcp',to:'a1',tone:'ok'},{from:'mcp',to:'a2',tone:'ok'}],tone:{a1:'ok',a2:'ok'}},
  {say:'它和 Function Calling 的关系：MCP 负责把工具“接进来”；Function Calling 是模型决定“用哪个、填什么参数”。',add:[A('fc','🤖','模型：Function Calling',320,310,{kind:'item'})],send:[{from:'a2',to:'fc',text:'可用工具清单'}]},
  {say:'记住 MCP 的作用。',memo:['MCP：工具接入的统一标准','Function Calling：模型选用工具']},
 ]},
};
