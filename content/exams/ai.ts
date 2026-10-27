// AI 学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 ai-x 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {aiLevels,aiTiers} from '../ai-journey';
import {aiTrain1} from './ai-train-1';
import {aiTrain2} from './ai-train-2';
import {aiTrain3} from './ai-train-3';
import {aiTrain4} from './ai-train-4';
import {aiStage1,aiStage2,aiFinal} from './ai-tests';

export const aiExams=buildExams({prefix:'ai',subject:'AI 开发',levels:aiLevels,tiers:aiTiers,trainings:[aiTrain1,aiTrain2,aiTrain3,aiTrain4],stages:[aiStage1,aiStage2],final:aiFinal});
