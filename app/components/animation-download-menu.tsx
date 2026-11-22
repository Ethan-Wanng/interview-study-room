'use client';
import {useEffect,useRef,useState} from 'react';
import {AlertCircle,Check,Download,Film,X} from 'lucide-react';
import {
 cancelAnimationDownload,
 dismissAnimationDownload,
 setDownloadPanelOpen,
 useAnimationDownloads,
} from '@/app/ai/animations/download-manager';
import {useI18n} from './i18n';
import {NoticePopover} from './notices';

// 顶栏的「下载」：仅在后台有视频正在静默合成或刚完成/失败时出现；离开动画页也不会中断下载。
export function AnimationDownloadMenu(){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const jobs=useAnimationDownloads();
 const [open,setOpen]=useState(false);
 const box=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  setDownloadPanelOpen(open&&jobs.length>0);
  return()=>setDownloadPanelOpen(false);
 },[open,jobs.length]);

 if(!jobs.length)return null;

 const running=jobs.filter(j=>j.status==='running');
 const hasError=jobs.some(j=>j.status==='error');
 const avgPct=running.length?Math.round(running.reduce((s,j)=>s+j.pct,0)/running.length):100;
 const aria=running.length
  ? L(`视频下载中 ${avgPct}%（${running.length} 项）`,`Downloading video ${avgPct}% (${running.length})`)
  : hasError
   ? L('视频下载失败','Video download failed')
   : L('视频下载完成','Video download finished');

 const close=()=>setOpen(false);

 return (
  <div className="notice-bell an-dl-bell" ref={box}>
   <button
    type="button"
    className={'notice-bell-btn an-dl-btn'+(running.length?' active':'')+(hasError?' err':'')}
    aria-label={aria}
    title={aria}
    aria-expanded={open}
    onClick={()=>setOpen(v=>!v)}
   >
    {running.length?<Download size={18}/>:hasError?<AlertCircle size={18}/>:<Check size={18}/>}
    {running.length>0&&<span className="an-dl-badge">{avgPct}%</span>}
   </button>
   <NoticePopover open={open} triggerRef={box} onClose={close} label={L('后台视频下载','Background video downloads')}>
    <div className="notice-panel-head">
     <strong>{L('视频下载','Video downloads')}</strong>
     <span>{running.length?L('离开当前页也会继续','Continues while browsing'):L('已处理','Finished')}</span>
    </div>
    <div className="notice-list">
     {jobs.map(job=>{
      const statusText=job.status==='running'
       ? L(`后台静默合成中 ${job.pct}%`,`Synthesizing quietly ${job.pct}%`)
       : job.status==='done'
        ? L('已保存到下载文件夹','Saved to downloads')
        : L('合成失败，请返回动画重试','Failed — retry in animation');
      return (
       <div key={job.id} className={'notice-item an-dl-item'+(job.status==='running'?' unread':'')}>
        <Film size={16}/>
        <span className="an-dl-meta">
         <b>{job.title}</b>
         <small>{statusText}</small>
         <span className={'an-dl-bar'+(job.status==='done'?' done':job.status==='error'?' err':'')} role="progressbar" aria-valuenow={job.pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{width:`${job.pct}%`}}/>
         </span>
        </span>
        {job.status==='running'?(
         <button type="button" className="an-dl-cancel" onClick={()=>cancelAnimationDownload(job.id)} aria-label={L('取消下载','Cancel download')} title={L('取消下载','Cancel download')}>
          <X size={14}/><span>{L('取消','Cancel')}</span>
         </button>
        ):(
         <button type="button" className="an-dl-dismiss" onClick={()=>dismissAnimationDownload(job.id)} aria-label={L('关闭','Dismiss')} title={L('关闭','Dismiss')}>
          <X size={14}/>
         </button>
        )}
       </div>
      );
     })}
    </div>
   </NoticePopover>
  </div>
 );
}
