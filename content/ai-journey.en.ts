// AI 开发的英文版学习卡片（目前覆盖高阶四关）。英文界面下，这些关卡的标题、简介和卡片换成这里的内容；题目仍是中文。
// 英文卡片是按英文读者的习惯重写的，不是逐句翻译；但每一关的卡片张数和顺序必须和中文版一致（链接里的“第几张”两边通用），
// node .sites-runtime/check-en-cards.mjs 会检查张数、代码讲解的原文定位，并运行动手卡片的代码核对输出。
import type {AiLesson} from './journey';
import {modelInternalsA} from './ai-en/model-internals-a';
import {modelInternalsB} from './ai-en/model-internals-b';
import {agentsEn} from './ai-en/agents';
import {evalsEn} from './ai-en/evals';
import {harnessEn} from './ai-en/harness';

export const aiLevelsEn:Record<string,{title:string;summary:string;lessons:AiLesson[]}>={
 'model-internals':{title:'How models work, and advanced prompting',summary:'Understand why a model answers the way it does, and learn stronger prompting techniques',lessons:[...modelInternalsA,...modelInternalsB]},
 'agents':{title:'Agent architecture and workflows',summary:'Design multi-step systems you can rely on',lessons:agentsEn},
 'evals':{title:'Evaluation and observability',summary:'Make an AI application measurable and debuggable',lessons:evalsEn},
 'harness':{title:'Harness engineering & Skills',summary:'Make agents ship reliably with control planes, Hooks, ACI and progressive Skills',lessons:harnessEn},
};
