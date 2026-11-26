import {AuthError,assertSameOrigin,sessionUser} from '@/lib/site-auth';
import {listNotices,markRead} from '@/lib/notify';
import {APP_VERSION,BRIDGE_RELEASE,RELEASES} from '@/lib/releases';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

// 当前线上版本 + 最近的更新说明（顶栏「版本更新」里显示）+ 本地桥接最新版本 + 本人的通知（铃铛里显示）。没登录时只有前三项。
export async function GET(req:Request){
 const user=await sessionUser(req.headers).catch(()=>null);
 const items=user?await listNotices(user.id).catch(()=>[]):[];
 return Response.json({version:APP_VERSION,releases:RELEASES.slice(0,40),bridge:BRIDGE_RELEASE,items},{headers:noCache});
}

// 标记已读：ids 为空表示全部已读。
export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const user=await sessionUser(req.headers);
  if(!user)throw new AuthError('请先登录。',401);
  let body:{ids?:unknown};
  try{body=JSON.parse(await req.text())}catch{throw new AuthError('请求格式无效。',400)}
  const ids=Array.isArray(body.ids)?body.ids.filter((x):x is string=>typeof x==='string'&&x.length<=100):undefined;
  await markRead(user.id,ids);
  return Response.json({ok:true},{headers:noCache});
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  return Response.json({error:e instanceof AuthError?e.message:'操作失败。'},{status,headers:noCache});
 }
}
