import {studyDb} from '@/db/study';
import {AuthError,assertSameOrigin,sessionUser,rateLimit} from '@/lib/site-auth';
import {currentAdmin} from '@/lib/admin-auth';
import {notifyUser} from '@/lib/notify';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

export type FeedbackItem={
 id:string;
 userId:string;
 author:string;
 category:'question'|'bug'|'suggestion'|'other';
 module:string;
 questionId:string;
 title:string;
 content:string;
 status:'open'|'in_progress'|'resolved';
 reply:string;
 createdAt:number;
 updatedAt:number;
};

const memoryFallback:FeedbackItem[]=[
 {
  id:'fb-seed-1',
  userId:'system',
  author:'产品小助手',
  category:'suggestion',
  module:'general',
  questionId:'',
  title:'欢迎来到反馈中心：发现题目不合理或体验问题请随时告诉我们',
  content:'如果在刷题、闯关、英语听力或面试背题时发现任何题目表述不自然、答案解析不够清楚、或者页面交互有遮挡/闪烁等问题，都可以在此直接提交。也可以在答题卡片右上角点「反馈本题」一键带入题号。',
  status:'resolved',
  reply:'已支持：训练答题返回上一题、问 AI 自由拖拽与保留同题对话、英语听力解析展示完整英文原句、关灯模式丝滑切换。感谢大家共同打磨题库！',
  createdAt:1730000000000,
  updatedAt:1730000000000,
 },
];

async function ensureTable(){
 const db=studyDb();
 await db.prepare(`CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '匿名学友',
  category TEXT NOT NULL DEFAULT 'question',
  module TEXT NOT NULL DEFAULT 'general',
  question_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reply TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
 )`).run();
 return db;
}

function rowToItem(r:Record<string,unknown>):FeedbackItem{
 return {
  id:String(r.id??''),
  userId:String(r.user_id??''),
  author:String(r.author??'匿名学友'),
  category:(['question','bug','suggestion','other'].includes(String(r.category))?String(r.category):'other') as FeedbackItem['category'],
  module:String(r.module??'general'),
  questionId:String(r.question_id??''),
  title:String(r.title??''),
  content:String(r.content??''),
  status:(['open','in_progress','resolved'].includes(String(r.status))?String(r.status):'open') as FeedbackItem['status'],
  reply:String(r.reply??''),
  createdAt:Number(r.created_at??Date.now()),
  updatedAt:Number(r.updated_at??Date.now()),
 };
}

function cleanText(v:unknown,max:number,label?:string){
 const s=typeof v==='string'?v.trim():'';
 if(label&&!s)throw new AuthError(`请填写${label}。`,400);
 if(s.length>max)throw new AuthError(`${label??'内容'}不能超过 ${max} 个字符。`,400);
 return s;
}

