import {createHash,timingSafeEqual} from 'node:crypto';
import type {ManagedQuestion} from './catalog-types';

export function secureToken(actual:string,expected:string|undefined){
 if(!expected||actual.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
}
export function stableJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson((value as Record<string,unknown>)[k])).join(',')+'}';
 return JSON.stringify(value)??'null';
}
export const requestHash=(value:unknown)=>createHash('sha256').update(stableJson(value)).digest('hex');
export function normalizedTitle(value:string){return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');}
export function fingerprint(q:Pick<ManagedQuestion,'subjectId'|'kind'|'zh'>){
 return requestHash([q.subjectId,q.kind,normalizedTitle(q.zh.title)]);
}
