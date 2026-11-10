import {studyDb} from '@/db/study';
import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {SYNC_LIMITS,syncedKey,type SyncItem} from '@/lib/sync-types';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const fail=(e:unknown)=>{if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers});console.error('Store operation failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'同步暂时不可用。'},{status:503,headers})};
async function user(req:Request){const u=await sessionUser(req.headers);if(!u)throw new AuthError('请先登录。',401);return u}

// GET /api/store：取回当前账号存在服务器上的全部学习进度。
export async function GET(req:Request){try{const u=await sessionUser(req.headers);if(!u)return Response.json({user:null,items:[]},{headers});
 const rows=await studyDb().prepare('SELECT key,value,updated_at FROM user_store WHERE user_id=?').bind(u.id).all<{key:string;value:string;updated_at:number}>();
 return Response.json({user:{id:u.id,is_guest:u.is_guest,username:u.username},items:rows.results.map(r=>({key:r.key,value:r.value,updatedAt:r.updated_at}))},{headers})}catch(e){return fail(e)}}

// POST /api/store {items:[{key,value,updatedAt}]}：写入；服务器上已有更新的版本时保留服务器的（以 updatedAt 为准）。value 为空字符串表示已删除。
export async function POST(req:Request){try{assertSameOrigin(req);const u=await user(req);const text=await req.text();if(text.length>SYNC_LIMITS.body)throw new AuthError('内容过长。',413);
 let p:{items?:unknown};try{p=JSON.parse(text)}catch{throw new AuthError('请求格式无效。')}
 const items=Array.isArray(p?.items)?p.items as SyncItem[]:null;if(!items||items.length>SYNC_LIMITS.batch)throw new AuthError('请求格式无效。');
 for(const it of items)if(!it||typeof it.key!=='string'||!syncedKey(it.key)||typeof it.value!=='string'||it.value.length>SYNC_LIMITS.value||!Number.isSafeInteger(it.updatedAt)||it.updatedAt<0||it.updatedAt>Date.now()+86400000)throw new AuthError('同步数据无效。');
 const db=studyDb();
 const count=await db.prepare('SELECT count(*) n FROM user_store WHERE user_id=?').bind(u.id).first<{n:number}>();if((count?.n??0)+items.length>SYNC_LIMITS.keys+SYNC_LIMITS.batch)throw new AuthError('同步数据太多。',413);
 if(items.length)await db.batch(items.map(it=>db.prepare('INSERT INTO user_store(user_id,key,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=user_store.updated_at').bind(u.id,it.key,it.value,it.updatedAt)));
 return Response.json({ok:true},{headers})}catch(e){return fail(e)}}
