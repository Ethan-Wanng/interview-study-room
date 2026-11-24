import type {CodeLang} from '../code-refs';
export type StarterLang=CodeLang|'sql';
// 一道题各语言的作答框架（键是题目 id）。
export type StarterMap=Record<string,Partial<Record<StarterLang,string>>>;
