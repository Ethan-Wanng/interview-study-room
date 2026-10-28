import {Arrow,Box,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 学会调用：模型 API 无状态，多轮对话要把历史一起发送。
type Msg={role:'user'|'assistant';text:string};
const requests:Msg[][]=[
 [{role:'user',text:'我叫小明'}],
 [{role:'user',text:'我叫什么？'}],
 [{role:'user',text:'我叫什么？'}],
 [{role:'user',text:'我叫小明'},{role:'assistant',text:'你好，小明！'},{role:'user',text:'我叫什么？'}],
 [{role:'user',text:'我叫小明'},{role:'assistant',text:'你好，小明！'},{role:'user',text:'我叫什么？'}],
];
const replies:[string,'ok'|'bad'][]=[['你好，小明！','ok'],['抱歉，我不知道你的名字。','bad'],['抱歉，我不知道你的名字。','bad'],['',"ok"],['你叫小明。','ok']];

function Visual({step}:{step:number}){
 if(step>=5)return <g><Defs/><Memo lines={['API 无状态，记忆靠你带','历史太长：裁剪或摘要']}/></g>;
 const msgs=requests[step],[reply,tone]=replies[step],full=step>=3;
 return <g><Defs/>
  <Box x={24} y={40} w={128} h={280} title="你的程序" sub="负责保存历史"/>
  <Box x={488} y={130} w={128} h={96} title="模型 API" sub={step===2?'不保存任何对话':'每次只看本次请求'} tone={step===2?'bad':'primary'} active={step===2}/>
  <Label x={176} y={44}>{full?'本次请求：messages（完整历史）':`第 ${step===0?1:2} 次请求：messages`}</Label>
  <g key={'req'+step}>{msgs.map((m,i)=><Chip key={i} x={176} y={56+i*40} text={(m.role==='user'?'user：':'assistant：')+m.text} tone={m.role==='assistant'?'warm':'base'} delay={full?i*450:0}/>)}</g>
  <Arrow d="M410 90 C450 90 450 150 482 160" flow tone="primary"/>
  {reply&&<g key={'res'+step}>
   <Arrow d="M482 200 C440 230 430 262 404 262" flow tone={tone}/>
   <Label x={176} y={238}>模型回复</Label>
   <Chip x={176} y={248} text={'assistant：'+reply} tone={tone} mode="pop" delay={500}/>
  </g>}
  {step===2&&<Enter x={176} y={300} delay={300}><text className="an-t small" fill="var(--alert-ink)">第 1 次的对话没有带上，模型根本看不到“小明”。</text></Enter>}
 </g>}

export const statelessChat:Animation={id:'stateless-chat',icon:'💬',title:'模型为什么“不记得”你',summary:'API 是无状态的：多轮对话的记忆完全靠你带上历史。',level:'calling',kind:'basic',Visual,scenes:[
 {caption:'第一次请求：程序发送 messages=[user：我叫小明]，模型礼貌地回复“你好，小明！”。',ms:4200},
 {caption:'第二次请求只发了新问题“我叫什么？”——模型却说不知道。',ms:4000},
 {caption:'原因：模型 API 是无状态的，每次请求互不相干，服务端不会替你保存上一次的对话。',ms:4800},
 {caption:'正确做法：程序把之前的用户消息和模型回复，按顺序和新问题一起放进 messages 发送。',ms:5000},
 {caption:'模型看到完整历史，就能答出“你叫小明”。所谓“记忆”，其实是你每次都把它带了过去。',ms:4600},
 {caption:'历史越长，输入 token 越多、费用越高，所以实际项目要只保留最近几轮，或把早期对话压缩成摘要。',ms:5200,speech:'历史越长，输入 token 越多、费用越高，所以实际项目要只保留最近几轮，或把早期对话压缩成摘要。API 无状态，记忆靠你带；历史太长：裁剪或摘要。'},
]};
