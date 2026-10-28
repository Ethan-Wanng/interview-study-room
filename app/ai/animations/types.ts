import type {ComponentType} from 'react';

// 一个分镜：字幕 + 停留时长（毫秒）。画面由 Visual 根据当前分镜序号 step 渲染。
// cue：这一镜发生的事件（登场、传递、对错、口诀），用来安排音效；手绘动画没有。
export type Cue={add:number;send:number;drop:number;bubble:boolean;ok:boolean;bad:boolean;memo:boolean};
// speech：语音朗读的内容，默认读字幕；结尾的口诀镜头会把口诀也读出来。
export type Scene={caption:string;ms:number;cue?:Cue;speech?:string};
// continuous：画面元素跨分镜保持不变、平滑移动（故事板动画），播放器不做整幅交叉淡化。
// interview：面试题动画对应的面试题 id。
export type Animation={id:string;title:string;summary:string;icon:string;level:string;kind:'basic'|'advanced'|'interview'|'review'|'lazy';scenes:Scene[];Visual:ComponentType<{step:number}>;continuous?:boolean;interview?:string};
