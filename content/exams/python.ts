// Python 学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 py-x / py-e / py-f 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {pythonLevels,pythonTiers} from '../python-journey';
import {pythonTrain1} from './python-train-1';
import {pythonTrain2} from './python-train-2';
import {pythonTrain3} from './python-train-3';
import {pythonTrain4} from './python-train-4';
import {pythonStage1,pythonStage2,pythonFinal} from './python-tests';

export const pythonExams=buildExams({prefix:'python',subject:'Python ',levels:pythonLevels,tiers:pythonTiers,trainings:[pythonTrain1,pythonTrain2,pythonTrain3,pythonTrain4],stages:[pythonStage1,pythonStage2],final:pythonFinal});
