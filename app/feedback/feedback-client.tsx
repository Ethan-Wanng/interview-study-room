'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {MessageSquareWarning,Bug,Lightbulb,HelpCircle,Send,CheckCircle2,Clock,Trash2} from 'lucide-react';
import SiteHeader from '../components/site-header';
import {useI18n} from '../components/i18n';
import {markdownEditing} from '../ai/code-input';
import type {FeedbackItem} from '../api/feedback/route';
import '../ai/ai.css';
import './feedback.css';

const LOCAL_CACHE_KEY='study-feedback-local-v1';

function detectModule(qid:string,fallback:string){
 if(fallback)return fallback;
 const s=qid.toLowerCase();
 if(s.startsWith('go-'))return 'go';
 if(s.startsWith('be-'))return 'backend';
 if(s.startsWith('fe-'))return 'frontend';
 if(s.startsWith('en-'))return 'english';
 if(s)return 'ai';
 return 'general';
}

export default function FeedbackClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const searchParams=useSearchParams();

 const initQid=searchParams.get('questionId')??'';
 const initTitle=searchParams.get('title')??'';
 const initType=searchParams.get('type')??'';
 const initMod=searchParams.get('module')??'';
 const initPage=searchParams.get('page')??''; // 从全站「反馈」按钮进来时所在的页面

 const [items,setItems]=useState<FeedbackItem[]>([]);
 const [isAdmin,setIsAdmin]=useState(false);
 const [userId,setUserId]=useState('');
 const [loading,setLoading]=useState(true);

 const [category,setCategory]=useState<FeedbackItem['category']>(
  (['question','bug','suggestion','other'].includes(initType)?initType:'question') as FeedbackItem['category']
 );
 const [mod,setMod]=useState(()=>detectModule(initQid,initMod));
 const [questionId,setQuestionId]=useState(initQid);
 const [title,setTitle]=useState(initTitle?`题目反馈：${initTitle.slice(0,60)}`:'');
 const [content,setContent]=useState(initPage?`（所在页面：${initPage.slice(0,200)}）
`:'');
 const [author,setAuthor]=useState(username);
 const [submitting,setSubmitting]=useState(false);
 const [errMsg,setErrMsg]=useState('');
 const [okMsg,setOkMsg]=useState('');

 const [filter,setFilter]=useState<'all'|'open'|'resolved'|'question'|'mine'>('all');
 const [query,setQuery]=useState('');
 const [replyingId,setReplyingId]=useState<string|null>(null);
 const [replyDraft,setReplyDraft]=useState('');
 const contentRef=useRef<HTMLTextAreaElement|null>(null);

 useEffect(()=>{
  if(initQid||initTitle){
   contentRef.current?.focus();
  }
 },[initQid,initTitle]);

 async function load(){
  setLoading(true);
  try{
   const r=await fetch('/api/feedback',{cache:'no-store'});
   const d=await r.json() as {items?:FeedbackItem[];isAdmin?:boolean;userId?:string};
   let localItems:FeedbackItem[]=[];
   try{
    localItems=JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)||'[]') as FeedbackItem[];
   }catch{}
   const serverItems=d.items??[];
   const mergedMap=new Map<string,FeedbackItem>();
   for(const it of [...localItems,...serverItems]){
    if(it&&it.id)mergedMap.set(it.id,it);
   }
   const merged=[...mergedMap.values()].sort((a,b)=>b.createdAt-a.createdAt);
   setItems(merged);
   setIsAdmin(Boolean(d.isAdmin));
   setUserId(d.userId??'');
  }catch{
   try{
    const localItems=JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)||'[]') as FeedbackItem[];
    setItems(localItems);
   }catch{}
  }finally{
   setLoading(false);
  }
 }

 useEffect(()=>{void load();},[]);
 // 从通知点进来（/feedback#反馈编号）时，列表加载完后滚动到那条反馈并高亮。
 useEffect(()=>{if(loading)return;const id=decodeURIComponent(window.location.hash.slice(1));if(!id)return;const el=document.getElementById(id);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('fb-target');const t=setTimeout(()=>el.classList.remove('fb-target'),2600);return()=>clearTimeout(t)},[loading]);

 function saveLocal(nextItem:FeedbackItem){
  try{
   const prev=JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)||'[]') as FeedbackItem[];
   const filtered=prev.filter(x=>x.id!==nextItem.id);
   localStorage.setItem(LOCAL_CACHE_KEY,JSON.stringify([nextItem,...filtered].slice(0,50)));
  }catch{}
 }

 async function submit(e:React.FormEvent){
  e.preventDefault();
  setErrMsg('');
  setOkMsg('');
  if(title.trim().length<2){
   setErrMsg(L('请填写至少 2 个字的反馈标题。','Please enter a title (at least 2 chars).'));
   return;
  }
  if(content.trim().length<4){
   setErrMsg(L('请填写至少 4 个字的详细说明，方便我们定位问题。','Please enter details (at least 4 chars).'));
   return;
  }
  setSubmitting(true);
  try{
   const r=await fetch('/api/feedback',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     action:'create',
     category,
     module:mod,
     questionId:questionId.trim(),
     title:title.trim(),
     content:content.trim(),
     author:author.trim()||username,
    }),
   });
   const d=await r.json() as {ok?:boolean;item?:FeedbackItem;error?:string};
   if(!r.ok||!d.item)throw new Error(d.error||L('提交失败，请重试。','Failed to submit.'));
   saveLocal(d.item);
   setItems(prev=>[d.item!,...prev.filter(x=>x.id!==d.item!.id)]);
   setContent('');
   if(!initTitle)setTitle('');
   setOkMsg(L('感谢反馈！我们已收到并记录到反馈列表中。','Thank you! Your feedback has been recorded.'));
  }catch(err){
   setErrMsg((err as Error).message);
  }finally{
   setSubmitting(false);
  }
 }

 async function updateStatus(id:string,status:FeedbackItem['status'],reply?:string){
  try{
   const r=await fetch('/api/feedback',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'updateStatus',id,status,reply}),
   });
   if(r.ok){
    setItems(prev=>prev.map(it=>{
     if(it.id!==id)return it;
     const updated={...it,status,reply:reply!==undefined?reply:it.reply,updatedAt:Date.now()};
     saveLocal(updated);
     return updated;
    }));
    setReplyingId(null);
    setReplyDraft('');
   }
  }catch{}
 }

 async function removeItem(id:string){
  try{
   await fetch('/api/feedback',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'delete',id}),
   });
  }catch{}
  setItems(prev=>prev.filter(x=>x.id!==id));
  try{
   const local=JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)||'[]') as FeedbackItem[];
   localStorage.setItem(LOCAL_CACHE_KEY,JSON.stringify(local.filter(x=>x.id!==id)));
  }catch{}
 }

 const moduleLabels:Record<string,string>={
  general:L('全站通用','General'),
  go:L('Go 之旅','Go Journey'),
  backend:L('后端通用','Backend'),
  ai:L('AI 开发','AI Dev'),
  frontend:L('前端开发','Frontend'),
  english:L('英语学习','English'),
  interview:L('面试复习','Interview'),
  practice:L('综合训练','Training'),
  playground:L('代码操场','Playground'),
  stories:L('分享故事','Stories'),
  about:L('项目关于','About'),
 };

 const categoryLabels:Record<FeedbackItem['category'],string>={
  question:L('题目纠错','Question Issue'),
  bug:L('功能异常','Bug Report'),
  suggestion:L('体验建议','Suggestion'),
  other:L('其他反馈','Other'),
 };

 const statusLabels:Record<FeedbackItem['status'],string>={
  open:L('待处理','Open'),
  in_progress:L('处理中','In Progress'),
  resolved:L('已解决','Resolved'),
 };

 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return items.filter(it=>{
   if(filter==='open'&&it.status==='resolved')return false;
   if(filter==='resolved'&&it.status!=='resolved')return false;
   if(filter==='question'&&it.category!=='question')return false;
   if(filter==='mine'){
    const isMine=(userId&&it.userId===userId)||(username&&it.author===username);
    if(!isMine)return false;
   }
   if(!q)return true;
   return (
    it.title.toLowerCase().includes(q)||
    it.content.toLowerCase().includes(q)||
    it.questionId.toLowerCase().includes(q)||
    it.reply.toLowerCase().includes(q)
   );
  });
 },[items,filter,query,userId,username]);

 const openCount=items.filter(x=>x.status!=='resolved').length;
 const resolvedCount=items.filter(x=>x.status==='resolved').length;

 return (
  <div className="ai-shell fb-shell">
   <SiteHeader active="feedback" username={username}/>

   <main className="fb-main">
    <section className="fb-hero">
     <div className="ai-title">
      <span className="eyebrow">FEEDBACK</span>
      <h1>{L('一起把题库和体验打磨得更好','Help us improve every question')}</h1>

     </div>
     <div className="fb-stats">
      <div className="fb-stat">
       <span>{L('全部反馈','Total')}</span>
       <strong>{items.length}</strong>
      </div>
      <div className="fb-stat">
       <span>{L('待处理','Open')}</span>
       <strong>{openCount}</strong>
      </div>
      <div className="fb-stat">
       <span>{L('已解决','Resolved')}</span>
       <strong>{resolvedCount}</strong>
      </div>
     </div>
    </section>

    <div className="fb-grid">
     <section className="fb-card" aria-label={L('提交反馈','Submit Feedback')}>
      <h2><MessageSquareWarning size={18}/>{L('提交新反馈','Submit Feedback')}</h2>
      

      <form className="fb-form" onSubmit={submit}>
       {questionId&&(
        <div className="fb-prefill-banner">
         <span>{L('关联题号：','Question ID: ')}<code>{questionId}</code></span>
         <button type="button" onClick={()=>setQuestionId('')}>{L('清除','Clear')}</button>
        </div>
       )}

       <div className="fb-field">
        <span>{L('反馈类型','Category')}</span>
        <div className="fb-type-pills" role="radiogroup" aria-label={L('反馈类型','Category')}>
         <button type="button" className={'fb-type-pill '+(category==='question'?'active':'')} onClick={()=>setCategory('question')}>
          <MessageSquareWarning size={15}/>{L('题目纠错','Question Issue')}
         </button>
         <button type="button" className={'fb-type-pill '+(category==='bug'?'active':'')} onClick={()=>setCategory('bug')}>
          <Bug size={15}/>{L('功能异常','Bug Report')}
         </button>
         <button type="button" className={'fb-type-pill '+(category==='suggestion'?'active':'')} onClick={()=>setCategory('suggestion')}>
          <Lightbulb size={15}/>{L('体验建议','UX Suggestion')}
         </button>
         <button type="button" className={'fb-type-pill '+(category==='other'?'active':'')} onClick={()=>setCategory('other')}>
          <HelpCircle size={15}/>{L('其他反馈','Other')}
         </button>
        </div>
       </div>

       <label className="fb-field">
        <span>{L('所属模块','Module')}</span>
        <select value={mod} onChange={e=>setMod(e.target.value)}>
         {Object.entries(moduleLabels).map(([k,v])=>(
          <option key={k} value={k}>{v}</option>
         ))}
        </select>
       </label>

       <label className="fb-field">
        <span>{L('题目编号（选填）','Question ID (optional)')}</span>
        <input
         value={questionId}
         onChange={e=>setQuestionId(e.target.value)}
         placeholder={L('例如：go-values-2 / en-sounds-2','e.g. go-values-2 / en-sounds-2')}
         maxLength={120}
        />
       </label>

       <label className="fb-field">
        <span>{L('简要标题','Title')}</span>
        <input
         required
         value={title}
         onChange={e=>setTitle(e.target.value)}
         placeholder={L('标题','Title')}
         maxLength={120}
        />
       </label>

       <label className="fb-field">
        <span>{L('详细说明','Description')}</span>
        <textarea
         ref={el=>{contentRef.current=el;markdownEditing(el)}}
         required
         value={content}
         onChange={e=>setContent(e.target.value)}
         placeholder={L('描述','Description')}
         maxLength={2000}
        />
        <small>{content.length} / 2000</small>
       </label>

       {!username&&(
        <label className="fb-field">
         <span>{L('称呼（选填）','Your Name (optional)')}</span>
         <input
          value={author}
          onChange={e=>setAuthor(e.target.value)}
          placeholder={L('默认显示“热心学友”','Defaults to Anonymous Learner')}
          maxLength={32}
         />
        </label>
       )}

       {errMsg&&<div role="alert" className="fb-alert err">{errMsg}</div>}
       {okMsg&&<div role="status" className="fb-alert ok">{okMsg}</div>}

       <button type="submit" className="fb-submit" disabled={submitting}>
        <Send size={15}/>
        {submitting?L('正在提交…','Submitting…'):L('提交反馈','Submit Feedback')}
       </button>
      </form>
     </section>

     <section className="fb-card" aria-label={L('反馈列表','Feedback List')}>
      <div className="fb-toolbar">
       <div className="fb-tabs" role="tablist">
        <button type="button" className={'fb-tab '+(filter==='all'?'active':'')} onClick={()=>setFilter('all')}>
         {L('全部','All')} ({items.length})
        </button>
        <button type="button" className={'fb-tab '+(filter==='open'?'active':'')} onClick={()=>setFilter('open')}>
         {L('待处理','Open')} ({openCount})
        </button>
        <button type="button" className={'fb-tab '+(filter==='resolved'?'active':'')} onClick={()=>setFilter('resolved')}>
         {L('已解决','Resolved')} ({resolvedCount})
        </button>
        <button type="button" className={'fb-tab '+(filter==='question'?'active':'')} onClick={()=>setFilter('question')}>
         {L('题目纠错','Questions')}
        </button>
        <button type="button" className={'fb-tab '+(filter==='mine'?'active':'')} onClick={()=>setFilter('mine')}>
         {L('我的提交','Mine')}
        </button>
       </div>
       <input
        type="search"
        className="fb-search"
        value={query}
        onChange={e=>setQuery(e.target.value)}
        placeholder={L('搜索题号、标题或内容…','Search ID, title, or text…')}
        aria-label={L('搜索反馈','Search feedback')}
       />
      </div>

      {loading?(
       <div className="fb-empty">{L('正在加载反馈记录…','Loading feedback…')}</div>
      ):filtered.length===0?(
       <div className="fb-empty">{L('暂无匹配的反馈记录。欢迎在左侧提交你的第一条反馈！','No matching feedback items found.')}</div>
      ):(
       <div className="fb-list">
        {filtered.map(item=>{
         const canManage=isAdmin||(userId&&item.userId===userId)||(username&&item.author===username);
         return (
          <article key={item.id} id={item.id} className="fb-item">
           <div className="fb-item-head">
            <div className="fb-badges">
             <span className={`fb-badge cat-${item.category}`}>{categoryLabels[item.category]}</span>
             <span className="fb-badge">{moduleLabels[item.module]??item.module}</span>
             {item.questionId&&<span className="fb-badge qid">#{item.questionId}</span>}
            </div>
            <span className={`fb-status ${item.status}`}>
             {item.status==='resolved'?<CheckCircle2 size={12} style={{display:'inline',marginRight:4,verticalAlign:'-1px'}}/>:<Clock size={12} style={{display:'inline',marginRight:4,verticalAlign:'-1px'}}/>}
             {statusLabels[item.status]}
            </span>
           </div>

           <h3>{item.title}</h3>
           <p>{item.content}</p>

           {item.reply&&(
            <div className="fb-reply">
             <strong>{L('处理说明 / 回复','Resolution / Reply')}</strong>
             {item.reply}
            </div>
           )}

           {replyingId===item.id&&(
            <div className="fb-admin-box">
             <input
              value={replyDraft}
              onChange={e=>setReplyDraft(e.target.value)}
              placeholder={L('输入处理结果或回复说明…','Enter resolution note…')}
             />
             <button type="button" className="fb-mini-btn" onClick={()=>void updateStatus(item.id,'resolved',replyDraft)}>
              {L('保存并标为已解决','Save & Resolve')}
             </button>
             <button type="button" className="fb-mini-btn" onClick={()=>setReplyingId(null)}>
              {L('取消','Cancel')}
             </button>
            </div>
           )}

           <div className="fb-item-foot">
            <span>{item.author} · {new Date(item.createdAt).toLocaleString(locale==='en'?'en-US':'zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
            {canManage&&(
             <div className="fb-item-actions">
              {isAdmin&&(
               <button
                type="button"
                className="fb-mini-btn"
                onClick={()=>{setReplyingId(item.id);setReplyDraft(item.reply||'');}}
               >
                {L('回复/处理','Reply')}
               </button>
              )}
              <button
               type="button"
               className="fb-mini-btn"
               onClick={()=>void updateStatus(item.id,item.status==='resolved'?'open':'resolved')}
              >
               {item.status==='resolved'?L('重新打开','Reopen'):L('标为已解决','Mark Resolved')}
              </button>
              {item.id!=='fb-seed-1'&&(
               <button
                type="button"
                className="fb-mini-btn"
                onClick={()=>void removeItem(item.id)}
                title={L('删除','Delete')}
               >
                <Trash2 size={12} style={{display:'inline',verticalAlign:'-1px'}}/>
               </button>
              )}
             </div>
            )}
           </div>
          </article>
         );
        })}
       </div>
      )}
     </section>
     </div>
    </main>
   </div>
  );
 }
