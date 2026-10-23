import type React from 'react';
import {Chip,Defs,Enter,Label,Memo,chipWidth} from './kit';
import type {Animation} from './types';

// 模型原理：自注意力——“它”在问：句子里谁和我最相关？（数值为示意）
const tokens=['小猫','坐在','垫子','上','，','因为','它','很','软'];
const scores=[2.1,.6,2.9,.4,-1.2,.5,.9,.2,.9];
const weights=[.21,.05,.52,.04,.01,.04,.05,.03,.05];
const IT=6,Y=150;
const widths=tokens.map(chipWidth),total=widths.reduce((a,b)=>a+b,0)+10*(tokens.length-1);
const xs=widths.map((_,i)=>(640-total)/2+widths.slice(0,i).reduce((a,b)=>a+b+10,0));
const cx=(i:number)=>xs[i]+widths[i]/2;
const arc=(i:number)=>{const a=cx(IT),b=cx(i),h=Math.min(118,Math.abs(a-b)*.42+18);return `M${a} ${Y} Q${(a+b)/2} ${Y-h} ${b} ${Y}`};

function Visual({step}:{step:number}){
 if(step>=6)return <g><Defs/><Memo lines={['每个词都在问：谁和我最相关？','按相关度加权，融合信息']}/></g>;
 return <g><Defs/>
  <Label x={24} y={34}>{step<5?'一句话里的 9 个 token':'多头注意力：每个头关注不同的关系'}</Label>
  {step>=2&&step<5&&tokens.map((_,i)=>i===IT?null:<path key={'a'+i} d={arc(i)} className={'an-arrow an-fade '+(step>=3&&i===2?'ok':step>=3?'quiet':'primary')} style={{strokeWidth:step>=3?1+weights[i]*16:1.6,opacity:step>=3?Math.max(.18,weights[i]*1.8):.8}}/>)}
  {step===4&&[2,0].map((j,k)=><circle key={'v'+j} r={6} className={'an-dot '+(j===2?'ok':'')}><animateMotion dur="1.6s" repeatCount="indefinite" begin={k*0.4+'s'} path={`M${cx(j)} ${Y} Q${(cx(j)+cx(IT))/2} ${Y-Math.min(118,Math.abs(cx(IT)-cx(j))*.42+18)} ${cx(IT)} ${Y}`}/></circle>)}
  {step<5&&tokens.map((t,i)=><Chip key={t+i} x={xs[i]} y={Y-16} text={t} tone={i===IT?(step===4?'primary':'warm'):step>=3&&i===2?'ok':'base'} delay={step===0?i*90:0}/>)}
  {step===0&&<Enter x={cx(IT)-10} y={Y-46} mode="pop" delay={900}><text className="an-big" x={0} y={0}>?</text></Enter>}
  {step===1&&tokens.map((t,i)=><Enter key={'q'+i} x={cx(i)} y={Y+38} mode="pop" delay={i*80}><text className="an-q" x={0} y={0} textAnchor="middle">Q·K·V</text></Enter>)}
  {step===1&&<Enter x={120} y={250} delay={600}><text className="an-t small" x={0} y={0}>Query：我在找什么　Key：我是什么　Value：我携带的信息</text></Enter>}
  {step===2&&tokens.map((t,i)=>i===IT?null:<Enter key={'s'+i} x={cx(i)} y={Y+40} mode="pop" delay={i*70}><text className="an-q" x={0} y={0} textAnchor="middle">{scores[i].toFixed(1)}</text></Enter>)}
  {step===2&&<Enter x={160} y={250} delay={500}><text className="an-t small" x={0} y={0}>分数 = “它”的 Query · 各 token 的 Key（点积）</text></Enter>}
  {step===3&&tokens.map((t,i)=><g key={'w'+i}><rect className="an-track" x={cx(i)-6} y={Y+28} width={12} height={90} rx={4}/><rect className={'an-col '+(i===2?'ok':'quiet')} x={cx(i)-6} y={Y+28} width={12} height={90} rx={4} style={{'--p':weights[i]/.52,animationDelay:i*70+'ms'} as React.CSSProperties}/><text className="an-q" x={cx(i)} y={Y+136} textAnchor="middle">{weights[i].toFixed(2)}</text></g>)}
  {step===4&&<Enter x={128} y={250} delay={400}><text className="an-t small" x={0} y={0}>新的“它” = 0.52×垫子 + 0.21×小猫 + …（各 token 的 Value 加权求和）</text></Enter>}
  {step===5&&[{t:'头 1：指代关系',a:6,b:2},{t:'头 2：动作的主语',a:1,b:0},{t:'头 3：修饰关系',a:7,b:8}].map((h,k)=><Enter key={k} x={24+k*204} y={60} delay={k*250}>
   <rect className="an-panel" width={188} height={240} rx={14}/><text className="an-t small" x={94} y={30} textAnchor="middle">{h.t}</text>
   {tokens.map((t,i)=><g key={i}><circle cx={20+i*18.5} cy={150} r={6} className={'an-dot '+(i===h.a||i===h.b?'ok':'quiet')}/></g>)}
   <path d={`M${20+h.a*18.5} 150 Q${20+(h.a+h.b)/2*18.5} ${150-24-Math.abs(h.a-h.b)*10} ${20+h.b*18.5} 150`} className="an-arrow ok flow" style={{strokeWidth:3}}/>
   <text className="an-q" x={94} y={190} textAnchor="middle">{tokens[h.a]} → {tokens[h.b]}</text></Enter>)}
 </g>}

export const selfAttention:Animation={id:'self-attention',icon:'🧲',title:'自注意力：每个词在找谁',summary:'Query、Key、Value 与 softmax 权重，看“它”如何找到“垫子”。',level:'model-internals',kind:'advanced',Visual,scenes:[
 {caption:'看这句话：“小猫坐在垫子上，因为它很软。”这里的“它”指的是谁？模型要靠自注意力来判断。',ms:4600},
 {caption:'每个 token 都会生成三个向量：Query 表示“我在找什么”，Key 表示“我是什么”，Value 是“我携带的信息”。',ms:5200},
 {caption:'“它”拿自己的 Query 和每个 token 的 Key 做点积，得到一组相关性分数，“垫子”和“小猫”的分数最高。',ms:5200},
 {caption:'softmax 把分数变成加起来等于 1 的权重：“垫子”0.52、“小猫”0.21，其余都很小。线越粗，关注越多。',ms:5200},
 {caption:'按权重把各 token 的 Value 加起来，“它”的新表示就融入了“垫子”的信息，模型由此知道“软的是垫子”。',ms:5400},
 {caption:'实际模型有很多个注意力头并行工作，各自关注不同的关系；几十层叠起来，理解就越来越深。',ms:5200},
 {caption:'代价：每个 token 都要和所有 token 计算一次，长度翻倍、计算量约翻四倍，这就是长上下文贵的原因。',ms:5400},
]};
