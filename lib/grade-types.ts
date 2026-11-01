// AI 评分接口（POST /api/grade）的请求与响应格式，练习题和试卷共用。
// 一次请求算一次额度：练习时一次评一道题，试卷交卷时把所有主观题放在一次请求里。
export type GradeKind='short'|'code'|'design';
export type GradeItem={id:string;kind:GradeKind;q:string;code?:string;reference:string;points:string[];scores?:number[];max:number;answer:string};
export type GradeRequest={items:GradeItem[]};
// hits 与 points 一一对应：got 是这个得分点拿到的分，comment 说明哪里答到了、哪里没答到。
export type GradeHit={point:string;got:number;max:number;comment:string};
// answer：AI 自己写的满分示范回答，评分后展示给学生对照。
export type GradeResult={id:string;score:number;max:number;hits:GradeHit[];feedback:string;answer?:string};
export type GradeResponse={results:GradeResult[];model:string;remaining:number}|{error:'quota';remaining:0;message:string}|{error:'failed';message:string};

// 每日 AI 评分额度：游客 5 次，登录用户 100 次。
export const GRADE_QUOTA={guest:5,user:100} as const;
export const GRADE_LIMITS={items:12,answer:8000,total:60000} as const;
// 没写 scores 时按得分点平均分配，余数从前往后各补 1 分。
export function pointScores(points:string[],max:number,scores?:number[]){if(scores&&scores.length===points.length)return scores;
 const base=Math.floor(max/points.length),rest=max-base*points.length;return points.map((_,i)=>base+(i<rest?1:0))}
