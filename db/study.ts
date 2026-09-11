import {env} from 'cloudflare:workers';
export function studyDb(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function dayNow(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function plusDays(day:string,n:number){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
