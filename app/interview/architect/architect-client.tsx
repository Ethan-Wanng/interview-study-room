'use client';
import '../../ai/ai.css';
import '../interview.css';
import './architect.css';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,ChevronDown,ChevronUp,Copy,History,Loader2,Lock,Plus,RotateCcw,Send,Sparkles,Square,X} from 'lucide-react';
import SiteHeader from '../../components/site-header';
import AddToNoteButton from '../../components/add-to-note';
import {useI18n} from '../../components/i18n';
import {getActiveGlobalThinkingLevel,shouldUseLocalBridge,useGlobalAiModel} from '../../ai/thinking-pref';
import {classifySafeHref,splitBareUrlTrailing} from '@/lib/safe-href';
import {LOCAL_PROVIDER_LABEL,useLocalBridgeConfig} from '@/lib/local-bridge-config';
import {streamDeepViaBridge} from '@/lib/local-bridge-client';

const DESIGN_SYSTEM=`你是顶级互联网大厂（P8/Staff 级别）系统设计与架构面试官。请对候选人的架构方案进行深度、务实、直击要害的技术评审（不要执行 shell 命令或写文件，直接基于专业架构经验作答，必要时可核查最新主流工程实践）。
输出结构请使用清晰 Markdown：
1. **综合评级与一句话结论**（给出 10 分制评分与当前水平定位，如 P6/P7/P8）
2. **方案亮点**（2–3 条具体肯定）
3. **关键漏洞与瓶颈拆解**（按严重程度列出 3–5 个具体问题：高并发热点、数据一致性、故障降级、容量估算、扩展性等，并给出可落地的修复架构）
4. **生产级改进架构要点**（给出关键链路或核心数据结构/SQL/伪代码要点）
5. **面试官深度追问（3 题）**（模拟真实二面/终面最刁钻的 3 个连环追问，引导候选人在下方继续作答）
语气专业、直接、有干货，用简体中文输出。`;

const MOCK_SYSTEM=`你是顶级互联网大厂（P8/Staff 级别）高阶技术面试官，正在进行真实的多轮深度技术面（不要执行 shell 命令或写文件，直接用简体中文输出）。
针对候选人的回答：
1. 先精准点评回答的**深度、准确度与遗漏边界**（指出模糊或背八股的地方，给出 10 分制当轮得分）；
2. 补充生产级底层原理或关键取舍（带具体数字/场景，简洁硬核）；
3. 顺着候选人回答中最薄弱或最值得深挖的点，抛出 **1–2 个层层递进的真实追问**，等待候选人下一轮继续回答。`;

type Mode='design'|'mock';
type Usage={totalTokens:number;inputTokens:number;cachedTokens:number;outputTokens:number;thoughtTokens:number};
type Turn={
 id:string;
 userText:string;
 status:'running'|'done'|'error';
 text:string;
 thoughts:string;
 cached?:boolean;
 usage?:Usage;
 error?:string;
 interactionId?:string;
 sig?:string;
};

type CloudRecord={
 id:string;
 title:string;
 subtitle:string;
 status:'running'|'completed'|'error';
 interactionId:string;
 sig?:string;
 ckSig?:string;
 payload:{mode?:Mode;topic?:string;cacheKey?:string;turns?:Turn[]};
 createdAt:number;
 updatedAt:number;
};

const PRESETS:{id:string;zh:string;en:string;topicZh:string;topicEn:string}[]=[
 {id:'seckill',zh:'高并发秒杀系统',en:'Flash Sale System',topicZh:'设计一个支持 10 万 QPS 的高并发电商秒杀系统（库存扣减、防超卖、削峰与最终一致性）',topicEn:'Design a 100k QPS flash-sale system covering inventory deduction, oversell prevention, and eventual consistency'},
 {id:'ratelimit',zh:'分布式限流与熔断',en:'Distributed Rate Limiter',topicZh:'设计跨多机房的分布式限流、熔断与降级网关（支持令牌桶/滑动窗口与突发流量保护）',topicEn:'Design a multi-region distributed rate limiter and circuit-breaker gateway'},
 {id:'feed',zh:'亿级 Feed 流与缓存',en:'Billion-Scale Feed',topicZh:'设计亿级用户的社交信息流（推拉结合、大 V 热点缓存击穿与冷热分离）',topicEn:'Design a billion-user social feed with fan-out hybrid and hot-key protection'},
 {id:'tx',zh:'分布式事务与对账',en:'Distributed Transactions',topicZh:'设计金融支付场景的分布式事务、幂等防重与 T+1 异步对账补偿体系',topicEn:'Design payment distributed transactions, idempotency, and asynchronous reconciliation'},
 {id:'rag',zh:'AI Agent 与 RAG 架构',en:'Production Agent & RAG',topicZh:'设计高并发企业级 AI Agent + RAG 检索问答系统（提示缓存、流式编排、幻觉评测与限流降级）',topicEn:'Design a production AI Agent + RAG platform with prompt caching, streaming, evals, and fallback'},
 {id:'shorturl',zh:'短链与高可用存储',en:'URL Shortener',topicZh:'设计百亿级高可用短链生成与 302 跳转服务（发号器、布隆过滤器、多级缓存与防刷）',topicEn:'Design a 10B-scale high-availability URL shortener with multi-tier caching'},
];

