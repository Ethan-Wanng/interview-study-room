// 代码题的作答框架：按语言写好函数签名和固定部分，关键步骤留成 TODO，学习者只需补全 TODO。
// 选了哪种语言，作答框就预填哪种语言的框架；参考答案仍是完整的函数（见 code-refs）。
import type {StarterMap} from './types';
import {rrfStarters} from './rrf';
import {aiExamStartersA} from './ai-exams-a';
import {aiExamStartersB} from './ai-exams-b';
import {aiExamStartersC} from './ai-exams-c';
import {aiExamStartersD} from './ai-exams-d';
import {aiExamStartersE} from './ai-exams-e';
import {aiExamStartersF} from './ai-exams-f';
import {aiExamStartersG} from './ai-exams-g';
import {aiJourneyStartersA} from './ai-journey-a';
import {aiJourneyStartersB} from './ai-journey-b';
import {aiJourneyStartersC} from './ai-journey-c';
import {aiJourneyStartersD} from './ai-journey-d';
import {aiJourneyStartersE} from './ai-journey-e';
import {backendStartersA} from './backend-a';
import {backendStartersB} from './backend-b';
import {backendStartersC} from './backend-c';
import {backendStartersD} from './backend-d';
import {backendStartersE} from './backend-e';
import {backendStartersF} from './backend-f';
import {backendStartersG} from './backend-g';
import {sqlStarters} from './sql';
import {goStartersA} from './go-a';
import {goStartersB} from './go-b';
import {frontendStartersA} from './frontend-a';
import {frontendStartersB} from './frontend-b';
import {rustLevelStarters} from './rust-levels';
import {rustExamStarters} from './rust-exams';
import {rustPaperStarters} from './rust-papers';
import {pythonLevelStarters} from './python-levels';
import {pythonExamStarters} from './python-exams';
import {pythonPaperStarters} from './python-papers';
import {aiPaperStarters} from './ai-papers';
import {backendPaperStarters} from './backend-papers';
import {projectStarters} from './project';

export const codeStarters:StarterMap={...rrfStarters,...aiExamStartersA,...aiExamStartersB,...aiExamStartersC,...aiExamStartersD,...aiExamStartersE,...aiExamStartersF,...aiExamStartersG,...aiJourneyStartersA,...aiJourneyStartersB,...aiJourneyStartersC,...aiJourneyStartersD,...aiJourneyStartersE,...backendStartersA,...backendStartersB,...backendStartersC,...backendStartersD,...backendStartersE,...backendStartersF,...backendStartersG,...sqlStarters,...goStartersA,...goStartersB,...frontendStartersA,...frontendStartersB,...rustLevelStarters,...rustExamStarters,...rustPaperStarters,...pythonLevelStarters,...pythonExamStarters,...pythonPaperStarters,...aiPaperStarters,...backendPaperStarters,...projectStarters};

export const startersFor=(id:string)=>codeStarters[id];
// 框架里一共有几处 TODO（按第一种语言数）。
export const todoCount=(id:string)=>{const s=codeStarters[id];const first=s&&Object.values(s)[0];return first?new Set(first.match(/TODO \d+/g)).size:0};
// 交给 AI 评分时告诉它：这道题给了框架，只看 TODO 处补全得对不对。
export const gradeQuestionText=(id:string,q:string)=>{
 const s=codeStarters[id];
 if(!s)return q;
 const multiLang=Object.keys(s).length>1;
 return q+(multiLang
  ?'（本题给了代码框架，学生只需补全标了 TODO 的关键步骤；框架里已经写好的部分不计分，也不要因为框架里的省略号扣分。学生可以用任意一种语言作答。）'
  :'（本题给了代码框架，学生只需补全标了 TODO 的关键步骤；框架里已经写好的部分不计分，也不要因为框架里的省略号扣分。）');
};
