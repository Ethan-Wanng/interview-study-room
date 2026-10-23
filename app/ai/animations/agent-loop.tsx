import {Box,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// Agent 架构：思考 → 行动 → 观察 的循环，以及护栏。
const nodes={think:{x:320,y:78,t:'思考'},act:{x:470,y:236,t:'行动'},look:{x:170,y:236,t:'观察'}};
const cycle='M320 78 Q470 110 470 236 Q320 330 170 236 Q170 110 320 78';
const phase=['','think','act','look','think','','done'];

function Visual({step}:{step:number}){
 if(step>=7)return <g><Defs/><Memo lines={['想一步，做一步，看一步','设上限、要确认、留痕迹']}/></g>;
 const now=phase[step],steps=[0,1,2,3,4,4,5][step];
 return <g><Defs/>
  <Label x={24} y={32}>任务：订一间周五下午能坐 6 人的会议室</Label>
  <path d={cycle} className={'an-arrow '+(step>=1&&step<=4?'primary flow':'')} fill="none"/>
  {(Object.keys(nodes) as (keyof typeof nodes)[]).map((k,i)=><g key={k}><Box x={nodes[k].x-52} y={nodes[k].y-26} w={104} h={52} title={nodes[k].t} tone={now===k?'primary':'base'} active={now===k} delay={step===0?i*200:0}/></g>)}
  {step>=1&&step<=4&&<circle r={8} className="an-dot warm"><animateMotion dur="3.6s" repeatCount="indefinite" path={cycle}/></circle>}
  <Enter x={256} y={150}><rect className="an-panel" width={128} height={64} rx={12}/><text className="an-q" x={64} y={22} textAnchor="middle">已用步数</text><text className="an-big" x={64} y={48} textAnchor="middle">{steps} / 8</text></Enter>
  {step===1&&<Chip key="t1" x={360} y={40} text="先查周五下午有哪些空闲会议室" tone="base" mode="pop"/>}
  {step===2&&<Chip key="a1" x={378} y={284} text="search_rooms(周五 14:00, 6 人)" tone="primary" mode="pop"/>}
  {step===3&&<g key="o1"><Chip x={24} y={284} text="A101（8 人）" mode="pop"/><Chip x={24} y={322} text="B203（6 人）✓" tone="ok" mode="pop" delay={300}/></g>}
  {step===4&&<g key="t2"><Chip x={360} y={40} text="B203 合适，预订前先请用户确认" tone="warm" mode="pop"/><Chip x={392} y={290} text="用户：确认预订 ✓" tone="ok" mode="pop" delay={900}/></g>}
  {step===5&&<g key="guard">{['最大步数 8','超时 60 秒','只开放会议室工具'].map((t,i)=><Chip key={t} x={24+i*206} y={318} text={'🛡 '+t} tone="ok" mode="pop" delay={i*250}/>)}</g>}
  {step===6&&<g key="done"><Chip x={392} y={290} text="book_room(B203) ✓ 已预订" tone="ok" mode="pop"/><Chip x={24} y={290} text="完整 trace 已记录" tone="quiet" mode="pop" delay={400}/></g>}
 </g>}

export const agentLoop:Animation={id:'agent-loop',icon:'🔁',title:'Agent：想一步、做一步、看一步',summary:'ReAct 循环如何完成多步任务，以及必不可少的护栏。',level:'agents',kind:'advanced',Visual,scenes:[
 {caption:'任务是“订一间周五下午能坐 6 人的会议室”。Agent 不会一次做完，而是在“思考 → 行动 → 观察”的循环里一步步推进。',ms:5200},
 {caption:'思考：模型先决定下一步要做什么——查一下周五下午哪些会议室空着。',ms:4200},
 {caption:'行动：调用工具 search_rooms，参数是“周五 14:00、6 人”。真正执行的是你的程序。',ms:4400},
 {caption:'观察：工具返回 A101（8 人）和 B203（6 人）。结果被放回上下文，进入下一轮思考。',ms:4600},
 {caption:'再思考：B203 正好合适。但预订会产生副作用，所以先请用户确认，确认后才执行。',ms:5200},
 {caption:'护栏：最大步数、超时和最小权限，防止 Agent 陷入死循环、无限花钱或者越权操作。',ms:5200},
 {caption:'完成：B203 订好了，每一步的思考、工具调用和结果都记录成 trace，出了问题也能查清楚。',ms:4800},
 {caption:'能用固定工作流解决的问题就别用 Agent；必须用时，一定要加上限、确认和记录。',ms:4800},
]};
