'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowLeft,
 AudioLines,
 BookOpen,
 CheckCircle2,
 CloudUpload,
 Cpu,
 KeyRound,
 Layers,
 ListChecks,
 Loader2,
 LogOut,
 Pause,
 Play,
 Plus,
 RefreshCw,
 RotateCcw,
 Save,
 Scissors,
 Sparkles,
 Square,
 Trash2,
 Unplug,
 Volume2,
 Wand2,
 X,
} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {useI18n,LanguageControl} from '../../components/i18n';
import ThemeControl from '../../components/theme-control';
import {playCue} from '@/app/ai/animations/sound';
import {chunkAt,resolveSceneDuration,splitLine,subtitleProgress,type SceneTiming} from '@/app/ai/animations/subtitle';
import '../admin.css';
import '@/app/ai/animations/animations.css';
import './director.css';
import {
 loadDirectorCatalog,
 type DirectorAnimation,
 type DirectorCatalogData,
 type DirectorScene,
} from './director-catalog';
import {
 applyGlossaryPreview,
 fmtMs,
 fmtShortSec,
 isTimingWarn,
 type BridgeCatalogResponse,
 type BridgeStateResponse,
 type GlossaryRule,
 type JobInfo,
 type ModelStatus,
 type SceneBridgeStatus,
 type SceneDetailResponse,
 type TakeEntry,
} from './director-types';

const DEFAULT_BRIDGE='http://127.0.0.1:8788';
const BRIDGE_STORAGE_KEY='study-director-bridge-url';
const STAGE_W=640;

type FilterVoice='all'|'04'|'kokoro'|'warn'|'approved'|'override';
type SynthMode='short6_ICL'|'full_04_ICL'|'x_vector_only';

function sanitizeBridgeUrl(raw:string):string{
 return raw.trim().replace(/\/+$/,'')||DEFAULT_BRIDGE;
}

