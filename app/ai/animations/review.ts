import {A,type Beat,type LessonStory} from './story';
import {examSize,type AiLevel,type Exam,type Tier} from '@/content/journey';

// 阶段复习 / 考前复习动画：根据覆盖的关卡和面试题自动生成。
// 每一关一个镜头，面试题每 group 道一个镜头，所以关卡和面试题越多，动画越长。
const slots:[number,number][]=[[110,70],[530,70],[110,170],[530,170],[110,270],[530,270]];
// 题库标题里的小毛病只在字幕里收拾，不改题库：康熙部首形近字（⽤⼀⽅）换成正常汉字、汉字之间多余的空格、
// 中文标点两侧的空格、半角问号、不配对的括号和引号、中英文之间补空格，以及几个常见错别字。
const tidy=(t:string)=>t.replace(/[⼀-⿟]/g,c=>c.normalize('NFKC')).replace(/＞/g,'>').replace(/\s+/g,' ').replace(/（([^（）)]*)\)/g,'（$1）')
 .replace(/(?<=[一-龥])\s+(?=[一-龥])/g,'').replace(/\s*([，。；：？！、（）])\s*/g,'$1').replace(/(?<=[一-龥])\?/g,'？')
 .replace(/\bGO(?=语言)/g,'Go').replace(/([一-龥])([A-Za-z0-9(%])/g,'$1 $2').replace(/([A-Za-z0-9)])([一-龥])/g,'$1 $2').replace(/“([^“”]*)“/g,'“$1”').replace(/么么/g,'么').replace(/([一两])颗(?=二叉树)/g,'$1棵').replace(/软连接/g,'软链接').replace(/优雅的(?=[处关])/g,'优雅地').trim();
// 一个标题里连问好几句时只取第一问，保证字幕是完整的句子（不截半句）。
const firstAsk=(t:string)=>{const s=tidy(t),i=s.indexOf('？');return i>=8&&i<s.length-1?s.slice(0,i+1):s};
// 问句本身带问号，直接相连；不是问句的用分号隔开，最后以句号结尾。
const joinAsks=(ts:string[])=>ts.map((t,i)=>/[？！。]$/.test(t)?t:t+(i<ts.length-1?'；':'。')).join('');

export function reviewStory(o:{id:string;target:string;title:string;hub:string;hubSub?:string;icon:string;intro:string;levels:{level:AiLevel;index:number}[];interviews:Record<string,string[]>;group:number;memo:[string,string]}):LessonStory{
 const qTitles=o.levels.flatMap(({level})=>o.interviews[level.id]??[]);
 const beats:Beat[]=[{say:`${o.intro}这部分一共 ${o.levels.length} 关、${qTitles.length} 道相关面试题，我们把重点串一遍。`,add:[A('hub','🎓',o.hub,320,170,{tone:'primary',sub:o.hubSub})]}];
 let n=0;const placed:string[]=[];
 const put=(id:string,icon:string,label:string,sub:string,tone:'ok'|'warm'|'primary',say:string)=>{const slot=n%slots.length,drop=placed[slot];placed[slot]=id;n++;
  beats.push({say,add:[A(id,icon,label,slots[slot][0],slots[slot][1],{kind:'tag',tone,sub})],...(drop?{drop:[drop]}:{}),send:[{from:id,to:'hub',tone}],focus:[id]})};
 for(const {level,index} of o.levels){const titles=level.lessons.slice(0,4).map(l=>l.title),lessons=titles.join(titles.some(t=>/[、，]/.test(t))?'；':'、'),summary=level.summary.replace(/[。；，]$/,'');
  put('lv'+index,'📘',`第 ${index+1} 关`,`${level.lessons.length} 张卡片 · ${level.quiz.length} 题`,'primary',`第 ${index+1} 关「${level.title}」${summary.includes('：')?'。':'：'}${summary}。重点：${lessons}。`)}
 for(let i=0;i<qTitles.length;i+=o.group){const part=qTitles.slice(i,i+o.group);
  put('iv'+i,'💬',`面试题 ×${part.length}`,part.length>1?`第 ${i+1}–${i+part.length} 道`:`第 ${i+1} 道`,'warm',`面试常问：${joinAsks(part.map(firstAsk))}`)}
 beats.push({say:o.memo[1].startsWith('复习完')?'复习完了，去做阶段训练吧！答完会有详解，答错的题会进错题本。':'复习完了，去挑战吧！答完会有详解，答错的题会进错题本。',memo:o.memo});
 return {id:o.id,level:o.target,kind:'review',icon:o.icon,title:o.title,summary:o.intro,beats};
}

// 一个学科的全部复习动画脚本（交给 storyAnimation 渲染）：每个阶段一个阶段复习，每次阶段考试、最终考试各一个考前复习。键为 tier-序号 或考试 id。
export function subjectReviews(s:{id:string;levels:AiLevel[];tiers:Tier[];exams:Exam[];interviewByLevel:Record<string,string[]>;titleOf:(id:string)=>string|undefined}){
 const tierLevels=(t:number)=>s.levels.slice(s.tiers[t].from,s.tiers[t].to+1),withIndex=(ls:AiLevel[])=>ls.map(level=>({level,index:s.levels.indexOf(level)}));
 const interviews=Object.fromEntries(s.levels.map(l=>[l.id,(s.interviewByLevel[l.id]??[]).map(s.titleOf).filter((t):t is string=>!!t)]));
 const out=new Map<string,LessonStory>();
 s.tiers.forEach((t,i)=>out.set('tier-'+i,reviewStory({id:s.id+'-review-tier-'+i,target:'tier-'+i,title:`${t.name}阶段复习`,hub:`${t.name}阶段复习`,icon:'🧭',intro:`「${t.name}」阶段复习。`,levels:withIndex(tierLevels(i)),interviews,group:3,memo:[`${t.name}：${t.to-t.from+1} 关`,'复习完去做阶段训练']})));
 for(const e of s.exams)if(e.kind!=='training')out.set(e.id,reviewStory({id:s.id+'-review-'+e.id,target:e.id,title:`${e.title} · 考前复习`,hub:'考前复习',hubSub:e.title,icon:e.kind==='final'?'🏆':'📝',intro:`「${e.title}」考前复习。`,levels:withIndex(e.tiers.flatMap(tierLevels)),interviews,group:e.kind==='final'?5:4,memo:[e.title,`${examSize(e,s.levels,s.tiers)} 题 · 及格 ${Math.round(e.passRate*100)}%`]}));
 return out}
