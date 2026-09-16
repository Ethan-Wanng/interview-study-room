import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),local=createRequire(require.resolve('wrangler/package.json'));
const {unstable_splitSqlQuery}=require('wrangler'),{Miniflare}=local('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'migration-portability'},compatibilityDate:'2026-05-15'});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await readFile('drizzle/'+file,'utf8');
  if(sql.includes('CREATE TRIGGER')){
   assert.ok(!sql.includes('\r'),'Trigger migrations must use LF');
   assert.ok(!/\bSELECT CASE\b/.test(sql),'Parenthesize CASE expressions for the remote D1 parser');
  }
  for(const statement of unstable_splitSqlQuery(sql))await db.prepare(statement).run();
 }
 assert.equal((await db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='trigger'").first()).n,10);
 console.log('PASS: all migration files execute through the Wrangler SQL splitter, ten triggers present, LF and parenthesized CASE guards.');
}finally{await mf.dispose()}
