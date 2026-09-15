import {studyDb} from './study';
export type Execution={executionId:string;idempotencyKey:string;createdAt:number;requestedCount:number;questionSetType:string|null;questionSetName:string|null};
type Outcome={status:'success'|'failed'|'replayed';createdCount:number;linkedCount:number;questionSetId:string|null;errorCode:string|null;errorMessage:string|null};
export function executionLogStatement(execution:Execution,outcome:Outcome){
 const metadata={...execution,...outcome,replayed:outcome.status==='replayed'};
 // Evaluate completion time in the database after the transaction guard.
 const finished="max(?,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))";
 return studyDb().prepare(`INSERT INTO auto_question_logs(id,key,status,count,detail,created_at,metadata)
 VALUES(?,?,?,?,?,?,json_set(?,'$.finishedAt',${finished},'$.durationMs',${finished}-?))`)
 .bind(execution.executionId,execution.idempotencyKey,outcome.status,outcome.createdCount,outcome.errorMessage??(outcome.status==='replayed'?'返回已有执行结果':'批量新增完成'),execution.createdAt,JSON.stringify(metadata),execution.createdAt,execution.createdAt,execution.createdAt);
}
export async function recordExecution(execution:Execution,outcome:Outcome){
 try{await executionLogStatement(execution,outcome).run()}catch{console.error('Auto question execution log write failed')}
}
export async function executionLogs(){
 const {results}=await studyDb().prepare('SELECT id,key,status,count,detail,created_at,metadata FROM auto_question_logs ORDER BY created_at DESC,id DESC LIMIT 50').all<{id:string;key:string;status:string;count:number;detail:string;created_at:number;metadata:string|null}>();
 return results.map(({metadata,...row})=>({...row,
  executionId:row.id,idempotencyKey:row.key,questionSetType:null,questionSetName:null,questionSetId:null,
  requestedCount:null,createdCount:row.status==='success'?row.count:0,linkedCount:null,
  replayed:row.status==='replayed',errorCode:null,errorMessage:row.status==='failed'||row.status==='rejected'?row.detail:null,
  createdAt:row.created_at,finishedAt:null,durationMs:null,...(metadata?JSON.parse(metadata):{}),
  status:row.status==='rejected'?'failed':row.status,
 }));
}
