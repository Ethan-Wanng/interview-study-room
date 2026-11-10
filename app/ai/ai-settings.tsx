'use client';
import {useCallback,useEffect,useState} from 'react';
import {Check,KeyRound,Lock,ShieldCheck,SlidersHorizontal,Trash2,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {AI_CONFIG_EVENT,AI_PROVIDERS,DEFAULT_USER_AI_SETTINGS,notifyAiConfigChanged,providerMeta,type AiProviderId,type UserAiSettings} from '@/lib/ai-config';

type ConfigResponse={
 isGuest:boolean;
 username:string;
 settings:UserAiSettings|null;
};

let cachedStatus:ConfigResponse|null=null;

export function useAiConfigStatus(){
 const [state,setState]=useState<ConfigResponse|null>(cachedStatus);
 const refresh=useCallback(async()=>{
  try{
   const res=await fetch('/api/ai-config',{cache:'no-store'});
   if(!res.ok)return;
   const data=await res.json() as ConfigResponse;
   cachedStatus=data;
   setState(data);
  }catch{}
 },[]);
 useEffect(()=>{
  void refresh();
  const onChange=()=>{void refresh()};
  window.addEventListener(AI_CONFIG_EVENT,onChange);
  return()=>window.removeEventListener(AI_CONFIG_EVENT,onChange);
 },[refresh]);
 return {status:state,refresh};
}

export function AiSettingsPanel({onClose}:{onClose?:()=>void}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [loading,setLoading]=useState(!cachedStatus);
 const [isGuest,setIsGuest]=useState(cachedStatus?.isGuest??true);
 const [username,setUsername]=useState(cachedStatus?.username??'');
 const [settings,setSettings]=useState<UserAiSettings>(cachedStatus?.settings??DEFAULT_USER_AI_SETTINGS);

 const [enabled,setEnabled]=useState(settings.enabled);
 const [provider,setProvider]=useState<AiProviderId>(settings.provider);
 const [model,setModel]=useState(settings.model);
 const [apiKey,setApiKey]=useState('');
 const [dailyLimit,setDailyLimit]=useState(settings.dailyLimit);
 const [maxTokens,setMaxTokens]=useState(settings.maxTokens);
 const [allowTutor,setAllowTutor]=useState(settings.allowTutor);
 const [allowGrade,setAllowGrade]=useState(settings.allowGrade);
 const [saving,setSaving]=useState(false);
 const [msg,setMsg]=useState<{ok:boolean;text:string}|null>(null);

 const syncFrom=(data:ConfigResponse)=>{
  setIsGuest(data.isGuest);
  setUsername(data.username);
  const s=data.settings??DEFAULT_USER_AI_SETTINGS;
  setSettings(s);
  setEnabled(s.enabled);
  setProvider(s.provider);
  setModel(s.model);
  setDailyLimit(s.dailyLimit);
  setMaxTokens(s.maxTokens);
  setAllowTutor(s.allowTutor);
  setAllowGrade(s.allowGrade);
 };

 useEffect(()=>{
  let alive=true;
  fetch('/api/ai-config',{cache:'no-store'})
   .then(r=>r.json() as Promise<ConfigResponse>)
   .then(d=>{if(!alive)return;cachedStatus=d;syncFrom(d);setLoading(false)})
   .catch(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[]);

 const meta=providerMeta(provider);

 const pickProvider=(p:AiProviderId)=>{
  setProvider(p);
  const m=providerMeta(p);
  setModel(m.defaultModel);
  setMsg(null);
 };

 const save=async(clearKey=false)=>{
  setSaving(true);
  setMsg(null);
  try{
   const res=await fetch('/api/ai-config',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     enabled:clearKey?false:enabled,
     provider,
     model:model.trim()||meta.defaultModel,
     apiKey:clearKey?undefined:(apiKey.trim()||undefined),
     clearKey,
     dailyLimit,
     maxTokens,
     allowTutor,
     allowGrade,
    }),
   });
   const data=await res.json() as {ok?:boolean;message?:string;settings?:UserAiSettings};
   if(!res.ok||!data.ok){
    setMsg({ok:false,text:data.message??L('保存失败，请检查填写内容。','Save failed.')});
    if(data.settings){
     cachedStatus={isGuest:false,username,settings:data.settings};
     syncFrom(cachedStatus);
    }
   }else if(data.settings){
    cachedStatus={isGuest:false,username,settings:data.settings};
    syncFrom(cachedStatus);
    setApiKey('');
    notifyAiConfigChanged();
    setMsg({ok:true,text:clearKey?L('已清除专属 API Key，恢复使用站点默认 DeepSeek。','Cleared custom API key; using site default DeepSeek.'):L('AI 配置与限制已保存，仅当前账号可用。','Saved! Only your account can use this API key.')});
   }
  }catch{
   setMsg({ok:false,text:L('网络错误，请稍后重试。','Network error.')});
  }finally{
   setSaving(false);
  }
 };

 if(loading){
  return <div className="ai-cfg-box"><p className="muted">{L('正在加载 AI 设置…','Loading AI settings…')}</p></div>;
 }

 if(isGuest){
  return <div className="ai-cfg-box">
   <div className="ai-cfg-head">
    <strong><Lock size={15}/> {L('AI 模型与 API Key 设置','AI Model & API Key')}</strong>
    {onClose&&<button type="button" className="ai-dock-icon" onClick={onClose} title={L('关闭','Close')}><X size={15}/></button>}
   </div>
   <div className="ai-cfg-guest">
    <p><strong>{L('游客模式下不允许替换 API Key','Custom API keys are disabled in Guest mode')}</strong></p>
    <p className="muted">{L('当前正在使用站点默认 DeepSeek 助手。登录你自己的账号后，可配置专属 API Key（适配 OpenAI、Anthropic、Gemini、DeepSeek、通义千问），密钥严格绑定你的账号、仅你本人可用，并可设置每日次数上限与 Token 限制。','Currently using the default DeepSeek assistant. Sign in to bind your own private API key (OpenAI, Anthropic, Gemini, DeepSeek, Qwen) and set usage limits.')}</p>
    <a href="/login" className="button primary" style={{marginTop:6,display:'inline-flex'}}><KeyRound size={15}/> {L('去登录 / 注册账号','Sign in / Register')}</a>
   </div>
  </div>;
 }

 return <div className="ai-cfg-box">
  <div className="ai-cfg-head">
   <strong><SlidersHorizontal size={15}/> {L('专属 AI 模型与限额设置','Private AI Model & Limits')}</strong>
   {onClose&&<button type="button" className="ai-dock-icon" onClick={onClose} title={L('关闭','Close')}><X size={15}/></button>}
  </div>
  <p className="ai-cfg-owner"><ShieldCheck size={14}/> {L(`账号专属隔离：仅登录用户 @${username} 本人可调用此 API Key，其他用户与游客无法使用。`,`Account-isolated: only @${username} can use this API key.`)}</p>

  <label className="ai-cfg-toggle">
   <input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setMsg(null)}}/>
   <span>{L('启用我的专属 API Key（关闭则使用站点默认 DeepSeek）','Enable my private API Key (off = site default DeepSeek)')}</span>
  </label>

  <div className="ai-cfg-field">
   <span className="ai-cfg-label">{L('AI 提供商','Provider')}</span>
   <div className="ai-cfg-providers">
    {AI_PROVIDERS.map(p=><button key={p.id} type="button" className={'ai-cfg-prov'+(provider===p.id?' on':'')} onClick={()=>pickProvider(p.id)}>{p.badge}</button>)}
   </div>
  </div>

  <div className="ai-cfg-field">
   <span className="ai-cfg-label">{L('模型名称','Model')}</span>
   <div className="ai-cfg-models">
    {meta.models.map(m=><button key={m} type="button" className={'ai-cfg-chip'+(model===m?' on':'')} onClick={()=>setModel(m)}>{m}</button>)}
   </div>
   <input className="ai-cfg-input" value={model} onChange={e=>setModel(e.target.value)} placeholder={meta.defaultModel}/>
  </div>

  <div className="ai-cfg-field">
   <span className="ai-cfg-label">{L('API Key','API Key')} {settings.hasKey&&<em className="ai-cfg-saved">{L(`已保存：${settings.maskedKey}`,`Saved: ${settings.maskedKey}`)}</em>}</span>
   <input type="password" className="ai-cfg-input" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={settings.hasKey?L('已加密保存，留空则保持原 Key 不变，输入新值可替换','Leave blank to keep saved key, or enter a new key'):meta.keyPlaceholder}/>
   <small className="muted">{L(meta.keyHint[0],meta.keyHint[1])}</small>
  </div>

  <div className="ai-cfg-limits">
   <strong>{L('调用限制（由你自主控制开销）','Usage Limits')}</strong>
   <div className="ai-cfg-grid">
    <label>
     <span>{L(`每日调用上限（今日已用 ${settings.usedToday} 次，0 为不限）`,`Daily limit (used ${settings.usedToday} today, 0 = unlimited)`)}</span>
     <div className="ai-cfg-inline">
      <input type="number" min={0} max={5000} className="ai-cfg-input" value={dailyLimit} onChange={e=>setDailyLimit(Math.max(0,Number(e.target.value)||0))}/>
      {[20,50,100,0].map(n=><button key={n} type="button" className={'ai-cfg-chip'+(dailyLimit===n?' on':'')} onClick={()=>setDailyLimit(n)}>{n===0?L('不限','∞'):`${n}`}</button>)}
     </div>
    </label>
    <label>
     <span>{L('单次最大输出 Token 限制','Max output tokens per request')}</span>
     <div className="ai-cfg-inline">
      {[512,1024,2048,4096].map(n=><button key={n} type="button" className={'ai-cfg-chip'+(maxTokens===n?' on':'')} onClick={()=>setMaxTokens(n)}>{n}</button>)}
     </div>
    </label>
   </div>
   <div className="ai-cfg-scenes">
    <label><input type="checkbox" checked={allowTutor} onChange={e=>setAllowTutor(e.target.checked)}/> {L('允许用于「AI 老师问答 / AI 客服演练」','Allow for AI Tutor & Support Sandbox')}</label>
    <label><input type="checkbox" checked={allowGrade} onChange={e=>setAllowGrade(e.target.checked)}/> {L('允许用于「主观题 AI 评分」','Allow for AI Grading')}</label>
   </div>
  </div>

  {msg&&<p className={msg.ok?'ai-cfg-msg ok':'ai-cfg-msg err'}>{msg.text}</p>}

  <div className="ai-cfg-actions">
   <button type="button" className="button primary" disabled={saving} onClick={()=>void save(false)}><Check size={15}/> {saving?L('保存中…','Saving…'):L('保存 AI 设置','Save settings')}</button>
   {settings.hasKey&&<button type="button" className="button secondary" disabled={saving} onClick={()=>void save(true)}><Trash2 size={15}/> {L('清除 Key 并恢复默认','Clear key & reset')}</button>}
  </div>
 </div>;
}
