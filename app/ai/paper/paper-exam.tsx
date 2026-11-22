'use client';
import './paper.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Clock,Download,FileCheck2,FileText,RotateCcw,Send,Square} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import {paperLoaders} from '@/content/papers';
import {paperSections,PAPER_MINUTES,PAPER_TOTAL,type Paper} from '@/content/papers/types';
import {requestGrade,type GradeThinkState} from '../grade-client';
import ThinkBox from '../think-box';
import GradeModelPicker from '../grade-model-picker';
import {gradeModelBadge,type GradeResult} from '@/lib/grade-types';
import PaperQuestion from './paper-question';
import {PaperPrint} from './paper-print';
import {answered,fixFillGrade,isAiGradedQuiz,paperLayout,paperScore,toPaperGradeItem,type PaperAnswer,type PaperRecord} from './paper-score';
import {noteLocalWrite} from '@/app/components/cloud-sync';
import {reportError} from '@/app/components/report-error';
import {paperFor,varyPaper} from './paper-vary';
import type {AiQuiz} from '@/content/journey';
import {Component,type ReactNode} from 'react';
import {Pause,Play} from 'lucide-react';

const cn='零一二三四五六七';
const shuffle=(xs:number[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const read=(key:string):PaperRecord|null=>{try{return JSON.parse(localStorage.getItem(key)??'null')}catch{return null}};
const write=(key:string,r:PaperRecord|null)=>{try{if(r)localStorage.setItem(key,JSON.stringify(r));else localStorage.removeItem(key)}catch{}noteLocalWrite(key)};
const clock=(ms:number)=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};

// 150 分正式试卷：开考后计时 120 分钟，答案自动保存在本浏览器；交卷（或时间到）后才判分、显示解析。
// 开考前可以下载空白试卷（PDF），交卷后还可以下载答案与解析。
// onScored：每次得分确定或更新时回调（满分 150），由闯关页记录最佳成绩和是否通过。
// 试卷外面套一层兜底：试卷里任何地方报错，都只在这里显示出错提示（答卷已自动保存，不会丢），并把错误和答卷摘要上报，方便排查。
type Props={examId:string;title:string;passRate:number;storageKey:string;onScored:(score:number)=>void;pool?:AiQuiz[]};
class PaperBoundary extends Component<{examId:string;storageKey:string;children:ReactNode},{error:Error|null}>{
 state={error:null as Error|null};
 static getDerivedStateFromError(error:Error){return {error}}
 componentDidCatch(error:Error){const r=read(this.props.storageKey+'paper:'+this.props.examId);
  reportError(error,{examId:this.props.examId,context:r&&{startedAt:r.startedAt,submittedAt:r.submittedAt,pausedAt:r.pausedAt,answers:r.answers}})}
 render(){if(!this.state.error)return this.props.children;
  return <section className="ai-card paper-crash"><h2>试卷显示出错了</h2><p>你的答案已经自动保存在本浏览器里，不会丢失；这次错误已经自动记录，我们会尽快修复。可以先点“重试”，不行再刷新页面。</p>
   <div className="ai-result-actions"><button className="button primary" onClick={()=>this.setState({error:null})}>重试</button><button className="button secondary" onClick={()=>location.reload()}>刷新页面</button></div>
   <p className="muted">错误信息：{this.state.error.message}</p></section>}}
export default function PaperExam(props:Props){return <PaperBoundary examId={props.examId} storageKey={props.storageKey}><PaperExamInner {...props}/></PaperBoundary>}

const NO_POOL:AiQuiz[]=[];
function PaperExamInner({examId,title,passRate,storageKey,onScored,pool=NO_POOL}:Props){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const key=storageKey+'paper:'+examId;
 const [basePaper,setPaper]=useState<Paper|null|'error'>(null),[record,setRecordState]=useState<PaperRecord|null>(null),[now,setNow]=useState(0),[grading,setGrading]=useState(false),[pdf,setPdf]=useState('');
 const [printing,setPrinting]=useState<'paper'|'answers'|null>(null);
 // AI 阅卷时正在流式写出的各题评分（只用于显示，不存进答卷）。
 const [live,setLive]=useState<Record<string,GradeResult>>({});
 const printRef=useRef<HTMLDivElement>(null),scored=useRef(onScored),gradeAbortRef=useRef<AbortController|null>(null);useEffect(()=>{scored.current=onScored});useEffect(()=>()=>{gradeAbortRef.current?.abort()},[]);
 const stopGrading=()=>{gradeAbortRef.current?.abort()};
 const setRecord=(r:PaperRecord|null)=>{setRecordState(r);write(key,r)};
 useEffect(()=>{let live=true;const load=paperLoaders[examId];if(!load){setPaper('error');return}
  load().then(p=>{if(live){const r=read(key);setPaper(p);setRecordState(r);setNow(Date.now());if(r&&!r.submittedAt&&!r.pausedAt&&Date.now()>=r.startedAt+PAPER_MINUTES*60000+(r.pausedMs??0))setResumedLate(r.startedAt)}},()=>{if(live)setPaper('error')});return()=>{live=false}},[examId,key]);
 useEffect(()=>{const onSync=(e:StorageEvent)=>{if(!e.key||e.key===key)setRecordState(read(key))};window.addEventListener('storage',onSync);return()=>window.removeEventListener('storage',onSync)},[key]);
 // 这次实际作答的试卷：开考时换过的题记在 record.qids 里。
 const paper=useMemo(()=>basePaper&&basePaper!=='error'?paperFor(basePaper,pool,record?.qids):basePaper,[basePaper,pool,record?.qids]);
 const layout=useMemo(()=>paper&&paper!=='error'?paperLayout(paper):[],[paper]);
 const [wrongOnly,setWrongOnly]=useState(false);
 const [gradeModel,setGradeModel]=useState(''),[liveThink,setLiveThink]=useState<GradeThinkState|null>(null);
 // 重新打开时已经超过时限、却还没交卷的答卷（比如页面出错中断了）：不自动交卷，让人接着答完再手动交卷。
 const [resumedLate,setResumedLate]=useState<number|null>(null);
 const answering=!!record&&!record.submittedAt,overtime=!!record&&resumedLate===record.startedAt,deadline=record?record.startedAt+PAPER_MINUTES*60000+(record.pausedMs??0):0,paused=answering&&!!record?.pausedAt;
 useEffect(()=>{if(!answering||paused)return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[answering,paused]);

 // 交卷：填空题与主观题一次性交给 AI 评分（只算一次额度）；AI 不可用时，结果页里逐题对照得分点自评。
 async function submit(r:PaperRecord){const done:PaperRecord={...r,submittedAt:Date.now()};setRecord(done);await grade(done)}
 // 没作答的填空/主观题直接记 0 分；其余的一次请求评完。onlyMissing 为 true 时只补评已有答卷里还没评过的题（比如老答卷补评填空题）。
 async function grade(done:PaperRecord,onlyMissing=false){if(!paper||paper==='error'||gradeAbortRef.current)return;
  const qMap=Object.fromEntries(layout.map(x=>[x.q.id,x.q]));
  const items=layout.flatMap(x=>{if(onlyMissing&&done.written?.[x.q.id])return [];const it=toPaperGradeItem(x.q,x.max,done.answers[x.q.id]);return it?[it]:[]});
  const blank=Object.fromEntries(layout.filter(x=>isAiGradedQuiz(x.q)&&!answered(x.q,done.answers[x.q.id])).map(x=>[x.q.id,{kind:'self' as const,score:0,got:[]}]));
  if(!items.length){const next={...done,written:{...done.written,...blank}};setRecord(next);scored.current(paperScore(paper,next).total);return}
  const ctl=new AbortController();gradeAbortRef.current=ctl;
  setGrading(true);setLive({});setLiveThink(null);const res=await requestGrade(items,p=>setLive(Object.fromEntries(p.map(r=>[r.id,r]))),undefined,setLiveThink,ctl.signal);if(gradeAbortRef.current===ctl)gradeAbortRef.current=null;setGrading(false);setLive({});setLiveThink(null);
  if(ctl.signal.aborted||(!res.ok&&res.aborted)){
   if(done.submittedAt)autoGraded.current=done.submittedAt;
   const nextWritten={...done.written,...blank};
   const hasPending=layout.some(x=>isAiGradedQuiz(x.q)&&!nextWritten[x.q.id]);
   setRecord({...done,written:nextWritten,gradeNote:hasPending?L('已停止 AI 评分，可切换模型或点击「重新请求 AI 评分」，也可以在下方逐题对照得分点自评。','AI grading stopped. Switch models, retry AI grading, or self-check below.'):done.gradeNote});
   return;
  }
  if(res.ok&&res.model)setGradeModel(res.model);
  const next:PaperRecord=res.ok?{...done,gradeNote:undefined,gradeThink:res.think,gradeThinkSecs:res.thinkSecs,written:{...done.written,...blank,...Object.fromEntries(res.results.map(g=>[g.id,{kind:'ai' as const,result:qMap[g.id]?fixFillGrade(qMap[g.id],done.answers[g.id],g):g}]))}}:{...done,written:{...done.written,...blank},gradeNote:res.message};
  setRecord(next);if(res.ok)scored.current(paperScore(paper,next).total)}
 // 已有交卷记录但还有未评分的题（例如此前提交的试卷未对填空题做 AI 评分），打开试卷时自动补评。
 const autoGraded=useRef<number|null>(null);
 useEffect(()=>{if(!paper||paper==='error'||!record?.submittedAt||grading||record.gradeNote||autoGraded.current===record.submittedAt)return;
  if(layout.some(x=>isAiGradedQuiz(x.q)&&!record.written?.[x.q.id])){autoGraded.current=record.submittedAt;void grade(record,true)}},[paper,layout,record,grading]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(answering&&!paused&&!overtime&&now>=deadline&&record)void submit(record)},[now]); // eslint-disable-line react-hooks/exhaustive-deps -- 时间到自动交卷
 // 下载 PDF：先把纸质版渲染到屏幕外，渲染好后截图分页；完成后卸掉。
 useEffect(()=>{if(!printing||!printRef.current||!paper||paper==='error')return;const el=printRef.current,file=`${paper.title}-${printing==='paper'?'试卷':'答案与解析'}.pdf`;
  void import('./paper-pdf').then(m=>m.downloadPaperPdf(el,file)).then(()=>setPdf(''),()=>setPdf(L('PDF 生成失败，请重试。','Failed to create the PDF.'))).finally(()=>setPrinting(null))},[printing]); // eslint-disable-line react-hooks/exhaustive-deps
 const download=(mode:'paper'|'answers')=>{if(printing)return;setPdf(L('正在生成 PDF…','Creating PDF…'));setPrinting(mode)};

 // 作答期间页面上的其他报错（比如评分请求、事件处理里出错）也上报，带上试卷 id。
 useEffect(()=>{if(!answering)return;const onErr=(e:ErrorEvent)=>reportError(e.error??e.message,{examId});const onRej=(e:PromiseRejectionEvent)=>reportError(e.reason,{examId});
  window.addEventListener('error',onErr);window.addEventListener('unhandledrejection',onRej);return()=>{window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onRej)}},[answering,examId]);
 if(paper===null)return <p className="muted">{L('试卷加载中…','Loading the paper…')}</p>;
 if(paper==='error')return <p className="ai-exam-lock">{L('试卷加载失败，请检查网络后刷新重试。','Failed to load the paper. Please refresh.')}</p>;
 const pass=Math.ceil(PAPER_TOTAL*passRate),count=layout.length;
 const printout=printing&&<div className="paper-print-host" aria-hidden><PaperPrint ref={printRef} paper={paper} mode={printing} pass={pass}/></div>;
 const pdfNote=pdf&&<p className="muted paper-pdf-note">{pdf}</p>;

 if(!record)return <section className="ai-card paper-intro"><FileCheck2 size={36}/><h1>{paper.title}</h1>
  <ul>{paperSections.map((s,i)=>{const rows=layout.filter(x=>x.section===i),max=rows.reduce((n,x)=>n+x.max,0);return <li key={s.type}><span>{L(`${cn[i+1]}、${s.title}`,s.titleEn)}</span><b>{L(`${rows.length} 题 · ${max} 分`,`${rows.length} · ${max} pts`)}</b></li>})}</ul>
  <p>{L(`共 ${count} 题，满分 ${PAPER_TOTAL} 分，${pass} 分及格，限时 ${PAPER_MINUTES} 分钟。每种题型越往后越难。多选题少选、多选、错选都不得分。答案会自动保存，交卷或时间到之后才显示答案和解析；填空、简答、代码和综合题由 AI 评分（整份试卷算一次评分次数）。`,`${count} questions, ${PAPER_TOTAL} points, pass at ${pass}, ${PAPER_MINUTES} minutes. Answers appear only after you submit.`)}</p>
  <button className="button primary" onClick={()=>{
   // 开考：换一部分题（优先换成上次没出过的），记下这次的题号和选项顺序。
   let last:string[]=[];try{last=JSON.parse(localStorage.getItem('paper-seen:'+examId)||'[]')}catch{}
   const qs=varyPaper(paper,pool,last),lay=paperLayout({...paper,questions:qs});
   try{localStorage.setItem('paper-seen:'+examId,JSON.stringify(qs.map(q=>q.id)))}catch{}
   setNow(Date.now());setRecord({startedAt:Date.now(),qids:qs.map(q=>q.id),answers:{},orders:Object.fromEntries(lay.filter(x=>'options' in x.q).map(x=>[x.q.id,shuffle((x.q as {options:string[]}).options.map((_,i)=>i))]))})}}><Clock size={16}/>{L('开始答题','Start')}</button>
  <button className="button secondary" disabled={!!printing} onClick={()=>download('paper')}><FileText size={16}/>{L('下载试卷（PDF）','Download the paper (PDF)')}</button>{pdfNote}{printout}</section>;

 // 暂停：记下暂停时间并保存，题目先收起来；可以直接关掉页面，下次打开这份试卷点“继续作答”接着答，暂停的时间不算进考试用时。
 const pause=()=>{if(record&&!record.pausedAt)setRecord({...record,pausedAt:Date.now()})};
 const resume=()=>{if(!record?.pausedAt)return;const t=Date.now();setRecord({...record,pausedAt:undefined,pausedMs:(record.pausedMs??0)+(t-record.pausedAt)});setNow(t)};
 if(paused){const done=layout.filter(x=>answered(x.q,record.answers[x.q.id])).length,left=deadline-record.pausedAt!;
  return <section className="ai-card paper-paused"><Pause size={28}/><h2>{L('答题已暂停','Paused')}</h2>
   <p>{L(`已答 ${done} / ${count} 题，剩余时间 ${clock(left)}（暂停期间不计时）。`,`${done} / ${count} answered, ${clock(left)} left (the clock is stopped).`)}</p>
   <p className="muted">{L('答案已自动保存','Answers saved')}</p>
   <button className="button primary" onClick={resume}><Play size={16}/>{L('继续作答','Continue')}</button></section>}
 if(answering){const done=layout.filter(x=>answered(x.q,record.answers[x.q.id])).length,left=deadline-now;
  const setAnswer=(id:string,a:PaperAnswer)=>setRecord({...record,answers:{...record.answers,[id]:a}});
  return <div className="paper">
   <div className="paper-bar"><span className={'paper-clock'+(left<10*60000?' urgent':'')}><Clock size={16}/>{overtime?L('已超时，可继续作答','Over time — you can still finish'):clock(left)}</span><span>{L(`已答 ${done} / ${count}`,`${done} / ${count} answered`)}</span><button type="button" className="button secondary paper-pause" onClick={pause}><Pause size={16}/>{L('暂停','Pause')}</button>
    <button className="button primary" onClick={()=>{const miss=count-done;if(!miss||window.confirm(L(`还有 ${miss} 题没答，确定交卷吗？交卷后不能再修改。`,`${miss} unanswered. Submit anyway?`)))void submit(record)}}><Send size={16}/>{L('交卷','Submit')}</button></div>
   {/* 题号跳转用 scrollIntoView，不改地址栏的 #：改 # 会触发 popstate，闯关页会把它当成“返回”而切走画面。 */}<nav className="paper-nav" aria-label={L('题号','Questions')}>{layout.map((x,i)=><a key={x.q.id} href={'#pq-'+(i+1)} onClick={e=>{e.preventDefault();document.getElementById('pq-'+(i+1))?.scrollIntoView({behavior:'smooth',block:'start'})}} className={answered(x.q,record.answers[x.q.id])?'on':''}>{i+1}</a>)}</nav>
   <h1 className="paper-title">{paper.title}</h1>
   {paperSections.map((s,si)=>{const rows=layout.map((x,i)=>({...x,no:i+1})).filter(x=>x.section===si),max=rows.reduce((n,x)=>n+x.max,0);
    return <section key={s.type} className="paper-section"><h2>{L(`${cn[si+1]}、${s.title}（共 ${rows.length} 题，${max} 分）`,`${s.titleEn} (${rows.length} questions, ${max} pts)`)}</h2>
     {rows.map(x=><PaperQuestion key={x.q.id} q={x.q} no={x.no} max={x.max} answer={record.answers[x.q.id]} order={record.orders?.[x.q.id]} onChange={a=>setAnswer(x.q.id,a)}/>)}</section>})}
   <div className="ai-result-actions"><GradeModelPicker disabled={grading}/><button className="button primary" onClick={()=>void submit(record)}><Send size={16}/>{L('交卷','Submit')}</button></div></div>}

 const score=paperScore(paper,record),ok=score.total>=pass,pending=layout.filter(x=>isAiGradedQuiz(x.q)&&!record.written?.[x.q.id]).length;
 const selfScore=(id:string)=>(s:number,got:boolean[])=>{const next={...record,written:{...record.written,[id]:{kind:'self' as const,score:s,got}}};setRecord(next);if(layout.every(x=>!isAiGradedQuiz(x.q)||next.written[x.q.id]))scored.current(paperScore(paper,next).total)};
 // 下载答案、下载试卷、重新作答放在试卷最上面，交卷后不用滚到底部就能找到。
 return <div className="paper"><div className="ai-result-actions paper-actions top"><button className="button primary" disabled={!!printing} onClick={()=>download('answers')}><Download size={16}/>{L('下载答案与解析（PDF）','Download answers (PDF)')}</button>
   <button className="button secondary" disabled={!!printing} onClick={()=>download('paper')}><FileText size={16}/>{L('下载试卷（PDF）','Download the paper (PDF)')}</button>
   <button className="button secondary" onClick={()=>{if(window.confirm(L('重新作答会清空这份答卷（最佳成绩会保留），确定吗？','Start over? This clears the current answers.'))){stopGrading();setRecord(null)}}}><RotateCcw size={16}/>{L('重新作答','Start over')}</button></div>
  {pdfNote}<div className="paper-sheet">
  <section className="ai-card paper-score"><h1>{paper.title}</h1>
   <p className="paper-total"><b>{score.total}</b> / {PAPER_TOTAL}<span className={ok?'pass':'fail'}>{grading?L('AI 评分中…','Grading…'):pending?L(`还有 ${pending} 题待评分`,`${pending} to score`):ok?L('通过','Passed'):L(`未通过（${pass} 分及格）`,`Not passed (pass ${pass})`)}</span></p>
   <table><tbody>{score.sections.map(s=><tr key={s.type}><th>{L(s.title,s.titleEn)}</th><td>{s.got} / {s.max}</td></tr>)}</tbody></table>
   <p className="muted">{L(`交卷时间：${new Date(record.submittedAt!).toLocaleString('zh-CN')}，用时 ${clock(record.submittedAt!-record.startedAt)}`,`Submitted ${new Date(record.submittedAt!).toLocaleString()}`)}</p>
   {record.gradeNote&&<p className="ai-grade-error">{record.gradeNote}</p>}
   {(grading?liveThink?.text:record.gradeThink)&&<ThinkBox text={(grading?liveThink?.text:record.gradeThink)??''} live={grading&&liveThink?.live} secs={grading?liveThink?.secs:record.gradeThinkSecs} L={L}/>}{grading?<div className="ai-result-actions"><GradeModelPicker disabled/><button type="button" className="button ai-grade-stop" onClick={stopGrading}><Square size={14} fill="currentColor"/>{L('停止评分','Stop grading')}</button></div>:<div className="ai-result-actions"><GradeModelPicker disabled={grading}/><button className="button secondary paper-regrade" onClick={()=>void grade(record,false)}><RotateCcw size={16}/>{pending>0?L('重新请求 AI 评分','Retry AI grading'):L('重新 AI 评分','Re-grade with AI')}</button></div>}{gradeModel&&<small className="ai-grade-model-tag">{gradeModelBadge(gradeModel,locale==='en'?'en':'zh')}</small>}</section>
  <div className="paper-filter" role="group" aria-label={L('显示哪些题','Which questions')}><button type="button" className={!wrongOnly?'on':''} onClick={()=>setWrongOnly(false)}>{L('全部题目','All')}</button><button type="button" className={wrongOnly?'on':''} onClick={()=>setWrongOnly(true)}>{L(`只看错题（${score.rows.filter(x=>x.got<x.max).length}）`,`Wrong only (${score.rows.filter(x=>x.got<x.max).length})`)}</button></div>
  {paperSections.map((s,si)=>{const all=score.rows.map((x,i)=>({...x,no:i+1})).filter(x=>x.section===si),rows=wrongOnly?all.filter(x=>x.got<x.max):all;
   if(!rows.length)return null; // 只看错题时，这个题型全对就不显示
   return <section key={s.type} className="paper-section"><h2>{L(`${cn[si+1]}、${s.title}（${all.reduce((n,x)=>n+x.got,0)} / ${all.reduce((n,x)=>n+x.max,0)} 分）`,`${s.titleEn}`)}</h2>
    {rows.map(x=><PaperQuestion key={x.q.id} q={x.q} no={x.no} max={x.max} answer={record.answers[x.q.id]} order={record.orders?.[x.q.id]} review={{got:x.got,written:record.written?.[x.q.id],live:grading&&isAiGradedQuiz(x.q)&&answered(x.q,record.answers[x.q.id])?live[x.q.id]??null:undefined,onSelfScore:isAiGradedQuiz(x.q)&&!grading?selfScore(x.q.id):undefined,onStop:grading?stopGrading:undefined}}/>)}</section>})}
 </div>
  {printout}</div>}
