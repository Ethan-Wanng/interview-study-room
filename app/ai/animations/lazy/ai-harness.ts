import {A} from '../story';
import type {LazyEpisode} from './engine';

// AI 懒人模式：第 13 关 Harness 工程与 Skills（AGENTS.md 分层、Hooks 门禁、ACI 设计、渐进式 Skill、Worktree、A2A、记忆投毒与模型升级减法）。
export const aiLazyHarness:LazyEpisode={id:'lazy-ai-harness',subject:'ai',tier:2,levels:['harness'],icon:'🎛️',title:'给小智装上控制台：Harness 与 Skills',summary:'同一个大脑，换一套控制台成功率就能翻倍：讲透 AGENTS.md、生命周期 Hooks、ACI 人机工效、渐进式 Skill、Worktree 隔离与 A2A 协作。',beats:[
 {say:'过了期末考，小智已经能独立调研、改代码和做总结了。可阿美发现一个怪现象：公司给两个团队配了同一个大模型，甲团队的编程助手只成功四成，乙团队却能稳定交付八成以上。',add:[A('amy','👩‍💼','阿美',110,170,{tone:'primary'}),A('zhi','🤖','小智',510,170,{tone:'warm'})]},
 {say:'阿美跑去乙团队取经，才发现秘密不在小智的大脑，而在包在大脑外面的那套控制面。乙团队管它叫 Harness，驾驭工程。如果说模型是概率性的思考大脑，Harness 就是一套确定性的控制台。',add:[A('har','🎛️','Harness：确定性控制台',310,65,{kind:'item',tone:'ok'})],send:[{from:'har',to:'zhi',text:'控制与兜底'}]},
 {say:'以前阿美把所有要求都写进提示词，像口头叮嘱实习生：改完代码记得跑测试，别删核心文件。可小智一忙起来，桌上资料一多，转身就把叮嘱忘了。Harness 的原则是：不靠祈祷模型听话，能用代码强制检查的，绝不只写在提示词里。',bubble:{who:'amy',text:'能写进门禁的，\n别只靠口头叮嘱'}},
 {say:'控制台的第一层是项目规矩的分层注入。团队在仓库根目录放一份 AGENTS.md，只写最核心的构建命令、测试命令和禁止踩的红线，尽量简短。再按目录路径配局部规则，只有当小智去改数据库或前端目录时，才临时把那部分的规矩递上书桌。',drop:['har'],add:[A('ag','📜','AGENTS.md 分层规范',310,65,{kind:'item',tone:'primary'})]},
 {say:'第二层是生命周期 Hooks，也就是在关键节点焊死的三道门禁。工具调用前叫 PreToolUse：先看路径有没有跑出工作区、命令是不是高危删除，不合规直接拦下，根本轮不到执行。',drop:['ag'],add:[A('h1','🛡️','PreToolUse：先审再跑',310,65,{kind:'tag',tone:'primary'})]},
 {say:'工具调用后叫 PostToolUse：小智刚改完一个文件，程序自动帮他跑格式化、代码检查和相关单测，把结果立刻放回上下文。最厉害的是最后一道叫 Stop Gate，完成门禁。',add:[A('h2','🔧','PostToolUse：改完自检',310,175,{kind:'tag',tone:'ok'})]},
 {say:'以前小智改完一行代码就自信地举手说“修好了”。现在只要他想结束回合，Stop Gate 立刻强制跑一遍测试。一旦发现边界用例没过，门禁直接打回，把报错喂回给小智，逼着他修对为止。',add:[A('h3','🚦','Stop Gate：不过不放行',310,290,{kind:'tag',tone:'bad'})],tone:{zhi:'bad'},bubble:{who:'zhi',text:'漏了边界用例，\n马上回去修'}},
 {say:'修对了之后测试全绿，Stop Gate 才放行。除了门禁，乙团队还精心打磨了 ACI，也就是专门给模型用的工作台界面。',tone:{zhi:'ok',h3:'ok'},drop:['h1','h2','h3']},
 {say:'比如以前让小智改三行代码，他却重写整份一千行的文件，一不小心就把末尾两百行写丢了。改用局部 diff 替换工具后，只输出改动的几行，又快又不容易误删。测试如果吐出三万行日志，程序只截出头尾摘要，完整日志存成临时文件并附上路径，让小智按需用 grep 查。',add:[A('aci','✂️','ACI：局部 Diff · 日志落盘',310,65,{kind:'item',tone:'ok'})]},
 {say:'报错信息也改成了“自愈式”的：不再冷冰冰地扔一个找不到片段，而是提示“请先读取第 40 到 80 行确认上下文”。小智的返工率一下降了一半。',sub:{aci:'自愈报错 · CLI 组合'}},
 {say:'接着阿美又学到了 Agent Skill。团队有四十多套专业流程，比如发版检查、数据库迁移、周报汇总。如果全塞进系统提示，每次聊天都要白烧几万 token，小智还会把不同流程的规则混在一起。',drop:['aci'],add:[A('sk','🧩','Agent Skill 技能包',310,65,{kind:'item',tone:'primary'})]},
 {say:'Skill 把每个专业工作法打包成一个目录：SKILL.md 写清楚步骤和坑，scripts 放确定性脚本，references 放参考资料。启动时上下文里只放每个技能几十个 token 的名字和一句话介绍，这叫渐进式披露的第一层。',add:[A('l1','🏷️','① 轻索引常驻',310,175,{kind:'tag'})]},
 {say:'只有当任务真正命中时，小智才读完整的 SKILL.md，需要时再去翻参考文档或者在沙箱里跑 scripts 脚本。这样既挂载了几十上百个技能而不爆书桌，常驻前缀还一字不变，提示缓存照样命中。',add:[A('l2','📖','② 按需展开 ③ 沙箱跑脚本',310,290,{kind:'tag',tone:'ok'})]},
 {say:'阿美顺手把四件套的分工理清了：System Prompt 只守核心安全底线；MCP 负责把外部工具和数据源接进来；Skill 负责按需注入专业流程和脚本；Subagent 负责用独立书桌去翻几十个文件或并行调研，只带回精炼结论。',drop:['l1','l2','sk'],add:[A('four','🧭','Prompt · MCP · Skill · Subagent',310,65,{kind:'item',tone:'primary'})]},
 {say:'遇到看代码仓库的任务，乙团队也不单靠向量检索，因为向量对精确函数名、调用链不敏感，代码一改索引还过时。他们先用文件树和语法分析抽出 Repo Map 骨架，再用 ripgrep 精确搜符号，按行切片读代码；改之前先写 Spec 对齐边界，改完交出 diff 让人审查。',drop:['four'],add:[A('code','🗺️','Repo Map + ripgrep + Spec',310,65,{kind:'item',tone:'ok'})]},
 {say:'如果任务要跑一两个小时，还会把进度和清单写进外部 progress 文件，就算重启会话也能接着干。三个子 Agent 同时改同一个代码仓库怎么办？给每个任务开一个独立的 git worktree 和分支，各自改完跑通测试再审查合并，绝不互相覆盖。',drop:['code'],add:[A('wt','🌿','Worktree 隔离 + 进度文件',310,65,{kind:'item',tone:'primary'})]},
 {say:'要是发布流程需要等主管审批两小时呢？工作流在审批点保存 Checkpoint 后挂起释放资源，收到同意回调再按幂等键从断点恢复。不同部门的 Agent 要联手，就通过 A2A 协议互换 Agent Card 发现能力、委派长任务，和纵向连工具的 MCP 刚好互补。',drop:['wt'],add:[A('a2a','🤝','Checkpoint 恢复 + A2A 协作',310,65,{kind:'item',tone:'ok'})]},
 {say:'最后老张也补了一句安全提醒：长期记忆如果允许邮件或网页里的恶意指令直接写进去，就成了持久型后门，叫记忆投毒；第三方 Skill 的指令和脚本同样要审核、锁版本、进沙箱。另外，随着新一代模型变强，每隔几个月要拿评测集做对照，把迁就旧模型的冗余拐杖拆掉，只留真正兜底的门禁。',drop:['a2a'],add:[A('safe','🔒','防记忆投毒 · 模型升级做减法',310,290,{kind:'tag',tone:'warm'})],tone:{zhi:'ok'}},
 {say:'这一集的要点。',drop:['safe'],memo:['Model 管推理，Harness 用分层规则与 Hooks 兜底','Skill 渐进式披露，ACI 局部编辑加截断回指','Worktree 隔离并发，防记忆投毒，随强模型做减法']},
]};
