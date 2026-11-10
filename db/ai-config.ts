import {studyDb,dayNow} from './study';
import {AI_PROVIDERS,DEFAULT_USER_AI_SETTINGS,maskApiKey,providerMeta,type AiProviderId,type RuntimeAiConfig,type UserAiSettings} from '@/lib/ai-config';

type StoredRow={
 user_id:string;
 enabled:number;
 provider:string;
 model:string;
 api_key:string;
 daily_limit:number;
 max_tokens:number;
 allow_tutor:number;
 allow_grade:number;
 updated_at:number;
};

const memConfigs=new Map<string,StoredRow>();
const memUsage=new Map<string,number>();

async function ensureTables(){
 const db=studyDb();
 await db.prepare(`CREATE TABLE IF NOT EXISTS user_ai_configs (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'deepseek',
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  api_key TEXT NOT NULL DEFAULT '',
  daily_limit INTEGER NOT NULL DEFAULT 50,
  max_tokens INTEGER NOT NULL DEFAULT 2048,
  allow_tutor INTEGER NOT NULL DEFAULT 1,
  allow_grade INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL DEFAULT 0
 )`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS user_ai_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
 )`).run();
 return db;
}

export async function getUserAiSettings(userId:string):Promise<UserAiSettings>{
 const day=dayNow();
 try{
  const db=await ensureTables();
  const [row,usage]=await Promise.all([
   db.prepare('SELECT * FROM user_ai_configs WHERE user_id=?').bind(userId).first<StoredRow>(),
   db.prepare('SELECT count FROM user_ai_usage WHERE user_id=? AND day=?').bind(userId,day).first<{count:number}>(),
  ]);
  if(!row)return {...DEFAULT_USER_AI_SETTINGS,usedToday:usage?.count??0};
  const provider=(AI_PROVIDERS.some(p=>p.id===row.provider)?row.provider:'deepseek') as AiProviderId;
  const meta=providerMeta(provider);
  return {
   enabled:Boolean(row.enabled)&&Boolean(row.api_key),
   provider,
   model:row.model||meta.defaultModel,
   hasKey:Boolean(row.api_key),
   maskedKey:maskApiKey(row.api_key),
   dailyLimit:Number.isFinite(row.daily_limit)?Math.max(0,row.daily_limit):50,
   maxTokens:Number.isFinite(row.max_tokens)?Math.max(256,Math.min(8192,row.max_tokens)):2048,
   allowTutor:row.allow_tutor!==0,
   allowGrade:row.allow_grade!==0,
   usedToday:usage?.count??0,
  };
 }catch{
  const row=memConfigs.get(userId);
  const usedToday=memUsage.get(`${userId}:${day}`)??0;
  if(!row)return {...DEFAULT_USER_AI_SETTINGS,usedToday};
  const provider=(AI_PROVIDERS.some(p=>p.id===row.provider)?row.provider:'deepseek') as AiProviderId;
  const meta=providerMeta(provider);
  return {
   enabled:Boolean(row.enabled)&&Boolean(row.api_key),
   provider,
   model:row.model||meta.defaultModel,
   hasKey:Boolean(row.api_key),
   maskedKey:maskApiKey(row.api_key),
   dailyLimit:row.daily_limit,
   maxTokens:row.max_tokens,
   allowTutor:row.allow_tutor!==0,
   allowGrade:row.allow_grade!==0,
   usedToday,
  };
 }
}

export async function saveUserAiSettings(
 userId:string,
 input:{
  enabled:boolean;
  provider:AiProviderId;
  model:string;
  apiKey?:string; // undefined 表示保留已保存的 key；'' 表示清空 key
  dailyLimit:number;
  maxTokens:number;
  allowTutor:boolean;
  allowGrade:boolean;
 }
):Promise<UserAiSettings>{
 const now=Date.now();
 const meta=providerMeta(input.provider);
 const model=(input.model.trim()||meta.defaultModel).slice(0,120);
 const dailyLimit=Math.max(0,Math.min(5000,Math.round(Number(input.dailyLimit)||0)));
 const maxTokens=Math.max(256,Math.min(8192,Math.round(Number(input.maxTokens)||2048)));
 const allowTutor=input.allowTutor?1:0;
 const allowGrade=input.allowGrade?1:0;

 try{
  const db=await ensureTables();
  const existing=await db.prepare('SELECT api_key FROM user_ai_configs WHERE user_id=?').bind(userId).first<{api_key:string}>();
  const finalKey=input.apiKey===undefined?(existing?.api_key??''):input.apiKey.trim();
  const enabled=input.enabled&&Boolean(finalKey)?1:0;
  await db.prepare(`INSERT INTO user_ai_configs(user_id,enabled,provider,model,api_key,daily_limit,max_tokens,allow_tutor,allow_grade,updated_at)
   VALUES(?,?,?,?,?,?,?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET
    enabled=excluded.enabled,
    provider=excluded.provider,
    model=excluded.model,
    api_key=excluded.api_key,
    daily_limit=excluded.daily_limit,
    max_tokens=excluded.max_tokens,
    allow_tutor=excluded.allow_tutor,
    allow_grade=excluded.allow_grade,
    updated_at=excluded.updated_at`)
   .bind(userId,enabled,input.provider,model,finalKey,dailyLimit,maxTokens,allowTutor,allowGrade,now)
   .run();
 }catch{
  const existing=memConfigs.get(userId);
  const finalKey=input.apiKey===undefined?(existing?.api_key??''):input.apiKey.trim();
  const enabled=input.enabled&&Boolean(finalKey)?1:0;
  memConfigs.set(userId,{
   user_id:userId,
   enabled,
   provider:input.provider,
   model,
   api_key:finalKey,
   daily_limit:dailyLimit,
   max_tokens:maxTokens,
   allow_tutor:allowTutor,
   allow_grade:allowGrade,
   updated_at:now,
  });
 }
 return getUserAiSettings(userId);
}

// 为当前已登录用户准备本次调用的 AI 配置与限额检查（游客绝不调用此函数，只用站点默认）。
export type PrepareCustomAiResult=
 |{mode:'site'}
 |{mode:'blocked';message:string;remaining:0}
 |{mode:'custom';config:RuntimeAiConfig;remaining:number;refund:()=>Promise<void>};

export async function prepareCustomAi(userId:string,scene:'tutor'|'grade'):Promise<PrepareCustomAiResult>{
 const day=dayNow();
 let row:StoredRow|null=null;
 try{
  const db=await ensureTables();
  row=await db.prepare('SELECT * FROM user_ai_configs WHERE user_id=?').bind(userId).first<StoredRow>();
 }catch{
  row=memConfigs.get(userId)??null;
 }
 if(!row||!row.enabled||!row.api_key)return {mode:'site'};
 // 检查用户自己设置的场景限制
 if(scene==='tutor'&&row.allow_tutor===0){
  return {mode:'blocked',remaining:0,message:'你在「AI 设置」中已限制专属 API 不用于「AI 老师问答」。可在 AI 设置中开启该权限，或关闭专属 API 改用站点默认模型。'};
 }
 if(scene==='grade'&&row.allow_grade===0){
  return {mode:'blocked',remaining:0,message:'你在「AI 设置」中已限制专属 API 不用于「主观题 AI 评分」。可在 AI 设置中开启该权限，或关闭专属 API 改用站点默认模型。'};
 }
 const provider=(AI_PROVIDERS.some(p=>p.id===row!.provider)?row.provider:'deepseek') as AiProviderId;
 const meta=providerMeta(provider);
 const limit=Math.max(0,row.daily_limit);
 const maxTokens=Math.max(256,Math.min(8192,row.max_tokens||2048));

 try{
  const db=studyDb();
  if(limit>0){
   const usedRow=await db.prepare(
    'INSERT INTO user_ai_usage(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count'
   ).bind(userId,day,limit).first<{count:number}>();
   if(!usedRow){
    return {
     mode:'blocked',
     remaining:0,
     message:`已达到你为专属 API（${meta.name}）设置的每日上限（${limit} 次/天）。可在「AI 设置」中调高每日上限，或切换回站点默认模型。`,
    };
   }
   return {
    mode:'custom',
    config:{provider,model:row.model||meta.defaultModel,apiKey:row.api_key,maxTokens,isCustom:true},
    remaining:Math.max(0,limit-usedRow.count),
    refund:async()=>{await db.prepare('UPDATE user_ai_usage SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(userId,day).run().catch(()=>{})},
   };
  }else{
   const usedRow=await db.prepare(
    'INSERT INTO user_ai_usage(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 RETURNING count'
   ).bind(userId,day).first<{count:number}>();
   return {
    mode:'custom',
    config:{provider,model:row.model||meta.defaultModel,apiKey:row.api_key,maxTokens,isCustom:true},
    remaining:999,
    refund:async()=>{await db.prepare('UPDATE user_ai_usage SET count=MAX(count-1,0) WHERE user_id=? AND day=?').bind(userId,day).run().catch(()=>{})},
   };
  }
 }catch{
  const k=`${userId}:${day}`,cur=memUsage.get(k)??0;
  if(limit>0&&cur>=limit){
   return {
    mode:'blocked',
    remaining:0,
    message:`已达到你为专属 API（${meta.name}）设置的每日上限（${limit} 次/天）。可在「AI 设置」中调高每日上限，或切换回站点默认模型。`,
   };
  }
  memUsage.set(k,cur+1);
  return {
   mode:'custom',
   config:{provider,model:row.model||meta.defaultModel,apiKey:row.api_key,maxTokens,isCustom:true},
   remaining:limit>0?Math.max(0,limit-(cur+1)):999,
   refund:async()=>{memUsage.set(k,Math.max(0,(memUsage.get(k)??1)-1))},
  };
 }
}
