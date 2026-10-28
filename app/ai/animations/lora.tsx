import {Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 微调实战：LoRA——冻住大矩阵 W，只训练两个瘦小的矩阵 B、A。
const W={x:40,y:70,s:200};
function Grid({x,y,w,h,n,m,tone}:{x:number;y:number;w:number;h:number;n:number;m:number;tone:string}){return <g>{Array.from({length:n*m},(_,k)=>{const i=k%m,j=Math.floor(k/m);return <rect key={k} x={x+i*w/m+1} y={y+j*h/n+1} width={w/m-2} height={h/n-2} rx={2} className={tone}/>})}</g>}

function Visual({step}:{step:number}){
 if(step>=6)return <g><Defs/><Memo lines={['大矩阵冻住，小矩阵学习','参数少、显存省、可切换']}/></g>;
 const frozen=step>=1,training=step===3;
 return <g><Defs/>
  <Label x={W.x} y={52}>权重矩阵 W（4096 × 4096）</Label>
  <Enter x={0} y={0}><g opacity={frozen?.45:1} className="an-fade"><Grid x={W.x} y={W.y} w={W.s} h={W.s} n={10} m={10} tone={step===0?'an-dot':'an-dot quiet'}/></g></Enter>
  {step===0&&<Enter x={W.x} y={W.y+W.s+30} delay={300}><text className="an-t small" x={0} y={0}>全量微调：约 1678 万个参数都要更新</text></Enter>}
  {frozen&&<Enter x={W.x+W.s/2-18} y={W.y+W.s/2-22} mode="pop"><text style={{fontSize:40}} x={0} y={36}>🔒</text></Enter>}
  {frozen&&<Enter x={W.x} y={W.y+W.s+30} delay={200}><text className="an-t small" x={0} y={0}>{step>=5?'推理时把 B·A 加回 W，不增加延迟':'冻结：训练时不改动'}</text></Enter>}
  {step>=2&&<g>
   <Enter x={300} y={70} mode="pop"><Label x={-6} y={220}>B（4096 × 8）</Label><Grid x={0} y={0} w={22} h={200} n={10} m={1} tone={training?'an-dot ok':'an-dot warm'}/></Enter>
   <Enter x={346} y={70} mode="pop" delay={300}><Label x={0} y={-12}>A（8 × 4096）</Label><Grid x={0} y={0} w={200} h={22} n={1} m={10} tone={training?'an-dot ok':'an-dot warm'}/></Enter>
   {training&&<><circle cx={311} cy={170} r={18} className="an-ring" style={{stroke:'var(--notice)'}}/><circle cx={446} cy={81} r={18} className="an-ring" style={{stroke:'var(--notice)'}}/></>}
  </g>}
  {step===3&&<Enter x={346} y={130} delay={300}><text className="an-t small" x={0} y={0}>只训练 A 和 B：</text><text className="an-big" x={0} y={34}>65,536 个参数</text><text className="an-q" x={0} y={58}>约为 W 的 0.4%</text></Enter>}
  {step===4&&<Enter x={346} y={120} delay={200}><rect className="an-box primary" width={250} height={56} rx={12}/><text className="an-t strong" x={125} y={28} textAnchor="middle" dominantBaseline="central">h = W·x + B·A·x</text><text className="an-q" x={0} y={84}>B·A 与 W 同形状，是给 W 打的“低秩补丁”</text></Enter>}
  {step===4&&<Enter x={W.x} y={W.y} mode="pop" delay={600}><rect width={W.s} height={W.s} rx={6} fill="none" className="an-arrow ok flow" style={{strokeWidth:3}}/></Enter>}
  {step===5&&<g>{['客服 LoRA','写作 LoRA','代码 LoRA'].map((t,i)=><Chip key={t} x={346} y={130+i*44} text={t} tone={i===0?'ok':'base'} mode="pop" delay={i*250}/>)}<Enter x={346} y={276} delay={800}><text className="an-q" x={0} y={0}>同一个底座，按任务切换适配器</text></Enter></g>}
 </g>}

export const lora:Animation={id:'lora',icon:'🧩',title:'LoRA：只训练 0.4% 的参数',summary:'冻结大矩阵，训练两个瘦小矩阵，用低秩补丁完成微调。',level:'fine-tuning',kind:'advanced',Visual,scenes:[
 {caption:'模型里有大量这样的权重矩阵。一个 4096 × 4096 的矩阵就有约 1678 万个参数，全量微调要全部更新，显存和存储都很贵。',ms:5600},
 {caption:'LoRA 的第一步：把原来的 W 冻结，训练时完全不改它。',ms:4000},
 {caption:'旁边加两个“瘦长”的小矩阵：B 是 4096 × 8，A 是 8 × 4096。中间的 8 就是“秩” r。',ms:5000},
 {caption:'训练时只更新 A 和 B，总共约 6.5 万个参数，只有 W 的 0.4%，单张显卡就能训练。',ms:5000},
 {caption:'计算时输出 = W·x + B·A·x。B 乘 A 得到一个和 W 同样大小的矩阵，相当于给 W 打了一个“低秩补丁”。',ms:5600},
 {caption:'推理时可以把 B·A 直接加回 W，不增加任何延迟；同一个底座模型还能挂多个 LoRA 适配器，按任务切换。',ms:5400},
 {caption:'再进一步，QLoRA 把底座量化到 4 位再训练 LoRA，显存需求更低。',ms:4600,speech:'再进一步，QLoRA 把底座量化到 4 位再训练 LoRA，显存需求更低。大矩阵冻住，小矩阵学习；参数少、显存省、可切换。'},
]};
