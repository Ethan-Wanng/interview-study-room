'use client';
import ThinkBox from './think-box';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Check,ChevronDown,ChevronUp,CircleDot,Loader2,PenLine,Sparkles,Square,X} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {gradeModelBadge,pointScores,type GradeMark,type GradeResult} from '@/lib/grade-types';

const half=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
const Caret=()=><span className="ai-caret" aria-hidden/>;

type Span={start:number;end:number;mark:GradeMark;idx:number};

// 在学生原文中定位 quote 的起止下标：先精确匹配，再忽略标点空白匹配，确保批注直接落在原文对应位置。
function findQuoteSpan(text:string,rawQuote:string,used:Span[]):{start:number;end:number}|null{
 const q=rawQuote.trim();
 if(!q)return null;
 const overlaps=(s:number,e:number)=>used.some(u=>Math.max(s,u.start)<Math.min(e,u.end));

 // 1. 精确子串匹配
 let from=0;
 while(from<=text.length-q.length){
  const idx=text.indexOf(q,from);
  if(idx<0)break;
  const end=idx+q.length;
  if(!overlaps(idx,end))return {start:idx,end};
  from=idx+1;
 }

 // 2. 忽略空白与标点的归一化匹配（映射回原文真实下标）
 const normRe=/[A-Za-z0-9\u4e00-\u9fa5]/;
 const normChars:string[]=[],normIdx:number[]=[];
 for(let i=0;i<text.length;i++){
  if(normRe.test(text[i])){normChars.push(text[i].toLowerCase());normIdx.push(i)}
 }
 const normText=normChars.join('');
 const candidates=[q,...q.split(/(?:\.{2,}|…|[；;。\n])/).map(s=>s.trim()).filter(s=>s.length>=3)];
 for(const cand of candidates){
  const nq=Array.from(cand).filter(c=>normRe.test(c)).join('').toLowerCase();
  if(nq.length<2)continue;
  let nf=0;
  while(nf<=normText.length-nq.length){
   const ni=normText.indexOf(nq,nf);
   if(ni<0)break;
   const start=normIdx[ni],end=normIdx[ni+nq.length-1]+1;
   if(!overlaps(start,end))return {start,end};
   nf=ni+1;
  }
 }
 return null;
}

function segmentAnswer(answer:string,marks:GradeMark[]){
 const used:Span[]=[];
 const unmatched:{mark:GradeMark;idx:number}[]=[];
 // 优先匹配 wrong 和 warn，再匹配 right
 const order=marks.map((mark,idx)=>({mark,idx})).sort((a,b)=>{
  const rank=(k:GradeMark['kind'])=>k==='wrong'?0:k==='warn'?1:2;
  return rank(a.mark.kind)-rank(b.mark.kind)||a.idx-b.idx;
 });
 for(const {mark,idx} of order){
  const span=findQuoteSpan(answer,mark.quote,used);
  if(span)used.push({...span,mark,idx});
  else unmatched.push({mark,idx});
 }
 used.sort((a,b)=>a.start-b.start);
 const parts:({type:'text';text:string}|{type:'mark';text:string;mark:GradeMark;idx:number})[]=[];
 let pos=0;
 for(const s of used){
  if(s.start>pos)parts.push({type:'text',text:answer.slice(pos,s.start)});
  parts.push({type:'mark',text:answer.slice(s.start,s.end),mark:s.mark,idx:s.idx});
  pos=s.end;
 }
 if(pos<answer.length)parts.push({type:'text',text:answer.slice(pos)});
 return {parts,unmatched};
}

