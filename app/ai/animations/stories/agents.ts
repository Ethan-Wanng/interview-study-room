import {A,type Story} from '../story';

// 第 11 关「Agent 架构与工作流」相关面试题的动画脚本。
export const agentStories:Record<string,Story>={
 'ai-q-agent-vs-workflow':{title:'工作流 vs Agent：按图施工还是自由发挥',beats:[
  {say:'任务一：每天把客户邮件分类，再填进表格。步骤固定，每次都一样。',add:[A('mail','📧','客户邮件',90,100,{kind:'item'}),A('wf','🛤️','工作流',320,100,{tone:'primary'}),A('sheet','📊','表格',550,100,{kind:'item'})],send:[{from:'mail',to:'wf',text:'① 分类'},{from:'wf',to:'sheet',text:'② 填表'}]},
  {say:'工作流就像按图施工：步骤由代码写死，模型只负责其中的“分类”这一小步。可预测、好测试、成本可控。',tone:{wf:'ok',sheet:'ok'}},
  {say:'任务二：“帮我调研三家竞品，写一份对比报告。”要查什么、查几次、何时结束，事先说不清。',add:[A('task','📝','竞品调研',90,260,{kind:'item',tone:'warm'}),A('agent','🤖','Agent',320,260,{tone:'primary'})],send:[{from:'task',to:'agent'}]},
  {say:'Agent 自由发挥：自己决定先搜什么、读哪篇、要不要再查，直到觉得资料够了。',add:[A('web','🌐','搜索',550,220,{kind:'tag'}),A('doc','📄','阅读',550,290,{kind:'tag'})],send:[{from:'agent',to:'web'},{from:'agent',to:'doc'}],bubble:{who:'agent',text:'资料不够，\n再查一轮'}},
  {say:'但它更贵、更慢、更难预测，必须设置步数上限、超时和最小权限。',add:[A('guard','🛡️','步数上限 · 超时',110,330,{kind:'tag',tone:'warm'})]},
  {say:'选择原则：能用工作流解决的，就别用 Agent。',memo:['固定步骤 → 工作流','开放任务 → Agent + 护栏']},
 ]},
 'ai-q-agent-reliability':{title:'让 Agent 更靠谱的四道防线',beats:[
  {say:'一个负责订机票的 Agent 时不时出岔子：选错工具、填错日期，偶尔还原地打转。',add:[A('ag','🤖','订票 Agent',320,170,{tone:'bad'})],bubble:{who:'ag',text:'我又查了一遍航班……\n第 12 次了',tone:'bad'}},
  {say:'防线一（工具层）：工具按意图设计、数量精简、描述清晰；出错时返回能看懂的错误信息，方便它自己改正。',add:[A('l1','🧰','工具清晰',110,70,{kind:'item',tone:'ok'})]},
  {say:'防线二（控制层）：最多 10 步、预算上限、超时；付款前必须让用户确认；重复下单要能防住（幂等）。',add:[A('l2','🚧','上限 + 确认 + 幂等',530,70,{kind:'item',tone:'ok'})]},
  {say:'防线三（上下文层）：只保留有用的中间结果，长任务定期总结，进度存档，失败了能从断点恢复。',add:[A('l3','💾','精简上下文 + 存档',110,280,{kind:'item',tone:'ok'})]},
  {say:'防线四（质量层）：用典型任务和失败案例组成评测集，完整记录 trace，定位是规划、选工具还是填参数出了错。',add:[A('l4','📊','评测 + trace',530,280,{kind:'item',tone:'ok'})]},
  {say:'四道防线都到位，Agent 就稳定多了。',tone:{ag:'ok'},bubble:{who:'ag',text:'已订好，请确认付款',tone:'ok'}},
  {say:'记住四道防线。',memo:['工具清晰、控制有上限','上下文精简、评测有 trace']},
 ]},
 'ai-q-react-plan':{title:'ReAct 和先计划后执行：两种做事风格',beats:[
  {say:'任务：“整理一份本周 AI 新闻摘要。”两个 Agent 用不同的风格来做。',add:[A('r','🤸','ReAct 风格',150,100,{tone:'primary'}),A('p','📋','计划派',490,100,{tone:'primary'})]},
  {say:'ReAct 边想边做：想一步、做一步、看结果，再决定下一步。',add:[A('r1','💭','想：先搜新闻',150,200,{kind:'tag'}),A('r2','🔧','做：搜索',150,250,{kind:'tag'}),A('r3','👀','看：结果太多',150,300,{kind:'tag'})],focus:['r']},
  {say:'优点是灵活，随时根据结果调整；缺点是每一步都要调用大模型，步骤多时又慢又贵，还容易跑偏。',tone:{r:'warm'}},
  {say:'计划派先列出完整计划：① 搜新闻 ② 去重 ③ 每条写摘要 ④ 汇总排版。',add:[A('plan','🗒️','① 搜 ② 去重 ③ 摘要 ④ 汇总',490,200,{kind:'item',tone:'ok'})],focus:['p']},
  {say:'然后逐步执行：执行可以交给便宜的小模型甚至普通代码，第 ③ 步还能并行。遇到意外再重新规划。',add:[A('ex','⚙️','并行执行',490,290,{kind:'tag',tone:'ok'})],tone:{p:'ok'}},
  {say:'实际系统常把两者结合：高层先做计划，每一步内部用 ReAct 灵活处理。',memo:['ReAct：灵活但贵','先计划：清晰可控、可并行']},
 ]},
 'ai-q-multi-agent':{title:'多 Agent 协作：像一个小团队',beats:[
  {say:'写一份调研报告，可以组一个“AI 小团队”：一位组长，三位组员。',add:[A('lead','🧑‍✈️','组长（编排者）',320,70,{tone:'primary'}),A('s','🔍','搜索员',110,230),A('w','✍️','写作员',320,230),A('rv','🧐','审稿员',530,230)]},
  {say:'组长拆分任务，分派给擅长的组员。每个组员的提示词和工具更专一，还能同时开工。',send:[{from:'lead',to:'s',text:'找资料'},{from:'lead',to:'w',text:'写初稿'}]},
  {say:'组员之间只传“结论”，比如 5 条关键资料，而不是把自己的全部聊天记录甩过去。',send:[{from:'s',to:'w',text:'5 条要点',tone:'ok'}],note:'用结构化消息传递必要信息'},
  {say:'审稿员检查初稿，提出修改意见，写作员修改。',send:[{from:'w',to:'rv',text:'初稿'},{from:'rv',to:'w',text:'修改意见',tone:'warm'}]},
  {say:'常见问题：沟通成本高、token 成倍增加、互相等待甚至踢皮球、出错时不知道是谁的锅。',tone:{lead:'warm'},bubble:{who:'lead',text:'第 8 轮修改了……',tone:'bad'}},
  {say:'所以：先确认一个 Agent 加好工具够不够用；必须拆分时，给每个 Agent 和整个流程都设上限，并完整记录 trace。',tone:{lead:'ok'}},
  {say:'记住多 Agent 的要点。',memo:['分工专一、只传结论','设上限、留 trace，别为拆而拆']},
 ]},
 'ai-q-sandbox':{title:'沙箱：让模型写的代码在“隔离间”里运行',beats:[
  {say:'数据分析助手写了一段 Python 代码，要运行它才能得到结果。可这段代码是模型生成的，能直接在服务器上跑吗？',add:[A('m','🤖','模型',90,170,{tone:'primary'}),A('code','📜','模型写的代码',300,170,{kind:'item',tone:'warm'}),A('srv','🖥️','生产服务器',540,170,{kind:'item'})]},
  {say:'不行！代码可能写错（死循环吃光内存），也可能被提示注入诱导去删文件、偷密钥。',send:[{from:'code',to:'srv',text:'rm -rf ?',tone:'bad'}],tone:{srv:'bad'}},
  {say:'正确做法：放进“沙箱”——一个与外界隔离的小房间，比如容器或微虚拟机。',add:[A('box','🧪','沙箱',300,300,{tone:'ok'})],send:[{from:'code',to:'box',tone:'ok'}],tone:{srv:'base'}},
  {say:'房间里：默认断网；限制 CPU、内存和运行时间；不放任何密钥；只有临时文件夹可以写。',add:[A('r1','🚫','断网',110,300,{kind:'tag'}),A('r2','⏱️','限时限内存',520,300,{kind:'tag'})]},
  {say:'每次运行都用全新的房间，用完立即销毁；运行的代码和结果留档审计。',send:[{from:'box',to:'m',text:'运行结果',tone:'ok'}],tone:{box:'ok'}},
  {say:'原则：就算沙箱被攻破，攻击者也拿不到任何有价值的东西。',memo:['模型写的代码 = 不可信代码','隔离运行，用完即毁']},
 ]},
 'ai-q-design-code-assistant':{title:'设计 AI 编程助手：从理解代码到安全修改',beats:[
  {say:'开发者说：“帮我修复登录页的报错。”编程助手首先要弄清楚：相关代码在哪里？',add:[A('dev','🧑‍💻','开发者',90,170),A('as','🤖','编程助手',320,170,{tone:'primary'}),A('repo','📁','代码仓库',550,90,{kind:'item'})],send:[{from:'dev',to:'as',text:'修复登录报错'}]},
  {say:'它结合文件结构、函数调用关系、关键词和向量检索，找出相关文件；报错信息和当前打开的文件优先级最高。',send:[{from:'as',to:'repo',text:'检索相关代码'},{from:'repo',to:'as',text:'login.ts 等 3 个文件',tone:'ok'}]},
  {say:'它用工具一步步干活：读文件 → 修改 → 运行测试。',add:[A('test','🧪','运行测试',550,250,{kind:'item'})],send:[{from:'as',to:'test'}]},
  {say:'改动以“差异对比（diff）”展示给开发者确认，确认后才真正写入；命令在沙箱里执行。',send:[{from:'as',to:'dev',text:'diff：改了 3 行',tone:'warm'}],bubble:{who:'dev',text:'看起来没问题，确认'}},
  {say:'改完自动跑测试和代码检查，全部通过才算完成。',tone:{test:'ok',as:'ok'},sub:{test:'全部通过 ✓'}},
  {say:'体验和成本：补全用快的小模型，复杂修改用强模型；仓库上下文用提示缓存复用。用修复成功率和采纳率来评估。',add:[A('cost','⚖️','快模型补全 · 强模型改 bug',320,320,{kind:'tag',tone:'primary'})]},
  {say:'记住编程助手的骨架。',memo:['检索代码 → 修改 → 测试','diff 确认、沙箱执行']},
 ]},
};
