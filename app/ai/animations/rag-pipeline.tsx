import {Arrow,Chip,Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 让它更聪明：RAG = 切块 → 向量化 → 检索最近邻 → 拼进提示词 → 开卷作答。
const chunks=[{t:'① 退货时限',x:452,y:118,hit:true},{t:'② 退款到账',x:506,y:104,hit:true},{t:'③ 运费说明',x:520,y:168,hit:true},{t:'④ 会员积分',x:380,y:276,hit:false}];
const noise=[[360,70],[590,70],[400,190],[580,250],[350,310],[470,300],[560,300],[600,190],[372,120]];
const query={x:488,y:140};

function Visual({step}:{step:number}){
 if(step>=6)return <g><Defs/><Memo lines={['先检索资料，再开卷作答','资料更新：只需更新索引']}/></g>;
 return <g><Defs/>
  <Label x={24} y={34}>知识库文档</Label>
  <Enter x={24} y={46}><rect className="an-panel" width={108} height={150} rx={10}/>{[0,1,2,3,4,5,6,7].map(i=><rect key={i} x={14} y={18+i*15} width={i%3===2?54:80} height={6} rx={3} className="an-shade"/>)}<text className="an-t small" x={54} y={138} textAnchor="middle">退货政策</text></Enter>
  {step>=0&&<g>{chunks.map((c,i)=><Chip key={c.t} x={146} y={46+i*38} text={c.t} tone={step>=3&&c.hit?'primary':'base'} delay={300+i*180}/>)}<Arrow d="M134 120 L142 120" flow={step===0}/></g>}
  <Label x={330} y={34}>语义空间（向量）</Label>
  <rect className="an-panel" x={330} y={46} width={290} height={286} rx={14}/>
  {[1,2,3].map(i=><line key={'h'+i} className="an-line" x1={330} x2={620} y1={46+i*71.5} y2={46+i*71.5} opacity={.35}/>)}
  {[1,2,3].map(i=><line key={'v'+i} className="an-line" y1={46} y2={332} x1={330+i*72.5} x2={330+i*72.5} opacity={.35}/>)}
  {step>=1&&noise.map(([x,y],i)=><Enter key={'n'+i} x={x} y={y} mode="pop" delay={i*60}><circle r={5} className="an-dot quiet"/></Enter>)}
  {step>=1&&chunks.map((c,i)=><Enter key={'d'+i} x={c.x} y={c.y} from={[250,62+i*38]} delay={i*220}><circle r={8} className={'an-dot '+(step>=3&&c.hit?'ok':'')}/><text className="an-q" x={12} y={4}>{c.t.slice(0,1)}</text></Enter>)}
  {step>=2&&<Enter x={query.x} y={query.y} mode="pop"><circle r={9} className="an-dot warm"/><circle r={9} className="an-ring" style={{stroke:'#e09a35'}}/><text className="an-t small" x={-28} y={30}>问题向量</text></Enter>}
  {step>=3&&<g>{chunks.filter(c=>c.hit).map((c,i)=><line key={i} className="an-line ok an-in" x1={query.x} y1={query.y} x2={c.x} y2={c.y} style={{animationDelay:i*200+'ms'}}/>)}<Enter x={query.x} y={query.y} mode="pop"><circle r={52} fill="none" className="an-arrow ok flow"/></Enter></g>}
  {(step===2||step===3)&&<Chip x={24} y={226} text="用户：退货要多久到账？" tone="warm" mode="pop"/>}
  {step>=4&&<Enter x={24} y={214}><rect className="an-box primary" width={290} height={96} rx={12}/>
   <text className="an-q" x={14} y={22}>提示词：只根据资料回答，并标注出处</text>
   <text className="an-t small" x={14} y={46}>[1] 退货时限 [2] 退款到账 [3] 运费说明</text>
   <text className="an-t small" x={14} y={72}>问题：退货要多久到账？</text></Enter>}
  {step>=5&&<Chip x={24} y={318} text="答：退款 3–5 个工作日到账 [2]" tone="ok" mode="pop"/>}
 </g>}

export const ragPipeline:Animation={id:'rag-pipeline',icon:'📚',title:'RAG：让模型开卷考试',summary:'切块、向量化、找最近邻、拼进提示词，一次看懂检索增强生成。',level:'rag-basics',kind:'basic',Visual,scenes:[
 {caption:'第一步“切块”：把《退货政策》这类长文档切成几个小片段，每块只讲一件事。',ms:4400},
 {caption:'每个切块用 embedding 模型变成一个向量，落在“语义空间”里：意思相近的内容，位置也靠得近。',ms:5000},
 {caption:'用户提问“退货要多久到账？”，问题也用同一个 embedding 模型变成向量，落进同一个空间。',ms:4600},
 {caption:'向量数据库找出离问题最近的 3 个切块（Top-K），“会员积分”离得远，没被选中。',ms:4600},
 {caption:'把这 3 个片段和问题一起拼进提示词，并要求模型“只根据资料回答，找不到就说不知道，标注出处”。',ms:5200},
 {caption:'模型开卷作答，并在答案后面标出依据的片段编号 [2]，用户可以随时核对。',ms:4400},
 {caption:'RAG 不改模型参数：资料更新后重新建索引即可生效，还能大幅减少幻觉。',ms:5000,speech:'RAG 不改模型参数：资料更新后重新建索引即可生效，还能大幅减少幻觉。先检索资料，再开卷作答；资料更新：只需更新索引。'},
]};
