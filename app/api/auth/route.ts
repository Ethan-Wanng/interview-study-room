import {randomUUID} from 'node:crypto';
import {studyDb} from '@/db/study';
import {sessionUser,createSession,clearCookie,tokenFrom,hashToken,assertSameOrigin,rateLimit,AuthError} from '@/lib/site-auth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
// Accounts come from GitHub / Google (see ./oauth/[provider]); this route only handles guests, logout and the current session.
export async function GET(req:Request){try{return Response.json({user:await sessionUser(req.headers)},{headers})}catch{return Response.json({error:'账号服务暂时不可用，请稍后重试。'},{status:503,headers})}}
export async function POST(req:Request){try{assertSameOrigin(req);const text=await req.text();if(text.length>4096)throw new AuthError('输入内容过长。');let p:{action?:unknown}|null;try{p=JSON.parse(text)}catch{throw new AuthError('请求格式无效。')}if(!p||typeof p!=='object')throw new AuthError('请求格式无效。');const db=studyDb();if(p.action==='logout'){const token=tokenFrom(req.headers);if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(hashToken(token)).run();return Response.json({ok:true},{headers:{...headers,'Set-Cookie':clearCookie()}})}
if(p.action!=='guest')throw new AuthError('请使用 GitHub 或 Google 登录。');
const ip=req.headers.get('cf-connecting-ip')??'unknown';await rateLimit('ip:'+ip,40);
const existing=await sessionUser(req.headers);if(existing)return Response.json({user:existing},{headers});const id=randomUUID();await db.prepare('INSERT INTO accounts(id,username,password_hash,created_at,is_guest) VALUES(?,?,?,?,1)').bind(id,'guest_'+id.replaceAll('-',''),'guest-disabled',Date.now()).run();return Response.json({user:{id,is_guest:1}},{headers:{...headers,'Set-Cookie':await createSession(id)}})
}catch(e){if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers});console.error('Account operation failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'暂时无法完成操作，请稍后重试。'},{status:503,headers})}}
