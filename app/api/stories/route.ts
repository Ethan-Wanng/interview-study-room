import {randomUUID} from 'node:crypto';
import {studyDb} from '@/db/study';
import {assertSameOrigin,AuthError,hashToken,rateLimit,sessionUser} from '@/lib/site-auth';
import {currentAdmin} from '@/lib/admin-auth';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

export type StoryCategory='offer'|'interview'|'journey'|'project'|'daily'|'other';
const CATEGORIES:StoryCategory[]=['offer','interview','journey','project','daily','other'];

export type StoryItem={
 id:string;
 userId:string;
 author:string;
 roleTag:string;
 category:StoryCategory;
 quote:string;
 title:string;
 content:string;
 likes:number;
 featured:boolean;
 createdAt:number;
 updatedAt:number;
 liked?:boolean;
};

async function ensureTables(){
 const db=studyDb();
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS stories (
   id TEXT PRIMARY KEY NOT NULL,
   user_id TEXT NOT NULL DEFAULT '',
   owner_hash TEXT NOT NULL DEFAULT '',
   author TEXT NOT NULL DEFAULT '匿名学友',
   role_tag TEXT NOT NULL DEFAULT '',
   category TEXT NOT NULL DEFAULT 'journey',
   quote TEXT NOT NULL DEFAULT '',
   title TEXT NOT NULL,
   content TEXT NOT NULL,
   likes INTEGER NOT NULL DEFAULT 0,
   featured INTEGER NOT NULL DEFAULT 0,
   created_at INTEGER NOT NULL,
   updated_at INTEGER NOT NULL
  )`),
  db.prepare(`CREATE TABLE IF NOT EXISTS story_likes (
   story_id TEXT NOT NULL,
   voter_key TEXT NOT NULL,
   created_at INTEGER NOT NULL,
   PRIMARY KEY(story_id, voter_key)
  )`),
 ]);
 return db;
}

function rowToStory(r:Record<string,unknown>,likedIds?:Set<string>):StoryItem{
 const id=String(r.id??'');
 const cat=String(r.category??'journey');
 return {
  id,
  userId:String(r.user_id??''),
  author:String(r.author??'匿名学友'),
  roleTag:String(r.role_tag??''),
  category:(CATEGORIES.includes(cat as StoryCategory)?cat:'other') as StoryCategory,
  quote:String(r.quote??''),
  title:String(r.title??''),
  content:String(r.content??''),
  likes:Number(r.likes??0),
  featured:Boolean(Number(r.featured??0)),
  createdAt:Number(r.created_at??Date.now()),
  updatedAt:Number(r.updated_at??Date.now()),
  ...(likedIds?{liked:likedIds.has(id)}:{}),
 };
}

function cleanText(v:unknown,max:number,label?:string){
 const s=typeof v==='string'?v.trim():'';
 if(label&&!s)throw new AuthError(`请填写${label}。`,400);
 if(s.length>max)throw new AuthError(`${label??'内容'}不能超过 ${max} 个字符。`,400);
 return s;
}

function resolveVoterKey(req:Request,userId?:string,clientId?:unknown){
 if(userId)return 'u:'+userId;
 const cid=typeof clientId==='string'&&/^[A-Za-z0-9_-]{8,64}$/.test(clientId.trim())?clientId.trim():'';
 if(cid)return 'c:'+hashToken(cid);
 const ip=req.headers.get('cf-connecting-ip')||'anon';
 const ua=req.headers.get('user-agent')||'';
 return 'ip:'+hashToken(ip+'|'+ua.slice(0,120));
}

export async function GET(req:Request){
 try{
  const url=new URL(req.url);
  const clientId=url.searchParams.get('voter')??'';
  const [user,admin]=await Promise.all([
   sessionUser(req.headers).catch(()=>null),
   currentAdmin(req.headers).catch(()=>null),
  ]);
  const voterKey=resolveVoterKey(req,user?.id,clientId);
  try{
   const db=await ensureTables();
   const [rows,likedRows]=await Promise.all([
    db.prepare('SELECT id,user_id,author,role_tag,category,quote,title,content,likes,featured,created_at,updated_at FROM stories ORDER BY featured DESC, created_at DESC LIMIT 120')
     .all<Record<string,unknown>>(),
    db.prepare('SELECT story_id FROM story_likes WHERE voter_key=?')
     .bind(voterKey)
     .all<{story_id:string}>(),
   ]);
   const likedIds=new Set((likedRows.results??[]).map(x=>x.story_id));
   const items=(rows.results??[]).map(r=>rowToStory(r,likedIds));
   return Response.json({items,isAdmin:!!admin,userId:user?.id??''},{headers:noCache});
  }catch{
   return Response.json({items:[],isAdmin:!!admin,userId:user?.id??''},{headers:noCache});
  }
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  const msg=e instanceof AuthError?e.message:'加载故事列表失败，请稍后重试。';
  return Response.json({error:msg},{status,headers:noCache});
 }
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>40_000)throw new AuthError('提交内容过长，请精简后再试。',413);
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}
  if(!body||typeof body!=='object')throw new AuthError('请求格式无效。',400);

  const [user,admin]=await Promise.all([
   sessionUser(req.headers).catch(()=>null),
   currentAdmin(req.headers).catch(()=>null),
  ]);
  const action=String(body.action??'create');
  const now=Date.now();
  const db=await ensureTables();

  if(action==='create'){
   try{
    await rateLimit('story-create:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),20);
   }catch(e){
    if(e instanceof AuthError)throw e;
   }
   const catRaw=String(body.category??'journey');
   const category=(CATEGORIES.includes(catRaw as StoryCategory)?catRaw:'journey') as StoryCategory;
   const title=cleanText(body.title,120,'故事标题');
   const content=cleanText(body.content,3000,'故事正文');
   const quote=cleanText(body.quote??'',160);
   const roleTag=cleanText(body.roleTag??'',48);
   const anonymous=Boolean(body.anonymous);
   if(title.length<2)throw new AuthError('故事标题至少需要 2 个字。',400);
   if(content.length<10)throw new AuthError('故事正文至少写 10 个字，分享更完整的一段经历吧。',400);

   const customAuthor=cleanText(body.author??'',32);
   const author=anonymous
    ?'匿名学友'
    :(customAuthor||(user&&!user.is_guest?user.username:'热心学友'));

   const editToken=randomUUID();
   const ownerHash=hashToken(editToken);
   const item:StoryItem={
    id:'st-'+randomUUID(),
    userId:user?.id??'',
    author,
    roleTag,
    category,
    quote,
    title,
    content,
    likes:0,
    featured:false,
    createdAt:now,
    updatedAt:now,
    liked:false,
   };
   await db.prepare('INSERT INTO stories(id,user_id,owner_hash,author,role_tag,category,quote,title,content,likes,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,0,?,?)')
    .bind(item.id,item.userId,ownerHash,item.author,item.roleTag,item.category,item.quote,item.title,item.content,item.createdAt,item.updatedAt)
    .run();
   return Response.json({ok:true,item,editToken},{headers:noCache});
  }

  if(action==='update'){
   const id=cleanText(body.id,100,'故事编号');
   const existing=await db.prepare('SELECT user_id,owner_hash FROM stories WHERE id=?')
    .bind(id)
    .first<{user_id:string;owner_hash:string}>();
   if(!existing)throw new AuthError('找不到该篇故事。',404);
   const editToken=typeof body.editToken==='string'?body.editToken.trim():'';
   const isOwner=Boolean((user?.id&&existing.user_id===user.id)||(editToken&&existing.owner_hash===hashToken(editToken)));
   if(!admin&&!isOwner)throw new AuthError('只有作者本人或管理员可以修改故事。',403);

   const catRaw=String(body.category??'journey');
   const category=(CATEGORIES.includes(catRaw as StoryCategory)?catRaw:'journey') as StoryCategory;
   const title=cleanText(body.title,120,'故事标题');
   const content=cleanText(body.content,3000,'故事正文');
   const quote=cleanText(body.quote??'',160);
   const roleTag=cleanText(body.roleTag??'',48);
   const anonymous=Boolean(body.anonymous);
   if(title.length<2)throw new AuthError('故事标题至少需要 2 个字。',400);
   if(content.length<10)throw new AuthError('故事正文至少需要 10 个字。',400);
   const customAuthor=cleanText(body.author??'',32);
   const author=anonymous?'匿名学友':(customAuthor||(user&&!user.is_guest?user.username:'热心学友'));

   await db.prepare('UPDATE stories SET author=?,role_tag=?,category=?,quote=?,title=?,content=?,updated_at=? WHERE id=?')
    .bind(author,roleTag,category,quote,title,content,now,id)
    .run();
   const updated=await db.prepare('SELECT id,user_id,author,role_tag,category,quote,title,content,likes,featured,created_at,updated_at FROM stories WHERE id=?')
    .bind(id)
    .first<Record<string,unknown>>();
   return Response.json({ok:true,item:updated?rowToStory(updated):null},{headers:noCache});
  }

  if(action==='delete'){
   const id=cleanText(body.id,100,'故事编号');
   const existing=await db.prepare('SELECT user_id,owner_hash FROM stories WHERE id=?')
    .bind(id)
    .first<{user_id:string;owner_hash:string}>();
   if(!existing)throw new AuthError('找不到该篇故事。',404);
   const editToken=typeof body.editToken==='string'?body.editToken.trim():'';
   const isOwner=Boolean((user?.id&&existing.user_id===user.id)||(editToken&&existing.owner_hash===hashToken(editToken)));
   if(!admin&&!isOwner)throw new AuthError('没有删除这篇故事的权限。',403);
   await db.batch([
    db.prepare('DELETE FROM story_likes WHERE story_id=?').bind(id),
    db.prepare('DELETE FROM stories WHERE id=?').bind(id),
   ]);
   return Response.json({ok:true},{headers:noCache});
  }

  if(action==='toggleLike'){
   try{
    await rateLimit('story-like:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),120);
   }catch(e){
    if(e instanceof AuthError)throw e;
   }
   const id=cleanText(body.id,100,'故事编号');
   const exists=await db.prepare('SELECT id FROM stories WHERE id=?').bind(id).first();
   if(!exists)throw new AuthError('找不到该篇故事。',404);
   const voterKey=resolveVoterKey(req,user?.id,body.voter);
   const already=await db.prepare('SELECT 1 FROM story_likes WHERE story_id=? AND voter_key=?').bind(id,voterKey).first();
   let liked=false;
   if(already){
    await db.prepare('DELETE FROM story_likes WHERE story_id=? AND voter_key=?').bind(id,voterKey).run();
    liked=false;
   }else{
    await db.prepare('INSERT OR IGNORE INTO story_likes(story_id,voter_key,created_at) VALUES(?,?,?)').bind(id,voterKey,now).run();
    liked=true;
   }
   const row=await db.prepare('UPDATE stories SET likes=(SELECT COUNT(*) FROM story_likes WHERE story_id=?) WHERE id=? RETURNING likes')
    .bind(id,id)
    .first<{likes:number}>();
   return Response.json({ok:true,liked,likes:Number(row?.likes??0)},{headers:noCache});
  }

  if(action==='toggleFeature'){
   if(!admin)throw new AuthError('只有管理员可以设置精选故事。',403);
   const id=cleanText(body.id,100,'故事编号');
   const row=await db.prepare('UPDATE stories SET featured=CASE WHEN featured=1 THEN 0 ELSE 1 END WHERE id=? RETURNING featured')
    .bind(id)
    .first<{featured:number}>();
   if(!row)throw new AuthError('找不到该篇故事。',404);
   return Response.json({ok:true,featured:Boolean(row.featured)},{headers:noCache});
  }

  throw new AuthError('不支持的操作。',400);
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  const msg=e instanceof AuthError?e.message:'操作失败，请稍后重试。';
  return Response.json({error:msg},{status,headers:noCache});
 }
}
