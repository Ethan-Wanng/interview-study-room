import {Arrow,Box,Chip,Defs,Enter,Memo} from './kit';
import type {Animation} from './types';

// 评测与可观测性：评测集 → 对比新旧版本 → 灰度上线 → trace 发现坏案例 → 补回评测集。
const nodes=[{x:250,y:20,t:'评测集',s:'真实问题 + 期望结果'},{x:470,y:130,t:'离线对比',s:'新旧版本逐题比较'},{x:250,y:250,t:'灰度上线',s:'A/B 看线上指标'},{x:30,y:130,t:'线上 trace',s:'记录每一步调用'}];
const arrows=['M392 54 C460 70 520 90 540 124','M540 184 C520 240 460 266 392 276','M248 276 C180 266 120 240 100 184','M100 124 C120 90 180 70 248 54'];

function Visual({step}:{step:number}){
 if(step>=5)return <g><Defs/><Memo lines={['先有评测，再做优化','坏案例补回评测集']}/></g>;
 return <g><Defs/>
  {nodes.map((n,i)=><Box key={n.t} x={n.x} y={n.y} w={140} h={60} title={n.t} sub={n.s} tone={step===i||(step===4&&i===0)?'primary':'base'} active={step===i||(step===4&&i===0)}/>)}
  {arrows.map((d,i)=><Arrow key={i} d={d} tone={step===i+1||(step===4&&i===3)?'primary':'quiet'} flow={step===i+1||(step===4&&i===3)}/>)}
  {step===1&&<g><Chip x={280} y={110} text="修好 12 题" tone="ok" mode="pop"/><Chip x={280} y={152} text="弄坏 3 题（回归）" tone="bad" mode="pop" delay={400}/></g>}
  {step===2&&<g><Chip x={262} y={110} text="点踩率 ↓  转人工率 ↓" tone="ok" mode="pop"/><Chip x={262} y={152} text="P95 延迟、单次成本" mode="pop" delay={300}/></g>}
  {step===3&&<Chip x={250} y={130} text="trace 发现：检索没找到资料" tone="warm" mode="pop"/>}
  {step===4&&<Enter x={250} y={130} from={[100,154]}><rect className="an-box warm" width={150} height={44} rx={12}/><text className="an-t small" x={75} y={22} textAnchor="middle" dominantBaseline="central">坏案例 → 评测集</text></Enter>}
 </g>}

export const evalLoop:Animation={id:'eval-loop',icon:'📈',title:'评测闭环：让 AI 应用越改越好',summary:'评测集、离线对比、灰度上线、trace 排查，坏案例再补回评测集。',level:'evals',kind:'basic',Visual,scenes:[
 {caption:'一切从评测集开始：收集真实用户问题和期望结果，包括边界情况和历史上的坏案例。',ms:4200},
 {caption:'每次改提示词或换模型，都用同一个评测集对比新旧版本：不只看总分，还要看哪些题被“弄坏”了。',ms:4800},
 {caption:'通过离线评测后小流量灰度上线，用 A/B 测试对比点踩率、转人工率、延迟和成本。',ms:4600},
 {caption:'线上用 trace 记录每一步调用，出了问题能快速定位：是检索没找到，还是模型答错了。',ms:4400},
 {caption:'修好的坏案例补回评测集，下一轮改动时自动检查它，同样的问题不会再犯。',ms:4400},
 {caption:'评测之于 AI 应用，就像单元测试之于普通软件。',ms:3400},
]};
