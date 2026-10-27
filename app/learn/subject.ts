import type {AiLevel,Rank,Tier} from '@/content/journey';
import type {Animation} from '../ai/animations/types';

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
 animations:Animation[];                  // 动画课堂（按关卡关联，没有就传空数组）
};
