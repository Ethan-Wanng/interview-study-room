// 画面内的一行字幕：把一句旁白按标点切成放得下一行的几段，并按字数分配每段的朗读时间。
export type Chunk={text:string;from:number;to:number}; // from/to：在整句里所占的比例（0–1）

const PUNCT=/[，。；：？！、,.;:?!…—]/,CLOSE=/[）)」』”’》】]/,TRAIL=/[，。；：、,.;:—\s]+$/;
let canvas:CanvasRenderingContext2D|null=null;
function measure(font:string){if(!canvas&&typeof document!=='undefined')canvas=document.createElement('canvas').getContext('2d');
 if(!canvas)return (t:string)=>[...t].length*14;canvas.font=font;const c=canvas;return (t:string)=>c.measureText(t).width}

// 标点处断开（右括号、右引号跟着前一段），再贪心合并成不超过 maxWidth 的段；单段过长时按字硬切。
export function splitLine(text:string,maxWidth:number,font:string):Chunk[]{const w=measure(font),parts:string[]=[];let cur='';
 const chars=[...text.replace(/\s*\n\s*/g,'，')];
 chars.forEach((ch,i)=>{cur+=ch;if(PUNCT.test(ch)&&!PUNCT.test(chars[i+1]??'')&&!CLOSE.test(chars[i+1]??'')){parts.push(cur);cur=''}else if(CLOSE.test(ch)&&PUNCT.test(chars[i-1]??'')&&!PUNCT.test(chars[i+1]??'')){parts.push(cur);cur=''}});
 if(cur)parts.push(cur);
 const lines:string[]=[];let line='';
 for(const p of parts){if(!line||w((line+p).replace(TRAIL,''))<=maxWidth){line+=p;continue}lines.push(line);line=p}
 if(line)lines.push(line);
 const fitted=lines.flatMap(l=>{if(w(l.replace(TRAIL,''))<=maxWidth)return [l];const out:string[]=[];let s='';for(const ch of l){if(s&&w(s+ch)>maxWidth){out.push(s);s=''}s+=ch}if(s)out.push(s);return out});
 // 标点也占一点朗读时间（停顿），按“字数 + 标点”分配进度。
 const weight=(t:string)=>[...t].reduce((n,ch)=>n+(PUNCT.test(ch)?1.5:/\s/.test(ch)?0.3:1),0),total=fitted.reduce((n,t)=>n+weight(t),0)||1;
 let at=0;return fitted.map(t=>{const from=at/total;at+=weight(t);return {text:t.replace(TRAIL,'')||t,from,to:at/total}})}

// 进度 p（0–1）落在哪一段，以及这一段已经读了多少。
export function chunkAt(chunks:Chunk[],p:number){const found=chunks.findIndex(c=>p<c.to),index=found<0?chunks.length-1:found,c=chunks[index];
 return {index,fill:Math.max(0,Math.min(1,(p-c.from)/((c.to-c.from)||1)))}}
