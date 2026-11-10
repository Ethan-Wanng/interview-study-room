'use client';
import {useEffect} from 'react';
import {isStaleChunkError,reloadForNewVersion} from './components/stale-reload';
import {reportError} from './components/report-error';

// 全站兜底的出错页：代码文件加载失败（多半是网站刚更新）就自动刷新；其他错误显示原因，
// 并提供“清除试卷答题记录”，只删本浏览器里保存的试卷答卷，关卡进度和最佳成绩都保留。
export default function GlobalError({error}:{error:Error&{digest?:string}}){
 const stale=isStaleChunkError(error);
 useEffect(()=>{if(stale)reloadForNewVersion();else reportError(error)},[stale,error]);
 // 答卷不直接删：挪到 “:paper-backup:” 键下（页面不再读取，需要时可以找回）。
 const clearPapers=()=>{try{for(const k of Object.keys(localStorage))if(k.includes(':paper:')){const v=localStorage.getItem(k);if(v)localStorage.setItem(k.replace(':paper:',':paper-backup:')+':'+Date.now(),v);localStorage.removeItem(k)}}catch{/* 存储不可用时直接刷新 */}location.reload()};
 const btn={height:38,padding:'0 16px',borderRadius:9,border:'1px solid #444',background:'#222',color:'#eee',fontSize:15,cursor:'pointer'};
 return <html lang="zh-CN"><body style={{margin:0,minHeight:'100vh',display:'grid',placeItems:'center',background:'#0b0b0f',color:'#eee',fontFamily:'system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif'}}>
  <main style={{maxWidth:420,padding:'32px 24px'}}>
   <h1 style={{fontSize:22,margin:'0 0 10px'}}>{stale?'网站刚刚更新，正在刷新…':'页面出错了'}</h1>
   <p style={{color:'#aaa',lineHeight:1.7,margin:'0 0 18px'}}>{stale?'如果几秒后还没有刷新，请点下面的“刷新页面”。':'可以先刷新试试；如果是打开试卷时出错，可以先把本浏览器里的试卷答卷收起来再打开（答卷会另存一份备份，关卡进度和最佳成绩不受影响）。这次错误已自动记录。'}</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <button style={{...btn,background:'#eee',color:'#111'}} onClick={()=>location.reload()}>刷新页面</button>
    <button style={btn} onClick={()=>history.back()}>返回上一页</button>
    {!stale&&<button style={btn} onClick={clearPapers}>收起试卷答卷后刷新</button>}
   </div>
   {!stale&&<p style={{marginTop:20,color:'#777',fontSize:12,wordBreak:'break-all'}}>错误信息：{error.message||String(error)}{error.digest?`（${error.digest}）`:''}</p>}
  </main></body></html>}
