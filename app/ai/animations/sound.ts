import type {Cue} from './types';
import {subtitleProgress,type SceneTiming} from './subtitle';

// 动画的声音：音效用 Web Audio 现场合成（不需要音频文件）。旁白优先播放预先生成的 MP3（scripts/gen-tts.mjs，各平台同一个声音），
// 没有对应文件时退回浏览器自带的语音合成。

let ctx:AudioContext|null=null;
function audio(){if(typeof window==='undefined')return null;
 if(!ctx){const C=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return null;ctx=new C()}
 if(ctx.state==='suspended')void ctx.resume();return ctx}

// 所有声音（音效、旁白）都先汇到 out 再到扬声器。
let out:GainNode|null=null;
const output=(c:AudioContext)=>out??=(()=>{const g=c.createGain();g.connect(c.destination);return g})();

type Note={at:number;freq:number;to?:number;dur:number;type?:OscillatorType;vol?:number};
function note(c:BaseAudioContext,dest:AudioNode,baseTime:number,{at,freq,to,dur,type='sine',vol=0.06}:Note){const o=c.createOscillator(),g=c.createGain(),t=baseTime+at;
 o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 o.connect(g).connect(dest);o.start(t);o.stop(t+dur+0.05)}

// 传递时的“嗖”：一段白噪声经过扫频的带通滤波。
function whoosh(c:BaseAudioContext,dest:AudioNode,baseTime:number,at:number,vol=0.05,dur=0.4){const len=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=baseTime+at;src.buffer=buf;f.type='bandpass';f.Q.value=1.2;
 f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(2600,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*0.4);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 src.connect(f).connect(g).connect(dest);src.start(t);src.stop(t+dur+0.05)}

// 在指定 AudioContext 与时间点安排一组分镜音效（实时播放与离线合成共用）。
export function scheduleCue(c:BaseAudioContext,dest:AudioNode,cue:Cue|undefined,baseTime=0,speed=1){const k=1/speed;
 if(!cue){whoosh(c,dest,baseTime,0,0.025,0.3);return}
 if(cue.memo){[523,659,784,1047].forEach((f,i)=>note(c,dest,baseTime,{at:(0.1+i*0.12)*k,freq:f,dur:0.7,vol:0.05}));return}
 if(cue.drop)note(c,dest,baseTime,{at:0.05*k,freq:620,to:330,dur:0.16,type:'triangle',vol:0.04});
 for(let i=0;i<Math.min(cue.add,4);i++)note(c,dest,baseTime,{at:(0.15+i*0.13)*k,freq:520,to:820,dur:0.1,vol:0.06});
 for(let i=0;i<Math.min(cue.send,3);i++)whoosh(c,dest,baseTime,(0.5+i*0.35)*k);
 if(cue.bubble){note(c,dest,baseTime,{at:0.45*k,freq:880,dur:0.07,type:'triangle',vol:0.05});note(c,dest,baseTime,{at:0.53*k,freq:1180,dur:0.09,type:'triangle',vol:0.05})}
 if(cue.ok){note(c,dest,baseTime,{at:0.7*k,freq:880,dur:0.25,type:'triangle',vol:0.05});note(c,dest,baseTime,{at:0.82*k,freq:1320,dur:0.4,type:'triangle',vol:0.05})}
 if(cue.bad){note(c,dest,baseTime,{at:0.7*k,freq:190,to:150,dur:0.3,type:'square',vol:0.025});note(c,dest,baseTime,{at:1.02*k,freq:170,to:130,dur:0.3,type:'square',vol:0.025})}
 if(!cue.add&&!cue.send&&!cue.bubble&&!cue.ok&&!cue.bad&&!cue.drop)whoosh(c,dest,baseTime,0,0.025,0.3)}

// 按分镜里发生的事件安排音效；没有事件描述的手绘动画只在换镜头时轻响一下。倍速越快，音效排得越紧。
export function playCue(cue:Cue|undefined,speed=1){const c=audio();if(!c)return;scheduleCue(c,output(c),cue,c.currentTime,speed)}

