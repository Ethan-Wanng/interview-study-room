'use client';
import {createContext,useContext} from 'react';
import {Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {sayEnglish} from './speech-drill';
import {glossary as originalGlossary} from '@/content/glossary';
import {glossaryAliases,englishDefinition} from '@/content/glossary.en';
const glossary={...originalGlossary,...Object.fromEntries(Object.entries(glossaryAliases).map(([alias,key])=>[alias,originalGlossary[key]]))};
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
const terms=Object.keys(glossary).sort((a,b)=>b.length-a.length),lookup=new Map(terms.map(t=>[t.toLowerCase(),t]));
const regex=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
// 纯字母数字的英文术语要求两侧不是字母数字，避免在更长的单词里误匹配。
const termAt=(chunks:string[],i:number)=>{const key=lookup.get(chunks[i].toLowerCase());if(!key)return null;if(/^[a-z0-9]+$/i.test(key)&&(/[a-z0-9_]/i.test(chunks[i-1]?.slice(-1)??'')||/[a-z0-9_]/i.test(chunks[i+1]?.slice(0,1)??'')))return null;return key};
// 找出文本中出现的词库术语（去重，按首次出现排序），用于在答案下方列出名词解释。
export function findTerms(...texts:string[]){const found:string[]=[];for(const text of texts){const chunks=text.split(regex);for(let i=1;i<chunks.length;i+=2){const key=termAt(chunks,i);if(key&&!found.includes(key))found.push(key)}}return found}
export const termDefinition=(key:string,locale:string)=>locale==='en'?englishDefinition(key):glossary[key];

// 只有英语模块需要点读，其他模块（Go、AI、后端、前端、项目等）不启用点读。
export const EnglishSpeakContext=createContext<boolean|null>(null);
export function useEnglishSpeak():boolean{
 const ctx=useContext(EnglishSpeakContext);
 if(ctx!==null)return ctx;
 if(typeof window!=='undefined'){
  const p=window.location.pathname;
  return p.startsWith('/learn/english')||p.startsWith('/practice/english');
 }
 return false;
}

const WORD=`(?:(?:Mr|Mrs|Ms|Dr|St)\\.\\s*)?[A-Za-z]+(?:['’][A-Za-z]+)*`;
const SENTENCE_MID=`(?:[\\s,;:—\\-/()_＿]+${WORD})+`;
const SENTENCE_END=`[.?!]+(?=[\\s"”’)】》]|$)`;
const segmentRe=new RegExp(`(${WORD}${SENTENCE_MID}(?:${SENTENCE_END})?|[A-Za-z]{2,}(?:['’][A-Za-z]+)*)`,'g');
const isSegment=(s:string)=>new RegExp(`^(?:${WORD}${SENTENCE_MID}(?:${SENTENCE_END})?|[A-Za-z]{2,}(?:['’][A-Za-z]+)*)$`).test(s);
const singleWordRe=/([A-Za-z]+(?:['’][A-Za-z]+)*)/g;
const isSingleWord=(s:string)=>/^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(s);
const cleanSpeech=(s:string)=>s.replace(/’/g,"'").replace(/[_＿]+/g,', ').replace(/\s+/g,' ').trim();

// 英语点读分级（仅在英语模块激活：单词 / 短语 / 句子，配合 speech-drill.tsx 的文章点读构成四级点读）：
// 1. 单词（1 个词）：直接点单词发音；在未作答选项内右侧带「单词点读」喇叭图标。
// 2. 短语（2～4 个词且无句末标点）：短语内部不拆分图标，短语末尾带「短语点读」喇叭图标，同时支持点短语内任意单词读单词。
// 3. 句子（≥5 个词，或以 .?! 结尾的多词句）：句子内部不拆分图标，句末带「句子点读」喇叭图标，同时支持点句内任意单词读单词。
export function EnWords({text,inOption,noSentenceHorn}:{text:string;inOption?:boolean;noSentenceHorn?:boolean}){
 const {locale}=useI18n();
 const enableSpeak=useEnglishSpeak();
 if(!enableSpeak||!text||!/[A-Za-z]{2,}/.test(text))return <>{text}</>;
 const wordTip=locale==='en'?'Word read-aloud':'单词点读';
 const phraseTip=locale==='en'?'Phrase read-aloud':'短语点读';
 const sentTip=locale==='en'?'Sentence read-aloud':'句子点读';
 return <>{text.split(segmentRe).map((seg,i)=>{
  if(!isSegment(seg))return seg;
  const spoken=cleanSpeech(seg);
  const wordCount=(seg.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)??[]).length;
  const endsWithPunct=/[.?!]+$/.test(seg.trim());
  const kind:'word'|'phrase'|'sentence'=wordCount===1?'word':(wordCount<=4&&!endsWithPunct)?'phrase':'sentence';
  const tipPrefix=kind==='word'?wordTip:kind==='phrase'?phraseTip:sentTip;
  if(inOption){
   return <span key={i} className="en-seg-opt" lang="en">{seg}<i role="button" tabIndex={0} className={'en-sent-horn '+kind} title={`${tipPrefix}: ${spoken}`} aria-label={tipPrefix} onClick={e=>{e.stopPropagation();sayEnglish(spoken,0.85)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();sayEnglish(spoken,0.85)}}}><Volume2 size={13}/></i></span>;
  }
  if(kind==='phrase'||kind==='sentence'){
   return <span key={i} className={'en-sentence '+kind} lang="en">{seg.split(singleWordRe).map((w,j)=>{
    if(!isSingleWord(w))return w;
    const cw=w.replace(/’/g,"'");
    return <span key={j} role="button" tabIndex={0} className="en-word" title={`${wordTip}: ${cw}`} onClick={e=>{e.stopPropagation();sayEnglish(cw,0.85)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();sayEnglish(cw,0.85)}}}>{w}</span>;
   })}{!noSentenceHorn&&<i role="button" tabIndex={0} className={'en-sent-horn '+kind} title={`${tipPrefix}: ${spoken}`} aria-label={tipPrefix} onClick={e=>{e.stopPropagation();sayEnglish(spoken,0.85)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();sayEnglish(spoken,0.85)}}}><Volume2 size={13}/></i>}</span>;
  }
  return <span key={i} lang="en" role="button" tabIndex={0} className="en-word" title={`${wordTip}: ${spoken}`} onClick={e=>{e.stopPropagation();sayEnglish(spoken,0.85)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();sayEnglish(spoken,0.85)}}}>{seg}</span>;
 })}</>}

export default function KeywordText({text}:{text:string}){
 const {locale,t}=useI18n(),enableSpeak=useEnglishSpeak(),tip=locale==='en'?'Pronounce':'点击朗读';
 const chunks=text.split(regex);
 return <>{chunks.map((part,i)=>{
  const key=termAt(chunks,i);
  if(!key)return <EnWords key={i} text={part}/>;
  const hasEn=enableSpeak&&/[A-Za-z]{2,}/.test(part);
  return <Popover key={i}><PopoverTrigger asChild><button className="keyword" aria-label={t("解释 ")+part} onClick={()=>{if(hasEn)sayEnglish(part,0.85)}}>{part}</button></PopoverTrigger><PopoverContent className="term-popup"><h3 className="term-popup-title"><span>{key}</span>{enableSpeak&&/[A-Za-z]{2,}/.test(key)&&<button type="button" className="en-speak-btn" title={tip} aria-label={tip} onClick={()=>sayEnglish(key,0.85)}><Volume2 size={15}/></button>}</h3><p><EnWords text={locale==='en'?englishDefinition(key):glossary[key]}/></p></PopoverContent></Popover>;
 })}</>;
}
