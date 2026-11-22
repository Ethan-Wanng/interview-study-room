'use client';
import '../ai/ai.css';
import './stories.css';
import {useEffect,useMemo,useState} from 'react';
import {Edit3,Heart,MessageSquareHeart,PenLine,Quote,Search,Star,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import SiteHeader from '../components/site-header';
import TitleTip from '../components/title-tip';
import {useI18n} from '../components/i18n';
import {markdownEditing} from '../ai/code-input';
import type {StoryCategory,StoryItem} from '../api/stories/route';

const VOTER_KEY='study-story-voter-v1';
const EDIT_TOKENS_KEY='study-story-tokens-v1';

function getOrMakeVoterId():string{
 try{
  const existing=localStorage.getItem(VOTER_KEY);
  if(existing&&/^[A-Za-z0-9_-]{8,64}$/.test(existing))return existing;
  const created=(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()).replace(/[^A-Za-z0-9_-]/g,'');
  localStorage.setItem(VOTER_KEY,created);
  return created;
 }catch{
  return '';
 }
}

function readEditTokens():Record<string,string>{
 try{return JSON.parse(localStorage.getItem(EDIT_TOKENS_KEY)||'{}') as Record<string,string>}
 catch{return {}}
}

function saveEditToken(id:string,token:string){
 try{
  const m=readEditTokens();
  m[id]=token;
  localStorage.setItem(EDIT_TOKENS_KEY,JSON.stringify(m));
 }catch{}
}

function removeEditToken(id:string){
 try{
  const m=readEditTokens();
  delete m[id];
  localStorage.setItem(EDIT_TOKENS_KEY,JSON.stringify(m));
 }catch{}
}

export default function StoriesClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;

 const [items,setItems]=useState<StoryItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [isAdmin,setIsAdmin]=useState(false);
 const [userId,setUserId]=useState('');
 const [voterId,setVoterId]=useState('');
 const [editTokens,setEditTokens]=useState<Record<string,string>>({});

 const [filter,setFilter]=useState<'all'|StoryCategory|'mine'>('all');
 const [sortBy,setSortBy]=useState<'latest'|'likes'>('latest');
 const [query,setQuery]=useState('');
 const [expandedIds,setExpandedIds]=useState<Set<string>>(()=>new Set());

 // Composer modal state
 const [openForm,setOpenForm]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [category,setCategory]=useState<StoryCategory>('journey');
 const [title,setTitle]=useState('');
 const [quote,setQuote]=useState('');
 const [content,setContent]=useState('');
 const [author,setAuthor]=useState(username);
 const [roleTag,setRoleTag]=useState('');
 const [anonymous,setAnonymous]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const [errMsg,setErrMsg]=useState('');
 const [noticeMsg,setNoticeMsg]=useState('');

 useEffect(()=>{
  const vid=getOrMakeVoterId();
  let alive=true;
  fetch('/api/stories'+(vid?`?voter=${encodeURIComponent(vid)}`:''),{cache:'no-store'})
   .then(r=>r.json() as Promise<{items?:StoryItem[];isAdmin?:boolean;userId?:string}>)
   .then(d=>{
    if(!alive)return;
    setVoterId(vid);
    setEditTokens(readEditTokens());
    setItems(d.items??[]);
    setIsAdmin(Boolean(d.isAdmin));
    setUserId(d.userId??'');
   })
   .catch(()=>{
    if(!alive)return;
    setVoterId(vid);
    setEditTokens(readEditTokens());
   })
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[]);

 const categories:{id:StoryCategory;zh:string;en:string}[]=[
  {id:'offer',zh:'🎉 拿到 Offer',en:'🎉 Got an Offer'},
  {id:'interview',zh:'💼 面试复盘',en:'💼 Interview Recap'},
  {id:'journey',zh:'🌱 成长与坚持',en:'🌱 Learning Journey'},
  {id:'project',zh:'🛠️ 项目与操场',en:'🛠️ Projects & Code'},
  {id:'daily',zh:'☕ 日常打卡',en:'☕ Daily Habit'},
  {id:'other',zh:'✨ 其他感言',en:'✨ Thoughts'},
 ];

 const catMap=useMemo(()=>{
  const m=new Map<StoryCategory,string>();
  for(const c of categories)m.set(c.id,L(c.zh,c.en));
  return m;
 },[locale]); // eslint-disable-line react-hooks/exhaustive-deps

 const templates=[
  {
   cat:'offer' as StoryCategory,
   label:L('🎉 拿到 Offer / 上岸复盘','🎉 Share an Offer Win'),
   title:L('在面试自习室坚持刷题后，终于拿到了满意的 Offer','Landed an offer after consistent practice here'),
   quote:L('把难背的八股拆成每天一点点，坚持到第 30 天真的会不一样。','Breaking big topics into small daily steps makes all the difference.'),
   body:L('【我的背景与起点】\n\n【在这里最帮到我的模块（比如动画课堂 / AI 批注 / 间隔复习）】\n\n【给其他学友的一句话】\n','Background:\n\nWhat helped me most:\n\nA note to fellow learners:\n'),
  },
  {
   cat:'journey' as StoryCategory,
   label:L('💡 终于搞懂某个难题','💡 An "Aha!" Moment'),
   quote:L('以前死记硬背总会忘，看完动画和原理之后终于串起来了。','Seeing the intuition made everything finally click.'),
   title:L('困扰好久的知识点，终于在这里看懂了','A concept that finally clicked'),
   body:L('【以前哪里一直卡住】\n\n【怎么看懂或练会的】\n\n【现在的理解】\n','What confused me before:\n\nHow it clicked:\n\nHow I explain it now:\n'),
  },
  {
   cat:'project' as StoryCategory,
   label:L('🛠️ 跟着实战课 / 操场敲代码','🛠️ Building & Coding'),
   quote:L('自己把代码一行行写通的感觉，比光看教程踏实太多。','Writing the code line by line beats passively reading tutorials.'),
   title:L('从看懂卡片到自己在操场/实战课敲出可运行代码','From reading cards to writing working code'),
   body:L('【我选择的语言/路线】\n\n【动手实现时踩过的坑】\n\n【最大的收获】\n','Language / track:\n\nChallenges faced:\n\nBiggest takeaway:\n'),
  },
 ];

 const openNew=(tpl?:typeof templates[number])=>{
  setEditingId(null);
  setErrMsg('');
  if(tpl){
   setCategory(tpl.cat);
   setTitle(tpl.title);
   setQuote(tpl.quote);
   setContent(tpl.body);
  }else{
   setCategory('journey');
   setTitle('');
   setQuote('');
   setContent('');
  }
  setAuthor(username);
  setRoleTag('');
  setAnonymous(false);
  setOpenForm(true);
 };

 const openEdit=(it:StoryItem)=>{
  setEditingId(it.id);
  setErrMsg('');
  setCategory(it.category);
  setTitle(it.title);
  setQuote(it.quote);
  setContent(it.content);
  setAnonymous(it.author==='匿名学友');
  setAuthor(it.author==='匿名学友'?username:it.author);
  setRoleTag(it.roleTag);
  setOpenForm(true);
 };

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  setErrMsg('');
  if(title.trim().length<2){
   setErrMsg(L('请填写至少 2 个字的故事标题。','Please enter a title (at least 2 chars).'));
   return;
  }
  if(content.trim().length<10){
   setErrMsg(L('请至少写 10 个字的故事内容。','Please write at least 10 characters for your story.'));
   return;
  }
  setSubmitting(true);
  try{
   const isEdit=Boolean(editingId);
   const r=await fetch('/api/stories',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     action:isEdit?'update':'create',
     ...(isEdit?{id:editingId,editToken:editTokens[editingId!]??''}:{}),
     category,
     title:title.trim(),
     quote:quote.trim(),
     content:content.trim(),
     author:author.trim(),
     roleTag:roleTag.trim(),
     anonymous,
    }),
   });
   const d=await r.json() as {ok?:boolean;item?:StoryItem;editToken?:string;error?:string};
   if(!r.ok||!d.item)throw new Error(d.error||L('提交失败，请重试。','Failed to save story.'));

   if(!isEdit&&d.editToken){
    saveEditToken(d.item.id,d.editToken);
    setEditTokens(readEditTokens());
   }
   setItems(prev=>isEdit?prev.map(x=>x.id===d.item!.id?{...d.item!,liked:x.liked}:x):[d.item!,...prev]);
   setOpenForm(false);
   setNoticeMsg(isEdit?L('故事已更新。','Story updated.'):L('谢谢你的分享！你的故事已经发布到故事墙。','Thank you! Your story is now live on the wall.'));
   setTimeout(()=>setNoticeMsg(''),3500);
  }catch(err){
   setErrMsg(err instanceof Error?err.message:L('提交失败，请重试。','Failed to submit.'));
  }finally{
   setSubmitting(false);
  }
 };

 const toggleLike=async(it:StoryItem)=>{
  const nextLiked=!it.liked;
  const nextLikes=Math.max(0,it.likes+(nextLiked?1:-1));
  setItems(prev=>prev.map(x=>x.id===it.id?{...x,liked:nextLiked,likes:nextLikes}:x));
  try{
   const r=await fetch('/api/stories',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'toggleLike',id:it.id,voter:voterId}),
   });
   const d=await r.json() as {ok?:boolean;liked?:boolean;likes?:number};
   if(r.ok&&d.ok){
    setItems(prev=>prev.map(x=>x.id===it.id?{...x,liked:Boolean(d.liked),likes:Number(d.likes??x.likes)}:x));
   }
  }catch{}
 };

 const removeStory=async(it:StoryItem)=>{
  if(!window.confirm(L('确定要删除这篇故事吗？删除后无法恢复。','Delete this story permanently?')))return;
  try{
   const r=await fetch('/api/stories',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'delete',id:it.id,editToken:editTokens[it.id]??''}),
   });
   if(r.ok){
    setItems(prev=>prev.filter(x=>x.id!==it.id));
    removeEditToken(it.id);
    setEditTokens(readEditTokens());
   }
  }catch{}
 };

 const toggleFeature=async(it:StoryItem)=>{
  try{
   const r=await fetch('/api/stories',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'toggleFeature',id:it.id}),
   });
   const d=await r.json() as {ok?:boolean;featured?:boolean};
   if(r.ok&&d.ok){
    setItems(prev=>prev.map(x=>x.id===it.id?{...x,featured:Boolean(d.featured)}:x));
   }
  }catch{}
 };

 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  const list=items.filter(it=>{
   if(filter==='mine'){
    const isMine=Boolean((userId&&it.userId===userId)||editTokens[it.id]);
    if(!isMine)return false;
   }else if(filter!=='all'&&it.category!==filter){
    return false;
   }
   if(!q)return true;
   return (
    it.title.toLowerCase().includes(q)
    ||it.content.toLowerCase().includes(q)
    ||it.quote.toLowerCase().includes(q)
    ||it.author.toLowerCase().includes(q)
    ||it.roleTag.toLowerCase().includes(q)
   );
  });
  if(sortBy==='likes'){
   return [...list].sort((a,b)=>b.likes-a.likes||b.createdAt-a.createdAt);
  }
  return [...list].sort((a,b)=>Number(b.featured)-Number(a.featured)||b.createdAt-a.createdAt);
 },[items,filter,sortBy,query,userId,editTokens]);

 const totalLikes=useMemo(()=>items.reduce((s,x)=>s+x.likes,0),[items]);

 return (
  <div className="st-shell">
   <SiteHeader active="stories" username={username}/>
   <main className="st-main">
    <section className="ai-card st-hero">
     <div className="st-hero-copy">
      <div className="ai-title">
       <span className="eyebrow">SHARE YOUR STORY</span>
       <h1>
        {L('分享你的自习故事','Share Your Story')}
        <TitleTip>
         <p>{L('记录你在面试自习室的学习体会、通关时刻、面试经历与 Offer 喜讯。支持匿名、附加寄语金句与共鸣点赞。','Share your study milestones, interview recaps, and breakthroughs with the community.')}</p>
        </TitleTip>
       </h1>
      </div>
      <div className="st-hero-actions">
       <button type="button" className="st-cta-btn" onClick={()=>openNew()}>
        <PenLine size={17}/>{L('写下我的故事','Share Your Story')}
       </button>
      </div>
     </div>
     <div className="st-hero-stats">
      <div className="st-stat">
       <span>{L('学友故事','Stories')}</span>
       <strong>{items.length}</strong>
      </div>
      <div className="st-stat">
       <span>{L('收获共鸣','Hearts')}</span>
       <strong>{totalLikes}</strong>
      </div>
     </div>
    </section>

    {noticeMsg&&(
     <div className="fb-alert ok" role="status">{noticeMsg}</div>
    )}

    <div className="st-prompts">
     <span className="st-prompts-label">{L('不知道怎么开头？点一个灵感模板：','Need a spark? Pick a prompt:')}</span>
     {templates.map(tpl=>(
      <button key={tpl.label} type="button" className="st-prompt-chip" onClick={()=>openNew(tpl)}>
       {tpl.label}
      </button>
     ))}
    </div>

    <div className="st-toolbar">
     <div className="st-tabs" role="tablist" aria-label={L('按分类筛选故事','Filter stories by category')}>
      <button type="button" className={'st-tab'+(filter==='all'?' on':'')} onClick={()=>setFilter('all')}>
       {L('全部故事','All')} ({items.length})
      </button>
      {categories.map(c=>(
       <button key={c.id} type="button" className={'st-tab'+(filter===c.id?' on':'')} onClick={()=>setFilter(c.id)}>
        {L(c.zh,c.en)}
       </button>
      ))}
      <button type="button" className={'st-tab'+(filter==='mine'?' on':'')} onClick={()=>setFilter('mine')}>
       {L('我的发布','Mine')}
      </button>
     </div>

     <div className="st-controls">
      <select className="st-sort" value={sortBy} onChange={e=>setSortBy(e.target.value as 'latest'|'likes')} aria-label={L('排序方式','Sort stories')}>
       <option value="latest">{L('最新发布','Latest')}</option>
       <option value="likes">{L('最多共鸣','Most Hearts')}</option>
      </select>
      <label className="st-search">
       <Search size={15}/>
       <input
        type="search"
        value={query}
        onChange={e=>setQuery(e.target.value)}
        placeholder={L('搜索故事、金句或作者…','Search stories, quotes, authors…')}
        aria-label={L('搜索故事','Search stories')}
       />
      </label>
     </div>
    </div>

    {loading?(
     <div className="ai-card st-empty"><p>{L('正在翻开故事墙…','Loading stories…')}</p></div>
    ):filtered.length===0?(
     <div className="ai-card st-empty">
      <MessageSquareHeart size={32} style={{color:'var(--primary)'}}/>
      <h3>{items.length===0?L('还没有学友投稿，写下第一篇故事吧','No stories yet — be the first to share!'):L('没有找到匹配的故事','No matching stories found')}</h3>
      <p>
       {items.length===0
        ?L('无论是上岸喜报、面试踩坑复盘，还是每天自习打卡的一点点感悟，都很值得被记录下来。','Whether it’s an offer celebration, an interview lesson, or a daily study reflection, your story is welcome here.')
        :L('换个筛选标签或关键词试试，或者直接分享一篇新故事。','Try clearing your filter/search, or share a new story.')}
      </p>
      <button type="button" className="st-cta-btn" onClick={()=>openNew()}>
       <PenLine size={16}/>{L('立即写下我的故事','Write a Story')}
      </button>
     </div>
    ):(
     <div className="st-grid">
      {filtered.map(it=>{
       const isOwner=Boolean((userId&&it.userId===userId)||editTokens[it.id]);
       const canManage=isAdmin||isOwner;
       const isLong=it.content.length>260;
       const isExpanded=expandedIds.has(it.id);
       const shownBody=isLong&&!isExpanded?it.content.slice(0,260)+'…':it.content;
       const initial=(it.author.trim()[0]??'学').toUpperCase();
       return (
        <article key={it.id} className={'ai-card st-card'+(it.featured?' featured':'')}>
         <div className="st-card-head">
          <div className="st-badges">
           <span className={`st-cat-badge ${it.category}`}>{catMap.get(it.category)??it.category}</span>
           {it.featured&&<span className="st-feat-badge"><Star size={11}/>{L('精选故事','Featured')}</span>}
          </div>
          <time className="st-date">
           {new Date(it.createdAt).toLocaleDateString(locale==='en'?'en-US':'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'})}
          </time>
         </div>

         <h3>{it.title}</h3>

         {it.quote&&(
          <blockquote className="st-quote">
           <Quote size={15}/>
           <span>{it.quote}</span>
          </blockquote>
         )}

         <p className="st-body">{shownBody}</p>
         {isLong&&(
          <button
           type="button"
           className="st-expand"
           onClick={()=>setExpandedIds(prev=>{
            const next=new Set(prev);
            if(next.has(it.id))next.delete(it.id);else next.add(it.id);
            return next;
           })}
          >
           {isExpanded?L('收起全文','Show less'):L('展开全文','Read full story')}
          </button>
         )}

         <div className="st-card-foot">
          <div className="st-author">
           <span className="st-avatar" aria-hidden="true">{initial}</span>
           <div className="st-author-meta">
            <strong>{it.author}</strong>
            {it.roleTag&&<small>{it.roleTag}</small>}
           </div>
          </div>

          <div className="st-card-actions">
           <button
            type="button"
            className={'st-like-btn'+(it.liked?' on':'')}
            onClick={()=>void toggleLike(it)}
            aria-pressed={Boolean(it.liked)}
            title={L('给这段故事点个赞 / 被鼓舞了','Encourage this story')}
           >
            <Heart size={14} fill={it.liked?'currentColor':'none'}/>
            <span>{it.likes}</span>
           </button>
           {isAdmin&&(
            <button
             type="button"
             className={'st-icon-btn'+(it.featured?' on':'')}
             onClick={()=>void toggleFeature(it)}
             title={it.featured?L('取消精选','Unfeature'):L('设为精选','Feature')}
            >
             <Star size={14}/>
            </button>
           )}
           {canManage&&(
            <>
             <button type="button" className="st-icon-btn" onClick={()=>openEdit(it)} title={L('编辑故事','Edit story')}>
              <Edit3 size={14}/>
             </button>
             <button type="button" className="st-icon-btn" onClick={()=>void removeStory(it)} title={L('删除故事','Delete story')}>
              <Trash2 size={14}/>
             </button>
            </>
           )}
          </div>
         </div>
        </article>
       );
      })}
     </div>
    )}
   </main>

   <Dialog open={openForm} onOpenChange={setOpenForm}>
    <DialogContent className="st-dialog">
     <DialogHeader>
      <DialogTitle>{editingId?L('编辑我的故事','Edit Your Story'):L('分享你的故事','Share Your Story')}</DialogTitle>
      <DialogDescription>
       {L('真实、真诚的经历最能打动人。写完提交后会立即展示在故事墙上，你也可以随时修改或删除。','Authentic stories inspire others. Published stories appear on the wall right away and can be edited or deleted anytime.')}
      </DialogDescription>
     </DialogHeader>
     <form className="st-form" onSubmit={e=>void submit(e)}>
      <div className="st-field">
       <span>{L('故事分类','Category')}</span>
       <div className="st-cat-pills" role="radiogroup" aria-label={L('故事分类','Story category')}>
        {categories.map(c=>(
         <button key={c.id} type="button" className={'st-cat-pill'+(category===c.id?' on':'')} onClick={()=>setCategory(c.id)}>
          {L(c.zh,c.en)}
         </button>
        ))}
       </div>
      </div>

      <label className="st-field">
       <span>{L('故事标题','Title')}</span>
       <input
        required
        maxLength={120}
        value={title}
        onChange={e=>setTitle(e.target.value)}
        placeholder={L('例如：从零学 Go 两个月，拿下后端开发 Offer 的复盘','e.g., How two months of daily practice helped me land a backend offer')}
       />
      </label>

      <label className="st-field">
       <span>{L('一句话寄语 / 卡片金句（选填）','Highlight Quote (optional)')}</span>
       <input
        maxLength={160}
        value={quote}
        onChange={e=>setQuote(e.target.value)}
        placeholder={L('将作为卡片上方高亮引用展示，例如：慢慢来，每天十题也是复利。','Shown as a pull-quote at the top of your card')}
       />
      </label>

      <label className="st-field">
       <span>{L('故事正文','Your Story')}</span>
       <textarea
        ref={markdownEditing}
        required
        maxLength={3000}
        value={content}
        onChange={e=>setContent(e.target.value)}
        placeholder={L('写写你的学习背景、最难忘的瞬间、踩过的坑，或者送给同行学友的一段话…','Share your background, turning points, lessons learned, or encouragement for others…')}
       />
       <small>{content.length} / 3000</small>
      </label>

      <div className="st-row2">
       <label className="st-field">
        <span>{L('你的称呼（选填）','Display Name (optional)')}</span>
        <input
         maxLength={32}
         disabled={anonymous}
         value={anonymous?L('匿名学友','Anonymous'):author}
         onChange={e=>setAuthor(e.target.value)}
         placeholder={L('默认使用当前用户名或“热心学友”','Defaults to username or Learner')}
        />
       </label>
       <label className="st-field">
        <span>{L('身份或方向标签（选填）','Role / Background Tag (optional)')}</span>
        <input
         maxLength={48}
         value={roleTag}
         onChange={e=>setRoleTag(e.target.value)}
         placeholder={L('例如：26届校招 · Go后端 / 上海','e.g., New Grad · Backend / AI Learner')}
        />
       </label>
      </div>

      <label className="st-anon">
       <input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/>
       <span>{L('匿名发布（署名显示为“匿名学友”）','Post anonymously')}</span>
      </label>

      {errMsg&&<div className="fb-alert err" role="alert">{errMsg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
       <button type="button" className="button secondary" onClick={()=>setOpenForm(false)}>{L('取消','Cancel')}</button>
       <button type="submit" className="st-cta-btn" disabled={submitting}>
        <PenLine size={15}/>
        {submitting?L('发布中…','Publishing…'):editingId?L('保存修改','Save Changes'):L('发布故事','Publish Story')}
       </button>
      </div>
     </form>
    </DialogContent>
   </Dialog>
  </div>
 );
}
