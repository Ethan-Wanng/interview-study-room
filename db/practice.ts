import {practiceEnglish} from '@/content/practice.en';
import {plans,planSummary} from './practice-plans';
import {practiceCatalog} from './catalog';
import type {PracticeQuestion} from '@/content/practice';
import type {QuestionSnapshot} from '@/lib/catalog-types';
import {studyDb,dayNow} from './study';
import {practiceMap,practiceQuestions,grade} from '@/content/practice';
import type {Answer,Payload,RunView,History,PracticeState,Mode} from '@/lib/practice-types';
export type RunRow={id:string;user_id:string;status:string;payload:string;revision:number;created_at:number;updated_at:number};
export const emptyAnswer=():Answer=>({value:'',submitted:false,self:null});
export function shuffle<T>(a:T[]):T[]{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
export function choose(mode:Mode,track:string,available:PracticeQuestion[]=practiceQuestions){const pool=available.filter(q=>track==='all'||q.track===track);if(!pool.length)return [];if(mode==='random')return [pool[Math.floor(Math.random()*pool.length)].id];return shuffle((mode==='exam'?['choice','fill','short','code']:['short','code']).flatMap(type=>shuffle(pool.filter(q=>q.type===type)).slice(0,mode==='exam'?3:type==='short'?6:2))).map(q=>q.id)}
export function savedQuestion(p:Payload,i:number):QuestionSnapshot{const saved=p.questionSnapshots?.[i];if(saved?.question.id===p.ids[i])return saved;const question=practiceMap.get(p.ids[i]);if(!question)throw new Error('Missing saved question');return {question,english:practiceEnglish[question.id]}}
export function view(row:RunRow,language='zh'):RunView{const p=JSON.parse(row.payload) as Payload;return {id:row.id,status:row.status,revision:row.revision,createdAt:row.created_at,planTitle:p.planTitle,mode:p.mode,track:p.track,minutes:p.minutes,seconds:p.seconds,index:p.index,items:p.ids.map((id,i)=>{const saved=savedQuestion(p,i),base=saved.question;const q=language==='en'?{...base,...saved.english}:base;const a=p.answers[i];const reveal=row.status!=='active'||(p.mode!=='exam'&&a.submitted);const {accepted,answer,explanation,rubric,code,...publicQ}=q;return {question:{...publicQ,...(reveal?{answer,explanation,rubric,code}:{})},response:a,correct:reveal?grade(base,a.value):null}})}}
export async function snapshot(user:string,reviewId?:string,language='zh'):Promise<PracticeState>{const db=studyDb(),today=dayNow();const [pref,day,active,history,review,content]=await Promise.all([
 db.prepare('SELECT minutes FROM practice_preferences WHERE user_id=?').bind(user).first<{minutes:number}>(),
 db.prepare('SELECT seconds FROM practice_days WHERE user_id=? AND day=?').bind(user,today).first<{seconds:number}>(),
 db.prepare("SELECT * FROM practice_runs WHERE user_id=? AND status='active'").bind(user).first<RunRow>(),
 db.prepare("SELECT * FROM practice_runs WHERE user_id=? AND status='completed' ORDER BY created_at DESC LIMIT 20").bind(user).all<RunRow>(),
 reviewId?db.prepare("SELECT * FROM practice_runs WHERE user_id=? AND id=? AND status='completed'").bind(user,reviewId).first<RunRow>():Promise.resolve(null),
 practiceCatalog(),
 ]);return {spaces:content.spaces,plans:(await plans(true)).map(planSummary),tracks:[{id:'all',name:'全部学科',nameEn:'All subjects'},...content.subjects],questionCount:content.questions.length,today,goal:pref?.minutes??30,seconds:day?.seconds??0,active:active?view(active,language):null,history:history.results.map(row=>{const p=JSON.parse(row.payload) as Payload;const objective=p.ids.map((id,i)=>({q:savedQuestion(p,i).question,a:p.answers[i]})).filter(x=>x.q.accepted);return {id:row.id,mode:p.mode,status:row.status,createdAt:row.created_at,seconds:p.seconds,answered:p.answers.filter(a=>a.submitted).length,count:p.ids.length,correct:objective.filter(x=>x.a.submitted&&grade(x.q,x.a.value)).length,objective:objective.length} satisfies History}),...(review?{review:view(review,language)}:{})}}
