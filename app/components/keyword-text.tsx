'use client';
import {glossary} from '@/content/glossary';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
const terms=Object.keys(glossary).sort((a,b)=>b.length-a.length),lookup=new Map(terms.map(t=>[t.toLowerCase(),t]));
const regex=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
export default function KeywordText({text}:{text:string}){const chunks=text.split(regex);return <>{chunks.map((part,i)=>{const key=lookup.get(part.toLowerCase());if(!key)return part;if(/^[a-z0-9]+$/i.test(key)&&(/[a-z0-9_]/i.test(chunks[i-1]?.slice(-1)??'')||/[a-z0-9_]/i.test(chunks[i+1]?.slice(0,1)??'')))return part;return <Popover key={i}><PopoverTrigger asChild><button className="keyword" aria-label={'解释 '+part}>{part}</button></PopoverTrigger><PopoverContent className="term-popup"><h3>{key}</h3><p>{glossary[key]}</p></PopoverContent></Popover>})}</>}
