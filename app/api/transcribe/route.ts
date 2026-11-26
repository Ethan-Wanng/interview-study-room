import {AuthError,assertSameOrigin,sessionUser} from '@/lib/site-auth';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const user=await sessionUser(req.headers);
  if(!user)throw new AuthError('请先登录后再使用语音输入。',401);
  return Response.json({error:'服务端语音识别已停用，请直接打字输入。'},{status:503,headers:noCache});
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  return Response.json({error:e instanceof AuthError?e.message:'语音识别服务不可用。'},{status,headers:noCache});
 }
}
