// 后端通用学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 be-x 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {backendLevels,backendTiers} from '../backend-journey';
import {beTrain1,beTrain2,beTrain3,beTrain4} from './backend-train';
import {beTrain1Extra} from './backend-train-extra1';
import {beTrain2Extra,beTrain4Extra} from './backend-train-extra2';
import {beTrain3Extra} from './backend-train-extra3';
import {beStage1,beStage2,beFinal} from './backend-tests';

export const backendExams=buildExams({prefix:'be',subject:'后端通用',levels:backendLevels,tiers:backendTiers,trainings:[[...beTrain1,...beTrain1Extra],[...beTrain2,...beTrain2Extra],[...beTrain3,...beTrain3Extra],[...beTrain4,...beTrain4Extra]],stages:[beStage1,beStage2],final:beFinal});
