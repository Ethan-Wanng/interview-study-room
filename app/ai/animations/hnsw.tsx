import {Defs,Enter,Label,Memo} from './kit';
import type {Animation} from './types';

// 向量数据库：HNSW 分层图检索——上层大步找方向，下层小步找最近邻。
const layers=[
 {y:78,name:'第 2 层：节点少、连线长',xs:[100,330,540]},
 {y:178,name:'第 1 层：更密一些',xs:[100,190,330,420,470,540]},
 {y:282,name:'第 0 层：全部向量',xs:[70,110,150,190,230,270,310,350,390,430,455,470,490,520,560,600]},
];
const TARGET=468;
const edges=(xs:number[])=>xs.slice(1).map((x,i)=>[xs[i],x]);
const hops=[[100,78],[330,78],[540,78],[540,178],[470,178],[470,282]];
const pathD=hops.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');

function Visual({step}:{step:number}){
 if(step>=6)return <g><Defs/><Memo lines={['上层高速找方向','下层小路找门牌']}/></g>;
 const seen=step>=2?(step>=3?(step>=4?6:5):3):step>=1?1:0;
 return <g><Defs/>
  {layers.map((l,k)=><g key={k}>
   <Enter x={0} y={0} delay={k*250}><rect className="an-panel" x={36} y={l.y-30} width={580} height={60} rx={30} opacity={.75}/>
    {edges(l.xs).map(([a,b],i)=><line key={i} className="an-line" x1={a} x2={b} y1={l.y} y2={l.y}/>)}
    {k===0&&<path d={`M100 ${l.y} Q320 ${l.y-26} 540 ${l.y}`} className="an-line" fill="none"/>}
    {l.xs.map(x=><circle key={x} cx={x} cy={l.y} r={k===2?5:7} className={'an-dot '+(step>=4&&k===2&&Math.abs(x-TARGET)<=25?'ok':k===2?'quiet':'')}/>)}
    <text className="an-q" x={48} y={l.y-38}>{l.name}</text></Enter>
  </g>)}
  {step>=1&&<Enter x={TARGET} y={322} mode="pop"><text className="an-t small" x={-26} y={0}>查询向量</text><circle cx={0} cy={-40} r={8} className="an-dot warm"/><circle cx={0} cy={-40} r={8} className="an-ring" style={{stroke:'#e09a35'}}/></Enter>}
  {step>=1&&<line className="an-line" x1={TARGET} x2={TARGET} y1={50} y2={276} strokeDasharray="3 6" opacity={.6}/>}
  {step>=2&&<path d={hops.slice(0,seen).map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')} className="an-arrow warm" style={{strokeWidth:3}} fill="none"/>}
  {step>=2&&step<=4&&<circle r={9} className="an-dot warm"><animateMotion dur="3s" repeatCount="indefinite" path={hops.slice(0,seen).map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')||pathD}/></circle>}
  {step===1&&<Enter x={100} y={78} mode="pop"><circle r={14} className="an-ring"/><text className="an-t small" x={-14} y={-20}>入口</text></Enter>}
  {step>=4&&<Enter x={TARGET} y={282} mode="pop"><circle r={40} fill="none" className="an-arrow ok flow"/></Enter>}
  {step>=5&&<Enter x={360} y={22}><rect className="an-box ok" width={260} height={34} rx={17}/><text className="an-t small" x={130} y={17} textAnchor="middle" dominantBaseline="central">只比较了 14 个节点 · 共 1,000,000 条</text></Enter>}
  <Label x={24} y={24}>HNSW 分层图</Label>
 </g>}

export const hnsw:Animation={id:'hnsw',icon:'🧭',title:'HNSW：在百万向量里秒找邻居',summary:'分层图检索：上层大步找方向，下层小步找最近的邻居。',level:'vector-db',kind:'advanced',Visual,scenes:[
 {caption:'向量一多，逐个计算相似度就太慢了。HNSW 把向量组织成多层图：越往上节点越少、连线越长。',ms:5200},
 {caption:'查询向量来了（橙色），它的位置在右下方。搜索从最顶层的一个入口点出发。',ms:4400},
 {caption:'在顶层“大步跳”：每次都走向离查询更近的邻居，几步就跨到了目标附近。',ms:4800},
 {caption:'下到第 1 层，用更密的连线继续逼近；再往下，每一层都比上一层更精细。',ms:4600},
 {caption:'到最底层后，在附近的邻居里仔细比较，选出与查询最相似的 K 个向量（绿色）。',ms:4600},
 {caption:'整个过程只比较了十几个节点。代价是偶尔会漏掉真正的最近邻，调大 efSearch 能找得更准，但会更慢。',ms:5600},
 {caption:'这就是“近似最近邻”：用一点点精度，换来几个数量级的速度。',ms:4800,speech:'这就是“近似最近邻”：用一点点精度，换来几个数量级的速度。上层高速找方向；下层小路找门牌。'},
]};
