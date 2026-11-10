// 项目实战“智能 AI 客服实战”：面向 AI 开发的动手练手项目。
// 整体规划 12 关（入门 3、进阶 3、高阶 3、专家 3），先上线前 4 关看效果。
import type {AiLevel,Rank,Tier} from './journey';
import type {Stacks} from '../app/ai/stack';
import {csAgent,csOverview,csRag,csStream} from './ai-support-levels/start';

export const aiSupportPassRate=0.65;
export const aiSupportTiers:Tier[]=[
 {name:'入门',nameEn:'Beginner',from:0,to:2},
 {name:'进阶',nameEn:'Intermediate',from:3,to:5},
 {name:'高阶',nameEn:'Advanced',from:6,to:8},
 {name:'专家',nameEn:'Expert',from:9,to:11},
];
export const aiSupportRanks:Rank[]=[
 {min:0,name:'AI 客服学徒'},
 {min:1,name:'能接大模型'},
 {min:2,name:'能做流式对话'},
 {min:3,name:'能搭知识库 RAG'},
 {min:4,name:'AI 客服工程师'},
 {min:8,name:'Agent 架构师'},
 {min:12,name:'AI 应用大神'},
];
export const aiSupportStacks:Stacks={
 backend:[
  {id:'python',icon:'🐍',name:['Python（FastAPI）','Python (FastAPI)']},
  {id:'node',icon:'🟩',name:['Node.js（Express）','Node.js (Express)']},
  {id:'go',icon:'🐹',name:['Go（标准库 net/http）','Go (net/http)']},
 ],
 frontend:[
  {id:'html',icon:'📄',name:['原生 HTML + SSE','Plain HTML + SSE']},
  {id:'react',icon:'⚛️',name:['React','React']},
 ],
};

export const aiSupportLevels:AiLevel[]=[csOverview,csStream,csRag,csAgent];
