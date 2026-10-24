'use client';
import {useEffect,useState} from 'react';
import {Sunrise,Sun,Moon,Clock3,Lightbulb,LightbulbOff} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {dayThemes,naturalLamp,timeTheme,validLamp,validTheme,type Lamp} from '@/lib/day-themes';
import {useI18n} from './i18n';
export {timeTheme} from '@/lib/day-themes';
// 背景主题由两部分组合：时间配色（跟随当地时间或手动选时段）+ 灯光（开灯亮色 / 关灯暗色，二选一）。
export default function ThemeControl(){const {locale,t}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [value,setValue]=useState('auto'),[lamp,setLamp]=useState<Lamp|null>(null),[now,setNow]=useState('forenoon');
 useEffect(()=>{try{setValue(validTheme(localStorage.getItem('study-theme')));setLamp(validLamp(localStorage.getItem('study-lamp')))}catch{}},[]);
 const id=value==='auto'?now:value,effective=lamp??naturalLamp(id);
 useEffect(()=>{const apply=()=>setNow(timeTheme());apply();const timer=setInterval(apply,30000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{const root=document.documentElement;root.dataset.theme=id;root.dataset.lamp=effective;root.classList.toggle('dark',effective==='off')},[id,effective]);
 const toggle=()=>{const next:Lamp=effective==='on'?'off':'on';setLamp(next);try{localStorage.setItem('study-lamp',next)}catch{}};
 return <span className="theme-controls">
  <button type="button" className={'lamp-toggle '+effective} onClick={toggle} aria-pressed={effective==='on'} aria-label={effective==='on'?L('开灯模式（点击关灯）','Lights on (click to turn off)'):L('关灯模式（点击开灯）','Lights off (click to turn on)')} title={effective==='on'?L('开灯模式：亮色。点击切换到关灯模式','Lights on: bright. Click for lights off'):L('关灯模式：暗色。点击切换到开灯模式','Lights off: dark. Click for lights on')}>{effective==='on'?<Lightbulb size={17}/>:<LightbulbOff size={17}/>}<span>{effective==='on'?L('开灯','On'):L('关灯','Off')}</span></button>
  <Select value={value} onValueChange={v=>{setValue(v);try{localStorage.setItem('study-theme',v)}catch{}}}><SelectTrigger className="theme-select" aria-label={t('背景主题')} title={t('自动模式按设备当地时间切换；时段为固定时间表。')}><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="auto"><Clock3 size={16}/>{t('跟随当地时间')}</SelectItem>{[...dayThemes.slice(1),dayThemes[0]].map(c=><SelectItem key={c.id} value={c.id}>{c.dark?<Moon size={16}/>:c.start<7?<Sunrise size={16}/>:<Sun size={16}/>}<span>{locale==='en'?c.en:c.zh}</span><small>{String(c.start).padStart(2,'0')}:00–{String(c.end).padStart(2,'0')}:00</small></SelectItem>)}</SelectContent></Select>
 </span>}
