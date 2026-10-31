'use client';
import {forwardRef} from 'react';
import type {AiQuiz} from '@/content/journey';
import {paperSections,PAPER_MINUTES,PAPER_TOTAL,type Paper} from '@/content/papers/types';
import {pointScores} from '@/lib/grade-types';
import {isWrittenQuiz,paperLayout} from './paper-score';

const letters='ABCDEFGH',cn='零一二三四五六七';
// 主观题留给作答的空白高度（像素）：简答几行，代码和综合题多留一些。
const space:Record<string,number>={short:150,code:300,design:460};
const right=(q:AiQuiz)=>q.type==='multi'?q.answers:'options' in q?[q.answer as number]:[];

// 下载用的纸质版：mode='paper' 是空白试卷，只有题目；mode='answers' 是答案与解析，每题给出答案、
// 错误选项的说明、参考答案和评分要点。选项一律按原始顺序 A、B、C…，两份文件互相对得上。
export const PaperPrint=forwardRef<HTMLDivElement,{paper:Paper;mode:'paper'|'answers';pass:number}>(function PaperPrint({paper,mode,pass},ref){
 const answers=mode==='answers',rows=paperLayout(paper).map((x,i)=>({...x,no:i+1}));
 return <div ref={ref} className="paper-print paper-printout">
  <header className="pp-head"><h1>{paper.title}</h1><h2>{answers?'答案与解析':'试卷'}</h2>
   <p>共 {rows.length} 题 · 满分 {PAPER_TOTAL} 分 · {pass} 分及格 · 限时 {PAPER_MINUTES} 分钟</p>
   {!answers&&<p className="pp-fields">姓名：<i/>　　用时：<i/>　　得分：<i/></p>}</header>
  {paperSections.map((s,si)=>{const list=rows.filter(x=>x.section===si);if(!list.length)return null;const max=list.reduce((n,x)=>n+x.max,0);
   return <section key={s.type} className="paper-section"><h2>{cn[si+1]}、{s.title}（共 {list.length} 题，{max} 分）{s.type==='multi'&&!answers&&<small>少选、多选、错选均不得分</small>}</h2>
    {list.map(x=><article key={x.q.id} className="paper-q pp-q">
     <h3><b>{x.no}.</b>（{x.max} 分）{x.q.q}{x.q.type==='judge'&&!answers&&<span className="pp-judge">（　　）</span>}</h3>
     {x.q.code&&<pre className="pp-code">{x.q.code}</pre>}
     {'options' in x.q&&<ol className="pp-options">{x.q.options.map((o,i)=>{const ok=right(x.q).includes(i),why='why' in x.q?x.q.why?.[i]:'';
      return <li key={i} className={answers?(ok?'right':'wrong'):''}><b>{letters[i]}.</b><span>{o}{answers&&!ok&&why&&<small>{why}</small>}</span>{answers&&ok&&<em>✓</em>}</li>})}</ol>}
     {!answers&&isWrittenQuiz(x.q)&&<div className="pp-space" style={{height:space[x.q.type!]}}/>}
     {answers&&<Answer q={x.q} max={x.max}/>}
    </article>)}</section>})}
 </div>});

function Answer({q,max}:{q:AiQuiz;max:number}){
 let body;
 if(q.type==='multi'||'options' in q)body=<p className="pp-key"><b>答案：</b>{right(q).map(i=>letters[i]).join('、')}</p>;
 else if(q.type==='judge')body=<p className="pp-key"><b>答案：</b>{q.answer?'正确':'错误'}</p>;
 else if(q.type==='fill'){const lists=q.blanks??[q.accepted];
  body=<p className="pp-key"><b>答案：</b>{lists.map((l,i)=><span key={i}>{lists.length>1?`第 ${i+1} 空 `:''}{l[0]}{l.length>1?`（也可写：${l.slice(1).join('、')}）`:''}{i<lists.length-1?'；':''}</span>)}</p>}
 else{const scores=pointScores(q.points,max,q.scores);
  body=<><p className="pp-key"><b>参考答案：</b></p>{q.type==='short'?<p className="pp-ref">{q.reference}</p>:<pre className="pp-code">{q.reference}</pre>}
   <p className="pp-key"><b>评分要点：</b></p><ol className="pp-points">{q.points.map((p,i)=><li key={i}>{p}<em>{scores[i]} 分</em></li>)}</ol></>}
 return <div className="pp-answer">{body}<p className="pp-explain"><b>解析：</b>{q.explain}</p></div>}
