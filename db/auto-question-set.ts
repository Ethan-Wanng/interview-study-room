import {studyDb} from './study';
import {asPractice} from './catalog';
import {fingerprint} from '@/lib/auto-questions';
import {questionSetModes,type QuestionSetInput} from '@/lib/question-set';
import type {ManagedQuestion} from '@/lib/catalog-types';
import type {PracticePlan} from '@/lib/practice-plan-types';

export function questionSetStatements(set:QuestionSetInput,id:string,questions:ManagedQuestion[],now:number){
 const db=studyDb(),statements:D1PreparedStatement[]=[];
 const subjectIds=[...new Set(questions.map(q=>q.subjectId))];
 const plan:PracticePlan={id,title:set.name,subjectId:subjectIds[0],subjectIds,chapter:'',mode:questionSetModes[set.type],minutes:30,status:'published',questions:[]};
 for(const [index,q] of questions.entries()){
  statements.push(db.prepare('INSERT INTO managed_questions(id,subject_id,kind,status,payload,revision,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?) RETURNING id').bind(q.id,q.subjectId,q.kind,q.status,JSON.stringify(q),1,'auto-api',now));
  // D1 batch cannot feed RETURNING results back through JavaScript before commit.
  // Capture the just-inserted row using SQLite's insertion return register, in the
  // immediately following statement. The id check prevents a skipped INSERT from
  // capturing an earlier row. Never look up questions by title/subject/topic.
  statements.push(db.prepare(`INSERT INTO auto_question_insert_receipts(batch_id,sort_order,question_id,snapshot)
   SELECT ?,?,id,json_set(?, '$.question.id',id) FROM managed_questions WHERE rowid=last_insert_rowid() AND id=?`).bind(id,index+1,JSON.stringify(asPractice(q)),q.id));
  statements.push(db.prepare('INSERT INTO auto_question_fingerprints(fingerprint,question_id,created_at) VALUES(?,?,?)').bind(fingerprint(q),q.id,now));
 }
 statements.push(db.prepare(`INSERT INTO practice_plans(id,subject_id,status,payload,created_by,created_at)
  VALUES(?,?,'published',json_set(?,'$.questions',json((SELECT json_group_array(json(snapshot)) FROM
   (SELECT snapshot FROM auto_question_insert_receipts WHERE batch_id=? ORDER BY sort_order)))),'auto-api',?)`).bind(id,plan.subjectId,JSON.stringify(plan),id,now));
 for(let index=0;index<questions.length;index++)statements.push(db.prepare(`INSERT INTO practice_plan_questions(plan_id,question_id,sort_order)
  SELECT batch_id,question_id,sort_order FROM auto_question_insert_receipts WHERE batch_id=? AND sort_order=?`).bind(id,index+1));
 return statements;
}
