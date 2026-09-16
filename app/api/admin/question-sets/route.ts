import {authorizeAutoQuestions} from '@/lib/auto-question-auth';
import {studyDb} from '@/db/study';
import {questionSetInput,questionSetModes,QuestionSetValidationError} from '@/lib/question-set';
import {AuthError} from '@/lib/site-auth';
import type {PracticePlan} from '@/lib/practice-plan-types';
export const dynamic='force-dynamic';
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 try{
  await authorizeAutoQuestions(req);
  const params=new URL(req.url).searchParams,type=params.get('type'),name=params.get('name'),spaceId=params.get('spaceId');
  const filter=questionSetInput({type:type??'training',name:name??'查询'} )!;
  const conditions=["json_extract(p.payload,'$.mode') IN ('random','interview','exam')"],args:string[]=[];
  if(type!==null){conditions.push("json_extract(p.payload,'$.mode')=?");args.push(questionSetModes[filter.type])}
  if(name!==null){conditions.push("trim(json_extract(p.payload,'$.title'))=?");args.push(filter.name)}
  const space="coalesce(s.space_id,CASE WHEN p.subject_id IN ('go','backend') THEN 'go-interview' ELSE p.subject_id END)";
  if(spaceId!==null){conditions.push(space+'=?');args.push(spaceId)}
  // One statement reads snapshots and actual ordered links from one DB snapshot.
  const {results}=await studyDb().prepare(`SELECT p.id,p.payload,p.status,p.created_by,${space} space_id,
   (SELECT json_group_array(json_object('id',question_id,'sortOrder',sort_order)) FROM
    (SELECT question_id,sort_order FROM practice_plan_questions WHERE plan_id=p.id ORDER BY sort_order)) links
   FROM practice_plans p LEFT JOIN subjects s ON s.id=p.subject_id WHERE ${conditions.join(' AND ')}
   ORDER BY p.created_at DESC,p.id DESC LIMIT 51`).bind(...args).all<{id:string;payload:string;status:string;created_by:string;space_id:string;links:string}>();
  const exact=type!==null&&name!==null;
  if(exact&&!results.length)return respond({success:false,code:'QUESTION_SET_NOT_FOUND',message:'未找到题集。'},404);
  if(exact&&results.length>1)return respond({success:false,code:'QUESTION_SET_AMBIGUOUS',message:'存在多个同名题集，请提供 spaceId；历史重名题集需先处理。'},409);
  const data=results.slice(0,50).map(row=>{
   const plan=JSON.parse(row.payload) as PracticePlan,links=JSON.parse(row.links) as {id:string;sortOrder:number}[];
   const linked=row.created_by==='auto-api'||links.length>0;
   if(linked&&links.length!==plan.questions.length)throw Object.assign(new AuthError('题集实际关联数量与快照不一致。',409),{code:'QUESTION_COUNT_MISMATCH'});
   if(linked&&links.some((l,i)=>l.sortOrder!==i+1||l.id!==plan.questions[i].question.id))throw Object.assign(new AuthError('题集实际关联顺序或 ID 不一致。',409),{code:'QUESTION_LINK_FAILED'});
   return {id:row.id,type:Object.entries(questionSetModes).find(([,mode])=>mode===plan.mode)![0],name:plan.title,
    spaceId:row.space_id,status:row.status,questionCount:linked?links.length:plan.questions.length,
    linkedCount:linked?links.length:plan.questions.length,associationSource:linked?'links':'snapshot',
    questions:plan.questions.map((snapshot,i)=>({...snapshot,sortOrder:i+1}))};
  });
  return respond({success:true,data:exact?data[0]:data,...(!exact?{hasMore:results.length>50}:{})});
 }catch(error){
  if(error instanceof AuthError)return respond({success:false,code:error instanceof QuestionSetValidationError?error.code:'code' in error?error.code:error.status===401?'UNAUTHORIZED':'INVALID_REQUEST',message:error.message},error.status);
  console.error('Question set query failed');return respond({success:false,code:'INTERNAL_ERROR',message:'题集查询暂时不可用。'},503);
 }
}
