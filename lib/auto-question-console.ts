export type ConsoleType='none'|'training'|'mock'|'exam';
export type ConsoleDraft={questions:Record<string,any>[];status:'draft'|'published';type:ConsoleType;name:string};
export function parseQuestionJson(text:string):ConsoleDraft{
 const clean=text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1');
 let value:any;try{value=JSON.parse(clean)}catch{throw Error('JSON 格式不正确，请粘贴题目数组或包含 questions 的完整请求。')}
 const questions=Array.isArray(value)?value:value?.questions;
 if(!Array.isArray(questions)||questions.length<1||questions.length>100)throw Error('请提供 1–100 道题，questions 必须是数组。');
 questions.forEach((q,i)=>{if(!q||typeof q!=='object'||Array.isArray(q)||!q.zh||typeof q.zh.title!=='string'||!q.zh.title.trim()||typeof q.subjectId!=='string')throw Error(`第 ${i+1} 题缺少 subjectId 或 zh.title。`)});
 const set=Array.isArray(value)?undefined:value.questionSet;
 if(set!==undefined&&(!set||!['training','mock','exam'].includes(set.type)||typeof set.name!=='string'||!set.name.trim()||Array.from(set.name.trim()).length>100))throw Error('questionSet 的类型或名称无效。');
 const status=Array.isArray(value)?'draft':value.status??'draft';
 if(!['draft','published'].includes(status))throw Error('status 只允许 draft 或 published。');
 if(set&&status!=='published')throw Error('带 questionSet 的完整请求必须设置 status: published。');
 return {questions,status,type:set?.type??'none',name:set?.name.trim()??''};
}
export function consoleBody(draft:ConsoleDraft){
 if(draft.type!=='none'&&(!draft.name.trim()||Array.from(draft.name.trim()).length>100))throw Error('请填写 1–100 字的题集名称。');
 return {status:draft.type==='none'?draft.status:'published',...(draft.type==='none'?{}:{questionSet:{type:draft.type,name:draft.name.trim()}}),questions:draft.questions};
}
export function verifyCreatedSet(result:any,data:any){
 return result?.questionSet&&data?.id===result.questionSet.id&&data.status==='published'&&data.associationSource==='links'&&data.questionCount===result.count&&data.linkedCount===result.count&&Array.isArray(data.questions)&&Array.isArray(result.ids)&&data.questions.length===result.ids.length&&data.questions.every((q:any,i:number)=>q.question?.id===result.ids[i]&&q.sortOrder===i+1);
}
