import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=local('miniflare'),{build}=local('esbuild'),ts=require('typescript');
const output=await build({stdin:{contents:`import * as auth from './app/api/auth/route';import * as study from './app/api/study/route';import * as practice from './app/api/practice/route';import {practiceEnglish} from './content/practice.en';import {practiceQuestions} from './content/practice';import {glossary} from './content/glossary';import {glossaryEnglish} from './content/glossary.en';import {messages} from './content/messages';import {dayThemes,timeTheme,validTheme} from './lib/day-themes';export default {async fetch(r){const path=new URL(r.url).pathname;if(path==='/test-content')return Response.json({practiceEnglish,practiceQuestions,glossary,glossaryEnglish,messages,dayThemes,hours:Array.from({length:24},(_,h)=>timeTheme(new Date(2026,0,1,h,30))),legacy:validTheme('day')});const api=path==='/api/auth'?auth:path==='/api/study'?study:practice;return r.method==='POST'?api.POST(r):api.GET(r)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'guest-test'}});
try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const part of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(part.trim())await db.prepare(part.trim()).run();
 const call=(path,body,cookie='',lang='zh')=>mf.dispatchFetch('https://site.test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',origin:'https://site.test',cookie,'x-study-language':lang},...(body?{body:JSON.stringify(body)}:{})});
 const content=await (await call('/test-content')).json();
 assert.equal(content.dayThemes.length,11);assert.equal(new Set(content.dayThemes.map(t=>t.id)).size,11);assert.equal(content.legacy,'forenoon');
 assert.deepEqual(content.hours,['midnight','midnight','midnight','midnight','midnight','dawn','sunrise','morning','morning','forenoon','forenoon','forenoon','noon','noon','afternoon','afternoon','afternoon','dusk','twilight','evening','evening','night','night','night']);
 const css=await readFile('app/themes.css','utf8');for(const t of content.dayThemes)assert.ok(css.includes('[data-theme='+t.id+']'));
 assert.equal(Object.keys(content.practiceEnglish).length,48);
 for(const q of content.practiceQuestions){const en=content.practiceEnglish[q.id];assert.ok(en.prompt&&en.answer&&en.explanation,q.id);if(q.type==='choice')assert.equal(en.options.length,q.options.length);if(q.rubric.length)assert.equal(en.rubric.length,q.rubric.length)}
 for(const key of Object.keys(content.glossary))assert.ok(content.glossaryEnglish[key],key);
 // Every literal passed to the translator has a catalog entry. Uploaded document content is intentionally not translated.
 for(const file of ['app/study-client.tsx','app/practice/practice-client.tsx','app/login/page.tsx','app/components/account-menu.tsx','app/components/theme-control.tsx','app/components/keyword-text.tsx']){
  const text=await readFile(file,'utf8'),source=ts.createSourceFile(file,text,99,true,4);
  function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(source)==='t'&&ts.isStringLiteral(n.arguments[0]))assert.ok(content.messages[n.arguments[0].text],file+': '+n.arguments[0].text);ts.forEachChild(n,visit)}visit(source);
 }
 const client=await readFile('app/practice/practice-client.tsx','utf8');assert.ok(!client.includes('acc.current>=15'));assert.ok(!client.includes('每 15 秒保存'));
 let response=await call('/api/auth',{action:'guest'});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0],guest=(await response.json()).user;assert.equal(guest.is_guest,1);
 assert.equal((await call('/api/study',null,cookie)).status,200);assert.equal((await call('/api/practice',null,cookie)).status,200);
 response=await call('/api/auth',{action:'guest'},cookie);assert.equal((await response.json()).user.id,guest.id,'guest entry resumes the existing identity');
 const second=await call('/api/auth',{action:'guest'}),cookieB=second.headers.get('set-cookie').split(';')[0];assert.notEqual((await second.json()).user.id,guest.id);
 const original=JSON.parse(await readFile('content/questions.json','utf8'));await call('/api/study',{action:'rate',questionId:original.questions[0].id,rating:'good'},cookie);
 assert.equal((await (await call('/api/study',null,cookieB)).json()).progress.length,0);
 let state=await (await call('/api/practice',{action:'start',mode:'random',track:'go',minutes:30},cookie,'en')).json();let run=state.active;assert.ok(run);assert.equal(run.items[0].question.prompt,content.practiceEnglish[run.items[0].question.id].prompt);assert.equal(run.items[0].question.answer,undefined);
 // More than one old heartbeat interval must save in full with an answer.
 const row=await db.prepare('SELECT payload FROM practice_runs WHERE id=?').bind(run.id).first();const payload=JSON.parse(row.payload);payload.lastTick=Date.now()-121000;await db.prepare('UPDATE practice_runs SET payload=? WHERE id=?').bind(JSON.stringify(payload),run.id).run();
 response=await call('/api/practice',{action:'answer',id:run.id,revision:run.revision,index:0,value:'',elapsed:120},cookie,'en');assert.equal(response.status,200);state=await response.json();assert.equal(state.active.seconds,120);assert.equal(state.seconds,120);assert.ok(state.active.items[0].question.explanation);assert.equal(state.active.items[0].question.answer,content.practiceEnglish[run.items[0].question.id].answer);
 const zh=await (await call('/api/practice',null,cookie,'zh')).json();assert.equal(zh.active.id,run.id);assert.equal(zh.active.items[0].response.submitted,true);assert.equal(zh.active.items[0].question.prompt,content.practiceQuestions.find(q=>q.id===run.items[0].question.id).prompt);
 response=await call('/api/auth',{action:'register',username:'guest_promoted',password:'a-new-password-123'},cookie);assert.equal(response.status,200,await response.clone().text());const registeredCookie=response.headers.get('set-cookie').split(';')[0];assert.equal((await response.json()).user.id,guest.id,'registration keeps the same owner ID');
 const saved=await (await call('/api/study',null,registeredCookie)).json();assert.equal(saved.progress.length,1);assert.equal((await (await call('/api/practice',null,registeredCookie)).json()).active.id,run.id);
 assert.equal((await call('/api/study',null,cookie)).status,401,'guest credential is revoked on registration');
 assert.equal((await db.prepare('SELECT is_guest FROM accounts WHERE id=?').bind(guest.id).first()).is_guest,0);
 response=await call('/api/auth',{action:'login',username:'guest_promoted',password:'a-new-password-123'});assert.equal(response.status,200);
 assert.equal((await (await call('/api/practice',null,cookieB)).json()).active,null);
 console.log('PASS: optional guest entry, distinct anonymous identities, upgrade without data loss, session rotation, 120-second answer-triggered save, English/Chinese session content, complete UI and glossary catalogs, all 11 time slots and legacy theme compatibility.');
}finally{await mf.dispose()}
