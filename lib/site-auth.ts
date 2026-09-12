import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {studyDb} from '@/db/study';
export const SESSION_COOKIE='__Host-study-session';
const AGE=60*60*24*30;
export class AuthError extends Error{constructor(message:string,public status=400){super(message)}}
export function hashToken(token:string){return createHash('sha256').update(token).digest('hex')}
function derive(password:string,salt:string){return new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(error,key)=>error?reject(error):resolve(key)))}
export async function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return `scrypt-16384-8-5$${salt}$${(await derive(password,salt)).toString('hex')}`}
export async function passwordMatches(password:string,stored:string){const [scheme,salt,hash]=stored.split('$');if(scheme!=='scrypt-16384-8-5'||!salt||!/^[a-f0-9]{64}$/.test(hash??''))return false;return timingSafeEqual(await derive(password,salt),Buffer.from(hash,'hex'))}
export function tokenFrom(headers:Headers){const value=headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);return value&&/^[a-f0-9]{64}$/.test(value)?value:null}
export async function sessionUser(headers:Headers){const token=tokenFrom(headers);if(!token)return null;return studyDb().prepare('SELECT accounts.id,accounts.username,accounts.is_guest FROM sessions JOIN accounts ON accounts.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').bind(hashToken(token),Date.now()).first<{id:string;username:string;is_guest:number}>()}
export async function createSession(id:string){const token=randomBytes(32).toString('hex');const db=studyDb();await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(Date.now()),db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(hashToken(token),id,Date.now()+AGE*1000)]);return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AGE}`}
export function clearCookie(){return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
export function assertSameOrigin(req:Request){const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(req.url).origin))throw new AuthError('请求来源无效，请从本站重试。',403);if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('请求格式无效。',415)}
export async function rateLimit(key:string,limit:number){const now=Date.now();const row=await studyDb().prepare('INSERT INTO auth_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count').bind(hashToken(key),now+15*60*1000,now,now).first<{count:number}>();if(!row||row.count>limit)throw new AuthError('尝试次数过多，请 15 分钟后再试。',429)}
