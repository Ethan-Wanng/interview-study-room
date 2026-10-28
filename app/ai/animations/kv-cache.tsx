import type React from 'react';
import {Arrow,Chip,Defs,Enter,Label,Memo,chipWidth} from './kit';
import type {Animation} from './types';

// 部署与推理：prefill 与 decode，KV 缓存让“算过的不再算”。
const input=['请','总结','这份','合同','的','要点'];
const output=['合同','约定'];
const row=(words:string[],x0:number)=>{let x=x0;return words.map(w=>{const at=x;x+=chipWidth(w)+8;return at})};

function Visual({step}:{step:number}){
 if(step>=6)return <g><Defs/><Memo lines={['算过的不再算','用显存换速度']}/></g>;
 if(step===3||step===4){const n=10;return <g><Defs/>
  <Label x={24} y={36}>生成第 1～10 个 token 时，每一步要计算多少个 token</Label>
  <text className="an-t small" x={24} y={84}>没有 KV 缓存</text>
  {Array.from({length:n},(_,i)=><g key={'na'+i}><rect className="an-track" x={140+i*46} y={60} width={34} height={110} rx={6}/><rect className="an-col warm" x={140+i*46} y={60} width={34} height={110} rx={6} style={{'--p':(6+i)/15,animationDelay:i*90+'ms'} as React.CSSProperties}/><text className="an-q" x={157+i*46} y={186} textAnchor="middle">{6+i}</text></g>)}
  {step===4&&<g><text className="an-t small" x={24} y={252}>有 KV 缓存</text>
   {Array.from({length:n},(_,i)=><Enter key={'b'+i} x={140+i*46} y={210} mode="pop" delay={i*90}><rect className="an-track" width={34} height={110} rx={6}/><rect className="an-bar ok" y={110-110/15} width={34} height={110/15} rx={3} style={{animation:'none'}}/><text className="an-q" x={17} y={130} textAnchor="middle">1</text></Enter>)}</g>}
  <Enter x={436} y={step===4?14:240} mode="pop" delay={step===4?900:300}><rect className={'an-box '+(step===4?'ok':'warm')} width={184} height={34} rx={17}/><text className="an-t small" x={92} y={17} textAnchor="middle" dominantBaseline="central">{step===4?'合计：10 次 vs 105 次':'越往后越慢，重复计算'}</text></Enter>
 </g>}
 const xs=row(input,40),decoded=step>=2?output.slice(0,step>=2?2:0):[],dx=row(decoded,xs[xs.length-1]+chipWidth(input[input.length-1])+8);
 return <g><Defs/>
  <Label x={40} y={40}>{step===0?'预填充 prefill：一次处理全部输入':step===1?'把每个 token 的 K、V 存进缓存':step===2?'解码 decode：每次只算一个新 token':'KV 缓存占用显存'}</Label>
  {input.map((w,i)=><Chip key={w+i} x={xs[i]} y={56} text={w} tone={step===0?'primary':'base'} mode={step===0?'pop':'in'} delay={step===0?0:0}/>)}
  {decoded.map((w,i)=><Chip key={'o'+i} x={dx[i]} y={56} text={w} tone="ok" mode="pop" delay={i*1600}/>)}
  {step===0&&<Enter x={40} y={110} delay={500}><text className="an-t small" x={0} y={0}>6 个 token 并行计算，完成后才能吐出第一个字 → 这段时间就是首字延迟（TTFT）</text></Enter>}
  <Enter x={40} y={196}><rect className="an-panel" width={560} height={110} rx={14}/><text className="an-q" x={16} y={24}>KV 缓存（存放在 GPU 显存里）</text></Enter>
  {step>=1&&input.map((w,i)=><Enter key={'kv'+i} x={56+i*70} y={232} from={step===1?[xs[i],70]:undefined} delay={step===1?i*160:0}><rect className="an-box primary" width={30} height={52} rx={6}/><text className="an-q" x={15} y={18} textAnchor="middle">K</text><text className="an-q" x={15} y={40} textAnchor="middle">V</text></Enter>)}
  {step>=2&&decoded.map((w,i)=><Enter key={'kvo'+i} x={56+(input.length+i)*70} y={232} from={[dx[i],70]} delay={i*1600+500}><rect className="an-box ok" width={30} height={52} rx={6}/><text className="an-q" x={15} y={18} textAnchor="middle">K</text><text className="an-q" x={15} y={40} textAnchor="middle">V</text></Enter>)}
  {step===2&&<g><Arrow d={`M${dx[0]+20} 92 C${dx[0]} 160 300 170 300 222`} tone="ok" flow/><Enter x={40} y={116} delay={300}><text className="an-t small" x={0} y={0}>新 token 只算自己的 Q、K、V，前文的 K、V 直接从缓存里读</text></Enter></g>}
  {step===5&&<g>{Array.from({length:4},(_,i)=><Enter key={'p'+i} x={420+i*42} y={232} mode="pop" delay={i*200}><rect className="an-box quiet" width={34} height={52} rx={6}/></Enter>)}<Enter x={40} y={140} delay={300}><text className="an-t small" x={0} y={0}>上下文越长、并发越多，缓存越大；PagedAttention 按“页”分配，减少浪费</text></Enter></g>}
 </g>}

export const kvCache:Animation={id:'kv-cache',icon:'⚡',title:'KV 缓存：推理为什么能变快',summary:'prefill 与 decode 两个阶段，以及“算过的不再算”的 KV 缓存。',level:'serving',kind:'advanced',Visual,scenes:[
 {caption:'推理分两个阶段。第一阶段是预填充（prefill）：把全部输入 token 一次性并行处理完，才能生成第一个字。',ms:5000},
 {caption:'处理过程中，每个 token 算出的 Key 和 Value 都被存进 KV 缓存，就像把算好的结果放上书架。',ms:4800},
 {caption:'第二阶段是解码（decode）：每次只生成一个新 token。它只需要算自己，前文的 K、V 直接从缓存里读。',ms:5400},
 {caption:'如果没有缓存：每生成一个 token，都要把前面所有 token 重新算一遍，越往后越慢。',ms:4800},
 {caption:'有了缓存：每一步只算 1 个新 token。生成 10 个 token，计算量从 105 次降到 10 次。',ms:5000},
 {caption:'代价是显存：上下文越长、同时服务的请求越多，缓存越大。vLLM 的 PagedAttention 把缓存分页管理，减少浪费。',ms:5600},
 {caption:'这就是推理优化的核心思想之一：用显存换时间。',ms:4400,speech:'这就是推理优化的核心思想之一：用显存换时间。算过的不再算；用显存换速度。'},
]};
