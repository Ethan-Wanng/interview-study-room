'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ChevronDown,ChevronUp,Eye,EyeOff,PenLine,RotateCcw,Shuffle,Sparkles,Square} from 'lucide-react';
import CardSideNav from '../components/card-side-nav';
import {useI18n} from '../components/i18n';
import TitleTip,{TitleGear} from '../components/title-tip';
import KeywordText,{EnWords,findTerms,termDefinition} from '../components/keyword-text';
import VoiceButton from '../components/voice-input';
import AddToNoteButton from '../components/add-to-note';
import {glossary} from '@/content/glossary';
import {glossaryAliases} from '@/content/glossary.en';
import type {AiLevel} from '@/content/journey';
import type {GradeResult} from '@/lib/grade-types';
import {gradeQuota,requestGrade,toGradeItem,toStandardItem,type GradeThinkState} from './grade-client';
import GradeModelPicker from './grade-model-picker';
import {AnnotatedAnswerBox} from './grade-view';
import {StandardAnswerBox,StandardAnswerButton,type StandardRecord,useStandardAnswer} from './standard-answer-box';
import {markdownEditing} from './code-input';
import type {BankEntry} from './question-browser';
import type {TutorQuiz} from '@/lib/tutor-types';
import AiDock from './ai-dock';

// 同义术语归并：指向同一个概念的中英文或简称只生成一张名词卡、在单题名词列表里也只出现一次。
const SYNONYM_MAP:Record<string,string>={
 '大语言模型':'LLM',
 '检索增强生成':'RAG',
 '切片':'slice',
 'B+树':'B+ 树',
 'context window':'上下文窗口',
 'Function Calling':'工具调用',
 'Model Context Protocol':'MCP',
 ...glossaryAliases,
};
const DISPLAY_TITLE:Record<string,string>={
 'LLM':'LLM（大语言模型）',
 'RAG':'RAG（检索增强生成）',
 'slice':'slice（切片）',
 '上下文窗口':'上下文窗口（context window）',
 '工具调用':'工具调用（Function Calling）',
 'MCP':'MCP（Model Context Protocol）',
};
export const canonicalTerm=(k:string)=>SYNONYM_MAP[k]??k;
const termGroup=(canon:string)=>{
 const set=new Set<string>([canon]);
 for(const [alias,target] of Object.entries(SYNONYM_MAP))if(target===canon)set.add(alias);
 return [...set];
};

