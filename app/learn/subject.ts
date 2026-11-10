import type {AiLevel,Exam,Rank,Tier} from '@/content/journey';
import type {Animation} from '../ai/animations/types';
import type {Stacks} from '../ai/stack';

// 一个可以闯关学习的学科：关卡、难度分档、段位，以及每关关联的面试题。
export type Subject={
 id:string;                               // 也用作进度存储的前缀
 storageKey:string;                       // 浏览器里保存进度的键前缀（AI 沿用旧键，避免丢进度）
 name:[string,string];                    // 学科名 [中文, 英文]
 eyebrow:string;                          // 首页大标题上方的小字
 title:[string,string];
 levels:AiLevel[];
 tiers:Tier[];
 ranks:Rank[];
 passRate:number;
 interviewByLevel:Record<string,string[]>;
 interviewSubject:[string,string];        // 「面试」里对应的学科名
 exams:Exam[];                            // 阶段训练、阶段考试和最终考试
 animations:Animation[];                  // 动画课堂（按关卡关联，没有就传空数组）
 links?:{href:string;icon:string;title:[string,string];summary:[string,string]}[]; // 关卡地图顶部的额外入口（比如英语的背单词）
 levelsEn?:Record<string,{title:string;summary:string;lessons:AiLevel['lessons']}>; // 英文版学习卡片（按关卡 id）：英文界面下替换标题、简介和卡片，卡片张数和顺序与中文版一致，这样“第几张”的链接两边通用
 stacks?:Stacks;                          // 项目实战：可选的后端语言和前端做法，学习卡片和代码题按选择显示对应版本
};
