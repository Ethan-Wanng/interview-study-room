import type {ComponentType} from 'react';

// 一个分镜：字幕 + 停留时长（毫秒）。画面由 Visual 根据当前分镜序号 step 渲染。
export type Scene={caption:string;ms:number};
export type Animation={id:string;title:string;summary:string;icon:string;level:string;kind:'basic'|'advanced';scenes:Scene[];Visual:ComponentType<{step:number}>};
