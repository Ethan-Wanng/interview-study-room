import type {PracticeQuestion} from '@/content/practice';
export const trainingTracks=[{id:'all',name:'Go 与后端通用'},{id:'go',name:'Go 语言'},{id:'backend',name:'后端通用'}];
export type Mode='exam'|'interview'|'random';
export type Answer={value:string;submitted:boolean;self:number|null};
export type Payload={mode:Mode;track:string;minutes:number;ids:string[];answers:Answer[];index:number;seconds:number;lastTick:number};
export type QuestionView=Omit<PracticeQuestion,'accepted'|'answer'|'explanation'|'rubric'|'code'>&{answer?:string;explanation?:string;rubric?:string[];code?:string};
export type RunView={id:string;status:string;revision:number;createdAt:number;mode:Mode;track:string;minutes:number;seconds:number;index:number;items:{question:QuestionView;response:Answer;correct:boolean|null}[]};
export type History={id:string;mode:Mode;status:string;createdAt:number;seconds:number;answered:number;count:number;correct:number;objective:number};
export type PracticeState={today:string;goal:number;seconds:number;active:RunView|null;history:History[];review?:RunView};
