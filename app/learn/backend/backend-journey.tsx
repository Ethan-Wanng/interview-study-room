'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {backendLevels,backendPassRate,backendRanks,backendTiers} from '@/content/backend-journey';
import {backendInterviewByLevel} from '@/content/backend-links';
import {backendAnimations} from '../../ai/animations/be-lessons';
import {backendExams} from '@/content/exams/backend';

const backendSubject:Subject={id:'backend',storageKey:'backend-journey:v1:',name:['后端通用','Backend fundamentals'],eyebrow:'BACKEND',title:['后端通用：从数据库到系统设计','Backend: from databases to system design'],
 levels:backendLevels,tiers:backendTiers,ranks:backendRanks,passRate:backendPassRate,interviewByLevel:backendInterviewByLevel,interviewSubject:['后端通用','Backend'],animations:backendAnimations,exams:backendExams};

export default function BackendJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={backendSubject}/>}
