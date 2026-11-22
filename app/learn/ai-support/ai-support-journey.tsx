'use client';
import JourneyClient from '../../ai/journey-client';
import type {Subject} from '../subject';
import {aiSupportLevels,aiSupportPassRate,aiSupportRanks,aiSupportStacks,aiSupportTiers} from '@/content/ai-support-journey';

const aiSupportSubject:Subject={
 id:'ai-support',
 storageKey:'ai-support-journey:v1:',
 name:['智能 AI 客服实战','Build an AI Support Agent'],
 eyebrow:'PROJECT · AI CUSTOMER SUPPORT (12 LEVELS)',
 title:['从零打造企业级智能 AI 客服（完整 12 关）','Build an Enterprise AI Customer Support Agent'],
 levels:aiSupportLevels,
 tiers:aiSupportTiers,
 ranks:aiSupportRanks,
 passRate:aiSupportPassRate,
 interviewByLevel:{},
 interviewSubject:['AI 开发','AI development'],
 animations:[],
 exams:[],
 stacks:aiSupportStacks,
 links:[
  {
   href:'/learn/ai-support/sandbox',
   icon:'🧪',
   title:['在线 AI 客服演练场（实时调试）','Live AI Support Sandbox'],
   summary:['无需本地配环境，直接在网页里修改客服人设、知识库与模拟订单，实测查单退货、RAG 与防注入效果','Tweak system prompts, knowledge base docs and mock orders live in your browser'],
  },
 ],
};

export default function AiSupportJourney(props:{username:string}){
 return <JourneyClient {...props} interviews={[]} subject={aiSupportSubject}/>;
}
