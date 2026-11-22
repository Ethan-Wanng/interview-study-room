'use client';
import {useSyncExternalStore} from 'react';
import {useI18n} from '../components/i18n';
import type {AiLesson,AiLevel} from '@/content/journey';
import {noteLocalWrite} from '@/app/components/cloud-sync';

// 项目实战的技术栈选择：后端语言 + 前端做法。选择保存在本浏览器，学习卡片和代码题按选择显示对应版本。
export type StackOption={id:string;icon:string;name:[string,string]};
export type Stacks={backend:StackOption[];frontend:StackOption[]};
export type StackChoice={backend:string;frontend:string};

// 找卡片版本的顺序：先找“前端-后端”组合（比如后端模板渲染要看用哪种语言），再找前端，最后找后端。
export const variantKeys=(s:StackChoice)=>[`${s.frontend}-${s.backend}`,s.frontend,s.backend];

export function resolveLesson(l:AiLesson,s:StackChoice):AiLesson{
 if(!l.variants)return l;
 const v=variantKeys(s).map(k=>l.variants![k]).find(Boolean);
 const rest={...l};delete rest.variants;
 return v?{...rest,...Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined))}:rest}

// 卡片换成对应版本；只属于别的技术栈的代码题不出现（这样通关所需题数也跟着变）。
export function resolveLevels(levels:AiLevel[],s:StackChoice):AiLevel[]{const keys=variantKeys(s);
 return levels.map(l=>({...l,lessons:l.lessons.map(x=>resolveLesson(x,s)),quiz:l.quiz.filter(q=>!q.stack||keys.includes(q.stack))}))}

const changed='stack-change';
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener(changed,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify)}};
const read=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};

// 读取和修改当前的技术栈选择；没选过时用各自的第一个选项。服务端渲染时也用默认值，避免页面闪烁报错。
export function useStack(storageKey:string,stacks?:Stacks):[StackChoice,(s:StackChoice)=>void]{
 const key=storageKey+'stack',raw=useSyncExternalStore(subscribe,()=>read(key),()=>null);
 const fallback={backend:stacks?.backend[0]?.id??'',frontend:stacks?.frontend[0]?.id??''};
 let choice=fallback;
 try{const p=raw?JSON.parse(raw) as Partial<StackChoice>:{};
  choice={backend:stacks?.backend.some(o=>o.id===p.backend)?p.backend!:fallback.backend,frontend:stacks?.frontend.some(o=>o.id===p.frontend)?p.frontend!:fallback.frontend}}catch{/* 存坏了就用默认 */}
 const save=(s:StackChoice)=>{try{localStorage.setItem(key,JSON.stringify(s))}catch{/* 存不了就只在本次生效 */}noteLocalWrite(key);window.dispatchEvent(new Event(changed))};
 return [choice,save]}

// 技术栈选择器：两排按钮，后端语言一排、前端做法一排。compact 时只显示一行摘要和两个下拉框（放在学习卡片上方）。
export function StackPicker({stacks,value,onChange,compact}:{stacks:Stacks;value:StackChoice;onChange:(s:StackChoice)=>void;compact?:boolean}){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const row=(kind:'backend'|'frontend',label:string)=><div className="stack-row"><span className="stack-label">{label}</span>
  {compact?<select value={value[kind]} onChange={e=>onChange({...value,[kind]:e.target.value})} aria-label={label}>{stacks[kind].map(o=><option key={o.id} value={o.id}>{o.icon} {L(...o.name)}</option>)}</select>
   :<div className="stack-options">{stacks[kind].map(o=><button key={o.id} type="button" className={'stack-option'+(value[kind]===o.id?' on':'')} aria-pressed={value[kind]===o.id} onClick={()=>onChange({...value,[kind]:o.id})}><span>{o.icon}</span>{L(...o.name)}</button>)}</div>}</div>;
 return <section className={'ai-card stack-picker'+(compact?' compact':'')}>
  
  {row('backend',L('后端语言','Backend'))}{row('frontend',L('前端做法','Frontend'))}</section>}
