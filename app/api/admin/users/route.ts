import {randomUUID} from 'node:crypto';
import {studyDb,dayNow} from '@/db/study';
import {AuthError,assertSameOrigin,passwordHash,sessionUser} from '@/lib/site-auth';
import {requireAdmin} from '@/lib/admin-auth';
import {textValue} from '@/lib/admin-validation';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const json=(v:unknown)=>Response.json(v,{headers:noCache});

function error(e:unknown){
 if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers:noCache});
 console.error('Admin users operation failed',e instanceof Error?e.message:'Unknown');
 return Response.json({error:'用户管理接口暂时不可用，请重试。'},{status:503,headers:noCache});
}

async function requireOwner(headers:Headers){
 const admin=await requireAdmin(headers);
 if(admin.role!=='owner')throw new AuthError('仅站点管理员可管理用户。',403);
 return admin;
}

type RawUserRow={
 id:string;
 username:string;
 display_name:string|null;
 is_guest:number;
 created_at:number;
 oauth_info:string|null;
 active_sessions:number;
 learned_count:number;
 last_active_day:string|null;
 ai_grade_today:number;
 ai_tutor_today:number;
 sync_keys:number;
 admin_role:string|null;
 admin_name:string|null;
 admin_enabled:number|null;
};

export async function GET(req:Request){
 try{
  await requireOwner(req.headers);
  const db=studyDb();
  const url=new URL(req.url);
  const q=(url.searchParams.get('q')??'').trim().toLowerCase().slice(0,100);
  const type=url.searchParams.get('type')??'all';
  const limit=Math.min(100,Math.max(1,Number.parseInt(url.searchParams.get('limit')??'50',10)||50));
  const offset=Math.max(0,Number.parseInt(url.searchParams.get('offset')??'0',10)||0);
  const now=Date.now();
  const today=dayNow();

  const whereParts:string[]=[];
  const whereBinds:unknown[]=[];
  if(type==='registered'){
   whereParts.push('a.is_guest = 0');
  }else if(type==='guest'){
   whereParts.push('a.is_guest = 1');
  }
  if(q){
   const like=`%${q}%`;
   whereParts.push(
    "(lower(a.username) LIKE ? OR lower(COALESCE(a.display_name,'')) LIKE ? OR lower(a.id) LIKE ? OR EXISTS(SELECT 1 FROM oauth_identities oi WHERE oi.account_id=a.id AND lower(COALESCE(oi.email,'')) LIKE ?))",
   );
   whereBinds.push(like,like,like,like);
  }
  const whereSql=whereParts.length?`WHERE ${whereParts.join(' AND ')}`:'';

  const [statsRow,activeSessRow,todayActRow,matchedRow,listRes]=await Promise.all([
   db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN is_guest=0 THEN 1 ELSE 0 END) AS registered, SUM(CASE WHEN is_guest=1 THEN 1 ELSE 0 END) AS guests FROM accounts').first<{total:number;registered:number|null;guests:number|null}>(),
   db.prepare('SELECT COUNT(DISTINCT user_id) AS cnt FROM sessions WHERE expires_at > ?').bind(now).first<{cnt:number}>(),
   db.prepare('SELECT COUNT(DISTINCT user_id) AS cnt FROM activity WHERE day = ?').bind(today).first<{cnt:number}>(),
   db.prepare(`SELECT COUNT(*) AS cnt FROM accounts a ${whereSql}`).bind(...whereBinds).first<{cnt:number}>(),
   db.prepare(
    `SELECT
      a.id,
      a.username,
      a.display_name,
      a.is_guest,
      a.created_at,
      (SELECT group_concat(provider || COALESCE(':' || email, ''), ',') FROM oauth_identities WHERE account_id = a.id) AS oauth_info,
      (SELECT COUNT(*) FROM sessions WHERE user_id = a.id AND expires_at > ?) AS active_sessions,
      (SELECT COUNT(*) FROM progress WHERE user_id = a.id) AS learned_count,
      (SELECT MAX(day) FROM activity WHERE user_id = a.id) AS last_active_day,
      COALESCE((SELECT count FROM ai_grade_quota WHERE user_id = a.id AND day = ?), 0) AS ai_grade_today,
      COALESCE((SELECT count FROM ai_tutor_quota WHERE user_id = a.id AND day = ?), 0) AS ai_tutor_today,
      (SELECT COUNT(*) FROM user_store WHERE user_id = a.id) AS sync_keys,
      adm.role AS admin_role,
      adm.name AS admin_name,
      adm.enabled AS admin_enabled
     FROM accounts a
     LEFT JOIN administrators adm ON adm.account_id = a.id
     ${whereSql}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
   ).bind(now,today,today,...whereBinds,limit,offset).all<RawUserRow>(),
  ]);

  const users=(listRes.results??[]).map(r=>({
   id:r.id,
   username:r.username,
   displayName:r.display_name||'',
   isGuest:r.is_guest===1,
   createdAt:r.created_at,
   oauth:r.oauth_info?r.oauth_info.split(',').filter(Boolean):[],
   activeSessions:Number(r.active_sessions??0),
   learnedCount:Number(r.learned_count??0),
   lastActiveDay:r.last_active_day||'',
   aiGradeToday:Number(r.ai_grade_today??0),
   aiTutorToday:Number(r.ai_tutor_today??0),
   syncKeys:Number(r.sync_keys??0),
   adminRole:r.admin_role||'',
   adminName:r.admin_name||'',
   adminEnabled:r.admin_enabled===1,
  }));

  return json({
   stats:{
    total:Number(statsRow?.total??0),
    registered:Number(statsRow?.registered??0),
    guests:Number(statsRow?.guests??0),
    activeSessions:Number(activeSessRow?.cnt??0),
    todayActive:Number(todayActRow?.cnt??0),
   },
   totalMatched:Number(matchedRow?.cnt??0),
   limit,
   offset,
   users,
  });
 }catch(e){
  return error(e);
 }
}

export async function POST(req:Request){
 try{
  assertSameOrigin(req);
  await requireOwner(req.headers);
  const raw=await req.text();
  if(raw.length>32768)throw new AuthError('请求内容过长。');
  let p:Record<string,unknown>;
  try{p=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。')}
  if(!p||typeof p!=='object')throw new AuthError('请求格式无效。');

  const db=studyDb();
  const action=typeof p.action==='string'?p.action:'';

  if(action==='pruneGuests'){
   const rawDays=typeof p.days==='number'?p.days:7;
   const days=Math.min(365,Math.max(1,Math.floor(rawDays)));
   const cutoff=Date.now()-days*86400000;
   const candidates=await db.prepare(
    `SELECT a.id FROM accounts a
     WHERE a.is_guest = 1
       AND a.created_at < ?
       AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.user_id = a.id AND s.expires_at > ?)
       AND NOT EXISTS(SELECT 1 FROM progress pr WHERE pr.user_id = a.id)
       AND NOT EXISTS(SELECT 1 FROM user_store us WHERE us.user_id = a.id)
       AND NOT EXISTS(SELECT 1 FROM administrators adm WHERE adm.account_id = a.id)
     LIMIT 300`,
   ).bind(cutoff,Date.now()).all<{id:string}>();
   const ids=(candidates.results??[]).map(r=>r.id);
   if(ids.length){
    const stmts=[];
    for(const uid of ids){
     stmts.push(
      db.prepare('DELETE FROM activity WHERE user_id=?').bind(uid),
      db.prepare('DELETE FROM preferences WHERE user_id=?').bind(uid),
      db.prepare('DELETE FROM practice_preferences WHERE user_id=?').bind(uid),
      db.prepare('DELETE FROM practice_days WHERE user_id=?').bind(uid),
      db.prepare('DELETE FROM accounts WHERE id=? AND is_guest=1').bind(uid),
     );
    }
    await db.batch(stmts);
   }
   return json({ok:true,deleted:ids.length});
  }

  const userId=textValue(p.userId,100,true);
  const target=await db.prepare(
   `SELECT a.id, a.username, a.is_guest, adm.role AS admin_role
    FROM accounts a
    LEFT JOIN administrators adm ON adm.account_id = a.id
    WHERE a.id = ?`,
  ).bind(userId).first<{id:string;username:string;is_guest:number;admin_role:string|null}>();
  if(!target)throw new AuthError('找不到该用户。',404);

  if(action==='updateDisplayName'){
   const displayName=textValue(p.displayName,40,true);
   await db.prepare('UPDATE accounts SET display_name=? WHERE id=?').bind(displayName,userId).run();
   return json({ok:true});
  }

  if(action==='resetPassword'){
   if(target.is_guest===1)throw new AuthError('游客账号不支持设置密码。');
   const password=typeof p.password==='string'?p.password:'';
   if(password.length<8||password.length>128)throw new AuthError('新密码需为 8–128 个字符。');
   const hash=await passwordHash(password);
   await db.batch([
    db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').bind(hash,userId),
    db.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
   ]);
   return json({ok:true});
  }

  if(action==='forceLogout'){
   await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId).run();
   return json({ok:true});
  }

  if(action==='resetQuota'){
   const today=dayNow();
   await db.batch([
    db.prepare('DELETE FROM ai_grade_quota WHERE user_id=? AND day=?').bind(userId,today),
    db.prepare('DELETE FROM ai_tutor_quota WHERE user_id=? AND day=?').bind(userId,today),
   ]);
   return json({ok:true});
  }

  if(action==='sendNotification'){
   const title=textValue(p.title,100,true);
   const body=textValue(p.body??'',600);
   const rawLink=textValue(p.link??'',200);
   const link=rawLink&&rawLink.startsWith('/')?rawLink:'';
   await db.prepare(
    'INSERT INTO notifications(id,user_id,kind,title,body,link,created_at,read_at) VALUES(?,?,?,?,?,?,?,NULL)',
   ).bind(randomUUID(),userId,'system',title,body,link,Date.now()).run();
   return json({ok:true});
  }

  if(action==='deleteUser'){
   if(target.admin_role==='owner')throw new AuthError('不能删除绑定站点管理员的账号。',409);
   const me=await sessionUser(req.headers);
   if(me?.id===userId)throw new AuthError('不能删除当前正在登录的账号。',409);
   await db.batch([
    db.prepare('DELETE FROM progress WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM activity WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM preferences WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM practice_preferences WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM practice_days WHERE user_id=?').bind(userId),
    db.prepare('DELETE FROM accounts WHERE id=?').bind(userId),
   ]);
   return json({ok:true});
  }

  throw new AuthError('操作无效。');
 }catch(e){
  return error(e);
 }
}
