'use client';
import {createContext,useContext} from 'react';
import {MessagesSquare} from 'lucide-react';
import {useI18n} from '../components/i18n';
import KeywordText from '../components/keyword-text';
import InterviewAnimationButton from './interview-animation';
import {hasInterviewAnimation} from './animations/go-animated';

// 闯关学习里引用的面试题（标题 + 参考回答），由各学科的页面在服务端挑好后传进来。
export type InterviewDoc={id:string;title:string;blocks:{type:string;text:string}[]};
export const InterviewSource=createContext<Map<string,InterviewDoc>>(new Map());

// 可展开的面试题：标题 + 参考回答（与「面试」里对应学科的面试问答是同一份内容）。
export function InterviewItem({id,label}:{id:string;label?:string}){const q=useContext(InterviewSource).get(id);if(!q)return null;
 return <details className="ai-interview"><summary><MessagesSquare size={16}/>{label&&<em>{label}</em>}<span>{q.title}</span></summary>
  <div className="ai-interview-body">{hasInterviewAnimation(q.id)&&<InterviewAnimationButton id={q.id} title={q.title}/>}{q.blocks.map((b,i)=>b.type==='code'?<pre key={i}><code>{b.text}</code></pre>:<p key={i}><KeywordText text={b.text}/></p>)}</div></details>}

// 学习页底部：本关相关的面试题列表。subject 是「面试」里对应的学科名。
export function LevelInterviews({ids,subject}:{ids:string[];subject:[string,string]}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;if(!ids.length)return null;
 return <section className="ai-card ai-interviews"><h2><MessagesSquare size={18}/>{L(`本关相关面试题（${ids.length}）`,`Related interview questions (${ids.length})`)}</h2><p className="muted">{L(`学完卡片后，试着先自己回答，再展开看参考回答。这些题也在「面试」的「${subject[0]}」学科里，可以加入每日复习。`,`After the cards, try answering first, then expand the reference. These are also in the “${subject[1]}” subject under Interview for daily review.`)}</p>{ids.map(id=><InterviewItem key={id} id={id}/>)}</section>}
