import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild'),token='transaction-test-'+'a'.repeat(40);
const output=await build({stdin:{contents:`import * as auto from './app/api/admin/auto-questions/route';import * as sets from './app/api/admin/question-sets/route';export default {fetch(r){return new URL(r.url).pathname==='/api/admin/question-sets'?sets.GET(r):r.method==='POST'?auto.POST(r):auto.GET(r)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
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


 const get=(path,auth=token)=>mf.dispatchFetch('https://site.test'+path,{headers:{authorization:'Bearer '+auth}});
 const query=(type,name,spaceId)=>'/api/admin/question-sets?'+new URLSearchParams({type,name,...(spaceId?{spaceId}:{})});
 const logs=async()=>{const r=await get('/api/admin/auto-questions');assert.equal(r.status,200);return (await r.json()).logs};
 const entry=async key=>(await logs()).find(x=>x.idempotencyKey===key);
 const checkLog=(log,status,requested,created,linked)=>{
  for(const field of ['executionId','idempotencyKey','questionSetType','questionSetName','questionSetId','requestedCount','createdCount','linkedCount','status','replayed','errorCode','errorMessage','createdAt','finishedAt','durationMs'])assert.ok(field in log,field);
  assert.equal(log.status,status);assert.equal(log.requestedCount,requested);assert.equal(log.createdCount,created);assert.equal(log.linkedCount,linked);
  assert.equal(log.replayed,status==='replayed');assert.ok(log.finishedAt>=log.createdAt);assert.equal(log.durationMs,log.finishedAt-log.createdAt);
 };
 let firstBody,first;
 for(const type of ['training','mock','exam']){
  const body=make(type),key='report-'+type;
  let r=await call(body,key);assert.equal(r.status,201,await r.clone().text());const result=await r.json();
  assert.equal(result.success,true);assert.equal(result.ok,true);assert.equal(result.replayed,false);assert.equal(result.count,6);assert.equal(result.questionSet.questionCount,6);
  let log=await entry(key);checkLog(log,'success',6,6,6);assert.equal(log.questionSetId,result.questionSet.id);assert.equal(log.questionSetType,type);assert.equal(log.questionSetName,body.questionSet.name);assert.equal(log.errorCode,null);
  r=await get(query(type,body.questionSet.name));assert.equal(r.status,200,await r.clone().text());const {data}=await r.json();assert.equal(data.id,result.questionSet.id);assert.equal(data.questionCount,6);assert.equal(data.linkedCount,6);assert.equal(data.associationSource,'links');assert.deepEqual(data.questions.map(x=>x.question.id),result.ids);assert.deepEqual(data.questions.map(x=>x.sortOrder),[1,2,3,4,5,6]);
  r=await call(body,key);assert.deepEqual(await r.json(),{...result,replayed:true});log=await entry(key);checkLog(log,'replayed',6,0,0);assert.equal(log.questionSetId,result.questionSet.id);
  const before=await totals();r=await call({...make(type),questionSet:body.questionSet},key);assert.equal(r.status,409);log=await entry(key);checkLog(log,'failed',6,0,0);assert.equal(log.errorCode,'IDEMPOTENCY_CONFLICT');assert.equal(log.questionSetId,null);assert.deepEqual(await totals(),before);
  const duplicateKey='duplicate-'+type;r=await call({...make(type),questionSet:body.questionSet},duplicateKey);assert.equal(r.status,409);log=await entry(duplicateKey);checkLog(log,'failed',6,0,0);assert.equal(log.errorCode,'QUESTION_SET_ALREADY_EXISTS');assert.ok(log.errorMessage.includes(body.questionSet.name));
  firstBody??=body;first??=result;
 }
 let r=await get('/api/admin/question-sets');assert.equal((await r.json()).data.length,3);
 r=await get(query('training','missing'));assert.equal(r.status,404);assert.equal((await r.json()).code,'QUESTION_SET_NOT_FOUND');
 r=await get(query('invalid','name'));assert.equal(r.status,400);assert.equal((await r.json()).code,'INVALID_QUESTION_SET_TYPE');
 r=await get(query('training','   '));assert.equal(r.status,400);
 for(const path of ['/api/admin/question-sets','/api/admin/auto-questions']){r=await get(path,'invalid');assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store')}
 // Legacy POST remains unchanged; old stored set results are enriched on replay.
 const old={status:'draft',questions:[{subjectId:'go',kind:'document',type:'short',topic:'legacy',section:'legacy',zh:{title:'legacy report',blocks:[{type:'text',text:'answer'}]}}]};
 r=await call(old,'report-legacy');const legacy=await r.json();assert.equal(r.status,201);assert.ok(!('questionSet' in legacy));checkLog(await entry('report-legacy'),'success',1,1,0);
 await db.prepare("UPDATE auto_question_keys SET response=json_remove(response,'$.success','$.replayed','$.questionSet.questionCount') WHERE key='report-training'").run();
 r=await call(firstBody,'report-training');assert.deepEqual(await r.json(),{...first,replayed:true});
 // Real transaction failure leaves only one failed execution, no partial counts.
 await db.prepare("CREATE TRIGGER report_failure BEFORE INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN SELECT RAISE(ABORT,'QUESTION_LINK_FAILED'); END").run();
 const before=await totals();r=await call(make(),'report-rollback');assert.equal(r.status,500);assert.deepEqual(await totals(),before);const failed=await entry('report-rollback');checkLog(failed,'failed',6,0,0);assert.equal(failed.errorCode,'QUESTION_LINK_FAILED');assert.equal(failed.questionSetId,null);await db.prepare('DROP TRIGGER report_failure').run();
 // A damaged association must never be reported as a complete set.
 await db.prepare('DELETE FROM practice_plan_questions WHERE plan_id=? AND sort_order=6').bind(first.questionSet.id).run();
 r=await get(query('training',firstBody.questionSet.name));assert.equal(r.status,409);assert.equal((await r.json()).code,'QUESTION_COUNT_MISMATCH');
 await db.prepare('INSERT INTO practice_plan_questions(plan_id,question_id,sort_order) VALUES(?,?,6)').bind(first.questionSet.id,first.ids[5]).run();
 // Same name in another space is ambiguous until the caller supplies spaceId.
 const plan=await db.prepare('SELECT payload FROM practice_plans WHERE id=?').bind(first.questionSet.id).first();
 await db.prepare('INSERT INTO practice_plans(id,subject_id,status,payload,created_by,created_at) VALUES(?,?,?,?,?,?)').bind('other-space','other','published',plan.payload,'manual',Date.now()).run();
 r=await get(query('training',firstBody.questionSet.name));assert.equal(r.status,409);assert.equal((await r.json()).code,'QUESTION_SET_AMBIGUOUS');
 r=await get(query('training',firstBody.questionSet.name,'go-interview'));assert.equal((await r.json()).data.id,first.questionSet.id);
 r=await get(query('training',firstBody.questionSet.name,'other'));const manual=(await r.json()).data;assert.equal(manual.associationSource,'snapshot');assert.equal(manual.questionCount,6);
 // Legacy rows have explicit unknown metrics rather than invented timings.
 await db.prepare("INSERT INTO auto_question_logs(id,key,status,count,detail,created_at) VALUES('old-log','old-key','rejected',0,'old failure',?)").bind(Date.now()).run();
 const historical=(await logs()).find(x=>x.executionId==='old-log');assert.equal(historical.status,'failed');assert.equal(historical.finishedAt,null);assert.equal(historical.linkedCount,null);
 // Exactly the newest 50 entries are returned; no auth header or Token is stored.
 for(let i=0;i<52;i++)await call({questions:[]},'limit-test-'+String(i).padStart(3,'0'));
 const recent=await logs();assert.equal(recent.length,50);assert.equal(recent[0].idempotencyKey,'limit-test-051');assert.ok(recent.every(x=>x.status==='failed'));
 const all=JSON.stringify((await db.prepare('SELECT * FROM auto_question_logs').all()).results);assert.ok(!all.includes(token));assert.ok(!all.includes('Bearer '));assert.ok(!all.includes('Authorization'));assert.equal(new Set(recent.map(x=>x.executionId)).size,50);
 console.log('PASS: enriched POST and legacy replay, ordered authenticated query, missing/ambiguous/damaged sets, complete success/failure/replay logs, rollback, timing, legacy log compatibility, latest 50 and Token exclusion.');
}finally{await mf.dispose()}
