'use client';
import './animations.css';
import {useEffect,useReducer,useRef} from 'react';
import {Pause,Play,RotateCcw} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import type {Animation} from './types';

const TICK=50,PACE=0.7,FADE=500;
type State={t:number;playing:boolean;speed:number;round:number;prev:number;changedAt:number};
type Action={type:'tick'|'toggle'|'replay'}|{type:'seek';t:number}|{type:'speed';speed:number};

// 动画播放器：像视频一样连续播放，画面在分镜之间交叉淡化；可暂停、拖动进度、调节倍速。
export default function AnimationPlayer({animation}:{animation:Animation}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {scenes,Visual}=animation;
 const lengths=scenes.map(s=>s.ms*PACE),starts=lengths.map((_,i)=>lengths.slice(0,i).reduce((a,b)=>a+b,0)),total=lengths.reduce((a,b)=>a+b,0);
 const stepAt=(t:number)=>{let i=0;while(i<starts.length-1&&t>=starts[i+1])i++;return i};
 const [s,dispatch]=useReducer((s:State,a:Action):State=>{const move=(t:number,playing=s.playing):State=>{const from=stepAt(s.t),to=stepAt(t);return {...s,t,playing,...(to!==from?{prev:from,changedAt:t}:{})}};switch(a.type){
  case 'tick':return s.playing?(s.t+TICK*s.speed>=total?move(total,false):move(s.t+TICK*s.speed)):s;
  case 'toggle':return s.t>=total?{...s,t:0,playing:true,prev:-1,round:s.round+1}:{...s,playing:!s.playing};
  case 'replay':return {...s,t:0,playing:true,prev:-1,changedAt:0,round:s.round+1};
  case 'seek':return {...move(Math.max(0,Math.min(total,a.t))),prev:-1};
  case 'speed':return {...s,speed:a.speed};
 }},{t:0,playing:true,speed:1,round:0,prev:-1,changedAt:0});
 const step=stepAt(s.t),fading=s.prev>=0&&s.prev!==step&&s.t-s.changedAt<FADE*s.speed,done=s.t>=total;
 const stage=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),bar=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!s.playing)return;const timer=setInterval(()=>dispatch({type:'tick'}),TICK);return()=>clearInterval(timer)},[s.playing]);
 // CSS 动画通过 .paused 暂停；SVG 自带的 animateMotion 需要单独暂停。
 useEffect(()=>{const el=svg.current;if(!el)return;if(s.playing)el.unpauseAnimations();else el.pauseAnimations()},[s.playing,step,s.round]);
 useEffect(()=>{const el=stage.current;if(!el)return;const onKey=(e:KeyboardEvent)=>{if(e.key===' '){e.preventDefault();dispatch({type:'toggle'})}else if(e.key==='ArrowRight')dispatch({type:'seek',t:s.t+4000});else if(e.key==='ArrowLeft')dispatch({type:'seek',t:s.t-4000})};el.addEventListener('keydown',onKey);return()=>el.removeEventListener('keydown',onKey)},[s.t]);
 const seek=(e:React.MouseEvent)=>{const r=bar.current!.getBoundingClientRect();dispatch({type:'seek',t:(e.clientX-r.left)/r.width*total})};
 const clock=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 return <div className="an-player" ref={stage} tabIndex={0} aria-label={L('动画播放器：空格暂停或继续，左右方向键快退快进','Animation player: Space to pause or resume, arrow keys to seek')}>
  <div className={'an-stage'+(s.playing?'':' paused')}><svg ref={svg} viewBox="0 0 640 360" role="img" aria-label={animation.title} key={s.round}>
   {fading&&<g key={'prev'+s.prev} className="an-out"><Visual step={s.prev}/></g>}
   <g key={'cur'+step} className={fading?'an-xin':''}><Visual step={step}/></g>
  </svg></div>
  <div className="an-caption" key={s.round+'-'+step}><p>{scenes[step].caption}</p></div>
  <div className="an-timeline" ref={bar} onClick={seek} role="slider" aria-label={L('播放进度','Progress')} aria-valuemin={0} aria-valuemax={Math.round(total/1000)} aria-valuenow={Math.round(s.t/1000)}><i style={{width:s.t/total*100+'%'}}/></div>
  <div className="an-controls">
   <button className="button primary" onClick={()=>dispatch({type:done?'replay':'toggle'})}>{done?<><RotateCcw size={16}/>{L('重播','Replay')}</>:s.playing?<><Pause size={16}/>{L('暂停','Pause')}</>:<><Play size={16}/>{L('播放','Play')}</>}</button>
   <span className="an-clock">{clock(s.t)} / {clock(total)}</span>
   <span className="an-speed">{[1,1.5,2].map(v=><button key={v} className={s.speed===v?'on':''} onClick={()=>dispatch({type:'speed',speed:v})}>{v}×</button>)}</span>
  </div>
 </div>}
