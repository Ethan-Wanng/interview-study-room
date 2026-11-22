'use client';
import {useEffect,useRef,useState} from 'react';

import ThemeControl from '@/app/components/theme-control';
import {ArrowLeft,Upload,ShieldCheck,Send,RefreshCw,FileJson,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {parseQuestionJson,consoleBody,verifyCreatedSet,type ConsoleDraft,type ConsoleType} from '@/lib/auto-question-console';
import {JOURNAL_KEY,readJournal,persistAttempt,confirmedResponse,type Attempt} from '@/lib/console-attempt';
import './console.css';
const labels={none:'只新增题目',training:'训练',mock:'模拟',exam:'考试'};
const sample=JSON.stringify({status:'draft',questions:[{subjectId:'go',kind:'practice',type:'short',topic:'并发',section:'Channel',zh:{title:'为什么通常由发送方关闭 channel？',answer:'发送方能够确定发送已完成，避免关闭后继续发送导致 panic。',explanation:'关闭用于通知接收方后续不再有数据；多发送方需要协调关闭时机。',rubric:['说明关闭语义','指出重复关闭或关闭后发送的风险']}}]},null,2);
export default function Console(){
 const [source,setSource]=useState(''),[draft,setDraft]=useState<ConsoleDraft|null>(null),[token,setToken]=useState(''),[owner,setOwner]=useState(false),[connected,setConnected]=useState(false);
 const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[checkedBody,setCheckedBody]=useState(''),[settled,setSettled]=useState(false),[recoveryError,setRecoveryError]=useState(false);
 const [result,setResult]=useState<any>(null),[verified,setVerified]=useState(false),[logs,setLogs]=useState<any[]>([]),[logError,setLogError]=useState('');
 const [last,setLast]=useState<Attempt|null>(null),[queryType,setQueryType]=useState('training'),[queryName,setQueryName]=useState(''),[querySpace,setQuerySpace]=useState('go-interview'),[queryResult,setQueryResult]=useState<any>(null);
 const pending=useRef(false),file=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  try{const j=readJournal(sessionStorage.getItem(JOURNAL_KEY));if(j){setLast(j.attempt);setKey(j.attempt.key);setSource(JSON.stringify(j.attempt.body,null,2));setDraft(parseQuestionJson(JSON.stringify(j.attempt.body)));setSettled(j.settled);setResult(j.result);setNotice('已恢复上次提交。未确认结果时，请重试原请求。')}}catch{setRecoveryError(true);setError('无法读取批次记录，请先通过执行记录确认上次结果，勿重复提交。')}
  fetch('/api/admin',{cache:'no-store'}).then(r=>r.ok?r.json():null).then((d:any)=>setOwner(d?.admin?.role==='owner')).catch(()=>{});
  fetch('/api/admin/auto-question-token',{cache:'no-store'}).then(r=>r.ok?r.json():null).then((d:any)=>setConnected(d?.verified===true)).catch(()=>{});
 },[]);
 async function api(path:string,body?:unknown,requestKey?:string){
  const headers:Record<string,string>={};
  if(body!==undefined){headers['Content-Type']='application/json';if(requestKey)headers['Idempotency-Key']=requestKey}
  const r=await fetch(path,{method:body===undefined?'GET':'POST',headers,credentials:'same-origin',cache:'no-store',body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const data:any=await r.json().catch(()=>({error:'服务器没有返回 JSON，请稍后重试。'}));
  if(!r.ok){if(r.status===401)setConnected(false);throw Object.assign(Error(data.message??data.error??'请求失败'),{status:r.status,code:data.code})}
  return data;
 }
 async function loadLogs(){try{const d=await api('/api/admin/auto-questions');setLogs(d.logs??[]);setLogError('')}catch(e){setLogError((e as Error).message)}}
 async function task(work:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');try{await work()}catch(e){setError((e as Error).name==='TimeoutError'?'请求超时，结果尚未确认。请重试原请求，系统会沿用相同批次。':(e as Error).message)}finally{pending.current=false;setBusy(false)}}
 function parse(){try{setDraft(parseQuestionJson(source));setCheckedBody('');setError('');setNotice('预览已生成。确认题目和提交设置后，点击「检查是否可入库」。')}catch(e){setDraft(null);setError((e as Error).message)}}
 async function verify(r:any){setVerified(false);if(!r.questionSet)return;const d=await api('/api/admin/question-sets?'+new URLSearchParams({type:r.questionSet.type,name:r.questionSet.name}));if(!verifyCreatedSet(r,d.data))throw Error('写入已成功，但关联核验未通过。请检查题集，勿再次新建。');setVerified(true)}
 async function submit(attempt:Attempt){
  persistAttempt(sessionStorage,{attempt,settled:false,result:null});
  setLast(attempt);setSettled(false);setResult(null);setVerified(false);
  let r:any;
  try{r=await api('/api/admin/auto-questions',attempt.body,attempt.key)}catch(e){
   const {status,code}=e as {status?:number;code?:string};
   if(status&&([400,401,403,413,415,422].includes(status)||(status===409&&code!=='IDEMPOTENCY_CONFLICT'))){persistAttempt(sessionStorage,{attempt,settled:true,result:null});setSettled(true)}
   throw e;
  }finally{await loadLogs()}
  if(!confirmedResponse(attempt,r))throw Error('服务器响应不完整，无法确认入库结果。原请求已保留，请重试原请求。');
  persistAttempt(sessionStorage,{attempt,settled:true,result:r});setSettled(true);setResult(r);setNotice(r.replayed?'已返回首次结果，没有重复入库。':'入库成功。');await verify(r);
 }
 function newBatch(){
  try{sessionStorage.removeItem(JOURNAL_KEY);setLast(null);setSettled(false);setResult(null);setVerified(false);setKey('manual-'+crypto.randomUUID());setSource('');setDraft(null);setCheckedBody('');setError('');setNotice('新批次已准备好，可以输入题目。')}catch{setError('浏览器无法保存批次记录，请允许本站使用存储后重试。')}
 }
 let bodyText='';try{if(draft)bodyText=JSON.stringify(consoleBody(draft))}catch{}
 const checked=!!bodyText&&checkedBody===bodyText,locked=busy||!!last;
 const count=draft?.questions.length??0,go=draft?.questions.filter(q=>q.subjectId==='go').length??0,backend=draft?.questions.filter(q=>q.subjectId==='backend').length??0;
 const expected=draft&&draft.type!=='none'?{training:6,mock:10,exam:15}[draft.type]:null;
 return <div className="api-workbench"><header className="api-header"><a href="/admin"><ArrowLeft size={18}/>返回后台</a><div className="api-header-actions"><span>面试自习室</span><ThemeControl/></div></header>
 <main><div className="api-title"><div><p className="api-eyebrow">题库管理</p><h1>API 工作台</h1><p>先连接后台，再准备本批题目。每一步完成后继续下一步。</p></div><div className="api-title-note"><FileJson size={28}/><span>连接 → 检查 → 入库</span></div></div>
 <nav className="api-jump" aria-label="工作台导航"><a href="#api-connect">Token 连接</a><a href="#api-input">题目入库</a><a href="#api-logs">执行记录</a><a href="/admin?view=drafts">查看草稿箱</a></nav>
 <ol className="api-steps" aria-label="操作步骤">{['验证并保存 Token','生成批次','输入与预览','检查并入库'].map((label,i)=><li key={label} aria-current={i===(!connected?0:!key?1:!draft?2:3)?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
 <section id="api-connect" className="api-card"><div className="api-section-title"><h2><ShieldCheck size={20}/>1. 验证并保存 Token</h2><span>{connected?'已验证 · 已保存':'待连接'}</span></div>
 {connected?<><p>Token 已安全保存在当前浏览器，刷新后自动验证，无需重复粘贴。</p><Button variant="outline" disabled={busy} onClick={()=>task(async()=>{await api('/api/admin/auto-question-token',{action:'forget'});setConnected(false);setToken('');setNotice('已清除浏览器保存的 Token，批次记录仍保留。')})}>清除并更换 Token</Button></>:<>
 <p>{owner?'可以生成一个新 Token，也可以粘贴已有 Token。新生成的 Token 有效期为 30 天。':<>生成 Token 需要先<a href="/admin">登录站长账号</a>，也可直接使用已有 Token。</>}</p>
 <div className="api-actions"><Button variant="outline" disabled={busy||!owner} onClick={()=>task(async()=>{const d=await api('/api/admin/auto-question-token',{action:'generate'});setToken(d.token);setNotice('Token 已生成，点击「验证并保存」继续。')})}>生成 Token</Button></div>
 <label className="api-label" htmlFor="api-token">API Token</label><Input id="api-token" type="password" value={token} onChange={e=>setToken(e.target.value)} disabled={busy} autoComplete="off" placeholder="生成后自动填入，或粘贴已有 Token"/>
 <div className="api-actions"><Button disabled={busy||!token.trim()} onClick={()=>task(async()=>{await api('/api/admin/auto-question-token',{action:'save',token:token.trim()});const d=await api('/api/admin/auto-question-token');if(!d.verified)throw Error('浏览器未保存连接，请允许本站 Cookie 后重试。');setConnected(true);setToken('');setNotice('Token 验证通过并已保存。现在可以生成本批次编号。')})}>验证并保存</Button><Button variant="outline" disabled={busy||!token.trim()} onClick={()=>task(async()=>{await navigator.clipboard.writeText(token.trim());setNotice('Token 已复制，请妥善保管。')})}>复制 Token</Button></div><p>验证通过后才会保存；Token 不会写入题目、执行日志或网页本地存储。</p></>}
 </section>
 {connected&&<section className="api-card"><div className="api-section-title"><h2>2. 生成本批次编号</h2><span>{key?'已生成':'待生成'}</span></div><p>批次编号就是幂等键，由系统生成，无需填写。相同请求重试只会入库一次。</p>{key?<><code className="api-batch-key">{key}</code><p>{last?'原请求已固定，刷新当前标签页后仍可恢复。':'编号已准备好，继续输入题目。提交后将锁定本批内容。'}</p></>:<Button disabled={busy||recoveryError} onClick={newBatch}>生成幂等键，开始本批</Button>}</section>}
 {error&&<div role="alert" className="api-message api-error">{error}</div>}{notice&&<div role="status" className="api-message">{notice}</div>}
 {connected&&key&&<div className="api-columns"><section id="api-input" className="api-card"><div className="api-section-title"><h2>3. 输入题目与预览</h2><span>JSON</span></div><p>支持题目数组、包含 questions 的完整请求，也可直接粘贴 Markdown 的 JSON 代码块。</p><label className="api-label" htmlFor="questions-json">题目内容</label><Textarea id="questions-json" value={source} disabled={locked} onChange={e=>{setSource(e.target.value);setDraft(null)}} spellCheck={false} placeholder={'{\n  "status": "draft",\n  "questions": [...]\n}'}/><div className="api-actions"><Button disabled={locked||!source.trim()} onClick={parse}>预览题目</Button><Button variant="outline" disabled={locked} onClick={()=>file.current?.click()}><Upload size={16}/>导入 JSON</Button><Button variant="ghost" disabled={locked||!!source} onClick={()=>{setSource(sample);setDraft(null)}}>填入示例</Button></div><input ref={file} type="file" accept=".json,application/json" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>1000000){setError('文件需小于 1 MB。');return}setSource(await f.text());setDraft(null);e.target.value=''}}/>
 {draft&&<div className="api-preview"><div className="api-count"><strong>{count}</strong> 道题 <span>Go {go} · 后端通用 {backend}{count-go-backend>0?` · 其他 ${count-go-backend}`:''}</span></div><ol>{draft.questions.map((q,i)=><li key={i}><span>{q.subjectId} / {q.type??'未指定题型'}</span>{q.zh.title}<details><summary>查看答案与完整内容</summary><pre>{JSON.stringify(q,null,2)}</pre></details></li>)}</ol></div>}</section>
 <section className="api-card api-submit-card"><h2>4. 检查并入库</h2><p>先检查并预览题目，再选择只保存题目，或同时创建题集。</p><label className="api-label" htmlFor="set-type">创建内容</label><Select value={draft?.type??'none'} disabled={locked||!draft} onValueChange={v=>setDraft(d=>d?{...d,type:v as ConsoleType}:d)}><SelectTrigger id="set-type"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labels).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
 {draft?.type!=='none'&&draft?<><label className="api-label" htmlFor="set-name">题集名称</label><Input id="set-name" value={draft.name} disabled={locked} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder={`${labels[draft.type]}20260916`}/><p>题目将全部发布。常规{labels[draft.type]}为 {expected} 题；当前 {count} 题，数量由你决定。</p></>:<><label className="api-label" htmlFor="publish-status">题目状态</label><Select value={draft?.status??'draft'} disabled={locked||!draft} onValueChange={v=>setDraft(d=>d?{...d,status:v as 'draft'|'published'}:d)}><SelectTrigger id="publish-status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="draft">草稿</SelectItem><SelectItem value="published">发布</SelectItem></SelectContent></Select></>}
 <div className="api-checklist"><p>{checked?'✓ 服务端检查已通过：题目格式、发布要求、题目查重与题集名称。':'确认预览和设置后，检查是否可以入库。检查不会新增题目。'}</p>{checked&&<p>入库时会再次检查，并在同一事务中完成创建。</p>}</div>
 <div className="api-actions"><Button variant="outline" disabled={locked||!draft} onClick={()=>task(async()=>{if(!draft)return;setCheckedBody('');const body=consoleBody(draft);const r=await api('/api/admin/auto-questions?check=1',body,key);if(r.alreadyCreated)throw Error('本批次已经入库，请通过执行记录核对结果。');setCheckedBody(JSON.stringify(body));setNotice('检查通过，可以确认入库。')})}>检查是否可入库</Button><Button disabled={locked||!checked||!connected||recoveryError} onClick={()=>task(async()=>{if(draft&&checked)await submit({key,body:consoleBody(draft)})})}><Send size={16}/>{busy?'处理中…':'确认入库 '+count+' 道题'}</Button></div>
 {last&&<div className="api-new"><p>{result?'本批次已完成，可以开始下一批。':settled?'服务器已拒绝本次请求，未写入题目。可以开始新批次修改内容。':'结果尚未确认，原始内容和编号已保留。请重试原请求，系统会防止重复写入。'}</p><div className="api-actions"><Button variant="outline" disabled={busy} onClick={()=>task(()=>submit(last))}><RefreshCw size={16}/>重试原请求</Button><Button variant="outline" disabled={busy||!settled} onClick={newBatch}>开始新批次</Button></div></div>}
 {result&&<div className="api-result" role="status"><h3><CheckCircle2 size={19}/>{result.replayed?'已重放首次结果':'写入成功'}</h3><dl><dt>题目数量</dt><dd>{result.count}</dd><dt>题目状态</dt><dd>{result.status==='draft'?'草稿':'已发布'}</dd>{result.status==='draft'&&<><dt>下一步</dt><dd><a href="/admin?view=drafts">去草稿箱编辑或发布</a></dd></>}{result.questionSet&&<><dt>题集名称</dt><dd>{result.questionSet.name}</dd><dt>题集 ID</dt><dd>{result.questionSet.id}</dd><dt>关联数量</dt><dd>{result.questionSet.questionCount}</dd><dt>查询核验</dt><dd>{verified?'已核对题数、ID 和顺序':'尚未通过，请重新核验'}</dd></>}</dl>{result.questionSet&&<Button variant="outline" disabled={busy} onClick={()=>task(()=>verify(result))}>重新核验关联</Button>}<details><summary>完整响应</summary><pre>{JSON.stringify(result,null,2)}</pre></details></div>}
 </section></div>}
 <section id="api-lookup" className="api-card"><h2>查询已有题集</h2><div className="api-query"><label>空间<Select value={querySpace} onValueChange={setQuerySpace} disabled={busy}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="go-interview">GO 面试</SelectItem><SelectItem value="ai-development">AI 开发</SelectItem></SelectContent></Select></label><label>类型<Select value={queryType} onValueChange={setQueryType} disabled={busy}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['training','mock','exam'].map(t=><SelectItem key={t} value={t}>{labels[t as ConsoleType]}</SelectItem>)}</SelectContent></Select></label><label>名称<Input value={queryName} onChange={e=>setQueryName(e.target.value)} disabled={busy} placeholder="训练20260916"/></label><Button variant="outline" disabled={busy||!connected||!queryName.trim()} onClick={()=>task(async()=>{setQueryResult(null);const d=await api('/api/admin/question-sets?'+new URLSearchParams({type:queryType,name:queryName.trim(),spaceId:querySpace}));setQueryResult(d.data)})}>查询</Button></div>{queryResult&&<div className="api-result"><strong>{queryResult.name}</strong><p>{queryResult.questionCount} 道题 · {queryResult.linkedCount} 条关联 · {queryResult.status}</p><p>题集 ID：{queryResult.id}</p><details><summary>查看题目</summary><pre>{JSON.stringify(queryResult.questions,null,2)}</pre></details></div>}</section>
 <section id="api-logs" className="api-card"><div className="api-section-title"><h2>最近执行记录</h2><Button variant="outline" disabled={busy||!connected} onClick={()=>task(loadLogs)}>刷新日志</Button></div>{logError&&<p role="alert" className="api-error">{logError}</p>}<p>最多 50 条。重放记录新增和关联数为 0，表示本次没有再次写入。</p>{logs.length?<div className="api-table"><table><thead><tr><th>时间 / 幂等键</th><th>状态</th><th>题集</th><th>请求 / 新增 / 关联</th><th>说明</th></tr></thead><tbody>{logs.map(l=><tr key={l.executionId??l.id}><td>{new Date(l.createdAt??l.created_at).toLocaleString('zh-CN')}<small>{l.idempotencyKey??l.key}</small></td><td>{({success:'成功',failed:'失败',replayed:'重放'} as Record<string,string>)[l.status]??l.status}</td><td>{l.questionSetName??'—'}</td><td>{l.requestedCount??'—'} / {l.createdCount??'—'} / {l.linkedCount??'—'}</td><td>{l.errorMessage??(l.durationMs===null?'—':`${l.durationMs} ms`)}</td></tr>)}</tbody></table></div>:<p>点击刷新，读取执行记录。</p>}</section>
 </main></div>;
}
