// 英语的阶段训练题（题目全新，比关卡题更难）。每道题 id 以 en-x 开头，不要与关卡题重复。
// 阶段考试和最终考试的 150 分试卷还没写，先只开放四次阶段训练。
import {buildExams} from '../journey';
import {englishLevels,englishTiers} from '../english-journey';
import {englishTrainA1,englishTrainA2,englishTrainB1,englishTrainIelts} from './english-trainings';

export const englishExams=buildExams({prefix:'en',subject:'英语',levels:englishLevels,tiers:englishTiers,trainings:[englishTrainA1,englishTrainA2,englishTrainB1,englishTrainIelts],stages:[[],[]],final:[]}).filter(e=>e.kind==='training');
