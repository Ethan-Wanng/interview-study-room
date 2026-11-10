// 「面试」和「学习」互相跳转：哪道面试题在哪一关讲过，哪个面试学科对应哪门课。只在服务端算好再传给页面（关卡内容很大，不进浏览器包）。
import {goLevels} from '@/content/go-journey';
import {goInterviewByLevel} from '@/content/go-links';
import {backendLevels} from '@/content/backend-journey';
import {backendInterviewByLevel} from '@/content/backend-links';
import {aiLevels} from '@/content/ai-journey';
import {interviewByLevel as aiInterviewByLevel} from '@/content/ai-links';
import {frontendLevels} from '@/content/frontend-journey';
import {frontendInterviewByLevel} from '@/content/frontend-links';
import type {AiLesson} from '@/content/journey';
import {rankCard} from './text-match';

export type LevelLink={href:string;course:[string,string];level:number;title:string};
// 面试学科 id → 学习里的课程。
export const courseOfTrack:Record<string,{href:string;name:[string,string];icon:string}>={
 go:{href:'/learn/go',name:['Go 开发','Go development'],icon:'🐹'},
 backend:{href:'/learn/backend',name:['后端通用','Backend fundamentals'],icon:'🗄️'},
 'ai-development':{href:'/learn/ai',name:['AI 开发','AI development'],icon:'🤖'},
 frontend:{href:'/learn/frontend',name:['前端开发','Frontend development'],icon:'🎨'},
};
const courses:[string,{id:string;title:string;lessons:AiLesson[]}[],Record<string,string[]>][]=[
 ['go',goLevels,goInterviewByLevel],['backend',backendLevels,backendInterviewByLevel],['ai-development',aiLevels,aiInterviewByLevel],['frontend',frontendLevels,frontendInterviewByLevel]];

// 面试题 id → 讲到它的第一关。传入面试题的题目和答案时，链接会直接指到这一关里最相关的那张学习卡片（&card=N），而不只是关卡开头。
export function levelLinks(questions:{id:string;title:string;blocks:{text:string}[]}[]=[]):Record<string,LevelLink>{const out:Record<string,LevelLink>={},text=new Map(questions.map(q=>[q.id,q.title+'\n'+q.title+'\n'+q.blocks.map(b=>b.text).join('\n').slice(0,600)]));
 for(const [track,levels,byLevel] of courses){const c=courseOfTrack[track];
  levels.forEach((l,i)=>{for(const id of byLevel[l.id]??[]){if(out[id])continue;const t=text.get(id),card=t?rankCard(l.lessons,t).index:-1;
   out[id]={href:`${c.href}?level=${encodeURIComponent(l.id)}${card>=0?'&card='+(card+1):''}`,course:c.name,level:i+1,title:l.title}}})}
 return out}
