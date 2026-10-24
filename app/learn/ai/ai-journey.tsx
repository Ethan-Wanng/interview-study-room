'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {aiLevels,aiPassRate,aiRanks,aiTiers} from '@/content/ai-journey';
import {interviewByLevel} from '@/content/ai-links';

const aiSubject:Subject={id:'ai',storageKey:'ai-journey:v1:',name:['AI 开发','AI development'],eyebrow:'AI DEVELOPMENT',title:['从小白到大神','From beginner to expert'],
 levels:aiLevels,tiers:aiTiers,ranks:aiRanks,passRate:aiPassRate,interviewByLevel,interviewSubject:['AI 开发','AI development'],animations:true};

export default function AiJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={aiSubject}/>}
