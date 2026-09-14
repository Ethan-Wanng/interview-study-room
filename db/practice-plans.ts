import {studyDb} from './study';
import type {PracticePlan,PlanSummary} from '@/lib/practice-plan-types';
export async function plans(published=false):Promise<PracticePlan[]>{const rows=await studyDb().prepare('SELECT payload,status FROM practice_plans'+(published?" WHERE status='published'":'')+' ORDER BY created_at DESC').all<{payload:string;status:PracticePlan['status']}>();return rows.results.map(r=>({...JSON.parse(r.payload),status:r.status}))}
export const planSummary=(p:PracticePlan):PlanSummary=>{const {questions,...rest}=p;return {...rest,count:questions.length}};
