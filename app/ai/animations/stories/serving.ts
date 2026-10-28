import {A,type Story} from '../story';

// 第 13 关「部署与推理优化」相关面试题的动画脚本。
export const servingStories:Record<string,Story>={
 'ai-q-serving':{title:'推理优化：让模型“答得更快、服务更多人”',beats:[
  {say:'模型推理分两段：先一口气读完整个问题（prefill），再一个字一个字地写回答（decode）。',add:[A('in','📥','读题 prefill',110,120,{kind:'item'}),A('out','✍️','逐字写 decode',530,120,{kind:'item'}),A('gpu','🖥️','GPU',320,240,{tone:'primary'})],send:[{from:'in',to:'gpu'},{from:'gpu',to:'out'}]},
  {say:'优化一 KV 缓存：前面算过的结果存起来，写下一个字时不用重算前文。',add:[A('kv','📦','KV 缓存',320,90,{kind:'tag',tone:'ok'})]},
  {say:'优化二 连续批处理：把很多人的请求动态拼成一批，GPU 一刻也不闲着。',add:[A('u1','🧑','',90,300),A('u2','👩','',170,300)],send:[{from:'u1',to:'gpu',tone:'ok'},{from:'u2',to:'gpu',tone:'ok'}]},
  {say:'优化三 量化：把模型权重从 16 位压到 8 位或 4 位，显存减半甚至更少，速度通常也更快。',add:[A('q','🗜️','量化 INT8/INT4',530,300,{kind:'tag',tone:'ok'})]},
  {say:'优化四 投机解码：小模型先猜几个字，大模型一次检查，猜对的直接采用，省去很多步。',add:[A('spec','🐇','小模型先猜',530,200,{kind:'tag',tone:'warm'})]},
  {say:'vLLM、TensorRT-LLM 等推理框架已经把这些优化都集成好了。',tone:{gpu:'ok'}},
  {say:'记住推理优化的几招。',memo:['KV 缓存、连续批处理','量化、投机解码']},
 ]},
 'ai-q-quantization':{title:'量化：给模型“瘦身”',beats:[
  {say:'一个 70 亿参数的模型，每个参数用 16 位（2 字节）存储，光权重就要约 14 GB 显存。',add:[A('m','🐘','7B 模型 FP16',150,170,{tone:'warm'}),A('mem','💾','约 14 GB',150,300,{kind:'tag',tone:'warm'})]},
  {say:'量化就像把高清照片压缩：用更少的位数表示每个数字，比如 8 位或 4 位。',add:[A('zip','🗜️','量化',350,170,{tone:'primary'})],send:[{from:'m',to:'zip'}]},
  {say:'INT8：显存约减半，到 7 GB；INT4：约 3.5 GB，一张普通显卡就能跑。',add:[A('m8','🦊','INT8 约 7 GB',550,110,{kind:'item',tone:'ok'}),A('m4','🐭','INT4 约 3.5 GB',550,240,{kind:'item',tone:'ok'})],send:[{from:'zip',to:'m8',tone:'ok'},{from:'zip',to:'m4',tone:'ok'}]},
  {say:'代价：精度会有一点损失。INT8 影响很小；INT4 损失更明显，需要 GPTQ、AWQ 这类更好的量化方法来弥补。',sub:{m4:'可能略有失真'},tone:{m4:'warm'}},
  {say:'越小的模型、越依赖精确推理的任务（数学、代码），越要小心。',bubble:{who:'m4',text:'算数可能偶尔出错'}},
  {say:'所以上线前，一定要在自己的评测集上对比量化前后的效果。',memo:['位数更少 → 显存更省、更快','精度略降，上线前要评测']},
 ]},
 'ai-q-paged-attention':{title:'PagedAttention：显存像图书馆书架一样分格使用',beats:[
  {say:'每个请求生成时都要占用一块 KV 缓存，而且会越写越长。传统做法：按最长可能的长度，给每人预留一整排书架。',add:[A('shelf','🗄️','GPU 显存',320,170,{kind:'item'}),A('u1','🧑','请求 1',90,80),A('u2','👩','请求 2',90,260)]},
  {say:'结果大部分预留的格子都空着，还被切得零零碎碎。明明还有空间，却只能服务很少的人。',tone:{shelf:'bad'},sub:{shelf:'预留太多，大量浪费'}},
  {say:'PagedAttention 学操作系统的“分页”：把缓存切成固定大小的小格子，用多少拿多少。',tone:{shelf:'primary'},sub:{shelf:'按小格子分配'},add:[A('p1','🟦','页',530,80,{kind:'tag',tone:'primary'}),A('p2','🟦','页',530,140,{kind:'tag',tone:'primary'})]},
  {say:'格子不必挨在一起，用一张“目录表”记住每个请求用了哪些格子。',add:[A('tbl','📇','页表（目录）',530,260,{kind:'item',tone:'ok'})],send:[{from:'u1',to:'p1'},{from:'u2',to:'p2'}]},
  {say:'多个请求开头相同（比如同一份 system 提示），还能共享同一批格子。',add:[A('share','🤝','共享相同前缀',320,320,{kind:'tag',tone:'ok'})]},
  {say:'同样的显存能同时服务更多请求，配合连续批处理，吞吐量能提升好几倍。这就是 vLLM 快的主要原因。',tone:{shelf:'ok'},sub:{shelf:'几乎没有浪费'}},
  {say:'记住 PagedAttention。',memo:['KV 缓存分页、按需分配','同样显存，服务更多人']},
 ]},
 'ai-q-multimodal':{title:'多模态：模型是怎么“看”图片的',beats:[
  {say:'用户发来一张发票照片：“帮我看看总金额是多少？”',add:[A('u','🧑','用户',90,170),A('img','🧾','发票照片',290,80,{kind:'item'})],send:[{from:'u',to:'img'}]},
  {say:'视觉编码器把图片切成很多小方块，每块变成一个向量，就像把图片“翻译”成模型能读的 token。',add:[A('ve','👁️','视觉编码器',290,200,{tone:'primary'})],send:[{from:'img',to:'ve'}]},
  {say:'这些“图像 token”和文字 token 一起送进大模型，模型就能同时理解图片和问题。',add:[A('m','🤖','多模态大模型',520,200,{tone:'primary'})],send:[{from:'ve',to:'m',text:'图像 token'}]},
  {say:'模型读出了金额：“总金额 1,280 元。”',send:[{from:'m',to:'u',text:'总金额 1,280 元',tone:'ok'}],tone:{u:'ok'}},
  {say:'注意一：图片也按 token 计费，分辨率越高越贵，可以先压缩或裁剪。注意二：小字和复杂表格可能识别错，关键数字要校验。',add:[A('n1','💰','分辨率 ↑ 费用 ↑',520,320,{kind:'tag',tone:'warm'})]},
  {say:'注意三：图片里也可能藏着恶意指令；涉及人脸、证件时要格外注意隐私。',add:[A('n2','⚠️','图里也可能有注入',290,320,{kind:'tag',tone:'bad'})]},
  {say:'记住多模态的原理和注意点。',memo:['图片切块 → 图像 token','计费、校验、防注入']},
 ]},
};
