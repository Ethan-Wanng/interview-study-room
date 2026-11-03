// AI 老师（POST /api/tutor）的请求与事件格式。三种用法：
// practice：在“动手试试”卡片里一步步带学习者在自己电脑上操作；
// hint：答题前给一点提示，只指方向、不透露答案；
// explain：答题后仍然不懂时讲解这道题，可以接着追问。
// 对话历史由页面保存，每次请求都带上完整历史（模型本身不记得上一次请求）。
export type TutorRole='user'|'model';
export type TutorMessage={role:TutorRole;text:string};
export type TutorLesson={title:string;body:string;steps:string[];code?:string;expect?:string;solution?:string};
// 题目信息：answer 是正确答案的文字，given 是学习者的作答（答题前为空），correct 表示是否答对。
export type TutorQuiz={type:string;q:string;code?:string;options?:string[];answer:string;explain:string;given?:string;correct?:boolean};
// lesson：看学习卡片时随时提问，AI 针对这张卡片的内容讲解（steps 为空数组）。
// task：项目实战里“自己动手写”的任务卡，AI 只当教练给提示，不代写；solution 是参考答案，只给 AI 判断用，不会整段给学习者。
export type TutorContext={kind:'practice'|'lesson'|'task';lesson:TutorLesson}|{kind:'hint'|'explain';quiz:TutorQuiz};
export type TutorRequest={context:TutorContext;messages:TutorMessage[]};
// 流式事件（NDJSON，每行一个）：start 已连上；delta 新写出的文字；reset 换模型重试，清掉已收到的文字；done 写完；error 失败（这次不扣次数）。
export type TutorEvent={t:'start'}|{t:'delta';text:string}|{t:'reset'}|{t:'done';remaining:number}|{t:'error';message:string};

// 每日额度：每发一条消息算一次（动手练习、提示、讲解共用）。
export const TUTOR_QUOTA={guest:20,user:200} as const;
export const TUTOR_LIMITS={messages:30,text:4000,lesson:12000} as const;
