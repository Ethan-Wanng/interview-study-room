import {A,type Story} from '../story';

// 每周新增的 AI 面试题动画（一）：推理加速与模型结构。
export const addedStoriesA:Record<string,Story>={
 'ai-q-speculative-decoding':{title:'投机解码：徒弟先猜，师傅一次批改',beats:[
  {say:'大模型每写一个字，都要把几十 GB 的权重从显存完整读一遍。瓶颈在“搬数据”，GPU 的算力其实大量闲着。',add:[A('big','🧙','大模型（师傅）',470,110,{tone:'primary'}),A('mem','💾','每个字都读一遍权重',470,260,{kind:'tag',tone:'warm'})]},
  {say:'投机解码请来一个又小又快的草稿模型（徒弟），先一口气猜出后面 4 个字。',add:[A('small','🧑‍🎓','草稿模型（徒弟）',130,110,{tone:'warm'}),A('draft','📝','猜：今天 / 天气 / 很 / 热',230,230,{kind:'tag'})],send:[{from:'small',to:'draft',text:'连猜 4 个'}]},
  {say:'师傅只做一次前向计算，就能同时检查这 4 个位置——一次读权重，批改 4 个字。',send:[{from:'draft',to:'big',text:'一次并行验证'}],drop:['mem']},
  {say:'从左往右核对：前 3 个和师傅想的一致，直接采用；第 4 个不对，就换成师傅的答案，后面的猜测丢掉。',sub:{draft:'✓ ✓ ✓ ✗ → 换成“晴”'},tone:{draft:'ok'},bubble:{who:'big',text:'前三个对，\n第四个改成“晴”'}},
  {say:'配合拒绝采样规则，最终输出的分布和只用大模型完全一样，是无损加速。代码补全、格式化输出这类好猜的任务，常能快 2～3 倍。',add:[A('fast','⚡','可预测任务 2～3 倍',300,320,{kind:'tag',tone:'ok'})]},
  {say:'代价：草稿模型要占显存；高并发时 GPU 已被批处理占满，验证多余的字反而挤占吞吐，所以更适合低并发、追求单请求延迟的场景。',memo:['小模型先猜，大模型并行验证','结果无损，好猜的任务收益大']},
 ]},
 'ai-q-gqa':{title:'MHA、MQA、GQA：几个人共用一本笔记',beats:[
  {say:'注意力里每个“头”都要记下自己的 K、V 笔记（KV 缓存）。上下文越长、并发越多，这些笔记比模型本身还占显存。',add:[A('mem','💾','KV 缓存 = 2 × 层数 × KV 头数 × …',320,320,{kind:'tag',tone:'warm'})]},
  {say:'MHA（标准多头）：8 个 Query 头，每人一本自己的 K、V 笔记，一共 8 本。',add:[A('mha','📚','MHA：8 个头 · 8 本笔记',320,60,{kind:'item',tone:'bad'})]},
  {say:'MQA（多查询）：8 个头全部共用 1 本笔记。显存省到 1/8，但大家挤一本，表达能力下降，训练也可能不稳。',add:[A('mqa','📗','MQA：8 个头 · 1 本笔记',150,180,{kind:'item',tone:'warm'})]},
  {say:'GQA（分组查询）：折中方案，每 4 个头一组共用一本，一共 2 本。显存省到 1/4，效果接近 MHA。',add:[A('gqa','📘','GQA：8 个头 · 2 本笔记',490,180,{kind:'item',tone:'ok'})],focus:['gqa']},
  {say:'Llama 2 70B、Llama 3 等模型都用了 GQA。同样参数量，KV 头越少，一张卡能撑的并发和上下文越长。DeepSeek 的 MLA 更进一步，把 K、V 压缩成低维向量再缓存。',bubble:{who:'gqa',text:'按 KV 头数\n估算显存'}},
  {say:'记住三者区别。',memo:['MHA 每头一份，MQA 全共享','GQA 分组共享，省显存效果好']},
 ]},
 'ai-q-flash-attention':{title:'FlashAttention：在小工作台上分块干活',beats:[
  {say:'GPU 有两种存储：片上 SRAM 像手边的小工作台，很快但很小；显存 HBM 像远处的大仓库，很大但来回搬很慢。',add:[A('sram','🧰','SRAM 工作台（快 · 小）',170,90,{kind:'item',tone:'ok'}),A('hbm','🏬','HBM 仓库（大 · 慢）',470,90,{kind:'item',tone:'warm'})]},
  {say:'朴素的注意力：把 N×N 的完整分数矩阵写进仓库，再读回来做 softmax，再写回、再读出来乘 V。长序列下时间都花在搬运上。',add:[A('mat','🧱','N×N 分数矩阵',470,230,{kind:'tag',tone:'bad'})],send:[{from:'sram',to:'hbm',text:'写回',tone:'bad'},{from:'hbm',to:'sram',text:'再读',tone:'bad'}]},
  {say:'FlashAttention 分块：把 Q、K、V 切成小块，一块一块搬上工作台，在台面上算完分数、softmax 和乘 V。',drop:['mat'],add:[A('blk','🧩','一块 Q · K · V',170,230,{kind:'tag',tone:'primary'})],send:[{from:'hbm',to:'blk',text:'只读小块'}]},
  {say:'用“在线 softmax”记住每行的最大值和累加和，逐块合并结果，完整的 N×N 矩阵从不写回仓库；反向传播时宁可重算也不存。',sub:{blk:'在线 softmax 逐块合并'},tone:{hbm:'base'}},
  {say:'结果：访存大幅减少，显存从随长度平方增长变成线性，速度明显提升。它是精确计算，不是近似，结果和标准实现一致。',add:[A('ok','✅','精确，不是近似',320,320,{kind:'tag',tone:'ok'})]},
  {say:'别和 PagedAttention 混淆：Flash 优化单次注意力的访存，Paged 优化多请求的 KV 缓存分配，两者可以一起用。',memo:['分块放进 SRAM，少搬数据','精确计算；与 Paged 互补']},
 ]},
 'ai-q-model-routing':{title:'模型路由与级联：小病看门诊，大病转专家',beats:[
  {say:'线上大部分问题很简单，少数才需要最强的模型。全部用强模型，又贵又慢。',add:[A('q','👥','各种请求',90,170,{tone:'primary'})]},
  {say:'模型路由：调用前先分诊。规则（任务类型、长度、用户等级）、小分类模型或 embedding 判断难度，决定交给谁。',add:[A('r','🧭','路由器（分诊台）',300,170,{tone:'warm'}),A('s','🐣','小模型（门诊）',520,80),A('b','🧙','强模型（专家）',520,270)],send:[{from:'q',to:'r'},{from:'r',to:'s',text:'简单',tone:'ok'},{from:'r',to:'b',text:'复杂'}]},
  {say:'模型级联：先让小模型试，结果不达标再升级——结构化校验失败、置信度低、判别模型说不合格，或用户点了“重新生成”。',send:[{from:'s',to:'b',text:'不达标 → 升级',tone:'warm'}]},
  {say:'取舍：级联需要升级时要调用两次，延迟更长；路由只调一次，但依赖分诊准不准。',sub:{r:'路由器出错 → 默认走强模型'},bubble:{who:'r',text:'拿不准就转专家'}},
  {say:'必须用评测集对比“全用强模型”和“路由后”的质量与成本，线上监控各模型的流量占比、升级率和质量；模型更新后重新校准阈值。',add:[A('m','📊','质量 · 成本 · 升级率',300,320,{kind:'tag',tone:'ok'})]},
  {say:'记住两种设计。',memo:['路由：调用前选模型','级联：小模型不行再升级']},
 ]},
 'ai-q-rlvr-grpo':{title:'RLVR 与 GRPO：用答案对不对来训练',beats:[
  {say:'RLHF 的奖励来自“裁判模型”，裁判有偏差，学生可能学会讨好裁判而不是真的答对（奖励作弊）。',add:[A('judge','🧑‍⚖️','裁判模型（有偏差）',470,80,{kind:'item',tone:'warm'}),A('m','🧑‍🎓','模型（学生）',140,170,{tone:'primary'})],send:[{from:'m',to:'judge',text:'讨好？',tone:'warm'}]},
  {say:'RLVR：对能用程序检查的任务，直接用验证器打分——数学题对答案，代码跑单元测试，格式用规则检查。更客观，也更难钻空子。',drop:['judge'],add:[A('ver','✅','验证器：对答案 · 跑测试',470,80,{kind:'item',tone:'ok'})],send:[{from:'m',to:'ver',text:'提交答案'}]},
  {say:'PPO 还需要一个和模型差不多大的“价值模型”来估计每个回答好多少，显存和工程成本都高。',add:[A('critic','🐘','价值模型（很大）',470,260,{kind:'item',tone:'bad'})]},
  {say:'GRPO 去掉了价值模型：同一道题让模型答一组，比如 8 个回答，每个回答的分数减去这组的平均分，高于平均的就多学。',drop:['critic'],add:[A('grp','👥','同题 8 个回答：比组内平均',470,260,{kind:'item',tone:'ok'})],send:[{from:'ver',to:'grp',text:'逐个打分'},{from:'grp',to:'m',text:'优于平均就强化',tone:'ok'}]},
  {say:'再用 KL 惩罚，别让模型偏离原来太远。DeepSeek-R1 这类推理模型就是这样训练的。',tone:{m:'ok'},bubble:{who:'m',text:'对的思路多学一点'}},
  {say:'要点：验证器要可靠（测试太弱会学会“专门过测试”）；全对或全错的组没有学习信号。',memo:['RLVR：程序验证给奖励','GRPO：组内比较，不要价值模型']},
 ]},
};