// 旁白录音：public/tts/<sha256(声音+换行+台词) 前 16 位>.mp3，时长（毫秒）记在 public/tts/index.json。换声音只改这里，然后重新生成。
// 现在用本机开源模型 Kokoro 的 50 号中文女声（kokoro-<编号>）；声音名以 Neural 结尾用 Azure，其余用 Gemini TTS。
export const TTS_VOICE='kokoro-50';
// 让符号读起来自然：箭头读作“到”，百分号、运算符、比较符读成中文，代码里的点、下划线、连字符读成“点”或空格，
// 括号、引号、顿号等读作停顿或不读，去掉表情符号。只影响朗读，字幕照原文显示。生成录音的脚本也用它整理要朗读的文字。
const SAY:[RegExp,string][]=[
 [/\p{Extended_Pictographic}/gu,''],[/\n/g,'，'],
 [/\s*(?:->|=>|[→⇒])\s*/g,' 到 '],[/\s*(?:[·•…、;；]|——|—)\s*/g,'，'],
 [/(\d+(?:\.\d+)?)\s*%/g,'百分之$1'],[/%/g,' 百分号 '],
 [/\s*:=\s*/g,' 赋值为 '],[/\s*(?:>=|≥)\s*/g,' 大于等于 '],[/\s*(?:<=|≤)\s*/g,' 小于等于 '],[/\s*(?:!==?|≠)\s*/g,' 不等于 '],[/\s*={2,3}\s*/g,' 等于 '],
 [/\s*&&\s*/g,' 并且 '],[/\s*\|\|\s*/g,' 或者 '],[/\s*≈\s*/g,' 约等于 '],[/(\d)\s*\*\s*(?=\d)/g,'$1 乘 '],[/\s*×\s*/g,' 乘 '],[/[−]/g,'减'],
 [/\+\+/g,' 加加 '],[/\s*\+\s*/g,' 加 '],[/\s*=\s*/g,' 等于 '],[/\s*>\s*/g,' 大于 '],[/\s*<\s*/g,' 小于 '],
 [/²/g,'的平方'],[/°/g,'度'],[/①/g,'一，'],[/②/g,'二，'],[/③/g,'三，'],[/④/g,'四，'],
 [/(\d)\s*[~～-]\s*(\d)/g,'$1到$2'],[/([A-Za-z0-9])\.(?=[A-Za-z])/g,'$1 点 '],[/[_-]/g,' '],[/\//g,'，'],[/&/g,' 和 '],[/\|/g,' 或 '],[/@/g,' at '],
 [/[:：]\s*/g,'，'],[/\?/g,'？'],[/!/g,'！'],[/[()（）[\]{}<>《》「」『』【】"'“”‘’`#\\*~～]/g,' '],[/\s*，(\s*，)+\s*/g,'，'],[/ {2,}/g,' ']];
export const spoken=(t:string)=>SAY.reduce((s,[re,to])=>s.replace(re,to),t).trim();
export async function ttsHash(text:string,voice=TTS_VOICE){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(voice+'\n'+text));
 return [...new Uint8Array(d).slice(0,8)].map(b=>b.toString(16).padStart(2,'0')).join('')}
type Index=Record<string,number>;
type TimingMap=Record<string,SceneTiming>;
let index:Promise<Index>|null=null;
let timing:Promise<TimingMap>|null=null;
const ttsIndex=()=>index??=fetch('/tts/index.json',{cache:'no-cache'}).then(r=>(r.ok?r.json():{}) as Promise<Index>).catch(():Index=>({}));
const ttsTiming=()=>timing??=fetch('/tts/timing.json',{cache:'no-cache'}).then(r=>(r.ok?r.json():{}) as Promise<TimingMap>).catch(():TimingMap=>({}));
// 一组台词各自的录音时长（毫秒）；没有录音的为 null。播放器据此提前算好每一镜的长度。
export async function narrationDurations(texts:string[]):Promise<(number|null)[]>{if(typeof crypto==='undefined'||!crypto.subtle)return texts.map(()=>null);
 const [idx,hashes]=await Promise.all([ttsIndex(),Promise.all(texts.map(t=>ttsHash(t)))]);return hashes.map(h=>idx[h]??null)}
// 一组台词各自在导演台配置的影片时长与字幕同步参数（timing.json）；没有自定义时为 null。
export async function narrationTimings(texts:string[]):Promise<(SceneTiming|null)[]>{if(typeof crypto==='undefined'||!crypto.subtle)return texts.map(()=>null);
 const [map,hashes]=await Promise.all([ttsTiming(),Promise.all(texts.map(t=>ttsHash(t)))]);return hashes.map(h=>map[h]??null)}

export const voiceSupported=()=>typeof window!=='undefined'&&'speechSynthesis' in window;
// 优先用普通话的神经网络语音（Edge 的“晓晓”等），其次是 Google 普通话，再其次任意中文语音。
function pickVoice(){const all=speechSynthesis.getVoices(),zh=all.filter(v=>/^zh[-_]CN/i.test(v.lang)),pool=zh.length?zh:all.filter(v=>/^zh/i.test(v.lang));
 return pool.find(v=>/Xiaoxiao|Xiaoyi|Yunxi|Natural|Online/i.test(v.name))??pool.find(v=>/Google/i.test(v.name))??pool[0]}

// 同一个 <audio> 反复使用：手机浏览器在第一次点击播放后才允许出声，复用元素能一直保持这个许可。
let player:HTMLAudioElement|null=null,token=0,playing='';
const narrator=()=>player??=new Audio();
// 离线合成视频时直接抓取并解码 MP3 旁白音轨（不在页面里外放声音）。
export async function fetchNarrationBuffer(c:BaseAudioContext,text:string,ms?:number|null):Promise<AudioBuffer|null>{
 if(typeof crypto==='undefined'||!crypto.subtle||ms===null)return null;
 try{
  const h=await ttsHash(text);
  const ver=ms??(await ttsIndex())[h];
  if(!ver)return null;
  const res=await fetch(`/tts/${h}.mp3?v=${ver}`);
  if(!res.ok)return null;
  return await c.decodeAudioData(await res.arrayBuffer());
 }catch{return null}}
let current:SpeechSynthesisUtterance|null=null; // 保留引用，避免 Chrome 回收后不触发 onend
// 语音合成读到了哪里：text 是这句台词，全文按 spoken() 整理后共 len 个字，从第 from 个字开始读。
// char/at 是最近一次“读到某个词”事件的位置和时间；有的浏览器（Chrome 的 Google 语音）不发这个事件，就按语速估算。
const CPS=4.2; // 语音合成 1 倍速时大约每秒读几个汉字
let ws:{text:string;len:number;from:number;rate:number;began:number;char:number;at:number;done:boolean}|null=null;
function webSpeech(text:string,rate:number,from:number,onEnd:()=>void){if(!voiceSupported())return onEnd();speechSynthesis.cancel();
 const all=spoken(text),u=new SpeechSynthesisUtterance(all.slice(from)),v=pickVoice();u.lang=v?.lang??'zh-CN';if(v)u.voice=v;u.rate=Math.min(2,rate);
 const state={text,len:[...all].length,from,rate:u.rate,began:Date.now(),char:from,at:0,done:false};ws=state;
 u.onstart=()=>{state.began=Date.now()};
 u.onboundary=e=>{state.char=from+e.charIndex;state.at=Date.now()};
 u.onend=u.onerror=()=>{state.done=true;if(current===u){current=null;onEnd()}};current=u;speechSynthesis.speak(u)}
// 从整句的 frac（0–1）处开始读时，退到这个位置之前最近的标点之后，让朗读从字幕这一段的开头接上。
function startChar(all:string,frac:number){if(frac<=0)return 0;const chars=[...all];let i=Math.min(chars.length-1,Math.round(frac*chars.length));
 while(i>0&&!/[，。；：？！、,.;:?!…—]/.test(chars[i-1]))i--;return chars.slice(0,i).join('').length}
// 朗读一句台词：有录音就从 offset 毫秒处播放录音（倍速不变调）；否则用语音合成，从整句的 frac 处（字幕当前这一段的开头）读起。
export function speak(text:string,rate:number,onEnd:()=>void,offset=0,frac=0){stopSpeaking();const my=token,done=()=>{if(my===token){token++;onEnd()}};
 pending={text,frac}; // 录音或语音还没真正开始时，字幕先停在起读的位置
 void (async()=>{const h=await ttsHash(text).catch(()=>''),ms=h?(await ttsIndex())[h]:undefined;if(my!==token)return;
  if(!ms){playing='';return webSpeech(text,rate*1.15,startChar(spoken(text),frac),done)}
  const a=narrator();a.src=`/tts/${h}.mp3?v=${ms}`;playing=text;a.preservesPitch=true;(a as unknown as {webkitPreservesPitch:boolean}).webkitPreservesPitch=true;
  a.playbackRate=rate;a.currentTime=Math.min(offset,ms)/1000;a.onended=done;
  const fail=()=>{if(my===token)playing='';done()};a.onerror=fail; // 加载失败时字幕改按时间估算进度
  a.play().then(()=>{a.playbackRate=rate}).catch(fail)})()}
let pending:{text:string;frac:number}|null=null;
// 某句台词实际读到了整句的几分之几（0–1），字幕的填色跟着它走；这句没有在朗读时为 null。
// 录音按播放位置算；语音合成按“读到某个词”的事件算，两次事件之间、或浏览器不发事件时按语速估算，读完才到 1。
export function narrationProgress(text:string,ms?:number|null,sceneTiming?:SceneTiming|null):number|null{
 if(player&&playing===text&&ms)return subtitleProgress(player.currentTime*1000,ms,sceneTiming);
 if(ws&&ws.text===text)return wsProgress(ws);
 return pending&&pending.text===text?pending.frac:null}
function wsProgress(w:NonNullable<typeof ws>){if(w.done)return 1;
 const est=(w.at?w.char:w.from)+(Date.now()-(w.at||w.began))/1000*CPS*w.rate,cap=w.at?w.char+8:w.len*0.95;
 return Math.min(1,Math.min(est,cap)/(w.len||1))}
// 中途改倍速：录音立即生效（语音合成从下一句生效）。
export function setNarrationRate(rate:number){if(player)player.playbackRate=rate}
// 停下时记住语音合成读到的位置：暂停期间字幕停在这里，继续或重新打开语音时从这里接着读。
export function stopSpeaking(){pending=ws?{text:ws.text,frac:wsProgress(ws)}:null;token++;current=null;ws=null;if(player){player.onended=player.onerror=null;player.pause()}if(voiceSupported())speechSynthesis.cancel()}
