import {consoleBody,parseQuestionJson} from './auto-question-console';
export type Attempt={key:string;body:ReturnType<typeof consoleBody>};
export type Journal={attempt:Attempt;settled:boolean;result:any};
export const JOURNAL_KEY='auto-question-attempt-v1';
export function readJournal(raw:string|null):Journal|null{
 if(!raw)return null;
 const value=JSON.parse(raw);
 if(!value?.attempt||!/^manual-[a-f0-9-]{36}$/.test(value.attempt.key)||typeof value.settled!=='boolean')throw Error('批次恢复记录无效，请勿重复提交，先查看执行记录。');
 parseQuestionJson(JSON.stringify(value.attempt.body));
 return value;
}
export function persistAttempt(storage:Pick<Storage,'setItem'>,journal:Journal){
 // Must complete before fetch: a quota/privacy failure must never send a request.
 storage.setItem(JOURNAL_KEY,JSON.stringify(journal));
}
export function confirmedResponse(attempt:Attempt,result:any){
 const set=attempt.body.questionSet;
 return !!result&&result.count===attempt.body.questions.length&&result.status===attempt.body.status&&Array.isArray(result.ids)&&result.ids.length===result.count&&result.ids.every((id:unknown)=>typeof id==='string'&&id.length>0)&&new Set(result.ids).size===result.count&&(!set||(result.questionSet?.type===set.type&&result.questionSet?.name===set.name&&typeof result.questionSet?.id==='string'&&!!result.questionSet.id&&result.questionSet.questionCount===result.count));
}
