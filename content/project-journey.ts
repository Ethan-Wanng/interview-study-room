// 项目实战“复刻面试自习室”：从零开始，用自己选的后端语言和前端做法，一关一关做出一个完整版面试自习室。
// 全部 24 关分为五个阶段：入门 5 关、进阶 5 关、高阶 4 关、AI 深化 5 关、专家上线 5 关；第 15 关起从 AI 对话、流式思考、笔记本与全站检索、在线实验场到 JD 调研/参考简历与社区闭环逐步完善。
// 学习卡片按技术栈区分版本（AiLesson.variants），任务卡给代码骨架和折叠的参考答案，代码要学习者自己写。
import type {AiLevel,Rank,Tier} from './journey';
import type {Stacks} from '../app/ai/stack';
import {pjApi,pjOverview,pjSetup,pjStructure} from './project-levels/start';
import {pjWeb} from './project-levels/web';
import {pjDb} from './project-levels/database';
import {pjQuery} from './project-levels/query';
import {pjPages} from './project-levels/pages';
import {pjAuth} from './project-levels/auth';
import {pjStudy} from './project-levels/study';
import {pjReview} from './project-levels/review';
import {pjPractice} from './project-levels/practice';
import {pjExam} from './project-levels/exam';
import {pjAi} from './project-levels/ai';
import {pjChat} from './project-levels/chat';
import {pjStream} from './project-levels/stream';
import {pjNotes} from './project-levels/notes';
import {pjPlayground} from './project-levels/playground';
import {pjJd} from './project-levels/jd';
import {pjOauth} from './project-levels/oauth';
import {pjCommunity} from './project-levels/community';
import {pjAdmin} from './project-levels/admin';
import {pjTest} from './project-levels/test';
import {pjDeploy} from './project-levels/deploy';

export const projectPassRate=0.65;
export const projectTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:4},{name:'进阶',nameEn:'Intermediate',from:5,to:9},{name:'高阶',nameEn:'Advanced',from:10,to:13},{name:'AI 深化',nameEn:'AI Craft',from:14,to:18},{name:'专家',nameEn:'Expert',from:19,to:23}];
export const projectRanks:Rank[]=[{min:0,name:'新手'},{min:3,name:'能跑起来'},{min:5,name:'能写接口'},{min:10,name:'能做项目'},{min:14,name:'AI 全栈'},{min:19,name:'能上线'},{min:23,name:'全栈大神'}];
export const projectStacks:Stacks={
 backend:[{id:'go',icon:'🐹',name:['Go','Go']},{id:'java',icon:'☕',name:['Java（Spring Boot）','Java (Spring Boot)']},{id:'node',icon:'🟩',name:['Node.js（Express）','Node.js (Express)']},{id:'python',icon:'🐍',name:['Python（FastAPI）','Python (FastAPI)']}],
 frontend:[{id:'html',icon:'📄',name:['原生 HTML + JS','Plain HTML + JS']},{id:'react',icon:'⚛️',name:['React','React']},{id:'template',icon:'🧩',name:['后端模板渲染','Server-side templates']}]};

export const projectLevels:AiLevel[]=[pjOverview,pjSetup,pjApi,pjStructure,pjWeb,pjDb,pjQuery,pjPages,pjAuth,pjStudy,pjReview,pjPractice,pjExam,pjAi,pjChat,pjStream,pjNotes,pjPlayground,pjJd,pjOauth,pjCommunity,pjAdmin,pjTest,pjDeploy];
