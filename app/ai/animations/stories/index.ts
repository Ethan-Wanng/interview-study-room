// 面试题动画：每道 AI 面试题一个故事板动画。按需加载（点“看动画讲解”时才下载）。
// 新增面试题时，在对应关卡的脚本文件里加一个同 id 的故事；scripts 校验会检查覆盖率和画面边界。
import {fromStory,type Story} from '../story';
import {interviewByLevel} from '@/content/ai-links';
import {basicsStories} from './basics';
import {callingStories} from './calling';
import {ragToolStories} from './rag-tools';
import {shipStories} from './ship';
import {vectorStories} from './vector';
import {ragAdvancedStories} from './rag-advanced';
import {engineeringStories} from './engineering';
import {tradeoffStories} from './tradeoffs';
import {internalsStories} from './internals';
import {agentStories} from './agents';
import {evalStories} from './evals';
import {servingStories} from './serving';
import {finetuneStories} from './finetune';
import {safetyStories} from './safety';
import {addedStoriesA} from './added-a';
import {addedStoriesB} from './added-b';

export const stories:Record<string,Story>={...basicsStories,...callingStories,...ragToolStories,...shipStories,...vectorStories,...ragAdvancedStories,...engineeringStories,...tradeoffStories,...internalsStories,...agentStories,...evalStories,...servingStories,...finetuneStories,...safetyStories,...addedStoriesA,...addedStoriesB};
const levelOf=Object.fromEntries(Object.entries(interviewByLevel).flatMap(([level,ids])=>ids.map(id=>[id,level])));
export const interviewAnimationFor=(id:string)=>stories[id]?fromStory(id,levelOf[id]??'',stories[id]):null;
