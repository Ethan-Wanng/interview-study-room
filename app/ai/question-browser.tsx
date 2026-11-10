'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,Check,Eye,EyeOff,NotebookPen,Play,RotateCcw,Search,Trash2,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText,{EnWords} from '../components/keyword-text';
import {ListenButton,ReadingPassage} from '../components/speech-drill';
import {aiQuizTypes,type AiQuiz,type AiQuizType} from '@/content/journey';
import {answerText} from './question-card';

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
   <h1><NotebookPen size={28} style={{display:'inline',verticalAlign:'-5px',marginRight:8,color:'var(--primary)'}}/>{L(`错题本（共 ${items.length} 题）`,`Mistake Book (${items.length})`)}</h1>
   <p>{L('这里完整展示错题本中的全部题目、选项、正确答案与详解。你可以按关键词搜索错题，点击任意英语单词听发音，单题重练或一键重练全部错题。重练答对后会自动移出错题本。','All questions in your mistake book are shown in full here with answers and explanations. Search by keyword, tap any English word to hear it, or practice one or all mistakes.')}</p>
  </div>

  {items.length===0?<div className="ai-card qb-empty">
   <NotebookPen size={36}/>
   <h2>{L('错题本还是空的','No mistakes yet')}</h2>
   <p className="muted">{L('闯关答题或训练中答错的题目会自动收进这里，方便随时查阅和针对性重练。','Questions you miss in quizzes or trainings will automatically appear here for review.')}</p>
   <button type="button" className="button primary" onClick={onBack}>{L('返回关卡地图','Back to levels')}</button>
  </div>:<>
   <div className="ai-card qb-toolbar">
    <label className="qb-search-input">
     <Search size={17}/>
     <input
      value={query}
      onChange={e=>setQuery(e.target.value)}
      placeholder={L('在错题本中搜索题目、选项、代码、解析或关卡名…','Search mistakes by prompt, option, code, explanation or level…')}
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

   {filtered.length===0?<div className="ai-card qb-empty">
    <p className="muted">{L('没有找到匹配的错题，试试换个关键词。','No matching mistakes found. Try another keyword.')}</p>
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
 const kw=query.trim().toLowerCase();
 const active=kw.length>0||typeFilter!=='all';

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

 return <section className="ai-card qb-search-panel">
  <div className="qb-search-row">
   <label className="qb-search-input">
    <Search size={17}/>
    <input
     value={query}
     onChange={e=>{setQuery(e.target.value);setLimit(PAGE_SIZE)}}
     placeholder={L(`搜索本学科全部 ${questions.length} 道题目（输入题干、选项、代码、知识点或解析关键词）…`,`Search all ${questions.length} questions in this subject…`)}
    />
    {query&&<button type="button" className="qb-clear" onClick={()=>{setQuery('');setLimit(PAGE_SIZE)}} aria-label={L('清空搜索','Clear search')}><X size={15}/></button>}
   </label>
  </div>

  <div className="qb-type-chips">
   <button type="button" className={'lazy-chip'+(typeFilter==='all'&&!active?' on':typeFilter==='all'&&active?' on':'')} onClick={()=>{setTypeFilter('all');setLimit(PAGE_SIZE)}}>
    {L('全部题型','All')}<small>{questions.length}</small>
   </button>
   {availableTypes.map(t=><button key={t} type="button" className={'lazy-chip'+(typeFilter===t?' on':'')} onClick={()=>{setTypeFilter(prev=>prev===t?'all':t);setLimit(PAGE_SIZE)}}>
    {aiQuizTypes[t]}<small>{questions.filter(x=>(x.quiz.type??'single')===t).length}</small>
   </button>)}
  </div>

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
     <button type="button" className="button secondary qb-btn" onClick={()=>{setQuery('');setTypeFilter('all')}}>
      <X size={14}/>{L('关闭搜索','Close')}
     </button>
    </div>
   </div>

   {matched.length===0?<p className="muted qb-no-match">{L('没有找到匹配的题目，试试其他关键词。','No matching questions found.')}</p>:<>
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
