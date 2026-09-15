import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild');
const token='stage-one-test-token-'+'a'.repeat(32);
const output=await build({stdin:{contents:`import {POST,GET} from './app/api/admin/auto-questions/route';import {questionSetInput,questionSetModes} from './lib/question-set';export default {async fetch(r){if(new URL(r.url).pathname==='/validate'){const p=await r.json();const q=questionSetInput(p.questionSet);return Response.json({questionSet:q,mode:q?questionSetModes[q.type]:null})}return r.method==='POST'?POST(r):GET(r)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'question-set-stage-one'},bindings:{AUTO_QUESTION_API_TOKEN:token}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const call=(body,key='stage-one-'+crypto.randomUUID(),auth=token)=>mf.dispatchFetch('https://site.test/api/admin/auto-questions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth,'idempotency-key':key},body:JSON.stringify(body)});
 const question=title=>({subjectId:'go',kind:'document',type:'short',topic:'阶段一',section:'参数验收',zh:{title,blocks:[{type:'text',text:'测试答案'}]}});
 const count=async table=>(await db.prepare('SELECT COUNT(*) AS n FROM '+table).first()).n;
 const old={status:'draft',questions:[question('阶段一旧请求')]};
 let r=await call(old,'stage-one-legacy');assert.equal(r.status,201);const original=await r.json();assert.equal(original.count,1);assert.equal(original.status,'draft');
 r=await call(old,'stage-one-legacy');assert.equal(r.status,200);assert.deepEqual(await r.json(),{...original,replayed:true});
 assert.equal((await call(old)).status,409);
 assert.equal((await call({...old,status:'published'},'stage-one-legacy')).status,409);
 assert.equal((await call(old,undefined,'bad-token')).status,401);
 for(const [type,mode] of [['training','random'],['mock','interview'],['exam','exam']]){
  const body={status:'published',questionSet:{type,name:'训练20260916'},questions:[{...question('阶段一新增 '+type),kind:'practice',zh:{title:'阶段一新增 '+type,answer:'答案',explanation:'解析',rubric:['要点']}}]};
  r=await call(body);assert.equal(r.status,201,await r.clone().text());assert.equal((await r.json()).status,'published');
  r=await mf.dispatchFetch('https://site.test/validate',{method:'POST',body:JSON.stringify({...body,questions:[]})});assert.deepEqual(await r.json(),{questionSet:body.questionSet,mode});
 }
 // Empty batches retain their pre-existing error after questionSet validation.
 for(const body of [{status:'draft',questions:[]},{status:'published',questionSet:{type:'training',name:'训练20260916'},questions:[]}]){
  r=await call(body);assert.equal(r.status,400);assert.equal((await r.json()).error,'每次提交 1–100 道题。');
 }
 for(const questionSet of [null,[],{},'training',{type:'abc',name:'测试'},{type:'toString',name:'测试'},{type:1,name:'测试'}]){
  r=await call({questionSet});assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:'INVALID_QUESTION_SET_TYPE',code:'INVALID_QUESTION_SET_TYPE'});
 }
 for(const name of [undefined,null,1,[],{},'','   ','\t\n','a'.repeat(101),'题'.repeat(101)]){
  r=await call({questionSet:{type:'training',name}});assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:'INVALID_QUESTION_SET_NAME',code:'INVALID_QUESTION_SET_NAME'});
 }
 for(const name of ['题','a'.repeat(100),'题'.repeat(100),'😀'.repeat(100),'  合法名称  ']){
  r=await mf.dispatchFetch('https://site.test/validate',{method:'POST',body:JSON.stringify({questionSet:{type:'training',name}})});assert.equal(r.status,200);assert.equal((await r.json()).questionSet.name,name.trim());
 }
 // Validation failures and rejected batches must not insert any questions/plans.
 r=await call({questions:[question('整批新题'),question('阶段一旧请求')]});assert.equal(r.status,409);
 assert.equal(await count('managed_questions'),4);assert.equal(await count('auto_question_keys'),4);assert.equal(await count('practice_plans'),3);
 r=await mf.dispatchFetch('https://site.test/api/admin/auto-questions',{headers:{authorization:'Bearer '+token}});assert.equal(r.status,200);const {logs}=await r.json();assert.ok(logs.some(x=>x.status==='success'));assert.ok(logs.some(x=>x.status==='replayed'));assert.ok(logs.some(x=>x.status==='failed'));
 console.log('PASS: legacy API, all questionSet types, names and boundaries, exact error codes, empty-batch compatibility, auth, idempotency, duplicates, unchanged logs and compatible plan creation.');
}finally{await mf.dispose()}
