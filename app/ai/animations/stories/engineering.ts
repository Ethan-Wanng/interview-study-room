import {A,type Story} from '../story';

// 第 8 关「进阶：工程化」相关面试题的动画脚本。
export const engineeringStories:Record<string,Story>={
 'ai-q-structured':{title:'让模型稳定输出 JSON',beats:[
  {say:'程序要读模型的结果，比如“这条评论是好评还是差评”。如果模型自由发挥写一段话，程序根本没法解析。',add:[A('m','🤖','模型',110,170,{tone:'primary'}),A('app','🧑‍💻','你的程序',540,170)],send:[{from:'m',to:'app',text:'我觉得这条…',tone:'bad'}],bubble:{who:'app',text:'这让我怎么解析？',tone:'bad'}},
  {say:'办法一：用 API 的结构化输出功能，或者把格式定义成 JSON Schema，规定有哪些字段、什么类型。',add:[A('schema','📐','JSON Schema',320,60,{kind:'item',tone:'primary'})],send:[{from:'schema',to:'m'}]},
  {say:'模型按格式输出：{"sentiment":"positive","reasons":["物流快"]}。',send:[{from:'m',to:'app',text:'{ sentiment, reasons }',tone:'ok'}]},
  {say:'办法二：拿到结果后，代码里再用 zod 或 pydantic 校验一遍，不合格的绝不放行。',add:[A('check','✅','代码校验',320,290,{kind:'item',tone:'ok'})],focus:['check']},
  {say:'校验失败？把错误信息发回模型：“缺少 reasons 字段”，让它改一次。',send:[{from:'check',to:'m',text:'缺少 reasons',tone:'warm'}],tone:{check:'warm'}},
  {say:'还失败就走兜底：返回默认值、转人工，并记录日志统计失败率。',tone:{check:'ok',app:'ok'}},
  {say:'记住稳定输出的四件套。',memo:['约束格式 + 代码校验','带错重试 + 兜底处理']},
 ]},
 'ai-q-memory':{title:'长对话和记忆：模型怎么“记住”你',beats:[
  {say:'用户和助手聊了很久。模型本身不记得任何东西，“记忆”全靠程序每次把历史带过去。',add:[A('u','👩','用户',90,170),A('m','🤖','助手',540,170,{tone:'primary'}),A('his','💬','聊天记录 200 轮',320,80,{kind:'item',tone:'warm'})]},
  {say:'聊得越久，带过去的历史越长：费用越来越高，还会超出上下文窗口。',sub:{his:'越来越长……'},tone:{his:'bad'}},
  {say:'短期记忆：只保留最近几轮原文，更早的内容压缩成一段摘要。',add:[A('sum','📝','早期对话摘要',320,170,{kind:'tag',tone:'ok'})],tone:{his:'ok'},sub:{his:'最近 10 轮'}},
  {say:'长期记忆：把重要事实（比如“用户对花生过敏”）抽出来，存进数据库。',add:[A('db','🗄️','长期记忆库',320,290,{kind:'item',tone:'primary'})],send:[{from:'u',to:'db',text:'对花生过敏'}]},
  {say:'下次聊到吃的，程序先从记忆库里查出相关事实，放进提示词。',send:[{from:'db',to:'m',text:'对花生过敏',tone:'ok'}],bubble:{who:'m',text:'推荐几道不含花生的菜～'}},
  {say:'注意：写入记忆要筛选，别存错误信息；不同用户的记忆严格隔离；用户可以查看和删除自己的记忆。',tone:{db:'ok'}},
  {say:'记住两种记忆。',memo:['短期：最近几轮 + 摘要','长期：关键事实存库，按需取用']},
 ]},
 'ai-q-semantic-cache':{title:'语义缓存：相似的问题直接给答案',beats:[
  {say:'客服每天收到大量相似的问题：“怎么退货？”“退货流程是什么？”每次都调用模型，很浪费。',add:[A('u1','🧑','用户 A',90,90),A('u2','👩','用户 B',90,250),A('cache','📦','语义缓存',330,170,{tone:'primary'}),A('m','🤖','模型',560,170,{tone:'primary'})]},
  {say:'用户 A 问“怎么退货”，缓存里没有，调用模型回答，把问答存进缓存。',send:[{from:'u1',to:'cache',text:'怎么退货？'},{from:'cache',to:'m'}]},
  {say:'用户 B 问“退货流程是什么”。字不一样，但意思几乎相同，向量相似度 0.95，直接返回缓存的答案。',send:[{from:'u2',to:'cache',text:'退货流程是什么？'},{from:'cache',to:'u2',text:'命中！',tone:'ok'}],tone:{u2:'ok'},note:'省一次模型调用，又快又便宜'},
  {say:'风险一：阈值太低，把“怎么开通会员”和“怎么取消会员”当成同一个问题，答案就错了！',add:[A('bad','⚠️','开通 ≠ 取消',330,310,{kind:'tag',tone:'bad'})],tone:{cache:'warm'}},
  {say:'风险二：答案会过时，要设过期时间。风险三：涉及个人信息的答案，绝不能跨用户共享。',add:[A('ttl','⏳','过期时间',560,310,{kind:'tag'})]},
  {say:'所以要谨慎设阈值、按用户隔离，并定期抽检命中质量。',tone:{cache:'ok',bad:'ok'},sub:{bad:'阈值调严'}},
  {say:'记住语义缓存的利与弊。',memo:['相似问题复用答案','小心误判、过期、串用户']},
 ]},
 'ai-q-context-engineering':{title:'上下文工程：每次给模型放什么',beats:[
  {say:'提示工程关心“怎么写指令”。上下文工程关心更大的问题：每次调用时，模型的桌面上该放哪些东西。',add:[A('m','🤖','Agent',320,120,{tone:'primary'}),A('desk','🗄️','上下文窗口',320,260,{kind:'item'})]},
  {say:'Agent 干到第 10 步，桌上堆满了：每一步的工具结果都很长，最初的任务要求被埋在了最下面。',add:[A('t1','📃','工具结果 1（很长）',110,80,{kind:'tag'}),A('t2','📃','工具结果 2（很长）',110,140,{kind:'tag'}),A('t3','📃','工具结果 3（很长）',110,200,{kind:'tag'})],tone:{desk:'bad'},bubble:{who:'m',text:'最初的要求是啥来着？',tone:'bad'}},
  {say:'整理一：工具结果只保留有用的部分，或者压缩成摘要。',drop:['t2','t3'],sub:{t1:'摘要：要点 3 条'},tone:{t1:'ok'}},
  {say:'整理二：只放当前步骤需要的工具和资料，用不到的先不放。',add:[A('tools','🧰','只放 2 个相关工具',530,140,{kind:'tag',tone:'ok'})]},
  {say:'整理三：不变的内容放前面，方便命中提示缓存；关键约束在末尾再强调一次。',add:[A('goal','🎯','末尾重申任务目标',530,80,{kind:'tag',tone:'primary'})],tone:{desk:'ok'}},
  {say:'原则：给模型完成当前任务所需的“最小充分信息”。太少会出错，太多会分心。',tone:{m:'ok'},bubble:{who:'m',text:'清楚了，继续干！',tone:'ok'}},
  {say:'记住上下文工程的原则。',memo:['放什么、放多少、怎么排','最小充分信息']},
 ]},
 'ai-q-llm-gateway':{title:'LLM 网关：所有模型调用的“总服务台”',beats:[
  {say:'公司里好几个团队都在用大模型，各自保存厂商密钥、各自写对接代码，用量和费用谁也说不清。',add:[A('a','👥','团队 A',90,80),A('b','👥','团队 B',90,260),A('p1','🤖','厂商一',550,80,{kind:'item'}),A('p2','🤖','厂商二',550,260,{kind:'item'})],send:[{from:'a',to:'p1',tone:'bad'},{from:'b',to:'p2',tone:'bad'}]},
  {say:'于是建一个 LLM 网关：所有调用都先经过它。',add:[A('gw','🛎️','LLM 网关',320,170,{tone:'primary'})]},
  {say:'统一接口：业务方只学一种调用方式，网关负责翻译成各厂商的格式；密钥集中保管在网关里。',send:[{from:'a',to:'gw',text:'统一接口',tone:'ok'},{from:'b',to:'gw',tone:'ok'}]},
  {say:'智能路由：简单任务走便宜模型；主模型超时或报错，自动切换到备用模型。',send:[{from:'gw',to:'p1',text:'主',tone:'bad'},{from:'gw',to:'p2',text:'自动切换',tone:'ok'}],tone:{p1:'bad'}},
  {say:'限流和配额按团队分配；每次调用的 token、延迟、费用都记下来，按团队出账单、设告警。',add:[A('bill','📊','用量账单',320,320,{kind:'item',tone:'ok'})],tone:{p1:'base'}},
  {say:'还能统一做内容安全检查、日志脱敏、灰度发布新模型。注意网关本身不能成为瓶颈，流式响应要能透传。',tone:{gw:'ok'}},
  {say:'记住网关的职责。',memo:['统一接口、集中密钥','路由切换、限流计费']},
 ]},
 'ai-q-frameworks':{title:'LangChain 这类框架，用还是不用',beats:[
  {say:'小张要做一个 RAG 原型，用 LangChain 几十行代码就跑起来了：文档加载、切块、向量库、对话链，现成可用。',add:[A('z','🧑‍💻','小张',110,170),A('fw','🧰','框架：现成组件',350,170,{kind:'item',tone:'ok'})],send:[{from:'z',to:'fw',text:'快速搭原型',tone:'ok'}]},
  {say:'原型阶段框架很香：省时间，还能学到常见的设计模式。',bubble:{who:'z',text:'一下午就跑通了！',tone:'ok'}},
  {say:'上线后问题来了：回答出错，但抽象层太多，很难看清到底给模型发了什么。',tone:{fw:'bad'},sub:{fw:'层层封装，难调试'},bubble:{who:'z',text:'提示词到底长啥样？',tone:'bad'}},
  {say:'框架升级频繁，API 一变，代码就得跟着改；对提示词和调用细节的控制也比较弱。',add:[A('ver','🔄','版本频繁变动',380,300,{kind:'tag',tone:'warm'})]},
  {say:'常见做法：核心链路改成直接调用模型 SDK，写简单清晰的流程；框架里真正好用的组件继续保留。',add:[A('sdk','🔧','核心：直接用 SDK',548,170,{kind:'item',tone:'ok'})],tone:{z:'ok'}},
  {say:'面试时的关键：说明你理解底层原理，而不是只会调框架。',memo:['原型：用框架快速验证','生产：核心链路自己掌控']},
 ]},
};
