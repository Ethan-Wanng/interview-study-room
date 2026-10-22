import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild');
const output=await build({stdin:{contents:`import * as auth from './app/api/auth/route';import * as practice from './app/api/practice/route';import {practiceQuestions,grade} from './content/practice';export default {async fetch(request){const path=new URL(request.url).pathname;if(path==='/bank')return Response.json(practiceQuestions);if(path==='/grade') {const p=await request.json();return Response.json({correct:grade(practiceQuestions.find(q=>q.id===p.id),p.value)})}const api=path==='/api/auth'?auth:practice;return request.method==='POST'?api.POST(request):api.GET(request)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'practice-test'}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const part of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(part.trim())await db.prepare(part.trim()).run();
 const call=(path,body,cookie='',origin='https://site.test')=>mf.dispatchFetch('https://site.test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',origin,cookie},...(body?{body:JSON.stringify(body)}:{})});
 const bank=await (await call('/bank')).json(),byId=new Map(bank.map(q=>[q.id,q]));
 assert.equal(bank.length,48);assert.equal(byId.size,48);
 for(const type of ['choice','fill','short','code'])assert.equal(bank.filter(q=>q.type===type).length,12);
 for(const q of bank){assert.ok(q.answer&&q.explanation);if(q.type==='code'||q.type==='short')assert.ok(q.rubric.length>=3);if(q.accepted){for(const v of q.accepted){const result=await (await call('/grade',{id:q.id,value:' '+v.toUpperCase()+' '})).json();assert.equal(result.correct,true,q.id)}assert.equal((await (await call('/grade',{id:q.id,value:'a completely wrong answer'})).json()).correct,false)}}
 assert.equal((await call('/api/practice')).status,401);
 const register=async ()=>{const r=await call('/api/auth',{action:'guest'});assert.equal(r.status,200,await r.clone().text());return r.headers.get('set-cookie').split(';')[0]};
 const cookie=await register(),other=await register();
 assert.equal((await call('/api/practice',{action:'goal',minutes:45},cookie)).status,400);
 assert.equal((await call('/api/practice',{action:'goal',minutes:60},cookie,'https://evil.test')).status,403);
 let r=await call('/api/practice',{action:'goal',minutes:60},cookie);assert.equal(r.status,200);assert.equal((await r.json()).goal,60);
 assert.equal((await (await call('/api/practice',null,cookie)).json()).goal,60);
 let state;const start=async(mode,track='all',minutes=30)=>{const r=await call('/api/practice',{action:'start',mode,track,minutes},cookie);assert.equal(r.status,200,await r.clone().text());state=await r.json();return state.active};
 const act=async p=>{const r=await call('/api/practice',{id:state.active.id,revision:state.active.revision,...p},cookie);assert.equal(r.status,200,await r.clone().text());state=await r.json();return state};
 let run=await start('exam');const firstId=run.id;
 assert.equal(run.items.length,12);for(const type of ['choice','fill','short','code'])assert.equal(run.items.filter(i=>i.question.type===type).length,3);
 assert.equal(new Set(run.items.map(i=>i.question.id)).size,12);
 for(const i of run.items){assert.equal(i.question.answer,undefined);assert.equal(i.question.accepted,undefined);assert.equal(i.question.explanation,undefined);assert.equal(i.question.code,undefined)}
 await start('random');assert.equal(state.active.id,firstId,'concurrent start resumes active exam');
 assert.equal((await (await call('/api/practice',null,other)).json()).active,null);
 assert.equal((await call('/api/practice',{action:'finish',id:firstId,revision:0},other)).status,404);
 const stale=state.active.revision;
 for(let i=0;i<state.active.items.length;i++){const q=byId.get(state.active.items[i].question.id);await act({action:'answer',index:i,value:q.accepted?.[0]??'My reasoned response'});assert.equal(state.active.items[i].question.answer,undefined,'exam answer hidden until hand-in')}
 assert.equal((await call('/api/practice',{action:'finish',id:firstId,revision:stale},cookie)).status,409);
 run=(await (await call('/api/practice',null,cookie)).json()).active;assert.ok(run.items.every(i=>i.response.submitted),'reload preserves answers');
 await act({action:'finish'});assert.equal(state.active,null);assert.equal(state.history[0].correct,6);assert.equal(state.history[0].objective,6);assert.ok(state.review.items.every(i=>i.question.answer&&i.question.explanation));
 assert.equal((await (await call('/api/practice?id='+firstId,null,other)).json()).review,undefined);
 assert.equal((await (await call('/api/practice?id='+firstId,null,cookie)).json()).review.id,firstId);
 for(const track of ['go','backend']){run=await start('exam',track);assert.equal(run.items.length,12);assert.ok(run.items.every(i=>i.question.track===track));await act({action:'finish'})}
 run=await start('interview');assert.equal(run.items.length,8);assert.equal(run.items.filter(i=>i.question.type==='short').length,6);assert.equal(run.items.filter(i=>i.question.type==='code').length,2);
 assert.equal((await call('/api/practice',{action:'next',id:run.id,revision:run.revision},cookie)).status,400);
 await act({action:'answer',index:0,value:'Explain principles and limits'});assert.ok(state.active.items[0].question.explanation);assert.equal(state.active.items[0].correct,null);
 await act({action:'self',index:0,value:1});assert.equal(state.active.items[0].response.self,1);
 await act({action:'next'});assert.equal(state.active.index,1);await act({action:'finish'});
 run=await start('random','all',30);assert.equal(run.items.length,1);
 const randomId=run.id;
 // Force a full pool of previous occurrences. A fresh random occurrence must still be appended, not deduplicated.
 let row=await db.prepare('SELECT payload FROM practice_runs WHERE id=?').bind(randomId).first();let p=JSON.parse(row.payload);
 p.ids=bank.map(q=>q.id);p.answers=bank.map(()=>({value:'',submitted:true,self:null}));p.index=47;
 await db.prepare('UPDATE practice_runs SET payload=? WHERE id=?').bind(JSON.stringify(p),randomId).run();state=await (await call('/api/practice',null,cookie)).json();await act({action:'next'});assert.equal(state.active.items.length,49);assert.equal(state.active.index,48);assert.ok(bank.some(q=>q.id===state.active.items[48].question.id));
 // Wall-time guard: an immediate 30-second tick cannot create 30 seconds of study credit.
 row=await db.prepare('SELECT payload FROM practice_runs WHERE id=?').bind(randomId).first();p=JSON.parse(row.payload);p.lastTick=Date.now()+1000;await db.prepare('UPDATE practice_runs SET payload=? WHERE id=?').bind(JSON.stringify(p),randomId).run();
 await act({action:'tick',elapsed:30});assert.equal(state.active.seconds,0);assert.equal(state.seconds,0);
 // Simulate 20 seconds of foreground study near the target, without a slow real-time test.
 row=await db.prepare('SELECT payload FROM practice_runs WHERE id=?').bind(randomId).first();p=JSON.parse(row.payload);p.lastTick=Date.now()-21000;p.seconds=1788;
 await db.prepare('UPDATE practice_runs SET payload=? WHERE id=?').bind(JSON.stringify(p),randomId).run();const rev=state.active.revision;
 await act({action:'tick',elapsed:20});assert.equal(state.active,null);assert.equal(state.review.seconds,1800);assert.equal(state.seconds,12);assert.equal(state.review.id,randomId);
 assert.equal((await call('/api/practice',{action:'tick',elapsed:20,id:randomId,revision:rev},cookie)).status,409);
 state=await (await call('/api/practice',null,cookie)).json();assert.equal(state.seconds,12,'no duplicate daily credit');assert.equal(state.goal,60);
 assert.equal((await (await call('/api/practice',null,other)).json()).seconds,0);
 console.log('PASS: 48-question bank, answer normalization, balanced exams, hidden solutions, objective grades, persisted answers, interview self-evaluation, repeatable random questions, account isolation, CSRF, goal persistence, timer wall-time limits, auto-completion, idempotent daily credit, history.');
}finally{await mf.dispose()}
