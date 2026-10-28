'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {messages} from '@/content/messages';
export type Locale='zh'|'en';
const I18n=createContext<{locale:Locale;t:(key:string)=>string;setLocale:(v:Locale)=>void}>({locale:'zh',t:k=>k,setLocale:()=>{}});
export function I18nProvider({children,initialLocale}:{children:React.ReactNode;initialLocale:Locale}){const [locale,setLocale]=useState<Locale>(initialLocale);useEffect(()=>{document.documentElement.lang=locale==='en'?'en':'zh-CN';document.title=locale==='en'?'Interview Notebook | Study & Practice':'面试自习室｜每日学习与训练';document.cookie=`study-language=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`},[locale]);return <I18n.Provider value={{locale,setLocale,t:key=>locale==='en'?(messages[key]??key):key}}>{children}</I18n.Provider>}
export const useI18n=()=>useContext(I18n);
export function LanguageControl(){const {locale,setLocale}=useI18n();return <Select value={locale} onValueChange={v=>setLocale(v as Locale)}><SelectTrigger className="language-select" aria-label="语言 / Language"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="zh">简中</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>}
