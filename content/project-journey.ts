// 项目实战“复刻面试自习室”：从零开始，用自己选的后端语言和前端做法，一关一关做出一个迷你版面试自习室。
// 规划 18 关（入门 5、进阶 5、高阶 4、专家 4），目前上线的是写好的部分，后续关卡陆续加入。
// 学习卡片按技术栈区分版本（AiLesson.variants），任务卡给代码骨架和折叠的参考答案，代码要学习者自己写。
import type {AiLevel,Rank,Tier} from './journey';
import type {Stacks} from '../app/ai/stack';
import {pjApi,pjOverview,pjSetup,pjStructure} from './project-levels/start';

export const projectPassRate=0.65;
export const projectTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:4},{name:'进阶',nameEn:'Intermediate',from:5,to:9},{name:'高阶',nameEn:'Advanced',from:10,to:13},{name:'专家',nameEn:'Expert',from:14,to:17}];
export const projectRanks:Rank[]=[{min:0,name:'新手'},{min:3,name:'能跑起来'},{min:5,name:'能写接口'},{min:10,name:'能做项目'},{min:14,name:'能上线'},{min:18,name:'全栈大神'}];
export const projectStacks:Stacks={
 backend:[{id:'go',icon:'🐹',name:['Go','Go']},{id:'java',icon:'☕',name:['Java（Spring Boot）','Java (Spring Boot)']},{id:'node',icon:'🟩',name:['Node.js（Express）','Node.js (Express)']},{id:'python',icon:'🐍',name:['Python（FastAPI）','Python (FastAPI)']}],
 frontend:[{id:'html',icon:'📄',name:['原生 HTML + JS','Plain HTML + JS']},{id:'react',icon:'⚛️',name:['React','React']},{id:'template',icon:'🧩',name:['后端模板渲染','Server-side templates']}]};

export const projectLevels:AiLevel[]=[pjOverview,pjSetup,pjApi,pjStructure];
