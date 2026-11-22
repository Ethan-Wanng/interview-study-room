'use client';
import {useState} from 'react';
import {BookOpen,ArrowRight} from 'lucide-react';
import {useI18n,LanguageControl} from '../components/i18n';
import ThemeControl from '../components/theme-control';
import type {Provider} from '@/lib/oauth';

const GitHubMark=()=><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>;
const GoogleMark=()=><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.3v3.11A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.3a12 12 0 0 0 0 10.78l3.99-3.11Z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.61l3.99 3.11C6.23 6.88 8.88 4.77 12 4.77Z"/></svg>;
const providerInfo:Record<Provider,{name:string;mark:() => React.ReactElement}>={github:{name:'GitHub',mark:GitHubMark},google:{name:'Google',mark:GoogleMark}};
const errors:Record<string,[string,string]>={
 cancelled:['你取消了授权，可以重新选择登录方式。','Sign-in was cancelled. Choose a sign-in method to try again.'],
 expired:['登录已过期或校验失败，请重新登录。','The sign-in expired or could not be verified. Please try again.'],
 limited:['尝试次数过多，请 15 分钟后再试。','Too many attempts. Please try again in 15 minutes.'],
 unavailable:['该登录方式暂未开放。','This sign-in method is not available yet.'],
 failed:['登录失败，请稍后重试。','Sign-in failed. Please try again later.'],
};

export default function LoginClient({providers,error:initialError,returnTo}:{providers:Provider[];error:string;returnTo:string}){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [busy,setBusy]=useState(false),[error,setError]=useState(initialError?L(...(errors[initialError]??errors.failed)):'');
 const back=/^\/(?![\/\\])/.test(returnTo)?returnTo:'/';
 const [mode,setMode]=useState<'login'|'register'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[notice,setNotice]=useState('');
 async function submitEmail(e:React.FormEvent){e.preventDefault();setError('');
  if(mode==='register'&&password!==confirm){setError(L('两次输入的密码不一样。','The two passwords do not match.'));return}
  setBusy(true);try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode==='login'?'email-login':'email-register',email,password})});const d=await r.json() as {error?:string;linked?:boolean};if(!r.ok)throw new Error(d.error??t("暂时无法进入，请重试。"));
  if(d.linked){setNotice(L(`已给当前账号绑定邮箱 ${email.trim()}，以后在任何地址、任何设备上用它登录，都能看到现在的学习进度。`,`${email.trim()} is now linked to this account. Sign in with it on any address or device to see your progress.`));setBusy(false);return}
  window.location.assign(back)}catch(e){setError((e as Error).message);setBusy(false)}}
 async function enterGuest(){setBusy(true);setError('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'guest'})});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error??t("暂时无法进入，请重试。"));window.location.assign(back)}catch(e){setError((e as Error).message);setBusy(false)}}
 return <main className="login-page"><header className="login-header"><div className="brand"><div className="brand-icon"><BookOpen size={23}/></div><span>{t("面试自习室")}</span></div><div className="top-actions"><LanguageControl/><ThemeControl/></div></header><section className="login-card"><span className="eyebrow">YOUR STUDY SPACE</span><h1>{t("欢迎回到自习室")}</h1>
  <div className="email-mode" role="tablist">{(['login','register'] as const).map(m=><button key={m} type="button" role="tab" aria-selected={mode===m} className={mode===m?'active':''} onClick={()=>{setMode(m);setError('')}}>{m==='login'?L('邮箱登录','Email sign-in'):L('邮箱注册','Email sign-up')}</button>)}</div>
  <form className="email-form" onSubmit={e=>void submitEmail(e)}>
   <label>{L('邮箱','Email')}<input type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <label>{L('密码','Password')}<input type="password" required minLength={8} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={L('至少 8 位','At least 8 characters')}/></label>
   {mode==='register'&&<label>{L('再输一次密码','Repeat password')}<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}
   <button type="submit" className="button primary login-submit" disabled={busy}>{mode==='login'?L('登录','Sign in'):L('注册并登录','Sign up and sign in')}</button>
   {mode==='register'&&<p className="login-note email-tip">{L('密码无法通过邮件找回','Passwords cannot be reset by email')}</p>}
  </form>
  {providers.length>0&&<div className="login-divider"><span>{L('或','or')}</span></div>}
  <div className="oauth-list">{providers.map(p=>{const {name,mark:Mark}=providerInfo[p];return <a key={p} className="button primary login-submit oauth-button" aria-disabled={busy} href={`/api/auth/oauth/${p}?return_to=${encodeURIComponent(back)}`} onClick={()=>setBusy(true)}><Mark/>{L(`使用 ${name} 登录`,`Continue with ${name}`)}</a>})}</div>
  {error&&<p className="error" role="alert">{error}</p>}
  {notice&&<p className="account-message" role="status">{notice}</p>}
  <button type="button" className="button secondary login-submit guest-entry" disabled={busy} onClick={()=>void enterGuest()}>{t("免登录进入 · 游客体验")}<ArrowRight size={17}/></button>
  <p className="login-note">{L("游客记录清除 Cookie 或换设备后无法找回","Guest records are lost if you clear cookies or switch devices")}</p>
  </section><footer className="login-footer">{t("305 道面试题 · 每日目标 · 间隔复习")}</footer></main>}
