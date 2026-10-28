export type QuestionType='choice'|'fill'|'short'|'code';
export type PracticeQuestion={id:string;track:string;type:QuestionType;topic:string;prompt:string;options?:string[];accepted?:string[];answer:string;explanation:string;rubric:string[];code?:string;source?:string;jobTags?:string[]};
export const typeNames:Record<QuestionType,string>={choice:'选择题',fill:'填空题',short:'简答题',code:'代码题'};
// 训练中心原来内置的 48 道 Go/后端练习题已下线（训练改为「学习」里的阶段训练与考试）。
// 这里保留题目结构和判分函数：后台通过 API 创建的题集仍可使用。原题保存在 tests/fixtures/practice-bank.ts，仅供测试。
export const practiceQuestions:PracticeQuestion[]=[];
export const practiceMap=new Map(practiceQuestions.map(q=>[q.id,q]));
export function normalizeAnswer(value:string){return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')}
export function grade(q:PracticeQuestion,value:string):boolean|null{return q.accepted?q.accepted.some(a=>normalizeAnswer(a)===normalizeAnswer(value)):null}
