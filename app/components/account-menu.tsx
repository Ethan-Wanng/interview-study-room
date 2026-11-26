'use client';
import {useGlobalAiModel,useModelThinkingLevel} from '../ai/thinking-pref';
import {useAiConfigStatus} from '../ai/ai-settings';
import {providerMeta} from '@/lib/ai-config';
import {getGlobalThinkingSpec,THINKING_META,type ModelThinkingSpec} from '@/lib/thinking';
import {hasBridgeTransport,LOCAL_PROVIDER_LABEL,useLocalBridgeConfig} from '@/lib/local-bridge-config';
import {TUTOR_MODELS} from '@/lib/tutor-types';
function ProxyLinkRow({L}:{L:(zh:string,en:string)=>string}){
 return (
  <div className="settings-row">
   <span className="settings-label">{L('网络代理','Proxy')}</span>
   <a href="https://huarun.win/" target="_blank" rel="noopener noreferrer" className="button secondary settings-proxy-link">
    <span>huarun.win</span>
    <ExternalLink size={13}/>
   </a>
  </div>
 );
}
function GlobalModelRow({L,isGuest}:{L:(zh:string,en:string)=>string;isGuest:boolean}){
 const [model,setModel]=useGlobalAiModel();
 const {status}=useAiConfigStatus();
 const [localCfg]=useLocalBridgeConfig();
 const localReady=Boolean(localCfg.enabled&&hasBridgeTransport(localCfg));
 const customOn=Boolean(!isGuest&&!status?.isGuest&&status?.settings?.enabled&&status?.settings?.hasKey);
 const customLabel=customOn&&status?.settings
  ?`${providerMeta(status.settings.provider).badge} · ${status.settings.model||providerMeta(status.settings.provider).defaultModel}`
  :'';
 const value=(model==='custom'&&!customOn)||(model==='local'&&!localReady)?'auto':model;
 return (
  <div className="settings-row">
   <span className="settings-label">{L('AI 模型','AI model')}</span>
   <select
    className="theme-select settings-theme-select"
    value={value}
    onChange={e=>setModel(e.target.value)}
    aria-label={L('AI 模型','AI model')}
   >
    <option value="auto">
     {localReady
      ?L(`自动（本地 ${LOCAL_PROVIDER_LABEL[localCfg.provider]}）`,`Auto (Local ${LOCAL_PROVIDER_LABEL[localCfg.provider]})`)
      :L('自动（DeepSeek）','Auto (DeepSeek)')}
    </option>
    {localReady&&<option value="local">{L(`本地：${LOCAL_PROVIDER_LABEL[localCfg.provider]}`,`Local: ${LOCAL_PROVIDER_LABEL[localCfg.provider]}`)}</option>}
    {customOn&&<option value="custom">{L(`专属 API（${customLabel}）`,`Custom (${customLabel})`)}</option>}
    {TUTOR_MODELS.map(m=>(
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
 const [globalModel]=useGlobalAiModel();
 const [localCfg]=useLocalBridgeConfig();
 const {status}=useAiConfigStatus();
 const customOn=Boolean(!isGuest&&!status?.isGuest&&status?.settings?.enabled&&status?.settings?.hasKey);
 const customCfg=customOn&&status?.settings?{provider:status.settings.provider,model:status.settings.model}:null;
 const localActive=Boolean(localCfg.enabled&&hasBridgeTransport(localCfg));
 const active=getGlobalThinkingSpec(globalModel,customCfg,localActive?localCfg:null,isGuest);
 if(active.spec.locked)return null;
 const modelName=
  (globalModel==='local'||(globalModel==='auto'&&localActive))&&localActive
   ?LOCAL_PROVIDER_LABEL[localCfg.provider]
   :globalModel==='custom'&&customCfg
    ?providerMeta(customCfg.provider).badge
    :(TUTOR_MODELS.find(m=>m.id===globalModel)?.label[0]??'DeepSeek V4.1 Flash');
 return (
  <div className="settings-row settings-row-col">
   <ModelThinkingSeg title={L(`思考强度 · ${modelName}`,`Thinking · ${modelName}`)} scopeKey={active.scopeKey} spec={active.spec} L={L}/>
  </div>
 );
}
import {useEffect,useRef,useState,type ChangeEvent,type CSSProperties} from 'react';
import {AudioLines,Camera,ExternalLink,Lightbulb,LightbulbOff,LogIn,LogOut,RotateCcw,Settings,ShieldCheck,Sparkles} from 'lucide-react';
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
     <ProxyLinkRow L={L}/>
     <GlobalModelRow L={L} isGuest={!username}/>
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