export async function GET(req:Request){
 try{
  const [user,admin]=await Promise.all([
   sessionUser(req.headers).catch(()=>null),
   currentAdmin(req.headers).catch(()=>null),
  ]);
  try{
   const db=await ensureTable();
   const rows=await db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 100').all<Record<string,unknown>>();
   const list=(rows.results??[]).map(rowToItem);
   const items=list.length?list:memoryFallback;
   return Response.json({items,isAdmin:!!admin,userId:user?.id??''},{headers:noCache});
  }catch{
   return Response.json({items:memoryFallback,isAdmin:!!admin,userId:user?.id??''},{headers:noCache});
  }
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  const msg=e instanceof AuthError?e.message:'加载反馈列表失败，请稍后重试。';
  return Response.json({error:msg},{status,headers:noCache});
 }
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  const raw=await req.text();
  if(raw.length>50000)throw new AuthError('提交内容过长，请精简后再试。',400);
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。',400)}
  if(!body||typeof body!=='object')throw new AuthError('请求格式无效。',400);

  const [user,admin]=await Promise.all([
   sessionUser(req.headers).catch(()=>null),
   currentAdmin(req.headers).catch(()=>null),
  ]);
  const now=Date.now();
  const action=String(body.action??'create');

  if(action==='create'){
   try{
    await rateLimit('feedback:'+(user?.id||req.headers.get('cf-connecting-ip')||'anon'),20);
   }catch(e){
    if(e instanceof AuthError)throw e;
   }
   const category=(['question','bug','suggestion','other'].includes(String(body.category))?String(body.category):'question') as FeedbackItem['category'];
   const mod=cleanText(body.module||'general',40)||'general';
   const questionId=cleanText(body.questionId||'',120);
   const title=cleanText(body.title,120,'反馈标题');
   const content=cleanText(body.content,2000,'反馈详情');
   if(title.length<2)throw new AuthError('反馈标题至少需要 2 个字。',400);
   if(content.length<4)throw new AuthError('反馈详情至少需要 4 个字，方便我们定位问题。',400);

   const item:FeedbackItem={
    id:'fb-'+crypto.randomUUID(),
    userId:user?.id??'',
    author:user&&!user.is_guest?user.username:(cleanText(body.author||'',32)||'热心学友'),
    category,
    module:mod,
    questionId,
    title,
    content,
    status:'open',
    reply:'',
    createdAt:now,
    updatedAt:now,
   };

   try{
    const db=await ensureTable();
    await db.prepare('INSERT INTO feedbacks(id,user_id,author,category,module,question_id,title,content,status,reply,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
     .bind(item.id,item.userId,item.author,item.category,item.module,item.questionId,item.title,item.content,item.status,item.reply,item.createdAt,item.updatedAt)
     .run();
   }catch{
    memoryFallback.unshift(item);
   }
   return Response.json({ok:true,item},{headers:noCache});
  }

  if(action==='updateStatus'){
   const id=cleanText(body.id,100,'反馈编号');
   const nextStatus=(['open','in_progress','resolved'].includes(String(body.status))?String(body.status):'resolved') as FeedbackItem['status'];
   // 没带 reply 时（只切换状态）保留原来的回复。
   const replyGiven=typeof body.reply==='string',reply=cleanText(body.reply??'',1000);
   try{
    const db=await ensureTable();
    const existing=await db.prepare('SELECT user_id,title,status,reply FROM feedbacks WHERE id=?').bind(id).first<{user_id:string;title:string;status:string;reply:string}>();
    if(!existing)throw new AuthError('找不到该条反馈。',404);
    const isOwner=Boolean(user?.id&&existing.user_id===user.id);
    if(!admin&&!isOwner)throw new AuthError('只有管理员或提交人可以更新状态。',403);
    if(admin){
     const nextReply=replyGiven?reply:existing.reply;
     await db.prepare('UPDATE feedbacks SET status=?,reply=?,updated_at=? WHERE id=?').bind(nextStatus,nextReply,now,id).run();
     // 管理员处理完（标记已解决或写了新回复）时，通知提交人；提交人自己操作不通知。
     const changed=nextReply!==existing.reply||(nextStatus==='resolved'&&existing.status!=='resolved');
     if(changed&&existing.user_id&&existing.user_id!==user?.id&&(nextStatus==='resolved'||nextReply)){
      const head=nextStatus==='resolved'?'你的反馈已处理':'你的反馈有了新回复';
      await notifyUser(existing.user_id,{kind:'feedback',title:`${head}：${existing.title}`,body:nextReply||'已标记为已解决。',link:'/feedback#'+id}).catch(()=>{});
     }
    }else{
     await db.prepare('UPDATE feedbacks SET status=?,updated_at=? WHERE id=?').bind(nextStatus,now,id).run();
    }
   }catch(e){
    if(e instanceof AuthError)throw e;
    const hit=memoryFallback.find(x=>x.id===id);
    if(hit){hit.status=nextStatus;if(admin&&replyGiven)hit.reply=reply;hit.updatedAt=now;}
   }
   return Response.json({ok:true},{headers:noCache});
  }

  if(action==='delete'){
   const id=cleanText(body.id,100,'反馈编号');
   try{
    const db=await ensureTable();
    const existing=await db.prepare('SELECT user_id FROM feedbacks WHERE id=?').bind(id).first<{user_id:string}>();
    if(!existing)throw new AuthError('找不到该条反馈。',404);
    const isOwner=Boolean(user?.id&&existing.user_id===user.id);
    if(!admin&&!isOwner)throw new AuthError('没有删除该反馈的权限。',403);
    await db.prepare('DELETE FROM feedbacks WHERE id=?').bind(id).run();
   }catch(e){
    if(e instanceof AuthError)throw e;
    const idx=memoryFallback.findIndex(x=>x.id===id);
    if(idx>=0)memoryFallback.splice(idx,1);
   }
   return Response.json({ok:true},{headers:noCache});
  }

  throw new AuthError('不支持的操作。',400);
 }catch(e){
  const status=e instanceof AuthError?e.status:500;
  const msg=e instanceof AuthError?e.message:'提交失败，请稍后重试。';
  return Response.json({error:msg},{status,headers:noCache});
 }
}