const ARCH_BARE_URL_RE=/https?:\/\/[^\s<>"'`\u4e00-\u9fff]+/g;
function renderArchBareUrls(s:string,keyPrefix:string){
 const out:React.ReactNode[]=[];
 let last=0;
 ARCH_BARE_URL_RE.lastIndex=0;
 let m:RegExpExecArray|null;
 while((m=ARCH_BARE_URL_RE.exec(s))!==null){
  if(m.index>last)out.push(<span key={`${keyPrefix}-t-${last}`}>{s.slice(last,m.index)}</span>);
  const {url,trailing}=splitBareUrlTrailing(m[0]);
  const safe=classifySafeHref(url);
  if(safe?.external){
   out.push(<a key={`${keyPrefix}-u-${m.index}`} className="tutor-link tutor-ext-link" href={safe.href} target="_blank" rel="noopener noreferrer">{url}</a>);
   if(trailing)out.push(<span key={`${keyPrefix}-tr-${m.index}`}>{trailing}</span>);
  }else{
   out.push(<span key={`${keyPrefix}-r-${m.index}`}>{m[0]}</span>);
  }
  last=m.index+m[0].length;
 }
 if(last===0)return <>{s}</>;
 if(last<s.length)out.push(<span key={`${keyPrefix}-e`}>{s.slice(last)}</span>);
 return <>{out}</>;
}

function renderInline(line:string){
 const parts=line.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g);
 return parts.map((p,i)=>{
  if(p.startsWith('`')&&p.endsWith('`')&&p.length>2)return <code key={i}>{p.slice(1,-1)}</code>;
  if(p.startsWith('**')&&p.endsWith('**')&&p.length>4)return <strong key={i}>{p.slice(2,-2)}</strong>;
  const lm=p.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);
  if(lm){
   const safe=classifySafeHref(lm[2]);
   if(safe){
    return safe.external
     ?<a key={i} className="tutor-link tutor-ext-link" href={safe.href} target="_blank" rel="noopener noreferrer">{lm[1]}</a>
     :<a key={i} className="tutor-link" href={safe.href}>{lm[1]}</a>;
   }
  }
  return <span key={i}>{renderArchBareUrls(p,`a${i}`)}</span>;
 });
}

