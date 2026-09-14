import {env} from 'cloudflare:workers';
import {studyDb} from '@/db/study';
import {catalog} from '@/db/catalog';
import {questionInput} from '@/lib/admin-validation';
import {AuthError} from '@/lib/site-auth';
import {fingerprint,normalizedTitle,requestHash,secureToken} from '@/lib/auto-questions';
import type {ManagedQuestion} from '@/lib/catalog-types';
import {questionSetInput,QuestionSetAlreadyExistsError,QuestionSetValidationError,QuestionSetCreationError,type QuestionSetCreationCode} from '@/lib/question-set';
import {questionSetExists} from '@/db/question-set-names';
import {questionSetStatements} from '@/db/auto-question-set';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers});
const token=()=> (env as unknown as {AUTO_QUESTION_API_TOKEN?:string}).AUTO_QUESTION_API_TOKEN;
function authorize(req:Request){
 const match=/^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(req.headers.get('authorization')??'');
 if(!match||!secureToken(match[1],token()))throw new AuthError('Token 无效。',401);
}
function fail(error:unknown){if(error instanceof QuestionSetAlreadyExistsError)return respond({success:false,error:error.code,code:error.code,message:error.message},409);if(error instanceof QuestionSetValidationError||error instanceof QuestionSetCreationError)return respond({error:error.message,code:error.code},error.status);if(error instanceof AuthError)return respond({error:error.message},error.status);console.error('Auto questions failed',error);return respond({error:'自动出题暂时不可用，请稍后重试。'},503)}
async function log(key:string,status:string,count:number,detail:string){
 try{await studyDb().prepare('INSERT INTO auto_question_logs(id,key,status,count,detail,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),key,status,count,detail.slice(0,500),Date.now()).run()}catch(error){console.error('Auto question log failed',error)}
}
async function previous(key:string,hash:string){
 const row=await studyDb().prepare('SELECT request_hash,response FROM auto_question_keys WHERE key=?').bind(key).first<{request_hash:string;response:string}>();
 if(!row)return null;
 if(row.request_hash!==hash)throw new AuthError('该幂等键已用于不同的请求。',409);
 return JSON.parse(row.response);
}
export async function GET(req:Request){
 try{authorize(req);const rows=await studyDb().prepare('SELECT id,key,status,count,detail,created_at FROM auto_question_logs ORDER BY created_at DESC LIMIT 50').all();return respond({logs:rows.results})}catch(error){return fail(error)}
}
export async function POST(req:Request){
 let key='',parsedHash:string|undefined;
 try{
  authorize(req);
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('请求格式无效。',415);
  key=req.headers.get('idempotency-key')??'';
  if(!/^[A-Za-z0-9._:-]{8,128}$/.test(key))throw new AuthError('请提供 8–128 字符的 Idempotency-Key。');
  const raw=await req.text();if(raw.length>1000000)throw new AuthError('请求内容过长。',413);
  let input:unknown;try{input=JSON.parse(raw)}catch{throw new AuthError('JSON 格式无效。')}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AuthError('请求格式无效。');
  const p=input as Record<string,unknown>,hash=requestHash(p);
  parsedHash=hash;
  const replay=await previous(key,hash);if(replay){await log(key,'replayed',replay.count,'返回已有执行结果');return respond({...replay,replayed:true})}
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
  const result={ok:true,count:questions.length,ids:questions.map(q=>q.id),status:p.status??'draft',...(questionSet?{questionSet:{id:setId!,...questionSet}}:{})};
  try{
   await db.batch([
    ...(questionSet?questionSetStatements(questionSet,setId!,questions,now):questions.flatMap(q=>[
     db.prepare('INSERT INTO auto_question_fingerprints(fingerprint,question_id,created_at) VALUES(?,?,?)').bind(fingerprint(q),q.id,now),
     db.prepare('INSERT INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(q.id,q.subjectId,q.kind,q.status,JSON.stringify(q),1,'auto-api',now),
    ])),
    db.prepare('INSERT INTO auto_question_logs(id,key,status,count,detail,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),key,'success',questions.length,'批量新增完成',now),
    // The migration's commit guard verifies the new set/links here, before commit.
    db.prepare('INSERT INTO auto_question_keys(key,request_hash,response,created_at) VALUES(?,?,?,?)').bind(key,hash,JSON.stringify(result),now),
    ...(questionSet?[db.prepare('DELETE FROM auto_question_insert_receipts WHERE batch_id=?').bind(setId!)]:[]),
   ]);
  }catch(error){
   const raced=await previous(key,hash);if(raced){await log(key,'replayed',raced.count,'并发请求复用已有结果');return respond({...raced,replayed:true})}
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
  if(parsedHash){try{const raced=await previous(key,parsedHash);if(raced){await log(key,'replayed',raced.count,'并发请求复用已有结果');return respond({...raced,replayed:true})}}catch(conflict){error=conflict}}
  if(key)await log(key,error instanceof AuthError&&error.status<500?'rejected':'failed',0,error instanceof Error?error.message:'Unknown');return fail(error)}
}
