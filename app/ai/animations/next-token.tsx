import {Arrow,Bar,Box,Chip,Defs,Enter,Label,Memo,chipWidth} from './kit';
import type {Animation} from './types';

// 认识大模型：自回归地逐个预测下一个 token。
const first:[string,number][]=[['很',.46],['真',.21],['不错',.15],['晴朗',.09]];
const second:[string,number][]=[['好',.58],['热',.19],['冷',.12],['差',.05]];

function Visual({step}:{step:number}){
 const words=['今天','天气',...(step>=2?['很']:[]),...(step>=4?['好','。']:[])];
 let x=40;const slots=words.map(w=>{const at=x;x+=chipWidth(w)+8;return at});
 const end=x;const cands=step>=3?second:first,picked=step===2||step===4?cands[0][0]:null;
 const thinking=step===1||step===3;
 return <g><Defs/>
  <Label x={40} y={38}>上文（输入给模型的内容）</Label>
  {words.map((w,i)=>{const isNew=(step===2&&w==='很')||(step===4&&w==='好');return <Chip key={w+i} x={slots[i]} y={52} text={w} tone={isNew?'primary':'base'} from={isNew?[150,222]:undefined} delay={w==='。'?500:0}/>})}
  {step>=4&&<Chip key="eos" x={end} y={52} text="<结束>" tone="quiet" delay={900}/>}
  {step<4&&<rect className="an-blink" x={end} y={56} width={3} height={24} fill="var(--primary)"/>}
  <Arrow d="M320 92 L320 124" flow={thinking}/>
  <Box x={220} y={128} w={200} h={52} title="大语言模型" sub={thinking?'正在计算每个候选的概率…':'读完全部上文'} tone="primary" active={thinking}/>
  {step>=1&&step<5&&<g key={step>=3?'b':'a'}>
   <Arrow d="M320 182 L320 196" flow={thinking}/>
   <Label x={60} y={214}>下一个 token 的候选与概率</Label>
   {cands.map(([w,p],i)=><g key={w}><Enter x={150} y={222+i*30} delay={i*120}><text className={'an-t'+(picked===w?' strong':'')} x={0} y={14} dominantBaseline="central">{w}</text></Enter>
    <Bar x={210} y={222+i*30+5} w={300} p={p} tone={picked===w?'ok':i===0?'primary':'quiet'} delay={i*120}/>
    <Enter x={520} y={222+i*30} delay={300+i*120}><text className="an-q" x={0} y={14} dominantBaseline="central">{Math.round(p*100)}%</text></Enter></g>)}
   {picked&&<Enter x={560} y={222} mode="pop"><text className="an-t strong" x={0} y={14} dominantBaseline="central" fill="var(--notice)">✓ 选中</text></Enter>}
  </g>}
  {step===5&&<Memo lines={['每一步只做一件事：','根据上文，猜下一个 token']}/>}
 </g>}

export const nextToken:Animation={id:'next-token',icon:'🔮',title:'大模型是怎么“说话”的',summary:'一个 token 一个 token 地往下猜，看懂“自回归”生成。',level:'llm-basics',kind:'basic',Visual,scenes:[
 {caption:'输入一句话，模型先用分词器把它切成 token：「今天」「天气」。光标处就是它接下来要写的位置。',ms:4200},
 {caption:'模型读完全部上文，给词表里的每个候选 token 算出一个概率：「很」46%、「真」21%……',ms:4600},
 {caption:'按概率选出一个——「很」，把它接到句子末尾。选法由 temperature、top-p 等采样参数决定。',ms:4200},
 {caption:'带着变长了的上文再预测一次：这次「好」的概率最高，达到 58%。',ms:4400},
 {caption:'一个接一个，直到生成句号和结束标记。每一步都依赖前面已经生成的内容，这就叫“自回归”。',ms:4600},
 {caption:'所以大模型并不是“查”出答案，而是一步步“猜”出来的——这也是它会产生幻觉的根源。',ms:5200,speech:'所以大模型并不是“查”出答案，而是一步步“猜”出来的——这也是它会产生幻觉的根源。每一步只做一件事：；根据上文，猜下一个 token。'},
]};
