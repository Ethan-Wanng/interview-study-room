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



 const snapshot=async()=>{
  const data={};for(const table of ['managed_questions','practice_plans','practice_plan_questions','practice_plan_names','auto_question_keys','auto_question_fingerprints','auto_question_insert_receipts'])data[table]=(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results;
  return data;
 };
 const get=path=>mf.dispatchFetch('https://site.test'+path,{headers:{authorization:'Bearer '+token}});
 const base=await snapshot();let r=await call({status:'draft',questions:[]});assert.equal(r.status,400);assert.deepEqual(await snapshot(),base);
 const old=make('training',1,1);delete old.questionSet;old.status='draft';
 r=await call(old);assert.equal(r.status,201);assert.ok(!('questionSet' in await r.json()));assert.equal((await snapshot()).practice_plans.length,0);
 console.log('PASS 1: empty legacy batch remains 400; valid legacy batch inserts questions only.');
 const created=[];
 for(const [test,type,n,go,name] of [[2,'training',6,3,'训练20260916'],[3,'mock',10,5,'模拟20260916'],[4,'exam',15,8,'考试20260916']]){
  const body=make(type,n,go);body.questionSet.name=name;const key=type+'-20260916',before=await snapshot();
  r=await call(body,key);assert.equal(r.status,201,await r.clone().text());const result=await r.json(),after=await snapshot();assert.equal(result.success,true);assert.equal(result.count,n);assert.equal(result.questionSet.questionCount,n);assert.equal(result.replayed,false);
  assert.equal(after.managed_questions.length-before.managed_questions.length,n);assert.equal(after.practice_plans.length-before.practice_plans.length,1);assert.equal(after.practice_plan_questions.length-before.practice_plan_questions.length,n);
  r=await get('/api/admin/question-sets?'+new URLSearchParams({type,name}));assert.equal(r.status,200);const {data}=await r.json();assert.equal(data.id,result.questionSet.id);assert.equal(data.questionCount,n);assert.equal(data.linkedCount,n);assert.deepEqual(data.questions.map(x=>x.question.id),result.ids);assert.equal(data.questions.filter(x=>x.question.track==='go').length,go);
  created.push({body,key,result});console.log('PASS '+test+': '+key+' -> '+n+' questions, 1 set, '+n+' ordered links.');
 }
 const reject=async(test,body,status,code,key)=>{const before=await snapshot();const r=await call(body,key);assert.equal(r.status,status,await r.clone().text());if(code)assert.equal((await r.json()).code,code);assert.deepEqual(await snapshot(),before);console.log('PASS '+test+': full state unchanged.')};
 const duplicate=make();duplicate.questions[3]=created[0].body.questions[0];await reject(5,duplicate,409);
 const unanswered=make();delete unanswered.questions[3].zh.answer;await reject(6,unanswered,400,'QUESTION_PUBLISH_VALIDATION_FAILED');
 for(const [test,trigger,code] of [
  [7,"BEFORE INSERT ON practice_plans BEGIN SELECT RAISE(ABORT,'QUESTION_SET_CREATE_FAILED'); END",'QUESTION_SET_CREATE_FAILED'],
  [8,"BEFORE INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN SELECT RAISE(ABORT,'QUESTION_LINK_FAILED'); END",'QUESTION_LINK_FAILED'],
  [9,"BEFORE INSERT ON practice_plan_questions WHEN NEW.sort_order=4 BEGIN SELECT RAISE(IGNORE); END",'QUESTION_COUNT_MISMATCH']]){
  await db.prepare('CREATE TRIGGER acceptance_failure '+trigger).run();try{await reject(test,make(),500,code)}finally{await db.prepare('DROP TRIGGER acceptance_failure').run()}
 }
 for(const {body,key,result} of created){
  const before=await snapshot();r=await call(body,key);assert.equal(r.status,200);assert.deepEqual(await r.json(),{...result,replayed:true});assert.deepEqual(await snapshot(),before);
  const changed=structuredClone(body);changed.questions[0].zh.title+=' changed';await reject(11,changed,409,undefined,key);
  const sameName=make(body.questionSet.type);sameName.questionSet=body.questionSet;await reject(12,sameName,409,'QUESTION_SET_ALREADY_EXISTS');
 }
 console.log('PASS 10: all three exact keys replay without any data changes.');
 const final=await snapshot();assert.equal(final.managed_questions.length,32);assert.equal(final.practice_plans.length,3);assert.equal(final.practice_plan_questions.length,31);assert.equal(final.practice_plan_names.length,3);assert.equal(final.auto_question_insert_receipts.length,0);
 assert.equal((await db.prepare("SELECT count(*) n FROM managed_questions q WHERE q.status='published' AND NOT EXISTS(SELECT 1 FROM practice_plan_questions l WHERE l.question_id=q.id)").first()).n,0);
 assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 // Even if callers accidentally copy credentials into diagnostic fields,
 // neither the log table nor log API may expose a complete Token.
 const sensitive=make();sensitive.questionSet.name='Bearer '+token;
 r=await call(sensitive,token);assert.equal(r.status,201);r=await call(sensitive,'token-error-test');assert.equal(r.status,409);
 const stored=JSON.stringify((await db.prepare('SELECT * FROM auto_question_logs').all()).results);
 assert.ok(!stored.includes(token),'Token leaked through user-controlled log fields');
 await db.prepare('INSERT INTO auto_question_logs(id,key,status,count,detail,created_at) VALUES(?,?,?,?,?,?)').bind('historical-secret','legacy','failed',0,'Bearer '+token,Date.now()).run();
 r=await get('/api/admin/auto-questions');assert.ok(!(await r.text()).includes(token));
 console.log('PASS: final invariants and credential redaction in execution logs.');
}finally{await mf.dispose()}
