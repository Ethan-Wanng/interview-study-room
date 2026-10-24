import {A,type Story} from '../story';

// 第 5 关「上线与安全」相关面试题的动画脚本。
export const shipStories:Record<string,Story>={
 'ai-q-cost':{title:'省钱又提速：大模型应用的成本账',beats:[
  {say:'每次调用模型都像打一次出租车：按“里程”收费，这里的里程就是 token，回程（输出）比去程（输入）还贵。',add:[A('app','📱','你的应用',90,170,{kind:'item'}),A('m','🤖','大模型',540,170,{tone:'primary'}),A('meter','💰','按 token 计费',320,60,{kind:'tag',tone:'warm'})],send:[{from:'app',to:'m',text:'输入 token'},{from:'m',to:'app',text:'输出 token',tone:'warm'}]},
  {say:'省钱第一招：简单问题交给便宜的小模型，复杂问题才用大模型。',add:[A('small','🐣','小模型',320,280,{tone:'ok'})],send:[{from:'app',to:'small',text:'简单问题',tone:'ok'}]},
  {say:'第二招：每次都一样的长 system 提示，开启提示缓存，重复部分更便宜、更快。',add:[A('cache','📦','提示缓存',320,170,{kind:'item',tone:'ok'})]},
  {say:'第三招：聊天记录别无限累积，只保留最近几轮或做摘要；再限制最大输出长度。',sub:{app:'历史已压缩'},tone:{meter:'ok'}},
  {say:'提速：开启流式输出让用户先看到第一个字；可以并行的子任务同时发出去。',add:[A('fast','⚡','流式 + 并行',540,300,{kind:'tag',tone:'ok'})]},
  {say:'优化之前先量一量：记录每次调用的 token、延迟和费用，找到真正的大头再动手。',add:[A('log','📊','用量日志',90,300,{kind:'item',tone:'primary'})]},
  {say:'记住省钱提速的几招。',memo:['小模型分流、提示缓存、裁剪历史','流式输出、并行请求、先测量']},
 ]},
 'ai-q-prompt-cache':{title:'提示缓存：相同的开头不用重算',beats:[
  {say:'每次请求，开头都是同一份很长的“员工手册”（system 提示），后面才是用户的新问题。',add:[A('req','📨','请求 = 手册 + 新问题',110,170,{kind:'item'}),A('m','🤖','模型服务',530,170,{tone:'primary'})]},
  {say:'第一次请求，服务端把整份手册从头算一遍，并把算好的结果存进缓存。',send:[{from:'req',to:'m',text:'手册 + 问题 1'}],add:[A('c','📦','缓存：手册的计算结果',530,300,{kind:'item',tone:'ok'})]},
  {say:'第二次请求，开头的手册一字不差，于是直接复用缓存，只需要计算新问题。',send:[{from:'req',to:'m',text:'手册 + 问题 2',tone:'ok'},{from:'c',to:'m',text:'命中！',tone:'ok'}],tone:{m:'ok'},note:'命中部分更便宜，首字延迟更短'},
  {say:'要点一：不变的内容放在最前面，变化的内容（时间、用户问题）放在后面。',add:[A('tip','📐','不变在前，变化在后',320,60,{kind:'tag',tone:'primary'})]},
  {say:'要点二：前缀必须逐字相同，改动一个字符，缓存就失效了。',sub:{req:'手册改了一个字'},tone:{req:'bad',m:'warm'},bubble:{who:'m',text:'开头变了，\n只能重算……',tone:'bad'}},
  {say:'要点三：缓存有过期时间，适合高频、重复的调用场景。',tone:{req:'base',m:'primary'}},
  {say:'记住提示缓存的用法。',memo:['相同前缀，复用计算','不变在前，一字不能改']},
 ]},
 'ai-q-rate-limit':{title:'限流和配额：别让一个人用光所有额度',beats:[
  {say:'模型服务商给你的账号一个上限：每分钟最多多少请求、多少 token。所有用户共用这个额度。',add:[A('api','🏦','模型服务商',540,170,{kind:'item'}),A('gate','🚦','你的限流网关',320,170,{tone:'primary'}),A('u1','🧑','用户 A',90,80),A('u2','👩','用户 B',90,260)]},
  {say:'用户 A 写了个脚本疯狂刷请求，如果不管，额度很快被他一个人用光，其他人全部报错。',send:[{from:'u1',to:'gate',text:'刷刷刷',tone:'bad'},{from:'u1',to:'gate',tone:'bad'}],tone:{u1:'bad'}},
  {say:'网关给每个用户发“令牌”：每秒补充几枚，请求一次用一枚，用完就要等。这叫令牌桶。',add:[A('bucket','🪣','令牌桶（每人一个）',320,60,{kind:'item',tone:'warm'})],focus:['gate']},
  {say:'A 的令牌用完了，收到提示“请稍后再试”；B 正常使用，不受影响。',send:[{from:'gate',to:'u1',text:'请稍后再试',tone:'warm'},{from:'u2',to:'gate',text:'正常提问',tone:'ok'},{from:'gate',to:'api',tone:'ok'}],tone:{u2:'ok'}},
  {say:'同时做全局并发控制，避免触发服务商的 429；不同套餐给不同的额度和模型。',add:[A('plan','🎫','套餐额度',540,300,{kind:'tag'})]},
  {say:'记录每个用户的用量，用于计费；异常的高频调用及时告警。',add:[A('log','📊','用量统计',90,330,{kind:'tag',tone:'primary'})]},
  {say:'记住限流的两层。',memo:['上游：别超服务商的上限','下游：按用户和租户分配额度']},
 ]},
 'ai-q-cost-estimate':{title:'算一算：这个功能一个月要花多少钱',beats:[
  {say:'老板问：“这个 AI 功能上线后，一个月要花多少钱？”我们来算一笔账。',add:[A('boss','🧑‍💼','老板',90,170),A('you','🧑‍💻','你',320,170)],bubble:{who:'boss',text:'一个月多少钱？'}},
  {say:'第一步，估请求量：每天 1 万次，一个月就是 30 万次。',add:[A('n','📅','30 万次 / 月',540,70,{kind:'tag',tone:'primary'})]},
  {say:'第二步，估每次的 token：输入 2000（提示 + 历史 + 资料），输出 300。',add:[A('io','🧩','输入 2000 · 输出 300',540,130,{kind:'tag',tone:'primary'})]},
  {say:'相乘：一个月输入 6 亿 token，输出 9000 万 token。',add:[A('tot','🧮','输入 6 亿 · 输出 9000 万',515,190,{kind:'tag',tone:'warm'})],note:'30 万 × 2000 = 6 亿'},
  {say:'再乘以单价：月成本 ≈ 输入 token × 输入单价 + 输出 token × 输出单价。输出单价通常更贵。',add:[A('bill','💰','月成本',540,260,{kind:'item',tone:'warm'})],send:[{from:'tot',to:'bill'}]},
  {say:'太贵？用提示缓存、裁剪历史、路由到小模型、限制输出长度来降。上线后用真实日志校正，并设费用告警。',tone:{bill:'ok'},bubble:{who:'you',text:'优化后能省一大半'},send:[{from:'you',to:'boss',text:'报告',tone:'ok'}]},
  {say:'记住估算公式。',memo:['请求数 × 每次 token × 单价','输入、输出分开算']},
 ]},
 'ai-q-privacy':{title:'保护用户隐私：只给模型必要的信息',beats:[
  {say:'客服系统要把用户的问题发给模型处理，问题里却夹带了手机号和身份证号。',add:[A('u','🧑','用户',90,170),A('msg','💬','问题 + 手机号 + 身份证',320,80,{kind:'item',tone:'warm'}),A('m','🤖','模型服务',540,170,{tone:'primary'})]},
  {say:'第一步“脱敏”：发出去之前，把敏感信息替换成占位符。',add:[A('mask','🫥','脱敏程序',320,200,{tone:'ok'})],send:[{from:'msg',to:'mask'}],sub:{msg:'手机号 → [手机号]'},tone:{msg:'ok'}},
  {say:'只把完成任务必需的内容发给模型。用不到的个人信息，一律不发。',send:[{from:'mask',to:'m',text:'已脱敏的问题',tone:'ok'}]},
  {say:'API Key 只放在服务器上；日志也要脱敏，并限制谁能查看、保存多久。',add:[A('key','🔑','密钥只在服务端',90,310,{kind:'tag',tone:'ok'}),A('log','📒','日志脱敏',320,310,{kind:'tag',tone:'ok'})]},
  {say:'检索资料时按用户权限过滤，缓存和对话记忆按用户隔离，别让 A 看到 B 的数据。',add:[A('iso','🧱','按用户隔离',540,310,{kind:'tag',tone:'ok'})]},
  {say:'合规上：遵守《个人信息保护法》等法规，了解服务商的数据政策，告知用户内容由 AI 生成。',tone:{m:'ok'}},
  {say:'记住隐私保护的原则。',memo:['少给：只发必要信息','遮住：脱敏、隔离、限权']},
 ]},
};
