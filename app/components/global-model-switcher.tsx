'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Check,ChevronDown,Cpu,RefreshCw} from 'lucide-react';
import {useI18n} from './i18n';
import {NoticePopover} from './notices';
import {useAiConfigStatus} from '../ai/ai-settings';
import {
 getGlobalThinkingSpec,
 THINKING_META,
} from '@/lib/thinking';
import {
 hasBridgeTransport,
 LOCAL_BRIDGE_PROVIDERS,
 LOCAL_PROVIDER_LABEL,
 useLocalBridgeConfig,
 type LocalBridgeProvider,
} from '@/lib/local-bridge-config';
import {probeBridgeProviders} from '@/lib/local-bridge-client';
import {providerMeta} from '@/lib/ai-config';
import {TUTOR_MODELS} from '@/lib/tutor-types';
import {useGlobalAiModel,useModelThinkingLevel} from '../ai/thinking-pref';

const shortLocalModelName=(m:string)=>{
 const clean=m.trim();
 if(!clean||clean==='default')return '默认';
 return clean.length>18?clean.slice(0,17)+'…':clean;
};

/** Global header switcher for AI model and thinking strength. */
export default function GlobalModelSwitcher({username}:{username:string}){
 const {locale}=useI18n();
 const L=useCallback((zh:string,en:string)=>locale==='en'?en:zh,[locale]);
 const [open,setOpen]=useState(false);
 const [probing,setProbing]=useState(false);
 const boxRef=useRef<HTMLDivElement>(null);
 const probedOnceRef=useRef(false);

 const [globalModel,setGlobalModel]=useGlobalAiModel();
 const [localCfg,updateLocal]=useLocalBridgeConfig();
 const {status:aiStatus}=useAiConfigStatus();

 const isGuest=!username||Boolean(aiStatus?.isGuest);
 const hasCustom=Boolean(!isGuest&&aiStatus?.settings?.enabled&&aiStatus?.settings?.hasKey);
 const customBadge=hasCustom&&aiStatus?.settings?providerMeta(aiStatus.settings.provider).badge:'';
 const customSpecCfg=useMemo(
  ()=>(hasCustom&&aiStatus?.settings?{provider:aiStatus.settings.provider,model:aiStatus.settings.model}:null),
  [hasCustom,aiStatus],
 );

 const localReady=Boolean(localCfg.enabled&&hasBridgeTransport(localCfg));
 const isUsingLocal=localReady&&(globalModel==='auto'||globalModel==='local');

 const effectiveModel=
  !localReady&&globalModel==='local'
   ?'auto'
   :!hasCustom&&globalModel==='custom'
    ?'auto'
    :globalModel;

 const {scopeKey:thinkScope,spec:thinkSpec}=getGlobalThinkingSpec(
  effectiveModel,
  customSpecCfg,
  localReady?localCfg:null,
  isGuest,
 );
 const [thinking,setThinking]=useModelThinkingLevel(thinkScope,thinkSpec);

 const localGroups=useMemo(()=>{
  if(!localReady)return [] as {provider:LocalBridgeProvider;models:{id:string;label:string;thinkingLevels?:string[];defaultThinkingLevel?:string}[]}[];
  const groups:{provider:LocalBridgeProvider;models:{id:string;label:string;thinkingLevels?:string[];defaultThinkingLevel?:string}[]}[]=[];
  const cat=localCfg.providerModels??{};
  for(const pid of LOCAL_BRIDGE_PROVIDERS){
   const list=cat[pid];
   if(list&&list.length){
    const cur=localCfg.model.trim();
    const curInList=pid===localCfg.provider&&cur&&!list.some(m=>m.id===cur);
    groups.push({provider:pid,models:curInList?[{id:cur,label:cur},...list]:list});
   }else if(pid===localCfg.provider){
    const id=localCfg.model.trim()||'default';
    groups.push({
     provider:pid,
     models:[{id,label:id==='default'?L('默认模型','Default'):id,thinkingLevels:localCfg.thinkingLevels,defaultThinkingLevel:localCfg.defaultThinkingLevel}],
    });
   }
  }
  return groups;
 },[localReady,localCfg.provider,localCfg.model,localCfg.providerModels,localCfg.thinkingLevels,localCfg.defaultThinkingLevel,L]);

 const applyProbeResult=useCallback((out:Awaited<ReturnType<typeof probeBridgeProviders>>)=>{
  if(!out.ok)return;
  const nextCatalog={...(localCfg.providerModels??{})};
  for(const p of out.providers){
   if(p.status==='ready'&&p.models.length){
    nextCatalog[p.id]=p.models.map(m=>({
     id:m.id,
     label:m.label,
     ...(m.thinkingLevels?{thinkingLevels:m.thinkingLevels}:{}),
     ...(m.defaultThinkingLevel?{defaultThinkingLevel:m.defaultThinkingLevel}:{}),
    }));
   }
  }
  const curProv=out.providers.find(p=>p.id===localCfg.provider&&p.status==='ready');
  if(curProv){
   const curId=localCfg.model.trim()||curProv.defaultModel||curProv.models[0]?.id||'';
   const matched=curProv.models.find(m=>m.id===curId)??curProv.models[0];
   updateLocal({
    ...(curId&&!localCfg.model.trim()?{model:curId}:{}),
    thinkingLevels:matched?.thinkingLevels??[],
    defaultThinkingLevel:matched?.defaultThinkingLevel??'',
    providerModels:nextCatalog,
   });
  }else if(Object.keys(nextCatalog).length){
   updateLocal({providerModels:nextCatalog});
  }
 },[localCfg.provider,localCfg.model,localCfg.providerModels,updateLocal]);

 const refreshLocal=async()=>{
  if(!hasBridgeTransport(localCfg)||probing)return;
  setProbing(true);
  try{
   const out=await probeBridgeProviders(
    {port:localCfg.port,url:localCfg.url,relayCode:localCfg.relayCode,relayLinked:localCfg.relayLinked},
    localCfg.token,
   );
   applyProbeResult(out);
  }finally{
   setProbing(false);
  }
 };

 useEffect(()=>{
  if(!open||!localReady||probedOnceRef.current)return;
  const hasAny=Object.values(localCfg.providerModels??{}).some(list=>Boolean(list?.length));
  if(hasAny)return;
  probedOnceRef.current=true;
  let alive=true;
  probeBridgeProviders(
   {port:localCfg.port,url:localCfg.url,relayCode:localCfg.relayCode,relayLinked:localCfg.relayLinked},
   localCfg.token,
  ).then(out=>{
   if(alive)applyProbeResult(out);
  }).catch(()=>{});
  return()=>{alive=false};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,localReady]);

 const activeLocalTargetId=localCfg.model.trim()||localGroups.find(g=>g.provider===localCfg.provider)?.models[0]?.id||'default';

 const triggerLabel=(()=>{
  if(isUsingLocal){
   const pname=LOCAL_PROVIDER_LABEL[localCfg.provider];
   const mshort=localCfg.model.trim()?shortLocalModelName(localCfg.model):'';
   return mshort?`${pname} · ${mshort}`:pname;
  }
  if(effectiveModel==='custom'&&customBadge)return customBadge;
  if(effectiveModel==='deepseek-flash')return 'V4.1 Flash';
  if(effectiveModel==='deepseek-v4-pro')return 'V4 Pro';
  if(effectiveModel==='deepseek-flash-think')return L('V4.1 思考','V4.1 Think');
  return 'DeepSeek';
 })();

 const selectLocalModel=(pid:LocalBridgeProvider,mid:string)=>{
  const matched=localCfg.providerModels?.[pid]?.find(m=>m.id===mid);
  updateLocal({
   provider:pid,
   model:mid==='default'?'':mid,
   thinkingLevels:matched?.thinkingLevels??[],
   defaultThinkingLevel:matched?.defaultThinkingLevel??'',
  });
  setGlobalModel('local');
 };

 const selectSiteModel=(id:string)=>{
  setGlobalModel(id);
 };

 return (
  <div className="global-model-wrap" ref={boxRef}>
   <button
    type="button"
    className={'header-pill global-model-btn'+(open?' on':'')}
    aria-label={L('切换 AI 模型与思考强度','Switch AI model & thinking')}
    aria-expanded={open}
    title={triggerLabel}
    onClick={()=>setOpen(v=>!v)}
   >
    <Cpu size={15}/>
    <span>{triggerLabel}</span>
    <ChevronDown size={13} className={'global-model-chev'+(open?' rot':'')}/>
   </button>

   <NoticePopover
    open={open}
    triggerRef={boxRef}
    onClose={()=>setOpen(false)}
    label={L('AI 模型与思考强度','AI Model & Thinking')}
    className="global-model-pop"
   >
    <div className="notice-panel-head">
     <strong>{L('AI 模型','AI Model')}</strong>
     <div className="global-model-head-actions">
      {hasBridgeTransport(localCfg)&&(
       <button type="button" className="ai-cfg-chip" disabled={probing} onClick={()=>void refreshLocal()}>
        <RefreshCw size={11} className={probing?'ai-spin':''}/>
        <span>{probing?L('刷新中…','Refreshing…'):L('刷新','Refresh')}</span>
       </button>
      )}
      <a href="/ai/local-bridge" className="ai-cfg-chip" onClick={()=>setOpen(false)}>
       {L('桥接','Bridge')}
      </a>
      <a href="https://huarun.win/" target="_blank" rel="noopener noreferrer" className="ai-cfg-chip">
       <span>{L('代理','Proxy')}</span>
       <ArrowUpRight size={11}/>
      </a>
     </div>
    </div>

    <div className="global-model-body">
     {localGroups.length>0&&(
      <div className="global-model-sec">
       <span className="global-model-sec-title">{L('本地客户端','Local Client')}</span>
       <div className="global-model-list">
        {localGroups.map(g=>(
         g.models.map(m=>{
          const on=isUsingLocal&&localCfg.provider===g.provider&&(activeLocalTargetId===m.id||(m.id==='default'&&!localCfg.model.trim()));
          return (
           <button
            key={`${g.provider}/${m.id}`}
            type="button"
            className={'global-model-item'+(on?' on':'')}
            onClick={()=>selectLocalModel(g.provider,m.id)}
           >
            <span className="global-model-item-name">{LOCAL_PROVIDER_LABEL[g.provider]} · {m.label}</span>
            {on&&<Check size={14}/>}
           </button>
          );
         })
        ))}
       </div>
      </div>
     )}

     <div className="global-model-sec">
      <span className="global-model-sec-title">{L('站点模型','Site Models')}</span>
      <div className="global-model-list">
       <button
        type="button"
        className={'global-model-item'+(!isUsingLocal&&effectiveModel==='auto'?' on':'')}
        onClick={()=>selectSiteModel('auto')}
       >
        <span className="global-model-item-name">{hasCustom?L(`自动（${customBadge}）`,`Auto (${customBadge})`):L('自动（DeepSeek）','Auto (DeepSeek)')}</span>
        {!isUsingLocal&&effectiveModel==='auto'&&<Check size={14}/>}
       </button>
       {TUTOR_MODELS.map(m=>{
        const on=!isUsingLocal&&effectiveModel===m.id;
        return (
         <button
          key={m.id}
          type="button"
          className={'global-model-item'+(on?' on':'')}
          onClick={()=>selectSiteModel(m.id)}
         >
          <span className="global-model-item-name">{L(m.label[0],m.label[1])}</span>
          {on&&<Check size={14}/>}
         </button>
        );
       })}
       {hasCustom&&(
        <button
         type="button"
         className={'global-model-item'+(!isUsingLocal&&effectiveModel==='custom'?' on':'')}
         onClick={()=>selectSiteModel('custom')}
        >
         <span className="global-model-item-name">{L(`我的 API · ${customBadge}`,`My API · ${customBadge}`)}</span>
         {!isUsingLocal&&effectiveModel==='custom'&&<Check size={14}/>}
        </button>
       )}
      </div>
     </div>

     {!thinkSpec.locked&&(
      <div className="global-model-sec">
       <span className="global-model-sec-title">{L('思考强度','Thinking')}</span>
       <div
        className="settings-seg compact global-model-think"
        style={{gridTemplateColumns:`repeat(${thinkSpec.levels.length},minmax(0,1fr))`}}
        role="group"
        aria-label={L('思考强度','Thinking strength')}
       >
        {thinkSpec.levels.map(lv=>{
         const meta=THINKING_META[lv],isDef=lv===thinkSpec.defaultLevel;
         return (
          <button
           key={lv}
           type="button"
           className={thinking===lv?'on':''}
           onClick={()=>setThinking(lv)}
          >
           <span>{L(meta.shortZh,meta.shortEn)}</span>
           {isDef&&<em className="ai-think-def">{L('默认','def')}</em>}
          </button>
         );
        })}
       </div>
      </div>
     )}
    </div>
   </NoticePopover>
  </div>
 );
}
