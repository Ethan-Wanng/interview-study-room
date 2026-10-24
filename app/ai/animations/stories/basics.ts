import {A,type Story} from '../story';

// 第 1 关「认识大模型」相关面试题的动画脚本。
export const basicsStories:Record<string,Story>={
 'ai-q-llm-what':{title:'大模型是怎么“写”出一句话的',beats:[
  {say:'小明在手机上问：“今天天气怎么样？”这句话被送到了大语言模型那里。',add:[A('u','👦','小明',90,170),A('m','🤖','大语言模型',330,170,{tone:'primary'})],send:[{from:'u',to:'m',text:'今天天气怎么样？'}]},
  {say:'模型读过海量的书和网页。它学会的不是一本“答案大全”，而是“什么词后面常跟什么词”的规律。',add:[A('books','📚','海量文本',330,60,{kind:'item'})],send:[{from:'books',to:'m',tone:'quiet'}],focus:['m']},
  {say:'它开始写回答。第一步，在所有可能的词里挑一个最合适的开头：“今天”。',add:[A('w1','🧩','今天',520,110,{kind:'tag',tone:'ok'})],bubble:{who:'m',text:'下一个词最可能是……\n“今天”！'},focus:['m']},
  {say:'接着，它带着“今天”再猜下一个词：“天气”。每次只往后写一个小片段，这个小片段叫 token。',add:[A('w2','🧩','天气',520,160,{kind:'tag',tone:'ok'})],bubble:{who:'m',text:'今天 → 天气'}},
  {say:'就这样一个接一个往下写：“晴朗”“，”“适合出门”……每写一个，都会把前面写好的内容重新读一遍再猜。',add:[A('w3','🧩','晴朗',520,210,{kind:'tag',tone:'ok'}),A('w4','🧩','适合出门',520,260,{kind:'tag',tone:'ok'})],note:'逐个预测下一个 token = 自回归生成'},
  {say:'一句完整的回答写好了，送回给小明。整个过程，模型其实一直在做同一件事：猜下一个词。',drop:['w1','w2','w3','w4'],send:[{from:'m',to:'u',text:'今天晴朗，适合出门',tone:'ok'}],tone:{u:'ok'}},
  {say:'注意：模型推理时参数是固定的。它不会因为和小明聊天而“学到”新东西，记住的只是这次对话里的内容。',add:[A('lock','🔒','参数不变',330,290,{kind:'tag',tone:'quiet'})],focus:['m']},
  {say:'记住这一点，后面的很多问题都能想通。',memo:['大模型 = 一直在猜下一个 token','对话、翻译、写代码都是“续写”']},
 ]},
 'ai-q-token-context':{title:'token 和上下文窗口：模型的“桌面”有多大',beats:[
  {say:'把模型想象成一个坐在书桌前干活的人。它一次能看到的东西，全都得摆在桌面上。',add:[A('m','🤖','模型',320,120,{tone:'primary'}),A('desk','🗄️','桌面：上下文窗口',320,240,{kind:'item',sub:'最多放 128K 个 token'})]},
  {say:'文字进来之前会被切成小块，叫 token。中文里一个字大约是一到两个 token，英文单词常被拆成几段。',add:[A('t1','🧩','你好',110,70,{kind:'tag'}),A('t2','🧩','世界',110,120,{kind:'tag'}),A('t3','🧩','hello',110,170,{kind:'tag'})],note:'计费、长度限制都按 token 算'},
  {say:'这次请求要放上桌的东西：系统提示、之前的聊天记录、查到的资料，以及用户的新问题。',add:[A('sys','📜','系统提示',520,50,{kind:'item'}),A('his','💬','聊天记录',520,115,{kind:'item'}),A('doc','📄','检索资料',520,190,{kind:'item'})],send:[{from:'sys',to:'desk'},{from:'his',to:'desk'},{from:'doc',to:'desk'}]},
  {say:'模型写出来的回答也要占桌面空间。输入和输出加起来，不能超过窗口上限。',bubble:{who:'m',text:'我写的回答\n也算在里面哦'},tone:{desk:'warm'},sub:{desk:'输入 + 输出 ≤ 上限'}},
  {say:'聊得太久，桌面满了！最早的内容要么被挤掉，要么请求直接报错。',tone:{desk:'bad',his:'bad'},sub:{his:'越来越长……'},focus:['desk']},
  {say:'解决办法：只保留最近几轮、把早期对话压缩成摘要、资料只放最相关的几段。',tone:{desk:'ok',his:'ok'},sub:{his:'摘要后变短',desk:'空间够用了'}},
  {say:'而且放上桌的每个 token 都要花钱，还会让回答变慢。所以桌面上只放真正需要的东西。',add:[A('money','💰','按 token 计费',320,320,{kind:'tag',tone:'warm'})]},
  {say:'一句话总结 token 和上下文窗口。',memo:['token：模型读写的最小单位','窗口：一次能摆上桌的总量']},
 ]},
 'ai-q-hallucination':{title:'幻觉：模型为什么会一本正经地胡说',beats:[
  {say:'小红问模型：“Python 里有没有 list.shuffle_all() 这个方法？”',add:[A('u','👧','小红',90,170),A('m','🤖','模型',330,170,{tone:'primary'})],send:[{from:'u',to:'m',text:'有 shuffle_all 吗？'}]},
  {say:'模型的本事是“写出看起来最通顺的话”，而不是“去查证真相”。',bubble:{who:'m',text:'这个名字听起来\n挺像真的……'},focus:['m']},
  {say:'它非常自信地回答：“有的，用法是 list.shuffle_all()。”可这个方法根本不存在！这就是幻觉。',send:[{from:'m',to:'u',text:'有！用法是…',tone:'bad'}],tone:{m:'bad'},note:'流畅 ≠ 正确'},
  {say:'为什么会这样？训练数据里没有、知识过时了，或者问题超出能力，它也不会说“我不知道”，而是照样往下编。',add:[A('gap','❓','知识空白',520,90,{kind:'item',tone:'warm'})]},
  {say:'解决办法一：RAG。先从可靠的文档里把相关资料查出来，放进提示词，让模型“看着资料回答”。',add:[A('doc','📄','官方文档',520,250,{kind:'item',tone:'ok'})],send:[{from:'doc',to:'m',text:'资料',tone:'ok'}],tone:{m:'primary'},drop:['gap']},
  {say:'办法二：在提示词里写明“找不到依据就说不知道，并标出引用”。办法三：关键事实交给程序去校验。',bubble:{who:'m',text:'资料里没有这个方法，\n可能你记错了。'},tone:{m:'ok'}},
  {say:'高风险场景（医疗、法律、金融），还要再加一道人工审核。',add:[A('rev','🧑‍⚖️','人工审核',90,300,{kind:'item'})]},
  {say:'记住幻觉的本质和对策。',memo:['幻觉：说得像真的，但不是真的','对策：给资料、要引用、允许不知道']},
 ]},
 'ai-q-tokenizer':{title:'分词器和 BPE：文字是怎么变成 token 的',beats:[
  {say:'模型不认识文字，只认识数字。分词器负责把文字切成小块（token），再给每块编一个号码。',add:[A('txt','📝','unbelievable',110,170,{kind:'item'}),A('tk','✂️','分词器',320,170,{tone:'primary'})],send:[{from:'txt',to:'tk'}]},
  {say:'BPE 算法先把所有文字拆成最小的字母或字节，然后数一数：哪两个相邻片段一起出现得最多？',add:[A('c1','🔤','u n b e l i e v a b l e',320,60,{kind:'tag'})],focus:['tk']},
  {say:'出现最多的一对就合并成一个新 token，比如“b”和“le”合成“ble”。合并一次，词表就多一个成员。',add:[A('m1','➕','b + le → ble',520,80,{kind:'tag',tone:'warm'})]},
  {say:'一遍遍重复合并，直到词表达到设定的大小，比如五万个 token。',add:[A('m2','➕','un · believ · able',520,140,{kind:'tag',tone:'ok'})],note:'常见词 = 1 个 token，罕见词 = 几个子词'},
  {say:'最后，“unbelievable”被切成 un、believ、able 三块，每块对应一个编号，送进模型。',add:[A('ids','🔢','[403, 21794, 481]',520,250,{kind:'item',tone:'primary'})],send:[{from:'tk',to:'ids',text:'编号'}],drop:['c1','m1']},
  {say:'好处：再生僻的词也能被拆开，永远不会遇到“不认识的词”，词表又不会太大。',tone:{ids:'ok'}},
  {say:'对开发的影响：不同模型的分词器不同，同一段话的 token 数可能差很多，估算费用要用对应模型的计数工具。',add:[A('cost','💰','token 数 → 费用',320,300,{kind:'tag',tone:'warm'})]},
  {say:'记住分词器做的事。',memo:['文字 → 子词 → 编号','高频片段合并成新 token']},
 ]},
 'ai-q-architectures':{title:'三种 Transformer：只会读、只会写、先读后写',beats:[
  {say:'Transformer 家族有三种结构。我们请出三位“员工”，看看它们各自擅长什么。',add:[A('enc','🧐','Encoder-only',110,150,{sub:'如 BERT'}),A('dec','✍️','Decoder-only',320,150,{sub:'如 GPT、Claude'}),A('ed','🔄','Encoder-Decoder',530,150,{sub:'如 T5'})]},
  {say:'Encoder-only 像一位“阅读理解高手”：读一句话时能同时看到前后所有的词，理解得很透。',focus:['enc'],add:[A('r1','📖','前后文一起看',110,270,{kind:'tag',tone:'primary'})],tone:{enc:'primary'}},
  {say:'它擅长分类、判断情感、生成 embedding 向量。RAG 里负责检索、重排的，常常就是它。',bubble:{who:'enc',text:'这句话是好评！'},tone:{enc:'ok'}},
  {say:'Decoder-only 像一位“作家”：只能看到已经写出来的内容，一个字一个字往后写。',focus:['dec'],add:[A('r2','➡️','只看前文，逐个续写',320,270,{kind:'tag',tone:'primary'})],tone:{dec:'primary'}},
  {say:'它结构简单、训练目标统一（预测下一个 token），规模越大越强，所以今天的通用大模型几乎都是它。',bubble:{who:'dec',text:'对话、写代码、\n翻译我都能续写'},tone:{dec:'ok'}},
  {say:'Encoder-Decoder 像一位“翻译官”：先完整读懂原文，再生成译文。适合翻译、摘要这种“输入→输出”的任务。',focus:['ed'],add:[A('r3','🔁','先读懂，再生成',530,270,{kind:'tag',tone:'primary'})],tone:{ed:'ok'}},
  {say:'记住三种结构的分工。',memo:['只读：理解、embedding','只写：通用大模型','先读后写：翻译、摘要']},
 ]},
};
