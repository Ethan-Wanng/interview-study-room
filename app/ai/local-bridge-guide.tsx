'use client';
import {useState} from 'react';
import {ArrowUpRight,Check,Copy,Download,X} from 'lucide-react';
import {Dialog as DialogPrimitive} from 'radix-ui';
import {LOCAL_BRIDGE_PROVIDERS,LOCAL_PROVIDER_LABEL,type LocalBridgeProvider} from '@/lib/local-bridge-config';

export const BRIDGE_LAUNCH_CMD='npx -y interview-study-bridge@latest';
export const BRIDGE_INSTALL_CLI_CMD='npx -y interview-study-bridge@latest install';

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

const BRIDGE_DOWNLOADS=[
 {os:'win-x64',label:'Windows x64 (.exe)'},
 {os:'darwin-arm64',label:'macOS (Apple Silicon)'},
 {os:'darwin-x64',label:'macOS (Intel)'},
 {os:'linux-x64',label:'Linux (x64)'},
] as const;

const CLIENT_CMDS:Record<LocalBridgeProvider,{installs:{labelZh:string;labelEn:string;cmd:string}[];login:string}>={
 antigravity:{
  installs:[
   {labelZh:'macOS / Linux',labelEn:'macOS / Linux',cmd:'curl -fsSL https://antigravity.google/cli/install.sh | bash'},
   {labelZh:'Windows',labelEn:'Windows',cmd:'irm https://antigravity.google/cli/install.ps1 | iex'},
  ],
  login:'agy acp --login',
 },
 codex:{
  installs:[
   {labelZh:'npm',labelEn:'npm',cmd:'npm i -g @openai/codex'},
   {labelZh:'macOS Homebrew',labelEn:'macOS Homebrew',cmd:'brew install --cask codex'},
  ],
  login:'codex login',
 },
 workbuddy:{
  installs:[
   {labelZh:'npm',labelEn:'npm',cmd:'npm i -g @tencent-ai/codebuddy-code'},
  ],
  login:'codebuddy login',
 },
};

export function LocalBridgeGuideContent({L}:{L:(zh:string,en:string)=>string}){
 const [tab,setTab]=useState<LocalBridgeProvider>('codex');
 const cur=CLIENT_CMDS[tab];
 return (
  <div className="lb-guide-body">
   <div className="lb-step">
    <div className="lb-step-head">
     <b>1</b>
     <strong>{L('下载桥接助手','Download Bridge')}</strong>
    </div>
    <div className="lb-dl-grid">
     {BRIDGE_DOWNLOADS.map(d=>(
      <a key={d.os} href={`/api/bridge-download?os=${d.os}`} download className="button secondary lb-dl-btn">
       <Download size={14}/> {d.label}
      </a>
     ))}
    </div>
    <CopyCmdRow cmd={BRIDGE_INSTALL_CLI_CMD} label={L('命令行','CLI')} L={L}/>
   </div>

   <div className="lb-step">
    <div className="lb-step-head">
     <b>2</b>
     <strong>{L('CLI 命令','CLI Commands')}</strong>
    </div>
    <div className="ai-cfg-providers">
     {LOCAL_BRIDGE_PROVIDERS.map(id=>(
      <button key={id} type="button" className={'ai-cfg-prov'+(tab===id?' on':'')} onClick={()=>setTab(id)}>
       {LOCAL_PROVIDER_LABEL[id]}
      </button>
     ))}
    </div>
    {cur.installs.map(item=>(
     <CopyCmdRow key={item.cmd} cmd={item.cmd} label={L(item.labelZh,item.labelEn)} L={L}/>
    ))}
    <CopyCmdRow cmd={cur.login} label={L('登录','Sign in')} L={L}/>
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
      <DialogPrimitive.Title className="lb-guide-title">{L('本地客户端','Local Client')}</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">{L('本地客户端配置','Local client setup')}</DialogPrimitive.Description>
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
