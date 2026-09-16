import {authorizeAutoQuestions as authorize} from '@/lib/auto-question-auth';
import {executionLogStatement,recordExecution,executionLogs,type Execution} from '@/db/auto-question-logs';
import {studyDb} from '@/db/study';
import {catalog} from '@/db/catalog';
import {questionInput} from '@/lib/admin-validation';
import {AuthError} from '@/lib/site-auth';
import {fingerprint,normalizedTitle,requestHash} from '@/lib/auto-questions';
import type {ManagedQuestion} from '@/lib/catalog-types';
import {questionSetInput,QuestionSetAlreadyExistsError,QuestionSetValidationError,QuestionSetCreationError,type QuestionSetCreationCode} from '@/lib/question-set';
import {questionSetExists} from '@/db/question-set-names';
import {questionSetStatements} from '@/db/auto-question-set';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers});
function fail(error:unknown){if(error instanceof QuestionSetAlreadyExistsError)return respond({success:false,error:error.code,code:error.code,message:error.message},409);if(error instanceof QuestionSetValidationError||error instanceof QuestionSetCreationError)return respond({error:error.message,code:error.code},error.status);if(error instanceof AuthError)return respond({error:error.message},error.status);console.error('Auto questions failed');return respond({error:'自动出题暂时不可用，请稍后重试。'},503)}
async function previous(key:string,hash:string){
 const row=await studyDb().prepare('SELECT request_hash,response FROM auto_question_keys WHERE key=?').bind(key).first<{request_hash:string;response:string}>();
 if(!row)return null;
 if(row.request_hash!==hash)throw Object.assign(new AuthError('该幂等键已用于不同的请求。',409),{code:'IDEMPOTENCY_CONFLICT'});
 return JSON.parse(row.response);
}
export async function GET(req:Request){
 try{await authorize(req);return respond({logs:await executionLogs()})}catch(error){return fail(error)}
}
export async function POST(req:Request){
 let key='',parsedHash:string|undefined;
 const execution:Execution={executionId:crypto.randomUUID(),idempotencyKey:'',createdAt:Date.now(),requestedCount:0,questionSetType:null,questionSetName:null};
 const replayResponse=async(result:any)=>{
  const response=result.questionSet?{...result,success:true,questionSet:{...result.questionSet,questionCount:result.questionSet.questionCount??result.count},replayed:true}:{...result,replayed:true};
  await recordExecution({...execution,questionSetType:result.questionSet?.type??null,questionSetName:result.questionSet?.name??null},{status:'replayed',createdCount:0,linkedCount:0,questionSetId:result.questionSet?.id??null,errorCode:null,errorMessage:null});
  return respond(response);
 };
 try{
  await authorize(req);
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('请求格式无效。',415);
  key=req.headers.get('idempotency-key')??'';
  if(!/^[A-Za-z0-9._:-]{8,128}$/.test(key))throw new AuthError('请提供 8–128 字符的 Idempotency-Key。');
  execution.idempotencyKey=key;
  const raw=await req.text();if(raw.length>1000000)throw new AuthError('请求内容过长。',413);
  let input:unknown;try{input=JSON.parse(raw)}catch{throw new AuthError('JSON 格式无效。')}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AuthError('请求格式无效。');
  const p=input as Record<string,unknown>,hash=requestHash(p);
  parsedHash=hash;
  execution.requestedCount=Array.isArray(p.questions)?p.questions.length:0;
  if(p.questionSet&&typeof p.questionSet==='object'){
   const set=p.questionSet as Record<string,unknown>;
   execution.questionSetType=typeof set.type==='string'?set.type.slice(0,30):null;
   execution.questionSetName=typeof set.name==='string'?set.name.trim().slice(0,200):null;
  }
  const replay=await previous(key,hash);if(replay)return replayResponse(replay);
  const questionSet=questionSetInput(p.questionSet);
  if(!Array.isArray(p.questions)||p.questions.length<1||p.questions.length>100)throw new AuthError('每次提交 1–100 道题。');
  if(questionSet&&p.status!=='published')throw new QuestionSetCreationError('QUESTION_PUBLISH_VALIDATION_FAILED');
  if(p.status!==undefined&&!['draft','published'].includes(String(p.status)))throw new AuthError('状态必须为 draft 或 published。');
  const c=await catalog(),ids=new Set(c.subjects.map(s=>s.id)),seen=new Set<string>();
  let setSpace:string|undefined;
  if(questionSet){
   const spaces=new Set(p.questions.map(item=>{
    const subject=item&&typeof item==='object'?c.subjects.find(s=>s.id===(item as Record<string,unknown>).subjectId):undefined;
    if(!subject)throw new QuestionSetCreationError('QUESTION_PUBLISH_VALIDATION_FAILED');
    return subject.spaceId;
   }));
   if(spaces.size!==1)throw new AuthError('题集中的题目必须属于同一空间。');
   setSpace=[...spaces][0];
   if(await questionSetExists(questionSet,setSpace!))throw new QuestionSetAlreadyExistsError(questionSet.name);
  }
  const questions:ManagedQuestion[]=p.questions.map((item:unknown)=>{
   if(!item||typeof item!=='object'||Array.isArray(item)){if(questionSet)throw new QuestionSetCreationError('QUESTION_PUBLISH_VALIDATION_FAILED');throw new AuthError('题目格式无效。')}
   const value=item as Record<string,unknown>;
   let q:ManagedQuestion;
   try{
    q=questionInput({...value,status:p.status??'draft',revision:1},'auto-'+crypto.randomUUID());
    if(questionSet&&(q.kind!=='practice'||(questionSet.type==='mock'&&!['short','code'].includes(q.type))))throw new AuthError('题型不适用于该方案。');
   }catch(error){if(questionSet&&error instanceof AuthError)throw new QuestionSetCreationError('QUESTION_PUBLISH_VALIDATION_FAILED');throw error}
   if(!ids.has(q.subjectId))throw new AuthError('学科不存在：'+q.subjectId);
   const normalized=normalizedTitle(q.zh.title);if(!normalized)throw new AuthError('题目标题无效。');
   const marker=q.subjectId+'\u0000'+q.kind+'\u0000'+normalized;
   if(seen.has(marker))throw new AuthError('本批次存在重复题目：'+q.zh.title,409);
   seen.add(marker);
   if(c.questions.some(old=>old.subjectId===q.subjectId&&old.kind===q.kind&&normalizedTitle(old.zh.title)===normalized))throw new AuthError('题库中已有相同题目：'+q.zh.title,409);
   if(q.kind==='practice'&&q.type==='choice'){q.zh.answer=q.zh.options[Number(q.accepted[0])]??'';if(q.en)q.en.answer=q.en.options[Number(q.accepted[0])]??''}
   return q;
  });
  const db=studyDb(),now=Date.now(),setId=questionSet?crypto.randomUUID():undefined;
  const result={ok:true,count:questions.length,ids:questions.map(q=>q.id),status:p.status??'draft',...(questionSet?{success:true,replayed:false,questionSet:{id:setId!,...questionSet,questionCount:questions.length}}:{})};
  try{
   await db.batch([
    ...(questionSet?questionSetStatements(questionSet,setId!,questions,now):questions.flatMap(q=>[
     db.prepare('INSERT INTO auto_question_fingerprints(fingerprint,question_id,created_at) VALUES(?,?,?)').bind(fingerprint(q),q.id,now),
     db.prepare('INSERT INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(q.id,q.subjectId,q.kind,q.status,JSON.stringify(q),1,'auto-api',now),
    ])),
    // The migration's commit guard verifies the new set/links here, before commit.
    db.prepare('INSERT INTO auto_question_keys(key,request_hash,response,created_at) VALUES(?,?,?,?)').bind(key,hash,JSON.stringify(result),now),
    executionLogStatement(execution,{status:'success',createdCount:questions.length,linkedCount:questionSet?questions.length:0,questionSetId:setId??null,errorCode:null,errorMessage:null}),
    ...(questionSet?[db.prepare('DELETE FROM auto_question_insert_receipts WHERE batch_id=?').bind(setId!)]:[]),
   ]);
  }catch(error){
   const raced=await previous(key,hash);if(raced)return replayResponse(raced);
   if(questionSet&&await questionSetExists(questionSet,setSpace!))throw new QuestionSetAlreadyExistsError(questionSet.name);
   const rows=await db.prepare('SELECT fingerprint FROM auto_question_fingerprints WHERE fingerprint IN ('+questions.map(()=>'?').join(',')+')').bind(...questions.map(fingerprint)).all();
   if(rows.results.length)throw new AuthError('题库中已有相同题目，请刷新题库后重试。',409);
   if(questionSet){
    const message=error instanceof Error?error.message+' '+String(error.cause??''):String(error);
    if(/QUESTION_SET_ALREADY_EXISTS|UNIQUE constraint failed: practice_plan_names\.(?:space_id|type|name)\b/.test(message))throw new QuestionSetAlreadyExistsError(questionSet.name);
    const code=message.match(/QUESTION_SET_CREATE_FAILED|QUESTION_LINK_FAILED|QUESTION_COUNT_MISMATCH|QUESTION_PUBLISH_VALIDATION_FAILED/)?.[0] as QuestionSetCreationCode|undefined;
    if(code)throw new QuestionSetCreationError(code);
    if(message.includes('practice_plans'))throw new QuestionSetCreationError('QUESTION_SET_CREATE_FAILED');
    if(/practice_plan_questions|auto_question_insert_receipts|FOREIGN KEY constraint/.test(message))throw new QuestionSetCreationError('QUESTION_LINK_FAILED');
   }
   throw error;
  }
  return respond(result,201);
 }catch(error){
  // A concurrent commit may become visible after the first replay lookup,
  // including while the name or title preflight was running.
  if(parsedHash){try{const raced=await previous(key,parsedHash);if(raced)return replayResponse(raced);}catch(conflict){error=conflict}}
  const errorCode=error&&typeof error==='object'&&'code' in error?String(error.code):error instanceof AuthError?(error.status===401?'UNAUTHORIZED':error.status===409?'QUESTION_CONFLICT':'INVALID_REQUEST'):'INTERNAL_ERROR';
  const errorMessage=error instanceof AuthError?error.message:'自动出题暂时不可用，请稍后重试。';
  await recordExecution(execution,{status:'failed',createdCount:0,linkedCount:0,questionSetId:null,errorCode,errorMessage});return fail(error)}
}
