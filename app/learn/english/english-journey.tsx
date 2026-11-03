'use client';
import JourneyClient from '../../ai/journey-client';
import type {Subject} from '../subject';
import {englishLevels,englishPassRate,englishRanks,englishTiers} from '@/content/english-journey';
import {englishExams} from '@/content/exams/english';

const englishSubject:Subject={id:'english',storageKey:'english-journey:v1:',name:['英语','English'],eyebrow:'LANGUAGE · ENGLISH',title:['英语：从不敢开口到流利对话','English: from first words to fluent conversation'],
 levels:englishLevels,tiers:englishTiers,ranks:englishRanks,passRate:englishPassRate,interviewByLevel:{},interviewSubject:['英语','English'],animations:[],exams:englishExams,
 links:[{href:'/learn/english/words',icon:'📚',title:['背单词（每天 20 个）','Vocabulary (20 a day)'],summary:['先把词汇量提上来：约 2200 个词，按遗忘规律安排复习','Build vocabulary first: ~2,200 words with spaced repetition']}]};

export default function EnglishJourney(props:{username:string}){return <JourneyClient {...props} interviews={[]} subject={englishSubject}/>}
