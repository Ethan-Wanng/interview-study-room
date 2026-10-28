import {Arrow,Box,Chip,Defs,Enter,Memo} from './kit';
import type {Animation} from './types';

// 工程化：结构化输出 → Schema 校验 → 带错误重试 → 兜底。
function Visual({step}:{step:number}){
 if(step>=4)return <g><Defs/><Memo lines={['约束 + 校验 + 重试 + 兜底','模型的输出永远要校验']}/></g>;
 const ok=step>=3;
 return <g><Defs/>
  <Box x={20} y={30} w={130} h={64} title="大模型" sub="按 Schema 输出" tone="primary" active={step===0||step===2}/>
  <Box x={255} y={30} w={130} h={64} title="Schema 校验" sub="zod / pydantic" tone={step===1?'bad':ok?'ok':'base'} active={step===1||ok}/>
  <Box x={490} y={30} w={130} h={64} title="你的程序" sub="放心使用结果" tone={ok?'ok':'quiet'}/>
  <Arrow d="M150 62 L249 62" flow={step!==2} tone={step===1?'bad':'primary'}/>
  <Arrow d="M385 62 L484 62" flow={ok} tone={ok?'ok':'quiet'}/>
  <Enter x={20} y={120}><rect className="an-panel" width={340} height={130} rx={12}/><text className="an-q" x={14} y={22}>{step<=1?'第 1 次输出':'第 2 次输出'}</text>
   <text className="an-t small" x={14} y={50}>{'{ "sentiment": "positive",'}</text>
   <text className="an-t small" x={14} y={76} fill={step===1?'var(--alert-ink)':undefined}>{step<=1?'  ……（漏了 reasons 字段）':'  "reasons": ["物流快", "包装好"] }'}</text>
  </Enter>
  {step===1&&<Chip x={380} y={140} text="✗ 缺少必填字段 reasons" tone="bad" mode="pop"/>}
  {step===2&&<g><Arrow d="M320 100 C300 110 200 110 150 96" tone="warm" flow/><Chip x={380} y={140} text="把错误信息发回模型，要求修正" tone="warm" mode="pop"/></g>}
  {ok&&<Chip x={380} y={140} text="✓ 校验通过" tone="ok" mode="pop"/>}
  {ok&&<Enter x={20} y={280} delay={500}><text className="an-t small">再失败一次？走兜底：默认值、转人工或友好提示，并记录日志</text></Enter>}
 </g>}

export const schemaRetry:Animation={id:'schema-retry',icon:'🧾',title:'结构化输出：校验不过就重试',summary:'让模型按 Schema 输出 JSON，代码校验，失败带着错误重试。',level:'engineering',kind:'basic',Visual,scenes:[
 {caption:'程序要可靠地用上模型结果，就让它按 JSON Schema 输出：情感 sentiment 加原因 reasons。',ms:4200},
 {caption:'第一次输出漏掉了 reasons 字段，代码里的 Schema 校验立刻拦住了它，不让坏数据流进程序。',ms:4600},
 {caption:'把校验错误发回模型：“缺少 reasons 字段”，让它照着错误信息修正。',ms:4000},
 {caption:'第二次校验通过，程序放心使用。还失败的话，走兜底逻辑并记录日志。',ms:4400},
 {caption:'记住：模型的输出永远要校验。',ms:3200,speech:'记住：模型的输出永远要校验。约束 + 校验 + 重试 + 兜底；模型的输出永远要校验。'},
]};
