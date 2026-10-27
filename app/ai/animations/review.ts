import {A,storyAnimation,type Beat} from './story';
import type {AiLevel} from '@/content/journey';
import type {Animation} from './types';

// 阶段复习 / 考前复习动画：根据覆盖的关卡和面试题自动生成。
// 每一关一个镜头，面试题每 group 道一个镜头，所以关卡和面试题越多，动画越长。
const slots:[number,number][]=[[110,70],[530,70],[110,170],[530,170],[110,270],[530,270]];
const short=(s:string,n:number)=>[...s].length>n?[...s].slice(0,n).join('')+'…':s;

export function reviewAnimation(o:{id:string;target:string;title:string;icon:string;intro:string;levels:{level:AiLevel;index:number}[];interviews:Record<string,string[]>;group:number;memo:[string,string]}):Animation{
 const qTitles=o.levels.flatMap(({level})=>o.interviews[level.id]??[]);
 const beats:Beat[]=[{say:`${o.intro}这部分一共 ${o.levels.length} 关、${qTitles.length} 道相关面试题，我们把重点串一遍。`,add:[A('hub','🎓',short(o.title,10),320,170,{tone:'primary'})]}];
 let n=0;const placed:string[]=[];
 const put=(id:string,icon:string,label:string,sub:string,tone:'ok'|'warm'|'primary',say:string)=>{const slot=n%slots.length,drop=placed[slot];placed[slot]=id;n++;
  beats.push({say,add:[A(id,icon,label,slots[slot][0],slots[slot][1],{kind:'tag',tone,sub})],...(drop?{drop:[drop]}:{}),send:[{from:id,to:'hub',tone}],focus:[id]})};
 for(const {level,index} of o.levels){const lessons=level.lessons.slice(0,4).map(l=>l.title).join('、');
  put('lv'+index,'📘',`第 ${index+1} 关`,`${level.lessons.length} 张卡片 · ${level.quiz.length} 题`,'primary',`第 ${index+1} 关「${level.title}」：${level.summary}。重点：${lessons}。`)}
 for(let i=0;i<qTitles.length;i+=o.group){const part=qTitles.slice(i,i+o.group);
  put('iv'+i,'💬',`面试题 ×${part.length}`,`第 ${i+1}–${i+part.length} 道`,'warm',`面试常问：${part.map(t=>short(t,26)).join('；')}。`)}
 beats.push({say:'复习完了，去挑战吧！答完会有详解，答错的题会进错题本。',memo:o.memo});
 return storyAnimation({id:o.id,level:o.target,kind:'review',icon:o.icon,title:o.title,summary:o.intro,beats});
}
