// 英语（语言学习空间）：29 个关卡，从零基础到雅思。四个阶段大致对应欧洲语言框架 A1、A2、B1 和雅思备考（B2 及以上）。
// 每个阶段都穿插三条线：会话（发音、句型、场景对话）、词汇（按主题的单词表，带例句，可以遮住中文自测）、阅读（从标识到雅思文章）。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id；关卡可以插入，已通关的关卡始终可进。
// 卡片里的 phrases 可以点喇叭听、点麦克风跟读打分；题目的 say 是听力原文，passage 是阅读原文（app/components/speech-drill.tsx）。
import type {AiLevel,Rank,Tier} from './journey';
import {enSounds} from './english-levels/sounds';
import {enHello} from './english-levels/hello';
import {enWordsPeople} from './english-levels/words-people';
import {enNumbers} from './english-levels/numbers';
import {enWordsDaily} from './english-levels/words-daily';
import {enReadFirst} from './english-levels/read-first';
import {enBe} from './english-levels/be';
import {enPresent} from './english-levels/present';
import {enWordsPlaces} from './english-levels/words-places';
import {enQuestions} from './english-levels/questions';
import {enWordsLife} from './english-levels/words-life';
import {enPast} from './english-levels/past';
import {enReadShort} from './english-levels/read-short';
import {enFuture} from './english-levels/future';
import {enRequests} from './english-levels/requests';
import {enWordsBuild} from './english-levels/words-build';
import {enListening} from './english-levels/listening';
import {enSmalltalk} from './english-levels/smalltalk';
import {enWordsTopics} from './english-levels/words-topics';
import {enOpinion} from './english-levels/opinion';
import {enReadSkills} from './english-levels/read-skills';
import {enIeltsIntro} from './english-levels/ielts-intro';
import {enIeltsVocab} from './english-levels/ielts-vocab';
import {enIeltsReading} from './english-levels/ielts-reading';
import {enIeltsListening} from './english-levels/ielts-listening';
import {enIeltsGrammar} from './english-levels/ielts-grammar';
import {enIeltsTopics} from './english-levels/ielts-topics';
import {enIeltsSpeaking} from './english-levels/ielts-speaking';
import {enIeltsWriting} from './english-levels/ielts-writing';

export const englishPassRate=0.65;
export const englishTiers:Tier[]=[{name:'入门',nameEn:'A1 Starter',from:0,to:5},{name:'基础',nameEn:'A2 Elementary',from:6,to:12},{name:'进阶',nameEn:'B1 Intermediate',from:13,to:20},{name:'雅思',nameEn:'IELTS (B2+)',from:21,to:28}];
export const englishRanks:Rank[]=[{min:0,name:'开口新手'},{min:2,name:'敢开口'},{min:6,name:'A1 入门'},{min:13,name:'A2 基础'},{min:21,name:'B1 中级'},{min:25,name:'雅思备考中'},{min:29,name:'雅思冲刺完成'}];
export const englishLevels:AiLevel[]=[
 enSounds,enHello,enWordsPeople,enNumbers,enWordsDaily,enReadFirst,
 enBe,enPresent,enWordsPlaces,enQuestions,enWordsLife,enPast,enReadShort,
 enFuture,enRequests,enWordsBuild,enListening,enSmalltalk,enWordsTopics,enOpinion,enReadSkills,
 enIeltsIntro,enIeltsVocab,enIeltsReading,enIeltsListening,enIeltsGrammar,enIeltsTopics,enIeltsSpeaking,enIeltsWriting,
];
