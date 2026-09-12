import {sessionUser,assertSameOrigin,AuthError} from '@/lib/site-auth';
import {studyDb,dayNow} from '@/db/study';
import {choose,emptyAnswer,snapshot,RunRow} from '@/db/practice';
import {practiceMap} from '@/content/practice';
import type {Payload,Mode} from '@/lib/practice-types';
import {trainingTracks} from '@/lib/practice-types';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req:Request){try{const user=await sessionUser(req.headers);if(!user)return fail('请重新登录网站。',401);return Response.json(await snapshot(user.id,new URL(req.url).searchParams.get('id')??undefined),{headers:{'Cache-Control':'no-store'}})}catch(e){console.error(e);return fail('训练记录暂时无法读取，请重试。',503)}}
export async function POST(req:Request){try{
 assertSameOrigin(req);const user=(await sessionUser(req.headers))?.id;if(!user)return fail('请重新登录网站。',401);
 const raw=await req.text();if(raw.length>25000)return fail('答案过长，请控制在 20000 字以内。');let p:any;try{p=JSON.parse(raw)}catch{return fail('请求内容无效。')}if(!p||typeof p!=='object')return fail('请求内容无效。');
 const db=studyDb(),now=Date.now();
 if(p.action==='goal'){if(![30,60].includes(p.minutes))return fail('请选择 30 或 60 分钟。');await db.prepare('INSERT INTO practice_preferences(user_id,minutes) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET minutes=excluded.minutes').bind(user,p.minutes).run();return Response.json(await snapshot(user));}
 if(p.action==='start'){
  if(!['exam','interview','random'].includes(p.mode)||!trainingTracks.some(t=>t.id===p.track)||![30,60].includes(p.minutes))return fail('训练设置无效。');
  const ids=choose(p.mode,p.track),payload:Payload={mode:p.mode as Mode,track:p.track,minutes:p.minutes,ids,answers:ids.map(emptyAnswer),index:0,seconds:0,lastTick:now};
  // Unique active-run index makes repeat clicks and concurrent tabs resume the same run.
  await db.prepare("INSERT OR IGNORE INTO practice_runs(id,user_id,status,payload,revision,last_op,created_at,updated_at) VALUES(?,?,'active',?,0,?,?,?)").bind(crypto.randomUUID(),user,JSON.stringify(payload),crypto.randomUUID(),now,now).run();
  return Response.json(await snapshot(user));
 }
 if(typeof p.id!=='string'||!Number.isInteger(p.revision))return fail('练习标识无效。');
 const row=await db.prepare('SELECT * FROM practice_runs WHERE id=? AND user_id=?').bind(p.id,user).first<RunRow>();if(!row)return fail('找不到这次练习。',404);
 if(row.revision!==p.revision||row.status!=='active')return fail('记录已更新，请重新载入后继续；未提交的文字仍保留在页面。',409);
 const v=JSON.parse(row.payload) as Payload;let status='active',credit=0;
 if(p.elapsed!==undefined){if(!Number.isInteger(p.elapsed)||p.elapsed<0||p.elapsed>30)return fail('计时时长无效。');credit=Math.max(0,Math.min(p.elapsed,Math.floor((now-v.lastTick)/1000),v.minutes*60-v.seconds));v.seconds+=credit;v.lastTick=now;}
 if(p.action==='answer'){
  if(!Number.isInteger(p.index)||p.index<0||p.index>=v.ids.length||typeof p.value!=='string'||p.value.length>20000)return fail('答案无效或过长。');
  if(v.mode!=='exam'&&p.index!==v.index)return fail('请回答当前题目。');
  if(v.mode!=='exam'&&v.answers[p.index].submitted)return fail('本题已提交，请继续下一题。');
  const q=practiceMap.get(v.ids[p.index])!;if(q.type==='choice'&&!['0','1','2','3',''].includes(p.value))return fail('请选择有效选项。');
  v.answers[p.index]={value:p.value,submitted:true,self:null};
 }else if(p.action==='self'){
  if(!Number.isInteger(p.index)||p.index<0||p.index>=v.ids.length||![0,1,2].includes(p.value)||!v.answers[p.index].submitted||practiceMap.get(v.ids[p.index])!.accepted)return fail('自评无效。');
  if(v.mode==='exam')return fail('考试交卷后请对照要点查看主观题。');v.answers[p.index].self=p.value;
 }else if(p.action==='next'){
  if(v.mode==='exam'||!v.answers[v.index].submitted)return fail('请先提交当前答案。');
  if(v.mode==='random'){v.ids.push(...choose('random',v.track));v.answers.push(emptyAnswer());v.index++;}
  else if(v.index<v.ids.length-1)v.index++;else status='completed';
 }else if(p.action==='tick'){
  if(p.elapsed===undefined)return fail('计时时长无效。');
 }else if(p.action==='finish'){status='completed'}else return fail('无效操作。');
 if(v.seconds>=v.minutes*60)status='completed';
 const op=crypto.randomUUID();const statements=[db.prepare('UPDATE practice_runs SET payload=?,status=?,revision=revision+1,last_op=?,updated_at=? WHERE id=? AND user_id=? AND revision=? AND status=\'active\' RETURNING id').bind(JSON.stringify(v),status,op,now,row.id,user,p.revision)];
 if(credit&&v.mode==='random')statements.push(db.prepare('INSERT INTO practice_days(user_id,day,seconds) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM practice_runs WHERE id=? AND last_op=?) ON CONFLICT(user_id,day) DO UPDATE SET seconds=practice_days.seconds+excluded.seconds').bind(user,dayNow(),credit,row.id,op));
 const results=await db.batch(statements);if(!results[0].results.length)return fail('记录已更新，请重新载入后继续。',409);
 return Response.json(await snapshot(user,status==='completed'?row.id:undefined));
 }catch(e){if(e instanceof AuthError)return fail(e.message,e.status);console.error(e);return fail('保存失败，内容已保留，请稍后重试。',503)}}
