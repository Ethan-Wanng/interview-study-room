import type {Cue} from './types';

// 动画的声音：音效用 Web Audio 现场合成（不需要音频文件），旁白用浏览器自带的语音合成朗读字幕。

let ctx:AudioContext|null=null;
function audio(){if(typeof window==='undefined')return null;
 if(!ctx){const C=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return null;ctx=new C()}
 if(ctx.state==='suspended')void ctx.resume();return ctx}

type Note={at:number;freq:number;to?:number;dur:number;type?:OscillatorType;vol?:number};
function note(c:AudioContext,{at,freq,to,dur,type='sine',vol=0.06}:Note){const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+at;
 o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+0.05)}

// 传递时的“嗖”：一段白噪声经过扫频的带通滤波。
function whoosh(c:AudioContext,at:number,vol=0.05,dur=0.4){const len=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime+at;src.buffer=buf;f.type='bandpass';f.Q.value=1.2;
 f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(2600,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*0.4);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 src.connect(f).connect(g).connect(c.destination);src.start(t);src.stop(t+dur+0.05)}

// 按分镜里发生的事件安排音效；没有事件描述的手绘动画只在换镜头时轻响一下。倍速越快，音效排得越紧。
export function playCue(cue:Cue|undefined,speed=1){const c=audio();if(!c)return;const k=1/speed;
 if(!cue){whoosh(c,0,0.025,0.3);return}
 if(cue.memo){[523,659,784,1047].forEach((f,i)=>note(c,{at:(0.1+i*0.12)*k,freq:f,dur:0.7,vol:0.05}));return}
 if(cue.drop)note(c,{at:0.05*k,freq:620,to:330,dur:0.16,type:'triangle',vol:0.04});
 for(let i=0;i<Math.min(cue.add,4);i++)note(c,{at:(0.15+i*0.13)*k,freq:520,to:820,dur:0.1,vol:0.06});
 for(let i=0;i<Math.min(cue.send,3);i++)whoosh(c,(0.5+i*0.35)*k);
 if(cue.bubble){note(c,{at:0.45*k,freq:880,dur:0.07,type:'triangle',vol:0.05});note(c,{at:0.53*k,freq:1180,dur:0.09,type:'triangle',vol:0.05})}
 if(cue.ok){note(c,{at:0.7*k,freq:880,dur:0.25,type:'triangle',vol:0.05});note(c,{at:0.82*k,freq:1320,dur:0.4,type:'triangle',vol:0.05})}
 if(cue.bad){note(c,{at:0.7*k,freq:190,to:150,dur:0.3,type:'square',vol:0.025});note(c,{at:1.02*k,freq:170,to:130,dur:0.3,type:'square',vol:0.025})}
 if(!cue.add&&!cue.send&&!cue.bubble&&!cue.ok&&!cue.bad&&!cue.drop)whoosh(c,0,0.025,0.3)}

export const voiceSupported=()=>typeof window!=='undefined'&&'speechSynthesis' in window;
// 优先用普通话的神经网络语音（Edge 的“晓晓”等），其次是 Google 普通话，再其次任意中文语音。
function pickVoice(){const all=speechSynthesis.getVoices(),zh=all.filter(v=>/^zh[-_]CN/i.test(v.lang)),pool=zh.length?zh:all.filter(v=>/^zh/i.test(v.lang));
 return pool.find(v=>/Xiaoxiao|Xiaoyi|Yunxi|Natural|Online/i.test(v.name))??pool.find(v=>/Google/i.test(v.name))??pool[0]}
// 让符号读起来自然：箭头读作“到”，间隔点读作停顿，去掉表情符号。
const spoken=(t:string)=>t.replace(/\s*[→⇒]\s*/g,' 到 ').replace(/\s*[·•]\s*/g,'，').replace(/\p{Extended_Pictographic}/gu,'').replace(/\n/g,'，');

let current:SpeechSynthesisUtterance|null=null; // 保留引用，避免 Chrome 回收后不触发 onend
export function speak(text:string,rate:number,onEnd:()=>void){if(!voiceSupported())return onEnd();speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(spoken(text)),v=pickVoice();u.lang=v?.lang??'zh-CN';if(v)u.voice=v;u.rate=Math.min(2,rate);
 u.onend=u.onerror=()=>{if(current===u){current=null;onEnd()}};current=u;speechSynthesis.speak(u)}
export function stopSpeaking(){current=null;if(voiceSupported())speechSynthesis.cancel()}
