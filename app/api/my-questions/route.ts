import {randomUUID} from 'node:crypto';
import {studyDb,dayNow} from '@/db/study';
import {catalog} from '@/db/catalog';
import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {consumeSiteAiQuota} from '@/lib/site-ai-quota';
import {prepareCustomAi} from '@/db/ai-config';
import {generateQuestions} from '@/lib/gemini';
import {TUTOR_QUOTA} from '@/lib/tutor-types';
import {MY_LIMITS,MINE,type MyQuestion,type MyQuestionInput} from '@/lib/my-questions';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
type Row={id:string;subject_id:string;section:string;title:string;answer:string;updated_at:number};
const toItem=(r:Row):MyQuestion=>({id:r.id,subject:r.subject_id,section:r.section,title:r.title,answer:r.answer,updatedAt:r.updated_at});
const fail=(e:unknown)=>{if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers});console.error('My questions failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'暂时无法完成操作，请稍后重试。'},{status:503,headers})};

// 私人题库只给正式账号用：游客的数据跟着浏览器 Cookie 走，换设备就丢了。
async function member(req:Request){const u=await sessionUser(req.headers);if(!u)throw new AuthError('请先登录。',401);if(u.is_guest)throw new AuthError('私人题库需要先注册或登录账号（邮箱注册不用验证，几秒钟就好），游客的数据换设备会丢失。',403);return u}
async function list(user:string){const rows=await studyDb().prepare('SELECT id,subject_id,section,title,answer,updated_at FROM user_questions WHERE user_id=? ORDER BY created_at').bind(user).all<Row>();return rows.results.map(toItem)}

// 校验一道题；subject 只能是 mine 或现有的公共学科。
async function clean(v:unknown,subjects:Set<string>):Promise<Required<MyQuestionInput>>{const o=(v&&typeof v==='object'?v:{}) as Record<string,unknown>;
 const title=typeof o.title==='string'?o.title.trim():'',answer=typeof o.answer==='string'?o.answer.trim():'',section=typeof o.section==='string'?o.section.trim():'',subject=typeof o.subject==='string'&&o.subject?o.subject:MINE;
 if(!title||title.length>MY_LIMITS.title)throw new AuthError(`题目不能为空，最多 ${MY_LIMITS.title} 个字。`);
 if(answer.length>MY_LIMITS.answer)throw new AuthError(`参考答案最多 ${MY_LIMITS.answer} 个字。`);
 if(section.length>MY_LIMITS.section)throw new AuthError(`分类最多 ${MY_LIMITS.section} 个字。`);
 if(subject!==MINE&&!subjects.has(subject))throw new AuthError('所属学科无效。');
 return {title,answer,section,subject}}

export async function GET(req:Request){try{const u=await sessionUser(req.headers);if(!u||u.is_guest)return Response.json({items:[],member:false},{headers});return Response.json({items:await list(u.id),member:true},{headers})}catch(e){return fail(e)}}

// POST {action:'create'|'import'|'update'|'delete'|'generate',...}
export async function POST(req:Request){try{assertSameOrigin(req);const u=await member(req);const text=await req.text();if(text.length>MY_LIMITS.batch*(MY_LIMITS.answer+400))throw new AuthError('内容过长。',413);
 let p:Record<string,unknown>;try{p=JSON.parse(text)}catch{throw new AuthError('请求格式无效。')}
 const db=studyDb(),now=Date.now(),subjects=new Set((await catalog()).subjects.map(s=>s.id));
 const count=async()=>(await db.prepare('SELECT count(*) n FROM user_questions WHERE user_id=?').bind(u.id).first<{n:number}>())?.n??0;
 if(p.action==='create'||p.action==='import'){
  const raw=p.action==='create'?[p.item]:Array.isArray(p.items)?p.items:[];
  if(!raw.length||raw.length>MY_LIMITS.batch)throw new AuthError(`一次最多导入 ${MY_LIMITS.batch} 道题。`);
  const items=await Promise.all(raw.map(x=>clean(x,subjects)));
  if(await count()+items.length>MY_LIMITS.total)throw new AuthError(`私人题库最多 ${MY_LIMITS.total} 道题，先删掉一些再添加。`,409);
  await db.batch(items.map((it,i)=>db.prepare('INSERT INTO user_questions(id,user_id,subject_id,section,title,answer,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind('u-'+randomUUID(),u.id,it.subject,it.section,it.title,it.answer,now+i,now+i)));
  return Response.json({items:await list(u.id),added:items.length},{headers})}
 if(p.action==='update'){const id=typeof p.id==='string'?p.id:'',it=await clean(p.item,subjects);
  const r=await db.prepare('UPDATE user_questions SET subject_id=?,section=?,title=?,answer=?,updated_at=? WHERE id=? AND user_id=? RETURNING id').bind(it.subject,it.section,it.title,it.answer,now,id,u.id).first();
  if(!r)throw new AuthError('题目不存在或已删除。',404);return Response.json({items:await list(u.id)},{headers})}
 if(p.action==='delete'){const id=typeof p.id==='string'?p.id:'';
  await db.batch([db.prepare('DELETE FROM user_questions WHERE id=? AND user_id=?').bind(id,u.id),db.prepare('DELETE FROM progress WHERE user_id=? AND question_id=?').bind(u.id,id),db.prepare('DELETE FROM activity WHERE user_id=? AND question_id=?').bind(u.id,id)]);
  return Response.json({items:await list(u.id)},{headers})}
 if(p.action==='generate')return await generate(req,u,p);
 throw new AuthError('操作无效。')}catch(e){return fail(e)}}

// AI 出题：根据粘贴的面经、岗位要求或知识点生成题目和参考答案，只返回给页面预览，用户确认后再走 import 保存。算一次站点 DeepSeek 额度。
async function generate(req:Request,u:{id:string;is_guest:number},p:Record<string,unknown>){
 const user=u.id;
 const source=typeof p.source==='string'?p.source.trim():'',want=Math.min(MY_LIMITS.generate,Math.max(1,Number(p.count)||8));
 if(source.length<10||source.length>MY_LIMITS.source)throw new AuthError(`请粘贴 10～${MY_LIMITS.source} 字的面经、岗位要求或知识点。`);
 const custom=await prepareCustomAi(user,'tutor');if(custom.mode==='blocked')throw new AuthError(custom.message,429);
 if(custom.mode==='custom'){try{return Response.json({drafts:await generateQuestions(source,want,custom.config)},{headers})}catch{await custom.refund().catch(()=>{});throw new AuthError('专属 API 调用失败，请检查「AI 设置」（本次未计入次数）。',502)}}
 const siteQ=await consumeSiteAiQuota(req,u,'deepseek');
 if(!siteQ.ok)throw new AuthError(siteQ.message,siteQ.status);
 const db=studyDb(),day=dayNow(),limit=TUTOR_QUOTA.user;
 let usedBucket=false;
 if(siteQ.limit!==999){
  const row=await db.prepare('INSERT INTO ai_tutor_quota(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user,day,limit).first();
  if(!row){await siteQ.refund();throw new AuthError(`今天的 ${limit} 次 AI 次数已用完，明天再来，或在「AI 设置」接入本地客户端 / 配置自己的 API Key。`,429)}
  usedBucket=true;
 }
 try{return Response.json({drafts:await generateQuestions(source,want)},{headers})}
 catch{await Promise.all([siteQ.refund(),usedBucket?db.prepare('UPDATE ai_tutor_quota SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(user,day).run().catch(()=>{}):Promise.resolve()]);throw new AuthError('AI 暂时连不上，这次没有扣次数，请稍后再试。',502)}}