export default function DirectorClient(){
 const {locale,t}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;

 // 1. Admin session gate (/api/admin)
 const [authLoading,setAuthLoading]=useState(true);
 const [authed,setAuthed]=useState(false);
 const [adminName,setAdminName]=useState('');
 const [authKey,setAuthKey]=useState('');
 const [authBusy,setAuthBusy]=useState(false);
 const [authError,setAuthError]=useState('');

 // 2. Catalog & bridge state
 const [catalog,setCatalog]=useState<DirectorCatalogData|null>(null);
 const [siteIndex,setSiteIndex]=useState<Record<string,number>>({});
 const [siteTiming,setSiteTiming]=useState<Record<string,SceneTiming>>({});
 const [bridgeInput,setBridgeInput]=useState(DEFAULT_BRIDGE);
 const [bridgeUrl,setBridgeUrl]=useState(DEFAULT_BRIDGE);
 const [bridgeOnline,setBridgeOnline]=useState(false);
 const [bridgeStatusNote,setBridgeStatusNote]=useState('');
 const [modelStatus,setModelStatus]=useState<ModelStatus|null>(null);
 const [jobs,setJobs]=useState<JobInfo[]>([]);
 const [done04Count,setDone04Count]=useState(0);
 const [bridgeScenes,setBridgeScenes]=useState<Record<string,SceneBridgeStatus>>({});
 const [bridgeAnimStats,setBridgeAnimStats]=useState<Record<string,{doneCount:number;approvedCount:number;warnCount:number}>>({});
 const [glossary,setGlossary]=useState<GlossaryRule[]>([]);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');

 // 3. Filters & selection
 const [catFilter,setCatFilter]=useState('all');
 const [voiceFilter,setVoiceFilter]=useState<FilterVoice>('all');
 const [search,setSearch]=useState('');
 const [selectedAnimId,setSelectedAnimId]=useState('');
 const [selectedSceneIdx,setSelectedSceneIdx]=useState(0);

 // 4. Active scene detail & editing state
 const [sceneDetail,setSceneDetail]=useState<SceneDetailResponse|null>(null);
 const [sceneLoading,setSceneLoading]=useState(false);
 const [overrideDraft,setOverrideDraft]=useState('');
 const [notesDraft,setNotesDraft]=useState('');
 const [approvedDraft,setApprovedDraft]=useState(false);
 const [customMsDraft,setCustomMsDraft]=useState('');
 const [savingScript,setSavingScript]=useState(false);

 // 4b. Video duration & subtitle sync timing draft (timing.json)
 const [timingSceneMsDraft,setTimingSceneMsDraft]=useState('');
 const [timingSubStartDraft,setTimingSubStartDraft]=useState(0);
 const [timingSubDurDraft,setTimingSubDurDraft]=useState('');
 const [timingSubSpeedDraft,setTimingSubSpeedDraft]=useState(1.0);
 const [savingTiming,setSavingTiming]=useState(false);

 // 5. Trim / non-GPU audio edit parameters
 const [trimStartMs,setTrimStartMs]=useState(0);
 const [trimEndMs,setTrimEndMs]=useState(0);
 const [editSpeed,setEditSpeed]=useState(1.0);
 const [editPadStartMs,setEditPadStartMs]=useState(0);
 const [editPadEndMs,setEditPadEndMs]=useState(0);
 const [editAutoTrim,setEditAutoTrim]=useState(false);
 const [editNormalize,setEditNormalize]=useState(true);
 const [editAutoApply,setEditAutoApply]=useState(true);
 const [editBusy,setEditBusy]=useState(false);

 // 6. Qwen3-TTS synthesis parameters
 const [synthMode,setSynthMode]=useState<SynthMode>('short6_ICL');
 const [synthSeed,setSynthSeed]=useState(0);
 const [synthTemp,setSynthTemp]=useState(0.75);
 const [synthTopP,setSynthTopP]=useState(0.9);
 const [synthSpeed,setSynthSpeed]=useState(1.0);
 const [synthAutoTrim,setSynthAutoTrim]=useState(true);
 const [synthApplyGlossary,setSynthApplyGlossary]=useState(true);
 const [synthAutoApply,setSynthAutoApply]=useState(false);
 const [synthBusy,setSynthBusy]=useState(false);

 // 7. Playback & stage state
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const waveCanvasRef=useRef<HTMLCanvasElement|null>(null);
 const stageBoxRef=useRef<HTMLDivElement|null>(null);
 const dragHandleRef=useRef<'start'|'end'|null>(null);
 const seqTimerRef=useRef<number|null>(null);
 const [stageW,setStageW]=useState(STAGE_W);
 const [audioVer,setAudioVer]=useState(1);
 const [playKind,setPlayKind]=useState<'live'|'original'|'take'|'sequence'|null>(null);
 const [playTakeId,setPlayTakeId]=useState<string|null>(null);
 const [isPlaying,setIsPlaying]=useState(false);
 const [playProgress,setPlayProgress]=useState(0);
 const [playCurMs,setPlayCurMs]=useState(0);
 const [playDurMs,setPlayDurMs]=useState(0);
 const [playSfx,setPlaySfx]=useState(true);
 const [stageKey,setStageKey]=useState(1);

 // 8. Modals
 const [glossaryOpen,setGlossaryOpen]=useState(false);
 const [glossaryDraft,setGlossaryDraft]=useState<GlossaryRule[]>([]);
 const [batchOpen,setBatchOpen]=useState(false);
 const [batchScope,setBatchScope]=useState<'anim'|'cat'|'filtered'>('anim');
 const [batchMode,setBatchMode]=useState<SynthMode>('short6_ICL');
 const [batchSkipDone,setBatchSkipDone]=useState(true);
 const [batchApplyGlossary,setBatchApplyGlossary]=useState(true);
 const [batchSpeed,setBatchSpeed]=useState(1.0);
 const [batchTemp,setBatchTemp]=useState(0.75);
 const [logsOpen,setLogsOpen]=useState(false);
 const [activeJobId,setActiveJobId]=useState<string|null>(null);

 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{
    const saved=window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if(saved){
     const clean=sanitizeBridgeUrl(saved);
     setBridgeInput(clean);
     setBridgeUrl(clean);
    }
   }catch{}
  },0);
  return()=>window.clearTimeout(timer);
 },[]);

 useEffect(()=>{
  if(!notice)return;
  const timer=window.setTimeout(()=>setNotice(''),5000);
  return()=>window.clearTimeout(timer);
 },[notice]);

 useEffect(()=>{
  if(!error)return;
  const timer=window.setTimeout(()=>setError(''),8000);
  return()=>window.clearTimeout(timer);
 },[error]);

 const checkAuth=useCallback(async()=>{
  try{
   const r=await fetch('/api/admin',{cache:'no-store'});
   if(r.status===401){
    setAuthed(false);
    setAdminName('');
    return;
   }
   const d=await r.json() as {admin?:{name?:string};error?:string};
   if(!r.ok)throw Error(d.error||'验证失败');
   setAuthed(true);
   setAdminName(d.admin?.name||'');
  }catch(e){
   setAuthError((e as Error).message);
  }finally{
   setAuthLoading(false);
  }
 },[]);

 useEffect(()=>{
  let cancelled=false;
  void (async()=>{
   try{
    const r=await fetch('/api/admin',{cache:'no-store'});
    if(cancelled)return;
    if(r.status===401){
     setAuthed(false);
     setAdminName('');
     return;
    }
    const d=await r.json() as {admin?:{name?:string};error?:string};
    if(cancelled)return;
    if(!r.ok)throw Error(d.error||'验证失败');
    setAuthed(true);
    setAdminName(d.admin?.name||'');
   }catch(e){
    if(!cancelled)setAuthError((e as Error).message);
   }finally{
    if(!cancelled)setAuthLoading(false);
   }
  })();
  return()=>{cancelled=true};
 },[]);

 async function handleAdminLogin(e:React.FormEvent){
  e.preventDefault();
  setAuthBusy(true);
  setAuthError('');
  try{
   const r=await fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'login',key:authKey}),
   });
   const d=await r.json() as {error?:string};
   if(!r.ok)throw Error(d.error||'密钥无效');
   setAuthKey('');
   await checkAuth();
  }catch(e){
   setAuthError((e as Error).message);
  }finally{
   setAuthBusy(false);
  }
 }

 async function handleAdminLogout(){
  await fetch('/api/admin',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action:'logout'}),
  });
  setAuthed(false);
  setAdminName('');
 }

 const bridgeFetch=useCallback(async<T,>(path:string,init?:RequestInit):Promise<T>=>{
  const r=await fetch(`${bridgeUrl}${path}`,init);
  if(!r.ok){
   let msg=`HTTP ${r.status}`;
   try{
    const errJson=await r.json() as {detail?:string;error?:string};
    msg=errJson.detail||errJson.error||msg;
   }catch{}
   throw Error(msg);
  }
  return r.json() as Promise<T>;
 },[bridgeUrl]);

 const loadBridgeCatalog=useCallback(async(silent=true)=>{
  try{
   const d=await bridgeFetch<BridgeCatalogResponse>('/api/catalog');
   const sMap:Record<string,SceneBridgeStatus>={};
   const aMap:Record<string,{doneCount:number;approvedCount:number;warnCount:number}>={};
   for(const a of d.animations){
    aMap[a.id]={doneCount:a.doneCount,approvedCount:a.approvedCount,warnCount:a.warnCount};
    for(const sc of a.scenes){
     sMap[sc.hash]=sc;
    }
   }
   setBridgeScenes(sMap);
   setBridgeAnimStats(aMap);
   setGlossary(d.glossary||[]);
   setModelStatus(d.model);
   setDone04Count(d.totalDone04||0);
   setBridgeOnline(true);
   setBridgeStatusNote('');
  }catch(e){
   setBridgeOnline(false);
   if(!silent){
    setBridgeStatusNote((e as Error).message||'无法连接本机引擎');
   }
  }
 },[bridgeFetch]);

 const pollBridgeState=useCallback(async():Promise<BridgeStateResponse|null>=>{
  try{
   const d=await bridgeFetch<BridgeStateResponse>('/api/state');
   setModelStatus(d.model);
   setJobs(d.jobs||[]);
   setDone04Count(d.doneCount||0);
   setBridgeOnline(true);
   return d;
  }catch{
   setBridgeOnline(false);
   return null;
  }
 },[bridgeFetch]);

 // Load frontend animation catalog + /tts/index.json + /tts/timing.json once authenticated
 useEffect(()=>{
  if(!authed)return;
  let cancelled=false;
  void (async()=>{
   try{
    const [cat,idxRes,tmRes]=await Promise.all([
     loadDirectorCatalog(),
     fetch('/tts/index.json',{cache:'no-cache'}).then(r=>r.ok?r.json() as Promise<Record<string,number>>:{}).catch(()=>({})),
     fetch('/tts/timing.json',{cache:'no-cache'}).then(r=>r.ok?r.json() as Promise<Record<string,SceneTiming>>:{}).catch(()=>({})),
    ]);
    if(cancelled)return;
    setCatalog(cat);
    setSiteIndex(idxRes);
    setSiteTiming(tmRes);
    if(cat.animations.length>0){
     setSelectedAnimId(prev=>prev||cat.animations[0].id);
    }
   }catch(e){
    if(!cancelled)setError(`加载动画目录失败: ${(e as Error).message}`);
   }
  })();
  return()=>{cancelled=true};
 },[authed]);

 // Sync bridge state when authenticated or bridgeUrl changes
 useEffect(()=>{
  if(!authed)return;
  let cancelled=false;
  void (async()=>{
   await Promise.resolve();
   if(cancelled)return;
   await Promise.all([loadBridgeCatalog(true),pollBridgeState()]);
  })();
  return()=>{cancelled=true};
 },[authed,bridgeUrl,loadBridgeCatalog,pollBridgeState]);

 // Measure preview SVG container width for subtitle chunking
 useEffect(()=>{
  const el=stageBoxRef.current;
  if(!el)return;
  const ro=new ResizeObserver(([entry])=>setStageW(entry.contentRect.width));
  ro.observe(el);
  return()=>ro.disconnect();
 },[authed,catalog]);

 const selectedAnim:DirectorAnimation|null=useMemo(()=>{
  if(!catalog?.animations.length)return null;
  return catalog.animations.find(a=>a.id===selectedAnimId)??catalog.animations[0];
 },[catalog,selectedAnimId]);

 const selectedScene:DirectorScene|null=useMemo(()=>{
  if(!selectedAnim?.scenes.length)return null;
  return selectedAnim.scenes[selectedSceneIdx]??selectedAnim.scenes[0];
 },[selectedAnim,selectedSceneIdx]);

 // Fetch active scene details from local GPU bridge when connected
 const refreshSceneDetail=useCallback(async(h:string)=>{
  if(!bridgeOnline||!h){
   setSceneDetail(null);
   return;
  }
  setSceneLoading(true);
  try{
   const d=await bridgeFetch<SceneDetailResponse>(`/api/scene/${h}`);
   setSceneDetail(d);
   setOverrideDraft(d.overrideText||'');
   setNotesDraft(d.notes||'');
   setApprovedDraft(Boolean(d.approved));
   const dur=d.actualMs??d.indexMs??4000;
   setTrimStartMs(0);
   setTrimEndMs(dur);
   setCustomMsDraft(String(d.indexMs??d.actualMs??''));
   const tm=d.timing??{};
   setTimingSceneMsDraft(tm.sceneMs?String(tm.sceneMs):'');
   setTimingSubStartDraft(tm.subStartMs??0);
   setTimingSubDurDraft(tm.subDurMs?String(tm.subDurMs):'');
   setTimingSubSpeedDraft(tm.subSpeed??1.0);
  }catch{
   setSceneDetail(null);
  }finally{
   setSceneLoading(false);
  }
 },[bridgeOnline,bridgeFetch]);

 useEffect(()=>{
  const h=selectedScene?.hash;
  const fallbackMs=h?(siteIndex[h]??selectedScene?.sceneMs??4000):4000;
  if(!h)return;
  let cancelled=false;
  void (async()=>{
   await Promise.resolve();
   if(cancelled)return;
   if(!bridgeOnline){
    const tm=siteTiming[h]??{};
    setSceneDetail(null);
    setOverrideDraft('');
    setNotesDraft('');
    setApprovedDraft(false);
    setCustomMsDraft(String(fallbackMs));
    setTrimStartMs(0);
    setTrimEndMs(fallbackMs);
    setTimingSceneMsDraft(tm.sceneMs?String(tm.sceneMs):'');
    setTimingSubStartDraft(tm.subStartMs??0);
    setTimingSubDurDraft(tm.subDurMs?String(tm.subDurMs):'');
    setTimingSubSpeedDraft(tm.subSpeed??1.0);
    return;
   }
   setSceneLoading(true);
   try{
    const d=await bridgeFetch<SceneDetailResponse>(`/api/scene/${h}`);
    if(cancelled)return;
    setSceneDetail(d);
    setOverrideDraft(d.overrideText||'');
    setNotesDraft(d.notes||'');
    setApprovedDraft(Boolean(d.approved));
    const dur=d.actualMs??d.indexMs??fallbackMs;
    setTrimStartMs(0);
    setTrimEndMs(dur);
    setCustomMsDraft(String(d.indexMs??d.actualMs??''));
    const tm=d.timing??siteTiming[h]??{};
    setTimingSceneMsDraft(tm.sceneMs?String(tm.sceneMs):'');
    setTimingSubStartDraft(tm.subStartMs??0);
    setTimingSubDurDraft(tm.subDurMs?String(tm.subDurMs):'');
    setTimingSubSpeedDraft(tm.subSpeed??1.0);
   }catch{
    if(!cancelled)setSceneDetail(null);
   }finally{
    if(!cancelled)setSceneLoading(false);
   }
  })();
  return()=>{cancelled=true};
 },[selectedScene?.hash,selectedScene?.sceneMs,bridgeOnline,bridgeFetch,siteIndex,siteTiming]);

 // Poll active job progress while running
 const runningJob=useMemo(()=>jobs.find(j=>j.status==='running')??null,[jobs]);
 useEffect(()=>{
  if(!runningJob&&!activeJobId)return;
  const activeObj=jobs.find(j=>j.id===activeJobId);
  if(!runningJob&&activeObj&&activeObj.status!=='running')return;
  const timer=window.setInterval(async()=>{
   const st=await pollBridgeState();
   if(!st)return;
   const tracked=st.jobs.find(j=>j.id===(activeJobId||runningJob?.id));
   if(tracked&&tracked.status!=='running'){
    setActiveJobId(null);
    setAudioVer(v=>v+1);
    void loadBridgeCatalog(true);
    if(selectedScene?.hash)void refreshSceneDetail(selectedScene.hash);
    if(tracked.status==='done')setNotice(tracked.message);
    else if(tracked.status==='error')setError(tracked.message||tracked.error||'任务失败');
   }
  },800);
  return()=>window.clearInterval(timer);
 },[runningJob,activeJobId,jobs,pollBridgeState,loadBridgeCatalog,refreshSceneDetail,selectedScene?.hash]);

 // Filtered animations list
 const filteredAnimations=useMemo(()=>{
  if(!catalog)return [];
  const q=search.trim().toLowerCase();
  return catalog.animations.filter(a=>{
   if(catFilter!=='all'&&a.cat!==catFilter)return false;
   if(q){
    const hitAnim=a.title.toLowerCase().includes(q)||a.id.toLowerCase().includes(q);
    const hitScene=a.scenes.some(s=>s.caption.toLowerCase().includes(q)||s.hash.includes(q));
    if(!hitAnim&&!hitScene)return false;
   }
   if(voiceFilter==='all')return true;
   return a.scenes.some(s=>{
    const bs=bridgeScenes[s.hash];
    const idxMs=bs?.indexMs??siteIndex[s.hash];
    if(voiceFilter==='04')return Boolean(bs?.is04);
    if(voiceFilter==='kokoro')return !bs?.is04;
    if(voiceFilter==='warn')return bs?.timingWarn??isTimingWarn(idxMs,s.sceneMs);
    if(voiceFilter==='approved')return Boolean(bs?.approved);
    if(voiceFilter==='override')return Boolean(bs?.hasOverride);
    return true;
   });
  });
 },[catalog,catFilter,search,voiceFilter,bridgeScenes,siteIndex]);

 // Stop any active playback cleanly
 const stopPlayback=useCallback(()=>{
  if(seqTimerRef.current){
   window.clearTimeout(seqTimerRef.current);
   seqTimerRef.current=null;
  }
  const el=audioRef.current;
  if(el){
   el.pause();
   el.currentTime=0;
  }
  setIsPlaying(false);
  setPlayKind(null);
  setPlayTakeId(null);
  setPlayProgress(0);
  setPlayCurMs(0);
 },[]);

 const getSceneAudioSrc=useCallback((h:string,kind:'live'|'original'|'take'|'sequence',takeId?:string)=>{
  if(!bridgeOnline){
   return `/tts/${h}.mp3`;
  }
  if(kind==='original')return `${bridgeUrl}/api/audio/original/${h}?v=${audioVer}`;
  if(kind==='take'&&takeId)return `${bridgeUrl}/api/audio/take/${h}/${takeId}?v=${audioVer}`;
  return `${bridgeUrl}/api/audio/live/${h}?v=${audioVer}`;
 },[bridgeOnline,bridgeUrl,audioVer]);

 const startAudio=useCallback(async(
  h:string,
  kind:'live'|'original'|'take'|'sequence',
  takeId?:string,
  seekMs?:number,
 )=>{
  if(seqTimerRef.current){
   window.clearTimeout(seqTimerRef.current);
   seqTimerRef.current=null;
  }
  const el=audioRef.current;
  if(!el)return;
  const url=getSceneAudioSrc(h,kind,takeId);
  const fullSrc=url.startsWith('http')?url:window.location.origin+url;
  setPlayKind(kind);
  setPlayTakeId(takeId??null);
  setPlayProgress(0);
  setPlayCurMs(seekMs??0);
  if(el.src!==fullSrc){
   el.src=url;
  }
  const begin=()=>{
   if(seekMs&&seekMs>0&&Number.isFinite(el.duration)){
    el.currentTime=Math.min(el.duration,seekMs/1000);
   }else{
    el.currentTime=0;
   }
   void el.play().catch(err=>{
    setError(`无法播放音频: ${(err as Error).message}`);
    setIsPlaying(false);
   });
  };
  if(el.readyState>=1)begin();
  else{
   el.onloadedmetadata=()=>{
    el.onloadedmetadata=null;
    begin();
   };
  }
 },[getSceneAudioSrc]);

 // Play whole animation episode continuously
 const startSequence=useCallback((fromIdx:number)=>{
  if(!selectedAnim?.scenes.length)return;
  const sc=selectedAnim.scenes[fromIdx];
  if(!sc)return;
  setSelectedSceneIdx(fromIdx);
  setStageKey(k=>k+1);
  if(playSfx)playCue(sc.cue,1);
  void startAudio(sc.hash,'sequence');
 },[selectedAnim,playSfx,startAudio]);

 // Animation loop for playhead & karaoke subtitle progress
 useEffect(()=>{
  if(!isPlaying)return;
  let raf=0;
  const tick=()=>{
   const el=audioRef.current;
   if(el&&el.duration>0&&Number.isFinite(el.duration)){
    setPlayCurMs(Math.round(el.currentTime*1000));
    setPlayDurMs(Math.round(el.duration*1000));
    setPlayProgress(Math.max(0,Math.min(1,el.currentTime/el.duration)));
   }
   raf=window.requestAnimationFrame(tick);
  };
  raf=window.requestAnimationFrame(tick);
  return()=>window.cancelAnimationFrame(raf);
 },[isPlaying]);

 // Draw interactive waveform canvas whenever peaks, trim, or playhead move
 useEffect(()=>{
  const canvas=waveCanvasRef.current;
  if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(300,Math.round(rect.width*dpr));
  const h=Math.max(80,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){
   canvas.width=w;
   canvas.height=h;
  }
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const css=getComputedStyle(document.documentElement);
  const cPrimary=css.getPropertyValue('--primary').trim()||'#3b82f6';
  const cNotice=css.getPropertyValue('--notice').trim()||'#10b981';
  const cAlert=css.getPropertyValue('--alert-ink').trim()||'#ef4444';
  const cQuiet=css.getPropertyValue('--quiet').trim()||'#6b7280';
  const cLine=css.getPropertyValue('--line').trim()||'#d1d5db';

  ctx.clearRect(0,0,w,h);
  const totalMs=Math.max(1,sceneDetail?.actualMs??siteIndex[selectedScene?.hash??'']??selectedScene?.sceneMs??4000);
  const sFrac=Math.max(0,Math.min(1,trimStartMs/totalMs));
  const eFrac=Math.max(sFrac,Math.min(1,trimEndMs/totalMs));

  const peaks=sceneDetail?.peaks??[];
  if(!peaks.length){
   ctx.strokeStyle=cLine;
   ctx.setLineDash([4*dpr,4*dpr]);
   ctx.beginPath();
   ctx.moveTo(0,h/2);
   ctx.lineTo(w,h/2);
   ctx.stroke();
   ctx.setLineDash([]);
   ctx.fillStyle=cQuiet;
   ctx.font=`${12*dpr}px sans-serif`;
   ctx.textAlign='center';
   ctx.fillText(bridgeOnline?'无波形数据':'连接本机引擎后显示音频波形与裁切手柄',w/2,h/2-8*dpr);
  }else{
   const bw=w/peaks.length;
   const maxP=Math.max(0.05,...peaks);
   for(let i=0;i<peaks.length;i++){
    const f=(i+0.5)/peaks.length;
    const barH=Math.max(2*dpr,(peaks[i]/maxP)*(h*0.78));
    const inside=f>=sFrac&&f<=eFrac;
    ctx.fillStyle=inside?cPrimary:cLine;
    ctx.globalAlpha=inside?0.9:0.55;
    ctx.fillRect(i*bw+0.5,(h-barH)/2,Math.max(1.2*dpr,bw-1),barH);
   }
   ctx.globalAlpha=1;
  }

  // Trim markers
  const sx=sFrac*w;
  const ex=eFrac*w;
  ctx.fillStyle=cQuiet;
  ctx.globalAlpha=0.14;
  ctx.fillRect(0,0,sx,h);
  ctx.fillRect(ex,0,w-ex,h);
  ctx.globalAlpha=1;

  ctx.strokeStyle=cNotice;
  ctx.lineWidth=2*dpr;
  ctx.beginPath();
  ctx.moveTo(sx,0);
  ctx.lineTo(sx,h);
  ctx.stroke();

  ctx.strokeStyle=cAlert;
  ctx.beginPath();
  ctx.moveTo(ex,0);
  ctx.lineTo(ex,h);
  ctx.stroke();

  // Playhead
  if(isPlaying&&(playKind==='live'||playKind==='sequence')){
   const px=playProgress*w;
   ctx.strokeStyle=cNotice;
   ctx.lineWidth=2*dpr;
   ctx.beginPath();
   ctx.moveTo(px,0);
   ctx.lineTo(px,h);
   ctx.stroke();
  }
 },[sceneDetail,siteIndex,selectedScene,trimStartMs,trimEndMs,bridgeOnline,isPlaying,playKind,playProgress]);

 // Waveform pointer scrub & trim handle drag
 function wavePointerToMs(clientX:number):number{
  const canvas=waveCanvasRef.current;
  if(!canvas)return 0;
  const rect=canvas.getBoundingClientRect();
  const frac=Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width)));
  const totalMs=Math.max(1,sceneDetail?.actualMs??siteIndex[selectedScene?.hash??'']??selectedScene?.sceneMs??4000);
  return Math.round(frac*totalMs);
 }

 function onWavePointerDown(e:React.PointerEvent<HTMLCanvasElement>){
  const totalMs=Math.max(1,sceneDetail?.actualMs??siteIndex[selectedScene?.hash??'']??selectedScene?.sceneMs??4000);
  const ms=wavePointerToMs(e.clientX);
  const tol=totalMs*0.03;
  if(bridgeOnline&&Math.abs(ms-trimStartMs)<=tol){
   dragHandleRef.current='start';
   e.currentTarget.setPointerCapture(e.pointerId);
   return;
  }
  if(bridgeOnline&&Math.abs(ms-trimEndMs)<=tol){
   dragHandleRef.current='end';
   e.currentTarget.setPointerCapture(e.pointerId);
   return;
  }
  if(selectedScene){
   void startAudio(selectedScene.hash,'live',undefined,ms);
  }
 }

 function onWavePointerMove(e:React.PointerEvent<HTMLCanvasElement>){
  if(!dragHandleRef.current)return;
  const totalMs=Math.max(1,sceneDetail?.actualMs??siteIndex[selectedScene?.hash??'']??selectedScene?.sceneMs??4000);
  const ms=Math.max(0,Math.min(totalMs,wavePointerToMs(e.clientX)));
  if(dragHandleRef.current==='start'){
   setTrimStartMs(Math.min(ms,Math.max(0,trimEndMs-200)));
  }else{
   setTrimEndMs(Math.max(ms,Math.min(totalMs,trimStartMs+200)));
  }
 }

 function onWavePointerUp(){
  dragHandleRef.current=null;
 }

 // Effective script live preview
 const liveEffectivePreview=useMemo(()=>{
  if(!selectedScene)return '';
  const base=(overrideDraft.trim()||selectedScene.defaultSpoken);
  return synthApplyGlossary?applyGlossaryPreview(base,glossary):base;
 },[selectedScene,overrideDraft,synthApplyGlossary,glossary]);

 // Live draft timing (applied immediately to preview karaoke & sequence playback)
 const liveDraftTiming:SceneTiming=useMemo(()=>{
  const out:SceneTiming={};
  const sm=Number(timingSceneMsDraft);
  if(timingSceneMsDraft.trim()&&Number.isFinite(sm)&&sm>=400)out.sceneMs=Math.round(sm);
  if(timingSubStartDraft&&Number.isFinite(timingSubStartDraft))out.subStartMs=Math.round(timingSubStartDraft);
  const sd=Number(timingSubDurDraft);
  if(timingSubDurDraft.trim()&&Number.isFinite(sd)&&sd>=200)out.subDurMs=Math.round(sd);
  if(Math.abs(timingSubSpeedDraft-1)>=0.01)out.subSpeed=Number(timingSubSpeedDraft.toFixed(2));
  return out;
 },[timingSceneMsDraft,timingSubStartDraft,timingSubDurDraft,timingSubSpeedDraft]);

 // Subtitle chunks for preview SVG (matches AnimationPlayer: splits speech ?? caption)
 const stageFontSize=Math.round(Math.max(13,Math.min(20,stageW*0.032)));
 const stageFont=`600 ${stageFontSize}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
 const chunks=useMemo(()=>{
  if(!selectedScene)return [];
  return splitLine(selectedScene.raw,stageW*0.92-24,stageFont);
 },[selectedScene,stageW,stageFont]);
 const previewAudioBaseMs=playDurMs||sceneDetail?.actualMs||sceneDetail?.indexMs||(selectedScene?siteIndex[selectedScene.hash]:0)||selectedScene?.sceneMs||4000;
 const {index:chunkIdx,fill:chunkFill}=useMemo(()=>{
  if(!chunks.length)return {index:0,fill:0};
  const p=isPlaying&&(playKind==='live'||playKind==='sequence')
   ?subtitleProgress(playCurMs,previewAudioBaseMs,liveDraftTiming)
   :0;
  return chunkAt(chunks,p);
 },[chunks,isPlaying,playKind,playCurMs,previewAudioBaseMs,liveDraftTiming]);
 const chunkText=chunks[chunkIdx]?.text??selectedScene?.raw??'';

 // Bridge actions
 async function connectBridge(){
  const clean=sanitizeBridgeUrl(bridgeInput);
  setBridgeUrl(clean);
  setBridgeInput(clean);
  try{
   window.localStorage.setItem(BRIDGE_STORAGE_KEY,clean);
  }catch{}
  await Promise.all([loadBridgeCatalog(false),pollBridgeState()]);
 }

 async function saveScript(nextApproved?:boolean){
  if(!selectedScene||!bridgeOnline)return;
  setSavingScript(true);
  try{
   await bridgeFetch(`/api/scene/${selectedScene.hash}/script`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     text:overrideDraft,
     notes:notesDraft,
     approved:nextApproved??approvedDraft,
    }),
   });
   if(nextApproved!==undefined)setApprovedDraft(nextApproved);
   setNotice('已保存台词覆写与审核标记');
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setSavingScript(false);
  }
 }

 async function syncMs(mode:'actual'|'custom'){
  if(!selectedScene||!bridgeOnline)return;
  try{
   const body=mode==='custom'
    ?{mode:'custom',custom_ms:Number(customMsDraft)}
    :{mode:'actual'};
   const res=await bridgeFetch<{ms:number}>(`/api/scene/${selectedScene.hash}/sync-ms`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
   });
   setSiteIndex(prev=>({...prev,[selectedScene.hash]:res.ms}));
   setNotice(`已同步 index.json 时长为 ${res.ms} ms`);
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function saveTiming(reset=false){
  if(!selectedScene||!bridgeOnline)return;
  setSavingTiming(true);
  try{
   const body=reset
    ?{reset:true}
    :{
     scene_ms:liveDraftTiming.sceneMs??null,
     sub_start_ms:liveDraftTiming.subStartMs??0,
     sub_dur_ms:liveDraftTiming.subDurMs??null,
     sub_speed:liveDraftTiming.subSpeed??1.0,
     reset:false,
    };
   const res=await bridgeFetch<{timing:SceneTiming}>(`/api/scene/${selectedScene.hash}/timing`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
   });
   setSiteTiming(prev=>{
    const next={...prev};
    if(res.timing&&Object.keys(res.timing).length>0)next[selectedScene.hash]=res.timing;
    else delete next[selectedScene.hash];
    return next;
   });
   if(reset){
    setTimingSceneMsDraft('');
    setTimingSubStartDraft(0);
    setTimingSubDurDraft('');
    setTimingSubSpeedDraft(1.0);
   }
   setNotice(reset?'已还原默认影片时长与字幕同步':'已保存影片时长与字幕校准（timing.json），部署后全站生效');
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setSavingTiming(false);
  }
 }

 async function applyEpisodeTiming(opts:{alignSpeech?:boolean;subSpeed?:number;reset?:boolean}){
  if(!selectedAnim||!bridgeOnline)return;
  setSavingTiming(true);
  try{
   const hashes=[...new Set(selectedAnim.scenes.map(s=>s.hash))];
   const res=await bridgeFetch<{updated:number}>('/api/batch/auto-timing',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     hashes,
     align_speech_bounds:Boolean(opts.alignSpeech),
     sub_speed:opts.subSpeed??null,
     reset:Boolean(opts.reset),
    }),
   });
   setNotice(`已批量更新本集 ${res.updated} 个分镜的字幕/时长校准`);
   await Promise.all([loadBridgeCatalog(true),selectedScene?refreshSceneDetail(selectedScene.hash):Promise.resolve()]);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setSavingTiming(false);
  }
 }

 async function runEditAudio(){
  if(!selectedScene||!bridgeOnline)return;
  setEditBusy(true);
  try{
   const res=await bridgeFetch<{take:TakeEntry;applied:{ms:number}|null}>(`/api/scene/${selectedScene.hash}/edit-audio`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     source_take_id:null,
     trim_start_ms:Math.round(trimStartMs),
     trim_end_ms:Math.round(trimEndMs),
     auto_trim:editAutoTrim,
     speed:editSpeed,
     pad_start_ms:editPadStartMs,
     pad_end_ms:editPadEndMs,
     normalize:editNormalize,
     auto_apply:editAutoApply,
    }),
   });
   setAudioVer(v=>v+1);
   if(res.applied)setSiteIndex(prev=>({...prev,[selectedScene.hash]:res.applied!.ms}));
   setNotice(res.applied?`剪辑并应用完成 (${res.applied.ms} ms)`:`已生成剪辑 Take (${res.take.ms} ms)`);
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setEditBusy(false);
  }
 }

 async function runSynthesize(autoApply:boolean){
  if(!selectedScene||!bridgeOnline)return;
  setSynthBusy(true);
  try{
   const res=await bridgeFetch<{jobId:string}>(`/api/scene/${selectedScene.hash}/synthesize`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     text:overrideDraft.trim()||selectedScene.defaultSpoken,
     mode:synthMode,
     seed:Number(synthSeed)||0,
     temperature:synthTemp,
     top_p:synthTopP,
     speed:synthSpeed,
     auto_trim:synthAutoTrim,
     apply_glossary:synthApplyGlossary,
     auto_apply:autoApply,
    }),
   });
   setActiveJobId(res.jobId);
   await pollBridgeState();
   setNotice('已提交本机 GPU 合成任务');
  }catch(e){
   setError((e as Error).message);
  }finally{
   setSynthBusy(false);
  }
 }

 async function applyTake(takeId:string){
  if(!selectedScene||!bridgeOnline)return;
  try{
   const res=await bridgeFetch<{applied:{ms:number}}>(`/api/scene/${selectedScene.hash}/apply`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({take_id:takeId}),
   });
   setAudioVer(v=>v+1);
   setSiteIndex(prev=>({...prev,[selectedScene.hash]:res.applied.ms}));
   setNotice(`已设为正式版 (${res.applied.ms} ms)`);
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function restoreOriginal(){
  if(!selectedScene||!bridgeOnline)return;
  try{
   const res=await bridgeFetch<{ms:number}>(`/api/scene/${selectedScene.hash}/restore-original`,{method:'POST'});
   setAudioVer(v=>v+1);
   setSiteIndex(prev=>({...prev,[selectedScene.hash]:res.ms}));
   setNotice(`已恢复原版 MP3 (${res.ms} ms)`);
   await Promise.all([loadBridgeCatalog(true),refreshSceneDetail(selectedScene.hash)]);
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function toggleModel(load:boolean){
  if(!bridgeOnline)return;
  try{
   const res=await bridgeFetch<{model:ModelStatus}>(load?'/api/model/load':'/api/model/unload',{method:'POST'});
   setModelStatus(res.model);
   setNotice(load?'已加载 Qwen3-TTS 模型':'已释放显存');
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function saveGlossary(){
  if(!bridgeOnline)return;
  try{
   const res=await bridgeFetch<{rules:GlossaryRule[]}>('/api/glossary',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rules:glossaryDraft.filter(r=>r.find.trim())}),
   });
   setGlossary(res.rules);
   setGlossaryOpen(false);
   setNotice(`已保存 ${res.rules.length} 条全局读法词库`);
   if(selectedScene?.hash)void refreshSceneDetail(selectedScene.hash);
  }catch(e){
   setError((e as Error).message);
  }
 }

 const batchHashes=useMemo(()=>{
  if(!catalog)return [];
  const sourceAnims=batchScope==='anim'
   ?(selectedAnim?[selectedAnim]:[])
   :batchScope==='cat'
   ?catalog.animations.filter(a=>catFilter==='all'||a.cat===catFilter)
   :filteredAnimations;
  const set=new Set<string>();
  for(const a of sourceAnims){
   for(const s of a.scenes){
    if(batchSkipDone&&bridgeScenes[s.hash]?.is04)continue;
    set.add(s.hash);
   }
  }
  return [...set];
 },[catalog,batchScope,selectedAnim,catFilter,filteredAnimations,batchSkipDone,bridgeScenes]);

 async function runBatch(){
  if(!bridgeOnline||!batchHashes.length)return;
  try{
   const res=await bridgeFetch<{jobId:string|null;count?:number;message?:string}>('/api/batch/synthesize',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     hashes:batchHashes,
     mode:batchMode,
     skip_done:batchSkipDone,
     apply_glossary:batchApplyGlossary,
     speed:batchSpeed,
     temperature:batchTemp,
     top_p:0.9,
    }),
   });
   setBatchOpen(false);
   if(res.jobId){
    setActiveJobId(res.jobId);
    setLogsOpen(true);
    await pollBridgeState();
    setNotice(`已启动批量合成 (${res.count??batchHashes.length} 句)`);
   }else{
    setNotice(res.message||'没有需要合成的分镜');
   }
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function triggerDeploy(){
  if(!bridgeOnline)return;
  try{
   const res=await bridgeFetch<{jobId:string}>('/api/deploy',{method:'POST'});
   setActiveJobId(res.jobId);
   setLogsOpen(true);
   await pollBridgeState();
  }catch(e){
   setError((e as Error).message);
  }
 }

 async function cancelJob(jid:string){
  try{
   await bridgeFetch(`/api/jobs/${jid}/cancel`,{method:'POST'});
   await pollBridgeState();
  }catch{}
 }

 const sceneStatus=selectedScene?bridgeScenes[selectedScene.hash]:undefined;
 const effectiveIndexMs=sceneDetail?.indexMs??sceneStatus?.indexMs??(selectedScene?siteIndex[selectedScene.hash]:undefined)??null;
 const actualMs=sceneDetail?.actualMs??null;
 const msMismatch=actualMs!=null&&effectiveIndexMs!=null&&Math.abs(actualMs-effectiveIndexMs)>60;
 const sceneWarn=selectedScene?isTimingWarn(effectiveIndexMs,selectedScene.sceneMs):false;
 const latestJob=runningJob||jobs[0]||null;
 const Visual=selectedAnim?.Visual;

 return <div className="admin-shell">
  <header className="admin-top">
   <a href="/admin">
    <AudioLines size={22}/>
    <b>{L('动画配音导演台','Voice director')}</b>
   </a>
   <div className="top-actions">
    <a href="/admin">{L('题库管理','Admin')}</a>
    <a href="/admin/api">{L('API 工作台','API console')}</a>
    <LanguageControl/>
    <ThemeControl/>
    {authed&&<button className="button secondary" onClick={()=>void handleAdminLogout()}>
     <LogOut size={16}/>{L('退出后台','Sign out')}
    </button>}
   </div>
  </header>

  <main className={authed?'dir-main':'admin-main'}>
   <a href="/admin" className="admin-back">
    <ArrowLeft size={16}/>{L('返回题库管理','Back to admin')}
   </a>

   {authError&&<div className="error" role="alert">{t(authError)}<button onClick={()=>setAuthError('')}>{L('关闭','Dismiss')}</button></div>}
   {error&&<div className="error" role="alert">{error}<button onClick={()=>setError('')}>{L('关闭','Dismiss')}</button></div>}
   {notice&&<div className="admin-notice" role="status"><span>{notice}</span><button type="button" onClick={()=>setNotice('')} aria-label="关闭"><X size={18}/></button></div>}

   {authLoading?<div className="admin-card">{L('正在验证管理员权限…','Checking administrator session…')}</div>:!authed?(
    <section className="admin-entry admin-card">
     <KeyRound size={30}/>
     <h1>{L('凭密钥进入配音导演台','Enter with your management key')}</h1>
     <p>{L('与题库管理共用管理密钥验证，登录后可预览全站动画并连接本机 GPU 进行单句重录与部署。','Authenticated with your management key. Connect to your local GPU bridge once signed in.')}</p>
     <form onSubmit={e=>void handleAdminLogin(e)}>
      <label>{L('管理密钥','Management key')}
       <input type="password" autoComplete="off" value={authKey} onChange={e=>setAuthKey(e.target.value)} required placeholder="adm_…" maxLength={100}/>
      </label>
      <button className="button primary" disabled={authBusy}>{L('进入配音导演台','Open director console')}</button>
     </form>
    </section>
   ):!catalog?(
    <div className="admin-card"><Loader2 size={18} className="animate-spin"/> {L('正在加载全部动画与台词目录…','Loading animation catalog…')}</div>
   ):(
    <>
     <audio
      ref={audioRef}
      crossOrigin={bridgeOnline?'anonymous':undefined}
      onPlay={()=>setIsPlaying(true)}
      onPause={()=>setIsPlaying(false)}
      onEnded={()=>{
       if(playKind==='sequence'&&selectedAnim&&selectedSceneIdx+1<selectedAnim.scenes.length){
        const curSc=selectedAnim.scenes[selectedSceneIdx];
        const curDurMs=playDurMs||effectiveIndexMs||curSc.sceneMs;
        const targetSceneMs=resolveSceneDuration(curSc.sceneMs,curDurMs,liveDraftTiming);
        const waitMs=Math.max(300,Math.round(targetSceneMs-curDurMs));
        const next=selectedSceneIdx+1;
        setIsPlaying(false);
        setPlayProgress(1);
        seqTimerRef.current=window.setTimeout(()=>startSequence(next),waitMs);
        return;
       }
       setIsPlaying(false);
       setPlayKind(null);
       setPlayTakeId(null);
       setPlayProgress(0);
      }}
      onError={()=>{
       setIsPlaying(false);
      }}
     />

     <section className="dir-toolbar">
      <div className="dir-bridge-row">
       <span className={`dir-bridge-dot ${bridgeOnline?'on':'off'}`}>
        {bridgeOnline?<Cpu size={14}/>:<Unplug size={14}/>}
        {bridgeOnline
         ?`本机引擎已连接 · ${modelStatus?.device||'GPU'}${modelStatus?.loaded?` (${modelStatus.vramAllocMb}MB)`:' · 模型未加载'}`
         :'仅线上预览（未连接本机引擎）'}
       </span>
       <input
        className="dir-bridge-input"
        value={bridgeInput}
        onChange={e=>setBridgeInput(e.target.value)}
        placeholder="http://127.0.0.1:8788"
        aria-label="本机引擎地址"
       />
       <button className="button secondary sm" onClick={()=>void connectBridge()}>
        <RefreshCw size={14}/>{bridgeOnline?'重连':'连接本机'}
       </button>
       {bridgeStatusNote&&<span style={{fontSize:12,color:'var(--alert-ink)'}}>{bridgeStatusNote}</span>}
      </div>

      <div className="dir-stat-pills">
       {adminName&&<span className="dir-pill">{adminName}</span>}
       <span className="dir-pill">{catalog.animations.length} 集 / {catalog.uniqueLines} 句</span>
       <span className="dir-pill ok">04 语音：{done04Count}</span>
       {bridgeOnline&&<>
        <button
         className="button secondary sm"
         disabled={modelStatus?.loading}
         onClick={()=>void toggleModel(!modelStatus?.loaded)}
        >
         {modelStatus?.loaded?'释放显存':'预加载模型'}
        </button>
        <button className="button secondary sm" onClick={()=>{setGlossaryDraft(glossary.map(g=>({...g})));setGlossaryOpen(true)}}>
         <BookOpen size={14}/>多音字词库 ({glossary.length})
        </button>
        <button className="button secondary sm" onClick={()=>setBatchOpen(true)}>
         <Layers size={14}/>批量合成
        </button>
        <button className="button secondary sm" onClick={()=>setLogsOpen(true)}>
         <ListChecks size={14}/>任务日志
        </button>
        <button className="button primary sm" disabled={Boolean(runningJob)} onClick={()=>void triggerDeploy()}>
         <CloudUpload size={14}/>构建部署站点
        </button>
       </>}
      </div>
     </section>

     {runningJob&&(
      <div className="dir-job-bar">
       <Loader2 size={16} className="animate-spin"/>
       <b>{runningJob.title}</b>
       <span>{runningJob.message}</span>
       <div className="dir-job-progress">
        <span style={{width:`${Math.round(runningJob.done/Math.max(1,runningJob.total)*100)}%`}}/>
       </div>
       <span>{runningJob.done}/{runningJob.total}</span>
       <button className="button secondary sm" onClick={()=>setLogsOpen(true)}>详情</button>
       <button className="button secondary sm" onClick={()=>void cancelJob(runningJob.id)}>取消</button>
      </div>
     )}

     <div className="dir-work">
      {/* Column 1: Animation list */}
      <aside className="dir-col">
       <div className="dir-col-head">
        <div className="dir-col-title">
         <span>动画列表 ({filteredAnimations.length})</span>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} aria-label="课程分类">
         <option value="all">全部课程 ({catalog.animations.length} 集)</option>
         {catalog.categories.map(c=><option key={c.cat} value={c.cat}>{c.label} ({c.count})</option>)}
        </select>
        <input
         value={search}
         onChange={e=>setSearch(e.target.value)}
         placeholder="搜索动画标题 / 台词 / hash…"
         aria-label="搜索动画"
        />
        <div className="dir-filter-row">
         {([
          ['all','全部'],
          ['04','已换 04'],
          ['kokoro','原声'],
          ['warn','时长异常'],
          ['approved','已通过'],
          ['override','有改稿'],
         ] as [FilterVoice,string][]).map(([id,label])=>(
          <button
           key={id}
           type="button"
           className={`dir-filter-chip ${voiceFilter===id?'on':''}`}
           onClick={()=>setVoiceFilter(id)}
          >{label}</button>
         ))}
        </div>
       </div>
       <div className="dir-col-scroll">
        {filteredAnimations.map(a=>{
         const st=bridgeAnimStats[a.id];
         const on=a.id===selectedAnim?.id;
         return <button
          key={a.id}
          type="button"
          className={`dir-anim-item ${on?'on':''}`}
          onClick={()=>{
           stopPlayback();
           setSelectedAnimId(a.id);
           setSelectedSceneIdx(0);
           setStageKey(k=>k+1);
          }}
         >
          <div className="dir-anim-top">
           <span>{a.icon} {a.title}</span>
          </div>
          <div className="dir-anim-meta">
           <span>{a.catLabel} · {a.scenes.length} 镜</span>
           <span>
            {st?`04:${st.doneCount}/${a.scenes.length}`:`${a.scenes.length} 句`}
            {st&&st.warnCount>0?` · ⚠${st.warnCount}`:''}
           </span>
          </div>
         </button>;
        })}
       </div>
      </aside>

      {/* Column 2: Scene list */}
      <aside className="dir-col">
       <div className="dir-col-head">
        <div className="dir-col-title">
         <span>{selectedAnim?`${selectedAnim.icon} ${selectedAnim.title}`:'分镜列表'}</span>
         <span style={{fontSize:12,color:'var(--quiet)'}}>{selectedAnim?.scenes.length??0} 镜</span>
        </div>
        <div className="dir-inline-row">
         <button
          type="button"
          className="button primary sm"
          onClick={()=>{
           if(playKind==='sequence'&&isPlaying){
            stopPlayback();
           }else{
            startSequence(selectedSceneIdx);
           }
          }}
         >
          {playKind==='sequence'&&isPlaying?<><Square size={13}/>停止连播</>:<><Play size={13}/>从当前镜连播</>}
         </button>
         <label className="dir-check">
          <input type="checkbox" checked={playSfx} onChange={e=>setPlaySfx(e.target.checked)}/>
          音效
         </label>
        </div>
       </div>
       <div className="dir-col-scroll">
        {selectedAnim?.scenes.map((sc,idx)=>{
         const bs=bridgeScenes[sc.hash];
         const idxMs=bs?.indexMs??siteIndex[sc.hash];
         const warn=bs?.timingWarn??isTimingWarn(idxMs,sc.sceneMs);
         const active=idx===selectedScene?.index;
         return <button
          key={`${sc.hash}-${idx}`}
          type="button"
          className={`dir-scene-item ${active?'on':''}`}
          onClick={()=>{
           stopPlayback();
           setSelectedSceneIdx(idx);
           setStageKey(k=>k+1);
          }}
         >
          <div className="dir-scene-head">
           <span>#{idx+1} · {sc.hash}</span>
           <div className="dir-scene-badges">
            {bs?.is04?<span className="dir-badge v04">04</span>:bridgeOnline?<span className="dir-badge kokoro">原声</span>:null}
            {(bs?.hasTiming||Boolean(siteTiming[sc.hash]))&&<span className="dir-badge ok">调时</span>}
            {bs?.hasOverride&&<span className="dir-badge ov">改稿</span>}
            {bs?.approved&&<span className="dir-badge ok">通过</span>}
            {warn&&<span className="dir-badge warn">超时长</span>}
            <span className="dir-badge">{fmtShortSec((bs?.timing?.sceneMs??siteTiming[sc.hash]?.sceneMs)??idxMs??sc.sceneMs)}</span>
           </div>
          </div>
          <div className="dir-scene-text">{sc.caption}</div>
         </button>;
        })}
       </div>
      </aside>

      {/* Column 3: Inspector & Controls */}
      <section className="dir-inspector">
       {!selectedAnim||!selectedScene?(
        <div style={{padding:40,textAlign:'center',color:'var(--quiet)'}}>请选择一集动画与分镜。</div>
       ):(
        <>
         <div className="dir-stage-grid">
          <div className="dir-stage-wrap">
           <div ref={stageBoxRef} className={`an-stage ${!isPlaying?'paused':''}`}>
            <svg viewBox="0 0 640 360" role="img" aria-label={selectedAnim.title}>
             {Visual&&<Visual key={`${selectedAnim.id}-${selectedScene.index}-${stageKey}`} step={selectedScene.index}/>}
            </svg>
            <div className="an-sub" style={{fontSize:stageFontSize,font:stageFont}}>
             <span className="an-sub-line">
              <span>{chunkText}</span>
              <span
               className="an-sub-fill"
               aria-hidden
               style={{clipPath:`inset(0 ${(1-chunkFill)*100}% 0 0)`}}
              >{chunkText}</span>
             </span>
            </div>
           </div>
           <div className="dir-stage-controls">
            <div className="dir-inline-row">
             <button
              type="button"
              className="button primary sm"
              onClick={()=>{
               if(isPlaying&&playKind==='live'){
                audioRef.current?.pause();
               }else{
                setStageKey(k=>k+1);
                if(playSfx)playCue(selectedScene.cue,1);
                void startAudio(selectedScene.hash,'live');
               }
              }}
             >
              {isPlaying&&playKind==='live'?<><Pause size={14}/>暂停</>:<><Volume2 size={14}/>试听当前正式版</>}
             </button>
             {sceneDetail?.hasOriginalBackup&&(
              <button
               type="button"
               className="button secondary sm"
               onClick={()=>void startAudio(selectedScene.hash,'original')}
              >试听原版 ({fmtShortSec(sceneDetail.originalMs)})</button>
             )}
             {isPlaying&&<button type="button" className="button secondary sm" onClick={stopPlayback}><Square size={13}/>停止</button>}
            </div>
            <span style={{fontSize:12,color:'var(--quiet)',fontVariantNumeric:'tabular-nums'}}>
             {playCurMs}ms / {playDurMs||effectiveIndexMs||'--'}ms
            </span>
           </div>
          </div>

          <div className="dir-panel">
           <div className="dir-panel-title">
            <span>时长对齐与波形精剪 · {selectedScene.hash}</span>
            {sceneLoading&&<Loader2 size={14} className="animate-spin"/>}
           </div>
           <div className="dir-stats-3">
            <div className="dir-stat-box">
             <small>实际音频</small>
             <strong>{actualMs!=null?fmtMs(actualMs):(bridgeOnline?'无文件':'需连接本机')}</strong>
            </div>
            <div className="dir-stat-box">
             <small>index.json {msMismatch?'⚠ 差异大':''}</small>
             <strong style={{color:msMismatch?'var(--alert-ink)':undefined}}>{fmtMs(effectiveIndexMs)}</strong>
            </div>
            <div className="dir-stat-box">
             <small>分镜预设 {sceneWarn?'⚠':''}</small>
             <strong style={{color:sceneWarn?'var(--alert-ink)':undefined}}>{fmtMs(selectedScene.sceneMs)}</strong>
            </div>
           </div>

           <div className="dir-wave-box">
            <canvas
             ref={waveCanvasRef}
             className="dir-wave-canvas"
             onPointerDown={onWavePointerDown}
             onPointerMove={onWavePointerMove}
             onPointerUp={onWavePointerUp}
             onPointerCancel={onWavePointerUp}
            />
            <div className="dir-wave-foot">
             <span>绿线起点 {trimStartMs}ms · 红线终点 {trimEndMs}ms · 保留 {Math.max(0,trimEndMs-trimStartMs)}ms</span>
             <span>点击波形可跳转试听</span>
            </div>
           </div>

           {bridgeOnline&&(
            <>
             <div className="dir-grid-3">
              <label>起点 ms
               <input type="number" min={0} step={20} value={trimStartMs} onChange={e=>setTrimStartMs(Math.max(0,Number(e.target.value)))}/>
              </label>
              <label>终点 ms
               <input type="number" min={100} step={20} value={trimEndMs} onChange={e=>setTrimEndMs(Math.max(100,Number(e.target.value)))}/>
              </label>
              <label>语速倍率 ({editSpeed.toFixed(2)}x)
               <input type="range" min={0.7} max={1.5} step={0.02} value={editSpeed} onChange={e=>setEditSpeed(Number(e.target.value))}/>
              </label>
             </div>
             <div className="dir-grid-3">
              <label>前补静音 ms
               <input type="number" min={0} max={2000} step={50} value={editPadStartMs} onChange={e=>setEditPadStartMs(Number(e.target.value)||0)}/>
              </label>
              <label>后补静音 ms
               <input type="number" min={0} max={2000} step={50} value={editPadEndMs} onChange={e=>setEditPadEndMs(Number(e.target.value)||0)}/>
              </label>
              <label>手动 indexMs
               <input type="number" min={200} max={120000} step={50} value={customMsDraft} onChange={e=>setCustomMsDraft(e.target.value)}/>
              </label>
             </div>
             <div className="dir-inline-row">
              <label className="dir-check"><input type="checkbox" checked={editAutoTrim} onChange={e=>setEditAutoTrim(e.target.checked)}/>自动去静音</label>
              <label className="dir-check"><input type="checkbox" checked={editNormalize} onChange={e=>setEditNormalize(e.target.checked)}/>响度归一化</label>
              <label className="dir-check"><input type="checkbox" checked={editAutoApply} onChange={e=>setEditAutoApply(e.target.checked)}/>剪后即应用</label>
             </div>
             <div className="dir-inline-row">
              <button type="button" className="button primary sm" disabled={editBusy} onClick={()=>void runEditAudio()}>
               <Scissors size={14}/>{editBusy?'处理中…':'零 GPU 精剪当前音频'}
              </button>
              <button type="button" className="button secondary sm" onClick={()=>void syncMs('actual')}>用实际音频对齐 index.json</button>
              <button type="button" className="button secondary sm" onClick={()=>void syncMs('custom')}>写入自定义 ms</button>
              {sceneDetail?.hasOriginalBackup&&(
               <button type="button" className="button secondary sm" onClick={()=>void restoreOriginal()}>
                <RotateCcw size={13}/>恢复原版 MP3
               </button>
              )}
             </div>
            </>
           )}
          </div>
         </div>

         {/* Video scene duration & subtitle sync calibration (timing.json) */}
         <div className="dir-panel">
          <div className="dir-panel-title">
           <span>影片时长与字幕同步校准（不动音频 · 试听实时预览）</span>
           <span style={{fontSize:12,color:'var(--quiet)'}}>
            最终分镜时长：{fmtShortSec(resolveSceneDuration(selectedScene.sceneMs,effectiveIndexMs,liveDraftTiming))}
            {sceneDetail?.speechStartMs!=null&&sceneDetail?.speechEndMs!=null
             ?` · 检测人声 ${sceneDetail.speechStartMs}ms ~ ${sceneDetail.speechEndMs}ms`:''}
           </span>
          </div>
          <div className="dir-grid-3">
           <label>影片分镜时长 ms（留空=音频+300ms）
            <input
             type="number"
             min={400}
             max={120000}
             step={100}
             placeholder={String(resolveSceneDuration(selectedScene.sceneMs,effectiveIndexMs,null))}
             value={timingSceneMsDraft}
             onChange={e=>setTimingSceneMsDraft(e.target.value)}
            />
           </label>
           <label>字幕速度倍率 ({timingSubSpeedDraft.toFixed(2)}× · 调大=字走更快)
            <input
             type="range"
             min={0.6}
             max={2.0}
             step={0.05}
             value={timingSubSpeedDraft}
             onChange={e=>setTimingSubSpeedDraft(Number(e.target.value))}
            />
           </label>
           <label>字幕走完耗时 ms（留空=按音频时长）
            <input
             type="number"
             min={200}
             max={120000}
             step={100}
             placeholder={String(effectiveIndexMs??actualMs??selectedScene.sceneMs)}
             value={timingSubDurDraft}
             onChange={e=>setTimingSubDurDraft(e.target.value)}
            />
           </label>
          </div>
          <div className="dir-grid-2">
           <label>字幕起跑偏移 ms（负数=提前出字，正数=晚出字）
            <input
             type="number"
             min={-5000}
             max={15000}
             step={50}
             value={timingSubStartDraft}
             onChange={e=>setTimingSubStartDraft(Number(e.target.value)||0)}
            />
           </label>
           <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:6}}>
            <span style={{fontSize:12,color:'var(--quiet)'}}>快捷字幕速度 / 分镜时长微调：</span>
            <div className="dir-inline-row">
             {[1.0,1.15,1.25,1.35,1.5].map(v=>(
              <button
               key={v}
               type="button"
               className={`dir-filter-chip ${Math.abs(timingSubSpeedDraft-v)<0.01?'on':''}`}
               onClick={()=>setTimingSubSpeedDraft(v)}
              >{v}×</button>
             ))}
             <button
              type="button"
              className="dir-filter-chip"
              onClick={()=>{
               const cur=Number(timingSceneMsDraft)||resolveSceneDuration(selectedScene.sceneMs,effectiveIndexMs,null);
               setTimingSceneMsDraft(String(Math.max(500,cur-500)));
              }}
             >影片 -0.5s</button>
             <button
              type="button"
              className="dir-filter-chip"
              onClick={()=>{
               const cur=Number(timingSceneMsDraft)||resolveSceneDuration(selectedScene.sceneMs,effectiveIndexMs,null);
               setTimingSceneMsDraft(String(cur+500));
              }}
             >影片 +0.5s</button>
            </div>
           </div>
          </div>
          <div className="dir-inline-row">
           {sceneDetail?.speechStartMs!=null&&sceneDetail?.speechEndMs!=null&&(
            <button
             type="button"
             className="button secondary sm"
             onClick={()=>{
              setTimingSubStartDraft(sceneDetail.speechStartMs??0);
              setTimingSubDurDraft(String(Math.max(200,(sceneDetail.speechEndMs??0)-(sceneDetail.speechStartMs??0))));
              setNotice('已填入人声起止区间，点试听即可核对效果，满意后点保存');
             }}
            >按波形自动贴合人声起止</button>
           )}
           {bridgeOnline?(
            <>
             <button type="button" className="button primary sm" disabled={savingTiming} onClick={()=>void saveTiming(false)}>
              <Save size={14}/>{savingTiming?'保存中…':'保存本镜时长与字幕校准'}
             </button>
             <button type="button" className="button secondary sm" disabled={savingTiming} onClick={()=>void saveTiming(true)}>
              还原默认同步
             </button>
             <button
              type="button"
              className="button secondary sm"
              disabled={savingTiming}
              onClick={()=>void applyEpisodeTiming({alignSpeech:true,subSpeed:timingSubSpeedDraft})}
             >整集按人声波形 + {timingSubSpeedDraft.toFixed(2)}× 一键校准</button>
            </>
           ):(
            <span style={{fontSize:12,color:'var(--quiet)'}}>当前为线上预览模式，调参可实时试听；连接本机导演引擎后可保存至 timing.json 并部署。</span>
           )}
          </div>
         </div>

         <div className="dir-stage-grid">
          {/* Script & Glossary Override */}
          <div className="dir-panel">
           <div className="dir-panel-title">
            <span>台词稿与多音字校准</span>
            <div className="dir-inline-row">
             {bridgeOnline&&(
              <label className="dir-check">
               <input
                type="checkbox"
                checked={approvedDraft}
                onChange={e=>{
                 setApprovedDraft(e.target.checked);
                 void saveScript(e.target.checked);
                }}
               />
               <CheckCircle2 size={14}/>审校通过
              </label>
             )}
            </div>
           </div>
           <div className="dir-preview-text">
            <b>画面字幕：</b>{selectedScene.caption}
            {selectedScene.raw!==selectedScene.caption&&<div><b>完整台词：</b>{selectedScene.raw}</div>}
            <div><b>默认朗读：</b>{selectedScene.defaultSpoken}</div>
           </div>
           <label>自定义朗读覆写（可直接改多音字写法/加逗号控制停顿，留空则沿用默认朗读）
            <textarea
             rows={3}
             value={overrideDraft}
             onChange={e=>setOverrideDraft(e.target.value)}
             placeholder={selectedScene.defaultSpoken}
             disabled={!bridgeOnline}
            />
           </label>
           <div className="dir-preview-text">
            <b>实际送入 TTS 的最终文本：</b>{liveEffectivePreview}
           </div>
           <label>导演备注（标记问题原因：如多音字“行”、结尾拖长等）
            <input
             value={notesDraft}
             onChange={e=>setNotesDraft(e.target.value)}
             placeholder="记录备注…"
             disabled={!bridgeOnline}
            />
           </label>
           {bridgeOnline&&(
            <div className="dir-inline-row">
             <button type="button" className="button secondary sm" disabled={savingScript} onClick={()=>void saveScript()}>
              <Save size={14}/>保存台词与备注
             </button>
             {overrideDraft&&(
              <button type="button" className="button secondary sm" onClick={()=>setOverrideDraft('')}>恢复默认朗读</button>
             )}
            </div>
           )}
          </div>

          {/* GPU Synthesis + Takes Audition */}
          <div className="dir-panel">
           <div className="dir-panel-title">
            <span>Qwen3-TTS 04 重录与 Takes A/B 对比</span>
           </div>
           {!bridgeOnline?(
            <p style={{fontSize:13,color:'var(--quiet)',margin:0}}>
             请在本地运行 <code>director\launch_director.bat</code> 后点击顶部「连接本机」，即可在此线上页面直接调用本机 GPU 重录、试听多个 Takes、裁剪音频并部署到 Cloudflare Workers。
            </p>
           ):(
            <>
             <div className="dir-grid-3">
              <label>参考模式
               <select value={synthMode} onChange={e=>setSynthMode(e.target.value as SynthMode)}>
                <option value="short6_ICL">short6_ICL (推荐极稳)</option>
                <option value="full_04_ICL">full_04_ICL (完整提示)</option>
                <option value="x_vector_only">x_vector_only (仅音色)</option>
               </select>
              </label>
              <label>随机种子 (0=随机)
               <input type="number" min={0} value={synthSeed} onChange={e=>setSynthSeed(Number(e.target.value)||0)}/>
              </label>
              <label>语速 ({synthSpeed.toFixed(2)}x)
               <input type="range" min={0.75} max={1.35} step={0.02} value={synthSpeed} onChange={e=>setSynthSpeed(Number(e.target.value))}/>
              </label>
             </div>
             <div className="dir-grid-2">
              <label>Temperature ({synthTemp.toFixed(2)})
               <input type="range" min={0.3} max={1.2} step={0.05} value={synthTemp} onChange={e=>setSynthTemp(Number(e.target.value))}/>
              </label>
              <label>Top-P ({synthTopP.toFixed(2)})
               <input type="range" min={0.5} max={1.0} step={0.05} value={synthTopP} onChange={e=>setSynthTopP(Number(e.target.value))}/>
              </label>
             </div>
             <div className="dir-inline-row">
              <label className="dir-check"><input type="checkbox" checked={synthAutoTrim} onChange={e=>setSynthAutoTrim(e.target.checked)}/>去首尾静音</label>
              <label className="dir-check"><input type="checkbox" checked={synthApplyGlossary} onChange={e=>setSynthApplyGlossary(e.target.checked)}/>套用多音字词库</label>
              <label className="dir-check"><input type="checkbox" checked={synthAutoApply} onChange={e=>setSynthAutoApply(e.target.checked)}/>记住勾选自动应用</label>
             </div>
             <div className="dir-inline-row">
              <button
               type="button"
               className="button secondary sm"
               disabled={synthBusy||Boolean(runningJob)}
               onClick={()=>void runSynthesize(false)}
              >
               <Sparkles size={14}/>生成 Take（不覆盖正式版）
              </button>
              <button
               type="button"
               className="button primary sm"
               disabled={synthBusy||Boolean(runningJob)}
               onClick={()=>void runSynthesize(true)}
              >
               <Wand2 size={14}/>生成并设为正式版
              </button>
             </div>

             <div style={{fontSize:12.5,fontWeight:700,marginTop:4}}>
              历史 Takes ({sceneDetail?.takes?.length??0})
             </div>
             <div className="dir-takes-list">
              {!sceneDetail?.takes?.length?(
               <div style={{fontSize:12,color:'var(--quiet)',padding:8}}>本句暂无独立试听 Takes，点击上方「生成 Take」即可多版本对比。</div>
              ):sceneDetail.takes.map(tk=>(
               <div key={tk.id} className={`dir-take-row ${playKind==='take'&&playTakeId===tk.id?'playing':''}`}>
                <div className="dir-take-meta">
                 <b>{tk.mode} · {(tk.ms/1000).toFixed(2)}s · seed={tk.seed} · RMS={tk.rms}</b>
                 <small title={tk.text}>{tk.createdAt} · {tk.text}</small>
                </div>
                <div className="dir-inline-row">
                 <button type="button" className="button secondary sm" onClick={()=>void startAudio(selectedScene.hash,'take',tk.id)}>试听</button>
                 <button type="button" className="button primary sm" onClick={()=>void applyTake(tk.id)}>设为正式版</button>
                </div>
               </div>
              ))}
             </div>
            </>
           )}
          </div>
         </div>
        </>
       )}
      </section>
     </div>
    </>
   )}
  </main>

  {/* Global Glossary Dialog */}
  <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
   <DialogContent style={{maxWidth:'min(760px,95vw)'}}>
    <DialogHeader>
     <DialogTitle>全局多音字 / 术语读法词库</DialogTitle>
     <DialogDescription>合成语音前按顺序自动替换文本（只改变配音读法，不修改动画字幕）。</DialogDescription>
    </DialogHeader>
    <div className="dir-glossary-table">
     {glossaryDraft.map((rule,idx)=>(
      <div key={idx} className="dir-glossary-row">
       <input
        type="checkbox"
        checked={rule.enabled}
        onChange={e=>setGlossaryDraft(prev=>prev.map((r,i)=>i===idx?{...r,enabled:e.target.checked}:r))}
       />
       <input
        placeholder="原词 (如 KV Cache)"
        value={rule.find}
        onChange={e=>setGlossaryDraft(prev=>prev.map((r,i)=>i===idx?{...r,find:e.target.value}:r))}
       />
       <input
        placeholder="改读 (如 KV 缓存)"
        value={rule.replace}
        onChange={e=>setGlossaryDraft(prev=>prev.map((r,i)=>i===idx?{...r,replace:e.target.value}:r))}
       />
       <input
        placeholder="备注"
        value={rule.note??''}
        onChange={e=>setGlossaryDraft(prev=>prev.map((r,i)=>i===idx?{...r,note:e.target.value}:r))}
       />
       <button
        type="button"
        className="button secondary sm"
        onClick={()=>setGlossaryDraft(prev=>prev.filter((_,i)=>i!==idx))}
        aria-label="删除规则"
       ><Trash2 size={14}/></button>
      </div>
     ))}
    </div>
    <div className="dir-inline-row" style={{justifyContent:'space-between',marginTop:12}}>
     <button
      type="button"
      className="button secondary sm"
      onClick={()=>setGlossaryDraft(prev=>[...prev,{find:'',replace:'',enabled:true,note:''}])}
     ><Plus size={14}/>新增词条</button>
     <button type="button" className="button primary sm" onClick={()=>void saveGlossary()}>
      <Save size={14}/>保存全局词库
     </button>
    </div>
   </DialogContent>
  </Dialog>

  {/* Batch Synthesize Dialog */}
  <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
   <DialogContent style={{maxWidth:'min(560px,94vw)'}}>
    <DialogHeader>
     <DialogTitle>批量 04 语音合成</DialogTitle>
     <DialogDescription>按选定范围提交给本机 RTX 4090 Qwen3-TTS 批量生成并更新站点 MP3。</DialogDescription>
    </DialogHeader>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
     <label>合成范围
      <select value={batchScope} onChange={e=>setBatchScope(e.target.value as 'anim'|'cat'|'filtered')} style={{width:'100%',padding:8,marginTop:4,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface-soft)'}}>
       <option value="anim">当前动画：{selectedAnim?.title??'--'}</option>
       <option value="cat">当前课程分类：{catFilter==='all'?'全部课程':catFilter}</option>
       <option value="filtered">当前左侧筛选结果 ({filteredAnimations.length} 集)</option>
      </select>
     </label>
     <div className="dir-grid-3">
      <label>参考模式
       <select value={batchMode} onChange={e=>setBatchMode(e.target.value as SynthMode)} style={{width:'100%',padding:8,marginTop:4,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface-soft)'}}>
        <option value="short6_ICL">short6_ICL</option>
        <option value="full_04_ICL">full_04_ICL</option>
        <option value="x_vector_only">x_vector_only</option>
       </select>
      </label>
      <label>语速 ({batchSpeed.toFixed(2)}x)
       <input type="range" min={0.75} max={1.35} step={0.02} value={batchSpeed} onChange={e=>setBatchSpeed(Number(e.target.value))}/>
      </label>
      <label>Temp ({batchTemp.toFixed(2)})
       <input type="range" min={0.3} max={1.2} step={0.05} value={batchTemp} onChange={e=>setBatchTemp(Number(e.target.value))}/>
      </label>
     </div>
     <div className="dir-inline-row">
      <label className="dir-check"><input type="checkbox" checked={batchSkipDone} onChange={e=>setBatchSkipDone(e.target.checked)}/>跳过已完成 04 替换的句子</label>
      <label className="dir-check"><input type="checkbox" checked={batchApplyGlossary} onChange={e=>setBatchApplyGlossary(e.target.checked)}/>应用全局词库</label>
     </div>
     <div className="dir-preview-text">预计加入队列：<b>{batchHashes.length}</b> 句待合成</div>
     <button
      type="button"
      className="button primary"
      disabled={!batchHashes.length||Boolean(runningJob)}
      onClick={()=>void runBatch()}
     >
      <Sparkles size={15}/>开始批量合成 ({batchHashes.length} 句)
     </button>
    </div>
   </DialogContent>
  </Dialog>

  {/* Jobs & Deploy Logs Dialog */}
  <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
   <DialogContent style={{maxWidth:'min(760px,95vw)'}}>
    <DialogHeader>
     <DialogTitle>后台任务与构建部署日志</DialogTitle>
     <DialogDescription>展示本机 GPU 合成队列与 Cloudflare Workers 部署实时日志。</DialogDescription>
    </DialogHeader>
    {latestJob?(
     <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div className="dir-inline-row" style={{justifyContent:'space-between'}}>
       <b>{latestJob.title} · {latestJob.status}</b>
       <span>{latestJob.done}/{latestJob.total}</span>
      </div>
      <div style={{fontSize:13,color:'var(--body-ink)'}}>{latestJob.message}</div>
      <div className="dir-log-box">
       {latestJob.logs.length?latestJob.logs.join('\n'):'等待日志输出…'}
      </div>
      {latestJob.status==='running'&&(
       <button type="button" className="button secondary sm" onClick={()=>void cancelJob(latestJob.id)}>取消当前任务</button>
      )}
     </div>
    ):<div style={{fontSize:13,color:'var(--quiet)'}}>暂无运行中的任务记录。</div>}
   </DialogContent>
  </Dialog>
 </div>;
}
