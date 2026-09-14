import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild'),token='transaction-test-'+'a'.repeat(40);
const output=await build({stdin:{contents:`import {POST,GET} from './app/api/admin/auto-questions/route';import * as practice from './app/api/practice/route';import * as auth from './app/api/auth/route';import * as admin from './app/api/admin/route';export default {fetch(r){const path=new URL(r.url).pathname;const api=path==='/api/auth'?auth:path==='/api/practice'?practice:path==='/api/admin'?admin:{POST,GET};return r.method==='POST'?api.POST(r):api.GET(r)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'question-set-transactions'},bindings:{AUTO_QUESTION_API_TOKEN:token}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const call=(body,key='transaction-'+crypto.randomUUID())=>mf.dispatchFetch('https://site.test/api/admin/auto-questions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,'idempotency-key':key},body:JSON.stringify(body)});
 const make=(type='training',n=6,go=3)=>{const run=crypto.randomUUID();return {status:'published',questionSet:{type,name:type+run},questions:Array.from({length:n},(_,i)=>({subjectId:i<go?'go':'backend',kind:'practice',type:'short',topic:'共享知识点',section:'共享章节',zh:{title:run+' 题 '+i,answer:'参考答案',explanation:'完整解析',rubric:['评分要点']}}))}};
 const rows=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const totals=async()=>{
  const result={};for(const table of ['managed_questions','practice_plans','practice_plan_questions','auto_question_keys','auto_question_fingerprints','auto_question_insert_receipts','practice_plan_names'])result[table]=(await db.prepare('SELECT count(*) n FROM '+table).first()).n;
  result.successLogs=(await db.prepare("SELECT count(*) n FROM auto_question_logs WHERE status='success'").first()).n;return result;
 };
 let existingId,examId;
 for(const [type,n,go,mode] of [['training',6,3,'random'],['mock',10,5,'interview'],['exam',15,8,'exam']]){
  const before=await totals(),body=make(type,n,go),key='normal-'+type;
  let r=await call(body,key);assert.equal(r.status,201,await r.clone().text());const result=await r.json();
  assert.equal(result.count,n);assert.equal(result.questionSet.type,type);assert.equal(result.questionSet.name,body.questionSet.name);
  const links=await rows('SELECT question_id,sort_order FROM practice_plan_questions WHERE plan_id=? ORDER BY sort_order',result.questionSet.id);
  assert.deepEqual(links.map(x=>x.question_id),result.ids);assert.deepEqual(links.map(x=>x.sort_order),Array.from({length:n},(_,i)=>i+1));
  if(existingId)assert.ok(!links.some(x=>x.question_id===existingId));existingId??=result.ids[0];
  const plan=(await rows('SELECT payload,status FROM practice_plans WHERE id=?',result.questionSet.id))[0];const payload=JSON.parse(plan.payload);
  assert.equal(plan.status,'published');assert.equal(payload.mode,mode);assert.deepEqual(payload.subjectIds,['go','backend']);assert.deepEqual(payload.questions.map(x=>x.question.id),result.ids);
  assert.deepEqual(payload.questions.map(x=>x.question.prompt),body.questions.map(x=>x.zh.title));
  for(const id of result.ids)assert.equal((await rows('SELECT status FROM managed_questions WHERE id=?',id))[0].status,'published');
  const after=await totals();assert.equal(after.managed_questions-before.managed_questions,n);assert.equal(after.practice_plans-before.practice_plans,1);assert.equal(after.practice_plan_questions-before.practice_plan_questions,n);assert.equal(after.auto_question_insert_receipts,0);
  r=await call(body,key);assert.equal(r.status,200);assert.deepEqual(await r.json(),{...result,replayed:true});assert.deepEqual(await totals(),after);
  if(type==='exam')examId=result.questionSet.id;
 }
 // Existing practice endpoints can start the mixed-subject exam with all its IDs.
 let r=await mf.dispatchFetch('https://site.test/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'guest'})});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
 r=await mf.dispatchFetch('https://site.test/api/practice',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({action:'start',planId:examId})});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).active.items.length,15);
 // Editors must have every subject's scope to see or change a mixed plan.
 await db.prepare("INSERT INTO administrators(id,name,key_hash,role,subjects,enabled,created_at) VALUES('limited','Limited','test','editor','[\"go\"]',1,0)").run();
 const session='b'.repeat(64),{createHash}=await import('node:crypto');await db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update(session).digest('hex'),'limited',Date.now()+60000).run();
 const adminHeaders={'content-type':'application/json',cookie:'__Host-study-admin='+session};
 r=await mf.dispatchFetch('https://site.test/api/admin',{headers:adminHeaders});assert.equal(r.status,200);assert.equal((await r.json()).plans.length,0);
 r=await mf.dispatchFetch('https://site.test/api/admin',{method:'POST',headers:adminHeaders,body:JSON.stringify({action:'planStatus',id:examId,status:'archived'})});assert.equal(r.status,403);
 // Real SQLite triggers inject failures inside the actual D1 batch.
 const failure=async(trigger,code)=>{
  const before=await totals();await db.prepare(trigger).run();
  try{const r=await call(make());assert.equal(r.status,500,await r.clone().text());assert.deepEqual(await r.json(),{error:code,code});assert.deepEqual(await totals(),before);assert.equal((await db.prepare('SELECT status FROM auto_question_logs ORDER BY created_at DESC LIMIT 1').first()).status,'failed')}finally{await db.prepare('DROP TRIGGER inject_failure').run()}
 };
 await failure(`CREATE TRIGGER inject_failure BEFORE INSERT ON practice_plans BEGIN
  SELECT CASE WHEN (SELECT count(*) FROM auto_question_insert_receipts)=6 THEN RAISE(ABORT,'QUESTION_SET_CREATE_FAILED') ELSE RAISE(ABORT,'TEST_DID_NOT_INSERT_SIX') END; END`,'QUESTION_SET_CREATE_FAILED');
 await failure("CREATE TRIGGER inject_failure BEFORE INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN SELECT RAISE(ABORT,'QUESTION_LINK_FAILED'); END",'QUESTION_LINK_FAILED');
 await failure("CREATE TRIGGER inject_failure BEFORE INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN SELECT RAISE(IGNORE); END",'QUESTION_COUNT_MISMATCH');
 await failure(`CREATE TRIGGER inject_failure AFTER INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN UPDATE practice_plan_questions SET question_id='${existingId}' WHERE plan_id=NEW.plan_id AND sort_order=4; END`,'QUESTION_LINK_FAILED');
 // A skipped question insert cannot capture a prior insert's identifier.
 await failure("CREATE TRIGGER inject_failure BEFORE INSERT ON managed_questions WHEN (SELECT count(*) FROM auto_question_insert_receipts)=3 BEGIN SELECT RAISE(IGNORE); END",'QUESTION_COUNT_MISMATCH');
 await failure("CREATE TRIGGER inject_failure AFTER INSERT ON practice_plans BEGIN UPDATE practice_plans SET payload=json_remove(payload,'$.questions') WHERE id=NEW.id; END",'QUESTION_COUNT_MISMATCH');
 for(const mutate of [b=>{delete b.questions[3].zh.explanation},b=>{b.status='draft'},b=>{delete b.status},b=>{b.questions[3].kind='document'},b=>{b.questionSet.type='mock';b.questions[3].type='fill';b.questions[3].accepted=['答案']}]){
  const before=await totals(),body=make();mutate(body);r=await call(body);assert.equal(r.status,400);assert.equal((await r.json()).code,'QUESTION_PUBLISH_VALIDATION_FAILED');assert.deepEqual(await totals(),before);
 }
 const before=await totals(),duplicate=make();duplicate.questions[5]=duplicate.questions[0];assert.equal((await call(duplicate)).status,409);assert.deepEqual(await totals(),before);
 // Batch sizes remain caller policy, not 6/10/15 database constraints.
 r=await call(make('training',2,1));assert.equal(r.status,201);assert.equal((await r.json()).count,2);
 console.log('PASS: 6/10/15 mixed-subject plans, ordered inserted IDs, runnable exam, scope isolation, replay, publish validation, six transaction failure modes and no partial data.');
}finally{await mf.dispose()}
