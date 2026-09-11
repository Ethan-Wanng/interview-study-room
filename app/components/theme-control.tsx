'use client';
import {useEffect,useState} from 'react';
import {Sunrise,Sun,Sunset,Moon,Clock3} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
const choices=[{id:'auto',label:'跟随时间',icon:Clock3},{id:'dawn',label:'黎明',icon:Sunrise},{id:'day',label:'白天',icon:Sun},{id:'dusk',label:'傍晚',icon:Sunset},{id:'night',label:'黑夜',icon:Moon}];
export function timeTheme(date=new Date()){const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(date));return h>=5&&h<8?'dawn':h>=8&&h<17?'day':h>=17&&h<20?'dusk':'night'}
export default function ThemeControl(){const [value,setValue]=useState('auto');useEffect(()=>{try{const saved=localStorage.getItem('study-theme');if(choices.some(c=>c.id===saved))setValue(saved!)}catch{}},[]);useEffect(()=>{const apply=()=>{document.documentElement.dataset.theme=value==='auto'?timeTheme():value};apply();const timer=setInterval(apply,60000);return()=>clearInterval(timer)},[value]);return <Select value={value} onValueChange={v=>{setValue(v);try{localStorage.setItem('study-theme',v)}catch{}}}><SelectTrigger className="theme-select" aria-label="背景主题"><SelectValue/></SelectTrigger><SelectContent position="popper">{choices.map(c=><SelectItem key={c.id} value={c.id}><c.icon size={16}/>{c.label}</SelectItem>)}</SelectContent></Select>}
