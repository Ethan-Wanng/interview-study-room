import {AuthError,assertSameOrigin,sessionUser} from '@/lib/site-auth';
import {AI_PROVIDERS,providerMeta,type AiProviderId} from '@/lib/ai-config';
import {getUserAiSettings,saveUserAiSettings} from '@/db/ai-config';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

export async function GET(req:Request){
 const user=await sessionUser(req.headers).catch(()=>null);
 if(!user||user.is_guest){
  return Response.json({isGuest:true,username:'',settings:null},{headers:noCache});
 }
 const settings=await getUserAiSettings(user.id);
 return Response.json({isGuest:false,username:user.username,settings},{headers:noCache});
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const user=await sessionUser(req.headers);
  if(!user)return Response.json({error:'auth',message:'请先登录网站。'},{status:401,headers:noCache});
  if(user.is_guest){
   return Response.json({error:'guest_forbidden',message:'游客模式下不允许更换 API Key，请先注册或登录账号。'},{status:403,headers:noCache});
  }
  let body:Record<string,unknown>;
  try{body=JSON.parse(await req.text())}catch{return Response.json({error:'invalid',message:'请求格式无效。'},{status:400,headers:noCache})}
  if(!body||typeof body!=='object')return Response.json({error:'invalid',message:'请求格式无效。'},{status:400,headers:noCache});

  const provider=(typeof body.provider==='string'&&AI_PROVIDERS.some(p=>p.id===body.provider)?body.provider:'deepseek') as AiProviderId;
  const meta=providerMeta(provider);
  const model=typeof body.model==='string'&&body.model.trim()?body.model.trim().slice(0,120):meta.defaultModel;
  const enabled=Boolean(body.enabled);
  const dailyLimit=Math.max(0,Math.min(5000,Math.round(Number(body.dailyLimit)??50)));
  const maxTokens=Math.max(256,Math.min(8192,Math.round(Number(body.maxTokens)??2048)));
  const allowTutor=body.allowTutor!==false;
  const allowGrade=body.allowGrade!==false;

  let apiKey:string|undefined=undefined;
  if(body.clearKey===true){
   apiKey='';
  }else if(typeof body.apiKey==='string'&&body.apiKey.trim()){
   const rawKey=body.apiKey.trim();
   if(rawKey.length>300)return Response.json({error:'invalid',message:'API Key 长度超出限制。'},{status:400,headers:noCache});
   apiKey=rawKey;
  }

  const settings=await saveUserAiSettings(user.id,{
   enabled,
   provider,
   model,
   apiKey,
   dailyLimit,
   maxTokens,
   allowTutor,
   allowGrade,
  });

  if(enabled&&!settings.hasKey){
   return Response.json({error:'missing_key',message:'请填写你的 API Key 后再开启专属 API。',settings},{status:400,headers:noCache});
  }

  return Response.json({ok:true,settings},{headers:noCache});
 }catch(e){
  if(e instanceof AuthError)return Response.json({error:'auth',message:e.message},{status:e.status,headers:noCache});
  return Response.json({error:'failed',message:'保存 AI 配置失败，请稍后重试。'},{status:500,headers:noCache});
 }
}
