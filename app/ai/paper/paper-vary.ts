import type {AiQuiz} from '@/content/journey';
import {paperSections,type Paper} from '@/content/papers/types';

const shuffle=<T,>(xs:T[])=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const typeOf=(q:AiQuiz)=>q.type??'single';
const blanksOf=(q:AiQuiz)=>q.type==='fill'?(q.blanks?.length??1):0;

// 每次开考换一部分题：每种题型大约一半的位置，换成题库（这门课相关阶段的训练题）里同题型的题。
// 优先选上次没出过的题；填空题只换空数相同的，保证每题分值和总分 150 不变。综合题没有可换的就保留原题。
export function varyPaper(paper:Paper,pool:AiQuiz[],lastSeen:string[]):AiQuiz[]{
 const inPaper=new Set(paper.questions.map(q=>q.id)),seen=new Set(lastSeen),used=new Set<string>();
 const out=[...paper.questions];
 for(const s of paperSections){
  const slots=out.map((q,i)=>typeOf(q)===s.type?i:-1).filter(i=>i>=0);
  const swap=shuffle(slots).slice(0,Math.ceil(slots.length/2));
  for(const i of swap){const need=blanksOf(out[i]);
   const cands=pool.filter(q=>typeOf(q)===s.type&&!inPaper.has(q.id)&&!used.has(q.id)&&blanksOf(q)===need);
   if(!cands.length)continue;
   const fresh=cands.filter(q=>!seen.has(q.id)),pick=shuffle(fresh.length?fresh:cands)[0];
   used.add(pick.id);out[i]=pick}}
 return out}

// 按记录里的题号还原这次的试卷；题库改动后找不到的题，用原试卷同一位置的题代替。
export function paperFor(paper:Paper,pool:AiQuiz[],qids?:string[]):Paper{
 if(!qids?.length)return paper;
 const byId=new Map([...paper.questions,...pool].map(q=>[q.id,q]));
 return {...paper,questions:qids.map((id,i)=>byId.get(id)??paper.questions[i]).filter(Boolean)}}
