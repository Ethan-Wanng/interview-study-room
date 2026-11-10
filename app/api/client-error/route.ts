import {studyDb} from '@/db/study';
import {AuthError,assertSameOrigin,rateLimit,sessionUser} from '@/lib/site-auth';

export const dynamic='force-dynamic';
const cut=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):'';

// 浏览器上报页面报错（考试期间的报错带上试卷 id 和答题进度摘要）。不需要登录；按用户或 IP 限流。
export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>40000)return Response.json({ok:false},{status:413});
  let b:Record<string,unknown>;try{b=JSON.parse(raw)}catch{return Response.json({ok:false},{status:400})}
  const message=cut(b.message,1000);if(!message)return Response.json({ok:false},{status:400});
  const user=await sessionUser(req.headers).catch(()=>null);
  await rateLimit('client-error:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),30);
  await studyDb().prepare('INSERT INTO client_errors(id,user_id,username,path,exam_id,message,stack,context,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
   .bind('ce-'+crypto.randomUUID(),user?.id??'',user?.username??'',cut(b.path,300),cut(b.examId,100),message,cut(b.stack,8000),cut(b.context,20000),cut(req.headers.get('user-agent'),300),Date.now()).run();
  return Response.json({ok:true});
 }catch(e){
  return Response.json({ok:false},{status:e instanceof AuthError?e.status:500});
 }
}
