'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {pythonLevels,pythonPassRate,pythonRanks,pythonTiers} from '@/content/python-journey';
import {pythonInterviewByLevel} from '@/content/python-links';
import {pythonExams} from '@/content/exams/python';

const pythonSubject:Subject={id:'python',storageKey:'python-journey:v1:',name:['Python 开发','Python development'],eyebrow:'PYTHON DEVELOPMENT',title:['从零开始学 Python','Python from zero to expert'],
 levels:pythonLevels,tiers:pythonTiers,ranks:pythonRanks,passRate:pythonPassRate,interviewByLevel:pythonInterviewByLevel,interviewSubject:['Python','Python'],animations:[],exams:pythonExams};

export default function PythonJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={pythonSubject}/>}