// 检查某段文本（如已有题目题干或参考答案）是否已经包含该术语或其解释，避免重复收录。
function termInText(text:string,term:string):boolean{
 if(/^[A-Za-z0-9_.+-]+$/.test(term)){
  const esc=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_])(${esc})($|[^A-Za-z0-9_])`,'i').test(text);
 }
 return text.toLowerCase().includes(term.toLowerCase());
}

export function isTermAlreadyExplained(reference:string,def:string):boolean{
 if(!reference||!def)return false;
 const clean=(s:string)=>s.replace(/^[^：:]+[：:]\s*/,'').trim();
 const core=clean(def);
 if(reference.includes(core))return true;
 const clauses=core.split(/[；;。，,]/).map(s=>s.trim()).filter(s=>s.length>=4);
 if(!clauses.length)return false;
 const hitCount=clauses.filter(c=>reference.includes(c)).length;
 return hitCount>=Math.ceil(clauses.length*0.6);
}

function toTermPoints(display:string,def:string):string[]{
 const parts=def.split(/[；;。]/).map(s=>s.trim()).filter(Boolean);
 if(parts.length>=2)return parts.slice(0,3);
 return [`准确说明「${display}」的全称（含英文全称）与基本定义`,`说明「${display}」的核心用处或解决的问题`];
}

// 构建背题模式题库：保留原有简答题，并把各关出现的名词（解释与用处）加入背题模式；
// 加入前严格检查已有题目是否已经考过或包含该名词解释，避免重复。
export function buildReciteItems(levels:AiLevel[],baseItems:BankEntry[],subjectId?:string):BankEntry[]{
 if(subjectId==='english')return baseItems;
 const seenCanon=new Set<string>();
 // 1. 检查已有简答题中是否已经存在该名词的提问或完整解释
 for(const it of baseItems){
  if(it.id.startsWith('term:'))seenCanon.add(canonicalTerm(it.id.slice(5)));
  const qText=it.quiz.q;
  const refText=it.quiz.type==='short'?it.quiz.reference:'';
  for(const key of Object.keys(glossary)){
   const canon=canonicalTerm(key);
   if(seenCanon.has(canon))continue;
   const def=glossary[canon]??glossary[key];
   if(termInText(qText,key)||isTermAlreadyExplained(refText,def)){
    seenCanon.add(canon);
   }
  }
 }

 const termByLevel=new Map<string,BankEntry[]>();
 for(const lv of levels){
  const lessonText=lv.lessons.map(c=>`${c.title}\n${c.body}`).join('\n');
  const found=findTerms(lessonText);
  const list:BankEntry[]=[];
  for(const rawKey of found){
   const canon=canonicalTerm(rawKey);
   if(seenCanon.has(canon))continue;
   const def=glossary[canon]??glossary[rawKey];
   if(!def)continue;
   // 若该名词的同义词已经在已有简答题题干里出现过，也跳过不重复生成
   if(termGroup(canon).some(alias=>baseItems.some(b=>termInText(b.quiz.q,alias)))){
    seenCanon.add(canon);
    continue;
   }
   seenCanon.add(canon);
   const display=DISPLAY_TITLE[canon]??canon;
   list.push({
    id:`term:${canon}`,
    level:lv.id,
    quiz:{
     id:`term:${canon}`,
     type:'short',
     q:`【名词】什么是「${display}」？它的解释或用处是什么？`,
     reference:def,
     points:toTermPoints(display,def),
     explain:def,
    },
   });
  }
  if(list.length)termByLevel.set(lv.id,list);
 }

 // 按关卡顺序排列：每关先放原有简答题，再放本关新增的名词解释题；最后放阶段训练/考试简答题。
 const out:BankEntry[]=[];
 const usedBase=new Set<string>();
 for(const lv of levels){
  for(const b of baseItems){
   if(b.level===lv.id){out.push(b);usedBase.add(b.id)}
  }
  const terms=termByLevel.get(lv.id);
  if(terms)out.push(...terms);
 }
 for(const b of baseItems){
  if(!usedBase.has(b.id))out.push(b);
 }
 return out;
}

type GradeRecord={result:GradeResult;remaining?:number;answer?:string;model?:string;think?:string;secs?:number};
type ReciteSession={
 source?:string;
 kindFilter?:'all'|'qa'|'term';
 onlyNew?:boolean;
 order?:string[]|null;
 currentId?:string;
 open?:boolean;
 writeOpen?:boolean;
};
type Saved={
 known:string[];
 openByDefault:boolean;
 writeByDefault?:boolean;
 drafts?:Record<string,string>;
 grades?:Record<string,GradeRecord>;
 standards?:Record<string,StandardRecord>;
 session?:ReciteSession;
};
const read=(key:string):Saved=>{
 try{
  const v=JSON.parse(localStorage.getItem(key)||'{}');
  const drafts:Record<string,string>={};
  if(v.drafts&&typeof v.drafts==='object'){
   for(const [k,val] of Object.entries(v.drafts))if(typeof val==='string')drafts[k]=val;
  }
  const grades:Record<string,GradeRecord>={};
  if(v.grades&&typeof v.grades==='object'){
   for(const [k,val] of Object.entries(v.grades))if(val&&typeof val==='object'&&'result' in val)grades[k]=val as GradeRecord;
  }
  const session=v.session&&typeof v.session==='object'?v.session as ReciteSession:undefined;
  const standards:Record<string,StandardRecord>={};
  if(v.standards&&typeof v.standards==='object'){
   for(const [k,val] of Object.entries(v.standards))if(val&&typeof val==='object'&&'text' in val&&typeof (val as {text:unknown}).text==='string')standards[k]=val as StandardRecord;
  }
  return {known:Array.isArray(v.known)?v.known:[],openByDefault:!!v.openByDefault,writeByDefault:!!v.writeByDefault,drafts,grades,standards,session};
 }catch{return {known:[],openByDefault:false,writeByDefault:false,drafts:{},grades:{},standards:{}}}
};
const shuffled=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const fmtScore=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
function filterList(items:BankEntry[],source:string,kindFilter:'all'|'qa'|'term',onlyNew:boolean,order:string[]|null,known:Set<string>){
 const base=items.filter(e=>{
  const isTerm=e.id.startsWith('term:');
  if(kindFilter==='qa'&&isTerm)return false;
  if(kindFilter==='term'&&!isTerm)return false;
  return (source==='all'||e.level===source)&&(!onlyNew||!known.has(e.id));
 });
 return order?order.map(id=>base.find(e=>e.id===id)).filter((e):e is BankEntry=>!!e):base;
}

export default function ReciteView({items,storageKey,sourceName,backHref,onOpenSource}:{items:BankEntry[];storageKey:string;sourceName:(levelId:string)=>string;backHref?:string;onOpenSource:(e:BankEntry)=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [saved,setSaved]=useState<Saved>({known:[],openByDefault:false,writeByDefault:false,drafts:{},grades:{}}),[source,setSource]=useState('all'),[kindFilter,setKindFilter]=useState<'all'|'qa'|'term'>('all'),[onlyNew,setOnlyNew]=useState(false),[order,setOrder]=useState<string[]|null>(null),[index,setIndex]=useState(0),[open,setOpen]=useState(false),[writeOpen,setWriteOpen]=useState(false);
 const [draft,setDraft]=useState(''),[grading,setGrading]=useState(false),[live,setLive]=useState<GradeResult|null>(null),[liveThink,setLiveThink]=useState<GradeThinkState|null>(null),[graded,setGraded]=useState<GradeRecord|null>(null),[editing,setEditing]=useState(false),[gradeError,setGradeError]=useState(''),[left,setLeft]=useState<number|null>(null),[loadedKey,setLoadedKey]=useState('');
 const savedRef=useRef<Saved>({known:[],openByDefault:false,writeByDefault:false,drafts:{},grades:{}}),draftRef=useRef(''),currentIdRef=useRef<string|undefined>(undefined),justRestoredRef=useRef(false),gradeAbortRef=useRef<AbortController|null>(null);
 useEffect(()=>()=>{gradeAbortRef.current?.abort()},[]);
 const stopDraftGrading=()=>{gradeAbortRef.current?.abort()};
 const writeStorage=(next:Saved)=>{savedRef.current=next;try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}};
 const save=(next:Saved)=>{setSaved(next);writeStorage(next)};
 const savePatch=(patch:Partial<Saved>)=>save({...savedRef.current,...patch});
 useEffect(()=>{
  gradeAbortRef.current?.abort();gradeAbortRef.current=null;
  const s=read(storageKey);
  savedRef.current=s;setSaved(s);
  const ses=s.session;
  const nextSource=ses?.source&&(ses.source==='all'||items.some(x=>x.level===ses.source))?ses.source:'all';
  const nextKind=ses?.kindFilter==='qa'||ses?.kindFilter==='term'?ses.kindFilter:'all';
  const nextOnlyNew=!!ses?.onlyNew;
  const nextOrder=Array.isArray(ses?.order)?ses.order:null;
  const nextList=filterList(items,nextSource,nextKind,nextOnlyNew,nextOrder,new Set(s.known));
  const found=ses?.currentId?nextList.findIndex(x=>x.id===ses.currentId):-1;
  const nextIndex=found>=0?found:0,cur=nextList[nextIndex];
  const d=cur?(s.drafts?.[cur.id]??''):'';
  const g=cur?(s.grades?.[cur.id]??null):null,std=cur?(s.standards?.[cur.id]??null):null;
  const editedSinceGrade=!!(g&&g.answer!==undefined&&g.answer!==d);
  setSource(nextSource);setKindFilter(nextKind);setOnlyNew(nextOnlyNew);setOrder(nextOrder);setIndex(nextIndex);
  setOpen(ses?.open!==undefined?ses.open:s.openByDefault);
  setWriteOpen(ses?.writeOpen!==undefined?(ses.writeOpen||!!d||!!g||!!std):(!!s.writeByDefault||!!d||!!g||!!std));
  draftRef.current=d;setDraft(d);setGraded(g);setGrading(false);setLive(null);setLiveThink(null);setEditing(editedSinceGrade);setGradeError('');
  currentIdRef.current=cur?.id;justRestoredRef.current=true;setLoadedKey(storageKey);
 },[storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{void gradeQuota().then(setLeft)},[]);
 const known=useMemo(()=>new Set(saved.known),[saved.known]);
 const sources=useMemo(()=>[...new Set(items.map(e=>e.level))],[items]);
 const termTotal=useMemo(()=>items.filter(e=>e.id.startsWith('term:')).length,[items]);
 const qaTotal=items.length-termTotal;
 const list=useMemo(()=>filterList(items,source,kindFilter,onlyNew,order,known),[items,source,kindFilter,onlyNew,order,known]);
 const at=Math.min(index,Math.max(0,list.length-1)),e=list[at];
 useEffect(()=>{currentIdRef.current=e?.id},[e?.id]);
 const loadForQuestion=(id:string|undefined,keepOpen?:boolean)=>{
  gradeAbortRef.current?.abort();gradeAbortRef.current=null;
  const s=savedRef.current,d=id?(s.drafts?.[id]??''):'',g=id?(s.grades?.[id]??null):null,std=id?(s.standards?.[id]??null):null;
  const editedSinceGrade=!!(g&&g.answer!==undefined&&g.answer!==d);
  draftRef.current=d;setDraft(d);setGrading(false);setLive(null);setLiveThink(null);setGraded(g);setEditing(editedSinceGrade);setGradeError('');
  setWriteOpen(keepOpen??(!!s.writeByDefault||!!d||!!g||!!std));
 };
 useEffect(()=>{
  if(loadedKey!==storageKey)return;
  if(justRestoredRef.current){justRestoredRef.current=false;return}
  loadForQuestion(e?.id);
 },[e?.id,loadedKey,storageKey]);
 const persistSession=(currentId=e?.id)=>{
  const nextSession:ReciteSession={source,kindFilter,onlyNew,order,currentId,open,writeOpen};
  writeStorage({...savedRef.current,session:nextSession});
 };
 useEffect(()=>{if(loadedKey===storageKey)persistSession(e?.id)},[loadedKey,storageKey,source,kindFilter,onlyNew,order,e?.id,open,writeOpen]); // eslint-disable-line react-hooks/exhaustive-deps
 const changeDraft=(nextText:string)=>{
  draftRef.current=nextText;setDraft(nextText);
  if(!e)return;
  const prev=savedRef.current,drafts={...(prev.drafts??{})};
  if(nextText)drafts[e.id]=nextText;else delete drafts[e.id];
  writeStorage({...prev,drafts});
 };
 const go=(i:number)=>{if(i<0||i>=list.length)return;setIndex(i);setOpen(saved.openByDefault)};
 const mark=(yes:boolean)=>{if(!e)return;savePatch({known:yes?[...new Set([...savedRef.current.known,e.id])]:savedRef.current.known.filter(id=>id!==e.id)});if(yes&&!onlyNew)go(at+1);else setOpen(savedRef.current.openByDefault)};
 useEffect(()=>{const onKey=(ev:KeyboardEvent)=>{if((ev.target as HTMLElement).closest('input,textarea,select,button,a'))return;
   if(ev.key==='ArrowRight')go(at+1);else if(ev.key==='ArrowLeft')go(at-1);else if(ev.key===' '){ev.preventDefault();setOpen(v=>!v)}};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)});
 const q=e?.quiz,total=items.length,done=items.filter(x=>known.has(x.id)).length;
 const isTermCard=!!e?.id.startsWith('term:');
 // 单题内涉及到的其他名词解释（去重，且检查参考答案中是否已经包含其解释，不重复展示）
 const extraTerms=useMemo(()=>{
  if(!q||q.type!=='short'||isTermCard)return [];
  const raw=findTerms(q.q,q.reference,q.explain,...q.points);
  const seen=new Set<string>();
  const res:{key:string;def:string}[]=[];
  for(const k of raw){
   const canon=canonicalTerm(k);
   if(seen.has(canon))continue;
   seen.add(canon);
   const def=termDefinition(canon,locale)||termDefinition(k,locale);
   if(!def||isTermAlreadyExplained(q.reference,def))continue;
   res.push({key:DISPLAY_TITLE[canon]??canon,def});
  }
  return res;
 },[q,isTermCard,locale]);

 const submitDraft=async()=>{
  const targetId=e?.id,targetDraft=draftRef.current;
  if(!q||q.type!=='short'||!targetDraft.trim()||grading||!targetId||gradeAbortRef.current)return;
  const ctl=new AbortController();gradeAbortRef.current=ctl;
  setGrading(true);setLive(null);setLiveThink(null);setEditing(false);setGradeError('');
  const r=await requestGrade([toGradeItem(q,targetDraft)],p=>{if(currentIdRef.current===targetId)setLive(p[0])},undefined,t=>{if(currentIdRef.current===targetId)setLiveThink(t)},ctl.signal);
  if(gradeAbortRef.current===ctl)gradeAbortRef.current=null;
  if(currentIdRef.current===targetId){setGrading(false);setLive(null);setLiveThink(null)}
  if(ctl.signal.aborted||(!r.ok&&r.aborted)){void gradeQuota().then(setLeft);return}
  if(r.ok){
   const rec:GradeRecord={result:r.results[0],remaining:r.remaining,answer:targetDraft,model:r.model,think:r.think,secs:r.thinkSecs};
   if(typeof r.remaining==='number')setLeft(r.remaining);
   const prev=savedRef.current,grades={...(prev.grades??{}),[targetId]:rec};
   save({...prev,grades});
   if(currentIdRef.current===targetId)setGraded(rec);
  }else if(currentIdRef.current===targetId){
   setGradeError(r.message);if(r.quota)setLeft(0);
  }
 };
 const stdItem=q&&q.type==='short'?toStandardItem(q,draft):undefined;
 const std=useStandardAnswer({
  keyId:e?.id??'',
  item:stdItem,
  initial:e?saved.standards?.[e.id]:undefined,
  onRemaining:setLeft,
  onQuotaOut:()=>setLeft(0),
  onSaved:(rec,targetId)=>{
   const prev=savedRef.current,standards={...(prev.standards??{})};
   if(rec)standards[targetId]=rec;else delete standards[targetId];
   save({...prev,standards});
  },
 });
 const reciteQuiz:TutorQuiz|null=e&&q&&q.type==='short'?{
  type:isTermCard?L('名词解释','Term'):L('简答题','Short answer'),
  q:q.q.slice(0,4000),
  ...(q.code?{code:q.code.slice(0,6000)}:{}),
  answer:(q.reference||q.explain||'（见要点）').slice(0,12000),
  explain:[
   q.explain&&q.explain!==q.reference?q.explain:'',
   q.points.length?`评分要点：\n${q.points.map((p,i)=>`${i+1}. ${p}`).join('\n')}`:'',
   graded?`AI 评分：${fmtScore(graded.result.score)} / ${graded.result.max} 分${graded.result.feedback?`\n评分总评：${graded.result.feedback}`:''}`:'',
  ].filter(Boolean).join('\n\n').slice(0,6000)||'（无补充解析）',
  ...(graded?{given:(graded.answer??draft).trim().slice(0,8000),correct:graded.result.score>=0.6*graded.result.max}:draft.trim()?{given:draft.trim().slice(0,8000)}:{}),
 }:null;
  return <>
  <div className="ai-title"><span className="eyebrow">RECITE</span><h1>{L('背题模式','Recite mode')}<TitleTip><p>{L(`简答题 ${qaTotal} · 名词 ${termTotal} · 已记住 ${done} / ${total}`,`${qaTotal} questions · ${termTotal} terms · ${done} / ${total} memorised`)}</p></TitleTip><TitleGear active={source!=='all'||kindFilter!=='all'||onlyNew||!!order} label={L('背题设置','Recite settings')}>
   <div className="rc-gear">
    <div className="rc-gear-selects">
     <select value={source} onChange={ev=>{setSource(ev.target.value);setIndex(0);setOrder(null)}} aria-label={L('选择范围','Scope')}><option value="all">{L(`全部关卡和训练（${total}）`,`Everything (${total})`)}</option>{sources.map(s=><option key={s} value={s}>{sourceName(s)}（{items.filter(x=>x.level===s).length}）</option>)}</select>
     {termTotal>0&&<select value={kindFilter} onChange={ev=>{setKindFilter(ev.target.value as 'all'|'qa'|'term');setIndex(0);setOrder(null)}} aria-label={L('题目类型','Type')}>
      <option value="all">{L(`全部类型（${total}）`,`All types (${total})`)}</option>
      <option value="qa">{L(`简答题（${qaTotal}）`,`Questions (${qaTotal})`)}</option>
      <option value="term">{L(`名词解释与用处（${termTotal}）`,`Terms & uses (${termTotal})`)}</option>
     </select>}
    </div>
    <div className="rc-gear-checks">
     <label><input type="checkbox" checked={onlyNew} onChange={ev=>{setOnlyNew(ev.target.checked);setIndex(0)}}/>{L('只看还没记住的','Only not memorised')}</label>
     <label><input type="checkbox" checked={saved.openByDefault} onChange={ev=>{savePatch({openByDefault:ev.target.checked});setOpen(ev.target.checked)}}/>{L('参考答案默认展开','Show answers by default')}</label>
     <label><input type="checkbox" checked={!!saved.writeByDefault} onChange={ev=>{savePatch({writeByDefault:ev.target.checked});setWriteOpen(ev.target.checked)}}/>{L('默写框默认展开','Show writing box by default')}</label>
    </div>
    <div className="rc-gear-actions">
     <button type="button" className="button secondary qb-btn" onClick={()=>{setOrder(order?null:shuffled(items.map(x=>x.id)));setIndex(0)}}><Shuffle size={14}/>{order?L('恢复顺序','In order'):L('打乱顺序','Shuffle')}</button>
     {done>0&&<button type="button" className="button secondary qb-btn" onClick={()=>{if(confirm(L('确定把所有题都改回“没记住”吗？','Reset all questions to “not memorised”?')))savePatch({known:[]})}}><RotateCcw size={14}/>{L('重新背','Start over')}</button>}
    </div>
   </div>
  </TitleGear></h1></div>
  {!e||!q||q.type!=='short'?<div className="ai-card qb-empty"><p className="muted">{total?L('这个范围里的题都记住了，可以在顶部「⚙ 设置」中换个范围，或取消“只看还没记住的”。','Everything here is memorised. Adjust scope or filters via ⚙ above.'):L('这门课还没有简答题。','This subject has no short-answer questions yet.')}</p>{total>0&&(source!=='all'||kindFilter!=='all'||onlyNew)&&<button type="button" className="button secondary" onClick={()=>{setSource('all');setKindFilter('all');setOnlyNew(false);setIndex(0)}}>{L('显示全部内容','Show all items')}</button>}</div>:
  <CardSideNav key={e.id} className="rc-stage" onPrev={at>0?()=>go(at-1):undefined} onNext={at<list.length-1?()=>go(at+1):undefined} prevLabel={L('上一题（左方向键）','Previous (Left arrow)')} nextLabel={L('下一题（右方向键）','Next (Right arrow)')}>
  <section className="ai-card ai-question rc-card">
   <div className="ai-tags"><span className={'ai-tag type '+(isTermCard?'t-fill':'t-short')}>{isTermCard?L('名词解释','Term'):L('简答','Short answer')}</span><span className="ai-tag">{sourceName(e.level)}</span><AddToNoteButton title={q.q.slice(0,56)} questionOnly={`### ${q.q}${q.code?`\n\n\`\`\`\n${q.code}\n\`\`\``:''}`} questionAndAnswer={[`### ${q.q}`,q.code?`\`\`\`\n${q.code}\n\`\`\``:'',`**${L('参考回答','Reference')}**：\n${q.reference}`,q.points.length?`**${L('要点','Key Points')}**：\n${q.points.map((p,i)=>`${i+1}. ${p}`).join('\n')}`:''].filter(Boolean).join('\n\n')} source={{kind:'quiz',label:`${L('背题模式','Recite Mode')} · ${sourceName(e.level)}`,href:backHref||'',questionId:e.id}} onBeforeNavigate={()=>persistSession(e.id)}/>{known.has(e.id)&&<span className="ai-tag rc-known"><Check size={13}/>{L('已记住','Memorised')}</span>}<span className="rc-count">{at+1} / {list.length}</span></div>
   <h2>{isTermCard?<EnWords text={q.q}/>:<KeywordText text={q.q}/>}</h2>
   {q.code&&<pre className="ai-snippet"><code>{q.code}</code></pre>}
   <div className="rc-toggles">
    <button type="button" className={'rc-toggle'+(writeOpen?' on':'')} aria-expanded={writeOpen} onClick={()=>setWriteOpen(v=>!v)}>
     <PenLine size={15}/>
     {writeOpen?L('隐藏默写与 AI 评分','Hide writing & AI grading'):graded?L(`展开默写与评分（${fmtScore(graded.result.score)} / ${graded.result.max}）`,`Show writing & score (${fmtScore(graded.result.score)} / ${graded.result.max})`):draft.trim()?L('展开默写（已保存答案）','Show saved answer'):L('自己写一遍（可 AI 评分）','Write your answer (AI grading)')}
     {writeOpen?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
    </button>
    <button type="button" className={'rc-toggle'+(open?' on':'')} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
     {open?<><EyeOff size={15}/>{L('折叠参考答案','Fold the reference answer')}<ChevronUp size={15}/></>:<><Eye size={15}/>{L('展开参考答案','Unfold the reference answer')}<ChevronDown size={15}/></>}
    </button>
   </div>
   {writeOpen&&<div className="ai-written rc-write">
    {(grading||(graded&&!editing))?(
     <AnnotatedAnswerBox answer={draft} result={grading?live:graded?.result} waiting={grading&&!live} live={grading} remaining={graded?.remaining??left??undefined} model={graded?.model} think={grading?liveThink?.text:graded?.think} thinkSecs={grading?liveThink?.secs:graded?.secs} thinking={grading&&liveThink?.live} onStop={grading?stopDraftGrading:undefined} onEdit={()=>setEditing(true)}/>
    ):(
     <textarea ref={markdownEditing} rows={4} value={draft} disabled={grading} spellCheck placeholder={L('默写','Write from memory')} onChange={ev=>changeDraft(ev.target.value)}/>
    )}
    <div className="ai-written-actions">
     {(!graded||editing)&&<VoiceButton className="written-voice" disabled={grading||std.loading} onText={t=>{const v=draftRef.current;changeDraft(v.trim()?v.replace(/\s+$/,'')+'\n'+t:t)}}/>}
     <GradeModelPicker disabled={grading||std.loading}/>
     <button type="button" className="button primary" disabled={grading||std.loading||!draft.trim()} onClick={()=>void submitDraft()}><Sparkles size={15}/>{grading?L('批注中…','Grading…'):graded?L('AI 重评','Re-grade'):gradeError?L('重试评分','Retry'):L('AI 评分','AI Grade')}</button>
     {grading&&<button type="button" className="button ai-grade-stop" onClick={stopDraftGrading}><Square size={14} fill="currentColor"/>{L('停止','Stop')}</button>}
     <StandardAnswerButton std={std} disabled={grading}/>
     {graded&&!grading&&<button type="button" className="button secondary" onClick={()=>setEditing(v=>!v)}><PenLine size={14}/>{editing?L('看批注','Annotations'):L('修改','Edit')}</button>}
     {(draft.trim()||graded)&&<button type="button" className="button secondary" disabled={grading||std.loading} onClick={()=>{draftRef.current='';setDraft('');setGraded(null);setEditing(false);setGradeError('');if(e){const prev=savedRef.current,drafts={...(prev.drafts??{})},grades={...(prev.grades??{})};delete drafts[e.id];delete grades[e.id];save({...prev,drafts,grades})}}}><RotateCcw size={14}/>{L('清空','Clear')}</button>}
     <button type="button" className="button secondary" disabled={grading||std.loading} onClick={()=>setWriteOpen(false)}><EyeOff size={14}/>{L('收起','Hide')}</button>
    </div>
    {gradeError&&<p className="ai-grade-error">{gradeError}</p>}
    {std.error&&<p className="ai-grade-error">{std.error}</p>}
    <StandardAnswerBox std={std}/>
   </div>}
   {open&&<div className="ai-reference rc-ref">
    <strong>{isTermCard?L('名词解释与用处','Explanation & usage'):L('参考答案','Reference answer')}</strong>
    <p><KeywordText text={q.reference}/></p>
    <strong>{L('评分要点（背的时候按这几条组织答案）','Key points')}</strong>
    <ul>{q.points.map(p=><li key={p}><KeywordText text={p}/></li>)}</ul>
    {extraTerms.length>0&&<div className="ai-terms"><strong>{L('本题涉及名词（解释与用处）','Terms in this question (explanation & usage)')}</strong><dl>{extraTerms.map(t=><div key={t.key}><dt><EnWords text={t.key}/></dt><dd><EnWords text={t.def}/></dd></div>)}</dl></div>}
   </div>}
   <div className="rc-actions">
    {known.has(e.id)?<button type="button" className="button secondary" onClick={()=>mark(false)}><RotateCcw size={16}/>{L('还没记住，再背','Not yet')}</button>:<button type="button" className="button primary" onClick={()=>mark(true)}><Check size={16}/>{L('记住了','Got it')}</button>}
    <button type="button" className="button secondary" onClick={()=>{persistSession(e.id);onOpenSource(e)}}><BookOpen size={16}/>{L('看对应的学习卡片','Open the lesson card')}</button>
   </div>
  </section></CardSideNav>}
  {reciteQuiz&&e&&<AiDock
   chatKey={`recite:${storageKey}:${e.id}`}
   context={{kind:'recite',quiz:reciteQuiz}}
   hello={L('我能看到你当前在背的这道题、参考答案和评分要点（有默写和评分也会一并看到）。问我“答案给一下”、“用大白话讲一遍”或让我出追问都可以：','I can see the question you are reciting, along with its reference answer, key points, and any draft or grade you submitted. Ask me for the answer, a plain explanation, or follow-up questions:')}
   prompts={[L('这道题的答案和要点给我讲一下','Give me the answer and key points'),L('用大白话和例子帮我记住这道题','Explain it simply with an example'),L('针对这道题，面试官会怎么追问？','What follow-up questions might an interviewer ask?')]}
   noteBackHref={backHref}
   onBeforeNoteLeave={()=>persistSession(e.id)}
  />}
 </>;
}
