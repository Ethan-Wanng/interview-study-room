'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,BookPlus,BookText,Check,FilePlus2,FolderPlus,Loader2,RotateCcw,Sparkles,X} from 'lucide-react';
import {useI18n} from './i18n';
import {streamNoteAi} from './note-ai-client';
import {
 addNoteEntry,
 createNotebook,
 findDuplicateNotes,
 NOTEBOOK_ICONS,
 saveNoteReturnContext,
 setActiveBookAndPage,
 updateNotePage,
 useCurrentNotesUser,
 useNotesStore,
 type NoteSource,
} from '@/lib/notes-store';

export type AddToNoteProps={
 title:string;
 questionOnly:string;
 questionAndAnswer:string;
 defaultMode?:'question-only'|'question-and-answer';
 modeLabels?:[[string,string],[string,string]];
 source:NoteSource;
 onBeforeNavigate?:()=>void;
 compact?:boolean;
 className?:string;
 hideTrigger?:boolean;
 trigger?:number;
};

export default function AddToNoteButton({
 title,
 questionOnly,
 questionAndAnswer,
 defaultMode='question-and-answer',
 modeLabels,
 source,
 onBeforeNavigate,
 compact=true,
 className='',
 hideTrigger=false,
 trigger=0,
}:AddToNoteProps){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const username=useCurrentNotesUser();
 const notesState=useNotesStore(username);

 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState<'question-only'|'question-and-answer'>(defaultMode);
 const [pageTitle,setPageTitle]=useState(title);
 const [content,setContent]=useState(defaultMode==='question-only'?questionOnly:questionAndAnswer);
 const [remark,setRemark]=useState('');
 const [insertWay,setInsertWay]=useState<'new-page'|'append-last'>('new-page');

 const books=notesState.notebooks;
 const preferredBookId=()=>{
  const custom=books.find(b=>!b.preset);
  if(books.some(b=>b.id===notesState.activeBookId&&!b.preset))return notesState.activeBookId;
  return custom?.id??notesState.activeBookId??books[0]?.id??'';
 };

 const [bookId,setBookId]=useState<string>(preferredBookId);
 const [creatingBook,setCreatingBook]=useState(false);
 const [newBookName,setNewBookName]=useState('');
 const [newBookIcon,setNewBookIcon]=useState('📘');
 const [error,setError]=useState('');
 const [savedInfo,setSavedInfo]=useState<{bookId:string;bookName:string;pageId:string;pageIndex:number;updated?:boolean}|null>(null);
 const [polishing,setPolishing]=useState(false);
 const [polishText,setPolishText]=useState<string|null>(null);
 const [polishRefine,setPolishRefine]=useState('');
 const [polishRemaining,setPolishRemaining]=useState<number|null>(null);
 const [polishHistory,setPolishHistory]=useState<{role:'user'|'model';text:string}[]>([]);
 const polishAbortRef=useRef<AbortController|null>(null);

 const returnHref=()=>{
  if(source.href)return source.href;
  if(typeof window!=='undefined')return window.location.pathname+window.location.search;
  return '/learn';
 };

 const triggerMatches=useMemo(()=>{
  if(hideTrigger)return [];
  return findDuplicateNotes(notesState,{
   title,
   content:questionAndAnswer,
   altContent:questionOnly,
   source,
  });
 },[hideTrigger,notesState,title,questionAndAnswer,questionOnly,source]);

 const finalContent=remark.trim()
  ?`${content.trim()}\n\n> 💡 **${L('我的心得','My Note')}**：${remark.trim()}`
  :content.trim();
 const cleanTitle=pageTitle.trim()||title.trim()||L('学习笔记','Study Note');

 const modalMatches=useMemo(()=>{
  if(!open)return [];
  return findDuplicateNotes(notesState,{
   title:cleanTitle,
   content:finalContent,
   altContent:questionOnly,
   source:{...source,href:returnHref()},
  });
 },[open,notesState,cleanTitle,finalContent,questionOnly,source]);

 const matchByBook=useMemo(()=>new Map(modalMatches.map(m=>[m.bookId,m])),[modalMatches]);
 const targetId=bookId||books[0]?.id||'';
 const dupInBook=!creatingBook&&books.length>0&&targetId?(matchByBook.get(targetId)??null):null;
 const dupOther=!creatingBook&&!dupInBook?(modalMatches[0]??null):null;

 const noteHrefFor=(m:{bookId:string;pageIndex:number})=>
  `/notes?book=${encodeURIComponent(m.bookId)}&page=${m.pageIndex+1}&back=${encodeURIComponent(returnHref())}&backLabel=${encodeURIComponent(source.label)}&backKind=${encodeURIComponent(source.kind)}`;

 const rememberReturn=(m:{bookId:string;pageId:string})=>{
  onBeforeNavigate?.();
  saveNoteReturnContext({
   href:returnHref(),
   label:source.label,
   kind:source.kind,
   bookId:m.bookId,
   pageId:m.pageId,
  });
 };

 const resetPolish=()=>{
  polishAbortRef.current?.abort();
  polishAbortRef.current=null;
  setPolishing(false);
  setPolishText(null);
  setPolishRefine('');
  setPolishRemaining(null);
  setPolishHistory([]);
 };

 const openModal=()=>{
  const initMode=defaultMode;
  const initTitle=title.trim().slice(0,80)||L('题目笔记','Question Note');
  const initContent=initMode==='question-only'?questionOnly:questionAndAnswer;
  const existing=findDuplicateNotes(notesState,{
   title:initTitle,
   content:initContent,
   altContent:questionOnly,
   source:{...source,href:returnHref()},
  });
  setMode(initMode);
  setPageTitle(initTitle);
  setContent(initContent);
  setRemark('');
  setBookId(existing[0]?.bookId??preferredBookId());
  setCreatingBook(books.length===0);
  setNewBookName('');
  setError('');
  setSavedInfo(null);
  resetPolish();
  setOpen(true);
 };

 const openModalRef=useRef(openModal);
 useEffect(()=>{openModalRef.current=openModal});
 const lastTriggerRef=useRef(trigger);
 useEffect(()=>{
  if(trigger>0&&trigger!==lastTriggerRef.current){
   lastTriggerRef.current=trigger;
   openModalRef.current();
  }
 },[trigger]);

 const runPolish=async(instruction?:string)=>{
  const src=content.trim();
  if(!src){
   setError(L('请先填写笔记内容再润色','Enter note content before polishing'));
   return;
  }
  polishAbortRef.current?.abort();
  const ctl=new AbortController();
  polishAbortRef.current=ctl;
  setError('');
  setPolishing(true);
  setPolishText('');

  const noteTitle=pageTitle.trim()||title.trim()||source.label;
  const userMsg=instruction&&polishHistory.length
   ?instruction.trim()
   :[
     '请对这份即将保存的学习笔记做【AI 润色】整理：',
     '1. 完整保留核心知识点、代码片段与关键细节，不遗漏原意；',
     '2. 理顺表达与层级结构（善用 Markdown 小标题、列表、加粗与代码块）；',
     instruction?`3. 额外要求：${instruction.trim()}`:'3. 若文字啰嗦或口语化，改为清晰利落、便于复习的书面表达；',
     '4. 直接输出润色后的 Markdown 笔记正文（不要客套寒暄）。',
     '',
     `标题：${noteTitle}`,
     `内容：\n${src}`,
     remark.trim()?`个人心得：${remark.trim()}`:'',
    ].filter(Boolean).join('\n');

  const nextMsgs:{role:'user'|'model';text:string}[]=instruction&&polishHistory.length
   ?[...polishHistory,{role:'user',text:userMsg}]
   :[{role:'user',text:userMsg}];

  const res=await streamNoteAi(
   {kind:'lesson',lesson:{title:noteTitle,body:src.slice(0,8000),steps:[]}},
   nextMsgs,
   delta=>setPolishText(delta),
   ()=>{},
   ctl.signal,
  );
  if(polishAbortRef.current===ctl)polishAbortRef.current=null;
  setPolishing(false);
  if(res.ok){
   setPolishText(res.text);
   setPolishRemaining(typeof res.remaining==='number'?res.remaining:null);
   setPolishHistory([...nextMsgs,{role:'model',text:res.text}]);
   if(instruction)setPolishRefine('');
  }else if(!res.aborted){
   setError(res.message);
   if(!polishHistory.length)setPolishText(null);
  }
 };

 useEffect(()=>()=>{polishAbortRef.current?.abort()},[]);

 const switchMode=(next:'question-only'|'question-and-answer')=>{
  setMode(next);
  setContent(next==='question-only'?questionOnly:questionAndAnswer);
 };

 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[open]);

 const returnBtnLabel=()=>{
  if(source.kind==='quiz'||source.kind==='paper')return L('返回原题目','Back to Question');
  if(source.kind==='interview')return L('返回面试刷题','Back to Interview');
  if(source.kind==='playground')return L('返回代码操场','Back to Playground');
  return L('返回学习卡片','Back to Lesson');
 };

 const handleOverwrite=()=>{
  if(!dupInBook||!dupInBook.canOverwrite)return;
  setError('');
  if(!finalContent){
   setError(L('笔记内容不能为空','Note content cannot be empty'));
   return;
  }
  const fullSource:NoteSource={...source,href:returnHref()};
  updateNotePage(username,dupInBook.bookId,dupInBook.pageId,{
   title:cleanTitle,
   content:finalContent,
   source:fullSource,
  });
  setActiveBookAndPage(username,dupInBook.bookId,dupInBook.pageIndex);
  rememberReturn(dupInBook);
  setSavedInfo({
   bookId:dupInBook.bookId,
   bookName:dupInBook.bookName,
   pageId:dupInBook.pageId,
   pageIndex:dupInBook.pageIndex,
   updated:true,
  });
 };

 const handleSave=()=>{
  setError('');
  if(!finalContent){
   setError(L('笔记内容不能为空','Note content cannot be empty'));
   return;
  }
  const fullSource:NoteSource={
   ...source,
   href:returnHref(),
  };

  if(books.length===0||creatingBook){
   const bName=newBookName.trim();
   if(!bName){
    setError(L('请先输入新笔记本的名称','Please enter a name for the new notebook'));
    return;
   }
   if(books.some(b=>b.name.trim().toLowerCase()===bName.toLowerCase())){
    setError(L('已存在同名笔记本','A notebook with this name already exists'));
    return;
   }
   const created=createNotebook(username,{
    name:bName,
    icon:newBookIcon,
    cover:'auto',
    firstPageTitle:cleanTitle,
    firstPageContent:finalContent,
    source:fullSource,
   });
   rememberReturn({bookId:created.book.id,pageId:created.book.pages[0].id});
   setSavedInfo({
    bookId:created.book.id,
    bookName:created.book.name,
    pageId:created.book.pages[0].id,
    pageIndex:0,
   });
   setCreatingBook(false);
   return;
  }

  if(dupInBook){
   if(dupInBook.canOverwrite&&!dupInBook.exact){
    handleOverwrite();
    return;
   }
   setError(L(`《${dupInBook.bookName}》第 ${dupInBook.pageIndex+1} 页已收录`,`Already saved in “${dupInBook.bookName}” · p.${dupInBook.pageIndex+1}`));
   return;
  }

  const added=addNoteEntry(
   username,
   targetId,
   {title:cleanTitle,content:finalContent,source:fullSource},
   insertWay,
   {preventDuplicate:true,altContent:questionOnly},
  );
  const targetBook=added.state.notebooks.find(b=>b.id===added.bookId);
  if(added.duplicate){
   setError(L(`《${targetBook?.name??L('笔记本','Notebook')}》第 ${added.pageIndex+1} 页已收录`,`Already saved in “${targetBook?.name??'Notebook'}” · p.${added.pageIndex+1}`));
   return;
  }
  rememberReturn(added);
  setSavedInfo({
   bookId:added.bookId,
   bookName:targetBook?.name??L('笔记本','Notebook'),
   pageId:added.pageId,
   pageIndex:added.pageIndex,
  });
 };

 const label1=modeLabels?.[0]??[L('仅添加题目','Question only'),L('只收录题干、代码与选项，留给自己思考','Save only the prompt, code & options')];
 const label2=modeLabels?.[1]??[L('添加题目 + 答案','Question + Answer'),L('完整收录题干、参考答案/作答与核心解析','Save prompt, answer & key explanation')];
 const isAlreadySaved=triggerMatches.length>0;

 return (
  <>
   {!hideTrigger&&(
    <button
     type="button"
     className={(compact?'ai-note-pill':'button secondary ai-note-btn')+(isAlreadySaved?' saved':'')+(className?' '+className:'')}
     onClick={openModal}
     title={isAlreadySaved
      ?L(`已收录于《${triggerMatches[0].bookName}》第 ${triggerMatches[0].pageIndex+1} 页`,`Saved in “${triggerMatches[0].bookName}” · p.${triggerMatches[0].pageIndex+1}`)
      :L('把当前内容添加到我的笔记本','Add to my notebook')}
    >
     {isAlreadySaved?<Check size={compact?13:15}/>:<BookPlus size={compact?13:15}/>}
     <span>{isAlreadySaved?L('已记笔记','Saved'):L('记笔记','Add to Notes')}</span>
    </button>
   )}

   {open&&typeof document!=='undefined'&&createPortal(
    <div className="note-modal-backdrop" role="dialog" aria-modal="true" aria-label={L('添加到笔记本','Add to Notebook')} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
     <div className="ai-card note-modal">
      <div className="note-modal-head">
       <div className="note-modal-title">
        <BookText size={19}/>
        <div>
         <strong>{L('添加到我的笔记本','Save to My Notebook')}</strong>
         <small>{source.label}</small>
        </div>
       </div>
       <button type="button" className="note-modal-close" onClick={()=>setOpen(false)} aria-label={L('关闭','Close')}>
        <X size={18}/>
       </button>
      </div>

      {savedInfo?(
       <div className="note-modal-saved">
        <div className="note-saved-badge">
         <Check size={22}/>
        </div>
        <h3>
         {savedInfo.updated
          ?L(`已更新《${savedInfo.bookName}》第 ${savedInfo.pageIndex+1} 页`,`Updated “${savedInfo.bookName}” · Page ${savedInfo.pageIndex+1}`)
          :L(`已写入《${savedInfo.bookName}》第 ${savedInfo.pageIndex+1} 页`,`Saved to “${savedInfo.bookName}” · Page ${savedInfo.pageIndex+1}`)}
        </h3>
        <div className="note-saved-actions">
         <button type="button" className="button secondary" onClick={()=>setOpen(false)}>
          {returnBtnLabel()}
         </button>
         <a className="button primary" href={noteHrefFor(savedInfo)} onClick={()=>onBeforeNavigate?.()}>
          <Sparkles size={15}/>
          <span>{L('打开笔记本','Open Notebook')}</span>
          <ArrowRight size={15}/>
         </a>
        </div>
       </div>
      ):(
       <div className="note-modal-body">
        {/* 1. 选择添加模式：仅题目 vs 题目+答案 */}
        {questionOnly!==questionAndAnswer&&<div className="note-field">
         <span className="note-field-label">{L('1. 收录内容','1. Content')}</span>
         <div className="note-mode-grid">
          <button
           type="button"
           className={'note-mode-card'+(mode==='question-only'?' on':'')}
           onClick={()=>switchMode('question-only')}
          >
           <strong>{mode==='question-only'&&<Check size={14}/>}{label1[0]}</strong>
          </button>
          <button
           type="button"
           className={'note-mode-card'+(mode==='question-and-answer'?' on':'')}
           onClick={()=>switchMode('question-and-answer')}
          >
           <strong>{mode==='question-and-answer'&&<Check size={14}/>}{label2[0]}</strong>
          </button>
         </div>
        </div>}

        {/* 2. 选择笔记本（无笔记本时强制引导新建） */}
        <div className="note-field">
         <div className="note-field-row">
          <span className="note-field-label">
           {books.length===0
            ?L('2. 新建笔记本','2. New notebook')
            :L('2. 目标笔记本','2. Target notebook')}
          </span>
          {books.length>0&&(
           <button
            type="button"
            className="note-inline-link"
            onClick={()=>{setCreatingBook(v=>!v);setError('')}}
           >
            <FolderPlus size={14}/>
            <span>{creatingBook?L('选已有笔记本','Existing'):L('+ 新建笔记本','+ New')}</span>
           </button>
          )}
         </div>

         {books.length===0||creatingBook?(
          <div className="note-create-book-box">
           <div className="note-create-row">
            <select
             value={newBookIcon}
             onChange={e=>setNewBookIcon(e.target.value)}
             className="note-icon-select"
             aria-label={L('笔记本图标','Notebook icon')}
            >
             {NOTEBOOK_ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
             value={newBookName}
             onChange={e=>setNewBookName(e.target.value)}
             maxLength={36}
             placeholder={L('输入笔记本名称…','Notebook name…')}
            />
           </div>
           <div className="note-cover-row">
            <div className="note-create-actions">
             {books.length>0&&(
              <button
               type="button"
               className="note-inline-act"
               onClick={()=>{
                (document.activeElement as HTMLElement|null)?.blur?.();
                setCreatingBook(false);
                setNewBookName('');
                setError('');
               }}
              >
               {L('取消','Cancel')}
              </button>
             )}
             <button
              type="button"
              className="note-inline-act primary"
              onClick={()=>{
               const bName=newBookName.trim();
               if(!bName){
                setError(L('请先输入新笔记本的名称','Please enter a name for the new notebook'));
                return;
               }
               if(books.some(b=>b.name.trim().toLowerCase()===bName.toLowerCase())){
                setError(L('已存在同名笔记本','A notebook with this name already exists'));
                return;
               }
               (document.activeElement as HTMLElement|null)?.blur?.();
               const created=createNotebook(username,{
                name:bName,
                icon:newBookIcon,
                cover:'auto',
                firstPageTitle:L('第 1 页 · 核心笔记','Page 1 · Core Notes'),
                firstPageContent:`### ${bName}\n\n`,
               });
               setBookId(created.book.id);
               setCreatingBook(false);
               setNewBookName('');
               setError('');
              }}
             >
              {L('保存笔记本','Save')}
             </button>
            </div>
           </div>
          </div>
         ):(
          <>
           <div className="note-book-chips">
            {books.map(b=>{
             const hasDup=matchByBook.has(b.id);
             return (
              <button
               key={b.id}
               type="button"
               className={'note-book-chip'+(targetId===b.id?' on':'')+(hasDup?' has-dup':'')}
               onClick={()=>{setBookId(b.id);setError('')}}
              >
               <span>{b.icon}</span>
               <b>{b.name}</b>
               {hasDup&&<Check size={12} className="note-chip-dup"/>}
               <small>{L(`${b.pages.length} 页`,`${b.pages.length}p`)}</small>
              </button>
             );
            })}
           </div>
           {dupInBook?(
            <div className="note-dup-bar">
             <span className="note-dup-msg">
              <Check size={14}/>
              <span>{L(`《${dupInBook.bookName}》第 ${dupInBook.pageIndex+1} 页已收录`,`Saved in “${dupInBook.bookName}” · p.${dupInBook.pageIndex+1}`)}</span>
             </span>
             <a className="note-dup-link" href={noteHrefFor(dupInBook)} onClick={()=>rememberReturn(dupInBook)}>
              <span>{L('查看','Open')}</span>
              <ArrowRight size={13}/>
             </a>
            </div>
           ):(
            <>
             {dupOther&&(
              <div className="note-dup-bar other">
               <span className="note-dup-msg">
                <Check size={14}/>
                <span>{L(`《${dupOther.bookName}》第 ${dupOther.pageIndex+1} 页已收录`,`Saved in “${dupOther.bookName}” · p.${dupOther.pageIndex+1}`)}</span>
               </span>
               <a className="note-dup-link" href={noteHrefFor(dupOther)} onClick={()=>rememberReturn(dupOther)}>
                <span>{L('查看','Open')}</span>
                <ArrowRight size={13}/>
               </a>
              </div>
             )}
             <div className="note-way-row">
              <label className={insertWay==='new-page'?'on':''}>
               <input
                type="radio"
                name="note-way"
                checked={insertWay==='new-page'}
                onChange={()=>setInsertWay('new-page')}
               />
               <FilePlus2 size={14}/>
               <span>{L('作为新的一页加入','Add as a new page')}</span>
              </label>
              <label className={insertWay==='append-last'?'on':''}>
               <input
                type="radio"
                name="note-way"
                checked={insertWay==='append-last'}
                onChange={()=>setInsertWay('append-last')}
               />
               <BookPlus size={14}/>
               <span>{L('追加到该本最后一页','Append to last page')}</span>
              </label>
             </div>
            </>
           )}
          </>
         )}
        </div>

        {/* 3. 笔记标题与预览编辑 */}
        <div className="note-field">
         <div className="note-field-row">
          <span className="note-field-label">{L('3. 笔记页标题与内容','3. Page title & content')}</span>
          <button
           type="button"
           className="note-ai-polish-btn"
           disabled={polishing||!content.trim()}
           onClick={()=>void runPolish()}
          >
           {polishing?<Loader2 size={13} className="ai-spin"/>:<Sparkles size={13}/>}
           <span>{polishing?L('润色中…','Polishing…'):L('AI 润色','AI Polish')}</span>
          </button>
         </div>
         {(polishing||polishText!==null)&&(
          <div className="note-polish-box">
           <pre className="note-polish-preview">{polishText||L('AI 正在润色笔记…','Polishing note…')}</pre>
           {!polishing&&(
            <>
             <div className="note-polish-refine">
              <input
               value={polishRefine}
               onChange={e=>setPolishRefine(e.target.value)}
               maxLength={160}
               placeholder={L('调整要求（如：更精简/加示例），留空则重改一版','Refinement note (optional)')}
               onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void runPolish(polishRefine.trim()||'请换一种更清晰精炼的方式重新润色，保持细节完整并只输出 Markdown 正文。')}}}
              />
              <button
               type="button"
               className="note-inline-act"
               onClick={()=>void runPolish(polishRefine.trim()||'请换一种更清晰精炼的方式重新润色，保持细节完整并只输出 Markdown 正文。')}
              >
               <RotateCcw size={13}/>
               <span>{L('再让 AI 改','Refine')}</span>
              </button>
             </div>
             <div className="note-polish-actions">
              <button
               type="button"
               className="button primary"
               onClick={()=>{
                if(polishText)setContent(polishText);
                resetPolish();
               }}
              >
               <Check size={14}/>
               <span>{L('允许应用','Apply')}</span>
              </button>
              <button type="button" className="button secondary" onClick={resetPolish}>
               <X size={14}/>
               <span>{L('取消','Cancel')}</span>
              </button>
              {polishRemaining!==null&&<small className="muted" style={{marginLeft:'auto'}}>{L(`今日还剩 ${polishRemaining} 次`,`${polishRemaining} left today`)}</small>}
             </div>
            </>
           )}
           {polishing&&(
            <div className="note-polish-actions">
             <button type="button" className="button secondary" onClick={resetPolish}>
              <X size={14}/>
              <span>{L('取消','Cancel')}</span>
             </button>
            </div>
           )}
          </div>
         )}
         <input
          className="note-title-input"
          value={pageTitle}
          onChange={e=>setPageTitle(e.target.value)}
          maxLength={80}
          placeholder={L('这一页笔记的标题','Note page title')}
         />
         <textarea
          className="note-content-input"
          rows={6}
          value={content}
          onChange={e=>setContent(e.target.value)}
         />
         <input
          className="note-remark-input"
          value={remark}
          onChange={e=>setRemark(e.target.value)}
          maxLength={300}
          placeholder={L('补充心得（可选）…','Optional takeaway…')}
         />
        </div>

        {error&&<p className="ai-grade-error" style={{margin:0}}>{error}</p>}

        <div className="note-modal-foot">
         <button type="button" className="button secondary" onClick={()=>setOpen(false)}>
          {L('取消','Cancel')}
         </button>
         {dupInBook?(
          dupInBook.canOverwrite&&!dupInBook.exact?(
           <button type="button" className="button primary" onClick={handleOverwrite}>
            <Check size={16}/>
            <span>{L('覆盖更新','Update Note')}</span>
           </button>
          ):(
           <a className="button primary" href={noteHrefFor(dupInBook)} onClick={()=>rememberReturn(dupInBook)}>
            <Sparkles size={15}/>
            <span>{L('查看原笔记','Open Note')}</span>
            <ArrowRight size={15}/>
           </a>
          )
         ):(
          <button type="button" className="button primary" onClick={handleSave}>
           <BookPlus size={16}/>
           <span>{books.length===0||creatingBook?L('新建笔记本并写入','Create & Save Note'):L('存入笔记本','Save to Notebook')}</span>
          </button>
         )}
        </div>
       </div>
      )}
     </div>
    </div>,
    document.body,
   )}
  </>
 );
}
