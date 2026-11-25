'use client';
import {useState} from 'react';
import {ArrowUpRight,Check,Copy,X} from 'lucide-react';
import {Dialog as DialogPrimitive} from 'radix-ui';
import {LOCAL_BRIDGE_PROVIDERS,LOCAL_PROVIDER_LABEL,type LocalBridgeProvider} from '@/lib/local-bridge-config';

export const BRIDGE_LAUNCH_CMD='npx -y interview-study-bridge';

export function copyTextToClipboard(cmd:string):Promise<boolean>{
 try{
  if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(cmd).then(()=>true,()=>false);
 }catch{}
 try{
  const ta=document.createElement('textarea');
  ta.value=cmd;
  ta.style.position='fixed';
  ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.select();
  const ok=document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve(ok);
 }catch{
  return Promise.resolve(false);
 }
}

function CopyCmdRow({cmd,label,L}:{cmd:string;label?:string;L:(zh:string,en:string)=>string}){
 const [copied,setCopied]=useState(false);
 const onCopy=async()=>{
  if(await copyTextToClipboard(cmd)){
   setCopied(true);
   setTimeout(()=>setCopied(false),1800);
  }
 };
 return (
  <div className="lb-cmd-wrap">
   {label&&<span className="lb-cmd-label">{label}</span>}
   <div className="lb-cmd-row">
    <code>{cmd}</code>
    <button type="button" className="ai-cfg-chip lb-copy-btn" onClick={()=>void onCopy()} aria-label={L('复制命令','Copy command')}>
     {copied?<><Check size={12}/> {L('已复制','Copied')}</>:<><Copy size={12}/> {L('复制','Copy')}</>}
    </button>
   </div>
  </div>
 );
}

const CLIENT_CMDS:Record<LocalBridgeProvider,{install?:string;login:string;bin:string}>={
 antigravity:{bin:'agy',login:'agy acp --login'},
 codex:{bin:'codex',login:'codex login'},
 workbuddy:{bin:'codebuddy',install:'npm i -g @tencent-ai/codebuddy-code',login:'codebuddy login'},
};

export function LocalBridgeGuideContent({L}:{L:(zh:string,en:string)=>string}){
 const [tab,setTab]=useState<LocalBridgeProvider>('antigravity');
 const cur=CLIENT_CMDS[tab];
 return (
  <div className="lb-guide-body">
   <div className="lb-step">
    <div className="lb-step-head">
     <b>1</b>
     <strong>{L('登录本机客户端（任选其一）','Sign in to local CLI (pick one)')}</strong>
    </div>
    <div className="ai-cfg-providers">
     {LOCAL_BRIDGE_PROVIDERS.map(id=>(
      <button key={id} type="button" className={'ai-cfg-prov'+(tab===id?' on':'')} onClick={()=>setTab(id)}>
       {LOCAL_PROVIDER_LABEL[id]}
      </button>
     ))}
    </div>
    {cur.install&&<CopyCmdRow cmd={cur.install} label={L('安装 CLI','Install CLI')} L={L}/>}
    <CopyCmdRow cmd={cur.login} label={L(`终端登录（命令：${cur.bin}）`,`Terminal login (${cur.bin})`)} L={L}/>
   </div>

   <div className="lb-step">
    <div className="lb-step-head">
     <b>2</b>
     <strong>{L('启动本机桥接服务','Start local bridge')}</strong>
     <span className="lb-node-badge">Node.js &gt;= 20</span>
    </div>
    <CopyCmdRow cmd={BRIDGE_LAUNCH_CMD} L={L}/>
    <pre className="lb-term-pre">{'Bridge listening: http://127.0.0.1:43180\nPairing token:    brg_xxxxxxxxxxxxxxxx...'}</pre>
    <div className="lb-flags">
     <span><code>--port 43180</code> {L('指定端口','Port')}</span>
     <span><code>--print-token</code> {L('查看配对码','Show token')}</span>
     <span><code>--reset-token</code> {L('重置配对码','Reset token')}</span>
    </div>
   </div>

   <div className="lb-step">
    <div className="lb-step-head">
     <b>3</b>
     <strong>{L('网页配对连接','Pair in browser')}</strong>
    </div>
    <ol className="lb-connect-steps">
     <li>{L('保持终端窗口运行，在「本地客户端」选择对应客户端，填入端口 43180 与完整 brg_... 配对码。','Keep the terminal open, pick the matching client, and enter port 43180 with the full brg_... token.')}</li>
     <li>{L('点击「连接并保存」；浏览器首次弹出「本地网络设备访问权限」时点「允许」。','Click "Connect & Save"; click "Allow" if the browser prompts for Local Network Access.')}</li>
     <li>{L('右上角变为绿色「已连接」后，勾选「启用本地客户端」即可接管 AI 问答与评分。','Once status turns green ("Connected"), check "Enable local client" to route AI Tutor & Grading locally.')}</li>
    </ol>
   </div>

   <div className="lb-step">
    <div className="lb-step-head">
     <strong>{L('常见问题','Troubleshooting')}</strong>
    </div>
    <dl className="lb-faq">
     <div>
      <dt>{L('是否影响桌面端登录或本地代码安全？','Does it affect my desktop app login or local files?')}</dt>
      <dd>{L('不会退出桌面端账号。桥接锁定在系统空临时目录运行，自动拒绝一切文件写入与命令执行。','No. It reuses official CLI sessions in an empty temp directory and rejects all file writes and shell commands.')}</dd>
     </div>
     <div>
      <dt>{L('提示「未连接」','Status shows "Offline"')}</dt>
      <dd>{L('确认桥接终端未关闭、端口号一致，并在浏览器地址栏网站权限中允许「本地网络访问」。','Ensure the terminal is still running, ports match, and Local Network Access is allowed in site permissions.')}</dd>
     </div>
     <div>
      <dt>{L('提示「未登录 / 未安装」','Status shows "Login required / Not installed"')}</dt>
      <dd>{L('在终端执行步骤 1 对应命令后，点击面板「刷新」。','Run the Step 1 command in your terminal, then click "Refresh".')}</dd>
     </div>
    </dl>
   </div>
  </div>
 );
}

export function LocalBridgeGuideModal({open,onClose,L}:{open:boolean;onClose:()=>void;L:(zh:string,en:string)=>string}){
 return (
  <DialogPrimitive.Root open={open} onOpenChange={v=>{if(!v)onClose()}}>
   <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="lb-guide-overlay"/>
    <DialogPrimitive.Content className="lb-guide-dialog">
     <div className="lb-guide-head">
      <DialogPrimitive.Title className="lb-guide-title">{L('本地客户端连接教程','Local Client Guide')}</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">{L('本地客户端桥接启动与配对步骤','Steps to start and pair local client bridge')}</DialogPrimitive.Description>
      <div className="ai-cfg-head-actions">
       <a href="/ai/local-bridge" target="_blank" rel="noreferrer" className="ai-cfg-chip lb-open-link">
        {L('独立页面','Full page')} <ArrowUpRight size={12}/>
       </a>
       <DialogPrimitive.Close asChild>
        <button type="button" className="ai-dock-icon" aria-label={L('关闭','Close')}><X size={15}/></button>
       </DialogPrimitive.Close>
      </div>
     </div>
     <LocalBridgeGuideContent L={L}/>
    </DialogPrimitive.Content>
   </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
 );
}
