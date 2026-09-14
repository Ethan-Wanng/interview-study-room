import type {Mode} from './practice-types';
import type {QuestionSnapshot} from './catalog-types';
export type PracticePlan={id:string;title:string;subjectId:string;subjectIds?:string[];chapter:string;mode:Mode;minutes:number;status:'draft'|'published'|'archived';questions:QuestionSnapshot[]};
export type PlanSummary=Omit<PracticePlan,'questions'>&{count:number};
