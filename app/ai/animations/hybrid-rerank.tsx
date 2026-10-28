import {Arrow,Box,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 进阶检索：向量 + BM25 两路召回，RRF 融合，重排取前 3。
const vec=['D3 报错排查','D1 常见错误','D7 网络超时'];
const bm=['D1 常见错误','D9 E1042 说明','D3 报错排查'];
const fused=['D1 常见错误','D3 报错排查','D9 E1042 说明','D7 网络超时'];
const final=['D9 E1042 说明','D1 常见错误','D3 报错排查'];

function Visual({step}:{step:number}){
 if(step>=5)return <g><Defs/><Memo lines={['召回求全，重排求准','两路检索，取长补短']}/></g>;
 return <g><Defs/>
  <Chip x={210} y={18} text="问题：E1042 错误怎么处理？" tone="warm" mode="pop"/>
  <Arrow d="M260 54 C200 70 140 80 120 96" flow={step===0} tone="primary"/>
  <Arrow d="M380 54 C440 70 500 80 520 96" flow={step===0} tone="primary"/>
  <Box x={40} y={100} w={160} h={40} title="向量检索（语义）" tone={step===1?'primary':'base'}/>
  <Box x={440} y={100} w={160} h={40} title="BM25（关键词）" tone={step===1?'primary':'base'}/>
  {step>=1&&vec.map((t,i)=><Chip key={'v'+t} x={40} y={150+i*38} text={`${i+1}. ${t}`} tone={step>=2&&fused.indexOf(t)<2?'ok':'base'} delay={step===1?i*150:0}/>)}
  {step>=1&&bm.map((t,i)=><Chip key={'b'+t} x={440} y={150+i*38} text={`${i+1}. ${t}`} tone={step>=2&&fused.indexOf(t)<2?'ok':'base'} delay={step===1?i*150:0}/>)}
  {step===2&&<g><Arrow d="M200 200 L248 200" tone="ok" flow/><Arrow d="M440 200 L392 200" tone="ok" flow/><Label x={252} y={152}>RRF 融合排名</Label>{fused.map((t,i)=><Chip key={'f'+t} x={252} y={162+i*38} text={`${i+1}. ${t}`} tone={i<2?'ok':'base'} mode="pop" delay={i*180}/>)}</g>}
  {step>=3&&<g><Box x={240} y={150} w={160} h={44} title="重排模型" sub="逐条细看问题和片段" tone="primary" active={step===3}/>
   {final.map((t,i)=><Chip key={'r'+t} x={252} y={208+i*38} text={`${i+1}. ${t}`} tone={i===0?'ok':'base'} mode="pop" delay={400+i*200}/>)}</g>}
  {step===4&&<Enter x={20} y={330} delay={200}><text className="an-t small">只有这 3 条进入提示词：E1042 的专门说明排到了第一</text></Enter>}
 </g>}

export const hybridRerank:Animation={id:'hybrid-rerank',icon:'🎯',title:'混合检索 + 重排：找得全又找得准',summary:'向量和关键词两路召回，RRF 融合排名，重排模型精挑前三。',level:'rag-advanced',kind:'advanced',Visual,scenes:[
 {caption:'用户问“E1042 错误怎么处理？”这个问题同时交给两路检索。',ms:3600},
 {caption:'向量检索按意思找相似内容；BM25 按关键词精确匹配，正好能抓住“E1042”这个错误码。',ms:4600},
 {caption:'RRF 按名次融合两路结果：在两边都排得靠前的文档，综合排名最高。',ms:4400},
 {caption:'重排模型把问题和每个候选片段放在一起细看，重新打分，只留下最相关的 3 条。',ms:4400},
 {caption:'最终进入提示词的 3 条里，专门讲 E1042 的文档排在第一——这就是“召回求全、重排求准”。',ms:4600},
 {caption:'两路检索取长补短，再用重排把关。',ms:3200,speech:'两路检索取长补短，再用重排把关。召回求全，重排求准；两路检索，取长补短。'},
]};
