'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,Eye,EyeOff,NotebookPen,Play,RotateCcw,Search,Trash2,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {TitleGear} from '../components/title-tip';
import KeywordText,{EnWords} from '../components/keyword-text';
import {ListenButton,ReadingPassage} from '../components/speech-drill';
import {aiQuizTypes,type AiQuiz,type AiQuizType} from '@/content/journey';
import {isWritten,toStandardItem} from './grade-client';
import {answerText} from './question-card';
import {StandardAnswerPanel} from './standard-answer-box';

export type BankEntry={id:string;level:string;quiz:AiQuiz};
const letters='ABCDEFGH';

function matchEntry(e:BankEntry,sourceTitle:string,kw:string):boolean{
 if(!kw)return true;
 const q=e.quiz,typeLabel=aiQuizTypes[q.type??'single']??'';
 const hay=[
  e.id,
  sourceTitle,
  typeLabel,
  q.q,
  q.code??'',
  q.say??'',
  q.passage??'',
  q.explain,
  'options' in q?q.options.join(' '):'',
  'why' in q&&q.why?q.why.join(' '):'',
  'reference' in q?q.reference:'',
  'accepted' in q?q.accepted.join(' '):'',
  'blanks' in q&&q.blanks?q.blanks.flat().join(' '):'',
 ].join('\n').toLowerCase();
 return kw.split(/\s+/).filter(Boolean).every(tok=>hay.includes(tok));
}

