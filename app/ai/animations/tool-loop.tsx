import {Arrow,Box,Chip,Defs,Enter,Memo} from './kit';
import type {Animation} from './types';

// 让它办事：工具调用循环——模型出主意，程序来动手。
function Visual({step}:{step:number}){
 if(step>=5)return <g><Defs/><Memo lines={['模型出主意，程序来动手','执行前校验参数与权限']}/></g>;
 const on=(i:number)=>step===i;
 return <g><Defs/>
  <Box x={20} y={150} w={112} h={70} title="用户" sub="提问" active={on(0)||on(4)}/>
  <Box x={264} y={24} w={112} h={70} title="大模型" sub={on(1)?'决定调用工具':on(4)?'组织回答':'理解问题'} tone="primary" active={on(1)||on(4)}/>
  <Box x={508} y={150} w={112} h={70} title="你的程序" sub="执行工具" tone={on(2)?'ok':'base'} active={on(2)}/>
  <Box x={508} y={276} w={112} h={60} title="天气 API" sub="真实数据" tone="quiet" delay={200}/>
  <Arrow d="M110 148 C150 90 200 64 258 60" tone={on(0)?'primary':'quiet'} flow={on(0)}/>
  <Arrow d="M382 60 C440 64 492 90 532 144" tone={on(1)?'primary':'quiet'} flow={on(1)}/>
  <Arrow d="M564 226 L564 270" tone={on(2)?'ok':'quiet'} flow={on(2)}/>
  <Arrow d="M512 146 C470 116 420 104 384 92" tone={on(3)?'warm':'quiet'} flow={on(3)}/>
  <Arrow d="M262 84 C210 110 160 130 130 150" tone={on(4)?'ok':'quiet'} flow={on(4)}/>
  {on(0)&&<Chip key="q" x={60} y={78} text="北京明天天气怎么样？" tone="base" from={[40,170]}/>}
  {on(1)&&<Enter key="call" x={292} y={104} from={[300,60]}><rect className="an-box primary" width={300} height={44} rx={10}/><text className="an-t small" x={12} y={22} dominantBaseline="central">{'get_weather(city="北京", date="明天")'}</text></Enter>}
  {on(2)&&<g key="exec"><Chip x={262} y={244} text="✓ 参数校验通过" tone="ok" mode="pop"/><Chip x={262} y={290} text={'返回 {天气:"晴", 最高:25}'} tone="base" from={[520,300]} delay={700}/></g>}
  {on(3)&&<Chip key="result" x={330} y={148} text={'工具结果：晴，最高 25°C'} tone="warm" from={[520,170]}/>}
  {on(4)&&<Chip key="answer" x={60} y={250} text="明天北京晴，最高 25°C，适合出门。" tone="ok" from={[280,60]}/>}
 </g>}

export const toolLoop:Animation={id:'tool-loop',icon:'🛠️',title:'工具调用：模型怎么“办事”',summary:'模型只说要调哪个工具，真正执行的是你的程序。',level:'tool-use',kind:'basic',Visual,scenes:[
 {caption:'用户问：“北京明天天气怎么样？”模型自己不知道明天的天气，需要借助工具。',ms:4200},
 {caption:'模型不直接回答，而是返回一个工具调用：get_weather，参数 city="北京"、date="明天"。',ms:4800},
 {caption:'你的程序先校验参数和权限，再去调用真实的天气 API，拿到“晴，最高 25°C”。',ms:4800},
 {caption:'程序把执行结果作为“工具结果”消息发回给模型，并带上对应的调用 id。',ms:4400},
 {caption:'模型根据工具结果组织语言，给出最终回答。需要的话，它也可以继续调用下一个工具。',ms:4600},
 {caption:'记住分工：模型负责“决定做什么”，程序负责“真正去做”。转账、删除这类高风险操作，还要先让用户确认。',ms:5400,speech:'记住分工：模型负责“决定做什么”，程序负责“真正去做”。转账、删除这类高风险操作，还要先让用户确认。模型出主意，程序来动手；执行前校验参数与权限。'},
]};
