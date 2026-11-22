// 笔记模块存储：支持多本自定义命名笔记本、预设《操作指南》、按主题切换纸张（白 / 黄 / 黑）、题目/学习/面试/操场一键收录与原路返回。
import {useSyncExternalStore} from 'react';
import {noteLocalWrite} from '@/app/components/cloud-sync';

export type NoteSourceKind='quiz'|'learn'|'interview'|'playground'|'paper';
export type NoteSource={
 kind:NoteSourceKind;
 label:string;
 href:string;
 questionId?:string;
};

export type NotePage={
 id:string;
 title:string;
 content:string;
 createdAt:number;
 updatedAt:number;
 source?:NoteSource;
};

export type NotebookCover='auto'|'amber'|'indigo'|'emerald'|'rose'|'slate';
export type Notebook={
 id:string;
 name:string;
 icon:string;
 cover:NotebookCover;
 customCover?:string;
 coverLocked?:boolean;
 createdAt:number;
 updatedAt:number;
 pages:NotePage[];
 preset?:boolean;
};

export type PaperTone='auto'|'white'|'yellow'|'black'|'custom';
export type PaperRuling='lined'|'grid'|'plain';

export type NotesState={
 notebooks:Notebook[];
 activeBookId:string;
 activePageByBook:Record<string,number>;
 paperTone:PaperTone;
 customPaperBg?:string;
 paperRuling:PaperRuling;
 sidebarCollapsed?:boolean;
 updatedAt:number;
};

export type NoteReturnContext={
 href:string;
 label:string;
 kind:NoteSourceKind;
 bookId?:string;
 pageId?:string;
 savedAt:number;
};

export const NOTES_STORAGE_PREFIX='study-notes:v1:';
export const NOTES_RETURN_KEY='study-notes:return:v1';
const NOTES_CHANGE_EVENT='study-notes-change';
const NOTES_USER_EVENT='study-notes-user-change';

let currentNotesUser='';
export function setCurrentNotesUser(username:string){
 const norm=username||'';
 if(currentNotesUser===norm)return;
 currentNotesUser=norm;
 if(typeof window!=='undefined'){
  window.dispatchEvent(new Event(NOTES_USER_EVENT));
 }
}
export function getCurrentNotesUser():string{
 return currentNotesUser;
}
const subscribeUser=(notify:()=>void)=>{
 if(typeof window==='undefined')return()=>{};
 window.addEventListener(NOTES_USER_EVENT,notify);
 return()=>window.removeEventListener(NOTES_USER_EVENT,notify);
};
export function useCurrentNotesUser(explicit?:string):string{
 const synced=useSyncExternalStore(subscribeUser,()=>currentNotesUser,()=>'');
 return explicit!==undefined?explicit:synced;
}

export const NOTEBOOK_COVERS:{id:NotebookCover;name:[string,string];swatch:string}[]=[
 {id:'amber',name:['琥珀经典','Amber'],swatch:'#d97706'},
 {id:'indigo',name:['深海靛蓝','Indigo'],swatch:'#4f46e5'},
 {id:'emerald',name:['松石翠绿','Emerald'],swatch:'#059669'},
 {id:'rose',name:['绯红珊瑚','Rose'],swatch:'#e11d48'},
 {id:'slate',name:['极夜石板','Slate'],swatch:'#334155'},
];

export const NOTEBOOK_ICONS=['📒','📘','📗','📕','📙','🦀','🐍','🐹','🤖','🗄️','🎨','✨','🧠'];

