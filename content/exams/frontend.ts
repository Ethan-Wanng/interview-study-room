// 前端开发学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 fe-x / fe-s / fe-f 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {frontendLevels,frontendTiers} from '../frontend-journey';
import {feTrain1} from './frontend-train1';
import {feTrain2} from './frontend-train2';
import {feTrain3,feTrain4} from './frontend-train34';
import {feStage1} from './frontend-stage1';
import {feStage2} from './frontend-stage2';
import {feFinalA} from './frontend-final-a';
import {feFinalB} from './frontend-final-b';

export const frontendExams=buildExams({prefix:'fe',subject:'前端开发',levels:frontendLevels,tiers:frontendTiers,trainings:[feTrain1,feTrain2,feTrain3,feTrain4],stages:[feStage1,feStage2],final:[...feFinalA,...feFinalB]});
