'use client';
import {useEffect,useState} from 'react';
import {Sunrise,Sun,Moon,Clock3} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {dayThemes,timeTheme,validTheme} from '@/lib/day-themes';
import {useI18n} from './i18n';
export {timeTheme} from '@/lib/day-themes';
export default function ThemeControl(){const {locale,t}=useI18n();const [value,setValue]=useState('auto');useEffect(()=>{try{setValue(validTheme(localStorage.getItem('study-theme')))}catch{}},[]);useEffect(()=>{const apply=()=>{const id=value==='auto'?timeTheme():value;document.documentElement.dataset.theme=id;document.documentElement.classList.toggle('dark',!!dayThemes.find(x=>x.id===id)?.dark)};apply();const timer=setInterval(apply,30000);return()=>clearInterval(timer)},[value]);return <Select value={value} onValueChange={v=>{setValue(v);try{localStorage.setItem('study-theme',v)}catch{}}}><SelectTrigger className="theme-select" aria-label={t('背景主题')} title={t('自动模式按设备当地时间切换；时段为固定时间表。')}><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="auto"><Clock3 size={16}/>{t('跟随当地时间')}</SelectItem>{[...dayThemes.slice(1),dayThemes[0]].map(c=><SelectItem key={c.id} value={c.id}>{c.dark?<Moon size={16}/>:c.start<7?<Sunrise size={16}/>:<Sun size={16}/>}<span>{locale==='en'?c.en:c.zh}</span><small>{String(c.start).padStart(2,'0')}:00–{String(c.end).padStart(2,'0')}:00</small></SelectItem>)}</SelectContent></Select>}
