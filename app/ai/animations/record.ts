// 下载动画视频：不再截取屏幕（截屏录制在 Windows 上常常一闪一闪），而是自己逐帧“画”：
// 每一帧把播放器里的 SVG 复制一份，把当前的计算样式（透明度、变换、颜色等，含 CSS 动画的当前值）写进副本，
// 转成图片画到画布上，再在画面下方画出当前这行字幕和填色进度；画布的视频流加上旁白、音效的声音，用 MediaRecorder 录下来。
// 画布只在一帧完整画好之后才更新，所以录出来的视频不会出现空白帧或闪烁。录制期间要保持标签页在前台（后台标签页会停止刷新）。
import {recordingAudio,stopRecordingAudio} from './sound';

export const canRecord=()=>typeof window!=='undefined'&&typeof MediaRecorder!=='undefined'&&'captureStream' in HTMLCanvasElement.prototype;
const pickType=()=>['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))??'';

// 复制到副本里的样式：CSS 动画改变的、以及画面需要的外观属性。
const PROPS=['opacity','transform','transform-origin','transform-box','visibility','display','fill','fill-opacity','fill-rule','stroke','stroke-opacity','stroke-width',
 'stroke-dasharray','stroke-dashoffset','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','color','filter','paint-order'];
const SMIL='animate,animateMotion,animateTransform,set';

// 把 src 的当前样子“冻结”到 dst：逐个元素写入计算样式；沿路径运动（animateMotion）的元素按当前位置写成固定的变换，再去掉动画元素。
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

export type Recording={stop:()=>void};
// 录下 stage（播放器的画面区域：里面的 svg 和底部字幕条）。onSaved 在文件下载后回调（false：没录到内容）。
export function recordStage(stage:HTMLElement,name:string,onSaved:(ok:boolean)=>void):Recording{
 const W=1280,H=720,SUB=88,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H+SUB;
 const g=canvas.getContext('2d')!,css=getComputedStyle(stage),bg=css.getPropertyValue('--surface').trim()||'#ffffff';
 let live=true,busy=false,raf=0;
 // 字幕：读播放器底部当前这一段的文字和填色比例，按同样的颜色画在画面下方。
 const subtitle=()=>{const line=stage.querySelector('.an-sub-line span'),fill=stage.querySelector<HTMLElement>('.an-sub-fill');if(!line||!fill)return null;
  const right=Number(/inset\(\S+\s+([\d.]+)%/.exec(fill.style.clipPath)?.[1]??100);return {text:line.textContent??'',fill:1-right/100,ink:getComputedStyle(line).color,on:getComputedStyle(fill).color,band:getComputedStyle(stage.querySelector('.an-sub')!).backgroundColor}};
 const drawSub=()=>{const s=subtitle();g.fillStyle=s?.band||bg;g.fillRect(0,H,W,SUB);if(!s?.text)return;
  g.font='600 40px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';g.textBaseline='middle';const tw=g.measureText(s.text).width,x=(W-tw)/2,y=H+SUB/2;
  g.fillStyle=s.ink;g.fillText(s.text,x,y);g.save();g.beginPath();g.rect(x,H,tw*s.fill,SUB);g.clip();g.fillStyle=s.on;g.fillText(s.text,x,y);g.restore()};
 // 每帧：上一帧还没画完就跳过；画完一整帧才一次性更新画布。
 // 播放器重播时会换掉整个 svg 元素，所以每帧都重新找当前的 svg。
 const frame=()=>{if(!live)return;raf=requestAnimationFrame(frame);const svg=stage.querySelector('svg');if(busy||!svg)return;busy=true;
  loadImage(snapshot(svg,W,H)).then(img=>{if(!live)return;g.fillStyle=bg;g.fillRect(0,0,W,H);g.drawImage(img,0,0,W,H);drawSub()}).catch(()=>{}).finally(()=>{busy=false})};
 g.fillStyle=bg;g.fillRect(0,0,W,H+SUB);frame();
 const video=canvas.captureStream(30),audio=recordingAudio(),stream=new MediaStream([...video.getVideoTracks(),...(audio?.getAudioTracks()??[])]);
 const type=pickType(),rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:4_000_000}:{}),chunks:Blob[]=[];
 rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 rec.onstop=()=>{live=false;cancelAnimationFrame(raf);video.getTracks().forEach(t=>t.stop());stopRecordingAudio();
  const blob=new Blob(chunks,{type:rec.mimeType||type||'video/webm'});if(!blob.size)return onSaved(false);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name.replace(/[\\/:*?"<>|]/g,'_')}.${/mp4/.test(blob.type)?'mp4':'webm'}`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),60_000);onSaved(true)};
 rec.start(1000);
 return {stop:()=>{if(rec.state!=='inactive')rec.stop()}}}