function ReviewMarkdown({text}:{text:string}){
 const blocks=text.replace(/\r\n/g,'\n').split(/(```[\s\S]*?```)/g);
 return (
  <div className="arch-md">
   {blocks.map((blk,bi)=>{
    if(blk.startsWith('```')&&blk.endsWith('```')){
     const inner=blk.slice(3,-3);
     const nl=inner.indexOf('\n');
     const code=nl>=0?inner.slice(nl+1):inner;
     return <pre key={bi}><code>{code.trimEnd()}</code></pre>;
    }
    const lines=blk.split('\n');
    return (
     <div key={bi}>
      {lines.map((line,li)=>{
       const t=line.trim();
       if(!t)return null;
       if(/^###\s+/.test(t))return <h4 key={li}>{renderInline(t.replace(/^###\s+/,''))}</h4>;
       if(/^##\s+/.test(t))return <h3 key={li}>{renderInline(t.replace(/^##\s+/,''))}</h3>;
       if(/^#\s+/.test(t))return <h3 key={li}>{renderInline(t.replace(/^#\s+/,''))}</h3>;
       if(/^[-*]\s+/.test(t))return <p key={li} className="arch-li">• {renderInline(t.replace(/^[-*]\s+/,''))}</p>;
       if(/^\d+\.\s+/.test(t))return <p key={li} className="arch-li">{renderInline(t)}</p>;
       return <p key={li}>{renderInline(t)}</p>;
      })}
     </div>
    );
   })}
  </div>
 );
}

const fmtTok=(n:number)=>n>=1000?`${(n/1000).toFixed(1)}K`:String(n);

 export default function ArchitectClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [globalModel]=useGlobalAiModel();
 const [localCfg]=useLocalBridgeConfig();
 const useLocal=shouldUseLocalBridge('deep',globalModel,localCfg);
 const thinkingLevel=getActiveGlobalThinkingLevel(globalModel,localCfg,null,!username);

 const [mode,setMode]=useState<Mode>('design');
 const [topic,setTopic]=useState(PRESETS[0].topicZh);
 const [answer,setAnswer]=useState('');
 const [followup,setFollowup]=useState('');
 const [records,setRecords]=useState<CloudRecord[]>([]);
 const [recordId,setRecordId]=useState('');
 const [turns,setTurns]=useState<Turn[]>([]);
 const [busy,setBusy]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [error,setError]=useState('');
 const [openThoughts,setOpenThoughts]=useState<Record<string,boolean>>({});
 const [copiedId,setCopiedId]=useState('');

 const pollAbortRef=useRef<AbortController|null>(null);
 const timerRef=useRef<number|null>(null);

 const stopActive=()=>{
  pollAbortRef.current?.abort();
  pollAbortRef.current=null;
  if(timerRef.current!==null){
   window.clearInterval(timerRef.current);
   timerRef.current=null;
  }
  setBusy(false);
 };

 useEffect(()=>()=>{stopActive()},[]);

 const refreshRecords=async():Promise<CloudRecord[]>=>{
  try{
   const r=await fetch('/api/ai-interview-records?kind=architect',{cache:'no-store'});
   if(!r.ok)return [];
   const d=await r.json() as {items?:CloudRecord[]};
   const items=Array.isArray(d.items)?d.items:[];
   setRecords(items);
   return items;
  }catch{
   return [];
  }
 };

 const pollExistingTurn=async(opts:{
  recId:string;
  turnId:string;
  interactionId:string;
  sig:string;
  cacheKey?:string;
  ckSig?:string;
  startedAt?:number;
 })=>{
  stopActive();
  setBusy(true);
  const t0=opts.startedAt||Date.now();
  setElapsed(Math.max(0,Math.floor((Date.now()-t0)/1000)));
  const ctl=new AbortController();
  pollAbortRef.current=ctl;
  timerRef.current=window.setInterval(()=>{
   setElapsed(Math.max(0,Math.floor((Date.now()-t0)/1000)));
  },1000);

  const patchTurn=(patch:Partial<Turn>)=>setTurns(list=>list.map(t=>t.id===opts.turnId?{...t,...patch}:t));
  const pollParams=new URLSearchParams({
   id:opts.interactionId,
   sig:opts.sig,
   rid:opts.recId,
  });
  if(opts.cacheKey&&opts.ckSig){
   pollParams.set('ck',opts.cacheKey);
   pollParams.set('ckSig',opts.ckSig);
  }

  try{
   for(let attempt=0;attempt<65;attempt++){
    if(ctl.signal.aborted)return;
    if(attempt>0){
     await new Promise<void>((resolve,reject)=>{
      const tid=window.setTimeout(resolve,3000);
      ctl.signal.addEventListener('abort',()=>{window.clearTimeout(tid);reject(new Error('aborted'))},{once:true});
     });
    }
    if(ctl.signal.aborted)return;
    const pr=await fetch('/api/architect-review?'+pollParams.toString(),{cache:'no-store',signal:ctl.signal});
    const pd=await pr.json() as {
     status?:string;
     text?:string;
     thoughts?:string;
     usage?:Usage;
     error?:string;
    };
    if(!pr.ok)throw new Error(pd.error??L('查询进度失败','Polling failed'));
    if(pd.status==='completed'){
     patchTurn({
      status:'done',
      text:pd.text||L('（未返回文本内容）','(Empty response)'),
      thoughts:pd.thoughts||'',
      usage:pd.usage,
      interactionId:opts.interactionId,
      sig:opts.sig,
     });
     void refreshRecords();
     stopActive();
     return;
    }
    if(pd.status==='failed'||pd.status==='cancelled'){
     void refreshRecords();
     throw new Error(pd.error||L('评审任务中断，请重试','Review failed'));
    }
   }
   throw new Error(L('评审超时，请重试','Review timed out'));
  }catch(e){
   if(ctl.signal.aborted){
    patchTurn({status:'error',error:L('已取消','Cancelled')});
   }else{
    patchTurn({status:'error',error:(e as Error).message||L('评审失败','Review failed')});
   }
   stopActive();
  }
 };

 const hydrateRecord=(rec:CloudRecord)=>{
  stopActive();
  setError('');
  setRecordId(rec.id);
  setMode(rec.payload?.mode==='mock'?'mock':'design');
  setTopic(rec.payload?.topic||rec.title||PRESETS[0].topicZh);
  const rawTurns=Array.isArray(rec.payload?.turns)?rec.payload.turns:[];
  const withSig=rawTurns.map(t=>t.interactionId&&t.interactionId===rec.interactionId&&rec.sig?{...t,sig:rec.sig}:t);
  setTurns(withSig);
  const running=withSig.find(t=>t.status==='running');
  if(running&&rec.interactionId&&rec.sig){
   void pollExistingTurn({
    recId:rec.id,
    turnId:running.id,
    interactionId:rec.interactionId,
    sig:rec.sig,
    cacheKey:rec.payload?.cacheKey,
    ckSig:rec.ckSig,
    startedAt:rec.updatedAt||rec.createdAt,
   });
  }
 };

 useEffect(()=>{
  let alive=true;
  const p=new URLSearchParams(window.location.search);
  const qMode=p.get('mode');
  const qTopic=p.get('topic')?.trim();
  if(qMode==='mock'||qMode==='design')setMode(qMode);
  if(qTopic)setTopic(qTopic.slice(0,200));

  (async()=>{
   const items=await refreshRecords();
   if(!alive||qTopic||!items.length)return;
   hydrateRecord(items[0]);
  })();
  return()=>{alive=false};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[username]);

 const lastSession=turns.slice().reverse().find(t=>t.status==='done'&&t.interactionId&&t.sig);
 const lastDoneTurn=turns.slice().reverse().find(t=>t.status==='done');

 const runTurn=async(userInput:string,prev?:{interactionId?:string;sig?:string;followupContext?:string})=>{
  const cleanTopic=topic.trim();
  const cleanAns=userInput.trim();
  if(!cleanAns){
   setError(L('请先输入你的方案或回答','Enter your design or answer'));
   return;
  }
  if(!prev?.interactionId&&!cleanTopic){
   setError(L('请先填写或选择一个题目','Enter or choose a topic'));
   return;
  }

  stopActive();
  setError('');
  setBusy(true);
  setElapsed(0);

  const localTurnId='t-'+Date.now();
  setTurns(list=>[...list,{id:localTurnId,userText:cleanAns,status:'running',text:'',thoughts:''}]);
  if(prev)setFollowup('');

  const ctl=new AbortController();
  pollAbortRef.current=ctl;
  const startedAt=Date.now();
  timerRef.current=window.setInterval(()=>{
   setElapsed(Math.floor((Date.now()-startedAt)/1000));
  },1000);

  const patchTurn=(patch:Partial<Turn>)=>setTurns(list=>list.map(t=>t.id===localTurnId?{...t,...patch}:t));

  try{
   if(useLocal){
    const doneTurns=turns.filter(t=>t.status==='done');
    const msgs:{role:'user'|'assistant';content:string}[]=[];
    doneTurns.forEach((t,i)=>{
     msgs.push({
      role:'user',
      content:i===0
       ?`【${mode==='mock'?'高阶模拟面试题':'系统设计题目'}】\n${cleanTopic}\n\n【候选人方案 / 回答】\n${t.userText}`
       :`【候选人追问 / 补充回答】\n${t.userText}\n\n请延续上一轮评审语境继续点评与深入追问。`,
     });
     msgs.push({role:'assistant',content:t.text});
    });
    msgs.push({
     role:'user',
     content:doneTurns.length===0
      ?`【${mode==='mock'?'高阶模拟面试题':'系统设计题目'}】\n${cleanTopic}\n\n【候选人方案 / 回答】\n${cleanAns}`
      :`【候选人追问 / 补充回答】\n${cleanAns}\n\n请延续上一轮评审语境继续点评与深入追问。`,
    });
    let accText='',accThink='';
    const out=await streamDeepViaBridge({
     cfg:localCfg,
     system:mode==='mock'?MOCK_SYSTEM:DESIGN_SYSTEM,
     messages:msgs,
     thinkingLevel,
     onThink:d=>{accThink+=d;patchTurn({thoughts:accThink})},
     onDelta:d=>{accText+=d;patchTurn({text:accText})},
     signal:ctl.signal,
    });
    const finalTurn:Turn={id:localTurnId,userText:cleanAns,status:'done',text:out.text,thoughts:out.think};
    patchTurn(finalTurn);
    if(username){
     const nextRecId=recordId||'arch-'+crypto.randomUUID();
     if(!recordId)setRecordId(nextRecId);
     const nextTurns=[...doneTurns,finalTurn];
     const modeLabel=mode==='mock'?'高阶模拟面试':'系统设计评审';
     fetch('/api/ai-interview-records',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
       id:nextRecId,
       kind:'architect',
       title:cleanTopic||modeLabel,
       subtitle:`${modeLabel} · ${LOCAL_PROVIDER_LABEL[localCfg.provider]}`,
       status:'completed',
       payload:{mode,topic:cleanTopic,turns:nextTurns},
      }),
     }).then(()=>{void refreshRecords()}).catch(()=>{});
    }
    stopActive();
    return;
   }
   const r=await fetch('/api/architect-review',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     mode,
     topic:cleanTopic,
     answer:cleanAns,
     recordId:prev?recordId:'',
     previousInteractionId:prev?.interactionId,
     prevSig:prev?.sig,
     followupContext:prev?.followupContext,
     model:globalModel,
     thinkingLevel,
    }),
    signal:ctl.signal,
   });
   const d=await r.json() as {
    recordId?:string;
    id?:string;
    sig?:string;
    status?:string;
    cached?:boolean;
    text?:string;
    thoughts?:string;
    usage?:Usage;
    cacheKey?:string;
    ckSig?:string;
    error?:string;
   };
   if(!r.ok)throw new Error(d.error??L('发起评审失败','Review request failed'));
   if(d.recordId)setRecordId(d.recordId);

   if(d.status==='completed'&&d.text){
    patchTurn({status:'done',text:d.text,thoughts:d.thoughts||'',cached:Boolean(d.cached),usage:d.usage});
    void refreshRecords();
    stopActive();
    return;
   }
   if(!d.id||!d.sig)throw new Error(L('未返回任务 ID','Missing interaction ID'));

   void refreshRecords();
   await pollExistingTurn({
    recId:d.recordId||recordId,
    turnId:localTurnId,
    interactionId:d.id,
    sig:d.sig,
    cacheKey:d.cacheKey,
    ckSig:d.ckSig,
    startedAt,
   });
  }catch(e){
   if(ctl.signal.aborted){
    patchTurn({status:'error',error:L('已取消','Cancelled')});
   }else{
    const msg=(e as Error).message||L('评审失败','Review failed');
    patchTurn({status:'error',error:msg});
   }
   stopActive();
  }
 };

 const resetAll=()=>{
  stopActive();
  setRecordId('');
  setTurns([]);
  setAnswer('');
  setFollowup('');
  setError('');
 };

 const deleteRecord=async(id:string)=>{
  try{
   await fetch('/api/ai-interview-records?id='+encodeURIComponent(id),{
    method:'DELETE',
    headers:{'content-type':'application/json'},
   });
  }catch{}
  setRecords(prev=>prev.filter(x=>x.id!==id));
  if(recordId===id)resetAll();
 };

 return (
  <div className="ai-shell iv-shell">
   <SiteHeader active="interview" username={username}/>
   <main className="ai-main arch-main">
    <div className="arch-top">
     <a href="/interview" className="arch-back"><ArrowLeft size={16}/>{L('返回面试','Back to Interview')}</a>
    </div>

    <div className="ai-title arch-title">
     <h1>{L('高阶模拟面试 · 系统设计深度点评','Senior Mock Interview & System Design Review')}</h1>
    </div>

    {records.length>0&&(
     <div className="arch-hist-bar" aria-label={L('历史评审','Saved sessions')}>
      <button type="button" className={'arch-hist-chip new-btn'+(turns.length===0?' on':'')} onClick={resetAll}>
       <Plus size={13}/>
       <span>{L('新题目','New')}</span>
      </button>
      {records.map(rec=>(
       <div key={rec.id} className={'arch-hist-chip'+(recordId===rec.id&&turns.length>0?' on':'')} onClick={()=>hydrateRecord(rec)}>
        {rec.status==='running'?<i className="arch-hist-dot"/>:<History size={12}/>}
        <span>{rec.title}</span>
        <button
         type="button"
         className="arch-hist-del"
         aria-label={L('删除记录','Delete')}
         onClick={e=>{e.stopPropagation();void deleteRecord(rec.id)}}
        >
         <X size={12}/>
        </button>
       </div>
      ))}
     </div>
    )}

    <div className="arch-mode-bar" role="tablist">
     <button type="button" role="tab" aria-selected={mode==='design'} className={mode==='design'?'on':''} onClick={()=>{if(!busy)setMode('design')}}>
      {L('系统设计评审','System Design')}
     </button>
     <button type="button" role="tab" aria-selected={mode==='mock'} className={mode==='mock'?'on':''} onClick={()=>{if(!busy)setMode('mock')}}>
      {L('高阶模拟面试','Senior Mock')}
     </button>
    </div>

    {turns.length===0?(
     <section className="ai-card arch-composer">
      <div className="arch-presets">
       {PRESETS.map(p=>{
        const full=L(p.topicZh,p.topicEn);
        return (
         <button
          key={p.id}
          type="button"
          className={'arch-chip'+(topic===full?' on':'')}
          onClick={()=>{setTopic(full);setError('')}}
         >
          {L(p.zh,p.en)}
         </button>
        );
       })}
      </div>

      <label className="arch-field">
       <span>{L('题目 / 场景','Topic')}</span>
       <input
        value={topic}
        onChange={e=>setTopic(e.target.value)}
        maxLength={200}
        placeholder={L('输入系统设计题或高阶面试题…','System design or senior interview topic…')}
       />
      </label>

      <label className="arch-field">
       <span>{L('你的方案 / 回答','Your design / answer')}</span>
       <textarea
        rows={7}
        value={answer}
        onChange={e=>setAnswer(e.target.value)}
        maxLength={12000}
        placeholder={L('写下架构方案或回答…','Enter your design or answer…')}
       />
      </label>

      {error&&<p className="ai-grade-error" style={{margin:0}}>{error}</p>}

      <div className="arch-actions">
       {username||useLocal?(
        <button type="button" className="button primary" disabled={busy||!answer.trim()||!topic.trim()} onClick={()=>void runTurn(answer)}>
         <Sparkles size={15}/>
         <span>{L('开始深度点评','Start Review')}</span>
        </button>
       ):(
        <a href="/login?return_to=%2Finterview%2Farchitect" className="button primary">
         <Lock size={15}/>
         <span>{L('登录后开始点评','Sign in to Review')}</span>
        </a>
       )}
       {useLocal&&(
        <span className="jdr-quota-pill local">
         {L(`本地 · ${LOCAL_PROVIDER_LABEL[localCfg.provider]} · 不消耗站内额度`,`Local · ${LOCAL_PROVIDER_LABEL[localCfg.provider]}`)}
        </span>
       )}
       {answer.trim()&&(
        <button type="button" className="button secondary" disabled={busy} onClick={()=>{setAnswer('');setError('')}}>
         <RotateCcw size={15}/>
         <span>{L('清空','Clear')}</span>
        </button>
       )}
      </div>
     </section>
    ):(
     <>
      <div className="ai-card arch-topic-bar">
       <strong>{topic}</strong>
       <button type="button" className="button secondary arch-new-btn" onClick={resetAll}>
        <Plus size={14}/>
        <span>{L('新题目','New Topic')}</span>
       </button>
      </div>

      <div className="arch-thread">
       {turns.map((turn,idx)=>(
        <div key={turn.id} className="arch-turn">
         <div className="ai-card arch-user-card">
          <span className="arch-turn-tag">{idx===0?L('我的方案','My Design'):L(`第 ${idx+1} 轮回答`,`Round ${idx+1}`)}</span>
          <p>{turn.userText}</p>
         </div>

         <div className="ai-card arch-reply-card">
          {turn.status==='running'?(
           <>
            <div className="arch-running">
             <span className="arch-running-left">
              <Loader2 size={16} className="ai-spin"/>
              <span>{L(`深度评审中 · ${elapsed}s`,`Reviewing · ${elapsed}s`)}</span>
             </span>
             <button type="button" className="button secondary arch-stop-btn" onClick={stopActive}>
              <Square size={12} fill="currentColor"/>
              <span>{L('取消','Stop')}</span>
             </button>
            </div>
            {turn.thoughts&&<pre className="arch-thoughts-body" style={{marginTop:10}}>{turn.thoughts}</pre>}
            {turn.text&&<ReviewMarkdown text={turn.text}/>}
           </>
          ):turn.status==='error'?(
           <p className="ai-grade-error" style={{margin:0}}>{turn.error}</p>
          ):(
           <>
            {turn.thoughts&&(
             <div className="arch-thoughts">
              <button
               type="button"
               className="arch-thoughts-btn"
               onClick={()=>setOpenThoughts(m=>({...m,[turn.id]:!m[turn.id]}))}
              >
               <span>{L('思考过程','Reasoning')}</span>
               {openThoughts[turn.id]?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
              </button>
              {openThoughts[turn.id]&&<pre className="arch-thoughts-body">{turn.thoughts}</pre>}
             </div>
            )}

            <ReviewMarkdown text={turn.text}/>

            <div className="arch-reply-foot">
             <div className="arch-reply-meta">
              {!turn.cached&&turn.usage&&turn.usage.totalTokens>0&&(
               <span className="arch-meta-txt">{fmtTok(turn.usage.totalTokens)} tokens</span>
              )}
             </div>
             <div className="arch-reply-btns">
              <button
               type="button"
               className="ai-note-pill"
               onClick={async()=>{
                try{
                 await navigator.clipboard.writeText(turn.text);
                 setCopiedId(turn.id);
                 window.setTimeout(()=>setCopiedId(c=>c===turn.id?'':c),1800);
                }catch{}
               }}
              >
               {copiedId===turn.id?<Check size={13}/>:<Copy size={13}/>}
               <span>{copiedId===turn.id?L('已复制','Copied'):L('复制','Copy')}</span>
              </button>
              <AddToNoteButton
               compact
               title={topic.slice(0,64)}
               questionOnly={`### ${topic}\n\n**${L('我的方案','My Design')}**：\n${turn.userText}`}
               questionAndAnswer={`### ${topic}\n\n**${L('我的方案','My Design')}**：\n${turn.userText}\n\n---\n\n**${L('高阶架构评审','Architect Review')}**：\n${turn.text}`}
               modeLabels={[['仅我的方案','My Design'],['方案 + 深度点评','Design + Review']]}
               source={{kind:'interview',label:`${L('架构评审','Architect')} · ${topic.slice(0,28)}`,href:'/interview/architect'}}
              />
             </div>
            </div>
           </>
          )}
         </div>
        </div>
       ))}
      </div>

      {lastDoneTurn&&!busy&&(
       <form
        className="ai-card arch-followup"
        onSubmit={e=>{
         e.preventDefault();
         if(!followup.trim())return;
         if(lastSession?.interactionId&&lastSession.sig){
          void runTurn(followup,{interactionId:lastSession.interactionId,sig:lastSession.sig});
         }else{
          const ctx=`${lastDoneTurn.userText.slice(0,800)}\n\n${lastDoneTurn.text.slice(0,1800)}`;
          void runTurn(followup,{followupContext:ctx});
         }
        }}
       >
        <textarea
         rows={3}
         value={followup}
         onChange={e=>setFollowup(e.target.value)}
         maxLength={8000}
         placeholder={L('回应追问…','Reply to follow-up…')}
        />
        <div className="arch-followup-foot">
         {error?<span className="ai-grade-error">{error}</span>:<span/>}
         <button type="submit" className="button primary" disabled={!followup.trim()}>
          <Send size={14}/>
          <span>{L('继续追问','Send')}</span>
         </button>
        </div>
       </form>
      )}
     </>
    )}
   </main>
  </div>
 );
}
