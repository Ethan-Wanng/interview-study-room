'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '../components/i18n';
import {MINE,MY_LIMITS,parseBatch,type MyQuestion,type MyQuestionInput} from '@/lib/my-questions';
import {markdownEditing} from '../ai/code-input';

type Track={id:string;name:string};
type Draft={title:string;answer:string;keep:boolean};
const post=async(body:object)=>{const r=await fetch('/api/my-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {items?:MyQuestion[];drafts?:{title:string;answer:string}[];error?:string};if(!r.ok)throw new Error(d.error??'操作失败');return d};

// 私人题库的添加 / 编辑窗口：单题、批量粘贴、AI 出题三种方式。编辑已有题目时只显示单题表单。
export default function MyEditor({open,onClose,onSaved,editing,subject,tracks}:{open:boolean;onClose:()=>void;onSaved:(items:MyQuestion[])=>void;editing:MyQuestion|null;subject:string;tracks:Track[]}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [way,setWay]=useState<'one'|'batch'|'ai'>('one'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [form,setForm]=useState<Required<MyQuestionInput>>(()=>editing?{subject:editing.subject,section:editing.section,title:editing.title,answer:editing.answer}:{subject,section:'',title:'',answer:''});
 const [batch,setBatch]=useState(''),[source,setSource]=useState(''),[count,setCount]=useState(8),[drafts,setDrafts]=useState<Draft[]>([]);
 const parsed=parseBatch(batch);
 const set=(k:keyof MyQuestionInput,v:string)=>setForm(f=>({...f,[k]:v}));
 async function run(f:()=>Promise<void>){setBusy(true);setError('');try{await f()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const save=()=>run(async()=>{const d=await post(editing?{action:'update',id:editing.id,item:form}:{action:'create',item:form});onSaved(d.items!);onClose()});
 const importAll=(items:MyQuestionInput[])=>run(async()=>{const d=await post({action:'import',items:items.map(x=>({...x,subject:form.subject,section:form.section}))});onSaved(d.items!);onClose()});
 const generate=()=>run(async()=>{const d=await post({action:'generate',source,count});setDrafts((d.drafts??[]).map(x=>({...x,keep:true})))});
 const subjectPicker=<label className="iv-field">{L('放在哪里','Where')}<select value={form.subject} onChange={e=>set('subject',e.target.value)}><option value={MINE}>{L('只放在「我的题库」','My questions only')}</option>{tracks.map(t=><option key={t.id} value={t.id}>{L(`我的题库 + ${t.name}`,`My questions + ${t.name}`)}</option>)}</select></label>;
 const sectionInput=<label className="iv-field">{L('分类（选填）','Category (optional)')}<input value={form.section} maxLength={MY_LIMITS.section} onChange={e=>set('section',e.target.value)} placeholder={L('例如：字节一面、Redis','e.g. Onsite round 1, Redis')}/></label>;
 return <Dialog open={open} onOpenChange={o=>{if(!o&&!busy)onClose()}}><DialogContent className="iv-editor">
  <DialogHeader><DialogTitle>{editing?L('编辑题目','Edit question'):L('添加到我的题库','Add to my questions')}</DialogTitle><DialogDescription>{L('私人题库只有你自己能看到，和公共题一样参与每日新学与间隔复习。','Only you can see these. They join daily study and spaced review like other questions.')}</DialogDescription></DialogHeader>
  {!editing&&<div className="email-mode iv-ways" role="tablist">{([['one',L('单题','One')],['batch',L('批量粘贴','Paste many')],['ai',L('AI 出题','AI')]] as const).map(([k,label])=><button key={k} type="button" role="tab" aria-selected={way===k} className={way===k?'active':''} onClick={()=>{setWay(k);setError('')}}>{label}</button>)}</div>}
  {subjectPicker}{sectionInput}
  {(editing||way==='one')&&<><label className="iv-field">{L('题目','Question')}<input value={form.title} maxLength={MY_LIMITS.title} onChange={e=>set('title',e.target.value)} placeholder={L('例如：Redis 为什么快？','e.g. Why is Redis fast?')}/></label>
   <label className="iv-field">{L('参考答案','Answer')}<textarea ref={markdownEditing} rows={9} value={form.answer} maxLength={MY_LIMITS.answer} onChange={e=>set('answer',e.target.value)} placeholder={L('空行分段；代码用 ``` 包起来会显示成代码块。','Blank lines split paragraphs; wrap code in ```.')}/></label>
   <button className="button primary" disabled={busy||!form.title.trim()} onClick={()=>void save()}>{busy?L('保存中…','Saving…'):L('保存','Save')}</button></>}
  {!editing&&way==='batch'&&<><label className="iv-field">{L('粘贴题目和答案','Paste questions and answers')}<textarea rows={11} value={batch} onChange={e=>setBatch(e.target.value)} placeholder={L('问：Redis 为什么快？\n答：基于内存、单线程避免锁竞争、IO 多路复用……\n\n问：MySQL 索引为什么用 B+ 树？\n答：……','Q: Why is Redis fast?\nA: In-memory, single-threaded…\n\nQ: …')}/></label>
   <p className="muted iv-hint">{L('每道题以“问：”“Q:”或“## ”开头，到下一题之前的内容都算答案。','Start each question with “Q:” or “## ”; everything until the next one is the answer.')}</p>
   <button className="button primary" disabled={busy||!parsed.length||parsed.length>MY_LIMITS.batch} onClick={()=>void importAll(parsed)}>{busy?L('导入中…','Importing…'):L(`导入 ${parsed.length} 道题`,`Import ${parsed.length}`)}</button></>}
  {!editing&&way==='ai'&&<>{!drafts.length?<><label className="iv-field">{L('粘贴面经、岗位要求或知识点','Paste an interview report, job post or notes')}<textarea rows={9} value={source} maxLength={MY_LIMITS.source} onChange={e=>setSource(e.target.value)} placeholder={L('例如一段岗位要求：熟悉 Go 并发、MySQL 调优、Redis 缓存设计……','e.g. a job description…')}/></label>
    <label className="iv-field">{L('出几道题','How many')}<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,8,10,15].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <p className="muted iv-hint">{L('算一次 AI 老师的每日次数；生成后先预览，勾选想要的再保存。','Uses one AI tutor credit. Preview first, then keep the ones you want.')}</p>
    <button className="button primary" disabled={busy||source.trim().length<10} onClick={()=>void generate()}>{busy?L('AI 出题中，约需半分钟…','Generating…'):L('生成题目','Generate')}</button></>
   :<><div className="iv-drafts">{drafts.map((d,i)=><label key={i} className="iv-draft"><input type="checkbox" checked={d.keep} onChange={e=>setDrafts(ds=>ds.map((x,j)=>j===i?{...x,keep:e.target.checked}:x))}/><details><summary>{d.title}</summary><p>{d.answer}</p></details></label>)}</div>
    <div className="iv-row"><button className="button secondary" disabled={busy} onClick={()=>setDrafts([])}>{L('重新出题','Start over')}</button><button className="button primary" disabled={busy||!drafts.some(d=>d.keep)} onClick={()=>void importAll(drafts.filter(d=>d.keep).map(({title,answer})=>({title,answer})))}>{L(`保存选中的 ${drafts.filter(d=>d.keep).length} 道`,`Save ${drafts.filter(d=>d.keep).length}`)}</button></div></>}</>}
  {error&&<p className="error" role="alert">{error}</p>}
 </DialogContent></Dialog>}
