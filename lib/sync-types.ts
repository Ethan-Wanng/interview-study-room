// 学习进度云同步（/api/store）用到的键名规则，浏览器和服务器共用。
// 浏览器里的键带着用户名（例如 go-journey:v1:xiaoyi），存到服务器时把用户名换成 “@me”，
// 这样游客升级成正式账号、昵称变了以后，进度仍然能对上。技术栈选择的键不带用户名，原样存；
// 试卷记录在浏览器里是“前缀 + 用户名 + :paper:考试 id”，存到服务器时去掉用户名，变成“前缀 + paper:考试 id”。
export type SyncItem={key:string;value:string;updatedAt:number};
export const SYNC_LIMITS={value:200_000,batch:50,keys:400,body:2_000_000} as const;
const JOURNEY=/^([a-z][a-z-]{0,40}-journey:v1:)(.*)$/,WORDS='english-words:v1:';
// AI 老师的对话记录：键不带用户名，原样存到服务器（两边不同时用较新的一边）。
const TUTOR='ai-tutor:v1:history';

// 服务器接受的键：闯关进度、英语单词（@me）、试卷记录（paper:考试 id）、技术栈选择（stack）。
export const syncedKey=(k:string)=>k===WORDS+'@me'||k===TUTOR||/^[a-z][a-z-]{0,40}-journey:v1:(@me|stack|paper:[A-Za-z0-9_.-]{1,80})$/.test(k);
// 浏览器里的键 → 服务器上的键；不需要同步的键返回 null。name 是页面上用来拼键名的用户名（游客为 guest）。
export function toServerKey(local:string,name:string):string|null{
 if(local===WORDS+name)return WORDS+'@me';
 if(local===TUTOR)return TUTOR;
 const m=local.match(JOURNEY);if(!m)return null;
 const [,prefix,rest]=m,mine=name+':paper:';
 const key=rest==='stack'||rest.startsWith('paper:')?local:rest.startsWith(mine)?prefix+'paper:'+rest.slice(mine.length):rest===name?prefix+'@me':null;
 return key&&syncedKey(key)?key:null}
export const toLocalKey=(server:string,name:string)=>{if(server.endsWith(':@me'))return server.slice(0,-3)+name;
 const m=server.match(/^([a-z][a-z-]{0,40}-journey:v1:)paper:(.+)$/);return m?m[1]+name+':paper:'+m[2]:server};

// 两边都有进度时合并而不是二选一：通关的关卡取并集、最佳成绩取最高；单词卡片取练得更多的那张；其余字段用较新的一边。
type Journey={best?:Record<string,number>;passed?:string[];mistakes?:string[]};
type Card={n?:number};type Words={cards?:Record<string,Card>};
export function mergeValues(server:string,a:string,aTime:number,b:string,bTime:number):string|null{
 if(!server.endsWith(':@me'))return null;
 let x:unknown,y:unknown;try{x=JSON.parse(a);y=JSON.parse(b)}catch{return null}
 if(!x||!y||typeof x!=='object'||typeof y!=='object')return null;
 const [older,newer]=(aTime>bTime?[y,x]:[x,y]) as [Record<string,unknown>,Record<string,unknown>];
 if(server.startsWith(WORDS)){const o=(older as Words).cards??{},n=(newer as Words).cards??{},cards:Record<string,Card>={...o};
  for(const [w,c] of Object.entries(n))if(!cards[w]||(c?.n??0)>=(cards[w]?.n??0))cards[w]=c;
  return JSON.stringify({...older,...newer,cards})}
 const o=older as Journey,n=newer as Journey,norm=(v:number)=>v>1?v/150:v,best:Record<string,number>={};
 for(const [k,v] of Object.entries(o.best??{}))if(typeof v==='number')best[k]=norm(v);
 for(const [k,v] of Object.entries(n.best??{}))if(typeof v==='number')best[k]=Math.max(norm(v),best[k]??-Infinity);
 return JSON.stringify({...o,...n,best,passed:[...new Set([...(o.passed??[]),...(n.passed??[])])],mistakes:n.mistakes??o.mistakes??[]})}