// 直接在答题区原文上标注的批注框：替代原本禁用态的 textarea，在学生写的字句上直接标出哪里有错、为什么错、哪里答对。
export function AnnotatedAnswerBox({
 answer,
 result,
 waiting,
 live,
 code,
 remaining,
 model,
 fold,
 think,
 thinkSecs,
 thinking,
 onEdit,
 onStop,
}:{
 answer:string;
 result?:GradeResult|null;
 waiting?:boolean;
 live?:boolean;
 code?:boolean;
 remaining?:number;
 model?:string;
 fold?:boolean;
 think?:string;
 thinkSecs?:number;
 thinking?:boolean;
 onEdit?:()=>void;
 onStop?:()=>void;
}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh,badge=gradeModelBadge(model,locale==='en'?'en':'zh');
 const [s,setS]=useState(0);
 const [showRubric,setShowRubric]=useState(true);
 useEffect(()=>{if(!waiting)return;setS(0);const t=setInterval(()=>setS(x=>x+1),1000);return()=>clearInterval(t)},[waiting]);
 useEffect(()=>{if(fold)setShowRubric(false)},[fold]);

 const marks=result?.marks??[];
 const {parts,unmatched}=useMemo(()=>segmentAnswer(answer,marks),[answer,marks]);

 if(waiting||!result){
  return (
   <div className="ai-annot-box waiting" aria-busy>
    <div className="ai-annot-head">
     <span className="ai-annot-status"><Loader2 size={15} className="ai-spin"/><strong>{L('AI 正在答题区逐句批注你的答案…','AI is annotating your answer inline…')}</strong></span>
     <div className="ai-annot-legend">
      <small>{L(`已等待 ${s} 秒`,`${s}s`)}</small>
      {onStop&&<button type="button" className="am-stop-btn" onClick={onStop}><Square size={11} fill="currentColor"/>{L('停止评分','Stop')}</button>}
     </div>
    </div>
    {think&&<div className="ai-grade-think"><ThinkBox text={think} live={thinking} secs={thinkSecs} L={L}/></div>}<div className={'ai-annot-body'+(code?' code':'')}>{answer}</div>
    <div className="ai-annot-foot-hint">{L('正在检查每一处表述，哪里有错、为什么错会直接标在上方你的原文里','Checking every phrase — errors and explanations will appear directly in your text above')}<Caret/></div>
   </div>
  );
 }

 const wrongCount=marks.filter(m=>m.kind==='wrong').length;
 const warnCount=marks.filter(m=>m.kind==='warn').length;
 const rightCount=marks.filter(m=>m.kind==='right').length;
 const missedHits=result.hits.filter(h=>!h.pending&&h.got<h.max);
 const lastMarkIdx=live?marks.length-1:-1;

 return (
  <div className={'ai-annot-box'+(live?' live':'')} aria-busy={live}>
   <div className="ai-annot-head">
    <div className="ai-annot-title">
     <Sparkles size={15}/>
     <strong>{live?L('AI 正在答题区批注…','AI is annotating…'):L('答题区 AI 批注','Inline AI Feedback')}</strong>
     <b className={'ai-annot-score '+(result.score>=0.8*result.max?'full':result.score>=0.6*result.max?'part':'low')}>
      {live?L('评分中…','…'):`${half(result.score)} / ${result.max} ${L('分','pts')}`}
     </b>
     {!live&&badge&&<span className="ai-grade-model-tag">{badge}</span>}
     {!live&&remaining!==undefined&&<small>{L(`今日还剩 ${remaining} 次`,`${remaining} left`)}</small>}
    </div>
    <div className="ai-annot-legend">
     {wrongCount>0&&<span className="am-pill wrong"><X size={12}/>{L(`${wrongCount} 处有误`,`${wrongCount} wrong`)}</span>}
     {warnCount>0&&<span className="am-pill warn"><AlertTriangle size={12}/>{L(`${warnCount} 处不完整`,`${warnCount} incomplete`)}</span>}
     {rightCount>0&&<span className="am-pill right"><Check size={12}/>{L(`${rightCount} 处答对`,`${rightCount} right`)}</span>}
     {live&&onStop&&<button type="button" className="am-stop-btn" onClick={onStop}><Square size={11} fill="currentColor"/>{L('停止评分','Stop')}</button>}
     {!live&&onEdit&&<button type="button" className="am-edit-btn" onClick={onEdit}><PenLine size={13}/>{L('修改答案','Edit answer')}</button>}
    </div>
   </div>

   {think&&<div className="ai-grade-think"><ThinkBox text={think} live={thinking} secs={thinkSecs} L={L}/></div>}<div className={'ai-annot-body'+(code?' code':'')}>
    {parts.map((p,i)=>p.type==='text'?<span key={i}>{p.text}</span>:(
     <span key={i} className={'am-segment '+p.mark.kind}>
      <mark className={'am-highlight '+p.mark.kind}>{p.text}</mark>
      {(p.mark.comment||p.idx===lastMarkIdx)&&(
       <span className={'am-callout '+p.mark.kind}>
        {p.mark.kind==='wrong'?<><X size={13}/><b>{L('有误：','Error: ')}</b></>
         :p.mark.kind==='warn'?<><AlertTriangle size={13}/><b>{L('不够准确：','Incomplete: ')}</b></>
         :<><Check size={13}/><b>{L('答对：','Correct: ')}</b></>}
        <span>{p.mark.comment}{p.idx===lastMarkIdx&&<Caret/>}</span>
       </span>
      )}
     </span>
    ))}
   </div>

   {unmatched.length>0&&(
    <div className="am-unmatched">
     {unmatched.map(({mark,idx})=>(
      <div key={idx} className={'am-callout block '+mark.kind}>
       {mark.kind==='wrong'?<><X size={13}/><b>{L('原文有误','Error')}（“{mark.quote}”）：</b></>
        :mark.kind==='warn'?<><AlertTriangle size={13}/><b>{L('表述不完整','Incomplete')}（“{mark.quote}”）：</b></>
        :<><Check size={13}/><b>{L('答对','Correct')}（“{mark.quote}”）：</b></>}
       <span>{mark.comment}{idx===lastMarkIdx&&<Caret/>}</span>
      </div>
     ))}
    </div>
   )}

   <div className="ai-annot-footer">
    {missedHits.length>0&&(
     <div className="am-missed">
      <strong>{L('⚠️ 漏答或扣分的要点（为什么扣分）：','⚠️ Missed or deducted key points (why points were lost):')}</strong>
      <ul>
       {missedHits.map((h,i)=>(
        <li key={i} className={h.got>0?'part':'none'}>
         {h.got>0?<CircleDot size={15}/>:<X size={15}/>}
         <div>
          <b>{h.point}</b>
          {h.comment&&<p>{h.comment}</p>}
         </div>
         <i>{half(h.got)} / {h.max}</i>
        </li>
       ))}
      </ul>
     </div>
    )}

    {result.feedback&&(
     <p className="am-summary">
      <strong>{L('总评：','Summary: ')}</strong>
      {result.feedback}{live&&!result.answer&&<Caret/>}
     </p>
    )}

    <button type="button" className="am-rubric-toggle" onClick={()=>setShowRubric(v=>!v)}>
     {showRubric?<><ChevronUp size={14}/>{L('收起全部得分点明细','Hide all key points')}</>:<><ChevronDown size={14}/>{L(`查看全部 ${result.hits.length} 个得分点明细`,`Show all ${result.hits.length} key points`)}</>}
    </button>

    {showRubric&&(
     <ul className="am-hits-list">
      {result.hits.map((h,i)=>h.pending?(
       <li key={i} className="wait"><Loader2 size={15} className="ai-spin"/><span><b>{h.point}</b><em>{L('评估中…','Assessing…')}</em></span><i>… / {h.max}</i></li>
      ):(
       <li key={i} className={h.got>=h.max?'full':h.got>0?'part':'none'}>
        {h.got>=h.max?<Check size={15}/>:h.got>0?<CircleDot size={15}/>:<X size={15}/>}
        <span><b>{h.point}</b>{h.comment&&<em>{h.comment}</em>}</span>
        <i>{half(h.got)} / {h.max}</i>
       </li>
      ))}
     </ul>
    )}
   </div>
  </div>
 );
}

