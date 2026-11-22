import {splitModelTag,thinkingLevelBadgeText,type ThinkingLevel} from './thinking';
// AI 老师（POST /api/tutor）的请求与事件格式。三种用法：
// practice：在“动手试试”卡片里一步步带学习者在自己电脑上操作；
// hint：答题前给一点提示，只指方向、不透露答案；
// explain：答题后仍然不懂时讲解这道题，可以接着追问。
// 对话历史由页面保存，每次请求都带上完整历史（模型本身不记得上一次请求）。
export type TutorRole='user'|'model';
// images：学习者附带的图片（data:image/...;base64 URL，页面已压缩到长边 1280 像素以内）。只有学习者的消息能带图。
// think：这条回复的思考过程（只在页面上显示，不会再发回接口）；secs：思考用了几秒；model：生成这条回复的模型标识。
export type TutorMessage={role:TutorRole;text:string;images?:string[];think?:string;secs?:number;model?:string};
// 图片限制：每条消息最多 3 张、一次请求最多 4 张（更早消息里的图片由页面换成“[图片]”文字），每张 data URL 不超过约 1.5MB。
export const TUTOR_IMAGES={perMessage:3,perRequest:4,size:1_500_000} as const;
export const IMAGE_URL=/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export type TutorLesson={title:string;body:string;steps:string[];code?:string;expect?:string;solution?:string};
export type TutorPlayground={lang:string;code:string;output?:string;error?:string};
// 题目信息：answer 是正确答案的文字，given 是学习者的作答（答题前为空），correct 表示是否答对。
export type TutorQuiz={type:string;q:string;code?:string;options?:string[];answer:string;explain:string;given?:string;correct?:boolean};
// lesson：看学习卡片时随时提问，AI 针对这张卡片的内容讲解（steps 为空数组）。
// task：项目实战里“自己动手写”的任务卡，AI 只当教练给提示，不代写；solution 是参考答案，只给 AI 判断用，不会整段给学习者。
// support：项目空间「智能 AI 客服实战」里的在线客服演练沙盒。
// playground：代码操场（Python / Go / Java / JS/TS / Rust）当前代码与运行输出。
// site：全站随处可问的 AI 老师（不在具体卡片或题目上时）。page 是学习者所在的页面地址，接口会按问题做站内搜索，把找到的卡片、题目链接交给 AI。
export type TutorContext={kind:'practice'|'lesson'|'task'|'support';lesson:TutorLesson}|{kind:'hint'|'explain'|'recite';quiz:TutorQuiz}|{kind:'playground';playground:TutorPlayground}|{kind:'site';page:string};
// model：学习者在对话框里选的模型。不传或 auto = 默认（开了专属 API 就用专属的，否则用站点的 DeepSeek）；
// custom = 自己的专属 API；其余是站点提供的模型 id（算站点每日次数）。
export type TutorRequest={context:TutorContext;messages:TutorMessage[];model?:string;geminiProxy?:boolean;thinkingLevel?:ThinkingLevel};
// id 是对话框里的选项，model 是真正发给接口的模型名，thinking 表示是否开启思考模式（先想再答，思考过程会显示出来）。
// DeepSeek 现在只有两个模型（见 https://api-docs.deepseek.com/zh-cn/quick_start/pricing）：deepseek-flash（V4.1 Flash，能识图）和 deepseek-v4-pro（不能识图）；旧名 deepseek-chat、deepseek-reasoner 已停用。
export type TutorModel={id:string;model:string;thinking:boolean;label:[string,string];provider:'deepseek'|'gemini';vision:boolean;note:[string,string]};
export const TUTOR_MODELS:TutorModel[]=[
 {id:'deepseek-flash',model:'deepseek-flash',thinking:false,label:['DeepSeek V4.1 Flash','DeepSeek V4.1 Flash'],provider:'deepseek',vision:true,note:['快，日常答疑，能看图','Fast, everyday questions, understands images']},
 {id:'deepseek-flash-think',model:'deepseek-flash',thinking:true,label:['DeepSeek V4.1 Flash · 深度思考','DeepSeek V4.1 Flash · thinking'],provider:'deepseek',vision:true,note:['先想再答，会显示思考的关键步骤','Thinks first and shows its key steps']},
 {id:'deepseek-v4-pro',model:'deepseek-v4-pro',thinking:true,label:['DeepSeek V4 Pro · 深度思考','DeepSeek V4 Pro · thinking'],provider:'deepseek',vision:false,note:['最强，适合难题，慢一些，不能看图','Strongest; slower, for hard problems, no images']},
 {id:'gemini-4',model:'gemini-4-hydrogen',thinking:true,label:['Gemini 4 Hydrogen · 深度思考','Gemini 4 Hydrogen · thinking'],provider:'gemini',vision:true,note:['默认 Gemini 4 Hydrogen，不可用时自动降级 Gemini 3.8 Flash（支持识图与思考过程）','Default Gemini 4 Hydrogen (fallback 3.8 Flash), supports images & thinking']},
];
export const DEFAULT_TUTOR_MODEL=TUTOR_MODELS[0];
export function tutorModelBadge(model:string|undefined,lang:'zh'|'en'='zh'):string{
 const {base:m,level}=splitModelTag(model);
 if(!m)return '';
 const lvTag=level?(lang==='en'?` (${thinkingLevelBadgeText(level,lang)})`:`（${thinkingLevelBadgeText(level,lang)}）`):'';
 if(m==='gemini-4-hydrogen')return `Gemini 4 Hydrogen${lvTag}`;
 if(m==='gemini-3.8-flash')return (lang==='en'?'Gemini 3.8 Flash (fallback)':'Gemini 3.8 Flash（降级）')+(level?` · ${thinkingLevelBadgeText(level,lang)}`:'');
 if(m==='gemini-2.5-flash')return (lang==='en'?'Gemini 2.5 Flash (fallback)':'Gemini 2.5 Flash（降级）')+(level?` · ${thinkingLevelBadgeText(level,lang)}`:'');
 if(m==='gemini-3.6-flash')return (lang==='en'?'Gemini 3.6 Flash (fallback)':'Gemini 3.6 Flash（降级）')+(level?` · ${thinkingLevelBadgeText(level,lang)}`:'');
 if(m==='deepseek-flash (thinking)'||m==='deepseek-flash-think')return (lang==='en'?'DeepSeek V4.1 Flash · thinking':'DeepSeek V4.1 Flash · 深度思考')+lvTag;
 if(m==='deepseek-flash')return `DeepSeek V4.1 Flash${lvTag}`;
 if(m==='deepseek-v4-pro'){
  if(level==='off')return lang==='en'?'DeepSeek V4 Pro (Thinking off)':'DeepSeek V4 Pro（关闭思考）';
  return (lang==='en'?'DeepSeek V4 Pro · thinking':'DeepSeek V4 Pro · 深度思考')+lvTag;
 }
 const slash=m.indexOf('/');
 if(slash>0){
  const prov=m.slice(0,slash),name=m.slice(slash+1);
  const names:Record<string,string>={openai:'OpenAI',anthropic:'Anthropic',gemini:'Gemini',deepseek:'DeepSeek',qwen:lang==='en'?'Qwen':'通义千问'};
  return `${names[prov]??prov} · ${name}${lvTag}`;
 }
 return m+lvTag;
}
// 流式事件（NDJSON，每行一个事件）：start 已连上；model 当前尝试的模型；delta 新写出的文字；reset 换模型重试，清掉已收到的文字；done 写完；error 失败（这次不扣次数）。
// think：模型思考过程里新写出的文字（只有开了思考模式的模型才有）。
export type TutorEvent={t:'start'}|{t:'model';model:string}|{t:'think';text:string}|{t:'delta';text:string}|{t:'reset'}|{t:'done';remaining:number;model?:string}|{t:'error';message:string};

// 每日额度：每发一条消息算一次（动手练习、提示、讲解共用）。
export const TUTOR_QUOTA={guest:20,user:200} as const;
export const TUTOR_LIMITS={messages:30,text:4000,lesson:12000} as const;
