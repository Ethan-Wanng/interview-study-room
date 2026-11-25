import {splitModelTag,thinkingLevelBadgeText,type ThinkingLevel} from './thinking';
// AI 评分接口（POST /api/grade）的请求与响应格式，练习题和试卷共用。
// 一次请求算一次额度：练习时一次评一道题，试卷交卷时把所有主观题放在一次请求里。
export type GradeKind='fill'|'short'|'code'|'design';
export type GradeItem={id:string;kind:GradeKind;q:string;code?:string;reference:string;points:string[];scores?:number[];max:number;answer:string};
export type GradeModelId='auto'|'gemini'|'deepseek'|'custom'|'local';
export type GradeModelOption={id:Exclude<GradeModelId,'custom'|'local'>;name:string;nameEn:string;hint:string;hintEn:string};
export const GRADE_MODELS:GradeModelOption[]=[
 {id:'auto',name:'自动（Gemini 4 优先）',nameEn:'Auto (Gemini 4 first)',hint:'优先 Gemini 4 Hydrogen（依次降级 3.8 Flash / 3.6 Flash），失败时自动使用 DeepSeek V4.1 Flash（思考模式）保底',hintEn:'Prefer Gemini 4 Hydrogen (fallback 3.8 / 3.6 Flash), auto fallback to DeepSeek V4.1 Flash (thinking)'},
 {id:'gemini',name:'Gemini 4 Hydrogen',nameEn:'Gemini 4 Hydrogen',hint:'默认 Gemini 4 Hydrogen，不可用时依次降级 Gemini 3.8 Flash / 3.6 Flash（仅 Gemini 走代理模式）',hintEn:'Default Gemini 4 Hydrogen with fallback to Gemini 3.8 / 3.6 Flash via Gemini-only proxy'},
 {id:'deepseek',name:'DeepSeek V4.1 Flash（思考）',nameEn:'DeepSeek V4.1 Flash (Thinking)',hint:'使用 DeepSeek V4.1 Flash 深度思考模式评分，与 AI 对话模型独立选择',hintEn:'DeepSeek V4.1 Flash with thinking mode enabled (independent from tutor model)'},
];
export const DEFAULT_GRADE_MODEL:GradeModelId='auto';
export const isGradeModelId=(v:unknown):v is GradeModelId=>v==='auto'||v==='gemini'||v==='deepseek'||v==='custom'||v==='local';
export const parseGradeModel=(v:unknown):GradeModelId=>isGradeModelId(v)?v:DEFAULT_GRADE_MODEL;
export function gradeModelBadge(model:string|undefined,lang:'zh'|'en'='zh'):string{
 const {base:m,level}=splitModelTag(model);
 if(!m)return '';
 const lvTag=level?(lang==='en'?` (${thinkingLevelBadgeText(level,lang)})`:`（${thinkingLevelBadgeText(level,lang)}）`):'';
 if(m.startsWith('local:')){
  const rest=m.slice(6),slash=rest.indexOf('/');
  const prov=slash>0?rest.slice(0,slash):rest,name=slash>0?rest.slice(slash+1):'default';
  const labels:Record<string,string>={antigravity:'Antigravity',codex:'Codex',workbuddy:'WorkBuddy'};
  return `${labels[prov]??prov} · ${name}${lvTag}`;
 }
 if(m==='gemini-4-hydrogen')return `Gemini 4 Hydrogen${lvTag}`;
 if(m==='gemini-3.8-flash')return (lang==='en'?'Gemini 3.8 Flash (fallback)':'Gemini 3.8 Flash（降级）')+(level?` · ${thinkingLevelBadgeText(level,lang)}`:'');
 if(m==='gemini-3.6-flash')return (lang==='en'?'Gemini 3.6 Flash (fallback)':'Gemini 3.6 Flash（降级）')+(level?` · ${thinkingLevelBadgeText(level,lang)}`:'');
 if(m==='deepseek-flash (thinking)'||m==='deepseek-flash-think')return (lang==='en'?'DeepSeek V4.1 Flash (Thinking)':'DeepSeek V4.1 Flash（思考）')+lvTag;
 if(m==='deepseek-flash')return `DeepSeek V4.1 Flash${lvTag}`;
 return m+lvTag;
}
export type GradeRequest={items:GradeItem[];model?:GradeModelId;geminiProxy?:boolean;mode?:'grade'|'standard';thinkingLevel?:ThinkingLevel};
// 直接在学生作答原文上的划词/逐句批注：
// quote 为学生原文中的原话片段；kind 表示有错（wrong）、表述不完整/片面（warn）或答对要点（right）；
// comment 指出具体哪里错了、为什么错以及正确说法（或答对了哪个要点）。
export type GradeMarkKind='wrong'|'warn'|'right';
export type GradeMark={quote:string;kind:GradeMarkKind;comment:string;pending?:boolean};
// hits 与 points 一一对应：got 是这个得分点拿到的分，comment 说明哪里答到了、哪里没答到。
// pending：流式评分时这个得分点还没写到（页面显示“评估中”）。
export type GradeHit={point:string;got:number;max:number;comment:string;pending?:boolean};
// answer：可选的满分示范回答；marks：直接在学生答案原文上的批注列表。
export type GradeResult={id:string;score:number;max:number;marks?:GradeMark[];hits:GradeHit[];feedback:string;answer?:string};
// 额度用完、未登录、请求无效时直接返回 JSON（带 HTTP 状态码）。
export type GradeResponse={results:GradeResult[];model:string;remaining:number}|{error:'quota';remaining:0;message:string}|{error:'failed'|'auth'|'invalid';message:string};
// 开始评分后返回 NDJSON 流，每行一个事件：start 已连上；delta 模型新写出的一段原始文字（JSON 的一部分）；
// reset 换模型重试，清掉已收到的文字；done 最终结果（服务端校正过分数）；error 评分失败，这次不扣次数。
export type GradeEvent={t:'start'}|{t:'think';text:string}|{t:'delta';text:string}|{t:'reset'}|{t:'done';results:GradeResult[];text?:string;model:string;remaining:number}|{t:'error';message:string};

// 每日 AI 评分额度：游客 3 次，普通登录用户与全站站点 DeepSeek 共用每日 50 次。
export const GRADE_QUOTA={guest:3,user:50} as const;
export const GRADE_LIMITS={items:25,answer:8000,total:80000} as const;
// 没写 scores 时按得分点平均分配，余数从前往后各补 1 分。
export function pointScores(points:string[],max:number,scores?:number[]){if(scores&&scores.length===points.length)return scores;
 const base=Math.floor(max/points.length),rest=max-base*points.length;return points.map((_,i)=>base+(i<rest?1:0))}
