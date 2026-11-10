// 代码题的多语言参考答案。题目自身的 reference 是主写法（base 标明它是哪种语言），
// 这里按题目 id 补充其他语言的写法，答题页可以切换查看。
import {aiExamRefs} from './ai-exams';
import {aiJourneyRefs} from './ai-journey';
import {backendRefs} from './backend';

export const codeLangs=[
 {id:'python',label:'Python'},
 {id:'go',label:'Go'},
 {id:'java',label:'Java'},
 {id:'ts',label:'JS/TS'},
 {id:'rust',label:'Rust'},
] as const;
export type CodeLang=typeof codeLangs[number]['id'];
export type CodeRefEntry={base:CodeLang}&Partial<Record<CodeLang,string>>;

const all:Record<string,CodeRefEntry>={...aiExamRefs,...aiJourneyRefs,...backendRefs};

// 返回某道题全部语言的参考答案（含主写法）；没有补充写法时返回 undefined。
export function codeRefsFor(id:string,reference:string):{base:CodeLang;refs:Partial<Record<CodeLang,string>>}|undefined{
 const e=all[id];if(!e)return undefined;
 const {base,...rest}=e;
 return {base,refs:{...rest,[base]:reference}};
}
