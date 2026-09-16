import type {ManagedQuestion,Subject} from './catalog-types';
export function adminQuestionList(questions:ManagedQuestion[],subjects:Subject[],filter:{drafts:boolean;space:string;subject:string;kind:string;search:string}){
 const allowed=new Set(subjects.filter(s=>filter.drafts||s.spaceId===filter.space).map(s=>s.id));
 const term=filter.search.trim().toLowerCase();
 return questions.filter(q=>allowed.has(q.subjectId)&&(!filter.drafts||q.status==='draft')&&(filter.subject==='all'||q.subjectId===filter.subject)&&(filter.kind==='all'||q.kind===filter.kind)&&(!term||[q.zh.title,q.en?.title??'',q.topic].join(' ').toLowerCase().includes(term)))
 .sort((a,b)=>Number(b.status==='draft')-Number(a.status==='draft')||(b.updatedAt??0)-(a.updatedAt??0)||a.id.localeCompare(b.id));
}
