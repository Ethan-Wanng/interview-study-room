import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const {build}=wranglerRequire('esbuild');
const output=await build({stdin:{contents:`import * as auth from './app/api/auth/route';import * as oauth from './app/api/auth/oauth/[provider]/route';import * as study from './app/api/study/route';export default {async fetch(request){const path=new URL(request.url).pathname;if(path.startsWith('/api/auth/oauth/'))return oauth.GET(request);const api=path==='/api/auth'?auth:study;return request.method==='POST'?api.POST(request):api.GET(request)}}`,resolveDir:process.cwd(),sourcefile:'test-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers','node:*'],tsconfig:'tsconfig.json'});
// Stand-ins for GitHub and Google: only code=good-code with the right client secret yields a token.
let githubUser={id:1001,login:'octo',name:'Octo Cat',email:null};
const googleUser={sub:'g-77',name:'Gina',email:'gina@example.com',email_verified:true};
async function outbound(request){const url=new URL(request.url);
 if(url.href==='https://github.com/login/oauth/access_token'||url.href==='https://oauth2.googleapis.com/token'){const body=new URLSearchParams(await request.text()),secret=url.host==='github.com'?'gh-secret':'g-secret';return Response.json(body.get('code')==='good-code'&&body.get('client_secret')===secret?{access_token:'token-'+url.host}:{error:'bad_verification_code'})}
 if(url.href==='https://api.github.com/user')return request.headers.get('authorization')==='Bearer token-github.com'?Response.json(githubUser):new Response('no',{status:401});
 if(url.href==='https://openidconnect.googleapis.com/v1/userinfo')return request.headers.get('authorization')==='Bearer token-oauth2.googleapis.com'?Response.json(googleUser):new Response('no',{status:401});
 return new Response('unexpected outbound request '+url.href,{status:599})}
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'study-test'},bindings:{GITHUB_CLIENT_ID:'gh-id',GITHUB_CLIENT_SECRET:'gh-secret',GOOGLE_CLIENT_ID:'g-id',GOOGLE_CLIENT_SECRET:'g-secret'},outboundService:outbound});
try{
 const db=await mf.getD1Database('DB');const run=async file=>{for(const part of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(part.trim())await db.prepare(part.trim()).run()};
 const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();for(const file of files.filter(f=>f<'0012'))await run(file);
 // The OAuth migration drops username-password accounts with their records and keeps guests.
 await db.prepare("INSERT INTO accounts(id,username,password_hash,created_at,is_guest) VALUES('legacy','old_user','scrypt-x',0,0),('old-guest','guest_old','guest-disabled',0,1)").run();
 await db.prepare("INSERT INTO progress(user_id,question_id,stage,due,last_day,first_day,rating) VALUES('legacy','q',0,'2026-01-01','2026-01-01','2026-01-01','good'),('old-guest','q',0,'2026-01-01','2026-01-01','2026-01-01','good')").run();
 for(const file of files.filter(f=>f>='0012'))await run(file);
 assert.deepEqual((await db.prepare('SELECT id FROM accounts ORDER BY id').all()).results.map(r=>r.id),['old-guest']);assert.deepEqual((await db.prepare('SELECT user_id FROM progress').all()).results.map(r=>r.user_id),['old-guest']);
 const bank=JSON.parse(await readFile('content/questions.json','utf8'));
 const call=(path,body,cookie='',extra={})=>mf.dispatchFetch('https://site.test'+path,{method:body?'POST':'GET',redirect:'manual',headers:{'content-type':'application/json',origin:'https://site.test',cookie,...extra},...(body?{body:JSON.stringify(body)}:{})});
 const cookieNamed=(r,name)=>r.headers.getSetCookie().find(c=>c.startsWith(name+'='))?.split(';')[0];
 const location=r=>{assert.equal(r.status,302);return new URL(r.headers.get('location'))};
 async function signIn(provider,cookie='',returnTo='/ai',code='good-code'){const start=await call(`/api/auth/oauth/${provider}?return_to=${encodeURIComponent(returnTo)}`,null,cookie),to=location(start),state=to.searchParams.get('state'),flow=cookieNamed(start,'__Host-study-oauth');assert.ok(state&&flow);
  const back=await call(`/api/auth/oauth/${provider}?code=${code}&state=${state}`,null,[cookie,flow].filter(Boolean).join('; '));return {to:location(back),session:cookieNamed(back,'__Host-study-session'),start:to}}
 assert.equal((await call('/api/study')).status,401);
 const legacy=await call('/api/auth',{action:'register',username:'learner_a',password:'valid-password-123'});assert.equal(legacy.status,400);assert.match((await legacy.json()).error,/GitHub 或 Google/);
 assert.equal(location(await call('/api/auth/oauth/apple')).search,'?error=unavailable');
 // Outgoing redirect carries the configured client id, exact callback URL and a short-lived HttpOnly state cookie.
 const start=await call('/api/auth/oauth/github?return_to=/ai');const to=location(start);assert.equal(to.origin+to.pathname,'https://github.com/login/oauth/authorize');assert.equal(to.searchParams.get('client_id'),'gh-id');assert.equal(to.searchParams.get('redirect_uri'),'https://site.test/api/auth/oauth/github');
 const flowCookie=start.headers.getSetCookie().find(c=>c.startsWith('__Host-study-oauth='));assert.match(flowCookie,/HttpOnly/);assert.match(flowCookie,/Secure/);assert.match(flowCookie,/Max-Age=600/);
 const google=location(await call('/api/auth/oauth/google'));assert.equal(google.host,'accounts.google.com');assert.equal(google.searchParams.get('scope'),'openid email profile');
 assert.equal(location(await call('/api/auth/oauth/github?code=good-code&state=forged',null,flowCookie.split(';')[0])).search,'?error=expired');
 assert.equal(location(await call('/api/auth/oauth/github?code=good-code&state='+to.searchParams.get('state'))).search,'?error=expired','state without its cookie is rejected');
 assert.equal(location(await call('/api/auth/oauth/github?error=access_denied')).search,'?error=cancelled');
 assert.equal((await signIn('github','','/ai','bad-code')).to.search,'?error=failed');
 // A guest who signs in for the first time keeps the same account and progress; the guest cookie is retired.
 const guestResponse=await call('/api/auth',{action:'guest'});const guestCookie=cookieNamed(guestResponse,'__Host-study-session'),guest=(await guestResponse.json()).user;
 const rate={action:'rate',questionId:bank.questions[0].id,rating:'good'};assert.equal((await call('/api/study',rate,guestCookie)).status,200);
 let login=await signIn('github',guestCookie);assert.equal(login.to.href,'https://site.test/ai');let cookie=login.session;assert.ok(cookie);
 let me=(await (await call('/api/auth',null,cookie)).json()).user;assert.equal(me.id,guest.id);assert.equal(me.username,'Octo Cat');assert.equal(me.is_guest,0);
 assert.equal((await (await call('/api/study',null,cookie)).json()).progress.length,1);assert.equal((await call('/api/study',null,guestCookie)).status,401);
 // Study state persists per account exactly as before.
 let response=await call('/api/study',{action:'goals',newGoal:6,reviewGoal:12},cookie);assert.equal(response.status,200);assert.equal((await response.json()).preferences.new_goal,6);
 let state=await (await call('/api/study',{...rate,rating:'again'},cookie)).json();assert.equal(state.progress[0].rating,'again');assert.equal(state.progress[0].stage,0);
 assert.equal((await call('/api/study',{...rate,questionId:'unknown'},cookie)).status,400);
 // Signing in again from another device reaches the same account and refreshes the display name.
 githubUser={...githubUser,name:'Octo Renamed'};login=await signIn('github','','//evil.test/');assert.equal(login.to.href,'https://site.test/','open redirects fall back to the homepage');
 me=(await (await call('/api/auth',null,login.session)).json()).user;assert.equal(me.id,guest.id);assert.equal(me.username,'Octo Renamed');state=await (await call('/api/study',null,login.session)).json();assert.equal(state.preferences.new_goal,6);assert.equal(state.progress[0].rating,'again');
 // A different provider identity is a separate, isolated account.
 const gina=await signIn('google');me=(await (await call('/api/auth',null,gina.session)).json()).user;assert.notEqual(me.id,guest.id);assert.equal(me.username,'Gina');assert.equal((await (await call('/api/study',null,gina.session)).json()).progress.length,0);
 assert.equal((await db.prepare("SELECT email FROM oauth_identities WHERE provider='google'").first()).email,'gina@example.com');
 assert.equal((await db.prepare('SELECT count(*) n FROM oauth_identities').first()).n,2);
 await call('/api/auth',{action:'logout'},cookie);assert.equal((await call('/api/study',null,cookie)).status,401);assert.equal((await call('/api/study',null,login.session)).status,200,'logout ends only that session');
 console.log('PASS: legacy password accounts removed, GitHub/Google redirect and callback, state and cancellation checks, open-redirect guard, guest upgrade without data loss, repeat sign-in, account isolation, saved goals and ratings, logout.');
}finally{await mf.dispose()}
