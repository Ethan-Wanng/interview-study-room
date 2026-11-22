// Rust 学习空间的阶段训练与考试题（题目全新，比关卡题更难）。每道题 id 以 rust-x / rust-e / rust-f 开头，不要与关卡题重复。
import {buildExams} from '../journey';
import {rustLevels,rustTiers} from '../rust-journey';
import {rustTrain1} from './rust-train-1';
import {rustTrain2} from './rust-train-2';
import {rustTrain3} from './rust-train-3';
import {rustTrain4} from './rust-train-4';
import {rustStage1,rustStage2,rustFinal} from './rust-tests';

export const rustExams=buildExams({prefix:'rust',subject:'Rust ',levels:rustLevels,tiers:rustTiers,trainings:[rustTrain1,rustTrain2,rustTrain3,rustTrain4],stages:[rustStage1,rustStage2],final:rustFinal});
