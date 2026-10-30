import type {AiQuiz,AiQuizType} from '../journey';

// 150 分正式试卷：阶段考试一、阶段考试二和最终考试各一份。题目按题型分组，组内越往后越难、迷惑性越高。
// 单选 12×2 · 多选 8×3（少选多选错选都算错）· 判断 6×2 · 填空 10 题共 15 空、每空 1 分 · 简答 5×5 · 代码 10 + 14 · 综合（设计 + 代码）26。
export type Paper={id:string;subject:string;title:string;questions:AiQuiz[]};
export const PAPER_MINUTES=120,PAPER_TOTAL=150;
export const paperSections:{type:AiQuizType;title:string;titleEn:string;count:number}[]=[
 {type:'single',title:'单选题',titleEn:'Single choice',count:12},
 {type:'multi',title:'多选题',titleEn:'Multiple choice',count:8},
 {type:'judge',title:'判断题',titleEn:'True or false',count:6},
 {type:'fill',title:'填空题',titleEn:'Fill in the blanks',count:10},
 {type:'short',title:'简答题',titleEn:'Short answer',count:5},
 {type:'code',title:'代码题',titleEn:'Coding',count:2},
 {type:'design',title:'综合题',titleEn:'Design and coding',count:1},
];
export const FILL_BLANKS=15;
const codeScores=[10,14];
// 某道题的满分：index 是它在本题型里的序号（从 0 开始）。填空题每空 1 分。
export function questionMax(q:AiQuiz,index:number){switch(q.type??'single'){
 case 'single':case 'judge':return 2;
 case 'multi':return 3;
 case 'fill':return q.type==='fill'?(q.blanks?.length??1):1;
 case 'short':return 5;
 case 'code':return codeScores[index]??10;
 case 'design':return 26;
 default:return 0}}
// 按题型分组，保持题目在文件里的先后顺序。
export function paperGroups(p:Paper){return paperSections.map(s=>({...s,questions:p.questions.filter(q=>(q.type??'single')===s.type)}))}
