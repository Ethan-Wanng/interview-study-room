import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import "./themes.css";
import "./immersive.css";
import {headers} from 'next/headers';
import {I18nProvider} from './components/i18n';
import StaleReloadListener from './components/stale-reload-listener';
import CloudSync from './components/cloud-sync';
import {NoticeCenter} from './components/notices';
import SiteTutor from './components/site-tutor';
import {AppearanceSync} from './components/appearance';

export const metadata: Metadata = {
  title: "面试自习室｜每日学习与复习",
  description: "305 道面试题，按日学习、间隔复习与关键词释义。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

import {naturalLamp,timeTheme,validGlass,validLamp,validTheme} from '@/lib/day-themes';

const THEME_INIT_SCRIPT=`(function(){try{var d=document.documentElement,t=localStorage.getItem('study-theme'),l=localStorage.getItem('study-lamp'),g=parseInt(localStorage.getItem('study-glass')??'50',10);if(!(g>=0&&g<=100))g=50;if(t==='day')t='forenoon';var h=new Date().getHours()+new Date().getMinutes()/60,now=h<5?'midnight':h<6?'dawn':h<7?'sunrise':h<9?'morning':h<12?'forenoon':h<14?'noon':h<17?'afternoon':h<18?'dusk':h<19?'twilight':h<21?'evening':'night';var valid={midnight:1,dawn:1,sunrise:1,morning:1,forenoon:1,noon:1,afternoon:1,dusk:1,twilight:1,evening:1,night:1};var id=t&&valid[t]?t:now;var dark={midnight:1,twilight:1,evening:1,night:1};var eff=l==='on'||l==='off'?l:(dark[id]?'off':'on');d.dataset.theme=id;d.dataset.lamp=eff;d.classList.toggle('dark',eff==='off');d.style.colorScheme=eff==='off'?'dark':'light';d.style.backgroundColor=eff==='off'?'#162032':'';d.style.setProperty('--glass-t',String(g));document.cookie='study-theme='+(t&&valid[t]?t:'auto')+';path=/;max-age=31536000;SameSite=Lax';document.cookie='study-lamp='+(l==='on'||l==='off'?l:'')+';path=/;max-age=31536000;SameSite=Lax';document.cookie='study-glass='+g+';path=/;max-age=31536000;SameSite=Lax'}catch(e){}})();`;
const CRITICAL_THEME_CSS=`@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:120ms}html[data-lamp="off"],html.dark{background-color:#162032;color:#e8ecf4;color-scheme:dark}html[data-lamp="off"] body,html.dark body{background-color:#162032;color:#e8ecf4}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h=await headers(),rawCookie=h.get('cookie')??'';
  const cookie=rawCookie.match(/(?:^|;\s*)study-language=(zh|en)(?:;|$)/)?.[1];
  const locale=cookie==='en'||(!cookie&&h.get('accept-language')?.toLowerCase().startsWith('en'))?'en':'zh';
  const themeCookie=validTheme(rawCookie.match(/(?:^|;\s*)study-theme=([^;]+)(?:;|$)/)?.[1]??null);
  const lampCookie=validLamp(rawCookie.match(/(?:^|;\s*)study-lamp=([^;]*)(?:;|$)/)?.[1]??null);
  const glassCookie=validGlass(rawCookie.match(/(?:^|;\s*)study-glass=([^;]*)(?:;|$)/)?.[1]??null);
  const ssrTheme=themeCookie==='auto'?timeTheme():themeCookie;
  const ssrLamp=lampCookie??naturalLamp(ssrTheme);
  return (
    <html lang={locale==='en'?'en':'zh-CN'} data-theme={ssrTheme} data-lamp={ssrLamp} className={ssrLamp==='off'?'dark':undefined} style={{colorScheme:ssrLamp==='off'?'dark':'light',backgroundColor:ssrLamp==='off'?'#162032':undefined,'--glass-t':String(glassCookie)} as CSSProperties} suppressHydrationWarning>
      <head><style dangerouslySetInnerHTML={{__html:CRITICAL_THEME_CSS}}/><script dangerouslySetInnerHTML={{__html:THEME_INIT_SCRIPT}}/></head>
      <body className="antialiased"><AppearanceSync/><StaleReloadListener/><CloudSync/><I18nProvider initialLocale={locale}><NoticeCenter/>{children}<SiteTutor/></I18nProvider></body>
    </html>
  );
}
