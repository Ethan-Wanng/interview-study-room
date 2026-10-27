// Go 学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 go-x 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {goLevels,goTiers} from '../go-journey';
import {goTrain1} from './go-train-1';
import {goTrain2} from './go-train-2';
import {goTrain3} from './go-train-3';
import {goTrain4} from './go-train-4';
import {goStage1,goStage2,goFinal} from './go-tests';

export const goExams=buildExams({prefix:'go',subject:'Go ',levels:goLevels,tiers:goTiers,trainings:[goTrain1,goTrain2,goTrain3,goTrain4],stages:[goStage1,goStage2],final:goFinal});
