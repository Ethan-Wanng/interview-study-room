'use client';
import {useSyncExternalStore,type CSSProperties} from 'react';
import {noteLocalWrite} from './cloud-sync';
import {useI18n} from './i18n';

const AVATAR_PREFIX='study-avatar:v1:';
const AVATAR_EVENT='study-avatar-change';

export const avatarStorageKey=(username:string)=>AVATAR_PREFIX+(username||'guest');

const subscribe=(notify:()=>void)=>{
 const onStorage=(e:StorageEvent)=>{if(!e.key||e.key.startsWith(AVATAR_PREFIX))notify()};
 window.addEventListener('storage',onStorage);
 window.addEventListener(AVATAR_EVENT,notify);
 return()=>{
  window.removeEventListener('storage',onStorage);
  window.removeEventListener(AVATAR_EVENT,notify);
 };
};

const safeImgSrc=(raw:string|null)=>raw&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(raw)?raw:'';

export function useAvatar(username:string){
 const key=avatarStorageKey(username);
 return useSyncExternalStore(
  subscribe,
  ()=>{try{return safeImgSrc(localStorage.getItem(key))}catch{return ''}},
  ()=>'',
 );
}

export function saveAvatar(username:string,dataUrl:string){
 const key=avatarStorageKey(username);
 try{localStorage.setItem(key,dataUrl)}catch{}
 noteLocalWrite(key);
 window.dispatchEvent(new Event(AVATAR_EVENT));
}

export function clearAvatar(username:string){
 const key=avatarStorageKey(username);
 try{localStorage.removeItem(key)}catch{}
 noteLocalWrite(key);
 window.dispatchEvent(new Event(AVATAR_EVENT));
}

export function avatarInitial(username:string,locale:'zh'|'en'){
 const clean=(username||'').trim();
 if(!clean)return locale==='en'?'G':'游';
 const ch=Array.from(clean)[0]??'U';
 return ch.toLocaleUpperCase();
}

export function processAvatarFile(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith('image/')){reject(new Error('not-image'));return}
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
   try{
    URL.revokeObjectURL(url);
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(!w||!h){reject(new Error('empty-image'));return}
    const side=Math.min(w,h),sx=Math.floor((w-side)/2),sy=Math.floor((h-side)/2);
    const encode=(px:number,q:number)=>{
     const c=document.createElement('canvas');c.width=px;c.height=px;
     const ctx=c.getContext('2d');if(!ctx)throw new Error('no-canvas');
     ctx.drawImage(img,sx,sy,side,side,0,0,px,px);
     let out=c.toDataURL('image/webp',q);
     if(!out.startsWith('data:image/webp'))out=c.toDataURL('image/jpeg',q);
     return out;
    };
    let out=encode(160,0.86);
    if(out.length>140_000)out=encode(128,0.74);
    if(out.length>160_000)out=encode(96,0.68);
    if(!safeImgSrc(out)){reject(new Error('encode-failed'));return}
    resolve(out);
   }catch(err){reject(err)}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('load-failed'))};
  img.src=url;
 });
}

export function UserAvatar({
 username,
 src,
 size=28,
 className='',
}:{
 username:string;
 src?:string;
 size?:number;
 className?:string;
}){
 const {locale}=useI18n();
 const letter=avatarInitial(username,locale);
 const fontSize=Math.max(12,Math.round(size*0.5));
 const style={'--avatar-size':`${size}px`,'--avatar-fs':`${fontSize}px`} as CSSProperties;
 return <span className={'user-avatar'+(className?' '+className:'')} style={style} aria-hidden="true">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  {src?<img src={src} alt=""/>:<span>{letter}</span>}
 </span>;
}
