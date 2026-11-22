import {Arrow,Box,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// Harness 工程与 Skills：AGENTS.md + 渐进式 Skill + Pre/Post/Stop Hooks 构成确定性控制面。
function Visual({step}:{step:number}){
 if(step>=7)return <g><Defs/><Memo lines={['Model 负责推理，Harness 负责控制与兜底','Skill 渐进式披露，Stop Hook 验证不放水']}/></g>;
 return <g><Defs/>
  <Label x={24} y={32}>Agent = Model + Harness（确定性控制面）</Label>
  <Enter x={240} y={138} delay={0}><rect className={'an-box '+(step===3?'primary active':'base')} width={160} height={66} rx={14}/><text className="an-t strong" x={80} y={24} textAnchor="middle" dominantBaseline="central">🧠 Model 推理</text><text className="an-q" x={80} y={46} textAnchor="middle" dominantBaseline="central">概率思考与决策</text></Enter>
  {step>=1&&<g><Box x={24} y={56} w={172} h={52} title="📜 AGENTS.md" sub="分层规范 · 低噪高信" tone={step===1?'primary':'base'} active={step===1}/><Arrow d="M196 82 L240 154" tone={step===1?'primary':'quiet'}/></g>}
  {step>=2&&<g><Box x={444} y={56} w={172} h={52} title="🧩 Agent Skill" sub="元数据 → SKILL.md" tone={step===2?'primary':'ok'} active={step===2}/><Arrow d="M444 82 L400 154" tone={step===2?'primary':'quiet'}/></g>}
  {step>=3&&<g><Box x={444} y={144} w={172} h={56} title="🔧 ACI 精准编辑" sub="局部 Diff · 截断回指" tone={step===3?'primary':'base'} active={step===3}/><Arrow d="M400 172 L444 172" tone={step===3?'primary':'quiet'}/></g>}
  {step>=4&&<g><Box x={24} y={144} w={172} h={56} title="🛡️ Pre / Post Hooks" sub="鉴权拦截 · 自动 Lint" tone={step===4?'warm':'ok'} active={step===4}/><Arrow d="M196 172 L240 172" tone="ok"/></g>}
  {step>=5&&<g><Box x={210} y={248} w={220} h={58} title="🚦 Stop Hook 完成门禁" sub={step===5?'测试失败 → 打回修复':'全部测试通过 ✓ 放行'} tone={step===5?'bad':'ok'} active={step>=5}/><Arrow d="M320 204 L320 248" tone={step===5?'bad':'ok'}/></g>}
  {step===1&&<Chip x={210} y={318} text="先加载根目录规范，命中子目录再按路径注入" tone="primary" mode="pop"/>}
  {step===2&&<Chip x={200} y={318} text="渐进式披露：不把上百个技能全文塞进系统提示" tone="ok" mode="pop"/>}
  {step===3&&<Chip x={212} y={318} text="改 3 行不用重写 1000 行，长日志落盘给路径" tone="primary" mode="pop"/>}
  {step===4&&<Chip x={204} y={318} text="改完文件自动格式化并跑单测，不靠口头提醒" tone="warm" mode="pop"/>}
  {step===5&&<Chip x={448} y={262} text="✗ 漏了边界用例" tone="bad" mode="pop"/>}
  {step===6&&<Chip x={448} y={262} text="✓ 门禁通过可交付" tone="ok" mode="pop"/>}
 </g>}

export const harnessLoop:Animation={id:'harness-loop',icon:'🎛️',title:'Harness：把模型装进确定性控制台',summary:'AGENTS.md 分层规则、Skill 渐进式披露、ACI 与 Stop Hook 门禁如何一起工作。',level:'harness',kind:'advanced',Visual,scenes:[
 {caption:'模型只是大脑。真正决定 Agent 稳不稳的，是外面这层叫作 Harness 的确定性控制面。',ms:4800},
 {caption:'第一步，按需注入规范：根级 AGENTS.md 放构建测试约定，改到特定目录才加载对应路径规则。',ms:5000},
 {caption:'第二步，Skill 渐进式披露：平时只留几十 token 的名称和描述，命中任务再展开 SKILL.md 和脚本。',ms:5400},
 {caption:'第三步，ACI 接口：用局部 diff 编辑代替整文件重写，超长日志截断并落盘回指，防止撑爆上下文。',ms:5600},
 {caption:'第四步，Pre 与 Post Hooks：调用前检查路径权限，改完自动格式化和跑局部测试。',ms:5000},
 {caption:'第五步，Stop Hook 完成门禁：模型想宣布“已完成”，门禁跑测试发现失败，立刻打回继续修。',ms:5200},
 {caption:'第六步，修复后门禁全部通过，Harness 才允许交付结果并记录完整 trace。',ms:4600},
 {caption:'Model 负责推理，Harness 负责控制与兜底；Skill 渐进式披露，Stop Hook 验证不放水。',ms:4800,speech:'Model 负责推理，Harness 负责控制与兜底；Skill 渐进式披露，Stop Hook 验证不放水。'},
]};
