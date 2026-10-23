'use client';
import {useI18n} from './i18n';
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
export default function KeywordText({text}:{text:string}){const {locale,t}=useI18n();const chunks=text.split(regex);return <>{chunks.map((part,i)=>{const key=termAt(chunks,i);if(!key)return part;return <Popover key={i}><PopoverTrigger asChild><button className="keyword" aria-label={t("解释 ")+part}>{part}</button></PopoverTrigger><PopoverContent className="term-popup"><h3>{key}</h3><p>{locale==='en'?englishDefinition(key):glossary[key]}</p></PopoverContent></Popover>})}</>}
