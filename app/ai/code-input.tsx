'use client';

// 代码与 Markdown 输入框增强：
// 1. codeEditing（代码题与综合题，含闯关、训练与正式考试）：
//    - 自动括号与引号补全：输入 { ( [ " ' ` 自动补全配对（选中文本时自动包裹）；
//    - 跳过右括号/引号：光标紧挨着匹配的右括号或引号时再输入直接跳过；
//    - Backspace 成对删除空括号/引号；
//    - 回车保持缩进、在 { ( [ 或行尾 : 后加深缩进、在成对括号中间回车自动换行并对齐；
//    - Tab / Shift+Tab 单行与多行缩进/反缩进，空白行输入 } ) ] 自动回退一层。
// 2. markdownEditing（简答题、背题默写、AI 问答、私人题库、反馈）：
//    - 回车自动延续列表与序号：1. / 1) / - / * / + / - [ ] / > （空列表项回车自动退出列表，插入中间行自动顺延后续序号）；
//    - 选中文本输入 * _ ` ~ ( [ { " ' 等自动包裹；输入 ``` 自动补全代码块围栏；
//    - 括号与反引号自动补全、右字符跳过、成对退格删除；列表行支持 Tab / Shift+Tab 缩进与反缩进。
const CODE_INDENT='    ',MD_INDENT='  ';
const BRACKETS:Record<string,string>={'{':'}','(':')','[':']'};
const CODE_PAIRS:Record<string,string>={...BRACKETS,'"':'"',"'":"'",'`':'`'};
const MD_AUTO_PAIRS:Record<string,string>={...BRACKETS,'`':'`'};
const MD_WRAP_PAIRS:Record<string,string>={...BRACKETS,'"':'"',"'":"'",'`':'`','*':'*','_':'_','~':'~','（':'）','【':'】','《':'》','「':'」','“':'”'};
const CODE_CLOSERS='})]',QUOTES='"\'`';
let busy=false;

// 用浏览器原生编辑命令修改文本，保留 Ctrl+Z 撤销记录；不支持时退回 setRangeText 并触发 input 事件。
function replace(el:HTMLTextAreaElement,start:number,end:number,text:string,caret?:[number,number]){
 if(start===end&&!text)return;
 busy=true;
 try{
  el.setSelectionRange(start,end);
  const ok=typeof document.execCommand==='function'&&(text?document.execCommand('insertText',false,text):document.execCommand('delete',false));
  if(!ok){el.setRangeText(text,start,end,'end');el.dispatchEvent(new Event('input',{bubbles:true}))}
  if(caret)el.setSelectionRange(caret[0],caret[1]);
 }finally{busy=false}
}

const lineInfo=(v:string,s:number)=>{const lineStart=v.lastIndexOf('\n',s-1)+1,line=v.slice(lineStart,s);return {lineStart,line,lead:line.match(/^[ \t]*/)![0]}};

function indentBlock(el:HTMLTextAreaElement,v:string,s:number,t:number,step:string,outdent:boolean,multi:boolean){
 const {lineStart}=lineInfo(v,s);
 const endLine=v.indexOf('\n',t-(t>s&&v[t-1]==='\n'?1:0)),blockEnd=endLine<0?v.length:endLine;
 const re=new RegExp(`^(\\t| {1,${step.length}})`);
 const lines=v.slice(lineStart,blockEnd).split('\n'),changed=lines.map(l=>outdent?l.replace(re,''):step+l);
 const text=changed.join('\n'),moved=Math.max(lineStart,s+changed[0].length-lines[0].length);
 replace(el,lineStart,blockEnd,text,multi?[lineStart,lineStart+text.length]:[moved,moved]);
}

function handleOrderedContinue(el:HTMLTextAreaElement,v:string,s:number,t:number,indent:string,numStr:string,delim:string,space:string){
 const nextNum=Number(numStr)+1;
 const curLineEnd=v.indexOf('\n',t);
 if(curLineEnd>=0){
  const afterLines=v.slice(curLineEnd+1).split('\n');
  let expected=nextNum,count=0;
  const rebuilt:string[]=[];
  for(const l of afterLines){
   const m=l.match(/^([ \t]*)(\d+)([.)])([ \t]+)(.*)$/);
   if(m&&m[1]===indent&&m[3]===delim&&Number(m[2])===expected){
    rebuilt.push(indent+(expected+1)+delim+m[4]+m[5]);
    expected++;count++;
   }else break;
  }
  if(count>0){
   const restOfCurLine=v.slice(t,curLineEnd);
   const newPrefix='\n'+indent+nextNum+delim+space;
   const caretPos=s+newPrefix.length;
   const tailEnd=curLineEnd+1+afterLines.slice(0,count).join('\n').length;
   replace(el,s,tailEnd,newPrefix+restOfCurLine+'\n'+rebuilt.join('\n'),[caretPos,caretPos]);
   return;
  }
 }
 replace(el,s,t,'\n'+indent+nextNum+delim+space);
}

