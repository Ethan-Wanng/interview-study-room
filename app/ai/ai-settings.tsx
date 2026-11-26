'use client';
import {useGeminiAutoProxy} from './gemini-proxy-pref';
import {useModelThinkingLevel,useStoredTutorModel} from './thinking-pref';
import {getCustomThinkingSpec,getTutorThinkingSpec,THINKING_META} from '@/lib/thinking';
import {TUTOR_MODELS} from '@/lib/tutor-types';
function GeminiProxyCfg({L}:{L:(zh:string,en:string)=>string}){const [auto,setAuto]=useGeminiAutoProxy();return <label className="ai-cfg-toggle"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/><span>{L('开启 Gemini 自动代理','Enable Gemini auto proxy')}</span></label>;}
function ThinkingLevelCfg({L,custom}:{L:(zh:string,en:string)=>string;custom?:{provider:string;model?:string}|null}){
 const tutorModel=useStoredTutorModel();
 const [localCfg]=useLocalBridgeConfig();
 const localActive=isLocalTutorReady(localCfg)?localCfg:null;
 const active=localActive
  ?getTutorThinkingSpec('local',null,localActive)
  :custom
   ?{scopeKey:`custom:${custom.provider}/${custom.model?.trim()||custom.provider}`,spec:getCustomThinkingSpec(custom.provider,custom.model)}
   :getTutorThinkingSpec(tutorModel,null);
 const [thinking,setThinking]=useModelThinkingLevel(active.scopeKey,active.spec);
 if(active.spec.locked)return null;
 const name=localActive
  ?`${LOCAL_PROVIDER_LABEL[localActive.provider]} · ${localActive.model.trim()||'default'}`
  :custom
   ?`${providerMeta(custom.provider).badge} · ${custom.model?.trim()||providerMeta(custom.provider).defaultModel}`
   :(TUTOR_MODELS.find(m=>m.id===tutorModel)?.label[0]??'DeepSeek V4.1 Flash');
 return (
  <div className="ai-cfg-field">
   <span className="ai-cfg-label">{L(`思考强度（${name}）`,`Thinking strength (${name})`)}</span>
   <div className="ai-think-seg wide" role="group" aria-label={L('AI 思考强度','AI thinking strength')}>
    {active.spec.levels.map(lv=>{
     const m=THINKING_META[lv],isDef=lv===active.spec.defaultLevel;
     return (
      <button key={lv} type="button" className={thinking===lv?'on':''} aria-pressed={thinking===lv}
       title={L(m.hintZh,m.hintEn)+(isDef?L('（该模型默认挡位）',' (model default)'):'')}
       onClick={()=>setThinking(lv)}>
       <span>{L(m.shortZh,m.shortEn)}</span>
       {isDef&&<em className="ai-think-def">{L('默认','def')}</em>}
      </button>
     );
    })}
   </div>
  </div>
 );
}
import {useCallback,useEffect,useRef,useState} from 'react';
import {Check,KeyRound,Lock,ShieldCheck,SlidersHorizontal,Trash2,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {AI_CONFIG_EVENT,AI_PROVIDERS,DEFAULT_USER_AI_SETTINGS,notifyAiConfigChanged,providerMeta,type AiProviderId,type UserAiSettings} from '@/lib/ai-config';
import {
 isLikelyMobileBrowser,
 isLocalTutorReady,
 LOCAL_BRIDGE_PROVIDERS,
 LOCAL_PROVIDER_LABEL,
 normalizeBridgeUrl,
 normalizeRelayCode,
 parseBridgePairPayload,
 useLocalBridgeConfig,
 type BridgeTarget,
 type LocalBridgeProvider,
} from '@/lib/local-bridge-config';
import {
 checkCloudRelayStatus,
 detectDownloadOs,
 installLocalProviderTool,
 loginLocalProviderTool,
 pingBridgeInfo,
 probeBridgeProviders,
 refreshBridgeProvider,
 syncDesktopBridgeToCloudRelay,
 triggerBridgeProtocolWake,
 type BridgeTransport,
 type LocalProviderInfo,
 type ProbeProvidersOutcome,
} from '@/lib/local-bridge-client';
import {BRIDGE_RELEASE,compareSemver} from '@/lib/releases';
import {BRIDGE_INSTALL_CLI_CMD,copyTextToClipboard,LocalBridgeGuideModal} from './local-bridge-guide';

export function LocalBridgeSection({L,hideGuideBtn}:{L:(zh:string,en:string)=>string;hideGuideBtn?:boolean}){
 const [localCfg,updateLocal]=useLocalBridgeConfig();
 const [providers,setProviders]=useState<LocalProviderInfo[]>([]);
 const [probing,setProbing]=useState(false);
 const [transport,setTransport]=useState<BridgeTransport|null>(null);
 const [probeState,setProbeState]=useState<'idle'|'ready'|'warn'|'err'>('idle');
 const [probeLabel,setProbeLabel]=useState('');
 const [bridgeVersion,setBridgeVersion]=useState<string|null>(null);
 const [endpointDraftOverride,setEndpointDraftOverride]=useState<string|null>(null);
 const endpointDraft=endpointDraftOverride??(localCfg.url||String(localCfg.port));
 const [relayCodeDraftOverride,setRelayCodeDraftOverride]=useState<string|null>(null);
 const relayCodeDraft=relayCodeDraftOverride??(localCfg.relayCode||'');
 const [waking,setWaking]=useState(false);
 const [installing,setInstalling]=useState(false);
 const [installPct,setInstallPct]=useState(0);
 const [loginPolling,setLoginPolling]=useState(false);
 const [loginAuthUrl,setLoginAuthUrl]=useState('');
 const [actionError,setActionError]=useState('');
 const [copiedCmd,setCopiedCmd]=useState(false);
 const [guideOpen,setGuideOpen]=useState(false);
 const mobile=isLikelyMobileBrowser();
 const downloadOs=detectDownloadOs();
 const downloadHref=`/api/bridge-download?os=${downloadOs}`;
 const loginPollRef=useRef<ReturnType<typeof setInterval>|null>(null);

 useEffect(()=>{
  return()=>{
   if(loginPollRef.current){
    clearInterval(loginPollRef.current);
    loginPollRef.current=null;
   }
  };
 },[]);

 const activeProvider=providers.find(p=>p.id===localCfg.provider);

 const syncModelThinking=(prov:LocalProviderInfo|undefined,modelId:string)=>{
  if(!prov||prov.status!=='ready')return {thinkingLevels:[],defaultThinkingLevel:''};
  const targetId=modelId.trim()||prov.defaultModel||prov.models[0]?.id||'';
  const matched=prov.models.find(m=>m.id===targetId)??prov.models[0];
  return {
   thinkingLevels:matched?.thinkingLevels??[],
   defaultThinkingLevel:matched?.defaultThinkingLevel??'',
  };
 };

 const applyProviderStatus=(list:LocalProviderInfo[],target:LocalBridgeProvider,nextTransport:BridgeTransport,modelOverride?:string)=>{
  setProviders(list);
  setTransport(nextTransport);
  const nextCatalog={...(localCfg.providerModels??{})};
  for(const p of list){
   if(p.status==='ready'&&p.models.length){
    nextCatalog[p.id]=p.models.map(m=>({
     id:m.id,
     label:m.label,
     ...(m.thinkingLevels?{thinkingLevels:m.thinkingLevels}:{}),
     ...(m.defaultThinkingLevel?{defaultThinkingLevel:m.defaultThinkingLevel}:{}),
    }));
   }
  }
  const found=list.find(p=>p.id===target);
  const tag=nextTransport==='local'?L('本地','Local'):L('云端','Cloud');
  if(!found){
   setProbeState('err');
   setProbeLabel(L('未检测到','Unavailable'));
   return;
  }
  if(found.status==='ready'){
   setProbeState('ready');
   setProbeLabel(L(`已连接 · ${tag}`,`Connected · ${tag}`));
   const effModel=modelOverride!==undefined?modelOverride:localCfg.model;
   const nextModel=effModel.trim()||found.defaultModel||found.models[0]?.id||'';
   updateLocal({
    ...(nextModel&&!effModel.trim()?{model:nextModel}:{}),
    ...syncModelThinking(found,nextModel),
    providerModels:nextCatalog,
    ...(nextTransport==='relay'?{relayLinked:true}:{}),
   });
   return;
  }
  if(found.status==='auth_required'){
   setProbeState('warn');
   setProbeLabel(L('未登录','Sign in required'));
   return;
  }
  if(found.status==='missing_binary'){
   setProbeState('warn');
   setProbeLabel(L('未安装','Not installed'));
   return;
  }
  setProbeState('err');
  setProbeLabel(found.errorMessage||L('异常','Error'));
 };

 const syncRelayInBackground=async(target:BridgeTarget,token:string)=>{
  const synced=await syncDesktopBridgeToCloudRelay(target,token,localCfg.relayCode);
  if(synced.ok){
   updateLocal({
    relayLinked:true,
    ...(synced.guestCode?{relayCode:synced.guestCode}:{}),
   });
  }
 };

 const runProbe=async(
  refreshActive=false,
  targetProvider=localCfg.provider,
  enableOnReady=false,
  override?:{port?:number;url?:string;token?:string;relayCode?:string},
 ):Promise<BridgeTransport|null>=>{
  setProbing(true);
  setActionError('');
  try{
   const effTarget:BridgeTarget={
    port:override?.port??localCfg.port,
    url:override?.url!==undefined?override.url:localCfg.url,
    relayCode:override?.relayCode!==undefined?override.relayCode:localCfg.relayCode,
    relayLinked:localCfg.relayLinked,
   };
   const effToken=(override?.token!==undefined?override.token:localCfg.token).trim();
   const ping=await pingBridgeInfo(effTarget);
   setBridgeVersion(ping.ok&&ping.version?ping.version:null);

   if(!ping.ok){
    setTransport(null);
    setProviders([]);
    setProbeState('err');
    setProbeLabel(L('未连接','Offline'));
    return null;
   }

   if(ping.transport==='local'&&!effToken){
    setTransport(null);
    setProbeState('warn');
    setProbeLabel(L('需配对码','Token required'));
    return null;
   }

   if(refreshActive&&providers.length>0){
    const res=await refreshBridgeProvider(effTarget,effToken,targetProvider);
    if(!res.ok){
     setProbeState('err');
     setProbeLabel(res.message);
     return null;
    }
    const nextList=providers.some(p=>p.id===targetProvider)
     ?providers.map(p=>p.id===targetProvider?res.provider:p)
     :[...providers,res.provider];
    applyProviderStatus(nextList,targetProvider,res.transport);
    if(enableOnReady&&res.provider.status==='ready')updateLocal({enabled:true});
    if(res.transport==='local')void syncRelayInBackground(effTarget,effToken);
    return res.transport;
   }

   const out:ProbeProvidersOutcome=await probeBridgeProviders(effTarget,effToken);
   if(!out.ok){
    setTransport(null);
    setProbeState('err');
    setProbeLabel(out.message);
    return null;
   }
   applyProviderStatus(out.providers,targetProvider,out.transport);
   const match=out.providers.find(p=>p.id===targetProvider);
   if(enableOnReady&&match?.status==='ready')updateLocal({enabled:true});
   if(out.transport==='local')void syncRelayInBackground(effTarget,effToken);
   return out.transport;
  }finally{
   setProbing(false);
  }
 };

 useEffect(()=>{
  if(typeof window==='undefined')return;
  const parsed=parseBridgePairPayload(window.location.hash);
  if(parsed){
   window.history.replaceState(null,'',window.location.pathname+window.location.search);
   const nextUrl=parsed.url||'';
   const nextPort=parsed.port??localCfg.port;
   updateLocal({
    enabled:true,
    url:nextUrl,
    port:nextPort,
    token:parsed.token,
   });
   void runProbe(false,localCfg.provider,true,{port:nextPort,url:nextUrl,token:parsed.token});
   return;
  }

  // Auto-probe and silent protocol auto-wake on desktop
  void (async()=>{
   const hit=await runProbe(false,localCfg.provider,false);
   if(hit)return;
   if(!mobile&&(localCfg.enabled||localCfg.token.trim())){
    const woke=triggerBridgeProtocolWake({autoOnce:true});
    if(woke){
     setWaking(true);
     await new Promise(r=>setTimeout(r,1800));
     await runProbe(false,localCfg.provider,false);
     setWaking(false);
    }
   }else if(mobile){
    const cloud=await checkCloudRelayStatus(localCfg.relayCode);
    if(cloud.ok&&cloud.connected){
     updateLocal({relayLinked:true,enabled:true});
     void runProbe(false,localCfg.provider,true);
    }
   }
  })();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const onWakeClick=async()=>{
  setActionError('');
  setWaking(true);
  triggerBridgeProtocolWake({autoOnce:false});
  try{
   for(let i=0;i<5;i++){
    await new Promise(r=>setTimeout(r,1100));
    const hit=await runProbe(false,localCfg.provider,true);
    if(hit)return;
   }
   setActionError(L('未唤醒本机桥接，请先下载安装。','Bridge did not respond. Please download and install first.'));
  }finally{
   setWaking(false);
  }
 };

 const onInstallToolClick=async()=>{
  if(!localCfg.token.trim())return;
  setActionError('');
  setInstalling(true);
  setInstallPct(0);
  try{
   const res=await installLocalProviderTool(
    {port:localCfg.port,url:localCfg.url},
    localCfg.token,
    localCfg.provider,
    ev=>setInstallPct(ev.pct),
   );
   if(!res.ok){
    setActionError(res.message);
    return;
   }
   const nextList=providers.some(p=>p.id===localCfg.provider)
    ?providers.map(p=>p.id===localCfg.provider?res.provider:p)
    :[...providers,res.provider];
   applyProviderStatus(nextList,localCfg.provider,'local');
   if(res.provider.status==='ready'){
    updateLocal({enabled:true});
   }
  }finally{
   setInstalling(false);
  }
 };

 const onLoginToolClick=async()=>{
  if(!localCfg.token.trim())return;
  setActionError('');
  setLoginAuthUrl('');
  const res=await loginLocalProviderTool({port:localCfg.port,url:localCfg.url},localCfg.token,localCfg.provider);
  if(!res.ok){
   setActionError(res.message);
   return;
  }
  if(res.authUrl)setLoginAuthUrl(res.authUrl);
  setLoginPolling(true);
  if(loginPollRef.current)clearInterval(loginPollRef.current);
  let tries=0;
  loginPollRef.current=setInterval(()=>{
   tries+=1;
   void refreshBridgeProvider({port:localCfg.port,url:localCfg.url},localCfg.token,localCfg.provider).then(ref=>{
    if(ref.ok&&ref.provider.status==='ready'){
     if(loginPollRef.current){clearInterval(loginPollRef.current);loginPollRef.current=null;}
     setLoginPolling(false);
     setLoginAuthUrl('');
     const nextList=providers.some(p=>p.id===localCfg.provider)
      ?providers.map(p=>p.id===localCfg.provider?ref.provider:p)
      :[...providers,ref.provider];
     applyProviderStatus(nextList,localCfg.provider,ref.transport);
     updateLocal({enabled:true});
    }else if(tries>=48){
     if(loginPollRef.current){clearInterval(loginPollRef.current);loginPollRef.current=null;}
     setLoginPolling(false);
    }
   });
  },2500);
 };

 const onConnectRelayCode=async()=>{
  const code=normalizeRelayCode(relayCodeDraft);
  if(code.length!==6){
   setActionError(L('请输入 6 位连接码','Enter a 6-character code'));
   return;
  }
  setRelayCodeDraftOverride(null);
  updateLocal({relayCode:code,enabled:true});
  await runProbe(false,localCfg.provider,true,{relayCode:code});
 };

 const onEndpointInputChange=(rawVal:string)=>{
  const paired=parseBridgePairPayload(rawVal);
  if(paired){
   const nextUrl=paired.url||'';
   const nextPort=paired.port??localCfg.port;
   setEndpointDraftOverride(null);
   updateLocal({url:nextUrl,port:nextPort,token:paired.token});
   return;
  }
  setEndpointDraftOverride(rawVal);
  const trimmed=rawVal.trim();
  if(!trimmed){
   updateLocal({url:'',port:43180});
   return;
  }
  if(/^\d{1,5}$/.test(trimmed)){
   const n=Number(trimmed);
   if(n>=1&&n<=65535)updateLocal({url:'',port:n});
   return;
  }
  const cleanUrl=normalizeBridgeUrl(trimmed);
  if(cleanUrl){
   updateLocal({url:cleanUrl});
  }
 };

 const pickLocalProvider=(id:LocalBridgeProvider)=>{
  setActionError('');
  setLoginAuthUrl('');
  const found=providers.find(p=>p.id===id);
  updateLocal({provider:id,model:'',...syncModelThinking(found,'')});
  if(providers.length&&transport){
   applyProviderStatus(providers,id,transport,'');
  }
 };

 const copyInstallCmd=async()=>{
  if(await copyTextToClipboard(BRIDGE_INSTALL_CLI_CMD)){
   setCopiedCmd(true);
   setTimeout(()=>setCopiedCmd(false),1800);
  }
 };

 const isConnected=transport!==null;
 const needsInstall=isConnected&&transport==='local'&&activeProvider?.status==='missing_binary';
 const needsLogin=isConnected&&transport==='local'&&activeProvider?.status==='auth_required';
 const providerReady=isConnected&&activeProvider?.status==='ready';
 const showOfflineCta=!probing&&!isConnected;
 const clientName=LOCAL_PROVIDER_LABEL[localCfg.provider];

 return (
  <section className="ai-cfg-local">
   <div className="ai-cfg-head">
    <strong>{L('本地客户端','Local Client')}</strong>
    <div className="ai-cfg-head-actions">
     {probeState!=='idle'&&<span className={`ai-cfg-status ${probeState}`}>{probeLabel}</span>}
     {!mobile&&bridgeVersion&&compareSemver(bridgeVersion,BRIDGE_RELEASE.version)<0&&(
      <a href={downloadHref} download className="ai-cfg-chip">
       {L(`更新 v${BRIDGE_RELEASE.version}`,`Update v${BRIDGE_RELEASE.version}`)}
      </a>
     )}
     {!hideGuideBtn&&<button type="button" className="ai-cfg-chip" onClick={()=>setGuideOpen(true)}>{L('教程','Guide')}</button>}
    </div>
   </div>

   <label className="ai-cfg-toggle">
    <input type="checkbox" checked={localCfg.enabled} onChange={e=>updateLocal({enabled:e.target.checked})}/>
    <span>{L('启用本地客户端','Enable local client')}</span>
   </label>

   <div className="ai-cfg-field">
    <span className="ai-cfg-label">{L('客户端','Client')}</span>
    <div className="ai-cfg-providers">
     {LOCAL_BRIDGE_PROVIDERS.map(id=>(
      <button key={id} type="button" className={'ai-cfg-prov'+(localCfg.provider===id?' on':'')} onClick={()=>pickLocalProvider(id)}>
       {LOCAL_PROVIDER_LABEL[id]}
      </button>
     ))}
    </div>
   </div>

   {showOfflineCta&&(
    <div className="ai-cfg-cta-row">
     {!mobile?(
      <>
       <a href={downloadHref} download className="button primary">
        {L('下载桥接助手','Download Bridge')}
       </a>
       <button type="button" className="button secondary" disabled={waking||probing} onClick={()=>void onWakeClick()}>
        {waking?L('唤醒中…','Waking…'):L('唤醒桥接','Wake Bridge')}
       </button>
      </>
     ):(
      <>
       <button type="button" className="button primary" disabled={probing} onClick={()=>void runProbe(false,localCfg.provider,true)}>
        {probing?L('连接中…','Connecting…'):L('连接云端中继','Connect Cloud Relay')}
       </button>
       <div className="ai-cfg-code-row">
        <input
         type="text"
         className="ai-cfg-input"
         maxLength={6}
         value={relayCodeDraft}
         placeholder={L('6位连接码','6-char code')}
         onChange={e=>setRelayCodeDraftOverride(normalizeRelayCode(e.target.value))}
        />
        <button type="button" className="button secondary" disabled={probing} onClick={()=>void onConnectRelayCode()}>
         {L('连接','Connect')}
        </button>
       </div>
      </>
     )}
    </div>
   )}

   {needsInstall&&(
    <div className="ai-cfg-cta-row">
     <button type="button" className="button primary" disabled={installing} onClick={()=>void onInstallToolClick()}>
      {installing?L(`安装中 ${installPct}%…`,`Installing ${installPct}%…`):L(`安装 ${clientName}`,`Install ${clientName}`)}
     </button>
    </div>
   )}

   {needsLogin&&(
    <div className="ai-cfg-cta-row">
     <button type="button" className="button primary" disabled={loginPolling} onClick={()=>void onLoginToolClick()}>
      {loginPolling?L('等待登录…','Waiting…'):L(`登录 ${clientName}`,`Sign in to ${clientName}`)}
     </button>
     {loginAuthUrl&&(
      <a href={loginAuthUrl} target="_blank" rel="noreferrer" className="button secondary">
       {L('打开登录页','Open login page')}
      </a>
     )}
    </div>
   )}

   {isConnected&&transport==='relay'&&activeProvider&&!providerReady&&(
    <div className="ai-cfg-cta-row">
     <button type="button" className="button secondary" disabled={probing} onClick={()=>void runProbe(true)}>
      {probing?L('刷新中…','Refreshing…'):L('刷新','Refresh')}
     </button>
    </div>
   )}

   {actionError&&<p className="ai-cfg-msg err">{actionError}</p>}

   {(providerReady||(!isConnected&&localCfg.providerModels?.[localCfg.provider]?.length))?(
    <>
     <div className="ai-cfg-field">
      <div className="ai-cfg-row-head">
       <span className="ai-cfg-label">{L('模型','Model')}</span>
       <button type="button" className="ai-cfg-chip" disabled={probing} onClick={()=>void runProbe(true)}>
        {probing?L('刷新中…','Refreshing…'):L('刷新','Refresh')}
       </button>
      </div>
      {(activeProvider?.models.length?activeProvider.models:localCfg.providerModels?.[localCfg.provider]??[]).length?(
       <div className="ai-cfg-models">
        {(activeProvider?.models.length?activeProvider.models:localCfg.providerModels?.[localCfg.provider]??[]).map(m=>(
         <button key={m.id} type="button" className={'ai-cfg-chip'+(localCfg.model===m.id?' on':'')} onClick={()=>updateLocal({model:m.id,thinkingLevels:m.thinkingLevels??[],defaultThinkingLevel:m.defaultThinkingLevel??''})}>
          {m.label}
         </button>
        ))}
       </div>
      ):null}
      <input className="ai-cfg-input" value={localCfg.model} placeholder={activeProvider?.defaultModel||'default'} onChange={e=>{const v=e.target.value;updateLocal({model:v,...(activeProvider?syncModelThinking(activeProvider,v):{})})}}/>
     </div>

     <div className="ai-cfg-scenes">
      <label>
       <input type="checkbox" checked={localCfg.allowTutor} onChange={e=>updateLocal({allowTutor:e.target.checked})}/>
       <span>{L('AI 问答','AI Tutor')}</span>
      </label>
      <label>
       <input type="checkbox" checked={localCfg.allowGrade} onChange={e=>updateLocal({allowGrade:e.target.checked})}/>
       <span>{L('AI 评分','AI Grading')}</span>
      </label>
      <label>
       <input type="checkbox" checked={localCfg.allowDeep} onChange={e=>updateLocal({allowDeep:e.target.checked})}/>
       <span>{L('JD 调研 / 深度面试','JD Research / Deep Interview')}</span>
      </label>
      <label>
       <input type="checkbox" checked={localCfg.allowWebSearch} onChange={e=>updateLocal({allowWebSearch:e.target.checked})}/>
       <span>{L('允许联网搜索','Allow web search')}</span>
      </label>
     </div>

     {activeProvider?.quota&&(activeProvider.quota.windows.length>0||activeProvider.quota.planType)?(
      <div className="ai-cfg-quota">
       {activeProvider.quota.planType&&<span className="ai-cfg-quota-plan">{activeProvider.quota.planType}</span>}
       {activeProvider.quota.windows.map(w=>(
        <span key={w.label} className="ai-cfg-quota-item">
         {w.label} {L(`剩余 ${Math.max(0,100-w.usedPercent)}%`,`${Math.max(0,100-w.usedPercent)}% left`)}
        </span>
       ))}
      </div>
     ):null}
    </>
   ):null}

   <details className="ai-cfg-adv">
    <summary>{L('高级','Advanced')}</summary>
    <div className="ai-cfg-adv-body">
     <div className="ai-cfg-grid">
      <label>
       <span className="ai-cfg-label">{L('端口 / 地址','Port / Address')}</span>
       <input type="text" className="ai-cfg-input" value={endpointDraft} placeholder="43180" onChange={e=>onEndpointInputChange(e.target.value)} onBlur={()=>setEndpointDraftOverride(null)}/>
      </label>
      <label>
       <span className="ai-cfg-label">{L('配对码','Pairing Token')}</span>
       <input type="password" className="ai-cfg-input" value={localCfg.token} placeholder="brg_..." onChange={e=>{
        const v=e.target.value;
        const paired=parseBridgePairPayload(v);
        if(paired){
         const nextUrl=paired.url||'';
         const nextPort=paired.port??localCfg.port;
         setEndpointDraftOverride(null);
         updateLocal({url:nextUrl,port:nextPort,token:paired.token});
         return;
        }
        updateLocal({token:v});
       }}/>
      </label>
     </div>
     {localCfg.relayCode?(
      <div className="ai-cfg-row-head">
       <span className="ai-cfg-label">{L('跨端连接码','Relay Code')}: <code>{localCfg.relayCode}</code></span>
       <button type="button" className="ai-cfg-chip" onClick={()=>void copyTextToClipboard(localCfg.relayCode||'')}>
        {L('复制','Copy')}
       </button>
      </div>
     ):null}
     <div className="ai-cfg-actions">
      <button type="button" className="button primary" disabled={probing} onClick={()=>void runProbe(false,localCfg.provider,true)}>
       {probing?L('连接中…','Connecting…'):L('连接并保存','Connect & Save')}
      </button>
      <button type="button" className="button secondary" onClick={()=>void copyInstallCmd()}>
       {copiedCmd?L('已复制','Copied'):L('复制 npx 命令','Copy npx')}
      </button>
     </div>
    </div>
   </details>

   {!hideGuideBtn&&<LocalBridgeGuideModal open={guideOpen} onClose={()=>setGuideOpen(false)} L={L}/>}
  </section>
 );
}

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
   <ThinkingLevelCfg L={L}/>
   <LocalBridgeSection L={L}/>
  </div>;
 }

 return <div className="ai-cfg-box">
  <div className="ai-cfg-head">
   <strong><SlidersHorizontal size={15}/> {L('专属 AI 模型与限额设置','Private AI Model & Limits')}</strong>
   {onClose&&<button type="button" className="ai-dock-icon" onClick={onClose} title={L('关闭','Close')}><X size={15}/></button>}
  </div>
  <p className="ai-cfg-owner"><ShieldCheck size={14}/> {L(`账号专属隔离：仅登录用户 @${username} 本人可调用此 API Key，其他用户与游客无法使用。`,`Account-isolated: only @${username} can use this API key.`)}</p>

<GeminiProxyCfg L={L}/>
<ThinkingLevelCfg L={L} custom={enabled?{provider,model}:null}/>
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
  <LocalBridgeSection L={L}/>
 </div>;
}
