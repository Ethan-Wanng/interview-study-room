import {randomBytes} from 'node:crypto';
import {studyDb} from '@/db/study';
import {assertSameOrigin,AuthError,rateLimit,sessionUser} from '@/lib/site-auth';
import type {PlaygroundLang} from '@/lib/playground-bridge';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const MAX_CODE=50_000;

export type SharedSnippet={
 id:string;
 lang:PlaygroundLang;
 code:string;
 title:string;
 createdAt:number;
};

async function ensureTable(){
 const db=studyDb();
 await db.prepare(`CREATE TABLE IF NOT EXISTS playground_snippets (
  id TEXT PRIMARY KEY NOT NULL,
  lang TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
 )`).run();
 return db;
}

export async function GET(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id')?.trim()??'';
  if(!id||!/^[A-Za-z0-9_-]{4,24}$/.test(id)){
   return Response.json({error:'无效的分享编号。'},{status:400,headers:noCache});
  }
  const db=await ensureTable();
  const row=await db.prepare('SELECT id,lang,code,title,created_at FROM playground_snippets WHERE id=?')
   .bind(id)
   .first<{id:string;lang:string;code:string;title:string;created_at:number}>();
  if(!row)return Response.json({error:'找不到这段分享的代码，可能已过期或编号有误。'},{status:404,headers:noCache});
  const lang=(['go','python','java','ts','rust','sql'].includes(row.lang)?row.lang:'go') as PlaygroundLang;
  const snippet:SharedSnippet={
   id:row.id,
   lang,
   code:row.code,
   title:row.title,
   createdAt:Number(row.created_at),
  };
  return Response.json({snippet},{headers:noCache});
 }catch{
  return Response.json({error:'读取分享代码失败。'},{status:500,headers:noCache});
 }
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>MAX_CODE+2000)throw new AuthError('分享的代码过长。',413);
  let body:{lang?:unknown;code?:unknown;title?:unknown};
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}

  const lang=String(body?.lang??'') as PlaygroundLang;
  const code=typeof body?.code==='string'?body.code:'';
  const title=typeof body?.title==='string'?body.title.trim().slice(0,120):'';
  if(!['go','python','java','rust','ts','sql'].includes(lang))throw new AuthError('不支持的语言类型。',400);
  if(!code.trim())throw new AuthError('请先写点代码再分享。',400);
  if(code.length>MAX_CODE)throw new AuthError(`代码不能超过 ${MAX_CODE} 个字符。`,400);

  const user=await sessionUser(req.headers).catch(()=>null);
  try{
   await rateLimit('pg-share:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),40);
  }catch(e){
   if(e instanceof AuthError)throw e;
  }

  const db=await ensureTable();
  // 如果刚刚有人分享过完全相同的代码，直接复用最近的短链，避免重复占表
  const dup=await db.prepare('SELECT id FROM playground_snippets WHERE lang=? AND code=? ORDER BY created_at DESC LIMIT 1')
   .bind(lang,code)
   .first<{id:string}>();
  if(dup?.id){
   return Response.json({id:dup.id,url:`/playground?s=${dup.id}`},{headers:noCache});
  }

  const id=randomBytes(5).toString('base64url');
  const now=Date.now();
  await db.prepare('INSERT INTO playground_snippets(id,lang,code,title,user_id,created_at) VALUES(?,?,?,?,?,?)')
   .bind(id,lang,code,title,user?.id??'',now)
   .run();
  return Response.json({id,url:`/playground?s=${id}`},{headers:noCache});
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  const msg=e instanceof AuthError?e.message:'生成分享链接失败，请稍后重试。';
  return Response.json({error:msg},{status,headers:noCache});
 }
}