function QuestionDetailCard({
 entry,
 index,
 sourceTitle,
 showAnswer,
 onPracticeOne,
 onOpenSource,
 onRemoveMistake,
}:{
 entry:BankEntry;
 index:number;
 sourceTitle:string;
 showAnswer:boolean;
 onPracticeOne:()=>void;
 onOpenSource?:()=>void;
 onRemoveMistake?:()=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const q=entry.quiz,type=q.type??'single',written=q.type==='short'||q.type==='code'||q.type==='design';
 const [openAns,setOpenAns]=useState(showAnswer);
 const ansVisible=showAnswer||openAns;
 const isRightOpt=(o:number)=>q.type==='multi'?q.answers.includes(o):q.type!=='judge'&&'answer' in q&&q.answer===o;
 const why='why' in q?q.why:undefined;

 return <article className="ai-card qb-item">
  <div className="qb-item-head">
   <span className="qb-num">#{index+1}</span>
   <span className="ai-tag type">{aiQuizTypes[type]}</span>
   {sourceTitle&&<span className="ai-tag">{sourceTitle}</span>}
   <div className="qb-item-actions">
    <button type="button" className="button secondary qb-btn" onClick={onPracticeOne}>
     <Play size={14}/>{L('单题练习','Practice')}
    </button>
    {onOpenSource&&<button type="button" className="button secondary qb-btn" onClick={onOpenSource}>
     <BookOpen size={14}/>{L('对应卡片','Lesson card')}
    </button>}
    {onRemoveMistake&&<button type="button" className="button secondary qb-btn qb-remove" onClick={onRemoveMistake} title={L('已掌握，移出错题本','Mastered — remove from mistake book')}>
     <Trash2 size={14}/>{L('移出错题本','Remove')}
    </button>}
   </div>
  </div>

  <h3 className="qb-question"><EnWords text={q.q}/></h3>
  {q.say&&<ListenButton text={q.say}/>}
  {q.passage&&<ReadingPassage text={q.passage}/>}
  {q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}

  {'options' in q&&<ul className="qb-options">
   {q.options.map((opt,o)=>{
    const right=ansVisible&&isRightOpt(o);
    return <li key={o} className={'qb-option'+(right?' right':'')}>
     <b>{letters[o]}</b>
     <span>
      <EnWords text={opt}/>
      {ansVisible&&why?.[o]&&!right&&<small className="ai-why"><EnWords text={why[o]}/></small>}
     </span>
     {right&&<Check size={16}/>}
    </li>;
   })}
  </ul>}

  {!showAnswer&&<button type="button" className="qb-toggle-ans" onClick={()=>setOpenAns(v=>!v)}>
   {ansVisible?<><EyeOff size={14}/>{L('收起答案与解析','Hide answer & explanation')}</>:<><Eye size={14}/>{L('查看答案与解析','Show answer & explanation')}</>}
  </button>}

  {ansVisible&&<div className="qb-explain">
   {isWritten(q)&&<StandardAnswerPanel keyId={`qb:${entry.id}`} item={toStandardItem(q,'')} withPicker/>}
   {written?<>
    <strong>{L('参考答案：','Reference answer:')}</strong>
    <pre className="ai-review-ref">{answerText(q,L)}</pre>
   </>:<p className="ai-answer">{L('正确答案：','Answer: ')}<EnWords text={answerText(q,L)}/></p>}
   {q.say&&!q.explain.includes(q.say)&&<p className="ai-say-transcript">{L('听力原句：','Transcript: ')}<strong lang="en"><EnWords text={q.say}/></strong></p>}
   <p className="qb-explain-body"><KeywordText text={q.explain}/></p>
  </div>}
 </article>;
}

// 错题本完整列表与搜索页：全部展示错题、支持关键词搜索、单题重练、批量重练、移出错题本。
export function MistakeBookView({
 items,
 sourceName,
 onPractice,
 onRemove,
 onClearAll,
 onBack,
}:{
 items:BankEntry[];
 sourceName:(levelId:string)=>string;
 onPractice:(list:BankEntry[])=>void;
 onRemove:(id:string)=>void;
 onClearAll:()=>void;
 onBack:()=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [query,setQuery]=useState('');
 const [typeFilter,setTypeFilter]=useState<AiQuizType|'all'>('all');
 const kw=query.trim().toLowerCase();

 const availableTypes=useMemo(()=>{
  const s=new Set<AiQuizType>();
  items.forEach(it=>s.add(it.quiz.type??'single'));
  return [...s];
 },[items]);

 const filtered=useMemo(()=>items.filter(it=>{
  if(typeFilter!=='all'&&(it.quiz.type??'single')!==typeFilter)return false;
  return matchEntry(it,sourceName(it.level),kw);
 }),[items,typeFilter,kw,sourceName]);

 return <section className="qb-section">
  <div className="ai-title">
   <span className="eyebrow">MISTAKE BOOK</span>
   <h1>
    <NotebookPen size={28} style={{display:'inline',verticalAlign:'-5px',marginRight:8,color:'var(--primary)'}}/>
    {L(`错题本（共 ${items.length} 题）`,`Mistake Book (${items.length})`)}
    
    {items.length>0&&<TitleGear active={!!(kw||typeFilter!=='all')} label={L('错题本筛选与重练','Mistake book filters & actions')}>
     <div className="qb-gear">
      <label className="qb-search-input">
       <Search size={17}/>
       <input
        value={query}
        onChange={e=>setQuery(e.target.value)}
        placeholder={L('搜索错题','Search mistakes')}
       />
       {query&&<button type="button" className="qb-clear" onClick={()=>setQuery('')} aria-label={L('清空搜索','Clear search')}><X size={15}/></button>}
      </label>

      {availableTypes.length>1&&<div className="qb-type-chips">
       <button type="button" className={'lazy-chip'+(typeFilter==='all'?' on':'')} onClick={()=>setTypeFilter('all')}>
        {L('全部题型','All types')}<small>{items.length}</small>
       </button>
       {availableTypes.map(t=><button key={t} type="button" className={'lazy-chip'+(typeFilter===t?' on':'')} onClick={()=>setTypeFilter(t)}>
        {aiQuizTypes[t]}<small>{items.filter(x=>(x.quiz.type??'single')===t).length}</small>
       </button>)}
      </div>}

      <div className="qb-toolbar-foot">
       <span className="muted">
        {kw||typeFilter!=='all'
         ?L(`已筛选出 ${filtered.length} / ${items.length} 道错题`,`Showing ${filtered.length} of ${items.length} mistakes`)
         :L(`当前共展示全部 ${items.length} 道错题`,`Showing all ${items.length} mistakes`)}
       </span>
       <div className="qb-toolbar-btns">
        <button type="button" className="button primary" disabled={!filtered.length} onClick={()=>onPractice(filtered)}>
         <RotateCcw size={15}/>{kw||typeFilter!=='all'?L(`重练筛选错题（${filtered.length} 题）`,`Practice filtered (${filtered.length})`):L(`重练全部错题（${items.length} 题）`,`Practice all (${items.length})`)}
        </button>
        {filtered.length>10&&<button type="button" className="button secondary" onClick={()=>onPractice(filtered.slice(0,10))}>
         <Play size={15}/>{L('随机抽 10 题重练','Practice 10 random')}
        </button>}
        <button type="button" className="button secondary qb-remove" onClick={onClearAll}>
         <Trash2 size={15}/>{L('清空错题本','Clear all')}
        </button>
       </div>
      </div>
     </div>
    </TitleGear>}
   </h1>
  </div>

  {items.length===0?<div className="ai-card qb-empty">
   <NotebookPen size={36}/>
   <h2>{L('错题本还是空的','No mistakes yet')}</h2>
   <p className="muted">{L('暂无错题','No mistakes yet')}</p>
   <button type="button" className="button primary" onClick={onBack}>{L('返回关卡地图','Back to levels')}</button>
  </div>:<>
   {filtered.length===0?<div className="ai-card qb-empty">
    <p className="muted">{L('没有匹配的错题','No matches')}</p>
    <button type="button" className="button secondary" onClick={()=>{setQuery('');setTypeFilter('all')}}>{L('清空筛选条件','Reset filters')}</button>
   </div>:<div className="qb-list">
    {filtered.map((entry,i)=><QuestionDetailCard
     key={entry.id}
     entry={entry}
     index={i}
     sourceTitle={sourceName(entry.level)}
     showAnswer={true}
     onPracticeOne={()=>onPractice([entry])}
     onRemoveMistake={()=>onRemove(entry.id)}
    />)}
   </div>}
  </>}
 </section>;
}

const PAGE_SIZE=30;

// 学科题库搜索面板：在关卡地图页直接搜索本学科所有关卡题和训练/考试题。
export function SubjectQuestionSearch({
 questions,
 sourceName,
 onPractice,
 onOpenSource,
}:{
 questions:BankEntry[];
 sourceName:(levelId:string)=>string;
 onPractice:(list:BankEntry[])=>void;
 onOpenSource:(entry:BankEntry)=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [query,setQuery]=useState('');
 const [typeFilter,setTypeFilter]=useState<AiQuizType|'all'>('all');
 const [showAllAnswers,setShowAllAnswers]=useState(false);
 const [limit,setLimit]=useState(PAGE_SIZE);
 const [openTypes,setOpenTypes]=useState(false);
 const panelRef=useRef<HTMLElement>(null);
 const kw=query.trim().toLowerCase();
 const active=kw.length>0||typeFilter!=='all';
 const showTypes=openTypes||active;

 useEffect(()=>{
  if(!openTypes)return;
  const onDown=(e:PointerEvent)=>{if(!panelRef.current?.contains(e.target as Node))setOpenTypes(false)};
  document.addEventListener('pointerdown',onDown);
  return()=>document.removeEventListener('pointerdown',onDown);
 },[openTypes]);

 const availableTypes=useMemo(()=>{
  const s=new Set<AiQuizType>();
  questions.forEach(q=>s.add(q.quiz.type??'single'));
  return [...s];
 },[questions]);

 const matched=useMemo(()=>{
  if(!active)return [];
  return questions.filter(it=>{
   if(typeFilter!=='all'&&(it.quiz.type??'single')!==typeFilter)return false;
   return matchEntry(it,sourceName(it.level),kw);
  });
 },[questions,active,typeFilter,kw,sourceName]);

 return <section className="ai-card qb-search-panel" ref={panelRef}>
  <div className="qb-search-row">
   <label className="qb-search-input" onClick={()=>setOpenTypes(true)}>
    <Search size={17}/>
    <input
     value={query}
     onFocus={()=>setOpenTypes(true)}
     onClick={()=>setOpenTypes(true)}
     onChange={e=>{setQuery(e.target.value);setLimit(PAGE_SIZE)}}
     placeholder={L(`搜索 ${questions.length} 道题目`,`Search ${questions.length} questions`)}
    />
    {query&&<button type="button" className="qb-clear" onClick={()=>{setQuery('');setLimit(PAGE_SIZE)}} aria-label={L('清空搜索','Clear search')}><X size={15}/></button>}
   </label>
  </div>

  {showTypes&&<div className="qb-type-chips">
   <button type="button" className={'lazy-chip'+(typeFilter==='all'?' on':'')} onClick={()=>{setTypeFilter('all');setLimit(PAGE_SIZE)}}>
    {L('全部题型','All')}<small>{questions.length}</small>
   </button>
   {availableTypes.map(t=><button key={t} type="button" className={'lazy-chip'+(typeFilter===t?' on':'')} onClick={()=>{setTypeFilter(prev=>prev===t?'all':t);setLimit(PAGE_SIZE)}}>
    {aiQuizTypes[t]}<small>{questions.filter(x=>(x.quiz.type??'single')===t).length}</small>
   </button>)}
  </div>}

  {active&&<div className="qb-search-results">
   <div className="qb-toolbar-foot">
    <span className="muted">{L(`找到 ${matched.length} 道匹配题目`,`Found ${matched.length} matching questions`)}</span>
    <div className="qb-toolbar-btns">
     {matched.length>0&&<>
      <button type="button" className="button secondary qb-btn" onClick={()=>setShowAllAnswers(v=>!v)}>
       {showAllAnswers?<><EyeOff size={14}/>{L('收起全部答案','Hide answers')}</>:<><Eye size={14}/>{L('展开全部答案与解析','Show all answers')}</>}
      </button>
      <button type="button" className="button primary qb-btn" onClick={()=>onPractice(matched.slice(0,25))}>
       <Play size={14}/>{matched.length>25?L('练习前 25 题','Practice first 25'):L(`练习这 ${matched.length} 题`,`Practice (${matched.length})`)}<ArrowRight size={14}/>
      </button>
     </>}
     <button type="button" className="button secondary qb-btn" onClick={()=>{setQuery('');setTypeFilter('all');setOpenTypes(false)}}>
      <X size={14}/>{L('关闭搜索','Close')}
     </button>
    </div>
   </div>

   {matched.length===0?<p className="muted qb-no-match">{L('没有匹配的题目','No matches')}</p>:<>
    <div className="qb-list">
     {matched.slice(0,limit).map((entry,i)=><QuestionDetailCard
      key={entry.id+'-'+i}
      entry={entry}
      index={i}
      sourceTitle={sourceName(entry.level)}
      showAnswer={showAllAnswers}
      onPracticeOne={()=>onPractice([entry])}
      onOpenSource={()=>onOpenSource(entry)}
     />)}
    </div>
    {limit<matched.length&&<div className="qb-more">
     <button type="button" className="button secondary" onClick={()=>setLimit(l=>l+PAGE_SIZE)}>
      {L(`再显示 ${Math.min(PAGE_SIZE,matched.length-limit)} 题（共 ${matched.length} 题）`,`Show more (${matched.length-limit} left)`)}
     </button>
     <button type="button" className="button secondary" onClick={()=>setLimit(matched.length)}>
      {L(`展开全部 ${matched.length} 题`,`Show all ${matched.length}`)}
     </button>
    </div>}
   </>}
  </div>}
 </section>;
}
