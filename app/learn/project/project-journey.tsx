'use client';
import JourneyClient from '../../ai/journey-client';
import type {Subject} from '../subject';
import {projectLevels,projectPassRate,projectRanks,projectStacks,projectTiers} from '@/content/project-journey';

// 项目实战：复刻面试自习室。学习者先选技术栈，卡片和代码题按选择显示对应版本。
const projectSubject:Subject={id:'project',storageKey:'project-journey:v1:',name:['复刻面试自习室','Rebuild this study room'],eyebrow:'PROJECT · BUILD IT YOURSELF',title:['从零复刻面试自习室','Rebuild this study room from scratch'],
 levels:projectLevels,tiers:projectTiers,ranks:projectRanks,passRate:projectPassRate,interviewByLevel:{},interviewSubject:['项目实战','Projects'],animations:[],exams:[],stacks:projectStacks};

export default function ProjectJourney(props:{username:string}){return <JourneyClient {...props} interviews={[]} subject={projectSubject}/>}
