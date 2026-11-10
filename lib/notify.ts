import {studyDb} from '@/db/study';

export type Notice={id:string;kind:string;title:string;body:string;link:string;createdAt:number;read:boolean};

// 给某个用户发一条站内通知（比如他提交的反馈有了处理结果）。
export async function notifyUser(userId:string,n:{kind:string;title:string;body?:string;link?:string}){
 if(!userId)return;
 await studyDb().prepare('INSERT INTO notifications(id,user_id,kind,title,body,link,created_at) VALUES(?,?,?,?,?,?,?)')
  .bind('nt-'+crypto.randomUUID(),userId,n.kind,n.title.slice(0,200),(n.body??'').slice(0,2000),(n.link??'').slice(0,300),Date.now()).run();
}

export async function listNotices(userId:string):Promise<Notice[]>{
 const rows=await studyDb().prepare('SELECT id,kind,title,body,link,created_at,read_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all<Record<string,unknown>>();
 return (rows.results??[]).map(r=>({id:String(r.id),kind:String(r.kind),title:String(r.title),body:String(r.body??''),link:String(r.link??''),createdAt:Number(r.created_at),read:r.read_at!=null}));
}

export async function markRead(userId:string,ids?:string[]){
 const db=studyDb(),now=Date.now();
 if(!ids){await db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').bind(now,userId).run();return}
 if(!ids.length)return;
 await db.batch(ids.slice(0,50).map(id=>db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND id=? AND read_at IS NULL').bind(now,userId,id)));
}
