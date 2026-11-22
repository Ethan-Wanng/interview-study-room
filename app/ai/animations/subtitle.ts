// 画面内的一行字幕：把一句旁白按标点切成放得下一行的几段，并按中英文发音音节权重分配每段的朗读时间。
export type Chunk={text:string;from:number;to:number}; // from/to：在整句里所占的比例（0–1）

// 单镜可选的影片时长与字幕同步校准（存放在 public/tts/timing.json，由配音导演台编辑）。
export type SceneTiming={
 sceneMs?:number;    // 影片分镜总时长（毫秒），覆盖默认 (audioMs + 300ms)
 subStartMs?:number; // 字幕起跑偏移（毫秒，正数晚起跑，负数提前起跑）
 subDurMs?:number;   // 字幕走完耗时（毫秒），留空则按音频时长
 subSpeed?:number;   // 字幕速度倍率（默认 1.0，>1 字走得更快，<1 字走得更慢）
};

const PUNCT=/[，。；：？！、,.;:?!…—]/,CLOSE=/[）)」』”’》】]/,TRAIL=/[，。；：、,.;:—\s]+$/;
const SILENT=/^[\s()（）[\]{}<>《》「」『』【】"'“”‘’`\\*~～·•]+$/;
const TOKEN_RE=/[A-Za-z]+|\d+(?:\.\d+)?|[\s()（）[\]{}<>《》「」『』【】"'“”‘’`\\*~～·•]+|./gu;

let canvas:CanvasRenderingContext2D|null=null;
function measure(font:string){if(!canvas&&typeof document!=='undefined')canvas=document.createElement('canvas').getContext('2d');
 if(!canvas)return (t:string)=>[...t].length*14;canvas.font=font;const c=canvas;return (t:string)=>c.measureText(t).width}

// 按实际发音节奏估算每个片段的时长权重：
// - 英文单词按音节约每 3 个字母 ≈ 1 个汉字（避免 Transformer/Embedding 等长英文词拖慢字幕）；
// - 2~5 位全大写缩写（KV/API/RAG/LLM）按字母拼读；
// - 括号/引号/空格几乎不占朗读时间；标点记作停顿。
function weightOf(text:string):number{
 let total=0;
 for(const m of text.matchAll(TOKEN_RE)){
  const tok=m[0];
  if(SILENT.test(tok)){total+=0.1;continue}
  if(/^[A-Za-z]+$/.test(tok)){
   if(tok.length>=2&&tok.length<=5&&tok===tok.toUpperCase())total+=tok.length*0.72;
   else total+=Math.max(1.2,tok.length*0.34);
   continue;
  }
  if(/^\d+(?:\.\d+)?$/.test(tok)){total+=Math.max(1.0,tok.length*0.55);continue}
  if(PUNCT.test(tok)){total+=1.4;continue}
  total+=1;
 }
 return total||1;
}

// 标点处断开（右括号、右引号跟着前一段），再贪心合并成不超过 maxWidth 的段；单段过长时按字硬切。
export function splitLine(text:string,maxWidth:number,font:string):Chunk[]{const w=measure(font),parts:string[]=[];let cur='';
 const chars=[...text.replace(/\s*\n\s*/g,'，')];
 chars.forEach((ch,i)=>{cur+=ch;if(PUNCT.test(ch)&&!PUNCT.test(chars[i+1]??'')&&!CLOSE.test(chars[i+1]??'')){parts.push(cur);cur=''}else if(CLOSE.test(ch)&&PUNCT.test(chars[i-1]??'')&&!PUNCT.test(chars[i+1]??'')){parts.push(cur);cur=''}});
 if(cur)parts.push(cur);
 const lines:string[]=[];let line='';
 for(const p of parts){if(!line||w((line+p).replace(TRAIL,''))<=maxWidth){line+=p;continue}lines.push(line);line=p}
 if(line)lines.push(line);
 const fitted=lines.flatMap(l=>{if(w(l.replace(TRAIL,''))<=maxWidth)return [l];const out:string[]=[];let s='';for(const ch of l){if(s&&w(s+ch)>maxWidth){out.push(s);s=''}s+=ch}if(s)out.push(s);return out});
 const total=fitted.reduce((n,t)=>n+weightOf(t),0)||1;
 let at=0;return fitted.map(t=>{const from=at/total;at+=weightOf(t);return {text:t.replace(TRAIL,'')||t,from,to:at/total}})}

// 进度 p（0–1）落在哪一段，以及这一段已经读了多少。
export function chunkAt(chunks:Chunk[],p:number){const found=chunks.findIndex(c=>p<c.to),index=found<0?chunks.length-1:found,c=chunks[index];
 return {index,fill:Math.max(0,Math.min(1,(p-c.from)/((c.to-c.from)||1)))}}

// 计算在当前音频播放毫秒处的字幕推进比例（0–1），支持导演台设置的起跑偏移、字幕耗时与字幕倍速。
export function subtitleProgress(elapsedMs:number,baseAudioMs:number,timing?:SceneTiming|null):number{
 const start=timing?.subStartMs??0;
 const base=timing?.subDurMs&&timing.subDurMs>100?timing.subDurMs:baseAudioMs;
 const speed=timing?.subSpeed&&timing.subSpeed>0?timing.subSpeed:1;
 const dur=Math.max(200,base/speed);
 return Math.max(0,Math.min(1,(elapsedMs-start)/dur));
}

// 计算单镜的影片播放时长（毫秒）：优先使用导演台自定义的 sceneMs，否则按音频时长 + GAP 或预设分镜时长。
export function resolveSceneDuration(defaultSceneMs:number,audioMs:number|null,timing?:SceneTiming|null,gap=300,minScene=1500,pace=0.6):number{
 if(timing?.sceneMs&&timing.sceneMs>=400)return Math.round(timing.sceneMs);
 return audioMs?Math.max(audioMs+gap,minScene):defaultSceneMs*pace;
}
