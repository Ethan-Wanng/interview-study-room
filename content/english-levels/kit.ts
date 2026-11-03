import type {Phrase} from '../journey';

// 写英语卡片的小工具：w 是单词表里的一个词（例句可选），r 是阅读短文里的一句（para 为 true 时另起一段）。
export const w=(en:string,zh:string,ex?:string,exZh?:string,tip?:string):Phrase=>({kind:'word',en,zh,ex,exZh,tip});
export const r=(en:string,zh:string,para?:boolean):Phrase=>({kind:'read',en,zh,p:para});
