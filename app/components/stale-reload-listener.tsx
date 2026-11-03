'use client';
import {useEffect} from 'react';
import {reloadForNewVersion} from './stale-reload';

// 全站挂一个：Vite 按需加载代码失败时会在 window 上发 vite:preloadError，这时刷新拿新版本，而不是让页面报错。
export default function StaleReloadListener(){
 useEffect(()=>{const on=(e:Event)=>{if(reloadForNewVersion())e.preventDefault()};window.addEventListener('vite:preloadError',on);return()=>window.removeEventListener('vite:preloadError',on)},[]);
 return null}
