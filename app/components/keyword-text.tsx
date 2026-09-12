'use client';
import {useI18n} from './i18n';
import {glossary as originalGlossary} from '@/content/glossary';
import {glossaryAliases,englishDefinition} from '@/content/glossary.en';
const glossary={...originalGlossary,...Object.fromEntries(Object.entries(glossaryAliases).map(([alias,key])=>[alias,originalGlossary[key]]))};
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
const terms=Object.keys(glossary).sort((a,b)=>b.length-a.length),lookup=new Map(terms.map(t=>[t.toLowerCase(),t]));
const regex=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
export default function KeywordText({text}:{text:string}){const {locale,t}=useI18n();const chunks=text.split(regex);return <>{chunks.map((part,i)=>{const key=lookup.get(part.toLowerCase());if(!key)return part;if(/^[a-z0-9]+$/i.test(key)&&(/[a-z0-9_]/i.test(chunks[i-1]?.slice(-1)??'')||/[a-z0-9_]/i.test(chunks[i+1]?.slice(0,1)??'')))return part;return <Popover key={i}><PopoverTrigger asChild><button className="keyword" aria-label={t("解释 ")+part}>{part}</button></PopoverTrigger><PopoverContent className="term-popup"><h3>{key}</h3><p>{locale==='en'?englishDefinition(key):glossary[key]}</p></PopoverContent></Popover>})}</>}
