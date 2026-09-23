import {env} from 'cloudflare:workers';
import {createHmac,randomBytes} from 'node:crypto';
import {secureToken} from './auto-questions';
import {AuthError} from './site-auth';

export const API_TOKEN_COOKIE='__Host-study-api';
export const TOKEN_AGE=30*24*60*60;
const secret=()=>(env as unknown as {AUTO_QUESTION_API_TOKEN?:string}).AUTO_QUESTION_API_TOKEN;
const signature=(value:string,key:string)=>createHmac('sha256',key).update('auto-question-token:v1:'+value).digest('hex');
export function issueApiToken(now=Date.now()){
 const key=secret();if(!key)throw new AuthError('服务器尚未配置 API Token，请先完成站点密钥配置。',503);
 const expires=Math.floor(now/1000)+TOKEN_AGE,payload=`aq1_${expires}_${randomBytes(16).toString('hex')}`;
 return {token:payload+'_'+signature(payload,key),expiresAt:expires*1000};
}
export function validApiToken(token:string,now=Date.now()){
 if(!/^[A-Za-z0-9_-]{32,128}$/.test(token))return false;
 const key=secret();if(!key)return false;
 if(secureToken(token,key))return true;
 const match=/^(aq1_(\d{10})_[a-f0-9]{32})_([a-f0-9]{64})$/.exec(token);
 return !!match&&Number(match[2])*1000>now&&secureToken(match[3],signature(match[1],key));
}
export function savedApiToken(headers:Headers){return headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(API_TOKEN_COOKIE+'='))?.slice(API_TOKEN_COOKIE.length+1)??''}
export function apiTokenCookie(token:string){return `${API_TOKEN_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token?TOKEN_AGE:0}`}
