'use client';
import '../ai/ai.css';
import './notes.css';
import {classifySafeHref} from '@/lib/safe-href';
import {Fragment,memo,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {
 computeCurlGeometry,
 curlPointForProgress,
 easePageCurl,
 type CurlGeometry,
} from './page-curl';
import {
 ArrowLeft,
 Bold,
 BookOpen,
 BookText,
 Bot,
 Check,
 CheckSquare,
 ChevronDown,
 ChevronLeft,
 ChevronRight,
 ChevronUp,
 Code,
 Code2,
 Copy,
 Edit3,
 Eye,
 FilePlus2,
 FolderPlus,
 GripVertical,
 Heading3,
 Highlighter,
 Italic,
 List,
 ListOrdered,
 Maximize2,
 Minimize,
 Minimize2,
 PanelLeftClose,
 PanelLeftOpen,
 Pencil,
 Play,
 Plus,
 Quote,
 Redo2,
 RotateCcw,
 Send,
 Sparkles,
 Square,
 Trash2,
 Undo2,
 Wand2,
 X,
} from 'lucide-react';
import SiteHeader from '../components/site-header';
import {useI18n} from '../components/i18n';
import {streamNoteAi} from '../components/note-ai-client';
import {
 addNoteEntry,
 createNotebook,
 deleteNotebook,
 deleteNotePage,
 moveNotePageToBook,
 NOTEBOOK_ICONS,
 readNoteReturnContext,
 renameNotebook,
 reorderNotePageInBook,
 restorePresetGuideNotebook,
 setActiveBookAndPage,
 setNotesAppearance,
 updateNotePage,
 useNotesStore,
 type NoteSourceKind,
} from '@/lib/notes-store';
import {detectPlaygroundLang,normalizePlaygroundLang,type PlaygroundLang} from '@/lib/playground-bridge';
import {InlineRunOutput,useInlineCodeRun} from '../components/inline-code-run';
import type {TutorContext} from '@/lib/tutor-types';

type SelectionInfo={
 text:string;
 start:number;
 end:number;
 x:number;
 y:number;
 fromEditor:boolean;
 rects?:{left:number;top:number;width:number;height:number}[];
};

function getCssHighlights():Map<string,unknown>|null{
 if(typeof CSS==='undefined')return null;
 return (CSS as unknown as {highlights?:Map<string,unknown>}).highlights??null;
}

function setNoteSelectionHighlight(range:Range|null){
 const registry=getCssHighlights();
 if(!registry)return false;
 if(!range){
  registry.delete('nb-sel');
  return true;
 }
 const HighlightCtor=(window as unknown as {Highlight?:new(...ranges:Range[])=>unknown}).Highlight;
 if(!HighlightCtor)return false;
 registry.set('nb-sel',new HighlightCtor(range));
 return true;
}

type FlipAnim={
 id:number;
 dir:'next'|'prev';
 sheetTitle:string;
 sheetContent:string;
 sheetPageNo:number;
 underTitle?:string;
 underContent?:string;
 underPageNo?:number;
};

// 用于仿真卷曲纸页表面的真实排版预览（memo 避免 60fps 卷页帧更新时重复渲染）
const NoteStaticPreview=memo(function NoteStaticPreview({content}:{content:string}){
 const blocks=useMemo(()=>parseNoteMarkdown(content),[content]);
 return (
  <div className="nb-page-rendered nb-sheet-rendered">
   {blocks.map((b,bi)=>{
    if(b.kind==='code'){
     return (
      <div key={bi} className="nb-code-card">
       <div className="nb-code-head">
        <span className="nb-code-lang">{b.lang||'code'}</span>
       </div>
       <pre><code>{b.code}</code></pre>
      </div>
     );
    }
    if(b.kind==='hr')return <hr key={bi} className="nb-hr"/>;
    if(b.kind==='heading'){
     return b.level<=2
      ?<h2 key={bi} className="nb-h2">{renderInlineMd(b.text)}</h2>
      :<h3 key={bi} className="nb-h3">{renderInlineMd(b.text)}</h3>;
    }
    if(b.kind==='quote'){
     return (
      <blockquote key={bi} className="nb-quote">
       {b.lines.map((ql,qi)=><p key={qi}>{renderInlineMd(ql)}</p>)}
      </blockquote>
     );
    }
    if(b.kind==='ul'){
     return (
      <ul key={bi} className="nb-list">
       {b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}
      </ul>
     );
    }
    if(b.kind==='ol'){
     return (
      <ol key={bi} className="nb-list">
       {b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}
      </ol>
     );
    }
    if(b.kind==='todo'){
     return (
      <ul key={bi} className="nb-todo-list">
       {b.items.map((it,ii)=>(
        <li key={ii} className={it.done?'done':''}>
         <label>
          <input type="checkbox" checked={it.done} readOnly/>
          <span>{renderInlineMd(it.text)}</span>
         </label>
        </li>
       ))}
      </ul>
     );
    }
    return <p key={bi} className="nb-p">{renderInlineMd(b.text)}</p>;
   })}
  </div>
 );
});

// 解析行内 Markdown：**加粗**、*斜体*、==高亮==、`行内代码`、[链接](url)
function renderInlineMd(s:string){
 const parts=s.split(/(==[^=\n]+==|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g);
 return parts.map((p,i)=>{
  if(p.startsWith('==')&&p.endsWith('==')&&p.length>4){
   return <mark key={i} className="nb-mark">{p.slice(2,-2)}</mark>;
  }
  if(p.startsWith('**')&&p.endsWith('**')&&p.length>4){
   return <strong key={i}>{p.slice(2,-2)}</strong>;
  }
  if(p.startsWith('*')&&p.endsWith('*')&&p.length>2){
   return <em key={i}>{p.slice(1,-1)}</em>;
  }
  if(p.startsWith('`')&&p.endsWith('`')&&p.length>2){
   return <code key={i} className="nb-inline-code">{p.slice(1,-1)}</code>;
  }
  const lm=p.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);
  if(lm){
   const safe=classifySafeHref(lm[2]);
   if(!safe)return <Fragment key={i}>{p}</Fragment>;
   return safe.external
    ?<a key={i} href={safe.href} className="nb-link" target="_blank" rel="noopener noreferrer">{lm[1]}</a>
    :<a key={i} href={safe.href} className="nb-link">{lm[1]}</a>;
  }
  return <Fragment key={i}>{p}</Fragment>;
 });
}

type ParsedBlock=
 |{kind:'code';lang:string;code:string}
 |{kind:'heading';level:number;text:string}
 |{kind:'quote';lines:string[]}
 |{kind:'ul';items:string[]}
 |{kind:'ol';items:string[]}
 |{kind:'todo';items:{done:boolean;text:string;lineIdx:number}[]}
 |{kind:'hr'}
 |{kind:'p';text:string};

function parseNoteMarkdown(src:string):ParsedBlock[]{
 const lines=src.replace(/\r\n?/g,'\n').split('\n');
 const out:ParsedBlock[]=[];
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  const trimmed=line.trim();
  if(!trimmed){
   i++;
   continue;
  }
  // 围栏代码块
  const fm=line.match(/^[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$/);
  if(fm){
   const fence=fm[1][0],fLen=fm[1].length;
   const lang=fm[2].trim().split(/\s+/)[0]||'';
   const codeLines:string[]=[];
   i++;
   while(i<lines.length){
    const cl=lines[i],ct=cl.trim();
    if(ct.length>=fLen&&ct.split('').every(c=>c===fence)){
     i++;
     break;
    }
    codeLines.push(cl);
    i++;
   }
   out.push({kind:'code',lang,code:codeLines.join('\n')});
   continue;
  }
  // 分割线
  if(/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)){
   out.push({kind:'hr'});
   i++;
   continue;
  }
  // 标题
  const hm=line.match(/^[ \t]{0,3}(#{1,4})[ \t]+(.+)$/);
  if(hm){
   out.push({kind:'heading',level:hm[1].length,text:hm[2].trim()});
   i++;
   continue;
  }
  // 引用块
  if(/^[ \t]{0,3}>[ \t]?/.test(line)){
   const qLines:string[]=[];
   while(i<lines.length&&/^[ \t]{0,3}>[ \t]?/.test(lines[i])){
    qLines.push(lines[i].replace(/^[ \t]{0,3}>[ \t]?/,''));
    i++;
   }
   out.push({kind:'quote',lines:qLines});
   continue;
  }
  // 待办列表 - [ ] / - [x]
  if(/^[ \t]*[-*+][ \t]+\[([ xX])\][ \t]+/.test(line)){
   const items:{done:boolean;text:string;lineIdx:number}[]=[];
   while(i<lines.length){
    const tm=lines[i].match(/^[ \t]*[-*+][ \t]+\[([ xX])\][ \t]+(.*)$/);
    if(!tm)break;
    items.push({done:tm[1].toLowerCase()==='x',text:tm[2],lineIdx:i});
    i++;
   }
   out.push({kind:'todo',items});
   continue;
  }
  // 无序列表
  if(/^[ \t]*[-*+][ \t]+/.test(line)){
   const items:string[]=[];
   while(i<lines.length&&/^[ \t]*[-*+][ \t]+/.test(lines[i])&&!/^[ \t]*[-*+][ \t]+\[([ xX])\]/.test(lines[i])){
    items.push(lines[i].replace(/^[ \t]*[-*+][ \t]+/,''));
    i++;
   }
   out.push({kind:'ul',items});
   continue;
  }
  // 有序列表
  if(/^[ \t]*\d+[.)][ \t]+/.test(line)){
   const items:string[]=[];
   while(i<lines.length&&/^[ \t]*\d+[.)][ \t]+/.test(lines[i])){
    items.push(lines[i].replace(/^[ \t]*\d+[.)][ \t]+/,''));
    i++;
   }
   out.push({kind:'ol',items});
   continue;
  }
  // 普通段落
  const pLines:string[]=[line];
  i++;
  while(
   i<lines.length&&
   lines[i].trim()&&
   !/^[ \t]{0,3}(`{3,}|~{3,}|#{1,4}[ \t]|>[ \t]?|(-{3,}|\*{3,})$)/.test(lines[i])&&
   !/^[ \t]*([-*+][ \t]+|\d+[.)][ \t]+)/.test(lines[i])
  ){
   pLines.push(lines[i]);
   i++;
  }
  out.push({kind:'p',text:pLines.join('\n')});
 }
 return out;
}

function NoteCodeCard({
 lang,
 code,
 pageTitle,
 bookId,
 pageNo,
}:{
 lang:string;
 code:string;
 pageTitle:string;
 bookId:string;
 pageNo:number;
}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [copied,setCopied]=useState(false);

 const hintLang:PlaygroundLang|null=normalizePlaygroundLang(lang);
 const playLang=useMemo(()=>hintLang??detectPlaygroundLang(code,null),[code,hintLang]);
 const runner=useInlineCodeRun(playLang,code,{
  title:pageTitle,
  sourceLabel:L(`学习笔记 · 第 ${pageNo} 页`,`Study Notes · Page ${pageNo}`),
  backHref:`/notes?book=${encodeURIComponent(bookId)}&page=${pageNo}`,
 });

 const handleCopy=async()=>{
  try{
   await navigator.clipboard.writeText(runner.displayCode);
   setCopied(true);
   setTimeout(()=>setCopied(false),1600);
  }catch{}
 };

 return (
  <div className="nb-code-card">
   <div className="nb-code-head">
    <span className="nb-code-lang">{lang||playLang||'code'}</span>
    <div className="nb-code-actions">
     {playLang&&(runner.busy?(
      <button type="button" className="nb-code-btn stop" onClick={runner.stop}>
       <Square size={11} fill="currentColor"/>
       <span>{L('停止','Stop')}</span>
      </button>
     ):(
      <button type="button" className="nb-code-btn run" onClick={()=>void runner.run()} title={L('直接运行这段代码','Run code directly')}>
       <Play size={12}/>
       <span>{L('运行','Run')}</span>
      </button>
     ))}
     <button type="button" className="nb-code-btn" onClick={()=>void handleCopy()}>
      {copied?<Check size={12}/>:<Copy size={12}/>}
      <span>{copied?L('已复制','Copied'):L('复制','Copy')}</span>
     </button>
    </div>
   </div>
   <pre><code>{runner.displayCode}</code></pre>
   <InlineRunOutput running={runner.running} completing={runner.completing} result={runner.result} error={runner.error} onClear={runner.clear} onAiFix={()=>void runner.aiFix()} onOpenPlayground={playLang?runner.openPlayground:undefined}/>
  </div>
 );
}

export default function NotesClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const searchParams=useSearchParams();
 const state=useNotesStore(username);

 // URL 参数支持：?book=...&page=...&back=...&backLabel=...&backKind=...
 const urlBook=searchParams.get('book');
 const urlPage=Number(searchParams.get('page'))||0;
 const urlBack=searchParams.get('back');
 const urlBackLabel=searchParams.get('backLabel');
 const urlBackKind=(searchParams.get('backKind') as NoteSourceKind|null)??null;

 const [storedReturn,setStoredReturn]=useState<{href:string;label:string;kind:NoteSourceKind}|null>(null);
 useEffect(()=>{
  const ctx=readNoteReturnContext();
  if(ctx)setStoredReturn({href:ctx.href,label:ctx.label,kind:ctx.kind});
 },[]);

 useEffect(()=>{
  if(urlBook&&state.notebooks.some(b=>b.id===urlBook)){
   setActiveBookAndPage(username,urlBook,urlPage>0?urlPage-1:undefined);
  }
 },[urlBook,urlPage,username]); // eslint-disable-line react-hooks/exhaustive-deps

 const books=state.notebooks;
 const activeBook=books.find(b=>b.id===state.activeBookId)??books[0]??null;
 const rawPageIdx=activeBook?(state.activePageByBook[activeBook.id]??0):0;
 const pageIdx=activeBook?Math.max(0,Math.min(activeBook.pages.length-1,rawPageIdx)):0;
 const activePage=activeBook?.pages[pageIdx]??null;

 // 编辑模式 vs 仿真阅读划词模式
 const [editMode,setEditMode]=useState(false);
 // 全屏沉浸阅读模式（顶部窗帘拉上/拉下）、左侧书架收纳持久化、移动端先选笔记本再进入、移动端排版工具栏展开
 const [isFullscreen,setIsFullscreen]=useState(false);
 const [curtainOpen,setCurtainOpen]=useState(false);
 const sidebarCollapsed=Boolean(state.sidebarCollapsed);
 const [mobileView,setMobileView]=useState<'shelf'|'page'>(()=>urlBook?'page':'shelf');
 const [mobileFormatOpen,setMobileFormatOpen]=useState(false);

 // 拖拽移动笔记（跨笔记本移入 / 同笔记本排序）与点击选择转移笔记本 / 修改页码状态
 const [dragPage,setDragPage]=useState<{bookId:string;pageId:string;pageIdx:number}|null>(null);
 const [dragOverBookId,setDragOverBookId]=useState<string|null>(null);
 const [dragOverPageIdx,setDragOverPageIdx]=useState<number|null>(null);
 const [bookPickerOpen,setBookPickerOpen]=useState(false);
 const [pagePickerOpen,setPagePickerOpen]=useState(false);
 const [targetPageInput,setTargetPageInput]=useState('');
 const [pageMoveErr,setPageMoveErr]=useState('');

 // 每页笔记编辑撤销 / 前进栈（支持格式化、AI 替换、复选框及正文/标题输入的后退撤销）
 type PageSnap={title:string;content:string};
 const undoHistoryRef=useRef<Map<string,{past:PageSnap[];future:PageSnap[]}>>(new Map());
 const lastSnapAtRef=useRef<{key:string;at:number}>({key:'',at:0});
 const [historyRev,setHistoryRev]=useState(0);
 const pageKey=activeBook&&activePage?`${activeBook.id}:${activePage.id}`:'';
 const {canUndo,canRedo}=useMemo(()=>{
  void historyRev;
  const h=pageKey?undoHistoryRef.current.get(pageKey):undefined;
  return {canUndo:Boolean(h&&h.past.length>0),canRedo:Boolean(h&&h.future.length>0)};
 },[pageKey,historyRev]);
 const [confirmDialog,setConfirmDialog]=useState<{
  title:string;
  message:string;
  confirmLabel:string;
  onConfirm:()=>void;
 }|null>(null);
 // 真实对角卷页物理引擎状态与 60fps rAF 动画句柄
 const [flipAnim,setFlipAnim]=useState<FlipAnim|null>(null);
 const [curlGeom,setCurlGeom]=useState<CurlGeometry|null>(null);
 const [rightEdgeHover,setRightEdgeHover]=useState(false);
 const flipSeqRef=useRef(0);
 const flipRafRef=useRef<number|null>(null);
 const stage3dRef=useRef<HTMLDivElement|null>(null);
 const dragStateRef=useRef<{
  active:boolean;
  startX:number;
  startY:number;
  moved:boolean;
  w:number;
  h:number;
  lastU:number;
  lastPx:number;
  lastPy:number;
  targetIdx:number;
  curTitle:string;
  curContent:string;
  curPageNo:number;
 }|null>(null);
 const nativeFsAttemptedRef=useRef(false);

 const toggleFullscreen=useCallback(()=>{
  setIsFullscreen(prev=>{
   const next=!prev;
   if(next){
    setCurtainOpen(false);
    nativeFsAttemptedRef.current=false;
    const p=document.documentElement.requestFullscreen?.();
    if(p){
     p.then(()=>{nativeFsAttemptedRef.current=true;}).catch(()=>{});
    }
   }else{
    nativeFsAttemptedRef.current=false;
    if(document.fullscreenElement){
     document.exitFullscreen?.().catch(()=>{});
    }
   }
   return next;
  });
 },[]);

 useEffect(()=>{
  const onFsChange=()=>{
   if(nativeFsAttemptedRef.current&&!document.fullscreenElement){
    nativeFsAttemptedRef.current=false;
    setIsFullscreen(false);
   }
  };
  document.addEventListener('fullscreenchange',onFsChange);
  return()=>document.removeEventListener('fullscreenchange',onFsChange);
 },[]);

 // 新建笔记本 & 重命名笔记本状态
 const [creatingBook,setCreatingBook]=useState(false);
 const [newBookName,setNewBookName]=useState('');
 const [newBookIcon,setNewBookIcon]=useState('📘');

 const [renamingBookId,setRenamingBookId]=useState<string|null>(null);
 const [renameText,setRenameText]=useState('');

 // 选中文本浮动工具栏 & AI 辅助面板状态
 const [selection,setSelection]=useState<SelectionInfo|null>(null);
 const [codeLangPick,setCodeLangPick]=useState<string>('python');
 const [showCodeMenu,setShowCodeMenu]=useState(false);

 const [aiOpen,setAiOpen]=useState(false);
 const [aiTargetText,setAiTargetText]=useState('');
 const [aiRange,setAiRange]=useState<{start:number;end:number}|null>(null);
 const [aiPrompt,setAiPrompt]=useState('');
 const [aiTaskTitle,setAiTaskTitle]=useState('');
 const [aiBusy,setAiBusy]=useState(false);
 const [aiOutput,setAiOutput]=useState('');
 const [aiThink,setAiThink]=useState('');
 const [aiRemaining,setAiRemaining]=useState<number|null>(null);
 const [aiError,setAiError]=useState('');
 const [noticeMsg,setNoticeMsg]=useState('');
 const aiAbortRef=useRef<AbortController|null>(null);

 const editorRef=useRef<HTMLTextAreaElement|null>(null);
 const pageBodyRef=useRef<HTMLDivElement|null>(null);
 const readerSelectingRef=useRef(false);

 // 清除自定义选区高亮
 useEffect(()=>{
  if(!selection){
   setNoteSelectionHighlight(null);
  }
 },[selection]);

 useEffect(()=>()=>{
  setNoteSelectionHighlight(null);
  if(flipRafRef.current!==null)cancelAnimationFrame(flipRafRef.current);
  aiAbortRef.current?.abort();
 },[]);

 const showNotice=(msg:string)=>{
  setNoticeMsg(msg);
  setTimeout(()=>setNoticeMsg(prev=>prev===msg?'':prev),2600);
 };

 // 统一记录可后退（撤销/重做）的页面改动
 const commitPageChange=useCallback((patch:{title?:string;content?:string},immediate=true)=>{
  if(!activeBook||!activePage)return;
  const k=`${activeBook.id}:${activePage.id}`;
  const now=Date.now();
  let bucket=undoHistoryRef.current.get(k);
  if(!bucket){
   bucket={past:[],future:[]};
   undoHistoryRef.current.set(k,bucket);
  }
  const shouldPush=immediate||lastSnapAtRef.current.key!==k||now-lastSnapAtRef.current.at>650;
  if(shouldPush){
   bucket.past.push({title:activePage.title,content:activePage.content});
   if(bucket.past.length>60)bucket.past.shift();
   bucket.future=[];
   lastSnapAtRef.current={key:k,at:immediate?0:now};
   setHistoryRev(r=>r+1);
  }else{
   lastSnapAtRef.current={key:k,at:now};
   if(bucket.future.length){
    bucket.future=[];
    setHistoryRev(r=>r+1);
   }
  }
  updateNotePage(username,activeBook.id,activePage.id,patch);
 },[activeBook,activePage,username]);

 const handleUndo=useCallback(()=>{
  if(!activeBook||!activePage)return;
  const k=`${activeBook.id}:${activePage.id}`;
  const bucket=undoHistoryRef.current.get(k);
  if(!bucket||bucket.past.length===0)return;
  const prev=bucket.past.pop()!;
  bucket.future.push({title:activePage.title,content:activePage.content});
  lastSnapAtRef.current={key:k,at:0};
  setHistoryRev(r=>r+1);
  setSelection(null);
  updateNotePage(username,activeBook.id,activePage.id,prev);
  showNotice(L('已后退一步','Undid last change'));
 },[activeBook,activePage,username]); // eslint-disable-line react-hooks/exhaustive-deps

 const handleRedo=useCallback(()=>{
  if(!activeBook||!activePage)return;
  const k=`${activeBook.id}:${activePage.id}`;
  const bucket=undoHistoryRef.current.get(k);
  if(!bucket||bucket.future.length===0)return;
  const next=bucket.future.pop()!;
  bucket.past.push({title:activePage.title,content:activePage.content});
  lastSnapAtRef.current={key:k,at:0};
  setHistoryRev(r=>r+1);
  setSelection(null);
  updateNotePage(username,activeBook.id,activePage.id,next);
  showNotice(L('已恢复一步','Redid change'));
 },[activeBook,activePage,username]); // eslint-disable-line react-hooks/exhaustive-deps

 // 全屏顶部工具栏窗帘：支持点击或上下拖拽拉手拉下/拉上
 const handleCurtainPointerDown=(e:React.PointerEvent<HTMLButtonElement>)=>{
  const startY=e.clientY;
  let handled=false;
  const onMove=(ev:PointerEvent)=>{
   const dy=ev.clientY-startY;
   if(!handled&&Math.abs(dy)>18){
    handled=true;
    setCurtainOpen(dy>0);
   }
  };
  const onUp=()=>{
   window.removeEventListener('pointermove',onMove);
   window.removeEventListener('pointerup',onUp);
   window.removeEventListener('pointercancel',onUp);
   if(!handled)setCurtainOpen(v=>!v);
  };
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  window.addEventListener('pointercancel',onUp);
 };

 // 启动 60fps 对角折线卷页动画（从起始进度 startU 平滑卷至目标进度 endU）
 const runCurlAnimation=useCallback((
  startU:number,
  endU:number,
  durationMs:number,
  w:number,
  h:number,
  onDone:()=>void,
  startPoint?:{x:number;y:number},
 )=>{
  if(flipRafRef.current!==null){
   cancelAnimationFrame(flipRafRef.current);
   flipRafRef.current=null;
  }
  const t0=performance.now();
  const step=(now:number)=>{
   const raw=durationMs<=0?1:Math.min(1,(now-t0)/durationMs);
   const eased=easePageCurl(raw);
   const u=startU+(endU-startU)*eased;
   let pt=curlPointForProgress(u,w,h);
   // 若从手势拖拽中途接管，首段平滑过渡到自然轨迹，避免跳变
   if(startPoint&&raw<0.35){
    const blend=raw/0.35;
    pt={
     x:startPoint.x*(1-blend)+pt.x*blend,
     y:startPoint.y*(1-blend)+pt.y*blend,
    };
   }
   setCurlGeom(computeCurlGeometry(pt.x,pt.y,w,h,u));
   if(raw<1){
    flipRafRef.current=requestAnimationFrame(step);
   }else{
    flipRafRef.current=null;
    onDone();
   }
  };
  flipRafRef.current=requestAnimationFrame(step);
 },[]);

 // 触发真实对角卷页物理动画并切换页码
 // next：当前页从右下角自然挑起，沿对角折痕向左平滑卷起，露出底层静态新页；
 // prev：旧页留在底层，目标上一页从左侧书脊平滑铺展卷回并轻柔贴平。
 const flipToPage=useCallback((targetIndex:number)=>{
  if(!activeBook)return;
  const clamped=Math.max(0,Math.min(activeBook.pages.length-1,targetIndex));
  if(clamped===pageIdx)return;
  const curPage=activeBook.pages[pageIdx];
  const nextPage=activeBook.pages[clamped];
  const dir:'next'|'prev'=clamped>pageIdx?'next':'prev';
  const rect=stage3dRef.current?.getBoundingClientRect();
  const w=rect?.width||820;
  const h=rect?.height||660;

  setSelection(null);
  setRightEdgeHover(false);
  const animId=++flipSeqRef.current;

  if(dir==='next'){
   setFlipAnim({
    id:animId,
    dir:'next',
    sheetTitle:curPage?.title??'',
    sheetContent:curPage?.content??'',
    sheetPageNo:pageIdx+1,
   });
   const p0=curlPointForProgress(0.01,w,h);
   setCurlGeom(computeCurlGeometry(p0.x,p0.y,w,h,0.01));
   setActiveBookAndPage(username,activeBook.id,clamped);
   runCurlAnimation(0.01,1,660,w,h,()=>{
    setFlipAnim(null);
    setCurlGeom(null);
   });
  }else{
   setFlipAnim({
    id:animId,
    dir:'prev',
    sheetTitle:nextPage?.title??'',
    sheetContent:nextPage?.content??'',
    sheetPageNo:clamped+1,
    underTitle:curPage?.title??'',
    underContent:curPage?.content??'',
    underPageNo:pageIdx+1,
   });
   const p0=curlPointForProgress(0.99,w,h);
   setCurlGeom(computeCurlGeometry(p0.x,p0.y,w,h,0.99));
   setActiveBookAndPage(username,activeBook.id,clamped);
   runCurlAnimation(0.99,0,660,w,h,()=>{
    setFlipAnim(null);
    setCurlGeom(null);
   });
  }
 },[activeBook,pageIdx,runCurlAnimation,username]);

 // 支持在右下角直接按住鼠标/手指真实拖拽揭开书页（拖过 20% 或轻点即翻页，否则弹回）
 const handleCornerPointerDown=(e:React.PointerEvent<HTMLButtonElement>)=>{
  if(!activeBook||!activePage)return;
  if(pageIdx>=activeBook.pages.length-1){
   // 最后一页点击书角直接新建下一页
   handleAddBlankPage();
   return;
  }
  const stageEl=stage3dRef.current;
  if(!stageEl)return;
  e.preventDefault();
  const rect=stageEl.getBoundingClientRect();
  const w=rect.width||820;
  const h=rect.height||660;
  if(flipRafRef.current!==null){
   cancelAnimationFrame(flipRafRef.current);
   flipRafRef.current=null;
  }
  setSelection(null);
  setRightEdgeHover(false);

  const targetIdx=pageIdx+1;
  dragStateRef.current={
   active:true,
   startX:e.clientX,
   startY:e.clientY,
   moved:false,
   w,
   h,
   lastU:0.04,
   lastPx:w-28,
   lastPy:h-18,
   targetIdx,
   curTitle:activePage.title,
   curContent:activePage.content,
   curPageNo:pageIdx+1,
  };

  // 立即切换底层显示下一页内容，顶层用当前页实时跟随手指卷起
  setFlipAnim({
   id:++flipSeqRef.current,
   dir:'next',
   sheetTitle:activePage.title,
   sheetContent:activePage.content,
   sheetPageNo:pageIdx+1,
  });
  setActiveBookAndPage(username,activeBook.id,targetIdx);
  const p0=curlPointForProgress(0.04,w,h);
  setCurlGeom(computeCurlGeometry(p0.x,p0.y,w,h,0.04));

  const onMove=(ev:PointerEvent)=>{
   const ds=dragStateRef.current;
   if(!ds||!ds.active)return;
   if(Math.hypot(ev.clientX-ds.startX,ev.clientY-ds.startY)>8)ds.moved=true;
   const lx=Math.max(-ds.w*0.98,Math.min(ds.w-6,ev.clientX-rect.left));
   const ly=Math.max(ds.h*0.18,Math.min(ds.h-4,ev.clientY-rect.top));
   const u=Math.max(0.02,Math.min(0.98,(ds.w-lx)/(ds.w*2)));
   ds.lastU=u;
   ds.lastPx=lx;
   ds.lastPy=ly;
   setCurlGeom(computeCurlGeometry(lx,ly,ds.w,ds.h,u));
  };

  const onUp=()=>{
   window.removeEventListener('pointermove',onMove);
   window.removeEventListener('pointerup',onUp);
   window.removeEventListener('pointercancel',onUp);
   const ds=dragStateRef.current;
   dragStateRef.current=null;
   if(!ds)return;
   const shouldComplete=!ds.moved||ds.lastU>=0.2;
   if(shouldComplete){
    const remainMs=Math.max(260,Math.round((1-ds.lastU)*640));
    runCurlAnimation(ds.lastU,1,remainMs,ds.w,ds.h,()=>{
     setFlipAnim(null);
     setCurlGeom(null);
    },{x:ds.lastPx,y:ds.lastPy});
   }else{
    // 拖得太浅：平滑回弹恢复当前页
    const backMs=Math.max(220,Math.round(ds.lastU*700));
    runCurlAnimation(ds.lastU,0,backMs,ds.w,ds.h,()=>{
     setActiveBookAndPage(username,activeBook.id,ds.curPageNo-1);
     setFlipAnim(null);
     setCurlGeom(null);
    },{x:ds.lastPx,y:ds.lastPy});
   }
  };

  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  window.addEventListener('pointercancel',onUp);
 };

 // 左右方向键仿真翻页（不在输入框聚焦时）、Ctrl/Cmd+Z 撤销后退、Ctrl/Cmd+Shift+Z 重做与 Esc 退出全屏
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'){
    e.preventDefault();
    if(e.shiftKey)handleRedo();
    else handleUndo();
    return;
   }
   if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='y'){
    e.preventDefault();
    handleRedo();
    return;
   }
   if(e.key==='Escape'&&confirmDialog){
    setConfirmDialog(null);
    return;
   }
   if(e.key==='Escape'&&isFullscreen){
    setIsFullscreen(false);
    if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
    return;
   }
   const t=e.target as HTMLElement|null;
   if(t?.closest('input,textarea,select'))return;
   if(e.key==='ArrowRight')flipToPage(pageIdx+1);
   else if(e.key==='ArrowLeft')flipToPage(pageIdx-1);
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[flipToPage,pageIdx,isFullscreen,confirmDialog,handleUndo,handleRedo]);

 // 全屏模式下锁定外层页面滚动
 useEffect(()=>{
  if(!isFullscreen)return;
  const prevOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{
   document.body.style.overflow=prevOverflow;
  };
 },[isFullscreen]);

 // 监听编辑器或阅读页内的选中文本，计算浮动工具栏坐标；
 // 在笔记阅读区使用 CSS Custom Highlight（或兼容矩形遮罩）接管选区后立即清除浏览器原生 Selection，防止 Edge 划词迷你菜单弹出遮挡
 const handleEditorSelect=()=>{
  const el=editorRef.current;
  if(!el||!activePage)return;
  const start=el.selectionStart??0,end=el.selectionEnd??0;
  const text=el.value.slice(start,end).trim();
  if(!text||text.length<1){
   setSelection(null);
   setShowCodeMenu(false);
   return;
  }
  const rect=el.getBoundingClientRect();
  setSelection({
   text:el.value.slice(start,end),
   start,
   end,
   x:window.innerWidth<520?window.innerWidth/2:Math.min(window.innerWidth-220,Math.max(200,rect.left+rect.width/2)),
   y:Math.max(72,rect.top+24),
   fromEditor:true,
  });
 };

 const captureReaderSelection=useCallback(()=>{
  if(editMode||!activePage)return;
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed||sel.rangeCount===0)return;
  const rawText=sel.toString();
  if(!rawText.trim()){
   setSelection(null);
   return;
  }
  const anchorNode=sel.anchorNode;
  const focusNode=sel.focusNode;
  const bodyEl=pageBodyRef.current;
  if(!bodyEl||((!anchorNode||!bodyEl.contains(anchorNode))&&(!focusNode||!bodyEl.contains(focusNode)))){
   return;
  }
  const range=sel.getRangeAt(0).cloneRange();
  const rect=range.getBoundingClientRect();
  const bodyRect=bodyEl.getBoundingClientRect();
  const hasNativeHighlight=setNoteSelectionHighlight(range);
  const rects=hasNativeHighlight
   ?undefined
   :Array.from(range.getClientRects())
    .filter(r=>r.width>1&&r.height>1)
    .map(r=>({
     left:r.left-bodyRect.left,
     top:r.top-bodyRect.top,
     width:r.width,
     height:r.height,
    }));

  // 清除浏览器原生 Selection，阻止 Edge 划词悬浮迷你菜单弹出（视觉高亮已由 CSS Highlight 接管）
  sel.removeAllRanges();

  const full=activePage.content;
  const trimmed=rawText.trim();
  const foundIdx=full.indexOf(rawText)>=0?full.indexOf(rawText):full.indexOf(trimmed);
  const start=foundIdx>=0?foundIdx:0;
  const end=foundIdx>=0?foundIdx+(full.indexOf(rawText)>=0?rawText.length:trimmed.length):0;
  setSelection({
   text:rawText,
   start,
   end,
   x:window.innerWidth<520?window.innerWidth/2:Math.min(window.innerWidth-220,Math.max(200,rect.left+rect.width/2)),
   y:Math.max(70,rect.top-10),
   fromEditor:false,
   rects,
  });
 },[activePage,editMode]);

 useEffect(()=>{
  const onDocPointerDown=(e:PointerEvent)=>{
   const target=e.target as HTMLElement|null;
   if(!target?.closest('.nb-picker-wrap')){
    setBookPickerOpen(false);
    setPagePickerOpen(false);
   }
   if(target?.closest('.nb-floating-toolbar'))return;
   if(pageBodyRef.current&&target&&pageBodyRef.current.contains(target)&&!editMode){
    readerSelectingRef.current=true;
   }else{
    readerSelectingRef.current=false;
   }
   setSelection(prev=>(prev&&!prev.fromEditor?null:prev));
   setShowCodeMenu(false);
  };
  const onDocPointerUp=()=>{
   if(!readerSelectingRef.current)return;
   readerSelectingRef.current=false;
   captureReaderSelection();
  };
  const onDocCopyKey=(e:KeyboardEvent)=>{
   if(!selection||selection.fromEditor)return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){
    e.preventDefault();
    void navigator.clipboard.writeText(selection.text).then(()=>{
     showNotice(L('已复制选中笔记','Copied selected text'));
    }).catch(()=>{});
   }
  };
  window.addEventListener('pointerdown',onDocPointerDown);
  window.addEventListener('pointerup',onDocPointerUp);
  window.addEventListener('keydown',onDocCopyKey);
  return()=>{
   window.removeEventListener('pointerdown',onDocPointerDown);
   window.removeEventListener('pointerup',onDocPointerUp);
   window.removeEventListener('keydown',onDocCopyKey);
  };
 },[captureReaderSelection,editMode,L,selection]);

 // 对当前选中文本（或光标处）应用排版操作：代码块、列表、加粗强调、斜体、高亮、引用、小标题
 const applyFormatting=(
  kind:'bold'|'italic'|'highlight'|'inline-code'|'code-block'|'ul'|'ol'|'todo'|'quote'|'heading',
  lang='python',
 )=>{
  if(!activeBook||!activePage)return;
  const full=activePage.content;
  let start=selection?.start??full.length;
  let end=selection?.end??full.length;
  let target=selection?.text??'';

  if(editMode&&editorRef.current){
   start=editorRef.current.selectionStart??start;
   end=editorRef.current.selectionEnd??end;
   target=full.slice(start,end);
  }else if(selection&&full.slice(start,end)!==selection.text){
   const idx=full.indexOf(selection.text.trim());
   if(idx>=0){
    start=idx;
    end=idx+selection.text.trim().length;
    target=full.slice(start,end);
   }
  }

  const sample=target||'重点内容';
  let replacement='';
  const lines=sample.split('\n');

  switch(kind){
   case 'bold':
    replacement=`**${sample.trim()}**`;
    break;
   case 'italic':
    replacement=`*${sample.trim()}*`;
    break;
   case 'highlight':
    replacement=`==${sample.trim()}==`;
    break;
   case 'inline-code':
    replacement=`\`${sample.trim()}\``;
    break;
   case 'code-block':
    replacement=`\n\`\`\`${lang}\n${target||'// 在此编写代码'}\n\`\`\`\n`;
    break;
   case 'ul':
    replacement=lines.map(l=>`- ${l.replace(/^[ \t]*([-*+]|\d+\.)[ \t]+/,'')}`).join('\n');
    break;
   case 'ol':
    replacement=lines.map((l,i)=>`${i+1}. ${l.replace(/^[ \t]*([-*+]|\d+\.)[ \t]+/,'')}`).join('\n');
    break;
   case 'todo':
    replacement=lines.map(l=>`- [ ] ${l.replace(/^[ \t]*[-*+][ \t]+(\[[ xX]\][ \t]+)?/,'')}`).join('\n');
    break;
   case 'quote':
    replacement=lines.map(l=>`> ${l.replace(/^[ \t]*>[ \t]?/,'')}`).join('\n');
    break;
   case 'heading':
    replacement=`### ${sample.replace(/^#+\s*/,'').trim()}`;
    break;
  }

  const nextContent=target
   ?full.slice(0,start)+replacement+full.slice(end)
   :(full.trim()?`${full.trimEnd()}\n\n${replacement}`:replacement.trim());

  commitPageChange({content:nextContent},true);
  setSelection(null);
  setShowCodeMenu(false);
  window.getSelection()?.removeAllRanges();
  showNotice(L('已应用排版格式','Formatting applied'));
 };

 // 在阅读模式下点击待办复选框直接切换完成状态
 const toggleTodoLine=(lineIdx:number)=>{
  if(!activeBook||!activePage)return;
  const lines=activePage.content.replace(/\r\n?/g,'\n').split('\n');
  const line=lines[lineIdx];
  if(!line)return;
  lines[lineIdx]=line.replace(/^([ \t]*[-*+][ \t]+\[)([ xX])(\][ \t]+)/,(_,a,mark,c)=>`${a}${mark.toLowerCase()==='x'?' ':'x'}${c}`);
  commitPageChange({content:lines.join('\n')},true);
 };

 // 启动内置 AI 辅助：规范化 / 精简 / 扩写举例 / 再让 AI 改 / 选中文本自由问答
 const triggerAiAction=async(mode:'normalize'|'concise'|'example'|'refine'|'ask',customQuestion?:string)=>{
  if(!activeBook||!activePage)return;
  const rawTarget=(selection?.text||aiTargetText||activePage.content).trim();
  if(!rawTarget){
   showNotice(L('请先在笔记中写一点内容或选中一段文字','Please select or write some text first'));
   return;
  }
  if(selection){
   setAiTargetText(selection.text);
   setAiRange({start:selection.start,end:selection.end});
  }else if(!aiTargetText){
   setAiTargetText(activePage.content);
   setAiRange({start:0,end:activePage.content.length});
  }

  setAiOpen(true);
  setAiError('');

  if(mode==='ask'&&!customQuestion?.trim()){
   setAiTaskTitle(L('选中文本 AI 问答','Ask AI About Selected Text'));
   return;
  }

  let promptText='';
  if(mode==='normalize'){
   setAiTaskTitle(L('✨ AI 规范化笔记','✨ AI Standardize Note'));
   promptText=`请帮我把下面这段学习笔记进行【规范化整理】。\n要求：\n1. 修正口语化或不够严谨的表述，使用准确的专业术语；\n2. 提炼出清晰的层级结构（使用小标题、要点列表、加粗关键词或简短代码块）；\n3. 保留核心知识点，直接输出规范化后的 Markdown 笔记正文（不要多余寒暄）：\n\n【待规范化原文】：\n${rawTarget}`;
  }else if(mode==='concise'){
   setAiTaskTitle(L('✂️ AI 精简与速记提炼','✂️ AI Condense & Key Points'));
   promptText=`请把下面这段较长的笔记【精简浓缩】为面试速记卡格式。\n要求：\n1. 用 3～5 条最精炼的要点概括核心结论；\n2. 附一句好记的“一句话总结 / 记忆口诀”；\n3. 直接输出 Markdown 正文：\n\n【待精简原文】：\n${rawTarget}`;
  }else if(mode==='example'){
   setAiTaskTitle(L('💡 AI 补充通俗解释与代码示例','💡 AI Explain with Example'));
   promptText=`请针对下面这段笔记内容，补充一个通俗易懂的原理解释和一段简短直观的代码示例（或对比案例），方便直接贴进笔记复习：\n\n【选中笔记内容】：\n${rawTarget}`;
  }else if(mode==='refine'){
   setAiTaskTitle(L('🔄 再让 AI 改写润色','🔄 AI Refine Note'));
   const extra=customQuestion?.trim()||'请换一种更清晰精炼、易于复习的方式重新润色这版笔记，保留关键知识点与代码，直接输出 Markdown 正文。';
   promptText=`原始笔记内容：\n${rawTarget}\n\n上一版润色结果：\n${aiOutput}\n\n请在此基础上继续修改润色：${extra}`;
  }else{
   setAiTaskTitle(L('🤖 选中文本 AI 问答','🤖 AI Q&A on Selection'));
   promptText=`我在这页笔记中选中了以下片段：\n"""\n${rawTarget}\n"""\n\n我的问题是：${customQuestion!.trim()}`;
  }

  aiAbortRef.current?.abort();
  const ctl=new AbortController();
  aiAbortRef.current=ctl;
  setAiBusy(true);
  setAiOutput('');
  setAiThink('');

  const context:TutorContext={
   kind:'lesson',
   lesson:{
    title:`笔记本《${activeBook.name}》 · ${activePage.title}`,
    body:activePage.content.slice(0,8000)||'（空白笔记页）',
    steps:[],
   },
  };

  const res=await streamNoteAi(
   context,
   [{role:'user',text:promptText}],
   text=>setAiOutput(text),
   think=>setAiThink(think),
   ctl.signal,
  );
  if(aiAbortRef.current===ctl)aiAbortRef.current=null;
  setAiBusy(false);
  if(res.ok){
   setAiRemaining(typeof res.remaining==='number'?res.remaining:null);
  }else if(!res.aborted){
   setAiError(res.message);
  }
 };

 // 将 AI 生成结果写回笔记（替换选中文本 / 插入到选中文本下方 / 追加到本页末尾）
 const applyAiResultToNote=(way:'replace'|'insert-below'|'append-end')=>{
  if(!activeBook||!activePage||!aiOutput.trim())return;
  const full=activePage.content;
  const cleanOut=aiOutput.trim();
  let nextContent=full;

  if(way==='append-end'){
   nextContent=full.trim()?`${full.trimEnd()}\n\n${cleanOut}`:cleanOut;
  }else{
   const target=aiTargetText.trim();
   let start=aiRange?.start??-1;
   let end=aiRange?.end??-1;
   if(start<0||end<=start||full.slice(start,end).trim()!==target){
    const idx=target?full.indexOf(target):-1;
    if(idx>=0){
     start=idx;
     end=idx+target.length;
    }
   }
   if(start>=0&&end>start){
    nextContent=way==='replace'
     ?`${full.slice(0,start)}${cleanOut}${full.slice(end)}`
     :`${full.slice(0,end)}\n\n${cleanOut}${full.slice(end)}`;
   }else{
    nextContent=full.trim()?`${full.trimEnd()}\n\n${cleanOut}`:cleanOut;
   }
  }

  commitPageChange({content:nextContent},true);
  setSelection(null);
  showNotice(
   way==='replace'
    ?L('已用 AI 规范化内容替换选中文本','Replaced selected text with AI output')
    :way==='insert-below'
    ?L('已插入到选中文本下方','Inserted below selection')
    :L('已追加到本页笔记末尾','Appended to end of page')
  );
 };

 // 计算当前可用的「返回题目 / 返回学习 / 返回面试 / 返回操场」入口
 const returnTarget=useMemo(()=>{
  if(urlBack){
   return {
    href:urlBack,
    label:urlBackLabel||L('刚才的位置','Previous page'),
    kind:urlBackKind||'quiz',
   };
  }
  if(activePage?.source?.href){
   return activePage.source;
  }
  if(storedReturn?.href){
   return storedReturn;
  }
  return null;
 },[activePage?.source,storedReturn,urlBack,urlBackKind,urlBackLabel,L]);

 const returnActionText=(kind?:NoteSourceKind)=>{
  if(kind==='quiz'||kind==='paper')return L('返回原题目','Back to Question');
  if(kind==='interview')return L('返回面试刷题','Back to Interview');
  if(kind==='playground')return L('返回代码操场','Back to Playground');
  return L('返回学习','Back to Learn');
 };

 const handleCreateBook=(e:React.FormEvent)=>{
  e.preventDefault();
  if(!newBookName.trim())return;
  createNotebook(username,{
   name:newBookName.trim(),
   icon:newBookIcon,
   cover:'auto',
   firstPageTitle:L('第 1 页 · 核心笔记','Page 1 · Core Notes'),
   firstPageContent:`### ${newBookName.trim()}\n\n`,
  });
  setNewBookName('');
  setCreatingBook(false);
  setMobileView('page');
  showNotice(L(`已创建笔记本《${newBookName.trim()}》`,`Created notebook “${newBookName.trim()}”`));
 };

 const handleAddBlankPage=()=>{
  if(!activeBook)return;
  const nextNo=activeBook.pages.length+1;
  const prevIdx=pageIdx;
  const curPage=activeBook.pages[prevIdx];
  const res=addNoteEntry(
   username,
   activeBook.id,
   {
    title:L(`第 ${nextNo} 页 · 新笔记`,`Page ${nextNo} · New Note`),
    content:'',
   },
   'new-page',
  );
  if(curPage&&res.pageIndex!==prevIdx){
   const rect=stage3dRef.current?.getBoundingClientRect();
   const w=rect?.width||820;
   const h=rect?.height||660;
   setRightEdgeHover(false);
   setFlipAnim({
    id:++flipSeqRef.current,
    dir:'next',
    sheetTitle:curPage.title,
    sheetContent:curPage.content,
    sheetPageNo:prevIdx+1,
   });
   const p0=curlPointForProgress(0.01,w,h);
   setCurlGeom(computeCurlGeometry(p0.x,p0.y,w,h,0.01));
   runCurlAnimation(0.01,1,660,w,h,()=>{
    setFlipAnim(null);
    setCurlGeom(null);
   });
  }
  setEditMode(true);
 };

 // 往回翻页（prev）期间，底层暂时保持旧页，直到翻回的上一页平缓落下
 const visibleTitle=flipAnim?.dir==='prev'&&flipAnim.underTitle!==undefined?flipAnim.underTitle:(activePage?.title??'');
 const visibleContent=flipAnim?.dir==='prev'&&flipAnim.underContent!==undefined?flipAnim.underContent:(activePage?.content??'');
 const visiblePageNo=flipAnim?.dir==='prev'&&flipAnim.underPageNo!==undefined?flipAnim.underPageNo:(pageIdx+1);
 const blocks=useMemo(()=>parseNoteMarkdown(visibleContent),[visibleContent]);

 return (
  <div className={'ai-shell nb-shell'+(isFullscreen?' is-fullscreen':'')}>
   {!isFullscreen&&<SiteHeader active="notes" username={username}/>}
   <main className="ai-main nb-main">
    {/* 顶部工具条：左侧书架收纳开关 + 内联学习来源回跳 */}
    <div className={'nb-top-row'+(!returnTarget?' no-return':'')}>
     <div className="nb-top-left">
      <button
       type="button"
       className={'nb-shelf-toggle'+(sidebarCollapsed?' is-collapsed':'')}
       onClick={()=>setNotesAppearance(username,{sidebarCollapsed:!sidebarCollapsed})}
       title={sidebarCollapsed?L('展开左侧笔记本列表与目录','Show notebooks sidebar'):L('收起左侧书架，获得更宽书写区','Collapse notebooks sidebar')}
      >
       {sidebarCollapsed?<PanelLeftOpen size={15}/>:<PanelLeftClose size={15}/>}
       <span>
        {sidebarCollapsed
         ?L(`展开书架（${books.length}本）`,`Show Shelf (${books.length})`)
         :L('收起书架','Hide Shelf')}
       </span>
      </button>
      {returnTarget&&(
       <a className="nb-return-inline" href={returnTarget.href} title={returnTarget.label}>
        <BookOpen size={13}/>
        <span className="nb-return-inline-label">{returnTarget.label}</span>
        <span className="nb-return-inline-go">
         <ArrowLeft size={13}/>
         <span>{returnActionText(returnTarget.kind)}</span>
        </span>
       </a>
      )}
     </div>
    </div>

    {noticeMsg&&(
     <div className="nb-toast" role="status">
      <Check size={15}/>
      <span>{noticeMsg}</span>
     </div>
    )}

    <div className={'nb-workspace'+(sidebarCollapsed?' collapsed':'')+' mobile-'+mobileView}>
     {/* 左侧：可收纳的多笔记本书架 + 自定义重命名 + 当前笔记本页目录（支持拖拽移本与页序调整） */}
     <aside className="ai-card nb-sidebar">
      <div className="nb-side-head">
       <strong>
        <BookText size={16}/>
        <span>{L(`笔记本（${books.length}）`,`Notebooks (${books.length})`)}</span>
       </strong>
       <div className="nb-side-head-acts">
        <button
         type="button"
         className="nb-add-book-btn"
         onClick={()=>setCreatingBook(v=>!v)}
        >
         <FolderPlus size={14}/>
         <span>{L('新建笔记本','New')}</span>
        </button>
        <button
         type="button"
         className="nb-icon-act"
         onClick={()=>setNotesAppearance(username,{sidebarCollapsed:true})}
         title={L('收纳书架','Collapse shelf')}
         aria-label={L('收纳书架','Collapse shelf')}
        >
         <PanelLeftClose size={15}/>
        </button>
       </div>
      </div>

      {creatingBook&&(
       <form className="nb-new-book-form" onSubmit={handleCreateBook}>
        <div className="nb-new-book-row">
         <select
          value={newBookIcon}
          onChange={e=>setNewBookIcon(e.target.value)}
          aria-label={L('图标','Icon')}
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
        <div className="nb-new-book-covers">
         <span className="nb-new-book-spacer"/>
         <button type="button" className="nb-mini-btn" onClick={()=>setCreatingBook(false)}>{L('取消','Cancel')}</button>
         <button type="submit" className="nb-mini-btn primary" disabled={!newBookName.trim()}>{L('创建','Create')}</button>
        </div>
       </form>
      )}

      {/* 笔记本列表（支持把下方笔记页拖拽到任意笔记本上完成跨本移动） */}
      <div className="nb-book-list">
       {books.map(b=>{
        const isCurrent=activeBook?.id===b.id;
        const isRenaming=renamingBookId===b.id;
        const isDropTarget=dragOverBookId===b.id&&dragPage?.bookId!==b.id;
        return (
         <div
          key={b.id}
          className={'nb-book-item cover-auto'+(isCurrent?' active':'')+(isDropTarget?' drag-over':'')}
          onDragOver={e=>{
           if(!dragPage||dragPage.bookId===b.id)return;
           e.preventDefault();
           e.dataTransfer.dropEffect='move';
           if(dragOverBookId!==b.id)setDragOverBookId(b.id);
          }}
          onDragLeave={()=>{
           setDragOverBookId(prev=>prev===b.id?null:prev);
          }}
          onDrop={e=>{
           e.preventDefault();
           setDragOverBookId(null);
           const src=dragPage;
           setDragPage(null);
           if(!src||src.bookId===b.id)return;
           const res=moveNotePageToBook(username,src.bookId,src.pageId,b.id,false);
           if(res.ok){
            showNotice(L(`已将笔记移至《${b.name}》`,`Moved note to “${b.name}”`));
           }
          }}
         >
          {isRenaming?(
           <form
            className="nb-rename-form"
            onSubmit={e=>{
             e.preventDefault();
             if(renameText.trim())renameNotebook(username,b.id,{name:renameText.trim()});
             setRenamingBookId(null);
            }}
           >
            <input
             value={renameText}
             onChange={e=>setRenameText(e.target.value)}
             maxLength={36}
             autoFocus
             onBlur={()=>{
              if(renameText.trim())renameNotebook(username,b.id,{name:renameText.trim()});
              setRenamingBookId(null);
             }}
            />
            <button type="submit" className="nb-icon-act" aria-label={L('保存名称','Save')}>
             <Check size={14}/>
            </button>
           </form>
          ):(
           <>
            <button
             type="button"
             className="nb-book-select"
             onClick={()=>{
              setSelection(null);
              setActiveBookAndPage(username,b.id);
              setMobileView('page');
             }}
             onDoubleClick={()=>{
              setRenamingBookId(b.id);
              setRenameText(b.name);
             }}
             title={L('点击打开，也可将下方笔记拖入此笔记本','Click to open, or drag a note page here')}
            >
             <span className="nb-book-spine"/>
             <span className="nb-book-icon">{b.icon}</span>
             <span className="nb-book-meta">
              <b>{b.name}</b>
              <small>{L(`${b.pages.length} 页`,`${b.pages.length}p`)}</small>
             </span>
             <ChevronRight size={15} className="nb-mobile-book-enter"/>
            </button>
            <div className="nb-book-actions">
             <button
              type="button"
              className="nb-icon-act"
              title={L('重命名','Rename')}
              onClick={()=>{
               setRenamingBookId(b.id);
               setRenameText(b.name);
              }}
             >
              <Pencil size={13}/>
             </button>
             <button
              type="button"
              className="nb-icon-act danger"
              title={L('删除笔记本','Delete')}
              onClick={()=>{
               setConfirmDialog({
                title:L('删除笔记本','Delete Notebook'),
                message:L(`确定删除笔记本《${b.name}》及其全部 ${b.pages.length} 页笔记吗？删除后将无法撤销。`,`Delete notebook “${b.name}” and all ${b.pages.length} pages? This cannot be undone.`),
                confirmLabel:L('确认删除','Delete'),
                onConfirm:()=>{
                 deleteNotebook(username,b.id);
                 showNotice(L(`已删除笔记本《${b.name}》`,`Deleted “${b.name}”`));
                },
               });
              }}
             >
              <Trash2 size={13}/>
             </button>
            </div>
           </>
          )}
         </div>
        );
       })}

       {!books.some(b=>b.id==='preset-guide')&&(
        <button
         type="button"
         className="nb-restore-guide"
         onClick={()=>restorePresetGuideNotebook(username)}
        >
         <RotateCcw size={13}/>
         <span>{L('恢复《操作指南》','Restore Guide')}</span>
        </button>
       )}
      </div>

      {/* 当前笔记本的页码目录（支持鼠标上下拖拽调整顺序，或直接拖到上方笔记本移本） */}
      {activeBook&&(
       <div className="nb-toc">
        <div className="nb-toc-head">
         <span>{L(`《${activeBook.name}》目录`,`Pages in “${activeBook.name}”`)}</span>
         <button type="button" className="nb-add-page-btn" onClick={handleAddBlankPage}>
          <FilePlus2 size={13}/>
          <span>{L('+ 新增一页','+ New Page')}</span>
         </button>
        </div>
        <ol className="nb-toc-list">
         {activeBook.pages.map((p,idx)=>{
          const isDragging=dragPage?.pageId===p.id;
          const isDropHere=dragOverPageIdx===idx&&dragPage?.bookId===activeBook.id&&dragPage?.pageIdx!==idx;
          return (
           <li
            key={p.id}
            onDragOver={e=>{
             if(!dragPage||dragPage.bookId!==activeBook.id)return;
             e.preventDefault();
             e.dataTransfer.dropEffect='move';
             if(dragOverPageIdx!==idx)setDragOverPageIdx(idx);
            }}
            onDragLeave={()=>{
             setDragOverPageIdx(prev=>prev===idx?null:prev);
            }}
            onDrop={e=>{
             e.preventDefault();
             setDragOverPageIdx(null);
             const src=dragPage;
             setDragPage(null);
             if(!src||src.bookId!==activeBook.id||src.pageIdx===idx)return;
             const res=reorderNotePageInBook(username,activeBook.id,src.pageId,idx);
             if(res.ok){
              showNotice(L(`已移至第 ${idx+1} 页`,`Moved to page ${idx+1}`));
             }
            }}
           >
            <button
             type="button"
             draggable
             onDragStart={e=>{
              const info={bookId:activeBook.id,pageId:p.id,pageIdx:idx};
              setDragPage(info);
              e.dataTransfer.effectAllowed='move';
              try{e.dataTransfer.setData('text/plain',JSON.stringify(info))}catch{}
             }}
             onDragEnd={()=>{
              setDragPage(null);
              setDragOverBookId(null);
              setDragOverPageIdx(null);
             }}
             className={'nb-toc-item'+(idx===pageIdx?' on':'')+(isDragging?' is-dragging':'')+(isDropHere?' drag-over':'')}
             onClick={()=>flipToPage(idx)}
             title={L('可拖动到其他页调整顺序，或拖到上方笔记本移本','Drag to reorder or drop onto a notebook above')}
            >
             <GripVertical size={12} className="nb-toc-grip"/>
             <span className="nb-toc-no">{String(idx+1).padStart(2,'0')}</span>
             <span className="nb-toc-title">{p.title||L(`第 ${idx+1} 页`,`Page ${idx+1}`)}</span>
            </button>
           </li>
          );
         })}
        </ol>
       </div>
      )}
     </aside>

     {/* 右侧：仿真笔记本主体（统一跟随系统主题配色与空白纸张） */}
     <section className="nb-stage-wrap">
      {!activeBook||!activePage?(
       <div className="ai-card nb-empty-books">
        <BookText size={42}/>
        <h2>{L('当前还没有任何笔记本','No notebooks yet')}</h2>
        <div className="nb-empty-actions">
         <button type="button" className="button primary" onClick={()=>setCreatingBook(true)}>
          <Plus size={16}/>
          <span>{L('新建笔记本','Create Notebook')}</span>
         </button>
         <button type="button" className="button secondary" onClick={()=>restorePresetGuideNotebook(username)}>
          <RotateCcw size={16}/>
          <span>{L('恢复《操作指南》','Restore Guide')}</span>
         </button>
        </div>
       </div>
      ):(
       <div className={'nb-book-stage-outer'+(isFullscreen?' is-fullscreen':'')}>
        <div
         className={'nb-book-frame cover-auto paper-auto ruling-plain'+(rightEdgeHover?' right-peel':'')}
        >
        {/* 左侧底色边（装订脊与金属活页环）：直接点击左侧底色边翻到上一页 */}
        <button
         type="button"
         className="nb-cover-edge prev"
         disabled={pageIdx<=0}
         onClick={()=>flipToPage(pageIdx-1)}
         title={pageIdx<=0?L('已是第一页','Already on first page'):L(`上一页（第 ${pageIdx} 页）`,`Previous page (${pageIdx})`)}
         aria-label={L('上一页','Previous Page')}
        >
         <span className="nb-edge-cue" aria-hidden="true">
          <ChevronLeft size={18}/>
         </span>
         <div className="nb-rings" aria-hidden="true">
          <span/><span/><span/><span/><span/><span/>
         </div>
        </button>

        {/* 中央真实物理卷页舞台（实时计算对角折痕与纸背曲率） */}
        <div
         ref={stage3dRef}
         className={'nb-stage-3d'+(flipAnim?` is-flipping dir-${flipAnim.dir}`:'')}
        >
        {/* 底层静态书页 */}
        <div className="nb-page-stage">
         {/* 顶部工具栏与排版条：全屏模式下化为可拉上/拉下的窗帘抽屉 */}
         <div className={'nb-curtain-shell'+(isFullscreen?(curtainOpen?' is-curtain open':' is-curtain closed'):'')}>
          <div className="nb-curtain-clip">
           <div className="nb-curtain-inner">
            {/* 书页顶部工具栏：返回书架、点击笔记本名称切换所属笔记本、点击页码调整页序、后退、阅读/编辑、AI 与全屏 */}
            <header className="nb-page-header">
             <div className="nb-header-left">
              <button
               type="button"
               className="nb-mobile-back-btn"
               onClick={()=>setMobileView('shelf')}
               title={L('返回书架','Back to shelf')}
              >
               <ArrowLeft size={13}/>
               <span>{L('书架','Shelf')}</span>
              </button>

              <div className="nb-picker-wrap">
               <button
                type="button"
                className={'nb-book-badge is-btn'+(bookPickerOpen?' on':'')}
                onClick={()=>{
                 setBookPickerOpen(v=>!v);
                 setPagePickerOpen(false);
                }}
                title={L('点击将本页笔记移动到其他笔记本','Move this note to another notebook')}
               >
                <span>{activeBook.icon}</span>
                <b>{activeBook.name}</b>
                <ChevronDown size={12}/>
               </button>
               {bookPickerOpen&&(
                <div className="nb-move-popover" role="dialog" aria-label={L('移动到其他笔记本','Move to notebook')}>
                 <div className="nb-cp-head">
                  <span>{L('移至其他笔记本','Move to notebook')}</span>
                  <button type="button" className="nb-cp-close" onClick={()=>setBookPickerOpen(false)} aria-label={L('关闭','Close')}>
                   <X size={13}/>
                  </button>
                 </div>
                 {books.filter(b=>b.id!==activeBook.id).length===0?(
                  <p className="nb-move-empty">{L('暂无其他笔记本','No other notebooks')}</p>
                 ):(
                  <div className="nb-move-book-list">
                   {books.filter(b=>b.id!==activeBook.id).map(b=>(
                    <button
                     key={b.id}
                     type="button"
                     className="nb-move-book-opt"
                     onClick={()=>{
                      const res=moveNotePageToBook(username,activeBook.id,activePage.id,b.id,true);
                      setBookPickerOpen(false);
                      if(res.ok){
                       showNotice(L(`已移至《${b.name}》`,`Moved to “${b.name}”`));
                      }
                     }}
                    >
                     <span>{b.icon}</span>
                     <b>{b.name}</b>
                     <small>{L(`${b.pages.length}页`,`${b.pages.length}p`)}</small>
                    </button>
                   ))}
                  </div>
                 )}
                </div>
               )}
              </div>

              <div className="nb-picker-wrap">
               <button
                type="button"
                className={'nb-page-indicator is-btn'+(pagePickerOpen?' on':'')}
                draggable
                onDragStart={e=>{
                 const info={bookId:activeBook.id,pageId:activePage.id,pageIdx};
                 setDragPage(info);
                 e.dataTransfer.effectAllowed='move';
                 try{e.dataTransfer.setData('text/plain',JSON.stringify(info))}catch{}
                }}
                onDragEnd={()=>{
                 setDragPage(null);
                 setDragOverBookId(null);
                 setDragOverPageIdx(null);
                }}
                onClick={()=>{
                 setPagePickerOpen(v=>!v);
                 setBookPickerOpen(false);
                 setTargetPageInput(String(pageIdx+1));
                 setPageMoveErr('');
                }}
                title={L('点击更改本页页码位置（也可拖拽到左侧笔记本）','Click to change page number')}
               >
                <span>{L(`${pageIdx+1}/${activeBook.pages.length}页`,`${pageIdx+1}/${activeBook.pages.length}`)}</span>
                <ChevronDown size={11}/>
               </button>
               {pagePickerOpen&&(
                <div className="nb-move-popover align-right" role="dialog" aria-label={L('更改页码位置','Change page number')}>
                 <div className="nb-cp-head">
                  <span>{L(`更改页码（1 ~ ${activeBook.pages.length}）`,`Page (1–${activeBook.pages.length})`)}</span>
                  <button type="button" className="nb-cp-close" onClick={()=>setPagePickerOpen(false)} aria-label={L('关闭','Close')}>
                   <X size={13}/>
                  </button>
                 </div>
                 <form
                  className="nb-page-move-form"
                  onSubmit={e=>{
                   e.preventDefault();
                   const total=activeBook.pages.length;
                   const raw=targetPageInput.trim();
                   const num=Number(raw);
                   if(!raw||!Number.isInteger(num)||num<1||num>total){
                    setPageMoveErr(L(`页码不存在（仅限 1 ~ ${total}）`,`Page must be 1–${total}`));
                    return;
                   }
                   setPageMoveErr('');
                   setPagePickerOpen(false);
                   if(num-1===pageIdx)return;
                   const res=reorderNotePageInBook(username,activeBook.id,activePage.id,num-1);
                   if(res.ok){
                    showNotice(L(`已移至第 ${num} 页`,`Moved to page ${num}`));
                   }
                  }}
                 >
                  <input
                   type="number"
                   min={1}
                   max={activeBook.pages.length}
                   value={targetPageInput}
                   onChange={e=>{setTargetPageInput(e.target.value);setPageMoveErr('')}}
                   placeholder={`1-${activeBook.pages.length}`}
                   aria-label={L('目标页码','Target page')}
                  />
                  <button type="submit" className="nb-mini-btn primary">
                   {L('更换','Move')}
                  </button>
                 </form>
                 {pageMoveErr&&<p className="nb-move-err">{pageMoveErr}</p>}
                 {activeBook.pages.length>1&&(
                  <div className="nb-page-num-chips">
                   {activeBook.pages.map((p,idx)=>(
                    <button
                     key={p.id}
                     type="button"
                     className={'nb-page-num-chip'+(idx===pageIdx?' on':'')}
                     onClick={()=>{
                      setPageMoveErr('');
                      setPagePickerOpen(false);
                      if(idx===pageIdx)return;
                      const res=reorderNotePageInBook(username,activeBook.id,activePage.id,idx);
                      if(res.ok){
                       showNotice(L(`已移至第 ${idx+1} 页`,`Moved to page ${idx+1}`));
                      }
                     }}
                    >
                     {idx+1}
                    </button>
                   ))}
                  </div>
                 )}
                </div>
               )}
              </div>

              {isFullscreen&&activePage.source?.href&&(
               <a className="nb-source-chip" href={activePage.source.href} title={activePage.source.label}>
                <ArrowLeft size={12}/>
                <span>{L('来源','Source')}</span>
               </a>
              )}
             </div>

             <div className="nb-header-right">
              <button
               type="button"
               className="nb-mode-btn nb-undo-btn"
               disabled={!canUndo}
               onClick={handleUndo}
               title={L('后退 / 撤销 (Ctrl+Z)','Undo (Ctrl+Z)')}
               aria-label={L('后退','Undo')}
              >
               <Undo2 size={14}/>
              </button>
              <button
               type="button"
               className="nb-mode-btn nb-undo-btn"
               disabled={!canRedo}
               onClick={handleRedo}
               title={L('重做 (Ctrl+Shift+Z)','Redo (Ctrl+Shift+Z)')}
               aria-label={L('重做','Redo')}
              >
               <Redo2 size={14}/>
              </button>
              <button
               type="button"
               className={'nb-mode-btn'+(editMode?'':' on')}
               onClick={()=>{setEditMode(false);setSelection(null)}}
               title={L('阅读模式','Read mode')}
              >
               <Eye size={13}/>
               <span>{L('阅读','Read')}</span>
              </button>
              <button
               type="button"
               className={'nb-mode-btn'+(editMode?' on':'')}
               onClick={()=>{setEditMode(true);setSelection(null)}}
               title={L('编辑模式','Edit mode')}
              >
               <Edit3 size={13}/>
               <span>{L('编辑','Edit')}</span>
              </button>
              <button
               type="button"
               className={'nb-mode-btn nb-mobile-fmt-btn'+(mobileFormatOpen||editMode?' on':'')}
               onClick={()=>setMobileFormatOpen(v=>!v)}
               title={L('展开或收起排版栏','Toggle formatting bar')}
              >
               <Bold size={13}/>
               <span>{L('排版','Format')}</span>
              </button>
              <button
               type="button"
               className="nb-ai-top-btn"
               onClick={()=>void triggerAiAction('normalize')}
               title={L('AI 规范化润色','AI Polish')}
              >
               <Wand2 size={13}/>
               <span>{L('润色','Polish')}</span>
              </button>
              <button
               type="button"
               className="nb-ai-top-btn ask"
               onClick={()=>{
                setAiTargetText(selection?.text||activePage.content);
                setAiRange(selection?{start:selection.start,end:selection.end}:{start:0,end:activePage.content.length});
                setAiTaskTitle(L('🤖 笔记 AI 问答','🤖 Note AI Q&A'));
                setAiOpen(v=>!v);
               }}
              >
               <Bot size={13}/>
               <span>{L('问答','Q&A')}</span>
              </button>
              <button
               type="button"
               className={'nb-mode-btn nb-fs-btn'+(isFullscreen?' on':'')}
               onClick={toggleFullscreen}
               title={isFullscreen?L('退出全屏 (Esc)','Exit fullscreen (Esc)'):L('全屏','Fullscreen')}
               aria-label={isFullscreen?L('退出全屏','Exit Fullscreen'):L('全屏','Fullscreen')}
              >
               {isFullscreen?<Minimize size={13}/>:<Maximize2 size={13}/>}
               <span className="nb-fs-lbl">{isFullscreen?L('退出','Exit'):L('全屏','Full')}</span>
              </button>
              <button
               type="button"
               className="nb-page-del"
               onClick={()=>{
                setConfirmDialog({
                 title:L('删除当前笔记页','Delete Page'),
                 message:L(`确定删除本页「${activePage.title||L(`第 ${pageIdx+1} 页`,`Page ${pageIdx+1}`)}」吗？`,`Delete page “${activePage.title}”?`),
                 confirmLabel:L('确认删除','Delete'),
                 onConfirm:()=>{
                  deleteNotePage(username,activeBook.id,activePage.id);
                  showNotice(L('已删除该笔记页','Page deleted'));
                 },
                });
               }}
               title={L('删除当前页','Delete this page')}
              >
               <Trash2 size={13}/>
              </button>
             </div>
            </header>

            {/* 快捷排版工具条（移动端默认收起，编辑模式或点击「排版」展开并单行横向滑动） */}
            <div className={'nb-format-strip'+(mobileFormatOpen||editMode?' mobile-open':'')} role="toolbar" aria-label={L('笔记排版工具栏','Note formatting toolbar')}>
             <button type="button" onClick={()=>applyFormatting('bold')} title={L('加粗','Bold')}>
              <Bold size={13}/><span>{L('加粗','Bold')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('highlight')} title={L('高亮','Highlight')}>
              <Highlighter size={13}/><span>{L('高亮','Mark')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('inline-code')} title={L('行内代码','Inline code')}>
              <Code size={13}/><span>{L('代码','Code')}</span>
             </button>
             <div className="nb-code-insert-group">
              <button type="button" onClick={()=>applyFormatting('code-block',codeLangPick)} title={L('插入代码块','Code block')}>
               <Code2 size={13}/><span>{L('代码块','Block')}</span>
              </button>
              <select
               value={codeLangPick}
               onChange={e=>setCodeLangPick(e.target.value)}
               aria-label={L('代码块语言','Code language')}
              >
               <option value="python">Python</option>
               <option value="rust">Rust</option>
               <option value="go">Go</option>
               <option value="java">Java</option>
               <option value="ts">JS/TS</option>
               <option value="sql">SQL</option>
              </select>
             </div>
             <button type="button" onClick={()=>applyFormatting('ul')} title={L('无序列表','Bullet list')}>
              <List size={13}/><span>{L('列表','List')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('ol')} title={L('有序列表','Numbered list')}>
              <ListOrdered size={13}/><span>{L('编号','Num')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('todo')} title={L('待办清单','Checklist')}>
              <CheckSquare size={13}/><span>{L('待办','Todo')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('quote')} title={L('引用','Quote')}>
              <Quote size={13}/><span>{L('引用','Quote')}</span>
             </button>
             <button type="button" onClick={()=>applyFormatting('heading')} title={L('小标题','Heading')}>
              <Heading3 size={13}/><span>{L('标题','H3')}</span>
             </button>
            </div>
           </div>
          </div>

          {isFullscreen&&(
           <div className="nb-curtain-pull-row">
            <button
             type="button"
             className="nb-curtain-handle"
             onPointerDown={handleCurtainPointerDown}
             aria-expanded={curtainOpen}
             title={curtainOpen?L('点击或上拉收起顶部工具栏','Click or pull up to hide toolbar'):L('点击或下拉展开顶部工具栏','Click or pull down to show toolbar')}
            >
             <span className="nb-curtain-grip" aria-hidden="true"/>
             {curtainOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
             <span>{curtainOpen?L('拉上收起','Pull Up'):L('拉下工具栏','Pull Down')}</span>
            </button>
            {!curtainOpen&&(
             <button
              type="button"
              className="nb-curtain-exit"
              onClick={toggleFullscreen}
              title={L('退出全屏 (Esc)','Exit fullscreen (Esc)')}
             >
              <Minimize size={13}/>
              <span>{L('退出全屏','Exit')}</span>
             </button>
            )}
           </div>
          )}
         </div>

         {/* 书页标题输入行 */}
         <div className="nb-page-title-row">
          <input
           className="nb-page-title-input"
           value={visibleTitle}
           onChange={e=>commitPageChange({title:e.target.value},false)}
           placeholder={L('输入这一页笔记的标题…','Page title…')}
           maxLength={90}
          />
         </div>

         {/* 书页正文区域 */}
         <div
          ref={pageBodyRef}
          className="nb-page-body"
          onPointerUpCapture={captureReaderSelection}
          onMouseUp={captureReaderSelection}
          onDoubleClick={captureReaderSelection}
          onKeyUp={captureReaderSelection}
          onContextMenu={e=>{if(!editMode)e.preventDefault();}}
         >
          {/* 兼容不支持 CSS Highlight API 的浏览器的选区高亮叠层 */}
          {!editMode&&selection?.rects?.length?(
           <div className="nb-sel-overlay" aria-hidden="true">
            {selection.rects.map((r,ri)=>(
             <span
              key={ri}
              className="nb-sel-rect"
              style={{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`}}
             />
            ))}
           </div>
          ):null}
          {editMode?(
           <textarea
            ref={editorRef}
            className="nb-page-editor"
            value={activePage.content}
            onChange={e=>commitPageChange({content:e.target.value},false)}
            onSelect={handleEditorSelect}
            onMouseUp={handleEditorSelect}
            onKeyUp={handleEditorSelect}
            placeholder={L('输入笔记内容（支持 Markdown）…','Write your notes (Markdown)…')}
            rows={18}
           />
          ):(
           <div className="nb-page-rendered">
            {blocks.length===0?(
             <div className="nb-page-placeholder" onClick={()=>setEditMode(true)}>
              <p>{L('点击输入笔记…','Tap to write…')}</p>
             </div>
            ):(
             blocks.map((b,bi)=>{
              if(b.kind==='code'){
               return <NoteCodeCard key={bi} lang={b.lang} code={b.code} pageTitle={activePage.title} bookId={activeBook.id} pageNo={pageIdx+1}/>;
              }
              if(b.kind==='hr')return <hr key={bi} className="nb-hr"/>;
              if(b.kind==='heading'){
               return b.level<=2
                ?<h2 key={bi} className="nb-h2">{renderInlineMd(b.text)}</h2>
                :<h3 key={bi} className="nb-h3">{renderInlineMd(b.text)}</h3>;
              }
              if(b.kind==='quote'){
               return (
                <blockquote key={bi} className="nb-quote">
                 {b.lines.map((ql,qi)=><p key={qi}>{renderInlineMd(ql)}</p>)}
                </blockquote>
               );
              }
              if(b.kind==='ul'){
               return (
                <ul key={bi} className="nb-list">
                 {b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}
                </ul>
               );
              }
              if(b.kind==='ol'){
               return (
                <ol key={bi} className="nb-list">
                 {b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}
                </ol>
               );
              }
              if(b.kind==='todo'){
               return (
                <ul key={bi} className="nb-todo-list">
                 {b.items.map((it,ii)=>(
                  <li key={ii} className={it.done?'done':''}>
                   <label>
                    <input
                     type="checkbox"
                     checked={it.done}
                     onChange={()=>toggleTodoLine(it.lineIdx)}
                    />
                    <span>{renderInlineMd(it.text)}</span>
                   </label>
                  </li>
                 ))}
                </ul>
               );
              }
              return <p key={bi} className="nb-p">{renderInlineMd(b.text)}</p>;
             })
            )}
           </div>
          )}

          {/* 内置 AI 辅助面板（规范化 / 精简 / 选中文本 AI 问答） */}
          {aiOpen&&(
           <div className="nb-ai-drawer" role="region" aria-label={L('AI 笔记助手','AI Note Assistant')}>
            <div className="nb-ai-head">
             <div className="nb-ai-title">
              <Sparkles size={16}/>
              <strong>{aiTaskTitle||L('内置 AI 笔记助手','Built-in AI Note Assistant')}</strong>
              {aiTargetText&&(
               <span className="nb-ai-sel-badge" title={aiTargetText}>
                {L(`针对选中片段（${aiTargetText.length} 字）`,`Selection (${aiTargetText.length} chars)`)}
               </span>
              )}
             </div>
             <div className="nb-ai-quick-btns">
              <button type="button" disabled={aiBusy} onClick={()=>void triggerAiAction('normalize')}>
               <Wand2 size={13}/><span>{L('规范化表述','Standardize')}</span>
              </button>
              <button type="button" disabled={aiBusy} onClick={()=>void triggerAiAction('concise')}>
               <Minimize2 size={13}/><span>{L('浓缩速记','Condense')}</span>
              </button>
              <button type="button" disabled={aiBusy} onClick={()=>void triggerAiAction('example')}>
               <Sparkles size={13}/><span>{L('补例子/代码','Add Example')}</span>
              </button>
              <button type="button" className="nb-ai-close" onClick={()=>{aiAbortRef.current?.abort();setAiOpen(false)}}>
               <X size={16}/>
              </button>
             </div>
            </div>

            {aiTargetText&&(
             <div className="nb-ai-quote">
              <span>{L('选中文本：','Selected: ')}</span>
              <em>“{aiTargetText.length>140?aiTargetText.slice(0,140)+'…':aiTargetText}”</em>
             </div>
            )}

            <form
             className="nb-ai-ask-row"
             onSubmit={e=>{
              e.preventDefault();
              if(!aiPrompt.trim()||aiBusy)return;
              void triggerAiAction('ask',aiPrompt);
             }}
            >
             <input
              value={aiPrompt}
              onChange={e=>setAiPrompt(e.target.value)}
              placeholder={L('针对这段选中文本提问，如：帮我改成规范的面试回答 / 为什么这里不能用 clone？','Ask AI about the selected text…')}
              disabled={aiBusy}
             />
             <button type="submit" className="button primary" disabled={aiBusy||!aiPrompt.trim()}>
              <Send size={14}/>
              <span>{aiBusy?L('思考中…','Thinking…'):L('问 AI','Ask')}</span>
             </button>
            </form>

            {aiThink&&(
             <details className="nb-ai-think">
              <summary>{L('查看 AI 思考过程','View AI thinking process')}</summary>
              <pre>{aiThink}</pre>
             </details>
            )}

            {aiError&&<p className="ai-grade-error" style={{margin:'4px 0'}}>{aiError}</p>}

            {(aiOutput||aiBusy)&&(
             <div className="nb-ai-result">
              <div className="nb-ai-output">
               {aiOutput?parseNoteMarkdown(aiOutput).map((b,bi)=>{
                if(b.kind==='code')return <pre key={bi} className="nb-ai-code"><code>{b.code}</code></pre>;
                if(b.kind==='ul')return <ul key={bi}>{b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}</ul>;
                if(b.kind==='ol')return <ol key={bi}>{b.items.map((it,ii)=><li key={ii}>{renderInlineMd(it)}</li>)}</ol>;
                if(b.kind==='heading')return <h4 key={bi}>{renderInlineMd(b.text)}</h4>;
                if(b.kind==='quote')return <blockquote key={bi}>{b.lines.map((l,li)=><p key={li}>{renderInlineMd(l)}</p>)}</blockquote>;
                if(b.kind==='p')return <p key={bi}>{renderInlineMd(b.text)}</p>;
                return null;
               }):<p className="muted">{L('AI 正在为你整理规范笔记…','AI is drafting your note…')}</p>}
              </div>

              {!aiBusy&&aiOutput&&(
               <div className="nb-ai-apply-bar">
                <button type="button" className="button primary" onClick={()=>applyAiResultToNote('replace')}>
                 <Check size={14}/>
                 <span>{L('替换选中文本','Replace Selection')}</span>
                </button>
                <button type="button" className="button secondary" onClick={()=>applyAiResultToNote('insert-below')}>
                 <Plus size={14}/>
                 <span>{L('插入到选中文本下方','Insert Below Selection')}</span>
                </button>
                <button type="button" className="button secondary" onClick={()=>applyAiResultToNote('append-end')}>
                 <FilePlus2 size={14}/>
                 <span>{L('追加到本页末尾','Append to Page')}</span>
                </button>
                <button type="button" className="button secondary" onClick={()=>{void triggerAiAction('refine',aiPrompt);setAiPrompt('')}}>
                 <RotateCcw size={14}/>
                 <span>{L('再让 AI 改','Refine')}</span>
                </button>
                <button type="button" className="button secondary" onClick={()=>{aiAbortRef.current?.abort();setAiOutput('');setAiThink('');setAiRemaining(null);setAiError('');setAiOpen(false)}}>
                 <X size={14}/>
                 <span>{L('取消','Cancel')}</span>
                </button>
                {aiRemaining!==null&&<small className="muted" style={{marginLeft:'auto'}}>{L(`今日还剩 ${aiRemaining} 次`,`${aiRemaining} left today`)}</small>}
               </div>
              )}
             </div>
            )}
           </div>
          )}
         </div>

         {/* 书页底部页码与右下角仿真卷角（翻页可直接点左右底色边或卷角） */}
         <footer className="nb-page-footer">
          <div className="nb-footer-hint"/>

          <div className="nb-footer-center">
           <span className="nb-page-num">
            — {visiblePageNo} / {activeBook.pages.length} —
           </span>
           <div className="nb-page-dots">
            {activeBook.pages.map((p,idx)=>(
             <button
              key={p.id}
              type="button"
              className={idx===pageIdx?'on':''}
              onClick={()=>flipToPage(idx)}
              title={p.title}
              aria-label={L(`第 ${idx+1} 页`,`Page ${idx+1}`)}
             />
            ))}
           </div>
          </div>

          <div className="nb-footer-right">
           {pageIdx>=activeBook.pages.length-1&&(
            <button
             type="button"
             className="nb-add-page-btn"
             onClick={handleAddBlankPage}
             title={L('新建下一页','Create next page')}
            >
             <Plus size={13}/>
             <span>{L('新建下一页','New Page')}</span>
            </button>
           )}
          </div>

          {/* 右下角仿真书页卷角（悬停卷起，按住可拖拽实时揭页，轻点触发丝滑卷页） */}
          <button
           type="button"
           className="nb-page-curl"
           onPointerDown={handleCornerPointerDown}
           onMouseEnter={()=>setRightEdgeHover(true)}
           onMouseLeave={()=>setRightEdgeHover(false)}
           title={pageIdx<activeBook.pages.length-1?L('点击或按住拖拽书角翻到下一页','Click or drag corner to flip'):L('点击书角新建下一页','Add a new page')}
           aria-label={L('仿真翻页书角','Page curl')}
          >
           <span className="nb-curl-flap"/>
          </button>
         </footer>
        </div>

        {/* 真实对角卷页物理合成层（60fps rAF 精确几何折痕 + 圆柱面曲率高光 + 实时投影 + 微透纸背） */}
        {flipAnim&&curlGeom&&(
         <div className="nb-curl-stage" aria-hidden="true">
          {/* 1. 投射在底层已揭开新页上的软折痕阴影（沿折痕法线向右柔和扩散） */}
          <div className="nb-curl-under-shadow-clip">
           <div
            className="nb-curl-under-shadow-band"
            style={{
             width:`${(curlGeom.curlDepth*1.45).toFixed(1)}px`,
             opacity:curlGeom.shadowOpacity,
             transform:`translate(${curlGeom.midX.toFixed(1)}px, ${curlGeom.midY.toFixed(1)}px) rotate(${curlGeom.angleDeg.toFixed(2)}deg)`,
            }}
           />
          </div>

          {/* 2. 尚未翻过去的纸张正面（按精确半平面多边形裁剪，右边无缝露出底层新页） */}
          <div
           className="nb-curl-front"
           style={{clipPath:curlGeom.frontClip}}
          >
           <div className="nb-sheet-header">
            <span className="nb-book-badge">
             <span>{activeBook.icon}</span>
             <b>{activeBook.name}</b>
            </span>
            <span className="nb-page-indicator">
             {L(`第 ${flipAnim.sheetPageNo} / ${activeBook.pages.length} 页`,`Page ${flipAnim.sheetPageNo} of ${activeBook.pages.length}`)}
            </span>
           </div>
           <div className="nb-sheet-strip"/>
           <div className="nb-sheet-title">{flipAnim.sheetTitle||L(`第 ${flipAnim.sheetPageNo} 页`,`Page ${flipAnim.sheetPageNo}`)}</div>
           <div className="nb-sheet-body">
            <NoteStaticPreview content={flipAnim.sheetContent}/>
           </div>
           <div className="nb-sheet-footer">
            — {flipAnim.sheetPageNo} / {activeBook.pages.length} —
           </div>
           {/* 折起纸背压在正面残余页上的内侧柔影 */}
           <div
            className="nb-curl-front-inner-shadow"
            style={{
             width:`${(curlGeom.curlDepth*0.95).toFixed(1)}px`,
             opacity:curlGeom.shadowOpacity*0.85,
             transform:`translate(${curlGeom.midX.toFixed(1)}px, ${curlGeom.midY.toFixed(1)}px) rotate(${curlGeom.angleDeg.toFixed(2)}deg) translateX(-100%)`,
            }}
           />
          </div>

          {/* 3. 卷起翻折过来的纸张背面（通过严格二维刚体反射矩阵贴合折痕，自带真实轮廓 drop-shadow 与弧面高光） */}
          <div
           className="nb-curl-back-wrap"
           style={{
            transform:curlGeom.backMatrix,
            opacity:curlGeom.flapOpacity,
           }}
          >
           <div
            className="nb-curl-back-sheet"
            style={{clipPath:curlGeom.backClip}}
           >
            <div className="nb-curl-back-ghost">
             <div className="nb-sheet-header">
              <span className="nb-book-badge">
               <span>{activeBook.icon}</span>
               <b>{activeBook.name}</b>
              </span>
              <span className="nb-page-indicator">
               {L(`第 ${flipAnim.sheetPageNo} / ${activeBook.pages.length} 页`,`Page ${flipAnim.sheetPageNo} of ${activeBook.pages.length}`)}
              </span>
             </div>
             <div className="nb-sheet-strip"/>
             <div className="nb-sheet-title">{flipAnim.sheetTitle}</div>
             <div className="nb-sheet-body">
              <NoteStaticPreview content={flipAnim.sheetContent}/>
             </div>
            </div>
            {/* 圆柱面弯曲高光脊与折痕暗槽 */}
            <div
             className="nb-curl-back-light"
             style={{
              width:`${(curlGeom.curlDepth*2.35).toFixed(1)}px`,
              transform:`translate(${curlGeom.midX.toFixed(1)}px, ${curlGeom.midY.toFixed(1)}px) rotate(${curlGeom.angleDeg.toFixed(2)}deg)`,
             }}
            />
           </div>
          </div>
         </div>
        )}
        </div>

        {/* 右侧底色边（多层书页切口 + 右侧封面底色边）：点击即可翻到下一页（末页新建下一页） */}
        <button
         type="button"
         className={'nb-cover-edge next'+(pageIdx>=activeBook.pages.length-1?' add':'')}
         onClick={()=>pageIdx<activeBook.pages.length-1?flipToPage(pageIdx+1):handleAddBlankPage()}
         onMouseEnter={()=>setRightEdgeHover(true)}
         onMouseLeave={()=>setRightEdgeHover(false)}
         title={pageIdx<activeBook.pages.length-1
          ?L(`点击右侧底色边翻到下一页（第 ${pageIdx+2} 页）`,`Click right cover edge for next page (${pageIdx+2})`)
          :L('已是最后一页，点击右侧底色边新建下一页','Last page — click right cover edge to create a new page')}
         aria-label={pageIdx<activeBook.pages.length-1?L('下一页','Next Page'):L('新建下一页','New Next Page')}
        >
         <span className="nb-page-edges" aria-hidden="true"/>
         <span className="nb-edge-cue" aria-hidden="true">
          {pageIdx<activeBook.pages.length-1?<ChevronRight size={18}/>:<Plus size={16}/>}
         </span>
        </button>
       </div>
       </div>
      )}
     </section>
    </div>

    {/* 选中文本后自动弹出的浮动工具栏（基本操作：强调/高亮/代码块/列表 + AI 规范化/精简/AI问答） */}
    {selection&&(
     <div
      className="nb-floating-toolbar"
      style={{
       left:`${selection.x}px`,
       top:`${selection.y}px`,
      }}
      onMouseDown={e=>e.preventDefault()}
     >
      <div className="nb-ft-group">
       <button
        type="button"
        onClick={()=>{
         void navigator.clipboard.writeText(selection.text).then(()=>{
          showNotice(L('已复制选中笔记','Copied selection'));
         }).catch(()=>{});
        }}
        title={L('复制选中内容（Ctrl+C）','Copy selection')}
       >
        <Copy size={14}/><span>{L('复制','Copy')}</span>
       </button>
       <button type="button" onClick={()=>applyFormatting('bold')} title={L('加粗强调','Bold')}>
        <Bold size={14}/><span>{L('强调','Bold')}</span>
       </button>
       <button type="button" onClick={()=>applyFormatting('italic')} title={L('斜体','Italic')}>
        <Italic size={14}/>
       </button>
       <button type="button" onClick={()=>applyFormatting('highlight')} title={L('高亮标记','Highlight')}>
        <Highlighter size={14}/><span>{L('高亮','Mark')}</span>
       </button>
       <button type="button" onClick={()=>applyFormatting('inline-code')} title={L('行内代码','Inline code')}>
        <Code size={14}/>
       </button>
       <div className="nb-ft-code-wrap">
        <button type="button" onClick={()=>setShowCodeMenu(v=>!v)} title={L('转为代码块','Wrap as code block')}>
         <Code2 size={14}/><span>{L('代码块','Code')}</span>
        </button>
        {showCodeMenu&&(
         <div className="nb-ft-code-menu">
          {(['python','rust','go','java','ts','sql'] as const).map(l=>(
           <button key={l} type="button" onClick={()=>applyFormatting('code-block',l)}>
            {l.toUpperCase()}
           </button>
          ))}
         </div>
        )}
       </div>
       <button type="button" onClick={()=>applyFormatting('ul')} title={L('转为无序列表','Bullet list')}>
        <List size={14}/><span>{L('列表','List')}</span>
       </button>
       <button type="button" onClick={()=>applyFormatting('ol')} title={L('转为有序列表','Numbered list')}>
        <ListOrdered size={14}/>
       </button>
       <button type="button" onClick={()=>applyFormatting('quote')} title={L('转为引用块','Quote')}>
        <Quote size={14}/>
       </button>
      </div>

      <span className="nb-ft-sep"/>

      <div className="nb-ft-group ai">
       <button
        type="button"
        className="nb-ft-ai-btn"
        onClick={()=>void triggerAiAction('normalize')}
        title={L('这段文本太长或不够规范？让 AI 规范化整理','Let AI normalize & structure this selection')}
       >
        <Wand2 size={14}/>
        <span>{L('AI 规范化','AI Standardize')}</span>
       </button>
       <button
        type="button"
        className="nb-ft-ai-btn"
        onClick={()=>void triggerAiAction('concise')}
        title={L('让 AI 提炼核心考点速记','Condense with AI')}
       >
        <Minimize2 size={13}/>
        <span>{L('AI 精简','Condense')}</span>
       </button>
       <button
        type="button"
        className="nb-ft-ai-btn ask"
        onClick={()=>{
         setAiTargetText(selection.text);
         setAiRange({start:selection.start,end:selection.end});
         void triggerAiAction('ask');
        }}
        title={L('针对这段选中文本进行 AI 问答','Ask AI about selected text')}
       >
        <Bot size={14}/>
        <span>{L('AI 问答','AI Q&A')}</span>
       </button>
       <button
        type="button"
        className="nb-ft-close"
        onClick={()=>{setSelection(null);setShowCodeMenu(false)}}
        aria-label={L('关闭工具条','Close toolbar')}
       >
        <X size={13}/>
       </button>
      </div>
     </div>
    )}

    {/* 站内柔和确认弹窗（替代浏览器原生 alert/confirm） */}
    {confirmDialog&&(
     <div
      className="nb-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nb-confirm-title"
      onClick={()=>setConfirmDialog(null)}
     >
      <div className="nb-confirm-modal" onClick={e=>e.stopPropagation()}>
       <div className="nb-confirm-head">
        <span className="nb-confirm-icon" aria-hidden="true">
         <Trash2 size={18}/>
        </span>
        <strong id="nb-confirm-title">{confirmDialog.title}</strong>
       </div>
       <p className="nb-confirm-msg">{confirmDialog.message}</p>
       <div className="nb-confirm-actions">
        <button
         type="button"
         className="button secondary"
         onClick={()=>setConfirmDialog(null)}
        >
         {L('取消','Cancel')}
        </button>
        <button
         type="button"
         className="button nb-confirm-danger"
         onClick={()=>{
          confirmDialog.onConfirm();
          setConfirmDialog(null);
         }}
        >
         {confirmDialog.confirmLabel}
        </button>
       </div>
      </div>
     </div>
    )}
   </main>
  </div>
 );
}
