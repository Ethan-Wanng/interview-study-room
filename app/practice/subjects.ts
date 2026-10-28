// 「训练」页用到的学科信息：只传题量、解锁条件等轻量数据，题目本身在进入答题后才加载。
import {examSize,type AiLevel,type Exam,type Tier} from '@/content/journey';
import {goLevels,goTiers} from '@/content/go-journey';
import {aiLevels,aiTiers} from '@/content/ai-journey';
import {backendLevels,backendTiers} from '@/content/backend-journey';
import {frontendLevels,frontendTiers} from '@/content/frontend-journey';
import {goExams} from '@/content/exams/go';
import {aiExams} from '@/content/exams/ai';
import {backendExams} from '@/content/exams/backend';
import {frontendExams} from '@/content/exams/frontend';
import type {HubSubject} from './training-hub';

const meta=(id:string,name:string,nameEn:string,icon:string,storageKey:string,levels:AiLevel[],tiers:Tier[],exams:Exam[]):HubSubject=>({id,name,nameEn,icon,href:`/learn/${id}`,storageKey,
 exams:exams.map(e=>({id:e.id,kind:e.kind,title:e.title,summary:e.summary,count:examSize(e,levels,tiers),requires:e.requires,passRate:e.passRate})),
 requireNames:Object.fromEntries([...levels.map(l=>[l.id,l.title]),...exams.map(e=>[e.id,e.title])])});

export const practiceSubjects:HubSubject[]=[
 meta('go','Go 开发','Go development','🐹','go-journey:v1:',goLevels,goTiers,goExams),
 meta('ai','AI 开发','AI development','🤖','ai-journey:v1:',aiLevels,aiTiers,aiExams),
 meta('backend','后端通用','Backend fundamentals','🗄️','backend-journey:v1:',backendLevels,backendTiers,backendExams),
 meta('frontend','前端开发','Frontend development','🎨','frontend-journey:v1:',frontendLevels,frontendTiers,frontendExams),
];
