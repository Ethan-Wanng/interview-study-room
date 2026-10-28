import type {CSSProperties} from 'react';
import {Defs,Memo,textWidth} from './kit';
import type {Animation,Cue} from './types';

// 故事板动画引擎：用“角色 + 物品 + 事件”的脚本描述一道面试题，由引擎渲染成连贯的动画。
// 角色在各个镜头之间保持同一个 DOM 节点，位置变化会平滑移动；新角色弹出，退场角色淡出。

export type Tone='base'|'primary'|'ok'|'bad'|'warm'|'quiet';
// char：圆形头像（人物、角色）；item：卡片（物品、系统、服务）；tag：小标签（数据、概念）
export type Actor={id:string;icon:string;label:string;x:number;y:number;sub?:string;tone?:Tone;kind?:'char'|'item'|'tag'};
// 一次传递：从 from 到 to 画一条流动箭头，并有一个小包裹（可带文字）沿线移动。
export type Send={from:string;to:string;text?:string;tone?:Tone};
export type Beat={
 say:string;                              // 字幕（必填）
 add?:Actor[];                            // 登场
 drop?:string[];                          // 退场
 move?:Record<string,[number,number]>;    // 移动到新坐标（画布 640×360，坐标为角色中心）
 tone?:Record<string,Tone>;               // 改变状态颜色
 sub?:Record<string,string>;              // 改变角色下方的小字
 focus?:string[];                         // 本镜头的焦点（发光）
 send?:Send[];                            // 本镜头发生的传递
 bubble?:{who:string;text:string;tone?:Tone}; // 对话气泡，\n 换行
 note?:string;                            // 画面底部的一行说明（公式、结论）
 memo?:string[];                          // 结尾口诀卡片
 ms?:number;                              // 手动指定时长（一般不需要）
};
export type Story={title:string;beats:Beat[]};

export const A=(id:string,icon:string,label:string,x:number,y:number,o:Partial<Actor>={}):Actor=>({id,icon,label,x,y,...o});

const PACE=0.7; // 与播放器的 PACE 一致：这里算的是实际观看时长
// 节奏：字幕越长、登场的东西越多、传递越多，这一镜停留越久。
export const beatMs=(b:Beat)=>b.ms??Math.round(Math.min(9500,Math.max(2800,1600+[...b.say].length*105+(b.add?.length??0)*350+(b.send?.length??0)*450+(b.bubble?500:0)+(b.memo?700:0)+(b.note?400:0)))/PACE);

type Cast={actor:Actor;born:number;gone?:number};
function castAt(beats:Beat[],step:number){const cast=new Map<string,Cast>();
 beats.slice(0,step+1).forEach((b,j)=>{
  b.add?.forEach(a=>cast.set(a.id,{actor:{...a},born:j}));
  for(const [id,[x,y]] of Object.entries(b.move??{})){const c=cast.get(id);if(c)c.actor={...c.actor,x,y}}
  for(const [id,t] of Object.entries(b.tone??{})){const c=cast.get(id);if(c)c.actor={...c.actor,tone:t}}
  for(const [id,t] of Object.entries(b.sub??{})){const c=cast.get(id);if(c)c.actor={...c.actor,sub:t}}
  b.drop?.forEach(id=>{const c=cast.get(id);if(c)c.gone=j});
 });
 return [...cast.values()].filter(c=>c.gone===undefined||c.gone===step)}

const width=(a:Actor)=>Math.max(a.kind==='tag'?60:104,Math.round(textWidth(a.label,13.5)+(a.kind==='tag'?40:58)));
function ActorView({a,focus,leaving}:{a:Actor;focus:boolean;leaving:boolean}){const tone=a.tone??'base',kind=a.kind??'char';
 const style={transform:`translate(${a.x}px,${a.y}px)`} as CSSProperties;
 return <g className={'st-actor'+(leaving?' st-gone':'')} style={style}><g className="an-pop">
  {kind==='char'&&<><circle r={29} className={'st-av '+tone+(focus?' focus':'')}/><text className="st-emoji" y={1} textAnchor="middle" dominantBaseline="central" fontSize={28}>{a.icon}</text>
   <text className="an-t small strong-l" y={48} textAnchor="middle">{a.label}</text>{a.sub&&<text className="an-q" y={66} textAnchor="middle">{a.sub}</text>}</>}
  {kind!=='char'&&(()=>{const w=width(a),h=kind==='tag'?30:48;return <><rect className={(kind==='tag'?'an-chip ':'an-box ')+tone+(focus?' active':'')} x={-w/2} y={-h/2} width={w} height={h} rx={kind==='tag'?15:12}/>
   <text className="st-emoji" x={-w/2+(kind==='tag'?16:22)} y={1} textAnchor="middle" dominantBaseline="central" fontSize={kind==='tag'?15:20}>{a.icon}</text>
   <text className="an-t small" x={-w/2+(kind==='tag'?30:40)} y={1} dominantBaseline="central">{a.label}</text>
   {a.sub&&<text className="an-q" y={h/2+16} textAnchor="middle">{a.sub}</text>}</>})()}
 </g></g>}