// 兼容旧调用的 AI 评分展示组件
export function GradeBreakdown({result,remaining,model,code,live,fold,answer,think,thinkSecs,thinking,onStop}:{result:GradeResult;remaining?:number;model?:string;code?:boolean;live?:boolean;fold?:boolean;answer?:string;think?:string;thinkSecs?:number;thinking?:boolean;onStop?:()=>void}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh,badge=gradeModelBadge(model,locale==='en'?'en':'zh');
 const [open,setOpen]=useState(!fold);
 useEffect(()=>{if(fold)setOpen(false)},[fold]);
 if(answer!==undefined){
  return <AnnotatedAnswerBox answer={answer} result={result} live={live} code={code} remaining={remaining} model={model} fold={fold} think={think} thinkSecs={thinkSecs} thinking={thinking} onStop={onStop}/>;
 }
 const shown=live||open;
 const at=!live?'':result.answer?'answer':result.feedback?'feedback':'hit-'+result.hits.reduce((k,h,i)=>h.pending?k:i,-1);
 return <div className={'ai-grade'+(live?' live':'')} aria-busy={live}><div className="ai-grade-head"><strong>{live?L('AI 正在评分','AI is grading'):L('AI 评分','AI score')}</strong>
   <b>{live?L('评分中…','…'):`${half(result.score)} / ${result.max}`}</b>{!live&&badge&&<span className="ai-grade-model-tag">{badge}</span>}{!live&&remaining!==undefined&&<small>{L(`今天还可以用 ${remaining} 次`,`${remaining} left today`)}</small>}
   {live&&onStop&&<button type="button" className="am-stop-btn" onClick={onStop}><Square size={11} fill="currentColor"/>{L('停止评分','Stop')}</button>}
   {!live&&<button type="button" className="ai-grade-fold" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<>{L('折叠评分','Fold')}<ChevronUp size={15}/></>:<>{L('展开评分详情','Show details')}<ChevronDown size={15}/></>}</button>}</div>
  {think&&<ThinkBox text={think} live={thinking} secs={thinkSecs} L={L}/>}
  {shown&&<><ul>{result.hits.map((h,i)=>h.pending?<li key={i} className="wait"><Loader2 size={16}/><span><b>{h.point}</b><em>{L('评估中…','Assessing…')}</em></span><i>… / {h.max}</i></li>
   :<li key={i} className={h.got>=h.max?'full':h.got>0?'part':'none'}>{h.got>=h.max?<Check size={16}/>:h.got>0?<CircleDot size={16}/>:<X size={16}/>}<span><b>{h.point}</b>{(h.comment||at==='hit-'+i)&&<em>{h.comment}{at==='hit-'+i&&<Caret/>}</em>}</span><i>{half(h.got)} / {h.max}</i></li>)}</ul>
  {result.feedback&&<p>{result.feedback}{at==='feedback'&&<Caret/>}</p>}</>}</div>;
}

