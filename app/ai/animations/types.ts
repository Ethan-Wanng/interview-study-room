import type {ComponentType} from 'react';

// 一个分镜：字幕 + 停留时长（毫秒）。画面由 Visual 根据当前分镜序号 step 渲染。
export type Scene={caption:string;ms:number};
// continuous：画面元素跨分镜保持不变、平滑移动（故事板动画），播放器不做整幅交叉淡化。
// interview：面试题动画对应的面试题 id。
export type Animation={id:string;title:string;summary:string;icon:string;level:string;kind:'basic'|'advanced'|'interview';scenes:Scene[];Visual:ComponentType<{step:number}>;continuous?:boolean;interview?:string};
