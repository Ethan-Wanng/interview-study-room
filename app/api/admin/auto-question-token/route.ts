import {requireAdmin} from '@/lib/admin-auth';
import {AuthError,assertSameOrigin} from '@/lib/site-auth';
import {issueApiToken,validApiToken,savedApiToken,apiTokenCookie} from '@/lib/auto-question-token';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(req:Request){
 const saved=savedApiToken(req.headers);
 return respond({verified:!!saved&&validApiToken(saved)});
}
export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  if(req.headers.get('origin')!==new URL(req.url).origin)throw new AuthError('请从本站页面操作。',403);
  const raw=await req.text();if(raw.length>1000)throw new AuthError('请求内容过长。',413);
  let body:any;try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。')}
  if(body?.action==='generate'){
   const admin=await requireAdmin(req.headers);if(admin.role!=='owner')throw new AuthError('只有站长可以生成 Token。',403);
   return respond(issueApiToken());
  }
  if(body?.action==='save'){
   const token=typeof body.token==='string'?body.token.trim():'';
   if(!/^[A-Za-z0-9_-]{32,128}$/.test(token)||!validApiToken(token))throw new AuthError('Token 无效或已过期，未保存。',401);
   return respond({verified:true},200,apiTokenCookie(token));
  }
  if(body?.action==='forget')return respond({verified:false},200,apiTokenCookie(''));
  throw new AuthError('操作无效。');
 }catch(e){return respond({error:e instanceof AuthError?e.message:'Token 操作暂时不可用。'},e instanceof AuthError?e.status:503)}
}
