import original from '@/content/questions.json';
import {practiceQuestions} from '@/content/practice';
import {practiceEnglish} from '@/content/practice.en';
import {studyDb} from './study';
import {emptyText,type ManagedQuestion,type Subject,type Space,type StudyBank,type QuestionSnapshot} from '@/lib/catalog-types';
export const builtInSpaces:Space[]=[
 {id:'go-interview',name:'GO面试',nameEn:'Go interviews'},
 {id:'ai-development',name:'AI 开发',nameEn:'AI development'},
];
export const builtInSubjects:Subject[]=[
 {id:'go',name:'Go',nameEn:'Go',spaceId:'go-interview'},
 {id:'backend',name:'后端通用',nameEn:'Backend fundamentals',spaceId:'go-interview'},
 {id:'ai-development',name:'AI 开发',nameEn:'AI development',spaceId:'ai-development'},
];
const baseQuestions:ManagedQuestion[]=[...original.questions.map(q=>({id:q.id,subjectId:q.track,kind:'document' as const,type:'short' as const,status:'published' as const,revision:0,topic:q.category,section:q.section,accepted:[],zh:{...emptyText(),title:q.title,blocks:q.blocks as {type:'text'|'code';text:string}[]},en:null})),...practiceQuestions.map(q=>({id:q.id,subjectId:q.track,kind:'practice' as const,type:q.type,status:'published' as const,revision:0,topic:q.topic,section:q.topic,accepted:q.accepted??[],zh:{...emptyText(),title:q.prompt,answer:q.answer,explanation:q.explanation,options:q.options??[],rubric:q.rubric,code:q.code??''},en:{...emptyText(),...practiceEnglish[q.id],title:practiceEnglish[q.id].prompt,options:practiceEnglish[q.id].options??[],rubric:practiceEnglish[q.id].rubric??[],code:q.code??''}}))];
export async function catalog(){const db=studyDb();const [ss,qq,sp]=await Promise.all([db.prepare('SELECT id,name,name_en,space_id FROM subjects ORDER BY name').all<{id:string;name:string;name_en:string;space_id:string}>(),db.prepare('SELECT payload,revision,updated_at,status FROM managed_questions').all<{payload:string;revision:number;updated_at:number;status:string}>(),db.prepare('SELECT id,name,name_en,created_by FROM spaces ORDER BY name').all<{id:string;name:string;name_en:string;created_by:string}>()]);const questions=new Map(baseQuestions.map(q=>[q.id,q]));for(const row of qq.results){const q=JSON.parse(row.payload) as ManagedQuestion;if(row.status==='deleted'){questions.delete(q.id);continue}questions.set(q.id,{...q,revision:row.revision,updatedAt:row.updated_at})}return {spaces:[...builtInSpaces,...sp.results.map(s=>({id:s.id,name:s.name,nameEn:s.name_en,createdBy:s.created_by}))] as Space[],subjects:[...builtInSubjects,...ss.results.map(s=>({id:s.id,name:s.name,nameEn:s.name_en,spaceId:s.space_id}))],questions:[...questions.values()]}}
export function asPractice(q:ManagedQuestion):QuestionSnapshot{const convert=(text:ManagedQuestion['zh'])=>({id:q.id,track:q.subjectId,type:q.type,topic:q.topic,prompt:text.title,answer:text.answer,explanation:text.explanation,rubric:text.rubric,...(q.type==='choice'?{options:text.options}:{}),...(q.type==='choice'||q.type==='fill'?{accepted:q.accepted}:{}),...(q.type==='code'?{code:text.code}:{})});return {question:convert(q.zh),english:q.en?convert(q.en):null}}
export async function practiceCatalog(){const c=await catalog();return {spaces:c.spaces,subjects:c.subjects,questions:c.questions.filter(q=>q.kind==='practice'&&q.status==='published').map(asPractice)}}
export async function studyCatalog():Promise<StudyBank>{const c=await catalog();return {spaces:c.spaces,tracks:c.subjects.map(s=>({...s})),source:'文档与后台维护题库',notes:original.notes,questions:c.questions.filter(q=>q.kind==='document'&&q.status==='published').map(q=>({id:q.id,track:q.subjectId,category:q.topic,section:q.section,title:q.zh.title,blocks:q.zh.blocks,sourceParagraph:0,...(q.en?{english:{title:q.en.title,blocks:q.en.blocks}}:{})}))}}