// 两个角色之间的弧线：起止点从中心向外让出一段距离，避免压住头像。
function sendPath(p:Actor,q:Actor,bend:number){const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,gap=40;
 const x1=p.x+ux*gap,y1=p.y+uy*gap,x2=q.x-ux*gap,y2=q.y-uy*gap,mx=(x1+x2)/2-uy*bend,my=(y1+y2)/2+ux*bend;
 return {d:`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`,len}}

function Bubble({a,text,tone}:{a:Actor;text:string;tone:Tone}){const lines=text.split('\n'),w=Math.max(...lines.map(l=>textWidth(l,13.5)))+26,h=lines.length*20+14;
 const right=a.x+20+w<630,bx=right?a.x+18:a.x-18-w,by=Math.max(6,a.y-60-h/2);
 return <g transform={`translate(${bx} ${by})`}><g className="an-pop"><rect className={'st-bubble '+tone} width={w} height={h} rx={12}/>
  <path className={'st-bubble '+tone} d={right?`M10 ${h-1} L2 ${h+12} L24 ${h-1}`:`M${w-24} ${h-1} L${w-2} ${h+12} L${w-10} ${h-1}`}/>
  {lines.map((l,i)=><text key={i} className="an-t small" x={13} y={24+i*20}>{l}</text>)}</g></g>}

export function storyVisual(beats:Beat[]){return function Visual({step}:{step:number}){const b=beats[step],cast=castAt(beats,step),pos=new Map(cast.map(c=>[c.actor.id,c.actor]));
 return <g><Defs/>
  <g className={'st-cast'+(b.memo?' dim':'')}>
   {(b.send??[]).map((s,k)=>{const p=pos.get(s.from),q=pos.get(s.to);if(!p||!q)return null;const {d,len}=sendPath(p,q,k%2?-26:26),tone=s.tone??'primary',dur=Math.max(1.2,len/150);
    return <g key={`s${step}-${k}`}><path d={d} className={'an-arrow flow '+tone} markerEnd="url(#an-arrow)"/>
     <g><animateMotion dur={dur+'s'} begin={k*0.35+'s'} repeatCount="indefinite" path={d}/>{s.text?<><rect className={'an-chip '+tone} x={-textWidth(s.text,13)/2-12} y={-13} width={textWidth(s.text,13)+24} height={26} rx={13}/><text className="an-t small" textAnchor="middle" dominantBaseline="central">{s.text}</text></>:<circle r={7} className={'an-dot '+(tone==='primary'?'':tone)}/>}</g></g>})}
   {cast.map(c=><ActorView key={c.actor.id} a={c.actor} focus={!!b.focus?.includes(c.actor.id)} leaving={c.gone===step}/>)}
   {b.bubble&&pos.get(b.bubble.who)&&<Bubble key={'b'+step} a={pos.get(b.bubble.who)!} text={b.bubble.text} tone={b.bubble.tone??'base'}/>}
   {b.note&&<g key={'n'+step} className="an-in"><text className="st-note" x={320} y={340} textAnchor="middle">{b.note}</text></g>}
  </g>
  {b.memo&&<Memo key={'m'+step} lines={b.memo}/>}
 </g>}}

// 口诀镜头：字幕之后接着把口诀读出来。
const speechOf=(b:Beat)=>b.memo?.length?`${b.say.replace(/[。！？]?$/,'。')}${b.memo.map(m=>m.replace(/[。；，]$/,'')).join('；')}。`:undefined;
const cueOf=(b:Beat):Cue=>{const tones=Object.values(b.tone??{});return {add:b.add?.length??0,send:b.send?.length??0,drop:b.drop?.length??0,bubble:!!b.bubble,ok:tones.includes('ok')||(b.send??[]).some(s=>s.tone==='ok'),bad:tones.includes('bad')||(b.send??[]).some(s=>s.tone==='bad'),memo:!!b.memo}};

// 动画课堂用的故事动画（关联某个学习关卡）。
export type LessonStory={id:string;level:string;kind:'basic'|'advanced'|'review'|'lazy';icon:string;title:string;summary:string;beats:Beat[]};
export function storyAnimation(o:LessonStory):Animation{return {id:o.id,level:o.level,kind:o.kind,icon:o.icon,title:o.title,summary:o.summary,continuous:true,
 scenes:o.beats.map(b=>({caption:b.say,ms:beatMs(b),cue:cueOf(b),speech:speechOf(b)})),Visual:storyVisual(o.beats)}}

export function fromStory(interview:string,level:string,s:Story):Animation{return {id:'iv-'+interview,interview,level,kind:'interview',continuous:true,icon:'🎬',title:s.title,summary:s.beats[0].say,
 scenes:s.beats.map(b=>({caption:b.say,ms:beatMs(b),cue:cueOf(b),speech:speechOf(b)})),Visual:storyVisual(s.beats)}}
