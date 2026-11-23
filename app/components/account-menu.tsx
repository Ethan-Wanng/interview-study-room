'use client';
import {useGeminiAutoProxy} from '../ai/gemini-proxy-pref';
import {useModelThinkingLevel,useStoredNoteModel,useStoredTutorModel} from '../ai/thinking-pref';
import {useGradeModel} from '../ai/grade-client';
import {useAiConfigStatus} from '../ai/ai-settings';
import {providerMeta} from '@/lib/ai-config';
import {getGradeThinkingSpec,getTutorThinkingSpec,THINKING_META,type ModelThinkingSpec} from '@/lib/thinking';
import {TUTOR_MODELS} from '@/lib/tutor-types';
import {GRADE_MODELS} from '@/lib/grade-types';
type ProxyCheckItem={
 id:'primary'|'standby'|'direct'|'gemini4';
 protocol:string;
 ok:boolean;
 state:'ok'|'busy'|'quota'|'blocked'|'error';
 status:number;
 ms:number;
 detail:string;
};
type ProxyQuotaItem={
 model:string;
 label:string;
 rpm:{used:number;limit:number};
 tpm:{used:number;limit:number};
 rpd:{used:number;limit:number};
 coolingSec:number;
};
type ProxyCheckResult={
 cnDay:number;
 slot:'day1-15'|'day16-end';
 colo:string;
 mode:'worker-tunnel'|'gateway';
 checks:ProxyCheckItem[];
 quotas?:ProxyQuotaItem[];
};
const fmtTok=(n:number)=>n>=1000?`${(n/1000).toFixed(n>=10000?0:1)}K`:String(n);
function GeminiProxyRow({L}:{L:(zh:string,en:string)=>string}){
 const [auto,setAuto]=useGeminiAutoProxy();
 const [checking,setChecking]=useState(false);
 const [res,setRes]=useState<ProxyCheckResult|null>(null);
 const [err,setErr]=useState('');
 const runCheck=async()=>{
  if(checking)return;
  setChecking(true);
  setErr('');
  try{
   const r=await fetch('/api/gemini-proxy-check',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:'{}',
   });
   const d=await r.json() as ProxyCheckResult&{error?:string};
   if(!r.ok)throw new Error(d.error??L('检测失败','Check failed'));
   setRes(d);
  }catch(e){
   setErr((e as Error).message||L('检测失败','Check failed'));
  }finally{
   setChecking(false);
  }
 };
 const rowLabel=(id:ProxyCheckItem['id'])=>
  id==='primary'?L('当前节点','Primary')
  :id==='standby'?L('备用节点','Standby')
  :id==='direct'?L('直连','Direct')
  :'Gemini 4';
 const stateLabel=(c:ProxyCheckItem)=>
  c.state==='ok'?L('正常','OK')
  :c.state==='busy'?L('高负载 503','Busy 503')
  :c.state==='quota'?L('限流 429','Quota 429')
  :c.state==='blocked'?L('地区受限','Geo-blocked')
  :c.detail==='timeout'?L('超时','Timeout')
  :L('不可达','Failed');
 const stateTone=(c:ProxyCheckItem)=>
  c.state==='ok'?'ok'
  :c.state==='busy'||c.state==='quota'?'warn'
  :'err';
 return (
  <div className="settings-row settings-row-col">
   <div className="settings-row-head">
    <span className="settings-label">{L('Gemini 自动代理','Gemini auto proxy')}</span>
    <div className="settings-net-ctrls">
     <button type="button" className="settings-net-btn" disabled={checking} onClick={()=>void runCheck()}>
      {checking?<Loader2 size={13} className="ai-spin"/>:<Activity size={13}/>}
      <span>{checking?L('检测中…','Checking…'):L('网络检查','Check')}</span>
     </button>
     <div className="settings-seg" role="group" aria-label={L('Gemini 自动代理','Gemini auto proxy')}>
      <button type="button" className={auto?'on':''} onClick={()=>setAuto(true)}>{L('开启','On')}</button>
      <button type="button" className={!auto?'on':''} onClick={()=>setAuto(false)}>{L('关闭','Off')}</button>
     </div>
    </div>
   </div>
   {err&&<span className="settings-net-err" role="alert">{err}</span>}
   {res&&(
    <div className="settings-net-panel">
     <div className="settings-net-meta">
      <span>{res.slot==='day1-15'?L(`${res.cnDay} 日 · 1–15 日原节点`,`Day ${res.cnDay} · Primary (1–15)`):L(`${res.cnDay} 日 · 16–月末新节点`,`Day ${res.cnDay} · New (16–end)`)}</span>
      {res.colo&&<span>{res.colo}</span>}
     </div>
     {res.checks.map(c=>(
      <div key={c.id} className="settings-net-item">
       <span className="settings-net-left">
        <i className={'settings-net-dot '+stateTone(c)}/>
        <b>{rowLabel(c.id)}</b>
       </span>
       <span className="settings-net-right">
        <span className="settings-net-ms">{c.ms}ms</span>
        <span className={'settings-net-tag '+stateTone(c)}>{stateLabel(c)}</span>
       </span>
      </div>
     ))}
     {res.quotas&&res.quotas.filter(q=>!q.model.startsWith('antigravity-')).length>0&&(
      <div className="settings-net-quotas">
       {res.quotas.filter(q=>!q.model.startsWith('antigravity-')).map(q=>(
        <div key={q.model} className="settings-net-qrow">
         <b>{q.label}</b>
         <span>RPM {q.rpm.used}/{q.rpm.limit} · TPM {fmtTok(q.tpm.used)}/{fmtTok(q.tpm.limit)} · RPD {q.rpd.used}/{q.rpd.limit}{q.coolingSec>0?` (${q.coolingSec}s)`:''}</span>
        </div>
       ))}
      </div>
     )}
    </div>
   )}
  </div>
 );
}
function NoteModelRow({L,isGuest}:{L:(zh:string,en:string)=>string;isGuest:boolean}){
 const [noteModel,setNoteModel]=useStoredNoteModel();
 const {status}=useAiConfigStatus();
 const guest=isGuest||Boolean(status?.isGuest);
 const customOn=Boolean(!guest&&status?.settings?.enabled&&status?.settings?.hasKey&&status?.settings?.allowTutor);
 const customLabel=customOn&&status?.settings
  ?`${providerMeta(status.settings.provider).badge} · ${status.settings.model||providerMeta(status.settings.provider).defaultModel}`
  :'';
 const visibleModels=guest?TUTOR_MODELS.filter(m=>m.provider!=='gemini'):TUTOR_MODELS;
 const value=noteModel==='custom'&&!customOn?'auto':(guest&&TUTOR_MODELS.find(m=>m.id===noteModel)?.provider==='gemini'?'auto':noteModel);
 return (
  <div className="settings-row">
   <span className="settings-label">{L('笔记 AI 模型','Note AI model')}</span>
   <select
    className="theme-select settings-theme-select"
    value={value}
    onChange={e=>setNoteModel(e.target.value)}
    aria-label={L('笔记 AI 模型','Note AI model')}
   >
    <option value="auto">{L('默认（自动）','Default (Auto)')}</option>
    {customOn&&<option value="custom">{L(`专属 API（${customLabel}）`,`Custom (${customLabel})`)}</option>}
    {visibleModels.map(m=>(
     <option key={m.id} value={m.id}>{L(m.label[0],m.label[1])}</option>
    ))}
   </select>
  </div>
 );
}
function ModelThinkingSeg({title,scopeKey,spec,L}:{title:string;scopeKey:string;spec:ModelThinkingSpec;L:(zh:string,en:string)=>string}){
 const [thinking,setThinking]=useModelThinkingLevel(scopeKey,spec);
 return (
  <div className="settings-think-item">
   <span className="settings-think-name">{title}</span>
   <div className="settings-seg compact" style={{gridTemplateColumns:`repeat(${spec.levels.length},minmax(0,1fr))`}} role="group" aria-label={title}>
    {spec.levels.map(lv=>{
     const m=THINKING_META[lv],isDef=lv===spec.defaultLevel;
     return (
      <button key={lv} type="button" className={thinking===lv?'on':''} title={L(m.hintZh,m.hintEn)+(isDef?L('（该模型默认挡位）',' (model default)'):'')} onClick={()=>setThinking(lv)}>
       <span>{L(m.shortZh,m.shortEn)}</span>
       {isDef&&<em className="ai-think-def">{L('默认','def')}</em>}
      </button>
     );
    })}
   </div>
  </div>
 );
}
function ThinkingLevelRow({L,isGuest}:{L:(zh:string,en:string)=>string;isGuest:boolean}){
 const tutorModel=useStoredTutorModel();
 const [gradeModel]=useGradeModel();
 const [noteModel]=useStoredNoteModel();
 const effTutor=isGuest&&TUTOR_MODELS.find(m=>m.id===tutorModel)?.provider==='gemini'?'auto':tutorModel;
 const effNote=isGuest&&TUTOR_MODELS.find(m=>m.id===noteModel)?.provider==='gemini'?'auto':noteModel;
 const tutor=getTutorThinkingSpec(effTutor,null);
 const grade=getGradeThinkingSpec(gradeModel,null,isGuest);
 const note=getTutorThinkingSpec(effNote,null);
 const tutorName=TUTOR_MODELS.find(m=>m.id===effTutor)?.label[0]??'DeepSeek V4.1 Flash';
 const gradeName=isGuest?'DeepSeek V4.1 Flash（思考）':(GRADE_MODELS.find(m=>m.id===gradeModel)?.name??'Gemini 4 Hydrogen');
 const noteName=TUTOR_MODELS.find(m=>m.id===effNote)?.label[0]??'DeepSeek V4.1 Flash';
 const showTutor=!tutor.spec.locked;
 const showGrade=!grade.spec.locked;
 const showNoteSeg=!note.spec.locked&&effNote!=='auto'&&effNote!=='custom'&&note.scopeKey!==tutor.scopeKey&&note.scopeKey!==grade.scopeKey;
 if(!showTutor&&!showGrade&&!showNoteSeg)return null;
 return (
  <div className="settings-row settings-row-col">
   <span className="settings-stack">
    <span className="settings-label">{L('AI 思考强度','AI thinking strength')}</span>
    
   </span>
   {showTutor&&<ModelThinkingSeg title={L(`问答：${tutorName}`,`Chat: ${tutorName}`)} scopeKey={tutor.scopeKey} spec={tutor.spec} L={L}/>}
   {showGrade&&<ModelThinkingSeg title={L(`评分：${gradeName}`,`Grade: ${gradeName}`)} scopeKey={grade.scopeKey} spec={grade.spec} L={L}/>}
   {showNoteSeg&&<ModelThinkingSeg title={L(`笔记：${noteName}`,`Notes: ${noteName}`)} scopeKey={note.scopeKey} spec={note.spec} L={L}/>}
  </div>
 );
}
import {useEffect,useRef,useState,type ChangeEvent,type CSSProperties} from 'react';
import {Activity,AudioLines,Camera,Lightbulb,LightbulbOff,Loader2,LogIn,LogOut,RotateCcw,Settings,ShieldCheck,Sparkles} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {NoticeBell as Bell,VersionLog} from './notices';
import {AnimationDownloadMenu} from './animation-download-menu';
import {useI18n} from './i18n';
import {ThemeSelect} from './theme-control';
import {setGlassPreference,setLampPreference,useAppearance} from './appearance';
import {clearAvatar,processAvatarFile,saveAvatar,useAvatar,UserAvatar} from './avatar';

