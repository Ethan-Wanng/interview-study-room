'use client';
import './animations.css';
import {useEffect,useReducer,useRef,useSyncExternalStore} from 'react';
import {Pause,Play,RotateCcw,Speech,Volume2,VolumeX} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import type {Animation} from './types';
import {playCue,speak,stopSpeaking,voiceSupported} from './sound';

const TICK=50,PACE=0.7,FADE=500;
type State={t:number;playing:boolean;speed:number;round:number;prev:number;changedAt:number};
type Action={type:'tick';hold:boolean}|{type:'toggle'|'replay'}|{type:'seek';t:number}|{type:'speed';speed:number};

// 声音偏好（音效、语音旁白）保存在本浏览器，所有动画共用；默认都开启。
const SOUND_KEY='an-sound',soundEvent='an-sound-change';
const subscribeSound=(notify:()=>void)=>{window.addEventListener(soundEvent,notify);window.addEventListener('storage',notify);return()=>{window.removeEventListener(soundEvent,notify);window.removeEventListener('storage',notify)}};
const readSound=()=>{try{return localStorage.getItem(SOUND_KEY)??'sfx,voice'}catch{return 'sfx,voice'}};
const writeSound=(v:string)=>{try{localStorage.setItem(SOUND_KEY,v)}catch{}window.dispatchEvent(new Event(soundEvent))};

