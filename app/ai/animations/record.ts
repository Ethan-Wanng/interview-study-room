// 后台静默合成动画视频：不重播页面上的播放器、不占用屏幕、不外放声音。
// 1. 在屏幕外渲染每一镜的 SVG 并抓取关键帧（Web Animations API + SMIL 精确定位到对应毫秒，冻结计算样式）；
// 2. 用 OfflineAudioContext 把音效和 MP3 旁白离线混音到一整条音轨（不接扬声器，全程静音）；
// 3. 在离屏 Canvas 上按帧绘制画面与卡拉OK进度字幕，用 Worker 定时器驱动以防切换标签页被降速，最后通过 MediaRecorder 导出下载。
import {createElement,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import type {Animation} from './types';
import {fetchNarrationBuffer,narrationDurations,narrationTimings,scheduleCue} from './sound';
import {chunkAt,resolveSceneDuration,splitLine,subtitleProgress,type Chunk} from './subtitle';

const PACE=0.6,FADE=300,GAP=300,MIN_SCENE=1500;
const SVG_W=640,SVG_H=360,W=1280,H=720,SUB=88,FPS=25;
const KF_TIMES=[120,350,650,1000,1450,1900];
const SUB_FONT='600 40px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';

export const canRecord=()=>typeof window!=='undefined'&&typeof MediaRecorder!=='undefined'&&'captureStream' in HTMLCanvasElement.prototype&&typeof OfflineAudioContext!=='undefined';
const pickType=()=>['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))??'';

const PROPS=['opacity','transform','transform-origin','transform-box','visibility','display','fill','fill-opacity','fill-rule','stroke','stroke-opacity','stroke-width',
 'stroke-dasharray','stroke-dashoffset','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','color','filter','paint-order'];
const SMIL='animate,animateMotion,animateTransform,set';

function freeze(src:Element,dst:Element){const cs=getComputedStyle(src);let st='';
 for(const p of PROPS){const v=cs.getPropertyValue(p);if(v)st+=`${p}:${v};`}
 if(src.querySelector(':scope>animateMotion')&&src instanceof SVGGraphicsElement&&src.parentNode instanceof SVGGraphicsElement){
  const parent=src.parentNode.getCTM(),own=src.getCTM();if(parent&&own){const m=parent.inverse().multiply(own);st+=`transform:matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f});transform-origin:0 0;`}}
 dst.setAttribute('style',st);dst.removeAttribute('class');
 const a=src.children,b=dst.children;for(let i=0;i<a.length&&i<b.length;i++)freeze(a[i],b[i])}

function snapshot(svg:SVGSVGElement,w:number,h:number){const copy=svg.cloneNode(true) as SVGSVGElement;freeze(svg,copy);
 copy.querySelectorAll(SMIL).forEach(n=>n.remove());copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width',String(w));copy.setAttribute('height',String(h));
 return new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'})}

const loadImage=(blob:Blob)=>new Promise<HTMLImageElement>((ok,fail)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);ok(img)};img.onerror=()=>{URL.revokeObjectURL(url);fail(new Error('frame'))};img.src=url});
const tick=()=>new Promise<void>(r=>setTimeout(r,0));

function OffscreenSvg({Visual,step,continuous,onReady}:{Visual:Animation['Visual'];step:number;continuous?:boolean;onReady:()=>void}){
 useLayoutEffect(()=>{onReady()},[step,onReady]);
 return createElement('svg',{viewBox:`0 0 ${SVG_W} ${SVG_H}`,xmlns:'http://www.w3.org/2000/svg'},
  continuous?createElement(Visual,{step}):createElement('g',{key:`s-${step}`},createElement(Visual,{step})));
}

function startBgTimer(ms:number,onTick:()=>void):()=>void{
 try{
  const url=URL.createObjectURL(new Blob([`const id=setInterval(()=>postMessage(0),${ms});onmessage=()=>clearInterval(id);`],{type:'text/javascript'}));
  const w=new Worker(url);w.onmessage=onTick;
  return ()=>{try{w.postMessage(1)}catch{}w.terminate();URL.revokeObjectURL(url)};
 }catch{const id=window.setInterval(onTick,ms);return ()=>window.clearInterval(id)}
}

type Keyframe={at:number;blob:Blob};
export type Recording={stop:()=>void};

