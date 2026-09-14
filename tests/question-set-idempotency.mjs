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

 const counts=async()=>{
  const t=await totals();return [t.managed_questions,t.practice_plans,t.practice_plan_questions,t.auto_question_keys,t.practice_plan_names,t.auto_question_insert_receipts];
 };
 const body=make(),key='training-20260916';body.questionSet.name='训练20260916';
 let r=await call(body,key);assert.equal(r.status,201,await r.clone().text());const first=await r.json(),baseline=await totals();
 r=await call(body,key);assert.equal(r.status,200);assert.deepEqual(await r.json(),{...first,replayed:true});assert.deepEqual(await counts(),[6,1,6,1,1,0]);
 for(const changed of [{...body,questions:body.questions.map((q,i)=>i? q:{...q,zh:{...q.zh,title:'modified'}})},{...body,questionSet:{type:'invalid',name:'changed'}}]){
  r=await call(changed,key);assert.equal(r.status,409);assert.deepEqual(await totals(),baseline);
 }
 // Same name is rejected before any question INSERT, including old bodies
 // whose question titles also duplicate existing questions.
 await db.prepare("CREATE TRIGGER no_question_insert BEFORE INSERT ON managed_questions BEGIN SELECT RAISE(ABORT,'PREFLIGHT_TOO_LATE'); END").run();
 for(const b of [body,{...make(),questionSet:body.questionSet}]){
  r=await call(b);assert.equal(r.status,409,await r.clone().text());const data=await r.json();assert.equal(data.code,'QUESTION_SET_ALREADY_EXISTS');assert.equal(data.success,false);assert.equal(data.message,'训练20260916 已存在');assert.deepEqual(await totals(),baseline);
 }
 await db.prepare('DROP TRIGGER no_question_insert').run();
 // Parallel same-key requests replay the entire result; all IDs match.
 const concurrent=make(),sameKey='race-same-'+crypto.randomUUID(),before=await counts();
 const replies=await Promise.all(Array.from({length:6},()=>call(concurrent,sameKey)));
 assert.equal(replies.filter(r=>r.status===201).length,1);assert.ok(replies.every(r=>[200,201].includes(r.status)));
 const values=await Promise.all(replies.map(r=>r.json()));const original=values.find(v=>!v.replayed);
 for(const v of values)assert.deepEqual(v,v.replayed?{...original,replayed:true}:original);
 assert.deepEqual(await counts(),before.map((n,i)=>n+[6,1,6,1,1,0][i]));
 // Parallel different bodies sharing a key: exactly one wins.
 const conflictKey='race-conflict-'+crypto.randomUUID(),conflictBefore=await counts();
 const conflict=await Promise.all([call(make(),conflictKey),call(make(),conflictKey)]);
 assert.deepEqual(conflict.map(r=>r.status).sort(),[201,409]);assert.deepEqual(await counts(),conflictBefore.map((n,i)=>n+[6,1,6,1,1,0][i]));
 // Parallel new keys, same name and different titles: one full transaction.
 const shared=make(),newKeyBefore=await counts();
 const races=await Promise.all(Array.from({length:5},()=>call({...make(),questionSet:shared.questionSet})));
 assert.equal(races.filter(r=>r.status===201).length,1);
 for(const r of races.filter(r=>r.status!==201)){assert.equal(r.status,409);assert.equal((await r.json()).code,'QUESTION_SET_ALREADY_EXISTS')}
 assert.deepEqual(await counts(),newKeyBefore.map((n,i)=>n+[6,1,6,1,1,0][i]));
 // Database guards protect direct/manual writes and plan renames too.
 const stored=await db.prepare('SELECT * FROM practice_plans WHERE id=?').bind(first.questionSet.id).first();
 await assert.rejects(()=>db.prepare('INSERT INTO practice_plans(id,subject_id,status,payload,created_by,created_at) VALUES(?,?,?,?,?,?)').bind('direct-duplicate',stored.subject_id,stored.status,stored.payload,stored.created_by,stored.created_at).run(),/QUESTION_SET_ALREADY_EXISTS/);
 await assert.rejects(()=>db.prepare("UPDATE practice_plans SET payload=json_set(payload,'$.title',?) WHERE id=?").bind(body.questionSet.name,original.questionSet.id).run(),/QUESTION_SET_ALREADY_EXISTS/);
 await assert.rejects(()=>db.prepare('INSERT INTO practice_plan_questions(plan_id,question_id,sort_order) VALUES(?,?,99)').bind(first.questionSet.id,first.ids[0]).run(),/UNIQUE constraint/);
 // A legacy plan without a registry row still blocks both API and SQL writes.
 await db.prepare('DELETE FROM practice_plan_names WHERE plan_id=?').bind(first.questionSet.id).run();
 r=await call({...make(),questionSet:body.questionSet});assert.equal(r.status,409);assert.equal((await r.json()).code,'QUESTION_SET_ALREADY_EXISTS');
 await assert.rejects(()=>db.prepare('INSERT INTO practice_plans(id,subject_id,status,payload,created_by,created_at) VALUES(?,?,?,?,?,?)').bind('legacy-duplicate',stored.subject_id,stored.status,stored.payload,stored.created_by,stored.created_at).run(),/QUESTION_SET_ALREADY_EXISTS/);
 // Type and space are part of identity, so these same-name sets are valid.
 r=await call({...make('mock'),questionSet:{type:'mock',name:body.questionSet.name}});assert.equal(r.status,201);
 await db.prepare("INSERT INTO spaces(id,name,name_en,created_by) VALUES('other','Other','Other','test')").run();
 await db.prepare("INSERT INTO subjects(id,name,name_en,space_id,name_key,created_by) VALUES('other-subject','Other','Other','other','other','test')").run();
 const other=make();other.questionSet=body.questionSet;other.questions.forEach(q=>q.subjectId='other-subject');
 r=await call(other);assert.equal(r.status,201,await r.clone().text());
 const cross=make(),crossBefore=await totals();cross.questions[0].subjectId='other-subject';
 r=await call(cross);assert.equal(r.status,400);assert.deepEqual(await totals(),crossBefore);
 console.log('PASS: full transaction replay, changed-body conflicts, early name rejection, three concurrent race modes, SQL uniqueness, legacy names, type/space isolation and zero orphan rows.');
}finally{await mf.dispose()}
