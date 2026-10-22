import {env} from 'cloudflare:workers';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {studyDb} from '@/db/study';
import {AuthError} from './site-auth';

// GitHub / Google sign-in. Client ids and secrets are Worker secrets; a provider shows up only when both are set.
export type Provider='github'|'google';
type Identity={subject:string;name:string;email:string|null};
type Config={authorize:string;token:string;scope:string;extra?:Record<string,string>;profile:(accessToken:string)=>Promise<Identity>};
const vars=()=>env as unknown as Record<string,string|undefined>;
const json=async(r:Response)=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json() as Promise<Record<string,unknown>>};
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim().slice(0,80):null;
const configs:Record<Provider,Config>={
 github:{authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',scope:'read:user user:email',
  async profile(token){const u=await json(await fetch('https://api.github.com/user',{headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','user-agent':'interview-study-room'}}));if(typeof u.id!=='number')throw new Error('GitHub profile without id');return {subject:String(u.id),name:text(u.name)??text(u.login)??'GitHub 用户',email:text(u.email)}}},
 google:{authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scope:'openid email profile',extra:{prompt:'select_account'},
  async profile(token){const u=await json(await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:'Bearer '+token}}));if(typeof u.sub!=='string')throw new Error('Google profile without sub');const email=u.email_verified===true?text(u.email):null;return {subject:u.sub,name:text(u.name)??email??'Google 用户',email}}},
};
const credentials=(p:Provider)=>{const id=vars()[p.toUpperCase()+'_CLIENT_ID'],secret=vars()[p.toUpperCase()+'_CLIENT_SECRET'];return id&&secret?{id,secret}:null};
export const enabledProviders=()=>(Object.keys(configs) as Provider[]).filter(p=>credentials(p));
export const asProvider=(v:string|undefined):Provider|null=>v==='github'||v==='google'?v:null;

export const OAUTH_COOKIE='__Host-study-oauth';
const callbackUrl=(req:Request,p:Provider)=>new URL('/api/auth/oauth/'+p,req.url).toString();
export const safeReturn=(v:unknown)=>typeof v==='string'&&/^\/(?![\/\\])/.test(v)&&v.length<=200?v:'/';

export function startUrl(req:Request,p:Provider,returnTo:string){const c=credentials(p);if(!c)throw new AuthError('该登录方式尚未开放。',404);const state=randomBytes(24).toString('hex');
 const url=new URL(configs[p].authorize);url.search=new URLSearchParams({client_id:c.id,redirect_uri:callbackUrl(req,p),response_type:'code',scope:configs[p].scope,state,...configs[p].extra}).toString();
 const value=Buffer.from(JSON.stringify({s:state,p,r:safeReturn(returnTo)})).toString('base64url');
 return {url:url.toString(),cookie:`${OAUTH_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}}
export const clearOauthCookie=()=>`${OAUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Validates the state round-trip and returns where to send the user afterwards.
export function checkState(req:Request,p:Provider,state:string|null){const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(OAUTH_COOKIE+'='))?.slice(OAUTH_COOKIE.length+1);
 let saved:{s?:unknown;p?:unknown;r?:unknown}={};try{saved=raw?JSON.parse(Buffer.from(raw,'base64url').toString()):{}}catch{}
 const a=Buffer.from(String(saved.s??'')),b=Buffer.from(state??'');if(!state||saved.p!==p||a.length!==b.length||!a.length||!timingSafeEqual(a,b))throw new AuthError('登录已过期，请重新登录。',400);return safeReturn(saved.r)}

export async function fetchIdentity(req:Request,p:Provider,code:string):Promise<Identity>{const c=credentials(p);if(!c)throw new AuthError('该登录方式尚未开放。',404);
 const body=new URLSearchParams({client_id:c.id,client_secret:c.secret,code,redirect_uri:callbackUrl(req,p),grant_type:'authorization_code'});
 const t=await json(await fetch(configs[p].token,{method:'POST',headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded'},body}));
 if(typeof t.access_token!=='string')throw new Error(p+' token exchange returned no access token');return configs[p].profile(t.access_token)}

// Finds the account for this identity, or creates one. A guest signing in for the first time keeps their guest progress.
export async function accountFor(p:Provider,who:Identity,visitor:{id:string;is_guest:number}|null){const db=studyDb(),now=Date.now();
 const known=await db.prepare('SELECT account_id FROM oauth_identities WHERE provider=? AND subject=?').bind(p,who.subject).first<{account_id:string}>();
 if(known){await db.prepare('UPDATE accounts SET display_name=? WHERE id=?').bind(who.name,known.account_id).run();return known.account_id}
 const username=p+':'+who.subject,identity=(id:string)=>db.prepare('INSERT INTO oauth_identities(provider,subject,account_id,email,created_at) VALUES(?,?,?,?,?)').bind(p,who.subject,id,who.email,now);
 if(visitor?.is_guest){await db.batch([db.prepare('UPDATE accounts SET username=?,display_name=?,password_hash=?,is_guest=0 WHERE id=? AND is_guest=1').bind(username,who.name,'oauth',visitor.id),identity(visitor.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(visitor.id)]);return visitor.id}
 const id=randomUUID();await db.batch([db.prepare('INSERT INTO accounts(id,username,password_hash,created_at,is_guest,display_name) VALUES(?,?,?,?,0,?)').bind(id,username,'oauth',now,who.name),identity(id)]);return id}
