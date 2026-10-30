'use client';

// 写代码用的输入框增强：回车保持上一行的缩进，遇到 { ( [ 或行尾冒号再多缩进一层；Tab / Shift+Tab 缩进或取消缩进（可多行）；
// 在空白行上输入 } ) ] 自动回退一层。回车和括号在 beforeinput 里处理（手机输入法不一定发出带按键名的 keydown），Tab 在 keydown 里处理。
// 用浏览器的插入命令修改文本，Ctrl+Z 撤销照常可用。用法：<textarea ref={codeEditing} …/>
const INDENT='    ',pairs:Record<string,string>={'{':'}','(':')','[':']'},closers='})]';
let busy=false;

// 用 insertText 替换选区，保留撤销记录；不支持时退回 setRangeText 并手动触发 input 事件。
function replace(el:HTMLTextAreaElement,start:number,end:number,text:string,caret?:[number,number]){
 busy=true;
 try{el.setSelectionRange(start,end);
  const ok=typeof document.execCommand==='function'&&document.execCommand('insertText',false,text);
  if(!ok){el.setRangeText(text,start,end,'end');el.dispatchEvent(new Event('input',{bubbles:true}))}
  if(caret)el.setSelectionRange(caret[0],caret[1])}
 finally{busy=false}}

const lineInfo=(v:string,s:number)=>{const lineStart=v.lastIndexOf('\n',s-1)+1,line=v.slice(lineStart,s);return {lineStart,line,lead:line.match(/^[ \t]*/)![0]}};

function onKeyDown(e:KeyboardEvent){const el=e.currentTarget as HTMLTextAreaElement;
 if(e.key!=='Tab'||e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 e.preventDefault();const v=el.value,s=el.selectionStart,t=el.selectionEnd,{lineStart}=lineInfo(v,s);
 const multi=v.slice(s,t).includes('\n');
 if(!multi&&!e.shiftKey){replace(el,s,t,INDENT);return}
 // 多行或 Shift+Tab：对选中的每一行整体缩进 / 取消缩进。
 const endLine=v.indexOf('\n',t-(t>s&&v[t-1]==='\n'?1:0)),blockEnd=endLine<0?v.length:endLine;
 const lines=v.slice(lineStart,blockEnd).split('\n'),changed=lines.map(l=>e.shiftKey?l.replace(/^(\t| {1,4})/,''):INDENT+l);
 const text=changed.join('\n'),moved=Math.max(lineStart,s+changed[0].length-lines[0].length);
 replace(el,lineStart,blockEnd,text,multi?[lineStart,lineStart+text.length]:[moved,moved])}

function onBeforeInput(e:InputEvent){const el=e.currentTarget as HTMLTextAreaElement;
 if(busy||e.isComposing)return;
 const v=el.value,s=el.selectionStart,t=el.selectionEnd,{lineStart,line,lead}=lineInfo(v,s);
 if(e.inputType==='insertLineBreak'||(e.inputType==='insertText'&&e.data==='\n')){e.preventDefault();
  const before=v.slice(lineStart,s).trimEnd(),last=before.slice(-1),next=v[t];
  const deeper=last in pairs||(last===':'&&!before.startsWith('//'))?lead+INDENT:lead;
  // 光标正好在一对括号中间：把右括号放到下一行，与本行对齐。
  if(last in pairs&&next===pairs[last]){replace(el,s,t,'\n'+deeper+'\n'+lead,[s+1+deeper.length,s+1+deeper.length]);return}
  replace(el,s,t,'\n'+deeper);return}
 if(e.inputType==='insertText'&&e.data&&e.data.length===1&&closers.includes(e.data)&&s===t&&line.length>0&&/^[ \t]+$/.test(line)){e.preventDefault();
  const back=line.endsWith('\t')?line.slice(0,-1):line.replace(/ {1,4}$/,'');replace(el,lineStart,s,back+e.data)}}

// ref 回调：给 textarea 挂上原生事件（React 的 onBeforeInput 是兼容层实现，拿不到 inputType）。
export function codeEditing(el:HTMLTextAreaElement|null){if(!el||el.dataset.code)return;el.dataset.code='1';
 el.addEventListener('keydown',onKeyDown);el.addEventListener('beforeinput',onBeforeInput)}