function handleMarkdownListEnter(el:HTMLTextAreaElement,v:string,s:number,t:number,lineStart:number,line:string):boolean{
 const task=line.match(/^([ \t]*)([-*+])([ \t]+)\[[ xX]\]([ \t]+)(.*)$/);
 if(task){
  if(!task[5].trim())replace(el,lineStart,s,'');
  else replace(el,s,t,'\n'+task[1]+task[2]+task[3]+'[ ] ');
  return true;
 }
 const ord=line.match(/^([ \t]*)(\d+)([.)])([ \t]+)(.*)$/);
 if(ord){
  const [,indent,numStr,delim,space,body]=ord;
  if(!body.trim())replace(el,lineStart,s,'');
  else handleOrderedContinue(el,v,s,t,indent,numStr,delim,space);
  return true;
 }
 const ul=line.match(/^([ \t]*)([-*+])([ \t]+)(.*)$/);
 if(ul){
  if(!ul[4].trim())replace(el,lineStart,s,'');
  else replace(el,s,t,'\n'+ul[1]+ul[2]+ul[3]);
  return true;
 }
 const bq=line.match(/^((?:[ \t]*>[ \t]*)+)(.*)$/);
 if(bq){
  if(!bq[2].trim())replace(el,lineStart,s,'');
  else{
   const prefix=bq[1].endsWith(' ')||bq[1].endsWith('\t')?bq[1]:bq[1]+' ';
   replace(el,s,t,'\n'+prefix);
  }
  return true;
 }
 return false;
}

function handlePairAndBackspace(
 e:InputEvent,
 el:HTMLTextAreaElement,
 autoPairs:Record<string,string>,
 wrapPairs:Record<string,string>,
 allowQuotes:boolean,
 allowFence:boolean,
 allowOutdent:boolean,
):boolean{
 const v=el.value,s=el.selectionStart,t=el.selectionEnd;
 if(e.inputType==='deleteContentBackward'&&s===t&&s>0){
  const left=v[s-1],right=v[s];
  if(left in autoPairs&&right===autoPairs[left]){
   e.preventDefault();replace(el,s-1,s+1,'');return true;
  }
  return false;
 }
 if(e.inputType!=='insertText'||!e.data||e.data.length!==1)return false;
 const ch=e.data;
 if(s<t&&ch in wrapPairs){
  e.preventDefault();
  replace(el,s,t,ch+v.slice(s,t)+wrapPairs[ch],[s+1,t+1]);
  return true;
 }
 if(s!==t)return false;
 const prev=s>0?v[s-1]:'',next=v[t]??'',{lineStart,line}=lineInfo(v,s);
 if(allowFence&&ch==='`'&&/^[ \t]*``$/.test(line)&&(!next||next==='\n')){
  e.preventDefault();
  const lead=line.match(/^[ \t]*/)![0];
  replace(el,s,t,'`\n'+lead+'```',[s+1,s+1]);
  return true;
 }
 const isAutoCloser=Object.values(autoPairs).includes(ch);
 if(isAutoCloser&&v[t]===ch&&!(QUOTES.includes(ch)&&prev==='\\')){
  e.preventDefault();el.setSelectionRange(s+1,s+1);return true;
 }
 if(allowOutdent&&CODE_CLOSERS.includes(ch)&&line.length>0&&/^[ \t]+$/.test(line)){
  e.preventDefault();
  const back=line.endsWith('\t')?line.slice(0,-1):line.replace(/ {1,4}$/,'');
  replace(el,lineStart,s,back+ch);
  return true;
 }
 if(ch in BRACKETS&&(!next||/[\s)\]}\,;:\n]/.test(next))){
  e.preventDefault();replace(el,s,t,ch+BRACKETS[ch],[s+1,s+1]);return true;
 }
 if(ch in autoPairs&&QUOTES.includes(ch)){
  const allowQuote=ch==='`'||allowQuotes;
  if(allowQuote&&prev!=='\\'&&(!next||/[\s)\]}\,;:\n]/.test(next))&&(!prev||/[\s(\[{=:,;+\-!<>]/.test(prev))&&(ch!=="'"||(prev!=='&'&&prev!=='<'))){
   e.preventDefault();replace(el,s,t,ch+ch,[s+1,s+1]);return true;
  }
 }
 return false;
}

