'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {frontendLevels,frontendPassRate,frontendRanks,frontendTiers} from '@/content/frontend-journey';
import {frontendInterviewByLevel} from '@/content/frontend-links';
import {frontendAnimations} from '../../ai/animations/fe-lessons';
import {frontendExams} from '@/content/exams/frontend';

const frontendSubject:Subject={id:'frontend',storageKey:'frontend-journey:v1:',name:['前端开发','Frontend development'],eyebrow:'FRONTEND',title:['前端开发：从 HTML 到前端架构','Frontend: from HTML to architecture'],
 levels:frontendLevels,tiers:frontendTiers,ranks:frontendRanks,passRate:frontendPassRate,interviewByLevel:frontendInterviewByLevel,interviewSubject:['前端开发','Frontend development'],animations:frontendAnimations,exams:frontendExams};

export default function FrontendJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={frontendSubject}/>}
