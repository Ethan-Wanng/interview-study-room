import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const {build}=wranglerRequire('esbuild');
const output=await build({stdin:{contents:`import * as auth from './app/api/auth/route';import * as study from './app/api/study/route';export default {async fetch(request){const api=new URL(request.url).pathname==='/api/auth'?auth:study;return request.method==='POST'?api.POST(request):api.GET(request)}}`,resolveDir:process.cwd(),sourcefile:'test-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'study-test'}});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const part of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint')){if(part.trim())await db.prepare(part.trim()).run()}}
 const bank=JSON.parse(await readFile('content/questions.json','utf8'));
 const call=(path,body,cookie='',extra={})=>mf.dispatchFetch('https://site.test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',origin:'https://site.test',cookie,...extra},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call('/api/study')).status,401);
 assert.equal((await call('/api/auth',{action:'register',username:'ab',password:'valid-password-123'})).status,400);
 assert.equal((await call('/api/auth',{action:'register',username:'learner_a',password:'valid-password-123'},'',{origin:'https://evil.test'})).status,403);
 let response=await call('/api/auth',{action:'register',username:'learner_a',password:'valid-password-123'});
 assert.equal(response.status,200,await response.clone().text());
 let cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);cookie=cookie.split(';')[0];
 assert.equal((await (await call('/api/auth',null,cookie)).json()).user.username,'learner_a');
 let state=await (await call('/api/study',null,cookie)).json();assert.equal(state.preferences.new_goal,10);
 response=await call('/api/study',{action:'goals',newGoal:6,reviewGoal:12},cookie);assert.equal(response.status,200);assert.equal((await response.json()).preferences.new_goal,6);
 const rate={action:'rate',questionId:bank.questions[0].id,rating:'good'};
 response=await call('/api/study',rate,cookie);assert.equal(response.status,200);state=await response.json();assert.equal(state.progress[0].rating,'good');assert.equal(state.activity.length,1);
 state=await (await call('/api/study',rate,cookie)).json();assert.equal(state.activity.length,1);assert.equal(state.progress[0].stage,0);
 state=await (await call('/api/study',{...rate,rating:'again'},cookie)).json();assert.equal(state.progress[0].rating,'again');assert.equal(state.progress[0].stage,0);
 state=await (await call('/api/study',null,cookie)).json();assert.equal(state.progress[0].rating,'again');assert.equal(state.preferences.new_goal,6);
 assert.equal((await call('/api/study',{...rate,questionId:'unknown'},cookie)).status,400);
 response=await call('/api/auth',{action:'register',username:'learner_b',password:'another-password-123'});const cookieB=response.headers.get('set-cookie').split(';')[0];assert.equal((await (await call('/api/study',null,cookieB)).json()).progress.length,0);
 const row=await db.prepare('SELECT password_hash FROM accounts WHERE username=?').bind('learner_a').first();assert.ok(!row.password_hash.includes('valid-password'));
 assert.equal((await call('/api/auth',{action:'login',username:'learner_a',password:'incorrect-password'})).status,401);
 response=await call('/api/auth',{action:'login',username:'learner_a',password:'valid-password-123'});assert.equal(response.status,200);const secondCookie=response.headers.get('set-cookie').split(';')[0];
 response=await call('/api/auth',{action:'password',password:'valid-password-123',newPassword:'changed-password-123'},cookie);assert.equal(response.status,200);cookie=response.headers.get('set-cookie').split(';')[0];assert.equal((await call('/api/study',null,secondCookie)).status,401);
 await call('/api/auth',{action:'logout'},cookie);assert.equal((await call('/api/study',null,cookie)).status,401);
 console.log('PASS: Worker-native registration, password hashing, login, session cookies, CSRF, saved goals, all study ratings, reload persistence, user isolation, password change, logout.');
}finally{await mf.dispose()}