export function synthesizeAnimationVideo(
 animation:Animation,
 themeRefEl:HTMLElement,
 opts:{sfx:boolean;voice:boolean},
 onProgress:(pct:number)=>void,
 onSaved:(ok:boolean,cancelled?:boolean)=>void,
):Recording{
 let cancelled=false,finished=false;
 let stopRecorder:(()=>void)|null=null;
 let cleanupExtra:(()=>void)|null=null;

 const AudioCtx=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!AudioCtx){queueMicrotask(()=>onSaved(false,false));return {stop:()=>{}}}
 // 在用户点击的同一调用栈内创建 AudioContext，确保无需外放也能稳定推进时钟。
 const playCtx=new AudioCtx();
 void playCtx.resume().catch(()=>{});

 const cancel=()=>{
  if(finished||cancelled)return;
  cancelled=true;
  stopRecorder?.();
  cleanupExtra?.();
  cleanupExtra=null;
  void playCtx.close().catch(()=>{});
 };

 void (async()=>{
  const {scenes,Visual,continuous}=animation;
  const lines=scenes.map(s=>s.speech??s.caption);
  const dark=document.documentElement.dataset.lamp==='off'||document.documentElement.classList.contains('dark');
  const host=document.createElement('div');
  host.className='an-player';
  host.style.cssText='position:fixed;left:-10000px;top:0;width:640px;opacity:0;pointer-events:none;z-index:-1';
  const stage=document.createElement('div');stage.className='an-stage';
  const svgMount=document.createElement('div');svgMount.style.cssText=`width:${SVG_W}px;height:${SVG_H}px`;
  const subProbe=document.createElement('div');subProbe.className='an-sub';
  const subLine=document.createElement('span');subLine.className='an-sub-line';
  const inkProbe=document.createElement('span');inkProbe.textContent='A';
  const fillProbe=document.createElement('span');fillProbe.className='an-sub-fill';fillProbe.textContent='A';
  subLine.appendChild(inkProbe);subLine.appendChild(fillProbe);subProbe.appendChild(subLine);
  stage.appendChild(svgMount);stage.appendChild(subProbe);host.appendChild(stage);
  document.body.appendChild(host);
  const root=createRoot(svgMount);
  let cleanedDom=false;
  const cleanDom=()=>{if(cleanedDom)return;cleanedDom=true;try{root.unmount()}catch{}host.remove()};

  const refCs=getComputedStyle(themeRefEl),stageCs=getComputedStyle(stage);
  const bg=refCs.getPropertyValue('--surface').trim()||stageCs.getPropertyValue('--surface').trim()||(dark?'#1c2940':'#ffffff');
  const baseBg=dark?'#162032':'#ffffff';
  const liveLine=themeRefEl.querySelector('.an-sub-line span'),liveFill=themeRefEl.querySelector('.an-sub-fill'),liveSub=themeRefEl.querySelector('.an-sub');
  const subColors={
   ink:liveLine?getComputedStyle(liveLine).color:getComputedStyle(inkProbe).color,
   on:liveFill?getComputedStyle(liveFill).color:getComputedStyle(fillProbe).color,
   band:liveSub?getComputedStyle(liveSub).backgroundColor:getComputedStyle(subProbe).backgroundColor,
  };

  try{
   onProgress(1);
   const [durs,timings]=await Promise.all([
    opts.voice?narrationDurations(lines).catch(()=>lines.map(()=>null)):Promise.resolve(lines.map(()=>null)),
    narrationTimings(lines).catch(()=>lines.map(()=>null)),
   ]);
   if(cancelled){cleanDom();return onSaved(false,true)}
   const audioMs=(i:number)=>opts.voice?durs[i]??null:null;
   const lengths=scenes.map((sc,i)=>resolveSceneDuration(sc.ms,audioMs(i),timings[i],GAP,MIN_SCENE,PACE));
   const starts=lengths.map((_,i)=>lengths.slice(0,i).reduce((a,b)=>a+b,0));
   const total=Math.max(500,lengths.reduce((a,b)=>a+b,0));
   const subChunks:Chunk[][]=lines.map(t=>splitLine(t,W*0.92-48,SUB_FONT));

   // 1. 离屏逐镜渲染并冻结每个时间点的 SVG 关键帧
   const keyframes:Keyframe[][]=[];
   let settledSvg:SVGSVGElement|null=null;
   for(let step=0;step<scenes.length;step++){
    if(cancelled){cleanDom();return onSaved(false,true)}
    if(settledSvg&&continuous){
     for(const a of settledSvg.getAnimations({subtree:true})){try{a.finish()}catch{}}
    }
    await new Promise<void>(res=>{
     root.render(createElement(OffscreenSvg,{Visual,step,continuous,onReady:res}));
    });
    await tick();
    if(cancelled){cleanDom();return onSaved(false,true)}
    const svgEl=svgMount.querySelector('svg');
    if(!svgEl){keyframes.push([]);continue}
    settledSvg=svgEl;
    svgEl.getBoundingClientRect();
    const anims=svgEl.getAnimations({subtree:true});
    const list:Keyframe[]=[];
    for(const tMs of KF_TIMES){
     if(cancelled){cleanDom();return onSaved(false,true)}
     for(const a of anims){try{a.pause();a.currentTime=tMs}catch{}}
     try{svgEl.pauseAnimations();svgEl.setCurrentTime(tMs/1000)}catch{}
     list.push({at:tMs,blob:snapshot(svgEl,W,H)});
    }
    keyframes.push(list);
    onProgress(Math.min(10,1+Math.round(((step+1)/scenes.length)*9)));
   }
   cleanDom();
   if(cancelled)return onSaved(false,true);

   // 2. 离线混音：把全部音效和 MP3 旁白合进同一段 AudioBuffer（全程静音，不进扬声器）
   const SR=24000,frames=Math.max(1,Math.ceil((total/1000)*SR));
   const offline=new OfflineAudioContext(1,frames,SR);
   const voiceBuffers=opts.voice
    ?await Promise.all(lines.map((t,i)=>fetchNarrationBuffer(offline,t,audioMs(i))))
    :lines.map(()=>null);
   if(cancelled)return onSaved(false,true);
   for(let i=0;i<scenes.length;i++){
    const atSec=starts[i]/1000;
    if(opts.sfx)scheduleCue(offline,offline.destination,scenes[i].cue,atSec,1);
    const buf=voiceBuffers[i];
    if(buf){
     const src=offline.createBufferSource();src.buffer=buf;src.connect(offline.destination);
     if(timings[i]?.sceneMs)src.start(atSec,0,Math.min(buf.duration,lengths[i]/1000));
     else src.start(atSec);
    }
   }
   const mixed=await offline.startRendering();
   if(cancelled)return onSaved(false,true);
   onProgress(15);

   // 3. 离屏 Canvas + 静默 AudioContext + Worker 定时器驱动 MediaRecorder 合成
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H+SUB;
   const g=canvas.getContext('2d')!;
   const imgCache=new Map<number,HTMLImageElement[]>();
   const loading=new Map<number,Promise<HTMLImageElement[]>>();
   const ensureSceneImgs=(step:number):Promise<HTMLImageElement[]>=>{
    if(step<0||step>=keyframes.length)return Promise.resolve([]);
    const hit=imgCache.get(step);if(hit)return Promise.resolve(hit);
    const pending=loading.get(step);if(pending)return pending;
    const p=Promise.all(keyframes[step].map(k=>loadImage(k.blob))).then(imgs=>{
     imgCache.set(step,imgs);loading.delete(step);
     if(imgCache.size>5){for(const k of imgCache.keys()){if(Math.abs(k-step)>2){imgCache.delete(k);break}}}
     return imgs;
    }).catch(()=>[]);
    loading.set(step,p);
    return p;
   };
   await ensureSceneImgs(0);
   if(scenes.length>1)void ensureSceneImgs(1);
   if(cancelled)return onSaved(false,true);

   const stepAt=(t:number)=>{let i=0;while(i<starts.length-1&&t>=starts[i+1])i++;return i};
   const pickImg=(step:number,localMs:number)=>{
    const kfs=keyframes[step],imgs=imgCache.get(step);
    if(!kfs?.length||!imgs?.length)return null;
    let pick=imgs[0];
    for(let i=0;i<kfs.length&&i<imgs.length;i++){if(localMs>=kfs[i].at)pick=imgs[i];else break}
    return pick;
   };
   const drawFrame=(elapsedMs:number)=>{
    const step=stepAt(elapsedMs),localMs=Math.max(0,elapsedMs-starts[step]);
    g.fillStyle=baseBg;g.fillRect(0,0,W,H);
    g.fillStyle=bg;g.fillRect(0,0,W,H);
    const cur=pickImg(step,localMs);
    if(!continuous&&step>0&&localMs<FADE){
     const prevImgs=imgCache.get(step-1);
     const prev=prevImgs?.length?prevImgs[prevImgs.length-1]:null;
     const a=Math.max(0,Math.min(1,localMs/FADE));
     if(prev){g.save();g.globalAlpha=1-a;g.drawImage(prev,0,0,W,H);g.restore()}
     if(cur){g.save();g.globalAlpha=a;g.drawImage(cur,0,0,W,H);g.restore()}
    }else if(cur){g.drawImage(cur,0,0,W,H)}
    if(step+1<scenes.length&&!imgCache.has(step+1))void ensureSceneImgs(step+1);

    // 底部字幕条与卡拉OK渐进填色
    g.fillStyle=baseBg;g.fillRect(0,H,W,SUB);
    g.fillStyle=subColors.band||bg;g.fillRect(0,H,W,SUB);
    const chunks=subChunks[step]??[];
    if(!chunks.length)return;
    const d=audioMs(step),prog=d?subtitleProgress(localMs,d,timings[step]):Math.min(1,localMs/(lengths[step]*0.85));
    const {index:ci,fill}=chunkAt(chunks,prog),text=chunks[ci]?.text??'';
    if(!text)return;
    g.font=SUB_FONT;g.textBaseline='middle';
    const tw=g.measureText(text).width,x=(W-tw)/2,y=H+SUB/2;
    g.fillStyle=subColors.ink;g.fillText(text,x,y);
    g.save();g.beginPath();g.rect(x,H,tw*fill,SUB);g.clip();g.fillStyle=subColors.on;g.fillText(text,x,y);g.restore();
   };

   drawFrame(0);
   const dest=playCtx.createMediaStreamDestination();
   const srcNode=playCtx.createBufferSource();srcNode.buffer=mixed;srcNode.connect(dest);
   const video=canvas.captureStream(FPS);
   const stream=new MediaStream([...video.getVideoTracks(),...dest.stream.getAudioTracks()]);
   const type=pickType(),rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:4_000_000}:{});
   const chunks:Blob[]=[];
   let stopTimer:(()=>void)|null=null;
   let stopped=false;

   const cleanupStream=()=>{
    stopTimer?.();stopTimer=null;
    try{srcNode.stop()}catch{}
    video.getTracks().forEach(t=>t.stop());
    dest.stream.getTracks().forEach(t=>t.stop());
    void playCtx.close().catch(()=>{});
   };
   cleanupExtra=cleanupStream;
   stopRecorder=()=>{if(!stopped&&rec.state!=='inactive'){stopped=true;try{rec.stop()}catch{}}};

   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   rec.onstop=()=>{
    cleanupStream();
    finished=true;
    if(cancelled)return onSaved(false,true);
    const blob=new Blob(chunks,{type:rec.mimeType||type||'video/webm'});
    if(!blob.size)return onSaved(false,false);
    onProgress(100);
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`${animation.title.replace(/[\\/:*?"<>|]/g,'_')}.${/mp4/.test(blob.type)?'mp4':'webm'}`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),60_000);
    onSaved(true,false);
   };

   await playCtx.resume().catch(()=>{});
   const startTime=playCtx.currentTime,wallStart=performance.now();
   srcNode.start(startTime);
   rec.start(500);
   let lastPct=15;
   stopTimer=startBgTimer(Math.round(1000/FPS),()=>{
    if(cancelled||stopped)return;
    let elapsedMs=Math.max(0,(playCtx.currentTime-startTime)*1000);
    if(elapsedMs<50&&performance.now()-wallStart>600)elapsedMs=performance.now()-wallStart;
    drawFrame(Math.min(total,elapsedMs));
    const pct=15+Math.min(84,Math.round((elapsedMs/total)*84));
    if(pct!==lastPct){lastPct=pct;onProgress(pct)}
    if(elapsedMs>=total+180)stopRecorder?.();
   });
  }catch{
   cleanDom();
   cleanupExtra?.();
   void playCtx.close().catch(()=>{});
   if(!finished)onSaved(false,cancelled);
  }
 })();

 return {stop:cancel};
}
