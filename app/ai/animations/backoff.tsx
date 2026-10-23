import {Arrow,Box,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 上线与安全：遇到 429 限流时用指数退避重试，而不是立刻狂刷。
const waits=[{at:150,w:40,t:'1s'},{at:200,w:80,t:'2s'},{at:290,w:160,t:'4s'}];

function Visual({step}:{step:number}){
 if(step>=4)return <g><Defs/><Memo lines={['失败先等，越等越久','加抖动、控并发、设上限']}/></g>;
 return <g><Defs/>
  <Box x={20} y={40} w={120} h={64} title="你的程序" sub="调用模型 API"/>
  <Box x={500} y={40} w={120} h={64} title="模型服务" sub={step===3?'200 OK':'429 请求过多'} tone={step===3?'ok':'bad'} active={step<=1}/>
  <Arrow d="M146 72 L494 72" tone={step===3?'ok':step===1?'bad':'quiet'} flow/>
  {step===0&&[0,1,2].map(i=><circle key={i} r={7} className="an-dot"><animateMotion dur="1.2s" begin={i*0.35+'s'} repeatCount="indefinite" path="M146 72 L494 72"/></circle>)}
  {step===1&&<g>{Array.from({length:9},(_,i)=><circle key={i} r={6} className="an-dot bad"><animateMotion dur="0.7s" begin={i*0.08+'s'} repeatCount="indefinite" path="M146 72 L494 72"/></circle>)}<Enter x={190} y={150} mode="pop"><text className="an-t" fill="var(--alert-ink)">立刻重试 × 无数次 → 限流更严重，甚至被封</text></Enter></g>}
  {step>=2&&<g>
   <Label x={20} y={150}>重试时间线</Label>
   <line className="an-line" x1={20} x2={620} y1={210} y2={210}/>
   {[0,1,2,3].map(i=>{const x=[130,190,280,460][i];return <Enter key={i} x={x} y={210} mode="pop" delay={i*450}><circle r={10} className={'an-dot '+(i===3&&step===3?'ok':i<3?'bad':'quiet')}/><text className="an-q" x={0} y={30} textAnchor="middle">{i===0?'第 1 次':i===3?'第 4 次':`重试 ${i}`}</text></Enter>})}
   {waits.map((w,i)=><Enter key={'w'+i} x={w.at} y={176} delay={200+i*450}><rect className="an-box warm" width={w.w} height={22} rx={11}/><text className="an-q" x={w.w/2} y={15} textAnchor="middle">等 {w.t}</text></Enter>)}
   <Enter x={20} y={280} delay={1500}><text className="an-t small">每次等待时间翻倍（1s → 2s → 4s），再加一点随机抖动，避免大家同时重试</text></Enter>
   {step===3&&<Chip x={430} y={300} text="✓ 第 4 次成功" tone="ok" mode="pop"/>}
  </g>}
 </g>}

export const backoff:Animation={id:'backoff',icon:'⏳',title:'429 来了：指数退避重试',summary:'被限流时不要狂刷，等待时间逐次翻倍，再加点抖动。',level:'ship-safe',kind:'basic',Visual,scenes:[
 {caption:'程序不停地调用模型 API，请求太多，服务端开始返回 429：请求过多，被限流了。',ms:4000},
 {caption:'最糟糕的做法是立刻无限重试：请求越堆越多，限流更严重，还可能被封禁。',ms:4000},
 {caption:'正确做法是指数退避：等 1 秒再试，还失败就等 2 秒、4 秒……每次再加一点随机抖动。',ms:5000},
 {caption:'几次之后请求成功。同时要控制并发、设置重试上限；如果响应里有 Retry-After，就按它说的时间等。',ms:5000},
 {caption:'记住：失败先等，越等越久。',ms:3200},
]};
