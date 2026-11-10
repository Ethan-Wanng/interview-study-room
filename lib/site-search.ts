// 全站搜索（只在服务端用，关卡内容很大，不进浏览器包）：学习卡片、关卡和训练里的题目、面试题。
// 顶栏的全局搜索（GET /api/search）和 AI 老师“在哪里能学到 / 练到某个关键词”都用它，返回的链接可以直接打开对应的卡片或题目。
// 语言类学科（英语）不在搜索范围内。
import type {AiLevel,AiQuiz,Exam} from '@/content/journey';
import {aiQuizTypes} from '@/content/journey';
import {goLevels} from '@/content/go-journey';
import {goExams} from '@/content/exams/go';
import {rustLevels} from '@/content/rust-journey';
import {aiLevels} from '@/content/ai-journey';
import {aiExams} from '@/content/exams/ai';
import {backendLevels} from '@/content/backend-journey';
import {backendExams} from '@/content/exams/backend';
import {frontendLevels} from '@/content/frontend-journey';
import {frontendExams} from '@/content/exams/frontend';
import {projectLevels} from '@/content/project-journey';
import {aiSupportLevels} from '@/content/ai-support-journey';
import type {DocumentQuestion} from './catalog-types';
import {containsAll,scoreText,termsOf} from './text-match';

export type SearchKind='card'|'question'|'interview';
// where：在哪里（学科 · 第几关 · 关卡名）；tag：题型或“学习卡片”“面试题”。
export type SearchHit={kind:SearchKind;title:string;snippet:string;href:string;where:string;tag:string;score:number};
type Entry=Omit<SearchHit,'score'|'snippet'>&{titleLc:string;bodyLc:string;body:string};

const subjects:{id:string;name:string;levels:AiLevel[];exams:Exam[]}[]=[
 {id:'ai',name:'AI 开发',levels:aiLevels,exams:aiExams},
 {id:'go',name:'Go 开发',levels:goLevels,exams:goExams},
 {id:'backend',name:'后端通用',levels:backendLevels,exams:backendExams},
 {id:'frontend',name:'前端开发',levels:frontendLevels,exams:frontendExams},
 {id:'rust',name:'Rust 开发',levels:rustLevels,exams:[]},
 {id:'project',name:'复刻面试自习室',levels:projectLevels,exams:[]},
 {id:'ai-support',name:'智能 AI 客服实战',levels:aiSupportLevels,exams:[]},
];
const trackName:Record<string,string>={go:'Go',backend:'后端通用','ai-development':'AI 开发',frontend:'前端开发'};
const quizBody=(q:AiQuiz)=>[q.code??'','options' in q?q.options.join(' '):'','reference' in q?q.reference:'','points' in q?q.points.join(' '):'','accepted' in q?q.accepted.join(' '):'',q.explain].join('\n');
const entry=(e:Omit<Entry,'titleLc'|'bodyLc'>):Entry=>({...e,titleLc:e.title.toLowerCase(),bodyLc:e.body.toLowerCase()});

let fixed:Entry[]|null=null;
function fixedEntries():Entry[]{if(fixed)return fixed;const out:Entry[]=[];
 for(const s of subjects){
  s.levels.forEach((l,li)=>{const where=`${s.name} · 第 ${li+1} 关 · ${l.title}`;
   l.lessons.forEach((c,ci)=>out.push(entry({kind:'card',title:c.title,body:c.body+'\n'+(c.code??''),href:`/learn/${s.id}?level=${encodeURIComponent(l.id)}&card=${ci+1}`,where,tag:'学习卡片'})));
   for(const q of l.quiz)out.push(entry({kind:'question',title:q.q,body:quizBody(q),href:`/learn/${s.id}?quiz=${encodeURIComponent(q.id)}`,where,tag:aiQuizTypes[q.type??'single']+'题'}))});
  for(const e of s.exams)for(const q of e.quiz)out.push(entry({kind:'question',title:q.q,body:quizBody(q),href:`/learn/${s.id}?quiz=${encodeURIComponent(q.id)}`,where:`${s.name} · ${e.title}`,tag:aiQuizTypes[q.type??'single']+'题'}));
 }
 return fixed=out}

// 面试题来自数据库（后台可以改），每次搜索时由调用方传进来。
const interviewEntries=(bank:DocumentQuestion[])=>bank.map(q=>entry({kind:'interview',title:q.title,body:q.blocks.map(b=>b.text).join('\n'),href:`/interview?track=${encodeURIComponent(q.track)}&q=${encodeURIComponent(q.id)}`,where:`面试 · ${trackName[q.track]??q.track}${q.section?' · '+q.section:''}`,tag:'面试题'}));

function snippet(body:string,bodyLc:string,needles:string[]):string{
 let at=-1;for(const n of needles){const i=bodyLc.indexOf(n);if(i>=0&&(at<0||i<at))at=i}
 const start=Math.max(0,(at<0?0:at)-24),text=body.slice(start,start+110).replace(/\s+/g,' ').trim();
 return (start>0?'…':'')+text+(start+110<body.length?'…':'')}

// strict：搜索框的匹配方式，每个关键词都必须出现；找不到时（或 AI 的自然语言提问）改用按相关度打分的模糊匹配。
export function searchSite(query:string,bank:DocumentQuestion[],o:{limit?:number;natural?:boolean;kinds?:SearchKind[]}={}):SearchHit[]{
 const q=query.trim().slice(0,200);if(!q)return [];
 const limit=o.limit??30,all=[...fixedEntries(),...interviewEntries(bank)].filter(e=>!o.kinds||o.kinds.includes(e.kind));
 const t=termsOf(q,o.natural),needles=[...t.words,...t.runs.filter(r=>r.length>1),...t.grams];
 if(!t.words.length&&!t.grams.length)return [];
 const rank=(list:Entry[],min:number)=>list.map(e=>({e,score:scoreText(t,e.titleLc,e.bodyLc)})).filter(x=>x.score>=min).sort((a,b)=>b.score-a.score).slice(0,limit)
  .map(({e,score})=>({kind:e.kind,title:e.title.length>120?e.title.slice(0,120)+'…':e.title,snippet:snippet(e.body,e.bodyLc,needles),href:e.href,where:e.where,tag:e.tag,score}));
 if(!o.natural){const lc=q.toLowerCase(),exact=all.filter(e=>containsAll(e.titleLc+'\n'+e.bodyLc,lc));if(exact.length)return rank(exact,0)}
 // 模糊匹配的门槛：至少命中一个英文单词，或者中文二元组里有相当一部分对上。
 return rank(all,Math.max(5,Math.min(12,t.grams.length*1.2+t.words.length*5)))}

// 给 AI 老师看的搜索结果：每类最多几条，一行一条，带链接。
export function searchForTutor(query:string,bank:DocumentQuestion[]):string{
 const hits=searchSite(query,bank,{limit:40,natural:true}),pick=(k:SearchKind,n:number)=>hits.filter(h=>h.kind===k).slice(0,n);
 const list=[...pick('card',6),...pick('question',6),...pick('interview',4)];
 return list.map((h,i)=>`${i+1}. 【${h.tag}】${h.title.replace(/\s+/g,' ').slice(0,70)}（${h.where}）链接：${h.href}`).join('\n')}
