// 闯关学习的通用数据结构（AI 开发、Go 开发等学科共用）。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// explain：代码讲解，逐段说明 code 在做什么。at 是这一段第一行里的一段原文（用来定位行号），to 是最后一行里的原文（只有一行时省略）。
// 写讲解时引用代码原文而不是行号，代码改动后不会错位；scripts/check-lesson-code.mjs 会检查每段原文都能在代码里找到。
export type CodeNote={at:string;to?:string;text:string};
// practice：“动手试试”卡片，让学习者在自己的电脑上操作：steps 是按顺序做的步骤，code 是要运行的代码，expect 是应该看到的输出。
export type Practice={steps:string[];expect?:string};
export type AiLesson={title:string;body:string;code?:string;explain?:CodeNote[];practice?:Practice};
// single 单选（默认）· multi 多选（全对才算对）· judge 判断 · fill 填空（任一可接受答案即对）· short 简答 / code 代码 / design 综合（AI 按得分点评分，额度用完时对照参考答案自评）
// interview：关联的面试题 id，答完题后可以展开对照。
// why：与 options 一一对应，说明每个错误选项其实是什么、用来干什么（正确选项写空字符串）。
// blanks：多空填空题，每个空一组可接受答案，题干里用「＿＿」标出空的位置；只有一个空时用 accepted。
// scores：与 points 一一对应，每个得分点的分值（试卷题必填，练习题可省略，省略时按要点平均）。
export type AiQuiz={id:string;q:string;explain:string;code?:string;interview?:string}&({type?:'single';options:string[];answer:number;why?:string[]}|{type:'multi';options:string[];answers:number[];why?:string[]}|{type:'judge';answer:boolean}|{type:'fill';accepted:string[];blanks?:string[][]}|{type:'short'|'code'|'design';reference:string;points:string[];scores?:number[]});
export type AiQuizType=NonNullable<AiQuiz['type']>;
export const aiQuizTypes:Record<AiQuizType,string>={single:'单选',multi:'多选',judge:'判断',fill:'填空',short:'简答',code:'代码',design:'综合'};
// 多空填空题的空数（单空题为 1）。
export const blankCount=(q:Extract<AiQuiz,{type:'fill'}>)=>q.blanks?.length??1;
export type AiLevel={id:string;title:string;summary:string;lessons:AiLesson[];quiz:AiQuiz[]};
export type Tier={name:string;nameEn:string;from:number;to:number};
export type Rank={min:number;name:string};
const normalize=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export const fillMatches=(accepted:string[],value:string)=>accepted.some(a=>normalize(a)===normalize(value));
// 难度分档与段位：from/to 为关卡序号（从 0 开始，含两端）。
export const tierAt=(tiers:Tier[],index:number)=>tiers.find(t=>index>=t.from&&index<=t.to)??tiers[tiers.length-1];
export const rankAt=(ranks:Rank[],passed:number)=>[...ranks].reverse().find(r=>passed>=r.min)!.name;

// 阶段训练与考试：题目全新、比关卡更难。requires 是解锁条件（关卡 id 或其他考试 id），after 是显示在哪个难度分档之后。
// training：某一阶段的关卡全部通关后解锁，题量 = 该阶段关卡题目总数 ÷ 2（向上取整）；
// stage：两个阶段的训练都通过后解锁；final：两次阶段考试都通过后解锁。两者都是 44 题、150 分、限时 120 分钟的正式试卷（content/papers），包含所有题型。
export type ExamKind='training'|'stage'|'final';
export type Exam={id:string;kind:ExamKind;title:string;summary:string;tiers:number[];after:number;requires:string[];passRate:number;quiz:AiQuiz[]};
export const examKindNames:Record<ExamKind,[string,string]>={training:['阶段训练','Stage training'],stage:['阶段考试','Stage exam'],final:['最终考试','Final exam']};
// 按固定规则搭出一个学科的 4 次阶段训练、2 次阶段考试和 1 次最终考试（学科必须是 4 个难度分档）。
export function buildExams(o:{prefix:string;subject:string;levels:AiLevel[];tiers:Tier[];trainings:AiQuiz[][];stages:[AiQuiz[],AiQuiz[]];final:AiQuiz[]}):Exam[]{
 const ids=(t:number)=>o.levels.slice(o.tiers[t].from,o.tiers[t].to+1).map(l=>l.id);
 const train=(t:number):Exam=>({id:`${o.prefix}-train-${t+1}`,kind:'training',title:`${o.tiers[t].name}阶段训练`,summary:`${o.tiers[t].name}阶段全部通关后解锁，全新的综合题，比关卡更难`,tiers:[t],after:t,requires:ids(t),passRate:0.65,quiz:o.trainings[t]??[]});
 const stage=(n:0|1):Exam=>{const a=n*2,b=a+1;return {id:`${o.prefix}-exam-${n+1}`,kind:'stage',title:`阶段考试${n?'二':'一'}：${o.tiers[a].name} + ${o.tiers[b].name}`,summary:`通过「${o.tiers[a].name}」「${o.tiers[b].name}」两次阶段训练后解锁，150 分正式试卷，限时 120 分钟，包含所有题型`,tiers:[a,b],after:b,requires:[`${o.prefix}-train-${a+1}`,`${o.prefix}-train-${b+1}`],passRate:0.65,quiz:o.stages[n]}};
 return [train(0),train(1),stage(0),train(2),train(3),stage(1),{id:`${o.prefix}-final`,kind:'final',title:`${o.subject}最终考试`,summary:'两次阶段考试都通过后解锁，150 分正式试卷，限时 120 分钟，覆盖全部关卡，难度最高',tiers:[0,1,2,3],after:3,requires:[`${o.prefix}-exam-1`,`${o.prefix}-exam-2`],passRate:0.7,quiz:o.final}];
}
// 一次训练或考试实际出多少题：训练 = 覆盖阶段的关卡题目总数 ÷ 2（向上取整），不超过题库里写好的题数；阶段考试和最终考试是固定 44 题的试卷。
export const PAPER_QUESTIONS=44;
export const examSize=(e:Exam,levels:AiLevel[],tiers:Tier[])=>e.kind==='training'?Math.min(e.quiz.length,Math.ceil(e.tiers.flatMap(t=>levels.slice(tiers[t].from,tiers[t].to+1)).reduce((n,l)=>n+l.quiz.length,0)/2)):PAPER_QUESTIONS;
