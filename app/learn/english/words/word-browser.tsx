'use client';
import {useState} from 'react';
import {Search,Volume2} from 'lucide-react';
import {useI18n} from '../../../components/i18n';
import {sayEnglish} from '../../../components/speech-drill';
import type {WordBook} from '@/content/english-words';
import {KNOWN,MASTERED,type Store} from './srs';

const PAGE=100;
// 浏览一本词书：可以搜英文或中文，每个词都能点喇叭听，旁边显示学习状态。
export default function WordBrowser({book,store}:{book:WordBook;store:Store}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [q,setQ]=useState(''),[shown,setShown]=useState(PAGE);
 const key=q.trim().toLowerCase(),list=key?book.words.filter(w=>w.en.toLowerCase().includes(key)||w.zh.includes(key)):book.words;
 const status=(en:string)=>{const c=store.cards[en];return !c?['',L('未学','New')]:c.b>=MASTERED?['mastered',L('已掌握','Mastered')]:c.b>=KNOWN?['known',L('认识','Known')]:['learning',L('学习中','Learning')]};
 return <section className="ai-card wb">
  <label className="wb-search"><Search size={16}/><input value={q} placeholder={L('搜索英文或中文','Search English or Chinese')} onChange={e=>{setQ(e.target.value);setShown(PAGE)}}/></label>
  <p className="muted">{L(`共 ${list.length} 个词`,`${list.length} words`)}</p>
  <ol className="wb-list">{list.slice(0,shown).map(w=>{const [cls,text]=status(w.en);return <li key={w.en}>
   <button type="button" onClick={()=>sayEnglish(w.en,0.85)} aria-label={L('听','Listen')}><Volume2 size={16}/></button>
   <strong lang="en" role="button" tabIndex={0} className="en-word" title={L('点击朗读单词','Click to pronounce')} onClick={()=>sayEnglish(w.en,0.85)}>{w.en}</strong><small>{w.pos}</small><span>{w.zh}</span><em className={'wb-status '+cls}>{text}</em></li>})}</ol>
  {shown<list.length&&<button type="button" className="button secondary" onClick={()=>setShown(shown+PAGE)}>{L('再显示 100 个','Show 100 more')}</button>}
 </section>}
