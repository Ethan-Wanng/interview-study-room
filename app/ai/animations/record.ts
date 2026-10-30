// 下载动画视频：用“区域截取”（getDisplayMedia 选当前标签页 + CropTarget 裁到播放画面）加 MediaRecorder 实时录下来。
// 画面依赖 CSS / SMIL 动画，没法逐帧离线导出，所以只能边播边录；目前只有电脑版 Chrome、Edge 支持区域截取。
type CropTargetStatic={fromElement:(el:Element)=>Promise<unknown>};
type CropTrack=MediaStreamTrack&{cropTo?:(target:unknown)=>Promise<void>};

export const canRecord=()=>typeof window!=='undefined'&&'CropTarget' in window&&!!navigator.mediaDevices?.getDisplayMedia&&typeof MediaRecorder!=='undefined';
const pickType=()=>['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))??'';

export type Recording={stop:()=>void};
// 开始录制 el 所在的区域；用户取消或浏览器不支持时抛错。onSaved 在文件下载后回调（cancelled：没录到内容）。
export async function recordElement(el:Element,name:string,onSaved:(ok:boolean)=>void):Promise<Recording>{
 const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:{suppressLocalAudioPlayback:false},preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude',systemAudio:'exclude'} as DisplayMediaStreamOptions);
 const stopAll=()=>stream.getTracks().forEach(t=>t.stop()),track=stream.getVideoTracks()[0] as CropTrack;
 try{const CT=(window as unknown as {CropTarget:CropTargetStatic}).CropTarget;if(!track.cropTo)throw new Error('crop');await track.cropTo(await CT.fromElement(el))}
 catch{stopAll();throw new Error('crop')}
 const type=pickType(),rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:3_000_000}:{}),chunks:Blob[]=[];
 rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 rec.onstop=()=>{stopAll();const blob=new Blob(chunks,{type:rec.mimeType||type||'video/webm'});if(!blob.size)return onSaved(false);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name.replace(/[\\/:*?"<>|]/g,'_')}.${/mp4/.test(blob.type)?'mp4':'webm'}`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),60_000);onSaved(true)};
 track.addEventListener('ended',()=>{if(rec.state!=='inactive')rec.stop()}); // 用户点了浏览器的“停止共享”
 rec.start(1000);
 return {stop:()=>{if(rec.state!=='inactive')rec.stop()}}}
