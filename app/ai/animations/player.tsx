'use client';
import './animations.css';
import {useEffect,useMemo,useReducer,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {Download,FastForward,Maximize,Minimize,Pause,Play,Rewind,RotateCcw,Speech,Square,Volume2,VolumeX,X,ZoomIn,ZoomOut} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import type {Animation} from './types';
import {narrationDurations,narrationProgress,narrationTimings,playCue,setNarrationRate,speak,stopSpeaking} from './sound';
import {chunkAt,resolveSceneDuration,splitLine,subtitleProgress,type SceneTiming} from './subtitle';
import {cancelAnimationDownload,startAnimationDownload,useAnimationDownloads} from './download-manager';

// PACE：关掉语音时按字数估的镜头时长再乘的系数；GAP：有录音时读完到下一镜的停顿；W×H：画布尺寸。
const TICK=50,PACE=0.6,FADE=300,GAP=300,MIN_SCENE=1500,JUMP=10000,W=640,H=360,MAX_ZOOM=3;
// frozen：暂停时冻结画面里的动效；暂停状态下拖动到别处时解冻，让新画面完整出现。
type State={t:number;playing:boolean;speed:number;round:number;prev:number;changedAt:number;seeks:number;frozen:boolean};
type Action={type:'tick';hold:boolean}|{type:'toggle'|'replay'}|{type:'seek';t:number}|{type:'jump';by:number}|{type:'remap';t:number}|{type:'speed';speed:number};
type View={z:number;x:number;y:number};

// 声音偏好（音效、语音旁白）保存在本浏览器，所有动画共用；默认都开启。
const SOUND_KEY='an-sound',soundEvent='an-sound-change';
const subscribeSound=(notify:()=>void)=>{window.addEventListener(soundEvent,notify);window.addEventListener('storage',notify);return()=>{window.removeEventListener(soundEvent,notify);window.removeEventListener('storage',notify)}};
const readSound=()=>{try{return localStorage.getItem(SOUND_KEY)??'sfx,voice'}catch{return 'sfx,voice'}};
const writeSound=(v:string)=>{try{localStorage.setItem(SOUND_KEY,v)}catch{}window.dispatchEvent(new Event(soundEvent))};
const clampView=(v:View):View=>{const z=Math.min(MAX_ZOOM,Math.max(1,v.z)),w=W/z,h=H/z;return {z,x:Math.min(W-w,Math.max(0,v.x)),y:Math.min(H-h,Math.max(0,v.y))}};
const zoomTo=(v:View,to:number):View=>{const z=Math.min(MAX_ZOOM,Math.max(1,to)),cx=v.x+W/v.z/2,cy=v.y+H/v.z/2;return clampView({z,x:cx-W/z/2,y:cy-H/z/2})};

// 动画播放器：像视频一样连续播放，画面在分镜之间交叉淡化；可暂停、拖动进度、快进快退、调节倍速、放大拖动、全屏和录成视频。
// 有旁白录音时，每一镜的长度 = 录音时长 + 短停顿；字幕在画面底部一行一行显示，读到哪里颜色填到哪里。
// onEnd：播放到结尾时回调一次（懒人模式用它自动进入下一题）。
export default function AnimationPlayer({animation,onEnd}:{animation:Animation;onEnd?:()=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {scenes,Visual}=animation,lines=useMemo(()=>scenes.map(s=>s.speech??s.caption),[scenes]);
 const sound=useSyncExternalStore(subscribeSound,readSound,()=>''),sfx=sound.includes('sfx'),voice=sound.includes('voice');
 const toggleSound=(k:'sfx'|'voice')=>{const on=new Set(readSound().split(',').filter(Boolean));if(on.has(k))on.delete(k);else on.add(k);writeSound([...on].join(','))};
 // 录音时长（毫秒）与导演台自定义影片/字幕校准（timing.json），打开语音后加载；没有录音的句子为 null，按字数估时长并用语音合成朗读。
 const [durs,setDurs]=useState<(number|null)[]|null>(null);
 const [timings,setTimings]=useState<(SceneTiming|null)[]|null>(null);
 useEffect(()=>{let live=true;narrationTimings(lines).then(t=>{if(live)setTimings(t)}).catch(()=>{});return()=>{live=false}},[lines]);
 useEffect(()=>{if(!voice)return;let live=true;narrationDurations(lines).then(d=>{if(live)setDurs(d)}).catch(()=>{});return()=>{live=false}},[lines,voice]);
 const audioMs=(i:number)=>voice?durs?.[i]??null:null;
 const lengths=scenes.map((sc,i)=>resolveSceneDuration(sc.ms,audioMs(i),timings?.[i],GAP,MIN_SCENE,PACE)),starts=lengths.map((_,i)=>lengths.slice(0,i).reduce((a,b)=>a+b,0)),total=lengths.reduce((a,b)=>a+b,0);
 const stepAt=(t:number)=>{let i=0;while(i<starts.length-1&&t>=starts[i+1])i++;return i};
 const [s,dispatch]=useReducer((s:State,a:Action):State=>{const move=(t:number,playing=s.playing):State=>{const from=stepAt(s.t),to=stepAt(t);return {...s,t,playing,...(to!==from?{prev:from,changedAt:t}:{})}};switch(a.type){
  case 'tick':{if(!s.playing)return s;let t=s.t+TICK*s.speed;if(a.hold){const i=stepAt(s.t),end=i<starts.length-1?starts[i+1]:total;t=Math.min(t,Math.max(s.t,end-1))}return t>=total?move(total,false):move(t)}
  case 'toggle':return s.t>=total?{...s,t:0,playing:true,prev:-1,round:s.round+1}:{...s,playing:!s.playing,frozen:s.playing};
  case 'replay':return {...s,t:0,playing:true,prev:-1,changedAt:0,round:s.round+1};
  case 'seek':return {...move(Math.max(0,Math.min(total-1,a.t))),prev:-1,seeks:s.seeks+1,frozen:false};
  case 'jump':return {...move(Math.max(0,Math.min(total-1,s.t+a.by))),prev:-1,seeks:s.seeks+1,frozen:false};
  case 'remap':return {...s,t:a.t,prev:-1};
  case 'speed':return {...s,speed:a.speed};
 }},{t:0,playing:true,speed:1,round:0,prev:-1,changedAt:0,seeks:0,frozen:false});
 // 开关语音或录音时长加载后，每一镜的长度会变：按“第几镜 + 镜内比例”换算到新时间轴，画面和进度不跳。
 const layout=lengths.join(','),[shown,setShown]=useState({layout,lengths});
 if(shown.layout!==layout){let i=0,at=0;while(i<shown.lengths.length-1&&s.t>=at+shown.lengths[i])at+=shown.lengths[i++];
  const frac=Math.min(1,(s.t-at)/(shown.lengths[i]||1)),k=Math.min(i,lengths.length-1);setShown({layout,lengths});
  const ended=s.t>=shown.lengths.reduce((a,b)=>a+b,0);dispatch({type:'remap',t:ended?total:Math.min(total-1,starts[k]+frac*lengths[k])})}
 const step=stepAt(s.t),fading=s.prev>=0&&s.prev!==step&&s.t-s.changedAt<FADE*s.speed,done=s.t>=total;
 const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),bar=useRef<HTMLDivElement>(null);
 const [scrub,setScrub]=useState(false);
 // 旁白没读完时，画面停在当前镜头末尾等它（除非导演台显式设定了分镜影片时长 sceneMs）；万一没有回调，按时长估一个最长等待时间兜底。
 const speaking=useRef({on:false,until:0}),played=useRef(''),explicitMsRef=useRef(false);
 useEffect(()=>{explicitMsRef.current=Boolean(timings?.[step]?.sceneMs)},[timings,step]);
 useEffect(()=>{if(!s.playing)return;const timer=setInterval(()=>dispatch({type:'tick',hold:!explicitMsRef.current&&speaking.current.on&&Date.now()<speaking.current.until}),TICK);return()=>clearInterval(timer)},[s.playing]);
 useEffect(()=>{setNarrationRate(s.speed)},[s.speed]);
 useEffect(()=>()=>stopSpeaking(),[]);
 const endRef=useRef(onEnd);useEffect(()=>{endRef.current=onEnd});
 useEffect(()=>{if(done&&s.round>=0)endRef.current?.()},[done,s.round]);
 // 音效只在进入新镜头时播放，暂停后继续不重复。
 useEffect(()=>{const key=s.round+'-'+step;if(!sfx||!s.playing||played.current===key)return;played.current=key;playCue(scenes[step].cue,s.speed)},[step,s.round,s.playing,sfx]); // eslint-disable-line react-hooks/exhaustive-deps
 const [full,setFull]=useState(false);
 const [nativeFull,setNativeFull]=useState(false);
 const portalFull=full&&!nativeFull;
 // CSS 动画通过 .paused 暂停；SVG 自带的 animateMotion 需要单独暂停。
 useEffect(()=>{const el=svg.current;if(!el)return;if(s.playing||!s.frozen)el.unpauseAnimations();else el.pauseAnimations()},[s.playing,s.frozen,step,s.round,portalFull]);
 useEffect(()=>{const el=root.current;if(!el)return;const onKey=(e:KeyboardEvent)=>{if(e.key===' '){e.preventDefault();dispatch({type:'toggle'})}else if(e.key==='ArrowRight')dispatch({type:'jump',by:JUMP});else if(e.key==='ArrowLeft')dispatch({type:'jump',by:-JUMP})};el.addEventListener('keydown',onKey);return()=>el.removeEventListener('keydown',onKey)},[portalFull]);

 // 进度条：按下后拖动，松开时从新位置继续朗读。
 const seekTo=(x:number)=>{const r=bar.current!.getBoundingClientRect();dispatch({type:'seek',t:Math.max(0,Math.min(1,(x-r.left)/r.width))*total})};
 const capture=(e:React.PointerEvent)=>{try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}};
 const barDown=(e:React.PointerEvent)=>{capture(e);setScrub(true);seekTo(e.clientX)};
 const barMove=(e:React.PointerEvent)=>{if(scrub)seekTo(e.clientX)};
 const barUp=()=>{if(scrub)setScrub(false)};

 // 放大与拖动：改 SVG 的 viewBox，矢量画面放大后依然清晰。
 const [view,setView]=useState<View>({z:1,x:0,y:0}),pan=useRef<{x:number;y:number;v:View}|null>(null);
 const panDown=(e:React.PointerEvent)=>{if(view.z<=1)return;capture(e);pan.current={x:e.clientX,y:e.clientY,v:view}};
 const panMove=(e:React.PointerEvent)=>{const p=pan.current,el=svg.current;if(!p||!el)return;const k=W/p.v.z/el.clientWidth;setView(clampView({...p.v,x:p.v.x-(e.clientX-p.x)*k,y:p.v.y-(e.clientY-p.y)*k}))};
 const panUp=()=>{pan.current=null};

 // 全屏：优先用浏览器全屏；不支持或被拒绝时（iPhone Safari / 移动端 WebView）通过 Portal 挂到 body，避免被祖先 backdrop-filter/transform 截断。
 useEffect(()=>{
  const on=()=>{
   const active=document.fullscreenElement===root.current;
   setNativeFull(active);
   setFull(active);
   if(!active){try{screen.orientation?.unlock?.()}catch{}}
  };
  document.addEventListener('fullscreenchange',on);
  return()=>{document.removeEventListener('fullscreenchange',on);try{screen.orientation?.unlock?.()}catch{}};
 },[]);
 useEffect(()=>{
  if(!portalFull)return;
  const prevOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onEsc=(e:KeyboardEvent)=>{if(e.key==='Escape')setFull(false)};
  window.addEventListener('keydown',onEsc);
  return()=>{document.body.style.overflow=prevOverflow;window.removeEventListener('keydown',onEsc)};
 },[portalFull]);
 const toggleFull=()=>{
  const el=root.current;if(!el)return;
  if(document.fullscreenElement){void document.exitFullscreen();return}
  if(full){setFull(false);return}
  if(el.requestFullscreen){
   el.requestFullscreen()
    .then(()=>{
     if(window.innerWidth<=900){
      const ori=screen.orientation as (ScreenOrientation&{lock?:(t:string)=>Promise<void>})|undefined;
      ori?.lock?.('landscape').catch(()=>{});
     }
    })
    .catch(()=>setFull(true));
  }else{
   setFull(true);
  }
 };

 // 画面内字幕：按舞台宽度切成一行一段；进度来自录音的播放位置，没有录音时按时间估。
 const [stageW,setStageW]=useState(W);
 useEffect(()=>{const el=stage.current;if(!el)return;setStageW(el.getBoundingClientRect().width||W);const ro=new ResizeObserver(([e])=>setStageW(e.contentRect.width));ro.observe(el);return()=>ro.disconnect()},[portalFull]);
 const fontSize=Math.round(Math.max(14,Math.min(full?34:22,stageW*0.032))),font=`600 ${fontSize}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
 const chunks=useMemo(()=>splitLine(lines[step],stageW*0.92-24,font),[lines,step,stageW,font]);
 // 开着语音时，填色跟着实际朗读的位置走（录音的播放位置 + 导演台字幕校准）；关掉语音时按时间估。
 const d=audioMs(step),tm=timings?.[step]??null,local=s.t-starts[step],timeProgress=d?subtitleProgress(local,d,tm):Math.min(1,local/(lengths[step]*0.85));
 const heard=voice&&!scrub?narrationProgress(lines[step],d,tm):null,progress=heard??timeProgress;
 const {index:ci,fill}=chunkAt(chunks,progress);
 // 朗读：换镜时从头读；暂停后继续时从字幕当前这一段的开头接着读；拖动进度后按新位置读。
 // 关掉语音时，字幕从语音实际读到的位置接着按时间走；再打开时，从字幕正显示的这一段开头读起。两边始终对得上。
 // 有录音时直接从对应的毫秒处播放；语音合成从对应的字读起，读完前画面停在这一镜末尾等它。
 const lastSeeks=useRef(s.seeks),lastVoice=useRef(voice);
 useEffect(()=>{const seeked=lastSeeks.current!==s.seeks,voiceOn=voice&&!lastVoice.current,voiceOff=!voice&&lastVoice.current;lastSeeks.current=s.seeks;lastVoice.current=voice;
  if(!voice||!s.playing||scrub){speaking.current.on=false;stopSpeaking();
   const p=voiceOff&&!durs?.[step]?narrationProgress(lines[step]):null;
   if(p!==null)dispatch({type:'remap',t:Math.min(starts[step]+p*lengths[step]*0.85,starts[step]+lengths[step]-1)});
   return}
  const text=lines[step],d=audioMs(step),offset=d?Math.max(0,s.t-starts[step]):0;
  if(d&&offset>=d){speaking.current.on=false;return} // 拖到了这句读完之后的停顿里
  const p=d?0:seeked||voiceOn?timeProgress:narrationProgress(text)??timeProgress;
  if(!d&&p>=0.999){speaking.current.on=false;return} // 这句已经读完
  const frac=p>0?chunks[chunkAt(chunks,p).index].from:0;
  const state={on:true,until:Date.now()+((d?d-offset:[...text].length*(1-frac)*380)+3000)/s.speed};speaking.current=state;
  speak(text,s.speed,()=>{state.on=false},offset,frac);
  return()=>{state.on=false};
 },[step,s.round,s.playing,s.seeks,voice,scrub]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在换镜、跳转、暂停继续、开关语音时重新朗读

 // 下载：交由全局后台静默合成管理器处理，进度和取消入口放在顶栏「下载」按钮下，离开此页也不会停止。
 const jobs=useAnimationDownloads(),activeJob=jobs.find(j=>j.id===animation.id);
 const exportPct=activeJob?.status==='running'?activeJob.pct:null;
 const [msg,setMsg]=useState('');
 useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),8000);return()=>clearTimeout(t)},[msg]);
 const download=()=>{if(exportPct!==null){cancelAnimationDownload(animation.id);setMsg(L('已取消视频合成。','Video synthesis cancelled.'));return}
  const r=startAnimationDownload(animation,stage.current!,{sfx,voice});
  if(r==='unsupported')setMsg(L('当前浏览器不支持后台合成视频，请换用新版桌面 Chrome、Edge 或 Firefox。','This browser cannot synthesize video; try desktop Chrome, Edge or Firefox.'));
  else if(r==='failed')setMsg(L('视频合成没有启动，请重试。','Could not start video synthesis; please try again.'));
  else setMsg(L('已加入顶栏「下载」按钮后台静默合成，离开当前页面也会继续，完成后自动保存。','Added to header Download button — continues silently even if you leave this page.'))};

 const clock=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 const vb=`${view.x} ${view.y} ${W/view.z} ${H/view.z}`,chunk=chunks[ci]?.text??'';
 const playerEl=<div className={'an-player'+(full?' is-full':'')} ref={root} tabIndex={0} aria-label={L('动画播放器：空格暂停或继续，左右方向键快退快进 10 秒','Animation player: Space to pause or resume, arrow keys to seek 10 s')}>
  {full&&<button type="button" className="an-full-exit" onClick={toggleFull} aria-label={L('退出全屏','Exit full screen')} title={L('退出全屏','Exit full screen')}><X size={20}/></button>}
  <div className={'an-stage'+(!s.playing&&s.frozen&&!done?' paused':'')+(view.z>1?' zoomed':'')} ref={stage}>
   <svg ref={svg} viewBox={vb} role="img" aria-label={animation.title} key={s.round} onPointerDown={panDown} onPointerMove={panMove} onPointerUp={panUp} onPointerCancel={panUp}>
    {animation.continuous?<Visual step={step}/>:<>
     {fading&&<g key={'prev'+s.prev} className="an-out"><Visual step={s.prev}/></g>}
     <g key={'cur'+step} className={fading?'an-xin':''}><Visual step={step}/></g></>}
   </svg>
   <div className="an-sub" style={{fontSize,font}} aria-live="polite"><span className="an-sub-line" key={s.round+'-'+step+'-'+ci}><span>{chunk}</span><span className="an-sub-fill" aria-hidden style={{clipPath:`inset(0 ${(1-fill)*100}% 0 0)`}}>{chunk}</span></span></div>
  </div>
  <div className={'an-timeline'+(scrub?' scrub':'')} ref={bar} onPointerDown={barDown} onPointerMove={barMove} onPointerUp={barUp} onPointerCancel={barUp} role="slider" tabIndex={-1} aria-label={L('播放进度','Progress')} aria-valuemin={0} aria-valuemax={Math.round(total/1000)} aria-valuenow={Math.round(s.t/1000)}><i style={{width:s.t/total*100+'%'}}/><b style={{left:s.t/total*100+'%'}}/></div>
  <div className="an-controls">
   <button className="button primary" onClick={()=>dispatch({type:done?'replay':'toggle'})}>{done?<><RotateCcw size={16}/>{L('重播','Replay')}</>:s.playing?<><Pause size={16}/>{L('暂停','Pause')}</>:<><Play size={16}/>{L('播放','Play')}</>}</button>
   <span className="an-speed an-icons"><button onClick={()=>dispatch({type:'jump',by:-JUMP})} title={L('后退 10 秒','Back 10 s')} aria-label={L('后退 10 秒','Back 10 s')}><Rewind size={15}/><span>10</span></button><button onClick={()=>dispatch({type:'jump',by:JUMP})} title={L('前进 10 秒','Forward 10 s')} aria-label={L('前进 10 秒','Forward 10 s')}><FastForward size={15}/><span>10</span></button></span>
   <span className="an-clock">{clock(s.t)} / {clock(total)}</span>
   <span className="an-speed">{[1,1.5,2].map(v=><button key={v} className={s.speed===v?'on':''} onClick={()=>dispatch({type:'speed',speed:v})}>{v}×</button>)}</span>
   <span className="an-speed an-sound"><button className={sfx?'on':''} aria-pressed={sfx} onClick={()=>toggleSound('sfx')} title={L('音效','Sound effects')}>{sfx?<Volume2 size={15}/>:<VolumeX size={15}/>}<span>{L('音效','Sound')}</span></button>
    <button className={voice?'on':''} aria-pressed={voice} onClick={()=>toggleSound('voice')} title={L('语音旁白：朗读字幕，读完再进入下一镜','Narration: reads captions aloud and waits for it')}><Speech size={15}/><span>{L('语音','Voice')}</span></button></span>
   <span className="an-speed an-icons"><button onClick={()=>setView(v=>zoomTo(v,v.z-0.5))} disabled={view.z<=1} title={L('缩小','Zoom out')} aria-label={L('缩小','Zoom out')}><ZoomOut size={15}/></button>
    <button className="an-zoom" onClick={()=>setView({z:1,x:0,y:0})} disabled={view.z<=1} title={L('还原大小','Reset zoom')}>{view.z.toFixed(1).replace(/\.0$/,'')}×</button>
    <button onClick={()=>setView(v=>zoomTo(v,v.z+0.5))} disabled={view.z>=MAX_ZOOM} title={L('放大（放大后可拖动画面）','Zoom in (drag to pan)')} aria-label={L('放大','Zoom in')}><ZoomIn size={15}/></button></span>
   <span className="an-speed an-icons"><button onClick={toggleFull} title={full?L('退出全屏','Exit full screen'):L('全屏','Full screen')} aria-label={full?L('退出全屏','Exit full screen'):L('全屏','Full screen')}>{full?<Minimize size={15}/>:<Maximize size={15}/>}</button>
    <button className={exportPct!==null?'on rec':''} onClick={download} title={exportPct!==null?L(`后台合成中 ${exportPct}% · 可在顶栏下载按钮查看或点击取消`,`Synthesizing ${exportPct}% · view in header Download button or click to cancel`):L('下载视频：交由顶栏后台静默合成，离开此页也会继续','Download video: silently synthesizes in header even if you leave this page')} aria-label={exportPct!==null?L('取消下载','Cancel download'):L('下载视频','Download video')}>{exportPct!==null?<><Square size={14}/><span>{exportPct}%</span></>:<Download size={15}/>}</button></span>
  </div>
  {msg&&<p className="an-msg" role="status">{msg}</p>}
 </div>;
 return portalFull&&typeof document!=='undefined'?createPortal(playerEl,document.body):playerEl;
}
