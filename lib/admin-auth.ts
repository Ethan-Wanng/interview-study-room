import {env} from 'cloudflare:workers';
import {randomBytes} from 'node:crypto';
import {studyDb} from '@/db/study';
import {hashToken,AuthError,sessionUser} from './site-auth';
export type Administrator={id:string;name:string;role:'owner'|'editor';subjects:string[];enabled:number;createdBy:string|null};
export const ADMIN_COOKIE='__Host-study-admin';
export const newKey=(prefix='adm')=>prefix+'_'+randomBytes(32).toString('hex');
export function adminToken(headers:Headers){const token=headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(ADMIN_COOKIE+'='))?.slice(ADMIN_COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null}
type AdminRow={id:string;name:string;role:'owner'|'editor';subjects:string;enabled:number;created_by:string|null};
// 先认后台密钥换来的会话；没有的话，看当前登录的网站账号是不是绑定了管理员（绑定后不用填密钥）。
export async function currentAdmin(headers:Headers):Promise<Administrator|null>{const token=adminToken(headers),db=studyDb();
 let row=token?await db.prepare('SELECT a.id,a.name,a.role,a.subjects,a.enabled,a.created_by FROM administrators a JOIN admin_sessions s ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1').bind(hashToken(token),Date.now()).first<AdminRow>():null;
 if(!row){const user=await sessionUser(headers);if(user&&!user.is_guest)row=await db.prepare('SELECT id,name,role,subjects,enabled,created_by FROM administrators WHERE account_id=? AND enabled=1').bind(user.id).first<AdminRow>()}
 return row?{...row,subjects:JSON.parse(row.subjects),createdBy:row.created_by}:null}
export async function requireAdmin(headers:Headers){const a=await currentAdmin(headers);if(!a)throw new AuthError('请使用管理密钥进入后台。',401);return a}
export function canEdit(a:Administrator,subject:string){return a.role==='owner'||a.subjects.includes(subject)}
export function requireScope(a:Administrator,subject:string){if(!canEdit(a,subject))throw new AuthError('你没有管理该学科的权限。',403)}
export async function adminCookie(id:string){const token=randomBytes(32).toString('hex');await studyDb().batch([studyDb().prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(Date.now()),studyDb().prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').bind(hashToken(token),id,Date.now()+12*3600*1000)]);return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}
export const clearAdminCookie=()=>`${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export function bootstrapHash(){return (env as unknown as {ADMIN_BOOTSTRAP_HASH?:string}).ADMIN_BOOTSTRAP_HASH}