// 动画播放器：像视频一样连续播放，画面在分镜之间交叉淡化；可暂停、拖动进度、调节倍速。
// onEnd：播放到结尾时回调一次（懒人模式用它自动进入下一题）。
export default function AnimationPlayer({animation,onEnd}:{animation:Animation;onEnd?:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {scenes,Visual}=animation;
 const lengths=scenes.map(s=>s.ms*PACE),starts=lengths.map((_,i)=>lengths.slice(0,i).reduce((a,b)=>a+b,0)),total=lengths.reduce((a,b)=>a+b,0);
 const stepAt=(t:number)=>{let i=0;while(i<starts.length-1&&t>=starts[i+1])i++;return i};
 const [s,dispatch]=useReducer((s:State,a:Action):State=>{const move=(t:number,playing=s.playing):State=>{const from=stepAt(s.t),to=stepAt(t);return {...s,t,playing,...(to!==from?{prev:from,changedAt:t}:{})}};switch(a.type){
  case 'tick':{if(!s.playing)return s;let t=s.t+TICK*s.speed;if(a.hold){const i=stepAt(s.t),end=i<starts.length-1?starts[i+1]:total;t=Math.min(t,Math.max(s.t,end-1))}return t>=total?move(total,false):move(t)}
  case 'toggle':return s.t>=total?{...s,t:0,playing:true,prev:-1,round:s.round+1}:{...s,playing:!s.playing};
  case 'replay':return {...s,t:0,playing:true,prev:-1,changedAt:0,round:s.round+1};
  case 'seek':return {...move(Math.max(0,Math.min(total,a.t))),prev:-1};
  case 'speed':return {...s,speed:a.speed};
 }},{t:0,playing:true,speed:1,round:0,prev:-1,changedAt:0});
 const step=stepAt(s.t),fading=s.prev>=0&&s.prev!==step&&s.t-s.changedAt<FADE*s.speed,done=s.t>=total;
 const stage=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),bar=useRef<HTMLDivElement>(null);
 const sound=useSyncExternalStore(subscribeSound,readSound,()=>''),sfx=sound.includes('sfx'),voice=sound.includes('voice')&&voiceSupported();
 const toggleSound=(k:'sfx'|'voice')=>{const on=new Set(readSound().split(',').filter(Boolean));if(on.has(k))on.delete(k);else on.add(k);writeSound([...on].join(','))};
 // 旁白没读完时，画面停在当前镜头末尾等它；万一语音引擎不回调，按字数估一个最长等待时间兜底。
 const speaking=useRef({on:false,until:0}),played=useRef('');
 useEffect(()=>{if(!s.playing)return;const timer=setInterval(()=>dispatch({type:'tick',hold:speaking.current.on&&Date.now()<speaking.current.until}),TICK);return()=>clearInterval(timer)},[s.playing]);
 useEffect(()=>{if(!voice||!s.playing){speaking.current.on=false;stopSpeaking();return}
  const text=scenes[step].speech??scenes[step].caption,state={on:true,until:Date.now()+([...text].length*380+3000)/s.speed};speaking.current=state;
  speak(text,1.15*s.speed,()=>{state.on=false});
  return()=>{state.on=false};
 },[step,s.round,s.playing,voice]); // eslint-disable-line react-hooks/exhaustive-deps -- 倍速变化从下一镜生效
 useEffect(()=>()=>stopSpeaking(),[]);
 const endRef=useRef(onEnd);useEffect(()=>{endRef.current=onEnd});
 useEffect(()=>{if(done&&s.round>=0)endRef.current?.()},[done,s.round]);
 // 音效只在进入新镜头时播放，暂停后继续不重复。
 useEffect(()=>{const key=s.round+'-'+step;if(!sfx||!s.playing||played.current===key)return;played.current=key;playCue(scenes[step].cue,s.speed)},[step,s.round,s.playing,sfx]); // eslint-disable-line react-hooks/exhaustive-deps
 // CSS 动画通过 .paused 暂停；SVG 自带的 animateMotion 需要单独暂停。
 useEffect(()=>{const el=svg.current;if(!el)return;if(s.playing)el.unpauseAnimations();else el.pauseAnimations()},[s.playing,step,s.round]);
 useEffect(()=>{const el=stage.current;if(!el)return;const onKey=(e:KeyboardEvent)=>{if(e.key===' '){e.preventDefault();dispatch({type:'toggle'})}else if(e.key==='ArrowRight')dispatch({type:'seek',t:s.t+4000});else if(e.key==='ArrowLeft')dispatch({type:'seek',t:s.t-4000})};el.addEventListener('keydown',onKey);return()=>el.removeEventListener('keydown',onKey)},[s.t]);
 const seek=(e:React.MouseEvent)=>{const r=bar.current!.getBoundingClientRect();dispatch({type:'seek',t:(e.clientX-r.left)/r.width*total})};
 const clock=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 return <div className="an-player" ref={stage} tabIndex={0} aria-label={L('动画播放器：空格暂停或继续，左右方向键快退快进','Animation player: Space to pause or resume, arrow keys to seek')}>
  <div className={'an-stage'+(!s.playing&&!done?' paused':'')}><svg ref={svg} viewBox="0 0 640 360" role="img" aria-label={animation.title} key={s.round}>
   {animation.continuous?<Visual step={step}/>:<>
    {fading&&<g key={'prev'+s.prev} className="an-out"><Visual step={s.prev}/></g>}
    <g key={'cur'+step} className={fading?'an-xin':''}><Visual step={step}/></g></>}
  </svg></div>
  <div className="an-caption" key={s.round+'-'+step}><p>{scenes[step].caption}</p></div>
  <div className="an-timeline" ref={bar} onClick={seek} role="slider" aria-label={L('播放进度','Progress')} aria-valuemin={0} aria-valuemax={Math.round(total/1000)} aria-valuenow={Math.round(s.t/1000)}><i style={{width:s.t/total*100+'%'}}/></div>
  <div className="an-controls">
   <button className="button primary" onClick={()=>dispatch({type:done?'replay':'toggle'})}>{done?<><RotateCcw size={16}/>{L('重播','Replay')}</>:s.playing?<><Pause size={16}/>{L('暂停','Pause')}</>:<><Play size={16}/>{L('播放','Play')}</>}</button>
   <span className="an-clock">{clock(s.t)} / {clock(total)}</span>
   <span className="an-speed">{[1,1.5,2].map(v=><button key={v} className={s.speed===v?'on':''} onClick={()=>dispatch({type:'speed',speed:v})}>{v}×</button>)}</span>
   <span className="an-speed an-sound"><button className={sfx?'on':''} aria-pressed={sfx} onClick={()=>toggleSound('sfx')} title={L('音效','Sound effects')}>{sfx?<Volume2 size={15}/>:<VolumeX size={15}/>}<span>{L('音效','Sound')}</span></button>
    {voiceSupported()&&<button className={voice?'on':''} aria-pressed={voice} onClick={()=>toggleSound('voice')} title={L('语音旁白：朗读字幕，读完再进入下一镜','Narration: reads captions aloud and waits for it')}><Speech size={15}/><span>{L('语音','Voice')}</span></button>}</span>
  </div>
 </div>}
