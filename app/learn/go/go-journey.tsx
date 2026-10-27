'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {goLevels,goPassRate,goRanks,goTiers} from '@/content/go-journey';
import {goInterviewByLevel} from '@/content/go-links';
import {goAnimations} from '../../ai/animations/go-lessons';

const goSubject:Subject={id:'go',storageKey:'go-journey:v1:',name:['Go 开发','Go development'],eyebrow:'GO DEVELOPMENT',title:['从入门到精通 Go','Go from zero to expert'],
 levels:goLevels,tiers:goTiers,ranks:goRanks,passRate:goPassRate,interviewByLevel:goInterviewByLevel,interviewSubject:['Go','Go'],animations:goAnimations};

export default function GoJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={goSubject}/>}
