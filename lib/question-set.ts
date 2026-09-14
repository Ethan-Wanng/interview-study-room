import {AuthError} from './site-auth';
import type {PracticePlan} from './practice-plan-types';

export type QuestionSetInput={type:'training'|'mock'|'exam';name:string};
// Reuse the existing practice_plans modes when creation is added in stage 2.
export const questionSetModes={training:'random',mock:'interview',exam:'exam'} as const satisfies Record<QuestionSetInput['type'],PracticePlan['mode']>;
export class QuestionSetValidationError extends AuthError{
 constructor(public code:'INVALID_QUESTION_SET_TYPE'|'INVALID_QUESTION_SET_NAME'){super(code,400)}
}
export function questionSetInput(value:unknown):QuestionSetInput|undefined{
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new QuestionSetValidationError('INVALID_QUESTION_SET_TYPE');
 const {type,name}=value as Record<string,unknown>;
 if(type!=='training'&&type!=='mock'&&type!=='exam')throw new QuestionSetValidationError('INVALID_QUESTION_SET_TYPE');
 if(typeof name!=='string'||!name.trim()||Array.from(name.trim()).length>100)throw new QuestionSetValidationError('INVALID_QUESTION_SET_NAME');
 return {type,name:name.trim()};
}
