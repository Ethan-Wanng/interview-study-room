// AI 老师（POST /api/tutor）的请求与事件格式：在“动手试试”卡片里一步步带学习者在自己电脑上操作。
// 对话历史由页面保存，每次请求都带上完整历史（模型本身不记得上一次请求）。
export type TutorRole='user'|'model';
export type TutorMessage={role:TutorRole;text:string};
export type TutorLesson={title:string;body:string;steps:string[];code?:string;expect?:string};
export type TutorRequest={lesson:TutorLesson;messages:TutorMessage[]};
// 流式事件（NDJSON，每行一个）：start 已连上；delta 新写出的文字；reset 换模型重试，清掉已收到的文字；done 写完；error 失败（这次不扣次数）。
export type TutorEvent={t:'start'}|{t:'delta';text:string}|{t:'reset'}|{t:'done';remaining:number}|{t:'error';message:string};

// 每日额度：每发一条消息算一次。
export const TUTOR_QUOTA={guest:20,user:200} as const;
export const TUTOR_LIMITS={messages:30,text:4000,lesson:12000} as const;
