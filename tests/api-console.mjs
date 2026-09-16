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



 const {createHash}=await import('node:crypto');
 for(const role of ['owner','editor']){
  await db.prepare('INSERT INTO administrators(id,name,key_hash,role,subjects,enabled,created_at) VALUES(?,?,?,?,?,1,0)').bind(role,role,role+'-hash',role,'["go","backend"]').run();
  await db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update((role==='owner'?'b':'c').repeat(64)).digest('hex'),role,Date.now()+60000).run();
 }
 const request=(role,body,origin='https://site.test',authorization)=>mf.dispatchFetch('https://site.test/api/admin/auto-questions',{method:body?'POST':'GET',headers:{cookie:'__Host-study-admin='+(role==='owner'?'b':'c').repeat(64),...(origin?{origin}:{}),...(body?{'content-type':'application/json','idempotency-key':'console-'+crypto.randomUUID()}:{}),...(authorization?{authorization}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let r=await request('owner');assert.equal(r.status,200);
 r=await request('owner',make('training',3,2));assert.equal(r.status,201,await r.clone().text());
 for(const origin of ['https://evil.test',''])assert.equal((await request('owner',make(),origin)).status,403);
 assert.equal((await request('editor')).status,403);assert.equal((await request('editor',make())).status,403);
 assert.equal((await request('owner',make(),'https://site.test','Bearer invalid')).status,401);
 assert.equal((await call(make())).status,201,'existing Bearer path still works');
 await db.prepare("UPDATE administrators SET enabled=0 WHERE id='owner'").run();assert.equal((await request('owner')).status,401);
 const helper=await build({entryPoints:['lib/auto-question-console.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {parseQuestionJson,consoleBody,verifyCreatedSet}=await import('data:text/javascript;base64,'+Buffer.from(helper.outputFiles[0].text).toString('base64'));
 const body=make();assert.equal(parseQuestionJson(JSON.stringify(body)).questions.length,6);
 assert.equal(parseQuestionJson('```json\n'+JSON.stringify(body.questions)+'\n```').type,'none');
 for(const bad of ['{}','[]','not json','{"questions":[{}]}'])assert.throws(()=>parseQuestionJson(bad));
 assert.throws(()=>parseQuestionJson(JSON.stringify({...body,status:'draft'})));
 assert.equal(consoleBody(parseQuestionJson(JSON.stringify(body))).questionSet.name,body.questionSet.name);
 assert.equal(verifyCreatedSet({questionSet:{id:'set'},count:1,ids:['q']},{id:'set',status:'published',associationSource:'links',questionCount:1,linkedCount:1,questions:[{question:{id:'q'},sortOrder:1}]}),true);
 assert.equal(verifyCreatedSet({questionSet:{id:'set'},count:1,ids:['q']},{id:'set',status:'published',associationSource:'links',questionCount:1,linkedCount:0,questions:[]}),false);
 console.log('PASS: console JSON parsing, ordered verification, owner session access, CSRF protection, editor/disabled-user denial and unchanged Bearer access.');
}finally{await mf.dispose()}
