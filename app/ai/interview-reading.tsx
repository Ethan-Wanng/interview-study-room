'use client';
import {MessagesSquare} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import {aiInterviewQuestions} from '@/content/ai-interview';

const byId=new Map(aiInterviewQuestions.map(q=>[q.id,q]));

// 可展开的面试题：标题 + 参考回答（与首页「AI 开发」学科中的面试问答是同一份内容）。
export function InterviewItem({id,label}:{id:string;label?:string}){const q=byId.get(id);if(!q)return null;
 return <details className="ai-interview"><summary><MessagesSquare size={16}/>{label&&<em>{label}</em>}<span>{q.title}</span></summary>
  <div className="ai-interview-body">{q.blocks.map((b,i)=>b.type==='code'?<pre key={i}><code>{b.text}</code></pre>:<p key={i}><KeywordText text={b.text}/></p>)}</div></details>}

// 学习页底部：本关相关的面试题列表。
export function LevelInterviews({ids}:{ids:string[]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;if(!ids.length)return null;
 return <section className="ai-card ai-interviews"><h2><MessagesSquare size={18}/>{L(`本关相关面试题（${ids.length}）`,`Related interview questions (${ids.length})`)}</h2><p className="muted">{L('学完卡片后，试着先自己回答，再展开看参考回答。这些题也在首页「AI 开发」学科里，可以加入每日复习。','After the cards, try answering first, then expand the reference. These are also in the “AI 开发” subject on the homepage for daily review.')}</p>{ids.map(id=><InterviewItem key={id} id={id}/>)}</section>}