function onCodeKeyDown(e:KeyboardEvent){
 const el=e.currentTarget as HTMLTextAreaElement;
 if(e.key!=='Tab'||e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 e.preventDefault();
 const v=el.value,s=el.selectionStart,t=el.selectionEnd,multi=v.slice(s,t).includes('\n');
 if(!multi&&!e.shiftKey){replace(el,s,t,CODE_INDENT);return}
 indentBlock(el,v,s,t,CODE_INDENT,e.shiftKey,multi);
}

function onCodeBeforeInput(e:InputEvent){
 const el=e.currentTarget as HTMLTextAreaElement;
 if(busy||e.isComposing)return;
 const v=el.value,s=el.selectionStart,t=el.selectionEnd,{lineStart,line,lead}=lineInfo(v,s);
 if(e.inputType==='insertLineBreak'||(e.inputType==='insertText'&&e.data==='\n')){
  e.preventDefault();
  const before=v.slice(lineStart,s).trimEnd(),last=before.slice(-1),next=v[t];
  if(!(last in BRACKETS)&&!(last===':'&&!before.startsWith('//'))&&/^[ \t]*\d+[.)][ \t]+/.test(line)){
   if(handleMarkdownListEnter(el,v,s,t,lineStart,line))return;
  }
  const deeper=last in BRACKETS||(last===':'&&!before.startsWith('//'))?lead+CODE_INDENT:lead;
  // 光标正好在一对括号中间：把右括号放到下一行，与本行对齐。
  if(last in BRACKETS&&next===BRACKETS[last]){replace(el,s,t,'\n'+deeper+'\n'+lead,[s+1+deeper.length,s+1+deeper.length]);return}
  replace(el,s,t,'\n'+deeper);return;
 }
 handlePairAndBackspace(e,el,CODE_PAIRS,CODE_PAIRS,true,false,true);
}

function onMarkdownKeyDown(e:KeyboardEvent){
 const el=e.currentTarget as HTMLTextAreaElement;
 if(e.key!=='Tab'||e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 const v=el.value,s=el.selectionStart,t=el.selectionEnd,multi=v.slice(s,t).includes('\n');
 const {line}=lineInfo(v,s);
 const isList=/^[ \t]*(?:\d+[.)]|[-*+]|>)[ \t]/.test(line);
 if(!multi&&!isList&&!(e.shiftKey&&/^[ \t]+/.test(line)))return;
 e.preventDefault();
 indentBlock(el,v,s,t,MD_INDENT,e.shiftKey,multi);
}

function onMarkdownBeforeInput(e:InputEvent){
 const el=e.currentTarget as HTMLTextAreaElement;
 if(busy||e.isComposing)return;
 const v=el.value,s=el.selectionStart,t=el.selectionEnd,{lineStart,line,lead}=lineInfo(v,s);
 if(e.inputType==='insertLineBreak'||(e.inputType==='insertText'&&e.data==='\n')){
  e.preventDefault();
  if(handleMarkdownListEnter(el,v,s,t,lineStart,line))return;
  replace(el,s,t,'\n'+lead);return;
 }
 handlePairAndBackspace(e,el,MD_AUTO_PAIRS,MD_WRAP_PAIRS,false,true,false);
}

// ref 回调：给代码 / 综合题 textarea 挂上代码编辑增强（自动括号与引号补全、缩进、回车对齐）。
export function codeEditing(el:HTMLTextAreaElement|null){
 if(!el||el.dataset.code)return;
 el.dataset.code='1';
 el.addEventListener('keydown',onCodeKeyDown);
 el.addEventListener('beforeinput',onCodeBeforeInput);
}

// ref 回调：给文本 / Markdown textarea 挂上自动 Markdown 编辑增强（1. 回车自动序号化、无序列表/待办/引用延续、括号与反引号补全、包裹选中内容）。
export function markdownEditing(el:HTMLTextAreaElement|null){
 if(!el||el.dataset.md)return;
 el.dataset.md='1';
 el.addEventListener('keydown',onMarkdownKeyDown);
 el.addEventListener('beforeinput',onMarkdownBeforeInput);
}
