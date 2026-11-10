'use client';
import JourneyClient from '../../ai/journey-client';
import type {InterviewDoc} from '../../ai/interview-reading';
import type {Subject} from '../subject';
import {rustLevels,rustPassRate,rustRanks,rustTiers} from '@/content/rust-journey';
import {rustInterviewByLevel} from '@/content/rust-links';
import {rustExams} from '@/content/exams/rust';

const rustSubject:Subject={id:'rust',storageKey:'rust-journey:v1:',name:['Rust 开发','Rust development'],eyebrow:'RUST DEVELOPMENT',title:['从零开始学 Rust','Rust from zero to expert'],
 levels:rustLevels,tiers:rustTiers,ranks:rustRanks,passRate:rustPassRate,interviewByLevel:rustInterviewByLevel,interviewSubject:['Rust','Rust'],animations:[],exams:rustExams};

export default function RustJourney(props:{username:string;interviews:InterviewDoc[]}){return <JourneyClient {...props} subject={rustSubject}/>}
