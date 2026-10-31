'use client';
import './animations.css';
import {useEffect,useMemo,useReducer,useRef,useState,useSyncExternalStore} from 'react';
import {Download,FastForward,Maximize,Minimize,Pause,Play,Rewind,RotateCcw,Speech,Square,Volume2,VolumeX,ZoomIn,ZoomOut} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import type {Animation} from './types';
import {narrationDurations,narrationProgress,playCue,setNarrationRate,speak,stopSpeaking} from './sound';
import {chunkAt,splitLine} from './subtitle';
import {canRecord,recordElement,type Recording} from './record';

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
 // 录音时长（毫秒），打开语音后加载；没有录音的句子为 null，按字数估时长并用语音合成朗读。
 const [durs,setDurs]=useState<(number|null)[]|null>(null);
 useEffect(()=>{if(!voice)return;let live=true;narrationDurations(lines).then(d=>{if(live)setDurs(d)}).catch(()=>{});return()=>{live=false}},[lines,voice]);
 const audioMs=(i:number)=>voice?durs?.[i]??null:null;
 const lengths=scenes.map((sc,i)=>{const d=audioMs(i);return d?Math.max(d+GAP,MIN_SCENE):sc.ms*PACE}),starts=lengths.map((_,i)=>lengths.slice(0,i).reduce((a,b)=>a+b,0)),total=lengths.reduce((a,b)=>a+b,0);
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
 // 旁白没读完时，画面停在当前镜头末尾等它；万一没有回调，按时长估一个最长等待时间兜底。
 const speaking=useRef({on:false,until:0}),played=useRef('');
 useEffect(()=>{if(!s.playing)return;const timer=setInterval(()=>dispatch({type:'tick',hold:speaking.current.on&&Date.now()<speaking.current.until}),TICK);return()=>clearInterval(timer)},[s.playing]);
 useEffect(()=>{setNarrationRate(s.speed)},[s.speed]);
 useEffect(()=>()=>stopSpeaking(),[]);
 const endRef=useRef(onEnd);useEffect(()=>{endRef.current=onEnd});
 useEffect(()=>{if(done&&s.round>=0)endRef.current?.()},[done,s.round]);
 // 音效只在进入新镜头时播放，暂停后继续不重复。
 useEffect(()=>{const key=s.round+'-'+step;if(!sfx||!s.playing||played.current===key)return;played.current=key;playCue(scenes[step].cue,s.speed)},[step,s.round,s.playing,sfx]); // eslint-disable-line react-hooks/exhaustive-deps
 // CSS 动画通过 .paused 暂停；SVG 自带的 animateMotion 需要单独暂停。
 useEffect(()=>{const el=svg.current;if(!el)return;if(s.playing||!s.frozen)el.unpauseAnimations();else el.pauseAnimations()},[s.playing,s.frozen,step,s.round]);
 useEffect(()=>{const el=root.current;if(!el)return;const onKey=(e:KeyboardEvent)=>{if(e.key===' '){e.preventDefault();dispatch({type:'toggle'})}else if(e.key==='ArrowRight')dispatch({type:'jump',by:JUMP});else if(e.key==='ArrowLeft')dispatch({type:'jump',by:-JUMP})};el.addEventListener('keydown',onKey);return()=>el.removeEventListener('keydown',onKey)},[]);

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

 // 全屏：优先用浏览器全屏；不支持的（iPhone Safari）退回铺满窗口的样式。
 const [full,setFull]=useState(false);
 useEffect(()=>{const on=()=>setFull(document.fullscreenElement===root.current);document.addEventListener('fullscreenchange',on);return()=>document.removeEventListener('fullscreenchange',on)},[]);
 const toggleFull=()=>{const el=root.current;if(!el)return;if(document.fullscreenElement)void document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>setFull(f=>!f));else setFull(f=>!f)};

 // 画面内字幕：按舞台宽度切成一行一段；进度来自录音的播放位置，没有录音时按时间估。
 const [stageW,setStageW]=useState(W);
 useEffect(()=>{const el=stage.current;if(!el)return;const ro=new ResizeObserver(([e])=>setStageW(e.contentRect.width));ro.observe(el);return()=>ro.disconnect()},[]);
 const fontSize=Math.round(Math.max(14,Math.min(full?34:22,stageW*0.032))),font=`600 ${fontSize}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
 const chunks=useMemo(()=>splitLine(lines[step],stageW*0.92-24,font),[lines,step,stageW,font]);
 // 开着语音时，填色跟着实际朗读的位置走（录音的播放位置，或语音合成读到的字）；关掉语音时按时间估。
 const d=audioMs(step),local=s.t-starts[step],timeProgress=Math.min(1,local/(lengths[step]*(d?1:0.85)));
 const heard=voice&&!scrub?narrationProgress(lines[step],d):null,progress=heard??timeProgress;
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

 // 下载：从头播放并录下画面和声音，播完自动保存。
 const [rec,setRec]=useState<Recording|null>(null),[msg,setMsg]=useState(''),recRef=useRef<Recording|null>(null);
 useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),8000);return()=>clearTimeout(t)},[msg]);
 const download=async()=>{if(rec){rec.stop();return}
  if(!canRecord()){setMsg(L('录制视频需要电脑版 Chrome 或 Edge 浏览器（需要“区域截取”功能），当前浏览器不支持。','Recording needs desktop Chrome or Edge (Region Capture); this browser does not support it.'));return}
  if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});setFull(false);setView({z:1,x:0,y:0});
  try{const r=await recordElement(stage.current!,animation.title,ok=>{recRef.current=null;setRec(null);setMsg(ok?L('视频已保存到下载文件夹。','Saved to your downloads.'):L('没有录到内容。','Nothing was recorded.'))});
   recRef.current=r;setRec(r);setMsg(L('录制中：请保持这个标签页在前台，播完会自动保存。','Recording: keep this tab in front; it saves when playback ends.'));dispatch({type:'replay'})}
  catch(e){setMsg((e as Error)?.message==='crop'?L('请在弹窗里选择“此标签页”再开始录制。','Choose “This tab” in the share dialog.'):L('已取消录制。','Recording cancelled.'))}};
 useEffect(()=>{if(!done||!rec)return;const t=setTimeout(()=>rec.stop(),800);return()=>clearTimeout(t)},[done,rec]);
 useEffect(()=>()=>recRef.current?.stop(),[]);

 const clock=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 const vb=`${view.x} ${view.y} ${W/view.z} ${H/view.z}`,chunk=chunks[ci]?.text??'';
 return <div className={'an-player'+(full?' is-full':'')} ref={root} tabIndex={0} aria-label={L('动画播放器：空格暂停或继续，左右方向键快退快进 10 秒','Animation player: Space to pause or resume, arrow keys to seek 10 s')}>
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
    <button className={rec?'on rec':''} onClick={()=>void download()} title={rec?L('停止录制并保存','Stop and save'):L('下载视频：从头播放并录制（电脑版 Chrome / Edge）','Download video: replays and records (desktop Chrome / Edge)')} aria-label={rec?L('停止录制','Stop recording'):L('下载视频','Download video')}>{rec?<Square size={15}/>:<Download size={15}/>}</button></span>
  </div>
  {msg&&<p className="an-msg" role="status">{msg}</p>}
 </div>
}
