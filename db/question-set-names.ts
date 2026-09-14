import {studyDb} from './study';
import {questionSetModes,type QuestionSetInput} from '@/lib/question-set';

// Resolve legacy plans as well as new plans through their existing subject.
// Built-in Go/backend subjects live in the shared go-interview space.
export async function questionSetExists(set:QuestionSetInput,spaceId:string){
 return !!await studyDb().prepare(`SELECT p.id FROM practice_plans p LEFT JOIN subjects s ON s.id=p.subject_id
  WHERE coalesce(s.space_id,CASE WHEN p.subject_id IN ('go','backend') THEN 'go-interview' ELSE p.subject_id END)=?
  AND json_extract(p.payload,'$.mode')=? AND trim(json_extract(p.payload,'$.title'))=? LIMIT 1`)
  .bind(spaceId,questionSetModes[set.type],set.name).first();
}
