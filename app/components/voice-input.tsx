'use client';
import {useEffect,useRef,useState} from 'react';
import {Loader2,Mic,Square} from 'lucide-react';
import {useI18n} from './i18n';

const MAX_SECONDS=90,RATE=16000;

// 录音转成 16kHz 单声道 16 位 WAV：各浏览器录出来的格式不一样（Chrome 是 webm，Safari 是 mp4），统一转成 WAV 再交给语音识别，体积也更小。
async function toWav(blob:Blob):Promise<Blob>{
 const Ctx=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
 const ctx=new Ctx();
 try{
  const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
  const off=new OfflineAudioContext(1,Math.max(1,Math.ceil(decoded.duration*RATE)),RATE);
  const src=off.createBufferSource();src.buffer=decoded;src.connect(off.destination);src.start();
  const pcm=(await off.startRendering()).getChannelData(0);
  const buf=new ArrayBuffer(44+pcm.length*2),v=new DataView(buf),w=(o:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,pcm.length*2,true);
  for(let i=0;i<pcm.length;i++){const s=Math.max(-1,Math.min(1,pcm[i]));v.setInt16(44+i*2,s<0?s*0x8000:s*0x7fff,true)}
  return new Blob([buf],{type:'audio/wav'});
 }finally{void ctx.close()}
}
const toDataUrl=(b:Blob)=>new Promise<string>((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=bad;r.readAsDataURL(b)});

// 语音输入按钮：点一下开始录音，再点一下结束，识别出的文字通过 onText 交给输入框（追加在已有内容后面）。
export default function VoiceButton({onText,lang,className,disabled}:{onText:(text:string)=>void;lang?:'zh'|'en';className?:string;disabled?:boolean}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [phase,setPhase]=useState<'idle'|'recording'|'working'>('idle'),[secs,setSecs]=useState(0),[error,setError]=useState('');
 const rec=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),timer=useRef<ReturnType<typeof setInterval>|null>(null),stream=useRef<MediaStream|null>(null);
 const cleanup=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 useEffect(()=>()=>{const r=rec.current;if(r&&r.state!=='inactive'){r.onstop=null;r.stop()}cleanup()},[]);
 useEffect(()=>{if(!error)return;const t=setTimeout(()=>setError(''),6000);return()=>clearTimeout(t)},[error]);
 const supported=typeof window!=='undefined'&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';

 async function finish(blob:Blob){setPhase('working');
  try{const wav=await toWav(blob);
   const r=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:await toDataUrl(wav),lang:lang??(locale==='en'?'en':'zh')})});
   const d=await r.json().catch(()=>({})) as {text?:string;error?:string};
   if(!r.ok)throw new Error(d.error||L('语音识别失败，请稍后再试。','Speech recognition failed.'));
   if(d.text)onText(d.text);else setError(L('没有听清，请靠近麦克风再说一遍。','Nothing recognised — try again closer to the mic.'))}
  catch(e){setError(e instanceof Error&&e.message?e.message:L('语音识别失败，请稍后再试。','Speech recognition failed.'))}
  finally{setPhase('idle')}}

 async function start(){setError('');
  try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});stream.current=s;
   const r=new MediaRecorder(s);rec.current=r;chunks.current=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
   r.onstop=()=>{cleanup();const blob=new Blob(chunks.current,{type:r.mimeType||'audio/webm'});if(blob.size<800){setPhase('idle');setError(L('录音太短了。','Recording too short.'));return}void finish(blob)};
   r.start();setPhase('recording');setSecs(0);const t0=Date.now();
   timer.current=setInterval(()=>{const n=Math.floor((Date.now()-t0)/1000);setSecs(n);if(n>=MAX_SECONDS&&r.state==='recording')r.stop()},250)}
  catch(e){cleanup();setPhase('idle');
   setError(e instanceof DOMException&&(e.name==='NotAllowedError'||e.name==='SecurityError')?L('没有麦克风权限：请在浏览器地址栏左侧允许使用麦克风。','Microphone blocked — allow it in the address bar.'):L('打不开麦克风，请检查设备。','Could not open the microphone.'))}}

 const click=()=>{if(phase==='recording'){rec.current?.stop();return}if(phase==='idle')void start()};
 if(!supported)return null;
 const label=phase==='recording'?L(`正在录音 ${secs} 秒，点击结束`,`Recording ${secs}s — click to stop`):phase==='working'?L('正在识别…','Transcribing…'):L('语音输入（点一下开始说，再点一下结束）','Voice input (click to start, click again to stop)');
 return <span className={'voice-input '+(className??'')}>
  <button type="button" className={'voice-btn '+phase} onClick={click} disabled={disabled||phase==='working'} title={label} aria-label={label} aria-pressed={phase==='recording'}>
   {phase==='recording'?<><Square size={13} fill="currentColor"/><span className="voice-secs">{secs}s</span></>:phase==='working'?<Loader2 size={17} className="animate-spin"/>:<Mic size={17}/>}
  </button>
  {error&&<span className="voice-error" role="status">{error}</span>}
 </span>}
