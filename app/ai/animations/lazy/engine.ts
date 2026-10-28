// 懒人模式：用一个完整的故事把几关内容串起来讲，适合“躺着听”。
// 每一镜的停留时间按旁白字数估算（语音朗读约每字 0.21 秒），整集不超过 30 分钟（由 scripts/check-stories.mjs 校验）。
import {storyAnimation,type Beat} from '../story';
import type {Animation} from '../types';

export type LazyEpisode={id:string;subject:string;tier:number;levels:string[];icon:string;title:string;summary:string;beats:Beat[]};
export const LAZY_MAX_MINUTES=30;
const PACE=0.7; // 与播放器一致
export const narrationMs=(say:string)=>Math.round(([...say].length*210+1600)/PACE);
export const withNarration=(e:LazyEpisode):Beat[]=>e.beats.map(b=>({...b,ms:b.ms??narrationMs(b.say+(b.memo?.join('')??''))}));
export const lazyMinutes=(e:LazyEpisode)=>withNarration(e).reduce((n,b)=>n+(b.ms??0)*PACE,0)/60000;
export const lazyAnimation=(e:LazyEpisode):Animation=>storyAnimation({id:e.id,level:e.levels[0],kind:'lazy',icon:e.icon,title:e.title,summary:e.summary,beats:withNarration(e)});
