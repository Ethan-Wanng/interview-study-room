import type {SceneTiming} from '@/app/ai/animations/subtitle';

export type ModelStatus={
 loaded:boolean;
 loading:boolean;
 device:string;
 vramAllocMb:number;
 vramTotalMb:number;
};

export type JobInfo={
 id:string;
 kind:string;
 title:string;
 status:'running'|'done'|'error'|'cancelled';
 done:number;
 total:number;
 message:string;
 logs:string[];
 error:string|null;
 result:unknown;
 startedAt:number;
 finishedAt:number|null;
};

export type BridgeStateResponse={
 model:ModelStatus;
 jobs:JobInfo[];
 doneCount:number;
};

export type GlossaryRule={
 find:string;
 replace:string;
 enabled:boolean;
 note?:string;
};

export type SceneBridgeStatus={
 hash:string;
 indexMs?:number|null;
 is04?:boolean;
 hasOverride?:boolean;
 overrideText?:string;
 notes?:string;
 approved?:boolean;
 takesCount?:number;
 timingWarn?:boolean;
 timing?:SceneTiming|null;
 hasTiming?:boolean;
};

export type BridgeCatalogResponse={
 totalDone04:number;
 glossary:GlossaryRule[];
 model:ModelStatus;
 animations:{
  id:string;
  doneCount:number;
  approvedCount:number;
  warnCount:number;
  scenes:SceneBridgeStatus[];
 }[];
};

export type TakeEntry={
 id:string;
 mode:string;
 seed:number;
 temp:number;
 top_p:number;
 speed:number;
 ms:number;
 rms:number;
 text:string;
 source:string;
 createdAt:string;
};

export type SceneDetailResponse={
 is04:boolean;
 indexMs:number|null;
 actualMs:number|null;
 speechStartMs?:number|null;
 speechEndMs?:number|null;
 timing?:SceneTiming;
 liveSr:number;
 liveRms:number;
 peaks:number[];
 overrideText:string;
 notes:string;
 approved:boolean;
 effectiveScript:string;
 takes:TakeEntry[];
 hasOriginalBackup:boolean;
 originalMs:number|null;
};

export function fmtMs(ms?:number|null):string{
 if(ms==null||!Number.isFinite(ms))return '--';
 if(ms>=10000)return `${(ms/1000).toFixed(2)}s (${Math.round(ms)}ms)`;
 return `${Math.round(ms)} ms (${(ms/1000).toFixed(2)}s)`;
}

export function fmtShortSec(ms?:number|null):string{
 if(ms==null||!Number.isFinite(ms))return '--';
 return `${(ms/1000).toFixed(2)}s`;
}

export function applyGlossaryPreview(text:string,rules:GlossaryRule[]):string{
 let out=text;
 for(const r of rules){
  if(r.enabled===false||!r.find)continue;
  out=out.replaceAll(r.find,r.replace??'');
 }
 return out;
}

export function isTimingWarn(indexMs:number|null|undefined,sceneMs:number):boolean{
 if(!indexMs)return false;
 return indexMs>Math.max(sceneMs*2.4,14000)||indexMs<700;
}
