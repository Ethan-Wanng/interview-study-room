import {randomUUID} from 'node:crypto';
import {studyDb} from '@/db/study';
import {sessionUser,createSession,clearCookie,tokenFrom,hashToken,assertSameOrigin,rateLimit,AuthError,passwordHash,passwordMatches} from '@/lib/site-auth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
// Accounts come from GitHub / Google (see ./oauth/[provider]) or from email + password (no verification mail is sent);
// this route handles email sign-up / sign-in, guests, logout and the current session.
type EmailBody={action:'email-register'|'email-login';email?:unknown;password?:unknown};
// 邮箱账号的 username 存成 “email:小写邮箱”，和 GitHub/Google 账号（“github:…”）、旧用户名不会撞车；昵称取 @ 前面的部分。
async function emailAuth(req:Request,p:EmailBody){
 const email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError('请输入有效的邮箱地址。');
 if(typeof p.password!=='string'||p.password.length<8||p.password.length>128)throw new AuthError('密码需为 8–128 个字符。');
 const ip=req.headers.get('cf-connecting-ip')??'unknown';await rateLimit('ip:'+ip,40);await rateLimit('email:'+email,12);
 const db=studyDb(),username='email:'+email,name=email.split('@')[0].slice(0,40);
 const account=await db.prepare('SELECT id,password_hash FROM accounts WHERE username=?').bind(username).first<{id:string;password_hash:string}>();
 if(p.action==='email-login'){
  if(!account||!await passwordMatches(p.password,account.password_hash))throw new AuthError('邮箱或密码不正确。',401);
  return Response.json({user:{id:account.id,username:name}},{headers:{...headers,'Set-Cookie':await createSession(account.id)}});
 }
 if(account)throw new AuthError('这个邮箱已经注册过了，请直接登录。',409);
 const hash=await passwordHash(p.password),visitor=await sessionUser(req.headers);
 // 游客注册：把游客账号直接升级成邮箱账号，保留已有的学习进度。
 if(visitor?.is_guest){
  const changed=await db.prepare('UPDATE accounts SET username=?,password_hash=?,display_name=?,is_guest=0 WHERE id=? AND is_guest=1 RETURNING id').bind(username,hash,name,visitor.id).first();
  if(!changed)throw new AuthError('账号状态已变化，请刷新后重试。',409);
  await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(visitor.id).run();
  return Response.json({user:{id:visitor.id,username:name}},{headers:{...headers,'Set-Cookie':await createSession(visitor.id)}});
 }
 // 已用 GitHub/Google 登录的人注册邮箱：给当前账号加上邮箱密码登录（同一个账号，换域名或换设备时用邮箱登录就能看到原来的进度）。
 if(visitor){
  const me=await db.prepare('SELECT username FROM accounts WHERE id=?').bind(visitor.id).first<{username:string}>();
  if(me?.username.startsWith('email:'))throw new AuthError('当前账号已经设置过邮箱登录了。',409);
  await db.prepare('UPDATE accounts SET username=?,password_hash=? WHERE id=?').bind(username,hash,visitor.id).run();
  return Response.json({user:{id:visitor.id,username:visitor.username},linked:true},{headers});
 }
 const id=randomUUID();
 try{await db.prepare('INSERT INTO accounts(id,username,password_hash,created_at,is_guest,display_name) VALUES(?,?,?,?,0,?)').bind(id,username,hash,Date.now(),name).run()}
 catch{throw new AuthError('这个邮箱已经注册过了，请直接登录。',409)}
 return Response.json({user:{id,username:name}},{headers:{...headers,'Set-Cookie':await createSession(id)}});
}
export async function GET(req:Request){try{return Response.json({user:await sessionUser(req.headers)},{headers})}catch{return Response.json({error:'账号服务暂时不可用，请稍后重试。'},{status:503,headers})}}
export async function POST(req:Request){try{assertSameOrigin(req);const text=await req.text();if(text.length>4096)throw new AuthError('输入内容过长。');let p:{action?:unknown}|null;try{p=JSON.parse(text)}catch{throw new AuthError('请求格式无效。')}if(!p||typeof p!=='object')throw new AuthError('请求格式无效。');const db=studyDb();if(p.action==='logout'){const token=tokenFrom(req.headers);if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(hashToken(token)).run();return Response.json({ok:true},{headers:{...headers,'Set-Cookie':clearCookie()}})}
if(p.action==='email-register'||p.action==='email-login')return await emailAuth(req,p as EmailBody);
if(p.action!=='guest')throw new AuthError('操作无效。');
const ip=req.headers.get('cf-connecting-ip')??'unknown';await rateLimit('ip:'+ip,40);
const existing=await sessionUser(req.headers);if(existing)return Response.json({user:existing},{headers});const id=randomUUID();await db.prepare('INSERT INTO accounts(id,username,password_hash,created_at,is_guest) VALUES(?,?,?,?,1)').bind(id,'guest_'+id.replaceAll('-',''),'guest-disabled',Date.now()).run();return Response.json({user:{id,is_guest:1}},{headers:{...headers,'Set-Cookie':await createSession(id)}})
}catch(e){if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers});console.error('Account operation failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'暂时无法完成操作，请稍后重试。'},{status:503,headers})}}
