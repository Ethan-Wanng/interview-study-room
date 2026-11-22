'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell,KeyRound,LogOut,Pencil,RefreshCw,RotateCcw,Search,Trash2,UserX} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {useI18n} from '../components/i18n';

export type ManagedUser={
 id:string;
 username:string;
 displayName:string;
 isGuest:boolean;
 createdAt:number;
 oauth:string[];
 activeSessions:number;
 learnedCount:number;
 lastActiveDay:string;
 aiGradeToday:number;
 aiTutorToday:number;
 syncKeys:number;
 adminRole:string;
 adminName:string;
 adminEnabled:boolean;
};

type UsersResponse={
 stats:{total:number;registered:number;guests:number;activeSessions:number;todayActive:number};
 totalMatched:number;
 limit:number;
 offset:number;
 users:ManagedUser[];
 error?:string;
};

const PAGE_SIZE=50;

function accountIdentity(u:ManagedUser):string{
 if(u.username.startsWith('email:'))return u.username.slice(6);
 return u.username;
}

function accountDisplayTitle(u:ManagedUser,L:(zh:string,en:string)=>string):string{
 if(u.displayName)return u.displayName;
 if(u.isGuest)return L('游客','Guest');
 return accountIdentity(u);
}

export default function UserManager(){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;

 const [data,setData]=useState<UsersResponse|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const [search,setSearch]=useState('');
 const [query,setQuery]=useState('');
 const [typeFilter,setTypeFilter]=useState<'all'|'registered'|'guest'>('all');
 const [page,setPage]=useState(0);

 const [renameTarget,setRenameTarget]=useState<ManagedUser|null>(null);
 const [renameVal,setRenameVal]=useState('');
 const [pwdTarget,setPwdTarget]=useState<ManagedUser|null>(null);
 const [pwdVal,setPwdVal]=useState('');
 const [notifyTarget,setNotifyTarget]=useState<ManagedUser|null>(null);
 const [notifyTitle,setNotifyTitle]=useState('');
 const [notifyBody,setNotifyBody]=useState('');
 const [notifyLink,setNotifyLink]=useState('');
 const [deleteTarget,setDeleteTarget]=useState<ManagedUser|null>(null);
 const [pruneOpen,setPruneOpen]=useState(false);

 const pendingRef=useRef(false);

 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   setQuery(search.trim());
   setPage(0);
  },250);
  return()=>window.clearTimeout(timer);
 },[search]);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const params=new URLSearchParams({
    type:typeFilter,
    limit:String(PAGE_SIZE),
    offset:String(page*PAGE_SIZE),
   });
   if(query)params.set('q',query);
   const r=await fetch('/api/admin/users?'+params.toString(),{cache:'no-store'});
   const d=await r.json() as UsersResponse;
   if(!r.ok)throw Error(d.error??L('加载用户失败','Failed to load users'));
   setData(d);
   setError('');
  }catch(e){
   setError((e as Error).message);
  }finally{
   setLoading(false);
  }
 },[typeFilter,page,query,L]);

 useEffect(()=>{void load()},[load]);

 useEffect(()=>{
  if(!notice)return;
  const t=window.setTimeout(()=>setNotice(''),4500);
  return()=>window.clearTimeout(t);
 },[notice]);

 async function postAction(payload:Record<string,unknown>,successMsg?:string){
  if(pendingRef.current)return null;
  pendingRef.current=true;
  setBusy(true);
  setError('');
  try{
   const r=await fetch('/api/admin/users',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
   });
   const d=await r.json() as {ok?:boolean;deleted?:number;error?:string};
   if(!r.ok)throw Error(d.error??L('操作失败','Action failed'));
   if(successMsg)setNotice(successMsg);
   await load();
   return d;
  }catch(e){
   setError((e as Error).message);
   return null;
  }finally{
   pendingRef.current=false;
   setBusy(false);
  }
 }

 const totalPages=Math.max(1,Math.ceil((data?.totalMatched??0)/PAGE_SIZE));

 return (
  <section className="admin-card um-wrap">
   {error&&<div className="error" role="alert">{error}<button onClick={()=>setError('')}>{L('关闭','Dismiss')}</button></div>}
   {notice&&<div className="admin-notice" role="status"><span>{notice}</span></div>}

   {data&&(
    <div className="um-stats">
     <div className="um-stat">
      <span>{L('总账号','Total')}</span>
      <strong>{data.stats.total}</strong>
     </div>
     <div className="um-stat">
      <span>{L('正式用户','Registered')}</span>
      <strong>{data.stats.registered}</strong>
     </div>
     <div className="um-stat">
      <span>{L('游客','Guests')}</span>
      <strong>{data.stats.guests}</strong>
     </div>
     <div className="um-stat">
      <span>{L('在线会话','Active Sessions')}</span>
      <strong>{data.stats.activeSessions}</strong>
     </div>
     <div className="um-stat">
      <span>{L('今日活跃','Active Today')}</span>
      <strong>{data.stats.todayActive}</strong>
     </div>
    </div>
   )}

   <div className="um-toolbar">
    <label className="admin-search">
     <Search size={18}/>
     <input
      aria-label={L('搜索用户','Search users')}
      placeholder={L('搜索昵称、邮箱、ID…','Search name, email, ID…')}
      value={search}
      onChange={e=>setSearch(e.target.value)}
     />
    </label>
    <Select value={typeFilter} onValueChange={v=>{setTypeFilter(v as 'all'|'registered'|'guest');setPage(0)}}>
     <SelectTrigger aria-label={L('账号类型','Account type')} className="um-type-select">
      <SelectValue/>
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="all">{L('全部账号','All accounts')}</SelectItem>
      <SelectItem value="registered">{L('正式用户','Registered')}</SelectItem>
      <SelectItem value="guest">{L('游客账号','Guests')}</SelectItem>
     </SelectContent>
    </Select>
    <button type="button" className="button secondary" disabled={busy||loading} onClick={()=>void load()}>
     <RefreshCw size={15}/>
     <span>{L('刷新','Refresh')}</span>
    </button>
    <button type="button" className="button secondary" disabled={busy} onClick={()=>setPruneOpen(true)}>
     <UserX size={15}/>
     <span>{L('清理过期游客','Prune Guests')}</span>
    </button>
   </div>

   {loading&&!data?(
    <p className="um-empty">{L('加载中…','Loading…')}</p>
   ):!data?.users.length?(
    <p className="um-empty">{L('暂无匹配用户','No matching users')}</p>
   ):(
    <div className="um-list">
     {data.users.map(u=>{
      const title=accountDisplayTitle(u,L);
      const idText=accountIdentity(u);
      const isOwner=u.adminRole==='owner';
      const hasQuota=u.aiGradeToday>0||u.aiTutorToday>0;
      return (
       <article key={u.id} className="um-row">
        <div className="um-main">
         <div className="um-head">
          <strong className="um-name">{title}</strong>
          {u.adminRole?(
           <span className={'um-badge '+(isOwner?'owner':'admin')}>
            {isOwner?L('站点管理员','Owner'):L('管理员','Admin')}
           </span>
          ):u.isGuest?(
           <span className="um-badge guest">{L('游客','Guest')}</span>
          ):(
           <span className="um-badge user">{L('正式','Member')}</span>
          )}
          {u.oauth.map(tag=>(
           <span key={tag} className="um-badge oauth">{tag}</span>
          ))}
         </div>
         <div className="um-meta">
          <span className="um-mono" title={u.id}>{idText}</span>
          <span>{L('注册 ','Joined ')}{new Date(u.createdAt).toLocaleDateString(locale==='en'?'en-GB':'zh-CN')}</span>
          <span>{L(`已学 ${u.learnedCount} 题`,`${u.learnedCount} learned`)}</span>
          {u.lastActiveDay&&<span>{L(`最近活跃 ${u.lastActiveDay}`,`Active ${u.lastActiveDay}`)}</span>}
          <span>{L(`今日 AI 评分 ${u.aiGradeToday} · 问答 ${u.aiTutorToday}`,`AI Grade ${u.aiGradeToday} · Tutor ${u.aiTutorToday}`)}</span>
          {u.syncKeys>0&&<span>{L(`云同步 ${u.syncKeys} 项`,`Sync ${u.syncKeys}`)}</span>}
          {u.activeSessions>0&&<span className="um-online">{L(`在线 ${u.activeSessions}`,`Sessions ${u.activeSessions}`)}</span>}
         </div>
        </div>
        <div className="um-actions">
         <button
          type="button"
          className="um-btn"
          disabled={busy}
          onClick={()=>{setRenameTarget(u);setRenameVal(u.displayName||title)}}
         >
          <Pencil size={13}/>
          <span>{L('改昵称','Rename')}</span>
         </button>
         {!u.isGuest&&(
          <button
           type="button"
           className="um-btn"
           disabled={busy}
           onClick={()=>{setPwdTarget(u);setPwdVal('')}}
          >
           <KeyRound size={13}/>
           <span>{L('改密码','Password')}</span>
          </button>
         )}
         {!u.isGuest&&(
          <button
           type="button"
           className="um-btn"
           disabled={busy}
           onClick={()=>{setNotifyTarget(u);setNotifyTitle('');setNotifyBody('');setNotifyLink('')}}
          >
           <Bell size={13}/>
           <span>{L('发通知','Notify')}</span>
          </button>
         )}
         {hasQuota&&(
          <button
           type="button"
           className="um-btn"
           disabled={busy}
           onClick={()=>void postAction({action:'resetQuota',userId:u.id},L(`已重置「${title}」今日 AI 配额`,`Reset AI quota for ${title}`))}
          >
           <RotateCcw size={13}/>
           <span>{L('重置配额','Reset Quota')}</span>
          </button>
         )}
         {u.activeSessions>0&&(
          <button
           type="button"
           className="um-btn"
           disabled={busy}
           onClick={()=>void postAction({action:'forceLogout',userId:u.id},L(`已将「${title}」强制下线`,`Signed out ${title}`))}
          >
           <LogOut size={13}/>
           <span>{L('下线','Logout')}</span>
          </button>
         )}
         {!isOwner&&(
          <button
           type="button"
           className="um-btn danger"
           disabled={busy}
           onClick={()=>setDeleteTarget(u)}
          >
           <Trash2 size={13}/>
           <span>{L('删除','Delete')}</span>
          </button>
         )}
        </div>
       </article>
      );
     })}
    </div>
   )}

   {data&&data.totalMatched>PAGE_SIZE&&(
    <div className="um-pager">
     <button type="button" className="button secondary" disabled={page===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}>
      {L('上一页','Previous')}
     </button>
     <span>{page+1} / {totalPages}</span>
     <button type="button" className="button secondary" disabled={page+1>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>
      {L('下一页','Next')}
     </button>
    </div>
   )}

   <Dialog open={!!renameTarget} onOpenChange={open=>{if(!open&&!busy)setRenameTarget(null)}}>
    <DialogContent className="admin-secret-dialog">
     <DialogHeader>
      <DialogTitle>{L('修改用户昵称','Rename User')}</DialogTitle>
     </DialogHeader>
     <form onSubmit={async e=>{
      e.preventDefault();
      if(!renameTarget)return;
      const res=await postAction({action:'updateDisplayName',userId:renameTarget.id,displayName:renameVal},L('昵称已更新','Display name updated'));
      if(res)setRenameTarget(null);
     }}>
      <label>
       {L('显示昵称','Display name')}
       <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} maxLength={40} required/>
      </label>
      <div className="um-dialog-foot">
       <button type="button" className="button secondary" disabled={busy} onClick={()=>setRenameTarget(null)}>{L('取消','Cancel')}</button>
       <button type="submit" className="button primary" disabled={busy}>{L('保存','Save')}</button>
      </div>
     </form>
    </DialogContent>
   </Dialog>

   <Dialog open={!!pwdTarget} onOpenChange={open=>{if(!open&&!busy)setPwdTarget(null)}}>
    <DialogContent className="admin-secret-dialog">
     <DialogHeader>
      <DialogTitle>{L('重置用户密码','Reset Password')}</DialogTitle>
     </DialogHeader>
     <form onSubmit={async e=>{
      e.preventDefault();
      if(!pwdTarget)return;
      const res=await postAction({action:'resetPassword',userId:pwdTarget.id,password:pwdVal},L('密码已重置并下线旧会话','Password reset and sessions cleared'));
      if(res){setPwdTarget(null);setPwdVal('')}
     }}>
      <label>
       {L('新密码（8–128 位）','New password (8–128 chars)')}
       <input type="password" value={pwdVal} onChange={e=>setPwdVal(e.target.value)} minLength={8} maxLength={128} required autoComplete="new-password"/>
      </label>
      <div className="um-dialog-foot">
       <button type="button" className="button secondary" disabled={busy} onClick={()=>setPwdTarget(null)}>{L('取消','Cancel')}</button>
       <button type="submit" className="button primary" disabled={busy}>{L('确认重置','Reset')}</button>
      </div>
     </form>
    </DialogContent>
   </Dialog>

   <Dialog open={!!notifyTarget} onOpenChange={open=>{if(!open&&!busy)setNotifyTarget(null)}}>
    <DialogContent className="admin-secret-dialog">
     <DialogHeader>
      <DialogTitle>{L('发送站内通知','Send Notification')}</DialogTitle>
     </DialogHeader>
     <form onSubmit={async e=>{
      e.preventDefault();
      if(!notifyTarget)return;
      const res=await postAction(
       {action:'sendNotification',userId:notifyTarget.id,title:notifyTitle,body:notifyBody,link:notifyLink},
       L('通知已发送','Notification sent'),
      );
      if(res)setNotifyTarget(null);
     }}>
      <label>
       {L('标题','Title')}
       <input value={notifyTitle} onChange={e=>setNotifyTitle(e.target.value)} maxLength={100} required/>
      </label>
      <label>
       {L('内容','Body')}
       <textarea rows={3} value={notifyBody} onChange={e=>setNotifyBody(e.target.value)} maxLength={600}/>
      </label>
      <label>
       {L('跳转路径（可选，以 / 开头）','Link (optional, starts with /)')}
       <input value={notifyLink} onChange={e=>setNotifyLink(e.target.value)} maxLength={200} placeholder="/learn"/>
      </label>
      <div className="um-dialog-foot">
       <button type="button" className="button secondary" disabled={busy} onClick={()=>setNotifyTarget(null)}>{L('取消','Cancel')}</button>
       <button type="submit" className="button primary" disabled={busy}>{L('发送','Send')}</button>
      </div>
     </form>
    </DialogContent>
   </Dialog>

   <AlertDialog open={!!deleteTarget} onOpenChange={open=>{if(!open&&!busy)setDeleteTarget(null)}}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>{L('删除该用户账号？','Delete this account?')}</AlertDialogTitle>
      <AlertDialogDescription>
       {deleteTarget?`${accountDisplayTitle(deleteTarget,L)} (${accountIdentity(deleteTarget)})`:''}
       <br/>
       {L('将永久删除该用户的登录会话、学习进度、笔记同步数据与个人题目，无法恢复。','This permanently deletes sessions, progress, synced notes, and custom questions.')}
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel disabled={busy}>{L('取消','Cancel')}</AlertDialogCancel>
      <button
       type="button"
       className="button primary"
       disabled={busy}
       onClick={async()=>{
        if(!deleteTarget)return;
        const res=await postAction({action:'deleteUser',userId:deleteTarget.id},L('用户已删除','User deleted'));
        if(res)setDeleteTarget(null);
       }}
      >
       {L('确认删除','Delete')}
      </button>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

   <AlertDialog open={pruneOpen} onOpenChange={open=>{if(!open&&!busy)setPruneOpen(false)}}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>{L('清理 7 天前无记录的过期游客？','Prune inactive guests older than 7 days?')}</AlertDialogTitle>
      <AlertDialogDescription>
       {L('仅删除超过 7 天、无在线会话、无学习进度且无云同步数据的游客账号。','Only removes guest accounts older than 7 days with no active sessions, progress, or synced data.')}
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel disabled={busy}>{L('取消','Cancel')}</AlertDialogCancel>
      <button
       type="button"
       className="button primary"
       disabled={busy}
       onClick={async()=>{
        const res=await postAction({action:'pruneGuests',days:7});
        if(res){
         setNotice(L(`已清理 ${res.deleted??0} 个过期游客账号`,`Pruned ${res.deleted??0} inactive guest accounts`));
         setPruneOpen(false);
        }
       }}
      >
       {L('确认清理','Prune')}
      </button>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </section>
 );
}
