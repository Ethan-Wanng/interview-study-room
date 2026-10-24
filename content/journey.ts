// 闯关学习的通用数据结构（AI 开发、Go 开发等学科共用）。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
export type AiLesson={title:string;body:string;code?:string};
// single 单选（默认）· multi 多选（全对才算对）· judge 判断 · fill 填空（任一可接受答案即对）· short 简答 / code 代码（看参考答案后自评）
// interview：关联的面试题 id，答完题后可以展开对照。
export type AiQuiz={id:string;q:string;explain:string;code?:string;interview?:string}&({type?:'single';options:string[];answer:number}|{type:'multi';options:string[];answers:number[]}|{type:'judge';answer:boolean}|{type:'fill';accepted:string[]}|{type:'short'|'code';reference:string;points:string[]});
export type AiQuizType=NonNullable<AiQuiz['type']>;
export const aiQuizTypes:Record<AiQuizType,string>={single:'单选',multi:'多选',judge:'判断',fill:'填空',short:'简答',code:'代码'};
export type AiLevel={id:string;title:string;summary:string;lessons:AiLesson[];quiz:AiQuiz[]};
export type Tier={name:string;nameEn:string;from:number;to:number};
export type Rank={min:number;name:string};
const normalize=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export const fillMatches=(accepted:string[],value:string)=>accepted.some(a=>normalize(a)===normalize(value));
// 难度分档与段位：from/to 为关卡序号（从 0 开始，含两端）。
export const tierAt=(tiers:Tier[],index:number)=>tiers.find(t=>index>=t.from&&index<=t.to)??tiers[tiers.length-1];
export const rankAt=(ranks:Rank[],passed:number)=>[...ranks].reverse().find(r=>passed>=r.min)!.name;
