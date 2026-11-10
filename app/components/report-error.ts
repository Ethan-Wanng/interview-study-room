'use client';
// 把页面报错发给服务器记下来（/api/client-error）。同一条错误一分钟内只报一次，上报失败不影响页面。
const recent=new Map<string,number>();
export function reportError(error:unknown,extra:{examId?:string;context?:unknown}={}){
 try{
  const e=error instanceof Error?error:new Error(typeof error==='string'?error:JSON.stringify(error));
  const sig=e.message+'|'+(extra.examId??''),now=Date.now();
  if((recent.get(sig)??0)>now-60000)return;recent.set(sig,now);
  const examId=extra.examId??new URLSearchParams(location.search).get('exam')??'';
  let context='';try{context=extra.context===undefined?'':JSON.stringify(extra.context).slice(0,20000)}catch{}
  void fetch('/api/client-error',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
   body:JSON.stringify({message:e.message||String(e),stack:(e.stack??'').slice(0,8000),path:location.pathname+location.search,examId,context})}).catch(()=>{});
 }catch{/* 上报本身出错就算了 */}
}
