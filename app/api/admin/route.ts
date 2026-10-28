import {studyDb} from '@/db/study';
import {catalog,asPractice} from '@/db/catalog';
import {plans,planSubjectIds} from '@/db/practice-plans';
import {shuffle} from '@/db/practice';
import {AuthError,assertSameOrigin,hashToken,rateLimit} from '@/lib/site-auth';
import {newKey,requireAdmin,currentAdmin,canEdit,requireScope,adminCookie,adminToken,clearAdminCookie,bootstrapHash,type Administrator} from '@/lib/admin-auth';
import {nameKey,textValue,questionInput} from '@/lib/admin-validation';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const json=(v:unknown,cookie?:string)=>Response.json(v,{headers:{...noCache,...(cookie?{'Set-Cookie':cookie}:{})}});
async function panel(a:Administrator){const db=studyDb(),c=await catalog();const [invites,admins]=await Promise.all([a.role==='owner'?db.prepare('SELECT id,creator_id,subjects,allow_new,expires_at,used_by,revoked FROM admin_invites ORDER BY created_at DESC LIMIT 100').all():db.prepare('SELECT id,creator_id,subjects,allow_new,expires_at,used_by,revoked FROM admin_invites WHERE creator_id=? ORDER BY created_at DESC LIMIT 100').bind(a.id).all(),a.role==='owner'?db.prepare('SELECT id,name,role,subjects,enabled,created_by FROM administrators ORDER BY created_at DESC').all():Promise.resolve({results:[]})]);return {spaces:c.spaces.filter(s=>a.role==='owner'||s.createdBy===a.id||c.subjects.some(x=>x.spaceId===s.id&&canEdit(a,x.id))),plans:(await plans()).filter(p=>planSubjectIds(p).every(id=>canEdit(a,id))),admin:a,subjects:c.subjects.filter(s=>canEdit(a,s.id)),questions:c.questions.filter(q=>canEdit(a,q.subjectId)),invites:invites.results,administrators:admins.results}}
export async function GET(req:Request){try{return json(await panel(await requireAdmin(req.headers)))}catch(e){return error(e)}}
function error(e:unknown){if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers:noCache});console.error('Admin operation failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'后台暂时不可用，请重试；未保存的输入仍保留在页面。'},{status:503,headers:noCache})}
export async function POST(req:Request){try{assertSameOrigin(req);const raw=await req.text();if(raw.length>2000000)throw new AuthError('内容过长，请缩短后重试。');let p:any;try{p=JSON.parse(raw)}catch{throw new AuthError('请求格式无效。')}if(!p||typeof p!=='object')throw new AuthError('请求格式无效。');const db=studyDb(),now=Date.now();
 if(['login','register','inspectInvite'].includes(p.action))await rateLimit('admin-entry:'+(req.headers.get('cf-connecting-ip')??'unknown'),25);
 if(p.action==='login'){
  const key=textValue(p.key,100,true);if(!/^adm_[a-f0-9]{64}$/.test(key))throw new AuthError('管理密钥无效。',401);const hash=hashToken(key);
  if(hash===bootstrapHash())await db.prepare("INSERT OR IGNORE INTO administrators(id,name,key_hash,role,subjects,enabled,created_by,created_at) VALUES('owner','站点管理员',?,'owner','[]',1,NULL,?)").bind(hash,now).run();
  const a=await db.prepare('SELECT id FROM administrators WHERE key_hash=? AND enabled=1').bind(hash).first<{id:string}>();if(!a)throw new AuthError('管理密钥无效或已停用。',401);return json({ok:true},await adminCookie(a.id));
 }
 if(p.action==='register'||p.action==='inspectInvite'){
  const key=textValue(p.inviteKey,100,true);if(!/^inv_[a-f0-9]{64}$/.test(key))throw new AuthError('邀请密钥无效、已使用或已过期。',400);
  const invite=await db.prepare('SELECT i.* FROM admin_invites i JOIN administrators a ON a.id=i.creator_id WHERE i.key_hash=? AND i.used_by IS NULL AND i.revoked=0 AND i.expires_at>? AND a.enabled=1').bind(hashToken(key),now).first<{id:string;creator_id:string;subjects:string;allow_new:number}>();if(!invite)throw new AuthError('邀请密钥无效、已使用或已过期。',400);
  const c=await catalog(),allowed=JSON.parse(invite.subjects) as string[];
  if(p.action==='inspectInvite')return json({subjects:c.subjects.filter(s=>invite.allow_new||allowed.includes(s.id)),allowNew:!!invite.allow_new});
  const name=textValue(p.name,60,true),names=textValue(p.subjectNames,1000,true).split(/[,，;；\n]/).map(s=>s.trim()).filter(Boolean);if(!names.length||names.length>20)throw new AuthError('请填写 1–20 个负责学科，用逗号或换行分隔。');
  const selected=new Map<string,{id:string;name:string;nameEn:string;fresh:boolean}>();for(const name of names){const found=c.subjects.find(s=>nameKey(s.name)===nameKey(name)||nameKey(s.nameEn)===nameKey(name)||(s.id==='go'&&nameKey(name)==='go 语言'));if(found){if(!invite.allow_new&&!allowed.includes(found.id))throw new AuthError('填写的学科超出了邀请授权范围。',403);selected.set(found.id,{...found,fresh:false})}else{if(!invite.allow_new)throw new AuthError('填写的学科超出了邀请授权范围。',403);textValue(name,80,true);const normalized=nameKey(name);if(![...selected.values()].some(s=>nameKey(s.name)===normalized))selected.set(normalized,{id:'s-'+crypto.randomUUID(),name,nameEn:name,fresh:true})}}
  const id=crypto.randomUUID(),loginKey=newKey(),scopes=[...selected.values()].map(s=>s.id);const batch=[db.prepare('UPDATE admin_invites SET used_by=? WHERE id=? AND used_by IS NULL AND revoked=0 AND expires_at>? AND EXISTS(SELECT 1 FROM administrators WHERE administrators.id=admin_invites.creator_id AND administrators.enabled=1) RETURNING id').bind(id,invite.id,now),db.prepare("INSERT INTO administrators(id,name,key_hash,role,subjects,enabled,created_by,created_at) SELECT ?,?,?,'editor',?,1,?,? WHERE EXISTS(SELECT 1 FROM admin_invites WHERE id=? AND used_by=?)").bind(id,name,hashToken(loginKey),JSON.stringify(scopes),invite.creator_id,now,invite.id,id)];
  for(const subject of selected.values())if(subject.fresh)batch.push(db.prepare('INSERT INTO subjects(id,name,name_en,name_key,created_by) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM admin_invites WHERE id=? AND used_by=?)').bind(subject.id,subject.name,subject.nameEn,nameKey(subject.name),id,invite.id,id));
  const results=await db.batch(batch);if(!results[0].results.length)throw new AuthError('邀请密钥无效、已使用或已过期。',409);return json({ok:true,key:loginKey},await adminCookie(id));
 }
 const a=await requireAdmin(req.headers);
 if(p.action==='logout'){const token=adminToken(req.headers);if(token)await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(hashToken(token)).run();return json({ok:true},clearAdminCookie())}
 if(p.action==='rotateKey'){const key=newKey();await db.batch([db.prepare('UPDATE administrators SET key_hash=? WHERE id=?').bind(hashToken(key),a.id),db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(a.id)]);return json({ok:true,key},await adminCookie(a.id))}
 if(p.action==='invite'){
  const c=await catalog();if(!Array.isArray(p.subjects)||p.subjects.length>50||p.subjects.some((s:unknown)=>typeof s!=='string'||!c.subjects.some(x=>x.id===s)))throw new AuthError('邀请学科无效。');const allowNew=p.allowNew===true;if(allowNew&&a.role!=='owner')throw new AuthError('只有站点管理员可以授权新学科。',403);if(!allowNew&&!p.subjects.length)throw new AuthError('请选择邀请授权的学科。');for(const s of p.subjects)requireScope(a,s);
  const key=newKey('inv');await db.prepare('INSERT INTO admin_invites(id,key_hash,creator_id,subjects,allow_new,expires_at,used_by,revoked,created_at) VALUES(?,?,?,?,?,?,NULL,0,?)').bind(crypto.randomUUID(),hashToken(key),a.id,JSON.stringify([...new Set(p.subjects)]),allowNew?1:0,now+7*86400000,now).run();return json({ok:true,key});
 }
 if(p.action==='revokeInvite'){const invite=await db.prepare('SELECT creator_id FROM admin_invites WHERE id=?').bind(textValue(p.id,100,true)).first<{creator_id:string}>();if(!invite||(a.role!=='owner'&&invite.creator_id!==a.id))throw new AuthError('没有操作权限。',403);await db.prepare('UPDATE admin_invites SET revoked=1 WHERE id=?').bind(p.id).run();return json({ok:true})}
 if(p.action==='disableAdmin'){if(a.role!=='owner'||p.id==='owner')throw new AuthError('没有操作权限。',403);await db.batch([db.prepare('UPDATE administrators SET enabled=0 WHERE id=?').bind(textValue(p.id,100,true)),db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(p.id),db.prepare('UPDATE admin_invites SET revoked=1 WHERE creator_id=?').bind(p.id)]);return json({ok:true})}
 if(p.action==='space'){
  const name=textValue(p.name,80,true),nameEn=textValue(p.nameEn||name,80,true),c=await catalog();if(c.spaces.some(s=>nameKey(s.name)===nameKey(name)))throw new AuthError('该空间已存在。',409);await db.prepare('INSERT INTO spaces(id,name,name_en,created_by) VALUES(?,?,?,?)').bind('sp-'+crypto.randomUUID(),name,nameEn,a.id).run();return json({ok:true});
 }
 if(p.action==='deleteSubject'){
  const id=textValue(p.id,100,true);requireScope(a,id);
  if(['go','backend','ai-development','frontend'].includes(id))throw new AuthError('Go、后端通用、AI 开发和前端开发是系统学科，不能删除。',409);
  if(!await db.prepare('SELECT id FROM subjects WHERE id=?').bind(id).first())throw new AuthError('学科不存在或已删除。',404);
  try{
   await db.batch([
    db.prepare('DELETE FROM subjects WHERE id=?').bind(id),
    db.prepare("UPDATE administrators SET subjects=(SELECT json_group_array(value) FROM json_each(administrators.subjects) WHERE value<>?) WHERE role='editor'").bind(id),
    db.prepare("UPDATE admin_invites SET revoked=1 WHERE used_by IS NULL AND EXISTS(SELECT 1 FROM json_each(admin_invites.subjects) WHERE value=?)").bind(id),
   ]);
  }catch(e){if(e instanceof Error&&(e.message+' '+String(e.cause??'')).includes('SUBJECT_IN_USE'))throw new AuthError('该学科仍有关联题目或历史方案，暂不能删除。请先将题目移动到其他学科；历史记录需要保留。',409);throw e}
  return json({ok:true});
 }
 if(p.action==='subject'){
  const name=textValue(p.name,80,true),nameEn=textValue(p.nameEn||name,80,true),c=await catalog();if(c.subjects.some(s=>[nameKey(s.name),nameKey(s.nameEn)].includes(nameKey(name))))throw new AuthError('该学科已存在。',409);const spaceId=textValue(p.spaceId??'go-interview',100,true),space=c.spaces.find(s=>s.id===spaceId);if(!space)throw new AuthError('请选择有效空间。');if(a.role!=='owner'&&space.createdBy!==a.id&&!c.subjects.some(s=>s.spaceId===spaceId&&canEdit(a,s.id)))throw new AuthError('你没有管理该空间的权限。',403);const id='s-'+crypto.randomUUID();await db.batch([db.prepare('INSERT INTO subjects(id,name,name_en,name_key,created_by,space_id) VALUES(?,?,?,?,?,?)').bind(id,name,nameEn,nameKey(name),a.id,spaceId),db.prepare("UPDATE administrators SET subjects=json_insert(subjects,'$[#]',?) WHERE id=? AND role='editor'").bind(id,a.id)]);return json({ok:true});
 }
 if(p.action==='importQuestions'){
  if(!Array.isArray(p.questions)||!p.questions.length||p.questions.length>100)throw new AuthError('每次导入 1–100 道题。');const c=await catalog();
  const questions=p.questions.map((v:any)=>{if(typeof v.id!=='string'||!/^imp-[a-f0-9-]{36}$/.test(v.id))throw new AuthError('导入编号无效。');const q=questionInput({...v,status:'draft',revision:1},v.id);requireScope(a,q.subjectId);if(!c.subjects.some(s=>s.id===q.subjectId))throw new AuthError('请选择有效学科。');const old=c.questions.find(x=>x.id===q.id);if(old)requireScope(a,old.subjectId);return q});
  await db.batch(questions.map((q:any)=>db.prepare('INSERT OR IGNORE INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(q.id,q.subjectId,q.kind,'draft',JSON.stringify(q),1,a.id,now)));return json({ok:true,count:questions.length});
 }
 if(p.action==='generatePlan'||p.action==='savePlan'){
  const c=await catalog(),subjectId=textValue(p.subjectId,100,true);requireScope(a,subjectId);if(!c.subjects.some(s=>s.id===subjectId))throw new AuthError('请选择有效学科。');
  if(!['exam','interview','random'].includes(p.mode)||![30,60].includes(p.minutes))throw new AuthError('请选择模式及 30 或 60 分钟。');
  const title=textValue(p.title,120,true),chapter=textValue(p.chapter??'',100);const pool=c.questions.filter(q=>q.subjectId===subjectId&&q.kind==='practice'&&q.status==='published'&&(!chapter||q.section===chapter));let chosen;
  if(p.action==='generatePlan'&&p.ids===undefined){
   const types=['choice','fill','short','code'];if(!p.counts||types.some(t=>!Number.isInteger(p.counts[t])||p.counts[t]<0||p.counts[t]>30))throw new AuthError('每种题型数量应为 0–30。');
   if(p.mode==='interview'&&(p.counts.choice||p.counts.fill))throw new AuthError('模拟面试请选择简答或代码题。');
   if(types.reduce((n,t)=>n+p.counts[t],0)>60)throw new AuthError('每份最多 60 道题。');
   chosen=shuffle(types.flatMap(t=>{const candidates=pool.filter(q=>q.type===t);if(candidates.length<p.counts[t])throw new AuthError('题量不足：'+t+'，当前可用 '+candidates.length+' 道。请减少数量或先添加题目。');return shuffle(candidates).slice(0,p.counts[t])}));
  }else{if(!Array.isArray(p.ids)||p.ids.length>60||new Set(p.ids).size!==p.ids.length)throw new AuthError('题目列表无效。');chosen=p.ids.map((id:string)=>{const q=pool.find(q=>q.id===id);if(!q)throw new AuthError('题目已变更或下架，请重新生成。',409);if(p.mode==='interview'&&!['short','code'].includes(q.type))throw new AuthError('模拟面试请选择简答或代码题。');return q})}
  if(!chosen.length)throw new AuthError('请至少选择一道题。');const plan={id:crypto.randomUUID(),title,subjectId,chapter,mode:p.mode,minutes:p.minutes,status:p.status==='published'?'published':'draft',questions:chosen.map(asPractice)};
  if(p.action==='savePlan'){try{await db.prepare('INSERT INTO practice_plans(id,subject_id,status,payload,created_by,created_at) VALUES(?,?,?,?,?,?)').bind(plan.id,subjectId,plan.status,JSON.stringify(plan),a.id,now).run()}catch(e){if(e instanceof Error&&/QUESTION_SET_ALREADY_EXISTS|UNIQUE constraint failed: practice_plan_names\.(?:space_id|type|name)\b/.test(e.message+' '+String(e.cause??'')))return Response.json({success:false,error:title+' 已存在',code:'QUESTION_SET_ALREADY_EXISTS',message:title+' 已存在'},{status:409,headers:noCache});throw e}}return json({ok:true,plan});
 }
 if(p.action==='planStatus'){
  const plan=(await plans()).find(x=>x.id===p.id);if(!plan)throw new AuthError('找不到该训练方案。',404);for(const subjectId of planSubjectIds(plan))requireScope(a,subjectId);if(p.status==='published'){const c=await catalog();if(plan.questions.some(s=>!c.questions.some(q=>q.id===s.question.id&&q.status==='published')))throw new AuthError('方案包含已删除或下架的题目，请重新组卷。',409)}if(!['draft','published','archived'].includes(p.status))throw new AuthError('状态无效。');await db.prepare('UPDATE practice_plans SET status=? WHERE id=?').bind(p.status,plan.id).run();return json({ok:true});
 }
 if(p.action==='deleteQuestion'){
  const c=await catalog(),q=c.questions.find(q=>q.id===p.id);if(!q)throw new AuthError('题目不存在，请重新载入。',404);requireScope(a,q.subjectId);if(p.revision!==q.revision)throw new AuthError('题目已被其他管理员修改，请重新载入后再编辑。',409);
  const revision=q.revision+1;const result=await db.batch([db.prepare("INSERT INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,'deleted',?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='deleted',revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE managed_questions.revision=? RETURNING id").bind(q.id,q.subjectId,q.kind,JSON.stringify(q),revision,a.id,now,q.revision),db.prepare("UPDATE practice_plans SET status='archived' WHERE EXISTS(SELECT 1 FROM json_each(practice_plans.payload,'$.questions') WHERE json_extract(value,'$.question.id')=?) AND EXISTS(SELECT 1 FROM managed_questions WHERE id=? AND status='deleted' AND revision=?)").bind(q.id,q.id,revision)]);if(!result[0].results.length)throw new AuthError('题目已被其他管理员修改，请重新载入后再编辑。',409);return json({ok:true});
 }
 if(p.action==='saveQuestion'){
  const c=await catalog(),id=p.question?.id||'m-'+crypto.randomUUID(),old=c.questions.find(q=>q.id===id);if(p.question?.id&&!old)throw new AuthError('题目不存在，请重新载入。',404);const q=questionInput(p.question,id);if(!c.subjects.some(s=>s.id===q.subjectId))throw new AuthError('请选择有效学科。');requireScope(a,q.subjectId);if(old){requireScope(a,old.subjectId);if(old.kind!==q.kind)throw new AuthError('不能变更已有题目的题库类型。');if(old.revision!==q.revision)throw new AuthError('题目已被其他管理员修改，请重新载入后再编辑。',409)}
  if(q.kind==='practice'&&q.type==='choice'){q.zh.answer=q.zh.options[Number(q.accepted[0])]??'';if(q.en)q.en.answer=q.en.options[Number(q.accepted[0])]??''}const revision=(old?.revision??0)+1;q.revision=revision;const updated=await db.prepare('INSERT INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,kind=excluded.kind,status=excluded.status,payload=excluded.payload,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE managed_questions.revision=? RETURNING id').bind(id,q.subjectId,q.kind,q.status,JSON.stringify(q),revision,a.id,now,old?.revision??0).first();if(!updated)throw new AuthError('题目已被其他管理员修改，请重新载入后再编辑。',409);return json({ok:true,question:q});
 }
 throw new AuthError('操作无效。');
 }catch(e){return error(e)}}
