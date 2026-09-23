import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild'),secret='workflow-test-'+'a'.repeat(40);
const output=await build({stdin:{contents:`import * as auto from './app/api/admin/auto-questions/route';import * as token from './app/api/admin/auto-question-token/route';export default {fetch(r){const route=new URL(r.url).pathname.endsWith('/auto-question-token')?token:auto;return r.method==='POST'?route.POST(r):route.GET(r)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'workflow'},bindings:{AUTO_QUESTION_API_TOKEN:secret}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const ownerCookie='__Host-study-admin='+'b'.repeat(64),editorCookie='__Host-study-admin='+'c'.repeat(64);
 for(const role of ['owner','editor']){
  await db.prepare('INSERT INTO administrators(id,name,key_hash,role,subjects,enabled,created_at) VALUES(?,?,?,?,?,1,0)').bind(role,role,role+'-hash',role,'["go","backend"]').run();
  await db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update((role==='owner'?'b':'c').repeat(64)).digest('hex'),role,Date.now()+600000).run();
 }
 const tokenCall=(body,cookie='',origin='https://site.test')=>mf.dispatchFetch('https://site.test/api/admin/auto-question-token',{method:body?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await tokenCall({action:'generate'})).status,401);
 assert.equal((await tokenCall({action:'generate'},editorCookie)).status,403);
 assert.equal((await tokenCall({action:'generate'},ownerCookie,'https://evil.test')).status,403);
 assert.equal((await tokenCall({action:'generate'},ownerCookie,'')).status,403);
 let r=await tokenCall({action:'generate'},ownerCookie);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('set-cookie'),null);
 const issued=await r.json();assert.match(issued.token,/^aq1_/);assert(issued.expiresAt>Date.now());
 r=await tokenCall({action:'save',token:'invalid'},ownerCookie);assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null);
 r=await tokenCall({action:'save',token:issued.token});assert.equal(r.status,200);
 const cookieHeader=r.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=2592000'])assert(cookieHeader.includes(flag));
 const cookie=cookieHeader.split(';')[0];assert.equal((await (await tokenCall(null,cookie)).json()).verified,true);
 const make=()=>({status:'published',questionSet:{type:'training',name:'workflow-'+crypto.randomUUID()},questions:Array.from({length:6},(_,i)=>({subjectId:i<3?'go':'backend',kind:'practice',type:'short',topic:'事务',zh:{title:crypto.randomUUID(),answer:'答案',explanation:'解释',rubric:['说明原因']}}))});
 const auto=(body,key,check=false,auth={cookie},origin='https://site.test')=>mf.dispatchFetch('https://site.test/api/admin/auto-questions'+(check?'?check=1':''),{method:'POST',headers:{...auth,origin,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});
 const totals=async()=>{const result={};for(const t of ['managed_questions','practice_plans','practice_plan_questions','auto_question_keys','auto_question_logs'])result[t]=(await db.prepare('SELECT count(*) n FROM '+t).first()).n;return result};
 const body=make(),key='manual-'+crypto.randomUUID(),before=await totals();
 assert.equal((await auto(body,key,true,{cookie},'https://evil.test')).status,403);
 r=await auto(body,key,true);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).checked,true);assert.deepEqual(await totals(),before,'preflight must not write any data or execution logs');
 const invalid=structuredClone(body);invalid.questions[2].zh.answer='';r=await auto(invalid,key,true);assert.equal(r.status,400);assert.deepEqual(await totals(),before);
 r=await auto(body,key);assert.equal(r.status,201,await r.clone().text());const result=await r.json();assert.equal(result.count,6);
 r=await auto(body,key,false,{authorization:'Bearer '+issued.token});assert.equal(r.status,200);assert.equal((await r.json()).replayed,true);
 assert.equal((await totals()).managed_questions,6);assert.equal((await totals()).practice_plans,1);assert.equal((await totals()).practice_plan_questions,6);
 const changed=structuredClone(body);changed.questions[0].zh.title+=' changed';r=await auto(changed,key);assert.equal(r.status,409);assert.equal((await r.json()).code,'IDEMPOTENCY_CONFLICT');
 r=await auto(body,'manual-'+crypto.randomUUID(),true);assert.equal(r.status,409);assert.equal((await r.json()).code,'QUESTION_SET_ALREADY_EXISTS');
 assert.equal((await auto(make(),'manual-'+crypto.randomUUID(),true,{authorization:'Bearer '+secret})).status,200,'legacy token remains valid');
 assert.equal((await auto(make(),'manual-'+crypto.randomUUID(),true,{authorization:'Bearer '+issued.token.slice(0,-1)+(issued.token.endsWith('0')?'1':'0')})).status,401);
 const expiredPayload='aq1_1000000000_'+'d'.repeat(32),expired=expiredPayload+'_'+createHmac('sha256',secret).update('auto-question-token:v1:'+expiredPayload).digest('hex');
 assert.equal((await tokenCall({action:'save',token:expired})).status,401);
 assert.equal((await auto(make(),'manual-'+crypto.randomUUID(),true,{cookie:'__Host-study-api='+expired})).status,401);
 // Credentials accidentally pasted into a title are scrubbed from failure logs.
 const bad=make();bad.questions[1].zh.title=issued.token;bad.questions[2].zh.title=issued.token;
 await auto(bad,'manual-'+crypto.randomUUID());
 const logs=await (await mf.dispatchFetch('https://site.test/api/admin/auto-questions',{headers:{cookie}})).text();assert(!logs.includes(issued.token));assert(!logs.includes(secret));
 r=await tokenCall({action:'forget'},cookie);assert(r.headers.get('set-cookie').includes('Max-Age=0'));assert.equal((await (await tokenCall(null)).json()).verified,false);
 const helper=await build({entryPoints:['lib/console-attempt.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {persistAttempt,readJournal,JOURNAL_KEY,confirmedResponse}=await import('data:text/javascript;base64,'+Buffer.from(helper.outputFiles[0].text).toString('base64'));
 const store=new Map(),storage={setItem:(k,v)=>store.set(k,v)},attempt={key,body:structuredClone(body)};
 persistAttempt(storage,{attempt,settled:false,result:null});attempt.body.questions[0].zh.title='edited after submit';
 const restored=readJournal(store.get(JOURNAL_KEY));assert.equal(restored.attempt.key,key);assert.equal(restored.attempt.body.questions[0].zh.title,body.questions[0].zh.title);assert.equal(restored.settled,false);
 assert.throws(()=>persistAttempt({setItem(){throw Error('Storage blocked')}},{attempt,settled:false,result:null}));
 assert.throws(()=>readJournal('{'));assert.equal(readJournal(null),null);
 assert.equal(confirmedResponse({key,body},result),true);assert.equal(confirmedResponse({key,body},{error:'invalid response'}),false);assert.equal(confirmedResponse({key,body},{...result,ids:[]}),false);
 console.log('PASS: owner token generation, verification before secure cookie persistence, invalid/expired/tampered tokens, CSRF, legacy access, read-only preflight, atomic creation/replay/conflict, log redaction, exact-request recovery and storage failure.');
}finally{await mf.dispose()}