export function GradeWaiting({onStop}:{onStop?:()=>void}={}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;const [s,setS]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setS(x=>x+1),1000);return()=>clearInterval(t)},[]);
 return <div className="ai-grade live" aria-busy><div className="ai-grade-head"><strong>{L('AI 正在阅读你的答案','AI is reading your answer')}</strong><b><Loader2 size={18} className="ai-spin"/></b><small>{L(`已等待 ${s} 秒`,`${s}s`)}</small>{onStop&&<button type="button" className="am-stop-btn" onClick={onStop}><Square size={11} fill="currentColor"/>{L('停止评分','Stop')}</button>}</div>
  <p className="ai-grade-hint">{L('正在逐句检查你的作答并标注错误原因…','Checking your answer and annotating inline…')}<Caret/></p></div>}

export function SelfScore({points,scores,max,onDone}:{points:string[];scores?:number[];max:number;onDone:(score:number,got:boolean[])=>void}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const values=pointScores(points,max,scores);
 return <form className="ai-self-score" onSubmit={e=>{e.preventDefault();const got=points.map((_,i)=>(e.currentTarget.elements.namedItem('p'+i) as HTMLInputElement).checked);onDone(values.reduce((n,v,i)=>n+(got[i]?v:0),0),got)}}>
  <strong>{L('对照得分点自评：勾选你答到的要点','Self-check: tick the points you covered')}</strong>
  {points.map((p,i)=><label key={i}><input type="checkbox" name={'p'+i}/><span>{p}</span><i>{values[i]} {L('分','pts')}</i></label>)}
  <button className="button primary">{L('确认自评','Confirm')}</button></form>}
