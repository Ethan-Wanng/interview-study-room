import {A,type Story} from '../story';

// 第 14 关「微调实战」相关面试题的动画脚本。
export const finetuneStories:Record<string,Story>={
 'ai-q-lora':{title:'LoRA：不动原书，只贴便签',beats:[
  {say:'大模型就像一本几千页的百科全书。全量微调等于把整本书逐页重写，又贵又慢，还要多存一整本。',add:[A('book','📕','原模型（百科全书）',200,170,{kind:'item',tone:'warm'})]},
  {say:'LoRA 的做法：原书一个字都不改，先锁起来。',add:[A('lock','🔒','冻结',200,280,{kind:'tag',tone:'quiet'})],tone:{book:'quiet'}},
  {say:'旁边贴一组小便签，也就是两个很小的矩阵 B 和 A。训练时只改便签上的内容。',add:[A('note','🗒️','便签 B·A',460,170,{kind:'item',tone:'primary'})],focus:['note']},
  {say:'便签有多小？可训练参数通常不到原模型的 1%，一张普通显卡就能训练。',add:[A('pct','📏','< 1% 参数',460,280,{kind:'tag',tone:'ok'})]},
  {say:'用的时候，原书内容 + 便签内容 = 新知识：h = W·x + B·A·x。也可以把便签直接合并进原书，不增加任何延迟。',send:[{from:'note',to:'book',text:'合并',tone:'ok'}],note:'h = W·x + B·A·x'},
  {say:'一本原书还能配好几套便签：客服版、写作版、代码版，按任务切换。QLoRA 再把原书压缩到 4 位，显存更省。',add:[A('n2','🗒️','写作便签',590,90,{kind:'tag'}),A('n3','🗒️','代码便签',590,250,{kind:'tag'})]},
  {say:'记住 LoRA 的比喻。',memo:['原模型冻结，只训练小矩阵','参数少、可合并、可切换']},
 ]},
 'ai-q-ft-data':{title:'微调数据：质量比数量重要',beats:[
  {say:'要微调一个客服模型，团队搬来了十万条聊天记录。先别急着用！',add:[A('raw','📦','10 万条原始记录',110,170,{kind:'item',tone:'warm'}),A('clean','🧹','清洗',320,170,{tone:'primary'})]},
  {say:'里面有重复的、答错的、语气不一致的，还有用户的手机号和地址。模型会把这些统统学会。',add:[A('bad','⚠️','重复 · 错误 · 隐私',110,290,{kind:'tag',tone:'bad'})]},
  {say:'清洗：去重、改正错误、统一风格、删掉隐私信息。最后留下 2000 条高质量样本。',send:[{from:'raw',to:'clean'}],add:[A('good','✨','2000 条精品',540,170,{kind:'item',tone:'ok'})],drop:['bad']},
  {say:'格式和线上调用保持一致：system 提示 + 用户问题 + 期望回答。',send:[{from:'clean',to:'good',tone:'ok'}],add:[A('fmt','🧾','对话格式',540,60,{kind:'tag',tone:'primary'})]},
  {say:'拆成三份：训练集用来学；验证集观察是否过拟合；测试集最后考试，训练时一眼都不能看。',add:[A('tr','📗','训练集',370,300,{kind:'tag'}),A('va','📙','验证集',480,300,{kind:'tag'}),A('te','📕','测试集',585,300,{kind:'tag',tone:'warm'})]},
  {say:'判断有没有效：在测试集上和“基础模型 + 好提示词”对比，同时检查通用能力有没有变差。',tone:{good:'ok'}},
  {say:'记住准备数据的原则。',memo:['干净、一致、贴近真实','训练、验证、测试分开']},
 ]},
 'ai-q-ft-methods':{title:'四种微调方法：重新装修还是换软装',beats:[
  {say:'把调整模型比作装修房子，有四种方案，花费和效果都不同。',add:[A('house','🏠','原模型',320,170,{tone:'primary'})]},
  {say:'全量微调 = 推倒重新装修：所有参数都改，效果上限最高，但要很多显卡，每个任务都要存一整套。',add:[A('full','🏗️','全量微调',110,70,{kind:'item',tone:'warm'})],sub:{full:'贵、显存需求大'}},
  {say:'LoRA = 只换软装：房子结构不动，加几件家具（小矩阵），花费少，效果接近全量。',add:[A('lora','🛋️','LoRA',530,70,{kind:'item',tone:'ok'})],sub:{lora:'参数 < 1%'}},
  {say:'QLoRA = 先把房子压缩打包（4 位量化），再换软装。一张普通显卡就能搞定。',add:[A('qlora','📦','QLoRA',530,280,{kind:'item',tone:'ok'})],sub:{qlora:'单卡可训'}},
  {say:'Prompt Tuning = 只在门口挂个牌子：训练一小段“软提示”，参数最少，但效果通常不如 LoRA。',add:[A('pt','🪧','Prompt Tuning',110,280,{kind:'item'})],sub:{pt:'参数最少'}},
  {say:'大多数业务首选 LoRA 或 QLoRA；数据多、预算足、需要深度改变能力时才考虑全量微调。',focus:['lora','qlora']},
  {say:'记住四种方案。',memo:['全量：效果最强也最贵','LoRA / QLoRA：首选']},
 ]},
 'ai-q-rlhf-dpo':{title:'RLHF 与 DPO：教模型说“人爱听”的话',beats:[
  {say:'同一个问题，模型给出两个回答。人类标注员选出更好的那个，这就是“偏好数据”。',add:[A('h','🧑','标注员',320,60),A('a','👍','回答 A（更好）',150,170,{kind:'item',tone:'ok'}),A('b','👎','回答 B',490,170,{kind:'item',tone:'bad'})]},
  {say:'RLHF 第一步：用大量偏好数据，训练一个“裁判模型”，学会给回答打分。',add:[A('rm','🧑‍⚖️','裁判（奖励模型）',150,300,{kind:'item',tone:'primary'})],send:[{from:'a',to:'rm'},{from:'b',to:'rm'}]},
  {say:'第二步：让模型不断写回答，裁判打分，用强化学习让它写出高分回答，同时别偏离原来太远。',add:[A('m','🤖','语言模型',490,300,{tone:'primary'})],send:[{from:'m',to:'rm',text:'回答'},{from:'rm',to:'m',text:'打分',tone:'warm'}]},
  {say:'RLHF 灵活强大，但要多训一个裁判、调强化学习，工程复杂、不太稳定。',tone:{rm:'warm'}},
  {say:'DPO 更直接：不要裁判，直接告诉模型“A 比 B 好”，用一个简单的损失函数让它更偏向 A。',drop:['rm'],send:[{from:'a',to:'m',text:'多学 A',tone:'ok'},{from:'b',to:'m',text:'少学 B',tone:'bad'}],tone:{m:'ok'}},
  {say:'DPO 简单、稳定、省资源，所以用得很广；RLHF 更灵活，适合需要在线生成新数据、组合多种奖励的场景。',memo:['RLHF：先训裁判，再强化学习','DPO：直接用偏好对训练']},
 ]},
 'ai-q-distillation':{title:'知识蒸馏：名师带徒弟',beats:[
  {say:'公司每天要给 10 万张工单分类。用最强的大模型效果好，但太贵太慢了。',add:[A('big','🧙','大模型（名师）',150,120,{tone:'primary'}),A('cost','💸','每天花费很高',150,280,{kind:'tag',tone:'bad'})]},
  {say:'办法：请名师先做几千道示范题，把每张工单的标准答案写出来。',add:[A('ex','📚','示范答案 5000 条',380,120,{kind:'item'})],send:[{from:'big',to:'ex',text:'写示范'}]},
  {say:'人工抽查修正示范题，然后用它们训练一个小模型（徒弟）。',add:[A('small','🧑‍🎓','小模型（徒弟）',560,240,{tone:'warm'})],send:[{from:'ex',to:'small',text:'跟着学'}]},
  {say:'在工单分类这件事上，徒弟学得八九不离十，成本和延迟却降了一个数量级。',tone:{small:'ok',cost:'ok'},sub:{cost:'成本大幅下降'}},
  {say:'注意：要遵守模型服务商关于“用它的输出训练其他模型”的条款，并用评测集确认徒弟达标。',add:[A('rule','📜','遵守服务条款',380,300,{kind:'tag',tone:'warm'})]},
  {say:'记住蒸馏。',memo:['大模型示范，小模型学习','窄任务上又快又便宜']},
 ]},
};
