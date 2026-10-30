'use client';
import './paper.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Clock,Download,FileCheck2,RotateCcw,Send} from 'lucide-react';
import {useI18n} from '../../components/i18n';
import {paperLoaders} from '@/content/papers';
import {paperSections,PAPER_MINUTES,PAPER_TOTAL,type Paper} from '@/content/papers/types';
import {requestGrade} from '../grade-client';
import PaperQuestion from './paper-question';
import {answered,isWrittenQuiz,paperLayout,paperScore,type PaperAnswer,type PaperRecord} from './paper-score';

const cn='零一二三四五六七';
const shuffle=(xs:number[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const read=(key:string):PaperRecord|null=>{try{return JSON.parse(localStorage.getItem(key)??'null')}catch{return null}};
const write=(key:string,r:PaperRecord|null)=>{try{if(r)localStorage.setItem(key,JSON.stringify(r));else localStorage.removeItem(key)}catch{}};
const clock=(ms:number)=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};

// 150 分正式试卷：开考后计时 120 分钟，答案自动保存在本浏览器；交卷（或时间到）后才判分、显示解析，可下载 PDF 答卷。
// onScored：每次得分确定或更新时回调（满分 150），由闯关页记录最佳成绩和是否通过。
export default function PaperExam({examId,title,passRate,storageKey,onScored}:{examId:string;title:string;passRate:number;storageKey:string;onScored:(score:number)=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const key=storageKey+'paper:'+examId;
 const [paper,setPaper]=useState<Paper|null|'error'>(null),[record,setRecordState]=useState<PaperRecord|null>(null),[now,setNow]=useState(0),[grading,setGrading]=useState(false),[pdf,setPdf]=useState('');
 const sheet=useRef<HTMLDivElement>(null),scored=useRef(onScored);useEffect(()=>{scored.current=onScored});
 const setRecord=(r:PaperRecord|null)=>{setRecordState(r);write(key,r)};
 useEffect(()=>{let live=true;const load=paperLoaders[examId];if(!load){setPaper('error');return}
  load().then(p=>{if(live){setPaper(p);setRecordState(read(key));setNow(Date.now())}},()=>{if(live)setPaper('error')});return()=>{live=false}},[examId,key]);
 const layout=useMemo(()=>paper&&paper!=='error'?paperLayout(paper):[],[paper]);
 const answering=!!record&&!record.submittedAt,deadline=record?record.startedAt+PAPER_MINUTES*60000:0;
 useEffect(()=>{if(!answering)return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[answering]);

 // 交卷：主观题一次性交给 AI 评分（只算一次额度）；AI 不可用时，结果页里逐题对照得分点自评。
 async function submit(r:PaperRecord){const done:PaperRecord={...r,submittedAt:Date.now()};setRecord(done);await grade(done)}
 // 没作答的主观题直接记 0 分；其余的一次请求评完。失败时保留提示，可以重试，也可以自评。
 async function grade(done:PaperRecord){if(!paper||paper==='error')return;
  const items=layout.filter(x=>isWrittenQuiz(x.q)&&done.answers[x.q.id]?.text?.trim()).map(x=>{const w=x.q as Extract<typeof x.q,{reference:string}>;return {id:w.id,kind:w.type,q:w.q,code:w.code,reference:w.reference,points:w.points,scores:w.scores,max:x.max,answer:done.answers[w.id].text!}});
  const blank=Object.fromEntries(layout.filter(x=>isWrittenQuiz(x.q)&&!done.answers[x.q.id]?.text?.trim()).map(x=>[x.q.id,{kind:'self' as const,score:0,got:[]}]));
  if(!items.length){const next={...done,written:blank};setRecord(next);scored.current(paperScore(paper,next).total);return}
  setGrading(true);const res=await requestGrade(items);setGrading(false);
  const next:PaperRecord=res.ok?{...done,gradeNote:undefined,written:{...done.written,...blank,...Object.fromEntries(res.results.map(g=>[g.id,{kind:'ai' as const,result:g}]))}}:{...done,written:{...done.written,...blank},gradeNote:res.message};
  setRecord(next);if(res.ok)scored.current(paperScore(paper,next).total)}
 useEffect(()=>{if(answering&&now>=deadline&&record)void submit(record)},[now]); // eslint-disable-line react-hooks/exhaustive-deps -- 时间到自动交卷

 if(paper===null)return <p className="muted">{L('试卷加载中…','Loading the paper…')}</p>;
 if(paper==='error')return <p className="ai-exam-lock">{L('试卷加载失败，请检查网络后刷新重试。','Failed to load the paper. Please refresh.')}</p>;
 const pass=Math.ceil(PAPER_TOTAL*passRate),count=layout.length;

 if(!record)return <section className="ai-card paper-intro"><FileCheck2 size={36}/><h1>{paper.title}</h1>
  <ul>{paperSections.map((s,i)=>{const rows=layout.filter(x=>x.section===i),max=rows.reduce((n,x)=>n+x.max,0);return <li key={s.type}><span>{L(`${cn[i+1]}、${s.title}`,s.titleEn)}</span><b>{L(`${rows.length} 题 · ${max} 分`,`${rows.length} · ${max} pts`)}</b></li>})}</ul>
  <p>{L(`共 ${count} 题，满分 ${PAPER_TOTAL} 分，${pass} 分及格，限时 ${PAPER_MINUTES} 分钟。每种题型越往后越难。多选题少选、多选、错选都不得分。答案会自动保存，交卷或时间到之后才显示答案和解析；简答、代码和综合题由 AI 按得分点评分（整份试卷算一次评分次数）。`,`${count} questions, ${PAPER_TOTAL} points, pass at ${pass}, ${PAPER_MINUTES} minutes. Answers appear only after you submit.`)}</p>
  <button className="button primary" onClick={()=>{setNow(Date.now());setRecord({startedAt:Date.now(),answers:{},orders:Object.fromEntries(layout.filter(x=>'options' in x.q).map(x=>[x.q.id,shuffle((x.q as {options:string[]}).options.map((_,i)=>i))]))})}}><Clock size={16}/>{L('开始答题','Start')}</button></section>;

 if(answering){const done=layout.filter(x=>answered(x.q,record.answers[x.q.id])).length,left=deadline-now;
  const setAnswer=(id:string,a:PaperAnswer)=>setRecord({...record,answers:{...record.answers,[id]:a}});
  return <div className="paper">
   <div className="paper-bar"><span className={'paper-clock'+(left<10*60000?' urgent':'')}><Clock size={16}/>{clock(left)}</span><span>{L(`已答 ${done} / ${count}`,`${done} / ${count} answered`)}</span>
    <button className="button primary" onClick={()=>{const miss=count-done;if(!miss||window.confirm(L(`还有 ${miss} 题没答，确定交卷吗？交卷后不能再修改。`,`${miss} unanswered. Submit anyway?`)))void submit(record)}}><Send size={16}/>{L('交卷','Submit')}</button></div>
   <nav className="paper-nav" aria-label={L('题号','Questions')}>{layout.map((x,i)=><a key={x.q.id} href={'#pq-'+(i+1)} className={answered(x.q,record.answers[x.q.id])?'on':''}>{i+1}</a>)}</nav>
   <h1 className="paper-title">{paper.title}</h1>
   {paperSections.map((s,si)=>{const rows=layout.map((x,i)=>({...x,no:i+1})).filter(x=>x.section===si),max=rows.reduce((n,x)=>n+x.max,0);
    return <section key={s.type} className="paper-section"><h2>{L(`${cn[si+1]}、${s.title}（共 ${rows.length} 题，${max} 分）`,`${s.titleEn} (${rows.length} questions, ${max} pts)`)}</h2>
     {rows.map(x=><PaperQuestion key={x.q.id} q={x.q} no={x.no} max={x.max} answer={record.answers[x.q.id]} order={record.orders?.[x.q.id]} onChange={a=>setAnswer(x.q.id,a)}/>)}</section>})}
   <div className="ai-result-actions"><button className="button primary" onClick={()=>void submit(record)}><Send size={16}/>{L('交卷','Submit')}</button></div></div>}

 const score=paperScore(paper,record),ok=score.total>=pass,pending=layout.filter(x=>isWrittenQuiz(x.q)&&!record.written?.[x.q.id]).length;
 const selfScore=(id:string)=>(s:number,got:boolean[])=>{const next={...record,written:{...record.written,[id]:{kind:'self' as const,score:s,got}}};setRecord(next);if(layout.every(x=>!isWrittenQuiz(x.q)||next.written[x.q.id]))scored.current(paperScore(paper,next).total)};
 const name=paper.title;
 async function download(){setPdf(L('正在生成 PDF…','Creating PDF…'));try{const {downloadPaperPdf}=await import('./paper-pdf');await downloadPaperPdf(sheet.current!,`${name}-答卷.pdf`);setPdf('')}catch{setPdf(L('PDF 生成失败，请重试。','Failed to create the PDF.'))}}
 return <div className="paper"><div ref={sheet} className="paper-sheet">
  <section className="ai-card paper-score"><h1>{paper.title}</h1>
   <p className="paper-total"><b>{score.total}</b> / {PAPER_TOTAL}<span className={ok?'pass':'fail'}>{grading?L('AI 评分中…','Grading…'):pending?L(`还有 ${pending} 题待自评`,`${pending} to self-score`):ok?L('通过','Passed'):L(`未通过（${pass} 分及格）`,`Not passed (pass ${pass})`)}</span></p>
   <table><tbody>{score.sections.map(s=><tr key={s.type}><th>{L(s.title,s.titleEn)}</th><td>{s.got} / {s.max}</td></tr>)}</tbody></table>
   <p className="muted">{L(`交卷时间：${new Date(record.submittedAt!).toLocaleString('zh-CN')}，用时 ${clock(record.submittedAt!-record.startedAt)}`,`Submitted ${new Date(record.submittedAt!).toLocaleString()}`)}</p>
   {record.gradeNote&&<p className="ai-grade-error">{record.gradeNote}</p>}
   {pending>0&&!grading&&<button className="button secondary paper-regrade" onClick={()=>void grade(record)}><RotateCcw size={16}/>{L('重新请求 AI 评分','Retry AI grading')}</button>}</section>
  {paperSections.map((s,si)=>{const rows=score.rows.map((x,i)=>({...x,no:i+1})).filter(x=>x.section===si);
   return <section key={s.type} className="paper-section"><h2>{L(`${cn[si+1]}、${s.title}（${rows.reduce((n,x)=>n+x.got,0)} / ${rows.reduce((n,x)=>n+x.max,0)} 分）`,`${s.titleEn}`)}</h2>
    {rows.map(x=><PaperQuestion key={x.q.id} q={x.q} no={x.no} max={x.max} answer={record.answers[x.q.id]} order={record.orders?.[x.q.id]} review={{got:x.got,written:record.written?.[x.q.id],onSelfScore:isWrittenQuiz(x.q)?selfScore(x.q.id):undefined}}/>)}</section>})}
 </div>
  <div className="ai-result-actions paper-actions"><button className="button primary" disabled={!!pdf&&!pdf.includes('失败')} onClick={()=>void download()}><Download size={16}/>{L('下载 PDF 答卷','Download PDF')}</button>
   <button className="button secondary" onClick={()=>{if(window.confirm(L('重新作答会清空这份答卷（最佳成绩会保留），确定吗？','Start over? This clears the current answers.')))setRecord(null)}}><RotateCcw size={16}/>{L('重新作答','Start over')}</button></div>
  {pdf&&<p className="muted paper-pdf-note">{pdf}</p>}</div>}
