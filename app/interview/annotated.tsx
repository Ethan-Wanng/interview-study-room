'use client';
import {Volume2} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {useI18n} from '../components/i18n';
import {englishDefinition} from '@/content/glossary.en';
import {glossary} from '@/content/glossary';
import {EnWords} from '../components/keyword-text';
import {sayEnglish} from '../components/speech-drill';
// 参考答案里的术语高亮：点一下看释义，英文术语顺便朗读。
export const terms=Object.keys(glossary).sort((a,b)=>b.length-a.length);const lookup=new Map(terms.map(t=>[t.toLowerCase(),t]));
const pattern=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
export function Annotated({text}:{text:string}){const {locale,t}=useI18n(),tip=locale==='en'?'Pronounce':'点击朗读';const chunks=text.split(pattern);return <>{chunks.map((part,i)=>{const key=lookup.get(part.toLowerCase());if(!key)return <EnWords key={i} text={part}/>;const prev=chunks[i-1]?.slice(-1)??'',next=chunks[i+1]?.slice(0,1)??'';if(/^[a-z0-9]+$/i.test(key)&&(/[a-z0-9_]/i.test(prev)||/[a-z0-9_]/i.test(next)))return <EnWords key={i} text={part}/>;const hasEn=/[A-Za-z]{2,}/.test(part);return <Popover key={i}><PopoverTrigger asChild><button className="keyword" aria-label={t("解释 ")+part} onClick={()=>{if(hasEn)sayEnglish(part,0.85)}}>{part}</button></PopoverTrigger><PopoverContent className="term-popup"><span className="eyebrow">{t("关键词释义")}</span><h3 className="term-popup-title"><span>{key}</span>{/[A-Za-z]{2,}/.test(key)&&<button type="button" className="en-speak-btn" title={tip} aria-label={tip} onClick={()=>sayEnglish(key,0.85)}><Volume2 size={15}/></button>}</h3><p><EnWords text={locale==='en'?englishDefinition(key):glossary[key]}/></p></PopoverContent></Popover>})}</>}
