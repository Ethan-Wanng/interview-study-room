// 英语四次阶段训练的题库：入门（A1）、基础（A2）、进阶（B1）、雅思。
// 题目分散在几个文件里：最早的四组题写于 12 关的版本，扩展到 29 关后按新的阶段重新归组（题目 id 不变，错题本不受影响）。
import type {AiQuiz} from '../journey';
import {enTrain1,enTrain2} from './english-train12';
import {enTrain3,enTrain4} from './english-train34';
import {enTrain1More,enTrain2More} from './english-train-more';
import {enTrain3More} from './english-train-b1';
import {enTrainIeltsA} from './english-train-ielts-a';
import {enTrainIeltsB} from './english-train-ielts-b';

// 原第三组里讲一般过去时的题，过去时关卡现在属于基础阶段。
const pastIds=new Set(['en-x3-1','en-x3-2','en-x3-5','en-x3-8','en-x3-12','en-x3-15']);
export const englishTrainA1:AiQuiz[]=[...enTrain1,...enTrain1More];
export const englishTrainA2:AiQuiz[]=[...enTrain2,...enTrain3.filter(q=>pastIds.has(q.id)),...enTrain2More];
// 原第四组（连读、闲聊、观点）对应的关卡现在属于进阶阶段。
export const englishTrainB1:AiQuiz[]=[...enTrain3.filter(q=>!pastIds.has(q.id)),...enTrain4,...enTrain3More];
export const englishTrainIelts:AiQuiz[]=[...enTrainIeltsA,...enTrainIeltsB];
