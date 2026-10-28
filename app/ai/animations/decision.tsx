import {Arrow,Box,Defs,Enter,Memo} from './kit';
import type {Animation} from './types';

// 取舍与判断：提示词、RAG 还是微调？
function Visual({step}:{step:number}){
 if(step>=5)return <g><Defs/><Memo lines={['先提示，再 RAG，最后微调','三者也能组合使用']}/></g>;
 const lit=(k:string)=>({q1:step>=0,q2:step>=1,rag:step===2,ft:step===3,prompt:step===4})[k];
 return <g><Defs/>
  <Box x={220} y={20} w={200} h={52} title="效果不好，先问：" sub="改提示词能解决吗？" tone={lit('q1')?'primary':'base'} active={step===0}/>
  <Arrow d="M420 46 C500 46 520 60 520 92" tone={step===4?'ok':'quiet'} flow={step===4}/>
  <Enter x={530} y={70}><text className="an-q">能</text></Enter>
  <Box x={460} y={96} w={160} h={52} title="提示工程" sub="成本最低、迭代最快" tone={lit('prompt')?'ok':'base'} active={step===4}/>
  <Arrow d="M320 72 L320 116" tone={step>=1&&step<=3?'primary':'quiet'} flow={step===1}/>
  <Enter x={332} y={100}><text className="an-q">不能</text></Enter>
  <Box x={200} y={120} w={240} h={52} title="问题出在哪里？" sub="缺知识，还是行为不稳定？" tone={lit('q2')&&step<=3?'primary':'base'} active={step===1}/>
  <Arrow d="M240 172 C200 200 150 210 130 236" tone={step===2?'ok':'quiet'} flow={step===2}/>
  <Arrow d="M400 172 C440 200 490 210 510 236" tone={step===3?'ok':'quiet'} flow={step===3}/>
  <Box x={40} y={240} w={180} h={64} title="RAG" sub="私有、常更新、要出处" tone={lit('rag')?'ok':'base'} active={step===2}/>
  <Box x={420} y={240} w={180} h={64} title="微调" sub="固定格式语气，有好数据" tone={lit('ft')?'ok':'base'} active={step===3}/>
  {step===2&&<Enter x={40} y={326} delay={300}><text className="an-t small">例：公司内部知识库，每周更新 → RAG</text></Enter>}
  {step===3&&<Enter x={380} y={326} delay={300}><text className="an-t small">例：客服统一话术，有几千条样本 → 微调</text></Enter>}
 </g>}

export const decision:Animation={id:'decision',icon:'🔀',title:'提示词、RAG 还是微调？',summary:'一张决策图：先改提示，缺知识用 RAG，行为不稳再微调。',level:'tradeoffs',kind:'basic',Visual,scenes:[
 {caption:'效果不好时，第一个问题永远是：改提示词能不能解决？它成本最低、几分钟就能验证。',ms:4200},
 {caption:'如果不能，就要判断问题出在哪：是模型缺少知识，还是行为、格式、风格不稳定？',ms:4400},
 {caption:'缺知识，尤其是私有、经常更新、需要标注出处的知识，选 RAG：更新文档就生效。',ms:4600},
 {caption:'行为不稳定，比如必须固定格式和语气，而且积累了足够多的高质量样本，才考虑微调。',ms:4600},
 {caption:'很多问题其实改提示词就够了：写清楚任务、格式，再加几个示例。',ms:4000},
 {caption:'实际系统常常三者组合：提示词约束输出，RAG 提供知识，微调固化风格。',ms:4000,speech:'实际系统常常三者组合：提示词约束输出，RAG 提供知识，微调固化风格。先提示，再 RAG，最后微调；三者也能组合使用。'},
]};