function genId(prefix:string):string{
 return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

// 预设的唯一初始笔记本：《操作指南》（4 页交互式演示指南）
export function buildPresetGuideNotebook():Notebook{
 const now=1763654400000;
 return {
  id:'preset-guide',
  name:'操作指南',
  icon:'📒',
  cover:'amber',
  preset:true,
  createdAt:now,
  updatedAt:now,
  pages:[
   {
    id:'guide-page-1',
    title:'一、欢迎使用笔记本：三色纸张与 3D 仿真翻页',
    createdAt:now,
    updatedAt:now,
    content:`### 欢迎来到你的随身学习笔记本

这里是你整理核心考点、错题复盘与代码片段的专属空间。默认为你准备了这本 **《操作指南》**，你可以随时在左侧点击 **「+ 新建笔记本」** 创建多本不同主题的笔记本（如《Rust 所有权笔记》《Python 异步与 GIL》《面试高频追问》），并自由**自定义命名**或更换封面。

#### 1. 纸张颜色随主题变化（白 · 黄 · 黑）
- **白纸（明朗白）**：清爽利落，适合日间高对比度阅读与敲代码；
- **黄纸（护眼黄）**：温润羊皮纸质感，适合晨昏时段长时间背诵与沉浸阅读；
- **黑纸（暗夜黑）**：深邃低眩光，夜间关灯模式下自动切换，保护视力；
- 你既可以让纸张 **「跟随主题」** 自动切换，也可以在书页上方手动锁定 **白 / 黄 / 黑** 以及 **横线 / 方格 / 空白** 内页。

#### 2. 仿真翻页体验
- 点击书页左右边缘、右下角**卷起的书角**，或者按键盘 **\`←\` / \`→\`** 方向键，即可体验拟真 3D 书页翻转；
- 现在就试试点击右下角的**折角**或右侧翻页按钮，翻到第 2 页体验**选中文本浮动工具栏**吧！`,
   },
   {
    id:'guide-page-2',
    title:'二、划词排版：代码块、列表与重点强调',
    createdAt:now+1000,
    updatedAt:now+1000,
    content:`### 选中文本即可弹出排版与 AI 工具栏

无论在**阅读模式**还是**编辑模式**下，用鼠标或触屏**选中任意一段文字**，选区上方都会立即浮出快捷操作栏，一键完成 **加粗强调**、==高亮荧光笔==、\`行内代码\`、**代码块**、**无序/有序/待办列表** 与 **引用块**。

> 💡 **马上动手试试**：用鼠标选中下方这几行文字，点击弹出工具栏上的 **「加粗」「高亮」** 或 **「列表」** 按钮！

- Rust 借用核心口诀：同一时刻，要么拥有任意多个不可变引用 \`&T\`，要么只拥有唯一一个可变引用 \`&mut T\`。
- Python 参数传递核心：默认参数在 \`def\` 定义时只求值一次，切勿使用可变列表 \`[]\` 作为默认值。
- [x] 学会用右下角仿真卷角翻页
- [ ] 选中一段文字体验浮动排版与 AI 助手

\`\`\`python
def append_item(item: str, bucket: list[str] | None = None) -> list[str]:
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

print(append_item("Rust"))
print(append_item("Python"))
\`\`\``,
   },
   {
    id:'guide-page-3',
    title:'三、内置 AI 辅助：一键规范化、精简与选中文本问答',
    createdAt:now+2000,
    updatedAt:now+2000,
    content:`### 选中文本，唤起内置 AI 笔记助手

自己随手记下的笔记太长、太口语化，或者某句话看不太懂？**直接选中那段文字**，浮动工具栏会自动出现四个 AI 能力按钮：

1. **✨ AI 规范化**：将口语化、冗长或杂乱的草稿，整理成条理分明、术语准确、带要点分条的标准面试笔记；
2. **✂️ AI 精简**：把大段解析浓缩为几句核心记忆点与速记口诀；
3. **💡 AI 扩写/举例**：补充通俗比喻或简短可运行的代码示例；
4. **🤖 AI 问答**：针对你选中的那段文字直接提问（如“为什么会这样？”“面试官会怎么追问？”），AI 回复后可一键 **「替换选中内容」** 或 **「插入到下方」**。

> 👇 **试一试**：用鼠标完整选中下面这段“口语化草稿”，然后点击浮动栏上的 **「✨ AI 规范化」** 或 **「🤖 AI 问答」**！

其实 Rust 里面那个 String 和 &str 的区别就是，String 是自己在堆上开了块内存把字存起来，自己管释放，能往后加字；而 &str 就好比只是借别人的一段字来看看，自己不占那块内存的所有权，也不能改里面的字，写函数参数如果只是读文字的话写 &str 最划算因为两种都能传进去。`,
   },
   {
    id:'guide-page-4',
    title:'四、在答题中一键收入笔记，并随时回到原处',
    createdAt:now+3000,
    updatedAt:now+3000,
    source:{
     kind:'learn',
     label:'学习空间 · 选一门开始学习',
     href:'/learn',
    },
    content:`### 边答题边记笔记，随时一键回到原题

在做题或学习过程中遇到好题、易错点，无需手动复制粘贴：

1. **随处可记**：在 **闯关答题**、**阶段训练**、**150 分正式试卷**、**背题模式**、**面试刷题**、**学习卡片** 以及 **代码操场** 的卡片右上角/操作栏，点击 **「记笔记」** 按钮；
2. **自选内容**：弹窗中可自由选择 **「仅添加题目」**（留给自己独立思考作答）或 **「添加题目 + 答案与解析」**（完整复盘），还可以当场补充一句自己的批注；
3. **自动建本**：如果当前没有任何笔记本，弹窗会直接引导你输入名称新建一本笔记本并写入；
4. **一键原路返回**：
   - 添加成功后，你可以直接留在该题继续作答，也可以点击 **「打开这页笔记」** 深入编辑；
   - 每页收录的笔记都会自动记住它的**来源位置**（如具体哪道题、哪一关、哪道面试题或代码操场），点击书页顶部的 **「返回题目 / 返回学习 / 返回面试 / 返回操场」** 按钮即可立即回到刚才的位置！`,
   },
  ],
 };
}

function defaultState():NotesState{
 const guide=buildPresetGuideNotebook();
 return {
  notebooks:[guide],
  activeBookId:guide.id,
  activePageByBook:{[guide.id]:0},
  paperTone:'auto',
  paperRuling:'plain',
  updatedAt:Date.now(),
 };
}

// 缓存每名用户的反序列化状态，保证 useSyncExternalStore 快照引用稳定
const stateCache=new Map<string,{raw:string;parsed:NotesState}>();

export function storageKeyForNotes(username:string):string{
 return NOTES_STORAGE_PREFIX+(username||'guest');
}

function normalizeState(rawObj:unknown):NotesState{
 if(!rawObj||typeof rawObj!=='object')return defaultState();
 const o=rawObj as Partial<NotesState>;
 if(!Array.isArray(o.notebooks))return defaultState();
 const notebooks:Notebook[]=o.notebooks
  .filter(b=>b&&typeof b==='object'&&typeof b.id==='string'&&typeof b.name==='string')
  .map(b=>{
   const pages:NotePage[]=Array.isArray(b.pages)
    ?b.pages
      .filter(p=>p&&typeof p==='object'&&typeof p.id==='string')
      .map((p,idx)=>({
       id:p.id,
       title:typeof p.title==='string'&&p.title.trim()?p.title.trim():`第 ${idx+1} 页`,
       content:typeof p.content==='string'?p.content:'',
       createdAt:typeof p.createdAt==='number'?p.createdAt:Date.now(),
       updatedAt:typeof p.updatedAt==='number'?p.updatedAt:Date.now(),
       ...(p.source&&typeof p.source==='object'&&typeof p.source.href==='string'
        ?{source:p.source}
        :{}),
      }))
    :[];
   return {
    id:b.id,
    name:b.name.trim()||'未命名笔记本',
    icon:typeof b.icon==='string'&&b.icon?b.icon:'📒',
    cover:'auto' as NotebookCover,
    createdAt:typeof b.createdAt==='number'?b.createdAt:Date.now(),
    updatedAt:typeof b.updatedAt==='number'?b.updatedAt:Date.now(),
    pages:pages.length
     ?pages
     :[{id:genId('page'),title:'第 1 页',content:'',createdAt:Date.now(),updatedAt:Date.now()}],
    ...(b.preset?{preset:true}:{}),
   };
  });
 const activeBookId=notebooks.some(b=>b.id===o.activeBookId)
  ?o.activeBookId!
  :(notebooks[0]?.id??'');
 return {
  notebooks,
  activeBookId,
  activePageByBook:o.activePageByBook&&typeof o.activePageByBook==='object'?o.activePageByBook:{},
  paperTone:'auto',
  paperRuling:'plain',
  ...(o.sidebarCollapsed?{sidebarCollapsed:true}:{}),
  updatedAt:typeof o.updatedAt==='number'?o.updatedAt:Date.now(),
 };
}

export function readNotesState(username:string):NotesState{
 if(typeof window==='undefined')return defaultState();
 const key=storageKeyForNotes(username);
 try{
  const raw=localStorage.getItem(key);
  if(!raw){
   const init=defaultState();
   localStorage.setItem(key,JSON.stringify(init));
   stateCache.set(key,{raw:JSON.stringify(init),parsed:init});
   return init;
  }
  const hit=stateCache.get(key);
  if(hit&&hit.raw===raw)return hit.parsed;
  const parsed=normalizeState(JSON.parse(raw));
  stateCache.set(key,{raw,parsed});
  return parsed;
 }catch{
  return defaultState();
 }
}

export function writeNotesState(username:string,next:NotesState):NotesState{
 const key=storageKeyForNotes(username);
 const stamped:NotesState={...next,updatedAt:Date.now()};
 try{
  const raw=JSON.stringify(stamped);
  localStorage.setItem(key,raw);
  stateCache.set(key,{raw,parsed:stamped});
 }catch{}
 noteLocalWrite(key);
 if(typeof window!=='undefined'){
  window.dispatchEvent(new Event(NOTES_CHANGE_EVENT));
 }
 return stamped;
}

const subscribeNotes=(notify:()=>void)=>{
 if(typeof window==='undefined')return()=>{};
 window.addEventListener('storage',notify);
 window.addEventListener(NOTES_CHANGE_EVENT,notify);
 return()=>{
  window.removeEventListener('storage',notify);
  window.removeEventListener(NOTES_CHANGE_EVENT,notify);
 };
};

const SSR_SNAPSHOT=defaultState();
export function useNotesStore(username:string):NotesState{
 return useSyncExternalStore(
  subscribeNotes,
  ()=>readNotesState(username),
  ()=>SSR_SNAPSHOT,
 );
}

export function createNotebook(
 username:string,
 input:{name:string;icon?:string;cover?:NotebookCover;firstPageTitle?:string;firstPageContent?:string;source?:NoteSource},
):{state:NotesState;book:Notebook;pageIndex:number}{
 const cur=readNotesState(username);
 const now=Date.now();
 const page:NotePage={
  id:genId('page'),
  title:input.firstPageTitle?.trim()||'第 1 页',
  content:input.firstPageContent??'',
  createdAt:now,
  updatedAt:now,
  ...(input.source?{source:input.source}:{}),
 };
 const book:Notebook={
  id:genId('book'),
  name:input.name.trim()||'我的笔记本',
  icon:input.icon||'📘',
  cover:input.cover||'auto',
  ...(input.cover&&input.cover!=='auto'?{coverLocked:true}:{}),
  createdAt:now,
  updatedAt:now,
  pages:[page],
 };
 const next=writeNotesState(username,{
  ...cur,
  notebooks:[...cur.notebooks,book],
  activeBookId:book.id,
  activePageByBook:{...cur.activePageByBook,[book.id]:0},
 });
 return {state:next,book,pageIndex:0};
}

export function renameNotebook(
 username:string,
 bookId:string,
 patch:{name?:string;icon?:string;cover?:NotebookCover;customCover?:string},
):NotesState{
 const cur=readNotesState(username);
 const now=Date.now();
 return writeNotesState(username,{
  ...cur,
  notebooks:cur.notebooks.map(b=>{
   if(b.id!==bookId)return b;
   const next:Notebook={
    ...b,
    name:patch.name!==undefined?(patch.name.trim()||b.name):b.name,
    icon:patch.icon??b.icon,
    cover:patch.cover??b.cover,
    updatedAt:now,
   };
   if(patch.customCover!==undefined){
    if(/^#[0-9a-fA-F]{6}$/.test(patch.customCover)){
     next.customCover=patch.customCover;
     next.coverLocked=true;
    }else{
     delete next.customCover;
     if(patch.cover==='auto'||!patch.cover)delete next.coverLocked;
    }
   }else if(patch.cover==='auto'){
    delete next.customCover;
    delete next.coverLocked;
   }else if(patch.cover){
    delete next.customCover;
    next.coverLocked=true;
   }else if(b.coverLocked){
    next.coverLocked=true;
   }
   return next;
  }),
 });
}

export function deleteNotebook(username:string,bookId:string):NotesState{
 const cur=readNotesState(username);
 const rest=cur.notebooks.filter(b=>b.id!==bookId);
 const activeBookId=cur.activeBookId===bookId?(rest[0]?.id??''):cur.activeBookId;
 const nextPages={...cur.activePageByBook};
 delete nextPages[bookId];
 return writeNotesState(username,{
  ...cur,
  notebooks:rest,
  activeBookId,
  activePageByBook:nextPages,
 });
}

export function restorePresetGuideNotebook(username:string):NotesState{
 const cur=readNotesState(username);
 const existing=cur.notebooks.find(b=>b.id==='preset-guide');
 if(existing){
  return writeNotesState(username,{...cur,activeBookId:existing.id,activePageByBook:{...cur.activePageByBook,[existing.id]:0}});
 }
 const guide=buildPresetGuideNotebook();
 return writeNotesState(username,{
  ...cur,
  notebooks:[guide,...cur.notebooks],
  activeBookId:guide.id,
  activePageByBook:{...cur.activePageByBook,[guide.id]:0},
 });
}

export type DuplicateNoteMatch={
 bookId:string;
 bookName:string;
 pageId:string;
 pageIndex:number;
 pageTitle:string;
 exact:boolean;
 canOverwrite:boolean;
};

function normalizeRawNote(s:string):string{
 return s.replace(/\s+/g,' ').trim().toLowerCase();
}

function normalizeCoreNote(s:string):string{
 return s
  .replace(/>\s*💡\s*\*\*[^*]+\*\*[：:][\s\S]*$/,'')
  .replace(/```[a-zA-Z0-9_-]*/g,'```')
  .replace(/\s+/g,' ')
  .trim()
  .toLowerCase();
}

function splitNoteBlocks(content:string):string[]{
 return content
  .split(/\n\n---\n\n/)
  .map(part=>part.replace(/^####\s+[^\n]+\n+/,'').trim())
  .filter(Boolean);
}

function isAiQaNoteSource(src?:NoteSource):boolean{
 if(!src)return false;
 const l=src.label.trim();
 return l.startsWith('AI 问答')||l.startsWith('AI Q&A');
}

export function findDuplicateNotes(
 state:NotesState,
 input:{
  title?:string;
  content?:string;
  altContent?:string;
  source?:NoteSource;
  bookId?:string;
 },
):DuplicateNoteMatch[]{
 const rawInput=normalizeRawNote(input.content??'');
 const coreInput=normalizeCoreNote(input.content??'');
 const coreAlt=normalizeCoreNote(input.altContent??'');
 const cleanTitle=normalizeRawNote(input.title??'');
 const src=input.source;
 const qid=src?.questionId?.trim()||'';
 const learnCard=Boolean(src?.kind==='learn'&&!isAiQaNoteSource(src)&&src.label.trim());

 if(!qid&&!learnCard&&!rawInput&&!coreAlt)return [];

 const matches:DuplicateNoteMatch[]=[];
 for(const book of state.notebooks){
  if(input.bookId&&book.id!==input.bookId)continue;
  let found:DuplicateNoteMatch|null=null;
  for(let i=0;i<book.pages.length;i++){
   const page=book.pages[i];
   if(!page.content.trim()&&!page.source)continue;

   const rawPage=normalizeRawNote(page.content);
   const corePage=normalizeCoreNote(page.content);
   const isMultiBlock=page.content.includes('\n\n---\n\n');
   const sameTitle=Boolean(cleanTitle&&normalizeRawNote(page.title)===cleanTitle);
   const exact=Boolean(rawInput&&rawPage===rawInput&&(!cleanTitle||sameTitle));

   let matched=false;
   let canOverwrite=false;

   if(qid&&page.source?.questionId===qid){
    matched=true;
    canOverwrite=!isMultiBlock;
   }else if(
    learnCard&&
    page.source?.kind==='learn'&&
    page.source.label===src!.label&&
    (!src!.href||!page.source.href||page.source.href===src!.href)
   ){
    matched=true;
    canOverwrite=!isMultiBlock;
   }else if(rawInput&&(rawPage===rawInput||(coreInput&&corePage===coreInput))){
    matched=true;
    canOverwrite=true;
   }else{
    const blocks=isMultiBlock?splitNoteBlocks(page.content):[];
    const blockHit=blocks.some(b=>{
     const rb=normalizeRawNote(b);
     const cb=normalizeCoreNote(b);
     return Boolean(
      (rawInput&&rb===rawInput)||
      (coreInput&&cb===coreInput)||
      (coreAlt&&cb===coreAlt)
     );
    });
    const containedHit=Boolean(
     (coreInput.length>=14&&corePage.includes(coreInput))||
     (coreAlt.length>=14&&corePage.includes(coreAlt))
    );
    const aiUpgradeHit=Boolean(
     isAiQaNoteSource(src)&&
     page.source?.label===src?.label&&
     corePage.length>=6&&
     ((coreAlt&&corePage===coreAlt)||(coreInput&&coreInput.includes(corePage)&&sameTitle))
    );
    if(blockHit||containedHit){
     matched=true;
     canOverwrite=!isMultiBlock&&(Boolean(coreAlt&&corePage===coreAlt)||exact);
    }else if(aiUpgradeHit){
     matched=true;
     canOverwrite=!isMultiBlock;
    }
   }

   if(matched){
    found={
     bookId:book.id,
     bookName:book.name,
     pageId:page.id,
     pageIndex:i,
     pageTitle:page.title,
     exact,
     canOverwrite,
    };
    if(exact||canOverwrite)break;
   }
  }
  if(found)matches.push(found);
 }
 return matches;
}

export function addNoteEntry(
 username:string,
 bookId:string,
 entry:{title:string;content:string;source?:NoteSource},
 mode:'new-page'|'append-last'='new-page',
 options?:{preventDuplicate?:boolean;altContent?:string},
):{state:NotesState;bookId:string;pageId:string;pageIndex:number;duplicate?:boolean}{
 const cur=readNotesState(username);
 const now=Date.now();
 const target=cur.notebooks.find(b=>b.id===bookId)??cur.notebooks[0];
 if(target&&options?.preventDuplicate){
  const dup=findDuplicateNotes(cur,{
   title:entry.title,
   content:entry.content,
   altContent:options.altContent,
   source:entry.source,
   bookId:target.id,
  })[0];
  if(dup){
   return {
    state:cur,
    bookId:dup.bookId,
    pageId:dup.pageId,
    pageIndex:dup.pageIndex,
    duplicate:true,
   };
  }
 }
 if(!target){
  const created=createNotebook(username,{
   name:'我的笔记本',
   firstPageTitle:entry.title,
   firstPageContent:entry.content,
   source:entry.source,
  });
  return {
   state:created.state,
   bookId:created.book.id,
   pageId:created.book.pages[0].id,
   pageIndex:0,
  };
 }

 let pageId='';
 let pageIndex=0;
 const nextBooks=cur.notebooks.map(b=>{
  if(b.id!==target.id)return b;
  if(mode==='append-last'&&b.pages.length>0){
   pageIndex=b.pages.length-1;
   const last=b.pages[pageIndex];
   pageId=last.id;
   const sep=last.content.trim()?'\n\n---\n\n':'';
   const heading=entry.title.trim()?`#### ${entry.title.trim()}\n\n`:'';
   const updatedPage:NotePage={
    ...last,
    content:`${last.content.trim()}${sep}${heading}${entry.content.trim()}`,
    updatedAt:now,
    source:entry.source??last.source,
   };
   return {
    ...b,
    updatedAt:now,
    pages:b.pages.map((p,i)=>i===pageIndex?updatedPage:p),
   };
  }
  // 如果当前笔记本只有 1 页且内容为空白，直接写入这第 1 页
  if(b.pages.length===1&&!b.pages[0].content.trim()){
   pageIndex=0;
   pageId=b.pages[0].id;
   const first:NotePage={
    ...b.pages[0],
    title:entry.title.trim()||b.pages[0].title,
    content:entry.content,
    updatedAt:now,
    ...(entry.source?{source:entry.source}:{}),
   };
   return {...b,updatedAt:now,pages:[first]};
  }
  const newPage:NotePage={
   id:genId('page'),
   title:entry.title.trim()||`第 ${b.pages.length+1} 页`,
   content:entry.content,
   createdAt:now,
   updatedAt:now,
   ...(entry.source?{source:entry.source}:{}),
  };
  pageIndex=b.pages.length;
  pageId=newPage.id;
  return {...b,updatedAt:now,pages:[...b.pages,newPage]};
 });

 const next=writeNotesState(username,{
  ...cur,
  notebooks:nextBooks,
  activeBookId:target.id,
  activePageByBook:{...cur.activePageByBook,[target.id]:pageIndex},
 });
 return {state:next,bookId:target.id,pageId,pageIndex};
}

export function updateNotePage(
 username:string,
 bookId:string,
 pageId:string,
 patch:{title?:string;content?:string;source?:NoteSource|undefined},
):NotesState{
 const cur=readNotesState(username);
 const now=Date.now();
 return writeNotesState(username,{
  ...cur,
  notebooks:cur.notebooks.map(b=>b.id!==bookId?b:{
   ...b,
   updatedAt:now,
   pages:b.pages.map(p=>p.id!==pageId?p:{
    ...p,
    ...(patch.title!==undefined?{title:patch.title}:{}),
    ...(patch.content!==undefined?{content:patch.content}:{}),
    ...('source' in patch?{source:patch.source}:{}),
    updatedAt:now,
   }),
  }),
 });
}

export function deleteNotePage(username:string,bookId:string,pageId:string):NotesState{
 const cur=readNotesState(username);
 const now=Date.now();
 const book=cur.notebooks.find(b=>b.id===bookId);
 if(!book)return cur;
 const filtered=book.pages.filter(p=>p.id!==pageId);
 const pages=filtered.length
  ?filtered
  :[{id:genId('page'),title:'第 1 页',content:'',createdAt:now,updatedAt:now}];
 const prevIdx=cur.activePageByBook[bookId]??0;
 const nextIdx=Math.min(prevIdx,pages.length-1);
 return writeNotesState(username,{
  ...cur,
  notebooks:cur.notebooks.map(b=>b.id!==bookId?b:{...b,updatedAt:now,pages}),
  activePageByBook:{...cur.activePageByBook,[bookId]:nextIdx},
 });
}

export function setActiveBookAndPage(username:string,bookId:string,pageIndex?:number):NotesState{
 const cur=readNotesState(username);
 const book=cur.notebooks.find(b=>b.id===bookId);
 if(!book)return cur;
 const idx=pageIndex!==undefined
  ?Math.max(0,Math.min(book.pages.length-1,pageIndex))
  :Math.max(0,Math.min(book.pages.length-1,cur.activePageByBook[bookId]??0));
 return writeNotesState(username,{
  ...cur,
  activeBookId:bookId,
  activePageByBook:{...cur.activePageByBook,[bookId]:idx},
 });
}

// 将某页笔记移动到另一个笔记本（switchToTarget=true 时自动切换到目标笔记本对应页）
export function moveNotePageToBook(
 username:string,
 fromBookId:string,
 pageId:string,
 toBookId:string,
 switchToTarget=true,
):{ok:boolean;state:NotesState;toBookName?:string;toPageIndex?:number}{
 const cur=readNotesState(username);
 if(fromBookId===toBookId)return {ok:false,state:cur};
 const fromBook=cur.notebooks.find(b=>b.id===fromBookId);
 const toBook=cur.notebooks.find(b=>b.id===toBookId);
 if(!fromBook||!toBook)return {ok:false,state:cur};
 const movingPage=fromBook.pages.find(p=>p.id===pageId);
 if(!movingPage)return {ok:false,state:cur};
 const now=Date.now();

 const restFrom=fromBook.pages.filter(p=>p.id!==pageId);
 const nextFromPages=restFrom.length
  ?restFrom
  :[{id:genId('page'),title:'第 1 页',content:'',createdAt:now,updatedAt:now}];
 const nextFromIdx=Math.min(cur.activePageByBook[fromBookId]??0,nextFromPages.length-1);

 let toPageIndex=0;
 let nextToPages:NotePage[];
 if(toBook.pages.length===1&&!toBook.pages[0].content.trim()){
  nextToPages=[{...movingPage,updatedAt:now}];
  toPageIndex=0;
 }else{
  nextToPages=[...toBook.pages,{...movingPage,updatedAt:now}];
  toPageIndex=nextToPages.length-1;
 }

 const next=writeNotesState(username,{
  ...cur,
  notebooks:cur.notebooks.map(b=>{
   if(b.id===fromBookId)return {...b,updatedAt:now,pages:nextFromPages};
   if(b.id===toBookId)return {...b,updatedAt:now,pages:nextToPages};
   return b;
  }),
  activeBookId:switchToTarget?toBookId:cur.activeBookId,
  activePageByBook:{
   ...cur.activePageByBook,
   [fromBookId]:nextFromIdx,
   [toBookId]:toPageIndex,
  },
 });
 return {ok:true,state:next,toBookName:toBook.name,toPageIndex};
}

// 同一笔记本内调整笔记页码位置（targetIndex 为 0-based，必须对应已存在的页码）
export function reorderNotePageInBook(
 username:string,
 bookId:string,
 pageId:string,
 targetIndex:number,
):{ok:boolean;state:NotesState;pageIndex?:number}{
 const cur=readNotesState(username);
 const book=cur.notebooks.find(b=>b.id===bookId);
 if(!book)return {ok:false,state:cur};
 if(!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=book.pages.length){
  return {ok:false,state:cur};
 }
 const fromIndex=book.pages.findIndex(p=>p.id===pageId);
 if(fromIndex<0)return {ok:false,state:cur};
 if(fromIndex===targetIndex){
  return {ok:true,state:cur,pageIndex:targetIndex};
 }
 const now=Date.now();
 const nextPages=[...book.pages];
 const [moved]=nextPages.splice(fromIndex,1);
 nextPages.splice(targetIndex,0,moved);
 const next=writeNotesState(username,{
  ...cur,
  notebooks:cur.notebooks.map(b=>b.id!==bookId?b:{...b,updatedAt:now,pages:nextPages}),
  activePageByBook:{...cur.activePageByBook,[bookId]:targetIndex},
 });
 return {ok:true,state:next,pageIndex:targetIndex};
}

export function setNotesAppearance(
 username:string,
 patch:{paperTone?:PaperTone;customPaperBg?:string;paperRuling?:PaperRuling;sidebarCollapsed?:boolean},
):NotesState{
 const cur=readNotesState(username);
 return writeNotesState(username,{
  ...cur,
  ...(patch.paperTone?{paperTone:patch.paperTone}:{}),
  ...(patch.customPaperBg&&/^#[0-9a-fA-F]{6}$/.test(patch.customPaperBg)?{customPaperBg:patch.customPaperBg}:{}),
  ...(patch.paperRuling?{paperRuling:patch.paperRuling}:{}),
  ...(patch.sidebarCollapsed!==undefined?{sidebarCollapsed:patch.sidebarCollapsed}:{}),
 });
}

export const PAPER_CUSTOM_PRESETS:{hex:string;name:[string,string]}[]=[
 {hex:'#e8f4ea',name:['豆沙护眼绿','Sage Green']},
 {hex:'#e9f2fc',name:['晴空浅蓝','Sky Blue']},
 {hex:'#fcedf2',name:['淡樱花瓣粉','Blush Pink']},
 {hex:'#f3eddf',name:['牛皮羊皮纸','Parchment']},
 {hex:'#121c2b',name:['午夜深蓝','Midnight Blue']},
 {hex:'#14211b',name:['墨绿暗夜','Forest Night']},
];

export function isHexLight(hex:string):boolean{
 const clean=hex.replace('#','');
 if(clean.length!==6)return true;
 const r=parseInt(clean.slice(0,2),16);
 const g=parseInt(clean.slice(2,4),16);
 const b=parseInt(clean.slice(4,6),16);
 const lum=(0.299*r+0.587*g+0.114*b)/255;
 return lum>0.55;
}

// 根据站点当前的主题与开/关灯状态，计算笔记纸张的实际颜色（white / yellow / black / custom）
export function resolvePaperColor(
 paperTone:PaperTone,
 effectiveThemeId:string,
 effectiveLamp:'on'|'off',
):'white'|'yellow'|'black'|'custom'{
 if(paperTone==='custom')return 'custom';
 if(paperTone==='white'||paperTone==='yellow'||paperTone==='black')return paperTone;
 if(effectiveLamp==='off')return 'black';
 if(['dawn','sunrise','afternoon','dusk'].includes(effectiveThemeId))return 'yellow';
 return 'white';
}

export function saveNoteReturnContext(ctx:Omit<NoteReturnContext,'savedAt'>){
 try{
  sessionStorage.setItem(NOTES_RETURN_KEY,JSON.stringify({...ctx,savedAt:Date.now()}));
 }catch{}
}

export function readNoteReturnContext():NoteReturnContext|null{
 try{
  const raw=sessionStorage.getItem(NOTES_RETURN_KEY);
  return raw?(JSON.parse(raw) as NoteReturnContext):null;
 }catch{
  return null;
 }
}