const NoticeBell=()=><><AnimationDownloadMenu/><VersionLog/><Bell/></>;
const GLASS_PRESETS=[
 {v:0,zh:'实底',en:'Solid'},
 {v:30,zh:'磨砂',en:'Frosted'},
 {v:50,zh:'标准',en:'Glass'},
 {v:75,zh:'通透',en:'Sheer'},
 {v:95,zh:'极透',en:'Clear'},
];

const adminCache=new Map<string,boolean>();

export default function AccountMenu({username}:{username:string}){
 const {locale,setLocale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {effectiveLamp,glass}=useAppearance();
 const avatar=useAvatar(username);
 const fileInput=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[avatarBusy,setAvatarBusy]=useState(false),[message,setMessage]=useState('');
 const [isAdmin,setIsAdmin]=useState<boolean>(()=>adminCache.get(username)??false);

 useEffect(()=>{
  let alive=true;
  if(adminCache.has(username)){
   setIsAdmin(adminCache.get(username)!);
   return;
  }
  fetch('/api/auth',{cache:'no-store'})
   .then(r=>r.ok?(r.json() as Promise<{isAdmin?:boolean}>):null)
   .then(d=>{
    const flag=Boolean(d?.isAdmin);
    adminCache.set(username,flag);
    if(alive)setIsAdmin(flag);
   })
   .catch(()=>{});
  return()=>{alive=false;};
 },[username]);

 async function pickAvatar(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  setAvatarBusy(true);setMessage('');
  try{
   const url=await processAvatarFile(file);
   saveAvatar(username,url);
  }catch{
   setMessage(L('头像处理失败，请选择 PNG / JPG / WebP 等常见图片。','Could not load image. Please choose a PNG, JPG or WebP file.'));
  }finally{
   setAvatarBusy(false);
  }
 }

 async function logout(){
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
   const d=await r.json() as {error?:string};
   if(!r.ok)throw new Error(d.error??t('操作失败'));
   window.location.assign('/login');
  }catch(e){setMessage((e as Error).message);setBusy(false)}
 }

 return <>
  <NoticeBell/>
  <Dialog>
   <DialogTrigger asChild>
    <button
     type="button"
     className="account-button"
     title={username||L('游客 · 设置','Guest · Settings')}
     aria-label={L('账号与外观设置','Account & appearance settings')}
    >
     <UserAvatar username={username} src={avatar} size={28}/>
     <span className="account-name">{username||L('游客 · 设置','Guest · Settings')}</span>
     <Settings size={14} className="account-gear"/>
    </button>
   </DialogTrigger>
   <DialogContent className="settings-dialog">
    <DialogHeader>
     <DialogTitle>{username?L(`设置 · ${username}`,`Settings · ${username}`):L('外观设置与账号','Settings & account')}</DialogTitle>
     <DialogDescription className="sr-only">{L('外观与账号设置','Appearance and account settings')}</DialogDescription>
    </DialogHeader>

    <div className="settings-list">
     <div className="settings-avatar-card">
      <button type="button" className="settings-avatar-pick" onClick={()=>fileInput.current?.click()} disabled={avatarBusy} aria-label={L('更换头像','Change avatar')}>
       <UserAvatar username={username} src={avatar} size={52}/>
       <span className="settings-avatar-cam"><Camera size={12}/></span>
      </button>
      <div className="settings-avatar-info">
       <strong>{username||L('游客模式','Guest')}</strong>
       <small>{avatar?L('已设置自定义头像（点击可更换）','Custom avatar active (tap to change)'):L('未设置头像时默认显示开头字母大写','Defaults to capitalized initial when unset')}</small>
      </div>
      <div className="settings-avatar-actions">
       <button type="button" className="button secondary settings-avatar-btn" disabled={avatarBusy} onClick={()=>fileInput.current?.click()}>{avatarBusy?L('处理中…','Saving…'):L('更换头像','Change')}</button>
       {avatar&&<button type="button" className="settings-avatar-reset" onClick={()=>{clearAvatar(username);setMessage('')}} title={L('恢复默认字母头像','Reset to initial letter')} aria-label={L('恢复默认字母头像','Reset to initial letter')}><RotateCcw size={14}/></button>}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={e=>void pickAvatar(e)}/>
     </div>

     <div className="settings-row">
      <span className="settings-label">{L('界面语言','Language')}</span>
      <div className="settings-seg" role="group" aria-label={L('界面语言','Language')}>
       <button type="button" className={locale==='zh'?'on':''} onClick={()=>setLocale('zh')}>简中</button>
       <button type="button" className={locale==='en'?'on':''} onClick={()=>setLocale('en')}>English</button>
      </div>
     </div>

     <div className="settings-row">
      <span className="settings-label">{L('灯光模式','Lighting')}</span>
      <div className="settings-seg" role="group" aria-label={L('灯光模式','Lighting')}>
       <button type="button" className={effectiveLamp==='on'?'on':''} onClick={()=>setLampPreference('on')}><Lightbulb size={15}/>{L('开灯','On')}</button>
       <button type="button" className={effectiveLamp==='off'?'on':''} onClick={()=>setLampPreference('off')}><LightbulbOff size={15}/>{L('关灯','Off')}</button>
      </div>
     </div>

     <div className="settings-row">
      <span className="settings-label">{L('背景配色','Background theme')}</span>
      <ThemeSelect className="theme-select settings-theme-select"/>
     </div>
     {username&&<GeminiProxyRow L={L}/>}
     <NoteModelRow L={L} isGuest={!username}/>
     <ThinkingLevelRow L={L} isGuest={!username}/>

     <div className="settings-glass">
      <div className="settings-glass-head">
       <span className="settings-label"><Sparkles size={14}/>{L('玻璃透明度（iOS 26 风格）','Liquid Glass transparency')}</span>
       <strong>{glass}%</strong>
      </div>
      <input
       type="range"
       min={0}
       max={100}
       step={5}
       value={glass}
       onChange={e=>setGlassPreference(Number(e.target.value))}
       style={{'--slider-pct':`${glass}%`} as CSSProperties}
       aria-label={L('玻璃透明度','Liquid Glass transparency')}
      />
      <div className="settings-presets">
       {GLASS_PRESETS.map(p=><button key={p.v} type="button" className={glass===p.v?'on':''} onClick={()=>setGlassPreference(p.v)}>{L(p.zh,p.en)}</button>)}
      </div>
      
     </div>
    </div>

    {message&&<p role="status" className="account-message">{t(message)}</p>}
    <div className="settings-foot">
     {isAdmin?(
      <div className="settings-admin-links">
       <a className="button secondary" href="/admin"><ShieldCheck size={15}/>{L('管理后台','Admin')}</a>
       <a className="button secondary" href="/admin/director"><AudioLines size={15}/>{L('配音导演台','Voice director')}</a>
      </div>
     ):<span/>}
     {username
      ?<button type="button" className="button secondary" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/>{t('退出登录')}</button>
      :<a className="button primary" href="/login"><LogIn size={16}/>{L('登录 / 注册账号','Sign in / Register')}</a>}
    </div>
   </DialogContent>
  </Dialog>
 </>;
}
