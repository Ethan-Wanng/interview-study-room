'use client';
import './animations.css';
import {useCallback,useEffect,useReducer,useRef} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play,RotateCcw} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import type {Animation} from './types';

const TICK=100;
type State={step:number;elapsed:number;playing:boolean;round:number};
type Action={type:'tick'|'toggle'|'replay'}|{type:'go';step:number};

// 动画播放器：按分镜自动播放，可暂停、跳步、重播；画面由各动画的 Visual 根据当前分镜 step 渲染。
export default function AnimationPlayer({animation}:{animation:Animation}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {scenes,Visual}=animation,last=scenes.length-1;
 // 播放状态集中在一个 reducer 里：计时到点时在同一次更新中切到下一个分镜，最后一个分镜播完后停住。
 const [{step,elapsed,playing,round},dispatch]=useReducer((s:State,a:Action):State=>{switch(a.type){
  case 'tick':{if(!s.playing)return s;const t=s.elapsed+TICK;if(t<scenes[s.step].ms)return {...s,elapsed:t};return s.step<last?{...s,step:s.step+1,elapsed:0}:{...s,elapsed:scenes[s.step].ms,playing:false}}
  case 'go':return {...s,step:Math.max(0,Math.min(last,a.step)),elapsed:0};
  case 'toggle':return {...s,playing:!s.playing};
  case 'replay':return {step:0,elapsed:0,playing:true,round:s.round+1};
 }},{step:0,elapsed:0,playing:true,round:0});
 const setPlaying=(p:boolean)=>{if(p!==playing)dispatch({type:'toggle'})};
 const stage=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null);
 // CSS 动画通过 .paused 暂停；SVG 自带的 animateMotion 需要单独暂停。
 useEffect(()=>{const el=svg.current;if(!el)return;if(playing)el.unpauseAnimations();else el.pauseAnimations()},[playing,step,round]);
 const duration=scenes[step].ms;
 const go=useCallback((i:number)=>dispatch({type:'go',step:i}),[]);
 const replay=()=>dispatch({type:'replay'});
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>dispatch({type:'tick'}),TICK);return()=>clearInterval(timer)},[playing]);
 useEffect(()=>{const el=stage.current;if(!el)return;const onKey=(e:KeyboardEvent)=>{if(e.key===' '){e.preventDefault();dispatch({type:'toggle'})}else if(e.key==='ArrowRight')go(step+1);else if(e.key==='ArrowLeft')go(step-1)};el.addEventListener('keydown',onKey);return()=>el.removeEventListener('keydown',onKey)},[go,step]);
 const finished=!playing&&step===last&&elapsed>=duration;
 return <div className="an-player" ref={stage} tabIndex={0} aria-label={L('动画播放器：空格暂停或继续，左右方向键切换步骤','Animation player: Space to pause or resume, arrow keys to change steps')}>
  <div className={'an-stage'+(playing?'':' paused')}><svg ref={svg} viewBox="0 0 640 360" role="img" aria-label={animation.title} key={round}><Visual step={step}/></svg></div>
  <div className="an-caption" key={round+'-'+step}><span className="an-step">{step+1} / {scenes.length}</span><p>{scenes[step].caption}</p></div>
  <div className="an-progress">{scenes.map((s,i)=><button key={i} aria-label={L(`第 ${i+1} 步`,`Step ${i+1}`)} onClick={()=>go(i)}><i style={{width:i<step?'100%':i===step?Math.min(100,elapsed/duration*100)+'%':'0%'}}/></button>)}</div>
  <div className="an-controls">
   <button className="button secondary" disabled={step===0} onClick={()=>go(step-1)}><ChevronLeft size={16}/>{L('上一步','Back')}</button>
   {finished?<button className="button primary" onClick={replay}><RotateCcw size={16}/>{L('重播','Replay')}</button>:<button className="button primary" onClick={()=>setPlaying(!playing)}>{playing?<><Pause size={16}/>{L('暂停','Pause')}</>:<><Play size={16}/>{L('播放','Play')}</>}</button>}
   <button className="button secondary" disabled={step===last} onClick={()=>go(step+1)}>{L('下一步','Next')}<ChevronRight size={16}/></button>
  </div>
 </div>}
