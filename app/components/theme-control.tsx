'use client';
import {Sunrise,Sun,Moon,Clock3,Lightbulb,LightbulbOff} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {dayThemes} from '@/lib/day-themes';
import {useI18n} from './i18n';
import {setLampPreference,setThemePreference,useAppearance} from './appearance';
export {timeTheme} from '@/lib/day-themes';

// 背景时段配色下拉（自适应或手动选时段），供登录/后台独立顶栏和账号设置复用。
export function ThemeSelect({className='theme-select'}:{className?:string}){const {locale,t}=useI18n();
 const {theme}=useAppearance();
 return <Select value={theme} onValueChange={setThemePreference}><SelectTrigger className={className} aria-label={t('背景主题')} title={t('自动模式按设备当地时间切换；时段为固定时间表。')}><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="auto"><Clock3 size={16}/>{t('自适应')}</SelectItem>{[...dayThemes.slice(1),dayThemes[0]].map(c=><SelectItem key={c.id} value={c.id}>{c.dark?<Moon size={16}/>:c.start<7?<Sunrise size={16}/>:<Sun size={16}/>}<span>{locale==='en'?c.en:c.zh}</span><small>{String(c.start).padStart(2,'0')}:00–{String(c.end).padStart(2,'0')}:00</small></SelectItem>)}</SelectContent></Select>;
}

// 灯光开关 + 时段选择（用于登录页与后台等不挂载用户设置菜单的页面）。
export default function ThemeControl(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const {effectiveLamp}=useAppearance();
 const toggle=()=>setLampPreference(effectiveLamp==='on'?'off':'on');
 return <span className="theme-controls">
  <button type="button" className={'lamp-toggle '+effectiveLamp} onClick={toggle} aria-pressed={effectiveLamp==='on'} aria-label={effectiveLamp==='on'?L('开灯模式（点击关灯）','Lights on (click to turn off)'):L('关灯模式（点击开灯）','Lights off (click to turn on)')} title={effectiveLamp==='on'?L('开灯模式：亮色。点击切换到关灯模式','Lights on: bright. Click for lights off'):L('关灯模式：暗色。点击切换到开灯模式','Lights off: dark. Click for lights on')}>{effectiveLamp==='on'?<Lightbulb size={17}/>:<LightbulbOff size={17}/>}<span>{effectiveLamp==='on'?L('开灯','On'):L('关灯','Off')}</span></button>
  <ThemeSelect/>
 </span>;
}
