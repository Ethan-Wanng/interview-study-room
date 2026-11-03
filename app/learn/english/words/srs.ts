// 背单词的复习安排（间隔重复）：每个词有一个“盒子”等级，答对升一级、隔更久再复习，答错回到 0 级当天再练。
// 盒子 0～7 对应的复习间隔（天）：当天、1、2、4、7、15、30、60。到 4 级（隔一周还记得）算“已掌握”。
export type Card={b:number;d:number;n:number;w:number}; // b 盒子等级，d 下次复习的日期（天序号），n 见过几次，w 错过几次
export type Store={cards:Record<string,Card>;book:string;perDay:number;day:number;newToday:number;listen:boolean;estimate?:{size:number;day:number}};
export const GAPS=[0,1,2,4,7,15,30,60];
export const MASTERED=4,KNOWN=2;
// 本地日期的天序号（按用户所在时区，过了午夜才算新的一天）。
export const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*60000)/86400000);
export const emptyStore=():Store=>({cards:{},book:'a1',perDay:20,day:today(),newToday:0,listen:false});
export const storeKey=(username:string)=>'english-words:v1:'+(username||'guest');
export function loadStore(username:string):Store{try{const raw=localStorage.getItem(storeKey(username));const s:Store=raw?{...emptyStore(),...JSON.parse(raw)}:emptyStore();if(s.day!==today()){s.day=today();s.newToday=0}return s}catch{return emptyStore()}}
export function saveStore(username:string,s:Store){try{localStorage.setItem(storeKey(username),JSON.stringify(s))}catch{}}
// 答对：新词第一次就答对说明本来认识，直接放到 2 级；复习答对升一级。答错：回到 0 级，今天还会再出现。
export function answer(c:Card|undefined,right:boolean):Card{const d=today();
 if(!right)return {b:0,d,n:(c?.n??0)+1,w:(c?.w??0)+1};
 const b=c?Math.min(c.b+1,GAPS.length-1):KNOWN;return {b,d:d+GAPS[b],n:(c?.n??0)+1,w:c?.w??0}}
export const isDue=(c:Card)=>c.d<=today();
