import type {CSSProperties,ReactNode} from 'react';

// 动画画面的公共零件。位置用外层 <g transform> 决定，动效写在内层，避免 CSS transform 覆盖 SVG 的定位。
export type Tone='base'|'primary'|'ok'|'bad'|'quiet'|'warm';
type Vars=CSSProperties&Record<`--${string}`,string|number>;

// 中文按 16px、其他字符按 8.5px 估算宽度。
export const textWidth=(t:string,size=15)=>[...t].reduce((w,c)=>w+(c.charCodeAt(0)>255?size+1:size*0.58),0);
export const chipWidth=(t:string)=>Math.round(textWidth(t)+24);

export function Defs(){return <defs>
 <marker id="an-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="an-arrowhead"/></marker>
 <filter id="an-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>}

// 出现动画：in 淡入上浮，pop 弹出，fly 从 from 坐标飞到目标位置。
export function Enter({x=0,y=0,mode='in',from,delay=0,children}:{x?:number;y?:number;mode?:'in'|'pop'|'fly';from?:[number,number];delay?:number;children:ReactNode}){
 const style:Vars={animationDelay:delay+'ms'};if(from){style['--fx']=(from[0]-x)+'px';style['--fy']=(from[1]-y)+'px'}
 return <g transform={`translate(${x} ${y})`}><g className={'an-'+(from?'fly':mode)} style={style}>{children}</g></g>}

export function Chip({x,y,text,tone='base',from,delay=0,mode='in'}:{x:number;y:number;text:string;tone?:Tone;from?:[number,number];delay?:number;mode?:'in'|'pop'}){const w=chipWidth(text);
 return <Enter x={x} y={y} from={from} delay={delay} mode={mode}><rect className={'an-chip '+tone} width={w} height={32} rx={16}/><text className="an-t" x={w/2} y={16} textAnchor="middle" dominantBaseline="central">{text}</text></Enter>}

export function Box({x,y,w,h,title,sub,tone='base',active=false,delay=0}:{x:number;y:number;w:number;h:number;title:string;sub?:string;tone?:Tone;active?:boolean;delay?:number}){
 return <Enter x={x} y={y} delay={delay}><rect className={'an-box '+tone+(active?' active':'')} width={w} height={h} rx={14}/><text className="an-t strong" x={w/2} y={sub?h/2-9:h/2} textAnchor="middle" dominantBaseline="central">{title}</text>{sub&&<text className="an-q" x={w/2} y={h/2+13} textAnchor="middle" dominantBaseline="central">{sub}</text>}</Enter>}

// 带流动虚线的箭头；flow=false 时为静止的细线。
export function Arrow({d,flow=true,tone='quiet',delay=0}:{d:string;flow?:boolean;tone?:Tone;delay?:number}){return <path d={d} className={'an-arrow '+tone+(flow?' flow':'')} markerEnd="url(#an-arrow)" style={{animationDelay:delay+'ms'}}/>}

// 从左向右增长的条形，p 为 0–1。
export function Bar({x,y,w,h=18,p,tone='primary',delay=0}:{x:number;y:number;w:number;h?:number;p:number;tone?:Tone;delay?:number}){
 return <g transform={`translate(${x} ${y})`}><rect className="an-track" width={w} height={h} rx={h/2}/><rect className={'an-bar '+tone} width={w} height={h} rx={h/2} style={{'--p':p,animationDelay:delay+'ms'} as Vars}/></g>}

// 结尾的记忆口诀卡片。
export function Memo({lines,title='记住'}:{lines:string[];title?:string}){return <Enter x={110} y={96} mode="pop"><rect className="an-memo" width={420} height={168} rx={22}/><text className="an-memo-title" x={210} y={40} textAnchor="middle">{title}</text>{lines.map((l,i)=><text key={i} className="an-memo-line" x={210} y={84+i*36} textAnchor="middle">{l}</text>)}</Enter>}

// 画面左上角的小标签。
export const Label=({x,y,children}:{x:number;y:number;children:ReactNode})=><text className="an-label" x={x} y={y}>{children}</text>;
